// ===========================================
// Admin Routes
// System monitoring, statistics, and maintenance
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../core/database';
import { redis } from '../../core/cache';
import { authenticate } from '../../core/auth/middleware';
import os from 'os';

// Admin emails with access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

// Admin authentication middleware
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);

  if (!request.user || !ADMIN_EMAILS.includes(request.user.email)) {
    return reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }
}

export default async function adminRoutes(app: FastifyInstance) {
  // ===========================================
  // GET /api/admin/health - System health check
  // ===========================================
  app.get('/health', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, { status: 'healthy' | 'degraded' | 'down'; latency?: number; details?: string }> = {};

    // Database check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    } catch (error) {
      checks.database = { status: 'down', details: String(error) };
    }

    // Redis check
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
    } catch (error) {
      checks.redis = { status: 'down', details: String(error) };
    }

    // Binance API check
    const binanceStart = Date.now();
    try {
      const response = await fetch('https://api.binance.com/api/v3/ping', {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        checks.binance = { status: 'healthy', latency: Date.now() - binanceStart };
      } else {
        checks.binance = { status: 'degraded', details: `HTTP ${response.status}` };
      }
    } catch (error) {
      checks.binance = { status: 'down', details: String(error) };
    }

    // TFT Predictor Service check
    const tftStart = Date.now();
    const TFT_URL = (process.env.TFT_SERVICE_URL || 'http://localhost:8000').trim();
    try {
      const response = await fetch(`${TFT_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        checks.tft = {
          status: 'healthy',
          latency: Date.now() - tftStart,
          details: data.model_loaded ? 'Model loaded' : 'Model not loaded',
        };
      } else {
        checks.tft = { status: 'degraded', details: `HTTP ${response.status}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      checks.tft = { status: 'down', details: `${TFT_URL} - ${errorMessage}` };
    }

    // Overall status
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    const anyDown = Object.values(checks).some(c => c.status === 'down');

    return reply.send({
      success: true,
      data: {
        status: anyDown ? 'down' : allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
      },
    });
  });

  // ===========================================
  // GET /api/admin/system - System metrics
  // ===========================================
  app.get('/system', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    // CPU usage
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    // System memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return reply.send({
      success: true,
      data: {
        server: {
          uptime: Math.floor(uptime),
          uptimeFormatted: formatUptime(uptime),
          nodeVersion: process.version,
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
        },
        process: {
          pid: process.pid,
          memoryUsage: {
            heapUsed: formatBytes(memUsage.heapUsed),
            heapTotal: formatBytes(memUsage.heapTotal),
            rss: formatBytes(memUsage.rss),
            external: formatBytes(memUsage.external),
          },
        },
        system: {
          cpuUsage: `${cpuUsage.toFixed(1)}%`,
          cpuCores: cpus.length,
          memoryTotal: formatBytes(totalMem),
          memoryUsed: formatBytes(usedMem),
          memoryFree: formatBytes(freeMem),
          memoryUsagePercent: `${((usedMem / totalMem) * 100).toFixed(1)}%`,
          loadAverage: os.loadavg().map(l => l.toFixed(2)),
        },
      },
    });
  });

  // ===========================================
  // GET /api/admin/stats - Application statistics
  // ===========================================
  app.get('/stats', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User statistics
    const [totalUsers, newUsersToday, newUsersWeek, newUsersMonth, activeToday] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: today } } }),
    ]);

    // Analysis statistics
    const [totalAnalyses, analysesToday, analysesWeek] = await Promise.all([
      prisma.creditTransaction.count({ where: { source: { startsWith: 'analysis_' } } }),
      prisma.creditTransaction.count({
        where: { source: { startsWith: 'analysis_' }, createdAt: { gte: today } },
      }),
      prisma.creditTransaction.count({
        where: { source: { startsWith: 'analysis_' }, createdAt: { gte: thisWeek } },
      }),
    ]);

    // Credit statistics
    const [totalCreditsSpent, creditsSpentToday, totalCreditsPurchased] = await Promise.all([
      prisma.creditTransaction.aggregate({
        where: { type: 'SPEND' },
        _sum: { amount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: 'SPEND', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: 'PURCHASE' },
        _sum: { amount: true },
      }),
    ]);

    // Report statistics
    const [totalReports, activeReports] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { expiresAt: { gt: now } } }),
    ]);

    // Top analyzed coins
    const topCoins = await prisma.creditTransaction.groupBy({
      by: ['metadata'],
      where: { source: 'analysis_full' },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const coinCounts = topCoins
      .map(t => {
        const meta = t.metadata as { symbol?: string } | null;
        return { symbol: meta?.symbol || 'Unknown', count: t._count };
      })
      .filter(c => c.symbol !== 'Unknown');

    return reply.send({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersWeek,
          newThisMonth: newUsersMonth,
          activeToday,
        },
        analyses: {
          total: totalAnalyses,
          today: analysesToday,
          thisWeek: analysesWeek,
        },
        credits: {
          totalSpent: Math.abs(totalCreditsSpent._sum.amount || 0),
          spentToday: Math.abs(creditsSpentToday._sum.amount || 0),
          totalPurchased: totalCreditsPurchased._sum.amount || 0,
        },
        reports: {
          total: totalReports,
          active: activeReports,
          expired: totalReports - activeReports,
        },
        topCoins: coinCounts,
      },
    });
  });

  // ===========================================
  // GET /api/admin/users - User list
  // ===========================================
  app.get('/users', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '20', offset = '0', search = '' } = request.query as Record<string, string>;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          level: true,
          createdAt: true,
          lastLoginAt: true,
          streakDays: true,
          _count: {
            select: {
              creditTransactions: true,
              reports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
      }),
      prisma.user.count({ where }),
    ]);

    // Get credit balances
    const userIds = users.map(u => u.id);
    const balances = await prisma.creditBalance.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, balance: true },
    });
    const balanceMap = new Map(balances.map(b => [b.userId, b.balance]));

    const usersWithBalance = users.map(u => ({
      ...u,
      creditBalance: balanceMap.get(u.id) ?? 0,
      transactionCount: u._count.creditTransactions,
      reportCount: u._count.reports,
    }));

    return reply.send({
      success: true,
      data: {
        users: usersWithBalance,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      },
    });
  });

  // ===========================================
  // GET /api/admin/errors - Recent errors
  // ===========================================
  app.get('/errors', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    // In production, you'd fetch from a logging service
    // For now, return placeholder
    return reply.send({
      success: true,
      data: {
        errors: [],
        message: 'Error logging not implemented - check server logs',
      },
    });
  });

  // ===========================================
  // POST /api/admin/cache/clear - Clear cache
  // ===========================================
  app.post('/cache/clear', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { pattern = '*' } = request.body as { pattern?: string };

    try {
      if (pattern === '*') {
        // flushdb only available on real Redis, not memory cache
        if ('flushdb' in redis) {
          await (redis as any).flushdb();
        } else {
          // For memory cache, delete all keys
          const keys = await redis.keys('*');
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        }
      } else {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      return reply.send({
        success: true,
        message: `Cache cleared for pattern: ${pattern}`,
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: { code: 'CACHE_ERROR', message: String(error) },
      });
    }
  });

  // ===========================================
  // POST /api/admin/maintenance/cleanup - Cleanup expired data
  // ===========================================
  app.post('/maintenance/cleanup', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();

    // Delete expired reports
    const deletedReports = await prisma.report.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Delete old credit transactions (older than 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const deletedTransactions = await prisma.creditTransaction.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });

    return reply.send({
      success: true,
      data: {
        deletedReports: deletedReports.count,
        deletedTransactions: deletedTransactions.count,
        timestamp: now.toISOString(),
      },
    });
  });

  // ===========================================
  // GET /api/admin/activity - Recent activity
  // ===========================================
  app.get('/activity', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const recentTransactions = await prisma.creditTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    const activity = recentTransactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      source: t.source,
      user: t.user.name || t.user.email,
      metadata: t.metadata,
      createdAt: t.createdAt,
    }));

    return reply.send({
      success: true,
      data: { activity },
    });
  });

  // ===========================================
  // GET /api/admin/packages - Get all credit packages
  // ===========================================
  app.get('/packages', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const packages = await prisma.creditPackage.findMany({
      orderBy: { credits: 'asc' },
    });

    return reply.send({
      success: true,
      data: { packages },
    });
  });

  // ===========================================
  // POST /api/admin/packages - Create credit package
  // ===========================================
  app.post('/packages', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string;
      credits: number;
      bonusCredits?: number;
      priceUsd: number;
      discountPercent?: number;
      isPopular?: boolean;
      isActive?: boolean;
    };

    const pricePerCredit = body.priceUsd / (body.credits + (body.bonusCredits || 0));

    const pkg = await prisma.creditPackage.create({
      data: {
        name: body.name,
        credits: body.credits,
        bonusCredits: body.bonusCredits || 0,
        priceUsd: body.priceUsd,
        pricePerCredit,
        discountPercent: body.discountPercent || 0,
        isPopular: body.isPopular || false,
        isActive: body.isActive !== false,
      },
    });

    return reply.send({
      success: true,
      data: { package: pkg },
    });
  });

  // ===========================================
  // PATCH /api/admin/packages/:id - Update credit package
  // ===========================================
  app.patch('/packages/:id', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      credits?: number;
      bonusCredits?: number;
      priceUsd?: number;
      discountPercent?: number;
      isPopular?: boolean;
      isActive?: boolean;
    };

    // Get existing package for calculating pricePerCredit
    const existing = await prisma.creditPackage.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Package not found' },
      });
    }

    const credits = body.credits ?? existing.credits;
    const bonusCredits = body.bonusCredits ?? existing.bonusCredits;
    const priceUsd = body.priceUsd ?? Number(existing.priceUsd);
    const pricePerCredit = priceUsd / (credits + bonusCredits);

    const pkg = await prisma.creditPackage.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.credits !== undefined && { credits: body.credits }),
        ...(body.bonusCredits !== undefined && { bonusCredits: body.bonusCredits }),
        ...(body.priceUsd !== undefined && { priceUsd: body.priceUsd }),
        pricePerCredit,
        ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent }),
        ...(body.isPopular !== undefined && { isPopular: body.isPopular }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return reply.send({
      success: true,
      data: { package: pkg },
    });
  });

  // ===========================================
  // DELETE /api/admin/packages/:id - Delete credit package
  // ===========================================
  app.delete('/packages/:id', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    await prisma.creditPackage.delete({ where: { id } });

    return reply.send({
      success: true,
      message: 'Package deleted successfully',
    });
  });

  // ===========================================
  // GET /api/admin/credit-costs - Get all credit costs
  // ===========================================
  app.get('/credit-costs', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const { creditCostsService } = await import('../costs/credit-costs.service');

    const costs = await creditCostsService.getCreditCosts();
    const defaults = creditCostsService.getDefaultCreditCosts();

    // Also get raw settings from database for display
    const settings = await prisma.costSettings.findUnique({
      where: { id: 'default' },
    });

    return reply.send({
      success: true,
      data: {
        costs,
        defaults,
        raw: settings ? {
          // Analysis Steps
          creditCostMarketPulse: settings.creditCostMarketPulse,
          creditCostAssetScanner: settings.creditCostAssetScanner,
          creditCostSafetyCheck: settings.creditCostSafetyCheck,
          creditCostTiming: settings.creditCostTiming,
          creditCostTradePlan: settings.creditCostTradePlan,
          creditCostTrapCheck: settings.creditCostTrapCheck,
          creditCostFinalVerdict: settings.creditCostFinalVerdict,
          // Bundles
          creditCostFullAnalysis: settings.creditCostFullAnalysis,
          creditCostQuickCheck: settings.creditCostQuickCheck,
          creditCostSmartEntry: settings.creditCostSmartEntry,
          // Features
          creditCostAiExpert: settings.creditCostAiExpert,
          creditCostPdfReport: settings.creditCostPdfReport,
          creditCostTranslation: settings.creditCostTranslation,
          creditCostEmailSend: settings.creditCostEmailSend,
          creditCostAddToReport: settings.creditCostAddToReport,
          creditCostPriceAlert: settings.creditCostPriceAlert,
          creditCostWatchlistSlot: settings.creditCostWatchlistSlot,
        } : null,
        updatedAt: settings?.updatedAt,
      },
    });
  });

  // ===========================================
  // PATCH /api/admin/credit-costs - Update credit costs
  // ===========================================
  app.patch('/credit-costs', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { creditCostsService } = await import('../costs/credit-costs.service');

    const body = request.body as {
      // Analysis Steps
      creditCostMarketPulse?: number;
      creditCostAssetScanner?: number;
      creditCostSafetyCheck?: number;
      creditCostTiming?: number;
      creditCostTradePlan?: number;
      creditCostTrapCheck?: number;
      creditCostFinalVerdict?: number;
      // Bundles
      creditCostFullAnalysis?: number;
      creditCostQuickCheck?: number;
      creditCostSmartEntry?: number;
      // Features
      creditCostAiExpert?: number;
      creditCostPdfReport?: number;
      creditCostTranslation?: number;
      creditCostEmailSend?: number;
      creditCostAddToReport?: number;
      creditCostPriceAlert?: number;
      creditCostWatchlistSlot?: number;
    };

    // Validate all values are non-negative integers
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        if (!Number.isInteger(value) || value < 0) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_VALUE', message: `${key} must be a non-negative integer` },
          });
        }
      }
    }

    const costs = await creditCostsService.updateCreditCosts(body);

    return reply.send({
      success: true,
      data: { costs },
      message: 'Credit costs updated successfully',
    });
  });

  // ===========================================
  // POST /api/admin/credit-costs/reset - Reset credit costs to defaults
  // ===========================================
  app.post('/credit-costs/reset', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const { creditCostsService } = await import('../costs/credit-costs.service');

    const defaults = creditCostsService.getDefaultCreditCosts();

    // Reset all costs to defaults
    const costs = await creditCostsService.updateCreditCosts({
      creditCostMarketPulse: defaults.STEP_MARKET_PULSE,
      creditCostAssetScanner: defaults.STEP_ASSET_SCANNER,
      creditCostSafetyCheck: defaults.STEP_SAFETY_CHECK,
      creditCostTiming: defaults.STEP_TIMING,
      creditCostTradePlan: defaults.STEP_TRADE_PLAN,
      creditCostTrapCheck: defaults.STEP_TRAP_CHECK,
      creditCostFinalVerdict: defaults.STEP_FINAL_VERDICT,
      creditCostFullAnalysis: defaults.BUNDLE_FULL_ANALYSIS,
      creditCostQuickCheck: defaults.BUNDLE_QUICK_CHECK,
      creditCostSmartEntry: defaults.BUNDLE_SMART_ENTRY,
      creditCostAiExpert: defaults.AI_EXPERT_QUESTION,
      creditCostPdfReport: defaults.PDF_REPORT,
      creditCostTranslation: defaults.REPORT_TRANSLATION,
      creditCostEmailSend: defaults.EMAIL_SEND,
      creditCostAddToReport: defaults.ADD_TO_REPORT,
      creditCostPriceAlert: defaults.PRICE_ALERT,
      creditCostWatchlistSlot: defaults.WATCHLIST_SLOT,
    });

    return reply.send({
      success: true,
      data: { costs },
      message: 'Credit costs reset to defaults',
    });
  });

  // ===========================================
  // POST /api/admin/users/:userId/credits - Grant free credits to user
  // ===========================================
  app.post('/users/:userId/credits', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const { amount, reason } = request.body as { amount: number; reason?: string };

    // Validate amount
    if (!amount || !Number.isInteger(amount) || amount <= 0 || amount > 10000) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Amount must be a positive integer (max 10000)' },
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, telegramChatId: true, discordWebhookUrl: true },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    // Get or create credit balance
    let balance = await prisma.creditBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      balance = await prisma.creditBalance.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    // Add credits and create transaction
    const [updated] = await prisma.$transaction([
      prisma.creditBalance.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          lifetimeEarned: { increment: amount },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          balanceAfter: balance.balance + amount,
          type: 'BONUS',
          source: 'admin_grant',
          metadata: {
            grantedBy: request.user?.email || 'admin',
            reason: reason || 'Admin credit grant',
          },
        },
      }),
    ]);

    // Clear cache
    const { cache, cacheKeys } = await import('../../core/cache');
    await cache.del(cacheKeys.userCredits(userId));

    // Send email notification to user
    const { emailService } = await import('../email/email.service');
    const emailResult = await emailService.sendCreditGrantNotification(
      user.email,
      user.name || 'Trader',
      {
        amount,
        reason: reason || 'Admin credit grant',
        newBalance: updated.balance,
      }
    );

    // Send social notifications (Telegram, Discord)
    const { socialNotificationService } = await import('../notifications/social-notification.service');
    const socialResult = await socialNotificationService.sendCreditGrantNotifications(user, {
      amount,
      reason: reason || 'Admin credit grant',
      newBalance: updated.balance,
    });

    return reply.send({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        creditsAdded: amount,
        newBalance: updated.balance,
        reason: reason || 'Admin credit grant',
        notifications: {
          email: emailResult.success,
          social: socialResult.sent,
          channels: socialResult.results.map(r => ({ channel: r.channel, success: r.success })),
        },
      },
    });
  });

  // ===========================================
  // TFT Model Training Endpoints (Admin Only)
  // Proxies to TFT Python service
  // ===========================================

  const TFT_SERVICE_URL = process.env.TFT_SERVICE_URL || 'http://localhost:8000';

  // GET /api/admin/tft/status - Get TFT model status
  app.get('/tft/status', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const response = await fetch(`${TFT_SERVICE_URL}/train/status`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`TFT service error: ${response.status}`);
      }

      const data = await response.json();
      return reply.send({
        success: true,
        data: {
          status: data.status,
          lastTrainedAt: data.last_trained_at,
          modelVersion: data.model_version,
          metrics: data.metrics,
          symbols: data.symbols,
        },
      });
    } catch (error) {
      // Return default state if TFT service is unavailable
      return reply.send({
        success: true,
        data: {
          status: 'not_trained',
          lastTrainedAt: null,
          modelVersion: null,
          metrics: null,
          symbols: [],
          serviceError: String(error),
        },
      });
    }
  });

  // GET /api/admin/tft/progress - Get training progress
  app.get('/tft/progress', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const response = await fetch(`${TFT_SERVICE_URL}/train/progress`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`TFT service error: ${response.status}`);
      }

      const data = await response.json();
      return reply.send({
        success: true,
        data: {
          epoch: data.epoch,
          totalEpochs: data.total_epochs,
          loss: data.loss,
          valLoss: data.val_loss,
          eta: data.eta,
          status: data.status,
          logs: data.logs,
        },
      });
    } catch (error) {
      return reply.send({
        success: true,
        data: {
          epoch: 0,
          totalEpochs: 0,
          loss: 0,
          valLoss: 0,
          eta: '-',
          status: 'idle',
          logs: [],
          serviceError: String(error),
        },
      });
    }
  });

  // POST /api/admin/tft/train - Start TFT training
  app.post('/tft/train', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{
    Body: { symbols: string[]; epochs: number; batchSize: number; tradeType?: string }
  }>, reply: FastifyReply) => {
    const { symbols, epochs = 50, batchSize = 64, tradeType = 'swing' } = request.body;

    if (!symbols || symbols.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_SYMBOLS', message: 'At least one symbol is required' },
      });
    }

    // Validate trade type
    const validTradeTypes = ['scalp', 'swing', 'position'];
    if (!validTradeTypes.includes(tradeType)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_TRADE_TYPE', message: 'Trade type must be: scalp, swing, or position' },
      });
    }

    try {
      const response = await fetch(`${TFT_SERVICE_URL}/train/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, epochs, batch_size: batchSize, trade_type: tradeType }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const error = await response.json();
        return reply.status(response.status).send({
          success: false,
          error: { code: 'TFT_ERROR', message: error.detail || 'Training failed to start' },
        });
      }

      const data = await response.json();
      return reply.send({
        success: true,
        data: { message: data.message, symbols: data.symbols, epochs },
      });
    } catch (error) {
      return reply.status(503).send({
        success: false,
        error: { code: 'TFT_SERVICE_UNAVAILABLE', message: `TFT service unavailable: ${error}` },
      });
    }
  });

  // POST /api/admin/tft/stop - Stop TFT training
  app.post('/tft/stop', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const response = await fetch(`${TFT_SERVICE_URL}/train/stop`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const error = await response.json();
        return reply.status(response.status).send({
          success: false,
          error: { code: 'TFT_ERROR', message: error.detail || 'Failed to stop training' },
        });
      }

      const data = await response.json();
      return reply.send({
        success: true,
        data: { message: data.message },
      });
    } catch (error) {
      return reply.status(503).send({
        success: false,
        error: { code: 'TFT_SERVICE_UNAVAILABLE', message: `TFT service unavailable: ${error}` },
      });
    }
  });

  // ===========================================
  // Gemini AI Settings
  // ===========================================

  const GEMINI_SETTINGS_KEY = 'admin:gemini:settings';
  const AVAILABLE_GEMINI_MODELS = [
    { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash (Preview)', description: 'Newest, most capable flash model' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast and efficient, good balance' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Previous generation flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'More capable but slower' },
  ];

  // GET /api/admin/gemini/settings - Get current Gemini settings
  app.get('/gemini/settings', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settingsJson = await redis.get(GEMINI_SETTINGS_KEY);
      const settings = settingsJson ? JSON.parse(settingsJson) : {
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
        expertModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
        conciergeModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
      };

      return reply.send({
        success: true,
        data: {
          settings,
          availableModels: AVAILABLE_GEMINI_MODELS,
          envModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
        },
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: { code: 'SETTINGS_ERROR', message: `Failed to get settings: ${error}` },
      });
    }
  });

  // POST /api/admin/gemini/settings - Update Gemini settings
  app.post('/gemini/settings', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{ Body: { model?: string; expertModel?: string; conciergeModel?: string } }>, reply: FastifyReply) => {
    try {
      const { model, expertModel, conciergeModel } = request.body;

      // Validate models
      const validModelIds = AVAILABLE_GEMINI_MODELS.map(m => m.id);
      if (model && !validModelIds.includes(model)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_MODEL', message: `Invalid model: ${model}` },
        });
      }
      if (expertModel && !validModelIds.includes(expertModel)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_MODEL', message: `Invalid expertModel: ${expertModel}` },
        });
      }
      if (conciergeModel && !validModelIds.includes(conciergeModel)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_MODEL', message: `Invalid conciergeModel: ${conciergeModel}` },
        });
      }

      // Get existing settings
      const existingJson = await redis.get(GEMINI_SETTINGS_KEY);
      const existing = existingJson ? JSON.parse(existingJson) : {};

      // Merge with new settings
      const newSettings = {
        model: model || existing.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
        expertModel: expertModel || existing.expertModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
        conciergeModel: conciergeModel || existing.conciergeModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
        updatedAt: new Date().toISOString(),
        updatedBy: request.user?.email,
      };

      // Save to Redis (persistent)
      await redis.set(GEMINI_SETTINGS_KEY, JSON.stringify(newSettings));

      return reply.send({
        success: true,
        data: {
          settings: newSettings,
          message: 'Gemini settings updated successfully',
        },
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: { code: 'SETTINGS_ERROR', message: `Failed to update settings: ${error}` },
      });
    }
  });
}

// Helper functions
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
