'use client';

import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Zap, Minus } from 'lucide-react';

interface MarketFlow {
  market: string;
  flow7d: number;
  flow30d: number;
  phase: string;
  daysInPhase: number;
  rotationSignal: string | null;
}

interface OpportunityRadarProps {
  capitalFlow: {
    markets: MarketFlow[];
    recommendation: {
      primaryMarket: string;
      confidence: number;
      action: string;
    };
  } | null;
  selectedMarkets: string[];
}

const PHASE_CONFIG: Record<string, { label: string; textColor: string; bgColor: string }> = {
  early: { label: 'EARLY', textColor: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-500/10' },
  mid:   { label: 'MID',   textColor: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10' },
  late:  { label: 'LATE',  textColor: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-500/10' },
  exit:  { label: 'EXIT',  textColor: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-500/10' },
};

const MARKET_META: Record<string, { icon: string; label: string; desc: string }> = {
  crypto: { icon: '₿', label: 'Crypto',  desc: 'Digital assets' },
  stocks: { icon: '📊', label: 'Stocks',  desc: 'Equity markets' },
  metals: { icon: '🥇', label: 'Metals',  desc: 'Gold, Silver' },
  bonds:  { icon: '📄', label: 'Bonds',   desc: 'Fixed income' },
};

function matchesFilter(market: string, selectedMarkets: string[]): boolean {
  if (market === 'crypto'  && selectedMarkets.includes('crypto'))  return true;
  if (market === 'stocks'  && (selectedMarkets.includes('bist') || selectedMarkets.includes('stocks'))) return true;
  if (market === 'metals'  && selectedMarkets.includes('metals'))  return true;
  if (market === 'bonds'   && selectedMarkets.includes('bonds'))   return true;
  return false;
}

const PHASE_ORDER: Record<string, number> = { early: 0, mid: 1, late: 2, exit: 3 };

function RotationSignal({ signal }: { signal: string | null }) {
  if (signal === 'entering') return (
    <span className="flex items-center gap-0.5 text-green-500">
      <ArrowUpRight className="w-3.5 h-3.5" />
      <span className="text-xs">Entering</span>
    </span>
  );
  if (signal === 'exiting') return (
    <span className="flex items-center gap-0.5 text-red-500">
      <ArrowDownRight className="w-3.5 h-3.5" />
      <span className="text-xs">Exiting</span>
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-gray-400">
      <Minus className="w-3 h-3" />
      <span className="text-xs">Stable</span>
    </span>
  );
}

export function OpportunityRadar({ capitalFlow, selectedMarkets }: OpportunityRadarProps) {
  if (!capitalFlow?.markets?.length) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-[#111111]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Opportunity Radar</h3>
        <p className="text-sm text-gray-500">No market data available.</p>
      </div>
    );
  }

  const primaryMarket = capitalFlow.recommendation.primaryMarket;

  // Only show markets that Capital Flow recommends (positive flow or early/mid phase)
  // Exit-phase markets are excluded — they represent outflows, not opportunities
  const markets = [...capitalFlow.markets]
    .filter((m) => matchesFilter(m.market, selectedMarkets))
    .filter((m) => m.market === primaryMarket || m.phase === 'early' || m.phase === 'mid' || m.flow7d > 0)
    .sort((a, b) => {
      // Primary market always first
      if (a.market === primaryMarket && b.market !== primaryMarket) return -1;
      if (b.market === primaryMarket && a.market !== primaryMarket) return 1;
      const pd = (PHASE_ORDER[a.phase] ?? 2) - (PHASE_ORDER[b.phase] ?? 2);
      return pd !== 0 ? pd : b.flow7d - a.flow7d;
    });

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Opportunity Radar</h3>
          <p className="text-sm text-gray-500 mt-0.5">Capital Flow recommended markets</p>
        </div>
        <Link
          href="/flow"
          className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          All markets →
        </Link>
      </div>

      {/* ── MOBILE: card list ── */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
        {markets.map((market) => {
          const phase    = PHASE_CONFIG[market.phase] ?? PHASE_CONFIG.mid;
          const meta     = MARKET_META[market.market] ?? { icon: '?', label: market.market, desc: '' };
          const isPos    = market.flow7d >= 0;
          const isPrimary = primaryMarket === market.market;
          const canAnalyze = market.phase !== 'exit';

          return (
            <div key={market.market} className={`px-4 py-4 ${isPrimary ? 'bg-teal-50/40 dark:bg-teal-500/5' : ''}`}>
              {/* Row 1: icon + name + phase badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm shrink-0">
                    {meta.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{meta.label}</span>
                      {isPrimary && <Zap className="w-3 h-3 text-teal-500" />}
                    </div>
                    <span className="text-xs text-gray-400">{market.daysInPhase}d in phase</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${phase.textColor} ${phase.bgColor}`}>
                  {phase.label}
                </span>
              </div>

              {/* Row 2: flow + rotation + action */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold font-mono ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                    {isPos ? '+' : ''}{market.flow7d.toFixed(1)}%
                  </span>
                  <RotationSignal signal={market.rotationSignal} />
                </div>
                {canAnalyze ? (
                  <Link
                    href="/analyze"
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-teal-500 hover:bg-teal-600 text-white transition-colors"
                  >
                    Analyze
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-red-500">Avoid</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="hidden sm:block">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 px-6 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <span className="col-span-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Market</span>
          <span className="col-span-2 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Phase</span>
          <span className="col-span-2 text-[11px] font-medium text-gray-400 uppercase tracking-wide text-right">7d Flow</span>
          <span className="col-span-2 text-[11px] font-medium text-gray-400 uppercase tracking-wide text-right">Signal</span>
          <span className="col-span-2 text-[11px] font-medium text-gray-400 uppercase tracking-wide text-right">Action</span>
        </div>

        {/* Table rows */}
        <div>
          {markets.map((market, idx) => {
            const phase      = PHASE_CONFIG[market.phase] ?? PHASE_CONFIG.mid;
            const meta       = MARKET_META[market.market] ?? { icon: '?', label: market.market, desc: '' };
            const isPos      = market.flow7d >= 0;
            const isPrimary  = primaryMarket === market.market;
            const canAnalyze = market.phase !== 'exit';
            const isLast     = idx === markets.length - 1;

            return (
              <div
                key={market.market}
                className={`grid grid-cols-12 gap-3 px-6 py-4 items-center transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                  !isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''
                } ${isPrimary ? 'bg-teal-50/40 dark:bg-teal-500/5' : ''}`}
              >
                {/* Market */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm shrink-0">
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{meta.label}</p>
                      {isPrimary && <Zap className="w-3 h-3 text-teal-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{market.daysInPhase}d in phase</p>
                  </div>
                </div>

                {/* Phase */}
                <div className="col-span-2">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${phase.textColor} ${phase.bgColor}`}>
                    {phase.label}
                  </span>
                </div>

                {/* 7d Flow */}
                <div className="col-span-2 text-right">
                  <span className={`text-sm font-semibold font-mono ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                    {isPos ? '+' : ''}{market.flow7d.toFixed(1)}%
                  </span>
                </div>

                {/* Signal */}
                <div className="col-span-2 flex items-center justify-end">
                  <RotationSignal signal={market.rotationSignal} />
                </div>

                {/* Action */}
                <div className="col-span-2 flex justify-end">
                  {canAnalyze ? (
                    <Link
                      href="/analyze"
                      className="text-xs font-medium px-3 py-1.5 rounded-md bg-teal-500 hover:bg-teal-600 text-white transition-colors"
                    >
                      Analyze
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-red-500">Avoid</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
