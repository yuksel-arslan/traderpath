/**
 * Signal Generator Job
 * Hourly cron that runs Capital Flow → Asset Analysis → Signal Generation
 */

import cron from 'node-cron';
import { prisma } from '../../core/prisma';
import { redis } from '../../core/redis';
import { getCapitalFlowSummary } from '../capital-flow/capital-flow.service';
import { analysisEngine } from '../analysis/analysis.engine';
import { analyzeMLIS } from '../analysis/services/mlis.service';
import { signalService } from './signal.service';
import { formatTelegramSignal } from './telegram-formatter';
import type { SignalData, SignalGenerationResult } from './types';

// Telegram bot configuration
const TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
const TELEGRAM_CHANNEL_ID = process.env['TELEGRAM_SIGNAL_CHANNEL_ID']; // Public channel for signals

// Cron schedule: Every hour at minute 15 (to allow data refresh)
const CRON_SCHEDULE = '15 * * * *';

// Assets to scan per market
const MARKET_ASSETS: Record<string, string[]> = {
  crypto: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'LINK', 'DOT', 'MATIC'],
  stocks: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'AMD'],
  metals: ['GLD', 'SLV', 'IAU'],
  bonds: ['TLT', 'IEF', 'SHY', 'BND', 'AGG'],
};

// Maximum assets to analyze per run (API cost control)
const MAX_ASSETS_PER_RUN = 5;

// Lock key to prevent concurrent runs
const LOCK_KEY = 'signal-generator:running';
const LOCK_TTL = 1800; // 30 minutes

let cronJob: cron.ScheduledTask | null = null;

/**
 * Main signal generation function
 */
export async function generateSignals(): Promise<SignalGenerationResult> {
  const result: SignalGenerationResult = {
    processed: 0,
    generated: 0,
    published: 0,
    skipped: 0,
    errors: [],
  };

  console.log('[SignalGenerator] Starting signal generation cycle');

  try {
    // Acquire lock
    if (redis) {
      const acquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX');
      if (!acquired) {
        console.log('[SignalGenerator] Another instance is running, skipping');
        return result;
      }
    }

    // Step 1: Get Capital Flow recommendations
    const capitalFlowSummary = await getCapitalFlowSummary();
    const recommendation = capitalFlowSummary.recommendation;

    if (!recommendation) {
      console.log('[SignalGenerator] No Capital Flow recommendation available');
      return result;
    }

    console.log(`[SignalGenerator] Capital Flow recommends: ${recommendation.primaryMarket} - ${recommendation.action}`);

    // Step 2: Get assets to analyze based on recommendation
    const assetsToAnalyze = selectAssetsToAnalyze(recommendation, capitalFlowSummary);

    console.log(`[SignalGenerator] Selected ${assetsToAnalyze.length} assets to analyze:`, assetsToAnalyze.map(a => a.symbol));

    // Step 3: Analyze each asset (7-Step + MLIS Pro)
    for (const asset of assetsToAnalyze) {
      try {
        result.processed++;

        // Check for duplicate signals
        const isDuplicate = await signalService.isDuplicateSignal(
          asset.symbol,
          recommendation.action === 'BUY' ? 'long' : 'short',
          4 // Within last 4 hours
        );

        if (isDuplicate) {
          console.log(`[SignalGenerator] Skipping ${asset.symbol} - duplicate signal exists`);
          result.skipped++;
          continue;
        }

        // Run 7-Step Classic Analysis
        console.log(`[SignalGenerator] Running Classic analysis for ${asset.symbol}`);
        const classicResult = await runClassicAnalysis(asset.symbol, asset.assetClass);

        if (!classicResult) {
          result.errors.push({ symbol: asset.symbol, error: 'Classic analysis failed' });
          continue;
        }

        // Check if Classic verdict is actionable
        if (!['GO', 'CONDITIONAL_GO'].includes(classicResult.verdict)) {
          console.log(`[SignalGenerator] ${asset.symbol} verdict ${classicResult.verdict} - not actionable`);
          result.skipped++;
          continue;
        }

        // Run MLIS Pro for confirmation
        console.log(`[SignalGenerator] Running MLIS Pro for ${asset.symbol}`);
        const mlisResult = await runMLISAnalysis(asset.symbol);

        // Determine MLIS confirmation
        const mlisConfirmed = isMLISConfirmed(mlisResult, classicResult);

        // Calculate overall confidence
        const overallConfidence = calculateOverallConfidence(
          classicResult,
          mlisResult,
          recommendation.confidence
        );

        // Build signal data
        const signalData: SignalData = {
          symbol: asset.symbol,
          assetClass: asset.assetClass,
          market: asset.market,
          direction: recommendation.action === 'BUY' ? 'long' : 'short',
          entryPrice: classicResult.tradePlan?.averageEntry || 0,
          stopLoss: classicResult.tradePlan?.stopLoss?.price || 0,
          takeProfit1: classicResult.tradePlan?.takeProfits?.[0]?.price || 0,
          takeProfit2: classicResult.tradePlan?.takeProfits?.[1]?.price || 0,
          riskRewardRatio: classicResult.tradePlan?.riskReward || 0,
          classicVerdict: classicResult.verdict,
          classicScore: classicResult.totalScore,
          mlisConfirmation: mlisConfirmed,
          mlisRecommendation: mlisResult?.recommendation,
          mlisConfidence: mlisResult?.confidence,
          overallConfidence,
          capitalFlowPhase: recommendation.phase,
          capitalFlowBias: capitalFlowSummary.globalLiquidity?.bias || 'neutral',
          sectorFlow: asset.sectorFlow,
          classicAnalysisId: classicResult.analysisId,
          mlisAnalysisId: mlisResult?.analysisId,
        };

        // Validate signal quality
        const validation = signalService.validateSignalQuality(signalData);

        if (!validation.valid) {
          console.log(`[SignalGenerator] ${asset.symbol} validation failed:`, validation.reasons);
          result.skipped++;
          continue;
        }

        // Create and publish signal
        const signalId = await signalService.createSignal(signalData);
        result.generated++;

        console.log(`[SignalGenerator] Signal created for ${asset.symbol}: ${signalId}`);

        // Publish to Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID) {
          try {
            const message = formatTelegramSignal(signalData, signalId);
            const telegramMessageId = await sendTelegramMessage(TELEGRAM_CHANNEL_ID, message);

            await signalService.markAsPublished(signalId, telegramMessageId);
            result.published++;

            console.log(`[SignalGenerator] Signal published to Telegram: ${asset.symbol}`);
          } catch (telegramError) {
            console.error(`[SignalGenerator] Telegram publish failed for ${asset.symbol}:`, telegramError);
          }
        }

        // Small delay between analyses to avoid rate limits
        await sleep(2000);

      } catch (error) {
        console.error(`[SignalGenerator] Error processing ${asset.symbol}:`, error);
        result.errors.push({
          symbol: asset.symbol,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[SignalGenerator] Cycle complete:`, result);

    // Store result in Redis for monitoring
    if (redis) {
      await redis.set(
        'signal-generator:last-run',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          result,
        }),
        'EX',
        86400 // 24 hours
      );
    }

    return result;

  } catch (error) {
    console.error('[SignalGenerator] Fatal error:', error);
    throw error;
  } finally {
    // Release lock
    if (redis) {
      await redis.del(LOCK_KEY);
    }
  }
}

/**
 * Select assets to analyze based on Capital Flow recommendation
 */
function selectAssetsToAnalyze(
  recommendation: any,
  summary: any
): Array<{ symbol: string; assetClass: 'crypto' | 'stocks' | 'metals' | 'bonds'; market: string; sectorFlow?: number }> {
  const market = recommendation.primaryMarket;
  const marketAssets = MARKET_ASSETS[market] || [];

  // Get suggested assets from recommendation
  const suggestedAssets = recommendation.suggestedAssets || [];

  // Combine with market defaults
  const allAssets = [...new Set([...suggestedAssets, ...marketAssets])];

  // Get sector flow data for additional scoring
  const marketFlow = summary.markets?.find((m: any) => m.market === market);
  const sectorFlows = marketFlow?.sectors?.reduce((acc: any, s: any) => {
    acc[s.name] = s.flow7d;
    return acc;
  }, {}) || {};

  // Map to analysis format
  const assetsToAnalyze = allAssets.slice(0, MAX_ASSETS_PER_RUN).map((symbol) => ({
    symbol,
    assetClass: getAssetClass(symbol, market),
    market,
    sectorFlow: getSectorFlow(symbol, sectorFlows),
  }));

  return assetsToAnalyze;
}

/**
 * Run 7-Step Classic Analysis
 */
async function runClassicAnalysis(symbol: string, assetClass: string): Promise<any | null> {
  try {
    const tradeType = 'swing'; // Default for signals

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        symbol,
        interval: '1d',
        tradeType,
        method: 'classic',
        status: 'in_progress',
      },
    });

    // Run all 7 steps
    const [marketPulse, assetScan, safetyCheck, timing, trapCheck] = await Promise.all([
      analysisEngine.getMarketPulse(),
      analysisEngine.scanAsset(symbol, tradeType),
      analysisEngine.safetyCheck(symbol, tradeType),
      analysisEngine.getTiming(symbol, tradeType),
      analysisEngine.getTrapCheck(symbol, tradeType),
    ]);

    // Get preliminary verdict
    const preliminaryVerdict = analysisEngine.getPreliminaryVerdict(
      marketPulse,
      assetScan,
      safetyCheck,
      timing,
      trapCheck
    );

    // Generate trade plan if verdict is positive
    let tradePlan = null;
    if (['GO', 'CONDITIONAL_GO'].includes(preliminaryVerdict.action)) {
      tradePlan = await analysisEngine.getTradePlan(
        symbol,
        preliminaryVerdict.direction || 'long',
        assetScan.entries || [],
        tradeType,
        preliminaryVerdict
      );
    }

    // Get final verdict
    const finalVerdict = await analysisEngine.getFinalVerdict(
      symbol,
      preliminaryVerdict,
      { marketPulse, assetScan, safetyCheck, timing, trapCheck },
      tradePlan,
      tradeType
    );

    // Calculate total score
    const totalScore = finalVerdict.overallScore;

    // Update analysis record
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: 'completed',
        totalScore,
        step1Result: marketPulse as any,
        step2Result: assetScan as any,
        step3Result: safetyCheck as any,
        step4Result: timing as any,
        step5Result: tradePlan as any,
        step6Result: trapCheck as any,
        step7Result: finalVerdict as any,
      },
    });

    return {
      analysisId: analysis.id,
      totalScore,
      verdict: finalVerdict.verdict?.action || 'WAIT',
      tradePlan,
      step7Result: finalVerdict,
    };
  } catch (error) {
    console.error(`[runClassicAnalysis] Error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Run MLIS Pro Analysis
 */
async function runMLISAnalysis(symbol: string): Promise<any | null> {
  try {
    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        symbol,
        interval: '1d',
        tradeType: 'swing',
        method: 'mlis_pro',
        status: 'in_progress',
      },
    });

    // Run MLIS analysis
    const result = await analyzeMLIS(symbol, '1d');

    if (!result) {
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: 'failed' },
      });
      return null;
    }

    // Update analysis record
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: 'completed',
        totalScore: result.confidence / 10, // Convert to 0-10 scale
        step1Result: { mlis: true, layers: result.layers } as any,
        step7Result: {
          recommendation: result.recommendation,
          confidence: result.confidence,
          direction: result.direction,
        } as any,
      },
    });

    return {
      ...result,
      analysisId: analysis.id,
    };
  } catch (error) {
    console.error(`[runMLISAnalysis] Error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Check if MLIS confirms Classic analysis
 */
function isMLISConfirmed(mlisResult: any, classicResult: any): boolean {
  if (!mlisResult) return false;

  const classicDirection = classicResult.step7Result?.verdict?.direction?.toLowerCase();
  const mlisDirection = mlisResult.direction?.toLowerCase();

  // MLIS must agree on direction
  if (classicDirection && mlisDirection && classicDirection !== mlisDirection) {
    return false;
  }

  // MLIS recommendation must be positive for BUY signals
  const positiveRecommendations = ['STRONG_BUY', 'BUY'];
  const negativeRecommendations = ['STRONG_SELL', 'SELL'];

  if (classicDirection === 'long' && positiveRecommendations.includes(mlisResult.recommendation)) {
    return true;
  }

  if (classicDirection === 'short' && negativeRecommendations.includes(mlisResult.recommendation)) {
    return true;
  }

  // MLIS confidence must be above threshold
  return mlisResult.confidence >= 60;
}

/**
 * Calculate overall confidence
 */
function calculateOverallConfidence(
  classicResult: any,
  mlisResult: any,
  capitalFlowConfidence: number
): number {
  // Weights: Classic 40%, MLIS 35%, Capital Flow 25%
  const classicScore = (classicResult.totalScore / 10) * 100; // Convert to 0-100
  const mlisScore = mlisResult?.confidence || 50;

  const weighted =
    classicScore * 0.4 +
    mlisScore * 0.35 +
    capitalFlowConfidence * 0.25;

  return Math.round(weighted);
}

/**
 * Get asset class from symbol and market
 */
function getAssetClass(symbol: string, market: string): 'crypto' | 'stocks' | 'metals' | 'bonds' {
  if (market === 'crypto') return 'crypto';
  if (market === 'metals') return 'metals';
  if (market === 'bonds') return 'bonds';
  return 'stocks';
}

/**
 * Get sector flow for a symbol
 */
function getSectorFlow(symbol: string, sectorFlows: Record<string, number>): number | undefined {
  const sectorMap: Record<string, string> = {
    // Tech
    AAPL: 'tech', MSFT: 'tech', NVDA: 'tech', GOOGL: 'tech', META: 'tech', AMD: 'tech',
    // Consumer
    AMZN: 'consumer', TSLA: 'consumer',
    // DeFi
    AAVE: 'defi', UNI: 'defi', MKR: 'defi',
    // Layer 1
    ETH: 'layer1', SOL: 'layer1', AVAX: 'layer1', ADA: 'layer1',
  };

  const sector = sectorMap[symbol];
  return sector ? sectorFlows[sector] : undefined;
}

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<string | undefined> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[Telegram] Bot token not configured');
    return undefined;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json() as any;

    if (!result.ok) {
      throw new Error(result.description || 'Telegram API error');
    }

    return result.result?.message_id?.toString();
  } catch (error) {
    console.error('[Telegram] Send message failed:', error);
    throw error;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start the signal generator cron job
 */
export function startSignalGeneratorJob() {
  if (cronJob) {
    console.log('[SignalGenerator] Job already running');
    return;
  }

  console.log(`[SignalGenerator] Starting cron job with schedule: ${CRON_SCHEDULE}`);

  cronJob = cron.schedule(CRON_SCHEDULE, async () => {
    console.log('[SignalGenerator] Cron triggered at', new Date().toISOString());
    try {
      await generateSignals();
    } catch (error) {
      console.error('[SignalGenerator] Cron job error:', error);
    }
  });

  console.log('[SignalGenerator] Cron job started');
}

/**
 * Stop the signal generator cron job
 */
export function stopSignalGeneratorJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[SignalGenerator] Cron job stopped');
  }
}

/**
 * Run signal generation manually (for testing/admin)
 */
export async function runSignalGenerationManually(): Promise<SignalGenerationResult> {
  return generateSignals();
}
