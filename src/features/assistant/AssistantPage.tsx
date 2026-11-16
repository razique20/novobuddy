import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Info,
  CornerDownLeft,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import { Badge } from '../../components/common/Badge';

export const AssistantPage: React.FC = () => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    isSending,
    streamingContent,
    loadConversations,
    selectConversation,
    createNewConversation,
    deleteConversation,
    sendMessage,
  } = useConversationStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSending) return;

    const text = input.trim();
    setInput('');
    await sendMessage(text);
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
            className="p-1 rounded-md bg-primary hover:bg-primary-hover text-white transition-colors cursor-pointer"
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
              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/20 text-text-primary border border-primary/30 shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-card'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isSelected ? 'text-primary' : 'text-text-muted'
                      }`}
                    />
                    <span className="truncate">{c.title}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                    title="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-background-secondary/30 rounded-2xl border border-border/70 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-border/50 flex items-center justify-between bg-background-card/40">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-primary">
                {activeConv ? activeConv.title : 'NOVA Assistant'}
              </div>
              <div className="text-[10px] text-text-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Local Engine (Phase 1 Demo)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">
              Simulated Inference
            </Badge>
          </div>
        </div>

        {/* Phase 1 Local Simulation Banner */}
        <div className="bg-purple-950/20 border-b border-purple-500/20 px-4 py-2 flex items-center gap-2 text-[11px] text-purple-300">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-purple-400" />
          <span>
            <strong>Phase 1 Local Demo Mode:</strong> Responses are generated locally to test IPC, window flows, and SQLite persistence. Real LLM model connectivity will be configured in Phase 2.
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-muted">
              Loading conversation from local SQLite...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-accent-blue/20 border border-primary/30 flex items-center justify-center text-primary">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-text-primary">How can NOVA help today?</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  Send a message to test simulated local responses and observe SQLite persistence.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[78%] space-y-1.5`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-background-card border border-border/80 text-text-primary'
                          : 'bg-primary text-white shadow-sm'
                      }`}
                    >
                      {/* Notice badge if simulated */}
                      {isAssistant && m.is_simulated && (
                        <div className="mb-2 pb-1.5 border-b border-border/50 flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>Simulated Local Demo Response</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>

                    <div
                      className={`text-[10px] text-text-muted px-1 flex items-center gap-2 ${
                        isAssistant ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {m.tokens && <span>• {m.tokens} tokens</span>}
                    </div>
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-text-primary flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Streaming Assistant Partial Chunk */}
          {isSending && streamingContent !== null && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0 mt-0.5 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="max-w-[78%] bg-background-card border border-primary/40 p-3.5 rounded-2xl text-xs text-text-primary">
                <div className="whitespace-pre-wrap">{streamingContent || 'Thinking...'}</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="p-3 border-t border-border/50 bg-background-card/30">
          <form onSubmit={handleSend} className="relative flex items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Ask NOVA (e.g. 'Explain global shortcuts', 'Show roadmap')..."
              disabled={isSending}
              className="w-full pl-3.5 pr-20 py-2.5 bg-background-card border border-border focus:border-primary/70 rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none transition-all resize-none"
            />

            <div className="absolute right-3 flex items-center gap-2">
              <div className="hidden sm:flex items-center text-[10px] text-text-muted bg-background-secondary/80 border border-border/50 px-1.5 py-0.5 rounded">
                <CornerDownLeft className="w-2.5 h-2.5 mr-0.5" />
                Return
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
