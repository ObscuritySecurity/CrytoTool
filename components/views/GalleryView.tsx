
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, Video, Heart, Image, Play, X, 
  Grid3X3, Share2, Trash2, Info, Lock, Unlock
} from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { useI18n } from '../../utils/i18nContext';

type GallerySubTab = 'all' | 'photos' | 'videos' | 'favorites' | 'albums';

interface GalleryViewProps {
  items: FileSystemItem[];
  onNavigate: (item: FileSystemItem) => void;
  theme: AppTheme;
  onDecrypt: (item: FileSystemItem) => Promise<string | null>;
  decryptedUrls: Record<string, string>;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ items, onNavigate, theme, onDecrypt, decryptedUrls }) => {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<GallerySubTab>('all');
  const [lightboxItem, setLightboxItem] = useState<FileSystemItem | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const isMedia = item.category === 'image' || item.category === 'video';
      if (!isMedia) return false;

      if (subTab === 'all') return true;
      if (subTab === 'photos') return item.category === 'image';
      if (subTab === 'videos') return item.category === 'video';
      if (subTab === 'favorites') return item.isFavorite;
      return true; 
    });
  }, [items, subTab]);

  const handleItemClick = (item: FileSystemItem) => {
    if (item.isEncrypted && !decryptedUrls[item.id]) {
      onDecrypt(item);
    } else {
      setLightboxItem(item);
    }
  };

  return (
    <div className="flex flex-col h-full relative bg-background font-sans">
      <AnimatePresence>
        {lightboxItem && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col"
                onClick={() => setLightboxItem(null)} // Click anywhere on background to close
            >
                <div 
                    className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-end px-6 pt-4"
                    onClick={(e) => e.stopPropagation()} // Stop propagation on header
                >
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-full text-white hover:text-neon-green transition-colors"><Info size={24} /></button>
                        <button className="p-2 rounded-full text-white hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                    {lightboxItem.isEncrypted && !decryptedUrls[lightboxItem.id] ? (
                      <div className="flex flex-col items-center gap-4">
                        <Lock size={64} className="text-neon-green" />
                        <p className="text-white text-lg font-bold">Fișier criptat</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDecrypt(lightboxItem); }}
                          className="px-6 py-3 bg-neon-green text-black font-bold rounded-xl"
                        >
                          Click pentru a decripta
                        </button>
                      </div>
                    ) : lightboxItem.category === 'video' ? (
                        <video 
                            src={decryptedUrls[lightboxItem.id] || lightboxItem.url} 
                            controls 
                            autoPlay 
                            className="max-w-full max-h-full rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <img 
                            src={decryptedUrls[lightboxItem.id] || lightboxItem.url || lightboxItem.customIcon} 
                            alt={lightboxItem.name} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>

                <div 
                    className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 to-transparent z-50 flex items-center justify-center pb-6 gap-6"
                    onClick={(e) => e.stopPropagation()} // Stop propagation on footer controls
                >
                    <button className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors">
                        <Share2 size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('share') || 'Distribuie'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors">
                        <Heart size={20} className={lightboxItem.isFavorite ? "fill-neon-green text-neon-green" : ""} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('favorite') || 'Favorit'}</span>
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar px-1 pt-2 border-b border-border mb-2">
        {[
          { id: 'all', label: t('all') || 'Toate', icon: <Grid3X3 size={12} /> },
          { id: 'photos', label: t('photos') || 'Poze', icon: <ImageIcon size={12} /> },
          { id: 'videos', label: t('videos') || 'Video', icon: <Video size={12} /> },
          { id: 'favorites', label: t('favorites') || 'Favorite', icon: <Heart size={12} /> },
          { id: 'albums', label: t('albums') || 'Albume', icon: <Image size={12} /> },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setSubTab(tab.id as GallerySubTab)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border ${subTab === tab.id ? 'bg-neon-green text-black border-neon-green' : 'bg-surface text-muted border-border hover:text-primary hover:border-primary'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-20 px-1">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted">
            <Image size={48} className="mb-2 opacity-20" />
            <p className="text-xs">{t('noMediaFound') || 'Niciun fișier media găsit.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3">
            {filteredItems.map((item) => (
              <motion.div 
                key={item.id}
                layoutId={item.id}
                onClick={() => handleItemClick(item)} 
                className="relative aspect-[4/5] bg-surface rounded-2xl overflow-hidden cursor-pointer group shadow-lg border border-border hover:border-neon-green/50 transition-colors"
              >
                {decryptedUrls[item.id] ? (
                  item.category === 'video' ? (
                    <video src={decryptedUrls[item.id]} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={decryptedUrls[item.id]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={item.name} />
                  )
                ) : item.isEncrypted ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/80">
                    <Lock size={32} className="text-neon-green mb-2" />
                    <p className="text-[10px] text-zinc-400 font-bold text-center px-2">Click pentru a decripta</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-green"></div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                
                {item.category === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
                            <Play fill="white" className="text-white ml-1" />
                        </div>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-zinc-400">{item.size}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
