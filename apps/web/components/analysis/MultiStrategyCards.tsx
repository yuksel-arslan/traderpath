'use client';

import { useState } from 'react';
import {
  Zap,
  ArrowDown,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  Target,
  Star,
} from 'lucide-react';

interface StrategyPlan {
  id: string;
  label: string;
  applicability: number;
  direction: 'long' | 'short';
  entry: { price: number; type: 'market' | 'limit' | 'stop'; condition: string };
  stopLoss: { price: number; reason: string };
  takeProfits: Array<{ price: number; label: string; weight: number }>;
  riskReward: number;
  reasoning: string;
  counterFlow?: boolean;
}

interface MultiStrategyCardsProps {
  strategies: StrategyPlan[];
  recommended: string;
  currentPrice: number;
}

const STRATEGY_ICONS: Record<string, typeof Zap> = {
  breakout: Zap,
  pullback: ArrowDown,
  trend_following: TrendingUp,
  range: BarChart2,
};

const STRATEGY_COLORS: Record<string, { border: string; glow: string; iconBg: string }> = {
  breakout: {
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    iconBg: 'bg-amber-500/10 text-amber-400',
  },
  pullback: {
    border: 'border-sky-500/30',
    glow: 'shadow-sky-500/20',
    iconBg: 'bg-sky-500/10 text-sky-400',
  },
  trend_following: {
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
  },
  range: {
    border: 'border-violet-500/30',
    glow: 'shadow-violet-500/20',
    iconBg: 'bg-violet-500/10 text-violet-400',
  },
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

function getApplicabilityColor(score: number): { bar: string; text: string } {
  if (score > 70) return { bar: 'bg-green-500', text: 'text-green-400' };
  if (score >= 40) return { bar: 'bg-amber-500', text: 'text-amber-400' };
  return { bar: 'bg-red-500', text: 'text-red-400' };
}

function StrategyCard({
  strategy,
  isRecommended,
  currentPrice,
}: {
  strategy: StrategyPlan;
  isRecommended: boolean;
  currentPrice: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const Icon = STRATEGY_ICONS[strategy.id] || BarChart2;
  const colors = STRATEGY_COLORS[strategy.id] || STRATEGY_COLORS.range;
  const applicabilityColor = getApplicabilityColor(strategy.applicability);
  const isLong = strategy.direction === 'long';

  const entryPrice = strategy.entry?.price ?? 0;
  const slPrice = strategy.stopLoss?.price ?? 0;
  const rr = strategy.riskReward ?? 0;
  const tps = strategy.takeProfits ?? [];

  const entryDistance = currentPrice > 0 && entryPrice > 0
    ? (((entryPrice - currentPrice) / currentPrice) * 100)
    : 0;

  return (
    <div
      className={`
        relative rounded-xl border backdrop-blur-md transition-all duration-300
        bg-white/5 dark:bg-slate-900/60
        ${isRecommended ? `${colors.border} shadow-lg ${colors.glow}` : 'border-slate-200/20 dark:border-slate-700/40'}
        hover:border-slate-300/40 dark:hover:border-slate-600/60
        cursor-pointer
      `}
      onClick={() => setExpanded((prev) => !prev)}
    >
      {/* Recommended glow effect */}
      {isRecommended && (
        <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[#22C55E]/20 via-transparent to-[#22C55E]/20 blur-sm pointer-events-none" />
      )}

      <div className="relative p-4">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto] items-start gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${colors.iconBg}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {strategy.label}
                </h3>
                {isRecommended && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm shadow-[#22C55E]/10">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Recommended
                  </span>
                )}
                {strategy.counterFlow && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Counter-Trend
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direction badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                isLong
                  ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                  : 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30'
              }`}
            >
              {strategy.direction}
            </span>
            {/* Expand toggle */}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Applicability bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Applicability</span>
            <span className={`text-xs font-bold ${applicabilityColor.text}`}>
              {strategy.applicability}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200/30 dark:bg-slate-700/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${applicabilityColor.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, strategy.applicability))}%` }}
            />
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {/* Entry */}
          <div className="rounded-lg bg-slate-100/50 dark:bg-slate-800/50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium mb-0.5">
              Entry ({strategy.entry?.type || 'limit'})
            </p>
            <p className="text-xs font-bold text-slate-900 dark:text-white notranslate">
              ${formatPrice(entryPrice)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 notranslate">
              {entryDistance >= 0 ? '+' : ''}{entryDistance.toFixed(1)}%
            </p>
          </div>

          {/* Stop Loss */}
          <div className="rounded-lg bg-[#F43F5E]/5 dark:bg-[#F43F5E]/10 p-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium mb-0.5">
              Stop Loss
            </p>
            <p className="text-xs font-bold text-[#F43F5E] notranslate">
              ${formatPrice(slPrice)}
            </p>
          </div>

          {/* R:R */}
          <div className="rounded-lg bg-slate-100/50 dark:bg-slate-800/50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium mb-0.5">
              Risk:Reward
            </p>
            <p className={`text-xs font-bold notranslate ${
              rr >= 2 ? 'text-[#22C55E]' : rr >= 1 ? 'text-amber-400' : 'text-[#F43F5E]'
            }`}>
              1:{rr.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Take Profits */}
        <div className="mt-3 space-y-1.5">
          {tps.map((tp, idx) => {
            const tpDistance = currentPrice > 0
              ? (((tp.price - currentPrice) / currentPrice) * 100)
              : 0;
            return (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3 text-[#22C55E]" />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    {tp.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ({tp.weight}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#22C55E] notranslate">
                    ${formatPrice(tp.price)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 notranslate">
                    {tpDistance >= 0 ? '+' : ''}{tpDistance.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded section */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-slate-200/20 dark:border-slate-700/30 space-y-3">
            {/* Entry condition */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium mb-1">
                Entry Condition
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {strategy.entry?.condition || 'N/A'}
              </p>
            </div>

            {/* Stop Loss reason */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium mb-1">
                Stop Loss Rationale
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {strategy.stopLoss?.reason || 'N/A'}
              </p>
            </div>

            {/* Full reasoning */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium mb-1">
                Strategy Reasoning
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {strategy.reasoning}
              </p>
            </div>

            {/* Counter-flow warning */}
            {strategy.counterFlow && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300 leading-relaxed">
                  This strategy goes against the current Capital Flow direction. Consider reduced position size and tighter risk management.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MultiStrategyCards({ strategies, recommended, currentPrice }: MultiStrategyCardsProps) {
  if (!strategies || strategies.length === 0) return null;

  const sorted = [...strategies].sort((a, b) => b.applicability - a.applicability);

  return (
    <div className="w-full">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10">
            <BarChart2 className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Multi-Strategy Plans
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sorted.length} alternative strategies generated
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 notranslate">
          Current: ${formatPrice(currentPrice)}
        </span>
      </div>

      {/* Strategy grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isRecommended={strategy.id === recommended}
            currentPrice={currentPrice}
          />
        ))}
      </div>
    </div>
  );
}
