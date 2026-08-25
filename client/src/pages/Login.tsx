import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Key, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('officer@satyashield.demo');
  const [password, setPassword] = useState<string>('Officer@123');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role: 'OFFICER' | 'ADMIN') => {
    if (role === 'OFFICER') {
      setEmail('officer@satyashield.demo');
      setPassword('Officer@123');
    } else {
      setEmail('admin@satyashield.demo');
      setPassword('Admin@123');
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1e] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Grid & Security Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <h2 className="text-2xl font-extrabold text-white tracking-wide">SatyaShield</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40">
              AI
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            AI-Powered Identity & Document Screening for Smarter, Safer Verification
          </p>
          <p className="text-[11px] text-blue-400/80 font-mono">
            Truth in Every Identity. Security in Every Verification.
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-7 bg-slate-900/90 border border-slate-800 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <div className="mb-5 pb-3 border-b border-slate-800 text-center">
            <h3 className="text-sm font-bold text-white">Welcome to SatyaShield</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Sign in to access forensic screening terminal</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Officer / Admin Email
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="name@satyashield.demo"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Security Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md hover:shadow-blue-500/25 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              SIH Demo Accounts (1-Click Fill)
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillCredentials('OFFICER')}
                className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-left transition-colors text-xs"
              >
                <div className="flex items-center text-blue-400 font-bold mb-0.5">
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Officer Demo
                </div>
                <div className="text-[10px] text-slate-400 truncate">officer@satyashield.demo</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('ADMIN')}
                className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-left transition-colors text-xs"
              >
                <div className="flex items-center text-amber-400 font-bold mb-0.5">
                  <Key className="w-3.5 h-3.5 mr-1" />
                  Admin Demo
                </div>
                <div className="text-[10px] text-slate-400 truncate">admin@satyashield.demo</div>
              </button>
            </div>
          </div>
        </div>

        {/* Prototype Transparency Notice */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          SatyaShield • Decision-Support Prototype • Smart India Hackathon Presentation Edition
        </p>
      </div>
    </div>
  );
};
