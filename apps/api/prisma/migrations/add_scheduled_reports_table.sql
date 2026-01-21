-- Create ScheduleFrequency enum if not exists
DO $$ BEGIN
    CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ScheduledReport table if not exists
CREATE TABLE IF NOT EXISTS "scheduled_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL DEFAULT '4h',
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'DAILY',
    "deliver_email" BOOLEAN NOT NULL DEFAULT true,
    "deliver_telegram" BOOLEAN NOT NULL DEFAULT false,
    "deliver_discord" BOOLEAN NOT NULL DEFAULT false,
    "schedule_hour" INTEGER NOT NULL DEFAULT 8,
    "schedule_day_of_week" INTEGER,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint if not exists
DO $$ BEGIN
    ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add interval column if table exists but column doesn't
DO $$ BEGIN
    ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "interval" VARCHAR(10) NOT NULL DEFAULT '4h';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "scheduled_reports_user_id_idx" ON "scheduled_reports"("user_id");
CREATE INDEX IF NOT EXISTS "scheduled_reports_is_active_idx" ON "scheduled_reports"("is_active");
CREATE INDEX IF NOT EXISTS "scheduled_reports_next_run_at_idx" ON "scheduled_reports"("next_run_at");
