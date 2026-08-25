import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  ScanFace,
  History,
  BarChart3,
  Users,
  FileText,
  Sliders,
  ScrollText,
  LogOut,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-xs'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0a1128] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 bg-[#070d1e]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base tracking-wide text-white">SatyaShield</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">AI-Powered Identity Verification</p>
            </div>
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {/* Main Inspection Area */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Operations
            </div>
            <nav className="space-y-1">
              <NavLink to="/dashboard" className={navClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4 mr-3 text-slate-400" />
                Dashboard
              </NavLink>
              <NavLink to="/verify" className={navClass} onClick={onClose}>
                <ScanFace className="w-4 h-4 mr-3 text-blue-400" />
                New Verification
              </NavLink>
              <NavLink to="/history" className={navClass} onClick={onClose}>
                <History className="w-4 h-4 mr-3 text-slate-400" />
                Verification History
              </NavLink>
              <NavLink to="/analytics" className={navClass} onClick={onClose}>
                <BarChart3 className="w-4 h-4 mr-3 text-slate-400" />
                Analytics & Trends
              </NavLink>
            </nav>
          </div>

          {/* Administration Section */}
          {isAdmin ? (
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
                <span>Administration</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold">
                  ADMIN
                </span>
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin/users" className={navClass} onClick={onClose}>
                  <Users className="w-4 h-4 mr-3 text-amber-400/80" />
                  User Management
                </NavLink>
                <NavLink to="/admin/documents" className={navClass} onClick={onClose}>
                  <FileText className="w-4 h-4 mr-3 text-amber-400/80" />
                  Mock Documents Registry
                </NavLink>
                <NavLink to="/admin/risk-settings" className={navClass} onClick={onClose}>
                  <Sliders className="w-4 h-4 mr-3 text-amber-400/80" />
                  Risk Engine Settings
                </NavLink>
                <NavLink to="/admin/audit-logs" className={navClass} onClick={onClose}>
                  <ScrollText className="w-4 h-4 mr-3 text-amber-400/80" />
                  Audit Logs
                </NavLink>
              </nav>
            </div>
          ) : (
            <div className="px-3 py-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center text-slate-300 font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Officer Clearance
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Authorized for live identity screening, biometric analysis, and historical records inspection.
              </p>
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070d1e]">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                <UserCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Officer'}</p>
                <p className="text-[10px] text-slate-400 flex items-center">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${user?.role === 'ADMIN' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  {user?.role} {user?.badge_number ? `(${user.badge_number})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
