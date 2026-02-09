/**
 * Proactive Signal System Types
 * Hourly Capital Flow → Asset Analysis → Telegram Signals
 */

export interface SignalData {
  symbol: string;
  assetClass: 'crypto' | 'stocks' | 'metals' | 'bonds';
  market: string;
  direction: 'long' | 'short';

  // Trade Plan
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;

  // Analysis Results
  classicVerdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  classicScore: number;
  mlisConfirmation: boolean;
  mlisRecommendation?: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  mlisConfidence?: number;
  overallConfidence: number;

  // Capital Flow Context
  capitalFlowPhase: 'early' | 'mid' | 'late' | 'exit';
  capitalFlowBias: 'risk_on' | 'risk_off' | 'neutral';
  sectorFlow?: number;

  // Analysis References
  classicAnalysisId?: string;
  mlisAnalysisId?: string;
}

export interface SignalFilterCriteria {
  market?: string;
  status?: 'pending' | 'published' | 'expired' | 'cancelled';
  minConfidence?: number;
  minScore?: number;
  minQualityScore?: number;
  direction?: 'long' | 'short';
  verdicts?: string[];
  fromDate?: Date;
  toDate?: Date;
}

export interface SignalPublishResult {
  signalId: string;
  telegram?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
  discord?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
}

export interface CapitalFlowRecommendation {
  market: string;
  direction: 'BUY' | 'SELL';
  phase: 'early' | 'mid' | 'late' | 'exit';
  flow7d: number;
  flowVelocity: number;
  sectors?: Array<{
    name: string;
    flow7d: number;
    trending: 'up' | 'down' | 'stable';
  }>;
  suggestedAssets: string[];
  confidence: number;
}

export interface SignalGenerationResult {
  processed: number;
  generated: number;
  published: number;
  skipped: number;
  errors: Array<{
    symbol: string;
    error: string;
  }>;
}

export interface TelegramSignalMessage {
  chatId: string;
  text: string;
  parseMode: 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
}

export interface SignalOutcome {
  signalId: string;
  outcome: 'tp1_hit' | 'tp2_hit' | 'sl_hit' | 'expired';
  outcomePrice: number;
  pnlPercent: number;
}

// Signal expiry based on timeframe
export const SIGNAL_EXPIRY_HOURS = {
  scalping: 4,    // 4 hours for scalp signals
  dayTrade: 24,   // 24 hours for day trade signals
  swing: 168,     // 7 days for swing signals
} as const;

// Minimum requirements for signal generation
export const SIGNAL_REQUIREMENTS = {
  minClassicScore: 7.0,
  minOverallConfidence: 70,
  allowedVerdicts: ['GO', 'CONDITIONAL_GO'],
  allowedPhases: ['early', 'mid'], // Only early and mid phase markets
} as const;

// =====================================================
// SIGNAL QUALITY SCORING
// =====================================================

/**
 * Signal quality score breakdown
 * Composite 0-100 score based on L1-L4 alignment, technicals, momentum, volatility
 */
export interface SignalQualityScore {
  /** Final composite score (0-100) */
  qualityScore: number;

  /** Human-readable label */
  qualityLabel: 'Low Confidence' | 'Medium Confidence' | 'High Confidence';

  /** Breakdown of sub-scores (each 0-100) */
  breakdown: {
    /** L1-L4 alignment across Capital Flow layers (weight: 0.4) */
    l1l4Alignment: number;
    /** RSI, MACD, volume confluence (weight: 0.3) */
    technicalStrength: number;
    /** Momentum (ADX trend strength, MACD histogram) (weight: 0.2) */
    momentum: number;
    /** Inverse volatility penalty (high vol → lower score) (weight: 0.1) */
    volatilityAdjusted: number;
  };

  /** Tooltip explanation */
  tooltip: string;
}

/**
 * Probability band for price forecast (P10/P50/P90)
 */
export interface SignalForecastBand {
  /** Forecast horizon label */
  horizon: string;
  /** Forecast horizon timeframe (e.g., "7D") */
  timeframe: string;
  /** 10th percentile - worst case */
  p10: number;
  /** 50th percentile - base case */
  p50: number;
  /** 90th percentile - best case */
  p90: number;
  /** % change from entry to P10 */
  p10Percent: number;
  /** % change from entry to P50 */
  p50Percent: number;
  /** % change from entry to P90 */
  p90Percent: number;
}

/**
 * Complete quality enrichment for a signal
 */
export interface SignalQualityEnrichment {
  qualityScore: SignalQualityScore;
  forecastBands: SignalForecastBand[];
}

/** Thresholds for quality labels */
export const QUALITY_THRESHOLDS = {
  low: 40,
  medium: 70,
  high: 100,
} as const;

/** Quality score colors (frontend reference) */
export const QUALITY_COLORS = {
  low: '#EF5A6F',
  medium: '#F59E0B',
  high: '#5EEDC3',
} as const;
