/**
 * Unified Analysis Pipeline Types
 * ================================
 * Separate pipeline that orchestrates:
 *   1. Capital Flow
 *   2. Fundamentals
 *   3. Technical Data (3 timeframes: 1h, 1D, 1W)
 *   4. Sentiment
 *   5. Technical Analysis
 *   6. AI Predictions
 *   7. Expert Validation
 *   8. Report Generation
 *
 * Does NOT modify existing analysis modules - only consumes them.
 */

import { AssetClass } from '../analysis/providers/types';

// ============================================================================
// PIPELINE STEPS
// ============================================================================

export type PipelineStep =
  | 'capital_flow'
  | 'fundamentals'
  | 'technical_data'
  | 'sentiment'
  | 'technical_analysis'
  | 'ai_predictions'
  | 'expert_validation'
  | 'report_generation';

export const PIPELINE_STEPS: { id: PipelineStep; label: string; description: string }[] = [
  { id: 'capital_flow', label: 'Capital Flow', description: 'Collecting capital flow data' },
  { id: 'fundamentals', label: 'Fundamentals', description: 'Fetching fundamental data' },
  { id: 'technical_data', label: 'Technical Data', description: 'Fetching OHLCV price history' },
  { id: 'sentiment', label: 'Sentiment', description: 'Collecting sentiment data' },
  { id: 'technical_analysis', label: 'Technical Analysis', description: 'Calculating indicators' },
  { id: 'ai_predictions', label: 'AI Predictions', description: 'Generating price predictions' },
  { id: 'expert_validation', label: 'Expert Validation', description: 'Validating with AI experts' },
  { id: 'report_generation', label: 'Report', description: 'Generating report' },
];

// ============================================================================
// PIPELINE PROGRESS
// ============================================================================

export interface StepProgress {
  step: PipelineStep;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface PipelineProgress {
  sessionId: string;
  symbol: string;
  assetClass: AssetClass;
  status: 'running' | 'completed' | 'failed';
  steps: StepProgress[];
  currentStep: PipelineStep | null;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

// ============================================================================
// HORIZON (Short / Medium / Long)
// ============================================================================

export type Horizon = 'short' | 'medium' | 'long';

export const HORIZON_TIMEFRAMES: Record<Horizon, string> = {
  short: '1h',
  medium: '1d',
  long: '1w',
};

export const HORIZON_LABELS: Record<Horizon, string> = {
  short: 'Short-Term',
  medium: 'Medium-Term',
  long: 'Long-Term',
};

export const HORIZON_CANDLE_COUNTS: Record<Horizon, number> = {
  short: 500,
  medium: 250,
  long: 200,
};

// ============================================================================
// STEP 1: CAPITAL FLOW DATA
// ============================================================================

export interface CapitalFlowData {
  globalLiquidity: {
    bias: string; // risk_on | risk_off | neutral
    fedBalanceSheet?: number;
    m2MoneySupply?: number;
    dxy?: number;
    vix?: number;
  };
  marketFlows: {
    market: string;
    flow7d: number;
    flow30d: number;
    flowVelocity: number;
    phase: string;
    fiveFactorScore: number;
  }[];
  recommendation: {
    primaryMarket: string;
    action: string;
    direction: string;
    confidence: number;
    reason: string;
  } | null;
}

// ============================================================================
// STEP 2: FUNDAMENTALS DATA
// ============================================================================

export interface FundamentalsData {
  // Crypto
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  fdv?: number;
  rank?: number;
  // Stocks
  peRatio?: number;
  eps?: number;
  revenue?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  dividendYield?: number;
  beta?: number;
  sector?: string;
  industry?: string;
  analystRating?: string;
  targetPrice?: number;
  numberOfAnalysts?: number;
  // Metals / Bonds
  spotPrice?: number;
  yieldValue?: number;
  yieldCurveSpread?: number;
  // Common
  volume24h?: number;
  change24h?: number;
  changePercent24h?: number;
  price?: number;
}

// ============================================================================
// STEP 3: TECHNICAL DATA
// ============================================================================

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalData {
  short: CandleData[];   // 1h candles
  medium: CandleData[];  // 1D candles
  long: CandleData[];    // 1W candles
  currentPrice: number;
}

// ============================================================================
// STEP 4: SENTIMENT DATA
// ============================================================================

export interface SentimentData {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -100 to 100
  fearGreedIndex?: number;
  fearGreedLabel?: string;
  newsItems: {
    title: string;
    source: string;
    sentiment: string;
    publishedAt: string;
  }[];
  economicEvents: {
    event: string;
    date: string;
    impact: string;
    forecast?: string;
    previous?: string;
  }[];
  shouldBlockTrade: boolean;
  blockReason?: string;
}

// ============================================================================
// STEP 5: TECHNICAL ANALYSIS (per horizon)
// ============================================================================

export interface IndicatorResult {
  name: string;
  value: number | string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
}

export interface HorizonAnalysis {
  horizon: Horizon;
  timeframe: string;
  label: string;
  // Trend
  trend: 'bullish' | 'bearish' | 'neutral';
  trendStrength: number; // 0-100
  // Indicators summary
  indicators: {
    total: number;
    bullish: number;
    bearish: number;
    neutral: number;
  };
  keyIndicators: IndicatorResult[];
  // Support / Resistance
  supports: number[];
  resistances: number[];
  // Score
  score: number; // 0-100
  // Direction
  direction: 'long' | 'short' | 'neutral';
  confidence: number; // 0-100
}

// ============================================================================
// STEP 6: AI PREDICTIONS (per horizon)
// ============================================================================

export interface HorizonPrediction {
  horizon: Horizon;
  timeframe: string;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  reasoning: string;
  expectedMovePercent: number;
  expectedCandles: number;
}

// ============================================================================
// STEP 7: EXPERT VALIDATION
// ============================================================================

export interface ExpertOpinion {
  expertName: string; // ARIA, ORACLE, SENTINEL, NEXUS
  role: string;
  verdict: string;
  confidence: number;
  keyPoints: string[];
}

export interface ExpertValidation {
  experts: ExpertOpinion[];
  synthesis: string; // VOLTRAN combined opinion
  overallVerdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  overallConfidence: number;
  agreements: number;
  disagreements: number;
}

// ============================================================================
// STEP 8: FINAL REPORT
// ============================================================================

export interface UnifiedReport {
  // Meta
  sessionId: string;
  symbol: string;
  assetName: string;
  assetClass: AssetClass;
  generatedAt: string;
  // Step results
  capitalFlow: CapitalFlowData;
  fundamentals: FundamentalsData;
  technicalData: TechnicalData;
  sentiment: SentimentData;
  horizonAnalyses: HorizonAnalysis[];
  horizonPredictions: HorizonPrediction[];
  expertValidation: ExpertValidation;
  // Overall verdict
  overallVerdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  overallScore: number; // 0-100
  overallDirection: 'long' | 'short' | 'neutral';
  overallConfidence: number;
  summary: string; // 2-3 sentence AI summary
  // Trade plan (only for GO/CONDITIONAL_GO)
  tradePlan?: {
    direction: 'long' | 'short' | 'neutral';
    entries: Array<{ price: number; percentage: number; type: string }>;
    averageEntry: number;
    stopLoss: { price: number; percentage: number; reason: string };
    takeProfits: Array<{ price: number; percentage: number; reason: string; riskReward: number }>;
    riskRewardRatio: number;
    positionSizePercent: number;
  };
}

// ============================================================================
// PIPELINE REQUEST / RESPONSE
// ============================================================================

export interface UnifiedAnalysisRequest {
  symbol: string;
  userId: string;
}

export interface UnifiedAnalysisResponse {
  sessionId: string;
  report: UnifiedReport;
}
