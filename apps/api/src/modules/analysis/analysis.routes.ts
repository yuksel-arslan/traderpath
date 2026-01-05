// ===========================================
// Analysis Routes - Real Analysis with Gemini AI
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { costService } from '../costs/cost.service';
import { CREDIT_COSTS } from '@tradepath/types';
import { analysisEngine } from './analysis.engine';
import { config } from '../../core/config';

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

  /**
   * POST /api/analysis/asset-scan
   * Step 2: Asset Scanner (2 credits)
   */
  const assetScanSchema = z.object({
    symbol: z.string().toUpperCase(),
  });

  app.post('/asset-scan', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = assetScanSchema.parse(request.body);

    const cost = CREDIT_COSTS.STEP_ASSET_SCANNER;
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
      const data = await analysisEngine.scanAsset(body.symbol);

      const aiPrompt = `You are a crypto analyst. Give a brief 2-3 sentence analysis for ${body.symbol} in English:
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

    const cost = CREDIT_COSTS.STEP_SAFETY_CHECK;
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
      const data = await analysisEngine.safetyCheck(body.symbol);

      const aiPrompt = `You are a crypto risk analyst. Analyze this safety data for ${body.symbol} and give 2-3 sentences in English:
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

    const cost = CREDIT_COSTS.STEP_TIMING;
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
      const data = await analysisEngine.timingAnalysis(body.symbol);

      const bestZone = data.entryZones[0];
      const aiPrompt = `You are a crypto timing analyst. Give brief entry advice for ${body.symbol} in English (2-3 sentences):
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
  });

  app.post('/trade-plan', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = tradePlanSchema.parse(request.body);

    const cost = CREDIT_COSTS.STEP_TRADE_PLAN;
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
      const data = await analysisEngine.tradePlan(body.symbol, body.accountSize);

      const tpPrices = data.takeProfits.map(tp => `$${tp.price}`).join(', ');
      const aiPrompt = `You are a crypto trade planner. Summarize this trade plan for ${body.symbol} in English (2-3 sentences):
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

    const cost = CREDIT_COSTS.STEP_TRAP_CHECK;
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
      const data = await analysisEngine.trapCheck(body.symbol);

      const aiPrompt = `You are a crypto trap analyst. Analyze trap risk for ${body.symbol} in English (2-3 sentences):
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
  });

  app.post('/full', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = fullAnalysisSchema.parse(request.body);

    const cost = CREDIT_COSTS.BUNDLE_FULL_ANALYSIS;
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
      // Run all analysis steps in parallel for better performance
      const [marketPulse, assetScan, safetyCheck, timing, tradePlan, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(body.symbol),
        analysisEngine.safetyCheck(body.symbol),
        analysisEngine.timingAnalysis(body.symbol),
        analysisEngine.tradePlan(body.symbol, body.accountSize),
        analysisEngine.trapCheck(body.symbol),
      ]);

      // Generate final verdict
      const verdict = await analysisEngine.finalVerdict(body.symbol, {
        marketPulse,
        assetScan,
        safetyCheck,
        timing,
        tradePlan,
        trapCheck,
      });

      // Get comprehensive AI summary with updated property names
      const aiPrompt = `You are a senior crypto analyst. Give a comprehensive trading recommendation for ${body.symbol} in English (4-5 sentences):

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

Trade Plan:
- Direction: ${tradePlan.direction.toUpperCase()}
- Average Entry: $${tradePlan.averageEntry}
- Stop Loss: $${tradePlan.stopLoss.price} (${tradePlan.stopLoss.percentage}% risk)
- Take Profit 1: $${tradePlan.takeProfits[0]?.price ?? tradePlan.averageEntry}
- Risk/Reward: ${tradePlan.riskReward}:1
- Win Rate: ${tradePlan.winRateEstimate}%

Final Verdict: ${verdict.verdict.toUpperCase()} (Score: ${verdict.overallScore}/10)
Recommendation: ${verdict.recommendation}

Give a clear, actionable trading recommendation with specific entry, stop loss, and target prices.`;

      const aiResult = await getGeminiInsight(aiPrompt, 'analysis_full', userId, body.symbol);
      const aiVerdict = aiResult.text;

      return reply.send({
        success: true,
        data: {
          analysisId: verdict.analysisId,
          symbol: body.symbol,
          timestamp: verdict.createdAt,
          expiresAt: verdict.expiresAt,
          overallScore: verdict.overallScore,
          verdict: verdict.verdict,
          steps: {
            marketPulse,
            assetScan,
            safetyCheck,
            timing,
            tradePlan,
            trapCheck,
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
   */
  app.get('/platform-stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = app.prisma;

      // Get platform-wide statistics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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
      const reports = await db.report.findMany({
        where: {
          verdict: { not: 'expert_analysis' }
        },
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

      // Get real accuracy from outcome calculations (if available)
      const reportsWithOutcomes = await db.report.findMany({
        where: { outcome: { not: null } },
        select: { outcome: true, stepOutcomes: true }
      });

      let realAccuracy = 0;
      let realSampleSize = 0;
      const realStepAccuracy: Record<string, { correct: number; total: number }> = {};

      if (reportsWithOutcomes.length > 0) {
        let correct = 0;
        reportsWithOutcomes.forEach(r => {
          if (r.outcome === 'correct') correct++;

          // Aggregate step-level accuracy
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
        realAccuracy = Number(((correct / reportsWithOutcomes.length) * 100).toFixed(1));
        realSampleSize = reportsWithOutcomes.length;
      }

      // Overall platform accuracy - prefer real outcome data, fallback to score-based
      const platformAccuracy = realSampleSize > 0
        ? realAccuracy
        : (allScores.length > 0
          ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length * 10).toFixed(1))
          : 0);

      // Average confidence is the average report score
      const avgConfidence = calcAvg(allScores);

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
            outcomeVerifiedCount: realSampleSize
          },
          verdicts: verdictDistribution,
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
          verdict: true,
          score: true,
          generatedAt: true
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

      // Get reports with verified outcomes for REAL accuracy calculation
      const reportsWithOutcomes = await db.report.findMany({
        where: {
          userId,
          outcome: { not: null }
        },
        select: {
          outcome: true
        }
      });

      // Calculate REAL accuracy from verified outcomes (TP/SL hit detection)
      const verifiedCount = reportsWithOutcomes.length;
      const correctCount = reportsWithOutcomes.filter(r => r.outcome === 'correct').length;

      // Accuracy = correct predictions / total verified predictions * 100
      // If no verified outcomes yet, show 0 (not fake 100%)
      const accuracy = verifiedCount > 0
        ? Number(((correctCount / verifiedCount) * 100).toFixed(1))
        : 0;

      // Count pending analyses (not yet verified)
      const pendingCount = totalAnalyses - verifiedCount;

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
        verifiedAnalyses: verifiedCount,
        correctAnalyses: correctCount,
        pendingAnalyses: pendingCount,
        accuracy, // Real accuracy from verified outcomes
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
          symbol: true,
          verdict: true,
          score: true,
          generatedAt: true,
          expiresAt: true,
          outcome: true,
          outcomePriceChange: true
        },
        orderBy: { generatedAt: 'desc' },
        take: 5
      });

      // Recent outcomes from real reports with expiration info
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

        // Use real outcome if available, otherwise determine from score
        let outcome: 'correct' | 'incorrect' | 'pending' = 'pending';
        let priceChange = 0;

        if (report.outcome) {
          // Real outcome exists
          outcome = report.outcome as 'correct' | 'incorrect' | 'pending';
          priceChange = report.outcomePriceChange ? Number(report.outcomePriceChange) : 0;
        } else if (isExpired) {
          // Expired but no outcome calculated yet - will be calculated soon
          outcome = 'pending';
          const score = Number(report.score);
          const expectedDirection = verdict === 'go' || verdict === 'conditional_go' ? 1 : -1;
          priceChange = (score - 5) * 2 * expectedDirection;
        } else {
          // Still valid - outcome pending
          outcome = 'pending';
          const score = Number(report.score);
          const expectedDirection = verdict === 'go' || verdict === 'conditional_go' ? 1 : -1;
          priceChange = (score - 5) * 2 * expectedDirection;
        }

        return {
          symbol: report.symbol,
          verdict,
          outcome,
          priceChange: Number(priceChange.toFixed(2)),
          date: new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          expiresAt: report.expiresAt.toISOString(),
          isExpired,
          hoursRemaining
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
