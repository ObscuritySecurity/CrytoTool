
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './components/SplashScreen';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { Lock } from 'lucide-react';
import { cryptoService } from './utils/crypto';
import { db } from './utils/db';
import { I18nProvider } from './utils/i18nContext';
import { hashPin } from './utils/security';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
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

  // --- SETTINGS LOCK ---
  // Settings password is kept in memory only (not persisted) for security
  const [settingsPassword, setSettingsPassword] = useState<string | null>(null);

  const updateSettingsPassword = (pwd: string | null) => {
    setSettingsPassword(pwd);
  };

  // --- VAULT SETTINGS (NEW) ---
  // Vault is disabled by default for new users
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

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const [isBlurred, setIsBlurred] = useState(false);
  const lastActivityRef = useRef(Date.now());

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
    
    if (autoDestructEnabled) {
        if (newCount >= autoDestructAttempts) {
            performWipe();
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

      // Auto-destruct by inactivity (optional feature)
      if (autoDestructEnabled && autoDestructInactivity > 0 && elapsed >= autoDestructInactivity) {
        performWipe();
      } else if (elapsed >= autoLockSeconds) {
        handleLock();
      } else if (elapsed >= autoBlurSeconds) {
        if (!isBlurred) setIsBlurred(true);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(intervalId);
    };
  }, [isAuthenticated, isBlurred, autoBlurSeconds, autoLockSeconds]);

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
            />
          </motion.div>
        ) : (
           <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative h-full">
             <Dashboard 
               settingsLock={{
                 password: settingsPassword,
                 setPassword: updateSettingsPassword
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
                 }
               }}
             />
             
             <AnimatePresence>
               {isBlurred && (
                 <motion.div 
                   initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                   animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
                   exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                   className="fixed inset-0 z-[100] bg-black/60 flex flex-col items-center justify-center cursor-pointer"
                   onClick={() => { lastActivityRef.current = Date.now(); setIsBlurred(false); }}
                 >
                    <div className="bg-zinc-950 p-10 rounded-[40px] border border-zinc-800 flex flex-col items-center shadow-2xl">
                      <div className="p-6 bg-neon-green/10 rounded-full mb-6 animate-pulse border border-neon-green/20">
                        <Lock className="text-neon-green" size={56} />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-2">Seif Protejat</h2>
                      <p className="text-zinc-500 font-medium">Interacționează pentru a debloca vizualizarea</p>
                    </div>
                 </motion.div>
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
