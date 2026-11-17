import { BaseProvider } from './BaseProvider';
import {
  ProviderId,
  ProviderType,
  ModelInfo,
  ConnectionTestResult,
  ChatCompletionRequest,
  StreamHandler,
} from '../types';
import { ModelRegistry } from '../ModelRegistry';
import { StreamParser } from '../StreamHandler';
import { SecretManager } from '../../security/secretManager';
import { NativeBridge } from '../../native/bridge';

export class GroqProvider extends BaseProvider {
  readonly id: ProviderId = 'groq';
  readonly name: string = 'Groq (Ultra-Fast LPU)';
  readonly type: ProviderType = 'cloud';

  private baseUrl: string = 'https://api.groq.com/openai/v1';

  async testConnection(): Promise<ConnectionTestResult> {
    const key = await SecretManager.getApiKey(this.id);
    if (!key) {
      return {
        ok: false,
        message: 'No Groq API key configured. Please enter your API key in settings.',
      };
    }

    const startTime = performance.now();
    try {
      const res = await NativeBridge.nativeHttpRequest(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!res.ok) {
        let errDetail = `HTTP ${res.status}`;
        try {
          const body = JSON.parse(res.body);
          if (body?.error?.message) errDetail = body.error.message;
        } catch {
          // ignore
        }
        return {
          ok: false,
          message: `Groq authentication failed (${res.status}): ${errDetail}`,
        };
      }

      const data = JSON.parse(res.body);
      const latencyMs = Math.round(performance.now() - startTime);
      const modelsList = Array.isArray(data?.data)
        ? data.data.map((m: any) => m.id)
        : [];

      return {
        ok: true,
        message: 'Connected to Groq LPU API successfully.',
        latencyMs,
        availableModels: modelsList,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Connection failed: ${err.message || 'Network unreachable'}`,
      };
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const key = await SecretManager.getApiKey(this.id);
    if (key) {
      try {
        const res = await NativeBridge.nativeHttpRequest(`${this.baseUrl}/models`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${key}` },
        });

        if (res.ok) {
          const data = JSON.parse(res.body);
          if (Array.isArray(data?.data) && data.data.length > 0) {
            const isChatModel = (m: any) => {
              const id = (m.id || '').toLowerCase();
              if (id.includes('whisper') || id.includes('guard') || id.includes('orpheus')) {
                return false;
              }
              if (m.output_modalities && !m.output_modalities.includes('text')) {
                return false;
              }
              return true;
            };

            const chatModels = data.data.filter(isChatModel);

            const formatModelName = (id: string, name?: string) => {
              if (name && name !== id) return name;
              if (id === 'openai/gpt-oss-120b') return 'GPT-OSS 120B (OpenAI on Groq)';
              if (id === 'openai/gpt-oss-20b') return 'GPT-OSS 20B (Sub-50ms LPU)';
              if (id === 'qwen/qwen3.8-27b') return 'Qwen 3.8 27B (Alibaba on Groq)';
              if (id === 'allam-2-7b') return 'ALLaM 2 (7B)';
              if (id === 'llama-3.3-70b-versatile') return 'Llama 3.3 (70B Versatile)';
              if (id === 'llama-3.1-8b-instant') return 'Llama 3.1 (8B Instant)';
              return id;
            };

            const mapped: ModelInfo[] = chatModels.map((m: any) => ({
              id: m.id,
              name: formatModelName(m.id, m.name),
              provider: 'groq' as const,
              description: `Fast Groq LPU inference (${m.context_window ? `${Math.round(m.context_window / 1024)}k context` : '128k context'})`,
              contextLength: m.context_window || 128000,
            }));

            if (mapped.length > 0) {
              ModelRegistry.setDynamicModels(this.id, mapped);
              return mapped;
            }
          }
        }
      } catch {
        // Fallback to static catalogue
      }
    }
    return ModelRegistry.getKnownModels(this.id);
  }

  async streamMessage(
    request: ChatCompletionRequest,
    handler: StreamHandler,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const key = await SecretManager.getApiKey(this.id);
    if (!key) {
      throw new Error('Groq API key is missing. Please configure it in Settings.');
    }

    const payloadData: Record<string, any> = {
      model: request.model || 'openai/gpt-oss-120b',
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      temperature: request.temperature ?? 0.7,
    };

    // If maxTokens is set, clamp it to 1000 to prevent Groq OTPM rate limit errors on models like Qwen
    if (request.maxTokens) {
      payloadData.max_tokens = Math.min(request.maxTokens, 1000);
    }

    const payload = JSON.stringify(payloadData);

    // 1. Primary path in Tauri: native IPC streaming (bypasses WKWebView restrictions)
    if (NativeBridge.isTauri()) {
      try {
        await NativeBridge.nativeStreamChat(
          `${this.baseUrl}/chat/completions`,
          payload,
          {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          (token) => {
            handler.onToken(token);
          }
        );
        return;
      } catch (err: any) {
        throw this.formatError(err);
      }
    }

    // 2. Fallback path in browser dev/testing
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: payload,
        signal: abortSignal,
      });

      if (!response.ok) {
        let errDetail = response.statusText;
        try {
          const errBody = await response.json();
          if (errBody?.error?.message) errDetail = errBody.error.message;
        } catch {
          // ignore
        }
        throw new Error(`Groq API error (${response.status}): ${errDetail}`);
      }

      await StreamParser.parseSSE(
        response,
        handler,
        (parsed) => {
          const delta = parsed?.choices?.[0]?.delta;
          if (delta && typeof delta.content === 'string') {
            return delta.content;
          }
          return null;
        },
        abortSignal
      );
    } catch (err: any) {
      throw this.formatError(err);
    }
  }
}
