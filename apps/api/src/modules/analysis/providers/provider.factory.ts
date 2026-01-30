/**
 * Provider Factory
 *
 * Routes symbols to the appropriate data provider based on asset class.
 * Central entry point for all market data operations.
 */

import { MarketDataProvider, ProviderResult } from './base-provider';
import { AssetClass, OHLCV, MarketData, OrderBook, AssetFundamentals, ResolvedSymbol } from './types';
import { detectAssetClass, resolveSymbol } from './symbol-resolver';
import { binanceCryptoProvider } from './binance-crypto.provider';
import { yahooStockProvider, yahooMetalsProvider } from './yahoo-finance.provider';
import { fredBondsProvider } from './fred-bonds.provider';

// Provider instances
const providers: Record<AssetClass, MarketDataProvider> = {
  crypto: binanceCryptoProvider,
  stocks: yahooStockProvider,
  bonds: fredBondsProvider,
  metals: yahooMetalsProvider,
};

/**
 * Get the appropriate provider for a symbol
 */
export function getProvider(symbol: string): ProviderResult {
  const resolved = resolveSymbol(symbol);
  const provider = providers[resolved.assetClass];

  if (!provider) {
    throw new Error(`No provider available for asset class: ${resolved.assetClass}`);
  }

  return { provider, resolvedSymbol: resolved };
}

/**
 * Get provider by asset class directly
 */
export function getProviderByAssetClass(assetClass: AssetClass): MarketDataProvider {
  const provider = providers[assetClass];
  if (!provider) {
    throw new Error(`No provider available for asset class: ${assetClass}`);
  }
  return provider;
}

/**
 * Fetch candles for any supported symbol
 */
export async function fetchCandles(
  symbol: string,
  timeframe: string,
  limit: number = 200
): Promise<{ candles: OHLCV[]; resolved: ResolvedSymbol }> {
  const { provider, resolvedSymbol } = getProvider(symbol);

  // Validate timeframe
  if (!provider.validateTimeframe(timeframe)) {
    const supported = provider.capabilities.supportedTimeframes.join(', ');
    throw new Error(`Timeframe ${timeframe} not supported for ${resolvedSymbol.assetClass}. Supported: ${supported}`);
  }

  const candles = await provider.fetchCandles(symbol, timeframe, limit);
  return { candles, resolved: resolvedSymbol };
}

/**
 * Fetch market data for any supported symbol
 */
export async function fetchMarketData(symbol: string): Promise<{ data: MarketData; resolved: ResolvedSymbol }> {
  const { provider, resolvedSymbol } = getProvider(symbol);
  const data = await provider.fetchMarketData(symbol);
  return { data, resolved: resolvedSymbol };
}

/**
 * Fetch order book for any supported symbol (if available)
 */
export async function fetchOrderBook(
  symbol: string,
  depth: number = 100
): Promise<{ orderBook: OrderBook | null; resolved: ResolvedSymbol }> {
  const { provider, resolvedSymbol } = getProvider(symbol);

  if (!provider.capabilities.hasOrderBook) {
    return { orderBook: null, resolved: resolvedSymbol };
  }

  const orderBook = await provider.fetchOrderBook(symbol, depth);
  return { orderBook, resolved: resolvedSymbol };
}

/**
 * Fetch fundamentals for any supported symbol (if available)
 */
export async function fetchFundamentals(symbol: string): Promise<{ fundamentals: AssetFundamentals | null; resolved: ResolvedSymbol }> {
  const { provider, resolvedSymbol } = getProvider(symbol);

  if (!provider.capabilities.hasFundamentals) {
    return { fundamentals: null, resolved: resolvedSymbol };
  }

  const fundamentals = await provider.fetchFundamentals(symbol);
  return { fundamentals, resolved: resolvedSymbol };
}

/**
 * Check if a symbol is supported
 */
export function isSymbolSupported(symbol: string): boolean {
  try {
    const { provider, resolvedSymbol } = getProvider(symbol);
    return provider.supportsSymbol(resolvedSymbol.normalized);
  } catch {
    return false;
  }
}

/**
 * Get provider capabilities for a symbol
 */
export function getCapabilities(symbol: string) {
  const { provider, resolvedSymbol } = getProvider(symbol);
  return {
    assetClass: resolvedSymbol.assetClass,
    provider: provider.name,
    capabilities: provider.capabilities,
  };
}

/**
 * Resolve a symbol without fetching data
 */
export function resolve(symbol: string): ResolvedSymbol {
  return resolveSymbol(symbol);
}

/**
 * Detect asset class for a symbol
 */
export function detect(symbol: string): AssetClass {
  return detectAssetClass(symbol);
}

// Export all providers for direct access if needed
export { binanceCryptoProvider, yahooStockProvider, yahooMetalsProvider, fredBondsProvider };

// Export types
export * from './types';
export * from './symbol-resolver';
