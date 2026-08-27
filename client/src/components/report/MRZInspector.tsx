import React from 'react';
import { MRZResult } from '../../../../shared/types';
import { Binary, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface MRZInspectorProps {
  mrz: MRZResult;
}

export const MRZInspector: React.FC<MRZInspectorProps> = ({ mrz }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Binary className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            ICAO 9303 Machine Readable Zone (MRZ)
          </h4>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
            {mrz.format}
          </span>
        </div>

        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            mrz.overallStatus === 'PASSED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {mrz.overallStatus === 'PASSED' ? '✓ MRZ VALIDATED' : '⚠ MRZ ANOMALY'}
        </span>
      </div>

      {/* Raw MRZ OCR Lines Viewport */}
      <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs sm:text-sm tracking-widest leading-loose overflow-x-auto shadow-inner border border-slate-800">
        {mrz.mrzLines.map((line, idx) => (
          <div key={idx} className="whitespace-pre">
            {line}
          </div>
        ))}
      </div>

      {/* Checksum Validation Cards */}
      <div>
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Mathematical Check Digit Verification (Weights: 7, 3, 1)
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {mrz.checksums.map((cs, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border ${
                cs.valid
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold">{cs.name}</span>
                {cs.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <p className="text-[10px] text-slate-600 truncate">{cs.field}</p>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold mt-1">
                <span>Expected: {cs.expected}</span>
                <span>•</span>
                <span className={cs.valid ? 'text-emerald-700' : 'text-rose-700'}>
                  Computed: {cs.computed}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Verification: MRZ vs Visual Zone OCR Table */}
      {mrz.fieldMatches && mrz.fieldMatches.length > 0 && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            ICAO MRZ Line vs Visual Zone OCR Cross-Check
          </h5>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100/80 text-[10px] uppercase text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Field</th>
                  <th className="py-2 px-3">Visual Zone OCR</th>
                  <th className="py-2 px-3">MRZ Line Value</th>
                  <th className="py-2 px-3 text-right">Alignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {mrz.fieldMatches.map((fm, idx) => (
                  <tr key={idx} className={fm.matches ? 'hover:bg-slate-50' : 'bg-rose-50/60 hover:bg-rose-50'}>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-700">{fm.field}</td>
                    <td className="py-2 px-3 text-slate-800 font-bold">{fm.ocrValue || '—'}</td>
                    <td className="py-2 px-3 text-slate-800 font-bold">{fm.mrzValue || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      {fm.matches ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" /> Mismatch
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
