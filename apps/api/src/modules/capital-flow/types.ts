/**
 * Capital Flow System Types
 *
 * Core Principle: "Para nereye akıyorsa potansiyel oradadır"
 * (Where money flows, potential exists)
 */

// Market Types
export type MarketType = 'crypto' | 'stocks' | 'bonds' | 'metals';
export type Phase = 'early' | 'mid' | 'late' | 'exit';
export type RotationSignal = 'entering' | 'stable' | 'exiting' | null;
export type LiquidityBias = 'risk_on' | 'risk_off' | 'neutral';
export type LiquidityTrend = 'expanding' | 'contracting' | 'stable';
export type DxyTrend = 'strengthening' | 'weakening' | 'stable';
export type VixLevel = 'extreme_fear' | 'fear' | 'neutral' | 'complacent';
export type SectorTrend = 'up' | 'down' | 'stable';
export type FlowAction = 'analyze' | 'wait' | 'avoid';

// Sector Flow (within a market)
export interface SectorFlow {
  name: string;                // e.g., 'DeFi', 'Tech', 'Treasury'
  flow7d: number;
  flow30d: number;
  dominance: number;           // % of parent market
  trending: SectorTrend;
  topAssets: string[];         // Top 5 assets in sector
}

// Historical Data Point
export interface FlowDataPoint {
  date: string;               // ISO date string
  value: number;              // Flow percentage
}

// Market Flow Data
export interface MarketFlow {
  market: MarketType;

  // Current State
  currentValue: number;        // Market cap or index value
  flow7d: number;              // 7-day % change
  flow30d: number;             // 30-day % change
  flowVelocity: number;        // Acceleration (flow7d - previous 7d)

  // Historical Data for Charts
  flowHistory: FlowDataPoint[];      // 30-day flow history
  velocityHistory: FlowDataPoint[];  // 30-day velocity history

  // Phase Detection
  phase: Phase;
  daysInPhase: number;
  phaseStartDate: Date;
  avgPhaseDuration: number;    // Historical average

  // Rotation Signals
  rotationSignal: RotationSignal;
  rotationTarget: MarketType | null;
  rotationConfidence: number;  // 0-100

  // Sub-markets (for drill-down)
  sectors?: SectorFlow[];

  // Timestamps
  lastUpdated: Date;
}

// RRP Trend (Reverse Repo)
export type RrpTrend = 'draining' | 'filling' | 'stable';

// TGA Trend (Treasury General Account)
export type TgaTrend = 'building' | 'spending' | 'stable';

// Global Liquidity Metrics
export interface GlobalLiquidity {
  fedBalanceSheet: {
    value: number;             // Trillions USD
    change30d: number;         // % change
    trend: LiquidityTrend;
  };

  m2MoneySupply: {
    value: number;             // Trillions USD
    change30d: number;
    yoyGrowth: number;         // Year-over-year %
  };

  dxy: {
    value: number;             // Dollar Index
    change7d: number;
    trend: DxyTrend;
  };

  vix: {
    value: number;             // Fear Index
    level: VixLevel;
  };

  yieldCurve: {
    spread10y2y: number;       // 10Y - 2Y Treasury spread
    inverted: boolean;
    interpretation: string;
  };

  // Reverse Repo - Money parked at Fed (drains liquidity)
  reverseRepo: {
    value: number;             // Trillions USD
    change7d: number;
    change30d: number;
    trend: RrpTrend;
  };

  // Treasury General Account - Treasury's checking account (high TGA drains liquidity)
  treasuryGeneralAccount: {
    value: number;             // Trillions USD
    change7d: number;
    change30d: number;
    trend: TgaTrend;
  };

  // Net Liquidity = Fed Balance Sheet - RRP - TGA
  // This is the key metric for available market liquidity
  netLiquidity: {
    value: number;             // Trillions USD
    change7d: number;
    change30d: number;
    trend: LiquidityTrend;
    components: {
      fedBalanceSheet: number;
      reverseRepo: number;
      tga: number;
    };
    interpretation: string;
  };

  lastUpdated: Date;
}

// Rotation Event
export interface RotationEvent {
  id: string;
  fromMarket: MarketType;
  toMarket: MarketType;
  startDate: Date;
  endDate?: Date;
  durationDays?: number;
  flowMagnitude: number;
}

// Active Rotation
export interface ActiveRotation {
  from: MarketType;
  to: MarketType;
  confidence: number;
  estimatedDuration: string;
  startedAt: Date;
}

// Market Correlation
export interface MarketCorrelation {
  market1: MarketType;
  market2: MarketType;
  correlation: number;        // -1 to +1
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative' | 'neutral';
  interpretation: string;     // Human-readable explanation
}

// Correlation Matrix (all market pairs)
export interface CorrelationMatrix {
  correlations: MarketCorrelation[];
  strongestPositive: MarketCorrelation | null;
  strongestNegative: MarketCorrelation | null;
  insights: string;           // AI-generated insight about correlations
  lastUpdated: Date;
}

// Trade Direction
export type TradeDirection = 'BUY' | 'SELL';

// Rotation Trade Opportunity
export interface RotationTradeOpportunity {
  market: MarketType;
  direction: TradeDirection;
  reason: string;
  confidence: number;         // 0-100
  flowSignal: 'entering' | 'exiting';
  relatedMarkets: {
    market: MarketType;
    relationship: 'source' | 'destination';  // source = money coming from, destination = money going to
  }[];
  suggestedSectors?: string[];
  riskLevel: 'low' | 'medium' | 'high';

  // Enhanced correlation info for UI
  correlationInfo?: {
    strongestCorrelation: {
      market: MarketType;
      value: number;          // -1 to +1
      direction: 'positive' | 'negative';
      interpretation: string;
    };
    hedgeSuggestion?: {
      market: MarketType;
      correlation: number;
    };
  };

  // Phase context for the opportunity
  phaseContext: {
    currentPhase: Phase;
    daysInPhase: number;
    avgDuration: number;
    phaseProgress: number;    // 0-100%
  };
}

// Multi-Market Trade Opportunities
export interface TradeOpportunities {
  opportunities: RotationTradeOpportunity[];
  rotationSummary: string;    // Human-readable summary of the rotation
  totalOpportunities: number;
  buyOpportunities: number;
  sellOpportunities: number;
  lastUpdated: Date;
}

// 5-Factor Scoring System for Layer 4 Recommendations
// Each factor scores 0-100, weighted to produce final confidence
export interface FiveFactorScore {
  liquidityScore: number;       // 0-100 - Global liquidity conditions (25% weight)
  flowScore: number;            // 0-100 - Market-specific capital flow (30% weight)
  phaseScore: number;           // 0-100 - Cycle timing (20% weight)
  rotationScore: number;        // 0-100 - Capital rotation signals (15% weight)
  correlationScore: number;     // 0-100 - Cross-market alignment (10% weight)
  totalScore: number;           // Weighted average (0-100)
  breakdown: {
    liquidity: string;          // Human-readable explanation
    flow: string;
    phase: string;
    rotation: string;
    correlation: string;
  };
}

// Factor weights for 5-factor scoring (exported for frontend display)
export const FIVE_FACTOR_WEIGHTS = {
  liquidity: 0.25,    // 25%
  flow: 0.30,         // 30%
  phase: 0.20,        // 20%
  rotation: 0.15,     // 15%
  correlation: 0.10,  // 10%
} as const;

// ============================================================================
// MLIS CONFIRMATION SYSTEM (Step 8)
// ============================================================================
// MLIS serves as a "second opinion" confirmation layer for 7-Step analysis
// It validates or challenges the 7-Step verdict using different methodology

/**
 * Agreement Level between 7-Step and MLIS analysis
 * - FULL_AGREEMENT: Both methodologies agree on direction and conviction
 * - PARTIAL_AGREEMENT: Same direction but different conviction levels
 * - NEUTRAL: MLIS is neutral, doesn't confirm or contradict
 * - DISAGREEMENT: Methodologies disagree on direction
 */
export type AgreementLevel = 'FULL_AGREEMENT' | 'PARTIAL_AGREEMENT' | 'NEUTRAL' | 'DISAGREEMENT';

/**
 * Confidence adjustment based on agreement
 * - FULL_AGREEMENT: Boost confidence by 10-15%
 * - PARTIAL_AGREEMENT: No change
 * - NEUTRAL: Slight reduction (5%)
 * - DISAGREEMENT: Significant reduction (20-30%) with warning
 */
export interface MLISConfirmation {
  // Core MLIS signals
  mlisDirection: 'LONG' | 'SHORT' | 'NEUTRAL';
  mlisRecommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  mlisScore: number;          // 0-100
  mlisConfidence: number;     // 0-100

  // 7-Step comparison
  sevenStepVerdict: string;   // GO, CONDITIONAL_GO, WAIT, AVOID
  sevenStepDirection: string; // LONG, SHORT, NEUTRAL
  sevenStepScore: number;     // 0-10

  // Agreement analysis
  agreementLevel: AgreementLevel;
  agreementReason: string;

  // Confidence adjustment
  originalConfidence: number;
  adjustedConfidence: number;
  confidenceChange: number;

  // Signals comparison
  alignedSignals: string[];     // Signals where both agree
  conflictingSignals: string[]; // Signals where they disagree

  // Final recommendation
  confirmationStatus: 'CONFIRMED' | 'PARTIALLY_CONFIRMED' | 'UNCONFIRMED' | 'CONTRADICTED';
  warningMessage?: string;      // Warning if MLIS disagrees

  // Metadata
  analysisTimestamp: string;
}

/**
 * MLIS Confirmation weights for confidence adjustment
 */
export const MLIS_CONFIRMATION_WEIGHTS = {
  FULL_AGREEMENT: 1.15,      // Boost confidence by 15%
  PARTIAL_AGREEMENT: 1.0,    // No change
  NEUTRAL: 0.95,             // Reduce by 5%
  DISAGREEMENT: 0.75,        // Reduce by 25%
} as const;

/**
 * Mapping from 7-Step verdict to expected MLIS recommendation
 */
export const VERDICT_TO_MLIS_MAP: Record<string, string[]> = {
  'GO': ['STRONG_BUY', 'BUY'],
  'CONDITIONAL_GO': ['BUY', 'HOLD'],
  'WAIT': ['HOLD'],
  'AVOID': ['SELL', 'STRONG_SELL', 'HOLD'],
} as const;

// Suggested Asset for Layer 4 → Asset Analysis connection
export interface SuggestedAsset {
  symbol: string;
  name: string;
  market: MarketType;
  sector?: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;  // Why this asset is suggested
}

// Flow Recommendation
export interface FlowRecommendation {
  primaryMarket: MarketType;
  phase: Phase;
  action: FlowAction;
  direction: TradeDirection;  // BUY or SELL
  reason: string;
  sectors?: string[];
  confidence: number;
  fiveFactorScore?: FiveFactorScore;  // 5-factor scoring breakdown
  // Layer 4 → Asset Analysis connection
  suggestedAssets?: SuggestedAsset[];
}

// Capital Flow Summary (main response)
export interface CapitalFlowSummary {
  timestamp: Date;

  // Global Liquidity
  globalLiquidity: GlobalLiquidity;
  liquidityBias: LiquidityBias;

  // Market Flows
  markets: MarketFlow[];

  // Market Correlations
  correlations?: CorrelationMatrix;

  // Trade Opportunities (multi-market)
  tradeOpportunities?: TradeOpportunities;

  // Recommendations
  recommendation: FlowRecommendation;       // Primary BUY recommendation
  sellRecommendation?: FlowRecommendation;  // SELL recommendation for outflow markets

  // Rotation
  activeRotation: ActiveRotation | null;

  // AI-generated insights for each layer
  insights?: LayerInsights;

  // Cache info
  cacheExpiry?: Date;
}

// AI-generated insights for each layer
export interface LayerInsights {
  layer1: string;  // Global Liquidity interpretation
  layer2: string;  // Market Flow interpretation
  layer3: string;  // Sector analysis
  layer4: string;  // Overall recommendation reasoning
  // RAG Yorumları - Veriye dayalı kısa özetler
  ragLayer1?: string;  // Net Liquidity yorumu (1-2 cümle)
  ragLayer2?: string;  // Market rotasyonu yorumu (1-2 cümle)
  ragLayer3?: string;  // Sektör fırsatı yorumu (1-2 cümle)
  ragLayer4?: string;  // Aksiyon önerisi yorumu (1-2 cümle)
  generatedAt: Date;
}

// Provider Response Types
export interface FredSeriesData {
  date: string;
  value: number;
}

export interface FredResponse {
  observations: Array<{
    date: string;
    value: string;
  }>;
}

export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
}

export interface DefiLlamaTvlResponse {
  totalLiquidity: number;
  chains: Array<{
    name: string;
    tvl: number;
    change_1d: number;
    change_7d: number;
  }>;
}

export interface CryptoGlobalMetrics {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  change24h: number;
  change7d: number;
  change30d: number;
}

// Sector Definitions
export const CRYPTO_SECTORS = ['DeFi', 'Layer2', 'Meme', 'AI', 'Gaming', 'Infrastructure'] as const;
export const STOCK_SECTORS = ['Tech', 'Finance', 'Energy', 'Healthcare', 'Consumer', 'Industrial'] as const;

export type CryptoSector = typeof CRYPTO_SECTORS[number];
export type StockSector = typeof STOCK_SECTORS[number];

// Phase Configuration
export const PHASE_CONFIG = {
  early: {
    minFlow7d: 3,
    maxFlow30d: 5,
    maxDays: 30,
    color: '#22c55e',        // Green
    label: 'EARLY',
    action: 'Optimal entry window'
  },
  mid: {
    minFlow7d: 0,
    minFlow30d: 5,
    minDays: 30,
    maxDays: 60,
    color: '#eab308',        // Yellow
    label: 'MID',
    action: 'Proceed with caution'
  },
  late: {
    minDays: 60,
    maxDays: 90,
    color: '#f97316',        // Orange
    label: 'LATE',
    action: 'No new entries'
  },
  exit: {
    minDays: 90,
    color: '#ef4444',        // Red
    label: 'EXIT',
    action: 'Do not enter'
  }
} as const;

// Market Display Configuration
export const MARKET_CONFIG: Record<MarketType, {
  name: string;
  icon: string;
  color: string;
  symbols: string[];
}> = {
  crypto: {
    name: 'Crypto',
    icon: '₿',
    color: '#f7931a',
    symbols: ['BTC', 'ETH', 'Total MCap']
  },
  stocks: {
    name: 'Stocks',
    icon: '📈',
    color: '#3b82f6',
    symbols: ['SPX', 'NDX', 'DJI']
  },
  bonds: {
    name: 'Bonds',
    icon: '🏛️',
    color: '#6366f1',
    symbols: ['10Y', '2Y', 'TLT']
  },
  metals: {
    name: 'Metals',
    icon: '🥇',
    color: '#fbbf24',
    symbols: ['XAU', 'XAG', 'GLD']
  }
};
