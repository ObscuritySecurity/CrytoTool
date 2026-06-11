
import React from 'react';
import { Plus, FolderPlus, Database, Search, Trash2, Settings } from 'lucide-react';
import { ViewState } from '../types';
import { useI18n } from '../locales/i18nContext';
import crytoLogo from '../assets/CrytoTool.png';

interface TopActionsProps {
  activeTab: string;
  isCreatingFolder: boolean;
  newFolderName: string;
  folderInputRef: React.MutableRefObject<HTMLInputElement | null>;
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
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 blur-2xl rounded-full" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.15)' }} />
            <img src={crytoLogo} alt="CrytoTool" className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(var(--accent-rgb),0.6)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t('crytoPrefix')}<span className="bg-gradient-to-r from-zinc-300 via-zinc-400 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(212,212,216,0.3)]">{t('toolSuffix')}</span></h1>
        </div>
      </header>
    );
  }

  return (
    <header className="px-5 pt-8 pb-4 space-y-6 bg-background">
      {/* LOGO & NAME */}
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 blur-2xl rounded-full" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.15)' }} />
          <img src={crytoLogo} alt="CrytoTool" className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(var(--accent-rgb),0.6)]" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t('crytoPrefix')}<span className="bg-gradient-to-r from-zinc-300 via-zinc-400 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(212,212,216,0.3)]">{t('toolSuffix')}</span></h1>
      </div>

      <div className="space-y-2.5">
        {/* First row: Add File, Add Folder, Storage */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddFile} 
            className="flex-[2.5] font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-neon-green to-emerald-400 text-black transition-all active:scale-95 shadow-lg hover:shadow-neon-green/30 text-sm"
          >
            <Plus size={18} strokeWidth={3} />
            <span>{t('addFile')}</span>
          </button>
           
          <button 
            onClick={!isCreatingFolder ? onStartFolderCreation : undefined} 
            className="flex-[2.5] font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 glass-button text-primary transition-all active:scale-95 text-sm"
          >
            <FolderPlus size={18} className="text-primary" />
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
            className="w-10 h-10 flex items-center justify-center rounded-xl glass-button text-primary transition-all active:scale-95 shrink-0"
          >
            <Database size={18} />
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

        <p className="text-xs text-muted font-medium pt-1 opacity-80">{t('browseAndManage')}</p>
      </div>
    </header>
  );
};
