
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, SkipBack, SkipForward, Play, Pause, Music } from 'lucide-react';
import { FileSystemItem } from '../types';

interface FullPlayerProps {
  currentPlayingItem: FileSystemItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FullPlayer: React.FC<FullPlayerProps> = ({
  currentPlayingItem,
  isPlaying,
  currentTime,
  duration,
  onClose,
  onTogglePlay,
  onSeek,
}) => {
  if (!currentPlayingItem) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl text-white flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
        >
          <ChevronDown size={24} />
        </button>
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-widest">
          Now Playing
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <motion.div
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{
            duration: 8,
            repeat: isPlaying ? Infinity : 0,
            ease: "linear",
          }}
          className="w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-zinc-800 shrink-0"
        >
          {currentPlayingItem.customIcon || currentPlayingItem.coverUrl ? (
            <img
              src={
                currentPlayingItem.customIcon || currentPlayingItem.coverUrl
              }
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Music size={64} className="text-zinc-700" />
            </div>
          )}
        </motion.div>

        <div className="w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-white truncate">
            {(currentPlayingItem as any).decryptedName ||
              currentPlayingItem.name}
          </h2>
          <p className="text-sm text-zinc-400 truncate mt-1">
            {(currentPlayingItem as any).decryptedArtist ||
              currentPlayingItem.artist ||
              "Unknown Artist"}
          </p>
        </div>

        <div className="w-full max-w-md">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={onSeek}
            className="w-full h-1.5 appearance-none bg-zinc-800 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-green [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(57,255,20,0.5)]"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-zinc-500 font-mono">
              {Math.floor(currentTime / 60)}:
              {String(Math.floor(currentTime % 60)).padStart(2, "0")}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {Math.floor(duration / 60)}:
              {String(Math.floor(duration % 60)).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="p-2 text-zinc-400 hover:text-white transition-colors">
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-neon-green text-black hover:scale-105 transition-transform shadow-[0_0_30px_rgba(57,255,20,0.3)]"
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>
          <button className="p-2 text-zinc-400 hover:text-white transition-colors">
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
