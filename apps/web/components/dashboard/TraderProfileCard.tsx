'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Flame,
  TrendingUp,
  BarChart3,
  Loader2,
  Check,
} from 'lucide-react';
import { authFetch } from '../../lib/api';

interface TierData {
  analysisPoints: number;
  currentTier: {
    tier: number;
    name: string;
    color: string;
    gradient: string;
    benefits: string[];
  };
  nextTier: {
    tier: number;
    name: string;
    apRequired: number;
    apRemaining: number;
    benefits: string[];
  } | null;
  progress: number;
  streakDays: number;
  totalAnalyses: number;
  name: string | null;
}

// Tier gradient map
const TIER_GRADIENTS: Record<number, string> = {
  1: 'from-slate-500/20 to-slate-600/10',
  2: 'from-blue-500/20 to-blue-600/10',
  3: 'from-teal-500/20 to-emerald-600/10',
  4: 'from-amber-500/20 to-yellow-600/10',
};

const TIER_BORDER: Record<number, string> = {
  1: 'border-slate-500/30',
  2: 'border-blue-500/30',
  3: 'border-teal-500/30',
  4: 'border-amber-500/30',
};

const TIER_TEXT: Record<number, string> = {
  1: 'text-slate-500',
  2: 'text-blue-500',
  3: 'text-teal-500',
  4: 'text-amber-500',
};

const TIER_BAR: Record<number, string> = {
  1: 'bg-slate-500',
  2: 'bg-blue-500',
  3: 'bg-teal-500',
  4: 'bg-gradient-to-r from-amber-400 to-yellow-500',
};

export function TraderProfileCard() {
  const [data, setData] = useState<TierData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTierInfo = async () => {
      try {
        const response = await authFetch('/api/rewards/tier-info');
        const json = await response.json();
        if (json.success) {
          setData(json.data);
        }
      } catch {
        // Silently fail - card will show loading
      } finally {
        setLoading(false);
      }
    };
    fetchTierInfo();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-32 mb-3" />
        <div className="h-3 bg-muted rounded w-48 mb-4" />
        <div className="h-2 bg-muted rounded-full w-full mb-2" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
    );
  }

  if (!data) return null;

  const tierNum = data.currentTier.tier;
  const gradient = TIER_GRADIENTS[tierNum] || TIER_GRADIENTS[1];
  const border = TIER_BORDER[tierNum] || TIER_BORDER[1];
  const tierTextColor = TIER_TEXT[tierNum] || TIER_TEXT[1];
  const barColor = TIER_BAR[tierNum] || TIER_BAR[1];

  return (
    <div className={`rounded-xl border ${border} bg-gradient-to-br ${gradient} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Trader Profile</p>
          <h3 className={`text-lg font-bold ${tierTextColor}`}>
            {data.currentTier.name}
            <span className="text-xs ml-1.5 opacity-70">(Tier {tierNum})</span>
          </h3>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br ${data.currentTier.gradient} text-white shadow-md`}>
          {tierNum}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium">
            {data.analysisPoints.toLocaleString()} AP
          </span>
          {data.nextTier ? (
            <span className="text-muted-foreground">
              {data.nextTier.apRequired.toLocaleString()} AP
            </span>
          ) : (
            <span className={tierTextColor}>Max Tier</span>
          )}
        </div>
        <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${data.progress}%` }}
          />
        </div>
        {data.nextTier && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {data.nextTier.apRemaining.toLocaleString()} AP to {data.nextTier.name}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <BarChart3 className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
          <p className="text-sm font-semibold">{data.totalAnalyses}</p>
          <p className="text-[10px] text-muted-foreground">Analyses</p>
        </div>
        <div className="text-center">
          <Flame className="w-3.5 h-3.5 mx-auto mb-0.5 text-orange-500" />
          <p className="text-sm font-semibold">{data.streakDays}</p>
          <p className="text-[10px] text-muted-foreground">Streak</p>
        </div>
        <div className="text-center">
          <TrendingUp className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
          <p className="text-sm font-semibold">{data.analysisPoints.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Points</p>
        </div>
      </div>

      {/* Next Tier Benefits Preview */}
      {data.nextTier && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Next Tier Benefits</p>
          <ul className="space-y-0.5">
            {data.nextTier.benefits.slice(0, 2).map((benefit, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <Link
        href="/profile"
        className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors bg-background/60 hover:bg-background/80 ${tierTextColor}`}
      >
        View All Benefits
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
