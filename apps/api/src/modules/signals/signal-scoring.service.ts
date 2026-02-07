/**
 * Signal Quality Scoring Service
 *
 * Calculates a composite quality score (0-100) for each signal based on:
 *   1. L1-L4 Alignment Score (40%) - Capital Flow layer alignment
 *   2. Technical Strength (30%)    - RSI, MACD, Volume confirmation
 *   3. Momentum Score (20%)        - ADX trend strength, MACD histogram
 *   4. Volatility Adjustment (10%) - High vol → lower confidence
 *
 * Formula:
 *   Quality Score = (L1_L4_Alignment * 0.4) +
 *                   (Technical_Strength * 0.3) +
 *                   (Momentum * 0.2) +
 *                   ((1 - Volatility_Penalty) * 0.1 * 100)
 */

import type {
  SignalData,
  SignalQualityScore,
  SignalQualityEnrichment,
  SignalForecastBand,
} from './types';
import { QUALITY_THRESHOLDS } from './types';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Data from the analysis engine needed for scoring.
 * Passed in after running the integrated 7-Step + MLIS analysis.
 */
export interface ScoringInput {
  signal: SignalData;

  // Technical indicators from step2 (Asset Scanner)
  rsi?: number;           // 0-100
  macdHistogram?: number; // positive = bullish momentum
  adx?: number;           // 0-100 (>25 = trending)
  volumeConfirm?: boolean; // volume above average
  atr?: number;           // Average True Range
  bbWidth?: number;       // Bollinger Band width (normalized)

  // Capital Flow alignment signals
  l1LiquidityBias?: 'risk_on' | 'risk_off' | 'neutral';
  l2MarketPhase?: 'early' | 'mid' | 'late' | 'exit';
  l2MarketRotation?: 'entering' | 'stable' | 'exiting' | null;
  l3SectorFlowAligned?: boolean; // sector flow supports direction
  l4RecommendationAligned?: boolean; // AI recommendation matches direction

  // Forecast band data (from RAG forecast band service)
  forecastBands?: Array<{
    horizon: string;
    timeframe: string;
    p10: number;
    p50: number;
    p90: number;
    currentPrice: number;
  }>;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate L1-L4 Capital Flow alignment score (0-100)
 *
 * L1: Liquidity bias matches direction (risk_on = bullish, risk_off = bearish)
 * L2: Market phase is favorable (early/mid) + rotation is entering/stable
 * L3: Sector flow supports direction
 * L4: AI recommendation aligns with direction
 */
function calculateL1L4Alignment(input: ScoringInput): number {
  let score = 0;
  let maxScore = 0;

  const isLong = input.signal.direction === 'long';

  // L1: Liquidity bias (25 pts)
  maxScore += 25;
  if (input.l1LiquidityBias) {
    if (input.l1LiquidityBias === 'risk_on' && isLong) {
      score += 25;
    } else if (input.l1LiquidityBias === 'risk_off' && !isLong) {
      score += 25;
    } else if (input.l1LiquidityBias === 'neutral') {
      score += 12; // Neutral doesn't strongly confirm either direction
    }
    // Misaligned = 0
  } else {
    // Fallback: use capitalFlowBias from signal
    const bias = input.signal.capitalFlowBias;
    if (bias === 'risk_on' && isLong) score += 25;
    else if (bias === 'risk_off' && !isLong) score += 25;
    else if (bias === 'neutral') score += 12;
  }

  // L2: Market phase + rotation (25 pts)
  maxScore += 25;
  const phase = input.l2MarketPhase || input.signal.capitalFlowPhase;
  if (phase === 'early') {
    score += 20;
  } else if (phase === 'mid') {
    score += 15;
  } else if (phase === 'late') {
    score += 5;
  }
  // exit = 0

  const rotation = input.l2MarketRotation;
  if (rotation === 'entering') {
    score += 5;
  } else if (rotation === 'stable') {
    score += 3;
  }
  // exiting/null = 0

  // L3: Sector flow alignment (25 pts)
  maxScore += 25;
  if (input.l3SectorFlowAligned !== undefined) {
    if (input.l3SectorFlowAligned) {
      score += 25;
    } else {
      score += 5; // Sector not aligned but not blocking
    }
  } else {
    // Fallback: infer from signal.sectorFlow
    const sf = input.signal.sectorFlow;
    if (sf !== undefined) {
      if ((isLong && sf > 0) || (!isLong && sf < 0)) {
        score += 25;
      } else if (sf === 0) {
        score += 12;
      } else {
        score += 5;
      }
    } else {
      score += 12; // No data → neutral
    }
  }

  // L4: AI recommendation alignment (25 pts)
  maxScore += 25;
  if (input.l4RecommendationAligned !== undefined) {
    score += input.l4RecommendationAligned ? 25 : 5;
  } else {
    // Fallback: MLIS + Classic agreement = strong alignment
    if (input.signal.mlisConfirmation) {
      const positiveRecs = ['STRONG_BUY', 'BUY'];
      const negativeRecs = ['STRONG_SELL', 'SELL'];
      const rec = input.signal.mlisRecommendation;

      if ((isLong && positiveRecs.includes(rec || '')) || (!isLong && negativeRecs.includes(rec || ''))) {
        score += 25;
      } else {
        score += 15; // Confirmed but recommendation doesn't strongly match
      }
    } else {
      score += 5; // MLIS did not confirm
    }
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
}

/**
 * Calculate technical strength score (0-100)
 *
 * RSI: Optimal zone confirmation
 * MACD: Positive/negative histogram confirming direction
 * Volume: Above-average volume confirmation
 */
function calculateTechnicalStrength(input: ScoringInput): number {
  let score = 0;
  let maxScore = 0;

  const isLong = input.signal.direction === 'long';

  // RSI (33 pts)
  maxScore += 33;
  if (input.rsi !== undefined) {
    if (isLong) {
      // For LONG: RSI 40-65 is optimal (not overbought, not deeply oversold)
      if (input.rsi >= 40 && input.rsi <= 65) {
        score += 33;
      } else if (input.rsi >= 30 && input.rsi < 40) {
        score += 25; // Oversold = good for entry but risky
      } else if (input.rsi > 65 && input.rsi <= 70) {
        score += 20; // Getting hot
      } else if (input.rsi > 70) {
        score += 8; // Overbought = less confidence for long
      } else {
        score += 15; // Deeply oversold (<30) - reversal potential
      }
    } else {
      // For SHORT: RSI 35-60 is optimal (not oversold, not deeply overbought)
      if (input.rsi >= 35 && input.rsi <= 60) {
        score += 33;
      } else if (input.rsi > 60 && input.rsi <= 70) {
        score += 25;
      } else if (input.rsi > 70) {
        score += 30; // Overbought = good for short entry
      } else if (input.rsi < 35 && input.rsi >= 30) {
        score += 20;
      } else {
        score += 8; // Deeply oversold - less confidence for short
      }
    }
  } else {
    score += 16; // No data → neutral
  }

  // MACD Histogram (34 pts)
  maxScore += 34;
  if (input.macdHistogram !== undefined) {
    const macdAligned = (isLong && input.macdHistogram > 0) || (!isLong && input.macdHistogram < 0);
    if (macdAligned) {
      const magnitude = Math.abs(input.macdHistogram);
      // Stronger histogram = higher score
      score += Math.min(34, 20 + magnitude * 100);
    } else {
      score += 5; // Counter-direction MACD
    }
  } else {
    score += 17; // No data → neutral
  }

  // Volume Confirmation (33 pts)
  maxScore += 33;
  if (input.volumeConfirm !== undefined) {
    score += input.volumeConfirm ? 33 : 10;
  } else {
    score += 16; // No data → neutral
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
}

/**
 * Calculate momentum score (0-100)
 *
 * ADX: Trend strength (>25 = trending)
 * MACD Histogram direction and magnitude
 * Classic score contribution
 */
function calculateMomentum(input: ScoringInput): number {
  let score = 0;
  let maxScore = 0;

  // ADX trend strength (50 pts)
  maxScore += 50;
  if (input.adx !== undefined) {
    if (input.adx >= 40) {
      score += 50; // Very strong trend
    } else if (input.adx >= 25) {
      score += 35 + (input.adx - 25) * 1; // Strong trend, scaling
    } else if (input.adx >= 15) {
      score += 15 + (input.adx - 15) * 1; // Weak trend
    } else {
      score += 5; // No trend / ranging
    }
  } else {
    score += 25; // No data → neutral
  }

  // Classic analysis score as momentum proxy (50 pts)
  // Classic score is 0-10; higher = stronger directional conviction
  maxScore += 50;
  const classicNormalized = Math.min(input.signal.classicScore / 10, 1);
  score += Math.round(classicNormalized * 50);

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
}

/**
 * Calculate volatility adjustment (0-1 penalty, 0 = no penalty, 1 = max penalty)
 *
 * High volatility reduces confidence because price targets are less reliable.
 * Uses Bollinger Band width and ATR relative to price.
 */
function calculateVolatilityPenalty(input: ScoringInput): number {
  let penalty = 0;
  let sources = 0;

  // Bollinger Band width (wider = more volatile = higher penalty)
  if (input.bbWidth !== undefined) {
    // bbWidth is typically 0.01-0.10 range (1%-10% of price)
    // > 0.06 is very volatile
    if (input.bbWidth >= 0.08) {
      penalty += 0.8;
    } else if (input.bbWidth >= 0.06) {
      penalty += 0.5;
    } else if (input.bbWidth >= 0.04) {
      penalty += 0.3;
    } else if (input.bbWidth >= 0.02) {
      penalty += 0.15;
    } else {
      penalty += 0.05; // Very tight = low volatility
    }
    sources++;
  }

  // ATR relative to entry price
  if (input.atr !== undefined && input.signal.entryPrice > 0) {
    const atrPercent = input.atr / input.signal.entryPrice;
    // atrPercent > 0.05 (5%) is high volatility
    if (atrPercent >= 0.08) {
      penalty += 0.9;
    } else if (atrPercent >= 0.05) {
      penalty += 0.5;
    } else if (atrPercent >= 0.03) {
      penalty += 0.25;
    } else {
      penalty += 0.1;
    }
    sources++;
  }

  if (sources === 0) return 0.3; // No data → moderate penalty
  return Math.min(1, penalty / sources);
}

// ============================================================================
// FORECAST BAND HELPERS
// ============================================================================

/**
 * Build SignalForecastBand[] from raw forecast data
 */
function buildForecastBands(
  input: ScoringInput,
): SignalForecastBand[] {
  if (!input.forecastBands || input.forecastBands.length === 0) {
    return [];
  }

  const entryPrice = input.signal.entryPrice;
  if (entryPrice <= 0) return [];

  return input.forecastBands.map((fb) => ({
    horizon: fb.horizon,
    timeframe: fb.timeframe,
    p10: fb.p10,
    p50: fb.p50,
    p90: fb.p90,
    p10Percent: ((fb.p10 - entryPrice) / entryPrice) * 100,
    p50Percent: ((fb.p50 - entryPrice) / entryPrice) * 100,
    p90Percent: ((fb.p90 - entryPrice) / entryPrice) * 100,
  }));
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate the full quality enrichment for a signal.
 *
 * Returns a SignalQualityEnrichment with:
 *   - qualityScore (0-100 with label and breakdown)
 *   - forecastBands (P10/P50/P90 for available horizons)
 */
export function calculateSignalQuality(input: ScoringInput): SignalQualityEnrichment {
  // Sub-scores
  const l1l4Alignment = calculateL1L4Alignment(input);
  const technicalStrength = calculateTechnicalStrength(input);
  const momentum = calculateMomentum(input);
  const volatilityPenalty = calculateVolatilityPenalty(input);

  // Composite score using the specified formula:
  // Quality = (L1_L4 * 0.4) + (Tech * 0.3) + (Momentum * 0.2) + ((1 - VolPenalty) * 0.1 * 100)
  const volatilityAdjusted = Math.round((1 - volatilityPenalty) * 100);
  const qualityScore = Math.round(
    l1l4Alignment * 0.4 +
    technicalStrength * 0.3 +
    momentum * 0.2 +
    volatilityAdjusted * 0.1
  );

  // Clamp to 0-100
  const clampedScore = Math.max(0, Math.min(100, qualityScore));

  // Label
  let qualityLabel: SignalQualityScore['qualityLabel'];
  if (clampedScore <= QUALITY_THRESHOLDS.low) {
    qualityLabel = 'Low Confidence';
  } else if (clampedScore <= QUALITY_THRESHOLDS.medium) {
    qualityLabel = 'Medium Confidence';
  } else {
    qualityLabel = 'High Confidence';
  }

  // Tooltip explanation
  const tooltip = `Based on L1-L4 alignment (${l1l4Alignment}%), technicals (${technicalStrength}%), momentum (${momentum}%), volatility (${volatilityAdjusted}%)`;

  const scoreResult: SignalQualityScore = {
    qualityScore: clampedScore,
    qualityLabel,
    breakdown: {
      l1l4Alignment,
      technicalStrength,
      momentum,
      volatilityAdjusted,
    },
    tooltip,
  };

  // Forecast bands
  const forecastBands = buildForecastBands(input);

  return {
    qualityScore: scoreResult,
    forecastBands,
  };
}

// Singleton-style export
export const signalScoringService = { calculateSignalQuality };
