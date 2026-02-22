/**
 * Scoring Engine Interface (TASK 2.2)
 *
 * Formalises the contract between each analysis step and the final verdict.
 *
 * Key design decisions:
 *  - Each step produces a StepScore (standardised shape).
 *  - VerdictAggregator computes the final score using bundle-aware weights,
 *    so scalping analyses weight Timing/TrapCheck higher than Swing analyses.
 *  - ScoringEngine<TInput> is a generic interface; step-specific scorers
 *    implement it with their own input type.
 */

import type { BundleType } from '../bundles/indicator-bundle.interface';

// ============================================================
// Core value types
// ============================================================

export type StepName =
  | 'marketPulse'
  | 'assetScan'
  | 'safetyCheck'
  | 'timing'
  | 'trapCheck'
  | 'tradePlan';

export type Verdict = 'go' | 'conditional_go' | 'wait' | 'avoid';

export interface ScoreReason {
  factor: string;
  positive: boolean;
  impact: 'high' | 'medium' | 'low';
  source?: string;
}

// ============================================================
// StepScore — output of every scorer
// ============================================================

export interface StepScore {
  /** Which analysis step produced this */
  step: StepName;
  /** Normalised 0–10 score for this step */
  score: number;
  /** 0–100 confidence this score is accurate */
  confidence: number;
  /** Human-readable scoring factors */
  reasons: ScoreReason[];
}

// ============================================================
// ScoringEngine — generic interface every scorer implements
// ============================================================

/**
 * A ScoringEngine transforms one step's raw output into a StepScore.
 * Implementations must be pure — no side-effects, no async.
 *
 * Example:
 *   class AssetScanScorer implements ScoringEngine<AssetScanResult> {
 *     readonly step = 'assetScan' as const;
 *     score(input: AssetScanResult): StepScore { ... }
 *   }
 */
export interface ScoringEngine<TInput> {
  readonly step: StepName;
  score(input: TInput): StepScore;
}

// ============================================================
// Bundle-aware weight tables
// ============================================================

/** Per-step weight for each bundle type (rows must sum to 1.0) */
export const STEP_WEIGHTS: Record<BundleType, Record<StepName, number>> = {
  /**
   * Scalping (5m/15m): Micro-structure matters.
   * Timing and trap detection are the edge.
   * Macro trend is less relevant (short hold).
   */
  scalping: {
    marketPulse: 0.10,
    assetScan:   0.20,
    safetyCheck: 0.20,
    timing:      0.25,
    trapCheck:   0.25,
    tradePlan:   0.00, // redistributed to timing/trap
  },

  /**
   * Day trading (30m–4h): Balanced approach.
   * Mirrors the legacy hardcoded weights.
   */
  day: {
    marketPulse: 0.20,
    assetScan:   0.25,
    safetyCheck: 0.25,
    timing:      0.15,
    trapCheck:   0.15,
    tradePlan:   0.00, // added separately when plan exists
  },

  /**
   * Swing trading (1d): Macro trend dominates.
   * Timing / trap are less critical for multi-day holds.
   */
  swing: {
    marketPulse: 0.30,
    assetScan:   0.30,
    safetyCheck: 0.20,
    timing:      0.10,
    trapCheck:   0.10,
    tradePlan:   0.00, // added separately when plan exists
  },
} as const;

/**
 * When a TradePlan step score is available, redistribute its weight from
 * the largest contributor(s) to create a 6-component aggregate.
 *
 * Trade plan weight: 0.15 across all bundle types.
 * Source of weight reduction: the top two steps lose 0.075 each.
 */
export const TRADE_PLAN_WEIGHT = 0.15;

// ============================================================
// Aggregate input / output
// ============================================================

export interface AggregateInput {
  /** All step scores (5 required steps; tradePlan is optional) */
  scores: StepScore[];
  /** Bundle driving indicator + weight selection */
  bundleType: BundleType;
  /** Whether a TradePlan step score is included */
  hasTradePlan: boolean;
}

export interface ComponentScore {
  step: StepName;
  score: number;
  weight: number;
  weightedContribution: number;
}

export interface AggregateResult {
  /** Final weighted score 0–10 */
  overallScore: number;
  /** Verdict based on score + safety conditions */
  verdict: Verdict;
  /** Per-step breakdown */
  componentScores: ComponentScore[];
  /** The bundle type used for weighting */
  bundleType: BundleType;
}

// ============================================================
// Verdict threshold constants
// ============================================================

export const VERDICT_THRESHOLDS = {
  GO:             7.0,
  CONDITIONAL_GO: 5.5,
  WAIT:           3.5,
  // below WAIT → 'avoid'
} as const;
