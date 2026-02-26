'use client';

import { Sparkline, PulseDot } from '../ui/intelligence';
import { TerminalSummaryBar } from './TerminalSummaryBar';

interface MacroMetric {
  label: string;
  value: string;
  delta?: number;
  signal?: 'bullish' | 'bearish' | 'neutral';
  history?: number[];
}

interface GlobalLiquidityProps {
  metrics: MacroMetric[];
  interpretation?: string;
  regime?: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL';
  confidence?: number;
}

function MetricCard({ metric }: { metric: MacroMetric }) {
  const borderColor =
    metric.signal === 'bullish'
      ? 'rgba(0,245,160,0.15)'
      : metric.signal === 'bearish'
      ? 'rgba(255,71,87,0.15)'
      : 'rgba(255,255,255,0.06)';

  const dotColor =
    metric.signal === 'bullish'
      ? '#00F5A0'
      : metric.signal === 'bearish'
      ? '#FF4757'
      : '#6B7280';

  const deltaColor =
    (metric.delta ?? 0) > 0
      ? 'text-[#00F5A0]'
      : (metric.delta ?? 0) < 0
      ? 'text-[#FF4757]'
      : 'text-gray-400 dark:text-white/40';

  const sparkColor =
    metric.signal === 'bullish'
      ? '#00F5A0'
      : metric.signal === 'bearish'
      ? '#FF4757'
      : '#6B7280';

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Label + status dot */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40 truncate">
          {metric.label}
        </span>
      </div>

      {/* Big value */}
      <span
        className="text-xl font-bold text-gray-900 dark:text-white tabular-nums"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {metric.value}
      </span>

      {/* Change + Sparkline row */}
      <div className="flex items-end justify-between">
        <span className={`text-xs font-mono tabular-nums ${deltaColor}`}>
          {metric.delta !== undefined
            ? `${metric.delta > 0 ? '+' : ''}${metric.delta.toFixed(1)}%`
            : '--'}
        </span>
        {metric.history && metric.history.length > 0 && (
          <Sparkline data={metric.history} width={80} height={24} color={sparkColor} />
        )}
      </div>
    </div>
  );
}

export function GlobalLiquidity({
  metrics,
  interpretation,
  regime = 'NEUTRAL',
  confidence = 50,
}: GlobalLiquidityProps) {
  const regimeLabel =
    regime === 'EXPANDING'
      ? 'Global Liquidity: EXPANDING'
      : regime === 'CONTRACTING'
      ? 'Global Liquidity: CONTRACTING'
      : 'Global Liquidity: NEUTRAL';

  const regimeStatus =
    regime === 'EXPANDING'
      ? 'positive'
      : regime === 'CONTRACTING'
      ? 'negative'
      : ('neutral' as const);

  const summary =
    metrics.length > 0
      ? metrics
          .filter((m) => m.label === 'M2 Supply')
          .map(
            (m) =>
              `Net Liquidity ${m.value}, M2 ${(m.delta ?? 0) > 0 ? 'expanding' : 'contracting'} ${m.delta !== undefined ? `${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)}%` : ''}`
          )[0] ?? 'Loading macro data...'
      : 'Loading macro data...';

  const interpBorderColor =
    regime === 'EXPANDING'
      ? '#00F5A0'
      : regime === 'CONTRACTING'
      ? '#FF4757'
      : '#FFB800';

  return (
    <section>
      <TerminalSummaryBar
        title={regimeLabel}
        subtitle={summary}
        score={Math.round(confidence)}
        status={regimeStatus}
        live
      />

      {/* Macro indicators 3x2 grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {/* Interpretation box */}
      <div
        className="rounded-xl p-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderLeftWidth: 2,
          borderLeftColor: interpBorderColor,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={interpBorderColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40">
            Interpretation
          </span>
          {confidence > 0 && (
            <span className="text-[10px] font-mono text-gray-400 dark:text-white/30 ml-auto">
              {confidence}% confidence
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
          {interpretation ||
            (metrics.length > 0
              ? 'Global liquidity data loaded. Macro conditions are being assessed.'
              : 'Loading interpretation...')}
        </p>
      </div>
    </section>
  );
}
