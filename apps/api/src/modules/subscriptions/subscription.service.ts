// ===========================================
// Subscription Management Service
// Handles business logic for tiered subscriptions
// ===========================================

import { prisma } from '../../core/database';
import { cache, cacheKeys } from '../../core/cache';
import { logger } from '../../core/logger';
import { stripeService } from '../payments/stripe.service';
import {
  SubscriptionTier,
  getTierConfig,
  hasFeature,
  checkLimit,
  TierConfig,
} from '../../config/subscription-tiers';
import type { SubscriptionStatus } from '@prisma/client';
import type Stripe from 'stripe';

// Cache TTL: 5 minutes for subscription status
const SUBSCRIPTION_CACHE_TTL = 300;

// Map Stripe status to our status
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'unpaid':
      return 'UNPAID';
    case 'trialing':
      return 'TRIALING';
    default:
      return 'INACTIVE';
  }
}

// Map tier string to enum
function mapTierToEnum(tier: string): SubscriptionTier {
  const tierMap: Record<string, SubscriptionTier> = {
    starter: 'starter',
    pro: 'pro',
    elite: 'elite',
    free: 'free',
  };
  return tierMap[tier.toLowerCase()] || 'free';
}

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  config: TierConfig;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export const subscriptionService = {
  /**
   * Get user's current subscription status
   */
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    // Check cache first
    const cacheKey = `subscription:${userId}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(typeof cached === 'string' ? cached : JSON.stringify(cached));
    }

    // Get from database
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // Default to free tier if no subscription
    if (!subscription) {
      const result: UserSubscription = {
        tier: 'free',
        status: 'INACTIVE',
        config: getTierConfig('free'),
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };

      await cache.set(cacheKey, JSON.stringify(result), SUBSCRIPTION_CACHE_TTL);
      return result;
    }

    // Map database tier to our tier type
    const tier = mapTierToEnum(subscription.tier);

    const result: UserSubscription = {
      tier,
      status: subscription.status,
      config: getTierConfig(tier),
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    };

    await cache.set(cacheKey, JSON.stringify(result), SUBSCRIPTION_CACHE_TTL);
    return result;
  },

  /**
   * Check if user has access to a feature
   */
  async hasFeatureAccess(userId: string, feature: keyof TierConfig): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return hasFeature(subscription.tier, feature);
  },

  /**
   * Check if user is within their usage limit for a feature
   */
  async checkFeatureLimit(
    userId: string,
    feature: keyof TierConfig,
    currentUsage: number
  ): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return checkLimit(subscription.tier, feature, currentUsage);
  },

  /**
   * Get daily credit allocation for user's tier
   */
  async getDailyCredits(userId: string): Promise<number> {
    const subscription = await this.getUserSubscription(userId);
    return subscription.config.dailyCredits;
  },

  /**
   * Create or update subscription from Stripe webhook
   */
  async handleSubscriptionWebhook(
    stripeSubscription: Stripe.Subscription,
    customerId: string
  ): Promise<void> {
    // Get user ID from metadata
    const userId = stripeSubscription.metadata.userId;
    if (!userId) {
      throw new Error('No userId in subscription metadata');
    }

    // Get tier from metadata
    const tierStr = stripeSubscription.metadata.tier || 'free';
    const tier = tierStr.toUpperCase() as 'FREE' | 'STARTER' | 'PRO' | 'ELITE';

    // Map status
    const status = mapStripeStatus(stripeSubscription.status);

    // Upsert subscription
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price?.id || null,
        tier,
        status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price?.id || null,
        tier,
        status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    // Invalidate cache
    await cache.del(`subscription:${userId}`);

    // If subscription became active, allocate credits for the day
    if (status === 'ACTIVE') {
      await this.allocateDailyCredits(userId, tier);
    }
  },

  /**
   * Handle subscription deleted webhook
   */
  async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription,
    customerId: string
  ): Promise<void> {
    const userId = stripeSubscription.metadata.userId;
    if (!userId) return;

    // Update to free tier
    await prisma.subscription.update({
      where: { userId },
      data: {
        tier: 'FREE',
        status: 'INACTIVE',
        stripePriceId: null,
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
      },
    });

    // Invalidate cache
    await cache.del(`subscription:${userId}`);
  },

  /**
   * Allocate daily credits based on subscription tier
   * Called when subscription becomes active or at daily reset
   */
  async allocateDailyCredits(
    userId: string,
    tier: 'FREE' | 'STARTER' | 'PRO' | 'ELITE'
  ): Promise<void> {
    const tierLower = tier.toLowerCase() as SubscriptionTier;
    const config = getTierConfig(tierLower);
    const dailyCredits = config.dailyCredits;

    // Check if user already received credits today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingTransaction = await prisma.creditTransaction.findFirst({
      where: {
        userId,
        type: 'REWARD',
        source: 'subscription_daily_credits',
        createdAt: {
          gte: today,
        },
      },
    });

    if (existingTransaction) {
      // Already received credits today
      return;
    }

    // Add credits
    await prisma.$transaction(async (tx) => {
      // Update or create credit balance
      const balance = await tx.creditBalance.upsert({
        where: { userId },
        update: {
          balance: { increment: dailyCredits },
          lifetimeEarned: { increment: dailyCredits },
        },
        create: {
          userId,
          balance: dailyCredits,
          lifetimeEarned: dailyCredits,
        },
      });

      // Record transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: dailyCredits,
          balanceAfter: balance.balance,
          type: 'REWARD',
          source: 'subscription_daily_credits',
          metadata: {
            tier,
            date: today.toISOString().split('T')[0],
          },
        },
      });
    });

    // Invalidate credit cache
    await cache.del(cacheKeys.userCredits(userId));
  },

  /**
   * Process daily credit allocation for all active subscribers
   * Should be called by a cron job at midnight UTC
   */
  async processDailyCreditsForAllSubscribers(): Promise<number> {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        tier: {
          not: 'FREE',
        },
      },
      select: {
        userId: true,
        tier: true,
      },
    });

    let processed = 0;
    for (const sub of activeSubscriptions) {
      try {
        await this.allocateDailyCredits(sub.userId, sub.tier);
        processed++;
      } catch (error) {
        logger.error({ userId: sub.userId, error }, 'Failed to allocate daily credits for subscriber');
      }
    }

    return processed;
  },

  /**
   * Cancel user's subscription
   */
  async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription.stripeSubscriptionId) {
      return { success: false, message: 'No active subscription found' };
    }

    try {
      await stripeService.cancelSubscription(subscription.stripeSubscriptionId);

      // Update local record — keep ACTIVE, Stripe webhook will update status at period end
      await prisma.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });

      // Invalidate cache
      await cache.del(`subscription:${userId}`);

      return {
        success: true,
        message: 'Subscription will be canceled at the end of the billing period',
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to cancel subscription' };
    }
  },

  /**
   * Resume a canceled subscription (before period ends)
   */
  async resumeSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription.stripeSubscriptionId) {
      return { success: false, message: 'No subscription found' };
    }

    if (!subscription.cancelAtPeriodEnd) {
      return { success: false, message: 'Subscription is not set to cancel' };
    }

    try {
      await stripeService.resumeSubscription(subscription.stripeSubscriptionId);

      // Update local record
      await prisma.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: false,
          status: 'ACTIVE',
        },
      });

      // Invalidate cache
      await cache.del(`subscription:${userId}`);

      return { success: true, message: 'Subscription resumed successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to resume subscription' };
    }
  },

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    tier: 'starter' | 'pro' | 'elite';
    interval: 'month' | 'year';
    successUrl: string;
    cancelUrl: string;
  }) {
    // Get existing customer ID if available
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: params.userId },
      select: { stripeCustomerId: true },
    });

    return stripeService.createSubscriptionCheckout({
      ...params,
      customerId: existingSubscription?.stripeCustomerId || undefined,
    });
  },

  /**
   * Create billing portal session
   */
  async createPortalSession(userId: string, returnUrl: string) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription.stripeCustomerId) {
      throw new Error('No Stripe customer found for this user');
    }

    return stripeService.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
    });
  },
};
