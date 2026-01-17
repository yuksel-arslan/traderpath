// ===========================================
// Lemon Squeezy Payment Service
// ===========================================

import crypto from 'crypto';

const LEMON_SQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

// Get API key
const getApiKey = () => {
  const key = process.env.LEMON_SQUEEZY_API_KEY;
  if (!key) {
    throw new Error('LEMON_SQUEEZY_API_KEY is not configured');
  }
  return key;
};

// Get Store ID
const getStoreId = () => {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error('LEMON_SQUEEZY_STORE_ID is not configured');
  }
  return storeId;
};

// Package interface
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: number;
  lemonSqueezyVariantId?: string;
}

// Lemon Squeezy API request helper
async function lemonSqueezyRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
) {
  const response = await fetch(`${LEMON_SQUEEZY_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lemon Squeezy API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const lemonSqueezyService = {
  /**
   * Create a Lemon Squeezy Checkout session
   * Uses custom data to pass our package info since we're creating dynamic checkouts
   */
  async createCheckout(params: {
    userId: string;
    userEmail: string;
    userName?: string;
    package: CreditPackage;
    successUrl: string;
    cancelUrl?: string;
  }) {
    const { userId, userEmail, userName, package: pkg, successUrl, cancelUrl } = params;
    const storeId = getStoreId();
    const totalCredits = pkg.credits + pkg.bonusCredits;
    const priceInCents = Math.round(pkg.priceUsd * 100);

    // If package has a Lemon Squeezy variant ID, use it
    // Otherwise create a custom checkout with dynamic price
    const variantId = pkg.lemonSqueezyVariantId || process.env.LEMON_SQUEEZY_DEFAULT_VARIANT_ID;

    if (!variantId) {
      throw new Error('No variant ID configured. Please set LEMON_SQUEEZY_DEFAULT_VARIANT_ID or add lemonSqueezyVariantId to packages.');
    }

    const checkoutData = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            name: userName || userEmail.split('@')[0],
            custom: {
              user_id: userId,
              package_id: pkg.id,
              package_name: pkg.name,
              credits: String(pkg.credits),
              bonus_credits: String(pkg.bonusCredits),
              total_credits: String(totalCredits),
            },
          },
          checkout_options: {
            embed: false,
            media: false,
            button_color: '#7c3aed', // Purple color matching TraderPath theme
          },
          product_options: {
            name: pkg.name,
            description: `${totalCredits} credits for TraderPath analysis`,
            redirect_url: successUrl,
          },
          // Override price if different from variant
          custom_price: priceInCents,
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    };

    const result = await lemonSqueezyRequest('/checkouts', 'POST', checkoutData);

    return {
      checkoutId: result.data.id,
      url: result.data.attributes.url,
    };
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('LEMON_SQUEEZY_WEBHOOK_SECRET is not configured');
    }

    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payloadString).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  },

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: string | Buffer): {
    event: string;
    data: any;
    meta: {
      custom_data?: {
        user_id?: string;
        package_id?: string;
        credits?: string;
        bonus_credits?: string;
        total_credits?: string;
      };
    };
  } {
    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
    const parsed = JSON.parse(payloadString);

    return {
      event: parsed.meta?.event_name || '',
      data: parsed.data || {},
      meta: parsed.meta || {},
    };
  },

  /**
   * Get subscription/order details
   */
  async getOrder(orderId: string) {
    return lemonSqueezyRequest(`/orders/${orderId}`);
  },

  /**
   * Get store products (for syncing)
   */
  async getProducts() {
    const storeId = getStoreId();
    return lemonSqueezyRequest(`/products?filter[store_id]=${storeId}`);
  },

  /**
   * Get product variants (for syncing)
   */
  async getVariants(productId: string) {
    return lemonSqueezyRequest(`/variants?filter[product_id]=${productId}`);
  },
};
