// Centralized pricing configuration
// Weekly Subscription Model: Simple, affordable weekly plans
// These must match the API weekly-plans configuration

// ==========================================
// WEEKLY SUBSCRIPTION PLANS (Primary Product)
// Two simple plans: Report + Analysis
// ==========================================

export type WeeklyPlanType = 'REPORT_WEEKLY' | 'ANALYSIS_WEEKLY';

export interface WeeklyPlan {
  id: string;
  planType: WeeklyPlanType;
  name: string;
  description: string;
  price: number;
  priceDisplay: string;
  perUnit: string;
  interval: 'week';
  quota: number;
  aiExpertQuestionsPerAnalysis: number;
  features: string[];
  icon: 'report' | 'analysis';
}

export const WEEKLY_PLANS: WeeklyPlan[] = [
  {
    id: 'report_weekly',
    planType: 'REPORT_WEEKLY',
    name: 'Report Subscription',
    description: 'Receive daily professional reports automatically',
    price: 6.99,
    priceDisplay: '$6.99/week',
    perUnit: '$1.00',
    interval: 'week',
    quota: 7,
    aiExpertQuestionsPerAnalysis: 0,
    features: [
      '7 reports per week (1 daily)',
      'Executive Summary or Detailed Analysis Report',
      'Snapshot PNG delivery (pixel-perfect)',
      'Telegram + Discord inline delivery',
      'Choose your preferred assets & timeframes',
      'Outcome tracking & TP/SL notifications',
    ],
    icon: 'report',
  },
  {
    id: 'analysis_weekly',
    planType: 'ANALYSIS_WEEKLY',
    name: 'Analysis Subscription',
    description: 'Run your own analyses with AI Expert support',
    price: 6.99,
    priceDisplay: '$6.99/week',
    perUnit: '$1.00',
    interval: 'week',
    quota: 7,
    aiExpertQuestionsPerAnalysis: 5,
    features: [
      '7 full analyses per week',
      '5 AI Expert questions per analysis',
      'AI Concierge, Automatic, or Tailored methods',
      'Executive Summary + Detailed Report included',
      'Full 7-Step + MLIS Pro dual-engine',
      'RAG Intelligence enrichment',
      'Trade Plan with Entry / SL / TP1 / TP2',
    ],
    icon: 'analysis',
  },
];

// Free signup analyses (no credit card required)
export const FREE_SIGNUP_ANALYSES = 3;

// ==========================================
// ANALYSIS PACKAGES (Legacy - One-time purchases)
// ==========================================

export interface AnalysisPackage {
  id: string;
  name: string;
  analyses: number;
  bonus: number;
  price: number;
  priceDisplay: string;
  perAnalysis: string;
  popular?: boolean;
  features: string[];
  color: 'blue' | 'teal' | 'amber' | 'purple';
}

// Helper function to calculate per-analysis cost dynamically
export function getPerAnalysisCost(pkg: AnalysisPackage): string {
  const totalAnalyses = pkg.analyses + pkg.bonus;
  const perAnalysis = pkg.price / totalAnalyses;
  return `$${perAnalysis.toFixed(2)}`;
}

export const ANALYSIS_PACKAGES: AnalysisPackage[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    analyses: 5,
    bonus: 0,
    price: 9.99,
    priceDisplay: '$9.99',
    perAnalysis: '$2.00',
    features: [
      '5 full analyses',
      '7-Step + MLIS Pro dual-engine',
      'PDF report per analysis',
      '1 AI Expert question per analysis',
    ],
    color: 'blue',
  },
  {
    id: 'trader',
    name: 'Trader',
    analyses: 20,
    bonus: 2,
    price: 29.99,
    priceDisplay: '$29.99',
    perAnalysis: '$1.36',
    popular: true,
    features: [
      '20 + 2 bonus analyses',
      '7-Step + MLIS Pro dual-engine',
      'PDF reports included',
      'Priority analysis queue',
    ],
    color: 'teal',
  },
  {
    id: 'pro',
    name: 'Pro',
    analyses: 50,
    bonus: 5,
    price: 59.99,
    priceDisplay: '$59.99',
    perAnalysis: '$1.09',
    features: [
      '50 + 5 bonus analyses',
      '7-Step + MLIS Pro dual-engine',
      'Unlimited PDF reports',
      'AI Expert chat unlimited',
    ],
    color: 'amber',
  },
  {
    id: 'elite',
    name: 'Elite',
    analyses: 150,
    bonus: 20,
    price: 149.99,
    priceDisplay: '$149.99',
    perAnalysis: '$0.88',
    features: [
      '150 + 20 bonus analyses',
      '7-Step + MLIS Pro dual-engine',
      'Unlimited everything',
      'API access + priority support',
    ],
    color: 'purple',
  },
];

// What's included in every analysis
export const ANALYSIS_INCLUDES = [
  'Full 7-Step Analysis (40+ indicators)',
  'MLIS Pro AI Confirmation (5-layer neural network)',
  'RAG Intelligence Enrichment',
  'Trade Plan with Entry / SL / TP1 / TP2',
  'Order Book & Liquidity Analysis',
  'Tokenomics & Fundamental Check',
  'News Sentiment Analysis',
  'Economic Calendar Risk Check',
  'Capital Flow Context',
];

// Analysis step breakdown (for display purposes)
export const ANALYSIS_STEPS = [
  { step: 'Market Pulse', description: 'Overall market conditions & macro check' },
  { step: 'Asset Scanner', description: '40+ technical indicators deep scan' },
  { step: 'Safety Check', description: 'Manipulation & anomaly detection' },
  { step: 'Timing Analysis', description: 'Optimal entry timing signals' },
  { step: 'Trade Plan', description: 'Entry / SL / TP with risk management' },
  { step: 'Trap Check', description: 'Liquidation zone & trap detection' },
  { step: 'Final Verdict', description: 'GO / CONDITIONAL / WAIT / AVOID' },
  { step: 'MLIS Pro', description: '5-layer AI confirmation engine' },
  { step: 'RAG Intelligence', description: 'Web research & forecast enrichment' },
];

// Analysis bundles
export const ANALYSIS_BUNDLES = [
  { name: '7-Step Analysis', steps: '7 Steps + MLIS Pro + RAG', description: 'Complete analysis with AI confirmation & enrichment', comingSoon: false, method: 'classic' },
  { name: 'TFT Analysis', steps: 'Full Analysis + AI Price Prediction', description: 'With TFT deep learning model', comingSoon: true, method: 'tft' },
];

// MLIS Pro confirmation layers (included in every analysis as Step 8)
export const MLIS_PRO_LAYERS = [
  { layer: 'Technical', description: 'Price patterns & indicators' },
  { layer: 'Momentum', description: 'Trend strength analysis' },
  { layer: 'Volatility', description: 'Market stability check' },
  { layer: 'Volume', description: 'Trading volume analysis' },
  { layer: 'Verdict', description: 'Confirmation verdict' },
];

// ==========================================
// INTELLIGENCE REPORTS SERVICE (Monthly)
// Formerly "Signal Service" — now includes full reports + signals
// ==========================================

export interface ReportSubscription {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  period: 'monthly';
  markets: string[];
  reportsPerDay: number;
  features: string[];
  popular?: boolean;
}

export const REPORT_SUBSCRIPTIONS: ReportSubscription[] = [
  {
    id: 'report_standard',
    name: 'Standard Reports',
    price: 29,
    priceDisplay: '$29/mo',
    period: 'monthly',
    markets: ['Crypto'],
    reportsPerDay: 5,
    features: [
      'Crypto market coverage',
      '5 professional reports per day',
      'Full 7-Step + MLIS Pro analysis per report',
      'Trade signals with Entry / SL / TP',
      'PDF report downloads',
      'Telegram delivery',
      'Outcome tracking & notifications',
    ],
  },
  {
    id: 'report_pro',
    name: 'Pro Reports',
    price: 59,
    priceDisplay: '$59/mo',
    period: 'monthly',
    markets: ['Crypto', 'Stocks', 'Metals', 'Bonds'],
    reportsPerDay: 10,
    popular: true,
    features: [
      'All 4 markets coverage',
      '10 professional reports per day',
      'Full 7-Step + MLIS Pro analysis per report',
      'Trade signals with Entry / SL / TP1 / TP2',
      'PDF report downloads',
      'Telegram + Discord + Email delivery',
      'Capital Flow context in every report',
      'Priority processing & delivery',
      'Outcome tracking & notifications',
    ],
  },
];

// ==========================================
// PLATFORM SUBSCRIPTIONS (Power Users)
// ==========================================

export interface PlatformSubscription {
  id: string;
  tier: 'starter' | 'pro' | 'elite';
  name: string;
  price: number;
  priceDisplay: string;
  analysesPerDay: number | 'unlimited';
  features: string[];
  limits: {
    maxDailyAnalyses: number | 'unlimited';
    maxScheduledReports: number | 'unlimited';
    maxAlerts: number | 'unlimited';
  };
  popular?: boolean;
}

export const PLATFORM_SUBSCRIPTIONS: PlatformSubscription[] = [
  {
    id: 'sub_starter',
    tier: 'starter',
    name: 'Starter',
    price: 29,
    priceDisplay: '$29/mo',
    analysesPerDay: 3,
    features: [
      'Capital Flow L1-L4 (full access)',
      '3 analyses per day',
      'PDF reports included',
      'Scheduled reports (3 max)',
      'Price alerts (10 max)',
      'Daily rewards system',
    ],
    limits: {
      maxDailyAnalyses: 3,
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
    analysesPerDay: 10,
    popular: true,
    features: [
      'Everything in Starter',
      'Capital Flow L1-L4 (full access)',
      '10 analyses per day',
      '7-Step + MLIS Pro dual-engine',
      'AI Expert Panel (ARIA, NEXUS, ORACLE, SENTINEL)',
      'RAG Intelligence enrichment',
      'Scheduled reports (5 max)',
    ],
    limits: {
      maxDailyAnalyses: 10,
      maxScheduledReports: 5,
      maxAlerts: 10,
    },
  },
  {
    id: 'sub_elite',
    tier: 'elite',
    name: 'Elite',
    price: 99,
    priceDisplay: '$99/mo',
    analysesPerDay: 'unlimited',
    features: [
      'Everything in Pro',
      'Unlimited analyses per day',
      'Raw L1 Global Liquidity data exports',
      'AI Concierge (unlimited)',
      'AI Expert questions (unlimited)',
      'Unlimited scheduled reports',
      'Capital Flow PDF reports',
      'API access',
    ],
    limits: {
      maxDailyAnalyses: 'unlimited',
      maxScheduledReports: 'unlimited',
      maxAlerts: 'unlimited',
    },
  },
];

// ==========================================
// BACKWARD COMPATIBILITY
// These aliases ensure existing code doesn't break
// TODO: Migrate all consumers to new interfaces
// ==========================================

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

export function getPerCreditCost(pkg: CreditPackage): string {
  const totalCredits = pkg.credits + pkg.bonus;
  if (totalCredits === 0) return '$0.00';
  const perCredit = pkg.price / totalCredits;
  return `$${perCredit.toFixed(2)}`;
}

// Map analysis packages to old credit-based interface
const colorMap: Record<string, 'blue' | 'purple' | 'amber' | 'green'> = {
  blue: 'blue',
  teal: 'green',
  amber: 'amber',
  purple: 'purple',
};

export const CREDIT_PACKAGES: CreditPackage[] = ANALYSIS_PACKAGES.map(pkg => ({
  id: pkg.id,
  name: pkg.name,
  credits: pkg.analyses,
  bonus: pkg.bonus,
  price: pkg.price,
  priceDisplay: pkg.priceDisplay,
  popular: pkg.popular,
  features: pkg.features,
  color: colorMap[pkg.color] || 'blue',
}));

export const FREE_SIGNUP_CREDITS = FREE_SIGNUP_ANALYSES;

// Old signal subscriptions → now report subscriptions
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

export const SIGNAL_SUBSCRIPTIONS: SignalSubscription[] = REPORT_SUBSCRIPTIONS.map(rpt => ({
  id: rpt.id,
  name: rpt.name,
  price: rpt.price,
  priceDisplay: rpt.priceDisplay,
  period: rpt.period,
  markets: rpt.markets,
  features: rpt.features,
  signalsPerDay: String(rpt.reportsPerDay),
  popular: rpt.popular,
}));

// Old active subscriptions interface
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

export const ACTIVE_SUBSCRIPTIONS: ActiveSubscription[] = PLATFORM_SUBSCRIPTIONS.map(sub => ({
  id: sub.id,
  tier: sub.tier,
  name: sub.name,
  price: sub.price,
  priceDisplay: sub.priceDisplay,
  dailyCredits: typeof sub.analysesPerDay === 'number' ? sub.analysesPerDay * 10 : 999,
  features: sub.features,
  limits: sub.limits,
  popular: sub.popular,
}));

// Feature add-on costs (per-use after free allocations)
export const FEATURE_COSTS = [
  { name: 'Additional AI Expert Question', cost: '$0.99', description: 'After free allocation per analysis' },
  { name: 'Additional PDF Report', cost: '$0.99', description: 'After free allocation per analysis' },
  { name: 'Capital Flow L3 Day Pass', cost: '$4.99', description: 'Sector Activity — unlimited for 24h' },
  { name: 'Capital Flow L4 Day Pass', cost: '$4.99', description: 'AI Recommendations — unlimited for 24h' },
  { name: 'Price Alert', cost: '$0.25', description: 'Per alert created' },
];

// Daily Pass costs (backward compat)
export const DAILY_PASS_COSTS = {
  CAPITAL_FLOW_L3: { cost: 25, name: 'Sector Analysis', description: 'Layer 3 - Sector drill-down (unlimited/day)' },
  CAPITAL_FLOW_L4: { cost: 25, name: 'AI Recommendations', description: 'Layer 4 - BUY/SELL signals (unlimited/day)' },
  ASSET_ANALYSIS: { cost: 100, maxUsage: 10, name: 'Asset Analysis', description: '7-Step + MLIS Pro (10 analyses/day)' },
};

// Analysis step credit costs (backward compat for display)
export const ANALYSIS_COSTS = [
  { step: 'Market Pulse', credits: 0, description: 'Overall market conditions' },
  { step: 'Asset Scanner', credits: 1, description: 'Deep asset analysis' },
  { step: 'Safety Check', credits: 2, description: 'Manipulation detection' },
  { step: 'Timing Analysis', credits: 2, description: 'Optimal entry timing' },
  { step: 'Trade Plan', credits: 2, description: 'Complete trading strategy' },
  { step: 'Trap Check', credits: 2, description: 'Liquidation zone analysis' },
  { step: 'Final Verdict', credits: 1, description: 'Overall recommendation' },
];
