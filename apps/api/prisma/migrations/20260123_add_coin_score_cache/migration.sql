-- CreateTable: CoinScoreCache
-- This table stores pre-computed analysis scores for top coins
-- Updated periodically (every 2-4 hours) by cron job
-- Used for "Top coins by reliability/score" queries

CREATE TABLE IF NOT EXISTS "coin_score_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbol" VARCHAR(20) NOT NULL,

    -- Analysis scores
    "total_score" DECIMAL(4,1) NOT NULL,
    "reliability_score" DECIMAL(4,1) NOT NULL,

    -- Score components
    "liquidity_score" DECIMAL(4,1) NOT NULL,
    "volatility_score" DECIMAL(4,1) NOT NULL,
    "trend_score" DECIMAL(4,1) NOT NULL,
    "momentum_score" DECIMAL(4,1) NOT NULL,

    -- Verdict info
    "verdict" VARCHAR(20) NOT NULL,
    "direction" VARCHAR(10),
    "confidence" DECIMAL(3,1) NOT NULL,

    -- Market data snapshot
    "price" DECIMAL(20,8) NOT NULL,
    "price_change_24h" DECIMAL(6,2) NOT NULL,
    "volume_24h" DECIMAL(20,2) NOT NULL,
    "market_cap" DECIMAL(20,2) NOT NULL,

    -- Analysis reference
    "analysis_id" UUID,
    "interval" VARCHAR(10) NOT NULL DEFAULT '4h',

    -- Timestamps
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_score_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_score_cache_symbol_key" ON "coin_score_cache"("symbol");
CREATE INDEX "coin_score_cache_reliability_score_idx" ON "coin_score_cache"("reliability_score" DESC);
CREATE INDEX "coin_score_cache_total_score_idx" ON "coin_score_cache"("total_score" DESC);
CREATE INDEX "coin_score_cache_verdict_idx" ON "coin_score_cache"("verdict");
CREATE INDEX "coin_score_cache_scanned_at_idx" ON "coin_score_cache"("scanned_at");
