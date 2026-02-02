'use client';

// ===========================================
// UNIFIED ANALYSIS PAGE
// ALL 4 LAYERS in one place:
// L1: Global Liquidity | L2: Markets | L3: Sectors | L4: Analysis
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Target,
  Timer,
  ChevronRight,
  ChevronDown,
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
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Zap,
  Crown,
  Building2,
  Clock,
  RefreshCw,
  Activity,
  DollarSign,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';
import type { Timeframe } from '../../../components/analysis/TradeTypeSelector';
import { OnboardingTour, TourTriggerButton, TourStep } from '@/components/onboarding/OnboardingTour';

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

// Capital Flow Types
interface GlobalLiquidity {
  fedBalanceSheet: { value: number; change30d: number; trend: 'expanding' | 'contracting' | 'stable' };
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number };
  dxy: { value: number; change7d: number; trend: 'strengthening' | 'weakening' | 'stable' };
  vix: { value: number; level: string };
  yieldCurve: { spread10y2y: number; inverted: boolean; interpretation: string };
}

interface SectorFlow {
  name: string;
  flow7d: number;
  flow30d: number;
  dominance: number;
  trending: 'up' | 'down' | 'stable';
  phase: 'early' | 'mid' | 'late' | 'exit';
}

interface MarketFlow {
  market: AssetType;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  phase: 'early' | 'mid' | 'late' | 'exit';
  daysInPhase: number;
  avgPhaseDuration: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  sectors?: SectorFlow[];
}

interface FiveFactorScore {
  liquidityScore: number;
  flowScore: number;
  phaseScore: number;
  rotationScore: number;
  correlationScore: number;
  totalScore: number;
  breakdown: {
    liquidity: string;
    flow: string;
    phase: string;
    rotation: string;
    correlation: string;
  };
}

interface RecommendedAsset {
  symbol: string;
  name: string;
  market: string;
  sector?: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: string;
  action: 'analyze' | 'wait' | 'avoid';
  reason: string;
  sectors?: string[];
  confidence: number;
  fiveFactorScore?: FiveFactorScore;
  suggestedAssets?: RecommendedAsset[];
}

interface CapitalFlowData {
  timestamp: string;
  globalLiquidity: GlobalLiquidity;
  liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
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

// All available assets per market (complete list)
const ALL_SYMBOLS: Record<AssetType, { symbol: string; name: string }[]> = {
  crypto: [
    // Top 10
    { symbol: 'BTC', name: 'Bitcoin' }, { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'BNB' }, { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'XRP' }, { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' }, { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'DOT', name: 'Polkadot' }, { symbol: 'LINK', name: 'Chainlink' },
    // Top 20
    { symbol: 'MATIC', name: 'Polygon' }, { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'LTC', name: 'Litecoin' }, { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'XLM', name: 'Stellar' }, { symbol: 'TRX', name: 'TRON' },
    { symbol: 'ETC', name: 'Ethereum Classic' }, { symbol: 'NEAR', name: 'NEAR Protocol' },
    { symbol: 'APT', name: 'Aptos' }, { symbol: 'SUI', name: 'Sui' },
    // DeFi
    { symbol: 'AAVE', name: 'Aave' }, { symbol: 'MKR', name: 'Maker' },
    { symbol: 'CRV', name: 'Curve' }, { symbol: 'SNX', name: 'Synthetix' },
    { symbol: 'COMP', name: 'Compound' }, { symbol: '1INCH', name: '1inch' },
    { symbol: 'YFI', name: 'Yearn Finance' }, { symbol: 'SUSHI', name: 'SushiSwap' },
    // Layer 2
    { symbol: 'ARB', name: 'Arbitrum' }, { symbol: 'OP', name: 'Optimism' },
    { symbol: 'IMX', name: 'Immutable X' }, { symbol: 'STRK', name: 'Starknet' },
    // AI & Data
    { symbol: 'FET', name: 'Fetch.ai' }, { symbol: 'RNDR', name: 'Render' },
    { symbol: 'TAO', name: 'Bittensor' }, { symbol: 'OCEAN', name: 'Ocean Protocol' },
    { symbol: 'GRT', name: 'The Graph' }, { symbol: 'FIL', name: 'Filecoin' },
    // Gaming & NFT
    { symbol: 'INJ', name: 'Injective' }, { symbol: 'SAND', name: 'The Sandbox' },
    { symbol: 'MANA', name: 'Decentraland' }, { symbol: 'AXS', name: 'Axie Infinity' },
    { symbol: 'GALA', name: 'Gala' }, { symbol: 'ENJ', name: 'Enjin Coin' },
    // Meme Coins
    { symbol: 'PEPE', name: 'Pepe' }, { symbol: 'SHIB', name: 'Shiba Inu' },
    { symbol: 'BONK', name: 'Bonk' }, { symbol: 'WIF', name: 'dogwifhat' },
    { symbol: 'FLOKI', name: 'Floki' },
    // Others
    { symbol: 'VET', name: 'VeChain' }, { symbol: 'ALGO', name: 'Algorand' },
    { symbol: 'ICP', name: 'Internet Computer' }, { symbol: 'HBAR', name: 'Hedera' },
    { symbol: 'SEI', name: 'Sei' }, { symbol: 'TIA', name: 'Celestia' },
  ],
  stocks: [
    // Index ETFs
    { symbol: 'SPY', name: 'S&P 500 ETF' }, { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
    { symbol: 'DIA', name: 'Dow Jones ETF' }, { symbol: 'IWM', name: 'Russell 2000 ETF' },
    // Tech Giants
    { symbol: 'AAPL', name: 'Apple Inc.' }, { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' }, { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' }, { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms' }, { symbol: 'NFLX', name: 'Netflix Inc.' },
    // Finance
    { symbol: 'JPM', name: 'JPMorgan Chase' }, { symbol: 'BAC', name: 'Bank of America' },
    { symbol: 'GS', name: 'Goldman Sachs' }, { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'MA', name: 'Mastercard' },
    // Others
    { symbol: 'WMT', name: 'Walmart Inc.' }, { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'PG', name: 'Procter & Gamble' }, { symbol: 'XOM', name: 'ExxonMobil' },
    { symbol: 'CVX', name: 'Chevron Corp.' },
  ],
  bonds: [
    // Treasury ETFs
    { symbol: 'TLT', name: '20+ Year Treasury' }, { symbol: 'IEF', name: '7-10 Year Treasury' },
    { symbol: 'SHY', name: '1-3 Year Treasury' }, { symbol: 'GOVT', name: 'US Treasury' },
    // Broad Bond ETFs
    { symbol: 'BND', name: 'Total Bond Market' }, { symbol: 'AGG', name: 'Aggregate Bond' },
    // Corporate
    { symbol: 'LQD', name: 'Investment Grade Corp' }, { symbol: 'HYG', name: 'High Yield Corp' },
    { symbol: 'VCIT', name: 'Intermediate Corp' },
    // International
    { symbol: 'BNDX', name: 'International Bond' }, { symbol: 'EMB', name: 'Emerging Markets' },
  ],
  metals: [
    // Gold
    { symbol: 'GLD', name: 'Gold ETF (SPDR)' }, { symbol: 'IAU', name: 'Gold Trust (iShares)' },
    { symbol: 'GDX', name: 'Gold Miners ETF' }, { symbol: 'GDXJ', name: 'Jr Gold Miners' },
    // Silver
    { symbol: 'SLV', name: 'Silver ETF (iShares)' }, { symbol: 'SIL', name: 'Silver Miners' },
    // Other Precious
    { symbol: 'PPLT', name: 'Platinum ETF' }, { symbol: 'PALL', name: 'Palladium ETF' },
    // Base Metals
    { symbol: 'COPX', name: 'Copper Miners' }, { symbol: 'DBB', name: 'Base Metals' },
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

  // Capital Flow state (L1-L3)
  const [flowData, setFlowData] = useState<CapitalFlowData | null>(null);
  const [flowLoading, setFlowLoading] = useState(true);
  const [flowExpanded, setFlowExpanded] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketFlow | null>(null);

  // Asset Analysis state (L4)
  const [assetType, setAssetType] = useState<AssetType>(marketParam || 'crypto');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbolParam || '');
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [method, setMethod] = useState<AnalysisMethod>('classic');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Top Opportunities state
  const [topCoins, setTopCoins] = useState<TopCoin[]>([]);
  const [topCoinsLoading, setTopCoinsLoading] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [verdictFilter, setVerdictFilter] = useState<string>('all');

  // Daily Pass state (100 credits/day, max 10 analyses)
  const [dailyPassStatus, setDailyPassStatus] = useState<{
    hasPass: boolean;
    canUse: boolean;
    usageCount: number;
    maxUsage: number;
    expiresAt: Date | null;
  } | null>(null);
  const [purchasingPass, setPurchasingPass] = useState(false);

  // Fetch Daily Pass status
  const fetchDailyPassStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/passes/check/ASSET_ANALYSIS');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDailyPassStatus({
            hasPass: data.data.hasPass,
            canUse: data.data.canUse,
            usageCount: data.data.pass?.usageCount ?? 0,
            maxUsage: data.data.pass?.maxUsage ?? 10,
            expiresAt: data.data.pass?.expiresAt ? new Date(data.data.pass.expiresAt) : null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch daily pass status:', error);
    }
  }, []);

  useEffect(() => {
    fetchDailyPassStatus();
  }, [fetchDailyPassStatus]);

  // Purchase Daily Pass
  const purchaseDailyPass = async () => {
    setPurchasingPass(true);
    try {
      const res = await authFetch('/api/passes/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passType: 'ASSET_ANALYSIS' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Daily Analysis Pass purchased! You can now run up to 10 analyses today.');
        await fetchDailyPassStatus();
      } else {
        toast.error(data.error?.message || 'Failed to purchase pass. You need 100 credits.');
      }
    } catch (error) {
      console.error('Failed to purchase pass:', error);
      toast.error('Failed to purchase pass. Please try again.');
    } finally {
      setPurchasingPass(false);
    }
  };

  // Fetch Capital Flow data
  useEffect(() => {
    const fetchFlowData = async () => {
      setFlowLoading(true);
      try {
        const res = await authFetch('/api/capital-flow/summary');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setFlowData(data.data);
            // Auto-select recommended market
            if (data.data.recommendation?.primaryMarket && !marketParam) {
              const recMarket = data.data.recommendation.primaryMarket as AssetType;
              setAssetType(recMarket);
              // Find and set the market
              const market = data.data.markets?.find((m: MarketFlow) => m.market === recMarket);
              if (market) setSelectedMarket(market);
            } else if (marketParam) {
              setAssetType(marketParam);
              const market = data.data.markets?.find((m: MarketFlow) => m.market === marketParam);
              if (market) setSelectedMarket(market);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch capital flow:', error);
      } finally {
        setFlowLoading(false);
      }
    };
    fetchFlowData();
  }, [marketParam]);

  // Fetch top opportunities
  const fetchTopOpportunities = useCallback(async () => {
    setTopCoinsLoading(true);
    try {
      const res = await authFetch('/api/analysis/top-coins?limit=10&tradeableOnly=false');
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

  // Fetch top opportunities on mount
  useEffect(() => {
    fetchTopOpportunities();
  }, [fetchTopOpportunities]);

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
  };

  const runAnalysis = async () => {
    if (!selectedSymbol) {
      toast.error('Please select an asset to analyze');
      return;
    }

    // Check if user has a valid daily pass
    if (!dailyPassStatus?.hasPass || !dailyPassStatus?.canUse) {
      // No pass - ask to purchase
      const confirm = window.confirm(
        'You need a Daily Analysis Pass to run analyses.\n\n' +
        '100 Credits = 10 Analyses Today\n\n' +
        'Would you like to purchase a Daily Pass?'
      );
      if (confirm) {
        await purchaseDailyPass();
        // Re-check status and try again if pass was purchased
        const res = await authFetch('/api/passes/check/ASSET_ANALYSIS');
        const data = await res.json();
        if (data.success && data.data?.hasPass && data.data?.canUse) {
          setShowAnalysisDialog(true);
        }
      }
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

  // Helper functions for Capital Flow display
  const getLiquidityBiasDisplay = () => {
    if (!flowData) return { text: 'Loading', color: 'text-slate-500', bg: 'bg-slate-100' };
    const bias = flowData.liquidityBias;
    if (bias === 'risk_on') return { text: 'Risk-On', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20' };
    if (bias === 'risk_off') return { text: 'Risk-Off', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20' };
    return { text: 'Neutral', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20' };
  };

  const getPhaseColor = (phase: string) => {
    if (phase === 'early') return 'bg-emerald-500';
    if (phase === 'mid') return 'bg-amber-500';
    if (phase === 'late') return 'bg-orange-500';
    return 'bg-red-500';
  };

  const liquidityDisplay = getLiquidityBiasDisplay();

  // Analyze page tour steps
  const analyzeTourSteps: TourStep[] = [
    {
      target: '#tour-analyze-header',
      title: 'Welcome to Analysis Hub',
      content: 'This is where you run detailed analyses on assets. Use Capital Flow insights to guide your selection.',
      placement: 'bottom',
      spotlightPadding: 15,
    },
    {
      target: '#tour-capital-flow-context',
      title: 'Capital Flow Context',
      content: 'See the current Capital Flow status. Expand to view detailed L1-L3 data including global liquidity, market flow, and sector activity.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-asset-selection',
      title: 'Select Your Asset',
      content: 'Choose a market (Crypto, Stocks, Bonds, Metals), then search for or select a specific asset to analyze.',
      placement: 'right',
      spotlightPadding: 8,
    },
    {
      target: '#tour-timeframe',
      title: 'Choose Timeframe',
      content: 'Select the timeframe for your analysis. Shorter timeframes (15m, 1h) for scalping/day trading, longer (4h, 1d) for swing trades.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-method',
      title: 'MLIS Pro Confirmation',
      content: '7-Step Analysis runs 40+ indicators. Enable MLIS Pro for AI-powered confirmation of your analysis results (adds Step 8).',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-analyze-button',
      title: 'Run Analysis',
      content: 'Once everything is set, click to run the analysis. Requires a Daily Pass (100 credits/day for up to 10 analyses).',
      placement: 'top',
      spotlightPadding: 8,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Onboarding Tour */}
      <OnboardingTour
        steps={analyzeTourSteps}
        tourId="analyze"
        autoStart={true}
      />

      {/* Header */}
      <div id="tour-analyze-header" className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Analysis Hub</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">All 4 Layers • Capital Flow → Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TourTriggerButton tourId="analyze" />
              <button
                onClick={() => fetchTopOpportunities()}
                disabled={topCoinsLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", topCoinsLoading && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* ===== CAPITAL FLOW DASHBOARD (L1-L3) ===== */}
        <div id="tour-capital-flow-context" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Collapsed Header - Always Visible */}
          <button
            onClick={() => setFlowExpanded(!flowExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Globe className="w-5 h-5 text-teal-500" />
              <span className="font-semibold text-slate-900 dark:text-white">Capital Flow</span>
              {flowLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <div className="flex items-center gap-2">
                  {/* L1: Liquidity Badge */}
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", liquidityDisplay.bg, liquidityDisplay.color)}>
                    L1: {liquidityDisplay.text}
                  </span>
                  {/* L2: Top Market */}
                  {flowData?.recommendation && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      L2: {flowData.recommendation.primaryMarket.toUpperCase()}
                    </span>
                  )}
                  {/* L4: Recommendation */}
                  {flowData?.recommendation && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold text-white",
                      flowData.recommendation.action === 'analyze' ? 'bg-emerald-500' :
                      flowData.recommendation.action === 'wait' ? 'bg-amber-500' : 'bg-red-500'
                    )}>
                      {flowData.recommendation.action.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", flowExpanded && "rotate-180")} />
          </button>

          {/* Expanded Content */}
          {flowExpanded && flowData && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
              {/* L1: Global Liquidity */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Global Liquidity</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-[10px] text-slate-500 mb-1">Fed Balance</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{flowData.globalLiquidity.fedBalanceSheet.value.toFixed(2)}T</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-[10px] text-slate-500 mb-1">DXY</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{flowData.globalLiquidity.dxy.value.toFixed(1)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-[10px] text-slate-500 mb-1">VIX</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{flowData.globalLiquidity.vix.value.toFixed(1)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-[10px] text-slate-500 mb-1">10Y-2Y Spread</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{flowData.globalLiquidity.yieldCurve.spread10y2y.toFixed(2)}%</p>
                  </div>
                </div>
              </div>

              {/* L2: Market Flow */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Market Flow</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {flowData.markets.map((market) => (
                    <button
                      key={market.market}
                      onClick={() => {
                        setAssetType(market.market);
                        setSelectedMarket(market);
                      }}
                      className={cn(
                        "p-3 rounded-xl border transition-all text-left",
                        selectedMarket?.market === market.market
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{market.market}</span>
                        <span className={cn("w-2 h-2 rounded-full", getPhaseColor(market.phase))} />
                      </div>
                      <p className={cn(
                        "text-sm font-bold",
                        market.flow7d >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {market.flow7d >= 0 ? '+' : ''}{market.flow7d.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-slate-500">{market.phase} • {market.daysInPhase}d</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* L3: Sectors (if market selected) */}
              {selectedMarket?.sectors && selectedMarket.sectors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sectors ({selectedMarket.market})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMarket.sectors.slice(0, 6).map((sector) => (
                      <span
                        key={sector.name}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium",
                          sector.trending === 'up' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                          sector.trending === 'down' ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" :
                          "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        )}
                      >
                        {sector.name} {sector.flow7d >= 0 ? '+' : ''}{sector.flow7d.toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* L4: Recommendation with 5-Factor Score */}
              {flowData.recommendation && (
                <div className="space-y-3">
                  {/* Main Recommendation Box */}
                  <div className={cn(
                    "p-4 rounded-xl border-2",
                    flowData.recommendation.action === 'analyze' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" :
                    flowData.recommendation.action === 'wait' ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" :
                    "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">4</div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {flowData.recommendation.action.toUpperCase()}: {flowData.recommendation.primaryMarket.toUpperCase()}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          flowData.recommendation.phase === 'early' ? "bg-emerald-500 text-white" :
                          flowData.recommendation.phase === 'mid' ? "bg-amber-500 text-white" :
                          flowData.recommendation.phase === 'late' ? "bg-orange-500 text-white" :
                          "bg-red-500 text-white"
                        )}>
                          {flowData.recommendation.phase} Phase
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {flowData.recommendation.confidence}
                        </span>
                        <span className="text-[10px] text-slate-500">/100</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{flowData.recommendation.reason}</p>

                    {/* 5-Factor Score Visual */}
                    {flowData.recommendation.fiveFactorScore && (
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        {[
                          { key: 'liquidity', label: 'LIQ', score: flowData.recommendation.fiveFactorScore.liquidityScore, color: 'bg-blue-500' },
                          { key: 'flow', label: 'FLW', score: flowData.recommendation.fiveFactorScore.flowScore, color: 'bg-emerald-500' },
                          { key: 'phase', label: 'PHS', score: flowData.recommendation.fiveFactorScore.phaseScore, color: 'bg-purple-500' },
                          { key: 'rotation', label: 'ROT', score: flowData.recommendation.fiveFactorScore.rotationScore, color: 'bg-amber-500' },
                          { key: 'correlation', label: 'COR', score: flowData.recommendation.fiveFactorScore.correlationScore, color: 'bg-pink-500' },
                        ].map((factor) => (
                          <div key={factor.key} className="text-center">
                            <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 mb-1 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", factor.color)} style={{ width: `${factor.score}%` }} />
                            </div>
                            <p className="text-[9px] text-slate-500">{factor.label}</p>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{factor.score}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suggested Assets from Capital Flow */}
                  {flowData.recommendation.suggestedAssets && flowData.recommendation.suggestedAssets.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Suggested Assets</span>
                        <span className="text-[10px] text-slate-500 ml-auto">Click to analyze</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {flowData.recommendation.suggestedAssets.slice(0, 5).map((asset) => (
                          <button
                            key={asset.symbol}
                            onClick={() => {
                              setSelectedSymbol(asset.symbol);
                              setAssetType(asset.market as AssetType);
                            }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105",
                              selectedSymbol === asset.symbol
                                ? "bg-teal-50 dark:bg-teal-500/10 border-teal-500"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-teal-300"
                            )}
                          >
                            <CoinIcon symbol={asset.symbol} size={20} />
                            <div className="text-left">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">{asset.symbol}</p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{asset.reason}</p>
                            </div>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                              asset.riskLevel === 'low' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" :
                              asset.riskLevel === 'medium' ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" :
                              "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                            )}>
                              {asset.riskLevel}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== TOP OPPORTUNITIES (Quick View) ===== */}
        {topCoins.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Top Opportunities</span>
                <span className="text-xs text-slate-500">({topCoins.length})</span>
              </div>
              {lastScanTime && (
                <span className="text-[10px] text-slate-400">{new Date(lastScanTime).toLocaleTimeString()}</span>
              )}
            </div>
            <div className="p-2 flex gap-2 overflow-x-auto">
              {topCoins.slice(0, 5).map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    if (coin.analysisId) {
                      router.push(`/analyze/details/${coin.analysisId}`);
                    } else {
                      setSelectedSymbol(coin.symbol);
                      setAssetType('crypto');
                    }
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 transition-all"
                >
                  <CoinIcon symbol={coin.symbol} size={24} />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{coin.symbol}</p>
                    <p className={cn("text-[10px] font-medium", coin.priceChange24h >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {coin.priceChange24h >= 0 ? '+' : ''}{coin.priceChange24h?.toFixed(1)}%
                    </p>
                  </div>
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold text-white", getVerdictColor(coin.verdict, coin.recommendation))}>
                    {(coin.recommendation || coin.verdict)?.split('_')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== L4: ASSET ANALYSIS ===== */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: Asset Selection + Parameters */}
          <div className="lg:col-span-2 space-y-4">
            {/* Asset Selection */}
            <div id="tour-asset-selection" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-teal-500" />
                    Select Asset
                  </h2>
                  <span className="text-xs text-slate-500">{ALL_SYMBOLS[assetType].length} available</span>
                </div>
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
                        onClick={() => { setAssetType(type); setSelectedSymbol(''); setSearchQuery(''); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-all",
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

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${ASSET_CONFIGS[assetType].name.toLowerCase()}...`}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* All Assets Grid (scrollable) */}
                <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {ALL_SYMBOLS[assetType]
                      .filter(asset =>
                        searchQuery.length === 0 ||
                        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((asset) => (
                        <button
                          key={asset.symbol}
                          onClick={() => handleSelectSymbol(asset.symbol)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                            selectedSymbol === asset.symbol
                              ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10 ring-2 ring-teal-500/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          {assetType === 'crypto' ? (
                            <CoinIcon symbol={asset.symbol} size={28} />
                          ) : (
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                              `bg-gradient-to-br ${ASSET_CONFIGS[assetType].gradient}`
                            )}>
                              {asset.symbol.slice(0, 2)}
                            </div>
                          )}
                          <span className={cn(
                            "text-xs font-semibold text-center leading-tight",
                            selectedSymbol === asset.symbol
                              ? "text-teal-700 dark:text-teal-400"
                              : "text-slate-900 dark:text-white"
                          )}>
                            {asset.symbol}
                          </span>
                          <span className="text-[9px] text-slate-500 text-center leading-tight line-clamp-1">
                            {asset.name}
                          </span>
                        </button>
                      ))}
                  </div>
                  {searchQuery.length > 0 && ALL_SYMBOLS[assetType].filter(asset =>
                    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No assets found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
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
                <div id="tour-timeframe" className="flex gap-2">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border transition-all",
                        timeframe === tf.value
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <span className={cn("text-sm font-bold", timeframe === tf.value ? "text-teal-700 dark:text-teal-400" : "text-slate-900 dark:text-white")}>{tf.label}</span>
                      <span className={cn("text-[10px]", timeframe === tf.value ? "text-teal-600" : "text-slate-500")}>{tf.type}</span>
                    </button>
                  ))}
                </div>

                {/* Analysis Info */}
                <div id="tour-method" className="p-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-teal-500" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">7-Step Analysis</span>
                    <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-bold">40+ Indicators</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">MLIS Pro Confirmation</span>
                      <span className="px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[8px] font-bold">Step 8</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Included</span>
                  </div>
                </div>

                {/* Selected Asset Display */}
                {selectedSymbol && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800">
                    {assetType === 'crypto' && <CoinIcon symbol={selectedSymbol} size={28} />}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedSymbol}</p>
                      <p className="text-xs text-slate-500">{ALL_SYMBOLS[assetType].find(s => s.symbol === selectedSymbol)?.name}</p>
                    </div>
                    <span className="text-xs font-medium text-teal-600 dark:text-teal-400">Ready</span>
                  </div>
                )}

                {/* Daily Pass Status */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Daily Analysis Pass</span>
                    {dailyPassStatus?.hasPass ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                        Not Active
                      </span>
                    )}
                  </div>
                  {dailyPassStatus?.hasPass ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
                          style={{ width: `${((dailyPassStatus.maxUsage - dailyPassStatus.usageCount) / dailyPassStatus.maxUsage) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {dailyPassStatus.maxUsage - dailyPassStatus.usageCount}/{dailyPassStatus.maxUsage} left
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={purchaseDailyPass}
                      disabled={purchasingPass}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {purchasingPass ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Purchasing...
                        </span>
                      ) : (
                        'Buy Pass • 100 Credits = 10 Analyses'
                      )}
                    </button>
                  )}
                </div>

                {/* Run Button */}
                <button
                  id="tour-analyze-button"
                  onClick={runAnalysis}
                  disabled={!selectedSymbol || !dailyPassStatus?.canUse}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-white transition-all",
                    selectedSymbol && dailyPassStatus?.canUse
                      ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:shadow-lg hover:shadow-teal-500/20"
                      : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                  )}
                >
                  <Zap className="w-5 h-5" />
                  <span>Analyze {selectedSymbol || 'Asset'}</span>
                  {dailyPassStatus?.hasPass && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
                      FREE ({dailyPassStatus.maxUsage - dailyPassStatus.usageCount} left)
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Recent Analyses */}
          <div className="lg:col-span-1">
            <div id="recent-analyses" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden h-full">
              <div className="p-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
                <RecentAnalyses />
              </div>
            </div>
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
            // Refresh daily pass status after analysis
            fetchDailyPassStatus();
            setTimeout(() => {
              document.getElementById('recent-analyses')?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
          }}
        />
      )}
    </div>
  );
}
