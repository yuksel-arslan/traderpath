'use client';

import { Star, Loader2 } from 'lucide-react';
import { useTierInfo } from '../../hooks/useRewardsAPI';

export function LevelProgress() {
  const { data, loading } = useTierInfo();

  const level = data?.currentTier?.tier ?? 1;
  const tierName = data?.currentTier?.name ?? 'Trader';
  const ap = data?.analysisPoints ?? 0;
  const apForNext = data?.nextTier?.apRequired ?? 100;
  const progress = data?.progress ?? 0;
  const apRemaining = data?.nextTier?.apRemaining ?? apForNext - ap;

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
        <div className="p-2 bg-yellow-500/10 rounded-lg">
          <Star className="w-6 h-6 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-semibold">Tier {level}</h3>
          <p className="text-sm text-muted-foreground">{tierName}</p>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>{ap.toLocaleString()} AP</span>
          <span className="text-muted-foreground">{apForNext.toLocaleString()} AP</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {data?.nextTier ? `${apRemaining} AP to Tier ${level + 1}` : 'Max tier reached'}
      </div>
    </div>
  );
}
