/**
 * WinRateEstimator (TASK 2.3)
 *
 * Extracts win-rate estimation from analysis.engine.ts lines 4786-4792
 * and 5893-5899 into a pure, testable module.
 *
 * Base: 50%
 * Adjustments:
 *   trend strength >= 80 → +15%  (>= 70 → +10%)
 *   direction aligns with trend → +10%
 *   confidence >= 70 → +10%
 *   safetyScore (low risk) → +5%
 *   timing.tradeNow → +5%
 *   riskReward >= 2 → +5%
 * Clamp: 35% – 75%
 */

import type { WinRateInput } from './risk-engine.interface';

const BASE_WIN_RATE = 50;
const MIN_WIN_RATE  = 35;
const MAX_WIN_RATE  = 75;

export function estimateWinRate(input: WinRateInput): number {
  const {
    direction,
    trendDirection,
    trendStrength,
    confidence,
    safetyScore,
    tradeNow,
    riskReward,
  } = input;

  let winRate = BASE_WIN_RATE;

  // Trend strength
  if (trendStrength >= 80) winRate += 15;
  else if (trendStrength >= 70) winRate += 10;
  else if (trendStrength >= 60) winRate += 5;

  // Direction alignment with trend
  const isBullishTrend = trendDirection === 'bullish' || trendDirection === 'up';
  const isBearishTrend = trendDirection === 'bearish' || trendDirection === 'down';
  if ((direction === 'long' && isBullishTrend) || (direction === 'short' && isBearishTrend)) {
    winRate += 10;
  }

  // Analysis confidence
  if (confidence >= 70) winRate += 10;
  else if (confidence >= 50) winRate += 5;

  // Safety / risk quality
  if (safetyScore >= 8) winRate += 5;
  else if (safetyScore < 5) winRate -= 5;

  // Timing alignment
  if (tradeNow) winRate += 5;

  // R:R quality bonus (higher R:R attracts better setups)
  if (riskReward >= 2) winRate += 5;

  return parseFloat(
    Math.max(MIN_WIN_RATE, Math.min(MAX_WIN_RATE, winRate)).toFixed(1)
  );
}
