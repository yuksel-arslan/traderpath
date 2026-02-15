'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  HelpCircle,
  Copy,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreditNotification } from '../../../contexts/CreditNotificationContext';
import {
  TRADER_TIERS,
  STREAK_MILESTONES,
  DAILY_REWARD_SCHEDULE,
  DEFAULT_ACHIEVEMENTS,
  QUIZ_POOL,
  AP_EARNING_RULES,
} from '@/lib/types';
import {
  useDailyRewards,
  useClaimLogin,
  useSpin,
  useAnswerQuiz,
  useAchievements,
  useTierInfo,
} from '../../../hooks/useRewardsAPI';

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

const TIER_COLORS: Record<number, { text: string; bg: string; border: string }> = {
  1: { text: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  2: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  3: { text: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
  4: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'achievements' | 'tiers'>('daily');
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [currentQuiz] = useState(QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)]);
  const [copied, setCopied] = useState(false);

  const { showCelebration } = useCreditNotification();

  // Fetch real data from APIs
  const { data: dailyRewards, loading: dailyLoading, refetch: refetchDaily } = useDailyRewards();
  const { data: tierInfo, loading: tierLoading } = useTierInfo();
  const { data: achievementsData, loading: achievementsLoading } = useAchievements();
  const { claim: claimLogin } = useClaimLogin();
  const { spin: spinWheel } = useSpin();
  const { answer: answerQuiz } = useAnswerQuiz();

  // Use real data or fallback to empty state
  const dailyState = dailyRewards || {
    login: { claimed: false, credits: 3 },
    spin: { used: false, result: null },
    quiz: { completed: false },
    streak: { days: 0, nextBonus: 0 },
  };

  const currentAP = tierInfo?.analysisPoints || 0;
  const currentTier = tierInfo?.currentTier || { tier: 1, name: 'Junior Trader', color: 'gray', gradient: 'from-slate-400 to-slate-500', benefits: [] };
  const nextTier = tierInfo?.nextTier || null;
  const progress = tierInfo?.progress || 0;

  const handleClaimLogin = async () => {
    try {
      const result = await claimLogin();
      const newStreakDays = result.streakDays;
      const totalCredits = result.credits;
      const isStreakMilestone = [7, 14, 21, 28, 30].includes(newStreakDays);

      refetchDaily();

      if (result.tierAdvanced) {
        showCelebration({
          credits: totalCredits,
          reason: 'level_up',
          title: `Advanced to ${result.newTier.name}`,
          subtitle: `You've earned enough Analysis Points to reach the next tier.`,
        });
      } else {
        showCelebration({
          credits: totalCredits,
          reason: isStreakMilestone ? 'streak_bonus' : 'daily_login',
          streakDays: newStreakDays,
          title: isStreakMilestone ? `${newStreakDays}-Day Streak!` : 'Daily Login Bonus!',
          subtitle: isStreakMilestone
            ? `Impressive consistency! ${newStreakDays}-day streak bonus earned.`
            : 'Welcome back. Daily reward claimed.',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(message || 'Failed to claim daily login reward');
    }
  };

  const handleSpin = async () => {
    if (dailyState.spin.used) return;
    setIsSpinning(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await spinWheel();
      const credits = result.result;
      refetchDaily();
      const isJackpot = credits >= 10;
      showCelebration({
        credits,
        reason: isJackpot ? 'spin_jackpot' : 'daily_login',
        title: isJackpot ? 'JACKPOT!' : `You Won ${credits} Credits!`,
        subtitle: isJackpot
          ? 'Outstanding! You hit the jackpot!'
          : 'Credits have been added to your account.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(message || 'Failed to spin the wheel');
    } finally {
      setIsSpinning(false);
    }
  };

  const handleQuizAnswer = async (answerIndex: number) => {
    if (dailyState.quiz.completed) return;
    setSelectedQuizAnswer(answerIndex);
    try {
      const result = await answerQuiz(answerIndex);
      const isCorrect = result.correct;
      setQuizResult({
        correct: isCorrect,
        explanation: result.explanation || currentQuiz.explanation,
      });
      refetchDaily();
      if (isCorrect) {
        setTimeout(() => {
          showCelebration({
            credits: result.credits || 5,
            reason: 'quiz_correct',
            title: 'Correct Answer!',
            subtitle: `+${result.analysisPoints || 15} AP earned for your knowledge.`,
          });
        }, 500);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(message || 'Failed to submit quiz answer');
    }
  };

  const handleCopyReferral = () => {
    const referralCode = tierInfo?.referralCode || '';
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getAchievementIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Star;
  };

  const unlockedCodes = achievementsData
    ? achievementsData.filter(a => a.isUnlocked).map(a => a.id)
    : [];

  if (dailyLoading || tierLoading || achievementsLoading) {
    return (
      <div className="w-full px-4 md:px-8 lg:px-12 py-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500 mb-4" />
          <p className="text-muted-foreground">Loading your trader program...</p>
        </div>
      </div>
    );
  }

  const tc = TIER_COLORS[currentTier.tier] || TIER_COLORS[1];

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== Trader Profile Header ===== */}
      <div className={`relative overflow-hidden rounded-2xl border ${tc.border} ${tc.bg}`}>
        <div className="relative z-10 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl bg-gradient-to-br ${currentTier.gradient} text-white shadow-lg`}>
              {currentTier.tier}
            </div>
            <div>
              <h1 className={`text-xl font-bold ${tc.text}`}>{currentTier.name}</h1>
              <p className="text-xs text-muted-foreground">Trader Program</p>
            </div>
            <Link
              href="/profile"
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
            >
              View Profile <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Analysis Points</span>
              </div>
              <div className="text-xl font-bold">{currentAP.toLocaleString()}</div>
              {nextTier && (
                <>
                  <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden mt-2">
                    <motion.div
                      className={`h-full rounded-full ${tc.text === 'text-slate-500' ? 'bg-slate-500' : tc.text === 'text-blue-500' ? 'bg-blue-500' : tc.text === 'text-teal-500' ? 'bg-teal-500' : 'bg-amber-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {currentAP.toLocaleString()}/{nextTier.apRequired.toLocaleString()} AP
                  </p>
                </>
              )}
            </div>

            <div className="bg-background/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Streak</span>
              </div>
              <div className="text-xl font-bold">{dailyState.streak.days} Days</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Keep it going
              </p>
            </div>

            <div className="bg-background/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Achievements</span>
              </div>
              <div className="text-xl font-bold">{unlockedCodes.length}/{DEFAULT_ACHIEVEMENTS.length}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {DEFAULT_ACHIEVEMENTS.length - unlockedCodes.length} to unlock
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b overflow-x-auto pb-0">
        {[
          { id: 'daily', label: 'Daily Rewards', icon: Gift },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'tiers', label: 'Trader Tiers', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border-b-2 transition whitespace-nowrap text-sm sm:text-base ${
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Daily Login */}
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/20 rounded-full">
                      <Check className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Daily Login</h3>
                      <p className="text-sm text-muted-foreground">+3 credits & +5 AP</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-500">+3</span>
                </div>
                <button
                  onClick={handleClaimLogin}
                  disabled={dailyState.login.claimed}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    dailyState.login.claimed
                      ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {dailyState.login.claimed ? (
                    <>
                      <Check className="w-5 h-5 inline mr-2" />
                      Claimed
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
                      <h3 className="font-semibold">Daily Spin</h3>
                      <p className="text-sm text-muted-foreground">Win 1-10 credits</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-purple-500">1-10</span>
                </div>
                <button
                  onClick={handleSpin}
                  disabled={dailyState.spin.used || isSpinning}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    dailyState.spin.used
                      ? 'bg-purple-500/20 text-purple-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                  }`}
                >
                  {isSpinning ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : dailyState.spin.used ? (
                    <>Won +{dailyState.spin.result} credits</>
                  ) : (
                    <>
                      <Play className="w-5 h-5 inline mr-2" />
                      Spin
                    </>
                  )}
                </button>
              </div>

              {/* Daily Quiz */}
              <div className="bg-card border rounded-lg p-4 sm:p-6 sm:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <HelpCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Daily Quiz</h3>
                    <p className="text-sm text-muted-foreground">
                      +5 credits & +15 AP for correct answer
                    </p>
                  </div>
                </div>

                {dailyState.quiz.completed && quizResult ? (
                  <div className={`p-4 rounded-lg ${
                    quizResult.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    <p className="font-medium mb-2">
                      {quizResult.correct ? 'Correct! +5 credits, +15 AP' : 'Incorrect. Try again tomorrow.'}
                    </p>
                    <p className="text-sm text-muted-foreground">{quizResult.explanation}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium mb-4">{currentQuiz.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentQuiz.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuizAnswer(index)}
                          disabled={selectedQuizAnswer !== null}
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
                  </div>
                )}
              </div>

              {/* Weekly Progress */}
              <div className="bg-card border rounded-lg p-4 sm:p-6 sm:col-span-2">
                <h3 className="font-semibold mb-4">Weekly Login Rewards</h3>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {DAILY_REWARD_SCHEDULE.map((reward, index) => {
                    const streakDay = dailyState.streak.days % 7;
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
                        } ${'bonus' in reward && reward.bonus ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background' : ''}`}
                      >
                        {'bonus' in reward && reward.bonus && (
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
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          >
            {DEFAULT_ACHIEVEMENTS.map((achievement, index) => {
              const isUnlocked = unlockedCodes.includes(achievement.code);
              const progress = isUnlocked ? achievement.requirementValue : Math.floor(Math.random() * achievement.requirementValue * 0.7);
              const progressPercent = (progress / achievement.requirementValue) * 100;
              const IconComponent = getAchievementIcon(achievement.icon || 'star');

              return (
                <div
                  key={achievement.code}
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
                          <span className="text-sm text-teal-500 font-medium">
                            +{achievement.xpReward} AP
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
                              transition={{ duration: 0.5, delay: index * 0.05 }}
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
                          Unlocked
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'tiers' && (
          <motion.div
            key="tiers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {TRADER_TIERS.map((tier) => {
              const isCurrent = tier.tier === currentTier.tier;
              const isUnlocked = currentAP >= tier.apRequired;
              const tierColors = TIER_COLORS[tier.tier] || TIER_COLORS[1];

              return (
                <div
                  key={tier.tier}
                  className={`flex items-start gap-4 p-4 rounded-xl border ${
                    isCurrent
                      ? `${tierColors.border} ${tierColors.bg}`
                      : isUnlocked
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-card border-border/50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                      isUnlocked
                        ? `bg-gradient-to-br ${tier.gradient} text-white`
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tier.tier}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{tier.name}</h3>
                      {isCurrent && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          CURRENT
                        </span>
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
                  <div className="text-right flex-shrink-0">
                    {isUnlocked ? (
                      <Check className="w-6 h-6 text-green-500" />
                    ) : (
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* How to Earn AP */}
            <div className="mt-6 p-5 rounded-xl border border-teal-500/20 bg-teal-500/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-500" />
                How to Earn Analysis Points
              </h3>
              <div className="space-y-2">
                {AP_EARNING_RULES.map((rule) => (
                  <div key={rule.action} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{rule.description}</span>
                    <span className="font-bold text-teal-500">+{rule.points} AP</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak Milestones */}
      <div className="mt-8 p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Streak Milestones
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
          {STREAK_MILESTONES.map((milestone) => {
            const isReached = dailyState.streak.days >= milestone.days;
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
      <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Refer Fellow Traders</h3>
            <p className="text-sm text-muted-foreground">
              Earn 200 AP and 20 credits for each trader who signs up with your referral code.
            </p>
          </div>
          <button
            onClick={handleCopyReferral}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
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
        <div className="mt-4 p-3 bg-background rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
          <p className="font-sans font-bold text-lg">{tierInfo?.referralCode || 'Loading...'}</p>
        </div>
      </div>
    </div>
  );
}
