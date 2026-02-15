'use client';

import { Flame, Loader2 } from 'lucide-react';
import { useDailyRewards } from '../../hooks/useRewardsAPI';

export function StreakDisplay() {
  const { data, loading } = useDailyRewards();

  const streakDays = data?.streak?.days ?? 0;
  const nextBonus = data?.streak?.nextBonus ?? 20;

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6 flex items-center justify-center min-h-[140px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Flame className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h3 className="font-semibold">Daily Streak</h3>
          <p className="text-sm text-muted-foreground">Keep it going!</p>
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-4xl font-bold">{streakDays}</span>
        <span className="text-muted-foreground">days</span>
      </div>

      <div className="text-sm text-muted-foreground">
        +{nextBonus} credits bonus at 7 day streak
      </div>

      {/* Streak Progress */}
      <div className="flex gap-1 mt-4">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div
            key={day}
            className={`flex-1 h-2 rounded-full ${
              day <= streakDays ? 'bg-orange-500' : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
