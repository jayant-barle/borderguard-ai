import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoBanner } from './components/layout/DemoBanner';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewVerification } from './pages/NewVerification';
import { VerificationReport } from './pages/VerificationReport';
import { History } from './pages/History';
import { Analytics } from './pages/Analytics';

import { UsersManagement } from './pages/admin/UsersManagement';
import { MockDocuments } from './pages/admin/MockDocuments';
import { RiskSettings } from './pages/admin/RiskSettings';
import { AuditLogs } from './pages/admin/AuditLogs';
import { NotFound } from './pages/NotFound';

// Protected Layout Route
const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <span className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-400">Verifying security clearances...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Transparent Hackathon Demo Banner */}
      <DemoBanner />

      <div className="flex-1 flex">
        {/* Dark Navy Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
          <footer className="py-3 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-700">
              SatyaShield: AI-powered document screening and identity verification for smarter and more informed security decisions.
            </p>
            <p className="text-[10px] text-slate-400">
              Prototype / Decision-Support System • Truth in Every Identity. Security in Every Verification.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

// Admin Guard
const AdminGuard: React.FC = () => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/verify" element={<NewVerification />} />
            <Route path="/report/:id" element={<VerificationReport />} />
            <Route path="/history" element={<History />} />
            <Route path="/analytics" element={<Analytics />} />

            {/* Admin Only Routes */}
            <Route element={<AdminGuard />}>
              <Route path="/admin/users" element={<UsersManagement />} />
              <Route path="/admin/documents" element={<MockDocuments />} />
              <Route path="/admin/risk-settings" element={<RiskSettings />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
