/**
 * TraderPath Order Book Analysis Service
 * ======================================
 *
 * Fetches and analyzes order book data from Binance API.
 * Provides insights into:
 * - Buy/Sell pressure
 * - Support/Resistance walls
 * - Liquidity depth
 * - Order imbalance
 */

import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number; // price * quantity
}

export interface OrderBookData {
  symbol: string;
  timestamp: number;

  // Raw data
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];

  // Analysis
  analysis: {
    // Pressure metrics
    buyPressure: number; // Total bid volume
    sellPressure: number; // Total ask volume
    pressureRatio: number; // buy / sell (>1 = bullish)

    // Imbalance
    imbalance: number; // -1 to 1 (-1 = heavy sell, 1 = heavy buy)
    imbalanceLabel: 'heavy_sell' | 'moderate_sell' | 'neutral' | 'moderate_buy' | 'heavy_buy';

    // Walls detection
    bidWalls: {
      price: number;
      quantity: number;
      distancePercent: number;
    }[];
    askWalls: {
      price: number;
      quantity: number;
      distancePercent: number;
    }[];

    // Spread
    spread: number;
    spreadPercent: number;

    // Liquidity score (0-100)
    liquidityScore: number;
    liquidityLabel: 'excellent' | 'good' | 'moderate' | 'poor';

    // Price levels
    strongestSupport: number | null;
    strongestResistance: number | null;
  };
}

// ============================================================================
// BINANCE API
// ============================================================================

const BINANCE_BASE_URL = 'https://api.binance.com';
const ORDER_BOOK_DEPTH = 40; // 40 levels as per requirement

interface BinanceOrderBookResponse {
  lastUpdateId: number;
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][]; // [price, quantity][]
}

// ============================================================================
// ORDER BOOK SERVICE
// ============================================================================

class OrderBookService {
  /**
   * Fetch order book from Binance
   */
  async fetchOrderBook(symbol: string): Promise<OrderBookData | null> {
    try {
      const formattedSymbol = symbol.toUpperCase().endsWith('USDT')
        ? symbol.toUpperCase()
        : `${symbol.toUpperCase()}USDT`;

      const response = await axios.get<BinanceOrderBookResponse>(
        `${BINANCE_BASE_URL}/api/v3/depth`,
        {
          params: {
            symbol: formattedSymbol,
            limit: ORDER_BOOK_DEPTH,
          },
          timeout: 5000,
        }
      );

      const data = response.data;

      // Parse bids and asks
      const bids: OrderBookLevel[] = data.bids.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
        total: parseFloat(price) * parseFloat(qty),
      }));

      const asks: OrderBookLevel[] = data.asks.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
        total: parseFloat(price) * parseFloat(qty),
      }));

      // Analyze the order book
      const analysis = this.analyzeOrderBook(bids, asks);

      return {
        symbol: formattedSymbol,
        timestamp: Date.now(),
        bids,
        asks,
        analysis,
      };
    } catch (error) {
      console.error(`[OrderBook] Failed to fetch for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Analyze order book data
   */
  private analyzeOrderBook(bids: OrderBookLevel[], asks: OrderBookLevel[]) {
    // Calculate total pressure
    const buyPressure = bids.reduce((sum, b) => sum + b.total, 0);
    const sellPressure = asks.reduce((sum, a) => sum + a.total, 0);
    const pressureRatio = sellPressure > 0 ? buyPressure / sellPressure : 1;

    // Calculate imbalance (-1 to 1)
    const totalPressure = buyPressure + sellPressure;
    const imbalance = totalPressure > 0
      ? (buyPressure - sellPressure) / totalPressure
      : 0;

    // Label imbalance
    let imbalanceLabel: OrderBookData['analysis']['imbalanceLabel'] = 'neutral';
    if (imbalance < -0.3) imbalanceLabel = 'heavy_sell';
    else if (imbalance < -0.1) imbalanceLabel = 'moderate_sell';
    else if (imbalance > 0.3) imbalanceLabel = 'heavy_buy';
    else if (imbalance > 0.1) imbalanceLabel = 'moderate_buy';

    // Spread calculation
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    // Detect walls (orders significantly larger than average)
    const avgBidSize = bids.reduce((sum, b) => sum + b.quantity, 0) / bids.length;
    const avgAskSize = asks.reduce((sum, a) => sum + a.quantity, 0) / asks.length;
    const wallThreshold = 3; // 3x average = wall

    const bidWalls = bids
      .filter(b => b.quantity > avgBidSize * wallThreshold)
      .map(b => ({
        price: b.price,
        quantity: b.quantity,
        distancePercent: midPrice > 0 ? ((midPrice - b.price) / midPrice) * 100 : 0,
      }))
      .slice(0, 3);

    const askWalls = asks
      .filter(a => a.quantity > avgAskSize * wallThreshold)
      .map(a => ({
        price: a.price,
        quantity: a.quantity,
        distancePercent: midPrice > 0 ? ((a.price - midPrice) / midPrice) * 100 : 0,
      }))
      .slice(0, 3);

    // Liquidity score (based on depth and spread)
    const depthScore = Math.min(100, (totalPressure / 1000000) * 50); // Normalize to ~50
    const spreadScore = Math.max(0, 50 - spreadPercent * 100); // Lower spread = higher score
    const liquidityScore = Math.min(100, Math.max(0, (depthScore + spreadScore) / 2));

    let liquidityLabel: OrderBookData['analysis']['liquidityLabel'] = 'poor';
    if (liquidityScore >= 75) liquidityLabel = 'excellent';
    else if (liquidityScore >= 50) liquidityLabel = 'good';
    else if (liquidityScore >= 25) liquidityLabel = 'moderate';

    // Strongest support/resistance
    const strongestSupport = bidWalls[0]?.price || (bids.length > 0 ? bids[bids.length - 1].price : null);
    const strongestResistance = askWalls[0]?.price || (asks.length > 0 ? asks[asks.length - 1].price : null);

    return {
      buyPressure,
      sellPressure,
      pressureRatio,
      imbalance,
      imbalanceLabel,
      bidWalls,
      askWalls,
      spread,
      spreadPercent,
      liquidityScore,
      liquidityLabel,
      strongestSupport,
      strongestResistance,
    };
  }
}

export const orderBookService = new OrderBookService();
export default orderBookService;
