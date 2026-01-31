// ===========================================
// Daily Pass Routes
// API endpoints for managing daily passes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { dailyPassService, DAILY_PASS_CONFIG } from './daily-pass.service';
import { DailyPassType } from '@prisma/client';

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

export default async function dailyPassRoutes(app: FastifyInstance) {
  /**
   * GET /api/passes/status
   * Get user's current pass status
   */
  app.get('/status', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const passes = await dailyPassService.getActivePasses(userId);

      return reply.send({
        success: true,
        data: {
          capitalFlowL4: {
            ...passes.capitalFlowL4,
            cost: DAILY_PASS_CONFIG.CAPITAL_FLOW_L4.cost,
            description: DAILY_PASS_CONFIG.CAPITAL_FLOW_L4.description,
          },
          assetAnalysis: {
            ...passes.assetAnalysis,
            cost: DAILY_PASS_CONFIG.ASSET_ANALYSIS.cost,
            maxUsage: DAILY_PASS_CONFIG.ASSET_ANALYSIS.maxUsage,
            description: DAILY_PASS_CONFIG.ASSET_ANALYSIS.description,
          },
        },
      });
    } catch (error) {
      console.error('Error getting pass status:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'PASS_STATUS_ERROR', message: 'Failed to get pass status' },
      });
    }
  });

  /**
   * POST /api/passes/purchase
   * Purchase a daily pass
   */
  const purchaseSchema = z.object({
    passType: z.enum(['CAPITAL_FLOW_L4', 'ASSET_ANALYSIS']),
  });

  app.post('/purchase', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const body = purchaseSchema.parse(request.body);

    try {
      const result = await dailyPassService.purchasePass(userId, body.passType as DailyPassType);

      if (!result.success) {
        return reply.status(402).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: {
          pass: result.pass,
          config: DAILY_PASS_CONFIG[body.passType as keyof typeof DAILY_PASS_CONFIG],
        },
      });
    } catch (error) {
      console.error('Error purchasing pass:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'PASS_PURCHASE_ERROR', message: 'Failed to purchase pass' },
      });
    }
  });

  /**
   * GET /api/passes/check/:passType
   * Check if user has a specific pass
   */
  app.get('/check/:passType', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { passType: string } }>, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const { passType } = request.params;

    // Validate passType
    if (!['CAPITAL_FLOW_L4', 'ASSET_ANALYSIS'].includes(passType)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PASS_TYPE', message: 'Invalid pass type' },
      });
    }

    try {
      const result = await dailyPassService.checkPass(userId, passType as DailyPassType);

      return reply.send({
        success: true,
        data: {
          ...result,
          cost: DAILY_PASS_CONFIG[passType as keyof typeof DAILY_PASS_CONFIG].cost,
        },
      });
    } catch (error) {
      console.error('Error checking pass:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'PASS_CHECK_ERROR', message: 'Failed to check pass' },
      });
    }
  });

  /**
   * GET /api/passes/config
   * Get pass configuration (public pricing info)
   */
  app.get('/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        capitalFlowL4: {
          cost: DAILY_PASS_CONFIG.CAPITAL_FLOW_L4.cost,
          maxUsage: DAILY_PASS_CONFIG.CAPITAL_FLOW_L4.maxUsage,
          description: DAILY_PASS_CONFIG.CAPITAL_FLOW_L4.description,
        },
        assetAnalysis: {
          cost: DAILY_PASS_CONFIG.ASSET_ANALYSIS.cost,
          maxUsage: DAILY_PASS_CONFIG.ASSET_ANALYSIS.maxUsage,
          description: DAILY_PASS_CONFIG.ASSET_ANALYSIS.description,
        },
      },
    });
  });

  /**
   * GET /api/passes/stats
   * Get user's pass purchase statistics
   */
  app.get('/stats', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const stats = await dailyPassService.getPassStats(userId);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting pass stats:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'PASS_STATS_ERROR', message: 'Failed to get pass statistics' },
      });
    }
  });
}
