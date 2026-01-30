'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  BarChart3,
  Landmark,
  Gem,
  RefreshCw,
  Filter,
  Search,
  ChevronUp,
  ChevronDown,
  Clock,
  Target,
  Zap,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AssetScore {
  symbol: string;
  market: string;
  name: string;
  totalScore: number;
  reliabilityScore: number;
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  volumeScore: number;
  verdict: string;
  direction: string | null;
  confidence: number;
  price: number;
  priceChange1d: number;
  priceChange5d: number;
  priceChange1m: number;
  volume: number;
  avgVolume: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
  analysisId: string | null;
  scannedAt: string;
  expiresAt: string;
}

interface CacheInfo {
  totalAssets: number;
  freshAssets: number;
  staleAssets: number;
  lastScanAt: string | null;
}

const marketConfig: Record<string, { name: string; icon: any; color: string }> = {
  stocks: { name: 'Stocks', icon: BarChart3, color: 'from-blue-500 to-indigo-500' },
  bonds: { name: 'Bonds', icon: Landmark, color: 'from-purple-500 to-violet-500' },
  metals: { name: 'Metals', icon: Gem, color: 'from-yellow-500 to-amber-400' },
};

export default function TopAssetsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const market = params.market as string;
  const fromCapitalFlow = searchParams.get('from') === 'capital-flow';

  const [assets, setAssets] = useState<AssetScore[]>([]);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('reliabilityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const config = marketConfig[market] || marketConfig.stocks;
  const MarketIcon = config.icon;

  useEffect(() => {
    fetchAssets();
  }, [market]);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/analysis/multi-asset/${market}/all`);
      const result = await response.json();

      if (result.success) {
        setAssets(result.data.assets);
        setCacheInfo(result.data.cacheInfo);
      } else {
        setError(result.error?.message || 'Failed to load assets');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => {
      if (searchTerm && !asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !asset.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (verdictFilter !== 'all' && asset.verdict !== verdictFilter) {
        return false;
      }
      if (directionFilter !== 'all' && asset.direction !== directionFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof AssetScore] as number;
      const bVal = b[sortBy as keyof AssetScore] as number;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'GO': return 'bg-emerald-500 text-white';
      case 'CONDITIONAL_GO': return 'bg-yellow-500 text-white';
      case 'WAIT': return 'bg-orange-500 text-white';
      case 'AVOID': return 'bg-red-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading {config.name}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={fromCapitalFlow ? '/capital-flow' : '/analyze'}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', config.color)}>
              <MarketIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Top {config.name}
              </h1>
              <p className="text-sm text-slate-500">
                {cacheInfo?.freshAssets || 0} assets analyzed
                {cacheInfo?.lastScanAt && (
                  <span className="ml-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(cacheInfo.lastScanAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={fetchAssets}
            className="ml-auto p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchAssets}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search symbol or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Verdict Filter */}
                <select
                  value={verdictFilter}
                  onChange={(e) => setVerdictFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="all">All Verdicts</option>
                  <option value="GO">GO</option>
                  <option value="CONDITIONAL_GO">Conditional GO</option>
                  <option value="WAIT">WAIT</option>
                  <option value="AVOID">AVOID</option>
                </select>

                {/* Direction Filter */}
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="all">All Directions</option>
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="reliabilityScore">Reliability Score</option>
                  <option value="totalScore">Total Score</option>
                  <option value="priceChange1d">24h Change</option>
                  <option value="priceChange1m">30d Change</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {sortOrder === 'desc' ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Assets Grid */}
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">No assets match your filters</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setVerdictFilter('all');
                    setDirectionFilter('all');
                  }}
                  className="mt-4 text-blue-500 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssets.map((asset, idx) => (
                  <div
                    key={asset.symbol}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{asset.symbol}</h3>
                          {asset.direction && (
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs font-bold',
                              asset.direction === 'LONG' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                            )}>
                              {asset.direction}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate max-w-[200px]">{asset.name}</p>
                      </div>
                      <span className={cn('px-2 py-1 rounded-lg text-xs font-bold', getVerdictColor(asset.verdict))}>
                        {asset.verdict === 'CONDITIONAL_GO' ? 'COND' : asset.verdict}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          ${formatPrice(asset.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            'text-sm font-medium',
                            asset.priceChange1d >= 0 ? 'text-emerald-500' : 'text-red-500'
                          )}>
                            {asset.priceChange1d >= 0 ? '+' : ''}{asset.priceChange1d.toFixed(2)}%
                          </span>
                          <span className="text-xs text-slate-400">24h</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Score</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{asset.reliabilityScore}</p>
                      </div>
                    </div>

                    {/* Score Bars */}
                    <div className="space-y-2 mb-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Trend</span>
                          <span className="text-slate-700 dark:text-slate-300">{asset.trendScore}</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${asset.trendScore}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Momentum</span>
                          <span className="text-slate-700 dark:text-slate-300">{asset.momentumScore}</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${asset.momentumScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-slate-500">5D</p>
                        <p className={cn('font-bold', asset.priceChange5d >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {asset.priceChange5d >= 0 ? '+' : ''}{asset.priceChange5d.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-slate-500">1M</p>
                        <p className={cn('font-bold', asset.priceChange1m >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {asset.priceChange1m >= 0 ? '+' : ''}{asset.priceChange1m.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-slate-500">Vol</p>
                        <p className="font-bold text-slate-700 dark:text-slate-300">{formatVolume(asset.volume)}</p>
                      </div>
                    </div>

                    {/* Action */}
                    {asset.analysisId && (
                      <Link
                        href={`/analyze/details/${asset.analysisId}`}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:shadow-md transition-all"
                      >
                        <Zap className="w-4 h-4" />
                        View Analysis
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
