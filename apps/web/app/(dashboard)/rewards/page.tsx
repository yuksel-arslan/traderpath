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
  ChevronRight,
  Loader2,
  Play,
  HelpCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LEVEL_THRESHOLDS,
  STREAK_MILESTONES,
  DAILY_REWARD_SCHEDULE,
  DEFAULT_ACHIEVEMENTS,
  QUIZ_POOL
} from '@traderpath/types';

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

// Mock data for demo
const MOCK_USER = {
  xp: 450,
  level: 3,
  streakDays: 12,
  referralCode: 'TRADE-ABC123',
};

const MOCK_DAILY = {
  login: { claimed: false, credits: 3 },
  spin: { used: false, result: null as number | null },
  quiz: { completed: false },
  streak: { days: 12, nextBonus: 20 },
};

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'achievements' | 'levels'>('daily');
  const [dailyState, setDailyState] = useState(MOCK_DAILY);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [currentQuiz] = useState(QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)]);
  const [copied, setCopied] = useState(false);

  // Calculate level info
  const userXp = MOCK_USER.xp;
  const currentLevelInfo = LEVEL_THRESHOLDS.filter(l => l.xp <= userXp).pop() || LEVEL_THRESHOLDS[0];
  const nextLevelInfo = LEVEL_THRESHOLDS.find(l => l.xp > userXp);
  const xpProgress = nextLevelInfo
    ? ((userXp - currentLevelInfo.xp) / (nextLevelInfo.xp - currentLevelInfo.xp)) * 100
    : 100;

  const handleClaimLogin = () => {
    setDailyState(prev => ({
      ...prev,
      login: { claimed: true, credits: 3 },
      streak: { ...prev.streak, days: prev.streak.days + 1 },
    }));
  };

  const handleSpin = () => {
    if (dailyState.spin.used) return;

    setIsSpinning(true);

    // Generate random result
    const random = Math.random();
    let result = 1;
    if (random < 0.03) result = 10;
    else if (random < 0.10) result = 7;
    else if (random < 0.25) result = 5;
    else if (random < 0.45) result = 3;
    else if (random < 0.70) result = 2;

    setTimeout(() => {
      setDailyState(prev => ({
        ...prev,
        spin: { used: true, result },
      }));
      setIsSpinning(false);
    }, 2000);
  };

  const handleQuizAnswer = (answerIndex: number) => {
    if (dailyState.quiz.completed) return;

    setSelectedQuizAnswer(answerIndex);
    const isCorrect = answerIndex === currentQuiz.correctIndex;

    setQuizResult({
      correct: isCorrect,
      explanation: currentQuiz.explanation,
    });

    setDailyState(prev => ({
      ...prev,
      quiz: { completed: true },
    }));
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(MOCK_USER.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAchievementIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Star;
  };

  // Mock unlocked achievements (first 3)
  const unlockedCodes = ['FIRST_ANALYSIS', 'STREAK_7', 'ANALYST_10'];

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== Compact Header ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent" />

        <div className="relative z-10 p-5">
          {/* Header Row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rewards & Achievements</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">Track your progress and earn rewards</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Level */}
            <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 border border-purple-200/50 dark:border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-purple-500" />
                <span className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Level</span>
              </div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{currentLevelInfo.level}</div>
              {nextLevelInfo && (
                <>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                    {userXp.toLocaleString()}/{nextLevelInfo.xp.toLocaleString()} XP
                  </p>
                </>
              )}
            </div>

            {/* Streak */}
            <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-3 border border-orange-200/50 dark:border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Streak</span>
              </div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{dailyState.streak.days} Days</div>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                Next: 14 days (+30)
              </p>
            </div>

            {/* Achievements */}
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 border border-amber-200/50 dark:border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Achievements</span>
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{unlockedCodes.length}/{DEFAULT_ACHIEVEMENTS.length}</div>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
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
          { id: 'levels', label: 'Levels', icon: Crown },
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
                      <p className="text-sm text-muted-foreground">Claim your daily credits</p>
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
                    <>Won +{dailyState.spin.result} credits!</>
                  ) : (
                    <>
                      <Play className="w-5 h-5 inline mr-2" />
                      Spin the Wheel
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
                      Answer correctly to earn +5 credits
                    </p>
                  </div>
                </div>

                {dailyState.quiz.completed && quizResult ? (
                  <div className={`p-4 rounded-lg ${
                    quizResult.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    <p className="font-medium mb-2">
                      {quizResult.correct ? '✅ Correct! +5 credits' : '❌ Incorrect'}
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
            <h3 className="text-lg font-semibold mb-1">Invite Friends, Earn Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Get 20 credits for each friend who signs up with your referral code
            </p>
          </div>
          <button
            onClick={handleCopyReferral}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
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
          <p className="font-mono font-bold text-lg">{MOCK_USER.referralCode}</p>
        </div>
      </div>
    </div>
  );
}
