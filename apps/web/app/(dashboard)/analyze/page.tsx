'use client';

// ===========================================
// TOP-DOWN ANALYSIS PAGE
// Capital Flow (L1-L4) → AI Recommendation → Asset Analysis → Trade Plan
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
  Shield,
  Lock,
  Check,
  ArrowDown,
  MessageSquare,
  GitBranch,
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
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type VerdictFilter = 'all' | 'go' | 'conditional_go' | 'wait' | 'avoid';
type OutcomeFilter = 'all' | 'live' | 'tp' | 'sl';
type SortOption = 'time_desc' | 'time_asc' | 'pnl_desc' | 'pnl_asc' | 'score_desc' | 'score_asc';
type Phase = 'early' | 'mid' | 'late' | 'exit';
type LiquidityBias = 'risk_on' | 'risk_off' | 'neutral';

// Top-Down Analysis Steps
type AnalysisStep = 'step0' | 'stepA' | 'stepB';

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

// AI Recommendation types
interface AIRecommendedAsset {
  symbol: string;
  name: string;
  market: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  alignmentScore: number;
  riskTag: 'low' | 'medium' | 'high';
  reason: string;
}

interface AIRecommendation {
  capitalFlowId: string;
  timestamp: string;
  l1Status: { bias: LiquidityBias; netLiquidityChange30d: number; dxyTrend: string; vixLevel: string; vixValue: number };
  l2Status: { market: string; phase: Phase; flow7d: number; flow30d: number; rotationSignal: string | null }[];
  l3Status: { primaryMarket: string; sectors: { name: string; trending: string; flow7d: number }[] };
  l4Status: {
    buyRecommendation: { market: string; confidence: number; action: string; suggestedAssets: any[] } | null;
    sellRecommendation: { market: string; confidence: number; action: string; suggestedAssets: any[] } | null;
  };
  recommendedAssets: AIRecommendedAsset[];
  warnings: string[];
  canProceed: boolean;
}

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number | null;
  direction: string | null;
  tradeType?: TradeType;
  method?: string;
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

// Mode type
type AnalyzeMode = 'select' | 'flow';

export default function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode selection state
  const [mode, setMode] = useState<AnalyzeMode>('select');

  // Top-Down step state
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('step0');

  // Capital Flow state (Step 0)
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [capitalFlowLoading, setCapitalFlowLoading] = useState(true);

  // AI Recommendation state (Step A)
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false);

  // Asset Analysis state (Step B)
  const [selectedAsset, setSelectedAsset] = useState<AIRecommendedAsset | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

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
              method: a.method || 'classic',
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

  // Fetch Capital Flow data (Step 0)
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

  // Generate AI Recommendations (Step A)
  const generateRecommendations = async () => {
    setAiRecommendationLoading(true);
    try {
      const res = await authFetch('/api/capital-flow/recommend-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiRecommendation(data.data);
        setCurrentStep('stepA');
      } else {
        toast.error('Failed to generate recommendations');
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      toast.error('Failed to generate AI recommendations');
    } finally {
      setAiRecommendationLoading(false);
    }
  };

  // Read URL params on mount
  useEffect(() => {
    // If coming with a symbol param, skip straight to stepB if we have recommendation data
    const symbolParam = searchParams.get('symbol');
    if (symbolParam && aiRecommendation) {
      const found = aiRecommendation.recommendedAssets.find(a => a.symbol === symbolParam.toUpperCase());
      if (found) {
        setSelectedAsset(found);
        setCurrentStep('stepB');
      }
    }
  }, [searchParams, aiRecommendation]);

  useEffect(() => {
    fetchDailyPassStatus();
    fetchAnalyses();
    if (mode === 'flow') {
      fetchCapitalFlow();
    }
    const interval = setInterval(fetchAnalyses, 30000);
    return () => clearInterval(interval);
  }, [fetchDailyPassStatus, fetchAnalyses, fetchCapitalFlow, mode]);

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

  // Run analysis (Step B)
  const runAnalysis = async () => {
    if (!selectedAsset) {
      toast.error('Please select an asset from the AI recommendations');
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

  // Helper functions
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

  // Step completion states
  const step0Complete = !!capitalFlow && !capitalFlowLoading;
  const stepAComplete = !!aiRecommendation;
  const stepBReady = stepAComplete && !!selectedAsset;

  // Build capitalFlowContext for AnalysisDialog (enriched with L1-L4 summaries for evidence chain)
  const capitalFlowContextPayload = aiRecommendation ? {
    capitalFlowId: aiRecommendation.capitalFlowId,
    recommendedAssets: aiRecommendation.recommendedAssets.map(a => a.symbol),
    direction: selectedAsset?.direction as 'BUY' | 'SELL' | undefined,
    l1Bias: aiRecommendation.l1Status.bias,
    l4Confidence: selectedAsset?.confidence,
    // Top-Down Evidence Chain data
    l1Summary: {
      bias: aiRecommendation.l1Status.bias,
      dxyTrend: aiRecommendation.l1Status.dxyTrend,
      vixLevel: aiRecommendation.l1Status.vixLevel,
      vixValue: aiRecommendation.l1Status.vixValue,
    },
    l2Summary: aiRecommendation.l2Status.map(m => ({
      market: m.market,
      phase: m.phase,
      flow7d: m.flow7d,
    })),
    l3Summary: {
      primaryMarket: aiRecommendation.l3Status.primaryMarket,
      topSectors: aiRecommendation.l3Status.sectors.slice(0, 3).map(s => s.name),
    },
    l4Summary: {
      action: aiRecommendation.l4Status.buyRecommendation?.action || aiRecommendation.l4Status.sellRecommendation?.action || 'wait',
      confidence: selectedAsset?.confidence || aiRecommendation.l4Status.buyRecommendation?.confidence || 0,
      market: aiRecommendation.l4Status.buyRecommendation?.market || aiRecommendation.l4Status.sellRecommendation?.market || '',
    },
  } : undefined;

  // Handle selecting flow mode
  const handleSelectFlow = () => {
    setMode('flow');
    if (!capitalFlow) fetchCapitalFlow();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ================================================ */}
      {/* MODE SELECTION LANDING                           */}
      {/* ================================================ */}
      {mode === 'select' && (
        <>
          <div className="max-w-4xl mx-auto px-4 pt-16 pb-10">
            {/* Title */}
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/20 mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                How would you like to analyze?
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Choose your preferred analysis experience. Both methods use the same Capital Flow intelligence engine.
              </p>
            </div>

            {/* Two Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Analyze via Chat */}
              <button
                onClick={() => router.push('/concierge')}
                className="group relative p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-400 dark:hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 text-left"
              >
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase">
                  Fastest
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Analyze via Chat
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Tell the AI what you want to analyze. Capital Flow check, asset selection, and full analysis run automatically. Your saved report opens when done.
                </p>
                <ul className="space-y-2 mb-5">
                  {[
                    'Type a symbol or ask "What should I buy?"',
                    'L1-L4 Capital Flow checked automatically',
                    'Full 7-Step analysis runs in background',
                    'Report saved and opened for you',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Check className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 group-hover:gap-3 transition-all">
                  <MessageSquare className="w-4 h-4" />
                  Open AI Chat
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Analyze via Flow */}
              <button
                onClick={handleSelectFlow}
                className="group relative p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-400 dark:hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 text-left"
              >
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[10px] font-bold uppercase">
                  Full Control
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <GitBranch className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Analyze via Flow
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Follow the top-down Capital Flow funnel step by step. Review each layer, pick your asset from AI recommendations, and configure your analysis.
                </p>
                <ul className="space-y-2 mb-5">
                  {[
                    'L1-L3 Capital Flow loads automatically',
                    'Generate AI Asset Recommendations',
                    'Select asset and configure timeframe',
                    'Run analysis with full visibility',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Check className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-600 dark:text-teal-400 group-hover:gap-3 transition-all">
                  <GitBranch className="w-4 h-4" />
                  Start Flow Analysis
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ================================================ */}
      {/* FLOW MODE - Existing Step-by-Step Analysis        */}
      {/* ================================================ */}
      {mode === 'flow' && (
        <>
          {/* Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMode('select')}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4 text-slate-500 rotate-90" />
                  </button>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Top-Down Analysis</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Capital Flow → AI Recommendation → Asset Analysis</p>
                  </div>
                </div>
                <button
                  onClick={() => { fetchCapitalFlow(); fetchAnalyses(); }}
                  disabled={capitalFlowLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className={cn("w-4 h-4", capitalFlowLoading && "animate-spin")} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Step Progress Indicator */}
            <div className="mb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {/* Step 0 */}
            <button
              onClick={() => setCurrentStep('step0')}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                currentStep === 'step0'
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                  : step0Complete
                    ? "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}
            >
              {step0Complete ? <Check className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              <span className="hidden sm:inline">Capital Flow</span>
              <span className="sm:hidden">L1-L4</span>
            </button>

            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />

            {/* Step A */}
            <button
              onClick={() => step0Complete && setCurrentStep('stepA')}
              disabled={!step0Complete}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                currentStep === 'stepA'
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                  : stepAComplete
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400",
                !step0Complete && "opacity-50 cursor-not-allowed"
              )}
            >
              {stepAComplete ? <Check className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              <span className="hidden sm:inline">AI Recommendation</span>
              <span className="sm:hidden">AI Rec</span>
            </button>

            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />

            {/* Step B */}
            <button
              onClick={() => stepAComplete && setCurrentStep('stepB')}
              disabled={!stepAComplete}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                currentStep === 'stepB'
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400",
                !stepAComplete && "opacity-50 cursor-not-allowed"
              )}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Asset Analysis</span>
              <span className="sm:hidden">Analyze</span>
            </button>
          </div>
        </div>

        {/* ================================================ */}
        {/* STEP 0: CAPITAL FLOW ANALYSIS (L1-L4)            */}
        {/* ================================================ */}
        {currentStep === 'step0' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border-2 border-teal-200 dark:border-teal-500/30 bg-gradient-to-br from-white via-teal-50/30 to-white dark:from-slate-900 dark:via-teal-900/10 dark:to-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Capital Flow Analysis</h2>
                </div>
                <Link
                  href="/dashboard"
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  Full Details <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {capitalFlowLoading ? (
                <div className="flex items-center justify-center gap-2 py-12">
                  <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                  <span className="text-sm text-slate-500">Loading Capital Flow data...</span>
                </div>
              ) : capitalFlow ? (
                <>
                  {/* L1-L4 Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {/* L1: Global Liquidity */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10 border border-teal-200/50 dark:border-teal-500/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase">L1: Global Liquidity</span>
                        <Check className="w-3 h-3 ml-auto text-teal-500" />
                      </div>
                      {(() => {
                        const biasConfig = getBiasConfig(capitalFlow.liquidityBias ?? 'neutral');
                        const BiasIcon = biasConfig.icon;
                        return (
                          <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold w-fit", biasConfig.bg, biasConfig.color)}>
                            <BiasIcon className="w-3 h-3" />
                            {biasConfig.label}
                          </div>
                        );
                      })()}
                      <div className="mt-2 space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <div className="flex justify-between">
                          <span>Net Liquidity</span>
                          <span className="font-medium">{safeToFixed(capitalFlow.globalLiquidity?.netLiquidity?.change30d ?? capitalFlow.globalLiquidity?.m2MoneySupply?.change30d)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>DXY</span>
                          <span className="font-medium capitalize">{capitalFlow.globalLiquidity?.dxy?.trend || 'stable'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>VIX</span>
                          <span className="font-medium">{capitalFlow.globalLiquidity?.vix?.value?.toFixed(1) || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* L2: Market Flows */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 border border-cyan-200/50 dark:border-cyan-500/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 uppercase">L2: Market Flow</span>
                        <Check className="w-3 h-3 ml-auto text-teal-500" />
                      </div>
                      <div className="space-y-1">
                        {capitalFlow.markets?.filter(m => m && m.market).slice(0, 4).map((market) => {
                          const phaseConfig = getPhaseConfig(market.phase);
                          const isPrimary = market.market === capitalFlow.recommendation?.primaryMarket;
                          return (
                            <div key={market.market} className={cn("flex items-center justify-between text-[10px]", isPrimary && "font-bold")}>
                              <span className="text-slate-600 dark:text-slate-400 capitalize">{market.market}</span>
                              <div className="flex items-center gap-1">
                                <span className={cn("px-1 py-0.5 rounded text-[8px] font-bold", phaseConfig.bg, phaseConfig.color)}>{phaseConfig.label}</span>
                                <span className={cn("font-medium", (market.flow7d ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                  {(market.flow7d ?? 0) >= 0 ? '+' : ''}{safeToFixed(market.flow7d)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* L3: Sector Rotation */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border border-violet-200/50 dark:border-violet-500/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase">L3: Sectors</span>
                        <Check className="w-3 h-3 ml-auto text-teal-500" />
                      </div>
                      {(() => {
                        const primaryMarketData = capitalFlow.markets?.find(m => m.market === capitalFlow.recommendation?.primaryMarket);
                        const sectors = primaryMarketData?.sectors?.slice(0, 3);
                        if (!sectors || sectors.length === 0) return <span className="text-[10px] text-slate-400">No sector data</span>;
                        return (
                          <div className="space-y-1">
                            {sectors.map((sector, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-600 dark:text-slate-400">{sector.name}</span>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-medium",
                                  sector.trending === 'up' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                )}>
                                  {sector.trending === 'up' ? 'Inflow' : sector.trending === 'down' ? 'Outflow' : 'Stable'}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* L4: AI Recommendation Preview */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">L4: AI Recommendation</span>
                        <Check className="w-3 h-3 ml-auto text-teal-500" />
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold w-fit mb-2",
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
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-medium">{capitalFlow.recommendation?.confidence ?? 0}%</span> confidence
                      </div>
                    </div>
                  </div>

                  {/* Risk-Off Warning */}
                  {capitalFlow.liquidityBias === 'risk_off' && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Risk-Off Environment</p>
                        <p className="text-xs text-red-600/80 dark:text-red-400/60">Global liquidity contracting. Only safe haven assets (Bonds/Gold) recommended. Avoid risk assets.</p>
                      </div>
                    </div>
                  )}

                  {/* Generate Recommendations Button */}
                  <button
                    onClick={generateRecommendations}
                    disabled={aiRecommendationLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-bold rounded-xl hover:from-teal-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50"
                  >
                    {aiRecommendationLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating AI Recommendations...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate AI Asset Recommendations
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500">Failed to load Capital Flow data.</p>
                  <button onClick={fetchCapitalFlow} className="mt-2 text-sm text-teal-600 hover:underline">Try again</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================ */}
        {/* STEP A: AI ASSET RECOMMENDATION                  */}
        {/* ================================================ */}
        {currentStep === 'stepA' && aiRecommendation && (
          <div className="space-y-4">
            {/* Warnings */}
            {aiRecommendation.warnings.length > 0 && (
              <div className="space-y-2">
                {aiRecommendation.warnings.map((warning, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendation Panel */}
            <div className="p-5 rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-white via-amber-50/30 to-white dark:from-slate-900 dark:via-amber-900/10 dark:to-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Asset Recommendations</h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Based on Capital Flow L1-L4</span>
              </div>

              {/* L1-L4 Context Mini-Bar */}
              <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto">
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", getBiasConfig(aiRecommendation.l1Status.bias).bg, getBiasConfig(aiRecommendation.l1Status.bias).color)}>
                  L1: {getBiasConfig(aiRecommendation.l1Status.bias).label}
                </span>
                <span className="text-[10px] text-slate-400">→</span>
                {aiRecommendation.l2Status.slice(0, 3).map(m => (
                  <span key={m.market} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", getPhaseConfig(m.phase).bg, getPhaseConfig(m.phase).color)}>
                    {m.market.toUpperCase()} {m.phase.toUpperCase()}
                  </span>
                ))}
                <span className="text-[10px] text-slate-400">→</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                  {aiRecommendation.l3Status.primaryMarket.toUpperCase()}
                </span>
              </div>

              {!aiRecommendation.canProceed ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-red-400" />
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Analysis Blocked</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Capital Flow conditions are unfavorable. No assets are recommended for analysis at this time. Check back when conditions improve.
                  </p>
                  <button
                    onClick={() => setCurrentStep('step0')}
                    className="mt-4 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  >
                    Back to Capital Flow
                  </button>
                </div>
              ) : (
                <>
                  {/* Recommended Assets Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {aiRecommendation.recommendedAssets.map((asset) => {
                      const isSelected = selectedAsset?.symbol === asset.symbol;
                      const isBuy = asset.direction === 'BUY';
                      return (
                        <button
                          key={`${asset.symbol}-${asset.direction}`}
                          onClick={() => {
                            setSelectedAsset(asset);
                            setCurrentStep('stepB');
                          }}
                          className={cn(
                            "relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                            isSelected
                              ? isBuy
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                                : "border-red-500 bg-red-50 dark:bg-red-500/10 shadow-lg shadow-red-500/20"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                          )}
                        >
                          {/* Direction Badge */}
                          <div className={cn(
                            "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold",
                            isBuy ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                          )}>
                            {isBuy ? 'BUY' : 'SELL'}
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <CoinIcon symbol={asset.symbol} size={28} />
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{asset.symbol}</span>
                              <p className="text-[10px] text-slate-500">{asset.name}</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Confidence</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{asset.confidence}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Alignment</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{asset.alignmentScore}/100</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Risk</span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                asset.riskTag === 'low' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600" :
                                asset.riskTag === 'high' ? "bg-red-100 dark:bg-red-500/20 text-red-600" :
                                "bg-amber-100 dark:bg-amber-500/20 text-amber-600"
                              )}>{asset.riskTag}</span>
                            </div>
                          </div>

                          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{asset.reason}</p>

                          <div className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                            <Zap className="w-3.5 h-3.5" />
                            Select & Analyze
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================================================ */}
        {/* STEP B: ASSET ANALYSIS                           */}
        {/* ================================================ */}
        {currentStep === 'stepB' && (
          <div className="space-y-4">
            {/* Top-Down Context Bar */}
            {aiRecommendation && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto text-[10px]">
                <span className={cn("px-2 py-0.5 rounded-full font-bold whitespace-nowrap", getBiasConfig(aiRecommendation.l1Status.bias).bg, getBiasConfig(aiRecommendation.l1Status.bias).color)}>
                  L1 {getBiasConfig(aiRecommendation.l1Status.bias).label}
                </span>
                <Check className="w-3 h-3 text-teal-500 flex-shrink-0" />
                <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="px-2 py-0.5 rounded-full font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
                  L2 {aiRecommendation.l3Status.primaryMarket.toUpperCase()}
                </span>
                <Check className="w-3 h-3 text-teal-500 flex-shrink-0" />
                <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="px-2 py-0.5 rounded-full font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 whitespace-nowrap">
                  L3 Sectors
                </span>
                <Check className="w-3 h-3 text-teal-500 flex-shrink-0" />
                <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className={cn(
                  "px-2 py-0.5 rounded-full font-bold whitespace-nowrap",
                  selectedAsset?.direction === 'BUY' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                )}>
                  L4 {selectedAsset?.symbol} {selectedAsset?.direction}
                </span>
                <Check className="w-3 h-3 text-teal-500 flex-shrink-0" />
              </div>
            )}

            {/* Analysis Configuration */}
            <div className="p-5 rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-white via-violet-50/30 to-white dark:from-slate-900 dark:via-violet-900/10 dark:to-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Asset Analysis</h2>
                </div>
                <button
                  onClick={() => setCurrentStep('stepA')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  Change Asset
                </button>
              </div>

              {selectedAsset ? (
                <div className="space-y-4">
                  {/* Selected Asset Info */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <CoinIcon symbol={selectedAsset.symbol} size={48} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedAsset.symbol}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold",
                          selectedAsset.direction === 'BUY' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                        )}>
                          {selectedAsset.direction}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                          selectedAsset.riskTag === 'low' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600" :
                          selectedAsset.riskTag === 'high' ? "bg-red-100 dark:bg-red-500/20 text-red-600" :
                          "bg-amber-100 dark:bg-amber-500/20 text-amber-600"
                        )}>{selectedAsset.riskTag} risk</span>
                      </div>
                      <p className="text-sm text-slate-500">{selectedAsset.name} - {selectedAsset.confidence}% confidence, {selectedAsset.alignmentScore}/100 alignment</p>
                    </div>
                  </div>

                  {/* Timeframe + Method Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Timeframe</label>
                      <div className="flex gap-2">
                        {TIMEFRAMES.map((tf) => (
                          <button
                            key={tf.value}
                            onClick={() => setTimeframe(tf.value)}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                              timeframe === tf.value
                                ? "bg-violet-500 text-white shadow-md"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                          >
                            {tf.label}
                            <span className="block text-[9px] opacity-60">{tf.type}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Method</label>
                      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <span className="text-sm font-medium text-teal-600 dark:text-teal-400">7-Step + ML Confirmation</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-semibold">Step 8</span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Pass Status */}
                  {dailyPassStatus && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Daily Pass:</span>
                      {dailyPassStatus.hasPass ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">Active</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">{dailyPassStatus.maxUsage - dailyPassStatus.usageCount}/{dailyPassStatus.maxUsage} left</span>
                        </div>
                      ) : (
                        <button
                          onClick={purchaseDailyPass}
                          disabled={purchasingPass}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          {purchasingPass ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy Pass - 100 Credits'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Run Analysis Button */}
                  <button
                    onClick={runAnalysis}
                    disabled={!dailyPassStatus?.canUse}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-6 py-3.5 text-white text-sm font-bold rounded-xl transition-all",
                      dailyPassStatus?.canUse
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 hover:shadow-lg hover:shadow-violet-500/25"
                        : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                    )}
                  >
                    <Zap className="w-5 h-5" />
                    Run Analysis on {selectedAsset.symbol}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Asset Selected</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Go back to select an asset from the AI recommendations.
                  </p>
                  <button
                    onClick={() => setCurrentStep('stepA')}
                    className="px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-500/30 transition"
                  >
                    Back to Recommendations
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Analyses - Always visible below */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
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
                <p className="text-xs text-slate-500">Complete the top-down flow above to run your first analysis</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedAnalyses.map((analysis) => {
                  const isActive = analysis.expiresAt && new Date(analysis.expiresAt) > new Date() && analysis.outcome !== 'correct' && analysis.outcome !== 'incorrect';
                  const verdictConfig = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.wait;
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

      {/* Analysis Dialog */}
      {showAnalysisDialog && selectedAsset && (
        <AnalysisDialog
          isOpen={showAnalysisDialog}
          symbol={selectedAsset.symbol}
          coinName={selectedAsset.name || selectedAsset.symbol}
          timeframe={timeframe}
          capitalFlowContext={capitalFlowContextPayload}
          onClose={() => setShowAnalysisDialog(false)}
          onComplete={() => {
            setShowAnalysisDialog(false);
            fetchDailyPassStatus();
            fetchAnalyses();
          }}
        />
      )}
      </>)}

      {/* Recent Analyses - visible in both modes */}
      {mode === 'select' && analyses.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent Analyses
                  <span className="text-xs font-normal text-slate-500 ml-1">({analyses.length})</span>
                </h3>
              </div>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto">
              <div className="space-y-2">
                {analyses.slice(0, 5).map((analysis) => {
                  const verdictConfig = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.wait;
                  return (
                    <Link
                      key={analysis.id}
                      href={`/analyze/details/${analysis.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition"
                    >
                      <CoinIcon symbol={analysis.symbol} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">{analysis.symbol}</span>
                          <span className={cn("px-1 py-0.5 rounded text-[9px] font-bold", verdictConfig.bg, verdictConfig.text)}>
                            {verdictConfig.label}
                          </span>
                          {analysis.score !== null && (
                            <span className="text-[10px] text-slate-500 font-medium">{(analysis.score * 10).toFixed(0)}%</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{analysis.createdAt}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
