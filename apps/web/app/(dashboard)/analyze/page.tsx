'use client';

// ===========================================
// Analyze Landing Page
// With Statistics Cards, Trade Type Selector & Coin Selector
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart3,
  Target,
  FileText,
  CheckCircle2,
  XCircle,
  Timer,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';
import { CreditBalance } from '../../../components/credits/CreditBalance';
import type { TradeType } from '../../../components/analysis/TradeTypeSelector';

// Lazy load heavy components for better performance
const CoinSelector = dynamic(
  () => import('../../../components/common/CoinSelector').then(mod => ({ default: mod.CoinSelector })),
  { ssr: false, loading: () => <div className="h-24 bg-muted/30 rounded-lg animate-pulse" /> }
);

const TradeTypeSelector = dynamic(
  () => import('../../../components/analysis/TradeTypeSelector').then(mod => ({ default: mod.TradeTypeSelector })),
  { ssr: false, loading: () => <div className="h-32 bg-muted/30 rounded-lg animate-pulse" /> }
);

const RecentAnalyses = dynamic(
  () => import('../../../components/analysis/RecentAnalyses').then(mod => ({ default: mod.RecentAnalyses })),
  { ssr: false, loading: () => <div className="h-40 bg-muted/30 rounded-lg animate-pulse" /> }
);

interface AnalysisStats {
  totalAnalyses: number;
  activeCount: number;
  closedCount: number;
  tpHits: number;
  slHits: number;
  accuracy: number;
}

export default function AnalyzePage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [tradeType, setTradeType] = useState<TradeType>('dayTrade');

  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await authFetch('/api/analysis/statistics');

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalAnalyses: statsData.totalAnalyses || 0,
          activeCount: statsData.activeCount || statsData.pendingAnalyses || 0,
          closedCount: statsData.verifiedAnalyses || 0,
          tpHits: statsData.correctAnalyses || 0,
          slHits: (statsData.verifiedAnalyses || 0) - (statsData.correctAnalyses || 0),
          accuracy: statsData.accuracy || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
      {/* ===== SECTION 1: Analysis Statistics Header ===== */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-2 sm:p-4 border border-gray-200 dark:border-slate-700/50 text-center">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-slate-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalAnalyses || 0}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-2 sm:p-4 border border-blue-200 dark:border-blue-500/30 text-center">
          <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.activeCount || 0}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Active</div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-2 sm:p-4 border border-gray-200 dark:border-slate-700/50 text-center">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-slate-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats?.closedCount || 0}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Closed</div>
        </div>

        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-2 sm:p-4 border border-green-200 dark:border-green-500/30 text-center">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats?.tpHits || 0}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">TP Hits</div>
        </div>

        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-2 sm:p-4 border border-red-200 dark:border-red-500/30 text-center">
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 dark:text-red-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats?.slHits || 0}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">SL Hits</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-2 sm:p-4 border border-emerald-200 dark:border-emerald-500/30 text-center">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400 mx-auto mb-1 sm:mb-2" />
          <div className={cn("text-lg sm:text-2xl font-bold", getAccuracyColor(stats?.accuracy || 0))}>
            {(stats?.accuracy || 0) > 0 ? `${stats?.accuracy.toFixed(1)}%` : '-'}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Accuracy</div>
        </div>
      </div>

      {/* ===== SECTION 2: New Analysis ===== */}
      <div className="bg-white dark:bg-slate-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">New Analysis</h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400">
              AI-powered trading insights in 7 steps
            </p>
          </div>
          <CreditBalance />
        </div>

        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Trade Type Selector */}
          <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/30 rounded-xl p-3 sm:p-6">
            <TradeTypeSelector
              value={tradeType}
              onChange={setTradeType}
              variant="cards"
              showCreditCost={false}
            />
          </div>

          {/* Coin Selector */}
          <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700/30 rounded-xl p-3 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Select Trading Pair</h2>
            <CoinSelector tradeType={tradeType} />
          </div>

          {/* Recent Analyses */}
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Recent Analyses</h2>
            <RecentAnalyses />
          </div>
        </div>
      </div>
    </div>
  );
}
