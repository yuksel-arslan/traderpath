/**
 * RAG Orchestrator
 *
 * Sequences all RAG sub-services and produces the final enrichment result.
 * This is the SINGLE entry point for the RAG layer.
 *
 * Pipeline:
 *   Capital Flow (top filter) → 7-Step Engine (truth) → RAG Orchestrator:
 *     1. Web Research  ─────┐ (parallel)
 *     2. Forecast Bands ────┤ (parallel)
 *                           ├→ 3. Multi-Strategy (depends on 2)
 *                           └→ 4. Validation (depends on 1, 2, 3)
 *                                  → Final Result
 *
 * If any sub-service fails, the orchestrator continues without it.
 * The analysis is NEVER blocked by RAG failures.
 */

import {
  RAGEnrichmentResult,
  ResearchMode,
  WebResearchResult,
  ForecastBandResult,
  MultiStrategyResult,
  PlanValidationResult,
  ValidationContext,
  Citation,
} from './types';
import { AssetClass } from '../analysis/types/asset-metrics.types';
import { Phase, LiquidityBias } from '../capital-flow/types';
import { webResearchService } from './web-research/web-research.service';
import { forecastBandService } from './forecast/forecast-band.service';
import { multiStrategyService } from './strategy/multi-strategy.service';
import { planValidationService } from './validation/plan-validation.service';

// ============================================================================
// RAG ORCHESTRATOR
// ============================================================================

class RAGOrchestrator {
  /**
   * Enrich an existing analysis with RAG layers
   *
   * @param symbol - Asset symbol
   * @param assetClass - Asset class
   * @param engineOutput - Output from the core analysis engine (READ ONLY)
   * @param mode - Research depth: fast (free) | news ($0.001) | deep ($0.005)
   */
  async enrichAnalysis(
    symbol: string,
    assetClass: AssetClass,
    engineOutput: {
      currentPrice: number;
      atr: number;
      direction: 'long' | 'short' | 'neutral';
      confidence: number;
      supports: number[];
      resistances: number[];
      rsi?: number;
      adx?: number;
      bbWidth?: number;
      trendStrength?: number;
      volume24hRatio?: number;
      macdHistogram?: number;
      // Existing engine trade plan (optional, null if WAIT/AVOID)
      tradePlan?: {
        direction: string;
        averageEntry: number;
        stopLoss: { price: number };
        takeProfits: Array<{ price: number }>;
        riskReward: number;
      } | null;
      // Existing news data from engine (reused, no extra API call)
      news?: {
        items: Array<{ title: string; url: string; source: string; publishedAt: Date; sentiment: string }>;
        sentiment: { overall: string; score: number };
      };
      // Existing economic calendar data
      economicCalendar?: {
        events: Array<{ title: string; impact: string }>;
        shouldBlockTrade: boolean;
        blockReason?: string;
      };
    },
    capitalFlowContext?: {
      phase: Phase;
      bias: LiquidityBias;
      direction: 'entering' | 'stable' | 'exiting' | null;
    },
    mode: ResearchMode = 'fast',
  ): Promise<RAGEnrichmentResult> {
    const startTime = Date.now();
    let totalCost = 0;

    // ── Step 1 & 2: Run in parallel ────────────────────────────────
    const [researchResult, forecastResult] = await Promise.allSettled([
      // 1. Web Research
      webResearchService.research(symbol, assetClass, mode, {
        capitalFlowContext: capitalFlowContext ? {
          bias: capitalFlowContext.bias,
          phase: capitalFlowContext.phase,
        } : undefined,
        existingNews: engineOutput.news,
        existingCalendar: engineOutput.economicCalendar,
      }),
      // 2. Forecast Bands
      forecastBandService.generateBands(
        symbol,
        assetClass,
        {
          currentPrice: engineOutput.currentPrice,
          atr: engineOutput.atr,
          direction: engineOutput.direction,
          confidence: engineOutput.confidence,
          capitalFlowPhase: capitalFlowContext?.phase,
          capitalFlowBias: capitalFlowContext?.bias,
          indicators: {
            rsi: engineOutput.rsi,
            macdHistogram: engineOutput.macdHistogram,
            adx: engineOutput.adx,
            bbWidth: engineOutput.bbWidth,
          },
          supports: engineOutput.supports,
          resistances: engineOutput.resistances,
        },
        mode === 'deep', // Only enhance with AI in deep mode
      ),
    ]);

    const research: WebResearchResult | null =
      researchResult.status === 'fulfilled' ? researchResult.value : null;
    const forecastBands: ForecastBandResult | null =
      forecastResult.status === 'fulfilled' ? forecastResult.value : null;

    if (research) totalCost += research.costUsd;

    // ── Step 3: Multi-Strategy (depends on forecast bands) ─────────
    let strategies: MultiStrategyResult | null = null;
    try {
      strategies = multiStrategyService.generate(
        symbol,
        assetClass,
        {
          currentPrice: engineOutput.currentPrice,
          atr: engineOutput.atr,
          direction: engineOutput.direction,
          confidence: engineOutput.confidence,
          supports: engineOutput.supports,
          resistances: engineOutput.resistances,
          rsi: engineOutput.rsi,
          adx: engineOutput.adx,
          bbWidth: engineOutput.bbWidth,
          trendStrength: engineOutput.trendStrength,
          volume24hRatio: engineOutput.volume24hRatio,
        },
        forecastBands?.bands,
        capitalFlowContext ? {
          phase: capitalFlowContext.phase,
          bias: capitalFlowContext.bias,
        } : undefined,
      );
    } catch (err) {
      console.warn('[RAG:Orchestrator] Multi-strategy generation failed:', err);
    }

    // ── Step 4: Validation (depends on all above) ──────────────────
    const validationContext: ValidationContext = {
      symbol,
      assetClass,
      currentPrice: engineOutput.currentPrice,
      atr: engineOutput.atr,
      volume24h: 0, // TODO: pass from engine
      marketRegime: '',
      capitalFlowPhase: capitalFlowContext?.phase || null,
      capitalFlowBias: capitalFlowContext?.bias || null,
      capitalFlowDirection: capitalFlowContext?.direction || null,
      economicCalendar: engineOutput.economicCalendar || { shouldBlockTrade: false },
      forecastBands: forecastBands?.bands,
    };

    // Validate engine trade plan
    let enginePlanValidation: PlanValidationResult | null = null;
    if (engineOutput.tradePlan) {
      try {
        enginePlanValidation = planValidationService.validateEnginePlan(
          engineOutput.tradePlan,
          validationContext,
        );
      } catch (err) {
        console.warn('[RAG:Orchestrator] Engine plan validation failed:', err);
      }
    }

    // Validate multi-strategy plans
    let strategyValidations: PlanValidationResult[] = [];
    if (strategies?.strategies.length) {
      try {
        strategyValidations = planValidationService.validateStrategies(
          strategies.strategies,
          validationContext,
        );
      } catch (err) {
        console.warn('[RAG:Orchestrator] Strategy validation failed:', err);
      }
    }

    // ── Aggregate citations ────────────────────────────────────────
    const allCitations: Citation[] = research?.citations || [];

    // ── Capital Flow alignment summary ─────────────────────────────
    const counterTrendPlans: string[] = [];
    if (strategies && capitalFlowContext) {
      for (const s of strategies.strategies) {
        if (s.label.includes('Counter-Flow')) {
          counterTrendPlans.push(s.id);
        }
      }
    }

    return {
      research,
      forecastBands,
      strategies,
      validations: {
        enginePlan: enginePlanValidation,
        strategies: strategyValidations,
      },
      citations: allCitations,
      capitalFlowAlignment: {
        aligned: counterTrendPlans.length === 0,
        phase: capitalFlowContext?.phase || null,
        bias: capitalFlowContext?.bias || null,
        counterTrendPlans,
        warning: counterTrendPlans.length > 0
          ? `${counterTrendPlans.length} plan(s) oppose current capital flow direction`
          : undefined,
      },
      mode,
      enrichedAt: new Date().toISOString(),
      totalCostUsd: totalCost,
    };
  }
}

// Singleton
export const ragOrchestrator = new RAGOrchestrator();
