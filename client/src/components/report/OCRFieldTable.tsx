import React from 'react';
import { OCRResult } from '../../../../shared/types';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface OCRFieldTableProps {
  ocr: OCRResult;
}

export const OCRFieldTable: React.FC<OCRFieldTableProps> = ({ ocr }) => {
  const fields = Object.values(ocr.fields);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
          <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
          OCR Field Extraction & Confidence
        </h4>
        <span className="text-[11px] font-semibold text-slate-600">
          Overall OCR Confidence:{' '}
          <strong className="text-emerald-700 font-mono">{ocr.confidence}%</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {fields.map((f) => {
          const isHighConf = f.confidence >= 90;
          return (
            <div
              key={f.name}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {f.label}
                </span>
                {f.validated ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-900 font-mono truncate">{f.value}</p>
              <div className="flex items-center space-x-2 pt-1">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isHighConf ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${f.confidence}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-600 font-semibold">
                  {f.confidence}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
