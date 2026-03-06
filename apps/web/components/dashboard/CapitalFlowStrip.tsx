'use client';

import Link from 'next/link';
import { ArrowRight, Activity } from 'lucide-react';

interface MarketFlow {
  market: string;
  flow7d: number;
  phase: string;
  daysInPhase: number;
  rotationSignal: string | null;
}

interface CapitalFlowStripProps {
  capitalFlow: {
    liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
    markets: MarketFlow[];
    recommendation: {
      primaryMarket: string;
      phase: string;
      action: string;
      confidence: number;
      reason: string;
    };
    globalLiquidity?: {
      vix?: { value: number; level: string };
      dxy?: { value: number; trend: string };
    };
  } | null;
}

export function CapitalFlowStrip({ capitalFlow }: CapitalFlowStripProps) {
  if (!capitalFlow) return null;

  const bias = capitalFlow.liquidityBias;
  const topMarket = [...capitalFlow.markets].sort((a, b) => b.flow7d - a.flow7d)[0];
  const rec = capitalFlow.recommendation;

  const biasConfig = {
    risk_on: { label: 'RISK ON', color: 'text-green-500', dot: 'bg-green-500' },
    risk_off: { label: 'RISK OFF', color: 'text-red-500', dot: 'bg-red-500' },
    neutral: { label: 'NEUTRAL', color: 'text-gray-500', dot: 'bg-gray-400' },
  };

  const phaseConfig: Record<string, { label: string; color: string }> = {
    early: { label: 'EARLY', color: 'text-green-500' },
    mid: { label: 'MID', color: 'text-yellow-500' },
    late: { label: 'LATE', color: 'text-orange-500' },
    exit: { label: 'EXIT', color: 'text-red-500' },
  };

  const actionConfig: Record<string, { label: string; color: string }> = {
    analyze: { label: 'ANALYZE', color: 'text-teal-500' },
    wait: { label: 'WAIT', color: 'text-yellow-500' },
    avoid: { label: 'AVOID', color: 'text-red-500' },
  };

  const biasC = biasConfig[bias];
  const phaseC = phaseConfig[topMarket?.phase] ?? { label: '—', color: 'text-gray-500' };
  const actionC = actionConfig[rec.action] ?? { label: rec.action.toUpperCase(), color: 'text-gray-500' };

  const steps = [
    { index: 'L1', label: 'Global Liquidity', value: biasC.label, valueColor: biasC.color },
    { index: 'L2', label: 'Top Market', value: topMarket?.market?.toUpperCase() ?? '—', valueColor: 'text-gray-900 dark:text-gray-100' },
    { index: 'L3', label: 'Phase', value: phaseC.label, valueColor: phaseC.color },
    { index: 'L4', label: 'Action', value: actionC.label, valueColor: actionC.color },
  ];

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">

      {/* ── MOBILE: 2×2 card grid ── */}
      <div className="sm:hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Capital Flow</span>
          </div>
          <Link
            href="/flow"
            className="text-xs font-medium text-teal-500 hover:text-teal-600 transition-colors"
          >
            Full Analysis →
          </Link>
        </div>

        {/* 2×2 grid — all 4 layers always visible */}
        <div className="grid grid-cols-2">
          {steps.map((step, i) => (
            <div
              key={step.index}
              className={[
                'px-4 py-3',
                i % 2 === 0 ? 'border-r border-gray-100 dark:border-gray-800' : '',
                i < 2 ? 'border-b border-gray-100 dark:border-gray-800' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {step.index}
                </span>
                <span className="text-[10px] text-gray-400">{step.label}</span>
              </div>
              <p className={`text-sm font-semibold leading-none ${step.valueColor}`}>{step.value}</p>
            </div>
          ))}
        </div>

        {/* Confidence footer */}
        {rec.confidence > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[10px] text-gray-400">{rec.confidence}% confidence</span>
          </div>
        )}
      </div>

      {/* ── DESKTOP: horizontal strip ── */}
      <div className="hidden sm:flex items-center px-5 py-3 gap-6 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Capital Flow
          </span>
        </div>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 shrink-0" />

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {step.index}
                </span>
                <div>
                  <p className="text-[10px] text-gray-400 leading-none mb-0.5">{step.label}</p>
                  <p className={`text-xs font-semibold leading-none ${step.valueColor}`}>{step.value}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-700" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {rec.confidence > 0 && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {rec.confidence}% confidence
            </span>
          )}
          <Link
            href="/flow"
            className="text-xs font-medium text-teal-500 hover:text-teal-600 transition-colors whitespace-nowrap"
          >
            Full Analysis →
          </Link>
        </div>
      </div>

    </div>
  );
}
