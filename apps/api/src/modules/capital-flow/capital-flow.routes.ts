/**
 * Capital Flow API Routes
 *
 * "Para nereye akıyorsa potansiyel oradadır"
 * (Where money flows, potential exists)
 *
 * Global Capital Flow Intelligence Platform
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getCapitalFlowSummary,
  getGlobalLiquidity,
  getAllMarketFlows,
  getMarketFlow,
  clearCapitalFlowCache,
  getMarketAnalysis
} from './capital-flow.service';
import { MarketType, MarketFlow } from './types';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';

// Admin emails - their reports are public and visible to all users
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

interface SaveCapitalFlowReportBody {
  reportData: {
    liquidity: unknown;
    markets: unknown;
    sectors: unknown;
    recommendation: unknown;
    timestamp: string;
  };
}

export async function capitalFlowRoutes(app: FastifyInstance) {
  /**
   * GET /api/capital-flow/summary
   *
   * Returns complete Capital Flow summary including:
   * - Global Liquidity (Fed Balance Sheet, M2, DXY, VIX)
   * - All Market Flows (Crypto, Stocks, Bonds, Metals)
   * - Current Recommendation
   * - Active Rotation Detection
   *
   * Public endpoint - no authentication required
   */
  app.get('/summary', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const summary = await getCapitalFlowSummary();

      return reply.send({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[CapitalFlow] Error getting summary:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch capital flow summary',
      });
    }
  });

  /**
   * GET /api/capital-flow/liquidity
   *
   * Returns global liquidity metrics only:
   * - Fed Balance Sheet
   * - M2 Money Supply
   * - DXY (Dollar Index)
   * - VIX (Fear Index)
   * - Yield Curve
   *
   * LAYER 1: Global Liquidity Tracker
   */
  app.get('/liquidity', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const liquidity = await getGlobalLiquidity();

      return reply.send({
        success: true,
        data: liquidity,
      });
    } catch (error) {
      console.error('[CapitalFlow] Error getting liquidity:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch global liquidity data',
      });
    }
  });

  /**
   * GET /api/capital-flow/markets
   *
   * Returns all market flows:
   * - Crypto (DeFi TVL, BTC dominance, sectors)
   * - Stocks (S&P 500, sectors)
   * - Bonds (Treasury yields)
   * - Metals (Gold, Silver)
   *
   * LAYER 2: Market Flow Analyzer
   */
  app.get('/markets', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const markets = await getAllMarketFlows();

      return reply.send({
        success: true,
        data: markets,
      });
    } catch (error) {
      console.error('[CapitalFlow] Error getting markets:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch market flows',
      });
    }
  });

  /**
   * GET /api/capital-flow/markets/:market
   *
   * Returns specific market flow data
   * @param market - 'crypto' | 'stocks' | 'bonds' | 'metals'
   *
   * LAYER 2 + LAYER 3: Market + Sector Drill-Down
   */
  app.get('/markets/:market', async (
    request: FastifyRequest<{ Params: { market: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const market = request.params.market as MarketType;

      // Validate market type
      const validMarkets: MarketType[] = ['crypto', 'stocks', 'bonds', 'metals', 'bist'];
      if (!validMarkets.includes(market)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid market type. Valid options: ${validMarkets.join(', ')}`,
        });
      }

      const marketFlow = await getMarketFlow(market);

      return reply.send({
        success: true,
        data: marketFlow,
      });
    } catch (error) {
      console.error('[CapitalFlow] Error getting market:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch market flow',
      });
    }
  });

  /**
   * GET /api/capital-flow/analyze/:market
   *
   * Returns AI-generated analysis for a specific market
   * Includes trend analysis, key metrics, and recommendation
   *
   * FREE endpoint - provides value without full analysis credits
   */
  app.get('/analyze/:market', async (
    request: FastifyRequest<{ Params: { market: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const market = request.params.market as MarketType;

      // Validate market type
      const validMarkets: MarketType[] = ['crypto', 'stocks', 'bonds', 'metals', 'bist'];
      if (!validMarkets.includes(market)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid market type. Valid options: ${validMarkets.join(', ')}`,
        });
      }

      const analysis = await getMarketAnalysis(market);

      return reply.send({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('[CapitalFlow] Error getting market analysis:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate market analysis',
      });
    }
  });

  /**
   * POST /api/capital-flow/recommend-assets
   *
   * Generates AI Asset Recommendations based on current Capital Flow state.
   * This is the gateway for the Top-Down analysis flow:
   * Capital Flow (L1-L4) → AI Recommendation → Asset Analysis → Trade Plan
   *
   * Returns a structured recommendation with:
   * - L1-L4 status summary
   * - Recommended assets (BUY + SELL candidates)
   * - Warnings and proceed flags
   *
   * Requires authentication.
   */
  app.post('/recommend-assets', {
    onRequest: [authenticate],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const summary = await getCapitalFlowSummary();

      // Generate unique Capital Flow session ID
      const capitalFlowId = `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();

      // Build L1 Status
      const l1Status = {
        bias: summary.liquidityBias,
        netLiquidityChange30d: summary.globalLiquidity?.netLiquidity?.change30d ?? summary.globalLiquidity?.m2MoneySupply?.change30d ?? 0,
        dxyTrend: summary.globalLiquidity?.dxy?.trend ?? 'stable',
        vixLevel: summary.globalLiquidity?.vix?.level ?? 'unknown',
        vixValue: summary.globalLiquidity?.vix?.value ?? 0,
      };

      // Build L2 Status
      const l2Status = (summary.markets || []).filter(m => m && m.market).map(m => ({
        market: m.market,
        phase: m.phase,
        flow7d: m.flow7d ?? 0,
        flow30d: m.flow30d ?? 0,
        rotationSignal: m.rotationSignal,
      }));

      // Build L3 Status (from primary recommended market)
      const primaryMarket = summary.recommendation?.primaryMarket;
      const primaryMarketData = (summary.markets || []).find(m => m.market === primaryMarket);
      const l3Status = {
        primaryMarket: primaryMarket || 'crypto',
        sectors: (primaryMarketData?.sectors || []).map(s => ({
          name: s.name,
          trending: s.trending,
          flow7d: s.flow7d ?? 0,
        })),
      };

      // Build L4 Status
      const l4Status = {
        buyRecommendation: summary.recommendation ? {
          market: summary.recommendation.primaryMarket,
          confidence: summary.recommendation.confidence ?? 0,
          action: summary.recommendation.action,
          suggestedAssets: summary.recommendation.suggestedAssets || [],
        } : null,
        sellRecommendation: summary.sellRecommendation ? {
          market: summary.sellRecommendation.primaryMarket,
          confidence: summary.sellRecommendation.confidence ?? 0,
          action: summary.sellRecommendation.action,
          suggestedAssets: summary.sellRecommendation.suggestedAssets || [],
        } : null,
      };

      // Build combined recommended assets list
      const recommendedAssets: {
        symbol: string;
        name: string;
        market: string;
        direction: 'BUY' | 'SELL';
        confidence: number;
        alignmentScore: number;
        riskTag: 'low' | 'medium' | 'high';
        reason: string;
      }[] = [];

      // Add BUY assets
      if (summary.recommendation?.suggestedAssets) {
        for (const asset of summary.recommendation.suggestedAssets) {
          recommendedAssets.push({
            symbol: asset.symbol,
            name: asset.name,
            market: asset.market || primaryMarket || 'crypto',
            direction: 'BUY',
            confidence: summary.recommendation.confidence ?? 0,
            alignmentScore: (summary.recommendation as any)?.fiveFactorScore?.totalScore ?? summary.recommendation.confidence ?? 0,
            riskTag: asset.riskLevel || 'medium',
            reason: asset.reason || summary.recommendation.reason || 'Capital Flow aligned',
          });
        }
      }

      // Add SELL assets
      if (summary.sellRecommendation?.suggestedAssets) {
        for (const asset of summary.sellRecommendation.suggestedAssets) {
          recommendedAssets.push({
            symbol: asset.symbol,
            name: asset.name,
            market: asset.market || summary.sellRecommendation.primaryMarket || 'crypto',
            direction: 'SELL',
            confidence: summary.sellRecommendation.confidence ?? 0,
            alignmentScore: (summary.sellRecommendation as any)?.fiveFactorScore?.totalScore ?? summary.sellRecommendation.confidence ?? 0,
            riskTag: asset.riskLevel || 'medium',
            reason: asset.reason || summary.sellRecommendation.reason || 'Capital outflow detected',
          });
        }
      }

      // Build warnings
      const warnings: string[] = [];
      if (summary.liquidityBias === 'risk_off') {
        warnings.push('L1 Risk-Off: Only safe haven assets (Bonds/Gold) recommended.');
      }
      if (primaryMarketData?.phase === 'exit') {
        warnings.push(`${(primaryMarket || '').toUpperCase()} is in EXIT phase: No new entries recommended.`);
      }
      if (primaryMarketData?.phase === 'late') {
        warnings.push(`${(primaryMarket || '').toUpperCase()} is in LATE phase: Proceed with caution.`);
      }
      if (summary.recommendation?.action === 'avoid') {
        warnings.push('AI Recommendation: AVOID - Market conditions unfavorable.');
      }
      if (summary.activeRotation) {
        warnings.push(`Active rotation: ${summary.activeRotation.from?.toUpperCase() ?? '?'} → ${summary.activeRotation.to?.toUpperCase() ?? '?'} (${summary.activeRotation.confidence ?? 0}% confidence)`);
      }

      // Determine if analysis can proceed
      const canProceed = recommendedAssets.length > 0 &&
        summary.recommendation?.action !== 'avoid' &&
        primaryMarketData?.phase !== 'exit';

      return reply.send({
        success: true,
        data: {
          capitalFlowId,
          timestamp,
          l1Status,
          l2Status,
          l3Status,
          l4Status,
          recommendedAssets,
          warnings,
          canProceed,
        },
      });
    } catch (error) {
      console.error('[CapitalFlow] Error generating asset recommendations:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate asset recommendations',
      });
    }
  });

  /**
   * POST /api/capital-flow/refresh
   *
   * Forces cache refresh for capital flow data
   * Admin only endpoint
   */
  app.post('/refresh', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Clear cache
      await clearCapitalFlowCache();

      // Fetch fresh data
      const summary = await getCapitalFlowSummary();

      return reply.send({
        success: true,
        message: 'Capital flow data refreshed',
        data: summary,
      });
    } catch (error) {
      console.error('[CapitalFlow] Error refreshing data:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to refresh capital flow data',
      });
    }
  });

  /**
   * POST /api/capital-flow/report
   *
   * Saves Capital Flow snapshot as a report to user's history
   * Requires authentication
   */
  app.post('/report', {
    onRequest: [authenticate],
  }, async (
    request: FastifyRequest<{ Body: SaveCapitalFlowReportBody }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = request.user!.id;
      const { reportData } = request.body;

      if (!reportData) {
        return reply.status(400).send({
          success: false,
          error: 'reportData is required',
        });
      }

      // Get user email to check admin status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const isAdmin = user ? ADMIN_EMAILS.includes(user.email) : false;

      // Extract recommendation for verdict and score
      const recommendation = reportData.recommendation as {
        action?: string;
        market?: string;
        confidence?: number;
      } | undefined;

      const verdict = recommendation?.action || 'ANALYZE';
      const score = recommendation?.confidence || 50;
      const direction = verdict.toUpperCase() === 'BUY' ? 'long' :
                       verdict.toUpperCase() === 'SELL' ? 'short' : null;

      // Calculate expiration (48 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      // Create the report
      const report = await prisma.report.create({
        data: {
          userId,
          symbol: 'CAPITAL_FLOW',
          reportData: reportData as any,
          verdict,
          score,
          direction,
          expiresAt,
          tradeType: 'capital_flow',
          isPublic: isAdmin,
        },
      });

      console.log('[CapitalFlow] Report saved:', { reportId: report.id, userId });

      return reply.code(201).send({
        success: true,
        data: {
          id: report.id,
          symbol: report.symbol,
          verdict: report.verdict,
          score: Number(report.score),
          generatedAt: report.generatedAt,
          expiresAt: report.expiresAt,
        },
      });
    } catch (error) {
      console.error('[CapitalFlow] Error saving report:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to save capital flow report',
      });
    }
  });
}

export default capitalFlowRoutes;
