-- Add free trial fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "free_trial_used" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "free_trial_started_at" TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "free_trial_analyses_used" INTEGER DEFAULT 0;
