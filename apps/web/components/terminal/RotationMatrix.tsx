'use client';

import { ScoreRing, FlowArrow } from '../ui/intelligence';
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

interface RotationMatrixProps {
  flows: MarketFlowData[];
}

const phaseColors: Record<string, string> = {
  EARLY: '#00F5A0',
  MID: '#FFB800',
  LATE: '#A855F7',
  EXIT: '#FF4757',
};

const phasePositions: Record<string, number> = {
  EARLY: 10,
  MID: 35,
  LATE: 60,
  EXIT: 85,
};

export function RotationMatrix({ flows }: RotationMatrixProps) {
  // Sort by flow strength for display
  const sorted = [...flows].sort((a, b) => b.flow7d - a.flow7d);
  const dominant = sorted[0];
  const exiting = sorted.filter((f) => f.phase === 'EXIT' || f.flow7d < -2);

  const summaryText = dominant
    ? `Rotation: ${dominant.market} dominant${exiting.length > 0 ? `, ${exiting.map((e) => e.market).join(', ')} exiting` : ''}`
    : 'Loading rotation data...';

  return (
    <section>
      <TerminalSummaryBar
        title={summaryText}
        subtitle={`${flows.length} markets in rotation analysis`}
        status={dominant && dominant.flow7d > 2 ? 'positive' : dominant && dominant.flow7d < -2 ? 'negative' : 'neutral'}
      />

      {/* Rotation rings with flow arrows */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {sorted.map((f, i) => {
            const isPositive = f.flow7d > 0;
            const scoreNormalized = Math.min(
              100,
              Math.max(0, Math.round((Math.abs(f.flow7d) / 10) * 100))
            );
            const ringColor = isPositive ? '#00F5A0' : '#FF4757';

            return (
              <div key={f.market} className="flex items-center gap-1">
                <div className="text-center">
                  <ScoreRing
                    score={scoreNormalized}
                    size={64}
                    strokeWidth={4}
                    color={ringColor}
                  />
                  <div className="mt-2">
                    <span className="text-[10px] text-gray-400 dark:text-white/40 block">
                      {f.market}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5"
                      style={{
                        color: phaseColors[f.phase] || '#FFB800',
                        background: `${phaseColors[f.phase] || '#FFB800'}15`,
                      }}
                    >
                      {f.phase}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold font-mono block mt-1 ${isPositive ? 'text-[#00F5A0]' : 'text-[#FF4757]'}`}
                  >
                    {isPositive ? '+' : ''}
                    {f.flow7d.toFixed(0)}
                  </span>
                </div>
                {i < sorted.length - 1 && (
                  <FlowArrow
                    color={
                      sorted[i + 1].flow7d > f.flow7d
                        ? '#FF4757'
                        : '#00F5A0'
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase timeline */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40 block mb-3">
          Phase Timeline
        </span>

        {/* Timeline bar */}
        <div className="relative h-2 rounded-full overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {/* Phase segments */}
          <div className="absolute inset-0 flex">
            <div className="flex-1" style={{ background: `${phaseColors.EARLY}30` }} />
            <div className="flex-1" style={{ background: `${phaseColors.MID}30` }} />
            <div className="flex-1" style={{ background: `${phaseColors.LATE}30` }} />
            <div className="flex-1" style={{ background: `${phaseColors.EXIT}30` }} />
          </div>

          {/* Market dots on timeline */}
          {flows.map((f) => (
            <div
              key={f.market}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
              style={{
                left: `${phasePositions[f.phase] || 50}%`,
                backgroundColor: phaseColors[f.phase] || '#FFB800',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        {/* Phase labels */}
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-white/40 mb-4">
          <span style={{ color: phaseColors.EARLY }}>EARLY</span>
          <span style={{ color: phaseColors.MID }}>MID</span>
          <span style={{ color: phaseColors.LATE }}>LATE</span>
          <span style={{ color: phaseColors.EXIT }}>EXIT</span>
        </div>

        {/* Market labels under their dots */}
        <div className="flex flex-wrap gap-3 justify-center">
          {flows.map((f) => (
            <span
              key={f.market}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                color: phaseColors[f.phase] || '#FFB800',
                background: `${phaseColors[f.phase] || '#FFB800'}10`,
              }}
            >
              {f.market}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
