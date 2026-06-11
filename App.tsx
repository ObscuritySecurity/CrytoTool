import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { AutoDestructCountdown } from './components/AutoDestructCountdown';
import type { AutoDestructCountdownHandle } from './components/AutoDestructCountdown';
import { cryptoService } from './utils/crypto';
import { db } from './utils/db';
import { I18nProvider } from './locales/i18nContext';
import { hashPin } from './utils/security';
import {
  checkBiometricAvailability, retrieveMasterKeyBiometric, storeMasterKeyBiometric,
  removeBiometricKey, isBiometricEnabled, setBiometricEnabled,
} from './utils/biometric';
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

  const destructRef = useRef<AutoDestructCountdownHandle>(null);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(() => isBiometricEnabled());

  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<string[] | null>(null);
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const biometricAttemptedRef = useRef(false);
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

  useEffect(() => {
    if (showSplash) return;
    checkBiometricAvailability().then(r => setBiometricAvailable(r.available));
  }, [showSplash]);

  useEffect(() => {
    if (showSplash) return;
    if (isAuthenticated) return;
    if (!biometricEnabled) return;
    if (biometricAttemptedRef.current) return;
    biometricAttemptedRef.current = true;
    (async () => {
      const availability = await checkBiometricAvailability();
      setBiometricAvailable(availability.available);
      if (!availability.available) return;
      const rawBytes = await retrieveMasterKeyBiometric();
      if (!rawBytes) return;
      try {
        const masterKey = await window.crypto.subtle.importKey(
          'raw', rawBytes as BufferSource, { name: 'AES-GCM' },
          false, ['encrypt', 'decrypt'],
        );
        rawBytes.fill(0);
        const wrappersRaw = localStorage.getItem('crytotool_vault_wrappers');
        if (!wrappersRaw) return;
        const wrappers = JSON.parse(wrappersRaw);
        const mvkBytes = await unwrapRawKey(wrappers.master, masterKey);
        const mvk = await window.crypto.subtle.importKey(
          'raw', mvkBytes as unknown as BufferSource, { name: 'AES-GCM' },
          false, ['encrypt', 'decrypt'],
        );
        cryptoService.setVaultKey(mvk);
        mvkBytes.fill(0);
        masterKeyRef.current = masterKey;
        handleUnlock();
      } catch {
        /* fall through to AuthScreen */
      }
    })();
  }, [showSplash, biometricAvailable, biometricEnabled, isAuthenticated]);

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
    cryptoService.clearKeys();
    masterKeyRef.current = null;
    biometricAttemptedRef.current = false;
  };

  const enableBiometric = async (): Promise<boolean> => {
    if (!masterKeyRef.current) return false;
    const raw = await window.crypto.subtle.exportKey('raw', masterKeyRef.current);
    const bytes = new Uint8Array(raw);
    const ok = await storeMasterKeyBiometric(bytes);
    if (ok) setBiometricEnabledState(true);
    return ok;
  };

  const disableBiometric = async (): Promise<boolean> => {
    const ok = await removeBiometricKey();
    if (ok) setBiometricEnabledState(false);
    return ok;
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
      const recoveryKey = await deriveKey(code, recoverySalt, 'recovery');

      let mvkBytes: Uint8Array;
      try {
        mvkBytes = await unwrapRawKey(recoveryWrapper, recoveryKey);
      } catch {
        return { success: false, error: 'Cod de recuperare invalid' };
      }

      const newMasterSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const newMasterKey = await deriveKey(newPassword, newMasterSalt, 'master');
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
        false,
        ['encrypt', 'decrypt']
      );
      cryptoService.setVaultKey(mvk);
      masterKeyRef.current = newMasterKey;
      syncRecoveryCount();

      if (biometricEnabled) {
        const newRaw = await window.crypto.subtle.exportKey('raw', newMasterKey);
        const newBytes = new Uint8Array(newRaw);
        await storeMasterKeyBiometric(newBytes);
        newBytes.fill(0);
      }

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
      mvkBytes = await unwrapRawKey(wrappers.master, masterKeyRef.current);
    } catch {
      return;
    }

    const codes = generateRecoveryCodes();
    const salts: string[] = [];
    const recoveryWrappers: Record<string, { ciphertext: string; iv: string }> = {};

    for (let i = 0; i < codes.length; i++) {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      salts.push(bytesToBase64(salt));
      const key = await deriveKey(codes[i], salt, 'recovery');
      const paddedIdx = String(i + 1).padStart(2, '0');
      recoveryWrappers[paddedIdx] = await wrapRawKey(mvkBytes, key);
    }

    mvkBytes.fill(0);

    meta.recovery_salts = salts;
    localStorage.setItem('crytotool_crypto_metadata', JSON.stringify(meta));
    wrappers.recovery = recoveryWrappers;
    localStorage.setItem('crytotool_vault_wrappers', JSON.stringify(wrappers));

    setNewlyGeneratedCodes(codes);
    downloadCodes(codes);
    syncRecoveryCount();
  };

  const handleSetupComplete = async (biometricWanted: boolean) => {
    if (biometricWanted && biometricAvailable) {
      await enableBiometric();
    }
    handleUnlock();
  };

  const applyThreatModel = (config: {
    autoBlurSeconds: number; autoLockSeconds: number; failedAttemptsThreshold: number;
    progressiveLockSeconds: number; autoDestructEnabled: boolean; autoDestructAttempts: number;
    autoDestructInactivity: number; destructCountdownSeconds: number;
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
               onSetupComplete={handleSetupComplete}
               destructRef={destructRef}
               onDestructComplete={performWipe}
               onNewCodes={(codes) => {
                setNewlyGeneratedCodes(codes);
                downloadCodes(codes);
                syncRecoveryCount();
              }}
              biometricAvailable={biometricAvailable}
              biometricEnabled={biometricEnabled}
              onBiometricUnlock={async () => {
                const rawBytes = await retrieveMasterKeyBiometric();
                if (!rawBytes) throw new Error('Biometric unlock cancelled');
                const masterKey = await window.crypto.subtle.importKey(
                  'raw', rawBytes as BufferSource, { name: 'AES-GCM' },
                  false, ['encrypt', 'decrypt'],
                );
                const wrappersRaw = localStorage.getItem('crytotool_vault_wrappers');
                if (!wrappersRaw) throw new Error('No vault wrappers');
                const wrappers = JSON.parse(wrappersRaw);
                const mvkBytes = await unwrapRawKey(wrappers.master, masterKey);
                const mvk = await window.crypto.subtle.importKey(
                  'raw', mvkBytes as unknown as BufferSource, { name: 'AES-GCM' },
                  false, ['encrypt', 'decrypt'],
                );
                cryptoService.setVaultKey(mvk);
                mvkBytes.fill(0);
                masterKeyRef.current = masterKey;
                handleUnlock();
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
                biometricSettings={{
                  available: biometricAvailable,
                  enabled: biometricEnabled,
                  enable: enableBiometric,
                  disable: disableBiometric,
                  setAvailable: setBiometricAvailable,
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
