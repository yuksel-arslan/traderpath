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
  perCredit: string;
  popular?: boolean;
  features: string[];
  color: 'blue' | 'purple' | 'amber' | 'green';
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    bonus: 0,
    price: 7.99,
    priceDisplay: '$7.99',
    perCredit: '$0.16',
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
    perCredit: '$0.12',
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
    perCredit: '$0.10',
    features: [
      '400 + 60 bonus credits',
      'All 7 analysis steps',
      'AI chat support',
      'API access',
    ],
    color: 'amber',
  },
];

// Analysis step credit costs
export const ANALYSIS_COSTS = [
  { step: 'Market Pulse', credits: 0, description: 'Overall market conditions' },
  { step: 'Asset Scanner', credits: 2, description: 'Deep asset analysis' },
  { step: 'Safety Check', credits: 5, description: 'Manipulation detection' },
  { step: 'Timing Analysis', credits: 3, description: 'Optimal entry timing' },
  { step: 'Trade Plan', credits: 5, description: 'Complete trading strategy' },
  { step: 'Trap Check', credits: 5, description: 'Liquidation zone analysis' },
  { step: 'Final Verdict', credits: 0, description: 'Overall recommendation' },
];

// Analysis bundles with discounts
export const ANALYSIS_BUNDLES = [
  { name: 'Full Analysis', steps: 'All 7 Steps', credits: 35, description: 'Complete trading analysis', comingSoon: false },
  { name: 'TFT Analysis', steps: 'Full Analysis + AI Price Prediction', credits: 50, description: 'With TFT deep learning model', comingSoon: true },
];

// Feature credit costs
export const FEATURE_COSTS = [
  { name: 'AI Expert Chat', credits: 5, description: 'Per message' },
  { name: 'PDF Report', credits: 10, description: 'Full analysis report' },
  { name: 'Translation', credits: 5, description: 'Translate analysis' },
  { name: 'Email Send', credits: 1, description: 'Send report via email' },
  { name: 'Price Alert', credits: 1, description: 'Per alert created' },
];

// Free signup credits
export const FREE_SIGNUP_CREDITS = 25;
