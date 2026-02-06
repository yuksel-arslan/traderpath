'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Globe,
  Layers,
  Target,
  FileText,
  ChevronRight,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  Shield,
  AlertTriangle,
  Activity,
  BarChart3,
  Clock,
  DollarSign,
  Zap,
  Eye,
  ExternalLink,
  Info,
  Star,
  Search,
  RefreshCw,
  Landmark,
  Loader2,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authFetch } from '../../../lib/api';
import { ForecastBandOverlay } from '../../../components/analysis/ForecastBandOverlay';
import { MultiStrategyCards } from '../../../components/analysis/MultiStrategyCards';
import { WebResearchPanel } from '../../../components/analysis/WebResearchPanel';
import { PlanValidationBadge } from '../../../components/analysis/PlanValidationBadge';
import {
  VerdictBadge,
  ScoreGauge,
} from '../../../components/analysis/TradeDecisionVisual';
import { getCoinIcon, FALLBACK_COIN_ICON } from '@/lib/coin-icons';

// Lazy load TradePlanChart (uses lightweight-charts which is browser-only)
const TradePlanChart = dynamic(
  () =>
    import('../../../components/analysis/TradePlanChart').then((mod) => ({
      default: mod.TradePlanChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapitalFlowSummary {
  globalLiquidity?: {
    fedBalanceSheet?: { value?: number; change30d?: number; trend?: string };
    m2MoneySupply?: { value?: number; change30d?: number; yoyGrowth?: number };
    dxy?: { value?: number; change7d?: number; trend?: string };
    vix?: { value?: number; level?: string };
    yieldCurve?: { spread10y2y?: number; inverted?: boolean; interpretation?: string };
    netLiquidity?: { value?: number; change7d?: number; change30d?: number; trend?: string; interpretation?: string };
    bias?: string;
    fedBalanceSheet?: { value?: number; trend?: string; change30d?: number };
    m2?: { growth?: number; value?: number; change30d?: number };
    dxy?: { value?: number; trend?: string; change7d?: number };
    vix?: { value?: number; level?: string };
    yieldCurve?: { spread?: number; inverted?: boolean; spread10y2y?: number };
    lastUpdated?: string;
  };
  liquidityBias?: string;
  markets?: Array<{
    market?: string;
    flow7d?: number;
    flow30d?: number;
    flowVelocity?: number;
    phase?: string;
    rotationSignal?: string;
    currentValue?: number;
    sectors?: Array<{
      name?: string;
      flow7d?: number;
      flow30d?: number;
      dominance?: number;
      trending?: string;
      phase?: string;
      topAssets?: string[];
    }>;
    value?: number;
    daysInPhase?: number;
    sectors?: Array<{ name: string; flow7d: number; trending: string }>;
  }>;
  recommendation?: {
    primaryMarket?: string;
    action?: string;
    direction?: string;
    confidence?: number;
    reason?: string;
    phase?: string;
    sectors?: string[];
    suggestedAssets?: Array<{ symbol: string; name: string; market: string; sector?: string; riskLevel?: string; reason?: string }>;
    suggestedAssets?: Array<{ symbol: string; name?: string; market?: string }>;
  };
  sellRecommendation?: {
    primaryMarket?: string;
    direction?: string;
    reason?: string;
    confidence?: number;
    sectors?: string[];
    suggestedAssets?: Array<{ symbol: string; name: string; market: string; sector?: string; riskLevel?: string; reason?: string }>;
  };
  insights?: {
    layer1?: string;
    layer2?: string;
    layer3?: string;
    layer4?: string;
    ragLayer1?: string;
    ragLayer2?: string;
    ragLayer3?: string;
    ragLayer4?: string;
  };
}

interface AnalysisData {
  id: string;
  symbol: string;
  interval: string;
  method: string;
  totalScore: number;
  createdAt: string;
  step1Result?: Record<string, unknown>;
  step2Result?: Record<string, unknown>;
  step3Result?: Record<string, unknown>;
  step4Result?: Record<string, unknown>;
  step5Result?: Record<string, unknown>;
  step6Result?: Record<string, unknown>;
  step7Result?: Record<string, unknown>;
}

interface TopCoin {
  symbol: string;
  totalScore: number;
  verdict: string;
  direction: string;
  analysisId: string;
  change24h?: number;
  method?: string;
}

type ViewStep =
  | 'flow'       // L1-L2: Capital Flow Overview
  | 'sector'     // L3: Sector Activity
  | 'asset'      // Asset Analysis
  | 'plan'       // Trade Plan (DEFAULT)
  | 'top-coins'  // Top Coins (from explore)
  | 'signals';   // Signals (from explore)

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function safeStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function formatPrice(price: number): string {
  if (price >= 10000)
    return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 100)
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function getPhaseColor(phase: string) {
  const p = (phase || '').toLowerCase();
  if (p === 'early') return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (p === 'mid') return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
  if (p === 'late') return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  if (p === 'exit') return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
}

function getBiasColor(bias: string) {
  const b = (bias || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (b === 'risk_on') return { text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (b === 'risk_off') return { text: 'text-red-400', bg: 'bg-red-500/10' };
  return { text: 'text-slate-400', bg: 'bg-slate-500/10' };
}

function normalizeVerdict(raw: string): 'go' | 'conditional_go' | 'wait' | 'avoid' {
  const v = (raw || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (v === 'go') return 'go';
  if (v.includes('conditional') || v === 'cond') return 'conditional_go';
  if (v === 'wait' || v === 'hold') return 'wait';
  if (v === 'avoid' || v === 'stop') return 'avoid';
  return 'wait';
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div className="w-full h-[400px] rounded-xl bg-slate-800/30 border border-slate-700/30 animate-pulse flex items-center justify-center">
      <BarChart3 className="w-8 h-8 text-slate-600" />
    </div>
  );
}

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-slate-700/30" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Pulse Ticker (Top Bar)
// ---------------------------------------------------------------------------

function MarketPulseTicker({ data }: { data: CapitalFlowSummary | null }) {
  if (!data?.globalLiquidity) return null;

  const gl = data.globalLiquidity;
  const bias = safeStr(gl.bias, 'neutral');
  const biasColors = getBiasColor(bias);

  const metrics = [
    {
      label: 'Fed Balance',
      value: gl.fedBalanceSheet?.value ? `$${safeNum(gl.fedBalanceSheet.value).toFixed(1)}T` : '—',
      trend: gl.fedBalanceSheet?.trend,
    },
    {
      label: 'DXY',
      value: gl.dxy?.value ? safeNum(gl.dxy.value).toFixed(1) : '—',
      trend: gl.dxy?.trend,
      change: gl.dxy?.change7d,
    },
    {
      label: 'VIX',
      value: gl.vix?.value ? safeNum(gl.vix.value).toFixed(1) : '—',
      level: gl.vix?.level,
      alert: safeNum(gl.vix?.value) > 25,
    },
    {
      label: 'Yield Curve',
      value: gl.yieldCurve?.spread != null
        ? `${safeNum(gl.yieldCurve.spread ?? gl.yieldCurve.spread10y2y).toFixed(2)}%`
        : '—',
      inverted: gl.yieldCurve?.inverted,
    },
    {
      label: 'M2',
      value: gl.m2?.growth != null ? `${safeNum(gl.m2.growth).toFixed(1)}%` : '—',
    },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm">
      <div className="flex items-center gap-0 overflow-x-auto">
        {/* Bias Badge */}
        <div className={cn(
          'flex-shrink-0 px-3 py-2 border-r border-slate-200 dark:border-slate-700/50',
          biasColors.bg,
        )}>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block leading-none mb-0.5">
            Regime
          </span>
          <span className={cn('text-xs font-bold uppercase', biasColors.text)}>
            {bias.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Metrics */}
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex-shrink-0 px-3 py-2 border-r border-slate-200/50 dark:border-slate-700/30"
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block leading-none mb-0.5">
              {m.label}
            </span>
            <span className={cn(
              'text-xs font-bold tabular-nums',
              m.alert ? 'text-red-500' : m.inverted ? 'text-red-400' : 'text-slate-800 dark:text-white',
            )}>
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left Panel - The Navigation Path
// ---------------------------------------------------------------------------

function NavigationPanel({
  activeView,
  setActiveView,
  capitalFlow,
  analysis,
}: {
  activeView: ViewStep;
  setActiveView: (s: ViewStep) => void;
  capitalFlow: CapitalFlowSummary | null;
  analysis: AnalysisData | null;
}) {
  const analysisSteps: Array<{
    id: ViewStep;
    label: string;
    sublabel: string;
    icon: typeof Globe;
    completed: boolean;
    value?: string;
  }> = [
    {
      id: 'flow',
      label: 'Capital Flow',
      sublabel: 'L1-L2 · Global & Markets',
      icon: Globe,
      completed: !!capitalFlow,
      value: capitalFlow?.liquidityBias
        ? capitalFlow.liquidityBias.replace(/_/g, ' ').toUpperCase()
        : undefined,
    },
    {
      id: 'sector',
      label: 'Sector',
      sublabel: 'L3 · Money Flow',
      icon: Layers,
      completed: !!capitalFlow?.recommendation?.primaryMarket,
      value: capitalFlow?.recommendation?.primaryMarket?.toUpperCase(),
    },
    {
      id: 'asset',
      label: 'Asset',
      sublabel: analysis ? analysis.symbol : 'Selection',
      icon: Target,
      completed: !!analysis,
      value: analysis?.symbol || undefined,
    },
    {
      id: 'plan',
      label: 'Trade Plan',
      sublabel: 'Final Action',
      icon: FileText,
      completed: !!analysis?.step5Result,
      value: analysis?.step7Result
        ? safeStr(
            (analysis.step7Result as Record<string, unknown>).action ||
              (analysis.step7Result as Record<string, unknown>).verdict
          ).toUpperCase() || undefined
        : undefined,
    },
  ];

  const extraViews: Array<{
    id: ViewStep;
    label: string;
    icon: typeof Globe;
    badge?: string;
  }> = [
    { id: 'top-coins', label: 'Top Coins', icon: BarChart3 },
    { id: 'signals', label: 'Signals', icon: Activity },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/80 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Analysis Path
        </h2>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
          Top-down capital flow funnel
        </p>
      </div>

      {/* Analysis Steps */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {analysisSteps.map((step, idx) => {
          const isActive = activeView === step.id;
          const Icon = step.icon;

          return (
            <div key={step.id}>
              {/* Connector line */}
              {idx > 0 && (
                <div className="flex justify-center -my-0.5">
                  <div className={`w-px h-3 ${step.completed ? 'bg-teal-500/50' : 'bg-slate-300 dark:bg-slate-700'}`} />
                </div>
              )}

              <button
                onClick={() => setActiveView(step.id)}
                className={cn(
                  'w-full rounded-lg p-2.5 text-left transition-all duration-200',
                  isActive
                    ? 'bg-teal-500/10 border border-teal-500/30 shadow-sm shadow-teal-500/10'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
                    step.completed ? 'bg-teal-500/20 text-teal-500' :
                    isActive ? 'bg-teal-500/10 text-teal-400' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-400',
                  )}>
                    {step.completed ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'text-xs font-semibold',
                        isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200',
                      )}>
                        {step.label}
                      </span>
                      {step.value && (
                        <span className={cn(
                          'text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded',
                          step.completed ? 'bg-teal-500/15 text-teal-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500',
                        )}>
                          {step.value}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                      {step.sublabel}
                    </p>
                  </div>

                  {isActive && <ChevronRight className="w-3 h-3 text-teal-500 flex-shrink-0" />}
                </div>
              </button>
            </div>
          );
        })}

        {/* Divider */}
        <div className="py-2 px-2">
          <div className="border-t border-slate-200 dark:border-slate-700/50" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-2 mb-1 px-1">
            Explore
          </p>
        </div>

        {/* Extra Views */}
        {extraViews.map((view) => {
          const isActive = activeView === view.id;
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={cn(
                'w-full rounded-lg p-2.5 text-left transition-all duration-200',
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent',
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
                  isActive ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-400',
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={cn(
                  'text-xs font-semibold',
                  isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400',
                )}>
                  {view.label}
                </span>
                {isActive && <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0 ml-auto" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Funnel Stats */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/60">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Funnel Filter
        </p>
        <div className="space-y-1.5">
          {[
            { label: 'Markets', value: '5,000+', icon: Globe },
            { label: 'Sectors', value: String(capitalFlow?.markets?.length || 4), icon: Layers },
            { label: 'Selected', value: analysis ? '1' : '0', icon: Target },
            { label: 'Plan', value: analysis?.step5Result ? '1' : '0', icon: FileText },
          ].map((stat, idx) => {
            const FIcon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2">
                <FIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex-1">{stat.label}</span>
                {idx > 0 && <div className="flex-1 border-b border-dashed border-slate-300 dark:border-slate-700" />}
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">{stat.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Content: Capital Flow Overview (Compact)
// ---------------------------------------------------------------------------

function FlowOverviewContent({ data }: { data: CapitalFlowSummary | null }) {
  if (!data) return <SectionSkeleton lines={5} />;

  const gl = data.globalLiquidity;
  const bias = safeStr(data?.liquidityBias, 'neutral');
  const biasColors = getBiasColor(bias);
  const markets = Array.isArray(data.markets) ? data.markets.filter((m) => m && m.market) : [];

  return (
    <div className="space-y-6">
      <SectionHeader icon={Globe} title="Capital Flow Overview" subtitle="L1-L2 — Global liquidity regime & market flows" />

      {/* Liquidity Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Liquidity Bias" value={bias.replace(/_/g, ' ').toUpperCase()} valueClass={biasColors.text} />
        <MetricCard label="DXY" value={gl?.dxy?.value ? safeNum(gl.dxy.value).toFixed(1) : 'N/A'} sub={safeStr(gl?.dxy?.trend)} />
        <MetricCard
          label="VIX"
          value={gl?.vix?.value ? safeNum(gl.vix.value).toFixed(1) : 'N/A'}
          sub={safeStr(gl?.vix?.level)}
          valueClass={safeNum(gl?.vix?.value) > 25 ? 'text-red-400' : safeNum(gl?.vix?.value) > 18 ? 'text-amber-400' : 'text-emerald-400'}
        />
        <MetricCard
          label="Yield Spread"
          value={
            gl?.yieldCurve?.spread10y2y != null
              ? `${safeNum(gl.yieldCurve.spread10y2y).toFixed(2)}%`
              : 'N/A'
          }
          sub={gl?.yieldCurve?.inverted ? 'INVERTED' : 'Normal'}
          valueClass={gl?.yieldCurve?.inverted ? 'text-red-400' : 'text-emerald-400'}
        />
        <MetricCard
          label="M2 Growth"
          value={
            gl?.m2MoneySupply?.yoyGrowth != null ? `${safeNum(gl.m2MoneySupply.yoyGrowth).toFixed(1)}%` : 'N/A'
          }
        />
      </div>

      {/* RAG Insight */}
      {data.insights?.ragLayer1 && <RagInsight text={data.insights.ragLayer1} layer={1} />}
          value={gl?.yieldCurve?.spread != null ? `${safeNum(gl.yieldCurve.spread).toFixed(2)}%` : 'N/A'}
          sub={gl?.yieldCurve?.inverted ? 'INVERTED' : 'Normal'}
          valueClass={gl?.yieldCurve?.inverted ? 'text-red-400' : 'text-emerald-400'}
        />
        <MetricCard label="M2 Growth" value={gl?.m2?.growth != null ? `${safeNum(gl.m2.growth).toFixed(1)}%` : 'N/A'} />
      </div>

      {data.ragLayer1 && <RagInsight text={data.ragLayer1} layer={1} />}

      {/* Market Flows — Compact Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Market Flows</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {markets.map((m) => {
            const phase = safeStr(m.phase, 'mid');
            const pc = getPhaseColor(phase);
            return (
              <div key={m.market} className={cn('rounded-xl border p-3.5 transition-all hover:shadow-md', pc.border, pc.bg)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">{safeStr(m.market)}</span>
                  <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full', pc.bg, pc.text, 'border', pc.border)}>{phase}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">7D</p>
                    <p className={cn('text-sm font-bold tabular-nums', safeNum(m.flow7d) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {safeNum(m.flow7d) >= 0 ? '+' : ''}{safeNum(m.flow7d).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">30D</p>
                    <p className={cn('text-sm font-bold tabular-nums', safeNum(m.flow30d) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {safeNum(m.flow30d) >= 0 ? '+' : ''}{safeNum(m.flow30d).toFixed(1)}%
                    </p>
                  </div>
                </div>
                {m.rotationSignal && (
                  <div className="mt-2 pt-2 border-t border-slate-200/20 dark:border-slate-700/30">
                    <span className="text-[10px] text-slate-400">
                      Rotation: <span className="font-semibold text-slate-300">{safeStr(m.rotationSignal)}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.insights?.ragLayer2 && <RagInsight text={data.insights.ragLayer2} layer={2} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content: Sector Activity
// ---------------------------------------------------------------------------

function SectorContent({ data }: { data: CapitalFlowSummary | null }) {
  if (!data) return <SectionSkeleton lines={4} />;

  const rec = data.recommendation;
  const primaryMarket = safeStr(rec?.primaryMarket, 'crypto');
  const sectors = Array.isArray(rec?.sectors) ? rec!.sectors : [];
  const sell = data.sellRecommendation;

  return (
    <div className="space-y-6">
      <SectionHeader icon={Layers} title="Sector Activity" subtitle="L3 — Where is the money flowing?" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rec && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/15"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">BUY Opportunity</h3>
              {rec.confidence && (
                <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {safeNum(rec.confidence)}% conf.
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">Market</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">{primaryMarket}</span>
                {rec.phase && (
                  <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full', getPhaseColor(rec.phase).bg, getPhaseColor(rec.phase).text)}>
                    {rec.phase}
                  </span>
                )}
              </div>
              {rec.reason && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rec.reason}</p>}
              {sectors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sectors.map((s) => (
                    <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{s}</span>
                  ))}
                </div>
              )}
              {Array.isArray(rec.suggestedAssets) && rec.suggestedAssets.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-500/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
                    Suggested Assets
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {rec.suggestedAssets.map((a) => (
                      <a
                        key={a.symbol}
                        href={`/analyze?market=${primaryMarket}&symbol=${a.symbol}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        {a.symbol}
                        {a.riskLevel && (
                          <span className={`w-1.5 h-1.5 rounded-full ${a.riskLevel === 'low' ? 'bg-green-400' : a.riskLevel === 'medium' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {sell && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-red-500/15"><TrendingDown className="w-4 h-4 text-red-400" /></div>
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400">SELL / Short Opportunity</h3>
              {sell.confidence && (
                <span className="ml-auto text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  {safeNum(sell.confidence)}% conf.
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">Market</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">
                  {safeStr(sell.primaryMarket)}
                </span>
              </div>
              {sell.reason && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {sell.reason}
                </p>
              )}
              {Array.isArray(sell.sectors) && sell.sectors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sell.sectors.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(sell.suggestedAssets) && sell.suggestedAssets.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-500/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
                    Suggested Assets
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {sell.suggestedAssets.map((a) => (
                      <a
                        key={a.symbol}
                        href={`/analyze?market=${safeStr(sell.primaryMarket)}&symbol=${a.symbol}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        {a.symbol}
                      </a>
                    ))}
                  </div>
                </div>
              )}
                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">{safeStr(sell.market)}</span>
              </div>
              {sell.reason && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{sell.reason}</p>}
            </div>
          </div>
        )}
      </div>

      {data.insights?.ragLayer3 && <RagInsight text={data.insights.ragLayer3} layer={3} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content: Asset Analysis
// ---------------------------------------------------------------------------

function AssetContent({ analysis }: { analysis: AnalysisData | null }) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Target className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Asset Selected</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Go to the <a href="/analyze" className="text-teal-500 hover:underline">Analyze</a> page to run an analysis.
        </p>
      </div>
    );
  }

  const s1 = (analysis.step1Result || {}) as any;
  const s2 = (analysis.step2Result || {}) as any;
  const s3 = (analysis.step3Result || {}) as any;
  const s4 = (analysis.step4Result || {}) as any;

  const steps = [
    { num: 1, name: 'Market Pulse', score: safeNum(s1?.gate?.confidence ?? s1?.score), summary: safeStr(s1?.gate?.reason ?? s1?.summary), icon: Activity },
    { num: 2, name: 'Asset Scanner', score: safeNum(s2?.gate?.confidence ?? s2?.score), summary: safeStr(s2?.gate?.reason ?? s2?.summary), icon: Target },
    { num: 3, name: 'Technical', score: safeNum(s3?.gate?.confidence ?? s3?.score), summary: safeStr(s3?.gate?.reason ?? s3?.summary), icon: BarChart3 },
    { num: 4, name: 'Safety & Timing', score: safeNum(s4?.gate?.confidence ?? s4?.score), summary: safeStr(s4?.gate?.reason ?? s4?.summary), icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader icon={Target} title={`${analysis.symbol} Analysis`} subtitle={`L4 — ${analysis.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step'} · ${analysis.interval}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => {
          const SIcon = step.icon;
          const scoreColor = step.score >= 70 ? 'text-emerald-400' : step.score >= 50 ? 'text-amber-400' : 'text-red-400';
          return (
            <div key={step.num} className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/40 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                  <SIcon className="w-3 h-3 text-slate-500" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{step.name}</span>
              </div>
              <div className={cn('text-xl font-black tabular-nums', scoreColor)}>
                {step.score > 0 ? step.score.toFixed(0) : '--'}
              </div>
              {step.summary && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{step.summary}</p>
              )}
            </div>
          );
        })}
      </div>

      <a href={`/analyze/details/${analysis.id}`} className="inline-flex items-center gap-1.5 text-sm text-teal-500 hover:text-teal-400 font-medium transition-colors">
        View full analysis details <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content: Trade Plan (DEFAULT VIEW)
// ---------------------------------------------------------------------------

function TradePlanContent({ analysis, capitalFlow }: { analysis: AnalysisData | null; capitalFlow: CapitalFlowSummary | null }) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Trade Plan Available</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Run an analysis from the <a href="/analyze" className="text-teal-500 hover:underline">Analyze</a> page to generate a trade plan.
        </p>
      </div>
    );
  }

  const s5 = (analysis.step5Result || {}) as any;
  const s7 = (analysis.step7Result || {}) as any;
  const verdict = normalizeVerdict(safeStr(s7?.action || s7?.verdict));
  const direction = safeStr(s7?.direction || s5?.direction, 'neutral').toLowerCase();
  const isNeutral = direction === 'neutral' || direction === '';
  const score = safeNum(s7?.overallScore ?? analysis.totalScore);
  const tradePlan = s5;
  const entries = Array.isArray(tradePlan?.entries) ? tradePlan.entries : [];
  const stopLoss = tradePlan?.stopLoss;
  const takeProfits = Array.isArray(tradePlan?.takeProfits) ? tradePlan.takeProfits : [];
  const riskReward = safeNum(tradePlan?.riskReward);
  const averageEntry = safeNum(tradePlan?.averageEntry || tradePlan?.entry);
  const currentPrice = safeNum(tradePlan?.currentPrice);
  const entryStatus = safeStr(tradePlan?.entryStatus, 'immediate');
  const ragData = s7?.ragEnrichment || {};

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/40 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/60 dark:to-slate-900/40 overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-teal-500/5 via-transparent to-rose-500/5 border-b border-slate-200 dark:border-slate-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Executive Summary</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {analysis.symbol} &middot; {analysis.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step'} &middot; {analysis.interval} &middot;{' '}
                {new Date(analysis.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <a href={`/analyze/details/${analysis.id}`} className="flex items-center gap-1.5 text-xs text-teal-500 hover:text-teal-400 font-medium">
              Full Report <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex items-center gap-5">
              <VerdictBadge verdict={verdict} size="lg" />
              <div className="flex flex-col items-center">
                {isNeutral ? (
                  <div className="w-14 h-14 rounded-full bg-slate-700/30 flex items-center justify-center border border-slate-600/30">
                    <Minus className="w-7 h-7 text-slate-400" />
                  </div>
                ) : direction === 'long' ? (
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                    <ArrowUp className="w-7 h-7 text-emerald-400" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 shadow-lg shadow-red-500/20">
                    <ArrowDown className="w-7 h-7 text-red-400" strokeWidth={3} />
                  </div>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                  {isNeutral ? 'NEUTRAL' : direction.toUpperCase()}
                </span>
              </div>
              <ScoreGauge score={score * 10} maxScore={100} size="sm" label="Score" />
            </div>

            {averageEntry > 0 && (
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Levels</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <LevelRow label="Entry" value={averageEntry} color="text-blue-400" bgColor="bg-blue-500/10" />
                  {stopLoss && <LevelRow label="Stop Loss" value={safeNum(stopLoss.price || stopLoss)} color="text-red-400" bgColor="bg-red-500/10" />}
                  {takeProfits.slice(0, 2).map((tp: any, i: number) => (
                    <LevelRow key={i} label={`TP${i + 1}`} value={safeNum(tp.price || tp)} color="text-emerald-400" bgColor="bg-emerald-500/10" />
                  ))}
                  {riskReward > 0 && (
                    <div className="flex items-center justify-between py-1 px-2.5">
                      <span className="text-[11px] text-slate-500">R:R</span>
                      <span className={cn('text-sm font-bold tabular-nums', riskReward >= 2 ? 'text-emerald-400' : riskReward >= 1 ? 'text-amber-400' : 'text-red-400')}>
                        1:{riskReward.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                {entryStatus !== 'immediate' && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
                    <Clock className="w-3 h-3" />
                    {entryStatus === 'wait_for_pullback' ? 'Wait for pullback to entry zone' : 'Wait for rally to entry zone'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade Plan Matrix */}
      <TradePlanMatrix analysis={analysis} />

      {/* Chart */}
      {!isNeutral && averageEntry > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-500" /> Price Chart with Trade Plan
            </h3>
          </div>
          <div className="p-0.5 bg-slate-900/80 trade-plan-chart-container">
            <TradePlanChart
              symbol={analysis.symbol}
              direction={direction as 'long' | 'short'}
              entries={entries.length > 0 ? entries : [{ price: averageEntry, percentage: 100 }]}
              stopLoss={{ price: safeNum(stopLoss?.price || stopLoss), percentage: safeNum(stopLoss?.percentage) }}
              takeProfits={takeProfits.map((tp: any, i: number) => ({ price: safeNum(tp.price || tp), percentage: safeNum(tp.percentage), riskReward: safeNum(tp.riskReward || i + 1) }))}
              currentPrice={currentPrice}
              analysisTime={analysis.createdAt}
            />
          </div>
        </div>
      )}

      {/* RAG Features */}
      {ragData.forecastBands && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/30 p-5">
          <ForecastBandOverlay bands={ragData.forecastBands} currentPrice={currentPrice || averageEntry} symbol={analysis.symbol} />
        </div>
      )}

      {ragData.strategies && ragData.strategies.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/30 p-5">
          <MultiStrategyCards strategies={ragData.strategies} recommended={ragData.recommendedStrategy || ragData.strategies[0]?.id} currentPrice={currentPrice || averageEntry} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ragData.validation && <PlanValidationBadge validation={ragData.validation} capitalFlowAligned={ragData.capitalFlowAligned} />}
        {ragData.webResearch && <WebResearchPanel research={ragData.webResearch} />}
      </div>

      {/* Performance Attribution */}
      <PerformanceAttribution analysis={analysis} capitalFlow={capitalFlow} />

      {/* Disclaimer */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/30 p-3">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            This report is generated by AI and is not investment advice. All forecasts are probabilistic scenarios. Always conduct your own research.
          </p>
        </div>
      </div>

      {capitalFlow?.insights?.ragLayer4 && <RagInsight text={capitalFlow.insights.ragLayer4} layer={4} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content: Top Coins (from explore)
// ---------------------------------------------------------------------------

function TopCoinsContent({
  coins,
  loading,
  error,
  onRetry,
}: {
  coins: TopCoin[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const filteredCoins = coins.filter((c) => c.symbol?.toLowerCase().includes(searchQuery.toLowerCase()));

  const verdictColors: Record<string, string> = {
    GO: 'bg-emerald-500',
    CONDITIONAL_GO: 'bg-amber-500',
    WAIT: 'bg-slate-500',
    AVOID: 'bg-red-500',
  };

  return (
    <div className="space-y-5">
      <SectionHeader icon={BarChart3} title="Top Coins" subtitle="Pre-scanned coins ranked by reliability score" />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
          <button onClick={onRetry} className="px-3 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-medium">Retry</button>
        </div>
      )}

      {/* Search + Actions */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search coins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500/50"
          />
        </div>
        <Link href="/analyze" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Zap className="w-3.5 h-3.5" /> New Analysis
        </Link>
      </div>

      {/* Coins */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
      ) : filteredCoins.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCoins.map((coin) => {
            const symbol = coin.symbol?.replace('USDT', '') || coin.symbol;
            return (
              <button
                key={coin.symbol}
                onClick={() => router.push(`/analyze/details/${coin.analysisId}`)}
                className="w-full p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-teal-500/50 transition-all hover:shadow-md text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img src={getCoinIcon(symbol)} alt={symbol} className="w-7 h-7 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }} />
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{symbol}</span>
                      {coin.method && (
                        <span className={cn('ml-1.5 px-1 py-0.5 rounded text-[9px] font-bold', coin.method === 'mlis_pro' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' : 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300')}>
                          {coin.method === 'mlis_pro' ? 'MLIS' : '7-STEP'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold text-white', verdictColors[coin.verdict] || 'bg-slate-500')}>{coin.verdict}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {coin.direction?.toLowerCase() === 'long' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : coin.direction?.toLowerCase() === 'short' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> : <Activity className="w-3.5 h-3.5 text-slate-500" />}
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{coin.direction || 'Neutral'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-white font-bold">{(coin.totalScore || 0).toFixed(1)}/10</span>
                    {coin.change24h !== undefined && (
                      <span className={cn('text-[10px] font-medium', coin.change24h >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                        {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-center">
          <BarChart3 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">{searchQuery ? 'No coins match' : 'No Data Yet'}</h3>
          <p className="text-sm text-slate-500 mb-4">{searchQuery ? 'Try a different search term.' : 'Run a scan or start an analysis.'}</p>
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} className="text-sm text-teal-500 hover:underline">Clear Search</button>
          ) : (
            <Link href="/analyze" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:opacity-90">
              <Zap className="w-3.5 h-3.5" /> Start Analysis
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content: Signals (from explore)
// ---------------------------------------------------------------------------

function SignalsContent({ coins }: { coins: TopCoin[] }) {
  return (
    <div className="space-y-5">
      <SectionHeader icon={Activity} title="Signals" subtitle="Proactive trading signals and latest analysis results" />

      <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-500" /> Signal Service
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Get proactive trading signals delivered to Telegram and Discord</p>
        <Link href="/signals" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium hover:opacity-90">
          <Activity className="w-3.5 h-3.5" /> View Signals
        </Link>
      </div>

      {coins.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Latest Analysis Results</h3>
          <div className="space-y-1.5">
            {coins.slice(0, 10).map((coin) => (
              <Link
                key={coin.symbol}
                href={`/analyze/details/${coin.analysisId}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-violet-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <img src={getCoinIcon(coin.symbol?.replace('USDT', '') || coin.symbol)} alt={coin.symbol} className="w-7 h-7 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }} />
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{coin.symbol?.replace('USDT', '')}</span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={cn('px-1.5 py-0.5 rounded font-bold text-white', coin.verdict === 'GO' ? 'bg-emerald-500' : coin.verdict === 'CONDITIONAL_GO' ? 'bg-amber-500' : 'bg-slate-500')}>{coin.verdict}</span>
                      <span className="text-slate-500 capitalize">{coin.direction}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{(coin.totalScore || 0).toFixed(1)}/10</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trade Plan Matrix (Professional Table)
// ---------------------------------------------------------------------------

function TradePlanMatrix({ analysis }: { analysis: AnalysisData }) {
  const plan = (analysis.step5Result || {}) as any;
  if (!plan || !plan.averageEntry) return null;

  const direction = safeStr(plan.direction, 'long').toUpperCase();
  const stopLoss = plan.stopLoss;
  const takeProfits = Array.isArray(plan.takeProfits) ? plan.takeProfits : [];

  const rows: Array<{ param: string; value: string; note: string; color?: string }> = [
    { param: 'Strategy', value: `${direction} ${analysis.interval}`, note: analysis.method === 'mlis_pro' ? 'MLIS Pro Analysis' : '7-Step Classic Analysis' },
    { param: 'Entry Zone', value: `$${formatPrice(safeNum(plan.averageEntry))}`, note: plan.entryStatus === 'wait_for_pullback' ? 'Wait for pullback' : plan.entryStatus === 'wait_for_rally' ? 'Wait for rally' : 'Limit order zone', color: 'text-blue-400' },
    { param: 'Stop-Loss', value: `$${formatPrice(safeNum(stopLoss?.price || stopLoss))}`, note: safeStr(stopLoss?.reason, 'Below support / Above resistance'), color: 'text-red-400' },
  ];

  takeProfits.forEach((tp: any, i: number) => {
    rows.push({ param: `Target ${i + 1}`, value: `$${formatPrice(safeNum(tp.price || tp))}`, note: `${safeNum(tp.percentage || (i === 0 ? 60 : 40))}% position close`, color: 'text-emerald-400' });
  });

  if (plan.riskReward) {
    rows.push({ param: 'Risk / Reward', value: `1 : ${safeNum(plan.riskReward).toFixed(1)}`, note: safeNum(plan.riskReward) >= 2 ? 'Meets institutional standards' : 'Below 2:1 threshold', color: safeNum(plan.riskReward) >= 2 ? 'text-emerald-400' : 'text-amber-400' });
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-teal-500" /> Structured Trade Plan
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700/30 bg-slate-50/50 dark:bg-slate-800/30">
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Parameter</th>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Level / Value</th>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/20 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{row.param}</td>
                <td className={cn('px-4 py-2.5 font-bold tabular-nums', row.color || 'text-slate-800 dark:text-white')}>{row.value}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance Attribution
// ---------------------------------------------------------------------------

function PerformanceAttribution({ analysis, capitalFlow }: { analysis: AnalysisData | null; capitalFlow: CapitalFlowSummary | null }) {
  if (!analysis) return null;

  const s7 = (analysis.step7Result || {}) as any;
  const overallScore = safeNum(s7?.overallScore ?? analysis?.totalScore) * 10;

  const layers = [
    {
      name: 'Capital Flow',
      score: capitalFlow?.recommendation?.confidence ?? 65,
      status: safeNum(capitalFlow?.recommendation?.confidence) > 70 ? 'High Alpha' : safeNum(capitalFlow?.recommendation?.confidence) > 50 ? 'Aligned' : 'Neutral',
      statusColor: safeNum(capitalFlow?.recommendation?.confidence) > 70 ? 'text-emerald-400' : safeNum(capitalFlow?.recommendation?.confidence) > 50 ? 'text-blue-400' : 'text-slate-400',
    },
    {
      name: 'Sector Rotation',
      score: capitalFlow?.markets?.length ? Math.min(90, capitalFlow.markets.reduce((s, m) => s + Math.abs(safeNum(m.flow7d)), 0) * 5) : 50,
      status: capitalFlow?.recommendation?.sectors?.length ? 'Outperforming' : 'Neutral',
      statusColor: capitalFlow?.recommendation?.sectors?.length ? 'text-emerald-400' : 'text-amber-400',
    },
    {
      name: '7-Step Timing',
      score: overallScore,
      status: overallScore >= 70 ? 'High Conviction' : overallScore >= 50 ? 'Neutral' : 'Weak',
      statusColor: overallScore >= 70 ? 'text-emerald-400' : overallScore >= 50 ? 'text-amber-400' : 'text-red-400',
    },
    {
      name: analysis.method === 'mlis_pro' ? 'MLIS Pro' : 'ML Confirmation',
      score: analysis.method === 'mlis_pro' ? Math.min(95, overallScore + 10) : overallScore,
      status: analysis.method === 'mlis_pro' ? (overallScore >= 60 ? 'Elite Filter' : 'Active') : (overallScore >= 60 ? 'Confirmed' : 'Unconfirmed'),
      statusColor: overallScore >= 60 ? 'text-emerald-400' : 'text-amber-400',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" /> Performance Attribution
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Which layer contributed to this signal?</p>
      </div>
      <div className="p-4">
        <div className="space-y-2.5">
          {layers.map((layer) => {
            const barColor = layer.score >= 70 ? 'bg-emerald-500' : layer.score >= 50 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={layer.name} className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 w-24 flex-shrink-0">{layer.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${Math.min(100, Math.max(0, layer.score))}%` }} />
                </div>
                <span className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300 w-8 text-right">{Math.round(layer.score)}%</span>
                <span className={cn('text-[10px] font-bold w-20 text-right', layer.statusColor)}>{layer.status}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/30">
          Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI Components
// ---------------------------------------------------------------------------

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Globe; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/10 border border-teal-500/20">
        <Icon className="w-4 h-4 text-teal-500" />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/40 p-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={cn('text-sm font-bold tabular-nums', valueClass || 'text-slate-800 dark:text-white')}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 uppercase">{sub}</p>}
    </div>
  );
}

function LevelRow({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  return (
    <div className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-lg', bgColor)}>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className={cn('text-sm font-bold tabular-nums', color)}>${formatPrice(value)}</span>
    </div>
  );
}

function RagInsight({ text, layer }: { text: string; layer: number }) {
  return (
    <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <Eye className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">L{layer} Insight</span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">{text}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function IntelligenceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');
  const initialView = (searchParams.get('view') as ViewStep) || 'plan';

  const [activeView, setActiveView] = useState<ViewStep>(initialView);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [topCoins, setTopCoins] = useState<TopCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coinsError, setCoinsError] = useState<string | null>(null);
  const [coinsLoading, setCoinsLoading] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const promises: Promise<any>[] = [
        authFetch('/api/capital-flow/summary').then((r) => r.json()).catch(() => null),
        authFetch('/api/analysis/top-coins?limit=20').then((r) => r.json()).catch(() => null),
      ];

      if (analysisId) {
        promises.push(authFetch(`/api/analysis/${analysisId}`).then((r) => r.json()).catch(() => null));
      } else {
        promises.push(authFetch('/api/analysis/recent?limit=1').then((r) => r.json()).catch(() => null));
      }

      const [cfRes, coinsRes, analysisRes] = await Promise.allSettled(promises);

      if (cfRes.status === 'fulfilled' && cfRes.value) {
        const cfData = cfRes.value.data || cfRes.value;
        setCapitalFlow(cfData);
      }

      if (coinsRes.status === 'fulfilled' && coinsRes.value) {
        if (coinsRes.value.success) {
          setTopCoins(coinsRes.value.data?.coins || []);
        } else {
          setCoinsError(coinsRes.value.error || 'Failed to load coins');
        }
      }

      if (analysisRes.status === 'fulfilled' && analysisRes.value) {
        const aData = analysisRes.value.data || analysisRes.value;
        if (Array.isArray(aData)) {
          if (aData.length > 0) setAnalysis(aData[0]);
        } else if (aData && aData.id) {
          setAnalysis(aData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Breadcrumb
  const breadcrumb = [
    capitalFlow?.liquidityBias
      ? capitalFlow.liquidityBias.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
      : 'Market',
    capitalFlow?.recommendation?.primaryMarket
      ? capitalFlow.recommendation.primaryMarket.charAt(0).toUpperCase() +
        capitalFlow.recommendation.primaryMarket.slice(1)
      : 'Sector',
    analysis?.symbol || 'Asset',
    analysis?.step7Result
      ? safeStr(
          (analysis.step7Result as any)?.action || (analysis.step7Result as any)?.verdict,
          'Plan'
        ).toUpperCase()
      : 'Plan',
    { label: capitalFlow?.globalLiquidity?.bias ? capitalFlow.globalLiquidity.bias.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Market', step: 'flow' as ViewStep },
    { label: capitalFlow?.recommendation?.primaryMarket ? capitalFlow.recommendation.primaryMarket.charAt(0).toUpperCase() + capitalFlow.recommendation.primaryMarket.slice(1) : 'Sector', step: 'sector' as ViewStep },
    { label: analysis?.symbol || 'Asset', step: 'asset' as ViewStep },
    { label: analysis?.step7Result ? safeStr((analysis.step7Result as any)?.action || (analysis.step7Result as any)?.verdict, 'Plan').toUpperCase() : 'Plan', step: 'plan' as ViewStep },
  ];

  const isAnalysisView = ['flow', 'sector', 'asset', 'plan'].includes(activeView);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Market Pulse Ticker */}
      <MarketPulseTicker data={capitalFlow} />

      {/* Breadcrumb (only for analysis path views) */}
      {isAnalysisView && (
        <div className="px-5 py-2 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/80 flex items-center gap-1.5">
          {breadcrumb.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
              <button
                onClick={() => setActiveView(crumb.step)}
                className={cn(
                  'text-xs font-medium transition-colors',
                  crumb.step === activeView ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="hidden lg:block">
          <NavigationPanel activeView={activeView} setActiveView={setActiveView} capitalFlow={capitalFlow} analysis={analysis} />
        </div>

        {/* Mobile step selector */}
        <div className="lg:hidden sticky top-0 z-10 px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { id: 'flow' as ViewStep, label: 'Flow' },
              { id: 'sector' as ViewStep, label: 'Sector' },
              { id: 'asset' as ViewStep, label: 'Asset' },
              { id: 'plan' as ViewStep, label: 'Plan' },
              { id: 'top-coins' as ViewStep, label: 'Coins' },
              { id: 'signals' as ViewStep, label: 'Signals' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveView(s.id)}
                className={cn(
                  'flex-shrink-0 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all',
                  activeView === s.id ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Content Stage */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-5 py-5 lg:py-6">
            {loading ? (
              <div className="space-y-6">
                <SectionSkeleton lines={3} />
                <ChartSkeleton />
                <SectionSkeleton lines={4} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Failed to Load</h3>
                <p className="text-sm text-slate-500 mb-4">{error}</p>
                <button onClick={() => fetchData()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium">
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            ) : (
              <>
                {activeView === 'flow' && <FlowOverviewContent data={capitalFlow} />}
                {activeView === 'sector' && <SectorContent data={capitalFlow} />}
                {activeView === 'asset' && <AssetContent analysis={analysis} />}
                {activeView === 'plan' && <TradePlanContent analysis={analysis} capitalFlow={capitalFlow} />}
                {activeView === 'top-coins' && <TopCoinsContent coins={topCoins} loading={coinsLoading} error={coinsError} onRetry={fetchData} />}
                {activeView === 'signals' && <SignalsContent coins={topCoins} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
