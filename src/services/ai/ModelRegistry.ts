import { ModelInfo, ProviderId } from './types';

export const STATIC_MODELS: Record<ProviderId, ModelInfo[]> = {
  ollama: [
    {
      id: 'llama3.2:1b',
      name: 'Llama 3.2 (1B)',
      provider: 'ollama',
      description: 'Compact Meta Llama model optimized for edge desktop devices.',
      contextLength: 131072,
      isLocal: true,
    },
    {
      id: 'smollm:135m',
      name: 'SmolLM (135M)',
      provider: 'ollama',
      description: 'Ultra-lightweight local model running with minimal memory.',
      contextLength: 2048,
      isLocal: true,
    },
    {
      id: 'llama3:8b',
      name: 'Llama 3 (8B)',
      provider: 'ollama',
      description: 'Standard local instruction-tuned model.',
      contextLength: 8192,
      isLocal: true,
    },
    {
      id: 'qwen2.5:7b',
      name: 'Qwen 2.5 (7B)',
      provider: 'ollama',
      description: 'High-capability multilingual & coding local model.',
      contextLength: 32768,
      isLocal: true,
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      description: 'Flagship omni model with high speed and advanced reasoning.',
      contextLength: 128000,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      description: 'Fast, lightweight and cost-effective for daily tasks.',
      contextLength: 128000,
    },
    {
      id: 'o1-mini',
      name: 'o1-mini',
      provider: 'openai',
      description: 'Reasoning model specialized in STEM and coding.',
      contextLength: 128000,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      description: 'Previous generation high-intelligence model.',
      contextLength: 128000,
    },
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: 'Industry-leading coding, reasoning, and tool use capability.',
      contextLength: 200000,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      description: 'Ultra-fast intelligence with exceptional responsiveness.',
      contextLength: 200000,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      description: 'Complex analysis and nuanced creative synthesis.',
      contextLength: 200000,
    },
  ],
  gemini: [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'gemini',
      description: 'Google flagship multimodal model with massive 2M token context.',
      contextLength: 2000000,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      description: 'High-speed, low-latency multipurpose workhorse.',
      contextLength: 1000000,
    },
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash (Experimental)',
      provider: 'gemini',
      description: 'Next-generation multimodal model with real-time streaming speed.',
      contextLength: 1000000,
    },
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 (70B Versatile)',
      provider: 'groq',
      description: 'State-of-the-art open weights model with ultra-fast Groq LPU throughput.',
      contextLength: 128000,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 (8B Instant)',
      provider: 'groq',
      description: 'Blazing fast inference (>750 tok/s) for instant companion responses.',
      contextLength: 128000,
    },
    {
      id: 'deepseek-r1-distill-llama-70b',
      name: 'DeepSeek R1 (Distill Llama 70B)',
      provider: 'groq',
      description: 'DeepSeek R1 reasoning capabilities accelerated on Groq LPU chips.',
      contextLength: 128000,
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      provider: 'groq',
      description: 'Mistral high-performance mixture-of-experts model.',
      contextLength: 32768,
    },
  ],
};

export class ModelRegistry {
  private static dynamicCache: Map<ProviderId, ModelInfo[]> = new Map();

  static getKnownModels(providerId: ProviderId): ModelInfo[] {
    const dynamic = this.dynamicCache.get(providerId);
    if (dynamic && dynamic.length > 0) {
      return dynamic;
    }
    return STATIC_MODELS[providerId] || [];
  }

  static setDynamicModels(providerId: ProviderId, models: ModelInfo[]): void {
    this.dynamicCache.set(providerId, models);
  }

  static getDefaultModel(providerId: ProviderId): string {
    const models = this.getKnownModels(providerId);
    return models[0]?.id || 'default';
  }

  static clearCache(): void {
    this.dynamicCache.clear();
  }
}
