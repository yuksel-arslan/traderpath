/**
 * Risk Overlay Service
 *
 * Regime-aware risk management combining:
 *   1. Multi-method VaR (Historical, Parametric with Cornish-Fisher, GARCH)
 *   2. Regime-conditioned position sizing (5-level GLRS granularity)
 *   3. Volatility-scaled risk (GARCH forward variance vs long-run)
 *   4. Drawdown circuit breaker (escalating risk reduction)
 *
 * This layer sits between the scoring system and trade execution:
 *   GLRS → Risk Overlay → Position Sizing → Trade
 *
 * Methodology:
 *   - VaR: max(Historical, Cornish-Fisher Parametric, GARCH) for conservatism
 *   - Position sizing: base 2% × regimeMultiplier × volScaling × drawdownScaling
 *   - Drawdown control: linear scaling 1.0→0.25 over 0→15%, circuit break at 15%
 */

import type { LiquidityRegime } from './regime-score.types';
import type {
  RiskOverlayInput,
  RiskOverlayResult,
  VaRMetrics,
  PositionSizeOverlay,
  DrawdownState,
  RegimeRiskProfile,
} from './risk-overlay.types';

// ============================================================
// Constants
// ============================================================

const BASE_RISK_PCT = 2.0;
const MIN_RISK_PCT = 0.25;
const MAX_RISK_PCT = 3.0;
const MAX_POSITION_PCT = 50;

/** Z-scores for confidence levels */
const Z_95 = 1.6449;
const Z_99 = 2.3263;

/** Drawdown thresholds */
const DRAWDOWN_SCALE_START = 5;   // Start reducing at 5%
const DRAWDOWN_CIRCUIT_BREAK = 15; // Full stop at 15%

/** Minimum return observations for VaR */
const MIN_RETURNS_FOR_VAR = 20;

// ============================================================
// Regime risk profiles
// ============================================================

const REGIME_PROFILES: Record<LiquidityRegime, RegimeRiskProfile> = {
  strong_risk_on: {
    maxRiskPct: 3.0,
    maxExposurePct: 80,
    allowNewPositions: true,
    description: 'Expansive liquidity supports aggressive positioning',
  },
  mild_risk_on: {
    maxRiskPct: 2.5,
    maxExposurePct: 60,
    allowNewPositions: true,
    description: 'Favorable conditions, moderate positioning recommended',
  },
  neutral: {
    maxRiskPct: 2.0,
    maxExposurePct: 40,
    allowNewPositions: true,
    description: 'Mixed signals, standard risk management applies',
  },
  risk_off: {
    maxRiskPct: 1.0,
    maxExposurePct: 25,
    allowNewPositions: true,
    description: 'Deteriorating liquidity, reduce exposure significantly',
  },
  liquidity_stress: {
    maxRiskPct: 0.5,
    maxExposurePct: 10,
    allowNewPositions: false,
    description: 'Severe liquidity contraction, new positions blocked',
  },
};

/**
 * Risk % adjustment for each regime relative to BASE_RISK_PCT (2%).
 * strong_risk_on: +0.75, mild_risk_on: +0.25, neutral: 0, risk_off: -0.75, stress: -1.5
 */
const REGIME_ADJUSTMENTS: Record<LiquidityRegime, number> = {
  strong_risk_on: 0.75,
  mild_risk_on: 0.25,
  neutral: 0,
  risk_off: -0.75,
  liquidity_stress: -1.5,
};

// ============================================================
// Statistical helpers
// ============================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s < 1e-10) return 0;
  const n = arr.length;
  const sum3 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum3;
}

function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 3; // Normal distribution excess kurtosis
  const m = mean(arr);
  const s = stdDev(arr);
  if (s < 1e-10) return 3;
  const n = arr.length;
  const sum4 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
  const rawKurt = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4;
  const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return rawKurt - correction;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ============================================================
// VaR computation
// ============================================================

/**
 * Cornish-Fisher expansion for non-normal quantile.
 * Adjusts the z-score for skewness and excess kurtosis:
 *   z_CF = z + (z² - 1)/6 · S + (z³ - 3z)/24 · K - (2z³ - 5z)/36 · S²
 *
 * Where S = skewness, K = excess kurtosis, z = normal quantile.
 * This gives a more accurate VaR for fat-tailed return distributions.
 */
function cornishFisherZ(z: number, skew: number, excessKurt: number): number {
  return (
    z +
    ((z * z - 1) / 6) * skew +
    ((z * z * z - 3 * z) / 24) * excessKurt -
    ((2 * z * z * z - 5 * z) / 36) * skew * skew
  );
}

function computeVaR(returns: number[], garchVariance1d?: number): VaRMetrics {
  const defaults: VaRMetrics = {
    historicalVaR95: 0,
    historicalVaR99: 0,
    parametricVaR95: 0,
    cvar95: 0,
    garchVaR95: 0,
    compositeVaR95: 0,
  };

  if (returns.length < MIN_RETURNS_FOR_VAR) return defaults;

  const sorted = [...returns].sort((a, b) => a - b);
  const mu = mean(returns);
  const sigma = stdDev(returns);

  // Historical VaR: empirical quantile of the return distribution
  const historicalVaR95 = -percentile(sorted, 0.05) * 100;
  const historicalVaR99 = -percentile(sorted, 0.01) * 100;

  // CVaR (Expected Shortfall): average loss beyond VaR threshold
  const varThreshold = percentile(sorted, 0.05);
  const tailReturns = sorted.filter(r => r <= varThreshold);
  const cvar95 = tailReturns.length > 0 ? -mean(tailReturns) * 100 : historicalVaR95;

  // Parametric VaR with Cornish-Fisher adjustment
  const skew = skewness(returns);
  const kurt = kurtosis(returns);
  const cfZ95 = cornishFisherZ(Z_95, skew, kurt);
  const parametricVaR95 = (mu - cfZ95 * sigma) < 0
    ? -(mu - cfZ95 * sigma) * 100
    : cfZ95 * sigma * 100;

  // GARCH VaR: use the forward-looking variance forecast
  let garchVaR95 = 0;
  if (garchVariance1d !== undefined && garchVariance1d > 0) {
    const garchSigma = Math.sqrt(garchVariance1d);
    // Cornish-Fisher adjusted using the same skew/kurtosis from historical
    const cfGarch = cornishFisherZ(Z_95, skew, kurt);
    garchVaR95 = cfGarch * garchSigma * 100;
  }

  // Composite: conservative (take the maximum)
  const compositeVaR95 = Math.max(historicalVaR95, parametricVaR95, garchVaR95);

  return {
    historicalVaR95: round(historicalVaR95),
    historicalVaR99: round(historicalVaR99),
    parametricVaR95: round(parametricVaR95),
    cvar95: round(cvar95),
    garchVaR95: round(garchVaR95),
    compositeVaR95: round(compositeVaR95),
  };
}

// ============================================================
// Drawdown state
// ============================================================

function computeDrawdownState(equity: number, hwm: number): DrawdownState {
  const drawdownPct = hwm > 0 ? ((hwm - equity) / hwm) * 100 : 0;
  const dd = Math.max(0, drawdownPct);

  let severity: DrawdownState['severity'];
  if (dd < 2) severity = 'none';
  else if (dd < 5) severity = 'mild';
  else if (dd < 10) severity = 'moderate';
  else if (dd < 15) severity = 'severe';
  else severity = 'critical';

  const circuitBreakerActive = dd >= DRAWDOWN_CIRCUIT_BREAK;

  // Linear scaling from 1.0 at DRAWDOWN_SCALE_START to 0.25 at DRAWDOWN_CIRCUIT_BREAK
  let drawdownScaling = 1.0;
  if (dd > DRAWDOWN_SCALE_START) {
    const range = DRAWDOWN_CIRCUIT_BREAK - DRAWDOWN_SCALE_START;
    const depth = Math.min(dd - DRAWDOWN_SCALE_START, range);
    drawdownScaling = 1.0 - (depth / range) * 0.75; // 1.0 → 0.25
  }
  if (circuitBreakerActive) drawdownScaling = 0;

  return {
    currentDrawdownPct: round(dd),
    circuitBreakerActive,
    drawdownScaling: round(drawdownScaling),
    severity,
  };
}

// ============================================================
// Volatility scaling
// ============================================================

/**
 * Scale risk based on current volatility vs long-run average.
 *
 * When GARCH variance ratio (current/long-run) is available:
 *   ratio < 0.6  → volScale = 1.3 (low vol: can take more risk)
 *   ratio 0.6-1.4 → volScale = 1.0 (normal)
 *   ratio 1.4-2.5 → volScale = 0.6 (high vol: reduce risk)
 *   ratio > 2.5  → volScale = 0.3 (extreme vol: minimal risk)
 *
 * Without GARCH, uses annualized vol thresholds:
 *   vol < 30%  → 1.2
 *   vol 30-60% → 1.0
 *   vol 60-100% → 0.6
 *   vol > 100% → 0.3
 */
function computeVolatilityScaling(
  returns: number[],
  garchVarianceRatio?: number,
  garchAnnualizedVol?: number,
): number {
  // Prefer GARCH variance ratio (regime-switching aware)
  if (garchVarianceRatio !== undefined) {
    if (garchVarianceRatio < 0.6) return 1.3;
    if (garchVarianceRatio <= 1.4) return 1.0;
    if (garchVarianceRatio <= 2.5) return 0.6;
    return 0.3;
  }

  // Use GARCH annualized vol if available
  if (garchAnnualizedVol !== undefined) {
    if (garchAnnualizedVol < 30) return 1.2;
    if (garchAnnualizedVol <= 60) return 1.0;
    if (garchAnnualizedVol <= 100) return 0.6;
    return 0.3;
  }

  // Fallback: compute realized vol from returns
  if (returns.length < 10) return 1.0;
  const sigma = stdDev(returns);
  const annualized = sigma * Math.sqrt(252) * 100;
  if (annualized < 30) return 1.2;
  if (annualized <= 60) return 1.0;
  if (annualized <= 100) return 0.6;
  return 0.3;
}

// ============================================================
// Conviction adjustment
// ============================================================

/**
 * Adjust risk based on analysis conviction signals.
 * Range: -0.75% to +0.50%
 */
function computeConvictionAdjustment(
  safetyScore: number,
  confidence: number,
  riskLevel: RiskOverlayInput['riskLevel'],
): number {
  let adj = 0;

  // Safety score (1-10)
  if (safetyScore >= 8) adj += 0.25;
  else if (safetyScore < 5) adj -= 0.25;

  // Confidence (0-100)
  if (confidence >= 80) adj += 0.25;
  else if (confidence < 50) adj -= 0.25;

  // Risk level
  if (riskLevel === 'critical') adj -= 0.75;
  else if (riskLevel === 'high') adj -= 0.25;

  return adj;
}

// ============================================================
// Main computation
// ============================================================

function round(val: number, decimals = 2): number {
  const m = 10 ** decimals;
  return Math.round(val * m) / m;
}

/**
 * Compute the full risk overlay.
 *
 * Flow:
 *   1. Compute VaR metrics from return distribution
 *   2. Assess drawdown state and scaling
 *   3. Compute volatility scaling from GARCH or realized vol
 *   4. Look up regime risk profile
 *   5. Combine all adjustments into final position size
 *   6. Check proceed/block conditions
 */
export function computeRiskOverlay(input: RiskOverlayInput): RiskOverlayResult {
  const {
    glrsScore,
    regime,
    returns,
    garchVariance1d,
    garchAnnualizedVol,
    garchVarianceRatio,
    accountEquity,
    highWaterMark,
    entryPrice,
    stopLossPrice,
    direction,
    safetyScore,
    confidence,
    riskLevel,
  } = input;

  const warnings: string[] = [];

  // Step 1: VaR
  const varMetrics = computeVaR(returns, garchVariance1d);

  // Step 2: Drawdown
  const drawdown = computeDrawdownState(accountEquity, highWaterMark);

  // Step 3: Volatility scaling
  const volatilityScaling = computeVolatilityScaling(returns, garchVarianceRatio, garchAnnualizedVol);

  // Step 4: Regime profile
  const regimeProfile = REGIME_PROFILES[regime];
  const regimeAdjustment = REGIME_ADJUSTMENTS[regime];

  // Step 5: Conviction
  const convictionAdjustment = computeConvictionAdjustment(safetyScore, confidence, riskLevel);

  // Step 6: Combine into position size
  let adjustedRiskPct = BASE_RISK_PCT + regimeAdjustment + convictionAdjustment;

  // Apply volatility scaling
  adjustedRiskPct *= volatilityScaling;

  // Apply drawdown scaling
  adjustedRiskPct *= drawdown.drawdownScaling;

  // Clamp to regime max and absolute bounds
  adjustedRiskPct = Math.max(MIN_RISK_PCT, Math.min(regimeProfile.maxRiskPct, adjustedRiskPct));
  adjustedRiskPct = Math.max(MIN_RISK_PCT, Math.min(MAX_RISK_PCT, adjustedRiskPct));

  // Stop distance
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const safeStopDistance = stopDistance > 0 ? stopDistance : entryPrice * 0.015;
  const stopPct = (safeStopDistance / entryPrice) * 100;

  // Position size = riskPct / stopPct * 100
  const rawPositionPct = (adjustedRiskPct / stopPct) * 100;
  const positionPct = Math.min(rawPositionPct, regimeProfile.maxExposurePct, MAX_POSITION_PCT);
  const positionUsd = accountEquity * positionPct / 100;
  const maxLossUsd = accountEquity * adjustedRiskPct / 100;

  // Step 7: Proceed/block conditions
  let proceed = true;

  if (drawdown.circuitBreakerActive) {
    proceed = false;
    warnings.push(`Circuit breaker: ${drawdown.currentDrawdownPct.toFixed(1)}% drawdown exceeds ${DRAWDOWN_CIRCUIT_BREAK}% limit`);
  }

  if (!regimeProfile.allowNewPositions) {
    proceed = false;
    warnings.push(`Regime '${regime}' blocks new positions (GLRS=${glrsScore.toFixed(1)})`);
  }

  if (riskLevel === 'critical') {
    warnings.push('Asset classified as critical risk — position size heavily reduced');
  }

  if (volatilityScaling <= 0.3) {
    warnings.push('Extreme volatility detected — position size reduced to minimum');
  }

  if (drawdown.severity === 'severe') {
    warnings.push(`Severe drawdown (${drawdown.currentDrawdownPct.toFixed(1)}%) — risk significantly reduced`);
  }

  // VaR-based warning: if 1-day potential loss exceeds risk budget
  if (varMetrics.compositeVaR95 > adjustedRiskPct * 2) {
    warnings.push(`VaR(95%)=${varMetrics.compositeVaR95.toFixed(1)}% exceeds 2× risk budget (${(adjustedRiskPct * 2).toFixed(1)}%)`);
  }

  const position: PositionSizeOverlay = {
    baseRiskPct: BASE_RISK_PCT,
    regimeAdjustment: round(regimeAdjustment),
    volatilityScaling: round(volatilityScaling),
    drawdownAdjustment: round(drawdown.drawdownScaling - 1), // negative when reducing
    convictionAdjustment: round(convictionAdjustment),
    adjustedRiskPct: round(adjustedRiskPct),
    positionPct: round(positionPct),
    positionUsd: round(positionUsd),
    maxLossUsd: round(maxLossUsd),
  };

  return {
    var: varMetrics,
    position,
    drawdown,
    regimeProfile,
    proceed,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Utility: convert candles to log returns
// ============================================================

/**
 * Extract log returns from OHLCV close prices.
 * Exported for use by callers who have candle data but not returns.
 */
export function candlesToLogReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  return returns;
}

// ============================================================
// Utility: regime-aware Kelly fraction
// ============================================================

/**
 * Half-Kelly sizing adjusted for regime.
 *
 * Kelly fraction: f* = (p * b - q) / b
 *   Where p = win probability, q = 1-p, b = avg win / avg loss
 *
 * We use half-Kelly for safety, further scaled by regime multiplier.
 * Returns suggested risk % (not position %).
 */
export function regimeAdjustedKelly(
  winRate: number,
  avgWinPct: number,
  avgLossPct: number,
  regime: LiquidityRegime,
): number {
  if (avgLossPct <= 0 || winRate <= 0 || winRate >= 1) return MIN_RISK_PCT;

  const p = winRate;
  const q = 1 - p;
  const b = avgWinPct / avgLossPct;

  const kellyFraction = (p * b - q) / b;
  if (kellyFraction <= 0) return MIN_RISK_PCT; // Negative edge → minimum

  // Half-Kelly for safety
  const halfKelly = kellyFraction / 2;

  // Regime scaling
  const regimeMultiplier: Record<LiquidityRegime, number> = {
    strong_risk_on: 1.0,
    mild_risk_on: 0.85,
    neutral: 0.7,
    risk_off: 0.4,
    liquidity_stress: 0.15,
  };

  const scaled = halfKelly * 100 * regimeMultiplier[regime];
  return round(Math.max(MIN_RISK_PCT, Math.min(MAX_RISK_PCT, scaled)));
}
