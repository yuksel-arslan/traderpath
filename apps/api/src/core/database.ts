// ===========================================
// Database Client
// Using Prisma with Neon PostgreSQL
// ===========================================

import { PrismaClient } from '@prisma/client';

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
    console.error('Database connection failed:', error);
    return false;
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect();
}
