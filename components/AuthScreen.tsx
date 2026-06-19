import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, Timer, Fingerprint, Key, Sparkles, Edit3, Copy, Check, ChevronRight, Target, Shield, ShieldAlert, Skull, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../locales/i18nContext';
import crytoLogo from '../assets/CrytoTool.png';
import { AutoDestructCountdown } from './AutoDestructCountdown';
import { LiquidGlassOverlay } from './LiquidGlassOverlay';
import type { AutoDestructCountdownHandle } from './AutoDestructCountdown';
import {
  derive_key,
  derive_master_key,
  wrap_raw_key,
  unwrap_raw_key,
  base64_decode,
  base64_encode,
  generate_recovery_codes,
  generate_vault_key,
  decrypt,
  get_argon_params,
} from '../crypto-core/index';
import { setVaultKey } from '../crypto-core/db';
import type { CryptoMetadata, VaultWrappers } from '../types';

interface AuthScreenProps {
  onUnlock: () => void;
  isSetup: boolean;
  lockUntil: number | null;
  onFailedAttempt: () => void;
  recoverySettings?: {
    count: number;
  };
  onResetWithRecovery: (code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  destructRef: React.RefObject<AutoDestructCountdownHandle | null>;
  onDestructComplete: () => void;
  onNewCodes?: (codes: string[]) => void;
  onStoreMasterKey?: (key: Uint8Array) => void;
  onApplyThreatModel?: (config: { autoBlurSeconds: number; autoLockSeconds: number; failedAttemptsThreshold: number; progressiveLockSeconds: number; autoDestructEnabled: boolean; autoDestructAttempts: number; autoDestructInactivity: number; destructCountdownSeconds: number; minPasswordLength?: number; settingsPasswordRequired?: boolean; biometricAllowed?: boolean; vaultPinAllowed?: boolean }) => void;
  biometricAvailable?: boolean;
  biometricEnabled?: boolean;
  onBiometricUnlock?: () => Promise<void>;
  onSetupComplete?: (biometricWanted: boolean) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onUnlock, isSetup, lockUntil, onFailedAttempt, recoverySettings, onResetWithRecovery, destructRef, onDestructComplete, onNewCodes, onStoreMasterKey, onApplyThreatModel, biometricAvailable, biometricEnabled, onBiometricUnlock, onSetupComplete }) => {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [biometricError, setBiometricError] = useState(false);
  const [isDestructing, setIsDestructing] = useState(false);
  const [setupStep, setSetupStep] = useState<'welcome' | 'create' | 'biometric-threat'>('welcome');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [infoTier, setInfoTier] = useState<number | null>(null);
  const [blockedTier, setBlockedTier] = useState<number | null>(null);
  const [confirmTier, setConfirmTier] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [enableBiometricOn, setEnableBiometricOn] = useState(false);

  const [setupProgress, setSetupProgress] = useState(0);
  const [setupProgressLabel, setSetupProgressLabel] = useState('');

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const accentColor = localStorage.getItem('theme_accent') || '#E8E8E8';
  const accentRgb = (() => {
    const c = accentColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)}`;
  })();

  const themeConfig = (() => {
    try {
      const saved = localStorage.getItem('app_theme_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();
  const bgMain = themeConfig?.['--bg-main'] || '#000000';

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
    if (isLocked && !isDestructing) return;
    setError(null);
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 16));

    try {
      if (isSetup) return;

      const wrappersRaw = localStorage.getItem('crytotool_vault_wrappers');
        if (wrappersRaw) {
          const metadataRaw = localStorage.getItem('crytotool_crypto_metadata');
          if (!metadataRaw) {
            setError(t('missingData'));
            setIsProcessing(false);
            return;
          }

          const wrappers: VaultWrappers = JSON.parse(wrappersRaw);
          const meta: CryptoMetadata = JSON.parse(metadataRaw);
          const masterSalt = base64_decode(meta.master_salt);
          const ap = meta.argon || { iterations: 2, memoryKib: 19456, parallelism: 1 };

        const masterKey = derive_key(new TextEncoder().encode(password), masterSalt, ap.iterations, ap.memoryKib, ap.parallelism, 32);

          try {
            const mvkBytes = await unwrap_raw_key(JSON.stringify(wrappers.master), masterKey);
            setVaultKey(mvkBytes);
            mvkBytes.fill(0);
            onStoreMasterKey?.(masterKey);
            onUnlock();
          } catch (err) {
            setError(t('wrongPassword'));
            setPassword('');
            if (!isDestructing) onFailedAttempt();
          }
        } else {
          const saltB64 = localStorage.getItem('crytotool_salt');
          const ivB64 = localStorage.getItem('crytotool_iv');
          const vaultB64 = localStorage.getItem('crytotool_vault_blob');

          if (!saltB64 || !ivB64 || !vaultB64) {
            setError(t('missingData'));
            setIsProcessing(false);
            return;
          }

          const salt = base64_decode(saltB64);
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

          const masterKey = derive_master_key(password, salt, isMobile);

          try {
            const rawVaultKey = decrypt(vaultB64, ivB64, masterKey);
            setVaultKey(rawVaultKey);
            onStoreMasterKey?.(masterKey);
            onUnlock();
          } catch (err) {
            setError(t('wrongPassword'));
            setPassword('');
            if (!isDestructing) onFailedAttempt();
          }
        }
    } catch (err) {
      console.error(err);
      setError(t('cryptoError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 30) {
      setError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    setSetupStep('biometric-threat');
  };

  const completeSetup = async (argonParams: { iterations: number; memoryKib: number; parallelism: number }, tierId: number) => {
    setIsProcessing(true);
    setError(null);

    const yieldToReact = () => new Promise(r => setTimeout(r, 16));

    try {
      setSetupProgress(2);
      setSetupProgressLabel('Generating encryption keys...');
      await yieldToReact();
      const mvkBytes = await generate_vault_key();
      const codes = generate_recovery_codes();

      setSetupProgress(10);
      setSetupProgressLabel('Deriving master key...');
      await yieldToReact();
      const masterSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const masterKey = derive_key(new TextEncoder().encode(password), masterSalt, argonParams.iterations, argonParams.memoryKib, argonParams.parallelism, 32);

      setSetupProgress(30);
      setSetupProgressLabel('Wrapping master key...');
      await yieldToReact();
      const masterWrapper = JSON.parse(await wrap_raw_key(mvkBytes, masterKey));

      setSetupProgress(35);
      setSetupProgressLabel('Generating recovery codes...');
      await yieldToReact();
      const recoverySalts: string[] = [];
      const recoveryWrappers: Record<string, { ciphertext: string; iv: string }> = {};

      const recoveryParams = JSON.parse(get_argon_params('recovery', tierId));
      let codesDone = 0;
      const batchSize = 3;
      for (let b = 0; b < codes.length; b += batchSize) {
        const batch = codes.slice(b, b + batchSize);
        const results = await Promise.all(batch.map(async (code, bi) => {
          const i = b + bi;
          const salt = window.crypto.getRandomValues(new Uint8Array(16));
          const key = await derive_key(new TextEncoder().encode(code), salt, recoveryParams.iterations, recoveryParams.memorySize, recoveryParams.parallelism, 32);
          const paddedIdx = String(i + 1).padStart(2, '0');
          const wrapper = JSON.parse(await wrap_raw_key(mvkBytes, key));
          return { salt: base64_encode(salt), paddedIdx, wrapper };
        }));
        for (const r of results) {
          recoverySalts.push(r.salt);
          recoveryWrappers[r.paddedIdx] = r.wrapper;
        }
        codesDone += batch.length;
        setSetupProgress(35 + Math.round((codesDone / codes.length) * 55));
        setSetupProgressLabel(`Generating recovery codes (${codesDone}/${codes.length})...`);
        await yieldToReact();
      }

      setSetupProgress(92);
      setSetupProgressLabel('Finalizing setup...');
      await yieldToReact();
      const meta: CryptoMetadata = {
        master_salt: base64_encode(masterSalt),
        recovery_salts: recoverySalts,
        argon: argonParams,
        tier: tierId,
      };
      const wrappers: VaultWrappers = {
        master: masterWrapper,
        recovery: recoveryWrappers,
      };

      localStorage.setItem('crytotool_crypto_metadata', JSON.stringify(meta));
      localStorage.setItem('crytotool_vault_wrappers', JSON.stringify(wrappers));

      setVaultKey(mvkBytes);
      mvkBytes.fill(0);
      onStoreMasterKey?.(masterKey);
      onNewCodes?.(codes);
      setSetupProgress(100);
      setSetupProgressLabel('Done!');
      await yieldToReact();
      await onSetupComplete?.(enableBiometricOn);
    } catch (err) {
      console.error(err);
      setError(t('cryptoError'));
      setIsProcessing(false);
    }
  };

  const THREAT_MODEL_TIER1 = {
    autoBlurSeconds: 20,
    autoLockSeconds: 25,
    failedAttemptsThreshold: 3,
    progressiveLockSeconds: 60,
    autoDestructEnabled: false,
    autoDestructAttempts: 5,
    autoDestructInactivity: 0,
    destructCountdownSeconds: 30,
    minPasswordLength: 30,
    settingsPasswordRequired: false,
    biometricAllowed: true,
    vaultPinAllowed: true,
    backupFilenameRandom: false,
    recoveryFilenameRandom: false,
    argon: { iterations: 2, memoryKib: 19456, parallelism: 1 },
    argonRecovery: { iterations: 2, memoryKib: 19456, parallelism: 1 },
    argonPin: { iterations: 2, memoryKib: 32768, parallelism: 1 },
  };

  const THREAT_MODEL_TIER2 = {
    autoBlurSeconds: 10,
    autoLockSeconds: 15,
    failedAttemptsThreshold: 3,
    progressiveLockSeconds: 120,
    autoDestructEnabled: false,
    autoDestructAttempts: 5,
    autoDestructInactivity: 0,
    destructCountdownSeconds: 30,
    minPasswordLength: 30,
    settingsPasswordRequired: false,
    biometricAllowed: true,
    vaultPinAllowed: true,
    backupFilenameRandom: true,
    recoveryFilenameRandom: true,
    argon: { iterations: 3, memoryKib: 65536, parallelism: 1 },
    argonRecovery: { iterations: 3, memoryKib: 65536, parallelism: 1 },
    argonPin: { iterations: 3, memoryKib: 65536, parallelism: 1 },
  };

  const THREAT_MODEL_TIER3 = {
    autoBlurSeconds: 5,
    autoLockSeconds: 10,
    failedAttemptsThreshold: 2,
    progressiveLockSeconds: 300,
    autoDestructEnabled: true,
    autoDestructAttempts: 5,
    autoDestructInactivity: 86400,
    destructCountdownSeconds: 30,
    minPasswordLength: 40,
    settingsPasswordRequired: true,
    biometricAllowed: false,
    vaultPinAllowed: false,
    backupFilenameRandom: true,
    recoveryFilenameRandom: true,
    argon: { iterations: 10, memoryKib: 131072, parallelism: 1 },
    argonRecovery: { iterations: 10, memoryKib: 131072, parallelism: 1 },
    argonPin: { iterations: 10, memoryKib: 131072, parallelism: 1 },
  };

  const THREAT_MODEL_TIER4 = {
    autoBlurSeconds: 2,
    autoLockSeconds: 5,
    failedAttemptsThreshold: 2,
    progressiveLockSeconds: 0,
    autoDestructEnabled: true,
    autoDestructAttempts: 3,
    autoDestructInactivity: 43200,
    destructCountdownSeconds: 15,
    minPasswordLength: 50,
    settingsPasswordRequired: true,
    biometricAllowed: false,
    vaultPinAllowed: false,
    backupFilenameRandom: true,
    recoveryFilenameRandom: true,
    argon: { iterations: 19, memoryKib: 262144, parallelism: 1 },
    argonRecovery: { iterations: 19, memoryKib: 262144, parallelism: 1 },
    argonPin: { iterations: 19, memoryKib: 262144, parallelism: 1 },
  };

  const TIERS = [
    { id: 1, icon: Target, nameKey: 'tier1Name', descKey: 'tier1Desc', blocked: false, config: THREAT_MODEL_TIER1 },
    { id: 2, icon: Shield, nameKey: 'tier2Name', descKey: 'tier2Desc', blocked: true, config: THREAT_MODEL_TIER2 },
    { id: 3, icon: ShieldAlert, nameKey: 'tier3Name', descKey: 'tier3Desc', blocked: true, config: THREAT_MODEL_TIER3 },
    { id: 4, icon: Skull, nameKey: 'tier4Name', descKey: 'tier4Desc', blocked: true, config: THREAT_MODEL_TIER4 },
  ] as const;

  const WORD_LIST = [
    'apple','autumn','basin','batch','beach','beard','bench','birth','black','blank',
    'blast','blend','bless','blind','block','bloom','board','boast','bonus','boost',
    'brain','brand','brave','bread','break','breed','brief','bring','broad','brook',
    'brown','brush','build','bunch','burst','cabin','cable','calm','camel','candy',
    'cargo','carve','catch','cause','cedar','chain','chair','chalk','charm','chart',
    'chase','cheap','check','cheek','cheer','chess','chest','chief','child','chill',
    'choir','civic','civil','claim','clash','class','clean','clear','clerk','cliff',
    'climb','cling','clock','close','cloth','cloud','coach','coast','coral','couch',
    'count','court','cover','crack','craft','crane','crash','crawl','cream','crest',
    'crime','crisp','cross','crowd','crown','crush','curve','cycle','daily','dance',
    'debut','decay','delay','delta','dense','depth','derby','diary','donor','doubt',
    'draft','drain','drama','dress','drift','drill','drink','drive','drone','eager',
    'eagle','early','earth','eight','elder','elect','elite','empty','enjoy','enter',
    'entry','equal','equip','error','essay','event','exact','exist','extra','fable',
    'faith','false','fancy','fatal','fault','feast','fence','ferry','fetch','fever',
    'fiber','field','fierce','fifth','fifty','fight','final','first','flame','flash',
    'fleet','flesh','float','flock','flood','floor','flora','flour','fluid','flush',
    'focus','force','forge','forth','forum','found','frame','frank','fraud','fresh',
    'front','frost','fruit','gauge','ghost','giant','given','glad','glare','glass',
    'glide','globe','gloom','glory','glove','glow','grace','grade','grain','grand',
    'grant','grape','graph','grasp','grass','grave','great','green','greet','grief',
    'grill','grind','gross','group','grove','guard','guess','guest','guide','guild',
    'guilt','habit','happy','harsh','haven','heart','heavy','hedge','height','helmet',
    'herald','herd','hike','honey','honor','horse','hotel','house','hover','human',
    'humor','hurry','ideal','image','imply','index','inner','input','irony','ivory',
    'jewel','joint','judge','juice','kebab','kernel','kettle','keypad','knock','label',
    'labor','ladder','lance','large','laser','later','launch','layer','layout','leader',
    'leaf','league','learn','leave','ledge','legal','lemon','level','light','limit',
    'linen','links','liver','lobby','local','lodge','logic','loose','lover','lower',
    'loyal','lucky','lunar','lunch','luxury','magic','major','maker','manor','maple',
    'marble','march','margin','marker','market','marsh','mask','match','maxim','mayor',
    'meadow','media','melon','melt','member','memory','mercy','merge','merit','metal',
    'meter','might','minor','minus','mirror','mixed','mobile','model','money','month',
    'moral','motor','mount','mouse','mouth','movie','museum','music','naive','narrow',
    'naval','nerve','never','night','noble','noise','north','noted','novel','nurse',
    'nylon','oasis','ocean','offer','often','olive','opera','orbit','order','organ',
    'other','outer','output','oval','oven','owner','oxide','ozone','panel','panic',
    'paper','pardon','parish','parrot','party','patch','pause','peace','pearl','phase',
    'phone','photo','piano','piece','pilot','pinch','pixel','place','plain','plane',
    'plant','plate','plaza','pluck','plumb','plume','point','polar','polish','polite',
    'porch','pork','port','post','potato','pound','power','press','price','pride',
    'prime','print','prior','prism','prize','probe','proof','pulse','punch','pupil',
    'purple','purse','quest','queue','quick','quiet','quite','quote','radar','radio',
    'raise','rally','ranch','range','rapid','ratio','reach','react','ready','realm',
    'rebel','refer','reign','relax','relay','renew','reply','resin','reward','rhythm',
    'rifle','right','rigid','ruler','rural','saber','safari','salad','salmon','salon',
    'salute','satin','sauce','scale','scalp','scene','scent','scope','score','scrub',
    'search','second','secret','sense','sensor','setup','seven','shade','shadow','shape',
    'share','shark','sharp','shawl','sheep','sheet','shelf','shell','shift','shine',
    'shirt','shock','shore','short','shout','sight','sigma','silly','since','sketch',
    'skill','skull','slate','slave','sleep','slice','slide','slope','smart','smell',
    'smile','smoke','snack','snake','solar','solid','solve','sorry','sound','south',
    'space','spare','spark','speak','spear','speed','spell','spend','spice','spill',
    'spine','spirit','split','spoil','spoon','sport','spray','spread','spring','square',
    'stable','stair','stamp','stand','stark','start','state','steam','steel','steep',
    'steer','stern','stick','stiff','still','stock','stone','stood','stool','store',
    'storm','story','stove','strap','straw','strip','stuck','study','stuff','style',
    'sugar','suite','sunny','super','surge','swamp','swan','swap','sweet','swift',
    'swing','sword','table','tablet','taste','teach','teeth','temple','theme','thick',
    'thief','thing','think','third','thorn','three','throw','thumb','tiger','tight',
    'timer','tired','title','token','total','touch','towel','tower','trace','track',
    'trade','trail','train','trait','trash','treat','trend','trial','tribe','trick',
    'troop','truck','truly','trump','trunk','trust','truth','twice','twist','ultra',
    'uncle','under','union','unite','unity','upper','upset','urban','usage','usual',
    'valid','value','valve','vault','venue','verse','video','vigor','vinyl','viral',
    'virus','visit','vista','vital','vivid','vocal','voice','voter','waist','waste',
    'watch','water','weave','wheat','wheel','white','whole','woman','world','worry',
    'worse','worst','worth','wound','write','wrong','yacht','yield','young','youth',
    'zebra','zone',
  ];

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    const bytes = new Uint32Array(32);
    window.crypto.getRandomValues(bytes);
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };

  const generatePassphrase = (): string => {
    const indices = new Uint32Array(6);
    window.crypto.getRandomValues(indices);
    return Array.from(indices).map(i => WORD_LIST[i % WORD_LIST.length]).join('-');
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const Logo = () => (
    <div className={`relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center transition-all duration-700`}>
      <div className={`absolute -inset-4 md:-inset-6 blur-[80px] md:blur-[120px] rounded-full animate-pulse transition-all duration-700 ${isLocked ? 'bg-red-500/20' : ''}`} style={{ backgroundColor: isLocked ? undefined : `rgba(${accentRgb}, 0.3)` }} />
      <div className={`absolute inset-0 md:inset-2 blur-2xl md:blur-3xl rounded-full ${isLocked ? 'bg-red-500/10' : ''}`} style={{ backgroundColor: isLocked ? undefined : `rgba(${accentRgb}, 0.2)` }} />
      <img
        src={crytoLogo}
        alt="CrytoTool"
        className={`w-full h-full object-contain transition-all duration-500 ${isLocked ? 'opacity-50 grayscale' : ''}`}
        style={{ filter: isLocked ? 'none' : `drop-shadow(0 0 40px rgba(${accentRgb}, 0.6)) drop-shadow(0 0 80px rgba(${accentRgb}, 0.3)) drop-shadow(0 0 120px rgba(${accentRgb}, 0.15))` }}
      />
    </div>
  );

  if (isSetup) {
    return (
      <div className="bg-black h-screen h-dvh overflow-hidden">
        <AnimatePresence mode="wait">
          {setupStep === 'welcome' ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center px-6 h-full"
            >
              <div className="flex flex-col items-center space-y-3 md:space-y-4">
                <div className="relative w-36 h-36 md:w-48 md:h-48">
                  <div className="absolute -inset-4 md:-inset-6 blur-[80px] md:blur-[120px] rounded-full animate-pulse" style={{ backgroundColor: `rgba(${accentRgb}, 0.3)` }} />
                  <img src={crytoLogo} alt="CrytoTool" className="w-full h-full object-contain" style={{ filter: `drop-shadow(0 0 40px rgba(${accentRgb}, 0.6)) drop-shadow(0 0 80px rgba(${accentRgb}, 0.3))` }} />
                </div>
                <div className="text-xl md:text-2xl font-bold tracking-tight">
                  <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('crytoPrefix')}</span>
                  <span className="drop-shadow-[0_0_12px_rgba(212,212,216,0.5)]" style={{ color: accentColor }}>{t('toolSuffix')}</span>
                </div>
                <p className="text-zinc-400 text-xs text-center mb-1">{t('allInOnePrivacyTagline')}</p>
              </div>

              <div className="w-full max-w-sm glass-card border border-white/10 rounded-2xl p-4 mt-5 space-y-2.5">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/50">
                  <ShieldCheck size={16} className="text-neon-green shrink-0" />
                  <span className="text-xs text-zinc-300">{t('argon2idAES')}</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/50">
                  <ShieldCheck size={16} className="text-neon-green shrink-0" />
                  <span className="text-xs text-zinc-300">{t('clientSide')}</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/50">
                  <Key size={16} className="text-neon-green shrink-0" />
                  <span className="text-xs text-zinc-300">{t('min30Chars')}</span>
                </div>
              </div>

              <button onClick={() => setSetupStep('create')}
                className="mt-5 w-full max-w-sm py-3 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                style={{ backgroundColor: accentColor, boxShadow: `0 0 20px rgba(${accentRgb}, 0.3)` }}
              >
                {t('continueButton')} <ChevronRight size={18} />
              </button>
            </motion.div>
          ) : setupStep === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center px-6 h-full"
            >
              <div className="flex flex-col items-center space-y-2 md:space-y-3 mb-4">
                <div className="relative w-36 h-36 md:w-48 md:h-48">
                  <div className="absolute -inset-4 md:-inset-6 blur-[80px] md:blur-[120px] rounded-full animate-pulse" style={{ backgroundColor: `rgba(${accentRgb}, 0.3)` }} />
                  <img src={crytoLogo} alt="CrytoTool" className="w-full h-full object-contain" style={{ filter: `drop-shadow(0 0 40px rgba(${accentRgb}, 0.6)) drop-shadow(0 0 80px rgba(${accentRgb}, 0.3))` }} />
                </div>
                <div className="text-xl md:text-2xl font-bold tracking-tight">
                  <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('crytoPrefix')}</span>
                  <span className="drop-shadow-[0_0_12px_rgba(212,212,216,0.5)]" style={{ color: accentColor }}>{t('toolSuffix')}</span>
                </div>
                <p className="text-zinc-400 text-xs text-center">{t('setupCreateTitle')}</p>
              </div>

              <div className="w-full max-w-sm glass-card border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => { const pwd = generatePassword(); setPassword(pwd); setConfirmPassword(pwd); setError(null); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all active:scale-[0.96]"
                  ><Key size={18} className="text-neon-green" /><span className="text-[10px] text-zinc-300 font-medium text-center leading-tight">{t('setupGeneratePwd')}</span></button>
                  <button type="button" onClick={() => { const phrase = generatePassphrase(); setPassword(phrase); setConfirmPassword(phrase); setError(null); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all active:scale-[0.96]"
                  ><Sparkles size={18} className="text-neon-green" /><span className="text-[10px] text-zinc-300 font-medium text-center leading-tight">{t('setupCreatePhrase')}</span></button>
                  <button type="button" onClick={() => { setPassword(''); setConfirmPassword(''); setError(null); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-all active:scale-[0.96]"
                  ><Edit3 size={18} className="text-neon-green" /><span className="text-[10px] text-zinc-300 font-medium text-center leading-tight">{t('setupTypeManual')}</span></button>
                </div>

                {(password || confirmPassword) && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-[10px] text-center leading-relaxed">⚠️ {t('setupCopyWarning')}</p>
                  </motion.div>
                )}

                <button type="button" onClick={() => { setSetupStep('welcome'); setPassword(''); setConfirmPassword(''); setError(null); }}
                  className="text-[10px] text-zinc-500 hover:text-white transition-colors block"
                >← {t('backButton')}</button>

                <form onSubmit={handleCreateFormSubmit} className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-xs text-muted font-medium ml-1">{t('masterPassword')}</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('enterPasswordField')}
                        className="w-full bg-surface border border-border text-primary rounded-xl pl-3 pr-14 py-2.5 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted font-mono tracking-wider" autoFocus
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {password && (
                          <button type="button" onClick={handleCopyPassword} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                            {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} className="text-zinc-400" />}
                          </button>
                        )}
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                          {showPassword ? <EyeOff size={14} className="text-zinc-400" /> : <Eye size={14} className="text-zinc-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted font-medium ml-1">{t('confirmPassword')}</label>
                    <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmYourPassword')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                    />
                  </div>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-medium bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-center">
                      {error}
                    </motion.div>
                  )}
                  <button type="submit"
                    className="w-full py-2.5 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                    style={{ backgroundColor: accentColor }}
                  >
                    {t('saveAndContinue')} <ChevronRight size={18} />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="threat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center px-6 h-full"
            >
              <div className="flex flex-col items-center space-y-2 md:space-y-3 mb-4">
                <div className="relative w-36 h-36 md:w-48 md:h-48">
                  <div className="absolute -inset-4 md:-inset-6 blur-[80px] md:blur-[120px] rounded-full animate-pulse" style={{ backgroundColor: `rgba(${accentRgb}, 0.3)` }} />
                  <img src={crytoLogo} alt="CrytoTool" className="w-full h-full object-contain" style={{ filter: `drop-shadow(0 0 40px rgba(${accentRgb}, 0.6)) drop-shadow(0 0 80px rgba(${accentRgb}, 0.3))` }} />
                </div>
                <div className="text-xl md:text-2xl font-bold tracking-tight">
                  <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{t('crytoPrefix')}</span>
                  <span className="drop-shadow-[0_0_12px_rgba(212,212,216,0.5)]" style={{ color: accentColor }}>{t('toolSuffix')}</span>
                </div>
                <p className="text-zinc-400 text-xs text-center">{t('threatModelDesc')}</p>
              </div>

              {(!selectedTier || TIERS.find(t => t.id === selectedTier)?.config.biometricAllowed !== false) && (
              <div className="w-full max-w-sm mb-3 glass-card border border-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${biometricAvailable ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Fingerprint size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{t('biometricSectionTitle')}</span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${biometricAvailable ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {biometricAvailable ? t('biometricSectionDesc') : t('biometricNotAvailable')}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {biometricAvailable ? (
                      <button
                        type="button"
                        onClick={() => setEnableBiometricOn(!enableBiometricOn)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          enableBiometricOn ? 'bg-neon-green' : 'bg-zinc-700'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          enableBiometricOn ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-600 font-medium px-2">{t('disabled')}</span>
                    )}
                  </div>
                </div>
              </div>
              )}

              <div className="w-full max-w-sm space-y-2">
                {TIERS.map((tier) => {
                  const Icon = tier.icon;
                  const cfg = tier.config;
                  const isSelected = selectedTier === tier.id;
                  const isBlocked = tier.blocked;
                  const showBlockedWarning = blockedTier === tier.id && isBlocked;
                  const showInfo = infoTier === tier.id;
                  return (
                    <div key={tier.id}>
                      <div
                        onClick={() => {
                          if (isBlocked) {
                            setBlockedTier(tier.id);
                            setSelectedTier(null);
                          } else {
                            setSelectedTier(tier.id);
                            setBlockedTier(null);
                          }
                          setInfoTier(null);
                        }}
                        className={`w-full glass-card border rounded-2xl p-3 text-left transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-neon-green/50 bg-neon-green/5'
                            : showBlockedWarning
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isSelected ? 'bg-neon-green/20 text-neon-green' :
                          isBlocked ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${
                              isSelected ? 'text-neon-green' : isBlocked ? 'text-zinc-500' : 'text-white'
                            }`}>{t(tier.nameKey as any)}</span>
                            {isSelected && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-green/20 text-neon-green font-medium">{t('tierRecommended')}</span>
                            )}
                            {isBlocked && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-medium">{t('tierNotAvailable')}</span>
                            )}
                          </div>
                          <p className={`text-[10px] mt-0.5 ${
                            isBlocked ? 'text-zinc-600' : 'text-zinc-400'
                          }`}>{t(tier.descKey as any)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoTier(showInfo ? null : tier.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            showInfo ? 'bg-neon-green/20 text-neon-green' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                          aria-label="View security settings"
                        >
                          <HelpCircle size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {blockedTier !== null && (() => {
                const tier = TIERS.find(t => t.id === blockedTier);
                if (!tier) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setBlockedTier(null)}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-full max-w-xs glass-card border border-red-500/20 rounded-2xl p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-red-400 mb-2">{t('auditLimitationTitle')}</p>
                          <p className="text-[10px] text-red-300/80 leading-relaxed">{t('auditLimitationBody')}</p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}

              {infoTier !== null && (() => {
                const tier = TIERS.find(t => t.id === infoTier);
                if (!tier) return null;
                const cfg = tier.config;
                const fmtInactivity = (s: number) => {
                  if (s === 0) return t('inactivityOff');
                  if (s < 60) return `${s}s`;
                  if (s < 3600) return `${Math.floor(s / 60)}m`;
                  if (s < 86400) return `${Math.floor(s / 3600)}h`;
                  return `${Math.floor(s / 86400)}d`;
                };
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setInfoTier(null)}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-full max-w-xs glass-card border border-white/10 rounded-2xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-neon-green/20 text-neon-green">
                          <tier.icon size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{t(tier.nameKey as any)}</p>
                          <p className="text-[9px] text-zinc-500">{t('tierInfoTitle')}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelBlur')}</span>
                          <span className="text-white font-medium">{cfg.autoBlurSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLock')}</span>
                          <span className="text-white font-medium">{cfg.autoLockSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelAttempts')}</span>
                          <span className="text-white font-medium">{cfg.failedAttemptsThreshold}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLockDur')}</span>
                          <span className="text-white font-medium">{cfg.progressiveLockSeconds === 0 ? t('recoveryOnly') : `${cfg.progressiveLockSeconds}s`}</span>
                        </div>
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelDestruct')}</span>
                          <span className={`font-medium ${cfg.autoDestructEnabled ? 'text-red-400' : 'text-zinc-500'}`}>{cfg.autoDestructEnabled ? t('on') : t('off')}</span>
                        </div>
                        {cfg.autoDestructEnabled && (
                          <>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructAtt')}</span>
                              <span className="text-white font-medium">{cfg.autoDestructAttempts}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructIn')}</span>
                              <span className="text-white font-medium">{fmtInactivity(cfg.autoDestructInactivity)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructCount')}</span>
                              <span className="text-white font-medium">{cfg.destructCountdownSeconds}s</span>
                            </div>
                          </>
                        )}
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="space-y-0.5">
                          <div className="grid grid-cols-4 gap-x-2 text-[8px] text-zinc-600 font-mono mb-0.5">
                            <span />
                            <span className="text-right">t</span>
                            <span className="text-right">m</span>
                            <span className="text-right">p</span>
                          </div>
                          {([
                            { label: 'master', params: cfg.argon },
                            { label: 'recovery', params: cfg.argonRecovery },
                            { label: 'PIN', params: cfg.argonPin },
                          ] as const).map(({ label, params }) => {
                            const mem = (params.memoryKib / 1024).toFixed(0);
                            return (
                              <div key={label} className="grid grid-cols-4 gap-x-2 text-[9px] font-mono">
                                <span className="text-zinc-500">{label}</span>
                                <span className="text-zinc-300 text-right">{params.iterations}</span>
                                <span className="text-zinc-300 text-right">{mem}M</span>
                                <span className="text-zinc-300 text-right">{params.parallelism}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="space-y-0.5">
                          {([
                            { label: 'min pwd', value: `${cfg.minPasswordLength} chars` },
                            { label: 'settings pwd', value: cfg.settingsPasswordRequired ? 'required' : 'optional' },
                            { label: 'biometric', value: cfg.biometricAllowed ? 'allowed' : 'disabled' },
                            { label: 'vault PIN', value: cfg.vaultPinAllowed ? 'allowed' : 'disabled' },
                            { label: 'backup name', value: cfg.backupFilenameRandom ? 'random' : 'descriptive' },
                            { label: 'recovery file', value: cfg.recoveryFilenameRandom ? 'random' : 'descriptive' },
                          ] as const).map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-[9px]">
                              <span className="text-zinc-500">{label}</span>
                              <span className="text-zinc-300">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/5">
                        {cfg.autoDestructEnabled ? (
                          <span className="text-[9px] text-red-400/70">{t('warning')}: {t('auditLimitationTitle')}</span>
                        ) : (
                          <span className="text-[9px] text-zinc-600">{t('auditLimitationTitle')}</span>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}

              {confirmTier !== null && (() => {
                const tier = TIERS.find(t => t.id === confirmTier);
                if (!tier) return null;
                const cfg = tier.config;
                const Icon = tier.icon;
                const fmtInactivity = (s: number) => {
                  if (s === 0) return t('inactivityOff');
                  if (s < 60) return `${s}s`;
                  if (s < 3600) return `${Math.floor(s / 60)}m`;
                  if (s < 86400) return `${Math.floor(s / 3600)}h`;
                  return `${Math.floor(s / 86400)}d`;
                };
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setConfirmTier(null)}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-full max-w-xs glass-card border border-white/10 rounded-2xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-neon-green/20 text-neon-green">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{t(tier.nameKey as any)}</p>
                          <p className="text-[9px] text-zinc-500">{t('tierInfoTitle')}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelBlur')}</span>
                          <span className="text-white font-medium">{cfg.autoBlurSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLock')}</span>
                          <span className="text-white font-medium">{cfg.autoLockSeconds}s</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelAttempts')}</span>
                          <span className="text-white font-medium">{cfg.failedAttemptsThreshold}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelLockDur')}</span>
                          <span className="text-white font-medium">{cfg.progressiveLockSeconds === 0 ? t('recoveryOnly') : `${cfg.progressiveLockSeconds}s`}</span>
                        </div>
                        <div className="border-t border-white/5 my-1.5" />
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">{t('modelDestruct')}</span>
                          <span className={`font-medium ${cfg.autoDestructEnabled ? 'text-red-400' : 'text-zinc-500'}`}>{cfg.autoDestructEnabled ? t('on') : t('off')}</span>
                        </div>
                        {cfg.autoDestructEnabled && (
                          <>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructAtt')}</span>
                              <span className="text-white font-medium">{cfg.autoDestructAttempts}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructIn')}</span>
                              <span className="text-white font-medium">{fmtInactivity(cfg.autoDestructInactivity)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-400">{t('modelDestructCount')}</span>
                              <span className="text-white font-medium">{cfg.destructCountdownSeconds}s</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="border-t border-white/5 my-1.5" />
                      <div className="space-y-0.5">
                        <div className="grid grid-cols-4 gap-x-2 text-[8px] text-zinc-600 font-mono mb-0.5">
                          <span />
                          <span className="text-right">t</span>
                          <span className="text-right">m</span>
                          <span className="text-right">p</span>
                        </div>
                        {([
                          { label: 'master', params: cfg.argon },
                          { label: 'recovery', params: cfg.argonRecovery },
                          { label: 'PIN', params: cfg.argonPin },
                        ] as const).map(({ label, params }) => {
                          const mem = (params.memoryKib / 1024).toFixed(0);
                          return (
                            <div key={label} className="grid grid-cols-4 gap-x-2 text-[9px] font-mono">
                              <span className="text-zinc-500">{label}</span>
                              <span className="text-zinc-300 text-right">{params.iterations}</span>
                              <span className="text-zinc-300 text-right">{mem}M</span>
                              <span className="text-zinc-300 text-right">{params.parallelism}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-white/5 my-1.5" />
                      <div className="space-y-0.5">
                        {([
                          { label: 'min pwd', value: `${cfg.minPasswordLength} chars` },
                          { label: 'settings pwd', value: cfg.settingsPasswordRequired ? 'required' : 'optional' },
                          { label: 'biometric', value: cfg.biometricAllowed ? 'allowed' : 'disabled' },
                          { label: 'vault PIN', value: cfg.vaultPinAllowed ? 'allowed' : 'disabled' },
                          { label: 'backup name', value: cfg.backupFilenameRandom ? 'random' : 'descriptive' },
                          { label: 'recovery file', value: cfg.recoveryFilenameRandom ? 'random' : 'descriptive' },
                        ] as const).map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-[9px]">
                            <span className="text-zinc-500">{label}</span>
                            <span className="text-zinc-300">{value}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          if (password.length < (cfg as any).minPasswordLength) {
                            setError(t('passwordTooShort'));
                            return;
                          }
                          setConfirmTier(null);
                          if (tier) onApplyThreatModel?.(cfg);
                          await completeSetup(cfg.argon, confirmTier);
                        }}
                        className="mt-3 text-[10px] text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1 w-full"
                      >
                        {t('continueButton')} <ChevronRight size={12} />
                      </button>
                    </motion.div>
                  </motion.div>
                );
              })()}

              {isProcessing ? (
                <div className="mt-4 w-full max-w-sm glass-card border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin text-neon-green shrink-0" />
                    <span className="text-xs text-zinc-300 font-medium">{setupProgressLabel}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{ backgroundColor: accentColor, width: `${Math.max(setupProgress, 2)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 text-right">{setupProgress}%</p>
                </div>
              ) : (
                <div className="mt-4 w-full max-w-sm">
                  <button
                    onClick={() => {
                      if (!selectedTier) return;
                      setConfirmTier(selectedTier);
                    }}
                    disabled={!selectedTier}
                    className="w-full py-3 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:grayscale disabled:opacity-50"
                    style={{ backgroundColor: accentColor, boxShadow: `0 0 20px rgba(${accentRgb}, 0.3)` }}
                  >
                    {t('continueButton')} <ChevronRight size={18} />
                  </button>
                </div>
              )}

              <button
                onClick={() => { setSetupStep('create'); setSelectedTier(null); setBlockedTier(null); }}
                className="mt-3 text-[10px] text-zinc-500 hover:text-white transition-colors"
              >← {t('backButton')}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-black px-4 pt-12 md:pt-24 pb-6 font-sans text-primary min-h-screen min-h-dvh overflow-y-auto">
      <div className="flex flex-col items-center space-y-3 md:space-y-5">
        <Logo />
        <div className="text-2xl md:text-3xl font-bold tracking-tight">
          <span className={`font-bold tracking-tight ${isLocked ? 'text-red-500' : 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'}`}>{t('crytoPrefix')}</span>
          <span className={isLocked ? '' : 'drop-shadow-[0_0_12px_rgba(212,212,216,0.5)]'} style={{ color: isLocked ? '#ef4444' : accentColor }}>{t('toolSuffix')}</span>
        </div>
        <p className={`text-sm tracking-wide ${isLocked ? 'text-muted' : 'text-zinc-400 drop-shadow-[0_0_8px_rgba(161,161,170,0.3)]'}`}>{t('allInOnePrivacyTagline')}</p>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-md glass-card border ${isLocked ? 'border-red-500/50' : 'border-white/10'} rounded-3xl p-5 relative mt-6 md:mt-10 overflow-hidden`}
      >
        {!isLocked && <LiquidGlassOverlay />}
        <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isRecoveryMode ? (
            recoveryStep === 1 ? (
              <motion.div
                key="recovery-code"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-bold mb-2 text-primary">{t('resetWithRecoveryCode')}</h1>
                  <p className="text-muted text-sm leading-relaxed">{t('recoveryCodesDescription')}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted font-medium ml-1">{t('recoveryCodeLabel')}</label>
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                      placeholder={t('recoveryCodePlaceholder')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary transition-all placeholder:text-muted font-mono tracking-wider"
                      maxLength={23}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setRecoveryStep(1);
                        setRecoveryCode('');
                        setNewRecoveryPassword('');
                        setConfirmNewPassword('');
                        setError(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors active:scale-[0.99]"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={() => {
                        const trimmed = recoveryCode.trim();
                        if (!trimmed || trimmed.length < 23) {
                          setError(t('invalidRecoveryCode'));
                          return;
                        }
                        setError(null);
                        setRecoveryStep(2);
                      }}
                      disabled={isProcessing || recoveryCode.trim().length < 23}
                      className="flex-1 py-3 rounded-xl text-black text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition-all"
                      style={{ backgroundColor: accentColor }}
                    >
                      {t('continueButton')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="recovery-password"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h1 className="text-xl font-bold mb-2 text-primary">{t('setupPassword')}</h1>
                  <p className="text-muted text-sm leading-relaxed">{t('min30Chars')}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted font-medium ml-1">{t('newPasswordMin30')}</label>
                    <input
                      type="password"
                      value={newRecoveryPassword}
                      onChange={(e) => setNewRecoveryPassword(e.target.value)}
                      placeholder={t('newPasswordPlaceholder')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted font-medium ml-1">{t('confirmPassword')}</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={t('confirmPasswordPlaceholder')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                    />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setRecoveryStep(1);
                        setError(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors active:scale-[0.99]"
                    >
                      {t('backButton')}
                    </button>
                    <button
                      onClick={async () => {
                        if (newRecoveryPassword.length < 30) {
                          setError(t('passwordTooShort'));
                          return;
                        }
                        if (newRecoveryPassword !== confirmNewPassword) {
                          setError(t('passwordsDoNotMatch'));
                          return;
                        }
                        setIsProcessing(true);
                        const result = await onResetWithRecovery(recoveryCode, newRecoveryPassword);
                        setIsProcessing(false);
                        if (result.success) {
                          window.location.reload();
                        } else {
                          setError(result.error || t('resetErrorLabel'));
                        }
                      }}
                      disabled={isProcessing || !newRecoveryPassword || !confirmNewPassword}
                      className="flex-1 py-3 rounded-xl text-black text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition-all"
                      style={{ backgroundColor: accentColor }}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          {t('processing')}
                        </span>
                      ) : t('resetButton')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div
              key="unlock"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6">
                <h1 className={`text-xl font-bold mb-2 ${isLocked ? 'text-red-500' : 'text-primary'}`}>
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

              <AutoDestructCountdown ref={destructRef} onComplete={onDestructComplete} onStateChange={setIsDestructing} />

              {isLocked && !isDestructing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center p-6 bg-red-500/5 rounded-2xl border border-red-500/10 mb-4"
                >
                  <Timer className="text-red-500 mb-3 animate-pulse" size={36} />
                  <div className="text-3xl font-black font-mono text-red-500">{timeLeft}s</div>
                </motion.div>
              )}

              {(biometricAvailable && biometricEnabled && !isSetup && !isLocked && !isDestructing && onBiometricUnlock) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <button
                    onClick={async () => {
                      setBiometricError(false);
                      setIsProcessing(true);
                      try {
                        await onBiometricUnlock();
                      } catch {
                        setBiometricError(true);
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-br from-neon-green/20 to-neon-green/5 border border-neon-green/30 text-white font-bold py-3 rounded-xl hover:from-neon-green/30 hover:to-neon-green/10 transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50 group"
                  >
                    <Fingerprint size={20} className="text-neon-green group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <span className="text-sm">{t('unlockWithBiometric')}</span>
                      <p className="text-[10px] text-zinc-500 font-normal">{t('biometricPromptHint')}</p>
                    </div>
                  </button>
                  {biometricError && (
                    <p className="text-red-500 text-xs text-center mt-2">{t('biometricFailed')}</p>
                  )}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className={`space-y-4 ${isLocked && !isDestructing ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted font-medium ml-1">{t('masterPassword')}</label>
                  <div className="relative group">
                    <input
                      disabled={isProcessing || (isLocked && !isDestructing)}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('enterPasswordField')}
                      className={`w-full bg-surface border ${isDestructing ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary'} text-primary rounded-xl pl-4 pr-20 py-3 focus:outline-none transition-all placeholder:text-muted disabled:opacity-50`}
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
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                    <label className="text-sm text-muted font-medium ml-1">{t('confirmPassword')}</label>
                    <input
                      disabled={isProcessing || (isLocked && !isDestructing)}
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmYourPassword')}
                      className="w-full bg-surface border border-border text-primary rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all placeholder:text-muted"
                    />
                  </motion.div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-sm font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || (isLocked && !isDestructing)}
                  className={`w-full text-black font-bold text-base py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:grayscale disabled:opacity-50 ${isDestructing ? 'bg-red-500 hover:bg-red-400' : isLocked ? 'bg-zinc-800' : ''}`}
                  style={{ backgroundColor: isDestructing ? undefined : (isLocked ? undefined : accentColor), boxShadow: isDestructing ? '0 0 20px rgba(239,68,68,0.4)' : (isLocked ? undefined : `0 0 15px rgba(${accentRgb}, 0.3)`) }}
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

              {!isSetup && !isLocked && !isDestructing && recoverySettings && recoverySettings.count > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryMode(true);
                      setRecoveryStep(1);
                    }}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    {t('forgotPasswordLink')}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
