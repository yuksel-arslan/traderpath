'use client';

import { TerminalSummaryBar } from './TerminalSummaryBar';

interface MarketFlowData {
  market: string;
  flow7d: number;
  flow30d: number;
  velocity: number;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  marketCap: string;
}

interface MarketFlowProps {
  flows: MarketFlowData[];
  interpretation?: string;
}

const phaseConfig: Record<string, { color: string; bg: string; label: string }> = {
  EARLY: { color: '#00F5A0', bg: 'rgba(0,245,160,0.12)', label: 'Accumulation' },
  MID: { color: '#FFB800', bg: 'rgba(255,184,0,0.12)', label: 'Momentum' },
  LATE: { color: '#A855F7', bg: 'rgba(168,85,247,0.12)', label: 'Distribution' },
  EXIT: { color: '#FF4757', bg: 'rgba(255,71,87,0.12)', label: 'Rotation out' },
};

function FlowCard({ flow }: { flow: MarketFlowData }) {
  const phase = phaseConfig[flow.phase] || phaseConfig.MID;
  const isPositive = flow.flow7d > 0;
  const barWidth = Math.min(Math.abs(flow.flow7d) * 10, 100);

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Market name + phase badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: phase.color }}
          />
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {flow.market}
          </span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
          style={{ background: phase.bg, color: phase.color }}
        >
          {flow.phase}
        </span>
      </div>

      {/* 7D change big */}
      <span
        className={`text-lg font-bold tabular-nums ${isPositive ? 'text-[#00F5A0]' : 'text-[#FF4757]'}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {isPositive ? '+' : ''}
        {flow.flow7d.toFixed(1)}%
        <span className="text-[10px] text-gray-400 dark:text-white/30 ml-1 font-normal">
          7D
        </span>
      </span>

      {/* Flow strength bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-800"
          style={{
            width: `${barWidth}%`,
            backgroundColor: phase.color,
          }}
        />
      </div>

      {/* 30D + velocity */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-white/40">
        <span className="font-mono tabular-nums">
          30D: {flow.flow30d > 0 ? '+' : ''}
          {flow.flow30d.toFixed(1)}%
        </span>
        <span className="font-mono tabular-nums">
          v:{flow.velocity > 0 ? '+' : ''}
          {flow.velocity.toFixed(1)}
        </span>
      </div>

    </div>
  );
}

export function MarketFlow({ flows, interpretation }: MarketFlowProps) {
  // Build summary: find leading and exiting markets
  const sorted = [...flows].sort((a, b) => b.flow7d - a.flow7d);
  const leading = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const summaryText = leading
    ? `Capital Rotation: ${leading.market} leading (${leading.flow7d > 0 ? '+' : ''}${leading.flow7d.toFixed(1)}%)${weakest && weakest.flow7d < 0 ? `, ${weakest.market} exiting` : ''}`
    : 'Loading market flow data...';

  const summaryStatus =
    leading && leading.flow7d > 2 ? 'positive' : leading && leading.flow7d < -2 ? 'negative' : ('neutral' as const);

  return (
    <section>
      <TerminalSummaryBar
        title={summaryText}
        subtitle={`${flows.length} markets tracked`}
        status={summaryStatus}
      />

      {/* Flow cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {flows.map((f) => (
          <FlowCard key={f.market} flow={f} />
        ))}
      </div>

      {/* Rotation Signal */}
      <div
        className="rounded-xl p-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderLeftWidth: 2,
          borderLeftColor: '#00D4FF',
        }}
      >
        <span className="text-[10px] uppercase tracking-widest text-[#00D4FF] block mb-1.5">
          Rotation Signal
        </span>
        <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
          {interpretation ||
            (flows.length > 0
              ? 'Market flow data loaded. Review capital rotation signals above.'
              : 'Loading rotation signal...')}
        </p>
      </div>
    </section>
  );
}
