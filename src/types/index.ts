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
  | 'screen_privacy'
  | 'providers'
  | 'about';

export type ThemeMode = 'dark' | 'light' | 'system';

export type ScreenshotRetentionPolicy = 'ephemeral' | 'session' | '30_days';

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
  // Screen & Visual Privacy (Phase 3)
  screen_capture_enabled?: boolean;
  excluded_applications?: string[];
  screenshot_retention_policy?: ScreenshotRetentionPolicy;
  ocr_enabled?: boolean;
  onboarding_completed: boolean;
}

export type CaptureSourceType = 'display' | 'window' | 'region' | 'upload';

export interface VisualAnnotation {
  id: string;
  label: string;
  box: {
    x: number; // 0.0 - 1.0 normalized
    y: number; // 0.0 - 1.0 normalized
    width: number; // 0.0 - 1.0 normalized
    height: number; // 0.0 - 1.0 normalized
  };
  confidence?: number;
  color?: string;
}

export interface ImageAttachment {
  id: string;
  sourceType: CaptureSourceType;
  sourceName: string;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  dataUrl?: string;
  ocrText?: string;
  annotations?: VisualAnnotation[];
  createdAt: string;
}

export interface ScreenPermissionStatus {
  has_permission: boolean;
  message: string;
}

export interface ScreenDisplayInfo {
  id: number;
  index: number;
  name: string;
  is_main: boolean;
  width: number;
  height: number;
}

export interface ScreenWindowInfo {
  id: number;
  app_name: string;
  title: string;
  pid: number;
  width: number;
  height: number;
  is_excluded?: boolean;
}

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenCaptureResult {
  success: boolean;
  cancelled: boolean;
  base64_image?: string | null;
  data_url?: string | null;
  width: number;
  height: number;
  mime_type: string;
  source_type: string;
  source_name: string;
  file_size_bytes: number;
  error?: string | null;
}

export interface OcrTextItem {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
  attachments?: ImageAttachment[];
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
