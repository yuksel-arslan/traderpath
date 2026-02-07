// ===========================================
// API Types
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
  trend: Record<string, IndicatorDetail>;
  momentum: Record<string, IndicatorDetail>;
  volatility: Record<string, IndicatorDetail>;
  volume: Record<string, IndicatorDetail>;
  advanced: Record<string, IndicatorDetail>;
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
  ANALYSIS_BASIC: 10,
  ANALYSIS_CLASSIC: 25,
  ANALYSIS_MLIS: 25,
  ANALYSIS_SCHEDULED: 25,
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

// ===== REWARDS TYPES =====
export interface LevelThreshold {
  level: number;
  xp: number;
  title: string;
  benefits: string[];
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xp: 0, title: 'Beginner', benefits: ['Access to basic features'] },
  { level: 2, xp: 100, title: 'Trader', benefits: ['5% analysis discount'] },
  { level: 3, xp: 300, title: 'Pro Trader', benefits: ['10% discount', 'Priority support'] },
  { level: 4, xp: 600, title: 'Expert', benefits: ['15% discount', '1 free analysis/day'] },
  { level: 5, xp: 1000, title: 'Master', benefits: ['20% discount', '2 free analyses/day'] },
  { level: 6, xp: 1500, title: 'Legend', benefits: ['25% discount', '3 free analyses/day', 'Custom badge'] },
];
