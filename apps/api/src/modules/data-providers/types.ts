/**
 * Data Provider Types
 */

export interface DataProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl: string;
  rateLimit: number; // requests per minute
  isPaid: boolean;
  isEnabled: boolean;
}

export interface MarketSentiment {
  value: number; // 0-100
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  timestamp: number;
  source: string;
}

export interface OnChainMetrics {
  // Exchange flows
  exchangeInflow?: number;
  exchangeOutflow?: number;
  netFlow?: number;

  // Whale activity
  whaleTransactions?: number;
  largeHolderNetflow?: number;

  // Network activity
  activeAddresses?: number;
  transactionCount?: number;

  // Supply metrics
  supplyOnExchanges?: number;
  supplyInProfit?: number;

  timestamp: number;
  source: string;
}

export interface SocialSentiment {
  twitterMentions?: number;
  redditMentions?: number;
  socialVolume?: number;
  sentimentScore?: number; // -100 to 100
  trendingScore?: number;
  timestamp: number;
  source: string;
}

export interface InstitutionalFlow {
  // Fund flows
  etfInflows?: number;
  etfOutflows?: number;
  grayscaleHoldings?: number;

  // Futures data
  openInterest?: number;
  longShortRatio?: number;
  fundingRate?: number;

  // Options data
  putCallRatio?: number;
  maxPainPrice?: number;

  timestamp: number;
  source: string;
}

export interface SmartMoneyIndicators {
  // Whale tracking
  topHoldersBalance?: number;
  topHoldersChange24h?: number;

  // Smart money sentiment
  smartMoneyBuying?: boolean;
  smartMoneyConfidence?: number;

  // Institutional activity
  institutionalVolume?: number;
  retailVolume?: number;

  timestamp: number;
  source: string;
}

export interface DataProviderResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Provider capability flags
export interface ProviderCapabilities {
  marketSentiment: boolean;
  onChainMetrics: boolean;
  socialSentiment: boolean;
  institutionalFlow: boolean;
  smartMoneyIndicators: boolean;
  historicalData: boolean;
  realTimeData: boolean;
}
