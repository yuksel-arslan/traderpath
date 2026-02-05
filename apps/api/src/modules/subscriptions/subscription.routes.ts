// ===========================================
// Subscription Routes
// Stripe subscription management API endpoints
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { subscriptionService } from './subscription.service';
import { stripeService } from '../payments/stripe.service';
import {
  TIER_CONFIG,
  STRIPE_PRICES,
  getAllTiers,
  getPaidTiers,
  getMonthlyPrice,
  getYearlyPrice,
  getYearlySavings,
} from '../../config/subscription-tiers';

export default async function subscriptionRoutes(app: FastifyInstance) {
  // ===========================================
  // PUBLIC ENDPOINTS
  // ===========================================

  /**
   * GET /api/subscriptions/plans
   * List all available subscription plans
   */
  app.get('/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    const plans = getPaidTiers().map((tier) => {
      const config = TIER_CONFIG[tier];
      return {
        tier,
        name: `TraderPath ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
        monthlyPrice: getMonthlyPrice(tier),
        yearlyPrice: getYearlyPrice(tier),
        yearlySavings: getYearlySavings(tier),
        dailyCredits: config.dailyCredits,
        features: {
          capitalFlowL3: config.capitalFlowL3,
          capitalFlowL4: config.capitalFlowL4,
          assetAnalysis: config.assetAnalysis,
          aiFeatures: config.aiFeatures,
          reportsExport: config.reportsExport,
          automation: config.automation,
          rewards: config.rewards,
        },
        limits: {
          maxScheduledReports: config.maxScheduledReports,
          maxAlerts: config.maxAlerts,
          maxDailyAnalyses: config.maxDailyAnalyses,
          monthlyAiExpertQuestions: config.monthlyAiExpertQuestions,
          monthlyEmailReports: config.monthlyEmailReports,
          monthlyPdfReports: config.monthlyPdfReports,
        },
      };
    });

    // Also include free tier info
    const freeConfig = TIER_CONFIG.free;
    const freePlan = {
      tier: 'free',
      name: 'TraderPath Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      yearlySavings: 0,
      dailyCredits: freeConfig.dailyCredits,
      features: {
        capitalFlowL3: freeConfig.capitalFlowL3,
        capitalFlowL4: freeConfig.capitalFlowL4,
        assetAnalysis: freeConfig.assetAnalysis,
        aiFeatures: freeConfig.aiFeatures,
        reportsExport: freeConfig.reportsExport,
        automation: freeConfig.automation,
        rewards: freeConfig.rewards,
      },
      limits: {
        maxScheduledReports: freeConfig.maxScheduledReports,
        maxAlerts: freeConfig.maxAlerts,
        maxDailyAnalyses: freeConfig.maxDailyAnalyses,
        monthlyAiExpertQuestions: freeConfig.monthlyAiExpertQuestions,
        monthlyEmailReports: freeConfig.monthlyEmailReports,
        monthlyPdfReports: freeConfig.monthlyPdfReports,
      },
    };

    return reply.send({
      success: true,
      data: {
        plans: [freePlan, ...plans],
      },
    });
  });

  // ===========================================
  // AUTHENTICATED ENDPOINTS
  // ===========================================

  /**
   * GET /api/subscriptions/status
   * Get current user's subscription status
   */
  app.get(
    '/status',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      try {
        const subscription = await subscriptionService.getUserSubscription(userId);

        return reply.send({
          success: true,
          data: {
            tier: subscription.tier,
            status: subscription.status,
            dailyCredits: subscription.config.dailyCredits,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            features: {
              capitalFlowL3: subscription.config.capitalFlowL3,
              capitalFlowL4: subscription.config.capitalFlowL4,
              assetAnalysis: subscription.config.assetAnalysis,
              aiFeatures: subscription.config.aiFeatures,
              reportsExport: subscription.config.reportsExport,
              automation: subscription.config.automation,
              rewards: subscription.config.rewards,
            },
            limits: {
              maxScheduledReports: subscription.config.maxScheduledReports,
              maxAlerts: subscription.config.maxAlerts,
              maxDailyAnalyses: subscription.config.maxDailyAnalyses,
              monthlyAiExpertQuestions: subscription.config.monthlyAiExpertQuestions,
              monthlyEmailReports: subscription.config.monthlyEmailReports,
              monthlyPdfReports: subscription.config.monthlyPdfReports,
            },
          },
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Failed to get subscription status');
        return reply.code(500).send({
          success: false,
          error: { code: 'SUBSCRIPTION_ERROR', message: 'Failed to get subscription status' },
        });
      }
    }
  );

  /**
   * POST /api/subscriptions/checkout
   * Create Stripe checkout session for subscription
   */
  const checkoutSchema = z.object({
    tier: z.enum(['starter', 'pro', 'elite']),
    interval: z.enum(['month', 'year']),
  });

  app.post(
    '/checkout',
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
        const checkout = await subscriptionService.createCheckoutSession({
          userId,
          userEmail: user.email,
          tier: body.tier,
          interval: body.interval,
          successUrl: `${appUrl}/settings?tab=billing&success=true&session_id={CHECKOUT_SESSION_ID}`,
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
        app.log.error({ error: error.message }, 'Failed to create checkout session');
        return reply.code(500).send({
          success: false,
          error: { code: 'CHECKOUT_ERROR', message: 'Failed to create checkout session' },
        });
      }
    }
  );

  /**
   * POST /api/subscriptions/portal
   * Create Stripe billing portal session
   */
  app.post(
    '/portal',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const appUrl = process.env['APP_URL'] || 'http://localhost:3000';

      try {
        const portal = await subscriptionService.createPortalSession(
          userId,
          `${appUrl}/settings?tab=billing`
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
   * POST /api/subscriptions/cancel
   * Cancel subscription at period end
   */
  app.post(
    '/cancel',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      const result = await subscriptionService.cancelSubscription(userId);

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
   * POST /api/subscriptions/resume
   * Resume a canceled subscription
   */
  app.post(
    '/resume',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;

      const result = await subscriptionService.resumeSubscription(userId);

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

  // ===========================================
  // STRIPE WEBHOOK
  // ===========================================

  /**
   * POST /api/subscriptions/webhook
   * Stripe webhook handler for subscription events
   */
  app.post(
    '/webhook',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'] as string;

      if (!signature) {
        return reply.code(400).send({ error: 'Missing stripe-signature header' });
      }

      // Get raw body for signature verification
      const rawBody = (request as any).rawBody;
      if (!rawBody) {
        return reply.code(400).send({ error: 'Missing raw body' });
      }

      let event;
      try {
        event = stripeService.constructWebhookEvent(rawBody, signature);
      } catch (err: any) {
        app.log.error({ error: err.message }, 'Webhook signature verification failed');
        return reply.code(400).send({ error: `Webhook Error: ${err.message}` });
      }

      app.log.info({ type: event.type }, 'Received Stripe webhook');

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object;
            if (session.mode === 'subscription' && session.subscription) {
              // Get the subscription details
              const subscription = await stripeService.getSubscription(
                session.subscription as string
              );
              if (subscription) {
                await subscriptionService.handleSubscriptionWebhook(
                  subscription,
                  session.customer as string
                );
                app.log.info(
                  { userId: session.metadata?.userId },
                  'Subscription created from checkout'
                );
              }
            }
            break;
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const subscription = event.data.object;

            // Check if this is a signal subscription or credit subscription
            const isSignalSubscription = subscription.metadata?.subscriptionType === 'signal';

            if (isSignalSubscription) {
              const { signalSubscriptionService } = await import('../signals');
              await signalSubscriptionService.handleSignalSubscriptionWebhook(
                subscription,
                subscription.customer as string
              );
              app.log.info(
                { subscriptionId: subscription.id },
                `Signal subscription ${event.type.split('.').pop()}`
              );
            } else {
              await subscriptionService.handleSubscriptionWebhook(
                subscription,
                subscription.customer as string
              );
              app.log.info(
                { subscriptionId: subscription.id },
                `Credit subscription ${event.type.split('.').pop()}`
              );
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object;

            // Check if this is a signal subscription or credit subscription
            const isSignalSubscription = subscription.metadata?.subscriptionType === 'signal';

            if (isSignalSubscription) {
              const { signalSubscriptionService } = await import('../signals');
              await signalSubscriptionService.handleSignalSubscriptionDeleted(
                subscription,
                subscription.customer as string
              );
              app.log.info({ subscriptionId: subscription.id }, 'Signal subscription deleted');
            } else {
              await subscriptionService.handleSubscriptionDeleted(
                subscription,
                subscription.customer as string
              );
              app.log.info({ subscriptionId: subscription.id }, 'Credit subscription deleted');
            }

            // Notify user of cancellation
            const userId = subscription.metadata.userId;
            if (userId) {
              const { paymentNotificationService } = await import('../notifications/payment-notification.service');
              await paymentNotificationService.notifySubscriptionCanceled(userId);
            }

            break;
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            if (invoice.subscription) {
              // Refresh subscription status
              const subscription = await stripeService.getSubscription(
                invoice.subscription as string
              );
              if (subscription) {
                await subscriptionService.handleSubscriptionWebhook(
                  subscription,
                  invoice.customer as string
                );

                // Notify user of successful payment
                const userId = subscription.metadata.userId;
                const tier = subscription.metadata.tier || 'unknown';
                if (userId) {
                  const { paymentNotificationService } = await import('../notifications/payment-notification.service');
                  await paymentNotificationService.notifySubscriptionSuccess(userId, tier);
                }
              }
            }
            app.log.info({ invoiceId: invoice.id }, 'Invoice payment succeeded');
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object;
            if (invoice.subscription) {
              // Subscription will be updated to past_due automatically
              const subscription = await stripeService.getSubscription(
                invoice.subscription as string
              );
              if (subscription) {
                await subscriptionService.handleSubscriptionWebhook(
                  subscription,
                  invoice.customer as string
                );

                // Notify user of payment failure
                const userId = subscription.metadata.userId;
                const amount = (invoice.amount_due || 0) / 100; // Convert cents to dollars
                const reason = invoice.last_payment_error?.message || 'Payment method declined';

                if (userId) {
                  const { paymentNotificationService } = await import('../notifications/payment-notification.service');
                  await paymentNotificationService.notifyPaymentFailed(userId, reason, amount);
                }
              }
            }
            app.log.warn({ invoiceId: invoice.id }, 'Invoice payment failed');
            break;
          }

          default:
            app.log.info({ type: event.type }, 'Unhandled Stripe event');
        }
      } catch (error: any) {
        app.log.error({ error: error.message, type: event.type }, 'Error processing webhook');
        // Still return 200 to prevent Stripe from retrying
        // The error is logged for investigation
      }

      return reply.send({ received: true });
    }
  );
}
