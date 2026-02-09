/**
 * Conv1D Feature Extraction Service
 * ==================================
 * Applies 1D convolution with hand-crafted kernels to price return series
 * for pattern detection (trend-up, spike, momentum, mean-reversion, etc.).
 *
 * No training needed — kernels are predefined based on market microstructure
 * knowledge. ReLU activation + global max-pooling per kernel.
 *
 * Methodology claim: "Convolutional feature extraction layer that detects
 * micro-patterns in price action" (MLIS Layer 1)
 */

export interface Conv1DFeatures {
  /** Per-kernel feature vectors */
  kernelActivations: KernelActivation[];
  /** Aggregate pattern signals */
  trendSignal: number;       // -1 (strong down) to +1 (strong up)
  spikeSignal: number;       // 0 (none) to +1 (strong spike detected)
  momentumSignal: number;    // -1 to +1
  meanRevertSignal: number;  // 0 to +1 (mean-reversion detected)
  /** Composite feature score (0-100) */
  featureScore: number;
}

export interface KernelActivation {
  name: string;
  maxActivation: number;     // global max-pool output
  meanActivation: number;    // mean activation across series
  recencyIndex: number;      // 0-1, where max occurs (1 = most recent)
}

interface CandleLike {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Predefined convolution kernels.
 * Each kernel is a small 1D filter that detects a specific price pattern.
 */
const KERNELS: Record<string, number[]> = {
  // 3-bar patterns
  trendUp3:    [-1, 0, 1],         // consecutive up moves
  trendDown3:  [1, 0, -1],         // consecutive down moves
  spike3:      [-1, 2, -1],        // single-bar spike (V-top / doji)
  dip3:        [1, -2, 1],         // single-bar dip (V-bottom)

  // 5-bar patterns
  momentum5:   [-2, -1, 0, 1, 2],  // accelerating trend
  decel5:      [2, 1, 0, -1, -2],  // decelerating trend / exhaustion
  meanRevert5: [1, 0.5, -1, 0.5, 1], // mean-reversion (dip and recover)

  // 7-bar pattern
  trend7:      [-3, -2, -1, 0, 1, 2, 3], // sustained directional move
};

/**
 * ReLU activation function
 */
function relu(x: number): number {
  return x > 0 ? x : 0;
}

/**
 * Apply a single 1D convolution kernel to a series.
 * Returns the activation array after ReLU.
 */
function convolve1D(series: number[], kernel: number[]): number[] {
  const kLen = kernel.length;
  const outLen = series.length - kLen + 1;
  if (outLen <= 0) return [];

  const result = new Array<number>(outLen);
  for (let i = 0; i < outLen; i++) {
    let sum = 0;
    for (let j = 0; j < kLen; j++) {
      sum += series[i + j] * kernel[j];
    }
    result[i] = relu(sum);
  }
  return result;
}

/**
 * Compute log returns from candle close prices
 */
function computeReturns(candles: CandleLike[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i - 1].close > 0 && candles[i].close > 0) {
      returns.push(Math.log(candles[i].close / candles[i - 1].close));
    }
  }
  return returns;
}

/**
 * Compute volume change series (normalized)
 */
function computeVolumeChanges(candles: CandleLike[]): number[] {
  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i - 1].volume > 0) {
      changes.push((candles[i].volume - candles[i - 1].volume) / candles[i - 1].volume);
    } else {
      changes.push(0);
    }
  }
  return changes;
}

/**
 * Normalize a series to zero mean, unit variance (z-score)
 */
function zNormalize(series: number[]): number[] {
  if (series.length === 0) return [];

  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance = series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length;
  const std = Math.sqrt(variance);

  if (std < 1e-10) return series.map(() => 0);
  return series.map(v => (v - mean) / std);
}

/**
 * Extract Conv1D features from candle data.
 *
 * @param candles - OHLCV candle data (minimum 15 candles)
 * @returns Conv1DFeatures with kernel activations and aggregate signals
 */
export function extractConv1DFeatures(candles: CandleLike[]): Conv1DFeatures {
  const defaultResult: Conv1DFeatures = {
    kernelActivations: [],
    trendSignal: 0,
    spikeSignal: 0,
    momentumSignal: 0,
    meanRevertSignal: 0,
    featureScore: 50,
  };

  if (candles.length < 15) {
    return defaultResult;
  }

  // Prepare input series
  const rawReturns = computeReturns(candles);
  const rawVolChanges = computeVolumeChanges(candles);

  // Normalize
  const returns = zNormalize(rawReturns);
  const volChanges = zNormalize(rawVolChanges);

  // Apply each kernel to the returns series and extract features
  const activations: KernelActivation[] = [];

  for (const [name, kernel] of Object.entries(KERNELS)) {
    const priceActivation = convolve1D(returns, kernel);
    const volActivation = convolve1D(volChanges, kernel);

    // Combine price and volume activations (70% price, 30% volume)
    const combined = priceActivation.map((p, idx) => {
      const v = idx < volActivation.length ? volActivation[idx] : 0;
      return 0.7 * p + 0.3 * v;
    });

    if (combined.length === 0) {
      activations.push({ name, maxActivation: 0, meanActivation: 0, recencyIndex: 0.5 });
      continue;
    }

    // Global max-pooling
    let maxVal = 0;
    let maxIdx = 0;
    let sum = 0;
    for (let i = 0; i < combined.length; i++) {
      sum += combined[i];
      if (combined[i] > maxVal) {
        maxVal = combined[i];
        maxIdx = i;
      }
    }

    activations.push({
      name,
      maxActivation: maxVal,
      meanActivation: sum / combined.length,
      recencyIndex: combined.length > 1 ? maxIdx / (combined.length - 1) : 0.5,
    });
  }

  // Compute aggregate signals from kernel activations
  const getActivation = (name: string): KernelActivation =>
    activations.find(a => a.name === name) || { name, maxActivation: 0, meanActivation: 0, recencyIndex: 0.5 };

  // Trend signal: trendUp vs trendDown (weighted by recency)
  const up3 = getActivation('trendUp3');
  const down3 = getActivation('trendDown3');
  const trend7 = getActivation('trend7');
  const mom5 = getActivation('momentum5');
  const decel5 = getActivation('decel5');

  // Recent activations matter more (recency weight: 0.5 + 0.5 * recencyIndex)
  const recencyWeight = (a: KernelActivation) => 0.5 + 0.5 * a.recencyIndex;

  const upStrength = up3.maxActivation * recencyWeight(up3) + trend7.maxActivation * recencyWeight(trend7) * 0.5;
  const downStrength = down3.maxActivation * recencyWeight(down3);

  // Normalize to -1..+1
  const trendDenom = Math.max(upStrength + downStrength, 1e-6);
  const trendSignal = clamp((upStrength - downStrength) / trendDenom, -1, 1);

  // Spike signal
  const spike3 = getActivation('spike3');
  const dip3 = getActivation('dip3');
  const spikeSignal = clamp(Math.max(spike3.maxActivation, dip3.maxActivation) / 3, 0, 1);

  // Momentum signal: momentum5 vs decel5
  const momStrength = mom5.maxActivation * recencyWeight(mom5);
  const decelStrength = decel5.maxActivation * recencyWeight(decel5);
  const momDenom = Math.max(momStrength + decelStrength, 1e-6);
  const momentumSignal = clamp((momStrength - decelStrength) / momDenom, -1, 1);

  // Mean-reversion signal
  const meanRevert5 = getActivation('meanRevert5');
  const meanRevertSignal = clamp(meanRevert5.maxActivation * recencyWeight(meanRevert5) / 3, 0, 1);

  // Composite feature score (0-100)
  // Strong trend + momentum alignment = high score
  // High spike + mean-reversion = lower score (uncertain)
  const trendComponent = Math.abs(trendSignal) * 30;         // 0-30
  const momentumComponent = Math.abs(momentumSignal) * 25;    // 0-25
  const alignmentBonus = trendSignal * momentumSignal > 0 ? 15 : 0; // +15 if aligned
  const spikesPenalty = spikeSignal * 10;                     // 0-10 penalty
  const meanRevertPenalty = meanRevertSignal * 10;            // 0-10 penalty

  const featureScore = clamp(
    50 + trendComponent + momentumComponent + alignmentBonus - spikesPenalty - meanRevertPenalty,
    0, 100
  );

  return {
    kernelActivations: activations,
    trendSignal,
    spikeSignal,
    momentumSignal,
    meanRevertSignal,
    featureScore,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
