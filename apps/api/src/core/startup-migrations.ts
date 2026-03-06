// ===========================================
// Startup Migrations
// Idempotent schema fixes applied on every startup.
// Safe to run multiple times — each block checks before acting.
// ===========================================

import { logger } from './logger';

// Minimal interface accepting both PrismaClient and the extended Prisma client
interface DbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

/**
 * Ensures the credits_ledger table exists.
 *
 * Handles 3 states:
 *   1. credits_ledger already exists  → no-op
 *   2. credit_transactions exists     → rename + re-index
 *   3. Neither exists                 → create from scratch
 *
 * Also adds ADJUSTMENT to TransactionType enum if missing.
 */
async function ensureCreditLedger(client: DbClient): Promise<void> {
  // Check current state
  const [ledgerExists] = await client.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'credits_ledger'
    ) AS exists
  `;

  if (ledgerExists.exists) {
    // Already correct — ensure ADJUSTMENT enum value exists (idempotent)
    await client.$executeRawUnsafe(
      `ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT'`
    ).catch(() => {}); // ignore if type doesn't exist yet
    return;
  }

  const [oldExists] = await client.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'credit_transactions'
    ) AS exists
  `;

  if (oldExists.exists) {
    // Rename credit_transactions → credits_ledger
    logger.info('[Migration] Renaming credit_transactions → credits_ledger');

    await client.$executeRawUnsafe(`ALTER TABLE "credit_transactions" RENAME TO "credits_ledger"`);

    // Rename constraints — ignore if names differ
    await client.$executeRawUnsafe(
      `ALTER TABLE "credits_ledger" RENAME CONSTRAINT "credit_transactions_pkey" TO "credits_ledger_pkey"`
    ).catch(() => {});

    await client.$executeRawUnsafe(
      `ALTER TABLE "credits_ledger" RENAME CONSTRAINT "credit_transactions_user_id_fkey" TO "credits_ledger_user_id_fkey"`
    ).catch(() => {});

    // Re-index
    await client.$executeRawUnsafe(`DROP INDEX IF EXISTS "credit_transactions_user_id_idx"`);
    await client.$executeRawUnsafe(`DROP INDEX IF EXISTS "credit_transactions_created_at_idx"`);
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "credits_ledger_user_id_idx" ON "credits_ledger"("user_id")`
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "credits_ledger_user_id_created_at_idx" ON "credits_ledger"("user_id", "created_at" DESC)`
    );

    // Ensure ADJUSTMENT enum value
    await client.$executeRawUnsafe(
      `ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT'`
    ).catch(() => {});

    logger.info('[Migration] credits_ledger rename complete');
    return;
  }

  // Table doesn't exist at all — create from scratch
  logger.info('[Migration] Creating credits_ledger table');

  // Ensure enum exists first
  await client.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
        CREATE TYPE "TransactionType" AS ENUM (
          'PURCHASE', 'REWARD', 'SPEND', 'REFUND', 'REFERRAL', 'BONUS', 'ADJUSTMENT'
        );
      END IF;
    END $$
  `);

  await client.$executeRawUnsafe(
    `ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT'`
  ).catch(() => {});

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "credits_ledger" (
      "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
      "user_id"       UUID        NOT NULL,
      "amount"        INTEGER     NOT NULL,
      "balance_after" INTEGER     NOT NULL,
      "type"          "TransactionType" NOT NULL,
      "source"        VARCHAR(100) NOT NULL,
      "metadata"      JSONB       NOT NULL DEFAULT '{}',
      "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT "credits_ledger_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "credits_ledger_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )
  `);

  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "credits_ledger_user_id_idx" ON "credits_ledger"("user_id")`
  );
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "credits_ledger_user_id_created_at_idx" ON "credits_ledger"("user_id", "created_at" DESC)`
  );

  logger.info('[Migration] credits_ledger table created');
}

/**
 * Run all startup migrations.
 * Called once during server bootstrap, after DB connects.
 */
export async function runStartupMigrations(client: DbClient): Promise<void> {
  try {
    await ensureCreditLedger(client);
    logger.info('✓ Startup migrations complete');
  } catch (err) {
    logger.error({ err }, '✗ Startup migration failed — app will continue but credits may not work');
  }
}
