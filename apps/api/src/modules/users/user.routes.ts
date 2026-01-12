// ===========================================
// User Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';

export default async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/user/profile
   * Get user profile with stats
   */
  app.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const [user, analysisCount, achievementCount, referralCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { creditBalance: true },
      }),
      prisma.analysis.count({ where: { userId } }),
      prisma.userAchievement.count({ where: { userId, isUnlocked: true } }),
      prisma.referral.count({ where: { referrerId: userId } }),
    ]);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    // Calculate level info
    const { LEVEL_THRESHOLDS } = await import('@tradepath/types');
    const matchingLevels = LEVEL_THRESHOLDS.filter((l) => user.xp >= l.xp);
    const currentLevel = matchingLevels[matchingLevels.length - 1] || LEVEL_THRESHOLDS[0];
    const nextLevel = LEVEL_THRESHOLDS.find((l) => l.xp > user.xp);

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.image, // Prisma field is 'image', mapped to 'avatar_url' in DB
          level: user.level,
          xp: user.xp,
          streakDays: user.streakDays,
          preferredCoins: user.preferredCoins,
          referralCode: user.referralCode,
          createdAt: user.createdAt,
        },
        stats: {
          totalAnalyses: analysisCount,
          successfulSignals: 0, // TODO: Track this
          achievementsCount: achievementCount,
          referralsCount: referralCount,
        },
        level: {
          current: user.level,
          xp: user.xp,
          xpForNext: nextLevel?.xp || user.xp,
          progress: nextLevel
            ? Math.round(((user.xp - currentLevel!.xp) / (nextLevel.xp - currentLevel!.xp)) * 100)
            : 100,
          benefits: [
            `+${currentLevel!.dailyBonus} daily credits`,
            currentLevel!.discount > 0 ? `${currentLevel!.discount}% discount` : null,
          ].filter(Boolean) as string[],
        },
      },
    });
  });

  /**
   * PATCH /api/user/profile
   * Update user profile
   */
  const updateSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    avatarUrl: z.string().url().optional(),
    preferredCoins: z.array(z.string()).max(10).optional(),
    notificationSettings: z.record(z.boolean()).optional(),
  });

  const settingsSchema = z.object({
    reportValidityPeriods: z.number().min(10).max(500).optional(),
    notificationSettings: z.record(z.boolean()).optional(),
  });

  app.patch('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = updateSchema.parse(request.body);

    // Map avatarUrl to image field for Prisma
    const { avatarUrl, ...rest } = body;
    const updateData = {
      ...rest,
      ...(avatarUrl !== undefined && { image: avatarUrl }),
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          preferredCoins: user.preferredCoins,
        },
      },
    });
  });

  /**
   * PATCH /api/user/settings
   * Update user settings (report validity, notifications, etc.)
   */
  app.patch('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = settingsSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
    });

    return reply.send({
      success: true,
      data: {
        reportValidityPeriods: user.reportValidityPeriods,
        notificationSettings: user.notificationSettings,
      },
    });
  });

  /**
   * GET /api/user/settings
   * Get user settings
   */
  app.get('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        reportValidityPeriods: true,
        notificationSettings: true,
        preferredCoins: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.send({
      success: true,
      data: user,
    });
  });

  /**
   * GET /api/user/referral-code
   * Get referral code and stats
   */
  app.get('/referral-code', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const [user, referrals] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.referral.findMany({ where: { referrerId: userId } }),
    ]);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const totalCredits = referrals.reduce((sum, r) => sum + r.referrerCreditsEarned, 0);
    const completed = referrals.filter((r) => r.status === 'FIRST_PURCHASE').length;
    const pending = referrals.filter((r) => r.status === 'PENDING').length;

    // Determine tier
    const totalReferrals = referrals.length;
    let tier = { name: 'Starter', bonusPercent: 0, nextTier: 'Bronze', referralsNeeded: 5 };
    if (totalReferrals >= 100) {
      tier = { name: 'Diamond', bonusPercent: 20, nextTier: undefined, referralsNeeded: undefined };
    } else if (totalReferrals >= 50) {
      tier = { name: 'Gold', bonusPercent: 15, nextTier: 'Diamond', referralsNeeded: 100 - totalReferrals };
    } else if (totalReferrals >= 20) {
      tier = { name: 'Silver', bonusPercent: 10, nextTier: 'Gold', referralsNeeded: 50 - totalReferrals };
    } else if (totalReferrals >= 5) {
      tier = { name: 'Bronze', bonusPercent: 5, nextTier: 'Silver', referralsNeeded: 20 - totalReferrals };
    }

    return reply.send({
      success: true,
      data: {
        code: user.referralCode,
        url: `https://tradepath.io/ref/${user.referralCode}`,
        stats: {
          totalReferrals,
          pending,
          completed,
          creditsEarned: totalCredits,
        },
        tier,
      },
    });
  });

  /**
   * GET /api/user/credits
   * Get user credit balance (alias for /api/credits/balance)
   */
  app.get('/credits', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const balance = await creditService.getBalance(userId);

    return reply.send({
      success: true,
      data: balance,
    });
  });
}
