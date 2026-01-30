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
      const validMarkets: MarketType[] = ['crypto', 'stocks', 'bonds', 'metals'];
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
      const validMarkets: MarketType[] = ['crypto', 'stocks', 'bonds', 'metals'];
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
}

export default capitalFlowRoutes;
