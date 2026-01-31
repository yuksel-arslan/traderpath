-- Daily Pass System
-- Tracks daily passes for Capital Flow and Asset Analysis

-- Create DailyPassType enum
DO $$ BEGIN
  CREATE TYPE "DailyPassType" AS ENUM ('CAPITAL_FLOW_L3', 'CAPITAL_FLOW_L4', 'ASSET_ANALYSIS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create daily_passes table
CREATE TABLE IF NOT EXISTS "daily_passes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "pass_type" "DailyPassType" NOT NULL,
  "pass_date" DATE NOT NULL,
  "credits_cost" INTEGER NOT NULL,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "max_usage" INTEGER NOT NULL DEFAULT 10,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "daily_passes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_passes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "unique_daily_pass" UNIQUE ("user_id", "pass_type", "pass_date")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "daily_passes_user_id_idx" ON "daily_passes"("user_id");
CREATE INDEX IF NOT EXISTS "daily_passes_pass_type_idx" ON "daily_passes"("pass_type");
CREATE INDEX IF NOT EXISTS "daily_passes_pass_date_idx" ON "daily_passes"("pass_date");
CREATE INDEX IF NOT EXISTS "daily_passes_expires_at_idx" ON "daily_passes"("expires_at");
