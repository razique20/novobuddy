import { Message } from '../../types';
import { NativeBridge } from '../native/bridge';

export interface IConversationService {
  sendMessage(
    conversationId: string,
    content: string,
    onChunk?: (partial: string) => void
  ): Promise<Message>;
}

export class ConversationService implements IConversationService {
  async sendMessage(
    conversationId: string,
    content: string,
    onChunk?: (partial: string) => void
  ): Promise<Message> {
    const userMsgId = `usr-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      is_simulated: false,
    };

    // Persist user message to SQLite
    await NativeBridge.saveMessage(userMessage);

    // Generate local simulated demo response
    const simulatedResponse = this.generateSimulatedReply(content);
    
    // Simulate streaming delay for realistic desktop UX
    if (onChunk) {
      const words = simulatedResponse.split(' ');
      let current = '';
      for (const word of words) {
        current += (current ? ' ' : '') + word;
        onChunk(current);
        await new Promise((res) => setTimeout(res, 25));
      }
    } else {
      await new Promise((res) => setTimeout(res, 350));
    }

    const assistantMsgId = `ast-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMsgId,
      conversation_id: conversationId,
      role: 'assistant',
      content: simulatedResponse,
      created_at: new Date().toISOString(),
      tokens: Math.floor(simulatedResponse.length / 4),
      is_simulated: true,
    };

    // Persist assistant message to SQLite
    await NativeBridge.saveMessage(assistantMessage);

    return assistantMessage;
  }

  private generateSimulatedReply(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (lower.includes('shortcut') || lower.includes('option + space') || lower.includes('key')) {
      return `[SIMULATED DEMO RESPONSE]
NOVA registers Option + Space (⌥Space) globally across macOS. 

When you press Option + Space from any application:
1. The compact Floating Companion slides onto your screen.
2. You can type commands, query context, or expand into the full workspace.
3. Pressing Option + Space again or Esc immediately dismisses or hides it.`;
    }

    if (lower.includes('phase') || lower.includes('roadmap') || lower.includes('upcoming')) {
      return `[SIMULATED DEMO RESPONSE]
Here is the current architectural roadmap for NOVA:
• Phase 1 (Active): Native macOS Desktop Foundation, Tauri 2 backend, SQLite local persistence, System Tray, Global Option+Space shortcut, and Floating Companion.
• Phase 2: Local AI via Ollama, Cloud AI (OpenAI, Anthropic, Gemini), and Voice interaction.
• Phase 3: Screen context analysis, OCR, visual workspace comprehension, and autonomous agents.
• Phase 4: MCP (Model Context Protocol) integrations and custom desktop automation workflows.`;
    }

    if (lower.includes('status') || lower.includes('system') || lower.includes('sqlite') || lower.includes('database')) {
      return `[SIMULATED DEMO RESPONSE]
System Status Report:
• Native Core: Tauri 2 + Rust
• Local Database: SQLite with WAL mode active
• IPC Bridge: Verified & Low-Latency
• Global Shortcut: Option + Space active
• Memory: Retained locally on your machine, zero cloud telemetry in Phase 1.`;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `[SIMULATED DEMO RESPONSE]
Hello! I'm NOVA, your AI desktop companion. 

This message is locally simulated by the Phase 1 desktop engine to demonstrate interface responsiveness, message persistence, and layout. 

In Phase 2, live LLM providers (including local Ollama and cloud APIs) will be connected to power real inference.`;
    }

    return `[SIMULATED DEMO RESPONSE]
I received your request: "${prompt}".

This is a local simulated response verifying that:
1. The message pipeline sent your input to the native Rust backend.
2. The SQLite database stored the interaction in your local history.
3. The UI rendered the chat stream with full metadata.

In Phase 2, real LLM completions from your chosen provider (Ollama or Cloud) will replace this simulated engine.`;
  }
}

export const conversationService = new ConversationService();
