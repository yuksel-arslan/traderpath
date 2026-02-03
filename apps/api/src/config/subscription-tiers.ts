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
  capitalFlowL3: boolean;      // Layer 3: Sector Analysis
  capitalFlowL4: boolean;      // Layer 4: AI Recommendations
  assetAnalysis: boolean;      // 7-Step + MLIS Pro Analysis
  aiFeatures: boolean;         // AI Concierge + AI Experts
  reportsExport: boolean;      // PDF, Email, Screenshot export
  automation: boolean;         // Scheduled Reports, Price Alerts
  rewards: boolean;            // Daily Login, Spin, Quiz, Referral

  // Limits (-1 = unlimited)
  maxScheduledReports: number;
  maxAlerts: number;
  maxDailyAnalyses: number;
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
  // FREE: Capital Flow L1-L2 + Rewards only
  free: {
    dailyCredits: 0, // No daily credit allocation - buy credits separately
    capitalFlowL3: false,
    capitalFlowL4: false,
    assetAnalysis: false,
    aiFeatures: false,
    reportsExport: false,
    automation: false,
    rewards: true, // Rewards available for all users
    maxScheduledReports: 0,
    maxAlerts: 0,
    maxDailyAnalyses: 5, // All tiers: 5 analyses/day limit
    monthlyAiExpertQuestions: 0,
    monthlyEmailReports: 0,
    monthlyPdfReports: 0,
  },

  // STARTER: Full Capital Flow (L1-L4) + Reports/Automation
  starter: {
    dailyCredits: 0, // No daily credit allocation - buy credits separately
    capitalFlowL3: true,
    capitalFlowL4: true,
    assetAnalysis: false,
    aiFeatures: false,
    reportsExport: true,
    automation: true,
    rewards: true,
    maxScheduledReports: 3,
    maxAlerts: 10,
    maxDailyAnalyses: 5, // All tiers: 5 analyses/day limit
    monthlyAiExpertQuestions: 0,
    monthlyEmailReports: 10,
    monthlyPdfReports: 10,
  },

  // PRO: Starter + Asset Analysis (7-Step, MLIS Pro)
  // Note: Users can purchase additional credits for extra analyses beyond daily limit
  pro: {
    dailyCredits: 0, // No daily credit allocation - buy credits separately
    capitalFlowL3: true,
    capitalFlowL4: true,
    assetAnalysis: true,
    aiFeatures: false,
    reportsExport: true,
    automation: true,
    rewards: true,
    maxScheduledReports: 5, // 5 scheduled reports
    maxAlerts: 10, // 10 price alerts
    maxDailyAnalyses: 5, // 5 analyses/day (extra available via credits)
    monthlyAiExpertQuestions: 0,
    monthlyEmailReports: 50,
    monthlyPdfReports: 50,
  },

  // ELITE: Pro + AI Features (Concierge + Experts)
  // Note: Users can purchase additional credits for extra analyses beyond daily limit
  elite: {
    dailyCredits: 0, // No daily credit allocation - buy credits separately
    capitalFlowL3: true,
    capitalFlowL4: true,
    assetAnalysis: true,
    aiFeatures: true,
    reportsExport: true,
    automation: true,
    rewards: true,
    maxScheduledReports: 5, // 5 scheduled reports
    maxAlerts: 10, // 10 price alerts
    maxDailyAnalyses: 5, // 5 analyses/day (extra available via credits)
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
    description: 'Full Capital Flow access (L1-L4), Reports, Automation.',
    metadata: {
      tier: 'starter',
      credits_daily: 0,
    },
  },

  pro: {
    name: 'TraderPath Pro',
    description: 'Starter + Asset Analysis (7-Step, MLIS Pro). 5 analyses/day included. Need more? Buy credit packs.',
    metadata: {
      tier: 'pro',
      credits_daily: 0,
    },
  },

  elite: {
    name: 'TraderPath Elite',
    description: 'Pro + AI Features (Concierge, Experts). 5 analyses/day included. Need more? Buy credit packs.',
    metadata: {
      tier: 'elite',
      credits_daily: 0,
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
  { product: 'elite', unitAmount: 7900, currency: 'usd', interval: 'month' },
  { product: 'elite', unitAmount: 79000, currency: 'usd', interval: 'year' },
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
  // Capital Flow extra analysis (L3 + L4)
  CAPITAL_FLOW_L3_L4: 5,

  // Asset Analysis (7-Step or MLIS Pro)
  SEVEN_STEP_ANALYSIS: 10,
  MLIS_PRO_ANALYSIS: 10,

  // AI Features
  AI_EXPERT_QUESTION: 5,
  AI_CONCIERGE_MESSAGE: 5,

  // Reports
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
