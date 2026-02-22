-- Credit Ledger Migration (TASK 1.3)
-- Renames credit_transactions → credits_ledger
-- Adds ADJUSTMENT to TransactionType enum
-- Adds compound index [user_id, created_at] for efficient ledger queries

-- 1. Add ADJUSTMENT to TransactionType enum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

-- 2. Rename table: credit_transactions → credits_ledger
ALTER TABLE "credit_transactions" RENAME TO "credits_ledger";

-- 3. Rename primary key constraint
ALTER TABLE "credits_ledger"
  RENAME CONSTRAINT "credit_transactions_pkey" TO "credits_ledger_pkey";

-- 4. Rename foreign key constraint
ALTER TABLE "credits_ledger"
  RENAME CONSTRAINT "credit_transactions_user_id_fkey" TO "credits_ledger_user_id_fkey";

-- 5. Drop old single-column indexes
DROP INDEX IF EXISTS "credit_transactions_user_id_idx";
DROP INDEX IF EXISTS "credit_transactions_created_at_idx";

-- 6. Create new indexes on renamed table
CREATE INDEX IF NOT EXISTS "credits_ledger_user_id_idx"
  ON "credits_ledger"("user_id");

CREATE INDEX IF NOT EXISTS "credits_ledger_user_id_created_at_idx"
  ON "credits_ledger"("user_id", "created_at" DESC);
