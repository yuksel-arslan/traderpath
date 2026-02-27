-- Add take_profit_3 and interval columns to signals table
-- TP3 is an optional third take-profit level
-- Interval stores the analysis timeframe (5m, 15m, 30m, 1h, 4h, 1d, 1W)

ALTER TABLE signals
ADD COLUMN IF NOT EXISTS take_profit_3 DECIMAL(20, 8);

ALTER TABLE signals
ADD COLUMN IF NOT EXISTS interval VARCHAR(10);
