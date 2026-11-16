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

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createNewConversation: (customTitle?: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  streamingContent: null,

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const convs = await NativeBridge.getConversations();
      set({ conversations: convs, isLoading: false });

      // Automatically select the first conversation if none selected
      if (convs.length > 0 && !get().activeConversationId) {
        await get().selectConversation(convs[0].id);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
      set({ isLoading: false });
    }
  },

  selectConversation: async (id: string) => {
    set({ activeConversationId: id, isLoading: true });
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
      }));
      return id;
    } catch (e) {
      console.error('Failed to create conversation:', e);
      return id;
    }
  },

  deleteConversation: async (id: string) => {
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
      const previewTitle = content.length > 28 ? content.slice(0, 25) + '...' : content;
      convId = await get().createNewConversation(previewTitle);
    }

    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      is_simulated: false,
    };

    set((state) => ({
      messages: [...state.messages, optimisticUserMessage],
      isSending: true,
      streamingContent: '',
    }));

    try {
      const assistantMessage = await conversationService.sendMessage(
        convId,
        content,
        (partial) => {
          set({ streamingContent: partial });
        }
      );

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isSending: false,
        streamingContent: null,
      }));

      // Refresh conversation list to update counters & order
      const updatedList = await NativeBridge.getConversations();
      set({ conversations: updatedList });
    } catch (e) {
      console.error('Failed to send message:', e);
      set({ isSending: false, streamingContent: null });
    }
  },
}));
