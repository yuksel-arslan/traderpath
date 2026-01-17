// ===========================================
// Payment Routes
// Lemon Squeezy Checkout & Webhooks
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { lemonSqueezyService } from './lemonSqueezy.service';
import { authenticate } from '../../core/auth/middleware';
import { prisma } from '../../core/database';
import { cache, cacheKeys } from '../../core/cache';

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

    // Format packages for frontend - calculate perCredit dynamically
    const packages = dbPackages.map((pkg) => {
      const totalCredits = pkg.credits + pkg.bonusCredits;
      const perCreditCost = Number(pkg.priceUsd) / totalCredits;
      return {
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        bonus: pkg.bonusCredits,
        price: `$${Number(pkg.priceUsd).toFixed(2)}`,
        perCredit: `$${perCreditCost.toFixed(2)}`,
        popular: pkg.isPopular,
      };
    });

    return reply.send({
      success: true,
      data: { packages },
    });
  });

  /**
   * POST /api/payments/create-checkout-session
   * Create Lemon Squeezy checkout session
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
          select: { email: true, name: true },
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
        const checkout = await lemonSqueezyService.createCheckout({
          userId,
          userEmail: user.email,
          userName: user.name || undefined,
          package: {
            id: pkg.id,
            name: pkg.name,
            credits: pkg.credits,
            bonusCredits: pkg.bonusCredits,
            priceUsd: Number(pkg.priceUsd),
          },
          successUrl: `${appUrl}/pricing/success?checkout_id={checkout_id}`,
          cancelUrl: `${appUrl}/pricing?canceled=true`,
        });

        return reply.send({
          success: true,
          data: {
            checkoutId: checkout.checkoutId,
            url: checkout.url,
          },
        });
      } catch (error: any) {
        app.log.error({ error: error.message }, 'Checkout session creation failed');
        return reply.code(500).send({
          success: false,
          error: { code: 'CHECKOUT_ERROR', message: 'Failed to create checkout session' },
        });
      }
    }
  );

  /**
   * POST /api/payments/webhook
   * Lemon Squeezy webhook handler
   */
  app.post(
    '/webhook',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['x-signature'] as string;

      if (!signature) {
        return reply.code(400).send({ error: 'Missing x-signature header' });
      }

      // Get raw body for signature verification
      const rawBody = (request as any).rawBody;
      if (!rawBody) {
        return reply.code(400).send({ error: 'Missing raw body' });
      }

      // Verify signature
      try {
        const isValid = lemonSqueezyService.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          app.log.error('Webhook signature verification failed');
          return reply.code(400).send({ error: 'Invalid signature' });
        }
      } catch (err: any) {
        app.log.error({ error: err.message }, 'Webhook signature verification error');
        return reply.code(400).send({ error: `Webhook Error: ${err.message}` });
      }

      // Parse the webhook payload
      const { event, data, meta } = lemonSqueezyService.parseWebhookPayload(rawBody);

      app.log.info({ event }, 'Received Lemon Squeezy webhook');

      // Handle the event
      switch (event) {
        case 'order_created': {
          // Order created - payment successful
          const customData = meta.custom_data;

          if (!customData) {
            app.log.error('No custom data in webhook');
            break;
          }

          const userId = customData.user_id;
          const packageId = customData.package_id;
          const totalCredits = parseInt(customData.total_credits || '0');
          const credits = parseInt(customData.credits || '0');
          const bonusCredits = parseInt(customData.bonus_credits || '0');

          if (!userId || !packageId || totalCredits === 0) {
            app.log.error({ customData }, 'Invalid custom data in webhook');
            break;
          }

          const orderId = data.id;
          const orderAttributes = data.attributes || {};

          app.log.info(
            { userId, packageId, totalCredits, orderId },
            'Payment successful - adding credits'
          );

          try {
            // Add credits to user via creditBalance
            await prisma.$transaction(async (tx) => {
              // Update or create credit balance
              await tx.creditBalance.upsert({
                where: { userId },
                update: {
                  balance: { increment: totalCredits },
                  lifetimePurchased: { increment: totalCredits },
                },
                create: {
                  userId,
                  balance: totalCredits,
                  lifetimePurchased: totalCredits,
                },
              });

              // Get updated balance
              const creditBalance = await tx.creditBalance.findUnique({
                where: { userId },
                select: { balance: true },
              });

              // Record transaction
              await tx.creditTransaction.create({
                data: {
                  userId,
                  amount: totalCredits,
                  type: 'PURCHASE',
                  source: `package_${packageId}`,
                  balanceAfter: creditBalance?.balance || totalCredits,
                  metadata: {
                    packageId,
                    credits,
                    bonusCredits,
                    lemonSqueezyOrderId: orderId,
                    orderNumber: orderAttributes.order_number,
                    totalUsd: orderAttributes.total_usd,
                    currency: orderAttributes.currency,
                  },
                },
              });
            });

            // Invalidate credit cache
            await cache.del(cacheKeys.userCredits(userId));

            app.log.info({ userId, totalCredits }, 'Credits added successfully');
          } catch (dbError) {
            app.log.error({ error: dbError }, 'Failed to add credits');
          }
          break;
        }

        case 'order_refunded': {
          // Handle refunds - deduct credits
          const customData = meta.custom_data;

          if (!customData?.user_id || !customData?.total_credits) {
            app.log.warn('Refund webhook missing custom data');
            break;
          }

          const userId = customData.user_id;
          const totalCredits = parseInt(customData.total_credits || '0');

          app.log.info({ userId, totalCredits }, 'Processing refund - deducting credits');

          try {
            await prisma.$transaction(async (tx) => {
              // Deduct credits
              await tx.creditBalance.update({
                where: { userId },
                data: {
                  balance: { decrement: totalCredits },
                  lifetimePurchased: { decrement: totalCredits },
                },
              });

              // Get updated balance
              const creditBalance = await tx.creditBalance.findUnique({
                where: { userId },
                select: { balance: true },
              });

              // Record refund transaction
              await tx.creditTransaction.create({
                data: {
                  userId,
                  amount: -totalCredits,
                  type: 'REFUND',
                  source: 'lemon_squeezy_refund',
                  balanceAfter: creditBalance?.balance || 0,
                  metadata: {
                    orderId: data.id,
                    reason: 'Order refunded',
                  },
                },
              });
            });

            // Invalidate credit cache
            await cache.del(cacheKeys.userCredits(userId));

            app.log.info({ userId }, 'Refund processed - credits deducted');
          } catch (dbError) {
            app.log.error({ error: dbError }, 'Failed to process refund');
          }
          break;
        }

        default:
          app.log.info({ event }, 'Unhandled Lemon Squeezy event');
      }

      return reply.send({ received: true });
    }
  );

  /**
   * GET /api/payments/verify/:checkoutId
   * Verify checkout status (for success page)
   */
  app.get(
    '/verify/:checkoutId',
    { preHandler: authenticate },
    async (request: FastifyRequest<{ Params: { checkoutId: string } }>, reply: FastifyReply) => {
      const userId = request.user!.id;

      // Check if user received credits recently (webhook might have processed)
      const recentTransaction = await prisma.creditTransaction.findFirst({
        where: {
          userId,
          type: 'PURCHASE',
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentTransaction) {
        return reply.send({
          success: true,
          data: {
            status: 'completed',
            creditsAdded: recentTransaction.amount,
            message: 'Payment successful! Credits have been added to your account.',
          },
        });
      }

      // If no recent transaction, payment might still be processing
      return reply.send({
        success: true,
        data: {
          status: 'pending',
          message: 'Payment is being processed. Credits will be added shortly.',
        },
      });
    }
  );
}
