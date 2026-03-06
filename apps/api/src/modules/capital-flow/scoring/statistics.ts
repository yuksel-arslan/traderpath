/**
 * Statistical Utilities for Regime Scoring
 *
 * Provides z-score normalization, percentile ranking, and
 * cross-correlation functions used across all scoring layers.
 */

/**
 * Calculate z-score: (x - mean) / stddev
 * Returns 0 if stddev is 0 (no variance).
 */
export function zScore(value: number, series: number[]): number {
  if (series.length === 0) return 0;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance = series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / series.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Calculate mean of an array.
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation of an array.
 */
export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Calculate percentile rank of a value within a series.
 * Returns 0-100.
 */
export function percentileRank(value: number, series: number[]): number {
  if (series.length === 0) return 50;
  const below = series.filter(v => v < value).length;
  const equal = series.filter(v => v === value).length;
  return ((below + equal * 0.5) / series.length) * 100;
}

/**
 * Normalize a z-score to a 0-100 scale centered at 50.
 * Formula: 50 + 10 * z (clamped to [0, 100])
 */
export function normalizeZScore(z: number): number {
  return Math.max(0, Math.min(100, 50 + 10 * z));
}

/**
 * Cross-correlation between two time series at lag k.
 * Corr(series1[t-k], series2[t]) for k >= 0.
 *
 * Both series must be the same length.
 * Returns Pearson correlation coefficient [-1, +1].
 */
export function crossCorrelation(
  leadSeries: number[],
  lagSeries: number[],
  lag: number,
): number {
  const n = Math.min(leadSeries.length, lagSeries.length) - lag;
  if (n < 3) return 0;

  const lead = leadSeries.slice(0, n);
  const follow = lagSeries.slice(lag, lag + n);

  const meanLead = mean(lead);
  const meanFollow = mean(follow);

  let numerator = 0;
  let denomLead = 0;
  let denomFollow = 0;

  for (let i = 0; i < n; i++) {
    const dLead = lead[i] - meanLead;
    const dFollow = follow[i] - meanFollow;
    numerator += dLead * dFollow;
    denomLead += dLead ** 2;
    denomFollow += dFollow ** 2;
  }

  const denom = Math.sqrt(denomLead * denomFollow);
  if (denom === 0) return 0;
  return numerator / denom;
}

/**
 * Weighted sum of z-scores with given weights.
 * Weights do not need to sum to 1 — they are used as-is.
 */
export function weightedZSum(
  zScores: Record<string, number>,
  weights: Record<string, number>,
): number {
  let sum = 0;
  for (const key of Object.keys(weights)) {
    const z = zScores[key];
    const w = weights[key];
    if (z !== undefined && w !== undefined) {
      sum += z * w;
    }
  }
  return sum;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Simple linear interpolation.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Calculate rolling window values from a series.
 */
export function rollingWindow(series: number[], windowSize: number): number[][] {
  const windows: number[][] = [];
  for (let i = 0; i <= series.length - windowSize; i++) {
    windows.push(series.slice(i, i + windowSize));
  }
  return windows;
}
