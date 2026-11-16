import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Maximize2, X, Bot, CornerDownLeft } from 'lucide-react';
import { NativeBridge } from '../../services/native/bridge';
import { conversationService } from '../../services/conversation/conversationService';
import { useConversationStore } from '../../stores/conversationStore';
import { NovaLogo } from '../../components/common/NovaLogo';

export const FloatingAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createNewConversation } = useConversationStore();

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        NativeBridge.hideFloatingWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    const query = prompt.trim();
    setPrompt('');
    setIsProcessing(true);
    setStatusMessage('Processing query with local demo engine...');

    try {
      const convId = await createNewConversation(
        query.length > 25 ? query.slice(0, 22) + '...' : query
      );
      const reply = await conversationService.sendMessage(convId, query);
      setStatusMessage(reply.content.replace('[SIMULATED DEMO RESPONSE]\n', '').slice(0, 140) + '...');
    } catch (err) {
      console.error(err);
      setStatusMessage('Encountered an issue processing request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExpandToMain = async () => {
    try {
      await NativeBridge.openMainWindow();
      await NativeBridge.hideFloatingWindow();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = async () => {
    try {
      await NativeBridge.hideFloatingWindow();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center p-2 bg-transparent select-none">
      <div className="w-full max-w-[540px] rounded-2xl nova-floating-window p-3 text-text-primary animate-fade-in flex flex-col gap-2.5">
        {/* Top Control Bar with Drag Handle */}
        <div data-tauri-drag-region className="flex items-center justify-between pb-1 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <NovaLogo size="sm" />
            <span className="text-xs font-semibold tracking-wide text-text-primary">NOVA Floating Companion</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/25 text-purple-600 dark:text-purple-300 font-medium">
              ⌥Space
            </span>
          </div>

          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={handleExpandToMain}
              title="Expand to Full Workspace"
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClose}
              title="Close (Esc)"
              className="p-1 rounded-md hover:bg-red-500/20 text-text-secondary hover:text-red-500 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask NOVA anything, search workspace, or run a command..."
            disabled={isProcessing}
            className="w-full h-11 pl-3.5 pr-20 bg-background-card border border-border focus:border-primary rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none transition-all shadow-sm"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {prompt.trim() && (
              <button
                type="submit"
                disabled={isProcessing}
                className="w-7 h-7 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center text-[10px] text-text-muted bg-background-secondary border border-border px-1.5 py-0.5 rounded">
              <CornerDownLeft className="w-2.5 h-2.5 mr-0.5" />
            </kbd>
          </div>
        </form>

        {/* Status or Result Preview */}
        {statusMessage ? (
          <div className="px-3 py-2 rounded-lg bg-background-card border border-border text-[11px] text-text-secondary flex items-start gap-2 shadow-sm">
            <Bot className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div className="line-clamp-2">{statusMessage}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1 text-[10px] text-text-muted">
            <span>Ready • Local SQLite persistence</span>
            <span>Esc to dismiss</span>
          </div>
        )}
      </div>
    </div>
  );
};
