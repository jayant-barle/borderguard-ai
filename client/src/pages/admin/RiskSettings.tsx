import React, { useState, useEffect } from 'react';
import { RiskConfig } from '../../../../shared/types';
import { api } from '../../services/api';
import { Sliders, CheckCircle2, AlertTriangle, RefreshCw, Save, RotateCcw } from 'lucide-react';

export const RiskSettings: React.FC = () => {
  const [config, setConfig] = useState<RiskConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [tamperingWeight, setTamperingWeight] = useState<number>(30);
  const [faceMismatchWeight, setFaceMismatchWeight] = useState<number>(30);
  const [databaseWeight, setDatabaseWeight] = useState<number>(15);
  const [mrzWeight, setMrzWeight] = useState<number>(10);
  const [docValidWeight, setDocValidWeight] = useState<number>(10);
  const [qualityWeight, setQualityWeight] = useState<number>(5);

  const [lowThreshold, setLowThreshold] = useState<number>(30);
  const [mediumThreshold, setMediumThreshold] = useState<number>(60);

  const totalWeight =
    tamperingWeight +
    faceMismatchWeight +
    databaseWeight +
    mrzWeight +
    docValidWeight +
    qualityWeight;

  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getRiskConfig();
      setConfig(data);
      setTamperingWeight(data.tamperingWeight);
      setFaceMismatchWeight(data.faceMismatchWeight);
      setDatabaseWeight(data.databaseWeight);
      setMrzWeight(data.mrzWeight);
      setDocValidWeight(data.docValidWeight);
      setQualityWeight(data.qualityWeight);
      setLowThreshold(data.lowThreshold);
      setMediumThreshold(data.mediumThreshold);
    } catch (err) {
      console.error('Failed to load risk config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!isWeightValid) {
      setErrorMsg(`Factor weights must sum to exactly 100%. Current sum is ${totalWeight}%.`);
      return;
    }

    if (lowThreshold >= mediumThreshold) {
      setErrorMsg('Low Risk threshold must be strictly lower than Medium Risk threshold.');
      return;
    }

    setSaving(true);
    try {
      await api.admin.updateRiskConfig({
        tamperingWeight,
        faceMismatchWeight,
        databaseWeight,
        mrzWeight,
        docValidWeight,
        qualityWeight,
        lowThreshold,
        mediumThreshold,
        highThreshold: 100
      });
      setSuccessMsg('Risk Engine configuration calibrated and persisted successfully.');
      loadConfig();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save risk configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setTamperingWeight(30);
    setFaceMismatchWeight(30);
    setDatabaseWeight(15);
    setMrzWeight(10);
    setDocValidWeight(10);
    setQualityWeight(5);
    setLowThreshold(30);
    setMediumThreshold(60);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
            System Calibration
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-1">
          Risk Engine Scoring & Factor Weights
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure multi-signal weighting parameters and define automated risk classification thresholds.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Loading engine parameters...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Factor Weights Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Forensic Factor Weights (Must Sum to 100%)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Relative contribution of each sub-system to overall risk index.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Total Sum:</span>
                <span
                  className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-full border ${
                    isWeightValid
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  }`}
                >
                  {totalWeight}%
                </span>
              </div>
            </div>

            <div className="space-y-5 text-xs">
              {/* 1. Tampering Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Photo Tampering & Manipulation Forensics</span>
                  <span className="font-mono text-blue-600">{tamperingWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={tamperingWeight}
                  onChange={(e) => setTamperingWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* 2. Face Mismatch Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Facial Biometrics & Portrait Consistency</span>
                  <span className="font-mono text-blue-600">{faceMismatchWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={faceMismatchWeight}
                  onChange={(e) => setFaceMismatchWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* 3. Database Verification Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Central Registry & Blacklist Matching</span>
                  <span className="font-mono text-blue-600">{databaseWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={databaseWeight}
                  onChange={(e) => setDatabaseWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* 4. MRZ Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>ICAO 9303 MRZ Checksum Integrity</span>
                  <span className="font-mono text-blue-600">{mrzWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={mrzWeight}
                  onChange={(e) => setMrzWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* 5. Document Expiry & Fields Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Biographical & Expiration Date Validity</span>
                  <span className="font-mono text-blue-600">{docValidWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={docValidWeight}
                  onChange={(e) => setDocValidWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* 6. Image Quality Weight */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Capture & Optical Quality Index</span>
                  <span className="font-mono text-blue-600">{qualityWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={qualityWeight}
                  onChange={(e) => setQualityWeight(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Risk Classification Thresholds */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3">
              Automated Risk Tier Thresholds
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <span className="font-bold text-emerald-800">LOW RISK (Verified)</span>
                <p className="text-[11px] text-emerald-700">Scores between 0 and {lowThreshold}</p>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                    Upper Cutoff:
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="45"
                    value={lowThreshold}
                    onChange={(e) => setLowThreshold(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <span className="font-bold text-amber-800">MEDIUM RISK (Suspicious)</span>
                <p className="text-[11px] text-amber-700">
                  Scores between {lowThreshold + 1} and {mediumThreshold}
                </p>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                    Upper Cutoff:
                  </label>
                  <input
                    type="number"
                    min="46"
                    max="75"
                    value={mediumThreshold}
                    onChange={(e) => setMediumThreshold(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                <span className="font-bold text-rose-800">HIGH RISK (Flagged)</span>
                <p className="text-[11px] text-rose-700">
                  Scores between {mediumThreshold + 1} and 100
                </p>
                <div className="pt-3 text-[11px] text-rose-600 font-semibold">
                  Trigger mandatory manual secondary inspection.
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Reset SIH Defaults</span>
            </button>

            <button
              type="submit"
              disabled={saving || !isWeightValid}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Calibrating...' : 'Persist Configuration'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
