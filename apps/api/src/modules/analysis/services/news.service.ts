/**
 * TraderPath Crypto News Service
 * ==============================
 *
 * Fetches and analyzes cryptocurrency news from multiple sources.
 * Provides sentiment analysis and important event detection.
 *
 * Data Sources:
 * - CryptoPanic API (primary)
 * - CoinGecko News (fallback)
 */

import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: 'high' | 'medium' | 'low';
  currencies?: string[];
}

export interface NewsAnalysis {
  symbol: string;
  timestamp: number;

  // News items
  items: NewsItem[];
  totalCount: number;

  // Sentiment analysis
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral';
    score: number; // -100 to 100
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
  };

  // Key events
  keyEvents: {
    type: 'partnership' | 'listing' | 'upgrade' | 'hack' | 'regulation' | 'adoption' | 'other';
    title: string;
    impact: 'positive' | 'negative' | 'neutral';
  }[];

  // Market impact assessment
  marketImpact: {
    level: 'high' | 'medium' | 'low' | 'none';
    direction: 'bullish' | 'bearish' | 'neutral';
    reasoning: string;
  };
}

// ============================================================================
// CRYPTOPANIC API
// ============================================================================

const CRYPTOPANIC_BASE_URL = 'https://cryptopanic.com/api/v1';
const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY || process.env.NEWS_API_KEY || '';

interface CryptoPanicPost {
  id: number;
  title: string;
  url: string;
  source: { title: string };
  published_at: string;
  votes: { positive: number; negative: number; important: number };
  currencies?: { code: string }[];
}

// ============================================================================
// NEWS SERVICE
// ============================================================================

class NewsService {
  /**
   * Fetch news for a cryptocurrency
   */
  async fetchNews(symbol: string): Promise<NewsAnalysis | null> {
    try {
      const items = await this.fetchFromCryptoPanic(symbol);

      if (!items || items.length === 0) {
        return this.getEmptyAnalysis(symbol);
      }

      // Analyze sentiment
      const sentiment = this.analyzeSentiment(items);

      // Detect key events
      const keyEvents = this.detectKeyEvents(items);

      // Assess market impact
      const marketImpact = this.assessMarketImpact(sentiment, keyEvents);

      return {
        symbol: symbol.toUpperCase(),
        timestamp: Date.now(),
        items: items.slice(0, 10), // Top 10 news
        totalCount: items.length,
        sentiment,
        keyEvents,
        marketImpact,
      };
    } catch (error) {
      console.error(`[News] Failed to fetch for ${symbol}:`, error);
      return this.getEmptyAnalysis(symbol);
    }
  }

  /**
   * Fetch from CryptoPanic API
   */
  private async fetchFromCryptoPanic(symbol: string): Promise<NewsItem[]> {
    try {
      // Clean symbol
      const cleanSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');

      // If no API key, return mock data for development
      if (!CRYPTOPANIC_API_KEY) {
        console.log('[News] No CryptoPanic API key, using mock data');
        return this.getMockNews(cleanSymbol);
      }

      const response = await axios.get(`${CRYPTOPANIC_BASE_URL}/posts/`, {
        params: {
          auth_token: CRYPTOPANIC_API_KEY,
          currencies: cleanSymbol,
          filter: 'hot', // Get trending news
          public: true,
        },
        timeout: 5000,
      });

      const posts: CryptoPanicPost[] = response.data.results || [];

      return posts.map((post) => ({
        id: String(post.id),
        title: post.title,
        url: post.url,
        source: post.source.title,
        publishedAt: new Date(post.published_at),
        sentiment: this.getSentimentFromVotes(post.votes),
        importance: post.votes.important > 5 ? 'high' : post.votes.important > 2 ? 'medium' : 'low',
        currencies: post.currencies?.map((c) => c.code),
      }));
    } catch (error) {
      console.error('[News] CryptoPanic fetch failed:', error);
      return [];
    }
  }

  /**
   * Get sentiment from votes
   */
  private getSentimentFromVotes(votes: { positive: number; negative: number }): NewsItem['sentiment'] {
    const total = votes.positive + votes.negative;
    if (total === 0) return 'neutral';
    const ratio = votes.positive / total;
    if (ratio > 0.6) return 'positive';
    if (ratio < 0.4) return 'negative';
    return 'neutral';
  }

  /**
   * Analyze overall sentiment
   */
  private analyzeSentiment(items: NewsItem[]): NewsAnalysis['sentiment'] {
    const positiveCount = items.filter((i) => i.sentiment === 'positive').length;
    const negativeCount = items.filter((i) => i.sentiment === 'negative').length;
    const neutralCount = items.filter((i) => i.sentiment === 'neutral').length;

    // Calculate score (-100 to 100)
    const total = items.length;
    const score = total > 0
      ? Math.round(((positiveCount - negativeCount) / total) * 100)
      : 0;

    // Determine overall sentiment
    let overall: NewsAnalysis['sentiment']['overall'] = 'neutral';
    if (score > 20) overall = 'bullish';
    else if (score < -20) overall = 'bearish';

    return {
      overall,
      score,
      positiveCount,
      negativeCount,
      neutralCount,
    };
  }

  /**
   * Detect key events from news titles
   */
  private detectKeyEvents(items: NewsItem[]): NewsAnalysis['keyEvents'] {
    const events: NewsAnalysis['keyEvents'] = [];

    const patterns = [
      { regex: /partnership|partner|collaborate|collaboration/i, type: 'partnership' as const, impact: 'positive' as const },
      { regex: /list|listing|binance|coinbase|exchange/i, type: 'listing' as const, impact: 'positive' as const },
      { regex: /upgrade|update|launch|mainnet|v2|v3/i, type: 'upgrade' as const, impact: 'positive' as const },
      { regex: /hack|exploit|breach|attack|stolen/i, type: 'hack' as const, impact: 'negative' as const },
      { regex: /regulation|sec|ban|lawsuit|investigation/i, type: 'regulation' as const, impact: 'negative' as const },
      { regex: /adopt|integration|payment|accept/i, type: 'adoption' as const, impact: 'positive' as const },
    ];

    for (const item of items) {
      for (const pattern of patterns) {
        if (pattern.regex.test(item.title)) {
          events.push({
            type: pattern.type,
            title: item.title,
            impact: pattern.impact,
          });
          break;
        }
      }
    }

    return events.slice(0, 5); // Top 5 events
  }

  /**
   * Assess market impact
   */
  private assessMarketImpact(
    sentiment: NewsAnalysis['sentiment'],
    keyEvents: NewsAnalysis['keyEvents']
  ): NewsAnalysis['marketImpact'] {
    // High impact events
    const highImpactEvents = keyEvents.filter(
      (e) => e.type === 'hack' || e.type === 'listing' || e.type === 'regulation'
    );

    let level: NewsAnalysis['marketImpact']['level'] = 'none';
    let direction: NewsAnalysis['marketImpact']['direction'] = 'neutral';
    let reasoning = 'No significant news impact detected.';

    if (highImpactEvents.length > 0) {
      level = 'high';
      const negativeEvents = highImpactEvents.filter((e) => e.impact === 'negative');
      direction = negativeEvents.length > highImpactEvents.length / 2 ? 'bearish' : 'bullish';
      reasoning = `High impact events detected: ${highImpactEvents.map((e) => e.type).join(', ')}`;
    } else if (Math.abs(sentiment.score) > 50) {
      level = 'medium';
      direction = sentiment.score > 0 ? 'bullish' : 'bearish';
      reasoning = `Strong ${direction} sentiment detected (${sentiment.score > 0 ? '+' : ''}${sentiment.score})`;
    } else if (keyEvents.length > 2) {
      level = 'low';
      direction = sentiment.overall;
      reasoning = `Multiple news events with ${sentiment.overall} overall sentiment`;
    }

    return { level, direction, reasoning };
  }

  /**
   * Get empty analysis when no data
   */
  private getEmptyAnalysis(symbol: string): NewsAnalysis {
    return {
      symbol: symbol.toUpperCase(),
      timestamp: Date.now(),
      items: [],
      totalCount: 0,
      sentiment: {
        overall: 'neutral',
        score: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
      },
      keyEvents: [],
      marketImpact: {
        level: 'none',
        direction: 'neutral',
        reasoning: 'No news data available.',
      },
    };
  }

  /**
   * Mock news for development
   */
  private getMockNews(symbol: string): NewsItem[] {
    return [
      {
        id: '1',
        title: `${symbol} Shows Strong Technical Momentum`,
        url: '#',
        source: 'CryptoNews',
        publishedAt: new Date(),
        sentiment: 'positive',
        importance: 'medium',
        currencies: [symbol],
      },
      {
        id: '2',
        title: `Market Analysis: ${symbol} Key Levels to Watch`,
        url: '#',
        source: 'TradingView',
        publishedAt: new Date(Date.now() - 3600000),
        sentiment: 'neutral',
        importance: 'low',
        currencies: [symbol],
      },
    ];
  }
}

export const newsService = new NewsService();
export default newsService;
