/**
 * Breakout Strategy
 *
 * Entry: Above resistance (LONG) or below support (SHORT)
 * Best when: Volatility is low (BB squeeze), ADX < 20, price near key level
 * Asset weights: crypto (1.0), stocks (0.8), metals (0.8), bonds (0.3), bist (0.8)
 */

import { StrategyPlan, ForecastBand } from '../../types';
import { nanoid } from 'nanoid';

export function generateBreakoutPlan(params: {
  symbol: string;
  currentPrice: number;
  atr: number;
  direction: 'long' | 'short';
  supports: number[];
  resistances: number[];
  forecastBand?: ForecastBand; // short-term band for targets
  adx?: number;
  bbWidth?: number;
  volume24hRatio?: number; // current vol / avg vol
}): StrategyPlan {
  const {
    symbol,
    currentPrice,
    atr,
    direction,
    supports,
    resistances,
    forecastBand,
    adx,
    bbWidth,
    volume24hRatio,
  } = params;

  const isLong = direction === 'long';

  // ── Entry ────────────────────────────────────────────────────────
  const nearestResistance = resistances[0] || currentPrice * 1.02;
  const nearestSupport = supports[0] || currentPrice * 0.98;

  const breakoutLevel = isLong ? nearestResistance : nearestSupport;
  const entryBuffer = atr * 0.1; // Small buffer above/below breakout level
  const entryPrice = isLong ? breakoutLevel + entryBuffer : breakoutLevel - entryBuffer;

  // ── Stop Loss ────────────────────────────────────────────────────
  const slDistance = Math.max(atr * 1.2, currentPrice * 0.015);
  const stopLoss = isLong ? entryPrice - slDistance : entryPrice + slDistance;

  // ── Take Profits ─────────────────────────────────────────────────
  const risk = Math.abs(entryPrice - stopLoss);
  const tp1 = isLong ? entryPrice + risk * 1.5 : entryPrice - risk * 1.5;
  const tp2 = isLong ? entryPrice + risk * 2.5 : entryPrice - risk * 2.5;
  const tp3 = forecastBand
    ? (isLong ? forecastBand.p90 : forecastBand.p10)
    : (isLong ? entryPrice + risk * 3.5 : entryPrice - risk * 3.5);

  // ── Applicability ────────────────────────────────────────────────
  let applicability = 50;
  let reasons: string[] = [];

  // BB squeeze = breakout likely
  if (bbWidth != null && bbWidth < 0.03) {
    applicability += 20;
    reasons.push('Bollinger Band squeeze detected');
  }

  // Low ADX = no trend yet, breakout can start new trend
  if (adx != null && adx < 20) {
    applicability += 15;
    reasons.push('No established trend (ADX < 20)');
  }

  // Price near key level
  const distToBreakout = Math.abs(currentPrice - breakoutLevel) / currentPrice;
  if (distToBreakout < 0.02) {
    applicability += 15;
    reasons.push('Price within 2% of breakout level');
  } else if (distToBreakout > 0.05) {
    applicability -= 15;
    reasons.push('Price far from breakout level');
  }

  // Volume confirmation potential
  if (volume24hRatio != null && volume24hRatio > 1.2) {
    applicability += 10;
    reasons.push('Above-average volume');
  }

  applicability = Math.max(0, Math.min(100, applicability));

  return {
    id: nanoid(),
    type: 'breakout',
    label: `Breakout ${isLong ? 'Long' : 'Short'}`,
    description: isLong
      ? `Enter on confirmed break above ${roundPrice(breakoutLevel)} with volume. Target ${roundPrice(tp2)} area.`
      : `Enter on confirmed break below ${roundPrice(breakoutLevel)} with volume. Target ${roundPrice(tp2)} area.`,
    applicability,
    applicabilityReason: reasons.join('. ') || 'Standard breakout setup',
    direction,
    entry: {
      price: roundPrice(entryPrice),
      condition: isLong
        ? `Close above ${roundPrice(breakoutLevel)} with volume confirmation`
        : `Close below ${roundPrice(breakoutLevel)} with volume confirmation`,
      type: 'stop_limit',
      zone: [roundPrice(breakoutLevel), roundPrice(entryPrice)],
    },
    stopLoss: {
      price: roundPrice(stopLoss),
      percentage: Math.round((slDistance / entryPrice) * 10000) / 100,
      reason: isLong ? 'Below breakout level + ATR buffer' : 'Above breakout level + ATR buffer',
    },
    takeProfits: [
      { id: 'tp1', price: roundPrice(tp1), sizePct: 40, reason: '1.5R target' },
      { id: 'tp2', price: roundPrice(tp2), sizePct: 35, reason: '2.5R target' },
      { id: 'tp3', price: roundPrice(tp3), sizePct: 25, reason: forecastBand ? 'P90 forecast level' : '3.5R target' },
    ],
    riskReward: Math.round((Math.abs(tp2 - entryPrice) / risk) * 10) / 10,
    timeHorizon: 'hours to 1-2 days',
    triggerConditions: [
      `Price breaks ${isLong ? 'above' : 'below'} ${roundPrice(breakoutLevel)}`,
      'Volume at or above average on breakout bar',
      'No immediate high-impact economic event',
    ],
    invalidationConditions: [
      `Failure to hold above ${roundPrice(breakoutLevel)} (false breakout)`,
      'Volume dries up after breakout',
      `Price reverses back ${isLong ? 'below' : 'above'} ${roundPrice(breakoutLevel)}`,
    ],
    management: {
      moveStopToBEAfterTP1: true,
      timeStop: 'Exit if breakout not confirmed within 24h',
    },
    rationale: [
      `${symbol} approaching key ${isLong ? 'resistance' : 'support'} at ${roundPrice(breakoutLevel)}`,
      ...reasons,
    ],
    risks: [
      'False breakout risk (most common trap)',
      'Liquidity risk at breakout level',
      'Slippage on entry if using market orders',
    ],
  };
}

function roundPrice(price: number): number {
  if (price > 10000) return Math.round(price);
  if (price > 100) return Math.round(price * 10) / 10;
  if (price > 1) return Math.round(price * 100) / 100;
  return Math.round(price * 10000) / 10000;
}
