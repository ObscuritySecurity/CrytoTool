
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronRight } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  desc?: string;
}

interface CustomSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  inline?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, onChange, icon, inline = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-16 px-4 rounded-2xl border border-border cursor-pointer flex items-center justify-between bg-surface hover:border-neon-green/50 hover:bg-surface/80 transition-all group shadow-sm"
      >
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-black border border-border flex items-center justify-center text-muted group-hover:text-neon-green group-hover:border-neon-green transition-colors">
               {icon}
            </div>
          )}
          <div className="flex flex-col items-start">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-primary transition-colors">{label}</span>
             <span className="text-sm font-bold text-primary">{selectedOption.label}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="px-3 py-1 rounded-full bg-black border border-border text-[10px] font-mono text-neon-green shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)]">
                {selectedOption.value.toUpperCase()}
             </div>
             <ChevronRight size={16} className={`text-muted group-hover:text-neon-green transition-all ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Inline Dropdown - appears inside the card */}
      {inline && (
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="py-2 space-y-1">
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                      <button 
                          key={option.value}
                          onClick={() => { onChange(option.value); setIsOpen(false); }}
                          className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all group ${isSelected ? 'bg-neon-green/10 border-neon-green' : 'bg-surface/50 border-border hover:bg-surface hover:border-zinc-600'}`}
                      >
                          <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${isSelected ? 'bg-neon-green text-black border-neon-green' : 'bg-black text-muted border-border'}`}>
                                  {option.value.substring(0,2).toUpperCase()}
                              </div>
                              <div className="text-left">
                                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-primary'}`}>{option.label}</div>
                              </div>
                          </div>
                          
                          {isSelected && (
                              <motion.div 
                                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                                  className="w-5 h-5 rounded-full bg-neon-green flex items-center justify-center text-black"
                              >
                                  <Check size={12} strokeWidth={3} />
                              </motion.div>
                          )}
                      </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modal Overlay */}
      {!inline && (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
             <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-border rounded-[32px] overflow-hidden shadow-2xl z-10"
              onClick={(e) => e.stopPropagation()} // Prevent close on modal click
            >
               {/* Header */}
               <div className="p-6 border-b border-border bg-surface/30 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      {icon && <div className="text-neon-green">{icon}</div>}
                      <h3 className="text-lg font-bold text-primary tracking-wide">{label}</h3>
                  </div>
               </div>
               
               {/* Options List */}
               <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                  {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                        <button 
                            key={option.value}
                            onClick={() => { onChange(option.value); setIsOpen(false); }}
                            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all group relative overflow-hidden ${isSelected ? 'bg-neon-green/10 border-neon-green shadow-[inset_0_0_20px_rgba(var(--accent-rgb),0.1)]' : 'bg-surface/50 border-border hover:bg-surface hover:border-zinc-600'}`}
                        >
                            <div className="flex items-center gap-4 z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border ${isSelected ? 'bg-neon-green text-black border-neon-green' : 'bg-black text-muted border-border'}`}>
                                    {option.value.substring(0,2).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-primary'}`}>{option.label}</div>
                                    {option.desc && <div className="text-[10px] text-muted">{option.desc}</div>}
                                </div>
                            </div>
                            
                            {isSelected && (
                                <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="w-6 h-6 rounded-full bg-neon-green flex items-center justify-center text-black z-10 shadow-neon"
                                >
                                    <Check size={14} strokeWidth={3} />
                                </motion.div>
                            )}
                        </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-surface/30">
                    <p className="text-[10px] text-center text-muted">Modificările se aplică instantaneu.</p>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      )}
    </>
  );
};
