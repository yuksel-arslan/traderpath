'use client';

// ===========================================
// Capital Flow Dashboard
// Global Capital Flow Intelligence Platform
// ===========================================

import React, { useState, useEffect, useRef } from 'react';
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
import { X, Loader2, LineChart, Download, Mail, ChevronUp, CheckCircle, HelpCircle, Lock, Search, Bot, MessageSquare } from 'lucide-react';
import { OnboardingTour, TourTriggerButton, TourStep } from '@/components/onboarding/OnboardingTour';
import { downloadCapitalFlowReport, generateCapitalFlowEmailHTML } from '@/lib/capital-flow-report-generator';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePrompt, UpgradeCard } from '@/components/modals/UpgradePrompt';
import { SubscriptionTier } from '@/hooks/useSubscription';

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

// Helper function to safely filter markets with proper TypeScript typing
function getValidMarkets(markets: MarketFlow[] | undefined | null): MarketFlow[] {
  if (!markets || !Array.isArray(markets)) return [];
  return markets.filter((m): m is MarketFlow => {
    return m !== null && m !== undefined && typeof m.market === 'string';
  });
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
                  trendBg[analysis.trend || 'neutral'],
                  trendColors[analysis.trend || 'neutral']
                )}>
                  {(analysis.trend || 'neutral').toUpperCase()}
                </span>
                <span className="text-sm text-slate-500">
                  Confidence: <span className="font-bold text-slate-900 dark:text-white">{analysis.confidence || 0}%</span>
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

  const signalConfig = config[signal] || config.stable;
  const { color, bg, icon: Icon } = signalConfig;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', bg, color)}>
      <Icon className="w-3 h-3" />
      {(signal || 'stable').toUpperCase()}
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

// Calculate Simple Moving Average
function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      // Not enough data points yet, use available average
      const slice = values.slice(0, i + 1);
      sma.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      sma.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return sma;
}

// Determine chart line color based on trend direction
// Green for uptrend (positive), Red for downtrend (negative), Yellow/Amber for neutral
function getTrendColor(value: number, threshold: number = 0.5): 'emerald' | 'red' | 'amber' {
  if (value > threshold) return 'emerald';  // Uptrend → Green
  if (value < -threshold) return 'red';      // Downtrend → Red
  return 'amber';                            // Neutral → Yellow
}

// Mini Sparkline Chart Component with Moving Averages (smoother, laminar flow)
function MiniSparkline({ data, color, height = 40 }: { data: FlowDataPoint[]; color: 'emerald' | 'blue' | 'red' | 'amber'; height?: number }) {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d.value);

  // Calculate moving averages for smoother lines
  const sma3 = calculateSMA(values, 3);  // 3-day MA (responsive)
  const sma7 = calculateSMA(values, 7);  // 7-day MA (smooth)

  // Use smoothed values for scale calculation
  const allSmoothedValues = [...sma3, ...sma7];
  const min = Math.min(...allSmoothedValues);
  const max = Math.max(...allSmoothedValues);
  const range = max - min || 1;

  const width = 100;
  const padding = 2;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  // Generate path for 7-day SMA (main smooth line)
  const points7d = sma7.map((v, i) => {
    const x = padding + (i / (sma7.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((v - min) / range) * chartHeight;
    return `${x},${y}`;
  });
  const path7d = `M ${points7d.join(' L ')}`;

  // Generate path for 3-day SMA (secondary line)
  const points3d = sma3.map((v, i) => {
    const x = padding + (i / (sma3.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((v - min) / range) * chartHeight;
    return `${x},${y}`;
  });
  const path3d = `M ${points3d.join(' L ')}`;

  // Area path (for gradient fill under 7d line)
  const area7d = `${path7d} L ${padding + chartWidth},${height - padding} L ${padding},${height - padding} Z`;

  const colorMap = {
    emerald: { stroke: '#10b981', strokeLight: '#34d399', fill: 'url(#emeraldGradient)' },
    blue: { stroke: '#3b82f6', strokeLight: '#60a5fa', fill: 'url(#blueGradient)' },
    red: { stroke: '#ef4444', strokeLight: '#f87171', fill: 'url(#redGradient)' },
    amber: { stroke: '#f59e0b', strokeLight: '#fbbf24', fill: 'url(#amberGradient)' },
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
      {/* Gradient fill under 7d MA */}
      <path d={area7d} fill={colorMap[color].fill} />
      {/* 3-day MA - lighter, thinner (recent trend) */}
      <path d={path3d} fill="none" stroke={colorMap[color].strokeLight} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      {/* 7-day MA - main line (smooth trend) */}
      <path d={path7d} fill="none" stroke={colorMap[color].stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
          <p className={cn('text-sm font-bold', (market.flow7d ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {(market.flow7d ?? 0) >= 0 ? '+' : ''}{(market.flow7d ?? 0).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">30D Flow</p>
          <p className={cn('text-sm font-bold', (market.flow30d ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {(market.flow30d ?? 0) >= 0 ? '+' : ''}{(market.flow30d ?? 0).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Velocity</p>
          <p className={cn('text-sm font-bold', (market.flowVelocity ?? 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')}>
            {(market.flowVelocity ?? 0) >= 0 ? '+' : ''}{(market.flowVelocity ?? 0).toFixed(1)}
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
              Money Flow (7d MA)
            </p>
            <MiniSparkline
              data={market.flowHistory}
              color={getTrendColor(market.flow30d ?? 0)}
              height={36}
            />
          </div>
          {/* Velocity Chart */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Flow Velocity (7d MA)
            </p>
            {market.velocityHistory && (
              <MiniSparkline
                data={market.velocityHistory}
                color={getTrendColor(market.flowVelocity ?? 0)}
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
          {(sector.name || 'UN').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">{sector.name || 'Unknown'}</p>
          <p className="text-xs text-slate-500">{(sector.dominance || 0).toFixed(1)}% dominance</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          'font-bold text-sm',
          (sector.flow7d ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        )}>
          {(sector.flow7d ?? 0) >= 0 ? '+' : ''}{(sector.flow7d ?? 0).toFixed(1)}%
        </p>
        <p className="text-xs text-slate-500">7D</p>
      </div>
    </div>
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
              <h3 className="font-bold text-white text-lg">{(recommendation.action || 'wait').toUpperCase()}: {(recommendation.primaryMarket || 'N/A').toUpperCase()}</h3>
              <p className="text-white/80 text-sm">Phase: {(recommendation.phase || 'unknown').toUpperCase()}</p>
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
                <span className="font-bold text-slate-900 dark:text-white">{(rotation.from || 'N/A').toUpperCase()}</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{(rotation.to || 'N/A').toUpperCase()}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Est. Duration</p>
                <p className="font-medium text-slate-900 dark:text-white">{rotation.estimatedDuration || 'N/A'}</p>
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

// ============================================
// Capital Flow Mind Map Components (from Landing)
// ============================================

// Typewriter Effect Component
function TypewriterText({ text, delay = 0, speed = 30, className = '' }: { text: string; delay?: number; speed?: number; className?: string }) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [started, text, speed]);

  return <span className={className}>{displayText}<span className="animate-pulse">|</span></span>;
}

// Animated Flow Line Component
function FlowLine({ expanded, color1, color2 }: { expanded: boolean; color1: string; color2: string }) {
  return (
    <div className={`flex justify-center mb-4 transition-all duration-500 ${expanded ? 'opacity-100 h-12' : 'opacity-50 h-6'}`}>
      <div className="relative">
        {/* Main line */}
        <div className={`w-1 h-full bg-gradient-to-b ${color1} ${color2} rounded-full shadow-lg`} />
        {/* Animated flowing particles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg animate-flow-down" style={{ animationDuration: '1.5s' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/80 shadow-md animate-flow-down" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/60 shadow animate-flow-down" style={{ animationDuration: '1.5s', animationDelay: '1s' }} />
      </div>
    </div>
  );
}

// Live Capital Flow Data Interface for Mind Map
interface MindMapFlowData {
  liquidity: {
    fedStatus: string;
    m2Change: string;
    dxyStatus: string;
    vixLevel: string;
    bias: string;
  };
  markets: {
    name: string;
    flow7d: number;
    phase: string;
    isSelected: boolean;
  }[];
  lastUpdated: string;
}

// Format flow percentage to max 2 decimal places
function formatMindMapFlow(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// System Flow Chart - Mind Map Component
function SystemFlowChart({
  apiData,
  onLayerClick,
  onMarketClick,
  layer3Unlocked = true,
  layer4Unlocked = true,
  currentTier = 'free' as SubscriptionTier,
}: {
  apiData: CapitalFlowSummary | null;
  onLayerClick?: (layer: number) => void;
  onMarketClick?: (marketName: string) => void;
  layer3Unlocked?: boolean;
  layer4Unlocked?: boolean;
  currentTier?: SubscriptionTier;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<{ [key: number]: boolean }>({
    1: true,
    2: false,
    3: false,
    4: false,
  });
  const [showTypewriter, setShowTypewriter] = useState<{ [key: number]: boolean }>({});
  const chartRef = useRef<HTMLDivElement>(null);

  // Transform API data to mind map format
  const flowData: MindMapFlowData | null = apiData ? {
    liquidity: {
      fedStatus: apiData.globalLiquidity.fedBalanceSheet.trend === 'expanding' ? 'Expanding' : 'Contracting',
      m2Change: apiData.globalLiquidity.m2MoneySupply.yoyGrowth != null
        ? `${apiData.globalLiquidity.m2MoneySupply.yoyGrowth > 0 ? '+' : ''}${apiData.globalLiquidity.m2MoneySupply.yoyGrowth.toFixed(1)}%`
        : '+2.1%',
      dxyStatus: apiData.globalLiquidity.dxy.trend === 'weakening' ? 'Weak ↓' : 'Strong ↑',
      vixLevel: apiData.globalLiquidity.vix.value ? `${apiData.globalLiquidity.vix.level?.replace('_', ' ') || 'low'} (${Math.round(apiData.globalLiquidity.vix.value)})` : 'Low (14)',
      bias: apiData.liquidityBias || 'risk_on',
    },
    markets: getValidMarkets(apiData.markets).map((m) => ({
      name: m.market.toUpperCase(),
      flow7d: m.flow7d || 0,
      phase: m.phase || 'mid',
      isSelected: m.market === apiData.recommendation?.primaryMarket,
    })),
    lastUpdated: new Date().toLocaleTimeString(),
  } : null;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-expand layers sequentially when visible
  useEffect(() => {
    if (isVisible) {
      const timers = [
        setTimeout(() => {
          setExpandedLayers(prev => ({ ...prev, 1: true }));
          setShowTypewriter(prev => ({ ...prev, 1: true }));
        }, 500),
        setTimeout(() => {
          setExpandedLayers(prev => ({ ...prev, 2: true }));
          setShowTypewriter(prev => ({ ...prev, 2: true }));
        }, 1500),
        setTimeout(() => {
          setExpandedLayers(prev => ({ ...prev, 3: true }));
          setShowTypewriter(prev => ({ ...prev, 3: true }));
        }, 2500),
        setTimeout(() => {
          setExpandedLayers(prev => ({ ...prev, 4: true }));
          setShowTypewriter(prev => ({ ...prev, 4: true }));
        }, 3500),
      ];
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isVisible]);

  const toggleLayer = (layer: number) => {
    const newExpanded = !expandedLayers[layer];
    setExpandedLayers(prev => ({ ...prev, [layer]: newExpanded }));
    if (newExpanded) {
      setShowTypewriter(prev => ({ ...prev, [layer]: true }));
    }
  };

  // Helper to get phase badge color
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'early': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      case 'mid': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'late': return 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'exit': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      default: return 'bg-slate-500/20 text-slate-600 dark:text-slate-400';
    }
  };

  const isLoadingData = !apiData;

  return (
    <section className="py-8 md:py-12 relative overflow-hidden" ref={chartRef}>
      <div className="relative z-10">
        {/* Header - Follow The Money Principle */}
        <div className={`text-center mb-6 md:mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-block backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 border-2 border-transparent bg-clip-padding rounded-2xl px-6 py-4 shadow-xl relative overflow-hidden">
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-orange-500 opacity-20" />
            <div className="absolute inset-[2px] rounded-2xl bg-white dark:bg-slate-800" />
            <div className="relative">
              <p className="text-lg md:text-xl bg-gradient-to-r from-teal-500 to-orange-500 bg-clip-text text-transparent font-bold mb-1">
                "Follow The Money" Principle
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click each layer to expand/collapse
              </p>
            </div>
          </div>
        </div>

        {/* MIND MAP LAYOUT */}
        <div className="relative max-w-6xl mx-auto">

          {/* CENTER: Main Question - Corporate Gradient */}
          <div className={`flex justify-center mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <div className="relative">
              {/* Multiple pulsing rings with teal/coral */}
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-teal-500/30 via-emerald-500/20 to-orange-500/30 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-teal-500/20 to-orange-500/20 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/10 via-transparent to-teal-500/10 animate-spin" style={{ animationDuration: '8s' }} />

              <div className="relative backdrop-blur-xl bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-600 rounded-full p-6 md:p-8 shadow-2xl shadow-teal-500/40 border border-white/20">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 md:w-10 md:h-10 text-white mx-auto mb-2 drop-shadow-lg" />
                  <p className="text-white/90 font-bold text-sm md:text-base">Where Is</p>
                  <p className="text-white font-bold text-lg md:text-xl drop-shadow-md">Money Flowing?</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connector from center - Gradient */}
          <div className={`flex justify-center mb-4 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-1 h-8 bg-gradient-to-b from-teal-500 via-emerald-500 to-teal-400 rounded-full shadow-lg shadow-teal-500/30" />
          </div>

          {/* LAYER 1: Global Liquidity - Collapsible */}
          <div className={`mb-4 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header - Corporate Teal Gradient */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(1)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/20 ${expandedLayers[1] ? 'ring-2 ring-teal-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/30">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">LAYER 1: Global Liquidity</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"Is liquidity expanding or contracting?"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[1] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-teal-500" />
                  </div>
                  {/* Quick Answer Badge - Gradient */}
                  {!expandedLayers[1] && (
                    <span className={cn(
                      "ml-2 px-3 py-1 text-white text-xs font-bold rounded-full shadow-lg animate-pulse",
                      flowData?.liquidity.bias === 'risk_on' ? 'bg-emerald-500 shadow-emerald-500/30' :
                      flowData?.liquidity.bias === 'risk_off' ? 'bg-red-500 shadow-red-500/30' :
                      'bg-yellow-500 shadow-yellow-500/30'
                    )}>
                      {flowData?.liquidity.bias === 'risk_on' ? 'RISK ON' : flowData?.liquidity.bias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content - Collapsible with Typewriter Effect */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[1] ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                {/* Data Points with Live Data & Typewriter */}
                <div className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  {isLoadingData ? (
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-4 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Fed:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.fedStatus || 'Expanding'}
                            delay={0}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.fedStatus || 'Expanding'}</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">M2:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.m2Change || '+2.1%'}
                            delay={200}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.m2Change || '+2.1%'}</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">DXY:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.dxyStatus || 'Weak ↓'}
                            delay={400}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.dxyStatus || 'Weak ↓'}</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">VIX:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.vixLevel || 'Low (14)'}
                            delay={600}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.vixLevel || 'Low (14)'}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {flowData?.lastUpdated && (
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                      Live • Updated {flowData.lastUpdated}
                    </p>
                  )}
                </div>

                {/* Animated Arrow */}
                <div className="hidden md:block relative">
                  <ArrowRight className="w-6 h-6 text-teal-500 animate-pulse" />
                  <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-md animate-ping" style={{ animationDuration: '2s' }} />
                </div>

                {/* Answer */}
                <div className={cn(
                  "backdrop-blur-xl border-2 rounded-xl p-4 shadow-lg ring-2",
                  flowData?.liquidity.bias === 'risk_on'
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-500/50 ring-emerald-500/20"
                    : flowData?.liquidity.bias === 'risk_off'
                    ? "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-red-500/50 ring-red-500/20"
                    : "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-500/50 ring-yellow-500/20"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className={cn(
                      "w-5 h-5",
                      flowData?.liquidity.bias === 'risk_on' ? 'text-emerald-500' :
                      flowData?.liquidity.bias === 'risk_off' ? 'text-red-500' :
                      'text-yellow-500'
                    )} />
                    <span className={`px-3 py-1 text-white text-sm font-bold rounded-full ${
                      flowData?.liquidity.bias === 'risk_on'
                        ? 'bg-emerald-500'
                        : flowData?.liquidity.bias === 'risk_off'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}>
                      {flowData?.liquidity.bias === 'risk_on' ? 'RISK ON' : flowData?.liquidity.bias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {flowData?.liquidity.bias === 'risk_on'
                      ? 'Liquidity expanding → Risk assets favored'
                      : flowData?.liquidity.bias === 'risk_off'
                      ? 'Liquidity contracting → Safe havens favored'
                      : 'Mixed signals → Wait for clarity'}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Connector to Layer 2 - Animated Flow Line */}
          <FlowLine expanded={expandedLayers[1]} color1="from-teal-400" color2="to-cyan-500" />

          {/* LAYER 2: Market Selection - Corporate Blue/Cyan Gradient */}
          <div className={`mb-4 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(2)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 ${expandedLayers[2] ? 'ring-2 ring-cyan-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">LAYER 2: Market Flow</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"Which market is receiving the most flow?"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[2] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-cyan-500" />
                  </div>
                  {!expandedLayers[2] && flowData?.markets.find(m => m.isSelected) && (
                    <span className="ml-2 px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30 animate-pulse">
                      {flowData.markets.find(m => m.isSelected)?.name} {formatMindMapFlow(flowData.markets.find(m => m.isSelected)?.flow7d || 0)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content with Live Market Data */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[2] ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              {/* Market Options - Dynamic from API */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-4">
                {isLoadingData ? (
                  // Loading skeleton
                  [1,2,3,4].map(i => (
                    <div key={i} className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-700/50 rounded-xl p-3 animate-pulse">
                      <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded mb-2" />
                      <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2 mx-auto" />
                    </div>
                  ))
                ) : (
                  // Fallback markets if API fails
                  (flowData?.markets.length ? flowData.markets : [
                    { name: 'STOCKS', flow7d: 5, phase: 'mid', isSelected: false },
                    { name: 'BONDS', flow7d: -2, phase: 'exit', isSelected: false },
                    { name: 'CRYPTO', flow7d: 8, phase: 'early', isSelected: true },
                    { name: 'METALS', flow7d: 1, phase: 'late', isSelected: false },
                  ]).map((market, idx) => (
                    <div
                      key={market.name}
                      onClick={() => onMarketClick?.(market.name.toLowerCase())}
                      className={`backdrop-blur-xl rounded-xl p-3 text-center transition-all duration-500 cursor-pointer hover:scale-105 group relative ${
                        market.isSelected
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg scale-105'
                          : 'bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20'
                      }`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      {/* Details indicator on hover */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-cyan-500" />
                      </div>
                      <div className={`font-bold text-sm mb-1 ${market.isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400'}`}>
                        {showTypewriter[2] ? (
                          <TypewriterText text={market.name} delay={idx * 150} speed={40} />
                        ) : market.name}
                      </div>
                      <div className={`text-xs font-mono font-bold ${
                        market.flow7d > 0 ? 'text-emerald-500' : market.flow7d < 0 ? 'text-red-500' : 'text-slate-500'
                      }`}>
                        {showTypewriter[2] ? (
                          <TypewriterText
                            text={formatMindMapFlow(market.flow7d)}
                            delay={idx * 150 + 200}
                            speed={60}
                          />
                        ) : formatMindMapFlow(market.flow7d)}
                      </div>
                      <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${getPhaseColor(market.phase || 'mid')}`}>
                        {(market.phase || 'mid').toUpperCase()}
                      </div>
                      {market.isSelected && <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mt-1 animate-bounce" />}
                    </div>
                  ))
                )}
              </div>

              {/* Answer with Selected Market */}
              <div className="flex justify-center">
                <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full">
                      {flowData?.markets.find(m => m.isSelected)?.name || 'CRYPTO'}
                    </span>
                    {showTypewriter[2] ? (
                      <TypewriterText
                        text={`${flowData?.markets.find(m => m.isSelected)?.phase || 'early'} phase • ${formatMindMapFlow(flowData?.markets.find(m => m.isSelected)?.flow7d ?? 8)} flow`}
                        delay={800}
                        speed={30}
                        className="text-xs text-slate-600 dark:text-slate-300 font-mono"
                      />
                    ) : (
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {flowData?.markets.find(m => m.isSelected)?.phase || 'early'} phase • {formatMindMapFlow(flowData?.markets.find(m => m.isSelected)?.flow7d ?? 8)} flow
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Connector to Layer 3 - Animated Flow Line */}
          <FlowLine expanded={expandedLayers[2]} color1="from-cyan-500" color2="to-violet-500" />

          {/* LAYER 3: Sector Drill-Down - UNLOCKED */}
          <div className={`mb-4 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(3)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 ${expandedLayers[3] ? 'ring-2 ring-purple-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-purple-500/30">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">LAYER 3: Sector Drill-Down</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"Which sector within the market?"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[3] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-purple-500" />
                  </div>
                  {!expandedLayers[3] && (
                    <span className="ml-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-500/30">
                      SECTOR ACTIVITY
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content - Sector Data */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[3] ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              {!layer3Unlocked ? (
                <div className="max-w-md mx-auto">
                  <UpgradeCard
                    feature="capital_flow_l3"
                    currentTier={currentTier}
                    message="Unlock Sector Activity to see which sectors are receiving capital inflows within each market."
                  />
                </div>
              ) : apiData?.markets.find(m => m.market === apiData.recommendation?.primaryMarket)?.sectors ? (
                <div className="max-w-3xl mx-auto">
                  <p className="text-xs text-center text-slate-500 mb-3">
                    Showing sectors for <strong className="text-purple-600 dark:text-purple-400 capitalize">{apiData.recommendation?.primaryMarket}</strong>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {apiData.markets.find(m => m.market === apiData.recommendation?.primaryMarket)?.sectors?.slice(0, 6).map((sector, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "backdrop-blur-xl rounded-xl p-3 border transition-all",
                          sector.trending === 'up'
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30"
                            : sector.trending === 'down'
                            ? "bg-red-50 dark:bg-red-500/10 border-red-500/30"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">{sector.name}</span>
                          <span className={cn(
                            "text-xs font-bold",
                            sector.flow7d > 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {sector.flow7d > 0 ? '+' : ''}{sector.flow7d.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className={`px-1.5 py-0.5 rounded ${getPhaseColor(sector.phase || 'mid')}`}>{(sector.phase || 'mid').toUpperCase()}</span>
                          <span className="capitalize">{sector.trending || 'stable'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Select a market to view sector breakdown</p>
                </div>
              )}

            </div>
          </div>

          {/* Connector to Layer 4 - Animated Flow Line */}
          <FlowLine expanded={expandedLayers[3]} color1="from-violet-500" color2="to-amber-500" />

          {/* LAYER 4: AI Recommendations - UNLOCKED */}
          <div className={`mb-6 transition-all duration-700 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(4)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 ${expandedLayers[4] ? 'ring-2 ring-amber-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">LAYER 4: AI Recommendations</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"BUY/SELL signals with confidence"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[4] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-amber-500" />
                  </div>
                  {!expandedLayers[4] && apiData?.recommendation && (
                    <span className={cn(
                      "ml-2 px-3 py-1 text-white text-xs font-bold rounded-full shadow-lg",
                      apiData.recommendation.direction === 'BUY'
                        ? "bg-emerald-500 shadow-emerald-500/30"
                        : "bg-red-500 shadow-red-500/30"
                    )}>
                      {apiData.recommendation.direction || 'BUY'} {(apiData.recommendation.primaryMarket || 'N/A').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content - AI Recommendations */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[4] ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              {!layer4Unlocked ? (
                <div className="max-w-md mx-auto">
                  <UpgradeCard
                    feature="capital_flow_l4"
                    currentTier={currentTier}
                    message="Unlock AI Recommendations to get BUY/SELL signals with confidence scores and suggested assets."
                  />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BUY Opportunity */}
                  {apiData?.recommendation && (
                    <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-500" />
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">BUY Opportunity</span>
                        </div>
                        <span className="text-2xl font-bold text-emerald-600">{apiData.recommendation.confidence}%</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Market</span>
                          <span className="font-semibold text-slate-900 dark:text-white capitalize">{apiData.recommendation.primaryMarket}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phase</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPhaseColor(apiData.recommendation.phase || 'mid')}`}>
                            {(apiData.recommendation.phase || 'mid').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-emerald-500/20">
                          {apiData.recommendation.reason || 'Analysis in progress...'}
                        </p>
                        <Link
                          href={`/analyze?market=${apiData.recommendation.primaryMarket}`}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-emerald-500/25"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Asset Analysis
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* SELL Opportunity */}
                  {apiData?.sellRecommendation && (
                    <div className="backdrop-blur-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-5 h-5 text-red-500" />
                          <span className="font-bold text-red-600 dark:text-red-400">SELL Opportunity</span>
                        </div>
                        <span className="text-2xl font-bold text-red-600">{apiData.sellRecommendation.confidence}%</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Market</span>
                          <span className="font-semibold text-slate-900 dark:text-white capitalize">{apiData.sellRecommendation.primaryMarket}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phase</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPhaseColor(apiData.sellRecommendation.phase || 'late')}`}>
                            {(apiData.sellRecommendation.phase || 'late').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-red-500/20">
                          {apiData.sellRecommendation.reason || 'Analysis in progress...'}
                        </p>
                        <Link
                          href={`/analyze?market=${apiData.sellRecommendation.primaryMarket}`}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-rose-600 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-red-500/25"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Asset Analysis
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// Main Component
export default function CapitalFlowPage() {
  const router = useRouter();
  const [data, setData] = useState<CapitalFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketFlow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [correlationsExpanded, setCorrelationsExpanded] = useState(false);

  // Feature gate for premium layers
  const {
    hasAccess,
    showUpgradePrompt,
    promptFeature,
    openUpgradePrompt,
    closeUpgradePrompt,
    currentTier,
    isFreeTier,
  } = useFeatureGate();

  // Check if user has access to premium layers
  const layer3Unlocked = hasAccess('capital_flow_l3');
  const layer4Unlocked = hasAccess('capital_flow_l4');

  // Fullscreen layer modal state
  const [fullscreenLayer, setFullscreenLayer] = useState<number | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // Market Analysis Modal state
  const [analysisMarket, setAnalysisMarket] = useState<MarketFlow | null>(null);
  const [analysisData, setAnalysisData] = useState<MarketAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Market scan states
  type ScanningMarket = 'crypto' | 'stocks' | 'bonds' | 'metals' | null;
  const [scanningMarket, setScanningMarket] = useState<ScanningMarket>(null);
  const [scanProgress, setScanProgress] = useState(0);

  // Export states
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // AI Concierge modal state
  const [showConciergeModal, setShowConciergeModal] = useState(false);

  // Ref for fullscreen modal
  const contentRef = useRef<HTMLDivElement>(null);

  // Tour steps for Capital Flow page
  const capitalFlowTourSteps: TourStep[] = [
    {
      target: '#tour-hero-section',
      title: 'Welcome to Capital Flow',
      content: 'Track global money flow across markets. Follow the principle: "Where money flows, potential exists."',
      placement: 'bottom',
      spotlightPadding: 20,
    },
    {
      target: '#tour-layer-1',
      title: 'Layer 1: Global Liquidity',
      content: 'Monitor Fed Balance Sheet, M2 Money Supply, DXY (Dollar Index), and VIX. These macro indicators show the overall liquidity environment.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-layer-2',
      title: 'Layer 2: Market Flow',
      content: 'See which markets (Crypto, Stocks, Bonds, Metals) are receiving capital inflows. The top market indicates where smart money is flowing.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-layer-3',
      title: 'Layer 3: Sector Activity',
      content: 'Drill down into specific sectors (DeFi, L2, Tech, etc.). See which sectors are hot and which are cooling down.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-layer-4',
      title: 'Layer 4: AI Recommendations',
      content: 'Get AI-powered BUY/SELL recommendations based on flow analysis. Shows phase (Early/Mid/Late/Exit) and confidence level.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
  ];

  // Download Professional PDF Report
  const handleDownloadReport = async () => {
    if (!data || downloadingReport) return;

    setDownloadingReport(true);
    try {
      await downloadCapitalFlowReport({
        globalLiquidity: data.globalLiquidity,
        liquidityBias: data.liquidityBias,
        markets: data.markets,
        recommendation: data.recommendation,
        timestamp: data.timestamp,
      });
    } catch (err) {
      console.error('Failed to download report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Send Professional Email Report
  const handleEmailReport = async () => {
    if (!data || sendingEmail) return;

    setSendingEmail(true);
    try {
      const emailHTML = generateCapitalFlowEmailHTML({
        globalLiquidity: data.globalLiquidity,
        liquidityBias: data.liquidityBias,
        markets: data.markets,
        recommendation: data.recommendation,
        timestamp: data.timestamp,
      });

      const response = await authFetch('/api/reports/send-capital-flow-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: emailHTML,
          subject: `TraderPath Capital Flow Report - ${data.recommendation?.direction || 'Analysis'} Signal`,
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Layer names for fullscreen modal
  const layerNames: Record<number, string> = {
    1: 'Global_Liquidity',
    2: 'Market_Flow',
    3: 'Sector_Activity',
    4: 'AI_Recommendations',
  };

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

  // Show AI Concierge modal once per session
  useEffect(() => {
    const hasSeenConciergeModal = sessionStorage.getItem('capitalFlowConciergeModalShown');
    if (!hasSeenConciergeModal) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShowConciergeModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConciergeModalClose = () => {
    sessionStorage.setItem('capitalFlowConciergeModalShown', 'true');
    setShowConciergeModal(false);
  };

  const handleGoToConcierge = () => {
    sessionStorage.setItem('capitalFlowConciergeModalShown', 'true');
    setShowConciergeModal(false);
    router.push('/concierge');
  };

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
      {/* Onboarding Tour */}
      <OnboardingTour
        steps={capitalFlowTourSteps}
        tourId="capital-flow"
        autoStart={true}
      />

      {/* AI Concierge Continuation Modal */}
      {showConciergeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
            {/* Close button */}
            <button
              onClick={handleConciergeModalClose}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal content */}
            <div className="p-6 pt-8">
              {/* Header with gradient icon */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Try AI Concierge
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get instant analysis with natural language commands
                </p>
              </div>

              {/* Feature highlights */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <MessageSquare className="w-5 h-5 text-teal-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Ask questions like "How is BTC doing?"
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Get instant AI-powered market insights
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <Target className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Receive trade recommendations in seconds
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleGoToConcierge}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Bot className="w-5 h-5" />
                  Continue with AI Concierge
                </button>
                <button
                  onClick={handleConciergeModalClose}
                  className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Stay on Capital Flow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Layer Modal */}
      {fullscreenLayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full h-full max-w-7xl max-h-[95vh] m-4 bg-slate-900 rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                  fullscreenLayer === 1 ? 'bg-blue-500' :
                  fullscreenLayer === 2 ? 'bg-emerald-500' :
                  fullscreenLayer === 3 ? 'bg-purple-500' : 'bg-amber-500'
                )}>
                  {fullscreenLayer}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {fullscreenLayer === 1 ? 'Global Liquidity Tracker' :
                   fullscreenLayer === 2 ? 'Market Flow Analyzer' :
                   fullscreenLayer === 3 ? 'Sector Drill-Down' : 'AI Recommendations'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Download Report Icon */}
                <button
                  onClick={handleDownloadReport}
                  disabled={downloadingReport || !data}
                  className={cn(
                    "p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-teal-400 transition",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  title="Download Report"
                >
                  {downloadingReport ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>

                {/* Email Report Icon */}
                <button
                  onClick={handleEmailReport}
                  disabled={sendingEmail || !data}
                  className={cn(
                    "p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    emailSent ? "text-green-400" : "text-slate-400 hover:text-violet-400"
                  )}
                  title={emailSent ? "Email Sent!" : "Email Report"}
                >
                  {sendingEmail ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : emailSent ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setFullscreenLayer(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div ref={fullscreenRef} data-fullscreen-container className="flex-1 overflow-y-auto p-6 bg-slate-900">
              {/* Layer 1: Global Liquidity */}
              {fullscreenLayer === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
                      value={(data.globalLiquidity.vix.value || 0).toFixed(2)}
                      icon={Activity}
                      info={`Market sentiment: ${(data.globalLiquidity.vix.level || 'neutral').replace('_', ' ').toUpperCase()}`}
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

              {/* Layer 2: Market Flow */}
              {fullscreenLayer === 2 && (
                <div className="space-y-6">
                  {selectedMarket ? (
                    // Show only the selected market's details
                    <div className="space-y-6">
                      {/* Back button to show all markets */}
                      <button
                        onClick={() => setSelectedMarket(null)}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back to all markets
                      </button>

                      {/* Selected Market Card - Large Version */}
                      <div className="max-w-2xl mx-auto">
                        <MarketCard
                          market={selectedMarket}
                          onClick={() => {}}
                          onAnalyze={() => fetchMarketAnalysis(selectedMarket)}
                        />
                      </div>

                      {/* Sectors for selected market */}
                      {selectedMarket.sectors && selectedMarket.sectors.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-400" />
                            {selectedMarket.market.charAt(0).toUpperCase() + selectedMarket.market.slice(1)} Sectors
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {selectedMarket.sectors.map((sector, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "p-4 rounded-xl border transition-all",
                                  sector.trending === 'up'
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : sector.trending === 'down'
                                    ? "bg-red-500/10 border-red-500/30"
                                    : "bg-slate-800/50 border-slate-700"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-white">{sector.name}</span>
                                  <span className={cn(
                                    "text-sm font-bold",
                                    (sector.flow7d ?? 0) > 0 ? "text-emerald-400" : "text-red-400"
                                  )}>
                                    {(sector.flow7d ?? 0) > 0 ? '+' : ''}{(sector.flow7d ?? 0).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <span>Phase: {sector.phase || 'mid'}</span>
                                  <span>•</span>
                                  <span className="capitalize">{sector.trending || 'stable'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Show all markets grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {getValidMarkets(data.markets).map((market) => (
                          <MarketCard
                            key={market.market}
                            market={market}
                            onClick={() => setSelectedMarket(market)}
                            onAnalyze={() => fetchMarketAnalysis(market)}
                          />
                      ))}
                    </div>
                  )}
                  {data.insights?.layer2 && <InsightBox insight={data.insights.layer2} icon={Sparkles} />}
                </div>
              )}

              {/* Layer 3: Sector Activity */}
              {fullscreenLayer === 3 && (
                <div className="space-y-6">
                  {selectedMarket ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-400">
                        Showing sectors for <strong className="capitalize text-white">{selectedMarket.market}</strong>
                      </p>
                      {selectedMarket.sectors && selectedMarket.sectors.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedMarket.sectors.map((sector, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-4 rounded-xl border transition-all",
                                sector.trending === 'up'
                                  ? "bg-emerald-500/10 border-emerald-500/30"
                                  : sector.trending === 'down'
                                  ? "bg-red-500/10 border-red-500/30"
                                  : "bg-slate-800/50 border-slate-700"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-white">{sector.name}</span>
                                <span className={cn(
                                  "text-sm font-bold",
                                  sector.flow7d > 0 ? "text-emerald-400" : "text-red-400"
                                )}>
                                  {sector.flow7d > 0 ? '+' : ''}{sector.flow7d.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>Phase: {sector.phase}</span>
                                <span>•</span>
                                <span className="capitalize">{sector.trending}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No sector data available for this market.</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                      <p className="text-slate-400">Select a market from Layer 2 to see sector breakdown</p>
                      <button
                        onClick={() => setFullscreenLayer(2)}
                        className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                      >
                        Go to Layer 2
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Layer 4: AI Recommendations */}
              {fullscreenLayer === 4 && (
                <div className="space-y-6">
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                      {/* BUY Opportunity */}
                      <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-emerald-400">BUY Opportunity</h4>
                            <p className="text-xs text-slate-400">Capital entering this market</p>
                          </div>
                          <span className="ml-auto text-2xl font-bold text-emerald-400">
                            {data.recommendation?.confidence || 0}%
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Primary Market</span>
                            <span className="font-semibold text-white capitalize">{data.recommendation?.primaryMarket || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Phase</span>
                            <span className="font-semibold text-white uppercase">{data.recommendation?.phase || 'N/A'}</span>
                          </div>
                          <p className="text-sm text-slate-300 pt-2 border-t border-emerald-500/20">
                            {data.recommendation?.reason || 'No recommendation available'}
                          </p>
                          <Link
                            href={`/analyze?market=${data.recommendation?.primaryMarket || 'crypto'}`}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-emerald-500/30"
                          >
                            <Search className="w-4 h-4" />
                            Asset Analysis
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>

                      {/* SELL Opportunity */}
                      {data.sellRecommendation && (
                        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                              <TrendingDown className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-red-400">SELL Opportunity</h4>
                              <p className="text-xs text-slate-400">Capital exiting this market</p>
                            </div>
                            <span className="ml-auto text-2xl font-bold text-red-400">
                              {data.sellRecommendation.confidence}%
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">Market</span>
                              <span className="font-semibold text-white capitalize">{data.sellRecommendation.primaryMarket}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">Phase</span>
                              <span className="font-semibold text-white uppercase">{data.sellRecommendation.phase}</span>
                            </div>
                            <p className="text-sm text-slate-300 pt-2 border-t border-red-500/20">
                              {data.sellRecommendation.reason}
                            </p>
                            <Link
                              href={`/analyze?market=${data.sellRecommendation.primaryMarket}`}
                              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-semibold rounded-xl hover:from-red-600 hover:to-rose-600 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-red-500/30"
                            >
                              <Search className="w-4 h-4" />
                              Asset Analysis
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  {data.insights?.layer4 && <InsightBox insight={data.insights.layer4} icon={Brain} />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <GrainOverlay />
      <GradientOrbs />

      <div ref={contentRef} data-export-container className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* ===== HERO SECTION with Kinetic Typography ===== */}
        <div id="tour-hero-section" className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6 mb-8">
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

          {/* Liquidity Badge, Refresh and Export */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <LiquidityBiasBadge bias={data.liquidityBias} />
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className={cn(
                "p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm",
                refreshing && "opacity-50 cursor-not-allowed"
              )}
              title="Refresh"
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-500", refreshing && "animate-spin")} />
            </button>

            {/* Download Report Icon */}
            <button
              onClick={handleDownloadReport}
              disabled={downloadingReport || !data}
              className={cn(
                "p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Download Report"
            >
              {downloadingReport ? (
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-teal-500" />
              )}
            </button>

            {/* Email Report Icon */}
            <button
              onClick={handleEmailReport}
              disabled={sendingEmail || !data}
              className={cn(
                "p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                emailSent && "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
              )}
              title={emailSent ? "Email Sent!" : "Email Report"}
            >
              {sendingEmail ? (
                <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
              ) : emailSent ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Mail className="w-5 h-5 text-violet-500" />
              )}
            </button>

            {/* Tour Trigger Button */}
            <TourTriggerButton tourId="capital-flow" />
          </div>
        </div>

        {/* ===== MIND MAP - Interactive Capital Flow Visualization ===== */}
        <SystemFlowChart
          apiData={data}
          onLayerClick={setFullscreenLayer}
          onMarketClick={(marketName) => {
            const market = data.markets.find(m => m.market === marketName);
            if (market) {
              setSelectedMarket(market);
              setFullscreenLayer(2);
            }
          }}
          layer3Unlocked={layer3Unlocked}
          layer4Unlocked={layer4Unlocked}
          currentTier={currentTier}
        />


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
                    7-Step Analysis with AI Confirmation for {(data.recommendation?.primaryMarket || 'market').charAt(0).toUpperCase() + (data.recommendation?.primaryMarket || 'market').slice(1)}
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

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && promptFeature && (
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={closeUpgradePrompt}
          feature={promptFeature}
          currentTier={currentTier}
        />
      )}
    </div>
  );
}
