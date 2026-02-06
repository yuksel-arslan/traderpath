'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Star,
} from 'lucide-react';
import { authFetch } from '../../../lib/api';
import { ForecastBandOverlay } from '../../../components/analysis/ForecastBandOverlay';
import { MultiStrategyCards } from '../../../components/analysis/MultiStrategyCards';
import { WebResearchPanel } from '../../../components/analysis/WebResearchPanel';
import { PlanValidationBadge } from '../../../components/analysis/PlanValidationBadge';
import {
  TradeDecisionVisual,
  VerdictBadge,
  ScoreGauge,
} from '../../../components/analysis/TradeDecisionVisual';
import { THEME } from '../../../lib/theme-config';

// Lazy load TradePlanChart (uses lightweight-charts which is browser-only)
const TradePlanChart = dynamic(
  () =>
    import('../../../components/analysis/TradePlanChart').then((mod) => ({
      default: mod.default,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapitalFlowSummary {
  globalLiquidity?: {
    bias?: string;
    fedBalanceSheet?: { value?: number; trend?: string };
    m2?: { growth?: number };
    dxy?: { value?: number; trend?: string };
    vix?: { value?: number; level?: string };
    yieldCurve?: { spread?: number; inverted?: boolean };
  };
  markets?: Array<{
    market?: string;
    flow7d?: number;
    flow30d?: number;
    flowVelocity?: number;
    phase?: string;
    rotationSignal?: string;
    value?: number;
  }>;
  recommendation?: {
    primaryMarket?: string;
    action?: string;
    direction?: string;
    confidence?: number;
    reason?: string;
    phase?: string;
    sectors?: string[];
  };
  sellRecommendation?: {
    market?: string;
    direction?: string;
    reason?: string;
    confidence?: number;
  };
  ragLayer1?: string;
  ragLayer2?: string;
  ragLayer3?: string;
  ragLayer4?: string;
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

type FunnelStep = 1 | 2 | 3 | 4;

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
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  if (price >= 100)
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function getPhaseColor(phase: string) {
  const p = (phase || '').toLowerCase();
  if (p === 'early')
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (p === 'mid')
    return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
  if (p === 'late')
    return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  if (p === 'exit')
    return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
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
        <div
          key={i}
          className="h-4 rounded bg-slate-700/30"
          style={{ width: `${80 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left Panel - The Logic Path
// ---------------------------------------------------------------------------

function LogicPathPanel({
  activeStep,
  setActiveStep,
  capitalFlow,
  analysis,
}: {
  activeStep: FunnelStep;
  setActiveStep: (s: FunnelStep) => void;
  capitalFlow: CapitalFlowSummary | null;
  analysis: AnalysisData | null;
}) {
  const steps: Array<{
    id: FunnelStep;
    label: string;
    sublabel: string;
    icon: typeof Globe;
    completed: boolean;
    value?: string;
  }> = [
    {
      id: 1,
      label: 'Capital Flow',
      sublabel: 'Global Regime',
      icon: Globe,
      completed: !!capitalFlow,
      value: capitalFlow?.globalLiquidity?.bias
        ? capitalFlow.globalLiquidity.bias.replace(/_/g, ' ').toUpperCase()
        : undefined,
    },
    {
      id: 2,
      label: 'Sector',
      sublabel: 'Money Flow',
      icon: Layers,
      completed: !!capitalFlow?.recommendation?.primaryMarket,
      value: capitalFlow?.recommendation?.primaryMarket
        ? capitalFlow.recommendation.primaryMarket.toUpperCase()
        : undefined,
    },
    {
      id: 3,
      label: 'Asset',
      sublabel: analysis ? analysis.symbol : 'Selection',
      icon: Target,
      completed: !!analysis,
      value: analysis?.symbol || undefined,
    },
    {
      id: 4,
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

  // Funnel stats
  const funnelStats = [
    { label: 'Markets', value: '5,000+', icon: Globe },
    { label: 'Sectors', value: String(capitalFlow?.markets?.length || 4), icon: Layers },
    { label: 'Selected', value: analysis ? '1' : '0', icon: Target },
    { label: 'Plan', value: analysis?.step5Result ? '1' : '0', icon: FileText },
  ];

  return (
    <aside className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/80 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Analysis Path
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Top-down capital flow funnel
        </p>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {steps.map((step, idx) => {
          const isActive = activeStep === step.id;
          const Icon = step.icon;

          return (
            <div key={step.id}>
              {/* Connector line */}
              {idx > 0 && (
                <div className="flex justify-center -my-0.5">
                  <div
                    className={`w-px h-4 ${
                      step.completed
                        ? 'bg-teal-500/50'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </div>
              )}

              <button
                onClick={() => setActiveStep(step.id)}
                className={`
                  w-full rounded-xl p-3 text-left transition-all duration-200
                  ${
                    isActive
                      ? 'bg-teal-500/10 dark:bg-teal-500/10 border border-teal-500/30 shadow-sm shadow-teal-500/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Step indicator */}
                  <div
                    className={`
                      flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                      ${
                        step.completed
                          ? 'bg-teal-500/20 text-teal-500'
                          : isActive
                          ? 'bg-teal-500/10 text-teal-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }
                    `}
                  >
                    {step.completed ? (
                      <Check className="w-4.5 h-4.5" />
                    ) : (
                      <Icon className="w-4.5 h-4.5" />
                    )}
                  </div>

                  {/* Labels */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isActive
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {step.label}
                      </span>
                      {step.value && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            step.completed
                              ? 'bg-teal-500/15 text-teal-500'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}
                        >
                          {step.value}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {step.sublabel}
                    </p>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Funnel Stats */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/60">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Funnel Filter
        </p>
        <div className="space-y-2">
          {funnelStats.map((stat, idx) => {
            const FIcon = stat.icon;
            const isFiltered = idx > 0;
            return (
              <div key={stat.label} className="flex items-center gap-2.5">
                <FIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </span>
                  {isFiltered && (
                    <div className="flex-1 border-b border-dashed border-slate-300 dark:border-slate-700" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {stat.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Right Panel Content: Step 1 - Capital Flow
// ---------------------------------------------------------------------------

function CapitalFlowContent({ data }: { data: CapitalFlowSummary | null }) {
  if (!data) return <SectionSkeleton lines={5} />;

  const gl = data.globalLiquidity;
  const bias = safeStr(gl?.bias, 'neutral');
  const biasColors = getBiasColor(bias);
  const markets = Array.isArray(data.markets) ? data.markets.filter((m) => m && m.market) : [];

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <SectionHeader
        icon={Globe}
        title="Global Capital Flow"
        subtitle="Layer 1 — Macro liquidity regime and market flows"
      />

      {/* Global Liquidity Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Liquidity Bias"
          value={bias.replace(/_/g, ' ').toUpperCase()}
          valueClass={biasColors.text}
        />
        <MetricCard
          label="DXY"
          value={gl?.dxy?.value ? safeNum(gl.dxy.value).toFixed(1) : 'N/A'}
          sub={safeStr(gl?.dxy?.trend, '')}
        />
        <MetricCard
          label="VIX"
          value={gl?.vix?.value ? safeNum(gl.vix.value).toFixed(1) : 'N/A'}
          sub={safeStr(gl?.vix?.level, '')}
          valueClass={
            safeNum(gl?.vix?.value) > 25
              ? 'text-red-400'
              : safeNum(gl?.vix?.value) > 18
              ? 'text-amber-400'
              : 'text-emerald-400'
          }
        />
        <MetricCard
          label="Yield Spread"
          value={
            gl?.yieldCurve?.spread != null
              ? `${safeNum(gl.yieldCurve.spread).toFixed(2)}%`
              : 'N/A'
          }
          sub={gl?.yieldCurve?.inverted ? 'INVERTED' : 'Normal'}
          valueClass={gl?.yieldCurve?.inverted ? 'text-red-400' : 'text-emerald-400'}
        />
        <MetricCard
          label="M2 Growth"
          value={
            gl?.m2?.growth != null ? `${safeNum(gl.m2.growth).toFixed(1)}%` : 'N/A'
          }
        />
      </div>

      {/* RAG Insight */}
      {data.ragLayer1 && <RagInsight text={data.ragLayer1} layer={1} />}

      {/* Market Flows */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
          Market Flows
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {markets.map((m) => {
            const phase = safeStr(m.phase, 'mid');
            const phaseColors = getPhaseColor(phase);
            return (
              <div
                key={m.market}
                className={`
                  rounded-xl border ${phaseColors.border} ${phaseColors.bg}
                  p-4 transition-all hover:shadow-md
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">
                    {safeStr(m.market)}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${phaseColors.bg} ${phaseColors.text} border ${phaseColors.border}`}
                  >
                    {phase}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">7D Flow</p>
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        safeNum(m.flow7d) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {safeNum(m.flow7d) >= 0 ? '+' : ''}
                      {safeNum(m.flow7d).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">30D Flow</p>
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        safeNum(m.flow30d) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {safeNum(m.flow30d) >= 0 ? '+' : ''}
                      {safeNum(m.flow30d).toFixed(1)}%
                    </p>
                  </div>
                </div>
                {m.rotationSignal && (
                  <div className="mt-2 pt-2 border-t border-slate-200/20 dark:border-slate-700/30">
                    <span className="text-[10px] text-slate-400">
                      Rotation:{' '}
                      <span className="font-semibold text-slate-300">
                        {safeStr(m.rotationSignal)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.ragLayer2 && <RagInsight text={data.ragLayer2} layer={2} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Panel Content: Step 2 - Sector
// ---------------------------------------------------------------------------

function SectorContent({ data }: { data: CapitalFlowSummary | null }) {
  if (!data) return <SectionSkeleton lines={4} />;

  const rec = data.recommendation;
  const primaryMarket = safeStr(rec?.primaryMarket, 'crypto');
  const sectors = Array.isArray(rec?.sectors) ? rec!.sectors : [];
  const sell = data.sellRecommendation;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Layers}
        title="Sector Activity"
        subtitle="Layer 2-3 — Where is the money flowing?"
      />

      {/* Recommendation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BUY Opportunity */}
        {rec && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/15">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                BUY Opportunity
              </h3>
              {rec.confidence && (
                <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {safeNum(rec.confidence)}% conf.
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">Market</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">
                  {primaryMarket}
                </span>
                {rec.phase && (
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${getPhaseColor(rec.phase).bg} ${getPhaseColor(rec.phase).text}`}
                  >
                    {rec.phase}
                  </span>
                )}
              </div>
              {rec.reason && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rec.reason}
                </p>
              )}
              {sectors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sectors.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SELL Opportunity */}
        {sell && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 dark:bg-red-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-red-500/15">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                SELL / Short Opportunity
              </h3>
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
                  {safeStr(sell.market)}
                </span>
              </div>
              {sell.reason && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {sell.reason}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {data.ragLayer3 && <RagInsight text={data.ragLayer3} layer={3} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Panel Content: Step 3 - Asset Analysis
// ---------------------------------------------------------------------------

function AssetContent({ analysis }: { analysis: AnalysisData | null }) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Target className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
          No Asset Selected
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Go to the{' '}
          <a href="/analyze" className="text-teal-500 hover:underline">
            Analyze
          </a>{' '}
          page to run an analysis, then view it here in the intelligence dashboard.
        </p>
      </div>
    );
  }

  const s1 = (analysis.step1Result || {}) as Record<string, unknown>;
  const s2 = (analysis.step2Result || {}) as Record<string, unknown>;
  const s3 = (analysis.step3Result || {}) as Record<string, unknown>;
  const s4 = (analysis.step4Result || {}) as Record<string, unknown>;

  const steps = [
    {
      num: 1,
      name: 'Market Pulse',
      score: safeNum((s1 as any)?.gate?.confidence ?? (s1 as any)?.score),
      summary: safeStr((s1 as any)?.gate?.reason ?? (s1 as any)?.summary),
      icon: Activity,
    },
    {
      num: 2,
      name: 'Asset Scanner',
      score: safeNum((s2 as any)?.gate?.confidence ?? (s2 as any)?.score),
      summary: safeStr((s2 as any)?.gate?.reason ?? (s2 as any)?.summary),
      icon: Target,
    },
    {
      num: 3,
      name: 'Technical Analysis',
      score: safeNum((s3 as any)?.gate?.confidence ?? (s3 as any)?.score),
      summary: safeStr((s3 as any)?.gate?.reason ?? (s3 as any)?.summary),
      icon: BarChart3,
    },
    {
      num: 4,
      name: 'Safety & Timing',
      score: safeNum((s4 as any)?.gate?.confidence ?? (s4 as any)?.score),
      summary: safeStr((s4 as any)?.gate?.reason ?? (s4 as any)?.summary),
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Target}
        title={`${analysis.symbol} Analysis`}
        subtitle={`Layer 4 — ${analysis.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step'} · ${analysis.interval}`}
      />

      {/* Step Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => {
          const SIcon = step.icon;
          const scoreColor =
            step.score >= 70
              ? 'text-emerald-400'
              : step.score >= 50
              ? 'text-amber-400'
              : 'text-red-400';
          return (
            <div
              key={step.num}
              className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/40 p-3.5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                  <SIcon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {step.name}
                </span>
              </div>
              <div className={`text-2xl font-black tabular-nums ${scoreColor}`}>
                {step.score > 0 ? step.score.toFixed(0) : '--'}
              </div>
              {step.summary && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {step.summary}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Link to full details */}
      <a
        href={`/analyze/details/${analysis.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-teal-500 hover:text-teal-400 font-medium transition-colors"
      >
        View full analysis details
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Panel Content: Step 4 - Trade Plan (DEFAULT VIEW)
// ---------------------------------------------------------------------------

function TradePlanContent({
  analysis,
  capitalFlow,
}: {
  analysis: AnalysisData | null;
  capitalFlow: CapitalFlowSummary | null;
}) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
          No Trade Plan Available
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Run an analysis from the{' '}
          <a href="/analyze" className="text-teal-500 hover:underline">
            Analyze
          </a>{' '}
          page to generate a trade plan.
        </p>
      </div>
    );
  }

  const s5 = (analysis.step5Result || {}) as Record<string, unknown>;
  const s7 = (analysis.step7Result || {}) as Record<string, unknown>;
  const verdict = normalizeVerdict(
    safeStr((s7 as any)?.action || (s7 as any)?.verdict)
  );
  const direction = safeStr(
    (s7 as any)?.direction || (s5 as any)?.direction,
    'neutral'
  ).toLowerCase();
  const isNeutral = direction === 'neutral' || direction === '';
  const score = safeNum(
    (s7 as any)?.overallScore ?? analysis.totalScore
  );
  const overallConfidence = safeNum((s7 as any)?.overallConfidence);

  // Trade plan details
  const tradePlan = s5 as any;
  const entries = Array.isArray(tradePlan?.entries) ? tradePlan.entries : [];
  const stopLoss = tradePlan?.stopLoss;
  const takeProfits = Array.isArray(tradePlan?.takeProfits) ? tradePlan.takeProfits : [];
  const riskReward = safeNum(tradePlan?.riskReward);
  const averageEntry = safeNum(tradePlan?.averageEntry || tradePlan?.entry);
  const currentPrice = safeNum(tradePlan?.currentPrice);
  const entryStatus = safeStr(tradePlan?.entryStatus, 'immediate');

  // RAG data
  const ragData = (s7 as any)?.ragEnrichment || {};

  return (
    <div className="space-y-8">
      {/* Executive Summary */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/40 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/60 dark:to-slate-900/40 overflow-hidden">
        {/* Header bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-500/5 via-transparent to-rose-500/5 border-b border-slate-200 dark:border-slate-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Executive Summary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {analysis.symbol} &middot;{' '}
                {analysis.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step'}{' '}
                &middot; {analysis.interval} &middot;{' '}
                {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <a
              href={`/analyze/details/${analysis.id}`}
              className="flex items-center gap-1.5 text-xs text-teal-500 hover:text-teal-400 font-medium"
            >
              Full Report
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Decision Visual */}
        <div className="px-6 py-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Verdict + Direction + Score */}
            <div className="flex items-center gap-6">
              <VerdictBadge verdict={verdict} size="lg" />
              <div className="flex flex-col items-center">
                {isNeutral ? (
                  <div className="w-16 h-16 rounded-full bg-slate-700/30 flex items-center justify-center border border-slate-600/30">
                    <Minus className="w-8 h-8 text-slate-400" />
                  </div>
                ) : direction === 'long' ? (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                    <ArrowUp className="w-8 h-8 text-emerald-400" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30 shadow-lg shadow-red-500/20">
                    <ArrowDown className="w-8 h-8 text-red-400" strokeWidth={3} />
                  </div>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1.5">
                  {isNeutral ? 'NEUTRAL' : direction.toUpperCase()}
                </span>
              </div>
              <ScoreGauge score={score * 10} maxScore={100} size="sm" label="Score" />
            </div>

            {/* Key Levels Table */}
            {averageEntry > 0 && (
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Key Levels
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <LevelRow
                    label="Entry"
                    value={averageEntry}
                    color="text-blue-400"
                    bgColor="bg-blue-500/10"
                  />
                  {stopLoss && (
                    <LevelRow
                      label="Stop Loss"
                      value={safeNum(stopLoss.price || stopLoss)}
                      color="text-red-400"
                      bgColor="bg-red-500/10"
                    />
                  )}
                  {takeProfits.slice(0, 2).map((tp: any, i: number) => (
                    <LevelRow
                      key={i}
                      label={`TP${i + 1}`}
                      value={safeNum(tp.price || tp)}
                      color="text-emerald-400"
                      bgColor="bg-emerald-500/10"
                    />
                  ))}
                  {riskReward > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[11px] text-slate-500">R:R</span>
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          riskReward >= 2
                            ? 'text-emerald-400'
                            : riskReward >= 1
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        1:{riskReward.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Entry Status */}
                {entryStatus !== 'immediate' && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
                    <Clock className="w-3 h-3" />
                    {entryStatus === 'wait_for_pullback'
                      ? 'Wait for pullback to entry zone'
                      : 'Wait for rally to entry zone'}
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
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              Price Chart with Trade Plan
            </h3>
          </div>
          <div className="p-0.5 bg-slate-900/80 trade-plan-chart-container">
            <TradePlanChart
              symbol={analysis.symbol}
              direction={direction as 'long' | 'short'}
              entries={entries.length > 0 ? entries : [{ price: averageEntry, percentage: 100 }]}
              stopLoss={{
                price: safeNum(stopLoss?.price || stopLoss),
                percentage: safeNum(stopLoss?.percentage),
              }}
              takeProfits={takeProfits.map((tp: any, i: number) => ({
                price: safeNum(tp.price || tp),
                percentage: safeNum(tp.percentage),
                riskReward: safeNum(tp.riskReward || i + 1),
              }))}
              currentPrice={currentPrice}
              analysisTime={analysis.createdAt}
            />
          </div>
        </div>
      )}

      {/* AI Forecast Bands */}
      {ragData.forecastBands && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/30 p-5">
          <ForecastBandOverlay
            bands={ragData.forecastBands}
            currentPrice={currentPrice || averageEntry}
            symbol={analysis.symbol}
          />
        </div>
      )}

      {/* Multi-Strategy Cards */}
      {ragData.strategies && ragData.strategies.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/30 p-5">
          <MultiStrategyCards
            strategies={ragData.strategies}
            recommended={ragData.recommendedStrategy || ragData.strategies[0]?.id}
            currentPrice={currentPrice || averageEntry}
          />
        </div>
      )}

      {/* Validation + Research row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Validation */}
        {ragData.validation && (
          <PlanValidationBadge
            validation={ragData.validation}
            capitalFlowAligned={ragData.capitalFlowAligned}
          />
        )}

        {/* Web Research */}
        {ragData.webResearch && <WebResearchPanel research={ragData.webResearch} />}
      </div>

      {/* Performance Attribution */}
      <PerformanceAttribution analysis={analysis} capitalFlow={capitalFlow} />

      {/* Disclaimer */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/30 p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            This report is generated by AI and is not investment advice. All forecasts are
            probabilistic scenarios; past performance does not guarantee future results. Market
            conditions can change rapidly. Always conduct your own research before making trading
            decisions.
          </p>
        </div>
      </div>

      {capitalFlow?.ragLayer4 && <RagInsight text={capitalFlow.ragLayer4} layer={4} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trade Plan Matrix (Professional Table)
// ---------------------------------------------------------------------------

function TradePlanMatrix({ analysis }: { analysis: AnalysisData }) {
  const s5 = (analysis.step5Result || {}) as Record<string, unknown>;
  const plan = s5 as any;
  if (!plan || !plan.averageEntry) return null;

  const direction = safeStr(plan.direction, 'long').toUpperCase();
  const stopLoss = plan.stopLoss;
  const takeProfits = Array.isArray(plan.takeProfits) ? plan.takeProfits : [];

  const rows: Array<{ param: string; value: string; note: string; color?: string }> = [
    {
      param: 'Strategy',
      value: `${direction} ${analysis.interval}`,
      note: analysis.method === 'mlis_pro' ? 'MLIS Pro Analysis' : '7-Step Classic Analysis',
    },
    {
      param: 'Entry Zone',
      value: `$${formatPrice(safeNum(plan.averageEntry))}`,
      note: plan.entryStatus === 'wait_for_pullback' ? 'Wait for pullback' : plan.entryStatus === 'wait_for_rally' ? 'Wait for rally' : 'Limit order zone',
      color: 'text-blue-400',
    },
    {
      param: 'Stop-Loss',
      value: `$${formatPrice(safeNum(stopLoss?.price || stopLoss))}`,
      note: safeStr(stopLoss?.reason, 'Below support / Above resistance'),
      color: 'text-red-400',
    },
  ];

  takeProfits.forEach((tp: any, i: number) => {
    rows.push({
      param: `Target ${i + 1} (TP${i + 1})`,
      value: `$${formatPrice(safeNum(tp.price || tp))}`,
      note: `${safeNum(tp.percentage || (i === 0 ? 60 : 40))}% position close`,
      color: 'text-emerald-400',
    });
  });

  if (plan.riskReward) {
    rows.push({
      param: 'Risk / Reward',
      value: `1 : ${safeNum(plan.riskReward).toFixed(1)}`,
      note:
        safeNum(plan.riskReward) >= 2
          ? 'Meets institutional standards'
          : 'Below 2:1 threshold',
      color:
        safeNum(plan.riskReward) >= 2 ? 'text-emerald-400' : 'text-amber-400',
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-teal-500" />
          Structured Trade Plan
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700/30 bg-slate-50/50 dark:bg-slate-800/30">
              <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">
                Parameter
              </th>
              <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">
                Level / Value
              </th>
              <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 dark:border-slate-700/20 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                  {row.param}
                </td>
                <td
                  className={`px-5 py-3 font-bold tabular-nums ${
                    row.color || 'text-slate-800 dark:text-white'
                  }`}
                >
                  {row.value}
                </td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                  {row.note}
                </td>
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

function PerformanceAttribution({
  analysis,
  capitalFlow,
}: {
  analysis: AnalysisData | null;
  capitalFlow: CapitalFlowSummary | null;
}) {
  if (!analysis) return null;

  const s7 = (analysis.step7Result || {}) as any;
  const overallScore = safeNum(s7?.overallScore ?? analysis?.totalScore) * 10;

  // Derive performance metrics from analysis steps
  const layers: Array<{
    name: string;
    score: number;
    status: string;
    statusColor: string;
  }> = [
    {
      name: 'Capital Flow',
      score: capitalFlow?.recommendation?.confidence ?? 65,
      status:
        safeNum(capitalFlow?.recommendation?.confidence) > 70
          ? 'High Alpha'
          : safeNum(capitalFlow?.recommendation?.confidence) > 50
          ? 'Aligned'
          : 'Neutral',
      statusColor:
        safeNum(capitalFlow?.recommendation?.confidence) > 70
          ? 'text-emerald-400'
          : safeNum(capitalFlow?.recommendation?.confidence) > 50
          ? 'text-blue-400'
          : 'text-slate-400',
    },
    {
      name: 'Sector Rotation',
      score: capitalFlow?.markets?.length
        ? Math.min(
            90,
            capitalFlow.markets.reduce((s, m) => s + Math.abs(safeNum(m.flow7d)), 0) * 5
          )
        : 50,
      status: capitalFlow?.recommendation?.sectors?.length
        ? 'Outperforming'
        : 'Neutral',
      statusColor: capitalFlow?.recommendation?.sectors?.length
        ? 'text-emerald-400'
        : 'text-amber-400',
    },
    {
      name: '7-Step Timing',
      score: overallScore,
      status: overallScore >= 70 ? 'High Conviction' : overallScore >= 50 ? 'Neutral' : 'Weak',
      statusColor:
        overallScore >= 70
          ? 'text-emerald-400'
          : overallScore >= 50
          ? 'text-amber-400'
          : 'text-red-400',
    },
    {
      name: analysis.method === 'mlis_pro' ? 'MLIS Pro' : 'ML Confirmation',
      score: analysis.method === 'mlis_pro' ? Math.min(95, overallScore + 10) : overallScore,
      status:
        analysis.method === 'mlis_pro'
          ? overallScore >= 60
            ? 'Elite Filter'
            : 'Active'
          : overallScore >= 60
          ? 'Confirmed'
          : 'Unconfirmed',
      statusColor:
        overallScore >= 60
          ? 'text-emerald-400'
          : 'text-amber-400',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Performance Attribution
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Which layer contributed to this signal?
        </p>
      </div>
      <div className="p-5">
        <div className="space-y-3">
          {layers.map((layer) => {
            const barColor =
              layer.score >= 70
                ? 'bg-emerald-500'
                : layer.score >= 50
                ? 'bg-amber-500'
                : 'bg-red-500';
            return (
              <div key={layer.name} className="flex items-center gap-4">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-28 flex-shrink-0">
                  {layer.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, layer.score))}%` }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300 w-10 text-right">
                  {Math.round(layer.score)}%
                </span>
                <span
                  className={`text-[10px] font-bold w-24 text-right ${layer.statusColor}`}
                >
                  {layer.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/30">
          Past performance does not guarantee future results. Attribution scores are simulated based
          on current analysis data.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI Components
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Globe;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/10 border border-teal-500/20">
        <Icon className="w-5 h-5 text-teal-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/40 p-3.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">
        {label}
      </p>
      <p className={`text-base font-bold tabular-nums ${valueClass || 'text-slate-800 dark:text-white'}`}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-slate-400 mt-0.5 uppercase">{sub}</p>
      )}
    </div>
  );
}

function LevelRow({
  label,
  value,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${bgColor}`}>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>
        ${formatPrice(value)}
      </span>
    </div>
  );
}

function RagInsight({ text, layer }: { text: string; layer: number }) {
  return (
    <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 dark:bg-teal-500/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <Eye className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">
            L{layer} Insight
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function IntelligenceDashboard() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get('id');

  const [activeStep, setActiveStep] = useState<FunnelStep>(4);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch capital flow and analysis in parallel
        const promises: Promise<any>[] = [
          authFetch('/api/capital-flow/summary')
            .then((r) => r.json())
            .catch(() => null),
        ];

        if (analysisId) {
          promises.push(
            authFetch(`/api/analysis/${analysisId}`)
              .then((r) => r.json())
              .catch(() => null)
          );
        } else {
          // Fetch most recent analysis
          promises.push(
            authFetch('/api/analysis/recent?limit=1')
              .then((r) => r.json())
              .catch(() => null)
          );
        }

        const [cfRes, analysisRes] = await Promise.allSettled(promises);

        if (cfRes.status === 'fulfilled' && cfRes.value) {
          const cfData = cfRes.value.data || cfRes.value;
          setCapitalFlow(cfData);
        }

        if (analysisRes.status === 'fulfilled' && analysisRes.value) {
          const aData = analysisRes.value.data || analysisRes.value;
          if (Array.isArray(aData)) {
            // Recent analyses - pick first
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
    };

    fetchData();
  }, [analysisId]);

  // Breadcrumb
  const breadcrumb = [
    capitalFlow?.globalLiquidity?.bias
      ? capitalFlow.globalLiquidity.bias.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
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
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/80 flex items-center gap-1.5">
        {breadcrumb.map((crumb, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
            <button
              onClick={() => setActiveStep((idx + 1) as FunnelStep)}
              className={`text-xs font-medium transition-colors ${
                idx + 1 === activeStep
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {crumb}
            </button>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="hidden lg:block">
          <LogicPathPanel
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            capitalFlow={capitalFlow}
            analysis={analysis}
          />
        </div>

        {/* Mobile step selector */}
        <div className="lg:hidden absolute top-[calc(64px+38px)] left-0 right-0 z-10 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => setActiveStep(s as FunnelStep)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeStep === s
                    ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {s === 1 ? 'Flow' : s === 2 ? 'Sector' : s === 3 ? 'Asset' : 'Plan'}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Content Stage */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6 lg:py-8">
            {loading ? (
              <div className="space-y-6">
                <SectionSkeleton lines={3} />
                <ChartSkeleton />
                <SectionSkeleton lines={4} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                  Failed to Load
                </h3>
                <p className="text-sm text-slate-500">{error}</p>
              </div>
            ) : (
              <>
                {activeStep === 1 && <CapitalFlowContent data={capitalFlow} />}
                {activeStep === 2 && <SectorContent data={capitalFlow} />}
                {activeStep === 3 && <AssetContent analysis={analysis} />}
                {activeStep === 4 && (
                  <TradePlanContent analysis={analysis} capitalFlow={capitalFlow} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
