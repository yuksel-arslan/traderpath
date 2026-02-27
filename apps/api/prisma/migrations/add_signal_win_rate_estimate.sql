-- Add win_rate_estimate column to signals table
-- Stores the estimated win rate (0-100) from the trade plan analysis

ALTER TABLE signals
ADD COLUMN IF NOT EXISTS win_rate_estimate INTEGER;
