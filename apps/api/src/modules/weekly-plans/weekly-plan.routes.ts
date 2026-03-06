/**
 * Weekly Plan Routes
 * API endpoints for weekly subscription management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { weeklyPlanService } from './weekly-plan.service';
import { WEEKLY_PLAN_CONFIG, getAllWeeklyPlanTypes, getPerUnitCost } from '../../config/weekly-plans';
import { isAdminEmail } from '../../config/admin';
import { prisma } from '../../core/database';

export default async function weeklyPlanRoutes(app: FastifyInstance) {
  // ===========================================
  // PUBLIC ENDPOINTS
  // ===========================================

  /**
   * GET /api/weekly-plans/plans
   * List available weekly subscription plans
   */
  app.get('/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    const plans = getAllWeeklyPlanTypes().map((planType) => {
      const config = WEEKLY_PLAN_CONFIG[planType];
      return {
        planType,
        name: config.name,
        description: config.description,
        price: config.priceUsd,
        priceDisplay: `$${config.priceUsd}/week`,
        interval: config.interval,
        quota: config.quota,
        perUnit: getPerUnitCost(planType),
        aiExpertQuestionsPerAnalysis: config.aiExpertQuestionsPerAnalysis,
        features: config.features,
      };
    });

    return reply.send({
      success: true,
      data: { plans },
    });
  });

  // ===========================================
  // AUTHENTICATED ENDPOINTS
  // ===========================================

  /**
   * GET /api/weekly-plans/status
   * Get user's weekly plan statuses
   */
  app.get(
    '/status',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      // Admin users get unlimited access
      const userEmail = request.user!.email;
      if (userEmail && isAdminEmail(userEmail)) {
        return reply.send({
          success: true,
          data: {
            isAdmin: true,
            plans: getAllWeeklyPlanTypes().map((planType) => ({
              planType,
              status: 'ACTIVE',
              remainingQuota: 999,
              totalQuota: 999,
              quotaUsedThisPeriod: 0,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
            })),
          },
        });
      }

      const plans = await weeklyPlanService.getUserPlans(userId);

      return reply.send({
        success: true,
        data: {
          plans: plans.map((plan) => ({
            planType: plan.planType,
            status: plan.status,
            remainingQuota: plan.remainingQuota,
            totalQuota: plan.totalQuota,
            quotaUsedThisPeriod: plan.quotaUsedThisPeriod,
            currentPeriodEnd: plan.currentPeriodEnd,
            cancelAtPeriodEnd: plan.cancelAtPeriodEnd,
          })),
        },
      });
    }
  );

  /**
   * POST /api/weekly-plans/checkout
   * Create Stripe checkout session for weekly plan
   */
  const checkoutSchema = z.object({
    planType: z.enum(['REPORT_WEEKLY', 'ANALYSIS_WEEKLY']),
  });

  app.post(
    '/checkout',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const body = checkoutSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      const appUrl = process.env['APP_URL'] || 'http://localhost:3000';

      try {
        const checkout = await weeklyPlanService.createCheckout({
          userId,
          userEmail: user.email,
          planType: body.planType,
          successUrl: `${appUrl}/pricing?success=true&plan=${body.planType}`,
          cancelUrl: `${appUrl}/pricing?canceled=true`,
        });

        return reply.send({
          success: true,
          data: {
            sessionId: checkout.sessionId,
            url: checkout.url,
          },
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Weekly plan checkout failed');
        return reply.code(500).send({
          success: false,
          error: { code: 'CHECKOUT_ERROR', message: error.message || 'Failed to create checkout session' },
        });
      }
    }
  );

  /**
   * POST /api/weekly-plans/cancel
   * Cancel a weekly plan
   */
  const cancelSchema = z.object({
    planType: z.enum(['REPORT_WEEKLY', 'ANALYSIS_WEEKLY']),
  });

  app.post(
    '/cancel',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const body = cancelSchema.parse(request.body);

      const result = await weeklyPlanService.cancelPlan(userId, body.planType);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'CANCEL_ERROR', message: result.message },
        });
      }

      return reply.send({
        success: true,
        data: { message: result.message },
      });
    }
  );

  /**
   * POST /api/weekly-plans/resume
   * Resume a canceled weekly plan
   */
  const resumeSchema = z.object({
    planType: z.enum(['REPORT_WEEKLY', 'ANALYSIS_WEEKLY']),
  });

  app.post(
    '/resume',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const body = resumeSchema.parse(request.body);

      const result = await weeklyPlanService.resumePlan(userId, body.planType);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: { code: 'RESUME_ERROR', message: result.message },
        });
      }

      return reply.send({
        success: true,
        data: { message: result.message },
      });
    }
  );
}
