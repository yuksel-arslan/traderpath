'use client';

// ===========================================
// Dashboard Home Page - Clean Modern Design
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Bell,
  Coins,
  Loader2,
  Minus,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DashboardStats {
  totalAnalyses: number;
  winRate: number;
  activeAlerts: number;
  creditsLeft: number;
}

interface RecentAnalysis {
  id: string;
  symbol: string;
  direction: 'long' | 'short' | 'wait';
  score: number;
  priceChange?: number;
  createdAt: string;
}

const popularCoins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA'];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch stats and recent analyses in parallel
      const [statsRes, analysesRes, creditsRes] = await Promise.all([
        fetch('/api/analysis/statistics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/analysis/recent', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/user/credits', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Process stats
      let statsData: DashboardStats = {
        totalAnalyses: 0,
        winRate: 0,
        activeAlerts: 0,
        creditsLeft: 0,
      };

      if (statsRes.ok) {
        const data = await statsRes.json();
        statsData.totalAnalyses = data.totalAnalyses || 0;
        statsData.winRate = data.hitRate || 0;
      }

      if (creditsRes.ok) {
        const data = await creditsRes.json();
        statsData.creditsLeft = data.credits || 0;
      }

      // TODO: Fetch active alerts count when alerts feature is ready
      statsData.activeAlerts = 0;

      setStats(statsData);

      // Process analyses
      if (analysesRes.ok) {
        const data = await analysesRes.json();
        const mapped = (data.data || []).map((a: any) => ({
          id: a.id,
          symbol: a.symbol,
          direction: a.verdict === 'go' || a.verdict === 'conditional_go' ? 'long' :
                     a.verdict === 'avoid' ? 'short' : 'wait',
          score: a.score,
          priceChange: a.priceChange || null,
          createdAt: a.createdAt,
        }));
        setAnalyses(mapped);
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Analyses */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Total Analyses</p>
          <p className="text-3xl font-bold text-white">{stats?.totalAnalyses || 0}</p>
        </div>

        {/* Win Rate */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Win Rate</p>
          <p className="text-3xl font-bold text-green-400">{stats?.winRate?.toFixed(0) || 0}%</p>
        </div>

        {/* Active Alerts */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Active Alerts</p>
          <p className="text-3xl font-bold text-cyan-400">{stats?.activeAlerts || 0}</p>
        </div>

        {/* Credits Left */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Credits Left</p>
          <p className="text-3xl font-bold text-white">{stats?.creditsLeft || 0}</p>
        </div>

        {/* Quick Analysis */}
        <div className="col-span-2 lg:col-span-1 bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-3">Quick Analysis</p>
          <div className="flex flex-wrap gap-2">
            {popularCoins.slice(0, 3).map((coin) => (
              <Link
                key={coin}
                href={`/analyze/${coin}`}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-white transition"
              >
                {coin}
              </Link>
            ))}
            <Link
              href="/analyze"
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-400 transition"
            >
              +50
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Analyses */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Analyses</h2>

        {analyses.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700/50 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <h3 className="font-semibold text-white mb-2">No analyses yet</h3>
            <p className="text-sm text-slate-400 mb-4">Start your first analysis to see your trading insights</p>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
            >
              Start Analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const isLong = analysis.direction === 'long';
              const isShort = analysis.direction === 'short';
              const isWait = analysis.direction === 'wait';

              return (
                <Link
                  key={analysis.id}
                  href={`/analysis/${analysis.id}`}
                  className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition"
                >
                  {/* Left - Symbol Info */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                      analysis.symbol === 'BTC' ? 'bg-amber-500' :
                      analysis.symbol === 'ETH' ? 'bg-blue-500' :
                      analysis.symbol === 'SOL' ? 'bg-purple-500' :
                      analysis.symbol === 'BNB' ? 'bg-yellow-500' :
                      'bg-slate-600'
                    )}>
                      {analysis.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{analysis.symbol}/USDT</p>
                      <p className="text-sm text-slate-400">{analysis.createdAt}</p>
                    </div>
                  </div>

                  {/* Right - Direction, Score, Change */}
                  <div className="flex items-center gap-4">
                    {/* Direction Badge */}
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold",
                      isLong ? 'bg-green-500/20 text-green-400' :
                      isShort ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-600/50 text-slate-400'
                    )}>
                      {isLong ? 'LONG' : isShort ? 'SHORT' : 'WAIT'}
                    </span>

                    {/* Score */}
                    <span className="font-semibold text-white">
                      {(analysis.score * 10).toFixed(0)}/100
                    </span>

                    {/* Price Change */}
                    {analysis.priceChange !== null && analysis.priceChange !== undefined ? (
                      <span className={cn(
                        "font-semibold",
                        analysis.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {analysis.priceChange >= 0 ? '+' : ''}{analysis.priceChange.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
