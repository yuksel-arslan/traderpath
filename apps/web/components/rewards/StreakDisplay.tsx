'use client';

import { Flame } from 'lucide-react';

export function StreakDisplay() {
  // TODO: Fetch from API
  const streakDays = 7;
  const nextBonus = 20;

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
