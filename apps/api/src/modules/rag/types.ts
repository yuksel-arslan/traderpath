/**
 * RAG (Retrieval-Augmented Generation) System Types
 *
 * This module provides enrichment layers on TOP of the existing
 * 7-Step + MLIS Pro analysis engine. It never modifies core outputs.
 *
 * Architecture:
 *   Capital Flow (filter) → 7-Step / MLIS (truth source) → RAG (enrichment)
 *
 * Components:
 *   1. Web Research Service (fast/news/deep modes)
 *   2. AI Forecast Band Generator (P10/P50/P90)
 *   3. Multi-Strategy Plan Generator (4 strategies)
 *   4. Plan Validation Service (gatekeeper)
 *   5. Citation & Source Manager (allowlist + scoring)
 */

import { AssetClass } from '../analysis/types/asset-metrics.types';
import { MarketType, Phase, LiquidityBias } from '../capital-flow/types';

// ============================================================================
// RESEARCH MODES
// ============================================================================

/** Research depth modes - higher modes cost more but provide richer context */
export type ResearchMode = 'fast' | 'news' | 'deep';

// ============================================================================
// CITATION & SOURCE TYPES
// ============================================================================

export type SourceCategory = 'exchange' | 'news' | 'research' | 'government' | 'data' | 'social';
export type SourceTier = 'official' | 'tier_1_news' | 'crypto_specialized' | 'local_finance' | 'other';

export interface TrustedSource {
  domain: string;
  name: string;
  category: SourceCategory;
  tier: SourceTier;
  reliability: number;         // 0-100
  assetClasses: AssetClass[];
  paywall?: boolean;
  language?: 'en' | 'tr';
  rateLimit?: { calls: number; perSeconds: number };
}

export interface Citation {
  id: string;
  source: string;              // domain
  sourceName: string;          // human-readable
  title: string;
  url: string;
  publishedAt: string;         // ISO date
  reliability: number;         // from allowlist
  relevance: number;           // 0-100, how relevant to this analysis
  excerpt?: string;            // 1-2 sentence quote
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  category: 'news' | 'data' | 'research' | 'economic_event';
}

// ============================================================================
// WEB RESEARCH TYPES
// ============================================================================

export interface WebResearchResult {
  mode: ResearchMode;
  symbol: string;
  assetClass: AssetClass;

  // Content
  citations: Citation[];
  summary: string | null;
  keyFindings: string[];       // 3-5 bullet points
  riskFactors: string[];
  catalysts: string[];

  // Sentiment
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;      // -100 to 100

  // Meta
  sourcesChecked: number;
  timestamp: number;
  costUsd: number;
}

// ============================================================================
// FORECAST BAND TYPES
// ============================================================================

export type ForecastHorizon = 'short' | 'medium' | 'long';
export type ForecastMethodology = 'atr_distribution' | 'gemini_enhanced';

/** Horizon configuration per asset class */
export const HORIZON_CONFIG: Record<AssetClass, Record<ForecastHorizon, string>> = {
  crypto: { short: '1h', medium: '1d', long: '1w' },
  stocks: { short: '1d', medium: '1w', long: '1m' },
  metals: { short: '1d', medium: '1w', long: '1m' },
  bonds:  { short: '1d', medium: '1w', long: '1m' },
  bist:   { short: '1d', medium: '1w', long: '1m' },
};

/** ATR multipliers for band width per horizon */
export const ATR_BAND_MULTIPLIERS: Record<ForecastHorizon, number> = {
  short:  1.0,   // ±1.0 ATR
  medium: 2.0,   // ±2.0 ATR
  long:   3.5,   // ±3.5 ATR
};

/** P50 drift multipliers based on bias direction */
export const P50_DRIFT_MULTIPLIERS: Record<ForecastHorizon, number> = {
  short:  0.2,   // 0.2 * ATR
  medium: 0.5,   // 0.5 * ATR
  long:   1.0,   // 1.0 * ATR
};

export interface ForecastBand {
  horizon: ForecastHorizon;
  timeframe: string;           // '1h' | '1d' | '1w' | '1m'
  expectedCandles: number;

  // Price levels
  currentPrice: number;
  p10: number;                 // 10th percentile - bearish floor
  p50: number;                 // 50th percentile - most likely
  p90: number;                 // 90th percentile - bullish ceiling

  // Direction & drivers
  bias: 'up' | 'down' | 'sideways';
  drivers: string[];
  invalidations: string[];

  // Derived metrics
  expectedRange: number;       // (p90 - p10) / currentPrice as %
  skew: number;                // positive = bullish, negative = bearish
  confidenceWidth: number;     // p90 - p10 in absolute terms

  // Methodology
  methodology: ForecastMethodology;
}

export interface ForecastBandResult {
  symbol: string;
  assetClass: AssetClass;
  bands: ForecastBand[];       // 3 bands (short/medium/long)
  disclaimer: string;
  generatedAt: string;
  validUntil: string;
}

// ============================================================================
// MULTI-STRATEGY TYPES
// ============================================================================

export type StrategyType = 'breakout' | 'pullback' | 'trend_following' | 'range';

/** Strategy applicability weights per asset class */
export const STRATEGY_WEIGHTS: Record<AssetClass, Record<StrategyType, number>> = {
  crypto: { breakout: 1.0, pullback: 0.8, trend_following: 1.0, range: 0.6 },
  stocks: { breakout: 0.8, pullback: 1.0, trend_following: 0.9, range: 0.5 },
  metals: { breakout: 0.8, pullback: 0.9, trend_following: 1.0, range: 0.9 },
  bonds:  { breakout: 0.3, pullback: 0.7, trend_following: 1.0, range: 0.9 },
  bist:   { breakout: 0.8, pullback: 1.0, trend_following: 0.7, range: 0.9 },
};

export interface StrategyPlan {
  id: string;
  type: StrategyType;
  label: string;               // "Breakout Long"
  description: string;

  // Applicability
  applicability: number;       // 0-100
  applicabilityReason: string;

  // Trade parameters
  direction: 'long' | 'short';
  entry: {
    price: number;
    condition: string;         // "Break above $95,200 with volume confirmation"
    type: 'limit' | 'stop_limit' | 'market';
    zone?: [number, number];   // [min, max] for limit zone
  };
  stopLoss: {
    price: number;
    percentage: number;
    reason: string;
  };
  takeProfits: Array<{
    id: string;
    price: number;
    sizePct: number;           // position allocation %
    reason: string;
  }>;

  // Risk metrics
  riskReward: number;
  timeHorizon: string;         // "4-12 hours" / "1-3 days"

  // Conditions
  triggerConditions: string[];
  invalidationConditions: string[];

  // Management rules
  management: {
    moveStopToBEAfterTP1: boolean;
    timeStop?: string;         // "exit if not triggered in 48h"
    trailingStop?: { activateAfter: string; trailPercent: number };
  };

  // Source attribution
  rationale: string[];
  risks: string[];
}

export interface MultiStrategyResult {
  symbol: string;
  assetClass: AssetClass;
  currentPrice: number;
  direction: 'long' | 'short' | 'neutral';
  strategies: StrategyPlan[];
  recommended: StrategyType;
  recommendedReason: string;
}

// ============================================================================
// PLAN VALIDATION TYPES
// ============================================================================

export type ValidationSeverity = 'block' | 'warn' | 'info';
export type ValidationCategory = 'risk' | 'liquidity' | 'timing' | 'sanity' | 'capital_flow';

export interface ValidationCheckResult {
  passed: boolean;
  ruleId: string;
  ruleName: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  data?: Record<string, unknown>;
}

export interface PlanValidationResult {
  planId: string;
  planType: 'engine' | StrategyType;
  overallStatus: 'pass' | 'warn' | 'block';
  checks: ValidationCheckResult[];
  passedCount: number;
  warnCount: number;
  blockCount: number;
  validatedAt: string;
}

export interface ValidationContext {
  symbol: string;
  assetClass: AssetClass;
  currentPrice: number;
  atr: number;
  volume24h: number;
  marketRegime: string;

  // Capital Flow context (top-level filter)
  capitalFlowPhase: Phase | null;
  capitalFlowBias: LiquidityBias | null;
  capitalFlowDirection: 'entering' | 'stable' | 'exiting' | null;

  // Economic calendar
  economicCalendar: { shouldBlockTrade: boolean; blockReason?: string };

  // Forecast bands (for cross-validation)
  forecastBands?: ForecastBand[];
}

// ============================================================================
// RAG ORCHESTRATOR RESULT (FINAL OUTPUT)
// ============================================================================

export interface RAGEnrichmentResult {
  // Web Research
  research: WebResearchResult | null;

  // Forecast Bands (3 horizons)
  forecastBands: ForecastBandResult | null;

  // Multi-Strategy Plans (up to 4 strategies)
  strategies: MultiStrategyResult | null;

  // Validation of all plans (engine + strategies)
  validations: {
    enginePlan: PlanValidationResult | null;
    strategies: PlanValidationResult[];
  };

  // Aggregated citations from all sources
  citations: Citation[];

  // Capital Flow alignment check
  capitalFlowAlignment: {
    aligned: boolean;
    phase: Phase | null;
    bias: LiquidityBias | null;
    counterTrendPlans: string[];  // plan IDs that go against capital flow
    warning?: string;
  };

  // Meta
  mode: ResearchMode;
  enrichedAt: string;
  totalCostUsd: number;
}

// ============================================================================
// PLAN JSON SCHEMA (for LLM output validation)
// ============================================================================

export interface PlanJSON {
  schema_version: '1.0';
  symbol: string;
  asset_class: AssetClass;
  as_of: string;

  chart: {
    timeframe: string;
    last_price: number;
  };

  analysis: {
    bias: 'bullish' | 'bearish' | 'neutral';
    confidence: 'low' | 'medium' | 'high';
    strategy_types: StrategyType[];
    key_levels: {
      supports: number[];
      resistances: number[];
    };
    notes: string[];
    risk_events: string[];
  };

  trade_plans: Array<{
    id: string;
    name: string;
    direction: 'long' | 'short';
    entry: {
      type: 'market' | 'limit' | 'stop';
      zone: [number, number];
      trigger: string;
    };
    stop: {
      type: 'price';
      value: number;
      invalidation: string[];
    };
    take_profits: Array<{
      id: string;
      price: number;
      size_pct: number;
    }>;
    position_sizing: {
      risk_pct_of_equity: number;
      max_leverage: number;
    };
    management: {
      move_stop_to_be_after_tp1: boolean;
      time_stop?: string;
    };
    rationale: string[];
    risks: string[];
  }>;

  ai_forecast: {
    method: 'scenario_band';
    disclaimer: string;
    horizons: Array<{
      label: ForecastHorizon;
      horizon: string;
      p10: number;
      p50: number;
      p90: number;
      bias: 'up' | 'down' | 'sideways';
      drivers: string[];
      invalidations: string[];
    }>;
  };

  overlays: {
    chart_objects: Array<{
      type: 'hline' | 'box' | 'label';
      price?: number;
      y1?: number;
      y2?: number;
      style: Record<string, string>;
      label: string;
    }>;
  };

  citations: Array<{
    id: number;
    title: string;
    url: string;
    quote: string;
  }>;
}
