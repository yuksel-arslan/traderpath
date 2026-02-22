/**
 * VerdictAggregator (TASK 2.2)
 *
 * Combines per-step StepScores into a final weighted score and verdict.
 *
 * Key feature: weights are BUNDLE-AWARE.
 *   - Scalping  → Timing + TrapCheck heavier (micro-structure edge)
 *   - Day       → Balanced (legacy weights)
 *   - Swing     → MarketPulse + AssetScan heavier (macro trend)
 *
 * TradePlan is an optional 6th component.
 * When present, it takes 0.15 weight; the top two steps lose 0.075 each.
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
