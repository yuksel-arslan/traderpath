/**
 * Bundle Result Cache (TASK 3.6)
 *
 * A lightweight in-memory TTL cache for BundleResult objects.
 *
 * Why: The analysis engine may call the same bundle with the same candle data
 * across multiple step calculations within one request. Caching avoids
 * redundant indicator computations (~20-30 CPU-bound calculations per bundle).
 *
 * Cache key = bundleType + lastCandleTimestamp + candleCount
 * TTL = 90 seconds (enough to cover one full analysis cycle)
 * Max entries = 50 (prevents unbounded growth)
 */

import type { BundleResult } from './indicator-bundle.interface';
import type { OHLCV } from '../services/indicators.service';

const CACHE_TTL_MS  = 90_000; // 90 seconds
const CACHE_MAX     = 50;

interface CacheEntry {
  result:    BundleResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Build a cache key from bundle type + last OHLCV candle identity */
export function buildCacheKey(
  bundleType: string,
  ohlcv: OHLCV[],
): string | null {
  if (ohlcv.length === 0) return null; // Don't cache empty-data runs
  const last = ohlcv[ohlcv.length - 1];
  return `${bundleType}:${last.timestamp}:${ohlcv.length}`;
}

/** Retrieve a cached result if still valid */
export function getCached(key: string): BundleResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

/** Store a result in the cache */
export function setCached(key: string, result: BundleResult): void {
  // Evict oldest entry when at capacity
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Clear all cached entries (useful in tests) */
export function clearCache(): void {
  cache.clear();
}

/** Current cache statistics */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return { size: cache.size, maxSize: CACHE_MAX, ttlMs: CACHE_TTL_MS };
}
