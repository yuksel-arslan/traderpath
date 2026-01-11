/**
 * External Data Providers Module
 *
 * This module provides integration with external data sources for
 * institutional-grade market data and sentiment indicators.
 *
 * FREE Data Sources (Implemented):
 * - CoinGecko: Market data, sentiment, trending
 * - Alternative.me: Fear & Greed Index
 * - CoinMarketCap (limited): Basic market data
 *
 * PAID Data Sources (Infrastructure Ready):
 * - Glassnode: On-chain analytics
 * - CryptoQuant: On-chain metrics
 * - Santiment: Social sentiment
 * - Kaiko: Institutional market data
 * - Nansen: Smart money tracking
 * - IntoTheBlock: Blockchain analytics
 */

export * from './types';
export * from './free/coingecko';
export * from './free/fear-greed';
export * from './paid/interfaces';
