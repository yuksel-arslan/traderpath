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
        await redis.flushdb();
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
