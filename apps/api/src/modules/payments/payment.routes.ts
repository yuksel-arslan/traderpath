// ===========================================
// Payment Routes
// Stripe Checkout & Webhooks
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { stripeService } from './stripe.service';
import { authenticate } from '../../core/auth/middleware';
import { prisma } from '../../core/database';

export default async function paymentRoutes(app: FastifyInstance) {
  /**
   * GET /api/payments/packages
   * Get available credit packages from database
   */
  app.get('/packages', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Get active packages from database
    const dbPackages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { priceUsd: 'asc' },
    });

    // Format packages for frontend
    const packages = dbPackages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      bonus: pkg.bonusCredits,
      price: `$${Number(pkg.priceUsd).toFixed(2)}`,
      perCredit: `$${Number(pkg.pricePerCredit).toFixed(2)}`,
      popular: pkg.isPopular,
    }));

    return reply.send({
      success: true,
      data: { packages },
    });
  });

  /**
   * POST /api/payments/create-checkout-session
   * Create Stripe checkout session
   */
  const checkoutSchema = z.object({
    packageId: z.string().uuid(),
  });

  app.post(
    '/create-checkout-session',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const body = checkoutSchema.parse(request.body);

      // Get user email and package in parallel
      const [user, pkg] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        }),
        prisma.creditPackage.findUnique({
          where: { id: body.packageId, isActive: true },
        }),
      ]);

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      if (!pkg) {
        return reply.code(404).send({
          success: false,
          error: { code: 'PACKAGE_NOT_FOUND', message: 'Package not found or inactive' },
        });
      }

      const appUrl = process.env.APP_URL || 'http://localhost:3000';

      try {
        const session = await stripeService.createCheckoutSession({
          userId,
          userEmail: user.email,
          package: {
            id: pkg.id,
            name: pkg.name,
            credits: pkg.credits,
            bonusCredits: pkg.bonusCredits,
            priceUsd: Number(pkg.priceUsd),
          },
          successUrl: `${appUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appUrl}/pricing?canceled=true`,
        });

        return reply.send({
          success: true,
          data: session,
        });
      } catch (error) {
        app.log.error({ error }, 'Checkout session creation failed');
        return reply.code(500).send({
          success: false,
          error: { code: 'CHECKOUT_ERROR', message: 'Failed to create checkout session' },
        });
      }
    }
  );

  /**
   * POST /api/payments/webhook
   * Stripe webhook handler
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

      let event;

      try {
        // Get raw body for signature verification
        const rawBody = (request as any).rawBody;
        if (!rawBody) {
          return reply.code(400).send({ error: 'Missing raw body' });
        }

        event = stripeService.constructWebhookEvent(rawBody, signature);
      } catch (err: any) {
        app.log.error({ error: err.message }, 'Webhook signature verification failed');
        return reply.code(400).send({ error: `Webhook Error: ${err.message}` });
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;

          // Extract metadata
          const userId = session.metadata?.userId;
          const packageId = session.metadata?.packageId;
          const totalCredits = parseInt(session.metadata?.totalCredits || '0');
          const credits = parseInt(session.metadata?.credits || '0');
          const bonus = parseInt(session.metadata?.bonus || '0');

          if (!userId || !packageId || totalCredits === 0) {
            app.log.error({ metadata: session.metadata }, 'Invalid session metadata');
            break;
          }

          app.log.info(`Payment successful for user ${userId}, package ${packageId}, credits ${totalCredits}`);

          try {
            // Add credits to user
            await prisma.$transaction(async (tx) => {
              // Update user credits
              await tx.user.update({
                where: { id: userId },
                data: {
                  credits: { increment: totalCredits },
                },
              });

              // Record transaction
              await tx.creditTransaction.create({
                data: {
                  userId,
                  amount: totalCredits,
                  type: 'purchase',
                  reason: `Purchased ${packageId} package (${credits} + ${bonus} bonus)`,
                  balanceAfter: 0, // Will be updated
                  metadata: {
                    packageId,
                    credits,
                    bonus,
                    stripeSessionId: session.id,
                    stripePaymentIntent: session.payment_intent,
                  },
                },
              });

              // Update balance after
              const user = await tx.user.findUnique({
                where: { id: userId },
                select: { credits: true },
              });

              await tx.creditTransaction.updateMany({
                where: {
                  userId,
                  metadata: {
                    path: ['stripeSessionId'],
                    equals: session.id,
                  },
                },
                data: {
                  balanceAfter: user?.credits || 0,
                },
              });
            });

            app.log.info(`Credits added successfully for user ${userId}`);
          } catch (dbError) {
            app.log.error({ error: dbError }, 'Failed to add credits');
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          app.log.warn({ paymentIntentId: paymentIntent.id }, 'Payment failed');
          break;
        }

        default:
          app.log.info(`Unhandled event type: ${event.type}`);
      }

      return reply.send({ received: true });
    }
  );

  /**
   * GET /api/payments/session/:sessionId
   * Get checkout session status
   */
  app.get(
    '/session/:sessionId',
    { preHandler: authenticate },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;

      try {
        const session = await stripeService.getCheckoutSession(sessionId);

        return reply.send({
          success: true,
          data: {
            status: session.status,
            paymentStatus: session.payment_status,
            customerEmail: session.customer_email,
            amountTotal: session.amount_total,
          },
        });
      } catch (error) {
        app.log.error({ error }, 'Failed to get session');
        return reply.code(404).send({
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
        });
      }
    }
  );
}
