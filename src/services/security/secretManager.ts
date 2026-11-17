import { NativeBridge } from '../native/bridge';
import { ProviderId } from '../ai/types';

export class SecretManager {
  /**
   * Save API key securely to macOS Keychain via native IPC.
   * Keys are NEVER stored in SQLite or localStorage.
   */
  static async setApiKey(provider: ProviderId, key: string): Promise<void> {
    const trimmed = key.trim();
    if (!trimmed) {
      throw new Error('API key cannot be empty');
    }
    await NativeBridge.storeApiKey(provider, trimmed);
  }

  /**
   * Retrieve API key from macOS Keychain.
   * Internal use only for outgoing inference requests.
   */
  static async getApiKey(provider: ProviderId): Promise<string | null> {
    return await NativeBridge.getApiKey(provider);
  }

  /**
   * Delete API key from macOS Keychain.
   */
  static async removeApiKey(provider: ProviderId): Promise<void> {
    await NativeBridge.deleteApiKey(provider);
  }

  /**
   * Check if an API key exists in Keychain for a given provider.
   */
  static async hasApiKey(provider: ProviderId): Promise<boolean> {
    return await NativeBridge.hasApiKey(provider);
  }

  /**
   * Generate a safe, masked representation of an API key for display (e.g., "sk-ab...3f9e").
   * Never exposes full secret to UI.
   */
  static maskKey(rawKey: string): string {
    if (!rawKey) return '';
    const trimmed = rawKey.trim();
    if (trimmed.length <= 8) {
      return '••••••••';
    }
    const prefix = trimmed.slice(0, 4);
    const suffix = trimmed.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }

  /**
   * Format validation per provider
   */
  static validateKeyFormat(provider: ProviderId, key: string): { valid: boolean; reason?: string } {
    const trimmed = key.trim();
    if (!trimmed) {
      return { valid: false, reason: 'Key cannot be blank.' };
    }

    switch (provider) {
      case 'openai':
        if (!trimmed.startsWith('sk-')) {
          return { valid: false, reason: 'OpenAI API keys typically start with "sk-".' };
        }
        break;
      case 'anthropic':
        if (!trimmed.startsWith('sk-ant-')) {
          return { valid: false, reason: 'Anthropic API keys typically start with "sk-ant-".' };
        }
        break;
      case 'gemini':
        if (!trimmed.startsWith('AIza')) {
          return { valid: false, reason: 'Google Gemini API keys typically start with "AIza".' };
        }
        break;
      case 'groq':
        if (!trimmed.startsWith('gsk_')) {
          return { valid: false, reason: 'Groq API keys typically start with "gsk_".' };
        }
        break;
      case 'ollama':
        // Ollama does not require an API key
        return { valid: true };
    }

    return { valid: true };
  }
}
