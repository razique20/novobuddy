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

export class OpenAIProvider extends BaseProvider {
  readonly id: ProviderId = 'openai';
  readonly name: string = 'OpenAI';
  readonly type: ProviderType = 'cloud';

  private baseUrl: string = 'https://api.openai.com/v1';

  async testConnection(): Promise<ConnectionTestResult> {
    const key = await SecretManager.getApiKey(this.id);
    if (!key) {
      return {
        ok: false,
        message: 'No OpenAI API key configured. Please enter your API key in settings.',
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
        let errorDetail = res.statusText;
        try {
          const body = await res.json();
          if (body?.error?.message) errorDetail = body.error.message;
        } catch {
          // ignore
        }
        return {
          ok: false,
          message: `Authentication failed (${res.status}): ${errorDetail}`,
        };
      }

      const latencyMs = Math.round(performance.now() - startTime);
      return {
        ok: true,
        message: 'Connected to OpenAI API successfully.',
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
      throw new Error('OpenAI API key is missing. Please configure it in Settings.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((m) => {
            if (m.attachments && m.attachments.length > 0) {
              const content: any[] = [{ type: 'text', text: m.content }];
              for (const att of m.attachments) {
                if (att.dataUrl) {
                  content.push({
                    type: 'image_url',
                    image_url: { url: att.dataUrl },
                  });
                }
              }
              return { role: m.role, content };
            }
            return { role: m.role, content: m.content };
          }),
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
        throw new Error(`OpenAI API error (${response.status}): ${errDetail}`);
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
