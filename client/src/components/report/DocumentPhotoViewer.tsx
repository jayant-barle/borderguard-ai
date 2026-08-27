import React, { useState } from 'react';
import { FaceVerificationResult } from '../../../../shared/types';
import { ScanFace, UserCheck, AlertTriangle, ShieldCheck, RotateCw, RotateCcw, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

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
  const [viewRotation, setViewRotation] = useState<number>(0);
  const [viewZoom, setViewZoom] = useState<number>(1);
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
          <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between h-7">
            <span>Primary Scanned Document Specimen</span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setViewRotation((r) => (r + 270) % 360)}
                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Rotate 90° Left"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewRotation((r) => (r + 90) % 360)}
                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Rotate 90° Right"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewZoom((z) => Math.min(2.5, z + 0.2))}
                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewZoom((z) => Math.max(0.6, z - 0.2))}
                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              {(viewRotation !== 0 || viewZoom !== 1) && (
                <button
                  type="button"
                  onClick={() => {
                    setViewRotation(0);
                    setViewZoom(1);
                  }}
                  className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Reset View"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-950/90 aspect-16/10 flex items-center justify-center p-2 relative shadow-inner">
            <img
              src={documentImage}
              alt="Scanned Document"
              className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
              style={{
                transform: `rotate(${viewRotation}deg) scale(${viewZoom})`
              }}
            />
            {viewRotation !== 0 && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-blue-400 border border-blue-500/30">
                Rotated {viewRotation}°
              </span>
            )}
          </div>
        </div>

        {/* Biometric Face Comparison (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between h-7">
            <span>Biometric Facial Consistency</span>
            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
              ICAO 9303 Face Match
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 items-stretch">
            {/* Extracted Face */}
            <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/80 text-center flex flex-col justify-between space-y-2">
              <div className="w-full h-44 sm:h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-900/[0.04] flex items-center justify-center relative p-1.5 shadow-inner">
                {faceVerification.extractedFaceUrl ? (
                  <>
                    <img
                      src={faceVerification.extractedFaceUrl}
                      alt="Extracted Face"
                      className="w-full h-full object-contain object-center rounded-md"
                    />
                    {/* High-tech biometric reticle corner brackets */}
                    <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-blue-500 rounded-tl pointer-events-none" />
                    <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-blue-500 rounded-tr pointer-events-none" />
                    <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-blue-500 rounded-bl pointer-events-none" />
                    <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-blue-500 rounded-br pointer-events-none" />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-rose-500 space-y-1.5">
                    <ScanFace className="w-8 h-8 text-rose-400" />
                    <span className="text-[10px] font-bold text-rose-600">No Photo Detected</span>
                    <span className="text-[9px] text-slate-400">Portrait absent on doc</span>
                  </div>
                )}
              </div>
              <div className="pt-0.5">
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                  {faceVerification.extractedFaceUrl ? 'Extracted Photo' : 'Missing Photo'}
                </p>
                <p className="text-[9px] text-slate-500">From Uploaded Specimen</p>
              </div>
            </div>

            {/* Database Reference Face */}
            <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/80 text-center flex flex-col justify-between space-y-2">
              <div className="w-full h-44 sm:h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-900/[0.04] flex items-center justify-center relative p-1.5 shadow-inner">
                {faceVerification.databaseFaceUrl ? (
                  <>
                    <img
                      src={faceVerification.databaseFaceUrl}
                      alt="Database Reference Photo"
                      className="w-full h-full object-contain object-center rounded-md"
                    />
                    {/* High-tech biometric reticle corner brackets */}
                    <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-emerald-500 rounded-tl pointer-events-none" />
                    <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-500 rounded-tr pointer-events-none" />
                    <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-emerald-500 rounded-bl pointer-events-none" />
                    <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-emerald-500 rounded-br pointer-events-none" />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400 space-y-1.5">
                    <UserCheck className="w-8 h-8 text-slate-300" />
                    <span className="text-[10px] font-semibold text-slate-500">No Prior Photo</span>
                    <span className="text-[9px] text-slate-400">First-time entry</span>
                  </div>
                )}
              </div>
              <div className="pt-0.5">
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Central Registry</p>
                <p className="text-[9px] text-slate-500">Official Database Record</p>
              </div>
            </div>
          </div>

          {/* Similarity Gauge Bar */}
          <div className="p-3 rounded-xl border bg-slate-50/80 space-y-2 mt-2">
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
