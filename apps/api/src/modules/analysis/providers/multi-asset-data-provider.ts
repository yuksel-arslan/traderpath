/**
 * Multi-Asset Data Provider
 * =========================
 *
 * Unified data fetching for all asset classes:
 * - Crypto: Binance API
 * - Stocks: Yahoo Finance
 * - Bonds: Yahoo Finance
 * - Metals: Yahoo Finance
 * - BIST (Borsa İstanbul): Yahoo Finance (.IS suffix)
 *
 * "Para nereye akıyorsa potansiyel oradadır"
 */

import { detectAssetClass, resolveSymbol } from './symbol-resolver';
import { AssetClass, OHLCV, MarketData, SUPPORTED_SYMBOLS } from './types';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

const CACHE_TTL = {
  CANDLES: 60 * 1000,      // 1 minute
  TICKER: 30 * 1000,       // 30 seconds
  ORDER_BOOK: 10 * 1000,   // 10 seconds
};

// ============================================================================
// BINANCE CIRCUIT BREAKER
// When Binance returns HTTP 451 (geo-block), skip ALL subsequent Binance calls
// for CIRCUIT_BREAKER_TTL to avoid wasting 3-7 seconds per call on retries.
// ============================================================================

let binanceCircuitOpen = false;
let binanceCircuitOpenedAt = 0;
const CIRCUIT_BREAKER_TTL = 5 * 60 * 1000; // 5 minutes

function isBinanceBlocked(): boolean {
  if (!binanceCircuitOpen) return false;
  // Auto-reset after TTL
  if (Date.now() - binanceCircuitOpenedAt > CIRCUIT_BREAKER_TTL) {
    binanceCircuitOpen = false;
    console.log('[CircuitBreaker] Binance circuit breaker reset - will retry Binance on next call');
    return false;
  }
  return true;
}

function tripBinanceCircuitBreaker(reason: string): void {
  if (!binanceCircuitOpen) {
    binanceCircuitOpen = true;
    binanceCircuitOpenedAt = Date.now();
    console.warn(`[CircuitBreaker] Binance circuit breaker TRIPPED: ${reason}. All Binance calls will skip to Yahoo fallback for ${CIRCUIT_BREAKER_TTL / 1000}s`);
  }
}

/** Exported so analysis.engine.ts can check before direct Binance calls */
export function isBinanceAvailable(): boolean {
  return !isBinanceBlocked();
}

// ============================================================================
// FETCH WITH RETRY
// ============================================================================

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) return response;

      // HTTP 451 = geo-block: trip circuit breaker and fail immediately (no retries)
      if (response.status === 451) {
        const isBinanceUrl = url.includes('binance.com');
        if (isBinanceUrl) {
          tripBinanceCircuitBreaker(`HTTP 451 from ${new URL(url).hostname}`);
        }
        throw new Error(`HTTP 451: Unavailable For Legal Reasons (geo-blocked)`);
      }

      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }

      // HTTP 418 (Binance IP ban) or 403 - also trip circuit breaker
      if ((response.status === 418 || response.status === 403) && url.includes('binance.com')) {
        tripBinanceCircuitBreaker(`HTTP ${response.status} from Binance`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      // Don't retry if circuit breaker tripped
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes('circuit breaker') || errMsg.includes('451') || errMsg.includes('418')) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================================
// BINANCE API (CRYPTO)
// ============================================================================

const BINANCE_INTERVAL_MAP: Record<string, string> = {
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '1d': '1d',
  '1D': '1d',
  '1w': '1w',
  '1W': '1w',
};

async function fetchBinanceCandles(symbol: string, interval: string, limit: number = 500): Promise<OHLCV[]> {
  // Circuit breaker: skip Binance entirely if geo-blocked
  if (isBinanceBlocked()) {
    throw new Error('Binance circuit breaker open - skipping to fallback');
  }

  const binanceInterval = BINANCE_INTERVAL_MAP[interval] || '4h';

  // Normalize symbol: remove any suffix and add USDT
  let normalizedSymbol = symbol.toUpperCase();
  const suffixes = ['USDT', 'BUSD', 'USD', 'PERP', 'USDC'];
  for (const suffix of suffixes) {
    if (normalizedSymbol.endsWith(suffix)) {
      normalizedSymbol = normalizedSymbol.slice(0, -suffix.length);
      break;
    }
  }
  const binanceSymbol = `${normalizedSymbol}USDT`;

  const cacheKey = `binance:candles:${binanceSymbol}:${binanceInterval}:${limit}`;
  const cached = getCached<OHLCV[]>(cacheKey);
  if (cached) return cached;

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();

  const candles: OHLCV[] = data.map((k: (string | number)[]) => ({
    timestamp: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));

  setCache(cacheKey, candles, CACHE_TTL.CANDLES);
  return candles;
}

async function fetchBinanceTicker(symbol: string): Promise<MarketData> {
  // Circuit breaker: skip Binance entirely if geo-blocked
  if (isBinanceBlocked()) {
    throw new Error('Binance circuit breaker open - skipping to fallback');
  }

  let normalizedSymbol = symbol.toUpperCase();
  const suffixes = ['USDT', 'BUSD', 'USD', 'PERP', 'USDC'];
  for (const suffix of suffixes) {
    if (normalizedSymbol.endsWith(suffix)) {
      normalizedSymbol = normalizedSymbol.slice(0, -suffix.length);
      break;
    }
  }
  const binanceSymbol = `${normalizedSymbol}USDT`;

  const cacheKey = `binance:ticker:${binanceSymbol}`;
  const cached = getCached<MarketData>(cacheKey);
  if (cached) return cached;

  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();

  const marketData: MarketData = {
    symbol: normalizedSymbol,
    assetClass: 'crypto',
    price: parseFloat(data.lastPrice),
    change24h: parseFloat(data.priceChange),
    changePercent24h: parseFloat(data.priceChangePercent),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h: parseFloat(data.volume),
    lastUpdated: new Date(),
  };

  setCache(cacheKey, marketData, CACHE_TTL.TICKER);
  return marketData;
}

// ============================================================================
// YAHOO FINANCE API (STOCKS, BONDS, METALS)
// ============================================================================

// Yahoo symbol mapping for special cases
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Metals spot prices
  'XAUUSD': 'GC=F',
  'XAU': 'GC=F',
  'GOLD': 'GC=F',
  'XAGUSD': 'SI=F',
  'XAG': 'SI=F',
  'SILVER': 'SI=F',
  // ETFs use their own symbols
  'GLD': 'GLD',
  'SLV': 'SLV',
  'IAU': 'IAU',
  'PSLV': 'PSLV',
  'PPLT': 'PPLT',
  'PALL': 'PALL',
  'GDX': 'GDX',
  'GDXJ': 'GDXJ',
  'SIL': 'SIL',
  // Treasury yields
  'US10Y': '^TNX',
  'US2Y': '^IRX', // Approximate - 3 month
  'US30Y': '^TYX',
  'US5Y': '^FVX',
};

const YAHOO_INTERVAL_MAP: Record<string, string> = {
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '60m',
  '2h': '60m', // Yahoo doesn't have 2h, use 1h
  '4h': '60m', // Yahoo doesn't have 4h directly, we'll aggregate
  '1d': '1d',
  '1D': '1d',
  '1w': '1wk',
  '1W': '1wk',
};

const YAHOO_RANGE_MAP: Record<string, string> = {
  '5m': '1d',
  '15m': '5d',
  '30m': '1mo',
  '1h': '1mo',
  '2h': '3mo',
  '4h': '6mo',
  '1d': '1y',
  '1D': '1y',
  '1w': '5y',
  '1W': '5y',
};

async function fetchYahooCandles(symbol: string, interval: string, limit: number = 500): Promise<OHLCV[]> {
  const yahooSymbol = YAHOO_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();
  let yahooInterval = YAHOO_INTERVAL_MAP[interval] || '1d';
  let yahooRange = YAHOO_RANGE_MAP[interval] || '1y';
  const originalInterval = interval;

  const cacheKey = `yahoo:candles:${yahooSymbol}:${originalInterval}:${limit}`;
  const cached = getCached<OHLCV[]>(cacheKey);
  if (cached && cached.length >= Math.min(limit, 50)) {
    console.log(`[Yahoo] Cache hit for ${yahooSymbol} ${originalInterval}`);
    return cached.slice(-limit);
  }

  console.log(`[Yahoo] Fetching ${yahooSymbol} - interval: ${yahooInterval}, range: ${yahooRange}`);

  // Try fetching with requested interval first
  let candles = await tryFetchYahooData(yahooSymbol, yahooInterval, yahooRange);

  // If intraday fails or returns insufficient data, fallback to daily
  const MIN_CANDLES_REQUIRED = 50;
  if (candles.length < MIN_CANDLES_REQUIRED && ['5m', '15m', '30m', '60m'].includes(yahooInterval)) {
    console.log(`[Yahoo] Insufficient intraday data (${candles.length} candles), falling back to daily for ${yahooSymbol}`);

    // Try with daily data
    candles = await tryFetchYahooData(yahooSymbol, '1d', '2y');

    if (candles.length < MIN_CANDLES_REQUIRED) {
      throw new Error(`Insufficient data for ${symbol}. Yahoo Finance returned only ${candles.length} candles. Try using 1D timeframe for better results.`);
    }

    // Note: We're returning daily data even though user requested intraday
    // This is a fallback to allow analysis to proceed
    console.log(`[Yahoo] Using daily data fallback for ${yahooSymbol}: ${candles.length} candles`);
  }

  // For 4h or 2h interval, aggregate from 1h candles if we have intraday data
  let finalCandles = candles;
  if ((originalInterval === '4h' || originalInterval === '2h') && yahooInterval === '60m' && candles.length >= MIN_CANDLES_REQUIRED) {
    const factor = originalInterval === '4h' ? 4 : 2;
    finalCandles = aggregateCandles(candles, factor);
    console.log(`[Yahoo] Aggregated ${candles.length} 1h candles to ${finalCandles.length} ${originalInterval} candles for ${yahooSymbol}`);
  }

  // Final validation
  if (finalCandles.length < 10) {
    throw new Error(`Unable to fetch sufficient data for ${symbol}. Only ${finalCandles.length} candles available. Please try a different timeframe (1D recommended for ETFs).`);
  }

  setCache(cacheKey, finalCandles, CACHE_TTL.CANDLES);
  console.log(`[Yahoo] Successfully fetched ${finalCandles.length} candles for ${yahooSymbol}`);
  return finalCandles.slice(-limit);
}

async function tryFetchYahooData(yahooSymbol: string, interval: string, range: string): Promise<OHLCV[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      console.log(`[Yahoo] No data in response for ${yahooSymbol}`);
      return [];
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    if (timestamps.length === 0) {
      console.log(`[Yahoo] Empty timestamps for ${yahooSymbol}`);
      return [];
    }

    const candles: OHLCV[] = timestamps.map((ts: number, i: number) => ({
      timestamp: ts * 1000, // Convert to milliseconds
      open: quotes.open?.[i] ?? 0,
      high: quotes.high?.[i] ?? 0,
      low: quotes.low?.[i] ?? 0,
      close: quotes.close?.[i] ?? 0,
      volume: quotes.volume?.[i] ?? 0,
    })).filter((c: OHLCV) => c.open > 0 && c.close > 0 && c.high > 0 && c.low > 0);

    return candles;
  } catch (error) {
    console.error(`[Yahoo] Error fetching ${yahooSymbol} (${interval}/${range}):`, error);
    return [];
  }
}

function aggregateCandles(candles: OHLCV[], factor: number): OHLCV[] {
  const aggregated: OHLCV[] = [];

  for (let i = 0; i < candles.length; i += factor) {
    const chunk = candles.slice(i, i + factor);
    if (chunk.length === 0) continue;

    aggregated.push({
      timestamp: chunk[0].timestamp,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  return aggregated;
}

async function fetchYahooTicker(symbol: string): Promise<MarketData> {
  const yahooSymbol = YAHOO_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();

  const cacheKey = `yahoo:ticker:${yahooSymbol}`;
  const cached = getCached<MarketData>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`;

  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const data = await response.json();

  if (!data.chart?.result?.[0]) {
    throw new Error(`No data returned from Yahoo Finance for ${symbol}`);
  }

  const result = data.chart.result[0];
  const meta = result.meta;
  const quotes = result.indicators?.quote?.[0] || {};

  const currentPrice = meta.regularMarketPrice || quotes.close?.[quotes.close.length - 1] || 0;
  const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
  const change = currentPrice - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  // Detect asset class from symbol
  const assetClass = detectAssetClass(symbol);

  const marketData: MarketData = {
    symbol: symbol.toUpperCase(),
    assetClass,
    price: currentPrice,
    change24h: change,
    changePercent24h: changePercent,
    high24h: meta.regularMarketDayHigh || quotes.high?.[quotes.high.length - 1] || 0,
    low24h: meta.regularMarketDayLow || quotes.low?.[quotes.low.length - 1] || 0,
    volume24h: meta.regularMarketVolume || quotes.volume?.[quotes.volume.length - 1] || 0,
    marketCap: meta.marketCap,
    lastUpdated: new Date(),
  };

  setCache(cacheKey, marketData, CACHE_TTL.TICKER);
  return marketData;
}

// ============================================================================
// UNIFIED INTERFACE
// ============================================================================

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
}

/**
 * Convert crypto symbol to Yahoo Finance format (BTC → BTC-USD)
 */
function cryptoToYahooSymbol(symbol: string): string {
  let base = symbol.toUpperCase();
  const suffixes = ['USDT', 'BUSD', 'USD', 'PERP', 'USDC'];
  for (const suffix of suffixes) {
    if (base.endsWith(suffix)) {
      base = base.slice(0, -suffix.length);
      break;
    }
  }
  return `${base}-USD`;
}

/**
 * Fetch candle data for any supported asset
 * Automatically routes to correct provider based on asset class
 * Crypto: Binance → Yahoo Finance fallback (handles HTTP 451 geo-blocks)
 */
export async function fetchCandles(
  symbol: string,
  interval: string,
  limit: number = 500
): Promise<CandleData[]> {
  const assetClass = detectAssetClass(symbol);

  console.log(`[MultiAssetProvider] Fetching candles for ${symbol} (${assetClass}) - interval: ${interval}`);

  try {
    if (assetClass === 'crypto') {
      // If Binance is known to be blocked, skip directly to Yahoo
      if (isBinanceBlocked()) {
        const yahooSymbol = cryptoToYahooSymbol(symbol);
        return await fetchYahooCandles(yahooSymbol, interval, limit);
      }
      try {
        return await fetchBinanceCandles(symbol, interval, limit);
      } catch (binanceError) {
        // Binance failed (HTTP 451 geo-block, rate limit, etc.) — fallback to Yahoo Finance
        const errMsg = binanceError instanceof Error ? binanceError.message : String(binanceError);
        console.warn(`[MultiAssetProvider] Binance failed for ${symbol}: ${errMsg}. Falling back to Yahoo Finance.`);
        const yahooSymbol = cryptoToYahooSymbol(symbol);
        return await fetchYahooCandles(yahooSymbol, interval, limit);
      }
    } else {
      // stocks, bonds, metals, bist - use Yahoo Finance
      // BIST symbols use .IS suffix (e.g., THYAO.IS, GARAN.IS)
      const resolved = resolveSymbol(symbol);
      return await fetchYahooCandles(resolved.normalized, interval, limit);
    }
  } catch (error) {
    console.error(`[MultiAssetProvider] Error fetching candles for ${symbol}:`, error);
    // Return empty array instead of throwing - callers handle empty candles gracefully
    return [];
  }
}

/**
 * Fetch market data/ticker for any supported asset
 * Automatically routes to correct provider based on asset class
 * Crypto: Binance → Yahoo Finance fallback (handles HTTP 451 geo-blocks)
 */
export async function fetchTicker(symbol: string): Promise<TickerData> {
  const assetClass = detectAssetClass(symbol);

  console.log(`[MultiAssetProvider] Fetching ticker for ${symbol} (${assetClass})`);

  try {
    if (assetClass === 'crypto') {
      // If Binance is known to be blocked, skip directly to Yahoo
      if (isBinanceBlocked()) {
        const yahooSymbol = cryptoToYahooSymbol(symbol);
        const data = await fetchYahooTicker(yahooSymbol);
        return {
          symbol: symbol.toUpperCase().replace(/USDT|BUSD|USD|PERP|USDC$/, ''),
          assetClass: 'crypto',
          price: data.price,
          change24h: data.change24h,
          changePercent24h: data.changePercent24h,
          high24h: data.high24h,
          low24h: data.low24h,
          volume24h: data.volume24h,
          marketCap: data.marketCap,
        };
      }
      try {
        const data = await fetchBinanceTicker(symbol);
        return {
          symbol: data.symbol,
          assetClass: 'crypto',
          price: data.price,
          change24h: data.change24h,
          changePercent24h: data.changePercent24h,
          high24h: data.high24h,
          low24h: data.low24h,
          volume24h: data.volume24h,
        };
      } catch (binanceError) {
        // Binance failed — fallback to Yahoo Finance
        const errMsg = binanceError instanceof Error ? binanceError.message : String(binanceError);
        console.warn(`[MultiAssetProvider] Binance ticker failed for ${symbol}: ${errMsg}. Falling back to Yahoo Finance.`);
        const yahooSymbol = cryptoToYahooSymbol(symbol);
        const data = await fetchYahooTicker(yahooSymbol);
        return {
          symbol: symbol.toUpperCase().replace(/USDT|BUSD|USD|PERP|USDC$/, ''),
          assetClass: 'crypto',
          price: data.price,
          change24h: data.change24h,
          changePercent24h: data.changePercent24h,
          high24h: data.high24h,
          low24h: data.low24h,
          volume24h: data.volume24h,
          marketCap: data.marketCap,
        };
      }
    } else {
      // stocks, bonds, metals, bist - use Yahoo Finance
      const resolved = resolveSymbol(symbol);
      const data = await fetchYahooTicker(resolved.normalized);
      return {
        symbol: data.symbol,
        assetClass: data.assetClass,
        price: data.price,
        change24h: data.change24h,
        changePercent24h: data.changePercent24h,
        high24h: data.high24h,
        low24h: data.low24h,
        volume24h: data.volume24h,
        marketCap: data.marketCap,
      };
    }
  } catch (error) {
    console.error(`[MultiAssetProvider] Error fetching ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Check if a symbol is supported for analysis
 */
export function isSymbolSupported(symbol: string): boolean {
  const upper = symbol.toUpperCase().trim();
  const assetClass = detectAssetClass(upper);

  // For crypto, also check without USDT suffix
  if (assetClass === 'crypto') {
    let base = upper;
    const suffixes = ['USDT', 'BUSD', 'USD', 'PERP', 'USDC'];
    for (const suffix of suffixes) {
      if (upper.endsWith(suffix)) {
        base = upper.slice(0, -suffix.length);
        break;
      }
    }
    return SUPPORTED_SYMBOLS.crypto.includes(base) || SUPPORTED_SYMBOLS.crypto.includes(upper);
  }

  // For BIST, check with and without .IS suffix
  if (assetClass === 'bist') {
    const withSuffix = upper.endsWith('.IS') ? upper : `${upper}.IS`;
    return SUPPORTED_SYMBOLS.bist?.includes(withSuffix) ?? false;
  }

  return SUPPORTED_SYMBOLS[assetClass]?.includes(upper) ?? false;
}

/**
 * Get the asset class for a symbol
 */
export function getAssetClass(symbol: string): AssetClass {
  return detectAssetClass(symbol);
}

/**
 * Get display name for a symbol
 */
export function getDisplayName(symbol: string): string {
  const resolved = resolveSymbol(symbol);
  return resolved.displayName;
}

// Re-export types
export type { AssetClass, OHLCV };
export { SUPPORTED_SYMBOLS };
