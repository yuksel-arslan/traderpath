'use client';

// ===========================================
// AUTOMATED ANALYSIS PAGE — Intelligence Design
// Full Pipeline: Capital Flow → AI Recommendation → Asset Analysis → Trade Plan
// Runs automatically with visual progression spectacle
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
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
  AlertTriangle,
  Shield,
  Target,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch, getAuthToken, getApiUrl } from '../../../lib/api';

// Intelligence UI
import { PulseDot, VerdictBadge } from '@/components/ui/intelligence';
import { MarketContextPanel } from '@/components/analyze/MarketContextPanel';
import { TrendingAssets } from '@/components/analyze/TrendingAssets';
import { AnalysisPipelineCard } from '@/components/analyze/AnalysisPipelineCard';
import { RecentAnalysisRow } from '@/components/analyze/RecentAnalysisRow';
import { AnalysisReportDrawer } from '@/components/analyze/AnalysisReportDrawer';

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
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type Phase = 'early' | 'mid' | 'late' | 'exit';
type LiquidityBias = 'risk_on' | 'risk_off' | 'neutral';
type PipelineStep = 'idle' | 'capital_flow' | 'ai_recommendation' | 'asset_analysis' | 'complete' | 'error' | 'warning';

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
  insights?: { layer1: string; layer2: string; layer3: string; layer4: string };
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
    buyRecommendation: { market: string; confidence: number; action: string; suggestedAssets: { symbol: string; name?: string; direction?: string; confidence?: number }[] } | null;
    sellRecommendation: { market: string; confidence: number; action: string; suggestedAssets: { symbol: string; name?: string; direction?: string; confidence?: number }[] } | null;
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

const PIPELINE_STEPS = [
  { key: 'capital_flow' as PipelineStep, label: 'Capital Flow', icon: Globe, gradient: 'from-teal-500 to-emerald-600', bgGlow: 'shadow-teal-500/30' },
  { key: 'ai_recommendation' as PipelineStep, label: 'AI Selection', icon: Brain, gradient: 'from-amber-500 to-orange-600', bgGlow: 'shadow-amber-500/30' },
  { key: 'asset_analysis' as PipelineStep, label: 'Deep Analysis', icon: Zap, gradient: 'from-violet-500 to-purple-600', bgGlow: 'shadow-violet-500/30' },
  { key: 'complete' as PipelineStep, label: 'Report Ready', icon: FileText, gradient: 'from-emerald-500 to-green-600', bgGlow: 'shadow-emerald-500/30' },
];

export default function AutomatedAnalysisPage() {
  const router = useRouter();
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [capitalFlowLoading, setCapitalFlowLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AIRecommendedAsset | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [dailyPassStatus, setDailyPassStatus] = useState<{ hasPass: boolean; canUse: boolean; usageCount: number; maxUsage: number } | null>(null);
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [manualSymbol, setManualSymbol] = useState('');
  const [filter, setFilter] = useState('All');
  const [reportDrawerId, setReportDrawerId] = useState<string | null>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ─────────────────────────
  const fetchDailyPassStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/passes/check/ASSET_ANALYSIS');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setDailyPassStatus({ hasPass: data.data.hasPass, canUse: data.data.canUse, usageCount: data.data.pass?.usageCount ?? 0, maxUsage: data.data.pass?.maxUsage ?? 10 });
      }
    } catch {}
  }, []);

  const fetchAnalyses = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) { setAnalyses([]); setAnalysesLoading(false); return; }
      const response = await fetch(getApiUrl('/api/analysis/live-prices'), { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const responseText = await response.text();
        if (responseText?.trim()) {
          const result = JSON.parse(responseText);
          const liveAnalyses = result.data?.analyses || [];
          const mapped = liveAnalyses.map((a: Record<string, unknown>) => {
            const rawVerdict = ((a.verdict as string) || '').toLowerCase().replace(/[^a-z_]/g, '');
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
              id: a.id as string, symbol: a.symbol as string, verdict, score: (a.totalScore as number) ?? null,
              direction: a.direction as string | null, tradeType, method: (a.method as string) || 'classic',
              createdAt: new Date(a.createdAt as string).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
              outcome, entryPrice: a.entryPrice as number | undefined, currentPrice: a.currentPrice as number | undefined,
              unrealizedPnL: a.unrealizedPnL as number | undefined, stopLoss: a.stopLoss as number | undefined,
              takeProfit1: a.takeProfit1 as number | undefined, tpProgress: a.tpProgress as number | undefined,
              hasTradePlan: a.hasTradePlan as boolean | undefined, expiresAt: a.expiresAt as string | undefined,
            };
          });
          setAnalyses(mapped);
        }
      }
    } catch {} finally { setAnalysesLoading(false); }
  }, []);

  useEffect(() => { fetchDailyPassStatus(); fetchAnalyses(); const i = setInterval(fetchAnalyses, 30000); return () => clearInterval(i); }, [fetchDailyPassStatus, fetchAnalyses]);

  // ── Automated Pipeline ─────────────────────
  const runAutomatedPipeline = async () => {
    setPipelineRunning(true); setPipelineError(null); setCapitalFlow(null); setAiRecommendation(null); setSelectedAsset(null);
    try {
      setPipelineStep('capital_flow'); setCapitalFlowLoading(true);
      const cfRes = await authFetch('/api/capital-flow/summary');
      if (!cfRes.ok) throw new Error('Failed to load Capital Flow data');
      const cfData = await cfRes.json();
      if (!cfData.success || !cfData.data) throw new Error('Capital Flow data unavailable');
      setCapitalFlow(cfData.data as CapitalFlowSummary); setCapitalFlowLoading(false);
      await new Promise(r => setTimeout(r, 800));

      setPipelineStep('ai_recommendation');
      const recRes = await authFetch('/api/capital-flow/recommend-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const recData = await recRes.json();
      if (!recData.success || !recData.data) throw new Error('Failed to generate AI recommendations');
      const recommendation = recData.data as AIRecommendation;
      setAiRecommendation(recommendation);
      if (!recommendation.canProceed || recommendation.recommendedAssets.length === 0) { setPipelineStep('warning'); setPipelineRunning(false); return; }
      const topAsset = [...recommendation.recommendedAssets].sort((a, b) => b.confidence - a.confidence)[0];
      setSelectedAsset(topAsset);
      await new Promise(r => setTimeout(r, 600));

      setPipelineStep('asset_analysis');
      const passOk = await verifyAndPurchasePass();
      if (!passOk) return;
      setShowAnalysisDialog(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPipelineError(message); setPipelineStep('error');
    } finally { setPipelineRunning(false); }
  };

  // ── Pass verification helper ──────────────
  const verifyAndPurchasePass = async (): Promise<boolean> => {
    const passRes = await authFetch('/api/passes/check/ASSET_ANALYSIS');
    if (!passRes.ok) { setPipelineError('Could not verify Daily Analysis Pass.'); setPipelineStep('error'); setPipelineRunning(false); return false; }
    const passData = await passRes.json();
    if (!passData.success) { setPipelineError('Pass check failed.'); setPipelineStep('error'); setPipelineRunning(false); return false; }
    const { hasPass, canUse } = passData.data;
    setDailyPassStatus({ hasPass, canUse, usageCount: passData.data.pass?.usageCount ?? 0, maxUsage: passData.data.pass?.maxUsage ?? 10 });
    if (hasPass && canUse) return true;
    if (!canUse && hasPass) { setPipelineError('Daily analysis limit reached (10/10). Resets at midnight UTC.'); setPipelineStep('error'); setPipelineRunning(false); return false; }
    const creditRes = await authFetch('/api/credits/balance');
    const creditData = creditRes.ok ? await creditRes.json() : null;
    const balance = creditData?.data?.balance ?? 0;
    if (balance < 100) { setPipelineError(`Need 100 credits, have ${balance}.`); setPipelineStep('error'); setPipelineRunning(false); return false; }
    const confirmed = window.confirm(`Daily Analysis Pass Required\n\nCost: 100 credits\nIncludes: 10 analyses\nBalance: ${balance}\n\nPurchase now?`);
    if (!confirmed) { setPipelineError('Analysis cancelled.'); setPipelineStep('error'); setPipelineRunning(false); return false; }
    const purchaseRes = await authFetch('/api/passes/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passType: 'ASSET_ANALYSIS' }) });
    const purchaseData = await purchaseRes.json();
    if (!purchaseData.success) { setPipelineError(purchaseData.error?.message || 'Purchase failed.'); setPipelineStep('error'); setPipelineRunning(false); return false; }
    toast.success('Daily Analysis Pass purchased! (100 credits)');
    await fetchDailyPassStatus();
    return true;
  };

  // ── Manual symbol override ────────────────
  const continueWithSymbol = async (sym: string) => {
    const symbol = sym.trim().toUpperCase();
    if (!symbol) return;
    setSelectedAsset({ symbol, name: symbol, market: 'crypto', direction: 'BUY', confidence: 0, alignmentScore: 0, riskTag: 'high', reason: 'Manual override' });
    setPipelineStep('asset_analysis'); setPipelineRunning(true);
    try {
      const passOk = await verifyAndPurchasePass();
      if (!passOk) return;
      setShowAnalysisDialog(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPipelineError(message); setPipelineStep('error'); setPipelineRunning(false);
    }
  };

  // ── capitalFlowContext for AnalysisDialog ──
  const capitalFlowContextPayload = aiRecommendation ? {
    capitalFlowId: aiRecommendation.capitalFlowId,
    recommendedAssets: aiRecommendation.recommendedAssets.map(a => a.symbol),
    direction: selectedAsset?.direction as 'BUY' | 'SELL' | undefined,
    l1Bias: aiRecommendation.l1Status.bias,
    l4Confidence: selectedAsset?.confidence,
    l1Summary: { bias: aiRecommendation.l1Status.bias, dxyTrend: aiRecommendation.l1Status.dxyTrend, vixLevel: aiRecommendation.l1Status.vixLevel, vixValue: aiRecommendation.l1Status.vixValue },
    l2Summary: aiRecommendation.l2Status.map(m => ({ market: m.market, phase: m.phase, flow7d: m.flow7d })),
    l3Summary: { primaryMarket: aiRecommendation.l3Status.primaryMarket, topSectors: aiRecommendation.l3Status.sectors.slice(0, 3).map(s => s.name) },
    l4Summary: { action: aiRecommendation.l4Status.buyRecommendation?.action || aiRecommendation.l4Status.sellRecommendation?.action || 'wait', confidence: selectedAsset?.confidence || aiRecommendation.l4Status.buyRecommendation?.confidence || 0, market: aiRecommendation.l4Status.buyRecommendation?.market || aiRecommendation.l4Status.sellRecommendation?.market || '' },
  } : undefined;

  const handleDelete = async (e: React.MouseEvent, analysisId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this analysis?')) return;
    setActionLoading({ id: analysisId, action: 'delete' });
    try { const r = await authFetch(`/api/analysis/${analysisId}`, { method: 'DELETE' }); if (r.ok) setAnalyses(analyses.filter(a => a.id !== analysisId)); } catch {} finally { setActionLoading(null); }
  };

  const handleEmail = (e: React.MouseEvent, analysis: RecentAnalysis) => {
    e.preventDefault(); e.stopPropagation();
    router.push(`/analyze/details/${analysis.id}?email=true`);
  };

  // ── Helpers ────────────────────────────────
  const getBiasConfig = (bias: LiquidityBias) => {
    const c: Record<LiquidityBias, { color: string; bg: string; label: string }> = {
      risk_on: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: 'RISK ON' },
      risk_off: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', label: 'RISK OFF' },
      neutral: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20', label: 'NEUTRAL' },
    };
    return c[bias] || c.neutral;
  };

  const getPhaseConfig = (phase: Phase) => {
    const c: Record<Phase, { color: string; bg: string }> = {
      early: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
      mid: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/20' },
      late: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/20' },
      exit: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20' },
    };
    return c[phase] || c.mid;
  };

  const getStepIndex = (step: PipelineStep): number => { const idx = PIPELINE_STEPS.findIndex(s => s.key === step); return idx >= 0 ? idx : -1; };
  const currentStepIdx = getStepIndex(pipelineStep);

  // Deduplicate trending assets by symbol
  const trendingAssets = (() => {
    const raw = aiRecommendation?.recommendedAssets?.map(a => ({ symbol: a.symbol, score: a.confidence, change: a.direction === 'BUY' ? '+' : '-', flow: a.reason.slice(0, 20) }))
      || analyses.map(a => ({ symbol: a.symbol.replace(/USDT$/i, ''), score: a.score ?? 0 }));
    const seen = new Set<string>();
    return raw.filter(a => {
      const key = a.symbol.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4);
  })();

  // Deduplicate recent analyses by symbol (keep most recent per symbol)
  const uniqueAnalyses = (() => {
    const seen = new Set<string>();
    return analyses.filter(a => {
      if (seen.has(a.symbol)) return false;
      seen.add(a.symbol);
      return true;
    });
  })();

  const filteredRecent = filter === 'All' ? uniqueAnalyses : uniqueAnalyses.filter(a => {
    if (filter === 'GO') return a.verdict === 'go';
    if (filter === 'COND') return a.verdict === 'conditional_go';
    if (filter === 'AVOID') return a.verdict === 'avoid';
    return true;
  });

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* ─── LEFT PANEL ──────────────────── */}
          <div className="space-y-4">
            {/* Configure */}
            <div className="rounded-xl p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">Configure</span>
              <div className="mt-3">
                <label className="text-[10px] block mb-1.5 text-gray-400 dark:text-white/30">Manual Symbol</label>
                <div className="relative">
                  <input type="text" value={manualSymbol} onChange={e => setManualSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter' && manualSymbol.trim()) continueWithSymbol(manualSymbol); }}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none transition-all focus:ring-1 focus:ring-[#00F5A0] bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", caretColor: '#00F5A0' }} placeholder="BTC, SOL, ETH..." />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-white/20">USDT</span>
                </div>
                {manualSymbol.trim() && (
                  <button onClick={() => continueWithSymbol(manualSymbol)}
                    className="mt-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}>
                    Analyze {manualSymbol}
                  </button>
                )}
              </div>
              <div className="mt-3">
                <Link href="/analyze/tailored" className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors">
                  <Target className="w-3.5 h-3.5" /> Tailored Analysis
                </Link>
              </div>
            </div>

            <MarketContextPanel capitalFlow={capitalFlow} />
            {trendingAssets.length > 0 && <TrendingAssets assets={trendingAssets} onSelect={sym => setManualSymbol(sym)} />}
          </div>

          {/* ─── RIGHT PANEL ─────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Pipeline card (idle) */}
            {pipelineStep === 'idle' && (
              <AnalysisPipelineCard running={false} currentStep={-1} onRun={runAutomatedPipeline} dailyPassStatus={dailyPassStatus} />
            )}

            {/* Pipeline running states */}
            {(pipelineStep !== 'idle' || pipelineRunning) && (
              <div ref={pipelineRef} className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  {pipelineRunning && <PulseDot color="#00F5A0" size={8} />}
                  <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
                    {pipelineRunning ? 'Analysis Running' : pipelineStep === 'complete' ? 'Complete' : 'Pipeline'}
                  </span>
                </div>

                {/* Step indicators */}
                <div className="flex items-center justify-between px-2">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isActive = step.key === pipelineStep;
                    const isComplete = currentStepIdx > idx || pipelineStep === 'complete';
                    const isError = pipelineStep === 'error' && currentStepIdx === idx;
                    const StepIcon = step.icon;
                    return (
                      <div key={step.key} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500',
                            isComplete ? `bg-gradient-to-br ${step.gradient} text-white shadow-lg ${step.bgGlow}` :
                            isActive ? `bg-gradient-to-br ${step.gradient} text-white shadow-lg ${step.bgGlow} animate-pulse` :
                            isError ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-200 dark:bg-white/[0.06] text-gray-400 dark:text-white/30'
                          )}>
                            {isComplete ? <Check className="w-5 h-5" /> : isError ? <AlertTriangle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                          </div>
                          <span className={cn('text-[10px] sm:text-xs font-medium mt-1.5 text-center', isActive || isComplete ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/30')}>{step.label}</span>
                        </div>
                        {idx < PIPELINE_STEPS.length - 1 && <div className={cn('h-0.5 flex-1 mx-2 rounded-full transition-all duration-700', currentStepIdx > idx ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-gray-200 dark:bg-white/[0.06]')} />}
                      </div>
                    );
                  })}
                </div>

                {/* Capital Flow detail */}
                {capitalFlow && (currentStepIdx >= 0) && (
                  <div className="rounded-lg p-3 border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-teal-500" /><span className="text-xs font-bold text-gray-900 dark:text-white">Capital Flow</span>{currentStepIdx > 0 && <Check className="w-3.5 h-3.5 text-teal-500" />}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]"><p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">Liquidity</p><span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', getBiasConfig(capitalFlow.liquidityBias).bg, getBiasConfig(capitalFlow.liquidityBias).color)}>{getBiasConfig(capitalFlow.liquidityBias).label}</span></div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]"><p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">Markets</p><div className="flex flex-wrap gap-1">{(capitalFlow.markets || []).filter(m => m?.market).slice(0, 3).map(m => <span key={m.market} className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold', getPhaseConfig(m.phase).bg, getPhaseConfig(m.phase).color)}>{m.market.toUpperCase()}</span>)}</div></div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]"><p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">Sector</p><span className="text-xs font-semibold text-gray-900 dark:text-white">{capitalFlow.recommendation?.primaryMarket?.toUpperCase() || 'N/A'}</span></div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]"><p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">Direction</p><span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', (capitalFlow.recommendation?.direction || '').toUpperCase() === 'BUY' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400')}>{(capitalFlow.recommendation?.direction || 'N/A').toUpperCase()}</span></div>
                    </div>
                  </div>
                )}

                {pipelineStep === 'capital_flow' && !capitalFlow && <div className="flex items-center gap-3 py-3"><Loader2 className="w-5 h-5 animate-spin text-teal-500" /><span className="text-sm text-gray-500 dark:text-white/40">Scanning global money flow...</span></div>}

                {/* AI Recommendation */}
                {(pipelineStep === 'ai_recommendation' || (currentStepIdx > 1 && aiRecommendation)) && (
                  <div className="rounded-lg p-3 border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4 text-amber-500" /><span className="text-xs font-bold text-gray-900 dark:text-white">AI Selection</span>{aiRecommendation && <Check className="w-3.5 h-3.5 text-amber-500" />}</div>
                    {!aiRecommendation ? <div className="flex items-center gap-3 py-3"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /><span className="text-sm text-gray-500 dark:text-white/40">AI analyzing assets...</span></div> : (
                      <div>
                        {aiRecommendation.warnings.length > 0 && <div className="mb-2 space-y-1">{aiRecommendation.warnings.map((w, i) => <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{w}</div>)}</div>}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {aiRecommendation.recommendedAssets.slice(0, 6).map(asset => {
                            const isTop = selectedAsset?.symbol === asset.symbol;
                            const isBuy = asset.direction === 'BUY';
                            return (
                              <div key={`${asset.symbol}-${asset.direction}`} className={cn('flex-shrink-0 p-3 rounded-xl border min-w-[130px] transition-all', isTop ? isBuy ? 'border-[#00F5A0]/50 bg-[#00F5A0]/5 ring-1 ring-[#00F5A0]/30' : 'border-[#FF4757]/50 bg-[#FF4757]/5 ring-1 ring-[#FF4757]/30' : 'border-gray-200 dark:border-white/[0.06]')}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <CoinIcon symbol={asset.symbol} size={24} />
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">{asset.symbol}</span>
                                  <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold ml-auto', isBuy ? 'text-[#00F5A0] bg-[#00F5A0]/10' : 'text-[#FF4757] bg-[#FF4757]/10')}>{asset.direction}</span>
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-white/35">Conf: {asset.confidence}%{isTop && <span className="ml-2 text-[#00F5A0] font-bold">SELECTED</span>}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {pipelineStep === 'asset_analysis' && selectedAsset && !showAnalysisDialog && <div className="flex items-center gap-3 py-3"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /><span className="text-sm text-gray-500 dark:text-white/40">Launching analysis on <span className="font-bold text-gray-900 dark:text-white">{selectedAsset.symbol}</span>...</span></div>}

                {/* Warning */}
                {pipelineStep === 'warning' && (
                  <div className="rounded-lg p-4 border border-[#FFB800]/30 bg-[#FFB800]/5">
                    <div className="flex items-start gap-3 mb-3"><AlertTriangle className="w-5 h-5 text-[#FFB800] mt-0.5 shrink-0" /><div><h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Unfavorable Conditions</h3><p className="text-xs text-gray-500 dark:text-white/50">Capital Flow indicates unfavorable conditions.</p></div></div>
                    {aiRecommendation?.warnings?.length ? <div className="mb-3 pl-8 space-y-1">{aiRecommendation.warnings.map((w, i) => <div key={i} className="flex items-start gap-2 text-xs text-[#FFB800]"><ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{w}</span></div>)}</div> : null}
                    <div className="pl-8 pt-3 border-t border-[#FFB800]/20">
                      <div className="flex gap-2">
                        <input type="text" placeholder="Symbol (e.g. BTC)" value={manualSymbol} onChange={e => setManualSymbol(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter' && manualSymbol.trim()) continueWithSymbol(manualSymbol); }} className="flex-1 border border-gray-300 dark:border-white/[0.1] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:border-[#00F5A0] outline-none" />
                        <button onClick={() => continueWithSymbol(manualSymbol)} disabled={!manualSymbol.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}>Analyze</button>
                      </div>
                      <button onClick={() => { setPipelineStep('idle'); setAiRecommendation(null); setCapitalFlow(null); setManualSymbol(''); }} className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white/60 transition-colors">Dismiss</button>
                    </div>
                  </div>
                )}

                {/* Error */}
                {pipelineStep === 'error' && pipelineError && (
                  <div className="rounded-lg p-4 border border-[#FF4757]/30 bg-[#FF4757]/5">
                    <div className="flex items-start gap-3"><Shield className="w-5 h-5 text-[#FF4757] mt-0.5 shrink-0" /><div><h3 className="text-sm font-bold text-[#FF4757] mb-1">Pipeline Stopped</h3><p className="text-xs text-[#FF4757]/80 mb-3">{pipelineError}</p><div className="flex gap-2"><button onClick={() => { setPipelineStep('idle'); setPipelineError(null); }} className="px-4 py-2 rounded-lg bg-[#FF4757]/10 text-[#FF4757] text-xs font-medium hover:bg-[#FF4757]/20 transition">Dismiss</button><button onClick={runAutomatedPipeline} className="px-4 py-2 rounded-lg text-xs font-medium transition hover:scale-105" style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}>Retry</button></div></div></div>
                  </div>
                )}

                {/* Complete */}
                {pipelineStep === 'complete' && (
                  <div className="rounded-lg p-4 border border-[#00F5A0]/30 bg-[#00F5A0]/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)' }}><Check className="w-5 h-5 text-white" /></div>
                      <div><h3 className="text-sm font-bold" style={{ color: '#00F5A0' }}>Analysis Complete</h3><p className="text-xs text-gray-500 dark:text-white/40">Report saved. View it below.</p></div>
                    </div>
                    <button onClick={() => { setPipelineStep('idle'); setAiRecommendation(null); setSelectedAsset(null); setCapitalFlow(null); }} className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}>Run Another Analysis</button>
                  </div>
                )}
              </div>
            )}

            {/* Recent Analyses */}
            <div className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">Recent ({filteredRecent.length})</span>
                <div className="flex gap-1">{['All', 'GO', 'COND', 'AVOID'].map(f => <button key={f} onClick={() => setFilter(f)} className={cn('px-2.5 py-1 text-[11px] rounded-md font-medium transition-all', filter === f ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10' : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50')}>{f}</button>)}</div>
              </div>
              {analysesLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#00F5A0' }} /></div> :
               filteredRecent.length === 0 ? <div className="text-center py-8"><p className="text-xs text-gray-400 dark:text-white/30">No analyses found</p></div> :
               <div className="space-y-2">{filteredRecent.slice(0, 10).map(item => <RecentAnalysisRow key={item.id} item={item} />)}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Dialog */}
      {showAnalysisDialog && selectedAsset && (
        <AnalysisDialog isOpen={showAnalysisDialog} symbol={selectedAsset.symbol} coinName={selectedAsset.name || selectedAsset.symbol} timeframe="4h" capitalFlowContext={capitalFlowContextPayload}
          onClose={() => { setShowAnalysisDialog(false); setPipelineStep('complete'); fetchDailyPassStatus(); fetchAnalyses(); }}
          onComplete={() => { setShowAnalysisDialog(false); setPipelineStep('complete'); fetchDailyPassStatus(); fetchAnalyses(); }}
          onReportReady={(id) => { setShowAnalysisDialog(false); setPipelineStep('complete'); fetchDailyPassStatus(); fetchAnalyses(); setReportDrawerId(id); }} />
      )}

      {/* Analysis Report Drawer - slides up from bottom after analysis completes */}
      <AnalysisReportDrawer analysisId={reportDrawerId} onClose={() => setReportDrawerId(null)} />
    </div>
  );
}
