import React, { useState } from 'react';
import { X, Search, AppWindow, RefreshCw, ShieldAlert } from 'lucide-react';
import { ScreenWindowInfo } from '../../types';

interface WindowPickerModalProps {
  isOpen: boolean;
  windows: ScreenWindowInfo[];
  isLoading: boolean;
  onSelect: (window: ScreenWindowInfo) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export const WindowPickerModal: React.FC<WindowPickerModalProps> = ({
  isOpen,
  windows,
  isLoading,
  onSelect,
  onRefresh,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredWindows = windows.filter((w) => {
    const term = searchTerm.toLowerCase();
    return (
      w.app_name.toLowerCase().includes(term) ||
      w.title.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-lg rounded-2xl nova-glass-card border border-border/80 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <AppWindow className="w-4 h-4 text-primary" />
            <span className="font-semibold text-xs text-text-primary">
              Select Application Window to Capture
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Refresh Bar */}
        <div className="p-3 border-b border-border/40 flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by app or window title..."
              className="w-full pl-8 pr-3 py-1.5 bg-background-card border border-border/80 rounded-xl text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary/60"
              autoFocus
            />
          </div>
          <button
            onClick={onRefresh}
            title="Refresh windows list"
            disabled={isLoading}
            className="p-2 rounded-xl bg-background-card border border-border/80 hover:border-primary/50 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>

        {/* Windows list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-text-muted text-xs gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span>Scanning open application windows...</span>
            </div>
          ) : filteredWindows.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-text-muted text-xs gap-2">
              <ShieldAlert className="w-6 h-6 text-text-muted" />
              <span>No matching windows found or windows are protected.</span>
            </div>
          ) : (
            filteredWindows.map((win) => (
              <button
                key={win.id}
                onClick={() => onSelect(win)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-border/60 transition-all text-left cursor-pointer group"
              >
                <div className="min-w-0 mr-3">
                  <div className="text-xs font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                    {win.app_name}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {win.title || '(Untitled Window)'}
                  </div>
                </div>

                <div className="text-[10px] text-text-muted flex-shrink-0 font-mono bg-background-secondary px-1.5 py-0.5 rounded border border-border/40">
                  {Math.round(win.width)}×{Math.round(win.height)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-border/40 bg-background-secondary/40 text-[10px] text-text-muted flex items-center justify-between">
          <span>Protected apps (1Password, Keychain) are excluded</span>
          <span>Click window to capture</span>
        </div>
      </div>
    </div>
  );
};
