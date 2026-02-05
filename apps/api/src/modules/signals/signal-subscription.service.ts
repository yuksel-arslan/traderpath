/**
 * Signal Subscription Service
 * Manages signal subscription lifecycle (create, update, cancel, resume)
 * Integrates with Stripe for payment processing
 */

import { prisma } from '../../core/database';
import { stripeService } from '../payments/stripe.service';
import { cache, cacheKeys } from '../../core/cache';
import type { SignalSubscriptionTier, SubscriptionStatus } from '@prisma/client';

// ===========================================
// TIER CONFIGURATION
// ===========================================

interface SignalTierConfig {
  name: string;
  price: { monthly: number; yearly?: number }; // in cents
  markets: string[];
  maxSignalsPerDay: number;
  deliveryChannels: {
    telegram: boolean;
    discord: boolean;
    email: boolean;
  };
}

export const SIGNAL_TIER_CONFIG: Record<
  Exclude<SignalSubscriptionTier, 'SIGNAL_FREE'>,
  SignalTierConfig
> = {
  SIGNAL_BASIC: {
    name: 'Basic Signals',
    price: { monthly: 900 }, // $9/mo
    markets: ['crypto'],
    maxSignalsPerDay: 10,
    deliveryChannels: {
      telegram: true,
      discord: false,
      email: false,
    },
  },
  SIGNAL_PRO: {
    name: 'Pro Signals',
    price: { monthly: 1900 }, // $19/mo
    markets: ['crypto', 'stocks', 'metals', 'bonds'],
    maxSignalsPerDay: 20,
    deliveryChannels: {
      telegram: true,
      discord: true,
      email: false,
    },
  },
  SIGNAL_PRO_YEARLY: {
    name: 'Pro Signals (Annual)',
    price: { yearly: 14900 }, // $149/yr
    markets: ['crypto', 'stocks', 'metals', 'bonds'],
    maxSignalsPerDay: 20,
    deliveryChannels: {
      telegram: true,
      discord: true,
      email: true,
    },
  },
};

// ===========================================
// SERVICE
// ===========================================

export const signalSubscriptionService = {
  /**
   * Get user's signal subscription status
   */
  async getUserSignalSubscription(userId: string) {
    // Try cache first
    const cacheKey = `signal-subscription:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let subscription = await prisma.signalSubscription.findUnique({
      where: { userId },
    });

    // Create free tier subscription if doesn't exist
    if (!subscription) {
      subscription = await prisma.signalSubscription.create({
        data: {
          userId,
          tier: 'SIGNAL_FREE',
          status: 'INACTIVE',
          enabledMarkets: [],
          maxSignalsPerDay: 0,
          telegramDelivery: false,
          discordDelivery: false,
          emailDelivery: false,
        },
      });
    }

    // Cache for 5 minutes
    await cache.setex(cacheKey, 300, JSON.stringify(subscription));

    return subscription;
  },

  /**
   * Check if user has active signal subscription
   */
  async hasActiveSignalSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSignalSubscription(userId);
    return subscription.status === 'ACTIVE' && subscription.tier !== 'SIGNAL_FREE';
  },

  /**
   * Check if user can receive signals for a specific market
   */
  async canReceiveSignals(userId: string, market?: string): Promise<boolean> {
    const subscription = await this.getUserSignalSubscription(userId);

    if (subscription.status !== 'ACTIVE' || subscription.tier === 'SIGNAL_FREE') {
      return false;
    }

    if (market) {
      return subscription.enabledMarkets.includes(market);
    }

    return true;
  },

  /**
   * Create Stripe checkout session for signal subscription
   */
  async createSignalCheckout(params: {
    userId: string;
    userEmail: string;
    tier: Exclude<SignalSubscriptionTier, 'SIGNAL_FREE'>;
    successUrl: string;
    cancelUrl: string;
  }) {
    const { userId, userEmail, tier, successUrl, cancelUrl } = params;

    // Get or create Stripe customer
    const subscription = await this.getUserSignalSubscription(userId);
    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripeService.createCustomer(userEmail, { userId });
      customerId = customer.id;

      await prisma.signalSubscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get price config
    const config = SIGNAL_TIER_CONFIG[tier];
    const isYearly = tier === 'SIGNAL_PRO_YEARLY';
    const priceAmount = isYearly ? config.price.yearly! : config.price.monthly;
    const interval = isYearly ? 'year' : 'month';

    // Create or get Stripe price
    const priceId = await this.getOrCreateStripePrice(tier, priceAmount, interval);

    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata: {
        userId,
        tier,
        subscriptionType: 'signal',
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },

  /**
   * Get or create Stripe price for signal tier
   */
  async getOrCreateStripePrice(
    tier: Exclude<SignalSubscriptionTier, 'SIGNAL_FREE'>,
    amount: number,
    interval: 'month' | 'year'
  ): Promise<string> {
    const config = SIGNAL_TIER_CONFIG[tier];

    // Try to find existing price in Stripe
    const productName = `TraderPath ${config.name}`;
    // For now, create new price each time
    // TODO: Store price IDs in database or config

    const price = await stripeService.createPrice({
      productName,
      unitAmount: amount,
      currency: 'usd',
      interval,
      metadata: { tier },
    });

    return price.id;
  },

  /**
   * Handle Stripe webhook for signal subscription
   */
  async handleSignalSubscriptionWebhook(
    stripeSubscription: any,
    customerId: string
  ): Promise<void> {
    // Find user by Stripe customer ID
    const subscription = await prisma.signalSubscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!subscription) {
      console.warn(`No signal subscription found for customer ${customerId}`);
      return;
    }

    const { userId } = subscription;
    const tier = (stripeSubscription.metadata.tier || 'SIGNAL_BASIC') as SignalSubscriptionTier;
    const config = SIGNAL_TIER_CONFIG[tier] || SIGNAL_TIER_CONFIG.SIGNAL_BASIC;

    // Map Stripe status to our status
    let status: SubscriptionStatus = 'INACTIVE';
    switch (stripeSubscription.status) {
      case 'active':
        status = 'ACTIVE';
        break;
      case 'past_due':
        status = 'PAST_DUE';
        break;
      case 'canceled':
        status = 'CANCELED';
        break;
      case 'unpaid':
        status = 'UNPAID';
        break;
      case 'trialing':
        status = 'TRIALING';
        break;
    }

    // Update subscription
    await prisma.signalSubscription.update({
      where: { userId },
      data: {
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price?.id,
        tier,
        status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        enabledMarkets: config.markets,
        maxSignalsPerDay: config.maxSignalsPerDay,
        telegramDelivery: config.deliveryChannels.telegram,
        discordDelivery: config.deliveryChannels.discord,
        emailDelivery: config.deliveryChannels.email,
      },
    });

    // Invalidate cache
    await cache.del(`signal-subscription:${userId}`);
  },

  /**
   * Handle subscription deleted (downgrade to free)
   */
  async handleSignalSubscriptionDeleted(
    stripeSubscription: any,
    customerId: string
  ): Promise<void> {
    const subscription = await prisma.signalSubscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!subscription) return;

    const { userId } = subscription;

    // Downgrade to free tier
    await prisma.signalSubscription.update({
      where: { userId },
      data: {
        tier: 'SIGNAL_FREE',
        status: 'INACTIVE',
        stripePriceId: null,
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        enabledMarkets: [],
        maxSignalsPerDay: 0,
        telegramDelivery: false,
        discordDelivery: false,
        emailDelivery: false,
      },
    });

    // Invalidate cache
    await cache.del(`signal-subscription:${userId}`);
  },

  /**
   * Cancel signal subscription
   */
  async cancelSignalSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.getUserSignalSubscription(userId);

    if (!subscription.stripeSubscriptionId) {
      return { success: false, message: 'No active signal subscription found' };
    }

    try {
      await stripeService.cancelSubscription(subscription.stripeSubscriptionId);

      // Update local record
      await prisma.signalSubscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
          status: 'CANCELED',
        },
      });

      // Invalidate cache
      await cache.del(`signal-subscription:${userId}`);

      return {
        success: true,
        message: 'Signal subscription will be canceled at the end of the billing period',
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to cancel subscription' };
    }
  },

  /**
   * Resume a canceled signal subscription
   */
  async resumeSignalSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.getUserSignalSubscription(userId);

    if (!subscription.stripeSubscriptionId) {
      return { success: false, message: 'No subscription found' };
    }

    if (!subscription.cancelAtPeriodEnd) {
      return { success: false, message: 'Subscription is not set to cancel' };
    }

    try {
      await stripeService.resumeSubscription(subscription.stripeSubscriptionId);

      // Update local record
      await prisma.signalSubscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: false,
          status: 'ACTIVE',
        },
      });

      // Invalidate cache
      await cache.del(`signal-subscription:${userId}`);

      return { success: true, message: 'Signal subscription resumed successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to resume subscription' };
    }
  },

  /**
   * Create billing portal session
   */
  async createSignalPortalSession(userId: string, returnUrl: string) {
    const subscription = await this.getUserSignalSubscription(userId);

    if (!subscription.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    return await stripeService.createPortalSession(subscription.stripeCustomerId, returnUrl);
  },
};
