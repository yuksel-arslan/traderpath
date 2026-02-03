/**
 * Proactive Signal System Types
 * Hourly Capital Flow → Asset Analysis → Telegram Signals
 */

export interface SignalData {
  symbol: string;
  assetClass: 'crypto' | 'stocks' | 'metals' | 'bonds';
  market: string;
  direction: 'long' | 'short';

  // Trade Plan
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;

  // Analysis Results
  classicVerdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  classicScore: number;
  mlisConfirmation: boolean;
  mlisRecommendation?: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  mlisConfidence?: number;
  overallConfidence: number;

  // Capital Flow Context
  capitalFlowPhase: 'early' | 'mid' | 'late' | 'exit';
  capitalFlowBias: 'risk_on' | 'risk_off' | 'neutral';
  sectorFlow?: number;

  // Analysis References
  classicAnalysisId?: string;
  mlisAnalysisId?: string;
}

export interface SignalFilterCriteria {
  market?: string;
  status?: 'pending' | 'published' | 'expired' | 'cancelled';
  minConfidence?: number;
  minScore?: number;
  direction?: 'long' | 'short';
  verdicts?: string[];
  fromDate?: Date;
  toDate?: Date;
}

export interface SignalPublishResult {
  signalId: string;
  telegram?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
  discord?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
}

export interface CapitalFlowRecommendation {
  market: string;
  direction: 'BUY' | 'SELL';
  phase: 'early' | 'mid' | 'late' | 'exit';
  flow7d: number;
  flowVelocity: number;
  sectors?: Array<{
    name: string;
    flow7d: number;
    trending: 'up' | 'down' | 'stable';
  }>;
  suggestedAssets: string[];
  confidence: number;
}

export interface SignalGenerationResult {
  processed: number;
  generated: number;
  published: number;
  skipped: number;
  errors: Array<{
    symbol: string;
    error: string;
  }>;
}

export interface TelegramSignalMessage {
  chatId: string;
  text: string;
  parseMode: 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
}

export interface SignalOutcome {
  signalId: string;
  outcome: 'tp1_hit' | 'tp2_hit' | 'sl_hit' | 'expired';
  outcomePrice: number;
  pnlPercent: number;
}

// Signal expiry based on timeframe
export const SIGNAL_EXPIRY_HOURS = {
  scalping: 4,    // 4 hours for scalp signals
  dayTrade: 24,   // 24 hours for day trade signals
  swing: 168,     // 7 days for swing signals
} as const;

// Minimum requirements for signal generation
export const SIGNAL_REQUIREMENTS = {
  minClassicScore: 7.0,
  minOverallConfidence: 70,
  allowedVerdicts: ['GO', 'CONDITIONAL_GO'],
  allowedPhases: ['early', 'mid'], // Only early and mid phase markets
} as const;
