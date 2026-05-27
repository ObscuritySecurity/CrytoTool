
import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, FileText, Image, Music, Database, Key, FolderLock } from 'lucide-react';

const NeonButton: React.FC<{ children: React.ReactNode; primary?: boolean }> = ({ children, primary }) => (
  <button 
    className={`
      px-8 py-3 rounded-md font-bold text-lg tracking-wide transition-all duration-300
      ${primary 
        ? 'bg-neon-green text-black hover:bg-white hover:shadow-neon-hover shadow-neon' 
        : 'border-2 border-neon-green text-neon-green hover:bg-neon-green hover:text-black hover:shadow-neon'
      }
    `}
    style={{ 
      backgroundColor: primary ? '#39ff14' : 'transparent',
      borderColor: '#39ff14',
      color: primary ? '#000' : '#39ff14'
    }}
  >
    {children}
  </button>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(57, 255, 20, 0.2)" }}
    className="p-6 border border-zinc-800 bg-zinc-900/50 rounded-xl backdrop-blur-sm hover:border-neon-green/50 transition-colors duration-300"
  >
    <div className="text-neon-green mb-4 [&>svg]:w-10 [&>svg]:h-10 drop-shadow-[0_0_5px_rgba(57,255,20,0.8)]">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400">{desc}</p>
  </motion.div>
);

const ModernLogo: React.FC = () => (
  <div className="flex items-center gap-3 select-none cursor-pointer group">
    <div className="relative w-10 h-10 flex items-center justify-center bg-black border border-zinc-800 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.5)] overflow-hidden group-hover:border-neon-green/50 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-tr from-neon-green/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {/* Custom SVG Lock Logo with Checkmark */}
      <svg viewBox="0 0 100 100" className="w-6 h-6 text-neon-green relative z-10 transition-transform duration-300 group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 5px rgba(57,255,20,0.6))' }}>
        <path d="M30 40 V25 A20 20 0 0 1 70 25 V40" stroke="currentColor" strokeWidth="10" strokeLinecap="round" fill="none" />
        <rect x="15" y="40" width="70" height="45" rx="10" fill="none" stroke="currentColor" strokeWidth="8" />
        <path d="M42 61 L50 69 L62 53" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
    <div className="flex flex-col">
      <span className="font-mono font-black text-xl tracking-wide leading-none text-white group-hover:text-neon-green transition-colors duration-300">
        CRYTO
      </span>
      <span className="font-mono text-[10px] tracking-[0.4em] text-neon-green leading-none opacity-80 group-hover:opacity-100 transition-opacity">
        VAULT
      </span>
    </div>
  </div>
);

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-neon-green selection:text-black">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <ModernLogo />
          
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
            <a href="#" className="hover:text-neon-green transition-colors py-2">Vault</a>
            <a href="#" className="hover:text-neon-green transition-colors py-2">Algorithms</a>
            <a href="#" className="hover:text-neon-green transition-colors py-2">Pricing</a>
          </div>
          <button className="hidden md:block px-6 py-2 border border-zinc-700 rounded-full text-sm font-semibold hover:border-neon-green hover:text-neon-green transition-all duration-300 hover:shadow-[0_0_15px_rgba(57,255,20,0.3)] bg-zinc-900/50">
            Open Vault
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-neon-green/10 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-3 py-1 mb-6 border border-neon-green/30 rounded-full bg-neon-green/5 text-neon-green text-xs font-mono tracking-widest uppercase shadow-[0_0_10px_rgba(57,255,20,0.2)]">
              Multi-Algorithm Encryption
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
              The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">File Vault</span><br />
              <span style={{ textShadow: "0 0 20px rgba(57, 255, 20, 0.4)" }} className="text-neon-green">Secure Your Life.</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Encrypt your Gallery, Music, and Documents with your choice of 5 military-grade algorithms. 
              Your data, your rules, impenetrable security.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <NeonButton primary>Secure Files Now</NeonButton>
              <NeonButton>View Algorithms</NeonButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Preview / Vault Visual */}
      <section className="py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto border border-zinc-800 bg-zinc-900/50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
           {/* Window Controls */}
           <div className="h-10 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 justify-between">
             <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
             </div>
             <div className="text-xs text-zinc-500 font-mono flex gap-2">
                <span className="text-neon-green">ENCRYPTION: AES-256 (ACTIVE)</span>
             </div>
           </div>

           <div className="flex flex-col md:flex-row h-[400px]">
             {/* Sidebar */}
             <div className="w-full md:w-64 border-r border-zinc-800 bg-black/40 p-4 space-y-6">
                <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Vaults</p>
                    <div className="flex items-center gap-3 p-2 rounded bg-neon-green/10 text-neon-green border border-neon-green/20">
                        <FolderLock size={18} />
                        <span className="font-medium">Private Vault</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition">
                        <Image size={18} />
                        <span>Gallery</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition">
                        <Music size={18} />
                        <span>Music</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition">
                        <FileText size={18} />
                        <span>Documents</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Algorithm</p>
                    <div className="p-3 rounded border border-zinc-800 bg-black">
                        <div className="flex justify-between items-center text-sm text-white mb-1">
                            <span>Selection</span>
                            <Key size={14} className="text-neon-green"/>
                        </div>
                        <select className="w-full bg-zinc-900 border-none text-xs text-zinc-400 rounded p-1 outline-none">
                            <option>AES-256 (Default)</option>
                            <option>RSA-4096</option>
                            <option>Twofish</option>
                            <option>Serpent</option>
                            <option>ChaCha20</option>
                        </select>
                    </div>
                </div>
             </div>

             {/* Main Content (File Grid) */}
             <div className="flex-1 p-6 bg-zinc-900/20 overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Encrypted File Items */}
                    {[1,2,3,4,5,6,7,8].map((i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-neon-green/50 cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(57,255,20,0.1)]"
                        >
                            <div className="flex justify-center mb-3 text-zinc-600 group-hover:text-neon-green transition-colors">
                                <Lock size={32} />
                            </div>
                            <div className="space-y-1">
                                <div className="h-2 w-3/4 bg-zinc-800 rounded group-hover:bg-zinc-700"></div>
                                <div className="h-2 w-1/2 bg-zinc-800 rounded group-hover:bg-zinc-700"></div>
                            </div>
                        </motion.div>
                    ))}
                </div>
             </div>
           </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16"><span className="border-b-2 border-neon-green pb-2">Vault Features</span></h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Database />} 
            title="5x Crypto Engines" 
            desc="Choose between AES, RSA, Twofish, Serpent, or ChaCha20 to encrypt your specific needs." 
          />
          <FeatureCard 
            icon={<Image />} 
            title="Secure Gallery" 
            desc="Hide photos and videos in a custom container that doesn't appear in your system gallery." 
          />
          <FeatureCard 
            icon={<ShieldCheck />} 
            title="Zero Knowledge" 
            desc="We don't store your passwords or keys. Only you have access to your digital vault." 
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-center text-zinc-500 text-sm">
        <p>&copy; {new Date().getFullYear()} CrytoTool Vault. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-6">
          <a href="#" className="hover:text-neon-green">Privacy Policy</a>
          <a href="#" className="hover:text-neon-green">Terms of Service</a>
          <a href="#" className="hover:text-neon-green">Contact</a>
        </div>
      </footer>
    </div>
  );
};
