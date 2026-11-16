export interface VoiceConfig {
  inputDeviceId?: string;
  outputDeviceId?: string;
  wakeWordEnabled: boolean;
  voiceModel: string;
}

export interface IVoiceService {
  isMicrophoneAvailable(): Promise<boolean>;
  startListening(onTranscript: (text: string) => void): Promise<void>;
  stopListening(): Promise<void>;
  speak(text: string): Promise<void>;
}

export class VoiceServicePlaceholder implements IVoiceService {
  async isMicrophoneAvailable(): Promise<boolean> {
    return false;
  }

  async startListening(): Promise<void> {
    throw new Error('VoiceService will be enabled in Phase 2');
  }

  async stopListening(): Promise<void> {
    // No-op
  }

  async speak(): Promise<void> {
    throw new Error('VoiceService speech synthesis will be enabled in Phase 2');
  }
}

export const voiceService = new VoiceServicePlaceholder();
