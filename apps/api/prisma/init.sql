-- TradePath Database Schema
-- Generated from Prisma schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'REWARD', 'SPEND', 'REFUND', 'REFERRAL', 'BONUS');
CREATE TYPE "AchievementCategory" AS ENUM ('ANALYSIS', 'WHALE', 'TRADING', 'SOCIAL', 'EDUCATION', 'STREAK');
CREATE TYPE "RequirementType" AS ENUM ('COUNT', 'STREAK', 'PERCENTAGE', 'SINGLE');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REGISTERED', 'FIRST_ANALYSIS', 'FIRST_PURCHASE');
CREATE TYPE "AlertDirection" AS ENUM ('ABOVE', 'BELOW');
CREATE TYPE "AlertType" AS ENUM ('ENTRY', 'TP1', 'TP2', 'TP3', 'SL', 'CUSTOM');
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "QuizCategory" AS ENUM ('TECHNICAL_ANALYSIS', 'WHALE_BEHAVIOR', 'RISK_MANAGEMENT', 'MARKET_STRUCTURE', 'MANIPULATION', 'PSYCHOLOGY');

-- Users table
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "name" VARCHAR(100) NOT NULL,
    "avatar_url" TEXT,
    "google_id" VARCHAR(255),
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "streak_last_date" DATE,
    "preferred_coins" TEXT[] DEFAULT ARRAY['BTC', 'ETH', 'SOL'],
    "notification_settings" JSONB NOT NULL DEFAULT '{}',
    "report_validity_periods" INTEGER NOT NULL DEFAULT 50,
    "referral_code" VARCHAR(20),
    "referred_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- Credit Balances
CREATE TABLE "credit_balances" (
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 25,
    "daily_free_remaining" INTEGER NOT NULL DEFAULT 5,
    "daily_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lifetime_earned" INTEGER NOT NULL DEFAULT 25,
    "lifetime_spent" INTEGER NOT NULL DEFAULT 0,
    "lifetime_purchased" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("user_id")
);

-- Credit Transactions
CREATE TABLE "credit_transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions"("created_at" DESC);

-- Credit Packages
CREATE TABLE "credit_packages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(50) NOT NULL,
    "credits" INTEGER NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "price_usd" DECIMAL(10,2) NOT NULL,
    "price_per_credit" DECIMAL(10,4) NOT NULL,
    "discount_percent" INTEGER NOT NULL DEFAULT 0,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- Achievements
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" "AchievementCategory" NOT NULL,
    "icon" VARCHAR(50),
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "credit_reward" INTEGER NOT NULL DEFAULT 0,
    "requirement_type" "RequirementType" NOT NULL,
    "requirement_value" INTEGER NOT NULL,
    "requirement_metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- User Achievements
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- Daily Rewards
CREATE TABLE "daily_rewards" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "reward_date" DATE NOT NULL,
    "login_claimed" BOOLEAN NOT NULL DEFAULT false,
    "login_credits" INTEGER NOT NULL DEFAULT 0,
    "spin_used" BOOLEAN NOT NULL DEFAULT false,
    "spin_result" INTEGER NOT NULL DEFAULT 0,
    "quiz_completed" BOOLEAN NOT NULL DEFAULT false,
    "quiz_correct" BOOLEAN NOT NULL DEFAULT false,
    "quiz_credits" INTEGER NOT NULL DEFAULT 0,
    "ads_watched" INTEGER NOT NULL DEFAULT 0,
    "ads_credits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_rewards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "daily_rewards_user_id_reward_date_key" ON "daily_rewards"("user_id", "reward_date");
CREATE INDEX "daily_rewards_user_id_reward_date_idx" ON "daily_rewards"("user_id", "reward_date");

-- Referrals
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referrer_credits_earned" INTEGER NOT NULL DEFAULT 0,
    "referred_credits_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referrals_referred_id_key" ON "referrals"("referred_id");
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- Analyses
CREATE TABLE "analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL DEFAULT '4h',
    "steps_completed" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "step_1_result" JSONB,
    "step_2_result" JSONB,
    "step_3_result" JSONB,
    "step_4_result" JSONB,
    "step_5_result" JSONB,
    "step_6_result" JSONB,
    "step_7_result" JSONB,
    "total_score" DECIMAL(3,1),
    "credits_spent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "analyses_user_id_idx" ON "analyses"("user_id");
CREATE INDEX "analyses_symbol_idx" ON "analyses"("symbol");

-- Price Alerts
CREATE TABLE "price_alerts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "target_price" DECIMAL(20,8) NOT NULL,
    "direction" "AlertDirection" NOT NULL,
    "alert_type" "AlertType" NOT NULL DEFAULT 'CUSTOM',
    "report_id" UUID,
    "note" VARCHAR(255),
    "channels" JSONB NOT NULL DEFAULT '["browser"]',
    "is_triggered" BOOLEAN NOT NULL DEFAULT false,
    "triggered_at" TIMESTAMP(3),
    "credits_spent" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "price_alerts_user_id_is_active_idx" ON "price_alerts"("user_id", "is_active");
CREATE INDEX "price_alerts_symbol_is_active_is_triggered_idx" ON "price_alerts"("symbol", "is_active", "is_triggered");

-- Scheduled Reports
CREATE TABLE "scheduled_reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'DAILY',
    "deliver_email" BOOLEAN NOT NULL DEFAULT true,
    "deliver_telegram" BOOLEAN NOT NULL DEFAULT false,
    "deliver_discord" BOOLEAN NOT NULL DEFAULT false,
    "schedule_hour" INTEGER NOT NULL DEFAULT 8,
    "schedule_day_of_week" INTEGER,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scheduled_reports_user_id_is_active_idx" ON "scheduled_reports"("user_id", "is_active");
CREATE INDEX "scheduled_reports_next_run_at_is_active_idx" ON "scheduled_reports"("next_run_at", "is_active");

-- Quizzes
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT,
    "category" "QuizCategory" NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- Quiz Answers
CREATE TABLE "quiz_answers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "answer_index" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "credits_earned" INTEGER NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- Reports
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "analysis_id" UUID,
    "symbol" VARCHAR(20) NOT NULL,
    "report_data" JSONB NOT NULL,
    "ai_expert_comment" TEXT,
    "verdict" VARCHAR(50) NOT NULL,
    "score" DECIMAL(3,1) NOT NULL,
    "direction" VARCHAR(10),
    "entry_price" DECIMAL(20,8),
    "outcome" VARCHAR(20),
    "outcome_calculated_at" TIMESTAMP(3),
    "outcome_price" DECIMAL(20,8),
    "outcome_price_change" DECIMAL(10,4),
    "step_outcomes" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");
CREATE INDEX "reports_symbol_idx" ON "reports"("symbol");
CREATE INDEX "reports_generated_at_idx" ON "reports"("generated_at" DESC);
CREATE INDEX "reports_expires_at_idx" ON "reports"("expires_at");
CREATE INDEX "reports_outcome_idx" ON "reports"("outcome");
CREATE INDEX "reports_is_public_idx" ON "reports"("is_public");

-- Market Data
CREATE TABLE "market_data" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "symbol" VARCHAR(20) NOT NULL,
    "data_type" VARCHAR(50) NOT NULL,
    "interval" VARCHAR(10),
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "market_data_symbol_data_type_idx" ON "market_data"("symbol", "data_type");

-- API Cost Logs
CREATE TABLE "api_cost_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "service" VARCHAR(50) NOT NULL,
    "operation" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(10,6) NOT NULL,
    "user_id" UUID,
    "symbol" VARCHAR(20),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_cost_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "api_cost_logs_service_idx" ON "api_cost_logs"("service");
CREATE INDEX "api_cost_logs_operation_idx" ON "api_cost_logs"("operation");
CREATE INDEX "api_cost_logs_created_at_idx" ON "api_cost_logs"("created_at" DESC);
CREATE INDEX "api_cost_logs_user_id_idx" ON "api_cost_logs"("user_id");

-- Cost Settings
CREATE TABLE "cost_settings" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "gemini_input_cost_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 0.075,
    "gemini_output_cost_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 0.30,
    "binance_cost_per_request" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "coingecko_cost_per_request" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "server_cost_per_analysis" DECIMAL(10,6) NOT NULL DEFAULT 0.001,
    "database_cost_per_query" DECIMAL(10,6) NOT NULL DEFAULT 0.00001,
    "target_profit_margin" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "credit_price_usd" DECIMAL(10,4) NOT NULL DEFAULT 0.10,
    "min_credit_price_usd" DECIMAL(10,4) NOT NULL DEFAULT 0.05,
    "max_credit_price_usd" DECIMAL(10,4) NOT NULL DEFAULT 0.50,
    "auto_pricing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_pricing_interval" INTEGER NOT NULL DEFAULT 24,
    "last_price_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cost_settings_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_rewards" ADD CONSTRAINT "daily_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default cost settings
INSERT INTO "cost_settings" ("id") VALUES ('default') ON CONFLICT DO NOTHING;
