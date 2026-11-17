import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIProviderManager } from '../services/ai/AIProviderManager';
import { OllamaProvider } from '../services/ai/providers/OllamaProvider';
import { OpenAIProvider } from '../services/ai/providers/OpenAIProvider';
import { AnthropicProvider } from '../services/ai/providers/AnthropicProvider';
import { GeminiProvider } from '../services/ai/providers/GeminiProvider';
import { ModelRegistry } from '../services/ai/ModelRegistry';
import { StreamParser } from '../services/ai/StreamHandler';
import { SecretManager } from '../services/security/secretManager';

describe('AI Provider Architecture & Model Registry', () => {
  let manager: AIProviderManager;

  beforeEach(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store: Record<string, string> = {};
      globalThis.localStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => {
          store[key] = String(val);
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const k in store) delete store[k];
        },
        length: 0,
        key: () => null,
      };
    } else {
      globalThis.localStorage.clear();
    }
    manager = AIProviderManager.getInstance();
  });

  it('should initialize all 5 supported providers', () => {
    expect(manager.getProvider('ollama')).toBeInstanceOf(OllamaProvider);
    expect(manager.getProvider('openai')).toBeInstanceOf(OpenAIProvider);
    expect(manager.getProvider('anthropic')).toBeInstanceOf(AnthropicProvider);
    expect(manager.getProvider('gemini')).toBeInstanceOf(GeminiProvider);
    expect(manager.getProvider('groq')).toBeDefined();
  });

  it('should allow switching active provider and selected model', () => {
    manager.setActiveProvider('groq');
    expect(manager.getActiveProviderId()).toBe('groq');
    expect(manager.getActiveProvider().name).toContain('Groq');

    manager.setSelectedModel('groq', 'llama-3.3-70b-versatile');
    expect(manager.getSelectedModel('groq')).toBe('llama-3.3-70b-versatile');

    manager.setActiveProvider('openai');
    expect(manager.getActiveProviderId()).toBe('openai');
  });

  it('should provide default model catalogues for each provider', () => {
    const ollamaModels = ModelRegistry.getKnownModels('ollama');
    expect(ollamaModels.length).toBeGreaterThan(0);
    expect(ollamaModels[0].isLocal).toBe(true);

    const groqModels = ModelRegistry.getKnownModels('groq');
    expect(groqModels.some((m) => m.id === 'llama-3.3-70b-versatile')).toBe(true);

    const openaiModels = ModelRegistry.getKnownModels('openai');
    expect(openaiModels.some((m) => m.id === 'gpt-4o')).toBe(true);

    const anthropicModels = ModelRegistry.getKnownModels('anthropic');
    expect(anthropicModels.some((m) => m.id.includes('claude-3-5-sonnet'))).toBe(true);

    const geminiModels = ModelRegistry.getKnownModels('gemini');
    expect(geminiModels.some((m) => m.id === 'gemini-1.5-flash')).toBe(true);
  });
});

describe('Cloud Provider Key Validation', () => {
  it('validates Groq key format', () => {
    expect(SecretManager.validateKeyFormat('groq', 'gsk_testkey123').valid).toBe(true);
    expect(SecretManager.validateKeyFormat('groq', 'wrong_key').valid).toBe(false);
  });
  it('validates OpenAI key format', () => {
    expect(SecretManager.validateKeyFormat('openai', 'sk-testkey123').valid).toBe(true);
    expect(SecretManager.validateKeyFormat('openai', 'invalid_key').valid).toBe(false);
  });

  it('validates Anthropic key format', () => {
    expect(SecretManager.validateKeyFormat('anthropic', 'sk-ant-testkey123').valid).toBe(true);
    expect(SecretManager.validateKeyFormat('anthropic', 'sk-wrongkey').valid).toBe(false);
  });

  it('validates Gemini key format', () => {
    expect(SecretManager.validateKeyFormat('gemini', 'AIzaSyTest123').valid).toBe(true);
    expect(SecretManager.validateKeyFormat('gemini', 'wrong-key').valid).toBe(false);
  });

  it('masks secret keys properly without exposing raw secrets', () => {
    const raw = 'sk-proj-1234567890abcdef';
    const masked = SecretManager.maskKey(raw);
    expect(masked).toBe('sk-p••••••••cdef');
    expect(masked).not.toContain('1234567890');
  });
});

describe('Ollama Connection Handling', () => {
  it('handles offline Ollama server gracefully', async () => {
    const offlineProvider = new OllamaProvider('http://127.0.0.1:9999');
    const result = await offlineProvider.testConnection();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Ollama server is not running');
  });

  it('returns models when Ollama server responds successfully', async () => {
    const mockProvider = new OllamaProvider('http://mock-ollama:11434');
    
    // Mock fetch for /api/tags
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/tags')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                { name: 'llama3:8b', size: 4661224676 },
                { name: 'smollm:135m', size: 91000000 },
              ],
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const connTest = await mockProvider.testConnection();
    expect(connTest.ok).toBe(true);
    expect(connTest.availableModels).toContain('llama3:8b');

    const models = await mockProvider.getAvailableModels();
    expect(models.length).toBe(2);
    expect(models[0].id).toBe('llama3:8b');
  });
});

describe('Streaming Response Handling & Cancellation', () => {
  it('correctly streams SSE data chunks token by token', async () => {
    const ssePayload = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });

    const mockResponse = new Response(stream);
    const tokens: string[] = [];

    const fullText = await StreamParser.parseSSE(
      mockResponse,
      {
        onToken: (tok) => tokens.push(tok),
        onComplete: vi.fn(),
        onError: vi.fn(),
      },
      (data) => data.choices?.[0]?.delta?.content || null
    );

    expect(tokens).toEqual(['Hello', ' world', '!']);
    expect(fullText).toBe('Hello world!');
  });

  it('handles user generation cancellation cleanly', async () => {
    const controller = new AbortController();

    const infiniteStream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Start"}}]}\n\n'));
        // Do not close immediately
      },
    });

    const mockResponse = new Response(infiniteStream);
    const tokens: string[] = [];
    const onComplete = vi.fn();

    // Abort after start
    controller.abort();

    const fullText = await StreamParser.parseSSE(
      mockResponse,
      {
        onToken: (tok) => tokens.push(tok),
        onComplete,
        onError: vi.fn(),
      },
      (data) => data.choices?.[0]?.delta?.content || null,
      controller.signal
    );

    expect(onComplete).toHaveBeenCalled();
    expect(typeof fullText).toBe('string');
  });
});
