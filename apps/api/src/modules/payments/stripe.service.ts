// ===========================================
// Stripe Payment Service
// ===========================================

import Stripe from 'stripe';

// Initialize Stripe (lazy - only when actually used)
const getStripeClient = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key, {
    apiVersion: '2023-10-16',
  });
};

// Package interface for dynamic packages from database
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: number;
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
              images: ['https://tradepath.app/logo.png'],
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
};
