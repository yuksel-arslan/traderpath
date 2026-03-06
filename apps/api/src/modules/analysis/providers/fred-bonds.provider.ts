/**
 * FRED Bonds Data Provider
 *
 * Provides Treasury yield data from FRED (Federal Reserve Economic Data)
 * and bond ETF data from Yahoo Finance.
 *
 * Data sources:
 * - Treasury Yields: FRED API
 * - Bond ETFs (TLT, IEF, etc.): Yahoo Finance
 */

import { MarketDataProvider } from './base-provider';
import {
  AssetClass,
  OHLCV,
  MarketData,
  BondFundamentals,
  ProviderCapabilities,
  ResolvedSymbol,
  SUPPORTED_SYMBOLS,
} from './types';

// Cache management
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

// Fetch with retry
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TraderPath/1.0',
        },
      });
      clearTimeout(timeout);
      if (response.ok) return response;
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// FRED API key (from env)
const FRED_API_KEY = process.env['FRED_API_KEY'] || '';

// FRED series IDs for Treasury yields
const FRED_SERIES: Record<string, string> = {
  'US10Y': 'DGS10',    // 10-Year Treasury
  'US2Y': 'DGS2',      // 2-Year Treasury
  'US30Y': 'DGS30',    // 30-Year Treasury
  'US5Y': 'DGS5',      // 5-Year Treasury
  'US3M': 'DGS3MO',    // 3-Month Treasury
  'US1Y': 'DGS1',      // 1-Year Treasury
};

// Bond ETFs (use Yahoo Finance)
const BOND_ETFS = ['TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG', 'TIP', 'MUB', 'EMB'];

// Yahoo Finance interval mapping
const YAHOO_INTERVALS: Record<string, string> = {
  '1h': '60m',
  '4h': '60m',
  '1d': '1d',
};

const YAHOO_RANGES: Record<string, string> = {
  '1h': '1mo',
  '4h': '6mo',
  '1d': '1y',
};

// Cache TTLs
const CACHE_TTL = {
  YIELD: 5 * 60 * 1000,     // 5 minutes (yields don't change frequently)
  ETF_CHART: 60 * 1000,     // 1 minute
  ETF_QUOTE: 30 * 1000,     // 30 seconds
};

/**
 * FRED Bonds Provider Implementation
 */
export class FREDBondsProvider extends MarketDataProvider {
  readonly assetClass: AssetClass = 'bonds';
  readonly name = 'FRED + Yahoo (Bonds)';

  readonly capabilities: ProviderCapabilities = {
    hasOrderBook: false,
    hasFundamentals: true,
    hasNews: true,
    hasFutures: false,
    hasRealtime: false,
    supportedTimeframes: ['1h', '4h', '1d'],
    maxCandleLimit: 250,
  };

  resolveSymbol(symbol: string): ResolvedSymbol {
    const upper = symbol.toUpperCase().trim();

    // Treasury yields
    if (FRED_SERIES[upper]) {
      const displayNames: Record<string, string> = {
        'US10Y': '10-Year Treasury',
        'US2Y': '2-Year Treasury',
        'US30Y': '30-Year Treasury',
        'US5Y': '5-Year Treasury',
        'US3M': '3-Month Treasury',
        'US1Y': '1-Year Treasury',
      };
      return {
        original: symbol,
        normalized: upper,
        assetClass: 'bonds',
        displayName: displayNames[upper] || upper,
      };
    }

    // Bond ETFs
    return {
      original: symbol,
      normalized: upper,
      assetClass: 'bonds',
      exchange: 'nasdaq',
      displayName: upper,
    };
  }

  supportsSymbol(symbol: string): boolean {
    const upper = symbol.toUpperCase().trim();
    return SUPPORTED_SYMBOLS.bonds.includes(upper);
  }

  mapTimeframe(timeframe: string): string {
    return YAHOO_INTERVALS[timeframe] || '1d';
  }

  private isTreasuryYield(symbol: string): boolean {
    return !!FRED_SERIES[symbol.toUpperCase()];
  }

  private isBondETF(symbol: string): boolean {
    return BOND_ETFS.includes(symbol.toUpperCase());
  }

  async fetchCandles(symbol: string, timeframe: string, limit: number = 200): Promise<OHLCV[]> {
    const resolved = this.resolveSymbol(symbol);

    if (this.isTreasuryYield(resolved.normalized)) {
      return this.fetchTreasuryYieldCandles(resolved.normalized, limit);
    } else {
      return this.fetchBondETFCandles(resolved.normalized, timeframe, limit);
    }
  }

  /**
   * Fetch Treasury yield data from FRED and convert to candles
   * (yields don't have OHLCV, so we simulate with close-only data)
   */
  private async fetchTreasuryYieldCandles(symbol: string, limit: number): Promise<OHLCV[]> {
    const seriesId = FRED_SERIES[symbol];
    if (!seriesId) throw new Error(`Unknown Treasury symbol: ${symbol}`);

    const cacheKey = `fred:yield:${seriesId}`;
    const cached = getCached<OHLCV[]>(cacheKey);
    if (cached) return cached.slice(-limit);

    if (!FRED_API_KEY) {
      console.warn('[FREDBonds] No FRED_API_KEY configured, using fallback data');
      return this.getFallbackYieldData(symbol, limit);
    }

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - limit * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;

      const response = await fetchWithRetry(url);
      const data = await response.json();

      if (!data.observations || data.observations.length === 0) {
        return this.getFallbackYieldData(symbol, limit);
      }

      const candles: OHLCV[] = data.observations
        .filter((obs: { value: string }) => obs.value !== '.')
        .map((obs: { date: string; value: string }) => {
          const yieldValue = parseFloat(obs.value);
          const timestamp = new Date(obs.date).getTime();
          return {
            timestamp,
            open: yieldValue,
            high: yieldValue,
            low: yieldValue,
            close: yieldValue,
            volume: 0, // Yields don't have volume
          };
        });

      setCache(cacheKey, candles, CACHE_TTL.YIELD);
      return candles.slice(-limit);
    } catch (error) {
      console.error(`[FREDBonds] Error fetching Treasury yield for ${symbol}:`, error);
      return this.getFallbackYieldData(symbol, limit);
    }
  }

  /**
   * Fetch Bond ETF candles from Yahoo Finance
   */
  private async fetchBondETFCandles(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
    const interval = this.mapTimeframe(timeframe);
    const range = YAHOO_RANGES[timeframe] || '1y';
    const cacheKey = `yahoo:bonds:${symbol}:${interval}:${range}`;

    const cached = getCached<OHLCV[]>(cacheKey);
    if (cached) return cached.slice(-limit);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

    try {
      const response = await fetchWithRetry(url);
      const data = await response.json();

      if (!data.chart?.result?.[0]) {
        throw new Error('No data returned from Yahoo Finance');
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};

      const candles: OHLCV[] = timestamps.map((ts: number, i: number) => ({
        timestamp: ts * 1000,
        open: quotes.open?.[i] || 0,
        high: quotes.high?.[i] || 0,
        low: quotes.low?.[i] || 0,
        close: quotes.close?.[i] || 0,
        volume: quotes.volume?.[i] || 0,
      })).filter((c: OHLCV) => c.open > 0 && c.close > 0);

      setCache(cacheKey, candles, CACHE_TTL.ETF_CHART);
      return candles.slice(-limit);
    } catch (error) {
      console.error(`[FREDBonds] Error fetching ETF candles for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const resolved = this.resolveSymbol(symbol);

    if (this.isTreasuryYield(resolved.normalized)) {
      return this.fetchTreasuryYieldMarketData(resolved.normalized);
    } else {
      return this.fetchBondETFMarketData(resolved.normalized);
    }
  }

  /**
   * Fetch current Treasury yield
   */
  private async fetchTreasuryYieldMarketData(symbol: string): Promise<MarketData> {
    const candles = await this.fetchTreasuryYieldCandles(symbol, 5);

    if (candles.length === 0) {
      throw new Error(`No yield data for ${symbol}`);
    }

    const current = candles[candles.length - 1];
    const previous = candles.length > 1 ? candles[candles.length - 2] : current;
    const change = current.close - previous.close;
    const changePercent = previous.close > 0 ? (change / previous.close) * 100 : 0;

    return {
      symbol,
      assetClass: 'bonds',
      price: current.close, // Yield value
      change24h: change,
      changePercent24h: changePercent,
      high24h: current.close,
      low24h: current.close,
      volume24h: 0,
      lastUpdated: new Date(current.timestamp),
    };
  }

  /**
   * Fetch Bond ETF market data from Yahoo Finance
   */
  private async fetchBondETFMarketData(symbol: string): Promise<MarketData> {
    const cacheKey = `yahoo:bonds:quote:${symbol}`;

    const cached = getCached<MarketData>(cacheKey);
    if (cached) return cached;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;

    try {
      const response = await fetchWithRetry(url);
      const data = await response.json();

      if (!data.chart?.result?.[0]) {
        throw new Error('No data returned');
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quotes = result.indicators?.quote?.[0] || {};

      const currentPrice = meta.regularMarketPrice || quotes.close?.[quotes.close.length - 1] || 0;
      const previousClose = meta.previousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const marketData: MarketData = {
        symbol,
        assetClass: 'bonds',
        price: currentPrice,
        change24h: change,
        changePercent24h: changePercent,
        high24h: meta.regularMarketDayHigh || 0,
        low24h: meta.regularMarketDayLow || 0,
        volume24h: meta.regularMarketVolume || 0,
        lastUpdated: new Date(),
      };

      setCache(cacheKey, marketData, CACHE_TTL.ETF_QUOTE);
      return marketData;
    } catch (error) {
      console.error(`[FREDBonds] Error fetching ETF market data for ${symbol}:`, error);
      throw error;
    }
  }

  override async fetchFundamentals(symbol: string): Promise<BondFundamentals> {
    const resolved = this.resolveSymbol(symbol);

    if (this.isTreasuryYield(resolved.normalized)) {
      return this.fetchTreasuryFundamentals(resolved.normalized);
    } else {
      return this.fetchBondETFFundamentals(resolved.normalized);
    }
  }

  /**
   * Fetch Treasury yield fundamentals (yield curve context)
   */
  private async fetchTreasuryFundamentals(symbol: string): Promise<BondFundamentals> {
    const marketData = await this.fetchTreasuryYieldMarketData(symbol);

    // Fetch 10Y and 2Y for spread calculation
    let yieldCurveSpread: number | undefined;
    try {
      const [yield10Y, yield2Y] = await Promise.all([
        this.fetchTreasuryYieldMarketData('US10Y'),
        this.fetchTreasuryYieldMarketData('US2Y'),
      ]);
      yieldCurveSpread = yield10Y.price - yield2Y.price;
    } catch {
      // Ignore spread calculation errors
    }

    return {
      symbol,
      assetClass: 'bonds',
      yield: marketData.price,
      yieldCurveSpread,
      is10Year: symbol === 'US10Y',
      is2Year: symbol === 'US2Y',
      lastUpdated: new Date(),
    };
  }

  /**
   * Fetch Bond ETF fundamentals
   */
  private async fetchBondETFFundamentals(symbol: string): Promise<BondFundamentals> {
    // Fetch ETF yield from Yahoo Finance quoteSummary
    let yieldRate = 0;
    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      const summaryDetail = data.quoteSummary?.result?.[0]?.summaryDetail || {};
      yieldRate =
        summaryDetail.yield?.raw ||
        summaryDetail.trailingAnnualDividendYield?.raw ||
        0;
    } catch {
      // Ignore Yahoo Finance errors, yield stays 0
    }

    return {
      symbol,
      assetClass: 'bonds',
      yield: yieldRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate fallback yield data when FRED API is unavailable
   */
  private getFallbackYieldData(symbol: string, limit: number): OHLCV[] {
    const baseYields: Record<string, number> = {
      'US10Y': 4.25,
      'US2Y': 4.65,
      'US30Y': 4.45,
      'US5Y': 4.35,
      'US3M': 5.35,
      'US1Y': 5.05,
    };

    const baseYield = baseYields[symbol] || 4.0;
    const candles: OHLCV[] = [];
    const now = Date.now();

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - i * 24 * 60 * 60 * 1000;
      // Add some random variation
      const variation = (Math.random() - 0.5) * 0.1;
      const yieldValue = baseYield + variation;

      candles.push({
        timestamp,
        open: yieldValue,
        high: yieldValue + 0.02,
        low: yieldValue - 0.02,
        close: yieldValue,
        volume: 0,
      });
    }

    return candles;
  }
}

// Export singleton instance
export const fredBondsProvider = new FREDBondsProvider();
