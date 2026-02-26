'use client';

import { PulseDot, ScoreRing } from '@/components/ui/intelligence';

interface MarketContextPanelProps {
  capitalFlow: {
    liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
    recommendation: {
      primaryMarket: string;
      confidence: number;
    };
    markets: {
      market: string;
      flow7d: number;
      phase: string;
    }[];
    globalLiquidity?: {
      vix?: { value: number; level: string };
      dxy?: { value: number; trend: string };
    };
  } | null;
}

export function MarketContextPanel({ capitalFlow }: MarketContextPanelProps) {
  if (!capitalFlow) {
    return (
      <div className="rounded-xl p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <PulseDot color="#FFB800" size={6} />
          <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
            Market Context
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-white/30 py-4 text-center">
          Run analysis to load market context
        </div>
      </div>
    );
  }

  const bias = capitalFlow.liquidityBias;
  const regimeColor = bias === 'risk_on' ? '#00F5A0' : bias === 'risk_off' ? '#FF4757' : '#FFB800';
  const regimeLabel = bias === 'risk_on' ? 'RISK-ON' : bias === 'risk_off' ? 'RISK-OFF' : 'NEUTRAL';

  const topMarket = [...capitalFlow.markets].sort((a, b) => b.flow7d - a.flow7d)[0];
  const topFlowValue = topMarket ? `${topMarket.flow7d >= 0 ? '+' : ''}$${Math.abs(topMarket.flow7d).toFixed(1)}B` : '--';

  return (
    <div className="rounded-xl p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <PulseDot color={regimeColor} size={6} />
        <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
          Market Context
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-white/40">Regime</span>
          <span
            className="text-xs font-bold"
            style={{ color: regimeColor, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {regimeLabel}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-white/40">Confidence</span>
          <div className="flex items-center gap-2">
            <ScoreRing
              score={Math.round(capitalFlow.recommendation.confidence * 100)}
              size={24}
              strokeWidth={2}
              color={regimeColor}
            />
            <span className="text-xs font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.round(capitalFlow.recommendation.confidence * 100)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-white/40">Top Flow</span>
          <span className="text-xs font-bold" style={{ color: '#00F5A0', fontFamily: "'JetBrains Mono', monospace" }}>
            {topMarket?.market?.toUpperCase() || '--'} {topFlowValue}
          </span>
        </div>
        {capitalFlow.globalLiquidity?.vix && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 dark:text-white/40">VIX</span>
            <span
              className="text-xs font-bold"
              style={{
                color: capitalFlow.globalLiquidity.vix.value > 25 ? '#FF4757' : capitalFlow.globalLiquidity.vix.value > 18 ? '#FFB800' : '#00F5A0',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {capitalFlow.globalLiquidity.vix.value.toFixed(1)}
            </span>
          </div>
        )}
        {capitalFlow.globalLiquidity?.dxy && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 dark:text-white/40">DXY</span>
            <span className="text-xs text-gray-700 dark:text-white/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {capitalFlow.globalLiquidity.dxy.value.toFixed(1)}
              <span className="ml-1 text-[10px]" style={{ color: capitalFlow.globalLiquidity.dxy.trend === 'weakening' ? '#00F5A0' : '#FF4757' }}>
                {capitalFlow.globalLiquidity.dxy.trend === 'weakening' ? '\u2193' : '\u2191'}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
