'use client';

// ===========================================
// AUTOMATED ANALYSIS PAGE
// Full Pipeline: Capital Flow → AI Recommendation → Asset Analysis → Trade Plan
// Runs automatically with visual progression spectacle
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Globe,
  Brain,
  Zap,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  ArrowRight,
  AlertTriangle,
  Shield,
  Sparkles,
  Target,
  RefreshCw,
  BarChart3,
  Coins,
  Landmark,
  Gem,
  Building2,
  Activity,
  ChevronRight,
  Play,
  Eye,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch, getAuthToken, getApiUrl } from '../../../lib/api';
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

// Import shared mobile components
import { RecentAnalysesMobile } from '../../../components/analyze/RecentAnalysesMobile';

// Types
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type Phase = 'early' | 'mid' | 'late' | 'exit';
type LiquidityBias = 'risk_on' | 'risk_off' | 'neutral';

// Pipeline steps
type PipelineStep = 'idle' | 'capital_flow' | 'ai_recommendation' | 'asset_analysis' | 'complete' | 'error';

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

// Pipeline step configurations
const PIPELINE_STEPS = [
  {
    key: 'capital_flow' as PipelineStep,
    label: 'Capital Flow Analysis',
    sublabel: 'Scanning L1-L4 global money flow',
    icon: Globe,
    color: 'teal',
    gradient: 'from-teal-500 to-emerald-600',
    bgGlow: 'shadow-teal-500/30',
  },
  {
    key: 'ai_recommendation' as PipelineStep,
    label: 'AI Asset Selection',
    sublabel: 'Identifying highest-probability assets',
    icon: Brain,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    bgGlow: 'shadow-amber-500/30',
  },
  {
    key: 'asset_analysis' as PipelineStep,
    label: 'Deep Analysis',
    sublabel: '7-Step + ML Confirmation running',
    icon: Zap,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    bgGlow: 'shadow-violet-500/30',
  },
  {
    key: 'complete' as PipelineStep,
    label: 'Report Ready',
    sublabel: 'Analysis complete. View your report.',
    icon: FileText,
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-600',
    bgGlow: 'shadow-emerald-500/30',
  },
];

export default function AutomatedAnalysisPage() {
  const router = useRouter();

  // Pipeline state
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [pipelineRunning, setPipelineRunning] = useState(false);

  // Capital Flow state
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [capitalFlowLoading, setCapitalFlowLoading] = useState(false);

  // AI Recommendation state
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);

  // Selected asset for analysis
  const [selectedAsset, setSelectedAsset] = useState<AIRecommendedAsset | null>(null);

  // Analysis dialog
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Daily pass
  const [dailyPassStatus, setDailyPassStatus] = useState<{
    hasPass: boolean;
    canUse: boolean;
    usageCount: number;
    maxUsage: number;
  } | null>(null);

  // Recent analyses
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  // Error state
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Scroll ref for pipeline visual
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Fetch helpers
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

  const fetchAnalyses = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) { setAnalyses([]); setAnalysesLoading(false); return; }

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
            if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') outcome = 'correct';
            else if (a.outcome === 'sl_hit') outcome = 'incorrect';
            else if (a.hasTradePlan) outcome = 'pending';

            return {
              id: a.id, symbol: a.symbol, verdict, score: a.totalScore ?? null,
              direction: a.direction, tradeType, method: a.method || 'classic',
              createdAt: new Date(a.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
              outcome, entryPrice: a.entryPrice, currentPrice: a.currentPrice, unrealizedPnL: a.unrealizedPnL,
              stopLoss: a.stopLoss, takeProfit1: a.takeProfit1, tpProgress: a.tpProgress, hasTradePlan: a.hasTradePlan, expiresAt: a.expiresAt,
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

  // ============================================================
  // AUTOMATED PIPELINE - Runs all steps sequentially
  // ============================================================
  const runAutomatedPipeline = async () => {
    setPipelineRunning(true);
    setPipelineError(null);
    setCapitalFlow(null);
    setAiRecommendation(null);
    setSelectedAsset(null);

    try {
      // STEP 1: Capital Flow Analysis
      setPipelineStep('capital_flow');
      setCapitalFlowLoading(true);
      const cfRes = await authFetch('/api/capital-flow/summary');
      if (!cfRes.ok) throw new Error('Failed to load Capital Flow data');
      const cfData = await cfRes.json();
      if (!cfData.success || !cfData.data) throw new Error('Capital Flow data unavailable');
      const cfSummary = cfData.data as CapitalFlowSummary;
      setCapitalFlow(cfSummary);
      setCapitalFlowLoading(false);

      // Brief pause for visual effect
      await new Promise(r => setTimeout(r, 800));

      // STEP 2: AI Asset Recommendation
      setPipelineStep('ai_recommendation');
      const recRes = await authFetch('/api/capital-flow/recommend-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const recData = await recRes.json();
      if (!recData.success || !recData.data) throw new Error('Failed to generate AI recommendations');
      const recommendation = recData.data as AIRecommendation;
      setAiRecommendation(recommendation);

      if (!recommendation.canProceed || recommendation.recommendedAssets.length === 0) {
        setPipelineError('Capital Flow conditions are unfavorable. No assets recommended for analysis at this time.');
        setPipelineStep('error');
        setPipelineRunning(false);
        return;
      }

      // Auto-select top asset (highest confidence)
      const topAsset = [...recommendation.recommendedAssets].sort((a, b) => b.confidence - a.confidence)[0];
      setSelectedAsset(topAsset);

      await new Promise(r => setTimeout(r, 600));

      // STEP 3: Check daily pass, then open analysis dialog
      setPipelineStep('asset_analysis');

      // Check daily pass
      const passRes = await authFetch('/api/passes/check/ASSET_ANALYSIS');
      if (passRes.ok) {
        const passData = await passRes.json();
        if (passData.success) {
          const hasPass = passData.data.hasPass;
          const canUse = passData.data.canUse;
          setDailyPassStatus({
            hasPass,
            canUse,
            usageCount: passData.data.pass?.usageCount ?? 0,
            maxUsage: passData.data.pass?.maxUsage ?? 10,
          });

          if (!hasPass || !canUse) {
            // Auto-purchase pass
            const purchaseRes = await authFetch('/api/passes/purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ passType: 'ASSET_ANALYSIS' }),
            });
            const purchaseData = await purchaseRes.json();
            if (!purchaseData.success) {
              setPipelineError('Insufficient credits for Daily Analysis Pass (100 credits). Please purchase credits first.');
              setPipelineStep('error');
              setPipelineRunning(false);
              return;
            }
            toast.success('Daily Analysis Pass purchased!');
            await fetchDailyPassStatus();
          }
        }
      }

      // Open analysis dialog - this triggers the actual 7-step analysis
      setShowAnalysisDialog(true);

    } catch (error: any) {
      console.error('Pipeline error:', error);
      setPipelineError(error.message || 'An unexpected error occurred');
      setPipelineStep('error');
    } finally {
      if (pipelineStep !== 'error') {
        // Don't stop running flag - AnalysisDialog handles completion
      }
      setPipelineRunning(false);
    }
  };

  // Build capitalFlowContext for AnalysisDialog
  const capitalFlowContextPayload = aiRecommendation ? {
    capitalFlowId: aiRecommendation.capitalFlowId,
    recommendedAssets: aiRecommendation.recommendedAssets.map(a => a.symbol),
    direction: selectedAsset?.direction as 'BUY' | 'SELL' | undefined,
    l1Bias: aiRecommendation.l1Status.bias,
    l4Confidence: selectedAsset?.confidence,
    l1Summary: {
      bias: aiRecommendation.l1Status.bias,
      dxyTrend: aiRecommendation.l1Status.dxyTrend,
      vixLevel: aiRecommendation.l1Status.vixLevel,
      vixValue: aiRecommendation.l1Status.vixValue,
    },
    l2Summary: aiRecommendation.l2Status.map(m => ({ market: m.market, phase: m.phase, flow7d: m.flow7d })),
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

  // Delete analysis
  const handleDelete = async (e: React.MouseEvent, analysisId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this analysis?')) return;
    setActionLoading({ id: analysisId, action: 'delete' });
    try {
      const response = await authFetch(`/api/analysis/${analysisId}`, { method: 'DELETE' });
      if (response.ok) setAnalyses(analyses.filter(a => a.id !== analysisId));
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmail = (e: React.MouseEvent, analysis: RecentAnalysis) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/analyze/details/${analysis.id}?email=true`);
  };

  // Helpers
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

  const getStepIndex = (step: PipelineStep): number => {
    const idx = PIPELINE_STEPS.findIndex(s => s.key === step);
    return idx >= 0 ? idx : -1;
  };

  const currentStepIdx = getStepIndex(pipelineStep);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#041020]">

      {/* ================================================ */}
      {/* HERO - AUTOMATED ANALYSIS                        */}
      {/* ================================================ */}
      <div className="border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#071023]">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-teal-500/20 mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Automated Analysis
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
              One click. Full pipeline. Capital Flow scans global markets, AI picks the best asset, and a complete 7-Step + ML analysis runs automatically.
            </p>

            {pipelineStep === 'idle' && !pipelineRunning && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={runAutomatedPipeline}
                  className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-base font-bold rounded-xl hover:from-teal-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-teal-500/25 transition-all active:scale-[0.98]"
                >
                  <Play className="w-5 h-5" />
                  Run Automated Analysis
                </button>
                <Link
                  href="/analyze/tailored"
                  className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium rounded-xl hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Target className="w-4 h-4" />
                  Tailored Analysis
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================ */}
      {/* PIPELINE VISUAL PROGRESSION                      */}
      {/* ================================================ */}
      {(pipelineStep !== 'idle' || pipelineRunning) && (
        <div ref={pipelineRef} className="max-w-5xl mx-auto px-4 py-8">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between mb-8 px-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = step.key === pipelineStep;
              const isComplete = currentStepIdx > idx || pipelineStep === 'complete';
              const isError = pipelineStep === 'error' && currentStepIdx === idx;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500',
                      isComplete
                        ? `bg-gradient-to-br ${step.gradient} text-white shadow-lg ${step.bgGlow}`
                        : isActive
                          ? `bg-gradient-to-br ${step.gradient} text-white shadow-lg ${step.bgGlow} animate-pulse`
                          : isError
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    )}>
                      {isComplete ? <Check className="w-5 h-5" /> : isError ? <AlertTriangle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <span className={cn(
                      'text-[10px] sm:text-xs font-medium mt-1.5 text-center',
                      isActive || isComplete ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className={cn(
                      'h-0.5 flex-1 mx-2 rounded-full transition-all duration-700',
                      currentStepIdx > idx ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Step Detail */}
          <div className="space-y-4">

            {/* CAPITAL FLOW STEP */}
            {(pipelineStep === 'capital_flow' || (currentStepIdx > 0 && capitalFlow)) && (
              <div className={cn(
                'p-4 sm:p-5 rounded-2xl border-2 transition-all duration-500',
                pipelineStep === 'capital_flow'
                  ? 'border-teal-300 dark:border-teal-500/40 bg-gradient-to-br from-white via-teal-50/50 to-white dark:from-[#071023] dark:via-teal-900/20 dark:to-[#071023] shadow-lg shadow-teal-500/10'
                  : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#071023]'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-teal-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Capital Flow Analysis</h3>
                    {capitalFlow && <Check className="w-4 h-4 text-teal-500" />}
                  </div>
                </div>

                {capitalFlowLoading && !capitalFlow ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                    <span className="text-sm text-slate-500">Scanning global money flow across 5 markets...</span>
                  </div>
                ) : capitalFlow ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* L1: Liquidity Bias */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-[10px] font-medium text-slate-400 mb-1">L1: Liquidity</p>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', getBiasConfig(capitalFlow.liquidityBias).bg, getBiasConfig(capitalFlow.liquidityBias).color)}>
                        {getBiasConfig(capitalFlow.liquidityBias).label}
                      </span>
                    </div>
                    {/* L2: Top Markets */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-[10px] font-medium text-slate-400 mb-1">L2: Markets</p>
                      <div className="flex flex-wrap gap-1">
                        {(capitalFlow.markets || []).filter(m => m && m.market).slice(0, 3).map(m => (
                          <span key={m.market} className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', getPhaseConfig(m.phase).bg, getPhaseConfig(m.phase).color)}>
                            {m.market.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* L3: Recommendation Market */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-[10px] font-medium text-slate-400 mb-1">L3: Sector Focus</p>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {capitalFlow.recommendation?.primaryMarket?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                    {/* L4: Direction */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-[10px] font-medium text-slate-400 mb-1">L4: Direction</p>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-bold',
                        (capitalFlow.recommendation?.direction || '').toUpperCase() === 'BUY'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                      )}>
                        {(capitalFlow.recommendation?.direction || 'N/A').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* AI RECOMMENDATION STEP */}
            {(pipelineStep === 'ai_recommendation' || (currentStepIdx > 1 && aiRecommendation)) && (
              <div className={cn(
                'p-4 sm:p-5 rounded-2xl border-2 transition-all duration-500',
                pipelineStep === 'ai_recommendation'
                  ? 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-white via-amber-50/50 to-white dark:from-[#071023] dark:via-amber-900/20 dark:to-[#071023] shadow-lg shadow-amber-500/10'
                  : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#071023]'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Asset Selection</h3>
                    {aiRecommendation && <Check className="w-4 h-4 text-amber-500" />}
                  </div>
                </div>

                {pipelineStep === 'ai_recommendation' && !aiRecommendation ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                    <span className="text-sm text-slate-500">AI analyzing all assets for highest-probability opportunities...</span>
                  </div>
                ) : aiRecommendation ? (
                  <div>
                    {/* Warnings */}
                    {aiRecommendation.warnings.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {aiRecommendation.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Recommended assets */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {aiRecommendation.recommendedAssets.slice(0, 6).map(asset => {
                        const isTop = selectedAsset?.symbol === asset.symbol;
                        const isBuy = asset.direction === 'BUY';
                        return (
                          <div key={`${asset.symbol}-${asset.direction}`} className={cn(
                            'flex-shrink-0 p-3 rounded-xl border-2 min-w-[130px] transition-all',
                            isTop
                              ? isBuy
                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/30'
                                : 'border-red-400 bg-red-50 dark:bg-red-500/10 ring-2 ring-red-500/30'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                          )}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <CoinIcon symbol={asset.symbol} size={24} />
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{asset.symbol}</span>
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-[9px] font-bold ml-auto',
                                isBuy ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                              )}>{asset.direction}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span>Conf: {asset.confidence}%</span>
                              {isTop && <span className="ml-2 text-teal-600 dark:text-teal-400 font-bold">SELECTED</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* ASSET ANALYSIS STEP */}
            {pipelineStep === 'asset_analysis' && selectedAsset && !showAnalysisDialog && (
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-gradient-to-br from-white via-violet-50/50 to-white dark:from-[#071023] dark:via-violet-900/20 dark:to-[#071023] shadow-lg shadow-violet-500/10">
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                  <span className="text-sm text-slate-500">
                    Launching 7-Step + ML Confirmation analysis on <span className="font-bold text-slate-900 dark:text-white">{selectedAsset.symbol}</span>...
                  </span>
                </div>
              </div>
            )}

            {/* ERROR STATE */}
            {pipelineStep === 'error' && pipelineError && (
              <div className="p-5 rounded-2xl border-2 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">Pipeline Stopped</h3>
                    <p className="text-sm text-red-600 dark:text-red-400/80 mb-3">{pipelineError}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPipelineStep('idle'); setPipelineError(null); }}
                        className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-500/30 transition"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={runAutomatedPipeline}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-medium hover:shadow-lg transition"
                      >
                        <RefreshCw className="w-4 h-4 inline mr-1" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COMPLETE STATE - shown when dialog was closed after analysis */}
            {pipelineStep === 'complete' && (
              <div className="p-5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Analysis Complete</h3>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60">Your report has been saved. View it in recent analyses below.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setPipelineStep('idle'); setAiRecommendation(null); setSelectedAsset(null); setCapitalFlow(null); }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-medium hover:shadow-lg transition"
                >
                  <RefreshCw className="w-4 h-4 inline mr-1" />
                  Run Another Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================ */}
      {/* IDLE STATE - FEATURE OVERVIEW + QUICK LINKS      */}
      {/* ================================================ */}
      {pipelineStep === 'idle' && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#071023]">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center mb-3">
                <Globe className="w-5 h-5 text-teal-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Capital Flow Scan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scans global liquidity, 5 market flows, sector activity, and AI recommendations.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#071023]">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                <Brain className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">AI Picks Best Asset</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI selects the highest-confidence asset aligned with Capital Flow direction.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#071023]">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-violet-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Full Analysis + Report</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">7-Step analysis with ML confirmation, trade plan, and downloadable report.</p>
            </div>
          </div>

          {/* Daily Pass Info */}
          {dailyPassStatus && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#071023] border border-slate-200 dark:border-slate-700 mb-6">
              <Shield className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Daily Pass:</span>
              {dailyPassStatus.hasPass ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  Active - {dailyPassStatus.maxUsage - dailyPassStatus.usageCount}/{dailyPassStatus.maxUsage} analyses left
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-semibold">
                  Not purchased (100 Credits for 10 analyses)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================ */}
      {/* RECENT ANALYSES                                  */}
      {/* ================================================ */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <RecentAnalysesMobile
          analyses={analyses}
          loading={analysesLoading}
          onRefresh={fetchAnalyses}
          onDelete={handleDelete}
          onEmail={handleEmail}
        />
      </div>

      {/* Analysis Dialog */}
      {showAnalysisDialog && selectedAsset && (
        <AnalysisDialog
          isOpen={showAnalysisDialog}
          symbol={selectedAsset.symbol}
          coinName={selectedAsset.name || selectedAsset.symbol}
          timeframe="4h"
          capitalFlowContext={capitalFlowContextPayload}
          onClose={() => {
            setShowAnalysisDialog(false);
            setPipelineStep('complete');
            fetchDailyPassStatus();
            fetchAnalyses();
          }}
          onComplete={() => {
            setShowAnalysisDialog(false);
            setPipelineStep('complete');
            fetchDailyPassStatus();
            fetchAnalyses();
          }}
        />
      )}
    </div>
  );
}
