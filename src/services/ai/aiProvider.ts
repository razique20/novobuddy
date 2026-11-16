import { AIProvider } from '../../types';

export interface CompletionRequest {
  prompt: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResponse {
  text: string;
  tokensUsed: number;
  model: string;
  isSimulated: boolean;
}

export interface IAIProviderService {
  getAvailableProviders(): Promise<AIProvider[]>;
  getActiveProvider(): Promise<AIProvider | null>;
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
}

// Configured provider definitions planned for Phase 2
export const PLANNED_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    model: 'gpt-4o',
    isAvailable: false,
    isConfigured: false,
    requiresKey: true,
    description: 'Advanced reasoning, multimodal understanding, and function calling via OpenAI API.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'cloud',
    model: 'claude-3-5-sonnet',
    isAvailable: false,
    isConfigured: false,
    requiresKey: true,
    description: 'Nuanced reasoning, long context comprehension, and coding capabilities.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'cloud',
    model: 'gemini-1.5-pro',
    isAvailable: false,
    isConfigured: false,
    requiresKey: true,
    description: 'Multimodal processing, large context window, and native tool execution.',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local AI)',
    type: 'local',
    model: 'llama3:8b',
    isAvailable: false,
    isConfigured: false,
    requiresKey: false,
    endpointUrl: 'http://127.0.0.1:11434',
    description: 'Privacy-first, zero-telemetry local inference running completely on device.',
  },
];
