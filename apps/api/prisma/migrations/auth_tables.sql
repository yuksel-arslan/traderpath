-- Auth.js tables migration
-- Run this in Neon console or via psql

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create accounts table for OAuth
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255),
  UNIQUE(provider, provider_account_id)
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,
  UNIQUE(identifier, token)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- Create admin user with password 'Admin123!'
-- Password hash for 'Admin123!' using bcrypt (cost 10)
INSERT INTO users (id, email, password_hash, name, is_admin, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'contact@yukselarslan.com',
  '$2a$10$rQnLzN5C.L3dn1kl.Kl5eu5ZYM5JxgxZxfqoqV0qLxTqP5ZpC5L5e',
  'Admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  is_admin = true,
  password_hash = '$2a$10$rQnLzN5C.L3dn1kl.Kl5eu5ZYM5JxgxZxfqoqV0qLxTqP5ZpC5L5e';

-- Create credit balance for admin if not exists
INSERT INTO credit_balances (user_id, balance, daily_free_remaining, daily_reset_at, lifetime_earned, lifetime_spent, lifetime_purchased, updated_at)
SELECT id, 10000, 5, NOW(), 10000, 0, 0, NOW()
FROM users WHERE email = 'contact@yukselarslan.com'
ON CONFLICT (user_id) DO NOTHING;
