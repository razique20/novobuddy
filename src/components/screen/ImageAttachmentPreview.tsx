import React, { useState } from 'react';
import { X, RotateCcw, FileText, Eye, Maximize2, Monitor, AppWindow, Crop } from 'lucide-react';
import { ImageAttachment } from '../../types';

interface ImageAttachmentPreviewProps {
  attachment: ImageAttachment;
  onRemove: () => void;
  onRecapture?: () => void;
  onExpand?: () => void;
}

export const ImageAttachmentPreview: React.FC<ImageAttachmentPreviewProps> = ({
  attachment,
  onRemove,
  onRecapture,
  onExpand,
}) => {
  const [showOcrText, setShowOcrText] = useState(false);

  const getSourceIcon = () => {
    switch (attachment.sourceType) {
      case 'display':
        return <Monitor className="w-3 h-3 text-primary" />;
      case 'window':
        return <AppWindow className="w-3 h-3 text-secondary" />;
      case 'region':
        return <Crop className="w-3 h-3 text-accent" />;
      default:
        return <Eye className="w-3 h-3 text-text-muted" />;
    }
  };

  const formattedSize = attachment.fileSizeBytes
    ? `${(attachment.fileSizeBytes / 1024).toFixed(0)} KB`
    : '';

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-background-secondary/90 border border-primary/30 shadow-md animate-fade-in text-xs max-w-full">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Thumbnail & Source Metadata */}
        <div className="flex items-center gap-2.5 min-w-0">
          {attachment.dataUrl && (
            <div
              onClick={onExpand}
              className="relative w-14 h-10 rounded-lg overflow-hidden border border-border/80 bg-black/40 flex-shrink-0 cursor-pointer group"
              title="Click to expand"
            >
              <img
                src={attachment.dataUrl}
                alt={attachment.sourceName}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-3 h-3 text-white" />
              </div>
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-text-primary text-[11px] truncate">
              {getSourceIcon()}
              <span className="truncate">{attachment.sourceName}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <span>{attachment.width}×{attachment.height}</span>
              {formattedSize && <span>• {formattedSize}</span>}
              {attachment.ocrText && (
                <button
                  type="button"
                  onClick={() => setShowOcrText(!showOcrText)}
                  className="flex items-center gap-0.5 text-primary hover:underline cursor-pointer"
                >
                  <FileText className="w-2.5 h-2.5" />
                  <span>{showOcrText ? 'Hide OCR' : 'View OCR'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onRecapture && (
            <button
              type="button"
              onClick={onRecapture}
              title="Retake capture"
              className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onRemove}
            title="Remove screenshot"
            className="p-1 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable OCR text preview */}
      {showOcrText && attachment.ocrText && (
        <div className="mt-1 p-2 rounded-lg bg-black/30 border border-border/50 text-[10px] font-mono text-text-secondary max-h-24 overflow-y-auto whitespace-pre-wrap select-text">
          <div className="text-[9px] uppercase tracking-wider text-text-muted mb-1 font-sans font-semibold">
            Extracted On-Screen Text (Apple Vision OCR):
          </div>
          {attachment.ocrText}
        </div>
      )}
    </div>
  );
};
