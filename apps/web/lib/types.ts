// ===========================================
// Web App Types
// ===========================================

// ===== INDICATOR TYPES =====
export interface IndicatorDetail {
  name: string;
  value: number | string | null;
  signal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: 'strong' | 'moderate' | 'weak';
  interpretation: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'advanced';
  isLeadingIndicator: boolean;
  weight: number;
  strength?: number;
  metadata?: Record<string, any>;
}

export interface DivergenceInfo {
  type: 'bullish' | 'bearish' | 'hidden_bullish' | 'hidden_bearish' | 'none';
  indicator: string;
  description: string;
  reliability: 'high' | 'medium' | 'low';
  isEarlySignal: boolean;
  timeframe?: string;
  strength?: number;
  pricePoints?: Array<{ time: number; price: number }>;
  indicatorPoints?: Array<{ time: number; value: number }>;
}

export interface IndicatorAnalysisSummary {
  bullishIndicators: number;
  bearishIndicators: number;
  neutralIndicators: number;
  totalIndicatorsUsed: number;
  overallSignal: 'bullish' | 'bearish' | 'neutral';
  signalConfidence: number;
  leadingIndicatorsSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed';
}

export interface IndicatorAnalysis {
  trend: Record<string, IndicatorDetail | undefined>;
  momentum: Record<string, IndicatorDetail | undefined>;
  volatility: Record<string, IndicatorDetail | undefined>;
  volume: Record<string, IndicatorDetail | undefined>;
  advanced: Record<string, IndicatorDetail | undefined>;
  divergences: DivergenceInfo[];
  summary: IndicatorAnalysisSummary;
}

// ===== CREDIT TYPES =====
export const CREDIT_COSTS = {
  ANALYSIS_BASIC: 10,
  ANALYSIS_CLASSIC: 25,
  ANALYSIS_MLIS: 25,
  ANALYSIS_SCHEDULED: 25,
  STEP_MARKET_PULSE: 3,
  STEP_ASSET_SCANNER: 4,
  STEP_SAFETY_CHECK: 4,
  STEP_TIMING: 4,
  STEP_TRADE_PLAN: 5,
  STEP_TRAP_CHECK: 3,
  STEP_FINAL_VERDICT: 2,
  AI_EXPERT_QUESTION: 5,
  AI_EXPERT_QUESTION_FREE: 0,
  PDF_DOWNLOAD: 5,
  PDF_DOWNLOAD_FREE: 0,
  EMAIL_SEND: 5,
  EMAIL_SEND_FREE: 0,
  CAPITAL_FLOW_L3: 25,
  CAPITAL_FLOW_L4: 25,
  ASSET_ANALYSIS_DAILY: 100,
  PRICE_ALERT: 1,
  SCHEDULED_REPORT: 25,
  TOP_COINS_SCAN: 300,
} as const;

// ===== TRADER TIER TYPES =====
export interface TraderTierThreshold {
  tier: number;
  apRequired: number;
  name: string;
  benefits: string[];
  color: string;
  gradient: string;
}

export const TRADER_TIERS: TraderTierThreshold[] = [
  {
    tier: 1,
    apRequired: 0,
    name: 'Junior Trader',
    benefits: ['Basic analysis tools', 'Standard Capital Flow access (L1-L2)', 'Community support'],
    color: 'gray',
    gradient: 'from-slate-400 to-slate-500',
  },
  {
    tier: 2,
    apRequired: 1000,
    name: 'Trader',
    benefits: ['Morning Briefing reports', 'Smart Alerts (L1-L4 changes)', 'Priority email support', 'Extended analysis history (90 days)'],
    color: 'blue',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    tier: 3,
    apRequired: 5000,
    name: 'Senior Trader',
    benefits: ['Priority support', 'Advanced indicator overlays', 'Custom alert thresholds', 'Extended analysis history (180 days)', 'Monthly performance digest'],
    color: 'teal',
    gradient: 'from-teal-400 to-emerald-600',
  },
  {
    tier: 4,
    apRequired: 20000,
    name: 'Master Trader',
    benefits: ['Dedicated analyst access', 'Custom report templates', 'API access for personal tools', 'Unlimited analysis history', 'Quarterly strategy review', 'Early access to new features'],
    color: 'amber',
    gradient: 'from-amber-400 to-yellow-600',
  },
];

// Legacy alias for backwards compatibility (used in some pages)
export interface LevelThreshold {
  level: number;
  xp: number;
  title: string;
  benefits: string[];
  dailyBonus: number;
  discount: number;
  color: string;
  badge: string;
  unlockMessage?: string;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = TRADER_TIERS.map(t => ({
  level: t.tier,
  xp: t.apRequired,
  title: t.name,
  benefits: t.benefits,
  dailyBonus: 0,
  discount: 0,
  color: t.color,
  badge: '',
}));

// ===== AP EARNING RULES (Frontend mirror) =====
export interface APEarningRule {
  action: string;
  points: number;
  description: string;
  category: 'analysis' | 'engagement' | 'social';
}

export const AP_EARNING_RULES: APEarningRule[] = [
  { action: 'step_1_complete', points: 10, description: 'Complete Market Pulse (Step 1)', category: 'analysis' },
  { action: 'step_2_complete', points: 20, description: 'Complete Asset Scanner (Step 2)', category: 'analysis' },
  { action: 'step_3_complete', points: 20, description: 'Complete Safety Check (Step 3)', category: 'analysis' },
  { action: 'step_4_complete', points: 20, description: 'Complete Timing Analysis (Step 4)', category: 'analysis' },
  { action: 'step_5_complete', points: 20, description: 'Complete Trade Plan (Step 5)', category: 'analysis' },
  { action: 'step_6_complete', points: 20, description: 'Complete Trap Check (Step 6)', category: 'analysis' },
  { action: 'step_7_complete', points: 50, description: 'Complete Final Verdict (Step 7)', category: 'analysis' },
  { action: 'trade_plan_applied', points: 100, description: 'Apply trade plan (external tracker)', category: 'analysis' },
  { action: 'daily_login', points: 5, description: 'Daily platform login', category: 'engagement' },
  { action: 'quiz_correct', points: 15, description: 'Correct quiz answer', category: 'engagement' },
  { action: 'referral', points: 200, description: 'Refer a new trader', category: 'social' },
];

export interface StreakMilestone {
  days: number;
  bonus: number;
  title: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, bonus: 10, title: '3-Day Streak' },
  { days: 7, bonus: 25, title: 'Week Warrior' },
  { days: 14, bonus: 50, title: 'Two Weeks Strong' },
  { days: 21, bonus: 75, title: 'Three Weeks Legend' },
  { days: 30, bonus: 150, title: 'Month Master' },
];

export interface DailyReward {
  day: number;
  credits: number;
  bonus?: string;
}

export const DAILY_REWARD_SCHEDULE: DailyReward[] = [
  { day: 1, credits: 5 },
  { day: 2, credits: 5 },
  { day: 3, credits: 10, bonus: '3-Day Streak!' },
  { day: 4, credits: 5 },
  { day: 5, credits: 5 },
  { day: 6, credits: 5 },
  { day: 7, credits: 25, bonus: 'Week Complete!' },
];

export interface Achievement {
  id: string;
  code: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;       // DB field name (internally = AP)
  creditReward: number;
  category: 'analysis' | 'streak' | 'social' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirementType: string;
  requirementValue: number;
  condition?: {
    type: string;
    target: number;
  };
}

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_analysis',
    code: 'first_analysis',
    name: 'First Analysis',
    title: 'First Analysis',
    description: 'Complete your first 7-step analysis',
    icon: 'star',
    xpReward: 50,
    creditReward: 10,
    category: 'analysis',
    tier: 'bronze',
    requirementType: 'analysis_count',
    requirementValue: 1,
    condition: { type: 'analysis_count', target: 1 }
  },
  {
    id: 'analysis_10',
    code: 'analysis_10',
    name: 'Analyst',
    title: 'Analyst',
    description: 'Complete 10 analyses',
    icon: 'target',
    xpReward: 100,
    creditReward: 25,
    category: 'analysis',
    tier: 'silver',
    requirementType: 'analysis_count',
    requirementValue: 10,
    condition: { type: 'analysis_count', target: 10 }
  },
  {
    id: 'analysis_50',
    code: 'analysis_50',
    name: 'Expert Analyst',
    title: 'Expert Analyst',
    description: 'Complete 50 analyses',
    icon: 'medal',
    xpReward: 250,
    creditReward: 100,
    category: 'analysis',
    tier: 'gold',
    requirementType: 'analysis_count',
    requirementValue: 50,
    condition: { type: 'analysis_count', target: 50 }
  },
  {
    id: 'streak_7',
    code: 'streak_7',
    name: 'Week Warrior',
    title: 'Week Warrior',
    description: 'Login 7 days in a row',
    icon: 'flame',
    xpReward: 100,
    creditReward: 25,
    category: 'streak',
    tier: 'silver',
    requirementType: 'streak_days',
    requirementValue: 7,
    condition: { type: 'streak_days', target: 7 }
  },
  {
    id: 'streak_30',
    code: 'streak_30',
    name: 'Month Master',
    title: 'Month Master',
    description: 'Login 30 days in a row',
    icon: 'trophy',
    xpReward: 500,
    creditReward: 150,
    category: 'streak',
    tier: 'platinum',
    requirementType: 'streak_days',
    requirementValue: 30,
    condition: { type: 'streak_days', target: 30 }
  },
];

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export const QUIZ_POOL: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What does RSI stand for?',
    options: ['Relative Strength Index', 'Real Signal Indicator', 'Rate of Stock Increase', 'Return on Stock Investment'],
    correctIndex: 0,
    explanation: 'RSI (Relative Strength Index) is a momentum oscillator that measures the speed and magnitude of price changes.',
    difficulty: 'easy',
    category: 'Technical Analysis'
  },
  {
    id: 'q2',
    question: 'What is the ideal RSI range for a neutral market?',
    options: ['0-30', '30-70', '70-100', '50-60'],
    correctIndex: 1,
    explanation: 'RSI values between 30-70 typically indicate a neutral market, while below 30 suggests oversold and above 70 suggests overbought conditions.',
    difficulty: 'medium',
    category: 'Technical Analysis'
  },
  {
    id: 'q3',
    question: 'What does MACD measure?',
    options: ['Price volatility', 'Trading volume', 'Trend momentum', 'Market cap'],
    correctIndex: 2,
    explanation: 'MACD (Moving Average Convergence Divergence) is a trend-following momentum indicator that shows the relationship between two moving averages.',
    difficulty: 'easy',
    category: 'Technical Analysis'
  },
  {
    id: 'q4',
    question: 'What is a bullish divergence?',
    options: [
      'Price makes lower lows while indicator makes higher lows',
      'Price makes higher highs while indicator makes lower highs',
      'Price and indicator move in same direction',
      'Indicator crosses above signal line'
    ],
    correctIndex: 0,
    explanation: 'Bullish divergence occurs when price makes lower lows but the indicator makes higher lows, suggesting potential upward reversal.',
    difficulty: 'hard',
    category: 'Technical Analysis'
  },
  {
    id: 'q5',
    question: 'What does high trading volume indicate?',
    options: ['Strong interest and liquidity', 'Market manipulation', 'Price will go up', 'Price will go down'],
    correctIndex: 0,
    explanation: 'High trading volume indicates strong market interest and good liquidity, making it easier to enter and exit positions.',
    difficulty: 'easy',
    category: 'Market Analysis'
  },
];
