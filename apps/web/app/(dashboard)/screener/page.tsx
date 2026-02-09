'use client';

// =============================================================================
// TraderPath Screener – L5 Full Asset Table
// Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronUp,
  ChevronDown,
  Filter,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey =
  | 'symbol'
  | 'price'
  | 'change24h'
  | 'volume'
  | 'score'
  | 'verdict'
  | 'phase';

type SortDir = 'asc' | 'desc';

type Market = 'ALL' | 'CRYPTO' | 'STOCKS' | 'METALS' | 'BONDS' | 'BIST';

type Verdict = 'GO' | 'COND' | 'WAIT' | 'AVOID';

interface Asset {
  symbol: string;
  name: string;
  market: Exclude<Market, 'ALL'>;
  price: number;
  change24h: number;
  volume: number;
  score: number;
  verdict: Verdict;
  direction: 'long' | 'short' | 'neutral';
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  flowScore: number;
  rsi: number;
  macd: 'bullish' | 'bearish' | 'neutral';
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_ASSETS: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', market: 'CRYPTO', price: 97250, change24h: 2.14, volume: 48200000000, score: 8.4, verdict: 'GO', direction: 'long', phase: 'MID', flowScore: 85, rsi: 62, macd: 'bullish' },
  { symbol: 'ETH', name: 'Ethereum', market: 'CRYPTO', price: 3420, change24h: 3.87, volume: 22100000000, score: 7.9, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 91, rsi: 58, macd: 'bullish' },
  { symbol: 'SOL', name: 'Solana', market: 'CRYPTO', price: 198.5, change24h: 5.22, volume: 8700000000, score: 8.1, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 88, rsi: 64, macd: 'bullish' },
  { symbol: 'BNB', name: 'Binance Coin', market: 'CRYPTO', price: 612, change24h: -0.42, volume: 2100000000, score: 6.2, verdict: 'WAIT', direction: 'neutral', phase: 'LATE', flowScore: 45, rsi: 48, macd: 'neutral' },
  { symbol: 'XRP', name: 'Ripple', market: 'CRYPTO', price: 2.34, change24h: 1.85, volume: 4500000000, score: 7.1, verdict: 'COND', direction: 'long', phase: 'MID', flowScore: 72, rsi: 55, macd: 'bullish' },
  { symbol: 'ADA', name: 'Cardano', market: 'CRYPTO', price: 0.82, change24h: -2.1, volume: 1200000000, score: 4.8, verdict: 'AVOID', direction: 'short', phase: 'EXIT', flowScore: 22, rsi: 35, macd: 'bearish' },
  { symbol: 'AVAX', name: 'Avalanche', market: 'CRYPTO', price: 38.2, change24h: 4.15, volume: 980000000, score: 7.6, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 82, rsi: 61, macd: 'bullish' },
  { symbol: 'DOGE', name: 'Dogecoin', market: 'CRYPTO', price: 0.178, change24h: -3.42, volume: 2800000000, score: 3.5, verdict: 'AVOID', direction: 'short', phase: 'EXIT', flowScore: 18, rsi: 28, macd: 'bearish' },
  { symbol: 'SPY', name: 'S&P 500 ETF', market: 'STOCKS', price: 512.3, change24h: 0.45, volume: 92000000, score: 7.2, verdict: 'COND', direction: 'long', phase: 'LATE', flowScore: 65, rsi: 52, macd: 'neutral' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', market: 'STOCKS', price: 448.7, change24h: 0.82, volume: 55000000, score: 7.5, verdict: 'GO', direction: 'long', phase: 'MID', flowScore: 74, rsi: 57, macd: 'bullish' },
  { symbol: 'AAPL', name: 'Apple Inc', market: 'STOCKS', price: 198.2, change24h: 1.12, volume: 62000000, score: 7.8, verdict: 'GO', direction: 'long', phase: 'MID', flowScore: 78, rsi: 59, macd: 'bullish' },
  { symbol: 'MSFT', name: 'Microsoft', market: 'STOCKS', price: 412.5, change24h: 0.34, volume: 28000000, score: 6.9, verdict: 'COND', direction: 'long', phase: 'LATE', flowScore: 62, rsi: 51, macd: 'neutral' },
  { symbol: 'NVDA', name: 'Nvidia', market: 'STOCKS', price: 878.3, change24h: 2.45, volume: 45000000, score: 8.2, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 89, rsi: 65, macd: 'bullish' },
  { symbol: 'THYAO', name: 'THY', market: 'BIST', price: 312.5, change24h: 1.87, volume: 8500000, score: 7.4, verdict: 'COND', direction: 'long', phase: 'MID', flowScore: 68, rsi: 54, macd: 'bullish' },
  { symbol: 'GARAN', name: 'Garanti BBVA', market: 'BIST', price: 142.8, change24h: -0.95, volume: 6200000, score: 5.8, verdict: 'WAIT', direction: 'neutral', phase: 'LATE', flowScore: 42, rsi: 44, macd: 'neutral' },
  { symbol: 'GLD', name: 'Gold ETF', market: 'METALS', price: 215.4, change24h: 0.72, volume: 12000000, score: 7.0, verdict: 'COND', direction: 'long', phase: 'LATE', flowScore: 58, rsi: 53, macd: 'neutral' },
  { symbol: 'SLV', name: 'Silver ETF', market: 'METALS', price: 28.6, change24h: 1.35, volume: 8500000, score: 6.8, verdict: 'WAIT', direction: 'neutral', phase: 'MID', flowScore: 55, rsi: 49, macd: 'neutral' },
  { symbol: 'TLT', name: 'Treasury Bond ETF', market: 'BONDS', price: 92.4, change24h: -0.28, volume: 22000000, score: 5.2, verdict: 'WAIT', direction: 'neutral', phase: 'EXIT', flowScore: 32, rsi: 38, macd: 'bearish' },
  { symbol: 'IEF', name: '7-10Y Treasury', market: 'BONDS', price: 98.1, change24h: 0.15, volume: 9800000, score: 5.5, verdict: 'WAIT', direction: 'neutral', phase: 'MID', flowScore: 40, rsi: 42, macd: 'neutral' },
  { symbol: 'LINK', name: 'Chainlink', market: 'CRYPTO', price: 18.45, change24h: 6.82, volume: 1800000000, score: 7.8, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 86, rsi: 63, macd: 'bullish' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MARKETS: Market[] = ['ALL', 'CRYPTO', 'STOCKS', 'METALS', 'BONDS', 'BIST'];
const VERDICTS: (Verdict | 'ALL')[] = ['ALL', 'GO', 'COND', 'WAIT', 'AVOID'];

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

function verdictColor(v: Verdict): string {
  switch (v) {
    case 'GO': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'COND': return 'text-amber-500 dark:text-amber-400';
    case 'WAIT': return 'text-slate-500 dark:text-slate-400';
    case 'AVOID': return 'text-red-500 dark:text-red-400';
  }
}

function verdictBg(v: Verdict): string {
  switch (v) {
    case 'GO': return 'bg-emerald-500/10 dark:bg-[#00f5c4]/10';
    case 'COND': return 'bg-amber-500/10';
    case 'WAIT': return 'bg-slate-500/10';
    case 'AVOID': return 'bg-red-500/10';
  }
}

function phaseColor(p: string): string {
  switch (p) {
    case 'EARLY': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'MID': return 'text-amber-500 dark:text-amber-400';
    case 'LATE': return 'text-orange-500';
    case 'EXIT': return 'text-red-500 dark:text-red-400';
    default: return 'text-slate-500';
  }
}

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'long') return <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-[#00f5c4]" />;
  if (dir === 'short') return <ArrowDownRight className="w-3 h-3 text-red-500 dark:text-red-400" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
}

// ---------------------------------------------------------------------------
// FlowBar – tiny horizontal bar
// ---------------------------------------------------------------------------

function FlowBar({ value }: { value: number }) {
  const w = Math.min(Math.max(value, 0), 100);
  const color = w >= 70 ? 'bg-emerald-500 dark:bg-[#00f5c4]' : w >= 40 ? 'bg-amber-500' : 'bg-red-500 dark:bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[10px] font-mono tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortHeader
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-medium transition-colors',
        active
          ? 'text-black dark:text-white'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
        className,
      )}
    >
      {label}
      {active && (
        currentDir === 'asc'
          ? <ChevronUp className="w-2.5 h-2.5" />
          : <ChevronDown className="w-2.5 h-2.5" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ScreenerPage() {
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState<Market>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const filtered = useMemo(() => {
    let list = [...MOCK_ASSETS];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
      );
    }
    if (market !== 'ALL') list = list.filter((a) => a.market === market);
    if (verdictFilter !== 'ALL') list = list.filter((a) => a.verdict === verdictFilter);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'price': cmp = a.price - b.price; break;
        case 'change24h': cmp = a.change24h - b.change24h; break;
        case 'volume': cmp = a.volume - b.volume; break;
        case 'score': cmp = a.score - b.score; break;
        case 'verdict': cmp = a.verdict.localeCompare(b.verdict); break;
        case 'phase': cmp = a.phase.localeCompare(b.phase); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [search, market, verdictFilter, sortKey, sortDir]);

  // Stats
  const goCount = filtered.filter((a) => a.verdict === 'GO').length;
  const avgScore = filtered.length > 0
    ? (filtered.reduce((s, a) => s + a.score, 0) / filtered.length).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-3 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-mono font-semibold tracking-tight">SCREENER</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              L5 &middot; Full Asset Table &middot; {filtered.length} assets
            </p>
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono">
            <span className="text-slate-400">GO: <span className="text-emerald-500 dark:text-[#00f5c4] font-semibold">{goCount}</span></span>
            <span className="text-slate-400">AVG: <span className="text-black dark:text-white font-semibold">{avgScore}</span></span>
            <span className="text-slate-400">TOTAL: <span className="text-black dark:text-white font-semibold">{filtered.length}</span></span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name..."
              className="w-full pl-7 pr-7 py-1.5 text-xs font-mono bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded focus:outline-none focus:border-black/20 dark:focus:border-white/20 placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-slate-400 hover:text-black dark:hover:text-white" />
              </button>
            )}
          </div>

          {/* Market tabs */}
          <div className="flex items-center gap-px overflow-x-auto">
            {MARKETS.map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap',
                  market === m
                    ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                    : 'text-slate-400 hover:text-black dark:hover:text-white',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors',
              showFilters
                ? 'text-black dark:text-white'
                : 'text-slate-400 hover:text-black dark:hover:text-white',
            )}
          >
            <Filter className="w-3 h-3" />
            FILTER
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="max-w-[1400px] mx-auto px-3 pb-2 flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-mono">VERDICT:</span>
            <div className="flex items-center gap-px">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  onClick={() => setVerdictFilter(v)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-mono uppercase transition-colors',
                    verdictFilter === v
                      ? v === 'ALL'
                        ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                        : cn(verdictBg(v as Verdict), verdictColor(v as Verdict), 'font-semibold')
                      : 'text-slate-400 hover:text-black dark:hover:text-white',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="max-w-[1400px] mx-auto overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
              <th className="text-left px-3 py-2">
                <SortHeader label="Asset" sortKey="symbol" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right px-3 py-2">
                <SortHeader label="Price" sortKey="price" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" />
              </th>
              <th className="text-right px-3 py-2">
                <SortHeader label="24h" sortKey="change24h" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" />
              </th>
              <th className="text-right px-3 py-2 hidden sm:table-cell">
                <SortHeader label="Volume" sortKey="volume" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-end" />
              </th>
              <th className="text-center px-3 py-2">
                <SortHeader label="Score" sortKey="score" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-center" />
              </th>
              <th className="text-center px-3 py-2">
                <SortHeader label="Verdict" sortKey="verdict" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-center" />
              </th>
              <th className="text-center px-3 py-2 hidden md:table-cell">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Dir</span>
              </th>
              <th className="text-center px-3 py-2 hidden md:table-cell">
                <SortHeader label="Phase" sortKey="phase" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="justify-center" />
              </th>
              <th className="text-center px-3 py-2 hidden lg:table-cell">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Flow</span>
              </th>
              <th className="text-center px-3 py-2 hidden lg:table-cell">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">RSI</span>
              </th>
              <th className="text-center px-3 py-2 hidden lg:table-cell">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">MACD</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset) => (
              <tr
                key={asset.symbol}
                className="border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                {/* Asset */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[8px] font-bold">
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-xs">{asset.symbol}</div>
                      <div className="text-[10px] text-slate-400 hidden sm:block">{asset.name}</div>
                    </div>
                    <span className="text-[9px] px-1 py-0.5 bg-black/5 dark:bg-white/5 rounded text-slate-500 hidden md:inline">
                      {asset.market}
                    </span>
                  </div>
                </td>

                {/* Price */}
                <td className="text-right px-3 py-2.5 tabular-nums font-semibold">
                  ${fmtPrice(asset.price)}
                </td>

                {/* 24h Change */}
                <td className={cn(
                  'text-right px-3 py-2.5 tabular-nums font-semibold',
                  asset.change24h > 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : asset.change24h < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400',
                )}>
                  {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                </td>

                {/* Volume */}
                <td className="text-right px-3 py-2.5 tabular-nums text-slate-500 hidden sm:table-cell">
                  ${fmtVol(asset.volume)}
                </td>

                {/* Score */}
                <td className="text-center px-3 py-2.5">
                  <span className={cn(
                    'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums',
                    asset.score >= 7
                      ? 'bg-emerald-500/10 dark:bg-[#00f5c4]/10 text-emerald-600 dark:text-[#00f5c4]'
                      : asset.score >= 5
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-red-500/10 text-red-500 dark:text-red-400',
                  )}>
                    {asset.score.toFixed(1)}
                  </span>
                </td>

                {/* Verdict */}
                <td className="text-center px-3 py-2.5">
                  <span className={cn(
                    'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                    verdictBg(asset.verdict),
                    verdictColor(asset.verdict),
                  )}>
                    {asset.verdict}
                  </span>
                </td>

                {/* Direction */}
                <td className="text-center px-3 py-2.5 hidden md:table-cell">
                  <div className="flex items-center justify-center">
                    <DirIcon dir={asset.direction} />
                  </div>
                </td>

                {/* Phase */}
                <td className={cn('text-center px-3 py-2.5 text-[10px] font-bold hidden md:table-cell', phaseColor(asset.phase))}>
                  {asset.phase}
                </td>

                {/* Flow */}
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  <FlowBar value={asset.flowScore} />
                </td>

                {/* RSI */}
                <td className={cn(
                  'text-center px-3 py-2.5 tabular-nums text-[10px] font-semibold hidden lg:table-cell',
                  asset.rsi > 70 ? 'text-red-500' : asset.rsi < 30 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-slate-500',
                )}>
                  {asset.rsi}
                </td>

                {/* MACD */}
                <td className="text-center px-3 py-2.5 hidden lg:table-cell">
                  <span className={cn(
                    'text-[10px] font-bold uppercase',
                    asset.macd === 'bullish' ? 'text-emerald-500 dark:text-[#00f5c4]' : asset.macd === 'bearish' ? 'text-red-500 dark:text-red-400' : 'text-slate-400',
                  )}>
                    {asset.macd === 'bullish' ? '▲' : asset.macd === 'bearish' ? '▼' : '—'}
                  </span>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-12 text-slate-400 text-xs">
                  No assets match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>
            {filtered.length} of {MOCK_ASSETS.length} assets &middot; Sorted by {sortKey} {sortDir}
          </span>
          <span className="hidden sm:inline">
            GO: {goCount} &middot; COND: {filtered.filter((a) => a.verdict === 'COND').length} &middot; WAIT: {filtered.filter((a) => a.verdict === 'WAIT').length} &middot; AVOID: {filtered.filter((a) => a.verdict === 'AVOID').length}
          </span>
        </div>
      </div>
    </div>
  );
}
