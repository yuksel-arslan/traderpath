-- Remove daily free analyses feature
ALTER TABLE credit_balances
DROP COLUMN IF EXISTS daily_free_remaining,
DROP COLUMN IF EXISTS daily_reset_at;
