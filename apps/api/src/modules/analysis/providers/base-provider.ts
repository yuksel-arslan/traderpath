/**
 * Base Market Data Provider Interface
 *
 * All market providers (Crypto, Stocks, Bonds, Metals) implement this interface.
 * This abstraction allows the analysis engine to work with any market.
 */

import {
  AssetClass,
  OHLCV,
  MarketData,
  OrderBook,
  AssetFundamentals,
  NewsAnalysis,
  ProviderCapabilities,
  ResolvedSymbol,
} from './types';

/**
 * Abstract base class for all market data providers
 */
export abstract class MarketDataProvider {
  abstract readonly assetClass: AssetClass;
  abstract readonly name: string;
  abstract readonly capabilities: ProviderCapabilities;

  /**
   * Resolve a symbol to its canonical form
   * e.g., "BTC" → "BTCUSDT", "AAPL" → "AAPL"
   */
  abstract resolveSymbol(symbol: string): ResolvedSymbol;

  /**
   * Check if this provider supports the given symbol
   */
  abstract supportsSymbol(symbol: string): boolean;

  /**
   * Fetch OHLCV candle data
   */
  abstract fetchCandles(
    symbol: string,
    timeframe: string,
    limit: number
  ): Promise<OHLCV[]>;

  /**
   * Fetch current market data (price, volume, 24h stats)
   */
  abstract fetchMarketData(symbol: string): Promise<MarketData>;

  /**
   * Fetch order book data (if supported)
   */
  async fetchOrderBook(symbol: string, depth?: number): Promise<OrderBook | null> {
    if (!this.capabilities.hasOrderBook) {
      return null;
    }
    throw new Error(`OrderBook not implemented for ${this.name}`);
  }

  /**
   * Fetch asset fundamentals (tokenomics, P/E, yield, etc.)
   */
  async fetchFundamentals(symbol: string): Promise<AssetFundamentals | null> {
    if (!this.capabilities.hasFundamentals) {
      return null;
    }
    throw new Error(`Fundamentals not implemented for ${this.name}`);
  }

  /**
   * Fetch news and sentiment analysis
   */
  async fetchNews(symbol: string): Promise<NewsAnalysis | null> {
    if (!this.capabilities.hasNews) {
      return null;
    }
    throw new Error(`News not implemented for ${this.name}`);
  }

  /**
   * Validate timeframe is supported
   */
  validateTimeframe(timeframe: string): boolean {
    return this.capabilities.supportedTimeframes.includes(timeframe);
  }

  /**
   * Get the mapped timeframe for this provider's API
   */
  abstract mapTimeframe(timeframe: string): string;
}

/**
 * Provider factory result
 */
export interface ProviderResult {
  provider: MarketDataProvider;
  resolvedSymbol: ResolvedSymbol;
}
