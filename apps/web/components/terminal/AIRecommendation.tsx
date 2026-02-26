'use client';

import { cn } from '../../lib/utils';
import { ScoreRing, PulseDot, VerdictBadge } from '../ui/intelligence';
import { TerminalSummaryBar } from './TerminalSummaryBar';

interface DecisionGate {
  label: string;
  passed: boolean;
  detail: string;
}

interface VerdictOpportunity {
  action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
  market: string;
  confidence: number;
  reason: string;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  suggestedAssets: string[];
}

interface VerdictData {
  gates: DecisionGate[];
  buy: VerdictOpportunity | null;
  sell: VerdictOpportunity | null;
  regime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
  timestamp: string;
}

interface AIRecommendationProps {
  verdict: VerdictData;
  onAssetClick?: (symbol: string) => void;
}

function SignalCard({
  opportunity,
  type,
  onAssetClick,
}: {
  opportunity: VerdictOpportunity;
  type: 'buy' | 'sell';
  onAssetClick?: (symbol: string) => void;
}) {
  const isBuy = type === 'buy';
  const color = isBuy ? '#00F5A0' : '#FF4757';
  const barBg = isBuy ? 'rgba(0,245,160,0.15)' : 'rgba(255,71,87,0.15)';

  const phaseColors: Record<string, string> = {
    EARLY: '#00F5A0',
    MID: '#FFB800',
    LATE: '#A855F7',
    EXIT: '#FF4757',
  };

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2.5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}15`,
        borderLeftWidth: 2,
        borderLeftColor: color,
      }}
    >
      {/* Header: Action + Market + Phase */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-bold"
            style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {opportunity.action}
          </span>
          <span className="text-[10px] uppercase text-gray-400 dark:text-white/40">
            {opportunity.market}
          </span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
          style={{
            color: phaseColors[opportunity.phase] || '#FFB800',
            background: `${phaseColors[opportunity.phase] || '#FFB800'}15`,
          }}
        >
          {opportunity.phase}
        </span>
      </div>

      {/* ScoreRing + Confidence bar */}
      <div className="flex items-center gap-3">
        <ScoreRing
          score={opportunity.confidence}
          size={40}
          strokeWidth={3}
          color={color}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40">
              Confidence
            </span>
            <span
              className="text-xs font-bold font-mono tabular-nums"
              style={{ color }}
            >
              {opportunity.confidence}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${opportunity.confidence}%`, backgroundColor: color }}
            />
          </div>
        </div>
      </div>

      {/* Reason */}
      <p className="text-[10px] text-gray-500 dark:text-white/40 leading-relaxed">
        {opportunity.reason}
      </p>

      {/* Asset chips */}
      {opportunity.suggestedAssets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {opportunity.suggestedAssets.map((s) => (
            <button
              key={s}
              onClick={() => onAssetClick?.(s)}
              className="px-2 py-0.5 text-[10px] font-mono rounded transition-colors hover:bg-[#00D4FF]/10"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AIRecommendation({ verdict, onAssetClick }: AIRecommendationProps) {
  const passedCount = verdict.gates.filter((g) => g.passed).length;
  const totalGates = verdict.gates.length;

  const regimeConfig: Record<string, { label: string; color: string; glow: string }> = {
    RISK_ON: { label: 'RISK ON', color: '#00F5A0', glow: 'rgba(0,245,160,0.08)' },
    RISK_OFF: { label: 'RISK OFF', color: '#FF4757', glow: 'rgba(255,71,87,0.08)' },
    NEUTRAL: { label: 'NEUTRAL', color: '#FFB800', glow: 'rgba(255,184,0,0.08)' },
  };

  const regime = regimeConfig[verdict.regime] || regimeConfig.NEUTRAL;
  const compositeScore = totalGates > 0 ? Math.round((passedCount / totalGates) * 100) : 0;

  return (
    <section>
      {/* Decision Bar (PrimaryDecision style) */}
      <div
        className="rounded-xl p-3 mb-4 flex items-center justify-between"
        style={{
          background: regime.glow,
          border: `1px solid ${regime.color}20`,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-bold tracking-wider"
            style={{ color: regime.color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {regime.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-white/40">
            {passedCount}/{totalGates} gates passed
          </span>
          <PulseDot color={regime.color} size={6} />
        </div>
        <div className="flex items-center gap-3">
          <ScoreRing score={compositeScore} size={36} strokeWidth={3} color={regime.color} />
          <span className="text-[10px] font-mono text-gray-400 dark:text-white/40 tabular-nums">
            {verdict.timestamp}
          </span>
        </div>
      </div>

      <TerminalSummaryBar
        title="AI Recommendation Engine"
        subtitle={`${passedCount}/${totalGates} gates passed — ${regime.label.toLowerCase()} market conditions`}
        score={compositeScore}
        status={verdict.regime === 'RISK_ON' ? 'positive' : verdict.regime === 'RISK_OFF' ? 'negative' : 'neutral'}
      />

      {/* Gate check list */}
      <div
        className="rounded-xl p-3 mb-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40 block mb-2">
          Decision Gates
        </span>
        <div className="space-y-2">
          {verdict.gates.map((gate, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg p-2 transition-colors"
              style={{
                borderLeft: `2px solid ${gate.passed ? '#00F5A0' : '#FF4757'}`,
                background: gate.passed
                  ? 'rgba(0,245,160,0.03)'
                  : 'rgba(255,71,87,0.03)',
              }}
            >
              <span className="shrink-0 mt-0.5">
                {gate.passed ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00F5A0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF4757" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-gray-900 dark:text-white block">
                  {gate.label}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-white/40 block">
                  {gate.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BUY / SELL signal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {verdict.buy ? (
          <SignalCard opportunity={verdict.buy} type="buy" onAssetClick={onAssetClick} />
        ) : (
          <div
            className="rounded-xl p-4 flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span className="text-[10px] text-gray-400 dark:text-white/40">
              No BUY signal
            </span>
          </div>
        )}
        {verdict.sell ? (
          <SignalCard opportunity={verdict.sell} type="sell" onAssetClick={onAssetClick} />
        ) : (
          <div
            className="rounded-xl p-4 flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span className="text-[10px] text-gray-400 dark:text-white/40">
              No SELL signal
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
