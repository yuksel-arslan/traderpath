-- Add signal subscription table
-- Signal subscriptions are separate from credit-based subscriptions
-- Users can subscribe to receive automated trading signals

-- Create enum only if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignalSubscriptionTier') THEN
    CREATE TYPE "SignalSubscriptionTier" AS ENUM ('SIGNAL_FREE', 'SIGNAL_BASIC', 'SIGNAL_PRO', 'SIGNAL_PRO_YEARLY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "signal_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,

  -- Stripe identifiers
  "stripe_customer_id" VARCHAR(255) UNIQUE,
  "stripe_subscription_id" VARCHAR(255) UNIQUE,
  "stripe_price_id" VARCHAR(255),

  -- Subscription tier
  "tier" "SignalSubscriptionTier" NOT NULL DEFAULT 'SIGNAL_FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',

  -- Billing period
  "current_period_start" TIMESTAMP,
  "current_period_end" TIMESTAMP,
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,

  -- Features
  "enabled_markets" TEXT[] NOT NULL DEFAULT ARRAY['crypto']::TEXT[], -- markets user receives signals for
  "max_signals_per_day" INTEGER NOT NULL DEFAULT 10,
  "telegram_delivery" BOOLEAN NOT NULL DEFAULT true,
  "discord_delivery" BOOLEAN NOT NULL DEFAULT false,
  "email_delivery" BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "signal_subscriptions_user_id_key" UNIQUE("user_id")
);

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "signal_subscriptions_tier_idx" ON "signal_subscriptions"("tier");
CREATE INDEX IF NOT EXISTS "signal_subscriptions_status_idx" ON "signal_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "signal_subscriptions_stripe_customer_id_idx" ON "signal_subscriptions"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "signal_subscriptions_stripe_subscription_id_idx" ON "signal_subscriptions"("stripe_subscription_id");

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_signal_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS signal_subscription_updated_at ON "signal_subscriptions";
CREATE TRIGGER signal_subscription_updated_at
  BEFORE UPDATE ON "signal_subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION update_signal_subscription_updated_at();
