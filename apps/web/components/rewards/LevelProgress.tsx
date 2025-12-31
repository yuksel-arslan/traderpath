'use client';

import { Star } from 'lucide-react';

export function LevelProgress() {
  // TODO: Fetch from API
  const level = 12;
  const xp = 2800;
  const xpForNext = 3500;
  const progress = (xp / xpForNext) * 100;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-500/10 rounded-lg">
          <Star className="w-6 h-6 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-semibold">Level {level}</h3>
          <p className="text-sm text-muted-foreground">Trader</p>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>{xp.toLocaleString()} XP</span>
          <span className="text-muted-foreground">{xpForNext.toLocaleString()} XP</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {xpForNext - xp} XP to level {level + 1}
      </div>
    </div>
  );
}
