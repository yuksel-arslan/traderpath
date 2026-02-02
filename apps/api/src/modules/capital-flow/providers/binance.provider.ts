/**
 * Binance Provider for Capital Flow
 *
 * Fetches REAL market data for crypto flow calculation:
 * - Historical OHLCV (Klines) for volume-weighted flow
 * - Order Book Depth for buy/sell imbalance
 * - Derivatives data (Funding Rate, Open Interest, Long/Short Ratio)
 *
 * API Docs: https://binance-docs.github.io/apidocs/spot/en/
 */

import { FlowDataPoint } from '../types';

const BINANCE_SPOT_URL = 'https://api.binance.com';
const BINANCE_FUTURES_URL = 'https://fapi.binance.com';

// Major trading pairs for market analysis
const MAJOR_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'LTCUSDT', 'NEARUSDT'
];

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
}

interface DerivativesData {
  fundingRate: number;
  openInterest: number;
  openInterestChange: number;
  longShortRatio: number;
}

/**
 * Fetch historical klines (candlesticks) from Binance
 * Returns 30 days of daily data
 */
export async function fetchHistoricalKlines(
  symbol: string = 'BTCUSDT',
  interval: string = '1d',
  limit: number = 30
): Promise<BinanceKline[]> {
  try {
    const url = `${BINANCE_SPOT_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((k: any[]) => ({
      openTime: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      closeTime: k[6],
      quoteVolume: k[7],
      trades: k[8],
      takerBuyBaseVolume: k[9],
      takerBuyQuoteVolume: k[10],
    }));
  } catch (error) {
    console.error(`[Binance] Error fetching klines for ${symbol}:`, error);
    return [];
  }
}

/**
 * Calculate REAL flow history from Binance klines
 * Flow = Volume × Price Direction × Conviction
 */
export async function getCryptoFlowHistory(): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  totalVolume24h: number;
  volumeChange7d: number;
}> {
  try {
    // Fetch klines for multiple major pairs and aggregate
    const klinesPromises = MAJOR_PAIRS.slice(0, 10).map(pair =>
      fetchHistoricalKlines(pair, '1d', 35) // 35 days to calculate 30-day velocity
    );

    const allKlines = await Promise.all(klinesPromises);

    // Aggregate daily volume and calculate flow
    const dailyData: Map<string, { volume: number; priceChange: number; buyVolume: number }> = new Map();

    for (const klines of allKlines) {
      for (const k of klines) {
        const date = new Date(k.openTime).toISOString().split('T')[0];
        const existing = dailyData.get(date) || { volume: 0, priceChange: 0, buyVolume: 0 };

        const quoteVolume = parseFloat(k.quoteVolume);
        const priceChange = ((parseFloat(k.close) - parseFloat(k.open)) / parseFloat(k.open)) * 100;
        const buyVolume = parseFloat(k.takerBuyQuoteVolume);

        dailyData.set(date, {
          volume: existing.volume + quoteVolume,
          priceChange: existing.priceChange + priceChange,
          buyVolume: existing.buyVolume + buyVolume,
        });
      }
    }

    // Convert to sorted array
    const sortedDays = Array.from(dailyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30); // Last 30 days

    // Calculate flow history
    // Flow = (Buy Volume - Sell Volume) / Total Volume * Price Direction
    const flowHistory: FlowDataPoint[] = [];
    const velocityHistory: FlowDataPoint[] = [];

    let cumulativeFlow = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      const [date, data] = sortedDays[i];

      // Calculate daily flow
      // Conviction = buy volume ratio (0.5 = neutral, >0.5 = buying pressure)
      const buyRatio = data.buyVolume / data.volume;
      const conviction = (buyRatio - 0.5) * 2; // Normalize to -1 to +1

      // Daily flow = price change weighted by conviction
      const dailyFlow = (data.priceChange / MAJOR_PAIRS.length) * (1 + conviction);
      cumulativeFlow += dailyFlow;

      flowHistory.push({
        date,
        value: Number(cumulativeFlow.toFixed(2)),
      });

      // Calculate velocity (change from previous day)
      if (i > 0) {
        const prevFlow = flowHistory[i - 1].value;
        velocityHistory.push({
          date,
          value: Number((cumulativeFlow - prevFlow).toFixed(2)),
        });
      }
    }

    // Calculate metrics
    const last24hVolume = sortedDays[sortedDays.length - 1]?.[1]?.volume || 0;
    const prev7dVolume = sortedDays.slice(-8, -1).reduce((sum, [_, d]) => sum + d.volume, 0) / 7;
    const current7dVolume = sortedDays.slice(-7).reduce((sum, [_, d]) => sum + d.volume, 0) / 7;
    const volumeChange7d = prev7dVolume > 0 ? ((current7dVolume - prev7dVolume) / prev7dVolume) * 100 : 0;

    return {
      flowHistory,
      velocityHistory,
      totalVolume24h: last24hVolume,
      volumeChange7d: Number(volumeChange7d.toFixed(2)),
    };
  } catch (error) {
    console.error('[Binance] Error calculating crypto flow history:', error);
    return {
      flowHistory: [],
      velocityHistory: [],
      totalVolume24h: 0,
      volumeChange7d: 0,
    };
  }
}

/**
 * Fetch order book depth and calculate buy/sell imbalance
 * Returns imbalance in range -1 (sell pressure) to +1 (buy pressure)
 */
export async function getOrderBookImbalance(symbol: string = 'BTCUSDT', depthPercent: number = 2): Promise<{
  imbalance: number;
  bidVolume: number;
  askVolume: number;
  spread: number;
}> {
  try {
    const url = `${BINANCE_SPOT_URL}/api/v3/depth?symbol=${symbol}&limit=100`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data: OrderBookData = await response.json();

    // Get current price for percentage calculation
    const tickerResponse = await fetch(`${BINANCE_SPOT_URL}/api/v3/ticker/price?symbol=${symbol}`);
    const ticker = await tickerResponse.json();
    const currentPrice = parseFloat(ticker.price);

    // Calculate price range (within depthPercent of current price)
    const maxPrice = currentPrice * (1 + depthPercent / 100);
    const minPrice = currentPrice * (1 - depthPercent / 100);

    // Sum bid volume within range
    let bidVolume = 0;
    for (const [price, qty] of data.bids) {
      const p = parseFloat(price);
      if (p >= minPrice) {
        bidVolume += parseFloat(qty) * p;
      }
    }

    // Sum ask volume within range
    let askVolume = 0;
    for (const [price, qty] of data.asks) {
      const p = parseFloat(price);
      if (p <= maxPrice) {
        askVolume += parseFloat(qty) * p;
      }
    }

    // Calculate imbalance (-1 to +1)
    const totalVolume = bidVolume + askVolume;
    const imbalance = totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0;

    // Calculate spread
    const bestBid = parseFloat(data.bids[0]?.[0] || '0');
    const bestAsk = parseFloat(data.asks[0]?.[0] || '0');
    const spread = bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;

    return {
      imbalance: Number(imbalance.toFixed(4)),
      bidVolume,
      askVolume,
      spread: Number(spread.toFixed(4)),
    };
  } catch (error) {
    console.error(`[Binance] Error fetching order book for ${symbol}:`, error);
    return { imbalance: 0, bidVolume: 0, askVolume: 0, spread: 0 };
  }
}

/**
 * Get aggregated order book imbalance for major pairs
 */
export async function getAggregatedOrderBookImbalance(): Promise<{
  imbalance: number;
  totalBidVolume: number;
  totalAskVolume: number;
  avgSpread: number;
}> {
  try {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
    const results = await Promise.all(pairs.map(pair => getOrderBookImbalance(pair)));

    let totalBidVolume = 0;
    let totalAskVolume = 0;
    let totalSpread = 0;

    for (const result of results) {
      totalBidVolume += result.bidVolume;
      totalAskVolume += result.askVolume;
      totalSpread += result.spread;
    }

    const totalVolume = totalBidVolume + totalAskVolume;
    const imbalance = totalVolume > 0 ? (totalBidVolume - totalAskVolume) / totalVolume : 0;
    const avgSpread = totalSpread / pairs.length;

    return {
      imbalance: Number(imbalance.toFixed(4)),
      totalBidVolume,
      totalAskVolume,
      avgSpread: Number(avgSpread.toFixed(4)),
    };
  } catch (error) {
    console.error('[Binance] Error getting aggregated order book:', error);
    return { imbalance: 0, totalBidVolume: 0, totalAskVolume: 0, avgSpread: 0 };
  }
}

/**
 * Fetch derivatives data from Binance Futures
 * - Funding Rate: Positive = longs pay shorts (bullish sentiment)
 * - Open Interest: Total outstanding contracts
 * - Long/Short Ratio: Retail trader positioning
 */
export async function getDerivativesData(symbol: string = 'BTCUSDT'): Promise<DerivativesData> {
  try {
    // Fetch funding rate
    const fundingResponse = await fetch(
      `${BINANCE_FUTURES_URL}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );
    const fundingData = await fundingResponse.json();
    const fundingRate = parseFloat(fundingData[0]?.fundingRate || '0') * 100;

    // Fetch open interest
    const oiResponse = await fetch(
      `${BINANCE_FUTURES_URL}/fapi/v1/openInterest?symbol=${symbol}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const oiData = await oiResponse.json();
    const openInterest = parseFloat(oiData.openInterest || '0');

    // Fetch open interest history for change calculation
    const oiHistoryResponse = await fetch(
      `${BINANCE_FUTURES_URL}/futures/data/openInterestHist?symbol=${symbol}&period=1d&limit=2`,
      { signal: AbortSignal.timeout(10000) }
    );
    const oiHistory = await oiHistoryResponse.json();
    const prevOI = parseFloat(oiHistory[0]?.sumOpenInterest || '0');
    const currentOI = parseFloat(oiHistory[1]?.sumOpenInterest || openInterest.toString());
    const openInterestChange = prevOI > 0 ? ((currentOI - prevOI) / prevOI) * 100 : 0;

    // Fetch long/short ratio
    const lsResponse = await fetch(
      `${BINANCE_FUTURES_URL}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1d&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );
    const lsData = await lsResponse.json();
    const longShortRatio = parseFloat(lsData[0]?.longShortRatio || '1');

    return {
      fundingRate: Number(fundingRate.toFixed(4)),
      openInterest,
      openInterestChange: Number(openInterestChange.toFixed(2)),
      longShortRatio: Number(longShortRatio.toFixed(4)),
    };
  } catch (error) {
    console.error(`[Binance] Error fetching derivatives data for ${symbol}:`, error);
    return {
      fundingRate: 0,
      openInterest: 0,
      openInterestChange: 0,
      longShortRatio: 1,
    };
  }
}

/**
 * Get aggregated derivatives data for major pairs
 */
export async function getAggregatedDerivativesData(): Promise<{
  avgFundingRate: number;
  totalOpenInterest: number;
  avgOIChange: number;
  avgLongShortRatio: number;
  derivativesScore: number;
}> {
  try {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
    const results = await Promise.all(pairs.map(pair => getDerivativesData(pair)));

    let totalFunding = 0;
    let totalOI = 0;
    let totalOIChange = 0;
    let totalLSRatio = 0;

    for (const result of results) {
      totalFunding += result.fundingRate;
      totalOI += result.openInterest;
      totalOIChange += result.openInterestChange;
      totalLSRatio += result.longShortRatio;
    }

    const avgFundingRate = totalFunding / pairs.length;
    const avgOIChange = totalOIChange / pairs.length;
    const avgLongShortRatio = totalLSRatio / pairs.length;

    // Calculate derivatives score (-100 to +100)
    // Positive funding + rising OI + high L/S = bullish
    let score = 0;

    // Funding rate contribution (-25 to +25)
    score += Math.max(-25, Math.min(25, avgFundingRate * 250));

    // OI change contribution (-25 to +25)
    score += Math.max(-25, Math.min(25, avgOIChange * 2.5));

    // L/S ratio contribution (-25 to +25)
    // L/S > 1 means more longs, < 1 means more shorts
    score += Math.max(-25, Math.min(25, (avgLongShortRatio - 1) * 25));

    // Extreme funding (contango/backwardation) contribution (-25 to +25)
    if (avgFundingRate > 0.05) score -= 10; // Extremely positive = potential reversal
    if (avgFundingRate < -0.05) score += 10; // Extremely negative = potential bounce

    return {
      avgFundingRate: Number(avgFundingRate.toFixed(4)),
      totalOpenInterest: totalOI,
      avgOIChange: Number(avgOIChange.toFixed(2)),
      avgLongShortRatio: Number(avgLongShortRatio.toFixed(4)),
      derivativesScore: Number(score.toFixed(2)),
    };
  } catch (error) {
    console.error('[Binance] Error getting aggregated derivatives data:', error);
    return {
      avgFundingRate: 0,
      totalOpenInterest: 0,
      avgOIChange: 0,
      avgLongShortRatio: 1,
      derivativesScore: 0,
    };
  }
}

/**
 * Get 24hr ticker data for volume analysis
 */
export async function get24hrTickers(): Promise<{
  totalVolume24h: number;
  volumeByPair: Map<string, number>;
}> {
  try {
    const response = await fetch(`${BINANCE_SPOT_URL}/api/v3/ticker/24hr`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter USDT pairs and calculate volume
    let totalVolume = 0;
    const volumeByPair = new Map<string, number>();

    for (const ticker of data) {
      if (ticker.symbol.endsWith('USDT')) {
        const volume = parseFloat(ticker.quoteVolume || '0');
        totalVolume += volume;
        volumeByPair.set(ticker.symbol, volume);
      }
    }

    return { totalVolume24h: totalVolume, volumeByPair };
  } catch (error) {
    console.error('[Binance] Error fetching 24hr tickers:', error);
    return { totalVolume24h: 0, volumeByPair: new Map() };
  }
}

/**
 * Get complete crypto flow data from Binance
 * Combines all data sources for comprehensive flow analysis
 */
export async function getCompleteCryptoFlowData(): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  orderBookImbalance: number;
  derivativesScore: number;
  totalVolume24h: number;
  volumeChange7d: number;
  components: {
    volumeFlow: number;
    orderBookFlow: number;
    derivativesFlow: number;
  };
}> {
  try {
    const [
      flowData,
      orderBookData,
      derivativesData,
    ] = await Promise.all([
      getCryptoFlowHistory(),
      getAggregatedOrderBookImbalance(),
      getAggregatedDerivativesData(),
    ]);

    // Calculate 7d and 30d flow from history
    const flowHistory = flowData.flowHistory;
    const flow30d = flowHistory[flowHistory.length - 1]?.value || 0;
    const flow7d = flowHistory.length >= 7
      ? flow30d - (flowHistory[flowHistory.length - 8]?.value || 0)
      : flow30d;

    // Calculate velocity (rate of change)
    const velocityHistory = flowData.velocityHistory;
    const recentVelocity = velocityHistory.slice(-7);
    const avgVelocity = recentVelocity.length > 0
      ? recentVelocity.reduce((sum, v) => sum + v.value, 0) / recentVelocity.length
      : 0;

    // Component scores (normalized to -100 to +100)
    const volumeFlow = Math.max(-100, Math.min(100, flowData.volumeChange7d * 5));
    const orderBookFlow = orderBookData.imbalance * 100;
    const derivativesFlow = derivativesData.derivativesScore;

    return {
      flowHistory,
      velocityHistory,
      flow7d: Number(flow7d.toFixed(2)),
      flow30d: Number(flow30d.toFixed(2)),
      flowVelocity: Number(avgVelocity.toFixed(2)),
      orderBookImbalance: orderBookData.imbalance,
      derivativesScore: derivativesData.derivativesScore,
      totalVolume24h: flowData.totalVolume24h,
      volumeChange7d: flowData.volumeChange7d,
      components: {
        volumeFlow: Number(volumeFlow.toFixed(2)),
        orderBookFlow: Number(orderBookFlow.toFixed(2)),
        derivativesFlow: Number(derivativesFlow.toFixed(2)),
      },
    };
  } catch (error) {
    console.error('[Binance] Error getting complete crypto flow data:', error);
    return {
      flowHistory: [],
      velocityHistory: [],
      flow7d: 0,
      flow30d: 0,
      flowVelocity: 0,
      orderBookImbalance: 0,
      derivativesScore: 0,
      totalVolume24h: 0,
      volumeChange7d: 0,
      components: {
        volumeFlow: 0,
        orderBookFlow: 0,
        derivativesFlow: 0,
      },
    };
  }
}
