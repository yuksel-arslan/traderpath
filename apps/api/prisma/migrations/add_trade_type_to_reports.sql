-- Add trade_type column to reports table
-- Run this in Neon console or via psql

-- Add trade_type column
ALTER TABLE reports ADD COLUMN IF NOT EXISTS trade_type VARCHAR(20);

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS reports_trade_type_idx ON reports(trade_type);

-- Backfill existing reports from reportData JSON (optional)
-- This extracts tradeType from the report_data JSON if it exists
UPDATE reports
SET trade_type = report_data->>'tradeType'
WHERE trade_type IS NULL
  AND report_data->>'tradeType' IS NOT NULL;
