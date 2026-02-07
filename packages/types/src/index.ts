// ===========================================
// Shared Types for TraderPath Monorepo
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
  metadata?: Record<string, unknown>;
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
export interface CreditBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastUpdated: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'PURCHASE' | 'BONUS' | 'USAGE' | 'REFUND';
  description: string;
  balanceAfter: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Credit costs per operation
export const CREDIT_COSTS = {
  // Analysis
  ANALYSIS_BASIC: 10,
  ANALYSIS_CLASSIC: 25,
  ANALYSIS_MLIS: 25,
  ANALYSIS_SCHEDULED: 25,

  // Analysis Steps (for display purposes)
  STEP_MARKET_PULSE: 3,
  STEP_ASSET_SCANNER: 4,
  STEP_SAFETY_CHECK: 4,
  STEP_TIMING: 4,
  STEP_TRADE_PLAN: 5,
  STEP_TRAP_CHECK: 3,
  STEP_FINAL_VERDICT: 2,

  // AI Expert
  AI_EXPERT_QUESTION: 5,
  AI_EXPERT_QUESTION_FREE: 0, // First 3 per analysis

  // Reports
  PDF_DOWNLOAD: 5,
  PDF_DOWNLOAD_FREE: 0, // First 2 per analysis
  EMAIL_SEND: 5,
  EMAIL_SEND_FREE: 0, // First 2 per analysis

  // Capital Flow
  CAPITAL_FLOW_L3: 25, // Daily pass
  CAPITAL_FLOW_L4: 25, // Daily pass
  ASSET_ANALYSIS_DAILY: 100, // Daily pass for 10 analyses

  // Alerts
  PRICE_ALERT: 1,
  SCHEDULED_REPORT: 25,

  // Top Coins Scan
  TOP_COINS_SCAN: 300, // Full 30-coin scan
} as const;

// ===== REWARDS TYPES =====
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

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xp: 0, title: 'Beginner', benefits: ['Access to basic features'], dailyBonus: 0, discount: 0, color: 'gray', badge: '🌱' },
  { level: 2, xp: 100, title: 'Trader', benefits: ['5% analysis discount'], dailyBonus: 5, discount: 5, color: 'blue', badge: '📊' },
  { level: 3, xp: 300, title: 'Pro Trader', benefits: ['10% discount', 'Priority support'], dailyBonus: 10, discount: 10, color: 'green', badge: '📈' },
  { level: 4, xp: 600, title: 'Expert', benefits: ['15% discount', '1 free analysis/day'], dailyBonus: 15, discount: 15, color: 'purple', badge: '⭐' },
  { level: 5, xp: 1000, title: 'Master', benefits: ['20% discount', '2 free analyses/day'], dailyBonus: 25, discount: 20, color: 'orange', badge: '👑' },
  { level: 6, xp: 1500, title: 'Legend', benefits: ['25% discount', '3 free analyses/day', 'Custom badge'], dailyBonus: 50, discount: 25, color: 'gold', badge: '🏆' },
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
  xpReward: number;
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

// ===== EXPORT ALL =====
export * from './index';
