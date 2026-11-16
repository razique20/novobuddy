import { create } from 'zustand';
import { NavigationTab, SettingsSection, ShortcutStatus, SystemStatus } from '../types';
import { NativeBridge } from '../services/native/bridge';

interface AppState {
  currentTab: NavigationTab;
  currentSettingsSection: SettingsSection;
  sidebarCollapsed: boolean;
  systemStatus: SystemStatus | null;
  shortcutStatus: ShortcutStatus | null;
  showOnboarding: boolean;

  setCurrentTab: (tab: NavigationTab) => void;
  setCurrentSettingsSection: (sec: SettingsSection) => void;
  toggleSidebar: () => void;
  setShowOnboarding: (show: boolean) => void;
  fetchSystemStatus: () => Promise<void>;
  fetchShortcutStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  currentTab: 'home',
  currentSettingsSection: 'general',
  sidebarCollapsed: false,
  systemStatus: null,
  shortcutStatus: null,
  showOnboarding: false,

  setCurrentTab: (tab) => set({ currentTab: tab }),
  setCurrentSettingsSection: (sec) => set({ currentSettingsSection: sec }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  fetchSystemStatus: async () => {
    try {
      const status = await NativeBridge.getSystemStatus();
      set({ systemStatus: status });
    } catch (e) {
      console.error('Failed to get system status:', e);
    }
  },

  fetchShortcutStatus: async () => {
    try {
      const status = await NativeBridge.getShortcutStatus();
      set({ shortcutStatus: status });
    } catch (e) {
      console.error('Failed to get shortcut status:', e);
    }
  },
}));
