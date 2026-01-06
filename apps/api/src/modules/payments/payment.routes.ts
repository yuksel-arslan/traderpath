// ===========================================
// Payment Routes
// Stripe Checkout & Webhooks
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { stripeService, CREDIT_PACKAGES } from './stripe.service';
import { authenticate } from '../../core/auth/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function paymentRoutes(app: FastifyInstance) {
  /**
   * GET /api/payments/packages
   * Get available credit packages
   */
  app.get('/packages', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Return packages without sensitive data
    const packages = CREDIT_PACKAGES.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      bonus: pkg.bonus,
      price: pkg.priceDisplay,
      perCredit: pkg.perCredit,
      popular: pkg.popular || false,
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
    packageId: z.enum(['starter', 'trader', 'pro', 'whale']),
  });

  app.post(
    '/create-checkout-session',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const body = checkoutSchema.parse(request.body);

      // Get user email
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

      const appUrl = process.env.APP_URL || 'http://localhost:3000';

      try {
        const session = await stripeService.createCheckoutSession({
          userId,
          userEmail: user.email,
          packageId: body.packageId,
          successUrl: `${appUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appUrl}/credits?canceled=true`,
        });

        return reply.send({
          success: true,
          data: session,
        });
      } catch (error) {
        app.log.error('Checkout session creation failed:', error);
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
        app.log.error('Webhook signature verification failed:', err.message);
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
            app.log.error('Invalid session metadata:', session.metadata);
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
            app.log.error('Failed to add credits:', dbError);
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          app.log.warn('Payment failed:', paymentIntent.id);
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
        app.log.error('Failed to get session:', error);
        return reply.code(404).send({
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
        });
      }
    }
  );
}
