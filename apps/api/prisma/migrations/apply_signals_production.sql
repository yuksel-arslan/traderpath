-- =====================================================
-- PRODUCTION MIGRATION: Signal System Tables
-- Run this SQL on Neon DB to enable the Signals feature
-- =====================================================

-- 1. Signal table: Stores generated trading signals
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asset Information
  symbol VARCHAR(20) NOT NULL,
  asset_class VARCHAR(20) NOT NULL, -- crypto, stocks, metals, bonds
  market VARCHAR(20) NOT NULL, -- crypto, stocks, bonds, metals

  -- Trade Direction
  direction VARCHAR(10) NOT NULL, -- long, short

  -- Trade Plan (from 7-Step Analysis)
  entry_price DECIMAL(20, 8) NOT NULL,
  stop_loss DECIMAL(20, 8) NOT NULL,
  take_profit_1 DECIMAL(20, 8) NOT NULL,
  take_profit_2 DECIMAL(20, 8) NOT NULL,
  risk_reward_ratio DECIMAL(5, 2) NOT NULL,

  -- Analysis Results
  classic_verdict VARCHAR(20) NOT NULL, -- GO, CONDITIONAL_GO, WAIT, AVOID
  classic_score DECIMAL(4, 1) NOT NULL, -- 0-10
  mlis_confirmation BOOLEAN NOT NULL, -- true if MLIS agrees with Classic
  mlis_recommendation VARCHAR(20), -- STRONG_BUY, BUY, HOLD, SELL
  mlis_confidence INTEGER, -- 0-100
  overall_confidence INTEGER NOT NULL, -- 0-100 combined confidence

  -- Capital Flow Context
  capital_flow_phase VARCHAR(10) NOT NULL, -- early, mid, late, exit
  capital_flow_bias VARCHAR(15) NOT NULL, -- risk_on, risk_off, neutral
  sector_flow DECIMAL(5, 2), -- sector 7d flow %

  -- Analysis References
  classic_analysis_id UUID,
  mlis_analysis_id UUID,

  -- Signal Status
  status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending, published, expired, cancelled
  published_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- Signal validity window

  -- Outcome Tracking
  outcome VARCHAR(20), -- tp1_hit, tp2_hit, sl_hit, expired
  outcome_price DECIMAL(20, 8),
  outcome_at TIMESTAMP,
  pnl_percent DECIMAL(6, 2),

  -- Delivery Tracking
  telegram_message_id VARCHAR(50),
  discord_message_id VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for signals table
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
CREATE INDEX IF NOT EXISTS idx_signals_market_status ON signals(market, status);

-- 2. User Signal Preferences table
CREATE TABLE IF NOT EXISTS user_signal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Market Preferences
  enabled_markets TEXT[] DEFAULT ARRAY['crypto', 'stocks', 'metals', 'bonds'],
  enabled_asset_classes TEXT[] DEFAULT ARRAY['crypto', 'stocks', 'metals', 'bonds'],

  -- Filter Preferences
  min_confidence INTEGER DEFAULT 70 NOT NULL, -- 0-100
  min_classic_score DECIMAL(3, 1) DEFAULT 7.0 NOT NULL,
  require_mlis_confirm BOOLEAN DEFAULT TRUE NOT NULL,

  -- Verdict Filters
  allowed_verdicts TEXT[] DEFAULT ARRAY['GO', 'CONDITIONAL_GO'],

  -- Notification Channels
  telegram_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  telegram_chat_id VARCHAR(50),
  discord_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  discord_webhook_url VARCHAR(255),
  email_enabled BOOLEAN DEFAULT TRUE NOT NULL,

  -- Quiet Hours (UTC)
  quiet_hours_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  quiet_hours_start INTEGER, -- 0-23 UTC hour
  quiet_hours_end INTEGER, -- 0-23 UTC hour

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create SignalSubscriptionTier enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignalSubscriptionTier') THEN
    CREATE TYPE "SignalSubscriptionTier" AS ENUM ('SIGNAL_FREE', 'SIGNAL_BASIC', 'SIGNAL_PRO', 'SIGNAL_PRO_YEARLY');
  END IF;
END $$;

-- 4. Signal Subscriptions table
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
  "enabled_markets" TEXT[] NOT NULL DEFAULT ARRAY['crypto']::TEXT[],
  "max_signals_per_day" INTEGER NOT NULL DEFAULT 10,
  "telegram_delivery" BOOLEAN NOT NULL DEFAULT true,
  "discord_delivery" BOOLEAN NOT NULL DEFAULT false,
  "email_delivery" BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for signal_subscriptions
CREATE INDEX IF NOT EXISTS "signal_subscriptions_tier_idx" ON "signal_subscriptions"("tier");
CREATE INDEX IF NOT EXISTS "signal_subscriptions_status_idx" ON "signal_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "signal_subscriptions_stripe_customer_id_idx" ON "signal_subscriptions"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "signal_subscriptions_stripe_subscription_id_idx" ON "signal_subscriptions"("stripe_subscription_id");

-- Add update trigger for signal_subscriptions
CREATE OR REPLACE FUNCTION update_signal_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS signal_subscription_updated_at ON "signal_subscriptions";
CREATE TRIGGER signal_subscription_updated_at
  BEFORE UPDATE ON "signal_subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION update_signal_subscription_updated_at();

-- Comments
COMMENT ON TABLE signals IS 'Proactive trading signals generated from Capital Flow analysis';
COMMENT ON TABLE user_signal_preferences IS 'User preferences for signal filtering and delivery';
COMMENT ON TABLE signal_subscriptions IS 'Signal service subscription plans';

-- Success message
SELECT 'Signal tables created successfully!' as result;
