import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Maximize2,
  X,
  Bot,
  Square,
  AlertCircle,
  Cpu,
  Camera,
  Crop,
} from 'lucide-react';
import { NativeBridge } from '../../services/native/bridge';
import { conversationService } from '../../services/conversation/conversationService';
import { useConversationStore } from '../../stores/conversationStore';
import { aiProviderManager } from '../../services/ai/AIProviderManager';
import { NovaLogo } from '../../components/common/NovaLogo';
import { ImageAttachment } from '../../types';
import { ScreenContextService } from '../../services/screen/ScreenContextService';

export const FloatingAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachment, setAttachment] = useState<ImageAttachment | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const { createNewConversation } = useConversationStore();

  const activeProvider = aiProviderManager.getActiveProvider();
  const activeModel = aiProviderManager.getSelectedModel();

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isProcessing && abortController) {
          abortController.abort();
        } else {
          NativeBridge.hideFloatingWindow();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, abortController]);

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsProcessing(false);
    }
  };

  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    try {
      const att = await ScreenContextService.captureScreen({ mode: 'display', runOcr: true });
      if (att) {
        setAttachment(att);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Screen capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureRegion = async () => {
    setIsCapturing(true);
    try {
      const att = await ScreenContextService.captureScreen({ mode: 'region', runOcr: true });
      if (att) {
        setAttachment(att);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Region capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!prompt.trim() && !attachment) || isProcessing) return;

    const query = prompt.trim() || 'Analyze this screen capture';
    const currentAtt = attachment;
    setPrompt('');
    setAttachment(null);
    setIsProcessing(true);
    setStatusMessage('');
    setErrorMessage(null);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const convId = await createNewConversation(
        query.length > 25 ? query.slice(0, 22) + '...' : query
      );

      const reply = await conversationService.sendMessage(
        convId,
        query,
        (partial) => {
          setStatusMessage(partial);
        },
        controller.signal,
        currentAtt ? [currentAtt] : undefined
      );

      setStatusMessage(reply.content);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatusMessage((prev) => (prev ? prev + ' [stopped]' : 'Stopped'));
      } else {
        console.error(err);
        setErrorMessage(err.message || 'Error occurred while contacting AI.');
      }
    } finally {
      setIsProcessing(false);
      setAbortController(null);
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
    if (abortController) {
      abortController.abort();
    }
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
        <div
          data-tauri-drag-region
          className="flex items-center justify-between pb-1 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <NovaLogo size="sm" />
            <span className="text-xs font-semibold tracking-wide text-text-primary">
              NOVA Companion
            </span>
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/25 text-purple-600 dark:text-purple-300 font-medium">
              <Cpu className="w-2.5 h-2.5 text-primary" />
              <span>{activeProvider.name.split(' ')[0]}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-background-secondary border border-border text-text-muted">
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

        {/* Attachment Pill if captured */}
        {attachment && (
          <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-primary/15 border border-primary/30 text-xs text-text-primary animate-fade-in">
            <div className="flex items-center gap-2 truncate">
              {attachment.dataUrl && (
                <img
                  src={attachment.dataUrl}
                  alt="Capture"
                  className="w-6 h-4 rounded object-cover border border-white/20"
                />
              )}
              <span className="text-[11px] font-medium truncate">{attachment.sourceName}</span>
              <span className="text-[10px] text-text-muted">({attachment.width}×{attachment.height})</span>
            </div>
            <button
              onClick={() => setAttachment(null)}
              className="p-0.5 rounded-full hover:bg-white/10 text-text-muted hover:text-red-400 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCaptureScreen}
              disabled={isCapturing || isProcessing}
              title="Quick Capture Screen"
              className="w-9 h-11 rounded-xl bg-background-card border border-border hover:border-primary/50 text-text-muted hover:text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              <Camera className={`w-4 h-4 ${isCapturing ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleCaptureRegion}
              disabled={isCapturing || isProcessing}
              title="Select Region"
              className="w-9 h-11 rounded-xl bg-background-card border border-border hover:border-primary/50 text-text-muted hover:text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              <Crop className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                attachment
                  ? 'Ask about this screenshot...'
                  : `Ask NOVA (${activeModel})...`
              }
              disabled={isProcessing}
              className="w-full h-11 pl-3.5 pr-14 bg-background-card border border-border focus:border-primary rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none transition-all shadow-sm"
            />

            <div className="absolute right-2 flex items-center gap-1.5">
              {isProcessing ? (
                <button
                  type="button"
                  onClick={handleStop}
                  title="Stop generation"
                  className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer shadow-sm animate-pulse"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                (prompt.trim() || attachment) && (
                  <button
                    type="submit"
                    className="w-7 h-7 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )
              )}
            </div>
          </div>
        </form>

        {/* Streaming Result / Error / Status Preview */}
        {errorMessage ? (
          <div className="px-3 py-2 rounded-lg bg-red-100/90 dark:bg-red-500/15 border border-red-300 dark:border-red-500/30 text-[11px] text-red-900 dark:text-red-200 flex items-start gap-2 shadow-xs animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="line-clamp-2 font-medium">{errorMessage}</div>
          </div>
        ) : statusMessage ? (
          <div className="px-3 py-2 rounded-lg bg-background-card border border-border text-[11px] text-text-secondary flex items-start gap-2 shadow-sm animate-fade-in max-h-24 overflow-y-auto">
            <Bot className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div className="whitespace-pre-wrap leading-relaxed text-text-primary">
              {statusMessage}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1 text-[10px] text-text-muted">
            <span>
              Connected to <strong>{activeProvider.name}</strong> ({activeModel})
            </span>
            <span>Esc to dismiss</span>
          </div>
        )}
      </div>
    </div>
  );
};
