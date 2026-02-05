/**
 * Multi-Market Data Provider Types
 *
 * Supports: Crypto, Stocks, Bonds, Metals
 * "Para nereye akıyorsa potansiyel oradadır"
 */

// Asset class types
export type AssetClass = 'crypto' | 'stocks' | 'bonds' | 'metals' | 'bist';

// OHLCV Candle (universal format)
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Market data snapshot
export interface MarketData {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  lastUpdated: Date;
}

// Order book level
export interface OrderBookLevel {
  price: number;
  quantity: number;
}

// Order book data
export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
}

// Base fundamentals (extended per asset class)
export interface BaseFundamentals {
  symbol: string;
  assetClass: AssetClass;
  lastUpdated: Date;
}

// Crypto-specific fundamentals (tokenomics)
export interface CryptoFundamentals extends BaseFundamentals {
  assetClass: 'crypto';
  marketCap: number;
  fullyDilutedValuation?: number;
  circulatingSupply: number;
  totalSupply?: number;
  maxSupply?: number;
  rank?: number;
  // Futures data (if available)
  fundingRate?: number;
  openInterest?: number;
  longShortRatio?: number;
}

// Stock-specific fundamentals
export interface StockFundamentals extends BaseFundamentals {
  assetClass: 'stocks';
  marketCap: number;
  peRatio?: number;
  forwardPE?: number;
  pegRatio?: number;
  eps?: number;
  epsGrowth?: number;
  revenue?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  dividendYield?: number;
  beta?: number;
  sector?: string;
  industry?: string;
  // Earnings dates
  nextEarningsDate?: Date;
  lastEarningsDate?: Date;
  // Analyst ratings
  analystRating?: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  targetPrice?: number;
  numberOfAnalysts?: number;
}

// Bond-specific fundamentals
export interface BondFundamentals extends BaseFundamentals {
  assetClass: 'bonds';
  yield: number;
  couponRate?: number;
  maturityDate?: Date;
  duration?: number;
  modifiedDuration?: number;
  creditRating?: string;
  issuer?: string;
  // Yield curve context
  yieldCurveSpread?: number;  // vs benchmark
  realYield?: number;         // inflation-adjusted
  // For treasury analysis
  is10Year?: boolean;
  is2Year?: boolean;
  spreadVs10Y?: number;
}

// Metals-specific fundamentals
export interface MetalsFundamentals extends BaseFundamentals {
  assetClass: 'metals';
  spotPrice: number;
  futuresPrice?: number;
  futuresExpiry?: Date;
  // Correlations
  usdCorrelation?: number;    // Usually negative for gold
  inflationCorrelation?: number;
  // Supply/demand
  mineProduction?: number;
  centralBankHoldings?: number;
  etfHoldings?: number;
  // Ratios
  goldSilverRatio?: number;   // For silver analysis
  // Geopolitical
  geopoliticalRiskScore?: number;
}

// Union type for all fundamentals
export type AssetFundamentals =
  | CryptoFundamentals
  | StockFundamentals
  | BondFundamentals
  | MetalsFundamentals;

// News item
export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;  // -1 to 1
  relevanceScore?: number;  // 0 to 1
}

// News analysis result
export interface NewsAnalysis {
  symbol: string;
  items: NewsItem[];
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  totalArticles: number;
  recentArticles: number;  // Last 24h
  lastUpdated: Date;
}

// Provider capabilities
export interface ProviderCapabilities {
  hasOrderBook: boolean;
  hasFundamentals: boolean;
  hasNews: boolean;
  hasFutures: boolean;
  hasRealtime: boolean;
  supportedTimeframes: string[];
  maxCandleLimit: number;
}

// Symbol info returned by resolver
export interface ResolvedSymbol {
  original: string;
  normalized: string;
  assetClass: AssetClass;
  exchange?: string;
  baseCurrency?: string;
  quoteCurrency?: string;
  displayName: string;
}

// Supported symbols per market
export const SUPPORTED_SYMBOLS: Record<AssetClass, string[]> = {
  crypto: [
    // Major
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'MATIC', 'LINK',
    'UNI', 'ATOM', 'LTC', 'ETC', 'XLM', 'ALGO', 'VET', 'FIL', 'THETA', 'XTZ',
    // DeFi
    'AAVE', 'MKR', 'CRV', 'COMP', 'SNX', 'YFI', '1INCH', 'SUSHI', 'BAL', 'LDO',
    // Layer 2
    'ARB', 'OP', 'IMX', 'STRK', 'MANTA', 'METIS',
    // Meme
    'DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI',
    // AI
    'FET', 'AGIX', 'OCEAN', 'RNDR', 'TAO', 'WLD',
    // Gaming
    'SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'ILV',
  ],
  stocks: [
    // Major indices ETFs
    'SPY', 'QQQ', 'DIA', 'IWM', 'VTI',
    // Sector ETFs
    'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLU', 'XLB', 'XLRE',
    // Tech giants
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'CRM',
    // Finance
    'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW',
    // Healthcare
    'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY',
    // Consumer
    'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'DIS', 'NFLX',
    // Energy
    'XOM', 'CVX', 'COP', 'SLB', 'EOG',
    // Industrial
    'CAT', 'BA', 'HON', 'UPS', 'LMT', 'RTX',
  ],
  bonds: [
    // Treasury ETFs
    'TLT',   // 20+ Year Treasury
    'IEF',   // 7-10 Year Treasury
    'SHY',   // 1-3 Year Treasury
    'BND',   // Total Bond Market
    'AGG',   // Aggregate Bond
    'LQD',   // Investment Grade Corporate
    'HYG',   // High Yield Corporate
    'TIP',   // TIPS (Inflation Protected)
    'MUB',   // Municipal Bonds
    'EMB',   // Emerging Market Bonds
    // Direct Treasury symbols (for yield analysis)
    'US10Y', // 10-Year Treasury Yield
    'US2Y',  // 2-Year Treasury Yield
    'US30Y', // 30-Year Treasury Yield
    'US5Y',  // 5-Year Treasury Yield
  ],
  metals: [
    // Precious metals
    'XAUUSD', // Gold spot
    'XAGUSD', // Silver spot
    'GLD',    // Gold ETF
    'SLV',    // Silver ETF
    'IAU',    // iShares Gold
    'PSLV',   // Physical Silver
    // Platinum/Palladium
    'PPLT',   // Platinum ETF
    'PALL',   // Palladium ETF
    // Mining
    'GDX',    // Gold Miners
    'GDXJ',   // Junior Gold Miners
    'SIL',    // Silver Miners
  ],
  bist: [
    // BIST Index
    'XU100.IS',  // BIST 100 Index
    // Banking
    'GARAN.IS',  // Garanti BBVA
    'AKBNK.IS',  // Akbank
    'YKBNK.IS',  // Yapı Kredi
    'ISCTR.IS',  // İş Bankası
    'HALKB.IS',  // Halkbank
    'VAKBN.IS',  // Vakıfbank
    'TSKB.IS',   // Türkiye Sınai Kalkınma Bankası
    // Holding
    'KCHOL.IS',  // Koç Holding
    'SAHOL.IS',  // Sabancı Holding
    'TAVHL.IS',  // TAV Havalimanları
    'TKFEN.IS',  // Tekfen Holding
    'DOHOL.IS',  // Doğan Holding
    // Industrial
    'SISE.IS',   // Şişecam
    'TOASO.IS',  // Tofaş
    'FROTO.IS',  // Ford Otosan
    'EREGL.IS',  // Ereğli Demir Çelik
    'KRDMD.IS',  // Kardemir
    'TUPRS.IS',  // Tüpraş
    'PETKM.IS',  // Petkim
    // Aviation & Tourism
    'THYAO.IS',  // Türk Hava Yolları
    'PGSUS.IS',  // Pegasus
    // Telecom
    'TCELL.IS',  // Turkcell
    'TTKOM.IS',  // Türk Telekom
    // Retail
    'BIMAS.IS',  // BİM
    'MGROS.IS',  // Migros
    'SOKM.IS',   // Şok Market
    // Real Estate & Construction
    'ENKAI.IS',  // Enka İnşaat
    'EKGYO.IS',  // Emlak Konut GYO
    // Technology
    'ASELS.IS',  // Aselsan
    'LOGO.IS',   // Logo Yazılım
    // Other
    'ARCLK.IS',  // Arçelik
    'VESTL.IS',  // Vestel
    'KOZAL.IS',  // Koza Altın
    'KOZAA.IS',  // Koza Anadolu
  ],
};

// Timeframe mappings (provider-specific)
export const TIMEFRAME_MAPPINGS: Record<AssetClass, Record<string, string>> = {
  crypto: {
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '2h': '2h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
  },
  stocks: {
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '60m',
    '2h': '2h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1wk',
  },
  bonds: {
    '1h': '60m',
    '4h': '4h',
    '1d': '1d',
    '1w': '1wk',
  },
  metals: {
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '60m',
    '4h': '4h',
    '1d': '1d',
    '1w': '1wk',
  },
  bist: {
    '15m': '15m',
    '30m': '30m',
    '1h': '60m',
    '4h': '4h',
    '1d': '1d',
    '1w': '1wk',
  },
};
