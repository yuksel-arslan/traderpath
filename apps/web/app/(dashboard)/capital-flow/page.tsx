'use client';

// ===========================================
// Capital Flow Dashboard
// Global Capital Flow Intelligence Platform
// ===========================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Activity,
  DollarSign,
  Landmark,
  BarChart3,
  Coins,
  Gem,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Info,
  ChevronRight,
  ChevronDown,
  Layers,
  Zap,
  Sparkles,
  Brain,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { X, Loader2, LineChart } from 'lucide-react';

// Types
interface GlobalLiquidity {
  fedBalanceSheet: {
    value: number;
    change30d: number;
    trend: 'expanding' | 'contracting' | 'stable';
  };
  m2MoneySupply: {
    value: number;
    change30d: number;
    yoyGrowth: number;
  };
  dxy: {
    value: number;
    change7d: number;
    trend: 'strengthening' | 'weakening' | 'stable';
  };
  vix: {
    value: number;
    level: 'extreme_fear' | 'fear' | 'neutral' | 'complacent';
  };
  yieldCurve: {
    spread10y2y: number;
    inverted: boolean;
    interpretation: string;
  };
  lastUpdated: string;
}

interface SectorFlow {
  name: string;
  flow7d: number;
  flow30d: number;
  dominance: number;
  trending: 'up' | 'down' | 'stable';
  phase: 'early' | 'mid' | 'late' | 'exit';
  topAssets: string[];
}

interface FlowDataPoint {
  date: string;
  value: number;
}

interface MarketFlow {
  market: 'crypto' | 'stocks' | 'bonds' | 'metals';
  currentValue: number;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  flowHistory?: FlowDataPoint[];
  velocityHistory?: FlowDataPoint[];
  phase: 'early' | 'mid' | 'late' | 'exit';
  daysInPhase: number;
  phaseStartDate: string;
  avgPhaseDuration: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  rotationTarget: string | null;
  rotationConfidence: number;
  sectors?: SectorFlow[];
  lastUpdated: string;
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: string;
  action: 'analyze' | 'wait' | 'avoid';
  direction: 'BUY' | 'SELL';
  reason: string;
  sectors?: string[];
  confidence: number;
}

interface ActiveRotation {
  from: string;
  to: string;
  confidence: number;
  estimatedDuration: string;
  startedAt: string;
}

interface LayerInsights {
  layer1: string;
  layer2: string;
  layer3: string;
  layer4: string;
  generatedAt: string;
}

interface MarketAnalysis {
  market: string;
  summary: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  keyMetrics: {
    label: string;
    value: string;
    status: 'positive' | 'negative' | 'neutral';
  }[];
  recommendation: string;
  confidence: number;
  generatedAt: string;
}

interface MarketCorrelation {
  market1: string;
  market2: string;
  correlation: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative' | 'neutral';
  interpretation: string;
}

interface CorrelationMatrix {
  correlations: MarketCorrelation[];
  strongestPositive: MarketCorrelation | null;
  strongestNegative: MarketCorrelation | null;
  insights: string;
  lastUpdated: string;
}

interface RotationTradeOpportunity {
  market: 'crypto' | 'stocks' | 'bonds' | 'metals';
  direction: 'BUY' | 'SELL';
  reason: string;
  confidence: number;
  flowSignal: 'entering' | 'exiting';
  relatedMarkets: {
    market: 'crypto' | 'stocks' | 'bonds' | 'metals';
    relationship: 'source' | 'destination';
  }[];
  suggestedSectors?: string[];
  riskLevel: 'low' | 'medium' | 'high';
  correlationInfo?: {
    strongestCorrelation: {
      market: 'crypto' | 'stocks' | 'bonds' | 'metals';
      value: number;
      direction: 'positive' | 'negative';
      interpretation: string;
    };
    hedgeSuggestion?: {
      market: 'crypto' | 'stocks' | 'bonds' | 'metals';
      correlation: number;
    };
  };
  phaseContext?: {
    currentPhase: 'early' | 'mid' | 'late' | 'exit';
    daysInPhase: number;
    avgDuration: number;
    phaseProgress: number;
  };
}

interface TradeOpportunities {
  opportunities: RotationTradeOpportunity[];
  rotationSummary: string;
  totalOpportunities: number;
  buyOpportunities: number;
  sellOpportunities: number;
  lastUpdated: string;
}

interface CapitalFlowSummary {
  timestamp: string;
  globalLiquidity: GlobalLiquidity;
  liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
  markets: MarketFlow[];
  correlations?: CorrelationMatrix;
  tradeOpportunities?: TradeOpportunities;
  recommendation: FlowRecommendation;
  sellRecommendation?: FlowRecommendation;
  activeRotation: ActiveRotation | null;
  insights?: LayerInsights;
  cacheExpiry: string;
}

// Market Analysis Modal Component
function MarketAnalysisModal({
  market,
  analysis,
  loading,
  onClose,
}: {
  market: MarketFlow | null;
  analysis: MarketAnalysis | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!market) return null;

  const marketNames: Record<string, string> = {
    crypto: 'Cryptocurrency',
    stocks: 'Stock Market',
    bonds: 'Bond Market',
    metals: 'Precious Metals',
  };

  const trendColors = {
    bullish: 'text-emerald-500',
    bearish: 'text-red-500',
    neutral: 'text-blue-500',
  };

  const trendBg = {
    bullish: 'bg-emerald-500/20',
    bearish: 'bg-red-500/20',
    neutral: 'bg-blue-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <LineChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {marketNames[market.market]} Analysis
              </h2>
              <p className="text-sm text-slate-500">AI-Powered Market Insights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500">Generating AI analysis...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Trend Badge */}
              <div className="flex items-center justify-between">
                <span className={cn(
                  'px-4 py-2 rounded-full font-bold text-sm',
                  trendBg[analysis.trend],
                  trendColors[analysis.trend]
                )}>
                  {analysis.trend.toUpperCase()}
                </span>
                <span className="text-sm text-slate-500">
                  Confidence: <span className="font-bold text-slate-900 dark:text-white">{analysis.confidence}%</span>
                </span>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gradient-to-r from-blue-50 dark:from-blue-500/10 to-indigo-50 dark:to-indigo-500/10 rounded-xl">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">AI Summary</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{analysis.summary}</p>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Key Metrics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {analysis.keyMetrics.map((metric, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                    >
                      <p className="text-xs text-slate-500 mb-1">{metric.label}</p>
                      <p className={cn(
                        'font-bold text-sm',
                        metric.status === 'positive' && 'text-emerald-600 dark:text-emerald-400',
                        metric.status === 'negative' && 'text-red-600 dark:text-red-400',
                        metric.status === 'neutral' && 'text-slate-900 dark:text-white'
                      )}>
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div className="p-4 bg-gradient-to-r from-amber-50 dark:from-amber-500/10 to-orange-50 dark:to-orange-500/10 rounded-xl">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Recommendation</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{analysis.recommendation}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">
                  Generated: {new Date(analysis.generatedAt).toLocaleString()}
                </p>
                <Link
                  href={`/analyze?asset=${market.market}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-lg hover:shadow-lg transition-all"
                >
                  <Zap className="w-4 h-4" />
                  {market.market === 'crypto' ? 'Full 7-Step Analysis' : 'Analyze'}
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-500">Failed to generate analysis. Please try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Grain Texture Overlay
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.02]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

// Gradient Orbs
function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/10 dark:from-blue-500/20 to-indigo-500/5 dark:to-indigo-500/10 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-teal-500/10 dark:from-teal-500/15 to-emerald-500/5 dark:to-emerald-500/10 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-amber-500/5 dark:from-amber-500/10 to-orange-500/5 rounded-full blur-3xl animate-orb-move" />
    </div>
  );
}

// AI Insight Box Component
function InsightBox({ insight, icon: Icon }: { insight: string; icon: any }) {
  if (!insight) return null;

  return (
    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 dark:from-blue-500/10 to-indigo-50 dark:to-indigo-500/10 border border-blue-200/50 dark:border-blue-500/30 rounded-xl">
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}

// Phase Badge Component
function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    early: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: 'EARLY' },
    mid: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/20', label: 'MID' },
    late: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/20', label: 'LATE' },
    exit: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', label: 'EXIT' },
  };

  const { color, bg, label } = config[phase] || config.mid;

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', bg, color)}>
      {label}
    </span>
  );
}

// Rotation Signal Badge
function RotationBadge({ signal }: { signal: 'entering' | 'stable' | 'exiting' | null }) {
  if (!signal) return null;

  const config: Record<string, { color: string; bg: string; icon: any }> = {
    entering: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', icon: ArrowUpRight },
    stable: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20', icon: Minus },
    exiting: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', icon: ArrowDownRight },
  };

  const { color, bg, icon: Icon } = config[signal];

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', bg, color)}>
      <Icon className="w-3 h-3" />
      {signal.toUpperCase()}
    </span>
  );
}

// Liquidity Bias Badge
function LiquidityBiasBadge({ bias }: { bias: 'risk_on' | 'risk_off' | 'neutral' }) {
  const config: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    risk_on: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: 'RISK ON', icon: TrendingUp },
    risk_off: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', label: 'RISK OFF', icon: TrendingDown },
    neutral: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20', label: 'NEUTRAL', icon: Minus },
  };

  const { color, bg, label, icon: Icon } = config[bias];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold', bg, color)}>
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
}

// Market Icon
function MarketIcon({ market, className }: { market: string; className?: string }) {
  const icons: Record<string, any> = {
    crypto: Coins,
    stocks: BarChart3,
    bonds: Landmark,
    metals: Gem,
  };
  const Icon = icons[market] || Activity;
  return <Icon className={className} />;
}

// Mini Sparkline Chart Component
function MiniSparkline({ data, color, height = 40 }: { data: FlowDataPoint[]; color: 'emerald' | 'blue' | 'red' | 'amber'; height?: number }) {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 100;
  const padding = 2;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  // Generate path
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((v - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Area path (for gradient fill)
  const areaD = `${pathD} L ${padding + chartWidth},${height - padding} L ${padding},${height - padding} Z`;

  const colorMap = {
    emerald: { stroke: '#10b981', fill: 'url(#emeraldGradient)' },
    blue: { stroke: '#3b82f6', fill: 'url(#blueGradient)' },
    red: { stroke: '#ef4444', fill: 'url(#redGradient)' },
    amber: { stroke: '#f59e0b', fill: 'url(#amberGradient)' },
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="emeraldGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="blueGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="redGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="amberGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={colorMap[color].fill} />
      <path d={pathD} fill="none" stroke={colorMap[color].stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Market Card Component
function MarketCard({ market, onClick, onAnalyze }: { market: MarketFlow; onClick: () => void; onAnalyze: () => void }) {
  const marketNames: Record<string, string> = {
    crypto: 'Crypto',
    stocks: 'Stocks',
    bonds: 'Bonds',
    metals: 'Metals',
  };

  const marketColors: Record<string, string> = {
    crypto: 'from-orange-500 to-amber-500',
    stocks: 'from-blue-500 to-indigo-500',
    bonds: 'from-purple-500 to-violet-500',
    metals: 'from-yellow-500 to-amber-400',
  };

  return (
    <div
      className="group relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', marketColors[market.market])}>
            <MarketIcon market={market.market} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{marketNames[market.market]}</h3>
            <PhaseBadge phase={market.phase} />
          </div>
        </div>
        <RotationBadge signal={market.rotationSignal} />
      </div>

      {/* Flow Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">7D Flow</p>
          <p className={cn('text-sm font-bold', market.flow7d >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {market.flow7d >= 0 ? '+' : ''}{market.flow7d.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">30D Flow</p>
          <p className={cn('text-sm font-bold', market.flow30d >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {market.flow30d >= 0 ? '+' : ''}{market.flow30d.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Velocity</p>
          <p className={cn('text-sm font-bold', market.flowVelocity >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')}>
            {market.flowVelocity >= 0 ? '+' : ''}{market.flowVelocity.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Flow Charts */}
      {market.flowHistory && market.flowHistory.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Money Flow Chart */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Para Akışı (30g)
            </p>
            <MiniSparkline
              data={market.flowHistory}
              color={market.flow30d >= 0 ? 'emerald' : 'red'}
              height={36}
            />
          </div>
          {/* Velocity Chart */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Akış Hızı (30g)
            </p>
            {market.velocityHistory && (
              <MiniSparkline
                data={market.velocityHistory}
                color={market.flowVelocity >= 0 ? 'blue' : 'amber'}
                height={36}
              />
            )}
          </div>
        </div>
      )}

      {/* Phase Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>{market.daysInPhase} days in phase</span>
          <span>Avg: {market.avgPhaseDuration} days</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              market.phase === 'early' ? 'bg-emerald-500' :
              market.phase === 'mid' ? 'bg-yellow-500' :
              market.phase === 'late' ? 'bg-orange-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(100, (market.daysInPhase / market.avgPhaseDuration) * 100)}%` }}
          />
        </div>
      </div>

      {/* Top Sectors Preview */}
      {market.sectors && market.sectors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {market.sectors.slice(0, 3).map((sector) => (
            <span
              key={sector.name}
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                sector.trending === 'up' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                sector.trending === 'down' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
                'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              {sector.name}
            </span>
          ))}
          {market.sectors.length > 3 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">
              +{market.sectors.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 py-2 px-3 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Sectors
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAnalyze();
          }}
          className="flex-1 py-2 px-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
        >
          <LineChart className="w-4 h-4" />
          Analyze
        </button>
      </div>
    </div>
  );
}

// Liquidity Metric Card
function LiquidityMetric({
  title,
  value,
  unit,
  change,
  trend,
  icon: Icon,
  info,
}: {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: any;
  info?: string;
}) {
  return (
    <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">{title}</span>
        </div>
        {info && (
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            <div className="absolute right-0 top-6 w-48 p-2 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {info}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
          {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
        </div>
        {change !== undefined && (
          <span className={cn(
            'text-sm font-medium',
            change > 0 ? 'text-emerald-600 dark:text-emerald-400' :
            change < 0 ? 'text-red-600 dark:text-red-400' :
            'text-slate-500'
          )}>
            {change > 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
        {trend && (
          <span className={cn(
            'px-2 py-0.5 rounded text-xs font-medium',
            trend === 'up' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
            trend === 'down' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          )}>
            {trend === 'up' ? 'EXPANDING' : trend === 'down' ? 'CONTRACTING' : 'STABLE'}
          </span>
        )}
      </div>
    </div>
  );
}

// Sector Row Component
function SectorRow({ sector }: { sector: SectorFlow }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs',
          sector.trending === 'up' ? 'bg-emerald-500' :
          sector.trending === 'down' ? 'bg-red-500' :
          'bg-slate-500'
        )}>
          {sector.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">{sector.name}</p>
          <p className="text-xs text-slate-500">{sector.dominance.toFixed(1)}% dominance</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          'font-bold text-sm',
          sector.flow7d >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        )}>
          {sector.flow7d >= 0 ? '+' : ''}{sector.flow7d.toFixed(1)}%
        </p>
        <p className="text-xs text-slate-500">7D</p>
      </div>
    </div>
  );
}

// Layer Summary Box Component
function LayerSummaryBox({
  layerNum,
  title,
  status,
  statusType,
  details,
  icon: Icon,
  color,
  onClick,
  isSelected,
}: {
  layerNum: number;
  title: string;
  status: string;
  statusType: 'positive' | 'negative' | 'neutral' | 'warning';
  details: string;
  icon: any;
  color: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const statusColors = {
    positive: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    negative: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
    neutral: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    warning: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  };

  const bgColors: Record<string, string> = {
    blue: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
    emerald: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30',
    purple: 'from-purple-500/10 to-violet-500/10 border-purple-500/30',
    amber: 'from-amber-500/10 to-orange-500/10 border-amber-500/30',
  };

  const selectedBgColors: Record<string, string> = {
    blue: 'from-blue-500/20 to-indigo-500/20 border-blue-500 ring-2 ring-blue-500/50',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500 ring-2 ring-emerald-500/50',
    purple: 'from-purple-500/20 to-violet-500/20 border-purple-500 ring-2 ring-purple-500/50',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500 ring-2 ring-amber-500/50',
  };

  const numColors: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'backdrop-blur-xl bg-gradient-to-br border rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all cursor-pointer text-left w-full',
        isSelected ? selectedBgColors[color] : bgColors[color]
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0', numColors[color])}>
          {layerNum}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 truncate">{title}</span>
          </div>
          <div className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-bold mb-1', statusColors[statusType])}>
            {status}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{details}</p>
        </div>
        {/* Expand indicator */}
        <ChevronDown className={cn(
          'w-4 h-4 text-slate-400 transition-transform flex-shrink-0',
          isSelected && 'rotate-180'
        )} />
      </div>
    </button>
  );
}

// Recommendation Card
function RecommendationCard({ recommendation, rotation, showRotation = true }: { recommendation: FlowRecommendation; rotation?: ActiveRotation | null; showRotation?: boolean }) {
  const isSell = recommendation.direction === 'SELL';

  const actionConfig: Record<string, { bg: string; color: string; icon: any }> = {
    analyze: {
      bg: isSell ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-teal-500',
      color: 'text-white',
      icon: isSell ? TrendingDown : Target
    },
    wait: { bg: 'from-yellow-500 to-amber-500', color: 'text-white', icon: Clock },
    avoid: { bg: 'from-slate-500 to-slate-600', color: 'text-white', icon: AlertTriangle },
  };

  const config = actionConfig[recommendation.action] || actionConfig.wait;

  return (
    <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header with Action */}
      <div className={cn('bg-gradient-to-r p-4', config.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isSell ? (
                <TrendingDown className="w-6 h-6 text-white" />
              ) : (
                <TrendingUp className="w-6 h-6 text-white" />
              )}
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-bold",
                isSell ? "bg-white/20 text-white" : "bg-white/20 text-white"
              )}>
                {recommendation.direction || 'BUY'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{recommendation.action.toUpperCase()}: {recommendation.primaryMarket.toUpperCase()}</h3>
              <p className="text-white/80 text-sm">Phase: {recommendation.phase.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-xs">Confidence</p>
            <p className="text-white font-bold text-xl">{recommendation.confidence}%</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-slate-700 dark:text-slate-300 mb-4">{recommendation.reason}</p>

        {/* Recommended/Weak Sectors */}
        {recommendation.sectors && recommendation.sectors.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">{isSell ? 'Weak Sectors (Short Targets)' : 'Recommended Sectors'}</p>
            <div className="flex flex-wrap gap-2">
              {recommendation.sectors.map((sector) => (
                <span
                  key={sector}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    isSell
                      ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                      : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                  )}
                >
                  {sector}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active Rotation */}
        {showRotation && rotation && (
          <div className="bg-gradient-to-r from-purple-100 dark:from-purple-500/20 to-blue-100 dark:to-blue-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Active Rotation Detected</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">{rotation.from.toUpperCase()}</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{rotation.to.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Est. Duration</p>
                <p className="font-medium text-slate-900 dark:text-white">{rotation.estimatedDuration}</p>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        {recommendation.action === 'analyze' && (
          <Link
            href="/analyze"
            className={cn(
              "mt-4 flex items-center justify-center gap-2 w-full py-3 text-white font-bold rounded-xl hover:shadow-lg transition-all",
              isSell
                ? "bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-red-500/20"
                : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-emerald-500/20"
            )}
          >
            <Zap className="w-4 h-4" />
            {isSell ? 'Find Short Opportunities' : 'Start Analysis'}
          </Link>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function CapitalFlowPage() {
  const router = useRouter();
  const [data, setData] = useState<CapitalFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketFlow | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [correlationsExpanded, setCorrelationsExpanded] = useState(false);
  const [opportunitiesExpanded, setOpportunitiesExpanded] = useState(false);

  // Layer 4 unlock state (25 credits per day via Daily Pass)
  const [layer4Unlocked, setLayer4Unlocked] = useState(false);
  const [unlockingLayer4, setUnlockingLayer4] = useState(false);

  // Check if Layer 4 is unlocked via Daily Pass API
  useEffect(() => {
    const checkLayer4Pass = async () => {
      try {
        const response = await authFetch('/api/passes/check/CAPITAL_FLOW_L4');
        const result = await response.json();
        if (result.success && result.data?.hasPass && result.data?.canUse) {
          setLayer4Unlocked(true);
        }
      } catch (err) {
        console.error('Failed to check Layer 4 pass:', err);
      }
    };
    checkLayer4Pass();
  }, []);

  // Unlock Layer 4 with 25 credits via Daily Pass
  const unlockLayer4 = async () => {
    setUnlockingLayer4(true);
    try {
      const response = await authFetch('/api/passes/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passType: 'CAPITAL_FLOW_L4' }),
      });
      const result = await response.json();
      if (result.success) {
        setLayer4Unlocked(true);
      } else {
        alert(result.error?.message || 'Insufficient credits. You need 25 credits to unlock AI Recommendations.');
      }
    } catch (err) {
      console.error('Failed to unlock Layer 4:', err);
      alert('Failed to unlock. Please try again.');
    } finally {
      setUnlockingLayer4(false);
    }
  };

  // Market Analysis Modal state
  const [analysisMarket, setAnalysisMarket] = useState<MarketFlow | null>(null);
  const [analysisData, setAnalysisData] = useState<MarketAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Market scan states
  type ScanningMarket = 'crypto' | 'stocks' | 'bonds' | 'metals' | null;
  const [scanningMarket, setScanningMarket] = useState<ScanningMarket>(null);
  const [scanProgress, setScanProgress] = useState(0);

  // Generic scan handler for all markets
  const handleMarketScan = async (market: 'crypto' | 'stocks' | 'bonds' | 'metals') => {
    setScanningMarket(market);
    setScanProgress(0);

    const isCrypto = market === 'crypto';
    const scanEndpoint = isCrypto ? '/api/analysis/top-coins/scan' : `/api/analysis/multi-asset/${market}/scan`;
    const statusEndpoint = isCrypto ? '/api/analysis/top-coins/status' : `/api/analysis/multi-asset/${market}/status`;
    const resultsPage = isCrypto ? '/top-coins?from=capital-flow' : `/top-assets/${market}?from=capital-flow`;

    try {
      // Start the scan
      const startResponse = await authFetch(scanEndpoint, { method: 'POST' });
      const startResult = await startResponse.json();

      if (!startResult.success) {
        throw new Error(startResult.error?.message || 'Failed to start scan');
      }

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await authFetch(statusEndpoint);
          const statusResult = await statusResponse.json();

          if (statusResult.success) {
            const { isScanning, scanProgress: progress } = statusResult.data;
            const analyzed = isCrypto ? progress?.coinsAnalyzed : progress?.assetsAnalyzed;
            const total = isCrypto ? progress?.totalCoins : progress?.totalAssets;

            if (analyzed !== undefined && total !== undefined && total > 0) {
              setScanProgress(Math.round((analyzed / total) * 100));
            }

            if (!isScanning) {
              clearInterval(pollInterval);
              setScanningMarket(null);
              // Navigate to results page
              router.push(resultsPage);
            }
          }
        } catch (err) {
          console.error(`Error polling ${market} scan status:`, err);
        }
      }, 2000);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setScanningMarket(null);
      }, 10 * 60 * 1000);

    } catch (err) {
      console.error(`Error starting ${market} scan:`, err);
      setScanningMarket(null);
      // Fallback: just navigate to analyze page
      router.push(`/analyze?asset=${market}`);
    }
  };

  // Fetch market analysis
  const fetchMarketAnalysis = async (market: MarketFlow) => {
    setAnalysisMarket(market);
    setAnalysisData(null);
    setAnalysisLoading(true);

    try {
      const response = await authFetch(`/api/capital-flow/analyze/${market.market}`);
      const result = await response.json();

      if (result.success) {
        setAnalysisData(result.data);
      }
    } catch (err) {
      console.error('Error fetching market analysis:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const fetchData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const endpoint = refresh ? '/api/capital-flow/refresh' : '/api/capital-flow/summary';
      const method = refresh ? 'POST' : 'GET';
      const response = await authFetch(endpoint, { method });

      if (!response.ok) throw new Error('Failed to fetch capital flow data');

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);

        // Auto-select the market with highest flow for LAYER 3 visibility
        if (result.data.markets && result.data.markets.length > 0 && !selectedMarket) {
          const topMarket = result.data.markets.reduce((prev: MarketFlow, curr: MarketFlow) =>
            curr.flow7d > prev.flow7d ? curr : prev
          );
          if (topMarket.sectors && topMarket.sectors.length > 0) {
            setSelectedMarket(topMarket);
          }
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching capital flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120]">
        <GrainOverlay />
        <GradientOrbs />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 dark:text-slate-400">Loading Capital Flow data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120]">
        <GrainOverlay />
        <GradientOrbs />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Data</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120]">
      <GrainOverlay />
      <GradientOrbs />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* ===== HERO SECTION with Kinetic Typography ===== */}
        <div className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6 mb-8">
          <div className="relative inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4 rounded-full overflow-hidden animate-blur-in group">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-emerald-400 to-coral-500 opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-emerald-400 via-coral-500 to-teal-500 bg-[length:300%_100%] animate-gradient-x opacity-10" />
            {/* Border glow */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-teal-500 via-emerald-400 to-coral-500 bg-clip-border opacity-60" style={{ WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
            <div className="relative flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-teal-500" />
                <div className="absolute inset-0 w-6 h-6 sm:w-7 sm:h-7 bg-teal-500/40 rounded-full blur-lg animate-pulse" />
              </div>
              <span className="text-base sm:text-lg font-black uppercase tracking-[0.2em] bg-gradient-to-r from-teal-400 via-emerald-300 via-50% to-coral-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">
                Global Capital Flow Intelligence
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer drop-shadow-sm">
                Follow the Money
              </span>
              <span className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-emerald-400/20 to-teal-500/20 blur-xl rounded-lg -z-10" />
            </span>
            <br />
            <span className="relative inline-block mt-2">
              <span className="bg-gradient-to-r from-coral-400 via-red-400 to-coral-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer drop-shadow-sm" style={{ animationDelay: '0.5s' }}>
                Flow
              </span>
              <span className="absolute -inset-1 bg-gradient-to-r from-coral-500/20 via-red-400/20 to-coral-500/20 blur-xl rounded-lg -z-10" />
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto animate-slide-up px-2">
            Where money flows, potential exists
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <Landmark className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Fed & M2 Tracking</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">4 Markets</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <Activity className="w-3.5 h-3.5 text-coral-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Real-time Flow</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              <Brain className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">AI Insights</span>
            </div>
          </div>

          {/* Liquidity Badge and Refresh */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <LiquidityBiasBadge bias={data.liquidityBias} />
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className={cn(
                "p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm",
                refreshing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-500", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* ===== LAYER FLOW SUMMARY - Quick Overview ===== */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-slate-500" />
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Flow Status</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Layer 1: Global Liquidity */}
            <LayerSummaryBox
              layerNum={1}
              title="Global Liquidity"
              status={
                data.globalLiquidity.fedBalanceSheet.trend === 'expanding'
                  ? 'EXPANDING'
                  : data.globalLiquidity.fedBalanceSheet.trend === 'contracting'
                  ? 'CONTRACTING'
                  : 'STABLE'
              }
              statusType={
                data.globalLiquidity.fedBalanceSheet.trend === 'expanding'
                  ? 'positive'
                  : data.globalLiquidity.fedBalanceSheet.trend === 'contracting'
                  ? 'negative'
                  : 'neutral'
              }
              details={`Fed: ${data.globalLiquidity.fedBalanceSheet.value.toFixed(1)}T • DXY: ${data.globalLiquidity.dxy.value.toFixed(1)} • VIX: ${data.globalLiquidity.vix.value.toFixed(0)}`}
              icon={Landmark}
              color="blue"
              onClick={() => setSelectedLayer(selectedLayer === 1 ? null : 1)}
              isSelected={selectedLayer === 1}
            />

            {/* Layer 2: Market Flow */}
            {(() => {
              const topMarket = data.markets.reduce((prev, curr) =>
                curr.flow7d > prev.flow7d ? curr : prev
              );
              const inflowCount = data.markets.filter(m => m.flow7d > 0).length;
              return (
                <LayerSummaryBox
                  layerNum={2}
                  title="Market Flow"
                  status={`${topMarket.market.toUpperCase()} LEADS`}
                  statusType={topMarket.flow7d > 2 ? 'positive' : topMarket.flow7d > 0 ? 'neutral' : 'warning'}
                  details={`${inflowCount}/4 markets inflow • Top: ${topMarket.flow7d > 0 ? '+' : ''}${topMarket.flow7d.toFixed(1)}% (7D)`}
                  icon={BarChart3}
                  color="emerald"
                  onClick={() => setSelectedLayer(selectedLayer === 2 ? null : 2)}
                  isSelected={selectedLayer === 2}
                />
              );
            })()}

            {/* Layer 3: Sector Status */}
            {(() => {
              const allSectors = data.markets.flatMap(m => m.sectors || []);
              const topSector = allSectors.length > 0
                ? allSectors.reduce((prev, curr) => curr.flow7d > prev.flow7d ? curr : prev)
                : null;
              const upSectors = allSectors.filter(s => s.trending === 'up').length;
              return (
                <LayerSummaryBox
                  layerNum={3}
                  title="Sector Activity"
                  status={topSector ? `${topSector.name.toUpperCase()} HOT` : 'SELECT MARKET'}
                  statusType={topSector && topSector.flow7d > 3 ? 'positive' : topSector && topSector.flow7d > 0 ? 'neutral' : 'warning'}
                  details={topSector
                    ? `${upSectors} sectors up • Top: ${topSector.flow7d > 0 ? '+' : ''}${topSector.flow7d.toFixed(1)}%`
                    : 'Click a market to see sectors'}
                  icon={Activity}
                  color="purple"
                  onClick={() => setSelectedLayer(selectedLayer === 3 ? null : 3)}
                  isSelected={selectedLayer === 3}
                />
              );
            })()}

            {/* Layer 4: Recommendation - Locked until 25 credits paid */}
            <LayerSummaryBox
              layerNum={4}
              title="Recommendation"
              status={layer4Unlocked
                ? `${data.recommendation.action.toUpperCase()} ${data.recommendation.primaryMarket.toUpperCase()}`
                : '🔒 LOCKED'
              }
              statusType={
                !layer4Unlocked
                  ? 'warning'
                  : data.recommendation.action === 'analyze'
                  ? 'positive'
                  : data.recommendation.action === 'wait'
                  ? 'warning'
                  : 'negative'
              }
              details={layer4Unlocked
                ? `Phase: ${data.recommendation.phase.toUpperCase()} • Confidence: ${data.recommendation.confidence}%`
                : '25 credits to unlock • Valid 24h'
              }
              icon={Target}
              color="amber"
              onClick={() => setSelectedLayer(selectedLayer === 4 ? null : 4)}
              isSelected={selectedLayer === 4}
            />
          </div>

          {/* Expanded Layer Detail */}
          {selectedLayer && (
            <div className="mt-4 animate-slide-up">
              {/* Layer 1 Detail */}
              {selectedLayer === 1 && (
                <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">1</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Liquidity Tracker</h3>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <LiquidityMetric
                      title="Fed Balance Sheet"
                      value={data.globalLiquidity.fedBalanceSheet.value.toFixed(2)}
                      unit="T USD"
                      trend={data.globalLiquidity.fedBalanceSheet.trend === 'expanding' ? 'up' : data.globalLiquidity.fedBalanceSheet.trend === 'contracting' ? 'down' : 'stable'}
                      icon={Landmark}
                      info="Federal Reserve total assets"
                    />
                    <LiquidityMetric
                      title="M2 Money Supply"
                      value={data.globalLiquidity.m2MoneySupply.value.toFixed(2)}
                      unit="T USD"
                      change={data.globalLiquidity.m2MoneySupply.yoyGrowth}
                      icon={DollarSign}
                      info="Year-over-year growth"
                    />
                    <LiquidityMetric
                      title="Dollar Index (DXY)"
                      value={data.globalLiquidity.dxy.value.toFixed(2)}
                      change={data.globalLiquidity.dxy.change7d}
                      icon={Globe}
                      info={data.globalLiquidity.dxy.trend === 'strengthening' ? 'Dollar strengthening' : data.globalLiquidity.dxy.trend === 'weakening' ? 'Dollar weakening' : 'Dollar stable'}
                    />
                    <LiquidityMetric
                      title="VIX (Fear Index)"
                      value={data.globalLiquidity.vix.value.toFixed(2)}
                      icon={Activity}
                      info={`Market sentiment: ${data.globalLiquidity.vix.level.replace('_', ' ').toUpperCase()}`}
                    />
                    <LiquidityMetric
                      title="Yield Curve (10Y-2Y)"
                      value={data.globalLiquidity.yieldCurve.spread10y2y.toFixed(3)}
                      unit="%"
                      icon={BarChart3}
                      info={data.globalLiquidity.yieldCurve.interpretation}
                    />
                  </div>
                  {data.insights?.layer1 && <InsightBox insight={data.insights.layer1} icon={Brain} />}
                </div>
              )}

              {/* Layer 2 Detail */}
              {selectedLayer === 2 && (
                <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/50 dark:border-emerald-700/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-white text-xs font-bold">2</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Market Flow Analyzer</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.markets.map((market) => (
                      <MarketCard
                        key={market.market}
                        market={market}
                        onClick={() => {
                          setSelectedMarket(selectedMarket?.market === market.market ? null : market);
                          setSelectedLayer(3); // Switch to Layer 3 to show sectors
                        }}
                        onAnalyze={() => fetchMarketAnalysis(market)}
                      />
                    ))}
                  </div>
                  {data.insights?.layer2 && <InsightBox insight={data.insights.layer2} icon={Sparkles} />}
                </div>
              )}

              {/* Layer 3 Detail */}
              {selectedLayer === 3 && (
                <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-purple-200/50 dark:border-purple-700/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">3</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sector Drill-Down</h3>
                  </div>
                  {selectedMarket ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Showing sectors for <strong className="capitalize">{selectedMarket.market}</strong>
                      </p>
                      {selectedMarket.sectors && selectedMarket.sectors.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedMarket.sectors.map((sector, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-3 rounded-xl border transition-all",
                                sector.trending === 'up'
                                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
                                  : sector.trending === 'down'
                                  ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-900 dark:text-white">{sector.name}</span>
                                <span className={cn(
                                  "text-sm font-bold",
                                  sector.flow7d > 0 ? "text-emerald-600" : "text-red-600"
                                )}>
                                  {sector.flow7d > 0 ? '+' : ''}{sector.flow7d.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>Phase: {sector.phase}</span>
                                <span>•</span>
                                <span className="capitalize">{sector.trending}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No sector data available for this market.</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400">Select a market from Layer 2 to see sector breakdown</p>
                      <button
                        onClick={() => setSelectedLayer(2)}
                        className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                      >
                        Go to Layer 2
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Layer 4 Detail */}
              {selectedLayer === 4 && (
                <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/50 dark:border-amber-700/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center text-white text-xs font-bold">4</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Recommendations</h3>
                    {!layer4Unlocked && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                        25 Credits
                      </span>
                    )}
                  </div>

                  {/* Paywall - Show when Layer 4 is NOT unlocked */}
                  {!layer4Unlocked ? (
                    <div className="relative">
                      {/* Blurred Preview */}
                      <div className="blur-sm opacity-50 pointer-events-none select-none">
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-semibold text-emerald-600">BUY Opportunity</span>
                            </div>
                            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                          </div>
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-semibold text-red-600">SELL Opportunity</span>
                            </div>
                            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>

                      {/* Unlock Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white/90 via-white/70 to-transparent dark:from-slate-900/90 dark:via-slate-900/70">
                        <div className="text-center p-6">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                            <Zap className="w-8 h-8 text-white" />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Unlock AI Recommendations
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-xs">
                            Get specific BUY and SELL recommendations with confidence scores and target sectors.
                          </p>
                          <button
                            onClick={unlockLayer4}
                            disabled={unlockingLayer4}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                          >
                            {unlockingLayer4 ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Unlocking...
                              </>
                            ) : (
                              <>
                                <Coins className="w-4 h-4" />
                                Unlock for 25 Credits
                              </>
                            )}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                            Valid for 24 hours
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Unlocked Content - Show BUY and SELL Recommendations */
                    <div className={cn(
                      "grid gap-4",
                      data.sellRecommendation ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                    )}>
                      {/* BUY Recommendation */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">BUY Opportunity</span>
                        </div>
                        <RecommendationCard recommendation={data.recommendation} rotation={data.activeRotation} />
                      </div>

                      {/* SELL Recommendation (if exists) */}
                      {data.sellRecommendation && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">SELL / Short Opportunity</span>
                          </div>
                          <RecommendationCard recommendation={data.sellRecommendation} showRotation={false} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Market Correlations - Collapsible */}
        {data.correlations && data.correlations.correlations.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => setCorrelationsExpanded(!correlationsExpanded)}
              className="w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 hover:border-violet-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Market Correlations</h2>
                    {!correlationsExpanded && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {(() => {
                          const strong = data.correlations!.correlations.filter(c => c.strength === 'strong');
                          const positive = strong.filter(c => c.direction === 'positive').length;
                          const negative = strong.filter(c => c.direction === 'negative').length;
                          const marketNames: Record<string, string> = { crypto: 'Crypto', stocks: 'Stocks', bonds: 'Bonds', metals: 'Metals' };
                          const top = data.correlations!.strongestPositive;
                          return top
                            ? `Strongest: ${marketNames[top.market1]} ↔ ${marketNames[top.market2]} (${Math.round(top.correlation * 100)}%) • ${positive} positive, ${negative} negative`
                            : `${data.correlations!.correlations.length} pairs analyzed`;
                        })()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!correlationsExpanded && (
                    <div className="flex items-center gap-2">
                      {data.correlations.strongestPositive && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          +{Math.round(data.correlations.strongestPositive.correlation * 100)}%
                        </span>
                      )}
                      {data.correlations.strongestNegative && (
                        <span className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold">
                          {Math.round(data.correlations.strongestNegative.correlation * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-400 transition-transform",
                    correlationsExpanded && "rotate-180"
                  )} />
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {correlationsExpanded && (
              <div className="mt-2 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-violet-200/50 dark:border-violet-500/30 rounded-2xl p-4 animate-slide-up">
                {/* Correlation Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {data.correlations.correlations.map((corr, idx) => {
                    const marketNames: Record<string, string> = {
                      crypto: 'Crypto',
                      stocks: 'Stocks',
                      bonds: 'Bonds',
                      metals: 'Metals',
                    };
                    const corrPercent = Math.round(corr.correlation * 100);
                    const isPositive = corr.direction === 'positive';
                    const isNegative = corr.direction === 'negative';

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-xl border transition-all",
                          isPositive
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
                            : isNegative
                            ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {marketNames[corr.market1]} ↔ {marketNames[corr.market2]}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-lg font-bold",
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isNegative
                                ? "text-red-600 dark:text-red-400"
                                : "text-slate-500"
                            )}
                          >
                            {corrPercent > 0 ? '+' : ''}{corrPercent}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              corr.strength === 'strong'
                                ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
                                : corr.strength === 'moderate'
                                ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                : corr.strength === 'weak'
                                ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                            )}
                          >
                            {corr.strength}
                          </span>
                          {isPositive && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                          {isNegative && <TrendingDown className="w-4 h-4 text-red-500" />}
                          {!isPositive && !isNegative && <Minus className="w-4 h-4 text-slate-400" />}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {corr.interpretation}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Correlation Insights */}
                {data.correlations.insights && (
                  <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200/50 dark:border-violet-500/30">
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-violet-700 dark:text-violet-300">
                        {data.correlations.insights}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Trade Opportunities from Rotation - Collapsible */}
        {data.tradeOpportunities && data.tradeOpportunities.opportunities.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => setOpportunitiesExpanded(!opportunitiesExpanded)}
              className="w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 hover:border-teal-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Trade Opportunities</h2>
                    {!opportunitiesExpanded && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {(() => {
                          const marketNames: Record<string, string> = { crypto: 'Crypto', stocks: 'Stocks', bonds: 'Bonds', metals: 'Metals' };
                          const topOpp = data.tradeOpportunities!.opportunities[0];
                          return topOpp
                            ? `Top: ${topOpp.direction} ${marketNames[topOpp.market]} (${topOpp.confidence}% confidence) • ${data.tradeOpportunities!.buyOpportunities} BUY, ${data.tradeOpportunities!.sellOpportunities} SELL`
                            : `${data.tradeOpportunities!.totalOpportunities} opportunities detected`;
                        })()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!opportunitiesExpanded && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        {data.tradeOpportunities.buyOpportunities} BUY
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold">
                        {data.tradeOpportunities.sellOpportunities} SELL
                      </span>
                    </div>
                  )}
                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-400 transition-transform",
                    opportunitiesExpanded && "rotate-180"
                  )} />
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {opportunitiesExpanded && (
              <div className="mt-2 animate-slide-up">
                {/* Rotation Summary */}
                <div className="backdrop-blur-xl bg-gradient-to-r from-teal-50 dark:from-teal-500/10 to-coral-50 dark:to-coral-500/10 border border-teal-200/50 dark:border-teal-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Rotation Analysis</h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{data.tradeOpportunities.rotationSummary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-teal-200/50 dark:border-teal-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{data.tradeOpportunities.buyOpportunities} BUY</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{data.tradeOpportunities.sellOpportunities} SELL</span>
                    </div>
                  </div>
                </div>

                {/* Opportunity Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.tradeOpportunities.opportunities.map((opp, idx) => {
                const isBuy = opp.direction === 'BUY';
                const marketNames: Record<string, string> = {
                  crypto: 'Crypto',
                  stocks: 'Stocks',
                  bonds: 'Bonds',
                  metals: 'Metals',
                };
                const riskColors: Record<string, string> = {
                  low: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
                  medium: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
                  high: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
                };

                return (
                  <div
                    key={idx}
                    className={cn(
                      "backdrop-blur-xl border rounded-2xl p-4 transition-all hover:shadow-lg",
                      isBuy
                        ? "bg-gradient-to-br from-emerald-50 dark:from-emerald-500/10 to-teal-50 dark:to-teal-500/10 border-emerald-200 dark:border-emerald-500/30"
                        : "bg-gradient-to-br from-red-50 dark:from-red-500/10 to-rose-50 dark:to-rose-500/10 border-red-200 dark:border-red-500/30"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          isBuy ? "bg-emerald-500" : "bg-red-500"
                        )}>
                          {isBuy ? <TrendingUp className="w-5 h-5 text-white" /> : <TrendingDown className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-bold text-lg",
                            isBuy ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                          )}>
                            {opp.direction} {marketNames[opp.market]}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              isBuy
                                ? "bg-emerald-200 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                                : "bg-red-200 dark:bg-red-500/30 text-red-800 dark:text-red-200"
                            )}>
                              {opp.flowSignal.toUpperCase()}
                            </span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", riskColors[opp.riskLevel])}>
                              {opp.riskLevel.toUpperCase()} RISK
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Confidence</p>
                        <p className={cn(
                          "text-xl font-bold",
                          isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {opp.confidence}%
                        </p>
                      </div>
                    </div>

                    {/* Reason - WHY this opportunity */}
                    <div className={cn(
                      "mb-3 p-2.5 rounded-lg text-sm leading-relaxed",
                      isBuy
                        ? "bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200"
                        : "bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                    )}>
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{opp.reason}</span>
                      </div>
                    </div>

                    {/* Phase Progress Bar */}
                    {opp.phaseContext && (
                      <div className="mb-3 p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 dark:text-slate-400">
                            {opp.phaseContext.currentPhase.toUpperCase()} Phase
                          </span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {opp.phaseContext.daysInPhase}d / {opp.phaseContext.avgDuration}d avg
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              opp.phaseContext.currentPhase === 'early' ? 'bg-emerald-500' :
                              opp.phaseContext.currentPhase === 'mid' ? 'bg-yellow-500' :
                              opp.phaseContext.currentPhase === 'late' ? 'bg-orange-500' : 'bg-red-500'
                            )}
                            style={{ width: `${opp.phaseContext.phaseProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Correlation Signal */}
                    {opp.correlationInfo && (
                      <div className={cn(
                        "mb-3 p-2 rounded-lg border",
                        opp.correlationInfo.strongestCorrelation.direction === 'negative'
                          ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30"
                          : "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-3.5 h-3.5 text-violet-500" />
                          <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                            Correlation Signal
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {Math.round(opp.correlationInfo.strongestCorrelation.value * 100)}% {opp.correlationInfo.strongestCorrelation.direction} with {marketNames[opp.correlationInfo.strongestCorrelation.market]}
                        </p>
                        {opp.correlationInfo.hedgeSuggestion && (
                          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-medium">
                            Hedge: {marketNames[opp.correlationInfo.hedgeSuggestion.market]}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Related Markets */}
                    {opp.relatedMarkets.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Capital Flow</p>
                        <div className="flex flex-wrap gap-2">
                          {opp.relatedMarkets.map((related, ridx) => (
                            <span
                              key={ridx}
                              className={cn(
                                "text-xs px-2 py-1 rounded-lg font-medium",
                                related.relationship === 'source'
                                  ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                                  : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              )}
                            >
                              {related.relationship === 'source' ? '← From ' : '→ To '}
                              {marketNames[related.market]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Sectors */}
                    {opp.suggestedSectors && opp.suggestedSectors.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                          {isBuy ? 'Hot Sectors' : 'Weak Sectors'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {opp.suggestedSectors.map((sector, sidx) => (
                            <span
                              key={sidx}
                              className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {sector}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    {isBuy ? (
                      <button
                        onClick={() => handleMarketScan(opp.market)}
                        disabled={scanningMarket !== null}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-white transition-all hover:shadow-md",
                          "bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/20",
                          scanningMarket !== null && "opacity-80 cursor-wait"
                        )}
                      >
                        {scanningMarket === opp.market ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scanning... {scanProgress}%
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Find Best {marketNames[opp.market]}
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={`/analyze?asset=${opp.market}`}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-white transition-all hover:shadow-md",
                          "bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-red-500/20"
                        )}
                      >
                        <Target className="w-4 h-4" />
                        View Exiting Positions
                      </Link>
                    )}
                  </div>
                );
              })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Asset Analysis Navigation */}
        <section className="mb-8">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Based on current capital flow analysis, proceed to detailed asset analysis for the recommended market.
            </p>
            <Link
              href={`/analyze?asset=${data.recommendation.primaryMarket}`}
              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-lg hover:shadow-xl hover:shadow-teal-500/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-white" />
                <div>
                  <span className="font-bold text-white text-lg">
                    Start Analysis
                  </span>
                  <p className="text-sm text-white/80">
                    {data.recommendation.primaryMarket === 'crypto' ? '7-Step Classic or MLIS Pro' : 'Asset Analysis'} for {data.recommendation.primaryMarket.charAt(0).toUpperCase() + data.recommendation.primaryMarket.slice(1)}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white" />
            </Link>
          </div>
        </section>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Last updated: {new Date(data.timestamp).toLocaleString()}</p>
          <p className="text-xs mt-1">Data refreshes every 5 minutes. Market data may have delays.</p>
        </div>
      </div>

      {/* Market Analysis Modal */}
      {analysisMarket && (
        <MarketAnalysisModal
          market={analysisMarket}
          analysis={analysisData}
          loading={analysisLoading}
          onClose={() => {
            setAnalysisMarket(null);
            setAnalysisData(null);
          }}
        />
      )}
    </div>
  );
}
