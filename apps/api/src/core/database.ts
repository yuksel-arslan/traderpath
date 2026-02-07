// ===========================================
// Database Client
// Using Prisma with Neon PostgreSQL
// ===========================================

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Create base Prisma client (singleton - NEVER create additional PrismaClient instances elsewhere)
// Connection pool is managed here. Other services must import { prisma } from this file.
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
});

// Extend with query timeout to prevent indefinite hangs
// Prisma 6 uses $extends instead of $use middleware
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const startTime = Date.now();
        const timeout = 15_000; // 15 second query timeout

        const result = await Promise.race([
          query(args),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Prisma query timeout: ${model}.${operation} exceeded ${timeout}ms`)),
              timeout
            )
          ),
        ]);

        const duration = Date.now() - startTime;
        if (duration > 5000) {
          logger.warn({
            model,
            action: operation,
            duration: `${duration}ms`,
          }, 'Slow Prisma query detected');
        }

        return result;
      },
    },
  },
});

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    await basePrisma.$connect();
    return true;
  } catch (error) {
    logger.error({ error }, 'Database connection failed');
    return false;
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  await basePrisma.$disconnect();
}
