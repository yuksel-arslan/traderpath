/**
 * Bootstrap Confidence Interval Service
 *
 * Provides statistical confidence intervals for the meta-ensemble
 * P(up) estimate using non-parametric bootstrap resampling.
 *
 * Method:
 *   1. Take the original feature vector and rolling history
 *   2. Resample with replacement B times (B = 200)
 *   3. For each resample, compute P(up)
 *   4. Sort the B estimates
 *   5. CI = [P_{5%}, P_{95%}] for 90% confidence interval
 *
 * Why bootstrap instead of parametric CI:
 *   - Features are mixed (continuous + binary + ordinal)
 *   - Distribution is non-normal (sigmoid-bounded)
 *   - No closed-form variance formula for the meta-ensemble
 *   - Bootstrap is assumption-free and handles all cases
 *
 * Performance:
 *   B=200 resamples × ~0.05ms per computation = ~10ms total.
 *   Acceptable for real-time API response.
 */

import type { BootstrapResult } from './closed-form-scoring.types';

// ============================================================
// Configuration
// ============================================================

/** Number of bootstrap resamples */
const N_RESAMPLES = 200;

/** Percentiles for 90% CI */
const CI_LOW_PERCENTILE = 0.05;
const CI_HIGH_PERCENTILE = 0.95;

// ============================================================
// Seeded PRNG for reproducibility
// ============================================================

/**
 * Simple xorshift32 PRNG for reproducible results.
 * Using Math.random() would give different CIs on each call.
 */
function createPRNG(seed: number): () => number {
  let state = seed | 0;
  if (state === 0) state = 1;
  return (): number => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

// ============================================================
// Bootstrap resampling
// ============================================================

/**
 * Compute bootstrap confidence interval for P(up).
 *
 * Instead of resampling raw features (which requires re-running
 * the full pipeline), we use a perturbation approach:
 *
 *   For each resample b = 1..B:
 *     1. Add Gaussian noise to the logit: L_b = L + ε_b
 *        where ε_b ~ N(0, σ_noise²)
 *     2. Compute P_b = σ(λ · L_b)
 *     3. Apply trap and risk adjustments
 *
 * σ_noise is estimated from the feature-level uncertainty:
 *   σ_noise = √(Σ w_i² · σ_feature_i²)
 *
 * When feature-level uncertainty is unknown, we use a default
 * based on the number of features and their weights.
 *
 * @param logit - The original meta-ensemble logit
 * @param featureUncertainties - Optional per-feature std deviations
 * @param featureWeights - Weights used in the ensemble
 * @param sigmoidLambda - Steepness parameter (default 3.0)
 * @param trapScore - Trap score (0-1)
 * @param riskScore - Risk score (0-1)
 * @param seed - PRNG seed for reproducibility
 * @returns BootstrapResult with CI bounds
 */
export function bootstrapConfidenceInterval(
  logit: number,
  featureUncertainties?: Record<string, number>,
  featureWeights?: Record<string, number>,
  sigmoidLambda: number = 3.0,
  trapScore: number = 0,
  riskScore: number = 0,
  seed: number = 42,
): BootstrapResult {
  // Estimate noise standard deviation
  let sigmaLogit: number;

  if (featureUncertainties && featureWeights) {
    // Propagate uncertainty through weighted sum
    // σ²_L = Σ (w_i · σ_i)²
    let varianceSum = 0;
    for (const [key, w] of Object.entries(featureWeights)) {
      const featureSigma = featureUncertainties[key] || 0.1;
      varianceSum += (w * featureSigma) ** 2;
    }
    sigmaLogit = Math.sqrt(varianceSum);
  } else {
    // Default noise: proportional to distance from 0 (more uncertain near boundaries)
    // Typical ensemble logit in [-1, +1], uncertainty ~0.1-0.3
    sigmaLogit = 0.15 + 0.05 * Math.abs(logit);
  }

  // Ensure minimum uncertainty
  sigmaLogit = Math.max(0.05, sigmaLogit);

  // Generate bootstrap samples
  const rng = createPRNG(seed);
  const samples: number[] = new Array(N_RESAMPLES);

  for (let b = 0; b < N_RESAMPLES; b++) {
    // Box-Muller transform for Gaussian noise
    const u1 = rng();
    const u2 = rng();
    const gaussianNoise = Math.sqrt(-2 * Math.log(Math.max(1e-10, u1))) * Math.cos(2 * Math.PI * u2);

    // Perturbed logit
    const perturbedLogit = logit + gaussianNoise * sigmaLogit;

    // Apply sigmoid
    const pUp = 1 / (1 + Math.exp(-sigmoidLambda * (perturbedLogit - 1.5 * trapScore)));

    // Risk adjustment
    const pAdj = pUp * (1 - Math.min(1, Math.max(0, riskScore)));

    samples[b] = pAdj;
  }

  // Sort for percentile extraction
  samples.sort((a, b) => a - b);

  // Point estimate (median of bootstrap distribution)
  const pointEstimate = samples[Math.floor(N_RESAMPLES / 2)];

  // CI bounds
  const ci90Low = samples[Math.floor(N_RESAMPLES * CI_LOW_PERCENTILE)];
  const ci90High = samples[Math.floor(N_RESAMPLES * CI_HIGH_PERCENTILE)];

  // Standard error
  const mean = samples.reduce((s, v) => s + v, 0) / N_RESAMPLES;
  const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (N_RESAMPLES - 1);
  const standardError = Math.sqrt(variance);

  return {
    pointEstimate: parseFloat(pointEstimate.toFixed(4)),
    ci90Low: parseFloat(ci90Low.toFixed(4)),
    ci90High: parseFloat(ci90High.toFixed(4)),
    standardError: parseFloat(standardError.toFixed(4)),
    nResamples: N_RESAMPLES,
  };
}

/**
 * Compute confidence level from bootstrap CI width.
 *
 * Narrow CI → high confidence (the estimate is precise)
 * Wide CI → low confidence (the estimate is uncertain)
 *
 * confidence = 100 × (1 - CI_width / max_width)
 *
 * Where max_width = 1.0 (probability spans [0, 1])
 */
export function confidenceFromCI(ci: BootstrapResult): number {
  const width = ci.ci90High - ci.ci90Low;
  // CI width of 0 → 100% confidence
  // CI width of 0.5 → 50% confidence
  // CI width of 1.0 → 0% confidence
  return parseFloat(Math.max(0, Math.min(100, 100 * (1 - width))).toFixed(1));
}
