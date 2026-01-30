'use client';

// ===========================================
// Capital Flow Dashboard
// "Para nereye akıyorsa potansiyel oradadır"
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
  Layers,
  Zap,
  Sparkles,
  Brain,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  topAssets: string[];
}

interface MarketFlow {
  market: 'crypto' | 'stocks' | 'bonds' | 'metals';
  currentValue: number;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
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

interface CapitalFlowSummary {
  timestamp: string;
  globalLiquidity: GlobalLiquidity;
  liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
  activeRotation: ActiveRotation | null;
  insights?: LayerInsights;
  cacheExpiry: string;
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

// Market Card Component
function MarketCard({ market, onClick }: { market: MarketFlow; onClick: () => void }) {
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
      onClick={onClick}
      className="group relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
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
        <div className="flex flex-wrap gap-1.5">
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

      {/* Hover Arrow */}
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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

// Recommendation Card
function RecommendationCard({ recommendation, rotation }: { recommendation: FlowRecommendation; rotation: ActiveRotation | null }) {
  const actionConfig: Record<string, { bg: string; color: string; icon: any }> = {
    analyze: { bg: 'from-emerald-500 to-teal-500', color: 'text-white', icon: Target },
    wait: { bg: 'from-yellow-500 to-amber-500', color: 'text-white', icon: Clock },
    avoid: { bg: 'from-red-500 to-rose-500', color: 'text-white', icon: AlertTriangle },
  };

  const config = actionConfig[recommendation.action] || actionConfig.wait;

  return (
    <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header with Action */}
      <div className={cn('bg-gradient-to-r p-4', config.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <config.icon className="w-6 h-6 text-white" />
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

        {/* Recommended Sectors */}
        {recommendation.sectors && recommendation.sectors.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">Recommended Sectors</p>
            <div className="flex flex-wrap gap-2">
              {recommendation.sectors.map((sector) => (
                <span key={sector} className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  {sector}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active Rotation */}
        {rotation && (
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
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
          >
            <Zap className="w-4 h-4" />
            Start Analysis
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
  const [refreshing, setRefreshing] = useState(false);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Capital Flow Radar</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              "Para nereye akiyorsa potansiyel oradadir" - Where money flows, potential exists
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LiquidityBiasBadge bias={data.liquidityBias} />
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className={cn(
                "p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                refreshing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-500", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* LAYER 1: Global Liquidity */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">1</div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">LAYER 1: Global Liquidity Tracker</h2>
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
          {/* AI Insight for Layer 1 */}
          {data.insights?.layer1 && <InsightBox insight={data.insights.layer1} icon={Brain} />}
        </section>

        {/* LAYER 2: Market Flow */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-white text-xs font-bold">2</div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">LAYER 2: Market Flow Analyzer</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.markets.map((market) => (
              <MarketCard
                key={market.market}
                market={market}
                onClick={() => setSelectedMarket(selectedMarket?.market === market.market ? null : market)}
              />
            ))}
          </div>
          {/* AI Insight for Layer 2 */}
          {data.insights?.layer2 && <InsightBox insight={data.insights.layer2} icon={Sparkles} />}
        </section>

        {/* LAYER 3: Sector Drill-Down (when market selected) */}
        {selectedMarket && selectedMarket.sectors && selectedMarket.sectors.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">3</div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                LAYER 3: {selectedMarket.market.charAt(0).toUpperCase() + selectedMarket.market.slice(1)} Sectors
              </h2>
            </div>
            <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedMarket.sectors.map((sector) => (
                  <div key={sector.name} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <SectorRow sector={sector} />
                    {sector.topAssets.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sector.topAssets.slice(0, 4).map((asset) => (
                          <span key={asset} className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300">
                            {asset}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* AI Insight for Layer 3 */}
              {data.insights?.layer3 && <InsightBox insight={data.insights.layer3} icon={Brain} />}
            </div>
          </section>
        )}

        {/* LAYER 4: Asset Analysis + Recommendation */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center text-white text-xs font-bold">4</div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">LAYER 4: Recommendation</h2>
            </div>
            <RecommendationCard recommendation={data.recommendation} rotation={data.activeRotation} />
            {/* AI Insight for Layer 4 */}
            {data.insights?.layer4 && <InsightBox insight={data.insights.layer4} icon={Sparkles} />}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Asset Analysis</h2>
            </div>
            <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Based on current capital flow analysis, proceed to detailed asset analysis for the recommended market.
              </p>
              <div className="space-y-3">
                <Link
                  href="/analyze"
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-teal-50 dark:from-teal-500/10 to-emerald-50 dark:to-emerald-500/10 border border-teal-200 dark:border-teal-500/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <span className="font-medium text-teal-700 dark:text-teal-300">7-Step Analysis</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-teal-500" />
                </Link>
                <Link
                  href="/top-coins"
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 dark:from-amber-500/10 to-yellow-50 dark:to-yellow-500/10 border border-amber-200 dark:border-amber-500/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-700 dark:text-amber-300">Top Coins by Score</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-500" />
                </Link>
                <Link
                  href="/concierge"
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 dark:from-purple-500/10 to-violet-50 dark:to-violet-500/10 border border-purple-200 dark:border-purple-500/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-purple-700 dark:text-purple-300">AI Concierge</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-500" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Last updated: {new Date(data.timestamp).toLocaleString()}</p>
          <p className="text-xs mt-1">Data refreshes every 5 minutes. Market data may have delays.</p>
        </div>
      </div>
    </div>
  );
}
