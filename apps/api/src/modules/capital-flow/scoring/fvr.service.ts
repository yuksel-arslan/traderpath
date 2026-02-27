/**
 * L2 — Flow Velocity & Rotation Score (FVR)
 *
 * Per-market flow velocity and phase detection:
 *
 *   FlowVelocity = (Flow_7d − Flow_30d) / σ_flow
 *
 * Phase detection:
 *   Early        → 7d > 30d AND RS > 0
 *   Expansion    → 7d >> 30d (strong momentum)
 *   Late         → 7d < 30d AND price ↑
 *   Distribution → 7d < 0 AND RS < 0
 *
 * Rotation Strength:
 *   RotationScore = Z_FlowVelocity + Z_RelativeStrength
 */

import type { MarketFlow } from '../types';
import type { FVRResult, MarketFVR, FlowPhase } from './regime-score.types';
import { zScore, stdDev, mean } from './statistics';

// ============================================================
// Flow Velocity calculation
// ============================================================

/**
 * Calculate flow velocity: (Flow_7d - Flow_30d) / sigma_flow
 * sigma_flow is estimated from flow history or defaults to 3%.
 */
function calculateFlowVelocity(market: MarketFlow): number {
  const diff = market.flow7d - (market.flow30d / 4); // weekly-normalized 30d
  const historicalFlows = market.flowHistory?.map(h => h.value) || [];
  const sigma = historicalFlows.length >= 5 ? stdDev(historicalFlows) : 3;
  if (sigma === 0) return 0;
  return diff / sigma;
}

// ============================================================
// Relative Strength calculation
// ============================================================

/**
 * Calculate relative strength of a market vs all-market average.
 */
function calculateRelativeStrength(market: MarketFlow, allMarkets: MarketFlow[]): number {
  const allFlow7d = allMarkets.map(m => m.flow7d);
  const avgFlow7d = mean(allFlow7d);
  const stdFlow7d = stdDev(allFlow7d);
  if (stdFlow7d === 0) return 0;
  return (market.flow7d - avgFlow7d) / stdFlow7d;
}

// ============================================================
// Phase detection
// ============================================================

/**
 * Detect flow phase using momentum-based classification.
 *
 * Early:        7d > 30d/4 (weekly normalized) AND RS > 0
 * Expansion:    7d > 30d/4 * 1.5 (strong outperformance)
 * Late:         7d < 30d/4 AND flow7d > 0 (slowing but positive)
 * Distribution: flow7d < 0 AND RS < 0
 */
function detectFlowPhase(
  flowVelocity: number,
  relativeStrength: number,
  flow7d: number,
  flow30dWeekly: number,
): FlowPhase {
  // Distribution: outflows with negative RS
  if (flow7d < 0 && relativeStrength < 0) {
    return 'distribution';
  }

  // Expansion: strong momentum (velocity > 1 std and RS positive)
  if (flowVelocity > 1 && relativeStrength > 0.5) {
    return 'expansion';
  }

  // Early: inflows accelerating, relative strength positive
  if (flow7d > flow30dWeekly && relativeStrength > 0) {
    return 'early';
  }

  // Late: positive flow but decelerating
  if (flow7d > 0 && flow7d < flow30dWeekly) {
    return 'late';
  }

  // Default: Late if we can't determine
  return 'late';
}

// ============================================================
// Rotation detection
// ============================================================

/**
 * Detect active capital rotations between markets.
 *
 * A rotation occurs when one market has strongly negative velocity
 * while another has strongly positive velocity.
 */
function detectRotations(
  marketFVRs: MarketFVR[],
): FVRResult['activeRotations'] {
  const rotations: FVRResult['activeRotations'] = [];

  const outflows = marketFVRs
    .filter(m => m.flowVelocity < -0.5 && m.phase === 'distribution')
    .sort((a, b) => a.flowVelocity - b.flowVelocity);

  const inflows = marketFVRs
    .filter(m => m.flowVelocity > 0.5 && (m.phase === 'early' || m.phase === 'expansion'))
    .sort((a, b) => b.flowVelocity - a.flowVelocity);

  // Pair outflows with inflows
  for (const outflow of outflows) {
    for (const inflow of inflows) {
      if (outflow.market === inflow.market) continue;

      const magnitude = inflow.flowVelocity - outflow.flowVelocity;
      const confidence = Math.min(100, Math.round(magnitude * 25));

      if (confidence > 30) {
        rotations.push({
          from: outflow.market,
          to: inflow.market,
          confidence,
          magnitude: parseFloat(magnitude.toFixed(2)),
        });
      }
    }
  }

  // Sort by confidence descending, limit to top 3
  return rotations.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// ============================================================
// Main FVR calculation
// ============================================================

/**
 * Calculate Flow Velocity & Rotation Score for all markets.
 *
 * @param markets - Array of MarketFlow data
 * @returns FVRResult with per-market analysis and rotation detection
 */
export function calculateFVR(markets: MarketFlow[]): FVRResult {
  if (markets.length === 0) {
    return {
      markets: [],
      activeRotations: [],
      strongestInflow: null,
      strongestOutflow: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Calculate raw metrics for each market
  const flowVelocities = markets.map(m => calculateFlowVelocity(m));
  const relativeStrengths = markets.map(m => calculateRelativeStrength(m, markets));

  // Calculate z-scores of velocities and RS across markets
  const marketFVRs: MarketFVR[] = markets.map((market, i) => {
    const flowVelocity = flowVelocities[i];
    const rs = relativeStrengths[i];

    // z-scores across all markets
    const zFlowVelocity = zScore(flowVelocity, flowVelocities);
    const zRelativeStrength = zScore(rs, relativeStrengths);

    const flow30dWeekly = market.flow30d / 4;
    const phase = detectFlowPhase(flowVelocity, rs, market.flow7d, flow30dWeekly);

    // Composite rotation score
    const rotationScore = zFlowVelocity + zRelativeStrength;

    return {
      market: market.market,
      flowVelocity: parseFloat(flowVelocity.toFixed(3)),
      zFlowVelocity: parseFloat(zFlowVelocity.toFixed(3)),
      relativeStrength: parseFloat(rs.toFixed(3)),
      zRelativeStrength: parseFloat(zRelativeStrength.toFixed(3)),
      phase,
      rotationScore: parseFloat(rotationScore.toFixed(3)),
      daysInPhase: market.daysInPhase || 0,
    };
  });

  // Detect rotations
  const activeRotations = detectRotations(marketFVRs);

  // Find strongest inflow / outflow
  const sorted = [...marketFVRs].sort((a, b) => b.rotationScore - a.rotationScore);
  const strongestInflow = sorted.length > 0 && sorted[0].rotationScore > 0
    ? sorted[0].market
    : null;
  const strongestOutflow = sorted.length > 0 && sorted[sorted.length - 1].rotationScore < 0
    ? sorted[sorted.length - 1].market
    : null;

  return {
    markets: marketFVRs,
    activeRotations,
    strongestInflow,
    strongestOutflow,
    timestamp: new Date().toISOString(),
  };
}
