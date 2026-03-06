/**
 * Risk Overlay Types
 *
 * Regime-aware risk management that integrates:
 *   - GLRS regime classification (5 levels)
 *   - GARCH forward-looking volatility
 *   - Historical VaR / CVaR from return distributions
 *   - Drawdown-based dynamic risk reduction
 */

import type { LiquidityRegime } from './regime-score.types';

// ============================================================
// Risk overlay input
// ============================================================

export interface RiskOverlayInput {
  /** Current GLRS score (0-100) */
  glrsScore: number;
  /** Current GLRS regime */
  regime: LiquidityRegime;

  /** Asset log returns (most recent last) */
  returns: number[];

  /** GARCH 1-day forecast variance (optional, computed internally if absent) */
  garchVariance1d?: number;
  /** GARCH annualized volatility % (optional) */
  garchAnnualizedVol?: number;
  /** GARCH variance ratio (current / long-run, >1 = elevated) */
  garchVarianceRatio?: number;

  /** Account equity in USD */
  accountEquity: number;
  /** Current account high-water mark in USD */
  highWaterMark: number;

  /** Entry price of the proposed trade */
  entryPrice: number;
  /** Stop-loss price of the proposed trade */
  stopLossPrice: number;
  /** Trade direction */
  direction: 'long' | 'short';

  /** Safety score from 7-Step analysis (1-10) */
  safetyScore: number;
  /** Direction confidence from analysis (0-100) */
  confidence: number;
  /** Risk level from asset classification */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================
// Risk overlay output
// ============================================================

export interface VaRMetrics {
  /** 1-day Historical VaR at 95% confidence (% loss) */
  historicalVaR95: number;
  /** 1-day Historical VaR at 99% confidence (% loss) */
  historicalVaR99: number;
  /** 1-day Parametric VaR at 95% (Cornish-Fisher adjusted for skew/kurtosis) */
  parametricVaR95: number;
  /** 1-day CVaR / Expected Shortfall at 95% (% loss) */
  cvar95: number;
  /** GARCH-forecasted 1-day VaR at 95% (forward-looking) */
  garchVaR95: number;
  /** Maximum of historical, parametric, and GARCH VaR (conservative) */
  compositeVaR95: number;
}

export interface PositionSizeOverlay {
  /** Base risk % before any adjustments (the 2% rule) */
  baseRiskPct: number;
  /** Regime adjustment (negative = reduce risk) */
  regimeAdjustment: number;
  /** Volatility scaling factor (1.0 = normal, <1 = high vol, >1 = low vol) */
  volatilityScaling: number;
  /** Drawdown adjustment (negative when in drawdown) */
  drawdownAdjustment: number;
  /** Conviction adjustment (based on safety + confidence) */
  convictionAdjustment: number;
  /** Final adjusted risk % per trade */
  adjustedRiskPct: number;
  /** Position size as % of account */
  positionPct: number;
  /** Position size in USD */
  positionUsd: number;
  /** Maximum loss in USD at stop-loss */
  maxLossUsd: number;
}

export interface DrawdownState {
  /** Current drawdown from high-water mark (%) */
  currentDrawdownPct: number;
  /** Whether circuit breaker is active (drawdown > 15%) */
  circuitBreakerActive: boolean;
  /** Risk scaling factor from drawdown (1.0 = no drawdown, 0 = circuit breaker) */
  drawdownScaling: number;
  /** Drawdown severity level */
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'critical';
}

export interface RegimeRiskProfile {
  /** Base max risk allocation for this regime */
  maxRiskPct: number;
  /** Maximum portfolio exposure for this regime */
  maxExposurePct: number;
  /** Whether new positions are allowed */
  allowNewPositions: boolean;
  /** Regime description */
  description: string;
}

export interface RiskOverlayResult {
  /** VaR metrics */
  var: VaRMetrics;
  /** Position sizing with regime + vol + drawdown adjustments */
  position: PositionSizeOverlay;
  /** Current drawdown state */
  drawdown: DrawdownState;
  /** Risk profile for the current regime */
  regimeProfile: RegimeRiskProfile;
  /** Whether to proceed with the trade */
  proceed: boolean;
  /** Reasons for blocking or caution */
  warnings: string[];
  /** Timestamp */
  timestamp: string;
}
