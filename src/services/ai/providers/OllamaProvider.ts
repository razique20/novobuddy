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
import { NativeBridge, isTauriEnvironment } from '../../native/bridge';

export class OllamaProvider extends BaseProvider {
  readonly id: ProviderId = 'ollama';
  readonly name: string = 'Ollama (Local AI)';
  readonly type: ProviderType = 'local';

  private endpointUrl: string;

  constructor(endpointUrl: string = 'http://127.0.0.1:11434') {
    super();
    this.endpointUrl = this.normalizeUrl(endpointUrl);
  }

  private normalizeUrl(url: string): string {
    let clean = (url || 'http://127.0.0.1:11434').trim().replace(/\/+$/, '');
    // Prefer 127.0.0.1 over localhost to avoid macOS WebKit IPv6 ::1 resolution failures
    if (clean.includes('localhost:11434')) {
      clean = clean.replace('localhost:11434', '127.0.0.1:11434');
    }
    return clean;
  }

  setEndpoint(url: string): void {
    this.endpointUrl = this.normalizeUrl(url);
  }

  getEndpoint(): string {
    return this.endpointUrl;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = performance.now();

    // 1. Try direct HTTP fetch on configured endpoint (try IPv4 if localhost)
    const urlsToTry = Array.from(
      new Set([
        this.endpointUrl,
        this.endpointUrl.replace('localhost', '127.0.0.1'),
      ])
    );

    for (const testUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(`${testUrl}/api/tags`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const latencyMs = Math.round(performance.now() - startTime);
          const models = Array.isArray(data.models)
            ? data.models.map((m: any) => m.name || m.model)
            : [];

          // Successfully connected, keep this working URL
          this.endpointUrl = testUrl;

          return {
            ok: true,
            message:
              models.length > 0
                ? `Connected to Ollama (${models.length} model${models.length > 1 ? 's' : ''} ready)`
                : 'Connected to Ollama (Online, ready for models).',
            latencyMs,
            availableModels: models,
          };
        }
      } catch {
        // Continue to next URL candidate
      }
    }

    // 2. If direct browser fetch failed and we are in Tauri, verify via Rust NativeBridge
    if (NativeBridge.isTauri()) {
      try {
        const status = await NativeBridge.getOllamaInstallationStatus(this.endpointUrl);
        if (status.is_running) {
          return {
            ok: true,
            message: status.version
              ? `Connected to Ollama (v${status.version} online)`
              : 'Connected to Ollama (Online)',
            latencyMs: 5,
          };
        } else if (status.is_installed) {
          return {
            ok: false,
            message: 'Ollama is installed on this Mac, but the background server is stopped. Click Start Server.',
          };
        } else {
          return {
            ok: false,
            message: 'Ollama is not installed on this device. Click Download Ollama to install.',
          };
        }
      } catch {
        // ignore
      }
    }

    return {
      ok: false,
      message: 'Ollama server is not running or not responding. Please start Ollama (`ollama serve`) or verify endpoint.',
    };
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    // 1. Try NativeBridge for fastest, most reliable local discovery
    try {
      const installed = await NativeBridge.getOllamaInstalledModels(this.endpointUrl);
      if (installed && installed.length > 0) {
        const mapped: ModelInfo[] = installed.map((m) => ({
          id: m.name,
          name: `${m.name}${m.size_formatted ? ` (${m.size_formatted})` : ''}`,
          provider: 'ollama' as const,
          description: `Local model on ${this.endpointUrl}`,
          isLocal: true,
        }));
        ModelRegistry.setDynamicModels('ollama', mapped);
        return mapped;
      }
    } catch {
      // fallback to fetch
    }

    // 2. Fallback to direct fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.endpointUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          const mapped: ModelInfo[] = data.models.map((m: any) => {
            const name = m.name || m.model;
            const sizeStr = m.size ? ` (${(m.size / (1024 * 1024 * 1024)).toFixed(1)}GB)` : '';
            return {
              id: name,
              name: `${name}${sizeStr}`,
              provider: 'ollama' as const,
              description: `Local model on ${this.endpointUrl}`,
              isLocal: true,
            };
          });

          ModelRegistry.setDynamicModels('ollama', mapped);
          return mapped;
        }
      }
    } catch {
      // Fallback to static catalogue if offline
    }

    return ModelRegistry.getKnownModels('ollama');
  }

  async streamMessage(
    request: ChatCompletionRequest,
    handler: StreamHandler,
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      // ────────────────────────────────────────────────────────────────
      // PRIMARY PATH: Native Tauri IPC streaming (bypasses all WKWebView
      // fetch/CORS/ATS restrictions that cause "Load failed" errors)
      // ────────────────────────────────────────────────────────────────
      if (isTauriEnvironment()) {
        try {
          const messages = request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const fullText = await NativeBridge.streamOllamaChat(
            request.model,
            messages,
            (token) => handler.onToken(token),
            this.endpointUrl
          );

          handler.onComplete(fullText);
          return;
        } catch (nativeErr: any) {
          // If native streaming fails, fall through to fetch-based approach
          console.warn('[OllamaProvider] Native IPC stream failed, trying fetch fallback:', nativeErr.message);
        }
      }

      // ────────────────────────────────────────────────────────────────
      // FALLBACK: Direct fetch (works in browser dev, may fail in WKWebView)
      // ────────────────────────────────────────────────────────────────
      const response = await fetch(`${this.endpointUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 2048,
          },
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        let errDetail = response.statusText;
        try {
          const errBody = await response.json();
          if (errBody.error) errDetail = errBody.error;
        } catch {
          // ignore
        }
        throw new Error(`Ollama error (${response.status}): ${errDetail}`);
      }

      await StreamParser.parseNDJSON(
        response,
        handler,
        (data) => {
          if (data.message && typeof data.message.content === 'string') {
            return data.message.content;
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

