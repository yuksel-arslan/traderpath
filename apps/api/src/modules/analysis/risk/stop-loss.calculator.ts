/**
 * StopLossCalculator (TASK 2.3)
 *
 * Extracts stop-loss logic from analysis.engine.ts lines 4733-4751 and
 * 5668-5725 into a pure, testable module.
 *
 * Algorithm:
 *  1. ATR method:   stopDistance = atr * 2
 *  2. Level method: SL placed 1 ATR below nearest support (LONG)
 *                              or 1 ATR above nearest resistance (SHORT)
 *  3. Trap-zone:    If a stop-hunt zone exists, SL placed 0.5 ATR beyond it
 *  4. Final SL:     max of ATR and level distances, then clamped to [min, max]
 */

import type {
  StopLossInput,
  StopLossResult,
} from './risk-engine.interface';
import { TRADE_STYLE_LIMITS, MIN_SL_PERCENT } from './risk-engine.interface';

export function calculateStopLoss(input: StopLossInput): StopLossResult {
  const {
    direction,
    entryPrice,
    atr,
    supportLevel,
    resistanceLevel,
    nearestStopHunt,
    tradeStyle,
    maxSlPercent,
  } = input;

  const limits  = TRADE_STYLE_LIMITS[tradeStyle];
  const maxPct  = maxSlPercent ?? limits.maxSlPercent;
  const maxDist = entryPrice * (maxPct / 100);
  const minDist = entryPrice * (MIN_SL_PERCENT / 100);

  // ── Method 1: ATR-based ──────────────────────────────────────────
  const atrDistance = atr * 2;

  // ── Method 2: Level-based ────────────────────────────────────────
  let levelDistance = 0;
  let usedLevel     = false;

  if (direction === 'long' && supportLevel) {
    levelDistance = Math.abs(entryPrice - (supportLevel - atr));
    usedLevel     = true;
  } else if (direction === 'short' && resistanceLevel) {
    levelDistance = Math.abs(entryPrice - (resistanceLevel + atr));
    usedLevel     = true;
  }

  // ── Method 3: Trap-zone adjustment ───────────────────────────────
  let trapDistance  = 0;
  const hasTrapZone = Boolean(nearestStopHunt);
  if (hasTrapZone && nearestStopHunt !== undefined) {
    trapDistance = Math.abs(entryPrice - (
      direction === 'long'
        ? nearestStopHunt - atr * 0.5
        : nearestStopHunt + atr * 0.5
    ));
  }

  // ── Choose widest valid distance ─────────────────────────────────
  const candidates = [atrDistance, levelDistance, trapDistance].filter(d => d > 0);
  const rawDistance = Math.max(...candidates, minDist);

  // ── Clamp to [minDist, maxDist] ───────────────────────────────────
  const finalDistance = Math.max(minDist, Math.min(maxDist, rawDistance));

  const price = direction === 'long'
    ? entryPrice - finalDistance
    : entryPrice + finalDistance;

  const percentage = parseFloat((finalDistance / entryPrice * 100).toFixed(2));

  const method: StopLossResult['method'] =
    hasTrapZone && trapDistance === rawDistance ? 'trap_zone' :
    usedLevel && levelDistance >= atrDistance   ? 'level'     : 'atr';

  return { price: parseFloat(price.toFixed(8)), percentage, method };
}
