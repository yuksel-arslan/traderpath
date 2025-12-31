'use client';

// ===========================================
// Daily Rewards Component
// ===========================================

import { useState } from 'react';
import { Gift, RotateCw, Brain, PlayCircle, Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DailyRewardsProps {
  className?: string;
}

export function DailyRewards({ className }: DailyRewardsProps) {
  const [claimedLogin, setClaimedLogin] = useState(false);
  const [spunWheel, setSpunWheel] = useState(false);
  const [answeredQuiz, setAnsweredQuiz] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);

  const rewards = [
    {
      id: 'login',
      name: 'Daily Login',
      icon: Gift,
      credits: 3,
      claimed: claimedLogin,
      action: () => setClaimedLogin(true),
    },
    {
      id: 'spin',
      name: 'Lucky Spin',
      icon: RotateCw,
      credits: '1-10',
      claimed: spunWheel,
      action: () => setSpunWheel(true),
    },
    {
      id: 'quiz',
      name: 'Daily Quiz',
      icon: Brain,
      credits: 5,
      claimed: answeredQuiz,
      action: () => setAnsweredQuiz(true),
    },
    {
      id: 'ad',
      name: 'Watch Ad',
      icon: PlayCircle,
      credits: 2,
      claimed: adsWatched >= 3,
      subtitle: `${adsWatched}/3`,
      action: () => setAdsWatched((prev) => Math.min(prev + 1, 3)),
    },
  ];

  return (
    <div className={cn('bg-card rounded-lg border p-4', className)}>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Gem className="w-5 h-5 text-amber-500" />
        Daily Rewards
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {rewards.map((reward) => {
          const Icon = reward.icon;
          return (
            <motion.button
              key={reward.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={reward.action}
              disabled={reward.claimed}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border transition-all',
                reward.claimed
                  ? 'bg-green-500/10 border-green-500/20 cursor-default'
                  : 'bg-secondary hover:bg-secondary/80 border-transparent hover:border-amber-500/20'
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6 mb-1',
                  reward.claimed ? 'text-green-500' : 'text-amber-500'
                )}
              />
              <span className="text-xs font-medium">{reward.name}</span>
              <span className="text-xs text-muted-foreground">
                {reward.claimed ? (
                  'Claimed!'
                ) : (
                  <>
                    +{reward.credits} <Gem className="w-3 h-3 inline text-amber-500" />
                    {reward.subtitle && ` (${reward.subtitle})`}
                  </>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
