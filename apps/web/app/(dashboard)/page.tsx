'use client';

// ===========================================
// Dashboard Home Page
// ===========================================

import { CreditBalance } from '@/components/credits/CreditBalance';
import { DailyRewards } from '@/components/rewards/DailyRewards';
import { CoinSelector } from '@/components/common/CoinSelector';
import { StreakDisplay } from '@/components/rewards/StreakDisplay';
import { LevelProgress } from '@/components/rewards/LevelProgress';
import { RecentAnalyses } from '@/components/analysis/RecentAnalyses';

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            Ready for your next analysis?
          </p>
        </div>
        <CreditBalance />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StreakDisplay />
        <LevelProgress />
        <DailyRewards />
      </div>

      {/* Quick Analysis */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Analysis</h2>
        <CoinSelector />
      </div>

      {/* Recent Analyses */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
        <RecentAnalyses />
      </div>
    </div>
  );
}
