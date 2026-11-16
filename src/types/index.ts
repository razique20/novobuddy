export type WindowType = 'main' | 'floating';

export type NavigationTab =
  | 'home'
  | 'assistant'
  | 'memory'
  | 'agents'
  | 'workflows'
  | 'integrations'
  | 'settings';

export type SettingsSection =
  | 'general'
  | 'appearance'
  | 'shortcuts'
  | 'privacy'
  | 'providers'
  | 'about';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ApplicationSettings {
  launch_at_startup: boolean;
  start_minimized: boolean;
  theme: ThemeMode;
  language: string;
  compact_mode: boolean;
  enable_animations: boolean;
  global_shortcut: string;
  shortcut_enabled: boolean;
  data_retention_days: number;
  telemetry_enabled: boolean;
  onboarding_completed: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens?: number;
  is_simulated: boolean;
}

export interface SystemStatus {
  os_name: string;
  os_version: string;
  arch: string;
  app_version: string;
  database_status: string;
  bridge_status: string;
  active_window: string;
}

export interface ShortcutStatus {
  shortcut: string;
  is_registered: boolean;
  description: string;
}

// Future-proof architectural interfaces
export type AIProviderType = 'cloud' | 'local';

export interface AIProvider {
  id: string;
  name: string;
  type: AIProviderType;
  model: string;
  isAvailable: boolean;
  isConfigured: boolean;
  requiresKey: boolean;
  endpointUrl?: string;
  description: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: 'idle' | 'active' | 'paused';
  version: string;
}

export interface Workflow {
  id: string;
  title: string;
  trigger: string;
  actions: string[];
  enabled: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: 'mcp' | 'browser' | 'filesystem' | 'calendar';
  status: 'connected' | 'disconnected' | 'coming_soon';
  description: string;
}
