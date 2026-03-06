-- Add triggered_price column to price_alerts table
ALTER TABLE "price_alerts" ADD COLUMN IF NOT EXISTS "triggered_price" DOUBLE PRECISION;
