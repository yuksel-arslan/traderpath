/**
 * Regime Scoring System — Public API
 *
 * L1: GLRS  — Global Liquidity Regime Score
 * L2: FVR   — Flow Velocity & Rotation Score
 * L3: SCI   — Sector Concentration Index
 * L4: ICS   — Instrument Conviction Score
 * Lead-Lag  — Cross-correlation matrix
 *
 * Orchestrator: calculateRegimeScore() combines L1–L3 + Lead-Lag
 * L4 (ICS) is called independently per instrument at analysis time
 */

// Types
export type {
  LiquidityRegime,
  GLRSResult,
  GLRSComponents,
  GLRSWeights,
  FlowPhase,
  MarketFVR,
  FVRResult,
  SectorSCI,
  SCIResult,
  ConvictionSignal,
  ICSResult,
  LeadLagPair,
  LeadLagResult,
  RegimeScoreResult,
} from './regime-score.types';

// L1: GLRS
export { calculateGLRS, isGLRSTradeFavorable, getDefaultGLRSWeights } from './glrs.service';

// L2: FVR
export { calculateFVR } from './fvr.service';

// L3: SCI
export { calculateSCI, getSCIConcentrationThreshold } from './sci.service';

// L4: ICS
export { calculateICS, getDefaultICSWeights } from './ics.service';
export type { ICSInput } from './ics.service';

// Lead-Lag Matrix
export { calculateLeadLagMatrix } from './lead-lag.service';

// Unified Orchestrator
export { calculateRegimeScore } from './regime-score.service';

// Statistics utilities (for backtesting and custom analysis)
export {
  zScore,
  mean,
  stdDev,
  percentileRank,
  normalizeZScore,
  crossCorrelation,
  weightedZSum,
  clamp,
} from './statistics';
