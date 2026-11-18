import React from 'react';
import { TamperingResult } from '../../../../shared/types';
import { ShieldAlert, ShieldCheck, AlertTriangle, Layers } from 'lucide-react';

interface TamperingForensicsViewProps {
  tampering: TamperingResult;
}

export const TamperingForensicsView: React.FC<TamperingForensicsViewProps> = ({ tampering }) => {
  const isError = tampering.status === 'ERROR';
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
        {isError ? (
          <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
            FAIL CLOSED (ERROR)
          </span>
        ) : (
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
            FORENSIC DETECTION ENGINE
          </span>
        )}
      </div>

      {/* Summary Alert */}
      <div
        className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isError
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : isTampered
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        {isError ? (
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
        ) : isTampered ? (
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        )}
        <div className="text-xs">
          <p className="font-bold">{tampering.summary}</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            Forensic Confidence:{' '}
            <strong className="font-mono">
              {tampering.confidence !== null ? `${tampering.confidence}%` : 'N/A (Analysis Error)'}
            </strong>{' '}
            • Classification Type: <strong>{isError ? 'ANALYSIS_ERROR' : tampering.type}</strong>
          </p>
        </div>
      </div>

      {/* Forensic Signal Breakdown */}
      {isError && tampering.indicators.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 text-center text-xs text-rose-800">
          <p className="font-bold">Automated Forensic Scanning Incomplete</p>
          <p className="text-[11px] text-rose-700 mt-1">
            The image could not be processed by automated optical forensics. As a security precaution, this check fails closed and requires manual secondary review.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
};
