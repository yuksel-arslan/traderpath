'use client';

// ===========================================
// Unified Dashboard - Compact & Professional
// Merged Overview + Dashboard pages
// ===========================================

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Gem,
  Plus,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  Loader2,
  LineChart,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  Users,
  Zap,
  Calendar,
  Eye,
  Award,
  FileText,
  Brain,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import { getApiUrl, authFetch } from '../../../lib/api';

// Lazy load chart component
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

// ===========================================
// Types
// ===========================================
type TradeType = 'scalping' | 'dayTrade' | 'swing';

interface PlatformStats {
  platform: {
    totalUsers: number;
    totalAnalyses: number;
    totalReports: number;
    weeklyAnalyses: number;
    monthlyAnalyses: number;
  };
  accuracy: {
    overall: number;
    sampleSize?: number;
    methodology?: string;
  };
  goSignalRate?: {
    rate: number;
    totalVerified: number;
  };
  verdicts: {
    go: number;
    conditional_go: number;
    wait: number;
    avoid: number;
  };
}

interface UserStats {
  totalAnalyses: number;
  completedAnalyses: number;
  verifiedAnalyses: number;
  correctAnalyses: number;
  pendingAnalyses: number;
  accuracy: number;
  activeCount: number;
  activeProfitable: number;
  activePerformance: number;
  avgScore: number;
  goSignals: number;
  avoidSignals: number;
  lastAnalysisDate: string | null;
}

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  outcome: 'correct' | 'incorrect' | 'pending';
  unrealizedPnL?: number;
  createdAt: string;
  direction?: string;
  entryPrice?: number;
  currentPrice?: number;
  tradeType?: TradeType;
  stopLoss?: number;
  takeProfit1?: number;
}

interface TopCoin {
  symbol: string;
  totalScore: number;
  reliabilityScore: number;
  verdict: string;
  direction: string | null;
  price: number;
  priceChange24h: number;
}

interface PerformanceDay {
  date: string;
  realized: number;
  unrealized: number;
  total: number;
  trades: number;
  cumulative: number;
}

interface PerformanceData {
  daily: PerformanceDay[];
  summary: {
    totalRealizedPnL: number;
    totalTrades: number;
    activeTrades: number;
    winRate: number;
  };
}

// ===========================================
// Helper Functions
// ===========================================

// Format large numbers with separators (1000079 → 1,000,079)
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString('en-US');
}

// Format credits with full number display
function formatCredits(num: number): string {
  return num.toLocaleString('en-US');
}

// ===========================================
// Helper Components
// ===========================================
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'gray',
  href
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'gray' | 'emerald' | 'purple' | 'blue' | 'amber' | 'red' | 'green' | 'cyan';
  href?: string;
}) {
  const colorClasses = {
    gray: 'bg-gray-100/80 dark:bg-white/5 border-gray-200 dark:border-white/10',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20',
    purple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200/50 dark:border-purple-500/20',
    blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20',
    red: 'bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20',
    green: 'bg-green-50 dark:bg-green-500/10 border-green-200/50 dark:border-green-500/20',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200/50 dark:border-cyan-500/20',
  };

  const iconColors = {
    gray: 'text-gray-500',
    emerald: 'text-emerald-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    green: 'text-green-500',
    cyan: 'text-cyan-500',
  };

  const content = (
    <div className={cn(
      "relative overflow-hidden rounded-xl p-4 border transition-all shadow-sm",
      colorClasses[color],
      href && "hover:scale-[1.02] cursor-pointer"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", iconColors[color])} />
        <span className="text-xs font-medium text-gray-600 dark:text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-600 dark:text-slate-500 mt-0.5">{subValue}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ActiveTradeCard({ trade }: { trade: RecentAnalysis }) {
  const pnlValue = trade.unrealizedPnL;
  const hasValidPnL = pnlValue !== null && pnlValue !== undefined;
  const isProfit = hasValidPnL && pnlValue >= 0;
  const verdictConfig = {
    go: { bg: 'bg-green-500', text: 'GO' },
    conditional_go: { bg: 'bg-yellow-500', text: 'C-GO' },
    wait: { bg: 'bg-gray-500', text: 'WAIT' },
    avoid: { bg: 'bg-red-500', text: 'AVOID' },
  };

  return (
    <Link
      href={`/analyze/details/${trade.id}`}
      className="flex-shrink-0 w-[200px] bg-white dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 p-3 hover:border-primary/50 transition-colors shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={getCoinIcon(trade.symbol)}
            alt={trade.symbol}
            className="w-6 h-6 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }}
          />
          <span className="font-bold text-gray-800 dark:text-white text-sm">{trade.symbol}</span>
        </div>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
          verdictConfig[trade.verdict].bg
        )}>
          {verdictConfig[trade.verdict].text}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
          {trade.direction?.toLowerCase() === 'long' ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          {trade.direction?.toLowerCase() || 'long'}
        </div>
        <span className={cn(
          "font-bold text-sm",
          !hasValidPnL ? "text-gray-500 dark:text-slate-500" :
          isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {hasValidPnL ? `${isProfit ? '+' : ''}${pnlValue!.toFixed(1)}%` : 'N/A'}
        </span>
      </div>

      {trade.outcome !== 'pending' && (
        <div className={cn(
          "mt-2 pt-2 border-t flex items-center justify-center gap-1 text-xs font-semibold",
          trade.outcome === 'correct'
            ? "border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400"
            : "border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
        )}>
          {trade.outcome === 'correct' ? (
            <><CheckCircle2 className="w-3 h-3" /> TP Hit</>
          ) : (
            <><XCircle className="w-3 h-3" /> SL Hit</>
          )}
        </div>
      )}
    </Link>
  );
}

// ===========================================
// Main Component
// ===========================================
const CACHE_KEY = 'dashboard_unified_cache';
const CACHE_DURATION = 5 * 60 * 1000;

export default function DashboardPage() {
  const router = useRouter();
  const [credits, setCredits] = useState(0);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [topCoins, setTopCoins] = useState<TopCoin[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pnlViewMode, setPnlViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh) {
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
              setCredits(data.credits);
              setPlatformStats(data.platformStats);
              setUserStats(data.userStats);
              setRecentAnalyses(data.recentAnalyses);
              setTopCoins(data.topCoins || []);
              setPerformanceData(data.performanceData || null);
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      const [creditsRes, platformRes, statsRes, livePricesRes, topCoinsRes, perfHistoryRes] = await Promise.all([
        authFetch('/api/user/credits'),
        fetch(getApiUrl('/api/analysis/platform-stats')),
        authFetch('/api/analysis/statistics'),
        authFetch('/api/analysis/live-prices'),
        fetch(getApiUrl('/api/analysis/top-coins?limit=5')),
        authFetch('/api/analysis/performance-history?days=30'),
      ]);

      let newCredits = 0;
      let newPlatformStats = null;
      let newUserStats = null;
      let newRecentAnalyses: RecentAnalysis[] = [];
      let newTopCoins: TopCoin[] = [];
      let newPerformanceData: PerformanceData | null = null;

      if (creditsRes.ok) {
        const data = await creditsRes.json();
        newCredits = data.data?.balance || data.credits || 0;
        setCredits(newCredits);
      }

      if (platformRes.ok) {
        const data = await platformRes.json();
        newPlatformStats = data.data;
        setPlatformStats(newPlatformStats);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        newUserStats = data;
        setUserStats(newUserStats);
      }

      if (livePricesRes.ok) {
        const data = await livePricesRes.json();
        const analyses = data.data?.analyses || [];
        newRecentAnalyses = analyses.map((a: any) => {
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

          let tradeType: TradeType | undefined;
          if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
          else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
          else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';

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
            unrealizedPnL: a.unrealizedPnL,
            createdAt: a.createdAt,
            direction: a.direction,
            entryPrice: a.entryPrice,
            currentPrice: a.currentPrice,
            tradeType,
            stopLoss: a.stopLoss,
            takeProfit1: a.takeProfit1,
          };
        });
        setRecentAnalyses(newRecentAnalyses);
      }

      if (topCoinsRes.ok) {
        const data = await topCoinsRes.json();
        newTopCoins = data.data?.coins || [];
        setTopCoins(newTopCoins);
      }

      if (perfHistoryRes.ok) {
        const data = await perfHistoryRes.json();
        newPerformanceData = data.data || null;
        setPerformanceData(newPerformanceData);
      }

      // Save to cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: {
            credits: newCredits,
            platformStats: newPlatformStats,
            userStats: newUserStats,
            recentAnalyses: newRecentAnalyses,
            topCoins: newTopCoins,
            performanceData: newPerformanceData,
          },
          timestamp: Date.now(),
        }));
      } catch {}
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [fetchData]);

  // Build chart data from performanceData API
  const buildChartData = () => {
    if (!performanceData?.daily?.length) {
      // Return empty data structure
      if (pnlViewMode === 'daily') {
        const hours: number[] = [];
        for (let h = 0; h < 24; h += 3) hours.push(h);
        return hours.map(h => ({
          name: `${h.toString().padStart(2, '0')}:00`,
          pnl: 0,
          positive: 0,
          negative: 0,
          count: 0,
        }));
      }
      if (pnlViewMode === 'monthly') {
        return Array(4).fill(null).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (3 - i) * 7);
          return {
            name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            pnl: 0,
            positive: 0,
            negative: 0,
            count: 0,
          };
        });
      }
      // Weekly - last 7 days
      return Array(7).fill(null).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          pnl: 0,
          positive: 0,
          negative: 0,
          count: 0,
        };
      });
    }

    const daily = performanceData.daily;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Daily view: Today's realized + unrealized (hourly breakdown not available from API, show total)
    if (pnlViewMode === 'daily') {
      const todayData = daily.find(d => d.date === todayStr);
      const hours: number[] = [];
      for (let h = 0; h < 24; h += 3) hours.push(h);

      // For daily view, show cumulative realized + current unrealized
      const currentHour = today.getHours();
      const currentBucket = Math.floor(currentHour / 3) * 3;

      return hours.map(h => {
        // Show realized P/L accumulated through the day + unrealized for current bucket
        const isCurrentOrPast = h <= currentBucket;
        const pnl = isCurrentOrPast && todayData
          ? (h === currentBucket ? todayData.total : todayData.realized / 8 * (h / 3 + 1))
          : 0;
        return {
          name: `${h.toString().padStart(2, '0')}:00`,
          pnl: Number(pnl.toFixed(2)),
          positive: Math.max(0, pnl),
          negative: Math.min(0, pnl),
          count: h === currentBucket && todayData ? todayData.trades : 0,
        };
      });
    }

    // Weekly view: Last 7 days with cumulative realized P/L
    if (pnlViewMode === 'weekly') {
      const weekDays: string[] = [];
      const weekDayLabels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        weekDays.push(d.toISOString().split('T')[0]);
        weekDayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      }

      return weekDays.map((day, i) => {
        const dayData = daily.find(d => d.date === day);
        const pnl = dayData?.cumulative || 0;
        return {
          name: weekDayLabels[i],
          date: day,
          pnl,
          positive: Math.max(0, pnl),
          negative: Math.min(0, pnl),
          count: dayData?.trades || 0,
        };
      });
    }

    // Monthly view: Last 4 weeks aggregated
    const monthWeeks: { start: Date; end: Date; label: string }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      monthWeeks.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      });
    }

    return monthWeeks.map((week) => {
      const weekStartStr = week.start.toISOString().split('T')[0];
      const weekEndStr = week.end.toISOString().split('T')[0];

      // Sum realized P/L for days in this week
      const weekData = daily.filter(d => d.date >= weekStartStr && d.date <= weekEndStr);
      const totalPnl = weekData.reduce((sum, d) => sum + d.realized, 0);
      const totalTrades = weekData.reduce((sum, d) => sum + d.trades, 0);

      return {
        name: week.label,
        pnl: Number(totalPnl.toFixed(2)),
        positive: Math.max(0, totalPnl),
        negative: Math.min(0, totalPnl),
        count: totalTrades,
      };
    });
  };

  const chartData = buildChartData();

  // Calculate avgPnL based on selected period
  const calculatePeriodAvgPnL = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let periodTrades = recentAnalyses.filter(o => o.unrealizedPnL !== undefined && o.createdAt);

    if (pnlViewMode === 'daily') {
      // Only today's trades
      periodTrades = periodTrades.filter(o => {
        const tradeDateStr = new Date(o.createdAt).toISOString().split('T')[0];
        return tradeDateStr === todayStr;
      });
    } else if (pnlViewMode === 'weekly') {
      // Last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      periodTrades = periodTrades.filter(o => new Date(o.createdAt) >= weekAgo);
    } else {
      // Last 30 days
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      periodTrades = periodTrades.filter(o => new Date(o.createdAt) >= monthAgo);
    }

    if (periodTrades.length === 0) return 0;
    return periodTrades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0) / periodTrades.length;
  };

  const avgPnL = calculatePeriodAvgPnL();
  const hasChartData = recentAnalyses.filter(o => o.unrealizedPnL !== undefined).length >= 1;
  const activeTrades = recentAnalyses.filter(t => t.outcome === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== SECTION 1: Credits ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-amber-200/50 dark:border-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/10 dark:from-amber-500/20 via-transparent to-transparent" />
        <div className="relative z-10 p-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-amber-500/30 dark:bg-amber-500/40 blur-xl rounded-full animate-pulse" />
              <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
                <Gem className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-slate-400 uppercase tracking-wider">Credits</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-800 dark:text-white">{formatCredits(credits)}</span>
                {credits < 10 && credits > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full animate-pulse">
                    Low
                  </span>
                )}
                {credits === 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full animate-pulse">
                    Empty
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-medium hover:opacity-90 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Buy
              </Link>
              <Link
                href="/rewards"
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                Earn free
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          {/* Low credit warning */}
          {credits < 10 && (
            <div className={cn(
              "mt-3 p-2 rounded-lg text-xs font-medium flex items-center gap-2",
              credits === 0
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
            )}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {credits === 0
                ? "No credits left! Buy or earn credits to continue."
                : `Running low on credits (${formatCredits(credits)} remaining)`
              }
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION 2: Statistics Grid ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Target}
          label="Platform Accuracy"
          value={platformStats?.accuracy?.overall ? `${platformStats.accuracy.overall}%` : '—'}
          subValue={`${formatNumber(platformStats?.accuracy?.sampleSize || 0)} verified`}
          color="emerald"
        />
        <StatCard
          icon={BarChart3}
          label="Total Analyses"
          value={formatNumber(platformStats?.platform?.totalAnalyses || 0)}
          subValue={`${formatNumber(platformStats?.platform?.weeklyAnalyses || 0)} this week`}
          color="purple"
        />
        <StatCard
          icon={Users}
          label="Platform Users"
          value={formatNumber(platformStats?.platform?.totalUsers || 0)}
          color="blue"
        />
        <StatCard
          icon={Award}
          label="My Accuracy"
          value={userStats?.verifiedAnalyses ? `${userStats.accuracy?.toFixed(0)}%` : (userStats?.avgScore ? `${(userStats.avgScore * 10).toFixed(0)}%` : '—')}
          subValue={userStats?.verifiedAnalyses
            ? `${userStats.correctAnalyses}/${userStats.verifiedAnalyses} closed`
            : (userStats?.avgScore ? 'Avg analysis score' : 'No data yet')}
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="GO Signals"
          value={formatNumber(userStats?.goSignals || 0)}
          subValue={`${formatNumber(userStats?.avoidSignals || 0)} avoided`}
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Active Trades"
          value={formatNumber(userStats?.activeCount || 0)}
          subValue={userStats?.activeCount
            ? `${formatNumber(userStats.activeProfitable || 0)} profitable (${userStats.activePerformance?.toFixed(0) || 0}%)`
            : 'Start analyzing'}
          color="cyan"
        />
      </div>

      {/* ===== SECTION 2.5: Top Coins by Analysis Accuracy Score ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-900/20 dark:via-slate-800 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 dark:from-emerald-500/20 via-transparent to-transparent" />

        <div className="relative z-10 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <TrendingUp className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">Top Coins by Score</h2>
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400">AI-analyzed every 2 hours</p>
              </div>
            </div>
            <Link
              href="/analyze"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Analyze now <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Top Coins Grid */}
          {topCoins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topCoins.map((coin, index) => {
                const verdictLower = coin.verdict?.toLowerCase() || '';
                const isGo = verdictLower === 'go' || verdictLower === 'go!';
                const isConditional = verdictLower.includes('conditional');

                return (
                  <Link
                    key={coin.symbol}
                    href={`/analyze?symbol=${coin.symbol}`}
                    className="group p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-slate-500">#{index + 1}</span>
                        <img
                          src={getCoinIcon(coin.symbol)}
                          alt={coin.symbol}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }}
                        />
                        <span className="font-bold text-gray-800 dark:text-white">{coin.symbol}</span>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-1.5 py-0.5 rounded",
                        isGo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        isConditional ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                      )}>
                        {isGo ? 'GO' : isConditional ? 'COND' : coin.verdict?.toUpperCase()?.slice(0, 4)}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-lg font-bold text-gray-800 dark:text-white">
                          {(coin.reliabilityScore ?? coin.totalScore ?? 0).toFixed(0)}
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-slate-400">Score</div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-sm font-semibold",
                          (coin.priceChange24h ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {(coin.priceChange24h ?? 0) >= 0 ? '+' : ''}{(coin.priceChange24h ?? 0).toFixed(2)}%
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-slate-400">24h</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-500 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-400 mb-1">Scanning market...</p>
              <p className="text-xs text-gray-600 dark:text-slate-500">Top coins will appear after the next scan cycle</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION 3: Performance Chart ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 dark:from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative z-10 p-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <LineChart className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-teal-600 via-red-500 to-teal-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">Performance</h2>
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400">P/L over time</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setPnlViewMode('daily')}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    pnlViewMode === 'daily'
                      ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                  )}
                >
                  Today
                </button>
                <button
                  onClick={() => setPnlViewMode('weekly')}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    pnlViewMode === 'weekly'
                      ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                  )}
                >
                  Week
                </button>
                <button
                  onClick={() => setPnlViewMode('monthly')}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    pnlViewMode === 'monthly'
                      ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                  )}
                >
                  Month
                </button>
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-lg font-bold text-sm",
                avgPnL >= 0
                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {hasChartData ? `${avgPnL >= 0 ? '+' : ''}${avgPnL.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 sm:h-56">
            {!hasChartData ? (
              <div className="h-full flex flex-col items-center justify-center">
                <LineChart className="w-10 h-10 text-gray-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No trading data yet</p>
                <Link
                  href="/analyze"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Start your first analysis
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <PnLChart chartData={chartData} />
            )}
          </div>
        </div>
      </div>

      {/* ===== SECTION 4: Active Trades ===== */}
      {activeTrades.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/5 dark:from-blue-500/10 via-transparent to-transparent" />

          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Eye className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-teal-600 via-red-500 to-teal-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">Active Trades</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{activeTrades.length} positions being tracked</p>
                </div>
              </div>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Horizontal Scroll */}
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {activeTrades.slice(0, 10).map((trade) => (
                  <ActiveTradeCard key={trade.id} trade={trade} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 5: My Performance Summary ===== */}
      {userStats && userStats.totalAnalyses > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent" />

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Award className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-teal-600 via-red-500 to-teal-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">My Performance</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">Your trading statistics</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 text-center border border-gray-200 dark:border-white/10">
                <div className="text-xl font-bold text-gray-900 dark:text-white">{userStats.totalAnalyses}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center border border-blue-200/50 dark:border-blue-500/20">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{userStats.activeCount || userStats.pendingAnalyses}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Active</div>
              </div>
              <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 text-center border border-gray-200 dark:border-white/10">
                <div className="text-xl font-bold text-gray-900 dark:text-white">{userStats.verifiedAnalyses}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Closed</div>
              </div>
              <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-3 text-center border border-green-200/50 dark:border-green-500/20">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{userStats.correctAnalyses}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">TP Hit</div>
              </div>
              <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3 text-center border border-red-200/50 dark:border-red-500/20">
                <div className="text-xl font-bold text-red-600 dark:text-red-400">{userStats.verifiedAnalyses - userStats.correctAnalyses}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">SL Hit</div>
              </div>
            </div>

            {/* Performance Message */}
            <div className={cn(
              "mt-4 text-center text-xs font-medium p-3 rounded-xl border",
              userStats.verifiedAnalyses === 0
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20"
                : userStats.accuracy >= 70
                ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-500/20"
                : userStats.accuracy >= 50
                ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-500/20"
                : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/20"
            )}>
              {userStats.verifiedAnalyses === 0
                ? "Trades are still active. Results will update when TP/SL is hit."
                : userStats.accuracy >= 70
                ? "Excellent performance! Your analysis accuracy is outstanding."
                : userStats.accuracy >= 50
                ? "Good progress! Keep improving your analysis skills."
                : "Consider reviewing your analysis approach for better results."}
            </div>
          </div>
        </div>
      )}

      {/* Empty State for New Users */}
      {(!userStats || userStats.totalAnalyses === 0) && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700 p-8 text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Start Your Trading Journey</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
            Analyze coins using our 7-step methodology and track your performance with real-time accuracy metrics.
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition shadow-lg shadow-emerald-500/25"
          >
            Start First Analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
