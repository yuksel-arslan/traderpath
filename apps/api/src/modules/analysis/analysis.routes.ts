// ===========================================
// Analysis Routes - Real Analysis with Gemini AI
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { costService } from '../costs/cost.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { analysisEngine } from './analysis.engine';
import { config } from '../../core/config';
import { callGeminiWithRetry } from '../../core/gemini';
import { TradeType, getTradeConfig, getStepConfig, getTradeTypeFromInterval } from './config/trade-config';
import { economicCalendarService } from './services/economic-calendar.service';
import { getCautionRate, calculateCautionOutcomes, calculateExpiredOutcomes } from '../reports/outcome.service';
import { prisma } from '../../core/database';
import { coinScoreCacheService, CoinScore } from './services/coin-score-cache.service';
import { analyzeMLIS, MLISResult } from './services/mlis.service';
import { logger } from '../../core/logger';
import { fetchCandles, getAssetClass } from './providers/multi-asset-data-provider';
import { getCapitalFlowModifier, CapitalFlowModifier } from '../capital-flow/capital-flow.service';
import { MarketType } from '../capital-flow/types';

// User type from JWT
interface JwtUser {
  id: string;
  email: string;
  name: string;
  level: number;
  isAdmin?: boolean;
}

// Helper to get typed user from request
function getUser(request: FastifyRequest): JwtUser {
  return request.user as JwtUser;
}

// Gemini response with usage data
interface GeminiResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Safe integer parsing with bounds checking
function safeParseInt(value: string | undefined, defaultValue: number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(parsed, max));
}

// Gemini AI for generating insights with cost tracking
// Uses centralized callGeminiWithRetry for admin-configurable model
async function getGeminiInsight(
  prompt: string,
  operation: string,
  userId?: string,
  symbol?: string
): Promise<GeminiResult> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return { text: 'AI insights not available', inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }

  const startTime = Date.now();

  try {
    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }, 3, operation);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || 'No insight generated';

    // Extract token usage from response
    const usageMetadata = response.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || Math.ceil(prompt.length / 4);
    const outputTokens = usageMetadata.candidatesTokenCount || Math.ceil(text.length / 4);

    // Calculate cost using costService
    const costUsd = costService.calculateGeminiCost(inputTokens, outputTokens);
    const durationMs = Date.now() - startTime;

    // Log the cost asynchronously (don't block the response)
    costService.logCost({
      service: 'gemini',
      operation,
      inputTokens,
      outputTokens,
      costUsd,
      userId,
      symbol,
      durationMs,
      metadata: { operation },
    }).catch(err => logger.error({ error: err }, 'Failed to log cost'));

    return { text, inputTokens, outputTokens, costUsd };
  } catch (error) {
    logger.error({ error }, 'Gemini error');
    return { text: 'AI analysis temporarily unavailable', inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }
}

export default async function analysisRoutes(app: FastifyInstance) {
  /**
   * GET /api/analysis/market-pulse
   * Step 1: Market Pulse (FREE)
   */
  app.get('/market-pulse', {
    preHandler: optionalAuth,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await analysisEngine.getMarketPulse();

      // Get AI insight
      const aiPrompt = `You are a crypto market analyst. Based on this data, give a brief 2-3 sentence market summary in English:
- BTC Dominance: ${data.btcDominance}% (${data.btcDominanceTrend})
- Fear & Greed: ${data.fearGreedIndex} (${data.fearGreedLabel})
- Market Regime: ${data.marketRegime}
- Trend: ${data.trend.direction} (${data.trend.strength}% strength)

Be concise and actionable.`;

      const aiResult = await getGeminiInsight(aiPrompt, 'market_pulse');
      const aiSummary = aiResult.text;

      return reply.send({
        success: true,
        data: { ...data, aiSummary },
      });
    } catch (error) {
      logger.error({ error }, 'Market Pulse error');
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to fetch market data' },
      });
    }
  });

  /**
   * GET /api/analysis/economic-calendar
   * Get upcoming economic events that impact crypto markets
   * FREE endpoint - no credits required
   */
  app.get('/economic-calendar', {
    preHandler: optionalAuth,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const calendar = await economicCalendarService.getUpcomingEvents();
      const summary = await economicCalendarService.getAnalysisSummary();

      return reply.send({
        success: true,
        data: {
          ...calendar,
          summary: {
            riskLevel: summary.riskLevel,
            score: summary.score,
            todayEvents: summary.todayEvents,
            upcomingMajor: summary.upcomingMajor,
            tradingAdvice: summary.tradingAdvice,
          },
          // Helper flags for frontend
          shouldAvoidTrading: calendar.riskLevel === 'high' || calendar.todayHighImpact.length > 0,
          nextHighImpactEvent: calendar.next24hHighImpact[0] || null,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Economic Calendar error');
      return reply.status(500).send({
        success: false,
        error: { code: 'CALENDAR_ERROR', message: 'Failed to fetch economic calendar' },
      });
    }
  });

  // Common schema with tradeType and interval support
  const tradeTypeSchema = z.enum(['scalping', 'dayTrade', 'swing']).default('dayTrade');
  const intervalSchema = z.enum(['5m', '15m', '30m', '1h', '2h', '4h', '1d', '1W']).optional();

  // Helper to resolve tradeType from interval if provided
  function resolveTradeType(interval?: string, tradeType?: TradeType): TradeType {
    if (interval) {
      return getTradeTypeFromInterval(interval);
    }
    return tradeType || 'swing';
  }

  /**
   * POST /api/analysis/asset-scan
   * Step 2: Asset Scanner (2 credits)
   */
  const assetScanSchema = z.object({
    symbol: z.string().toUpperCase(),
    tradeType: tradeTypeSchema,
  });

  app.post('/asset-scan', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const body = assetScanSchema.parse(request.body);

    const cost = await creditCostsService.getCreditCost('STEP_ASSET_SCANNER');
    const chargeResult = await creditService.charge(userId, cost, 'analysis_step_2', {
      symbol: body.symbol,
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: { code: 'CREDIT_001', message: 'Insufficient credits', required: cost },
      });
    }

    try {
      const data = await analysisEngine.scanAsset(body.symbol, body.tradeType);

      const aiPrompt = `You are a crypto analyst. Give a brief 2-3 sentence analysis for ${body.symbol} (${body.tradeType} timeframe) in English:
- Price: $${data.currentPrice}
- RSI: ${data.indicators.rsi}
- MACD Histogram: ${data.indicators.macd.histogram > 0 ? 'Positive' : 'Negative'}
- Trend: ${data.timeframes[0]?.trend} (${data.timeframes[0]?.strength}%)
- Support: $${data.levels.support[0]}, Resistance: $${data.levels.resistance[0]}

Be concise and give a trading perspective.`;

      const aiResult = await getGeminiInsight(aiPrompt, 'asset_scan', userId, body.symbol);
      const aiInsight = aiResult.text;

      return reply.send({
        success: true,
        data: { ...data, aiInsight },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      logger.error({ error }, 'Asset Scan error');
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to scan asset' },
      });
    }
  });

  /**
   * POST /api/analysis/safety-check
   * Step 3: Safety Check (5 credits)
   */
  app.post('/safety-check', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const body = assetScanSchema.parse(request.body);

    const cost = await creditCostsService.getCreditCost('STEP_SAFETY_CHECK');
    const chargeResult = await creditService.charge(userId, cost, 'analysis_step_3', {
      symbol: body.symbol,
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: { code: 'CREDIT_001', message: 'Insufficient credits', required: cost },
      });
    }

    try {
      const data = await analysisEngine.safetyCheck(body.symbol, body.tradeType);

      const aiPrompt = `You are a crypto risk analyst. Analyze this safety data for ${body.symbol} (${body.tradeType}) and give 2-3 sentences in English:
- Risk Level: ${data.riskLevel}
- Pump/Dump Risk: ${data.manipulation.pumpDumpRisk}
- Whale Activity: ${data.whaleActivity.bias} (Net flow: $${Math.round(data.whaleActivity.netFlowUsd).toLocaleString()})
- Spoofing Detected: ${data.manipulation.spoofingDetected ? 'Yes' : 'No'}
- Wash Trading: ${data.manipulation.washTrading ? 'Yes' : 'No'}
- Smart Money: ${data.smartMoney.positioning}
- Warnings: ${data.warnings.join(', ') || 'None'}

Focus on risk assessment and trading implications.`;

      const aiResult = await getGeminiInsight(aiPrompt, 'safety_check', userId, body.symbol);
      const aiInsight = aiResult.text;

      return reply.send({
        success: true,
        data: { ...data, aiInsight },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      logger.error({ error }, 'Safety Check error');
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to perform safety check' },
      });
    }
  });

  /**
   * POST /api/analysis/timing
   * Step 4: Timing (3 credits)
   */
  app.post('/timing', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const body = assetScanSchema.parse(request.body);

    const cost = await creditCostsService.getCreditCost('STEP_TIMING');
    const chargeResult = await creditService.charge(userId, cost, 'analysis_step_4', {
      symbol: body.symbol,
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: { code: 'CREDIT_001', message: 'Insufficient credits', required: cost },
      });
    }

    try {
      const data = await analysisEngine.timingAnalysis(body.symbol, body.tradeType);

      const bestZone = data.entryZones[0];
      const aiPrompt = `You are a crypto timing analyst. Give brief entry advice for ${body.symbol} (${body.tradeType}) in English (2-3 sentences):
- Current Price: $${data.currentPrice}
- Optimal Entry: $${data.optimalEntry}
- Trade Now: ${data.tradeNow ? 'Yes' : 'No'}
- Best Entry Zone: $${bestZone?.priceLow || data.optimalEntry} - $${bestZone?.priceHigh || data.optimalEntry} (${bestZone?.eta || 'Now'})
- Conditions Met: ${data.conditions.filter(c => c.met).length}/${data.conditions.length}
- Wait For: ${data.waitFor?.event || 'Ready'}

Be specific about when to enter.`;

      const aiResult = await getGeminiInsight(aiPrompt, 'timing', userId, body.symbol);
      const aiInsight = aiResult.text;

      return reply.send({
        success: true,
        data: { ...data, aiInsight },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      logger.error({ error }, 'Timing error');
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to calculate timing' },
      });
    }
  });

  /**
   * POST /api/analysis/trade-plan
   * Step 5: Trade Plan (5 credits)
   */
  const tradePlanSchema = z.object({
    symbol: z.string().toUpperCase(),
    accountSize: z.number().optional().default(10000),
    tradeType: tradeTypeSchema,
  });

  app.post('/trade-plan', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const body = tradePlanSchema.parse(request.body);

    const cost = await creditCostsService.getCreditCost('STEP_TRADE_PLAN');
    const chargeResult = await creditService.charge(userId, cost, 'analysis_step_5', {
      symbol: body.symbol,
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: { code: 'CREDIT_001', message: 'Insufficient credits', required: cost },
      });
    }

    try {
      const data = await analysisEngine.tradePlan(body.symbol, body.accountSize, body.tradeType);

      const tpPrices = data.takeProfits.map(tp => `$${tp.price}`).join(', ');
      const aiPrompt = `You are a crypto trade planner. Summarize this trade plan for ${body.symbol} (${body.tradeType}) in English (2-3 sentences):
- Direction: ${data.direction.toUpperCase()}
- Entry Type: ${data.type}
- Average Entry: $${data.averageEntry}
- Entry Levels: ${data.entries.map(e => `$${e.price} (${e.percentage}%)`).join(', ')}
- Stop Loss: $${data.stopLoss.price} (${data.stopLoss.percentage}% risk)
- Take Profits: ${tpPrices}
- Risk/Reward: ${data.riskReward}:1
- Win Rate Estimate: ${data.winRateEstimate}%
- Position Size: ${data.positionSizePercent}% of portfolio
- Risk Amount: $${data.riskAmount}

Give practical trading advice.`;

      const aiResult = await getGeminiInsight(aiPrompt, 'trade_plan', userId, body.symbol);
      const aiInsight = aiResult.text;

      return reply.send({
        success: true,
        data: { ...data, aiInsight },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      logger.error({ error }, 'Trade Plan error');
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to generate trade plan' },
      });
    }
  });

  /**
   * POST /api/analysis/trap-check
   * Step 6: Trap Check (5 credits)
   */
  app.post('/trap-check', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const body = assetScanSchema.parse(request.body);

    const cost = await creditCostsService.getCreditCost('STEP_TRAP_CHECK');
    const chargeResult = await creditService.charge(userId, cost, 'analysis_step_6', {
      symbol: body.symbol,
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: { code: 'CREDIT_001', message: 'Insufficient credits', required: cost },
      });
    }

    try {
      const data = await analysisEngine.trapCheck(body.symbol, body.tradeType);

      const aiPrompt = `You are a crypto trap analyst. Analyze trap risk for ${body.symbol} (${body.tradeType}) in English (2-3 sentences):
- Risk Level: ${data.riskLevel}
- Bull Trap: ${data.traps.bullTrap ? `Yes at $${data.traps.bullTrapZone}` : 'No'}
- Bear Trap: ${data.traps.bearTrap ? `Yes at $${data.traps.bearTrapZone}` : 'No'}
- Fakeout Risk: ${data.traps.fakeoutRisk}
- Liquidity Grab Zones: ${data.traps.liquidityGrab.zones.map(z => `$${z}`).join(', ') || 'None'}
- Stop Hunt Zones: ${data.traps.stopHuntZones.map(z => `$${z}`).join(', ') || 'None'}
- Counter Strategies: ${data.counterStrategy.join('; ')}

Warn about potential traps and give protective advice.`;

      const aiResult = await getGeminiInsight(aiPrompt, 'trap_check', userId, body.symbol);
      const aiInsight = aiResult.text;

      return reply.send({
        success: true,
        data: { ...data, aiInsight },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      logger.error({ error }, 'Trap Check error');
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to check for traps' },
      });
    }
  });

  /**
   * POST /api/analysis/full
   * Full Analysis Bundle (15 credits)
   */
  // Analysis method schema
  const analysisMethodSchema = z.enum(['classic', 'mlis_pro']).optional().default('classic');

  const fullAnalysisSchema = z.object({
    symbol: z.string().toUpperCase(),
    accountSize: z.number().optional().default(10000),
    interval: intervalSchema,
    tradeType: tradeTypeSchema.optional(),
    method: analysisMethodSchema,
  });

  app.post('/full', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const isAdmin = getUser(request).isAdmin || false;
    const body = fullAnalysisSchema.parse(request.body);
    // Resolve tradeType from interval if provided
    const tradeType = resolveTradeType(body.interval, body.tradeType as TradeType);
    // Use the interval if provided, otherwise derive from tradeType
    // Mapping: scalping=15m, dayTrade=1h, swing=1d
    const interval = body.interval || (tradeType === 'scalping' ? '15m' : tradeType === 'dayTrade' ? '1h' : '1d');

    // Check for Daily Pass system (100 credits/day, max 10 analyses)
    // Admin users bypass the daily pass system
    let usedDailyPass = false;
    if (!isAdmin) {
      const { dailyPassService } = await import('../passes/daily-pass.service');
      const passCheck = await dailyPassService.checkPass(userId, 'ASSET_ANALYSIS');

      if (!passCheck.hasPass) {
        // User doesn't have a daily pass - they need to purchase one
        return reply.status(402).send({
          success: false,
          error: {
            code: 'DAILY_PASS_REQUIRED',
            message: 'A Daily Analysis Pass is required. Purchase for 100 credits to get 10 analyses today.',
            required: 100,
            passType: 'ASSET_ANALYSIS',
            purchaseUrl: '/api/passes/purchase',
          },
        });
      }

      if (!passCheck.canUse) {
        // User has a pass but reached daily limit
        return reply.status(402).send({
          success: false,
          error: {
            code: 'DAILY_LIMIT_REACHED',
            message: 'Daily analysis limit reached (10/10). Your pass will reset at midnight UTC.',
            usageCount: passCheck.pass?.usageCount || 0,
            maxUsage: passCheck.pass?.maxUsage || 10,
            expiresAt: passCheck.pass?.expiresAt,
          },
        });
      }

      // Use the daily pass
      const useResult = await dailyPassService.usePass(userId, 'ASSET_ANALYSIS');
      if (!useResult.success) {
        return reply.status(402).send({
          success: false,
          error: {
            code: 'PASS_USE_FAILED',
            message: useResult.error || 'Failed to use daily pass',
          },
        });
      }
      usedDailyPass = true;
    }

    // For admin users, still log the cost but don't charge (legacy behavior)
    const cost = isAdmin ? 0 : 0; // No per-analysis cost when using daily pass

    try {
      // Check if MLIS Pro method is requested
      if (body.method === 'mlis_pro') {
        logger.info({ symbol: body.symbol, interval }, '[MLIS] Starting analysis');

        // Run MLIS Pro analysis
        let mlisResult: MLISResult;
        try {
          mlisResult = await analyzeMLIS(body.symbol, interval);
          logger.info({
            symbol: body.symbol,
            overallScore: mlisResult.overallScore,
            recommendation: mlisResult.recommendation,
            direction: mlisResult.direction,
            hasLayers: !!mlisResult.layers,
          }, '[MLIS] Analysis completed');
        } catch (mlisError) {
          logger.error({ symbol: body.symbol, error: mlisError }, '[MLIS] Analysis failed');
          throw new Error(`MLIS analysis failed: ${mlisError instanceof Error ? mlisError.message : 'Unknown error'}`);
        }

        // Save MLIS analysis to database with adapted format
        const savedAnalysis = await prisma.analysis.create({
          data: {
            userId,
            symbol: body.symbol,
            interval: interval,
            method: 'mlis_pro', // Explicitly set method for MLIS
            stepsCompleted: [1, 2, 3, 4, 5, 6, 7], // Mark all steps as completed
            step1Result: { mlis: true, layer: 'technical', ...mlisResult.layers.technical } as object,
            step2Result: { mlis: true, layer: 'momentum', ...mlisResult.layers.momentum } as object,
            step3Result: { mlis: true, layer: 'volatility', ...mlisResult.layers.volatility } as object,
            step4Result: { mlis: true, layer: 'volume', ...mlisResult.layers.volume } as object,
            step5Result: { mlis: true, layer: 'sentiment', score: mlisResult.layers.sentiment?.score || 50 } as object,
            step6Result: { mlis: true, layer: 'onchain', score: mlisResult.layers.onchain?.score || 50 } as object,
            step7Result: {
              mlis: true,
              overallScore: mlisResult.overallScore,
              confidence: mlisResult.confidence,
              recommendation: mlisResult.recommendation,
              direction: mlisResult.direction,
              riskLevel: mlisResult.riskLevel,
              volatilityRegime: mlisResult.volatilityRegime,
              keySignals: mlisResult.keySignals,
              riskFactors: mlisResult.riskFactors,
              verdict: mlisResult.recommendation === 'STRONG_BUY' || mlisResult.recommendation === 'BUY' ? 'go' :
                       mlisResult.recommendation === 'HOLD' ? 'wait' : 'avoid',
            } as object,
            totalScore: mlisResult.overallScore / 10, // Convert 0-100 to 0-10 scale
            creditsSpent: cost,
          },
        });

        // Check for daily analysis bonus
        await creditService.checkDailyAnalysisBonus(userId);

        // Trade type completion bonus
        const tradeTypeBonus = tradeType === 'scalping' ? 3 : tradeType === 'dayTrade' ? 2 : 1;
        await creditService.add(
          userId,
          tradeTypeBonus,
          'BONUS',
          'trade_type_completion_bonus',
          {
            tradeType,
            symbol: body.symbol,
            analysisId: savedAnalysis.id,
          }
        );

        logger.info({ analysisId: savedAnalysis.id }, '[MLIS] Analysis saved to database');

        // Return MLIS result
        const responseData = {
          analysisId: savedAnalysis.id,
          method: 'mlis_pro',
          symbol: body.symbol,
          interval,
          tradeType,
          ...mlisResult,
          // Add compatibility fields for existing UI
          step1Result: { mlis: true, score: mlisResult.layers.technical.score },
          step2Result: { mlis: true, score: mlisResult.layers.momentum.score },
          step3Result: { mlis: true, score: mlisResult.layers.volatility.score },
          step4Result: { mlis: true, score: mlisResult.layers.volume.score },
          step5Result: { mlis: true, score: mlisResult.layers.sentiment?.score || 50 },
          step6Result: { mlis: true, score: mlisResult.layers.onchain?.score || 50 },
          step7Result: {
            overallScore: mlisResult.overallScore / 10,
            verdict: mlisResult.recommendation === 'STRONG_BUY' || mlisResult.recommendation === 'BUY' ? 'go' :
                     mlisResult.recommendation === 'HOLD' ? 'wait' : 'avoid',
            recommendation: mlisResult.recommendation,
            direction: mlisResult.direction,
          },
          tradePlan: null, // MLIS doesn't generate trade plans
          creditsUsed: cost,
          bonusCredits: tradeTypeBonus,
        };

        logger.info({ symbol: body.symbol }, '[MLIS] Sending response');

        // Get current credit balance
        const creditBalance = await prisma.creditBalance.findUnique({
          where: { userId },
          select: { balance: true },
        });

        return reply.send({
          success: true,
          data: responseData,
          creditsSpent: cost,
          remainingCredits: creditBalance?.balance ?? 0,
          dailyPassUsed: usedDailyPass,
        });
      }

      // Classic 7-step analysis
      // Step 1-5: Run all prerequisite analysis steps in parallel
      // All steps use trade type specific timeframes and indicators
      const [marketPulse, assetScan, safetyCheck, timing, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(body.symbol, tradeType),
        analysisEngine.safetyCheck(body.symbol, tradeType),
        analysisEngine.timingAnalysis(body.symbol, tradeType),
        analysisEngine.trapCheck(body.symbol, tradeType),
      ]);

      // Step 6: Preliminary Verdict - decides GO/WAIT/AVOID BEFORE trade plan
      const preliminaryVerdict = analysisEngine.preliminaryVerdict(body.symbol, {
        marketPulse,
        assetScan,
        safetyCheck,
        timing,
        trapCheck,
      });

      // Step 7: Integrated Trade Plan - only generated for GO/CONDITIONAL_GO signals
      // Uses ALL previous step data for intelligent decision making
      const tradePlan = await analysisEngine.integratedTradePlan(
        body.symbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        body.accountSize
      );

      // Step 7.5: Apply Capital Flow Modifier to Trade Plan confidence
      // "Para nereye akıyorsa potansiyel oradadır" - Capital Flow integration
      let capitalFlowModifier: CapitalFlowModifier | null = null;
      if (tradePlan) {
        try {
          // Get asset market type (crypto, stocks, bonds, metals)
          const assetMarket = getAssetClass(body.symbol) as MarketType;
          const direction = tradePlan.direction?.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';

          // Get Capital Flow modifier based on global liquidity, market phase, and flow direction
          capitalFlowModifier = await getCapitalFlowModifier(assetMarket, direction);

          // Apply modifier to trade plan confidence
          // Original confidence × Capital Flow modifier = Adjusted confidence
          const originalConfidence = tradePlan.confidence;
          const adjustedConfidence = Math.min(100, Math.max(0, originalConfidence * capitalFlowModifier.modifier));
          tradePlan.confidence = adjustedConfidence;

          // Add Capital Flow context to trade plan
          (tradePlan as Record<string, unknown>).capitalFlowContext = {
            originalConfidence,
            adjustedConfidence,
            modifier: capitalFlowModifier.modifier,
            fiveFactorScore: capitalFlowModifier.fiveFactorScore,
            phase: capitalFlowModifier.phase,
            phaseModifier: capitalFlowModifier.phaseModifier,
            marketAlignment: capitalFlowModifier.marketAlignment,
            action: capitalFlowModifier.action,
            riskAdjustment: capitalFlowModifier.riskAdjustment,
            reason: capitalFlowModifier.reason,
          };

          logger.info({
            symbol: body.symbol,
            assetMarket,
            direction,
            originalConfidence,
            adjustedConfidence,
            modifier: capitalFlowModifier.modifier,
            fiveFactorScore: capitalFlowModifier.fiveFactorScore,
            phase: capitalFlowModifier.phase,
          }, '[Analysis] Capital Flow modifier applied');
        } catch (cfError) {
          // Capital Flow integration is non-blocking - log error and continue
          logger.warn({ error: cfError, symbol: body.symbol }, '[Analysis] Capital Flow modifier failed, using original confidence');
        }
      }

      // Step 8: Final Verdict - combines everything
      const verdict = await analysisEngine.getFinalVerdict(
        body.symbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        tradePlan,
        tradeType
      );

      // Save analysis to database (regardless of verdict)
      // Use the interval from request, not derived from tradeConfig
      const savedAnalysis = await prisma.analysis.create({
        data: {
          userId,
          symbol: body.symbol,
          interval: interval, // Use the selected timeframe
          stepsCompleted: [1, 2, 3, 4, 5, 6, 7],
          step1Result: marketPulse as object,
          step2Result: assetScan as object,
          step3Result: safetyCheck as object,
          step4Result: timing as object,
          step5Result: tradePlan as object || null,
          step6Result: trapCheck as object,
          step7Result: { ...verdict, preliminaryVerdict } as object,
          totalScore: verdict.overallScore,
          creditsSpent: cost,
        },
      });

      // Check for daily analysis bonus (1 credit per 10 analyses)
      await creditService.checkDailyAnalysisBonus(userId);

      // Trade type completion bonus
      // Scalping: +3 credits (higher risk, faster trades)
      // Day Trade: +2 credits
      // Swing Trade: +1 credit
      const tradeTypeBonus = tradeType === 'scalping' ? 3 : tradeType === 'dayTrade' ? 2 : 1;
      await creditService.add(
        userId,
        tradeTypeBonus,
        'BONUS',
        'trade_type_completion_bonus',
        {
          tradeType,
          symbol: body.symbol,
          analysisId: savedAnalysis.id,
        }
      );

      // Send analysis completion notifications (Telegram, Discord only) - fire and forget
      // NOTE: Automatic email removed - users can send email manually from Recent Analyses
      (async () => {
        try {
          // Get user with notification settings
          const userWithNotifs = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, telegramChatId: true, discordWebhookUrl: true },
          });

          if (!userWithNotifs) return;

          // Only send if user has social notifications configured
          if (!userWithNotifs.telegramChatId && !userWithNotifs.discordWebhookUrl) return;

          const notifData = {
            symbol: body.symbol,
            verdict: verdict.verdict,
            score: verdict.overallScore,
            direction: tradePlan?.direction || 'neutral',
            entryPrice: tradePlan?.averageEntry ? `$${tradePlan.averageEntry}` : 'N/A',
            stopLoss: tradePlan?.stopLoss?.price ? `$${tradePlan.stopLoss.price}` : 'N/A',
            takeProfit1: tradePlan?.takeProfits?.[0]?.price ? `$${tradePlan.takeProfits[0].price}` : 'N/A',
            tradeType: tradeType === 'scalping' ? 'Scalping' : tradeType === 'dayTrade' ? 'Day Trade' : 'Swing Trade',
          };

          // Send social notifications (Telegram, Discord)
          const { socialNotificationService } = await import('../notifications/social-notification.service');
          await socialNotificationService.sendAnalysisSummaryNotifications(userWithNotifs, notifData);
        } catch (notifError) {
          logger.error({ error: notifError, symbol: body.symbol }, '[Analysis] Notification error');
        }
      })();

      // Build AI prompt based on whether trade plan exists
      const tradeTypeLabel = tradeType === 'scalping' ? 'scalping (15min-2h)' : tradeType === 'dayTrade' ? 'day trading (2-24 hours)' : 'swing trading (1-14 days)';
      let aiPrompt: string;
      if (tradePlan) {
        aiPrompt = `You are a senior crypto analyst. Give a comprehensive ${tradeTypeLabel} recommendation for ${body.symbol} in English (4-5 sentences):

Market Analysis:
- Fear & Greed: ${marketPulse.fearGreedIndex} (${marketPulse.fearGreedLabel})
- Market Regime: ${marketPulse.marketRegime}
- BTC Dominance: ${marketPulse.btcDominance}%
- Trend: ${marketPulse.trend.direction} (${marketPulse.trend.strength}% strength)

Asset Analysis:
- Price: $${assetScan.currentPrice}
- 24h Change: ${assetScan.priceChange24h.toFixed(2)}%
- Multi-TF Trend: ${assetScan.timeframes.map(t => `${t.tf}:${t.trend}`).join(', ')}
- RSI: ${assetScan.indicators.rsi}
- MACD: ${assetScan.indicators.macd.histogram > 0 ? 'Positive' : 'Negative'}

Risk Assessment:
- Safety Risk Level: ${safetyCheck.riskLevel}
- Manipulation Risk: ${safetyCheck.manipulation.pumpDumpRisk}
- Whale Bias: ${safetyCheck.whaleActivity.bias}
- Trap Risk: ${trapCheck.riskLevel}
- Bull/Bear Trap: ${trapCheck.traps.bullTrap ? 'Bull Trap Warning' : trapCheck.traps.bearTrap ? 'Bear Trap Warning' : 'None'}

Trade Plan (Sources: ${tradePlan.sources.direction.join(', ')}):
- Direction: ${tradePlan.direction.toUpperCase()} (Confidence: ${tradePlan.confidence.toFixed(0)}%)
- Average Entry: $${tradePlan.averageEntry}
- Entry Sources: ${tradePlan.sources.entries.join(', ')}
- Stop Loss: $${tradePlan.stopLoss.price} (${tradePlan.stopLoss.percentage}% risk) - ${tradePlan.stopLoss.safetyAdjusted ? 'Safety adjusted' : 'Standard'}
- Take Profit 1: $${tradePlan.takeProfits[0]?.price ?? tradePlan.averageEntry}
- Risk/Reward: ${tradePlan.riskReward}:1
- Win Rate: ${tradePlan.winRateEstimate}%
- Position Size: ${tradePlan.positionSizePercent}% of portfolio

Final Verdict: ${verdict.verdict.toUpperCase()} (Score: ${verdict.overallScore}/10)
Recommendation: ${verdict.recommendation}

Give a clear, actionable trading recommendation with specific entry, stop loss, and target prices.`;
      } else {
        // No trade plan - WAIT/AVOID verdict
        aiPrompt = `You are a senior crypto analyst. Explain why ${tradeTypeLabel} ${body.symbol} is NOT recommended right now (3-4 sentences):

Market Analysis:
- Fear & Greed: ${marketPulse.fearGreedIndex} (${marketPulse.fearGreedLabel})
- Market Regime: ${marketPulse.marketRegime}
- Trend: ${marketPulse.trend.direction} (${marketPulse.trend.strength}% strength)

Asset Analysis:
- Price: $${assetScan.currentPrice}
- 24h Change: ${assetScan.priceChange24h.toFixed(2)}%
- RSI: ${assetScan.indicators.rsi}

Risk Assessment:
- Safety Risk Level: ${safetyCheck.riskLevel}
- Manipulation Risk: ${safetyCheck.manipulation.pumpDumpRisk}
- Trap Risk: ${trapCheck.riskLevel}

Decision Factors:
${preliminaryVerdict.reasons.filter(r => !r.positive).map(r => `- ${r.factor} (${r.source})`).join('\n')}

Final Verdict: ${verdict.verdict.toUpperCase()} (Score: ${verdict.overallScore}/10)
Direction Confidence: ${preliminaryVerdict.confidence.toFixed(0)}%

Explain the key risks and what conditions would need to change before trading this asset.`;
      }

      const aiResult = await getGeminiInsight(aiPrompt, 'analysis_full', userId, body.symbol);
      const aiVerdict = aiResult.text;

      // Get current credit balance
      const creditBalance = await prisma.creditBalance.findUnique({
        where: { userId },
        select: { balance: true },
      });

      return reply.send({
        success: true,
        data: {
          analysisId: savedAnalysis.id, // Use saved analysis ID from database
          symbol: body.symbol,
          interval, // Include selected timeframe
          tradeType, // Include derived trade type
          timestamp: verdict.createdAt,
          expiresAt: verdict.expiresAt,
          overallScore: verdict.overallScore,
          verdict: verdict.verdict,
          hasTradePlan: verdict.hasTradePlan,
          steps: {
            marketPulse,
            assetScan,
            safetyCheck,
            timing,
            tradePlan, // Will be null for WAIT/AVOID
            trapCheck,
            preliminaryVerdict, // New: includes direction sources and reasons
            verdict: { ...verdict, aiVerdict },
          },
        },
        creditsSpent: cost,
        remainingCredits: creditBalance?.balance ?? 0,
        dailyPassUsed: usedDailyPass,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, errorMessage }, 'Full Analysis error');
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: `Failed to complete analysis: ${errorMessage}` },
      });
    }
  });

  /**
   * GET /api/analysis/history
   * List user's past analyses (saved to database)
   */
  app.get('/history', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const limit = safeParseInt(request.query.limit, 20, 1, 50);
      const offset = safeParseInt(request.query.offset, 0, 0, 10000);

      const analyses = await prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          symbol: true,
          interval: true,
          totalScore: true,
          creditsSpent: true,
          createdAt: true,
          expiresAt: true,
          step5Result: true, // Contains tradePlan info
          step7Result: true, // Contains verdict info
        },
      });

      const total = await prisma.analysis.count({ where: { userId } });

      // Extract verdict and tradePlan from step results for each analysis
      const enrichedAnalyses = analyses.map((a) => {
        const verdictData = a.step7Result as Record<string, unknown> | null;
        const tradePlan = a.step5Result as Record<string, unknown> | null;
        const stopLossData = tradePlan?.stopLoss as Record<string, unknown> | null;
        const takeProfits = tradePlan?.takeProfits as Array<{ price: number; percentage: number }> | null;

        return {
          id: a.id,
          symbol: a.symbol,
          interval: a.interval,
          totalScore: a.totalScore,
          verdict: verdictData?.verdict || 'N/A',
          hasTradePlan: verdictData?.hasTradePlan || !!tradePlan,
          direction: tradePlan?.direction || null,
          entryPrice: tradePlan?.averageEntry || tradePlan?.entryPrice || null,
          stopLoss: stopLossData?.price || null,
          takeProfit1: takeProfits?.[0]?.price || null,
          takeProfit2: takeProfits?.[1]?.price || null,
          takeProfit3: takeProfits?.[2]?.price || null,
          creditsSpent: a.creditsSpent,
          createdAt: a.createdAt,
          expiresAt: a.expiresAt,
        };
      });

      return reply.send({
        success: true,
        data: {
          analyses: enrichedAnalyses,
          pagination: { total, limit, offset },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Analysis history error');
      return reply.status(500).send({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch analysis history' },
      });
    }
  });

  /**
   * GET /api/analysis/:id
   * Get a specific analysis by ID
   * User can access if they own it OR have purchased it
   */
  app.get('/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const { id } = request.params;

      // First, find the analysis (without user filter)
      const analysis = await prisma.analysis.findUnique({
        where: { id },
      });

      if (!analysis) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Analysis not found' },
        });
      }

      // Check if user owns this analysis
      const isOwner = analysis.userId === userId;

      // If not owner, check if they've purchased access
      let hasPurchased = false;
      if (!isOwner) {
        const existingPurchase = await prisma.creditTransaction.findFirst({
          where: {
            userId,
            source: 'analysis_purchase',
            metadata: {
              path: ['analysisId'],
              equals: id,
            },
          },
        });
        hasPurchased = !!existingPurchase;
      }

      // If user doesn't own it and hasn't purchased it, deny access
      if (!isOwner && !hasPurchased) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You need to purchase this analysis to view it',
            purchaseCost: 15,
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          ...analysis,
          accessType: isOwner ? 'owner' : 'purchased',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get analysis error');
      return reply.status(500).send({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch analysis' },
      });
    }
  });

  /**
   * GET /api/analysis/live-prices
   * Get current prices for user's analyses with trade plans
   * Returns current price and unrealized P/L for each analysis
   */
  app.get('/live-prices', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;

      // Get user's analyses with trade plans (have entry price)
      const analyses = await prisma.analysis.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() }, // Only active analyses
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          symbol: true,
          interval: true,
          method: true, // 'classic' or 'mlis_pro'
          totalScore: true,
          step5Result: true, // tradePlan
          step7Result: true, // verdict
          outcome: true, // TP/SL hit status
          outcomePrice: true,
          outcomeAt: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      if (analyses.length === 0) {
        return reply.send({
          success: true,
          data: { analyses: [], nextRefresh: null },
        });
      }

      // Extract unique symbols
      const symbols = [...new Set(analyses.map(a => a.symbol as string))];

      // Fetch current prices from Binance
      const prices: Record<string, number> = {};
      try {
        const pairs = symbols.map((s: string) => `"${s.toUpperCase()}USDT"`).join(',');
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
        );
        if (response.ok) {
          const responseText = await response.text();
          if (responseText && responseText.trim() !== '') {
            const data = JSON.parse(responseText) as Array<{ symbol: string; price: string }>;
            for (const item of data) {
              const symbol = item.symbol.replace('USDT', '');
              prices[symbol] = parseFloat(item.price);
            }
          }
        }
      } catch (err) {
        logger.warn({ error: err }, 'Failed to fetch prices');
      }

      // Calculate next candle close time based on intervals present
      const intervals = [...new Set(analyses.map(a => a.interval as string))];
      const nextCandleCloses: Record<string, number> = {};
      const now = Date.now();

      for (const interval of intervals) {
        if (!interval) continue;
        let intervalMs = 0;
        if (interval === '5m') intervalMs = 5 * 60 * 1000;
        else if (interval === '15m') intervalMs = 15 * 60 * 1000;
        else if (interval === '1h') intervalMs = 60 * 60 * 1000;
        else if (interval === '4h') intervalMs = 4 * 60 * 60 * 1000;
        else if (interval === '1d' || interval === '1D') intervalMs = 24 * 60 * 60 * 1000;

        if (intervalMs > 0) {
          // Calculate next candle close (aligned to interval)
          const nextClose = Math.ceil(now / intervalMs) * intervalMs;
          nextCandleCloses[interval as string] = nextClose;
        }
      }

      // Find the soonest candle close for refresh timing
      const allNextCloses = Object.values(nextCandleCloses);
      const nextRefresh = allNextCloses.length > 0 ? Math.min(...allNextCloses) : null;

      // Enrich analyses with current price, P/L, and TP/SL hit detection
      const analysesToUpdate: Array<{ id: string; outcome: string; outcomePrice: number }> = [];

      const enrichedAnalyses = analyses.map(a => {
        const tradePlan = a.step5Result as Record<string, unknown> | null;
        const verdictData = a.step7Result as Record<string, unknown> | null;

        const entryPrice = tradePlan?.averageEntry as number || tradePlan?.entryPrice as number || null;
        const direction = (tradePlan?.direction as string || 'long').toLowerCase();
        const currentPrice = prices[a.symbol] || null;

        let unrealizedPnL: number | null = null;
        if (entryPrice && currentPrice) {
          const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
          unrealizedPnL = direction === 'short' ? -pnlPercent : pnlPercent;
        }

        const stopLossData = tradePlan?.stopLoss as Record<string, unknown> | null;
        const takeProfits = tradePlan?.takeProfits as Array<{ price: number }> | null;

        const stopLoss = stopLossData?.price as number || null;
        const tp1 = takeProfits?.[0]?.price || null;
        const tp2 = takeProfits?.[1]?.price || null;
        const tp3 = takeProfits?.[2]?.price || null;

        // Calculate target progress (% towards TP3 as max target)
        // TP progress is relative to TP3: if TP1 hit, shows TP1/TP3 ratio
        let tpProgress: number | null = null;
        let distanceToTP1: number | null = null;
        let distanceToSL: number | null = null;

        if (entryPrice && currentPrice && tp1) {
          const isLong = direction === 'long';
          // Use TP3 as max target, fall back to TP2, then TP1
          const maxTarget = tp3 || tp2 || tp1;
          const totalDistance = isLong ? (maxTarget - entryPrice) : (entryPrice - maxTarget);
          const coveredDistance = isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
          tpProgress = totalDistance !== 0 ? Math.min(100, Math.max(-100, (coveredDistance / totalDistance) * 100)) : 0;
          distanceToTP1 = ((tp1 - currentPrice) / currentPrice) * 100;
        }

        if (currentPrice && stopLoss) {
          distanceToSL = ((stopLoss - currentPrice) / currentPrice) * 100;
        }

        // Check if TP/SL was hit (only if not already recorded)
        let outcome = a.outcome;
        let outcomePrice = a.outcomePrice ? Number(a.outcomePrice) : null;

        if (!outcome && entryPrice && currentPrice) {
          const isLong = direction === 'long';

          // Check TPs (highest first for better outcome)
          if (tp3 && (isLong ? currentPrice >= tp3 : currentPrice <= tp3)) {
            outcome = 'tp3_hit';
            outcomePrice = currentPrice;
            analysesToUpdate.push({ id: a.id, outcome, outcomePrice });
          } else if (tp2 && (isLong ? currentPrice >= tp2 : currentPrice <= tp2)) {
            outcome = 'tp2_hit';
            outcomePrice = currentPrice;
            analysesToUpdate.push({ id: a.id, outcome, outcomePrice });
          } else if (tp1 && (isLong ? currentPrice >= tp1 : currentPrice <= tp1)) {
            outcome = 'tp1_hit';
            outcomePrice = currentPrice;
            analysesToUpdate.push({ id: a.id, outcome, outcomePrice });
          } else if (stopLoss && (isLong ? currentPrice <= stopLoss : currentPrice >= stopLoss)) {
            outcome = 'sl_hit';
            outcomePrice = currentPrice;
            analysesToUpdate.push({ id: a.id, outcome, outcomePrice });
          }
        }

        // Get totalScore from database field, or fall back to step7Result.overallScore
        const scoreFromDb = a.totalScore ? Number(a.totalScore) : null;
        const scoreFromVerdict = typeof verdictData?.overallScore === 'number' ? verdictData.overallScore : null;
        const finalScore = scoreFromDb ?? scoreFromVerdict;

        return {
          id: a.id,
          symbol: a.symbol,
          interval: a.interval,
          method: a.method || 'classic', // Analysis method: 'classic' or 'mlis_pro'
          totalScore: finalScore,
          direction,
          entryPrice,
          currentPrice,
          unrealizedPnL,
          stopLoss,
          takeProfit1: tp1,
          takeProfit2: tp2,
          takeProfit3: tp3,
          // NEW: Target progress and distance fields
          tpProgress,
          distanceToTP1,
          distanceToSL,
          outcome,
          outcomePrice,
          outcomeAt: a.outcomeAt,
          verdict: verdictData?.verdict || 'N/A',
          hasTradePlan: !!tradePlan && !!entryPrice,
          nextCandleClose: a.interval ? nextCandleCloses[a.interval] : null,
          createdAt: a.createdAt,
          expiresAt: a.expiresAt,
        };
      });

      // Update analyses with new outcomes (fire and forget)
      if (analysesToUpdate.length > 0) {
        Promise.all(
          analysesToUpdate.map(update =>
            prisma.analysis.update({
              where: { id: update.id },
              data: {
                outcome: update.outcome,
                outcomePrice: update.outcomePrice,
                outcomeAt: new Date(),
              },
            })
          )
        ).catch(err => logger.warn({ error: err }, 'Failed to update analysis outcomes'));
      }

      return reply.send({
        success: true,
        data: {
          analyses: enrichedAnalyses,
          prices,
          nextRefresh,
          nextCandleCloses,
          serverTime: now,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Live prices error');
      return reply.status(500).send({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch live prices' },
      });
    }
  });

  /**
   * GET /api/analysis/platform-stats
   * Platform-wide statistics for trust building (public)
   * All data is calculated from ANALYSIS table only
   */
  app.get('/platform-stats', async (request: FastifyRequest<{ Querystring: { period?: string } }>, reply: FastifyReply) => {
    try {
      const db = prisma;
      const now = Date.now();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      // Get all analyses with their data
      const analyses = await db.analysis.findMany({
        select: {
          id: true,
          totalScore: true,
          outcome: true,
          outcomePrice: true,
          outcomeAt: true,
          step5Result: true, // tradePlan
          step7Result: true, // verdict
          createdAt: true,
        },
      });

      // Basic counts
      const totalUsers = await db.user.count();
      const totalAnalyses = analyses.length;
      const dailyAnalyses = analyses.filter(a => a.createdAt >= oneDayAgo).length;
      const weeklyAnalyses = analyses.filter(a => a.createdAt >= sevenDaysAgo).length;
      const monthlyAnalyses = analyses.filter(a => a.createdAt >= thirtyDaysAgo).length;

      // Verdict distribution from step7Result
      const verdictDistribution: Record<string, number> = {
        go: 0,
        conditional_go: 0,
        wait: 0,
        avoid: 0
      };

      analyses.forEach(a => {
        const step7 = a.step7Result as Record<string, unknown> | null;
        const verdict = ((step7?.verdict || step7?.action || '') as string).toLowerCase();
        if (verdict === 'go' || verdict === 'go!') {
          verdictDistribution['go']++;
        } else if (verdict === 'conditional_go' || verdict === 'conditionalgo' || verdict === 'conditional') {
          verdictDistribution['conditional_go']++;
        } else if (verdict === 'wait') {
          verdictDistribution['wait']++;
        } else if (verdict === 'avoid' || verdict === 'no_go') {
          verdictDistribution['avoid']++;
        }
      });

      // Closed analyses (have outcome: tp1_hit, tp2_hit, tp3_hit, sl_hit)
      const closedAnalyses = analyses.filter(a =>
        a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit' || a.outcome === 'sl_hit'
      );
      const closedCount = closedAnalyses.length;

      // TP hits (correct predictions)
      const tpHits = closedAnalyses.filter(a =>
        a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit'
      ).length;

      // SL hits (incorrect predictions)
      const slHits = closedAnalyses.filter(a => a.outcome === 'sl_hit').length;

      // Calculate REAL Total P/L % using entry price and outcome price
      let totalPnLSum = 0;
      let validPnLCount = 0;
      closedAnalyses.forEach(a => {
        const step5 = a.step5Result as Record<string, unknown> | null;
        const entryPrice = Number(step5?.averageEntry || step5?.entryPrice || 0);
        const outcomePrice = a.outcomePrice ? Number(a.outcomePrice) : 0;
        const direction = ((step5?.direction as string) || 'long').toLowerCase();

        if (entryPrice > 0 && outcomePrice > 0) {
          let pnl = 0;
          if (direction === 'short') {
            pnl = ((entryPrice - outcomePrice) / entryPrice) * 100;
          } else {
            pnl = ((outcomePrice - entryPrice) / entryPrice) * 100;
          }
          totalPnLSum += pnl;
          validPnLCount++;
        }
      });
      const totalPnL = validPnLCount > 0 ? Number(totalPnLSum.toFixed(1)) : 0;

      // Daily closed analyses for "Past 24h" metric (using outcomeAt)
      const dailyClosedAnalyses = closedAnalyses.filter(a =>
        a.outcomeAt && new Date(a.outcomeAt) >= oneDayAgo
      );
      let dailyPnLSum = 0;
      let dailyValidCount = 0;
      dailyClosedAnalyses.forEach(a => {
        const step5 = a.step5Result as Record<string, unknown> | null;
        const entryPrice = Number(step5?.averageEntry || step5?.entryPrice || 0);
        const outcomePrice = a.outcomePrice ? Number(a.outcomePrice) : 0;
        const direction = ((step5?.direction as string) || 'long').toLowerCase();

        if (entryPrice > 0 && outcomePrice > 0) {
          let pnl = 0;
          if (direction === 'short') {
            pnl = ((entryPrice - outcomePrice) / entryPrice) * 100;
          } else {
            pnl = ((outcomePrice - entryPrice) / entryPrice) * 100;
          }
          dailyPnLSum += pnl;
          dailyValidCount++;
        }
      });
      const dailyPnL = dailyValidCount > 0 ? Number(dailyPnLSum.toFixed(1)) : 0;
      const dailyClosedCount = dailyClosedAnalyses.length;

      // Platform accuracy = TP hits / closed * 100
      const platformAccuracy = closedCount > 0
        ? Number(((tpHits / closedCount) * 100).toFixed(1))
        : 0;

      // Average score from totalScore
      const scores = analyses
        .filter(a => a.totalScore !== null)
        .map(a => Number(a.totalScore));
      const avgScore = scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : 0;

      // GO Signal statistics (analyses with trade plans = GO/CONDITIONAL_GO)
      const goSignalAnalyses = analyses.filter(a => {
        const step7 = a.step7Result as Record<string, unknown> | null;
        const verdict = ((step7?.verdict || step7?.action || '') as string).toLowerCase();
        return (verdict.includes('go') || verdict.includes('conditional')) && !verdict.includes('wait') && !verdict.includes('avoid');
      });

      const goSignalsClosed = goSignalAnalyses.filter(a =>
        a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit' || a.outcome === 'sl_hit'
      );
      const goCorrect = goSignalsClosed.filter(a =>
        a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit'
      ).length;
      const goIncorrect = goSignalsClosed.filter(a => a.outcome === 'sl_hit').length;
      const goPending = goSignalAnalyses.length - goSignalsClosed.length;
      const goTotal = goCorrect + goIncorrect;
      const goAccuracy = goTotal > 0 ? Number(((goCorrect / goTotal) * 100).toFixed(1)) : 0;

      // Analyses with trade plan (step5Result not null)
      const analysesWithPlan = analyses.filter(a => a.step5Result !== null).length;

      // Get platform creation date from first user
      const firstUser = await db.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });

      const platformSince = firstUser
        ? firstUser.createdAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return reply.send({
        success: true,
        data: {
          platform: {
            totalUsers,
            totalAnalyses,
            dailyAnalyses,
            weeklyAnalyses,
            monthlyAnalyses,
            platformSince,
          },
          accuracy: {
            overall: platformAccuracy,
            avgScore,
            closedCount,
            tpHits,
            slHits,
            totalPnL,
            lastUpdated: new Date().toISOString(),
            methodology: closedCount > 0 ? 'outcome-verified' : 'score-based',
            sampleSize: closedCount > 0 ? closedCount : scores.length,
          },
          daily: {
            analyses: dailyAnalyses,
            closedCount: dailyClosedCount,
            pnl: dailyPnL,
          },
          goSignalRate: {
            rate: goAccuracy,
            goCorrect,
            goIncorrect,
            pending: goPending,
            totalVerified: goTotal,
            totalSignals: goSignalAnalyses.length,
            description: 'Success rate of GO/CONDITIONAL_GO signals (TP hit vs SL hit)'
          },
          verdicts: verdictDistribution,
          coverage: {
            totalAnalyses,
            withTradePlan: analysesWithPlan,
            tradePlanPercentage: totalAnalyses > 0
              ? Number(((analysesWithPlan / totalAnalyses) * 100).toFixed(1))
              : 0
          },
          dataQuality: {
            dataSourcesCount: 12,
            indicatorsUsed: 47,
            timeframesAnalyzed: 6,
            updateFrequency: 'real-time'
          }
        }
      });
    } catch (error) {
      logger.error({ error }, 'Platform stats error');
      return reply.status(500).send({
        success: false,
        error: { code: 'PLATFORM_STATS_ERROR', message: 'Failed to fetch platform statistics' }
      });
    }
  });

  /**
   * GET /api/analysis/platform-performance-history
   * Platform-wide performance history for landing page chart (public)
   * Returns daily cumulative P/L from all closed analyses, split by method (Classic vs MLIS Pro)
   */
  app.get('/platform-performance-history', async (request: FastifyRequest<{ Querystring: { days?: string } }>, reply: FastifyReply) => {
    try {
      const query = request.query;
      const days = safeParseInt(query.days, 30, 7, 90);
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      // Get ALL closed analyses (for all-time total) - includes method field
      const allClosedAnalyses = await prisma.analysis.findMany({
        where: {
          outcome: { in: ['tp1_hit', 'tp2_hit', 'tp3_hit', 'sl_hit'] },
        },
        select: {
          outcome: true,
          outcomeAt: true,
          outcomePrice: true,
          step5Result: true,
          method: true, // Include method to distinguish Classic vs MLIS Pro
        },
        orderBy: { outcomeAt: 'asc' }
      });

      // Separate by method
      const classicAnalyses = allClosedAnalyses.filter(a => a.method !== 'mlis_pro');
      const mlisAnalyses = allClosedAnalyses.filter(a => a.method === 'mlis_pro');

      // Filter for period-specific data
      const closedAnalyses = allClosedAnalyses.filter(a =>
        a.outcomeAt && a.outcomeAt >= startDate
      );

      // Helper function to calculate P/L from analysis
      const calculatePnL = (analysis: { step5Result: unknown; outcomePrice: unknown }) => {
        const step5 = analysis.step5Result as Record<string, unknown> | null;
        const entryPrice = Number(step5?.averageEntry || step5?.entryPrice || 0);
        const outcomePrice = analysis.outcomePrice ? Number(analysis.outcomePrice) : 0;
        const direction = ((step5?.direction as string) || 'long').toLowerCase();

        if (entryPrice > 0 && outcomePrice > 0) {
          if (direction === 'short') {
            return ((entryPrice - outcomePrice) / entryPrice) * 100;
          } else {
            return ((outcomePrice - entryPrice) / entryPrice) * 100;
          }
        }
        return 0;
      };

      // Initialize daily data structure for both methods
      const dailyDataClassic: Record<string, { realized: number; trades: number }> = {};
      const dailyDataMlis: Record<string, { realized: number; trades: number }> = {};
      const dailyDataCombined: Record<string, { realized: number; trades: number }> = {};

      for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        dailyDataClassic[dateStr] = { realized: 0, trades: 0 };
        dailyDataMlis[dateStr] = { realized: 0, trades: 0 };
        dailyDataCombined[dateStr] = { realized: 0, trades: 0 };
      }

      // Calculate P/L for each closed trade and assign to outcomeAt date
      closedAnalyses.forEach(analysis => {
        if (!analysis.outcomeAt) return;
        const dateStr = analysis.outcomeAt.toISOString().split('T')[0];
        if (!dailyDataCombined[dateStr]) return;

        const pnl = calculatePnL(analysis);
        if (pnl !== 0) {
          dailyDataCombined[dateStr].realized += pnl;
          dailyDataCombined[dateStr].trades++;

          // Split by method
          if (analysis.method === 'mlis_pro') {
            dailyDataMlis[dateStr].realized += pnl;
            dailyDataMlis[dateStr].trades++;
          } else {
            dailyDataClassic[dateStr].realized += pnl;
            dailyDataClassic[dateStr].trades++;
          }
        }
      });

      // Convert to arrays with cumulative P/L
      const sortedDates = Object.keys(dailyDataCombined).sort();

      let cumulativePnL = 0;
      const daily = sortedDates.map(date => {
        cumulativePnL += dailyDataCombined[date].realized;
        return {
          date,
          realized: Number(dailyDataCombined[date].realized.toFixed(2)),
          trades: dailyDataCombined[date].trades,
          cumulative: Number(cumulativePnL.toFixed(2)),
        };
      });

      let cumulativeClassic = 0;
      const dailyClassic = sortedDates.map(date => {
        cumulativeClassic += dailyDataClassic[date].realized;
        return {
          date,
          realized: Number(dailyDataClassic[date].realized.toFixed(2)),
          trades: dailyDataClassic[date].trades,
          cumulative: Number(cumulativeClassic.toFixed(2)),
        };
      });

      let cumulativeMlis = 0;
      const dailyMlis = sortedDates.map(date => {
        cumulativeMlis += dailyDataMlis[date].realized;
        return {
          date,
          realized: Number(dailyDataMlis[date].realized.toFixed(2)),
          trades: dailyDataMlis[date].trades,
          cumulative: Number(cumulativeMlis.toFixed(2)),
        };
      });

      // Summary stats (period-filtered)
      const totalRealizedPnL = Number(cumulativePnL.toFixed(2));
      const totalTrades = closedAnalyses.length;
      const classicTrades = closedAnalyses.filter(a => a.method !== 'mlis_pro').length;
      const mlisTrades = closedAnalyses.filter(a => a.method === 'mlis_pro').length;

      // Calculate ALL-TIME total P/L (same formula as platform-stats)
      let allTimePnLSum = 0;
      let allTimeClassicPnL = 0;
      let allTimeMlisPnL = 0;

      allClosedAnalyses.forEach(analysis => {
        const pnl = calculatePnL(analysis);
        if (pnl !== 0) {
          allTimePnLSum += pnl;
          if (analysis.method === 'mlis_pro') {
            allTimeMlisPnL += pnl;
          } else {
            allTimeClassicPnL += pnl;
          }
        }
      });

      const allTimeTotalPnL = Number(allTimePnLSum.toFixed(1));
      const allTimeTotalTrades = allClosedAnalyses.length;

      return reply.send({
        success: true,
        data: {
          daily,
          dailyClassic,
          dailyMlis,
          summary: {
            totalRealizedPnL,
            totalTrades,
            classicTrades,
            mlisTrades,
            period: days,
            // All-time totals (same as platform-stats)
            allTimeTotalPnL,
            allTimeTotalTrades,
            allTimeClassicPnL: Number(allTimeClassicPnL.toFixed(1)),
            allTimeMlisPnL: Number(allTimeMlisPnL.toFixed(1)),
            allTimeClassicTrades: classicAnalyses.length,
            allTimeMlisTrades: mlisAnalyses.length,
          }
        }
      });
    } catch (error) {
      logger.error({ error }, 'Platform performance history error');
      return reply.status(500).send({
        success: false,
        error: { code: 'PLATFORM_PERFORMANCE_ERROR', message: 'Failed to fetch platform performance history' }
      });
    }
  });

  /**
   * GET /api/analysis/statistics
   * User's analysis statistics for dashboard
   * All data calculated from ANALYSIS table (not reports)
   */
  app.get('/statistics', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const db = prisma;

      // Get user's analyses for statistics
      const userAnalyses = await db.analysis.findMany({
        where: { userId },
        select: {
          id: true,
          symbol: true,
          totalScore: true,
          step5Result: true, // tradePlan
          step7Result: true, // verdict
          outcome: true,
          expiresAt: true,
          createdAt: true,
          aiExpertQuestionsUsed: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate total AI Expert questions used
      const aiExpertQuestionsTotal = userAnalyses.reduce(
        (sum, a) => sum + (a.aiExpertQuestionsUsed || 0),
        0
      );

      // Calculate statistics from analyses
      const totalAnalyses = userAnalyses.length;
      const completedAnalyses = totalAnalyses;

      // Count verdicts by type from step7Result
      let goSignals = 0;
      let avoidSignals = 0;

      userAnalyses.forEach(analysis => {
        const step7 = analysis.step7Result as Record<string, unknown> | null;
        const verdict = ((step7?.verdict || step7?.action || '') as string).toLowerCase();
        if (verdict === 'go' || verdict === 'go!') {
          goSignals++;
        } else if (verdict === 'conditional_go' || verdict === 'conditionalgo') {
          goSignals++; // Count conditional_go as positive signal
        } else if (verdict === 'avoid' || verdict === 'no_go') {
          avoidSignals++;
        }
      });

      // Calculate average score from totalScore
      const scores = userAnalyses
        .filter(a => a.totalScore !== null)
        .map(a => Number(a.totalScore));

      const avgScore = scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : 0;

      // Get CLOSED analyses only (tp_hit or sl_hit)
      const closedAnalyses = userAnalyses.filter(a =>
        a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit' || a.outcome === 'sl_hit'
      );
      const closedCount = closedAnalyses.length;
      const correctCount = closedAnalyses.filter(a =>
        a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit'
      ).length;

      // Accuracy = correct / closed * 100
      const accuracy = closedCount > 0
        ? Number(((correctCount / closedCount) * 100).toFixed(1))
        : 0;

      // Get ACTIVE analyses (no outcome yet) AND not expired
      const now = new Date();
      const activeAnalyses = userAnalyses.filter(a =>
        !a.outcome &&
        a.expiresAt && new Date(a.expiresAt) > now
      );
      const activeCount = activeAnalyses.length;

      // Fetch current prices for active analyses to calculate active performance
      let activeProfitable = 0;
      if (activeCount > 0) {
        const activeSymbols = [...new Set(activeAnalyses.map(a => a.symbol as string))];
        const prices: Record<string, number> = {};

        try {
          const pairs = activeSymbols.map((s: string) => `"${s.toUpperCase()}USDT"`).join(',');
          const priceResponse = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
          );
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            for (const item of priceData) {
              const symbol = item.symbol.replace('USDT', '');
              prices[symbol] = parseFloat(item.price);
            }
          }
        } catch (err) {
          logger.warn({ error: err }, 'Failed to fetch prices for active performance');
        }

        // Calculate how many active analyses are profitable
        activeAnalyses.forEach(analysis => {
          const tradePlan = analysis.step5Result as Record<string, unknown> | null;

          const entryPrice = Number(
            tradePlan?.averageEntry ||
            tradePlan?.entryPrice
          ) || 0;

          const currentPrice = prices[analysis.symbol] || 0;
          const direction = ((tradePlan?.direction as string) || 'long').toLowerCase();

          if (entryPrice > 0 && currentPrice > 0) {
            const pnl = direction === 'short'
              ? entryPrice - currentPrice
              : currentPrice - entryPrice;
            if (pnl > 0) {
              activeProfitable++;
            }
          }
        });
      }

      // Active Performance = profitable / active * 100
      const activePerformance = activeCount > 0
        ? Number(((activeProfitable / activeCount) * 100).toFixed(1))
        : 0;

      // Get last analysis date
      const lastAnalysis = userAnalyses[0];
      const lastAnalysisDate = lastAnalysis
        ? new Date(lastAnalysis.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : null;

      return reply.send({
        totalAnalyses,
        completedAnalyses: totalAnalyses,
        verifiedAnalyses: closedCount, // Only closed trades (TP or SL hit)
        correctAnalyses: correctCount,
        pendingAnalyses: activeCount, // Active trades (not closed yet)
        accuracy, // Real accuracy = correct / closed * 100
        // Active performance metrics
        activeCount,
        activeProfitable,
        activePerformance, // Active profitable / active * 100
        avgScore,
        goSignals,
        avoidSignals,
        lastAnalysisDate,
        // AI Expert stats
        aiExpertQuestionsTotal,
      });
    } catch (error) {
      logger.error({ error }, 'Statistics error');
      return reply.status(500).send({
        success: false,
        error: { code: 'STATS_ERROR', message: 'Failed to fetch statistics' },
      });
    }
  });

  /**
   * GET /api/analysis/performance
   * Detailed performance metrics for dashboard
   * All data calculated from real database records
   */
  app.get('/performance', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const db = prisma;

      // Calculate weekly/monthly analyses from credit transactions
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [weeklyAnalyses, monthlyAnalyses] = await Promise.all([
        db.creditTransaction.count({
          where: {
            userId,
            source: 'analysis_full',
            createdAt: { gte: oneWeekAgo }
          }
        }),
        db.creditTransaction.count({
          where: {
            userId,
            source: 'analysis_full',
            createdAt: { gte: oneMonthAgo }
          }
        })
      ]);

      // Get user's reports grouped by symbol for real coin performance
      const userReports = await db.report.findMany({
        where: { userId },
        select: {
          symbol: true,
          verdict: true,
          score: true,
          generatedAt: true
        },
        orderBy: { generatedAt: 'desc' }
      });

      // Calculate per-coin statistics from real data
      const coinStats: Record<string, { analyses: number; scores: number[]; goCount: number }> = {};

      userReports.forEach(report => {
        if (!coinStats[report.symbol]) {
          coinStats[report.symbol] = { analyses: 0, scores: [], goCount: 0 };
        }
        coinStats[report.symbol].analyses++;
        if (report.score !== null) {
          coinStats[report.symbol].scores.push(Number(report.score));
        }
        const verdict = report.verdict.toLowerCase();
        if (verdict === 'go' || verdict === 'go!' || verdict === 'conditional_go' || verdict === 'conditional go') {
          coinStats[report.symbol].goCount++;
        }
      });

      // Convert to top coins array with real accuracy
      const topCoins = Object.entries(coinStats)
        .sort((a, b) => b[1].analyses - a[1].analyses)
        .slice(0, 5)
        .map(([symbol, stats]) => {
          const avgScore = stats.scores.length > 0
            ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
            : 0;
          const accuracy = stats.analyses > 0
            ? (stats.goCount / stats.analyses) * 100
            : 0;
          return {
            symbol,
            analyses: stats.analyses,
            accuracy: Number(accuracy.toFixed(1)),
            avgScore: Number(avgScore.toFixed(1)),
          };
        });

      // Get reports with expiration info for outcomes
      const reportsWithExpiration = await db.report.findMany({
        where: { userId },
        select: {
          id: true,
          symbol: true,
          verdict: true,
          score: true,
          direction: true,
          generatedAt: true,
          expiresAt: true,
          outcome: true,
          outcomePriceChange: true,
          entryPrice: true,
          reportData: true
        },
        orderBy: { generatedAt: 'desc' },
        take: 10
      });

      // Fetch current prices for all symbols
      const symbols = [...new Set(reportsWithExpiration.map(r => r.symbol as string))];
      const prices: Record<string, number> = {};

      if (symbols.length > 0) {
        try {
          const pairs = symbols.map((s: string) => `"${s.toUpperCase()}USDT"`).join(',');
          const priceResponse = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
          );
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            for (const item of priceData) {
              const symbol = item.symbol.replace('USDT', '');
              prices[symbol] = parseFloat(item.price);
            }
          }
        } catch (err) {
          logger.warn({ error: err }, 'Failed to fetch prices for outcomes');
        }
      }

      // Recent outcomes from real reports with live tracking info
      const recentOutcomes = reportsWithExpiration.map(report => {
        // Map verdict to standard format
        const verdictLower = report.verdict.toLowerCase();
        let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
        if (verdictLower === 'go' || verdictLower === 'go!') verdict = 'go';
        else if (verdictLower === 'conditional_go' || verdictLower === 'conditional go' || verdictLower === 'conditional') verdict = 'conditional_go';
        else if (verdictLower === 'avoid') verdict = 'avoid';
        else if (verdictLower === 'wait') verdict = 'wait';

        // Calculate expiration status
        const expiresAt = new Date(report.expiresAt);
        const isExpired = expiresAt < now;
        const hoursRemaining = isExpired ? 0 : Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Extract trade plan data
        const reportData = report.reportData as Record<string, unknown> | null;
        const tradePlan = reportData?.tradePlan as Record<string, unknown> | undefined;
        const entryPrice = Number(tradePlan?.averageEntry || report.entryPrice) || undefined;
        const currentPrice = prices[report.symbol] || undefined;
        const stopLoss = (tradePlan?.stopLoss as { price: number } | undefined)?.price;
        const takeProfits = tradePlan?.takeProfits as Array<{ price: number }> | undefined;

        // Calculate unrealized P/L
        let unrealizedPnL: number | undefined;
        if (entryPrice && currentPrice) {
          const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
          const direction = (tradePlan?.direction as string || report.direction || 'long').toLowerCase();
          unrealizedPnL = direction === 'short' ? -pnlPercent : pnlPercent;
        }

        // Use real outcome if available
        let outcome: 'correct' | 'incorrect' | 'pending' = 'pending';
        let priceChange = unrealizedPnL || 0;

        if (report.outcome) {
          // Real outcome exists (TP/SL hit)
          outcome = report.outcome as 'correct' | 'incorrect' | 'pending';
          priceChange = report.outcomePriceChange ? Number(report.outcomePriceChange) : priceChange;
        }

        return {
          id: report.id,
          symbol: report.symbol,
          verdict,
          outcome,
          priceChange: Number(priceChange.toFixed(2)),
          date: new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          expiresAt: report.expiresAt.toISOString(),
          isExpired,
          hoursRemaining,
          // Live tracking data
          direction: report.direction,
          entryPrice,
          currentPrice,
          unrealizedPnL: unrealizedPnL ? Number(unrealizedPnL.toFixed(2)) : undefined,
          stopLoss,
          takeProfit1: takeProfits?.[0]?.price,
          takeProfit2: takeProfits?.[1]?.price,
          takeProfit3: takeProfits?.[2]?.price
        };
      });

      // Get streak data from user
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { streakDays: true },
      });

      return reply.send({
        weeklyAnalyses,
        monthlyAnalyses,
        topCoins,
        recentOutcomes,
        streakDays: user?.streakDays || 0,
        bestStreak: user?.streakDays || 0,
      });
    } catch (error) {
      logger.error({ error }, 'Performance error');
      return reply.status(500).send({
        success: false,
        error: { code: 'PERF_ERROR', message: 'Failed to fetch performance data' },
      });
    }
  });

  /**
   * GET /api/analysis/recent
   * User's recent analyses
   * All data from real database records
   */
  app.get('/recent', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const db = prisma;

      // Get recent reports with real data
      const recentReports = await db.report.findMany({
        where: { userId },
        select: {
          id: true,
          symbol: true,
          verdict: true,
          score: true,
          generatedAt: true
        },
        orderBy: { generatedAt: 'desc' },
        take: 10,
      });

      const analyses = recentReports.map((report) => {
        const createdAt = new Date(report.generatedAt);
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo: string;
        if (diffHours < 1) {
          timeAgo = 'Just now';
        } else if (diffHours < 24) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
          timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }

        // Map verdict to standard format
        const verdictLower = report.verdict.toLowerCase();
        let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
        if (verdictLower === 'go' || verdictLower === 'go!') verdict = 'go';
        else if (verdictLower === 'conditional_go' || verdictLower === 'conditional go' || verdictLower === 'conditional') verdict = 'conditional_go';
        else if (verdictLower === 'avoid') verdict = 'avoid';
        else if (verdictLower === 'wait') verdict = 'wait';

        return {
          id: report.id,
          symbol: report.symbol,
          verdict,
          score: Number(report.score),
          createdAt: timeAgo,
        };
      });

      return reply.send({
        success: true,
        data: analyses,
      });
    } catch (error) {
      logger.error({ error }, 'Recent analyses error');
      return reply.status(500).send({
        success: false,
        error: { code: 'RECENT_ERROR', message: 'Failed to fetch recent analyses' },
      });
    }
  });

  /**
   * GET /api/analysis/indicator-charts/:symbol
   * Get indicator chart data for detailed PDF reports
   * Returns historical indicator values for charting
   */
  app.get('/indicator-charts/:symbol', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { symbol: string };
    Querystring: { tradeType?: string; timeframe?: string };
  }>, reply: FastifyReply) => {
    try {
      const { symbol } = request.params;
      const tradeType = (request.query.tradeType || 'dayTrade') as TradeType;
      const timeframe = request.query.timeframe || '4h';

      // Map timeframe to Binance interval
      const intervalMap: Record<string, string> = {
        '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
        '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
      };
      const interval = intervalMap[timeframe] || '4h';

      // Fetch kline data from Binance (500 candles for good chart data)
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=${interval}&limit=500`
      );

      if (!response.ok) {
        return reply.status(400).send({
          success: false,
          error: { code: 'FETCH_ERROR', message: 'Failed to fetch market data' }
        });
      }

      // Safely parse JSON response
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return reply.status(400).send({
          success: false,
          error: { code: 'EMPTY_RESPONSE', message: 'Empty response from Binance API' }
        });
      }

      let klines: (string | number)[][];
      try {
        klines = JSON.parse(responseText);
      } catch {
        return reply.status(400).send({
          success: false,
          error: { code: 'PARSE_ERROR', message: 'Invalid JSON response from Binance API' }
        });
      }

      // Convert Binance klines to OHLCV format
      const ohlcv = klines.map((k: (string | number)[]) => ({
        timestamp: Number(k[0]),
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
      }));

      // Define indicators per step based on trade type (40+ indicators total)
      // Trade type specific configurations with different periods and indicator focus
      const getStepIndicators = (type: TradeType): Record<number, { name: string; category: string; color: string }[]> => {
        if (type === 'scalping') {
          // Scalping: Fast indicators, short periods, focus on momentum & quick reversals
          // Professional scalpers use: VWAP, fast oscillators, order flow indicators
          return {
            1: [ // Market Pulse - fast trend detection (institutional level)
              { name: 'EMA_9', category: 'trend', color: '#3B82F6' },
              { name: 'EMA_21', category: 'trend', color: '#8B5CF6' },
              { name: 'EMA_50', category: 'trend', color: '#06B6D4' },
              { name: 'SMA_20', category: 'trend', color: '#F97316' },
              { name: 'VWAP', category: 'volume', color: '#14B8A6' }, // Critical for institutional traders
              { name: 'HMA', category: 'trend', color: '#EC4899' },
              { name: 'CHOP', category: 'volatility', color: '#A855F7' }, // Market structure
            ],
            2: [ // Asset Scanner - quick signals (pro trader setup)
              { name: 'RSI_7', category: 'momentum', color: '#F59E0B' },
              { name: 'MACD_FAST', category: 'trend', color: '#10B981' },
              { name: 'BOLLINGER', category: 'volatility', color: '#6366F1' },
              { name: 'KELTNER', category: 'volatility', color: '#EC4899' },
              { name: 'STOCHASTIC_FAST', category: 'momentum', color: '#EF4444' },
              { name: 'PIVOT', category: 'advanced', color: '#8B5CF6' },
              { name: 'LRS', category: 'trend', color: '#22C55E' }, // Trend direction
            ],
            3: [ // Safety Check - volume/order flow (smart money detection)
              { name: 'OBV', category: 'volume', color: '#14B8A6' },
              { name: 'MFI_7', category: 'volume', color: '#F97316' },
              { name: 'CMF', category: 'volume', color: '#8B5CF6' },
              { name: 'FORCE_INDEX', category: 'volume', color: '#3B82F6' },
              { name: 'EMV', category: 'volume', color: '#22C55E' },
              { name: 'CHAIKIN', category: 'volume', color: '#A855F7' }, // Pro volume momentum
              { name: 'ADL', category: 'volume', color: '#EC4899' }, // Accumulation/Distribution
              { name: 'KVO', category: 'volume', color: '#F43F5E' }, // Klinger Volume Oscillator
            ],
            4: [ // Timing - fast momentum (execution timing)
              { name: 'STOCHASTIC_FAST', category: 'momentum', color: '#EF4444' },
              { name: 'CCI_7', category: 'momentum', color: '#06B6D4' },
              { name: 'WILLIAMS_R', category: 'momentum', color: '#84CC16' },
              { name: 'RSI_7', category: 'momentum', color: '#F59E0B' },
              { name: 'CMO', category: 'momentum', color: '#F97316' },
              { name: 'ROC_5', category: 'momentum', color: '#3B82F6' },
              { name: 'RVI', category: 'momentum', color: '#A855F7' }, // Vigor Index
              { name: 'TSI', category: 'momentum', color: '#F43F5E' }, // True Strength Index
            ],
            5: [ // Trade Plan - tight stops (risk management)
              { name: 'ATR_7', category: 'volatility', color: '#F59E0B' },
              { name: 'SUPERTREND_FAST', category: 'trend', color: '#22C55E' },
              { name: 'PSAR', category: 'trend', color: '#EF4444' },
              { name: 'DEMA', category: 'trend', color: '#EC4899' },
              { name: 'TEMA', category: 'trend', color: '#06B6D4' },
              { name: 'STDDEV', category: 'volatility', color: '#8B5CF6' }, // Volatility measure
              { name: 'VP', category: 'advanced', color: '#F43F5E' }, // Volume Profile POC/VAH/VAL
            ],
            6: [ // Trap Check - quick reversals (trap detection)
              { name: 'RSI_7', category: 'momentum', color: '#F59E0B' },
              { name: 'STOCH_RSI_FAST', category: 'momentum', color: '#EC4899' },
              { name: 'ROC_5', category: 'momentum', color: '#06B6D4' },
              { name: 'TRIX', category: 'momentum', color: '#8B5CF6' },
              { name: 'PPO', category: 'momentum', color: '#14B8A6' },
              { name: 'CV', category: 'volatility', color: '#A855F7' }, // Chaikin Volatility
              { name: 'MASS', category: 'advanced', color: '#F43F5E' }, // Mass Index reversal
            ],
            7: [],
          };
        }

        if (type === 'swing') {
          // Swing: Slow indicators, long periods, focus on trend & accumulation
          // Institutional swing traders use: Ichimoku, ADX, Accumulation indicators
          return {
            1: [ // Market Pulse - long-term trend (fund manager approach)
              { name: 'EMA_50', category: 'trend', color: '#3B82F6' },
              { name: 'EMA_100', category: 'trend', color: '#8B5CF6' },
              { name: 'EMA_200', category: 'trend', color: '#06B6D4' },
              { name: 'SMA_50', category: 'trend', color: '#F97316' },
              { name: 'SMA_200', category: 'trend', color: '#14B8A6' },
              { name: 'ICHIMOKU', category: 'trend', color: '#EC4899' },
              { name: 'LRS', category: 'trend', color: '#A855F7' }, // Linear regression for trend
            ],
            2: [ // Asset Scanner - trend confirmation (institutional signals)
              { name: 'RSI_21', category: 'momentum', color: '#F59E0B' },
              { name: 'MACD', category: 'trend', color: '#10B981' },
              { name: 'BOLLINGER', category: 'volatility', color: '#6366F1' },
              { name: 'DONCHIAN', category: 'volatility', color: '#06B6D4' },
              { name: 'ICHIMOKU', category: 'trend', color: '#EC4899' },
              { name: 'ADX', category: 'trend', color: '#A855F7' },
              { name: 'CHOP', category: 'volatility', color: '#22C55E' }, // Market structure
              { name: 'KST', category: 'momentum', color: '#F43F5E' }, // Long-term momentum
            ],
            3: [ // Safety Check - accumulation/distribution (smart money flow)
              { name: 'OBV', category: 'volume', color: '#14B8A6' },
              { name: 'MFI', category: 'volume', color: '#F97316' },
              { name: 'CMF', category: 'volume', color: '#8B5CF6' },
              { name: 'FORCE_INDEX', category: 'volume', color: '#3B82F6' },
              { name: 'ELDER_RAY', category: 'advanced', color: '#EF4444' },
              { name: 'EMV', category: 'volume', color: '#22C55E' },
              { name: 'ADL', category: 'volume', color: '#A855F7' }, // Key for institutions
              { name: 'CHAIKIN', category: 'volume', color: '#EC4899' }, // Pro volume analysis
              { name: 'KVO', category: 'volume', color: '#F43F5E' }, // Klinger Volume Oscillator
            ],
            4: [ // Timing - trend momentum (position timing)
              { name: 'STOCHASTIC', category: 'momentum', color: '#EF4444' },
              { name: 'CCI', category: 'momentum', color: '#06B6D4' },
              { name: 'AROON', category: 'trend', color: '#14B8A6' },
              { name: 'DPO', category: 'momentum', color: '#3B82F6' },
              { name: 'COPPOCK', category: 'momentum', color: '#F97316' },
              { name: 'UO', category: 'momentum', color: '#A855F7' },
              { name: 'RVI', category: 'momentum', color: '#EC4899' }, // Market vigor
              { name: 'TSI', category: 'momentum', color: '#F43F5E' }, // True Strength Index
            ],
            5: [ // Trade Plan - wide stops (position sizing)
              { name: 'ATR_21', category: 'volatility', color: '#F59E0B' },
              { name: 'SUPERTREND', category: 'trend', color: '#22C55E' },
              { name: 'ADX', category: 'trend', color: '#A855F7' },
              { name: 'PSAR', category: 'trend', color: '#EF4444' },
              { name: 'EMA_50', category: 'trend', color: '#3B82F6' },
              { name: 'EMA_200', category: 'trend', color: '#EC4899' },
              { name: 'STDDEV', category: 'volatility', color: '#06B6D4' }, // Risk measurement
              { name: 'VP', category: 'advanced', color: '#F43F5E' }, // Volume Profile
              { name: 'AVWAP', category: 'advanced', color: '#7C3AED' }, // Anchored VWAP
            ],
            6: [ // Trap Check - trend reversals (reversal detection)
              { name: 'RSI_21', category: 'momentum', color: '#F59E0B' },
              { name: 'STOCH_RSI', category: 'momentum', color: '#EC4899' },
              { name: 'ROC', category: 'momentum', color: '#06B6D4' },
              { name: 'COPPOCK', category: 'momentum', color: '#8B5CF6' },
              { name: 'TRIX', category: 'momentum', color: '#14B8A6' },
              { name: 'PPO', category: 'momentum', color: '#F97316' },
              { name: 'CV', category: 'volatility', color: '#A855F7' }, // Volatility change
              { name: 'MASS', category: 'advanced', color: '#F43F5E' }, // Mass Index reversal
            ],
            7: [],
          };
        }

        // Day Trade: Standard indicators, balanced approach
        // Professional day traders use: VWAP, Bollinger, Order Flow indicators
        return {
          1: [ // Market Pulse - balanced trend (professional day trader)
            { name: 'EMA_20', category: 'trend', color: '#3B82F6' },
            { name: 'EMA_50', category: 'trend', color: '#8B5CF6' },
            { name: 'EMA_100', category: 'trend', color: '#06B6D4' },
            { name: 'SMA_50', category: 'trend', color: '#F97316' },
            { name: 'VWAP', category: 'volume', color: '#14B8A6' }, // Critical for day traders
            { name: 'ICHIMOKU', category: 'trend', color: '#EC4899' },
            { name: 'LRS', category: 'trend', color: '#A855F7' }, // Trend direction
          ],
          2: [ // Asset Scanner - core technicals (multi-timeframe analysis)
            { name: 'RSI', category: 'momentum', color: '#F59E0B' },
            { name: 'MACD', category: 'trend', color: '#10B981' },
            { name: 'BOLLINGER', category: 'volatility', color: '#6366F1' },
            { name: 'KELTNER', category: 'volatility', color: '#EC4899' },
            { name: 'DONCHIAN', category: 'volatility', color: '#06B6D4' },
            { name: 'PIVOT', category: 'advanced', color: '#8B5CF6' },
            { name: 'CHOP', category: 'volatility', color: '#22C55E' }, // Market structure
          ],
          3: [ // Safety Check - volume analysis (smart money detection)
            { name: 'OBV', category: 'volume', color: '#14B8A6' },
            { name: 'MFI', category: 'volume', color: '#F97316' },
            { name: 'CMF', category: 'volume', color: '#8B5CF6' },
            { name: 'FORCE_INDEX', category: 'volume', color: '#3B82F6' },
            { name: 'EMV', category: 'volume', color: '#22C55E' },
            { name: 'ELDER_RAY', category: 'advanced', color: '#EF4444' },
            { name: 'ADL', category: 'volume', color: '#A855F7' }, // Accumulation/Distribution
            { name: 'CHAIKIN', category: 'volume', color: '#EC4899' }, // Volume momentum
            { name: 'KVO', category: 'volume', color: '#F43F5E' }, // Klinger Volume Oscillator
          ],
          4: [ // Timing - momentum signals (entry/exit timing)
            { name: 'STOCHASTIC', category: 'momentum', color: '#EF4444' },
            { name: 'CCI', category: 'momentum', color: '#06B6D4' },
            { name: 'WILLIAMS_R', category: 'momentum', color: '#84CC16' },
            { name: 'UO', category: 'momentum', color: '#A855F7' },
            { name: 'CMO', category: 'momentum', color: '#F97316' },
            { name: 'AROON', category: 'trend', color: '#14B8A6' },
            { name: 'RVI', category: 'momentum', color: '#EC4899' }, // Vigor Index
            { name: 'TSI', category: 'momentum', color: '#F43F5E' }, // True Strength Index
          ],
          5: [ // Trade Plan - risk management (position management)
            { name: 'ATR', category: 'volatility', color: '#F59E0B' },
            { name: 'SUPERTREND', category: 'trend', color: '#22C55E' },
            { name: 'ADX', category: 'trend', color: '#A855F7' },
            { name: 'PSAR', category: 'trend', color: '#EF4444' },
            { name: 'HMA', category: 'trend', color: '#3B82F6' },
            { name: 'DEMA', category: 'trend', color: '#EC4899' },
            { name: 'STDDEV', category: 'volatility', color: '#06B6D4' }, // Volatility measure
            { name: 'VP', category: 'advanced', color: '#F43F5E' }, // Volume Profile
            { name: 'AVWAP', category: 'advanced', color: '#7C3AED' }, // Anchored VWAP
          ],
          6: [ // Trap Check - reversal detection (trap avoidance)
            { name: 'RSI', category: 'momentum', color: '#F59E0B' },
            { name: 'STOCH_RSI', category: 'momentum', color: '#EC4899' },
            { name: 'ROC', category: 'momentum', color: '#06B6D4' },
            { name: 'TRIX', category: 'momentum', color: '#8B5CF6' },
            { name: 'PPO', category: 'momentum', color: '#14B8A6' },
            { name: 'DPO', category: 'momentum', color: '#F97316' },
            { name: 'CV', category: 'volatility', color: '#A855F7' }, // Chaikin Volatility
            { name: 'MASS', category: 'advanced', color: '#F43F5E' }, // Mass Index reversal
          ],
          7: [],
        };
      };

      const stepIndicators = getStepIndicators(tradeType);

      // Calculate indicators for each step
      const chartData: Record<number, Array<{
        name: string;
        category: string;
        values: number[];
        timestamps: number[];
        currentValue: number;
        signal: string;
        signalStrength: number;
        interpretation: string;
        chartColor: string;
        secondaryValues?: number[];
        secondaryLabel?: string;
        referenceLines?: Array<{ value: number; label: string; color: string }>;
        metadata?: Record<string, unknown>;
      }>> = {};

      // Helper to calculate indicator
      const calculateIndicator = (name: string, data: typeof ohlcv): {
        values: number[];
        currentValue: number;
        signal: string;
        signalStrength: number;
        referenceLines?: Array<{ value: number; label: string; color: string }>;
        secondaryValues?: number[];
        secondaryLabel?: string;
        metadata?: Record<string, unknown>;
      } | null => {
        const upperName = name.toUpperCase();
        if (data.length < 20) return null; // Need minimum data

        // Simple indicator calculations inline (lightweight version)
        if (upperName.startsWith('EMA_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 20;
          if (data.length < period) return null;
          const closes = data.map((d: { close: number }) => d.close);
          const multiplier = 2 / (period + 1);
          let ema = closes.slice(0, period).reduce((a: number, b: number) => a + b, 0) / period;
          const emaValues: number[] = [ema];
          for (let i = period; i < closes.length; i++) {
            ema = (closes[i] - ema) * multiplier + ema;
            emaValues.push(ema);
          }
          const currentValue = emaValues[emaValues.length - 1] ?? 0;
          const currentPrice = closes[closes.length - 1] ?? 0;
          return {
            values: emaValues,
            currentValue,
            signal: currentPrice > currentValue ? 'bullish' : 'bearish',
            signalStrength: currentValue !== 0 ? Math.min(100, Math.abs((currentPrice - currentValue) / currentValue * 100) * 10) : 0,
            metadata: {}
          };
        }

        if (upperName.startsWith('SMA_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 20;
          if (data.length < period) return null;
          const closes = data.map((d: { close: number }) => d.close);
          const smaValues: number[] = [];
          for (let i = period - 1; i < closes.length; i++) {
            smaValues.push(closes.slice(i - period + 1, i + 1).reduce((a: number, b: number) => a + b, 0) / period);
          }
          const currentValue = smaValues[smaValues.length - 1] ?? 0;
          const currentPrice = closes[closes.length - 1] ?? 0;
          return {
            values: smaValues,
            currentValue,
            signal: currentPrice > currentValue ? 'bullish' : 'bearish',
            signalStrength: currentValue !== 0 ? Math.min(100, Math.abs((currentPrice - currentValue) / currentValue * 100) * 10) : 0,
            metadata: {}
          };
        }

        // RSI with configurable period (RSI, RSI_7, RSI_14, RSI_21)
        if (upperName === 'RSI' || upperName.startsWith('RSI_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 14;
          if (data.length < period + 1) return null;
          const closes = data.map((d: { close: number }) => d.close);
          const changes: number[] = [];
          for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
          }
          const gains = changes.map(c => c > 0 ? c : 0);
          const losses = changes.map(c => c < 0 ? -c : 0);
          let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
          let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
          const rsiValues: number[] = [];
          for (let i = period; i < changes.length; i++) {
            const gain = gains[i];
            const loss = losses[i];
            if (gain !== undefined && loss !== undefined) {
              avgGain = (avgGain * (period - 1) + gain) / period;
              avgLoss = (avgLoss * (period - 1) + loss) / period;
              const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
              rsiValues.push(100 - (100 / (1 + rs)));
            }
          }
          if (rsiValues.length === 0) return null;
          const currentRsi = rsiValues[rsiValues.length - 1] ?? 50;
          // Adjust thresholds for shorter periods (more sensitive)
          const overbought = period <= 7 ? 80 : 70;
          const oversold = period <= 7 ? 20 : 30;
          return {
            values: rsiValues,
            currentValue: currentRsi,
            signal: currentRsi < oversold ? 'bullish' : currentRsi > overbought ? 'bearish' : 'neutral',
            signalStrength: currentRsi < oversold ? oversold - currentRsi : currentRsi > overbought ? currentRsi - overbought : 50,
            referenceLines: [
              { value: overbought, label: 'Overbought', color: '#EF4444' },
              { value: oversold, label: 'Oversold', color: '#22C55E' },
              { value: 50, label: 'Neutral', color: '#6B7280' },
            ],
            metadata: { overbought: currentRsi > overbought, oversold: currentRsi < oversold, period }
          };
        }

        // MACD with fast variant for scalping (MACD, MACD_FAST)
        if (upperName === 'MACD' || upperName === 'MACD_FAST') {
          const isFast = upperName === 'MACD_FAST';
          const fast = isFast ? 5 : 12;
          const slow = isFast ? 13 : 26;
          const signalPeriod = isFast ? 5 : 9;
          if (data.length < slow + signalPeriod) return null;
          const closes = data.map((d: { close: number }) => d.close);

          // Calculate EMAs
          const calcEma = (arr: number[], period: number): number[] => {
            if (arr.length < period) return [];
            const multiplier = 2 / (period + 1);
            let ema = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
            const result = [ema];
            for (let i = period; i < arr.length; i++) {
              const val = arr[i];
              if (val !== undefined) {
                ema = (val - ema) * multiplier + ema;
                result.push(ema);
              }
            }
            return result;
          };

          const fastEma = calcEma(closes, fast);
          const slowEma = calcEma(closes, slow);
          if (fastEma.length === 0 || slowEma.length === 0) return null;

          const offset = slow - fast;
          const macdLine: number[] = [];
          for (let i = 0; i < slowEma.length; i++) {
            const fastVal = fastEma[i + offset];
            const slowVal = slowEma[i];
            if (fastVal !== undefined && slowVal !== undefined) {
              macdLine.push(fastVal - slowVal);
            }
          }
          if (macdLine.length === 0) return null;

          const signalLine = calcEma(macdLine, signalPeriod);
          if (signalLine.length === 0) return null;
          const histogram: number[] = [];
          for (let i = 0; i < signalLine.length; i++) {
            const macdVal = macdLine[i + (macdLine.length - signalLine.length)];
            const sigVal = signalLine[i];
            if (macdVal !== undefined && sigVal !== undefined) {
              histogram.push(macdVal - sigVal);
            }
          }
          if (histogram.length === 0) return null;

          const currentHistogram = histogram[histogram.length - 1] ?? 0;
          return {
            values: histogram,
            currentValue: currentHistogram,
            signal: currentHistogram > 0 ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentHistogram) * 1000),
            secondaryValues: signalLine,
            secondaryLabel: 'Signal Line',
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { macd: macdLine[macdLine.length - 1] ?? 0, signal: signalLine[signalLine.length - 1] ?? 0, histogram: currentHistogram }
          };
        }

        if (upperName === 'BOLLINGER') {
          const period = 20, stdDev = 2;
          if (data.length < period) return null;
          const closes = data.map((d: { close: number }) => d.close);
          const upperBand: number[] = [];
          const lowerBand: number[] = [];
          const middleBand: number[] = [];

          for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            const sma = slice.reduce((a: number, b: number) => a + b, 0) / period;
            const variance = slice.reduce((sum: number, val: number) => sum + Math.pow(val - sma, 2), 0) / period;
            const std = Math.sqrt(variance);
            middleBand.push(sma);
            upperBand.push(sma + stdDev * std);
            lowerBand.push(sma - stdDev * std);
          }
          if (middleBand.length === 0) return null;

          const currentPrice = closes[closes.length - 1] ?? 0;
          const currentUpper = upperBand[upperBand.length - 1] ?? 0;
          const currentLower = lowerBand[lowerBand.length - 1] ?? 0;
          const currentMiddle = middleBand[middleBand.length - 1] ?? 0;
          const bandDiff = currentUpper - currentMiddle;

          return {
            values: middleBand,
            currentValue: currentMiddle,
            signal: currentPrice > currentUpper ? 'bearish' : currentPrice < currentLower ? 'bullish' : 'neutral',
            signalStrength: bandDiff !== 0 ? Math.abs((currentPrice - currentMiddle) / bandDiff * 100) : 0,
            secondaryValues: upperBand,
            secondaryLabel: 'Upper Band',
            metadata: { upper: currentUpper, lower: currentLower, middle: currentMiddle, width: currentMiddle !== 0 ? (currentUpper - currentLower) / currentMiddle * 100 : 0 }
          };
        }

        // ATR with configurable period (ATR, ATR_7, ATR_14, ATR_21)
        if (upperName === 'ATR' || upperName.startsWith('ATR_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 14;
          if (data.length < period + 1) return null;
          const trValues: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i];
            const prev = data[i - 1];
            if (curr && prev) {
              trValues.push(Math.max(
                curr.high - curr.low,
                Math.abs(curr.high - prev.close),
                Math.abs(curr.low - prev.close)
              ));
            }
          }
          if (trValues.length < period) return null;
          let atr = trValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
          const atrValues: number[] = [atr];
          for (let i = period; i < trValues.length; i++) {
            const trVal = trValues[i];
            if (trVal !== undefined) {
              atr = (atr * (period - 1) + trVal) / period;
              atrValues.push(atr);
            }
          }
          const currentAtr = atrValues[atrValues.length - 1] ?? 0;
          const avgAtr = atrValues.length > 0 ? atrValues.reduce((a, b) => a + b, 0) / atrValues.length : 1;
          return {
            values: atrValues,
            currentValue: currentAtr,
            signal: currentAtr > avgAtr * 1.5 ? 'bearish' : currentAtr < avgAtr * 0.5 ? 'bullish' : 'neutral',
            signalStrength: avgAtr !== 0 ? Math.min(100, (currentAtr / avgAtr) * 50) : 0,
            metadata: { volatility: currentAtr > avgAtr ? 'high' : 'low' }
          };
        }

        // STOCHASTIC with fast variant (STOCHASTIC, STOCHASTIC_FAST)
        if (upperName === 'STOCHASTIC' || upperName === 'STOCHASTIC_FAST') {
          const isFast = upperName === 'STOCHASTIC_FAST';
          const k = isFast ? 5 : 14, d = isFast ? 2 : 3, smooth = isFast ? 2 : 3;
          if (data.length < k + smooth + d) return null;
          const kValues: number[] = [];
          for (let i = k - 1; i < data.length; i++) {
            const periodData = data.slice(i - k + 1, i + 1);
            const high = Math.max(...periodData.map((d: { high: number }) => d.high));
            const low = Math.min(...periodData.map((d: { low: number }) => d.low));
            const curr = data[i];
            if (curr) {
              kValues.push(high === low ? 50 : ((curr.close - low) / (high - low)) * 100);
            }
          }
          if (kValues.length < smooth) return null;
          const smoothK: number[] = [];
          for (let i = smooth - 1; i < kValues.length; i++) {
            smoothK.push(kValues.slice(i - smooth + 1, i + 1).reduce((a, b) => a + b, 0) / smooth);
          }
          if (smoothK.length < d) return null;
          const dValues: number[] = [];
          for (let i = d - 1; i < smoothK.length; i++) {
            dValues.push(smoothK.slice(i - d + 1, i + 1).reduce((a, b) => a + b, 0) / d);
          }
          if (smoothK.length === 0 || dValues.length === 0) return null;
          const currentK = smoothK[smoothK.length - 1] ?? 50;
          const currentD = dValues[dValues.length - 1] ?? 50;
          return {
            values: smoothK,
            currentValue: currentK,
            signal: currentK < 20 && currentK > currentD ? 'bullish' : currentK > 80 && currentK < currentD ? 'bearish' : 'neutral',
            signalStrength: currentK < 20 ? 20 - currentK : currentK > 80 ? currentK - 80 : 50,
            secondaryValues: dValues,
            secondaryLabel: '%D',
            referenceLines: [
              { value: 80, label: 'Overbought', color: '#EF4444' },
              { value: 20, label: 'Oversold', color: '#22C55E' },
            ],
            metadata: { k: currentK, d: currentD }
          };
        }

        if (upperName === 'OBV') {
          if (data.length < 2) return null;
          let obv = 0;
          const obvValues: number[] = [obv];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i];
            const prev = data[i - 1];
            if (curr && prev) {
              if (curr.close > prev.close) {
                obv += curr.volume;
              } else if (curr.close < prev.close) {
                obv -= curr.volume;
              }
            }
            obvValues.push(obv);
          }
          const currentObv = obvValues[obvValues.length - 1] ?? 0;
          const prevObv = obvValues[obvValues.length - 20] ?? obvValues[0] ?? 1;
          const safePrevObv = prevObv === 0 ? 1 : prevObv;
          return {
            values: obvValues,
            currentValue: currentObv,
            signal: currentObv > prevObv ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs((currentObv - prevObv) / Math.abs(safePrevObv)) * 100),
            metadata: { trend: currentObv > prevObv ? 'accumulation' : 'distribution' }
          };
        }

        // MFI with configurable period (MFI, MFI_7, MFI_14)
        if (upperName === 'MFI' || upperName.startsWith('MFI_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 14;
          // Shorter periods have tighter thresholds
          const overbought = period <= 7 ? 85 : 80;
          const oversold = period <= 7 ? 15 : 20;
          if (data.length < period + 1) return null;
          const typicalPrices = data.map((d: { high: number; low: number; close: number }) => (d.high + d.low + d.close) / 3);
          const moneyFlows = data.map((d: { volume: number }, i: number) => (typicalPrices[i] ?? 0) * d.volume);
          const mfiValues: number[] = [];
          for (let i = period; i < data.length; i++) {
            let positiveFlow = 0, negativeFlow = 0;
            for (let j = i - period + 1; j <= i; j++) {
              const tpj = typicalPrices[j] ?? 0;
              const tpjPrev = typicalPrices[j - 1] ?? 0;
              const mfj = moneyFlows[j] ?? 0;
              if (tpj > tpjPrev) positiveFlow += mfj;
              else negativeFlow += mfj;
            }
            mfiValues.push(negativeFlow === 0 ? 100 : 100 - (100 / (1 + positiveFlow / negativeFlow)));
          }
          if (mfiValues.length === 0) return null;
          const currentMfi = mfiValues[mfiValues.length - 1] ?? 50;
          return {
            values: mfiValues,
            currentValue: currentMfi,
            signal: currentMfi < oversold ? 'bullish' : currentMfi > overbought ? 'bearish' : 'neutral',
            signalStrength: currentMfi < oversold ? oversold - currentMfi : currentMfi > overbought ? currentMfi - overbought : 50,
            referenceLines: [
              { value: overbought, label: 'Overbought', color: '#EF4444' },
              { value: oversold, label: 'Oversold', color: '#22C55E' },
            ],
            metadata: { period }
          };
        }

        if (upperName === 'CMF') {
          const period = 20;
          if (data.length < period) return null;
          const cmfValues: number[] = [];
          for (let i = period - 1; i < data.length; i++) {
            let mfvSum = 0, volSum = 0;
            for (let j = i - period + 1; j <= i; j++) {
              const dj = data[j];
              if (dj) {
                const mfm = dj.high === dj.low ? 0 : ((dj.close - dj.low) - (dj.high - dj.close)) / (dj.high - dj.low);
                mfvSum += mfm * dj.volume;
                volSum += dj.volume;
              }
            }
            cmfValues.push(volSum === 0 ? 0 : mfvSum / volSum);
          }
          if (cmfValues.length === 0) return null;
          const currentCmf = cmfValues[cmfValues.length - 1] ?? 0;
          return {
            values: cmfValues,
            currentValue: currentCmf,
            signal: currentCmf > 0.1 ? 'bullish' : currentCmf < -0.1 ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentCmf) * 200),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        // CCI with configurable period (CCI, CCI_7, CCI_14, CCI_20)
        if (upperName === 'CCI' || upperName.startsWith('CCI_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 20;
          // Shorter periods use tighter thresholds
          const overbought = period <= 7 ? 150 : 100;
          const oversold = period <= 7 ? -150 : -100;
          if (data.length < period) return null;
          const typicalPrices = data.map((d: { high: number; low: number; close: number }) => (d.high + d.low + d.close) / 3);
          const cciValues: number[] = [];
          for (let i = period - 1; i < typicalPrices.length; i++) {
            const slice = typicalPrices.slice(i - period + 1, i + 1);
            const sma = slice.reduce((a: number, b: number) => a + b, 0) / period;
            const meanDev = slice.reduce((sum: number, val: number) => sum + Math.abs(val - sma), 0) / period;
            const tpi = typicalPrices[i] ?? sma;
            cciValues.push(meanDev === 0 ? 0 : (tpi - sma) / (0.015 * meanDev));
          }
          if (cciValues.length === 0) return null;
          const currentCci = cciValues[cciValues.length - 1] ?? 0;
          return {
            values: cciValues,
            currentValue: currentCci,
            signal: currentCci < oversold ? 'bullish' : currentCci > overbought ? 'bearish' : 'neutral',
            signalStrength: Math.abs(currentCci) > Math.abs(oversold) ? Math.min(100, Math.abs(currentCci) - Math.abs(oversold)) : 50,
            referenceLines: [
              { value: overbought, label: 'Overbought', color: '#EF4444' },
              { value: oversold, label: 'Oversold', color: '#22C55E' },
              { value: 0, label: 'Zero', color: '#6B7280' },
            ],
            metadata: { period }
          };
        }

        // WILLIAMS_R with configurable period (WILLIAMS_R, WILLIAMS_R_7, WILLIAMS_R_21)
        if (upperName === 'WILLIAMS_R' || upperName.startsWith('WILLIAMS_R_')) {
          const periodStr = upperName.split('_').pop();
          const period = periodStr && !isNaN(parseInt(periodStr, 10)) ? parseInt(periodStr, 10) : 14;
          if (data.length < period) return null;
          const wrValues: number[] = [];
          for (let i = period - 1; i < data.length; i++) {
            const periodData = data.slice(i - period + 1, i + 1);
            const high = Math.max(...periodData.map((d: { high: number }) => d.high));
            const low = Math.min(...periodData.map((d: { low: number }) => d.low));
            const curr = data[i];
            if (curr) {
              wrValues.push(high === low ? -50 : ((high - curr.close) / (high - low)) * -100);
            }
          }
          if (wrValues.length === 0) return null;
          const currentWr = wrValues[wrValues.length - 1] ?? -50;
          return {
            values: wrValues,
            currentValue: currentWr,
            signal: currentWr < -80 ? 'bullish' : currentWr > -20 ? 'bearish' : 'neutral',
            signalStrength: currentWr < -80 ? Math.abs(currentWr + 80) : currentWr > -20 ? Math.abs(currentWr + 20) : 50,
            referenceLines: [
              { value: -20, label: 'Overbought', color: '#EF4444' },
              { value: -80, label: 'Oversold', color: '#22C55E' },
            ],
            metadata: {}
          };
        }

        // ADX with configurable period (ADX, ADX_7, ADX_14, ADX_21)
        if (upperName === 'ADX' || upperName.startsWith('ADX_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 14;
          if (data.length < period * 2) return null;
          const plusDM: number[] = [], minusDM: number[] = [], tr: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i];
            const prev = data[i - 1];
            if (curr && prev) {
              const upMove = curr.high - prev.high;
              const downMove = prev.low - curr.low;
              plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
              minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
              tr.push(Math.max(
                curr.high - curr.low,
                Math.abs(curr.high - prev.close),
                Math.abs(curr.low - prev.close)
              ));
            }
          }
          if (tr.length < period) return null;

          let sumTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
          let sumPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
          let sumMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

          const adxValues: number[] = [];
          let adx = 0;

          for (let i = period; i < tr.length; i++) {
            const trVal = tr[i] ?? 0;
            const plusVal = plusDM[i] ?? 0;
            const minusVal = minusDM[i] ?? 0;
            sumTR = sumTR - sumTR / period + trVal;
            sumPlusDM = sumPlusDM - sumPlusDM / period + plusVal;
            sumMinusDM = sumMinusDM - sumMinusDM / period + minusVal;

            const plusDI = sumTR !== 0 ? (sumPlusDM / sumTR) * 100 : 0;
            const minusDI = sumTR !== 0 ? (sumMinusDM / sumTR) * 100 : 0;
            const diSum = plusDI + minusDI;
            const dx = diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100;

            if (adxValues.length < period) {
              adxValues.push(dx);
              if (adxValues.length === period) {
                adx = adxValues.reduce((a, b) => a + b, 0) / period;
              }
            } else {
              adx = (adx * (period - 1) + dx) / period;
              adxValues.push(adx);
            }
          }
          if (adxValues.length <= period) return null;

          const currentAdx = adxValues[adxValues.length - 1] ?? 25;
          const slicedValues = adxValues.slice(period);
          return {
            values: slicedValues,
            currentValue: currentAdx,
            signal: currentAdx > 25 ? 'bullish' : 'neutral',
            signalStrength: Math.min(100, currentAdx),
            referenceLines: [
              { value: 25, label: 'Trend', color: '#F59E0B' },
              { value: 50, label: 'Strong', color: '#22C55E' },
            ],
            metadata: { trendStrength: currentAdx > 50 ? 'strong' : currentAdx > 25 ? 'moderate' : 'weak' }
          };
        }

        // SUPERTREND with fast variant (SUPERTREND, SUPERTREND_FAST)
        if (upperName === 'SUPERTREND' || upperName === 'SUPERTREND_FAST') {
          const isFast = upperName === 'SUPERTREND_FAST';
          const period = isFast ? 5 : 10, multiplier = isFast ? 2 : 3;
          if (data.length < period + 1) return null;
          // Calculate ATR first
          const trValues: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i];
            const prev = data[i - 1];
            if (curr && prev) {
              trValues.push(Math.max(
                curr.high - curr.low,
                Math.abs(curr.high - prev.close),
                Math.abs(curr.low - prev.close)
              ));
            }
          }
          if (trValues.length < period) return null;
          let atr = trValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
          const atrValues: number[] = [atr];
          for (let i = period; i < trValues.length; i++) {
            const trVal = trValues[i];
            if (trVal !== undefined) {
              atr = (atr * (period - 1) + trVal) / period;
              atrValues.push(atr);
            }
          }

          let trend = 1;
          let finalUpperBand = 0, finalLowerBand = 0;
          const supertrendValues: number[] = [];
          const trends: number[] = [];

          for (let i = period - 1; i < data.length; i++) {
            const atrIdx = i - (period - 1);
            const atrVal = atrValues[atrIdx] ?? 0;
            const curr = data[i];
            const prev = data[i - 1];
            if (!curr) continue;

            const hl2 = (curr.high + curr.low) / 2;
            const upperBand = hl2 + multiplier * atrVal;
            const lowerBand = hl2 - multiplier * atrVal;

            if (i === period - 1) {
              finalUpperBand = upperBand;
              finalLowerBand = lowerBand;
            } else if (prev) {
              finalUpperBand = upperBand < finalUpperBand || prev.close > finalUpperBand ? upperBand : finalUpperBand;
              finalLowerBand = lowerBand > finalLowerBand || prev.close < finalLowerBand ? lowerBand : finalLowerBand;
            }

            if (trend === 1 && curr.close < finalLowerBand) trend = -1;
            else if (trend === -1 && curr.close > finalUpperBand) trend = 1;

            trends.push(trend);
            supertrendValues.push(trend === 1 ? finalLowerBand : finalUpperBand);
          }
          if (supertrendValues.length === 0) return null;

          const currentTrend = trends[trends.length - 1] ?? 1;
          const currentST = supertrendValues[supertrendValues.length - 1] ?? 0;
          const lastClose = data[data.length - 1]?.close ?? currentST;
          return {
            values: supertrendValues,
            currentValue: currentST,
            signal: currentTrend === 1 ? 'bullish' : 'bearish',
            signalStrength: currentST !== 0 ? Math.min(100, Math.abs((lastClose - currentST) / currentST * 100) * 10) : 0,
            metadata: { trend: currentTrend === 1 ? 'up' : 'down' }
          };
        }

        // STOCH_RSI with fast variant (STOCH_RSI, STOCH_RSI_FAST)
        if (upperName === 'STOCH_RSI' || upperName === 'STOCH_RSI_FAST') {
          const isFast = upperName === 'STOCH_RSI_FAST';
          const period = isFast ? 7 : 14;
          if (data.length < period * 2) return null;
          const closes = data.map((d: { close: number }) => d.close);
          const changes: number[] = [];
          for (let i = 1; i < closes.length; i++) {
            const curr = closes[i];
            const prev = closes[i - 1];
            if (curr !== undefined && prev !== undefined) {
              changes.push(curr - prev);
            }
          }
          const gains = changes.map(c => c > 0 ? c : 0);
          const losses = changes.map(c => c < 0 ? -c : 0);
          let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
          let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
          const rsiValues: number[] = [];
          for (let i = period; i < changes.length; i++) {
            const g = gains[i] ?? 0;
            const l = losses[i] ?? 0;
            avgGain = (avgGain * (period - 1) + g) / period;
            avgLoss = (avgLoss * (period - 1) + l) / period;
            rsiValues.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
          }
          if (rsiValues.length < period) return null;

          // Calculate StochRSI
          const stochRsiValues: number[] = [];
          for (let i = period - 1; i < rsiValues.length; i++) {
            const periodRsi = rsiValues.slice(i - period + 1, i + 1);
            const highRsi = Math.max(...periodRsi);
            const lowRsi = Math.min(...periodRsi);
            const rsiVal = rsiValues[i] ?? 50;
            stochRsiValues.push(highRsi === lowRsi ? 50 : ((rsiVal - lowRsi) / (highRsi - lowRsi)) * 100);
          }
          if (stochRsiValues.length === 0) return null;

          const currentStochRsi = stochRsiValues[stochRsiValues.length - 1] ?? 50;
          return {
            values: stochRsiValues,
            currentValue: currentStochRsi,
            signal: currentStochRsi < 20 ? 'bullish' : currentStochRsi > 80 ? 'bearish' : 'neutral',
            signalStrength: currentStochRsi < 20 ? 20 - currentStochRsi : currentStochRsi > 80 ? currentStochRsi - 80 : 50,
            referenceLines: [
              { value: 80, label: 'Overbought', color: '#EF4444' },
              { value: 20, label: 'Oversold', color: '#22C55E' },
            ],
            metadata: {}
          };
        }

        // ROC with configurable period (ROC, ROC_5, ROC_10, ROC_12, ROC_21)
        if (upperName === 'ROC' || upperName.startsWith('ROC_')) {
          const periodStr = upperName.split('_')[1];
          const period = periodStr ? parseInt(periodStr, 10) : 12;
          if (data.length < period + 1) return null;
          const closes = data.map((d: { close: number }) => d.close);
          const rocValues: number[] = [];
          for (let i = period; i < closes.length; i++) {
            const curr = closes[i];
            const prev = closes[i - period];
            if (curr !== undefined && prev !== undefined && prev !== 0) {
              rocValues.push(((curr - prev) / prev) * 100);
            }
          }
          if (rocValues.length === 0) return null;
          const currentRoc = rocValues[rocValues.length - 1] ?? 0;
          return {
            values: rocValues,
            currentValue: currentRoc,
            signal: currentRoc > 0 ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentRoc) * 5),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { period }
          };
        }

        // =====================================================
        // NEW INDICATORS (23 additional)
        // =====================================================

        // VWAP - Volume Weighted Average Price
        if (upperName === 'VWAP') {
          if (data.length < 20) return null;
          const vwapValues: number[] = [];
          let cumVolume = 0, cumVwap = 0;
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d) {
              const typicalPrice = (d.high + d.low + d.close) / 3;
              cumVolume += d.volume;
              cumVwap += typicalPrice * d.volume;
              vwapValues.push(cumVolume > 0 ? cumVwap / cumVolume : typicalPrice);
            }
          }
          if (vwapValues.length === 0) return null;
          const currentVwap = vwapValues[vwapValues.length - 1] ?? 0;
          const currentPrice = data[data.length - 1]?.close ?? currentVwap;
          return {
            values: vwapValues,
            currentValue: currentVwap,
            signal: currentPrice > currentVwap ? 'bullish' : 'bearish',
            signalStrength: currentVwap !== 0 ? Math.min(100, Math.abs((currentPrice - currentVwap) / currentVwap * 100) * 20) : 50,
            metadata: { priceVsVwap: currentVwap !== 0 ? ((currentPrice - currentVwap) / currentVwap * 100).toFixed(2) : '0' }
          };
        }

        // Keltner Channels
        if (upperName === 'KELTNER') {
          const period = 20, mult = 2;
          if (data.length < period + 14) return null;
          const closes = data.map((d: { close: number }) => d.close);

          // Calculate EMA
          const multiplier = 2 / (period + 1);
          let ema = closes.slice(0, period).reduce((a: number, b: number) => a + b, 0) / period;
          const emaValues: number[] = [ema];
          for (let i = period; i < closes.length; i++) {
            ema = (closes[i] - ema) * multiplier + ema;
            emaValues.push(ema);
          }

          // Calculate ATR
          const trValues: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i], prev = data[i - 1];
            if (curr && prev) {
              trValues.push(Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close)));
            }
          }
          let atr = trValues.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
          const atrValues: number[] = [atr];
          for (let i = 14; i < trValues.length; i++) {
            const tr = trValues[i] ?? 0;
            atr = (atr * 13 + tr) / 14;
            atrValues.push(atr);
          }

          const offset = Math.max(0, emaValues.length - atrValues.length);
          const upperBand: number[] = [], lowerBand: number[] = [], middleBand: number[] = [];
          for (let i = 0; i < atrValues.length; i++) {
            const emaVal = emaValues[i + offset] ?? 0;
            const atrVal = atrValues[i] ?? 0;
            middleBand.push(emaVal);
            upperBand.push(emaVal + mult * atrVal);
            lowerBand.push(emaVal - mult * atrVal);
          }
          if (middleBand.length === 0) return null;

          const currentPrice = closes[closes.length - 1] ?? 0;
          const currentMiddle = middleBand[middleBand.length - 1] ?? 0;
          const currentUpper = upperBand[upperBand.length - 1] ?? 0;
          const currentLower = lowerBand[lowerBand.length - 1] ?? 0;

          return {
            values: middleBand,
            currentValue: currentMiddle,
            signal: currentPrice > currentUpper ? 'bearish' : currentPrice < currentLower ? 'bullish' : 'neutral',
            signalStrength: 50,
            secondaryValues: upperBand,
            secondaryLabel: 'Upper Band',
            metadata: { upper: currentUpper, lower: currentLower, middle: currentMiddle }
          };
        }

        // Donchian Channels
        if (upperName === 'DONCHIAN') {
          const period = 20;
          if (data.length < period) return null;
          const upperBand: number[] = [], lowerBand: number[] = [], middleBand: number[] = [];
          for (let i = period - 1; i < data.length; i++) {
            const slice = data.slice(i - period + 1, i + 1);
            const high = Math.max(...slice.map((d: { high: number }) => d.high));
            const low = Math.min(...slice.map((d: { low: number }) => d.low));
            upperBand.push(high);
            lowerBand.push(low);
            middleBand.push((high + low) / 2);
          }
          if (middleBand.length === 0) return null;
          const currentPrice = data[data.length - 1]?.close ?? 0;
          const currentMiddle = middleBand[middleBand.length - 1] ?? 0;
          const currentUpper = upperBand[upperBand.length - 1] ?? 0;
          const currentLower = lowerBand[lowerBand.length - 1] ?? 0;

          return {
            values: middleBand,
            currentValue: currentMiddle,
            signal: currentPrice >= currentUpper ? 'bullish' : currentPrice <= currentLower ? 'bearish' : 'neutral',
            signalStrength: 50,
            secondaryValues: upperBand,
            secondaryLabel: 'Upper Channel',
            metadata: { upper: currentUpper, lower: currentLower, breakout: currentPrice >= currentUpper || currentPrice <= currentLower }
          };
        }

        // Ichimoku Cloud
        if (upperName === 'ICHIMOKU') {
          if (data.length < 52) return null;
          const tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52;

          const calcHL = (arr: typeof data, period: number, idx: number) => {
            const slice = arr.slice(Math.max(0, idx - period + 1), idx + 1);
            const high = Math.max(...slice.map((d: { high: number }) => d.high));
            const low = Math.min(...slice.map((d: { low: number }) => d.low));
            return (high + low) / 2;
          };

          const tenkan: number[] = [], kijun: number[] = [], senkouA: number[] = [], senkouB: number[] = [];
          for (let i = senkouBPeriod - 1; i < data.length; i++) {
            const tenkanVal = calcHL(data, tenkanPeriod, i);
            const kijunVal = calcHL(data, kijunPeriod, i);
            const senkouBVal = calcHL(data, senkouBPeriod, i);
            tenkan.push(tenkanVal);
            kijun.push(kijunVal);
            senkouA.push((tenkanVal + kijunVal) / 2);
            senkouB.push(senkouBVal);
          }
          if (tenkan.length === 0) return null;

          const currentTenkan = tenkan[tenkan.length - 1] ?? 0;
          const currentKijun = kijun[kijun.length - 1] ?? 0;
          const currentPrice = data[data.length - 1]?.close ?? 0;
          const currentSenkouA = senkouA[senkouA.length - 1] ?? 0;
          const currentSenkouB = senkouB[senkouB.length - 1] ?? 0;
          const cloudTop = Math.max(currentSenkouA, currentSenkouB);
          const cloudBottom = Math.min(currentSenkouA, currentSenkouB);

          let signal: string;
          if (currentPrice > cloudTop && currentTenkan > currentKijun) signal = 'bullish';
          else if (currentPrice < cloudBottom && currentTenkan < currentKijun) signal = 'bearish';
          else signal = 'neutral';

          return {
            values: tenkan,
            currentValue: currentTenkan,
            signal,
            signalStrength: signal !== 'neutral' ? 70 : 40,
            secondaryValues: kijun,
            secondaryLabel: 'Kijun-sen',
            metadata: { tenkan: currentTenkan, kijun: currentKijun, senkouA: currentSenkouA, senkouB: currentSenkouB, cloudTop, cloudBottom }
          };
        }

        // Pivot Points
        if (upperName === 'PIVOT') {
          if (data.length < 2) return null;
          const pivotValues: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const prev = data[i - 1];
            if (prev) {
              const pivot = (prev.high + prev.low + prev.close) / 3;
              pivotValues.push(pivot);
            }
          }
          if (pivotValues.length === 0) return null;
          const currentPivot = pivotValues[pivotValues.length - 1] ?? 0;
          const prevCandle = data[data.length - 2];
          const currentPrice = data[data.length - 1]?.close ?? 0;
          const r1 = prevCandle ? 2 * currentPivot - prevCandle.low : currentPivot;
          const s1 = prevCandle ? 2 * currentPivot - prevCandle.high : currentPivot;

          return {
            values: pivotValues,
            currentValue: currentPivot,
            signal: currentPrice > r1 ? 'bullish' : currentPrice < s1 ? 'bearish' : 'neutral',
            signalStrength: 50,
            referenceLines: [
              { value: r1, label: 'R1', color: '#EF4444' },
              { value: currentPivot, label: 'Pivot', color: '#6B7280' },
              { value: s1, label: 'S1', color: '#22C55E' },
            ],
            metadata: { pivot: currentPivot, r1, s1 }
          };
        }

        // Force Index
        if (upperName === 'FORCE_INDEX') {
          const period = 13;
          if (data.length < period + 1) return null;
          const forceRaw: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i], prev = data[i - 1];
            if (curr && prev) {
              forceRaw.push((curr.close - prev.close) * curr.volume);
            }
          }
          // EMA of force
          const multiplier = 2 / (period + 1);
          let ema = forceRaw.slice(0, period).reduce((a, b) => a + b, 0) / period;
          const forceValues: number[] = [ema];
          for (let i = period; i < forceRaw.length; i++) {
            ema = (forceRaw[i] - ema) * multiplier + ema;
            forceValues.push(ema);
          }
          if (forceValues.length === 0) return null;
          const currentForce = forceValues[forceValues.length - 1] ?? 0;

          return {
            values: forceValues,
            currentValue: currentForce,
            signal: currentForce > 0 ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentForce) / 1000000),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        // Ease of Movement (EMV)
        if (upperName === 'EMV') {
          const period = 14;
          if (data.length < period + 1) return null;
          const emvRaw: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i], prev = data[i - 1];
            if (curr && prev && curr.volume > 0) {
              const dm = ((curr.high + curr.low) / 2) - ((prev.high + prev.low) / 2);
              const br = (curr.volume / 100000000) / (curr.high - curr.low || 1);
              emvRaw.push(dm / br);
            }
          }
          // SMA of EMV
          const emvValues: number[] = [];
          for (let i = period - 1; i < emvRaw.length; i++) {
            emvValues.push(emvRaw.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
          }
          if (emvValues.length === 0) return null;
          const currentEmv = emvValues[emvValues.length - 1] ?? 0;

          return {
            values: emvValues,
            currentValue: currentEmv,
            signal: currentEmv > 0 ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentEmv) * 10),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        // Elder Ray (Bull/Bear Power)
        if (upperName === 'ELDER_RAY') {
          const period = 13;
          if (data.length < period) return null;
          const closes = data.map((d: { close: number }) => d.close);

          // EMA
          const multiplier = 2 / (period + 1);
          let ema = closes.slice(0, period).reduce((a: number, b: number) => a + b, 0) / period;
          const bullPower: number[] = [], bearPower: number[] = [];

          for (let i = period; i < data.length; i++) {
            ema = (closes[i] - ema) * multiplier + ema;
            const d = data[i];
            if (d) {
              bullPower.push(d.high - ema);
              bearPower.push(d.low - ema);
            }
          }
          if (bullPower.length === 0) return null;
          const currentBull = bullPower[bullPower.length - 1] ?? 0;
          const currentBear = bearPower[bearPower.length - 1] ?? 0;

          return {
            values: bullPower,
            currentValue: currentBull,
            signal: currentBull > 0 && currentBear > (bearPower[bearPower.length - 2] ?? 0) ? 'bullish' :
                   currentBear < 0 && currentBull < (bullPower[bullPower.length - 2] ?? 0) ? 'bearish' : 'neutral',
            signalStrength: 50,
            secondaryValues: bearPower,
            secondaryLabel: 'Bear Power',
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { bullPower: currentBull, bearPower: currentBear }
          };
        }

        // Ultimate Oscillator
        if (upperName === 'UO') {
          if (data.length < 28 + 1) return null;
          const bp: number[] = [], tr: number[] = [];
          for (let i = 1; i < data.length; i++) {
            const curr = data[i], prev = data[i - 1];
            if (curr && prev) {
              bp.push(curr.close - Math.min(curr.low, prev.close));
              tr.push(Math.max(curr.high, prev.close) - Math.min(curr.low, prev.close));
            }
          }

          const calcAvg = (arr1: number[], arr2: number[], period: number, idx: number) => {
            const sum1 = arr1.slice(idx - period + 1, idx + 1).reduce((a, b) => a + b, 0);
            const sum2 = arr2.slice(idx - period + 1, idx + 1).reduce((a, b) => a + b, 0);
            return sum2 > 0 ? sum1 / sum2 : 0;
          };

          const uoValues: number[] = [];
          for (let i = 27; i < bp.length; i++) {
            const avg7 = calcAvg(bp, tr, 7, i);
            const avg14 = calcAvg(bp, tr, 14, i);
            const avg28 = calcAvg(bp, tr, 28, i);
            uoValues.push(100 * (4 * avg7 + 2 * avg14 + avg28) / 7);
          }
          if (uoValues.length === 0) return null;
          const currentUo = uoValues[uoValues.length - 1] ?? 50;

          return {
            values: uoValues,
            currentValue: currentUo,
            signal: currentUo < 30 ? 'bullish' : currentUo > 70 ? 'bearish' : 'neutral',
            signalStrength: currentUo < 30 ? 30 - currentUo : currentUo > 70 ? currentUo - 70 : 50,
            referenceLines: [
              { value: 70, label: 'Overbought', color: '#EF4444' },
              { value: 30, label: 'Oversold', color: '#22C55E' },
            ],
            metadata: {}
          };
        }

        // Chande Momentum Oscillator
        if (upperName === 'CMO') {
          const period = 14;
          if (data.length < period + 1) return null;
          const closes = data.map((d: { close: number }) => d.close);
          const gains: number[] = [], losses: number[] = [];
          for (let i = 1; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
          }

          const cmoValues: number[] = [];
          for (let i = period - 1; i < gains.length; i++) {
            const sumGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            const sumLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            const denom = sumGain + sumLoss;
            cmoValues.push(denom > 0 ? ((sumGain - sumLoss) / denom) * 100 : 0);
          }
          if (cmoValues.length === 0) return null;
          const currentCmo = cmoValues[cmoValues.length - 1] ?? 0;

          return {
            values: cmoValues,
            currentValue: currentCmo,
            signal: currentCmo < -50 ? 'bullish' : currentCmo > 50 ? 'bearish' : 'neutral',
            signalStrength: Math.abs(currentCmo),
            referenceLines: [
              { value: 50, label: 'Overbought', color: '#EF4444' },
              { value: -50, label: 'Oversold', color: '#22C55E' },
              { value: 0, label: 'Zero', color: '#6B7280' },
            ],
            metadata: {}
          };
        }

        // Detrended Price Oscillator
        if (upperName === 'DPO') {
          const period = 20;
          const shift = Math.floor(period / 2) + 1;
          if (data.length < period + shift) return null;
          const closes = data.map((d: { close: number }) => d.close);

          const dpoValues: number[] = [];
          for (let i = period - 1 + shift; i < closes.length; i++) {
            const sma = closes.slice(i - period - shift + 1, i - shift + 1).reduce((a: number, b: number) => a + b, 0) / period;
            dpoValues.push(closes[i - shift] - sma);
          }
          if (dpoValues.length === 0) return null;
          const currentDpo = dpoValues[dpoValues.length - 1] ?? 0;

          return {
            values: dpoValues,
            currentValue: currentDpo,
            signal: currentDpo > 0 ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentDpo) * 10),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        // Aroon Oscillator
        if (upperName === 'AROON') {
          const period = 25;
          if (data.length < period + 1) return null;
          const aroonValues: number[] = [];

          for (let i = period; i < data.length; i++) {
            const slice = data.slice(i - period, i + 1);
            let highIdx = 0, lowIdx = 0;
            let highVal = slice[0]?.high ?? 0, lowVal = slice[0]?.low ?? Infinity;
            for (let j = 0; j < slice.length; j++) {
              const d = slice[j];
              if (d) {
                if (d.high >= highVal) { highVal = d.high; highIdx = j; }
                if (d.low <= lowVal) { lowVal = d.low; lowIdx = j; }
              }
            }
            const aroonUp = (highIdx / period) * 100;
            const aroonDown = (lowIdx / period) * 100;
            aroonValues.push(aroonUp - aroonDown);
          }
          if (aroonValues.length === 0) return null;
          const currentAroon = aroonValues[aroonValues.length - 1] ?? 0;

          return {
            values: aroonValues,
            currentValue: currentAroon,
            signal: currentAroon > 50 ? 'bullish' : currentAroon < -50 ? 'bearish' : 'neutral',
            signalStrength: Math.abs(currentAroon),
            referenceLines: [
              { value: 50, label: 'Bullish', color: '#22C55E' },
              { value: -50, label: 'Bearish', color: '#EF4444' },
              { value: 0, label: 'Zero', color: '#6B7280' },
            ],
            metadata: {}
          };
        }

        // Parabolic SAR
        if (upperName === 'PSAR') {
          if (data.length < 5) return null;
          const af0 = 0.02, afMax = 0.2, afStep = 0.02;
          let af = af0, ep = data[0]?.high ?? 0, sar = data[0]?.low ?? 0, isLong = true;
          const sarValues: number[] = [sar];

          for (let i = 1; i < data.length; i++) {
            const curr = data[i];
            if (!curr) continue;

            const prevSar = sar;
            sar = prevSar + af * (ep - prevSar);

            if (isLong) {
              sar = Math.min(sar, data[i - 1]?.low ?? sar);
              if (i >= 2) sar = Math.min(sar, data[i - 2]?.low ?? sar);
              if (curr.low < sar) {
                isLong = false;
                sar = ep;
                ep = curr.low;
                af = af0;
              } else {
                if (curr.high > ep) { ep = curr.high; af = Math.min(af + afStep, afMax); }
              }
            } else {
              sar = Math.max(sar, data[i - 1]?.high ?? sar);
              if (i >= 2) sar = Math.max(sar, data[i - 2]?.high ?? sar);
              if (curr.high > sar) {
                isLong = true;
                sar = ep;
                ep = curr.high;
                af = af0;
              } else {
                if (curr.low < ep) { ep = curr.low; af = Math.min(af + afStep, afMax); }
              }
            }
            sarValues.push(sar);
          }

          const currentSar = sarValues[sarValues.length - 1] ?? 0;
          const currentPrice = data[data.length - 1]?.close ?? 0;
          const finalIsLong = currentPrice > currentSar;

          return {
            values: sarValues,
            currentValue: currentSar,
            signal: finalIsLong ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs((currentPrice - currentSar) / currentSar * 100) * 20),
            metadata: { isLong: finalIsLong, sar: currentSar }
          };
        }

        // Hull Moving Average
        if (upperName === 'HMA') {
          const period = 20;
          if (data.length < period * 2) return null;
          const closes = data.map((d: { close: number }) => d.close);

          const calcWma = (arr: number[], len: number): number[] => {
            const result: number[] = [];
            for (let i = len - 1; i < arr.length; i++) {
              let sum = 0, weightSum = 0;
              for (let j = 0; j < len; j++) {
                const w = len - j;
                sum += (arr[i - j] ?? 0) * w;
                weightSum += w;
              }
              result.push(sum / weightSum);
            }
            return result;
          };

          const halfPeriod = Math.floor(period / 2);
          const sqrtPeriod = Math.floor(Math.sqrt(period));
          const wma1 = calcWma(closes, halfPeriod);
          const wma2 = calcWma(closes, period);

          const offset = wma1.length - wma2.length;
          const rawHma: number[] = [];
          for (let i = 0; i < wma2.length; i++) {
            rawHma.push(2 * (wma1[i + offset] ?? 0) - (wma2[i] ?? 0));
          }
          const hmaValues = calcWma(rawHma, sqrtPeriod);
          if (hmaValues.length === 0) return null;

          const currentHma = hmaValues[hmaValues.length - 1] ?? 0;
          const currentPrice = closes[closes.length - 1] ?? 0;

          return {
            values: hmaValues,
            currentValue: currentHma,
            signal: currentPrice > currentHma ? 'bullish' : 'bearish',
            signalStrength: currentHma !== 0 ? Math.min(100, Math.abs((currentPrice - currentHma) / currentHma * 100) * 20) : 50,
            metadata: {}
          };
        }

        // DEMA - Double Exponential Moving Average
        if (upperName === 'DEMA') {
          const period = 20;
          if (data.length < period * 2) return null;
          const closes = data.map((d: { close: number }) => d.close);

          const calcEma = (arr: number[], len: number): number[] => {
            const multiplier = 2 / (len + 1);
            let ema = arr.slice(0, len).reduce((a, b) => a + b, 0) / len;
            const result = [ema];
            for (let i = len; i < arr.length; i++) {
              ema = (arr[i] - ema) * multiplier + ema;
              result.push(ema);
            }
            return result;
          };

          const ema1 = calcEma(closes, period);
          const ema2 = calcEma(ema1, period);

          const offset = ema1.length - ema2.length;
          const demaValues: number[] = [];
          for (let i = 0; i < ema2.length; i++) {
            demaValues.push(2 * (ema1[i + offset] ?? 0) - (ema2[i] ?? 0));
          }
          if (demaValues.length === 0) return null;

          const currentDema = demaValues[demaValues.length - 1] ?? 0;
          const currentPrice = closes[closes.length - 1] ?? 0;

          return {
            values: demaValues,
            currentValue: currentDema,
            signal: currentPrice > currentDema ? 'bullish' : 'bearish',
            signalStrength: currentDema !== 0 ? Math.min(100, Math.abs((currentPrice - currentDema) / currentDema * 100) * 20) : 50,
            metadata: {}
          };
        }

        // TEMA - Triple Exponential Moving Average
        if (upperName === 'TEMA') {
          const period = 20;
          if (data.length < period * 3) return null;
          const closes = data.map((d: { close: number }) => d.close);

          const calcEma = (arr: number[], len: number): number[] => {
            const multiplier = 2 / (len + 1);
            let ema = arr.slice(0, len).reduce((a, b) => a + b, 0) / len;
            const result = [ema];
            for (let i = len; i < arr.length; i++) {
              ema = (arr[i] - ema) * multiplier + ema;
              result.push(ema);
            }
            return result;
          };

          const ema1 = calcEma(closes, period);
          const ema2 = calcEma(ema1, period);
          const ema3 = calcEma(ema2, period);

          const offset1 = ema1.length - ema2.length;
          const offset2 = ema2.length - ema3.length;
          const temaValues: number[] = [];
          for (let i = 0; i < ema3.length; i++) {
            const e1 = ema1[i + offset1 + offset2] ?? 0;
            const e2 = ema2[i + offset2] ?? 0;
            const e3 = ema3[i] ?? 0;
            temaValues.push(3 * e1 - 3 * e2 + e3);
          }
          if (temaValues.length === 0) return null;

          const currentTema = temaValues[temaValues.length - 1] ?? 0;
          const currentPrice = closes[closes.length - 1] ?? 0;

          return {
            values: temaValues,
            currentValue: currentTema,
            signal: currentPrice > currentTema ? 'bullish' : 'bearish',
            signalStrength: currentTema !== 0 ? Math.min(100, Math.abs((currentPrice - currentTema) / currentTema * 100) * 20) : 50,
            metadata: {}
          };
        }

        // TRIX
        if (upperName === 'TRIX') {
          const period = 15;
          if (data.length < period * 3 + 1) return null;
          const closes = data.map((d: { close: number }) => d.close);

          const calcEma = (arr: number[], len: number): number[] => {
            const multiplier = 2 / (len + 1);
            let ema = arr.slice(0, len).reduce((a, b) => a + b, 0) / len;
            const result = [ema];
            for (let i = len; i < arr.length; i++) {
              ema = (arr[i] - ema) * multiplier + ema;
              result.push(ema);
            }
            return result;
          };

          const ema1 = calcEma(closes, period);
          const ema2 = calcEma(ema1, period);
          const ema3 = calcEma(ema2, period);

          const trixValues: number[] = [];
          for (let i = 1; i < ema3.length; i++) {
            const curr = ema3[i] ?? 0, prev = ema3[i - 1] ?? 1;
            trixValues.push(prev !== 0 ? ((curr - prev) / prev) * 10000 : 0);
          }
          if (trixValues.length === 0) return null;
          const currentTrix = trixValues[trixValues.length - 1] ?? 0;

          return {
            values: trixValues,
            currentValue: currentTrix,
            signal: currentTrix > 0 ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentTrix) * 10),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        // PPO - Percentage Price Oscillator
        if (upperName === 'PPO') {
          if (data.length < 26 + 9) return null;
          const closes = data.map((d: { close: number }) => d.close);

          const calcEma = (arr: number[], len: number): number[] => {
            const multiplier = 2 / (len + 1);
            let ema = arr.slice(0, len).reduce((a, b) => a + b, 0) / len;
            const result = [ema];
            for (let i = len; i < arr.length; i++) {
              ema = (arr[i] - ema) * multiplier + ema;
              result.push(ema);
            }
            return result;
          };

          const ema12 = calcEma(closes, 12);
          const ema26 = calcEma(closes, 26);

          const offset = ema12.length - ema26.length;
          const ppoLine: number[] = [];
          for (let i = 0; i < ema26.length; i++) {
            const fast = ema12[i + offset] ?? 0;
            const slow = ema26[i] ?? 1;
            ppoLine.push(slow !== 0 ? ((fast - slow) / slow) * 100 : 0);
          }

          const signalLine = calcEma(ppoLine, 9);
          const histOffset = ppoLine.length - signalLine.length;
          const histogram: number[] = [];
          for (let i = 0; i < signalLine.length; i++) {
            histogram.push((ppoLine[i + histOffset] ?? 0) - (signalLine[i] ?? 0));
          }
          if (histogram.length === 0) return null;
          const currentPpo = histogram[histogram.length - 1] ?? 0;

          return {
            values: histogram,
            currentValue: currentPpo,
            signal: currentPpo > 0 ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentPpo) * 20),
            secondaryValues: signalLine,
            secondaryLabel: 'Signal',
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        // =====================================================
        // ADDITIONAL RECOMMENDED INDICATORS
        // =====================================================

        // Choppiness Index - Measures if market is trending or ranging (0-100)
        if (upperName === 'CHOP' || upperName === 'CHOPPINESS') {
          const period = 14;
          if (data.length < period + 1) return null;

          const chopValues: number[] = [];
          for (let i = period; i < data.length; i++) {
            const periodData = data.slice(i - period + 1, i + 1);
            const highestHigh = Math.max(...periodData.map((d: { high: number }) => d.high));
            const lowestLow = Math.min(...periodData.map((d: { low: number }) => d.low));

            // Sum of True Range
            let atrSum = 0;
            for (let j = i - period + 1; j <= i; j++) {
              const curr = data[j];
              const prev = data[j - 1];
              if (curr && prev) {
                const tr = Math.max(
                  curr.high - curr.low,
                  Math.abs(curr.high - prev.close),
                  Math.abs(curr.low - prev.close)
                );
                atrSum += tr;
              }
            }

            const hlRange = highestHigh - lowestLow;
            if (hlRange > 0) {
              const chop = 100 * Math.log10(atrSum / hlRange) / Math.log10(period);
              chopValues.push(Math.max(0, Math.min(100, chop)));
            }
          }

          if (chopValues.length === 0) return null;
          const currentChop = chopValues[chopValues.length - 1] ?? 50;

          return {
            values: chopValues,
            currentValue: currentChop,
            // High chop = ranging/consolidation, Low chop = trending
            signal: currentChop < 38.2 ? 'bullish' : currentChop > 61.8 ? 'neutral' : 'neutral',
            signalStrength: currentChop < 38.2 ? 100 - currentChop * 2 : 50,
            referenceLines: [
              { value: 61.8, label: 'Choppy', color: '#F59E0B' },
              { value: 38.2, label: 'Trending', color: '#22C55E' },
            ],
            metadata: { marketState: currentChop > 61.8 ? 'ranging' : currentChop < 38.2 ? 'trending' : 'transitional' }
          };
        }

        // Linear Regression Slope - Trend direction and strength
        if (upperName === 'LRS' || upperName === 'LINEAR_REGRESSION_SLOPE') {
          const period = 20;
          if (data.length < period) return null;

          const closes = data.map((d: { close: number }) => d.close);
          const lrsValues: number[] = [];

          for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            // Calculate linear regression slope
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            for (let j = 0; j < period; j++) {
              const x = j;
              const y = slice[j] ?? 0;
              sumX += x;
              sumY += y;
              sumXY += x * y;
              sumX2 += x * x;
            }
            const n = period;
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            lrsValues.push(slope);
          }

          if (lrsValues.length === 0) return null;
          const currentSlope = lrsValues[lrsValues.length - 1] ?? 0;
          const avgPrice = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
          const normalizedSlope = avgPrice !== 0 ? (currentSlope / avgPrice) * 100 : 0;

          return {
            values: lrsValues,
            currentValue: normalizedSlope,
            signal: normalizedSlope > 0.1 ? 'bullish' : normalizedSlope < -0.1 ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(normalizedSlope) * 50),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { rawSlope: currentSlope, trendAngle: Math.atan(currentSlope) * (180 / Math.PI) }
          };
        }

        // RVI (Relative Vigor Index) - Momentum based on close vs open
        if (upperName === 'RVI') {
          const period = 10;
          if (data.length < period + 4) return null;

          // Calculate numerator (close - open) and denominator (high - low) with smoothing
          const rviValues: number[] = [];
          const signalValues: number[] = [];

          for (let i = 3; i < data.length; i++) {
            const d0 = data[i], d1 = data[i-1], d2 = data[i-2], d3 = data[i-3];
            if (d0 && d1 && d2 && d3) {
              const num = ((d0.close - d0.open) + 2*(d1.close - d1.open) + 2*(d2.close - d2.open) + (d3.close - d3.open)) / 6;
              const den = ((d0.high - d0.low) + 2*(d1.high - d1.low) + 2*(d2.high - d2.low) + (d3.high - d3.low)) / 6;
              rviValues.push(den !== 0 ? num / den : 0);
            }
          }

          if (rviValues.length < period) return null;

          // Calculate signal line (4-period SMA of RVI)
          for (let i = 3; i < rviValues.length; i++) {
            const slice = rviValues.slice(i - 3, i + 1);
            signalValues.push(slice.reduce((a, b) => a + b, 0) / 4);
          }

          if (signalValues.length === 0) return null;
          const currentRvi = rviValues[rviValues.length - 1] ?? 0;
          const currentSignal = signalValues[signalValues.length - 1] ?? 0;

          return {
            values: rviValues.slice(-signalValues.length),
            currentValue: currentRvi,
            signal: currentRvi > currentSignal && currentRvi > 0 ? 'bullish' :
                   currentRvi < currentSignal && currentRvi < 0 ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentRvi - currentSignal) * 200),
            secondaryValues: signalValues,
            secondaryLabel: 'Signal',
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { rvi: currentRvi, signal: currentSignal }
          };
        }

        // Chaikin Oscillator - Momentum of A/D Line
        if (upperName === 'CHAIKIN' || upperName === 'CHO') {
          if (data.length < 13) return null;

          // First calculate A/D Line
          let adl = 0;
          const adlValues: number[] = [];
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d) {
              const mfm = d.high === d.low ? 0 : ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low);
              adl += mfm * d.volume;
              adlValues.push(adl);
            }
          }

          if (adlValues.length < 13) return null;

          // Calculate 3-day EMA and 10-day EMA of A/D Line
          const calcEma = (values: number[], period: number) => {
            const mult = 2 / (period + 1);
            const ema: number[] = [values[0] ?? 0];
            for (let i = 1; i < values.length; i++) {
              const val = values[i] ?? 0;
              const prevEma = ema[i - 1] ?? 0;
              ema.push((val - prevEma) * mult + prevEma);
            }
            return ema;
          };

          const ema3 = calcEma(adlValues, 3);
          const ema10 = calcEma(adlValues, 10);

          const choValues: number[] = [];
          for (let i = 9; i < adlValues.length; i++) {
            const e3 = ema3[i] ?? 0;
            const e10 = ema10[i] ?? 0;
            choValues.push(e3 - e10);
          }

          if (choValues.length === 0) return null;
          const currentCho = choValues[choValues.length - 1] ?? 0;
          const prevCho = choValues[choValues.length - 2] ?? currentCho;

          return {
            values: choValues,
            currentValue: currentCho,
            signal: currentCho > 0 && currentCho > prevCho ? 'bullish' :
                   currentCho < 0 && currentCho < prevCho ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentCho) / 10000),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { momentum: currentCho > prevCho ? 'rising' : 'falling' }
          };
        }

        // A/D Line (Accumulation/Distribution Line)
        if (upperName === 'AD' || upperName === 'ADL') {
          if (data.length < 20) return null;

          let adl = 0;
          const adlValues: number[] = [];
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d) {
              const mfm = d.high === d.low ? 0 : ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low);
              adl += mfm * d.volume;
              adlValues.push(adl);
            }
          }

          if (adlValues.length === 0) return null;
          const currentAd = adlValues[adlValues.length - 1] ?? 0;
          const prevAd = adlValues[adlValues.length - 20] ?? adlValues[0] ?? 0;

          return {
            values: adlValues,
            currentValue: currentAd,
            signal: currentAd > prevAd ? 'bullish' : 'bearish',
            signalStrength: Math.min(100, Math.abs(currentAd - prevAd) / Math.max(1, Math.abs(prevAd)) * 100),
            metadata: { trend: currentAd > prevAd ? 'accumulation' : 'distribution' }
          };
        }

        // Standard Deviation - Volatility measure
        if (upperName === 'STDDEV' || upperName === 'STD') {
          const period = 20;
          if (data.length < period) return null;

          const closes = data.map((d: { close: number }) => d.close);
          const stdValues: number[] = [];

          for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / period;
            const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
            stdValues.push(Math.sqrt(variance));
          }

          if (stdValues.length === 0) return null;
          const currentStd = stdValues[stdValues.length - 1] ?? 0;
          const avgStd = stdValues.reduce((a, b) => a + b, 0) / stdValues.length;

          return {
            values: stdValues,
            currentValue: currentStd,
            signal: currentStd > avgStd * 1.5 ? 'bearish' : currentStd < avgStd * 0.5 ? 'bullish' : 'neutral',
            signalStrength: avgStd !== 0 ? Math.min(100, (currentStd / avgStd) * 50) : 0,
            metadata: { volatility: currentStd > avgStd ? 'high' : 'low', percentOfAvg: avgStd !== 0 ? (currentStd / avgStd * 100).toFixed(1) : 0 }
          };
        }

        // Chaikin Volatility - Based on high-low range
        if (upperName === 'CV' || upperName === 'CHAIKIN_VOLATILITY') {
          const period = 10, rocPeriod = 10;
          if (data.length < period + rocPeriod) return null;

          // Calculate EMA of high-low range
          const hlRange = data.map((d: { high: number; low: number }) => d.high - d.low);
          const mult = 2 / (period + 1);
          const ema: number[] = [hlRange[0] ?? 0];
          for (let i = 1; i < hlRange.length; i++) {
            const val = hlRange[i] ?? 0;
            const prevEma = ema[i - 1] ?? 0;
            ema.push((val - prevEma) * mult + prevEma);
          }

          // Calculate ROC of EMA
          const cvValues: number[] = [];
          for (let i = rocPeriod; i < ema.length; i++) {
            const curr = ema[i] ?? 0;
            const prev = ema[i - rocPeriod] ?? 1;
            cvValues.push(prev !== 0 ? ((curr - prev) / prev) * 100 : 0);
          }

          if (cvValues.length === 0) return null;
          const currentCv = cvValues[cvValues.length - 1] ?? 0;

          return {
            values: cvValues,
            currentValue: currentCv,
            signal: currentCv > 25 ? 'bearish' : currentCv < -25 ? 'bullish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentCv)),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { volatilityChange: currentCv > 0 ? 'expanding' : 'contracting' }
          };
        }

        // Coppock Curve
        if (upperName === 'COPPOCK') {
          const roc14 = 14, roc11 = 11, wmaPeriod = 10;
          if (data.length < Math.max(roc14, roc11) + wmaPeriod) return null;
          const closes = data.map((d: { close: number }) => d.close);

          const rocSum: number[] = [];
          for (let i = roc14; i < closes.length; i++) {
            const r14 = closes[i - roc14] !== 0 ? ((closes[i] - closes[i - roc14]) / closes[i - roc14]) * 100 : 0;
            const r11 = closes[i - roc11] !== 0 ? ((closes[i] - closes[i - roc11]) / closes[i - roc11]) * 100 : 0;
            rocSum.push(r14 + r11);
          }

          // WMA
          const coppockValues: number[] = [];
          for (let i = wmaPeriod - 1; i < rocSum.length; i++) {
            let sum = 0, weightSum = 0;
            for (let j = 0; j < wmaPeriod; j++) {
              const w = wmaPeriod - j;
              sum += (rocSum[i - j] ?? 0) * w;
              weightSum += w;
            }
            coppockValues.push(sum / weightSum);
          }
          if (coppockValues.length === 0) return null;
          const currentCoppock = coppockValues[coppockValues.length - 1] ?? 0;
          const prevCoppock = coppockValues[coppockValues.length - 2] ?? currentCoppock;

          return {
            values: coppockValues,
            currentValue: currentCoppock,
            signal: currentCoppock > 0 && currentCoppock > prevCoppock ? 'bullish' :
                   currentCoppock < 0 && currentCoppock < prevCoppock ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentCoppock) * 5),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        // =====================================================
        // INSTITUTIONAL-GRADE INDICATORS
        // =====================================================

        // Volume Profile (Simplified) - Price levels with volume concentration
        if (upperName === 'VOLUME_PROFILE' || upperName === 'VP') {
          if (data.length < 50) return null;

          // Find price range
          const highs = data.map((d: { high: number }) => d.high ?? 0).filter(v => isFinite(v));
          const lows = data.map((d: { low: number }) => d.low ?? 0).filter(v => isFinite(v));
          if (highs.length === 0 || lows.length === 0) return null;
          const maxPrice = Math.max(...highs);
          const minPrice = Math.min(...lows);
          const priceRange = maxPrice - minPrice;

          // Guard against zero price range
          if (priceRange === 0 || !isFinite(priceRange)) return null;

          const numBins = 20;
          const binSize = priceRange / numBins;

          // Guard against zero bin size
          if (binSize === 0 || !isFinite(binSize)) return null;

          // Create volume profile bins
          const volumeProfile: number[] = new Array(numBins).fill(0);
          for (const candle of data) {
            const d = candle as { high: number; low: number; close: number; volume: number };
            const avgPrice = (d.high + d.low + d.close) / 3;
            const binIndex = Math.min(numBins - 1, Math.max(0, Math.floor((avgPrice - minPrice) / binSize)));
            volumeProfile[binIndex] += d.volume || 0;
          }

          // Find POC (Point of Control) - price level with highest volume
          const maxVolume = Math.max(...volumeProfile);
          const pocIndex = volumeProfile.indexOf(maxVolume);
          const pocPrice = minPrice + (pocIndex + 0.5) * binSize;

          // Find Value Area (70% of volume)
          const totalVolume = volumeProfile.reduce((a, b) => a + b, 0);
          const targetVolume = totalVolume * 0.7;
          let vaVolume = volumeProfile[pocIndex];
          let vaHigh = pocIndex, vaLow = pocIndex;

          while (vaVolume < targetVolume) {
            const upperVol = vaHigh < numBins - 1 ? volumeProfile[vaHigh + 1] : 0;
            const lowerVol = vaLow > 0 ? volumeProfile[vaLow - 1] : 0;
            if (upperVol >= lowerVol && vaHigh < numBins - 1) {
              vaHigh++;
              vaVolume += upperVol;
            } else if (vaLow > 0) {
              vaLow--;
              vaVolume += lowerVol;
            } else break;
          }

          const vahPrice = minPrice + (vaHigh + 1) * binSize;
          const valPrice = minPrice + vaLow * binSize;
          const currentPrice = data[data.length - 1]?.close ?? pocPrice;

          return {
            values: volumeProfile,
            currentValue: pocPrice,
            signal: currentPrice > vahPrice ? 'bullish' : currentPrice < valPrice ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentPrice - pocPrice) / priceRange * 200),
            referenceLines: [
              { value: pocPrice, label: 'POC', color: '#EF4444' },
              { value: vahPrice, label: 'VAH', color: '#22C55E' },
              { value: valPrice, label: 'VAL', color: '#3B82F6' },
            ],
            metadata: { poc: pocPrice, vah: vahPrice, val: valPrice, priceInValueArea: currentPrice >= valPrice && currentPrice <= vahPrice }
          };
        }

        // Klinger Volume Oscillator - Volume-based trend
        if (upperName === 'KVO' || upperName === 'KLINGER') {
          if (data.length < 55) return null;

          const hlc3 = data.map((d: { high: number; low: number; close: number }) =>
            ((d.high ?? 0) + (d.low ?? 0) + (d.close ?? 0)) / 3
          );
          const dm: number[] = [];
          const trend: number[] = [];
          const vf: number[] = [];

          for (let i = 1; i < data.length; i++) {
            const curr = data[i] as { high?: number; low?: number; close?: number; volume?: number };
            const prev = data[i - 1] as { high?: number; low?: number; close?: number };
            if (!curr || !prev) continue;

            dm.push((curr.high ?? 0) - (curr.low ?? 0));
            const currHlc3 = hlc3[i] ?? 0;
            const prevHlc3 = hlc3[i - 1] ?? 0;
            trend.push(currHlc3 > prevHlc3 ? 1 : -1);

            const cm = dm[dm.length - 1] ?? 0;
            const prevCm = dm[dm.length - 2] ?? cm;
            const cmRatio = prevCm !== 0 ? Math.abs((cm - prevCm) / prevCm) : 0;
            const trendVal = trend[trend.length - 1] ?? 1;
            vf.push((curr.volume || 0) * Math.abs(2 * cmRatio - 1) * trendVal * 100);
          }

          // EMA of VF
          const calcEma = (values: number[], period: number) => {
            const mult = 2 / (period + 1);
            const ema: number[] = [values[0] ?? 0];
            for (let i = 1; i < values.length; i++) {
              ema.push((values[i] - (ema[i - 1] ?? 0)) * mult + (ema[i - 1] ?? 0));
            }
            return ema;
          };

          // Guard against empty vf array
          if (vf.length < 55) return null;

          const ema34 = calcEma(vf, 34);
          const ema55 = calcEma(vf, 55);

          const kvoValues: number[] = [];
          for (let i = 54; i < vf.length; i++) {
            kvoValues.push((ema34[i] ?? 0) - (ema55[i] ?? 0));
          }

          // Signal line (13-period EMA)
          if (kvoValues.length === 0) return null;
          const signalLine = calcEma(kvoValues, 13);

          if (signalLine.length === 0) return null;
          const currentKvo = kvoValues[kvoValues.length - 1] ?? 0;
          const currentSignal = signalLine[signalLine.length - 1] ?? 0;

          return {
            values: kvoValues,
            currentValue: currentKvo,
            signal: currentKvo > currentSignal && currentKvo > 0 ? 'bullish' :
                   currentKvo < currentSignal && currentKvo < 0 ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentKvo - currentSignal) / 1000000),
            secondaryValues: signalLine,
            secondaryLabel: 'Signal',
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { kvo: currentKvo, signal: currentSignal, crossover: currentKvo > currentSignal }
          };
        }

        // Mass Index - Trend reversal detection
        if (upperName === 'MASS' || upperName === 'MASS_INDEX') {
          const emaPeriod = 9, sumPeriod = 25;
          if (data.length < emaPeriod * 2 + sumPeriod) return null;

          const hlRange = data.map((d: { high: number; low: number }) => (d.high ?? 0) - (d.low ?? 0));

          // Calculate single EMA
          const calcEma = (values: number[], period: number) => {
            const mult = 2 / (period + 1);
            const ema: number[] = [values[0] ?? 0];
            for (let i = 1; i < values.length; i++) {
              ema.push((values[i] - (ema[i - 1] ?? 0)) * mult + (ema[i - 1] ?? 0));
            }
            return ema;
          };

          const ema1 = calcEma(hlRange, emaPeriod);
          const ema2 = calcEma(ema1, emaPeriod);

          // Calculate ratio and sum
          const massValues: number[] = [];
          for (let i = sumPeriod + emaPeriod * 2 - 2; i < ema2.length; i++) {
            let sum = 0;
            for (let j = 0; j < sumPeriod; j++) {
              const e1 = ema1[i - j] ?? 1;
              const e2 = ema2[i - j] ?? 1;
              sum += e2 !== 0 ? e1 / e2 : 1;
            }
            massValues.push(sum);
          }

          if (massValues.length === 0) return null;
          const currentMass = massValues[massValues.length - 1] ?? 25;
          const prevMass = massValues[massValues.length - 2] ?? currentMass;

          // Reversal bulge: above 27, then drops below 26.5
          const isReversalBulge = currentMass < 26.5 && prevMass > 27;

          return {
            values: massValues,
            currentValue: currentMass,
            signal: isReversalBulge ? 'bearish' : currentMass > 27 ? 'neutral' : 'neutral',
            signalStrength: currentMass > 27 ? Math.min(100, (currentMass - 27) * 20) : 50,
            referenceLines: [
              { value: 27, label: 'Bulge', color: '#EF4444' },
              { value: 26.5, label: 'Trigger', color: '#F59E0B' },
            ],
            metadata: { reversalBulge: isReversalBulge, bulgeForming: currentMass > 27 }
          };
        }

        // True Strength Index (TSI) - Double-smoothed momentum
        if (upperName === 'TSI') {
          const longPeriod = 25, shortPeriod = 13, signalPeriod = 7;
          if (data.length < longPeriod + shortPeriod + signalPeriod) return null;

          const closes = data.map((d: { close: number }) => d.close ?? 0);
          const changes: number[] = [];
          for (let i = 1; i < closes.length; i++) {
            const curr = closes[i] ?? 0;
            const prev = closes[i - 1] ?? 0;
            changes.push(curr - prev);
          }

          if (changes.length < longPeriod) return null;

          // Double-smooth the price change
          const calcEma = (values: number[], period: number) => {
            const mult = 2 / (period + 1);
            const ema: number[] = [values[0] ?? 0];
            for (let i = 1; i < values.length; i++) {
              ema.push((values[i] - (ema[i - 1] ?? 0)) * mult + (ema[i - 1] ?? 0));
            }
            return ema;
          };

          const ema1 = calcEma(changes, longPeriod);
          const ema2 = calcEma(ema1, shortPeriod);

          // Double-smooth the absolute price change
          const absChanges = changes.map(c => Math.abs(c));
          const absEma1 = calcEma(absChanges, longPeriod);
          const absEma2 = calcEma(absEma1, shortPeriod);

          // Calculate TSI
          const tsiValues: number[] = [];
          const offset = longPeriod + shortPeriod - 2;
          for (let i = offset; i < ema2.length; i++) {
            const num = ema2[i] ?? 0;
            const den = absEma2[i] ?? 1;
            tsiValues.push(den !== 0 ? (num / den) * 100 : 0);
          }

          // Signal line
          const signalLine = calcEma(tsiValues, signalPeriod);

          if (tsiValues.length === 0) return null;
          const currentTsi = tsiValues[tsiValues.length - 1] ?? 0;
          const currentSignal = signalLine[signalLine.length - 1] ?? 0;

          return {
            values: tsiValues,
            currentValue: currentTsi,
            signal: currentTsi > currentSignal && currentTsi > 0 ? 'bullish' :
                   currentTsi < currentSignal && currentTsi < 0 ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentTsi)),
            secondaryValues: signalLine,
            secondaryLabel: 'Signal',
            referenceLines: [
              { value: 25, label: 'Overbought', color: '#EF4444' },
              { value: -25, label: 'Oversold', color: '#22C55E' },
              { value: 0, label: 'Zero', color: '#6B7280' },
            ],
            metadata: { tsi: currentTsi, signal: currentSignal }
          };
        }

        // Know Sure Thing (KST) - Long-term momentum
        if (upperName === 'KST') {
          const roc1 = 10, roc2 = 15, roc3 = 20, roc4 = 30;
          const sma1 = 10, sma2 = 10, sma3 = 10, sma4 = 15;
          const signalPeriod = 9;
          if (data.length < roc4 + sma4 + signalPeriod) return null;

          const closes = data.map((d: { close: number }) => d.close ?? 0);

          // Calculate ROC for each period
          const calcRoc = (period: number): number[] => {
            const roc: number[] = [];
            for (let i = period; i < closes.length; i++) {
              const curr = closes[i] ?? 0;
              const prev = closes[i - period] ?? 0;
              roc.push(prev !== 0 ? ((curr - prev) / prev) * 100 : 0);
            }
            return roc;
          };

          // Calculate SMA
          const calcSma = (values: number[], period: number): number[] => {
            const sma: number[] = [];
            for (let i = period - 1; i < values.length; i++) {
              sma.push(values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
            }
            return sma;
          };

          const roc1Vals = calcRoc(roc1);
          const roc2Vals = calcRoc(roc2);
          const roc3Vals = calcRoc(roc3);
          const roc4Vals = calcRoc(roc4);

          const sma1Vals = calcSma(roc1Vals, sma1);
          const sma2Vals = calcSma(roc2Vals, sma2);
          const sma3Vals = calcSma(roc3Vals, sma3);
          const sma4Vals = calcSma(roc4Vals, sma4);

          // Align arrays and calculate KST
          const minLen = Math.min(sma1Vals.length, sma2Vals.length, sma3Vals.length, sma4Vals.length);
          const kstValues: number[] = [];
          for (let i = 0; i < minLen; i++) {
            const offset1 = sma1Vals.length - minLen;
            const offset2 = sma2Vals.length - minLen;
            const offset3 = sma3Vals.length - minLen;
            const offset4 = sma4Vals.length - minLen;
            const kst = (sma1Vals[i + offset1] ?? 0) * 1 +
                       (sma2Vals[i + offset2] ?? 0) * 2 +
                       (sma3Vals[i + offset3] ?? 0) * 3 +
                       (sma4Vals[i + offset4] ?? 0) * 4;
            kstValues.push(kst);
          }

          // Signal line
          const signalLine = calcSma(kstValues, signalPeriod);

          if (kstValues.length === 0) return null;
          const currentKst = kstValues[kstValues.length - 1] ?? 0;
          const currentSignal = signalLine[signalLine.length - 1] ?? 0;

          return {
            values: kstValues,
            currentValue: currentKst,
            signal: currentKst > currentSignal && currentKst > 0 ? 'bullish' :
                   currentKst < currentSignal && currentKst < 0 ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentKst - currentSignal) * 5),
            secondaryValues: signalLine,
            secondaryLabel: 'Signal',
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: { kst: currentKst, signal: currentSignal, crossover: currentKst > currentSignal }
          };
        }

        // Anchored VWAP - VWAP from significant point
        if (upperName === 'AVWAP' || upperName === 'ANCHORED_VWAP') {
          if (data.length < 20) return null;

          // Find swing low/high as anchor point (last 50 candles)
          const lookback = Math.min(50, data.length);
          const recentData = data.slice(-lookback);

          // Find lowest low as anchor
          let anchorIdx = 0;
          let lowestLow = Infinity;
          for (let i = 0; i < recentData.length; i++) {
            const d = recentData[i] as { low?: number };
            const low = d?.low ?? Infinity;
            if (low < lowestLow) {
              lowestLow = low;
              anchorIdx = i;
            }
          }

          // Guard against no valid anchor found
          if (!isFinite(lowestLow)) return null;

          // Calculate VWAP from anchor
          const avwapValues: number[] = [];
          let cumVolume = 0, cumVwap = 0;

          for (let i = anchorIdx; i < recentData.length; i++) {
            const d = recentData[i] as { high?: number; low?: number; close?: number; volume?: number };
            const high = d?.high ?? 0;
            const low = d?.low ?? 0;
            const close = d?.close ?? 0;
            const volume = d?.volume ?? 0;
            const typicalPrice = (high + low + close) / 3;
            cumVolume += volume;
            cumVwap += typicalPrice * volume;
            avwapValues.push(cumVolume > 0 ? cumVwap / cumVolume : typicalPrice);
          }

          if (avwapValues.length === 0) return null;
          const currentAvwap = avwapValues[avwapValues.length - 1] ?? 0;
          const currentPrice = recentData[recentData.length - 1]?.close ?? currentAvwap;

          return {
            values: avwapValues,
            currentValue: currentAvwap,
            signal: currentPrice > currentAvwap * 1.01 ? 'bullish' :
                   currentPrice < currentAvwap * 0.99 ? 'bearish' : 'neutral',
            signalStrength: currentAvwap !== 0 ? Math.min(100, Math.abs((currentPrice - currentAvwap) / currentAvwap) * 500) : 0,
            referenceLines: [{ value: currentAvwap, label: 'AVWAP', color: '#8B5CF6' }],
            metadata: { anchorPrice: lowestLow, daysFromAnchor: recentData.length - anchorIdx }
          };
        }

        // Price Oscillator
        if (upperName === 'PO' || upperName === 'PRICE_OSCILLATOR') {
          const fast = 12, slow = 26;
          if (data.length < slow) return null;

          const closes = data.map((d: { close: number }) => d.close ?? 0);

          const calcEma = (values: number[], period: number) => {
            const mult = 2 / (period + 1);
            const ema: number[] = [values[0] ?? 0];
            for (let i = 1; i < values.length; i++) {
              ema.push((values[i] - (ema[i - 1] ?? 0)) * mult + (ema[i - 1] ?? 0));
            }
            return ema;
          };

          const fastEma = calcEma(closes, fast);
          const slowEma = calcEma(closes, slow);

          const poValues: number[] = [];
          for (let i = slow - 1; i < closes.length; i++) {
            const sEma = slowEma[i] ?? 1;
            poValues.push(sEma !== 0 ? ((fastEma[i] ?? 0) - sEma) / sEma * 100 : 0);
          }

          if (poValues.length === 0) return null;
          const currentPo = poValues[poValues.length - 1] ?? 0;

          return {
            values: poValues,
            currentValue: currentPo,
            signal: currentPo > 0 ? 'bullish' : currentPo < 0 ? 'bearish' : 'neutral',
            signalStrength: Math.min(100, Math.abs(currentPo) * 10),
            referenceLines: [{ value: 0, label: 'Zero', color: '#6B7280' }],
            metadata: {}
          };
        }

        return null;
      };

      // Generate interpretation text
      const getInterpretation = (name: string, signal: string, currentValue: number) => {
        const signalText = signal === 'bullish' ? 'bullish momentum' : signal === 'bearish' ? 'bearish pressure' : 'neutral conditions';

        if (name.includes('RSI')) {
          if (currentValue > 70) return `RSI at ${currentValue.toFixed(1)} indicates overbought conditions. Consider taking profits or waiting for pullback.`;
          if (currentValue < 30) return `RSI at ${currentValue.toFixed(1)} shows oversold conditions. Potential buying opportunity on confirmation.`;
          return `RSI at ${currentValue.toFixed(1)} in neutral zone. Monitor for breakout from range.`;
        }
        if (name.includes('MACD')) return `MACD histogram shows ${signalText}. ${signal === 'bullish' ? 'Momentum building higher' : signal === 'bearish' ? 'Momentum weakening' : 'Momentum flat'}.`;
        if (name.includes('BOLLINGER')) return `Price ${signal === 'bullish' ? 'near lower band - potential support' : signal === 'bearish' ? 'near upper band - potential resistance' : 'within bands - range-bound'}.`;
        if (name.includes('STOCHASTIC')) return `Stochastic ${signal === 'bullish' ? 'showing oversold crossover' : signal === 'bearish' ? 'showing overbought crossover' : 'in middle range'}.`;
        if (name.includes('ATR')) return `Volatility is ${currentValue > 0 ? 'elevated' : 'normal'}. Adjust position sizing accordingly.`;
        if (name.includes('OBV')) return `Volume trend shows ${signal === 'bullish' ? 'accumulation' : 'distribution'}. ${signal === 'bullish' ? 'Smart money buying' : 'Smart money selling'}.`;
        if (name.includes('ADX')) return `Trend strength at ${currentValue.toFixed(1)}. ${currentValue > 50 ? 'Very strong trend' : currentValue > 25 ? 'Trending market' : 'Weak/No trend'}.`;
        // New indicator interpretations
        if (name.includes('VWAP')) return `Price ${signal === 'bullish' ? 'above VWAP - institutional buying' : 'below VWAP - institutional selling'}. Key intraday level.`;
        if (name.includes('KELTNER')) return `Keltner Channel ${signal === 'bullish' ? 'breakout below - oversold' : signal === 'bearish' ? 'breakout above - overbought' : 'within channel - normal range'}.`;
        if (name.includes('DONCHIAN')) return `Donchian Channel ${signal === 'bullish' ? 'upper breakout - new highs' : signal === 'bearish' ? 'lower breakout - new lows' : 'within range'}.`;
        if (name.includes('ICHIMOKU')) return `Ichimoku Cloud shows ${signal === 'bullish' ? 'price above cloud with bullish TK cross' : signal === 'bearish' ? 'price below cloud with bearish TK cross' : 'price in cloud - consolidation'}.`;
        if (name.includes('PIVOT')) return `Price ${signal === 'bullish' ? 'broke above R1 resistance' : signal === 'bearish' ? 'broke below S1 support' : 'between S1 and R1 - consolidation'}.`;
        if (name.includes('FORCE')) return `Force Index shows ${signal === 'bullish' ? 'buying pressure with volume' : 'selling pressure with volume'}. ${Math.abs(currentValue) > 1000000 ? 'Strong move' : 'Moderate activity'}.`;
        if (name.includes('EMV')) return `Ease of Movement ${signal === 'bullish' ? 'positive - price rising on low volume' : 'negative - price falling on volume'}. Measures price/volume efficiency.`;
        if (name.includes('ELDER')) return `Elder Ray ${signal === 'bullish' ? 'bull power rising - bulls gaining strength' : signal === 'bearish' ? 'bear power falling - bears dominant' : 'balanced forces'}.`;
        if (name.includes('UO')) return `Ultimate Oscillator at ${currentValue.toFixed(1)}. ${currentValue < 30 ? 'Oversold - potential reversal' : currentValue > 70 ? 'Overbought - caution' : 'Neutral momentum'}.`;
        if (name.includes('CMO')) return `Chande Momentum at ${currentValue.toFixed(1)}. ${Math.abs(currentValue) > 50 ? 'Strong momentum' : 'Weak momentum'} in ${signal} direction.`;
        if (name.includes('DPO')) return `Detrended Price Oscillator shows ${signal === 'bullish' ? 'price above trend' : 'price below trend'}. Identifies cycles.`;
        if (name.includes('AROON')) return `Aroon Oscillator at ${currentValue.toFixed(1)}. ${signal === 'bullish' ? 'Uptrend strengthening' : signal === 'bearish' ? 'Downtrend strengthening' : 'No clear trend'}.`;
        if (name.includes('PSAR')) return `Parabolic SAR ${signal === 'bullish' ? 'below price - uptrend intact' : 'above price - downtrend or reversal'}. Trailing stop level.`;
        if (name.includes('HMA')) return `Hull MA shows ${signal === 'bullish' ? 'upward momentum' : 'downward momentum'}. Fast-responding trend indicator.`;
        if (name.includes('DEMA')) return `Double EMA shows ${signal === 'bullish' ? 'bullish trend' : 'bearish trend'}. Reduced lag vs standard EMA.`;
        if (name.includes('TEMA')) return `Triple EMA shows ${signal === 'bullish' ? 'strong bullish momentum' : 'strong bearish momentum'}. Minimal lag indicator.`;
        if (name.includes('TRIX')) return `TRIX at ${currentValue.toFixed(2)}. ${signal === 'bullish' ? 'Positive momentum building' : 'Negative momentum building'}. Triple-smoothed momentum.`;
        if (name.includes('PPO')) return `PPO histogram ${signal === 'bullish' ? 'positive - bullish momentum' : 'negative - bearish momentum'}. Similar to MACD in percentage terms.`;
        if (name.includes('COPPOCK')) return `Coppock Curve ${signal === 'bullish' ? 'turning up from bottom - buy signal' : signal === 'bearish' ? 'turning down from top - caution' : 'flat - no clear signal'}. Long-term momentum.`;
        // Additional recommended indicator interpretations
        if (name.includes('CHOP')) return `Choppiness Index at ${currentValue.toFixed(1)}. ${currentValue > 61.8 ? 'Market is ranging/consolidating' : currentValue < 38.2 ? 'Market is trending - follow trend' : 'Market transitional - wait for clarity'}.`;
        if (name.includes('LRS') || name.includes('LINEAR_REGRESSION')) return `Linear Regression Slope ${signal === 'bullish' ? 'positive - uptrend' : signal === 'bearish' ? 'negative - downtrend' : 'flat - no clear direction'}. Trend angle indicator.`;
        if (name === 'RVI') return `Relative Vigor Index ${signal === 'bullish' ? 'positive with bullish crossover' : signal === 'bearish' ? 'negative with bearish crossover' : 'neutral - no clear signal'}. Measures conviction of moves.`;
        if (name.includes('CHAIKIN') && !name.includes('VOLATILITY')) return `Chaikin Oscillator ${signal === 'bullish' ? 'rising and positive - accumulation' : signal === 'bearish' ? 'falling and negative - distribution' : 'flat - wait for direction'}. Volume momentum.`;
        if (name === 'AD' || name === 'ADL') return `A/D Line ${signal === 'bullish' ? 'rising - accumulation phase' : 'falling - distribution phase'}. Confirms volume participation.`;
        if (name.includes('STDDEV') || name === 'STD') return `Standard Deviation ${currentValue > 0 ? 'indicates' : 'shows'} ${signal === 'bearish' ? 'high volatility - increase caution' : signal === 'bullish' ? 'low volatility - potential breakout setup' : 'normal volatility'}.`;
        if (name === 'CV' || name.includes('CHAIKIN_VOLATILITY')) return `Chaikin Volatility ${currentValue > 0 ? 'expanding - high volatility' : 'contracting - low volatility'}. ${Math.abs(currentValue) > 25 ? 'Significant change detected' : 'Normal range'}.`;
        // Institutional-grade indicator interpretations
        if (name.includes('VOLUME_PROFILE') || name === 'VP') return `Volume Profile shows POC at ${currentValue.toFixed(2)}. ${signal === 'bullish' ? 'Price above Value Area High - bullish breakout' : signal === 'bearish' ? 'Price below Value Area Low - bearish breakdown' : 'Price within Value Area - fair value zone'}. Institutional support/resistance.`;
        if (name.includes('KVO') || name.includes('KLINGER')) return `Klinger Volume Oscillator ${signal === 'bullish' ? 'positive with bullish crossover - institutional accumulation' : signal === 'bearish' ? 'negative with bearish crossover - institutional distribution' : 'neutral - no clear institutional bias'}. Smart money flow indicator.`;
        if (name.includes('MASS')) return `Mass Index at ${currentValue.toFixed(1)}. ${currentValue > 27 ? 'Reversal bulge forming - potential trend reversal ahead' : 'Normal range - trend continuation likely'}. Reversal detection indicator.`;
        if (name === 'TSI') return `True Strength Index at ${currentValue.toFixed(1)}. ${signal === 'bullish' ? 'Positive momentum with bullish crossover' : signal === 'bearish' ? 'Negative momentum with bearish crossover' : 'Neutral momentum'}. Double-smoothed momentum for cleaner signals.`;
        if (name === 'KST') return `Know Sure Thing at ${currentValue.toFixed(1)}. ${signal === 'bullish' ? 'Long-term momentum turning bullish' : signal === 'bearish' ? 'Long-term momentum turning bearish' : 'Long-term momentum neutral'}. Multi-timeframe momentum composite.`;
        if (name.includes('AVWAP') || name.includes('ANCHORED')) return `Anchored VWAP at ${currentValue.toFixed(2)}. ${signal === 'bullish' ? 'Price above AVWAP - institutional buyers in control' : signal === 'bearish' ? 'Price below AVWAP - institutional sellers dominant' : 'Price at AVWAP - equilibrium level'}. Key institutional reference level.`;
        if (name.includes('PRICE_OSCILLATOR') || name === 'PO') return `Price Oscillator at ${currentValue.toFixed(2)}%. ${signal === 'bullish' ? 'Positive - short-term momentum above long-term' : signal === 'bearish' ? 'Negative - short-term momentum below long-term' : 'Near zero - momentum consolidating'}.`;

        return `${name} indicates ${signalText} at current levels.`;
      };

      // Calculate all indicators for each step
      const timestamps = ohlcv.map((d: { timestamp: number }) => d.timestamp);

      for (const [step, indicators] of Object.entries(stepIndicators)) {
        chartData[Number(step)] = [];

        for (const ind of indicators) {
          const result = calculateIndicator(ind.name, ohlcv);
          if (result && result.values && result.values.length > 0) {
            // Align timestamps with values (values may start later due to lookback period)
            const offset = timestamps.length - result.values.length;
            const alignedTimestamps = timestamps.slice(offset);

            const stepData = chartData[Number(step)];
            if (stepData) {
              stepData.push({
              name: ind.name.replace('_', ' '),
              category: ind.category as 'trend' | 'momentum' | 'volatility' | 'volume' | 'advanced',
              values: result.values,
              timestamps: alignedTimestamps,
              currentValue: result.currentValue,
              signal: result.signal as 'bullish' | 'bearish' | 'neutral',
              signalStrength: result.signalStrength,
              interpretation: getInterpretation(ind.name, result.signal, result.currentValue),
              chartColor: ind.color,
              secondaryValues: result.secondaryValues,
              secondaryLabel: result.secondaryLabel,
              referenceLines: result.referenceLines,
              metadata: result.metadata,
              });
            }
          }
        }
      }

      return reply.send({
        success: true,
        data: {
          symbol,
          timeframe,
          tradeType,
          candleCount: ohlcv.length,
          chartData,
        }
      });
    } catch (error) {
      logger.error({ error }, 'Indicator charts error');
      return reply.status(500).send({
        success: false,
        error: { code: 'CHART_ERROR', message: 'Failed to generate indicator charts' }
      });
    }
  });

  // ===========================================
  // ANALYSIS MARKETPLACE
  // ===========================================

  /**
   * GET /api/analysis/available
   * Check if there's a recent analysis available for purchase
   * This checks ALL analyses (not just the user's own) that are still valid
   */
  app.get('/available', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { symbol: string; interval?: string; tradeType?: string } }>, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const { symbol, interval, tradeType } = request.query;

      if (!symbol) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_SYMBOL', message: 'Symbol is required' },
        });
      }

      // Determine intervals to check based on trade type
      let intervalsToCheck: string[] = [];
      if (tradeType === 'scalping') {
        intervalsToCheck = ['5m', '15m'];
      } else if (tradeType === 'dayTrade') {
        intervalsToCheck = ['1h', '4h'];
      } else if (tradeType === 'swing') {
        intervalsToCheck = ['1d', '1D'];
      } else if (interval) {
        intervalsToCheck = [interval];
      } else {
        intervalsToCheck = ['4h']; // Default
      }

      // Calculate validity period based on trade type (1 candle duration)
      let validityHours = 4; // Default (day trade)
      if (tradeType === 'scalping') {
        validityHours = 0.25; // 15 minutes
      } else if (tradeType === 'swing') {
        validityHours = 24; // 1 day
      }

      const validSince = new Date(Date.now() - validityHours * 60 * 60 * 1000);

      // Find recent analysis (from any user) for this symbol and interval
      const recentAnalysis = await prisma.analysis.findFirst({
        where: {
          symbol: { equals: symbol.toUpperCase(), mode: 'insensitive' },
          interval: { in: intervalsToCheck },
          createdAt: { gte: validSince },
          expiresAt: { gt: new Date() },
          // Must have completed the analysis (has step 7 result)
          step7Result: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          symbol: true,
          interval: true,
          totalScore: true,
          step5Result: true,
          step7Result: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      if (!recentAnalysis) {
        return reply.send({
          success: true,
          data: { available: false },
        });
      }

      // Check if user already owns this analysis
      const isOwner = recentAnalysis.userId === userId;

      // Check if user has already purchased this analysis
      const existingPurchase = await prisma.creditTransaction.findFirst({
        where: {
          userId,
          source: 'analysis_purchase',
          metadata: {
            path: ['analysisId'],
            equals: recentAnalysis.id,
          },
        },
      });

      const hasPurchased = !!existingPurchase;

      // Extract data from analysis
      const verdictData = recentAnalysis.step7Result as Record<string, unknown> | null;
      const tradePlan = recentAnalysis.step5Result as Record<string, unknown> | null;

      const generatedAt = recentAnalysis.createdAt;
      const now = new Date();
      const hoursAgo = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60);
      const remainingHours = validityHours - hoursAgo;

      return reply.send({
        success: true,
        data: {
          available: true,
          isOwner,
          hasPurchased,
          canAccess: isOwner || hasPurchased,
          analysis: {
            id: recentAnalysis.id,
            symbol: recentAnalysis.symbol,
            interval: recentAnalysis.interval,
            totalScore: recentAnalysis.totalScore,
            direction: tradePlan?.direction || null,
            verdict: verdictData?.verdict || null,
            createdAt: recentAnalysis.createdAt,
            expiresAt: recentAnalysis.expiresAt,
            hoursAgo: Math.round(hoursAgo * 100) / 100,
            remainingHours: Math.max(0, Math.round(remainingHours * 100) / 100),
            validityHours,
          },
          pricing: await (async () => {
            const newAnalysisCost = await creditCostsService.getCreditCost('BUNDLE_FULL_ANALYSIS');
            const purchaseCost = await creditCostsService.getCreditCost('ANALYSIS_PURCHASE');
            return {
              newAnalysisCost,
              purchaseCost,
              savings: newAnalysisCost - purchaseCost,
            };
          })(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Check available analysis error');
      return reply.status(500).send({
        success: false,
        error: { code: 'CHECK_ERROR', message: 'Failed to check available analysis' },
      });
    }
  });

  /**
   * POST /api/analysis/:id/purchase
   * Purchase access to an existing analysis (15 credits)
   * Includes: view, PDF download, email
   */
  app.post('/:id/purchase', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const { id: analysisId } = request.params;

      // Find the analysis
      const analysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
        select: {
          id: true,
          userId: true,
          symbol: true,
          interval: true,
          expiresAt: true,
          step7Result: true,
        },
      });

      if (!analysis) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Analysis not found' },
        });
      }

      // Check if analysis is still valid
      if (analysis.expiresAt < new Date()) {
        return reply.status(400).send({
          success: false,
          error: { code: 'EXPIRED', message: 'Analysis has expired' },
        });
      }

      // Check if user already owns this analysis
      if (analysis.userId === userId) {
        return reply.send({
          success: true,
          data: {
            purchased: false,
            message: 'You already own this analysis',
            isOwner: true,
            analysisId: analysis.id,
          },
        });
      }

      // Check if user has already purchased this analysis
      const existingPurchase = await prisma.creditTransaction.findFirst({
        where: {
          userId,
          source: 'analysis_purchase',
          metadata: {
            path: ['analysisId'],
            equals: analysisId,
          },
        },
      });

      if (existingPurchase) {
        return reply.send({
          success: true,
          data: {
            purchased: false,
            message: 'You have already purchased this analysis',
            alreadyPurchased: true,
            analysisId: analysis.id,
          },
        });
      }

      // Get purchase cost from admin settings
      const PURCHASE_COST = await creditCostsService.getCreditCost('ANALYSIS_PURCHASE');

      const chargeResult = await creditService.charge(userId, PURCHASE_COST, 'analysis_purchase', {
        analysisId,
        symbol: analysis.symbol,
        interval: analysis.interval,
        originalOwnerId: analysis.userId,
      });

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `You need ${PURCHASE_COST} credits to purchase this analysis`,
            required: PURCHASE_COST,
            available: chargeResult.newBalance,
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          purchased: true,
          analysisId: analysis.id,
          creditsSpent: PURCHASE_COST,
          newBalance: chargeResult.newBalance,
          message: 'Analysis purchased successfully',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Purchase analysis error');
      return reply.status(500).send({
        success: false,
        error: { code: 'PURCHASE_ERROR', message: 'Failed to purchase analysis' },
      });
    }
  });

  /**
   * GET /api/analysis/top-coins
   * Get top coins by reliability/analysis score
   * Query params:
   *   - limit: number (1-20, default 5)
   *   - sortBy: 'reliabilityScore' | 'totalScore' (default 'reliabilityScore')
   *   - tradeableOnly: boolean (default false) - only GO/CONDITIONAL_GO verdicts
   */
  app.get('/top-coins', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as {
        limit?: string;
        sortBy?: string;
        tradeableOnly?: string;
      };

      const limit = safeParseInt(query.limit, 5, 1, 20);
      const sortBy = (query.sortBy === 'totalScore' ? 'totalScore' : 'reliabilityScore') as 'reliabilityScore' | 'totalScore';
      const tradeableOnly = query.tradeableOnly === 'true';

      let coins: CoinScore[];

      if (tradeableOnly) {
        coins = await coinScoreCacheService.getTopTradeableCoins(limit);
      } else {
        coins = await coinScoreCacheService.getTopCoinsByScore(limit, sortBy);
      }

      // Check if cache is stale
      const cacheStats = await coinScoreCacheService.getCacheStats();

      return reply.send({
        success: true,
        data: {
          coins,
          cacheInfo: {
            lastScanAt: cacheStats.lastScanAt,
            totalCoinsInCache: cacheStats.totalCoins,
            freshCoins: cacheStats.freshCoins,
            isStale: cacheStats.staleCoins > cacheStats.freshCoins,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get top coins error');
      return reply.status(500).send({
        success: false,
        error: { code: 'TOP_COINS_ERROR', message: 'Failed to get top coins' },
      });
    }
  });

  /**
   * POST /api/analysis/top-coins/refresh
   * Manually trigger a coin score cache refresh (admin only)
   */
  app.post('/top-coins/refresh', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = getUser(request);

      // Admin only
      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
      }

      // Trigger scan in background
      coinScoreCacheService.scanAllCoins('4h').then((result) => {
        logger.info({ success: result.success, failed: result.failed }, '[TopCoins] Manual refresh complete');
      }).catch((error) => {
        logger.error({ error }, '[TopCoins] Manual refresh failed');
      });

      return reply.send({
        success: true,
        data: {
          message: 'Coin score cache refresh started. Results will be available shortly.',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Refresh top coins error');
      return reply.status(500).send({
        success: false,
        error: { code: 'REFRESH_ERROR', message: 'Failed to start refresh' },
      });
    }
  });

  /**
   * POST /api/analysis/top-coins/scan
   * Start a paid scan of top 30 coins (300 credits)
   * Returns scan status and estimated completion time
   */
  app.post('/top-coins/scan', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const SCAN_COST = 300;
    const COINS_TO_SCAN = 30;
    const SECONDS_PER_COIN = 5;

    try {
      const user = getUser(request);
      const userId = user.id;

      // Check credit balance
      const balanceResult = await creditService.getBalance(userId);
      if (balanceResult.balance < SCAN_COST) {
        return reply.status(402).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `Insufficient credits. Scan requires ${SCAN_COST} credits, you have ${balanceResult.balance}`,
          },
          creditsRequired: SCAN_COST,
          creditsAvailable: balanceResult.balance,
        });
      }

      // Charge credits
      const chargeResult = await creditService.charge(userId, SCAN_COST, 'top_coins_scan', {
        description: 'Top 30 coins analysis scan',
      });

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: { code: 'CHARGE_FAILED', message: 'Failed to charge credits' },
        });
      }

      // Start scan in background (don't await)
      coinScoreCacheService.scanAllCoins('4h').then((result) => {
        logger.info({ userId, success: result.success, failed: result.failed }, '[TopCoins] Paid scan complete');
      }).catch((error) => {
        logger.error({ userId, error }, '[TopCoins] Paid scan failed');
      });

      const estimatedMinutes = Math.ceil((COINS_TO_SCAN * SECONDS_PER_COIN) / 60);

      return reply.send({
        success: true,
        data: {
          message: `Scan started. Analyzing ${COINS_TO_SCAN} coins...`,
          estimatedMinutes,
          coinsToScan: COINS_TO_SCAN,
          creditsCharged: SCAN_COST,
          creditsRemaining: chargeResult.newBalance,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Paid scan error');
      return reply.status(500).send({
        success: false,
        error: { code: 'SCAN_ERROR', message: 'Failed to start scan' },
      });
    }
  });

  /**
   * GET /api/analysis/top-coins/status
   * Check the status of the coin score cache
   */
  app.get('/top-coins/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await coinScoreCacheService.getCacheStats();
      const isStale = await coinScoreCacheService.isCacheStale();
      const scanSession = coinScoreCacheService.getScanSession();

      return reply.send({
        success: true,
        data: {
          ...stats,
          isStale,
          // Use actual scan session state instead of rough estimate
          isScanning: scanSession.isScanning,
          scanProgress: {
            coinsAnalyzed: scanSession.coinsAnalyzed,
            totalCoins: scanSession.totalCoins,
            lastAnalyzedCoin: scanSession.lastAnalyzedCoin,
            startedAt: scanSession.startedAt,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Cache status error');
      return reply.status(500).send({
        success: false,
        error: { code: 'STATUS_ERROR', message: 'Failed to get cache status' },
      });
    }
  });

  // ===========================================
  // Multi-Asset Scan Endpoints (Stocks, Bonds, Metals)
  // ===========================================

  /**
   * GET /api/analysis/multi-asset/:market
   * Get top assets for a market (stocks, bonds, metals)
   */
  app.get('/multi-asset/:market', async (request: FastifyRequest<{
    Params: { market: string };
    Querystring: { limit?: string; sortBy?: string; tradeableOnly?: string };
  }>, reply: FastifyReply) => {
    const { multiAssetScoreCacheService } = await import('./services/multi-asset-score-cache.service');

    const { market } = request.params;
    const { limit, sortBy = 'reliabilityScore', tradeableOnly = 'false' } = request.query;

    const validMarkets = ['stocks', 'bonds', 'metals'];
    if (!validMarkets.includes(market)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_MARKET', message: `Market must be one of: ${validMarkets.join(', ')}` },
      });
    }

    try {
      const limitNum = safeParseInt(limit, 5, 1, 30);
      const marketType = market as 'stocks' | 'bonds' | 'metals';

      let assets;
      if (tradeableOnly === 'true') {
        assets = await multiAssetScoreCacheService.getTopTradeableAssets(marketType, limitNum);
      } else {
        assets = await multiAssetScoreCacheService.getTopAssetsByScore(marketType, limitNum);
      }

      const cacheStats = await multiAssetScoreCacheService.getCacheStats(marketType);

      return reply.send({
        success: true,
        data: {
          market,
          assets,
          cacheInfo: {
            ...cacheStats,
            sortBy,
          },
        },
      });
    } catch (error) {
      logger.error({ market, error }, 'Multi-asset fetch error');
      return reply.status(500).send({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to get assets' },
      });
    }
  });

  /**
   * POST /api/analysis/multi-asset/:market/scan
   * Start a paid scan of a market (stocks, bonds, metals)
   * Cost: 300 credits
   */
  app.post('/multi-asset/:market/scan', { preHandler: [authenticate] }, async (request: FastifyRequest<{
    Params: { market: string };
  }>, reply: FastifyReply) => {
    const { multiAssetScoreCacheService, STOCKS_TO_SCAN, BONDS_TO_SCAN, METALS_TO_SCAN } = await import('./services/multi-asset-score-cache.service');

    const SCAN_COST = 300;
    const SECONDS_PER_ASSET = 3;
    const { market } = request.params;

    const validMarkets = ['stocks', 'bonds', 'metals'];
    if (!validMarkets.includes(market)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_MARKET', message: `Market must be one of: ${validMarkets.join(', ')}` },
      });
    }

    const marketType = market as 'stocks' | 'bonds' | 'metals';
    const assetLists = { stocks: STOCKS_TO_SCAN, bonds: BONDS_TO_SCAN, metals: METALS_TO_SCAN };
    const assetsToScan = assetLists[marketType].length;

    try {
      const user = getUser(request);
      const userId = user.id;

      // Check credit balance
      const balanceResult = await creditService.getBalance(userId);
      if (balanceResult.balance < SCAN_COST) {
        return reply.status(402).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `Insufficient credits. Scan requires ${SCAN_COST} credits, you have ${balanceResult.balance}`,
          },
          creditsRequired: SCAN_COST,
          creditsAvailable: balanceResult.balance,
        });
      }

      // Charge credits
      const chargeResult = await creditService.charge(userId, SCAN_COST, `${market}_scan`, {
        description: `Top ${assetsToScan} ${market} analysis scan`,
      });

      if (!chargeResult.success) {
        return reply.status(402).send({
          success: false,
          error: { code: 'CHARGE_FAILED', message: 'Failed to charge credits' },
        });
      }

      // Start scan in background (don't await)
      multiAssetScoreCacheService.scanMarket(marketType).then((result) => {
        logger.info({ market, userId, success: result.success, failed: result.failed }, '[MultiAsset] Paid scan complete');
      }).catch((error) => {
        logger.error({ market, userId, error }, '[MultiAsset] Paid scan failed');
      });

      const estimatedMinutes = Math.ceil((assetsToScan * SECONDS_PER_ASSET) / 60);

      return reply.send({
        success: true,
        data: {
          message: `Scan started. Analyzing ${assetsToScan} ${market}...`,
          market,
          estimatedMinutes,
          assetsToScan,
          creditsCharged: SCAN_COST,
          creditsRemaining: chargeResult.newBalance,
        },
      });
    } catch (error) {
      logger.error({ market, error }, 'Multi-asset scan error');
      return reply.status(500).send({
        success: false,
        error: { code: 'SCAN_ERROR', message: 'Failed to start scan' },
      });
    }
  });

  /**
   * GET /api/analysis/multi-asset/:market/status
   * Check the status of a market scan
   */
  app.get('/multi-asset/:market/status', async (request: FastifyRequest<{
    Params: { market: string };
  }>, reply: FastifyReply) => {
    const { multiAssetScoreCacheService } = await import('./services/multi-asset-score-cache.service');

    const { market } = request.params;
    const validMarkets = ['stocks', 'bonds', 'metals'];
    if (!validMarkets.includes(market)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_MARKET', message: `Market must be one of: ${validMarkets.join(', ')}` },
      });
    }

    const marketType = market as 'stocks' | 'bonds' | 'metals';

    try {
      const stats = await multiAssetScoreCacheService.getCacheStats(marketType);
      const isStale = await multiAssetScoreCacheService.isCacheStale(marketType);
      const scanSession = multiAssetScoreCacheService.getScanSession(marketType);

      return reply.send({
        success: true,
        data: {
          market,
          ...stats,
          isStale,
          isScanning: scanSession.isScanning,
          scanProgress: {
            assetsAnalyzed: scanSession.assetsAnalyzed,
            totalAssets: scanSession.totalAssets,
            lastAnalyzedAsset: scanSession.lastAnalyzedAsset,
            startedAt: scanSession.startedAt,
          },
        },
      });
    } catch (error) {
      logger.error({ market, error }, 'Multi-asset status error');
      return reply.status(500).send({
        success: false,
        error: { code: 'STATUS_ERROR', message: 'Failed to get cache status' },
      });
    }
  });

  /**
   * GET /api/analysis/multi-asset/:market/all
   * Get all cached assets for a market
   */
  app.get('/multi-asset/:market/all', async (request: FastifyRequest<{
    Params: { market: string };
  }>, reply: FastifyReply) => {
    const { multiAssetScoreCacheService } = await import('./services/multi-asset-score-cache.service');

    const { market } = request.params;
    const validMarkets = ['stocks', 'bonds', 'metals'];
    if (!validMarkets.includes(market)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_MARKET', message: `Market must be one of: ${validMarkets.join(', ')}` },
      });
    }

    const marketType = market as 'stocks' | 'bonds' | 'metals';

    try {
      const assets = await multiAssetScoreCacheService.getAllCachedAssets(marketType);
      const stats = await multiAssetScoreCacheService.getCacheStats(marketType);

      return reply.send({
        success: true,
        data: {
          market,
          assets,
          cacheInfo: stats,
        },
      });
    } catch (error) {
      logger.error({ market, error }, 'Multi-asset all fetch error');
      return reply.status(500).send({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to get all assets' },
      });
    }
  });

  /**
   * GET /api/analysis/performance-history
   * Returns daily realized P/L for chart visualization
   * - Weekly/Monthly view: Uses outcomeAt date for realized P/L
   * - Daily view: Realized P/L + unrealized P/L for active trades
   */
  app.get('/performance-history', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const query = request.query as { days?: string };
    const days = safeParseInt(query.days, 30, 7, 90);

    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      // Get all analyses with outcomes for this user in the date range
      const analyses = await prisma.analysis.findMany({
        where: {
          userId,
          OR: [
            // Closed trades (has outcome)
            {
              outcome: { in: ['tp1_hit', 'tp2_hit', 'tp3_hit', 'sl_hit'] },
              outcomeAt: { gte: startDate }
            },
            // Active trades (no outcome, not expired)
            {
              outcome: null,
              expiresAt: { gt: now },
              createdAt: { gte: startDate }
            }
          ]
        },
        select: {
          id: true,
          symbol: true,
          outcome: true,
          outcomeAt: true,
          outcomePrice: true,
          createdAt: true,
          expiresAt: true,
          step5Result: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate P/L for each trade
      const tradesWithPnL = analyses.map(analysis => {
        const step5 = analysis.step5Result as Record<string, unknown> | null;
        const direction = ((step5?.direction as string) || 'long').toLowerCase();
        const entryPrice = Number(step5?.averageEntry || step5?.entryPrice || 0);
        const stopLoss = Number((step5?.stopLoss as Record<string, unknown>)?.price || step5?.stopLossPrice || 0);
        const tp1 = Number((step5?.takeProfits as Array<Record<string, unknown>>)?.[0]?.price || step5?.takeProfit1 || 0);
        const tp2 = Number((step5?.takeProfits as Array<Record<string, unknown>>)?.[1]?.price || step5?.takeProfit2 || 0);
        const tp3 = Number((step5?.takeProfits as Array<Record<string, unknown>>)?.[2]?.price || step5?.takeProfit3 || 0);

        let pnlPercent = 0;
        let isRealized = false;
        let outcomeDate: Date | null = null;

        if (analysis.outcome && analysis.outcomePrice && entryPrice > 0) {
          // Realized P/L
          isRealized = true;
          outcomeDate = analysis.outcomeAt;
          const exitPrice = Number(analysis.outcomePrice);

          if (direction === 'short') {
            pnlPercent = ((entryPrice - exitPrice) / entryPrice) * 100;
          } else {
            pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
          }
        }

        return {
          id: analysis.id,
          symbol: analysis.symbol,
          direction,
          entryPrice,
          stopLoss,
          tp1,
          tp2,
          tp3,
          outcome: analysis.outcome,
          outcomePrice: analysis.outcomePrice ? Number(analysis.outcomePrice) : null,
          outcomeDate,
          createdAt: analysis.createdAt,
          pnlPercent: Number(pnlPercent.toFixed(2)),
          isRealized,
          isActive: !analysis.outcome && analysis.expiresAt && new Date(analysis.expiresAt) > now,
        };
      });

      // Group by date for chart
      const dailyData: Record<string, { realized: number; unrealized: number; trades: number }> = {};

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        dailyData[dateStr] = { realized: 0, unrealized: 0, trades: 0 };
      }

      // Fill in realized P/L by outcomeAt date
      tradesWithPnL.filter(t => t.isRealized && t.outcomeDate).forEach(trade => {
        const dateStr = trade.outcomeDate!.toISOString().split('T')[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].realized += trade.pnlPercent;
          dailyData[dateStr].trades++;
        }
      });

      // Get current prices for active trades to calculate unrealized P/L
      const activeTrades = tradesWithPnL.filter(t => t.isActive && t.entryPrice > 0);
      if (activeTrades.length > 0) {
        const symbols = [...new Set(activeTrades.map(t => t.symbol))];
        const prices: Record<string, number> = {};

        try {
          const pairs = symbols.map(s => `"${s.toUpperCase()}USDT"`).join(',');
          const priceResponse = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
          );
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            for (const item of priceData) {
              const symbol = item.symbol.replace('USDT', '');
              prices[symbol] = parseFloat(item.price);
            }
          }
        } catch (err) {
          logger.warn({ error: err }, 'Failed to fetch prices for performance history');
        }

        // Calculate unrealized P/L for today
        const todayStr = now.toISOString().split('T')[0];
        activeTrades.forEach(trade => {
          const currentPrice = prices[trade.symbol] || 0;
          if (currentPrice > 0 && trade.entryPrice > 0) {
            let unrealizedPnL = 0;
            if (trade.direction === 'short') {
              unrealizedPnL = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
            } else {
              unrealizedPnL = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
            }
            if (dailyData[todayStr]) {
              dailyData[todayStr].unrealized += unrealizedPnL;
            }
          }
        });
      }

      // Convert to array sorted by date
      const chartData = Object.entries(dailyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({
          date,
          realized: Number(data.realized.toFixed(2)),
          unrealized: Number(data.unrealized.toFixed(2)),
          total: Number((data.realized + data.unrealized).toFixed(2)),
          trades: data.trades,
        }));

      // Calculate cumulative P/L
      let cumulative = 0;
      const cumulativeData = chartData.map(d => {
        cumulative += d.realized;
        return {
          ...d,
          cumulative: Number(cumulative.toFixed(2)),
        };
      });

      return reply.send({
        success: true,
        data: {
          daily: cumulativeData,
          summary: {
            totalRealizedPnL: Number(cumulative.toFixed(2)),
            totalTrades: tradesWithPnL.filter(t => t.isRealized).length,
            activeTrades: activeTrades.length,
            winRate: tradesWithPnL.filter(t => t.isRealized).length > 0
              ? Number((tradesWithPnL.filter(t => t.isRealized && t.pnlPercent > 0).length /
                  tradesWithPnL.filter(t => t.isRealized).length * 100).toFixed(1))
              : 0,
          }
        }
      });
    } catch (error) {
      logger.error({ error }, 'Performance history error');
      return reply.status(500).send({
        success: false,
        error: { code: 'PERFORMANCE_HISTORY_ERROR', message: 'Failed to fetch performance history' },
      });
    }
  });

  /**
   * GET /api/analysis/supported-symbols
   */
  app.get('/supported-symbols', async (_request: FastifyRequest, reply: FastifyReply) => {
    const symbols = [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'BNB', name: 'BNB' },
      { symbol: 'SOL', name: 'Solana' },
      { symbol: 'XRP', name: 'XRP' },
      { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'AVAX', name: 'Avalanche' },
      { symbol: 'DOGE', name: 'Dogecoin' },
      { symbol: 'DOT', name: 'Polkadot' },
      { symbol: 'MATIC', name: 'Polygon' },
      { symbol: 'LINK', name: 'Chainlink' },
      { symbol: 'UNI', name: 'Uniswap' },
      { symbol: 'ATOM', name: 'Cosmos' },
      { symbol: 'LTC', name: 'Litecoin' },
    ];

    return reply.send({ success: true, data: symbols });
  });

  /**
   * GET /api/analysis/chart/candles
   * Fetch chart candle data for any supported asset (crypto, stocks, metals, bonds)
   * Uses multi-asset data provider to route to correct API (Binance for crypto, Yahoo for others)
   * PUBLIC endpoint - no auth required (data is publicly available)
   */
  const chartCandlesSchema = z.object({
    symbol: z.string().min(1),
    interval: z.enum(['5m', '15m', '30m', '1h', '2h', '4h', '1d', '1D', '1w', '1W']).default('1h'),
    limit: z.coerce.number().min(10).max(500).default(100),
  });

  app.get('/chart/candles', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = chartCandlesSchema.parse(request.query);
      const { symbol, interval, limit } = query;

      // Clean symbol (remove USDT suffix if present for display)
      let cleanSymbol = symbol.toUpperCase().trim();
      const suffixes = ['USDT', 'BUSD', 'USD', 'PERP', 'USDC'];
      for (const suffix of suffixes) {
        if (cleanSymbol.endsWith(suffix)) {
          cleanSymbol = cleanSymbol.slice(0, -suffix.length);
          break;
        }
      }

      // Detect asset class
      const assetClass = getAssetClass(cleanSymbol);
      logger.info({ symbol: cleanSymbol, assetClass, interval, limit }, 'Chart candles request');

      // Fetch candles using multi-asset provider
      const candles = await fetchCandles(cleanSymbol, interval, limit);

      // Transform to frontend format
      const chartData = candles.map(c => ({
        time: Math.floor(c.timestamp / 1000), // Convert to seconds for lightweight-charts
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

      return reply.send({
        success: true,
        data: {
          symbol: cleanSymbol,
          assetClass,
          interval,
          candles: chartData,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Chart candles error');
      const message = error instanceof Error ? error.message : 'Failed to fetch chart data';
      return reply.status(500).send({
        success: false,
        error: { code: 'CHART_ERROR', message },
      });
    }
  });

}
