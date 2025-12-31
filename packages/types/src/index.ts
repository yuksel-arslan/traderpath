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
