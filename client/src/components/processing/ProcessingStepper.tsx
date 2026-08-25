import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldAlert, Cpu } from 'lucide-react';

interface ProcessingStepperProps {
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Document Ingestion & Image Fingerprint', desc: 'SHA-256 hash & perceptual signature' },
  { id: 2, title: 'Image Quality & Optical Standards Check', desc: 'Resolution, blur, exposure & glare analysis' },
  { id: 3, title: 'OCR & Field Extraction', desc: 'Optical character extraction & field confidence scoring' },
  { id: 4, title: 'ICAO 9303 MRZ Validation', desc: 'Check digit mathematical calculation & cross-matching' },
  { id: 5, title: 'Tampering & Forensic Analysis', desc: 'Error Level Analysis (ELA) & photo boundary detection' },
  { id: 6, title: 'Facial Biometrics & Photo Consistency', desc: 'Biometric face embedding vs. central identity photo' },
  { id: 7, title: 'Central Database & Blacklist Check', desc: 'Government registry verification & watchlist screening' },
  { id: 8, title: 'Risk Engine Scoring & Explainability', desc: 'Weighted risk synthesis and decision recommendation' }
];

export const ProcessingStepper: React.FC<ProcessingStepperProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return prev;
        }
      });
    }, 280); // Quick, realistic ~2.2s progression

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xl max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-6 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-600 flex items-center justify-center">
          <Cpu className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Automated Forensic Pipeline Active
          </h3>
          <p className="text-xs text-slate-500">
            Running 8-stage verification & explainable biometric screening...
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-6">
        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
          <span>Processing Pipeline</span>
          <span className="text-blue-600 font-mono">
            {Math.round((currentStep / STEPS.length) * 100)}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Stepper List */}
      <div className="space-y-3">
        {STEPS.map((step) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3.5 p-2.5 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-blue-50/70 border border-blue-200/80 shadow-2xs'
                  : isDone
                  ? 'bg-slate-50/50'
                  : 'opacity-40'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    {step.id}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5
                    className={`text-xs font-bold ${
                      isCurrent ? 'text-blue-900' : isDone ? 'text-slate-800' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </h5>
                  {isDone && (
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                      Done
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[10px] font-semibold text-blue-600 animate-pulse">
                      Analyzing...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
