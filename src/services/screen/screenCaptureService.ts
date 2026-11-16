export interface ScreenCaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenAnalysisResult {
  recognizedText: string[];
  activeApplication: string;
  focusedWindow: string;
  timestamp: string;
}

export interface IScreenCaptureService {
  isPermissionGranted(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  captureActiveWindow(): Promise<Blob | null>;
  analyzeScreen(): Promise<ScreenAnalysisResult>;
}

export class ScreenCaptureServicePlaceholder implements IScreenCaptureService {
  async isPermissionGranted(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<boolean> {
    // Screen recording permission will be requested in Phase 3
    return false;
  }

  async captureActiveWindow(): Promise<Blob | null> {
    return null;
  }

  async analyzeScreen(): Promise<ScreenAnalysisResult> {
    throw new Error('ScreenCaptureService is planned for Phase 3');
  }
}

export const screenCaptureService = new ScreenCaptureServicePlaceholder();
