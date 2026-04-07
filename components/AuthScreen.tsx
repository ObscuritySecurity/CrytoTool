
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, Loader2, ShieldCheck, Timer, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { cryptoService } from '../utils/crypto';
import { useI18n } from '../utils/i18nContext';
import { TranslationKey } from '../utils/i18n';

interface AuthScreenProps {
  onUnlock: (vaultKey: CryptoKey) => void;
  isSetup: boolean;
  lockUntil: number | null;
  onFailedAttempt: () => void;
  recoverySettings?: {
    verify: (code: string) => boolean;
    consume: (code: string) => boolean;
    codes: string[];
  };
  onResetWithRecovery: (code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onUnlock, isSetup, lockUntil, onFailedAttempt, recoverySettings, onResetWithRecovery }) => {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Recovery mode state
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const accentColor = localStorage.getItem('theme_accent') || '#39ff14';
  const accentRgb = (() => {
    const c = accentColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)}`;
  })();

  useEffect(() => {
    if (!lockUntil) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const isLocked = timeLeft > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError(null);
    setIsProcessing(true);

    try {
      if (isSetup) {
        if (password.length < 30) {
          setError(t('passwordTooShort'));
          setIsProcessing(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('passwordsDoNotMatch'));
          setIsProcessing(false);
          return;
        }

        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const masterKey = await cryptoService.deriveMasterKey(password, salt);
        const vaultKey = await cryptoService.generateVaultKey();
        const rawVaultKey = await window.crypto.subtle.exportKey('raw', vaultKey);
        const encryptedVault = await cryptoService.encrypt(new Uint8Array(rawVaultKey), masterKey);
        
        localStorage.setItem('crytotool_salt', cryptoService.arrayBufferToBase64(salt));
        localStorage.setItem('crytotool_iv', cryptoService.arrayBufferToBase64(encryptedVault.iv));
        localStorage.setItem('crytotool_vault_blob', cryptoService.arrayBufferToBase64(encryptedVault.ciphertext));
        
        cryptoService.setVaultKey(vaultKey);
        onUnlock(vaultKey);
      } else {
        const saltB64 = localStorage.getItem('crytotool_salt');
        const ivB64 = localStorage.getItem('crytotool_iv');
        const vaultB64 = localStorage.getItem('crytotool_vault_blob');

        if (!saltB64 || !ivB64 || !vaultB64) {
          setError(t('missingData'));
          setIsProcessing(false);
          return;
        }

        const salt = cryptoService.base64ToArrayBuffer(saltB64);
        const iv = cryptoService.base64ToArrayBuffer(ivB64);
        const encryptedVault = cryptoService.base64ToArrayBuffer(vaultB64);

        const masterKey = await cryptoService.deriveMasterKey(password, salt);

        try {
          const rawVaultKey = await cryptoService.decrypt(encryptedVault, iv, masterKey);
          const vaultKey = await window.crypto.subtle.importKey(
            'raw',
            rawVaultKey.buffer as ArrayBuffer,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
          );
          
          cryptoService.setVaultKey(vaultKey);
          onUnlock(vaultKey);
        } catch (err) {
          setError(t('wrongPassword'));
          setPassword('');
          onFailedAttempt();
        }
      }
    } catch (err) {
      console.error(err);
      setError(t('cryptoError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const Logo = () => (
    <div className="relative w-32 h-32 flex items-center justify-center mb-6">
      <div className={`absolute inset-0 ${isLocked ? 'bg-red-500/10' : 'blur-[40px] rounded-full transition-colors duration-500'}`} style={{ backgroundColor: isLocked ? undefined : `rgba(${accentRgb}, 0.1)` }} />
      <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: `drop-shadow(0 0 15px rgba(${isLocked ? '239, 68, 68' : accentRgb}, 0.5))` }}>
        <path d="M30 40 V25 A20 20 0 0 1 70 25 V40" stroke={isLocked ? '#ef4444' : accentColor} strokeWidth="10" strokeLinecap="round" fill="none" className="transition-colors duration-500" />
        <rect x="15" y="40" width="70" height="45" rx="10" fill="none" stroke={isLocked ? '#ef4444' : accentColor} strokeWidth="8" className="transition-colors duration-500" />
        
        {isLocked ? (
           <path d="M40 55 L60 75 M60 55 L40 75" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" fill="none" />
        ) : (
           <path d="M42 61 L50 69 L62 53" stroke={accentColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
      </svg>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center bg-black p-4 font-sans text-primary min-h-screen">
      <div className="flex flex-col items-center mb-2">
        <Logo />
        <div className="text-3xl font-bold tracking-tight mb-8">
          <span className={`font-bold tracking-tight ${isLocked ? 'text-red-500' : 'text-white'}`}>Cryto</span>
          <span style={{ color: isLocked ? '#ef4444' : accentColor }}>Tool</span>
        </div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-md glass-card border ${isLocked ? 'border-red-500/50' : 'border-white/10'} rounded-3xl p-6 relative overflow-hidden mt-8`}
      >
        <div className="mb-8">
          <h1 className={`text-2xl font-bold mb-3 ${isLocked ? 'text-red-500' : 'text-primary'}`}>
            {isLocked ? t('lockedOut') : (isSetup ? t('setupPassword') : t('unlock'))}
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            {isLocked 
              ? `${t('securityLockout')} ${t('tryAgainIn')} ${timeLeft} ${t('processing')}`
              : (isSetup 
                  ? `${t('argon2idAES')} ${t('min30Chars')}` 
                  : t('enterMasterPassword')
                )
            }
          </p>
        </div>

        {isLocked && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-8 bg-red-500/5 rounded-2xl border border-red-500/10 mb-6"
          >
            <Timer className="text-red-500 mb-4 animate-pulse" size={48} />
            <div className="text-4xl font-black font-mono text-red-500">{timeLeft}s</div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-6 ${isLocked ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
          <div className="space-y-2">
            <label className="text-sm text-muted font-medium ml-1">{t('masterPassword')}</label>
            <div className="relative group">
              <input
                disabled={isProcessing || isLocked}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enterPasswordField')}
                className="w-full bg-surface border border-border text-primary rounded-xl pl-4 pr-20 py-3.5 focus:outline-none focus:border-primary transition-all placeholder:text-muted disabled:opacity-50"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-muted">
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {isSetup && (
             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
              <label className="text-sm text-muted font-medium ml-1">{t('confirmPassword')}</label>
              <input
                disabled={isProcessing || isLocked}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmYourPassword')}
                className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary transition-all placeholder:text-muted"
              />
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isProcessing || isLocked}
            className={`w-full ${isLocked ? 'bg-zinc-800' : ''} text-black font-bold text-base py-3.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:grayscale disabled:opacity-50`}
            style={{ backgroundColor: isLocked ? undefined : accentColor, boxShadow: isLocked ? undefined : `0 0 15px rgba(${accentRgb}, 0.3)` }}
          >
            {isProcessing ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>{t('processing')}</span>
                </>
            ) : (
                <>
                    {isSetup ? t('saveAndContinue') : t('unlockVault')}
                    {!isSetup && <ShieldCheck size={20} />}
                </>
            )}
          </button>
        </form>

        {/* Recovery Mode Button */}
        {!isSetup && !isLocked && recoverySettings && recoverySettings.codes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsRecoveryMode(true)}
              className="w-full py-2 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Ai uitat parola? Folosește un cod de recuperare
            </button>
          </div>
        )}

        {/* Recovery Mode Form */}
        {isRecoveryMode && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800"
          >
            <h3 className="text-sm font-bold text-white mb-3">Resetează cu cod de recuperare</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Cod de recuperare</label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm font-mono mt-1"
                  maxLength={19}
                />
              </div>
              
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Parolă nouă (min 30 caractere)</label>
                <input
                  type="password"
                  value={newRecoveryPassword}
                  onChange={(e) => setNewRecoveryPassword(e.target.value)}
                  placeholder="Parola nouă..."
                  className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Confirmă parola</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirmă parola..."
                  className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>

              {error && (
                <p className="text-red-500 text-xs">{error}</p>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setRecoveryCode('');
                    setNewRecoveryPassword('');
                    setConfirmNewPassword('');
                    setError(null);
                  }}
                  className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800"
                >
                  Anulează
                </button>
                <button
                  onClick={async () => {
                    if (newRecoveryPassword.length < 30) {
                      setError('Parola trebuie să aibă minim 30 caractere');
                      return;
                    }
                    if (newRecoveryPassword !== confirmNewPassword) {
                      setError('Parolele nu se potrivesc');
                      return;
                    }
                    if (!recoverySettings?.verify(recoveryCode)) {
                      setError('Invalid recovery code');
                      return;
                    }

                    setIsProcessing(true);
                    const result = await onResetWithRecovery(recoveryCode, newRecoveryPassword);
                    setIsProcessing(false);

                    if (result.success) {
                      // Reset successful, reload page to re-authenticate with new credentials
                      window.location.reload();
                    } else {
                      setError(result.error || 'Eroare la resetare');
                    }
                  }}
                  disabled={isProcessing || !recoveryCode || !newRecoveryPassword || !confirmNewPassword}
                  className="flex-1 py-2 rounded-lg text-black text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  Resetează
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
