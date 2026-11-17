import {
  ApplicationSettings,
  CaptureRegion,
  Conversation,
  Message,
  OcrTextItem,
  ScreenCaptureResult,
  ScreenDisplayInfo,
  ScreenPermissionStatus,
  ScreenWindowInfo,
  ShortcutStatus,
  SystemStatus,
} from '../../types';
import { OllamaInstalledModel, OllamaInstallationStatus } from '../ai/types';

// Check if running inside Tauri webview
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Default fallback settings for dev/preview
const DEFAULT_SETTINGS: ApplicationSettings = {
  launch_at_startup: false,
  start_minimized: false,
  theme: 'dark',
  language: 'English',
  compact_mode: false,
  enable_animations: true,
  global_shortcut: 'Option + Space',
  shortcut_enabled: true,
  data_retention_days: 30,
  telemetry_enabled: false,
  onboarding_completed: false,
};

// Fallback in-memory storage for web testing
let fallbackSettings = { ...DEFAULT_SETTINGS };
let fallbackConversations: Conversation[] = [
  {
    id: 'welcome-nova-session',
    title: 'Welcome to NOVA',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: 1,
  },
];
let fallbackMessages: Record<string, Message[]> = {
  'welcome-nova-session': [
    {
      id: 'msg-1',
      conversation_id: 'welcome-nova-session',
      role: 'assistant',
      content:
        'Hello! I am NOVA, your intelligent desktop companion. In Phase 1, our desktop foundation, window controls, and local persistence are active. How can I assist you today?',
      created_at: new Date().toISOString(),
      tokens: 36,
      is_simulated: true,
    },
  ],
};
const fallbackKeyStore: Record<string, string> = {};

export class NativeBridge {
  static isTauri(): boolean {
    return isTauriEnvironment();
  }

  static async getAppSettings(): Promise<ApplicationSettings> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ApplicationSettings>('get_app_settings');
    }
    return fallbackSettings;
  }

  static async saveAppSettings(settings: ApplicationSettings): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_app_settings', { settings });
    } else {
      fallbackSettings = { ...settings };
    }
  }

  static async getConversations(): Promise<Conversation[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<Conversation[]>('get_conversations');
    }
    return fallbackConversations;
  }

  static async createConversation(id: string, title: string): Promise<Conversation> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<Conversation>('create_conversation', { id, title });
    }
    const newConv: Conversation = {
      id,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
    };
    fallbackConversations.unshift(newConv);
    fallbackMessages[id] = [];
    return newConv;
  }

  static async deleteConversation(id: string): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_conversation', { id });
    } else {
      fallbackConversations = fallbackConversations.filter((c) => c.id !== id);
      delete fallbackMessages[id];
    }
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<Message[]>('get_messages', { conversationId });
    }
    return fallbackMessages[conversationId] || [];
  }

  static async saveMessage(message: Message): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_message', { message });
    } else {
      if (!fallbackMessages[message.conversation_id]) {
        fallbackMessages[message.conversation_id] = [];
      }
      fallbackMessages[message.conversation_id].push(message);
    }
  }

  static async clearAllData(): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('clear_all_data');
    } else {
      fallbackConversations = [];
      fallbackMessages = {};
    }
  }

  static async toggleFloatingWindow(): Promise<boolean> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('toggle_floating_window');
    }
    return true;
  }

  static async showFloatingWindow(): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('show_floating_window');
    }
  }

  static async hideFloatingWindow(): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('hide_floating_window');
    }
  }

  static async openMainWindow(): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_main_window');
    }
  }

  static async getSystemStatus(): Promise<SystemStatus> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<SystemStatus>('get_system_status');
    }
    return {
      os_name: 'macOS',
      os_version: 'macOS 15 (Sequoia)',
      arch: 'aarch64',
      app_version: '0.1.0-alpha (Phase 1)',
      database_status: 'Local SQLite (Active)',
      bridge_status: 'Web Bridge Ready',
      active_window: 'Main Dashboard',
    };
  }

  static async getShortcutStatus(): Promise<ShortcutStatus> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ShortcutStatus>('get_shortcut_status');
    }
    return {
      shortcut: 'Option + Space',
      is_registered: true,
      description: 'Global toggle for NOVA Floating Companion',
    };
  }

  static async updateConversationTitle(id: string, title: string): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('update_conversation_title', { id, title });
    } else {
      const conv = fallbackConversations.find((c) => c.id === id);
      if (conv) {
        conv.title = title;
        conv.updated_at = new Date().toISOString();
      }
    }
  }

  static async storeApiKey(provider: string, key: string): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('store_api_key', { provider, key });
    } else {
      fallbackKeyStore[provider] = key;
    }
  }

  static async getApiKey(provider: string): Promise<string | null> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string | null>('get_api_key', { provider });
    }
    return fallbackKeyStore[provider] || null;
  }

  static async deleteApiKey(provider: string): Promise<void> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_api_key', { provider });
    } else {
      delete fallbackKeyStore[provider];
    }
  }

  static async hasApiKey(provider: string): Promise<boolean> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('has_api_key', { provider });
    }
    return !!fallbackKeyStore[provider];
  }

  static async getOllamaInstalledModels(endpoint?: string): Promise<OllamaInstalledModel[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<OllamaInstalledModel[]>('get_ollama_installed_models', { endpoint });
    }
    // Web fallback using fetch
    try {
      const ep = (endpoint || 'http://localhost:11434').replace(/\/+$/, '');
      const res = await fetch(`${ep}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        return (data.models || []).map((m: any) => ({
          name: m.name || m.model,
          size: m.size || 0,
          size_formatted: m.size ? `${(m.size / (1024 * 1024)).toFixed(0)} MB` : 'Installed',
          modified_at: m.modified_at || 'Recently',
          digest: m.digest || '',
        }));
      }
    } catch {
      // ignore
    }
    return [];
  }

  static async getOllamaInstallationStatus(endpoint?: string): Promise<OllamaInstallationStatus> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<OllamaInstallationStatus>('get_ollama_installation_status', { endpoint });
    }
    // Web fallback
    try {
      const ep = (endpoint || 'http://localhost:11434').replace(/\/+$/, '');
      const res = await fetch(`${ep}/api/version`);
      if (res.ok) {
        const data = await res.json();
        return {
          is_installed: true,
          is_running: true,
          version: data.version,
          endpoint: ep,
          message: `Ollama server is active (v${data.version})`,
        };
      }
    } catch {
      // ignore
    }
    return {
      is_installed: false,
      is_running: false,
      endpoint: endpoint || 'http://localhost:11434',
      message: 'Ollama is offline or not installed.',
    };
  }

  static async pullOllamaModel(model: string): Promise<string> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('pull_ollama_model', { model });
    }
    return `Model ${model} pull initiated.`;
  }

  static async deleteOllamaModel(model: string): Promise<string> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('delete_ollama_model', { model });
    }
    return `Model ${model} deleted.`;
  }

  static async startOllamaServer(): Promise<string> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('start_ollama_server');
    }
    return 'Ollama server command executed.';
  }

  static async stopOllamaServer(): Promise<string> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('stop_ollama_server');
    }
    return 'Ollama server stopped.';
  }

  /**
   * Stream Ollama chat completion through native Tauri IPC.
   * Completely bypasses WKWebView fetch/CORS/ATS restrictions.
   * @param model - The Ollama model to use (e.g. "smollm:135m")
   * @param messages - Array of { role, content } chat messages
   * @param onToken - Callback fired for each streamed token
   * @param endpoint - Optional Ollama endpoint URL
   * @returns Promise that resolves with the full accumulated text
   */
  static async streamOllamaChat(
    model: string,
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void,
    endpoint?: string
  ): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('streamOllamaChat requires Tauri native environment');
    }

    const { invoke, Channel } = await import('@tauri-apps/api/core');
    const messagesJson = JSON.stringify(messages);

    return new Promise<string>((resolve, reject) => {
      let accumulated = '';

      const onChunk = new Channel<string>();
      onChunk.onmessage = (chunk: string) => {
        if (chunk === '__DONE__') {
          resolve(accumulated);
          return;
        }
        if (chunk.startsWith('__ERROR__:')) {
          const errorMsg = chunk.slice('__ERROR__:'.length);
          reject(new Error(errorMsg));
          return;
        }
        // Normal token
        accumulated += chunk;
        onToken(chunk);
      };

      invoke('stream_ollama_chat', {
        endpoint: endpoint || null,
        model,
        messagesJson,
        onChunk,
      }).catch((err: any) => {
        reject(new Error(typeof err === 'string' ? err : err?.message || 'Native stream failed'));
      });
    });
  }

  /**
   * Universal native HTTP request bypassing WKWebView ATS/CORS restrictions
   */
  static async nativeHttpRequest(
    url: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    }
  ): Promise<{ status: number; body: string; ok: boolean }> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      const headersList = options?.headers ? Object.entries(options.headers) : null;
      return await invoke<{ status: number; body: string; ok: boolean }>('native_http_request', {
        url,
        method: options?.method || 'GET',
        headers: headersList,
        body: options?.body || null,
      });
    }

    // Fallback in web/tests
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body,
    });
    const body = await res.text();
    return {
      status: res.status,
      body,
      ok: res.ok,
    };
  }

  /**
   * Universal native SSE chat streaming for cloud providers (Groq, OpenAI, Anthropic)
   */
  static async nativeStreamChat(
    url: string,
    body: string,
    headers: Record<string, string>,
    onToken: (token: string) => void
  ): Promise<string> {
    if (!isTauriEnvironment()) {
      throw new Error('nativeStreamChat requires Tauri native environment');
    }

    const { invoke, Channel } = await import('@tauri-apps/api/core');
    const headersList = Object.entries(headers);

    return new Promise<string>((resolve, reject) => {
      let accumulated = '';

      const onChunk = new Channel<string>();
      onChunk.onmessage = (chunk: string) => {
        if (chunk === '__DONE__') {
          resolve(accumulated);
          return;
        }
        if (chunk.startsWith('__ERROR__:')) {
          const errorMsg = chunk.slice('__ERROR__:'.length);
          reject(new Error(errorMsg));
          return;
        }
        accumulated += chunk;
        onToken(chunk);
      };

      invoke('native_stream_chat', {
        url,
        headers: headersList,
        body,
        onChunk,
      }).catch((err: any) => {
        reject(new Error(typeof err === 'string' ? err : err?.message || 'Native stream failed'));
      });
    });
  }

  // --- Phase 3: Screen Awareness & Visual Intelligence ---

  static async checkScreenPermission(): Promise<ScreenPermissionStatus> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ScreenPermissionStatus>('check_screen_permission');
    }
    return {
      has_permission: true,
      message: 'Screen recording permission is granted (browser fallback)',
    };
  }

  static async requestScreenPermission(): Promise<ScreenPermissionStatus> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ScreenPermissionStatus>('request_screen_permission');
    }
    return {
      has_permission: true,
      message: 'Screen recording permission granted',
    };
  }

  static async getScreenDisplays(): Promise<ScreenDisplayInfo[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ScreenDisplayInfo[]>('get_screen_displays');
    }
    return [
      {
        id: 1,
        index: 1,
        name: 'Main Built-in Display',
        is_main: true,
        width: 1920,
        height: 1080,
      },
    ];
  }

  static async getScreenWindows(): Promise<ScreenWindowInfo[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ScreenWindowInfo[]>('get_screen_windows');
    }
    return [
      {
        id: 101,
        app_name: 'Finder',
        title: 'Desktop',
        pid: 1,
        width: 1920,
        height: 1080,
        is_excluded: false,
      },
    ];
  }

  static async captureScreen(options: {
    mode: 'display' | 'window' | 'region';
    targetId?: string;
    region?: CaptureRegion;
    excludedApps?: string[];
  }): Promise<ScreenCaptureResult> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<ScreenCaptureResult>('capture_screen', {
        mode: options.mode,
        targetId: options.targetId || null,
        region: options.region || null,
        excludedApps: options.excludedApps || null,
      });
    }

    // Web fallback (returns a small blank 1x1 png or mock)
    return {
      success: true,
      cancelled: false,
      base64_image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      width: 1,
      height: 1,
      mime_type: 'image/png',
      source_type: options.mode,
      source_name: options.mode === 'window' ? 'Mock Window' : 'Mock Display',
      file_size_bytes: 68,
      error: null,
    };
  }

  static async performOcr(imageBase64: string): Promise<OcrTextItem[]> {
    if (isTauriEnvironment()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<OcrTextItem[]>('perform_ocr', { imageBase64 });
    }
    return [];
  }
}

