
import React from 'react';
import { Plus, FolderPlus, Database, Search, Trash2, Settings } from 'lucide-react';
import { ViewState } from '../types';
import { useI18n } from '../utils/i18nContext';

interface TopActionsProps {
  activeTab: string;
  isCreatingFolder: boolean;
  newFolderName: string;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onAddFile: () => void;
  onStartFolderCreation: () => void;
  onNewFolderNameChange: (val: string) => void;
  onConfirmFolderCreation: () => void;
  onCancelFolderCreation: () => void;
  onNavigateView: (view: ViewState) => void;
}

export const TopActions: React.FC<TopActionsProps> = ({
  activeTab,
  isCreatingFolder,
  newFolderName,
  folderInputRef,
  onAddFile,
  onStartFolderCreation,
  onNewFolderNameChange,
  onConfirmFolderCreation,
  onCancelFolderCreation,
  onNavigateView,
}) => {
  const { t } = useI18n();
  
  if (activeTab !== 'files') {
    return (
      <header className="px-5 pt-8 pb-4 bg-background">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: `drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.4))` }}>
              <path d="M30 40 V25 A20 20 0 0 1 70 25 V40" stroke="var(--accent-color)" strokeWidth="12" strokeLinecap="round" fill="none" />
              <rect x="15" y="40" width="70" height="45" rx="10" fill="none" stroke="var(--accent-color)" strokeWidth="8" />
              <path d="M42 61 L50 69 L62 53" stroke="var(--accent-color)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Cryto<span className="text-neon-green">Tool</span></h1>
        </div>
      </header>
    );
  }

  return (
    <header className="px-5 pt-8 pb-4 space-y-6 bg-background">
      {/* LOGO & NAME */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: `drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.4))` }}>
            <path d="M30 40 V25 A20 20 0 0 1 70 25 V40" stroke="var(--accent-color)" strokeWidth="12" strokeLinecap="round" fill="none" />
            <rect x="15" y="40" width="70" height="45" rx="10" fill="none" stroke="var(--accent-color)" strokeWidth="8" />
            <path d="M42 61 L50 69 L62 53" stroke="var(--accent-color)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Cryto<span className="text-neon-green">Tool</span></h1>
      </div>

      <div className="space-y-2.5">
        {/* First row: Add File, Add Folder, Storage */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddFile} 
            className="flex-[2.5] font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-neon-green to-emerald-400 text-black transition-all active:scale-95 shadow-lg hover:shadow-neon-green/30"
          >
            <Plus size={20} strokeWidth={4} />
            <span>{t('addFile')}</span>
          </button>
          
          <button 
            onClick={!isCreatingFolder ? onStartFolderCreation : undefined} 
            className="flex-[2.5] font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 glass-button text-primary transition-all active:scale-95"
          >
            <FolderPlus size={20} className="text-primary" />
            {isCreatingFolder ? (
              <input 
                ref={folderInputRef} 
                value={newFolderName}
                onChange={(e) => onNewFolderNameChange(e.target.value)}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') onConfirmFolderCreation(); 
                  if (e.key === 'Escape') onCancelFolderCreation(); 
                }}
                onBlur={onCancelFolderCreation}
                className="bg-transparent border-none outline-none text-primary w-full min-w-[60px] font-bold text-sm"
                placeholder={t('folderName')}
              />
            ) : (
              <span>{t('addFolder')}</span>
            )}
          </button>

          <button 
            onClick={() => onNavigateView('storage')} 
            className="w-11 h-11 flex items-center justify-center rounded-xl glass-button text-primary transition-all active:scale-95 shrink-0"
          >
            <Database size={20} />
          </button>
        </div>

        {/* Second row: Search, Trash, Settings */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigateView('search')} 
            className="w-11 h-11 flex items-center justify-center rounded-xl glass-button text-primary transition-all active:scale-95"
          >
            <Search size={18} />
          </button>
          <button 
            onClick={() => onNavigateView('trash')} 
            className="w-11 h-11 flex items-center justify-center rounded-xl glass-button text-primary transition-all active:scale-95"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => onNavigateView('settings')} 
            className="w-11 h-11 flex items-center justify-center rounded-xl glass-button text-primary transition-all active:scale-95"
          >
            <Settings size={18} />
          </button>
        </div>

        <p className="text-xs text-muted font-medium pt-1 opacity-80">Browse and manage your files and folders.</p>
      </div>
    </header>
  );
};
