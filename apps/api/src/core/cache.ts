// ===========================================
// Cache Client - Redis with Memory Fallback
// ===========================================

import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

// ===========================================
// In-Memory Fallback Cache
// ===========================================
const memoryCache = new Map<string, { value: string; expiresAt?: number }>();

const memoryCacheClient = {
  async ping(): Promise<string> {
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
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(memoryCache.keys()).filter(k => regex.test(k));
  },

  async exists(key: string): Promise<number> {
    const item = memoryCache.get(key);
    if (!item) return 0;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryCache.delete(key);
      return 0;
    }
    return 1;
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

  async ttl(key: string): Promise<number> {
    const item = memoryCache.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  },

  async quit(): Promise<'OK'> {
    memoryCache.clear();
    return 'OK';
  },

  on(_event: string, _callback: (...args: unknown[]) => void): void {
    // No-op for memory cache
  },

  get status(): string {
    return 'ready';
  },
};

// ===========================================
// Redis Client Initialization
// ===========================================

type CacheClient = typeof memoryCacheClient | Redis;

let redis: CacheClient;
let isRedisConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

function createRedisClient(): CacheClient {
  const redisUrl = config.redisUrl;

  if (!redisUrl) {
    logger.info('[Cache] No REDIS_URL configured, using in-memory cache');
    return memoryCacheClient;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > MAX_CONNECTION_ATTEMPTS) {
          logger.warn({ attempts: times }, '[Cache] Redis connection failed, falling back to memory cache');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000); // Exponential backoff
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });

    client.on('connect', () => {
      logger.debug('[Cache] Redis connecting...');
    });

    client.on('ready', () => {
      isRedisConnected = true;
      connectionAttempts = 0;
      logger.info('[Cache] Redis connected and ready');
    });

    client.on('error', (err) => {
      connectionAttempts++;
      logger.error({ error: err.message }, '[Cache] Redis error');
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        logger.warn('[Cache] Switching to in-memory cache due to Redis errors');
        isRedisConnected = false;
      }
    });

    client.on('close', () => {
      isRedisConnected = false;
      logger.debug('[Cache] Redis connection closed');
    });

    // Connect immediately
    client.connect().catch((err) => {
      logger.warn({ error: err.message }, '[Cache] Redis initial connection failed, using in-memory fallback');
    });

    return client;
  } catch (error) {
    logger.error({ error }, '[Cache] Failed to create Redis client');
    return memoryCacheClient;
  }
}

// Initialize Redis client
redis = createRedisClient();

// ===========================================
// Cache Status
// ===========================================

export function getCacheStatus(): { type: 'redis' | 'memory'; connected: boolean } {
  if (redis instanceof Redis) {
    return { type: 'redis', connected: isRedisConnected && redis.status === 'ready' };
  }
  return { type: 'memory', connected: true };
}

// ===========================================
// Cache Utilities with Fallback
// ===========================================

async function safeRedisOp<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  if (!isRedisConnected && redis instanceof Redis) {
    return fallback();
  }
  try {
    return await operation();
  } catch (error) {
    logger.warn({ error }, '[Cache] Redis operation failed, using fallback');
    return fallback();
  }
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await safeRedisOp(
      () => redis.get(key),
      () => memoryCacheClient.get(key)
    );
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await safeRedisOp(
        () => redis.setex(key, ttlSeconds, serialized),
        () => memoryCacheClient.setex(key, ttlSeconds, serialized)
      );
    } else {
      await safeRedisOp(
        () => redis.set(key, serialized),
        () => memoryCacheClient.set(key, serialized)
      );
    }
  },

  async del(key: string): Promise<void> {
    await safeRedisOp(
      () => redis.del(key),
      () => memoryCacheClient.del(key)
    );
  },

  async delPattern(pattern: string): Promise<void> {
    const keys = await safeRedisOp(
      () => redis.keys(pattern),
      () => memoryCacheClient.keys(pattern)
    );
    if (keys.length > 0) {
      await safeRedisOp(
        () => redis.del(...keys),
        () => memoryCacheClient.del(...keys)
      );
    }
  },

  async exists(key: string): Promise<boolean> {
    const result = await safeRedisOp(
      () => redis.exists(key),
      () => memoryCacheClient.exists(key)
    );
    return result === 1;
  },

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = await this.get(key) as T | null;
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },

  async incr(key: string): Promise<number> {
    return safeRedisOp(
      () => redis.incr(key),
      () => memoryCacheClient.incr(key)
    );
  },

  async expire(key: string, seconds: number): Promise<void> {
    await safeRedisOp(
      () => redis.expire(key, seconds),
      () => memoryCacheClient.expire(key, seconds)
    );
  },

  async ttl(key: string): Promise<number> {
    return safeRedisOp(
      () => redis.ttl(key),
      () => memoryCacheClient.ttl(key)
    );
  },

  async ping(): Promise<string> {
    return safeRedisOp(
      () => redis.ping(),
      () => memoryCacheClient.ping()
    );
  },
};

// Export redis for direct access if needed
export { redis };

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
  binancePrice: (symbol: string) => `binance:price:${symbol}`,
  platformStats: () => 'platform:stats',
};

// ===========================================
// Cache TTLs (in seconds)
// ===========================================

export const cacheTTL = {
  marketPulse: 5 * 60,      // 5 minutes
  assetData: 60,            // 1 minute
  orderBook: 10,            // 10 seconds
  userSession: 24 * 60 * 60, // 24 hours
  userCredits: 5 * 60,      // 5 minutes
  analysis: 24 * 60 * 60,   // 24 hours
  binancePrice: 5,          // 5 seconds (live prices)
  platformStats: 60,        // 1 minute
};
