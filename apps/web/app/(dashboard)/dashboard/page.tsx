'use client';

// ===========================================
// Dashboard Home Page
// Pro trader focused - Statistics and performance tracking
// ===========================================

import { CreditBalance } from '../../../components/credits/CreditBalance';
import { DailyRewards } from '../../../components/rewards/DailyRewards';
import { StreakDisplay } from '../../../components/rewards/StreakDisplay';
import { LevelProgress } from '../../../components/rewards/LevelProgress';
import { RecentAnalyses } from '../../../components/analysis/RecentAnalyses';
import { AnalysisStats } from '../../../components/dashboard/AnalysisStats';
import { PerformanceMetrics } from '../../../components/dashboard/PerformanceMetrics';
import { ChevronDown, Gift, ArrowRight, RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [showRewards, setShowRewards] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Increment key to force all children to remount and refetch
    setRefreshKey(prev => prev + 1);
    // Wait a bit for visual feedback
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Credits */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your performance and make informed decisions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/analyze"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            New Analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <CreditBalance key={`credit-${refreshKey}`} />
        </div>
      </div>

      {/* PRIMARY: Analysis Performance Stats */}
      <div className="mb-8">
        <AnalysisStats key={`stats-${refreshKey}`} />
      </div>

      {/* Performance Metrics - Detailed Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Detailed Performance</h2>
        <PerformanceMetrics key={`perf-${refreshKey}`} />
      </div>

      {/* Recent Analyses */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
        <RecentAnalyses key={`recent-${refreshKey}`} />
      </div>

      {/* SECONDARY: Gamification/Rewards - Collapsible */}
      <div className="border rounded-lg">
        <button
          onClick={() => setShowRewards(!showRewards)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            <span className="font-semibold">Rewards & Progress</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${
              showRewards ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showRewards && (
          <div className="p-4 pt-0 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StreakDisplay key={`streak-${refreshKey}`} />
              <LevelProgress key={`level-${refreshKey}`} />
              <DailyRewards key={`rewards-${refreshKey}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
