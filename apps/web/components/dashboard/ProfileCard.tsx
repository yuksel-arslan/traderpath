'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Flame,
  TrendingUp,
  BarChart3,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { authFetch } from '../../lib/api';

// ===========================================
// Design Tokens
// ===========================================
const COLORS = {
  turkuaz: '#4dd0e1',
  neonGreen: '#00f5c4',
  coral: '#ff5f5f',
} as const;

// ===========================================
// Types
// ===========================================
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

// Tier accent colors mapped to the new palette
const TIER_ACCENT: Record<number, string> = {
  1: '#94a3b8', // slate
  2: '#60a5fa', // blue
  3: COLORS.turkuaz, // turkuaz
  4: '#fbbf24', // amber/gold
};

// ===========================================
// Skeleton
// ===========================================
function ProfileSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-2.5 w-24 rounded bg-white/10" />
          <div className="h-5 w-36 rounded bg-white/10" />
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10" />
      </div>
      <div className="h-3 w-full rounded-full bg-white/5 mb-3" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-12 rounded-xl bg-white/5" />
        <div className="h-12 rounded-xl bg-white/5" />
        <div className="h-12 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

// ===========================================
// ProfileCard Component
// ===========================================
export function ProfileCard() {
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
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchTierInfo();
  }, []);

  if (loading) return <ProfileSkeleton />;
  if (!data) return null;

  const tierNum = data.currentTier.tier;
  const accent = TIER_ACCENT[tierNum] || TIER_ACCENT[1];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-1">
            Trader Profile
          </p>
          <h3 className="text-lg font-bold tracking-tight" style={{ color: accent }}>
            {data.currentTier.name}
            <span className="text-xs ml-1.5 opacity-60 font-medium">(Tier {tierNum})</span>
          </h3>
        </div>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
            boxShadow: `0 0 20px ${accent}40`,
          }}
        >
          {tierNum}
        </div>
      </div>

      {/* Progress Bar - 12px height, turkuaz fill */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400 font-sans tabular-nums">
            {data.analysisPoints.toLocaleString()} AP
          </span>
          {data.nextTier ? (
            <span className="text-gray-500 font-sans tabular-nums">
              {data.nextTier.apRequired.toLocaleString()} AP
            </span>
          ) : (
            <span style={{ color: accent }} className="font-medium">Max Tier</span>
          )}
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${data.progress}%`,
              backgroundColor: COLORS.turkuaz,
              boxShadow: `0 0 10px ${COLORS.turkuaz}60`,
            }}
          />
        </div>
        {data.nextTier && (
          <p className="text-[10px] text-gray-500 mt-1.5 font-sans">
            {data.nextTier.apRemaining.toLocaleString()} AP to {data.nextTier.name}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: BarChart3, value: data.totalAnalyses, label: 'Analyses', color: 'text-gray-400' },
          { icon: Flame, value: data.streakDays, label: 'Streak', color: 'text-orange-400' },
          { icon: TrendingUp, value: data.analysisPoints.toLocaleString(), label: 'Points', color: 'text-gray-400' },
        ].map(stat => (
          <div key={stat.label} className="text-center p-2 rounded-xl bg-white/[0.02]">
            <stat.icon className={cn('w-3.5 h-3.5 mx-auto mb-0.5', stat.color)} />
            <p className="text-sm font-bold font-sans text-white">{stat.value}</p>
            <p className="text-[10px] text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Next Tier Benefits */}
      {data.nextTier && (
        <div className="mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Next Tier Benefits</p>
          <ul className="space-y-1">
            {data.nextTier.benefits.slice(0, 2).map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <Check className="w-3 h-3 flex-shrink-0" style={{ color: COLORS.neonGreen }} />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <Link
        href="/profile"
        className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl text-xs font-medium transition-all duration-200 bg-white/5 hover:bg-white/10 min-h-[48px]"
        style={{ color: accent }}
      >
        View All Benefits
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
