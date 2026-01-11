/**
 * Alternative.me Fear & Greed Index Provider
 *
 * The Crypto Fear & Greed Index analyzes emotions and sentiments
 * from different sources and crunches them into one simple number.
 *
 * Data Sources Used by the Index:
 * - Volatility (25%)
 * - Market Momentum/Volume (25%)
 * - Social Media (15%)
 * - Surveys (15%)
 * - Dominance (10%)
 * - Trends (10%)
 *
 * Free API, no authentication required
 * Docs: https://alternative.me/crypto/fear-and-greed-index/
 */

import {
  DataProviderResponse,
  MarketSentiment,
  CacheEntry,
  ProviderCapabilities,
} from '../types';

const BASE_URL = 'https://api.alternative.me/fng';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (updates daily)

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

export const fearGreedCapabilities: ProviderCapabilities = {
  marketSentiment: true,
  onChainMetrics: false,
  socialSentiment: true, // Part of the index
  institutionalFlow: false,
  smartMoneyIndicators: false,
  historicalData: true,
  realTimeData: false,
};

interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

interface FearGreedResponse {
  name: string;
  data: FearGreedData[];
  metadata: {
    error: null | string;
  };
}

/**
 * Get current Fear & Greed Index
 */
export async function getFearGreedIndex(): Promise<
  DataProviderResponse<MarketSentiment>
> {
  const cacheKey = 'fear_greed_current';
  const cached = getFromCache<MarketSentiment>(cacheKey);

  if (cached) {
    return {
      success: true,
      data: cached,
      cached: true,
      timestamp: Date.now(),
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/?limit=1`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as FearGreedResponse;

    if (result.metadata.error) {
      throw new Error(result.metadata.error);
    }

    const data = result.data[0];
    const value = parseInt(data.value, 10);

    // Map classification to our standard format
    let classification: MarketSentiment['classification'];
    const rawClass = data.value_classification.toLowerCase();

    if (rawClass.includes('extreme fear')) {
      classification = 'Extreme Fear';
    } else if (rawClass.includes('fear')) {
      classification = 'Fear';
    } else if (rawClass.includes('neutral')) {
      classification = 'Neutral';
    } else if (rawClass.includes('extreme greed')) {
      classification = 'Extreme Greed';
    } else if (rawClass.includes('greed')) {
      classification = 'Greed';
    } else {
      classification = 'Neutral';
    }

    const sentiment: MarketSentiment = {
      value,
      classification,
      timestamp: parseInt(data.timestamp, 10) * 1000,
      source: 'Alternative.me Fear & Greed Index',
    };

    setCache(cacheKey, sentiment);

    return {
      success: true,
      data: sentiment,
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
 * Get historical Fear & Greed Index
 * @param days Number of days of history (max 365 for free)
 */
export async function getFearGreedHistory(
  days: number = 30
): Promise<DataProviderResponse<MarketSentiment[]>> {
  const cacheKey = `fear_greed_history_${days}`;
  const cached = getFromCache<MarketSentiment[]>(cacheKey);

  if (cached) {
    return {
      success: true,
      data: cached,
      cached: true,
      timestamp: Date.now(),
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/?limit=${days}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as FearGreedResponse;

    if (result.metadata.error) {
      throw new Error(result.metadata.error);
    }

    const history: MarketSentiment[] = result.data.map((item) => {
      const value = parseInt(item.value, 10);
      const rawClass = item.value_classification.toLowerCase();

      let classification: MarketSentiment['classification'];
      if (rawClass.includes('extreme fear')) classification = 'Extreme Fear';
      else if (rawClass.includes('fear')) classification = 'Fear';
      else if (rawClass.includes('neutral')) classification = 'Neutral';
      else if (rawClass.includes('extreme greed'))
        classification = 'Extreme Greed';
      else if (rawClass.includes('greed')) classification = 'Greed';
      else classification = 'Neutral';

      return {
        value,
        classification,
        timestamp: parseInt(item.timestamp, 10) * 1000,
        source: 'Alternative.me Fear & Greed Index',
      };
    });

    setCache(cacheKey, history, 60 * 60 * 1000); // 1 hour cache for history

    return {
      success: true,
      data: history,
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
 * Calculate sentiment trend from historical data
 */
export async function getSentimentTrend(): Promise<
  DataProviderResponse<{
    current: number;
    average7d: number;
    average30d: number;
    trend: 'improving' | 'declining' | 'stable';
    extremes: {
      recentHigh: number;
      recentLow: number;
    };
  }>
> {
  const historyRes = await getFearGreedHistory(30);

  if (!historyRes.success || !historyRes.data) {
    return {
      success: false,
      error: historyRes.error || 'Failed to fetch history',
      timestamp: Date.now(),
    };
  }

  const history = historyRes.data;
  const current = history[0]?.value ?? 50;

  // Calculate averages
  const last7 = history.slice(0, 7);
  const average7d =
    last7.reduce((sum, h) => sum + h.value, 0) / last7.length;

  const average30d =
    history.reduce((sum, h) => sum + h.value, 0) / history.length;

  // Find extremes
  const values = history.map((h) => h.value);
  const recentHigh = Math.max(...values);
  const recentLow = Math.min(...values);

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable';
  if (average7d > average30d + 5) {
    trend = 'improving';
  } else if (average7d < average30d - 5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  return {
    success: true,
    data: {
      current,
      average7d: Math.round(average7d),
      average30d: Math.round(average30d),
      trend,
      extremes: {
        recentHigh,
        recentLow,
      },
    },
    cached: historyRes.cached,
    timestamp: Date.now(),
  };
}

/**
 * Get trading signal based on Fear & Greed
 * Extreme fear can be a buying opportunity
 * Extreme greed can signal a market top
 */
export async function getFearGreedSignal(): Promise<
  DataProviderResponse<{
    signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
    confidence: number;
    reasoning: string;
  }>
> {
  const [currentRes, trendRes] = await Promise.all([
    getFearGreedIndex(),
    getSentimentTrend(),
  ]);

  if (!currentRes.success || !trendRes.success) {
    return {
      success: false,
      error: 'Failed to calculate signal',
      timestamp: Date.now(),
    };
  }

  const current = currentRes.data!.value;
  const trend = trendRes.data!;

  let signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  let confidence: number;
  let reasoning: string;

  if (current <= 20) {
    signal = 'strong_buy';
    confidence = 80 + (20 - current);
    reasoning = `Extreme Fear (${current}) historically indicates a buying opportunity. "Be greedy when others are fearful."`;
  } else if (current <= 35) {
    signal = 'buy';
    confidence = 60 + (35 - current);
    reasoning = `Fear sentiment (${current}) suggests potential accumulation zone.`;
  } else if (current >= 80) {
    signal = 'strong_sell';
    confidence = 60 + (current - 80);
    reasoning = `Extreme Greed (${current}) often precedes corrections. Consider taking profits.`;
  } else if (current >= 65) {
    signal = 'sell';
    confidence = 50 + (current - 65);
    reasoning = `Greed sentiment (${current}) suggests caution. Market may be overheated.`;
  } else {
    signal = 'neutral';
    confidence = 50;
    reasoning = `Neutral sentiment (${current}). No clear contrarian signal.`;
  }

  // Adjust confidence based on trend
  if (
    (signal === 'strong_buy' || signal === 'buy') &&
    trend.trend === 'improving'
  ) {
    confidence = Math.min(100, confidence + 10);
    reasoning += ' Sentiment is improving.';
  } else if (
    (signal === 'strong_sell' || signal === 'sell') &&
    trend.trend === 'declining'
  ) {
    confidence = Math.min(100, confidence + 10);
    reasoning += ' Sentiment is declining.';
  }

  return {
    success: true,
    data: {
      signal,
      confidence: Math.round(confidence),
      reasoning,
    },
    timestamp: Date.now(),
  };
}
