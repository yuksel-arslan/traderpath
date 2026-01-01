// ===========================================
// TradePath API Server
// ===========================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './core/config';
import { prisma } from './core/database';
import { redis } from './core/cache';
import { logger } from './core/logger';

// Import routes
import authRoutes from './modules/users/auth.routes';
import userRoutes from './modules/users/user.routes';
import analysisRoutes from './modules/analysis/analysis.routes';
import creditRoutes from './modules/credits/credit.routes';
import rewardRoutes from './modules/rewards/reward.routes';
import alertRoutes from './modules/notifications/alert.routes';
import { reportRoutes } from './modules/reports/report.routes';

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// ===========================================
// Plugins
// ===========================================

// Security
await app.register(helmet);
await app.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});

// Rate Limiting
await app.register(rateLimit, {
  max: config.rateLimitMax,
  timeWindow: config.rateLimitWindow,
});

// JWT
await app.register(jwt, {
  secret: config.jwtSecret,
  sign: {
    expiresIn: config.jwtExpiresIn,
  },
});

// WebSocket
await app.register(websocket);

// ===========================================
// Decorators
// ===========================================

app.decorate('prisma', prisma);
app.decorate('redis', redis);

// ===========================================
// Hooks
// ===========================================

app.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - (request.startTime || Date.now());
  logger.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration: `${duration}ms`,
  });
});

// ===========================================
// Routes
// ===========================================

// Health check
app.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
});

// Readiness check
app.get('/ready', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return { ready: true };
  } catch (error) {
    return { ready: false, error: String(error) };
  }
});

// API routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(userRoutes, { prefix: '/api/user' });
app.register(analysisRoutes, { prefix: '/api/analysis' });
app.register(creditRoutes, { prefix: '/api/credits' });
app.register(rewardRoutes, { prefix: '/api/rewards' });
app.register(alertRoutes, { prefix: '/api/alerts' });
app.register(reportRoutes);

// ===========================================
// Error Handler
// ===========================================

app.setErrorHandler((error, request, reply) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  // Known errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message,
      },
    });
  }

  // Unknown errors
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// ===========================================
// Startup
// ===========================================

const start = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected');

    // Start server
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info(`Server running on port ${config.port}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await app.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

// Type declarations
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}
