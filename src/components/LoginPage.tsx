import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, ArrowRight, Bot, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#040405] text-zinc-300 font-sans selection:bg-emerald-500/30 flex flex-col relative overflow-hidden">
      {/* Background cyber grid and subtle top green gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-[#040405] to-[#040405] opacity-90 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Subtle lighting accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      <header className="absolute top-0 w-full z-50 px-6 h-20 flex items-center justify-between">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden group-hover:border-emerald-500/50 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
            <Terminal className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white uppercase font-mono flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
              OmniPost <span className="text-[9px] text-zinc-500 font-normal px-1.5 py-0.5 rounded border border-zinc-850 group-hover:border-emerald-500/30">Return</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center relative z-10 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 opacity-50" />
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-inner mb-6 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-50" />
               <Lock className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black font-mono tracking-tight text-white uppercase mb-2">Secure Access</h1>
            <p className="text-sm text-zinc-400 font-mono">Authenticate your session to access the OmniPost dispatch console.</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={onLogin}
              className="w-full py-4 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold uppercase tracking-widest transition-all shadow-lg cursor-pointer transform hover:translate-y-[-1px] active:translate-y-[1px] flex items-center justify-center gap-2.5"
            >
              <Bot className="w-4 h-4" />
              Sign in with Google
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              Cancel
            </button>
          </div>

          <div className="mt-8 text-center border-t border-zinc-900 pt-6">
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Authorized personnel only. Sessions are monitored.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
