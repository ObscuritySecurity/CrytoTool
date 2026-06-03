import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { cryptoService } from './utils/crypto';
import { db } from './utils/db';
import { I18nProvider } from './locales/i18nContext';
import { hashPin } from './utils/security';
import {
  deriveKey,
  wrapRawKey,
  unwrapRawKey,
  base64ToBytes,
  bytesToBase64,
  generateRecoveryCodes,
  parseCodeIndex,
} from './utils/keyWrapping';
import type { CryptoMetadata, VaultWrappers } from './utils/keyWrapping';

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
      const hash = await hashPin(pin);
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

  const [destructCountdown, setDestructCountdown] = useState<number | null>(() => {
    const saved = localStorage.getItem('crytotool_destruct_time');
    if (saved) {
      const remaining = Math.max(0, Math.ceil((parseInt(saved, 10) - Date.now()) / 1000));
      return remaining > 0 ? remaining : null;
    }
    return null;
  });
  const [destructTriggerTime, setDestructTriggerTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('crytotool_destruct_time');
    return saved ? parseInt(saved, 10) : null;
  });

  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<string[] | null>(null);
  const mvkBytesRef = useRef<Uint8Array | null>(null);
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

  const downloadCodes = (codes: string[]) => {
    const header = 'CrytoTool Recovery Codes\nGenerated: ' + new Date().toISOString().split('T')[0] + '\n\u2500'.repeat(30) + '\n\n';
    const content = header + codes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crytotool-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !autoDestructEnabled || autoDestructInactivity === 0) return;
    const lastActivityKey = 'crytotool_last_activity';
    const handleActivity = () => {
      localStorage.setItem(lastActivityKey, Date.now().toString());
      lastActivityRef.current = Date.now();
      if (isBlurred) setIsBlurred(false);
    };
    if (!localStorage.getItem(lastActivityKey)) {
      localStorage.setItem(lastActivityKey, Date.now().toString());
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

  useEffect(() => {
    if (isAuthenticated || !destructTriggerTime) return;
    const storedDestructTime = localStorage.getItem('crytotool_destruct_time');
    if (storedDestructTime) {
      setDestructTriggerTime(parseInt(storedDestructTime, 10));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || !destructTriggerTime) return;
    const intervalId = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((destructTriggerTime - Date.now()) / 1000));
      setDestructCountdown(remaining);
      if (remaining <= 0) {
        localStorage.removeItem('crytotool_destruct_time');
        performWipe();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, destructTriggerTime]);

  const performWipe = async () => {
    try {
      await db.clearDatabase();
      localStorage.clear();
      sessionStorage.clear();
      cryptoService.clearKeys();
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
    lastActivityRef.current = Date.now();
  };

  const handleFailedAttempt = () => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);

    if (autoDestructEnabled && autoDestructAttempts > 0) {
      if (newCount >= autoDestructAttempts) {
        if (!destructTriggerTime) {
          setDestructCountdown(destructCountdownSeconds);
          const triggerTime = Date.now() + (destructCountdownSeconds * 1000);
          setDestructTriggerTime(triggerTime);
          localStorage.setItem('crytotool_destruct_time', triggerTime.toString());
        }
      }
    } else {
      if (newCount >= failedAttemptsThreshold) {
        const lockDuration = progressiveLockSeconds * 1000;
        setLockUntil(Date.now() + lockDuration);
      }
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setIsBlurred(false);
    cryptoService.clearKeys();
    mvkBytesRef.current = null;
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
      const idx = parseCodeIndex(code);
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

      const recoverySalt = base64ToBytes(meta.recovery_salts[saltIdx]);
      const recoveryKey = await deriveKey(code, recoverySalt, { iterations: 3, memorySize: 65536, parallelism: 1 });

      let mvkBytes: Uint8Array;
      try {
        mvkBytes = await unwrapRawKey(recoveryWrapper, recoveryKey);
      } catch {
        return { success: false, error: 'Cod de recuperare invalid' };
      }

      const newMasterSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const newMasterKey = await deriveKey(newPassword, newMasterSalt, { iterations: 19, memorySize: 131072, parallelism: 4 });
      const newMasterWrapper = await wrapRawKey(mvkBytes, newMasterKey);

      delete wrappers.recovery[idx];
      meta.master_salt = bytesToBase64(newMasterSalt);
      wrappers.master = newMasterWrapper;

      localStorage.setItem('crytotool_crypto_metadata', JSON.stringify(meta));
      localStorage.setItem('crytotool_vault_wrappers', JSON.stringify(wrappers));

      const mvk = await window.crypto.subtle.importKey(
        'raw',
        mvkBytes as unknown as BufferSource,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
      cryptoService.setVaultKey(mvk);
      mvkBytesRef.current = mvkBytes;
      syncRecoveryCount();

      return { success: true };
    } catch (e) {
      return { success: false, error: 'Eroare la resetare' };
    }
  };

  const generateNewRecoveryCodes = async () => {
    if (!mvkBytesRef.current) return;
    const mvkBytes = mvkBytesRef.current;

    const codes = generateRecoveryCodes();
    const salts: string[] = [];
    const recoveryWrappers: Record<string, { ciphertext: string; iv: string }> = {};

    for (let i = 0; i < codes.length; i++) {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      salts.push(bytesToBase64(salt));
      const key = await deriveKey(codes[i], salt, { iterations: 3, memorySize: 65536, parallelism: 1 });
      const paddedIdx = String(i + 1).padStart(2, '0');
      recoveryWrappers[paddedIdx] = await wrapRawKey(mvkBytes, key);
    }

    const metaRaw = localStorage.getItem('crytotool_crypto_metadata');
    if (!metaRaw) return;
    const meta: CryptoMetadata = JSON.parse(metaRaw);
    meta.recovery_salts = salts;
    localStorage.setItem('crytotool_crypto_metadata', JSON.stringify(meta));

    const wrappersRaw = localStorage.getItem('crytotool_vault_wrappers');
    if (!wrappersRaw) return;
    const wrappers: VaultWrappers = JSON.parse(wrappersRaw);
    wrappers.recovery = recoveryWrappers;
    localStorage.setItem('crytotool_vault_wrappers', JSON.stringify(wrappers));

    setNewlyGeneratedCodes(codes);
    downloadCodes(codes);
    syncRecoveryCount();
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
              onStoreMvkBytes={(bytes) => { mvkBytesRef.current = bytes; }}
              destructCountdown={destructCountdown}
              onNewCodes={(codes) => {
                setNewlyGeneratedCodes(codes);
                downloadCodes(codes);
                syncRecoveryCount();
              }}
            />
          </motion.div>
        ) : (
           <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative h-full">
              <Dashboard
                settingsLock={{
                  password: settingsPassword,
                  setPassword: updateSettingsPassword
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
                  update: updateVaultSettings
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
                destructCountdown={destructCountdown}
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
