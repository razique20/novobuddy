import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Palette,
  Keyboard,
  Shield,
  Cpu,
  Info,
  Check,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Monitor,
  Plus,
  Trash2,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAppStore } from '../../stores/appStore';
import { ScreenshotRetentionPolicy, SettingsSection, ThemeMode } from '../../types';
import { Switch } from '../../components/common/Switch';
import { Badge } from '../../components/common/Badge';
import { NativeBridge } from '../../services/native/bridge';
import { NovaLogo } from '../../components/common/NovaLogo';
import { ProviderSettingsView } from '../../components/providers/ProviderSettingsView';
import { ScreenContextService } from '../../services/screen/ScreenContextService';
import { aiProviderManager } from '../../services/ai/AIProviderManager';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, setTheme, clearData } = useSettingsStore();
  const { currentSettingsSection, setCurrentSettingsSection, shortcutStatus, setShowOnboarding } =
    useAppStore();

  const [confirmClear, setConfirmClear] = useState(false);
  const [saveBanner, setSaveBanner] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<{ has_permission: boolean; message: string } | null>(null);
  const [newExcludedApp, setNewExcludedApp] = useState('');
  const [cacheNotice, setCacheNotice] = useState(false);
  const [visionFallbackEnabled, setVisionFallbackEnabled] = useState(aiProviderManager.isVisionFallbackEnabled());

  useEffect(() => {
    ScreenContextService.checkPermission().then(setPermissionStatus).catch(() => {});
  }, []);

  const triggerSaveNotice = () => {
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2000);
  };

  const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { id: 'screen_privacy', label: 'Screen & Vision', icon: Monitor },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'providers', label: 'AI Providers', icon: Cpu },
    { id: 'about', label: 'About NOVA', icon: Info },
  ];

  const handleClearAll = async () => {
    await clearData();
    setConfirmClear(false);
    triggerSaveNotice();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 animate-fade-in select-none">
      {/* Settings Navigation Sidebar */}
      <div className="w-56 bg-background-secondary/60 rounded-2xl border border-border/70 p-3 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-text-primary tracking-wide mb-1">
            Settings
          </div>
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isSelected = currentSettingsSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setCurrentSettingsSection(sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-card'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Persistence Status */}
        <div className="p-2.5 rounded-xl bg-background-card/50 border border-border/40 text-[11px] text-text-muted space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>SQLite Persisted</span>
          </div>
          <div>Changes save to local database instantly.</div>
        </div>
      </div>

      {/* Main Settings Content Area */}
      <div className="flex-1 bg-background-secondary/30 rounded-2xl border border-border/70 p-6 overflow-y-auto">
        {saveBanner && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Settings saved to local SQLite successfully.</span>
          </div>
        )}

        {/* Section 1: General */}
        {currentSettingsSection === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary">General Preferences</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Configure application startup and system behavior.
              </p>
            </div>

            <div className="nova-glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Launch at startup</div>
                  <div className="text-[11px] text-text-muted">
                    Automatically launch NOVA when you log into macOS
                  </div>
                </div>
                <Switch
                  checked={settings.launch_at_startup}
                  onChange={(checked) => {
                    updateSettings({ launch_at_startup: checked });
                    triggerSaveNotice();
                  }}
                />
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Start minimized</div>
                  <div className="text-[11px] text-text-muted">
                    Open in system tray and background on boot without popping up main window
                  </div>
                </div>
                <Switch
                  checked={settings.start_minimized}
                  onChange={(checked) => {
                    updateSettings({ start_minimized: checked });
                    triggerSaveNotice();
                  }}
                />
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Interface Language</div>
                  <div className="text-[11px] text-text-muted">Selected application language</div>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => {
                    updateSettings({ language: e.target.value });
                    triggerSaveNotice();
                  }}
                  className="bg-background-card border border-border rounded-lg text-xs text-text-primary px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="English">English (US)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="French">French (Français)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Appearance */}
        {currentSettingsSection === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Appearance</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Customize the visual theme, density, and animation effects.
              </p>
            </div>

            <div className="nova-glass-card rounded-xl p-4 space-y-5">
              <div>
                <div className="text-xs font-medium text-text-primary mb-2.5">Theme Mode</div>
                <div className="grid grid-cols-3 gap-3">
                  {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setTheme(mode);
                        triggerSaveNotice();
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        settings.theme === mode
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-background-card text-text-secondary hover:text-text-primary hover:border-primary/40'
                      }`}
                    >
                      <div className="text-xs font-semibold capitalize">{mode}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {mode === 'dark'
                          ? 'Dark-first aesthetic'
                          : mode === 'light'
                          ? 'High contrast clean'
                          : 'Sync with macOS'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Compact interface</div>
                  <div className="text-[11px] text-text-muted">
                    Reduce padding and typography scale for dense workspace display
                  </div>
                </div>
                <Switch
                  checked={settings.compact_mode}
                  onChange={(checked) => {
                    updateSettings({ compact_mode: checked });
                    triggerSaveNotice();
                  }}
                />
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Enable animations</div>
                  <div className="text-[11px] text-text-muted">
                    Smooth transitions and micro-interactions
                  </div>
                </div>
                <Switch
                  checked={settings.enable_animations}
                  onChange={(checked) => {
                    updateSettings({ enable_animations: checked });
                    triggerSaveNotice();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Shortcuts */}
        {currentSettingsSection === 'shortcuts' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Keyboard Shortcuts</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Global hotkeys to summon the NOVA Floating Companion instantly.
              </p>
            </div>

            <div className="nova-glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary flex items-center gap-2">
                    <span>Global Companion Toggle</span>
                    {shortcutStatus?.is_registered ? (
                      <Badge variant="success" size="sm">
                        Registered & Active
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        Registration Standby
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Press anywhere in macOS to summon or dismiss the floating window
                  </div>
                </div>

                <kbd className="px-3 py-1.5 rounded-lg bg-background-card border border-border text-xs font-mono font-semibold text-primary shadow-sm">
                  {shortcutStatus?.shortcut || 'Option + Space'}
                </kbd>
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <span className="text-xs text-text-secondary">Test floating companion trigger:</span>
                <button
                  onClick={() => NativeBridge.showFloatingWindow()}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Summon Companion Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section: Screen & Vision (Phase 3) */}
        {currentSettingsSection === 'screen_privacy' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Screen & Visual Intelligence</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Explicit-only visual companion controls, native Apple Vision OCR, and zero-retention privacy.
              </p>
            </div>

            {/* macOS Permission Status Card */}
            <div className="nova-glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary flex items-center gap-2">
                    <span>macOS Screen Recording Permission</span>
                    {permissionStatus?.has_permission ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                        <Check className="w-3 h-3" />
                        Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        Needs Permission
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {permissionStatus?.message || 'Checking macOS system permission...'}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const res = await ScreenContextService.requestPermission();
                    setPermissionStatus(res);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-background-card hover:bg-white/5 border border-border/80 hover:border-primary/50 text-xs font-medium text-text-primary transition-colors cursor-pointer"
                >
                  {permissionStatus?.has_permission ? 'Recheck' : 'Request Access'}
                </button>
              </div>
            </div>

            {/* Visual Controls */}
            <div className="nova-glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Enable Screen Capture</div>
                  <div className="text-[11px] text-text-muted">
                    Allows manual capture of full displays, windows, or regions when you click Capture
                  </div>
                </div>
                <Switch
                  checked={settings.screen_capture_enabled ?? true}
                  onChange={(val) => {
                    updateSettings({ screen_capture_enabled: val });
                    triggerSaveNotice();
                  }}
                />
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Apple Vision OCR</div>
                  <div className="text-[11px] text-text-muted">
                    Automatically recognize on-screen text using Apple Vision framework with zero latency
                  </div>
                </div>
                <Switch
                  checked={settings.ocr_enabled ?? true}
                  onChange={(val) => {
                    updateSettings({ ocr_enabled: val });
                    triggerSaveNotice();
                  }}
                />
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Screenshot Retention Policy</div>
                  <div className="text-[11px] text-text-muted">
                    Ephemeral policy purges screenshots immediately from memory after analysis
                  </div>
                </div>
                <select
                  value={settings.screenshot_retention_policy || 'ephemeral'}
                  onChange={(e) => {
                    updateSettings({ screenshot_retention_policy: e.target.value as ScreenshotRetentionPolicy });
                    triggerSaveNotice();
                  }}
                  className="bg-background-card border border-border rounded-lg text-xs text-text-primary px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="ephemeral">Ephemeral (Zero Retention)</option>
                  <option value="session">Session Only (Clears on quit)</option>
                  <option value="30_days">Persist with Conversation (30 days)</option>
                </select>
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Vision Auto-Fallback</div>
                  <div className="text-[11px] text-text-muted">
                    If Groq vision is overloaded, automatically retry on Ollama or Gemini Flash (all free)
                  </div>
                </div>
                <Switch
                  checked={visionFallbackEnabled}
                  onChange={(val) => {
                    setVisionFallbackEnabled(val);
                    aiProviderManager.setVisionFallbackEnabled(val);
                    triggerSaveNotice();
                  }}
                />
              </div>
            </div>

            {/* Free Vision Provider Chain Info */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5">
              <div className="text-xs font-semibold text-primary flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>Free Vision Provider Chain</span>
              </div>
              <div className="text-[11px] text-text-secondary leading-relaxed">
                When a vision request fails, NOVA automatically tries the next free provider:
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {[
                  { label: 'Groq Vision (11B)', badge: 'cloud' },
                  { label: 'Groq Vision (90B)', badge: 'cloud' },
                  { label: 'Ollama Vision', badge: 'local' },
                  { label: 'LLaVA (Ollama)', badge: 'local' },
                  { label: 'Gemini Flash', badge: 'free tier' },
                ].map((item, i, arr) => (
                  <React.Fragment key={item.label}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-background-card border border-border/60 text-[10px] text-text-primary">
                      {item.label}
                      <span className={`text-[9px] px-1 py-0 rounded ${item.badge === 'local' ? 'bg-emerald-500/20 text-emerald-400' : item.badge === 'free tier' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {item.badge}
                      </span>
                    </span>
                    {i < arr.length - 1 && (
                      <span className="text-text-muted text-[10px]">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Excluded Applications */}
            <div className="nova-glass-card rounded-xl p-4 space-y-3">
              <div>
                <div className="text-xs font-medium text-text-primary">Excluded Applications (Privacy Shield)</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  Windows belonging to these applications will never appear in window pickers or be captured.
                </div>
              </div>

              {/* Tag list */}
              <div className="flex flex-wrap gap-2 pt-1">
                {(settings.excluded_applications || ['Keychain Access', '1Password', 'Bitwarden']).map((app) => (
                  <div
                    key={app}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background-secondary border border-border/70 text-xs text-text-primary"
                  >
                    <span>{app}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = settings.excluded_applications || [];
                        const updated = current.filter((x) => x !== app);
                        updateSettings({ excluded_applications: updated });
                        triggerSaveNotice();
                      }}
                      className="text-text-muted hover:text-red-400 p-0.5 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new excluded app form */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newExcludedApp}
                  onChange={(e) => setNewExcludedApp(e.target.value)}
                  placeholder="App name (e.g. Signal, Telegram)..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-background-card border border-border text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newExcludedApp.trim()) {
                      e.preventDefault();
                      const current = settings.excluded_applications || [];
                      if (!current.includes(newExcludedApp.trim())) {
                        updateSettings({ excluded_applications: [...current, newExcludedApp.trim()] });
                        setNewExcludedApp('');
                        triggerSaveNotice();
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newExcludedApp.trim()) {
                      const current = settings.excluded_applications || [];
                      if (!current.includes(newExcludedApp.trim())) {
                        updateSettings({ excluded_applications: [...current, newExcludedApp.trim()] });
                        setNewExcludedApp('');
                        triggerSaveNotice();
                      }
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-medium cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Clear Temporary Cache Card */}
            <div className="p-4 rounded-xl border border-border/70 bg-background-card/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-text-primary">Temporary Screenshot Cache</div>
                <div className="text-[11px] text-text-muted">
                  Clear any cached capture bitmaps from memory
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCacheNotice(true);
                  setTimeout(() => setCacheNotice(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-background-secondary hover:bg-white/5 border border-border text-xs text-text-primary transition-colors cursor-pointer"
              >
                {cacheNotice ? 'Cache Purged' : 'Purge Cache'}
              </button>
            </div>
          </div>
        )}

        {/* Section 4: Privacy & Data */}
        {currentSettingsSection === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Privacy & Data Governance</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Full transparency over local storage and system permissions.
              </p>
            </div>

            <div className="nova-glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Screen capture status</div>
                  <div className="text-[11px] text-text-muted">
                    No screen recording permissions requested or utilized in Phase 1
                  </div>
                </div>
                <Badge variant="muted" size="sm">
                  Unrequested (Phase 3)
                </Badge>
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">Microphone status</div>
                  <div className="text-[11px] text-text-muted">
                    No audio capture permissions requested or utilized in Phase 1
                  </div>
                </div>
                <Badge variant="muted" size="sm">
                  Unrequested (Phase 2)
                </Badge>
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-primary">History Retention</div>
                  <div className="text-[11px] text-text-muted">
                    Local SQLite conversation retention threshold
                  </div>
                </div>
                <select
                  value={settings.data_retention_days}
                  onChange={(e) => {
                    updateSettings({ data_retention_days: Number(e.target.value) });
                    triggerSaveNotice();
                  }}
                  className="bg-background-card border border-border rounded-lg text-xs text-text-primary px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year</option>
                  <option value={-1}>Keep Indefinitely</option>
                </select>
              </div>
            </div>

            {/* Clear Data Danger Zone */}
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Clear Local Data</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Permanently wipes all local conversations, messages, and reset settings in SQLite.
              </p>

              {confirmClear ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Yes, Wipe All Data
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 rounded-lg bg-background-card border border-border text-xs text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all cursor-pointer"
                >
                  Clear Application Data
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 5: AI Providers */}
        {currentSettingsSection === 'providers' && <ProviderSettingsView />}

        {/* Section 6: About */}
        {currentSettingsSection === 'about' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <NovaLogo size="lg" />
              <div>
                <h2 className="text-base font-bold text-text-primary">NOVA Desktop</h2>
                <div className="text-xs text-text-secondary">Commercial-grade AI Desktop Companion</div>
              </div>
            </div>

            <div className="nova-glass-card rounded-xl p-4 space-y-3 text-xs leading-relaxed text-text-secondary">
              <p>
                <strong>Tagline:</strong> Your computer. With intelligence.
              </p>
              <p>
                NOVA is built with a high-performance native Rust core powered by Tauri 2, coupled with a React and TypeScript desktop frontend. Phase 1 establishes the rock-solid foundation, system tray, global shortcut daemon, and local SQLite state store.
              </p>

              <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-text-muted">Version:</span>{' '}
                  <span className="text-text-primary font-mono">0.1.0-alpha (Phase 1)</span>
                </div>
                <div>
                  <span className="text-text-muted">Framework:</span>{' '}
                  <span className="text-text-primary">Tauri 2 + Rust</span>
                </div>
                <div>
                  <span className="text-text-muted">Database:</span>{' '}
                  <span className="text-text-primary font-mono">SQLite (rusqlite 0.32)</span>
                </div>
                <div>
                  <span className="text-text-muted">Target OS:</span>{' '}
                  <span className="text-text-primary">macOS (15 Sequoia / Apple Silicon)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-card hover:bg-background-cardHover border border-border text-xs text-text-primary transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-primary" />
                  <span>Re-run Welcome Onboarding</span>
                </button>

                <div className="flex items-center gap-3 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1 hover:text-text-primary cursor-pointer">
                    <span>Documentation</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  <span className="flex items-center gap-1 hover:text-text-primary cursor-pointer">
                    <span>Privacy Notice</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
