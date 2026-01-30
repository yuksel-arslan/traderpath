'use client';

// ===========================================
// Top Assets Page - Multi-Market Asset Listing
// Shows top performing assets for stocks, bonds, and metals
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Building2,
  Landmark,
  Gem,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  SortAsc,
  SortDesc,
  RefreshCw,
  Clock,
  Search,
  ArrowLeft,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { authFetch } from '../../../../lib/api';

// Market configuration
const MARKET_CONFIG: Record<string, {
  name: string;
  icon: typeof Building2;
  gradient: string;
  bgGradient: string;
  textColor: string;
  borderColor: string;
}> = {
  stocks: {
    name: 'Stocks',
    icon: Building2,
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-400/20 to-indigo-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  bonds: {
    name: 'Bonds',
    icon: Landmark,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-400/20 to-purple-500/10',
    textColor: 'text-violet-500',
    borderColor: 'border-violet-500/30',
  },
  metals: {
    name: 'Metals',
    icon: Gem,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-400/20 to-orange-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
};

interface Asset {
  symbol: string;
  normalized: string;
  price: number;
  change24h: number;
  volume24h: number;
}

type SortField = 'change24h' | 'price' | 'volume24h' | 'symbol';
type SortOrder = 'asc' | 'desc';

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
function GradientOrbs({ market }: { market: string }) {
  const config = MARKET_CONFIG[market] || MARKET_CONFIG.stocks;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={cn(
        "absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-float-slow",
        `bg-gradient-to-br ${config.bgGradient}`
      )} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-teal-400/15 to-emerald-500/10 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
    </div>
  );
}

export default function TopAssetsPage() {
  const router = useRouter();
  const params = useParams();
  const market = (params?.market as string) || 'stocks';

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('change24h');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Validate market parameter
  const validMarkets = ['stocks', 'bonds', 'metals'];
  const isValidMarket = validMarkets.includes(market);
  const marketConfig = MARKET_CONFIG[market] || MARKET_CONFIG.stocks;
  const MarketIcon = marketConfig.icon;

  // Fetch assets for the market
  const fetchAssets = useCallback(async () => {
    if (!isValidMarket) {
      setError('Invalid market type');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/multi-market/top/${market}?limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setAssets(data.data.assets || []);
          setLastUpdated(new Date(data.data.timestamp));
        } else {
          setError(data.error || 'Failed to fetch assets');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch assets');
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError('Failed to fetch assets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [market, isValidMarket]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => {
      if (searchQuery && !asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'change24h':
          aVal = a.change24h || 0;
          bVal = b.change24h || 0;
          break;
        case 'price':
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
        case 'volume24h':
          aVal = a.volume24h || 0;
          bVal = b.volume24h || 0;
          break;
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        default:
          aVal = a.change24h || 0;
          bVal = b.change24h || 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  // Format price based on value
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  // Format volume
  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  // Handle asset click - navigate to analyze
  const handleAssetClick = (asset: Asset) => {
    router.push(`/analyze?symbol=${encodeURIComponent(asset.normalized)}&market=${market}`);
  };

  // Handle invalid market
  if (!isValidMarket) {
    return (
      <div className="relative min-h-screen">
        <GradientOrbs market="stocks" />
        <div className="relative w-full px-3 sm:px-4 md:px-8 lg:px-12 py-4 sm:py-8">
          <GlassCard className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid Market</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              The market "{market}" is not supported. Please select a valid market.
            </p>
            <div className="flex justify-center gap-3">
              {validMarkets.map((m) => {
                const cfg = MARKET_CONFIG[m];
                const Icon = cfg.icon;
                return (
                  <button
                    key={m}
                    onClick={() => router.push(`/top-assets/${m}`)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
                      "bg-gradient-to-r text-white transition-all hover:shadow-lg",
                      cfg.gradient
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {cfg.name}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <GradientOrbs market={market} />

      <div className="relative w-full px-3 sm:px-4 md:px-8 lg:px-12 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/capital-flow')}
              className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all"
              title="Back to Capital Flow"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MarketIcon className={cn("w-6 h-6", marketConfig.textColor)} />
                Top {marketConfig.name}
              </h1>
              {lastUpdated && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/capital-flow')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all"
            >
              <Globe className="w-4 h-4" />
              Capital Flow
            </button>
            <button
              onClick={fetchAssets}
              disabled={loading}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:shadow-lg transition-all",
                `bg-gradient-to-r ${marketConfig.gradient}`,
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Market Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {validMarkets.map((m) => {
            const cfg = MARKET_CONFIG[m];
            const Icon = cfg.icon;
            const isActive = m === market;

            return (
              <button
                key={m}
                onClick={() => router.push(`/top-assets/${m}`)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  isActive
                    ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-lg`
                    : "bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80"
                )}
              >
                <Icon className="w-4 h-4" />
                {cfg.name}
              </button>
            );
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Assets</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{assets.length}</p>
          </GlassCard>
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Gainers</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-500">
              {assets.filter(a => a.change24h > 0).length}
            </p>
          </GlassCard>
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Losers</p>
            <p className="text-xl sm:text-2xl font-bold text-red-500">
              {assets.filter(a => a.change24h < 0).length}
            </p>
          </GlassCard>
          <GlassCard className="p-3 sm:p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg Change</p>
            <p className={cn(
              "text-xl sm:text-2xl font-bold",
              assets.length > 0 && (assets.reduce((sum, a) => sum + a.change24h, 0) / assets.length) >= 0
                ? "text-emerald-500"
                : "text-red-500"
            )}>
              {assets.length > 0
                ? `${(assets.reduce((sum, a) => sum + a.change24h, 0) / assets.length).toFixed(2)}%`
                : 'N/A'}
            </p>
          </GlassCard>
        </div>

        {/* Search and Sort */}
        <GlassCard className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${marketConfig.name.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              >
                <option value="change24h">24h Change</option>
                <option value="price">Price</option>
                <option value="volume24h">Volume</option>
                <option value="symbol">Symbol</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700"
                title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                ) : (
                  <SortDesc className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Results Count */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredAssets.length} of {assets.length} {marketConfig.name.toLowerCase()}
        </p>

        {/* Assets Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <GlassCard className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchAssets}
              className={cn(
                "px-4 py-2 rounded-xl text-white font-medium transition-all",
                `bg-gradient-to-r ${marketConfig.gradient}`
              )}
            >
              Try Again
            </button>
          </GlassCard>
        ) : filteredAssets.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <MarketIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">No assets found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {assets.length === 0 ? 'Unable to load assets' : 'Try adjusting your search'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map((asset, index) => (
              <GlassCard
                key={asset.symbol}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02]",
                  `hover:${marketConfig.borderColor}`
                )}
              >
                <div onClick={() => handleAssetClick(asset)}>
                  {/* Rank Badge */}
                  <div className={cn(
                    "absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg z-10",
                    `bg-gradient-to-br ${marketConfig.gradient}`
                  )}>
                    {index + 1}
                  </div>

                  {/* Market Badge */}
                  <div className={cn(
                    "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg z-10",
                    `bg-gradient-to-r ${marketConfig.gradient}`
                  )}>
                    {marketConfig.name.toUpperCase()}
                  </div>

                  {/* Asset Info */}
                  <div className="flex items-center gap-3 mb-3 pt-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      `bg-gradient-to-br ${marketConfig.bgGradient}`
                    )}>
                      <MarketIcon className={cn("w-5 h-5", marketConfig.textColor)} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{asset.symbol}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatPrice(asset.price)}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">24h Change</span>
                      <span className={cn(
                        "font-semibold flex items-center gap-1",
                        asset.change24h >= 0 ? "text-emerald-500" : "text-red-500"
                      )}>
                        {asset.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {asset.change24h >= 0 ? '+' : ''}{asset.change24h?.toFixed(2) || '0.00'}%
                      </span>
                    </div>
                    {asset.volume24h > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Volume</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {formatVolume(asset.volume24h)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Analyze Link */}
                  <div className="mt-3 pt-3 border-t border-white/10 dark:border-slate-700 flex items-center justify-end">
                    <span className={cn(
                      "text-xs font-medium flex items-center gap-1",
                      marketConfig.textColor
                    )}>
                      Analyze <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
