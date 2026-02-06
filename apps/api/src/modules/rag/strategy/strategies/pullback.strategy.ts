/**
 * Pullback Strategy
 *
 * Entry: On retracement to support (LONG) or resistance (SHORT) within a trend
 * Best when: Strong trend exists, price is extended (RSI extreme)
 * Asset weights: crypto (0.8), stocks (1.0), metals (0.9), bonds (0.7), bist (1.0)
 */

import { StrategyPlan, ForecastBand } from '../../types';
import { nanoid } from 'nanoid';

export function generatePullbackPlan(params: {
  symbol: string;
  currentPrice: number;
  atr: number;
  direction: 'long' | 'short';
  supports: number[];
  resistances: number[];
  forecastBand?: ForecastBand;
  rsi?: number;
  adx?: number;
  trendStrength?: number; // 0-100
}): StrategyPlan {
  const {
    symbol,
    currentPrice,
    atr,
    direction,
    supports,
    resistances,
    forecastBand,
    rsi,
    adx,
    trendStrength,
  } = params;

  const isLong = direction === 'long';

  // ── Entry: Wait for pullback to key level ────────────────────────
  const pullbackTarget = isLong
    ? (supports[0] || currentPrice * 0.98)
    : (resistances[0] || currentPrice * 1.02);

  const entryPrice = pullbackTarget;
  const pullbackPercent = Math.abs(currentPrice - pullbackTarget) / currentPrice * 100;

  // ── Stop Loss ────────────────────────────────────────────────────
  const slDistance = Math.max(atr * 1.0, currentPrice * 0.015);
  const stopLoss = isLong ? entryPrice - slDistance : entryPrice + slDistance;

  // ── Take Profits ─────────────────────────────────────────────────
  const risk = Math.abs(entryPrice - stopLoss);
  const tp1 = isLong
    ? (resistances[0] && resistances[0] > entryPrice ? resistances[0] : entryPrice + risk * 2.0)
    : (supports[0] && supports[0] < entryPrice ? supports[0] : entryPrice - risk * 2.0);
  const tp2 = forecastBand
    ? (isLong ? forecastBand.p90 : forecastBand.p10)
    : (isLong ? entryPrice + risk * 3.0 : entryPrice - risk * 3.0);

  // ── Applicability ────────────────────────────────────────────────
  let applicability = 50;
  let reasons: string[] = [];

  // Strong trend = pullback more reliable
  if (adx != null && adx > 25) {
    applicability += 20;
    reasons.push(`Strong trend confirmed (ADX ${adx.toFixed(0)})`);
  }

  if (trendStrength != null && trendStrength > 60) {
    applicability += 10;
    reasons.push('Multi-timeframe trend alignment');
  }

  // RSI extreme = pullback expected
  if (rsi != null) {
    if ((isLong && rsi > 65) || (!isLong && rsi < 35)) {
      applicability += 15;
      reasons.push(`Extended RSI (${rsi.toFixed(0)}) suggests pullback coming`);
    }
  }

  // Reasonable pullback distance (1-5% ideal)
  if (pullbackPercent >= 1 && pullbackPercent <= 5) {
    applicability += 10;
    reasons.push(`Pullback target ${pullbackPercent.toFixed(1)}% away (ideal range)`);
  } else if (pullbackPercent > 8) {
    applicability -= 15;
    reasons.push('Pullback target too far');
  }

  applicability = Math.max(0, Math.min(100, applicability));

  return {
    id: nanoid(),
    type: 'pullback',
    label: `Pullback ${isLong ? 'Long' : 'Short'}`,
    description: isLong
      ? `Wait for pullback to ${roundPrice(pullbackTarget)} support, then enter long. Target ${roundPrice(tp1)}.`
      : `Wait for rally to ${roundPrice(pullbackTarget)} resistance, then enter short. Target ${roundPrice(tp1)}.`,
    applicability,
    applicabilityReason: reasons.join('. ') || 'Standard pullback within trend',
    direction,
    entry: {
      price: roundPrice(entryPrice),
      condition: isLong
        ? `Price pulls back to ${roundPrice(pullbackTarget)} area with bullish candle confirmation`
        : `Price rallies to ${roundPrice(pullbackTarget)} area with bearish candle confirmation`,
      type: 'limit',
      zone: isLong
        ? [roundPrice(pullbackTarget * 0.995), roundPrice(pullbackTarget * 1.005)]
        : [roundPrice(pullbackTarget * 0.995), roundPrice(pullbackTarget * 1.005)],
    },
    stopLoss: {
      price: roundPrice(stopLoss),
      percentage: Math.round((slDistance / entryPrice) * 10000) / 100,
      reason: isLong ? 'Below pullback support + ATR buffer' : 'Above pullback resistance + ATR buffer',
    },
    takeProfits: [
      { id: 'tp1', price: roundPrice(tp1), sizePct: 60, reason: isLong ? 'Nearest resistance' : 'Nearest support' },
      { id: 'tp2', price: roundPrice(tp2), sizePct: 40, reason: forecastBand ? 'Forecast band edge' : '3R target' },
    ],
    riskReward: Math.round((Math.abs(tp1 - entryPrice) / risk) * 10) / 10,
    timeHorizon: '1-5 days',
    triggerConditions: [
      `Price retraces to ${roundPrice(pullbackTarget)} zone`,
      'Bullish/bearish candle pattern confirmation at support/resistance',
      'Volume decreasing during pullback (healthy correction)',
    ],
    invalidationConditions: [
      `${isLong ? 'Support' : 'Resistance'} at ${roundPrice(pullbackTarget)} broken with high volume`,
      'Trend structure changes (lower highs/higher lows violated)',
      'ADX drops below 20 (trend weakening)',
    ],
    management: {
      moveStopToBEAfterTP1: true,
      timeStop: 'Exit if pullback target not reached within 3 days',
    },
    rationale: [
      `${symbol} in ${isLong ? 'uptrend' : 'downtrend'}, pullback to ${roundPrice(pullbackTarget)} expected`,
      ...reasons,
    ],
    risks: [
      'Trend reversal instead of pullback',
      'Pullback may not reach target level',
      'Whipsaw in choppy markets',
    ],
  };
}

function roundPrice(price: number): number {
  if (price > 10000) return Math.round(price);
  if (price > 100) return Math.round(price * 10) / 10;
  if (price > 1) return Math.round(price * 100) / 100;
  return Math.round(price * 10000) / 10000;
}
