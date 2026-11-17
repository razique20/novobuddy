import { ImageAttachment, Message } from '../../types';
import { NativeBridge } from '../native/bridge';
import { aiProviderManager } from '../ai/AIProviderManager';
import { ChatMessage } from '../ai/types';

export interface IConversationService {
  sendMessage(
    conversationId: string,
    content: string,
    onChunk?: (partial: string) => void,
    abortSignal?: AbortSignal,
    attachments?: ImageAttachment[]
  ): Promise<Message>;
}

export class ConversationService implements IConversationService {
  /**
   * Generates a concise title from the user's first prompt
   */
  static generateTitleFromPrompt(prompt: string): string {
    const cleaned = prompt.trim().replace(/\s+/g, ' ');
    if (!cleaned) return 'New Conversation';

    // Take first sentence or up to 30 characters
    const firstSentence = cleaned.split(/[.?!:\n]/)[0].trim();
    if (firstSentence.length <= 32 && firstSentence.length > 0) {
      return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
    }
    return cleaned.slice(0, 30) + '...';
  }

  async sendMessage(
    conversationId: string,
    content: string,
    onChunk?: (partial: string) => void,
    abortSignal?: AbortSignal,
    attachments?: ImageAttachment[]
  ): Promise<Message> {
    const userMsgId = `usr-${Date.now()}`;
    const now = new Date().toISOString();

    const userMessage: Message = {
      id: userMsgId,
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: now,
      is_simulated: false,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };

    // 1. Persist user message to SQLite
    await NativeBridge.saveMessage(userMessage);

    // 2. Fetch existing messages for context
    const existingMessages = await NativeBridge.getMessages(conversationId);
    
    // Auto-update conversation title if it's the first user message
    if (existingMessages.length <= 2) {
      const newTitle = ConversationService.generateTitleFromPrompt(content);
      await NativeBridge.updateConversationTitle(conversationId, newTitle);
    }

    const chatContext: ChatMessage[] = existingMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      attachments: m.attachments,
    }));

    // 3. Stream real response from active AI Provider
    let accumulatedResponse = '';

    try {
      await aiProviderManager.streamChat(
        chatContext,
        {
          onToken: (token) => {
            accumulatedResponse += token;
            if (onChunk) {
              onChunk(accumulatedResponse);
            }
          },
          onComplete: (fullText) => {
            if (fullText) accumulatedResponse = fullText;
          },
          onError: (err) => {
            console.error('AI Stream Error:', err);
          },
        },
        abortSignal
      );
    } catch (err: any) {
      if (err.name === 'AbortError' || abortSignal?.aborted) {
        if (!accumulatedResponse) {
          accumulatedResponse = '_[Response generation stopped by user]_';
        } else {
          accumulatedResponse += ' _[stopped]_';
        }
      } else {
        throw err;
      }
    }

    // 4. Persist completed assistant message to SQLite
    const assistantMsgId = `ast-${Date.now()}`;
    const tokenEst = Math.max(1, Math.floor(accumulatedResponse.length / 4));
    
    const assistantMessage: Message = {
      id: assistantMsgId,
      conversation_id: conversationId,
      role: 'assistant',
      content: accumulatedResponse || '_(No response generated)_',
      created_at: new Date().toISOString(),
      tokens: tokenEst,
      is_simulated: false,
    };

    await NativeBridge.saveMessage(assistantMessage);

    return assistantMessage;
  }
}

export const conversationService = new ConversationService();
