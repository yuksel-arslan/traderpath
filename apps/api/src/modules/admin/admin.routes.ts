// ===========================================
// Admin Routes
// System monitoring, statistics, and maintenance
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../core/database';
import { redis } from '../../core/cache';
import { authenticate } from '../../core/auth/middleware';
import { config } from '../../core/config';
import { logger } from '../../core/logger';
import os from 'os';

// Admin emails with access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

// Admin API Secret for service-to-service communication
// In production, this MUST be set via environment variable
const ADMIN_API_SECRET = process.env['ADMIN_API_SECRET'];
if (!ADMIN_API_SECRET && !config.isDev) {
  logger.error('CRITICAL: ADMIN_API_SECRET environment variable is not set in production');
  throw new Error('ADMIN_API_SECRET must be set in production environment');
}

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

// Admin authentication middleware that also accepts service secret
async function requireAdminOrSecret(request: FastifyRequest, reply: FastifyReply) {
  // Check for admin secret header (service-to-service)
  const secretHeader = request.headers['x-admin-secret'] as string;
  if (secretHeader && secretHeader === ADMIN_API_SECRET) {
    return; // Allow request from TFT service
  }

  // Fall back to normal admin auth
  await requireAdmin(request, reply);
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

  // ===========================================
  // Google Cloud Vertex AI Training
  // ===========================================

  // POST /api/admin/tft/train/cloud - Start cloud training on Vertex AI
  app.post('/tft/train/cloud', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest<{
    Body: {
      symbols: string[];
      epochs?: number;
      batchSize?: number;
      tradeType?: string;
      machineType?: string;
      acceleratorType?: string;
      acceleratorCount?: number;
    }
  }>, reply: FastifyReply) => {
    const {
      symbols,
      epochs = 100,
      batchSize = 64,
      tradeType = 'swing',
      machineType = 'n1-standard-8',
      acceleratorType = 'NVIDIA_TESLA_T4',
      acceleratorCount = 1,
    } = request.body;

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
      const response = await fetch(`${TFT_SERVICE_URL}/train/cloud/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols,
          epochs,
          batch_size: batchSize,
          trade_type: tradeType,
          machine_type: machineType,
          accelerator_type: acceleratorType,
          accelerator_count: acceleratorCount,
        }),
        signal: AbortSignal.timeout(30000), // Longer timeout for cloud ops
      });

      if (!response.ok) {
        const error = await response.json();
        return reply.status(response.status).send({
          success: false,
          error: { code: 'CLOUD_TRAINING_ERROR', message: error.detail || 'Cloud training failed to start' },
        });
      }

      const data = await response.json();
      return reply.send({
        success: true,
        data: {
          message: 'Cloud training started on Google Cloud Vertex AI',
          job: data.job,
        },
      });
    } catch (error) {
      return reply.status(503).send({
        success: false,
        error: { code: 'TFT_SERVICE_UNAVAILABLE', message: `TFT service unavailable: ${error}` },
      });
    }
  });

  // GET /api/admin/tft/train/cloud/jobs - List cloud training jobs
  app.get('/tft/train/cloud/jobs', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '10' } = request.query as { limit?: string };

    try {
      const response = await fetch(`${TFT_SERVICE_URL}/train/cloud/jobs?limit=${limit}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`TFT service error: ${response.status}`);
      }

      const data = await response.json();
      return reply.send({
        success: true,
        data: data.data,
      });
    } catch (error) {
      return reply.send({
        success: false,
        error: { code: 'SERVICE_ERROR', message: String(error) },
        data: { jobs: [] },
      });
    }
  });

  // GET /api/admin/tft/train/cloud/status/:jobId - Get cloud training job status
  app.get('/tft/train/cloud/status/:jobId', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { jobId } = request.params as { jobId: string };

    try {
      const response = await fetch(`${TFT_SERVICE_URL}/train/cloud/status/${encodeURIComponent(jobId)}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`TFT service error: ${response.status}`);
      }

      const data = await response.json();
      return reply.send({
        success: true,
        data: data.data,
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVICE_ERROR', message: String(error) },
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
  // TFT Model Management (Database)
  // ===========================================

  // GET /api/admin/tft/models - List all trained models
  app.get('/tft/models', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tradeType, status, limit = '20', offset = '0' } = request.query as Record<string, string>;

    const where: any = {};
    if (tradeType) where.tradeType = tradeType;
    if (status) where.status = status;

    const [models, total] = await Promise.all([
      prisma.tFTModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit), 50),
        skip: parseInt(offset),
      }),
      prisma.tFTModel.count({ where }),
    ]);

    // Convert BigInt to number for JSON serialization
    const modelsFormatted = models.map(m => ({
      ...m,
      fileSize: Number(m.fileSize),
      validationLoss: Number(m.validationLoss),
      mape: Number(m.mape),
    }));

    return reply.send({
      success: true,
      data: {
        models: modelsFormatted,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      },
    });
  });

  // GET /api/admin/tft/models/active - Get active models for each trade type
  app.get('/tft/models/active', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const activeModels = await prisma.tFTModel.findMany({
      where: { isActive: true },
      orderBy: { tradeType: 'asc' },
    });

    const modelsFormatted = activeModels.map(m => ({
      ...m,
      fileSize: Number(m.fileSize),
      validationLoss: Number(m.validationLoss),
      mape: Number(m.mape),
    }));

    // Create a map by trade type
    const activeByTradeType: Record<string, any> = {};
    for (const model of modelsFormatted) {
      activeByTradeType[model.tradeType] = model;
    }

    return reply.send({
      success: true,
      data: {
        models: modelsFormatted,
        byTradeType: activeByTradeType,
      },
    });
  });

  // GET /api/admin/tft/models/:id - Get single model details
  app.get('/tft/models/:id', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const model = await prisma.tFTModel.findUnique({ where: { id } });

    if (!model) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
      });
    }

    return reply.send({
      success: true,
      data: {
        model: {
          ...model,
          fileSize: Number(model.fileSize),
          validationLoss: Number(model.validationLoss),
          mape: Number(model.mape),
        },
      },
    });
  });

  // POST /api/admin/tft/models - Save a trained model to database
  // Accepts both admin auth and service secret for TFT service integration
  app.post('/tft/models', {
    preHandler: requireAdminOrSecret,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name: string;
      version: string;
      tradeType: string;
      filePath: string;
      fileSize: number;
      checksum?: string;
      symbols: string[];
      epochs: number;
      batchSize?: number;
      dataInterval: string;
      lookbackDays: number;
      validationLoss: number;
      mape: number;
      trainingSamples: number;
      trainingTime: number;
      hyperparameters?: Record<string, any>;
      description?: string;
    };

    // Validate required fields
    if (!body.name || !body.version || !body.tradeType || !body.filePath) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Name, version, tradeType, and filePath are required' },
      });
    }

    // Validate trade type
    const validTradeTypes = ['scalp', 'swing', 'position'];
    if (!validTradeTypes.includes(body.tradeType)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_TRADE_TYPE', message: 'Trade type must be: scalp, swing, or position' },
      });
    }

    const model = await prisma.tFTModel.create({
      data: {
        name: body.name,
        version: body.version,
        tradeType: body.tradeType,
        filePath: body.filePath,
        fileSize: BigInt(body.fileSize || 0),
        checksum: body.checksum,
        symbols: body.symbols || [],
        epochs: body.epochs || 50,
        batchSize: body.batchSize || 64,
        dataInterval: body.dataInterval || '1h',
        lookbackDays: body.lookbackDays || 365,
        validationLoss: body.validationLoss || 0,
        mape: body.mape || 0,
        trainingSamples: body.trainingSamples || 0,
        trainingTime: body.trainingTime || 0,
        hyperparameters: body.hyperparameters || {},
        description: body.description,
        trainedBy: request.user?.id,
        status: 'READY',
      },
    });

    return reply.send({
      success: true,
      data: {
        model: {
          ...model,
          fileSize: Number(model.fileSize),
          validationLoss: Number(model.validationLoss),
          mape: Number(model.mape),
        },
      },
    });
  });

  // POST /api/admin/tft/models/:id/activate - Activate a model for predictions
  app.post('/tft/models/:id/activate', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    // Get the model to activate
    const model = await prisma.tFTModel.findUnique({ where: { id } });

    if (!model) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
      });
    }

    if (model.status === 'FAILED' || model.status === 'TRAINING') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Cannot activate a model that is training or failed' },
      });
    }

    // Deactivate all other models of the same trade type
    await prisma.tFTModel.updateMany({
      where: { tradeType: model.tradeType, isActive: true },
      data: { isActive: false, status: 'READY' },
    });

    // Activate this model
    const updatedModel = await prisma.tFTModel.update({
      where: { id },
      data: { isActive: true, status: 'ACTIVE', activatedAt: new Date() },
    });

    // Notify TFT service to load the new model (if available)
    try {
      await fetch(`${TFT_SERVICE_URL}/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_path: model.filePath,
          trade_type: model.tradeType,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      // Log but don't fail - TFT service might be unavailable
      console.warn('Failed to notify TFT service of model activation:', error);
    }

    return reply.send({
      success: true,
      data: {
        model: {
          ...updatedModel,
          fileSize: Number(updatedModel.fileSize),
          validationLoss: Number(updatedModel.validationLoss),
          mape: Number(updatedModel.mape),
        },
        message: `Model "${model.name}" is now active for ${model.tradeType} predictions`,
      },
    });
  });

  // PATCH /api/admin/tft/models/:id - Update model metadata
  app.patch('/tft/models/:id', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      description?: string;
      status?: 'READY' | 'ARCHIVED';
    };

    const model = await prisma.tFTModel.findUnique({ where: { id } });

    if (!model) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
      });
    }

    // Don't allow changing active model status to ARCHIVED
    if (model.isActive && body.status === 'ARCHIVED') {
      return reply.status(400).send({
        success: false,
        error: { code: 'CANNOT_ARCHIVE_ACTIVE', message: 'Cannot archive an active model. Activate another model first.' },
      });
    }

    const updatedModel = await prisma.tFTModel.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
      },
    });

    return reply.send({
      success: true,
      data: {
        model: {
          ...updatedModel,
          fileSize: Number(updatedModel.fileSize),
          validationLoss: Number(updatedModel.validationLoss),
          mape: Number(updatedModel.mape),
        },
      },
    });
  });

  // DELETE /api/admin/tft/models/:id - Delete a model
  app.delete('/tft/models/:id', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const model = await prisma.tFTModel.findUnique({ where: { id } });

    if (!model) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
      });
    }

    if (model.isActive) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CANNOT_DELETE_ACTIVE', message: 'Cannot delete an active model. Activate another model first.' },
      });
    }

    await prisma.tFTModel.delete({ where: { id } });

    return reply.send({
      success: true,
      message: 'Model deleted successfully',
    });
  });

  // ===========================================
  // Gemini AI Settings
  // ===========================================

  const GEMINI_SETTINGS_KEY = 'admin:gemini:settings';
  const AVAILABLE_GEMINI_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Preview)', description: 'Newest, most capable flash model' },
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
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        expertModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        conciergeModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      };

      return reply.send({
        success: true,
        data: {
          settings,
          availableModels: AVAILABLE_GEMINI_MODELS,
          envModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
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
        model: model || existing.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        expertModel: expertModel || existing.expertModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        conciergeModel: conciergeModel || existing.conciergeModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
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

  // ===========================================
  // PAYMENT ANALYTICS
  // ===========================================

  /**
   * GET /api/admin/analytics/payments
   * Comprehensive payment analytics dashboard
   */
  app.get(
    '/analytics/payments',
    { preHandler: requireAdmin },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const last30DaysStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Revenue Metrics
        const [
          totalRevenue,
          revenueToday,
          revenueThisWeek,
          revenueThisMonth,
          lemonSqueezyRevenue,
          stripeRevenue,
        ] = await Promise.all([
          // Total revenue (all time) - LemonSqueezy
          prisma.creditTransaction.aggregate({
            where: {
              type: 'PURCHASE',
              source: { startsWith: 'package_' },
            },
            _count: true,
          }).then(async (result) => {
            // Calculate total from packages
            const transactions = await prisma.creditTransaction.findMany({
              where: {
                type: 'PURCHASE',
                source: { startsWith: 'package_' },
              },
              select: {
                metadata: true,
              },
            });

            let total = 0;
            for (const tx of transactions) {
              const metadata = tx.metadata as any;
              if (metadata?.totalUsd) {
                total += parseFloat(metadata.totalUsd);
              }
            }
            return total;
          }),

          // Revenue today
          prisma.creditTransaction.findMany({
            where: {
              type: 'PURCHASE',
              source: { startsWith: 'package_' },
              createdAt: { gte: todayStart },
            },
            select: { metadata: true },
          }).then((txs) => {
            let total = 0;
            for (const tx of txs) {
              const metadata = tx.metadata as any;
              if (metadata?.totalUsd) total += parseFloat(metadata.totalUsd);
            }
            return total;
          }),

          // Revenue this week
          prisma.creditTransaction.findMany({
            where: {
              type: 'PURCHASE',
              source: { startsWith: 'package_' },
              createdAt: { gte: weekStart },
            },
            select: { metadata: true },
          }).then((txs) => {
            let total = 0;
            for (const tx of txs) {
              const metadata = tx.metadata as any;
              if (metadata?.totalUsd) total += parseFloat(metadata.totalUsd);
            }
            return total;
          }),

          // Revenue this month
          prisma.creditTransaction.findMany({
            where: {
              type: 'PURCHASE',
              source: { startsWith: 'package_' },
              createdAt: { gte: monthStart },
            },
            select: { metadata: true },
          }).then((txs) => {
            let total = 0;
            for (const tx of txs) {
              const metadata = tx.metadata as any;
              if (metadata?.totalUsd) total += parseFloat(metadata.totalUsd);
            }
            return total;
          }),

          // LemonSqueezy revenue
          prisma.creditTransaction.findMany({
            where: {
              type: 'PURCHASE',
              source: { startsWith: 'package_' },
            },
            select: { metadata: true },
          }).then((txs) => {
            let total = 0;
            for (const tx of txs) {
              const metadata = tx.metadata as any;
              if (metadata?.totalUsd) total += parseFloat(metadata.totalUsd);
            }
            return total;
          }),

          // Stripe revenue (subscriptions)
          prisma.subscription.aggregate({
            where: {
              status: { in: ['active', 'past_due', 'canceled'] },
            },
            _count: true,
          }).then(async (result) => {
            // Estimate based on active subscriptions
            const subscriptions = await prisma.subscription.findMany({
              where: {
                status: { in: ['active', 'past_due'] },
              },
              select: { tier: true },
            });

            let estimatedMRR = 0;
            for (const sub of subscriptions) {
              if (sub.tier === 'starter') estimatedMRR += 29;
              else if (sub.tier === 'pro') estimatedMRR += 59;
              else if (sub.tier === 'elite') estimatedMRR += 79;
            }
            return estimatedMRR;
          }),
        ]);

        // Refund Metrics
        const [totalRefunds, refundCount] = await Promise.all([
          prisma.creditTransaction.aggregate({
            where: { type: 'REFUND' },
            _sum: { amount: true },
          }).then((result) => Math.abs(result._sum.amount || 0)),

          prisma.creditTransaction.count({
            where: { type: 'REFUND' },
          }),
        ]);

        const totalPurchaseCount = await prisma.creditTransaction.count({
          where: { type: 'PURCHASE' },
        });

        const refundRate = totalPurchaseCount > 0
          ? ((refundCount / totalPurchaseCount) * 100).toFixed(2)
          : '0.00';

        // Subscription Metrics
        const [activeSubscriptions, subscriptionsByTier, totalSubscriptions] = await Promise.all([
          prisma.subscription.count({
            where: { status: 'active' },
          }),

          prisma.subscription.groupBy({
            by: ['tier'],
            where: { status: 'active' },
            _count: true,
          }),

          prisma.subscription.count(),
        ]);

        // Calculate MRR (Monthly Recurring Revenue)
        const subscriptions = await prisma.subscription.findMany({
          where: { status: 'active' },
          select: { tier: true },
        });

        let mrr = 0;
        for (const sub of subscriptions) {
          if (sub.tier === 'starter') mrr += 29;
          else if (sub.tier === 'pro') mrr += 59;
          else if (sub.tier === 'elite') mrr += 79;
        }

        // Time-series revenue data (last 30 days)
        const dailyRevenue = await prisma.creditTransaction.findMany({
          where: {
            type: 'PURCHASE',
            createdAt: { gte: last30DaysStart },
          },
          select: {
            createdAt: true,
            metadata: true,
          },
        });

        // Group by day
        const revenueByDay: Record<string, number> = {};
        for (const tx of dailyRevenue) {
          const day = tx.createdAt.toISOString().split('T')[0];
          const metadata = tx.metadata as any;
          const amount = metadata?.totalUsd ? parseFloat(metadata.totalUsd) : 0;
          revenueByDay[day] = (revenueByDay[day] || 0) + amount;
        }

        // Convert to array for chart
        const chartData = Object.entries(revenueByDay)
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Conversion metrics (estimated)
        const uniquePurchasers = await prisma.creditTransaction.groupBy({
          by: ['userId'],
          where: { type: 'PURCHASE' },
          _count: true,
        });

        const totalUsers = await prisma.user.count();
        const conversionRate = totalUsers > 0
          ? ((uniquePurchasers.length / totalUsers) * 100).toFixed(2)
          : '0.00';

        return reply.send({
          success: true,
          data: {
            revenue: {
              total: totalRevenue.toFixed(2),
              today: revenueToday.toFixed(2),
              thisWeek: revenueThisWeek.toFixed(2),
              thisMonth: revenueThisMonth.toFixed(2),
              bySource: {
                lemonSqueezy: lemonSqueezyRevenue.toFixed(2),
                stripe: stripeRevenue.toFixed(2),
              },
            },
            refunds: {
              total: totalRefunds,
              count: refundCount,
              rate: `${refundRate}%`,
            },
            subscriptions: {
              active: activeSubscriptions,
              total: totalSubscriptions,
              byTier: subscriptionsByTier.map((s) => ({
                tier: s.tier,
                count: s._count,
              })),
              mrr: mrr.toFixed(2),
            },
            conversion: {
              purchasers: uniquePurchasers.length,
              totalUsers,
              rate: `${conversionRate}%`,
            },
            chartData,
          },
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Failed to fetch payment analytics');
        return reply.status(500).send({
          success: false,
          error: { code: 'ANALYTICS_ERROR', message: 'Failed to fetch payment analytics' },
        });
      }
    }
  );

  /**
   * GET /api/admin/analytics/revenue-chart
   * Revenue chart data for visualization
   */
  app.get(
    '/analytics/revenue-chart',
    { preHandler: requireAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = request.query as { days?: string };
        const days = parseInt(query.days || '30');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const transactions = await prisma.creditTransaction.findMany({
          where: {
            type: 'PURCHASE',
            createdAt: { gte: startDate },
          },
          select: {
            createdAt: true,
            metadata: true,
          },
          orderBy: { createdAt: 'asc' },
        });

        // Group by day
        const revenueByDay: Record<string, number> = {};
        for (const tx of transactions) {
          const day = tx.createdAt.toISOString().split('T')[0];
          const metadata = tx.metadata as any;
          const amount = metadata?.totalUsd ? parseFloat(metadata.totalUsd) : 0;
          revenueByDay[day] = (revenueByDay[day] || 0) + amount;
        }

        // Fill missing days with 0
        const chartData = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const day = date.toISOString().split('T')[0];
          chartData.push({
            date: day,
            revenue: revenueByDay[day] || 0,
          });
        }

        return reply.send({
          success: true,
          data: chartData,
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Failed to fetch revenue chart data');
        return reply.status(500).send({
          success: false,
          error: { code: 'CHART_ERROR', message: 'Failed to fetch revenue chart data' },
        });
      }
    }
  );
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
