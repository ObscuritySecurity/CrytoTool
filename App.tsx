import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { AutoDestructCountdown } from './components/AutoDestructCountdown';
import type { AutoDestructCountdownHandle } from './components/AutoDestructCountdown';
import { db, setVaultKey } from './crypto-core/db';
import { I18nProvider } from './locales/i18nContext';
import { pin_hash as hashPin } from './crypto-core/index';
import {
  derive_key,
  wrap_raw_key,
  unwrap_raw_key,
  base64_decode,
  base64_encode,
  generate_recovery_codes,
  parse_code_index,
  get_argon_params,
} from './crypto-core/index';
import type { CryptoMetadata, VaultWrappers } from './types';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isSetupRequired, setIsSetupRequired] = useState(() => {
    const salt = localStorage.getItem('crytotool_salt');
    const wrappers = localStorage.getItem('crytotool_vault_wrappers');
    return !salt && !wrappers;
  });

  const [autoBlurSeconds, setAutoBlurSeconds] = useState(() => {
    const saved = localStorage.getItem('crytotool_blur_time');
    return saved ? parseInt(saved, 10) : 20;
  });

  const [autoLockSeconds, setAutoLockSeconds] = useState(() => {
    const saved = localStorage.getItem('crytotool_lock_time');
    return saved ? parseInt(saved, 10) : 25;
  });

  const [isBlurred, setIsBlurred] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const [settingsPassword, setSettingsPassword] = useState<string | null>(null);

  const updateSettingsPassword = (pwd: string | null) => {
    setSettingsPassword(pwd);
  };

  const [vaultEnabled, setVaultEnabled] = useState(() => {
    const saved = localStorage.getItem('crytotool_vault_enabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [vaultPin, setVaultPin] = useState<string | null>(() => {
    return localStorage.getItem('crytotool_vault_pin_hash');
  });

  const updateVaultSettings = async (enabled: boolean, pin: string | null) => {
    setVaultEnabled(enabled);
    if (pin) {
      const metaRaw = localStorage.getItem('crytotool_crypto_metadata');
      const meta: CryptoMetadata | null = metaRaw ? JSON.parse(metaRaw) : null;
      const tierId = meta?.tier || 1;
      const pinParams = JSON.parse(get_argon_params('pin', tierId));
      const hash = await hashPin(pin, pinParams.iterations, pinParams.memorySize, pinParams.parallelism);
      localStorage.setItem('crytotool_vault_pin_hash', hash);
      setVaultPin(hash);
    } else {
      localStorage.removeItem('crytotool_vault_pin_hash');
      setVaultPin(null);
    }
    localStorage.setItem('crytotool_vault_enabled', String(enabled));
  };

  const [progressiveLockSeconds, setProgressiveLockSeconds] = useState(() => {
    const saved = localStorage.getItem('crytotool_prog_lock_time');
    return saved ? parseInt(saved, 10) : 60;
  });

  const [failedAttemptsThreshold, setFailedAttemptsThreshold] = useState(() => {
    const saved = localStorage.getItem('crytotool_prog_attempts');
    return saved ? parseInt(saved, 10) : 3;
  });

  const [autoDestructEnabled, setAutoDestructEnabled] = useState(() => {
    return localStorage.getItem('crytotool_ad_enabled') === 'true';
  });

  const [autoDestructAttempts, setAutoDestructAttempts] = useState(() => {
    const saved = localStorage.getItem('crytotool_ad_attempts');
    return saved ? parseInt(saved, 10) : 5;
  });

  const [autoDestructInactivity, setAutoDestructInactivity] = useState(() => {
    const saved = localStorage.getItem('crytotool_ad_inactivity');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [destructCountdownSeconds, setDestructCountdownSeconds] = useState(() => {
    const saved = localStorage.getItem('crytotool_ad_countdown');
    return saved ? parseInt(saved, 10) : 30;
  });

  const destructRef = useRef<AutoDestructCountdownHandle>(null);

  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<string[] | null>(null);
  const masterKeyRef = useRef<Uint8Array | null>(null);
  const [recoveryWrappersCount, setRecoveryWrappersCount] = useState(() => {
    const raw = localStorage.getItem('crytotool_vault_wrappers');
    if (!raw) return 0;
    try {
      const wrappers: VaultWrappers = JSON.parse(raw);
      return Object.keys(wrappers.recovery || {}).length;
    } catch { return 0; }
  });

  const syncRecoveryCount = () => {
    const raw = localStorage.getItem('crytotool_vault_wrappers');
    if (!raw) { setRecoveryWrappersCount(0); return; }
    try {
      const wrappers: VaultWrappers = JSON.parse(raw);
      setRecoveryWrappersCount(Object.keys(wrappers.recovery || {}).length);
    } catch { setRecoveryWrappersCount(0); }
  };

  const downloadCodes = (codes: string[], randomFilename?: boolean) => {
    const header = 'CrytoTool Recovery Codes\nGenerated: ' + new Date().toISOString().split('T')[0] + '\n\u2500'.repeat(30) + '\n\n';
    const content = header + codes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const rand = () => Math.random().toString(36).substring(2, 10);
    a.download = randomFilename ? `codes-${rand()}.txt` : 'crytotool-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !autoDestructEnabled || autoDestructInactivity === 0) return;
    const lastActivityKey = 'crytotool_last_activity';
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (isBlurred) setIsBlurred(false);
    };
    if (!localStorage.getItem(lastActivityKey)) {
      lastActivityRef.current = Date.now();
    } else {
      lastActivityRef.current = parseInt(localStorage.getItem(lastActivityKey)!, 10);
    }
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleActivity));
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastActivityRef.current) / 1000;
      if (elapsed >= autoDestructInactivity) {
        performWipe();
        return;
      }
      if (elapsed >= autoLockSeconds) {
        handleLock();
        return;
      }
      if (elapsed >= autoBlurSeconds) {
        if (!isBlurred) setIsBlurred(true);
      }
    }, 1000);
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(intervalId);
    };
  }, [isAuthenticated, isBlurred, autoBlurSeconds, autoLockSeconds, autoDestructInactivity, autoDestructEnabled]);

  useEffect(() => {
    if (isAuthenticated || !autoDestructEnabled || autoDestructInactivity === 0) return;
    const lastActivityKey = 'crytotool_last_activity';
    const checkInactivityOnAuthScreen = setInterval(() => {
      const lastActivity = localStorage.getItem(lastActivityKey);
      if (lastActivity) {
        const elapsed = (Date.now() - parseInt(lastActivity, 10)) / 1000;
        if (elapsed >= autoDestructInactivity) {
          performWipe();
        }
      }
    }, 1000);
    return () => clearInterval(checkInactivityOnAuthScreen);
  }, [isAuthenticated, autoDestructEnabled, autoDestructInactivity]);

  const performWipe = async () => {
    try {
      await db.clearDatabase();
      localStorage.clear();
      sessionStorage.clear();
      setVaultKey(null);
      window.location.reload();
    } catch (e) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleUnlock = () => {
    setIsAuthenticated(true);
    setIsSetupRequired(false);
    setIsBlurred(false);
    setFailedAttempts(0);
    setLockUntil(null);
    destructRef.current?.cancel();
    lastActivityRef.current = Date.now();
  };

  const handleFailedAttempt = () => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);

    if (autoDestructEnabled && autoDestructAttempts > 0 && newCount >= autoDestructAttempts) {
      setLockUntil(null);
      destructRef.current?.trigger(destructCountdownSeconds);
    } else if (newCount >= failedAttemptsThreshold) {
      const lockDuration = progressiveLockSeconds * 1000;
      setLockUntil(Date.now() + lockDuration);
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setIsBlurred(false);
    setVaultKey(null);
    masterKeyRef.current = null;
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (isBlurred) setIsBlurred(false);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastActivityRef.current) / 1000;

      if (autoDestructEnabled && autoDestructInactivity > 0 && elapsed >= autoDestructInactivity) {
        performWipe();
        return;
      }

      if (elapsed >= autoLockSeconds) {
        handleLock();
        return;
      }

      if (elapsed >= autoBlurSeconds) {
        if (!isBlurred) setIsBlurred(true);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(intervalId);
    };
  }, [isAuthenticated, isBlurred, autoBlurSeconds, autoLockSeconds, autoDestructInactivity, autoDestructEnabled]);

  const resetMasterPasswordWithRecovery = async (code: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const idx = parse_code_index(code);
      if (!idx) return { success: false, error: 'Format cod invalid' };

      const wrappersRaw = localStorage.getItem('crytotool_vault_wrappers');
      const metadataRaw = localStorage.getItem('crytotool_crypto_metadata');
      if (!wrappersRaw || !metadataRaw) return { success: false, error: 'Date lipsă' };

      const wrappers: VaultWrappers = JSON.parse(wrappersRaw);
      const meta: CryptoMetadata = JSON.parse(metadataRaw);

      const recoveryWrapper = wrappers.recovery[idx];
      if (!recoveryWrapper) return { success: false, error: 'Cod de recuperare deja folosit sau invalid' };

      const saltIdx = parseInt(idx, 10) - 1;
      if (saltIdx < 0 || saltIdx >= meta.recovery_salts.length) return { success: false, error: 'Salt lipsă' };

      const recoverySalt = base64_decode(meta.recovery_salts[saltIdx]);
      const recoveryParams = JSON.parse(get_argon_params('recovery', meta.tier || 1));
      const recoveryKey = await derive_key(new TextEncoder().encode(code), recoverySalt, recoveryParams.iterations, recoveryParams.memorySize, recoveryParams.parallelism, 32);

      let mvkBytes: Uint8Array;
      try {
        mvkBytes = await unwrap_raw_key(JSON.stringify(recoveryWrapper), recoveryKey);
      } catch {
        return { success: false, error: 'Cod de recuperare invalid' };
      }

      const newMasterSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const ap = meta.argon || { iterations: 2, memoryKib: 19456, parallelism: 1 };
      const newMasterKey = derive_key(new TextEncoder().encode(newPassword), newMasterSalt, ap.iterations, ap.memoryKib, ap.parallelism, 32);
      const newMasterWrapper = await wrap_raw_key(mvkBytes, newMasterKey);

      delete wrappers.recovery[idx];
      meta.master_salt = base64_encode(newMasterSalt);
      wrappers.master = JSON.parse(newMasterWrapper);

      localStorage.setItem('crytotool_crypto_metadata', JSON.stringify(meta));
      localStorage.setItem('crytotool_vault_wrappers', JSON.stringify(wrappers));

      setVaultKey(mvkBytes);
      masterKeyRef.current = newMasterKey;
      syncRecoveryCount();

      return { success: true };
    } catch (e) {
      return { success: false, error: 'Eroare la resetare' };
    }
  };

  const generateNewRecoveryCodes = async () => {
    const wrappersRaw = localStorage.getItem('crytotool_vault_wrappers');
    const metadataRaw = localStorage.getItem('crytotool_crypto_metadata');
    if (!wrappersRaw || !metadataRaw) return;
    if (!masterKeyRef.current) return;

    const wrappers: VaultWrappers = JSON.parse(wrappersRaw);
    if (!wrappers.master) return;
    const meta: CryptoMetadata = JSON.parse(metadataRaw);

    let mvkBytes: Uint8Array;
    try {
      mvkBytes = await unwrap_raw_key(JSON.stringify(wrappers.master), masterKeyRef.current);
    } catch {
      return;
    }

    const codes = generate_recovery_codes();
    const salts: string[] = [];
    const recoveryWrappers: Record<string, { ciphertext: string; iv: string }> = {};
    const recoveryParams = JSON.parse(get_argon_params('recovery', meta.tier || 1));

    for (let i = 0; i < codes.length; i++) {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      salts.push(base64_encode(salt));
      const key = await derive_key(new TextEncoder().encode(codes[i]), salt, recoveryParams.iterations, recoveryParams.memorySize, recoveryParams.parallelism, 32);
      const paddedIdx = String(i + 1).padStart(2, '0');
      recoveryWrappers[paddedIdx] = JSON.parse(await wrap_raw_key(mvkBytes, key));
    }

    mvkBytes.fill(0);

    meta.recovery_salts = salts;
    localStorage.setItem('crytotool_crypto_metadata', JSON.stringify(meta));
    wrappers.recovery = recoveryWrappers;
    localStorage.setItem('crytotool_vault_wrappers', JSON.stringify(wrappers));

    setNewlyGeneratedCodes(codes);
    downloadCodes(codes, (meta.tier || 1) >= 2);
    syncRecoveryCount();
  };

  const applyThreatModel = (config: {
    autoBlurSeconds: number; autoLockSeconds: number; failedAttemptsThreshold: number;
    progressiveLockSeconds: number; autoDestructEnabled: boolean; autoDestructAttempts: number;
    autoDestructInactivity: number; destructCountdownSeconds: number;
    minPasswordLength?: number; settingsPasswordRequired?: boolean;
    vaultPinAllowed?: boolean;
  }) => {
    setAutoBlurSeconds(config.autoBlurSeconds);
    localStorage.setItem('crytotool_blur_time', config.autoBlurSeconds.toString());
    setAutoLockSeconds(config.autoLockSeconds);
    localStorage.setItem('crytotool_lock_time', config.autoLockSeconds.toString());
    setProgressiveLockSeconds(config.progressiveLockSeconds);
    localStorage.setItem('crytotool_prog_lock_time', config.progressiveLockSeconds.toString());
    setFailedAttemptsThreshold(config.failedAttemptsThreshold);
    localStorage.setItem('crytotool_prog_attempts', config.failedAttemptsThreshold.toString());
    setAutoDestructEnabled(config.autoDestructEnabled);
    localStorage.setItem('crytotool_ad_enabled', config.autoDestructEnabled.toString());
    setAutoDestructAttempts(config.autoDestructAttempts);
    localStorage.setItem('crytotool_ad_attempts', config.autoDestructAttempts.toString());
    setAutoDestructInactivity(config.autoDestructInactivity);
    localStorage.setItem('crytotool_ad_inactivity', config.autoDestructInactivity.toString());
    setDestructCountdownSeconds(config.destructCountdownSeconds);
    localStorage.setItem('crytotool_ad_countdown', config.destructCountdownSeconds.toString());

    if (config.settingsPasswordRequired && !settingsPassword) {
      localStorage.setItem('crytotool_settings_password_required', 'true');
    } else if (config.settingsPasswordRequired === false) {
      localStorage.removeItem('crytotool_settings_password_required');
    }
    if (config.vaultPinAllowed === false && vaultEnabled) {
      updateVaultSettings(false, null);
    }
  };

  return (
    <I18nProvider>
    <div className="w-full min-h-screen bg-background text-primary font-sans selection:bg-neon-green selection:text-black relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : !isAuthenticated ? (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <AuthScreen
               onUnlock={handleUnlock}
               isSetup={isSetupRequired}
               lockUntil={lockUntil}
               onFailedAttempt={handleFailedAttempt}
               recoverySettings={{
                 count: recoveryWrappersCount
               }}
                onResetWithRecovery={resetMasterPasswordWithRecovery}
                onStoreMasterKey={(key) => { masterKeyRef.current = key; }}
                onApplyThreatModel={applyThreatModel}
                destructRef={destructRef}
                onDestructComplete={performWipe}
                onNewCodes={(codes) => {
                  setNewlyGeneratedCodes(codes);
                  const tier = (() => { try { return JSON.parse(localStorage.getItem('crytotool_crypto_metadata') || '{}').tier || 1; } catch { return 1; } })();
                  downloadCodes(codes, tier >= 2);
                  syncRecoveryCount();
                }}
             />
           </motion.div>
         ) : (
           <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative h-full">
              <Dashboard
                settingsLock={{
                  password: settingsPassword,
                  setPassword: updateSettingsPassword,
                  required: localStorage.getItem('crytotool_settings_password_required') === 'true'
                }}
                recoverySettings={{
                  codes: newlyGeneratedCodes,
                  count: recoveryWrappersCount,
                  regenerate: generateNewRecoveryCodes,
                  dismissCodes: () => setNewlyGeneratedCodes(null)
                }}
                vaultSettings={{
                  enabled: vaultEnabled,
                  pin: vaultPin,
                  update: updateVaultSettings,
                  tier: (() => {
                    try {
                      const m = JSON.parse(localStorage.getItem('crytotool_crypto_metadata') || '{}');
                      return m.tier || 1;
                    } catch { return 1; }
                  })(),
                  vaultPinAllowed: (() => {
                    try {
                      const m = JSON.parse(localStorage.getItem('crytotool_crypto_metadata') || '{}');
                      return (m.tier || 1) < 3;
                    } catch { return true; }
                  })()
                }}
                autoBlurSettings={{
                 value: autoBlurSeconds,
                 setValue: (v) => {
                   setAutoBlurSeconds(v);
                   localStorage.setItem('crytotool_blur_time', v.toString());
                 }
               }}
               autoLockSettings={{
                 value: autoLockSeconds,
                 setValue: (v) => {
                   setAutoLockSeconds(v);
                   localStorage.setItem('crytotool_lock_time', v.toString());
                 }
               }}
               progressiveLockSettings={{
                 lockTime: progressiveLockSeconds,
                 setLockTime: (v) => {
                   setProgressiveLockSeconds(v);
                   localStorage.setItem('crytotool_prog_lock_time', v.toString());
                 },
                 attempts: failedAttemptsThreshold,
                 setAttempts: (v) => {
                   setFailedAttemptsThreshold(v);
                   localStorage.setItem('crytotool_prog_attempts', v.toString());
                 }
               }}
                autoDestructSettings={{
                  enabled: autoDestructEnabled,
                  setEnabled: (v) => {
                     setAutoDestructEnabled(v);
                     localStorage.setItem('crytotool_ad_enabled', v.toString());
                  },
                  attempts: autoDestructAttempts,
                  setAttempts: (v) => {
                     setAutoDestructAttempts(v);
                     localStorage.setItem('crytotool_ad_attempts', v.toString());
                  },
                  inactivitySeconds: autoDestructInactivity,
                  setInactivitySeconds: (v) => {
                     setAutoDestructInactivity(v);
                     localStorage.setItem('crytotool_ad_inactivity', v.toString());
                  },
                  countdownSeconds: destructCountdownSeconds,
                    setCountdownSeconds: (v: number) => {
                      setDestructCountdownSeconds(v);
                      localStorage.setItem('crytotool_ad_countdown', v.toString());
                    }
                 }}
               />

              <AnimatePresence>
                {isBlurred && (
                  <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    className="fixed inset-0 z-[100] bg-black/60 cursor-pointer"
                    onClick={() => { lastActivityRef.current = Date.now(); setIsBlurred(false); }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
    </I18nProvider>
  );
};

export default App;
