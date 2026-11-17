import {
  CaptureRegion,
  ImageAttachment,
  OcrTextItem,
  ScreenDisplayInfo,
  ScreenPermissionStatus,
  ScreenWindowInfo,
} from '../../types';
import { NativeBridge } from '../native/bridge';
import { AnnotationService } from './AnnotationService';

export interface CaptureOptions {
  mode: 'display' | 'window' | 'region';
  targetId?: string;
  region?: CaptureRegion;
  runOcr?: boolean;
}

export class ScreenContextService {
  private static MAX_DIMENSION = 1920; // Max width/height sent to LLM for performance
  private static MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB safety cap

  /**
   * Check if screen recording permission is granted on macOS
   */
  static async checkPermission(): Promise<ScreenPermissionStatus> {
    return await NativeBridge.checkScreenPermission();
  }

  /**
   * Request macOS screen recording permission
   */
  static async requestPermission(): Promise<ScreenPermissionStatus> {
    return await NativeBridge.requestScreenPermission();
  }

  /**
   * Enumerate available displays
   */
  static async getDisplays(): Promise<ScreenDisplayInfo[]> {
    return await NativeBridge.getScreenDisplays();
  }

  /**
   * List open windows with excluded applications filtered out
   */
  static async getWindows(excludedApps: string[] = []): Promise<ScreenWindowInfo[]> {
    const allWindows = await NativeBridge.getScreenWindows();
    const excludedLower = new Set(excludedApps.map((a) => a.toLowerCase().trim()));

    return allWindows.filter((win) => {
      const appName = win.app_name.toLowerCase().trim();
      const title = win.title.toLowerCase().trim();

      // Filter out empty system layers or tiny windows (< 50px)
      if (win.width < 50 || win.height < 50) return false;

      // Filter out excluded password managers / secure tools
      if (excludedLower.has(appName)) return false;
      if (appName.includes('1password') || appName.includes('keychain') || appName.includes('bitwarden')) {
        return false;
      }
      if (title.includes('password') || title.includes('keychain')) {
        return false;
      }

      return true;
    });
  }

  /**
   * Capture screen (full display, specific window, or interactive region)
   */
  static async captureScreen(
    options: CaptureOptions,
    excludedApps: string[] = []
  ): Promise<ImageAttachment | null> {
    const result = await NativeBridge.captureScreen({
      mode: options.mode,
      targetId: options.targetId,
      region: options.region,
      excludedApps,
    });

    if (!result.success || result.cancelled || !result.data_url) {
      if (result.error && !result.cancelled) {
        throw new Error(result.error);
      }
      return null;
    }

    if (result.file_size_bytes > this.MAX_FILE_SIZE_BYTES) {
      throw new Error(`Screenshot size (${(result.file_size_bytes / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit.`);
    }

    // Downscale if needed for optimal latency and token usage
    const processed = await this.downscaleImageIfNeeded(
      result.data_url,
      result.width,
      result.height,
      this.MAX_DIMENSION
    );

    let ocrText: string | undefined = undefined;
    let annotations: any[] = [];

    // Run OCR if requested
    if (options.runOcr !== false && result.base64_image) {
      try {
        const ocrItems: OcrTextItem[] = await NativeBridge.performOcr(result.base64_image);
        if (ocrItems && ocrItems.length > 0) {
          ocrText = ocrItems.map((item) => item.text).join('\n');
          annotations = AnnotationService.fromOcrItems(ocrItems);
        }
      } catch (ocrErr) {
        console.warn('[ScreenContextService] OCR extraction failed, continuing with visual image:', ocrErr);
      }
    }

    const attachment: ImageAttachment = {
      id: `screen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceType: options.mode,
      sourceName: result.source_name || (options.mode === 'window' ? 'Window Capture' : 'Screen Capture'),
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
      fileSizeBytes: processed.fileSizeBytes,
      dataUrl: processed.dataUrl,
      ocrText,
      annotations,
      createdAt: new Date().toISOString(),
    };

    return attachment;
  }

  /**
   * Downscale image preserving aspect ratio if exceeding maxDim
   */
  private static async downscaleImageIfNeeded(
    dataUrl: string,
    origWidth: number,
    origHeight: number,
    maxDim: number
  ): Promise<{ dataUrl: string; width: number; height: number; mimeType: string; fileSizeBytes: number }> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        dataUrl,
        width: origWidth,
        height: origHeight,
        mimeType: 'image/png',
        fileSizeBytes: Math.round((dataUrl.length * 3) / 4),
      };
    }

    if (origWidth <= maxDim && origHeight <= maxDim) {
      return {
        dataUrl,
        width: origWidth,
        height: origHeight,
        mimeType: 'image/png',
        fileSizeBytes: Math.round((dataUrl.length * 3) / 4),
      };
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxDim / img.width, maxDim / img.height);
        const targetWidth = Math.round(img.width * scale);
        const targetHeight = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const scaledDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({
            dataUrl: scaledDataUrl,
            width: targetWidth,
            height: targetHeight,
            mimeType: 'image/jpeg',
            fileSizeBytes: Math.round((scaledDataUrl.length * 3) / 4),
          });
        } else {
          resolve({
            dataUrl,
            width: origWidth,
            height: origHeight,
            mimeType: 'image/png',
            fileSizeBytes: Math.round((dataUrl.length * 3) / 4),
          });
        }
      };

      img.onerror = () => {
        resolve({
          dataUrl,
          width: origWidth,
          height: origHeight,
          mimeType: 'image/png',
          fileSizeBytes: Math.round((dataUrl.length * 3) / 4),
        });
      };

      img.src = dataUrl;
    });
  }
}
