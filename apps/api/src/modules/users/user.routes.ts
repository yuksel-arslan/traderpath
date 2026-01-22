// ===========================================
// User Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isLanguageSupported,
  detectLanguageFromHeader,
  getLanguageFromCountry,
} from '../../config/languages';

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
    const { LEVEL_THRESHOLDS } = await import('@traderpath/types');
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
    preferredLanguage: z.string().min(2).max(5).optional(),
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
   * Update user settings (report validity, notifications, language, etc.)
   */
  app.patch('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = settingsSchema.parse(request.body);

    // Validate language code if provided
    if (body.preferredLanguage && !isLanguageSupported(body.preferredLanguage)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_LANGUAGE',
          message: `Language '${body.preferredLanguage}' is not supported.`,
        },
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
    });

    return reply.send({
      success: true,
      data: {
        reportValidityPeriods: user.reportValidityPeriods,
        notificationSettings: user.notificationSettings,
        preferredLanguage: user.preferredLanguage,
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
        preferredLanguage: true,
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
      data: {
        ...user,
        preferredLanguage: user.preferredLanguage || DEFAULT_LANGUAGE,
      },
    });
  });

  /**
   * POST /api/user/preference
   * Save user's preferred interface (ui or concierge)
   */
  const preferenceSchema = z.object({
    preferredInterface: z.enum(['ui', 'concierge']),
  });

  app.post('/preference', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = preferenceSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { preferredInterface: body.preferredInterface },
    });

    return reply.send({
      success: true,
      data: {
        preferredInterface: user.preferredInterface,
      },
    });
  });

  /**
   * GET /api/user/preference
   * Get user's preferred interface
   */
  app.get('/preference', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredInterface: true },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.send({
      success: true,
      data: {
        preferredInterface: user.preferredInterface,
      },
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
        url: `https://traderpath.io/ref/${user.referralCode}`,
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

  // ===========================================
  // Language Preference Endpoints
  // ===========================================

  /**
   * GET /api/user/languages
   * Get list of supported languages
   */
  app.get('/languages', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        languages: SUPPORTED_LANGUAGES,
        defaultLanguage: DEFAULT_LANGUAGE,
      },
    });
  });

  /**
   * GET /api/user/language
   * Get user's preferred language
   */
  app.get('/language', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLanguage: true },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.send({
      success: true,
      data: {
        preferredLanguage: user.preferredLanguage || DEFAULT_LANGUAGE,
      },
    });
  });

  /**
   * PATCH /api/user/language
   * Update user's preferred language
   */
  const languageSchema = z.object({
    preferredLanguage: z.string().min(2).max(5),
  });

  app.patch('/language', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = languageSchema.parse(request.body);

    // Validate language code
    if (!isLanguageSupported(body.preferredLanguage)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_LANGUAGE',
          message: `Language '${body.preferredLanguage}' is not supported. Supported languages: ${SUPPORTED_LANGUAGES.map(l => l.code).join(', ')}`,
        },
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage: body.preferredLanguage },
    });

    return reply.send({
      success: true,
      data: {
        preferredLanguage: user.preferredLanguage,
      },
    });
  });

  /**
   * GET /api/user/detect-language
   * Auto-detect language based on browser header or IP location
   */
  app.get('/detect-language', async (request: FastifyRequest, reply: FastifyReply) => {
    // First try browser Accept-Language header
    const acceptLanguage = request.headers['accept-language'];
    const detectedFromHeader = detectLanguageFromHeader(acceptLanguage);

    // Get country from various headers (set by CDN/proxy)
    const country =
      (request.headers['cf-ipcountry'] as string) || // Cloudflare
      (request.headers['x-country-code'] as string) || // Custom
      (request.headers['x-vercel-ip-country'] as string); // Vercel

    let detectedFromCountry: string | null = null;
    if (country) {
      detectedFromCountry = getLanguageFromCountry(country);
    }

    return reply.send({
      success: true,
      data: {
        detected: detectedFromHeader,
        fromBrowser: detectedFromHeader,
        fromCountry: detectedFromCountry,
        country: country || null,
        acceptLanguageHeader: acceptLanguage || null,
      },
    });
  });
}
