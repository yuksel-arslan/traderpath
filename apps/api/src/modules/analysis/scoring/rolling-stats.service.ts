/**
 * Rolling Statistics Service
 *
 * Computes rolling mean and standard deviation for continuous indicators
 * from OHLCV data and pre-computed indicator arrays.
 *
 * These statistics feed the z-score normalization in `computeStepScore()`:
 *   z = (x - μ) / σ
 *
 * Where μ and σ come from the last N bars (default N = 200).
 *
 * Design:
 *   - Operates on arrays of indicator values (already computed by the engine)
 *   - Does NOT require persistent storage — computed per-analysis
 *   - Falls back to reasonable defaults when insufficient data
 */

import type { RollingStats, RollingStatsMap } from './step-score-formulas';

// ============================================================
// Configuration
// ============================================================

/** Default rolling window size for computing statistics */
const DEFAULT_WINDOW = 200;

/** Minimum observations required to produce meaningful stats */
const MIN_OBSERVATIONS = 30;

// ============================================================
// Core computation
// ============================================================

/**
 * Compute rolling mean and std from an array of values.
 *
 * Uses the last `window` observations. If fewer than MIN_OBSERVATIONS
 * are available, returns null (caller should use fallback).
 */
export function computeRollingStats(
  values: number[],
  window: number = DEFAULT_WINDOW,
): RollingStats | null {
  if (values.length < MIN_OBSERVATIONS) return null;

  const slice = values.slice(-window);
  const n = slice.length;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += slice[i];
  }
  const mean = sum / n;

  let varianceSum = 0;
  for (let i = 0; i < n; i++) {
    varianceSum += (slice[i] - mean) ** 2;
  }
  const std = Math.sqrt(varianceSum / (n - 1));

  return { mean, std };
}

// ============================================================
// Batch computation from indicator history
// ============================================================

/**
 * Compute rolling stats for multiple indicators at once.
 *
 * @param indicatorArrays - Map of indicator key → array of historical values
 * @param window - Rolling window size
 * @returns RollingStatsMap keyed by indicator name
 */
export function computeRollingStatsMap(
  indicatorArrays: Record<string, number[]>,
  window: number = DEFAULT_WINDOW,
): RollingStatsMap {
  const result: RollingStatsMap = {};

  for (const [key, values] of Object.entries(indicatorArrays)) {
    const stats = computeRollingStats(values, window);
    if (stats) {
      result[key] = stats;
    }
  }

  return result;
}

// ============================================================
// OHLCV-derived indicator extraction
// ============================================================

interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Extract rolling indicator arrays from OHLCV candle data.
 *
 * Computes common technical indicators across all candles,
 * returning arrays suitable for `computeRollingStatsMap()`.
 *
 * This is the primary bridge between raw market data and the
 * z-score normalization used by the closed-form scoring system.
 */
export function extractIndicatorArrays(
  candles: OHLCV[],
): Record<string, number[]> {
  if (candles.length < 20) return {};

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  const result: Record<string, number[]> = {};

  // RSI (14-period)
  result.rsiNormalized = computeRSIArray(closes, 14).map(v => Math.abs(v - 50));

  // MACD histogram
  result.macdHistogram = computeMACDHistogramArray(closes);

  // Bollinger Band %B position
  result.bbPosition = computeBBPositionArray(closes, 20, 2);

  // ADX strength (normalized 0-1)
  result.adxStrength = computeADXArray(highs, lows, closes, 14).map(v => v / 100);

  // ATR-normalized volatility
  result.atrNormalized = computeATRArray(highs, lows, closes, 14).map((atr, i) =>
    closes[i] > 0 ? atr / closes[i] : 0,
  );

  // Volume relative to 20-bar average
  const volumeMean20: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < 19) {
      volumeMean20.push(1);
    } else {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) sum += volumes[j];
      const avg = sum / 20;
      volumeMean20.push(avg > 0 ? volumes[i] / avg : 1);
    }
  }
  result.relativeVolume = volumeMean20;

  // Funding rate, fear & greed, etc. must come from external sources
  // They are NOT derivable from OHLCV alone

  return result;
}

// ============================================================
// Lightweight indicator array computation
// (Optimized for batch — no string allocations, no metadata)
// ============================================================

function computeRSIArray(closes: number[], period: number): number[] {
  const result = new Array<number>(closes.length).fill(50);
  if (closes.length <= period) return result;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(0, changes[i])) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -changes[i])) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i + 1] = 100 - 100 / (1 + rs);
  }

  return result;
}

function computeMACDHistogramArray(closes: number[]): number[] {
  const result = new Array<number>(closes.length).fill(0);
  if (closes.length < 26) return result;

  // EMA-12
  const k12 = 2 / 13;
  let ema12 = closes[0];
  const ema12Arr: number[] = [ema12];
  for (let i = 1; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12);
    ema12Arr.push(ema12);
  }

  // EMA-26
  const k26 = 2 / 27;
  let ema26 = closes[0];
  const ema26Arr: number[] = [ema26];
  for (let i = 1; i < closes.length; i++) {
    ema26 = closes[i] * k26 + ema26 * (1 - k26);
    ema26Arr.push(ema26);
  }

  // MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12Arr[i] - ema26Arr[i]);
  }

  // Signal line (EMA-9 of MACD)
  const k9 = 2 / 10;
  let signal = macdLine[0];
  for (let i = 1; i < macdLine.length; i++) {
    signal = macdLine[i] * k9 + signal * (1 - k9);
    result[i] = macdLine[i] - signal;
  }

  return result;
}

function computeBBPositionArray(closes: number[], period: number, stdDev: number): number[] {
  const result = new Array<number>(closes.length).fill(0.5);
  if (closes.length < period) return result;

  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    const sma = sum / period;

    let varSum = 0;
    for (let j = i - period + 1; j <= i; j++) varSum += (closes[j] - sma) ** 2;
    const std = Math.sqrt(varSum / period);

    const upper = sma + stdDev * std;
    const lower = sma - stdDev * std;
    const range = upper - lower;
    result[i] = range > 0 ? (closes[i] - lower) / range : 0.5;
  }

  return result;
}

function computeADXArray(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const n = closes.length;
  const result = new Array<number>(n).fill(25);
  if (n < period * 2) return result;

  const tr: number[] = [0];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < n; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ));

    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Smoothed TR, +DM, -DM
  let smoothTR = 0, smoothPlusDM = 0, smoothMinusDM = 0;
  for (let i = 1; i <= period; i++) {
    smoothTR += tr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }

  const dx: number[] = [];
  for (let i = period; i < n; i++) {
    if (i > period) {
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    }

    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    dx.push(diSum > 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0);
  }

  // ADX = smoothed DX
  if (dx.length >= period) {
    let adx = 0;
    for (let i = 0; i < period; i++) adx += dx[i];
    adx /= period;
    result[period * 2 - 1] = adx;

    for (let i = period; i < dx.length; i++) {
      adx = (adx * (period - 1) + dx[i]) / period;
      result[period + i] = adx;
    }
  }

  return result;
}

function computeATRArray(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const n = closes.length;
  const result = new Array<number>(n).fill(0);
  if (n < period + 1) return result;

  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < n; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ));
  }

  let atr = 0;
  for (let i = 0; i < period; i++) atr += tr[i];
  atr /= period;
  result[period - 1] = atr;

  for (let i = period; i < n; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    result[i] = atr;
  }

  return result;
}
