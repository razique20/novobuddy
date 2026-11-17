import { OcrTextItem, VisualAnnotation } from '../../types';

export class AnnotationService {
  /**
   * Convert Apple Vision OCR items into normalized VisualAnnotation objects
   * Apple Vision coordinates: normalized (0..1), but Vision framework has origin at bottom-left
   * In nova-screen-helper.swift, we converted coordinates so that y is from top-left (0..1)
   */
  static fromOcrItems(items: OcrTextItem[]): VisualAnnotation[] {
    return items.map((item, index) => ({
      id: `ocr-${index}-${Date.now()}`,
      label: item.text,
      confidence: item.confidence,
      box: {
        x: Math.max(0, Math.min(1, item.x)),
        y: Math.max(0, Math.min(1, item.y)),
        width: Math.max(0, Math.min(1, item.width)),
        height: Math.max(0, Math.min(1, item.height)),
      },
      color: 'rgba(59, 130, 246, 0.8)', // blue
    }));
  }

  /**
   * Parse grounding / bounding box annotations from model text response.
   * Recognizes common vision model patterns:
   * 1. `{"box_2d": [ymin, xmin, ymax, xmax], "label": "..."}` (normalized 0-1000 or 0-1)
   * 2. `[ymin, xmin, ymax, xmax]` coordinates
   * 3. `box: [x, y, w, h]`
   */
  static parseModelAnnotations(responseText: string): VisualAnnotation[] {
    const annotations: VisualAnnotation[] = [];
    if (!responseText) return annotations;

    // Pattern 1: JSON box_2d objects
    const jsonBoxRegex = /\{[^{}]*"box_2d"\s*:\s*\[(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\][^{}]*\}/g;
    let match: RegExpExecArray | null;

    while ((match = jsonBoxRegex.exec(responseText)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        const coords = obj.box_2d;
        if (Array.isArray(coords) && coords.length === 4) {
          let [ymin, xmin, ymax, xmax] = coords.map(Number);
          // Normalize if in 0-1000 scale
          if (ymax > 1 || xmax > 1) {
            ymin /= 1000;
            xmin /= 1000;
            ymax /= 1000;
            xmax /= 1000;
          }
          const width = Math.max(0, xmax - xmin);
          const height = Math.max(0, ymax - ymin);

          annotations.push({
            id: `ai-box-${annotations.length}-${Date.now()}`,
            label: obj.label || `Object ${annotations.length + 1}`,
            box: {
              x: Math.max(0, Math.min(1, xmin)),
              y: Math.max(0, Math.min(1, ymin)),
              width: Math.min(1, width),
              height: Math.min(1, height),
            },
            color: 'rgba(16, 185, 129, 0.8)', // green
          });
        }
      } catch {
        // ignore malformed JSON
      }
    }

    // Pattern 2: [ymin, xmin, ymax, xmax] with optional label
    if (annotations.length === 0) {
      const coordRegex = /\[(\d{1,4}),\s*(\d{1,4}),\s*(\d{1,4}),\s*(\d{1,4})\]/g;
      while ((match = coordRegex.exec(responseText)) !== null) {
        let ymin = Number(match[1]);
        let xmin = Number(match[2]);
        let ymax = Number(match[3]);
        let xmax = Number(match[4]);

        if (ymax > 1 || xmax > 1) {
          ymin /= 1000;
          xmin /= 1000;
          ymax /= 1000;
          xmax /= 1000;
        }

        const width = Math.max(0, xmax - xmin);
        const height = Math.max(0, ymax - ymin);

        if (width > 0 && height > 0) {
          annotations.push({
            id: `ai-coord-${annotations.length}-${Date.now()}`,
            label: `Target ${annotations.length + 1}`,
            box: {
              x: Math.max(0, Math.min(1, xmin)),
              y: Math.max(0, Math.min(1, ymin)),
              width: Math.min(1, width),
              height: Math.min(1, height),
            },
            color: 'rgba(236, 72, 153, 0.8)', // pink
          });
        }
      }
    }

    return annotations;
  }
}
