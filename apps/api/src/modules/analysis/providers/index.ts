/**
 * Market Data Providers
 *
 * Unified data access layer for multiple markets:
 * - Crypto: Binance
 * - Stocks: Yahoo Finance
 * - Bonds: FRED + Yahoo Finance
 * - Metals: Yahoo Finance
 *
 * Usage:
 * ```ts
 * import { fetchCandles, fetchMarketData, resolve } from './providers';
 *
 * // Fetch candles for any symbol
 * const { candles, resolved } = await fetchCandles('BTC', '4h', 100);
 * const { candles, resolved } = await fetchCandles('AAPL', '1d', 100);
 *
 * // Resolve a symbol to see its asset class
 * const info = resolve('XAUUSD'); // { assetClass: 'metals', ... }
 * ```
 */

// Main factory functions (recommended entry points)
export {
  getProvider,
  getProviderByAssetClass,
  fetchCandles,
  fetchMarketData,
  fetchOrderBook,
  fetchFundamentals,
  isSymbolSupported,
  getCapabilities,
  resolve,
  detect,
} from './provider.factory';

// Types
export * from './types';

// Symbol resolution
export {
  detectAssetClass,
  resolveSymbol,
  getSupportedSymbols,
  isSymbolSupported as checkSymbolSupported,
  searchSymbols,
} from './symbol-resolver';

// Individual providers (for advanced usage)
export { MarketDataProvider } from './base-provider';
export { binanceCryptoProvider, BinanceCryptoProvider } from './binance-crypto.provider';
export { yahooStockProvider, yahooMetalsProvider, YahooFinanceStockProvider, YahooFinanceMetalsProvider } from './yahoo-finance.provider';
export { fredBondsProvider, FREDBondsProvider } from './fred-bonds.provider';
