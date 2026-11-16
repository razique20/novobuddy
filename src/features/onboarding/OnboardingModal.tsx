import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  Eye,
  Mic,
  Brain,
  Keyboard,
  Palette,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAppStore } from '../../stores/appStore';
import { ThemeMode } from '../../types';
import { NativeBridge } from '../../services/native/bridge';
import { Badge } from '../../components/common/Badge';
import { NovaLogo } from '../../components/common/NovaLogo';

export const OnboardingModal: React.FC = () => {
  const [step, setStep] = useState(1);
  const [testPressed, setTestPressed] = useState(false);
  const { settings, setTheme, updateSettings } = useSettingsStore();
  const { setShowOnboarding } = useAppStore();

  const handleTestShortcut = async () => {
    setTestPressed(true);
    try {
      await NativeBridge.showFloatingWindow();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinish = async () => {
    await updateSettings({ onboarding_completed: true });
    setShowOnboarding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg rounded-2xl bg-background-card border border-border shadow-2xl p-6 relative overflow-hidden text-text-primary">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-blue/20 rounded-full blur-3xl pointer-events-none" />

        {/* Progress Dots */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
          <div className="flex items-center gap-2">
            <NovaLogo size="sm" />
            <span className="text-xs font-bold tracking-wide">NOVA Onboarding</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  step === s ? 'w-6 bg-primary' : s < step ? 'w-2 bg-emerald-500' : 'w-2 bg-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <NovaLogo size="xl" className="mb-2" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">Meet NOVA</h2>
              <p className="text-sm text-text-secondary mt-1">Your computer. With intelligence.</p>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              NOVA is an AI desktop companion built natively for macOS. Designed with clean contrast, local SQLite persistence, and instant global hotkey access, NOVA stays quietly ready by your side.
            </p>
          </div>
        )}

        {/* Step 2: Experience Overview */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Engineered for Your Desktop</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Here is what NOVA brings to your macOS workflow:
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-background-card border border-border flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">AI Conversations</div>
                  <div className="text-[11px] text-text-secondary">
                    Local demo flows now; live LLM providers arriving in Phase 2
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background-card border border-border flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">Screen-Aware Context</div>
                    <div className="text-[11px] text-text-secondary">
                      Comprehends active windows and documents
                    </div>
                  </div>
                </div>
                <Badge variant="muted" size="sm">
                  Phase 3
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-background-card border border-border flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">Voice Interaction</div>
                    <div className="text-[11px] text-text-secondary">Hands-free communication</div>
                  </div>
                </div>
                <Badge variant="muted" size="sm">
                  Phase 2
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-background-card border border-border flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">Persistent Memory</div>
                    <div className="text-[11px] text-text-secondary">
                      Maintains project and developer context
                    </div>
                  </div>
                </div>
                <Badge variant="muted" size="sm">
                  Phase 3
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Keyboard Shortcut */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Instant Global Access</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                NOVA is summoned from anywhere using macOS Option + Space.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background-card border border-border text-center space-y-3">
              <div className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                Default Global Hotkey
              </div>
              <kbd className="inline-block px-4 py-2 rounded-xl bg-background-secondary border border-border text-base font-mono font-bold text-primary shadow-inner">
                Option + Space
              </kbd>
              <div className="text-xs text-text-secondary">
                Pressing this shortcut toggles the compact floating companion.
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-xs text-text-primary font-medium">Test companion trigger:</span>
              </div>
              <button
                onClick={handleTestShortcut}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                {testPressed ? 'Triggered ✓' : 'Test Shortcut Now'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preferences */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Choose Your Theme</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Select your preferred visual style for NOVA.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    settings.theme === mode
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background-card text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold capitalize">{mode}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {mode === 'dark'
                      ? 'Dark-first mode'
                      : mode === 'light'
                      ? 'High contrast'
                      : 'Follow macOS'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Finish */}
        {step === 5 && (
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">You're ready to meet NOVA</h2>
              <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                Your desktop companion foundation is initialized and ready. Your local SQLite database is connected.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-background-card border border-border text-left space-y-1.5 text-xs text-text-secondary">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Quick Tips:
              </div>
              <div className="text-[11px] text-text-muted pl-3.5 space-y-1">
                <div>• Press Option + Space anytime to summon the companion.</div>
                <div>• Access system tray in macOS top menu bar.</div>
                <div>• All interactions persist locally with zero tracking.</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-border/40">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-3 py-1.5 rounded-lg bg-background-card border border-border text-xs text-text-secondary hover:text-text-primary cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold cursor-pointer shadow-sm"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent-blue text-white text-xs font-semibold cursor-pointer shadow-glow"
            >
              <span>Enter Workspace</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
