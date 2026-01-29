'use client';

// ===========================================
// Top Coins Page - All Scanned Coins List
// Shows all cached coin analysis results with filters and sorting
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Crown,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  BarChart3,
  Layers,
  Clock,
  ChevronDown,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

const CoinIcon = dynamic(
  () => import('../../../components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-8 h-8 rounded-full bg-muted/30 animate-pulse" /> }
);

interface TopCoin {
  symbol: string;
  reliabilityScore: number;
  verdict: string;
  direction: string | null;
  price: number;
  priceChange24h: number;
  analysisId: string | null;
  scannedAt: string;
  expiresAt: string;
  method?: 'classic' | 'mlis_pro';
  recommendation?: string;
  confidence?: number;
  totalScore?: number;
}

interface CacheInfo {
  totalCached: number;
  lastUpdated: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

type SortField = 'reliabilityScore' | 'priceChange24h' | 'price' | 'symbol';
type SortOrder = 'asc' | 'desc';
type VerdictFilter = 'all' | 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
type MethodFilter = 'all' | 'classic' | 'mlis_pro';
type DirectionFilter = 'all' | 'LONG' | 'SHORT';

// Glass Card Component
function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden",
      "bg-white/70 dark:bg-slate-900/50",
      "backdrop-blur-xl backdrop-saturate-150",
      "border border-white/20 dark:border-white/10",
      "shadow-xl shadow-black/5 dark:shadow-black/20",
      className
    )}>
      {children}
    </div>
  );
}

// Gradient Orbs Background
function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-orange-500/10 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-teal-400/15 to-emerald-500/10 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
    </div>
  );
}

export default function TopCoinsPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<TopCoin[]>([]);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [sortField, setSortField] = useState<SortField>('reliabilityScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all coins from cache
  const fetchAllCoins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/analysis/top-coins?limit=30&tradeableOnly=false');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCoins(data.data.coins || []);
          setCacheInfo(data.data.cacheInfo || null);
        }
      } else {
        setError('Failed to fetch coins');
      }
    } catch (err) {
      console.error('Failed to fetch coins:', err);
      setError('Failed to fetch coins. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllCoins();
  }, [fetchAllCoins]);

  // Filter and sort coins
  const filteredCoins = coins
    .filter(coin => {
      // Search filter
      if (searchQuery && !coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Verdict filter
      if (verdictFilter !== 'all' && coin.verdict !== verdictFilter) {
        return false;
      }
      // Method filter
      if (methodFilter !== 'all' && coin.method !== methodFilter) {
        return false;
      }
      // Direction filter
      if (directionFilter !== 'all' && coin.direction !== directionFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'reliabilityScore':
          aVal = a.reliabilityScore || 0;
          bVal = b.reliabilityScore || 0;
          break;
        case 'priceChange24h':
          aVal = a.priceChange24h || 0;
          bVal = b.priceChange24h || 0;
          break;
        case 'price':
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        default:
          aVal = a.reliabilityScore || 0;
          bVal = b.reliabilityScore || 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  // Verdict colors
  const getVerdictColor = (verdict: string, method?: string) => {
    if (method === 'mlis_pro') {
      return {
        'STRONG_BUY': 'from-emerald-500 to-green-600',
        'BUY': 'from-teal-500 to-cyan-600',
        'HOLD': 'from-amber-500 to-yellow-600',
        'SELL': 'from-orange-500 to-red-500',
        'STRONG_SELL': 'from-red-500 to-rose-600',
      }[verdict] || 'from-slate-500 to-gray-600';
    }
    return {
      'GO': 'from-emerald-500 to-green-600',
      'CONDITIONAL_GO': 'from-amber-500 to-yellow-600',
      'WAIT': 'from-slate-500 to-gray-600',
      'AVOID': 'from-red-500 to-rose-600',
    }[verdict] || 'from-slate-500 to-gray-600';
  };

  const getVerdictLabel = (coin: TopCoin) => {
    if (coin.method === 'mlis_pro' && coin.recommendation) {
      return coin.recommendation.replace('_', ' ');
    }
    return {
      'GO': 'GO',
      'CONDITIONAL_GO': 'COND',
      'WAIT': 'WAIT',
      'AVOID': 'AVOID',
    }[coin.verdict] || coin.verdict;
  };

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <GradientOrbs />

      <div className="relative w-full px-3 sm:px-4 md:px-8 lg:px-12 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/analyze')}
              className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                Top Coins Analysis
              </h1>
              {cacheInfo?.lastUpdated && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Last scan: {new Date(cacheInfo.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push('/analyze')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            New Scan
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Cached</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{cacheInfo?.totalCached || 0}</p>
          </GlassCard>
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">GO Signals</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500">
              {coins.filter(c => c.verdict === 'GO').length}
            </p>
          </GlassCard>
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">LONG Direction</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500">
              {coins.filter(c => c.direction === 'LONG').length}
            </p>
          </GlassCard>
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">SHORT Direction</p>
            <p className="text-xl sm:text-2xl font-bold text-red-500">
              {coins.filter(c => c.direction === 'SHORT').length}
            </p>
          </GlassCard>
        </div>

        {/* Filters */}
        <GlassCard className="p-3 sm:p-4">
          <div className="space-y-3">
            {/* Search and Filter Toggle */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search coins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  showFilters
                    ? "bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30"
                    : "bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                )}
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 dark:border-slate-700">
                {/* Verdict Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Verdict</label>
                  <select
                    value={verdictFilter}
                    onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                    className="w-full px-3 py-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="all">All</option>
                    <option value="GO">GO</option>
                    <option value="CONDITIONAL_GO">Conditional</option>
                    <option value="WAIT">Wait</option>
                    <option value="AVOID">Avoid</option>
                  </select>
                </div>

                {/* Method Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Method</label>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
                    className="w-full px-3 py-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="all">All</option>
                    <option value="classic">Classic (7-Step)</option>
                    <option value="mlis_pro">MLIS Pro</option>
                  </select>
                </div>

                {/* Direction Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Direction</label>
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value as DirectionFilter)}
                    className="w-full px-3 py-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="all">All</option>
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Sort By</label>
                  <div className="flex gap-1">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SortField)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="reliabilityScore">Score</option>
                      <option value="priceChange24h">24h Change</option>
                      <option value="price">Price</option>
                      <option value="symbol">Symbol</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700"
                    >
                      {sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <SortDesc className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Results Count */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredCoins.length} of {coins.length} coins
        </p>

        {/* Coins Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <GlassCard className="p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchAllCoins}
              className="px-4 py-2 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition"
            >
              Try Again
            </button>
          </GlassCard>
        ) : filteredCoins.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Crown className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">No coins found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {coins.length === 0 ? 'Run a scan to analyze top coins' : 'Try adjusting your filters'}
            </p>
            {coins.length === 0 && (
              <button
                onClick={() => router.push('/analyze')}
                className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium"
              >
                Go to Analyze
              </button>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredCoins.map((coin, index) => {
              const isMLIS = coin.method === 'mlis_pro';
              const verdictColor = getVerdictColor(isMLIS ? (coin.recommendation || coin.verdict) : coin.verdict, coin.method);
              const verdictLabel = getVerdictLabel(coin);

              return (
                <GlassCard
                  key={coin.symbol}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02]",
                    isMLIS
                      ? "hover:border-violet-400 dark:hover:border-violet-500"
                      : "hover:border-teal-400 dark:hover:border-teal-500"
                  )}
                >
                  <div
                    onClick={() => {
                      if (coin.analysisId) {
                        router.push(`/analyze/details/${coin.analysisId}`);
                      }
                    }}
                  >
                    {/* Rank Badge */}
                    <div className={cn(
                      "absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-10",
                      isMLIS
                        ? "bg-gradient-to-br from-violet-500 to-purple-600"
                        : "bg-gradient-to-br from-amber-400 to-orange-500"
                    )}>
                      {index + 1}
                    </div>

                    {/* Method Badge */}
                    <div className={cn(
                      "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg z-10",
                      isMLIS
                        ? "bg-gradient-to-r from-violet-500 to-purple-500"
                        : "bg-gradient-to-r from-teal-500 to-emerald-500"
                    )}>
                      {isMLIS ? 'MLIS' : '7-Step'}
                    </div>

                    {/* Coin Info */}
                    <div className="flex items-center gap-3 mb-3 pt-2">
                      <CoinIcon symbol={coin.symbol} size={36} className="flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{coin.symbol}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ${coin.price < 1 ? coin.price.toFixed(6) : coin.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Verdict Badge */}
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r text-center mb-3",
                      verdictColor
                    )}>
                      {verdictLabel}
                    </div>

                    {/* Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {isMLIS ? 'Confidence' : 'Score'}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {isMLIS && coin.confidence
                            ? `${coin.confidence}%`
                            : coin.reliabilityScore?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">24h</span>
                        <span className={cn(
                          "font-semibold flex items-center gap-1",
                          coin.priceChange24h >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          {coin.priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h?.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                      {coin.direction && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Direction</span>
                          <span className={cn(
                            "font-semibold px-2 py-0.5 rounded",
                            coin.direction === 'LONG'
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-red-500/10 text-red-500"
                          )}>
                            {coin.direction}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* View Details Link */}
                    <div className="mt-3 pt-3 border-t border-white/10 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {new Date(coin.scannedAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
