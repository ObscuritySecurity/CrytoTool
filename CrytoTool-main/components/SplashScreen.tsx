
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [locked, setLocked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showText, setShowText] = useState(false);
  
  const accentColor = localStorage.getItem('theme_accent') || '#39ff14';
  const rgb = (() => {
    const c = accentColor.replace('#', '');
    return `${parseInt(c.slice(0, 2), 16)}, ${parseInt(c.slice(2, 4), 16)}, ${parseInt(c.slice(4, 6), 16)}`;
  })();

  useEffect(() => {
    // Animation sequence:
    // 0ms: Screen appears (Lock open, grey)
    // 800ms: Lock closes and turns green
    // 1600ms: Checkmark draws (Verified)
    // 2200ms: CrytoTool text appears
    // 3800ms: Exit
    
    const lockTimer = setTimeout(() => setLocked(true), 800);
    const verifyTimer = setTimeout(() => setVerified(true), 1600);
    const textTimer = setTimeout(() => setShowText(true), 2200);
    const completeTimer = setTimeout(onComplete, 3800);

    return () => {
      clearTimeout(lockTimer);
      clearTimeout(verifyTimer);
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden font-sans"
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Background Ambient Glow (Subtle) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle_at_center, rgba(${rgb}, 0.06) 0%, transparent 70%)` }} />

      <div className="relative z-10 flex flex-col items-center">
        {/* Custom SVG Lock Animation */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* Glow Filter Definiton */}
                <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Shackle (Lock shackle) */}
                <motion.path 
                    d="M30 40 V25 A20 20 0 0 1 70 25 V40" 
                    fill="none" 
                    stroke={locked ? accentColor : "#52525b"}
                    strokeWidth="10" 
                    strokeLinecap="round" 
                    initial={{ y: -15 }}
                    animate={{ 
                        y: locked ? 0 : -15,
                        stroke: locked ? accentColor : "#52525b"
                    }}
                    transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                    style={{ filter: locked ? "url(#neon-glow)" : "none" }}
                />

                {/* Lock Body (Corpul) */}
                <motion.rect 
                    x="15" y="40" width="70" height="45" rx="10" 
                    fill="none" 
                    stroke={locked ? accentColor : "#52525b"}
                    strokeWidth="8" 
                    animate={{ 
                        stroke: locked ? accentColor : "#52525b"
                    }}
                    transition={{ duration: 0.4 }}
                    style={{ filter: locked ? "url(#neon-glow)" : "none" }}
                />

                {/* Checkmark - Only draws when verified */}
                {verified && (
                    <motion.path 
                        d="M42 61 L50 69 L62 53" 
                        fill="none" 
                        stroke={accentColor} 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        style={{ filter: "url(#neon-glow)" }}
                    />
                )}
            </svg>
            
            {/* Pulse Ring Effect when locking */}
            {locked && !verified && (
                 <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: 0 }}
                    className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${accentColor}` }}
                 />
            )}
        </div>

        {/* Text Animation */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showText ? 1 : 0, y: showText ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="text-center"
        >
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2 font-mono">
                CRYTO<span style={{ color: accentColor, textShadow: `0 0 15px rgba(${rgb}, 0.5)` }}>TOOL</span>
            </h1>
            <motion.div 
                className="h-0.5 mx-auto opacity-50"
                style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
                initial={{ width: 0 }}
                animate={{ width: showText ? "100%" : 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
            />
            <p className="mt-4 text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
                Secure Vault Access
            </p>
        </motion.div>
      </div>
    </motion.div>
  );
};
