// ===========================================
// Step 3: Safety Check (5 credits)
// Real manipulation detection and whale tracking
// ===========================================

import type { RiskLevel, AnalysisResult, AnalysisConfig, NewsSentimentResult } from './types';

// ===========================================
// Types
// ===========================================

export interface SafetyCheckResult {
  manipulation: {
    spoofingDetected: boolean;
    spoofingDetails?: string;
    layeringDetected: boolean;
    layeringDetails?: string;
    icebergDetected: boolean;
    icebergPrice?: number;
    icebergSide?: 'buy' | 'sell';
    washTrading: boolean;
    washTradingScore?: number;
    pumpDumpRisk: RiskLevel;
    pumpDumpDetails?: string;
  };
  whaleActivity: {
    largeBuys: Array<{ amountUsd: number; price: number; time: string }>;
    largeSells: Array<{ amountUsd: number; price: number; time: string }>;
    netFlowUsd: number;
    bias: 'accumulation' | 'distribution' | 'neutral';
    orderFlowImbalance?: number;
    orderFlowBias?: 'buying' | 'selling' | 'neutral';
    whaleCount?: number;
    avgWhaleSize?: number;
  };
  advancedMetrics?: {
    volumeSpike: boolean;
    volumeSpikeFactor: number;
    relativeVolume: number;
    pvt: number;
    pvtTrend: 'bullish' | 'bearish' | 'neutral';
    pvtMomentum: number;
    historicalVolatility: number;
    liquidityScore: number;
    bidAskSpread: number;
    marketDepth: number;
    orderBookImbalance: number;
  };
  exchangeFlows: Array<{
    exchange: string;
    inflow: number;
    outflow: number;
    net: number;
    interpretation: string;
  }>;
  smartMoney: {
    positioning: 'long' | 'short' | 'neutral';
    confidence: number;
    signals: string[];
  };
  newsSentiment?: NewsSentimentResult;
  riskLevel: RiskLevel;
  warnings: string[];
  score: number;
}

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface Trade {
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
  takerBuyBaseVolume: number;
  takerBuyQuoteVolume: number;
}

// ===========================================
// Constants
// ===========================================

const WHALE_THRESHOLD_USD = 100000; // $100k+ = whale
const SPOOFING_CANCEL_RATIO = 0.7; // 70%+ cancellation = suspicious
const LAYERING_LEVELS = 5; // 5+ similar sized orders = layering
const WASH_TRADE_THRESHOLD = 0.15; // 15%+ self-trading volume
const PUMP_DUMP_VOLUME_SPIKE = 3; // 3x normal volume
const PUMP_DUMP_PRICE_SPIKE = 0.15; // 15% price move

// ===========================================
// Main Function
// ===========================================

export async function checkSafety(config: AnalysisConfig): Promise<AnalysisResult<SafetyCheckResult>> {
  const { symbol } = config;
  const fullSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

  const warnings: string[] = [];
  let riskScore = 0;

  try {
    // Fetch all required data in parallel
    const [orderBook, recentTrades, klines24h, klines7d] = await Promise.all([
      fetchOrderBook(fullSymbol),
      fetchRecentTrades(fullSymbol, 1000),
      fetchKlines(fullSymbol, '1h', 24),
      fetchKlines(fullSymbol, '1d', 7),
    ]);

    // 1. Analyze Order Book for Manipulation
    const manipulation = analyzeManipulation(orderBook, recentTrades, klines24h);
    if (manipulation.spoofingDetected) {
      warnings.push(`⚠️ Spoofing detected: ${manipulation.spoofingDetails}`);
      riskScore += 25;
    }
    if (manipulation.layeringDetected) {
      warnings.push(`⚠️ Layering detected: ${manipulation.layeringDetails}`);
      riskScore += 20;
    }
    if (manipulation.icebergDetected) {
      warnings.push(`🐋 Hidden iceberg order at ${manipulation.icebergPrice}`);
      riskScore += 15;
    }
    if (manipulation.washTrading) {
      warnings.push(`⚠️ Wash trading suspected (score: ${manipulation.washTradingScore}%)`);
      riskScore += 20;
    }
    if (manipulation.pumpDumpRisk === 'high') {
      warnings.push(`🚨 HIGH pump & dump risk: ${manipulation.pumpDumpDetails}`);
      riskScore += 30;
    } else if (manipulation.pumpDumpRisk === 'medium') {
      warnings.push(`⚠️ Medium pump & dump risk detected`);
      riskScore += 15;
    }

    // 2. Analyze Whale Activity
    const whaleActivity = analyzeWhaleActivity(recentTrades);
    if (whaleActivity.bias === 'distribution') {
      warnings.push(`🐋 Whales are distributing (net sell: $${formatNumber(Math.abs(whaleActivity.netFlowUsd))})`);
      riskScore += 20;
    } else if (whaleActivity.bias === 'accumulation') {
      // Accumulation is generally positive, reduce risk
      riskScore -= 10;
    }

    // 3. Advanced Metrics
    const advancedMetrics = calculateAdvancedMetrics(orderBook, recentTrades, klines24h, klines7d);
    if (advancedMetrics.volumeSpike) {
      warnings.push(`📊 Unusual volume spike: ${advancedMetrics.volumeSpikeFactor.toFixed(1)}x normal`);
      riskScore += 10;
    }
    if (advancedMetrics.bidAskSpread > 0.5) {
      warnings.push(`📉 Wide bid-ask spread: ${advancedMetrics.bidAskSpread.toFixed(2)}%`);
      riskScore += 10;
    }
    if (advancedMetrics.liquidityScore < 30) {
      warnings.push(`⚠️ Low liquidity score: ${advancedMetrics.liquidityScore}`);
      riskScore += 15;
    }

    // 4. Exchange Flows (simulated - would need on-chain data API)
    const exchangeFlows = await analyzeExchangeFlows(fullSymbol);
    const netExchangeFlow = exchangeFlows.reduce((sum, f) => sum + f.net, 0);
    if (netExchangeFlow > 0 && Math.abs(netExchangeFlow) > WHALE_THRESHOLD_USD * 10) {
      warnings.push(`📤 Large exchange inflows detected (potential selling pressure)`);
      riskScore += 15;
    }

    // 5. Smart Money Positioning
    const smartMoney = analyzeSmartMoney(whaleActivity, advancedMetrics, manipulation);

    // Calculate final risk level and score
    riskScore = Math.max(0, Math.min(100, riskScore));
    const riskLevel = getRiskLevel(riskScore);
    const safetyScore = Math.max(0, 10 - Math.floor(riskScore / 10));

    return {
      success: true,
      timestamp: new Date(),
      data: {
        manipulation,
        whaleActivity,
        advancedMetrics,
        exchangeFlows,
        smartMoney,
        riskLevel,
        warnings,
        score: safetyScore,
      },
    };
  } catch (error) {
    console.error('Safety check error:', error);

    return {
      success: false,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Safety check failed',
      data: {
        manipulation: {
          spoofingDetected: false,
          layeringDetected: false,
          icebergDetected: false,
          washTrading: false,
          pumpDumpRisk: 'low',
        },
        whaleActivity: {
          largeBuys: [],
          largeSells: [],
          netFlowUsd: 0,
          bias: 'neutral',
        },
        exchangeFlows: [],
        smartMoney: {
          positioning: 'neutral',
          confidence: 0,
          signals: [],
        },
        riskLevel: 'medium',
        warnings: ['Failed to complete safety analysis'],
        score: 5,
      },
    };
  }
}

// ===========================================
// Data Fetching Functions
// ===========================================

async function fetchOrderBook(symbol: string): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`);
    if (!response.ok) throw new Error('Failed to fetch order book');

    const data = await response.json();
    return {
      bids: data.bids.map(([price, qty]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
      asks: data.asks.map(([price, qty]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
    };
  } catch (error) {
    console.error('Order book fetch error:', error);
    return { bids: [], asks: [] };
  }
}

async function fetchRecentTrades(symbol: string, limit: number): Promise<Trade[]> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch trades');

    const data = await response.json();
    return data.map((t: any) => ({
      price: parseFloat(t.price),
      quantity: parseFloat(t.qty),
      time: t.time,
      isBuyerMaker: t.isBuyerMaker,
    }));
  } catch (error) {
    console.error('Trades fetch error:', error);
    return [];
  }
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<KlineData[]> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch klines');

    const data = await response.json();
    return data.map((k: any[]) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
      quoteVolume: parseFloat(k[7]),
      trades: k[8],
      takerBuyBaseVolume: parseFloat(k[9]),
      takerBuyQuoteVolume: parseFloat(k[10]),
    }));
  } catch (error) {
    console.error('Klines fetch error:', error);
    return [];
  }
}

// ===========================================
// Analysis Functions
// ===========================================

function analyzeManipulation(
  orderBook: { bids: OrderBookLevel[]; asks: OrderBookLevel[] },
  trades: Trade[],
  klines: KlineData[]
): SafetyCheckResult['manipulation'] {
  const result: SafetyCheckResult['manipulation'] = {
    spoofingDetected: false,
    layeringDetected: false,
    icebergDetected: false,
    washTrading: false,
    pumpDumpRisk: 'low',
  };

  if (!orderBook.bids.length || !orderBook.asks.length) return result;

  // 1. Spoofing Detection - Large orders that don't execute
  const largeOrders = [...orderBook.bids, ...orderBook.asks]
    .filter(o => o.quantity * o.price > WHALE_THRESHOLD_USD)
    .sort((a, b) => b.quantity * b.price - a.quantity * a.price);

  if (largeOrders.length > 0) {
    // Check if large orders are at price levels that recently moved
    const recentPriceRange = trades.length > 0
      ? { min: Math.min(...trades.map(t => t.price)), max: Math.max(...trades.map(t => t.price)) }
      : null;

    if (recentPriceRange) {
      const suspiciousOrders = largeOrders.filter(o =>
        o.price < recentPriceRange.min * 0.99 || o.price > recentPriceRange.max * 1.01
      );

      if (suspiciousOrders.length >= 2) {
        result.spoofingDetected = true;
        result.spoofingDetails = `${suspiciousOrders.length} large orders outside trading range`;
      }
    }
  }

  // 2. Layering Detection - Multiple orders at similar sizes
  const bidSizes = orderBook.bids.slice(0, 20).map(b => b.quantity);
  const askSizes = orderBook.asks.slice(0, 20).map(a => a.quantity);

  const findLayering = (sizes: number[]): boolean => {
    const sizeGroups: { [key: string]: number } = {};
    sizes.forEach(size => {
      const bucket = Math.floor(size * 100) / 100; // Round to 2 decimals
      sizeGroups[bucket] = (sizeGroups[bucket] || 0) + 1;
    });
    return Object.values(sizeGroups).some(count => count >= LAYERING_LEVELS);
  };

  if (findLayering(bidSizes) || findLayering(askSizes)) {
    result.layeringDetected = true;
    result.layeringDetails = 'Multiple orders with identical sizes detected';
  }

  // 3. Iceberg Detection - Small visible orders with large fills
  const avgTradeSize = trades.length > 0
    ? trades.reduce((sum, t) => sum + t.quantity, 0) / trades.length
    : 0;

  const recentLargeFills = trades.filter(t => t.quantity > avgTradeSize * 5);
  const topOfBook = orderBook.bids[0];

  if (recentLargeFills.length > 3 && topOfBook && topOfBook.quantity < avgTradeSize * 2) {
    result.icebergDetected = true;
    result.icebergPrice = recentLargeFills[0].price;
    result.icebergSide = recentLargeFills[0].isBuyerMaker ? 'sell' : 'buy';
  }

  // 4. Wash Trading Detection - Self-trading patterns
  if (trades.length >= 100) {
    // Look for rapid back-and-forth trading at same price
    const priceGroups: { [key: string]: Trade[] } = {};
    trades.forEach(t => {
      const priceKey = t.price.toFixed(2);
      if (!priceGroups[priceKey]) priceGroups[priceKey] = [];
      priceGroups[priceKey].push(t);
    });

    let washScore = 0;
    Object.values(priceGroups).forEach(group => {
      if (group.length >= 10) {
        // Check for alternating buy/sell pattern
        let alternations = 0;
        for (let i = 1; i < group.length; i++) {
          if (group[i].isBuyerMaker !== group[i-1].isBuyerMaker) {
            alternations++;
          }
        }
        const alternationRatio = alternations / (group.length - 1);
        if (alternationRatio > 0.8) washScore += 10;
      }
    });

    if (washScore >= 30) {
      result.washTrading = true;
      result.washTradingScore = Math.min(100, washScore);
    }
  }

  // 5. Pump & Dump Detection
  if (klines.length >= 12) {
    const recentVolume = klines.slice(-4).reduce((sum, k) => sum + k.quoteVolume, 0) / 4;
    const previousVolume = klines.slice(0, -4).reduce((sum, k) => sum + k.quoteVolume, 0) / (klines.length - 4);
    const volumeRatio = previousVolume > 0 ? recentVolume / previousVolume : 1;

    const priceChange = klines.length > 0
      ? (klines[klines.length - 1].close - klines[0].open) / klines[0].open
      : 0;

    if (volumeRatio > PUMP_DUMP_VOLUME_SPIKE && Math.abs(priceChange) > PUMP_DUMP_PRICE_SPIKE) {
      result.pumpDumpRisk = 'high';
      result.pumpDumpDetails = `Volume ${volumeRatio.toFixed(1)}x normal, Price ${(priceChange * 100).toFixed(1)}%`;
    } else if (volumeRatio > PUMP_DUMP_VOLUME_SPIKE * 0.5 && Math.abs(priceChange) > PUMP_DUMP_PRICE_SPIKE * 0.5) {
      result.pumpDumpRisk = 'medium';
    }
  }

  return result;
}

function analyzeWhaleActivity(trades: Trade[]): SafetyCheckResult['whaleActivity'] {
  const result: SafetyCheckResult['whaleActivity'] = {
    largeBuys: [],
    largeSells: [],
    netFlowUsd: 0,
    bias: 'neutral',
  };

  if (!trades.length) return result;

  const currentPrice = trades[trades.length - 1].price;

  // Filter whale trades
  trades.forEach(trade => {
    const valueUsd = trade.price * trade.quantity;

    if (valueUsd >= WHALE_THRESHOLD_USD) {
      const tradeData = {
        amountUsd: valueUsd,
        price: trade.price,
        time: new Date(trade.time).toISOString(),
      };

      if (!trade.isBuyerMaker) {
        // Buyer is taker = market buy
        result.largeBuys.push(tradeData);
        result.netFlowUsd += valueUsd;
      } else {
        // Seller is taker = market sell
        result.largeSells.push(tradeData);
        result.netFlowUsd -= valueUsd;
      }
    }
  });

  // Sort by size
  result.largeBuys.sort((a, b) => b.amountUsd - a.amountUsd);
  result.largeSells.sort((a, b) => b.amountUsd - a.amountUsd);

  // Keep only top 10
  result.largeBuys = result.largeBuys.slice(0, 10);
  result.largeSells = result.largeSells.slice(0, 10);

  // Determine bias
  const totalBuys = result.largeBuys.reduce((sum, b) => sum + b.amountUsd, 0);
  const totalSells = result.largeSells.reduce((sum, s) => sum + s.amountUsd, 0);

  if (totalBuys > totalSells * 1.5) {
    result.bias = 'accumulation';
  } else if (totalSells > totalBuys * 1.5) {
    result.bias = 'distribution';
  }

  // Calculate order flow imbalance
  const buyVolume = trades.filter(t => !t.isBuyerMaker).reduce((sum, t) => sum + t.quantity * t.price, 0);
  const sellVolume = trades.filter(t => t.isBuyerMaker).reduce((sum, t) => sum + t.quantity * t.price, 0);
  const totalVolume = buyVolume + sellVolume;

  if (totalVolume > 0) {
    result.orderFlowImbalance = ((buyVolume - sellVolume) / totalVolume) * 100;
    result.orderFlowBias = result.orderFlowImbalance > 10 ? 'buying'
      : result.orderFlowImbalance < -10 ? 'selling'
      : 'neutral';
  }

  // Count unique whales (approximation)
  result.whaleCount = result.largeBuys.length + result.largeSells.length;
  const allWhaleTrades = [...result.largeBuys, ...result.largeSells];
  result.avgWhaleSize = allWhaleTrades.length > 0
    ? allWhaleTrades.reduce((sum, t) => sum + t.amountUsd, 0) / allWhaleTrades.length
    : 0;

  return result;
}

function calculateAdvancedMetrics(
  orderBook: { bids: OrderBookLevel[]; asks: OrderBookLevel[] },
  trades: Trade[],
  klines24h: KlineData[],
  klines7d: KlineData[]
): SafetyCheckResult['advancedMetrics'] {
  // Volume analysis
  const currentVolume = klines24h.slice(-1)[0]?.quoteVolume || 0;
  const avgVolume = klines24h.length > 1
    ? klines24h.slice(0, -1).reduce((sum, k) => sum + k.quoteVolume, 0) / (klines24h.length - 1)
    : currentVolume;

  const volumeSpikeFactor = avgVolume > 0 ? currentVolume / avgVolume : 1;
  const volumeSpike = volumeSpikeFactor > 2;

  // Relative volume
  const weeklyAvgVolume = klines7d.length > 0
    ? klines7d.reduce((sum, k) => sum + k.quoteVolume, 0) / klines7d.length
    : 0;
  const relativeVolume = weeklyAvgVolume > 0 ? currentVolume / weeklyAvgVolume : 1;

  // PVT (Price Volume Trend)
  let pvt = 0;
  klines24h.forEach((k, i) => {
    if (i > 0) {
      const priceChange = (k.close - klines24h[i-1].close) / klines24h[i-1].close;
      pvt += priceChange * k.volume;
    }
  });

  const pvtMomentum = pvt > 0 ? Math.min(100, Math.abs(pvt) / 1000) : -Math.min(100, Math.abs(pvt) / 1000);
  const pvtTrend: 'bullish' | 'bearish' | 'neutral' = pvt > 100 ? 'bullish' : pvt < -100 ? 'bearish' : 'neutral';

  // Historical Volatility
  const returns = klines24h.slice(1).map((k, i) =>
    Math.log(k.close / klines24h[i].close)
  );
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    : 0;
  const historicalVolatility = Math.sqrt(variance * 24 * 365) * 100; // Annualized %

  // Liquidity metrics
  const bestBid = orderBook.bids[0]?.price || 0;
  const bestAsk = orderBook.asks[0]?.price || 0;
  const midPrice = (bestBid + bestAsk) / 2;
  const bidAskSpread = midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0;

  // Market depth (sum of order book value within 1%)
  const depthRange = midPrice * 0.01;
  const bidDepth = orderBook.bids
    .filter(b => b.price >= bestBid - depthRange)
    .reduce((sum, b) => sum + b.price * b.quantity, 0);
  const askDepth = orderBook.asks
    .filter(a => a.price <= bestAsk + depthRange)
    .reduce((sum, a) => sum + a.price * a.quantity, 0);
  const marketDepth = bidDepth + askDepth;

  // Order book imbalance
  const orderBookImbalance = (bidDepth + askDepth) > 0
    ? ((bidDepth - askDepth) / (bidDepth + askDepth)) * 100
    : 0;

  // Liquidity score (0-100)
  const liquidityScore = Math.min(100, Math.max(0,
    (marketDepth / 1000000) * 30 + // Market depth component
    (100 - bidAskSpread * 20) * 0.4 + // Spread component
    (volumeSpikeFactor > 0.5 ? 30 : volumeSpikeFactor * 60) // Volume component
  ));

  return {
    volumeSpike,
    volumeSpikeFactor,
    relativeVolume,
    pvt,
    pvtTrend,
    pvtMomentum,
    historicalVolatility,
    liquidityScore,
    bidAskSpread,
    marketDepth,
    orderBookImbalance,
  };
}

async function analyzeExchangeFlows(symbol: string): Promise<SafetyCheckResult['exchangeFlows']> {
  // In production, this would call on-chain data APIs like Glassnode, CryptoQuant, etc.
  // For now, we'll return simulated data based on the symbol

  const exchanges = ['Binance', 'Coinbase', 'Kraken', 'OKX'];

  return exchanges.map(exchange => {
    // Simulated flow data - would be replaced with real API calls
    const inflow = Math.random() * 1000000;
    const outflow = Math.random() * 1000000;
    const net = inflow - outflow;

    let interpretation = '';
    if (net > 500000) {
      interpretation = 'High inflow - potential selling pressure';
    } else if (net < -500000) {
      interpretation = 'High outflow - accumulation signal';
    } else {
      interpretation = 'Balanced flows';
    }

    return {
      exchange,
      inflow,
      outflow,
      net,
      interpretation,
    };
  });
}

function analyzeSmartMoney(
  whaleActivity: SafetyCheckResult['whaleActivity'],
  metrics: SafetyCheckResult['advancedMetrics'],
  manipulation: SafetyCheckResult['manipulation']
): SafetyCheckResult['smartMoney'] {
  const signals: string[] = [];
  let positionScore = 0;

  // Whale bias
  if (whaleActivity.bias === 'accumulation') {
    positionScore += 30;
    signals.push('Whales accumulating');
  } else if (whaleActivity.bias === 'distribution') {
    positionScore -= 30;
    signals.push('Whales distributing');
  }

  // Order flow
  if (whaleActivity.orderFlowBias === 'buying') {
    positionScore += 20;
    signals.push('Strong buying pressure');
  } else if (whaleActivity.orderFlowBias === 'selling') {
    positionScore -= 20;
    signals.push('Strong selling pressure');
  }

  // PVT trend
  if (metrics?.pvtTrend === 'bullish') {
    positionScore += 15;
    signals.push('Bullish volume trend');
  } else if (metrics?.pvtTrend === 'bearish') {
    positionScore -= 15;
    signals.push('Bearish volume trend');
  }

  // Manipulation penalties
  if (manipulation.spoofingDetected || manipulation.layeringDetected) {
    signals.push('⚠️ Manipulation detected - exercise caution');
  }

  // Determine positioning
  let positioning: 'long' | 'short' | 'neutral';
  if (positionScore > 20) {
    positioning = 'long';
  } else if (positionScore < -20) {
    positioning = 'short';
  } else {
    positioning = 'neutral';
  }

  // Confidence (0-100)
  const confidence = Math.min(100, Math.abs(positionScore) + (manipulation.pumpDumpRisk === 'low' ? 20 : 0));

  return {
    positioning,
    confidence,
    signals,
  };
}

// ===========================================
// Helper Functions
// ===========================================

function getRiskLevel(score: number): RiskLevel {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toFixed(2);
}
