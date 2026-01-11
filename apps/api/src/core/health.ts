// ===========================================
// TradePath - Health Check & Metrics
// Production-grade monitoring endpoints
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from './database';
import { cache, getCacheStatus } from './cache';
import { logger } from './logger';

// ===========================================
// Types
// ===========================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    cache: ComponentHealth;
    external: ExternalServicesHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
  type?: 'redis' | 'memory';
}

interface ExternalServicesHealth {
  binance: ComponentHealth;
  gemini: ComponentHealth;
  coingecko: ComponentHealth;
}

interface MetricsData {
  timestamp: string;
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu?: {
      usage: number;
    };
  };
  api: {
    totalRequests: number;
    requestsPerMinute: number;
    averageLatency: number;
    errorRate: number;
  };
  business: {
    activeUsers: number;
    analysesToday: number;
    creditsSpentToday: number;
    signupsToday: number;
  };
}

// ===========================================
// Health Check Implementation
// ===========================================

const startTime = Date.now();
let requestCount = 0;
let errorCount = 0;
let totalLatency = 0;

export function trackRequest(latency: number, isError: boolean) {
  requestCount++;
  totalLatency += latency;
  if (isError) errorCount++;
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkCache(): Promise<ComponentHealth> {
  const start = Date.now();
  const cacheStatus = getCacheStatus();
  try {
    await cache.ping();
    return {
      status: 'up',
      latency: Date.now() - start,
      type: cacheStatus.type,
    };
  } catch (error) {
    logger.error({ error }, 'Cache health check failed');
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      type: cacheStatus.type,
    };
  }
}

async function checkBinance(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.binance.com/api/v3/ping', {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    }
    return {
      status: 'down',
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Timeout',
    };
  }
}

async function checkGemini(): Promise<ComponentHealth> {
  // Gemini doesn't have a public ping endpoint, so we just check if we have the API key
  const hasApiKey = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_AI_API_KEY;
  return {
    status: hasApiKey ? 'up' : 'down',
    error: hasApiKey ? undefined : 'API key not configured',
  };
}

async function checkCoingecko(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/ping', {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    }
    return {
      status: 'down',
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Timeout',
    };
  }
}

// ===========================================
// Routes Registration
// ===========================================

export async function healthRoutes(app: FastifyInstance) {
  /**
   * GET /health
   * Basic health check - returns 200 if service is running
   */
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  /**
   * GET /health/live
   * Kubernetes liveness probe - is the process alive?
   */
  app.get('/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ status: 'alive' });
  });

  /**
   * GET /health/ready
   * Kubernetes readiness probe - can the service handle traffic?
   */
  app.get('/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [database, cache] = await Promise.all([
      checkDatabase(),
      checkCache(),
    ]);

    const isReady = database.status === 'up' && cache.status === 'up';

    return reply.status(isReady ? 200 : 503).send({
      ready: isReady,
      checks: { database, cache },
    });
  });

  /**
   * GET /health/detailed
   * Detailed health status including all dependencies
   */
  app.get('/health/detailed', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [database, cache, binance, gemini, coingecko] = await Promise.all([
      checkDatabase(),
      checkCache(),
      checkBinance(),
      checkGemini(),
      checkCoingecko(),
    ]);

    // Determine overall status
    const coreHealthy = database.status === 'up' && cache.status === 'up';
    const externalHealthy = binance.status === 'up' || coingecko.status === 'up'; // At least one data source

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (coreHealthy && externalHealthy) {
      overallStatus = 'healthy';
    } else if (coreHealthy) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const response: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: {
        database,
        cache,
        external: {
          binance,
          gemini,
          coingecko,
        },
      },
    };

    return reply.status(overallStatus === 'unhealthy' ? 503 : 200).send(response);
  });

  /**
   * GET /metrics
   * Prometheus-compatible metrics endpoint
   */
  app.get('/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const memoryUsage = process.memoryUsage();

    // Build Prometheus-format metrics
    const metrics = [
      '# HELP tradepath_uptime_seconds Service uptime in seconds',
      '# TYPE tradepath_uptime_seconds gauge',
      `tradepath_uptime_seconds ${uptime}`,
      '',
      '# HELP tradepath_memory_used_bytes Memory used in bytes',
      '# TYPE tradepath_memory_used_bytes gauge',
      `tradepath_memory_used_bytes ${memoryUsage.heapUsed}`,
      '',
      '# HELP tradepath_memory_total_bytes Total memory in bytes',
      '# TYPE tradepath_memory_total_bytes gauge',
      `tradepath_memory_total_bytes ${memoryUsage.heapTotal}`,
      '',
      '# HELP tradepath_requests_total Total number of requests',
      '# TYPE tradepath_requests_total counter',
      `tradepath_requests_total ${requestCount}`,
      '',
      '# HELP tradepath_errors_total Total number of errors',
      '# TYPE tradepath_errors_total counter',
      `tradepath_errors_total ${errorCount}`,
      '',
      '# HELP tradepath_average_latency_ms Average request latency in milliseconds',
      '# TYPE tradepath_average_latency_ms gauge',
      `tradepath_average_latency_ms ${requestCount > 0 ? Math.round(totalLatency / requestCount) : 0}`,
      '',
    ].join('\n');

    reply.header('Content-Type', 'text/plain; version=0.0.4');
    return reply.send(metrics);
  });

  /**
   * GET /metrics/json
   * JSON format metrics for dashboards
   */
  app.get('/metrics/json', async (_request: FastifyRequest, reply: FastifyReply) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const memoryUsage = process.memoryUsage();

    // Get business metrics from database
    let businessMetrics = {
      activeUsers: 0,
      analysesToday: 0,
      creditsSpentToday: 0,
      signupsToday: 0,
    };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeUsersCount, analysesCount, creditsSpent, signupsCount] = await Promise.all([
        // Active users in last 24 hours
        prisma.user.count({
          where: {
            lastLoginAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        // Analyses today
        prisma.creditTransaction.count({
          where: {
            source: { startsWith: 'analysis_' },
            createdAt: { gte: today },
          },
        }),
        // Credits spent today
        prisma.creditTransaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'SPEND',
            createdAt: { gte: today },
          },
        }),
        // Signups today
        prisma.user.count({
          where: {
            createdAt: { gte: today },
          },
        }),
      ]);

      businessMetrics = {
        activeUsers: activeUsersCount,
        analysesToday: analysesCount,
        creditsSpentToday: Math.abs(creditsSpent._sum.amount || 0),
        signupsToday: signupsCount,
      };
    } catch (error) {
      logger.warn({ error }, 'Failed to fetch business metrics');
    }

    const uptimeMinutes = uptime / 60;
    const requestsPerMinute = uptimeMinutes > 0 ? Math.round(requestCount / uptimeMinutes) : 0;

    const response: MetricsData = {
      timestamp: new Date().toISOString(),
      system: {
        uptime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
      },
      api: {
        totalRequests: requestCount,
        requestsPerMinute,
        averageLatency: requestCount > 0 ? Math.round(totalLatency / requestCount) : 0,
        errorRate: requestCount > 0 ? Math.round((errorCount / requestCount) * 100) : 0,
      },
      business: businessMetrics,
    };

    return reply.send(response);
  });
}
