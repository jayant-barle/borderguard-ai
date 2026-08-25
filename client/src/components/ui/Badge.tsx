import React from 'react';
import { RiskLevel, FinalStatus, DocumentStatus } from '../../../../shared/types';
import { ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, showIcon = true, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-sm px-3.5 py-1.5 font-extrabold'
  };

  if (level === 'LOW') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs ${sizeClasses[size]}`}
      >
        {showIcon && <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />}
        LOW RISK {score !== undefined ? `(${score}/100)` : ''}
      </span>
    );
  }

  if (level === 'MEDIUM') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs ${sizeClasses[size]}`}
      >
        {showIcon && <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />}
        MEDIUM RISK {score !== undefined ? `(${score}/100)` : ''}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse-subtle ${sizeClasses[size]}`}
    >
      {showIcon && <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600 shrink-0" />}
      HIGH RISK {score !== undefined ? `(${score}/100)` : ''}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: FinalStatus | string }> = ({ status }) => {
  if (status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
        VERIFIED
      </span>
    );
  }

  if (status === 'SUSPICIOUS') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
        <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
        SUSPICIOUS
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
      <ShieldAlert className="w-3 h-3 mr-1 text-rose-600" />
      REQUIRES MANUAL REVIEW
    </span>
  );
};

export const DocumentStatusBadge: React.FC<{ status: DocumentStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    EXPIRED: 'bg-slate-100 text-slate-700 border-slate-300',
    SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
    BLACKLISTED: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    SUSPICIOUS: 'bg-orange-50 text-orange-700 border-orange-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};
