'use client';

// ===========================================
// Analyze Landing Page
// With Statistics & Step Accuracy Cards
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CoinSelector } from '../../../components/common/CoinSelector';
import { CreditBalance } from '../../../components/credits/CreditBalance';
import {
  TrendingUp,
  BarChart3,
  Shield,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
  Activity,
  LineChart,
  Brain,
  FileText,
  CheckCircle2,
  XCircle,
  Timer,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// Lazy load heavy components
const RecentAnalyses = dynamic(
  () => import('../../../components/analysis/RecentAnalyses').then(mod => ({ default: mod.RecentAnalyses })),
  { ssr: false, loading: () => <div className="h-40 bg-muted/30 rounded-lg animate-pulse" /> }
);

// Step accuracy data structure
interface StepAccuracy {
  marketPulse: number;
  assetScanner: number;
  safetyCheck: number;
  timing: number;
  tradePlan: number;
  trapCheck: number;
  finalVerdict: number;
}

interface AnalysisStats {
  totalAnalyses: number;
  activeCount: number;
  closedCount: number;
  tpHits: number;
  slHits: number;
  accuracy: number;
  stepAccuracy: StepAccuracy;
  // New fields for data quality
  methodology: 'outcome-verified' | 'score-based' | 'none';
  sampleSize: number;
  outcomeVerifiedCount: number;
}

// Analysis steps for the selector panel
const ANALYSIS_STEPS = [
  { icon: TrendingUp, title: 'Market Pulse', description: 'Sentiment & conditions', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: BarChart3, title: 'Asset Scanner', description: 'Technical analysis', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: Shield, title: 'Safety Check', description: 'Whale detection', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: Clock, title: 'Timing Analysis', description: 'Entry windows', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: Target, title: 'Trade Plan', description: 'TP/SL levels', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { icon: AlertTriangle, title: 'Trap Check', description: 'Liquidity traps', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: CheckCircle, title: 'Final Verdict', description: 'AI recommendation', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

// Step accuracy cards configuration
const STEP_ACCURACY_CONFIG = [
  { key: 'marketPulse', name: 'Market Pulse', icon: Activity, color: 'blue' },
  { key: 'assetScanner', name: 'Asset Scanner', icon: LineChart, color: 'cyan' },
  { key: 'safetyCheck', name: 'Safety Check', icon: Shield, color: 'green' },
  { key: 'timing', name: 'Timing', icon: Clock, color: 'yellow' },
  { key: 'tradePlan', name: 'Trade Plan', icon: Target, color: 'purple' },
  { key: 'trapCheck', name: 'Trap Check', icon: AlertTriangle, color: 'orange' },
  { key: 'finalVerdict', name: 'Final Verdict', icon: Brain, color: 'emerald' },
];

export default function AnalyzePage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch platform stats for step accuracy
      const [platformRes, statsRes] = await Promise.all([
        fetch('/api/analysis/platform-stats'),
        fetch('/api/analysis/statistics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let stepAccuracy: StepAccuracy = {
        marketPulse: 0,
        assetScanner: 0,
        safetyCheck: 0,
        timing: 0,
        tradePlan: 0,
        trapCheck: 0,
        finalVerdict: 0,
      };

      let methodology: 'outcome-verified' | 'score-based' | 'none' = 'none';
      let sampleSize = 0;
      let outcomeVerifiedCount = 0;

      if (platformRes.ok) {
        const platformData = await platformRes.json();
        const accuracyData = platformData.data?.accuracy;
        if (accuracyData) {
          stepAccuracy = accuracyData.stepRates || stepAccuracy;
          methodology = accuracyData.methodology === 'outcome-verified' ? 'outcome-verified' :
                        accuracyData.sampleSize > 0 ? 'score-based' : 'none';
          sampleSize = accuracyData.sampleSize || 0;
          outcomeVerifiedCount = accuracyData.outcomeVerifiedCount || 0;
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalAnalyses: statsData.totalAnalyses || 0,
          activeCount: statsData.activeCount || statsData.pendingAnalyses || 0,
          closedCount: statsData.verifiedAnalyses || 0,
          tpHits: statsData.correctAnalyses || 0,
          slHits: (statsData.verifiedAnalyses || 0) - (statsData.correctAnalyses || 0),
          accuracy: statsData.accuracy || 0,
          stepAccuracy,
          methodology,
          sampleSize,
          outcomeVerifiedCount,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getAccuracyColor = (value: number) => {
    if (value >= 70) return 'text-green-500 dark:text-green-400';
    if (value >= 50) return 'text-yellow-500 dark:text-yellow-400';
    if (value > 0) return 'text-red-500 dark:text-red-400';
    return 'text-gray-400 dark:text-slate-500';
  };

  const getStepColor = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
      cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
      yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* ===== SECTION 1: Analysis Statistics Header ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50 text-center">
          <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalAnalyses || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Total Analyses</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30 text-center">
          <Timer className="w-5 h-5 text-blue-500 dark:text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.activeCount || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Active</div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50 text-center">
          <BarChart3 className="w-5 h-5 text-gray-500 dark:text-slate-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.closedCount || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Closed</div>
        </div>

        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/30 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.tpHits || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">TP Hits</div>
        </div>

        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30 text-center">
          <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.slHits || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">SL Hits</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-500/30 text-center">
          <Target className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
          <div className={cn("text-2xl font-bold", getAccuracyColor(stats?.accuracy || 0))}>
            {(stats?.accuracy || 0) > 0 ? `${stats?.accuracy.toFixed(1)}%` : '-'}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Accuracy</div>
        </div>
      </div>

      {/* ===== SECTION 3: New Analysis ===== */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-200 dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Analysis</h1>
            <p className="text-gray-500 dark:text-slate-400">
              AI-powered trading insights in 7 steps
            </p>
          </div>
          <CreditBalance />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left: Coin Selector */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Trading Pair</h2>
              <CoinSelector />
            </div>

            {/* Recent Analyses */}
            <div className="flex flex-col flex-1 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Analyses</h2>
              <div className="flex-1">
                <RecentAnalyses />
              </div>
            </div>
          </div>

          {/* Right: 7-Step Analysis Accuracy */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/30 rounded-xl p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {stats?.methodology === 'outcome-verified' ? '7-Step Accuracy' : '7-Step Analysis'}
                </h3>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  stats?.methodology === 'outcome-verified'
                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                    : stats?.methodology === 'score-based'
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                )}>
                  {stats?.methodology === 'outcome-verified'
                    ? `${stats.outcomeVerifiedCount} verified`
                    : stats?.methodology === 'score-based'
                    ? 'Avg scores'
                    : 'No data'}
                </span>
              </div>
              <div className="space-y-2">
                {STEP_ACCURACY_CONFIG.map((step, index) => {
                  const value = stats?.stepAccuracy?.[step.key as keyof StepAccuracy] || 0;
                  const colorSet = getStepColor(step.color);
                  const stepInfo = ANALYSIS_STEPS[index];
                  const isVerified = stats?.methodology === 'outcome-verified';

                  return (
                    <div key={step.key} className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border",
                      colorSet.bg,
                      colorSet.border
                    )}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", colorSet.bg)}>
                        <step.icon className={cn("w-4 h-4", colorSet.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">{index + 1}.</span>
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{step.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400">{stepInfo?.description}</p>
                      </div>
                      <div className={cn(
                        "text-lg font-bold min-w-[45px] text-right",
                        isVerified ? getAccuracyColor(value) : "text-gray-400 dark:text-slate-500"
                      )}>
                        {isVerified && value > 0 ? `${value}%` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Methodology Info */}
              {stats?.methodology === 'score-based' && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">
                    Accuracy will be calculated after trades close (TP/SL hit).
                  </p>
                </div>
              )}

              {/* Credit Cost Info */}
              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Analysis cost</span>
                  </div>
                  <span className="font-semibold text-amber-500">25 credits</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  or use 1 of your daily free analyses
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
