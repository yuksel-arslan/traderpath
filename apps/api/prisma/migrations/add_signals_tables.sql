-- =====================================================
-- Proactive Signal System Tables
-- Hourly Capital Flow → Asset Analysis → Telegram Signals
-- =====================================================

-- Signal table: Stores generated trading signals
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

-- User Signal Preferences table: User settings for signal delivery
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

-- Comment for documentation
COMMENT ON TABLE signals IS 'Proactive trading signals generated hourly from Capital Flow analysis';
COMMENT ON TABLE user_signal_preferences IS 'User preferences for signal filtering and delivery';
