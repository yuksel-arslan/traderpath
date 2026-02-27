/**
 * L1 — Global Liquidity Regime Score (GLRS)
 *
 * Measures risk-on / risk-off environment on a 0–100 scale.
 *
 * Formula:
 *   GLRS_raw = w₁·Z_BS + w₂·Z_M2 − w₃·Z_DXY + w₄·Z_VIXts + w₅·Z_YC
 *              + w₆·Z_NetLiq + w₇·Z_RRP + w₈·Z_TGA
 *
 *   GLRS_norm = clamp(50 + 10 · GLRS_raw, 0, 100)
 *
 * Regime classification:
 *   70–100 → Strong Risk-On
 *   55–70  → Mild Risk-On
 *   45–55  → Neutral
 *   30–45  → Risk-Off
 *   <30    → Liquidity Stress
 */

import type { GlobalLiquidity } from '../types';
import type { GLRSResult, GLRSComponents, GLRSWeights, LiquidityRegime } from './regime-score.types';
import { normalizeZScore, clamp } from './statistics';

// ============================================================
// Default weights (sum ≈ 1.0 for interpretability, but not required)
// ============================================================

const DEFAULT_GLRS_WEIGHTS: GLRSWeights = {
  fedBS: 0.10,
  m2: 0.10,
  dxy: 0.15,         // Inverted: strong dollar = negative
  vixTs: 0.10,
  yieldCurve: 0.10,
  netLiquidity: 0.25, // Primary indicator
  rrp: 0.10,
  tga: 0.10,
};

// ============================================================
// Regime thresholds
// ============================================================

const REGIME_THRESHOLDS: { min: number; regime: LiquidityRegime }[] = [
  { min: 70, regime: 'strong_risk_on' },
  { min: 55, regime: 'mild_risk_on' },
  { min: 45, regime: 'neutral' },
  { min: 30, regime: 'risk_off' },
  { min: 0, regime: 'liquidity_stress' },
];

function classifyRegime(score: number): LiquidityRegime {
  for (const { min, regime } of REGIME_THRESHOLDS) {
    if (score >= min) return regime;
  }
  return 'liquidity_stress';
}

// ============================================================
// Z-score derivation from GlobalLiquidity
// ============================================================

/**
 * Derive z-score proxies from the GlobalLiquidity data.
 *
 * Because we don't always have full time-series for a proper z-score,
 * we use the percentage changes and known statistical properties to
 * produce a comparable z-score proxy:
 *
 * - Fed BS YoY: change30d * 4 (annualize monthly) → z ≈ value / 3 (historical std ~3%)
 * - M2 YoY: yoyGrowth → z ≈ (value - 5) / 4 (long-run mean ~5%, std ~4%)
 * - DXY: change7d → z ≈ value / 1.5 (weekly std ~1.5%)  (INVERTED)
 * - VIX: value → z ≈ (20 - value) / 8 (mean ~20, std ~8)  (inverted so low VIX = positive)
 * - Yield Curve: spread → z ≈ (value - 0.5) / 1.0 (mean ~0.5%, std ~1%)
 * - Net Liquidity: change30d → z ≈ value / 2 (monthly std ~2%)
 * - RRP: -change30d → z ≈ value / 5 (draining = positive, std ~5%)
 * - TGA: -change30d → z ≈ value / 3 (spending = positive, std ~3%)
 */
function deriveZScores(liquidity: GlobalLiquidity): GLRSComponents {
  // Fed Balance Sheet: expanding = positive
  const fedBSAnnualized = liquidity.fedBalanceSheet.change30d * 4;
  const zFedBS = fedBSAnnualized / 3;

  // M2: above long-run mean = positive
  const zM2 = (liquidity.m2MoneySupply.yoyGrowth - 5) / 4;

  // DXY: INVERTED — weakening dollar is positive for risk
  const zDXY = liquidity.dxy.change7d / 1.5;

  // VIX: Inverted — low VIX = positive for risk
  // Also incorporate VIX level mapping
  const vixValue = liquidity.vix.value;
  const zVIXts = (20 - vixValue) / 8;

  // Yield Curve: positive spread = positive for risk
  const zYieldCurve = (liquidity.yieldCurve.spread10y2y - 0.5) / 1.0;

  // Net Liquidity: expanding = positive
  const zNetLiquidity = liquidity.netLiquidity.change30d / 2;

  // RRP: draining = positive (money entering markets)
  // Negative change = draining
  const rrpChange = liquidity.reverseRepo.change30d;
  const zRRP = -rrpChange / 5;

  // TGA: spending = positive (money entering economy)
  // Negative change = spending
  const tgaChange = liquidity.treasuryGeneralAccount.change30d;
  const zTGA = -tgaChange / 3;

  return {
    zFedBS,
    zM2,
    zDXY,
    zVIXts,
    zYieldCurve,
    zNetLiquidity,
    zRRP,
    zTGA,
  };
}

// ============================================================
// Breakdown generation
// ============================================================

function generateBreakdown(
  components: GLRSComponents,
  weights: GLRSWeights,
): GLRSResult['breakdown'] {
  const factors: { name: string; contribution: number; z: number }[] = [
    { name: 'Net Liquidity', contribution: components.zNetLiquidity * weights.netLiquidity, z: components.zNetLiquidity },
    { name: 'Fed Balance Sheet', contribution: components.zFedBS * weights.fedBS, z: components.zFedBS },
    { name: 'M2 Money Supply', contribution: components.zM2 * weights.m2, z: components.zM2 },
    { name: 'Dollar (DXY)', contribution: -components.zDXY * weights.dxy, z: -components.zDXY },
    { name: 'VIX Term Structure', contribution: components.zVIXts * weights.vixTs, z: components.zVIXts },
    { name: 'Yield Curve', contribution: components.zYieldCurve * weights.yieldCurve, z: components.zYieldCurve },
    { name: 'Reverse Repo (RRP)', contribution: components.zRRP * weights.rrp, z: components.zRRP },
    { name: 'Treasury (TGA)', contribution: components.zTGA * weights.tga, z: components.zTGA },
  ];

  // Sort by absolute contribution
  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const dominant = factors[0];
  const supportive = factors
    .filter(f => f.contribution > 0 && f.name !== dominant.name)
    .map(f => f.name);
  const opposing = factors
    .filter(f => f.contribution < -0.05)
    .map(f => f.name);

  return {
    dominant: `${dominant.name} (z=${dominant.z.toFixed(2)}, contribution=${dominant.contribution.toFixed(3)})`,
    supportive,
    opposing,
  };
}

// ============================================================
// Main scoring function
// ============================================================

/**
 * Calculate the Global Liquidity Regime Score (GLRS).
 *
 * @param liquidity - Current GlobalLiquidity data from capital-flow service
 * @param weights   - Optional custom weights (for backtesting / calibration)
 * @returns GLRSResult with score, regime, and component breakdown
 */
export function calculateGLRS(
  liquidity: GlobalLiquidity,
  weights: GLRSWeights = DEFAULT_GLRS_WEIGHTS,
): GLRSResult {
  const components = deriveZScores(liquidity);

  // Weighted sum: positive z-scores are risk-on, DXY is subtracted
  const rawScore =
    weights.fedBS * components.zFedBS +
    weights.m2 * components.zM2 -
    weights.dxy * components.zDXY +
    weights.vixTs * components.zVIXts +
    weights.yieldCurve * components.zYieldCurve +
    weights.netLiquidity * components.zNetLiquidity +
    weights.rrp * components.zRRP +
    weights.tga * components.zTGA;

  // Normalize: 50 + 10 * rawScore, clamped to [0, 100]
  const score = normalizeZScore(rawScore);

  const regime = classifyRegime(score);
  const breakdown = generateBreakdown(components, weights);

  return {
    rawScore: parseFloat(rawScore.toFixed(4)),
    score: parseFloat(score.toFixed(1)),
    regime,
    components,
    weights,
    breakdown,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick check: is the GLRS score above the trade-favorable threshold?
 */
export function isGLRSTradeFavorable(glrs: GLRSResult): boolean {
  return glrs.score >= 45; // Neutral or above
}

/**
 * Get the default GLRS weights (useful for frontend display).
 */
export function getDefaultGLRSWeights(): GLRSWeights {
  return { ...DEFAULT_GLRS_WEIGHTS };
}
