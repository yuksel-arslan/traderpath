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
  Globe,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Brain,
  AlertTriangle,
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
type AssetType = 'crypto' | 'stocks' | 'bonds' | 'metals' | 'bist';
type AnalysisMethod = 'classic' | 'mlis_pro';
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type VerdictFilter = 'all' | 'go' | 'conditional_go' | 'wait' | 'avoid';
type OutcomeFilter = 'all' | 'live' | 'tp' | 'sl';
type SortOption = 'time_desc' | 'time_asc' | 'pnl_desc' | 'pnl_asc' | 'score_desc' | 'score_asc';
type Phase = 'early' | 'mid' | 'late' | 'exit';
type LiquidityBias = 'risk_on' | 'risk_off' | 'neutral';

// Capital Flow types
interface GlobalLiquidity {
  fedBalanceSheet: { value: number; change30d: number; trend: 'expanding' | 'contracting' | 'stable' };
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number };
  dxy: { value: number; change7d: number; trend: 'strengthening' | 'weakening' | 'stable' };
  vix: { value: number; level: string };
  yieldCurve: { spread10y2y: number; inverted: boolean; interpretation: string };
  netLiquidity?: { value: number; change7d: number; change30d: number; trend: string; interpretation: string };
}

interface MarketFlow {
  market: string;
  currentValue: number;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  phase: Phase;
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  sectors?: { name: string; flow7d: number; flow30d: number; dominance: number; trending: 'up' | 'down' | 'stable'; phase?: Phase }[];
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: Phase;
  action: 'analyze' | 'wait' | 'avoid';
  direction: string;
  reason: string;
  sectors?: string[];
  confidence: number;
  suggestedAssets?: { symbol: string; name: string; market: string; sector?: string; riskLevel: 'low' | 'medium' | 'high'; reason: string }[];
}

interface CapitalFlowSummary {
  timestamp: string;
  globalLiquidity: GlobalLiquidity;
  liquidityBias: LiquidityBias;
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
  sellRecommendation?: FlowRecommendation;
  activeRotation: { from: string; to: string; confidence: number; estimatedDuration: string } | null;
  insights?: { layer1: string; layer2: string; layer3: string; layer4: string; ragLayer1?: string; ragLayer2?: string; ragLayer3?: string; ragLayer4?: string };
}

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
  bist: { name: 'BIST', icon: Building2, gradient: 'from-red-500 to-rose-500' },
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
  bist: [
    { name: 'All BIST', value: 'all' },
    { name: 'Bankacılık', value: 'banking' },
    { name: 'Holding', value: 'holding' },
    { name: 'Sanayi', value: 'industrial' },
    { name: 'Havacılık', value: 'aviation' },
    { name: 'Perakende', value: 'retail' },
    { name: 'Enerji', value: 'energy' },
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
  bist: {
    all: [
      { symbol: 'THYAO', name: 'Türk Hava Yolları' }, { symbol: 'GARAN', name: 'Garanti BBVA' },
      { symbol: 'AKBNK', name: 'Akbank' }, { symbol: 'KCHOL', name: 'Koç Holding' },
      { symbol: 'SAHOL', name: 'Sabancı Holding' }, { symbol: 'EREGL', name: 'Ereğli Demir Çelik' },
      { symbol: 'YKBNK', name: 'Yapı Kredi' }, { symbol: 'ISCTR', name: 'İş Bankası' },
      { symbol: 'TOASO', name: 'Tofaş Oto' }, { symbol: 'FROTO', name: 'Ford Otosan' },
      { symbol: 'TCELL', name: 'Turkcell' }, { symbol: 'BIMAS', name: 'BİM' },
      { symbol: 'TUPRS', name: 'Tüpraş' }, { symbol: 'ASELS', name: 'Aselsan' },
      { symbol: 'PGSUS', name: 'Pegasus' }, { symbol: 'SISE', name: 'Şişecam' },
    ],
    banking: [
      { symbol: 'GARAN', name: 'Garanti BBVA' }, { symbol: 'AKBNK', name: 'Akbank' },
      { symbol: 'YKBNK', name: 'Yapı Kredi' }, { symbol: 'ISCTR', name: 'İş Bankası' },
      { symbol: 'HALKB', name: 'Halkbank' }, { symbol: 'VAKBN', name: 'Vakıfbank' },
    ],
    holding: [
      { symbol: 'KCHOL', name: 'Koç Holding' }, { symbol: 'SAHOL', name: 'Sabancı Holding' },
      { symbol: 'TAVHL', name: 'TAV Havalimanları' }, { symbol: 'TKFEN', name: 'Tekfen Holding' },
    ],
    industrial: [
      { symbol: 'EREGL', name: 'Ereğli Demir Çelik' }, { symbol: 'SISE', name: 'Şişecam' },
      { symbol: 'TOASO', name: 'Tofaş Oto' }, { symbol: 'FROTO', name: 'Ford Otosan' },
      { symbol: 'KRDMD', name: 'Kardemir' },
    ],
    aviation: [
      { symbol: 'THYAO', name: 'Türk Hava Yolları' }, { symbol: 'PGSUS', name: 'Pegasus' },
    ],
    retail: [
      { symbol: 'BIMAS', name: 'BİM' }, { symbol: 'MGROS', name: 'Migros' },
      { symbol: 'SOKM', name: 'Şok Market' },
    ],
    energy: [
      { symbol: 'TUPRS', name: 'Tüpraş' }, { symbol: 'PETKM', name: 'Petkim' },
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

  // Capital Flow state
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [capitalFlowLoading, setCapitalFlowLoading] = useState(true);

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

  // Fetch Capital Flow data
  const fetchCapitalFlow = useCallback(async () => {
    try {
      setCapitalFlowLoading(true);
      const res = await authFetch('/api/capital-flow/summary');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCapitalFlow(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch capital flow:', error);
    } finally {
      setCapitalFlowLoading(false);
    }
  }, []);

  // Read URL params on mount (e.g. /analyze?market=bist&symbol=THYAO)
  useEffect(() => {
    const marketParam = searchParams.get('market') || searchParams.get('asset');
    if (marketParam) {
      const m = marketParam.toLowerCase() as AssetType;
      if (m in ALL_SYMBOLS) {
        setAssetType(m);
        setSector('all');
        // If symbol param also provided, select it
        const symbolParam = searchParams.get('symbol');
        if (symbolParam) {
          setSelectedSymbol(symbolParam.toUpperCase());
        } else {
          // Pre-select first asset of the market
          const firstAsset = ALL_SYMBOLS[m]?.all?.[0];
          if (firstAsset) setSelectedSymbol(firstAsset.symbol);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDailyPassStatus();
    fetchAnalyses();
    fetchCapitalFlow();
    const interval = setInterval(fetchAnalyses, 30000);
    return () => clearInterval(interval);
  }, [fetchDailyPassStatus, fetchAnalyses, fetchCapitalFlow]);

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

  // Helper functions for Capital Flow display
  const safeToFixed = (val: number | undefined | null, decimals: number = 1): string => {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return val.toFixed(decimals);
  };

  const getPhaseConfig = (phase: Phase) => {
    const config: Record<Phase, { color: string; bg: string; label: string }> = {
      early: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: 'EARLY' },
      mid: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/20', label: 'MID' },
      late: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/20', label: 'LATE' },
      exit: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', label: 'EXIT' },
    };
    return config[phase] || config.mid;
  };

  const getBiasConfig = (bias: LiquidityBias) => {
    const config: Record<LiquidityBias, { color: string; bg: string; label: string; icon: typeof TrendingUp }> = {
      risk_on: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: 'RISK ON', icon: TrendingUp },
      risk_off: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', label: 'RISK OFF', icon: TrendingDown },
      neutral: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20', label: 'NEUTRAL', icon: Minus },
    };
    return config[bias] || config.neutral;
  };

  const getMarketIcon = (market: string) => {
    const icons: Record<string, typeof Coins> = { crypto: Coins, stocks: BarChart3, bonds: Landmark, metals: Gem, bist: Building2 };
    return icons[market] || Activity;
  };

  // Find the recommended market and its data
  const recommendedMarket = capitalFlow?.markets?.find(m => m.market === capitalFlow?.recommendation?.primaryMarket);
  const sellMarket = capitalFlow?.sellRecommendation ? capitalFlow.markets?.find(m => m.market === capitalFlow.sellRecommendation?.primaryMarket) : null;

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
        {/* Capital Flow Context Summary */}
        {capitalFlowLoading ? (
          <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              <span className="text-sm text-slate-500">Loading Capital Flow data...</span>
            </div>
          </div>
        ) : capitalFlow ? (
          <div className="mb-6 space-y-4">
            {/* Layer Flow Summary Bar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 notranslate">Capital Flow Summary</span>
                </div>
                <Link
                  href="/capital-flow"
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  View Details <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 4-Layer Horizontal Flow */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {/* Layer 1: Global Liquidity */}
                <div className="flex-1 min-w-[120px] p-3 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10 border border-teal-200/50 dark:border-teal-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">L1: LIQUIDITY</span>
                  </div>
                  {(() => {
                    const biasConfig = getBiasConfig(capitalFlow?.liquidityBias ?? 'neutral');
                    const BiasIcon = biasConfig.icon;
                    return (
                      <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit", biasConfig.bg, biasConfig.color)}>
                        <BiasIcon className="w-3 h-3" />
                        {biasConfig.label}
                      </div>
                    );
                  })()}
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">
                    Net: {safeToFixed(capitalFlow?.globalLiquidity?.netLiquidity?.change30d ?? capitalFlow?.globalLiquidity?.m2MoneySupply?.change30d)}%
                  </p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />

                {/* Layer 2: Market Flow */}
                <div className="flex-1 min-w-[120px] p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 border border-cyan-200/50 dark:border-cyan-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300">L2: MARKETS</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {capitalFlow.markets?.filter(m => m && m.market).slice(0, 4).map((market) => {
                      const phaseConfig = getPhaseConfig(market.phase);
                      return (
                        <span
                          key={market.market}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-medium",
                            market.market === capitalFlow.recommendation?.primaryMarket
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/50"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {market.market.toUpperCase()} <span className={cn("text-[8px]", market.flow7d >= 0 ? "text-emerald-600" : "text-red-600")}>{market.flow7d >= 0 ? '+' : ''}{safeToFixed(market.flow7d)}%</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />

                {/* Layer 3: Sector */}
                <div className="flex-1 min-w-[120px] p-3 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border border-violet-200/50 dark:border-violet-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300">L3: SECTORS</span>
                  </div>
                  {recommendedMarket?.sectors?.slice(0, 2).map((sector, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[9px] font-medium mr-1 mb-1",
                        sector.trending === 'up'
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {sector.name}
                    </span>
                  )) || <span className="text-[9px] text-slate-400">No sectors</span>}
                </div>

                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />

                {/* Layer 4: Recommendation */}
                <div className="flex-1 min-w-[120px] p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Brain className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">L4: AI REC</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit",
                    capitalFlow.recommendation?.direction?.toUpperCase() === 'BUY'
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : capitalFlow.recommendation?.direction?.toUpperCase() === 'SELL'
                      ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                      : "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400"
                  )}>
                    {capitalFlow.recommendation?.direction?.toUpperCase() === 'BUY' ? <TrendingUp className="w-3 h-3" /> :
                     capitalFlow.recommendation?.direction?.toUpperCase() === 'SELL' ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {capitalFlow.recommendation?.direction?.toUpperCase() || 'NEUTRAL'} {capitalFlow.recommendation?.primaryMarket?.toUpperCase()}
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">
                    {capitalFlow.recommendation?.confidence ?? 0}% confidence
                  </p>
                </div>
              </div>
            </div>

            {/* Layer 4 Detail Cards - AI Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BUY Opportunity Card */}
              {capitalFlow.recommendation && (
                <div className="p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-900/20 dark:via-slate-900 dark:to-teal-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">BUY Opportunity</span>
                        <p className="text-[10px] text-slate-500">Capital flowing in</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{capitalFlow.recommendation.confidence}%</span>
                      <p className="text-[10px] text-slate-500">Confidence</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Market</span>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const MarketIcon = getMarketIcon(capitalFlow.recommendation.primaryMarket);
                          return <MarketIcon className="w-4 h-4 text-emerald-600" />;
                        })()}
                        <span className="font-semibold text-slate-900 dark:text-white capitalize">{capitalFlow.recommendation.primaryMarket}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Phase</span>
                      {(() => {
                        const phaseConfig = getPhaseConfig(capitalFlow.recommendation.phase);
                        return (
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", phaseConfig.bg, phaseConfig.color)}>
                            {phaseConfig.label}
                          </span>
                        );
                      })()}
                    </div>
                    {recommendedMarket && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">7D Flow</span>
                        <span className={cn("font-semibold", recommendedMarket.flow7d >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {recommendedMarket.flow7d >= 0 ? '+' : ''}{safeToFixed(recommendedMarket.flow7d)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 p-2 bg-emerald-100/50 dark:bg-emerald-500/10 rounded-lg">
                    {capitalFlow.recommendation.reason || 'Strong capital inflow detected.'}
                  </p>

                  {/* Suggested Assets */}
                  {capitalFlow.recommendation.suggestedAssets && capitalFlow.recommendation.suggestedAssets.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-slate-500 mb-1">Suggested Assets:</p>
                      <div className="flex flex-wrap gap-1">
                        {capitalFlow.recommendation.suggestedAssets.slice(0, 4).map((asset, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (asset.market in ALL_SYMBOLS) {
                                setAssetType(asset.market as AssetType);
                              }
                              setSelectedSymbol(asset.symbol);
                            }}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                          >
                            {asset.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const pm = capitalFlow?.recommendation?.primaryMarket;
                      if (pm && pm in ALL_SYMBOLS) {
                        setAssetType(pm as AssetType);
                        const marketAssets = ALL_SYMBOLS[pm as AssetType]?.all;
                        if (marketAssets && marketAssets.length > 0) {
                          setSelectedSymbol(marketAssets[0].symbol);
                        }
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                  >
                    <Search className="w-4 h-4" />
                    Analyze {capitalFlow?.recommendation?.primaryMarket?.toUpperCase() || 'Market'} Assets
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* SELL Opportunity Card */}
              {capitalFlow.sellRecommendation ? (
                <div className="p-4 rounded-2xl border-2 border-red-200 dark:border-red-500/30 bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-red-900/20 dark:via-slate-900 dark:to-rose-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                        <TrendingDown className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-red-700 dark:text-red-400">SELL/Short Opportunity</span>
                        <p className="text-[10px] text-slate-500">Capital flowing out</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">{capitalFlow.sellRecommendation.confidence}%</span>
                      <p className="text-[10px] text-slate-500">Confidence</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Market</span>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const MarketIcon = getMarketIcon(capitalFlow.sellRecommendation!.primaryMarket);
                          return <MarketIcon className="w-4 h-4 text-red-600" />;
                        })()}
                        <span className="font-semibold text-slate-900 dark:text-white capitalize">{capitalFlow.sellRecommendation.primaryMarket}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Phase</span>
                      {(() => {
                        const phaseConfig = getPhaseConfig(capitalFlow.sellRecommendation!.phase);
                        return (
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", phaseConfig.bg, phaseConfig.color)}>
                            {phaseConfig.label}
                          </span>
                        );
                      })()}
                    </div>
                    {sellMarket && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">7D Flow</span>
                        <span className={cn("font-semibold", (sellMarket.flow7d ?? 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {(sellMarket.flow7d ?? 0) >= 0 ? '+' : ''}{safeToFixed(sellMarket.flow7d)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 p-2 bg-red-100/50 dark:bg-red-500/10 rounded-lg">
                    {capitalFlow.sellRecommendation.reason || 'Capital outflow detected - potential short opportunity.'}
                  </p>

                  <button
                    onClick={() => {
                      const pm = capitalFlow?.sellRecommendation?.primaryMarket;
                      if (pm && pm in ALL_SYMBOLS) {
                        setAssetType(pm as AssetType);
                        const marketAssets = ALL_SYMBOLS[pm as AssetType]?.all;
                        if (marketAssets && marketAssets.length > 0) {
                          setSelectedSymbol(marketAssets[0].symbol);
                        }
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-semibold rounded-xl hover:from-red-600 hover:to-rose-600 hover:shadow-lg hover:shadow-red-500/25 transition-all"
                  >
                    <Search className="w-4 h-4" />
                    Find Short Opportunities
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* No SELL recommendation - Show info card */
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">No SELL Signal</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Currently no significant capital outflow detected in any market. Focus on the BUY opportunity.
                  </p>
                  <Link
                    href="/capital-flow"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    View Full Capital Flow
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}

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

        {/* Main Content - Stacked Layout */}
        <div className="space-y-6">
          {/* Analysis Result Area */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 min-h-[300px] flex items-center justify-center">
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

          {/* Recent Analyses - Full Width Below */}
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
                                      analysis.direction?.toLowerCase() === 'long' ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" :
                                      analysis.direction?.toLowerCase() === 'short' ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                                      "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                                    )}>
                                      {analysis.direction?.toLowerCase() === 'long' ? <TrendingUp className="w-2.5 h-2.5 inline" /> :
                                       analysis.direction?.toLowerCase() === 'short' ? <TrendingDown className="w-2.5 h-2.5 inline" /> :
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
