/**
 * L3 — Sector Concentration Index (SCI)
 *
 * Detects anomalous capital concentration within sectors
 * relative to their parent market.
 *
 * Formulae:
 *   RS_sector   = Return_sector − Return_benchmark
 *   FlowAnomaly = (SectorFlow − MeanFlow) / StdFlow
 *   SCI         = 0.5 · RS_sector + 0.5 · FlowAnomaly
 *
 * Threshold:
 *   SCI > 1.5 → Disproportionate capital concentration
 */

import type { MarketFlow, SectorFlow } from '../types';
import type { SCIResult, SectorSCI } from './regime-score.types';
import { mean, stdDev } from './statistics';

// ============================================================
// SCI Weights
// ============================================================

const SCI_WEIGHTS = {
  relativeStrength: 0.5,
  flowAnomaly: 0.5,
} as const;

/** Threshold above which a sector is considered "concentrated" */
const CONCENTRATION_THRESHOLD = 1.5;

// ============================================================
// Sector analysis
// ============================================================

/**
 * Calculate SCI for a single sector within its parent market.
 *
 * @param sector    - Sector flow data
 * @param market    - Parent market flow data
 * @param allSectors - All sectors in the parent market (for flow normalization)
 */
function calculateSectorSCI(
  sector: SectorFlow,
  market: MarketFlow,
  allSectors: SectorFlow[],
): SectorSCI {
  // Relative Strength: sector performance vs parent market
  // Use flow7d as a proxy for returns
  const benchmarkReturn = market.flow7d;
  const sectorReturn = sector.flow7d;
  const relativeStrength = sectorReturn - benchmarkReturn;

  // Flow Anomaly: how different is this sector's flow vs peers?
  const allFlows = allSectors.map(s => s.flow7d);
  const meanFlow = mean(allFlows);
  const stdFlow = stdDev(allFlows);

  const flowAnomaly = stdFlow > 0
    ? (sectorReturn - meanFlow) / stdFlow
    : 0;

  // Composite SCI
  const sci = SCI_WEIGHTS.relativeStrength * relativeStrength +
              SCI_WEIGHTS.flowAnomaly * flowAnomaly;

  return {
    sector: sector.name,
    market: market.market,
    relativeStrength: parseFloat(relativeStrength.toFixed(3)),
    flowAnomaly: parseFloat(flowAnomaly.toFixed(3)),
    sci: parseFloat(sci.toFixed(3)),
    isConcentrated: sci > CONCENTRATION_THRESHOLD,
    topAssets: sector.topAssets || [],
  };
}

// ============================================================
// Main SCI calculation
// ============================================================

/**
 * Calculate Sector Concentration Index for all markets.
 *
 * @param markets - All market flows with their sector data
 * @returns SCIResult with per-sector analysis and concentration alerts
 */
export function calculateSCI(markets: MarketFlow[]): SCIResult {
  const allSectorSCIs: SectorSCI[] = [];

  for (const market of markets) {
    const sectors = market.sectors;
    if (!sectors || sectors.length === 0) continue;

    for (const sector of sectors) {
      const sci = calculateSectorSCI(sector, market, sectors);
      allSectorSCIs.push(sci);
    }
  }

  // Find concentrated sectors
  const concentrated = allSectorSCIs
    .filter(s => s.isConcentrated)
    .sort((a, b) => b.sci - a.sci);

  // Find the hottest sector overall
  const hottest = allSectorSCIs.length > 0
    ? allSectorSCIs.reduce((max, s) => s.sci > max.sci ? s : max, allSectorSCIs[0])
    : null;

  return {
    sectors: allSectorSCIs,
    concentratedSectors: concentrated,
    hottest,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get concentration threshold (useful for frontend display).
 */
export function getSCIConcentrationThreshold(): number {
  return CONCENTRATION_THRESHOLD;
}
