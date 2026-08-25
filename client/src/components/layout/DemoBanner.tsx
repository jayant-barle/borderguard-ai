import React from 'react';
import { ShieldCheck, Info, Sparkles } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2 text-xs border-b border-indigo-900/60 flex flex-wrap items-center justify-between shadow-xs z-20">
      <div className="flex items-center space-x-3">
        <span className="flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-semibold tracking-wide uppercase text-[10px]">
          <Sparkles className="w-3 h-3 mr-1 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
          SATYASHIELD AI ENGINE: DEMO MODE
        </span>
        <span className="hidden sm:inline text-slate-300 font-medium">
          Fictional Demo Data — SIH Prototype
        </span>
      </div>

      <div className="flex items-center space-x-2 text-slate-300">
        <Info className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px]">
          <strong className="text-amber-300 font-semibold">Decision-Support Prototype:</strong> Never automatically makes immigration or criminal determinations.
        </span>
      </div>
    </div>
  );
};
