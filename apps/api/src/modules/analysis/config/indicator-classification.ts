/**
 * TraderPath Indicator Classification System
 * ==========================================
 *
 * This file defines which indicators are LEADING (early warning) vs LAGGING (confirmation).
 *
 * CRITICAL RULE: Only LEADING indicators should affect trade decisions.
 * LAGGING indicators are for context and confirmation ONLY.
 *
 * Leading Indicators: Predict future price movements (early signals)
 * Lagging Indicators: Confirm past price movements (delayed signals)
 */

// ============================================================================
// INDICATOR SIGNAL TYPE
// ============================================================================

export type IndicatorSignalType = 'leading' | 'lagging' | 'neutral';

export interface IndicatorClassification {
  name: string;
  signalType: IndicatorSignalType;
  decisionWeight: number; // 0 for lagging, 0.1-1.0 for leading
  description: string;
  bestUsedFor: string[];
  warnings: string[];
}

// ============================================================================
// LEADING INDICATORS - AFFECT TRADE DECISIONS
// ============================================================================

/**
 * LEADING INDICATORS
 * These indicators predict future price movements and SHOULD affect trade decisions.
 * They generate signals BEFORE price moves significantly.
 */
export const LEADING_INDICATORS: Record<string, IndicatorClassification> = {
  // ========== MOMENTUM LEADING ==========
  RSI_DIVERGENCE: {
    name: 'RSI Divergence',
    signalType: 'leading',
    decisionWeight: 0.9,
    description: 'RSI divergence from price predicts reversals',
    bestUsedFor: ['Reversal prediction', 'Exhaustion detection', 'Trend weakness'],
    warnings: ['Can persist in strong trends', 'Confirm with volume'],
  },

  STOCH_RSI: {
    name: 'Stochastic RSI',
    signalType: 'leading',
    decisionWeight: 0.85,
    description: 'Combines stochastic and RSI for early momentum signals',
    bestUsedFor: ['Entry timing', 'Overbought/oversold', 'Momentum shifts'],
    warnings: ['Very sensitive', 'Best for scalping/day trading'],
  },

  CCI: {
    name: 'Commodity Channel Index',
    signalType: 'leading',
    decisionWeight: 0.75,
    description: 'Identifies cyclical trends and extreme conditions',
    bestUsedFor: ['Cycle detection', 'Extreme readings', 'Trend strength'],
    warnings: ['Can give false signals in ranging markets'],
  },

  WILLIAMS_R: {
    name: 'Williams %R',
    signalType: 'leading',
    decisionWeight: 0.7,
    description: 'Fast momentum indicator for overbought/oversold',
    bestUsedFor: ['Quick reversals', 'Scalping entries', 'Momentum extremes'],
    warnings: ['Very noisy', 'Needs confirmation'],
  },

  MFI: {
    name: 'Money Flow Index',
    signalType: 'leading',
    decisionWeight: 0.85,
    description: 'Volume-weighted RSI shows smart money flow',
    bestUsedFor: ['Divergence detection', 'Volume confirmation', 'Accumulation/distribution'],
    warnings: ['Requires accurate volume data'],
  },

  TSI: {
    name: 'True Strength Index',
    signalType: 'leading',
    decisionWeight: 0.8,
    description: 'Double-smoothed momentum oscillator',
    bestUsedFor: ['Trend direction', 'Signal line crossovers', 'Divergences'],
    warnings: ['Slower than RSI but more reliable'],
  },

  // ========== VOLUME LEADING ==========
  CMF: {
    name: 'Chaikin Money Flow',
    signalType: 'leading',
    decisionWeight: 0.85,
    description: 'Measures buying/selling pressure over time',
    bestUsedFor: ['Accumulation detection', 'Distribution detection', 'Trend confirmation'],
    warnings: ['Sensitive to period selection'],
  },

  FORCE_INDEX: {
    name: 'Force Index',
    signalType: 'leading',
    decisionWeight: 0.75,
    description: 'Combines price and volume for momentum',
    bestUsedFor: ['Trend strength', 'Breakout confirmation', 'Divergence detection'],
    warnings: ['Can be volatile'],
  },

  VOLUME_SPIKE: {
    name: 'Volume Spike Detection',
    signalType: 'leading',
    decisionWeight: 0.8,
    description: 'Detects unusual volume activity',
    bestUsedFor: ['Breakout prediction', 'Reversal signals', 'Institutional activity'],
    warnings: ['Needs context for direction'],
  },

  ORDER_FLOW_IMBALANCE: {
    name: 'Order Flow Imbalance',
    signalType: 'leading',
    decisionWeight: 0.9,
    description: 'Real-time buy/sell pressure from order book',
    bestUsedFor: ['Short-term direction', 'Entry timing', 'Market microstructure'],
    warnings: ['Requires real-time data', 'Can be manipulated'],
  },

  OBV_DIVERGENCE: {
    name: 'OBV Divergence',
    signalType: 'leading',
    decisionWeight: 0.85,
    description: 'Volume divergence from price predicts moves',
    bestUsedFor: ['Trend confirmation', 'Reversal prediction', 'Accumulation phase'],
    warnings: ['Cumulative nature can mask signals'],
  },

  // ========== ADVANCED LEADING ==========
  WHALE_ACTIVITY: {
    name: 'Whale Activity',
    signalType: 'leading',
    decisionWeight: 0.9,
    description: 'Tracks large wallet movements',
    bestUsedFor: ['Major move prediction', 'Smart money following', 'Risk assessment'],
    warnings: ['Not all whale moves are directional'],
  },

  SPOOFING_DETECTION: {
    name: 'Spoofing Detection',
    signalType: 'leading',
    decisionWeight: 0.85,
    description: 'Identifies fake orders in order book',
    bestUsedFor: ['Manipulation warning', 'False signal avoidance', 'Risk management'],
    warnings: ['Sophisticated detection needed'],
  },

  LIQUIDITY_SCORE: {
    name: 'Liquidity Score',
    signalType: 'leading',
    decisionWeight: 0.8,
    description: 'Measures market depth and execution quality',
    bestUsedFor: ['Entry feasibility', 'Slippage prediction', 'Position sizing'],
    warnings: ['Varies by timeframe'],
  },

  SQUEEZE: {
    name: 'Squeeze Indicator',
    signalType: 'leading',
    decisionWeight: 0.85,
    description: 'Predicts volatility breakouts',
    bestUsedFor: ['Breakout anticipation', 'Range compression', 'Momentum builds'],
    warnings: ['Direction uncertain until breakout'],
  },

  // ========== PATTERN LEADING ==========
  SUPERTREND_CROSS: {
    name: 'SuperTrend Crossover',
    signalType: 'leading',
    decisionWeight: 0.8,
    description: 'Trend-following with built-in volatility adjustment',
    bestUsedFor: ['Trend changes', 'Stop placement', 'Direction confirmation'],
    warnings: ['Whipsaws in ranging markets'],
  },

  MACD_HISTOGRAM_DIVERGENCE: {
    name: 'MACD Histogram Divergence',
    signalType: 'leading',
    decisionWeight: 0.85,
    description: 'Histogram divergence predicts momentum shifts',
    bestUsedFor: ['Momentum exhaustion', 'Trend weakening', 'Reversal setup'],
    warnings: ['MACD line crossover is lagging'],
  },
};

// ============================================================================
// LAGGING INDICATORS - FOR CONTEXT ONLY, DO NOT AFFECT DECISIONS
// ============================================================================

/**
 * LAGGING INDICATORS
 * These indicators confirm past price movements and should NOT affect trade decisions.
 * They are useful for context and understanding but generate signals AFTER price moves.
 */
export const LAGGING_INDICATORS: Record<string, IndicatorClassification> = {
  // ========== TREND LAGGING ==========
  EMA: {
    name: 'Exponential Moving Average',
    signalType: 'lagging',
    decisionWeight: 0, // DO NOT use for decisions
    description: 'Smoothed average price - always behind current price',
    bestUsedFor: ['Trend visualization', 'Dynamic support/resistance', 'Context'],
    warnings: ['NEVER use MA crosses for entry signals - always late'],
  },

  SMA: {
    name: 'Simple Moving Average',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Simple average - even more lagging than EMA',
    bestUsedFor: ['Long-term trend', 'Institutional reference', 'Context'],
    warnings: ['Very delayed - for context only'],
  },

  MACD_SIGNAL_LINE: {
    name: 'MACD Signal Line Cross',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Signal line crossover is delayed',
    bestUsedFor: ['Trend confirmation', 'Context', 'Historical comparison'],
    warnings: ['Signal line cross is LATE - use histogram divergence instead'],
  },

  ICHIMOKU_CLOUD: {
    name: 'Ichimoku Cloud',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Cloud is projected but based on past data',
    bestUsedFor: ['Support/resistance zones', 'Trend context', 'Visual reference'],
    warnings: ['Cloud breaks are confirmed, not predictive'],
  },

  ADX_TREND: {
    name: 'ADX (Trend Strength)',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Measures trend strength, not direction',
    bestUsedFor: ['Trend strength assessment', 'Volatility context', 'Filter'],
    warnings: ['Rising ADX confirms existing trend - already in motion'],
  },

  AROON: {
    name: 'Aroon Indicator',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Time since high/low - confirms trend',
    bestUsedFor: ['Trend confirmation', 'Trend age', 'Context'],
    warnings: ['Signals after trend is established'],
  },

  // ========== VOLATILITY LAGGING ==========
  BOLLINGER_BANDS: {
    name: 'Bollinger Bands',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Based on moving average and standard deviation',
    bestUsedFor: ['Volatility visualization', 'Range context', 'Mean reversion levels'],
    warnings: ['Band touches are not signals - they lag'],
  },

  ATR: {
    name: 'Average True Range',
    signalType: 'neutral', // Neutral - used for sizing, not direction
    decisionWeight: 0,
    description: 'Measures volatility for position sizing',
    bestUsedFor: ['Stop-loss calculation', 'Position sizing', 'Volatility context'],
    warnings: ['Not directional - use for sizing only'],
  },

  KELTNER: {
    name: 'Keltner Channels',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'ATR-based bands around EMA',
    bestUsedFor: ['Volatility context', 'Range visualization', 'Squeeze detection'],
    warnings: ['Lagging - confirms volatility state'],
  },

  DONCHIAN: {
    name: 'Donchian Channels',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Highest high / lowest low - breakout confirmation',
    bestUsedFor: ['Range boundaries', 'Breakout confirmation', 'Trend channel'],
    warnings: ['Breakout is already happening when signaled'],
  },

  // ========== VOLUME LAGGING ==========
  OBV_TREND: {
    name: 'OBV Trend Line',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Cumulative volume trend - confirms price trend',
    bestUsedFor: ['Trend confirmation', 'Volume health', 'Context'],
    warnings: ['OBV divergence is leading, OBV trend is lagging'],
  },

  VWAP: {
    name: 'VWAP',
    signalType: 'neutral',
    decisionWeight: 0,
    description: 'Average price weighted by volume - reference level',
    bestUsedFor: ['Institutional reference', 'Fair value', 'Entry benchmark'],
    warnings: ['Not predictive - use as reference only'],
  },

  PSAR: {
    name: 'Parabolic SAR',
    signalType: 'lagging',
    decisionWeight: 0,
    description: 'Trailing stop indicator - follows price',
    bestUsedFor: ['Stop-loss placement', 'Trend confirmation', 'Exit timing'],
    warnings: ['Flips AFTER reversal begins - use for stops only'],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an indicator is leading (should affect trade decision)
 */
export function isLeadingIndicator(indicatorName: string): boolean {
  const normalizedName = indicatorName.toUpperCase().replace(/[_\s]/g, '');

  // Check direct match
  for (const key of Object.keys(LEADING_INDICATORS)) {
    if (normalizedName.includes(key.replace(/[_\s]/g, ''))) {
      return true;
    }
  }

  // Special cases
  if (normalizedName.includes('DIVERGENCE')) return true;
  if (normalizedName.includes('SQUEEZE')) return true;
  if (normalizedName.includes('SPIKE')) return true;
  if (normalizedName.includes('IMBALANCE')) return true;
  if (normalizedName.includes('WHALE')) return true;
  if (normalizedName.includes('SPOOFING')) return true;

  return false;
}

/**
 * Get decision weight for an indicator
 * Returns 0 for lagging indicators (should not affect decision)
 */
export function getIndicatorDecisionWeight(indicatorName: string): number {
  const normalizedName = indicatorName.toUpperCase().replace(/[_\s]/g, '');

  // Check leading indicators
  for (const [key, config] of Object.entries(LEADING_INDICATORS)) {
    if (normalizedName.includes(key.replace(/[_\s]/g, ''))) {
      return config.decisionWeight;
    }
  }

  // Default to 0 for unknown/lagging
  return 0;
}

/**
 * Get all indicators classified by type for a given step
 */
export function classifyStepIndicators(indicators: string[]): {
  leading: string[];
  lagging: string[];
  neutral: string[];
} {
  const result = {
    leading: [] as string[],
    lagging: [] as string[],
    neutral: [] as string[],
  };

  for (const indicator of indicators) {
    if (isLeadingIndicator(indicator)) {
      result.leading.push(indicator);
    } else {
      const normalizedName = indicator.toUpperCase().replace(/[_\s]/g, '');
      if (normalizedName.includes('ATR') || normalizedName.includes('VWAP')) {
        result.neutral.push(indicator);
      } else {
        result.lagging.push(indicator);
      }
    }
  }

  return result;
}

/**
 * Calculate weighted score using only leading indicators
 * CRITICAL: This ensures lagging indicators don't affect trade decisions
 */
export function calculateLeadingOnlyScore(
  indicatorSignals: Array<{ name: string; signal: 'bullish' | 'bearish' | 'neutral'; strength: number }>
): {
  score: number;
  confidence: number;
  leadingCount: number;
  totalCount: number;
  direction: 'bullish' | 'bearish' | 'neutral';
} {
  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;
  let leadingCount = 0;

  for (const indicator of indicatorSignals) {
    const weight = getIndicatorDecisionWeight(indicator.name);

    if (weight > 0) {
      leadingCount++;
      totalWeight += weight;

      const adjustedStrength = indicator.strength * weight;

      if (indicator.signal === 'bullish') {
        bullishScore += adjustedStrength;
      } else if (indicator.signal === 'bearish') {
        bearishScore += adjustedStrength;
      }
    }
  }

  if (totalWeight === 0) {
    return {
      score: 50,
      confidence: 0,
      leadingCount: 0,
      totalCount: indicatorSignals.length,
      direction: 'neutral',
    };
  }

  const normalizedBullish = bullishScore / totalWeight;
  const normalizedBearish = bearishScore / totalWeight;

  // Score: 0-100 where 50 is neutral
  let score = 50;
  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (normalizedBullish > normalizedBearish) {
    score = 50 + (normalizedBullish - normalizedBearish) * 50;
    direction = 'bullish';
  } else if (normalizedBearish > normalizedBullish) {
    score = 50 - (normalizedBearish - normalizedBullish) * 50;
    direction = 'bearish';
  }

  // Confidence based on agreement among leading indicators
  const confidence = Math.abs(normalizedBullish - normalizedBearish) * 100;

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    confidence: Math.round(Math.max(0, Math.min(100, confidence))),
    leadingCount,
    totalCount: indicatorSignals.length,
    direction,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const INDICATOR_CLASSIFICATION = {
  leading: LEADING_INDICATORS,
  lagging: LAGGING_INDICATORS,
};

export default INDICATOR_CLASSIFICATION;
