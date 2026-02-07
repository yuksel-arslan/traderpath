'use client';

// ===========================================
// Achievement Card Component
// Display achievements and progress
// ===========================================

import { Trophy, Lock, CheckCircle, Gem, Star, Zap, Target, Shield, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'analysis' | 'trading' | 'social' | 'streak' | 'whale';
  icon: string;
  xpReward: number;
  creditReward: number;
  requirementType: 'count' | 'streak' | 'percentage';
  requirementValue: number;
  progress?: number;
  isUnlocked?: boolean;
  unlockedAt?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  className?: string;
  compact?: boolean;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
  shield: Shield,
  users: Users,
  trending: TrendingUp,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  analysis: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30' },
  trading: { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500/30' },
  social: { bg: 'bg-purple-500/20', text: 'text-purple-500', border: 'border-purple-500/30' },
  streak: { bg: 'bg-amber-500/20', text: 'text-amber-500', border: 'border-amber-500/30' },
  whale: { bg: 'bg-cyan-500/20', text: 'text-cyan-500', border: 'border-cyan-500/30' },
};

export function AchievementCard({ achievement, className, compact = false }: AchievementCardProps) {
  const Icon = ICONS[achievement.icon] || Trophy;
  const colors = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.analysis;
  const progress = achievement.progress ?? 0;
  const progressPercent = Math.min((progress / achievement.requirementValue) * 100, 100);
  const isUnlocked = achievement.isUnlocked ?? false;

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
          'relative p-3 rounded-lg border transition-all',
          isUnlocked
            ? `${colors.bg} ${colors.border}`
            : 'bg-muted/30 border-muted opacity-60',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              isUnlocked ? colors.bg : 'bg-muted'
            )}
          >
            {isUnlocked ? (
              <Icon className={cn('w-5 h-5', colors.text)} />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{achievement.name}</p>
            {!isUnlocked && (
              <div className="mt-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', colors.bg.replace('/20', ''))}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {progress}/{achievement.requirementValue}
                </p>
              </div>
            )}
          </div>
          {isUnlocked && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative p-4 rounded-lg border transition-all',
        isUnlocked
          ? `${colors.bg} ${colors.border}`
          : 'bg-card border-muted',
        className
      )}
    >
      {/* Unlocked Badge */}
      {isUnlocked && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
            isUnlocked ? colors.bg : 'bg-muted'
          )}
        >
          {isUnlocked ? (
            <Icon className={cn('w-6 h-6', colors.text)} />
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{achievement.name}</h4>
          </div>
          <span
            className={cn(
              'inline-block text-xs px-2 py-0.5 rounded-full capitalize',
              colors.bg,
              colors.text
            )}
          >
            {achievement.category}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>

      {/* Progress */}
      {!isUnlocked && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progress}/{achievement.requirementValue}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn('h-full rounded-full', colors.bg.replace('/20', ''))}
            />
          </div>
        </div>
      )}

      {/* Rewards */}
      <div className="flex items-center gap-4 pt-3 border-t border-border/50">
        {achievement.xpReward > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-purple-500" />
            <span className="text-muted-foreground">+{achievement.xpReward} AP</span>
          </div>
        )}
        {achievement.creditReward > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Gem className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground">+{achievement.creditReward} credits</span>
          </div>
        )}
      </div>

      {/* Unlocked Date */}
      {isUnlocked && achievement.unlockedAt && (
        <p className="text-xs text-muted-foreground mt-2">
          Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  );
}

// Achievement Grid Component
interface AchievementGridProps {
  achievements: Achievement[];
  className?: string;
}

export function AchievementGrid({ achievements, className }: AchievementGridProps) {
  const unlocked = achievements.filter((a) => a.isUnlocked);
  const locked = achievements.filter((a) => !a.isUnlocked);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {unlocked.length}/{achievements.length}
            </p>
            <p className="text-sm text-muted-foreground">Achievements Unlocked</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-amber-500">
            {unlocked.reduce((sum, a) => sum + a.creditReward, 0)} credits
          </p>
          <p className="text-sm text-muted-foreground">Total Earned</p>
        </div>
      </div>

      {/* Unlocked Achievements */}
      {unlocked.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Unlocked ({unlocked.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unlocked.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            In Progress ({locked.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locked.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
