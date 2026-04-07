
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Zap, Cpu, Lock, Key, Copy, Check, ArrowRight, ArrowLeft, Loader2, HelpCircle, Smartphone, Monitor, Server, AlertTriangle } from 'lucide-react';
import { FileSystemItem } from '../types';
import { cryptoService, CryptoAlgorithm } from '../utils/crypto';
import { db, DBItem } from '../utils/db';
import { useI18n } from '../utils/i18nContext';

interface EncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  item: FileSystemItem;
}

import { streamCrypto } from '../utils/streamCrypto';
import { vaultStorage } from '../utils/vaultStorage';

const ALGORITHMS: { id: CryptoAlgorithm; name: string; desc: string; badge: string }[] = [
  { id: 'AES-GCM-Stream', name: 'AES-GCM Stream', desc: 'Streaming — orice dimensiune, orice dispozitiv.', badge: 'STREAM' },
  { id: 'AES-GCM', name: 'AES-GCM', desc: 'Standardul industriei. Autentificat & Rapid.', badge: 'NIST' },
  { id: 'XChaCha20-Poly1305', name: 'XChaCha20-Poly1305', desc: 'Nonce extins. Ideal pentru cloud.', badge: 'MODERN' },
  { id: 'ChaCha20-Poly1305', name: 'ChaCha20-Poly1305', desc: 'Rapid pe mobile. Securitate Google.', badge: 'FAST' },
  { id: 'AES-CTR', name: 'AES-CTR', desc: 'Stream cipher cu HMAC-SHA256. Autentificat.', badge: 'HMAC' },
  { id: 'Salsa20-Poly1305', name: 'Salsa20-Poly1305', desc: 'Predecesorul ChaCha. Rapid.', badge: 'CLASSIC' },
];

const ALGO_INFO: Record<CryptoAlgorithm, { title: string; subtitle: string; body: string; analogy: string; useCase: string; strength: string }> = {
  'AES-GCM-Stream': {
    title: 'AES-GCM Stream',
    subtitle: 'Criptare în Streaming — Orice Dispozitiv',
    body: 'AES-GCM Stream procesează fișierele în bucăți mici de 4MB, astfel încât memoria dispozitivului nu este încărcată niciodată peste limită. Funcționează perfect pe telefoane vechi, tablete entry-level sau orice alt dispozitiv, indiferent de cât RAM are. Fiecare bucată este criptată și autentificată individual cu AES-GCM.',
    analogy: 'Ca un muncitor care mută o casă — nu o ia toată o dată, ci cărămidă cu cărămidă. La fel, aplicația procesează fișierul bucată cu bucată, fără să obosească dispozitivul.',
    useCase: 'Pentru orice tip de fișier, indiferent de dimensiune. Ideal pentru videoclipuri mari, arhive sau foldere întregi pe dispozitive cu resurse limitate.',
    strength: 'AES-GCM per chunk cu tag de 128 biți. Fiecare bucată e verificată individual — dacă una e coruptă, știi exact care.',
  },
  'AES-GCM': {
    title: 'AES-GCM',
    subtitle: 'Standardul de Aur al Criptării',
    body: 'AES-GCM este cel mai folosit algoritm de criptare din lume. Este recomandat de guvernul SUA și folosit de bănci, armate și companii tech precum Apple și Microsoft. Gândește-te la el ca la un seif de oțel cu două uși: una ascunde conținutul, cealaltă verifică că nimeni nu l-a deschis.',
    analogy: 'Ca un plic sigilat cu ceară — dacă cineva încearcă să-l deschidă, sigiliul se rupe și știi imediat.',
    useCase: 'Perfect pentru documente, poze și fișiere personale. Alegerea sigură dacă nu ești sigur ce să alegi.',
    strength: 'Cheie de 256 biți — ar dura miliarde de ani să fie spart cu tehnologia actuală.',
  },
  'XChaCha20-Poly1305': {
    title: 'XChaCha20-Poly1305',
    subtitle: 'Cel Mai Modern Algoritm',
    body: 'XChaCha20 este versiunea îmbunătățită a lui ChaCha20, creată de Daniel J. Bernstein, un matematician genial. Este folosit de Google Chrome și WhatsApp pentru a proteja comunicațiile. Diferența față de versiunea normală e că folosește o „amprentă" mult mai mare, ceea ce înseamnă că riscul de a repeta o combinație este practic zero.',
    analogy: 'Ca un lacăt cu o combinație de 192 de cifre — nu doar 96. Șansele să ghicești combinația sunt mai mici decât să câștigi la loto de 10 ori la rând.',
    useCase: 'Ideal pentru fișiere stocate în cloud sau trimise prin internet. Cea mai bună protecție pe termen lung.',
    strength: 'Combinație extinsă de 192 biți — cel mai sigur împotriva coliziunilor accidentale.',
  },
  'ChaCha20-Poly1305': {
    title: 'ChaCha20-Poly1305',
    subtitle: 'Viteza pe Dispozitive Mobile',
    body: 'ChaCha20 a fost creat special pentru a fi rapid pe telefoane și tablete, unde procesoarele nu sunt la fel de puternice ca pe calculatoare. Google l-a ales pentru a proteja traficul internet în Chrome și Android. Este la fel de sigur ca AES-GCM, dar rulează mai fluid pe dispozitive mai vechi.',
    analogy: 'Ca un sportiv de maraton — nu e cel mai mare sau cel mai puternic, dar aleargă constant și eficient, fără să obosească.',
    useCase: 'Excelent pentru fișiere mari pe telefon sau tabletă. Dacă vrei viteză fără compromisuri la securitate.',
    strength: 'La fel de sigur ca AES-GCM, dar de 2-3 ori mai rapid pe telefoane.',
  },
  'AES-CTR': {
    title: 'AES-CTR + HMAC',
    subtitle: 'Combinație Clasică Fortificată',
    body: 'AES-CTR este unul dintre cele mai vechi moduri de criptare. Singur, nu verifică dacă cineva a modificat fișierul. De aceea i-am adăugat un „gardian" — HMAC-SHA256 — care verifică integritatea datelor la fiecare decriptare. Dacă parola e greșită sau fișierul a fost atins, vei ști imediat.',
    analogy: 'Ca o scrisoare într-un plic transparent cu o bandă de sigiliu — plicul ascunde mesajul, iar banda arată dacă cineva a umblat la el.',
    useCase: 'Pentru cei care preferă algoritmi clasici, testați de timp. Acum este la fel de sigur ca oricare altul datorită HMAC.',
    strength: 'Combinație între cel mai studiat cifru (AES) și cel mai verificat sistem de autentificare (HMAC).',
  },
  'Salsa20-Poly1305': {
    title: 'Salsa20-Poly1305',
    subtitle: 'Clasicul Rapid al lui DJB',
    body: 'Salsa20 este „bunicul" lui ChaCha20 — algoritmul original creat de Daniel J. Bernstein în 2005. A fost finalist în competiția eSTREAM pentru cel mai bun algoritm de criptare. Deși a fost înlocuit de ChaCha20 (o versiune ușor îmbunătățită), rămâne extrem de rapid și sigur.',
    analogy: 'Ca o mașină clasică — nu are cele mai noi gadgeturi, dar motorul e fiabil și merge la fel de bine ca oricare alta.',
    useCase: 'Pentru cunoscători și pasionați de criptografie. O alegere solidă, testată de aproape 20 de ani.',
    strength: 'Finalist eSTREAM, auditat de mii de cercetători. 256 biți cheie + Poly1305 pentru integritate.',
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
    subtitle: 'Telefoane vechi / Entry-level',
    icon: Smartphone,
    ram: '2-4 GB RAM',
    cpu: 'Procesor dual-core / quad-core slab',
    limits: [
      { type: '🖼️ Poze', max: 'Până la 50 MB per fișier' },
      { type: '🎵 Audio', max: 'Până la 200 MB per fișier' },
      { type: '🎬 Video', max: 'Până la 500 MB per fișier' },
      { type: '📁 Foldere', max: 'Maxim 5-10 fișiere simultan' },
    ],
    warning: 'Acestea sunt doar estimări generale. Puteți încerca să criptați fișiere de dimensiuni mari, dar s-ar putea ca aplicația să dea crash dacă resursele nu sunt suficiente.',
    time: '~10-30 secunde per fișier de 10 MB',
  },
  mid: {
    label: 'Mid-Range',
    subtitle: 'Telefoane recente / Laptopuri',
    icon: Monitor,
    ram: '6-8 GB RAM',
    cpu: 'Procesor oct-core mediu',
    limits: [
      { type: '🖼️ Poze', max: 'Fără limită practică' },
      { type: '🎵 Audio', max: 'Până la 500 MB per fișier' },
      { type: '🎬 Video', max: 'Până la 1 GB per fișier' },
      { type: '📁 Foldere', max: 'Maxim 15-25 fișiere simultan' },
    ],
    warning: 'Acestea sunt doar estimări generale. Puteți încerca să criptați fișiere de dimensiuni mari, dar s-ar putea ca aplicația să dea crash dacă resursele nu sunt suficiente.',
    time: '~5-15 secunde per fișier de 10 MB',
  },
  flagship: {
    label: 'Flagship',
    subtitle: 'PC-uri puternice / Telefoane premium',
    icon: Server,
    ram: '16+ GB RAM',
    cpu: 'Procesor multi-core performant',
    limits: [
      { type: '🖼️ Poze', max: 'Fără limită practică' },
      { type: '🎵 Audio', max: 'Fără limită practică' },
      { type: '🎬 Video', max: 'Până la 4 GB per fișier' },
      { type: '📁 Foldere', max: 'Maxim 50+ fișiere simultan' },
    ],
    warning: 'Acestea sunt doar estimări generale. Puteți încerca să criptați fișiere de dimensiuni mari, dar s-ar putea ca aplicația să dea crash dacă resursele nu sunt suficiente.',
    time: '~2-8 secunde per fișier de 10 MB',
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
  const [selectedAlgo, setSelectedAlgo] = useState<CryptoAlgorithm>('AES-GCM');
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
              vaultStorage.save({
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
    if (step === 'key') return 'Cheie Criptare';
    if (step === 'processing') return 'Criptare...';
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
            className="relative w-full max-w-lg glass-card rounded-[32px] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20 text-neon-green">
                        {infoAlgo ? <HelpCircle size={20} /> : step === 'key' ? <Key size={20} /> : <Shield size={20} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{getHeaderTitle()}</h3>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{getHeaderSubtitle()}</p>
                    </div>
                </div>
                {!isProcessing && (
                    <div />
                )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    
                    {/* ALGORITHM INFO PAGE */}
                    {infoAlgo && step === 'algo' && (
                        <motion.div
                            key="algo-info"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            className="space-y-5"
                        >
                            <button
                                onClick={() => setInfoAlgo(null)}
                                className="text-xs font-bold text-zinc-500 hover:text-neon-green uppercase tracking-wider flex items-center gap-2 transition-colors"
                            >
                                <ArrowLeft size={14} /> Înapoi la algoritmi
                            </button>

                            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                                <h4 className="text-sm font-bold text-white mb-3">Ce este?</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">{ALGO_INFO[infoAlgo].body}</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-neon-green/5 border border-neon-green/20">
                                <h4 className="text-sm font-bold text-neon-green mb-2 flex items-center gap-2">
                                    <span className="text-base">💡</span> Analogie
                                </h4>
                                <p className="text-xs text-zinc-300 leading-relaxed italic">{ALGO_INFO[infoAlgo].analogy}</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                                <h4 className="text-sm font-bold text-white mb-2">Când să-l folosești?</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">{ALGO_INFO[infoAlgo].useCase}</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                                <h4 className="text-sm font-bold text-white mb-2">Nivel de securitate</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed">{ALGO_INFO[infoAlgo].strength}</p>
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
                            className="space-y-4"
                        >
                            <div className="mb-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">{t('selectAlgorithm')}</h4>
                                <p className="text-xs text-zinc-400">{t('chooseCryptoEngine')}</p>
                            </div>

                            {/* STREAMING - Fixed at top */}
                            <button
                                onClick={() => setSelectedAlgo('AES-GCM-Stream')}
                                className={`group relative p-4 rounded-2xl border text-left transition-all overflow-hidden ${selectedAlgo === 'AES-GCM-Stream' ? 'bg-neon-green/10 border-neon-green shadow-[0_0_20px_rgba(57,255,20,0.15)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'}`}
                            >
                                <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-neon-green/20 text-neon-green text-[8px] font-black uppercase tracking-widest">
                                    Recomandat
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedAlgo === 'AES-GCM-Stream' ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-800 text-zinc-500'}`}>
                                        <Zap size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-sm font-bold ${selectedAlgo === 'AES-GCM-Stream' ? 'text-white' : 'text-zinc-300'}`}>AES-GCM Stream</span>
                                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${selectedAlgo === 'AES-GCM-Stream' ? 'bg-neon-green text-black' : 'bg-zinc-800 text-zinc-500'}`}>STREAM</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                                            Potrivit pentru orice tip de fișier, indiferent de dimensiune. Nu contează resursele dispozitivului — procesează în bucăți mici de 4MB.
                                        </p>
                                    </div>
                                </div>
                                {selectedAlgo === 'AES-GCM-Stream' && (
                                    <div className="absolute inset-0 rounded-2xl border-2 border-neon-green pointer-events-none" />
                                )}
                            </button>

                            <div className="flex items-center gap-3 px-1">
                                <div className="flex-1 h-px bg-zinc-800" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Alți algoritmi</span>
                                <div className="flex-1 h-px bg-zinc-800" />
                            </div>

                            <div className="grid gap-3">
                                {ALGORITHMS.filter(a => a.id !== 'AES-GCM-Stream').map((algo) => (
                                    <button
                                        key={algo.id}
                                        onClick={() => setSelectedAlgo(algo.id)}
                                        className={`group relative p-4 rounded-2xl border text-left transition-all ${selectedAlgo === algo.id ? 'bg-neon-green/5 border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.1)]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <Zap size={14} className={selectedAlgo === algo.id ? 'text-neon-green' : 'text-zinc-600'} />
                                                <span className={`text-sm font-bold ${selectedAlgo === algo.id ? 'text-white' : 'text-zinc-300'}`}>{algo.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setInfoAlgo(algo.id); }}
                                                    className="p-1 rounded-full text-zinc-600 hover:text-neon-green hover:bg-zinc-800 transition-colors"
                                                >
                                                    <HelpCircle size={14} />
                                                </button>
                                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${selectedAlgo === algo.id ? 'bg-neon-green text-black border-neon-green' : 'bg-black text-zinc-600 border-zinc-800'}`}>
                                                    {algo.badge}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 pl-6 group-hover:text-zinc-400 transition-colors">{algo.desc}</p>
                                        
                                        {selectedAlgo === algo.id && (
                                            <div className="absolute inset-0 rounded-2xl border-2 border-neon-green pointer-events-none" />
                                        )}
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
                            className="space-y-6"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Key size={14} className="text-neon-green" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">{t('uniqueKey') || 'Cheie Unică (Passphrase)'}</h4>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-neon-green/10 blur-xl rounded-xl opacity-50" />
                                    <div className="relative bg-black border border-zinc-800 rounded-xl p-4 font-mono text-xs text-neon-green break-all leading-relaxed shadow-inner">
                                        {generatedKey}
                                    </div>
                                    <button 
                                        onClick={handleCopy}
                                        className="absolute top-2 right-2 p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 transition-colors"
                                    >
                                        {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-2">
                                        <Shield size={12} /> 
                                        IMPORTANT: Salvează această cheie ACUM!
                                    </p>
                                    <p className="text-[10px] text-red-400 mt-1">
                                        {saveToVault 
                                            ? 'Fișierul va fi criptat cu această cheie. Aplicația o salvează automat în Vault.'
                                            : 'Fișierul va fi criptat cu această cheie. Dacă o pierzi, nu mai poate fi decriptat. Aplicația NU o stochează automat.'}
                                    </p>
                                </div>
                            </div>

                            {/* SAVE TO VAULT */}
                            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                                <button
                                    onClick={handleToggleSaveToVault}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${saveToVault ? 'bg-neon-green/5 border-neon-green/30' : 'bg-black/50 border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${saveToVault ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-800 text-zinc-500'}`}>
                                            <Shield size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-xs font-bold ${saveToVault ? 'text-white' : 'text-zinc-400'}`}>Salvează în Vault</p>
                                            <p className="text-[9px] text-zinc-600">Cheia va fi stocată local pentru acces rapid</p>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-6 rounded-full flex items-center transition-colors ${saveToVault ? 'bg-neon-green' : 'bg-zinc-700'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform mx-1 ${saveToVault ? 'translate-x-4' : ''}`} />
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {saveToVault && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4 space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    Alege Categoria
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(() => {
                                                        const cats = JSON.parse(localStorage.getItem('crytotool_vault_cats') || '[]');
                                                        const defaultCats = [
                                                            { id: 'personal', name: 'Personal', color: '#39ff14' },
                                                            { id: 'financial', name: 'Financiar', color: '#eab308' },
                                                            { id: 'social', name: 'Social Media', color: '#3b82f6' },
                                                            { id: 'documents', name: 'Documente', color: '#a855f7' },
                                                        ];
                                                        const allCats = cats.length > 0 ? cats : defaultCats;
                                                        console.log('[EncryptionModal] Vault categories:', allCats);
                                                        return allCats.map((cat: any) => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={() => setSelectedVaultCategory(cat.id)}
                                                                className={`p-2.5 rounded-xl border text-left transition-all ${selectedVaultCategory === cat.id ? 'border-neon-green bg-neon-green/5' : 'border-zinc-800 bg-black/50 hover:border-zinc-700'}`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                                                    <span className={`text-[11px] font-bold ${selectedVaultCategory === cat.id ? 'text-white' : 'text-zinc-400'}`}>{cat.name}</span>
                                                                </div>
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
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
                                <h4 className="text-xl font-bold text-white">Criptare în curs...</h4>
                                <p className="text-zinc-400 text-xs mt-2 font-mono">Aplicare algoritm {selectedAlgo}</p>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {step !== 'processing' && (
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center shrink-0">
                    {step === 'key' ? (
                        <button 
                            onClick={() => setStep('algo')} 
                            className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-2"
                        >
                            <ArrowLeft size={14} /> {t('back') || 'Înapoi'}
                        </button>
                    ) : (
                        <div /> 
                    )}

                    {step === 'algo' ? (
                        <button 
                            onClick={() => setStep('key')}
                            className="px-6 py-3 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            {t('continue' as any) || 'Continuă'} <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleEncrypt}
                            className="px-8 py-3 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <Lock size={14} /> {t('applyEncryption') || 'Aplică Criptarea'}
                        </button>
                    )}
                </div>
            )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
