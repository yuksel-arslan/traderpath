// ===========================================
// Redis Cache Client
// ===========================================

import Redis from 'ioredis';
import { config } from './config';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (error) => {
  console.error('Redis error:', error);
});

// ===========================================
// Cache Utilities
// ===========================================

export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  /**
   * Set cached value
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Delete by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },

  /**
   * Get or set (with callback)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    return redis.incr(key);
  },

  /**
   * Set expiry
   */
  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },
};

// ===========================================
// Cache Keys
// ===========================================

export const cacheKeys = {
  // Market data
  marketPulse: () => 'market:pulse',
  assetData: (symbol: string) => `asset:${symbol}`,
  orderBook: (symbol: string) => `orderbook:${symbol}`,

  // User data
  userSession: (userId: string) => `session:${userId}`,
  userCredits: (userId: string) => `credits:${userId}`,
  userDailyRewards: (userId: string, date: string) => `daily:${userId}:${date}`,

  // Analysis
  analysis: (id: string) => `analysis:${id}`,

  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
};

// ===========================================
// Cache TTLs (in seconds)
// ===========================================

export const cacheTTL = {
  marketPulse: 5 * 60,     // 5 minutes
  assetData: 60,            // 1 minute
  orderBook: 10,            // 10 seconds
  userSession: 24 * 60 * 60, // 24 hours
  userCredits: 5 * 60,      // 5 minutes
  analysis: 24 * 60 * 60,   // 24 hours
};
