'use client';

import { ScoreRing, PulseDot } from '@/components/ui/intelligence';

type LiquidityBias = 'risk_on' | 'risk_off' | 'neutral';

interface PrimaryDecisionProps {
  capitalFlow: {
    liquidityBias: LiquidityBias;
    recommendation: {
      confidence: number;
      reason: string;
      action: string;
    };
  } | null;
}

const regimeConfig: Record<LiquidityBias, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  risk_on: {
    label: 'RISK-ON',
    color: '#00F5A0',
    bg: 'rgba(0,245,160,0.08)',
    border: 'rgba(0,245,160,0.3)',
    glow: '0 0 40px rgba(0,245,160,0.15)',
  },
  risk_off: {
    label: 'RISK-OFF',
    color: '#FF4757',
    bg: 'rgba(255,71,87,0.08)',
    border: 'rgba(255,71,87,0.3)',
    glow: '0 0 40px rgba(255,71,87,0.15)',
  },
  neutral: {
    label: 'NEUTRAL',
    color: '#FFB800',
    bg: 'rgba(255,184,0,0.08)',
    border: 'rgba(255,184,0,0.3)',
    glow: '0 0 40px rgba(255,184,0,0.15)',
  },
};

export function PrimaryDecision({ capitalFlow }: PrimaryDecisionProps) {
  if (!capitalFlow) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          background: 'rgba(255,184,0,0.08)',
          border: '1px solid rgba(255,184,0,0.3)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <PulseDot color="#FFB800" size={10} />
          <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/50">
            System Decision
          </span>
        </div>
        <div
          className="text-3xl font-black tracking-tight"
          style={{ color: '#FFB800', fontFamily: "'JetBrains Mono', monospace" }}
        >
          LOADING...
        </div>
        <div className="mt-3 text-sm text-gray-500 dark:text-white/60">
          Fetching capital flow data to determine market regime...
        </div>
      </div>
    );
  }

  const bias = capitalFlow.liquidityBias;
  const config = regimeConfig[bias] || regimeConfig.neutral;
  const confidence = Math.round(capitalFlow.recommendation.confidence * 100);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: config.glow,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <PulseDot color={config.color} size={10} />
          <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/50">
            System Decision
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-white/35">
          {capitalFlow.recommendation.action === 'analyze' ? 'Active' : 'Cautious'} regime
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="text-3xl font-black tracking-tight"
          style={{ color: config.color, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {config.label}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ScoreRing score={confidence} size={52} strokeWidth={3} color={config.color} />
          <div className="text-right">
            <div className="text-xs text-gray-400 dark:text-white/40">Confidence</div>
            <div className="text-sm font-bold" style={{ color: config.color }}>
              {confidence}%
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-600 dark:text-white/60">
        {capitalFlow.recommendation.reason}
      </div>
    </div>
  );
}
