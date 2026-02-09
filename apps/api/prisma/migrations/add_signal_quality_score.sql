-- Add signal quality score columns to signals table
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "quality_score" INTEGER;
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "quality_data" JSONB;

-- Index on quality_score for filtering
CREATE INDEX IF NOT EXISTS "signals_quality_score_idx" ON "signals" ("quality_score");
