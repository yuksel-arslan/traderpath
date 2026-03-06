'use client';

import { PulseDot } from '@/components/ui/intelligence';

interface MarketPulseBarProps {
  regime: string;
  regimeConfidence: number;
  topFlow: { sector: string; amount: string } | null;
  fearGreed: { value: number; label: string } | null;
}

export function MarketPulseBar({
  regime,
  regimeConfidence,
  topFlow,
  fearGreed,
}: MarketPulseBarProps) {
  const isRiskOn = regime.toLowerCase().includes('risk_on') || regime.toLowerCase().includes('risk-on');
  const isRiskOff = regime.toLowerCase().includes('risk_off') || regime.toLowerCase().includes('risk-off');

  const regimeColor = isRiskOn ? '#00F5A0' : isRiskOff ? '#FF4757' : '#FFB800';
  const regimeLabel = isRiskOn ? 'RISK-ON' : isRiskOff ? 'RISK-OFF' : 'NEUTRAL';

  return (
    <div
      className="rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap"
      style={{
        background: `${regimeColor}08`,
        border: `1px solid ${regimeColor}20`,
      }}
    >
      {/* Regime */}
      <div className="flex items-center gap-2">
        <PulseDot color={regimeColor} size={6} />
        <span className="text-xs font-bold" style={{ color: regimeColor, fontFamily: "'JetBrains Mono', monospace" }}>
          {regimeLabel}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-white/40 font-mono">
          ({regimeConfidence}%)
        </span>
      </div>

      {/* Top Flow */}
      {topFlow && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-white/50">
          <span className="text-gray-400 dark:text-white/30">Top Flow:</span>
          <span className="font-semibold text-gray-700 dark:text-white/70">
            {topFlow.sector} {topFlow.amount}
          </span>
        </div>
      )}

      {/* Fear & Greed */}
      {fearGreed && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-white/50">
          <span className="text-gray-400 dark:text-white/30">Fear & Greed:</span>
          <span
            className="font-bold font-mono"
            style={{ color: fearGreed.value >= 60 ? '#00F5A0' : fearGreed.value <= 40 ? '#FF4757' : '#FFB800' }}
          >
            {fearGreed.value}
          </span>
          <span className="text-gray-400 dark:text-white/40">{fearGreed.label}</span>
        </div>
      )}
    </div>
  );
}
