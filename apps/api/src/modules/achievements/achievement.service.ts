/**
 * Achievement Service
 * Tracks and unlocks user achievements
 */

import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { logger } from '../../core/logger';

export class AchievementService {
  /**
   * Increment achievement progress
   * Automatically unlocks if requirement is met
   */
  async incrementProgress(
    userId: string,
    achievementCode: string,
    incrementBy: number = 1
  ): Promise<{ unlocked: boolean; achievement?: any }> {
    try {
      // Find achievement
      const achievement = await prisma.achievement.findUnique({
        where: { code: achievementCode },
      });

      if (!achievement) {
        logger.warn(`Achievement ${achievementCode} not found`);
        return { unlocked: false };
      }

      // Get or create user achievement
      let userAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      if (!userAchievement) {
        userAchievement = await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: 0,
            isUnlocked: false,
          },
        });
      }

      // Already unlocked
      if (userAchievement.isUnlocked) {
        return { unlocked: false };
      }

      // Increment progress
      const newProgress = userAchievement.progress + incrementBy;

      // Check if unlocked
      const shouldUnlock = newProgress >= achievement.requirementValue;

      if (shouldUnlock) {
        // Unlock achievement
        await prisma.userAchievement.update({
          where: { id: userAchievement.id },
          data: {
            progress: newProgress,
            isUnlocked: true,
            unlockedAt: new Date(),
          },
        });

        // Award XP
        if (achievement.xpReward > 0) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              xp: { increment: achievement.xpReward },
            },
          });
        }

        // Award credits
        if (achievement.creditReward > 0) {
          await creditService.add(
            userId,
            achievement.creditReward,
            'REWARD',
            `achievement_${achievementCode.toLowerCase()}`,
            { achievementId: achievement.id }
          );
        }

        logger.info(`Achievement unlocked: ${achievementCode} for user ${userId}`);

        return {
          unlocked: true,
          achievement: {
            code: achievement.code,
            name: achievement.name,
            xpReward: achievement.xpReward,
            creditReward: achievement.creditReward,
          },
        };
      } else {
        // Update progress only
        await prisma.userAchievement.update({
          where: { id: userAchievement.id },
          data: { progress: newProgress },
        });

        return { unlocked: false };
      }
    } catch (error) {
      logger.error('Error incrementing achievement progress:', error);
      return { unlocked: false };
    }
  }

  /**
   * Get user's achievement progress
   */
  async getUserAchievements(userId: string) {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    return achievements;
  }

  /**
   * Check and unlock single-event achievements (SINGLE requirement type)
   */
  async checkSingleEvent(userId: string, achievementCode: string) {
    return this.incrementProgress(userId, achievementCode, 1);
  }
}

export const achievementService = new AchievementService();
