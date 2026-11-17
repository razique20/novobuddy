import React, { useState, useEffect, useRef } from 'react';
import { Cpu, ChevronDown, Check, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { ProviderId, ModelInfo } from '../../services/ai/types';
import { aiProviderManager } from '../../services/ai/AIProviderManager';
import { useAppStore } from '../../stores/appStore';

interface ModelSelectorProps {
  onConfigureClick?: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onConfigureClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderId>(
    aiProviderManager.getActiveProviderId()
  );
  const [activeModel, setActiveModel] = useState<string>(
    aiProviderManager.getSelectedModel()
  );
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setCurrentSettingsSection, setCurrentTab } = useAppStore();

  const PROVIDERS: { id: ProviderId; label: string; badge: string }[] = [
    { id: 'ollama', label: 'Ollama (Local)', badge: 'Local' },
    { id: 'groq', label: 'Groq (Fast LPU)', badge: 'Cloud' },
    { id: 'openai', label: 'OpenAI', badge: 'Cloud' },
    { id: 'anthropic', label: 'Anthropic Claude', badge: 'Cloud' },
    { id: 'gemini', label: 'Google Gemini', badge: 'Cloud' },
  ];

  const refreshState = async (providerId: ProviderId) => {
    setIsLoadingModels(true);
    try {
      const configured = await aiProviderManager.isProviderConfigured(providerId);
      setIsConfigured(configured);

      const available = await aiProviderManager.getModelsForProvider(providerId);
      setModels(available);

      const currentSelected = aiProviderManager.getSelectedModel(providerId);
      
      // For Ollama, prefer on-device offline models over cloud stubs
      if (providerId === 'ollama') {
        const localModels = available.filter((m) => !m.id.includes('-cloud'));
        if (localModels.length > 0 && (!currentSelected || currentSelected.includes('-cloud'))) {
          const chosen = localModels[0].id;
          setActiveModel(chosen);
          aiProviderManager.setSelectedModel(providerId, chosen);
          return;
        }
      }

      if (available.some((m) => m.id === currentSelected)) {
        setActiveModel(currentSelected);
      } else if (available.length > 0) {
        setActiveModel(available[0].id);
        aiProviderManager.setSelectedModel(providerId, available[0].id);
      }
    } catch (e) {
      console.error('Failed to refresh models:', e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    refreshState(activeProvider);
  }, [activeProvider]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProviderSelect = (pid: ProviderId) => {
    aiProviderManager.setActiveProvider(pid);
    setActiveProvider(pid);
  };

  const handleModelSelect = (mid: string) => {
    aiProviderManager.setSelectedModel(activeProvider, mid);
    setActiveModel(mid);
    setIsOpen(false);
  };

  const handleGoToSettings = () => {
    setIsOpen(false);
    if (onConfigureClick) {
      onConfigureClick();
    } else {
      setCurrentTab('settings');
      setCurrentSettingsSection('providers');
    }
  };

  const currentProviderMeta = PROVIDERS.find((p) => p.id === activeProvider);
  const currentModelMeta = models.find((m) => m.id === activeModel);

  return (
    <div className="relative inline-block select-none" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-background-card/80 hover:bg-background-card border border-border/80 hover:border-primary/50 text-xs text-text-primary transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold">{currentProviderMeta?.label}</span>
          <span className="text-text-muted">/</span>
          <span className="text-text-secondary truncate max-w-[120px]">
            {currentModelMeta?.name || activeModel}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl nova-glass-card border border-border/80 p-2 text-xs shadow-2xl z-50 animate-fade-in">
          {/* Provider Selection Tabs */}
          <div className="pb-2 border-b border-border/50 space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Select Provider
            </div>
            <div className="grid grid-cols-2 gap-1">
              {PROVIDERS.map((prov) => {
                const isSelected = prov.id === activeProvider;
                return (
                  <button
                    key={prov.id}
                    onClick={() => handleProviderSelect(prov.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{prov.label.split(' ')[0]}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-background-secondary text-text-muted'
                      }`}
                    >
                      {prov.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration Warning if not configured */}
          {!isConfigured && (
            <div className="my-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>
                  {activeProvider === 'ollama'
                    ? 'Ollama server offline'
                    : 'API Key not configured'}
                </span>
              </div>
              <p className="text-[10px] text-amber-200/80 leading-tight">
                {activeProvider === 'ollama'
                  ? 'Start Ollama with `ollama serve` in terminal.'
                  : 'Add your secret key in Settings to chat.'}
              </p>
              <button
                onClick={handleGoToSettings}
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-100 underline cursor-pointer"
              >
                <span>Configure in Settings</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          {/* Model Selection List */}
          <div className="pt-1.5">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              <span>Available Models</span>
              <button
                onClick={() => refreshState(activeProvider)}
                title="Refresh models"
                className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoadingModels ? 'animate-spin text-primary' : ''}`}
                />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {models.length === 0 ? (
                <div className="py-4 text-center text-text-muted text-[11px]">
                  No models found.
                </div>
              ) : (
                models.map((m) => {
                  const isSelected = m.id === activeModel;
                  const isCloud = m.id.includes('-cloud');
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleModelSelect(m.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary/20 text-primary border border-primary/30 font-medium'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-medium">{m.name}</span>
                          {isCloud ? (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                              Cloud
                            </span>
                          ) : (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                              On-Device
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <div className="text-[9px] text-text-muted truncate">
                            {m.description}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
