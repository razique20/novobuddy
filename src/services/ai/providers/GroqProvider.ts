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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errDetail = res.statusText;
        try {
          const body = await res.json();
          if (body?.error?.message) errDetail = body.error.message;
        } catch {
          // ignore
        }
        return {
          ok: false,
          message: `Groq authentication failed (${res.status}): ${errDetail}`,
        };
      }

      const data = await res.json();
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${this.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${key}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.data) && data.data.length > 0) {
            const mapped: ModelInfo[] = data.data
              .filter((m: any) => m.active !== false)
              .map((m: any) => ({
                id: m.id,
                name: m.id,
                provider: 'groq' as const,
                description: `Fast LPU model on Groq`,
                contextLength: m.context_window || 128000,
              }));

            ModelRegistry.setDynamicModels(this.id, mapped);
            return mapped;
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

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: request.model || 'llama-3.3-70b-versatile',
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 2048,
        }),
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
