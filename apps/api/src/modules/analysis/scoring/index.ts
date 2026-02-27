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

// Aggregator (legacy)
export { aggregateScores, quickStepScore } from './verdict-aggregator';

// Closed-Form Meta-Ensemble (production path)
export { aggregateWithMetaEnsemble } from './verdict-aggregator';
export type { ClosedFormAggregateInput, ClosedFormAggregateResult } from './verdict-aggregator';
export { computeMetaEnsemble, computeTrapScore, computeRiskScoreFromLevel } from './meta-ensemble.service';
export type { MetaEnsembleInput, MetaEnsembleResult, BootstrapResult } from './closed-form-scoring.types';
export { P_VERDICT_THRESHOLDS } from './closed-form-scoring.types';

// Step Score Formulas (closed-form z-score weighted scoring)
export {
  computeStepScore,
  computeAllStepScores,
  MARKET_PULSE_FEATURES,
  ASSET_SCAN_FEATURES,
  SAFETY_CHECK_FEATURES,
  TIMING_FEATURES,
  TRADE_PLAN_FEATURES,
  TRAP_CHECK_FEATURES,
  ALL_STEP_FEATURES,
} from './step-score-formulas';
export type { RollingStats, RollingStatsMap, AllStepRawValues } from './step-score-formulas';

// Correlation Reducer
export { computeCorrelationPenalty, computeMarketPulseCorrelationPenalty, pearsonCorrelation } from './correlation-reducer';

// Bootstrap Confidence Interval
export { bootstrapConfidenceInterval, confidenceFromCI } from './confidence-bootstrap';
