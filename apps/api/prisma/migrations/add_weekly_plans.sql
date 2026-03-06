-- Weekly Plans Migration
-- Add WeeklyPlanType enum and weekly_plans table
-- For Report Subscription ($6.99/week = 7 reports) and Analysis Subscription ($6.99/week = 7 analyses)

-- Create enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WeeklyPlanType') THEN
        CREATE TYPE "WeeklyPlanType" AS ENUM ('REPORT_WEEKLY', 'ANALYSIS_WEEKLY');
    END IF;
END$$;

-- Create weekly_plans table
CREATE TABLE IF NOT EXISTS "weekly_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "planType" "WeeklyPlanType" NOT NULL,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "stripe_price_id" VARCHAR(255),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "remaining_quota" INTEGER NOT NULL DEFAULT 7,
    "total_quota" INTEGER NOT NULL DEFAULT 7,
    "quota_used_this_period" INTEGER NOT NULL DEFAULT 0,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "telegram_delivery" BOOLEAN NOT NULL DEFAULT true,
    "discord_delivery" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_user_id_planType_key') THEN
        ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_user_id_planType_key" UNIQUE ("user_id", "planType");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_stripe_subscription_id_key') THEN
        ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");
    END IF;
END$$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "weekly_plans_planType_idx" ON "weekly_plans"("planType");
CREATE INDEX IF NOT EXISTS "weekly_plans_status_idx" ON "weekly_plans"("status");
CREATE INDEX IF NOT EXISTS "weekly_plans_stripe_customer_id_idx" ON "weekly_plans"("stripe_customer_id");

-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_user_id_fkey') THEN
        ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
