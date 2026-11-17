import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink,
  Save,
  Check,
} from 'lucide-react';
import { ProviderId, ConnectionTestResult, ModelInfo } from '../../services/ai/types';
import { aiProviderManager } from '../../services/ai/AIProviderManager';
import { SecretManager } from '../../services/security/secretManager';
import { NativeBridge } from '../../services/native/bridge';
import { Badge } from '../common/Badge';
import { OllamaModelManager } from './OllamaModelManager';

interface ProviderCardData {
  id: ProviderId;
  name: string;
  type: 'local' | 'cloud';
  description: string;
  docUrl: string;
}

const PROVIDER_METADATA: ProviderCardData[] = [
  {
    id: 'ollama',
    name: 'Ollama (Local AI)',
    type: 'local',
    description: 'Privacy-first, zero-telemetry local inference running completely on device.',
    docUrl: 'https://ollama.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    description: 'GPT-4o, GPT-4o Mini, and reasoning models via official OpenAI API.',
    docUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'cloud',
    description: 'Claude 3.5 Sonnet, Claude 3.5 Haiku with superior reasoning and code analysis.',
    docUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast LPU)',
    type: 'cloud',
    description: 'Blazing fast inference (>750 tok/s) powered by custom Groq Language Processing Units.',
    docUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'cloud',
    description: 'Gemini 1.5 Pro and Flash with massive context windows and multimodal capability.',
    docUrl: 'https://aistudio.google.com/app/apikey',
  },
];

export const ProviderSettingsView: React.FC = () => {
  const [activeConfigureId, setActiveConfigureId] = useState<ProviderId | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<
    Record<ProviderId, { status: 'connected' | 'not_configured' | 'error' | 'testing'; message?: string; latency?: number }>
  >({
    ollama: { status: 'not_configured' },
    groq: { status: 'not_configured' },
    openai: { status: 'not_configured' },
    anthropic: { status: 'not_configured' },
    gemini: { status: 'not_configured' },
  });

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedKeyMask, setSavedKeyMask] = useState<string | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState(aiProviderManager.getOllamaEndpoint());
  const [modelsMap, setModelsMap] = useState<Record<ProviderId, ModelInfo[]>>({
    ollama: [],
    groq: [],
    openai: [],
    anthropic: [],
    gemini: [],
  });
  const [selectedModels, setSelectedModels] = useState<Record<ProviderId, string>>({
    ollama: aiProviderManager.getSelectedModel('ollama'),
    groq: aiProviderManager.getSelectedModel('groq'),
    openai: aiProviderManager.getSelectedModel('openai'),
    anthropic: aiProviderManager.getSelectedModel('anthropic'),
    gemini: aiProviderManager.getSelectedModel('gemini'),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadInitialStatuses = async () => {
    for (const p of PROVIDER_METADATA) {
      if (p.id === 'ollama') {
        try {
          const sys = await NativeBridge.getOllamaInstallationStatus(ollamaUrl);
          if (sys.is_running) {
            testProviderConnection('ollama', false);
          } else if (sys.is_installed) {
            setProviderStatuses((prev) => ({
              ...prev,
              ollama: { status: 'not_configured', message: 'Installed on device (Server stopped)' },
            }));
          } else {
            setProviderStatuses((prev) => ({
              ...prev,
              ollama: { status: 'not_configured', message: 'Not downloaded / Not installed' },
            }));
          }
        } catch {
          setProviderStatuses((prev) => ({
            ...prev,
            ollama: { status: 'not_configured', message: 'Offline' },
          }));
        }
      } else {
        const configured = await aiProviderManager.isProviderConfigured(p.id);
        if (configured) {
          testProviderConnection(p.id, false);
        } else {
          setProviderStatuses((prev) => ({
            ...prev,
            [p.id]: { status: 'not_configured', message: 'Not configured' },
          }));
        }
      }

      // Load models
      const models = await aiProviderManager.getModelsForProvider(p.id);
      setModelsMap((prev) => ({ ...prev, [p.id]: models }));
    }
  };

  useEffect(() => {
    loadInitialStatuses();
  }, []);

  const testProviderConnection = async (id: ProviderId, showToast = true) => {
    setProviderStatuses((prev) => ({
      ...prev,
      [id]: { status: 'testing', message: 'Testing connection...' },
    }));

    try {
      if (id === 'ollama') {
        const sys = await NativeBridge.getOllamaInstallationStatus(ollamaUrl);
        if (!sys.is_installed) {
          setProviderStatuses((prev) => ({
            ...prev,
            ollama: { status: 'error', message: 'Ollama is not installed on this machine.' },
          }));
          if (showToast) showNotification('error', 'Ollama is not installed on this device.');
          return;
        }
        if (!sys.is_running) {
          setProviderStatuses((prev) => ({
            ...prev,
            ollama: { status: 'not_configured', message: 'Ollama is installed but the server is stopped.' },
          }));
          if (showToast) showNotification('error', 'Ollama server is stopped. Click Configure to start it.');
          return;
        }
      }

      const res: ConnectionTestResult = await aiProviderManager.testProvider(id);
      if (res.ok) {
        setProviderStatuses((prev) => ({
          ...prev,
          [id]: {
            status: 'connected',
            message: res.message,
            latency: res.latencyMs,
          },
        }));

        // Refresh models
        const models = await aiProviderManager.getModelsForProvider(id);
        setModelsMap((prev) => ({ ...prev, [id]: models }));

        if (showToast) {
          showNotification('success', `${id.toUpperCase()}: ${res.message}`);
        }
      } else {
        setProviderStatuses((prev) => ({
          ...prev,
          [id]: {
            status: 'error',
            message: res.message,
          },
        }));
        if (showToast) {
          showNotification('error', `${id.toUpperCase()}: ${res.message}`);
        }
      }
    } catch (err: any) {
      setProviderStatuses((prev) => ({
        ...prev,
        [id]: {
          status: 'error',
          message: err.message || 'Connection failed',
        },
      }));
      if (showToast) {
        showNotification('error', `Failed to connect to ${id}`);
      }
    }
  };

  const handleOpenConfigure = async (id: ProviderId) => {
    setActiveConfigureId(id);
    setInputKey('');
    setShowKey(false);

    if (id === 'ollama') {
      setOllamaUrl(aiProviderManager.getOllamaEndpoint());
    } else {
      const existingKey = await SecretManager.getApiKey(id);
      if (existingKey) {
        setSavedKeyMask(SecretManager.maskKey(existingKey));
        // Refresh models for this provider
        aiProviderManager.getModelsForProvider(id).then((m) => {
          setModelsMap((prev) => ({ ...prev, [id]: m }));
        });
      } else {
        setSavedKeyMask(null);
      }
    }
  };

  const handleSaveConfig = async () => {
    if (!activeConfigureId) return;

    setIsSaving(true);
    try {
      if (activeConfigureId === 'ollama') {
        aiProviderManager.setOllamaEndpoint(ollamaUrl);
        await testProviderConnection('ollama', true);
      } else {
        if (inputKey.trim()) {
          const validation = SecretManager.validateKeyFormat(activeConfigureId, inputKey);
          if (!validation.valid) {
            showNotification('error', validation.reason || 'Invalid key format.');
            setIsSaving(false);
            return;
          }

          await SecretManager.setApiKey(activeConfigureId, inputKey);
          setSavedKeyMask(SecretManager.maskKey(inputKey));
          setInputKey('');
          await testProviderConnection(activeConfigureId, true);
        } else if (savedKeyMask) {
          await testProviderConnection(activeConfigureId, true);
        }
      }

      showNotification('success', 'Configuration securely saved to Keychain.');
      setActiveConfigureId(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveKey = async (id: ProviderId) => {
    try {
      await SecretManager.removeApiKey(id);
      setSavedKeyMask(null);
      setInputKey('');
      setProviderStatuses((prev) => ({
        ...prev,
        [id]: { status: 'not_configured', message: 'Not configured' },
      }));
      showNotification('success', `API key for ${id} removed from Keychain.`);
      setActiveConfigureId(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to remove key.');
    }
  };

  const handleModelChange = (id: ProviderId, model: string) => {
    aiProviderManager.setSelectedModel(id, model);
    setSelectedModels((prev) => ({ ...prev, [id]: model }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">AI Inference Providers</h2>
            <Badge variant="purple" size="sm">
              Phase 2 Active
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Connect local Ollama models or enterprise cloud APIs. Keys are stored in macOS Keychain.
          </p>
        </div>

        {notification && (
          <div
            className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDER_METADATA.map((provider) => {
          const statusInfo = providerStatuses[provider.id];
          const isConfiguringThis = activeConfigureId === provider.id;
          const models = modelsMap[provider.id] || [];
          const selectedModel = selectedModels[provider.id];

          return (
            <div
              key={provider.id}
              className={`nova-glass-card rounded-2xl p-4 flex flex-col justify-between transition-all ${
                isConfiguringThis ? 'col-span-1 md:col-span-2 ring-1 ring-primary/40 shadow-xl' : ''
              } ${
                statusInfo?.status === 'connected'
                  ? 'border-emerald-500/30'
                  : statusInfo?.status === 'error'
                  ? 'border-red-500/30'
                  : 'border-border/70'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-text-primary">{provider.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={provider.type === 'local' ? 'purple' : 'accent'}
                          size="sm"
                        >
                          {provider.type === 'local' ? 'On-Device' : 'Cloud'}
                        </Badge>
                        <a
                          href={provider.docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-0.5"
                        >
                          <span>Docs</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5">
                    {statusInfo?.status === 'connected' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Connected</span>
                      </span>
                    )}
                    {statusInfo?.status === 'testing' && (
                      <span className="flex items-center gap-1 text-[11px] text-primary animate-pulse font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing...</span>
                      </span>
                    )}
                    {statusInfo?.status === 'error' && (
                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Error</span>
                      </span>
                    )}
                    {statusInfo?.status === 'not_configured' && (
                      <span className="flex items-center gap-1 text-[11px] text-text-muted font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Not Configured</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-text-secondary leading-relaxed">
                  {provider.description}
                </p>

                {/* Status Message / Latency */}
                {statusInfo?.message && (
                  <div
                    className={`p-2 rounded-xl text-[10px] leading-tight ${
                      statusInfo.status === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : statusInfo.status === 'error'
                        ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                        : 'bg-background-card text-text-muted border border-border/40'
                    }`}
                  >
                    <span>{statusInfo.message}</span>
                    {statusInfo.latency && (
                      <span className="ml-1 opacity-70">({statusInfo.latency}ms)</span>
                    )}
                  </div>
                )}

                {/* Model Selection Row */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-text-secondary flex-shrink-0">
                    Active Model:
                  </span>
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(provider.id, e.target.value)}
                    className="bg-background-card border border-border rounded-lg text-xs text-text-primary px-2.5 py-1 outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    {models.length > 0 ? (
                      models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))
                    ) : (
                      <option value="default">Default Model</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-border/40 flex items-center justify-between gap-2">
                <button
                  onClick={() => testProviderConnection(provider.id, true)}
                  disabled={statusInfo?.status === 'testing'}
                  className="px-2.5 py-1.5 rounded-lg bg-background-card hover:bg-background-cardHover border border-border text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${
                      statusInfo?.status === 'testing' ? 'animate-spin text-primary' : ''
                    }`}
                  />
                  <span>Test Connection</span>
                </button>

                <button
                  onClick={() =>
                    isConfiguringThis
                      ? setActiveConfigureId(null)
                      : handleOpenConfigure(provider.id)
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-sm ${
                    isConfiguringThis
                      ? 'bg-background-secondary border border-border text-text-primary hover:bg-background-cardHover'
                      : 'bg-primary hover:bg-primary-hover text-white'
                  }`}
                >
                  {isConfiguringThis ? 'Close' : 'Configure'}
                </button>
              </div>

              {/* Inline Configuration Drawer */}
              {isConfiguringThis && (
                <div className="mt-4 pt-4 border-t border-border/70 space-y-3 animate-fade-in bg-background-secondary/50 p-3.5 rounded-xl">
                  <div className="text-xs font-semibold text-text-primary">
                    {provider.id === 'ollama'
                      ? 'Ollama Endpoint Configuration'
                      : `Configure ${provider.name} Secret Key`}
                  </div>

                  {provider.id === 'ollama' ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-text-muted">
                          Ollama Server URL:
                        </label>
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="w-full px-3 py-1.5 rounded-lg bg-background-card border border-border text-xs text-text-primary outline-none focus:border-primary font-mono"
                        />
                      </div>

                      {/* On-device Model and Server Controls */}
                      <OllamaModelManager
                        serverRunning={statusInfo?.status === 'connected'}
                        onRefresh={() => testProviderConnection('ollama', false)}
                        onModelSelected={(m) => handleModelChange('ollama', m)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedKeyMask && (
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                          <span>Keychain Key: {savedKeyMask}</span>
                          <button
                            onClick={() => handleRemoveKey(provider.id)}
                            title="Remove key from Keychain"
                            className="p-1 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <label className="text-[11px] text-text-muted">
                        {savedKeyMask ? 'Update API Key:' : 'Enter API Key:'}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={inputKey}
                          onChange={(e) => setInputKey(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveConfig();
                            }
                          }}
                          placeholder={
                            provider.id === 'openai'
                              ? 'sk-...'
                              : provider.id === 'anthropic'
                              ? 'sk-ant-...'
                              : provider.id === 'groq'
                              ? 'gsk_...'
                              : 'AIza...'
                          }
                          className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-background-card border border-border text-xs text-text-primary outline-none focus:border-primary font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-2 text-text-muted hover:text-text-primary p-0.5"
                        >
                          {showKey ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-text-muted">
                        Stored in native macOS Keychain. Never saved in plaintext.
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setActiveConfigureId(null)}
                      className="px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveConfig}
                      disabled={isSaving}
                      className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1 shadow-sm"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
