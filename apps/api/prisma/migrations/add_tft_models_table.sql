-- TFT Models Table Migration
-- Creates the tft_models table for storing trained TFT prediction models

-- Create TFTModelStatus enum
DO $$ BEGIN
    CREATE TYPE "TFTModelStatus" AS ENUM ('TRAINING', 'READY', 'ACTIVE', 'ARCHIVED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tft_models table
CREATE TABLE IF NOT EXISTS "tft_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "trade_type" VARCHAR(20) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "checksum" VARCHAR(64),
    "symbols" TEXT[] NOT NULL DEFAULT '{}',
    "epochs" INTEGER NOT NULL DEFAULT 50,
    "batch_size" INTEGER NOT NULL DEFAULT 64,
    "data_interval" VARCHAR(10) NOT NULL DEFAULT '1h',
    "lookback_days" INTEGER NOT NULL DEFAULT 365,
    "validation_loss" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "mape" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "training_samples" INTEGER NOT NULL DEFAULT 0,
    "training_time" INTEGER NOT NULL DEFAULT 0,
    "hyperparameters" JSONB NOT NULL DEFAULT '{}',
    "status" "TFTModelStatus" NOT NULL DEFAULT 'READY',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(500),
    "trained_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),

    CONSTRAINT "tft_models_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "tft_models_trade_type_is_active_idx" ON "tft_models"("trade_type", "is_active");
CREATE INDEX IF NOT EXISTS "tft_models_status_idx" ON "tft_models"("status");
CREATE INDEX IF NOT EXISTS "tft_models_created_at_idx" ON "tft_models"("created_at" DESC);

-- Add comment
COMMENT ON TABLE "tft_models" IS 'Stores trained TFT (Temporal Fusion Transformer) prediction models for different trade types';
