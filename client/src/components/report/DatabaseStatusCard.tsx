import React from 'react';
import { DatabaseVerificationResult } from '../../../../shared/types';
import { Database, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { DocumentStatusBadge } from '../ui/Badge';

interface DatabaseStatusCardProps {
  dbResult: DatabaseVerificationResult;
}

export const DatabaseStatusCard: React.FC<DatabaseStatusCardProps> = ({ dbResult }) => {
  const isFound = dbResult.recordFound;
  const isActive = dbResult.status === 'ACTIVE';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Central Government Registry Verification
          </h4>
        </div>
        <DocumentStatusBadge status={dbResult.status} />
      </div>

      <div
        className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isActive
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : isFound
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}
      >
        {isActive ? (
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : isFound ? (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
        )}
        <div className="text-xs">
          <p className="font-bold">{dbResult.summary}</p>
        </div>
      </div>

      {dbResult.matchedDocument && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Registered Name</span>
            <p className="font-bold text-slate-900">{dbResult.matchedDocument.holder_name}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Document Number</span>
            <p className="font-bold text-slate-900 font-mono">{dbResult.matchedDocument.document_number}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Nationality / State</span>
            <p className="font-bold text-slate-900">{dbResult.matchedDocument.nationality}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Registered Expiry</span>
            <p className="font-bold text-slate-900 font-mono">{dbResult.matchedDocument.expiry_date}</p>
          </div>
        </div>
      )}
    </div>
  );
};
