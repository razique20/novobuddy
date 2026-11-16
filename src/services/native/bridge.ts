import {
  ApplicationSettings,
  Conversation,
  Message,
  ShortcutStatus,
  SystemStatus,
} from '../../types';

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

export class NativeBridge {
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
}
