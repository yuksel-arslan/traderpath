-- =============================================
-- Comprehensive migration: Ensure all User model columns exist
-- Date: 2026-02-07
-- Purpose: Fix P2022 errors caused by missing columns in production
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =============================================

-- Email Verification
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verification_token') THEN
    ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verification_expires') THEN
    ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP;
  END IF;
END $$;

-- Password Reset
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_reset_token') THEN
    ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_reset_expires') THEN
    ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;
  END IF;
END $$;

-- Two-Factor Authentication
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_enabled') THEN
    ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_secret') THEN
    ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_backup_codes') THEN
    ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Account Security & Lockout
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='account_locked') THEN
    ALTER TABLE users ADD COLUMN account_locked BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='account_locked_until') THEN
    ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='login_attempts') THEN
    ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_ip') THEN
    ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_device') THEN
    ALTER TABLE users ADD COLUMN last_login_device VARCHAR(500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_location') THEN
    ALTER TABLE users ADD COLUMN last_login_location VARCHAR(255);
  END IF;
END $$;

-- First Login & Registration Tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='registration_email') THEN
    ALTER TABLE users ADD COLUMN registration_email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_login_bonus_received') THEN
    ALTER TABLE users ADD COLUMN first_login_bonus_received BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Gamification
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='level') THEN
    ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='xp') THEN
    ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='streak_days') THEN
    ALTER TABLE users ADD COLUMN streak_days INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='streak_last_date') THEN
    ALTER TABLE users ADD COLUMN streak_last_date DATE;
  END IF;
END $$;

-- Settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferred_coins') THEN
    ALTER TABLE users ADD COLUMN preferred_coins TEXT[] DEFAULT '{"BTC","ETH","SOL"}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='notification_settings') THEN
    ALTER TABLE users ADD COLUMN notification_settings JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='report_validity_periods') THEN
    ALTER TABLE users ADD COLUMN report_validity_periods INTEGER DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferred_interface') THEN
    ALTER TABLE users ADD COLUMN preferred_interface VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferred_language') THEN
    ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';
  END IF;
END $$;

-- Social Notification Settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='telegram_chat_id') THEN
    ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='discord_webhook_url') THEN
    ALTER TABLE users ADD COLUMN discord_webhook_url VARCHAR(500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='twitter_handle') THEN
    ALTER TABLE users ADD COLUMN twitter_handle VARCHAR(50);
  END IF;
END $$;

-- Referral
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referral_code') THEN
    ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referred_by_id') THEN
    ALTER TABLE users ADD COLUMN referred_by_id UUID;
  END IF;
END $$;

-- Timestamps
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
  END IF;
END $$;

-- Admin flag
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Google ID
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
    ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
  END IF;
END $$;

-- =============================================
-- Verify all columns exist
-- =============================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
