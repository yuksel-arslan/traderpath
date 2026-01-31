// ===========================================
// TradePath API Server
// Production-grade with comprehensive monitoring
// ===========================================

/// <reference path="./types/fastify.ts" />

import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import rawBody from 'fastify-raw-body';
import { config } from './core/config';
import { prisma } from './core/database';
import { redis } from './core/cache';
import { logger } from './core/logger';
import { errorHandler, TradepathError } from './core/errors';
import { healthRoutes, trackRequest } from './core/health';

// Import routes
import authRoutes from './modules/users/auth.routes';
import securityRoutes from './modules/users/security.routes';
import userRoutes from './modules/users/user.routes';
import analysisRoutes from './modules/analysis/analysis.routes';
import creditRoutes from './modules/credits/credit.routes';
import rewardRoutes from './modules/rewards/reward.routes';
import alertRoutes from './modules/notifications/alert.routes';
import { notificationService } from './modules/notifications/notification.service';
import { startPriceChecker, stopPriceChecker } from './modules/notifications/price-checker.job';
import { reportRoutes } from './modules/reports/report.routes';
import adminRoutes from './modules/admin/admin.routes';
import costRoutes from './modules/costs/cost.routes';
import { translationRoutes } from './modules/translation/translation.routes';
import aiExpertRoutes from './modules/ai-expert/ai-expert.routes';
import expertRoutes from './modules/expert/expert.routes';
import contractSecurityRoutes from './modules/security/contract-security.routes';
import paymentRoutes from './modules/payments/payment.routes';
import scheduledReportsRoutes from './modules/scheduled/scheduled-reports.routes';
import smartCoinsRoutes from './modules/analysis/smart-coins.routes';
import { scheduledReportsService } from './modules/scheduled/scheduled-reports.service';
import { conciergeRoutes } from './modules/concierge/concierge.routes';
import { startCoinScoreCacheJob, stopCoinScoreCacheJob } from './modules/analysis/coin-score-cache.job';
import { capitalFlowRoutes } from './modules/capital-flow/capital-flow.routes';
import { multiMarketRoutes } from './modules/analysis/multi-market.routes';
import dailyPassRoutes from './modules/passes/daily-pass.routes';
import assetLogosRoutes from './modules/asset-logos/asset-logos.routes';
import { initializeAssetLogos } from './modules/asset-logos/asset-logos.service';

// ===========================================
// Server Configuration
// ===========================================

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport: process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined, // Use default JSON logging in production
  },
  trustProxy: true, // Trust reverse proxy headers
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
});

// ===========================================
// Plugins
// ===========================================

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding
});

// CORS
await app.register(cors, {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow configured origins
    if (config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow all Vercel preview domains
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
});

// Rate Limiting - Global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await app.register(rateLimit as any, {
  max: config.rateLimitMax,
  timeWindow: config.rateLimitWindow,
  errorResponseBuilder: (request, context) => {
    return {
      success: false,
      error: {
        code: 'RATE_001',
        message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
        details: {
          retryAfter: Math.ceil(context.ttl / 1000),
        },
      },
    };
  },
  keyGenerator: (request) => {
    // Use user ID if authenticated, otherwise use IP
    return (request as any).user?.id || request.ip;
  },
  addHeadersOnExceeding: {
    'X-RateLimit-Limit': true,
    'X-RateLimit-Remaining': true,
  },
  addHeaders: {
    'X-RateLimit-Limit': true,
    'X-RateLimit-Remaining': true,
    'Retry-After': true,
  },
});

// JWT Authentication
await app.register(jwt, {
  secret: config.jwtSecret,
  sign: {
    expiresIn: config.jwtExpiresIn,
  },
  verify: {
    maxAge: config.jwtExpiresIn,
  },
});

// WebSocket support
await app.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB
    clientTracking: true,
  },
});

// Raw body support for Stripe webhooks
await app.register(rawBody, {
  field: 'rawBody',
  global: false, // Only add rawBody where needed
  encoding: 'utf8',
  runFirst: true,
  routes: ['/api/payments/webhook', '/api/v1/payments/webhook'],
});

// ===========================================
// Decorators
// ===========================================

app.decorate('prisma', prisma);
app.decorate('redis', redis);

// Authenticate decorator for protected routes
app.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<{ id: string }>();

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_002',
          message: 'User not found',
        },
      });
    }

    // Check if admin
    const ADMIN_EMAILS = ['contact@yukselarslan.com'];
    const isAdmin = ADMIN_EMAILS.includes(user.email);

    // Attach user to request
    request.user = { ...user, isAdmin };
  } catch (err) {
    reply.status(401).send({
      success: false,
      error: {
        code: 'AUTH_001',
        message: 'Authentication required',
      },
    });
  }
});

// ===========================================
// Hooks
// ===========================================

// Request start time tracking
app.addHook('onRequest', async (request) => {
  request.startTime = Date.now();

  // Add request ID if not present
  if (!request.headers['x-request-id']) {
    (request.headers as any)['x-request-id'] = crypto.randomUUID();
  }
});

// Response logging and metrics
app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - (request.startTime || Date.now());
  const isError = reply.statusCode >= 400;

  // Track metrics
  trackRequest(duration, isError);

  // Log request
  const logData = {
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration: `${duration}ms`,
    requestId: request.headers['x-request-id'],
    userId: (request as any).user?.id,
    ip: request.ip,
  };

  if (isError) {
    logger.warn(logData, 'Request completed with error');
  } else if (duration > 1000) {
    logger.warn(logData, 'Slow request detected');
  } else {
    logger.info(logData, 'Request completed');
  }
});

// Error logging
app.addHook('onError', async (request, reply, error) => {
  logger.error({
    error: error.message,
    code: (error as TradepathError).code,
    url: request.url,
    method: request.method,
    requestId: request.headers['x-request-id'],
    userId: (request as any).user?.id,
  }, 'Request error');
});

// ===========================================
// Health & Metrics Routes (no auth required)
// ===========================================

await app.register(healthRoutes);

// ===========================================
// API Routes (v1)
// ===========================================

// Auth routes (some public, some protected)
app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(authRoutes, { prefix: '/api/auth' }); // Legacy support

// Security routes (email verification, password reset, 2FA)
app.register(securityRoutes, { prefix: '/api/v1/auth' });
app.register(securityRoutes, { prefix: '/api/auth' }); // Legacy support

// Protected routes
app.register(userRoutes, { prefix: '/api/v1/user' });
app.register(userRoutes, { prefix: '/api/user' }); // Legacy

app.register(analysisRoutes, { prefix: '/api/v1/analysis' });
app.register(analysisRoutes, { prefix: '/api/analysis' }); // Legacy

app.register(creditRoutes, { prefix: '/api/v1/credits' });
app.register(creditRoutes, { prefix: '/api/credits' }); // Legacy

app.register(rewardRoutes, { prefix: '/api/v1/rewards' });
app.register(rewardRoutes, { prefix: '/api/rewards' }); // Legacy

app.register(alertRoutes, { prefix: '/api/v1/alerts' });
app.register(alertRoutes, { prefix: '/api/alerts' }); // Legacy

app.register(reportRoutes);

// Admin routes
app.register(adminRoutes, { prefix: '/api/v1/admin' });
app.register(adminRoutes, { prefix: '/api/admin' }); // Legacy

// Cost management
app.register(costRoutes, { prefix: '/api/v1/costs' });
app.register(costRoutes, { prefix: '/api/costs' }); // Legacy

// Translation
app.register(translationRoutes);

// AI Expert routes (uses full paths internally)
app.register(aiExpertRoutes);

// Expert routes
app.register(expertRoutes, { prefix: '/api/v1/expert' });
app.register(expertRoutes, { prefix: '/api/expert' }); // Legacy

// Contract Security routes
app.register(contractSecurityRoutes, { prefix: '/api/v1/security' });
app.register(contractSecurityRoutes, { prefix: '/api/security' }); // Legacy

// Payment routes (Stripe)
app.register(paymentRoutes, { prefix: '/api/v1/payments' });
app.register(paymentRoutes, { prefix: '/api/payments' }); // Legacy

// Scheduled Reports routes
app.register(scheduledReportsRoutes);

// Smart Coins routes (CoinGecko-powered suggestions)
app.register(smartCoinsRoutes);

// AI Concierge routes (chat-based interface)
app.register(conciergeRoutes, { prefix: '/api/v1/concierge' });
app.register(conciergeRoutes, { prefix: '/api/concierge' }); // Legacy

// Capital Flow routes (Global Capital Flow Intelligence)
app.register(capitalFlowRoutes, { prefix: '/api/v1/capital-flow' });
app.register(capitalFlowRoutes, { prefix: '/api/capital-flow' }); // Legacy

// Multi-Market Analysis routes (Stocks, Bonds, Metals, Crypto)
app.register(multiMarketRoutes, { prefix: '/api/v1/multi-market' });
app.register(multiMarketRoutes, { prefix: '/api/multi-market' }); // Legacy

// Daily Pass routes (Capital Flow L4 and Asset Analysis passes)
app.register(dailyPassRoutes, { prefix: '/api/v1/passes' });
app.register(dailyPassRoutes, { prefix: '/api/passes' }); // Legacy

// Asset Logos routes (public)
app.register(assetLogosRoutes, { prefix: '/api/v1/asset-logos' });
app.register(assetLogosRoutes, { prefix: '/api/asset-logos' }); // Legacy

// ===========================================
// 404 Handler
// ===========================================

app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: {
      code: 'RESOURCE_001',
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
});

// ===========================================
// Error Handler
// ===========================================

app.setErrorHandler(errorHandler);

// ===========================================
// Startup
// ===========================================

// ===========================================
// Outcome Tracking Scheduler
// Checks TP/SL hits every 30 seconds
// ===========================================

let outcomeTrackerInterval: NodeJS.Timeout | null = null;

async function startOutcomeTracker() {
  const { checkAndUpdateOutcomes, checkAndUpdateAnalysisOutcomes, checkAllHistoricalOutcomes } = await import('./modules/reports/live-tracking.service');
  const { calculateExpiredOutcomes, calculateCautionOutcomes } = await import('./modules/reports/outcome.service');

  // ONE-TIME: Fix all historical analyses that never had outcomes recorded
  try {
    const historicalResult = await checkAllHistoricalOutcomes();
    if (historicalResult.checked > 0) {
      logger.info(historicalResult, '✓ Historical outcome check completed (one-time fix)');
    }
  } catch (error) {
    logger.error(error, 'Historical outcome check failed');
  }

  // Run immediately on startup
  try {
    const liveResult = await checkAndUpdateOutcomes();
    const analysisResult = await checkAndUpdateAnalysisOutcomes();
    const expiredResult = await calculateExpiredOutcomes();
    const cautionResult = await calculateCautionOutcomes();
    logger.info({
      live: liveResult,
      analysis: analysisResult,
      expired: expiredResult,
      caution: cautionResult
    }, '✓ Initial outcome check completed');
  } catch (error) {
    logger.error(error, 'Initial outcome check failed');
  }

  // Then run every 30 seconds for live TP/SL tracking
  outcomeTrackerInterval = setInterval(async () => {
    try {
      const liveResult = await checkAndUpdateOutcomes();
      const analysisResult = await checkAndUpdateAnalysisOutcomes();
      if (liveResult.tpHits > 0 || liveResult.slHits > 0) {
        logger.info(liveResult, 'Report outcome tracker: TP/SL hits detected');
      }
      if (analysisResult.tpHits > 0 || analysisResult.slHits > 0) {
        logger.info(analysisResult, 'Analysis outcome tracker: TP/SL hits detected');
      }
    } catch (error) {
      logger.error(error, 'Outcome tracker error');
    }
  }, 30 * 1000); // 30 seconds

  // Run historical outcome check every 10 minutes to catch missed SL/TP hits
  // This uses Binance Klines API to check all candles since analysis creation
  setInterval(async () => {
    try {
      const historicalResult = await checkAllHistoricalOutcomes();
      if (historicalResult.tpHits > 0 || historicalResult.slHits > 0) {
        logger.info(historicalResult, 'Historical outcome check: TP/SL hits detected');
      }
    } catch (error) {
      logger.error(error, 'Historical outcome check failed');
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Run expired outcome calculation every 5 minutes
  setInterval(async () => {
    try {
      const result = await calculateExpiredOutcomes();
      if (result.processed > 0) {
        logger.info(result, 'Expired outcome calculation completed');
      }
    } catch (error) {
      logger.error(error, 'Expired outcome calculation error');
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Run WAIT/AVOID caution outcome calculation every 10 minutes
  setInterval(async () => {
    try {
      const result = await calculateCautionOutcomes();
      if (result.processed > 0) {
        logger.info(result, 'Caution outcome calculation completed');
      }
    } catch (error) {
      logger.error(error, 'Caution outcome calculation error');
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Check price alerts every 15 seconds
  setInterval(async () => {
    try {
      await notificationService.checkAlerts();
    } catch (error) {
      logger.error(error, 'Alert checker error');
    }
  }, 15 * 1000); // 15 seconds

  logger.info('✓ Outcome tracker started (30s live, 5m expired, 10m caution, 15s alerts)');
}

const start = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('✓ Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info('✓ Redis connected');

    // Start outcome tracker
    await startOutcomeTracker();

    // Start price alert checker
    startPriceChecker();
    logger.info('✓ Price checker started');

    // Start scheduled reports cron job
    scheduledReportsService.start();
    logger.info('✓ Scheduled reports cron started');

    // Start coin score cache cron job
    startCoinScoreCacheJob();
    logger.info('✓ Coin score cache cron started');

    // Initialize asset logos in database
    await initializeAssetLogos();
    logger.info('✓ Asset logos initialized');

    // Start server
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info('===========================================');
    logger.info(`   TradePath API Server v1.0.0`);
    logger.info(`   Port: ${config.port}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('===========================================');
    logger.info('');
    logger.info('Endpoints:');
    logger.info(`   Health:    http://localhost:${config.port}/health`);
    logger.info(`   Metrics:   http://localhost:${config.port}/metrics`);
    logger.info(`   API:       http://localhost:${config.port}/api/v1`);
    logger.info('');
  } catch (error) {
    console.error('STARTUP ERROR:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ===========================================
// Graceful Shutdown
// ===========================================

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  try {
    // Stop outcome tracker
    if (outcomeTrackerInterval) {
      clearInterval(outcomeTrackerInterval);
      logger.info('✓ Outcome tracker stopped');
    }

    // Stop price checker
    stopPriceChecker();
    logger.info('✓ Price checker stopped');

    // Stop scheduled reports cron
    scheduledReportsService.stop();
    logger.info('✓ Scheduled reports cron stopped');

    // Stop coin score cache cron
    stopCoinScoreCacheJob();
    logger.info('✓ Coin score cache cron stopped');

    // Stop accepting new connections
    await app.close();
    logger.info('✓ Server closed');

    // Close database connection
    await prisma.$disconnect();
    logger.info('✓ Database disconnected');

    // Close Redis connection
    await redis.quit();
    logger.info('✓ Redis disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

// Start the server
start();

// Type declarations are in src/types/fastify.d.ts
