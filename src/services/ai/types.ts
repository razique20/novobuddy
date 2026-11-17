import type { ImageAttachment } from '@/types';

export type ProviderId = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'groq';

export type ProviderType = 'local' | 'cloud';

export type ConnectionState =
  | 'connected'
  | 'not_configured'
  | 'connecting'
  | 'error';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  description?: string;
  contextLength?: number;
  isLocal?: boolean;
  supportsVision?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: ImageAttachment[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  attachments?: ImageAttachment[];
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
}

export interface StreamHandler {
  onToken: (token: string) => void;
  onComplete: (fullText: string, metadata?: { tokensUsed?: number; model?: string }) => void;
  onError: (error: Error) => void;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  version?: string;
  availableModels?: string[];
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  type: ProviderType;
  endpointUrl?: string; // Configurable for Ollama (e.g. http://localhost:11434)
  selectedModel: string;
  isConfigured: boolean;
  status: ConnectionState;
  statusMessage?: string;
}

export interface IAIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly type: ProviderType;

  /**
   * Get available models for this provider (dynamically or catalogue).
   */
  getAvailableModels(): Promise<ModelInfo[]>;

  /**
   * Test connection to the provider.
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Send a completion request and stream response chunks.
   */
  streamMessage(
    request: ChatCompletionRequest,
    handler: StreamHandler,
    abortSignal?: AbortSignal
  ): Promise<void>;

  /**
   * Non-streaming completion fallback.
   */
  sendMessage(
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): Promise<ChatCompletionResponse>;
}

export interface OllamaInstalledModel {
  name: string;
  size: number;
  size_formatted: string;
  modified_at: string;
  digest: string;
}

export interface OllamaInstallationStatus {
  is_installed: boolean;
  is_running: boolean;
  binary_path?: string | null;
  app_path?: string | null;
  version?: string | null;
  endpoint: string;
  message: string;
}

