/**
 * Signal Subscription Routes
 * API endpoints for signal subscription management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { signalSubscriptionService, SIGNAL_TIER_CONFIG } from './signal-subscription.service';

export default async function signalSubscriptionRoutes(app: FastifyInstance) {
  // ===========================================
  // PUBLIC ENDPOINTS
  // ===========================================

  /**
   * GET /api/v1/signals/subscription/plans
   * List available signal subscription plans
   */
  app.get('/subscription/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    const plans = Object.entries(SIGNAL_TIER_CONFIG).map(([tier, config]) => ({
      tier,
      name: config.name,
      price: {
        monthly: config.price.monthly ? config.price.monthly / 100 : undefined,
        yearly: config.price.yearly ? config.price.yearly / 100 : undefined,
      },
      markets: config.markets,
      maxSignalsPerDay: config.maxSignalsPerDay,
      deliveryChannels: config.deliveryChannels,
    }));

    return reply.send({
      success: true,
      data: { plans },
    });
  });

  // ===========================================
  // AUTHENTICATED ENDPOINTS
  // ===========================================

  /**
   * GET /api/v1/signals/subscription/status
   * Get current user's signal subscription status
   */
  app.get(
    '/subscription/status',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      try {
        const subscription = await signalSubscriptionService.getUserSignalSubscription(userId);

        const config = subscription.tier !== 'SIGNAL_FREE'
          ? SIGNAL_TIER_CONFIG[subscription.tier]
          : null;

        return reply.send({
          success: true,
          data: {
            tier: subscription.tier,
            status: subscription.status,
            enabledMarkets: subscription.enabledMarkets,
            maxSignalsPerDay: subscription.maxSignalsPerDay,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            deliveryChannels: {
              telegram: subscription.telegramDelivery,
              discord: subscription.discordDelivery,
              email: subscription.emailDelivery,
            },
            config: config ? {
              name: config.name,
              markets: config.markets,
            } : null,
          },
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Failed to get signal subscription status');
        return reply.code(500).send({
          success: false,
          error: { code: 'SUBSCRIPTION_ERROR', message: 'Failed to get subscription status' },
        });
      }
    }
  );

  /**
   * POST /api/v1/signals/subscription/checkout
   * Create Stripe checkout session for signal subscription
   */
  const checkoutSchema = z.object({
    tier: z.enum(['SIGNAL_BASIC', 'SIGNAL_PRO']),
  });

  app.post(
    '/subscription/checkout',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const body = checkoutSchema.parse(request.body);

      // Get user email
      const user = await app.prisma.user.findUnique({
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
        const checkout = await signalSubscriptionService.createSignalCheckout({
          userId,
          userEmail: user.email,
          tier: body.tier,
          successUrl: `${appUrl}/settings?tab=signals&success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appUrl}/pricing?canceled=true&mode=signals`,
        });

        return reply.send({
          success: true,
          data: {
            sessionId: checkout.sessionId,
            url: checkout.url,
          },
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Failed to create checkout session');
        return reply.code(500).send({
          success: false,
          error: { code: 'CHECKOUT_ERROR', message: 'Failed to create checkout session' },
        });
      }
    }
  );

  /**
   * POST /api/v1/signals/subscription/portal
   * Create Stripe billing portal session
   */
  app.post(
    '/subscription/portal',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const appUrl = process.env['APP_URL'] || 'http://localhost:3000';

      try {
        const portal = await signalSubscriptionService.createSignalPortalSession(
          userId,
          `${appUrl}/settings?tab=signals`
        );

        return reply.send({
          success: true,
          data: {
            url: portal.url,
          },
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Failed to create portal session');
        return reply.code(500).send({
          success: false,
          error: { code: 'PORTAL_ERROR', message: error.message || 'Failed to create portal session' },
        });
      }
    }
  );

  /**
   * POST /api/v1/signals/subscription/cancel
   * Cancel signal subscription at period end
   */
  app.post(
    '/subscription/cancel',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      const result = await signalSubscriptionService.cancelSignalSubscription(userId);

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
   * POST /api/v1/signals/subscription/resume
   * Resume a canceled signal subscription
   */
  app.post(
    '/subscription/resume',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      const result = await signalSubscriptionService.resumeSignalSubscription(userId);

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
