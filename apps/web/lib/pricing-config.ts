// Centralized pricing configuration
// Update credit packages here - changes will reflect on all pages

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: number;
  pricePerCredit: number;
  popular?: boolean;
  features: string[];
  color: 'blue' | 'purple' | 'amber' | 'green';
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50,
    bonus: 0,
    price: 14.99,
    pricePerCredit: 0.30,
    features: [
      '50 analysis credits',
      'All 7 analysis steps',
      'PDF reports',
      'Email support',
    ],
    color: 'blue',
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 120,
    bonus: 10,
    price: 29.99,
    pricePerCredit: 0.23,
    popular: true,
    features: [
      '120 + 10 bonus credits',
      'All 7 analysis steps',
      'Priority analysis queue',
      'Priority support',
    ],
    color: 'purple',
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 300,
    bonus: 30,
    price: 59.99,
    pricePerCredit: 0.18,
    features: [
      '300 + 30 bonus credits',
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
  { name: 'Quick Check', steps: 'Steps 2 + 7', original: 7, discounted: 5, savings: '29%' },
  { name: 'Smart Entry', steps: 'Steps 2-4 + 7', original: 15, discounted: 12, savings: '20%' },
  { name: 'Full Analysis', steps: 'All 7 Steps', original: 30, discounted: 25, savings: '17%' },
];

// Free signup credits
export const FREE_SIGNUP_CREDITS = 25;
