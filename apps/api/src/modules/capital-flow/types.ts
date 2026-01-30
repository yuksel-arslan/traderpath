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

// Market Flow Data
export interface MarketFlow {
  market: MarketType;

  // Current State
  currentValue: number;        // Market cap or index value
  flow7d: number;              // 7-day % change
  flow30d: number;             // 30-day % change
  flowVelocity: number;        // Acceleration (flow7d - previous 7d)

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

// Flow Recommendation
export interface FlowRecommendation {
  primaryMarket: MarketType;
  phase: Phase;
  action: FlowAction;
  reason: string;
  sectors?: string[];
  confidence: number;
}

// Capital Flow Summary (main response)
export interface CapitalFlowSummary {
  timestamp: Date;

  // Global Liquidity
  globalLiquidity: GlobalLiquidity;
  liquidityBias: LiquidityBias;

  // Market Flows
  markets: MarketFlow[];

  // Recommendation
  recommendation: FlowRecommendation;

  // Rotation
  activeRotation: ActiveRotation | null;

  // Cache info
  cacheExpiry?: Date;
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
