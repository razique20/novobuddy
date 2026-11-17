import { describe, it, expect, beforeEach } from 'vitest';
import { NativeBridge } from '../services/native/bridge';
import { ConversationService } from '../services/conversation/conversationService';
import { AIProviderManager } from '../services/ai/AIProviderManager';
import { ChatMessage } from '../services/ai/types';

describe('Conversation Management & Persistence', () => {
  beforeEach(async () => {
    await NativeBridge.clearAllData();
  });

  it('creates and retrieves conversations', async () => {
    const conv = await NativeBridge.createConversation('test-c1', 'Test Conversation');
    expect(conv.id).toBe('test-c1');
    expect(conv.title).toBe('Test Conversation');

    const all = await NativeBridge.getConversations();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe('test-c1');
  });

  it('updates conversation title', async () => {
    await NativeBridge.createConversation('test-c2', 'Original Title');
    await NativeBridge.updateConversationTitle('test-c2', 'Updated Title');

    const all = await NativeBridge.getConversations();
    const found = all.find((c) => c.id === 'test-c2');
    expect(found?.title).toBe('Updated Title');
  });

  it('deletes conversations properly', async () => {
    await NativeBridge.createConversation('test-del', 'To Delete');
    let all = await NativeBridge.getConversations();
    expect(all.some((c) => c.id === 'test-del')).toBe(true);

    await NativeBridge.deleteConversation('test-del');
    all = await NativeBridge.getConversations();
    expect(all.some((c) => c.id === 'test-del')).toBe(false);
  });

  it('saves and retrieves messages for conversation', async () => {
    await NativeBridge.createConversation('test-msg-conv', 'Chat');

    await NativeBridge.saveMessage({
      id: 'm1',
      conversation_id: 'test-msg-conv',
      role: 'user',
      content: 'Hello NOVA',
      created_at: new Date().toISOString(),
      is_simulated: false,
    });

    await NativeBridge.saveMessage({
      id: 'm2',
      conversation_id: 'test-msg-conv',
      role: 'assistant',
      content: 'Hello! How can I assist you?',
      created_at: new Date().toISOString(),
      tokens: 8,
      is_simulated: false,
    });

    const msgs = await NativeBridge.getMessages('test-msg-conv');
    expect(msgs.length).toBe(2);
    expect(msgs[0].content).toBe('Hello NOVA');
    expect(msgs[1].content).toBe('Hello! How can I assist you?');
  });
});

describe('Title Generation & Context Window', () => {
  it('generates concise titles from user prompts', () => {
    expect(ConversationService.generateTitleFromPrompt('Hello there')).toBe('Hello there');
    expect(
      ConversationService.generateTitleFromPrompt(
        'What are the key architectural benefits of Tauri v2 over Electron for desktop applications?'
      )
    ).toBe('What are the key architectural...');
    expect(
      ConversationService.generateTitleFromPrompt('Explain rust ownership. Then show an example.')
    ).toBe('Explain rust ownership');
  });

  it('prepares context window with system prompt and history bounds', () => {
    const manager = AIProviderManager.getInstance();
    const dummyMessages: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    const context = manager.prepareContextMessages(dummyMessages, 10);
    // Should have 1 system message + 10 recent messages
    expect(context.length).toBe(11);
    expect(context[0].role).toBe('system');
    expect(context[0].content).toContain('NOVA');
    expect(context[context.length - 1].content).toBe('Message 29');
  });
});
