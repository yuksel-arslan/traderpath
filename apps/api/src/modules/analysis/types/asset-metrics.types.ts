// ===========================================
// Asset-Specific Metrics Types
// Each asset class has its own relevant metrics
// ===========================================

export type AssetClass = 'crypto' | 'stocks' | 'metals' | 'bonds' | 'bist';

// Signal direction
export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

// Market regime based on inter-market analysis
export type MarketRegime = 'risk_on' | 'risk_off' | 'inflation' | 'deflation' | 'liquidity_crisis' | 'transitioning';

// ===========================================
// BASE INTERFACES
// ===========================================

export interface MetricValue {
  name: string;
  value: number;
  weight: number;
  signal: SignalDirection;
  source: string;
  description: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface AssetMetrics {
  assetClass: AssetClass;
  symbol: string;
  metrics: MetricValue[];
  sentiment: SignalDirection;
  sentimentScore: number; // 0-100
  keyDrivers: string[];
  warnings: string[];
  analyzedAt: Date;
}

// ===========================================
// CRYPTO METRICS
// ===========================================

export interface CryptoMetrics extends AssetMetrics {
  assetClass: 'crypto';

  // Primary metrics
  fearGreedIndex: number;           // 0-100, Alternative.me
  fearGreedLabel: string;           // extreme_fear, fear, neutral, greed, extreme_greed
  btcDominance: number;             // BTC market cap %
  btcDominanceTrend: 'up' | 'down' | 'flat';

  // Derivatives & Leverage
  fundingRate: number;              // Perpetual funding rate
  fundingSignal: SignalDirection;   // Positive = overleveraged longs
  openInterest: number;             // Total OI
  openInterestChange24h: number;    // % change

  // On-chain
  exchangeNetFlow: number;          // Positive = inflow (bearish), Negative = outflow (bullish)
  exchangeFlowSignal: SignalDirection;
  whaleActivity: 'accumulating' | 'distributing' | 'neutral';
  activeAddresses: number;
  activeAddressesChange: number;

  // Ecosystem
  stablecoinMcap: number;           // Total stablecoin market cap
  stablecoinMcapChange: number;     // % change (growing = dry powder)
  defiTvl: number;                  // Total DeFi TVL
  defiTvlChange: number;            // % change

  // Altcoin rotation
  altcoinSeasonIndex: number;       // 0-100, >75 = altcoin season
  ethBtcRatio: number;              // ETH/BTC price ratio
  ethBtcTrend: 'up' | 'down' | 'flat';
}

// Crypto metric weights
export const CRYPTO_METRIC_WEIGHTS = {
  fearGreed: 0.20,
  btcDominance: 0.15,
  fundingRate: 0.15,
  exchangeFlow: 0.15,
  stablecoinMcap: 0.10,
  defiTvl: 0.10,
  whaleActivity: 0.10,
  altcoinSeason: 0.05,
} as const;

// ===========================================
// METALS METRICS (Gold, Silver)
// ===========================================

export interface MetalsMetrics extends AssetMetrics {
  assetClass: 'metals';

  // Primary drivers (45% combined weight)
  dxyIndex: number;                 // US Dollar Index - #1 driver
  dxyChange7d: number;              // % change
  dxyTrend: 'up' | 'down' | 'flat';
  dxySignal: SignalDirection;       // Down = bullish for gold

  realYields: number;               // 10Y TIPS yield - #2 driver
  realYieldsTrend: 'up' | 'down' | 'flat';
  realYieldsSignal: SignalDirection; // Negative/falling = bullish

  // Fear & Safety (15%)
  vix: number;                      // CBOE Volatility Index
  vixSignal: SignalDirection;       // High = bullish (safe haven demand)

  // Inflation (15%)
  inflationExpectations: number;    // 10Y breakeven inflation
  inflationTrend: 'up' | 'down' | 'flat';
  inflationSignal: SignalDirection; // High = bullish (inflation hedge)

  // Flows & Demand (15%)
  etfFlows: 'inflow' | 'outflow' | 'neutral';
  etfFlowsAmount: number;           // $ millions
  centralBankBuying: boolean;       // Central banks accumulating

  // Relative value (10%)
  silverGoldRatio: number;          // Silver price / Gold price
  silverGoldSignal: SignalDirection; // Historical mean reversion

  // Geopolitical (bonus)
  geopoliticalRisk: 'low' | 'medium' | 'high';
}

// Metals metric weights
export const METALS_METRIC_WEIGHTS = {
  dxy: 0.25,
  realYields: 0.20,
  vix: 0.15,
  inflation: 0.15,
  etfFlows: 0.10,
  centralBank: 0.10,
  silverGoldRatio: 0.05,
} as const;

// ===========================================
// STOCKS METRICS
// ===========================================

export interface StocksMetrics extends AssetMetrics {
  assetClass: 'stocks';

  // Volatility & Fear (20%)
  vix: number;
  vixTrend: 'up' | 'down' | 'flat';
  vixSignal: SignalDirection;       // Low VIX = bullish, High = bearish

  // Options sentiment (15%)
  putCallRatio: number;             // PCR > 1 = bearish sentiment (contrarian bullish)
  putCallSignal: SignalDirection;

  // Market internals (15%)
  advanceDecline: number;           // A/D ratio
  newHighsLows: number;             // New highs - new lows
  breadthSignal: SignalDirection;

  // Sector rotation (15%)
  leadingSector: string;            // XLK, XLF, XLE, etc.
  sectorRotation: 'defensive' | 'cyclical' | 'mixed';

  // Interest rates (10%)
  tenYearYield: number;
  tenYearTrend: 'up' | 'down' | 'flat';
  yieldSignal: SignalDirection;     // Context dependent

  // Dollar (10%)
  dxyIndex: number;
  dxySignal: SignalDirection;       // Weak dollar = bullish for stocks

  // Fundamentals (10%)
  earningsSurprise: 'positive' | 'negative' | 'inline';
  forwardPE: number;                // Forward P/E ratio

  // Flows (5%)
  institutionalFlow: 'inflow' | 'outflow' | 'neutral';
}

// Stocks metric weights
export const STOCKS_METRIC_WEIGHTS = {
  vix: 0.20,
  putCallRatio: 0.15,
  breadth: 0.15,
  sectorRotation: 0.15,
  tenYearYield: 0.10,
  dxy: 0.10,
  earnings: 0.10,
  institutionalFlow: 0.05,
} as const;

// ===========================================
// BONDS METRICS
// ===========================================

export interface BondsMetrics extends AssetMetrics {
  assetClass: 'bonds';

  // Yield curve (25%)
  yieldCurveSpread: number;         // 10Y - 2Y spread
  yieldCurveStatus: 'normal' | 'flat' | 'inverted';
  yieldCurveSignal: SignalDirection; // Inverted = recession risk

  // Fed policy (20%)
  fedFundsRate: number;
  fedExpectation: 'hawkish' | 'dovish' | 'neutral';
  nextFedMove: 'hike' | 'cut' | 'hold';
  fedSignal: SignalDirection;       // Dovish = bullish for bonds

  // Inflation (15%)
  cpiYoY: number;                   // CPI year-over-year
  pceYoY: number;                   // PCE year-over-year
  inflationTrend: 'up' | 'down' | 'flat';
  inflationSignal: SignalDirection; // Falling = bullish for bonds

  // Credit (15%)
  creditSpread: number;             // Investment grade spread
  highYieldSpread: number;          // High yield spread
  creditSignal: SignalDirection;    // Widening = risk-off

  // Flight to safety (15%)
  flightToSafety: boolean;
  tltTrend: 'up' | 'down' | 'flat'; // Long-term treasury ETF

  // Duration (10%)
  durationRisk: 'low' | 'medium' | 'high';
  convexity: number;
}

// Bonds metric weights
export const BONDS_METRIC_WEIGHTS = {
  yieldCurve: 0.25,
  fedPolicy: 0.20,
  inflation: 0.15,
  creditSpreads: 0.15,
  flightToSafety: 0.15,
  duration: 0.10,
} as const;

// ===========================================
// INTER-MARKET CONTEXT
// ===========================================

export interface InterMarketContext {
  regime: MarketRegime;
  regimeConfidence: number;         // 0-100
  regimeStartDate?: Date;

  // Expected behavior for current regime
  expectedBehavior: {
    crypto: SignalDirection;
    stocks: SignalDirection;
    metals: SignalDirection;
    bonds: SignalDirection;
    bist: SignalDirection;
  };

  // Actual behavior (from price data)
  actualBehavior: {
    crypto: SignalDirection;
    stocks: SignalDirection;
    metals: SignalDirection;
    bonds: SignalDirection;
  };

  // Correlations
  correlations: {
    cryptoStocks: number;           // -1 to 1
    goldDxy: number;
    bondsStocks: number;
    cryptoGold: number;
  };

  // Anomalies detected
  anomalies: AnomalyDetection[];
}

export interface AnomalyDetection {
  asset: string;
  assetClass: AssetClass;
  expected: SignalDirection;
  actual: SignalDirection;
  severity: 'low' | 'medium' | 'high';
  message: string;
  possibleReasons: string[];
}

// ===========================================
// REGIME DEFINITIONS
// ===========================================

export const REGIME_EXPECTATIONS: Record<MarketRegime, {
  crypto: SignalDirection;
  stocks: SignalDirection;
  metals: SignalDirection;
  bonds: SignalDirection;
  bist: SignalDirection;
  description: string;
}> = {
  risk_on: {
    crypto: 'bullish',
    stocks: 'bullish',
    metals: 'bearish',
    bonds: 'bearish',
    bist: 'bullish',
    description: 'Risk appetite high, money flows to growth assets',
  },
  risk_off: {
    crypto: 'bearish',
    stocks: 'bearish',
    metals: 'bullish',
    bonds: 'bullish',
    bist: 'bearish',
    description: 'Fear dominates, flight to safety',
  },
  inflation: {
    crypto: 'bullish',
    stocks: 'neutral',
    metals: 'bullish',
    bonds: 'bearish',
    bist: 'bearish', // Turkish stocks suffer from high inflation
    description: 'Inflation hedges outperform, bonds suffer',
  },
  deflation: {
    crypto: 'bearish',
    stocks: 'bearish',
    metals: 'neutral',
    bonds: 'bullish',
    bist: 'bearish',
    description: 'Cash and bonds win, risk assets lose',
  },
  liquidity_crisis: {
    crypto: 'bearish',
    stocks: 'bearish',
    metals: 'bearish',  // Initially, then recovers
    bonds: 'bullish',   // Flight to treasuries
    bist: 'bearish',
    description: 'Everything sells off initially, cash is king',
  },
  transitioning: {
    crypto: 'neutral',
    stocks: 'neutral',
    metals: 'neutral',
    bonds: 'neutral',
    bist: 'neutral',
    description: 'Regime change in progress, high uncertainty',
  },
};

// ===========================================
// ASSET CLASS DETECTION
// ===========================================

export const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'ETC', 'XLM', 'ALGO', 'VET', 'FIL', 'AAVE',
  'PEPE', 'SHIB', 'WIF', 'BONK', 'NEAR', 'APT', 'SUI', 'ARB', 'OP', 'INJ',
  // Add USDT suffix variants
];

export const METALS_SYMBOLS = [
  'GLD', 'SLV', 'IAU', 'SGOL', 'SIVR', 'PSLV', 'PHYS',
  'XAUUSD', 'XAGUSD', 'GOLD', 'SILVER',
  'GC=F', 'SI=F', // Futures
];

export const BONDS_SYMBOLS = [
  'TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG', 'JNK',
  'TIP', 'GOVT', 'VCIT', 'VCSH', 'MUB', 'EMB',
  'ZN=F', 'ZB=F', // Futures
];

export const STOCKS_INDICES = [
  // Major indices & ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO',
  'SPX', 'NDX', 'DJI', 'RUT',
  // Sector ETFs (SPDR Select Sector)
  'XLE', 'XLF', 'XLK', 'XLV', 'XLI', 'XLC', 'XLY', 'XLP', 'XLU', 'XLB', 'XLRE',
  // Other popular ETFs
  'ARKK', 'ARKW', 'ARKF', 'ARKG', 'ARKQ',
  'SMH', 'XBI', 'KRE', 'XOP', 'GDX', 'GDXJ',
  'EEM', 'EFA', 'FXI', 'KWEB', 'INDA',
  'RSP', 'MDY', 'IJR', 'SCHD', 'VIG', 'DVY',
];

export function detectAssetClass(symbol: string): AssetClass {
  const upperSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');

  // Check known crypto symbols FIRST to prevent substring false positives
  // e.g. SHIB contains 'SI' (Silver futures), SUSHI contains 'SI', etc.
  if (CRYPTO_SYMBOLS.some(s => upperSymbol === s)) {
    return 'crypto';
  }

  // Check BIST (ends with .IS suffix or known BIST symbols)
  if (upperSymbol.endsWith('.IS')) {
    return 'bist';
  }
  const knownBist = ['THYAO', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'HALKB', 'VAKBN', 'TSKB',
    'KCHOL', 'SAHOL', 'TAVHL', 'TKFEN', 'DOHOL', 'SISE', 'TOASO', 'FROTO', 'EREGL', 'KRDMD',
    'TUPRS', 'PETKM', 'PGSUS', 'TCELL', 'TTKOM', 'BIMAS', 'MGROS', 'SOKM', 'ENKAI', 'EKGYO',
    'ASELS', 'LOGO', 'ARCLK', 'VESTL', 'KOZAL', 'KOZAA', 'XU100'];
  if (knownBist.some(s => upperSymbol === s || upperSymbol === `${s}.IS`)) {
    return 'bist';
  }

  // Use exact match for metals/bonds/stocks to avoid substring collisions
  if (METALS_SYMBOLS.some(s => upperSymbol === s.replace('=F', '').replace('USD', ''))) {
    return 'metals';
  }

  if (BONDS_SYMBOLS.some(s => upperSymbol === s.replace('=F', ''))) {
    return 'bonds';
  }

  if (STOCKS_INDICES.some(s => upperSymbol === s)) {
    return 'stocks';
  }

  // Check if it's a known stock ticker (not crypto)
  const knownStocks = [
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT',
    'MA', 'UNH', 'HD', 'PG', 'JNJ', 'BAC', 'COST', 'NFLX', 'CRM', 'AMD', 'INTC',
    'DIS', 'PEP', 'KO', 'CSCO', 'ADBE', 'ORCL', 'ABT', 'MRK', 'PFE', 'LLY',
    'PYPL', 'SHOP', 'SQ', 'UBER', 'ABNB', 'COIN', 'PLTR', 'SNOW', 'NET', 'DDOG',
  ];
  if (knownStocks.some(s => upperSymbol === s)) {
    return 'stocks';
  }

  // Default to crypto
  return 'crypto';
}
