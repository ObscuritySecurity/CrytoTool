
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { cryptoService } from './utils/crypto';
import { db } from './utils/db';
import { I18nProvider } from './locales/i18nContext';
import { hashPin } from './utils/security';

async function hashWithSalt(code: string, salt: Uint8Array): Promise<string> {
  const combined = new Uint8Array([...salt, ...new TextEncoder().encode(code)]);
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!showSplash) {
      // StatusBar handled internally
    }
  }, [showSplash]);
  
  const [isSetupRequired, setIsSetupRequired] = useState(() => {
    const salt = localStorage.getItem('crytotool_salt');
    return !salt;
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

  // --- SETTINGS LOCK ---
  // Settings password is kept in memory only (not persisted) for security
  const [settingsPassword, setSettingsPassword] = useState<string | null>(null);

  const updateSettingsPassword = (pwd: string | null) => {
    setSettingsPassword(pwd);
  };

  // --- VAULT SETTINGS (NEW) ---
  // Vault is disabled by default for new people
  const [vaultEnabled, setVaultEnabled] = useState(() => {
    const saved = localStorage.getItem('crytotool_vault_enabled');
    return saved !== null ? saved === 'true' : false;
  });
  // Vault PIN - stored as hash in localStorage
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

  // --- PROGRESSIVE LOCK SETTINGS ---
  const [progressiveLockSeconds, setProgressiveLockSeconds] = useState(() => {
    const saved = localStorage.getItem('crytotool_prog_lock_time');
    return saved ? parseInt(saved, 10) : 60;
  });

  const [failedAttemptsThreshold, setFailedAttemptsThreshold] = useState(() => {
    const saved = localStorage.getItem('crytotool_prog_attempts');
    return saved ? parseInt(saved, 10) : 3;
  });

  // --- AUTO DESTRUCT SETTINGS ---
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

  // --- RECOVERY CODES (Stored as salted SHA-256 hashes only) ---
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryHashes, setRecoveryHashes] = useState<{ salt: string; hash: string }[]>(() => {
    try {
      const saved = localStorage.getItem('crytotool_recovery_hashes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const generateRecoveryCodes = (): string[] => {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 10; i++) {
      let code = '';
      const randomValues = new Uint8Array(8);
      window.crypto.getRandomValues(randomValues);
      for (let j = 0; j < 8; j++) {
        code += chars[randomValues[j] % chars.length];
        if ((j + 1) % 4 === 0 && j !== 7) code += '-';
      }
      codes.push(code);
    }
    return codes;
  };

  const saveCodeHashes = async (codes: string[]) => {
    const entries: { salt: string; hash: string }[] = [];
    for (const code of codes) {
      const normalized = code.replace(/-/g, '').toUpperCase();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      const hash = await hashWithSalt(normalized, salt);
      entries.push({ salt: saltHex, hash });
    }
    setRecoveryHashes(entries);
    localStorage.setItem('crytotool_recovery_hashes', JSON.stringify(entries));
  };

  const regenerateRecoveryCodes = async () => {
    const newCodes = generateRecoveryCodes();
    setRecoveryCodes(newCodes);
    await saveCodeHashes(newCodes);
  };

  const downloadRecoveryCodes = () => {
    const date = new Date().toISOString().split('T')[0];
    const lines = [
      'CrytoTool - Recovery Codes',
      '========================',
      `Generated: ${date}`,
      '',
      'Each code can be used ONLY ONCE to reset your Master Password.',
      '',
      ...recoveryCodes.map((code, i) => {
        const num = String(i + 1).padStart(2, '0');
        return `Code ${num}: ${code}`;
      }),
      '',
      'Store this file securely. Do not share it.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crytotool-recovery-codes-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearRecoveryCodes = () => {
    setRecoveryCodes([]);
  };

  const verifyRecoveryCode = async (code: string): Promise<boolean> => {
    const normalized = code.replace(/-/g, '').toUpperCase();
    for (const entry of recoveryHashes) {
      const salt = new Uint8Array(entry.salt.match(/.{2}/g)!.map(b => parseInt(b, 16)));
      const hash = await hashWithSalt(normalized, salt);
      if (hash === entry.hash) return true;
    }
    return false;
  };

  const consumeRecoveryCode = async (code: string): Promise<boolean> => {
    const normalized = code.replace(/-/g, '').toUpperCase();
    for (let i = 0; i < recoveryHashes.length; i++) {
      const salt = new Uint8Array(recoveryHashes[i].salt.match(/.{2}/g)!.map(b => parseInt(b, 16)));
      const hash = await hashWithSalt(normalized, salt);
      if (hash === recoveryHashes[i].hash) {
        const updatedHashes = recoveryHashes.filter((_, idx) => idx !== i);
        setRecoveryHashes(updatedHashes);
        localStorage.setItem('crytotool_recovery_hashes', JSON.stringify(updatedHashes));
        return true;
      }
    }
    return false;
  };

  const resetMasterPasswordWithRecovery = async (code: string, newPassword: string) => {
    if (!await consumeRecoveryCode(code)) {
      return { success: false, error: 'Cod invalid' };
    }

    try {
      // Generate new salt and derive new master key
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const masterKey = await cryptoService.deriveMasterKey(newPassword, salt);
      const vaultKey = await cryptoService.generateVaultKey();
      const rawVaultKey = await window.crypto.subtle.exportKey('raw', vaultKey);
      const encryptedVault = await cryptoService.encrypt(new Uint8Array(rawVaultKey), masterKey);

      // Save new credentials
      localStorage.setItem('crytotool_salt', cryptoService.arrayBufferToBase64(salt));
      localStorage.setItem('crytotool_iv', cryptoService.arrayBufferToBase64(encryptedVault.iv));
      localStorage.setItem('crytotool_vault_blob', cryptoService.arrayBufferToBase64(encryptedVault.ciphertext));

      cryptoService.setVaultKey(vaultKey);

      return { success: true };
    } catch (e) {
      return { success: false, error: 'Eroare la resetare' };
    }
  };

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  // Auto-destruct on inactivity is implemented as part of the activity timer below.
  // We intentionally avoid persisting any activity logs; this check relies on in-memory
  // timestamps to determine inactivity.
  useEffect(() => {
    // no-op: we keep this hook for parity, actual destruction is handled in the main timer
  }, [autoDestructEnabled, autoDestructInactivity, isSetupRequired]);

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

  const handleUnlock = (vaultKey: CryptoKey) => {
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
    if (isAuthenticated) {
        // Do not persist last login timestamp
    }
    setIsAuthenticated(false);
    setIsBlurred(false);
    cryptoService.clearKeys();
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
                  verify: verifyRecoveryCode,
                  consume: consumeRecoveryCode,
                  codes: recoveryCodes,
                  codesCount: recoveryHashes.length
                }}
                onResetWithRecovery={resetMasterPasswordWithRecovery}
               destructCountdown={destructCountdown}
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
                  codes: recoveryCodes,
                  regenerate: regenerateRecoveryCodes,
                  verify: verifyRecoveryCode,
                  consume: consumeRecoveryCode,
                  downloadCodes: downloadRecoveryCodes,
                  clearCodes: clearRecoveryCodes,
                  codesCount: recoveryHashes.length
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
