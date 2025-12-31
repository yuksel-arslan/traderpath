'use client';

import { useState, useEffect } from 'react';
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
  ChevronRight,
  Loader2,
  Play,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useDailyRewards,
  useClaimLogin,
  useSpin,
  useAnswerQuiz,
  useAchievements,
  useUserLevel
} from '../../../hooks/useRewards';
import {
  LEVEL_THRESHOLDS,
  STREAK_MILESTONES,
  SPIN_WHEEL_PRIZES,
  DAILY_REWARD_SCHEDULE
} from '@tradepath/types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  target: Target,
  medal: Medal,
  trophy: Trophy,
  'check-circle': Check,
  flame: Flame,
  crown: Crown,
  award: Award,
  eye: Target,
  'alert-triangle': Shield,
  shield: Shield,
  users: Gift,
  gift: Gift,
  book: HelpCircle,
  'graduation-cap': Award,
  zap: Zap,
  layers: Target,
  globe: Star,
};

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'achievements' | 'levels'>('daily');
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; explanation: string } | null>(null);

  // API Hooks
  const { data: dailyData, isLoading: isLoadingDaily } = useDailyRewards();
  const { data: achievementsData, isLoading: isLoadingAchievements } = useAchievements();
  const { data: userData } = useUserLevel();

  const claimLoginMutation = useClaimLogin();
  const spinMutation = useSpin();
  const answerQuizMutation = useAnswerQuiz();

  // Calculate level info
  const userXp = userData?.xp || 0;
  const currentLevelInfo = LEVEL_THRESHOLDS.filter(l => l.xp <= userXp).pop() || LEVEL_THRESHOLDS[0];
  const nextLevelInfo = LEVEL_THRESHOLDS.find(l => l.xp > userXp);
  const xpProgress = nextLevelInfo
    ? ((userXp - currentLevelInfo.xp) / (nextLevelInfo.xp - currentLevelInfo.xp)) * 100
    : 100;

  const handleClaimLogin = async () => {
    try {
      await claimLoginMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to claim login reward:', error);
    }
  };

  const handleSpin = async () => {
    if (dailyData?.spin.used) return;

    setIsSpinning(true);
    setShowSpinWheel(true);

    try {
      const result = await spinMutation.mutateAsync();
      // Wait for animation
      setTimeout(() => {
        setSpinResult(result.result);
        setIsSpinning(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to spin:', error);
      setIsSpinning(false);
    }
  };

  const handleQuizAnswer = async (answerIndex: number) => {
    if (dailyData?.quiz.completed) return;

    setSelectedQuizAnswer(answerIndex);

    try {
      const result = await answerQuizMutation.mutateAsync(answerIndex);
      setQuizResult({
        correct: result.correct,
        explanation: result.explanation,
      });
    } catch (error) {
      console.error('Failed to answer quiz:', error);
    }
  };

  // Get achievement icon component
  const getAchievementIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Star;
  };

  const unlockedCount = achievementsData?.unlocked?.length || 0;
  const totalAchievements = achievementsData?.achievements?.length || 0;

  if (isLoadingDaily || isLoadingAchievements) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <p className="text-2xl font-bold">{currentLevelInfo.level}</p>
            </div>
          </div>
          {nextLevelInfo && (
            <>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {userXp.toLocaleString()} / {nextLevelInfo.xp.toLocaleString()} XP
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
              <p className="text-2xl font-bold">{dailyData?.streak.days || 0} Days</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {dailyData?.streak.nextBonus ? (
              <>Next bonus: +{dailyData.streak.nextBonus} credits</>
            ) : (
              'Keep it up!'
            )}
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
              <p className="text-2xl font-bold">{unlockedCount}/{totalAchievements}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalAchievements - unlockedCount} more to unlock!
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: 'daily', label: 'Daily Rewards', icon: Gift },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
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
      <AnimatePresence mode="wait">
        {activeTab === 'daily' && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Login */}
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <Check className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Daily Login</h3>
                      <p className="text-sm text-muted-foreground">Claim your daily credits</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-500">+3</span>
                </div>
                <button
                  onClick={handleClaimLogin}
                  disabled={dailyData?.login.claimed || claimLoginMutation.isPending}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    dailyData?.login.claimed
                      ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {claimLoginMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : dailyData?.login.claimed ? (
                    <>
                      <Check className="w-5 h-5 inline mr-2" />
                      Claimed!
                    </>
                  ) : (
                    'Claim Reward'
                  )}
                </button>
              </div>

              {/* Daily Spin */}
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/20 rounded-full">
                      <Star className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Lucky Spin</h3>
                      <p className="text-sm text-muted-foreground">Win 1-10 credits</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-purple-500">1-10</span>
                </div>
                <button
                  onClick={handleSpin}
                  disabled={dailyData?.spin.used || spinMutation.isPending}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    dailyData?.spin.used
                      ? 'bg-purple-500/20 text-purple-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                  }`}
                >
                  {dailyData?.spin.used ? (
                    <>Won +{dailyData.spin.result} credits!</>
                  ) : (
                    <>
                      <Play className="w-5 h-5 inline mr-2" />
                      Spin the Wheel
                    </>
                  )}
                </button>
              </div>

              {/* Daily Quiz */}
              <div className="bg-card border rounded-lg p-6 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <HelpCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Daily Quiz</h3>
                    <p className="text-sm text-muted-foreground">
                      Answer correctly to earn +5 credits
                    </p>
                  </div>
                </div>

                {dailyData?.quiz.completed ? (
                  <div className={`p-4 rounded-lg ${
                    quizResult?.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    <p className="font-medium mb-2">
                      {quizResult?.correct ? '✅ Correct! +5 credits' : '❌ Incorrect'}
                    </p>
                    {quizResult?.explanation && (
                      <p className="text-sm text-muted-foreground">{quizResult.explanation}</p>
                    )}
                  </div>
                ) : dailyData?.quiz.question ? (
                  <div>
                    <p className="font-medium mb-4">{dailyData.quiz.question.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dailyData.quiz.question.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuizAnswer(index)}
                          disabled={answerQuizMutation.isPending || selectedQuizAnswer !== null}
                          className={`p-3 text-left rounded-lg border transition ${
                            selectedQuizAnswer === index
                              ? quizResult?.correct
                                ? 'bg-green-500/20 border-green-500'
                                : 'bg-red-500/20 border-red-500'
                              : 'hover:bg-accent hover:border-primary/50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {quizResult && (
                      <div className={`mt-4 p-3 rounded-lg ${
                        quizResult.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        <p className="text-sm">{quizResult.explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No quiz available today</p>
                )}
              </div>

              {/* Weekly Progress */}
              <div className="bg-card border rounded-lg p-6 md:col-span-2">
                <h3 className="font-semibold mb-4">Weekly Login Rewards</h3>
                <div className="grid grid-cols-7 gap-2">
                  {DAILY_REWARD_SCHEDULE.map((reward, index) => {
                    const streakDay = (dailyData?.streak.days || 0) % 7;
                    const isClaimed = index < streakDay;
                    const isToday = index === streakDay;

                    return (
                      <div
                        key={reward.day}
                        className={`relative p-3 rounded-lg border-2 text-center transition ${
                          isClaimed
                            ? 'bg-green-500/10 border-green-500'
                            : isToday
                            ? 'bg-amber-500/10 border-amber-500'
                            : 'bg-card border-border'
                        } ${reward.bonus ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
                      >
                        {reward.bonus && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                            BONUS
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground mb-1">Day {reward.day}</p>
                        <Gift className={`w-5 h-5 mx-auto mb-1 ${
                          isClaimed ? 'text-green-500' : isToday ? 'text-amber-500' : 'text-muted-foreground'
                        }`} />
                        <p className="font-bold text-sm">{reward.credits}</p>
                        {isClaimed && (
                          <Check className="w-3 h-3 text-green-500 absolute top-1 right-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {achievementsData?.achievements?.map((achievement) => {
              const userProgress = achievementsData.unlocked?.find(
                (ua) => ua.achievementId === achievement.id
              );
              const isUnlocked = userProgress?.isUnlocked;
              const progress = userProgress?.progress || 0;
              const progressPercent = (progress / achievement.requirementValue) * 100;
              const IconComponent = getAchievementIcon(achievement.icon || 'star');

              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border ${
                    isUnlocked
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-card'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-full ${
                        isUnlocked
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}
                    >
                      {isUnlocked ? (
                        <IconComponent className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{achievement.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-amber-500 font-medium">
                            +{achievement.xpReward} XP
                          </span>
                          <span className="text-sm text-green-500 font-medium">
                            +{achievement.creditReward}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement.description}
                      </p>
                      {!isUnlocked && (
                        <>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {progress}/{achievement.requirementValue}
                          </p>
                        </>
                      )}
                      {isUnlocked && (
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
          </motion.div>
        )}

        {activeTab === 'levels' && (
          <motion.div
            key="levels"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {LEVEL_THRESHOLDS.map((level) => {
              const isCurrentLevel = level.level === currentLevelInfo.level;
              const isUnlocked = userXp >= level.xp;

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
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}
                  >
                    {level.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Level {level.level}</h3>
                      {isCurrentLevel && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                        {level.xp.toLocaleString()} XP
                      </span>
                      {level.dailyBonus > 0 && (
                        <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                          +{level.dailyBonus} daily
                        </span>
                      )}
                      {level.discount > 0 && (
                        <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                          {level.discount}% off
                        </span>
                      )}
                    </div>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak Milestones */}
      <div className="mt-8 p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Streak Milestones
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {STREAK_MILESTONES.map((milestone) => {
            const isReached = (dailyData?.streak.days || 0) >= milestone.days;
            return (
              <div
                key={milestone.days}
                className={`p-3 rounded-lg text-center border ${
                  isReached
                    ? 'bg-orange-500/20 border-orange-500'
                    : 'bg-card border-border'
                }`}
              >
                <p className="text-2xl font-bold">{milestone.days}</p>
                <p className="text-xs text-muted-foreground">days</p>
                <p className={`text-sm font-semibold mt-1 ${
                  isReached ? 'text-orange-500' : 'text-muted-foreground'
                }`}>
                  +{milestone.bonus}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Section */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Invite Friends, Earn Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Get 20 credits for each friend who signs up with your referral code
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
            Share Code
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 p-3 bg-background rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
          <p className="font-mono font-bold text-lg">{userData?.referralCode || 'TRADE-XXXXX'}</p>
        </div>
      </div>
    </div>
  );
}
