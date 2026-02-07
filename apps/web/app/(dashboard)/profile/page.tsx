'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Check,
  Lock,
  Flame,
  TrendingUp,
  BarChart3,
  Loader2,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTierInfo } from '../../../hooks/useRewardsAPI';
import { AP_EARNING_RULES } from '@/lib/types';

const TIER_COLORS: Record<number, { bg: string; border: string; text: string; bar: string; badge: string }> = {
  1: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-500 dark:text-slate-400', bar: 'bg-slate-500', badge: 'bg-slate-500' },
  2: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500 dark:text-blue-400', bar: 'bg-blue-500', badge: 'bg-blue-500' },
  3: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-500 dark:text-teal-400', bar: 'bg-teal-500', badge: 'bg-teal-500' },
  4: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500 dark:text-amber-400', bar: 'bg-gradient-to-r from-amber-400 to-yellow-500', badge: 'bg-amber-500' },
};

export default function ProfilePage() {
  const { data: tierInfo, loading } = useTierInfo();
  const [copied, setCopied] = useState(false);

  const handleCopyReferral = () => {
    const code = tierInfo?.referralCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 md:px-8 lg:px-12 py-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500 mb-4" />
          <p className="text-muted-foreground">Loading your trader profile...</p>
        </div>
      </div>
    );
  }

  if (!tierInfo) {
    return (
      <div className="w-full px-4 md:px-8 lg:px-12 py-6">
        <p className="text-muted-foreground">Unable to load profile. Please try again.</p>
      </div>
    );
  }

  const currentTierNum = tierInfo.currentTier.tier;
  const colors = TIER_COLORS[currentTierNum] || TIER_COLORS[1];

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6 max-w-4xl mx-auto">
      {/* ===== Trader Profile Header ===== */}
      <div className={`relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Trader Profile</p>
            <h1 className={`text-2xl font-bold ${colors.text}`}>
              {tierInfo.currentTier.name}
            </h1>
            {tierInfo.name && (
              <p className="text-sm text-muted-foreground mt-0.5">{tierInfo.name}</p>
            )}
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl bg-gradient-to-br ${tierInfo.currentTier.gradient} text-white shadow-lg`}>
            {currentTierNum}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium">
              {tierInfo.analysisPoints.toLocaleString()} Analysis Points
            </span>
            {tierInfo.nextTier ? (
              <span className="text-muted-foreground">
                {tierInfo.nextTier.apRequired.toLocaleString()} AP needed
              </span>
            ) : (
              <span className={colors.text}>Maximum Tier Reached</span>
            )}
          </div>
          <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colors.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${tierInfo.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {tierInfo.nextTier && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {tierInfo.nextTier.apRemaining.toLocaleString()} AP remaining to advance to {tierInfo.nextTier.name}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-background/50">
            <BarChart3 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{tierInfo.totalAnalyses}</p>
            <p className="text-xs text-muted-foreground">Total Analyses</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-background/50">
            <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{tierInfo.streakDays}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-background/50">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-teal-500" />
            <p className="text-lg font-bold">{tierInfo.analysisPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Analysis Points</p>
          </div>
        </div>
      </div>

      {/* ===== Tier Progression ===== */}
      <div>
        <h2 className="text-lg font-bold mb-4">Tier Progression</h2>
        <div className="space-y-3">
          {tierInfo.allTiers.map((tier) => {
            const isCurrent = tier.tier === currentTierNum;
            const isUnlocked = tierInfo.analysisPoints >= tier.apRequired;
            const tc = TIER_COLORS[tier.tier] || TIER_COLORS[1];

            return (
              <div
                key={tier.tier}
                className={`rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? `${tc.border} ${tc.bg}`
                    : isUnlocked
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-border/50 bg-card'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                      isUnlocked
                        ? `bg-gradient-to-br ${tier.gradient} text-white`
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tier.tier}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{tier.name}</h3>
                      {isCurrent && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${tc.badge}`}>
                          CURRENT
                        </span>
                      )}
                      {isUnlocked && !isCurrent && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {!isUnlocked && (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {tier.apRequired === 0 ? 'Starting tier' : `${tier.apRequired.toLocaleString()} AP required`}
                    </p>
                    <ul className="space-y-1">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className={`w-3 h-3 flex-shrink-0 ${isUnlocked ? 'text-green-500' : 'text-muted-foreground/50'}`} />
                          <span className={isUnlocked ? '' : 'opacity-60'}>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== How to Earn Analysis Points ===== */}
      <div>
        <h2 className="text-lg font-bold mb-4">How to Earn Analysis Points</h2>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {/* Group by category */}
          {['analysis', 'engagement', 'social'].map((cat) => {
            const rules = AP_EARNING_RULES.filter(r => r.category === cat);
            if (rules.length === 0) return null;
            const categoryLabel = cat === 'analysis' ? 'Analysis Actions' : cat === 'engagement' ? 'Daily Engagement' : 'Social';

            return (
              <div key={cat}>
                <div className="px-4 py-2 bg-muted/30 border-b border-border/50">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{categoryLabel}</p>
                </div>
                {rules.map((rule, i) => (
                  <div key={rule.action} className={`flex items-center justify-between px-4 py-3 ${i < rules.length - 1 ? 'border-b border-border/30' : ''}`}>
                    <span className="text-sm">{rule.description}</span>
                    <span className="text-sm font-bold text-teal-500">+{rule.points} AP</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Referral Section ===== */}
      {tierInfo.referralCode && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Refer Fellow Traders</h3>
              <p className="text-sm text-muted-foreground">
                Earn 200 AP and 20 credits for each trader who joins with your referral code.
              </p>
            </div>
            <button
              onClick={handleCopyReferral}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>
          <div className="mt-3 p-3 bg-background/60 rounded-lg">
            <p className="text-xs text-muted-foreground mb-0.5">Your Referral Code</p>
            <p className="font-mono font-bold">{tierInfo.referralCode}</p>
          </div>
        </div>
      )}

      {/* ===== Quick Links ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/rewards"
          className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition"
        >
          <div>
            <p className="font-medium text-sm">Daily Rewards</p>
            <p className="text-xs text-muted-foreground">Claim credits and earn AP daily</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link
          href="/analyze"
          className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition"
        >
          <div>
            <p className="font-medium text-sm">Run Analysis</p>
            <p className="text-xs text-muted-foreground">Earn up to 160 AP per analysis</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
