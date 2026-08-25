import React, { useState } from 'react';
import { RiskAssessment } from '../../../../shared/types';
import { RiskGauge } from '../ui/RiskGauge';
import { RiskBadge, StatusBadge } from '../ui/Badge';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  AlertOctagon,
  ListChecks
} from 'lucide-react';

interface ExplainableRiskCardProps {
  risk: RiskAssessment;
}

export const ExplainableRiskCard: React.FC<ExplainableRiskCardProps> = ({ risk }) => {
  const [isWhyExpanded, setIsWhyExpanded] = useState<boolean>(true);

  const isHighRisk = risk.level === 'HIGH';
  const isMedRisk = risk.level === 'MEDIUM';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Banner Status */}
      <div
        className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b ${
          isHighRisk
            ? 'bg-rose-50/80 border-rose-200'
            : isMedRisk
            ? 'bg-amber-50/80 border-amber-200'
            : 'bg-emerald-50/80 border-emerald-200'
        }`}
      >
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isHighRisk
                ? 'bg-rose-600 text-white'
                : isMedRisk
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isHighRisk ? (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            ) : isMedRisk ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <RiskBadge level={risk.level} score={risk.score} size="lg" />
              <StatusBadge status={risk.status} />
            </div>
            <p className="text-xs font-bold text-slate-800 mt-1">
              Recommended Action:{' '}
              <span
                className={
                  isHighRisk ? 'text-rose-700 underline' : isMedRisk ? 'text-amber-700' : 'text-emerald-700'
                }
              >
                {risk.recommendedAction}
              </span>
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <RiskGauge score={risk.score} level={risk.level} size={110} />
        </div>
      </div>

      {/* Rationale Bullet Summary */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center">
          <ListChecks className="w-4 h-4 mr-1.5 text-blue-600" />
          Screening Rationale & Signals
        </h4>
        <ul className="space-y-1.5">
          {risk.rationale.map((item, idx) => (
            <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Deep-Dive Explainability Section ("Why is this document suspicious?") */}
      {risk.whySuspicious && (
        <div className="border-t border-slate-200">
          <button
            type="button"
            onClick={() => setIsWhyExpanded(!isWhyExpanded)}
            className="w-full px-5 py-3.5 flex items-center justify-between bg-rose-50/40 hover:bg-rose-50/70 transition-colors text-left"
          >
            <div className="flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-extrabold text-rose-900 uppercase tracking-wide">
                {risk.whySuspicious.title}
              </span>
            </div>
            {isWhyExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {isWhyExpanded && (
            <div className="p-5 space-y-4 bg-rose-50/20 text-xs border-t border-rose-100">
              {/* Passed vs Flagged comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Legitimate components */}
                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                  <h5 className="font-bold text-emerald-800 mb-2 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Consistent / Passed Elements
                  </h5>
                  <ul className="space-y-1.5 text-slate-700 text-[11px]">
                    {risk.whySuspicious.checksPassed.map((chk, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-emerald-600 mr-1.5 font-bold">✓</span>
                        <span>{chk.replace(/^✓\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Detected Anomalies */}
                <div className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-2xs">
                  <h5 className="font-bold text-rose-800 mb-2 flex items-center">
                    <AlertOctagon className="w-3.5 h-3.5 mr-1 text-rose-600" />
                    Critical Inconsistencies Detected
                  </h5>
                  <ul className="space-y-1.5 text-slate-700 text-[11px]">
                    {risk.whySuspicious.flagsDetected.map((flg, i) => (
                      <li key={i} className="flex items-start text-rose-900 font-medium">
                        <span className="text-rose-600 mr-1.5 font-bold">🚨</span>
                        <span>{flg.replace(/^🚨\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Plain-Language Forensic Conclusion */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs leading-relaxed">
                <p className="font-semibold text-amber-400 mb-1">Forensic Analysis Conclusion:</p>
                <p>{risk.whySuspicious.conclusion}</p>
              </div>

              {/* Recommended Action Checklist for Officer */}
              {risk.whySuspicious.investigationGuidance && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <p className="font-bold mb-1.5 text-amber-950">Recommended Officer Action Checklist:</p>
                  <ul className="space-y-1 text-[11px]">
                    {risk.whySuspicious.investigationGuidance.map((guide, i) => (
                      <li key={i}>{guide}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
