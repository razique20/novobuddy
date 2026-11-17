import React from 'react';
import { X, ShieldAlert, ExternalLink } from 'lucide-react';
import { ScreenContextService } from '../../services/screen/ScreenContextService';

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  if (!isOpen) return null;

  const handleRequest = async () => {
    try {
      const status = await ScreenContextService.requestPermission();
      if (status.has_permission) {
        if (onPermissionGranted) onPermissionGranted();
        onClose();
      }
    } catch (e) {
      console.error('Failed to request permission:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-md rounded-2xl nova-glass-card border border-amber-500/40 p-5 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-text-primary">
              Screen Recording Permission Needed
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="text-xs text-text-secondary space-y-3 leading-relaxed">
          <p>
            macOS requires your explicit authorization for NOVA to capture your screen, application windows, or selected regions for visual analysis.
          </p>

          <div className="p-3 rounded-xl bg-background-secondary/80 border border-border/60 space-y-2">
            <div className="text-[11px] font-semibold text-text-primary">
              To enable Screen Recording:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-text-muted pl-1">
              <li>Open <strong>System Settings</strong> on your Mac.</li>
              <li>Navigate to <strong>Privacy & Security</strong> &gt; <strong>Screen Recording</strong>.</li>
              <li>Toggle on the permission switch next to <strong>NOVA</strong>.</li>
            </ol>
          </div>

          <p className="text-[11px] text-text-muted">
            NOVA strictly operates on an explicit-only request model. Your screen is never captured automatically or in the background.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-border/80 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRequest}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-medium shadow-md transition-colors cursor-pointer"
          >
            <span>Request Permission</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
