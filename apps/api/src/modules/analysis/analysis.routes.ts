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
import { TradeType, getTradeConfig, getStepConfig } from './config/trade-config';
import { getCautionRate, calculateCautionOutcomes, calculateExpiredOutcomes } from '../reports/outcome.service';

// Gemini response with usage data
interface GeminiResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Gemini AI for generating insights with cost tracking
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return { text: 'AI analysis temporarily unavailable', inputTokens: 0, outputTokens: 0, costUsd: 0 };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No insight generated';

    // Extract token usage from response
    const usageMetadata = data.usageMetadata || {};
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
      metadata: { model: 'gemini-2.0-flash' },
    }).catch(err => console.error('Failed to log cost:', err));

    return { text, inputTokens, outputTokens, costUsd };
  } catch (error) {
    console.error('Gemini error:', error);
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
      console.error('Market Pulse error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to fetch market data' },
      });
    }
  });

  // Common schema with tradeType support
  const tradeTypeSchema = z.enum(['scalping', 'dayTrade', 'swing']).default('dayTrade');

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
    const userId = request.user!.id;
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
      console.error('Asset Scan error:', error);
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
    const userId = request.user!.id;
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
      console.error('Safety Check error:', error);
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
    const userId = request.user!.id;
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
      console.error('Timing error:', error);
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
    const userId = request.user!.id;
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
      console.error('Trade Plan error:', error);
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
    const userId = request.user!.id;
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
      console.error('Trap Check error:', error);
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
  const fullAnalysisSchema = z.object({
    symbol: z.string().toUpperCase(),
    accountSize: z.number().optional().default(10000),
    tradeType: tradeTypeSchema,
  });

  app.post('/full', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = fullAnalysisSchema.parse(request.body);

    const cost = await creditCostsService.getCreditCost('BUNDLE_FULL_ANALYSIS');
    const chargeResult = await creditService.charge(userId, cost, 'analysis_full', {
      symbol: body.symbol,
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: { code: 'CREDIT_001', message: 'Insufficient credits', required: cost },
      });
    }

    try {
      // Step 1-5: Run all prerequisite analysis steps in parallel
      // All steps use trade type specific timeframes and indicators
      const [marketPulse, assetScan, safetyCheck, timing, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(body.symbol, body.tradeType),
        analysisEngine.safetyCheck(body.symbol, body.tradeType),
        analysisEngine.timingAnalysis(body.symbol, body.tradeType),
        analysisEngine.trapCheck(body.symbol, body.tradeType),
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

      // Step 8: Final Verdict - combines everything
      const verdict = analysisEngine.getFinalVerdict(
        body.symbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        tradePlan
      );

      // Build AI prompt based on whether trade plan exists
      const tradeTypeLabel = body.tradeType === 'scalping' ? 'scalping (1-15 min)' : body.tradeType === 'dayTrade' ? 'day trading (1-8 hours)' : 'swing trading (2-14 days)';
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

      return reply.send({
        success: true,
        data: {
          analysisId: verdict.analysisId,
          symbol: body.symbol,
          tradeType: body.tradeType, // Include trade type in response
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
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error) {
      console.error('Full Analysis error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'ANALYSIS_ERROR', message: 'Failed to complete analysis' },
      });
    }
  });

  /**
   * GET /api/analysis/platform-stats
   * Platform-wide statistics for trust building (public)
   * All data is calculated from real database records (Report table)
   * Query params:
   *   - period: 'D' (24h), 'W' (7 days), 'M' (30 days), 'all' (no filter)
   */
  app.get('/platform-stats', async (request: FastifyRequest<{ Querystring: { period?: string } }>, reply: FastifyReply) => {
    try {
      const db = app.prisma;

      // Parse period filter
      const period = (request.query.period || 'all').toUpperCase();
      const now = Date.now();
      let periodFilterDate: Date | null = null;

      if (period === 'D') {
        periodFilterDate = new Date(now - 24 * 60 * 60 * 1000); // 24 hours
      } else if (period === 'W') {
        periodFilterDate = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days
      } else if (period === 'M') {
        periodFilterDate = new Date(now - 30 * 24 * 60 * 60 * 1000); // 30 days
      }

      // Get platform-wide statistics
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        totalReports,
        weeklyReports,
        monthlyReports
      ] = await Promise.all([
        db.user.count(),
        db.report.count(),
        db.report.count({
          where: {
            generatedAt: { gte: sevenDaysAgo }
          }
        }),
        db.report.count({
          where: {
            generatedAt: { gte: thirtyDaysAgo }
          }
        })
      ]);

      // Get real verdict distribution from Report table
      const verdictCounts = await db.report.groupBy({
        by: ['verdict'],
        _count: { verdict: true }
      });

      // Convert verdict counts to distribution object
      const verdictDistribution: Record<string, number> = {
        go: 0,
        conditional_go: 0,
        wait: 0,
        avoid: 0
      };

      verdictCounts.forEach((v) => {
        const key = v.verdict.toLowerCase().replace(' ', '_').replace('!', '');
        if (key === 'go') {
          verdictDistribution['go'] += v._count.verdict;
        } else if (key === 'conditional_go' || key === 'conditional') {
          verdictDistribution['conditional_go'] += v._count.verdict;
        } else if (key === 'wait') {
          verdictDistribution['wait'] += v._count.verdict;
        } else if (key === 'avoid') {
          verdictDistribution['avoid'] += v._count.verdict;
        }
      });

      // Get reports with full reportData to extract step scores
      // Only get reports that have analysis data (not expert_analysis type)
      // Filter by period if specified
      const reportWhereClause: { verdict: { not: string }; generatedAt?: { gte: Date } } = {
        verdict: { not: 'expert_analysis' }
      };
      if (periodFilterDate) {
        reportWhereClause.generatedAt = { gte: periodFilterDate };
      }

      const reports = await db.report.findMany({
        where: reportWhereClause,
        select: {
          reportData: true,
          score: true
        },
        take: 1000,
        orderBy: { generatedAt: 'desc' }
      });

      // Helper to extract score from step data in reportData JSON
      const extractStepScore = (reportData: unknown, stepName: string): number | null => {
        if (!reportData || typeof reportData !== 'object') return null;
        const data = reportData as Record<string, unknown>;
        const stepData = data[stepName] as Record<string, unknown> | undefined;
        if (!stepData) return null;

        // Try different score field names used in different steps
        if (typeof stepData.score === 'number') return stepData.score;
        if (typeof stepData.overallScore === 'number') return stepData.overallScore;
        if (typeof stepData.safetyScore === 'number') return stepData.safetyScore;
        if (typeof stepData.riskScore === 'number') return 10 - (stepData.riskScore as number);
        if (typeof stepData.confidence === 'number') return stepData.confidence;
        if (typeof stepData.tradingScore === 'number') return stepData.tradingScore;

        // For timing, check tradeNow boolean
        if (stepName === 'timing' && typeof stepData.tradeNow === 'boolean') {
          return stepData.tradeNow ? 8 : 5;
        }

        // For tradePlan, use riskReward as score indicator
        if (stepName === 'tradePlan' && typeof stepData.riskReward === 'number') {
          return Math.min(10, stepData.riskReward * 2);
        }

        return null;
      };

      // Calculate average scores per step from reportData
      const stepScores = {
        marketPulse: [] as number[],
        assetScanner: [] as number[],
        safetyCheck: [] as number[],
        timing: [] as number[],
        tradePlan: [] as number[],
        trapCheck: [] as number[],
        finalVerdict: [] as number[]
      };

      const allScores: number[] = [];

      reports.forEach((report) => {
        const rd = report.reportData;

        const s1 = extractStepScore(rd, 'marketPulse');
        const s2 = extractStepScore(rd, 'assetScan');
        const s3 = extractStepScore(rd, 'safetyCheck');
        const s4 = extractStepScore(rd, 'timing');
        const s5 = extractStepScore(rd, 'tradePlan');
        const s6 = extractStepScore(rd, 'trapCheck');

        // Final verdict score is the report's overall score
        const s7 = report.score ? Number(report.score) : null;

        if (s1 !== null) stepScores.marketPulse.push(s1);
        if (s2 !== null) stepScores.assetScanner.push(s2);
        if (s3 !== null) stepScores.safetyCheck.push(s3);
        if (s4 !== null) stepScores.timing.push(s4);
        if (s5 !== null) stepScores.tradePlan.push(s5);
        if (s6 !== null) stepScores.trapCheck.push(s6);
        if (s7 !== null) {
          stepScores.finalVerdict.push(s7);
          allScores.push(s7);
        }
      });

      const calcAvg = (arr: number[]): number => {
        if (arr.length === 0) return 0;
        const sum = arr.reduce((a, b) => a + b, 0);
        return Number((sum / arr.length).toFixed(1));
      };

      // Convert step scores to accuracy rates (score out of 10 -> percentage)
      const stepAccuracyRates = {
        marketPulse: calcAvg(stepScores.marketPulse) * 10,
        assetScanner: calcAvg(stepScores.assetScanner) * 10,
        safetyCheck: calcAvg(stepScores.safetyCheck) * 10,
        timing: calcAvg(stepScores.timing) * 10,
        tradePlan: calcAvg(stepScores.tradePlan) * 10,
        trapCheck: calcAvg(stepScores.trapCheck) * 10,
        finalVerdict: calcAvg(stepScores.finalVerdict) * 10
      };

      // Get real accuracy from CLOSED trades only (correct or incorrect, not neutral)
      // Accuracy = TP hits / (TP hits + SL hits) * 100
      const reportsWithOutcomes = await db.report.findMany({
        where: {
          outcome: { in: ['correct', 'incorrect'] } // Only closed trades
        },
        select: { outcome: true, stepOutcomes: true }
      });

      let realAccuracy = 0;
      let realSampleSize = 0;
      const realStepAccuracy: Record<string, { correct: number; total: number }> = {};

      if (reportsWithOutcomes.length > 0) {
        // Count correct predictions (TP hit)
        const correctCount = reportsWithOutcomes.filter(r => r.outcome === 'correct').length;
        // Total closed trades (TP hit + SL hit)
        const closedCount = reportsWithOutcomes.length;

        // Accuracy = correct / closed * 100
        realAccuracy = Number(((correctCount / closedCount) * 100).toFixed(1));
        realSampleSize = closedCount;

        // Aggregate step-level accuracy
        reportsWithOutcomes.forEach(r => {
          const stepOutcomes = r.stepOutcomes as Record<string, { correct: boolean }> | null;
          if (stepOutcomes) {
            Object.entries(stepOutcomes).forEach(([step, data]) => {
              if (!realStepAccuracy[step]) {
                realStepAccuracy[step] = { correct: 0, total: 0 };
              }
              realStepAccuracy[step].total++;
              if (data.correct) realStepAccuracy[step].correct++;
            });
          }
        });
      }

      // Overall platform accuracy - prefer real outcome data, fallback to score-based
      const platformAccuracy = realSampleSize > 0
        ? realAccuracy
        : (allScores.length > 0
          ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length * 10).toFixed(1))
          : 0);

      // Average confidence is the average report score
      const avgConfidence = calcAvg(allScores);

      // Get all reports with their outcomes and verdicts for signal accuracy calculation
      const allReportsForSignals = await db.report.findMany({
        select: { outcome: true, verdict: true }
      });

      // Helper to check if verdict is a GO signal
      const isGoSignal = (verdict: string) => {
        const v = verdict.toLowerCase();
        return (v.includes('go') || v.includes('conditional')) && !v.includes('wait') && !v.includes('avoid');
      };

      // Helper to check if verdict is a WAIT/AVOID signal
      const isCautionSignal = (verdict: string) => {
        const v = verdict.toLowerCase();
        return v.includes('wait') || v.includes('avoid');
      };

      // GO Signal statistics (GO + CONDITIONAL_GO)
      const goSignalReports = allReportsForSignals.filter(r => isGoSignal(r.verdict));
      const goCorrect = goSignalReports.filter(r => r.outcome === 'correct').length;
      const goIncorrect = goSignalReports.filter(r => r.outcome === 'incorrect').length;
      const goPending = goSignalReports.filter(r => !r.outcome || r.outcome === 'pending').length;
      const goTotal = goCorrect + goIncorrect;
      const goAccuracy = goTotal > 0 ? Number(((goCorrect / goTotal) * 100).toFixed(1)) : 0;

      // WAIT/AVOID Signal statistics
      const cautionSignalReports = allReportsForSignals.filter(r => isCautionSignal(r.verdict));
      const cautionCorrect = cautionSignalReports.filter(r => r.outcome === 'caution_correct').length;
      const cautionIncorrect = cautionSignalReports.filter(r => r.outcome === 'caution_incorrect').length;
      const cautionPending = cautionSignalReports.filter(r => !r.outcome || r.outcome === 'pending').length;
      const cautionTotal = cautionCorrect + cautionIncorrect;
      const cautionAccuracy = cautionTotal > 0 ? Number(((cautionCorrect / cautionTotal) * 100).toFixed(1)) : 0;

      // "With Plan" = GO signals only (analyses with actionable trade plans)
      // WAIT/AVOID don't count as "with plan" since they recommend NOT trading
      const reportsWithTradePlan = goSignalReports.length;
      const totalAllReports = allReportsForSignals.length;

      // Trigger background outcome calculations (don't await)
      calculateExpiredOutcomes().catch(err => console.error('Background outcome calculation failed:', err));
      calculateCautionOutcomes().catch(err => console.error('Background caution calculation failed:', err));

      // Calculate step accuracy from real outcomes if available
      if (realSampleSize > 0) {
        Object.entries(realStepAccuracy).forEach(([step, data]) => {
          const mappedStep = step === 'assetScanner' ? 'assetScanner' : step;
          if (stepAccuracyRates[mappedStep as keyof typeof stepAccuracyRates] !== undefined) {
            stepAccuracyRates[mappedStep as keyof typeof stepAccuracyRates] =
              data.total > 0 ? Number(((data.correct / data.total) * 100).toFixed(1)) : 0;
          }
        });
      }

      // Get platform creation date from first user
      const firstUser = await db.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });

      const platformSince = firstUser
        ? firstUser.createdAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Sample size is the number of reports with valid scores
      const sampleSize = allScores.length;

      return reply.send({
        success: true,
        data: {
          platform: {
            totalUsers,
            totalAnalyses: totalReports,
            totalReports,
            weeklyAnalyses: weeklyReports,
            monthlyAnalyses: monthlyReports,
            platformSince,
          },
          accuracy: {
            overall: platformAccuracy,
            avgConfidence,
            stepRates: stepAccuracyRates,
            lastUpdated: new Date().toISOString(),
            methodology: realSampleSize > 0 ? 'outcome-verified' : 'score-based',
            sampleSize: realSampleSize > 0 ? realSampleSize : sampleSize,
            outcomeVerifiedCount: realSampleSize,
            period: period === 'ALL' ? 'all' : period // D, W, M, or all
          },
          // GO Signal Rate: How often GO/CONDITIONAL_GO recommendations were correct
          goSignalRate: {
            rate: goAccuracy,
            goCorrect,
            goIncorrect,
            pending: goPending,
            totalVerified: goTotal,
            totalSignals: goSignalReports.length, // Should match verdicts.go + verdicts.conditional_go
            description: 'Success rate of GO/CONDITIONAL_GO signals (TP hit vs SL hit)'
          },
          // Caution Rate: How often WAIT/AVOID recommendations were correct
          cautionRate: {
            rate: cautionAccuracy,
            cautionCorrect,
            cautionIncorrect,
            pending: cautionPending,
            totalVerified: cautionTotal,
            totalSignals: cautionSignalReports.length, // Should match verdicts.wait + verdicts.avoid
            description: 'Success rate of WAIT/AVOID recommendations'
          },
          verdicts: verdictDistribution,
          // Analysis coverage (uses all reports, not period-filtered)
          coverage: {
            totalReports: totalAllReports,
            withTradePlan: reportsWithTradePlan,
            tradePlanPercentage: totalAllReports > 0
              ? Number(((reportsWithTradePlan / totalAllReports) * 100).toFixed(1))
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
      console.error('Platform stats error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'PLATFORM_STATS_ERROR', message: 'Failed to fetch platform statistics' }
      });
    }
  });

  /**
   * GET /api/analysis/statistics
   * User's analysis statistics for dashboard
   * All data calculated from real database records
   */
  app.get('/statistics', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    try {
      const db = app.prisma;

      // Get user's reports for real verdict distribution and scores
      const userReports = await db.report.findMany({
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
          entryPrice: true,
          reportData: true
        },
        orderBy: { generatedAt: 'desc' }
      });

      // Calculate real statistics from reports (not credit transactions)
      const totalAnalyses = userReports.length;
      const completedAnalyses = totalAnalyses;

      // Count verdicts by type
      let goSignals = 0;
      let avoidSignals = 0;

      userReports.forEach(report => {
        const verdict = report.verdict.toLowerCase();
        if (verdict === 'go' || verdict === 'go!') {
          goSignals++;
        } else if (verdict === 'conditional_go' || verdict === 'conditional go' || verdict === 'conditional') {
          goSignals++; // Count conditional_go as positive signal
        } else if (verdict === 'avoid') {
          avoidSignals++;
        }
      });

      // Calculate average score from actual report scores
      const scores = userReports
        .filter(r => r.score !== null)
        .map(r => Number(r.score));

      const avgScore = scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : 0;

      // Get CLOSED trades only (correct or incorrect, not neutral/pending)
      const closedTrades = userReports.filter(r => r.outcome === 'correct' || r.outcome === 'incorrect');
      const closedCount = closedTrades.length;
      const correctCount = closedTrades.filter(r => r.outcome === 'correct').length;

      // Accuracy = correct / closed * 100
      const accuracy = closedCount > 0
        ? Number(((correctCount / closedCount) * 100).toFixed(1))
        : 0;

      // Get ACTIVE trades (outcome is null or 'pending') AND not expired
      const now = new Date();
      const activeTrades = userReports.filter(r =>
        (!r.outcome || r.outcome === 'pending') &&
        (!r.expiresAt || new Date(r.expiresAt) > now)
      );
      const activeCount = activeTrades.length;

      // Fetch current prices for active trades to calculate active performance
      let activeProfitable = 0;
      if (activeCount > 0) {
        const activeSymbols = [...new Set(activeTrades.map(r => r.symbol))];
        const prices: Record<string, number> = {};

        try {
          const pairs = activeSymbols.map(s => `"${s.toUpperCase()}USDT"`).join(',');
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
          console.error('Failed to fetch prices for active performance:', err);
        }

        // Calculate how many active trades are profitable
        activeTrades.forEach(report => {
          const reportData = report.reportData as Record<string, unknown> | null;
          const tradePlan = reportData?.tradePlan as Record<string, unknown> | undefined;
          const assetScan = reportData?.assetScan as Record<string, unknown> | undefined;
          const timing = reportData?.timing as Record<string, unknown> | undefined;

          // Try multiple sources for entry price
          const entryPrice = Number(
            tradePlan?.averageEntry ||
            tradePlan?.entryPrice ||
            report.entryPrice ||
            assetScan?.currentPrice ||
            timing?.currentPrice
          ) || 0;

          const currentPrice = prices[report.symbol] || 0;
          const direction = (tradePlan?.direction as string || report.direction || 'long').toLowerCase();

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
      const lastReport = userReports[0];
      const lastAnalysisDate = lastReport
        ? new Date(lastReport.generatedAt).toLocaleDateString('en-US', {
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
      });
    } catch (error) {
      console.error('Statistics error:', error);
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
    const userId = request.user!.id;

    try {
      const db = app.prisma;

      // Calculate weekly/monthly analyses from credit transactions
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [weeklyAnalyses, monthlyAnalyses] = await Promise.all([
        db.creditTransaction.count({
          where: {
            userId,
            reason: 'analysis_full',
            createdAt: { gte: oneWeekAgo }
          }
        }),
        db.creditTransaction.count({
          where: {
            userId,
            reason: 'analysis_full',
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
      const symbols = [...new Set(reportsWithExpiration.map(r => r.symbol))];
      const prices: Record<string, number> = {};

      if (symbols.length > 0) {
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
          console.error('Failed to fetch prices for outcomes:', err);
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
      console.error('Performance error:', error);
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
    const userId = request.user!.id;

    try {
      const db = app.prisma;

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
      console.error('Recent analyses error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'RECENT_ERROR', message: 'Failed to fetch recent analyses' },
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
}
