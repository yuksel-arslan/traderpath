'use client';

// ===========================================
// UNIFIED ANALYSIS PAGE
// LAYER 4: Asset Micro Analysis + Top Opportunities
// Part of Capital Flow hierarchy
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Target,
  Timer,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  Coins,
  Landmark,
  Gem,
  Loader2,
  Globe,
  Layers,
  ArrowRight,
  Info,
  Zap,
  Crown,
  Building2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';
import type { Timeframe } from '../../../components/analysis/TradeTypeSelector';

// Lazy load components
const CoinIcon = dynamic(
  () => import('../../../components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" /> }
);

const RecentAnalyses = dynamic(
  () => import('../../../components/analysis/RecentAnalyses').then(mod => ({ default: mod.RecentAnalyses })),
  { ssr: false, loading: () => <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" /> }
);

const AnalysisDialog = dynamic(
  () => import('../../../components/analysis/AnalysisDialog').then(mod => ({ default: mod.AnalysisDialog })),
  { ssr: false }
);

// Types
type AssetType = 'crypto' | 'stocks' | 'bonds' | 'metals';
type AnalysisMethod = 'classic' | 'mlis_pro';
type TabType = 'new-analysis' | 'top-opportunities';

interface CapitalFlowContext {
  liquidity: { bias: 'risk_on' | 'risk_off' | 'neutral'; expanding: boolean };
  recommendedMarket: AssetType | null;
  recommendedSector: string | null;
  phase: 'early' | 'mid' | 'late' | 'exit' | null;
  recommendation: string;
}

interface SuggestedAsset {
  symbol: string;
  name: string;
  change24h: number;
}

interface TopCoin {
  symbol: string;
  reliabilityScore: number;
  verdict: string;
  direction: string | null;
  price: number;
  priceChange24h: number;
  analysisId: string | null;
  method?: 'classic' | 'mlis_pro';
  recommendation?: string;
}

// Asset configurations
const ASSET_CONFIGS: Record<AssetType, { name: string; icon: React.ElementType; gradient: string }> = {
  crypto: { name: 'Crypto', icon: Coins, gradient: 'from-amber-500 to-orange-500' },
  stocks: { name: 'Stocks', icon: Building2, gradient: 'from-blue-500 to-indigo-500' },
  bonds: { name: 'Bonds', icon: Landmark, gradient: 'from-purple-500 to-violet-500' },
  metals: { name: 'Metals', icon: Gem, gradient: 'from-yellow-500 to-amber-400' },
};

// Default suggested assets per market
const DEFAULT_SUGGESTIONS: Record<AssetType, SuggestedAsset[]> = {
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin', change24h: 0 },
    { symbol: 'ETH', name: 'Ethereum', change24h: 0 },
    { symbol: 'SOL', name: 'Solana', change24h: 0 },
    { symbol: 'BNB', name: 'BNB', change24h: 0 },
    { symbol: 'XRP', name: 'XRP', change24h: 0 },
  ],
  stocks: [
    { symbol: 'SPY', name: 'S&P 500 ETF', change24h: 0 },
    { symbol: 'QQQ', name: 'Nasdaq 100', change24h: 0 },
    { symbol: 'AAPL', name: 'Apple', change24h: 0 },
    { symbol: 'MSFT', name: 'Microsoft', change24h: 0 },
    { symbol: 'NVDA', name: 'NVIDIA', change24h: 0 },
  ],
  bonds: [
    { symbol: 'TLT', name: '20+ Year Treasury', change24h: 0 },
    { symbol: 'IEF', name: '7-10 Year Treasury', change24h: 0 },
    { symbol: 'BND', name: 'Total Bond Market', change24h: 0 },
  ],
  metals: [
    { symbol: 'GLD', name: 'Gold ETF', change24h: 0 },
    { symbol: 'SLV', name: 'Silver ETF', change24h: 0 },
    { symbol: 'IAU', name: 'Gold Trust', change24h: 0 },
  ],
};

// Sector-based suggestions for crypto
const SECTOR_SUGGESTIONS: Record<string, SuggestedAsset[]> = {
  defi: [
    { symbol: 'AAVE', name: 'Aave', change24h: 0 },
    { symbol: 'UNI', name: 'Uniswap', change24h: 0 },
    { symbol: 'MKR', name: 'Maker', change24h: 0 },
  ],
  layer2: [
    { symbol: 'ARB', name: 'Arbitrum', change24h: 0 },
    { symbol: 'OP', name: 'Optimism', change24h: 0 },
    { symbol: 'MATIC', name: 'Polygon', change24h: 0 },
  ],
  ai: [
    { symbol: 'FET', name: 'Fetch.ai', change24h: 0 },
    { symbol: 'RNDR', name: 'Render', change24h: 0 },
    { symbol: 'TAO', name: 'Bittensor', change24h: 0 },
  ],
  meme: [
    { symbol: 'DOGE', name: 'Dogecoin', change24h: 0 },
    { symbol: 'SHIB', name: 'Shiba Inu', change24h: 0 },
    { symbol: 'PEPE', name: 'Pepe', change24h: 0 },
  ],
};

// All searchable symbols
const ALL_SYMBOLS: Record<AssetType, { symbol: string; name: string }[]> = {
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin' }, { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' }, { symbol: 'BNB', name: 'BNB' },
    { symbol: 'XRP', name: 'XRP' }, { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' }, { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'DOT', name: 'Polkadot' }, { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'MATIC', name: 'Polygon' }, { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'AAVE', name: 'Aave' }, { symbol: 'MKR', name: 'Maker' },
    { symbol: 'ARB', name: 'Arbitrum' }, { symbol: 'OP', name: 'Optimism' },
    { symbol: 'FET', name: 'Fetch.ai' }, { symbol: 'RNDR', name: 'Render' },
    { symbol: 'NEAR', name: 'NEAR Protocol' }, { symbol: 'APT', name: 'Aptos' },
    { symbol: 'SUI', name: 'Sui' }, { symbol: 'INJ', name: 'Injective' },
    { symbol: 'PEPE', name: 'Pepe' }, { symbol: 'SHIB', name: 'Shiba Inu' },
    { symbol: 'LTC', name: 'Litecoin' }, { symbol: 'ATOM', name: 'Cosmos' },
  ],
  stocks: [
    { symbol: 'SPY', name: 'S&P 500 ETF' }, { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
    { symbol: 'AAPL', name: 'Apple Inc.' }, { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' }, { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' }, { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms' }, { symbol: 'JPM', name: 'JPMorgan Chase' },
  ],
  bonds: [
    { symbol: 'TLT', name: '20+ Year Treasury ETF' }, { symbol: 'IEF', name: '7-10 Year Treasury ETF' },
    { symbol: 'SHY', name: '1-3 Year Treasury ETF' }, { symbol: 'BND', name: 'Total Bond Market ETF' },
    { symbol: 'LQD', name: 'Investment Grade Corp ETF' }, { symbol: 'HYG', name: 'High Yield Corp ETF' },
  ],
  metals: [
    { symbol: 'GLD', name: 'Gold ETF (SPDR)' }, { symbol: 'SLV', name: 'Silver ETF (iShares)' },
    { symbol: 'IAU', name: 'Gold Trust (iShares)' }, { symbol: 'PPLT', name: 'Platinum ETF' },
    { symbol: 'GDX', name: 'Gold Miners ETF' }, { symbol: 'GDXJ', name: 'Junior Gold Miners ETF' },
  ],
};

// Timeframe options
const TIMEFRAMES: { value: Timeframe; label: string; type: string }[] = [
  { value: '15m', label: '15m', type: 'Scalp' },
  { value: '1h', label: '1H', type: 'Day' },
  { value: '4h', label: '4H', type: 'Day' },
  { value: '1d', label: '1D', type: 'Swing' },
];

export default function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params
  const marketParam = searchParams.get('market') as AssetType | null;
  const sectorParam = searchParams.get('sector');
  const symbolParam = searchParams.get('symbol');
  const tabParam = searchParams.get('tab') as TabType | null;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'new-analysis');

  // New Analysis state
  const [assetType, setAssetType] = useState<AssetType>(marketParam || 'crypto');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbolParam || '');
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [method, setMethod] = useState<AnalysisMethod>('classic');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Capital Flow context
  const [flowContext, setFlowContext] = useState<CapitalFlowContext | null>(null);
  const [flowLoading, setFlowLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestedAsset[]>([]);

  // Top Opportunities state
  const [topCoins, setTopCoins] = useState<TopCoin[]>([]);
  const [topCoinsLoading, setTopCoinsLoading] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [verdictFilter, setVerdictFilter] = useState<string>('all');

  // Fetch Capital Flow context
  useEffect(() => {
    const fetchFlowContext = async () => {
      setFlowLoading(true);
      try {
        const res = await authFetch('/api/capital-flow/summary');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const { liquidityBias, recommendation, markets } = data.data;
            let bestMarket: AssetType | null = null;
            let bestPhase: string | null = null;

            if (markets) {
              const marketOrder: AssetType[] = ['crypto', 'stocks', 'metals', 'bonds'];
              for (const m of marketOrder) {
                if (markets[m]?.phase === 'early' || markets[m]?.phase === 'mid') {
                  bestMarket = m;
                  bestPhase = markets[m].phase;
                  break;
                }
              }
            }

            setFlowContext({
              liquidity: { bias: liquidityBias || 'neutral', expanding: liquidityBias === 'risk_on' },
              recommendedMarket: marketParam || bestMarket,
              recommendedSector: sectorParam || null,
              phase: bestPhase as any,
              recommendation: recommendation?.text || 'Select an asset to analyze',
            });

            if (marketParam) setAssetType(marketParam);
            else if (bestMarket) setAssetType(bestMarket);
          }
        }
      } catch (error) {
        console.error('Failed to fetch capital flow:', error);
      } finally {
        setFlowLoading(false);
      }
    };
    fetchFlowContext();
  }, [marketParam, sectorParam]);

  // Fetch top opportunities
  const fetchTopOpportunities = useCallback(async () => {
    setTopCoinsLoading(true);
    try {
      const res = await authFetch('/api/analysis/top-coins?limit=20&tradeableOnly=false');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setTopCoins(data.data.coins || []);
          if (data.data.cacheInfo?.lastUpdated) {
            setLastScanTime(data.data.cacheInfo.lastUpdated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch top coins:', error);
    } finally {
      setTopCoinsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'top-opportunities') {
      fetchTopOpportunities();
    }
  }, [activeTab, fetchTopOpportunities]);

  // Update suggestions based on asset type and sector
  useEffect(() => {
    if (sectorParam && assetType === 'crypto' && SECTOR_SUGGESTIONS[sectorParam]) {
      setSuggestions(SECTOR_SUGGESTIONS[sectorParam]);
    } else {
      setSuggestions(DEFAULT_SUGGESTIONS[assetType] || []);
    }
  }, [assetType, sectorParam]);

  // Filter symbols for search
  const filteredSymbols = searchQuery.length > 0
    ? ALL_SYMBOLS[assetType].filter(
        s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
             s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  // Filter top coins
  const filteredTopCoins = topCoins.filter(coin => {
    if (verdictFilter === 'all') return true;
    if (verdictFilter === 'GO') return coin.verdict === 'GO' || coin.recommendation === 'STRONG_BUY' || coin.recommendation === 'BUY';
    if (verdictFilter === 'WAIT') return coin.verdict === 'WAIT' || coin.verdict === 'CONDITIONAL_GO' || coin.recommendation === 'HOLD';
    if (verdictFilter === 'AVOID') return coin.verdict === 'AVOID' || coin.recommendation === 'SELL' || coin.recommendation === 'STRONG_SELL';
    return true;
  });

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSearchQuery('');
    setShowSearch(false);
  };

  const runAnalysis = () => {
    if (!selectedSymbol) {
      toast.error('Please select an asset to analyze');
      return;
    }
    setShowAnalysisDialog(true);
  };

  const getVerdictColor = (verdict: string, rec?: string) => {
    const v = rec || verdict;
    if (['GO', 'STRONG_BUY', 'BUY'].includes(v)) return 'bg-emerald-500';
    if (['CONDITIONAL_GO', 'HOLD'].includes(v)) return 'bg-amber-500';
    if (['WAIT'].includes(v)) return 'bg-slate-500';
    return 'bg-red-500';
  };

  const hasFlowContext = marketParam || sectorParam;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Analysis</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">LAYER 4: Micro-level analysis</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/capital-flow')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Capital Flow</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setActiveTab('new-analysis')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'new-analysis'
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Target className="w-4 h-4" />
              New Analysis
            </button>
            <button
              onClick={() => setActiveTab('top-opportunities')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'top-opportunities'
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Crown className="w-4 h-4" />
              Top Opportunities
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* TAB: New Analysis */}
        {activeTab === 'new-analysis' && (
          <>
            {/* Capital Flow Context */}
            <div className={cn(
              "rounded-2xl border overflow-hidden transition-all",
              hasFlowContext
                ? "bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            )}>
              <div className="p-4">
                {flowLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    <span className="text-sm text-slate-500">Loading context...</span>
                  </div>
                ) : hasFlowContext ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                      <Globe className="w-3.5 h-3.5" />
                      CAPITAL FLOW CONTEXT
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-medium text-slate-500">L1</span>
                        <span className={cn(
                          "text-xs font-semibold",
                          flowContext?.liquidity.bias === 'risk_on' ? "text-emerald-600" :
                          flowContext?.liquidity.bias === 'risk_off' ? "text-red-600" : "text-amber-600"
                        )}>
                          {flowContext?.liquidity.bias === 'risk_on' ? 'Risk-On' : flowContext?.liquidity.bias === 'risk_off' ? 'Risk-Off' : 'Neutral'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-medium text-slate-500">L2</span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white capitalize">{flowContext?.recommendedMarket || assetType}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500 text-white">
                        <span className="text-[10px] font-medium opacity-80">L4</span>
                        <span className="text-xs font-semibold">Analysis</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">No Capital Flow Context</p>
                        <p className="text-xs text-slate-500">Start from Capital Flow for optimal timing</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/capital-flow')}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg transition-all"
                    >
                      <Globe className="w-4 h-4" />
                      Go to Capital Flow
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Asset Selection */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-500" />
                  Select Asset
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Market Tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {(Object.keys(ASSET_CONFIGS) as AssetType[]).map((type) => {
                    const config = ASSET_CONFIGS[type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => { setAssetType(type); setSelectedSymbol(''); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          assetType === type
                            ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                            : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{config.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Suggested Assets */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Popular Assets</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((asset) => (
                      <button
                        key={asset.symbol}
                        onClick={() => handleSelectSymbol(asset.symbol)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                          selectedSymbol === asset.symbol
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                        )}
                      >
                        {assetType === 'crypto' && <CoinIcon symbol={asset.symbol} size={20} />}
                        <span className={cn(
                          "text-sm font-semibold",
                          selectedSymbol === asset.symbol ? "text-teal-700 dark:text-teal-400" : "text-slate-900 dark:text-white"
                        )}>{asset.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                    onFocus={() => setShowSearch(true)}
                    placeholder={`Search ${ASSET_CONFIGS[assetType].name.toLowerCase()}...`}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {showSearch && filteredSymbols.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50 max-h-64 overflow-y-auto">
                      {filteredSymbols.map((item) => (
                        <button
                          key={item.symbol}
                          onClick={() => handleSelectSymbol(item.symbol)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {assetType === 'crypto' && <CoinIcon symbol={item.symbol} size={24} />}
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.symbol}</p>
                            <p className="text-xs text-slate-500">{item.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Asset */}
                {selectedSymbol && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800">
                    {assetType === 'crypto' && <CoinIcon symbol={selectedSymbol} size={32} />}
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedSymbol}</p>
                      <p className="text-xs text-slate-500">{ALL_SYMBOLS[assetType].find(s => s.symbol === selectedSymbol)?.name || 'Selected'}</p>
                    </div>
                    <span className="ml-auto text-xs font-medium text-teal-600 dark:text-teal-400">Ready</span>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Parameters */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Timer className="w-4 h-4 text-teal-500" />
                  Parameters
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Timeframe */}
                <div className="flex gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-all",
                        timeframe === tf.value
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                    >
                      <span className={cn("text-sm font-bold", timeframe === tf.value ? "text-teal-700 dark:text-teal-400" : "text-slate-900 dark:text-white")}>{tf.label}</span>
                      <span className={cn("text-[10px]", timeframe === tf.value ? "text-teal-600" : "text-slate-500")}>{tf.type}</span>
                    </button>
                  ))}
                </div>

                {/* Method */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMethod('classic')}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      method === 'classic' ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10" : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-teal-500" />
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">Classic 7-Step</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">40+ indicators, trade plan</p>
                  </button>
                  <button
                    onClick={() => setMethod('mlis_pro')}
                    className={cn(
                      "relative p-4 rounded-xl border text-left transition-all",
                      method === 'mlis_pro' ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-bold rounded-full">NEW</div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">MLIS Pro</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">5-layer neural analysis</p>
                  </button>
                </div>

                {/* Run Button */}
                <button
                  onClick={runAnalysis}
                  disabled={!selectedSymbol}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-white transition-all",
                    selectedSymbol
                      ? method === 'mlis_pro'
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/20"
                        : "bg-gradient-to-r from-teal-500 to-emerald-600 hover:shadow-lg hover:shadow-teal-500/20"
                      : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                  )}
                >
                  <Zap className="w-5 h-5" />
                  <span>Run {method === 'mlis_pro' ? 'MLIS Pro' : '7-Step'} Analysis</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">25 Credits</span>
                </button>
              </div>
            </div>

            {/* Recent Analyses */}
            <div id="recent-analyses" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-500" />
                  Recent Analyses
                </h2>
                <button onClick={() => router.push('/reports')} className="text-xs font-medium text-teal-600 dark:text-teal-400 flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="p-4">
                <RecentAnalyses />
              </div>
            </div>
          </>
        )}

        {/* TAB: Top Opportunities */}
        {activeTab === 'top-opportunities' && (
          <div className="space-y-4">
            {/* Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Top Opportunities</p>
                  {lastScanTime && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last scan: {new Date(lastScanTime).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={fetchTopOpportunities}
                disabled={topCoinsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", topCoinsLoading && "animate-spin")} />
                Refresh
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {['all', 'GO', 'WAIT', 'AVOID'].map((f) => (
                <button
                  key={f}
                  onClick={() => setVerdictFilter(f)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    verdictFilter === f
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>

            {/* Coins List */}
            {topCoinsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : filteredTopCoins.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500">No opportunities found</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredTopCoins.map((coin, index) => (
                  <div
                    key={coin.symbol}
                    onClick={() => {
                      if (coin.analysisId) {
                        router.push(`/analyze/details/${coin.analysisId}`);
                      } else {
                        setSelectedSymbol(coin.symbol);
                        setAssetType('crypto');
                        setActiveTab('new-analysis');
                      }
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-500">
                      {index + 1}
                    </div>
                    <CoinIcon symbol={coin.symbol} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{coin.symbol}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold text-white",
                          getVerdictColor(coin.verdict, coin.recommendation)
                        )}>
                          {coin.recommendation?.replace('_', ' ') || coin.verdict?.replace('_', ' ')}
                        </span>
                        {coin.method === 'mlis_pro' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">MLIS</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">Score: {Math.round(coin.reliabilityScore)}</span>
                        {coin.direction && (
                          <span className={cn(
                            "text-xs font-medium",
                            coin.direction === 'LONG' ? "text-emerald-500" : "text-red-500"
                          )}>
                            {coin.direction === 'LONG' ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                            {' '}{coin.direction}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-semibold",
                        coin.priceChange24h >= 0 ? "text-emerald-500" : "text-red-500"
                      )}>
                        {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h?.toFixed(2)}%
                      </p>
                      <p className="text-xs text-slate-500">${coin.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Dialog */}
      {showAnalysisDialog && selectedSymbol && (
        <AnalysisDialog
          isOpen={showAnalysisDialog}
          symbol={selectedSymbol}
          coinName={ALL_SYMBOLS[assetType].find(s => s.symbol === selectedSymbol)?.name || selectedSymbol}
          timeframe={timeframe}
          analysisMethod={method}
          onClose={() => setShowAnalysisDialog(false)}
          onComplete={() => {
            setShowAnalysisDialog(false);
            setTimeout(() => {
              document.getElementById('recent-analyses')?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
          }}
        />
      )}
    </div>
  );
}
