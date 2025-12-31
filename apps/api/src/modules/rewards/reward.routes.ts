// ===========================================
// Rewards Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';

export default async function rewardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/rewards/daily
   * Get daily rewards status
   */
  app.get('/daily', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const today = new Date().toISOString().split('T')[0];

    // Get or create today's rewards
    let dailyReward = await prisma.dailyReward.findUnique({
      where: {
        userId_rewardDate: {
          userId,
          rewardDate: new Date(today),
        },
      },
    });

    if (!dailyReward) {
      dailyReward = await prisma.dailyReward.create({
        data: {
          userId,
          rewardDate: new Date(today),
        },
      });
    }

    // Get user streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakDays: true },
    });

    // Get today's quiz
    const quiz = dailyReward.quizCompleted ? null : await prisma.quiz.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: {
        login: {
          claimed: dailyReward.loginClaimed,
          credits: 3,
        },
        spin: {
          used: dailyReward.spinUsed,
          result: dailyReward.spinResult || undefined,
        },
        quiz: {
          completed: dailyReward.quizCompleted,
          question: quiz ? {
            id: quiz.id,
            question: quiz.question,
            options: quiz.options,
            category: quiz.category,
            difficulty: quiz.difficulty,
          } : undefined,
        },
        ads: {
          watched: dailyReward.adsWatched,
          max: 3,
          creditsPerAd: 2,
        },
        streak: {
          days: user?.streakDays || 0,
          nextBonus: calculateStreakBonus((user?.streakDays || 0) + 1),
        },
      },
    });
  });

  /**
   * POST /api/rewards/claim-login
   * Claim daily login reward
   */
  app.post('/claim-login', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if already claimed
    const existing = await prisma.dailyReward.findUnique({
      where: {
        userId_rewardDate: { userId, rewardDate: new Date(today) },
      },
    });

    if (existing?.loginClaimed) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'REWARD_001',
          message: 'Already claimed today',
        },
      });
    }

    // Update streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakDays: true, streakLastDate: true },
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (user?.streakLastDate?.toISOString().split('T')[0] === yesterdayStr) {
      newStreak = (user.streakDays || 0) + 1;
    }

    // Calculate credits
    let credits = 3; // Base login credit
    const streakBonus = calculateStreakBonus(newStreak);
    if ([7, 14, 21, 28, 30].includes(newStreak)) {
      credits += streakBonus;
    }

    // Update user and daily reward
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          streakDays: newStreak,
          streakLastDate: new Date(today),
        },
      }),
      prisma.dailyReward.upsert({
        where: {
          userId_rewardDate: { userId, rewardDate: new Date(today) },
        },
        update: {
          loginClaimed: true,
          loginCredits: credits,
        },
        create: {
          userId,
          rewardDate: new Date(today),
          loginClaimed: true,
          loginCredits: credits,
        },
      }),
    ]);

    // Add credits
    await creditService.add(userId, credits, 'REWARD', 'daily_login', {
      streakDays: newStreak,
    });

    return reply.send({
      success: true,
      data: {
        credits,
        streakDays: newStreak,
        streakBonus: [7, 14, 21, 28, 30].includes(newStreak) ? streakBonus : undefined,
      },
    });
  });

  /**
   * POST /api/rewards/spin
   * Spin the daily wheel
   */
  app.post('/spin', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if already spun
    const existing = await prisma.dailyReward.findUnique({
      where: {
        userId_rewardDate: { userId, rewardDate: new Date(today) },
      },
    });

    if (existing?.spinUsed) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'REWARD_001',
          message: 'Already spun today',
        },
      });
    }

    // Generate random result
    const spinResult = generateSpinResult();

    // Update daily reward
    await prisma.dailyReward.upsert({
      where: {
        userId_rewardDate: { userId, rewardDate: new Date(today) },
      },
      update: {
        spinUsed: true,
        spinResult,
      },
      create: {
        userId,
        rewardDate: new Date(today),
        spinUsed: true,
        spinResult,
      },
    });

    // Add credits
    const result = await creditService.add(userId, spinResult, 'REWARD', 'daily_spin');

    return reply.send({
      success: true,
      data: {
        result: spinResult,
        isJackpot: spinResult >= 10,
        newBalance: result.newBalance,
      },
    });
  });

  /**
   * POST /api/rewards/quiz
   * Answer daily quiz
   */
  const quizSchema = z.object({
    answerIndex: z.number().min(0).max(3),
  });

  app.post('/quiz', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = quizSchema.parse(request.body);
    const today = new Date().toISOString().split('T')[0];

    // Check if already answered
    const existing = await prisma.dailyReward.findUnique({
      where: {
        userId_rewardDate: { userId, rewardDate: new Date(today) },
      },
    });

    if (existing?.quizCompleted) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'REWARD_002',
          message: 'Quiz already answered today',
        },
      });
    }

    // Get today's quiz
    const quiz = await prisma.quiz.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!quiz) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'QUIZ_NOT_FOUND',
          message: 'No quiz available',
        },
      });
    }

    const isCorrect = body.answerIndex === quiz.correctIndex;
    const credits = isCorrect ? 5 : 0;

    // Update daily reward
    await prisma.dailyReward.upsert({
      where: {
        userId_rewardDate: { userId, rewardDate: new Date(today) },
      },
      update: {
        quizCompleted: true,
        quizCorrect: isCorrect,
        quizCredits: credits,
      },
      create: {
        userId,
        rewardDate: new Date(today),
        quizCompleted: true,
        quizCorrect: isCorrect,
        quizCredits: credits,
      },
    });

    // Add credits if correct
    if (isCorrect) {
      await creditService.add(userId, credits, 'REWARD', 'daily_quiz');
    }

    return reply.send({
      success: true,
      data: {
        correct: isCorrect,
        credits,
        explanation: quiz.explanation,
      },
    });
  });

  /**
   * GET /api/rewards/achievements
   * Get all achievements and user progress
   */
  app.get('/achievements', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const [achievements, userAchievements] = await Promise.all([
      prisma.achievement.findMany({ where: { isActive: true } }),
      prisma.userAchievement.findMany({ where: { userId } }),
    ]);

    const userAchievementMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua])
    );

    return reply.send({
      success: true,
      data: {
        achievements: achievements.map((a) => ({
          ...a,
          userProgress: userAchievementMap.get(a.id),
        })),
        unlocked: userAchievements.filter((ua) => ua.isUnlocked),
        inProgress: userAchievements.filter((ua) => !ua.isUnlocked && ua.progress > 0),
      },
    });
  });
}

// Helper functions
function calculateStreakBonus(days: number): number {
  if (days >= 30) return 100;
  if (days >= 28) return 50;
  if (days >= 21) return 30;
  if (days >= 14) return 20;
  if (days >= 7) return 10;
  return 0;
}

function generateSpinResult(): number {
  const random = Math.random();
  if (random < 0.01) return 20; // 1% jackpot
  if (random < 0.05) return 10; // 4%
  if (random < 0.13) return 7;  // 8%
  if (random < 0.25) return 5;  // 12%
  if (random < 0.45) return 3;  // 20%
  if (random < 0.70) return 2;  // 25%
  return 1; // 30%
}
