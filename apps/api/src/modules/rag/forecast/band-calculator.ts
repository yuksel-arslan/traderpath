/**
 * Band Calculator
 *
 * Deterministic ATR-based probability band calculation.
 * This is NOT a price prediction model - it computes statistical
 * distribution boundaries based on historical volatility.
 *
 * The LLM only provides the bias direction (up/down/sideways).
 * Band widths are purely mathematical (ATR × multiplier).
 * This prevents web content from manipulating price targets.
 *
 * Formula:
 *   bandWidth = ATR × horizonMultiplier × sqrt(barsAhead)
 *   P50 = currentPrice + (biasSign × driftMultiplier × ATR)
 *   P10 = P50 - (bandWidth × bearishFactor)
 *   P90 = P50 + (bandWidth × bullishFactor)
 */

import {
  ForecastBand,
  ForecastHorizon,
  ATR_BAND_MULTIPLIERS,
  P50_DRIFT_MULTIPLIERS,
  HORIZON_CONFIG,
} from '../types';
import { AssetClass } from '../../analysis/types/asset-metrics.types';
import { Phase } from '../../capital-flow/types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** How many bars ahead each horizon represents (for sqrt scaling) */
const BARS_AHEAD: Record<ForecastHorizon, number> = {
  short: 6,    // e.g., 6 × 1h bars
  medium: 5,   // e.g., 5 × 1d bars
  long: 4,     // e.g., 4 × 1w bars
};

/** Asset-class specific volatility adjustments */
const ASSET_VOLATILITY_FACTOR: Record<AssetClass, number> = {
  crypto: 1.3,   // Crypto is 30% more volatile → wider bands
  stocks: 1.0,   // Baseline
  metals: 0.9,   // Slightly less volatile
  bonds:  0.6,   // Much less volatile → narrower bands
  bist:   1.1,   // Slightly more volatile (emerging market)
};

/** Capital Flow phase adjustments to band width */
const PHASE_WIDTH_FACTOR: Record<Phase, number> = {
  early: 1.1,    // New trend → slightly wider (uncertainty)
  mid:   0.9,    // Established trend → slightly narrower
  late:  1.2,    // Trend exhaustion → wider (reversal risk)
  exit:  1.4,    // Capital exiting → much wider (high uncertainty)
};

// ============================================================================
// CALCULATOR
// ============================================================================

/**
 * Calculate a single forecast band for one horizon
 */
export function calculateATRBand(params: {
  currentPrice: number;
  atr: number;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;                        // 0-100
  horizon: ForecastHorizon;
  assetClass: AssetClass;
  capitalFlowPhase?: Phase;
  drivers?: string[];
  invalidations?: string[];
}): ForecastBand {
  const {
    currentPrice,
    atr,
    direction,
    confidence,
    horizon,
    assetClass,
    capitalFlowPhase,
    drivers = [],
    invalidations = [],
  } = params;

  // Validate inputs
  if (atr <= 0 || currentPrice <= 0) {
    return createFallbackBand(currentPrice, horizon, assetClass);
  }

  // ── Step 1: Calculate raw band width ─────────────────────────────
  const horizonMultiplier = ATR_BAND_MULTIPLIERS[horizon];
  const sqrtFactor = Math.sqrt(BARS_AHEAD[horizon]);
  const assetFactor = ASSET_VOLATILITY_FACTOR[assetClass];
  const phaseFactor = capitalFlowPhase ? PHASE_WIDTH_FACTOR[capitalFlowPhase] : 1.0;

  const rawBandWidth = atr * horizonMultiplier * sqrtFactor * assetFactor * phaseFactor;

  // ── Step 2: Calculate P50 (drift based on direction + confidence) ──
  const driftMultiplier = P50_DRIFT_MULTIPLIERS[horizon];
  const confidenceScale = Math.min(confidence, 100) / 100; // 0-1

  let drift = 0;
  if (direction === 'long') {
    drift = driftMultiplier * atr * confidenceScale;
  } else if (direction === 'short') {
    drift = -driftMultiplier * atr * confidenceScale;
  }
  // neutral → drift = 0

  const p50 = currentPrice + drift;

  // ── Step 3: Calculate P10 and P90 with skew ───────────────────────
  // If bullish bias, P90 is farther (more upside room), P10 is closer
  // If bearish bias, P10 is farther (more downside room), P90 is closer
  let bullishFactor = 0.5;
  let bearishFactor = 0.5;

  if (direction === 'long' && confidence > 50) {
    const skewAmount = (confidence - 50) / 200; // max 0.25 skew
    bullishFactor = 0.5 + skewAmount;
    bearishFactor = 0.5 - skewAmount;
  } else if (direction === 'short' && confidence > 50) {
    const skewAmount = (confidence - 50) / 200;
    bullishFactor = 0.5 - skewAmount;
    bearishFactor = 0.5 + skewAmount;
  }

  const p10 = p50 - rawBandWidth * bearishFactor;
  const p90 = p50 + rawBandWidth * bullishFactor;

  // ── Step 4: Ensure logical ordering P10 < P50 < P90 ──────────────
  const safeP10 = Math.min(p10, p50 * 0.99);
  const safeP90 = Math.max(p90, p50 * 1.01);

  // ── Step 5: Derive bias label ─────────────────────────────────────
  const bias: 'up' | 'down' | 'sideways' =
    direction === 'long' ? 'up' :
    direction === 'short' ? 'down' :
    'sideways';

  // ── Step 6: Calculate derived metrics ─────────────────────────────
  const confidenceWidth = safeP90 - safeP10;
  const expectedRange = (confidenceWidth / currentPrice) * 100;
  const skew = ((p50 - currentPrice) / currentPrice) * 100;

  return {
    horizon,
    timeframe: HORIZON_CONFIG[assetClass][horizon],
    expectedCandles: BARS_AHEAD[horizon],
    currentPrice,
    p10: roundPrice(safeP10, currentPrice),
    p50: roundPrice(p50, currentPrice),
    p90: roundPrice(safeP90, currentPrice),
    bias,
    drivers,
    invalidations,
    expectedRange: Math.round(expectedRange * 100) / 100,
    skew: Math.round(skew * 100) / 100,
    confidenceWidth: roundPrice(confidenceWidth, currentPrice),
    methodology: 'atr_distribution',
  };
}

/**
 * Calculate all 3 forecast bands (short/medium/long)
 */
export function calculateAllBands(params: {
  currentPrice: number;
  atr: number;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;
  assetClass: AssetClass;
  capitalFlowPhase?: Phase;
  drivers?: Record<ForecastHorizon, string[]>;
  invalidations?: Record<ForecastHorizon, string[]>;
}): ForecastBand[] {
  const horizons: ForecastHorizon[] = ['short', 'medium', 'long'];

  return horizons.map(horizon =>
    calculateATRBand({
      ...params,
      horizon,
      drivers: params.drivers?.[horizon] || [],
      invalidations: params.invalidations?.[horizon] || [],
    }),
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Round price to appropriate decimal places based on magnitude
 */
function roundPrice(price: number, referencePrice: number): number {
  if (referencePrice > 10000) return Math.round(price);           // BTC: whole numbers
  if (referencePrice > 100) return Math.round(price * 10) / 10;  // ETH/SPY: 1 decimal
  if (referencePrice > 1) return Math.round(price * 100) / 100;  // SOL: 2 decimals
  return Math.round(price * 10000) / 10000;                       // Small coins: 4 decimals
}

/**
 * Create a fallback band when inputs are invalid
 */
function createFallbackBand(
  currentPrice: number,
  horizon: ForecastHorizon,
  assetClass: AssetClass,
): ForecastBand {
  // Use a default 3% band
  const defaultRange = currentPrice * 0.03 * ATR_BAND_MULTIPLIERS[horizon];
  return {
    horizon,
    timeframe: HORIZON_CONFIG[assetClass][horizon],
    expectedCandles: BARS_AHEAD[horizon],
    currentPrice,
    p10: currentPrice - defaultRange,
    p50: currentPrice,
    p90: currentPrice + defaultRange,
    bias: 'sideways',
    drivers: [],
    invalidations: [],
    expectedRange: 6 * ATR_BAND_MULTIPLIERS[horizon],
    skew: 0,
    confidenceWidth: defaultRange * 2,
    methodology: 'atr_distribution',
  };
}
