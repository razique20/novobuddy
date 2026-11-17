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

/**
 * Free vision-capable provider fallback chain.
 * When a vision request fails on the primary provider (e.g. Groq rate limit),
 * NOVA will automatically try the next provider in this chain.
 */
const FREE_VISION_FALLBACK_CHAIN: { providerId: ProviderId; modelId: string; label: string }[] = [
  { providerId: 'groq',   modelId: 'llama-3.2-11b-vision-preview', label: 'Groq Vision (11B)' },
  { providerId: 'groq',   modelId: 'llama-3.2-90b-vision-preview', label: 'Groq Vision (90B)' },
  { providerId: 'ollama', modelId: 'llama3.2-vision:11b',          label: 'Ollama Llama Vision (11B)' },
  { providerId: 'ollama', modelId: 'llava:7b',                     label: 'Ollama LLaVA (7B)' },
  { providerId: 'gemini', modelId: 'gemini-1.5-flash',             label: 'Gemini 1.5 Flash (Free Tier)' },
];

export class AIProviderManager {
  private static instance: AIProviderManager;

  private providers: Map<ProviderId, IAIProvider> = new Map();
  private activeProviderId: ProviderId = 'ollama';
  private selectedModels: Map<ProviderId, string> = new Map();
  private ollamaProvider: OllamaProvider;

  /** Whether to auto-fallback to another free vision provider on failure */
  private visionFallbackEnabled: boolean = true;

  /** Last fallback info for UI display */
  private lastFallbackInfo: { from: string; to: string; reason: string } | null = null;

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

      // Load vision fallback preference
      const fallbackPref = localStorage.getItem('nova_vision_fallback');
      if (fallbackPref !== null) {
        this.visionFallbackEnabled = fallbackPref !== 'false';
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

  // ── Vision Fallback Configuration ──────────────────────────────────

  setVisionFallbackEnabled(enabled: boolean): void {
    this.visionFallbackEnabled = enabled;
    try {
      localStorage.setItem('nova_vision_fallback', String(enabled));
    } catch {
      // ignore
    }
  }

  isVisionFallbackEnabled(): boolean {
    return this.visionFallbackEnabled;
  }

  /** Returns info about the last fallback that occurred (for UI notifications) */
  getLastFallbackInfo(): { from: string; to: string; reason: string } | null {
    return this.lastFallbackInfo;
  }

  clearFallbackInfo(): void {
    this.lastFallbackInfo = null;
  }

  // ── Provider Status ────────────────────────────────────────────────

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

  // ── Vision Model Resolution ────────────────────────────────────────

  /**
   * Returns a vision-capable model for the given provider, or null if none available.
   */
  getVisionModelForProvider(providerId: ProviderId): string | null {
    const models = ModelRegistry.getKnownModels(providerId);
    const visionModel = models.find((m) => m.supportsVision === true);
    return visionModel?.id || null;
  }

  /**
   * Checks if the current active provider + model supports vision.
   */
  isCurrentModelVisionCapable(): boolean {
    const model = this.getSelectedModel();
    return ModelRegistry.isVisionSupported(this.activeProviderId, model);
  }

  /**
   * Resolves the best vision-capable provider and model for a vision request.
   * Priority: current provider (if vision model available) → free fallback chain.
   */
  resolveVisionProvider(): { providerId: ProviderId; modelId: string; label: string } | null {
    // 1. Check if current provider + model already supports vision
    const currentModel = this.getSelectedModel();
    if (ModelRegistry.isVisionSupported(this.activeProviderId, currentModel)) {
      return {
        providerId: this.activeProviderId,
        modelId: currentModel,
        label: `${this.getActiveProvider().name} (${currentModel})`,
      };
    }

    // 2. Check if current provider has any vision model
    const visionModel = this.getVisionModelForProvider(this.activeProviderId);
    if (visionModel) {
      return {
        providerId: this.activeProviderId,
        modelId: visionModel,
        label: `${this.getActiveProvider().name} (${visionModel})`,
      };
    }

    // 3. Walk the free fallback chain
    for (const fallback of FREE_VISION_FALLBACK_CHAIN) {
      if (this.providers.has(fallback.providerId)) {
        return fallback;
      }
    }

    return null;
  }

  // ── Context Preparation ────────────────────────────────────────────

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

  // ── Chat Streaming (with Vision Fallback) ──────────────────────────

  /**
   * Checks whether messages contain image attachments (vision request).
   */
  private hasVisionAttachments(messages: ChatMessage[]): boolean {
    return messages.some(
      (m) => m.attachments && m.attachments.length > 0 && m.attachments.some((a) => a.dataUrl)
    );
  }

  /**
   * Determines if an error is a recoverable rate-limit/overload error.
   */
  private isRecoverableError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('overloaded') ||
      msg.includes('rate limit') ||
      msg.includes('rate_limit') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('too many requests') ||
      msg.includes('capacity') ||
      msg.includes('temporarily unavailable')
    );
  }

  /**
   * Checks if a provider is available (configured and reachable) for fallback.
   */
  private async isProviderAvailableForFallback(providerId: ProviderId): Promise<boolean> {
    try {
      if (providerId === 'ollama') {
        const status = await this.ollamaProvider.testConnection();
        return status.ok;
      }
      return await SecretManager.hasApiKey(providerId);
    } catch {
      return false;
    }
  }

  /**
   * Stream a chat completion through the active provider.
   * If the request includes vision attachments and the primary provider fails
   * with a recoverable error, automatically falls back to the next free
   * vision provider in the chain.
   */
  async streamChat(
    messages: ChatMessage[],
    handler: StreamHandler,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const provider = this.getActiveProvider();
    const model = this.getSelectedModel();
    const isVisionRequest = this.hasVisionAttachments(messages);

    // Verify configured before sending
    if (provider.id !== 'ollama') {
      const hasKey = await SecretManager.hasApiKey(provider.id);
      if (!hasKey) {
        throw new Error(
          `API key for ${provider.name} is not configured. Please set your API key in Settings -> AI Providers.`
        );
      }
    }

    // If this is a vision request and current model doesn't support vision,
    // auto-select a vision model for the active provider
    let resolvedModel = model;
    if (isVisionRequest && !ModelRegistry.isVisionSupported(this.activeProviderId, model)) {
      const visionModel = this.getVisionModelForProvider(this.activeProviderId);
      if (visionModel) {
        resolvedModel = visionModel;
        console.log(`[AIProviderManager] Auto-selected vision model: ${visionModel} (was ${model})`);
      }
    }

    const contextMessages = this.prepareContextMessages(messages);

    try {
      await provider.streamMessage(
        {
          model: resolvedModel,
          messages: contextMessages,
          stream: true,
        },
        handler,
        abortSignal
      );
      this.lastFallbackInfo = null;
    } catch (primaryError: any) {
      // If vision fallback is disabled, or not a vision request, or not recoverable → throw
      if (!isVisionRequest || !this.visionFallbackEnabled || !this.isRecoverableError(primaryError)) {
        throw primaryError;
      }

      console.warn(
        `[AIProviderManager] Primary vision provider (${provider.id}/${resolvedModel}) failed: ${primaryError.message}. Attempting fallback...`
      );

      // Walk the fallback chain, skipping the provider that just failed
      for (const fallback of FREE_VISION_FALLBACK_CHAIN) {
        // Skip the same provider + model that just failed
        if (fallback.providerId === this.activeProviderId && fallback.modelId === resolvedModel) {
          continue;
        }

        // Check if this fallback provider is available
        const available = await this.isProviderAvailableForFallback(fallback.providerId);
        if (!available) {
          console.log(`[AIProviderManager] Fallback skip: ${fallback.label} (not available)`);
          continue;
        }

        try {
          console.log(`[AIProviderManager] Trying fallback: ${fallback.label}`);
          const fallbackProvider = this.getProvider(fallback.providerId);

          // Notify handler that we're falling back
          handler.onToken(
            `\n\n> ⚡ *Primary provider overloaded — seamlessly switching to ${fallback.label}...*\n\n`
          );

          await fallbackProvider.streamMessage(
            {
              model: fallback.modelId,
              messages: contextMessages,
              stream: true,
            },
            handler,
            abortSignal
          );

          // Record successful fallback for UI
          this.lastFallbackInfo = {
            from: `${provider.name} (${resolvedModel})`,
            to: fallback.label,
            reason: primaryError.message,
          };

          return; // Success!
        } catch (fallbackError: any) {
          console.warn(
            `[AIProviderManager] Fallback ${fallback.label} also failed: ${fallbackError.message}`
          );
          // Continue to next fallback
        }
      }

      // All fallbacks exhausted — throw original error with helpful message
      throw new Error(
        `Vision request failed: ${primaryError.message}. ` +
        `All free vision providers are currently unavailable. ` +
        `Try again in a moment, or switch to a local Ollama vision model (llama3.2-vision:11b).`
      );
    }
  }
}

export const aiProviderManager = AIProviderManager.getInstance();

