-- Notification Center table
-- Centralized notification management for all automation events

-- Create notification type enum
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('BRIEFING', 'ALERT', 'SIGNAL', 'REWARD', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx" ON "notifications" ("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_user_id_type_idx" ON "notifications" ("user_id", "type");
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications" ("user_id", "created_at" DESC);
