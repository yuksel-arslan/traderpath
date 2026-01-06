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

// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    bonus: 0,
    price: 799, // in cents
    priceDisplay: '$7.99',
    perCredit: '$0.16',
    stripePriceId: '', // Will be created in Stripe Dashboard
  },
  {
    id: 'trader',
    name: 'Trader Pack',
    credits: 150,
    bonus: 15,
    price: 1999, // in cents
    priceDisplay: '$19.99',
    perCredit: '$0.12',
    popular: true,
    stripePriceId: '',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 400,
    bonus: 60,
    price: 4499, // in cents
    priceDisplay: '$44.99',
    perCredit: '$0.10',
    stripePriceId: '',
  },
  {
    id: 'whale',
    name: 'Whale Pack',
    credits: 1000,
    bonus: 200,
    price: 8999, // in cents
    priceDisplay: '$89.99',
    perCredit: '$0.08',
    stripePriceId: '',
  },
];

export const stripeService = {
  /**
   * Create a Stripe Checkout Session for credit purchase
   */
  async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    packageId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === params.packageId);
    if (!pkg) {
      throw new Error('Invalid package');
    }

    const totalCredits = pkg.credits + pkg.bonus;

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
              images: ['https://tradepath.app/logo.png'], // Update with real logo
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: params.userId,
        packageId: params.packageId,
        credits: String(pkg.credits),
        bonus: String(pkg.bonus),
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
