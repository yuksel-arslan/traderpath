/**
 * PositionSizeCalculator (TASK 2.3)
 *
 * Extracts position-sizing logic from analysis.engine.ts lines 4781-4784
 * and 5871-5891 into a pure, testable module.
 *
 * Base: 2% risk rule — risk exactly 2% of account per trade.
 * Adjustments (each ±0.5%):
 *   safetyScore >= 8   → +0.5%
 *   safetyScore <  5   → -0.5%
 *   confidence >= 80   → +0.5%
 *   confidence <  50   → -0.5%
 *   risk_off regime    → -0.5%
 *   riskLevel critical → -1.0% (hard penalty)
 * Clamp: 1.0% – 3.0%
 *
 * Formula: positionPercent = (riskUSD / stopDistanceUSD) × 100
 *   Where stopDistanceUSD = |entry - stopLoss| × (positionUSD / entry)
 *   Simplified: positionPercent = (riskPercent / stopPercent) × 100
 *   But capped at a maximum so the portfolio exposure stays reasonable.
 */

import type {
  PositionSizeInput,
  PositionSizeResult,
} from './risk-engine.interface';

const BASE_RISK_PERCENT = 2.0;
const MIN_RISK_PERCENT  = 1.0;
const MAX_RISK_PERCENT  = 3.0;

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const {
    entryPrice,
    stopLossPrice,
    accountSize,
    safetyScore,
    confidence,
    marketRegime,
    riskLevel,
  } = input;

  // ── Dynamic risk percentage ─────────────────────────────────────────────
  let riskPercent = BASE_RISK_PERCENT;

  if (safetyScore >= 8)   riskPercent += 0.5;
  else if (safetyScore < 5) riskPercent -= 0.5;

  if (confidence >= 80)   riskPercent += 0.5;
  else if (confidence < 50) riskPercent -= 0.5;

  if (marketRegime === 'risk_off') riskPercent -= 0.5;

  if (riskLevel === 'critical') riskPercent -= 1.0;
  else if (riskLevel === 'high') riskPercent -= 0.5;

  riskPercent = parseFloat(
    Math.max(MIN_RISK_PERCENT, Math.min(MAX_RISK_PERCENT, riskPercent)).toFixed(1)
  );

  // ── Position size formula ───────────────────────────────────────────────
  // stopPercent = |entry - stop| / entry * 100
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const safeStopDistance = stopDistance > 0 ? stopDistance : entryPrice * 0.015;
  const stopPercent  = safeStopDistance / entryPrice * 100;

  // positionPercent = riskPercent / stopPercent * 100
  // (if I risk 2% of account on a 4% stop → position = 50% of account)
  const rawPositionPercent = (riskPercent / stopPercent) * 100;

  // Cap position at 50% of account (avoid over-leveraged positions)
  const positionPercent = parseFloat(Math.min(rawPositionPercent, 50).toFixed(2));
  const positionUsd     = parseFloat((accountSize * positionPercent / 100).toFixed(2));

  return { riskPercent, positionPercent, positionUsd };
}
