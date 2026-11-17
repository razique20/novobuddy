import React, { useState } from 'react';
import { X, Layers, Copy, Check, Download } from 'lucide-react';
import { ImageAttachment } from '../../types';

interface ImageViewerModalProps {
  attachment: ImageAttachment | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  attachment,
  onClose,
}) => {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [copiedOcr, setCopiedOcr] = useState(false);

  if (!attachment || !attachment.dataUrl) return null;

  const annotations = attachment.annotations || [];

  const handleCopyOcr = async () => {
    if (attachment.ocrText) {
      try {
        await navigator.clipboard.writeText(attachment.ocrText);
        setCopiedOcr(true);
        setTimeout(() => setCopiedOcr(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  const handleDownload = () => {
    if (!attachment.dataUrl) return;
    const a = document.createElement('a');
    a.href = attachment.dataUrl;
    a.download = `nova-screen-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl rounded-2xl nova-glass-card border border-border/80 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between p-3 border-b border-border/50 bg-background-card/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-text-primary">
              {attachment.sourceName}
            </span>
            <span className="text-[10px] text-text-muted">
              ({attachment.width}×{attachment.height})
            </span>
            {annotations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {annotations.length} targets detected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {annotations.length > 0 && (
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  showAnnotations
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-white/5 text-text-muted border-border/50 hover:text-text-primary'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Annotations</span>
              </button>
            )}

            {attachment.ocrText && (
              <button
                onClick={handleCopyOcr}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border/50"
              >
                {copiedOcr ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">OCR Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy OCR</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleDownload}
              title="Download image"
              className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              title="Close viewer"
              className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image viewport with overlay SVG */}
        <div className="relative flex-1 bg-black/60 overflow-auto flex items-center justify-center p-4">
          <div className="relative inline-block max-w-full max-h-full">
            <img
              src={attachment.dataUrl}
              alt={attachment.sourceName}
              className="max-w-full max-h-[75vh] object-contain rounded-lg border border-border/50 shadow-lg"
            />

            {/* Bounding box annotations overlay */}
            {showAnnotations && annotations.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
              >
                {annotations.map((ann) => {
                  const x = ann.box.x * 1000;
                  const y = ann.box.y * 1000;
                  const w = ann.box.width * 1000;
                  const h = ann.box.height * 1000;
                  const strokeColor = ann.color || '#3b82f6';

                  return (
                    <g key={ann.id}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill="rgba(59, 130, 246, 0.15)"
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        rx="4"
                      />
                      {ann.label && (
                        <text
                          x={x + 4}
                          y={Math.max(16, y - 4)}
                          fill="#ffffff"
                          fontSize="18"
                          fontWeight="bold"
                          paintOrder="stroke"
                          stroke="#000000"
                          strokeWidth="3"
                          strokeLinecap="butt"
                          strokeLinejoin="miter"
                        >
                          {ann.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
