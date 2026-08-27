import React, { useState } from 'react';
import { OCRResult, MRZResult, DatabaseVerificationResult } from '../../../../shared/types';
import { FileText, CheckCircle2, AlertCircle, AlertTriangle, Database, Binary, ChevronDown, ChevronUp } from 'lucide-react';

interface OCRFieldTableProps {
  ocr?: OCRResult;
  mrz?: MRZResult;
  dbResult?: DatabaseVerificationResult;
}

export const OCRFieldTable: React.FC<OCRFieldTableProps> = ({ ocr, mrz, dbResult }) => {
  const [showRawText, setShowRawText] = useState(false);

  if (!ocr || !ocr.fields) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center text-slate-500 text-xs">
        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-slate-700">No OCR extraction data recorded for this session.</p>
      </div>
    );
  }

  const fields = Object.values(ocr.fields);
  const overallConfidence = typeof ocr.confidence === 'number' ? ocr.confidence : 90;

  // Cross-verification helper for field mismatches
  const getFieldCrossCheck = (fieldName: string, fieldValue: string) => {
    const val = (fieldValue || '').trim().toUpperCase();
    
    if (fieldName === 'documentNumber') {
      const mrzDoc = mrz?.documentNumber?.trim().toUpperCase();
      const dbDoc = dbResult?.matchedDocument?.document_number?.trim().toUpperCase();
      const mrzMatch = !mrzDoc || mrzDoc === val || mrzDoc.replace(/[^A-Z0-9]/g, '') === val.replace(/[^A-Z0-9]/g, '');
      const dbMatch = !dbDoc || dbDoc === val;
      return {
        mrzValue: mrzDoc,
        mrzMatch,
        dbValue: dbDoc,
        dbMatch,
        hasMismatch: !mrzMatch || (!dbMatch && dbResult?.recordFound)
      };
    }

    if (fieldName === 'fullName') {
      const dbName = dbResult?.matchedDocument?.holder_name?.trim().toUpperCase();
      const dbMatch = !dbName || dbName === val;
      return {
        dbValue: dbName,
        dbMatch,
        hasMismatch: !dbMatch && dbResult?.recordFound
      };
    }

    if (fieldName === 'dateOfBirth') {
      const mrzDob = mrz?.dateOfBirth;
      const dbDob = dbResult?.matchedDocument?.date_of_birth;
      const mrzMatch = !mrzDob || mrzDob === val || mrzDob.replace(/[-/]/g, '') === val.replace(/[-/]/g, '');
      const dbMatch = !dbDob || dbDob === val;
      return {
        mrzValue: mrzDob,
        mrzMatch,
        dbValue: dbDob,
        dbMatch,
        hasMismatch: !mrzMatch || (!dbMatch && dbResult?.recordFound)
      };
    }

    if (fieldName === 'expiryDate') {
      const mrzExp = mrz?.expiryDate;
      const dbExp = dbResult?.matchedDocument?.expiry_date;
      const mrzMatch = !mrzExp || mrzExp === val || mrzExp.replace(/[-/]/g, '') === val.replace(/[-/]/g, '');
      const dbMatch = !dbExp || dbExp === val;
      return {
        mrzValue: mrzExp,
        mrzMatch,
        dbValue: dbExp,
        dbMatch,
        hasMismatch: !mrzMatch || (!dbMatch && dbResult?.recordFound)
      };
    }

    return { hasMismatch: false };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
          <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
          OCR Visual Zone Field Extraction & Cross-Verification
        </h4>
        <span className="text-[11px] font-semibold text-slate-600">
          Overall OCR Confidence:{' '}
          <strong className="text-emerald-700 font-mono">{overallConfidence}%</strong>
        </span>
      </div>

      {/* Extracted Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {fields.map((f) => {
          const isHighConf = (f.confidence ?? 85) >= 90;
          const crossCheck = getFieldCrossCheck(f.name, f.value);
          const isInvalidOrMismatch = !f.validated || crossCheck.hasMismatch || f.mismatch;

          return (
            <div
              key={f.name || f.label}
              className={`p-3.5 rounded-xl border transition-all ${
                isInvalidOrMismatch
                  ? 'border-amber-200 bg-amber-50/40'
                  : 'border-slate-100 bg-slate-50/70'
              } space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {f.label}
                </span>
                {isInvalidOrMismatch ? (
                  <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                    Review
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    Verified
                  </span>
                )}
              </div>

              <p className="text-xs font-bold text-slate-900 font-mono truncate" title={f.value}>
                {f.value || '—'}
              </p>

              {/* Cross-Check Comparison Badges */}
              {(crossCheck.mrzValue || crossCheck.dbValue) && (
                <div className="space-y-1 pt-1 border-t border-slate-200/50 text-[10px] font-mono">
                  {crossCheck.mrzValue && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center gap-1">
                        <Binary className="w-2.5 h-2.5 text-blue-500" /> MRZ:
                      </span>
                      <span className={crossCheck.mrzMatch ? 'text-emerald-700 font-semibold truncate max-w-[100px]' : 'text-rose-600 font-bold truncate max-w-[100px]'}>
                        {crossCheck.mrzValue}
                      </span>
                    </div>
                  )}
                  {crossCheck.dbValue && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="flex items-center gap-1">
                        <Database className="w-2.5 h-2.5 text-indigo-500" /> DB:
                      </span>
                      <span className={crossCheck.dbMatch ? 'text-emerald-700 font-semibold truncate max-w-[100px]' : 'text-rose-600 font-bold truncate max-w-[100px]'}>
                        {crossCheck.dbValue}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Confidence Meter */}
              <div className="flex items-center space-x-2 pt-1">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isHighConf ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${f.confidence ?? 85}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-600 font-semibold">
                  {f.confidence ?? 85}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw OCR Text Section */}
      {ocr.rawText && (
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg bg-slate-50 hover:bg-slate-100"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Raw Optical Text Stream (VLM & Tesseract Pipeline)
            </span>
            {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRawText && (
            <pre className="mt-2 p-3.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
              {ocr.rawText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
