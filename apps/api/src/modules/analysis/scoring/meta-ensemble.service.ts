/**
 * Meta-Ensemble Service
 *
 * Unified closed-form model that combines 7-Step scores + MLIS outputs
 * into a single calibrated probability P(up).
 *
 * Architecture:
 *   Layer 1: Score Normalization
 *     S_k ∈ [0,10] → logit space: S_norm = (S_k - 5) / 5  → [-1, +1]
 *     M_m ∈ [0,100] → logit space: M_norm = (M_m - 50) / 50 → [-1, +1]
 *
 *   Layer 2: Weighted Logit
 *     L = Σ α_k · S_norm_k + Σ β_m · M_norm_m
 *     Constraint: Σα + Σβ = 1
 *
 *   Layer 3: Trap Adjustment
 *     L_adj = L - γ · TrapScore
 *     γ = 1.5 (trap penalty coefficient)
 *
 *   Layer 4: Sigmoid
 *     P(up) = σ(λ · L_adj) = 1 / (1 + exp(-λ · L_adj))
 *     λ = 3.0 (steepness: maps ±1 logit to ~5%/95% probability)
 *
 *   Layer 5: Risk Adjustment
 *     P_adj = P(up) · (1 - RiskScore)
 *
 *   Layer 6: Platt Calibration (optional, from historical outcomes)
 *     P_cal = σ(A · P_adj · 100 + B)
 *
 *   Layer 7: Verdict
 *     P_cal ≥ 0.75 → GO
 *     P_cal ≥ 0.60 → CONDITIONAL_GO
 *     P_cal ≥ 0.45 → WAIT
 *     P_cal <  0.45 → AVOID
 *
 * Weight System:
 *   α_k (7-Step weights) vary by bundle type (scalping/day/swing).
 *   β_m (MLIS weights) are fixed.
 *   When MLIS is not available, α weights get 100% allocation.
 *   When MLIS is available, 7-Step gets 60%, MLIS gets 40%.
 */

import type {
  MetaEnsembleInput,
  MetaEnsembleResult,
} from './closed-form-scoring.types';
import { P_VERDICT_THRESHOLDS } from './closed-form-scoring.types';
import { applyPlattScaling, fitPlattScaling } from '../services/ml/platt-scaling.service';
import type { PlattParams, TrainingOutcome } from '../services/ml/platt-scaling.service';

// ============================================================
// Constants
// ============================================================

/** Sigmoid steepness: maps logit ±1 to P ≈ 5%/95% */
const SIGMOID_LAMBDA = 3.0;

/** Trap penalty coefficient */
const TRAP_GAMMA = 1.5;

/** 7-Step allocation when MLIS is available */
const STEP_ALLOCATION_WITH_MLIS = 0.60;
/** MLIS allocation when available */
const MLIS_ALLOCATION = 0.40;

// ============================================================
// 7-Step Weights per Bundle Type (sum per bundle = 1.0)
// ============================================================

type BundleType = 'scalping' | 'day' | 'swing';

interface StepWeightSet {
  marketPulse: number;
  assetScan: number;
  safetyCheck: number;
  timing: number;
  tradePlan: number;
  trapCheck: number;
}

/**
 * Relative weights within the 7-Step block.
 * These get multiplied by STEP_ALLOCATION (0.60 or 1.0).
 * Rows sum to 1.0.
 */
const STEP_WEIGHTS: Record<BundleType, StepWeightSet> = {
  scalping: {
    marketPulse: 0.08,
    assetScan:   0.17,
    safetyCheck: 0.17,
    timing:      0.22,
    tradePlan:   0.14,
    trapCheck:   0.22,
  },
  day: {
    marketPulse: 0.17,
    assetScan:   0.22,
    safetyCheck: 0.22,
    timing:      0.13,
    tradePlan:   0.13,
    trapCheck:   0.13,
  },
  swing: {
    marketPulse: 0.27,
    assetScan:   0.27,
    safetyCheck: 0.17,
    timing:      0.08,
    tradePlan:   0.13,
    trapCheck:   0.08,
  },
};

/**
 * MLIS layer weights (relative within MLIS block).
 * Sum = 1.0.
 */
const MLIS_WEIGHTS = {
  technical:  0.30,
  momentum:   0.25,
  volatility: 0.15,
  volume:     0.20,
  sentiment:  0.05,
  onchain:    0.05,
};

// ============================================================
// Utility functions
// ============================================================

function sigmoid(x: number): number {
  if (x > 500) return 1;
  if (x < -500) return 0;
  return 1 / (1 + Math.exp(-x));
}

function normalizeStep(score: number): number {
  // Map [0, 10] → [-1, +1]
  return (Math.max(0, Math.min(10, score)) - 5) / 5;
}

function normalizeMlis(score: number): number {
  // Map [0, 100] → [-1, +1]
  return (Math.max(0, Math.min(100, score)) - 50) / 50;
}

// ============================================================
// Main ensemble function
// ============================================================

/**
 * Run the meta-ensemble to produce P(up) and verdict.
 *
 * @param input - Step scores, MLIS scores, trap/risk scores, bundle type
 * @param historicalOutcomes - Optional training data for Platt calibration
 * @returns MetaEnsembleResult with full breakdown
 */
export function computeMetaEnsemble(
  input: MetaEnsembleInput,
  historicalOutcomes?: TrainingOutcome[],
): MetaEnsembleResult {
  const {
    stepScores,
    mlisScores,
    trapScore,
    riskScore,
    bundleType,
    hasTradePlan,
    hasCriticalSafetyIssue,
    hasEconomicBlock,
  } = input;

  // ── Hard blocks ──
  if (hasCriticalSafetyIssue || hasEconomicBlock) {
    return createBlockedResult(
      hasCriticalSafetyIssue ? 'Critical safety issue' : 'Economic calendar block',
      bundleType,
    );
  }

  // ── Determine if MLIS data is available ──
  const hasMLIS = mlisScores.technical > 0 || mlisScores.momentum > 0;
  const stepAllocation = hasMLIS ? STEP_ALLOCATION_WITH_MLIS : 1.0;
  const mlisAllocation = hasMLIS ? MLIS_ALLOCATION : 0;

  // ── Layer 1: Normalize scores to [-1, +1] ──
  const stepNorm = {
    marketPulse: normalizeStep(stepScores.marketPulse),
    assetScan: normalizeStep(stepScores.assetScan),
    safetyCheck: normalizeStep(stepScores.safetyCheck),
    timing: normalizeStep(stepScores.timing),
    tradePlan: normalizeStep(hasTradePlan ? stepScores.tradePlan : 5), // neutral if missing
    trapCheck: normalizeStep(stepScores.trapCheck),
  };

  const mlisNorm = {
    technical: normalizeMlis(mlisScores.technical),
    momentum: normalizeMlis(mlisScores.momentum),
    volatility: normalizeMlis(mlisScores.volatility),
    volume: normalizeMlis(mlisScores.volume),
    sentiment: normalizeMlis(mlisScores.sentiment ?? 50),
    onchain: normalizeMlis(mlisScores.onchain ?? 50),
  };

  // ── Layer 2: Weighted logit ──
  const weights = STEP_WEIGHTS[bundleType];

  // Step contributions
  const stepContributions: { step: string; weight: number; contribution: number }[] = [];
  let stepLogit = 0;

  for (const [key, w] of Object.entries(weights)) {
    const normVal = stepNorm[key as keyof typeof stepNorm];
    const effectiveWeight = w * stepAllocation;
    const contrib = normVal * effectiveWeight;
    stepLogit += contrib;
    stepContributions.push({
      step: key,
      weight: parseFloat(effectiveWeight.toFixed(4)),
      contribution: parseFloat(contrib.toFixed(4)),
    });
  }

  // MLIS contributions
  const mlisContributions: { layer: string; weight: number; contribution: number }[] = [];
  let mlisLogit = 0;

  if (hasMLIS) {
    for (const [key, w] of Object.entries(MLIS_WEIGHTS)) {
      const normVal = mlisNorm[key as keyof typeof mlisNorm];
      const effectiveWeight = w * mlisAllocation;
      const contrib = normVal * effectiveWeight;
      mlisLogit += contrib;
      mlisContributions.push({
        layer: key,
        weight: parseFloat(effectiveWeight.toFixed(4)),
        contribution: parseFloat(contrib.toFixed(4)),
      });
    }
  }

  const logit = stepLogit + mlisLogit;

  // ── Layer 3: Trap adjustment ──
  // trapScore ∈ [0, 1]: 0 = no trap risk, 1 = definite trap
  const adjustedLogit = logit - TRAP_GAMMA * trapScore;

  // ── Layer 4: Sigmoid ──
  const pUp = sigmoid(SIGMOID_LAMBDA * adjustedLogit);

  // ── Layer 5: Risk adjustment ──
  // riskScore ∈ [0, 1]: 0 = safe, 1 = maximum risk
  const pAdjusted = pUp * (1 - Math.min(1, Math.max(0, riskScore)));

  // ── Layer 6: Platt calibration ──
  let pCalibrated: number;
  if (historicalOutcomes && historicalOutcomes.length >= 30) {
    const params = fitPlattScaling(historicalOutcomes);
    pCalibrated = applyPlattScaling(pAdjusted * 100, params);
  } else {
    // Without training data, use direct mapping
    pCalibrated = pAdjusted;
  }

  // ── Layer 7: Verdict ──
  const verdict = resolveVerdictFromProbability(pCalibrated);

  // ── Confidence ──
  // Confidence is distance from decision boundary × 100
  // At P=0.5, confidence=0. At P=0.9 or P=0.1, confidence~80.
  const confidence = parseFloat(
    Math.min(100, Math.abs(pCalibrated - 0.5) * 200).toFixed(1)
  );

  return {
    logit: parseFloat(logit.toFixed(4)),
    adjustedLogit: parseFloat(adjustedLogit.toFixed(4)),
    pUp: parseFloat(pUp.toFixed(4)),
    pAdjusted: parseFloat(pAdjusted.toFixed(4)),
    pCalibrated: parseFloat(pCalibrated.toFixed(4)),
    verdict,
    stepContributions,
    mlisContributions,
    confidenceInterval: null, // Populated by bootstrap service
    confidence,
  };
}

// ============================================================
// Verdict from probability
// ============================================================

function resolveVerdictFromProbability(p: number): MetaEnsembleResult['verdict'] {
  if (p >= P_VERDICT_THRESHOLDS.GO) return 'go';
  if (p >= P_VERDICT_THRESHOLDS.CONDITIONAL_GO) return 'conditional_go';
  if (p >= P_VERDICT_THRESHOLDS.WAIT) return 'wait';
  return 'avoid';
}

function createBlockedResult(reason: string, bundleType: BundleType): MetaEnsembleResult {
  return {
    logit: -Infinity,
    adjustedLogit: -Infinity,
    pUp: 0,
    pAdjusted: 0,
    pCalibrated: 0,
    verdict: 'avoid',
    stepContributions: Object.keys(STEP_WEIGHTS[bundleType]).map(step => ({
      step, weight: 0, contribution: 0,
    })),
    mlisContributions: [],
    confidenceInterval: null,
    confidence: 100, // 100% confident in the block
  };
}

// ============================================================
// Extract trap score from raw step data
// ============================================================

/**
 * Convert trap check features into a unified trap score (0-1).
 *
 * TrapScore = f(liquidation_z, oi_delta, flow_divergence)
 *
 * Simplified: weighted sum of trap signals, clamped to [0, 1].
 */
export function computeTrapScore(trapData: {
  bullTrapDetected: boolean;
  bearTrapDetected: boolean;
  fakeoutRisk: 'low' | 'medium' | 'high';
  lowVolumeBreakout: boolean;
  oiDivergence?: number;  // z-score, positive = divergence
}): number {
  let score = 0;

  if (trapData.bullTrapDetected) score += 0.35;
  if (trapData.bearTrapDetected) score += 0.35;

  if (trapData.fakeoutRisk === 'high') score += 0.20;
  else if (trapData.fakeoutRisk === 'medium') score += 0.10;

  if (trapData.lowVolumeBreakout) score += 0.15;

  // OI divergence: positive z-score means OI diverges from price
  if (trapData.oiDivergence !== undefined) {
    score += Math.min(0.15, Math.max(0, trapData.oiDivergence * 0.05));
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Convert risk classification into a unified risk score (0-1).
 *
 * Maps from the existing risk level classifier output.
 */
export function computeRiskScoreFromLevel(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  riskScoreRaw?: number,  // 0-100 from classifier, if available
): number {
  if (riskScoreRaw !== undefined) {
    // Invert: classifier has 100=safest, we need 0=safest
    return 1 - Math.max(0, Math.min(100, riskScoreRaw)) / 100;
  }

  // Fallback from level
  switch (riskLevel) {
    case 'low': return 0.1;
    case 'medium': return 0.3;
    case 'high': return 0.6;
    case 'critical': return 0.9;
  }
}
