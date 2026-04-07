
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, FolderPlus, Database, Search, Trash2, Settings, Home, MoreVertical, 
  Folder, Image as ImageIcon, Music, FileText, ArrowLeft, Video, X,
  Pause, Play, SkipBack, SkipForward, ListMusic, ChevronDown, 
  Shuffle, Heart, Repeat, Share2, Menu, Moon, Lock, Copy, Move
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, DBItem } from '../utils/db';
import { cryptoService } from '../utils/crypto';
import { FileSystemItem, ViewState, AppTheme, ThemeConfig, ThemeCategory } from '../types';
import { useI18n } from '../utils/i18nContext';

// Import Shared Components
import { FileItem } from './FileItem';
import { CustomizeModal } from './CustomizeModal';
import { FileActionMenu } from './FileActionMenu';
import { TopActions } from './TopActions';
import { PinModal } from './PinModal';
import { EncryptionModal } from './EncryptionModal';
import { DecryptModal } from './DecryptModal';
import { CopyMoveModal } from './CopyMoveModal';

// Import Views
import { StorageView } from './views/StorageView';
import { SettingsView, ThemesGalleryView, AboutView, FontsGalleryView } from './views/SettingsView';
import { GalleryView } from './views/GalleryView';
import { MusicView } from './views/MusicView';
import { SearchView } from './views/SearchView';
import { TrashView } from './views/TrashView';
import { VaultView } from './views/VaultView';
import { BackupView } from './views/BackupView';

interface DashboardProps {
  settingsLock: {
    password: string | null;
    setPassword: (pwd: string | null) => void;
  };
  recoverySettings: {
    codes: string[];
    regenerate: () => void;
    verify: (code: string) => boolean;
    consume: (code: string) => boolean;
  };
  vaultSettings: {
    enabled: boolean;
    pin: string | null;
    update: (enabled: boolean, pin: string | null) => void;
  };
  autoBlurSettings: { value: number; setValue: (val: number) => void; };
  autoLockSettings: { value: number; setValue: (val: number) => void; };
  progressiveLockSettings: {
    lockTime: number;
    setLockTime: (val: number) => void;
    attempts: number;
    setAttempts: (val: number) => void;
  };
  autoDestructSettings: {
    enabled: boolean;
    setEnabled: (val: boolean) => void;
    attempts: number;
    setAttempts: (val: number) => void;
    inactivitySeconds: number;
    setInactivitySeconds: (val: number) => void;
  };
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatTime = (seconds: number) => {
  if(!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const NavButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 w-1/4 transition-all duration-300 group relative"
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-t from-neon-green/10 via-neon-green/5 to-transparent rounded-2xl border-t border-neon-green/20" />
      )}
      <div className="relative z-10">
        {active && (
          <div className="absolute -inset-3 bg-gradient-to-t from-neon-green/40 to-transparent blur-xl rounded-full opacity-60" />
        )}
        <div className={`relative transition-all duration-300 ${active ? '' : 'group-hover:-translate-y-1.5 group-hover:scale-110'}`}>
          {React.cloneElement(icon as React.ReactElement, { 
            size: 24, 
            className: active 
              ? 'text-neon-green drop-shadow-[0_0_12px_rgba(57,255,20,0.8)]'
              : 'text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]',
            strokeWidth: 1.5
          })}
        </div>
      </div>
      <span className={`text-[9px] font-bold tracking-widest uppercase z-10 transition-all duration-300 ${active ? 'text-neon-green drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]' : 'text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-emerald-400'}`}>
        {label}
      </span>
    </button>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  settingsLock, 
  recoverySettings,
  vaultSettings,
  autoBlurSettings, 
  autoLockSettings, 
  progressiveLockSettings,
  autoDestructSettings 
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('files');
  const [currentView, setCurrentView] = useState<ViewState | 'backup'>('dashboard');
  const [appTheme, setAppTheme] = useState<AppTheme>(() => (localStorage.getItem('app_theme_mode') as AppTheme) || 'dark');

  const resolveTheme = (mode: AppTheme): 'dark' | 'light' => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  };
  const [accentColor, setAccentColor] = useState(localStorage.getItem('theme_accent') || '#39ff14');
  const [activeThemeCategory, setActiveThemeCategory] = useState<ThemeCategory>('Neon');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<FileSystemItem | null>(null); 
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenItem, setMenuOpenItem] = useState<FileSystemItem | null>(null);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [itemToCustomize, setItemToCustomize] = useState<FileSystemItem | null>(null);
  
  // Encryption Modal State
  const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false);
  const [itemToEncrypt, setItemToEncrypt] = useState<FileSystemItem | null>(null);
  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const [itemToDecrypt, setItemToDecrypt] = useState<FileSystemItem | null>(null);
  
  // Copy/Move Modal State
  const [isCopyMoveModalOpen, setIsCopyMoveModalOpen] = useState(false);
  const [copyMoveMode, setCopyMoveMode] = useState<'copy' | 'move' | null>(null);
  const [copyMoveItem, setCopyMoveItem] = useState<FileSystemItem | null>(null);
  const decryptResolveRef = useRef<((url: string | null) => void) | null>(null);

  // Settings Lock UI State
  const [showSettingsUnlock, setShowSettingsUnlock] = useState(false);
  const [settingsUnlockInput, setSettingsUnlockInput] = useState('');
  const [settingsUnlockError, setSettingsUnlockError] = useState(false);

  // Vault/Pin UI State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'setup' | 'unlock' | 'disable'>('setup');
  const [pendingVaultAction, setPendingVaultAction] = useState<'enable' | 'access' | 'disable' | null>(null);

  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({});

  const [currentPlayingItem, setCurrentPlayingItem] = useState<FileSystemItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [allItems, setAllItems] = useState<FileSystemItem[]>([]);
  const [deviceStorage, setDeviceStorage] = useState<{ quota: number; usage: number } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadFiles();
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(est => {
            if (est.quota && est.usage) setDeviceStorage({ quota: est.quota, usage: est.usage });
        });
    }
    return () => {
        Object.values(decryptedUrls).forEach(url => URL.revokeObjectURL(url as string));
    };
  }, []);

  // --- NAVIGATION HANDLER WITH LOCK ---
  const handleViewNavigation = (view: ViewState) => {
    if (view === 'settings' && settingsLock.password) {
      setSettingsUnlockInput('');
      setSettingsUnlockError(false);
      setShowSettingsUnlock(true);
      return;
    }
    setCurrentView(view);
  };

  // --- VAULT LOGIC ---
  const handleOpenVaultSettings = () => {
    if (vaultSettings.enabled) {
      // Logic handled via Toggle in Settings
    } else {
      setPendingVaultAction('enable');
      setPinModalMode('setup');
      setShowPinModal(true);
    }
  };

  const handleDisableVault = () => {
     setPendingVaultAction('disable');
     setPinModalMode('unlock'); // Must confirm current PIN to disable
     setShowPinModal(true);
  };

  const handlePinSuccess = (pin: string) => {
    setShowPinModal(false);
    
    if (pendingVaultAction === 'enable') {
        vaultSettings.update(true, pin);
        setCurrentView('vault');
    } else if (pendingVaultAction === 'access') {
        setCurrentView('vault');
    } else if (pendingVaultAction === 'disable') {
        vaultSettings.update(false, null);
    }
    setPendingVaultAction(null);
    
    window.dispatchEvent(new CustomEvent('pin-setup-done', { detail: pin }));
  };

  const handleSettingsUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsUnlockInput === settingsLock.password) {
      setShowSettingsUnlock(false);
      setCurrentView('settings');
    } else {
      setSettingsUnlockError(true);
      setSettingsUnlockInput('');
    }
  };

  const decryptOnDemand = async (item: FileSystemItem): Promise<string | null> => {
    if (decryptedUrls[item.id]) return decryptedUrls[item.id];
    if (!item.rawBlob || !item.isEncrypted || !item.iv) return item.url || null;

    try {
      if (item.salt) {
          return new Promise((resolve) => {
              decryptResolveRef.current = resolve;
              setItemToDecrypt(item);
              setIsDecryptModalOpen(true);
          });
      } 
      else {
          const encryptedData = new Uint8Array(await item.rawBlob.arrayBuffer());
          const iv = cryptoService.base64ToArrayBuffer(item.iv);
          const decryptedData = await cryptoService.decrypt(encryptedData, iv);
          
          const ext = item.name.split('.').pop()?.toLowerCase() || '';
          const mimeType = ext === 'gif' ? 'image/gif' :
                           ext === 'png' ? 'image/png' :
                           ext === 'webp' ? 'image/webp' :
                           item.category === 'image' ? 'image/jpeg' :
                           ext === 'mp3' ? 'audio/mpeg' :
                           item.category === 'audio' ? 'audio/mpeg' :
                           ext === 'webm' ? 'video/webm' :
                           item.category === 'video' ? 'video/mp4' : 'application/octet-stream';

          const blob = new Blob([decryptedData], { type: mimeType });
          const url = URL.createObjectURL(blob);
          
          setDecryptedUrls(prev => ({ ...prev, [item.id]: url }));
          return url;
      }
    } catch (e) {
      console.error("Eroare la decriptarea Lazy:", e);
      alert("Decriptare esuata. Cheia sau datele sunt incorecte.");
      return null;
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', accentColor);
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    localStorage.setItem('theme_accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    const mode = resolveTheme(appTheme);
    if (mode === 'light') {
      root.style.setProperty('--bg-main', '#ffffff');
      root.style.setProperty('--bg-card', '#f4f4f5');
      root.style.setProperty('--bg-surface', '#e4e4e7');
      root.style.setProperty('--border-color', '#d4d4d8');
      root.style.setProperty('--text-main', '#09090b');
      root.style.setProperty('--text-muted', '#52525b');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('app_theme_mode', appTheme);
    } else {
      root.style.setProperty('--bg-main', '#000000');
      root.style.setProperty('--bg-card', '#09090b');
      root.style.setProperty('--bg-surface', '#18181b');
      root.style.setProperty('--border-color', '#27272a');
      root.style.setProperty('--text-main', '#ffffff');
      root.style.setProperty('--text-muted', '#a1a1aa');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('app_theme_mode', appTheme);
    }
  }, [appTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (appTheme === 'system') {
        const root = document.documentElement;
        const mode = resolveTheme('system');
        if (mode === 'light') {
          root.style.setProperty('--bg-main', '#ffffff');
          root.style.setProperty('--bg-card', '#f4f4f5');
          root.style.setProperty('--bg-surface', '#e4e4e7');
          root.style.setProperty('--border-color', '#d4d4d8');
          root.style.setProperty('--text-main', '#09090b');
          root.style.setProperty('--text-muted', '#52525b');
        } else {
          root.style.setProperty('--bg-main', '#000000');
          root.style.setProperty('--bg-card', '#09090b');
          root.style.setProperty('--bg-surface', '#18181b');
          root.style.setProperty('--border-color', '#27272a');
          root.style.setProperty('--text-main', '#ffffff');
          root.style.setProperty('--text-muted', '#a1a1aa');
        }
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [appTheme]);

  useEffect(() => {
    const syncAudio = async () => {
      if (audioRef.current && currentPlayingItem) {
          const streamUrl = await decryptOnDemand(currentPlayingItem);
          if (streamUrl && audioRef.current.src !== streamUrl) {
              audioRef.current.src = streamUrl;
              if (isPlaying) audioRef.current.play().catch(console.error);
          } else if (audioRef.current.src) {
              if (isPlaying) audioRef.current.play().catch(console.error);
              else audioRef.current.pause();
          }
      }
    };
    syncAudio();
  }, [currentPlayingItem, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  useEffect(() => {
    setAllItems(prev => prev.map(item => 
      item.id === 'sys-1' ? { ...item, status: vaultSettings.enabled ? 'Active' : 'Disabled' } : item
    ));
  }, [vaultSettings.enabled]);

  const loadFiles = async () => {
    try {
      const dbItems = await db.getAllItems();
      const systemItems: FileSystemItem[] = [
        { id: 'sys-1', parentId: null, type: 'system', name: 'Vault', status: vaultSettings.enabled ? 'Active' : 'Disabled', date: 'System', category: 'other' },
        { id: 'sys-2', parentId: null, type: 'system', name: 'Backup', status: 'Secure', date: 'System', category: 'other' },
      ];

      const loadedItems: FileSystemItem[] = dbItems.map(i => {
         return { ...i, url: i.externalUrl, rawBlob: i.fileData };
      });
      
      setAllItems([...systemItems, ...loadedItems]);
    } catch (e) {
      console.error("Failed to load items from DB", e);
    }
  };

  const applyFullTheme = (theme: ThemeConfig) => {
    const root = document.documentElement;
    root.style.setProperty('--bg-main', theme.bgMain);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--bg-surface', theme.bgSurface);
    root.style.setProperty('--border-color', theme.border);
    root.style.setProperty('--text-main', theme.textMain);
    root.style.setProperty('--text-muted', theme.textMuted);
    setAccentColor(theme.accent);
    localStorage.setItem('app_theme_config', JSON.stringify({
        '--bg-main': theme.bgMain, '--bg-card': theme.bgCard, '--bg-surface': theme.bgSurface,
        '--border-color': theme.border, '--text-main': theme.textMain, '--text-muted': theme.textMuted,
        '--accent-color': theme.accent
    }));
  };

  const items = useMemo(() => allItems.filter(i => !i.isTrashed), [allItems]);
  const trashItems = useMemo(() => allItems.filter(i => i.isTrashed), [allItems]);
  
  const currentFolder = useMemo(() => items.find(i => i.id === currentFolderId), [items, currentFolderId]);
  const visibleItems = useMemo(() => items.filter(item => {
      if (item.type === 'system') return currentFolderId === null;
      return item.parentId === currentFolderId;
  }), [items, currentFolderId]);

  const storageStats = useMemo(() => {
    let limit = 64 * 1024 * 1024 * 1024; let used = 0;
    const breakdown = { image: 0, video: 0, audio: 0, doc: 0, other: 0 };
    items.forEach(item => { 
        if(item.type !== 'system') used += 1024 * 1024;
        if(item.category) breakdown[item.category as keyof typeof breakdown]++;
    }); 
    if (deviceStorage) { used = deviceStorage.usage; limit = deviceStorage.quota; }
    return { used, limit, breakdown };
  }, [items, deviceStorage]);

  const handleItemAction = (action: string, item: FileSystemItem) => {
    if (item.type === 'system') return;
    if (action === 'customize') { setItemToCustomize(item); setIsCustomizeModalOpen(true); }
    else if (action === 'rename') { setRenamingId(item.id); setRenameValue(item.name); }
    else if (action === 'delete') { moveToTrash(item.id); }
    else if (action === 'favorite') { toggleFavorite(item); }
    else if (action === 'encrypt') { setItemToEncrypt(item); setIsEncryptionModalOpen(true); }
    else if (action === 'decrypt') {
      if (item.salt && item.isEncrypted) {
        setItemToDecrypt(item);
        setIsDecryptModalOpen(true);
      }
    }
    else if (action === 'copy') { setCopyMoveMode('copy'); setCopyMoveItem(item); setIsCopyMoveModalOpen(true); }
    else if (action === 'move') { setCopyMoveMode('move'); setCopyMoveItem(item); setIsCopyMoveModalOpen(true); }
    else if (action === 'duplicate') { handleDuplicate(item); }
    else if (action === 'select') { 
      setIsSelectionMode(true);
      setSelectedItems(new Set([item.id]));
    }
  };

  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedItems) {
      await moveToTrash(id);
    }
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const handleMoveSelected = () => {
    const firstItem = allItems.find(i => selectedItems.has(i.id));
    if (firstItem) {
      setCopyMoveMode('move');
      setCopyMoveItem(firstItem);
      setIsCopyMoveModalOpen(true);
    }
  };

  const handleCopySelected = () => {
    const firstItem = allItems.find(i => selectedItems.has(i.id));
    if (firstItem) {
      setCopyMoveMode('copy');
      setCopyMoveItem(firstItem);
      setIsCopyMoveModalOpen(true);
    }
  };

  const toggleFavorite = async (item: FileSystemItem) => {
      const dbItem: DBItem = { ...item, fileData: item.rawBlob, isFavorite: !item.isFavorite };
      delete (dbItem as any).url; delete (dbItem as any).rawBlob;
      await db.updateItem(dbItem);
      loadFiles();
  };

  const handleNavigate = (item: FileSystemItem) => {
    if (item.name === 'Vault' && item.type === 'system') {
        if (vaultSettings.enabled) {
            setPendingVaultAction('access');
            setPinModalMode('unlock');
            setShowPinModal(true);
        } else {
            setPendingVaultAction('enable');
            setPinModalMode('setup');
            setShowPinModal(true);
        }
        return;
    }

    if (item.name === 'Backup' && item.type === 'system') {
        setCurrentView('backup');
        return;
    }

    if (item.type === 'folder' || item.type === 'system') setCurrentFolderId(item.id);
    else {
        // If it's a file, try to decrypt it on demand if needed
        if (item.isEncrypted && item.salt && !decryptedUrls[item.id]) {
            decryptOnDemand(item).then((url) => {
                if (url) {
                    if(item.category === 'audio') {
                        setCurrentPlayingItem(item);
                        setIsPlaying(true);
                    } else {
                        // For images/videos, logic is handled in Gallery/Dashboard rendering via decryptedUrls
                        // But for a generic file open, we might want a preview modal?
                        // For now, let's assume dashboard handles media via tabs, or we set activeItem
                        setActiveItem(item);
                    }
                }
            });
        } else {
            if(item.category === 'audio') {
                setCurrentPlayingItem(item);
                setIsPlaying(true);
            } else {
                setActiveItem(item);
            }
        }
    }
  };

  const startFolderCreation = () => {
    setIsCreatingFolder(true);
    setNewFolderName('');
    setTimeout(() => { folderInputRef.current?.focus(); }, 50);
  };

  const cancelFolderCreation = () => { setIsCreatingFolder(false); setNewFolderName(''); };

  const confirmFolderCreation = async () => {
      if (!newFolderName.trim()) { cancelFolderCreation(); return; }
      const newItem: DBItem = {
          id: Date.now().toString(),
          parentId: currentFolderId,
          type: 'folder',
          name: newFolderName,
          date: new Date().toLocaleDateString(),
          isTrashed: false,
          isFavorite: false,
          category: 'other'
      };
      await db.addItem(newItem);
      loadFiles();
      setIsCreatingFolder(false);
      setNewFolderName('');
  };

  const handleRenameConfirm = async () => {
      if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
      const item = allItems.find(i => i.id === renamingId);
      if (item && item.type !== 'system') {
          const dbItem: DBItem = { ...item, fileData: item.rawBlob, name: renameValue };
          delete (dbItem as any).url; delete (dbItem as any).rawBlob;
          await db.updateItem(dbItem);
          loadFiles();
      }
      setRenamingId(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newItem: DBItem = {
        id: Date.now().toString(),
        parentId: currentFolderId,
        type: 'file',
        name: file.name,
        size: formatBytes(file.size),
        date: new Date().toLocaleDateString(),
        category: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'doc',
        fileData: file,
        isTrashed: false,
        isFavorite: false
      };
      await db.addItem(newItem);
      loadFiles();
    }
  };

  const moveToTrash = async (id: string) => {
     const itm = allItems.find(i => i.id === id);
     if(itm && itm.type !== 'system') {
         const dbItem: DBItem = { ...itm, fileData: itm.rawBlob, isTrashed: true };
         delete (dbItem as any).url; delete (dbItem as any).rawBlob;
         await db.updateItem(dbItem);
         loadFiles();
     }
  };

  const handleDuplicate = async (item: FileSystemItem) => {
    const ext = item.name.includes('.') ? '.' + item.name.split('.').pop() : '';
    const baseName = ext ? item.name.slice(0, -ext.length) : item.name;
    let counter = 1;
    let newName = `${baseName} (copy)${ext}`;
    
    while (allItems.some(i => i.name === newName && i.parentId === item.parentId)) {
      counter++;
      newName = `${baseName} (copy ${counter})${ext}`;
    }

    const newItem: DBItem = {
      id: Date.now().toString(),
      parentId: item.parentId,
      type: item.type,
      name: newName,
      size: item.size,
      date: new Date().toLocaleDateString(),
      category: item.category,
      isEncrypted: item.isEncrypted,
      iv: item.iv,
      salt: item.salt,
      algorithm: item.algorithm,
      isFavorite: item.isFavorite,
      isTrashed: false,
      customIcon: item.customIcon,
      iconOnlyMode: item.iconOnlyMode,
    };

    if (item.rawBlob) {
      newItem.fileData = item.rawBlob;
    }

    await db.addItem(newItem);
    loadFiles();
  };

  const restoreFromTrash = async (id: string) => {
    const itm = allItems.find(i => i.id === id);
    if (itm) {
        const dbItem: DBItem = { ...itm, fileData: itm.rawBlob, isTrashed: false };
        delete (dbItem as any).url; delete (dbItem as any).rawBlob;
        await db.updateItem(dbItem);
        loadFiles();
    }
  };

  const deletePermanently = async (id: string) => {
      await db.deleteItem(id);
      loadFiles();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-background text-primary">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <AnimatePresence>
        {showPinModal && (
            <PinModal 
                mode={pinModalMode} 
                savedPin={vaultSettings.pin} 
                onSuccess={handlePinSuccess}
                onClose={() => { setShowPinModal(false); setPendingVaultAction(null); }}
            />
        )}
      </AnimatePresence>
      
      {itemToEncrypt && (
          <EncryptionModal 
            isOpen={isEncryptionModalOpen}
            onClose={() => { setIsEncryptionModalOpen(false); setItemToEncrypt(null); }}
            onRefresh={loadFiles}
            item={itemToEncrypt}
            vaultPin={vaultSettings.pin}
            onRequestPinSetup={async () => {
                return new Promise((resolve) => {
                    setPendingVaultAction('enable');
                    setPinModalMode('setup');
                    setShowPinModal(true);
                    const handler = (e: CustomEvent) => {
                        resolve(e.detail || null);
                        window.removeEventListener('pin-setup-done', handler as EventListener);
                    };
                    window.addEventListener('pin-setup-done', handler as EventListener);
                });
            }}
          />
      )}

      {itemToDecrypt && (
          <DecryptModal
            isOpen={isDecryptModalOpen}
            onClose={() => {
              if (decryptResolveRef.current) {
                decryptResolveRef.current(null);
                decryptResolveRef.current = null;
              }
              setIsDecryptModalOpen(false);
              setItemToDecrypt(null);
            }}
            onSuccess={(blob, mimeType) => {
              const url = URL.createObjectURL(blob);
              setDecryptedUrls(prev => ({ ...prev, [itemToDecrypt.id]: url }));
              if (decryptResolveRef.current) {
                decryptResolveRef.current(url);
                decryptResolveRef.current = null;
              }
              
              const decryptedItem = { ...itemToDecrypt, url };
              setActiveItem(decryptedItem);
              
              setIsDecryptModalOpen(false);
              setItemToDecrypt(null);
            }}
            item={itemToDecrypt}
            vaultPin={vaultSettings.pin}
          />
      )}

      <CopyMoveModal
        isOpen={isCopyMoveModalOpen}
        onClose={() => { setIsCopyMoveModalOpen(false); setCopyMoveItem(null); setCopyMoveMode(null); }}
        mode={copyMoveMode || 'copy'}
        item={copyMoveItem}
        allItems={allItems}
        onComplete={loadFiles}
      />

      {/* Settings Lock Modal removed for brevity in this snippet as it was unchanged, assuming it persists */}
      <AnimatePresence>
        {showSettingsUnlock && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            {/* ... Modal content ... */}
            <motion.div className="w-full max-w-sm bg-zinc-950 border border-border rounded-3xl p-8 shadow-2xl">
                 <form onSubmit={handleSettingsUnlock} className="space-y-4">
                    <input type="password" autoFocus value={settingsUnlockInput} onChange={(e) => setSettingsUnlockInput(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white outline-none" placeholder={t('passwordPlaceholder')} />
                    <button type="submit" className="w-full py-3 bg-neon-green text-black font-bold rounded-xl">{t('unlock')}</button>
                    <button type="button" onClick={() => setShowSettingsUnlock(false)} className="w-full py-3 border border-zinc-700 text-zinc-400 font-bold rounded-xl">{t('cancel')}</button>
                 </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <FileActionMenu 
        isOpen={!!menuOpenItem}
        item={menuOpenItem}
        onClose={() => setMenuOpenItem(null)}
        onAction={handleItemAction}
      />

      {itemToCustomize && (
          <CustomizeModal 
            isOpen={isCustomizeModalOpen}
            item={itemToCustomize}
            onClose={() => { setIsCustomizeModalOpen(false); setItemToCustomize(null); }}
            onSave={async (updated) => {
                const dbItem: DBItem = { ...updated, fileData: updated.rawBlob };
                delete (dbItem as any).url; delete (dbItem as any).rawBlob;
                await db.updateItem(dbItem);
                loadFiles();
            }}
          />
      )}

      <AnimatePresence>
        {isFullPlayerOpen && currentPlayingItem && (
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
            >
                {/* Full Player UI - Same as before */}
                <button onClick={() => setIsFullPlayerOpen(false)} className="absolute top-6 left-6 p-2 rounded-full bg-zinc-800"><ChevronDown /></button>
                <div className="flex-1 flex items-center justify-center"><img src={currentPlayingItem.customIcon || currentPlayingItem.coverUrl} className="w-64 h-64 rounded-xl object-cover" /></div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
             <motion.div key="dashboard-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full pb-32 relative">
               
               <TopActions 
                  activeTab={activeTab}
                  isCreatingFolder={isCreatingFolder}
                  newFolderName={newFolderName}
                  folderInputRef={folderInputRef}
                  onAddFile={() => fileInputRef.current?.click()}
                  onStartFolderCreation={startFolderCreation}
                  onNewFolderNameChange={setNewFolderName}
                  onConfirmFolderCreation={confirmFolderCreation}
                  onCancelFolderCreation={cancelFolderCreation}
                  onNavigateView={handleViewNavigation} 
               />

                <main className="flex-1 px-5 overflow-y-auto pb-8">
                   {isSelectionMode && (
                     <motion.div 
                       initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                       className="mb-4 p-4 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-between"
                     >
                       <div className="flex items-center gap-3">
                         <span className="text-neon-green font-bold">{selectedItems.size}</span>
                         <span className="text-zinc-400 text-sm">selectate</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <button onClick={handleCopySelected} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                           <Copy size={18} className="text-white" />
                         </button>
                         <button onClick={handleMoveSelected} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                           <Move size={18} className="text-white" />
                         </button>
                         <button onClick={handleDeleteSelected} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30">
                           <Trash2 size={18} className="text-red-500" />
                         </button>
                         <button onClick={() => { setIsSelectionMode(false); setSelectedItems(new Set()); }} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold">
                           Anulează
                         </button>
                       </div>
                     </motion.div>
                   )}
                   {activeTab === 'files' && (
                      <div className="flex flex-col pb-4">
                        <div className="flex items-center gap-2.5 mb-5">
                          {currentFolderId === null ? (
                            <><Home size={22} className="text-primary" /><span className="font-bold text-lg text-primary">{t('files')}</span></>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => { if(currentFolderId) { const p = items.find(i => i.id === currentFolderId)?.parentId || null; setCurrentFolderId(p); }}} className="flex items-center gap-1 hover:opacity-70 transition-opacity text-primary"><ArrowLeft size={20} /><span className="font-bold text-lg">{t('files')}</span></button>
                              <span className="text-muted">/</span>
                              <span className="font-bold text-lg text-primary">{items.find(i => i.id === currentFolderId)?.name}</span>
                            </div>
                          )}
                        </div>
                        {visibleItems.map((item) => (
                            <FileItem 
                                key={item.id} item={item} onAction={(act) => handleItemAction(act, item)} 
                                onOpenMenu={() => { if(item.type !== 'system') setMenuOpenItem(item); }} 
                                onClick={() => isSelectionMode ? handleItemSelect(item.id) : handleNavigate(item)} 
                                theme={appTheme}
                                isRenaming={renamingId === item.id} renameValue={renameValue}
                                onRenameChange={setRenameValue} onRenameConfirm={handleRenameConfirm}
                                onRenameCancel={() => setRenamingId(null)}
                                isSelected={selectedItems.has(item.id)}
                            />
                        ))}
                      </div>
                  )}

                  {activeTab === 'gallery' && (
                      <GalleryView items={items} onNavigate={handleNavigate} theme={appTheme} onDecrypt={decryptOnDemand} decryptedUrls={decryptedUrls} />
                  )}

                  {activeTab === 'music' && (
                      <MusicView items={items} onPlay={(item) => { setCurrentPlayingItem(item); setIsPlaying(true); }} currentSong={currentPlayingItem} isPlaying={isPlaying} theme={appTheme} />
                  )}

                  {activeTab === 'docs' && (
                      <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 px-1">{t('encryptedDocuments')}</p>
                          {items.filter(i => i.category === 'doc').map(item => (
                              <FileItem key={item.id} item={item} onAction={(act) => handleItemAction(act, item)} onOpenMenu={() => { if(item.type !== 'system') setMenuOpenItem(item); }} onClick={() => handleNavigate(item)} theme={appTheme} />
                          ))}
                      </div>
                  )}
               </main>

                <AnimatePresence>
                  {currentPlayingItem && !isFullPlayerOpen && (
                     <motion.div 
                         initial={{ y: 50, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.9 }}
                         transition={{ type: "spring", damping: 20, stiffness: 300 }}
                         onClick={() => setIsFullPlayerOpen(true)}
                          className="fixed bottom-[95px] left-4 right-4 z-50 cursor-pointer"
                      >
                          {/* Mini Player UI */}
                           <div className="glass-card rounded-full p-3 pr-4 flex items-center gap-3 relative overflow-hidden group">
                            <div className="w-14 h-14 rounded-full bg-black border border-border flex items-center justify-center shrink-0 overflow-hidden relative z-10">
                               {currentPlayingItem.customIcon || currentPlayingItem.coverUrl ? (
                                   <img src={currentPlayingItem.customIcon || currentPlayingItem.coverUrl} className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                               ) : (
                                   <Music size={18} className="text-muted" />
                               )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
                               <h4 className="text-sm font-bold text-primary truncate">{currentPlayingItem.name}</h4>
                               <p className="text-xs text-muted truncate">{currentPlayingItem.artist || 'Unknown'}</p>
                            </div>
                            <div className="flex items-center gap-2 z-10">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                                 className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-background hover:scale-105 transition-transform"
                               >
                                 {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                               </button>
                            </div>
                         </div>
                     </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {activeItem && activeItem.url && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col"
                      onClick={() => setActiveItem(null)}
                    >
                      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-between px-6 pt-4">
                        <p className="text-sm font-bold text-white truncate max-w-[70%]">{activeItem.name}</p>
                        <button className="p-2 rounded-full text-white hover:text-neon-green transition-colors">
                          <X size={24} />
                        </button>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-4">
                        {activeItem.category === 'video' ? (
                          <video
                            src={activeItem.url}
                            controls
                            autoPlay
                            className="max-w-full max-h-full rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <img
                            src={activeItem.url}
                            alt={activeItem.name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <nav className="fixed bottom-0 left-0 right-0 border-t border-border px-2 py-3 pb-safe z-40 bg-background">
                   <div className="flex justify-between items-end max-w-lg mx-auto w-full">
                     <NavButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={<Folder />} label={t('files')} />
                     <NavButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<ImageIcon />} label={t('gallery')} />
                     <NavButton active={activeTab === 'music'} onClick={() => setActiveTab('music')} icon={<Music />} label={t('music')} />
                     <NavButton active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} icon={<FileText />} label={t('documentsTab')} />
                   </div>
                </nav>
             </motion.div>
          )}

          {currentView === 'storage' && <StorageView onBack={() => setCurrentView('dashboard')} storageStats={storageStats} appTheme={appTheme} />}
          {currentView === 'settings' && (
            <SettingsView 
              key="settings-view"
              onBack={() => setCurrentView('dashboard')} 
              appTheme={appTheme} 
              setAppTheme={setAppTheme} 
              accentColor={accentColor} 
              setAccentColor={setAccentColor} 
              autoBlurSettings={autoBlurSettings} 
              autoLockSettings={autoLockSettings} 
              progressiveLockSettings={progressiveLockSettings}
              autoDestructSettings={autoDestructSettings}
              settingsLock={settingsLock} 
              recoverySettings={recoverySettings}
              vaultSettings={{
                ...vaultSettings,
                openVault: handleOpenVaultSettings,
                disableVault: handleDisableVault
              }}
              applyFullTheme={applyFullTheme} 
              openThemes={() => setCurrentView('themes')} 
              openFonts={() => setCurrentView('fonts')} 
              onOpenAbout={() => setCurrentView('about')} 
            />
          )}
          {currentView === 'themes' && <ThemesGalleryView key="themes-view" onBack={() => setCurrentView('settings')} activeCategory={activeThemeCategory} setActiveCategory={setActiveThemeCategory} accentColor={accentColor} applyFullTheme={applyFullTheme} />}
          {currentView === 'fonts' && <FontsGalleryView key="fonts-view" onBack={() => setCurrentView('settings')} />}
          {currentView === 'search' && <SearchView items={items} onNavigate={(item) => { handleNavigate(item); setCurrentView('dashboard'); }} onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
          {currentView === 'trash' && <TrashView trashItems={trashItems} onRestore={restoreFromTrash} onDeleteForever={deletePermanently} onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
          {currentView === 'about' && <AboutView onBack={() => setCurrentView('settings')} accentColor={accentColor} />}
          {currentView === 'vault' && <VaultView onBack={() => setCurrentView('settings')} />}
          {currentView === 'backup' && <BackupView onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
        </AnimatePresence>
      </div>
    </div>
  );
};
