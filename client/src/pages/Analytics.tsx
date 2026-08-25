import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Layers,
  ScanFace,
  RefreshCw,
  Calendar,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import { DashboardMetrics } from '../../../shared/types';

export const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.analytics.getDashboard();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Generating analytics intelligence...</p>
      </div>
    );
  }

  const detectionRates = [
    { name: 'Low Risk Verification', rate: metrics.lowRiskPercentage, color: '#10b981' },
    { name: 'Suspicious Document Rate', rate: metrics.mediumRiskPercentage, color: '#f59e0b' },
    { name: 'High-Risk Flagging Rate', rate: metrics.highRiskPercentage, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            Forensic Intelligence & Telemetry
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-1">
          Operational Security Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time aggregated detection rates, anomaly patterns, and inspection volume dynamics.
        </p>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Inspections
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {metrics.totalScreened}
          </div>
          <p className="text-[10px] text-slate-500">Database verified records</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Avg Pipeline Latency
          </span>
          <div className="text-2xl font-extrabold text-blue-600 font-mono">
            {metrics.avgProcessingTimeMs} ms
          </div>
          <p className="text-[10px] text-slate-500">8-stage automated screening</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tampering Interceptions
          </span>
          <div className="text-2xl font-extrabold text-rose-600 font-mono">
            {metrics.tamperingCount}
          </div>
          <p className="text-[10px] text-slate-500">Photo substitution flags</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Biometric Mismatches
          </span>
          <div className="text-2xl font-extrabold text-purple-600 font-mono">
            {metrics.faceMismatchCount}
          </div>
          <p className="text-[10px] text-slate-500">Facial similarity anomalies</p>
        </div>
      </div>

      {/* Main Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Screening Dynamics */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1.5 text-blue-600" />
            Verification Volume & Risk Breakdown Over Time
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="anLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="anHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
                <Area type="monotone" dataKey="lowRisk" stroke="#10b981" fill="url(#anLow)" name="Low Risk" />
                <Area type="monotone" dataKey="highRisk" stroke="#ef4444" fill="url(#anHigh)" name="High Risk" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Document Type Distribution Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <BarChart3 className="w-4 h-4 mr-1.5 text-blue-600" />
            Document Types Screened Distribution
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.documentTypeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Screenings Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detection Rate Breakdown Progress Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
          <Activity className="w-4 h-4 mr-1.5 text-blue-600" />
          System Threat Detection Rates
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {detectionRates.map((d, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-700">{d.name}</span>
                <span className="font-mono text-sm" style={{ color: d.color }}>
                  {d.rate}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${d.rate}%`, backgroundColor: d.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
