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

export class AnthropicProvider extends BaseProvider {
  readonly id: ProviderId = 'anthropic';
  readonly name: string = 'Anthropic Claude';
  readonly type: ProviderType = 'cloud';

  private baseUrl: string = 'https://api.anthropic.com/v1';

  async testConnection(): Promise<ConnectionTestResult> {
    const key = await SecretManager.getApiKey(this.id);
    if (!key) {
      return {
        ok: false,
        message: 'No Anthropic API key configured. Please enter your API key in settings.',
      };
    }

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Lightweight test request using minimum tokens
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
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
          message: `Anthropic validation failed (${res.status}): ${errDetail}`,
        };
      }

      const latencyMs = Math.round(performance.now() - startTime);
      return {
        ok: true,
        message: 'Connected to Anthropic API successfully.',
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
      throw new Error('Anthropic API key is missing. Please configure it in Settings.');
    }

    // Anthropic requires system prompt separated from messages array
    let systemPrompt: string | undefined = undefined;
    const conversationMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemPrompt = systemPrompt ? `${systemPrompt}\n${msg.content}` : msg.content;
      } else {
        conversationMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    // Ensure at least one user message
    if (conversationMessages.length === 0) {
      conversationMessages.push({ role: 'user', content: 'Hello' });
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens ?? 2048,
          messages: conversationMessages,
          system: systemPrompt,
          temperature: request.temperature ?? 0.7,
          stream: true,
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
        throw new Error(`Anthropic error (${response.status}): ${errDetail}`);
      }

      await StreamParser.parseSSE(
        response,
        handler,
        (parsed) => {
          // Anthropic SSE events: content_block_delta has delta.text
          if (parsed?.type === 'content_block_delta' && typeof parsed?.delta?.text === 'string') {
            return parsed.delta.text;
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
