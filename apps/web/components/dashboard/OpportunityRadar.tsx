'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketFlow {
  market: string;
  flow7d: number;
  flow30d: number;
  phase: string;
  daysInPhase: number;
  rotationSignal: string | null;
}

type MarketType = 'crypto' | 'bist' | 'forex' | 'metals' | 'bonds';

interface OpportunityRadarProps {
  capitalFlow: {
    markets: MarketFlow[];
    recommendation: {
      primaryMarket: string;
      confidence: number;
      action: string;
    };
  } | null;
  selectedMarkets: MarketType[];
  onMarketChange?: (markets: MarketType[]) => void;
}

const FILTER_OPTIONS: { id: MarketType; label: string }[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'bist', label: 'BIST' },
  { id: 'forex', label: 'Stocks' },
  { id: 'metals', label: 'Metals' },
  { id: 'bonds', label: 'Bonds' },
];

const PHASE_DOT: Record<string, string> = {
  early: 'bg-green-500',
  mid: 'bg-yellow-500',
  late: 'bg-orange-500',
  exit: 'bg-red-500',
};

const MARKET_LABEL: Record<string, string> = {
  crypto: 'Crypto',
  stocks: 'Stocks',
  bist: 'BIST',
  metals: 'Metals',
  bonds: 'Bonds',
};

function matchesFilter(market: string, selectedMarkets: string[]): boolean {
  if (market === 'crypto' && selectedMarkets.includes('crypto')) return true;
  if (market === 'stocks' && selectedMarkets.includes('forex')) return true;
  if (market === 'bist' && selectedMarkets.includes('bist')) return true;
  if (market === 'metals' && selectedMarkets.includes('metals')) return true;
  if (market === 'bonds' && selectedMarkets.includes('bonds')) return true;
  return false;
}

const PHASE_ORDER: Record<string, number> = { early: 0, mid: 1, late: 2, exit: 3 };

export function OpportunityRadar({ capitalFlow, selectedMarkets, onMarketChange }: OpportunityRadarProps) {
  const toggleMarket = (market: MarketType) => {
    if (!onMarketChange) return;
    if (selectedMarkets.includes(market)) {
      if (selectedMarkets.length === 1) return;
      onMarketChange(selectedMarkets.filter((m) => m !== market));
    } else {
      onMarketChange([...selectedMarkets, market]);
    }
  };

  const markets = capitalFlow?.markets?.length
    ? [...capitalFlow.markets]
        .filter((m) => matchesFilter(m.market, selectedMarkets))
        .filter((m) =>
          m.market === capitalFlow.recommendation.primaryMarket ||
          m.phase === 'early' ||
          m.phase === 'mid' ||
          m.flow7d > 0
        )
        .sort((a, b) => {
          const pm = capitalFlow.recommendation.primaryMarket;
          if (a.market === pm && b.market !== pm) return -1;
          if (b.market === pm && a.market !== pm) return 1;
          const pd = (PHASE_ORDER[a.phase] ?? 2) - (PHASE_ORDER[b.phase] ?? 2);
          return pd !== 0 ? pd : b.flow7d - a.flow7d;
        })
    : [];

  const primaryMarket = capitalFlow?.recommendation.primaryMarket;

  return (
    <div className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
          Opportunity Radar
        </span>
        <Link
          href="/flow"
          className="text-[10px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Details &rarr;
        </Link>
      </div>

      {/* Filter pills */}
      {onMarketChange && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = selectedMarkets.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleMarket(opt.id)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all select-none',
                  isActive
                    ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/40'
                    : 'bg-gray-100 dark:bg-white/[0.04] text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-white/[0.06]'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Markets — single row */}
      {markets.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-white/30">No active opportunities</p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {markets.map((m) => {
            const isPrimary = m.market === primaryMarket;
            const isPos = m.flow7d >= 0;
            const dotColor = PHASE_DOT[m.phase] || 'bg-gray-400';
            const label = MARKET_LABEL[m.market] || m.market;

            return (
              <div
                key={m.market}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isPrimary
                    ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                    : 'bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08]'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
                <span>{label}</span>
                {isPrimary && <Zap className="w-3 h-3 text-teal-500" />}
                <span
                  className={cn(
                    'text-[10px] font-mono',
                    isPos ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {isPos ? '+' : ''}{m.flow7d.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
