// ===========================================
// Coin Score Cache Service
// Periodic scanning of top coins for reliability scores
// ===========================================

import { PrismaClient } from '@prisma/client';
import { IndicatorsService, OHLCV } from './indicators.service';
import { smartCoinsService } from './smart-coins.service';

const prisma = new PrismaClient();
const indicatorsService = new IndicatorsService();

// Binance API base URL
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Top coins to scan (prioritized list)
const TOP_COINS_TO_SCAN = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'SHIB', 'LTC', 'UNI', 'ATOM', 'XLM', 'NEAR', 'APT', 'ARB', 'OP',
  'FIL', 'INJ', 'SUI', 'SEI', 'TIA', 'IMX', 'RENDER', 'FET', 'TAO', 'WIF',
];

// Cache expiry time (2 hours)
const CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;

// Rate limiting
const SCAN_DELAY_MS = 500; // Delay between coin scans

export interface CoinScore {
  symbol: string;
  totalScore: number;
  reliabilityScore: number;
  liquidityScore: number;
  volatilityScore: number;
  trendScore: number;
  momentumScore: number;
  verdict: string;
  direction: string | null;
  confidence: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  analysisId: string | null;
  interval: string;
  scannedAt: Date;
  expiresAt: Date;
}

export interface QuickScanResult {
  symbol: string;
  success: boolean;
  score?: CoinScore;
  error?: string;
}

// ===========================================
// Binance API Helper Functions
// ===========================================

async function fetchKlines(symbol: string, interval: string = '4h', limit: number = 100): Promise<OHLCV[]> {
  try {
    const url = `${BINANCE_BASE_URL}/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((candle: any[]) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  } catch (error) {
    console.error(`[CoinScoreCache] Failed to fetch klines for ${symbol}:`, error);
    return [];
  }
}

async function fetch24hTicker(symbol: string): Promise<{ price: number; priceChange24h: number; volume24h: number; quoteVolume: number } | null> {
  try {
    const url = `${BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}USDT`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      price: parseFloat(data.lastPrice),
      priceChange24h: parseFloat(data.priceChangePercent),
      volume24h: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    };
  } catch (error) {
    console.error(`[CoinScoreCache] Failed to fetch ticker for ${symbol}:`, error);
    return null;
  }
}

// ===========================================
// Score Calculation Functions
// ===========================================

function calculateLiquidityScore(volume24h: number, marketCap: number): number {
  // Volume/MarketCap ratio - higher is better (more liquid)
  // Good ratio: > 0.1 (10%), Excellent: > 0.2 (20%)
  if (marketCap === 0) return 50;

  const ratio = volume24h / marketCap;

  if (ratio >= 0.3) return 100;
  if (ratio >= 0.2) return 90;
  if (ratio >= 0.15) return 80;
  if (ratio >= 0.1) return 70;
  if (ratio >= 0.05) return 60;
  if (ratio >= 0.02) return 50;
  if (ratio >= 0.01) return 40;
  return 30;
}

function calculateVolatilityScore(candles: OHLCV[]): number {
  // ATR-based volatility - lower volatility = higher stability score
  // For reliability, we want stable coins (lower ATR %)
  if (candles.length < 14) return 50;

  // Calculate ATR
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trueRanges.push(tr);
  }

  const atr = trueRanges.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const currentPrice = candles[candles.length - 1].close;
  const atrPercent = (atr / currentPrice) * 100;

  // Lower ATR% = higher score (more stable)
  if (atrPercent <= 1) return 95;
  if (atrPercent <= 2) return 85;
  if (atrPercent <= 3) return 75;
  if (atrPercent <= 5) return 65;
  if (atrPercent <= 7) return 55;
  if (atrPercent <= 10) return 45;
  return 35;
}

function calculateTrendScore(candles: OHLCV[]): number {
  // MA convergence - aligned MAs = strong trend = higher score
  if (candles.length < 50) return 50;

  const closes = candles.map(c => c.close);

  // Calculate SMAs
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const currentPrice = closes[closes.length - 1];

  let score = 50;

  // Price above both MAs = bullish, score boost
  if (currentPrice > sma20 && currentPrice > sma50) {
    score += 20;
  } else if (currentPrice < sma20 && currentPrice < sma50) {
    score += 15; // Clear bearish trend is also tradeable
  }

  // MA alignment (20 > 50 = bullish, 20 < 50 = bearish)
  const maAligned = (sma20 > sma50 && currentPrice > sma20) || (sma20 < sma50 && currentPrice < sma20);
  if (maAligned) {
    score += 15;
  }

  // Trend strength (distance from MAs)
  const distanceFromSma20 = Math.abs((currentPrice - sma20) / sma20) * 100;
  if (distanceFromSma20 < 1) {
    score += 5; // Price near MA - potential breakout
  } else if (distanceFromSma20 > 10) {
    score -= 10; // Extended - potential reversion
  }

  return Math.min(100, Math.max(0, score));
}

function calculateMomentumScore(candles: OHLCV[]): number {
  if (candles.length < 26) return 50;

  const closes = candles.map(c => c.close);

  // RSI Calculation
  const rsiPeriod = 14;
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i <= rsiPeriod && i < closes.length; i++) {
    const change = closes[closes.length - i] - closes[closes.length - i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  const avgGain = gains.reduce((a, b) => a + b, 0) / rsiPeriod;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / rsiPeriod;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  let score = 50;

  // RSI scoring - not too high, not too low
  if (rsi >= 40 && rsi <= 60) {
    score += 20; // Neutral RSI - room for movement
  } else if (rsi >= 30 && rsi <= 70) {
    score += 10; // Normal range
  } else if (rsi < 30) {
    score += 5; // Oversold - potential bounce
  } else if (rsi > 70) {
    score -= 5; // Overbought - potential drop
  }

  // MACD trend confirmation
  const ema12 = calculateEMA(closes.slice(-26), 12);
  const ema26 = calculateEMA(closes.slice(-26), 26);
  const macd = ema12 - ema26;
  const prevMacd = calculateEMA(closes.slice(-27, -1), 12) - calculateEMA(closes.slice(-27, -1), 26);

  if ((macd > 0 && macd > prevMacd) || (macd < 0 && macd < prevMacd)) {
    score += 15; // Momentum increasing in trend direction
  }

  return Math.min(100, Math.max(0, score));
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

function determineVerdict(totalScore: number): { verdict: string; direction: string | null } {
  if (totalScore >= 75) {
    return { verdict: 'GO', direction: 'LONG' };
  } else if (totalScore >= 60) {
    return { verdict: 'CONDITIONAL_GO', direction: 'LONG' };
  } else if (totalScore >= 45) {
    return { verdict: 'WAIT', direction: null };
  } else {
    return { verdict: 'AVOID', direction: null };
  }
}

// ===========================================
// Main Service Class
// ===========================================

class CoinScoreCacheService {
  /**
   * Quick scan a single coin
   */
  async quickScan(symbol: string, interval: string = '4h'): Promise<QuickScanResult> {
    try {
      console.log(`[CoinScoreCache] Scanning ${symbol}...`);

      // Fetch data in parallel
      const [candles, ticker, marketData] = await Promise.all([
        fetchKlines(symbol, interval, 100),
        fetch24hTicker(symbol),
        this.getMarketData(symbol),
      ]);

      if (candles.length < 50 || !ticker) {
        return { symbol, success: false, error: 'Insufficient data' };
      }

      // Calculate scores
      const liquidityScore = calculateLiquidityScore(ticker.quoteVolume, marketData?.marketCap || ticker.quoteVolume * 10);
      const volatilityScore = calculateVolatilityScore(candles);
      const trendScore = calculateTrendScore(candles);
      const momentumScore = calculateMomentumScore(candles);

      // Reliability score (weighted average)
      const reliabilityScore = Math.round(
        liquidityScore * 0.25 +
        volatilityScore * 0.25 +
        trendScore * 0.25 +
        momentumScore * 0.25
      );

      // Total score (same as reliability for now)
      const totalScore = reliabilityScore;

      // Determine verdict
      const { verdict, direction } = determineVerdict(totalScore);
      const confidence = Math.min(10, Math.max(1, Math.round(totalScore / 10)));

      const score: CoinScore = {
        symbol,
        totalScore,
        reliabilityScore,
        liquidityScore,
        volatilityScore,
        trendScore,
        momentumScore,
        verdict,
        direction,
        confidence,
        price: ticker.price,
        priceChange24h: ticker.priceChange24h,
        volume24h: ticker.quoteVolume,
        marketCap: marketData?.marketCap || 0,
        analysisId: null,
        interval,
        scannedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_EXPIRY_MS),
      };

      return { symbol, success: true, score };
    } catch (error) {
      console.error(`[CoinScoreCache] Error scanning ${symbol}:`, error);
      return { symbol, success: false, error: String(error) };
    }
  }

  /**
   * Get market data from CoinGecko (market cap mainly)
   */
  private async getMarketData(symbol: string): Promise<{ marketCap: number } | null> {
    try {
      const smartCoins = await smartCoinsService.getSmartCoins();
      const allCoins = [
        ...smartCoins.topMarketCap,
        ...smartCoins.trending,
        ...smartCoins.gainers,
        ...smartCoins.losers,
        ...smartCoins.highVolume,
      ];

      const coin = allCoins.find(c => c.symbol === symbol);
      if (coin) {
        return { marketCap: coin.marketCap };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Scan all top coins and update cache
   */
  async scanAllCoins(interval: string = '4h'): Promise<{ success: number; failed: number; results: CoinScore[] }> {
    console.log(`[CoinScoreCache] Starting scan of ${TOP_COINS_TO_SCAN.length} coins...`);

    const results: CoinScore[] = [];
    let success = 0;
    let failed = 0;

    for (const symbol of TOP_COINS_TO_SCAN) {
      const result = await this.quickScan(symbol, interval);

      if (result.success && result.score) {
        results.push(result.score);
        success++;

        // Save to database
        try {
          await prisma.coinScoreCache.upsert({
            where: { symbol },
            create: {
              symbol: result.score.symbol,
              totalScore: result.score.totalScore,
              reliabilityScore: result.score.reliabilityScore,
              liquidityScore: result.score.liquidityScore,
              volatilityScore: result.score.volatilityScore,
              trendScore: result.score.trendScore,
              momentumScore: result.score.momentumScore,
              verdict: result.score.verdict,
              direction: result.score.direction,
              confidence: result.score.confidence,
              price: result.score.price,
              priceChange24h: result.score.priceChange24h,
              volume24h: result.score.volume24h,
              marketCap: result.score.marketCap,
              analysisId: result.score.analysisId,
              interval: result.score.interval,
              scannedAt: result.score.scannedAt,
              expiresAt: result.score.expiresAt,
            },
            update: {
              totalScore: result.score.totalScore,
              reliabilityScore: result.score.reliabilityScore,
              liquidityScore: result.score.liquidityScore,
              volatilityScore: result.score.volatilityScore,
              trendScore: result.score.trendScore,
              momentumScore: result.score.momentumScore,
              verdict: result.score.verdict,
              direction: result.score.direction,
              confidence: result.score.confidence,
              price: result.score.price,
              priceChange24h: result.score.priceChange24h,
              volume24h: result.score.volume24h,
              marketCap: result.score.marketCap,
              analysisId: result.score.analysisId,
              interval: result.score.interval,
              scannedAt: result.score.scannedAt,
              expiresAt: result.score.expiresAt,
            },
          });
        } catch (dbError) {
          console.error(`[CoinScoreCache] Failed to save ${symbol} to database:`, dbError);
        }
      } else {
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, SCAN_DELAY_MS));
    }

    console.log(`[CoinScoreCache] Scan complete. Success: ${success}, Failed: ${failed}`);
    return { success, failed, results };
  }

  /**
   * Get top coins by reliability score from cache
   */
  async getTopCoinsByScore(limit: number = 5, sortBy: 'reliabilityScore' | 'totalScore' = 'reliabilityScore'): Promise<CoinScore[]> {
    try {
      const coins = await prisma.coinScoreCache.findMany({
        where: {
          expiresAt: { gt: new Date() },
        },
        orderBy: { [sortBy]: 'desc' },
        take: limit,
      });

      return coins.map(coin => ({
        symbol: coin.symbol,
        totalScore: Number(coin.totalScore),
        reliabilityScore: Number(coin.reliabilityScore),
        liquidityScore: Number(coin.liquidityScore),
        volatilityScore: Number(coin.volatilityScore),
        trendScore: Number(coin.trendScore),
        momentumScore: Number(coin.momentumScore),
        verdict: coin.verdict,
        direction: coin.direction,
        confidence: Number(coin.confidence),
        price: Number(coin.price),
        priceChange24h: Number(coin.priceChange24h),
        volume24h: Number(coin.volume24h),
        marketCap: Number(coin.marketCap),
        analysisId: coin.analysisId,
        interval: coin.interval,
        scannedAt: coin.scannedAt,
        expiresAt: coin.expiresAt,
      }));
    } catch (error) {
      console.error('[CoinScoreCache] Error fetching top coins:', error);
      return [];
    }
  }

  /**
   * Get top coins with GO or CONDITIONAL_GO verdict
   */
  async getTopTradeableCoins(limit: number = 5): Promise<CoinScore[]> {
    try {
      const coins = await prisma.coinScoreCache.findMany({
        where: {
          expiresAt: { gt: new Date() },
          verdict: { in: ['GO', 'CONDITIONAL_GO'] },
        },
        orderBy: { reliabilityScore: 'desc' },
        take: limit,
      });

      return coins.map(coin => ({
        symbol: coin.symbol,
        totalScore: Number(coin.totalScore),
        reliabilityScore: Number(coin.reliabilityScore),
        liquidityScore: Number(coin.liquidityScore),
        volatilityScore: Number(coin.volatilityScore),
        trendScore: Number(coin.trendScore),
        momentumScore: Number(coin.momentumScore),
        verdict: coin.verdict,
        direction: coin.direction,
        confidence: Number(coin.confidence),
        price: Number(coin.price),
        priceChange24h: Number(coin.priceChange24h),
        volume24h: Number(coin.volume24h),
        marketCap: Number(coin.marketCap),
        analysisId: coin.analysisId,
        interval: coin.interval,
        scannedAt: coin.scannedAt,
        expiresAt: coin.expiresAt,
      }));
    } catch (error) {
      console.error('[CoinScoreCache] Error fetching tradeable coins:', error);
      return [];
    }
  }

  /**
   * Check if cache is stale and needs refresh
   */
  async isCacheStale(): Promise<boolean> {
    try {
      const latestScan = await prisma.coinScoreCache.findFirst({
        orderBy: { scannedAt: 'desc' },
      });

      if (!latestScan) return true;

      const staleDuration = Date.now() - latestScan.scannedAt.getTime();
      return staleDuration > CACHE_EXPIRY_MS;
    } catch {
      return true;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalCoins: number; freshCoins: number; staleCoins: number; lastScanAt: Date | null }> {
    try {
      const [total, fresh] = await Promise.all([
        prisma.coinScoreCache.count(),
        prisma.coinScoreCache.count({ where: { expiresAt: { gt: new Date() } } }),
      ]);

      const latestScan = await prisma.coinScoreCache.findFirst({
        orderBy: { scannedAt: 'desc' },
        select: { scannedAt: true },
      });

      return {
        totalCoins: total,
        freshCoins: fresh,
        staleCoins: total - fresh,
        lastScanAt: latestScan?.scannedAt || null,
      };
    } catch {
      return { totalCoins: 0, freshCoins: 0, staleCoins: 0, lastScanAt: null };
    }
  }
}

export const coinScoreCacheService = new CoinScoreCacheService();
