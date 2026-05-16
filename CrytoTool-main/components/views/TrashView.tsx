
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { FileItem } from '../FileItem';
import { useI18n } from '../../utils/i18nContext';

interface TrashViewProps {
  trashItems: FileSystemItem[];
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onBack: () => void;
  theme: AppTheme;
}

export const TrashView: React.FC<TrashViewProps> = ({ trashItems, onRestore, onDeleteForever, onBack, theme }) => {
  const { t } = useI18n();
  
  return (
    <motion.div 
      key="trash-view" 
      initial={{ opacity: 0, x: 50 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 50 }} 
      className="absolute inset-0 z-50 flex flex-col bg-background"
    >
      <div className="px-5 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button">
            <ArrowLeft size={24} className="text-primary" />
          </button>
          <h2 className="text-xl font-bold tracking-wide text-primary">{t('trash')}</h2>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
           <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{trashItems.length} {t('trashFiles') || 'Fișiere'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {trashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted opacity-50 pb-20">
            <Trash2 size={64} className="mb-4" />
            <p className="text-sm font-medium">{t('trashIsEmpty') || 'Coșul este gol.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-surface/50 border border-white/10 p-4 rounded-xl flex items-start gap-3 mb-2">
                <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted leading-relaxed">
                    {t('trashWarning') || 'Fișierele din coș sunt șterse automat după 30 de zile. Acțiunile de aici sunt definitive.'}
                </p>
            </div>
            
            {trashItems.map(item => (
              <div key={item.id} className="relative group">
                <FileItem 
                    item={item} 
                    onAction={() => {}} 
                    onClick={() => {}} 
                    theme={theme}
                />
                {/* Overlay actions for trash */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                        onClick={() => onRestore(item.id)}
                        className="p-3 rounded-full bg-neon-green text-black hover:scale-110 transition-transform shadow-neon"
                        title={t('restoreItem') || "Restaurează"}
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button 
                        onClick={() => onDeleteForever(item.id)}
                        className="p-3 rounded-full bg-red-500 text-white hover:scale-110 transition-transform shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        title={t('deleteForever') || "Șterge Definitiv"}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
