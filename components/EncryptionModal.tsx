
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Zap, Cpu, Lock, Key, Copy, Check, ArrowRight, ArrowLeft, Loader2, HelpCircle, Smartphone, Monitor, Server, AlertTriangle } from 'lucide-react';
import { FileSystemItem } from '../types';
import { cryptoService, CryptoAlgorithm } from '../utils/crypto';
import { db, DBItem } from '../utils/db';
import { useI18n } from '../utils/i18n/i18nContext';

interface EncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  item: FileSystemItem;
}

import { streamCrypto } from '../utils/streamCrypto';
import { vaultStorage } from '../utils/vaultStorage';

const ALGORITHMS: { id: CryptoAlgorithm; name: string; desc: string; badge: string }[] = [
  { id: 'AES-GCM-Stream', name: 'AES-GCM Stream', desc: 'Streaming — any size, any device.', badge: 'STREAM' },
  { id: 'AES-GCM', name: 'AES-GCM', desc: 'Industry standard. Authenticated & Fast. Government recommended.', badge: 'NIST' },
  { id: 'XChaCha20-Poly1305', name: 'XChaCha20-Poly1305', desc: 'Most modern. Extended 192-bit nonce. Ideal for cloud & storage.', badge: 'MODERN' },
  { id: 'ChaCha20-Poly1305', name: 'ChaCha20-Poly1305', desc: 'Fast on mobile. Used by Google Chrome and WhatsApp.', badge: 'FAST' },
  { id: 'AES-CTR', name: 'AES-CTR', desc: 'Classic + HMAC-SHA256. Secure and time-tested.', badge: 'HMAC' },
  { id: 'Salsa20-Poly1305', name: 'Salsa20-Poly1305', desc: 'Grandfather of ChaCha20. Fast and secure. For enthusiasts.', badge: 'CLASSIC' },
];

const ALGO_INFO: Record<CryptoAlgorithm, { title: string; subtitle: string; body: string; analogy: string; useCase: string; strength: string }> = {
  'AES-GCM-Stream': {
    title: 'AES-GCM Stream',
    subtitle: 'Streaming Encryption — Any Device',
    body: 'AES-GCM Stream processes files in small 4MB chunks, so device memory is never overloaded. Works perfectly on old phones, entry-level tablets, or any device regardless of RAM. Each chunk is individually encrypted and authenticated with AES-GCM.',
    analogy: 'Like a worker moving a house — not all at once, but brick by brick. Similarly, the app processes the file chunk by chunk without exhausting the device.',
    useCase: 'For any type of file, regardless of size. Ideal for large videos, archives, or entire folders on resource-limited devices.',
    strength: 'AES-GCM per chunk with 128-bit tag. Each chunk is verified individually — if one is corrupted, you know exactly which one.',
  },
  'AES-GCM': {
    title: 'AES-GCM',
    subtitle: 'The Gold Standard of Encryption',
    body: 'AES-GCM is the most widely used encryption algorithm in the world. Recommended by the US government and used by banks, armies, and tech companies like Apple and Microsoft. Think of it as a steel safe with two doors: one hides the content, the other verifies that no one has opened it.',
    analogy: 'Like a wax-sealed letter — if someone tries to open it, the seal breaks and you know immediately.',
    useCase: 'Perfect for documents, photos, and personal files. Safe choice if you are unsure what to pick.',
    strength: '256-bit key — would take billions of years to break with current technology.',
  },
  'XChaCha20-Poly1305': {
    title: 'XChaCha20-Poly1305',
    subtitle: 'The Most Modern Algorithm',
    body: 'XChaCha20 is the improved version of ChaCha20, created by genius mathematician Daniel J. Bernstein. Used by Google Chrome and WhatsApp to protect communications. The difference from the normal version is it uses a much larger "fingerprint" (192-bit nonce), meaning the chance of repeating a combination is practically zero.',
    analogy: 'Like a lock with a 192-digit combination — not just 96. Chances of guessing the combo are lower than winning the lottery 10 times in a row.',
    useCase: 'Ideal for files stored in the cloud or sent over the internet. Best long-term protection.',
    strength: 'Extended 192-bit nonce combination — most secure against accidental collisions.',
  },
  'ChaCha20-Poly1305': {
    title: 'ChaCha20-Poly1305',
    subtitle: 'Speed on Mobile Devices',
    body: 'ChaCha20 was created specifically to be fast on phones and tablets where processors are not as powerful as on computers. Google chose it to protect internet traffic in Chrome and Android. Just as secure as AES-GCM, but runs more smoothly on older devices.',
    analogy: 'Like a marathon runner — not the biggest or strongest, but runs consistently and efficiently without getting tired.',
    useCase: 'Excellent for large files on phone or tablet. If you want speed without compromising security.',
    strength: 'Just as secure as AES-GCM, but 2-3 times faster on phones.',
  },
  'AES-CTR': {
    title: 'AES-CTR + HMAC',
    subtitle: 'Reinforced Classic Combination',
    body: 'AES-CTR is one of the oldest encryption modes. By itself, it does not verify if someone modified the file. That is why we added a "guardian" — HMAC-SHA256 — which verifies data integrity on each decryption. If the password is wrong or the file was tampered with, you will know immediately.',
    analogy: 'Like a letter in a transparent envelope with a seal strip — the envelope hides the message, and the strip shows if someone touched it.',
    useCase: 'For those who prefer classic, time-tested algorithms. Now just as secure as any other thanks to HMAC.',
    strength: 'Combination of the most studied cipher (AES) and the most verified authentication system (HMAC).',
  },
  'Salsa20-Poly1305': {
    title: 'Salsa20-Poly1305',
    subtitle: 'Classic DJB Speedster',
    body: 'Salsa20 is the "grandfather" of ChaCha20 — the original algorithm created by Daniel J. Bernstein in 2005. Was a finalist in the eSTREAM competition for the best encryption algorithm. Although replaced by ChaCha20 (a slightly improved version), it remains extremely fast and secure.',
    analogy: 'Like a classic car — does not have the newest gadgets, but the engine is reliable and runs just as well as any other.',
    useCase: 'For connoisseurs and encryption enthusiasts. A solid choice, tested for nearly 20 years.',
    strength: 'eSTREAM finalist, audited by thousands of researchers. 256-bit key + Poly1305 for integrity.',
  },
};

const HARDWARE_TIERS: Record<'low' | 'mid' | 'flagship', {
  label: string;
  subtitle: string;
  icon: typeof Smartphone;
  ram: string;
  cpu: string;
  limits: { type: string; max: string }[];
  warning: string;
  time: string;
}> = {
  low: {
    label: 'Low-End',
    subtitle: 'Old Phones / Entry-level',
    icon: Smartphone,
    ram: '2-4 GB RAM',
    cpu: 'Weak dual-core / quad-core processor',
    limits: [
      { type: '🖼️ Photos', max: 'Up to 50 MB per file' },
      { type: '🎵 Audio', max: 'Up to 200 MB per file' },
      { type: '🎬 Video', max: 'Up to 500 MB per file' },
      { type: '📁 Folders', max: 'Max 5-10 files simultaneously' },
    ],
    warning: 'These are just general estimates. You can try to encrypt larger files, but the app may crash if resources are insufficient.',
    time: '~10-30 seconds per 10 MB file',
  },
  mid: {
    label: 'Mid-Range',
    subtitle: 'Recent Phones / Laptops',
    icon: Monitor,
    ram: '6-8 GB RAM',
    cpu: 'Medium octa-core processor',
    limits: [
      { type: '🖼️ Photos', max: 'No practical limit' },
      { type: '🎵 Audio', max: 'Up to 500 MB per file' },
      { type: '🎬 Video', max: 'Up to 1 GB per file' },
      { type: '📁 Folders', max: 'Max 15-25 files simultaneously' },
    ],
    warning: 'These are just general estimates. You can try to encrypt larger files, but the app may crash if resources are insufficient.',
    time: '~5-15 seconds per 10 MB file',
  },
  flagship: {
    label: 'Flagship',
    subtitle: 'Powerful PCs / Premium Phones',
    icon: Server,
    ram: '16+ GB RAM',
    cpu: 'Powerful multi-core processor',
    limits: [
      { type: '🖼️ Photos', max: 'No practical limit' },
      { type: '🎵 Audio', max: 'No practical limit' },
      { type: '🎬 Video', max: 'Up to 4 GB per file' },
      { type: '📁 Folders', max: 'Max 50+ files simultaneously' },
    ],
    warning: 'These are just general estimates. You can try to encrypt larger files, but the app may crash if resources are insufficient.',
    time: '~2-8 seconds per 10 MB file',
  },
};

interface EncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  item: FileSystemItem;
  vaultPin?: string | null;
  onRequestPinSetup?: () => Promise<string | null>;
}

export const EncryptionModal: React.FC<EncryptionModalProps> = ({ isOpen, onClose, onRefresh, item, vaultPin, onRequestPinSetup }) => {
  const { t } = useI18n();
  const [step, setStep] = useState<'algo' | 'key' | 'processing'>('algo');
  const [selectedAlgo, setSelectedAlgo] = useState<CryptoAlgorithm>('AES-GCM-Stream');
  const [selectedTier, setSelectedTier] = useState<'low' | 'mid' | 'flagship'>('mid');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [infoAlgo, setInfoAlgo] = useState<CryptoAlgorithm | null>(null);
  const [saveToVault, setSaveToVault] = useState(false);
  const [selectedVaultCategory, setSelectedVaultCategory] = useState<string>('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSetupComplete, setPinSetupComplete] = useState(false);

  const handleToggleSaveToVault = async () => {
    if (!saveToVault && !vaultPin) {
        setShowPinSetup(true);
        if (onRequestPinSetup) {
            const newPin = await onRequestPinSetup();
            if (newPin) {
                setSaveToVault(true);
                setPinSetupComplete(true);
            }
        }
        setShowPinSetup(false);
    } else {
        setSaveToVault(!saveToVault);
    }
  };

  useEffect(() => {
    if (isOpen) {
        setStep('algo');
        setInfoAlgo(null);
        setSaveToVault(false);
        setSelectedVaultCategory('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'key' && !generatedKey) {
        const randomValues = new Uint8Array(32);
        window.crypto.getRandomValues(randomValues);
        const hex = Array.from(randomValues).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        setGeneratedKey(hex.match(/.{1,4}/g)?.join('-') || hex);
    }
  }, [step]);

  const handleCopy = () => {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleEncrypt = async () => {
      if (!item.rawBlob) {
          alert(t('fileNoData'));
          return;
      }
      setIsProcessing(true);
      setStep('processing');

      try {
          let rawData: Uint8Array;
          
          if (item.isEncrypted && item.iv && !item.salt) {
              const encryptedData = new Uint8Array(await item.rawBlob.arrayBuffer());
              const iv = cryptoService.base64ToArrayBuffer(item.iv);
              const decryptedData = await cryptoService.decrypt(encryptedData, iv);
              rawData = decryptedData;
          } else {
              rawData = new Uint8Array(await item.rawBlob.arrayBuffer());
          }
          
          let result: { ciphertext: Uint8Array; salt: Uint8Array; iv: Uint8Array; algorithm: string };
          
          if (selectedAlgo === 'AES-GCM-Stream') {
              const streamResult = await streamCrypto.encrypt(rawData, generatedKey);
              result = { ...streamResult, iv: streamResult.salt };
          } else {
              result = await cryptoService.encryptWithPassphrase(
                  rawData, 
                  generatedKey, 
                  selectedAlgo
              );
          }

          const updatedItem: DBItem = {
              ...item,
              fileData: new Blob([result.ciphertext as any]),
              iv: cryptoService.arrayBufferToBase64(result.iv),
              salt: cryptoService.arrayBufferToBase64(result.salt),
              algorithm: result.algorithm as CryptoAlgorithm,
              isEncrypted: true,
          };
          
          delete (updatedItem as any).url;
          delete (updatedItem as any).rawBlob;

          await db.updateItem(updatedItem);

          if (saveToVault && selectedVaultCategory) {
              await vaultStorage.save({
                  key: generatedKey,
                  algorithm: result.algorithm,
                  fileName: item.name,
                  categoryId: selectedVaultCategory,
                  fileId: item.id.toString(),
              });
          }
          
          setTimeout(() => {
              setIsProcessing(false);
              onRefresh();
              onClose();
          }, 1500);

      } catch (e) {
          console.error(e);
          alert(t('encryptionError'));
          setIsProcessing(false);
          setStep('key');
      }
  };

  if (!isOpen) return null;

  const tier = HARDWARE_TIERS[selectedTier];
  const TierIcon = tier.icon;

  const getHeaderTitle = () => {
    if (infoAlgo) return ALGO_INFO[infoAlgo].title;
    if (step === 'key') return 'Encryption Key';
    if (step === 'processing') return 'Encrypting...';
    return t('manualEncryption');
  };

  const getHeaderSubtitle = () => {
    if (infoAlgo) return ALGO_INFO[infoAlgo].subtitle;
    if (step === 'key') return selectedAlgo;
    return item.name;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
            className="relative w-full max-w-[95vw] md:max-w-lg glass-card rounded-lg md:rounded-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-3 py-2 md:px-6 md:py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-6 h-6 md:w-10 md:h-10 rounded md:rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                        <Shield size={10} className="md:size-5" />
                    </div>
                    <h3 className="text-xs md:text-lg font-bold text-white">{getHeaderTitle()}</h3>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-2.5 md:p-6 custom-scrollbar">
                <AnimatePresence mode="wait">
                    
                    {/* ALGORITHM INFO PAGE */}
                    {infoAlgo && step === 'algo' && (
                        <motion.div
                            key="algo-info"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            className="space-y-2 md:space-y-4 overflow-y-auto max-h-[60vh] md:max-h-[50vh] custom-scrollbar pr-1 md:pr-2"
                        >
                             <button
                                 onClick={() => setInfoAlgo(null)}
                                 className="text-[9px] md:text-sm font-bold text-zinc-500 hover:text-neon-green uppercase flex items-center gap-1"
                             >
                                 ← Back
                             </button>

                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-900/80 border border-zinc-800">
                                 <h4 className="text-[10px] md:text-base font-bold text-white mb-1">What is this?</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-400 leading-tight">{ALGO_INFO[infoAlgo].body}</p>
                             </div>
                             
                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-neon-green/5 border border-neon-green/20">
                                 <h4 className="text-[10px] md:text-base font-bold text-neon-green mb-1">💡 Analogy</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-300 leading-tight italic">{ALGO_INFO[infoAlgo].analogy}</p>
                             </div>
                             
                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-800/50 border border-zinc-700">
                                 <h4 className="text-[10px] md:text-base font-bold text-zinc-300 mb-1">When to use it?</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-400 leading-tight">{ALGO_INFO[infoAlgo].useCase}</p>
                             </div>
                             
                             <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                                 <h4 className="text-[10px] md:text-base font-bold text-zinc-400 mb-1">Security level</h4>
                                 <p className="text-[9px] md:text-sm text-zinc-500 leading-tight">{ALGO_INFO[infoAlgo].strength}</p>
                             </div>
                        </motion.div>
                    )}

                    {/* STEP 1: ALGORITHM SELECTION */}
                    {!infoAlgo && step === 'algo' && (
                        <motion.div 
                            key="algo-step"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-2"
                        >
                             <h4 className="text-[8px] font-black uppercase text-zinc-500">Algorithms</h4>

                             <button
                                 onClick={() => setSelectedAlgo('AES-GCM-Stream')}
                                 className={`w-full p-2 md:p-4 rounded border md:rounded-xl text-left ${selectedAlgo === 'AES-GCM-Stream' ? 'bg-neon-green/10 border-neon-green' : 'bg-zinc-900/50 border-zinc-800'}`}
                             >
                                 <div className="flex items-center gap-2">
                                     <div className={`w-5 h-5 md:w-10 md:h-10 rounded md:rounded-xl flex items-center justify-center ${selectedAlgo === 'AES-GCM-Stream' ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-800 text-zinc-500'}`}>
                                         <Zap size={8} className="md:size-[18px]" />
                                     </div>
                                     <div className="flex-1">
                                         <span className="text-[10px] md:text-base font-bold text-white">AES-GCM Stream</span>
                                     </div>
                                     <div className="flex items-center gap-1 md:gap-2">
                                          <span
                                              onClick={(e) => { e.stopPropagation(); setInfoAlgo('AES-GCM-Stream'); }}
                                              className="text-zinc-600 hover:text-neon-green cursor-pointer"
                                          >
                                               <HelpCircle size={8} className="md:size-4" />
                                           </span>
                                          <span className="text-[7px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1.5 rounded md:rounded-full bg-neon-green/20 text-neon-green font-bold">Recommended</span>
                                      </div>
                                  </div>
                                  <p className="text-[7px] md:text-sm text-zinc-500 mt-1 md:mt-2">Streaming — any size, any device. Ideal for old phones and tablets.</p>
                              </button>

                              <div className="flex items-center gap-2 md:gap-4 my-2 md:my-4">
                                 <div className="flex-1 h-px bg-zinc-800" />
                                 <span className="text-[7px] md:text-xs font-black uppercase text-zinc-700">Other algorithms</span>
                                 <div className="flex-1 h-px bg-zinc-800" />
                             </div>

                             <div className="grid grid-cols-2 md:grid-cols-2 gap-1.5 md:gap-3">
                                 {ALGORITHMS.filter(a => a.id !== 'AES-GCM-Stream').map((algo) => (
                                     <button
                                         key={algo.id}
                                         onClick={() => setSelectedAlgo(algo.id)}
                                         className={`p-2 md:p-4 rounded border md:rounded-xl text-left ${selectedAlgo === algo.id ? 'bg-neon-green/5 border-neon-green' : 'bg-zinc-900 border-zinc-800'}`}
                                     >
                                         <div className="flex justify-between items-start mb-0.5 md:mb-2">
                                             <span className="text-[9px] md:text-sm font-bold text-zinc-300">{algo.name}</span>
                                              <div className="flex items-center gap-1 md:gap-2">
                                                  <span
                                                      onClick={(e) => { e.stopPropagation(); setInfoAlgo(algo.id); }}
                                                      className="text-zinc-600 hover:text-neon-green cursor-pointer"
                                                  >
                                                      <HelpCircle size={8} className="md:size-4" />
                                                   </span>
                                                  <span className="text-[6px] md:text-[9px] px-1 md:px-2.5 py-0.5 md:py-1 rounded bg-black text-zinc-500 font-mono">{algo.badge}</span>
                                              </div>
                                          </div>
                                          <p className="text-[7px] md:text-xs text-zinc-500 leading-relaxed">{algo.desc}</p>
                                      </button>
                                  ))}
                              </div>
                         </motion.div>
                     )}

                     {/* STEP 2: KEY GENERATION */}
                     {step === 'key' && (
                         <motion.div 
                             key="key-step"
                             initial={{ opacity: 0, x: 20 }}
                             animate={{ opacity: 1, x: 0 }}
                             exit={{ opacity: 0, x: 20 }}
                             className="space-y-2 md:space-y-6"
                         >
                             <div className="flex items-center gap-1.5 md:gap-3">
                                 <Key size={8} className="text-neon-green md:size-4" />
                                 <h4 className="text-[8px] md:text-sm font-black text-zinc-300">Unique Key</h4>
                             </div>
                             <div className="relative bg-black border border-zinc-800 rounded md:rounded-xl p-2 md:p-4 font-mono text-[8px] md:text-xs text-neon-green break-all">
                                 {generatedKey}
                                 <button 
                                     onClick={handleCopy}
                                     className="absolute top-1 right-1 p-1 md:p-2 bg-zinc-900 rounded"
                                 >
                                     {copied ? <Check size={8} className="md:size-4" /> : <Copy size={8} className="md:size-4" />}
                                 </button>
                             </div>
                             <div className="p-2 md:p-4 bg-zinc-800/50 border border-zinc-700 rounded md:rounded-xl">
                                 <p className="text-[7px] md:text-xs text-zinc-400">Save this key to Vault or copy it!</p>
                             </div>

                             <button
                                 onClick={handleToggleSaveToVault}
                                 className={`w-full flex items-center justify-between p-2 md:p-4 rounded border md:rounded-xl ${saveToVault ? 'bg-neon-green/5 border-neon-green/30' : 'bg-black/50 border-zinc-800'}`}
                             >
                                 <div className="flex items-center gap-2 md:gap-3">
                                     <div className={`w-5 h-5 md:w-8 md:h-8 rounded md:rounded-xl flex items-center justify-center ${saveToVault ? 'bg-neon-green/20' : 'bg-zinc-800'}`}>
                                         <Shield size={8} className="md:size-4" />
                                     </div>
                                     <span className="text-[9px] md:text-sm font-bold text-zinc-400">Save to Vault</span>
                                 </div>
                                 <div className={`w-6 h-3 md:w-9 md:h-5 rounded-full flex items-center ${saveToVault ? 'bg-neon-green' : 'bg-zinc-700'}`}>
                                     <div className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-white transition-transform ${saveToVault ? 'translate-x-3 md:translate-x-4' : 'translate-x-0.5'}`} />
                                 </div>
                             </button>
                         </motion.div>
                     )}

                     {/* STEP 4: PROCESSING */}
                     {step === 'processing' && (
                         <motion.div 
                             key="processing"
                             initial={{ opacity: 0, scale: 0.9 }}
                             animate={{ opacity: 1, scale: 1 }}
                             className="flex flex-col items-center justify-center py-10 space-y-6"
                         >
                             <div className="relative">
                                 <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full" />
                                 <Loader2 size={64} className="text-neon-green animate-spin relative z-10" />
                             </div>
                             <div className="text-center">
                                 <h4 className="text-xl font-bold text-white">Encrypting...</h4>
                                 <p className="text-zinc-400 text-xs mt-2 font-mono">Applying {selectedAlgo}</p>
                             </div>
                         </motion.div>
                     )}

                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {step !== 'processing' && (
                <div className="p-3 md:p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center gap-3 md:gap-6 shrink-0">
                     {step === 'key' ? (
                         <button 
                             onClick={() => setStep('algo')} 
                             className="text-[9px] md:text-xs font-bold text-zinc-500 hover:text-white uppercase flex items-center gap-1"
                         >
                             ← Back
                         </button>
                     ) : (
                         <div /> 
                     )}

                     {step === 'algo' ? (
                         <button 
                             onClick={() => setStep('key')}
                             className="px-5 md:px-10 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                         >
                             Continue →
                         </button>
                     ) : (
                         <button 
                             onClick={handleEncrypt}
                             className="px-5 md:px-10 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                         >
                             Encrypt →
                         </button>
                     )}
                </div>
            )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
