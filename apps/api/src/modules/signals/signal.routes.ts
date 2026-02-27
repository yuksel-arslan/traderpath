/**
 * Signal Routes
 * API endpoints for signal management
 */

import { FastifyInstance } from 'fastify';
import { signalService } from './signal.service';
import { runSignalGenerationManually } from './signal-generator.job';
import { runSignalOutcomeTrackerManually } from './signal-outcome-tracker.job';
import { signalMonitoring } from './signal-monitoring.service';
import type { SignalFilterCriteria } from './types';

export async function signalRoutes(fastify: FastifyInstance) {
  // =====================================================
  // PUBLIC ENDPOINTS (authenticated users)
  // =====================================================

  /**
   * Get signals list with filters
   * GET /api/signals
   */
  fastify.get(
    '/signals',
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            market: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'published', 'expired', 'cancelled'] },
            minConfidence: { type: 'number', minimum: 0, maximum: 100 },
            minScore: { type: 'number', minimum: 0, maximum: 10 },
            minQualityScore: { type: 'number', minimum: 0, maximum: 100 },
            direction: { type: 'string', enum: ['long', 'short'] },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as any;

        const criteria: SignalFilterCriteria = {
          market: query.market,
          status: query.status,
          minConfidence: query.minConfidence,
          minScore: query.minScore,
          minQualityScore: query.minQualityScore,
          direction: query.direction,
        };

        const { signals, total } = await signalService.getSignals(
          criteria,
          query.limit || 20,
          query.offset || 0
        );

        return reply.send({
          success: true,
          data: {
            signals: signals.map(serializeSignal),
            total,
            limit: query.limit || 20,
            offset: query.offset || 0,
          },
        });
      } catch (error) {
        console.error('[signals] Error:', error);
        return reply.send({
          success: true,
          data: { signals: [], total: 0, limit: 20, offset: 0 },
        });
      }
    }
  );

  /**
   * Get single signal by ID
   * GET /api/signals/:id
   */
  fastify.get(
    '/signals/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const signal = await signalService.getSignal(id);

        if (!signal) {
          return reply.status(404).send({
            success: false,
            error: 'Signal not found',
          });
        }

        return reply.send({
          success: true,
          data: serializeSignal(signal),
        });
      } catch (error) {
        console.error('[signals/:id] Error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch signal',
        });
      }
    }
  );

  /**
   * Get latest signals for a market
   * GET /api/signals/latest/:market
   */
  fastify.get(
    '/signals/latest/:market',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: {
            market: { type: 'string', enum: ['crypto', 'stocks', 'metals', 'bonds'] },
          },
          required: ['market'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 20, default: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { market } = request.params as { market: string };
        const { limit } = request.query as { limit?: number };

        const signals = await signalService.getLatestSignals(market, limit || 10);

        return reply.send({
          success: true,
          data: signals.map(serializeSignal),
        });
      } catch (error) {
        console.error('[signals/latest] Error:', error);
        return reply.send({
          success: true,
          data: [],
        });
      }
    }
  );

  /**
   * Get signal statistics
   * GET /api/signals/stats
   */
  fastify.get(
    '/signals/stats',
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            fromDate: { type: 'string', format: 'date' },
            toDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { fromDate, toDate } = request.query as {
          fromDate?: string;
          toDate?: string;
        };

        const stats = await signalService.getSignalStats(
          fromDate ? new Date(fromDate) : undefined,
          toDate ? new Date(toDate) : undefined
        );

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error('[signals/stats] Error:', error);
        return reply.status(500).send({
          success: false,
          data: {
            total: 0,
            published: 0,
            outcomes: { tp1Hit: 0, tp2Hit: 0, slHit: 0, expired: 0 },
            winRate: 0,
            byMarket: [],
          },
          error: 'Failed to fetch signal stats',
        });
      }
    }
  );

  // =====================================================
  // USER PREFERENCES
  // =====================================================

  /**
   * Get user signal preferences
   * GET /api/signals/preferences
   */
  fastify.get(
    '/signals/preferences',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userId = (request.user as any).id;

        const preferences = await signalService.getUserPreferences(userId);

        return reply.send({
          success: true,
          data: serializePreferences(preferences),
        });
      } catch (error) {
        console.error('[signals/preferences GET] Error:', error);
        return reply.send({
          success: true,
          data: {
            enabledMarkets: ['crypto'],
            minConfidence: 70,
            minClassicScore: 7,
            requireMlisConfirm: false,
            allowedVerdicts: ['GO', 'CONDITIONAL_GO'],
            telegramEnabled: false,
            discordEnabled: false,
            emailEnabled: true,
            quietHoursEnabled: false,
          },
        });
      }
    }
  );

  /**
   * Update user signal preferences
   * PATCH /api/signals/preferences
   */
  fastify.patch(
    '/signals/preferences',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          properties: {
            enabledMarkets: {
              type: 'array',
              items: { type: 'string', enum: ['crypto', 'stocks', 'metals', 'bonds'] },
            },
            enabledAssetClasses: {
              type: 'array',
              items: { type: 'string' },
            },
            minConfidence: { type: 'number', minimum: 0, maximum: 100 },
            minClassicScore: { type: 'number', minimum: 0, maximum: 10 },
            requireMlisConfirm: { type: 'boolean' },
            allowedVerdicts: {
              type: 'array',
              items: { type: 'string', enum: ['GO', 'CONDITIONAL_GO', 'WAIT', 'AVOID'] },
            },
            telegramEnabled: { type: 'boolean' },
            telegramChatId: { type: 'string' },
            discordEnabled: { type: 'boolean' },
            discordWebhookUrl: { type: 'string' },
            emailEnabled: { type: 'boolean' },
            quietHoursEnabled: { type: 'boolean' },
            quietHoursStart: { type: 'number', minimum: 0, maximum: 23 },
            quietHoursEnd: { type: 'number', minimum: 0, maximum: 23 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = (request.user as any).id;
        const updates = request.body as any;

        const preferences = await signalService.updateUserPreferences(userId, updates);

        return reply.send({
          success: true,
          data: serializePreferences(preferences),
        });
      } catch (error) {
        console.error('[signals/preferences PATCH] Error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update signal preferences',
        });
      }
    }
  );

  // =====================================================
  // ADMIN ENDPOINTS
  // =====================================================

  /**
   * Get signal system health status
   * GET /api/signals/admin/health
   */
  fastify.get(
    '/signals/admin/health',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      // Admin only
      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      try {
        const health = await signalMonitoring.getSystemHealth();
        const generatorMetrics = await signalMonitoring.getGeneratorMetrics();
        const trackerMetrics = await signalMonitoring.getTrackerMetrics();

        return reply.send({
          success: true,
          data: {
            ...health,
            metrics: {
              generator: generatorMetrics,
              tracker: trackerMetrics,
            },
          },
        });
      } catch (error) {
        console.error('[SignalRoutes] Health check error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Health check failed',
        });
      }
    }
  );

  /**
   * Trigger manual signal generation
   * POST /api/signals/admin/generate
   */
  fastify.post(
    '/signals/admin/generate',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      // Admin only
      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      try {
        const result = await runSignalGenerationManually();

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('[SignalRoutes] Manual generation error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }
    }
  );

  /**
   * Cancel a pending signal
   * POST /api/signals/admin/:id/cancel
   */
  fastify.post(
    '/signals/admin/:id/cancel',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as any;

      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      try {
        const signal = await signalService.cancelSignal(id, reason);

        return reply.send({
          success: true,
          data: serializeSignal(signal),
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Cancel failed',
        });
      }
    }
  );

  /**
   * Expire old signals manually
   * POST /api/signals/admin/expire-old
   */
  fastify.post(
    '/signals/admin/expire-old',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      try {
        const count = await signalService.expireOldSignals();

        return reply.send({
          success: true,
          data: { expiredCount: count },
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Expire failed',
        });
      }
    }
  );

  /**
   * Track signal outcomes manually (check TP/SL hits)
   * POST /api/signals/admin/track-outcomes
   */
  fastify.post(
    '/signals/admin/track-outcomes',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;

      if (!user.isAdmin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      try {
        const result = await runSignalOutcomeTrackerManually();

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('[SignalRoutes] Outcome tracking error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Tracking failed',
        });
      }
    }
  );
}

// =====================================================
// SERIALIZATION HELPERS
// =====================================================

function serializeSignal(signal: any) {
  return {
    id: signal.id,
    symbol: signal.symbol,
    assetClass: signal.assetClass,
    market: signal.market,
    direction: signal.direction,
    entryPrice: Number(signal.entryPrice),
    stopLoss: Number(signal.stopLoss),
    takeProfit1: Number(signal.takeProfit1),
    takeProfit2: Number(signal.takeProfit2),
    riskRewardRatio: Number(signal.riskRewardRatio),
    classicVerdict: signal.classicVerdict,
    classicScore: Number(signal.classicScore),
    mlisConfirmation: signal.mlisConfirmation,
    mlisRecommendation: signal.mlisRecommendation,
    mlisConfidence: signal.mlisConfidence,
    overallConfidence: signal.overallConfidence,
    winRateEstimate: signal.winRateEstimate ?? null,
    qualityScore: signal.qualityScore ?? null,
    qualityData: signal.qualityData ?? null,
    capitalFlowPhase: signal.capitalFlowPhase,
    capitalFlowBias: signal.capitalFlowBias,
    sectorFlow: signal.sectorFlow ? Number(signal.sectorFlow) : null,
    classicAnalysisId: signal.classicAnalysisId,
    mlisAnalysisId: signal.mlisAnalysisId,
    status: signal.status,
    publishedAt: signal.publishedAt?.toISOString(),
    expiresAt: signal.expiresAt?.toISOString(),
    outcome: signal.outcome,
    outcomePrice: signal.outcomePrice ? Number(signal.outcomePrice) : null,
    outcomeAt: signal.outcomeAt?.toISOString(),
    pnlPercent: signal.pnlPercent ? Number(signal.pnlPercent) : null,
    createdAt: signal.createdAt.toISOString(),
    updatedAt: signal.updatedAt.toISOString(),
  };
}

function serializePreferences(prefs: any) {
  return {
    id: prefs.id,
    userId: prefs.userId,
    enabledMarkets: prefs.enabledMarkets,
    enabledAssetClasses: prefs.enabledAssetClasses,
    minConfidence: prefs.minConfidence,
    minClassicScore: Number(prefs.minClassicScore),
    requireMlisConfirm: prefs.requireMlisConfirm,
    allowedVerdicts: prefs.allowedVerdicts,
    telegramEnabled: prefs.telegramEnabled,
    telegramChatId: prefs.telegramChatId,
    discordEnabled: prefs.discordEnabled,
    discordWebhookUrl: prefs.discordWebhookUrl,
    emailEnabled: prefs.emailEnabled,
    quietHoursEnabled: prefs.quietHoursEnabled,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    createdAt: prefs.createdAt.toISOString(),
    updatedAt: prefs.updatedAt.toISOString(),
  };
}
