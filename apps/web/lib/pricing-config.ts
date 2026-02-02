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
// NOTE: These values must match backend credit-costs.service.ts (BUNDLE_FULL_ANALYSIS = 25)
// MLIS Pro AI Confirmation is included in 7-Step Analysis as Step 8
export const ANALYSIS_BUNDLES = [
  { name: '7-Step Analysis', steps: '7 Steps + AI Confirmation', credits: 25, description: 'Complete analysis with MLIS Pro validation', comingSoon: false, method: 'classic' },
  { name: 'TFT Analysis', steps: 'Full Analysis + AI Price Prediction', credits: 50, description: 'With TFT deep learning model', comingSoon: true, method: 'tft' },
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
export const FEATURE_COSTS = [
  { name: 'AI Expert Chat', credits: 5, description: 'Per message' },
  { name: 'PDF Report', credits: 10, description: 'Full analysis report' },
  { name: 'Translation', credits: 5, description: 'Translate analysis' },
  { name: 'Email Send', credits: 1, description: 'Send report via email' },
  { name: 'Price Alert', credits: 1, description: 'Per alert created' },
];

// Free signup credits
export const FREE_SIGNUP_CREDITS = 25;
