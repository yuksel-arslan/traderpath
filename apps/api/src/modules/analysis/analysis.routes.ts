// ===========================================
// Analysis Routes - Real Analysis with Gemini AI
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { CREDIT_COSTS } from '@tradepath/types';
import { analysisEngine } from './analysis.engine';
import { config } from '../../core/config';

// Gemini AI for generating insights
async function getGeminiInsight(prompt: string): Promise<string> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return 'AI insights not available';
  }

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
      return 'AI analysis temporarily unavailable';
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No insight generated';
  } catch (error) {
    console.error('Gemini error:', error);
    return 'AI analysis temporarily unavailable';
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
      const aiPrompt = `You are a crypto market analyst. Based on this data, give a brief 2-3 sentence market summary in Turkish:
- BTC Dominance: ${data.btcDominance}% (${data.btcDominanceTrend})
- Fear & Greed: ${data.fearGreedIndex} (${data.fearGreedLabel})
- Market Regime: ${data.marketRegime}
- Trend: ${data.trend.direction} (${data.trend.strength}% strength)

Be concise and actionable.`;

      const aiSummary = await getGeminiInsight(aiPrompt);

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

      const aiPrompt = `You are a crypto analyst. Give a brief 2-3 sentence analysis for ${body.symbol} in Turkish:
- Price: $${data.currentPrice}
- RSI: ${data.indicators.rsi}
- MACD Histogram: ${data.indicators.macd.histogram > 0 ? 'Positive' : 'Negative'}
- Trend: ${data.timeframes[0]?.trend} (${data.timeframes[0]?.strength}%)
- Support: $${data.levels.support[0]}, Resistance: $${data.levels.resistance[0]}

Be concise and give a trading perspective.`;

      const aiInsight = await getGeminiInsight(aiPrompt);

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

      const aiPrompt = `You are a crypto risk analyst. Analyze this safety data for ${body.symbol} and give 2-3 sentences in Turkish:
- Manipulation Risk: ${data.manipulationRisk}
- Whale Activity: ${data.whaleActivity}
- Volume Anomaly: ${data.volumeAnomaly ? 'Yes' : 'No'}
- Warnings: ${data.warnings.join(', ') || 'None'}

Focus on risk assessment.`;

      const aiInsight = await getGeminiInsight(aiPrompt);

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

      const aiPrompt = `You are a crypto timing analyst. Give brief entry advice for ${body.symbol} in Turkish (2-3 sentences):
- Current Price: $${data.currentPrice}
- Optimal Entry: $${data.optimalEntry}
- Entry Zone: $${data.entryZone.low} - $${data.entryZone.high}
- Recommendation: ${data.recommendation}
- Time Window: ${data.timeWindow}

Be specific about when to enter.`;

      const aiInsight = await getGeminiInsight(aiPrompt);

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

      const aiPrompt = `You are a crypto trade planner. Summarize this trade plan for ${body.symbol} in Turkish (2-3 sentences):
- Direction: ${data.direction}
- Entry: $${data.entry}
- Stop Loss: $${data.stopLoss}
- Take Profits: $${data.takeProfit.join(', $')}
- Risk/Reward: ${data.riskReward}:1
- Position Size: ${data.positionSize}

Give practical trading advice.`;

      const aiInsight = await getGeminiInsight(aiPrompt);

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

      const aiPrompt = `You are a crypto trap analyst. Analyze trap risk for ${body.symbol} in Turkish (2-3 sentences):
- Liquidation Risk: ${data.liquidationRisk}
- Trap Probability: ${data.trapProbability}%
- Warnings: ${data.warnings.join(', ') || 'None'}

Warn about potential traps.`;

      const aiInsight = await getGeminiInsight(aiPrompt);

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
      // Run all analysis steps
      const marketPulse = await analysisEngine.getMarketPulse();
      const assetScan = await analysisEngine.scanAsset(body.symbol);
      const safetyCheck = await analysisEngine.safetyCheck(body.symbol);
      const timing = await analysisEngine.timingAnalysis(body.symbol);
      const tradePlan = await analysisEngine.tradePlan(body.symbol, body.accountSize);
      const trapCheck = await analysisEngine.trapCheck(body.symbol);

      // Generate final verdict
      const verdict = await analysisEngine.finalVerdict(body.symbol, {
        marketPulse,
        assetScan,
        safetyCheck,
        timing,
        tradePlan,
        trapCheck,
      });

      // Get comprehensive AI summary
      const aiPrompt = `You are a senior crypto analyst. Give a comprehensive trading recommendation for ${body.symbol} in Turkish (4-5 sentences):

Market Analysis:
- Fear & Greed: ${marketPulse.fearGreedIndex}
- Market Regime: ${marketPulse.marketRegime}

Asset Analysis:
- Price: $${assetScan.currentPrice}
- Trend: ${assetScan.timeframes[0]?.trend}
- RSI: ${assetScan.indicators.rsi}

Risk Assessment:
- Manipulation Risk: ${safetyCheck.manipulationRisk}
- Trap Probability: ${trapCheck.trapProbability}%

Trade Plan:
- Direction: ${tradePlan.direction}
- Entry: $${tradePlan.entry}
- Stop Loss: $${tradePlan.stopLoss}
- Target: $${tradePlan.takeProfit[0]}

Final Verdict: ${verdict.verdict} (${verdict.confidence}% confidence)

Give a clear BUY/SELL/HOLD recommendation with reasoning.`;

      const aiVerdict = await getGeminiInsight(aiPrompt);

      return reply.send({
        success: true,
        data: {
          analysisId: `analysis_${Date.now()}_${body.symbol}`,
          symbol: body.symbol,
          timestamp: new Date().toISOString(),
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
