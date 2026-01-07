// ===========================================
// Cache Client (Memory-based fallback)
// ===========================================

import { config } from './config';

// In-memory cache for development
const memoryCache = new Map<string, { value: string; expiresAt?: number }>();

// Mock Redis interface
export const redis = {
  async ping() {
    return 'PONG';
  },

  async get(key: string): Promise<string | null> {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: string): Promise<'OK'> {
    memoryCache.set(key, { value });
    return 'OK';
  },

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    memoryCache.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (memoryCache.delete(key)) deleted++;
    }
    return deleted;
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(memoryCache.keys()).filter(k => regex.test(k));
  },

  async exists(key: string): Promise<number> {
    return memoryCache.has(key) ? 1 : 0;
  },

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0') + 1).toString();
    await this.set(key, newValue);
    return parseInt(newValue);
  },

  async expire(key: string, seconds: number): Promise<number> {
    const item = memoryCache.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  },

  async quit(): Promise<'OK'> {
    memoryCache.clear();
    return 'OK';
  },

  on(_event: string, _callback: (...args: any[]) => void) {
    // No-op for memory cache
  },
};

console.log('Using in-memory cache (Redis not configured)');

// ===========================================
// Cache Utilities
// ===========================================

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },

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

  async incr(key: string): Promise<number> {
    return redis.incr(key);
  },

  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },
};

// ===========================================
// Cache Keys
// ===========================================

export const cacheKeys = {
  marketPulse: () => 'market:pulse',
  assetData: (symbol: string) => `asset:${symbol}`,
  orderBook: (symbol: string) => `orderbook:${symbol}`,
  userSession: (userId: string) => `session:${userId}`,
  userCredits: (userId: string) => `credits:${userId}`,
  userDailyRewards: (userId: string, date: string) => `daily:${userId}:${date}`,
  analysis: (id: string) => `analysis:${id}`,
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
};

// ===========================================
// Cache TTLs (in seconds)
// ===========================================

export const cacheTTL = {
  marketPulse: 5 * 60,
  assetData: 60,
  orderBook: 10,
  userSession: 24 * 60 * 60,
  userCredits: 5 * 60,
  analysis: 24 * 60 * 60,
};
