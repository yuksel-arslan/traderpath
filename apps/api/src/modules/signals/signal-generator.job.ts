/**
 * Signal Generator Job
 * Hourly cron that runs Capital Flow → Asset Analysis (7-Step + MLIS Pro) → Signal Generation
 *
 * Note: MLIS Pro confirmation is integrated into the 7-Step Classic Analysis,
 * they are NOT separate analysis methods.
 */

import cron from 'node-cron';
import { prisma } from '../../core/database';
import { redis } from '../../core/cache';
import { getCapitalFlowSummary } from '../capital-flow/capital-flow.service';
import { analysisEngine } from '../analysis/analysis.engine';
import { analyzeMLIS } from '../analysis/services/mlis.service';
import { signalService } from './signal.service';
import { formatTelegramSignal } from './telegram-formatter';
import { signalMonitoring } from './signal-monitoring.service';
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
  const startTime = Date.now();
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

    // Step 3: Analyze each asset (7-Step + MLIS Pro integrated)
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

        // Run integrated 7-Step + MLIS Pro Analysis
        console.log(`[SignalGenerator] Running analysis for ${asset.symbol} (7-Step + MLIS Pro)`);
        const analysisResult = await runIntegratedAnalysis(asset.symbol, asset.assetClass);

        if (!analysisResult) {
          result.errors.push({ symbol: asset.symbol, error: 'Analysis failed' });
          continue;
        }

        // Check if verdict is actionable
        if (!['GO', 'CONDITIONAL_GO'].includes(analysisResult.verdict)) {
          console.log(`[SignalGenerator] ${asset.symbol} verdict ${analysisResult.verdict} - not actionable`);
          result.skipped++;
          continue;
        }

        // Check MLIS confirmation
        if (!analysisResult.mlisConfirmation) {
          console.log(`[SignalGenerator] ${asset.symbol} - MLIS did not confirm, skipping`);
          result.skipped++;
          continue;
        }

        // Calculate overall confidence
        const overallConfidence = calculateOverallConfidence(
          analysisResult.totalScore,
          analysisResult.mlisConfidence || 50,
          recommendation.confidence
        );

        // Build signal data
        const signalData: SignalData = {
          symbol: asset.symbol,
          assetClass: asset.assetClass,
          market: asset.market,
          direction: recommendation.action === 'BUY' ? 'long' : 'short',
          entryPrice: analysisResult.tradePlan?.averageEntry || 0,
          stopLoss: analysisResult.tradePlan?.stopLoss?.price || 0,
          takeProfit1: analysisResult.tradePlan?.takeProfits?.[0]?.price || 0,
          takeProfit2: analysisResult.tradePlan?.takeProfits?.[1]?.price || 0,
          riskRewardRatio: analysisResult.tradePlan?.riskReward || 0,
          classicVerdict: analysisResult.verdict,
          classicScore: analysisResult.totalScore,
          mlisConfirmation: analysisResult.mlisConfirmation,
          mlisRecommendation: analysisResult.mlisRecommendation,
          mlisConfidence: analysisResult.mlisConfidence,
          overallConfidence,
          capitalFlowPhase: recommendation.phase,
          capitalFlowBias: capitalFlowSummary.globalLiquidity?.bias || 'neutral',
          sectorFlow: asset.sectorFlow,
          classicAnalysisId: analysisResult.analysisId,
          mlisAnalysisId: analysisResult.analysisId, // Same analysis includes MLIS
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

    // Record successful execution metrics
    const duration = Date.now() - startTime;
    const avgConfidence = result.published > 0
      ? result.generated / result.published * 75 // Approximate average confidence
      : 0;

    await signalMonitoring.recordGeneratorRun({
      success: true,
      duration,
      signalsGenerated: result.generated,
      signalsPublished: result.published,
      averageConfidence: avgConfidence,
    });

    return result;

  } catch (error) {
    console.error('[SignalGenerator] Fatal error:', error);

    // Record failure metrics
    const duration = Date.now() - startTime;
    await signalMonitoring.recordGeneratorRun({
      success: false,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

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
 * Run integrated 7-Step + MLIS Pro Analysis
 * This is a SINGLE analysis that includes both Classic steps and MLIS confirmation
 */
async function runIntegratedAnalysis(symbol: string, assetClass: string): Promise<any | null> {
  try {
    const tradeType = 'swing'; // Default for signals
    const interval = '1d';

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        symbol,
        interval,
        tradeType,
        method: 'classic', // Integrated analysis uses classic method with MLIS confirmation
        status: 'in_progress',
      },
    });

    // ===== 7-Step Classic Analysis =====
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

    // Get final verdict (Classic)
    const finalVerdict = await analysisEngine.getFinalVerdict(
      symbol,
      preliminaryVerdict,
      { marketPulse, assetScan, safetyCheck, timing, trapCheck },
      tradePlan,
      tradeType
    );

    // ===== MLIS Pro Confirmation (integrated) =====
    let mlisConfirmation = false;
    let mlisRecommendation: string | undefined;
    let mlisConfidence: number | undefined;
    let mlisLayers: any = null;

    try {
      const mlisResult = await analyzeMLIS(symbol, interval);

      if (mlisResult) {
        mlisLayers = mlisResult.layers;
        mlisRecommendation = mlisResult.recommendation;
        mlisConfidence = mlisResult.confidence;

        // Check if MLIS confirms the Classic direction
        const classicDirection = finalVerdict.verdict?.direction?.toLowerCase();
        const mlisDirection = mlisResult.direction?.toLowerCase();

        // MLIS confirms if:
        // 1. Directions match
        // 2. MLIS recommendation aligns with Classic verdict
        // 3. MLIS confidence is above threshold
        const positiveRecommendations = ['STRONG_BUY', 'BUY'];
        const negativeRecommendations = ['STRONG_SELL', 'SELL'];

        if (classicDirection === 'long' && positiveRecommendations.includes(mlisResult.recommendation)) {
          mlisConfirmation = true;
        } else if (classicDirection === 'short' && negativeRecommendations.includes(mlisResult.recommendation)) {
          mlisConfirmation = true;
        } else if (mlisDirection === classicDirection && mlisResult.confidence >= 60) {
          mlisConfirmation = true;
        }
      }
    } catch (mlisError) {
      console.error(`[runIntegratedAnalysis] MLIS failed for ${symbol}, continuing without confirmation:`, mlisError);
    }

    // Calculate total score
    const totalScore = finalVerdict.overallScore;

    // Update analysis record with both Classic and MLIS results
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
        step7Result: {
          ...finalVerdict,
          // MLIS confirmation integrated into final verdict
          mlisConfirmation,
          mlisRecommendation,
          mlisConfidence,
          mlisLayers,
        } as any,
      },
    });

    return {
      analysisId: analysis.id,
      totalScore,
      verdict: finalVerdict.verdict?.action || 'WAIT',
      direction: finalVerdict.verdict?.direction,
      tradePlan,
      // MLIS confirmation data
      mlisConfirmation,
      mlisRecommendation,
      mlisConfidence,
      step7Result: finalVerdict,
    };
  } catch (error) {
    console.error(`[runIntegratedAnalysis] Error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate overall confidence
 */
function calculateOverallConfidence(
  classicScore: number,
  mlisConfidence: number,
  capitalFlowConfidence: number
): number {
  // Weights: Classic 40%, MLIS 35%, Capital Flow 25%
  const classicPercent = (classicScore / 10) * 100; // Convert to 0-100

  const weighted =
    classicPercent * 0.4 +
    mlisConfidence * 0.35 +
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
