/**
 * CoinGecko Free API Provider
 *
 * Features:
 * - Market data (price, volume, market cap)
 * - Trending coins
 * - Global market metrics
 * - Exchange data
 *
 * Rate Limits: 10-30 calls/minute (free tier)
 * Docs: https://www.coingecko.com/en/api/documentation
 */

import {
  DataProviderResponse,
  MarketSentiment,
  CacheEntry,
  ProviderCapabilities,
} from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache: Map<string, CacheEntry<unknown>> = new Map();

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

export const coingeckoCapabilities: ProviderCapabilities = {
  marketSentiment: true,
  onChainMetrics: false,
  socialSentiment: true,
  institutionalFlow: false,
  smartMoneyIndicators: false,
  historicalData: true,
  realTimeData: false,
};

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d?: number;
  circulating_supply: number;
  total_supply: number;
  ath: number;
  ath_change_percentage: number;
}

export interface CoinGeckoGlobalData {
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
  active_cryptocurrencies: number;
}

export interface CoinGeckoTrending {
  coins: Array<{
    item: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      price_btc: number;
      score: number;
    };
  }>;
}

/**
 * Fetch with error handling and caching
 */
async function fetchCoinGecko<T>(
  endpoint: string,
  cacheKey: string,
  cacheTtl: number = CACHE_TTL
): Promise<DataProviderResponse<T>> {
  // Check cache first
  const cached = getFromCache<T>(cacheKey);
  if (cached) {
    return {
      success: true,
      data: cached,
      cached: true,
      timestamp: Date.now(),
    };
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as T;
    setCache(cacheKey, data, cacheTtl);

    return {
      success: true,
      data,
      cached: false,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

/**
 * Get market data for a specific coin
 */
export async function getCoinMarketData(
  coinId: string = 'bitcoin'
): Promise<DataProviderResponse<CoinGeckoMarketData>> {
  const response = await fetchCoinGecko<CoinGeckoMarketData[]>(
    `/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false`,
    `market_${coinId}`
  );

  if (response.success && response.data && response.data.length > 0) {
    return {
      ...response,
      data: response.data[0],
    };
  }

  return {
    success: false,
    error: response.error || 'No data found',
    timestamp: Date.now(),
  };
}

/**
 * Get global market data
 */
export async function getGlobalMarketData(): Promise<
  DataProviderResponse<CoinGeckoGlobalData>
> {
  const response = await fetchCoinGecko<{ data: CoinGeckoGlobalData }>(
    '/global',
    'global_data'
  );

  if (response.success && response.data) {
    return {
      ...response,
      data: response.data.data,
    };
  }

  return response as unknown as DataProviderResponse<CoinGeckoGlobalData>;
}

/**
 * Get trending coins (good for sentiment analysis)
 */
export async function getTrendingCoins(): Promise<
  DataProviderResponse<CoinGeckoTrending>
> {
  return fetchCoinGecko<CoinGeckoTrending>(
    '/search/trending',
    'trending',
    10 * 60 * 1000 // 10 minute cache
  );
}

/**
 * Calculate market sentiment from CoinGecko data
 */
export async function calculateMarketSentiment(): Promise<
  DataProviderResponse<MarketSentiment>
> {
  try {
    const [globalRes, btcRes] = await Promise.all([
      getGlobalMarketData(),
      getCoinMarketData('bitcoin'),
    ]);

    if (!globalRes.success || !btcRes.success) {
      return {
        success: false,
        error: 'Failed to fetch market data',
        timestamp: Date.now(),
      };
    }

    const global = globalRes.data!;
    const btc = btcRes.data!;

    // Calculate sentiment score based on multiple factors
    let sentimentScore = 50; // Start neutral

    // Factor 1: 24h market cap change (-10 to +10)
    const mcChange = global.market_cap_change_percentage_24h_usd;
    sentimentScore += Math.max(-10, Math.min(10, mcChange * 2));

    // Factor 2: BTC price change 24h (-15 to +15)
    const btcChange = btc.price_change_percentage_24h;
    sentimentScore += Math.max(-15, Math.min(15, btcChange * 1.5));

    // Factor 3: BTC dominance (higher = fear, lower = greed for alts)
    const btcDominance = global.market_cap_percentage?.btc || 50;
    if (btcDominance > 55) {
      sentimentScore -= 5; // Fear - flight to safety
    } else if (btcDominance < 45) {
      sentimentScore += 5; // Greed - risk-on for alts
    }

    // Factor 4: Distance from ATH
    const athDistance = Math.abs(btc.ath_change_percentage);
    if (athDistance < 10) {
      sentimentScore += 10; // Near ATH = greed
    } else if (athDistance > 50) {
      sentimentScore -= 10; // Far from ATH = fear
    }

    // Clamp to 0-100
    sentimentScore = Math.max(0, Math.min(100, sentimentScore));

    // Classify sentiment
    let classification: MarketSentiment['classification'];
    if (sentimentScore <= 20) classification = 'Extreme Fear';
    else if (sentimentScore <= 40) classification = 'Fear';
    else if (sentimentScore <= 60) classification = 'Neutral';
    else if (sentimentScore <= 80) classification = 'Greed';
    else classification = 'Extreme Greed';

    return {
      success: true,
      data: {
        value: Math.round(sentimentScore),
        classification,
        timestamp: Date.now(),
        source: 'CoinGecko (calculated)',
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

/**
 * Get top gainers and losers for sentiment analysis
 */
export async function getTopMovers(): Promise<
  DataProviderResponse<{
    gainers: CoinGeckoMarketData[];
    losers: CoinGeckoMarketData[];
  }>
> {
  const response = await fetchCoinGecko<CoinGeckoMarketData[]>(
    '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false',
    'top_movers',
    10 * 60 * 1000
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to fetch data',
      timestamp: Date.now(),
    };
  }

  const sorted = [...response.data].sort(
    (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h
  );

  return {
    success: true,
    data: {
      gainers: sorted.slice(0, 10),
      losers: sorted.slice(-10).reverse(),
    },
    cached: response.cached,
    timestamp: Date.now(),
  };
}
