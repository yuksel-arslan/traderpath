// ===========================================
// TradePath Analysis Engine - Production Grade
// Full Technical Specification Compliance
// ===========================================

import { config } from '../../core/config';

// ===========================================
// Price Formatting Utility
// Handles decimal precision based on price level
// ===========================================

function roundPrice(price: number): number {
  if (price === 0) return 0;

  // Determine appropriate decimal places based on price magnitude
  if (price >= 10000) {
    // BTC-like: $93,245.50
    return Math.round(price * 100) / 100;
  } else if (price >= 100) {
    // ETH-like: $3,456.78
    return Math.round(price * 100) / 100;
  } else if (price >= 1) {
    // SOL-like: $123.4567
    return Math.round(price * 10000) / 10000;
  } else if (price >= 0.01) {
    // DOGE-like: $0.31234567
    return Math.round(price * 100000000) / 100000000;
  } else {
    // SHIB-like: $0.00002345
    return Math.round(price * 100000000000) / 100000000000;
  }
}

// ===========================================
// Types - Matching Technical Specification
// ===========================================

interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

interface MarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

// Step 1 Types
type TrendDirection = 'bullish' | 'bearish' | 'neutral';

interface MarketPulseResult {
  btcDominance: number;
  btcDominanceTrend: 'rising' | 'falling' | 'stable';
  totalMarketCap: number;
  marketCap24hChange: number;
  fearGreedIndex: number;
  fearGreedLabel: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  marketRegime: 'risk_on' | 'risk_off' | 'neutral';
  trend: {
    direction: TrendDirection;
    strength: number;
    timeframesAligned: number;
  };
  macroEvents: Array<{
    name: string;
    date: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }>;
  summary: string;
  verdict: 'suitable' | 'caution' | 'avoid';
  score: number;
}

// Step 2 Types
interface AssetScanResult {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  timeframes: Array<{
    tf: '1M' | '1W' | '1D' | '4H' | '1H';
    trend: TrendDirection;
    strength: number;
  }>;
  forecast: {
    price24h: number;
    price7d: number;
    confidence: number;
    scenarios: Array<{
      name: 'bull' | 'base' | 'bear';
      price: number;
      probability: number;
    }>;
  };
  levels: {
    resistance: number[];
    support: number[];
    poc: number;
  };
  indicators: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    movingAverages: { ma20: number; ma50: number; ma200: number };
    bollingerBands: { upper: number; middle: number; lower: number };
    atr: number;
  };
  score: number;
}

// Step 3 Types
interface SafetyCheckResult {
  symbol: string;
  manipulation: {
    spoofingDetected: boolean;
    spoofingDetails?: string;
    layeringDetected: boolean;
    layeringDetails?: string;
    icebergDetected: boolean;
    icebergPrice?: number;
    icebergSide?: 'buy' | 'sell';
    washTrading: boolean;
    pumpDumpRisk: 'low' | 'medium' | 'high';
  };
  whaleActivity: {
    largeBuys: Array<{ amountUsd: number; price: number; time: string }>;
    largeSells: Array<{ amountUsd: number; price: number; time: string }>;
    netFlowUsd: number;
    bias: 'accumulation' | 'distribution' | 'neutral';
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
  };
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  score: number;
}

// Step 4 Types
interface TimingResult {
  symbol: string;
  currentPrice: number;
  tradeNow: boolean;
  reason: string;
  conditions: Array<{
    name: string;
    met: boolean;
    details: string;
  }>;
  entryZones: Array<{
    priceLow: number;
    priceHigh: number;
    probability: number;
    eta: string;
    quality: number;
  }>;
  optimalEntry: number;
  waitFor?: {
    event: string;
    estimatedTime: string;
  };
  score: number;
}

// Step 5 Types
interface TradePlanResult {
  symbol: string;
  direction: 'long' | 'short';
  type: 'limit' | 'market';
  entries: Array<{
    price: number;
    percentage: number;
    type: 'limit' | 'stop_limit';
  }>;
  averageEntry: number;
  stopLoss: {
    price: number;
    percentage: number;
    reason: string;
  };
  takeProfits: Array<{
    price: number;
    percentage: number;
    reason: string;
  }>;
  riskReward: number;
  winRateEstimate: number;
  positionSizePercent: number;
  riskAmount: number;
  trailingStop?: {
    activateAfter: string;
    trailPercent: number;
  };
  score: number;
}

// Step 6 Types
interface TrapCheckResult {
  symbol: string;
  traps: {
    bullTrap: boolean;
    bullTrapZone?: number;
    bearTrap: boolean;
    bearTrapZone?: number;
    liquidityGrab: {
      detected: boolean;
      zones: number[];
    };
    stopHuntZones: number[];
    fakeoutRisk: 'low' | 'medium' | 'high';
  };
  liquidationLevels: Array<{
    price: number;
    amountUsd: number;
    type: 'longs' | 'shorts';
  }>;
  counterStrategy: string[];
  proTip: string;
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
}

// Step 7 Types
interface FinalVerdictResult {
  overallScore: number;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  componentScores: Array<{
    step: string;
    score: number;
    weight: number;
  }>;
  confidenceFactors: Array<{
    factor: string;
    positive: boolean;
    impact: 'high' | 'medium' | 'low';
  }>;
  recommendation: string;
  analysisId: string;
  createdAt: string;
  expiresAt: string;
}

// ===========================================
// HTTP Client with Retry & Timeout
// ===========================================

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, retries = 3, retryDelay = 1000 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
      );
    }
  }

  throw new Error('Fetch failed after retries');
}

// ===========================================
// Simple In-Memory Cache
// ===========================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const CACHE_TTL = {
  MARKET_PULSE: 5 * 60 * 1000, // 5 minutes
  TICKER: 30 * 1000, // 30 seconds
  KLINES: 60 * 1000, // 1 minute
  GLOBAL: 5 * 60 * 1000, // 5 minutes
  FEAR_GREED: 60 * 60 * 1000, // 1 hour
};

// ===========================================
// Binance API Functions
// ===========================================

async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<Candle[]> {
  const cacheKey = `klines:${symbol}:${interval}:${limit}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return cached;

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();

  const candles: Candle[] = data.map((k: (string | number)[]) => ({
    openTime: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    closeTime: k[6] as number,
  }));

  setCache(cacheKey, candles, CACHE_TTL.KLINES);
  return candles;
}

async function fetch24hTicker(symbol: string): Promise<MarketData> {
  const cacheKey = `ticker:${symbol}`;
  const cached = getCached<MarketData>(cacheKey);
  if (cached) return cached;

  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`;
  const response = await fetchWithRetry(url);
  const data = await response.json();

  const result: MarketData = {
    symbol,
    price: parseFloat(data.lastPrice),
    priceChange24h: parseFloat(data.priceChange),
    priceChangePercent24h: parseFloat(data.priceChangePercent),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h: parseFloat(data.volume),
    quoteVolume24h: parseFloat(data.quoteVolume),
  };

  setCache(cacheKey, result, CACHE_TTL.TICKER);
  return result;
}

async function fetchOrderBook(
  symbol: string,
  limit: number = 100
): Promise<{ bids: [string, string][]; asks: [string, string][] }> {
  const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}USDT&limit=${limit}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

async function fetchRecentTrades(
  symbol: string,
  limit: number = 500
): Promise<
  Array<{ price: string; qty: string; time: number; isBuyerMaker: boolean }>
> {
  const url = `https://api.binance.com/api/v3/trades?symbol=${symbol}USDT&limit=${limit}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

interface GlobalMetrics {
  totalMarketCap: number;
  btcDominance: number;
  totalVolume24h: number;
  marketCapChange24h: number;
}

async function fetchGlobalMetrics(): Promise<GlobalMetrics> {
  const cacheKey = 'global_metrics';
  const cached = getCached<GlobalMetrics>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithRetry(
      'https://api.coingecko.com/api/v3/global'
    );
    const data = await response.json();

    const result = {
      totalMarketCap: data.data.total_market_cap.usd,
      btcDominance: data.data.market_cap_percentage.btc,
      totalVolume24h: data.data.total_volume.usd,
      marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
    };

    setCache(cacheKey, result, CACHE_TTL.GLOBAL);
    return result;
  } catch {
    // Fallback values if CoinGecko is unavailable
    return {
      totalMarketCap: 2_500_000_000_000,
      btcDominance: 52,
      totalVolume24h: 80_000_000_000,
      marketCapChange24h: 0,
    };
  }
}

interface FearGreedData {
  value: number;
  classification: string;
}

async function fetchFearGreedIndex(): Promise<FearGreedData> {
  const cacheKey = 'fear_greed';
  const cached = getCached<FearGreedData>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithRetry('https://api.alternative.me/fng/');
    const data = await response.json();

    const result = {
      value: parseInt(data.data[0].value),
      classification: data.data[0].value_classification,
    };

    setCache(cacheKey, result, CACHE_TTL.FEAR_GREED);
    return result;
  } catch {
    return { value: 50, classification: 'Neutral' };
  }
}

// ===========================================
// Technical Indicators - Accurate Implementation
// ===========================================

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1] ?? 0;

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    const price = prices[i];
    if (price !== undefined) {
      ema = (price - ema) * multiplier + ema;
    }
  }

  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const prev = prices[i - 1];
    if (current !== undefined && prev !== undefined) {
      changes.push(current - prev);
    }
  }

  if (changes.length < period) return 50;

  // Wilder's smoothing method
  let avgGain = 0;
  let avgLoss = 0;

  // First average
  for (let i = 0; i < period; i++) {
    const change = changes[i] ?? 0;
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothed averages
  for (let i = period; i < changes.length; i++) {
    const change = changes[i] ?? 0;
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(prices: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} {
  if (prices.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  // Calculate MACD line for each point
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const ema12 = calculateEMA(slice, 12);
    const ema26 = calculateEMA(slice, 26);
    macdValues.push(ema12 - ema26);
  }

  const macd = macdValues[macdValues.length - 1] ?? 0;
  const signal = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macd;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const price = prices[prices.length - 1] || 0;
    return { upper: price * 1.02, middle: price, lower: price * 0.98 };
  }

  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);

  const variance =
    slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + stdDev * stdDevMultiplier,
    middle: sma,
    lower: sma - stdDev * stdDevMultiplier,
  };
}

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    if (!current || !prev) continue;

    const high = current.high;
    const low = current.low;
    const prevClose = prev.close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length === 0) return 0;
  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateVWAP(candles: Candle[]): number {
  if (candles.length === 0) return 0;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
}

// ===========================================
// Advanced Indicators (from Python metrics)
// ===========================================

/**
 * Detects volume spikes that could indicate unusual activity
 * Returns spike factor (1.0 = normal, 2.0+ = spike)
 */
function detectVolumeSpike(
  candles: Candle[],
  period: number = 15,
  spikeFactor: number = 2.0
): { isSpike: boolean; factor: number; avgVolume: number } {
  if (candles.length < period) {
    return { isSpike: false, factor: 1, avgVolume: 0 };
  }

  const volumes = candles.slice(-period - 1, -1).map((c) => c.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const stdDev = Math.sqrt(
    volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length
  );

  const currentVolume = candles[candles.length - 1]?.volume ?? 0;
  const threshold = avgVolume + spikeFactor * stdDev;
  const factor = currentVolume / (avgVolume || 1);

  return {
    isSpike: currentVolume > threshold,
    factor: Math.round(factor * 100) / 100,
    avgVolume: Math.round(avgVolume),
  };
}

/**
 * Calculates relative volume compared to recent average
 */
function calculateRelativeVolume(candles: Candle[], period: number = 20): number {
  if (candles.length < period + 1) return 1;

  const historicalVolumes = candles.slice(-period - 1, -1).map((c) => c.volume);
  const avgVolume = historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length;
  const currentVolume = candles[candles.length - 1]?.volume ?? 0;

  return avgVolume > 0 ? Math.round((currentVolume / avgVolume) * 100) / 100 : 1;
}

/**
 * Price-Volume Trend (PVT) - cumulative indicator
 * Shows buying/selling pressure based on price changes and volume
 */
function calculatePVT(candles: Candle[]): {
  pvt: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
} {
  if (candles.length < 2) {
    return { pvt: 0, trend: 'neutral', momentum: 0 };
  }

  let pvt = 0;
  const pvtValues: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    if (!current || !prev || prev.close === 0) continue;

    const priceChange = (current.close - prev.close) / prev.close;
    pvt += priceChange * current.volume;
    pvtValues.push(pvt);
  }

  // Normalize PVT relative to first price for comparison
  const firstPrice = candles[0]?.close ?? 1;
  const normalizedPVT = pvt / firstPrice;

  // Calculate momentum (recent PVT change)
  const recentPVT = pvtValues.slice(-10);
  const momentum =
    recentPVT.length >= 2
      ? (recentPVT[recentPVT.length - 1]! - recentPVT[0]!) / firstPrice
      : 0;

  // Determine trend based on PVT direction
  const trend: 'bullish' | 'bearish' | 'neutral' =
    momentum > 0.01 ? 'bullish' : momentum < -0.01 ? 'bearish' : 'neutral';

  return {
    pvt: Math.round(normalizedPVT * 10000) / 10000,
    trend,
    momentum: Math.round(momentum * 10000) / 10000,
  };
}

/**
 * Order Flow Imbalance from taker buy/sell volume
 * Positive = more buying, Negative = more selling
 */
function calculateOrderFlowImbalance(
  takerBuyVolume: number,
  takerSellVolume: number
): { imbalance: number; bias: 'buying' | 'selling' | 'neutral' } {
  const total = takerBuyVolume + takerSellVolume;
  if (total === 0) return { imbalance: 0, bias: 'neutral' };

  const imbalance = (takerBuyVolume - takerSellVolume) / total;
  const bias: 'buying' | 'selling' | 'neutral' =
    imbalance > 0.1 ? 'buying' : imbalance < -0.1 ? 'selling' : 'neutral';

  return {
    imbalance: Math.round(imbalance * 100) / 100,
    bias,
  };
}

/**
 * Historical Volatility (annualized)
 */
function calculateHistoricalVolatility(candles: Candle[], period: number = 20): number {
  if (candles.length < period + 1) return 0;

  const closes = candles.slice(-period - 1).map((c) => c.close);
  const logReturns: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const current = closes[i];
    const prev = closes[i - 1];
    if (current && prev && prev > 0) {
      logReturns.push(Math.log(current / prev));
    }
  }

  if (logReturns.length === 0) return 0;

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance =
    logReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / logReturns.length;
  const dailyVol = Math.sqrt(variance);

  // Annualize (crypto trades 365 days)
  return Math.round(dailyVol * Math.sqrt(365) * 10000) / 100; // Returns as percentage
}

/**
 * Liquidity Score based on volume and spread
 * Higher = more liquid
 */
function calculateLiquidityScore(
  volume: number,
  price: number,
  bidAskSpread: number
): number {
  if (bidAskSpread <= 0 || price <= 0) return 100;

  const spreadPercent = (bidAskSpread / price) * 100;
  const volumeUSD = volume * price;

  // Score formula: high volume + low spread = high score
  const volumeScore = Math.min(100, Math.log10(volumeUSD + 1) * 10);
  const spreadScore = Math.max(0, 100 - spreadPercent * 1000);

  return Math.round((volumeScore * 0.6 + spreadScore * 0.4) * 100) / 100;
}

function findSupportResistance(candles: Candle[]): {
  support: number[];
  resistance: number[];
  poc: number;
} {
  if (candles.length < 10) {
    const price = candles[candles.length - 1]?.close ?? 0;
    return {
      support: [price * 0.95, price * 0.9],
      resistance: [price * 1.05, price * 1.1],
      poc: price,
    };
  }

  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle?.close ?? 0;
  const levels: Array<{ price: number; strength: number; type: 'high' | 'low' }> = [];

  // Find pivot highs and lows (5-bar pivot)
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const cPrev1 = candles[i - 1];
    const cPrev2 = candles[i - 2];
    const cNext1 = candles[i + 1];
    const cNext2 = candles[i + 2];

    if (!c || !cPrev1 || !cPrev2 || !cNext1 || !cNext2) continue;

    const isHighPivot =
      c.high > cPrev1.high &&
      c.high > cPrev2.high &&
      c.high > cNext1.high &&
      c.high > cNext2.high;

    const isLowPivot =
      c.low < cPrev1.low &&
      c.low < cPrev2.low &&
      c.low < cNext1.low &&
      c.low < cNext2.low;

    if (isHighPivot) {
      levels.push({ price: c.high, strength: 1, type: 'high' });
    }
    if (isLowPivot) {
      levels.push({ price: c.low, strength: 1, type: 'low' });
    }
  }

  // Cluster similar levels (within 1%)
  const threshold = currentPrice * 0.01;
  const clusteredLevels: Array<{ price: number; strength: number }> = [];

  for (const level of levels) {
    const existing = clusteredLevels.find(
      (l) => Math.abs(l.price - level.price) < threshold
    );
    if (existing) {
      existing.strength++;
      existing.price = (existing.price + level.price) / 2;
    } else {
      clusteredLevels.push({ price: level.price, strength: level.strength });
    }
  }

  // Sort by strength
  clusteredLevels.sort((a, b) => b.strength - a.strength);

  const support = clusteredLevels
    .filter((l) => l.price < currentPrice)
    .slice(0, 3)
    .map((l) => roundPrice(l.price));

  const resistance = clusteredLevels
    .filter((l) => l.price > currentPrice)
    .slice(0, 3)
    .map((l) => roundPrice(l.price));

  // Calculate POC (Point of Control) - price with highest volume
  const poc = calculateVWAP(candles.slice(-50));

  return { support, resistance, poc: roundPrice(poc) };
}

function calculateTrend(
  candles: Candle[]
): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
  if (candles.length < 50) {
    return { direction: 'neutral', strength: 50 };
  }

  const prices = candles.map((c) => c.close);
  const currentPrice = prices[prices.length - 1] ?? 0;
  const price10barsAgo = prices[prices.length - 10] ?? currentPrice;

  const ma20 = calculateSMA(prices, 20);
  const ma50 = calculateSMA(prices, 50);
  const ma200 = calculateSMA(prices, Math.min(200, prices.length));
  const ema20 = calculateEMA(prices, 20);

  let bullishSignals = 0;
  let bearishSignals = 0;

  // Price position relative to MAs
  if (currentPrice > ma20) bullishSignals++;
  else bearishSignals++;

  if (currentPrice > ma50) bullishSignals++;
  else bearishSignals++;

  if (currentPrice > ma200) bullishSignals++;
  else bearishSignals++;

  if (currentPrice > ema20) bullishSignals++;
  else bearishSignals++;

  // MA alignment
  if (ma20 > ma50) bullishSignals++;
  else bearishSignals++;

  if (ma50 > ma200) bullishSignals++;
  else bearishSignals++;

  // Price momentum (compare to 10 bars ago)
  const priceChange = price10barsAgo !== 0 ? (currentPrice - price10barsAgo) / price10barsAgo : 0;
  if (priceChange > 0.02) bullishSignals++;
  else if (priceChange < -0.02) bearishSignals++;

  // Higher highs / lower lows
  const recentHighs = candles.slice(-20).map((c) => c.high);
  const recentLows = candles.slice(-20).map((c) => c.low);
  const olderHighs = candles.slice(-40, -20).map((c) => c.high);
  const olderLows = candles.slice(-40, -20).map((c) => c.low);

  const maxRecentHigh = recentHighs.length > 0 ? Math.max(...recentHighs) : 0;
  const maxOlderHigh = olderHighs.length > 0 ? Math.max(...olderHighs) : 0;
  const minRecentLow = recentLows.length > 0 ? Math.min(...recentLows) : 0;
  const minOlderLow = olderLows.length > 0 ? Math.min(...olderLows) : 0;

  if (maxRecentHigh > maxOlderHigh) bullishSignals++;
  else bearishSignals++;

  if (minRecentLow > minOlderLow) bullishSignals++;
  else bearishSignals++;

  const total = bullishSignals + bearishSignals;
  const bullishRatio = total > 0 ? bullishSignals / total : 0.5;

  if (bullishRatio >= 0.7) {
    return { direction: 'bullish', strength: Math.round(bullishRatio * 100) };
  } else if (bullishRatio <= 0.3) {
    return { direction: 'bearish', strength: Math.round((1 - bullishRatio) * 100) };
  }
  return { direction: 'neutral', strength: Math.round(Math.abs(bullishRatio - 0.5) * 200) };
}

// ===========================================
// Analysis Engine
// ===========================================

export const analysisEngine = {
  // =========================================
  // Step 1: Market Pulse (FREE)
  // =========================================
  async getMarketPulse(): Promise<MarketPulseResult> {
    const [btcData, ethData, globalMetrics, fearGreed] = await Promise.all([
      fetch24hTicker('BTC'),
      fetch24hTicker('ETH'),
      fetchGlobalMetrics(),
      fetchFearGreedIndex(),
    ]);

    // Fetch BTC candles for trend analysis
    const btcCandles = await fetchKlines('BTC', '1d', 100);
    const btcTrend = calculateTrend(btcCandles);

    // Multi-timeframe alignment check
    const [candles4h, candles1h] = await Promise.all([
      fetchKlines('BTC', '4h', 100),
      fetchKlines('BTC', '1h', 100),
    ]);

    const trend4h = calculateTrend(candles4h);
    const trend1h = calculateTrend(candles1h);

    let timeframesAligned = 0;
    if (btcTrend.direction === 'bullish') timeframesAligned++;
    if (trend4h.direction === 'bullish') timeframesAligned++;
    if (trend1h.direction === 'bullish') timeframesAligned++;
    if (btcTrend.direction === trend4h.direction) timeframesAligned++;

    // BTC dominance trend
    let btcDominanceTrend: 'rising' | 'falling' | 'stable' = 'stable';
    if (btcData.priceChangePercent24h > ethData.priceChangePercent24h + 2) {
      btcDominanceTrend = 'rising';
    } else if (ethData.priceChangePercent24h > btcData.priceChangePercent24h + 2) {
      btcDominanceTrend = 'falling';
    }

    // Market regime
    let marketRegime: 'risk_on' | 'risk_off' | 'neutral' = 'neutral';
    if (fearGreed.value >= 55 && btcTrend.direction === 'bullish') {
      marketRegime = 'risk_on';
    } else if (fearGreed.value <= 40 && btcTrend.direction === 'bearish') {
      marketRegime = 'risk_off';
    }

    // Fear & Greed label
    let fearGreedLabel: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' = 'neutral';
    if (fearGreed.value <= 24) fearGreedLabel = 'extreme_fear';
    else if (fearGreed.value <= 44) fearGreedLabel = 'fear';
    else if (fearGreed.value <= 55) fearGreedLabel = 'neutral';
    else if (fearGreed.value <= 74) fearGreedLabel = 'greed';
    else fearGreedLabel = 'extreme_greed';

    // Calculate verdict
    let verdict: 'suitable' | 'caution' | 'avoid' = 'caution';
    if (marketRegime === 'risk_on' && btcTrend.strength >= 60) {
      verdict = 'suitable';
    } else if (marketRegime === 'risk_off' || fearGreed.value <= 25) {
      verdict = 'avoid';
    }

    // Calculate score (0-10)
    let score = 5;
    if (marketRegime === 'risk_on') score += 2;
    else if (marketRegime === 'risk_off') score -= 2;
    if (btcTrend.direction === 'bullish') score += 1;
    if (fearGreed.value >= 50 && fearGreed.value <= 75) score += 1;
    if (timeframesAligned >= 3) score += 1;
    score = Math.max(1, Math.min(10, score));

    const summary = `Piyasa ${fearGreedLabel === 'extreme_fear' ? 'aşırı korku' :
      fearGreedLabel === 'fear' ? 'korku' :
      fearGreedLabel === 'neutral' ? 'nötr' :
      fearGreedLabel === 'greed' ? 'açgözlülük' : 'aşırı açgözlülük'} modunda. ` +
      `BTC dominance ${globalMetrics.btcDominance.toFixed(1)}% (${btcDominanceTrend === 'rising' ? 'yükseliyor' : btcDominanceTrend === 'falling' ? 'düşüyor' : 'stabil'}). ` +
      `Genel trend ${btcTrend.direction === 'bullish' ? 'yükseliş' : btcTrend.direction === 'bearish' ? 'düşüş' : 'yatay'} yönünde, güç: ${btcTrend.strength}%.`;

    return {
      btcDominance: parseFloat(globalMetrics.btcDominance.toFixed(1)),
      btcDominanceTrend,
      totalMarketCap: globalMetrics.totalMarketCap,
      marketCap24hChange: globalMetrics.marketCapChange24h,
      fearGreedIndex: fearGreed.value,
      fearGreedLabel,
      marketRegime,
      trend: {
        direction: btcTrend.direction,
        strength: btcTrend.strength,
        timeframesAligned,
      },
      macroEvents: [], // Would require external API for real events
      summary,
      verdict,
      score,
    };
  },

  // =========================================
  // Step 2: Asset Scanner (2 credits)
  // =========================================
  async scanAsset(symbol: string): Promise<AssetScanResult> {
    const [ticker, candles1d, candles4h, candles1h] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '1d', 200),
      fetchKlines(symbol, '4h', 200),
      fetchKlines(symbol, '1h', 200),
    ]);

    // Multi-timeframe trend analysis
    const trend1d = calculateTrend(candles1d);
    const trend4h = calculateTrend(candles4h);
    const trend1h = calculateTrend(candles1h);

    // Weekly trend (from daily candles)
    const trend1w = calculateTrend(candles1d.slice(-35)); // ~5 weeks

    // Monthly trend estimation
    const trend1m = calculateTrend(candles1d.slice(-60)); // ~2 months

    const prices4h = candles4h.map((c) => c.close);
    const prices1d = candles1d.map((c) => c.close);

    // Technical indicators
    const rsi = calculateRSI(prices4h);
    const macd = calculateMACD(prices4h);
    const bb = calculateBollingerBands(prices4h);
    const atr = calculateATR(candles4h);

    // Moving averages
    const ma20 = calculateSMA(prices4h, 20);
    const ma50 = calculateSMA(prices4h, 50);
    const ma200 = calculateSMA(prices4h, Math.min(200, prices4h.length));

    // Support/Resistance levels
    const levels = findSupportResistance(candles1d);

    // Forecast calculation
    const recentReturns = prices1d.slice(-7).map((p, i, arr) => {
      if (i === 0) return 0;
      const prev = arr[i - 1];
      if (prev === undefined || prev === 0) return 0;
      return (p - prev) / prev;
    }).slice(1);

    const avgReturn = recentReturns.length > 0 ? recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length : 0;
    const volatility = recentReturns.length > 0
      ? Math.sqrt(recentReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / recentReturns.length)
      : 0.02;

    const price24h = roundPrice(ticker.price * (1 + avgReturn));
    const price7d = roundPrice(ticker.price * (1 + avgReturn * 7));

    // Confidence based on trend alignment
    let confidence = 50;
    if (trend1d.direction === trend4h.direction) confidence += 15;
    if (trend4h.direction === trend1h.direction) confidence += 10;
    if (rsi > 30 && rsi < 70) confidence += 10;
    if (Math.abs(macd.histogram) > 0 && macd.histogram * (trend4h.direction === 'bullish' ? 1 : -1) > 0) {
      confidence += 10;
    }
    confidence = Math.min(90, Math.max(20, confidence));

    // Scenario probabilities based on trend
    const bullProb = trend4h.direction === 'bullish' ? 40 : trend4h.direction === 'bearish' ? 20 : 30;
    const bearProb = trend4h.direction === 'bearish' ? 40 : trend4h.direction === 'bullish' ? 20 : 30;
    const baseProb = 100 - bullProb - bearProb;

    // Calculate score
    let score = 5;
    if (trend1d.direction === 'bullish') score += 1.5;
    else if (trend1d.direction === 'bearish') score -= 1;
    if (trend4h.direction === 'bullish') score += 1;
    if (rsi >= 30 && rsi <= 70) score += 0.5;
    if (macd.histogram > 0) score += 0.5;
    if (ticker.price > ma50) score += 0.5;
    if (ticker.price > ma200) score += 0.5;
    score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));

    return {
      symbol,
      currentPrice: ticker.price,
      priceChange24h: ticker.priceChangePercent24h,
      volume24h: ticker.quoteVolume24h,
      timeframes: [
        { tf: '1M', trend: trend1m.direction, strength: trend1m.strength },
        { tf: '1W', trend: trend1w.direction, strength: trend1w.strength },
        { tf: '1D', trend: trend1d.direction, strength: trend1d.strength },
        { tf: '4H', trend: trend4h.direction, strength: trend4h.strength },
        { tf: '1H', trend: trend1h.direction, strength: trend1h.strength },
      ],
      forecast: {
        price24h,
        price7d,
        confidence,
        scenarios: [
          {
            name: 'bull',
            price: roundPrice(price7d * (1 + volatility * 2)),
            probability: bullProb,
          },
          { name: 'base', price: price7d, probability: baseProb },
          {
            name: 'bear',
            price: roundPrice(price7d * (1 - volatility * 2)),
            probability: bearProb,
          },
        ],
      },
      levels: {
        resistance: levels.resistance.length > 0 ? levels.resistance : [
          roundPrice(ticker.price * 1.05),
          roundPrice(ticker.price * 1.1),
          roundPrice(ticker.price * 1.15),
        ],
        support: levels.support.length > 0 ? levels.support : [
          roundPrice(ticker.price * 0.95),
          roundPrice(ticker.price * 0.9),
          roundPrice(ticker.price * 0.85),
        ],
        poc: levels.poc || roundPrice((ticker.high24h + ticker.low24h) / 2),
      },
      indicators: {
        rsi: Math.round(rsi * 10) / 10,
        macd: {
          value: parseFloat(macd.macd.toFixed(2)),
          signal: parseFloat(macd.signal.toFixed(2)),
          histogram: parseFloat(macd.histogram.toFixed(2)),
        },
        movingAverages: {
          ma20: roundPrice(ma20),
          ma50: roundPrice(ma50),
          ma200: roundPrice(ma200),
        },
        bollingerBands: {
          upper: roundPrice(bb.upper),
          middle: roundPrice(bb.middle),
          lower: roundPrice(bb.lower),
        },
        atr: parseFloat(atr.toFixed(2)),
      },
      score,
    };
  },

  // =========================================
  // Step 3: Safety Check (5 credits)
  // =========================================
  async safetyCheck(symbol: string): Promise<SafetyCheckResult> {
    const [ticker, candles1h, orderBook, recentTrades] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '1h', 100),
      fetchOrderBook(symbol, 100),
      fetchRecentTrades(symbol, 500),
    ]);

    const volumes = candles1h.map((c) => c.volume);
    const avgVolume = volumes.length > 0 ? volumes.slice(-24).reduce((a, b) => a + b, 0) / Math.min(24, volumes.length) : 1;
    const currentVolume = volumes[volumes.length - 1] ?? avgVolume;
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

    // Advanced indicators from Python metrics
    const volumeSpike = detectVolumeSpike(candles1h, 15, 2.0);
    const relativeVolume = calculateRelativeVolume(candles1h, 20);
    const pvt = calculatePVT(candles1h);
    const historicalVol = calculateHistoricalVolatility(candles1h, 20);

    // Analyze order book for manipulation signs
    const bids = orderBook.bids.map((b) => ({
      price: parseFloat(b[0]),
      qty: parseFloat(b[1]),
    }));
    const asks = orderBook.asks.map((a) => ({
      price: parseFloat(a[0]),
      qty: parseFloat(a[1]),
    }));

    const totalBidVolume = bids.reduce((sum, b) => sum + b.qty * b.price, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.qty * a.price, 0);
    const orderBookImbalance = (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);

    // Check for spoofing (large orders far from price)
    const currentPrice = ticker.price;
    const spoofThreshold = currentPrice * 0.02; // 2% away
    const largeBidsFar = bids.filter(
      (b) => b.qty * b.price > avgVolume * 0.1 && currentPrice - b.price > spoofThreshold
    );
    const largeAsksFar = asks.filter(
      (a) => a.qty * a.price > avgVolume * 0.1 && a.price - currentPrice > spoofThreshold
    );
    const spoofingDetected = largeBidsFar.length > 3 || largeAsksFar.length > 3;

    // Check for layering
    const bidPriceLevels = new Set(bids.slice(0, 20).map((b) => Math.round(b.price * 100)));
    const askPriceLevels = new Set(asks.slice(0, 20).map((a) => Math.round(a.price * 100)));
    const layeringDetected = bidPriceLevels.size >= 18 || askPriceLevels.size >= 18;

    // Check for iceberg orders (large fills at same price)
    const tradesByPrice = new Map<number, number>();
    for (const trade of recentTrades) {
      const price = Math.round(parseFloat(trade.price) * 100) / 100;
      tradesByPrice.set(price, (tradesByPrice.get(price) ?? 0) + parseFloat(trade.qty));
    }
    const tradeVolumes = [...tradesByPrice.values()];
    const maxTradeVolume = tradeVolumes.length > 0 ? Math.max(...tradeVolumes) : 0;
    const icebergDetected = maxTradeVolume > avgVolume * 0.5;
    const sortedTrades = [...tradesByPrice.entries()].sort((a, b) => b[1] - a[1]);
    const icebergPrice = icebergDetected && sortedTrades.length > 0
      ? sortedTrades[0]?.[0]
      : undefined;

    // Wash trading detection (same size trades)
    const tradeSizes = recentTrades.map((t) => parseFloat(t.qty));
    const sizeFrequency = new Map<string, number>();
    for (const size of tradeSizes) {
      const key = size.toFixed(4);
      sizeFrequency.set(key, (sizeFrequency.get(key) || 0) + 1);
    }
    const maxFrequency = Math.max(...sizeFrequency.values());
    const washTrading = maxFrequency > recentTrades.length * 0.1;

    // Pump & dump risk
    let pumpDumpRisk: 'low' | 'medium' | 'high' = 'low';
    if (Math.abs(ticker.priceChangePercent24h) > 20 && volumeRatio > 3) {
      pumpDumpRisk = 'high';
    } else if (Math.abs(ticker.priceChangePercent24h) > 10 && volumeRatio > 2) {
      pumpDumpRisk = 'medium';
    }

    // Whale activity analysis
    const largeTrades = recentTrades.filter(
      (t) => parseFloat(t.qty) * parseFloat(t.price) > 50000
    );
    const largeBuys = largeTrades
      .filter((t) => !t.isBuyerMaker)
      .map((t) => ({
        amountUsd: parseFloat(t.qty) * parseFloat(t.price),
        price: parseFloat(t.price),
        time: new Date(t.time).toISOString(),
      }));
    const largeSells = largeTrades
      .filter((t) => t.isBuyerMaker)
      .map((t) => ({
        amountUsd: parseFloat(t.qty) * parseFloat(t.price),
        price: parseFloat(t.price),
        time: new Date(t.time).toISOString(),
      }));

    const buyVolume = largeBuys.reduce((sum, t) => sum + t.amountUsd, 0);
    const sellVolume = largeSells.reduce((sum, t) => sum + t.amountUsd, 0);
    const netFlowUsd = buyVolume - sellVolume;

    // Calculate order flow imbalance from all trades
    const takerBuyVolume = recentTrades
      .filter((t) => !t.isBuyerMaker)
      .reduce((sum, t) => sum + parseFloat(t.qty), 0);
    const takerSellVolume = recentTrades
      .filter((t) => t.isBuyerMaker)
      .reduce((sum, t) => sum + parseFloat(t.qty), 0);
    const orderFlowImbalance = calculateOrderFlowImbalance(takerBuyVolume, takerSellVolume);

    // Calculate liquidity score
    const bestBid = bids[0]?.price ?? 0;
    const bestAsk = asks[0]?.price ?? 0;
    const bidAskSpread = bestAsk - bestBid;
    const liquidityScore = calculateLiquidityScore(ticker.volume24h, currentPrice, bidAskSpread);

    let whaleBias: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
    if (netFlowUsd > 100000) whaleBias = 'accumulation';
    else if (netFlowUsd < -100000) whaleBias = 'distribution';

    // Smart money positioning
    let smartMoneyPositioning: 'long' | 'short' | 'neutral' = 'neutral';
    if (orderBookImbalance > 0.2) smartMoneyPositioning = 'long';
    else if (orderBookImbalance < -0.2) smartMoneyPositioning = 'short';

    // Overall risk level
    const warnings: string[] = [];
    let riskScore = 100;

    if (spoofingDetected) {
      warnings.push('Spoofing detected - proceed with caution');
      riskScore -= 20;
    }
    if (layeringDetected) {
      warnings.push('Layering activity detected');
      riskScore -= 15;
    }
    if (icebergDetected) {
      warnings.push(`Hidden iceberg order detected at $${icebergPrice}`);
      riskScore -= 10;
    }
    if (washTrading) {
      warnings.push('Wash trading suspected');
      riskScore -= 15;
    }
    if (pumpDumpRisk === 'high') {
      warnings.push('High pump & dump risk!');
      riskScore -= 25;
    }
    if (volumeRatio > 3) {
      warnings.push(`Abnormal volume: ${volumeRatio.toFixed(1)}x average`);
      riskScore -= 10;
    }
    if (volumeSpike.isSpike) {
      warnings.push(`Volume spike detected: ${volumeSpike.factor.toFixed(1)}x normal`);
      riskScore -= 8;
    }
    if (Math.abs(ticker.priceChangePercent24h) > 15) {
      warnings.push(`Large price movement: ${ticker.priceChangePercent24h.toFixed(1)}%`);
      riskScore -= 10;
    }
    if (liquidityScore < 50) {
      warnings.push(`Low liquidity score: ${liquidityScore.toFixed(0)}/100`);
      riskScore -= 10;
    }
    if (historicalVol > 100) {
      warnings.push(`High volatility: ${historicalVol.toFixed(0)}% annualized`);
      riskScore -= 5;
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore < 50) riskLevel = 'high';
    else if (riskScore < 75) riskLevel = 'medium';

    // Calculate score (inverse of risk)
    const score = Math.max(1, Math.min(10, riskScore / 10));

    return {
      symbol,
      manipulation: {
        spoofingDetected,
        spoofingDetails: spoofingDetected ? 'Large orders detected far from current price' : undefined,
        layeringDetected,
        layeringDetails: layeringDetected ? 'Multiple orders at many small price levels' : undefined,
        icebergDetected,
        icebergPrice,
        icebergSide: icebergDetected
          ? largeBuys.length > largeSells.length
            ? 'buy'
            : 'sell'
          : undefined,
        washTrading,
        pumpDumpRisk,
      },
      whaleActivity: {
        largeBuys: largeBuys.slice(0, 5),
        largeSells: largeSells.slice(0, 5),
        netFlowUsd,
        bias: whaleBias,
        orderFlowImbalance: orderFlowImbalance.imbalance,
        orderFlowBias: orderFlowImbalance.bias,
      },
      advancedMetrics: {
        volumeSpike: volumeSpike.isSpike,
        volumeSpikeFactor: volumeSpike.factor,
        relativeVolume,
        pvt: pvt.pvt,
        pvtTrend: pvt.trend,
        pvtMomentum: pvt.momentum,
        historicalVolatility: historicalVol,
        liquidityScore,
        bidAskSpread: Math.round(bidAskSpread * 10000) / 10000,
      },
      exchangeFlows: [
        {
          exchange: 'Binance',
          inflow: sellVolume,
          outflow: buyVolume,
          net: netFlowUsd,
          interpretation: netFlowUsd > 0 ? 'Net outflow - bullish signal' : 'Net inflow - bearish signal',
        },
      ],
      smartMoney: {
        positioning: smartMoneyPositioning,
        confidence: Math.round(Math.abs(orderBookImbalance) * 100),
      },
      riskLevel,
      warnings,
      score,
    };
  },

  // =========================================
  // Step 4: Timing (3 credits)
  // =========================================
  async timingAnalysis(symbol: string): Promise<TimingResult> {
    const [ticker, candles4h, candles1h] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '4h', 100),
      fetchKlines(symbol, '1h', 100),
    ]);

    const prices4h = candles4h.map((c) => c.close);
    const prices1h = candles1h.map((c) => c.close);

    const rsi4h = calculateRSI(prices4h);
    const rsi1h = calculateRSI(prices1h);
    const bb = calculateBollingerBands(prices4h);
    const macd = calculateMACD(prices4h);
    const trend = calculateTrend(candles4h);
    const levels = findSupportResistance(candles4h);

    // Advanced metrics for timing
    const relativeVolume = calculateRelativeVolume(candles1h, 20);
    const pvt = calculatePVT(candles4h);
    const volumeSpike = detectVolumeSpike(candles1h, 15, 2.0);

    const currentPrice = ticker.price;

    // Entry conditions
    const conditions: Array<{ name: string; met: boolean; details: string }> = [
      {
        name: 'RSI Status',
        met: rsi4h >= 30 && rsi4h <= 70,
        details: rsi4h < 30 ? 'Oversold' : rsi4h > 70 ? 'Overbought' : 'Normal zone',
      },
      {
        name: 'Bollinger Position',
        met: currentPrice <= bb.middle,
        details: currentPrice > bb.upper ? 'Above upper band' :
                 currentPrice < bb.lower ? 'Below lower band' :
                 currentPrice <= bb.middle ? 'Below middle - good entry' : 'Above middle',
      },
      {
        name: 'MACD Signal',
        met: trend.direction === 'bullish' ? macd.histogram > 0 : macd.histogram < 0,
        details: macd.histogram > 0 ? 'Positive histogram' : 'Negative histogram',
      },
      {
        name: 'Trend Alignment',
        met: trend.strength >= 60,
        details: `Trend strength: ${trend.strength}%`,
      },
      {
        name: 'Support Proximity',
        met: levels.support.length > 0 && currentPrice <= (levels.support[0] ?? currentPrice) * 1.03,
        details: levels.support[0] !== undefined ? `Nearest support: $${levels.support[0]}` : 'No support found',
      },
      {
        name: 'Volume Quality',
        met: relativeVolume >= 0.8 && relativeVolume <= 2.0 && !volumeSpike.isSpike,
        details: volumeSpike.isSpike
          ? `Volume spike: ${volumeSpike.factor.toFixed(1)}x - wait for calm`
          : `Relative volume: ${relativeVolume.toFixed(1)}x`,
      },
      {
        name: 'PVT Confirmation',
        met: (trend.direction === 'bullish' && pvt.trend === 'bullish') ||
             (trend.direction === 'bearish' && pvt.trend === 'bearish'),
        details: `PVT trend: ${pvt.trend}, momentum: ${pvt.momentum > 0 ? '+' : ''}${(pvt.momentum * 100).toFixed(2)}%`,
      },
    ];

    const conditionsMet = conditions.filter((c) => c.met).length;
    // Need at least 4 out of 7 conditions met, RSI not overbought, and no volume spike
    const tradeNow = conditionsMet >= 4 && rsi4h < 65 && !volumeSpike.isSpike;

    // Calculate optimal entry
    const nearestSupport = levels.support[0] ?? currentPrice * 0.97;
    const optimalEntry = roundPrice(currentPrice * 0.6 + nearestSupport * 0.4);

    // Entry zones
    const entryZones: TimingResult['entryZones'] = [];

    // Zone 1: Aggressive entry
    if (currentPrice <= bb.middle) {
      entryZones.push({
        priceLow: roundPrice(currentPrice * 0.99),
        priceHigh: roundPrice(currentPrice * 1.01),
        probability: 70,
        eta: 'Now',
        quality: 4,
      });
    }

    // Zone 2: Conservative entry
    if (levels.support[0]) {
      entryZones.push({
        priceLow: roundPrice(levels.support[0] * 0.99),
        priceHigh: roundPrice(levels.support[0] * 1.01),
        probability: 60,
        eta: '4-12 hours',
        quality: 5,
      });
    }

    // Zone 3: Deep value
    if (levels.support[1]) {
      entryZones.push({
        priceLow: roundPrice(levels.support[1] * 0.99),
        priceHigh: roundPrice(levels.support[1] * 1.01),
        probability: 40,
        eta: '1-3 days',
        quality: 5,
      });
    }

    // Wait recommendation
    let waitFor: TimingResult['waitFor'];
    if (!tradeNow) {
      if (rsi4h > 70) {
        waitFor = {
          event: 'RSI drop (below 70)',
          estimatedTime: '4-8 hours',
        };
      } else if (currentPrice > bb.upper) {
        waitFor = {
          event: 'Price dropping below upper BB band',
          estimatedTime: '2-6 hours',
        };
      } else if (conditionsMet < 3) {
        waitFor = {
          event: 'More conditions to be met',
          estimatedTime: '6-24 hours',
        };
      }
    }

    // Reason
    let reason = '';
    if (tradeNow) {
      reason = `${conditionsMet}/5 conditions met. `;
      if (rsi4h < 40) reason += 'RSI low - good buying opportunity. ';
      if (currentPrice < bb.middle) reason += 'Price below BB middle. ';
    } else {
      reason = `${conditionsMet}/5 conditions met - not enough. `;
      if (rsi4h > 70) reason += 'RSI in overbought zone. ';
      if (currentPrice > bb.upper) reason += 'Price above upper BB band. ';
    }

    // Score calculation
    let score = 5;
    score += conditionsMet * 0.8;
    if (tradeNow) score += 1;
    if (rsi4h >= 30 && rsi4h <= 50) score += 0.5;
    score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));

    return {
      symbol,
      currentPrice,
      tradeNow,
      reason: reason.trim(),
      conditions,
      entryZones,
      optimalEntry,
      waitFor,
      score,
    };
  },

  // =========================================
  // Step 5: Trade Plan (5 credits)
  // =========================================
  async tradePlan(symbol: string, accountSize: number = 10000): Promise<TradePlanResult> {
    const [ticker, candles4h] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '4h', 100),
    ]);

    const trend = calculateTrend(candles4h);
    const levels = findSupportResistance(candles4h);
    const atr = calculateATR(candles4h);

    const direction: 'long' | 'short' = trend.direction === 'bearish' ? 'short' : 'long';
    const currentPrice = ticker.price;

    // Calculate entries (3-level scaling)
    const entry1 = currentPrice;
    const entry2 = direction === 'long'
      ? currentPrice * 0.98
      : currentPrice * 1.02;
    const entry3 = direction === 'long'
      ? levels.support[0] || currentPrice * 0.95
      : levels.resistance[0] || currentPrice * 1.05;

    const entries: TradePlanResult['entries'] = [
      { price: roundPrice(entry1), percentage: 40, type: 'limit' },
      { price: roundPrice(entry2), percentage: 35, type: 'limit' },
      { price: roundPrice(entry3), percentage: 25, type: 'stop_limit' },
    ];

    const averageEntry = roundPrice(
      entries.reduce((sum, e) => sum + e.price * (e.percentage / 100), 0)
    );

    // Stop loss calculation (ATR-based or level-based)
    const atrStop = atr * 2;
    const levelStop = direction === 'long'
      ? (levels.support[1] || averageEntry * 0.93)
      : (levels.resistance[1] || averageEntry * 1.07);

    const stopDistance = Math.max(atrStop, Math.abs(averageEntry - levelStop));
    const stopPrice = direction === 'long'
      ? averageEntry - stopDistance
      : averageEntry + stopDistance;

    const stopPercentage = Math.abs((stopPrice - averageEntry) / averageEntry * 100);

    const stopLoss: TradePlanResult['stopLoss'] = {
      price: roundPrice(stopPrice),
      percentage: parseFloat(stopPercentage.toFixed(2)),
      reason: `ATR-based stop (${atr.toFixed(2)} ATR) + support/resistance level`,
    };

    // Take profit levels (R:R based)
    const riskAmount = Math.abs(averageEntry - stopPrice);
    const takeProfits: TradePlanResult['takeProfits'] = [
      {
        price: roundPrice(direction === 'long' ? averageEntry + riskAmount * 1.5 : averageEntry - riskAmount * 1.5),
        percentage: 30,
        reason: '1.5R - First take profit',
      },
      {
        price: roundPrice(direction === 'long' ? averageEntry + riskAmount * 2.5 : averageEntry - riskAmount * 2.5),
        percentage: 40,
        reason: '2.5R - Main target',
      },
      {
        price: roundPrice(direction === 'long' ? averageEntry + riskAmount * 4 : averageEntry - riskAmount * 4),
        percentage: 30,
        reason: '4R - Extended target',
      },
    ];

    // Risk/Reward calculation (weighted average)
    const avgRR = takeProfits.reduce(
      (sum, tp) => sum + (Math.abs(tp.price - averageEntry) / riskAmount) * (tp.percentage / 100),
      0
    );

    // Position sizing (2% risk rule)
    const riskPercent = 2;
    const riskAmountUsd = accountSize * (riskPercent / 100);
    const positionSizePercent = (riskAmountUsd / stopDistance) * averageEntry / accountSize * 100;

    // Win rate estimate based on trend strength
    let winRateEstimate = 50;
    if (trend.strength >= 70) winRateEstimate += 10;
    if (trend.strength >= 80) winRateEstimate += 5;
    if (direction === 'long' && trend.direction === 'bullish') winRateEstimate += 10;
    if (direction === 'short' && trend.direction === 'bearish') winRateEstimate += 10;
    winRateEstimate = Math.min(75, winRateEstimate);

    // Trailing stop
    const trailingStop: TradePlanResult['trailingStop'] = {
      activateAfter: 'When TP1 is reached',
      trailPercent: parseFloat((atr / averageEntry * 100).toFixed(2)),
    };

    // Score
    let score = 5;
    if (avgRR >= 2) score += 1;
    if (avgRR >= 3) score += 1;
    if (trend.strength >= 60) score += 1;
    if (winRateEstimate >= 60) score += 1;
    if (stopPercentage <= 5) score += 0.5;
    score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));

    return {
      symbol,
      direction,
      type: 'limit',
      entries,
      averageEntry,
      stopLoss,
      takeProfits,
      riskReward: parseFloat(avgRR.toFixed(2)),
      winRateEstimate,
      positionSizePercent: parseFloat(positionSizePercent.toFixed(2)),
      riskAmount: riskAmountUsd,
      trailingStop,
      score,
    };
  },

  // =========================================
  // Step 6: Trap Check (5 credits)
  // =========================================
  async trapCheck(symbol: string): Promise<TrapCheckResult> {
    const [ticker, candles4h, candles1h] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '4h', 100),
      fetchKlines(symbol, '1h', 48),
    ]);

    const prices4h = candles4h.map((c) => c.close);
    const prices1h = candles1h.map((c) => c.close);
    const volumes1h = candles1h.map((c) => c.volume);

    const currentPrice = ticker.price;
    const levels = findSupportResistance(candles4h);

    // Recent price action analysis
    const recentHigh = Math.max(...prices1h.slice(-24));
    const recentLow = Math.min(...prices1h.slice(-24));
    const avgVolume = volumes1h.reduce((a, b) => a + b, 0) / volumes1h.length;
    const recentVolume = volumes1h.slice(-6).reduce((a, b) => a + b, 0) / 6;

    // Bull trap detection
    const resistanceLevel = levels.resistance[0];
    const nearResistance = resistanceLevel !== undefined && currentPrice >= resistanceLevel * 0.98;
    const lowVolumeBreakout = recentVolume < avgVolume * 0.8;
    const bullTrap = nearResistance && lowVolumeBreakout && ticker.priceChangePercent24h > 3;
    const bullTrapZone = bullTrap ? resistanceLevel : undefined;

    // Bear trap detection
    const supportLevel = levels.support[0];
    const nearSupport = supportLevel !== undefined && currentPrice <= supportLevel * 1.02;
    const bearTrap = nearSupport && lowVolumeBreakout && ticker.priceChangePercent24h < -3;
    const bearTrapZone = bearTrap ? supportLevel : undefined;

    // Liquidity grab zones
    const liquidityGrabZones: number[] = [];
    if (levels.support[0]) liquidityGrabZones.push(roundPrice(levels.support[0] * 0.98));
    if (levels.resistance[0]) liquidityGrabZones.push(roundPrice(levels.resistance[0] * 1.02));

    // Stop hunt zones (just below support, just above resistance)
    const stopHuntZones: number[] = [];
    levels.support.forEach((s) => stopHuntZones.push(roundPrice(s * 0.97)));
    levels.resistance.forEach((r) => stopHuntZones.push(roundPrice(r * 1.03)));

    // Fakeout risk
    let fakeoutRisk: 'low' | 'medium' | 'high' = 'low';
    if (lowVolumeBreakout) fakeoutRisk = 'medium';
    if ((bullTrap || bearTrap) && Math.abs(ticker.priceChangePercent24h) > 5) {
      fakeoutRisk = 'high';
    }

    // Liquidation levels (estimated)
    const longLiquidations: TrapCheckResult['liquidationLevels'] = [
      {
        price: roundPrice(currentPrice * 0.9),
        amountUsd: ticker.quoteVolume24h * 0.1,
        type: 'longs',
      },
      {
        price: roundPrice(currentPrice * 0.85),
        amountUsd: ticker.quoteVolume24h * 0.15,
        type: 'longs',
      },
    ];

    const shortLiquidations: TrapCheckResult['liquidationLevels'] = [
      {
        price: roundPrice(currentPrice * 1.1),
        amountUsd: ticker.quoteVolume24h * 0.08,
        type: 'shorts',
      },
      {
        price: roundPrice(currentPrice * 1.15),
        amountUsd: ticker.quoteVolume24h * 0.12,
        type: 'shorts',
      },
    ];

    // Counter strategies
    const counterStrategy: string[] = [];
    if (bullTrap) {
      counterStrategy.push('Wait for volume confirmation after breakout');
      counterStrategy.push('Do not place stop-loss orders right above resistance');
    }
    if (bearTrap) {
      counterStrategy.push('Do not panic sell');
      counterStrategy.push('Do not place short-term stops below support');
    }
    if (fakeoutRisk !== 'low') {
      counterStrategy.push('Scale into position gradually');
      counterStrategy.push('Wait for confirmation candle');
    }
    counterStrategy.push('Be cautious around liquidity zones');

    // Pro tip
    let proTip = 'Do not trust breakouts without volume confirmation.';
    if (bullTrap) {
      proTip = 'Resistance breakouts with low volume have high bull trap probability.';
    } else if (bearTrap) {
      proTip = 'Support breakdowns often occur with panic selling and frequently form bear traps.';
    }

    // Risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (bullTrap || bearTrap) riskLevel = 'high';
    else if (fakeoutRisk === 'medium') riskLevel = 'medium';

    // Score (inverse of trap risk)
    let score = 8;
    if (bullTrap) score -= 3;
    if (bearTrap) score -= 3;
    if (fakeoutRisk === 'medium') score -= 1;
    if (fakeoutRisk === 'high') score -= 2;
    if (lowVolumeBreakout) score -= 1;
    score = Math.max(1, Math.min(10, score));

    return {
      symbol,
      traps: {
        bullTrap,
        bullTrapZone,
        bearTrap,
        bearTrapZone,
        liquidityGrab: {
          detected: liquidityGrabZones.length > 0,
          zones: liquidityGrabZones,
        },
        stopHuntZones: stopHuntZones.slice(0, 4),
        fakeoutRisk,
      },
      liquidationLevels: [...longLiquidations, ...shortLiquidations],
      counterStrategy,
      proTip,
      riskLevel,
      score,
    };
  },

  // =========================================
  // Step 7: Final Verdict (FREE)
  // =========================================
  async finalVerdict(
    symbol: string,
    allSteps: {
      marketPulse: MarketPulseResult;
      assetScan: AssetScanResult;
      safetyCheck: SafetyCheckResult;
      timing: TimingResult;
      tradePlan: TradePlanResult;
      trapCheck: TrapCheckResult;
    }
  ): Promise<FinalVerdictResult> {
    const { marketPulse, assetScan, safetyCheck, timing, tradePlan, trapCheck } = allSteps;

    // Component scores with weights (matching technical spec)
    const componentScores: FinalVerdictResult['componentScores'] = [
      { step: 'Market Pulse', score: marketPulse.score, weight: 0.15 },
      { step: 'Asset Scanner', score: assetScan.score, weight: 0.20 },
      { step: 'Safety Check', score: safetyCheck.score, weight: 0.20 },
      { step: 'Timing', score: timing.score, weight: 0.15 },
      { step: 'Trade Plan', score: tradePlan.score, weight: 0.15 },
      { step: 'Trap Check', score: trapCheck.score, weight: 0.15 },
    ];

    // Calculate weighted overall score
    const overallScore = parseFloat(
      componentScores
        .reduce((sum, cs) => sum + cs.score * cs.weight, 0)
        .toFixed(1)
    );

    // Confidence factors
    const confidenceFactors: FinalVerdictResult['confidenceFactors'] = [];

    // Market conditions
    if (marketPulse.marketRegime === 'risk_on') {
      confidenceFactors.push({ factor: 'Risk-on market environment', positive: true, impact: 'high' });
    } else if (marketPulse.marketRegime === 'risk_off') {
      confidenceFactors.push({ factor: 'Risk-off market environment', positive: false, impact: 'high' });
    }

    // Trend alignment
    const mainTrend = assetScan.timeframes.find((t) => t.tf === '4H');
    if (mainTrend?.trend === 'bullish' && mainTrend.strength >= 70) {
      confidenceFactors.push({ factor: 'Strong bullish trend', positive: true, impact: 'high' });
    } else if (mainTrend?.trend === 'bearish' && mainTrend.strength >= 70) {
      confidenceFactors.push({ factor: 'Strong bearish trend', positive: false, impact: 'high' });
    }

    // Safety
    if (safetyCheck.riskLevel === 'low') {
      confidenceFactors.push({ factor: 'Low manipulation risk', positive: true, impact: 'medium' });
    } else if (safetyCheck.riskLevel === 'high') {
      confidenceFactors.push({ factor: 'High manipulation risk', positive: false, impact: 'high' });
    }

    // Timing
    if (timing.tradeNow) {
      confidenceFactors.push({ factor: 'Good entry timing', positive: true, impact: 'medium' });
    }

    // RSI
    if (assetScan.indicators.rsi >= 30 && assetScan.indicators.rsi <= 70) {
      confidenceFactors.push({ factor: 'RSI in normal zone', positive: true, impact: 'low' });
    } else if (assetScan.indicators.rsi > 70) {
      confidenceFactors.push({ factor: 'Overbought zone', positive: false, impact: 'medium' });
    } else {
      confidenceFactors.push({ factor: 'Oversold zone', positive: true, impact: 'medium' });
    }

    // Traps
    if (trapCheck.riskLevel === 'high') {
      confidenceFactors.push({ factor: 'High trap risk', positive: false, impact: 'high' });
    }

    // Risk/Reward
    if (tradePlan.riskReward >= 2.5) {
      confidenceFactors.push({ factor: `Good R:R ratio (${tradePlan.riskReward})`, positive: true, impact: 'medium' });
    }

    // Determine verdict
    let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';

    if (overallScore >= 7.5 && safetyCheck.riskLevel !== 'high' && trapCheck.riskLevel !== 'high') {
      verdict = 'go';
    } else if (overallScore >= 6 && safetyCheck.riskLevel !== 'high') {
      verdict = 'conditional_go';
    } else if (overallScore < 4 || safetyCheck.riskLevel === 'high') {
      verdict = 'avoid';
    }

    // Generate recommendation
    let recommendation = '';

    if (verdict === 'go') {
      const targetPrice = tradePlan.takeProfits[1]?.price ?? tradePlan.takeProfits[0]?.price ?? tradePlan.averageEntry;
      recommendation = `Conditions are favorable for ${symbol}. ${tradePlan.direction.toUpperCase()} position can be opened. ` +
        `Entry: $${tradePlan.averageEntry}, Stop: $${tradePlan.stopLoss.price}, ` +
        `Target: $${targetPrice}. ` +
        `Risk: ${tradePlan.positionSizePercent.toFixed(1)}% of portfolio.`;
    } else if (verdict === 'conditional_go') {
      recommendation = `Cautious approach recommended for ${symbol}. ` +
        `${timing.waitFor ? 'Wait for ' + timing.waitFor.event + '. ' : ''}` +
        `If opening position, start small and scale in gradually.`;
    } else if (verdict === 'wait') {
      recommendation = `Waiting recommended for ${symbol}. ` +
        `${timing.waitFor ? 'Wait for ' + timing.waitFor.event + '. ' : 'Wait for better conditions. '}` +
        `Current score: ${overallScore}/10.`;
    } else {
      recommendation = `Opening position not recommended for ${symbol}. ` +
        `${safetyCheck.riskLevel === 'high' ? 'High manipulation risk. ' : ''}` +
        `${trapCheck.riskLevel === 'high' ? 'Trap risk present. ' : ''}` +
        `Wait until conditions improve.`;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      overallScore,
      verdict,
      componentScores,
      confidenceFactors,
      recommendation,
      analysisId: `analysis_${Date.now()}_${symbol}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  },
};

export default analysisEngine;
