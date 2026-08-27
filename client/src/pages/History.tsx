import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VerificationResult } from '../../../shared/types';
import { api } from '../services/api';
import { RiskBadge, StatusBadge } from '../components/ui/Badge';
import {
  History as HistoryIcon,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  ArrowUpDown,
  ExternalLink,
  Trash2,
  Layers,
  Table as TableIcon,
  Timer
} from 'lucide-react';

type DateFilterOption = 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export const History: React.FC = () => {
  const [records, setRecords] = useState<VerificationResult[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [clearing, setClearing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [riskLevel, setRiskLevel] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [documentType, setDocumentType] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GROUPED'>('TABLE');

  const navigate = useNavigate();

  // Calculate start & end date strings based on active filter
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (dateFilter === 'TODAY') {
      const t = formatYMD(today);
      return { startDate: t, endDate: t };
    }
    if (dateFilter === 'YESTERDAY') {
      const y = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yStr = formatYMD(y);
      return { startDate: yStr, endDate: yStr };
    }
    if (dateFilter === 'WEEK') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: formatYMD(weekAgo), endDate: formatYMD(today) };
    }
    if (dateFilter === 'MONTH') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: formatYMD(monthAgo), endDate: formatYMD(today) };
    }
    if (dateFilter === 'CUSTOM') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateFilter, customStartDate, customEndDate]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.verification.getHistory({
        search: search.trim() || undefined,
        riskLevel: riskLevel !== 'ALL' ? riskLevel : undefined,
        status: status !== 'ALL' ? status : undefined,
        documentType: documentType !== 'ALL' ? documentType : undefined,
        startDate,
        endDate
      });

      // Apply sorting by timestamp
      const sorted = [...res.records].sort((a, b) => {
        const timeA = new Date(a.timestamp || (a as any).createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || (b as any).createdAt || 0).getTime();
        return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
      });

      setRecords(sorted);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [search, riskLevel, status, documentType, startDate, endDate, sortOrder]);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all verification history archives? This action cannot be undone.')) {
      return;
    }
    setClearing(true);
    try {
      await api.verification.clearHistory();
      setRecords([]);
      setTotal(0);
    } catch (err: any) {
      alert(err.message || 'Failed to clear verification history.');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  // Safe timestamp parser ensuring UTC strings map to accurate local time
  const parseSafeDate = (isoStr?: string): Date => {
    if (!isoStr) return new Date();
    let str = String(isoStr).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
      str = str + 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Helper date/time formatters
  const formatVerificationDate = (isoStr?: string) => {
    if (!isoStr) return { dateStr: 'N/A', isToday: false, isYesterday: false };
    const date = parseSafeDate(isoStr);

    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = date.toLocaleDateString(undefined, options);

    return { dateStr, isToday, isYesterday, rawDate: date };
  };

  const formatVerificationTime = (isoStr?: string) => {
    if (!isoStr) return { timeStr: 'N/A', relativeStr: '' };
    const date = parseSafeDate(isoStr);

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Relative time
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    let relativeStr = '';
    if (diffSecs < 45) relativeStr = 'Just now';
    else if (diffMins < 60) relativeStr = `${diffMins}m ago`;
    else if (diffHours < 24) relativeStr = `${diffHours}h ago`;
    else if (diffDays === 1) relativeStr = 'Yesterday';
    else relativeStr = `${diffDays}d ago`;

    return { timeStr, relativeStr };
  };

  // Group records by calendar day for Grouped View
  const groupedRecords = useMemo(() => {
    const map = new Map<string, VerificationResult[]>();
    for (const r of records) {
      const iso = r.timestamp || (r as any).createdAt;
      const { dateStr, isToday, isYesterday } = formatVerificationDate(iso);
      const groupKey = isToday ? `Today (${dateStr})` : isYesterday ? `Yesterday (${dateStr})` : dateStr;

      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(r);
    }
    return Array.from(map.entries());
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Audit & Verification Archives
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Verification Records & Timing Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable database records with precise timestamp auditing and date-time navigation.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {records.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors disabled:opacity-50"
              title="Clear all verification history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{clearing ? 'Clearing...' : 'Clear History'}</span>
            </button>
          )}

          <button
            onClick={loadHistory}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date & Time Navigation Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Timeline:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'WEEK', label: 'Past 7 Days' },
              { id: 'MONTH', label: 'Past 30 Days' },
              { id: 'CUSTOM', label: 'Custom Range' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as DateFilterOption)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode & Sort Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'TABLE' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                }`}
                title="Continuous Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('GROUPED')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'GROUPED' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                }`}
                title="Grouped by Date"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Group by Date</span>
              </button>
            </div>

            <button
              onClick={() => setSortOrder((s) => (s === 'DESC' ? 'ASC' : 'DESC'))}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              title="Toggle Chronological Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Inputs (Conditional) */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
            <span className="text-xs font-bold text-blue-900">Custom Date Span:</span>
            <div className="flex items-center space-x-2">
              <label className="text-[11px] font-semibold text-slate-600">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-[11px] font-semibold text-slate-600">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, document number, or verification ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

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

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Main Records Content (Table View vs Grouped View) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span>Querying verified identity records...</span>
          </div>
        ) : records.length > 0 ? (
          viewMode === 'TABLE' ? (
            /* Continuous Table Mode */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="py-3.5 px-4">Verification ID</th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>Date Verified</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-purple-600" />
                        <span>Exact Time</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">Traveler / Document</th>
                    <th className="py-3.5 px-4">Officer</th>
                    <th className="py-3.5 px-4">Risk Assessment</th>
                    <th className="py-3.5 px-4">Final Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => {
                    const iso = r.timestamp || (r as any).createdAt;
                    const { dateStr, isToday } = formatVerificationDate(iso);
                    const { timeStr, relativeStr } = formatVerificationTime(iso);

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/report/${r.id}`, { state: { result: r } })}
                      >
                        {/* 1. Verification ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {r.id}
                        </td>

                        {/* 2. Verification Date Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isToday
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isToday ? 'Today' : dateStr}
                            </span>
                            {!isToday && <span className="text-[10px] text-slate-400 font-mono">({dateStr})</span>}
                          </div>
                        </td>

                        {/* 3. Verification Exact Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                              {timeStr}
                            </span>
                            {relativeStr && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                {relativeStr}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Traveler & Document */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 max-w-[180px] truncate">
                              {r.holderName}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              <span className="font-semibold text-blue-700">{r.documentType}: </span>
                              {r.documentNumber}
                            </div>
                          </div>
                        </td>

                        {/* 5. Officer */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-700 font-medium text-xs">{r.officerName}</div>
                          {r.officerBadge && (
                            <span className="text-[9px] font-mono text-slate-400">{r.officerBadge}</span>
                          )}
                        </td>

                        {/* 6. Risk Tier */}
                        <td className="py-3.5 px-4">
                          <RiskBadge level={r.risk.level} score={r.risk.score} size="sm" />
                        </td>

                        {/* 7. Final Status */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={r.risk.status} />
                        </td>

                        {/* 8. Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grouped by Date Mode */
            <div className="divide-y divide-slate-200">
              {groupedRecords.map(([dateGroup, groupItems]) => (
                <div key={dateGroup} className="p-4 space-y-3">
                  {/* Date Section Header */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {dateGroup}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      {groupItems.length} {groupItems.length === 1 ? 'Verification' : 'Verifications'}
                    </span>
                  </div>

                  {/* Sessions within this date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupItems.map((r) => {
                      const iso = r.timestamp || (r as any).createdAt;
                      const { timeStr, relativeStr } = formatVerificationTime(iso);

                      return (
                        <div
                          key={r.id}
                          onClick={() => navigate(`/report/${r.id}`, { state: { result: r } })}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-mono text-xs font-bold text-slate-800">{r.id}</span>
                            <div className="flex items-center space-x-1 text-slate-500 font-mono text-[10px]">
                              <Clock className="w-3 h-3 text-purple-600" />
                              <span className="font-bold text-slate-700">{timeStr}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-xs text-slate-900">{r.holderName}</div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {r.documentType}: {r.documentNumber}
                              </div>
                            </div>
                            <RiskBadge level={r.risk.level} score={r.risk.score} size="sm" />
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                            <span>Officer: {r.officerName}</span>
                            <span className="font-bold text-blue-600 flex items-center space-x-0.5 hover:underline">
                              <span>Dossier</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <HistoryIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No verification records found for selected period.</p>
            <p className="text-slate-400 text-[11px]">
              Try selecting "All Time" on the timeline filter or adjusting your search parameters.
            </p>
          </div>
        )}

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Timer className="w-4 h-4 text-blue-600" />
            <span>
              Showing <strong>{records.length}</strong> of <strong>{total}</strong> verified timeline records
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Persistent SQLite Time Series Engine
          </span>
        </div>
      </div>
    </div>
  );
};
