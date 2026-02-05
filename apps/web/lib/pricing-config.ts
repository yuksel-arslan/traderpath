// Centralized pricing configuration
// Update credit packages here - changes will reflect on all pages
// These must match stripe.service.ts in the API

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: number;
  priceDisplay: string;
  popular?: boolean;
  features: string[];
  color: 'blue' | 'purple' | 'amber' | 'green';
}

// Helper function to calculate per-credit cost dynamically
export function getPerCreditCost(pkg: CreditPackage): string {
  const totalCredits = pkg.credits + pkg.bonus;
  const perCredit = pkg.price / totalCredits;
  return `$${perCredit.toFixed(2)}`;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    bonus: 0,
    price: 7.99,
    priceDisplay: '$7.99',
    features: [
      '50 analysis credits',
      'All 7 analysis steps',
      'PDF reports',
      'Email support',
    ],
    color: 'blue',
  },
  {
    id: 'trader',
    name: 'Trader Pack',
    credits: 150,
    bonus: 15,
    price: 19.99,
    priceDisplay: '$19.99',
    popular: true,
    features: [
      '150 + 15 bonus credits',
      'All 7 analysis steps',
      'Priority analysis queue',
      'Priority support',
    ],
    color: 'purple',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 400,
    bonus: 60,
    price: 44.99,
    priceDisplay: '$44.99',
    features: [
      '400 + 60 bonus credits',
      'All 7 analysis steps',
      'AI chat support',
      'API access',
    ],
    color: 'amber',
  },
];

// Analysis step credit costs (for display purposes)
export const ANALYSIS_COSTS = [
  { step: 'Market Pulse', credits: 0, description: 'Overall market conditions' },
  { step: 'Asset Scanner', credits: 1, description: 'Deep asset analysis' },
  { step: 'Safety Check', credits: 2, description: 'Manipulation detection' },
  { step: 'Timing Analysis', credits: 2, description: 'Optimal entry timing' },
  { step: 'Trade Plan', credits: 2, description: 'Complete trading strategy' },
  { step: 'Trap Check', credits: 2, description: 'Liquidation zone analysis' },
  { step: 'Final Verdict', credits: 1, description: 'Overall recommendation' },
];

// Analysis bundles with discounts
// NOTE: These values must match backend subscription-tiers.ts SERVICE_CREDITS
export const ANALYSIS_BUNDLES = [
  { name: '7-Step Analysis', steps: '7 Steps + AI Confirmation', credits: 10, description: 'Complete analysis with MLIS Pro validation', comingSoon: false, method: 'classic' },
  { name: 'TFT Analysis', steps: 'Full Analysis + AI Price Prediction', credits: 20, description: 'With TFT deep learning model', comingSoon: true, method: 'tft' },
];

// MLIS Pro confirmation layers (included in 7-Step as Step 8)
export const MLIS_PRO_LAYERS = [
  { layer: 'Technical', description: 'Price patterns & indicators' },
  { layer: 'Momentum', description: 'Trend strength analysis' },
  { layer: 'Volatility', description: 'Market stability check' },
  { layer: 'Volume', description: 'Trading volume analysis' },
  { layer: 'Verdict', description: 'Confirmation verdict' },
];

// Feature credit costs
// NOTE: These values must match backend subscription-tiers.ts SERVICE_CREDITS
export const FEATURE_COSTS = [
  { name: 'Capital Flow L3+L4', credits: 5, description: 'Sector analysis + AI recommendations' },
  { name: 'Asset Analysis', credits: 10, description: '7-Step or MLIS Pro analysis' },
  { name: 'AI Expert Chat', credits: 5, description: 'Per chat session' },
  { name: 'AI Concierge', credits: 5, description: 'Per chat session' },
  { name: 'PDF Report', credits: 5, description: 'Full analysis report' },
  { name: 'Email Send', credits: 5, description: 'Send report via email' },
  { name: 'Price Alert', credits: 1, description: 'Per alert created' },
];

// Free signup credits
export const FREE_SIGNUP_CREDITS = 25;

// ==========================================
// ACTIVE USER MONTHLY SUBSCRIPTIONS
// ==========================================
export interface ActiveSubscription {
  id: string;
  tier: 'starter' | 'pro' | 'elite';
  name: string;
  price: number;
  priceDisplay: string;
  dailyCredits: number;
  features: string[];
  limits: {
    maxDailyAnalyses: number | 'unlimited';
    maxScheduledReports: number | 'unlimited';
    maxAlerts: number | 'unlimited';
  };
  popular?: boolean;
}

export const ACTIVE_SUBSCRIPTIONS: ActiveSubscription[] = [
  {
    id: 'sub_starter',
    tier: 'starter',
    name: 'Starter',
    price: 29,
    priceDisplay: '$29/mo',
    dailyCredits: 50,
    features: [
      'Capital Flow L1-L4 (full access)',
      '50 credits/day included',
      'PDF & Email reports',
      'Scheduled reports (3 max)',
      'Price alerts (10 max)',
      'Daily rewards system',
    ],
    limits: {
      maxDailyAnalyses: 0,
      maxScheduledReports: 3,
      maxAlerts: 10,
    },
  },
  {
    id: 'sub_pro',
    tier: 'pro',
    name: 'Pro',
    price: 59,
    priceDisplay: '$59/mo',
    dailyCredits: 100,
    popular: true,
    features: [
      'Everything in Starter',
      '100 credits/day included',
      '7-Step + MLIS Pro analysis',
      '5 analyses/day included',
      'Scheduled reports (5 max)',
      'Priority support',
    ],
    limits: {
      maxDailyAnalyses: 5,
      maxScheduledReports: 5,
      maxAlerts: 10,
    },
  },
  {
    id: 'sub_elite',
    tier: 'elite',
    name: 'Elite',
    price: 79,
    priceDisplay: '$79/mo',
    dailyCredits: 200,
    features: [
      'Everything in Pro',
      '200 credits/day included',
      'AI Concierge (unlimited)',
      'AI Expert questions (unlimited)',
      'Unlimited analyses',
      'Unlimited scheduled reports',
    ],
    limits: {
      maxDailyAnalyses: 'unlimited',
      maxScheduledReports: 'unlimited',
      maxAlerts: 'unlimited',
    },
  },
];

// ==========================================
// SIGNAL SERVICE SUBSCRIPTION TIERS
// ==========================================
export interface SignalSubscription {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  period: 'monthly' | 'yearly';
  markets: string[];
  features: string[];
  signalsPerDay: string;
  popular?: boolean;
  savings?: string;
}

export const SIGNAL_SUBSCRIPTIONS: SignalSubscription[] = [
  {
    id: 'signal_basic',
    name: 'Basic Signals',
    price: 9,
    priceDisplay: '$9/mo',
    period: 'monthly',
    markets: ['Crypto'],
    signalsPerDay: '5',
    features: [
      'Crypto signals only',
      '5 asset signals per day',
      'Sent every 4 hours (6x daily)',
      'Entry, SL, TP levels',
      'Telegram delivery',
      '7-Step + MLIS Pro analysis',
    ],
  },
  {
    id: 'signal_pro',
    name: 'Pro Signals',
    price: 19,
    priceDisplay: '$19/mo',
    period: 'monthly',
    markets: ['Crypto', 'Stocks', 'Metals', 'Bonds'],
    signalsPerDay: '5',
    popular: true,
    features: [
      'All 4 markets',
      '5 asset signals per day',
      'Sent every 4 hours (6x daily)',
      'Entry, SL, TP1, TP2 levels',
      'Telegram + Discord + Email',
      '7-Step + MLIS Pro analysis',
      'Capital Flow context',
      'Priority delivery',
    ],
  },
];

// Per-use costs (for active traders who want to do their own analysis)
export const DAILY_PASS_COSTS = {
  CAPITAL_FLOW_L3: { cost: 5, name: 'Sector Analysis', description: 'Layer 3 - Sector drill-down' },
  CAPITAL_FLOW_L4: { cost: 5, name: 'AI Recommendations', description: 'Layer 4 - BUY/SELL signals' },
  ASSET_ANALYSIS: { cost: 10, name: 'Asset Analysis', description: '7-Step + MLIS Pro analysis' },
};
