
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import * as HeroIcons from '@heroicons/react/24/solid';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as BsIcons from 'react-icons/bs';
import * as BiIcons from 'react-icons/bi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as TbIcons from 'react-icons/tb';

import { FileSystemItem } from '../types';
import { Tag } from '../utils/db';
import { FileItem } from './FileItem';
import { CustomColorPicker } from './CustomColorPicker';
import { useI18n } from '../utils/i18nContext';

// --- CONFIG & UTILS ---

type PackKey = 'lucide' | 'hero' | 'emoji' | 'fa' | 'md' | 'bs' | 'bi' | 'io' | 'ri' | 'tb';

interface PackDef {
    key: PackKey;
    name: string;
    desc: string;
    icon: React.ReactNode;
    map?: any;
    prefix: string;
}

// SAFE CONFIG: Using Lucide icons for the UI representation ensures we don't crash
// if 'react-icons/*' or '@heroicons/*' exports vary or fail to load specific named exports.
const PACK_DEFS: PackDef[] = [
    { key: 'lucide', name: 'Lucide', desc: 'Vector, Clean', icon: <LucideIcons.Zap size={28} />, map: LucideIcons, prefix: 'lucide' },
    { key: 'hero', name: 'Hero', desc: 'Solid, Bold', icon: <LucideIcons.Star size={28} />, map: HeroIcons, prefix: 'hero' },
    { key: 'fa', name: 'FontAwesome', desc: 'Classic, Robust', icon: <LucideIcons.Flag size={28} />, map: FaIcons, prefix: 'fa' },
    { key: 'md', name: 'Material', desc: 'Google, Geometric', icon: <LucideIcons.LayoutDashboard size={28} />, map: MdIcons, prefix: 'md' },
    { key: 'bs', name: 'Bootstrap', desc: 'Web, Simple', icon: <LucideIcons.AppWindow size={28} />, map: BsIcons, prefix: 'bs' },
    { key: 'bi', name: 'BoxIcons', desc: 'Boxy, Sharp', icon: <LucideIcons.Box size={28} />, map: BiIcons, prefix: 'bi' },
    { key: 'io', name: 'Ionicons', desc: 'Mobile, OS', icon: <LucideIcons.Smartphone size={28} />, map: IoIcons, prefix: 'io' },
    { key: 'ri', name: 'Remix', desc: 'Neutral, Soft', icon: <LucideIcons.Repeat size={28} />, map: RiIcons, prefix: 'ri' },
    { key: 'tb', name: 'Tabler', desc: 'Tech, Precise', icon: <LucideIcons.Grid3X3 size={28} />, map: TbIcons, prefix: 'tb' },
    { key: 'emoji', name: 'Emojis', desc: 'Color, Fun', icon: <span className="text-3xl">🎨</span>, prefix: 'emoji' },
];

const EMOJI_CATEGORIES: Record<string, string[]> = {
    'Folder': ['📁', '📂', '🗂️', '🗃️', '💼', '👜', '🎒', '📦', '🎁', '📫', '📪', '📭', '📬'],
    'Status': ['✅', '❌', '⚠️', '🔥', '⭐', '❤️', '🟢', '🔴', '🔒', '🔓', '🛡️', '🔑', '🧿', '🚫', '💯', '💢'],
    'Tech': ['💻', '🖥️', '🖨️', '🖱️', '📱', '🔋', '🔌', '📡', '💾', '💿', '📀', '📷', '📹', '🕹️', '🎙️', '🎚️', '🎛️', '⏱️', '💡'],
    'Media': ['📸', '🎥', '🎬', '🎧', '🎤', '🎹', '🎼', '🎨', '🎭', '🎫', '🎷', '🎸', '🎺', '🎻', '🥁', '🎲', '🎯', '🎳'],
    'Nature': ['🌲', '🌵', '🌴', '🍁', '🍄', '🌸', '🌍', '🌙', '☀️', '☁️', '⚡', '❄️', '🔥', '💧', '🌊', '🌈', '🌪️', '🌋', '🗻'],
    'Work': ['📊', '📉', '📅', '📌', '📎', '📝', '✒️', '📏', '🔨', '🔧', '🪛', '🧱', '⚙️', '⛓️', '🧲', '⚖️', '💸', '💵', '💳'],
    'Fun': ['🚀', '🛸', '🎮', '🎲', '👾', '🤖', '🎃', '👻', '🍕', '🍺', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍷', '🥂']
};

const getKeysForPack = (packKey: PackKey) => {
    if (packKey === 'emoji') return [];
    const def = PACK_DEFS.find(p => p.key === packKey);
    if (!def || !def.map) return [];
    
    // Filter valid React Components from the module exports
    return Object.keys(def.map).filter(k => {
        // Basic heuristic for react-icons and lucide
        // 1. Must start with Uppercase
        // 2. Must not be 'Icon', 'IconContext', etc.
        // 3. For react-icons, usually starts with the prefix (e.g. FaUser)
        return /^[A-Z]/.test(k) && !k.endsWith('Context') && !k.endsWith('Provider') && k !== 'createLucideIcon' && k !== 'Icon';
    });
};

const getIconCategories = (pack: PackKey) => {
    if (pack === 'emoji') return EMOJI_CATEGORIES;
    
    const keys = getKeysForPack(pack);
    
    // Define Categories
    const categories: Record<string, string[]> = {
        'Esential': [], 
        'Media': [], 
        'Tech': [], 
        'Birou': [], 
        'Securitate': [],
        'Vreme': [],
        'Săgeți': [],
        'Toate': keys 
    };

    keys.forEach(key => {
        const lower = key.toLowerCase();
        
        // --- Shared Categorization Logic ---
        if (['user', 'home', 'settings', 'menu', 'search', 'check', 'x', 'plus', 'minus', 'edit', 'trash', 'save', 'filter', 'grid', 'more', 'loader', 'flag', 'star', 'heart'].some(k => lower.includes(k))) categories['Esential'].push(key);
        if (['video', 'music', 'audio', 'image', 'camera', 'film', 'mic', 'volume', 'play', 'pause', 'stop', 'cast'].some(k => lower.includes(k))) categories['Media'].push(key);
        if (['cpu', 'wifi', 'battery', 'code', 'database', 'server', 'laptop', 'phone', 'monitor', 'keyboard', 'mouse', 'bug', 'git', 'usb', 'bluetooth'].some(k => lower.includes(k))) categories['Tech'].push(key);
        if (['file', 'folder', 'book', 'clip', 'paper', 'archive', 'calendar', 'chart', 'mail', 'inbox', 'printer', 'briefcase', 'pen'].some(k => lower.includes(k))) categories['Birou'].push(key);
        if (['lock', 'key', 'shield', 'eye', 'scan', 'alert', 'warning', 'info'].some(k => lower.includes(k))) categories['Securitate'].push(key);
        if (['sun', 'moon', 'cloud', 'rain', 'snow', 'wind', 'storm', 'zap', 'thermometer'].some(k => lower.includes(k))) categories['Vreme'].push(key);
        if (['arrow', 'chevron', 'caret', 'corner', 'move', 'refresh', 'sync', 'loop', 'undo', 'redo'].some(k => lower.includes(k))) categories['Săgeți'].push(key);
    });

    if (categories['Esential'].length < 20) categories['Esential'] = keys.slice(0, 50);

    return categories;
};

export const CustomizeModal: React.FC<{
    item: FileSystemItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedItem: FileSystemItem) => void;
}> = ({ item, isOpen, onClose, onSave }) => {
    const { t } = useI18n();
    // --- STATE ---
    const [view, setView] = useState<'main' | 'packs' | 'library'>('main');
    const [selectedPack, setSelectedPack] = useState<PackKey>('lucide');

    const [name, setName] = useState(item.name);
    const [selectedIcon, setSelectedIcon] = useState<string | undefined>(item.customIcon);
    const [tags, setTags] = useState<Tag[]>(item.tags || []);
    const [iconOnlyMode, setIconOnlyMode] = useState(item.iconOnlyMode || false);
    const [activeTab, setActiveTab] = useState<'icon' | 'tags'>('icon');
    
    // Library State
    const [iconCategory, setIconCategory] = useState<string>(''); 
    const [librarySearch, setLibrarySearch] = useState('');

    // Tag Creator State
    const [newTagLabel, setNewTagLabel] = useState('');
    const [newTagColor, setNewTagColor] = useState('#39ff14');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live Preview Item
    const previewItem: FileSystemItem = {
        ...item,
        name: name,
        customIcon: selectedIcon,
        tags: tags,
        iconOnlyMode: iconOnlyMode
    };

    // --- COMPUTED ---
    const activeCategories = useMemo(() => getIconCategories(selectedPack), [selectedPack]);
    
    const visibleLibraryIcons = useMemo(() => {
        let icons = activeCategories[iconCategory] || [];
        
        if (librarySearch.trim()) {
            const searchLower = librarySearch.toLowerCase();
            if (selectedPack === 'emoji') {
                 // Emoji filtering is limited
                 return icons;
            } else {
                icons = icons.filter(iconName => iconName.toLowerCase().includes(searchLower));
            }
        }

        // Limit for 'Toate' to prevent crash with huge packs like MD
        if (iconCategory === 'Toate' && !librarySearch) return icons.slice(0, 500);
        return icons;
    }, [iconCategory, librarySearch, selectedPack, activeCategories]);

    // --- HANDLERS ---

    const handlePackSelect = (pack: PackKey) => {
        setSelectedPack(pack);
        const cats = getIconCategories(pack);
        const firstCat = Object.keys(cats).includes('Esential') ? 'Esential' : Object.keys(cats)[0];
        setIconCategory(firstCat);
        setView('library');
    };

    const handleIconSelect = (iconName: string) => {
        let finalIconString = iconName;
        // If not Lucide (default), prefix it
        if (selectedPack !== 'lucide') {
             finalIconString = `${selectedPack}:${iconName}`;
        }
        
        setSelectedIcon(finalIconString);
        setView('main');
    };

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedIcon(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addTag = () => {
        if (!newTagLabel.trim()) return;
        const newTag: Tag = {
            id: Date.now().toString(),
            label: newTagLabel,
            color: newTagColor
        };
        setTags([...tags, newTag]);
        setNewTagLabel('');
    };

    const removeTag = (id: string) => {
        setTags(tags.filter(t => t.id !== id));
    };

    const handleSave = () => {
        onSave({
            ...item,
            name,
            customIcon: selectedIcon,
            tags
        });
        onClose();
    };

    // --- RENDER HELPERS ---
    
    const RenderSelectedIconPreview = () => {
        if (!selectedIcon) return <span className="text-muted text-xs">Implicit</span>;
        
        // Handle Images
        if (selectedIcon.startsWith('data:') || selectedIcon.startsWith('http')) {
            return <img src={selectedIcon} className="w-6 h-6 rounded object-cover" />;
        }
        
        // Handle Emoji
        if (selectedIcon.startsWith('emoji:')) {
             return <span className="text-xl">{selectedIcon.replace('emoji:', '')}</span>;
        }

        // Handle Dynamic Packs
        if (selectedIcon.includes(':')) {
            const [prefix, name] = selectedIcon.split(':');
            const def = PACK_DEFS.find(p => p.key === prefix);
            if (def && def.map && def.map[name]) {
                const Icon = def.map[name];
                // Check if component exists
                return Icon ? <div className="w-10 h-10 rounded-xl bg-neon-green flex items-center justify-center"><Icon size={20} className="text-black" /></div> : <span>?</span>;
            }
            return <span>?</span>;
        }

        // Handle Legacy Lucide
        const IconCmp = LucideIcons[selectedIcon as keyof typeof LucideIcons] as React.ElementType;
        if (IconCmp && (typeof IconCmp === 'function' || typeof IconCmp === 'object')) return <div className="w-10 h-10 rounded-xl bg-neon-green flex items-center justify-center"><IconCmp size={20} className="text-black" /></div>;
        return <span className="text-muted text-xs">?</span>;
    };

    return (
        <AnimatePresence>
            {isOpen && (
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
                        className="relative w-full max-w-4xl h-[85vh] glass-card rounded-[32px] overflow-hidden flex flex-col md:flex-row"
                    >
                        {/* LEFT: Live Preview & Basic Info */}
                        <div className="hidden md:flex w-1/3 bg-surface/50 border-r border-border p-6 flex-col">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6 flex items-center gap-2"><LucideIcons.Monitor size={14} /> {t('livePreview')}</h3>
                            
                            <div className="flex-1 flex flex-col justify-center items-center">
                                <div className="pointer-events-none transform scale-110 origin-center w-full">
                                    <FileItem item={previewItem} onAction={() => {}} onClick={() => {}} theme="dark" />
                                </div>
                                <p className="text-[10px] text-muted text-center mt-8 max-w-[200px]">
                                    {t('livePreviewText' as any) || 'Previzualizare în timp real.'}
                                </p>
                            </div>

                            <div className="mt-8 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 block">{t('rename') || 'Redenumește'}</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none focus:border-neon-green transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Dynamic Content Area */}
                        <div className="flex-1 flex flex-col bg-background min-h-0 relative">
                            
                            <AnimatePresence mode="wait">
                                {view === 'main' ? (
                                    <motion.div 
                                        key="main"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex flex-col h-full"
                                    >
                                        {/* TABS HEADER */}
                                        <div className="flex border-b border-border shrink-0">
                                            <button onClick={() => setActiveTab('icon')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'icon' ? 'bg-surface text-neon-green border-b-2 border-neon-green' : 'text-muted hover:text-primary'}`}>Icon Studio</button>
                                            <button onClick={() => setActiveTab('tags')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'tags' ? 'bg-surface text-neon-green border-b-2 border-neon-green' : 'text-muted hover:text-primary'}`}>Tag Engine</button>
                                        </div>

                                        {/* SCROLLABLE CONTENT */}
                                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                            
                                            {/* --- TAB: ICON --- */}
                                            {activeTab === 'icon' && (
                                                <div className="space-y-6">
                                                    
                                                    {/* Current Icon Status */}
                                                    <div className="flex items-center justify-between p-4 rounded-3xl bg-surface/30 border border-border">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-2xl bg-black border border-border flex items-center justify-center overflow-hidden">
                                                                <RenderSelectedIconPreview />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-primary">{t('currentIcon' as any) || 'Iconiță Curentă'}</p>
                                                                <p className="text-[10px] text-muted">{t('publiclyVisible' as any) || 'Vizibilă public'}</p>
                                                            </div>
                                                        </div>
                                                        {selectedIcon && (
                                                            <button onClick={() => setSelectedIcon(undefined)} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors">
                                                                {t('reset' as any) || 'Resetează'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Upload Custom */}
                                                    <div className="p-8 rounded-[32px] border-2 border-dashed border-border bg-surface/5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-surface hover:border-neon-green transition-all group relative overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                                                        <div className="p-4 rounded-full bg-surface group-hover:scale-110 transition-transform relative z-10">
                                                            <LucideIcons.Upload size={24} className="text-muted group-hover:text-neon-green" />
                                                        </div>
                                                        <div className="text-center relative z-10">
                                                            <span className="text-sm font-bold text-primary block">{t('uploadImage' as any) || 'Încarcă Imagine'}</span>
                                                            <span className="text-[10px] text-muted">JPG, PNG, SVG (Max 2MB)</span>
                                                        </div>
                                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIconUpload} />
                                                    </div>

                                                    <div className="flex items-center gap-4 py-2 opacity-50">
                                                        <div className="h-px bg-border flex-1" />
                                                        <span className="text-[10px] font-bold text-muted uppercase">SAU</span>
                                                        <div className="h-px bg-border flex-1" />
                                                    </div>

                                                    {/* Open Library Button - CLEANED UP NO GLOW */}
                                                    <button 
                                                        onClick={() => setView('packs')}
                                                        className="w-full py-6 rounded-[32px] bg-gradient-to-r from-surface to-background border border-border hover:border-neon-green group relative overflow-hidden transition-all shadow-sm hover:shadow-md text-left"
                                                    >
                                                        <div className="flex items-center justify-between px-8 relative z-10">
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-12 h-12 rounded-2xl bg-neon-green flex items-center justify-center text-black">
                                                                    <LucideIcons.Grid size={24} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-lg text-primary group-hover:text-neon-green transition-colors">{t('openLibrary' as any) || 'Deschide Librăria'}</h4>
                                                                    <p className="text-xs text-muted">{t('accessCollections' as any) || 'Acces la 10 colecții premium'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-10 h-10 rounded-full bg-black border border-border flex items-center justify-center text-muted group-hover:text-white group-hover:border-neon-green transition-all">
                                                                <LucideIcons.ChevronRight size={18} />
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            )}

                                            {/* --- TAB: TAGS --- */}
                                            {activeTab === 'tags' && (
                                                <div className="space-y-6">
                                                    <div className="bg-surface/30 rounded-[24px] p-5 border border-border space-y-4">
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted">{t('newTag' as any) || 'Tag Nou'}</h4>
                                                        <div className="flex gap-3">
                                                            <input type="text" placeholder={t('tagLabel' as any) || "Nume etichetă..."} value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-4 text-sm text-primary outline-none focus:border-neon-green" />
                                                            <div className="w-12"><CustomColorPicker compact color={newTagColor} onChange={setNewTagColor} /></div>
                                                            <button onClick={addTag} className="w-12 h-12 rounded-xl bg-neon-green text-black flex items-center justify-center hover:scale-105 transition-transform"><LucideIcons.Plus size={20} /></button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted mb-4">{t('activeTags' as any) || 'Etichete Active'}</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {tags.map(tag => (
                                                                <span key={tag.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-black text-xs font-bold" style={{ backgroundColor: tag.color }}>
                                                                    {tag.label}
                                                                    <button onClick={() => removeTag(tag.id)} className="hover:bg-black/20 rounded-full p-0.5"><LucideIcons.X size={12} /></button>
                                                                </span>
                                                            ))}
                                                            {tags.length === 0 && <p className="text-xs text-muted italic">{t('noTagsAdded' as any) || 'Nicio etichetă adăugată.'}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* FOOTER ACTIONS - CLEANED NO SHADOW-NEON */}
                                        <div className="p-6 border-t border-border flex justify-end gap-4 bg-surface/30 shrink-0">
                                            <button onClick={onClose} className="px-6 py-3 rounded-xl border border-border text-xs font-bold uppercase tracking-wide hover:bg-surface text-muted hover:text-white transition-colors">{t('cancel' as any) || 'Anulează'}</button>
                                            <button onClick={handleSave} className="px-8 py-3 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-wide shadow-sm hover:scale-105 transition-transform">{t('save' as any) || 'Salvează'}</button>
                                        </div>
                                    </motion.div>
                                ) : view === 'packs' ? (
                                    /* --- PACK SELECTION VIEW (MATCHING THEMES CARD) --- */
                                    <motion.div 
                                        key="packs"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex flex-col h-full bg-background absolute inset-0 z-10"
                                    >
                                        <div className="px-6 py-5 border-b border-border flex items-center gap-3 bg-surface/30 shrink-0 backdrop-blur-md z-20">
                                            <button onClick={() => setView('main')} className="p-2 -ml-2 rounded-full hover:bg-surface text-muted hover:text-white transition-colors glass-button">
                                                <LucideIcons.ArrowLeft size={24} />
                                            </button>
                                            <div>
                                                <h3 className="text-xl font-bold text-primary">{t('choosePack' as any) || 'Alege Pachetul'}</h3>
                                                <p className="text-[10px] text-muted uppercase tracking-wider">{t('collectionsAvailable' as any) || '10 Colecții Disponibile'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {PACK_DEFS.map(pack => (
                                                    <button 
                                                        key={pack.key}
                                                        onClick={() => handlePackSelect(pack.key)} 
                                                        className="p-6 rounded-[24px] border border-border bg-card shadow-lg cursor-pointer hover:border-neon-green/50 transition-all group relative overflow-hidden text-left flex flex-col justify-between h-44"
                                                    >
                                                        {/* Large Faded Background Icon */}
                                                        <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                                             {React.cloneElement(pack.icon as React.ReactElement, { size: 90 })}
                                                        </div>

                                                        {/* Header Section */}
                                                        <div className="flex items-center gap-4 relative z-10">
                                                            {/* Gradient Icon Box */}
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-green to-emerald-600 flex items-center justify-center text-black shadow-lg shrink-0">
                                                               {React.cloneElement(pack.icon as React.ReactElement, { size: 24 })}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-primary text-lg leading-tight">{pack.name}</h4>
                                                                <p className="text-[11px] text-muted font-medium mt-0.5">{pack.desc}</p>
                                                            </div>
                                                        </div>

                                                        {/* Footer / Action Section */}
                                                        <div className="mt-auto relative z-10 pt-4">
                                                            <div className="flex items-center text-[10px] font-black text-neon-green uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                                                {t('select' as any) || 'Selectează'} <LucideIcons.ArrowRight className="ml-1" size={12} />
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="h-10"></div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* --- LIBRARY VIEW --- */
                                    <motion.div 
                                        key="library"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex flex-col h-full bg-background absolute inset-0 z-10"
                                    >
                                        {/* Library Header */}
                                        <div className="px-5 py-4 border-b border-border flex flex-col gap-3 bg-surface/30 shrink-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => setView('packs')} className="p-2 -ml-2 rounded-full hover:bg-surface text-muted hover:text-white transition-colors">
                                                        <LucideIcons.ArrowLeft size={20} />
                                                    </button>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-primary">Library</h3>
                                                        <p className="text-[10px] text-muted uppercase tracking-widest">{PACK_DEFS.find(p => p.key === selectedPack)?.name}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-neon-green/10 border border-neon-green/20 text-neon-green px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                    {visibleLibraryIcons.length}
                                                </div>
                                            </div>
                                            
                                            {/* Search Bar (Hide for Emoji for now as simpler) */}
                                            {selectedPack !== 'emoji' && (
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        placeholder={t('searchLibrary' as any) || "Caută în librărie (ex: arrow, wifi)..."}
                                                        value={librarySearch}
                                                        onChange={(e) => setLibrarySearch(e.target.value)}
                                                        className="w-full bg-background border border-border rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-primary focus:outline-none focus:border-neon-green"
                                                    />
                                                    <LucideIcons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                                    {librarySearch && (
                                                        <button onClick={() => setLibrarySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                                                            <LucideIcons.X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Categories Scroll */}
                                        <div className="px-5 py-3 border-b border-border bg-background shrink-0">
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                {Object.keys(activeCategories).map(cat => (
                                                    <button 
                                                        key={cat} 
                                                        onClick={() => { setIconCategory(cat); setLibrarySearch(''); }} 
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all whitespace-nowrap flex-shrink-0 ${iconCategory === cat ? 'bg-primary text-background border-primary' : 'bg-surface text-muted border-border hover:border-primary hover:text-primary'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Icons Grid (Scrollable) */}
                                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-background/50">
                                            {visibleLibraryIcons.length > 0 ? (
                                                <div className="grid grid-cols-5 md:grid-cols-6 gap-4">
                                                    {visibleLibraryIcons.map((iconName) => {
                                                        // Construct ID based on pack for selection comparison
                                                        const fullId = selectedPack === 'lucide' ? iconName : `${selectedPack}:${iconName}`;
                                                        const isSelected = selectedIcon === fullId;
                                                        
                                                        // Render content based on pack
                                                        let Content = null;
                                                        
                                                        const def = PACK_DEFS.find(p => p.key === selectedPack);
                                                        
                                                        if (selectedPack === 'emoji') {
                                                            Content = <span className="text-2xl">{iconName}</span>;
                                                        } else if (def && def.map) {
                                                            const IconCmp = def.map[iconName];
                                                            // Verify it is a component
                                                            if (IconCmp && (typeof IconCmp === 'function' || typeof IconCmp === 'object')) {
                                                                // Adjust size based on pack
                                                                const size = selectedPack === 'lucide' ? 24 : '20px'; 
                                                                Content = <IconCmp size={size} className="w-6 h-6" />;
                                                            }
                                                        }

                                                        if (!Content) return null;

                                                        return (
                                                            <button 
                                                                key={iconName} 
                                                                onClick={() => handleIconSelect(iconName)}
                                                                title={iconName}
                                                                className={`aspect-square rounded-2xl flex flex-col gap-1 items-center justify-center transition-all group relative overflow-hidden ${isSelected ? 'bg-neon-green text-black scale-105 ring-2 ring-white' : 'bg-surface border border-border text-muted hover:border-white hover:text-white hover:bg-surface/80'}`}
                                                            >
                                                                {Content}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-40 text-muted">
                                                    <p className="text-xs">{t('noIconFound' as any) || 'Nicio iconiță găsită.'}</p>
                                                </div>
                                            )}
                                            
                                            {iconCategory === 'Toate' && !librarySearch && visibleLibraryIcons.length === 500 && (
                                                <div className="py-4 text-center text-[10px] text-muted uppercase font-bold">
                                                    {t('showingTop500' as any) || 'Se afișează primele 500. Folosește căutarea pentru toate.'}
                                                </div>
                                            )}

                                            <div className="h-10" /> {/* Spacer */}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
