import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useSettingsStore } from '../stores/settingsStore';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../features/home/HomePage';
import { AssistantPage } from '../features/assistant/AssistantPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ComingSoonPage } from '../features/placeholders/ComingSoonPage';
import { FloatingAssistant } from '../features/floating/FloatingAssistant';
import { OnboardingModal } from '../features/onboarding/OnboardingModal';
import { isTauriEnvironment } from '../services/native/bridge';

export const AppRouter: React.FC = () => {
  const [windowType, setWindowType] = useState<'main' | 'floating'>('main');
  const { currentTab, showOnboarding } = useAppStore();
  const { settings, loadSettings, isLoading } = useSettingsStore();

  useEffect(() => {
    // Detect window type: floating vs main
    const checkWindow = async () => {
      // 1. Check URL hash / query
      if (
        window.location.hash === '#floating' ||
        window.location.search.includes('window=floating')
      ) {
        setWindowType('floating');
        return;
      }

      // 2. Check Tauri window label if running inside Tauri
      if (isTauriEnvironment()) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const current = getCurrentWindow();
          if (current.label === 'floating') {
            setWindowType('floating');
            return;
          }
        } catch (e) {
          console.warn('Could not determine window label:', e);
        }
      }

      setWindowType('main');
    };

    checkWindow();
    loadSettings();
  }, [loadSettings]);

  // If floating companion window, render only the compact floating companion
  if (windowType === 'floating') {
    return <FloatingAssistant />;
  }

  // Active view switcher for main window
  const renderCurrentView = () => {
    switch (currentTab) {
      case 'home':
        return <HomePage />;
      case 'assistant':
        return <AssistantPage />;
      case 'settings':
        return <SettingsPage />;
      case 'memory':
      case 'agents':
      case 'workflows':
      case 'integrations':
        return <ComingSoonPage tab={currentTab} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="relative w-full h-full">
      <AppLayout>{renderCurrentView()}</AppLayout>

      {/* First-launch onboarding modal if not completed or explicitly triggered */}
      {!isLoading && (!settings.onboarding_completed || showOnboarding) && (
        <OnboardingModal />
      )}
    </div>
  );
};
