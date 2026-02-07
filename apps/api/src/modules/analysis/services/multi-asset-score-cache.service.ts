// ===========================================
// Multi-Asset Score Cache Service
// Periodic scanning of Stocks, Bonds, Metals using Yahoo Finance
// Same workflow as CoinScoreCache but for traditional markets
// ===========================================

import { prisma } from '../../../core/database';

// ===========================================
// Asset Lists for Each Market
// ===========================================

export const STOCKS_TO_SCAN = [
  // Major Tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'INTC', 'CRM',
  // Major ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'VOO',
  // Finance
  'JPM', 'BAC', 'GS', 'V', 'MA',
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'OXY',
];

export const BONDS_TO_SCAN = [
  // US Treasury ETFs
  'TLT',   // 20+ Year Treasury
  'IEF',   // 7-10 Year Treasury
  'SHY',   // 1-3 Year Treasury
  'TIP',   // TIPS (Inflation Protected)
  'GOVT',  // US Treasuries
  // Corporate Bond ETFs
  'LQD',   // Investment Grade Corporate
  'HYG',   // High Yield Corporate
  'JNK',   // High Yield
  'VCIT',  // Intermediate-Term Corporate
  'VCSH',  // Short-Term Corporate
  // Aggregate Bond ETFs
  'BND',   // Total Bond Market
  'AGG',   // US Aggregate Bond
  'BNDX',  // International Bond
  // Municipal Bonds
  'MUB',   // Municipal Bond
  'VTEB',  // Tax-Exempt Municipal
];

export const METALS_TO_SCAN = [
  // Gold
  'GLD',   // Gold Trust
  'IAU',   // Gold Trust
  'GDX',   // Gold Miners
  'GDXJ',  // Junior Gold Miners
  'GOLD',  // Barrick Gold
  'NEM',   // Newmont Mining
  // Silver
  'SLV',   // Silver Trust
  'SIVR',  // Physical Silver
  'SIL',   // Silver Miners
  // Platinum/Palladium
  'PPLT',  // Platinum Trust
  'PALL',  // Palladium Trust
  // Broad Metals
  'DBB',   // Base Metals
  'CPER',  // Copper
  'COPX',  // Copper Miners
];

// Market type
export type MarketType = 'stocks' | 'bonds' | 'metals';

// Cache expiry time (2 hours)
const CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;

// Rate limiting between analyses
const ANALYSIS_DELAY_MS = 3000; // 3 seconds between each asset

// Scan session tracking per market
interface ScanSession {
  isScanning: boolean;
  assetsAnalyzed: number;
  totalAssets: number;
  startedAt: Date | null;
  lastAnalyzedAsset: string | null;
  market: MarketType | null;
}

// Global scan states per market
const scanSessions: Record<MarketType, ScanSession> = {
  stocks: { isScanning: false, assetsAnalyzed: 0, totalAssets: STOCKS_TO_SCAN.length, startedAt: null, lastAnalyzedAsset: null, market: 'stocks' },
  bonds: { isScanning: false, assetsAnalyzed: 0, totalAssets: BONDS_TO_SCAN.length, startedAt: null, lastAnalyzedAsset: null, market: 'bonds' },
  metals: { isScanning: false, assetsAnalyzed: 0, totalAssets: METALS_TO_SCAN.length, startedAt: null, lastAnalyzedAsset: null, market: 'metals' },
};

export interface AssetScore {
  symbol: string;
  market: MarketType;
  name: string;
  totalScore: number;
  reliabilityScore: number;
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  volumeScore: number;
  verdict: string;
  direction: string | null;
  confidence: number;
  price: number;
  priceChange1d: number;
  priceChange5d: number;
  priceChange1m: number;
  volume: number;
  avgVolume: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
  analysisId: string | null;
  scannedAt: Date;
  expiresAt: Date;
}

export interface AssetAnalysisResult {
  symbol: string;
  success: boolean;
  score?: AssetScore;
  analysisId?: string;
  error?: string;
}

// ===========================================
// Yahoo Finance Data Fetching
// ===========================================

interface YahooQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  averageDailyVolume10Day: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface YahooHistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const quote = data?.quoteResponse?.result?.[0];

    if (!quote) {
      return null;
    }

    return {
      symbol: quote.symbol,
      shortName: quote.shortName || quote.longName || symbol,
      regularMarketPrice: quote.regularMarketPrice || 0,
      regularMarketChange: quote.regularMarketChange || 0,
      regularMarketChangePercent: quote.regularMarketChangePercent || 0,
      regularMarketVolume: quote.regularMarketVolume || 0,
      averageDailyVolume10Day: quote.averageDailyVolume10Day || quote.averageDailyVolume3Month || 0,
      fiftyDayAverage: quote.fiftyDayAverage || 0,
      twoHundredDayAverage: quote.twoHundredDayAverage || 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
    };
  } catch (error) {
    console.error(`[MultiAssetCache] Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

async function fetchYahooHistory(symbol: string, days: number = 60): Promise<YahooHistoricalData[]> {
  try {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - (days * 24 * 60 * 60);

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance history API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp) {
      return [];
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0];

    if (!quotes) {
      return [];
    }

    const history: YahooHistoricalData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.close[i] !== null) {
        history.push({
          date: new Date(timestamps[i] * 1000),
          open: quotes.open[i] || quotes.close[i],
          high: quotes.high[i] || quotes.close[i],
          low: quotes.low[i] || quotes.close[i],
          close: quotes.close[i],
          volume: quotes.volume[i] || 0,
        });
      }
    }

    return history;
  } catch (error) {
    console.error(`[MultiAssetCache] Error fetching history for ${symbol}:`, error);
    return [];
  }
}

// ===========================================
// Technical Analysis Functions
// ===========================================

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
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
  return 100 - (100 / (1 + rs));
}

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;

  // Simplified signal line
  const signal = macd * 0.9;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function calculateATR(history: YahooHistoricalData[], period: number = 14): number {
  if (history.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const high = history[i].high;
    const low = history[i].low;
    const prevClose = history[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges.slice(-period), period);
}

function determineTrend(price: number, sma50: number, sma200: number): 'bullish' | 'bearish' | 'neutral' {
  const aboveSma50 = price > sma50;
  const aboveSma200 = price > sma200;
  const sma50AboveSma200 = sma50 > sma200;

  if (aboveSma50 && aboveSma200 && sma50AboveSma200) return 'bullish';
  if (!aboveSma50 && !aboveSma200 && !sma50AboveSma200) return 'bearish';
  return 'neutral';
}

// ===========================================
// Score Calculation Functions
// ===========================================

function calculateTrendScore(price: number, sma50: number, sma200: number, priceChange1m: number): number {
  let score = 50;

  // Price vs moving averages
  if (price > sma50) score += 10;
  if (price > sma200) score += 10;
  if (sma50 > sma200) score += 10; // Golden cross setup

  // Monthly momentum
  if (priceChange1m > 5) score += 15;
  else if (priceChange1m > 2) score += 10;
  else if (priceChange1m > 0) score += 5;
  else if (priceChange1m < -5) score -= 10;

  return Math.min(100, Math.max(0, score));
}

function calculateMomentumScore(rsi: number, macdHistogram: number): number {
  let score = 50;

  // RSI scoring
  if (rsi >= 40 && rsi <= 60) score += 15; // Neutral - room for movement
  else if (rsi >= 30 && rsi <= 70) score += 10;
  else if (rsi < 30) score += 5; // Oversold - potential reversal
  else score -= 5; // Overbought

  // MACD momentum
  if (macdHistogram > 0) score += 15;
  else if (macdHistogram < 0) score -= 5;

  return Math.min(100, Math.max(0, score));
}

function calculateVolatilityScore(atrPercent: number): number {
  // Lower volatility = more stable = higher score for reliability
  if (atrPercent <= 1) return 95;
  if (atrPercent <= 2) return 85;
  if (atrPercent <= 3) return 75;
  if (atrPercent <= 4) return 65;
  if (atrPercent <= 5) return 55;
  if (atrPercent <= 7) return 45;
  return 35;
}

function calculateVolumeScore(currentVolume: number, avgVolume: number): number {
  if (avgVolume === 0) return 50;

  const volumeRatio = currentVolume / avgVolume;

  if (volumeRatio >= 2) return 95;
  if (volumeRatio >= 1.5) return 85;
  if (volumeRatio >= 1.2) return 75;
  if (volumeRatio >= 1) return 65;
  if (volumeRatio >= 0.8) return 55;
  return 45;
}

function determineVerdict(totalScore: number, trend: string, rsi: number): string {
  // Check for extreme RSI conditions
  if (rsi > 80) return 'AVOID'; // Overbought
  if (rsi < 20) return 'WAIT'; // Oversold - wait for confirmation

  if (totalScore >= 70 && trend === 'bullish') return 'GO';
  if (totalScore >= 60) return 'CONDITIONAL_GO';
  if (totalScore >= 45) return 'WAIT';
  return 'AVOID';
}

// ===========================================
// Main Service Class
// ===========================================

class MultiAssetScoreCacheService {
  private systemUserId: string | null = null;

  /**
   * Get or create a system user ID for platform-generated analyses
   */
  private async getSystemUserId(): Promise<string> {
    if (this.systemUserId) return this.systemUserId;

    try {
      const adminUser = await prisma.user.findFirst({
        where: { isAdmin: true },
        select: { id: true },
      });

      if (adminUser) {
        this.systemUserId = adminUser.id;
        return adminUser.id;
      }

      const anyUser = await prisma.user.findFirst({
        select: { id: true },
      });

      if (anyUser) {
        this.systemUserId = anyUser.id;
        return anyUser.id;
      }

      throw new Error('No users found in the database');
    } catch (error) {
      console.error('[MultiAssetCache] Error getting system user ID:', error);
      throw error;
    }
  }

  /**
   * Get assets list for a market
   */
  getAssetsForMarket(market: MarketType): string[] {
    switch (market) {
      case 'stocks': return STOCKS_TO_SCAN;
      case 'bonds': return BONDS_TO_SCAN;
      case 'metals': return METALS_TO_SCAN;
      default: return [];
    }
  }

  /**
   * Run analysis for a single asset
   */
  async runAssetAnalysis(symbol: string, market: MarketType): Promise<AssetAnalysisResult> {
    try {
      console.log(`[MultiAssetCache] Running analysis for ${symbol} (${market})...`);

      // Fetch quote and history in parallel
      const [quote, history] = await Promise.all([
        fetchYahooQuote(symbol),
        fetchYahooHistory(symbol, 60),
      ]);

      if (!quote || history.length < 20) {
        return { symbol, success: false, error: 'Insufficient data from Yahoo Finance' };
      }

      const closes = history.map(h => h.close);

      // Calculate indicators
      const rsi = calculateRSI(closes);
      const macd = calculateMACD(closes);
      const atr = calculateATR(history);
      const atrPercent = (atr / quote.regularMarketPrice) * 100;

      const sma50 = quote.fiftyDayAverage || calculateSMA(closes, 50);
      const sma200 = quote.twoHundredDayAverage || calculateSMA(closes, Math.min(200, closes.length));

      // Calculate price changes
      const priceChange5d = closes.length >= 5
        ? ((closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5]) * 100
        : 0;
      const priceChange1m = closes.length >= 22
        ? ((closes[closes.length - 1] - closes[closes.length - 22]) / closes[closes.length - 22]) * 100
        : 0;

      // Calculate scores
      const trendScore = calculateTrendScore(quote.regularMarketPrice, sma50, sma200, priceChange1m);
      const momentumScore = calculateMomentumScore(rsi, macd.histogram);
      const volatilityScore = calculateVolatilityScore(atrPercent);
      const volumeScore = calculateVolumeScore(quote.regularMarketVolume, quote.averageDailyVolume10Day);

      // Reliability score (weighted average)
      const reliabilityScore = Math.round(
        trendScore * 0.30 +
        momentumScore * 0.25 +
        volatilityScore * 0.25 +
        volumeScore * 0.20
      );

      const totalScore = reliabilityScore;

      // Determine trend and verdict
      const trend = determineTrend(quote.regularMarketPrice, sma50, sma200);
      const verdict = determineVerdict(totalScore, trend, rsi);
      const direction = trend === 'bullish' ? 'LONG' : trend === 'bearish' ? 'SHORT' : null;
      const confidence = Math.min(10, Math.max(1, Math.round(reliabilityScore / 10)));

      // Get system user ID
      const systemUserId = await this.getSystemUserId();

      // Save to Analysis table
      const analysisRecord = await prisma.analysis.create({
        data: {
          userId: systemUserId,
          symbol: symbol,
          interval: '1d', // Daily timeframe for traditional assets
          method: 'classic',
          stepsCompleted: [1, 2, 3, 4],
          step1Result: {
            market,
            globalConditions: 'traditional_market',
            liquidityBias: trend === 'bullish' ? 'risk_on' : trend === 'bearish' ? 'risk_off' : 'neutral',
          } as object,
          step2Result: {
            symbol,
            market,
            currentPrice: quote.regularMarketPrice,
            trendDirection: trend,
            trendStrength: trendScore,
            overallScore: totalScore,
            indicators: {
              rsi,
              macd,
              atr,
              atrPercent,
              sma50,
              sma200,
            },
          } as object,
          step3Result: {
            gate: { canProceed: verdict !== 'AVOID' },
            riskLevel: volatilityScore > 60 ? 'low' : volatilityScore > 40 ? 'medium' : 'high',
          } as object,
          step4Result: {
            gate: { canProceed: verdict !== 'WAIT' },
            timingQuality: momentumScore > 60 ? 'good' : momentumScore > 40 ? 'moderate' : 'poor',
          } as object,
          totalScore: reliabilityScore,
          creditsSpent: 0,
        },
      });

      const score: AssetScore = {
        symbol,
        market,
        name: quote.shortName,
        totalScore,
        reliabilityScore,
        trendScore,
        momentumScore,
        volatilityScore,
        volumeScore,
        verdict,
        direction,
        confidence,
        price: quote.regularMarketPrice,
        priceChange1d: quote.regularMarketChangePercent,
        priceChange5d,
        priceChange1m,
        volume: quote.regularMarketVolume,
        avgVolume: quote.averageDailyVolume10Day,
        fiftyDayAvg: sma50,
        twoHundredDayAvg: sma200,
        analysisId: analysisRecord.id,
        scannedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_EXPIRY_MS),
      };

      console.log(`[MultiAssetCache] ${symbol} analysis complete. Score: ${reliabilityScore}, Verdict: ${verdict}`);

      return { symbol, success: true, score, analysisId: analysisRecord.id };
    } catch (error) {
      console.error(`[MultiAssetCache] Error analyzing ${symbol}:`, error);
      return { symbol, success: false, error: String(error) };
    }
  }

  /**
   * Get scan session state for a market
   */
  getScanSession(market: MarketType): ScanSession {
    return { ...scanSessions[market] };
  }

  /**
   * Scan all assets in a market
   */
  async scanMarket(market: MarketType): Promise<{ success: number; failed: number; results: AssetScore[] }> {
    const assets = this.getAssetsForMarket(market);

    // Prevent multiple simultaneous scans for same market
    if (scanSessions[market].isScanning) {
      console.log(`[MultiAssetCache] ${market} scan already in progress, skipping...`);
      return { success: 0, failed: 0, results: [] };
    }

    // Initialize scan session
    scanSessions[market] = {
      isScanning: true,
      assetsAnalyzed: 0,
      totalAssets: assets.length,
      startedAt: new Date(),
      lastAnalyzedAsset: null,
      market,
    };

    console.log(`[MultiAssetCache] Starting ${market} scan of ${assets.length} assets...`);
    console.log(`[MultiAssetCache] Estimated time: ${(assets.length * ANALYSIS_DELAY_MS / 1000 / 60).toFixed(1)} minutes`);

    const results: AssetScore[] = [];
    let success = 0;
    let failed = 0;

    for (const symbol of assets) {
      const result = await this.runAssetAnalysis(symbol, market);

      // Update scan progress
      scanSessions[market].assetsAnalyzed++;
      scanSessions[market].lastAnalyzedAsset = symbol;

      if (result.success && result.score) {
        results.push(result.score);
        success++;

        // Save to cache table
        try {
          await prisma.assetScoreCache.upsert({
            where: { symbol_market: { symbol, market } },
            create: {
              symbol: result.score.symbol,
              market: result.score.market,
              name: result.score.name,
              totalScore: result.score.totalScore,
              reliabilityScore: result.score.reliabilityScore,
              trendScore: result.score.trendScore,
              momentumScore: result.score.momentumScore,
              volatilityScore: result.score.volatilityScore,
              volumeScore: result.score.volumeScore,
              verdict: result.score.verdict,
              direction: result.score.direction,
              confidence: result.score.confidence,
              price: result.score.price,
              priceChange1d: result.score.priceChange1d,
              priceChange5d: result.score.priceChange5d,
              priceChange1m: result.score.priceChange1m,
              volume: result.score.volume,
              avgVolume: result.score.avgVolume,
              fiftyDayAvg: result.score.fiftyDayAvg,
              twoHundredDayAvg: result.score.twoHundredDayAvg,
              analysisId: result.score.analysisId,
              scannedAt: result.score.scannedAt,
              expiresAt: result.score.expiresAt,
            },
            update: {
              name: result.score.name,
              totalScore: result.score.totalScore,
              reliabilityScore: result.score.reliabilityScore,
              trendScore: result.score.trendScore,
              momentumScore: result.score.momentumScore,
              volatilityScore: result.score.volatilityScore,
              volumeScore: result.score.volumeScore,
              verdict: result.score.verdict,
              direction: result.score.direction,
              confidence: result.score.confidence,
              price: result.score.price,
              priceChange1d: result.score.priceChange1d,
              priceChange5d: result.score.priceChange5d,
              priceChange1m: result.score.priceChange1m,
              volume: result.score.volume,
              avgVolume: result.score.avgVolume,
              fiftyDayAvg: result.score.fiftyDayAvg,
              twoHundredDayAvg: result.score.twoHundredDayAvg,
              analysisId: result.score.analysisId,
              scannedAt: result.score.scannedAt,
              expiresAt: result.score.expiresAt,
            },
          });
        } catch (dbError) {
          console.error(`[MultiAssetCache] Failed to cache ${symbol}:`, dbError);
        }
      } else {
        failed++;
        console.error(`[MultiAssetCache] Failed to analyze ${symbol}: ${result.error}`);
      }

      // Rate limiting
      if (assets.indexOf(symbol) < assets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, ANALYSIS_DELAY_MS));
      }
    }

    // Reset scan session when done
    scanSessions[market] = {
      isScanning: false,
      assetsAnalyzed: assets.length,
      totalAssets: assets.length,
      startedAt: scanSessions[market].startedAt,
      lastAnalyzedAsset: assets[assets.length - 1],
      market,
    };

    console.log(`[MultiAssetCache] ${market} scan complete. Success: ${success}, Failed: ${failed}`);
    return { success, failed, results };
  }

  /**
   * Get top assets by reliability score from cache
   */
  async getTopAssetsByScore(market: MarketType, limit: number = 5): Promise<AssetScore[]> {
    try {
      const assets = await prisma.assetScoreCache.findMany({
        where: {
          market,
          expiresAt: { gt: new Date() },
        },
        orderBy: { reliabilityScore: 'desc' },
        take: limit,
      });

      return assets.map(asset => ({
        symbol: asset.symbol,
        market: asset.market as MarketType,
        name: asset.name,
        totalScore: Number(asset.totalScore),
        reliabilityScore: Number(asset.reliabilityScore),
        trendScore: Number(asset.trendScore),
        momentumScore: Number(asset.momentumScore),
        volatilityScore: Number(asset.volatilityScore),
        volumeScore: Number(asset.volumeScore),
        verdict: asset.verdict,
        direction: asset.direction,
        confidence: Number(asset.confidence),
        price: Number(asset.price),
        priceChange1d: Number(asset.priceChange1d),
        priceChange5d: Number(asset.priceChange5d),
        priceChange1m: Number(asset.priceChange1m),
        volume: Number(asset.volume),
        avgVolume: Number(asset.avgVolume),
        fiftyDayAvg: Number(asset.fiftyDayAvg),
        twoHundredDayAvg: Number(asset.twoHundredDayAvg),
        analysisId: asset.analysisId,
        scannedAt: asset.scannedAt,
        expiresAt: asset.expiresAt,
      }));
    } catch (error) {
      console.error(`[MultiAssetCache] Error fetching top ${market}:`, error);
      return [];
    }
  }

  /**
   * Get top tradeable assets (GO or CONDITIONAL_GO)
   */
  async getTopTradeableAssets(market: MarketType, limit: number = 5): Promise<AssetScore[]> {
    try {
      const assets = await prisma.assetScoreCache.findMany({
        where: {
          market,
          expiresAt: { gt: new Date() },
          verdict: { in: ['GO', 'CONDITIONAL_GO'] },
        },
        orderBy: { reliabilityScore: 'desc' },
        take: limit,
      });

      return assets.map(asset => ({
        symbol: asset.symbol,
        market: asset.market as MarketType,
        name: asset.name,
        totalScore: Number(asset.totalScore),
        reliabilityScore: Number(asset.reliabilityScore),
        trendScore: Number(asset.trendScore),
        momentumScore: Number(asset.momentumScore),
        volatilityScore: Number(asset.volatilityScore),
        volumeScore: Number(asset.volumeScore),
        verdict: asset.verdict,
        direction: asset.direction,
        confidence: Number(asset.confidence),
        price: Number(asset.price),
        priceChange1d: Number(asset.priceChange1d),
        priceChange5d: Number(asset.priceChange5d),
        priceChange1m: Number(asset.priceChange1m),
        volume: Number(asset.volume),
        avgVolume: Number(asset.avgVolume),
        fiftyDayAvg: Number(asset.fiftyDayAvg),
        twoHundredDayAvg: Number(asset.twoHundredDayAvg),
        analysisId: asset.analysisId,
        scannedAt: asset.scannedAt,
        expiresAt: asset.expiresAt,
      }));
    } catch (error) {
      console.error(`[MultiAssetCache] Error fetching tradeable ${market}:`, error);
      return [];
    }
  }

  /**
   * Check if cache is stale for a market
   */
  async isCacheStale(market: MarketType): Promise<boolean> {
    try {
      const latestScan = await prisma.assetScoreCache.findFirst({
        where: { market },
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
   * Get cache statistics for a market
   */
  async getCacheStats(market: MarketType): Promise<{ totalAssets: number; freshAssets: number; staleAssets: number; lastScanAt: Date | null }> {
    try {
      const [total, fresh] = await Promise.all([
        prisma.assetScoreCache.count({ where: { market } }),
        prisma.assetScoreCache.count({ where: { market, expiresAt: { gt: new Date() } } }),
      ]);

      const latestScan = await prisma.assetScoreCache.findFirst({
        where: { market },
        orderBy: { scannedAt: 'desc' },
        select: { scannedAt: true },
      });

      return {
        totalAssets: total,
        freshAssets: fresh,
        staleAssets: total - fresh,
        lastScanAt: latestScan?.scannedAt || null,
      };
    } catch {
      return { totalAssets: 0, freshAssets: 0, staleAssets: 0, lastScanAt: null };
    }
  }

  /**
   * Get all cached assets for a market
   */
  async getAllCachedAssets(market: MarketType): Promise<AssetScore[]> {
    try {
      const assets = await prisma.assetScoreCache.findMany({
        where: {
          market,
          expiresAt: { gt: new Date() },
        },
        orderBy: { reliabilityScore: 'desc' },
      });

      return assets.map(asset => ({
        symbol: asset.symbol,
        market: asset.market as MarketType,
        name: asset.name,
        totalScore: Number(asset.totalScore),
        reliabilityScore: Number(asset.reliabilityScore),
        trendScore: Number(asset.trendScore),
        momentumScore: Number(asset.momentumScore),
        volatilityScore: Number(asset.volatilityScore),
        volumeScore: Number(asset.volumeScore),
        verdict: asset.verdict,
        direction: asset.direction,
        confidence: Number(asset.confidence),
        price: Number(asset.price),
        priceChange1d: Number(asset.priceChange1d),
        priceChange5d: Number(asset.priceChange5d),
        priceChange1m: Number(asset.priceChange1m),
        volume: Number(asset.volume),
        avgVolume: Number(asset.avgVolume),
        fiftyDayAvg: Number(asset.fiftyDayAvg),
        twoHundredDayAvg: Number(asset.twoHundredDayAvg),
        analysisId: asset.analysisId,
        scannedAt: asset.scannedAt,
        expiresAt: asset.expiresAt,
      }));
    } catch (error) {
      console.error(`[MultiAssetCache] Error fetching all ${market}:`, error);
      return [];
    }
  }
}

export const multiAssetScoreCacheService = new MultiAssetScoreCacheService();
