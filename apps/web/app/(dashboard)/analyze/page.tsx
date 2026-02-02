'use client';

// ===========================================
// UNIFIED ANALYSIS PAGE
// Merged Analyze + Reports into single view
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Target,
  Timer,
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
  Zap,
  Building2,
  Clock,
  RefreshCw,
  Download,
  Mail,
  Minus,
  Eye,
  Bot,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  Layers,
  Activity,
  Calendar,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch, getAuthToken, getApiUrl } from '../../../lib/api';
import type { Timeframe } from '../../../components/analysis/TradeTypeSelector';
import Link from 'next/link';

// Lazy load components
const CoinIcon = dynamic(
  () => import('../../../components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" /> }
);

const AnalysisDialog = dynamic(
  () => import('../../../components/analysis/AnalysisDialog').then(mod => ({ default: mod.AnalysisDialog })),
  { ssr: false }
);

// Types
type AssetType = 'crypto' | 'stocks' | 'bonds' | 'metals';
type AnalysisMethod = 'classic' | 'mlis_pro';
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type VerdictFilter = 'all' | 'go' | 'conditional_go' | 'wait' | 'avoid';
type OutcomeFilter = 'all' | 'live' | 'tp' | 'sl';
type SortOption = 'time_desc' | 'time_asc' | 'pnl_desc' | 'pnl_asc' | 'score_desc' | 'score_asc';

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number | null;
  direction: string | null;
  tradeType?: TradeType;
  method?: AnalysisMethod;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  tpProgress?: number;
  hasTradePlan?: boolean;
  expiresAt?: string;
}

// Asset configurations
const ASSET_CONFIGS: Record<AssetType, { name: string; icon: React.ElementType; gradient: string }> = {
  crypto: { name: 'Crypto', icon: Coins, gradient: 'from-amber-500 to-orange-500' },
  stocks: { name: 'Stocks', icon: Building2, gradient: 'from-blue-500 to-indigo-500' },
  bonds: { name: 'Bonds', icon: Landmark, gradient: 'from-purple-500 to-violet-500' },
  metals: { name: 'Metals', icon: Gem, gradient: 'from-yellow-500 to-amber-400' },
};

// Sector configurations
const SECTOR_CONFIGS: Record<AssetType, { name: string; value: string }[]> = {
  crypto: [
    { name: 'All Crypto', value: 'all' },
    { name: 'DeFi', value: 'defi' },
    { name: 'Layer 2', value: 'layer2' },
    { name: 'AI & Data', value: 'ai' },
    { name: 'Gaming', value: 'gaming' },
    { name: 'Meme', value: 'meme' },
  ],
  stocks: [
    { name: 'All Stocks', value: 'all' },
    { name: 'Tech', value: 'tech' },
    { name: 'Finance', value: 'finance' },
    { name: 'ETFs', value: 'etf' },
  ],
  bonds: [
    { name: 'All Bonds', value: 'all' },
    { name: 'Treasury', value: 'treasury' },
    { name: 'Corporate', value: 'corporate' },
  ],
  metals: [
    { name: 'All Metals', value: 'all' },
    { name: 'Gold', value: 'gold' },
    { name: 'Silver', value: 'silver' },
  ],
};

// All available assets per market (complete list)
const ALL_SYMBOLS: Record<AssetType, Record<string, { symbol: string; name: string }[]>> = {
  crypto: {
    all: [
      { symbol: 'BTC', name: 'Bitcoin' }, { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'BNB', name: 'BNB' }, { symbol: 'SOL', name: 'Solana' },
      { symbol: 'XRP', name: 'XRP' }, { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'AVAX', name: 'Avalanche' }, { symbol: 'DOGE', name: 'Dogecoin' },
      { symbol: 'DOT', name: 'Polkadot' }, { symbol: 'LINK', name: 'Chainlink' },
      { symbol: 'MATIC', name: 'Polygon' }, { symbol: 'UNI', name: 'Uniswap' },
      { symbol: 'LTC', name: 'Litecoin' }, { symbol: 'ATOM', name: 'Cosmos' },
      { symbol: 'NEAR', name: 'NEAR' }, { symbol: 'APT', name: 'Aptos' },
    ],
    defi: [
      { symbol: 'AAVE', name: 'Aave' }, { symbol: 'UNI', name: 'Uniswap' },
      { symbol: 'MKR', name: 'Maker' }, { symbol: 'CRV', name: 'Curve' },
      { symbol: 'SNX', name: 'Synthetix' }, { symbol: 'COMP', name: 'Compound' },
    ],
    layer2: [
      { symbol: 'ARB', name: 'Arbitrum' }, { symbol: 'OP', name: 'Optimism' },
      { symbol: 'MATIC', name: 'Polygon' }, { symbol: 'IMX', name: 'Immutable X' },
    ],
    ai: [
      { symbol: 'FET', name: 'Fetch.ai' }, { symbol: 'RNDR', name: 'Render' },
      { symbol: 'TAO', name: 'Bittensor' }, { symbol: 'OCEAN', name: 'Ocean' },
      { symbol: 'GRT', name: 'The Graph' },
    ],
    gaming: [
      { symbol: 'INJ', name: 'Injective' }, { symbol: 'SAND', name: 'Sandbox' },
      { symbol: 'MANA', name: 'Decentraland' }, { symbol: 'AXS', name: 'Axie' },
      { symbol: 'GALA', name: 'Gala' },
    ],
    meme: [
      { symbol: 'DOGE', name: 'Dogecoin' }, { symbol: 'SHIB', name: 'Shiba Inu' },
      { symbol: 'PEPE', name: 'Pepe' }, { symbol: 'BONK', name: 'Bonk' },
      { symbol: 'WIF', name: 'dogwifhat' }, { symbol: 'FLOKI', name: 'Floki' },
    ],
  },
  stocks: {
    all: [
      { symbol: 'SPY', name: 'S&P 500 ETF' }, { symbol: 'QQQ', name: 'Nasdaq 100' },
      { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'NVDA', name: 'NVIDIA' }, { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'AMZN', name: 'Amazon' }, { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'META', name: 'Meta' }, { symbol: 'JPM', name: 'JPMorgan' },
    ],
    tech: [
      { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'NVDA', name: 'NVIDIA' }, { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'AMZN', name: 'Amazon' }, { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'META', name: 'Meta' }, { symbol: 'NFLX', name: 'Netflix' },
    ],
    finance: [
      { symbol: 'JPM', name: 'JPMorgan' }, { symbol: 'BAC', name: 'Bank of America' },
      { symbol: 'GS', name: 'Goldman Sachs' }, { symbol: 'V', name: 'Visa' },
      { symbol: 'MA', name: 'Mastercard' },
    ],
    etf: [
      { symbol: 'SPY', name: 'S&P 500 ETF' }, { symbol: 'QQQ', name: 'Nasdaq 100' },
      { symbol: 'DIA', name: 'Dow Jones ETF' }, { symbol: 'IWM', name: 'Russell 2000' },
    ],
  },
  bonds: {
    all: [
      { symbol: 'TLT', name: '20+ Year Treasury' }, { symbol: 'IEF', name: '7-10 Year Treasury' },
      { symbol: 'SHY', name: '1-3 Year Treasury' }, { symbol: 'BND', name: 'Total Bond' },
      { symbol: 'AGG', name: 'Aggregate Bond' }, { symbol: 'LQD', name: 'Investment Grade' },
    ],
    treasury: [
      { symbol: 'TLT', name: '20+ Year Treasury' }, { symbol: 'IEF', name: '7-10 Year Treasury' },
      { symbol: 'SHY', name: '1-3 Year Treasury' }, { symbol: 'GOVT', name: 'US Treasury' },
    ],
    corporate: [
      { symbol: 'LQD', name: 'Investment Grade' }, { symbol: 'HYG', name: 'High Yield' },
      { symbol: 'VCIT', name: 'Intermediate Corp' },
    ],
  },
  metals: {
    all: [
      { symbol: 'GLD', name: 'Gold ETF' }, { symbol: 'SLV', name: 'Silver ETF' },
      { symbol: 'IAU', name: 'Gold Trust' }, { symbol: 'GDX', name: 'Gold Miners' },
    ],
    gold: [
      { symbol: 'GLD', name: 'Gold ETF' }, { symbol: 'IAU', name: 'Gold Trust' },
      { symbol: 'GDX', name: 'Gold Miners' }, { symbol: 'GDXJ', name: 'Jr Gold Miners' },
    ],
    silver: [
      { symbol: 'SLV', name: 'Silver ETF' }, { symbol: 'SIL', name: 'Silver Miners' },
    ],
  },
};

// Timeframe options
const TIMEFRAMES: { value: Timeframe; label: string; type: string }[] = [
  { value: '15m', label: '15m', type: 'Scalp' },
  { value: '1h', label: '1H', type: 'Day' },
  { value: '4h', label: '4H', type: 'Day' },
  { value: '1d', label: '1D', type: 'Swing' },
];

// Trade type config
const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalping', icon: Zap, color: 'teal' },
  dayTrade: { label: 'Day Trade', icon: Activity, color: 'slate' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
};

// Verdict config
const VERDICT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  go: { label: 'GO', bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400' },
  conditional_go: { label: 'COND', bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
  wait: { label: 'WAIT', bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  avoid: { label: 'AVOID', bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400' },
};

// Filter options
const VERDICT_FILTERS: { value: VerdictFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'go', label: 'GO' },
  { value: 'conditional_go', label: 'COND' },
  { value: 'wait', label: 'WAIT' },
  { value: 'avoid', label: 'AVOID' },
];

const OUTCOME_FILTERS: { value: OutcomeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'LIVE' },
  { value: 'tp', label: 'TP HIT' },
  { value: 'sl', label: 'SL HIT' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'time_desc', label: 'Newest' },
  { value: 'time_asc', label: 'Oldest' },
  { value: 'pnl_desc', label: 'P/L ↓' },
  { value: 'pnl_asc', label: 'P/L ↑' },
  { value: 'score_desc', label: 'Score ↓' },
  { value: 'score_asc', label: 'Score ↑' },
];

export default function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selection state
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [sector, setSector] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [method, setMethod] = useState<AnalysisMethod>('classic');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);

  // Recent analyses state
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('time_desc');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  // Daily Pass state
  const [dailyPassStatus, setDailyPassStatus] = useState<{
    hasPass: boolean;
    canUse: boolean;
    usageCount: number;
    maxUsage: number;
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
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch daily pass status:', error);
    }
  }, []);

  // Fetch recent analyses
  const fetchAnalyses = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setAnalyses([]);
        setAnalysesLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('/api/analysis/live-prices'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const responseText = await response.text();
        if (responseText && responseText.trim() !== '') {
          const result = JSON.parse(responseText);
          const liveAnalyses = result.data?.analyses || [];

          const mapped = liveAnalyses.map((a: any) => {
            const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
            let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
            if (rawVerdict === 'go') verdict = 'go';
            else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo' || rawVerdict === 'cond') verdict = 'conditional_go';
            else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

            let tradeType: TradeType | undefined;
            if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
            else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
            else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';

            let outcome: 'correct' | 'incorrect' | 'pending' | null = null;
            if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') {
              outcome = 'correct';
            } else if (a.outcome === 'sl_hit') {
              outcome = 'incorrect';
            } else if (a.hasTradePlan) {
              outcome = 'pending';
            }

            return {
              id: a.id,
              symbol: a.symbol,
              verdict,
              score: a.totalScore !== null && a.totalScore !== undefined ? a.totalScore : null,
              direction: a.direction,
              tradeType,
              method: (a.method === 'mlis_pro' ? 'mlis_pro' : 'classic') as AnalysisMethod,
              createdAt: new Date(a.createdAt).toLocaleDateString('en-US', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              }),
              outcome,
              entryPrice: a.entryPrice,
              currentPrice: a.currentPrice,
              unrealizedPnL: a.unrealizedPnL,
              stopLoss: a.stopLoss,
              takeProfit1: a.takeProfit1,
              tpProgress: a.tpProgress,
              hasTradePlan: a.hasTradePlan,
              expiresAt: a.expiresAt,
            };
          });

          setAnalyses(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    } finally {
      setAnalysesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyPassStatus();
    fetchAnalyses();
    const interval = setInterval(fetchAnalyses, 30000);
    return () => clearInterval(interval);
  }, [fetchDailyPassStatus, fetchAnalyses]);

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
        toast.success('Daily Analysis Pass purchased!');
        await fetchDailyPassStatus();
      } else {
        toast.error(data.error?.message || 'Failed to purchase pass.');
      }
    } catch (error) {
      toast.error('Failed to purchase pass.');
    } finally {
      setPurchasingPass(false);
    }
  };

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedSymbol) {
      toast.error('Please select an asset to analyze');
      return;
    }

    if (!dailyPassStatus?.hasPass || !dailyPassStatus?.canUse) {
      const confirm = window.confirm(
        'You need a Daily Analysis Pass.\n\n100 Credits = 10 Analyses Today\n\nPurchase now?'
      );
      if (confirm) {
        await purchaseDailyPass();
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

  // Delete analysis
  const handleDelete = async (e: React.MouseEvent, analysisId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this analysis?')) return;

    setActionLoading({ id: analysisId, action: 'delete' });
    try {
      const response = await authFetch(`/api/analysis/${analysisId}`, { method: 'DELETE' });
      if (response.ok) {
        setAnalyses(analyses.filter(a => a.id !== analysisId));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Send email
  const handleEmail = (e: React.MouseEvent, analysis: RecentAnalysis) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/analyze/details/${analysis.id}?email=true`);
  };

  // Get current assets based on market and sector
  const currentAssets = ALL_SYMBOLS[assetType][sector] || ALL_SYMBOLS[assetType]['all'];
  const filteredAssets = currentAssets.filter(asset =>
    searchQuery.length === 0 ||
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter and sort analyses
  const filteredAnalyses = analyses.filter(a => {
    if (verdictFilter !== 'all' && a.verdict !== verdictFilter) return false;
    if (outcomeFilter === 'live' && (a.outcome === 'correct' || a.outcome === 'incorrect')) return false;
    if (outcomeFilter === 'tp' && a.outcome !== 'correct') return false;
    if (outcomeFilter === 'sl' && a.outcome !== 'incorrect') return false;
    return true;
  });

  const sortedAnalyses = [...filteredAnalyses].sort((a, b) => {
    switch (sortBy) {
      case 'time_desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'time_asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'pnl_desc': return (b.unrealizedPnL ?? -Infinity) - (a.unrealizedPnL ?? -Infinity);
      case 'pnl_asc': return (a.unrealizedPnL ?? Infinity) - (b.unrealizedPnL ?? Infinity);
      case 'score_desc': return (b.score ?? -Infinity) - (a.score ?? -Infinity);
      case 'score_asc': return (a.score ?? Infinity) - (b.score ?? Infinity);
      default: return 0;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Analyze</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Run analysis • View reports</p>
              </div>
            </div>
            <button
              onClick={() => fetchAnalyses()}
              disabled={analysesLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", analysesLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Selection Row - All dropdowns in one line */}
        <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            {/* Market Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Market:</span>
              <div className="relative">
                <select
                  value={assetType}
                  onChange={(e) => { setAssetType(e.target.value as AssetType); setSector('all'); setSelectedSymbol(''); }}
                  className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium pl-3 pr-8 py-2 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {(Object.keys(ASSET_CONFIGS) as AssetType[]).map((type) => (
                    <option key={type} value={type}>{ASSET_CONFIGS[type].name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Sector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sector:</span>
              <div className="relative">
                <select
                  value={sector}
                  onChange={(e) => { setSector(e.target.value); setSelectedSymbol(''); }}
                  className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium pl-3 pr-8 py-2 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {SECTOR_CONFIGS[assetType].map((s) => (
                    <option key={s.value} value={s.value}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Asset Dropdown with Search */}
            <div className="flex items-center gap-2 relative">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Asset:</span>
              <div className="relative">
                <button
                  onClick={() => setAssetDropdownOpen(!assetDropdownOpen)}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium pl-3 pr-8 py-2 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 min-w-[140px]"
                >
                  {selectedSymbol ? (
                    <span className="flex items-center gap-2">
                      {assetType === 'crypto' && <CoinIcon symbol={selectedSymbol} size={18} />}
                      {selectedSymbol}
                    </span>
                  ) : (
                    <span className="text-slate-400">Select asset...</span>
                  )}
                </button>
                <ChevronDown className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform", assetDropdownOpen && "rotate-180")} />

                {assetDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAssetDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-900 border-0 rounded-lg focus:ring-2 focus:ring-teal-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-1">
                        {filteredAssets.length === 0 ? (
                          <div className="p-4 text-center text-sm text-slate-500">No assets found</div>
                        ) : (
                          filteredAssets.map((asset) => (
                            <button
                              key={asset.symbol}
                              onClick={() => { setSelectedSymbol(asset.symbol); setAssetDropdownOpen(false); setSearchQuery(''); }}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                selectedSymbol === asset.symbol
                                  ? "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-700/50"
                              )}
                            >
                              {assetType === 'crypto' && <CoinIcon symbol={asset.symbol} size={20} />}
                              <span className="font-medium">{asset.symbol}</span>
                              <span className="text-slate-500 dark:text-slate-400 text-xs">{asset.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Timeframe Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Timeframe:</span>
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                  className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium pl-3 pr-8 py-2 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf.value} value={tf.value}>{tf.label} ({tf.type})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={runAnalysis}
              disabled={!selectedSymbol || !dailyPassStatus?.canUse}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-all ml-auto",
                selectedSymbol && dailyPassStatus?.canUse
                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:shadow-lg hover:shadow-teal-500/20"
                  : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
              )}
            >
              <Zap className="w-4 h-4" />
              Analyze
            </button>
          </div>

          {/* Daily Pass Status */}
          {dailyPassStatus && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">Daily Pass:</span>
              {dailyPassStatus.hasPass ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">Active</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{dailyPassStatus.maxUsage - dailyPassStatus.usageCount}/{dailyPassStatus.maxUsage} analyses left</span>
                </div>
              ) : (
                <button
                  onClick={purchaseDailyPass}
                  disabled={purchasingPass}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {purchasingPass ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy Pass • 100 Credits'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Analysis Result Area */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 min-h-[400px] flex items-center justify-center">
              {selectedSymbol ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {assetType === 'crypto' && <CoinIcon symbol={selectedSymbol} size={48} />}
                    <div className="text-left">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSymbol}</h2>
                      <p className="text-sm text-slate-500">{currentAssets.find(a => a.symbol === selectedSymbol)?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium">{ASSET_CONFIGS[assetType].name}</span>
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium">{timeframe}</span>
                  </div>
                  <button
                    onClick={runAnalysis}
                    disabled={!dailyPassStatus?.canUse}
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all",
                      dailyPassStatus?.canUse
                        ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:shadow-lg hover:shadow-teal-500/20"
                        : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                    )}
                  >
                    <Zap className="w-5 h-5" />
                    Run 7-Step Analysis
                  </button>
                  <p className="text-xs text-slate-400 mt-3">40+ indicators • AI-powered • ~60 seconds</p>
                </div>
              ) : (
                <div className="text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Select an Asset</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    Choose a market, sector, and asset from the dropdowns above to start your analysis.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recent Analyses */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Recent Analyses
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      ({sortedAnalyses.length})
                    </span>
                  </h3>
                  <button
                    onClick={() => fetchAnalyses()}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <RefreshCw className={cn("w-4 h-4 text-slate-500", analysesLoading && "animate-spin")} />
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <select
                      value={verdictFilter}
                      onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                      className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium pl-2 pr-6 py-1 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {VERDICT_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={outcomeFilter}
                      onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
                      className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium pl-2 pr-6 py-1 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {OUTCOME_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium pl-2 pr-6 py-1 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Analyses List */}
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {analysesLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 text-slate-400 animate-spin" />
                    <p className="text-xs text-slate-500">Loading...</p>
                  </div>
                ) : sortedAnalyses.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <h3 className="font-medium text-sm mb-1 text-slate-700 dark:text-slate-300">No analyses yet</h3>
                    <p className="text-xs text-slate-500">Run an analysis to see results here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedAnalyses.map((analysis) => {
                      const isActive = analysis.expiresAt && new Date(analysis.expiresAt) > new Date() && analysis.outcome !== 'correct' && analysis.outcome !== 'incorrect';
                      const verdictConfig = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.wait;
                      const tradeTypeConfig = analysis.tradeType ? TRADE_TYPE_CONFIG[analysis.tradeType] : null;
                      const isLoading = actionLoading?.id === analysis.id;

                      return (
                        <div
                          key={analysis.id}
                          className={cn(
                            "relative border rounded-xl p-3 hover:shadow-md transition overflow-hidden",
                            analysis.outcome === 'correct' && "border-teal-500/50 bg-teal-50/50 dark:bg-teal-500/5",
                            analysis.outcome === 'incorrect' && "border-red-500/50 bg-red-50/50 dark:bg-red-500/5",
                            isActive && "border-teal-500/30 bg-teal-50/30 dark:bg-teal-500/5",
                            !analysis.outcome && !isActive && "border-slate-200 dark:border-slate-700"
                          )}
                        >
                          {/* Status Ribbon */}
                          {isActive && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-teal-500 text-white text-[8px] font-bold rounded-bl-lg">LIVE</div>
                          )}
                          {analysis.outcome === 'correct' && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-teal-500 text-white text-[8px] font-bold rounded-bl-lg">TP HIT</div>
                          )}
                          {analysis.outcome === 'incorrect' && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-bl-lg">SL HIT</div>
                          )}

                          {/* Content */}
                          <Link href={`/analyze/details/${analysis.id}`} className="block">
                            <div className="flex items-center gap-2 mb-2">
                              <CoinIcon symbol={analysis.symbol} size={28} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-sm">{analysis.symbol}</span>
                                  {analysis.direction && (
                                    <span className={cn(
                                      "px-1 py-0.5 rounded text-[9px] font-medium",
                                      analysis.direction === 'long' ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" :
                                      analysis.direction === 'short' ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                                      "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                                    )}>
                                      {analysis.direction === 'long' ? <TrendingUp className="w-2.5 h-2.5 inline" /> :
                                       analysis.direction === 'short' ? <TrendingDown className="w-2.5 h-2.5 inline" /> :
                                       <Minus className="w-2.5 h-2.5 inline" />}
                                    </span>
                                  )}
                                  <span className={cn("px-1 py-0.5 rounded text-[9px] font-bold", verdictConfig.bg, verdictConfig.text)}>
                                    {verdictConfig.label}
                                  </span>
                                  {analysis.method === 'mlis_pro' && (
                                    <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
                                      <Layers className="w-2.5 h-2.5" /> MLIS
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500">{analysis.createdAt}</p>
                              </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center gap-2 text-[10px]">
                              {analysis.score !== null && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded font-bold",
                                  analysis.score >= 7 ? "bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400" :
                                  analysis.score >= 5 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                                  "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                )}>
                                  {(analysis.score * 10).toFixed(0)}%
                                </span>
                              )}
                              {typeof analysis.unrealizedPnL === 'number' && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded font-bold",
                                  analysis.unrealizedPnL >= 0
                                    ? "bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400"
                                    : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                )}>
                                  {analysis.unrealizedPnL >= 0 ? '+' : ''}{analysis.unrealizedPnL.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </Link>

                          {/* Actions */}
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <Link
                              href={`/analyze/details/${analysis.id}`}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-500 transition text-[10px] font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              Details
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/ai-expert/nexus?analysisId=${analysis.id}`); }}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-red-600 dark:text-red-500 transition"
                            >
                              <Bot className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleEmail(e, analysis)}
                              className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, analysis.id)}
                              disabled={isLoading}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-red-500 transition disabled:opacity-50"
                            >
                              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
          coinName={currentAssets.find(s => s.symbol === selectedSymbol)?.name || selectedSymbol}
          timeframe={timeframe}
          analysisMethod={method}
          onClose={() => setShowAnalysisDialog(false)}
          onComplete={() => {
            setShowAnalysisDialog(false);
            fetchDailyPassStatus();
            fetchAnalyses();
          }}
        />
      )}
    </div>
  );
}
