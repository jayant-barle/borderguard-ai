import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  ScanFace,
  Layers,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { DashboardMetrics } from '../../../shared/types';
import { RiskBadge, StatusBadge } from '../components/ui/Badge';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.analytics.getDashboard();
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Failed to retrieve dashboard metrics from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !metrics) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Loading security operations metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* Top Welcome & Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Live Threat & Identity Monitor
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            SatyaShield Security Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI-Powered Identity & Document Screening for Smarter, Safer Verification. Real-time biometric forensics, MRZ validation, and risk scoring.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/verify')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New Verification</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards (6 Real Computed Values from Database) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Screened */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Screened</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {metrics?.totalScreened || 0}
          </div>
          <p className="text-[10px] text-slate-400">Archived inspection sessions</p>
        </div>

        {/* 2. Verified (Low Risk) */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono">
            {metrics?.verifiedCount || 0}
          </div>
          <p className="text-[10px] text-emerald-600/80 font-medium">
            {metrics?.lowRiskPercentage || 0}% of all screenings
          </p>
        </div>

        {/* 3. Suspicious (Medium Risk) */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Suspicious</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 font-mono">
            {metrics?.suspiciousCount || 0}
          </div>
          <p className="text-[10px] text-amber-600/80 font-medium">Officer review advised</p>
        </div>

        {/* 4. High Risk / Flagged */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">High Risk</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 font-mono">
            {metrics?.highRiskCount || 0}
          </div>
          <p className="text-[10px] text-rose-600/80 font-medium">Manual review mandatory</p>
        </div>

        {/* 5. Tampering Detected */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tampering</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {metrics?.tamperingCount || 0}
          </div>
          <p className="text-[10px] text-slate-400">Photo alterations detected</p>
        </div>

        {/* 6. Face Mismatch */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Face Mismatch</span>
            <ScanFace className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {metrics?.faceMismatchCount || 0}
          </div>
          <p className="text-[10px] text-slate-400">Biometric deviations</p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily Verification Trend Area Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Screening Volume & Risk Trend (Past 7–14 Days)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Dynamic DB Logs</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics?.dailyTrends || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lowRiskColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="medRiskColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="highRiskColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#totalColor)"
                  name="Total Screened"
                  dot={{ r: 3, fill: '#3b82f6' }}
                />
                <Area
                  type="monotone"
                  dataKey="lowRisk"
                  stroke="#10b981"
                  strokeWidth={1.8}
                  fillOpacity={1}
                  fill="url(#lowRiskColor)"
                  name="Low Risk (Verified)"
                  dot={{ r: 2, fill: '#10b981' }}
                />
                <Area
                  type="monotone"
                  dataKey="mediumRisk"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  fillOpacity={1}
                  fill="url(#medRiskColor)"
                  name="Medium Risk (Suspicious)"
                  dot={{ r: 2, fill: '#f59e0b' }}
                />
                <Area
                  type="monotone"
                  dataKey="highRisk"
                  stroke="#ef4444"
                  strokeWidth={1.8}
                  fillOpacity={1}
                  fill="url(#highRiskColor)"
                  name="High Risk (Flagged)"
                  dot={{ r: 2, fill: '#ef4444' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Risk Tier Distribution
          </h4>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.riskDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(metrics?.riskDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {(metrics?.riskDistribution || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Verifications & High-Risk Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Verifications (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Identity Screenings
            </h4>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics?.recentVerifications && metrics.recentVerifications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Holder / Document</th>
                    <th className="pb-2">Officer</th>
                    <th className="pb-2">Risk Level</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentVerifications.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      onClick={() => navigate(`/report/${v.id}`, { state: { result: v } })}
                    >
                      <td className="py-2.5 font-mono text-[11px] text-slate-600 font-semibold">
                        {v.id}
                      </td>
                      <td className="py-2.5">
                        <p className="font-bold text-slate-900">{v.holderName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {v.documentType} • {v.documentNumber}
                        </p>
                      </td>
                      <td className="py-2.5 text-slate-600">{v.officerName}</td>
                      <td className="py-2.5">
                        <RiskBadge level={v.risk.level} score={v.risk.score} size="sm" />
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={v.risk.status} />
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-blue-600 font-semibold hover:underline">Report →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No verification sessions recorded yet. Start your first screening!
            </div>
          )}
        </div>

        {/* Latest High-Risk Alerts (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Latest High-Risk Incidents
            </h4>
          </div>

          {metrics?.latestHighRiskCases && metrics.latestHighRiskCases.length > 0 ? (
            <div className="space-y-3">
              {metrics.latestHighRiskCases.map((hr) => (
                <div
                  key={hr.id}
                  onClick={() => navigate(`/report/${hr.id}`, { state: { result: hr } })}
                  className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/80 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-950 truncate max-w-[160px]">
                      {hr.holderName}
                    </span>
                    <RiskBadge level={hr.risk.level} score={hr.risk.score} size="sm" />
                  </div>
                  <p className="text-[10px] text-rose-800 line-clamp-2">
                    {hr.tampering.detected ? '🚨 Photo substitution anomaly detected. ' : ''}
                    {hr.risk.recommendedAction}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono pt-1 flex justify-between">
                    <span>{hr.documentNumber}</span>
                    <span>{new Date(hr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-emerald-600 bg-emerald-50/40 rounded-xl border border-emerald-100 p-4">
              <ShieldCheck className="w-6 h-6 mx-auto mb-1.5 text-emerald-600" />
              <p className="font-semibold">No high-risk violations flagged recently.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
