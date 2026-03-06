/**
 * Risk Engine Interface (TASK 2.3)
 *
 * Defines the contracts for all risk calculations that were previously
 * embedded inside analysis.engine.ts. Each calculator is now a pure,
 * testable unit.
 *
 * Calculators:
 *  - StopLossCalculator   — ATR + support/resistance + trap-zone aware
 *  - TakeProfitCalculator — R:R multiples + S/R levels + cap enforcement
 *  - PositionSizeCalculator — 2% base risk, safety/confidence adjusted
 *  - WinRateEstimator     — trend + direction + context adjusted
 *  - RiskLevelClassifier  — deduction-based 0-100 score → low/medium/high
 */

// ============================================================
// Shared value types
// ============================================================

export type Direction  = 'long' | 'short';
export type RiskLevel  = 'low' | 'medium' | 'high' | 'critical';
export type TradeStyle = 'scalping' | 'dayTrade' | 'swingTrade';

// ============================================================
// Stop Loss
// ============================================================

export interface StopLossInput {
  direction:         Direction;
  entryPrice:        number;
  atr:               number;
  /** Nearest support level (used for LONG stop placement) */
  supportLevel?:     number;
  /** Nearest resistance level (used for SHORT stop placement) */
  resistanceLevel?:  number;
  /** Detected stop-hunt / trap zone price */
  nearestStopHunt?:  number;
  tradeStyle:        TradeStyle;
  /** Override max SL distance (%). Defaults from tradeStyle config. */
  maxSlPercent?:     number;
}

export interface StopLossResult {
  /** Absolute stop price */
  price:       number;
  /** Distance from entry as a percentage */
  percentage:  number;
  /** Which method determined the final stop */
  method:      'atr' | 'level' | 'trap_zone';
}

// ============================================================
// Take Profit
// ============================================================

export interface TakeProfitInput {
  direction:           Direction;
  entryPrice:          number;
  /** |entry - stopLoss.price| — the risk unit */
  riskAmount:          number;
  atr:                 number;
  /** Resistance levels above entry (LONG TP targets) */
  resistanceLevels?:   number[];
  /** Support levels below entry (SHORT TP targets) */
  supportLevels?:      number[];
  tradeStyle:          TradeStyle;
  /** Override max TP distance (%). Defaults from tradeStyle config. */
  maxTpPercent?:       number;
}

export interface TakeProfitLevel {
  price:       number;
  riskReward:  number;
  /** Percentage of position to close at this level */
  allocation:  number;
}

export interface TakeProfitResult {
  levels:    TakeProfitLevel[];
  /** Weighted average R:R across all TP levels */
  averageRR: number;
}

// ============================================================
// Position Sizing
// ============================================================

export interface PositionSizeInput {
  entryPrice:    number;
  stopLossPrice: number;
  /** Portfolio size in USD */
  accountSize:   number;
  /** 1–10 score from safetyCheck step */
  safetyScore:   number;
  /** 0–100 direction confidence */
  confidence:    number;
  marketRegime:  'risk_on' | 'risk_off' | 'neutral';
  riskLevel:     RiskLevel;
}

export interface PositionSizeResult {
  /** Adjusted risk percentage (1–3%) */
  riskPercent:      number;
  /** Resulting position as % of portfolio */
  positionPercent:  number;
  /** Resulting position in USD */
  positionUsd:      number;
}

// ============================================================
// Win Rate Estimation
// ============================================================

export interface WinRateInput {
  direction:    Direction;
  trendDirection: string;
  trendStrength:  number;
  confidence:     number;
  safetyScore:    number;
  tradeNow:       boolean;
  riskReward:     number;
}

// ============================================================
// Risk Level Classification
// ============================================================

export interface RiskLevelInput {
  spoofingDetected?:   boolean;
  layeringDetected?:   boolean;
  icebergDetected?:    boolean;
  washTrading?:        boolean;
  pumpDumpRisk?:       'low' | 'medium' | 'high';
  volumeRatio?:        number;
  volumeSpike?:        boolean;
  priceChange24h?:     number;
  liquidityScore?:     number;
  historicalVolatility?: number;
  newsSentiment?:      'bullish' | 'neutral' | 'bearish';
  newsSentimentScore?: number;
  // Contract security (crypto-specific)
  isHoneypot?:         boolean;
  isVerified?:         boolean;
  isMintable?:         boolean;
  liquidityLocked?:    boolean;
  sellTax?:            number;
}

export interface RiskLevelResult {
  /** 0–100, higher = safer */
  riskScore:  number;
  /** Normalised 0–10 step score */
  stepScore:  number;
  riskLevel:  RiskLevel;
  warnings:   string[];
}

// ============================================================
// Trade Style → max SL/TP percent defaults
// ============================================================

export const TRADE_STYLE_LIMITS: Record<TradeStyle, { maxSlPercent: number; maxTpPercent: number }> = {
  scalping:   { maxSlPercent:  3, maxTpPercent:  6 },
  dayTrade:   { maxSlPercent:  8, maxTpPercent: 15 },
  swingTrade: { maxSlPercent: 15, maxTpPercent: 25 },
} as const;

export const MIN_SL_PERCENT = 1.5;
export const MIN_TP_RR      = 1.0;
