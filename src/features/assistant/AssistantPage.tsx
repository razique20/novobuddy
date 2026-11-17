import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  CornerDownLeft,
  MessageSquare,
  AlertCircle,
  Square,
  RotateCcw,
  Copy,
  Check,
  Edit2,
  Trash,
  Camera,
  Monitor,
  AppWindow,
  Crop,
  Maximize2,
} from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import { ModelSelector } from '../../components/chat/ModelSelector';
import { MarkdownContent } from '../../components/chat/MarkdownContent';
import { ImageAttachment, ScreenWindowInfo } from '../../types';
import { ScreenContextService } from '../../services/screen/ScreenContextService';
import { ImageAttachmentPreview } from '../../components/screen/ImageAttachmentPreview';
import { WindowPickerModal } from '../../components/screen/WindowPickerModal';
import { ImageViewerModal } from '../../components/screen/ImageViewerModal';
import { PermissionGuideModal } from '../../components/screen/PermissionGuideModal';

export const AssistantPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearActive, setConfirmClearActive] = useState(false);

  // Screen Capture States
  const [currentAttachment, setCurrentAttachment] = useState<ImageAttachment | null>(null);
  const [selectedViewerAttachment, setSelectedViewerAttachment] = useState<ImageAttachment | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [windowPickerOpen, setWindowPickerOpen] = useState(false);
  const [windowsList, setWindowsList] = useState<ScreenWindowInfo[]>([]);
  const [isLoadingWindows, setIsLoadingWindows] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [lastCaptureMode, setLastCaptureMode] = useState<'display' | 'window' | 'region'>('display');
  const [lastWindowTarget, setLastWindowTarget] = useState<ScreenWindowInfo | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const captureMenuRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    isSending,
    streamingContent,
    errorMessage,
    loadConversations,
    selectConversation,
    createNewConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
    regenerateResponse,
    stopGeneration,
    clearActiveConversation,
    clearError,
  } = useConversationStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Global key listener for Escape to stop generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSending) {
        stopGeneration();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSending, stopGeneration]);

  // Global shortcut for screen capture (Cmd+Shift+S)
  useEffect(() => {
    const handleCaptureShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setCaptureMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleCaptureShortcut);
    return () => window.removeEventListener('keydown', handleCaptureShortcut);
  }, []);

  // Close capture menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (captureMenuRef.current && !captureMenuRef.current.contains(e.target as Node)) {
        setCaptureMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ensurePermission = async (): Promise<boolean> => {
    try {
      const status = await ScreenContextService.checkPermission();
      if (!status.has_permission) {
        setPermissionModalOpen(true);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const handleCaptureFullScreen = async () => {
    setCaptureMenuOpen(false);
    if (!(await ensurePermission())) return;

    setIsCapturing(true);
    setLastCaptureMode('display');
    try {
      const att = await ScreenContextService.captureScreen({ mode: 'display', runOcr: true });
      if (att) {
        setCurrentAttachment(att);
      }
    } catch (e: any) {
      console.error('Screen capture failed:', e);
      if (e?.message?.includes('permission')) {
        setPermissionModalOpen(true);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleOpenWindowPicker = async () => {
    setCaptureMenuOpen(false);
    if (!(await ensurePermission())) return;

    setWindowPickerOpen(true);
    setIsLoadingWindows(true);
    try {
      const list = await ScreenContextService.getWindows();
      setWindowsList(list);
    } catch (e) {
      console.error('Failed to get windows:', e);
    } finally {
      setIsLoadingWindows(false);
    }
  };

  const handleSelectWindow = async (win: ScreenWindowInfo) => {
    setWindowPickerOpen(false);
    setIsCapturing(true);
    setLastCaptureMode('window');
    setLastWindowTarget(win);
    try {
      const att = await ScreenContextService.captureScreen({
        mode: 'window',
        targetId: String(win.id),
        runOcr: true,
      });
      if (att) {
        att.sourceName = `Window: ${win.app_name}`;
        setCurrentAttachment(att);
      }
    } catch (e: any) {
      console.error('Window capture failed:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureRegion = async () => {
    setCaptureMenuOpen(false);
    if (!(await ensurePermission())) return;

    setIsCapturing(true);
    setLastCaptureMode('region');
    try {
      const att = await ScreenContextService.captureScreen({ mode: 'region', runOcr: true });
      if (att) {
        setCurrentAttachment(att);
      }
    } catch (e: any) {
      console.error('Region capture failed:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRecapture = () => {
    if (lastCaptureMode === 'window' && lastWindowTarget) {
      handleSelectWindow(lastWindowTarget);
    } else if (lastCaptureMode === 'region') {
      handleCaptureRegion();
    } else {
      handleCaptureFullScreen();
    }
  };

  const handleRemoveAttachment = () => {
    setCurrentAttachment(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !currentAttachment) || isSending) return;

    const text = input.trim();
    const attToSend = currentAttachment;
    setInput('');
    setCurrentAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(text, attToSend ? [attToSend] : undefined);
  };

  const handleCopyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(id);
    setEditTitleInput(currentTitle);
  };

  const handleSaveRename = async (id: string) => {
    if (editTitleInput.trim()) {
      await renameConversation(id, editTitleInput.trim());
    }
    setEditingConvId(null);
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 animate-fade-in select-text">
      {/* Conversation History Sidebar */}
      <div className="w-64 bg-background-secondary/60 rounded-2xl border border-border/70 flex flex-col p-3 select-none">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/50">
          <span className="text-xs font-semibold text-text-primary tracking-wide">
            Conversations
          </span>
          <button
            onClick={async () => {
              const id = await createNewConversation();
              await selectConversation(id);
            }}
            title="Start new conversation"
            className="p-1 rounded-md bg-primary hover:bg-primary-hover text-white transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-muted">
              No conversations yet. Click + to begin.
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = c.id === activeConversationId;
              const isEditing = editingConvId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/20 text-text-primary border border-primary/30 shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-card'
                  }`}
                >
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1.5 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitleInput}
                        onChange={(e) => setEditTitleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(c.id);
                          if (e.key === 'Escape') setEditingConvId(null);
                        }}
                        autoFocus
                        className="w-full bg-background-card border border-primary px-1.5 py-0.5 rounded text-xs text-text-primary outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(c.id)}
                        className="text-emerald-400 p-0.5 hover:bg-emerald-500/20 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 truncate pr-2">
                        <MessageSquare
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected ? 'text-primary' : 'text-text-muted'
                          }`}
                        />
                        <span className="truncate">{c.title}</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartRename(c.id, c.title, e)}
                          title="Rename"
                          className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-primary"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(c.id);
                          }}
                          title="Delete conversation"
                          className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Clear Conversation Modal / Confirmation */}
        {confirmDeleteId && (
          <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-2">
            <div>Delete this conversation?</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  deleteConversation(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-2 py-1 bg-background-card hover:bg-background-cardHover text-text-secondary rounded text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-background-secondary/30 rounded-2xl border border-border/70 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-3 border-b border-border/50 flex items-center justify-between bg-background-card/40">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-primary truncate max-w-[240px]">
                {activeConv ? activeConv.title : 'NOVA Assistant'}
              </div>
              <div className="text-[10px] text-text-muted">
                {messages.length} message{messages.length === 1 ? '' : 's'} in history
              </div>
            </div>
          </div>

          {/* Model Selector & Actions */}
          <div className="flex items-center gap-2.5">
            <ModelSelector hasAttachment={Boolean(currentAttachment)} />

            {/* Clear Conversation Button */}
            {messages.length > 0 && (
              <button
                onClick={() => setConfirmClearActive(true)}
                title="Clear conversation history"
                className="p-1.5 rounded-xl border border-border/60 hover:border-red-500/40 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={async () => {
                const id = await createNewConversation();
                await selectConversation(id);
              }}
              title="New Chat"
              className="px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>

        {/* Clear Conversation Confirmation Prompt */}
        {confirmClearActive && (
          <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between text-xs text-red-300 animate-fade-in">
            <span>Clear all messages in this conversation?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  clearActiveConversation();
                  setConfirmClearActive(false);
                }}
                className="px-2.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold"
              >
                Clear
              </button>
              <button
                onClick={() => setConfirmClearActive(false)}
                className="px-2.5 py-0.5 bg-background-card text-text-secondary hover:text-text-primary rounded text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-100/80 dark:bg-red-500/15 border-b border-red-300 dark:border-red-500/30 flex items-start justify-between gap-3 text-xs text-red-900 dark:text-red-200 animate-fade-in shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-red-950 dark:text-red-100">Inference Error:</span>{' '}
                <span className="text-red-900 dark:text-red-200 font-medium">{errorMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => regenerateResponse()}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 dark:bg-red-500/25 dark:hover:bg-red-500/35 text-white dark:text-red-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
              <button
                onClick={clearError}
                className="px-2 py-1 text-red-700 hover:text-red-950 dark:text-red-400 dark:hover:text-red-200 text-[11px] font-medium cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-muted">
              Loading conversation from local SQLite...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 to-accent-blue/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg animate-fade-in">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-sm font-semibold text-text-primary">
                  Welcome to NOVA Conversational Core
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Real AI intelligence is connected. Ask coding questions, draft content, or analyze logic. Select between local Ollama and Cloud AI providers above.
                </p>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2">
                {[
                  'Write a quick TypeScript helper function',
                  'Explain macOS Keychain security architecture',
                  'Draft a project milestone checklist',
                  'Compare Ollama local models vs Cloud APIs',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(prompt)}
                    className="p-2.5 rounded-xl border border-border/80 bg-background-card/50 hover:bg-background-card hover:border-primary/40 text-left text-xs text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, index) => {
              const isAssistant = m.role === 'assistant';
              const isLastAssistant =
                isAssistant && index === messages.length - 1 && !isSending;

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 group ${
                    isAssistant ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="max-w-[82%] space-y-1.5">
                    {/* Render message attachments if present */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-1.5">
                        {m.attachments.map((att) => (
                          <div
                            key={att.id}
                            onClick={() => setSelectedViewerAttachment(att)}
                            className="relative group/att cursor-pointer rounded-xl overflow-hidden border border-border/80 bg-black/40 shadow-sm hover:border-primary/50 transition-all"
                            title="Click to view full image and annotations"
                          >
                            <img
                              src={att.dataUrl}
                              alt={att.sourceName}
                              className="max-h-44 max-w-xs object-cover rounded-xl transition-transform group-hover/att:scale-102"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/att:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                            </div>
                            <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] text-white/90 truncate flex items-center justify-between">
                              <span className="truncate">{att.sourceName}</span>
                              {att.ocrText && (
                                <span className="text-[8px] bg-primary/40 text-primary-light px-1 rounded ml-1">
                                  OCR
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-background-card border border-border/80 text-text-primary shadow-sm'
                          : 'bg-primary text-white shadow-md'
                      }`}
                    >
                      {isAssistant ? (
                        <MarkdownContent content={m.content} />
                      ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      )}
                    </div>

                    {/* Metadata & Message Actions Bar */}
                    <div
                      className={`text-[10px] text-text-muted px-1 flex items-center gap-3 ${
                        isAssistant ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {/* Copy message button */}
                      <button
                        onClick={() => handleCopyMessage(m.id, m.content)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 hover:text-text-primary transition-opacity cursor-pointer"
                        title="Copy message"
                      >
                        {copiedMsgId === m.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {/* Regenerate button for last assistant message */}
                      {isLastAssistant && (
                        <button
                          onClick={regenerateResponse}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 hover:text-primary transition-opacity cursor-pointer"
                          title="Regenerate response"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Regenerate</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-text-primary flex-shrink-0 mt-0.5 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Active Streaming Token Render */}
          {isSending && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary flex-shrink-0 mt-0.5 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="max-w-[82%] bg-background-card border border-primary/40 p-3.5 rounded-2xl text-xs text-text-primary shadow-md">
                {streamingContent ? (
                  <MarkdownContent content={streamingContent} />
                ) : (
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="p-3 border-t border-border/50 bg-background-card/30">
          {/* Active Attachment Preview Card */}
          {currentAttachment && (
            <div className="mb-2">
              <ImageAttachmentPreview
                attachment={currentAttachment}
                onRemove={handleRemoveAttachment}
                onRecapture={handleRecapture}
                onExpand={() => setSelectedViewerAttachment(currentAttachment)}
              />
            </div>
          )}

          <form onSubmit={handleSend} className="relative flex flex-col gap-2">
            <div className="relative flex items-center">
              {/* Screen Capture Trigger Button & Dropdown */}
              <div className="relative flex-shrink-0 mr-1.5" ref={captureMenuRef}>
                <button
                  type="button"
                  onClick={() => setCaptureMenuOpen(!captureMenuOpen)}
                  disabled={isCapturing || isSending}
                  title="Capture screen / window (Cmd+Shift+S)"
                  className={`w-9 h-9 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-sm ${
                    currentAttachment
                      ? 'bg-primary/20 text-primary border-primary/50'
                      : 'bg-background-card hover:bg-white/5 border-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Camera className={`w-4 h-4 ${isCapturing ? 'animate-spin text-primary' : ''}`} />
                </button>

                {captureMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl nova-glass-card border border-border/80 p-1.5 shadow-2xl z-40 text-xs animate-fade-in">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Screen Awareness
                    </div>
                    <button
                      type="button"
                      onClick={handleCaptureFullScreen}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/5 text-left text-text-primary transition-colors cursor-pointer"
                    >
                      <Monitor className="w-3.5 h-3.5 text-primary" />
                      <div className="min-w-0">
                        <div className="font-medium text-[11px]">Full Screen</div>
                        <div className="text-[9px] text-text-muted">Entire display screenshot</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenWindowPicker}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/5 text-left text-text-primary transition-colors cursor-pointer"
                    >
                      <AppWindow className="w-3.5 h-3.5 text-secondary" />
                      <div className="min-w-0">
                        <div className="font-medium text-[11px]">Application Window</div>
                        <div className="text-[9px] text-text-muted">Select specific app window</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleCaptureRegion}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/5 text-left text-text-primary transition-colors cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5 text-accent" />
                      <div className="min-w-0">
                        <div className="font-medium text-[11px]">Select Region</div>
                        <div className="text-[9px] text-text-muted">Interactive crosshairs selection</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={
                  currentAttachment
                    ? 'Ask a question about this screen capture...'
                    : 'Ask NOVA anything (Enter to send, Cmd+Shift+S for screen)...'
                }
                disabled={isSending}
                className="w-full pl-3.5 pr-24 py-2.5 bg-background-card border border-border focus:border-primary/70 rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none transition-all resize-none shadow-sm max-h-36"
              />

              <div className="absolute right-2.5 flex items-center gap-1.5">
                {/* Stop Generation Button when sending */}
                {isSending ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    title="Stop generation (Esc)"
                    className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 text-xs font-medium cursor-pointer shadow-sm animate-pulse"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <>
                    <div className="hidden sm:flex items-center text-[10px] text-text-muted bg-background-secondary/80 border border-border/50 px-1.5 py-0.5 rounded">
                      <CornerDownLeft className="w-2.5 h-2.5 mr-0.5" />
                      Return
                    </div>

                    <button
                      type="submit"
                      disabled={!input.trim() && !currentAttachment}
                      className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Helper footer */}
            <div className="flex items-center justify-between px-1 text-[10px] text-text-muted">
              <span>Enter sends • Shift+Enter new line • Cmd+Shift+S screenshot</span>
              <span>Screen Awareness Active</span>
            </div>
          </form>
        </div>
      </div>

      {/* Screen Modals */}
      <WindowPickerModal
        isOpen={windowPickerOpen}
        windows={windowsList}
        isLoading={isLoadingWindows}
        onSelect={handleSelectWindow}
        onRefresh={handleOpenWindowPicker}
        onClose={() => setWindowPickerOpen(false)}
      />

      <ImageViewerModal
        attachment={selectedViewerAttachment}
        onClose={() => setSelectedViewerAttachment(null)}
      />

      <PermissionGuideModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onPermissionGranted={() => handleRecapture()}
      />
    </div>
  );
};
