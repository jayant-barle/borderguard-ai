import React, { useState, useEffect } from 'react';
import { Menu, Activity, Clock, Shield, PlusCircle, Bot, Sparkles, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { OllamaStatus } from '../../../../shared/types';

interface NavbarProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, title }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'LOCAL';
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) +
          ` (${tzName})`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll Ollama status periodically
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const status = await api.ai.getStatus();
        setOllamaStatus(status);
      } catch {
        setOllamaStatus({
          connected: false,
          baseUrl: 'http://localhost:11434',
          activeModel: 'llama3.2:1b',
          availableModels: []
        });
      }
    };

    checkOllama();
    const interval = setInterval(checkOllama, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shadow-2xs">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center">
            {title || 'Security Operations Command'}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            SatyaShield Identity & Automated Forensic Screening Portal
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Real-time Digital Clock */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-xs font-mono text-slate-700">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{timeStr}</span>
        </div>

        {/* Ollama Local AI Engine Status Badge */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer transition-all ${
            ollamaStatus?.connected
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
          }`}
          onClick={() => navigate('/admin/risk-settings')}
          title={`Ollama URL: ${ollamaStatus?.baseUrl || 'http://localhost:11434'} (Click to configure in settings)`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline font-semibold">
            {ollamaStatus?.connected ? `Ollama: ${ollamaStatus.activeModel}` : 'Ollama: Connecting'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              ollamaStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        </div>

        {/* System Health Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden md:inline">Engine Active</span>
        </div>

        {/* Quick New Verification Button */}
        <button
          onClick={() => navigate('/verify')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden xs:inline">New Screening</span>
        </button>
      </div>
    </header>
  );
};
