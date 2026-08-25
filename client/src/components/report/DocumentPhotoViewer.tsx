import React from 'react';
import { FaceVerificationResult } from '../../../../shared/types';
import { ScanFace, UserCheck, AlertTriangle, ShieldCheck, Camera } from 'lucide-react';

interface DocumentPhotoViewerProps {
  documentImage: string;
  faceVerification: FaceVerificationResult;
  holderName: string;
  documentNumber: string;
}

export const DocumentPhotoViewer: React.FC<DocumentPhotoViewerProps> = ({
  documentImage,
  faceVerification,
  holderName,
  documentNumber
}) => {
  const isMatch = faceVerification.consistency === 'LIKELY_MATCH';
  const score = faceVerification.similarityScore;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
          <ScanFace className="w-4 h-4 mr-1.5 text-blue-600" />
          Optical Specimen & Biometric Comparison
        </h4>
        <span className="text-[10px] text-slate-500 font-mono">
          Doc: {documentNumber}
        </span>
      </div>

      {/* Main Document Image & Photo Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Scanned Document Viewport (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
            <span>Primary Scanned Document Specimen</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              High Resolution
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-950/90 aspect-16/10 flex items-center justify-center p-2 relative shadow-inner">
            <img
              src={documentImage}
              alt="Scanned Document"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>

        {/* Biometric Face Comparison (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-[11px] font-bold text-slate-600">
            Biometric Facial Consistency Match
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Extracted Face */}
            <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-center space-y-2">
              <div className="aspect-square rounded-lg overflow-hidden border border-slate-300 bg-white flex items-center justify-center relative">
                {faceVerification.extractedFaceUrl ? (
                  <img
                    src={faceVerification.extractedFaceUrl}
                    alt="Extracted Face"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400" />
                )}
                {/* Facial mesh points */}
                <div className="absolute inset-0 border border-blue-400/40 rounded-lg pointer-events-none" />
              </div>
              <p className="text-[10px] font-bold text-slate-700 uppercase">Extracted Photo</p>
            </div>

            {/* Database Reference Face */}
            <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-center space-y-2">
              <div className="aspect-square rounded-lg overflow-hidden border border-slate-300 bg-white flex items-center justify-center relative">
                {faceVerification.databaseFaceUrl ? (
                  <img
                    src={faceVerification.databaseFaceUrl}
                    alt="Database Reference Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCheck className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-700 uppercase">Central Registry</p>
            </div>
          </div>

          {/* Similarity Gauge Bar */}
          <div className="p-3 rounded-xl border bg-slate-50/80 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-700">Biometric Similarity</span>
              <span
                className={`font-mono ${
                  score > 80 ? 'text-emerald-700' : score > 55 ? 'text-amber-700' : 'text-rose-700'
                }`}
              >
                {score}%
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  score > 80 ? 'bg-emerald-500' : score > 55 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>

            <div className="flex items-center space-x-1.5 pt-1">
              {isMatch ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span
                className={`text-[11px] font-bold ${
                  isMatch ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {isMatch ? 'Likely Match (Verified)' : 'Possible Face Mismatch / Substituted Portrait'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
