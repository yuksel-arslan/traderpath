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
import type { Redis as IoRedis } from 'ioredis';
import { config } from './core/config';
import { prisma } from './core/database';
import { redis } from './core/cache';
import { logger } from './core/logger';
import { errorHandler, TradepathError } from './core/errors';
import { healthRoutes, trackRequest } from './core/health';
import { runStartupMigrations } from './core/startup-migrations';

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
import { bilgeRoutes } from './modules/bilge/bilge.routes';
import { initializeBilgeService, collectError } from './modules/bilge/bilge.service';
import { startBilgeWeeklyReportJob, stopBilgeWeeklyReportJob } from './modules/bilge/bilge-cron.job';
import {
  signalRoutes,
  signalSubscriptionRoutes,
  startSignalGeneratorJob,
  stopSignalGeneratorJob,
  startSignalOutcomeTracker,
  stopSignalOutcomeTracker,
} from './modules/signals';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import { startDailyCreditsJob, stopDailyCreditsJob } from './modules/subscriptions/subscription-cron.job';
import { startReconciliationJob, stopReconciliationJob } from './modules/admin/reconciliation.cron';
import { unifiedAnalysisRoutes } from './modules/unified-analysis';
import { ragRoutes } from './modules/rag';
import notificationCenterRoutes from './modules/notifications/notification-center.routes';
import smartAlertRoutes from './modules/automation/smart-alerts.routes';
import { startSmartAlertJob, stopSmartAlertJob } from './modules/automation/smart-alerts.service';
import { morningBriefingRoutes, startMorningBriefingJob, stopMorningBriefingJob } from './modules/morning-briefing';
import { startCapitalFlowRefreshJobs, stopCapitalFlowRefreshJobs } from './modules/capital-flow/capital-flow-refresh.job';

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
  genReqId: () => crypto.randomUUID(),
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
      requestId: request.id,
      timestamp: new Date().toISOString(),
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

// Custom JSON parser that handles empty bodies gracefully
// This prevents "Body cannot be empty when content-type is set to 'application/json'" errors
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    // Treat empty body as empty object
    if (!body || body === '') {
      done(null, {});
      return;
    }
    const json = JSON.parse(body as string);
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});

// ===========================================
// Decorators
// ===========================================

app.decorate('prisma', prisma);
app.decorate('redis', redis);

// Authenticate decorator for protected routes
// Delegates to the centralized jwt-middleware (single source of truth)
import { authenticate as jwtAuthenticate } from './core/auth/jwt-middleware';
app.decorate('authenticate', jwtAuthenticate);

// ===========================================
// Hooks
// ===========================================

// Request start time tracking
app.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
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

// Inject requestId + timestamp into all API responses
app.addHook('onSend', async (request, _reply, payload) => {
  if (typeof payload !== 'string') return payload;
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed.success === 'boolean' && !parsed.requestId) {
      parsed.requestId = request.id;
      parsed.timestamp = new Date().toISOString();
      return JSON.stringify(parsed);
    }
  } catch {
    // Not JSON or not an API response — return as-is
  }
  return payload;
});

// Error logging and BILGE collection
app.addHook('onError', async (request, reply, error) => {
  logger.error({
    error: error.message,
    code: (error as TradepathError).code,
    url: request.url,
    method: request.method,
    requestId: request.headers['x-request-id'],
    userId: (request as any).user?.id,
  }, 'Request error');

  // Collect error with BILGE Guardian (fire and forget)
  collectError({
    message: error.message,
    stack: error.stack,
    code: (error as TradepathError).code,
    endpoint: request.url,
    method: request.method,
    userId: (request as any).user?.id,
    requestId: request.headers['x-request-id'] as string,
    project: 'traderpath',
  }).catch((bilgeErr) => {
    // Don't let BILGE errors affect the response
    logger.warn({ bilgeErr }, 'BILGE error collection failed');
  });
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

// BILGE Guardian System routes (admin)
app.register(bilgeRoutes);

// Signal System routes (proactive trading signals)
app.register(signalRoutes, { prefix: '/api/v1' });
app.register(signalRoutes, { prefix: '/api' }); // Legacy
// Signal Subscription routes
app.register(signalSubscriptionRoutes, { prefix: '/api/v1/signals' });
// Subscription management routes (credit-based)
app.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
app.register(subscriptionRoutes, { prefix: '/api/subscriptions' }); // Legacy

// Unified Analysis Pipeline routes
app.register(unifiedAnalysisRoutes, { prefix: '/api/v1/unified-analysis' });
app.register(unifiedAnalysisRoutes, { prefix: '/api/unified-analysis' }); // Legacy

// RAG (Retrieval-Augmented Generation) enrichment routes
app.register(ragRoutes, { prefix: '/api/v1/rag' });
app.register(ragRoutes, { prefix: '/api/rag' }); // Legacy

// Notification Center routes (centralized notification management)
app.register(notificationCenterRoutes, { prefix: '/api/v1/notifications' });
app.register(notificationCenterRoutes, { prefix: '/api/notifications' }); // Legacy

app.register(smartAlertRoutes, { prefix: '/api/v1/smart-alerts' });
app.register(smartAlertRoutes, { prefix: '/api/smart-alerts' }); // Legacy

// Morning Briefing routes
app.register(morningBriefingRoutes, { prefix: '/api/v1' });
app.register(morningBriefingRoutes, { prefix: '/api' }); // Legacy

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
let historicalOutcomeInterval: NodeJS.Timeout | null = null;
let expiredOutcomeInterval: NodeJS.Timeout | null = null;
let cautionOutcomeInterval: NodeJS.Timeout | null = null;
let alertCheckerInterval: NodeJS.Timeout | null = null;

// Helper: race a promise against a timeout (returns undefined on timeout)
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) =>
      setTimeout(() => {
        logger.warn(`${label} timed out after ${ms}ms - skipping`);
        resolve(undefined);
      }, ms)
    ),
  ]);
}

async function startOutcomeTracker() {
  const { checkAndUpdateOutcomes, checkAndUpdateAnalysisOutcomes, checkAllHistoricalOutcomes, checkActiveTradesFlowHealth } = await import('./modules/reports/live-tracking.service');
  const { calculateExpiredOutcomes, calculateCautionOutcomes } = await import('./modules/reports/outcome.service');

  // ONE-TIME: Fix all historical analyses that never had outcomes recorded
  // Wrapped with 30s timeout to prevent blocking on external API hangs
  try {
    const historicalResult = await withTimeout(
      checkAllHistoricalOutcomes(),
      30_000,
      'Historical outcome check'
    );
    if (historicalResult && historicalResult.checked > 0) {
      logger.info(historicalResult, '✓ Historical outcome check completed (one-time fix)');
    }
  } catch (error) {
    logger.error(error, 'Historical outcome check failed');
  }

  // Run immediately on startup with individual timeouts
  try {
    const [liveResult, analysisResult, expiredResult, cautionResult] = await Promise.all([
      withTimeout(checkAndUpdateOutcomes(), 15_000, 'Live outcome check'),
      withTimeout(checkAndUpdateAnalysisOutcomes(), 15_000, 'Analysis outcome check'),
      withTimeout(calculateExpiredOutcomes(), 15_000, 'Expired outcome calc'),
      withTimeout(calculateCautionOutcomes(), 15_000, 'Caution outcome calc'),
    ]);
    logger.info({
      live: liveResult ?? 'timed out',
      analysis: analysisResult ?? 'timed out',
      expired: expiredResult ?? 'timed out',
      caution: cautionResult ?? 'timed out',
    }, '✓ Initial outcome check completed');
  } catch (error) {
    logger.error(error, 'Initial outcome check failed');
  }

  // Guard flags to prevent overlapping job executions
  let outcomeTrackerRunning = false;
  let historicalCheckRunning = false;
  let expiredCalcRunning = false;
  let cautionCalcRunning = false;
  let alertCheckRunning = false;

  // Then run every 30 seconds for live TP/SL tracking
  outcomeTrackerInterval = setInterval(async () => {
    if (outcomeTrackerRunning) {
      logger.debug('Outcome tracker still running, skipping this tick');
      return;
    }
    outcomeTrackerRunning = true;
    try {
      const [liveResult, analysisResult] = await Promise.all([
        withTimeout(checkAndUpdateOutcomes(), 25_000, 'Live outcome check'),
        withTimeout(checkAndUpdateAnalysisOutcomes(), 25_000, 'Analysis outcome check'),
      ]);
      if (liveResult && (liveResult.tpHits > 0 || liveResult.slHits > 0)) {
        logger.info(liveResult, 'Report outcome tracker: TP/SL hits detected');
      }
      if (analysisResult && (analysisResult.tpHits > 0 || analysisResult.slHits > 0)) {
        logger.info(analysisResult, 'Analysis outcome tracker: TP/SL hits detected');
      }
    } catch (error) {
      logger.error(error, 'Outcome tracker error');
    } finally {
      outcomeTrackerRunning = false;
    }
  }, 30 * 1000); // 30 seconds

  // Run historical outcome check every 10 minutes to catch missed SL/TP hits
  // This uses Binance Klines API to check all candles since analysis creation
  historicalOutcomeInterval = setInterval(async () => {
    if (historicalCheckRunning) {
      logger.debug('Historical outcome check still running, skipping this tick');
      return;
    }
    historicalCheckRunning = true;
    try {
      const historicalResult = await withTimeout(
        checkAllHistoricalOutcomes(),
        5 * 60_000, // 5 minute timeout for historical check
        'Historical outcome check'
      );
      if (historicalResult && (historicalResult.tpHits > 0 || historicalResult.slHits > 0)) {
        logger.info(historicalResult, 'Historical outcome check: TP/SL hits detected');
      }
    } catch (error) {
      logger.error(error, 'Historical outcome check failed');
    }

    // Capital Flow Health Monitor - check flow health for all active trades
    try {
      await withTimeout(
        checkActiveTradesFlowHealth(),
        60_000, // 1 minute timeout
        'Capital Flow health check'
      );
    } catch (error) {
      logger.warn(error, 'Capital Flow Monitor check failed');
    } finally {
      historicalCheckRunning = false;
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Run expired outcome calculation every 5 minutes
  expiredOutcomeInterval = setInterval(async () => {
    if (expiredCalcRunning) return;
    expiredCalcRunning = true;
    try {
      const result = await withTimeout(
        calculateExpiredOutcomes(),
        60_000, // 1 minute timeout
        'Expired outcome calc'
      );
      if (result && result.processed > 0) {
        logger.info(result, 'Expired outcome calculation completed');
      }
    } catch (error) {
      logger.error(error, 'Expired outcome calculation error');
    } finally {
      expiredCalcRunning = false;
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Run WAIT/AVOID caution outcome calculation every 10 minutes
  cautionOutcomeInterval = setInterval(async () => {
    if (cautionCalcRunning) return;
    cautionCalcRunning = true;
    try {
      const result = await withTimeout(
        calculateCautionOutcomes(),
        60_000, // 1 minute timeout
        'Caution outcome calc'
      );
      if (result && result.processed > 0) {
        logger.info(result, 'Caution outcome calculation completed');
      }
    } catch (error) {
      logger.error(error, 'Caution outcome calculation error');
    } finally {
      cautionCalcRunning = false;
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Check price alerts every 30 seconds (reduced from 15s to lower API load)
  alertCheckerInterval = setInterval(async () => {
    if (alertCheckRunning) return;
    alertCheckRunning = true;
    try {
      await withTimeout(
        notificationService.checkAlerts(),
        25_000, // 25 second timeout (must finish before next 30s tick)
        'Alert checker'
      );
    } catch (error) {
      logger.error(error, 'Alert checker error');
    } finally {
      alertCheckRunning = false;
    }
  }, 30 * 1000); // 30 seconds

  logger.info('✓ Outcome tracker started (30s live, 5m expired, 10m caution, 30s alerts)');
}

const start = async () => {
  try {
    // Connect to database with hard 10s timeout
    try {
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB connect timeout after 10s')), 10_000)
        ),
      ]);
      logger.info('✓ Database connected');

      // Apply idempotent startup migrations (safe to run every boot)
      await runStartupMigrations(prisma);
    } catch (dbError: any) {
      logger.error({ error: dbError?.message }, 'Database connection failed - starting without DB');
    }

    // Test Redis connection (has in-memory fallback)
    try {
      await redis.ping();
      logger.info('✓ Redis connected');
    } catch (redisError: any) {
      logger.warn({ error: redisError?.message }, 'Redis ping failed - using in-memory fallback');
    }

    // ===========================================
    // EXTERNAL API ISOLATION FLAG
    // When true, all external API-dependent background jobs are disabled.
    // Only DB + Redis + Auth + Routes are active.
    // Set DISABLE_EXTERNAL_APIS=true in env to enable minimal mode.
    // ===========================================
    const externalApisDisabled = process.env['DISABLE_EXTERNAL_APIS'] === 'true';

    if (externalApisDisabled) {
      logger.info('⚠ MINIMAL MODE: External APIs disabled. Only DB/Redis/Auth/Routes active.');
      logger.info('  Skipped: outcome tracker, price checker, scheduled reports,');
      logger.info('           coin score cache, signals, BILGE cron, asset logos.');
    } else {
      // Start outcome tracker (non-blocking - don't hold up server startup)
      startOutcomeTracker().catch((err) => {
        logger.error(err, 'Outcome tracker startup failed (non-blocking)');
      });

      // Start price alert checker
      startPriceChecker();
      logger.info('✓ Price checker started');

      // Start scheduled reports cron job
      scheduledReportsService.start();
      logger.info('✓ Scheduled reports cron started');

      // Start coin score cache cron job
      startCoinScoreCacheJob();
      logger.info('✓ Coin score cache cron started');

      // Initialize asset logos in database (non-blocking)
      initializeAssetLogos().then(() => {
        logger.info('✓ Asset logos initialized');
      }).catch((err) => {
        logger.warn({ message: err?.message, stack: err?.stack }, 'Asset logos initialization failed (non-blocking)');
      });

      // Each cron job is wrapped individually so one failure doesn't block the rest
      const safeCronStart = (name: string, fn: () => void) => {
        try {
          fn();
          logger.info(`✓ ${name} started`);
        } catch (err: any) {
          logger.error({ message: err?.message, stack: err?.stack, code: err?.code }, `✗ ${name} failed to start (non-blocking)`);
        }
      };

      safeCronStart('BILGE Guardian', () => initializeBilgeService(redis as unknown as IoRedis));
      safeCronStart('BILGE weekly report cron', () => startBilgeWeeklyReportJob());
      safeCronStart('Signal generator cron', () => startSignalGeneratorJob());
      safeCronStart('Signal outcome tracker cron', () => startSignalOutcomeTracker());
      safeCronStart('Smart alert cron', () => startSmartAlertJob());
      safeCronStart('Subscription daily credits cron', () => startDailyCreditsJob());
      safeCronStart('Morning briefing cron', () => startMorningBriefingJob());
      safeCronStart('Payment reconciliation cron', () => startReconciliationJob());
      safeCronStart('Capital Flow smart refresh cron', () => startCapitalFlowRefreshJobs());
    }

    // Start server
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info('===========================================');
    logger.info(`   TradePath API Server v1.0.0`);
    logger.info(`   Port: ${config.port}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   Mode: ${externalApisDisabled ? 'MINIMAL (no external APIs)' : 'FULL'}`);
    logger.info('===========================================');
    logger.info('');
    logger.info('Endpoints:');
    logger.info(`   Health:    http://localhost:${config.port}/health`);
    logger.info(`   Metrics:   http://localhost:${config.port}/metrics`);
    logger.info(`   API:       http://localhost:${config.port}/api/v1`);
    logger.info('');
  } catch (error: any) {
    // Error objects are not enumerable — JSON.stringify yields {}.
    // Extract fields explicitly so the real cause appears in logs.
    logger.error(
      {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        name: error?.name,
        // Fastify-specific: port conflicts surface here
        port: config.port,
        syscall: error?.syscall,
        address: error?.address,
      },
      'STARTUP ERROR: Failed to start server'
    );
    process.exit(1);
  }
};

// ===========================================
// Graceful Shutdown
// ===========================================

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  try {
    // Stop all outcome trackers and intervals
    if (outcomeTrackerInterval) clearInterval(outcomeTrackerInterval);
    if (historicalOutcomeInterval) clearInterval(historicalOutcomeInterval);
    if (expiredOutcomeInterval) clearInterval(expiredOutcomeInterval);
    if (cautionOutcomeInterval) clearInterval(cautionOutcomeInterval);
    if (alertCheckerInterval) clearInterval(alertCheckerInterval);
    logger.info('✓ All interval timers stopped');

    // Stop price checker
    stopPriceChecker();
    logger.info('✓ Price checker stopped');

    // Stop scheduled reports cron
    scheduledReportsService.stop();
    logger.info('✓ Scheduled reports cron stopped');

    // Stop coin score cache cron
    stopCoinScoreCacheJob();
    logger.info('✓ Coin score cache cron stopped');

    // Stop BILGE weekly report cron
    stopBilgeWeeklyReportJob();
    logger.info('✓ BILGE weekly report cron stopped');

    // Stop Signal Generator cron
    stopSignalGeneratorJob();
    logger.info('✓ Signal generator cron stopped');

    // Stop Signal Outcome Tracker cron
    stopSignalOutcomeTracker();
    logger.info('✓ Signal outcome tracker cron stopped');

    // Stop Smart Alert scan cron
    stopSmartAlertJob();
    logger.info('✓ Smart alert cron stopped');

    // Stop subscription daily credits cron
    stopDailyCreditsJob();
    logger.info('✓ Subscription daily credits cron stopped');
    // Stop payment reconciliation cron
    stopReconciliationJob();
    logger.info('✓ Payment reconciliation cron stopped');

    // Stop Morning Briefing cron
    stopMorningBriefingJob();
    logger.info('✓ Morning briefing cron stopped');

    // Stop Capital Flow smart refresh cron
    stopCapitalFlowRefreshJobs();
    logger.info('✓ Capital Flow refresh cron stopped');

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
// IMPORTANT: Do NOT call shutdown() for every uncaught exception.
// This was causing crash loops when background tasks threw errors.
// Only shutdown for truly fatal errors, not recoverable ones.
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  // Only exit for truly fatal errors (OOM, stack overflow, etc.)
  // Background task errors should be caught within their own try/catch
  if (error.message?.includes('out of memory') || error.message?.includes('Maximum call stack')) {
    shutdown('uncaughtException (fatal)');
  }
  // Otherwise just log - the server can continue
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
  // Don't crash - just log. This prevents promise rejections from background
  // tasks (cron jobs, monitoring) from killing the entire server.
});

// Start the server
start();

// Type declarations are in src/types/fastify.d.ts
