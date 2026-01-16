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
      "relative overflow-hidden rounded-xl p-4 border transition-all",
      colorClasses[color],
      href && "hover:scale-[1.02] cursor-pointer"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", iconColors[color])} />
        <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{subValue}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ActiveTradeCard({ trade }: { trade: RecentAnalysis }) {
  const isProfit = (trade.unrealizedPnL || 0) >= 0;
  const verdictConfig = {
    go: { bg: 'bg-green-500', text: 'GO' },
    conditional_go: { bg: 'bg-yellow-500', text: 'C-GO' },
    wait: { bg: 'bg-gray-500', text: 'WAIT' },
    avoid: { bg: 'bg-red-500', text: 'AVOID' },
  };

  return (
    <Link
      href={`/analysis/${trade.id}`}
      className="flex-shrink-0 w-[200px] bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={getCoinIcon(trade.symbol)}
            alt={trade.symbol}
            className="w-6 h-6 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }}
          />
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{trade.symbol}</span>
        </div>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
          verdictConfig[trade.verdict].bg
        )}>
          {verdictConfig[trade.verdict].text}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
          {trade.direction === 'LONG' ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          {trade.direction}
        </div>
        <span className={cn(
          "font-bold text-sm",
          isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {isProfit ? '+' : ''}{trade.unrealizedPnL?.toFixed(1) || 0}%
        </span>
      </div>

      {trade.outcome !== 'pending' && (
        <div className={cn(
          "mt-2 pt-2 border-t flex items-center justify-center gap-1 text-xs font-medium",
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
  const [loading, setLoading] = useState(true);
  const [pnlViewMode, setPnlViewMode] = useState<'daily' | 'weekly'>('weekly');
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
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      const [creditsRes, platformRes, statsRes, livePricesRes] = await Promise.all([
        authFetch('/api/user/credits'),
        fetch(getApiUrl('/api/analysis/platform-stats')),
        authFetch('/api/analysis/statistics'),
        authFetch('/api/analysis/live-prices'),
      ]);

      let newCredits = 0;
      let newPlatformStats = null;
      let newUserStats = null;
      let newRecentAnalyses: RecentAnalysis[] = [];

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

      // Save to cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: {
            credits: newCredits,
            platformStats: newPlatformStats,
            userStats: newUserStats,
            recentAnalyses: newRecentAnalyses,
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

  // Build chart data
  const buildChartData = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const hours: number[] = [];
    for (let h = 0; h < 24; h += 3) hours.push(h);

    const days: string[] = [];
    const dayLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const hourlyPnL: Record<number, number[]> = {};
    hours.forEach(h => { hourlyPnL[h] = []; });

    const dailyPnL: Record<string, number[]> = {};
    days.forEach(day => { dailyPnL[day] = []; });

    recentAnalyses
      .filter(o => o.unrealizedPnL !== undefined && o.createdAt)
      .forEach(o => {
        const tradeDate = new Date(o.createdAt);
        const tradeDateStr = tradeDate.toISOString().split('T')[0];
        const tradeHour = tradeDate.getHours();

        if (tradeDateStr === todayStr) {
          const hourBucket = Math.floor(tradeHour / 3) * 3;
          if (hourlyPnL[hourBucket] !== undefined) {
            hourlyPnL[hourBucket].push(o.unrealizedPnL || 0);
          }
        }

        if (dailyPnL[tradeDateStr]) {
          dailyPnL[tradeDateStr].push(o.unrealizedPnL || 0);
        }
      });

    const dailyChartData = hours.map((h) => {
      const trades = hourlyPnL[h];
      const avgPnl = trades.length > 0 ? trades.reduce((sum, v) => sum + v, 0) / trades.length : 0;
      return {
        name: `${h.toString().padStart(2, '0')}:00`,
        hour: h,
        pnl: avgPnl,
        positive: Math.max(0, avgPnl),
        negative: Math.min(0, avgPnl),
        count: trades.length,
      };
    });

    const weeklyChartData = days.map((day, i) => {
      const trades = dailyPnL[day];
      const avgPnl = trades.length > 0 ? trades.reduce((sum, v) => sum + v, 0) / trades.length : 0;
      return {
        name: dayLabels[i],
        date: day,
        pnl: avgPnl,
        positive: Math.max(0, avgPnl),
        negative: Math.min(0, avgPnl),
        count: trades.length,
      };
    });

    return pnlViewMode === 'daily' ? dailyChartData : weeklyChartData;
  };

  const chartData = buildChartData();
  const relevantTrades = recentAnalyses.filter(o => o.unrealizedPnL !== undefined);
  const avgPnL = relevantTrades.length > 0
    ? relevantTrades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0) / relevantTrades.length
    : 0;
  const hasChartData = relevantTrades.length >= 1;
  const activeTrades = recentAnalyses.filter(t => t.outcome === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== SECTION 1: Credits & Quick Actions ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Credit Balance */}
        <div className="lg:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />
          <div className="relative z-10 p-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-amber-500/40 blur-xl rounded-full animate-pulse" />
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
                  <Gem className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Credits</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{credits}</span>
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
                  : `Running low on credits (${credits} remaining)`
                }
              </div>
            )}
            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-medium hover:opacity-90 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Buy
              </Link>
              <Link
                href="/rewards"
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300"
              >
                Earn free
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/analyze"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border border-emerald-200/50 dark:border-emerald-500/20 p-4 hover:border-emerald-400 dark:hover:border-emerald-400 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">New Analysis</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Analyze a coin</p>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/reports"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 border border-purple-200/50 dark:border-purple-500/20 p-4 hover:border-purple-400 dark:hover:border-purple-400 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center mb-2 shadow-lg shadow-purple-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Reports</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Analysis history</p>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/ai-expert"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 border border-cyan-200/50 dark:border-cyan-500/20 p-4 hover:border-cyan-400 dark:hover:border-cyan-400 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-2 shadow-lg shadow-cyan-500/30">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">AI Expert</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Ask questions</p>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/alerts"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20 p-4 hover:border-amber-400 dark:hover:border-amber-400 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2 shadow-lg shadow-amber-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Alerts</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Price alerts</p>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>

      {/* ===== SECTION 2: Statistics Grid ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Target}
          label="Platform Accuracy"
          value={platformStats?.accuracy?.overall ? `${platformStats.accuracy.overall}%` : '—'}
          subValue={`${platformStats?.accuracy?.sampleSize || 0} verified`}
          color="emerald"
        />
        <StatCard
          icon={BarChart3}
          label="Total Analyses"
          value={platformStats?.platform?.totalAnalyses || 0}
          subValue={`${platformStats?.platform?.weeklyAnalyses || 0} this week`}
          color="purple"
        />
        <StatCard
          icon={Users}
          label="Platform Users"
          value={platformStats?.platform?.totalUsers || 0}
          color="blue"
        />
        <StatCard
          icon={Award}
          label="My Accuracy"
          value={userStats?.verifiedAnalyses ? `${userStats.accuracy?.toFixed(0)}%` : '—'}
          subValue={userStats?.verifiedAnalyses ? `${userStats.correctAnalyses}/${userStats.verifiedAnalyses}` : 'No data yet'}
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="GO Signals"
          value={userStats?.goSignals || 0}
          subValue={`${userStats?.avoidSignals || 0} avoided`}
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Active Trades"
          value={userStats?.activeCount || 0}
          subValue={userStats?.activeCount ? `${userStats.activeProfitable} profitable` : 'Start analyzing'}
          color="cyan"
        />
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Performance</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">P/L over time</p>
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
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Trades</h2>
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Performance</h2>
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
