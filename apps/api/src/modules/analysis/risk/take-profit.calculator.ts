/**
 * TakeProfitCalculator (TASK 2.3)
 *
 * Extracts TP logic from analysis.engine.ts lines 4753-4773 and
 * 5730-5862 into a pure, testable module.
 *
 * Algorithm:
 *  TP1 (60% allocation):
 *    → Use nearest S/R level if it gives ≥ 1.0R, else fall back to 2R
 *  TP2 (40% allocation):
 *    → Use further S/R level if it's beyond TP1, else fall back to 3R
 *    → Ensure TP2 ≥ TP1 + 0.5 ATR separation
 *  Caps:
 *    → Each TP capped at tradeStyle maxTpPercent from entry
 */

import type {
  TakeProfitInput,
  TakeProfitResult,
  TakeProfitLevel,
} from './risk-engine.interface';
import { TRADE_STYLE_LIMITS, MIN_TP_RR } from './risk-engine.interface';

// TP allocation percentages (must sum to 100)
const TP1_ALLOCATION = 60;
const TP2_ALLOCATION = 40;

export function calculateTakeProfits(input: TakeProfitInput): TakeProfitResult {
  const {
    direction,
    entryPrice,
    riskAmount,
    atr,
    resistanceLevels = [],
    supportLevels    = [],
    tradeStyle,
    maxTpPercent,
  } = input;

  const limits  = TRADE_STYLE_LIMITS[tradeStyle];
  const maxPct  = maxTpPercent ?? limits.maxTpPercent;
  const maxDist = entryPrice * (maxPct / 100);

  // Safe risk amount — never zero
  const risk = riskAmount > 0 ? riskAmount : entryPrice * 0.015;

  // Choose the right S/R arrays per direction
  const above = resistanceLevels
    .filter(p => p > entryPrice)
    .sort((a, b) => a - b); // nearest first

  const below = supportLevels
    .filter(p => p < entryPrice)
    .sort((a, b) => b - a); // nearest first

  const targetLevels = direction === 'long' ? above : below;

  // ── TP1 ────────────────────────────────────────────────────────────
  let tp1Price: number;
  const tp1Level = targetLevels[0];

  if (tp1Level) {
    const rrAtLevel = Math.abs(tp1Level - entryPrice) / risk;
    tp1Price = rrAtLevel >= MIN_TP_RR ? tp1Level : rawTpPrice(direction, entryPrice, risk, 2);
  } else {
    tp1Price = rawTpPrice(direction, entryPrice, risk, 2);
  }

  // ── TP2 ────────────────────────────────────────────────────────────
  let tp2Price: number;
  const tp2Level = targetLevels[1];

  if (tp2Level) {
    const beyondTp1 = direction === 'long' ? tp2Level > tp1Price : tp2Level < tp1Price;
    tp2Price = beyondTp1 ? tp2Level : rawTpPrice(direction, entryPrice, risk, 3);
  } else {
    tp2Price = rawTpPrice(direction, entryPrice, risk, 3);
  }

  // Enforce minimum separation between TP1 and TP2
  const minSep = atr * 0.5;
  if (direction === 'long') {
    if (tp2Price < tp1Price + minSep) tp2Price = tp1Price + minSep;
  } else {
    if (tp2Price > tp1Price - minSep) tp2Price = tp1Price - minSep;
  }

  // ── Cap both TPs at maxTpPercent from entry ────────────────────────
  tp1Price = capTp(direction, entryPrice, tp1Price, maxDist);
  tp2Price = capTp(direction, entryPrice, tp2Price, maxDist);

  // ── Build result ───────────────────────────────────────────────────
  const levels: TakeProfitLevel[] = [
    {
      price:      parseFloat(tp1Price.toFixed(8)),
      riskReward: parseFloat((Math.abs(tp1Price - entryPrice) / risk).toFixed(2)),
      allocation: TP1_ALLOCATION,
    },
    {
      price:      parseFloat(tp2Price.toFixed(8)),
      riskReward: parseFloat((Math.abs(tp2Price - entryPrice) / risk).toFixed(2)),
      allocation: TP2_ALLOCATION,
    },
  ];

  const averageRR = parseFloat(
    levels.reduce((sum, tp) => sum + tp.riskReward * (tp.allocation / 100), 0).toFixed(2)
  );

  return { levels, averageRR };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rawTpPrice(dir: 'long' | 'short', entry: number, risk: number, rr: number): number {
  return dir === 'long' ? entry + risk * rr : entry - risk * rr;
}

function capTp(dir: 'long' | 'short', entry: number, tp: number, maxDist: number): number {
  const dist = Math.abs(tp - entry);
  if (dist <= maxDist) return tp;
  return dir === 'long' ? entry + maxDist : entry - maxDist;
}
