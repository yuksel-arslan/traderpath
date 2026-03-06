-- Migration: Add missing MLIS Pro Analysis columns to cost_settings
-- Date: 2026-02-28
-- Issue: Production error - The column `cost_settings.credit_cost_mlis_pro_analysis` does not exist
-- These columns are defined in the Prisma schema but were never added to the database

-- Add MLIS Pro Analysis bundle cost
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_pro_analysis INTEGER NOT NULL DEFAULT 10;

-- Add MLIS Technical Layer cost
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_technical_layer INTEGER NOT NULL DEFAULT 2;

-- Add MLIS Momentum Layer cost
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_momentum_layer INTEGER NOT NULL DEFAULT 2;

-- Add MLIS Volatility Layer cost
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_volatility_layer INTEGER NOT NULL DEFAULT 2;

-- Add MLIS Volume Layer cost
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_volume_layer INTEGER NOT NULL DEFAULT 2;

-- Add MLIS Verdict Layer cost
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_verdict_layer INTEGER NOT NULL DEFAULT 2;
