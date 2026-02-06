/**
 * Range / Mean-Reversion Strategy
 *
 * Entry: At support (LONG) or resistance (SHORT) within a range
 * Best when: ADX < 20, price oscillating between clear S/R
 * Asset weights: crypto (0.6), stocks (0.5), metals (0.9), bonds (0.9), bist (0.9)
 */

import { StrategyPlan, ForecastBand } from '../../types';
import { nanoid } from 'nanoid';

export function generateRangePlan(params: {
  symbol: string;
  currentPrice: number;
  atr: number;
  direction: 'long' | 'short';
  supports: number[];
  resistances: number[];
  forecastBand?: ForecastBand;
  adx?: number;
  rsi?: number;
  bbWidth?: number;
}): StrategyPlan {
  const {
    symbol,
    currentPrice,
    atr,
    supports,
    resistances,
    forecastBand,
    adx,
    rsi,
    bbWidth,
  } = params;

  // Range strategy: always buy at support, sell at resistance
  // Direction is determined by where price is relative to the range
  const rangeHigh = resistances[0] || currentPrice * 1.03;
  const rangeLow = supports[0] || currentPrice * 0.97;
  const rangeMid = (rangeHigh + rangeLow) / 2;

  // If price is in lower half of range → long, upper half → short
  const isLong = currentPrice < rangeMid;
  const direction = isLong ? 'long' as const : 'short' as const;

  // ── Entry ────────────────────────────────────────────────────────
  const entryPrice = isLong ? rangeLow : rangeHigh;

  // ── Stop Loss: Just outside the range ────────────────────────────
  const slBuffer = atr * 0.5;
  const stopLoss = isLong ? rangeLow - slBuffer : rangeHigh + slBuffer;

  // ── Take Profits: Opposite side of range ─────────────────────────
  const risk = Math.abs(entryPrice - stopLoss);
  const tp1 = rangeMid; // First target: middle of range
  const tp2 = isLong ? rangeHigh : rangeLow; // Second target: opposite boundary

  // ── Applicability ────────────────────────────────────────────────
  let applicability = 40;
  let reasons: string[] = [];

  // No trend = range environment
  if (adx != null && adx < 20) {
    applicability += 25;
    reasons.push(`No trend (ADX ${adx.toFixed(0)} < 20) — ideal for range`);
  } else if (adx != null && adx > 30) {
    applicability -= 20;
    reasons.push('Strong trend detected — range strategy risky');
  }

  // RSI at extremes within range
  if (rsi != null) {
    if (isLong && rsi < 35) {
      applicability += 15;
      reasons.push(`Oversold RSI (${rsi.toFixed(0)}) at range bottom`);
    } else if (!isLong && rsi > 65) {
      applicability += 15;
      reasons.push(`Overbought RSI (${rsi.toFixed(0)}) at range top`);
    }
  }

  // Clear range structure
  const rangeWidth = (rangeHigh - rangeLow) / currentPrice;
  if (rangeWidth > 0.02 && rangeWidth < 0.10) {
    applicability += 15;
    reasons.push(`Well-defined range (${(rangeWidth * 100).toFixed(1)}% width)`);
  } else if (rangeWidth < 0.01) {
    applicability -= 10;
    reasons.push('Range too narrow');
  } else if (rangeWidth > 0.15) {
    applicability -= 10;
    reasons.push('Range too wide for mean-reversion');
  }

  // BB width low = consolidation
  if (bbWidth != null && bbWidth < 0.04) {
    applicability += 10;
    reasons.push('Low Bollinger Band width confirms consolidation');
  }

  applicability = Math.max(0, Math.min(100, applicability));

  return {
    id: nanoid(),
    type: 'range',
    label: `Range ${isLong ? 'Long' : 'Short'}`,
    description: isLong
      ? `Buy at range bottom ${roundPrice(rangeLow)}, target range top ${roundPrice(rangeHigh)}.`
      : `Sell at range top ${roundPrice(rangeHigh)}, target range bottom ${roundPrice(rangeLow)}.`,
    applicability,
    applicabilityReason: reasons.join('. ') || 'Price oscillating within range',
    direction,
    entry: {
      price: roundPrice(entryPrice),
      condition: isLong
        ? `Price touches ${roundPrice(rangeLow)} zone with bullish reversal pattern`
        : `Price touches ${roundPrice(rangeHigh)} zone with bearish reversal pattern`,
      type: 'limit',
      zone: isLong
        ? [roundPrice(rangeLow * 0.998), roundPrice(rangeLow * 1.002)]
        : [roundPrice(rangeHigh * 0.998), roundPrice(rangeHigh * 1.002)],
    },
    stopLoss: {
      price: roundPrice(stopLoss),
      percentage: Math.round((Math.abs(entryPrice - stopLoss) / entryPrice) * 10000) / 100,
      reason: `${isLong ? 'Below' : 'Above'} range boundary + ${roundPrice(slBuffer)} buffer`,
    },
    takeProfits: [
      { id: 'tp1', price: roundPrice(tp1), sizePct: 60, reason: 'Range midpoint' },
      { id: 'tp2', price: roundPrice(tp2), sizePct: 40, reason: 'Opposite range boundary' },
    ],
    riskReward: Math.round((Math.abs(tp1 - entryPrice) / risk) * 10) / 10,
    timeHorizon: '1-5 days (range cycle)',
    triggerConditions: [
      `Price reaches ${isLong ? 'lower' : 'upper'} range boundary`,
      'Reversal candle pattern at boundary (hammer, engulfing, etc.)',
      'No breakout volume (range intact)',
    ],
    invalidationConditions: [
      `Range boundary at ${roundPrice(isLong ? rangeLow : rangeHigh)} broken with volume`,
      'ADX rises above 25 (trend starting)',
      'Gap through the range boundary',
    ],
    management: {
      moveStopToBEAfterTP1: true,
      timeStop: 'Exit if price doesn\'t reach TP1 within 3 days',
    },
    rationale: [
      `${symbol} consolidating between ${roundPrice(rangeLow)} and ${roundPrice(rangeHigh)}`,
      ...reasons,
      'Mean-reversion within established range boundaries',
    ],
    risks: [
      'Range breakout (most dangerous risk)',
      'False signal at boundary',
      'Tighter profits compared to trend strategies',
    ],
  };
}

function roundPrice(price: number): number {
  if (price > 10000) return Math.round(price);
  if (price > 100) return Math.round(price * 10) / 10;
  if (price > 1) return Math.round(price * 100) / 100;
  return Math.round(price * 10000) / 10000;
}
