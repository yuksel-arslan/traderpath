/**
 * Regime-Adaptive Thresholds Service
 * ====================================
 * Dynamically adjusts indicator thresholds (RSI 70/30, Stoch 80/20, etc.)
 * based on current volatility regime. In high-vol regimes, thresholds widen.
 * In low-vol regimes, thresholds tighten.
 *
 * Uses GARCH variance ratio when available, falls back to ATR-percentile method.
 *
 * Methodology claim: "Velocity and acceleration decomposition of trend indicators
 * with regime-adaptive thresholds" (MLIS Layer 2)
 */

import { type GARCHResult } from './garch.service';

export type VolatilityRegime = 'ultra_low' | 'low' | 'normal' | 'high' | 'extreme';

export interface AdaptiveThresholds {
  regime: VolatilityRegime;
  regimeFactor: number;            // 0.3 - 3.0

  // Oscillator thresholds
  rsiOverbought: number;           // default 70, adaptive: 55-85
  rsiOversold: number;             // default 30, adaptive: 15-45
  stochOverbought: number;         // default 80, adaptive: 60-92
  stochOversold: number;           // default 20, adaptive: 8-40
  cciOverbought: number;           // default 100, adaptive: 70-180
  cciOversold: number;             // default -100, adaptive: -180 to -70
  williamsROverbought: number;     // default -20, adaptive: -10 to -35
  williamsROversold: number;       // default -80, adaptive: -65 to -92

  // Volatility thresholds
  bbBreakoutThreshold: number;     // default 1.0, adaptive: 0.5-2.0
  volumeSpikeMultiplier: number;   // default 2.0x, adaptive: 1.3-3.5

  // Trade plan thresholds
  atrStopMultiplier: number;       // default 1.5, adaptive: 0.8-2.5
  minRiskReward: number;           // default 1.0, adaptive: 0.8-2.0
}

interface CandleLike {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Detect volatility regime using ATR-percentile method.
 * Compares current 14-period ATR% to the historical median.
 */
function detectRegimeFromATR(candles: CandleLike[]): { regime: VolatilityRegime; factor: number } {
  if (candles.length < 20) {
    return { regime: 'normal', factor: 1.0 };
  }

  // Calculate true range as % of price
  const trPercents: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    if (candles[i].close > 0) {
      trPercents.push(tr / candles[i].close);
    }
  }

  if (trPercents.length < 14) {
    return { regime: 'normal', factor: 1.0 };
  }

  // Current ATR% (simple average of last 14)
  const recent14 = trPercents.slice(-14);
  const currentATR = recent14.reduce((a, b) => a + b, 0) / recent14.length;

  // Historical median ATR%
  const sorted = [...trPercents].sort((a, b) => a - b);
  const medianATR = sorted[Math.floor(sorted.length / 2)];

  if (medianATR <= 0) {
    return { regime: 'normal', factor: 1.0 };
  }

  // Regime factor: current / historical
  const factor = clamp(currentATR / medianATR, 0.3, 3.0);

  let regime: VolatilityRegime;
  if (factor < 0.55) regime = 'ultra_low';
  else if (factor < 0.85) regime = 'low';
  else if (factor <= 1.2) regime = 'normal';
  else if (factor <= 1.8) regime = 'high';
  else regime = 'extreme';

  return { regime, factor };
}

/**
 * Detect regime from GARCH variance ratio (more accurate when available)
 */
function detectRegimeFromGARCH(garchResult: GARCHResult): { regime: VolatilityRegime; factor: number } {
  const ratio = garchResult.varianceRatio;
  // Convert variance ratio to a factor comparable to ATR method
  // variance_ratio = 1.0 means normal, >1 = elevated, <1 = suppressed
  const factor = clamp(Math.sqrt(ratio), 0.3, 3.0);

  let regime: VolatilityRegime;
  if (factor < 0.55) regime = 'ultra_low';
  else if (factor < 0.85) regime = 'low';
  else if (factor <= 1.2) regime = 'normal';
  else if (factor <= 1.8) regime = 'high';
  else regime = 'extreme';

  return { regime, factor };
}

/**
 * Calculate regime-adaptive thresholds.
 * @param candles - OHLCV candle data
 * @param garchResult - Optional GARCH result for better regime detection
 */
export function getAdaptiveThresholds(
  candles: CandleLike[],
  garchResult?: GARCHResult | null
): AdaptiveThresholds {
  // Prefer GARCH-based regime if available
  const { regime, factor } = garchResult
    ? detectRegimeFromGARCH(garchResult)
    : detectRegimeFromATR(candles);

  return {
    regime,
    regimeFactor: factor,

    // RSI: base 70/30, midline 50. Widen in high vol, tighten in low vol.
    rsiOverbought: clamp(50 + 20 * factor, 55, 85),
    rsiOversold: clamp(50 - 20 * factor, 15, 45),

    // Stochastic: base 80/20
    stochOverbought: clamp(50 + 30 * factor, 60, 92),
    stochOversold: clamp(50 - 30 * factor, 8, 40),

    // CCI: base ±100
    cciOverbought: clamp(100 * factor, 70, 180),
    cciOversold: clamp(-100 * factor, -180, -70),

    // Williams %R: base -20/-80 (inverted scale)
    williamsROverbought: clamp(-20 * (1 / factor), -35, -10),
    williamsROversold: clamp(-80 * factor, -92, -65),

    // Bollinger Band breakout: need bigger move in high vol
    bbBreakoutThreshold: clamp(0.8 * factor, 0.5, 2.0),

    // Volume spike: higher bar in high vol (more noise)
    volumeSpikeMultiplier: clamp(1.5 + 0.5 * factor, 1.3, 3.5),

    // ATR stop multiplier: wider in high vol
    atrStopMultiplier: clamp(1.0 + 0.5 * factor, 0.8, 2.5),

    // Minimum R:R: higher requirement in extreme regimes
    minRiskReward: clamp(0.8 + 0.2 * factor, 0.8, 2.0),
  };
}
