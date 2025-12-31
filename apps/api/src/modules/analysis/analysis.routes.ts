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
      const aiPrompt = `You are a crypto market analyst. Based on this data, give a brief 2-3 sentence market summary in English:
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

      const aiPrompt = `You are a crypto analyst. Give a brief 2-3 sentence analysis for ${body.symbol} in English:
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

      const aiPrompt = `You are a crypto risk analyst. Analyze this safety data for ${body.symbol} and give 2-3 sentences in English:
- Risk Level: ${data.riskLevel}
- Pump/Dump Risk: ${data.manipulation.pumpDumpRisk}
- Whale Activity: ${data.whaleActivity.bias} (Net flow: $${Math.round(data.whaleActivity.netFlowUsd).toLocaleString()})
- Spoofing Detected: ${data.manipulation.spoofingDetected ? 'Yes' : 'No'}
- Wash Trading: ${data.manipulation.washTrading ? 'Yes' : 'No'}
- Smart Money: ${data.smartMoney.positioning}
- Warnings: ${data.warnings.join(', ') || 'None'}

Focus on risk assessment and trading implications.`;

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

      const bestZone = data.entryZones[0];
      const aiPrompt = `You are a crypto timing analyst. Give brief entry advice for ${body.symbol} in English (2-3 sentences):
- Current Price: $${data.currentPrice}
- Optimal Entry: $${data.optimalEntry}
- Trade Now: ${data.tradeNow ? 'Yes' : 'No'}
- Best Entry Zone: $${bestZone?.priceLow || data.optimalEntry} - $${bestZone?.priceHigh || data.optimalEntry} (${bestZone?.eta || 'Now'})
- Conditions Met: ${data.conditions.filter(c => c.met).length}/${data.conditions.length}
- Wait For: ${data.waitFor?.event || 'Ready'}

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

      const aiPrompt = `You are a crypto trap analyst. Analyze trap risk for ${body.symbol} in English (2-3 sentences):
- Risk Level: ${data.riskLevel}
- Bull Trap: ${data.traps.bullTrap ? `Yes at $${data.traps.bullTrapZone}` : 'No'}
- Bear Trap: ${data.traps.bearTrap ? `Yes at $${data.traps.bearTrapZone}` : 'No'}
- Fakeout Risk: ${data.traps.fakeoutRisk}
- Liquidity Grab Zones: ${data.traps.liquidityGrab.zones.map(z => `$${z}`).join(', ') || 'None'}
- Stop Hunt Zones: ${data.traps.stopHuntZones.map(z => `$${z}`).join(', ') || 'None'}
- Counter Strategies: ${data.counterStrategy.join('; ')}

Warn about potential traps and give protective advice.`;

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

      const aiVerdict = await getGeminiInsight(aiPrompt);

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
