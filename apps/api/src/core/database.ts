// ===========================================
// Database Client
// Using Prisma with Neon PostgreSQL
// ===========================================

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Create Prisma client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
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
