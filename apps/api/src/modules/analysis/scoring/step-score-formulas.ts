/**
 * Closed-Form Step Score Formulas
 *
 * Each step's score is computed as:
 *   S_k = clip(5 + 5 · (Σ w_kj · f_kj(x)) / Σ w_kj, 0, 10)
 *
 * Where:
 *   f_kj(x) = z-score for continuous features (from rolling window)
 *   f_kj(x) = {0, 1} for binary features
 *   f_kj(x) = ordinal mapping for categorical features
 *   w_kj = feature weight (explicit, sum per step = 1.0)
 *   sign_kj = +1 (bullish) or -1 (bearish reversal)
 *
 * Base 5.0 ± 5.0 × normalized_sum → always in [0, 10].
 *
 * Features are tanh-dampened to prevent any single outlier from
 * dominating: tanh(z) maps z ∈ (-∞,+∞) → (-1, +1).
 */

import type {
  FeatureDefinition,
  StepScoreBreakdown,
  NormalizedFeature,
} from './closed-form-scoring.types';

// ============================================================
// Utility: tanh dampening for z-scores
// ============================================================

/**
 * Tanh dampening: maps any z-score to [-1, +1].
 * A z=1 standard deviation maps to tanh(1) ≈ 0.76.
 * A z=3 maps to tanh(3) ≈ 0.995.
 * This prevents any single outlier feature from overwhelming the sum.
 */
function dampen(z: number): number {
  return Math.tanh(z);
}

/**
 * Z-score of a value given rolling statistics.
 * Returns 0 if insufficient data.
 */
function zScore(value: number, mean: number, std: number): number {
  if (std < 1e-10) return 0;
  return (value - mean) / std;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ============================================================
// Rolling statistics context
// ============================================================

/**
 * Pre-computed rolling statistics for continuous indicators.
 * Caller must provide these from a 200-bar rolling window.
 */
export interface RollingStats {
  /** Mean of the indicator over the rolling window */
  mean: number;
  /** Standard deviation of the indicator over the rolling window */
  std: number;
}

/**
 * Rolling statistics for each continuous indicator.
 * Keys match feature definition keys.
 */
export type RollingStatsMap = Record<string, RollingStats>;

// ============================================================
// Step 1: Market Pulse — Feature Definitions
// ============================================================

/**
 * Market Pulse evaluates the macro environment.
 *
 * Weights sum to 1.0. Sign: +1 = higher value → bullish.
 */
export const MARKET_PULSE_FEATURES: FeatureDefinition[] = [
  { key: 'glrsScore',        label: 'GLRS Regime Score',      type: 'continuous', weight: 0.25, sign: 1 },
  { key: 'btcTrendStrength',  label: 'BTC Trend Strength',     type: 'continuous', weight: 0.15, sign: 1 },
  { key: 'fearGreedValue',    label: 'Fear & Greed Index',     type: 'continuous', weight: 0.12, sign: 1 },
  { key: 'timeframesAligned', label: 'Multi-TF Alignment',     type: 'continuous', weight: 0.12, sign: 1 },
  { key: 'fundingRate',       label: 'Funding Rate',           type: 'continuous', weight: 0.08, sign: -1 },  // extreme funding = risk
  { key: 'longShortRatio',    label: 'Long/Short Ratio',       type: 'continuous', weight: 0.08, sign: 1 },
  { key: 'newsSentiment',     label: 'News Sentiment',         type: 'ordinal',    weight: 0.10, sign: 1,
    ordinalMap: { bearish: -1, neutral: 0, bullish: 1 } },
  { key: 'macroPenalty',      label: 'Economic Calendar',      type: 'ordinal',    weight: 0.10, sign: 1,
    ordinalMap: { '-3': -1, '-2': -0.67, '0': 0 } },
];

// ============================================================
// Step 2: Asset Scanner — Feature Definitions
// ============================================================

export const ASSET_SCAN_FEATURES: FeatureDefinition[] = [
  { key: 'trend1dStrength',   label: '1D Trend Strength',      type: 'continuous', weight: 0.20, sign: 1 },
  { key: 'trend4hStrength',   label: '4H Trend Strength',      type: 'continuous', weight: 0.15, sign: 1 },
  { key: 'rsiNormalized',     label: 'RSI (distance from 50)', type: 'continuous', weight: 0.15, sign: 1 },
  { key: 'macdHistogram',     label: 'MACD Histogram',         type: 'continuous', weight: 0.15, sign: 1 },
  { key: 'priceAboveMa50',    label: 'Price > MA50',           type: 'binary',     weight: 0.10, sign: 1 },
  { key: 'priceAboveMa200',   label: 'Price > MA200',          type: 'binary',     weight: 0.10, sign: 1 },
  { key: 'adxStrength',       label: 'ADX Trend Strength',     type: 'continuous', weight: 0.15, sign: 1 },
];

// ============================================================
// Step 3: Safety Check — Feature Definitions
// ============================================================

export const SAFETY_CHECK_FEATURES: FeatureDefinition[] = [
  { key: 'spoofingDetected',  label: 'Spoofing Detected',      type: 'binary',     weight: 0.12, sign: -1 },
  { key: 'layeringDetected',  label: 'Layering Detected',      type: 'binary',     weight: 0.10, sign: -1 },
  { key: 'washTrading',       label: 'Wash Trading',           type: 'binary',     weight: 0.10, sign: -1 },
  { key: 'pumpDumpRisk',      label: 'Pump & Dump Risk',       type: 'ordinal',    weight: 0.15, sign: -1,
    ordinalMap: { low: 0, medium: 0.5, high: 1 } },
  { key: 'honeypot',          label: 'Honeypot Contract',      type: 'binary',     weight: 0.15, sign: -1 },
  { key: 'liquidityScore',    label: 'Liquidity Score',        type: 'continuous', weight: 0.13, sign: 1 },
  { key: 'contractVerified',  label: 'Contract Verified',      type: 'binary',     weight: 0.10, sign: 1 },
  { key: 'liquidityLocked',   label: 'Liquidity Locked',       type: 'binary',     weight: 0.08, sign: 1 },
  { key: 'sellTaxNormalized', label: 'Sell Tax (inv.)',        type: 'continuous', weight: 0.07, sign: -1 },
];

// ============================================================
// Step 4: Timing — Feature Definitions
// ============================================================

export const TIMING_FEATURES: FeatureDefinition[] = [
  { key: 'rsiInZone',         label: 'RSI Entry Zone',         type: 'binary',     weight: 0.15, sign: 1 },
  { key: 'bbPosition',        label: 'BB Band Position',       type: 'continuous', weight: 0.12, sign: 1 },
  { key: 'macdCrossing',      label: 'MACD Cross Signal',      type: 'binary',     weight: 0.12, sign: 1 },
  { key: 'trendAligned',      label: 'Trend Alignment',        type: 'binary',     weight: 0.12, sign: 1 },
  { key: 'nearSupport',       label: 'Near Support Level',     type: 'binary',     weight: 0.12, sign: 1 },
  { key: 'volumeConfirm',     label: 'Volume Confirmation',    type: 'binary',     weight: 0.12, sign: 1 },
  { key: 'pvtDivergence',     label: 'PVT Divergence',         type: 'continuous', weight: 0.10, sign: 1 },
  { key: 'candlePattern',     label: 'Candlestick Pattern',    type: 'binary',     weight: 0.15, sign: 1 },
];

// ============================================================
// Step 5: Trade Plan — Feature Definitions
// ============================================================

export const TRADE_PLAN_FEATURES: FeatureDefinition[] = [
  { key: 'avgRiskReward',     label: 'Average R:R Ratio',      type: 'continuous', weight: 0.30, sign: 1 },
  { key: 'trendStrength',     label: 'Trend Strength',         type: 'continuous', weight: 0.20, sign: 1 },
  { key: 'winRateEstimate',   label: 'Win Rate Estimate',      type: 'continuous', weight: 0.25, sign: 1 },
  { key: 'stopTightness',     label: 'Stop-Loss Tightness',    type: 'continuous', weight: 0.15, sign: 1 },
  { key: 'expectancy',        label: 'Trade Expectancy',       type: 'continuous', weight: 0.10, sign: 1 },
];

// ============================================================
// Step 6: Trap Check — Feature Definitions
// ============================================================

export const TRAP_CHECK_FEATURES: FeatureDefinition[] = [
  { key: 'bullTrapDetected',  label: 'Bull Trap Detected',     type: 'binary',     weight: 0.25, sign: -1 },
  { key: 'bearTrapDetected',  label: 'Bear Trap Detected',     type: 'binary',     weight: 0.25, sign: -1 },
  { key: 'fakeoutRisk',       label: 'Fakeout Risk',           type: 'ordinal',    weight: 0.20, sign: -1,
    ordinalMap: { low: 0, medium: 0.5, high: 1 } },
  { key: 'lowVolumeBreakout', label: 'Low Volume Breakout',    type: 'binary',     weight: 0.15, sign: -1 },
  { key: 'oiDivergence',      label: 'OI Divergence',          type: 'continuous', weight: 0.15, sign: -1 },
];

// ============================================================
// All step feature definitions
// ============================================================

export const ALL_STEP_FEATURES: Record<string, FeatureDefinition[]> = {
  marketPulse: MARKET_PULSE_FEATURES,
  assetScan: ASSET_SCAN_FEATURES,
  safetyCheck: SAFETY_CHECK_FEATURES,
  timing: TIMING_FEATURES,
  tradePlan: TRADE_PLAN_FEATURES,
  trapCheck: TRAP_CHECK_FEATURES,
};

// ============================================================
// Core scoring function
// ============================================================

/**
 * Compute a step's closed-form score.
 *
 * Formula:
 *   rawSum = Σ (w_j · sign_j · f_j(x))
 *   S = clip(5 + 5 · rawSum, 0, 10)
 *
 * Where f_j(x) depends on feature type:
 *   continuous: tanh(z-score(x, μ, σ))  → bounded [-1, +1]
 *   binary: x ∈ {0, 1}                  → unchanged
 *   ordinal: lookup(x) from ordinalMap   → pre-scaled [-1, +1]
 *
 * When rawSum = +1 (all features max bullish): score = 10
 * When rawSum = -1 (all features max bearish): score = 0
 * When rawSum = 0 (neutral):                   score = 5
 *
 * @param features - Feature definitions for this step
 * @param rawValues - Raw indicator values keyed by feature key
 * @param rollingStats - Rolling mean/std for continuous features
 * @param correlationPenalty - Penalty from correlation reducer (0 = none)
 * @returns StepScoreBreakdown with full transparency
 */
export function computeStepScore(
  stepName: string,
  features: FeatureDefinition[],
  rawValues: Record<string, number | string | boolean>,
  rollingStats: RollingStatsMap = {},
  correlationPenalty: number = 0,
): StepScoreBreakdown {
  const normalizedFeatures: NormalizedFeature[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const def of features) {
    const raw = rawValues[def.key];
    if (raw === undefined || raw === null) continue;

    let normalized: number;

    switch (def.type) {
      case 'continuous': {
        const numValue = typeof raw === 'number' ? raw : parseFloat(String(raw));
        if (Number.isNaN(numValue)) continue;

        const stats = rollingStats[def.key];
        if (stats && stats.std > 1e-10) {
          // Z-score from rolling window, then tanh dampen
          const z = zScore(numValue, stats.mean, stats.std);
          normalized = dampen(z);
        } else {
          // No rolling stats → use raw value dampened
          // Assume typical magnitude of 1 for safe default
          normalized = dampen(numValue);
        }
        break;
      }

      case 'binary': {
        // Boolean or 0/1
        const boolVal = typeof raw === 'boolean' ? raw : Boolean(raw);
        normalized = boolVal ? 1 : 0;
        break;
      }

      case 'ordinal': {
        if (!def.ordinalMap) {
          normalized = 0;
          break;
        }
        const key = String(raw);
        normalized = def.ordinalMap[key] ?? 0;
        break;
      }

      default:
        normalized = 0;
    }

    // Apply sign: +1 or -1
    const signedNorm = normalized * def.sign;
    const contribution = signedNorm * def.weight;

    normalizedFeatures.push({
      raw: typeof raw === 'number' ? raw : (typeof raw === 'boolean' ? (raw ? 1 : 0) : 0),
      normalized: parseFloat(signedNorm.toFixed(4)),
      weight: def.weight,
      contribution: parseFloat(contribution.toFixed(4)),
      label: def.label,
    });

    weightedSum += contribution;
    totalWeight += def.weight;
  }

  // Normalize: weighted sum is in [-1, +1] when totalWeight > 0
  const normalizedSum = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Apply correlation penalty: reduces magnitude of the sum
  const penalizedSum = normalizedSum * (1 - correlationPenalty);

  // Map [-1, +1] → [0, 10] with base 5
  const rawScore = 5 + 5 * penalizedSum;
  const score = parseFloat(clamp(rawScore, 0, 10).toFixed(1));

  return {
    step: stepName,
    score,
    rawWeightedSum: parseFloat(normalizedSum.toFixed(4)),
    totalWeight: parseFloat(totalWeight.toFixed(4)),
    features: normalizedFeatures,
    correlationPenalty,
  };
}

// ============================================================
// Convenience: compute all 7 steps at once
// ============================================================

export interface AllStepRawValues {
  marketPulse: Record<string, number | string | boolean>;
  assetScan: Record<string, number | string | boolean>;
  safetyCheck: Record<string, number | string | boolean>;
  timing: Record<string, number | string | boolean>;
  tradePlan: Record<string, number | string | boolean>;
  trapCheck: Record<string, number | string | boolean>;
}

export function computeAllStepScores(
  rawValues: AllStepRawValues,
  rollingStats: Record<string, RollingStatsMap>,
  correlationPenalties: Record<string, number> = {},
): Record<string, StepScoreBreakdown> {
  const result: Record<string, StepScoreBreakdown> = {};

  for (const [stepName, features] of Object.entries(ALL_STEP_FEATURES)) {
    const values = rawValues[stepName as keyof AllStepRawValues];
    if (!values) continue;

    result[stepName] = computeStepScore(
      stepName,
      features,
      values,
      rollingStats[stepName] || {},
      correlationPenalties[stepName] || 0,
    );
  }

  return result;
}
