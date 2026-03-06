'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn, formatPrice, formatNumber } from '../../lib/utils';
import { ScoreRing, VerdictBadge } from '../ui/intelligence';
import { TerminalSummaryBar } from './TerminalSummaryBar';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const CoinIcon = dynamic(
  () => import('../common/CoinIcon').then((mod) => ({ default: mod.CoinIcon })),
  {
    ssr: false,
    loading: () => (
      <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse shrink-0" />
    ),
  }
);

interface ScreenerAsset {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  aiScore: number;
  trend: 'STRONG_UP' | 'UP' | 'FLAT' | 'DOWN' | 'STRONG_DOWN';
  verdict: 'GO' | 'COND' | 'WAIT' | 'AVOID';
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  market: string;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  rsi: number;
  macd: 'bullish' | 'bearish' | 'neutral';
  flowScore: number;
  analysisId?: string;
}

type SortKey = 'rank' | 'symbol' | 'price' | 'change24h' | 'volume' | 'aiScore' | 'trend';
type SortDir = 'asc' | 'desc';

interface AssetTableProps {
  assets: ScreenerAsset[];
  selectedSymbol: string | null;
  onSelect: (asset: ScreenerAsset) => void;
  recommendedSymbols?: string[];
  onAnalyze?: (symbol: string) => void;
  onVisualize?: (symbol: string) => void;
}

export function AssetTable({
  assets,
  selectedSymbol,
  onSelect,
  recommendedSymbols = [],
  onAnalyze,
  onVisualize,
}: AssetTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('aiScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [marketFilter, setMarketFilter] = useState('All');
  const [verdictFilter, setVerdictFilter] = useState('All');

  const markets = useMemo(() => {
    const unique = new Set(assets.map((a) => a.market));
    return ['All', ...Array.from(unique)];
  }, [assets]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey]
  );

  const recSet = useMemo(
    () => new Set(recommendedSymbols.map((s) => s.toUpperCase())),
    [recommendedSymbols]
  );

  const filtered = useMemo(() => {
    let result = [...assets];

    if (marketFilter !== 'All') {
      result = result.filter((a) => a.market === marketFilter);
    }

    if (verdictFilter !== 'All') {
      result = result.filter((a) => a.verdict === verdictFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortKey) {
        case 'rank': va = a.rank; vb = b.rank; break;
        case 'symbol': va = a.symbol; vb = b.symbol; break;
        case 'price': va = a.price; vb = b.price; break;
        case 'change24h': va = a.change24h; vb = b.change24h; break;
        case 'volume': va = a.volume; vb = b.volume; break;
        case 'aiScore': va = a.aiScore; vb = b.aiScore; break;
        case 'trend': {
          const trendOrder: Record<string, number> = {
            STRONG_UP: 5, UP: 4, FLAT: 3, DOWN: 2, STRONG_DOWN: 1,
          };
          va = trendOrder[a.trend] || 3;
          vb = trendOrder[b.trend] || 3;
          break;
        }
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc'
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });

    return result;
  }, [assets, search, sortKey, sortDir, marketFilter, verdictFilter]);

  const SortBtn = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <button
      className={cn(
        'text-[10px] uppercase tracking-wider transition-colors inline-flex items-center gap-0.5',
        sortKey === sKey
          ? 'text-white'
          : 'text-gray-400 dark:text-white/30 hover:text-gray-200',
      )}
      onClick={() => handleSort(sKey)}
    >
      {label}
      {sortKey === sKey &&
        (sortDir === 'asc' ? (
          <ChevronUp className="w-2.5 h-2.5" />
        ) : (
          <ChevronDown className="w-2.5 h-2.5" />
        ))}
    </button>
  );

  // Count by verdict for summary
  const goCount = assets.filter((a) => a.verdict === 'GO').length;
  const topAsset = [...assets].sort((a, b) => b.aiScore - a.aiScore)[0];

  return (
    <section>
      <TerminalSummaryBar
        title={`${assets.length} assets | ${goCount} GO signals`}
        subtitle={
          topAsset
            ? `Top: ${topAsset.symbol} (Score ${topAsset.aiScore})`
            : 'Loading assets...'
        }
        status={goCount > 3 ? 'positive' : goCount > 0 ? 'neutral' : 'negative'}
      />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
          <input
            type="text"
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Market filter */}
        <div className="flex gap-1 shrink-0 overflow-x-auto">
          {markets.map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={cn(
                'px-2 py-1.5 text-[10px] uppercase tracking-wider rounded transition-colors whitespace-nowrap',
                marketFilter === m
                  ? 'bg-[#00D4FF]/10 text-[#00D4FF]'
                  : 'text-gray-400 dark:text-white/30',
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Verdict filter */}
        <div className="flex gap-1 shrink-0">
          {['All', 'GO', 'COND', 'WAIT', 'AVOID'].map((v) => {
            const colors: Record<string, string> = {
              GO: '#00F5A0',
              COND: '#FFB800',
              WAIT: '#00D4FF',
              AVOID: '#FF4757',
            };
            return (
              <button
                key={v}
                onClick={() => setVerdictFilter(v)}
                className={cn(
                  'px-2 py-1.5 text-[10px] uppercase tracking-wider rounded transition-colors',
                  verdictFilter === v
                    ? 'font-semibold'
                    : 'text-gray-400 dark:text-white/30',
                )}
                style={
                  verdictFilter === v && v !== 'All'
                    ? { color: colors[v], background: `${colors[v]}15` }
                    : verdictFilter === v
                    ? { color: '#00D4FF', background: 'rgba(0,212,255,0.1)' }
                    : undefined
                }
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort header */}
      <div className="grid grid-cols-[32px_1fr_80px_60px_48px_60px_80px] sm:grid-cols-[32px_1fr_80px_60px_80px_48px_60px_80px] items-center gap-2 px-3 py-1.5 mb-1">
        <SortBtn label="#" sKey="rank" />
        <SortBtn label="Asset" sKey="symbol" />
        <SortBtn label="Price" sKey="price" />
        <SortBtn label="24h" sKey="change24h" />
        <span className="hidden sm:inline">
          <SortBtn label="Volume" sKey="volume" />
        </span>
        <SortBtn label="Score" sKey="aiScore" />
        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30">
          Verdict
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 text-center">
          Action
        </span>
      </div>

      {/* Asset rows */}
      <div className="space-y-1">
        {filtered.map((asset) => {
          const isSelected = selectedSymbol === asset.symbol;
          const isRec = recSet.has(asset.symbol.toUpperCase());

          return (
            <button
              key={asset.symbol}
              onClick={() => onSelect(asset)}
              className={cn(
                'w-full grid grid-cols-[32px_1fr_80px_60px_48px_60px_80px] sm:grid-cols-[32px_1fr_80px_60px_80px_48px_60px_80px] items-center gap-2 px-3 py-2 rounded-lg text-left transition-all',
                isSelected
                  ? 'ring-1 ring-[#00D4FF]/30'
                  : isRec
                  ? 'hover:bg-[#00F5A0]/[0.03]'
                  : 'hover:bg-white/[0.03]',
              )}
              style={{
                background: isSelected
                  ? 'rgba(0,212,255,0.06)'
                  : isRec
                  ? 'rgba(0,245,160,0.02)'
                  : 'transparent',
              }}
            >
              {/* Rank */}
              <span className="text-[10px] font-mono text-gray-400 dark:text-white/30 tabular-nums text-center">
                {asset.rank}
              </span>

              {/* Asset info */}
              <div className="flex items-center gap-2 min-w-0">
                <CoinIcon symbol={asset.symbol} size={20} />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {asset.symbol}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-white/30 ml-1.5 truncate hidden sm:inline">
                    {asset.name}
                  </span>
                </div>
              </div>

              {/* Price */}
              <span
                className="text-xs font-bold text-gray-900 dark:text-white tabular-nums text-right"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatPrice(asset.price)}
              </span>

              {/* 24h change */}
              <span
                className={cn(
                  'text-xs font-mono tabular-nums text-right',
                  asset.change24h > 0
                    ? 'text-[#00F5A0]'
                    : asset.change24h < 0
                    ? 'text-[#FF4757]'
                    : 'text-gray-400',
                )}
              >
                {asset.change24h > 0 ? '+' : ''}
                {asset.change24h.toFixed(1)}%
              </span>

              {/* Volume (hidden on small) */}
              <span className="text-[10px] font-mono text-gray-400 dark:text-white/40 tabular-nums text-right hidden sm:block">
                {formatNumber(asset.volume)}
              </span>

              {/* Score Ring */}
              <div className="flex justify-center">
                <ScoreRing score={asset.aiScore} size={28} strokeWidth={2.5} />
              </div>

              {/* Verdict */}
              <VerdictBadge verdict={asset.verdict} />

              {/* Action buttons */}
              <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onAnalyze?.(asset.symbol)}
                  className="px-1.5 py-0.5 text-[9px] rounded transition-colors text-[#00D4FF] hover:bg-[#00D4FF]/10"
                  style={{ border: '1px solid rgba(0,212,255,0.15)' }}
                >
                  Analyze
                </button>
                <button
                  onClick={() => onVisualize?.(asset.symbol)}
                  className="px-1.5 py-0.5 text-[9px] rounded transition-colors text-gray-400 dark:text-white/30 hover:bg-white/[0.06]"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </button>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400 dark:text-white/40">
            No assets match your criteria
          </div>
        )}
      </div>
    </section>
  );
}
