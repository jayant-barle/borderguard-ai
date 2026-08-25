import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentType, VerificationResult } from '../../../shared/types';
import { DragDropUploader } from '../components/uploader/DragDropUploader';
import { CameraScanner } from '../components/scanner/CameraScanner';
import { ProcessingStepper } from '../components/processing/ProcessingStepper';
import { api } from '../services/api';
import { ShieldCheck, Sparkles, AlertCircle, ArrowRight, Play } from 'lucide-react';
import confetti from 'canvas-confetti';

export const NewVerification: React.FC = () => {
  const [documentType, setDocumentType] = useState<DocumentType>('PASSPORT');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraMode, setCameraMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Stored pending verification result while stepper animates
  const [pendingResult, setPendingResult] = useState<VerificationResult | null>(null);
  const navigate = useNavigate();

  const handleStartVerification = async (
    customPayload?: {
      base64?: string;
      specimenUrl?: string;
      scenario?: string;
      file?: File;
    }
  ) => {
    setError(null);
    setIsProcessing(true);

    try {
      let result: VerificationResult;

      if (customPayload?.specimenUrl) {
        // Sample specimen 1-click test
        result = await api.verification.processSampleSpecimen(
          customPayload.specimenUrl,
          documentType,
          customPayload.scenario
        );
      } else if (customPayload?.base64) {
        // Camera capture snapshot
        result = await api.verification.processBase64(
          customPayload.base64,
          documentType,
          customPayload.scenario
        );
      } else if (selectedFile || customPayload?.file) {
        // Form data upload
        const fileToUpload = customPayload?.file || selectedFile!;
        const formData = new FormData();
        formData.append('document', fileToUpload);
        formData.append('documentType', documentType);
        result = await api.verification.processUpload(formData);
      } else {
        throw new Error('Please select a document file or capture an image first.');
      }

      // Automatically save verification session to SQLite database
      await api.verification.saveVerification(result);

      setPendingResult(result);
    } catch (err: any) {
      console.error('Verification failed:', err);
      setError(err.message || 'Error occurred during verification analysis.');
      setIsProcessing(false);
    }
  };

  const handleStepperComplete = () => {
    if (pendingResult) {
      if (pendingResult.risk.level === 'LOW') {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch {
          // Ignore if confetti fails
        }
      }
      navigate(`/report/${pendingResult.id}`, { state: { result: pendingResult } });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
            SatyaShield Screening Workflow
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-1">
          SatyaShield Verification Engine
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest specimen document, run optical quality validation, OCR field extraction, ICAO MRZ check, and photo forensics.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Mode Switcher: Stepper vs Scanner vs Uploader */}
      {isProcessing ? (
        <ProcessingStepper onComplete={handleStepperComplete} />
      ) : cameraMode ? (
        <CameraScanner
          onCapture={(base64) => {
            setCameraMode(false);
            handleStartVerification({ base64 });
          }}
          onCancel={() => setCameraMode(false)}
        />
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <DragDropUploader
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            documentType={documentType}
            onDocumentTypeChange={setDocumentType}
            onSelectSampleSpecimen={(url, scenario) => {
              handleStartVerification({ specimenUrl: url, scenario });
            }}
            onStartCamera={() => setCameraMode(true)}
          />

          {/* Verification Trigger Button */}
          {selectedFile && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => handleStartVerification()}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md hover:shadow-blue-500/25 transition-all transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Execute AI Forensic Screening</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
