'use client';

// ===========================================
// Overview Page - Account Summary & Performance
// Shows credit balance, performance chart, and key statistics
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { cn } from '../../../lib/utils';
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
}

// ===========================================
// Main Component
// ===========================================
export default function OverviewPage() {
  const [credits, setCredits] = useState(0);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [pnlViewMode, setPnlViewMode] = useState<'daily' | 'weekly'>('weekly');

  const fetchData = useCallback(async () => {
    try {
      const [creditsRes, statsRes, livePricesRes] = await Promise.all([
        authFetch('/api/user/credits'),
        authFetch('/api/analysis/statistics'),
        authFetch('/api/analysis/live-prices'),
      ]);

      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data.credits || 0);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setUserStats(data);
      }

      if (livePricesRes.ok) {
        const data = await livePricesRes.json();
        const analyses = data.data?.analyses || [];
        setRecentAnalyses(analyses.map((a: any) => {
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

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
          };
        }));
      }
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build chart data
  const buildChartData = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Hours for daily view
    const hours: number[] = [];
    for (let h = 0; h < 24; h += 3) {
      hours.push(h);
    }

    // Days for weekly view
    const days: string[] = [];
    const dayLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    // Group by hour for daily
    const hourlyPnL: Record<number, number[]> = {};
    hours.forEach(h => { hourlyPnL[h] = []; });

    // Group by date for weekly
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Loading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== CREDIT BALANCE SECTION ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-brand-teal/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-brand-coral/20 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Credit Icon with Glow */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-amber-500/40 blur-xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                <Gem className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>

            {/* Credit Info */}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Available Credits</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">{credits}</span>
                <span className="text-xl text-slate-400 font-medium">credits</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Buy Credits
                </Link>
                <Link
                  href="/rewards"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Earn free credits
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PERFORMANCE CHART SECTION ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 dark:from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative z-10 p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <LineChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Your trading performance over time</p>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setPnlViewMode('daily')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
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
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                    pnlViewMode === 'weekly'
                      ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                  )}
                >
                  This Week
                </button>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-lg font-bold",
                avgPnL >= 0
                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {hasChartData ? `${avgPnL >= 0 ? '+' : ''}${avgPnL.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-64 sm:h-80">
            {!hasChartData ? (
              <div className="h-full flex flex-col items-center justify-center">
                <LineChart className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" />
                <p className="text-gray-500 dark:text-slate-400">No trading data yet</p>
                <Link
                  href="/analyze"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  Start your first analysis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <PnLChart chartData={chartData} />
            )}
          </div>
        </div>
      </div>

      {/* ===== STATISTICS SECTION ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Total Analyses</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{userStats?.totalAnalyses ?? 0}</p>
          </div>
        </div>

        {/* Accuracy */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Accuracy</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {userStats?.verifiedAnalyses && userStats.verifiedAnalyses > 0
                ? `${userStats.accuracy?.toFixed(0) ?? 0}%`
                : '—'}
            </p>
            {userStats?.verifiedAnalyses && userStats.verifiedAnalyses > 0 && (
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {userStats.correctAnalyses}/{userStats.verifiedAnalyses} verified
              </p>
            )}
          </div>
        </div>

        {/* GO Signals */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">GO Signals</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{userStats?.goSignals ?? 0}</p>
            {userStats?.avoidSignals !== undefined && userStats.avoidSignals > 0 && (
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {userStats.avoidSignals} avoided
              </p>
            )}
          </div>
        </div>

        {/* Active Performance */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Active P/L</span>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              userStats?.activePerformance && userStats.activePerformance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}>
              {userStats?.activeCount && userStats.activeCount > 0
                ? `${userStats.activePerformance >= 0 ? '+' : ''}${userStats.activePerformance?.toFixed(1) ?? 0}%`
                : '—'}
            </p>
            {userStats?.activeCount && userStats.activeCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {userStats.activeCount} active trades
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/analyze"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-teal/10 to-emerald-500/10 border border-brand-teal/20 p-5 hover:border-brand-teal/40 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-teal to-emerald-500 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-teal transition-colors">New Analysis</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Start analyzing a coin</p>
            </div>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-brand-teal group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/reports"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 p-5 hover:border-purple-500/40 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-500 transition-colors">View Reports</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">See your analysis history</p>
            </div>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/dashboard"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-5 hover:border-cyan-500/40 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-cyan-500 transition-colors">Dashboard</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Detailed analytics</p>
            </div>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
