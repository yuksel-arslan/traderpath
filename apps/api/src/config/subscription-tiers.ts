/**
 * TraderPath Subscription Tiers Configuration
 *
 * This file defines the subscription tiers, features, and limits
 * for the TraderPath billing system.
 *
 * @see /docs/SUBSCRIPTION_PRICING.md for full documentation
 */

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'elite';

export interface TierConfig {
  // Credit allocation
  dailyCredits: number;

  // Feature access
  capitalFlowL3: boolean;
  capitalFlowL4: boolean;
  mlisProAccess: boolean;
  aiConcierge: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  earlyFeatures: boolean;

  // Limits (-1 = unlimited)
  maxScheduledReports: number;
  maxAlerts: number;
  monthlyAiExpertQuestions: number;
  monthlyEmailReports: number;
  monthlyPdfReports: number;
}

export interface StripeProductConfig {
  name: string;
  description: string;
  metadata: {
    tier: SubscriptionTier;
    credits_daily: number;
  };
}

export interface StripePriceConfig {
  product: SubscriptionTier;
  unitAmount: number; // in cents
  currency: string;
  interval: 'month' | 'year';
}

export interface CreditPackageConfig {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  perCreditCost: number; // for display
  popular?: boolean;
}

// =============================================================================
// TIER CONFIGURATIONS
// =============================================================================

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    dailyCredits: 10,
    capitalFlowL3: false,
    capitalFlowL4: false,
    mlisProAccess: false,
    aiConcierge: false,
    apiAccess: false,
    prioritySupport: false,
    earlyFeatures: false,
    maxScheduledReports: 0,
    maxAlerts: 3,
    monthlyAiExpertQuestions: 0,
    monthlyEmailReports: 0,
    monthlyPdfReports: 0,
  },

  starter: {
    dailyCredits: 100,
    capitalFlowL3: true,
    capitalFlowL4: true,
    mlisProAccess: true,
    aiConcierge: true,
    apiAccess: false,
    prioritySupport: false,
    earlyFeatures: false,
    maxScheduledReports: 3,
    maxAlerts: 10,
    monthlyAiExpertQuestions: 10,
    monthlyEmailReports: 10,
    monthlyPdfReports: 10,
  },

  pro: {
    dailyCredits: 250,
    capitalFlowL3: true,
    capitalFlowL4: true,
    mlisProAccess: true,
    aiConcierge: true,
    apiAccess: false,
    prioritySupport: true,
    earlyFeatures: false,
    maxScheduledReports: 10,
    maxAlerts: 50,
    monthlyAiExpertQuestions: 50,
    monthlyEmailReports: 50,
    monthlyPdfReports: 50,
  },

  elite: {
    dailyCredits: 500,
    capitalFlowL3: true,
    capitalFlowL4: true,
    mlisProAccess: true,
    aiConcierge: true,
    apiAccess: true,
    prioritySupport: true,
    earlyFeatures: true,
    maxScheduledReports: -1, // Unlimited
    maxAlerts: -1,
    monthlyAiExpertQuestions: -1,
    monthlyEmailReports: -1,
    monthlyPdfReports: -1,
  },
};

// =============================================================================
// STRIPE PRODUCTS
// =============================================================================

export const STRIPE_PRODUCTS: Record<Exclude<SubscriptionTier, 'free'>, StripeProductConfig> = {
  starter: {
    name: 'TraderPath Starter',
    description: 'Perfect for casual traders. 100 credits/day, Capital Flow access, AI analysis.',
    metadata: {
      tier: 'starter',
      credits_daily: 100,
    },
  },

  pro: {
    name: 'TraderPath Pro',
    description: 'For active traders. 250 credits/day, priority support, advanced features.',
    metadata: {
      tier: 'pro',
      credits_daily: 250,
    },
  },

  elite: {
    name: 'TraderPath Elite',
    description: 'For professional traders. 500 credits/day, API access, early features.',
    metadata: {
      tier: 'elite',
      credits_daily: 500,
    },
  },
};

// =============================================================================
// STRIPE PRICES (in cents)
// =============================================================================

export const STRIPE_PRICES: StripePriceConfig[] = [
  // Starter
  { product: 'starter', unitAmount: 2900, currency: 'usd', interval: 'month' },
  { product: 'starter', unitAmount: 29000, currency: 'usd', interval: 'year' },

  // Pro
  { product: 'pro', unitAmount: 5900, currency: 'usd', interval: 'month' },
  { product: 'pro', unitAmount: 59000, currency: 'usd', interval: 'year' },

  // Elite
  { product: 'elite', unitAmount: 9900, currency: 'usd', interval: 'month' },
  { product: 'elite', unitAmount: 99000, currency: 'usd', interval: 'year' },
];

// =============================================================================
// CREDIT PACKAGES (One-time purchase)
// =============================================================================

export const CREDIT_PACKAGES: CreditPackageConfig[] = [
  {
    id: 'micro',
    name: 'Micro Pack',
    credits: 100,
    price: 900, // $9
    perCreditCost: 0.09,
  },
  {
    id: 'small',
    name: 'Small Pack',
    credits: 300,
    price: 2400, // $24
    perCreditCost: 0.08,
  },
  {
    id: 'medium',
    name: 'Medium Pack',
    credits: 750,
    price: 5200, // $52
    perCreditCost: 0.07,
    popular: true,
  },
  {
    id: 'large',
    name: 'Large Pack',
    credits: 2000,
    price: 12000, // $120
    perCreditCost: 0.06,
  },
];

// =============================================================================
// SERVICE CREDIT COSTS
// =============================================================================

export const SERVICE_CREDITS = {
  SEVEN_STEP_ANALYSIS: 25,
  MLIS_PRO_ANALYSIS: 25,
  AI_EXPERT_QUESTION: 5,
  EMAIL_REPORT: 5,
  PDF_REPORT: 5,
  PRICE_ALERT: 1,

  // Free allocations per analysis
  FREE_AI_EXPERT_QUESTIONS_PER_ANALYSIS: 3,
  FREE_EMAIL_REPORTS_PER_ANALYSIS: 2,
  FREE_PDF_REPORTS_PER_ANALYSIS: 2,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tier configuration by tier name
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIG[tier] || TIER_CONFIG.free;
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof TierConfig): boolean {
  const config = getTierConfig(tier);
  const value = config[feature];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return false;
}

/**
 * Check if user has reached limit for a feature
 * Returns true if limit is NOT reached (can proceed)
 */
export function checkLimit(
  tier: SubscriptionTier,
  feature: keyof TierConfig,
  currentUsage: number
): boolean {
  const config = getTierConfig(tier);
  const limit = config[feature];

  if (typeof limit !== 'number') {
    return false;
  }

  // -1 means unlimited
  if (limit === -1) {
    return true;
  }

  return currentUsage < limit;
}

/**
 * Get the monthly price in dollars for a tier
 */
export function getMonthlyPrice(tier: Exclude<SubscriptionTier, 'free'>): number {
  const price = STRIPE_PRICES.find(p => p.product === tier && p.interval === 'month');
  return price ? price.unitAmount / 100 : 0;
}

/**
 * Get the yearly price in dollars for a tier
 */
export function getYearlyPrice(tier: Exclude<SubscriptionTier, 'free'>): number {
  const price = STRIPE_PRICES.find(p => p.product === tier && p.interval === 'year');
  return price ? price.unitAmount / 100 : 0;
}

/**
 * Calculate yearly savings percentage
 */
export function getYearlySavings(tier: Exclude<SubscriptionTier, 'free'>): number {
  const monthly = getMonthlyPrice(tier);
  const yearly = getYearlyPrice(tier);
  const monthlyTotal = monthly * 12;

  if (monthlyTotal === 0) return 0;

  return Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100);
}

/**
 * Get credit package by ID
 */
export function getCreditPackage(id: string): CreditPackageConfig | undefined {
  return CREDIT_PACKAGES.find(p => p.id === id);
}

/**
 * Get all tiers in order
 */
export function getAllTiers(): SubscriptionTier[] {
  return ['free', 'starter', 'pro', 'elite'];
}

/**
 * Get paid tiers only
 */
export function getPaidTiers(): Exclude<SubscriptionTier, 'free'>[] {
  return ['starter', 'pro', 'elite'];
}

/**
 * Compare two tiers (returns -1, 0, 1)
 */
export function compareTiers(a: SubscriptionTier, b: SubscriptionTier): number {
  const order: SubscriptionTier[] = ['free', 'starter', 'pro', 'elite'];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Check if tier A is higher than tier B
 */
export function isHigherTier(a: SubscriptionTier, b: SubscriptionTier): boolean {
  return compareTiers(a, b) > 0;
}
