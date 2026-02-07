-- Smart Alert Preferences table
-- Stores per-user preferences for L1-L4 hierarchy change alerts

CREATE TABLE IF NOT EXISTS smart_alert_preferences (
  user_id       UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  markets       TEXT NOT NULL DEFAULT '["crypto","stocks","bonds","metals","bist"]',
  min_severity  VARCHAR(10) NOT NULL DEFAULT 'WARNING',
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_alert_prefs_enabled ON smart_alert_preferences(enabled) WHERE enabled = true;
