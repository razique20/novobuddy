import { create } from 'zustand';
import { Conversation, Message } from '../types';
import { NativeBridge } from '../services/native/bridge';
import { conversationService } from '../services/conversation/conversationService';

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  streamingContent: string | null;
  errorMessage: string | null;
  abortController: AbortController | null;

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createNewConversation: (customTitle?: string) => Promise<string>;
  renameConversation: (id: string, newTitle: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  regenerateResponse: () => Promise<void>;
  stopGeneration: () => void;
  clearActiveConversation: () => Promise<void>;
  clearError: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  streamingContent: null,
  errorMessage: null,
  abortController: null,

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const convs = await NativeBridge.getConversations();
      set({ conversations: convs, isLoading: false });

      // Automatically select first conversation if none selected
      if (convs.length > 0 && !get().activeConversationId) {
        await get().selectConversation(convs[0].id);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
      set({ isLoading: false });
    }
  },

  selectConversation: async (id: string) => {
    // If currently generating, abort before switching
    if (get().isSending && get().abortController) {
      get().abortController?.abort();
    }

    set({
      activeConversationId: id,
      isLoading: true,
      streamingContent: null,
      errorMessage: null,
      isSending: false,
    });

    try {
      const msgs = await NativeBridge.getMessages(id);
      set({ messages: msgs, isLoading: false });
    } catch (e) {
      console.error('Failed to load messages for conversation:', e);
      set({ isLoading: false });
    }
  },

  createNewConversation: async (customTitle?: string) => {
    const id = `conv-${Date.now()}`;
    const title = customTitle || `New Conversation #${get().conversations.length + 1}`;
    try {
      const created = await NativeBridge.createConversation(id, title);
      set((state) => ({
        conversations: [created, ...state.conversations],
        activeConversationId: id,
        messages: [],
        errorMessage: null,
      }));
      return id;
    } catch (e) {
      console.error('Failed to create conversation:', e);
      return id;
    }
  },

  renameConversation: async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await NativeBridge.updateConversationTitle(id, newTitle.trim());
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title: newTitle.trim() } : c
        ),
      }));
    } catch (e) {
      console.error('Failed to rename conversation:', e);
    }
  },

  deleteConversation: async (id: string) => {
    if (get().activeConversationId === id && get().isSending) {
      get().stopGeneration();
    }

    try {
      await NativeBridge.deleteConversation(id);
      const remaining = get().conversations.filter((c) => c.id !== id);
      set({ conversations: remaining });
      if (get().activeConversationId === id) {
        if (remaining.length > 0) {
          await get().selectConversation(remaining[0].id);
        } else {
          set({ activeConversationId: null, messages: [] });
        }
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  },

  sendMessage: async (content: string) => {
    if (!content.trim() || get().isSending) return;

    let convId = get().activeConversationId;
    if (!convId) {
      const previewTitle =
        content.length > 28 ? content.slice(0, 25) + '...' : content;
      convId = await get().createNewConversation(previewTitle);
    }

    const optimisticUserMessage: Message = {
      id: `usr-${Date.now()}`,
      conversation_id: convId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      is_simulated: false,
    };

    const controller = new AbortController();

    set((state) => ({
      messages: [...state.messages, optimisticUserMessage],
      isSending: true,
      streamingContent: '',
      errorMessage: null,
      abortController: controller,
    }));

    try {
      const assistantMessage = await conversationService.sendMessage(
        convId,
        content,
        (partial) => {
          set({ streamingContent: partial });
        },
        controller.signal
      );

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isSending: false,
        streamingContent: null,
        abortController: null,
      }));

      // Refresh conversations list to update title & timestamp
      const updatedList = await NativeBridge.getConversations();
      set({ conversations: updatedList });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        set({ isSending: false, streamingContent: null, abortController: null });
        return;
      }

      console.error('Failed to stream AI response:', err);
      const friendlyError =
        err.message || 'An error occurred while generating response.';
      set({
        isSending: false,
        streamingContent: null,
        errorMessage: friendlyError,
        abortController: null,
      });
    }
  },

  regenerateResponse: async () => {
    const { messages, activeConversationId, isSending } = get();
    if (isSending || !activeConversationId || messages.length === 0) return;

    // Find the last user prompt
    let lastUserPrompt = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserPrompt = messages[i].content;
        break;
      }
    }

    if (!lastUserPrompt) return;

    // If the last message was assistant, remove it from view
    if (messages[messages.length - 1].role === 'assistant') {
      set({ messages: messages.slice(0, -1) });
    }

    const controller = new AbortController();
    set({
      isSending: true,
      streamingContent: '',
      errorMessage: null,
      abortController: controller,
    });

    try {
      const assistantMessage = await conversationService.sendMessage(
        activeConversationId,
        lastUserPrompt,
        (partial) => {
          set({ streamingContent: partial });
        },
        controller.signal
      );

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isSending: false,
        streamingContent: null,
        abortController: null,
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        set({ isSending: false, streamingContent: null, abortController: null });
        return;
      }
      set({
        isSending: false,
        streamingContent: null,
        errorMessage: err.message || 'Failed to regenerate response.',
        abortController: null,
      });
    }
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isSending: false, streamingContent: null, abortController: null });
    }
  },

  clearActiveConversation: async () => {
    const { activeConversationId, stopGeneration } = get();
    if (!activeConversationId) return;

    stopGeneration();
    try {
      // Delete current and recreate fresh conversation
      await NativeBridge.deleteConversation(activeConversationId);
      const newId = await get().createNewConversation('New Conversation');
      await get().selectConversation(newId);
    } catch (e) {
      console.error('Failed to clear conversation:', e);
    }
  },

  clearError: () => {
    set({ errorMessage: null });
  },
}));
