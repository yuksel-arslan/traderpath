// ===========================================
// Cost Management Routes
// API endpoints for cost tracking and pricing
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { costService } from './cost.service';

// Admin emails with access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

// Admin authentication middleware
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);

  if (!request.user || !ADMIN_EMAILS.includes(request.user.email)) {
    return reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }
}

export default async function costRoutes(app: FastifyInstance) {
  // ===========================================
  // GET /api/costs/summary - Get cost summary
  // ===========================================
  app.get('/summary', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const summary = await costService.getCostSummary();
      return reply.send({ success: true, data: summary });
    } catch (error) {
      console.error('Cost summary error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to get cost summary' },
      });
    }
  });

  // ===========================================
  // GET /api/costs/analytics - Get cost analytics
  // ===========================================
  app.get('/analytics', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { days = '30' } = request.query as Record<string, string>;
      const analytics = await costService.getAnalytics(parseInt(days));
      return reply.send({ success: true, data: analytics });
    } catch (error) {
      console.error('Cost analytics error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to get cost analytics' },
      });
    }
  });

  // ===========================================
  // GET /api/costs/settings - Get cost settings
  // ===========================================
  app.get('/settings', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = await costService.getSettings();
      return reply.send({ success: true, data: settings });
    } catch (error) {
      console.error('Cost settings error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to get cost settings' },
      });
    }
  });

  // ===========================================
  // PATCH /api/costs/settings - Update cost settings
  // ===========================================
  const updateSettingsSchema = z.object({
    geminiInputCostPer1M: z.number().min(0).optional(),
    geminiOutputCostPer1M: z.number().min(0).optional(),
    targetProfitMargin: z.number().min(0).max(90).optional(),
    creditPriceUsd: z.number().min(0.01).max(10).optional(),
    minCreditPriceUsd: z.number().min(0.01).optional(),
    maxCreditPriceUsd: z.number().min(0.01).optional(),
    autoPricingEnabled: z.boolean().optional(),
    autoPricingInterval: z.number().min(1).max(168).optional(), // 1 hour to 1 week
  });

  app.patch('/settings', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = updateSettingsSchema.parse(request.body);
      const settings = await costService.updateSettings(body);
      return reply.send({ success: true, data: settings });
    } catch (error) {
      console.error('Update settings error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to update cost settings' },
      });
    }
  });

  // ===========================================
  // GET /api/costs/pricing-recommendation - Get pricing recommendation
  // ===========================================
  app.get('/pricing-recommendation', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const recommendation = await costService.calculateRecommendedPrice();
      return reply.send({ success: true, data: recommendation });
    } catch (error) {
      console.error('Pricing recommendation error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to calculate pricing recommendation' },
      });
    }
  });

  // ===========================================
  // POST /api/costs/apply-recommendation - Apply pricing recommendation
  // ===========================================
  app.post('/apply-recommendation', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const recommendation = await costService.calculateRecommendedPrice();

      if (!recommendation.shouldUpdate) {
        return reply.send({
          success: true,
          data: { updated: false, reason: recommendation.reason },
        });
      }

      await costService.updateSettings({
        creditPriceUsd: recommendation.recommendedPrice,
      });

      // Update package prices too
      await costService.updateCreditPackagePrices(recommendation.recommendedPrice);

      return reply.send({
        success: true,
        data: {
          updated: true,
          previousPrice: recommendation.currentPrice,
          newPrice: recommendation.recommendedPrice,
          reason: recommendation.reason,
        },
      });
    } catch (error) {
      console.error('Apply recommendation error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to apply pricing recommendation' },
      });
    }
  });

  // ===========================================
  // POST /api/costs/run-auto-pricing - Manually trigger auto-pricing
  // ===========================================
  app.post('/run-auto-pricing', {
    preHandler: requireAdmin,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await costService.runAutoPricing();
      return reply.send({ success: true, data: result });
    } catch (error) {
      console.error('Auto-pricing error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to run auto-pricing' },
      });
    }
  });

  // ===========================================
  // GET /api/costs/estimate/:operation - Estimate cost for operation
  // ===========================================
  app.get('/estimate/:operation', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { operation } = request.params as { operation: string };
      const cost = await costService.estimateOperationCost(operation);
      const settings = await costService.getSettings();

      // Calculate how many credits this costs and the revenue
      const creditCosts: Record<string, number> = {
        'market_pulse': 0,
        'asset_scan': 2,
        'safety_check': 5,
        'timing': 3,
        'trade_plan': 5,
        'trap_check': 5,
        'analysis_full': 15,
      };

      const credits = creditCosts[operation] || 0;
      const revenue = credits * Number(settings.creditPriceUsd);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return reply.send({
        success: true,
        data: {
          operation,
          estimatedCostUsd: Math.round(cost * 10000) / 10000,
          creditsCharged: credits,
          revenueUsd: Math.round(revenue * 10000) / 10000,
          profitUsd: Math.round(profit * 10000) / 10000,
          marginPercent: Math.round(margin * 10) / 10,
        },
      });
    } catch (error) {
      console.error('Estimate error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'COST_ERROR', message: 'Failed to estimate cost' },
      });
    }
  });
}
