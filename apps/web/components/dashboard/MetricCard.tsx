'use client';

import { cn } from '../../lib/utils';

// ===========================================
// MetricCard - Focus Mode Top 3 Metric Cards
// ===========================================

interface MetricCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, children, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'max-w-sm w-full rounded-lg border border-[#1E293B] bg-[#0F1629] p-6 shadow-none',
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
        {title}
      </p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ===========================================
// LiquidityGauge - Semicircular gauge for L1
// ===========================================

interface LiquidityGaugeProps {
  bias: 'risk_on' | 'risk_off' | 'neutral';
  fedTrend: 'expanding' | 'contracting' | 'stable';
  dxyValue: number;
  vixLevel: string;
}

export function LiquidityGauge({ bias, fedTrend, dxyValue, vixLevel }: LiquidityGaugeProps) {
  // Map bias to gauge angle: risk_off = left, neutral = center, risk_on = right
  const angle = bias === 'risk_on' ? 140 : bias === 'risk_off' ? 40 : 90;
  const needleRotation = angle - 90; // CSS rotation from 12 o'clock

  const biasLabel = bias === 'risk_on' ? 'RISK ON' : bias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL';
  const biasColor =
    bias === 'risk_on'
      ? 'text-emerald-400'
      : bias === 'risk_off'
        ? 'text-[#EF5A6F]'
        : 'text-gray-400';

  return (
    <div className="flex flex-col items-center">
      {/* Gauge SVG */}
      <div className="relative w-32 h-20 mb-3">
        <svg viewBox="0 0 120 70" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#1E293B"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Colored arc segments */}
          <path
            d="M 10 60 A 50 50 0 0 1 40 18"
            fill="none"
            stroke="#EF5A6F"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 40 18 A 50 50 0 0 1 80 18"
            fill="none"
            stroke="#6B7280"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 80 18 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="#5EEDC3"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.6"
          />
          {/* Needle */}
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="20"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${needleRotation}, 60, 60)`}
          />
          <circle cx="60" cy="60" r="4" fill="white" />
        </svg>
      </div>

      {/* Bias label */}
      <span className={cn('text-lg font-bold', biasColor)}>{biasLabel}</span>

      {/* Sub-metrics */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <span>
          Fed:{' '}
          <span
            className={cn(
              fedTrend === 'expanding'
                ? 'text-emerald-400'
                : fedTrend === 'contracting'
                  ? 'text-[#EF5A6F]'
                  : 'text-gray-400'
            )}
          >
            {fedTrend.charAt(0).toUpperCase() + fedTrend.slice(1)}
          </span>
        </span>
        <span>DXY: {dxyValue.toFixed(1)}</span>
        <span>
          VIX:{' '}
          <span
            className={cn(
              vixLevel === 'complacent' || vixLevel === 'neutral'
                ? 'text-emerald-400'
                : 'text-[#EF5A6F]'
            )}
          >
            {vixLevel.charAt(0).toUpperCase() + vixLevel.slice(1).replace('_', ' ')}
          </span>
        </span>
      </div>
    </div>
  );
}

// ===========================================
// MarketBiasBar - Horizontal bias for L2
// ===========================================

interface MarketBiasBarProps {
  markets: {
    market: string;
    flow7d: number;
    phase: string;
  }[];
}

export function MarketBiasBar({ markets }: MarketBiasBarProps) {
  if (!markets || markets.length === 0) {
    return <p className="text-sm text-gray-400">No data</p>;
  }

  const sorted = [...markets].sort((a, b) => b.flow7d - a.flow7d);
  const maxFlow = Math.max(...sorted.map((m) => Math.abs(m.flow7d)), 1);

  const marketIcons: Record<string, string> = {
    crypto: 'C',
    stocks: 'S',
    bonds: 'B',
    metals: 'M',
    bist: 'I',
  };

  return (
    <div className="space-y-3">
      {sorted.slice(0, 3).map((m) => {
        const pct = Math.min(Math.abs(m.flow7d) / maxFlow, 1) * 100;
        const isPositive = m.flow7d >= 0;

        return (
          <div key={m.market} className="flex items-center gap-3">
            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[#1E293B] text-gray-400 shrink-0">
              {marketIcons[m.market] || m.market.charAt(0).toUpperCase()}
            </span>
            <span className="w-14 text-xs font-medium text-gray-400 capitalize truncate">
              {m.market}
            </span>
            <div className="flex-1 h-2 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  isPositive ? 'bg-[#5EEDC3]' : 'bg-[#EF5A6F]'
                )}
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span
              className={cn(
                'w-14 text-right text-xs font-bold tabular-nums',
                isPositive ? 'text-[#5EEDC3]' : 'text-[#EF5A6F]'
              )}
            >
              {isPositive ? '+' : ''}
              {m.flow7d.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
