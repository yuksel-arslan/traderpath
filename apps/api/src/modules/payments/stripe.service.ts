// ===========================================
// Stripe Payment Service
// Supports both one-time purchases and subscriptions
// ===========================================

import Stripe from 'stripe';
import {
  STRIPE_PRODUCTS,
  STRIPE_PRICES,
  SubscriptionTier,
  StripePriceConfig,
} from '../../config/subscription-tiers';

// Initialize Stripe (lazy - only when actually used)
let stripeClient: Stripe | null = null;

const getStripeClient = (): Stripe => {
  if (stripeClient) return stripeClient;

  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  stripeClient = new Stripe(key, {
    apiVersion: '2023-10-16',
  });
  return stripeClient;
};

// Package interface for dynamic packages from database
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: number;
}

// Subscription checkout params
interface SubscriptionCheckoutParams {
  userId: string;
  userEmail: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  interval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}

export const stripeService = {
  /**
   * Create a Stripe Checkout Session for credit purchase
   */
  async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    package: CreditPackage;
    successUrl: string;
    cancelUrl: string;
  }) {
    const pkg = params.package;
    const totalCredits = pkg.credits + pkg.bonusCredits;
    const priceInCents = Math.round(pkg.priceUsd * 100);

    const session = await getStripeClient().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: params.userEmail,
      client_reference_id: params.userId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pkg.name,
              description: `${totalCredits} credits for TradePath analysis`,
              images: ['https://traderpath.io/logo.png'],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: params.userId,
        packageId: pkg.id,
        credits: String(pkg.credits),
        bonus: String(pkg.bonusCredits),
        totalCredits: String(totalCredits),
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },

  /**
   * Verify webhook signature and return event
   */
  constructWebhookEvent(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    return getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
  },

  /**
   * Retrieve checkout session by ID
   */
  async getCheckoutSession(sessionId: string) {
    return getStripeClient().checkout.sessions.retrieve(sessionId);
  },

  /**
   * Get Stripe instance for advanced operations
   */
  getStripe() {
    return getStripeClient();
  },

  // ===========================================
  // SUBSCRIPTION METHODS
  // ===========================================

  /**
   * Create or get a Stripe customer
   */
  async getOrCreateCustomer(params: {
    email: string;
    userId: string;
    name?: string;
    existingCustomerId?: string;
  }): Promise<Stripe.Customer> {
    const stripe = getStripeClient();

    // If we have an existing customer ID, retrieve it
    if (params.existingCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(params.existingCustomerId);
        if (!customer.deleted) {
          return customer as Stripe.Customer;
        }
      } catch {
        // Customer doesn't exist, create new one
      }
    }

    // Check if customer already exists by email
    const existingCustomers = await stripe.customers.list({
      email: params.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    return stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        userId: params.userId,
      },
    });
  },

  /**
   * Create a Stripe Checkout Session for subscription
   */
  async createSubscriptionCheckout(params: SubscriptionCheckoutParams) {
    const stripe = getStripeClient();

    // Get or create customer
    const customer = await this.getOrCreateCustomer({
      email: params.userEmail,
      userId: params.userId,
      existingCustomerId: params.customerId,
    });

    // Find the price config for the tier and interval
    const priceConfig = STRIPE_PRICES.find(
      (p) => p.product === params.tier && p.interval === params.interval
    );

    if (!priceConfig) {
      throw new Error(`Price not found for tier ${params.tier} and interval ${params.interval}`);
    }

    // Get product config
    const productConfig = STRIPE_PRODUCTS[params.tier];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: priceConfig.currency,
            product_data: {
              name: productConfig.name,
              description: productConfig.description,
              metadata: {
                tier: productConfig.metadata.tier,
                credits_daily: String(productConfig.metadata.credits_daily),
              },
            },
            unit_amount: priceConfig.unitAmount,
            recurring: {
              interval: priceConfig.interval,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: params.userId,
        tier: params.tier,
        interval: params.interval,
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          tier: params.tier,
        },
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: true,
    });

    return {
      sessionId: session.id,
      url: session.url,
      customerId: customer.id,
    };
  },

  /**
   * Create a billing portal session for subscription management
   */
  async createPortalSession(params: { customerId: string; returnUrl: string }) {
    const stripe = getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    return {
      url: session.url,
    };
  },

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    const stripe = getStripeClient();

    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      return null;
    }
  },

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = getStripeClient();

    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  },

  /**
   * Resume a canceled subscription (before period ends)
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = getStripeClient();

    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  },

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  async changeSubscriptionPlan(params: {
    subscriptionId: string;
    newTier: Exclude<SubscriptionTier, 'free'>;
    newInterval: 'month' | 'year';
  }): Promise<Stripe.Subscription> {
    const stripe = getStripeClient();

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
    const currentItemId = subscription.items.data[0]?.id;

    if (!currentItemId) {
      throw new Error('Subscription has no items');
    }

    // Find new price config
    const newPriceConfig = STRIPE_PRICES.find(
      (p) => p.product === params.newTier && p.interval === params.newInterval
    );

    if (!newPriceConfig) {
      throw new Error(`Price not found for tier ${params.newTier} and interval ${params.newInterval}`);
    }

    // Get product config for metadata
    const productConfig = STRIPE_PRODUCTS[params.newTier];

    // Create a new price on the fly (since we're using price_data)
    const price = await stripe.prices.create({
      currency: newPriceConfig.currency,
      unit_amount: newPriceConfig.unitAmount,
      recurring: {
        interval: newPriceConfig.interval,
      },
      product_data: {
        name: productConfig.name,
        metadata: {
          tier: productConfig.metadata.tier,
          credits_daily: String(productConfig.metadata.credits_daily),
        },
      },
    });

    // Update subscription with new price
    return stripe.subscriptions.update(params.subscriptionId, {
      items: [
        {
          id: currentItemId,
          price: price.id,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        tier: params.newTier,
      },
    });
  },

  /**
   * Get customer's payment methods
   */
  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const stripe = getStripeClient();

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  },

  /**
   * Get customer's invoices
   */
  async getInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    const stripe = getStripeClient();

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  },
};
