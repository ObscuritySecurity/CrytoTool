import React from 'react';
import { motion } from 'framer-motion';

interface LiquidGlassOverlayProps {
  intensity?: 'subtle' | 'medium' | 'full';
}

function getAccentRgb(): string {
  if (typeof window === 'undefined') return '232,232,232';
  const accent = localStorage.getItem('theme_accent') || '#E8E8E8';
  const hex = accent.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return isNaN(r) || isNaN(g) || isNaN(b) ? '232,232,232' : `${r},${g},${b}`;
}

export const LiquidGlassOverlay: React.FC<LiquidGlassOverlayProps> = ({ intensity = 'full' }) => {
  const accentRgb = getAccentRgb();

  const fade = intensity === 'subtle' ? 0.4 : intensity === 'medium' ? 0.7 : 1;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute -inset-px rounded-[inherit]"
        style={{
          background: `conic-gradient(from 0deg, transparent, rgba(255,255,255,${0.2 * fade}), transparent 30%, rgba(${accentRgb},${0.15 * fade}) 50%, transparent 70%, rgba(255,255,255,${0.1 * fade}), transparent)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
          opacity: 0.15,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-96 h-96"
        style={{
          background: `radial-gradient(circle, rgba(255,255,255,${0.35 * fade}), transparent 60%)`,
          filter: 'blur(45px)',
          opacity: 0.2 * fade,
        }}
        animate={{ x: [-40, 50, -20, -40], y: [-30, 40, -50, -30], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-64 h-64"
        style={{
          background: `radial-gradient(circle, rgba(${accentRgb}, ${0.45 * fade}), transparent 55%)`,
          filter: 'blur(30px)',
          opacity: 0.18 * fade,
        }}
        animate={{ x: [30, -40, 50, 30], y: [40, -30, -20, 40], scale: [0.9, 1.25, 0.85, 0.9] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-40 h-40"
        style={{
          background: `radial-gradient(circle, rgba(255,255,255,${0.6 * fade}), transparent 50%)`,
          filter: 'blur(20px)',
          opacity: 0.25 * fade,
        }}
        animate={{ x: ['15%', '75%', '25%', '15%'], y: ['25%', '15%', '70%', '25%'], scale: [1, 0.75, 1.3, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.5) 55%, transparent 65%)',
          backgroundSize: '250% 250%',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
          opacity: 0.18 * fade,
        }}
        animate={{ backgroundPosition: ['200% 50%', '-100% 50%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
      />
      <motion.div
        className="absolute w-32 h-32"
        style={{
          background: `radial-gradient(circle, rgba(${accentRgb}, ${0.35 * fade}), transparent 50%)`,
          filter: 'blur(35px)',
          opacity: 0.12 * fade,
        }}
        animate={{ x: ['-10%', 'calc(100% - 4rem)', '-10%'], y: ['-10%', '-10%', 'calc(100% - 4rem)'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};
