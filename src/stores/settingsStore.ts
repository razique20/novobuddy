import { create } from 'zustand';
import { ApplicationSettings, ThemeMode } from '../types';
import { NativeBridge } from '../services/native/bridge';

interface SettingsState {
  settings: ApplicationSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<ApplicationSettings>) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  clearData: () => Promise<void>;
}

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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    try {
      const data = await NativeBridge.getAppSettings();
      set({ settings: data, isLoading: false });
      
      // Apply theme to DOM
      const activeTheme = data.theme;
      if (activeTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
        document.documentElement.classList.toggle('light', !prefersDark);
      } else {
        document.documentElement.classList.toggle('dark', activeTheme === 'dark');
        document.documentElement.classList.toggle('light', activeTheme === 'light');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const updated = { ...get().settings, ...updates };
    set({ settings: updated });
    try {
      await NativeBridge.saveAppSettings(updated);
    } catch (e) {
      console.error('Failed to persist settings:', e);
    }
  },

  setTheme: async (theme: ThemeMode) => {
    await get().updateSettings({ theme });
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      document.documentElement.classList.toggle('light', !prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.classList.toggle('light', theme === 'light');
    }
  },

  clearData: async () => {
    try {
      await NativeBridge.clearAllData();
      await get().updateSettings(DEFAULT_SETTINGS);
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  },
}));
