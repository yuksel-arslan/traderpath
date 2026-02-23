/**
 * Scoring Engine — barrel export (TASK 2.2)
 *
 * Usage:
 *   import { aggregateScores, quickStepScore, STEP_WEIGHTS } from './scoring';
 *   import type { StepScore, AggregateResult, Verdict } from './scoring';
 */

// Interface + types
export type {
  StepName,
  Verdict,
  ScoreReason,
  StepScore,
  ScoringEngine,
  AggregateInput,
  AggregateResult,
  ComponentScore,
} from './scoring-engine.interface';
export { STEP_WEIGHTS, TRADE_PLAN_WEIGHT, VERDICT_THRESHOLDS } from './scoring-engine.interface';

// Per-step scorers
export {
  MarketPulseScorer,
  AssetScanScorer,
  SafetyCheckScorer,
  TimingScorer,
  TrapCheckScorer,
  TradePlanScorer,
} from './step-scorers';
export type {
  MarketPulseScorerInput,
  AssetScanScorerInput,
  SafetyCheckScorerInput,
  TimingScorerInput,
  TrapCheckScorerInput,
  TradePlanScorerInput,
} from './step-scorers';

// Aggregator
export { aggregateScores, quickStepScore } from './verdict-aggregator';
