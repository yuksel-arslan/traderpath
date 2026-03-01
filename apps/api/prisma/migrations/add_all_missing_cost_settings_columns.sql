-- Migration: Add ALL missing columns to cost_settings table
-- Date: 2026-03-01
-- Issue: Production error - credit_cost_capital_flow_l3_l4 column not found
-- This comprehensive migration ensures ALL schema-defined columns exist in the database
-- Uses IF NOT EXISTS to be safe for re-running

-- =============================================
-- MLIS Pro Analysis columns (5-Layer Neural Network)
-- =============================================
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_pro_analysis INTEGER NOT NULL DEFAULT 10;

ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_technical_layer INTEGER NOT NULL DEFAULT 2;

ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_momentum_layer INTEGER NOT NULL DEFAULT 2;

ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_volatility_layer INTEGER NOT NULL DEFAULT 2;

ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_volume_layer INTEGER NOT NULL DEFAULT 2;

ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_mlis_verdict_layer INTEGER NOT NULL DEFAULT 2;

-- =============================================
-- Capital Flow column
-- =============================================
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_capital_flow_l3_l4 INTEGER NOT NULL DEFAULT 5;

-- =============================================
-- AI Concierge column
-- =============================================
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_ai_concierge INTEGER NOT NULL DEFAULT 5;

-- =============================================
-- Credit Economy column
-- =============================================
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_analysis_purchase INTEGER NOT NULL DEFAULT 15;

-- =============================================
-- Verify all columns exist
-- =============================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'cost_settings'
AND column_name IN (
    'credit_cost_mlis_pro_analysis',
    'credit_cost_mlis_technical_layer',
    'credit_cost_mlis_momentum_layer',
    'credit_cost_mlis_volatility_layer',
    'credit_cost_mlis_volume_layer',
    'credit_cost_mlis_verdict_layer',
    'credit_cost_capital_flow_l3_l4',
    'credit_cost_ai_concierge',
    'credit_cost_analysis_purchase'
)
ORDER BY column_name;
