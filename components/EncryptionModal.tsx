
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
  { id: 'AES-GCM', name: 'AES-GCM', desc: 'Standardul industriei. Autentificat & Rapid. Recomandat de guverne.', badge: 'NIST' },
  { id: 'XChaCha20-Poly1305', name: 'XChaCha20-Poly1305', desc: 'Cel mai modern. Nonce extins 192-bit. Ideal pentru cloud și stocare.', badge: 'MODERN' },
  { id: 'ChaCha20-Poly1305', name: 'ChaCha20-Poly1305', desc: 'Rapid pe mobile. Folosit de Google Chrome și WhatsApp.', badge: 'FAST' },
  { id: 'AES-CTR', name: 'AES-CTR', desc: 'Clasic + HMAC-SHA256. Sigur și testat în timp.', badge: 'HMAC' },
  { id: 'Salsa20-Poly1305', name: 'Salsa20-Poly1305', desc: 'Bunicul lui ChaCha20. Rapid și sigur. Pentru pasionați.', badge: 'CLASSIC' },
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
                                ← Înapoi
                            </button>

                            <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-900/80 border border-zinc-800">
                                <h4 className="text-[10px] md:text-base font-bold text-white mb-1">Ce este?</h4>
                                <p className="text-[9px] md:text-sm text-zinc-400 leading-tight">{ALGO_INFO[infoAlgo].body}</p>
                            </div>

                            <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-neon-green/5 border border-neon-green/20">
                                <h4 className="text-[10px] md:text-base font-bold text-neon-green mb-1">💡 Analogie</h4>
                                <p className="text-[9px] md:text-sm text-zinc-300 leading-tight italic">{ALGO_INFO[infoAlgo].analogy}</p>
                            </div>

                            <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-800/50 border border-zinc-700">
                                <h4 className="text-[10px] md:text-base font-bold text-zinc-300 mb-1">Când să-l folosești?</h4>
                                <p className="text-[9px] md:text-sm text-zinc-400 leading-tight">{ALGO_INFO[infoAlgo].useCase}</p>
                            </div>

                            <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                                <h4 className="text-[10px] md:text-base font-bold text-zinc-400 mb-1">Nivel de securitate</h4>
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
                            <h4 className="text-[8px] font-black uppercase text-zinc-500">Algoritmi</h4>

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
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setInfoAlgo('AES-GCM-Stream'); }}
                                            className="text-zinc-600 hover:text-neon-green"
                                        >
                                            <HelpCircle size={8} className="md:size-4" />
                                        </button>
                                        <span className="text-[7px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1.5 rounded md:rounded-full bg-neon-green/20 text-neon-green font-bold">Recomandat</span>
                                    </div>
                                </div>
                                <p className="text-[7px] md:text-sm text-zinc-500 mt-1 md:mt-2">Streaming — orice dimensiune, orice dispozitiv. Ideal pentru telefoane vechi și tablete.</p>
                            </button>

                            <div className="flex items-center gap-2 md:gap-4 my-2 md:my-4">
                                <div className="flex-1 h-px bg-zinc-800" />
                                <span className="text-[7px] md:text-xs font-black uppercase text-zinc-700">Alți algoritmi</span>
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
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setInfoAlgo(algo.id); }}
                                                    className="text-zinc-600 hover:text-neon-green"
                                                >
                                                    <HelpCircle size={8} className="md:size-4" />
                                                </button>
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
                                <h4 className="text-[8px] md:text-sm font-black text-zinc-300">Cheie Unică</h4>
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
                                <p className="text-[7px] md:text-xs text-zinc-400">Salvează această cheie în Vault sau copiază-o!</p>
                            </div>

                            <button
                                onClick={handleToggleSaveToVault}
                                className={`w-full flex items-center justify-between p-2 md:p-4 rounded border md:rounded-xl ${saveToVault ? 'bg-neon-green/5 border-neon-green/30' : 'bg-black/50 border-zinc-800'}`}
                            >
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className={`w-5 h-5 md:w-8 md:h-8 rounded md:rounded-xl flex items-center justify-center ${saveToVault ? 'bg-neon-green/20' : 'bg-zinc-800'}`}>
                                        <Shield size={8} className="md:size-4" />
                                    </div>
                                    <span className="text-[9px] md:text-sm font-bold text-zinc-400">Salvează în Vault</span>
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
                                <h4 className="text-xl font-bold text-white">Criptare în curs...</h4>
                                <p className="text-zinc-400 text-xs mt-2 font-mono">Aplicare algoritm {selectedAlgo}</p>
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
                            ← Înapoi
                        </button>
                    ) : (
                        <div /> 
                    )}

                    {step === 'algo' ? (
                        <button 
                            onClick={() => setStep('key')}
                            className="px-5 md:px-10 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                            Continuă →
                        </button>
                    ) : (
                        <button 
                            onClick={handleEncrypt}
                            className="px-5 md:px-10 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                            Criptare →
                        </button>
                    )}
                </div>
            )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
