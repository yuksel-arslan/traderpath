/**
 * Risk Engine — barrel export (TASK 2.3)
 *
 * All risk calculations are pure functions.
 * No side-effects, no async, fully unit-testable.
 *
 * Usage:
 *   import { calculateStopLoss, calculateTakeProfits, calculatePositionSize } from './risk';
 *   import { classifyRiskLevel, estimateWinRate } from './risk';
 *   import type { StopLossResult, TakeProfitResult, RiskLevel } from './risk';
 */

// ── Interfaces + shared types ────────────────────────────────────────
export type {
  Direction,
  RiskLevel,
  TradeStyle,
  StopLossInput,
  StopLossResult,
  TakeProfitInput,
  TakeProfitResult,
  TakeProfitLevel,
  PositionSizeInput,
  PositionSizeResult,
  WinRateInput,
  RiskLevelInput,
  RiskLevelResult,
} from './risk-engine.interface';
export { TRADE_STYLE_LIMITS, MIN_SL_PERCENT, MIN_TP_RR } from './risk-engine.interface';

// ── Calculators ──────────────────────────────────────────────────────
export { calculateStopLoss }    from './stop-loss.calculator';
export { calculateTakeProfits } from './take-profit.calculator';
export { calculatePositionSize } from './position-size.calculator';
export { classifyRiskLevel }    from './risk-level.classifier';
export { estimateWinRate }      from './win-rate.estimator';
