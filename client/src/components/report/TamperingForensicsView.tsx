import React from 'react';
import { TamperingResult } from '../../../../shared/types';
import { ShieldAlert, ShieldCheck, AlertTriangle, Cpu, Layers } from 'lucide-react';

interface TamperingForensicsViewProps {
  tampering: TamperingResult;
}

export const TamperingForensicsView: React.FC<TamperingForensicsViewProps> = ({ tampering }) => {
  const isTampered = tampering.detected;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Document Tampering & Digital Forensics Analysis
          </h4>
        </div>
        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
          DEMO DETECTION ENGINE
        </span>
      </div>

      {/* Summary Alert */}
      <div
        className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isTampered
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        {isTampered ? (
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        )}
        <div className="text-xs">
          <p className="font-bold">{tampering.summary}</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            Forensic Confidence:{' '}
            <strong className="font-mono">{tampering.confidence}%</strong> • Classification Type:{' '}
            <strong>{tampering.type}</strong>
          </p>
        </div>
      </div>

      {/* Forensic Signal Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tampering.indicators.map((ind, idx) => {
          const isFlagged = ind.detected || ind.score > 50;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all ${
                isFlagged
                  ? 'bg-rose-50/40 border-rose-200 text-rose-950 shadow-2xs'
                  : 'bg-slate-50/60 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">{ind.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isFlagged
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isFlagged ? `ANOMALY (${ind.score}%)` : `NORMAL (${ind.score}%)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{ind.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
