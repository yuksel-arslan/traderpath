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
import { MarketType } from './types';
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
