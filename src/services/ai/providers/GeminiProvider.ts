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

export class GeminiProvider extends BaseProvider {
  readonly id: ProviderId = 'gemini';
  readonly name: string = 'Google Gemini';
  readonly type: ProviderType = 'cloud';

  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  async testConnection(): Promise<ConnectionTestResult> {
    const key = await SecretManager.getApiKey(this.id);
    if (!key) {
      return {
        ok: false,
        message: 'No Google Gemini API key configured. Please enter your API key in settings.',
      };
    }

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Validate by querying model metadata
      const res = await fetch(`${this.baseUrl}/gemini-1.5-flash?key=${encodeURIComponent(key)}`, {
        method: 'GET',
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
          message: `Gemini verification failed (${res.status}): ${errDetail}`,
        };
      }

      const latencyMs = Math.round(performance.now() - startTime);
      return {
        ok: true,
        message: 'Connected to Google Gemini API successfully.',
        latencyMs,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Connection failed: ${err.message || 'Network unreachable'}`,
      };
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return ModelRegistry.getKnownModels(this.id);
  }

  async streamMessage(
    request: ChatCompletionRequest,
    handler: StreamHandler,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const key = await SecretManager.getApiKey(this.id);
    if (!key) {
      throw new Error('Google Gemini API key is missing. Please configure it in Settings.');
    }

    // Convert to Gemini contents format
    // Roles: 'user' and 'model'
    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let systemInstruction: { parts: { text: string }[] } | undefined = undefined;

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content }] };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const targetModel = request.model || 'gemini-1.5-flash';
    const endpoint = `${this.baseUrl}/${targetModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 2048,
          },
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
        throw new Error(`Google Gemini error (${response.status}): ${errDetail}`);
      }

      await StreamParser.parseSSE(
        response,
        handler,
        (parsed) => {
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === 'string') {
            return text;
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
