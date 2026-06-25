import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Skull } from 'lucide-react';
import { useI18n } from '../locales/i18nContext';

export interface AutoDestructCountdownHandle {
  trigger: (seconds: number) => void;
  cancel: () => void;
}

interface AutoDestructCountdownProps {
  onComplete: () => void;
  onStateChange?: (isActive: boolean) => void;
}

export const AutoDestructCountdown = forwardRef<AutoDestructCountdownHandle, AutoDestructCountdownProps>(
  ({ onComplete, onStateChange }, ref) => {
    const { t } = useI18n();
    const activeRef = useRef(false);

    const [countdown, setCountdown] = useState<number | null>(() => {
      const saved = localStorage.getItem('privon_destruct_time');
      if (saved) {
        const remaining = Math.max(0, Math.ceil((parseInt(saved, 10) - Date.now()) / 1000));
        return remaining > 0 ? remaining : null;
      }
      return null;
    });

    const [triggerTime, setTriggerTime] = useState<number | null>(() => {
      const saved = localStorage.getItem('privon_destruct_time');
      return saved ? parseInt(saved, 10) : null;
    });

    const isActive = countdown != null && countdown > 0;

    useEffect(() => {
      activeRef.current = isActive;
      onStateChange?.(isActive);
    }, [isActive, onStateChange]);

    useEffect(() => {
      if (!triggerTime) return;
      const intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((triggerTime - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(intervalId);
          setTriggerTime(null);
          localStorage.removeItem('privon_destruct_time');
          onComplete();
        }
      }, 1000);
      return () => clearInterval(intervalId);
    }, [triggerTime, onComplete]);

    useImperativeHandle(ref, () => ({
      trigger: (seconds: number) => {
        if (activeRef.current) return;
        activeRef.current = true;
        const time = Date.now() + (seconds * 1000);
        setTriggerTime(time);
        setCountdown(seconds);
        localStorage.setItem('privon_destruct_time', time.toString());
      },
      cancel: () => {
        activeRef.current = false;
        setTriggerTime(null);
        setCountdown(null);
        localStorage.removeItem('privon_destruct_time');
      }
    }));

    if (!isActive) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex flex-col items-center justify-center p-8 bg-red-500/10 rounded-2xl border border-red-500/30 mb-6"
      >
        <Skull className="text-red-500 mb-3 animate-pulse" size={40} />
        <div className="text-5xl font-black font-mono text-red-500 mb-2 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          {countdown}s
        </div>
        <p className="text-red-400 text-xs font-bold uppercase tracking-wider text-center">{t('autoDestructLabel')}</p>
        <p className="text-red-400/60 text-[10px] mt-3 text-center">{t('enterMasterPassword')}</p>
      </motion.div>
    );
  }
);

AutoDestructCountdown.displayName = 'AutoDestructCountdown';
