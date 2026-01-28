-- Add method column to analyses table
-- Values: 'classic' (7-step analysis) or 'mlis_pro' (Multi-Layer Intelligence System)
ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "method" VARCHAR(20) DEFAULT 'classic';
