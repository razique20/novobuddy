import React from 'react';
import {
  Home,
  MessageSquare,
  Brain,
  Bot,
  GitBranch,
  Layers,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { NavigationTab } from '../../types';
import { Badge } from '../common/Badge';
import { NovaLogo } from '../common/NovaLogo';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  phase?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'assistant', label: 'Assistant', icon: MessageSquare },
  { id: 'memory', label: 'Memory', icon: Brain, phase: 'Phase 3' },
  { id: 'agents', label: 'Agents', icon: Bot, phase: 'Phase 3' },
  { id: 'workflows', label: 'Workflows', icon: GitBranch, phase: 'Phase 4' },
  { id: 'integrations', label: 'Integrations', icon: Layers, phase: 'Phase 4' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentTab, setCurrentTab } = useAppStore();

  return (
    <aside className="w-60 h-full bg-background-secondary border-r border-border flex flex-col justify-between p-3 select-none">
      {/* Brand & Logo */}
      <div>
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4">
          <NovaLogo size="md" />
          <div>
            <div className="font-bold text-sm tracking-tight text-text-primary flex items-center gap-1.5">
              NOVA
              <span className="text-[10px] font-semibold text-primary px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20">
                v0.1
              </span>
            </div>
            <div className="text-[11px] text-text-muted">Desktop Companion</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-card'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.phase && (
                  <Badge variant="muted" size="sm">
                    {item.phase}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & System Status pill */}
      <div className="pt-3 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background-card border border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
            <span className="text-[11px] text-text-secondary font-medium">Native Core Ready</span>
          </div>
          <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
        </div>

        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-background-card transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
            N
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">macOS User</div>
            <div className="text-[10px] text-text-muted truncate">Local Environment</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
