/**
 * Binance Crypto Data Provider
 *
 * Provides OHLCV, market data, order book, and futures metrics
 * for cryptocurrency analysis.
 */

import { MarketDataProvider } from './base-provider';
import {
  AssetClass,
  OHLCV,
  MarketData,
  OrderBook,
  CryptoFundamentals,
  NewsAnalysis,
  ProviderCapabilities,
  ResolvedSymbol,
  TIMEFRAME_MAPPINGS,
  SUPPORTED_SYMBOLS,
} from './types';

// Cache management (reuse from analysis.engine)
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown, ttl: number): void {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

// Fetch with retry and timeout
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) return response;
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// Cache TTLs
const CACHE_TTL = {
  KLINES: 60 * 1000,      // 1 minute
  TICKER: 30 * 1000,      // 30 seconds
  ORDER_BOOK: 10 * 1000,  // 10 seconds
  FUTURES: 60 * 1000,     // 1 minute
};

/**
 * Binance Crypto Provider Implementation
 */
export class BinanceCryptoProvider extends MarketDataProvider {
  readonly assetClass: AssetClass = 'crypto';
  readonly name = 'Binance';

  readonly capabilities: ProviderCapabilities = {
    hasOrderBook: true,
    hasFundamentals: true,
    hasNews: true,
    hasFutures: true,
    hasRealtime: true,
    supportedTimeframes: ['5m', '15m', '30m', '1h', '4h', '1d'],
    maxCandleLimit: 1000,
  };

  /**
   * Resolve crypto symbol (strip suffixes, add USDT)
   */
  resolveSymbol(symbol: string): ResolvedSymbol {
    const upper = symbol.toUpperCase().trim();
    const suffixes = ['USDT', 'BUSD', 'USD', 'PERP', 'USDC'];
    let base = upper;
    let quote = 'USDT';

    for (const suffix of suffixes) {
      if (upper.endsWith(suffix)) {
        base = upper.slice(0, -suffix.length);
        quote = suffix === 'PERP' ? 'USDT' : suffix;
        break;
      }
    }

    return {
      original: symbol,
      normalized: `${base}${quote}`,
      assetClass: 'crypto',
      exchange: 'binance',
      baseCurrency: base,
      quoteCurrency: quote,
      displayName: base,
    };
  }

  /**
   * Check if symbol is supported
   */
  supportsSymbol(symbol: string): boolean {
    const resolved = this.resolveSymbol(symbol);
    const supported = SUPPORTED_SYMBOLS.crypto.map(s => s.toUpperCase());
    return supported.includes(resolved.baseCurrency!);
  }

  /**
   * Map timeframe to Binance format
   */
  mapTimeframe(timeframe: string): string {
    return TIMEFRAME_MAPPINGS.crypto[timeframe] || timeframe;
  }

  /**
   * Fetch OHLCV candles from Binance
   */
  async fetchCandles(symbol: string, timeframe: string, limit: number = 200): Promise<OHLCV[]> {
    const resolved = this.resolveSymbol(symbol);
    const interval = this.mapTimeframe(timeframe);
    const cacheKey = `binance:klines:${resolved.normalized}:${interval}:${limit}`;

    const cached = getCached<OHLCV[]>(cacheKey);
    if (cached) return cached;

    const url = `https://api.binance.com/api/v3/klines?symbol=${resolved.normalized}&interval=${interval}&limit=${limit}`;
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

    setCache(cacheKey, candles, CACHE_TTL.KLINES);
    return candles;
  }

  /**
   * Fetch current market data
   */
  async fetchMarketData(symbol: string): Promise<MarketData> {
    const resolved = this.resolveSymbol(symbol);
    const cacheKey = `binance:ticker:${resolved.normalized}`;

    const cached = getCached<MarketData>(cacheKey);
    if (cached) return cached;

    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${resolved.normalized}`;
    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result: MarketData = {
      symbol: resolved.baseCurrency!,
      assetClass: 'crypto',
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      lastUpdated: new Date(),
    };

    setCache(cacheKey, result, CACHE_TTL.TICKER);
    return result;
  }

  /**
   * Fetch order book
   */
  async fetchOrderBook(symbol: string, depth: number = 100): Promise<OrderBook> {
    const resolved = this.resolveSymbol(symbol);
    const cacheKey = `binance:orderbook:${resolved.normalized}:${depth}`;

    const cached = getCached<OrderBook>(cacheKey);
    if (cached) return cached;

    const url = `https://api.binance.com/api/v3/depth?symbol=${resolved.normalized}&limit=${depth}`;
    const response = await fetchWithRetry(url);
    const data = await response.json();

    const result: OrderBook = {
      symbol: resolved.baseCurrency!,
      bids: data.bids.map(([price, qty]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
      asks: data.asks.map(([price, qty]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
      timestamp: new Date(),
    };

    setCache(cacheKey, result, CACHE_TTL.ORDER_BOOK);
    return result;
  }

  /**
   * Fetch crypto fundamentals (tokenomics + futures data)
   */
  async fetchFundamentals(symbol: string): Promise<CryptoFundamentals> {
    const resolved = this.resolveSymbol(symbol);
    const base = resolved.baseCurrency!;

    // Fetch futures data in parallel
    const [fundingRate, openInterest, longShortRatio, marketData] = await Promise.all([
      this.fetchFundingRate(base),
      this.fetchOpenInterest(base),
      this.fetchLongShortRatio(base),
      this.fetchMarketData(symbol),
    ]);

    // Get market cap and circulating supply from CoinGecko /coins/markets
    let marketCap = 0;
    let circulatingSupply = 0;
    try {
      const cgResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${this.getCoinGeckoId(base)}&per_page=1`
      );
      const cgData = await cgResponse.json();
      if (Array.isArray(cgData) && cgData.length > 0) {
        marketCap = cgData[0].market_cap || 0;
        circulatingSupply = cgData[0].circulating_supply || 0;
      }
    } catch {
      // Ignore CoinGecko errors
    }

    return {
      symbol: base,
      assetClass: 'crypto',
      marketCap,
      circulatingSupply,
      fundingRate: fundingRate.fundingRate,
      openInterest: openInterest.openInterest,
      longShortRatio: longShortRatio.longShortRatio,
      lastUpdated: new Date(),
    };
  }

  // Futures API helpers
  private async fetchFundingRate(symbol: string) {
    const cacheKey = `binance:funding:${symbol}`;
    const cached = getCached<{ fundingRate: number }>(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}USDT&limit=1`;
      const response = await fetchWithRetry(url);
      const data = await response.json();

      const result = {
        fundingRate: data.length > 0 ? parseFloat(data[0].fundingRate) * 100 : 0,
      };
      setCache(cacheKey, result, CACHE_TTL.FUTURES);
      return result;
    } catch {
      return { fundingRate: 0 };
    }
  }

  private async fetchOpenInterest(symbol: string) {
    const cacheKey = `binance:oi:${symbol}`;
    const cached = getCached<{ openInterest: number }>(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}USDT`;
      const response = await fetchWithRetry(url);
      const data = await response.json();

      const result = { openInterest: parseFloat(data.openInterest) };
      setCache(cacheKey, result, CACHE_TTL.FUTURES);
      return result;
    } catch {
      return { openInterest: 0 };
    }
  }

  private async fetchLongShortRatio(symbol: string) {
    const cacheKey = `binance:lsr:${symbol}`;
    const cached = getCached<{ longShortRatio: number }>(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}USDT&period=5m&limit=1`;
      const response = await fetchWithRetry(url);
      const data = await response.json();

      const result = {
        longShortRatio: data.length > 0 ? parseFloat(data[0].longShortRatio) : 1,
      };
      setCache(cacheKey, result, CACHE_TTL.FUTURES);
      return result;
    } catch {
      return { longShortRatio: 1 };
    }
  }

  // CoinGecko ID mapping
  private getCoinGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      BNB: 'binancecoin',
      SOL: 'solana',
      XRP: 'ripple',
      ADA: 'cardano',
      AVAX: 'avalanche-2',
      DOT: 'polkadot',
      MATIC: 'matic-network',
      LINK: 'chainlink',
      UNI: 'uniswap',
      ATOM: 'cosmos',
      LTC: 'litecoin',
      DOGE: 'dogecoin',
      SHIB: 'shiba-inu',
    };
    return mapping[symbol] || symbol.toLowerCase();
  }
}

// Export singleton instance
export const binanceCryptoProvider = new BinanceCryptoProvider();
