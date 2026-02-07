// ===========================================
// Trader Tier & Analysis Points Configuration
// Corporate loyalty program - NOT gamification
// ===========================================

// ===========================================
// Trader Tiers
// ===========================================

export interface TraderTier {
  tier: number;
  name: string;
  apRequired: number; // Analysis Points required
  benefits: string[];
  color: string;       // Tailwind color name
  gradient: string;    // CSS gradient for frontend
}

export const TRADER_TIERS: TraderTier[] = [
  {
    tier: 1,
    name: 'Junior Trader',
    apRequired: 0,
    benefits: [
      'Basic analysis tools',
      'Standard Capital Flow access (L1-L2)',
      'Community support',
    ],
    color: 'gray',
    gradient: 'from-slate-400 to-slate-500',
  },
  {
    tier: 2,
    name: 'Trader',
    apRequired: 1000,
    benefits: [
      'Morning Briefing reports',
      'Smart Alerts (L1-L4 changes)',
      'Priority email support',
      'Extended analysis history (90 days)',
    ],
    color: 'blue',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    tier: 3,
    name: 'Senior Trader',
    apRequired: 5000,
    benefits: [
      'Priority support',
      'Advanced indicator overlays',
      'Custom alert thresholds',
      'Extended analysis history (180 days)',
      'Monthly performance digest',
    ],
    color: 'teal',
    gradient: 'from-teal-400 to-emerald-600',
  },
  {
    tier: 4,
    name: 'Master Trader',
    apRequired: 20000,
    benefits: [
      'Dedicated analyst access',
      'Custom report templates',
      'API access for personal tools',
      'Unlimited analysis history',
      'Quarterly strategy review',
      'Early access to new features',
    ],
    color: 'amber',
    gradient: 'from-amber-400 to-yellow-600',
  },
];

// ===========================================
// Analysis Points Earning Rules
// ===========================================

export interface APEarningRule {
  action: string;
  points: number;
  description: string;
  category: 'analysis' | 'engagement' | 'social';
}

export const AP_EARNING_RULES: APEarningRule[] = [
  // Analysis actions
  { action: 'step_1_complete', points: 10, description: 'Complete Market Pulse (Step 1)', category: 'analysis' },
  { action: 'step_2_complete', points: 20, description: 'Complete Asset Scanner (Step 2)', category: 'analysis' },
  { action: 'step_3_complete', points: 20, description: 'Complete Safety Check (Step 3)', category: 'analysis' },
  { action: 'step_4_complete', points: 20, description: 'Complete Timing Analysis (Step 4)', category: 'analysis' },
  { action: 'step_5_complete', points: 20, description: 'Complete Trade Plan (Step 5)', category: 'analysis' },
  { action: 'step_6_complete', points: 20, description: 'Complete Trap Check (Step 6)', category: 'analysis' },
  { action: 'step_7_complete', points: 50, description: 'Complete Final Verdict (Step 7)', category: 'analysis' },
  { action: 'trade_plan_applied', points: 100, description: 'Apply trade plan (external tracker)', category: 'analysis' },

  // Engagement
  { action: 'daily_login', points: 5, description: 'Daily platform login', category: 'engagement' },
  { action: 'quiz_correct', points: 15, description: 'Correct quiz answer', category: 'engagement' },

  // Social
  { action: 'referral', points: 200, description: 'Refer a new trader', category: 'social' },
];

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get the current tier for a given AP amount.
 * Uses the DB field `xp` internally but exposes as "Analysis Points".
 */
export function getTierForAP(ap: number): TraderTier {
  let current = TRADER_TIERS[0];
  for (const tier of TRADER_TIERS) {
    if (ap >= tier.apRequired) {
      current = tier;
    }
  }
  return current;
}

/**
 * Get the next tier after the current AP amount, or null if at max.
 */
export function getNextTier(ap: number): TraderTier | null {
  const currentTier = getTierForAP(ap);
  const nextIndex = TRADER_TIERS.findIndex(t => t.tier === currentTier.tier) + 1;
  return nextIndex < TRADER_TIERS.length ? TRADER_TIERS[nextIndex] : null;
}

/**
 * Calculate progress percentage toward the next tier.
 */
export function getTierProgress(ap: number): number {
  const current = getTierForAP(ap);
  const next = getNextTier(ap);
  if (!next) return 100;
  const range = next.apRequired - current.apRequired;
  const progress = ap - current.apRequired;
  return Math.min(Math.round((progress / range) * 100), 100);
}

/**
 * Get AP earning amount for a given action.
 */
export function getAPForAction(action: string): number {
  const rule = AP_EARNING_RULES.find(r => r.action === action);
  return rule?.points ?? 0;
}

/**
 * Calculate total AP earned from completing a full 7-step analysis.
 */
export function getFullAnalysisAP(): number {
  return 10 + (20 * 5) + 50; // step1 + steps2-6 + step7 = 160 AP
}
