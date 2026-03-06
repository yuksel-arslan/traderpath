/**
 * VerdictAggregator (TASK 2.2)
 *
 * Two modes of operation:
 *
 * 1. LEGACY (aggregateScores):
 *    Combines per-step StepScores into a weighted 0-10 score → verdict.
 *    Bundle-aware weights (scalping/day/swing).
 *
 * 2. CLOSED-FORM (aggregateWithMetaEnsemble):
 *    Feeds step scores + MLIS into the meta-ensemble:
 *    P(up) = σ(Σα·S + Σβ·M) → verdict from probability thresholds.
 *    Includes trap/risk adjustments and bootstrap CI.
 *
 * The closed-form path is preferred for production use.
 * The legacy path remains for backward compatibility.
 */

import type {
  AggregateInput,
  AggregateResult,
  ComponentScore,
  Verdict,
  StepName,
} from './scoring-engine.interface';
import {
  STEP_WEIGHTS,
  TRADE_PLAN_WEIGHT,
  VERDICT_THRESHOLDS,
} from './scoring-engine.interface';
import type { BundleType } from '../bundles/indicator-bundle.interface';
import type { MetaEnsembleInput, MetaEnsembleResult } from './closed-form-scoring.types';
import { computeMetaEnsemble, computeTrapScore, computeRiskScoreFromLevel } from './meta-ensemble.service';
import { bootstrapConfidenceInterval, confidenceFromCI } from './confidence-bootstrap';
import type { TrainingOutcome } from '../services/ml/platt-scaling.service';

// ============================================================
// Weight helpers
// ============================================================

/**
 * Build the final weight map for 5 steps (no trade plan).
 */
function buildWeights(bundleType: BundleType): Record<StepName, number> {
  const base = { ...STEP_WEIGHTS[bundleType] };
  delete (base as Record<string, number>).tradePlan;
  return base;
}

/**
 * When a tradePlan score exists, take TRADE_PLAN_WEIGHT (0.15) from the two
 * highest-weighted steps, 0.075 each.
 */
function buildWeightsWithTradePlan(bundleType: BundleType): Record<StepName, number> {
  const base = buildWeights(bundleType);

  // Sort step names by descending weight to find top-2
  const sorted = (Object.entries(base) as [StepName, number][])
    .filter(([, w]) => w > 0)
    .sort(([, a], [, b]) => b - a);

  const deduction = TRADE_PLAN_WEIGHT / 2;
  if (sorted.length >= 2) {
    base[sorted[0][0]] = parseFloat((sorted[0][1] - deduction).toFixed(3));
    base[sorted[1][0]] = parseFloat((sorted[1][1] - deduction).toFixed(3));
  }
  base.tradePlan = TRADE_PLAN_WEIGHT;

  return base;
}

// ============================================================
// Verdict from score
// ============================================================

function resolveVerdict(
  score: number,
  hasCriticalSafetyIssue: boolean,
  hasEconomicBlock: boolean,
): Verdict {
  if (hasEconomicBlock) return 'avoid';
  // Critical safety is an unconditional block — regardless of other scores
  if (hasCriticalSafetyIssue) return 'avoid';
  if (score >= VERDICT_THRESHOLDS.GO)             return 'go';
  if (score >= VERDICT_THRESHOLDS.CONDITIONAL_GO) return 'conditional_go';
  if (score >= VERDICT_THRESHOLDS.WAIT)           return 'wait';
  return 'avoid';
}

// ============================================================
// Main aggregator function
// ============================================================

/**
 * Aggregate step scores into a final result.
 *
 * @param input.scores        — Array of StepScore from each step scorer
 * @param input.bundleType    — 'scalping' | 'day' | 'swing'
 * @param input.hasTradePlan  — Whether a tradePlan StepScore is included
 */
export function aggregateScores(input: AggregateInput): AggregateResult {
  const { scores, bundleType, hasTradePlan } = input;

  const weights = hasTradePlan
    ? buildWeightsWithTradePlan(bundleType)
    : buildWeights(bundleType);

  // Build component scores (only for steps that have a score in the input)
  const componentScores: ComponentScore[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const stepScore of scores) {
    const weight = weights[stepScore.step] ?? 0;
    if (weight === 0) continue;

    const contribution = stepScore.score * weight;
    weightedSum += contribution;
    totalWeight += weight;

    componentScores.push({
      step: stepScore.step,
      score: stepScore.score,
      weight,
      weightedContribution: parseFloat(contribution.toFixed(2)),
    });
  }

  // Normalise to 0-10 (handles case where not all 5 steps present)
  const overallScore = totalWeight > 0
    ? parseFloat((weightedSum / totalWeight).toFixed(1))
    : 0;

  // Detect conditions that modify the verdict
  const safetyScore = scores.find(s => s.step === 'safetyCheck');
  const pulseScore  = scores.find(s => s.step === 'marketPulse');

  const hasCriticalSafetyIssue = safetyScore
    ? safetyScore.score <= 2
    : false;

  const hasEconomicBlock = pulseScore
    ? pulseScore.reasons.some(r => r.source === 'Economic Calendar' && !r.positive)
    : false;

  const verdict = resolveVerdict(overallScore, hasCriticalSafetyIssue, hasEconomicBlock);

  return {
    overallScore,
    verdict,
    componentScores,
    bundleType,
  };
}

// ============================================================
// Convenience: map existing engine step results to AggregateInput
// ============================================================

/**
 * Lightweight adapter: wraps a flat `{ score, gate }` step result
 * into a StepScore without full scorer logic (for engine integration).
 */
export function quickStepScore(
  step: StepName,
  engineResult: { score: number; gate?: { canProceed: boolean; confidence: number } },
): import('./scoring-engine.interface').StepScore {
  return {
    step,
    score: Math.max(1, Math.min(10, engineResult.score)),
    confidence: engineResult.gate?.confidence ?? 50,
    reasons: [],
  };
}

// ============================================================
// CLOSED-FORM META-ENSEMBLE AGGREGATION
// ============================================================

/**
 * Input for the closed-form aggregation path.
 */
export interface ClosedFormAggregateInput {
  /** 7-Step scores (each 0-10) */
  stepScores: {
    marketPulse: number;
    assetScan: number;
    safetyCheck: number;
    timing: number;
    tradePlan: number;
    trapCheck: number;
  };
  /** MLIS layer scores (each 0-100), optional */
  mlisScores?: {
    technical: number;
    momentum: number;
    volatility: number;
    volume: number;
    sentiment?: number;
    onchain?: number;
  };
  /** Trap detection data */
  trapData: {
    bullTrapDetected: boolean;
    bearTrapDetected: boolean;
    fakeoutRisk: 'low' | 'medium' | 'high';
    lowVolumeBreakout: boolean;
    oiDivergence?: number;
  };
  /** Risk level from safety check */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Raw risk score (0-100, higher = safer) from classifier */
  riskScoreRaw?: number;
  /** Bundle type for weight selection */
  bundleType: BundleType;
  /** Whether trade plan exists */
  hasTradePlan: boolean;
  /** Critical safety issue detected */
  hasCriticalSafetyIssue: boolean;
  /** Economic calendar blocks trading */
  hasEconomicBlock: boolean;
  /** Historical outcomes for Platt calibration (optional) */
  historicalOutcomes?: TrainingOutcome[];
}

/**
 * Extended result from the closed-form aggregation.
 */
export interface ClosedFormAggregateResult {
  /** Legacy-compatible overall score (0-10) */
  overallScore: number;
  /** Verdict from meta-ensemble probability */
  verdict: Verdict;
  /** P(up) probability (0-1) */
  probability: number;
  /** Calibrated probability (0-1) */
  calibratedProbability: number;
  /** Bootstrap confidence interval [low, high] */
  confidenceInterval: [number, number];
  /** Confidence level (0-100) */
  confidence: number;
  /** Raw logit from ensemble */
  logit: number;
  /** Full meta-ensemble result */
  ensemble: MetaEnsembleResult;
  /** Bundle type used */
  bundleType: BundleType;
}

/**
 * Closed-form meta-ensemble aggregation.
 *
 * Combines 7-Step scores + MLIS outputs into a unified P(up):
 *   L = Σ α_k · S_norm_k + Σ β_m · M_norm_m
 *   P(up) = σ(λ · (L - γ · TrapScore))
 *   P_adj = P(up) · (1 - RiskScore)
 *   Verdict from P thresholds
 *
 * @param input - Step scores, MLIS scores, trap/risk data
 * @returns ClosedFormAggregateResult with probability and verdict
 */
export function aggregateWithMetaEnsemble(
  input: ClosedFormAggregateInput,
): ClosedFormAggregateResult {
  // Compute trap and risk scores
  const trapScore = computeTrapScore(input.trapData);
  const riskScore = computeRiskScoreFromLevel(input.riskLevel, input.riskScoreRaw);

  // Build meta-ensemble input
  const ensembleInput: MetaEnsembleInput = {
    stepScores: input.stepScores,
    mlisScores: input.mlisScores ?? {
      technical: 50, momentum: 50, volatility: 50, volume: 50,
    },
    trapScore,
    riskScore,
    bundleType: input.bundleType,
    hasTradePlan: input.hasTradePlan,
    hasCriticalSafetyIssue: input.hasCriticalSafetyIssue,
    hasEconomicBlock: input.hasEconomicBlock,
  };

  // Run meta-ensemble
  const ensemble = computeMetaEnsemble(ensembleInput, input.historicalOutcomes);

  // Bootstrap confidence interval
  const bootstrap = bootstrapConfidenceInterval(
    ensemble.logit,
    undefined, // feature uncertainties — will use defaults
    undefined, // feature weights — will use defaults
    3.0,       // sigmoid lambda
    trapScore,
    riskScore,
  );

  const confidence = confidenceFromCI(bootstrap);

  // Update ensemble with CI
  ensemble.confidenceInterval = [bootstrap.ci90Low, bootstrap.ci90High];
  ensemble.confidence = confidence;

  // Legacy-compatible score: map P(up) back to 0-10 scale
  // P=0.75 → 7.5 (GO threshold), P=0.55 → 5.5, P=0.45 → 4.5
  const overallScore = parseFloat((ensemble.pCalibrated * 10).toFixed(1));

  return {
    overallScore,
    verdict: ensemble.verdict,
    probability: ensemble.pUp,
    calibratedProbability: ensemble.pCalibrated,
    confidenceInterval: [bootstrap.ci90Low, bootstrap.ci90High],
    confidence,
    logit: ensemble.logit,
    ensemble,
    bundleType: input.bundleType,
  };
}
