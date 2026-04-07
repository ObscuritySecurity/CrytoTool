
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Music, Disc, User, ListMusic, Play, Pause, Shuffle, Heart, MoreHorizontal } from 'lucide-react';
import { FileSystemItem, AppTheme } from '../../types';
import { useI18n } from '../../utils/i18nContext';

type MusicSubTab = 'songs' | 'albums' | 'artists' | 'playlists';

interface MusicViewProps {
  items: FileSystemItem[];
  onPlay: (item: FileSystemItem) => void;
  currentSong: FileSystemItem | null;
  isPlaying: boolean;
  theme: AppTheme;
}

// Animated Equalizer Component
const Equalizer = () => (
  <div className="flex items-end gap-[2px] h-4">
    <motion.div animate={{ height: [4, 12, 6, 16, 8] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }} className="w-1 bg-neon-green rounded-full" />
    <motion.div animate={{ height: [8, 16, 8, 4, 12] }} transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse", delay: 0.1 }} className="w-1 bg-neon-green rounded-full" />
    <motion.div animate={{ height: [6, 10, 16, 6, 10] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", delay: 0.2 }} className="w-1 bg-neon-green rounded-full" />
  </div>
);

export const MusicView: React.FC<MusicViewProps> = ({ items, onPlay, currentSong, isPlaying, theme }) => {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<MusicSubTab>('songs');

  const filteredItems = useMemo(() => {
    return items.filter(item => item.category === 'audio');
  }, [items]);

  // Quick Picks (Just taking the first 4 items or random for demo feel)
  const quickPicks = useMemo(() => filteredItems.slice(0, 5), [filteredItems]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      
      {/* Decorative Background Glow */}
      <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] bg-neon-green/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-2 no-scrollbar px-1 z-10 shrink-0">
        {[
          { id: 'songs', label: 'Piese' },
          { id: 'albums', label: 'Albume' },
          { id: 'artists', label: 'Artiști' },
          { id: 'playlists', label: 'Playlist' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setSubTab(tab.id as MusicSubTab)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${subTab === tab.id ? 'bg-white text-black border-white' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 backdrop-blur-md'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-32 pt-4 no-scrollbar">
        
        {/* Quick Picks Section */}
        {quickPicks.length > 0 && (
          <div className="mb-8 pl-1">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Quick picks <span className="text-xs font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">History</span>
            </h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pr-4">
              {quickPicks.map((item) => (
                <motion.div 
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPlay(item)}
                  className="min-w-[140px] flex flex-col gap-3 group cursor-pointer"
                >
                  <div className="w-[140px] h-[140px] rounded-2xl overflow-hidden relative shadow-lg">
                    {item.customIcon || item.coverUrl ? (
                      <img src={item.customIcon || item.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                        <Music size={40} className="text-zinc-700" />
                      </div>
                    )}
                    {/* Hover Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <div className="w-10 h-10 rounded-full bg-neon-green text-black flex items-center justify-center shadow-neon">
                          <Play size={18} fill="black" className="ml-0.5" />
                       </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                    <p className="text-xs text-zinc-500 truncate">{item.artist || 'Unknown'}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-bold text-white">Keep listening</h3>
          <button className="w-10 h-10 rounded-full bg-neon-green text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)]">
             <Shuffle size={20} />
          </button>
        </div>

        {/* Song List */}
        <div className="space-y-1">
          {filteredItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 text-muted">
               <Music size={48} className="mb-2 opacity-20" />
               <p className="text-xs">Library empty.</p>
             </div>
          ) : (
            filteredItems.map((item, index) => {
              const isCurrent = currentSong?.id === item.id;
              
              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onPlay(item)}
                  className={`group p-3 rounded-xl flex items-center gap-4 cursor-pointer transition-all hover:bg-white/5 ${isCurrent ? 'bg-white/5' : ''}`}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm">
                    {item.customIcon || item.coverUrl ? (
                        <>
                          <img src={item.customIcon || item.coverUrl} className={`w-full h-full object-cover transition-opacity ${isCurrent && isPlaying ? 'opacity-40' : 'opacity-100'}`} alt="Art" />
                          {isCurrent && isPlaying && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <Equalizer />
                              </div>
                          )}
                        </>
                    ) : (
                        isCurrent && isPlaying ? <Equalizer /> : <Music size={20} className="text-zinc-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className={`text-sm font-bold truncate mb-0.5 ${isCurrent ? 'text-neon-green' : 'text-zinc-200'}`}>{item.name}</h4>
                    <p className="text-xs text-zinc-500 truncate">{item.artist || 'Unknown Artist'}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                     <button className="text-zinc-600 hover:text-neon-green transition-colors opacity-0 group-hover:opacity-100">
                        <Heart size={18} />
                     </button>
                     <span className="text-xs font-mono text-zinc-600">{item.size?.split(' ')[0]}MB</span>
                     <button className="text-zinc-500 hover:text-white">
                        <MoreHorizontal size={20} />
                     </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
