-- Migration: Add Capital Flow and AI Concierge credit cost columns
-- Date: 2026-02-03

-- Add Capital Flow L3+L4 combined cost column
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_capital_flow_l3_l4 INT DEFAULT 5;

-- Add AI Concierge cost column
ALTER TABLE cost_settings
ADD COLUMN IF NOT EXISTS credit_cost_ai_concierge INT DEFAULT 5;

-- Update default values for existing columns to match new pricing
-- Asset Analysis: 10 credits (was 25)
UPDATE cost_settings SET credit_cost_full_analysis = 10 WHERE id = 'default' AND credit_cost_full_analysis = 25;

-- MLIS Pro Analysis: 10 credits (was 35)
UPDATE cost_settings SET credit_cost_mlis_pro_analysis = 10 WHERE id = 'default' AND credit_cost_mlis_pro_analysis = 35;

-- AI Expert: 5 credits (was 10)
UPDATE cost_settings SET credit_cost_ai_expert = 5 WHERE id = 'default' AND credit_cost_ai_expert = 10;
