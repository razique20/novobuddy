import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  PlusCircle,
  Eye,
  Mic,
  MessageSquare,
  Compass,
  Settings as SettingsIcon,
  Cpu,
  Clock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useConversationStore } from '../../stores/conversationStore';
import { Badge } from '../../components/common/Badge';

export const HomePage: React.FC = () => {
  const [inputPrompt, setInputPrompt] = useState('');
  const { setCurrentTab, systemStatus, shortcutStatus, fetchSystemStatus, fetchShortcutStatus } =
    useAppStore();
  const { conversations, loadConversations, createNewConversation, selectConversation, sendMessage } =
    useConversationStore();

  useEffect(() => {
    fetchSystemStatus();
    fetchShortcutStatus();
    loadConversations();
  }, [fetchSystemStatus, fetchShortcutStatus, loadConversations]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    const query = inputPrompt.trim();
    setInputPrompt('');

    // Create conversation, navigate to assistant, send message
    const preview = query.length > 25 ? query.slice(0, 22) + '...' : query;
    const convId = await createNewConversation(preview);
    await selectConversation(convId);
    setCurrentTab('assistant');
    await sendMessage(query);
  };

  const handleQuickAction = async (actionType: string) => {
    switch (actionType) {
      case 'ask':
        setCurrentTab('assistant');
        break;
      case 'explore':
        const convId = await createNewConversation('Workspace Exploration');
        await selectConversation(convId);
        setCurrentTab('assistant');
        await sendMessage('Explore my workspace and list available capabilities in Phase 1.');
        break;
      case 'settings':
        setCurrentTab('settings');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Hero Welcome Section */}
      <div className="space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>NOVA Phase 1 Desktop Active</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          {getTimeGreeting()}. What are we working on?
        </h1>
        <p className="text-sm text-text-secondary">Your intelligent workspace is ready.</p>
      </div>

      {/* Large Assistant Prompt Input */}
      <div className="nova-glass-card rounded-2xl p-4 border border-border relative">
        <form onSubmit={handlePromptSubmit} className="space-y-3">
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePromptSubmit(e);
              }
            }}
            placeholder="Ask NOVA anything, describe a task, or query your desktop state..."
            rows={3}
            className="w-full bg-transparent resize-none border-none outline-none text-sm text-text-primary placeholder:text-text-muted focus:ring-0 leading-relaxed font-normal"
          />

          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            {/* Context action pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const id = await createNewConversation('New Conversation');
                  await selectConversation(id);
                  setCurrentTab('assistant');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-card hover:bg-background-cardHover text-xs font-medium text-text-primary border border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                <span>New Conversation</span>
              </button>

              <button
                type="button"
                disabled
                title="Screen context analysis will be available in Phase 3"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-secondary/70 text-xs font-medium text-text-muted border border-border cursor-not-allowed opacity-70"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Screen Context</span>
                <Badge variant="muted" size="sm">
                  Phase 3
                </Badge>
              </button>

              <button
                type="button"
                disabled
                title="Voice interaction will be available in Phase 2"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-secondary/70 text-xs font-medium text-text-muted border border-border cursor-not-allowed opacity-70"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice</span>
                <Badge variant="muted" size="sm">
                  Phase 2
                </Badge>
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary text-white text-xs font-semibold shadow-sm hover:shadow-glow transition-all cursor-pointer"
            >
              <span>Ask NOVA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Quick Action Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => handleQuickAction('ask')}
            className="nova-glass-card p-4 rounded-xl cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors">
              Ask NOVA
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-normal">
              Open conversational assistant shell
            </div>
          </div>

          <div
            onClick={() => handleQuickAction('explore')}
            className="nova-glass-card p-4 rounded-xl cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Explore Workspace
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-normal">
              Tour Phase 1 desktop foundations
            </div>
          </div>

          <div
            onClick={() => handleQuickAction('settings')}
            className="nova-glass-card p-4 rounded-xl cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-white/5 border border-border text-text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors">
              Open Settings
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-normal">
              Configure shortcuts, theme & preferences
            </div>
          </div>

          <div className="nova-glass-card p-4 rounded-xl border-dashed opacity-85">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <Badge variant="warning" size="sm">
                Phase 2
              </Badge>
            </div>
            <div className="text-xs font-semibold text-text-primary">Connect AI Provider</div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-normal">
              Ollama, OpenAI, Anthropic, Gemini
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Recent Activity
            </h2>
            <button
              onClick={() => setCurrentTab('assistant')}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {conversations.length === 0 ? (
            <div className="nova-glass-card p-6 rounded-xl text-center text-text-secondary text-xs">
              No recent conversations found. Start by entering a query above.
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  onClick={async () => {
                    await selectConversation(c.id);
                    setCurrentTab('assistant');
                  }}
                  className="nova-glass-card p-3 rounded-xl flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-background-secondary border border-border/60 flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        {new Date(c.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="muted" size="sm">
                      {c.message_count} {c.message_count === 1 ? 'msg' : 'msgs'}
                    </Badge>
                    <ChevronRight className="w-3.5 h-3.5 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Status Indicators */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Desktop Status
          </h2>
          <div className="nova-glass-card p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-xs text-text-secondary">Core Backend</span>
              <Badge variant="purple" size="sm">
                Tauri 2 + Rust
              </Badge>
            </div>

            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-xs text-text-secondary">Storage</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SQLite Active
              </span>
            </div>

            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-xs text-text-secondary">Global Shortcut</span>
              <kbd className="text-[11px] font-mono px-2 py-0.5 rounded bg-background-secondary border border-border text-text-primary">
                {shortcutStatus?.shortcut || 'Option + Space'}
              </kbd>
            </div>

            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-xs text-text-secondary">Platform</span>
              <span className="text-xs font-medium text-text-primary">
                {systemStatus?.os_name || 'macOS'} ({systemStatus?.arch || 'aarch64'})
              </span>
            </div>

            <div className="pt-1 flex items-center gap-2 text-[11px] text-text-secondary">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Zero-telemetry local isolation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
