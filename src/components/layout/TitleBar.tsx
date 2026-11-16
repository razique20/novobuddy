import React from 'react';
import { Terminal } from 'lucide-react';
import { NativeBridge } from '../../services/native/bridge';
import { useAppStore } from '../../stores/appStore';
import { NovaLogo } from '../common/NovaLogo';

export const TitleBar: React.FC = () => {
  const { currentTab, shortcutStatus } = useAppStore();

  const handleLaunchFloating = async () => {
    try {
      await NativeBridge.showFloatingWindow();
    } catch (e) {
      console.error('Failed to show floating window:', e);
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'home':
        return 'Workspace';
      case 'assistant':
        return 'Companion Chat';
      case 'memory':
        return 'Context Memory (Phase 3)';
      case 'agents':
        return 'Autonomous Agents (Phase 3)';
      case 'workflows':
        return 'Automation Workflows (Phase 4)';
      case 'integrations':
        return 'MCP & Integrations (Phase 4)';
      case 'settings':
        return 'Application Settings';
      default:
        return 'NOVA';
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-10 w-full flex items-center justify-between px-4 border-b border-border bg-background-secondary/90 select-none text-xs"
    >
      {/* Left traffic lights space on macOS */}
      <div className="flex items-center gap-2 pl-16">
        <span className="font-semibold text-text-primary tracking-wide flex items-center gap-2">
          <NovaLogo size="xs" withGlow={false} />
          NOVA
        </span>
        <span className="text-border">/</span>
        <span className="text-text-secondary">{getTabTitle()}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleLaunchFloating}
          title="Open Floating Companion (⌥Space)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background-card border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm"
        >
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium">Floating Companion</span>
          <kbd className="text-[10px] bg-background-secondary px-1.5 py-0.5 rounded text-text-secondary border border-border">
            {shortcutStatus?.shortcut || '⌥Space'}
          </kbd>
        </button>
      </div>
    </header>
  );
};
