/**
 * Weekly Plan Service
 * Manages weekly subscription plans (Report + Analysis)
 * Integrates with Stripe for recurring weekly billing
 */

import { prisma } from '../../core/database';
import { stripeService } from '../payments/stripe.service';
import { cache } from '../../core/cache';
import { WEEKLY_PLAN_CONFIG, type WeeklyPlanType } from '../../config/weekly-plans';
import type { SubscriptionStatus } from '@prisma/client';

const CACHE_TTL = 300; // 5 minutes

function getCacheKey(userId: string, planType: WeeklyPlanType): string {
  return `weekly-plan:${userId}:${planType}`;
}

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

export const weeklyPlanService = {
  /**
   * Get user's weekly plan by type
   */
  async getUserPlan(userId: string, planType: WeeklyPlanType) {
    const cacheKey = getCacheKey(userId, planType);
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(typeof cached === 'string' ? cached : JSON.stringify(cached));
    }

    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_planType: { userId, planType },
      },
    });

    if (plan) {
      await cache.set(cacheKey, JSON.stringify(plan), CACHE_TTL);
    }

    return plan;
  },

  /**
   * Get all weekly plans for a user
   */
  async getUserPlans(userId: string) {
    const plans = await prisma.weeklyPlan.findMany({
      where: { userId },
    });
    return plans;
  },

  /**
   * Check if user has an active weekly plan of the given type
   */
  async hasActivePlan(userId: string, planType: WeeklyPlanType): Promise<boolean> {
    const plan = await this.getUserPlan(userId, planType);
    return plan?.status === 'ACTIVE';
  },

  /**
   * Check if user has remaining quota for a plan
   */
  async hasQuota(userId: string, planType: WeeklyPlanType): Promise<boolean> {
    const plan = await this.getUserPlan(userId, planType);
    if (!plan || plan.status !== 'ACTIVE') return false;
    return plan.remainingQuota > 0;
  },

  /**
   * Consume one unit of quota (1 report or 1 analysis)
   */
  async consumeQuota(userId: string, planType: WeeklyPlanType): Promise<{ success: boolean; remaining: number }> {
    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_planType: { userId, planType },
      },
    });

    if (!plan || plan.status !== 'ACTIVE' || plan.remainingQuota <= 0) {
      return { success: false, remaining: plan?.remainingQuota ?? 0 };
    }

    const updated = await prisma.weeklyPlan.update({
      where: {
        userId_planType: { userId, planType },
      },
      data: {
        remainingQuota: { decrement: 1 },
        quotaUsedThisPeriod: { increment: 1 },
      },
    });

    // Invalidate cache
    await cache.del(getCacheKey(userId, planType));

    return { success: true, remaining: updated.remainingQuota };
  },

  /**
   * Create Stripe checkout session for a weekly plan
   */
  async createCheckout(params: {
    userId: string;
    userEmail: string;
    planType: WeeklyPlanType;
    successUrl: string;
    cancelUrl: string;
  }) {
    const { userId, userEmail, planType, successUrl, cancelUrl } = params;
    const config = WEEKLY_PLAN_CONFIG[planType];

    // Check if user already has this plan type active
    const existingPlan = await this.getUserPlan(userId, planType);
    if (existingPlan?.status === 'ACTIVE') {
      throw new Error('You already have an active subscription for this plan type');
    }

    // Get or create Stripe customer
    let customerId = existingPlan?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.getOrCreateCustomer({ email: userEmail, userId });
      customerId = customer.id;
    }

    // Get or create Stripe price for weekly billing
    const priceId = await this.getOrCreateStripePrice(planType);

    // Create checkout session
    const stripe = stripeService.getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planType,
        subscriptionType: 'weekly_plan',
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },

  /**
   * Get or create Stripe price for weekly plan
   */
  async getOrCreateStripePrice(planType: WeeklyPlanType): Promise<string> {
    const config = WEEKLY_PLAN_CONFIG[planType];
    const cacheKey = `weekly-plan-price:${planType}`;

    const cachedPriceId = await cache.get<string>(cacheKey);
    if (cachedPriceId) {
      return cachedPriceId as string;
    }

    const stripe = stripeService.getStripe();
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: config.price,
      recurring: { interval: config.interval },
      product_data: {
        name: `TraderPath ${config.name}`,
        description: config.description,
        metadata: { planType },
      },
    });

    // Cache for 30 days
    await cache.set(cacheKey, price.id, 30 * 24 * 60 * 60);

    return price.id;
  },

  /**
   * Handle Stripe webhook for weekly plan subscription
   */
  async handleWebhook(
    stripeSubscription: any,
    customerId: string
  ): Promise<void> {
    const planType = stripeSubscription.metadata.planType as WeeklyPlanType;
    const userId = stripeSubscription.metadata.userId;

    if (!userId || !planType) {
      console.warn('[WeeklyPlan] Missing userId or planType in subscription metadata');
      return;
    }

    const config = WEEKLY_PLAN_CONFIG[planType];
    const status = mapStripeStatus(stripeSubscription.status);

    await prisma.weeklyPlan.upsert({
      where: {
        userId_planType: { userId, planType },
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price?.id,
        status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      create: {
        userId,
        planType,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price?.id,
        status,
        remainingQuota: config.quota,
        totalQuota: config.quota,
        quotaUsedThisPeriod: 0,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    // Invalidate cache
    await cache.del(getCacheKey(userId, planType));
  },

  /**
   * Handle subscription renewal - reset quota
   */
  async handleRenewal(userId: string, planType: WeeklyPlanType): Promise<void> {
    const config = WEEKLY_PLAN_CONFIG[planType];

    await prisma.weeklyPlan.update({
      where: {
        userId_planType: { userId, planType },
      },
      data: {
        remainingQuota: config.quota,
        quotaUsedThisPeriod: 0,
      },
    });

    // Invalidate cache
    await cache.del(getCacheKey(userId, planType));
  },

  /**
   * Handle subscription deleted (canceled)
   */
  async handleDeleted(
    stripeSubscription: any,
    customerId: string
  ): Promise<void> {
    const planType = stripeSubscription.metadata.planType as WeeklyPlanType;
    const userId = stripeSubscription.metadata.userId;

    if (!userId || !planType) return;

    await prisma.weeklyPlan.update({
      where: {
        userId_planType: { userId, planType },
      },
      data: {
        status: 'INACTIVE',
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
        remainingQuota: 0,
      },
    });

    // Invalidate cache
    await cache.del(getCacheKey(userId, planType));
  },

  /**
   * Cancel weekly plan
   */
  async cancelPlan(userId: string, planType: WeeklyPlanType): Promise<{ success: boolean; message: string }> {
    const plan = await this.getUserPlan(userId, planType);

    if (!plan?.stripeSubscriptionId) {
      return { success: false, message: 'No active subscription found' };
    }

    try {
      await stripeService.cancelSubscription(plan.stripeSubscriptionId);

      await prisma.weeklyPlan.update({
        where: {
          userId_planType: { userId, planType },
        },
        data: {
          cancelAtPeriodEnd: true,
        },
      });

      await cache.del(getCacheKey(userId, planType));

      return {
        success: true,
        message: 'Subscription will be canceled at the end of the billing period',
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to cancel subscription' };
    }
  },

  /**
   * Resume a canceled weekly plan
   */
  async resumePlan(userId: string, planType: WeeklyPlanType): Promise<{ success: boolean; message: string }> {
    const plan = await this.getUserPlan(userId, planType);

    if (!plan?.stripeSubscriptionId) {
      return { success: false, message: 'No subscription found' };
    }

    if (!plan.cancelAtPeriodEnd) {
      return { success: false, message: 'Subscription is not set to cancel' };
    }

    try {
      await stripeService.resumeSubscription(plan.stripeSubscriptionId);

      await prisma.weeklyPlan.update({
        where: {
          userId_planType: { userId, planType },
        },
        data: {
          cancelAtPeriodEnd: false,
          status: 'ACTIVE',
        },
      });

      await cache.del(getCacheKey(userId, planType));

      return { success: true, message: 'Subscription resumed successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to resume subscription' };
    }
  },
};
