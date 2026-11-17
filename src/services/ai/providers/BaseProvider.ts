import {
  IAIProvider,
  ProviderId,
  ProviderType,
  ModelInfo,
  ConnectionTestResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamHandler,
} from '../types';

export abstract class BaseProvider implements IAIProvider {
  abstract readonly id: ProviderId;
  abstract readonly name: string;
  abstract readonly type: ProviderType;

  abstract getAvailableModels(): Promise<ModelInfo[]>;
  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract streamMessage(
    request: ChatCompletionRequest,
    handler: StreamHandler,
    abortSignal?: AbortSignal
  ): Promise<void>;

  async sendMessage(
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): Promise<ChatCompletionResponse> {
    let accumulated = '';
    return new Promise<ChatCompletionResponse>((resolve, reject) => {
      this.streamMessage(
        request,
        {
          onToken: (tok) => {
            accumulated += tok;
          },
          onComplete: (fullText) => {
            resolve({
              content: fullText || accumulated,
              model: request.model,
            });
          },
          onError: (err) => {
            reject(err);
          },
        },
        abortSignal
      ).catch(reject);
    });
  }

  /**
   * Format human-readable friendly error messages
   */
  protected formatError(error: any): Error {
    if (error?.name === 'AbortError') {
      return error;
    }

    const message: string = error?.message || String(error);

    if (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('Load failed')
    ) {
      return new Error(
        `Unable to reach ${this.name} (${this.id === 'ollama' ? '127.0.0.1:11434' : 'API'}). Please check your connection or server status.`
      );
    }

    if (message.includes('Add usage credits') || message.includes('subscribe')) {
      return new Error(
        `This is an Ollama cloud model requiring an active subscription. Please select a downloaded local model (like smollm:135m) in the model picker.`
      );
    }

    if (message.includes('401') || message.includes('Incorrect API key') || message.includes('invalid_api_key')) {
      return new Error(
        `Authentication failed for ${this.name}. Please verify your API key in Settings -> AI Providers.`
      );
    }

    if (message.includes('429') || message.includes('rate_limit') || message.includes('quota')) {
      return new Error(
        `${this.name} rate limit or quota exceeded. Please check your account usage or try again shortly.`
      );
    }

    if (message.includes('404') || message.includes('model_not_found')) {
      return new Error(
        `The selected model was not found on ${this.name}. Please select an installed or supported model.`
      );
    }

    return new Error(message);
  }
}
