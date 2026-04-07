
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, X } from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { FileItem } from '../FileItem';
import { useI18n } from '../../utils/i18nContext';

interface SearchViewProps {
  items: FileSystemItem[]; // All items (non-trashed)
  onNavigate: (item: FileSystemItem) => void;
  onBack: () => void;
  theme: AppTheme;
}

export const SearchView: React.FC<SearchViewProps> = ({ items, onNavigate, onBack, theme }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!query) return [];
    const lowerQ = query.toLowerCase();
    return items.filter(item => 
      item.type !== 'system' && 
      item.name.toLowerCase().includes(lowerQ)
    );
  }, [items, query]);

  return (
    <motion.div 
      key="search-view" 
      initial={{ opacity: 0, x: 50 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 50 }} 
      className="absolute inset-0 z-50 flex flex-col bg-background"
    >
      <div className="px-5 pt-6 pb-4 border-b border-white/10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors glass-button">
          <ArrowLeft size={24} className="text-primary" />
        </button>
        <div className="flex-1 relative">
          <input 
            type="text" 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchFiles') || "Caută fișiere..."}
            className="w-full glass-button border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-primary focus:outline-none focus:border-neon-green transition-colors"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {query === '' ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted opacity-50">
            <Search size={48} className="mb-4" />
            <p className="text-sm font-medium">{t('startTyping') || "Începe să tastezi pentru a căuta."}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center text-muted py-8 text-sm">
            {t('noResultsFor') || "Niciun rezultat pentru"} "{query}"
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">{t('results') || "Rezultate"} ({filteredItems.length})</p>
            {filteredItems.map(item => (
              <FileItem 
                key={item.id} 
                item={item} 
                onAction={() => {}} 
                onClick={() => onNavigate(item)} 
                theme={theme}
                minimal
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
