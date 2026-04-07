import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Download, Upload, RefreshCw, Copy, Check, Key, FileLock2, 
  AlertTriangle, Loader2, Database, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { backupCryptoService } from '../../utils/backupCrypto';
import { db } from '../../utils/db';
import { useI18n } from '../../utils/i18nContext';
import { AppTheme } from '../../types';

interface BackupViewProps {
  onBack: () => void;
  theme: AppTheme;
}

type BackupStep = 'menu' | 'create_gen' | 'create_done' | 'restore_input' | 'restore_process' | 'restore_done';

export const BackupView: React.FC<BackupViewProps> = ({ onBack, theme }) => {
  const { t } = useI18n();
  const [step, setStep] = useState<BackupStep>('menu');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [restoreKey, setRestoreKey] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreError, setRestoreError] = useState('');

  const startBackup = () => {
    const key = backupCryptoService.generatePassphrase();
    setGeneratedKey(key);
    setStep('create_gen');
  };

  const executeBackupDownload = async () => {
    setIsProcessing(true);
    try {
        const dbItems = await db.exportDatabase();
        const appState = {
            localStorage: {
                'crytotool_theme_config': localStorage.getItem('app_theme_config'),
                'crytotool_vault_cats': localStorage.getItem('crytotool_vault_cats'),
                'crytotool_salt': localStorage.getItem('crytotool_salt'),
                'crytotool_iv': localStorage.getItem('crytotool_iv'),
                'crytotool_vault_blob': localStorage.getItem('crytotool_vault_blob'),
                'crytotool_vault_enabled': localStorage.getItem('crytotool_vault_enabled'),
                'crytotool_vault_pin': localStorage.getItem('crytotool_vault_pin'),
            },
            db: dbItems,
            timestamp: Date.now(),
            version: '2.5.0'
        };

        const jsonString = JSON.stringify(appState);
        const encryptedBlob = await backupCryptoService.encryptBackup(jsonString, generatedKey);

        const url = URL.createObjectURL(encryptedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crytotool-backup-${new Date().toISOString().slice(0,10)}.enc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStep('create_done');
    } catch (e) {
        console.error(e);
        alert(t('backupError'));
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          setRestoreFile(e.target.files[0]);
          setRestoreError('');
      }
  };

  const executeRestore = async () => {
      if (!restoreFile || !restoreKey) {
          setRestoreError(t('selectFileAndKey'));
          return;
      }
      setIsProcessing(true);
      setRestoreError('');

      try {
          const jsonString = await backupCryptoService.decryptBackup(restoreFile, restoreKey);
          const data = JSON.parse(jsonString);

          if (!data.db || !data.localStorage) throw new Error("Format invalid");

          Object.entries(data.localStorage).forEach(([k, v]) => {
              if (v) localStorage.setItem(k, v as string);
          });

          await db.importDatabase(data.db);

          setStep('restore_done');
      } catch (e) {
          console.error(e);
          setRestoreError(t('wrongKeyOrCorrupt'));
      } finally {
          setIsProcessing(false);
      }
  };

  const copyKey = () => {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 50 }} 
      className="absolute inset-0 z-50 flex flex-col bg-background"
    >
      {/* HEADER */}
      <div className="px-5 pt-6 pb-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button">
            <ArrowLeft size={24} className="text-primary" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center">
            <Database size={24} className="text-neon-green" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wide text-primary">{t('backupAndRestore')}</h2>
            <p className="text-[10px] text-muted font-medium mt-0.5">{t('aes256Encrypted')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8 custom-scrollbar">
        <AnimatePresence mode="wait">
            
            {/* MENU PRINCIPAL */}
            {step === 'menu' && (
                <motion.div 
                    key="menu"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                >
                    {/* CREATE BACKUP CARD */}
                    <div 
                      onClick={startBackup}
                      className="group relative p-6 rounded-[32px] glass-card hover:border-neon-green/50 transition-all cursor-pointer overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:opacity-05 transition-opacity">
                            <Download size={80} className="text-primary" />
                        </div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-start gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-green/20 to-neon-green/5 border border-neon-green/20 flex items-center justify-center text-neon-green group-hover:scale-110 group-hover:bg-neon-green group-hover:text-black transition-all duration-300">
                                <Download size={28} strokeWidth={2} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-primary mb-2">{t('createBackup')}</h3>
                                <p className="text-sm text-muted leading-relaxed">{t('createBackupDesc')}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full glass-surface flex items-center justify-center text-muted group-hover:border-neon-green group-hover:text-neon-green transition-colors">
                                <ArrowLeft size={14} className="rotate-180" />
                            </div>
                        </div>
                    </div>

                    {/* RESTORE BACKUP CARD */}
                    <div 
                      onClick={() => setStep('restore_input')}
                      className="group relative p-6 rounded-[32px] glass-card hover:border-neon-green/50 transition-all cursor-pointer overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:opacity-05 transition-opacity">
                            <Upload size={80} className="text-primary" />
                        </div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-start gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-green/20 to-neon-green/5 border border-neon-green/20 flex items-center justify-center text-neon-green group-hover:scale-110 group-hover:bg-neon-green group-hover:text-black transition-all duration-300">
                                <RefreshCw size={28} strokeWidth={2} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-primary mb-2">{t('restoreBackup')}</h3>
                                <p className="text-sm text-muted leading-relaxed">{t('restoreBackupDesc')}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full glass-surface flex items-center justify-center text-muted group-hover:border-neon-green group-hover:text-neon-green transition-colors">
                                <ArrowLeft size={14} className="rotate-180" />
                            </div>
                        </div>
                    </div>

                    {/* WARNING BOX */}
                    <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} className="text-yellow-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-2">{t('warningCritical')}</h4>
                            <p className="text-xs text-yellow-500/80 leading-relaxed font-medium">
                                {t('warningKeyLost')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* CREATE: GENERATE KEY */}
            {step === 'create_gen' && (
                <motion.div 
                    key="create_gen"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                >
                    <div className="text-center space-y-3 pt-4">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-neon-green/10 flex items-center justify-center animate-pulse border border-neon-green/30">
                            <Key size={40} className="text-neon-green" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-primary">{t('keyTitle')}</h3>
                            <p className="text-sm text-muted max-w-sm mx-auto mt-2 leading-relaxed">
                                {t('keyDescription')}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 rounded-[32px] border border-border bg-card space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                <Key size={12} /> {t('generatedKey')}
                            </span>
                            <button 
                                onClick={copyKey}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] font-bold uppercase tracking-wider text-muted hover:text-neon-green hover:border-neon-green/50 transition-all"
                            >
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                {copied ? t('copied') : t('copyKey')}
                            </button>
                        </div>
                        <div className="p-4 rounded-2xl bg-surface border border-border">
                            <code className="text-lg font-mono font-bold text-neon-green tracking-wider break-all leading-relaxed">
                                {generatedKey}
                            </code>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 flex gap-3 items-start">
                        <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-500/80 leading-relaxed">
                            {t('keyWindowWarning')}
                        </p>
                    </div>

                    <button 
                        onClick={executeBackupDownload}
                        disabled={isProcessing}
                        className="w-full py-5 rounded-2xl bg-neon-green text-black font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg shadow-lg shadow-neon-green/20"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <Download size={22} />}
                        {isProcessing ? t('processing') : t('downloadBackup')}
                    </button>

                    <button 
                        onClick={() => setStep('menu')}
                        className="w-full py-4 rounded-2xl bg-surface border border-border text-muted font-bold uppercase tracking-widest hover:text-primary hover:border-primary transition-all"
                    >
                        {t('back')}
                    </button>
                </motion.div>
            )}

            {/* CREATE: DONE */}
            {step === 'create_done' && (
                <motion.div 
                    key="create_done"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 space-y-8"
                >
                    <div className="w-24 h-24 rounded-full bg-neon-green text-black flex items-center justify-center shadow-[0_0_40px_rgba(57,255,20,0.4)]">
                        <CheckCircle size={48} strokeWidth={3} />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-primary">{t('backupComplete')}</h3>
                        <p className="text-base text-muted">{t('fileDownloaded')}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted">
                        <Clock size={12} />
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => setStep('menu')} className="px-10 py-4 rounded-2xl bg-surface border border-border text-primary font-bold uppercase tracking-widest hover:border-neon-green hover:text-neon-green transition-all">
                        {t('backToMenu')}
                    </button>
                </motion.div>
            )}

            {/* RESTORE: INPUT */}
            {step === 'restore_input' && (
                <motion.div 
                    key="restore_input"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    <div className="p-6 rounded-[32px] border border-border bg-card space-y-6">
                        {/* Step 1: File */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                <FileLock2 size={12} /> 1. {t('backupFile')}
                            </span>
                            <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${restoreFile ? 'border-neon-green bg-neon-green/5' : 'border-border bg-surface hover:border-neon-green/50'}`}>
                                {restoreFile ? (
                                    <div className="text-center">
                                        <FileLock2 size={32} className="text-neon-green mx-auto mb-2" />
                                        <span className="text-sm font-bold text-primary block">{restoreFile.name}</span>
                                        <span className="text-xs text-muted">{(restoreFile.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Upload size={32} className="text-muted mx-auto mb-2" />
                                        <span className="text-sm text-muted">{t('tapToUpload')}</span>
                                    </div>
                                )}
                                <input type="file" accept=".enc" onChange={handleRestoreFile} className="hidden" />
                            </label>
                        </div>

                        {/* Step 2: Key */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                <Key size={12} /> 2. {t('decryptionKey')}
                            </span>
                            <div className="relative">
                                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                                <input 
                                    type="text" 
                                    value={restoreKey}
                                    onChange={(e) => setRestoreKey(e.target.value)}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 text-base text-primary font-mono focus:border-neon-green outline-none transition-colors uppercase placeholder:text-zinc-700"
                                />
                            </div>
                        </div>
                    </div>

                    {restoreError && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 items-center">
                            <XCircle size={20} className="text-red-500 shrink-0" />
                            <span className="text-sm text-red-500 font-medium">{restoreError}</span>
                        </div>
                    )}

                    {/* RESTORE WARNING - Same style as menu warning */}
                    <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} className="text-yellow-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-2">{t('attention') || 'ATENȚIE'}</h4>
                            <p className="text-xs text-yellow-500/80 leading-relaxed font-medium">
                                {t('restoreWarning')}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={executeRestore}
                        disabled={isProcessing}
                        className="w-full py-5 rounded-2xl bg-white text-black font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 text-lg shadow-lg"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <RefreshCw size={22} />}
                        {isProcessing ? t('restoring') : t('restoreAll')}
                    </button>

                    <button 
                        onClick={() => { setStep('menu'); setRestoreFile(null); setRestoreKey(''); }}
                        className="w-full py-4 rounded-2xl bg-surface border border-border text-muted font-bold uppercase tracking-widest hover:text-primary hover:border-primary transition-all"
                    >
                        {t('back')}
                    </button>
                </motion.div>
            )}

            {/* RESTORE: DONE */}
            {step === 'restore_done' && (
                <motion.div 
                    key="restore_done"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 space-y-8"
                >
                    <div className="w-24 h-24 rounded-full bg-neon-green text-black flex items-center justify-center shadow-[0_0_40px_rgba(57,255,20,0.4)]">
                        <CheckCircle size={48} strokeWidth={3} />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-primary">{t('restoreSuccess')}</h3>
                        <p className="text-base text-muted">{t('appReload')}</p>
                    </div>
                    <button onClick={() => window.location.reload()} className="px-10 py-4 rounded-2xl bg-neon-green text-black font-bold uppercase tracking-widest text-lg shadow-lg shadow-neon-green/20 hover:opacity-90 transition-all">
                        {t('reload')}
                    </button>
                </motion.div>
            )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
};