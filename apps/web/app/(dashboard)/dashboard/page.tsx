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
import { ChevronDown, Gift, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [showRewards, setShowRewards] = useState(false);

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
          <Link
            href="/analyze"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            New Analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <CreditBalance />
        </div>
      </div>

      {/* PRIMARY: Analysis Performance Stats */}
      <div className="mb-8">
        <AnalysisStats />
      </div>

      {/* Performance Metrics - Detailed Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Detailed Performance</h2>
        <PerformanceMetrics />
      </div>

      {/* Recent Analyses */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
        <RecentAnalyses />
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
              <StreakDisplay />
              <LevelProgress />
              <DailyRewards />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
