import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, ShieldAlert, Sparkles, Image, ArrowRight } from 'lucide-react';
import { DocumentType } from '../../../../shared/types';

interface DragDropUploaderProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  documentType: DocumentType;
  onDocumentTypeChange: (type: DocumentType) => void;
  onSelectSampleSpecimen: (specimenUrl: string, scenario: string) => void;
  onStartCamera: () => void;
}

export const DragDropUploader: React.FC<DragDropUploaderProps> = ({
  selectedFile,
  onFileSelect,
  documentType,
  onDocumentTypeChange,
  onSelectSampleSpecimen,
  onStartCamera
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const documentTypes: Array<{ value: DocumentType; label: string; icon: string }> = [
    { value: 'PASSPORT', label: 'Passport (TD3)', icon: '🛂' },
    { value: 'VISA', label: 'Entry Visa', icon: '📑' },
    { value: 'NATIONAL_ID', label: 'National ID Card (TD1)', icon: '🪪' },
    { value: 'DRIVING_LICENSE', label: 'Driving License', icon: '🪪' },
    { value: 'PERMIT', label: 'Residence / Border Permit', icon: '📄' }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      setError('Invalid file format. Please upload a JPG, JPEG, or PNG image.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15MB maximum limit.');
      return;
    }

    onFileSelect(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onFileSelect(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Document Type Selector */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
          Step 1: Select Document Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {documentTypes.map((t) => {
            const isSelected = documentType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onDocumentTypeChange(t.value)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl mb-1">{t.icon}</span>
                <span className="text-xs font-bold leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Drag & Drop Upload Zone or Camera Option */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Step 2: Provide Document Specimen
          </label>
          <button
            type="button"
            onClick={onStartCamera}
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
          >
            <span className="mr-1">📷</span> Switch to Live Camera
          </button>
        </div>

        {error && (
          <div className="p-3 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!selectedFile ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                : 'border-slate-300 bg-slate-50/60 hover:bg-white hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Click to upload or drag & drop specimen file
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Supports high-resolution PNG, JPG, JPEG (Up to 15MB)
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-4">
              {previewUrl && (
                <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h5 className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </h5>
                <p className="text-[11px] text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'image/png'}
                </p>
                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 mt-1">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ready for AI Forensic Screening
                </span>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Remove File"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Demo Specimen Shortcuts (Crucial Hackathon Feature) */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>SIH Demo Scenarios (1-Click Verification Test)</span>
          </div>
          <span className="text-[10px] text-slate-600">Specimen dataset</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Specimen 1: Genuine */}
          <div
            onClick={() =>
              onSelectSampleSpecimen(
                '/assets/specimens/specimen_genuine_passport.png',
                'GENUINE_PASSPORT'
              )
            }
            className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer transition-all group flex items-start justify-between shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                  Scenario 1
                </span>
                <span className="text-xs font-bold text-emerald-950">Genuine Passport</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                ANANYA VERMA (P94821037) • Clean biometrics, valid MRZ, active registry match.
              </p>
              <div className="text-[10px] font-semibold text-emerald-700 pt-0.5">
                Expected: <strong>LOW RISK (10-20/100)</strong>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
          </div>

          {/* Specimen 2: Tampered */}
          <div
            onClick={() =>
              onSelectSampleSpecimen(
                '/assets/specimens/specimen_tampered_passport.png',
                'PHOTO_REPLACEMENT'
              )
            }
            className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 cursor-pointer transition-all group flex items-start justify-between shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider">
                  Scenario 2
                </span>
                <span className="text-xs font-bold text-rose-950">Photo Replacement</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-snug">
                Same identity & valid MRZ, but altered portrait with facial biometric mismatch.
              </p>
              <div className="text-[10px] font-semibold text-rose-700 pt-0.5">
                Expected: <strong>HIGH RISK (80-95/100)</strong>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
};
