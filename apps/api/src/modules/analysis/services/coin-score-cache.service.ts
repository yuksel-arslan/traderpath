// ===========================================
// Coin Score Cache Service
// Periodic scanning of top coins using REAL analysis engine
// ===========================================

import { analysisEngine } from '../analysis.engine';
import { getTradeTypeFromInterval } from '../config/trade-config';
import { smartCoinsService } from './smart-coins.service';
import { logger } from '../../../core/logger';
import { prisma } from '../../../core/database';

// Top coins to scan (prioritized list)
const TOP_COINS_TO_SCAN = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'SHIB', 'LTC', 'UNI', 'ATOM', 'XLM', 'NEAR', 'APT', 'ARB', 'OP',
  'FIL', 'INJ', 'SUI', 'SEI', 'TIA', 'IMX', 'RENDER', 'FET', 'TAO', 'WIF',
];

// Cache expiry time (2 hours)
const CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;

// Rate limiting between analyses (to avoid API overload)
const ANALYSIS_DELAY_MS = 5000; // 5 seconds between each coin

// Scan session tracking
interface ScanSession {
  isScanning: boolean;
  coinsAnalyzed: number;
  totalCoins: number;
  startedAt: Date | null;
  lastAnalyzedCoin: string | null;
}

// Global scan state (in-memory tracking)
let currentScanSession: ScanSession = {
  isScanning: false,
  coinsAnalyzed: 0,
  totalCoins: TOP_COINS_TO_SCAN.length,
  startedAt: null,
  lastAnalyzedCoin: null,
};

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

export interface FullAnalysisResult {
  symbol: string;
  success: boolean;
  score?: CoinScore;
  analysisId?: string;
  error?: string;
}

// ===========================================
// Main Service Class
// ===========================================

class CoinScoreCacheService {
  private systemUserId: string | null = null;

  /**
   * Get or create a system user ID for platform-generated analyses
   */
  private async getSystemUserId(): Promise<string> {
    if (this.systemUserId) return this.systemUserId;

    try {
      // Try to find an admin user first
      const adminUser = await prisma.user.findFirst({
        where: { isAdmin: true },
        select: { id: true },
      });

      if (adminUser) {
        this.systemUserId = adminUser.id;
        return adminUser.id;
      }

      // If no admin, find any user
      const anyUser = await prisma.user.findFirst({
        select: { id: true },
      });

      if (anyUser) {
        this.systemUserId = anyUser.id;
        return anyUser.id;
      }

      throw new Error('No users found in the database');
    } catch (error) {
      logger.error('[CoinScoreCache] Error getting system user ID:', error);
      throw error;
    }
  }

  /**
   * Run FULL analysis for a single coin using analysisEngine
   */
  async runFullAnalysis(symbol: string, interval: string = '4h'): Promise<FullAnalysisResult> {
    try {
      logger.info(`[CoinScoreCache] Running FULL analysis for ${symbol}...`);

      const tradeType = getTradeTypeFromInterval(interval);

      // Step 1: Market Pulse (global market conditions)
      const marketPulse = await analysisEngine.getMarketPulse();

      // Step 2: Asset Scanner (coin-specific analysis with 40+ indicators)
      const assetScan = await analysisEngine.scanAsset(symbol, tradeType);

      // Step 3: Safety Check
      const safetyCheck = await analysisEngine.safetyCheck(symbol, tradeType);

      // Step 4: Timing Analysis
      const timing = await analysisEngine.timingAnalysis(symbol, tradeType);

      // Get market data for price info
      const marketData = await this.getMarketData(symbol);

      // Calculate scores from real analysis results
      const liquidityScore = this.calculateLiquidityFromAnalysis(assetScan);
      const volatilityScore = this.calculateVolatilityFromAnalysis(assetScan);
      const trendScore = this.calculateTrendFromAnalysis(assetScan);
      const momentumScore = this.calculateMomentumFromAnalysis(assetScan);

      // Use the real analysis score
      const totalScore = assetScan.overallScore || 50;

      // Reliability score (weighted: real analysis score + component scores)
      const reliabilityScore = Math.round(
        totalScore * 0.4 +           // Real analysis weight
        liquidityScore * 0.15 +
        volatilityScore * 0.15 +
        trendScore * 0.15 +
        momentumScore * 0.15
      );

      // Get verdict from analysis
      const verdict = this.determineVerdict(assetScan, safetyCheck, timing);
      const direction = assetScan.trendDirection === 'bullish' ? 'LONG' :
                       assetScan.trendDirection === 'bearish' ? 'SHORT' : null;

      const confidence = Math.min(10, Math.max(1, Math.round(reliabilityScore / 10)));

      // Get system user ID for platform-generated analyses
      const systemUserId = await this.getSystemUserId();

      // Save to database
      const analysisRecord = await prisma.analysis.create({
        data: {
          userId: systemUserId, // Use admin/system user ID
          symbol,
          interval,
          method: 'classic', // Explicitly set method for system scans
          stepsCompleted: [1, 2, 3, 4],
          step1Result: marketPulse as object,
          step2Result: assetScan as object,
          step3Result: safetyCheck as object,
          step4Result: timing as object,
          totalScore: reliabilityScore,
          creditsSpent: 0, // Platform covers cost
        },
      });

      const score: CoinScore = {
        symbol,
        totalScore: reliabilityScore,
        reliabilityScore,
        liquidityScore,
        volatilityScore,
        trendScore,
        momentumScore,
        verdict,
        direction,
        confidence,
        price: marketData?.price || assetScan.currentPrice || 0,
        priceChange24h: marketData?.priceChange24h || 0,
        volume24h: marketData?.volume24h || 0,
        marketCap: marketData?.marketCap || 0,
        analysisId: analysisRecord.id,
        interval,
        scannedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_EXPIRY_MS),
      };

      logger.info(`[CoinScoreCache] ${symbol} analysis complete. Score: ${reliabilityScore}, Verdict: ${verdict}`);

      return { symbol, success: true, score, analysisId: analysisRecord.id };
    } catch (error) {
      logger.error(`[CoinScoreCache] Error analyzing ${symbol}:`, error);
      return { symbol, success: false, error: String(error) };
    }
  }

  /**
   * Calculate liquidity score from real analysis
   */
  private calculateLiquidityFromAnalysis(assetScan: any): number {
    // Use volume indicators from real analysis
    const volumeScore = assetScan.indicators?.volume?.relativeVolume || 1;

    if (volumeScore >= 2) return 95;
    if (volumeScore >= 1.5) return 85;
    if (volumeScore >= 1.2) return 75;
    if (volumeScore >= 1) return 65;
    if (volumeScore >= 0.8) return 55;
    return 45;
  }

  /**
   * Calculate volatility score from real analysis
   */
  private calculateVolatilityFromAnalysis(assetScan: any): number {
    // Use ATR from real analysis
    const atrPercent = assetScan.indicators?.volatility?.atrPercent || 5;

    // Lower ATR = higher stability score
    if (atrPercent <= 1) return 95;
    if (atrPercent <= 2) return 85;
    if (atrPercent <= 3) return 75;
    if (atrPercent <= 5) return 65;
    if (atrPercent <= 7) return 55;
    if (atrPercent <= 10) return 45;
    return 35;
  }

  /**
   * Calculate trend score from real analysis
   */
  private calculateTrendFromAnalysis(assetScan: any): number {
    let score = 50;

    // Use trend strength from real analysis
    const trendStrength = assetScan.trendStrength || 50;
    score = trendStrength;

    // Bonus for aligned timeframes
    if (assetScan.timeframeAlignment >= 3) {
      score += 15;
    }

    // Bonus for clear direction
    if (assetScan.trendDirection !== 'neutral') {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate momentum score from real analysis
   */
  private calculateMomentumFromAnalysis(assetScan: any): number {
    let score = 50;

    // Use RSI from real analysis
    const rsi = assetScan.indicators?.momentum?.rsi || 50;

    if (rsi >= 40 && rsi <= 60) {
      score += 20; // Neutral - room for movement
    } else if (rsi >= 30 && rsi <= 70) {
      score += 10;
    } else if (rsi < 30) {
      score += 5; // Oversold
    } else {
      score -= 5; // Overbought
    }

    // MACD confirmation
    const macdSignal = assetScan.indicators?.momentum?.macdSignal;
    if (macdSignal === 'bullish' || macdSignal === 'bearish') {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Determine verdict from real analysis results
   */
  private determineVerdict(assetScan: any, safetyCheck: any, timing: any): string {
    // Check safety gate
    if (!safetyCheck?.gate?.canProceed) {
      return 'AVOID';
    }

    // Check timing gate
    if (!timing?.gate?.canProceed) {
      return 'WAIT';
    }

    // Use overall score
    const score = assetScan.overallScore || 50;

    if (score >= 70) return 'GO';
    if (score >= 55) return 'CONDITIONAL_GO';
    if (score >= 40) return 'WAIT';
    return 'AVOID';
  }

  /**
   * Get market data from smart coins service
   */
  private async getMarketData(symbol: string): Promise<{ price: number; priceChange24h: number; volume24h: number; marketCap: number } | null> {
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
        return {
          price: coin.price,
          priceChange24h: coin.priceChange24h,
          volume24h: coin.volume24h,
          marketCap: coin.marketCap,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get current scan session state
   */
  getScanSession(): ScanSession {
    return { ...currentScanSession };
  }

  /**
   * Scan all top coins with REAL analysis and update cache
   */
  async scanAllCoins(interval: string = '4h'): Promise<{ success: number; failed: number; results: CoinScore[] }> {
    // Prevent multiple simultaneous scans
    if (currentScanSession.isScanning) {
      logger.info('[CoinScoreCache] Scan already in progress, skipping...');
      return { success: 0, failed: 0, results: [] };
    }

    // Initialize scan session
    currentScanSession = {
      isScanning: true,
      coinsAnalyzed: 0,
      totalCoins: TOP_COINS_TO_SCAN.length,
      startedAt: new Date(),
      lastAnalyzedCoin: null,
    };

    logger.info(`[CoinScoreCache] Starting FULL analysis scan of ${TOP_COINS_TO_SCAN.length} coins...`);
    logger.info(`[CoinScoreCache] This will take approximately ${(TOP_COINS_TO_SCAN.length * ANALYSIS_DELAY_MS / 1000 / 60).toFixed(1)} minutes`);

    const results: CoinScore[] = [];
    let success = 0;
    let failed = 0;

    for (const symbol of TOP_COINS_TO_SCAN) {
      const result = await this.runFullAnalysis(symbol, interval);

      // Update scan session progress
      currentScanSession.coinsAnalyzed++;
      currentScanSession.lastAnalyzedCoin = symbol;

      if (result.success && result.score) {
        results.push(result.score);
        success++;

        // Save to cache
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
          logger.error(`[CoinScoreCache] Failed to save ${symbol} to cache:`, dbError);
        }
      } else {
        failed++;
        logger.error(`[CoinScoreCache] Failed to analyze ${symbol}: ${result.error}`);
      }

      // Rate limiting between analyses
      if (TOP_COINS_TO_SCAN.indexOf(symbol) < TOP_COINS_TO_SCAN.length - 1) {
        logger.info(`[CoinScoreCache] Waiting ${ANALYSIS_DELAY_MS / 1000}s before next analysis...`);
        await new Promise(resolve => setTimeout(resolve, ANALYSIS_DELAY_MS));
      }
    }

    // Reset scan session when done
    currentScanSession = {
      isScanning: false,
      coinsAnalyzed: TOP_COINS_TO_SCAN.length,
      totalCoins: TOP_COINS_TO_SCAN.length,
      startedAt: currentScanSession.startedAt,
      lastAnalyzedCoin: TOP_COINS_TO_SCAN[TOP_COINS_TO_SCAN.length - 1],
    };

    logger.info(`[CoinScoreCache] Full scan complete. Success: ${success}, Failed: ${failed}`);
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
      logger.error('[CoinScoreCache] Error fetching top coins:', error);
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
      logger.error('[CoinScoreCache] Error fetching tradeable coins:', error);
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

  /**
   * Get a single coin from cache if fresh
   * Returns null if coin not in cache or expired
   */
  async getCoinFromCache(symbol: string): Promise<CoinScore | null> {
    try {
      const coin = await prisma.coinScoreCache.findFirst({
        where: {
          symbol: symbol.toUpperCase(),
          expiresAt: { gt: new Date() },
        },
      });

      if (!coin) return null;

      return {
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
      };
    } catch (error) {
      logger.error(`[CoinScoreCache] Error fetching ${symbol} from cache:`, error);
      return null;
    }
  }

  /**
   * Check if a coin is in the TOP_COINS_TO_SCAN list
   */
  isTopCoin(symbol: string): boolean {
    return TOP_COINS_TO_SCAN.includes(symbol.toUpperCase());
  }

  /**
   * Get full analysis data for a cached coin (fetches from Analysis table)
   */
  async getCachedAnalysisData(symbol: string): Promise<{
    marketPulse: any;
    assetScan: any;
    safetyCheck: any;
    timing: any;
    tradePlan: any | null;
  } | null> {
    try {
      const cachedCoin = await this.getCoinFromCache(symbol);
      if (!cachedCoin || !cachedCoin.analysisId) return null;

      const analysis = await prisma.analysis.findUnique({
        where: { id: cachedCoin.analysisId },
        select: {
          step1Result: true,
          step2Result: true,
          step3Result: true,
          step4Result: true,
          step5Result: true,
        },
      });

      if (!analysis) return null;

      return {
        marketPulse: analysis.step1Result,
        assetScan: analysis.step2Result,
        safetyCheck: analysis.step3Result,
        timing: analysis.step4Result,
        tradePlan: analysis.step5Result,
      };
    } catch (error) {
      logger.error(`[CoinScoreCache] Error fetching analysis data for ${symbol}:`, error);
      return null;
    }
  }
}

export const coinScoreCacheService = new CoinScoreCacheService();
