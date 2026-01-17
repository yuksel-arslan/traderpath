-- Add social notification columns to users table
-- These columns were added to Prisma schema but never migrated

-- Telegram Chat ID for Telegram notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- Discord Webhook URL for Discord notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_webhook_url VARCHAR(500);

-- Twitter Handle for Twitter notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(50);

-- Report validity periods (number of periods before report expires)
ALTER TABLE users ADD COLUMN IF NOT EXISTS report_validity_periods INT DEFAULT 50;
