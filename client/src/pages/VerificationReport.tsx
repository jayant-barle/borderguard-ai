import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { VerificationResult } from '../../../shared/types';
import { api } from '../services/api';
import { ExplainableRiskCard } from '../components/report/ExplainableRiskCard';
import { DocumentPhotoViewer } from '../components/report/DocumentPhotoViewer';
import { OCRFieldTable } from '../components/report/OCRFieldTable';
import { MRZInspector } from '../components/report/MRZInspector';
import { TamperingForensicsView } from '../components/report/TamperingForensicsView';
import { DatabaseStatusCard } from '../components/report/DatabaseStatusCard';
import { RiskFactorBreakdown } from '../components/report/RiskFactorBreakdown';
import { AIForensicCopilot } from '../components/report/AIForensicCopilot';
import {
  FileText,
  Binary,
  Layers,
  Database,
  Sliders,
  Printer,
  PlusCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Info
} from 'lucide-react';

export const VerificationReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState<VerificationResult | null>(
    (location.state as any)?.result || null
  );
  const [loading, setLoading] = useState<boolean>(!result);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'TAMPERING' | 'OCR' | 'MRZ' | 'DATABASE' | 'RISK_ENGINE'
  >('TAMPERING');

  useEffect(() => {
    async function loadReport() {
      if (!result && id) {
        setLoading(true);
        try {
          const data = await api.verification.getById(id);
          setResult(data);
        } catch (err: any) {
          setError('Failed to load verification report record.');
        } finally {
          setLoading(false);
        }
      }
    }
    loadReport();
  }, [id, result]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Retrieving forensic report dossier...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Verification Report Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'Unable to locate report record.'}</p>
        <button
          onClick={() => navigate('/history')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
        >
          Return to History
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:p-0 print:space-y-4">
      {/* Top Navigation & Action Buttons (Hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-500" />
            Print / Export Dossier
          </button>
          <button
            onClick={() => navigate('/verify')}
            className="inline-flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            New Screening
          </button>
        </div>
      </div>

      {/* Official SatyaShield Header Dossier Box */}
      <div className="bg-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-blue-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>SatyaShield</span>
              </div>
              <span className="text-slate-400">•</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded border border-blue-500/30">
                AI-Powered Identity & Document Screening
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/30">
                Prototype / Decision-Support System
              </span>
            </div>
            <h2 className="text-xl font-mono font-extrabold tracking-wide mt-2">
              {result.id}
            </h2>
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs text-slate-400">
            <div className="flex items-center sm:justify-end space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date(result.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center sm:justify-end space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-slate-200">
                Officer: {result.officerName} {result.officerBadge ? `(${result.officerBadge})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Identity Snapshot Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Holder Name</span>
            <p className="font-bold text-white text-sm truncate">{result.holderName}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Document Number</span>
            <p className="font-bold text-blue-400 font-mono text-sm">{result.documentNumber}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Document Type</span>
            <p className="font-bold text-white text-sm">{result.documentType}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Processing Latency</span>
            <p className="font-bold text-emerald-400 font-mono text-sm">
              {result.processingTimeMs} ms
            </p>
          </div>
        </div>
      </div>

      {/* 1. Primary Explainable Risk Score Card */}
      <ExplainableRiskCard risk={result.risk} />

      {/* 2. Ollama AI Forensic Copilot & Interactive Assistant */}
      <AIForensicCopilot result={result} />

      {/* 3. Optical Specimen & Biometric Comparison Card */}
      <DocumentPhotoViewer
        documentImage={result.documentImage}
        faceVerification={result.faceVerification}
        holderName={result.holderName}
        documentNumber={result.documentNumber}
      />

      {/* 4. Deep-Dive Forensic Inspection Tabs */}
      <div className="space-y-4">
        {/* Tab Navigation Header (Hidden on print) */}
        <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-1 print:hidden">
          <button
            onClick={() => setActiveTab('TAMPERING')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'TAMPERING'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Photo Tampering & Forensics</span>
          </button>

          <button
            onClick={() => setActiveTab('OCR')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'OCR'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>OCR Field Extraction</span>
          </button>

          <button
            onClick={() => setActiveTab('MRZ')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'MRZ'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Binary className="w-4 h-4" />
            <span>ICAO 9303 MRZ Validation</span>
          </button>

          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'DATABASE'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Central Government Registry</span>
          </button>

          <button
            onClick={() => setActiveTab('RISK_ENGINE')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'RISK_ENGINE'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Risk Factor Synthesis</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div>
          {activeTab === 'TAMPERING' && <TamperingForensicsView tampering={result.tampering} />}
          {activeTab === 'OCR' && <OCRFieldTable ocr={result.ocr} />}
          {activeTab === 'MRZ' && <MRZInspector mrz={result.mrz} />}
          {activeTab === 'DATABASE' && <DatabaseStatusCard dbResult={result.databaseVerification} />}
          {activeTab === 'RISK_ENGINE' && (
            <RiskFactorBreakdown factors={result.risk.factors} totalScore={result.risk.score} />
          )}
        </div>
      </div>

      {/* Legal & Decision-Support Footer Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-800">
            SatyaShield • AI-Powered Identity & Document Screening (Prototype / Decision-Support System)
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            SatyaShield assists authorized officers with document and identity screening and does not replace official verification, human judgment, or legal decision-making.
          </p>
        </div>
      </div>
    </div>
  );
};
