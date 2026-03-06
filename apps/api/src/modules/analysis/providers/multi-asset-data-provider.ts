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

      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) throw error;
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
  '1W': '1w',
};

async function fetchBinanceCandles(symbol: string, interval: string, limit: number = 500, endTime?: number): Promise<OHLCV[]> {
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

  const cacheKey = `binance:candles:${binanceSymbol}:${binanceInterval}:${limit}:${endTime || 'latest'}`;
  const cached = getCached<OHLCV[]>(cacheKey);
  if (cached) return cached;

  let url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`;
  if (endTime) {
    url += `&endTime=${endTime}`;
  }
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
  '2h': '60m', // Yahoo doesn't have 2h directly, we'll aggregate
  '4h': '60m', // Yahoo doesn't have 4h directly, we'll aggregate
  '1d': '1d',
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
      console.warn(`[Yahoo] Insufficient data for ${symbol}: only ${candles.length} candles after daily fallback. Returning available data.`);
      return candles;
    }

    // Note: We're returning daily data even though user requested intraday
    // This is a fallback to allow analysis to proceed
    console.log(`[Yahoo] Using daily data fallback for ${yahooSymbol}: ${candles.length} candles`);
  }

  // For 4h interval, aggregate from 1h candles if we have intraday data
  let finalCandles = candles;
  if (originalInterval === '4h' && yahooInterval === '60m' && candles.length >= MIN_CANDLES_REQUIRED) {
    const factor = 4;
    finalCandles = aggregateCandles(candles, factor);
    console.log(`[Yahoo] Aggregated ${candles.length} 1h candles to ${finalCandles.length} ${originalInterval} candles for ${yahooSymbol}`);
  }

  // Final validation - return whatever we have instead of throwing
  if (finalCandles.length < 10) {
    console.warn(`[Yahoo] Low candle count for ${symbol}: ${finalCandles.length} candles. Analysis may be less accurate.`);
    return finalCandles;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    data = await response.json();
  } catch (fetchError) {
    const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.warn(`[Yahoo] Ticker fetch failed for ${symbol}: ${errMsg}. Returning zero-price fallback.`);
    const assetClass = detectAssetClass(symbol);
    return {
      symbol: symbol.toUpperCase(),
      assetClass,
      price: 0,
      change24h: 0,
      changePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      lastUpdated: new Date(),
    } as MarketData;
  }

  if (!data.chart?.result?.[0]) {
    console.warn(`[Yahoo] No ticker data returned for ${symbol}, returning zero-price fallback`);
    const assetClass = detectAssetClass(symbol);
    return {
      symbol: symbol.toUpperCase(),
      assetClass,
      price: 0,
      change24h: 0,
      changePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      lastUpdated: new Date(),
    } as MarketData;
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
  limit: number = 500,
  endTime?: number
): Promise<CandleData[]> {
  const assetClass = detectAssetClass(symbol);

  console.log(`[MultiAssetProvider] Fetching candles for ${symbol} (${assetClass}) - interval: ${interval}${endTime ? ` endTime: ${new Date(endTime).toISOString()}` : ''}`);

  try {
    if (assetClass === 'crypto') {
      try {
        return await fetchBinanceCandles(symbol, interval, limit, endTime);
      } catch (binanceError) {
        // Binance failed (HTTP 451 geo-block, rate limit, etc.) — fallback to Yahoo Finance
        const errMsg = binanceError instanceof Error ? binanceError.message : String(binanceError);
        console.warn(`[MultiAssetProvider] Binance failed for ${symbol}: ${errMsg}. Falling back to Yahoo Finance.`);
        const yahooSymbol = cryptoToYahooSymbol(symbol);
        const candles = await fetchYahooCandles(yahooSymbol, interval, limit);
        // For Yahoo fallback, filter by endTime manually if specified
        if (endTime && candles.length > 0) {
          const filtered = candles.filter(c => c.timestamp <= endTime);
          return filtered.slice(-limit);
        }
        return candles;
      }
    } else {
      // stocks, bonds, metals, bist - use Yahoo Finance
      // BIST symbols use .IS suffix (e.g., THYAO.IS, GARAN.IS)
      const resolved = resolveSymbol(symbol);
      const candles = await fetchYahooCandles(resolved.normalized, interval, limit);
      // For Yahoo, filter by endTime manually if specified
      if (endTime && candles.length > 0) {
        const filtered = candles.filter(c => c.timestamp <= endTime);
        return filtered.slice(-limit);
      }
      return candles;
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[MultiAssetProvider] Error fetching candles for ${symbol}: ${errMsg}. Returning empty array.`);
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[MultiAssetProvider] Error fetching ticker for ${symbol}: ${errMsg}. Returning zero-price fallback.`);
    const assetClass = detectAssetClass(symbol);
    return {
      symbol: symbol.toUpperCase(),
      assetClass,
      price: 0,
      change24h: 0,
      changePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
    };
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
