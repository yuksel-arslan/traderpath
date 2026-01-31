'use client';

// ===========================================
// LAYER 4: Asset Micro Analysis
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
  Brain,
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
} from 'lucide-react';
// Credit notifications handled by AnalysisDialog
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

interface CapitalFlowContext {
  liquidity: {
    bias: 'risk_on' | 'risk_off' | 'neutral';
    expanding: boolean;
  };
  recommendedMarket: AssetType | null;
  recommendedSector: string | null;
  phase: 'early' | 'mid' | 'late' | 'exit' | null;
  recommendation: string;
}

interface SuggestedAsset {
  symbol: string;
  name: string;
  change24h: number;
  score?: number;
  verdict?: string;
}

// Asset configurations
const ASSET_CONFIGS: Record<AssetType, {
  name: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}> = {
  crypto: {
    name: 'Crypto',
    icon: Coins,
    color: 'text-amber-500',
    gradient: 'from-amber-500 to-orange-500'
  },
  stocks: {
    name: 'Stocks',
    icon: BarChart3,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-indigo-500'
  },
  bonds: {
    name: 'Bonds',
    icon: Landmark,
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-violet-500'
  },
  metals: {
    name: 'Metals',
    icon: Gem,
    color: 'text-yellow-500',
    gradient: 'from-yellow-500 to-amber-400'
  },
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
    { symbol: 'LQD', name: 'Investment Grade', change24h: 0 },
    { symbol: 'HYG', name: 'High Yield Corp', change24h: 0 },
  ],
  metals: [
    { symbol: 'GLD', name: 'Gold ETF', change24h: 0 },
    { symbol: 'SLV', name: 'Silver ETF', change24h: 0 },
    { symbol: 'IAU', name: 'Gold Trust', change24h: 0 },
    { symbol: 'PPLT', name: 'Platinum ETF', change24h: 0 },
    { symbol: 'GDX', name: 'Gold Miners', change24h: 0 },
  ],
};

// Sector-based suggestions for crypto
const SECTOR_SUGGESTIONS: Record<string, SuggestedAsset[]> = {
  defi: [
    { symbol: 'AAVE', name: 'Aave', change24h: 0 },
    { symbol: 'UNI', name: 'Uniswap', change24h: 0 },
    { symbol: 'MKR', name: 'Maker', change24h: 0 },
    { symbol: 'CRV', name: 'Curve', change24h: 0 },
    { symbol: 'COMP', name: 'Compound', change24h: 0 },
  ],
  layer2: [
    { symbol: 'ARB', name: 'Arbitrum', change24h: 0 },
    { symbol: 'OP', name: 'Optimism', change24h: 0 },
    { symbol: 'MATIC', name: 'Polygon', change24h: 0 },
    { symbol: 'IMX', name: 'Immutable X', change24h: 0 },
    { symbol: 'STRK', name: 'Starknet', change24h: 0 },
  ],
  ai: [
    { symbol: 'FET', name: 'Fetch.ai', change24h: 0 },
    { symbol: 'RNDR', name: 'Render', change24h: 0 },
    { symbol: 'AGIX', name: 'SingularityNET', change24h: 0 },
    { symbol: 'TAO', name: 'Bittensor', change24h: 0 },
    { symbol: 'WLD', name: 'Worldcoin', change24h: 0 },
  ],
  meme: [
    { symbol: 'DOGE', name: 'Dogecoin', change24h: 0 },
    { symbol: 'SHIB', name: 'Shiba Inu', change24h: 0 },
    { symbol: 'PEPE', name: 'Pepe', change24h: 0 },
    { symbol: 'WIF', name: 'dogwifhat', change24h: 0 },
    { symbol: 'BONK', name: 'Bonk', change24h: 0 },
  ],
};

// All searchable symbols
const ALL_SYMBOLS: Record<AssetType, { symbol: string; name: string }[]> = {
  crypto: [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'AAVE', name: 'Aave' },
    { symbol: 'MKR', name: 'Maker' },
    { symbol: 'CRV', name: 'Curve' },
    { symbol: 'COMP', name: 'Compound' },
    { symbol: 'ARB', name: 'Arbitrum' },
    { symbol: 'OP', name: 'Optimism' },
    { symbol: 'FET', name: 'Fetch.ai' },
    { symbol: 'RNDR', name: 'Render' },
    { symbol: 'NEAR', name: 'NEAR Protocol' },
    { symbol: 'APT', name: 'Aptos' },
    { symbol: 'SUI', name: 'Sui' },
    { symbol: 'INJ', name: 'Injective' },
    { symbol: 'TIA', name: 'Celestia' },
    { symbol: 'PEPE', name: 'Pepe' },
    { symbol: 'SHIB', name: 'Shiba Inu' },
    { symbol: 'WIF', name: 'dogwifhat' },
    { symbol: 'BONK', name: 'Bonk' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'BCH', name: 'Bitcoin Cash' },
    { symbol: 'ETC', name: 'Ethereum Classic' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'FIL', name: 'Filecoin' },
    { symbol: 'LDO', name: 'Lido DAO' },
    { symbol: 'IMX', name: 'Immutable X' },
  ],
  stocks: [
    { symbol: 'SPY', name: 'S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
    { symbol: 'DIA', name: 'Dow Jones ETF' },
    { symbol: 'IWM', name: 'Russell 2000 ETF' },
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble' },
    { symbol: 'MA', name: 'Mastercard' },
    { symbol: 'HD', name: 'Home Depot' },
    { symbol: 'BAC', name: 'Bank of America' },
    { symbol: 'XOM', name: 'Exxon Mobil' },
  ],
  bonds: [
    { symbol: 'TLT', name: '20+ Year Treasury ETF' },
    { symbol: 'IEF', name: '7-10 Year Treasury ETF' },
    { symbol: 'SHY', name: '1-3 Year Treasury ETF' },
    { symbol: 'BND', name: 'Total Bond Market ETF' },
    { symbol: 'LQD', name: 'Investment Grade Corp ETF' },
    { symbol: 'HYG', name: 'High Yield Corp ETF' },
    { symbol: 'AGG', name: 'Core U.S. Aggregate Bond' },
    { symbol: 'GOVT', name: 'U.S. Treasury Bond ETF' },
    { symbol: 'TIP', name: 'TIPS Bond ETF' },
    { symbol: 'MUB', name: 'Municipal Bonds ETF' },
  ],
  metals: [
    { symbol: 'GLD', name: 'Gold ETF (SPDR)' },
    { symbol: 'SLV', name: 'Silver ETF (iShares)' },
    { symbol: 'IAU', name: 'Gold Trust (iShares)' },
    { symbol: 'PPLT', name: 'Platinum ETF' },
    { symbol: 'PALL', name: 'Palladium ETF' },
    { symbol: 'GDX', name: 'Gold Miners ETF' },
    { symbol: 'GDXJ', name: 'Junior Gold Miners ETF' },
    { symbol: 'SIL', name: 'Silver Miners ETF' },
    { symbol: 'COPX', name: 'Copper Miners ETF' },
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

  // URL params from Capital Flow
  const marketParam = searchParams.get('market') as AssetType | null;
  const sectorParam = searchParams.get('sector');
  const symbolParam = searchParams.get('symbol');

  // State
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

            // Find best market
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
              liquidity: {
                bias: liquidityBias || 'neutral',
                expanding: liquidityBias === 'risk_on',
              },
              recommendedMarket: marketParam || bestMarket,
              recommendedSector: sectorParam || null,
              phase: bestPhase as any,
              recommendation: recommendation?.text || 'Select an asset to analyze',
            });

            // Update asset type if from URL
            if (marketParam) {
              setAssetType(marketParam);
            } else if (bestMarket) {
              setAssetType(bestMarket);
            }
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
      ).slice(0, 10)
    : [];

  // Handle symbol selection
  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSearchQuery('');
    setShowSearch(false);
  };

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedSymbol) {
      toast.error('Please select an asset to analyze');
      return;
    }

    setShowAnalysisDialog(true);
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
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  LAYER 4: Asset Analysis
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Micro-level technical analysis
                </p>
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
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
                <span className="text-sm text-slate-500">Loading Capital Flow context...</span>
              </div>
            ) : hasFlowContext ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                  <Globe className="w-3.5 h-3.5" />
                  CAPITAL FLOW CONTEXT
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Layer 1 */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">L1</span>
                    <span className={cn(
                      "text-xs font-semibold",
                      flowContext?.liquidity.bias === 'risk_on' ? "text-emerald-600 dark:text-emerald-400" :
                      flowContext?.liquidity.bias === 'risk_off' ? "text-red-600 dark:text-red-400" :
                      "text-amber-600 dark:text-amber-400"
                    )}>
                      {flowContext?.liquidity.bias === 'risk_on' ? 'Risk-On' :
                       flowContext?.liquidity.bias === 'risk_off' ? 'Risk-Off' : 'Neutral'}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400" />

                  {/* Layer 2 */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">L2</span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white capitalize">
                      {flowContext?.recommendedMarket || assetType}
                    </span>
                    {flowContext?.phase && (
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        flowContext.phase === 'early' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                        flowContext.phase === 'mid' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                        "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                      )}>
                        {flowContext.phase.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {sectorParam && (
                    <>
                      <ChevronRight className="w-4 h-4 text-slate-400" />

                      {/* Layer 3 */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">L3</span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white capitalize">
                          {sectorParam}
                        </span>
                      </div>
                    </>
                  )}

                  <ChevronRight className="w-4 h-4 text-slate-400" />

                  {/* Layer 4 */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500 text-white">
                    <span className="text-[10px] font-medium opacity-80">L4</span>
                    <span className="text-xs font-semibold">Asset Analysis</span>
                  </div>
                </div>

                {flowContext?.recommendation && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-teal-500" />
                    {flowContext.recommendation}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      No Capital Flow Context
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Start from Capital Flow for optimal market timing
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/capital-flow')}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-teal-500/20 transition-all"
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
                const isSelected = assetType === type;

                return (
                  <button
                    key={type}
                    onClick={() => {
                      setAssetType(type);
                      setSelectedSymbol('');
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isSelected
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
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {sectorParam ? `Suggested ${sectorParam.toUpperCase()} Assets` : 'Popular Assets'}
              </p>
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
                    {assetType === 'crypto' && (
                      <CoinIcon symbol={asset.symbol} size={20} />
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      selectedSymbol === asset.symbol
                        ? "text-teal-700 dark:text-teal-400"
                        : "text-slate-900 dark:text-white"
                    )}>
                      {asset.symbol}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  placeholder={`Search ${ASSET_CONFIGS[assetType].name.toLowerCase()}...`}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              {showSearch && filteredSymbols.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50 max-h-64 overflow-y-auto">
                  {filteredSymbols.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => handleSelectSymbol(item.symbol)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {assetType === 'crypto' && (
                        <CoinIcon symbol={item.symbol} size={24} />
                      )}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.symbol}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Asset Display */}
            {selectedSymbol && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800">
                {assetType === 'crypto' && (
                  <CoinIcon symbol={selectedSymbol} size={32} />
                )}
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedSymbol}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ALL_SYMBOLS[assetType].find(s => s.symbol === selectedSymbol)?.name || 'Selected asset'}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                    Ready to analyze
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Parameters */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-teal-500" />
              Analysis Parameters
            </h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Timeframe */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Timeframe</p>
              <div className="flex gap-2">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-all",
                      timeframe === tf.value
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-bold",
                      timeframe === tf.value
                        ? "text-teal-700 dark:text-teal-400"
                        : "text-slate-900 dark:text-white"
                    )}>
                      {tf.label}
                    </span>
                    <span className={cn(
                      "text-[10px]",
                      timeframe === tf.value
                        ? "text-teal-600 dark:text-teal-500"
                        : "text-slate-500 dark:text-slate-400"
                    )}>
                      {tf.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Method */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Analysis Method</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Classic */}
                <button
                  onClick={() => setMethod('classic')}
                  className={cn(
                    "relative p-4 rounded-xl border text-left transition-all",
                    method === 'classic'
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      method === 'classic'
                        ? "border-teal-500 bg-teal-500"
                        : "border-slate-300 dark:border-slate-600"
                    )}>
                      {method === 'classic' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-teal-500" />
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          Classic 7-Step
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        40+ indicators, trade plan, AI expert insights
                      </p>
                    </div>
                  </div>
                </button>

                {/* MLIS Pro */}
                <button
                  onClick={() => setMethod('mlis_pro')}
                  className={cn(
                    "relative p-4 rounded-xl border text-left transition-all",
                    method === 'mlis_pro'
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-bold rounded-full">
                    NEW
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      method === 'mlis_pro'
                        ? "border-violet-500 bg-violet-500"
                        : "border-slate-300 dark:border-slate-600"
                    )}>
                      {method === 'mlis_pro' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          MLIS Pro
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        5-layer neural analysis, confidence score
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Run Analysis Button */}
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
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
                25 Credits
              </span>
            </button>
          </div>
        </div>

        {/* Recent Analyses */}
        <div id="recent-analyses" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              Your Layer 4 Analyses
            </h2>
            <button
              onClick={() => router.push('/reports')}
              className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4">
            <RecentAnalyses />
          </div>
        </div>
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
            // Scroll to recent analyses
            setTimeout(() => {
              document.getElementById('recent-analyses')?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
          }}
        />
      )}
    </div>
  );
}
