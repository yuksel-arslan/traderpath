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
  REPORT_TRANSLATION: 3,  // Translate PDF to user's language
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

// ===========================================
// AI Experts System
// ===========================================

export type AIExpertType =
  | 'SMART_MONEY'
  | 'TECHNICAL_ANALYSIS'
  | 'RISK_MANAGEMENT'
  | 'TRADE_PLANNING'
  | 'TRAP_DETECTION'
  | 'MARKET_PSYCHOLOGY';

export interface AIExpert {
  id: AIExpertType;
  name: string;
  nameTr: string;
  icon: string;
  color: string;
  description: string;
  descriptionTr: string;
  relatedStep: number; // Which analysis step this expert relates to
}

export interface AIExpertQuestion {
  id: string;
  expertId: AIExpertType;
  question: string;
  questionTr: string;
}

export interface AIExpertAnswer {
  summary: string;
  details: string[];
  tradePathFeature: string;
  tradePathStep: string;
  learnedSummary: string;
  ctaText: string;
  exampleCommand: string;
  relatedTopics: string[];
}

export const AI_EXPERTS: AIExpert[] = [
  {
    id: 'SMART_MONEY',
    name: 'Smart Money Expert',
    nameTr: 'Akıllı Para Uzmanı',
    icon: 'Wallet',
    color: 'emerald',
    description: 'Track whale movements, exchange flows, and institutional positioning',
    descriptionTr: 'Balina hareketlerini, borsa akışlarını ve kurumsal pozisyonları takip et',
    relatedStep: 3,
  },
  {
    id: 'TECHNICAL_ANALYSIS',
    name: 'Technical Analysis Expert',
    nameTr: 'Teknik Analiz Uzmanı',
    icon: 'LineChart',
    color: 'blue',
    description: 'Master RSI, MACD, support/resistance and multi-timeframe analysis',
    descriptionTr: 'RSI, MACD, destek/direnç ve çoklu zaman dilimi analizinde uzmanlaş',
    relatedStep: 2,
  },
  {
    id: 'RISK_MANAGEMENT',
    name: 'Risk Management Expert',
    nameTr: 'Risk Yönetimi Uzmanı',
    icon: 'Shield',
    color: 'orange',
    description: 'Learn position sizing, stop-loss strategies and capital protection',
    descriptionTr: 'Pozisyon boyutlandırma, stop-loss stratejileri ve sermaye korumayı öğren',
    relatedStep: 5,
  },
  {
    id: 'TRADE_PLANNING',
    name: 'Trade Planning Expert',
    nameTr: 'İşlem Planlama Uzmanı',
    icon: 'Target',
    color: 'purple',
    description: 'Create professional entry/exit strategies and DCA plans',
    descriptionTr: 'Profesyonel giriş/çıkış stratejileri ve DCA planları oluştur',
    relatedStep: 5,
  },
  {
    id: 'TRAP_DETECTION',
    name: 'Trap Detection Expert',
    nameTr: 'Tuzak Tespit Uzmanı',
    icon: 'AlertTriangle',
    color: 'red',
    description: 'Identify bull/bear traps, fakeouts and liquidation hunts',
    descriptionTr: 'Bull/bear tuzaklarını, sahte kırılımları ve likidite avlarını tespit et',
    relatedStep: 6,
  },
  {
    id: 'MARKET_PSYCHOLOGY',
    name: 'Market Psychology Expert',
    nameTr: 'Piyasa Psikolojisi Uzmanı',
    icon: 'Brain',
    color: 'pink',
    description: 'Understand Fear & Greed, market cycles and crowd behavior',
    descriptionTr: 'Korku & Açgözlülük, piyasa döngüleri ve kalabalık davranışını anla',
    relatedStep: 1,
  },
];

export const AI_EXPERT_QUESTIONS: AIExpertQuestion[] = [
  // ========== SMART MONEY EXPERT (10 Questions) ==========
  {
    id: 'sm_1',
    expertId: 'SMART_MONEY',
    question: 'How can I track what smart money is doing?',
    questionTr: 'Akıllı paranın ne yaptığını nasıl takip edebilirim?',
  },
  {
    id: 'sm_2',
    expertId: 'SMART_MONEY',
    question: 'What do exchange inflows and outflows mean?',
    questionTr: 'Borsa giriş ve çıkışları ne anlama gelir?',
  },
  {
    id: 'sm_3',
    expertId: 'SMART_MONEY',
    question: 'How do I detect whale accumulation?',
    questionTr: 'Balina birikimini nasıl tespit ederim?',
  },
  {
    id: 'sm_4',
    expertId: 'SMART_MONEY',
    question: 'What is the difference between accumulation and distribution?',
    questionTr: 'Birikim ve dağıtım arasındaki fark nedir?',
  },
  {
    id: 'sm_5',
    expertId: 'SMART_MONEY',
    question: 'How can I follow institutional money flow?',
    questionTr: 'Kurumsal para akışını nasıl takip edebilirim?',
  },
  {
    id: 'sm_6',
    expertId: 'SMART_MONEY',
    question: 'What does negative net flow from exchanges indicate?',
    questionTr: 'Borsalardan negatif net akış ne gösterir?',
  },
  {
    id: 'sm_7',
    expertId: 'SMART_MONEY',
    question: 'How do whales manipulate the market?',
    questionTr: 'Balinalar piyasayı nasıl manipüle eder?',
  },
  {
    id: 'sm_8',
    expertId: 'SMART_MONEY',
    question: 'What is order flow imbalance?',
    questionTr: 'Emir akışı dengesizliği nedir?',
  },
  {
    id: 'sm_9',
    expertId: 'SMART_MONEY',
    question: 'How can I trade alongside whales instead of against them?',
    questionTr: 'Balinalara karşı değil, onlarla birlikte nasıl işlem yapabilirim?',
  },
  {
    id: 'sm_10',
    expertId: 'SMART_MONEY',
    question: 'What are the signs that smart money is exiting?',
    questionTr: 'Akıllı paranın çıkış yaptığının işaretleri nelerdir?',
  },

  // ========== TECHNICAL ANALYSIS EXPERT (10 Questions) ==========
  {
    id: 'ta_1',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'How do I use RSI correctly?',
    questionTr: 'RSI\'ı doğru şekilde nasıl kullanırım?',
  },
  {
    id: 'ta_2',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'What is MACD divergence and why is it important?',
    questionTr: 'MACD uyumsuzluğu nedir ve neden önemlidir?',
  },
  {
    id: 'ta_3',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'How do I identify strong support and resistance levels?',
    questionTr: 'Güçlü destek ve direnç seviyelerini nasıl belirlerim?',
  },
  {
    id: 'ta_4',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'What is multi-timeframe analysis?',
    questionTr: 'Çoklu zaman dilimi analizi nedir?',
  },
  {
    id: 'ta_5',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'How do I use Bollinger Bands for trading?',
    questionTr: 'Bollinger Bantlarını işlem için nasıl kullanırım?',
  },
  {
    id: 'ta_6',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'What do moving average crossovers signal?',
    questionTr: 'Hareketli ortalama kesişimleri ne sinyali verir?',
  },
  {
    id: 'ta_7',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'How can I identify trend direction?',
    questionTr: 'Trend yönünü nasıl belirleyebilirim?',
  },
  {
    id: 'ta_8',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'What is Volume Profile and POC?',
    questionTr: 'Hacim Profili ve POC nedir?',
  },
  {
    id: 'ta_9',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'How do I spot chart patterns like head and shoulders?',
    questionTr: 'Omuz baş omuz gibi grafik formasyonlarını nasıl tespit ederim?',
  },
  {
    id: 'ta_10',
    expertId: 'TECHNICAL_ANALYSIS',
    question: 'What timeframe should I use for day trading vs swing trading?',
    questionTr: 'Günlük işlem ve swing işlem için hangi zaman dilimini kullanmalıyım?',
  },

  // ========== RISK MANAGEMENT EXPERT (10 Questions) ==========
  {
    id: 'rm_1',
    expertId: 'RISK_MANAGEMENT',
    question: 'How much should I risk per trade?',
    questionTr: 'İşlem başına ne kadar risk almalıyım?',
  },
  {
    id: 'rm_2',
    expertId: 'RISK_MANAGEMENT',
    question: 'How do I calculate position size?',
    questionTr: 'Pozisyon boyutunu nasıl hesaplarım?',
  },
  {
    id: 'rm_3',
    expertId: 'RISK_MANAGEMENT',
    question: 'Where should I place my stop-loss?',
    questionTr: 'Stop-loss\'umu nereye koymalıyım?',
  },
  {
    id: 'rm_4',
    expertId: 'RISK_MANAGEMENT',
    question: 'What is a good risk/reward ratio?',
    questionTr: 'İyi bir risk/ödül oranı nedir?',
  },
  {
    id: 'rm_5',
    expertId: 'RISK_MANAGEMENT',
    question: 'How can I protect my capital during drawdowns?',
    questionTr: 'Düşüş dönemlerinde sermayemi nasıl koruyabilirim?',
  },
  {
    id: 'rm_6',
    expertId: 'RISK_MANAGEMENT',
    question: 'What is the difference between fixed and trailing stop-loss?',
    questionTr: 'Sabit ve takip eden stop-loss arasındaki fark nedir?',
  },
  {
    id: 'rm_7',
    expertId: 'RISK_MANAGEMENT',
    question: 'How do I avoid overleveraging?',
    questionTr: 'Aşırı kaldıraçtan nasıl kaçınırım?',
  },
  {
    id: 'rm_8',
    expertId: 'RISK_MANAGEMENT',
    question: 'Should I use DCA or all-in entries?',
    questionTr: 'DCA mı yoksa tek seferde giriş mi kullanmalıyım?',
  },
  {
    id: 'rm_9',
    expertId: 'RISK_MANAGEMENT',
    question: 'How many positions should I have open at once?',
    questionTr: 'Aynı anda kaç pozisyon açık tutmalıyım?',
  },
  {
    id: 'rm_10',
    expertId: 'RISK_MANAGEMENT',
    question: 'What is maximum drawdown and how do I manage it?',
    questionTr: 'Maksimum düşüş nedir ve nasıl yönetirim?',
  },

  // ========== TRADE PLANNING EXPERT (10 Questions) ==========
  {
    id: 'tp_1',
    expertId: 'TRADE_PLANNING',
    question: 'How do I create a complete trade plan?',
    questionTr: 'Eksiksiz bir işlem planı nasıl oluştururum?',
  },
  {
    id: 'tp_2',
    expertId: 'TRADE_PLANNING',
    question: 'What are the best entry strategies?',
    questionTr: 'En iyi giriş stratejileri nelerdir?',
  },
  {
    id: 'tp_3',
    expertId: 'TRADE_PLANNING',
    question: 'How do I set multiple take-profit levels?',
    questionTr: 'Birden fazla kar alma seviyesi nasıl belirlerim?',
  },
  {
    id: 'tp_4',
    expertId: 'TRADE_PLANNING',
    question: 'When should I scale in vs scale out of positions?',
    questionTr: 'Pozisyona ne zaman kademeli giriş, ne zaman kademeli çıkış yapmalıyım?',
  },
  {
    id: 'tp_5',
    expertId: 'TRADE_PLANNING',
    question: 'How do I plan DCA entry levels?',
    questionTr: 'DCA giriş seviyelerini nasıl planlarım?',
  },
  {
    id: 'tp_6',
    expertId: 'TRADE_PLANNING',
    question: 'What conditions should I wait for before entering?',
    questionTr: 'Girmeden önce hangi koşulları beklemeliyim?',
  },
  {
    id: 'tp_7',
    expertId: 'TRADE_PLANNING',
    question: 'How do I know when to take profits?',
    questionTr: 'Kar alma zamanını nasıl anlarım?',
  },
  {
    id: 'tp_8',
    expertId: 'TRADE_PLANNING',
    question: 'What is the difference between limit and market orders?',
    questionTr: 'Limit ve piyasa emirleri arasındaki fark nedir?',
  },
  {
    id: 'tp_9',
    expertId: 'TRADE_PLANNING',
    question: 'How should I adjust my plan if the market changes?',
    questionTr: 'Piyasa değişirse planımı nasıl ayarlamalıyım?',
  },
  {
    id: 'tp_10',
    expertId: 'TRADE_PLANNING',
    question: 'How do I track and review my trades?',
    questionTr: 'İşlemlerimi nasıl takip eder ve değerlendiririm?',
  },

  // ========== TRAP DETECTION EXPERT (10 Questions) ==========
  {
    id: 'td_1',
    expertId: 'TRAP_DETECTION',
    question: 'What is a bull trap and how do I avoid it?',
    questionTr: 'Bull trap nedir ve nasıl kaçınırım?',
  },
  {
    id: 'td_2',
    expertId: 'TRAP_DETECTION',
    question: 'How do I identify a bear trap?',
    questionTr: 'Bear trap\'i nasıl tespit ederim?',
  },
  {
    id: 'td_3',
    expertId: 'TRAP_DETECTION',
    question: 'What is a liquidity grab?',
    questionTr: 'Likidite avı nedir?',
  },
  {
    id: 'td_4',
    expertId: 'TRAP_DETECTION',
    question: 'How do stop hunts work?',
    questionTr: 'Stop avları nasıl çalışır?',
  },
  {
    id: 'td_5',
    expertId: 'TRAP_DETECTION',
    question: 'What are fakeout breakouts?',
    questionTr: 'Sahte kırılımlar nedir?',
  },
  {
    id: 'td_6',
    expertId: 'TRAP_DETECTION',
    question: 'How can I tell if a breakout is real or fake?',
    questionTr: 'Bir kırılımın gerçek mi sahte mi olduğunu nasıl anlarım?',
  },
  {
    id: 'td_7',
    expertId: 'TRAP_DETECTION',
    question: 'Where are liquidation levels and why do they matter?',
    questionTr: 'Likidite seviyeleri nerede ve neden önemli?',
  },
  {
    id: 'td_8',
    expertId: 'TRAP_DETECTION',
    question: 'How do I protect myself from pump and dump schemes?',
    questionTr: 'Pump and dump şemalarından kendimi nasıl korurum?',
  },
  {
    id: 'td_9',
    expertId: 'TRAP_DETECTION',
    question: 'What is spoofing and layering?',
    questionTr: 'Spoofing ve layering nedir?',
  },
  {
    id: 'td_10',
    expertId: 'TRAP_DETECTION',
    question: 'How can I use traps to my advantage?',
    questionTr: 'Tuzakları kendi avantajıma nasıl kullanabilirim?',
  },

  // ========== MARKET PSYCHOLOGY EXPERT (10 Questions) ==========
  {
    id: 'mp_1',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'What is the Fear & Greed Index?',
    questionTr: 'Korku & Açgözlülük Endeksi nedir?',
  },
  {
    id: 'mp_2',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'How do I control my emotions while trading?',
    questionTr: 'İşlem yaparken duygularımı nasıl kontrol ederim?',
  },
  {
    id: 'mp_3',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'What is FOMO and how do I avoid it?',
    questionTr: 'FOMO nedir ve nasıl kaçınırım?',
  },
  {
    id: 'mp_4',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'How do market cycles work?',
    questionTr: 'Piyasa döngüleri nasıl çalışır?',
  },
  {
    id: 'mp_5',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'Why do most retail traders lose money?',
    questionTr: 'Çoğu bireysel yatırımcı neden para kaybeder?',
  },
  {
    id: 'mp_6',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'What is revenge trading?',
    questionTr: 'İntikam ticareti nedir?',
  },
  {
    id: 'mp_7',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'How do I develop trading discipline?',
    questionTr: 'İşlem disiplinini nasıl geliştiririm?',
  },
  {
    id: 'mp_8',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'What is confirmation bias in trading?',
    questionTr: 'İşlemde onay önyargısı nedir?',
  },
  {
    id: 'mp_9',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'When is the best time to buy: fear or greed?',
    questionTr: 'Satın almak için en iyi zaman: korku mu açgözlülük mü?',
  },
  {
    id: 'mp_10',
    expertId: 'MARKET_PSYCHOLOGY',
    question: 'How do I build a winning mindset?',
    questionTr: 'Kazanan bir zihniyet nasıl oluştururum?',
  },
];

// AI Expert Answer Templates
export const AI_EXPERT_ANSWERS: Record<string, AIExpertAnswer> = {
  // Smart Money Expert Answers
  'sm_1': {
    summary: 'Akıllı paranın ne yaptığını TradePath\'te şu şekilde kontrol edebilirsin:',
    details: [
      '**Whale Activity (Balina Hareketleri):** `netFlowUsd`, `largeBuys`, `largeSells` ve `bias` metriklerini incele. `bias` "accumulation" (biriktirme) ise akıllı paranın alım yaptığına işaret eder.',
      '**Exchange Flows (Borsa Akışları):** `inflow`, `outflow` ve `net` değerlerini takip et. `net` değeri negatifse borsalardan çıkış var demektir.',
      '**Smart Money Positioning:** Akıllı paranın long, short veya neutral pozisyonda olup olmadığını görebilirsin.',
      '**Order Flow Imbalance:** Alım/satım dengesizliğine bakarak akıllı paranın hangi yönde pozisyon aldığını tahmin edebilirsin.',
    ],
    tradePathFeature: 'Safety Check',
    tradePathStep: 'Analyze → Safety Check (Adım 3)',
    learnedSummary: 'Akıllı paranın hareketlerini Whale Activity, Exchange Flows, Smart Money Positioning ve Order Flow Imbalance metriklerini inceleyerek anlayabilirsin.',
    ctaText: 'İstediğin coin için bu analizi yapmak ister misin? TradePath\'te **Safety Check** ile gerçek verilerle hesaplama yapabilirsin.',
    exampleCommand: 'BTCUSDT için Safety Check yap ve raporu hazırla, epostama gönder',
    relatedTopics: ['Whale Activity', 'Exchange Flows', 'Order Flow'],
  },
  'sm_2': {
    summary: 'Borsa giriş ve çıkışları, yatırımcıların niyetini gösterir:',
    details: [
      '**Exchange Inflow (Borsa Girişi):** Coinler borsalara taşınıyor = Satış hazırlığı. Yatırımcılar satmak için coinleri borsaya gönderir.',
      '**Exchange Outflow (Borsa Çıkışı):** Coinler borsalardan çıkıyor = HODLing başlıyor. Uzun vadeli tutmak için soğuk cüzdanlara transfer.',
      '**Net Flow:** Giriş - Çıkış. Negatifse bullish sinyal (borsalardan çıkış fazla), pozitifse bearish sinyal.',
      '**Büyük Çıkışlar:** Kurumsal veya balina birikiminin işareti olabilir.',
    ],
    tradePathFeature: 'Safety Check',
    tradePathStep: 'Analyze → Safety Check (Adım 3)',
    learnedSummary: 'Borsa girişleri satış baskısı, çıkışları ise uzun vadeli birikim sinyali verir. Net flow negatifse bullish.',
    ctaText: 'Seçtiğin coin için borsa akışlarını analiz etmek ister misin?',
    exampleCommand: 'ETHUSDT için borsa akışlarını analiz et',
    relatedTopics: ['Exchange Flows', 'HODLing', 'Whale Accumulation'],
  },
  'sm_3': {
    summary: 'Balina birikimini tespit etmenin yolları:',
    details: [
      '**Large Buys (Büyük Alımlar):** $100K+ alım emirlerini takip et. Art arda büyük alımlar birikim işareti.',
      '**Bias: Accumulation:** TradePath\'te bias "accumulation" gösteriyorsa balinalar biriktiriyor.',
      '**Exchange Outflow:** Borsalardan büyük çıkışlar balinların cold wallet\'a transfer yaptığını gösterir.',
      '**Düşük Fiyatta Yüksek Hacim:** Fiyat düşerken hacim artıyorsa, akıllı para düşüşü satın alıyor olabilir.',
    ],
    tradePathFeature: 'Safety Check',
    tradePathStep: 'Analyze → Safety Check (Adım 3)',
    learnedSummary: 'Büyük alımlar, borsadan çıkışlar ve "accumulation" bias değeri balina birikiminin işaretleridir.',
    ctaText: 'Herhangi bir coinde balina birikimi olup olmadığını kontrol etmek ister misin?',
    exampleCommand: 'SOLUSDT için balina aktivitesini kontrol et',
    relatedTopics: ['Whale Activity', 'Accumulation', 'Large Orders'],
  },

  // Technical Analysis Expert Answers
  'ta_1': {
    summary: 'RSI (Relative Strength Index) doğru kullanımı:',
    details: [
      '**Oversold (Aşırı Satım):** RSI < 30 = Potansiyel alım fırsatı. Fiyat aşırı satılmış, geri dönüş beklenebilir.',
      '**Overbought (Aşırı Alım):** RSI > 70 = Dikkatli ol. Fiyat aşırı alınmış, düzeltme gelebilir.',
      '**Divergence (Uyumsuzluk):** Fiyat yeni dip yaparken RSI yapmıyorsa = Bullish divergence (güçlü alım sinyali).',
      '**RSI + Trend:** Trend yönünde RSI sinyallerini kullan. Uptrend\'de oversold al, downtrend\'de overbought sat.',
    ],
    tradePathFeature: 'Asset Scanner',
    tradePathStep: 'Analyze → Asset Scanner (Adım 2)',
    learnedSummary: 'RSI 30 altı alım, 70 üstü satım fırsatı. Divergence\'lar trend dönüşlerini önceden haber verir.',
    ctaText: 'Seçtiğin coin için RSI analizi yapmak ister misin?',
    exampleCommand: 'BTCUSDT için teknik analiz yap, RSI durumunu göster',
    relatedTopics: ['RSI', 'Divergence', 'Overbought/Oversold'],
  },
  'ta_4': {
    summary: 'Çoklu zaman dilimi analizi profesyonel yaklaşım:',
    details: [
      '**Top-Down Approach:** Büyük zaman diliminden küçüğe git. 1D → 4H → 1H → 15m',
      '**Trend Confirmation:** Tüm zaman dilimleri aynı yönü gösteriyorsa sinyal güçlü.',
      '**Entry Timing:** Büyük TF\'de trend yönünü belirle, küçük TF\'de giriş noktası ara.',
      '**TradePath\'te:** "Timeframe Alignment" skoru tüm TF\'lerin uyumunu gösterir. 4/4 = çok güçlü sinyal.',
    ],
    tradePathFeature: 'Asset Scanner',
    tradePathStep: 'Analyze → Asset Scanner (Adım 2)',
    learnedSummary: 'Büyük zaman diliminde trend, küçük zaman diliminde giriş. TF\'ler ne kadar uyumluysa sinyal o kadar güçlü.',
    ctaText: 'Çoklu zaman dilimi analizi ile coin taraması yapmak ister misin?',
    exampleCommand: 'ADAUSDT için tüm zaman dilimlerinde analiz yap',
    relatedTopics: ['Multi-Timeframe', 'Trend Alignment', 'Entry Timing'],
  },

  // Risk Management Expert Answers
  'rm_1': {
    summary: 'İşlem başına risk kuralları:',
    details: [
      '**%1-2 Kuralı:** Tek bir işlemde toplam sermayenin maksimum %1-2\'sini riske at.',
      '**Örnek:** $10,000 hesapta maksimum $100-200 risk. Stop-loss\'a göre pozisyon boyutu hesapla.',
      '**Yüksek Riskli Coinler:** Düşük likiditeli altcoinlerde %0.5-1 risk daha güvenli.',
      '**Seri Kayıp Koruması:** %1 riskle 10 kayıp = %10 düşüş. %5 riskle 10 kayıp = %50 düşüş (felaket!).',
    ],
    tradePathFeature: 'Trade Plan',
    tradePathStep: 'Analyze → Trade Plan (Adım 5)',
    learnedSummary: 'İşlem başına %1-2 risk kuralı sermayeni korur. Seri kayıplarda bile ayakta kalırsın.',
    ctaText: 'Hesap büyüklüğüne göre pozisyon boyutu hesaplamak ister misin?',
    exampleCommand: 'BTCUSDT için $5000 hesapla işlem planı oluştur',
    relatedTopics: ['Position Sizing', 'Risk Per Trade', 'Capital Protection'],
  },
  'rm_2': {
    summary: 'Pozisyon boyutu hesaplama formülü:',
    details: [
      '**Formül:** Pozisyon = (Hesap × Risk%) / (Giriş - Stop Loss)',
      '**Örnek:** $10,000 hesap, %1 risk, $100 giriş, $95 stop = ($10,000 × 0.01) / ($100 - $95) = $100 / $5 = 20 adet',
      '**TradePath Otomatik:** Trade Plan adımında hesap büyüklüğünü gir, sistem otomatik hesaplar.',
      '**DCA için:** Toplam pozisyonu giriş seviyelerine böl. Örn: 3 giriş = her biri %33.',
    ],
    tradePathFeature: 'Trade Plan',
    tradePathStep: 'Analyze → Trade Plan (Adım 5)',
    learnedSummary: 'Pozisyon = (Hesap × Risk%) / Stop Mesafesi. TradePath bunu otomatik hesaplar.',
    ctaText: 'Pozisyon boyutunu otomatik hesaplatmak ister misin?',
    exampleCommand: 'ETHUSDT için $2000 hesapla pozisyon boyutu hesapla',
    relatedTopics: ['Position Sizing', 'Stop Loss', 'DCA Entries'],
  },

  // Trap Detection Expert Answers
  'td_1': {
    summary: 'Bull trap (Boğa tuzağı) ve korunma yolları:',
    details: [
      '**Bull Trap Nedir:** Fiyat direnci kırıyor gibi görünür, alıcılar girer, sonra sert düşüş. Alıcılar tuzağa düşer.',
      '**Tespit Yolları:** Düşük hacimle kırılım, hızlı geri dönüş, RSI divergence.',
      '**Korunma:** Kırılımda hemen girme! Retest (geri test) bekle. Hacim teyidi ara.',
      '**TradePath\'te:** Trap Check adımı bull/bear trap zonlarını otomatik tespit eder.',
    ],
    tradePathFeature: 'Trap Check',
    tradePathStep: 'Analyze → Trap Check (Adım 6)',
    learnedSummary: 'Bull trap: Sahte kırılım + düşük hacim. Korunmak için retest bekle ve hacim teyidi al.',
    ctaText: 'Seçtiğin coinde bull trap riski var mı kontrol etmek ister misin?',
    exampleCommand: 'BTCUSDT için tuzak kontrolü yap',
    relatedTopics: ['Bull Trap', 'Fakeout', 'Volume Confirmation'],
  },
  'td_3': {
    summary: 'Liquidity Grab (Likidite Avı) nasıl çalışır:',
    details: [
      '**Tanım:** Fiyat, stop-loss emirlerinin yoğun olduğu bölgeye hızlı hareket eder, stop\'ları tetikler, sonra ters yöne döner.',
      '**Neden Olur:** Büyük oyuncular likiditeye ihtiyaç duyar. Stop\'ların tetiklenmesi onlara giriş/çıkış likiditesi sağlar.',
      '**Örnek:** Destek 95, altında stop\'lar yoğun. Fiyat 94\'e düşer (stop\'lar tetiklenir), sonra 100\'e çıkar.',
      '**Korunma:** Stop\'u çok belirgin seviyelerin hemen altına koyma. Biraz daha geniş tut veya ATR bazlı kullan.',
    ],
    tradePathFeature: 'Trap Check',
    tradePathStep: 'Analyze → Trap Check (Adım 6)',
    learnedSummary: 'Likidite avı: Stop\'ların yoğun olduğu bölgeye hızlı hareket + geri dönüş. Büyük oyuncuların likiditesi.',
    ctaText: 'Likidite grab zonlarını görmek ister misin?',
    exampleCommand: 'SOLUSDT için likidite seviyelerini ve tuzak zonlarını göster',
    relatedTopics: ['Liquidity Grab', 'Stop Hunt', 'Liquidation Levels'],
  },

  // Market Psychology Expert Answers
  'mp_1': {
    summary: 'Fear & Greed Index (Korku ve Açgözlülük Endeksi):',
    details: [
      '**0-24 Extreme Fear:** Piyasa panik halinde. Tarihsel olarak iyi alım fırsatları.',
      '**25-49 Fear:** Temkinli piyasa. Dikkatli alım düşünülebilir.',
      '**50-74 Greed:** İyimser piyasa. Yeni pozisyonlarda dikkatli ol.',
      '**75-100 Extreme Greed:** Öfori! Satış veya kar alma zamanı yaklaşıyor olabilir.',
    ],
    tradePathFeature: 'Market Pulse',
    tradePathStep: 'Analyze → Market Pulse (Adım 1)',
    learnedSummary: '"Be fearful when others are greedy, be greedy when others are fearful" - Warren Buffett. Endeks 25 altında al, 75 üstünde dikkat.',
    ctaText: 'Şu anki piyasa psikolojisini öğrenmek ister misin?',
    exampleCommand: 'Piyasa durumunu analiz et, Fear & Greed endeksini göster',
    relatedTopics: ['Fear & Greed', 'Market Sentiment', 'Contrarian Trading'],
  },
  'mp_3': {
    summary: 'FOMO (Fear of Missing Out) ve korunma yolları:',
    details: [
      '**FOMO Nedir:** "Fırsatı kaçırma korkusu". Fiyat yükselirken plansız alım yapma dürtüsü.',
      '**Tehlikesi:** Genellikle tepe yakınında alım, sonra büyük kayıp.',
      '**Korunma 1:** Her zaman önceden plan yap. Plansız işlem = FOMO işlemi.',
      '**Korunma 2:** "Tren kaçtıysa bir sonrakini bekle" mentalitesi. Piyasada her zaman yeni fırsat olacak.',
    ],
    tradePathFeature: 'Full Analysis',
    tradePathStep: 'Tüm 7 Adım Analizi',
    learnedSummary: 'FOMO = Duygusal karar. Korunmak için önceden plan yap ve plana sadık kal. Kaçan treni kovalama.',
    ctaText: 'Planlı işlem için 7 adım analizi yapmak ister misin?',
    exampleCommand: 'BTCUSDT için tam 7 adım analizi yap',
    relatedTopics: ['FOMO', 'Trading Psychology', 'Trade Planning'],
  },
};
