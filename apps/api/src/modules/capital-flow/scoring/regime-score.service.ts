/**
 * Unified Regime Score Service
 *
 * Orchestrates all four scoring layers + lead-lag analysis
 * into a single RegimeScoreResult.
 *
 * Layers:
 *   L1 — GLRS  (Global Liquidity Regime Score)
 *   L2 — FVR   (Flow Velocity & Rotation Score)
 *   L3 — SCI   (Sector Concentration Index)
 *   Lead-Lag   (Cross-correlation matrix)
 *
 * L4 (ICS) is computed per-instrument at analysis time,
 * not in this summary pipeline.
 */

import type { GlobalLiquidity, MarketFlow } from '../types';
import type { RegimeScoreResult, LiquidityRegime } from './regime-score.types';
import { calculateGLRS, isGLRSTradeFavorable } from './glrs.service';
import { calculateFVR } from './fvr.service';
import { calculateSCI } from './sci.service';
import { calculateLeadLagMatrix } from './lead-lag.service';

// ============================================================
// Regime label mapping
// ============================================================

const REGIME_LABELS: Record<LiquidityRegime, string> = {
  strong_risk_on: 'Strong Risk-On',
  mild_risk_on: 'Mild Risk-On',
  neutral: 'Neutral',
  risk_off: 'Risk-Off',
  liquidity_stress: 'Liquidity Stress',
};

// ============================================================
// Summary generation
// ============================================================

function generateSummary(
  glrsScore: number,
  glrsRegime: LiquidityRegime,
  strongestInflow: string | null,
  strongestOutflow: string | null,
  concentratedSectorCount: number,
  significantLeadLagCount: number,
): string {
  const parts: string[] = [];

  parts.push(`Regime: ${REGIME_LABELS[glrsRegime]} (${glrsScore.toFixed(0)}/100).`);

  if (strongestInflow) {
    parts.push(`Strongest inflow: ${strongestInflow}.`);
  }
  if (strongestOutflow) {
    parts.push(`Strongest outflow: ${strongestOutflow}.`);
  }
  if (concentratedSectorCount > 0) {
    parts.push(`${concentratedSectorCount} sector(s) show disproportionate concentration.`);
  }
  if (significantLeadLagCount > 0) {
    parts.push(`${significantLeadLagCount} significant lead-lag relationship(s) detected.`);
  }

  return parts.join(' ');
}

// ============================================================
// Main orchestrator
// ============================================================

/**
 * Calculate the complete Regime Score across all layers.
 *
 * @param globalLiquidity - L1 input: global liquidity metrics
 * @param markets         - L2/L3/LeadLag input: all market flows
 * @returns Complete RegimeScoreResult
 */
export function calculateRegimeScore(
  globalLiquidity: GlobalLiquidity,
  markets: MarketFlow[],
): RegimeScoreResult {
  // L1: Global Liquidity Regime Score
  const glrs = calculateGLRS(globalLiquidity);

  // L2: Flow Velocity & Rotation Score
  const fvr = calculateFVR(markets);

  // L3: Sector Concentration Index
  const sci = calculateSCI(markets);

  // Lead-Lag Matrix
  const leadLag = calculateLeadLagMatrix(markets);

  // Unified regime assessment
  const tradeFavorable = isGLRSTradeFavorable(glrs);
  const summary = generateSummary(
    glrs.score,
    glrs.regime,
    fvr.strongestInflow,
    fvr.strongestOutflow,
    sci.concentratedSectors.length,
    leadLag.significantPairs.length,
  );

  return {
    glrs,
    fvr,
    sci,
    leadLag,
    regime: {
      score: glrs.score,
      label: glrs.regime,
      tradeFavorable,
      summary,
    },
    timestamp: new Date().toISOString(),
  };
}
