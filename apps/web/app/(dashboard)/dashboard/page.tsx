'use client';

// ===========================================
// Dashboard Home Page - Trust & Accuracy Focused
// Professional design to build user confidence
// ===========================================

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Info,
  Calendar,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load chart component for better performance
const PnLChart = dynamic(
  () => import('../../../components/dashboard/PnLChart').then(mod => ({ default: mod.PnLChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
);
import { cn } from '../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import { getApiUrl, authFetch } from '../../../lib/api';

// ===========================================
// Trade Type Configuration
// ===========================================
type TradeType = 'scalping' | 'dayTrade' | 'swing';

// Step rates type for accuracy
type StepRatesKey = 'marketPulse' | 'assetScanner' | 'safetyCheck' | 'timing' | 'tradePlan' | 'trapCheck' | 'finalVerdict';

const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalping', icon: Zap, color: 'purple' },
  dayTrade: { label: 'Day Trade', icon: Activity, color: 'blue' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
};

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
    period?: 'D' | 'W' | 'M' | 'all'; // Time period for step scores
  };
  // GO Signal Rate: Success rate of GO/CONDITIONAL_GO signals
  goSignalRate?: {
    rate: number;
    goCorrect: number;
    goIncorrect: number;
    pending: number;
    totalVerified: number;
    totalSignals: number;
    description: string;
  };
  // Caution Rate: Success rate of WAIT/AVOID recommendations
  cautionRate?: {
    rate: number;
    cautionCorrect: number;
    cautionIncorrect: number;
    pending: number;
    totalVerified: number;
    totalSignals: number;
    description: string;
  };
  // Analysis coverage
  coverage?: {
    totalReports: number;
    withTradePlan: number;
    tradePlanPercentage: number;
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
  tradeType?: TradeType;
  // Live tracking fields
  direction?: string;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  // NEW: Target progress and outcome
  tpProgress?: number;
  distanceToTP1?: number;
  distanceToSL?: number;
  outcomePrice?: number;
  outcomeAt?: string;
}

// ===========================================
// 7-Step Methodology Data
// ===========================================
const methodologySteps = [
  {
    step: 1,
    name: 'Market Pulse',
    description: 'Analyzes overall market conditions, BTC dominance, Fear & Greed index, and macro trends.',
    detailedInfo: 'Market Pulse examines the broader cryptocurrency market health before any trade decision. It analyzes Bitcoin dominance trends, the Fear & Greed Index for sentiment, overall market cap movements, and identifies whether we are in a bull, bear, or sideways regime. This step ensures you are not trading against the macro trend.',
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
    detailedInfo: 'Asset Scanner performs deep technical analysis on your selected cryptocurrency. It calculates RSI, MACD, Bollinger Bands, and identifies key support/resistance levels across multiple timeframes (1H, 4H, Daily). The multi-timeframe confluence helps identify high-probability trade setups.',
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
    detailedInfo: 'Safety Check protects you from market manipulation. It monitors whale wallet movements, exchange inflow/outflow patterns, and smart money positioning. High manipulation risk or unusual whale activity triggers warnings, helping you avoid potential pump-and-dump schemes or coordinated sell-offs.',
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
    detailedInfo: 'Timing determines the perfect moment to enter a trade. It identifies optimal entry zones, calculates whether current price offers good risk/reward, and specifies conditions to wait for if timing is not ideal. This step maximizes your potential profit while minimizing drawdown risk.',
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
    detailedInfo: 'Trade Plan creates your complete trading blueprint. It sets precise entry price, stop-loss level (to limit losses), and multiple take-profit targets (TP1, TP2, TP3). Position sizing recommendations ensure proper risk management, typically risking 1-2% of portfolio per trade.',
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
    detailedInfo: 'Trap Check identifies potential fake moves designed to trap traders. It detects bull traps (false breakouts), bear traps (false breakdowns), and liquidity hunt zones where stop-losses cluster. This step helps you avoid entering trades that are likely to reverse against you.',
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
    detailedInfo: 'Final Verdict synthesizes all previous steps into a clear trading decision. It weighs each factor and generates a GO (trade now), WAIT (conditions not ideal), or AVOID (too risky) verdict with a confidence score. The overall score (1-10) reflects the combined strength of all signals.',
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
// Cache key and duration for dashboard data
const CACHE_KEY = 'dashboard_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for better UX

export default function DashboardPage() {
  const router = useRouter();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentOutcomes, setRecentOutcomes] = useState<RecentOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [outcomeViewMode, setOutcomeViewMode] = useState<'card' | 'list'>('card');
  const [pnlViewMode, setPnlViewMode] = useState<'daily' | 'weekly'>('daily');
  const [stepPeriod, setStepPeriod] = useState<'D' | 'W' | 'M' | 'all'>('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState<TradeType | 'all'>('all');
  const [nextCandleRefresh, setNextCandleRefresh] = useState<number | null>(null);
  const candleRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
              // Use cached data - instant navigation
              setPlatformStats(data.platformStats);
              setUserStats(data.userStats);
              setRecentOutcomes(data.recentOutcomes);
              setCredits(data.credits);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // Cache read failed, continue with fetch
        }
      }

      // Fetch all data in parallel using authFetch
      // Include tradeType filter in API calls
      const tradeTypeQuery = tradeTypeFilter !== 'all' ? tradeTypeFilter : '';
      const [platformRes, statsRes, livePricesRes, creditsRes] = await Promise.all([
        fetch(getApiUrl(`/api/analysis/platform-stats?period=${stepPeriod}${tradeTypeQuery ? `&tradeType=${tradeTypeQuery}` : ''}`)),
        authFetch('/api/analysis/statistics'),
        authFetch('/api/analysis/live-prices'), // Use live-prices endpoint for current prices
        authFetch('/api/user/credits'),
      ]);

      // Debug: Log API responses
      console.log('[Dashboard] API Response Status:', {
        platform: platformRes.status,
        stats: statsRes.status,
        livePrices: livePricesRes.status,
        credits: creditsRes.status,
      });

      let newPlatformStats = null;
      let newUserStats = null;
      let newRecentOutcomes: RecentOutcome[] = [];
      let newCredits = 0;

      // Process platform stats
      if (platformRes.ok) {
        const data = await platformRes.json();
        newPlatformStats = data.data;
        setPlatformStats(newPlatformStats);
        console.log('[Dashboard] Platform stats loaded:', !!newPlatformStats);
      } else {
        console.warn('[Dashboard] Platform stats failed:', platformRes.status);
      }

      // Process user stats
      if (statsRes.ok) {
        const data = await statsRes.json();
        newUserStats = data;
        setUserStats(newUserStats);
        console.log('[Dashboard] User stats loaded:', newUserStats);
      } else {
        console.warn('[Dashboard] User stats failed:', statsRes.status);
      }

      // Process analyses from live-prices endpoint (includes current price and P/L)
      if (livePricesRes.ok) {
        const data = await livePricesRes.json();
        console.log('[Dashboard] Live prices raw response:', data);
        const analyses = data.data?.analyses || [];
        const nextRefresh = data.data?.nextRefresh;

        // Set next candle refresh time
        if (nextRefresh) {
          setNextCandleRefresh(nextRefresh);
        }

        newRecentOutcomes = analyses.map((a: any) => {
          // Normalize verdict
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

          // Map interval to trade type
          let tradeType: TradeType | undefined;
          if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
          else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
          else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';

          // Map outcome from API to our enum
          let outcomeStatus: 'correct' | 'incorrect' | 'pending' = 'pending';
          if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') {
            outcomeStatus = 'correct';
          } else if (a.outcome === 'sl_hit') {
            outcomeStatus = 'incorrect';
          }

          return {
            id: a.id,
            symbol: a.symbol,
            verdict,
            score: a.totalScore || 0,
            outcome: outcomeStatus,
            priceChange: a.unrealizedPnL,
            createdAt: a.createdAt, // Raw ISO date
            createdAtDisplay: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            expiresAt: a.expiresAt,
            tradeType,
            direction: a.direction,
            entryPrice: a.entryPrice,
            currentPrice: a.currentPrice, // Live price from Binance
            unrealizedPnL: a.unrealizedPnL, // Calculated P/L
            stopLoss: a.stopLoss,
            takeProfit1: a.takeProfit1,
            takeProfit2: a.takeProfit2,
            takeProfit3: a.takeProfit3,
            // NEW: Target progress from API
            tpProgress: a.tpProgress,
            distanceToTP1: a.distanceToTP1,
            distanceToSL: a.distanceToSL,
            outcomePrice: a.outcomePrice,
            outcomeAt: a.outcomeAt,
          };
        });
        setRecentOutcomes(newRecentOutcomes);
        console.log('[Dashboard] Live analyses count:', newRecentOutcomes.length, 'Next refresh:', nextRefresh ? new Date(nextRefresh).toLocaleTimeString() : 'N/A');
      } else {
        console.warn('[Dashboard] Live prices failed:', livePricesRes.status);
      }

      // Process credits
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        newCredits = data.credits || 0;
        setCredits(newCredits);
        console.log('[Dashboard] Credits loaded:', newCredits);
      } else {
        console.warn('[Dashboard] Credits failed:', creditsRes.status);
      }

      // Save to cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: {
            platformStats: newPlatformStats,
            userStats: newUserStats,
            recentOutcomes: newRecentOutcomes,
            credits: newCredits,
          },
          timestamp: Date.now(),
        }));
      } catch (e) {
        // Cache write failed, ignore
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [router, stepPeriod, tradeTypeFilter]);

  // Track if period or trade type changed to force refresh
  const prevPeriodRef = useRef(stepPeriod);
  const prevTradeTypeRef = useRef(tradeTypeFilter);

  // Initial load - check cache first for instant display
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    // Try to load from cache immediately (client-side only)
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setPlatformStats(data.platformStats);
          setUserStats(data.userStats);
          setRecentOutcomes(data.recentOutcomes);
          setCredits(data.credits);
          setLoading(false);
          // Still fetch fresh data in background
          fetchDashboardData(false);
          return;
        }
      }
    } catch {
      // Cache read failed, continue with fetch
    }
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  useEffect(() => {
    // Force refresh if period or trade type changed (skip initial load)
    const periodChanged = prevPeriodRef.current !== stepPeriod;
    const tradeTypeChanged = prevTradeTypeRef.current !== tradeTypeFilter;
    prevPeriodRef.current = stepPeriod;
    prevTradeTypeRef.current = tradeTypeFilter;

    // Only fetch if filters actually changed (not initial mount)
    if (periodChanged || tradeTypeChanged) {
      fetchDashboardData(true);
    }

    // Fallback: Auto-refresh every 5 minutes if candle close timer fails
    const refreshInterval = setInterval(() => {
      fetchDashboardData(true); // Force refresh, bypass cache
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchDashboardData, stepPeriod, tradeTypeFilter]);

  // Candle-close based refresh: Set timer to refresh at next candle close
  useEffect(() => {
    if (!nextCandleRefresh) return;

    // Clear previous timer
    if (candleRefreshTimerRef.current) {
      clearTimeout(candleRefreshTimerRef.current);
    }

    const now = Date.now();
    const timeUntilRefresh = nextCandleRefresh - now;

    // Only set timer if the next refresh is in the future and within 4 hours
    if (timeUntilRefresh > 0 && timeUntilRefresh < 4 * 60 * 60 * 1000) {
      console.log(`[Dashboard] Next candle refresh in ${Math.round(timeUntilRefresh / 1000)}s at ${new Date(nextCandleRefresh).toLocaleTimeString()}`);

      candleRefreshTimerRef.current = setTimeout(() => {
        console.log('[Dashboard] Candle closed! Refreshing live prices...');
        fetchDashboardData(true); // Force refresh at candle close
      }, timeUntilRefresh + 1000); // Add 1 second buffer to ensure candle is closed
    }

    return () => {
      if (candleRefreshTimerRef.current) {
        clearTimeout(candleRefreshTimerRef.current);
      }
    };
  }, [nextCandleRefresh, fetchDashboardData]);

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

  // Filter outcomes by trade type
  const filteredOutcomes = tradeTypeFilter === 'all'
    ? recentOutcomes
    : recentOutcomes.filter(o => o.tradeType === tradeTypeFilter);

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-8">

      {/* ===== GLOBAL TRADE TYPE FILTER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
          <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-400 whitespace-nowrap">Filter:</span>
          <div className="flex items-center bg-gray-100/80 dark:bg-white/5 rounded-xl p-1 border border-gray-200 dark:border-white/10">
            <button
              onClick={() => setTradeTypeFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                tradeTypeFilter === 'all'
                  ? "bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              )}
            >
              All
            </button>
            {(Object.entries(TRADE_TYPE_CONFIG) as [TradeType, typeof TRADE_TYPE_CONFIG[TradeType]][]).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setTradeTypeFilter(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    tradeTypeFilter === type
                      ? `bg-white dark:bg-slate-700 shadow-sm ${
                          config.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                          config.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
        {tradeTypeFilter !== 'all' && (
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium",
            tradeTypeFilter === 'scalping' ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400" :
            tradeTypeFilter === 'dayTrade' ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" :
            "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
          )}>
            Showing {TRADE_TYPE_CONFIG[tradeTypeFilter].label} data only
          </div>
        )}
      </div>

      {/* ===== SECTION 1: Compact Platform Performance ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 dark:from-emerald-500/10 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8">
          {/* Header - Same style as other sections */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-emerald-500/30 blur-lg rounded-full" />
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Platform Performance</h2>
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm">Real-time verification from {platformStats?.accuracy.sampleSize ?? 0} trades</p>
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
            <div className="flex-1 w-full flex flex-col items-center lg:items-stretch">
              <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-stretch">
                {/* LEFT COLUMN: Total/Week + Caution/Verified */}
                <div className="flex gap-3 justify-center sm:justify-start">
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
                        {(platformStats?.cautionRate?.totalVerified ?? 0) > 0 ? `${platformStats?.cautionRate?.rate ?? 0}%` : '—'}
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

                {/* RIGHT COLUMN: Profit Trend (full height) */}
                <div className="flex-1 w-full sm:w-auto flex gap-3 min-h-[140px]">
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

                    filteredOutcomes
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

                    const allTrades = filteredOutcomes.filter(o => o.unrealizedPnL !== undefined && o.createdAt);
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
                            <PnLChart chartData={chartData} />
                          )}
                        </div>
                      </div>
                    );
                  })()}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-full" />
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">7-Step Analysis</h2>
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm">
                  {stepPeriod === 'all' ? 'All time' : stepPeriod === 'D' ? 'Last 24h' : stepPeriod === 'W' ? 'Last 7 days' : 'Last 30 days'} average from {platformStats?.accuracy.sampleSize ?? 0} analyses
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Period Filter Buttons */}
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                {(['D', 'W', 'M', 'all'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setStepPeriod(period)}
                    className={cn(
                      "px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-md transition-all",
                      stepPeriod === period
                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                    )}
                  >
                    {period === 'all' ? 'All' : period}
                  </button>
                ))}
              </div>
              <button
                onClick={() => fetchDashboardData(true)}
                className="p-2 sm:p-2.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <Link
                href="/analyze"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-xl font-semibold transition shadow-lg shadow-cyan-500/25"
              >
                Start Analysis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
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
                }[step.step] as StepRatesKey;

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
                    className={cn(
                      "group relative",
                      // Final Verdict (step 7) spans full width on mobile when alone
                      step.step === 7 && "col-span-2 sm:col-span-1"
                    )}
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

                      {/* Info Icon with Tooltip */}
                      <div className="absolute -top-1 -right-1 group/info">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center cursor-help border border-gray-300 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">
                          <Info className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                        </div>
                        {/* Tooltip Popup - Odd steps open right, even steps open left */}
                        <div className={cn(
                          "absolute top-6 w-64 p-3 bg-slate-900 dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-700 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50",
                          step.step % 2 === 1 ? "left-0" : "right-0"
                        )}>
                          <div className={cn(
                            "absolute -top-1.5 w-3 h-3 bg-slate-900 dark:bg-slate-800 rotate-45 border-l border-t border-slate-700",
                            step.step % 2 === 1 ? "left-2" : "right-2"
                          )} />
                          <h4 className={cn("font-bold text-sm mb-2", step.color)}>{step.name}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{step.detailedInfo}</p>
                          <div className="mt-2 pt-2 border-t border-slate-700">
                            <div className="text-[10px] text-slate-400 font-medium mb-1">Key Metrics:</div>
                            <div className="flex flex-wrap gap-1">
                              {step.metrics.map((metric) => (
                                <span key={metric} className="px-1.5 py-0.5 bg-slate-800 dark:bg-slate-700 rounded text-[10px] text-slate-300">
                                  {metric}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-700">
                            <p className="text-[10px] text-slate-400">
                              <span className="font-medium">Score:</span> Average from past analyses. Updates when new analyses are completed.
                            </p>
                          </div>
                        </div>
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

                      {/* Avg Score Label */}
                      <p className="text-center text-[10px] text-gray-400 dark:text-slate-500 -mt-1 mb-2">
                        {stepHasData ? 'Avg. Score' : 'No data yet'}
                      </p>

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
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                  <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-200 dark:border-white/10">
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{userStats.totalAnalyses}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-500 dark:text-slate-400">Total</div>
                  </div>
                  <div className="bg-blue-100/80 dark:bg-blue-500/10 rounded-lg p-2 text-center border border-blue-200/50 dark:border-blue-500/20">
                    <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{userStats.activeCount || userStats.pendingAnalyses}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-500 dark:text-slate-400">Active</div>
                  </div>
                  <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-2 text-center border border-gray-200 dark:border-white/10">
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{userStats.verifiedAnalyses}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-500 dark:text-slate-400">Closed</div>
                  </div>
                  <div className="bg-green-100/80 dark:bg-green-500/10 rounded-lg p-2 text-center border border-green-200/50 dark:border-green-500/20">
                    <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">{userStats.correctAnalyses}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-500 dark:text-slate-400">TP Hit</div>
                  </div>
                  <div className="bg-red-100/80 dark:bg-red-500/10 rounded-lg p-2 text-center border border-red-200/50 dark:border-red-500/20 col-span-3 sm:col-span-1">
                    <div className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">{userStats.verifiedAnalyses - userStats.correctAnalyses}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-500 dark:text-slate-400">SL Hit</div>
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

      {/* ===== SECTION 3.5: Signal Accuracy Details ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* GO Signal Accuracy */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border border-emerald-200/50 dark:border-emerald-500/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">GO Signals</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">Trade recommendations</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-300">Accuracy</span>
              <span className={cn(
                "text-xl font-bold",
                (platformStats?.goSignalRate?.rate ?? 0) >= 60 ? "text-green-600 dark:text-green-400" :
                (platformStats?.goSignalRate?.rate ?? 0) >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                (platformStats?.goSignalRate?.totalVerified ?? 0) === 0 ? "text-gray-400" : "text-red-600 dark:text-red-400"
              )}>
                {(platformStats?.goSignalRate?.totalVerified ?? 0) > 0 ? `${platformStats?.goSignalRate?.rate}%` : '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{platformStats?.goSignalRate?.goCorrect ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">TP Hit</div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{platformStats?.goSignalRate?.goIncorrect ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">SL Hit</div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-600 dark:text-slate-300">{platformStats?.goSignalRate?.pending ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">Pending</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-500/20">
              <span className="text-gray-500 dark:text-slate-400">Total GO Signals</span>
              <span className="font-semibold text-gray-700 dark:text-slate-300">{platformStats?.goSignalRate?.totalSignals ?? 0}</span>
            </div>
          </div>
        </div>

        {/* WAIT/AVOID Accuracy */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">WAIT/AVOID</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">Caution signals</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-300">Accuracy</span>
              <span className={cn(
                "text-xl font-bold",
                (platformStats?.cautionRate?.rate ?? 0) >= 60 ? "text-green-600 dark:text-green-400" :
                (platformStats?.cautionRate?.rate ?? 0) >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                (platformStats?.cautionRate?.totalVerified ?? 0) === 0 ? "text-gray-400" : "text-red-600 dark:text-red-400"
              )}>
                {(platformStats?.cautionRate?.totalVerified ?? 0) > 0 ? `${platformStats?.cautionRate?.rate}%` : '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{platformStats?.cautionRate?.cautionCorrect ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">Correct</div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{platformStats?.cautionRate?.cautionIncorrect ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">Missed</div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-600 dark:text-slate-300">{platformStats?.cautionRate?.pending ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">Pending</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-500/20">
              <span className="text-gray-500 dark:text-slate-400">Total WAIT/AVOID</span>
              <span className="font-semibold text-gray-700 dark:text-slate-300">{platformStats?.cautionRate?.totalSignals ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Trade Plan Coverage */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200/50 dark:border-blue-500/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">Trade Plans</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">Analysis coverage</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-slate-300">Coverage</span>
              <span className={cn(
                "text-xl font-bold",
                (platformStats?.coverage?.tradePlanPercentage ?? 0) >= 80 ? "text-green-600 dark:text-green-400" :
                (platformStats?.coverage?.tradePlanPercentage ?? 0) >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                "text-gray-400"
              )}>
                {(platformStats?.coverage?.totalReports ?? 0) > 0 ? `${platformStats?.coverage?.tradePlanPercentage}%` : '—'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{platformStats?.coverage?.withTradePlan ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">With Plan</div>
              </div>
              <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-600 dark:text-slate-300">{platformStats?.coverage?.totalReports ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400">Total</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center mt-2">
              Only reports with trade plans can be verified
            </p>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-blue-500/30 blur-lg rounded-full" />
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Live Accuracy Tracking</h2>
                <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm hidden sm:block">Real-time TP/SL monitoring - trades close when targets hit</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
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

          {filteredOutcomes.length > 0 ? (
            <>
              {/* Card View - Horizontal scroll, single row */}
              {outcomeViewMode === 'card' && (
                <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                  <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {filteredOutcomes.map((outcome) => (
                    <div
                      key={outcome.id}
                      className={cn(
                        "group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:shadow-lg flex-shrink-0 w-[280px]",
                        outcome.outcome === 'correct' && "border-green-300/50 dark:border-green-500/30 bg-green-100/80 dark:bg-green-500/5",
                        outcome.outcome === 'incorrect' && "border-red-300/50 dark:border-red-500/30 bg-red-100/80 dark:bg-red-500/5",
                        outcome.outcome === 'pending' && "border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30"
                      )}
                    >
                      {/* Header: Symbol & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={getCoinIcon(outcome.symbol)}
                            alt={outcome.symbol}
                            className="w-8 h-8 rounded-lg shadow-lg object-contain"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_COIN_ICON;
                            }}
                          />
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

                      {/* Score, P/L, TP Progress Display - Same style as Reports page */}
                      <div className="flex items-center justify-between gap-1.5 p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200/50 dark:border-white/5">
                        {/* Score */}
                        <div className={cn(
                          "text-center px-2 py-1 rounded-lg flex-1",
                          (outcome.score || 0) >= 7 ? "bg-green-100 dark:bg-green-500/20" :
                          (outcome.score || 0) >= 5 ? "bg-yellow-100 dark:bg-yellow-500/20" : "bg-red-100 dark:bg-red-500/20"
                        )}>
                          <div className="text-[9px] text-gray-500 dark:text-muted-foreground">Score</div>
                          <div className={cn(
                            "font-bold text-xs",
                            (outcome.score || 0) >= 7 ? "text-green-600 dark:text-green-400" :
                            (outcome.score || 0) >= 5 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {((outcome.score || 0) * 10).toFixed(0)}%
                          </div>
                        </div>

                        <div className="text-gray-300 dark:text-muted-foreground/30">|</div>

                        {/* P/L */}
                        <div className={cn(
                          "text-center px-2 py-1 rounded-lg flex-1",
                          (outcome.unrealizedPnL || 0) >= 0
                            ? "bg-green-100 dark:bg-green-500/20"
                            : "bg-red-100 dark:bg-red-500/20"
                        )}>
                          <div className="text-[9px] text-gray-500 dark:text-muted-foreground">P/L</div>
                          <div className={cn(
                            "font-bold text-xs",
                            (outcome.unrealizedPnL || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {(outcome.unrealizedPnL || 0) >= 0 ? '+' : ''}{(outcome.unrealizedPnL || 0).toFixed(2)}%
                          </div>
                        </div>

                        <div className="text-gray-300 dark:text-muted-foreground/30">|</div>

                        {/* TP Progress - Use API value or calculate */}
                        {(() => {
                          // Use tpProgress from API if available
                          const tpProgress = outcome.tpProgress ?? (() => {
                            if (outcome.outcome === 'correct') return 100;
                            if (outcome.entryPrice && outcome.currentPrice && outcome.takeProfit1) {
                              const isLong = outcome.direction === 'long' || outcome.direction === 'LONG';
                              const totalDistance = isLong
                                ? (outcome.takeProfit1 - outcome.entryPrice)
                                : (outcome.entryPrice - outcome.takeProfit1);
                              const coveredDistance = isLong
                                ? (outcome.currentPrice - outcome.entryPrice)
                                : (outcome.entryPrice - outcome.currentPrice);
                              return totalDistance !== 0
                                ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
                                : 0;
                            }
                            return 0;
                          })();

                          // Check if TP was hit
                          const isTPHit = outcome.outcome === 'correct';
                          const isSLHit = outcome.outcome === 'incorrect';

                          return (
                            <div className={cn(
                              "text-center px-2 py-1 rounded-lg flex-1",
                              isTPHit ? "bg-green-200 dark:bg-green-500/30 ring-2 ring-green-500" :
                              isSLHit ? "bg-red-200 dark:bg-red-500/30 ring-2 ring-red-500" :
                              tpProgress >= 80 ? "bg-green-100 dark:bg-green-500/20" :
                              tpProgress >= 50 ? "bg-yellow-100 dark:bg-yellow-500/20" : "bg-blue-100 dark:bg-blue-500/20"
                            )}>
                              <div className="text-[9px] text-gray-500 dark:text-muted-foreground flex items-center justify-center gap-0.5">
                                <Target className="w-2.5 h-2.5" />
                                {isTPHit ? 'TP HIT!' : isSLHit ? 'SL HIT' : 'TP'}
                              </div>
                              <div className={cn(
                                "font-bold text-xs",
                                isTPHit ? "text-green-600 dark:text-green-300" :
                                isSLHit ? "text-red-600 dark:text-red-300" :
                                tpProgress >= 80 ? "text-green-600 dark:text-green-400" :
                                tpProgress >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"
                              )}>
                                {tpProgress.toFixed(0)}%
                              </div>
                            </div>
                          );
                        })()}

                        {/* Distance to Target */}
                        {outcome.distanceToTP1 !== undefined && outcome.distanceToTP1 !== null && (
                          <>
                            <div className="text-gray-300 dark:text-muted-foreground/30">|</div>
                            <div className="text-center px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex-1">
                              <div className="text-[9px] text-gray-500 dark:text-muted-foreground">Hedefe</div>
                              <div className="font-bold text-xs text-purple-600 dark:text-purple-400">
                                {outcome.distanceToTP1 > 0 ? '+' : ''}{outcome.distanceToTP1.toFixed(1)}%
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}

              {/* List View - 5 rows with vertical scroll */}
              {outcomeViewMode === 'list' && (
                <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                  {/* Scrollable Table Container */}
                  <div className="overflow-x-auto">
                    {/* Table Header */}
                    <div className="min-w-[900px] grid grid-cols-[120px_70px_60px_90px_90px_80px_80px_70px_70px_70px_90px] gap-2 px-4 py-3 bg-gray-200/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                      <div>Asset</div>
                      <div className="text-center">Direction</div>
                      <div className="text-center">Score</div>
                      <div className="text-right">Entry</div>
                      <div className="text-right">Current</div>
                      <div className="text-right">SL</div>
                      <div className="text-right">TP</div>
                      <div className="text-center">P/L</div>
                      <div className="text-center">TP Prog</div>
                      <div className="text-center">Status</div>
                      <div className="text-right">Date</div>
                    </div>

                    {/* Table Body - Max 5 rows visible, vertical scroll */}
                    <div className="divide-y divide-gray-200 dark:divide-white/5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      {filteredOutcomes.map((outcome) => {
                        // Use tpProgress from API if available, otherwise calculate
                        const tpProgress = outcome.tpProgress ?? (() => {
                          if (outcome.outcome === 'correct') return 100;
                          if (outcome.entryPrice && outcome.currentPrice && outcome.takeProfit1) {
                            const isLong = outcome.direction === 'long' || outcome.direction === 'LONG';
                            const totalDistance = isLong
                              ? (outcome.takeProfit1 - outcome.entryPrice)
                              : (outcome.entryPrice - outcome.takeProfit1);
                            const coveredDistance = isLong
                              ? (outcome.currentPrice - outcome.entryPrice)
                              : (outcome.entryPrice - outcome.currentPrice);
                            return totalDistance !== 0
                              ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
                              : 0;
                          }
                          return 0;
                        })();

                        const isTPHit = outcome.outcome === 'correct';
                        const isSLHit = outcome.outcome === 'incorrect';

                        return (
                          <div
                            key={outcome.id}
                            className={cn(
                              "min-w-[900px] grid grid-cols-[120px_70px_60px_90px_90px_80px_80px_70px_70px_70px_90px] gap-2 px-4 py-2.5 hover:bg-gray-200/50 dark:hover:bg-white/5 transition-colors items-center",
                              outcome.outcome === 'correct' && "bg-green-50/50 dark:bg-green-500/5",
                              outcome.outcome === 'incorrect' && "bg-red-50/50 dark:bg-red-500/5"
                            )}
                          >
                            {/* Asset */}
                            <div className="flex items-center gap-2">
                              <img
                                src={getCoinIcon(outcome.symbol)}
                                alt={outcome.symbol}
                                className="w-6 h-6 rounded-lg shadow object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = FALLBACK_COIN_ICON;
                                }}
                              />
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">{outcome.symbol}</span>
                            </div>

                            {/* Direction */}
                            <div className="flex items-center justify-center">
                              {outcome.direction ? (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
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

                            {/* Score */}
                            <div className="flex items-center justify-center">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                (outcome.score || 0) >= 7 ? "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400" :
                                (outcome.score || 0) >= 5 ? "bg-yellow-200/80 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" :
                                "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                              )}>
                                {((outcome.score || 0) * 10).toFixed(0)}%
                              </span>
                            </div>

                            {/* Entry Price */}
                            <div className="text-right font-mono text-xs text-gray-700 dark:text-slate-300">
                              {outcome.entryPrice ? `$${outcome.entryPrice.toFixed(2)}` : '—'}
                            </div>

                            {/* Current Price */}
                            <div className="text-right font-mono text-xs text-gray-700 dark:text-slate-300">
                              {outcome.currentPrice ? `$${outcome.currentPrice.toFixed(2)}` : '—'}
                            </div>

                            {/* Stop Loss */}
                            <div className="text-right font-mono text-xs text-red-600 dark:text-red-400">
                              {outcome.stopLoss ? `$${outcome.stopLoss.toFixed(2)}` : '—'}
                            </div>

                            {/* Take Profit */}
                            <div className="text-right font-mono text-xs text-green-600 dark:text-green-400">
                              {outcome.takeProfit1 ? `$${outcome.takeProfit1.toFixed(2)}` : '—'}
                            </div>

                            {/* P/L */}
                            <div className="flex items-center justify-center">
                              {outcome.unrealizedPnL !== undefined ? (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                  outcome.unrealizedPnL >= 0
                                    ? "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                    : "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                )}>
                                  {outcome.unrealizedPnL >= 0 ? '+' : ''}{outcome.unrealizedPnL.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-slate-500 text-xs">—</span>
                              )}
                            </div>

                            {/* TP Progress */}
                            <div className="flex items-center justify-center">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                isTPHit ? "bg-green-300/80 dark:bg-green-500/30 text-green-700 dark:text-green-300 ring-1 ring-green-500" :
                                isSLHit ? "bg-red-300/80 dark:bg-red-500/30 text-red-700 dark:text-red-300 ring-1 ring-red-500" :
                                tpProgress >= 80 ? "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400" :
                                tpProgress >= 50 ? "bg-yellow-200/80 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" :
                                "bg-blue-200/80 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              )}>
                                {tpProgress.toFixed(0)}%
                              </span>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-center">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                outcome.outcome === 'correct' && "bg-green-200/80 dark:bg-green-500/20 text-green-600 dark:text-green-400",
                                outcome.outcome === 'incorrect' && "bg-red-200/80 dark:bg-red-500/20 text-red-600 dark:text-red-400",
                                outcome.outcome === 'pending' && "bg-blue-200/80 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              )}>
                                {outcome.outcome === 'correct' ? 'TP HIT' : outcome.outcome === 'incorrect' ? 'SL HIT' : 'LIVE'}
                              </span>
                            </div>

                            {/* Date */}
                            <div className="text-right text-[10px] text-gray-500 dark:text-slate-400">
                              {outcome.createdAtDisplay}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-indigo-500/30 blur-lg rounded-full" />
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Data Sources & Methodology</h2>
              <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm hidden sm:block">The reliable infrastructure behind our analyses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Data Sources */}
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all hover:shadow-lg">
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
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all hover:shadow-lg">
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
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all hover:shadow-lg">
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
            <div className="group bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-500/30 transition-all hover:shadow-lg">
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
          href="/pricing"
          className="flex flex-col items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 rounded-xl border border-yellow-200 dark:border-yellow-500/30 transition group"
        >
          <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition" />
          <span className="font-medium text-gray-900 dark:text-white">Buy Credits</span>
        </Link>
      </div>
    </div>
  );
}
