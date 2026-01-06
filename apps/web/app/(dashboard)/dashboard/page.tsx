'use client';

// ===========================================
// Dashboard Home Page - Trust & Accuracy Focused
// Professional design to build user confidence
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Users,
  Activity,
  Database,
  Zap,
  AlertTriangle,
  ArrowRight,
  Eye,
  Brain,
  LineChart,
  Lock,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Award,
  PieChart,
  LayoutGrid,
  List,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, ReferenceLine, defs } from 'recharts';
import { cn } from '../../../lib/utils';

// ===========================================
// Types
// ===========================================
interface PlatformStats {
  platform: {
    totalUsers: number;
    totalAnalyses: number;
    totalReports: number;
    weeklyAnalyses: number;
    monthlyAnalyses: number;
    platformSince: string;
  };
  accuracy: {
    overall: number;
    avgConfidence: number;
    stepRates: {
      marketPulse: number;
      assetScanner: number;
      safetyCheck: number;
      timing: number;
      tradePlan: number;
      trapCheck: number;
      finalVerdict: number;
    };
    lastUpdated: string;
    methodology: 'outcome-verified' | 'score-based' | string;
    sampleSize?: number; // Number of analyses used for accuracy calculation
    outcomeVerifiedCount?: number; // Number of analyses with verified outcomes
  };
  // Caution Rate: Success rate of WAIT/AVOID recommendations
  cautionRate?: {
    rate: number;
    cautionCorrect: number;
    cautionIncorrect: number;
    pending: number;
    total: number;
    description: string;
  };
  verdicts: {
    go: number;
    conditional_go: number;
    wait: number;
    avoid: number;
  };
  dataQuality: {
    dataSourcesCount: number;
    indicatorsUsed: number;
    timeframesAnalyzed: number;
    updateFrequency: string;
  };
}

interface UserStats {
  totalAnalyses: number;
  completedAnalyses: number;
  verifiedAnalyses: number;
  correctAnalyses: number;
  pendingAnalyses: number;
  accuracy: number; // Real accuracy from verified outcomes
  // Active performance metrics
  activeCount: number;
  activeProfitable: number;
  activePerformance: number; // Active profitable / active * 100
  avgScore: number;
  goSignals: number;
  avoidSignals: number;
  lastAnalysisDate: string | null;
}

interface RecentOutcome {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  outcome: 'correct' | 'incorrect' | 'pending';
  priceChange?: number;
  createdAt: string; // Raw ISO date for calculations
  createdAtDisplay?: string; // Formatted date for UI display
  expiresAt?: string;
  isExpired?: boolean;
  hoursRemaining?: number;
  // Live tracking fields
  direction?: string;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
}

// ===========================================
// 7-Step Methodology Data
// ===========================================
const methodologySteps = [
  {
    step: 1,
    name: 'Market Pulse',
    description: 'Analyzes overall market conditions, BTC dominance, Fear & Greed index, and macro trends.',
    icon: Activity,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    metrics: ['BTC Dominance', 'Fear & Greed Index', 'Market Regime', 'Trend Strength'],
  },
  {
    step: 2,
    name: 'Asset Scanner',
    description: 'Technical indicators, support/resistance levels, and multi-timeframe analysis for the selected coin.',
    icon: LineChart,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    metrics: ['RSI', 'MACD', 'Bollinger Bands', 'Support/Resistance'],
  },
  {
    step: 3,
    name: 'Safety Check',
    description: 'Examines manipulation risk, whale activity, exchange flows, and smart money movements.',
    icon: Shield,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    metrics: ['Whale Activity', 'Exchange Flows', 'Smart Money', 'Manipulation Risk'],
  },
  {
    step: 4,
    name: 'Timing',
    description: 'Calculates optimal entry time, conditions to wait for, and entry zones.',
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    metrics: ['Entry Zones', 'Trade Now Signal', 'Wait Conditions', 'Optimal Entry'],
  },
  {
    step: 5,
    name: 'Trade Plan',
    description: 'Determines entry, stop-loss, take-profit levels and position sizing.',
    icon: Target,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    metrics: ['Entry Levels', 'Stop Loss', 'Take Profits', 'Risk/Reward'],
  },
  {
    step: 6,
    name: 'Trap Check',
    description: 'Detects bull/bear traps, fakeout risks, and liquidity hunt zones.',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    metrics: ['Bull Trap', 'Bear Trap', 'Fakeout Risk', 'Stop Hunt Zones'],
  },
  {
    step: 7,
    name: 'Final Verdict',
    description: 'Combines all analyses to generate GO, WAIT or AVOID decision with confidence score.',
    icon: Brain,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    metrics: ['Overall Score', 'Confidence', 'Verdict', 'Recommendation'],
  },
];

// ===========================================
// Helper Components
// ===========================================

// Premium Metric Ring with Glow Effects
function PremiumMetricRing({
  value,
  label,
  description,
  icon: Icon,
  size = 140,
  gradientFrom,
  gradientTo,
  glowColor,
  hasData = true,
  isProfit = false,
}: {
  value: number;
  label: string;
  description: string;
  icon: React.ElementType;
  size?: number;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  hasData?: boolean;
  isProfit?: boolean;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const displayValue = isProfit ? Math.min(Math.abs(value), 100) : (hasData ? Math.min(value, 100) : 0);
  const offset = circumference - (displayValue / 100) * circumference;
  const uniqueId = `ring-${label.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <div className="group relative flex flex-col items-center">
      {/* Main Ring Container */}
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Outer Glow */}
        {hasData && (
          <div
            className="absolute inset-0 rounded-full opacity-30 blur-xl animate-pulse"
            style={{
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* SVG Ring */}
        <svg className="transform -rotate-90 relative z-10" width={size} height={size}>
          <defs>
            {/* Gradient Definition */}
            <linearGradient id={`gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>

            {/* Glow Filter */}
            <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Shimmer Pattern */}
            <linearGradient id={`shimmer-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              <animate attributeName="x1" from="-100%" to="100%" dur="2s" repeatCount="indefinite" />
              <animate attributeName="x2" from="0%" to="200%" dur="2s" repeatCount="indefinite" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            className="text-gray-200 dark:text-slate-700/50"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />

          {/* Progress Ring with Gradient */}
          {hasData && (
            <circle
              stroke={`url(#gradient-${uniqueId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              filter={`url(#glow-${uniqueId})`}
              style={{
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          )}

          {/* Shimmer Overlay */}
          {hasData && (
            <circle
              stroke={`url(#shimmer-${uniqueId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              style={{
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                mixBlendMode: 'overlay',
              }}
            />
          )}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          {/* Icon */}
          <Icon className={cn(
            "w-5 h-5 mb-1 transition-transform group-hover:scale-110",
            hasData ? "opacity-70" : "opacity-30"
          )} style={{ color: hasData ? gradientFrom : '#64748b' }} />

          {/* Value */}
          {hasData ? (
            <span className={cn(
              "text-2xl font-black tracking-tight",
              isProfit && value >= 0 ? "text-emerald-600 dark:text-emerald-400" :
              isProfit && value < 0 ? "text-red-600 dark:text-red-400" :
              "text-gray-900 dark:text-white"
            )}>
              {isProfit && value >= 0 ? '+' : ''}{value.toFixed(1)}%
            </span>
          ) : (
            <span className="text-lg font-medium text-gray-400 dark:text-slate-500">—</span>
          )}

          {/* Label */}
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-widest mt-0.5",
            hasData ? "text-gray-500 dark:text-slate-400" : "text-gray-400 dark:text-slate-600"
          )}>
            {label}
          </span>
        </div>
      </div>

      {/* Description - Shows on hover */}
      <div className={cn(
        "mt-3 text-center max-w-[140px] transition-all duration-300",
        "opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0"
      )}>
        <p className="text-[10px] text-gray-500 dark:text-slate-500 leading-tight">{description}</p>
      </div>
    </div>
  );
}

// Legacy MetricRing for backward compatibility
function MetricRing({
  value,
  label,
  size = 120,
  strokeWidth = 8,
  color = 'text-emerald-400',
  hasData = true,
  isProfit = false,
  suffix = '%'
}: {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  hasData?: boolean;
  isProfit?: boolean;
  suffix?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // For profit, cap at 100 for display purposes
  const displayValue = isProfit ? Math.min(Math.abs(value), 100) : (hasData ? value : 0);
  const offset = circumference - (displayValue / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-slate-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={hasData ? color : 'text-gray-300 dark:text-slate-600'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hasData ? (
          <>
            <span className={cn(
              "text-2xl font-extrabold",
              isProfit && value >= 0 ? "text-green-600 dark:text-green-400" :
              isProfit && value < 0 ? "text-red-600 dark:text-red-400" :
              "text-gray-900 dark:text-white"
            )}>
              {isProfit && value >= 0 ? '+' : ''}{value.toFixed(1)}{suffix}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
          </>
        ) : (
          <>
            <span className="text-lg font-medium text-gray-400 dark:text-slate-400">No Data</span>
            <span className="text-xs text-gray-500 dark:text-slate-500">Yet</span>
          </>
        )}
      </div>
    </div>
  );
}

function VerdictBadge({ verdict, count, total }: { verdict: string; count: number; total: number }) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
  const config = {
    go: { label: 'GO', color: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30' },
    conditional_go: { label: 'CONDITIONAL', color: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30' },
    wait: { label: 'WAIT', color: 'bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-500/30' },
    avoid: { label: 'AVOID', color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' },
  }[verdict] || { label: verdict, color: 'bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400' };

  return (
    <div className={cn("px-3 py-2 rounded-lg border text-center", config.color)}>
      <div className="text-lg font-bold">{percentage}%</div>
      <div className="text-xs opacity-80">{config.label}</div>
    </div>
  );
}

function OutcomeIndicator({ outcome }: { outcome: 'correct' | 'incorrect' | 'pending' }) {
  const config = {
    correct: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', label: 'Correct' },
    incorrect: { icon: XCircle, color: 'text-red-600 dark:text-red-400', label: 'Wrong' },
    pending: { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', label: 'Pending' },
  }[outcome];

  const Icon = config.icon;
  return (
    <div className={cn("flex items-center gap-1", config.color)}>
      <Icon className="w-4 h-4" />
      <span className="text-sm">{config.label}</span>
    </div>
  );
}

// ===========================================
// Main Dashboard Component
// ===========================================
export default function DashboardPage() {
  const router = useRouter();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentOutcomes, setRecentOutcomes] = useState<RecentOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [outcomeViewMode, setOutcomeViewMode] = useState<'card' | 'list'>('card');
  const [pnlViewMode, setPnlViewMode] = useState<'daily' | 'weekly'>('daily');

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch all data in parallel
      const [platformRes, statsRes, reportsRes, creditsRes] = await Promise.all([
        fetch('/api/analysis/platform-stats'),
        fetch('/api/analysis/statistics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/reports?limit=10&includeExpired=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/user/credits', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Process platform stats
      if (platformRes.ok) {
        const data = await platformRes.json();
        setPlatformStats(data.data);
      }

      // Process user stats
      if (statsRes.ok) {
        const data = await statsRes.json();
        setUserStats(data);
      }

      // Process reports for live tracking outcomes
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        console.log('Reports API response:', data);
        const reports = data.data?.reports || [];
        const outcomes = reports.map((r: any) => ({
          id: r.id,
          symbol: r.symbol,
          verdict: r.verdict,
          score: r.score || 7,
          outcome: r.outcome || 'pending',
          priceChange: r.unrealizedPnL,
          createdAt: r.generatedAt, // Keep raw ISO date for chart calculations
          createdAtDisplay: new Date(r.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          expiresAt: r.expiresAt,
          direction: r.direction,
          entryPrice: r.entryPrice,
          currentPrice: r.currentPrice,
          unrealizedPnL: r.unrealizedPnL,
          stopLoss: r.stopLoss,
          takeProfit1: r.takeProfit1,
          takeProfit2: r.takeProfit2,
          takeProfit3: r.takeProfit3,
        }));
        console.log('Mapped outcomes from reports:', outcomes);
        setRecentOutcomes(outcomes);
      } else {
        console.error('Reports API failed:', reportsRes.status, reportsRes.statusText);
      }

      // Process credits
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data.credits || 0);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Loading data...</p>
        </div>
      </div>
    );
  }

  const totalVerdicts = platformStats ?
    platformStats.verdicts.go + platformStats.verdicts.conditional_go +
    platformStats.verdicts.wait + platformStats.verdicts.avoid : 0;

  // Check if we have real data (sampleSize > 0 means real analyses exist)
  const hasRealData = (platformStats?.accuracy.sampleSize ?? 0) > 0 || totalVerdicts > 0;

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-8">

      {/* ===== SECTION 1: Compact Platform Performance ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 dark:from-emerald-500/10 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8">
          {/* Header - Same style as other sections */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 blur-lg rounded-full" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Platform Performance</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Real-time verification from {platformStats?.accuracy.sampleSize ?? 0} trades</p>
              </div>
            </div>
            {platformStats?.accuracy.methodology === 'outcome-verified' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live Tracking</span>
              </div>
            )}
          </div>

          {/* Content - Horizontal Layout */}
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* LEFT: Main Accuracy Gauge */}
            <div className="flex-shrink-0">
              <PremiumMetricRing
                value={platformStats?.accuracy.overall ?? 0}
                label="Accuracy"
                description="GO signal success rate"
                icon={Target}
                size={140}
                gradientFrom="#10b981"
                gradientTo="#34d399"
                glowColor="#10b981"
                hasData={hasRealData}
              />
            </div>

            {/* RIGHT: Stats Grid - New Layout */}
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* LEFT COLUMN: Total/Week + Caution/Verified */}
                <div className="flex gap-3">
                  {/* Total & This Week */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 border border-gray-200 dark:border-white/10 min-w-[100px]">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-gray-500 dark:text-slate-400">Total</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {platformStats?.platform.totalAnalyses ?? 0}
                      </div>
                    </div>
                    <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 border border-gray-200 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-cyan-500" />
                        <span className="text-xs text-gray-500 dark:text-slate-400">This Week</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {platformStats?.platform.weeklyAnalyses ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Caution & Verified */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 border border-gray-200 dark:border-white/10 min-w-[100px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-gray-500 dark:text-slate-400">Caution</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {(platformStats?.cautionRate?.total ?? 0) > 0 ? `${platformStats?.cautionRate?.rate ?? 0}%` : '—'}
                      </div>
                    </div>
                    <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 border border-gray-200 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-gray-500 dark:text-slate-400">Verified</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {platformStats?.accuracy.sampleSize ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Profit Trend + Credits (full height) */}
                <div className="flex-1 flex gap-3 min-h-[140px]">
                  {/* Premium Profit Sparkline - Daily/Weekly P&L Toggle */}
                  {(() => {
                    // DAILY VIEW: Hours of today (00:00 - 23:00)
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    const hours: number[] = [];
                    for (let h = 0; h < 24; h += 3) { // Every 3 hours for cleaner display
                      hours.push(h);
                    }

                    // WEEKLY VIEW: Last 7 days
                    const days: string[] = [];
                    const dayLabels: string[] = [];
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      days.push(d.toISOString().split('T')[0]);
                      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                    }

                    // Group trades by hour for daily P&L (today only)
                    const hourlyPnL: Record<number, number[]> = {};
                    hours.forEach(h => { hourlyPnL[h] = []; });

                    // Group trades by date for weekly P&L
                    const dailyPnL: Record<string, number[]> = {};
                    days.forEach(day => { dailyPnL[day] = []; });

                    recentOutcomes
                      .filter(o => o.unrealizedPnL !== undefined && o.createdAt)
                      .forEach(o => {
                        const tradeDate = new Date(o.createdAt);
                        const tradeDateStr = tradeDate.toISOString().split('T')[0];
                        const tradeHour = tradeDate.getHours();

                        // Hourly grouping (for today)
                        if (tradeDateStr === todayStr) {
                          const hourBucket = Math.floor(tradeHour / 3) * 3;
                          if (hourlyPnL[hourBucket] !== undefined) {
                            hourlyPnL[hourBucket].push(o.unrealizedPnL || 0);
                          }
                        }

                        // Daily grouping (for the week)
                        if (dailyPnL[tradeDateStr]) {
                          dailyPnL[tradeDateStr].push(o.unrealizedPnL || 0);
                        }
                      });

                    // Daily chart data (hourly view)
                    const dailyChartData = hours.map((h) => {
                      const trades = hourlyPnL[h];
                      const avgPnl = trades.length > 0
                        ? trades.reduce((sum, v) => sum + v, 0) / trades.length
                        : 0;
                      return {
                        name: `${h.toString().padStart(2, '0')}:00`,
                        hour: h,
                        pnl: avgPnl,
                        positive: Math.max(0, avgPnl),
                        negative: Math.min(0, avgPnl),
                        count: trades.length,
                      };
                    });

                    // Weekly chart data (daily view)
                    const weeklyChartData = days.map((day, i) => {
                      const trades = dailyPnL[day];
                      const avgPnl = trades.length > 0
                        ? trades.reduce((sum, v) => sum + v, 0) / trades.length
                        : 0;
                      return {
                        name: dayLabels[i],
                        date: day,
                        pnl: avgPnl,
                        positive: Math.max(0, avgPnl),
                        negative: Math.min(0, avgPnl),
                        count: trades.length,
                      };
                    });

                    const chartData = pnlViewMode === 'daily' ? dailyChartData : weeklyChartData;

                    const allTrades = recentOutcomes.filter(o => o.unrealizedPnL !== undefined && o.createdAt);
                    const relevantTrades = pnlViewMode === 'daily'
                      ? allTrades.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === todayStr)
                      : allTrades.filter(o => days.includes(new Date(o.createdAt).toISOString().split('T')[0]));

                    const avgPnL = relevantTrades.length > 0
                      ? relevantTrades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0) / relevantTrades.length
                      : 0;
                    const isPositive = avgPnL >= 0;
                    const hasData = relevantTrades.length >= 1;

                    return (
                      <div className="flex-1 relative overflow-hidden rounded-xl p-4 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-800/50 dark:via-slate-800/30 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                        {/* Dual glow */}
                        <div className="absolute -bottom-8 right-4 w-20 h-20 rounded-full blur-2xl opacity-30 bg-emerald-400" />
                        <div className="absolute -bottom-8 left-4 w-20 h-20 rounded-full blur-2xl opacity-30 bg-red-400" />

                        <div className="flex items-center justify-between mb-2 relative z-10">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-700/50">
                              <LineChart className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </div>
                            {/* Toggle Buttons */}
                            <div className="flex bg-slate-200/80 dark:bg-slate-700/50 rounded-lg p-0.5">
                              <button
                                onClick={() => setPnlViewMode('daily')}
                                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                                  pnlViewMode === 'daily'
                                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                }`}
                              >
                                Daily
                              </button>
                              <button
                                onClick={() => setPnlViewMode('weekly')}
                                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                                  pnlViewMode === 'weekly'
                                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                                }`}
                              >
                                Weekly
                              </button>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-red-500/20 text-red-700 dark:text-red-300'
                          }`}>
                            <span className="text-lg font-black">
                              {relevantTrades.length === 0 ? '—' : `${isPositive ? '+' : ''}${avgPnL.toFixed(1)}%`}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-h-[80px] relative z-10">
                          {!hasData ? (
                            <div className="h-full flex flex-col items-center justify-center">
                              <LineChart className="w-8 h-8 text-gray-300 dark:text-slate-600 mb-2" />
                              <span className="text-xs text-gray-400 dark:text-slate-500">Waiting for trades</span>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                                  </linearGradient>
                                  <linearGradient id="redGradient" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                                  </linearGradient>
                                  <filter id="glowEffect">
                                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                                    <feMerge>
                                      <feMergeNode in="blur" />
                                      <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                  </filter>
                                </defs>
                                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeOpacity={0.3} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '10px 14px',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                                  }}
                                  content={({ active, payload }) => {
                                    if (!active || !payload || !payload[0]) return null;
                                    const data = payload[0].payload;
                                    const pnl = data.pnl;
                                    const isPos = pnl >= 0;
                                    return (
                                      <div style={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        borderRadius: '12px',
                                        padding: '10px 14px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                                      }}>
                                        <div style={{ color: '#fff', fontWeight: 600, marginBottom: '4px' }}>{data.name}</div>
                                        <div style={{ color: isPos ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '16px' }}>
                                          {data.count === 0 ? '—' : `${isPos ? '+' : ''}${pnl.toFixed(1)}%`}
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                                          {data.count} trade{data.count !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    );
                                  }}
                                  cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                {/* Positive area - Green */}
                                <Area
                                  type="monotone"
                                  dataKey="positive"
                                  stroke="#10b981"
                                  strokeWidth={2.5}
                                  fill="url(#greenGradient)"
                                  filter="url(#glowEffect)"
                                  dot={(props: any) => {
                                    if (!props.payload || props.payload.positive <= 0) return <g key={props.key} />;
                                    return (
                                      <circle
                                        key={props.key}
                                        cx={props.cx}
                                        cy={props.cy}
                                        r={4}
                                        fill="#10b981"
                                        stroke="#fff"
                                        strokeWidth={2}
                                      />
                                    );
                                  }}
                                  activeDot={{ fill: '#10b981', strokeWidth: 3, stroke: '#fff', r: 6 }}
                                />
                                {/* Negative area - Red */}
                                <Area
                                  type="monotone"
                                  dataKey="negative"
                                  stroke="#ef4444"
                                  strokeWidth={2.5}
                                  fill="url(#redGradient)"
                                  filter="url(#glowEffect)"
                                  dot={(props: any) => {
                                    if (!props.payload || props.payload.negative >= 0) return <g key={props.key} />;
                                    return (
                                      <circle
                                        key={props.key}
                                        cx={props.cx}
                                        cy={props.cy}
                                        r={4}
                                        fill="#ef4444"
                                        stroke="#fff"
                                        strokeWidth={2}
                                      />
                                    );
                                  }}
                                  activeDot={{ fill: '#ef4444', strokeWidth: 3, stroke: '#fff', r: 6 }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Credits - Full Height */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-600/5 rounded-xl p-4 border border-amber-200/50 dark:border-amber-500/20 flex flex-col justify-center items-center min-w-[100px]">
                    <Sparkles className="w-6 h-6 text-amber-500 mb-2" />
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Credits</span>
                    <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                      {credits}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: 7-Step Methodology ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-500/5 dark:from-cyan-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/5 dark:from-purple-500/10 via-transparent to-transparent" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-full" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Brain className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">7-Step Analysis</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Each step uses independently verified algorithms</p>
              </div>
            </div>
            <Link
              href="/analyze"
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-xl font-semibold transition shadow-lg shadow-cyan-500/25"
            >
              Start Analysis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Steps - Full Width Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {methodologySteps.map((step) => {
                const Icon = step.icon;
                const accuracyKey = {
                  1: 'marketPulse',
                  2: 'assetScanner',
                  3: 'safetyCheck',
                  4: 'timing',
                  5: 'tradePlan',
                  6: 'trapCheck',
                  7: 'finalVerdict',
                }[step.step] as keyof typeof platformStats.accuracy.stepRates;

                const accuracy = platformStats?.accuracy.stepRates[accuracyKey] ?? 0;
                const stepHasData = hasRealData && accuracy > 0;

                // Radial gauge calculations
                const circumference = 2 * Math.PI * 24;
                const offset = circumference - ((stepHasData ? accuracy : 0) / 100) * circumference;

                // Dynamic color based on accuracy
                const getGaugeColor = () => {
                  if (!stepHasData) return { stroke: '#64748b', glow: 'rgba(100, 116, 139, 0.3)' };
                  if (accuracy >= 80) return { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)' };
                  if (accuracy >= 60) return { stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.5)' };
                  return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' };
                };
                const gaugeColor = getGaugeColor();

                return (
                  <div
                    key={step.step}
                    className="group relative"
                  >
                    <div className={cn(
                      "relative p-4 rounded-xl border transition-all duration-300 h-full",
                      "bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm",
                      "border-gray-200 dark:border-white/10",
                      "hover:border-gray-300 dark:hover:border-white/20 hover:shadow-lg"
                    )}>
                      {/* Step Number Badge */}
                      <div className={cn(
                        "absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg",
                        "bg-gradient-to-br", step.bgColor.replace('bg-', 'from-').replace('/10', ''), "to-transparent",
                        "border-2 border-white dark:border-slate-800"
                      )}>
                        <span className={cn("text-xs font-bold", step.color)}>{step.step}</span>
                      </div>

                      {/* Icon with glow */}
                      <div className="relative mb-3">
                        <div className={cn("absolute inset-0 blur-lg opacity-30 rounded-full", step.bgColor)} />
                        <Icon className={cn("w-8 h-8 relative group-hover:scale-110 transition-transform", step.color)} />
                      </div>

                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{step.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{step.description}</p>

                      {/* Radial Accuracy Gauge */}
                      <div className="flex justify-center mb-3">
                        <div className="relative w-16 h-16">
                          {/* Glow Effect */}
                          {stepHasData && (
                            <div
                              className="absolute inset-1 rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: gaugeColor.glow }}
                            />
                          )}

                          {/* SVG Gauge */}
                          <svg className="w-16 h-16 transform -rotate-90 relative z-10" viewBox="0 0 56 56">
                            {/* Background Circle */}
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-gray-200 dark:text-slate-700/50"
                            />
                            {/* Progress Arc */}
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke={gaugeColor.stroke}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              style={{
                                transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                filter: stepHasData ? `drop-shadow(0 0 4px ${gaugeColor.glow})` : 'none'
                              }}
                            />
                          </svg>

                          {/* Center Score */}
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <span
                              className="text-base font-black"
                              style={{ color: gaugeColor.stroke }}
                            >
                              {stepHasData ? `${accuracy.toFixed(0)}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Metrics Tags */}
                      <div className="flex flex-wrap gap-1">
                        {step.metrics.slice(0, 2).map((metric) => (
                          <span key={metric} className="px-1.5 py-0.5 bg-white/50 dark:bg-slate-800/50 rounded text-[10px] text-gray-500 dark:text-slate-400 border border-gray-200/50 dark:border-slate-700/50">
                            {metric}
                          </span>
                        ))}
                        {step.metrics.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-white/50 dark:bg-slate-800/50 rounded text-[10px] text-gray-400 dark:text-slate-500">
                            +{step.metrics.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Mobile CTA */}
          <Link
            href="/analyze"
            className="sm:hidden flex items-center justify-center gap-2 mt-4 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-semibold transition w-full shadow-lg shadow-cyan-500/25"
          >
            Start Analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ===== SECTION 3: Verdict Distribution & User Stats ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left - Verdict Distribution */}
        <div className="relative overflow-hidden rounded-3xl">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/5 dark:from-purple-500/10 via-transparent to-transparent" />

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />

          <div className="relative z-10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/30 blur-lg rounded-full" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verdict Distribution</h3>
            </div>

            {totalVerdicts > 0 ? (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <VerdictBadge verdict="go" count={platformStats?.verdicts.go ?? 0} total={totalVerdicts} />
                <VerdictBadge verdict="conditional_go" count={platformStats?.verdicts.conditional_go ?? 0} total={totalVerdicts} />
                <VerdictBadge verdict="wait" count={platformStats?.verdicts.wait ?? 0} total={totalVerdicts} />
                <VerdictBadge verdict="avoid" count={platformStats?.verdicts.avoid ?? 0} total={totalVerdicts} />
              </div>
            ) : (
              <div className="text-center py-8 mb-5 bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10">
                <PieChart className="w-10 h-10 text-gray-400 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No verdicts yet</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Complete analyses to see distribution</p>
              </div>
            )}

            <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Why It Matters?</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                A balanced verdict distribution shows the system is responsive to market conditions.
                Systems that only give "BUY" signals are not reliable.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm px-1">
              <span className="text-gray-500 dark:text-slate-400">Total Verdicts</span>
              <span className="font-bold text-gray-900 dark:text-white">{totalVerdicts}</span>
            </div>
          </div>
        </div>

        {/* Right - My Performance */}
        <div className="relative overflow-hidden rounded-3xl">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent" />

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />

          <div className="relative z-10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-lg rounded-full" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Award className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Performance</h3>
            </div>

            {userStats && userStats.totalAnalyses > 0 ? (
              <>
                {/* Two Performance Cards - Realized & Active */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Realized Performance */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-100/80 to-green-100/80 dark:from-emerald-500/10 dark:to-green-500/10 rounded-xl p-4 text-center border border-emerald-200/50 dark:border-emerald-500/20">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                      Realized
                    </div>
                    <div className={cn(
                      "text-3xl font-black",
                      userStats.accuracy >= 70 ? 'text-green-600 dark:text-green-400' :
                      userStats.accuracy >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                      userStats.verifiedAnalyses === 0 ? 'text-gray-400 dark:text-slate-500' : 'text-red-600 dark:text-red-400'
                    )}>
                      {userStats.verifiedAnalyses > 0 ? `${userStats.accuracy.toFixed(1)}%` : '-'}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                      {userStats.correctAnalyses} / {userStats.verifiedAnalyses} Closed
                    </div>
                  </div>

                  {/* Active Performance */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-blue-100/80 to-cyan-100/80 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl p-4 text-center border border-blue-200/50 dark:border-blue-500/20">
                    <div className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold mb-1">
                      Active
                    </div>
                    <div className={cn(
                      "text-3xl font-black",
                      (userStats.activePerformance || 0) >= 70 ? 'text-green-600 dark:text-green-400' :
                      (userStats.activePerformance || 0) >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                      (userStats.activeCount || 0) === 0 ? 'text-gray-400 dark:text-slate-500' : 'text-red-600 dark:text-red-400'
                    )}>
                      {(userStats.activeCount || 0) > 0 ? `${(userStats.activePerformance || 0).toFixed(1)}%` : '-'}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                      {userStats.activeProfitable || 0} / {userStats.activeCount || 0} Profitable
                    </div>
                  </div>
                </div>

                {/* Stats Grid - Compact */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-200 dark:border-white/10">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{userStats.totalAnalyses}</div>
                    <div className="text-[9px] text-gray-500 dark:text-slate-400">Total</div>
                  </div>
                  <div className="bg-blue-100/80 dark:bg-blue-500/10 rounded-lg p-2 text-center border border-blue-200/50 dark:border-blue-500/20">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{userStats.activeCount || userStats.pendingAnalyses}</div>
                    <div className="text-[9px] text-gray-500 dark:text-slate-400">Active</div>
                  </div>
                  <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-200 dark:border-white/10">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{userStats.verifiedAnalyses}</div>
                    <div className="text-[9px] text-gray-500 dark:text-slate-400">Closed</div>
                  </div>
                  <div className="bg-green-100/80 dark:bg-green-500/10 rounded-lg p-2 text-center border border-green-200/50 dark:border-green-500/20">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{userStats.correctAnalyses}</div>
                    <div className="text-[9px] text-gray-500 dark:text-slate-400">TP Hit</div>
                  </div>
                  <div className="bg-red-100/80 dark:bg-red-500/10 rounded-lg p-2 text-center border border-red-200/50 dark:border-red-500/20">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">{userStats.verifiedAnalyses - userStats.correctAnalyses}</div>
                    <div className="text-[9px] text-gray-500 dark:text-slate-400">SL Hit</div>
                  </div>
                </div>

                {/* Performance Comment */}
                <div className={cn(
                  "text-center text-sm font-medium p-3 rounded-xl border",
                  userStats.verifiedAnalyses === 0
                    ? "bg-blue-100/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20"
                    : userStats.accuracy >= 70
                    ? "bg-green-100/80 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-500/20"
                    : userStats.accuracy >= 50
                    ? "bg-yellow-100/80 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-500/20"
                    : "bg-red-100/80 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/20"
                )}>
                  {userStats.verifiedAnalyses === 0
                    ? "Trades are still active. Results will update when TP/SL is hit."
                    : userStats.accuracy >= 70
                    ? "Excellent performance! Your analysis accuracy is outstanding."
                    : userStats.accuracy >= 50
                    ? "Good progress! There's room for improvement."
                    : "Consider reviewing your analysis approach for better results."}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gray-400/20 blur-xl rounded-full" />
                  <div className="relative w-full h-full rounded-full bg-gray-100/80 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10">
                    <BarChart3 className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No analyses yet</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  Start your first analysis to track your performance
                </p>
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-amber-500/25"
                >
                  Start First Analysis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== SECTION 4: Live Outcome Tracking ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 dark:from-blue-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-green-500/5 dark:from-green-500/10 via-transparent to-transparent" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/30 blur-lg rounded-full" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Eye className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Live Accuracy Tracking</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Real-time TP/SL monitoring - trades close when targets hit</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100/80 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/10">
                <button
                  onClick={() => setOutcomeViewMode('card')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    outcomeViewMode === 'card'
                      ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                      : "text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOutcomeViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    outcomeViewMode === 'list'
                      ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                      : "text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {/* Status Legends */}
              <div className="hidden sm:flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100/80 dark:bg-green-500/10 rounded-full border border-green-200/50 dark:border-green-500/20">
                  <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">TP Hit</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100/80 dark:bg-red-500/10 rounded-full border border-red-200/50 dark:border-red-500/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
                  <span className="text-red-600 dark:text-red-400 font-medium">SL Hit</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100/80 dark:bg-blue-500/10 rounded-full border border-blue-200/50 dark:border-blue-500/20">
                  <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>

          {recentOutcomes.length > 0 ? (
            <>
              {/* Card View */}
              {outcomeViewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {recentOutcomes.map((outcome) => (
                    <div
                      key={outcome.id}
                      className={cn(
                        "group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:shadow-lg",
                        outcome.outcome === 'correct' && "border-green-300/50 dark:border-green-500/30 bg-green-100/80 dark:bg-green-500/5",
                        outcome.outcome === 'incorrect' && "border-red-300/50 dark:border-red-500/30 bg-red-100/80 dark:bg-red-500/5",
                        outcome.outcome === 'pending' && "border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30"
                      )}
                    >
                      {/* Header: Symbol & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "relative w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg",
                            outcome.symbol === 'BTC' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                            outcome.symbol === 'ETH' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                            outcome.symbol === 'SOL' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                            outcome.symbol === 'BNB' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            'bg-gradient-to-br from-gray-400 to-gray-600'
                          )}>
                            {outcome.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">{outcome.symbol}</span>
                              {outcome.direction && (
                                <span className={cn(
                                  "px-1 py-0.5 rounded text-[9px] font-bold",
                                  outcome.direction === 'long' || outcome.direction === 'LONG'
                                    ? "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                    : "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                )}>
                                  {outcome.direction === 'long' || outcome.direction === 'LONG' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-slate-500">{outcome.createdAtDisplay}</div>
                          </div>
                        </div>
                        {/* Status Badge */}
                        <div className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold",
                          outcome.outcome === 'correct' && "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400",
                          outcome.outcome === 'incorrect' && "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400",
                          outcome.outcome === 'pending' && "bg-blue-200/80 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                        )}>
                          {outcome.outcome === 'correct' ? 'TP HIT' : outcome.outcome === 'incorrect' ? 'SL HIT' : 'ACTIVE'}
                        </div>
                      </div>

                      {/* Live Price Display */}
                      {outcome.entryPrice && outcome.currentPrice && (
                        <div className="mb-2 p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200/50 dark:border-white/5">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400 mb-1">
                            <span>Entry</span>
                            <span>Current</span>
                          </div>
                          <div className="flex items-center justify-between font-mono text-xs">
                            <span className="text-gray-700 dark:text-slate-300">${outcome.entryPrice.toFixed(2)}</span>
                            <span className="text-gray-400 dark:text-slate-600">→</span>
                            <span className="text-gray-700 dark:text-slate-300">${outcome.currentPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* P/L Display */}
                      {outcome.unrealizedPnL !== undefined && (
                        <div className={cn(
                          "text-center py-2 rounded-lg font-bold text-sm",
                          outcome.unrealizedPnL >= 0
                            ? "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                            : "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                        )}>
                          {outcome.unrealizedPnL >= 0 ? '+' : ''}{outcome.unrealizedPnL.toFixed(2)}%
                        </div>
                      )}

                      {/* Fallback: Show priceChange if no live data */}
                      {!outcome.unrealizedPnL && outcome.priceChange !== undefined && (
                        <div className={cn(
                          "mt-2 text-sm font-medium text-right",
                          outcome.priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        )}>
                          {outcome.priceChange >= 0 ? '+' : ''}{outcome.priceChange.toFixed(2)}%
                        </div>
                      )}

                      {/* TP/SL Levels (compact) */}
                      {(outcome.stopLoss || outcome.takeProfit1) && (
                        <div className="mt-2 flex items-center justify-between text-[9px] font-medium">
                          {outcome.stopLoss && (
                            <span className="text-red-500 dark:text-red-400">SL: ${outcome.stopLoss.toFixed(2)}</span>
                          )}
                          {outcome.takeProfit1 && (
                            <span className="text-green-500 dark:text-green-400">TP: ${outcome.takeProfit1.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* List View */}
              {outcomeViewMode === 'list' && (
                <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  {/* Table Header */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-gray-200/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="col-span-2">Asset</div>
                    <div className="col-span-1 text-center">Direction</div>
                    <div className="col-span-2 text-right">Entry</div>
                    <div className="col-span-2 text-right">Current</div>
                    <div className="col-span-2 text-right">P/L</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-2 text-right">Date</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200 dark:divide-white/5">
                    {recentOutcomes.map((outcome) => (
                      <div
                        key={outcome.id}
                        className={cn(
                          "grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 hover:bg-gray-200/50 dark:hover:bg-white/5 transition-colors",
                          outcome.outcome === 'correct' && "bg-green-50/50 dark:bg-green-500/5",
                          outcome.outcome === 'incorrect' && "bg-red-50/50 dark:bg-red-500/5"
                        )}
                      >
                        {/* Asset */}
                        <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow",
                            outcome.symbol === 'BTC' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                            outcome.symbol === 'ETH' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                            outcome.symbol === 'SOL' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                            outcome.symbol === 'BNB' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            'bg-gradient-to-br from-gray-400 to-gray-600'
                          )}>
                            {outcome.symbol.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{outcome.symbol}</span>
                        </div>

                        {/* Direction */}
                        <div className="col-span-1 md:col-span-1 flex items-center justify-end md:justify-center">
                          {outcome.direction ? (
                            <span className={cn(
                              "px-2 py-0.5 rounded text-xs font-bold",
                              outcome.direction === 'long' || outcome.direction === 'LONG'
                                ? "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                : "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                            )}>
                              {outcome.direction === 'long' || outcome.direction === 'LONG' ? 'LONG' : 'SHORT'}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 text-xs">—</span>
                          )}
                        </div>

                        {/* Entry Price */}
                        <div className="hidden md:flex md:col-span-2 items-center justify-end font-mono text-sm text-gray-700 dark:text-slate-300">
                          {outcome.entryPrice ? `$${outcome.entryPrice.toFixed(2)}` : '—'}
                        </div>

                        {/* Current Price */}
                        <div className="hidden md:flex md:col-span-2 items-center justify-end font-mono text-sm text-gray-700 dark:text-slate-300">
                          {outcome.currentPrice ? `$${outcome.currentPrice.toFixed(2)}` : '—'}
                        </div>

                        {/* P/L */}
                        <div className="col-span-1 md:col-span-2 flex items-center justify-start md:justify-end">
                          {outcome.unrealizedPnL !== undefined ? (
                            <span className={cn(
                              "px-2 py-1 rounded-lg font-bold text-sm",
                              outcome.unrealizedPnL >= 0
                                ? "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                : "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                            )}>
                              {outcome.unrealizedPnL >= 0 ? '+' : ''}{outcome.unrealizedPnL.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 text-sm">—</span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="col-span-1 md:col-span-1 flex items-center justify-end md:justify-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-bold",
                            outcome.outcome === 'correct' && "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400",
                            outcome.outcome === 'incorrect' && "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400",
                            outcome.outcome === 'pending' && "bg-blue-200/80 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                          )}>
                            {outcome.outcome === 'correct' ? 'TP' : outcome.outcome === 'incorrect' ? 'SL' : 'LIVE'}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="hidden md:flex md:col-span-2 items-center justify-end text-xs text-gray-500 dark:text-slate-400">
                          {outcome.createdAtDisplay}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full" />
                <div className="relative w-full h-full rounded-full bg-blue-100/80 dark:bg-blue-500/10 flex items-center justify-center border border-blue-200 dark:border-blue-500/20">
                  <Activity className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">No tracked outcomes yet</h4>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Create an analysis to start tracking live outcomes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION 5: Data Sources & Methodology ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 dark:from-indigo-500/10 via-transparent to-transparent" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/30 blur-lg rounded-full" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Lock className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Data Sources & Methodology</h2>
              <p className="text-gray-500 dark:text-slate-400 text-sm">The reliable infrastructure behind our analyses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data Sources */}
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all hover:shadow-lg">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <Database className="relative w-7 h-7 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Data Sources</h4>
              <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Binance Exchange API
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  CoinGecko Market Data
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Fear & Greed Index
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  On-chain Analytics
                </li>
              </ul>
            </div>

            {/* Technical Indicators */}
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all hover:shadow-lg">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-purple-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <LineChart className="relative w-7 h-7 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Technical Indicators</h4>
              <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  RSI, MACD, Bollinger
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  EMA (8, 21, 50, 200)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Volume Profile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  ATR & Volatility
                </li>
              </ul>
            </div>

            {/* AI Analysis */}
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all hover:shadow-lg">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <Brain className="relative w-7 h-7 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">AI Analysis</h4>
              <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Gemini AI Integration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Pattern Recognition
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Sentiment Analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Risk Assessment
                </li>
              </ul>
            </div>

            {/* Security */}
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-gray-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-500/30 transition-all hover:shadow-lg">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <Shield className="relative w-7 h-7 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Security</h4>
              <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Manipulation Detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Whale Tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Trap Identification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Smart Money Flow
                </li>
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-5 bg-amber-100/80 dark:bg-amber-900/20 rounded-xl border border-amber-200/50 dark:border-amber-700/30">
            <div className="flex gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-amber-500/30 blur-lg rounded-full" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Risk Disclaimer</h4>
                <p className="text-sm text-amber-700 dark:text-amber-200/80 leading-relaxed">
                  TradePath does not provide investment advice. All analyses are for educational purposes only.
                  Cryptocurrency markets are high-risk, and investment decisions are entirely your responsibility.
                  Past performance is not a guarantee of future results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Quick Actions (Mobile Friendly) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/analyze"
          className="flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl border border-emerald-200 dark:border-emerald-500/30 transition group"
        >
          <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
          <span className="font-medium text-gray-900 dark:text-white">New Analysis</span>
        </Link>
        <Link
          href="/reports"
          className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl border border-blue-200 dark:border-blue-500/30 transition group"
        >
          <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition" />
          <span className="font-medium text-gray-900 dark:text-white">My Reports</span>
        </Link>
        <Link
          href="/ai-expert"
          className="flex flex-col items-center gap-2 p-4 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-xl border border-purple-200 dark:border-purple-500/30 transition group"
        >
          <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition" />
          <span className="font-medium text-gray-900 dark:text-white">AI Experts</span>
        </Link>
        <Link
          href="/credits"
          className="flex flex-col items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 rounded-xl border border-yellow-200 dark:border-yellow-500/30 transition group"
        >
          <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition" />
          <span className="font-medium text-gray-900 dark:text-white">Buy Credits</span>
        </Link>
      </div>
    </div>
  );
}
