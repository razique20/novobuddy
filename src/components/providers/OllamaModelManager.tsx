import React, { useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  Play,
  Square,
  RefreshCw,
  HardDrive,
  Check,
  Loader2,
  Search,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { OllamaInstalledModel, OllamaInstallationStatus } from '../../services/ai/types';
import { NativeBridge } from '../../services/native/bridge';
import { aiProviderManager } from '../../services/ai/AIProviderManager';
import { Badge } from '../common/Badge';

interface OllamaModelManagerProps {
  serverRunning?: boolean;
  onRefresh?: () => void;
  onModelSelected?: (modelName: string) => void;
}

const POPULAR_SUGGESTIONS = [
  { id: 'smollm:135m', name: 'SmolLM (135M)', size: '91 MB', desc: 'Ultra-lightweight edge model' },
  { id: 'llama3.2:1b', name: 'Llama 3.2 (1B)', size: '1.3 GB', desc: 'Fast, compact Meta model' },
  { id: 'qwen2.5:0.5b', name: 'Qwen 2.5 (0.5B)', size: '390 MB', desc: 'Fast multilingual coding' },
  { id: 'deepseek-r1:1.5b', name: 'DeepSeek R1 (1.5B)', size: '1.1 GB', desc: 'Reasoning model' },
  { id: 'llama3.2:3b', name: 'Llama 3.2 (3B)', size: '2.0 GB', desc: 'High capability edge' },
];

export const OllamaModelManager: React.FC<OllamaModelManagerProps> = ({
  serverRunning: propServerRunning,
  onRefresh,
  onModelSelected,
}) => {
  const [systemStatus, setSystemStatus] = useState<OllamaInstallationStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [installedModels, setInstalledModels] = useState<OllamaInstalledModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullModelInput, setPullModelInput] = useState('');
  const [pullStatus, setPullStatus] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteModel, setConfirmDeleteModel] = useState<string | null>(null);
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [isStoppingServer, setIsStoppingServer] = useState(false);
  const [serverNotice, setServerNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeModel, setActiveModel] = useState(aiProviderManager.getSelectedModel('ollama'));

  const checkOllamaStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await NativeBridge.getOllamaInstallationStatus(
        aiProviderManager.getOllamaEndpoint()
      );
      setSystemStatus(status);
      return status;
    } catch (e) {
      console.error('Failed to check Ollama status:', e);
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const loadInstalled = async () => {
    setIsLoadingModels(true);
    try {
      const models = await NativeBridge.getOllamaInstalledModels(
        aiProviderManager.getOllamaEndpoint()
      );
      setInstalledModels(models);
      setActiveModel(aiProviderManager.getSelectedModel('ollama'));
    } catch (e) {
      console.error('Failed to load installed models:', e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const refreshAll = async (notifyParent = false) => {
    const status = await checkOllamaStatus();
    if (status?.is_running) {
      await loadInstalled();
    }
    if (notifyParent && onRefresh) {
      onRefresh();
    }
  };

  useEffect(() => {
    refreshAll(false);
  }, []);

  const handleStartServer = async () => {
    setIsStartingServer(true);
    setServerNotice(null);
    try {
      const result = await NativeBridge.startOllamaServer();
      setServerNotice({ type: 'success', text: result });
      // Refresh status after starting and notify parent
      await refreshAll(true);
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Failed to start Ollama server';
      setServerNotice({ type: 'error', text: msg });
      console.error('Failed to start Ollama server:', err);
    } finally {
      setIsStartingServer(false);
    }
  };

  const handleStopServer = async () => {
    setIsStoppingServer(true);
    setServerNotice(null);
    try {
      const result = await NativeBridge.stopOllamaServer();
      setServerNotice({ type: 'success', text: result });
      await refreshAll(true);
    } catch (err: any) {
      setServerNotice({ type: 'error', text: String(err) });
    } finally {
      setIsStoppingServer(false);
    }
  };

  const handlePullModel = async (modelToPull: string) => {
    const trimmed = modelToPull.trim();
    if (!trimmed || isPulling) return;

    if (!systemStatus?.is_running) {
      setPullStatus({
        type: 'error',
        text: 'Ollama server must be running to download models. Please start the server first.',
      });
      return;
    }

    setIsPulling(true);
    setPullStatus({
      type: 'info',
      text: `Downloading '${trimmed}' via Ollama... This may take a minute depending on model size.`,
    });

    try {
      await NativeBridge.pullOllamaModel(trimmed);
      setPullStatus({
        type: 'success',
        text: `Model '${trimmed}' downloaded successfully and ready for use!`,
      });
      setPullModelInput('');
      await loadInstalled();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setPullStatus({
        type: 'error',
        text: `Download error: ${err.message || String(err)}`,
      });
    } finally {
      setIsPulling(false);
      setTimeout(() => setPullStatus(null), 6000);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    try {
      await NativeBridge.deleteOllamaModel(modelName);
      setConfirmDeleteModel(null);
      await loadInstalled();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const handleSelectActive = (modelName: string) => {
    aiProviderManager.setSelectedModel('ollama', modelName);
    setActiveModel(modelName);
    if (onModelSelected) onModelSelected(modelName);
  };

  const isInstalled = systemStatus?.is_installed ?? false;
  const isRunning = systemStatus?.is_running ?? propServerRunning ?? false;

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Installation & Server Status Banner */}
      <div className="p-3.5 rounded-xl border border-border/70 bg-background-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Status Details */}
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${
                isRunning
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse'
                  : isInstalled
                  ? 'bg-amber-400'
                  : 'bg-red-400'
              }`}
            />
            <div>
              <div className="text-xs font-semibold text-text-primary flex items-center gap-2">
                <span>
                  Ollama Status:{' '}
                  {isRunning
                    ? `Online ${systemStatus?.version ? `(v${systemStatus.version})` : ''}`
                    : isInstalled
                    ? 'Installed (Stopped)'
                    : 'Not Downloaded'}
                </span>
                <Badge
                  variant={isRunning ? 'success' : isInstalled ? 'warning' : 'muted'}
                  size="sm"
                >
                  {isRunning ? 'Ready' : isInstalled ? 'Offline' : 'Action Required'}
                </Badge>
              </div>
              <div className="text-[11px] text-text-muted mt-0.5 font-mono">
                {systemStatus?.app_path || systemStatus?.binary_path || aiProviderManager.getOllamaEndpoint()}
              </div>
            </div>
          </div>

          {/* Action Buttons: Download or Start Server */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshAll(true)}
              disabled={isCheckingStatus}
              title="Re-check Ollama status"
              className="p-1.5 rounded-lg border border-border bg-background-secondary hover:bg-background-cardHover text-text-muted hover:text-text-primary transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin text-primary' : ''}`} />
            </button>

            {!isInstalled ? (
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ollama</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            ) : !isRunning ? (
              <button
                onClick={handleStartServer}
                disabled={isStartingServer}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isStartingServer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isStartingServer ? 'Starting Server...' : 'Start Ollama Server'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopServer}
                disabled={isStoppingServer}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isStoppingServer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Square className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isStoppingServer ? 'Stopping...' : 'Stop Server'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Not Installed Help Callout */}
        {!isInstalled && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">Ollama is not yet installed on this Mac</div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                To chat completely privately without API keys or internet, download the official Ollama app from{' '}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white font-medium"
                >
                  ollama.com/download
                </a>
                . Once downloaded and opened once, click <strong>Re-check</strong> above.
              </p>
            </div>
          </div>
        )}

        {/* Server Start/Stop Notice */}
        {serverNotice && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 animate-fade-in ${
              serverNotice.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}
          >
            {serverNotice.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            )}
            <span>{serverNotice.text}</span>
          </div>
        )}
      </div>

      {/* Pull Progress Status Alert */}
      {pullStatus && (
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
            pullStatus.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : pullStatus.type === 'error'
              ? 'bg-red-500/15 border-red-500/30 text-red-300'
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}
        >
          {pullStatus.type === 'info' && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
          {pullStatus.type === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
          {pullStatus.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          <span>{pullStatus.text}</span>
        </div>
      )}

      {/* Installed Models List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-text-primary px-0.5">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            <span>Installed On-Device ({installedModels.length})</span>
          </div>

          <button
            onClick={loadInstalled}
            disabled={!isRunning}
            title="Refresh installed models"
            className="text-text-muted hover:text-text-primary disabled:opacity-30 p-1 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingModels ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>

        {installedModels.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-text-muted space-y-1">
            <div>
              {!isRunning
                ? 'Start Ollama server to view or download installed models.'
                : 'No local models downloaded yet.'}
            </div>
            {isRunning && (
              <div className="text-[10px]">
                Choose a recommended model below or enter a model name to download.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {installedModels.map((m) => {
              const isActive = m.name === activeModel;
              const isConfirming = confirmDeleteModel === m.name;

              return (
                <div
                  key={m.name}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-primary/15 border-primary/40 text-text-primary'
                      : 'bg-background-card border-border/60 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div
                    onClick={() => handleSelectActive(m.name)}
                    className="flex-1 cursor-pointer truncate mr-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text-primary truncate">
                        {m.name}
                      </span>
                      {isActive && (
                        <Badge variant="purple" size="sm">
                          Active in Chat
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Size: {m.size_formatted}
                    </div>
                  </div>

                  {/* Delete Button & Confirmation */}
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteModel(m.name)}
                        className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteModel(null)}
                        className="px-1.5 py-0.5 rounded bg-background-secondary text-text-muted hover:text-text-primary text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteModel(m.name)}
                      title={`Delete ${m.name} from device`}
                      className="p-1.5 rounded-lg hover:bg-red-500/15 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Download / Pull Model Section */}
      <div className="pt-2 border-t border-border/40 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary px-0.5">
          <Download className="w-3.5 h-3.5 text-primary" />
          <span>Download (Pull) Model to Device</span>
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={pullModelInput}
              onChange={(e) => setPullModelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePullModel(pullModelInput);
              }}
              placeholder="e.g. qwen2.5:0.5b, llama3.2:1b, mistral:7b..."
              disabled={isPulling || !isRunning}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background-card border border-border text-xs text-text-primary outline-none focus:border-primary font-mono disabled:opacity-40"
            />
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={() => handlePullModel(pullModelInput)}
            disabled={!pullModelInput.trim() || isPulling || !isRunning}
            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            {isPulling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Pull</span>
          </button>
        </div>

        {/* Popular Quick Suggestions */}
        <div className="space-y-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            Recommended Models:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {POPULAR_SUGGESTIONS.map((sug) => {
              const alreadyInstalled = installedModels.some((m) => m.name === sug.id);
              return (
                <div
                  key={sug.id}
                  className="p-2 rounded-lg bg-background-card border border-border/50 flex items-center justify-between text-[11px]"
                >
                  <div className="truncate mr-1">
                    <div className="font-semibold text-text-primary truncate">{sug.name}</div>
                    <div className="text-[9px] text-text-muted">{sug.size} • {sug.desc}</div>
                  </div>

                  {alreadyInstalled ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 flex-shrink-0">
                      <Check className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePullModel(sug.id)}
                      disabled={isPulling || !isRunning}
                      className="px-2 py-0.5 rounded bg-primary/20 hover:bg-primary text-primary hover:text-white disabled:opacity-30 text-[10px] font-medium transition-all cursor-pointer flex-shrink-0"
                    >
                      Download
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
