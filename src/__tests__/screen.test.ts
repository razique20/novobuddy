import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScreenContextService } from '../services/screen/ScreenContextService';
import { AnnotationService } from '../services/screen/AnnotationService';
import { NativeBridge } from '../services/native/bridge';
import { ModelRegistry } from '../services/ai/ModelRegistry';
import { OllamaProvider } from '../services/ai/providers/OllamaProvider';
import { OpenAIProvider } from '../services/ai/providers/OpenAIProvider';
import { GroqProvider } from '../services/ai/providers/GroqProvider';
import { AnthropicProvider } from '../services/ai/providers/AnthropicProvider';
import { GeminiProvider } from '../services/ai/providers/GeminiProvider';
import { ImageAttachment, OcrTextItem } from '../types';

describe('Phase 3: Screen Awareness & Visual Intelligence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ScreenContextService', () => {
    it('checks screen recording permission status', async () => {
      const status = await ScreenContextService.checkPermission();
      expect(status).toHaveProperty('has_permission');
      expect(status).toHaveProperty('message');
    });

    it('enumerates available displays', async () => {
      const displays = await ScreenContextService.getDisplays();
      expect(displays.length).toBeGreaterThan(0);
      expect(displays[0]).toHaveProperty('id');
      expect(displays[0]).toHaveProperty('width');
      expect(displays[0]).toHaveProperty('height');
    });

    it('filters out excluded secure apps from window enumeration', async () => {
      vi.spyOn(NativeBridge, 'getScreenWindows').mockResolvedValueOnce([
        { id: 1, app_name: 'VS Code', title: 'nova - screen.rs', pid: 101, width: 1200, height: 800 },
        { id: 2, app_name: 'Keychain Access', title: 'login passwords', pid: 102, width: 600, height: 400 },
        { id: 3, app_name: '1Password 8', title: 'Vault', pid: 103, width: 800, height: 600 },
        { id: 4, app_name: 'Terminal', title: 'zsh', pid: 104, width: 900, height: 600 },
        { id: 5, app_name: 'Secret App', title: 'Confidential', pid: 105, width: 500, height: 400 },
      ]);

      const filtered = await ScreenContextService.getWindows(['Secret App']);
      const names = filtered.map((w) => w.app_name);

      expect(names).toContain('VS Code');
      expect(names).toContain('Terminal');
      expect(names).not.toContain('Keychain Access');
      expect(names).not.toContain('1Password 8');
      expect(names).not.toContain('Secret App');
    });

    it('captures full display and produces ImageAttachment', async () => {
      const attachment = await ScreenContextService.captureScreen({ mode: 'display', runOcr: false });
      expect(attachment).not.toBeNull();
      expect(attachment?.sourceType).toBe('display');
      expect(attachment?.dataUrl).toContain('data:image/');
      expect(attachment?.width).toBeGreaterThan(0);
      expect(attachment?.height).toBeGreaterThan(0);
    });

    it('handles cancelled region capture cleanly by returning null', async () => {
      vi.spyOn(NativeBridge, 'captureScreen').mockResolvedValueOnce({
        success: false,
        cancelled: true,
        width: 0,
        height: 0,
        mime_type: 'image/png',
        source_type: 'region',
        source_name: 'Region',
        file_size_bytes: 0,
        error: null,
      });

      const attachment = await ScreenContextService.captureScreen({ mode: 'region' });
      expect(attachment).toBeNull();
    });
  });

  describe('AnnotationService', () => {
    it('converts Apple Vision OCR items into normalized annotations', () => {
      const ocrItems: OcrTextItem[] = [
        { text: 'File Edit Selection', confidence: 0.99, x: 0.05, y: 0.02, width: 0.15, height: 0.03 },
        { text: 'Submit Query', confidence: 0.95, x: 0.8, y: 0.85, width: 0.12, height: 0.05 },
      ];

      const annotations = AnnotationService.fromOcrItems(ocrItems);
      expect(annotations).toHaveLength(2);
      expect(annotations[0].label).toBe('File Edit Selection');
      expect(annotations[0].confidence).toBe(0.99);
      expect(annotations[0].box.x).toBe(0.05);
      expect(annotations[0].box.y).toBe(0.02);
      expect(annotations[1].label).toBe('Submit Query');
    });

    it('parses JSON box_2d grounding output from multimodal models', () => {
      const modelResponse = `
        I identified the button on screen:
        {"box_2d": [100, 200, 300, 450], "label": "Save Button"}
        Click on that button to persist.
      `;

      const annotations = AnnotationService.parseModelAnnotations(modelResponse);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].label).toBe('Save Button');
      expect(annotations[0].box.x).toBeCloseTo(0.2); // 200 / 1000
      expect(annotations[0].box.y).toBeCloseTo(0.1); // 100 / 1000
      expect(annotations[0].box.width).toBeCloseTo(0.25); // (450 - 200) / 1000
      expect(annotations[0].box.height).toBeCloseTo(0.2); // (300 - 100) / 1000
    });

    it('parses coordinate arrays [ymin, xmin, ymax, xmax]', () => {
      const modelResponse = 'The search box is located at [50, 100, 150, 600].';
      const annotations = AnnotationService.parseModelAnnotations(modelResponse);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].box.x).toBeCloseTo(0.1);
      expect(annotations[0].box.y).toBeCloseTo(0.05);
      expect(annotations[0].box.width).toBeCloseTo(0.5);
    });
  });

  describe('ModelRegistry & Multimodal Providers', () => {
    it('accurately identifies vision capability per model', () => {
      // Vision models
      expect(ModelRegistry.isVisionSupported('openai', 'gpt-4o')).toBe(true);
      expect(ModelRegistry.isVisionSupported('openai', 'gpt-4o-mini')).toBe(true);
      expect(ModelRegistry.isVisionSupported('anthropic', 'claude-3-5-sonnet-20241022')).toBe(true);
      expect(ModelRegistry.isVisionSupported('gemini', 'gemini-1.5-pro')).toBe(true);
      expect(ModelRegistry.isVisionSupported('gemini', 'gemini-1.5-flash')).toBe(true);
      expect(ModelRegistry.isVisionSupported('groq', 'llama-3.2-11b-vision-preview')).toBe(true);
      expect(ModelRegistry.isVisionSupported('ollama', 'llama3.2-vision:11b')).toBe(true);
      expect(ModelRegistry.isVisionSupported('ollama', 'llava:7b')).toBe(true);

      // Text-only models
      expect(ModelRegistry.isVisionSupported('openai', 'o1-mini')).toBe(false);
      expect(ModelRegistry.isVisionSupported('groq', 'openai/gpt-oss-120b')).toBe(false);
      expect(ModelRegistry.isVisionSupported('ollama', 'llama3.2:1b')).toBe(false);
      expect(ModelRegistry.isVisionSupported('ollama', 'smollm:135m')).toBe(false);
    });

    it('formats multimodal payload for Ollama with raw base64 images', async () => {
      const provider = new OllamaProvider();
      const mockStreamChat = vi.spyOn(NativeBridge, 'streamOllamaChat').mockResolvedValueOnce('I see a screen.');

      const fakeAttachment: ImageAttachment = {
        id: 'att-1',
        sourceType: 'display',
        sourceName: 'Main Screen',
        mimeType: 'image/png',
        width: 1920,
        height: 1080,
        fileSizeBytes: 2048,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        createdAt: new Date().toISOString(),
      };

      (globalThis as any).window = { __TAURI_INTERNALS__: {} };
      vi.spyOn(NativeBridge, 'isTauri').mockReturnValue(true);

      await provider.streamMessage(
        {
          model: 'llama3.2-vision:11b',
          messages: [
            {
              role: 'user',
              content: 'What is shown here?',
              attachments: [fakeAttachment],
            },
          ],
        },
        {
          onToken: () => {},
          onComplete: () => {},
          onError: () => {},
        }
      );

      expect(mockStreamChat).toHaveBeenCalled();
      const passedMessages = mockStreamChat.mock.calls[0][1] as any[];
      expect(passedMessages[0].images).toBeDefined();
      expect(passedMessages[0].images[0]).not.toContain('data:image');
      expect(passedMessages[0].images[0]).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
      delete (globalThis as any).window;
    });
  });
});
