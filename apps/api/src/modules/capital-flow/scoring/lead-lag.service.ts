/**
 * Lead-Lag Matrix
 *
 * Cross-correlation analysis to determine whether capital flows
 * lead asset returns (and by how many days).
 *
 * Formula:
 *   ρ_lead(k) = Corr(Flow_{t−k}, Return_t)
 *
 * Tests k = 3, 5, 10 days (configurable).
 *
 * A significant positive ρ at lag k means flows lead returns by k days.
 */

import type { MarketFlow, FlowDataPoint } from '../types';
import type { LeadLagResult, LeadLagPair } from './regime-score.types';
import { crossCorrelation } from './statistics';

// ============================================================
// Configuration
// ============================================================

/** Default lags to test (in days) */
const DEFAULT_LAGS = [3, 5, 10];

/**
 * Minimum absolute correlation for significance.
 * At n=20 observations, r ≈ 0.44 is significant at p < 0.05.
 * We use a slightly lower threshold since we have more data.
 */
const SIGNIFICANCE_THRESHOLD = 0.35;

/** Minimum data points required for meaningful cross-correlation */
const MIN_DATA_POINTS = 15;

// ============================================================
// Series extraction
// ============================================================

/**
 * Extract aligned flow and return series from market data.
 *
 * Flow: daily percentage flows (from flowHistory)
 * Returns: daily percentage changes (derived from flowHistory as a proxy)
 */
function extractSeries(
  flowHistory: FlowDataPoint[],
): { flows: number[]; returns: number[] } {
  if (flowHistory.length < 2) {
    return { flows: [], returns: [] };
  }

  // Sort by date ascending
  const sorted = [...flowHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const flows: number[] = sorted.map(h => h.value);

  // Returns as daily differences (proxy for price returns)
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    returns.push(sorted[i].value - sorted[i - 1].value);
  }

  // Align: drop first flow to match returns length
  return {
    flows: flows.slice(1),
    returns,
  };
}

// ============================================================
// Lead-lag analysis for a single pair
// ============================================================

/**
 * Test lead-lag relationship for a single flow-return pair.
 */
function analyzeLeadLag(
  leadName: string,
  lagName: string,
  leadSeries: number[],
  lagSeries: number[],
  lags: number[],
): LeadLagPair | null {
  if (leadSeries.length < MIN_DATA_POINTS || lagSeries.length < MIN_DATA_POINTS) {
    return null;
  }

  const correlations = lags.map(lag => ({
    lag,
    rho: parseFloat(crossCorrelation(leadSeries, lagSeries, lag).toFixed(4)),
  }));

  // Find best lag (highest absolute correlation)
  let bestLag = 0;
  let bestCorrelation = 0;

  for (const { lag, rho } of correlations) {
    if (Math.abs(rho) > Math.abs(bestCorrelation)) {
      bestLag = lag;
      bestCorrelation = rho;
    }
  }

  const isSignificant = Math.abs(bestCorrelation) >= SIGNIFICANCE_THRESHOLD;

  return {
    leadSeries: leadName,
    lagSeries: lagName,
    correlations,
    bestLag,
    bestCorrelation: parseFloat(bestCorrelation.toFixed(4)),
    isSignificant,
  };
}

// ============================================================
// Cross-market lead-lag matrix
// ============================================================

/**
 * Build a lead-lag matrix across all markets.
 *
 * Tests whether flows in market A lead returns in market B.
 *
 * @param markets - All market flows with flowHistory
 * @param lags    - Lag periods to test (in data points / days)
 * @returns LeadLagResult with all tested pairs and significant findings
 */
export function calculateLeadLagMatrix(
  markets: MarketFlow[],
  lags: number[] = DEFAULT_LAGS,
): LeadLagResult {
  const pairs: LeadLagPair[] = [];

  // Test all pairs: does flow in market A lead returns in market B?
  for (const marketA of markets) {
    const seriesA = extractSeries(marketA.flowHistory || []);

    for (const marketB of markets) {
      const seriesB = extractSeries(marketB.flowHistory || []);

      const pair = analyzeLeadLag(
        `${marketA.market}_flow`,
        `${marketB.market}_return`,
        seriesA.flows,
        seriesB.returns,
        lags,
      );

      if (pair) {
        pairs.push(pair);
      }
    }
  }

  // Filter significant pairs
  const significantPairs = pairs.filter(p => p.isSignificant);

  // Generate insight
  const insight = generateInsight(significantPairs);

  return {
    pairs,
    significantPairs,
    insight,
    lagsTestedDays: lags,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Insight generation
// ============================================================

function generateInsight(significantPairs: LeadLagPair[]): string {
  if (significantPairs.length === 0) {
    return 'No significant lead-lag relationships detected at current lag periods.';
  }

  // Find the strongest relationship
  const strongest = significantPairs.reduce(
    (best, pair) => Math.abs(pair.bestCorrelation) > Math.abs(best.bestCorrelation) ? pair : best,
    significantPairs[0],
  );

  const direction = strongest.bestCorrelation > 0 ? 'positively' : 'negatively';
  const leadMarket = strongest.leadSeries.replace('_flow', '');
  const lagMarket = strongest.lagSeries.replace('_return', '');

  return `${leadMarket} flows ${direction} lead ${lagMarket} returns by ${strongest.bestLag} days (ρ=${strongest.bestCorrelation.toFixed(2)}). ${significantPairs.length} significant pair(s) detected.`;
}
