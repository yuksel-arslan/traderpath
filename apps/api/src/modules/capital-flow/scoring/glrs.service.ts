/**
 * L1 — Global Liquidity Regime Score (GLRS)
 *
 * Measures risk-on / risk-off environment on a 0–100 scale.
 *
 * Z-scores are calculated from ACTUAL historical series when available
 * (FRED provider returns 30–60 observations per series). When history
 * is not available, raw percentage changes are dampened by their
 * typical magnitude — not faked.
 *
 * Formula:
 *   GLRS_raw = Σ wᵢ · zᵢ   (DXY sign-flipped)
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
import { zScore as calcZScore, normalizeZScore } from './statistics';

// ============================================================
// Default weights (sum = 1.0)
// ============================================================

const DEFAULT_GLRS_WEIGHTS: GLRSWeights = {
  fedBS: 0.10,
  m2: 0.10,
  dxy: 0.15,
  vixTs: 0.10,
  yieldCurve: 0.10,
  netLiquidity: 0.25,
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
// Historical context for z-score computation
// ============================================================

/**
 * Historical series for proper z-score calculation.
 *
 * When provided, z-scores = (current - mean(series)) / std(series).
 * When absent, the raw percentage change is dampened by its typical
 * magnitude so that a "normal" move maps to roughly z ≈ ±1.
 *
 * The FRED provider returns `history[]` for Fed BS (30 weekly),
 * M2 (24 monthly), RRP (30 daily), TGA (30 weekly). Convert these
 * to change-series and pass here.
 */
export interface GLRSHistoricalContext {
  fedBSChanges?: number[];
  m2YoYValues?: number[];
  dxyChanges?: number[];
  vixValues?: number[];
  yieldCurveValues?: number[];
  netLiquidityChanges?: number[];
  rrpChanges?: number[];
  tgaChanges?: number[];
}

/**
 * Compute z-score from current value + historical series.
 * Falls back to value / typicalMagnitude when no history.
 */
function safeZScore(current: number, series: number[] | undefined, typicalMagnitude: number): number {
  if (series && series.length >= 5) {
    return calcZScore(current, series);
  }
  if (typicalMagnitude === 0) return 0;
  return current / typicalMagnitude;
}

function computeZScores(
  liquidity: GlobalLiquidity,
  history: GLRSHistoricalContext,
): GLRSComponents {
  const zFedBS = safeZScore(liquidity.fedBalanceSheet.change30d, history.fedBSChanges, 2);
  const zM2 = safeZScore(liquidity.m2MoneySupply.yoyGrowth, history.m2YoYValues, 3);
  const zDXY = safeZScore(liquidity.dxy.change7d, history.dxyChanges, 1);

  // VIX: inverted — low VIX = risk-on, so negate the z-score
  const vixCurrent = liquidity.vix.value;
  const zVIXts = history.vixValues && history.vixValues.length >= 5
    ? -calcZScore(vixCurrent, history.vixValues)
    : (20 - vixCurrent) / 8;

  const zYieldCurve = safeZScore(liquidity.yieldCurve.spread10y2y, history.yieldCurveValues, 1);
  const zNetLiquidity = safeZScore(liquidity.netLiquidity.change30d, history.netLiquidityChanges, 2);

  // RRP & TGA: sign-flipped (draining/spending = risk-on)
  const rrpFlipped = -liquidity.reverseRepo.change30d;
  const zRRP = history.rrpChanges && history.rrpChanges.length >= 5
    ? calcZScore(rrpFlipped, history.rrpChanges.map(v => -v))
    : rrpFlipped / 5;

  const tgaFlipped = -liquidity.treasuryGeneralAccount.change30d;
  const zTGA = history.tgaChanges && history.tgaChanges.length >= 5
    ? calcZScore(tgaFlipped, history.tgaChanges.map(v => -v))
    : tgaFlipped / 5;

  return { zFedBS, zM2, zDXY, zVIXts, zYieldCurve, zNetLiquidity, zRRP, zTGA };
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
    { name: 'Dollar (DXY)', contribution: -components.zDXY * weights.dxy, z: components.zDXY },
    { name: 'VIX', contribution: components.zVIXts * weights.vixTs, z: components.zVIXts },
    { name: 'Yield Curve', contribution: components.zYieldCurve * weights.yieldCurve, z: components.zYieldCurve },
    { name: 'Reverse Repo (RRP)', contribution: components.zRRP * weights.rrp, z: components.zRRP },
    { name: 'Treasury (TGA)', contribution: components.zTGA * weights.tga, z: components.zTGA },
  ];

  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const dominant = factors[0];
  const supportive = factors.filter(f => f.contribution > 0.01 && f.name !== dominant.name).map(f => f.name);
  const opposing = factors.filter(f => f.contribution < -0.01).map(f => f.name);

  return {
    dominant: `${dominant.name} (z=${dominant.z.toFixed(2)}, w=${dominant.contribution.toFixed(3)})`,
    supportive,
    opposing,
  };
}

// ============================================================
// Main scoring function
// ============================================================

export function calculateGLRS(
  liquidity: GlobalLiquidity,
  history: GLRSHistoricalContext = {},
  weights: GLRSWeights = DEFAULT_GLRS_WEIGHTS,
): GLRSResult {
  const components = computeZScores(liquidity, history);

  const rawScore =
    weights.fedBS * components.zFedBS +
    weights.m2 * components.zM2 -
    weights.dxy * components.zDXY +
    weights.vixTs * components.zVIXts +
    weights.yieldCurve * components.zYieldCurve +
    weights.netLiquidity * components.zNetLiquidity +
    weights.rrp * components.zRRP +
    weights.tga * components.zTGA;

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

export function isGLRSTradeFavorable(glrs: GLRSResult): boolean {
  return glrs.score >= 45;
}

export function getDefaultGLRSWeights(): GLRSWeights {
  return { ...DEFAULT_GLRS_WEIGHTS };
}
