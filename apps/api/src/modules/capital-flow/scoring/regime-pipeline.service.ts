/**
 * Real-Time Regime Scoring Pipeline
 *
 * Periodically computes the regime score, caches it in Redis,
 * and detects regime transitions (e.g. neutral → risk-off).
 *
 * Integration points:
 *   - Called by capital-flow-refresh.job.ts cron schedule
 *   - Reads from the same GlobalLiquidity + MarketFlow data
 *   - Caches result with 5-minute TTL (aligned to market cache)
 *   - Emits regime change events for downstream consumers
 *
 * Regime change detection:
 *   Compares current regime with previous cached regime.
 *   A change triggers a log + optional webhook/notification.
 */

import { redis } from '../../../core/cache';
import { logger } from '../../../core/logger';
import { getGlobalLiquidity, getAllMarketFlows } from '../capital-flow.service';
import { calculateRegimeScore } from './regime-score.service';
import { calculateGLRS } from './glrs.service';
import type { GLRSHistoricalContext } from './glrs.service';
import type { RegimeScoreResult, LiquidityRegime } from './regime-score.types';

// ============================================================
// Cache keys and TTLs
// ============================================================

const CACHE_KEYS = {
  REGIME_SCORE: 'regime-score:current',
  REGIME_HISTORY: 'regime-score:history',       // Last 100 scores (list)
  REGIME_LAST_CHANGE: 'regime-score:last-change',
  GLRS_HISTORY_CONTEXT: 'regime-score:glrs-history',
};

const CACHE_TTL = {
  CURRENT: 300,          // 5 minutes
  HISTORY_CONTEXT: 3600, // 1 hour (rolling window of changes)
};

const MAX_HISTORY_LENGTH = 200; // Keep last 200 GLRS scores for z-score computation

// ============================================================
// Regime change detection
// ============================================================

interface RegimeChange {
  previousRegime: LiquidityRegime;
  currentRegime: LiquidityRegime;
  previousScore: number;
  currentScore: number;
  timestamp: string;
  direction: 'improving' | 'deteriorating';
}

const REGIME_ORDER: LiquidityRegime[] = [
  'liquidity_stress',
  'risk_off',
  'neutral',
  'mild_risk_on',
  'strong_risk_on',
];

function detectRegimeChange(
  previous: RegimeScoreResult | null,
  current: RegimeScoreResult,
): RegimeChange | null {
  if (!previous) return null;

  const prevRegime = previous.glrs.regime;
  const currRegime = current.glrs.regime;

  if (prevRegime === currRegime) return null;

  const prevOrder = REGIME_ORDER.indexOf(prevRegime);
  const currOrder = REGIME_ORDER.indexOf(currRegime);

  return {
    previousRegime: prevRegime,
    currentRegime: currRegime,
    previousScore: previous.glrs.score,
    currentScore: current.glrs.score,
    timestamp: new Date().toISOString(),
    direction: currOrder > prevOrder ? 'improving' : 'deteriorating',
  };
}

// ============================================================
// Historical context management
// ============================================================

/**
 * Read the rolling GLRS component history from Redis.
 * This is used to compute proper z-scores over time.
 */
async function readHistoryContext(): Promise<GLRSHistoricalContext> {
  try {
    const raw = await redis?.get(CACHE_KEYS.GLRS_HISTORY_CONTEXT);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore cache errors
  }
  return {};
}

/**
 * Append current observation to the rolling history context.
 */
async function updateHistoryContext(
  existing: GLRSHistoricalContext,
  currentSnapshot: {
    fedBSChange: number;
    m2YoY: number;
    dxyChange: number;
    vixValue: number;
    yieldCurveSpread: number;
    netLiqChange: number;
    rrpChange: number;
    tgaChange: number;
  },
): Promise<GLRSHistoricalContext> {
  const push = (arr: number[] | undefined, val: number): number[] => {
    const a = arr ? [...arr] : [];
    a.push(val);
    if (a.length > MAX_HISTORY_LENGTH) a.shift();
    return a;
  };

  const updated: GLRSHistoricalContext = {
    fedBSChanges: push(existing.fedBSChanges, currentSnapshot.fedBSChange),
    m2YoYValues: push(existing.m2YoYValues, currentSnapshot.m2YoY),
    dxyChanges: push(existing.dxyChanges, currentSnapshot.dxyChange),
    vixValues: push(existing.vixValues, currentSnapshot.vixValue),
    yieldCurveValues: push(existing.yieldCurveValues, currentSnapshot.yieldCurveSpread),
    netLiquidityChanges: push(existing.netLiquidityChanges, currentSnapshot.netLiqChange),
    rrpChanges: push(existing.rrpChanges, currentSnapshot.rrpChange),
    tgaChanges: push(existing.tgaChanges, currentSnapshot.tgaChange),
  };

  try {
    if (redis) {
      await redis.setex(
        CACHE_KEYS.GLRS_HISTORY_CONTEXT,
        CACHE_TTL.HISTORY_CONTEXT,
        JSON.stringify(updated),
      );
    }
  } catch {
    // Ignore cache errors
  }

  return updated;
}

// ============================================================
// Pipeline execution
// ============================================================

/**
 * Run the regime scoring pipeline.
 *
 * 1. Fetch current GlobalLiquidity + MarketFlows
 * 2. Read historical context from Redis
 * 3. Compute GLRS with real z-scores from history
 * 4. Compute full regime score (FVR, SCI, Lead-Lag)
 * 5. Detect regime change vs previous cached score
 * 6. Cache result + update history
 *
 * @returns The computed RegimeScoreResult + any detected regime change
 */
export async function runRegimePipeline(): Promise<{
  result: RegimeScoreResult;
  change: RegimeChange | null;
}> {
  // Step 1: Fetch live data
  const [globalLiquidity, markets] = await Promise.all([
    getGlobalLiquidity(),
    getAllMarketFlows(),
  ]);

  // Step 2: Read historical context
  const historyContext = await readHistoryContext();

  // Step 3: Compute GLRS with proper historical z-scores
  const glrs = calculateGLRS(globalLiquidity, historyContext);

  // Step 4: Compute full regime score
  const result = calculateRegimeScore(globalLiquidity, markets);
  // Override GLRS with the history-aware version
  (result as { glrs: typeof glrs }).glrs = glrs;
  result.regime.score = glrs.score;
  result.regime.label = glrs.regime;

  // Step 5: Detect regime change
  let previousResult: RegimeScoreResult | null = null;
  try {
    const cached = await redis?.get(CACHE_KEYS.REGIME_SCORE);
    if (cached) previousResult = JSON.parse(cached);
  } catch {
    // Ignore
  }

  const change = detectRegimeChange(previousResult, result);

  if (change) {
    logger.info({
      from: change.previousRegime,
      to: change.currentRegime,
      direction: change.direction,
      scoreChange: `${change.previousScore.toFixed(1)} → ${change.currentScore.toFixed(1)}`,
    }, '[RegimePipeline] Regime change detected');

    try {
      if (redis) {
        await redis.set(CACHE_KEYS.REGIME_LAST_CHANGE, JSON.stringify(change));
      }
    } catch {
      // Ignore
    }
  }

  // Step 6: Cache current result + update history
  try {
    if (redis) {
      await redis.setex(CACHE_KEYS.REGIME_SCORE, CACHE_TTL.CURRENT, JSON.stringify(result));

      // Push to history list (for trend analysis)
      await redis.lpush(
        CACHE_KEYS.REGIME_HISTORY,
        JSON.stringify({ score: glrs.score, regime: glrs.regime, timestamp: new Date().toISOString() }),
      );
      await redis.ltrim(CACHE_KEYS.REGIME_HISTORY, 0, 99);
    }
  } catch {
    // Ignore
  }

  // Update rolling history context for next z-score computation
  await updateHistoryContext(historyContext, {
    fedBSChange: globalLiquidity.fedBalanceSheet.change30d,
    m2YoY: globalLiquidity.m2MoneySupply.yoyGrowth,
    dxyChange: globalLiquidity.dxy.change7d,
    vixValue: globalLiquidity.vix.value,
    yieldCurveSpread: globalLiquidity.yieldCurve.spread10y2y,
    netLiqChange: globalLiquidity.netLiquidity.change30d,
    rrpChange: globalLiquidity.reverseRepo.change30d,
    tgaChange: globalLiquidity.treasuryGeneralAccount.change30d,
  });

  return { result, change };
}

/**
 * Read the cached regime score (for fast endpoint responses).
 * Returns null if cache is empty.
 */
export async function getCachedRegimeScore(): Promise<RegimeScoreResult | null> {
  try {
    const cached = await redis?.get(CACHE_KEYS.REGIME_SCORE);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Read the last regime change event.
 */
export async function getLastRegimeChange(): Promise<RegimeChange | null> {
  try {
    const cached = await redis?.get(CACHE_KEYS.REGIME_LAST_CHANGE);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Read GLRS score history (last 100 entries).
 */
export async function getRegimeHistory(): Promise<Array<{ score: number; regime: string; timestamp: string }>> {
  try {
    const raw = await redis?.lrange(CACHE_KEYS.REGIME_HISTORY, 0, 99);
    if (raw) return raw.map(r => JSON.parse(r));
  } catch {
    // Ignore
  }
  return [];
}
