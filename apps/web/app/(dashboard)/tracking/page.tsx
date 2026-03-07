'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  RefreshCw,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────
interface TrackingAnalysis {
  id: string;
  symbol: string;
  interval: string;
  totalScore: number | null;
  method: string | null;
  outcome: string | null;
  outcomePrice: number | null;
  outcomeAt: string | null;
  verdict: string;
  direction: string | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  pnlPercent: number | null;
  creditsSpent: number;
  createdAt: string;
  expiresAt: string | null;
}

interface LivePriceData {
  currentPrice: number | null;
  unrealizedPnL: number | null;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  filtered: number;
}

interface PnLPoint {
  date: string;
  daily: number;
  cumulative: number;
  trades: number;
  wins: number;
}

type PnLPeriod = 'day' | 'week' | 'month';

type SortField = 'createdAt' | 'symbol' | 'totalScore' | 'outcome' | 'interval' | 'method';
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────
function formatPrice(val: number | null): string {
  if (val === null || val === undefined) return '—';
  if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(4);
  return val.toPrecision(4);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getVerdictStyle(verdict: string) {
  const v = (verdict || '').toLowerCase();
  if (v === 'go') return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'GO' };
  if (v === 'conditional_go' || v === 'cond') return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'COND' };
  if (v === 'wait') return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: 'WAIT' };
  if (v === 'avoid') return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'AVOID' };
  return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'N/A' };
}

function getOutcomeStyle(outcome: string | null) {
  if (!outcome) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'LIVE', icon: TrendingUp };
  if (outcome === 'pending') return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'PENDING', icon: Clock };
  if (outcome.startsWith('tp')) {
    const tpNum = outcome.replace('tp', '').replace('_hit', '');
    return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: `TP${tpNum} HIT`, icon: CheckCircle2 };
  }
  if (outcome === 'sl_hit') return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'SL HIT', icon: XCircle };
  return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: outcome.toUpperCase(), icon: Minus };
}

function getDirectionIcon(direction: string | null) {
  const d = (direction || '').toLowerCase();
  if (d === 'long') return { icon: TrendingUp, color: 'text-emerald-400', label: 'LONG' };
  if (d === 'short') return { icon: TrendingDown, color: 'text-red-400', label: 'SHORT' };
  return { icon: Minus, color: 'text-gray-400', label: 'NEUTRAL' };
}

// ─── Column Definitions ──────────────────────────────────
const COLUMNS = [
  { key: 'createdAt', label: 'Date', sortable: true, width: 'w-[110px]' },
  { key: 'symbol', label: 'Symbol', sortable: true, width: 'w-[100px]' },
  { key: 'interval', label: 'TF', sortable: true, width: 'w-[60px]' },
  { key: 'method', label: 'Method', sortable: true, width: 'w-[80px]' },
  { key: 'verdict', label: 'Verdict', sortable: false, width: 'w-[80px]' },
  { key: 'direction', label: 'Direction', sortable: false, width: 'w-[90px]' },
  { key: 'totalScore', label: 'Score', sortable: true, width: 'w-[70px]' },
  { key: 'entryPrice', label: 'Entry', sortable: false, width: 'w-[100px]' },
  { key: 'stopLoss', label: 'Stop Loss', sortable: false, width: 'w-[100px]' },
  { key: 'takeProfit1', label: 'TP1', sortable: false, width: 'w-[100px]' },
  { key: 'takeProfit2', label: 'TP2', sortable: false, width: 'w-[100px]' },
  { key: 'currentPrice', label: 'Current', sortable: false, width: 'w-[100px]' },
  { key: 'outcome', label: 'Outcome', sortable: true, width: 'w-[90px]' },
  { key: 'pnlPercent', label: 'P/L %', sortable: false, width: 'w-[80px]' },
  { key: 'outcomeAt', label: 'Closed At', sortable: false, width: 'w-[110px]' },
  { key: 'actions', label: '', sortable: false, width: 'w-[40px]' },
] as const;

// ─── Filter Options ──────────────────────────────────────
const VERDICT_OPTIONS = [
  { value: 'all', label: 'All Verdicts' },
  { value: 'go', label: 'GO' },
  { value: 'conditional_go', label: 'COND' },
  { value: 'wait', label: 'WAIT' },
  { value: 'avoid', label: 'AVOID' },
];

const DIRECTION_OPTIONS = [
  { value: 'all', label: 'All Directions' },
  { value: 'long', label: 'LONG' },
  { value: 'short', label: 'SHORT' },
];

const OUTCOME_OPTIONS = [
  { value: 'all', label: 'All Outcomes' },
  { value: 'live', label: 'Live' },
  { value: 'pending', label: 'Pending' },
  { value: 'tp', label: 'TP Hit' },
  { value: 'sl', label: 'SL Hit' },
];

const METHOD_OPTIONS = [
  { value: 'all', label: 'All Methods' },
  { value: 'classic', label: 'Classic 7-Step' },
  { value: 'mlis_pro', label: 'MLIS Pro' },
];

const INTERVAL_OPTIONS = [
  { value: 'all', label: 'All Timeframes' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '2h', label: '2H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1W', label: '1W' },
];

// ─── FilterSelect Component ─────────────────────────────
function FilterSelect({ value, onChange, options, className }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-8 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground',
        'focus:outline-none focus:ring-1 focus:ring-[#4dd0e1]/50 focus:border-[#4dd0e1]/50',
        'appearance-none px-2 pr-6 cursor-pointer',
        '[&>option]:bg-[#0f1729] [&>option]:text-foreground',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Main Page ───────────────────────────────────────────
export default function TrackingPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<TrackingAnalysis[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: 25, offset: 0, filtered: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sort
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filters
  const [searchSymbol, setSearchSymbol] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [intervalFilter, setIntervalFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cumulative P/L chart
  const [pnlPeriod, setPnlPeriod] = useState<PnLPeriod>('month');
  const [pnlPoints, setPnlPoints] = useState<PnLPoint[]>([]);
  const [pnlSummary, setPnlSummary] = useState({ totalPnL: 0, totalTrades: 0, totalWins: 0 });
  const [pnlLoading, setPnlLoading] = useState(true);

  const fetchPnlHistory = useCallback(async (period: PnLPeriod) => {
    setPnlLoading(true);
    try {
      const res = await authFetch(`/api/analysis/tracking/pnl-history?period=${period}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setPnlPoints(json.data.points);
        setPnlSummary({ totalPnL: json.data.totalPnL, totalTrades: json.data.totalTrades, totalWins: json.data.totalWins });
      }
    } catch { /* silently ignore */ }
    finally { setPnlLoading(false); }
  }, []);

  useEffect(() => { fetchPnlHistory(pnlPeriod); }, [pnlPeriod, fetchPnlHistory]);

  // Live prices for open trades (unrealized P/L)
  const [livePrices, setLivePrices] = useState<Record<string, LivePriceData>>({});
  const livePriceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLivePrices = useCallback(async () => {
    try {
      const res = await authFetch('/api/analysis/live-prices');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.analyses)) {
        const map: Record<string, LivePriceData> = {};
        for (const a of json.data.analyses) {
          map[a.id] = {
            currentPrice: a.currentPrice ?? null,
            unrealizedPnL: a.unrealizedPnL ?? null,
          };
        }
        setLivePrices(map);
      }
    } catch { /* silently ignore */ }
  }, []);

  // Poll live prices every 30s
  useEffect(() => {
    fetchLivePrices();
    livePriceTimer.current = setInterval(fetchLivePrices, 30000);
    return () => { if (livePriceTimer.current) clearInterval(livePriceTimer.current); };
  }, [fetchLivePrices]);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchSymbol);
      setPagination(p => ({ ...p, offset: 0 }));
    }, 400);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchSymbol]);

  const hasActiveFilters = debouncedSearch || verdictFilter !== 'all' || directionFilter !== 'all' ||
    outcomeFilter !== 'all' || methodFilter !== 'all' || intervalFilter !== 'all' || dateFrom || dateTo;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pagination.limit));
      params.set('offset', String(pagination.offset));
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      if (debouncedSearch) params.set('symbol', debouncedSearch);
      if (verdictFilter !== 'all') params.set('verdict', verdictFilter);
      if (directionFilter !== 'all') params.set('direction', directionFilter);
      if (outcomeFilter !== 'all') params.set('outcome', outcomeFilter);
      if (methodFilter !== 'all') params.set('method', methodFilter);
      if (intervalFilter !== 'all') params.set('interval', intervalFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await authFetch(`/api/analysis/tracking?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (json.success) {
        setAnalyses(json.data.analyses);
        setPagination(json.data.pagination);
      } else {
        throw new Error(json.error?.message || 'Failed to fetch');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, sortBy, sortDir, debouncedSearch, verdictFilter, directionFilter, outcomeFilter, methodFilter, intervalFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh P/L chart every 2 minutes to keep it live
  useEffect(() => {
    const timer = setInterval(() => fetchPnlHistory(pnlPeriod), 120000);
    return () => clearInterval(timer);
  }, [pnlPeriod, fetchPnlHistory]);

  const handleSort = (field: string) => {
    const col = COLUMNS.find(c => c.key === field);
    if (!col?.sortable) return;
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field as SortField);
      setSortDir('desc');
    }
    setPagination(p => ({ ...p, offset: 0 }));
  };

  const handlePageChange = (dir: 'prev' | 'next') => {
    setPagination(p => ({
      ...p,
      offset: dir === 'prev' ? Math.max(0, p.offset - p.limit) : p.offset + p.limit,
    }));
  };

  const clearFilters = () => {
    setSearchSymbol('');
    setDebouncedSearch('');
    setVerdictFilter('all');
    setDirectionFilter('all');
    setOutcomeFilter('all');
    setMethodFilter('all');
    setIntervalFilter('all');
    setDateFrom('');
    setDateTo('');
    setPagination(p => ({ ...p, offset: 0 }));
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  // Stats
  const tpCount = analyses.filter(a => a.outcome?.startsWith('tp')).length;
  const slCount = analyses.filter(a => a.outcome === 'sl_hit').length;
  const liveCount = analyses.filter(a => !a.outcome).length;
  const pendingCount = analyses.filter(a => a.outcome === 'pending').length;
  const closedCount = tpCount + slCount;

  // Win Rate: for live trades use unrealized P/L (in profit = win), for closed use TP/SL
  const liveInProfit = analyses.filter(a => !a.outcome && (livePrices[a.id]?.unrealizedPnL ?? 0) > 0).length;
  const liveTotalWithPrice = analyses.filter(a => !a.outcome && livePrices[a.id]?.unrealizedPnL != null).length;
  const winRateDenom = closedCount + liveTotalWithPrice;
  const winRate = winRateDenom > 0 ? Math.round(((tpCount + liveInProfit) / winRateDenom) * 100) : null;

  // Total P/L: sum realized (closed) + unrealized (live) P/L
  const totalPnL = analyses.reduce((sum, a) => {
    if (!a.outcome && livePrices[a.id]?.unrealizedPnL != null) {
      return sum + livePrices[a.id].unrealizedPnL!;
    }
    return sum + (a.pnlPercent || 0);
  }, 0);

  const handleRowClick = (id: string) => {
    router.push(`/analyze/details/${id}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Trade Tracking</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pagination.total} total analyses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              className="h-8 pl-8 pr-3 w-[140px] sm:w-[180px] rounded-lg bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#4dd0e1]/50"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors',
              hasActiveFilters
                ? 'bg-[#4dd0e1]/20 border-[#4dd0e1]/30 text-[#4dd0e1]'
                : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground',
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-4 h-4 rounded-full bg-[#4dd0e1] text-[#0f1729] text-[10px] flex items-center justify-center font-bold">
                !
              </span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <FilterSelect value={verdictFilter} onChange={(v) => { setVerdictFilter(v); setPagination(p => ({ ...p, offset: 0 })); }} options={VERDICT_OPTIONS} />
          <FilterSelect value={directionFilter} onChange={(v) => { setDirectionFilter(v); setPagination(p => ({ ...p, offset: 0 })); }} options={DIRECTION_OPTIONS} />
          <FilterSelect value={outcomeFilter} onChange={(v) => { setOutcomeFilter(v); setPagination(p => ({ ...p, offset: 0 })); }} options={OUTCOME_OPTIONS} />
          <FilterSelect value={methodFilter} onChange={(v) => { setMethodFilter(v); setPagination(p => ({ ...p, offset: 0 })); }} options={METHOD_OPTIONS} />
          <FilterSelect value={intervalFilter} onChange={(v) => { setIntervalFilter(v); setPagination(p => ({ ...p, offset: 0 })); }} options={INTERVAL_OPTIONS} />

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPagination(p => ({ ...p, offset: 0 })); }}
              className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#4dd0e1]/50 [color-scheme:dark]"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPagination(p => ({ ...p, offset: 0 })); }}
              className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#4dd0e1]/50 [color-scheme:dark]"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1 hover:bg-red-500/20 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300">Live</span>
          </div>
          <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">{liveCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300">Pending</span>
          </div>
          <p className="text-lg font-bold text-amber-400 mt-1 font-mono">{pendingCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300">TP Hit</span>
          </div>
          <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">{tpCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-300">SL Hit</span>
          </div>
          <p className="text-lg font-bold text-red-400 mt-1 font-mono">{slCount}</p>
        </div>
        <div className="p-3 rounded-xl bg-[#4dd0e1]/10 border border-[#4dd0e1]/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#4dd0e1]" />
            <span className="text-xs text-[#4dd0e1]/80">Win Rate</span>
          </div>
          <p className="text-lg font-bold text-[#4dd0e1] mt-1 font-mono">
            {winRate !== null ? `${winRate}%` : '—'}
          </p>
        </div>
        <div className={cn('p-3 rounded-xl border', totalPnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20')}>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn('w-4 h-4', totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400')} />
            <span className={cn('text-xs', totalPnL >= 0 ? 'text-emerald-300' : 'text-red-300')}>Total P/L</span>
          </div>
          <p className={cn('text-lg font-bold mt-1 font-mono', totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Cumulative P/L Chart */}
      <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Cumulative P/L</h2>
            <p className={cn('text-lg font-bold font-mono', pnlSummary.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {pnlSummary.totalPnL >= 0 ? '+' : ''}{pnlSummary.totalPnL.toFixed(2)}%
              <span className="text-xs font-normal text-muted-foreground ml-2">
                {pnlSummary.totalTrades} trades &middot; {pnlSummary.totalWins} wins
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as PnLPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPnlPeriod(p)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  pnlPeriod === p
                    ? 'bg-[#4dd0e1]/20 text-[#4dd0e1]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p === 'day' ? '1D' : p === 'week' ? '1W' : '1M'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[180px]">
          {pnlLoading ? (
            <div className="w-full h-full bg-white/5 rounded animate-pulse" />
          ) : pnlPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlPoints} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="pnlGradientPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4dd0e1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4dd0e1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5f5f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ff5f5f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={(d: string) => {
                    const dt = new Date(d);
                    return pnlPeriod === 'day'
                      ? dt.toLocaleTimeString('en-US', { hour: '2-digit' })
                      : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  formatter={(value: number, name: string) => [
                    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
                    name === 'cumulative' ? 'Cumulative' : 'Daily',
                  ]}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={pnlSummary.totalPnL >= 0 ? '#4dd0e1' : '#ff5f5f'}
                  strokeWidth={2}
                  fill={pnlSummary.totalPnL >= 0 ? 'url(#pnlGradientPos)' : 'url(#pnlGradientNeg)'}
                  dot={false}
                  activeDot={{ r: 4, fill: pnlSummary.totalPnL >= 0 ? '#4dd0e1' : '#ff5f5f' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No closed trades in this period
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchData} className="mt-2 text-xs text-red-300 underline hover:text-red-200">
            Try Again
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap',
                      col.sortable && 'cursor-pointer hover:text-foreground select-none',
                      col.width,
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        sortBy === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#4dd0e1]" /> : <ArrowDown className="w-3 h-3 text-[#4dd0e1]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="px-3 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : analyses.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-muted-foreground">
                    {hasActiveFilters ? (
                      <div className="space-y-2">
                        <p>No analyses match your filters</p>
                        <button onClick={clearFilters} className="text-[#4dd0e1] text-xs underline">Clear filters</button>
                      </div>
                    ) : (
                      <p>No analyses yet. Run your first analysis to see it here.</p>
                    )}
                  </td>
                </tr>
              ) : (
                analyses.map((a) => {
                  const isLive = !a.outcome;
                  const isPending = a.outcome === 'pending';
                  const verdictStyle = getVerdictStyle(a.verdict);
                  const outcomeStyle = getOutcomeStyle(a.outcome);
                  const dirInfo = getDirectionIcon(a.direction);
                  const OutcomeIcon = outcomeStyle.icon;

                  return (
                    <tr
                      key={a.id}
                      onClick={() => handleRowClick(a.id)}
                      className={cn(
                        'border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer',
                        isLive && 'bg-emerald-500/[0.03]',
                      )}
                    >
                      {/* Date */}
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(a.createdAt)}
                      </td>

                      {/* Symbol */}
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-foreground">{a.symbol}</span>
                      </td>

                      {/* Timeframe */}
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-medium text-foreground">
                          {(a.interval || '').toUpperCase()}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          a.method === 'mlis_pro'
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-teal-500/20 text-teal-400',
                        )}>
                          {a.method === 'mlis_pro' ? 'MLIS' : '7-Step'}
                        </span>
                      </td>

                      {/* Verdict */}
                      <td className="px-3 py-2.5">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', verdictStyle.bg, verdictStyle.text, verdictStyle.border)}>
                          {verdictStyle.label}
                        </span>
                      </td>

                      {/* Direction */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <dirInfo.icon className={cn('w-3.5 h-3.5', dirInfo.color)} />
                          <span className={cn('text-[10px] font-bold', dirInfo.color)}>{dirInfo.label}</span>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-3 py-2.5 font-mono">
                        {a.totalScore !== null ? (
                          <span className={cn(
                            'font-bold',
                            a.totalScore >= 7 ? 'text-emerald-400' :
                            a.totalScore >= 5 ? 'text-amber-400' : 'text-red-400',
                          )}>
                            {a.totalScore.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Entry */}
                      <td className="px-3 py-2.5 font-mono text-foreground">
                        {formatPrice(a.entryPrice)}
                      </td>

                      {/* Stop Loss */}
                      <td className="px-3 py-2.5 font-mono text-red-400">
                        {formatPrice(a.stopLoss)}
                      </td>

                      {/* TP1 */}
                      <td className="px-3 py-2.5 font-mono text-emerald-400">
                        {formatPrice(a.takeProfit1)}
                      </td>

                      {/* TP2 */}
                      <td className="px-3 py-2.5 font-mono text-emerald-400/70">
                        {formatPrice(a.takeProfit2)}
                      </td>

                      {/* Current Price (live trades only) */}
                      <td className="px-3 py-2.5 font-mono">
                        {isLive && livePrices[a.id]?.currentPrice ? (
                          <span className="text-[#4dd0e1]">{formatPrice(livePrices[a.id].currentPrice)}</span>
                        ) : a.outcomePrice ? (
                          <span className="text-muted-foreground">{formatPrice(a.outcomePrice)}</span>
                        ) : '—'}
                      </td>

                      {/* Outcome */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {OutcomeIcon && <OutcomeIcon className={cn('w-3.5 h-3.5', outcomeStyle.text)} />}
                          <span className={cn('text-[10px] font-bold', outcomeStyle.text)}>
                            {outcomeStyle.label}
                          </span>
                        </div>
                      </td>

                      {/* P/L % */}
                      <td className="px-3 py-2.5 font-mono font-bold">
                        {(() => {
                          // For live trades, show unrealized P/L from live prices
                          if (isLive && livePrices[a.id]?.unrealizedPnL != null) {
                            const pnl = livePrices[a.id].unrealizedPnL!;
                            return (
                              <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                              </span>
                            );
                          }
                          // For closed trades, show realized P/L
                          if (a.pnlPercent !== null) {
                            return (
                              <span className={a.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {a.pnlPercent >= 0 ? '+' : ''}{a.pnlPercent.toFixed(2)}%
                              </span>
                            );
                          }
                          return '—';
                        })()}
                      </td>

                      {/* Closed At */}
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {a.outcomeAt ? formatDateTime(a.outcomeAt) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/analyze/details/${a.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-[#4dd0e1] hover:bg-[#4dd0e1]/10 transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && analyses.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <p className="text-xs text-muted-foreground">
              Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={pagination.offset === 0}
                className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                {currentPage}/{totalPages || 1}
              </span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={pagination.offset + pagination.limit >= pagination.total}
                className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
