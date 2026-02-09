/**
 * Institutional Flow Estimation Service
 * ======================================
 * Estimates institutional (whale) activity using:
 *   1. BVC (Bulk Volume Classification) — Easley, López de Prado, O'Hara (2012)
 *   2. VPIN (Volume-Synchronized Probability of Informed Trading)
 *   3. Adaptive whale threshold (95th percentile of trade sizes)
 *
 * Works with OHLCV candle data as input. When tick-level data is unavailable,
 * uses candle-level approximations based on close-open range vs high-low range.
 *
 * Methodology claim: "Institutional flow estimation layer using BVC + VPIN
 * with adaptive whale threshold" (MLIS Layer 4)
 */

export interface InstitutionalFlowResult {
  /** BVC: fraction of volume classified as buy-initiated (0-1) */
  bvcBuyRatio: number;
  /** VPIN: probability of informed trading (0-1, higher = more informed) */
  vpin: number;
  /** Institutional pressure: -1 (strong sell) to +1 (strong buy) */
  institutionalPressure: number;
  /** Whale activity level: 0 (none) to 1 (extreme) */
  whaleActivity: number;
  /** Volume concentration: how unevenly volume is distributed (0-1) */
  volumeConcentration: number;
  /** Smart money direction: 'accumulating' | 'distributing' | 'neutral' */
  smartMoneyDirection: 'accumulating' | 'distributing' | 'neutral';
  /** Composite score (0-100) */
  flowScore: number;
}

interface CandleLike {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Bulk Volume Classification (BVC)
 * Classifies each candle's volume as buy-initiated or sell-initiated
 * using the close-open range relative to the high-low range.
 *
 * BVC_buy = volume × Z, where Z = CDF(close - open) / (high - low)
 * For candle-level: fraction = (close - open) / (high - low)
 * Clamped to [-1, 1], then mapped to [0, 1] for buy classification.
 */
function computeBVC(candles: CandleLike[]): { buyVolumes: number[]; sellVolumes: number[]; buyRatio: number } {
  const buyVolumes: number[] = [];
  const sellVolumes: number[] = [];

  for (const c of candles) {
    const range = c.high - c.low;
    if (range <= 0 || c.volume <= 0) {
      buyVolumes.push(c.volume * 0.5);
      sellVolumes.push(c.volume * 0.5);
      continue;
    }

    // BVC classification factor
    const rawFraction = (c.close - c.open) / range;
    // Apply standard normal CDF approximation for BVC
    const z = clamp(rawFraction, -1, 1);
    const buyFraction = (z + 1) / 2; // map [-1,1] → [0,1]

    buyVolumes.push(c.volume * buyFraction);
    sellVolumes.push(c.volume * (1 - buyFraction));
  }

  const totalBuy = buyVolumes.reduce((a, b) => a + b, 0);
  const totalVol = candles.reduce((a, c) => a + c.volume, 0);
  const buyRatio = totalVol > 0 ? totalBuy / totalVol : 0.5;

  return { buyVolumes, sellVolumes, buyRatio };
}

/**
 * VPIN (Volume-Synchronized Probability of Informed Trading)
 * Groups trades into volume buckets and measures order imbalance.
 *
 * Steps:
 * 1. Group candles into volume buckets (each ~1/N of total volume)
 * 2. For each bucket, compute |V_buy - V_sell| / V_bucket
 * 3. VPIN = moving average of bucket imbalances
 *
 * @param bucketCount - number of volume buckets (default: 20)
 * @param lookback - number of recent buckets for VPIN calculation (default: 10)
 */
function computeVPIN(
  candles: CandleLike[],
  buyVolumes: number[],
  sellVolumes: number[],
  bucketCount: number = 20,
  lookback: number = 10
): number {
  const totalVolume = candles.reduce((s, c) => s + c.volume, 0);
  if (totalVolume <= 0) return 0.5;

  const bucketSize = totalVolume / bucketCount;
  if (bucketSize <= 0) return 0.5;

  // Build volume buckets
  const bucketImbalances: number[] = [];
  let currentBuyVol = 0;
  let currentSellVol = 0;
  let currentBucketVol = 0;

  for (let i = 0; i < candles.length; i++) {
    currentBuyVol += buyVolumes[i];
    currentSellVol += sellVolumes[i];
    currentBucketVol += candles[i].volume;

    // When bucket is full, record imbalance and start new bucket
    while (currentBucketVol >= bucketSize && bucketImbalances.length < bucketCount) {
      const overflow = currentBucketVol - bucketSize;
      const fraction = bucketSize > 0 ? (currentBucketVol - overflow) / currentBucketVol : 1;

      const bBuy = currentBuyVol * fraction;
      const bSell = currentSellVol * fraction;
      const bTotal = bBuy + bSell;

      const imbalance = bTotal > 0 ? Math.abs(bBuy - bSell) / bTotal : 0;
      bucketImbalances.push(imbalance);

      // Carry over excess to next bucket
      currentBuyVol *= (1 - fraction);
      currentSellVol *= (1 - fraction);
      currentBucketVol = overflow;
    }
  }

  if (bucketImbalances.length === 0) return 0.5;

  // VPIN = average of recent bucket imbalances
  const recentBuckets = bucketImbalances.slice(-lookback);
  const vpin = recentBuckets.reduce((a, b) => a + b, 0) / recentBuckets.length;

  return clamp(vpin, 0, 1);
}

/**
 * Detect whale activity using volume spike analysis.
 * Uses 95th percentile of individual candle volumes as adaptive threshold.
 */
function detectWhaleActivity(candles: CandleLike[]): { whaleActivity: number; concentration: number } {
  if (candles.length < 10) {
    return { whaleActivity: 0, concentration: 0 };
  }

  const volumes = candles.map(c => c.volume).filter(v => v > 0);
  if (volumes.length === 0) return { whaleActivity: 0, concentration: 0 };

  // Sort to find percentiles
  const sorted = [...volumes].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  if (p50 <= 0) return { whaleActivity: 0, concentration: 0 };

  // Whale threshold = 95th percentile
  const whaleThreshold = p95;

  // Count candles above whale threshold in recent 20%
  const recentCount = Math.max(Math.floor(candles.length * 0.2), 5);
  const recentCandles = candles.slice(-recentCount);
  const whaleCandles = recentCandles.filter(c => c.volume >= whaleThreshold).length;

  // Whale activity: proportion of recent candles that are "whale" candles
  // Expected: ~5% (since threshold is p95). Above that = elevated whale activity.
  const expectedRate = 0.05;
  const actualRate = whaleCandles / recentCount;
  const whaleActivity = clamp((actualRate - expectedRate) / (0.3 - expectedRate), 0, 1);

  // Volume concentration: Gini-like measure
  // High concentration = volume clustered in few candles (institutional behavior)
  const totalVol = volumes.reduce((a, b) => a + b, 0);
  const meanVol = totalVol / volumes.length;
  const madSum = volumes.reduce((s, v) => s + Math.abs(v - meanVol), 0);
  const gini = madSum / (2 * volumes.length * meanVol);
  const concentration = clamp(gini, 0, 1);

  return { whaleActivity, concentration };
}

/**
 * Estimate institutional flow from OHLCV candle data.
 *
 * @param candles - OHLCV candle data (minimum 20 candles recommended)
 * @returns InstitutionalFlowResult with BVC, VPIN, and whale metrics
 */
export function estimateInstitutionalFlow(candles: CandleLike[]): InstitutionalFlowResult {
  const defaultResult: InstitutionalFlowResult = {
    bvcBuyRatio: 0.5,
    vpin: 0.5,
    institutionalPressure: 0,
    whaleActivity: 0,
    volumeConcentration: 0,
    smartMoneyDirection: 'neutral',
    flowScore: 50,
  };

  if (candles.length < 20) {
    return defaultResult;
  }

  // Step 1: BVC classification
  const { buyVolumes, sellVolumes, buyRatio } = computeBVC(candles);

  // Step 2: VPIN computation
  const bucketCount = Math.max(10, Math.floor(candles.length / 5));
  const lookback = Math.max(5, Math.floor(bucketCount / 2));
  const vpin = computeVPIN(candles, buyVolumes, sellVolumes, bucketCount, lookback);

  // Step 3: Whale detection
  const { whaleActivity, concentration } = detectWhaleActivity(candles);

  // Step 4: Institutional pressure
  // Combines BVC direction with VPIN intensity and whale activity
  const bvcDirection = (buyRatio - 0.5) * 2; // -1 to +1
  const vpinIntensity = vpin; // 0 to 1 (higher = more informed trading)

  // If VPIN is high AND BVC skewed, strong institutional pressure in BVC direction
  const institutionalPressure = clamp(
    bvcDirection * (0.5 + 0.5 * vpinIntensity) * (1 + whaleActivity * 0.3),
    -1, 1
  );

  // Step 5: Smart money direction
  let smartMoneyDirection: InstitutionalFlowResult['smartMoneyDirection'];
  if (institutionalPressure > 0.15) {
    smartMoneyDirection = 'accumulating';
  } else if (institutionalPressure < -0.15) {
    smartMoneyDirection = 'distributing';
  } else {
    smartMoneyDirection = 'neutral';
  }

  // Step 6: Composite flow score (0-100)
  // High score = strong institutional buying, low score = strong institutional selling
  const pressureComponent = institutionalPressure * 25;  // -25 to +25
  const vpinComponent = vpin > 0.6 ? 10 : 0;            // +10 if high informed trading
  const whaleComponent = whaleActivity * 15;              // 0-15

  const flowScore = clamp(
    50 + pressureComponent + vpinComponent * Math.sign(bvcDirection) + whaleComponent * Math.sign(bvcDirection),
    0, 100
  );

  return {
    bvcBuyRatio: buyRatio,
    vpin,
    institutionalPressure,
    whaleActivity,
    volumeConcentration: concentration,
    smartMoneyDirection,
    flowScore,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
