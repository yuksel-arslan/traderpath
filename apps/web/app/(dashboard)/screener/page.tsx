'use client';

// =============================================================================
// Screener – Asset Table (standalone page)
// Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronUp,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  type SortKey,
  type SortDir,
  type Market,
  type Verdict,
  type Asset,
  MARKETS,
  VERDICTS,
  MOCK_ASSETS,
  fmtPrice,
  fmtVol,
  verdictColor,
  verdictBg,
  phaseColor,
} from './shared';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'long') return <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-[#00f5c4]" />;
  if (dir === 'short') return <ArrowDownRight className="w-3 h-3 text-red-500 dark:text-red-400" />;
  return <Minus className="w-3 h-3 text-neutral-400" />;
}

function FlowBar({ value }: { value: number }) {
  const w = Math.min(Math.max(value, 0), 100);
  const color = w >= 70 ? 'bg-emerald-500 dark:bg-[#00f5c4]' : w >= 40 ? 'bg-amber-500' : 'bg-red-500 dark:bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[10px] font-sans tabular-nums">{value}</span>
    </div>
  );
}

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
          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300',
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
// Page nav tabs
// ---------------------------------------------------------------------------

const TABS = [
  { label: 'ASSET TABLE', href: '/screener', active: true },
  { label: '7-STEP', href: '/screener/7-step', active: false },
  { label: 'MLIS', href: '/screener/mlis', active: false },
];

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

  const goCount = filtered.filter((a) => a.verdict === 'GO').length;
  const avgScore = filtered.length > 0
    ? (filtered.reduce((s, a) => s + a.score, 0) / filtered.length).toFixed(1)
    : '0';

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-black dark:text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
              <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
            </div>
            <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
              SCREENER
            </span>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              {filtered.length} assets
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[10px] font-sans">
            <span className="text-neutral-400">GO: <span className="text-emerald-500 dark:text-[#00f5c4] font-semibold">{goCount}</span></span>
            <span className="text-neutral-400">AVG: <span className="text-black dark:text-white font-semibold">{avgScore}</span></span>
            <span className="text-neutral-400">TOTAL: <span className="text-black dark:text-white font-semibold">{filtered.length}</span></span>
          </div>
        </div>
      </div>

      {/* Page tabs */}
      <div className="shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-3 flex items-center gap-px">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-3 py-2 text-[10px] font-sans uppercase tracking-wider transition-colors',
                tab.active
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold'
                  : 'text-neutral-400 hover:text-black dark:hover:text-white',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name..."
              className="w-full pl-7 pr-7 py-1.5 text-xs font-sans bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded focus:outline-none focus:border-black/20 dark:focus:border-white/20 placeholder:text-neutral-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-neutral-400 hover:text-black dark:hover:text-white" />
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
                  'px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider transition-colors whitespace-nowrap',
                  market === m
                    ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                    : 'text-neutral-400 hover:text-black dark:hover:text-white',
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
              'flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider transition-colors',
              showFilters
                ? 'text-black dark:text-white'
                : 'text-neutral-400 hover:text-black dark:hover:text-white',
            )}
          >
            <Filter className="w-3 h-3" />
            FILTER
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="max-w-[1400px] mx-auto px-3 pb-2 flex items-center gap-3">
            <span className="text-[10px] text-neutral-400 font-sans">VERDICT:</span>
            <div className="flex items-center gap-px">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  onClick={() => setVerdictFilter(v)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-sans uppercase transition-colors',
                    verdictFilter === v
                      ? v === 'ALL'
                        ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                        : cn(verdictBg(v as Verdict), verdictColor(v as Verdict), 'font-semibold')
                      : 'text-neutral-400 hover:text-black dark:hover:text-white',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Asset Table */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-3 py-1 pb-4">
          {/* Sort row */}
          <div className="flex items-center gap-4 px-1 mb-2 text-xs font-sans">
            <SortHeader label="Asset" sortKey="symbol" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Price" sortKey="price" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="24h" sortKey="change24h" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <span className="hidden sm:inline"><SortHeader label="Volume" sortKey="volume" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} /></span>
            <SortHeader label="Score" sortKey="score" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Verdict" sortKey="verdict" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <span className="hidden md:inline"><SortHeader label="Phase" sortKey="phase" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} /></span>
          </div>

          {/* Card list */}
          <div className="space-y-1.5">
            {filtered.map((asset) => (
              <div
                key={asset.symbol}
                className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 text-xs font-sans hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all duration-150"
              >
                {/* Asset icon + name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[8px] font-bold shrink-0">
                    {asset.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs">{asset.symbol}</div>
                    <div className="text-[10px] text-neutral-400 hidden sm:block truncate">{asset.name}</div>
                  </div>
                  <span className="text-[9px] px-1 py-0.5 bg-black/5 dark:bg-white/5 rounded text-neutral-500 hidden md:inline shrink-0">
                    {asset.market}
                  </span>
                </div>

                {/* Price + 24h */}
                <div className="text-right shrink-0">
                  <div className="tabular-nums font-semibold">${fmtPrice(asset.price)}</div>
                  <div className={cn('text-[10px] tabular-nums font-semibold', asset.change24h > 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : asset.change24h < 0 ? 'text-red-500 dark:text-red-400' : 'text-neutral-400')}>
                    {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                  </div>
                </div>

                {/* Volume */}
                <span className="tabular-nums text-neutral-500 hidden sm:block w-16 text-right shrink-0">${fmtVol(asset.volume)}</span>

                {/* Score */}
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums shrink-0', asset.score >= 7 ? 'bg-emerald-500/10 dark:bg-[#00f5c4]/10 text-emerald-600 dark:text-[#00f5c4]' : asset.score >= 5 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-500 dark:text-red-400')}>
                  {asset.score.toFixed(1)}
                </span>

                {/* Verdict + Dir */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', verdictBg(asset.verdict), verdictColor(asset.verdict))}>
                    {asset.verdict}
                  </span>
                  <div className="hidden md:block"><DirIcon dir={asset.direction} /></div>
                </div>

                {/* Phase */}
                <span className={cn('text-[10px] font-bold hidden md:block shrink-0', phaseColor(asset.phase))}>
                  {asset.phase}
                </span>

                {/* Flow */}
                <div className="hidden lg:block w-16 shrink-0">
                  <FlowBar value={asset.flowScore} />
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-neutral-400 text-xs">
                No assets match your filters.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
