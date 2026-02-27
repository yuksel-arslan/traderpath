/**
 * Closed-Form Scoring System Types
 *
 * Mathematically deterministic scoring model:
 *   1. Every indicator → z-score (rolling window) or binary encoding
 *   2. Step score = clip(Σ w_kj · f_kj(x) / Σ w_kj, 0, 10)
 *   3. Meta-ensemble: L = Σ α_k · S_k + Σ β_m · M_m
 *   4. P(up) = σ(L - γ · TrapScore)
 *   5. P_adj = P(up) · (1 - RiskScore)
 *   6. Verdict from P_adj thresholds
 *
 * All weights are explicitly defined and sum-constrained.
 */

// ============================================================
// Feature normalization
// ============================================================

export interface NormalizedFeature {
  /** Raw indicator value */
  raw: number;
  /** Z-score normalized value (or binary 0/1) */
  normalized: number;
  /** Feature weight within the step */
  weight: number;
  /** Weighted contribution = normalized × weight */
  contribution: number;
  /** Human-readable label */
  label: string;
}

export type FeatureType = 'continuous' | 'binary' | 'ordinal';

export interface FeatureDefinition {
  /** Unique key for this feature */
  key: string;
  /** Human-readable name */
  label: string;
  /** How this feature is normalized */
  type: FeatureType;
  /** Weight within its step (Σ weights per step = 1.0) */
  weight: number;
  /** Sign: +1 = higher is bullish, -1 = higher is bearish */
  sign: 1 | -1;
  /** For ordinal: mapping from category to numeric value */
  ordinalMap?: Record<string, number>;
}

// ============================================================
// Step scoring
// ============================================================

export interface StepScoreBreakdown {
  /** Step name */
  step: string;
  /** Final score (0-10) */
  score: number;
  /** Raw weighted sum before normalization */
  rawWeightedSum: number;
  /** Total weight used */
  totalWeight: number;
  /** Per-feature breakdown */
  features: NormalizedFeature[];
  /** Correlation penalty applied (0 = none) */
  correlationPenalty: number;
}

// ============================================================
// Meta-ensemble
// ============================================================

export interface MetaEnsembleInput {
  /** 7-Step scores (each 0-10) */
  stepScores: {
    marketPulse: number;
    assetScan: number;
    safetyCheck: number;
    timing: number;
    tradePlan: number;
    trapCheck: number;
  };
  /** MLIS layer scores (each 0-100) */
  mlisScores: {
    technical: number;
    momentum: number;
    volatility: number;
    volume: number;
    sentiment?: number;
    onchain?: number;
  };
  /** Trap detection score (0-1, higher = more trap risk) */
  trapScore: number;
  /** Risk score (0-1, higher = riskier) */
  riskScore: number;
  /** Bundle type for weight selection */
  bundleType: 'scalping' | 'day' | 'swing';
  /** Whether trade plan step exists */
  hasTradePlan: boolean;
  /** Safety critical override */
  hasCriticalSafetyIssue: boolean;
  /** Economic calendar block */
  hasEconomicBlock: boolean;
}

export interface MetaEnsembleResult {
  /** Raw logit before sigmoid */
  logit: number;
  /** Trap-adjusted logit: L - γ·TrapScore */
  adjustedLogit: number;
  /** P(up) = σ(adjustedLogit) */
  pUp: number;
  /** Risk-adjusted: P_adj = P(up) · (1 - RiskScore) */
  pAdjusted: number;
  /** Platt-calibrated probability */
  pCalibrated: number;
  /** Verdict from calibrated probability */
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  /** 7-Step weight contributions */
  stepContributions: { step: string; weight: number; contribution: number }[];
  /** MLIS weight contributions */
  mlisContributions: { layer: string; weight: number; contribution: number }[];
  /** Confidence interval [low, high] from bootstrap (if available) */
  confidenceInterval: [number, number] | null;
  /** Overall confidence (0-100) */
  confidence: number;
}

// ============================================================
// Verdict probability thresholds
// ============================================================

/**
 * P(up) → Verdict mapping.
 * Deterministic and explicit.
 */
export const P_VERDICT_THRESHOLDS = {
  GO: 0.75,
  CONDITIONAL_GO: 0.60,
  WAIT: 0.45,
  // Below 0.45 → AVOID
} as const;

// ============================================================
// Bootstrap confidence
// ============================================================

export interface BootstrapResult {
  /** Point estimate of P(up) */
  pointEstimate: number;
  /** Lower bound of 90% CI */
  ci90Low: number;
  /** Upper bound of 90% CI */
  ci90High: number;
  /** Standard error of the estimate */
  standardError: number;
  /** Number of bootstrap resamples used */
  nResamples: number;
}
