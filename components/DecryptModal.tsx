import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Eye, EyeOff, Loader2, AlertTriangle, Shield, Key, Check } from 'lucide-react';
import { FileSystemItem } from '../types';
import { cryptoService } from '../utils/crypto';
import { vaultStorage } from '../utils/vaultStorage';
import { useI18n } from '../utils/i18nContext';
import { PinModal } from './PinModal';
import { verifyPin } from '../utils/security';

interface DecryptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (decryptedBlob: Blob, mimeType: string) => void;
  item: FileSystemItem;
  vaultPin?: string | null;
}

export const DecryptModal: React.FC<DecryptModalProps> = ({ isOpen, onClose, onSuccess, item, vaultPin }) => {
  const { t } = useI18n();
  const [passphrase, setPassphrase] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFillFromVault, setAutoFillFromVault] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [vaultKeyFound, setVaultKeyFound] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassphrase('');
      setShowKey(false);
      setIsProcessing(false);
      setError(null);
      setAutoFillFromVault(false);
      setVaultKeyFound(null);
      setPinError(null);
    }
  }, [isOpen]);

  const handleVaultAutoFill = async (pin: string) => {
    if (!vaultPin) {
      setPinError('Vault PIN nu este configurat.');
      return;
    }

    const isValid = await verifyPin(pin, vaultPin);
    if (!isValid) {
      setPinError('PIN incorect.');
      return;
    }

    const foundKey = vaultStorage.getByFileId(item.id.toString());
    if (foundKey) {
      setPassphrase(foundKey.key);
      setVaultKeyFound(foundKey.id);
      setShowPinModal(false);
      setPinError(null);
    } else {
      setPinError('Nicio cheie găsită pentru acest fișier în Vault.');
      setShowPinModal(false);
    }
  };

  const handleDecrypt = async () => {
    if (!passphrase.trim()) {
      setError('Introdu o cheie de decriptare.');
      return;
    }

    if (!item.rawBlob) {
      setError('Datele fisierului sunt corupte sau lipsesc.');
      return;
    }

    if (item.algorithm !== 'AES-GCM-Stream' && (!item.iv || !item.salt)) {
      setError('Datele fisierului sunt corupte sau lipsesc.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const encryptedData = new Uint8Array(await item.rawBlob.arrayBuffer());
      console.log('[Decrypt] encryptedData length:', encryptedData.length);
      console.log('[Decrypt] algorithm:', item.algorithm);
      console.log('[Decrypt] iv:', item.iv);
      console.log('[Decrypt] salt:', item.salt);
      console.log('[Decrypt] passphrase length:', passphrase.length);

      let decryptedData: Uint8Array;
      
      if (item.algorithm === 'AES-GCM-Stream') {
        decryptedData = await cryptoService.decryptWithPassphrase(
          encryptedData,
          passphrase,
          new Uint8Array(0),
          new Uint8Array(0),
          'AES-GCM-Stream'
        );
      } else {
        const iv = cryptoService.base64ToArrayBuffer(item.iv!);
        const salt = cryptoService.base64ToArrayBuffer(item.salt!);
        console.log('[Decrypt] iv length:', iv.length, 'salt length:', salt.length);

        decryptedData = await cryptoService.decryptWithPassphrase(
          encryptedData,
          passphrase,
          iv,
          salt,
          item.algorithm || 'AES-GCM'
        );
      }

      console.log('[Decrypt] SUCCESS, decryptedData length:', decryptedData.length);

      const ext = item.name.split('.').pop()?.toLowerCase() || '';
      const mimeType = ext === 'gif' ? 'image/gif' :
                       ext === 'png' ? 'image/png' :
                       ext === 'webp' ? 'image/webp' :
                       item.category === 'image' ? 'image/jpeg' :
                       ext === 'mp3' ? 'audio/mpeg' :
                       ext === 'wav' ? 'audio/wav' :
                       ext === 'ogg' ? 'audio/ogg' :
                       item.category === 'audio' ? 'audio/mpeg' :
                       ext === 'webm' ? 'video/webm' :
                       ext === 'mkv' ? 'video/x-matroska' :
                       item.category === 'video' ? 'video/mp4' : 'application/octet-stream';

      const blob = new Blob([decryptedData], { type: mimeType });
      onSuccess(blob, mimeType);
    } catch (e: any) {
      console.error(e);
      setError('Cheie incorecta. Verifica si incearca din nou.');
      setPassphrase('');
      setVaultKeyFound(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) handleDecrypt();
    if (e.key === 'Escape' && !showPinModal) onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md glass-card rounded-[32px] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20 text-neon-green">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{t('decrypt') || 'Decripteaza'}</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider truncate max-w-[200px]">{item.name}</p>
              </div>
            </div>
            {!isProcessing && (
              <div /> 
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full" />
                  <Loader2 size={64} className="text-neon-green animate-spin relative z-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-bold text-white">{t('processing') || 'Decriptare...'}</h4>
                  <p className="text-zinc-400 text-xs mt-2 font-mono">{item.algorithm || 'AES-GCM'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-yellow-500" />
                    <span className="text-xs font-bold text-zinc-300">{t('encryptedFile') || 'Fisier Criptat Manual'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {t('enterDecryptionKey') || 'Introdu cheia generata la criptare pentru a debloca fisierul.'}
                  </p>
                  <div className="mt-2 px-2 py-1 rounded bg-black/50 font-mono text-[10px] text-zinc-400 inline-block flex items-center gap-2">
                    <span>{item.algorithm || 'AES-GCM'}</span>
                    {(item.algorithm === 'AES-CTR') && (
                      <span className="px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green text-[9px] font-bold uppercase tracking-wider">+ HMAC</span>
                    )}
                  </div>
                </div>

                {/* AUTOFILL FROM VAULT */}
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  {vaultPin ? (
                    <>
                      <button
                        onClick={() => setShowPinModal(true)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${autoFillFromVault && vaultKeyFound ? 'bg-neon-green/5 border-neon-green/30' : 'bg-black/50 border-zinc-800 hover:border-zinc-700'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoFillFromVault && vaultKeyFound ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-800 text-zinc-500'}`}>
                            {autoFillFromVault && vaultKeyFound ? <Check size={16} /> : <Shield size={16} />}
                          </div>
                          <div className="text-left">
                            <p className={`text-xs font-bold ${autoFillFromVault && vaultKeyFound ? 'text-white' : 'text-zinc-400'}`}>
                              {autoFillFromVault && vaultKeyFound ? 'Cheie completată din Vault' : 'Autocompletează din Vault'}
                            </p>
                            <p className="text-[9px] text-zinc-600">
                              {autoFillFromVault && vaultKeyFound ? 'Cheia a fost găsită și completată automat' : 'Introdu PIN-ul pentru a completa cheia automat'}
                            </p>
                          </div>
                        </div>
                      </button>

                      {pinError && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-[10px] text-red-400 text-center">{pinError}</p>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/50 border border-zinc-800">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 text-zinc-600">
                        <Shield size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-zinc-500">Autocompletează din Vault</p>
                        <p className="text-[9px] text-zinc-700">Setează un PIN în Setări → Vault pentru a activa</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                    {t('enterKey') || 'Cheie de Decriptare'}
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={t('enterDecryptionKey') || 'Enter the decryption key'}
                      className={`w-full bg-black border rounded-xl px-4 py-3.5 pr-12 text-sm font-mono outline-none transition-colors placeholder:text-zinc-700 ${vaultKeyFound ? 'border-neon-green/50 text-neon-green focus:border-neon-green' : 'border-zinc-800 text-neon-green focus:border-neon-green'}`}
                      autoFocus
                      autoComplete="new-password"
                      name="decryption-key-field"
                      spellCheck={false}
                      readOnly={isProcessing}
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {vaultKeyFound && (
                    <div className="flex items-center gap-2 mt-2 px-1">
                      <Key size={12} className="text-neon-green/60" />
                      <p className="text-[9px] text-neon-green/60 font-mono">ID: {vaultKeyFound}</p>
                    </div>
                  )}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-xs text-red-400 font-medium">{error}</span>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {!isProcessing && (
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-end shrink-0">
              <button
                onClick={handleDecrypt}
                disabled={!passphrase.trim()}
                className="px-8 py-3 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:scale-105 transition-transform disabled:opacity-30 disabled:hover:scale-100 flex items-center gap-2"
              >
                <Lock size={14} /> {t('decrypt') || 'Decripteaza'}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* PIN MODAL FOR VAULT ACCESS */}
      {showPinModal && (
        <PinModal
          mode="unlock"
          savedPin={vaultPin}
          onSuccess={handleVaultAutoFill}
          onClose={() => { setShowPinModal(false); setPinError(null); }}
        />
      )}
    </AnimatePresence>
  );
};
