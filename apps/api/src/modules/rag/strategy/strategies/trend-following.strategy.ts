/**
 * Trend Following Strategy
 *
 * Entry: Market order in trend direction with trailing stop
 * Best when: Strong trend (ADX > 25), EARLY/MID capital flow phase
 * Asset weights: crypto (1.0), stocks (0.9), metals (1.0), bonds (1.0), bist (0.7)
 */

import { StrategyPlan, ForecastBand } from '../../types';
import { Phase } from '../../../capital-flow/types';
import { v4 as uuidv4 } from 'uuid';

export function generateTrendFollowingPlan(params: {
  symbol: string;
  currentPrice: number;
  atr: number;
  direction: 'long' | 'short';
  supports: number[];
  resistances: number[];
  forecastBand?: ForecastBand; // medium-term band for targets
  adx?: number;
  rsi?: number;
  trendStrength?: number;
  capitalFlowPhase?: Phase;
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
    rsi,
    trendStrength,
    capitalFlowPhase,
  } = params;

  const isLong = direction === 'long';

  // ── Entry: Market order at current price ─────────────────────────
  const entryPrice = currentPrice;

  // ── Stop Loss: Trailing based on ATR ─────────────────────────────
  const initialSlDistance = atr * 2.0; // Wider stop for trend following
  const stopLoss = isLong ? entryPrice - initialSlDistance : entryPrice + initialSlDistance;

  // ── Take Profits: Based on medium-term forecast ──────────────────
  const risk = Math.abs(entryPrice - stopLoss);

  // TP1: 2R or medium-term P50
  const tp1 = forecastBand
    ? forecastBand.p50
    : (isLong ? entryPrice + risk * 2.0 : entryPrice - risk * 2.0);

  // TP2: 3R or medium-term P90/P10
  const tp2 = forecastBand
    ? (isLong ? forecastBand.p90 : forecastBand.p10)
    : (isLong ? entryPrice + risk * 3.0 : entryPrice - risk * 3.0);

  // ── Applicability ────────────────────────────────────────────────
  let applicability = 40; // Base (trend-following needs more confirmation)
  let reasons: string[] = [];

  // Strong trend is essential
  if (adx != null && adx > 30) {
    applicability += 25;
    reasons.push(`Strong trend (ADX ${adx.toFixed(0)} > 30)`);
  } else if (adx != null && adx > 25) {
    applicability += 15;
    reasons.push(`Moderate trend (ADX ${adx.toFixed(0)})`);
  } else if (adx != null && adx < 20) {
    applicability -= 20;
    reasons.push('No clear trend (ADX < 20)');
  }

  // Capital flow phase alignment
  if (capitalFlowPhase === 'early') {
    applicability += 20;
    reasons.push('EARLY phase capital flow — optimal for trend entry');
  } else if (capitalFlowPhase === 'mid') {
    applicability += 10;
    reasons.push('MID phase capital flow — trend continuation likely');
  } else if (capitalFlowPhase === 'late') {
    applicability -= 10;
    reasons.push('LATE phase — trend exhaustion risk');
  } else if (capitalFlowPhase === 'exit') {
    applicability -= 25;
    reasons.push('EXIT phase — capital leaving, trend following risky');
  }

  // Trend strength confirmation
  if (trendStrength != null && trendStrength > 70) {
    applicability += 10;
    reasons.push('Multi-timeframe trend alignment');
  }

  // RSI not extreme (room to move)
  if (rsi != null) {
    if (isLong && rsi < 65) {
      applicability += 5;
    } else if (isLong && rsi > 75) {
      applicability -= 10;
      reasons.push('RSI overbought — limited upside');
    } else if (!isLong && rsi > 35) {
      applicability += 5;
    } else if (!isLong && rsi < 25) {
      applicability -= 10;
      reasons.push('RSI oversold — limited downside');
    }
  }

  applicability = Math.max(0, Math.min(100, applicability));

  return {
    id: uuidv4(),
    type: 'trend_following',
    label: `Trend Follow ${isLong ? 'Long' : 'Short'}`,
    description: isLong
      ? `Enter long at market price with trailing stop. Ride the trend toward ${roundPrice(tp1)}.`
      : `Enter short at market price with trailing stop. Ride the trend toward ${roundPrice(tp1)}.`,
    applicability,
    applicabilityReason: reasons.join('. ') || 'Following established trend',
    direction,
    entry: {
      price: roundPrice(entryPrice),
      condition: 'Market entry — trend confirmation from multi-timeframe alignment',
      type: 'market',
    },
    stopLoss: {
      price: roundPrice(stopLoss),
      percentage: Math.round((initialSlDistance / entryPrice) * 10000) / 100,
      reason: '2× ATR trailing stop (wider for trend riding)',
    },
    takeProfits: [
      { id: 'tp1', price: roundPrice(tp1), sizePct: 50, reason: forecastBand ? 'Medium-term P50 target' : '2R target' },
      { id: 'tp2', price: roundPrice(tp2), sizePct: 50, reason: forecastBand ? 'Medium-term P90 edge' : '3R target' },
    ],
    riskReward: Math.round((Math.abs(tp1 - entryPrice) / risk) * 10) / 10,
    timeHorizon: '1-7 days (or until trend reversal)',
    triggerConditions: [
      'Price in clear trend direction (higher highs/lows or lower highs/lows)',
      'ADX above 25 confirming trend strength',
      `Capital flow ${capitalFlowPhase === 'early' || capitalFlowPhase === 'mid' ? 'supports' : 'does not oppose'} direction`,
    ],
    invalidationConditions: [
      'ADX drops below 20 (trend weakening)',
      'Trend structure break (key S/R violated)',
      'Capital flow phase shifts to EXIT',
      `Stop loss at ${roundPrice(stopLoss)} hit`,
    ],
    management: {
      moveStopToBEAfterTP1: true,
      trailingStop: {
        activateAfter: 'TP1 hit',
        trailPercent: Math.round((atr * 1.5 / currentPrice) * 10000) / 100,
      },
      timeStop: 'Review position if no new highs/lows within 5 days',
    },
    rationale: [
      `${symbol} in established ${isLong ? 'uptrend' : 'downtrend'}`,
      ...reasons,
      'Trailing stop protects profits while letting winners run',
    ],
    risks: [
      'Trend reversal without warning',
      'Wider stop = larger initial risk',
      'Gap risk overnight or on weekends (crypto 24/7)',
    ],
  };
}

function roundPrice(price: number): number {
  if (price > 10000) return Math.round(price);
  if (price > 100) return Math.round(price * 10) / 10;
  if (price > 1) return Math.round(price * 100) / 100;
  return Math.round(price * 10000) / 10000;
}
