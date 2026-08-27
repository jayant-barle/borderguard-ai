import React, { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '../../../../shared/types';
import { api } from '../../services/api';
import { ScrollText, RefreshCw, Filter } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAuditLogs({
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        limit: 100
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{action}</span>;
    }
    if (action.includes('VERIFICATION')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{action}</span>;
    }
    if (action.includes('RISK') || action.includes('SYSTEM')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <ScrollText className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
              Security Compliance & Audit
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">System Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological logging of all officer inspections, authentication events, and administrative changes.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 self-start sm:self-auto"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-1.5 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 font-semibold"
          >
            <option value="ALL">All Recorded Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_LOGOUT">USER_LOGOUT</option>
            <option value="VERIFICATION_SAVED">VERIFICATION_SAVED</option>
            <option value="DOCUMENT_CREATED">DOCUMENT_CREATED</option>
            <option value="DOCUMENT_UPDATED">DOCUMENT_UPDATED</option>
            <option value="RISK_CONFIG_UPDATED">RISK_CONFIG_UPDATED</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Total Log Events: <strong>{total}</strong>
        </span>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span>Querying security logs...</span>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Officer / User</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Details & Rationale</th>
                  <th className="py-3 px-4">Origin IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{l.id}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {(() => {
                        let s = String(l.createdAt || '').trim();
                        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T') + 'Z';
                        else if (!s.endsWith('Z') && !s.includes('+') && s.includes('T')) s = s + 'Z';
                        const d = new Date(s);
                        return isNaN(d.getTime()) ? l.createdAt : d.toLocaleString();
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{l.userName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{l.userRole}</p>
                    </td>
                    <td className="py-3 px-4">{getActionBadge(l.action)}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 text-[11px]">
                      {l.entityType} ({l.entityId})
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-[11px] leading-relaxed max-w-xs">
                      {l.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{l.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400">
            No audit log records matching the filter.
          </div>
        )}
      </div>
    </div>
  );
};
