// ===========================================
// Smart Coins Service
// Provides intelligent coin suggestions for analysis
// Uses CoinGecko data to identify high-potential trades
// ===========================================

import {
  getTrendingCoins,
  getTopMovers,
  CoinGeckoMarketData
} from '../../data-providers/free/coingecko';

// Cache for smart coins data
interface SmartCoinsCache {
  data: SmartCoinsResponse | null;
  expiresAt: number;
}

let smartCoinsCache: SmartCoinsCache = {
  data: null,
  expiresAt: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Binance-supported symbols (we only analyze these)
const BINANCE_SUPPORTED = new Set([
  'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'MATIC', 'SHIB',
  'LTC', 'TRX', 'AVAX', 'LINK', 'ATOM', 'UNI', 'XMR', 'ETC', 'XLM', 'BCH',
  'APT', 'NEAR', 'FIL', 'LDO', 'ARB', 'VET', 'ALGO', 'QNT', 'HBAR', 'ICP',
  'GRT', 'AAVE', 'STX', 'FTM', 'EGLD', 'THETA', 'AXS', 'SAND', 'MANA', 'XTZ',
  'IMX', 'FLOW', 'SNX', 'NEO', 'KCS', 'KLAY', 'CHZ', 'ZEC', 'CAKE', 'RUNE',
  'GALA', 'CRV', 'LUNC', 'ENJ', 'BAT', 'ZIL', 'COMP', 'WAVES', '1INCH', 'LRC',
  'ENS', 'GMX', 'MASK', 'SUSHI', 'YFI', 'MKR', 'DYDX', 'OP', 'INJ', 'SUI',
  'SEI', 'TIA', 'JUP', 'WIF', 'PEPE', 'BONK', 'FLOKI', 'ORDI', 'PEOPLE', 'BLUR',
  'PYTH', 'JTO', 'MEME', 'WLD', 'FET', 'AGIX', 'RNDR', 'OCEAN', 'TAO', 'AR',
  'CFX', 'ACH', 'ANKR', 'API3', 'AUDIO', 'BAND', 'BLZ', 'CELO', 'CELR', 'CLV',
  'COTI', 'CTK', 'CTSI', 'DAR', 'DENT', 'DGB', 'DOCK', 'DUSK', 'FORTH', 'FXS',
  'GLM', 'GTC', 'HARD', 'HIGH', 'HNT', 'HOT', 'ICX', 'IDEX', 'ILV', 'IOST',
  'IOTA', 'IOTX', 'JASMY', 'KDA', 'KEY', 'KMD', 'KNC', 'KSM', 'LEVER', 'LINA',
  'LIT', 'LOKA', 'LPT', 'LUNA', 'MAGIC', 'MDT', 'MINA', 'MTL', 'NKN', 'NMR',
  'NTRN', 'OGN', 'OMG', 'ONE', 'ONT', 'PERP', 'POLS', 'POND', 'PORTO', 'PROM',
  'QI', 'QTUM', 'RAD', 'RARE', 'REN', 'REQ', 'RIF', 'RLC', 'ROSE', 'RSR',
  'RVN', 'SANTOS', 'SC', 'SKL', 'SLP', 'SPELL', 'SSV', 'STORJ', 'STRAX', 'SXP',
  'SYN', 'T', 'TFUEL', 'TLM', 'TRB', 'TROY', 'TWT', 'UMA', 'UNFI', 'UTK',
  'VIDT', 'VOXEL', 'VTHO', 'WAN', 'WIN', 'WOO', 'XEC', 'XEM', 'XNO', 'XVS',
  'YGG', 'ZEN', 'ZRX'
]);

export interface SmartCoin {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  marketCapRank: number;
  score?: number; // Trending score
}

export interface SmartCoinsResponse {
  trending: SmartCoin[];
  gainers: SmartCoin[];
  losers: SmartCoin[];
  highVolume: SmartCoin[];
  topMarketCap: SmartCoin[];
  updatedAt: number;
}

// Convert CoinGecko market data to SmartCoin format
function toSmartCoin(data: CoinGeckoMarketData): SmartCoin {
  return {
    symbol: data.symbol.toUpperCase(),
    name: data.name,
    price: data.current_price,
    priceChange24h: data.price_change_percentage_24h || 0,
    volume24h: data.total_volume,
    marketCap: data.market_cap,
    marketCapRank: data.market_cap_rank,
  };
}

// Filter to only Binance-supported coins
function filterBinanceSupported(coins: SmartCoin[]): SmartCoin[] {
  return coins.filter(coin => BINANCE_SUPPORTED.has(coin.symbol));
}

class SmartCoinsService {
  /**
   * Get all smart coin suggestions
   * Uses caching to avoid rate limits
   */
  async getSmartCoins(): Promise<SmartCoinsResponse> {
    // Check cache
    if (smartCoinsCache.data && Date.now() < smartCoinsCache.expiresAt) {
      console.log('[SmartCoins] Returning cached data');
      return smartCoinsCache.data;
    }

    console.log('[SmartCoins] Fetching fresh data from CoinGecko...');

    try {
      // Fetch data in parallel
      const [trendingRes, moversRes] = await Promise.all([
        getTrendingCoins(),
        getTopMovers(),
      ]);

      const response: SmartCoinsResponse = {
        trending: [],
        gainers: [],
        losers: [],
        highVolume: [],
        topMarketCap: [],
        updatedAt: Date.now(),
      };

      // Process trending coins
      if (trendingRes.success && trendingRes.data?.coins) {
        response.trending = filterBinanceSupported(
          trendingRes.data.coins.map(coin => ({
            symbol: coin.item.symbol.toUpperCase(),
            name: coin.item.name,
            price: 0, // Trending doesn't include price
            priceChange24h: 0,
            volume24h: 0,
            marketCap: 0,
            marketCapRank: coin.item.market_cap_rank,
            score: coin.item.score,
          }))
        ).slice(0, 10);
      }

      // Process gainers, losers, volume, and market cap
      if (moversRes.success && moversRes.data) {
        const { gainers, losers } = moversRes.data;

        // Top gainers (positive price change)
        response.gainers = filterBinanceSupported(
          gainers.map(toSmartCoin)
        ).slice(0, 10);

        // Top losers (negative price change)
        response.losers = filterBinanceSupported(
          losers.map(toSmartCoin)
        ).slice(0, 10);

        // High volume (sort by volume)
        const allCoins = [...gainers, ...losers];
        const byVolume = [...allCoins].sort((a, b) => b.total_volume - a.total_volume);
        response.highVolume = filterBinanceSupported(
          byVolume.map(toSmartCoin)
        ).slice(0, 10);

        // Top market cap (sort by market cap rank)
        const byMarketCap = [...allCoins].sort((a, b) => a.market_cap_rank - b.market_cap_rank);
        response.topMarketCap = filterBinanceSupported(
          byMarketCap.map(toSmartCoin)
        ).slice(0, 10);
      }

      // Cache the result
      smartCoinsCache = {
        data: response,
        expiresAt: Date.now() + CACHE_TTL,
      };

      console.log('[SmartCoins] Data fetched and cached successfully');
      return response;
    } catch (error) {
      console.error('[SmartCoins] Error fetching data:', error);

      // Return cached data if available, even if expired
      if (smartCoinsCache.data) {
        console.log('[SmartCoins] Returning stale cache due to error');
        return smartCoinsCache.data;
      }

      // Return empty response
      return {
        trending: [],
        gainers: [],
        losers: [],
        highVolume: [],
        topMarketCap: [],
        updatedAt: Date.now(),
      };
    }
  }

  /**
   * Get a specific category of coins
   */
  async getCategory(category: 'trending' | 'gainers' | 'losers' | 'highVolume' | 'topMarketCap'): Promise<SmartCoin[]> {
    const data = await this.getSmartCoins();
    return data[category] || [];
  }

  /**
   * Search for a coin in all categories
   */
  async searchCoin(query: string): Promise<SmartCoin | null> {
    const data = await this.getSmartCoins();
    const upperQuery = query.toUpperCase();

    // Search in all categories
    const allCoins = [
      ...data.trending,
      ...data.gainers,
      ...data.losers,
      ...data.highVolume,
      ...data.topMarketCap,
    ];

    return allCoins.find(
      coin => coin.symbol === upperQuery || coin.name.toUpperCase().includes(upperQuery)
    ) || null;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    smartCoinsCache = { data: null, expiresAt: 0 };
    console.log('[SmartCoins] Cache cleared');
  }
}

export const smartCoinsService = new SmartCoinsService();
