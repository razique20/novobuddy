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
      supportsVision: false,
    },
    {
      id: 'smollm:135m',
      name: 'SmolLM (135M)',
      provider: 'ollama',
      description: 'Ultra-lightweight local model running with minimal memory.',
      contextLength: 2048,
      isLocal: true,
      supportsVision: false,
    },
    {
      id: 'llama3.2-vision:11b',
      name: 'Llama 3.2 Vision (11B)',
      provider: 'ollama',
      description: 'Meta instruction-tuned multimodal model for local visual reasoning.',
      contextLength: 131072,
      isLocal: true,
      supportsVision: true,
    },
    {
      id: 'llava:7b',
      name: 'LLaVA (7B)',
      provider: 'ollama',
      description: 'Popular open-source vision assistant model.',
      contextLength: 4096,
      isLocal: true,
      supportsVision: true,
    },
    {
      id: 'llama3:8b',
      name: 'Llama 3 (8B)',
      provider: 'ollama',
      description: 'Standard local instruction-tuned model.',
      contextLength: 8192,
      isLocal: true,
      supportsVision: false,
    },
    {
      id: 'qwen2.5:7b',
      name: 'Qwen 2.5 (7B)',
      provider: 'ollama',
      description: 'High-capability multilingual & coding local model.',
      contextLength: 32768,
      isLocal: true,
      supportsVision: false,
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      description: 'Flagship omni model with high speed and advanced reasoning.',
      contextLength: 128000,
      supportsVision: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      description: 'Fast, lightweight and cost-effective for daily tasks.',
      contextLength: 128000,
      supportsVision: true,
    },
    {
      id: 'o1-mini',
      name: 'o1-mini',
      provider: 'openai',
      description: 'Reasoning model specialized in STEM and coding.',
      contextLength: 128000,
      supportsVision: false,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      description: 'Previous generation high-intelligence model.',
      contextLength: 128000,
      supportsVision: true,
    },
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: 'Industry-leading coding, reasoning, and tool use capability.',
      contextLength: 200000,
      supportsVision: true,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      description: 'Ultra-fast intelligence with exceptional responsiveness.',
      contextLength: 200000,
      supportsVision: true,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      description: 'Complex analysis and nuanced creative synthesis.',
      contextLength: 200000,
      supportsVision: true,
    },
  ],
  gemini: [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'gemini',
      description: 'Google flagship multimodal model with massive 2M token context.',
      contextLength: 2000000,
      supportsVision: true,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      description: 'High-speed, low-latency multipurpose workhorse.',
      contextLength: 1000000,
      supportsVision: true,
    },
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash (Experimental)',
      provider: 'gemini',
      description: 'Next-generation multimodal model with real-time streaming speed.',
      contextLength: 1000000,
      supportsVision: true,
    },
  ],
  groq: [
    {
      id: 'llama-3.2-11b-vision-preview',
      name: 'Llama 3.2 Vision (11B)',
      provider: 'groq',
      description: 'High-speed multimodal Llama 3.2 model running on Groq LPUs.',
      contextLength: 8192,
      supportsVision: true,
    },
    {
      id: 'llama-3.2-90b-vision-preview',
      name: 'Llama 3.2 Vision (90B)',
      provider: 'groq',
      description: 'Massive multimodal reasoning model with ultra-fast LPU inference.',
      contextLength: 8192,
      supportsVision: true,
    },
    {
      id: 'meta-llama/llama-4-scout-17b-16e-instruct',
      name: 'Llama 4 Scout (17B MoE)',
      provider: 'groq',
      description: 'Newest Llama 4 multimodal model with 512K context on Groq LPUs.',
      contextLength: 512000,
      supportsVision: true,
    },
    {
      id: 'openai/gpt-oss-120b',
      name: 'GPT-OSS 120B',
      provider: 'groq',
      description: 'State-of-the-art open weights reasoning model on Groq LPUs.',
      contextLength: 131072,
      supportsVision: false,
    },
    {
      id: 'qwen/qwen3.8-27b',
      name: 'Qwen 3.8 (27B)',
      provider: 'groq',
      description: 'Ultra-fast multilingual and coding model with instant LPU inference.',
      contextLength: 131072,
      supportsVision: false,
    },
    {
      id: 'openai/gpt-oss-20b',
      name: 'GPT-OSS 20B (Ultra-Fast)',
      provider: 'groq',
      description: 'Sub-50ms latency lightweight reasoning model on Groq LPUs.',
      contextLength: 131072,
      supportsVision: false,
    },
    {
      id: 'allam-2-7b',
      name: 'ALLaM 2 (7B)',
      provider: 'groq',
      description: 'ALLaM instruction-tuned model running on Groq.',
      contextLength: 4096,
      supportsVision: false,
    },
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 (70B Versatile)',
      provider: 'groq',
      description: 'State-of-the-art open weights model with ultra-fast Groq LPU throughput.',
      contextLength: 128000,
      supportsVision: false,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 (8B Instant)',
      provider: 'groq',
      description: 'Blazing fast inference (>750 tok/s) for instant companion responses.',
      contextLength: 128000,
      supportsVision: false,
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

  static isVisionSupported(providerId: ProviderId, modelId: string): boolean {
    const models = this.getKnownModels(providerId);
    const found = models.find((m) => m.id === modelId);
    if (found?.supportsVision !== undefined) {
      return Boolean(found.supportsVision);
    }
    const lower = modelId.toLowerCase();
    return (
      lower.includes('vision') ||
      lower.includes('llava') ||
      lower.includes('4o') ||
      lower.includes('gemini-1.5') ||
      lower.includes('gemini-2.0') ||
      lower.includes('claude-3')
    );
  }

  static clearCache(): void {
    this.dynamicCache.clear();
  }
}
