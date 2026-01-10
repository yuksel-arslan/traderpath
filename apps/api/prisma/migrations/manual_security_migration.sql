-- TradePath Security Migration
-- Run this SQL manually if Prisma migration is not available
-- Created: 2024

-- Add Email Verification fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3);

-- Add Password Reset fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP(3);

-- Add Two-Factor Authentication (2FA) fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_backup_codes" TEXT[] DEFAULT '{}';

-- Add Account Security & Lockout fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_locked" BOOLEAN DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_locked_until" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login_attempts" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_ip" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);

-- Create LoginEventType enum
DO $$ BEGIN
    CREATE TYPE "LoginEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'SUSPICIOUS_ACTIVITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create LoginAuditLog table
CREATE TABLE IF NOT EXISTS "login_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "event_type" "LoginEventType" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "location" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create TokenBlacklist table
CREATE TABLE IF NOT EXISTS "token_blacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token_blacklist.token
CREATE UNIQUE INDEX IF NOT EXISTS "token_blacklist_token_key" ON "token_blacklist"("token");

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "login_audit_logs_user_id_idx" ON "login_audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "login_audit_logs_email_idx" ON "login_audit_logs"("email");
CREATE INDEX IF NOT EXISTS "login_audit_logs_created_at_idx" ON "login_audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "login_audit_logs_event_type_idx" ON "login_audit_logs"("event_type");
CREATE INDEX IF NOT EXISTS "token_blacklist_user_id_idx" ON "token_blacklist"("user_id");
CREATE INDEX IF NOT EXISTS "token_blacklist_expires_at_idx" ON "token_blacklist"("expires_at");

-- Add foreign key constraints
ALTER TABLE "login_audit_logs"
    ADD CONSTRAINT "login_audit_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "token_blacklist"
    ADD CONSTRAINT "token_blacklist_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Set existing users as email verified if they have logged in before
UPDATE "users" SET "email_verified" = true WHERE "email_verified" IS NULL;

COMMENT ON TABLE "login_audit_logs" IS 'Stores security audit logs for login events and account changes';
COMMENT ON TABLE "token_blacklist" IS 'Stores revoked/blacklisted JWT tokens for secure logout';
