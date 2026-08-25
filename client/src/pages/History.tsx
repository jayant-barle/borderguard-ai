import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VerificationResult, RiskLevel } from '../../../shared/types';
import { api } from '../services/api';
import { RiskBadge, StatusBadge } from '../components/ui/Badge';
import {
  History as HistoryIcon,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

export const History: React.FC = () => {
  const [records, setRecords] = useState<VerificationResult[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [riskLevel, setRiskLevel] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [documentType, setDocumentType] = useState<string>('ALL');

  const navigate = useNavigate();

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.verification.getHistory({
        search: search.trim() || undefined,
        riskLevel: riskLevel !== 'ALL' ? riskLevel : undefined,
        status: status !== 'ALL' ? status : undefined,
        documentType: documentType !== 'ALL' ? documentType : undefined
      });
      setRecords(res.records);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [riskLevel, status, documentType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Audit & Verification Archives
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Verification Records</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable database records of all identity screenings, optical inspections, and risk signals.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors self-start sm:self-auto"
          title="Refresh Table"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box (5 cols) */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by holder name, passport # or verification ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Risk Level Filter (3 cols) */}
          <div className="sm:col-span-3">
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-700 font-semibold"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="LOW">Low Risk Only</option>
              <option value="MEDIUM">Medium Risk Only</option>
              <option value="HIGH">High Risk Only</option>
            </select>
          </div>

          {/* Status Filter (2 cols) */}
          <div className="sm:col-span-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-700 font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="REQUIRES_MANUAL_REVIEW">Manual Review</option>
            </select>
          </div>

          {/* Search Submit Button (2 cols) */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Filter Records
            </button>
          </div>
        </form>
      </div>

      {/* History Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span>Querying verification database...</span>
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Verification ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Holder Name</th>
                  <th className="py-3 px-4">Document / Number</th>
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">Risk Tier</th>
                  <th className="py-3 px-4">Final Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    onClick={() => navigate(`/report/${r.id}`, { state: { result: r } })}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {r.id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 truncate max-w-[180px]">
                      {r.holderName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <span className="font-semibold text-slate-500">{r.documentType}: </span>
                      {r.documentNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {r.officerName}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={r.risk.level} score={r.risk.score} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.risk.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/report/${r.id}`, { state: { result: r } });
                        }}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                      >
                        <span>Dossier</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <HistoryIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No verification records found.</p>
            <p className="text-slate-400 text-[11px]">
              Try adjusting your search criteria or perform a new verification.
            </p>
          </div>
        )}

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Displaying <strong>{records.length}</strong> of <strong>{total}</strong> verified records
          </span>
          <span className="font-mono text-[11px]">SQLite Persistent Store</span>
        </div>
      </div>
    </div>
  );
};
