'use client';

import { useState } from 'react';
import {
  Trophy,
  Flame,
  Star,
  Gift,
  Target,
  Shield,
  Zap,
  Crown,
  Medal,
  Award,
  Lock,
  Check,
  ChevronRight
} from 'lucide-react';

// Achievement categories
const ACHIEVEMENTS = [
  {
    id: 'first-analysis',
    name: 'First Steps',
    description: 'Complete your first analysis',
    icon: Star,
    xp: 50,
    unlocked: true,
    progress: 1,
    target: 1,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    icon: Flame,
    xp: 100,
    unlocked: true,
    progress: 7,
    target: 7,
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day login streak',
    icon: Crown,
    xp: 500,
    unlocked: false,
    progress: 12,
    target: 30,
  },
  {
    id: 'analyses-10',
    name: 'Analyst',
    description: 'Complete 10 analyses',
    icon: Target,
    xp: 150,
    unlocked: true,
    progress: 10,
    target: 10,
  },
  {
    id: 'analyses-50',
    name: 'Expert Analyst',
    description: 'Complete 50 analyses',
    icon: Medal,
    xp: 300,
    unlocked: false,
    progress: 23,
    target: 50,
  },
  {
    id: 'analyses-100',
    name: 'Master Analyst',
    description: 'Complete 100 analyses',
    icon: Trophy,
    xp: 500,
    unlocked: false,
    progress: 23,
    target: 100,
  },
  {
    id: 'safety-5',
    name: 'Safety First',
    description: 'Run 5 Safety Check analyses',
    icon: Shield,
    xp: 100,
    unlocked: false,
    progress: 3,
    target: 5,
  },
  {
    id: 'trap-detect',
    name: 'Trap Detector',
    description: 'Detect your first manipulation trap',
    icon: Zap,
    xp: 200,
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'referral-1',
    name: 'Networker',
    description: 'Refer your first friend',
    icon: Gift,
    xp: 100,
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'referral-5',
    name: 'Ambassador',
    description: 'Refer 5 friends',
    icon: Award,
    xp: 500,
    unlocked: false,
    progress: 0,
    target: 5,
  },
];

const DAILY_REWARDS = [
  { day: 1, credits: 5, claimed: true },
  { day: 2, credits: 5, claimed: true },
  { day: 3, credits: 10, claimed: true },
  { day: 4, credits: 10, claimed: false, today: true },
  { day: 5, credits: 15, claimed: false },
  { day: 6, credits: 15, claimed: false },
  { day: 7, credits: 25, claimed: false, bonus: true },
];

const LEVELS = [
  { level: 1, name: 'Rookie', minXp: 0 },
  { level: 2, name: 'Apprentice', minXp: 100 },
  { level: 3, name: 'Trader', minXp: 300 },
  { level: 4, name: 'Analyst', minXp: 600 },
  { level: 5, name: 'Expert', minXp: 1000 },
  { level: 6, name: 'Master', minXp: 1500 },
  { level: 7, name: 'Grandmaster', minXp: 2500 },
  { level: 8, name: 'Legend', minXp: 4000 },
  { level: 9, name: 'Mythic', minXp: 6000 },
  { level: 10, name: 'TradePath Elite', minXp: 10000 },
];

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<'achievements' | 'daily' | 'levels'>('achievements');

  // Mock user data
  const userXp = 450;
  const currentLevel = LEVELS.filter(l => l.minXp <= userXp).pop() || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.minXp > userXp);
  const xpProgress = nextLevel
    ? ((userXp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100
    : 100;

  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Rewards & Achievements</h1>
        <p className="text-muted-foreground">
          Track your progress and earn rewards
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Level Card */}
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Crown className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Level</p>
              <p className="text-2xl font-bold">{currentLevel.level}</p>
            </div>
          </div>
          <p className="text-lg font-medium mb-2">{currentLevel.name}</p>
          {nextLevel && (
            <>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {userXp} / {nextLevel.minXp} XP to {nextLevel.name}
              </p>
            </>
          )}
        </div>

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-500/20 rounded-full">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-2xl font-bold">12 Days</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Keep it up! 18 days until next milestone.
          </p>
        </div>

        {/* Achievements Card */}
        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/20 rounded-full">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Achievements</p>
              <p className="text-2xl font-bold">{unlockedCount}/{ACHIEVEMENTS.length}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {ACHIEVEMENTS.length - unlockedCount} more to unlock!
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'daily', label: 'Daily Rewards', icon: Gift },
          { id: 'levels', label: 'Levels', icon: Crown },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((achievement) => {
            const Icon = achievement.icon;
            const progress = (achievement.progress / achievement.target) * 100;

            return (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border ${
                  achievement.unlocked
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-full ${
                      achievement.unlocked
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {achievement.unlocked ? (
                      <Icon className="w-6 h-6" />
                    ) : (
                      <Lock className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{achievement.name}</h3>
                      <span className="text-sm text-amber-500 font-medium">
                        +{achievement.xp} XP
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {achievement.description}
                    </p>
                    {!achievement.unlocked && (
                      <>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {achievement.progress}/{achievement.target}
                        </p>
                      </>
                    )}
                    {achievement.unlocked && (
                      <div className="flex items-center gap-1 text-green-500 text-sm">
                        <Check className="w-4 h-4" />
                        Unlocked!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'daily' && (
        <div>
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-4">Weekly Login Rewards</h3>
            <div className="grid grid-cols-7 gap-2">
              {DAILY_REWARDS.map((reward) => (
                <div
                  key={reward.day}
                  className={`relative p-4 rounded-lg border-2 text-center transition ${
                    reward.claimed
                      ? 'bg-green-500/10 border-green-500'
                      : reward.today
                      ? 'bg-amber-500/10 border-amber-500 animate-pulse'
                      : 'bg-card border-border'
                  } ${reward.bonus ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
                >
                  {reward.bonus && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                      BONUS
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground mb-1">Day {reward.day}</p>
                  <Gift
                    className={`w-6 h-6 mx-auto mb-1 ${
                      reward.claimed
                        ? 'text-green-500'
                        : reward.today
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <p className="font-bold">{reward.credits}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                  {reward.claimed && (
                    <Check className="w-4 h-4 text-green-500 absolute top-1 right-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Claim Button */}
          <div className="text-center">
            <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:opacity-90 transition">
              Claim Day 4 Reward (10 credits)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'levels' && (
        <div className="space-y-2">
          {LEVELS.map((level, index) => {
            const isCurrentLevel = level.level === currentLevel.level;
            const isUnlocked = userXp >= level.minXp;
            const nextLevelData = LEVELS[index + 1];

            return (
              <div
                key={level.level}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  isCurrentLevel
                    ? 'bg-primary/5 border-primary'
                    : isUnlocked
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-card'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {level.level}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{level.name}</h3>
                    {isCurrentLevel && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {level.minXp.toLocaleString()} XP required
                  </p>
                </div>
                <div className="text-right">
                  {isUnlocked ? (
                    <Check className="w-6 h-6 text-green-500" />
                  ) : (
                    <Lock className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Referral Section */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Invite Friends, Earn Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Get 50 credits for each friend who signs up with your referral code
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
            Share Code
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 p-3 bg-background rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
          <p className="font-mono font-bold text-lg">TRADE-ABC123</p>
        </div>
      </div>
    </div>
  );
}
