/**
 * Yahoo Finance Data Provider
 *
 * Provides OHLCV, market data, and fundamentals for:
 * - Stocks (equities, ETFs)
 * - Metals (Gold, Silver via ETFs and spot prices)
 */

import { MarketDataProvider } from './base-provider';
import {
  AssetClass,
  OHLCV,
  MarketData,
  OrderBook,
  StockFundamentals,
  MetalsFundamentals,
  ProviderCapabilities,
  ResolvedSymbol,
  TIMEFRAME_MAPPINGS,
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

// Cache TTLs
const CACHE_TTL = {
  CHART: 60 * 1000,         // 1 minute
  QUOTE: 30 * 1000,         // 30 seconds
  FUNDAMENTALS: 5 * 60 * 1000, // 5 minutes
};

// Yahoo Finance interval mapping
const YAHOO_INTERVALS: Record<string, string> = {
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '60m',
  '4h': '60m', // Yahoo doesn't have 4h directly, we'll aggregate
  '1d': '1d',
};

// Yahoo Finance range mapping (for chart API)
const YAHOO_RANGES: Record<string, string> = {
  '5m': '1d',
  '15m': '5d',
  '30m': '1mo',
  '1h': '1mo',
  '4h': '6mo',
  '1d': '1y',
};

/**
 * Yahoo Finance Stock Provider
 */
export class YahooFinanceStockProvider extends MarketDataProvider {
  readonly assetClass: AssetClass = 'stocks';
  readonly name = 'Yahoo Finance (Stocks)';

  readonly capabilities: ProviderCapabilities = {
    hasOrderBook: false,
    hasFundamentals: true,
    hasNews: true,
    hasFutures: false,
    hasRealtime: false, // Yahoo has 15-min delay for free
    supportedTimeframes: ['5m', '15m', '30m', '1h', '4h', '1d'],
    maxCandleLimit: 500,
  };

  resolveSymbol(symbol: string): ResolvedSymbol {
    const upper = symbol.toUpperCase().trim();
    return {
      original: symbol,
      normalized: upper,
      assetClass: 'stocks',
      exchange: this.detectExchange(upper),
      displayName: upper,
    };
  }

  supportsSymbol(symbol: string): boolean {
    const upper = symbol.toUpperCase().trim();
    return SUPPORTED_SYMBOLS.stocks.includes(upper);
  }

  mapTimeframe(timeframe: string): string {
    return YAHOO_INTERVALS[timeframe] || '1d';
  }

  private detectExchange(symbol: string): string {
    // Common ETFs and indices
    const nasdaqSymbols = ['QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC'];
    if (nasdaqSymbols.includes(symbol)) return 'NASDAQ';
    return 'NYSE';
  }

  async fetchCandles(symbol: string, timeframe: string, limit: number = 200): Promise<OHLCV[]> {
    const resolved = this.resolveSymbol(symbol);
    const interval = this.mapTimeframe(timeframe);
    const range = YAHOO_RANGES[timeframe] || '1y';
    const cacheKey = `yahoo:chart:${resolved.normalized}:${interval}:${range}`;

    const cached = getCached<OHLCV[]>(cacheKey);
    if (cached) return cached.slice(-limit);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${resolved.normalized}?interval=${interval}&range=${range}`;

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
        timestamp: ts * 1000, // Convert to milliseconds
        open: quotes.open?.[i] || 0,
        high: quotes.high?.[i] || 0,
        low: quotes.low?.[i] || 0,
        close: quotes.close?.[i] || 0,
        volume: quotes.volume?.[i] || 0,
      })).filter((c: OHLCV) => c.open > 0 && c.close > 0);

      setCache(cacheKey, candles, CACHE_TTL.CHART);
      return candles.slice(-limit);
    } catch (error) {
      console.error(`[YahooFinance] Error fetching candles for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const resolved = this.resolveSymbol(symbol);
    const cacheKey = `yahoo:quote:${resolved.normalized}`;

    const cached = getCached<MarketData>(cacheKey);
    if (cached) return cached;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${resolved.normalized}?interval=1d&range=2d`;

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
      const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const marketData: MarketData = {
        symbol: resolved.normalized,
        assetClass: 'stocks',
        price: currentPrice,
        change24h: change,
        changePercent24h: changePercent,
        high24h: meta.regularMarketDayHigh || quotes.high?.[quotes.high.length - 1] || 0,
        low24h: meta.regularMarketDayLow || quotes.low?.[quotes.low.length - 1] || 0,
        volume24h: meta.regularMarketVolume || quotes.volume?.[quotes.volume.length - 1] || 0,
        marketCap: meta.marketCap,
        lastUpdated: new Date(),
      };

      setCache(cacheKey, marketData, CACHE_TTL.QUOTE);
      return marketData;
    } catch (error) {
      console.error(`[YahooFinance] Error fetching market data for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchFundamentals(symbol: string): Promise<StockFundamentals> {
    const resolved = this.resolveSymbol(symbol);
    const cacheKey = `yahoo:fundamentals:${resolved.normalized}`;

    const cached = getCached<StockFundamentals>(cacheKey);
    if (cached) return cached;

    // Use quoteSummary API for fundamentals
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${resolved.normalized}?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile`;

    try {
      const response = await fetchWithRetry(url);
      const data = await response.json();

      const summary = data.quoteSummary?.result?.[0] || {};
      const summaryDetail = summary.summaryDetail || {};
      const keyStats = summary.defaultKeyStatistics || {};
      const financialData = summary.financialData || {};
      const assetProfile = summary.assetProfile || {};

      const fundamentals: StockFundamentals = {
        symbol: resolved.normalized,
        assetClass: 'stocks',
        marketCap: summaryDetail.marketCap?.raw || 0,
        peRatio: summaryDetail.trailingPE?.raw,
        forwardPE: summaryDetail.forwardPE?.raw,
        pegRatio: keyStats.pegRatio?.raw,
        eps: financialData.revenuePerShare?.raw,
        profitMargin: financialData.profitMargins?.raw,
        dividendYield: summaryDetail.dividendYield?.raw,
        beta: summaryDetail.beta?.raw,
        sector: assetProfile.sector,
        industry: assetProfile.industry,
        targetPrice: financialData.targetMeanPrice?.raw,
        numberOfAnalysts: financialData.numberOfAnalystOpinions?.raw,
        lastUpdated: new Date(),
      };

      // Determine analyst rating
      const recommendation = financialData.recommendationKey;
      if (recommendation) {
        const ratingMap: Record<string, StockFundamentals['analystRating']> = {
          'strong_buy': 'strong_buy',
          'buy': 'buy',
          'hold': 'hold',
          'sell': 'sell',
          'strong_sell': 'strong_sell',
        };
        fundamentals.analystRating = ratingMap[recommendation];
      }

      setCache(cacheKey, fundamentals, CACHE_TTL.FUNDAMENTALS);
      return fundamentals;
    } catch (error) {
      console.error(`[YahooFinance] Error fetching fundamentals for ${symbol}:`, error);
      // Return basic fundamentals
      return {
        symbol: resolved.normalized,
        assetClass: 'stocks',
        marketCap: 0,
        lastUpdated: new Date(),
      };
    }
  }
}

/**
 * Yahoo Finance Metals Provider
 */
export class YahooFinanceMetalsProvider extends MarketDataProvider {
  readonly assetClass: AssetClass = 'metals';
  readonly name = 'Yahoo Finance (Metals)';

  readonly capabilities: ProviderCapabilities = {
    hasOrderBook: false,
    hasFundamentals: true,
    hasNews: true,
    hasFutures: false,
    hasRealtime: false,
    supportedTimeframes: ['5m', '15m', '30m', '1h', '4h', '1d'],
    maxCandleLimit: 500,
  };

  // Map metals symbols to Yahoo symbols
  private symbolMap: Record<string, string> = {
    'XAUUSD': 'GC=F',    // Gold futures
    'XAU': 'GC=F',
    'GOLD': 'GC=F',
    'XAGUSD': 'SI=F',    // Silver futures
    'XAG': 'SI=F',
    'SILVER': 'SI=F',
    'GLD': 'GLD',        // Gold ETF
    'SLV': 'SLV',        // Silver ETF
    'IAU': 'IAU',        // iShares Gold
    'PSLV': 'PSLV',      // Physical Silver
    'PPLT': 'PPLT',      // Platinum ETF
    'PALL': 'PALL',      // Palladium ETF
    'GDX': 'GDX',        // Gold Miners
    'GDXJ': 'GDXJ',      // Junior Gold Miners
    'SIL': 'SIL',        // Silver Miners
  };

  resolveSymbol(symbol: string): ResolvedSymbol {
    const upper = symbol.toUpperCase().trim();
    const yahooSymbol = this.symbolMap[upper] || upper;

    const displayNames: Record<string, string> = {
      'GC=F': 'Gold',
      'SI=F': 'Silver',
      'GLD': 'Gold ETF',
      'SLV': 'Silver ETF',
    };

    return {
      original: symbol,
      normalized: yahooSymbol,
      assetClass: 'metals',
      displayName: displayNames[yahooSymbol] || upper,
    };
  }

  supportsSymbol(symbol: string): boolean {
    const upper = symbol.toUpperCase().trim();
    return SUPPORTED_SYMBOLS.metals.includes(upper) || !!this.symbolMap[upper];
  }

  mapTimeframe(timeframe: string): string {
    return YAHOO_INTERVALS[timeframe] || '1d';
  }

  async fetchCandles(symbol: string, timeframe: string, limit: number = 200): Promise<OHLCV[]> {
    const resolved = this.resolveSymbol(symbol);
    const interval = this.mapTimeframe(timeframe);
    const range = YAHOO_RANGES[timeframe] || '1y';
    const cacheKey = `yahoo:metals:chart:${resolved.normalized}:${interval}:${range}`;

    const cached = getCached<OHLCV[]>(cacheKey);
    if (cached) return cached.slice(-limit);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${resolved.normalized}?interval=${interval}&range=${range}`;

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

      setCache(cacheKey, candles, CACHE_TTL.CHART);
      return candles.slice(-limit);
    } catch (error) {
      console.error(`[YahooMetals] Error fetching candles for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchMarketData(symbol: string): Promise<MarketData> {
    const resolved = this.resolveSymbol(symbol);
    const cacheKey = `yahoo:metals:quote:${resolved.normalized}`;

    const cached = getCached<MarketData>(cacheKey);
    if (cached) return cached;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${resolved.normalized}?interval=1d&range=2d`;

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
      const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const marketData: MarketData = {
        symbol: resolved.displayName,
        assetClass: 'metals',
        price: currentPrice,
        change24h: change,
        changePercent24h: changePercent,
        high24h: meta.regularMarketDayHigh || 0,
        low24h: meta.regularMarketDayLow || 0,
        volume24h: meta.regularMarketVolume || 0,
        lastUpdated: new Date(),
      };

      setCache(cacheKey, marketData, CACHE_TTL.QUOTE);
      return marketData;
    } catch (error) {
      console.error(`[YahooMetals] Error fetching market data for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchFundamentals(symbol: string): Promise<MetalsFundamentals> {
    const resolved = this.resolveSymbol(symbol);
    const marketData = await this.fetchMarketData(symbol);

    // Fetch DXY for USD correlation (gold is inversely correlated with USD)
    let usdCorrelation: number | undefined;
    try {
      const dxyUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1mo';
      const dxyResponse = await fetchWithRetry(dxyUrl);
      const dxyData = await dxyResponse.json();
      // Simplified correlation - just direction check
      const dxyQuotes = dxyData.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      if (dxyQuotes.length > 1) {
        const dxyChange = dxyQuotes[dxyQuotes.length - 1] - dxyQuotes[0];
        // Gold typically moves opposite to DXY
        usdCorrelation = dxyChange > 0 ? -0.7 : 0.7;
      }
    } catch {
      // Ignore DXY fetch errors
    }

    // Calculate gold/silver ratio if this is silver
    let goldSilverRatio: number | undefined;
    if (resolved.normalized === 'SI=F' || symbol.toUpperCase().includes('SILVER') || symbol.toUpperCase() === 'SLV') {
      try {
        const goldUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d';
        const goldResponse = await fetchWithRetry(goldUrl);
        const goldData = await goldResponse.json();
        const goldPrice = goldData.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
        if (goldPrice > 0 && marketData.price > 0) {
          goldSilverRatio = goldPrice / marketData.price;
        }
      } catch {
        // Ignore ratio calculation errors
      }
    }

    return {
      symbol: resolved.displayName,
      assetClass: 'metals',
      spotPrice: marketData.price,
      usdCorrelation,
      goldSilverRatio,
      lastUpdated: new Date(),
    };
  }
}

// Export singleton instances
export const yahooStockProvider = new YahooFinanceStockProvider();
export const yahooMetalsProvider = new YahooFinanceMetalsProvider();
