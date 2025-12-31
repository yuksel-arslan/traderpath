// ===========================================
// TradePath Shared Types
// ===========================================

// ===========================================
// User Types
// ===========================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  streakDays: number;
  streakLastDate?: Date;
  preferredCoins: string[];
  referralCode?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UserStats {
  totalAnalyses: number;
  successfulSignals: number;
  achievementsCount: number;
  referralsCount: number;
}

export interface LevelInfo {
  current: number;
  xp: number;
  xpForNext: number;
  progress: number; // 0-100
  benefits: string[];
}

// ===========================================
// Credit Types
// ===========================================

export interface CreditBalance {
  balance: number;
  dailyFreeRemaining: number;
  dailyResetAt: Date;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimePurchased: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: number;
  pricePerCredit: number;
  discountPercent: number;
  isPopular: boolean;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: TransactionType;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type TransactionType =
  | 'PURCHASE'
  | 'REWARD'
  | 'SPEND'
  | 'REFUND'
  | 'REFERRAL'
  | 'BONUS';

export const CREDIT_COSTS = {
  // 7-Step Analysis
  STEP_MARKET_PULSE: 0,    // FREE
  STEP_ASSET_SCANNER: 2,
  STEP_SAFETY_CHECK: 5,
  STEP_TIMING: 3,
  STEP_TRADE_PLAN: 5,
  STEP_TRAP_CHECK: 5,
  STEP_FINAL_VERDICT: 0,   // FREE (with previous steps)

  // Bundles
  BUNDLE_QUICK_CHECK: 5,   // Steps 2 + 7
  BUNDLE_SMART_ENTRY: 12,  // Steps 2-4 + 7 (20% off)
  BUNDLE_FULL_ANALYSIS: 15, // All steps (25% off)

  // Features
  PRICE_ALERT: 1,
  AI_CHAT_QUESTION: 2,
  PDF_REPORT: 8,
  WATCHLIST_SLOT: 3,
  AUTO_REFRESH_HOUR: 5,
} as const;

// ===========================================
// Analysis Types
// ===========================================

export interface Analysis {
  id: string;
  userId: string;
  symbol: string;
  interval: string;
  stepsCompleted: number[];
  step1Result?: MarketPulse;
  step2Result?: AssetScan;
  step3Result?: SafetyCheck;
  step4Result?: TimingAnalysis;
  step5Result?: TradePlan;
  step6Result?: TrapCheck;
  step7Result?: FinalVerdict;
  totalScore?: number;
  creditsSpent: number;
  createdAt: Date;
  expiresAt: Date;
}

// Step 1: Market Pulse
export interface MarketPulse {
  btcDominance: number;
  btcDominanceTrend: 'rising' | 'falling' | 'stable';
  totalMarketCap: number;
  marketCap24hChange: number;
  fearGreedIndex: number;
  fearGreedLabel: FearGreedLabel;
  marketRegime: MarketRegime;
  trend: {
    direction: TrendDirection;
    strength: number;
    timeframesAligned: number;
  };
  macroEvents: MacroEvent[];
  summary: string;
  verdict: 'suitable' | 'caution' | 'avoid';
}

export type FearGreedLabel =
  | 'extreme_fear'
  | 'fear'
  | 'neutral'
  | 'greed'
  | 'extreme_greed';

export type MarketRegime = 'risk_on' | 'risk_off' | 'neutral';
export type TrendDirection = 'bullish' | 'bearish' | 'sideways';

export interface MacroEvent {
  name: string;
  date: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

// Step 2: Asset Scanner
export interface AssetScan {
  symbol: string;
  currentPrice: number;
  timeframes: TimeframeAnalysis[];
  forecast: Forecast;
  levels: KeyLevels;
  indicators: TechnicalIndicators;
  score: number;
}

export interface TimeframeAnalysis {
  tf: '1M' | '1W' | '1D' | '4H' | '1H';
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export interface Forecast {
  price24h: number;
  price7d: number;
  confidence: number;
  scenarios: Scenario[];
}

export interface Scenario {
  name: 'bull' | 'base' | 'bear';
  price: number;
  probability: number;
}

export interface KeyLevels {
  resistance: number[];
  support: number[];
  poc: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    ma20: number;
    ma50: number;
    ma200: number;
  };
}

// Step 3: Safety Check
export interface SafetyCheck {
  manipulation: ManipulationCheck;
  whaleActivity: WhaleActivity;
  exchangeFlows: ExchangeFlow[];
  smartMoney: SmartMoneyPosition;
  riskLevel: RiskLevel;
  warnings: string[];
  score: number;
}

export interface ManipulationCheck {
  spoofingDetected: boolean;
  spoofingDetails?: string;
  layeringDetected: boolean;
  layeringDetails?: string;
  icebergDetected: boolean;
  icebergPrice?: number;
  icebergSide?: 'buy' | 'sell';
  washTrading: boolean;
  pumpDumpRisk: RiskLevel;
}

export interface WhaleActivity {
  largeBuys: WhaleTransaction[];
  largeSells: WhaleTransaction[];
  netFlowUsd: number;
  bias: 'accumulation' | 'distribution' | 'neutral';
}

export interface WhaleTransaction {
  amountUsd: number;
  price: number;
  time: string;
}

export interface ExchangeFlow {
  exchange: string;
  inflow: number;
  outflow: number;
  net: number;
  interpretation: string;
}

export interface SmartMoneyPosition {
  positioning: 'long' | 'short' | 'neutral';
  confidence: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

// Step 4: Timing
export interface TimingAnalysis {
  tradeNow: boolean;
  reason: string;
  conditions: EntryCondition[];
  entryZones: EntryZone[];
  waitFor?: {
    event: string;
    estimatedTime: string;
  };
  score: number;
}

export interface EntryCondition {
  name: string;
  met: boolean;
  details: string;
}

export interface EntryZone {
  priceLow: number;
  priceHigh: number;
  probability: number;
  eta: string;
  quality: number; // 1-5
}

// Step 5: Trade Plan
export interface TradePlan {
  direction: 'long' | 'short';
  type: 'limit' | 'market';
  entries: Entry[];
  averageEntry: number;
  stopLoss: StopLoss;
  takeProfits: TakeProfit[];
  riskReward: number;
  winRateEstimate: number;
  positionSizePercent: number;
  riskAmount?: number;
  trailingStop?: TrailingStop;
  score: number;
}

export interface Entry {
  price: number;
  percentage: number;
  type: 'limit' | 'stop_limit';
}

export interface StopLoss {
  price: number;
  percentage: number;
  reason: string;
}

export interface TakeProfit {
  price: number;
  percentage: number;
  reason: string;
}

export interface TrailingStop {
  activateAfter: string;
  trailPercent: number;
}

// Step 6: Trap Check
export interface TrapCheck {
  traps: TrapDetection;
  liquidationLevels: LiquidationLevel[];
  counterStrategy: string[];
  proTip: string;
  riskLevel: RiskLevel;
  score: number;
}

export interface TrapDetection {
  bullTrap: boolean;
  bullTrapZone?: number;
  bearTrap: boolean;
  bearTrapZone?: number;
  liquidityGrab: {
    detected: boolean;
    zones: number[];
  };
  stopHuntZones: number[];
  fakeoutRisk: RiskLevel;
}

export interface LiquidationLevel {
  price: number;
  amountUsd: number;
  type: 'longs' | 'shorts';
}

// Step 7: Final Verdict
export interface FinalVerdict {
  overallScore: number;
  verdict: VerdictType;
  componentScores: ComponentScore[];
  confidenceFactors: ConfidenceFactor[];
  recommendation: string;
  analysisId: string;
  createdAt: string;
  expiresAt: string;
}

export type VerdictType = 'go' | 'conditional_go' | 'wait' | 'avoid';

export interface ComponentScore {
  step: string;
  score: number;
  weight: number;
}

export interface ConfidenceFactor {
  factor: string;
  positive: boolean;
  impact: 'high' | 'medium' | 'low';
}

// ===========================================
// Rewards & Achievements
// ===========================================

export interface DailyRewards {
  login: {
    claimed: boolean;
    credits: number;
  };
  spin: {
    used: boolean;
    result?: number;
  };
  quiz: {
    completed: boolean;
    question?: Quiz;
  };
  ads: {
    watched: number;
    max: number;
    creditsPerAd: number;
  };
  streak: {
    days: number;
    nextBonus: number;
  };
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: AchievementCategory;
  icon?: string;
  xpReward: number;
  creditReward: number;
  requirementType: RequirementType;
  requirementValue: number;
}

export type AchievementCategory =
  | 'ANALYSIS'
  | 'WHALE'
  | 'TRADING'
  | 'SOCIAL'
  | 'EDUCATION'
  | 'STREAK';

export type RequirementType = 'COUNT' | 'STREAK' | 'PERCENTAGE' | 'SINGLE';

export interface UserAchievement {
  id: string;
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  category: QuizCategory;
  difficulty: number;
}

export type QuizCategory =
  | 'TECHNICAL_ANALYSIS'
  | 'WHALE_BEHAVIOR'
  | 'RISK_MANAGEMENT'
  | 'MARKET_STRUCTURE'
  | 'MANIPULATION'
  | 'PSYCHOLOGY';

// ===========================================
// Referrals
// ===========================================

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  status: ReferralStatus;
  referrerCreditsEarned: number;
  referredCreditsEarned: number;
  createdAt: Date;
}

export type ReferralStatus =
  | 'PENDING'
  | 'REGISTERED'
  | 'FIRST_ANALYSIS'
  | 'FIRST_PURCHASE';

export interface ReferralStats {
  code: string;
  url: string;
  totalReferrals: number;
  pending: number;
  completed: number;
  creditsEarned: number;
  tier: ReferralTier;
}

export interface ReferralTier {
  name: string;
  bonusPercent: number;
  nextTier?: string;
  referralsNeeded?: number;
}

// ===========================================
// Price Alerts
// ===========================================

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'ABOVE' | 'BELOW';
  isTriggered: boolean;
  triggeredAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

// ===========================================
// WebSocket Event Types
// ===========================================

export interface WSMessage<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: number;
}

export type WSEventType =
  | 'PRICE_UPDATE'
  | 'ALERT_TRIGGERED'
  | 'ANALYSIS_COMPLETE'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'CREDIT_UPDATE'
  | 'LEVEL_UP';

// ===========================================
// Constants
// ===========================================

export const SUPPORTED_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'AVAX',
  'DOT',
  'MATIC',
] as const;

export type SupportedSymbol = typeof SUPPORTED_SYMBOLS[number];

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const;
export type Interval = typeof INTERVALS[number];

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, dailyBonus: 0, discount: 0 },
  { level: 5, xp: 500, dailyBonus: 1, discount: 0 },
  { level: 10, xp: 1500, dailyBonus: 2, discount: 0 },
  { level: 15, xp: 3500, dailyBonus: 2, discount: 10 },
  { level: 20, xp: 6000, dailyBonus: 3, discount: 10 },
  { level: 25, xp: 10000, dailyBonus: 3, discount: 15 },
  { level: 30, xp: 15000, dailyBonus: 5, discount: 15 },
  { level: 40, xp: 25000, dailyBonus: 5, discount: 20 },
  { level: 50, xp: 40000, dailyBonus: 10, discount: 20 },
  { level: 100, xp: 100000, dailyBonus: 10, discount: 25 },
] as const;

export const XP_REWARDS = {
  ANALYSIS: 10,
  FULL_ANALYSIS: 30,
  DAILY_LOGIN: 5,
  QUIZ_CORRECT: 15,
  ACHIEVEMENT: 50,
  REFERRAL: 25,
} as const;

// ===========================================
// Credit Earning Constants
// ===========================================

export const CREDIT_EARNING = {
  DAILY_LOGIN: 3,
  DAILY_SPIN_MIN: 1,
  DAILY_SPIN_MAX: 10,
  WATCH_AD: 2,
  MAX_ADS_PER_DAY: 3,
  QUIZ_CORRECT: 5,
  STREAK_7_DAY: 20,
  STREAK_30_DAY: 100,
  REFERRAL_SIGNUP: 20,
  REFERRAL_FIRST_ANALYSIS: 10,
  REFERRAL_PURCHASE_PERCENT: 10,
  LEVEL_UP: 10,
} as const;

export const STREAK_MILESTONES = [
  { days: 7, bonus: 20, label: 'Week Warrior' },
  { days: 14, bonus: 30, label: 'Fortnight Fighter' },
  { days: 30, bonus: 100, label: 'Monthly Master' },
  { days: 60, bonus: 150, label: 'Bi-Monthly Beast' },
  { days: 90, bonus: 250, label: 'Quarter Champion' },
  { days: 180, bonus: 500, label: 'Half-Year Hero' },
  { days: 365, bonus: 1000, label: 'Annual Legend' },
] as const;

export const SPIN_WHEEL_PRIZES = [
  { credits: 1, probability: 0.30, label: '1 Credit' },
  { credits: 2, probability: 0.25, label: '2 Credits' },
  { credits: 3, probability: 0.20, label: '3 Credits' },
  { credits: 5, probability: 0.15, label: '5 Credits' },
  { credits: 7, probability: 0.07, label: '7 Credits' },
  { credits: 10, probability: 0.03, label: '10 Credits!' },
] as const;

export const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'id'>[] = [
  // Analysis Achievements
  {
    code: 'FIRST_ANALYSIS',
    name: 'First Steps',
    description: 'Complete your first analysis',
    category: 'ANALYSIS',
    icon: 'star',
    xpReward: 50,
    creditReward: 10,
    requirementType: 'COUNT',
    requirementValue: 1,
  },
  {
    code: 'ANALYST_10',
    name: 'Analyst',
    description: 'Complete 10 analyses',
    category: 'ANALYSIS',
    icon: 'target',
    xpReward: 100,
    creditReward: 25,
    requirementType: 'COUNT',
    requirementValue: 10,
  },
  {
    code: 'ANALYST_50',
    name: 'Expert Analyst',
    description: 'Complete 50 analyses',
    category: 'ANALYSIS',
    icon: 'medal',
    xpReward: 250,
    creditReward: 50,
    requirementType: 'COUNT',
    requirementValue: 50,
  },
  {
    code: 'ANALYST_100',
    name: 'Master Analyst',
    description: 'Complete 100 analyses',
    category: 'ANALYSIS',
    icon: 'trophy',
    xpReward: 500,
    creditReward: 100,
    requirementType: 'COUNT',
    requirementValue: 100,
  },
  {
    code: 'FULL_ANALYSIS_10',
    name: 'Thorough Trader',
    description: 'Complete 10 full 7-step analyses',
    category: 'ANALYSIS',
    icon: 'check-circle',
    xpReward: 200,
    creditReward: 40,
    requirementType: 'COUNT',
    requirementValue: 10,
  },
  // Streak Achievements
  {
    code: 'STREAK_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    category: 'STREAK',
    icon: 'flame',
    xpReward: 100,
    creditReward: 20,
    requirementType: 'STREAK',
    requirementValue: 7,
  },
  {
    code: 'STREAK_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day login streak',
    category: 'STREAK',
    icon: 'crown',
    xpReward: 500,
    creditReward: 100,
    requirementType: 'STREAK',
    requirementValue: 30,
  },
  {
    code: 'STREAK_100',
    name: 'Century Legend',
    description: 'Maintain a 100-day login streak',
    category: 'STREAK',
    icon: 'award',
    xpReward: 1000,
    creditReward: 250,
    requirementType: 'STREAK',
    requirementValue: 100,
  },
  // Whale Achievements
  {
    code: 'WHALE_SPOTTER',
    name: 'Whale Spotter',
    description: 'Detect your first whale activity',
    category: 'WHALE',
    icon: 'eye',
    xpReward: 75,
    creditReward: 15,
    requirementType: 'COUNT',
    requirementValue: 1,
  },
  {
    code: 'TRAP_DETECTOR',
    name: 'Trap Detector',
    description: 'Detect your first manipulation trap',
    category: 'WHALE',
    icon: 'alert-triangle',
    xpReward: 150,
    creditReward: 30,
    requirementType: 'COUNT',
    requirementValue: 1,
  },
  {
    code: 'MANIPULATION_MASTER',
    name: 'Manipulation Master',
    description: 'Detect 25 manipulation events',
    category: 'WHALE',
    icon: 'shield',
    xpReward: 300,
    creditReward: 75,
    requirementType: 'COUNT',
    requirementValue: 25,
  },
  // Social Achievements
  {
    code: 'FIRST_REFERRAL',
    name: 'Networker',
    description: 'Refer your first friend',
    category: 'SOCIAL',
    icon: 'users',
    xpReward: 100,
    creditReward: 20,
    requirementType: 'COUNT',
    requirementValue: 1,
  },
  {
    code: 'REFERRAL_5',
    name: 'Ambassador',
    description: 'Refer 5 friends',
    category: 'SOCIAL',
    icon: 'gift',
    xpReward: 300,
    creditReward: 100,
    requirementType: 'COUNT',
    requirementValue: 5,
  },
  {
    code: 'REFERRAL_25',
    name: 'Influencer',
    description: 'Refer 25 friends',
    category: 'SOCIAL',
    icon: 'star',
    xpReward: 1000,
    creditReward: 500,
    requirementType: 'COUNT',
    requirementValue: 25,
  },
  // Education Achievements
  {
    code: 'QUIZ_MASTER_10',
    name: 'Quiz Enthusiast',
    description: 'Answer 10 quizzes correctly',
    category: 'EDUCATION',
    icon: 'book',
    xpReward: 100,
    creditReward: 25,
    requirementType: 'COUNT',
    requirementValue: 10,
  },
  {
    code: 'QUIZ_MASTER_50',
    name: 'Knowledge Seeker',
    description: 'Answer 50 quizzes correctly',
    category: 'EDUCATION',
    icon: 'graduation-cap',
    xpReward: 300,
    creditReward: 75,
    requirementType: 'COUNT',
    requirementValue: 50,
  },
  {
    code: 'PERFECT_WEEK',
    name: 'Perfect Week',
    description: 'Answer all daily quizzes correctly for 7 days',
    category: 'EDUCATION',
    icon: 'zap',
    xpReward: 200,
    creditReward: 50,
    requirementType: 'STREAK',
    requirementValue: 7,
  },
  // Trading Achievements
  {
    code: 'MULTI_COIN',
    name: 'Diversifier',
    description: 'Analyze 5 different coins',
    category: 'TRADING',
    icon: 'layers',
    xpReward: 75,
    creditReward: 15,
    requirementType: 'COUNT',
    requirementValue: 5,
  },
  {
    code: 'ALL_COINS',
    name: 'Market Explorer',
    description: 'Analyze all 10 supported coins',
    category: 'TRADING',
    icon: 'globe',
    xpReward: 200,
    creditReward: 50,
    requirementType: 'COUNT',
    requirementValue: 10,
  },
] as const;

// ===========================================
// Daily Reward Schedule
// ===========================================

export const DAILY_REWARD_SCHEDULE = [
  { day: 1, credits: 3 },
  { day: 2, credits: 3 },
  { day: 3, credits: 5 },
  { day: 4, credits: 5 },
  { day: 5, credits: 7 },
  { day: 6, credits: 7 },
  { day: 7, credits: 10, bonus: true },
] as const;

// ===========================================
// Quiz Questions Pool
// ===========================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: QuizCategory;
  explanation: string;
}

export const QUIZ_POOL: QuizQuestion[] = [
  {
    question: 'What does "spoofing" mean in crypto trading?',
    options: [
      'Fake orders placed to manipulate price',
      'Fast trading algorithm',
      'A type of wallet',
      'Market analysis tool'
    ],
    correctIndex: 0,
    category: 'MANIPULATION',
    explanation: 'Spoofing is placing large fake orders to create false demand/supply, then cancelling them after prices move.'
  },
  {
    question: 'When BTC dominance rises, altcoins typically:',
    options: [
      'Rise faster than BTC',
      'Fall against BTC',
      'Stay the same',
      'Follow gold prices'
    ],
    correctIndex: 1,
    category: 'MARKET_STRUCTURE',
    explanation: 'Rising BTC dominance means money flows from altcoins to Bitcoin, causing alts to underperform.'
  },
  {
    question: 'What is a "liquidity grab"?',
    options: [
      'A type of exchange fee',
      'Price moving to trigger stop losses before reversing',
      'Adding liquidity to a pool',
      'A trading bot strategy'
    ],
    correctIndex: 1,
    category: 'MANIPULATION',
    explanation: 'Liquidity grabs occur when price spikes to hit stop losses (where liquidity sits) then reverses.'
  },
  {
    question: 'What RSI level typically indicates oversold conditions?',
    options: [
      'Above 70',
      'Above 50',
      'Below 30',
      'Below 50'
    ],
    correctIndex: 2,
    category: 'TECHNICAL_ANALYSIS',
    explanation: 'RSI below 30 typically indicates oversold conditions, suggesting potential upward reversal.'
  },
  {
    question: 'What is a "bull trap"?',
    options: [
      'A bullish continuation pattern',
      'A false breakout above resistance that reverses',
      'A support level',
      'A trading strategy'
    ],
    correctIndex: 1,
    category: 'WHALE_BEHAVIOR',
    explanation: 'Bull traps lure buyers with a false breakout above resistance, then price drops sharply.'
  },
  {
    question: 'Large exchange inflows typically suggest:',
    options: [
      'Potential selling pressure',
      'Bullish sentiment',
      'Decreased volatility',
      'Higher prices'
    ],
    correctIndex: 0,
    category: 'WHALE_BEHAVIOR',
    explanation: 'Coins moving to exchanges usually means holders want to sell, creating potential selling pressure.'
  },
  {
    question: 'What is the Fear & Greed Index range for "Extreme Fear"?',
    options: [
      '0-24',
      '25-49',
      '50-74',
      '75-100'
    ],
    correctIndex: 0,
    category: 'MARKET_STRUCTURE',
    explanation: 'Extreme Fear is 0-24, often indicating a potential buying opportunity.'
  },
  {
    question: 'What is proper position sizing for high-risk trades?',
    options: [
      '50% of portfolio',
      '25% of portfolio',
      '1-2% of portfolio',
      '10% of portfolio'
    ],
    correctIndex: 2,
    category: 'RISK_MANAGEMENT',
    explanation: 'Risk 1-2% per trade to survive losing streaks and protect capital.'
  },
  {
    question: 'What does "wash trading" mean?',
    options: [
      'Cleaning your trading history',
      'Trading with yourself to fake volume',
      'Hedging positions',
      'Arbitrage trading'
    ],
    correctIndex: 1,
    category: 'MANIPULATION',
    explanation: 'Wash trading is buying and selling to yourself to create artificial volume and interest.'
  },
  {
    question: 'When should you typically avoid trading?',
    options: [
      'During high volume',
      'During major news events or FOMC',
      'During trending markets',
      'During Asian session'
    ],
    correctIndex: 1,
    category: 'RISK_MANAGEMENT',
    explanation: 'Major events cause unpredictable volatility. Wait for clarity after announcements.'
  },
];
