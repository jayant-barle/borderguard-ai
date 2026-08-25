import React from 'react';
import { RiskLevel } from '../../../../shared/types';

interface RiskGaugeProps {
  score: number; // 0 - 100
  level: RiskLevel;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, size = 160 }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Use 270 degree gauge arc (3/4 circle)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (score / 100) * arcLength;

  let strokeColor = '#10b981'; // Green
  let textColor = 'text-emerald-700';
  let bgColor = 'bg-emerald-50';

  if (score > 60 || level === 'HIGH') {
    strokeColor = '#ef4444'; // Red
    textColor = 'text-rose-700';
    bgColor = 'bg-rose-50';
  } else if (score > 30 || level === 'MEDIUM') {
    strokeColor = '#f59e0b'; // Amber
    textColor = 'text-amber-700';
    bgColor = 'bg-amber-50';
  }

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size} className="transform -rotate-135">
        {/* Background Track Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Filled Score Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center Value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800">
          {score}
        </span>
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Risk Index
        </span>
      </div>
    </div>
  );
};
