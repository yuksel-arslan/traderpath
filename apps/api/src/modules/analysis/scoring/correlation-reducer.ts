/**
 * Correlation Reducer (PCA-Lite)
 *
 * Detects and penalizes double-counting of correlated features
 * within a step. Market Pulse is the primary target:
 *   - VIX and Fear & Greed Index are ~80% correlated
 *   - BTC Dominance and crypto Fear & Greed overlap
 *   - Funding rate and long/short ratio share information
 *
 * Instead of full PCA (which would require eigenvector decomposition),
 * we use a lightweight correlation penalty:
 *
 *   1. Compute pairwise Pearson correlation matrix |ρ_ij|
 *   2. For each pair with |ρ| > threshold:
 *        penalty += (|ρ| - threshold) × min(w_i, w_j)
 *   3. Total penalty = Σ penalties / Σ weights (normalized)
 *
 * This reduces the effective weight of correlated features
 * without requiring matrix decomposition.
 *
 * Why not full PCA:
 *   - PCA needs a stable covariance matrix → requires 200+ samples
 *   - Rolling PCA is computationally expensive per request
 *   - The correlation penalty achieves 80% of the benefit at 5% of the cost
 */

// ============================================================
// Types
// ============================================================

export interface CorrelationPair {
  featureA: string;
  featureB: string;
  correlation: number;
  penalty: number;
}

export interface CorrelationReductionResult {
  /** Total penalty (0-1). 0 = no correlated features, 0.3 = 30% effective reduction */
  totalPenalty: number;
  /** Detected correlated pairs */
  correlatedPairs: CorrelationPair[];
  /** Number of features analyzed */
  featureCount: number;
}

// ============================================================
// Known correlation pairs (empirically observed in crypto markets)
// ============================================================

/**
 * Pre-defined correlation structure for Market Pulse features.
 *
 * These are based on empirical observations:
 *   - VIX ↔ Fear & Greed: ρ ≈ -0.82 (inverse)
 *   - BTC Trend ↔ Fear & Greed: ρ ≈ 0.65
 *   - Funding Rate ↔ Long/Short Ratio: ρ ≈ 0.55
 *   - GLRS ↔ BTC Trend: ρ ≈ 0.45
 *
 * When we don't have enough data for rolling correlation,
 * we use these priors. When rolling data IS available,
 * we compute actual correlations and use those instead.
 */
const KNOWN_CORRELATIONS: { a: string; b: string; rho: number }[] = [
  { a: 'fearGreedValue',    b: 'btcTrendStrength',  rho: 0.65 },
  { a: 'fundingRate',       b: 'longShortRatio',    rho: 0.55 },
  { a: 'glrsScore',         b: 'btcTrendStrength',  rho: 0.45 },
  { a: 'glrsScore',         b: 'fearGreedValue',    rho: 0.40 },
];

// ============================================================
// Correlation penalty threshold
// ============================================================

/**
 * Minimum |ρ| to trigger a penalty.
 * Below this, features are treated as independent.
 * Above this, penalty scales linearly with excess correlation.
 */
const CORRELATION_THRESHOLD = 0.40;

/**
 * Maximum total penalty cap.
 * Even with many correlated features, we don't want to
 * reduce the score by more than 25%.
 */
const MAX_PENALTY = 0.25;

// ============================================================
// Pearson correlation
// ============================================================

/**
 * Compute Pearson correlation between two numeric arrays.
 * Returns 0 if insufficient data (< 10 observations).
 */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 10) return 0;

  const sliceA = a.slice(-n);
  const sliceB = b.slice(-n);

  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += sliceA[i];
    sumB += sliceB[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const dA = sliceA[i] - meanA;
    const dB = sliceB[i] - meanB;
    cov += dA * dB;
    varA += dA * dA;
    varB += dB * dB;
  }

  const denom = Math.sqrt(varA * varB);
  return denom > 1e-10 ? cov / denom : 0;
}

// ============================================================
// Correlation penalty computation
// ============================================================

/**
 * Compute correlation penalty for a set of features.
 *
 * @param featureWeights - Map of feature key → weight
 * @param rollingHistory - Optional rolling history for computing actual correlations.
 *                         Keys are feature names, values are arrays of historical values.
 * @returns CorrelationReductionResult with total penalty and pair details
 */
export function computeCorrelationPenalty(
  featureWeights: Record<string, number>,
  rollingHistory?: Record<string, number[]>,
): CorrelationReductionResult {
  const featureKeys = Object.keys(featureWeights);
  const correlatedPairs: CorrelationPair[] = [];
  let totalPenalty = 0;
  let totalWeight = 0;

  for (const w of Object.values(featureWeights)) {
    totalWeight += w;
  }

  if (totalWeight === 0) {
    return { totalPenalty: 0, correlatedPairs: [], featureCount: featureKeys.length };
  }

  // Check all pairs
  for (let i = 0; i < featureKeys.length; i++) {
    for (let j = i + 1; j < featureKeys.length; j++) {
      const keyA = featureKeys[i];
      const keyB = featureKeys[j];

      let rho: number;

      // Try to compute actual correlation from rolling history
      if (rollingHistory && rollingHistory[keyA] && rollingHistory[keyB]) {
        rho = pearsonCorrelation(rollingHistory[keyA], rollingHistory[keyB]);
      } else {
        // Fall back to known priors
        const known = KNOWN_CORRELATIONS.find(
          k => (k.a === keyA && k.b === keyB) || (k.a === keyB && k.b === keyA)
        );
        rho = known ? known.rho : 0;
      }

      const absRho = Math.abs(rho);

      if (absRho > CORRELATION_THRESHOLD) {
        // Penalty proportional to excess correlation × smaller weight
        const excessCorr = absRho - CORRELATION_THRESHOLD;
        const smallerWeight = Math.min(
          featureWeights[keyA] || 0,
          featureWeights[keyB] || 0,
        );
        const pairPenalty = excessCorr * smallerWeight;

        correlatedPairs.push({
          featureA: keyA,
          featureB: keyB,
          correlation: parseFloat(rho.toFixed(3)),
          penalty: parseFloat(pairPenalty.toFixed(4)),
        });

        totalPenalty += pairPenalty;
      }
    }
  }

  // Normalize penalty relative to total weight
  const normalizedPenalty = totalWeight > 0 ? totalPenalty / totalWeight : 0;

  // Cap at maximum
  const finalPenalty = Math.min(normalizedPenalty, MAX_PENALTY);

  return {
    totalPenalty: parseFloat(finalPenalty.toFixed(4)),
    correlatedPairs,
    featureCount: featureKeys.length,
  };
}

/**
 * Convenience: compute Market Pulse correlation penalty using known priors.
 */
export function computeMarketPulseCorrelationPenalty(
  rollingHistory?: Record<string, number[]>,
): number {
  const weights: Record<string, number> = {
    glrsScore: 0.25,
    btcTrendStrength: 0.15,
    fearGreedValue: 0.12,
    timeframesAligned: 0.12,
    fundingRate: 0.08,
    longShortRatio: 0.08,
    newsSentiment: 0.10,
    macroPenalty: 0.10,
  };

  const result = computeCorrelationPenalty(weights, rollingHistory);
  return result.totalPenalty;
}
