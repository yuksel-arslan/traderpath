// ===========================================
// Database Client
// Using Prisma with Neon PostgreSQL
// ===========================================

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Create Prisma client (singleton - NEVER create additional PrismaClient instances elsewhere)
// Connection pool is managed here. Other services must import { prisma } from this file.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
});

// Middleware: Add query timeout to prevent indefinite hangs
// This ensures no single query blocks the connection pool for more than 15 seconds
prisma.$use(async (params, next) => {
  const startTime = Date.now();
  const timeout = 15_000; // 15 second query timeout

  const result = await Promise.race([
    next(params),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Prisma query timeout: ${params.model}.${params.action} exceeded ${timeout}ms`)),
        timeout
      )
    ),
  ]);

  const duration = Date.now() - startTime;
  if (duration > 5000) {
    logger.warn({
      model: params.model,
      action: params.action,
      duration: `${duration}ms`,
    }, 'Slow Prisma query detected');
  }

  return result;
});

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    logger.error({ error }, 'Database connection failed');
    return false;
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect();
}
