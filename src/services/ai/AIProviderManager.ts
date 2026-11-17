import {
  IAIProvider,
  ProviderId,
  ModelInfo,
  ConnectionTestResult,
  ChatMessage,
  StreamHandler,
} from './types';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { GroqProvider } from './providers/GroqProvider';
import { ModelRegistry } from './ModelRegistry';
import { SecretManager } from '../security/secretManager';

const SYSTEM_PROMPT = `You are NOVA, an intelligent desktop companion for macOS.
You are concise, highly knowledgeable, polite, and focused on assisting the user effectively.
Format your responses using clean Markdown. When writing code, always specify the language in fenced code blocks.`;

export class AIProviderManager {
  private static instance: AIProviderManager;

  private providers: Map<ProviderId, IAIProvider> = new Map();
  private activeProviderId: ProviderId = 'ollama';
  private selectedModels: Map<ProviderId, string> = new Map();
  private ollamaProvider: OllamaProvider;

  private constructor() {
    this.ollamaProvider = new OllamaProvider();
    this.providers.set('ollama', this.ollamaProvider);
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('groq', new GroqProvider());

    // Load persisted provider/model preference from localStorage if available
    try {
      const savedProvider = localStorage.getItem('nova_active_provider') as ProviderId;
      if (savedProvider && this.providers.has(savedProvider)) {
        this.activeProviderId = savedProvider;
      }

      for (const [id] of this.providers) {
        const savedModel = localStorage.getItem(`nova_model_${id}`);
        if (savedModel) {
          this.selectedModels.set(id, savedModel);
        } else {
          this.selectedModels.set(id, ModelRegistry.getDefaultModel(id));
        }
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }

  static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }
    return AIProviderManager.instance;
  }

  getProvider(id: ProviderId): IAIProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`AI Provider ${id} not found.`);
    }
    return provider;
  }

  getActiveProvider(): IAIProvider {
    return this.getProvider(this.activeProviderId);
  }

  getActiveProviderId(): ProviderId {
    return this.activeProviderId;
  }

  setActiveProvider(id: ProviderId): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider ${id} is not supported.`);
    }
    this.activeProviderId = id;
    try {
      localStorage.setItem('nova_active_provider', id);
    } catch {
      // ignore
    }
  }

  getSelectedModel(providerId?: ProviderId): string {
    const pid = providerId || this.activeProviderId;
    return this.selectedModels.get(pid) || ModelRegistry.getDefaultModel(pid);
  }

  setSelectedModel(providerId: ProviderId, modelId: string): void {
    this.selectedModels.set(providerId, modelId);
    try {
      localStorage.setItem(`nova_model_${providerId}`, modelId);
    } catch {
      // ignore
    }
  }

  setOllamaEndpoint(url: string): void {
    this.ollamaProvider.setEndpoint(url);
    try {
      localStorage.setItem('nova_ollama_endpoint', url);
    } catch {
      // ignore
    }
  }

  getOllamaEndpoint(): string {
    return this.ollamaProvider.getEndpoint();
  }

  async isProviderConfigured(id: ProviderId): Promise<boolean> {
    if (id === 'ollama') {
      const status = await this.ollamaProvider.testConnection();
      return status.ok;
    }
    return await SecretManager.hasApiKey(id);
  }

  async testProvider(id: ProviderId): Promise<ConnectionTestResult> {
    const provider = this.getProvider(id);
    return await provider.testConnection();
  }

  async getModelsForProvider(id: ProviderId): Promise<ModelInfo[]> {
    const provider = this.getProvider(id);
    return await provider.getAvailableModels();
  }

  /**
   * Builds the conversation context window safely
   */
  prepareContextMessages(messages: ChatMessage[], maxHistory: number = 20): ChatMessage[] {
    const sliced = messages.slice(-maxHistory);
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      ...sliced,
    ];
  }

  /**
   * Stream a chat completion through the active provider
   */
  async streamChat(
    messages: ChatMessage[],
    handler: StreamHandler,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const provider = this.getActiveProvider();
    const model = this.getSelectedModel();

    // Verify configured before sending
    if (provider.id !== 'ollama') {
      const hasKey = await SecretManager.hasApiKey(provider.id);
      if (!hasKey) {
        throw new Error(
          `API key for ${provider.name} is not configured. Please set your API key in Settings -> AI Providers.`
        );
      }
    }

    const contextMessages = this.prepareContextMessages(messages);

    await provider.streamMessage(
      {
        model,
        messages: contextMessages,
        stream: true,
      },
      handler,
      abortSignal
    );
  }
}

export const aiProviderManager = AIProviderManager.getInstance();
