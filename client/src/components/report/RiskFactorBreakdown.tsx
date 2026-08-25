import React from 'react';
import { RiskFactor } from '../../../../shared/types';
import { Sliders, AlertTriangle } from 'lucide-react';

interface RiskFactorBreakdownProps {
  factors: RiskFactor[];
  totalScore: number;
}

export const RiskFactorBreakdown: React.FC<RiskFactorBreakdownProps> = ({ factors, totalScore }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Weighted Factor Penalty Synthesis (Configurable Engine)
          </h4>
        </div>
        <span className="text-xs font-bold text-slate-700">
          Cumulative Risk:{' '}
          <strong className="font-mono text-blue-600">{totalScore} / 100</strong>
        </span>
      </div>

      <div className="space-y-3">
        {factors.map((factor) => {
          const isHighPenalty = factor.penaltyScore > 50;
          return (
            <div
              key={factor.id}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">{factor.name}</span>
                  <span className="text-[10px] text-slate-600 font-semibold px-2 py-0.5 bg-slate-200 rounded">
                    Weight: {factor.weight}%
                  </span>
                </div>
                <div className="flex items-center space-x-3 font-mono">
                  <span className="text-[11px] text-slate-600">
                    Penalty: <strong className={isHighPenalty ? 'text-rose-600' : 'text-slate-700'}>{factor.penaltyScore}/100</strong>
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    +{factor.contribution} pts
                  </span>
                </div>
              </div>

              {/* Visual Contribution Bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHighPenalty ? 'bg-rose-500' : factor.penaltyScore > 20 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${factor.penaltyScore}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500">{factor.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
