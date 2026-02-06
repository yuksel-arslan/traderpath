/**
 * Multi-Strategy Plan Generator
 *
 * Generates up to 4 alternative strategies for each analysis:
 *   1. Breakout
 *   2. Pullback
 *   3. Trend Following
 *   4. Range / Mean-Reversion
 *
 * The existing engine trade plan remains the PRIMARY recommendation.
 * These strategies are ALTERNATIVES presented alongside it.
 *
 * Capital Flow aware: Strategies that oppose the capital flow direction
 * are marked as "Counter-Trend / High Risk".
 */

import {
  StrategyPlan,
  StrategyType,
  MultiStrategyResult,
  ForecastBand,
  STRATEGY_WEIGHTS,
} from '../types';
import { AssetClass } from '../../analysis/types/asset-metrics.types';
import { Phase, LiquidityBias } from '../../capital-flow/types';
import { generateBreakoutPlan } from './strategies/breakout.strategy';
import { generatePullbackPlan } from './strategies/pullback.strategy';
import { generateTrendFollowingPlan } from './strategies/trend-following.strategy';
import { generateRangePlan } from './strategies/range.strategy';

// ============================================================================
// MULTI-STRATEGY SERVICE
// ============================================================================

class MultiStrategyService {
  /**
   * Generate all applicable strategy plans
   *
   * @param engineData - Data from the core analysis engine (truth source)
   * @param forecastBands - ATR-based forecast bands for target computation
   * @param capitalFlowContext - Capital flow data for alignment checks
   */
  generate(
    symbol: string,
    assetClass: AssetClass,
    engineData: {
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
    },
    forecastBands?: ForecastBand[],
    capitalFlowContext?: {
      phase: Phase;
      bias: LiquidityBias;
    },
  ): MultiStrategyResult {
    const strategies: StrategyPlan[] = [];
    const direction = engineData.direction === 'neutral' ? 'long' : engineData.direction;

    // Get short and medium term bands
    const shortBand = forecastBands?.find(b => b.horizon === 'short');
    const mediumBand = forecastBands?.find(b => b.horizon === 'medium');

    // ── Generate each strategy ─────────────────────────────────────

    // 1. Breakout
    try {
      const breakout = generateBreakoutPlan({
        symbol,
        currentPrice: engineData.currentPrice,
        atr: engineData.atr,
        direction,
        supports: engineData.supports,
        resistances: engineData.resistances,
        forecastBand: shortBand,
        adx: engineData.adx,
        bbWidth: engineData.bbWidth,
        volume24hRatio: engineData.volume24hRatio,
      });
      // Apply asset class weight
      breakout.applicability = Math.round(breakout.applicability * STRATEGY_WEIGHTS[assetClass].breakout);
      strategies.push(breakout);
    } catch (err) {
      console.warn('[RAG:Strategy] Breakout generation failed:', err);
    }

    // 2. Pullback
    try {
      const pullback = generatePullbackPlan({
        symbol,
        currentPrice: engineData.currentPrice,
        atr: engineData.atr,
        direction,
        supports: engineData.supports,
        resistances: engineData.resistances,
        forecastBand: mediumBand,
        rsi: engineData.rsi,
        adx: engineData.adx,
        trendStrength: engineData.trendStrength,
      });
      pullback.applicability = Math.round(pullback.applicability * STRATEGY_WEIGHTS[assetClass].pullback);
      strategies.push(pullback);
    } catch (err) {
      console.warn('[RAG:Strategy] Pullback generation failed:', err);
    }

    // 3. Trend Following
    try {
      const trendFollow = generateTrendFollowingPlan({
        symbol,
        currentPrice: engineData.currentPrice,
        atr: engineData.atr,
        direction,
        supports: engineData.supports,
        resistances: engineData.resistances,
        forecastBand: mediumBand,
        adx: engineData.adx,
        rsi: engineData.rsi,
        trendStrength: engineData.trendStrength,
        capitalFlowPhase: capitalFlowContext?.phase,
      });
      trendFollow.applicability = Math.round(trendFollow.applicability * STRATEGY_WEIGHTS[assetClass].trend_following);
      strategies.push(trendFollow);
    } catch (err) {
      console.warn('[RAG:Strategy] Trend-following generation failed:', err);
    }

    // 4. Range / Mean-Reversion
    try {
      const range = generateRangePlan({
        symbol,
        currentPrice: engineData.currentPrice,
        atr: engineData.atr,
        direction,
        supports: engineData.supports,
        resistances: engineData.resistances,
        forecastBand: shortBand,
        adx: engineData.adx,
        rsi: engineData.rsi,
        bbWidth: engineData.bbWidth,
      });
      range.applicability = Math.round(range.applicability * STRATEGY_WEIGHTS[assetClass].range);
      strategies.push(range);
    } catch (err) {
      console.warn('[RAG:Strategy] Range generation failed:', err);
    }

    // ── Capital Flow alignment check ───────────────────────────────
    if (capitalFlowContext) {
      for (const strategy of strategies) {
        const isCounterTrend = this.isCounterCapitalFlow(
          strategy.direction,
          capitalFlowContext.bias,
          capitalFlowContext.phase,
        );

        if (isCounterTrend) {
          strategy.label = `${strategy.label} ⚠️ Counter-Flow`;
          strategy.applicability = Math.max(0, strategy.applicability - 20);
          strategy.risks.push('This strategy opposes the current capital flow direction');
          strategy.description += ' [HIGH RISK: Counter to capital flow]';
        }
      }
    }

    // ── Sort by applicability and pick recommended ──────────────────
    strategies.sort((a, b) => b.applicability - a.applicability);
    const recommended = strategies[0]?.type || 'trend_following';
    const recommendedReason = strategies[0]
      ? `${strategies[0].label} has the highest applicability (${strategies[0].applicability}%) based on current market conditions`
      : 'No clear strategy preference';

    return {
      symbol,
      assetClass,
      currentPrice: engineData.currentPrice,
      direction: engineData.direction,
      strategies,
      recommended,
      recommendedReason,
    };
  }

  // ============================================================================
  // CAPITAL FLOW ALIGNMENT
  // ============================================================================

  /**
   * Check if a strategy direction opposes capital flow
   */
  private isCounterCapitalFlow(
    strategyDirection: 'long' | 'short',
    bias: LiquidityBias,
    phase: Phase,
  ): boolean {
    // LONG in risk-off + EXIT phase = counter-trend
    if (strategyDirection === 'long' && bias === 'risk_off' && phase === 'exit') {
      return true;
    }

    // SHORT in risk-on + EARLY phase = counter-trend
    if (strategyDirection === 'short' && bias === 'risk_on' && phase === 'early') {
      return true;
    }

    // LONG in EXIT phase = dangerous
    if (strategyDirection === 'long' && phase === 'exit') {
      return true;
    }

    return false;
  }
}

// Singleton
export const multiStrategyService = new MultiStrategyService();
