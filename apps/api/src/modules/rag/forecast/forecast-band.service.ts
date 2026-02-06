/**
 * Forecast Band Service
 *
 * Generates P10/P50/P90 probability bands for 3 time horizons.
 * Uses ATR-based deterministic calculation (band-calculator.ts)
 * with optional Gemini enhancement for drivers/invalidations.
 *
 * IMPORTANT: This is NOT a price prediction system.
 * Bands represent statistical probability distributions.
 * The LLM only provides directional bias and narrative context.
 * Band widths are NEVER influenced by web content.
 */

import { redis } from '../../../core/cache';
import { callGeminiWithRetry } from '../../../core/gemini';
import {
  ForecastBand,
  ForecastBandResult,
  ForecastHorizon,
  ForecastMethodology,
  HORIZON_CONFIG,
} from '../types';
import { AssetClass } from '../../analysis/types/asset-metrics.types';
import { Phase, LiquidityBias } from '../../capital-flow/types';
import { calculateAllBands } from './band-calculator';

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_PREFIX = 'rag:forecast';
const CACHE_TTL = 300; // 5 minutes

const DISCLAIMER = 'These forecasts represent probabilistic scenarios based on historical volatility, not price predictions. Past performance does not guarantee future results. This is not investment advice.';

// ============================================================================
// FORECAST BAND SERVICE
// ============================================================================

class ForecastBandService {
  /**
   * Generate forecast bands for an asset
   *
   * @param symbol - Asset symbol
   * @param assetClass - Asset class for horizon mapping
   * @param engineData - Data from the core analysis engine (truth source)
   * @param enhanceWithAI - If true, uses Gemini to add drivers/invalidations
   */
  async generateBands(
    symbol: string,
    assetClass: AssetClass,
    engineData: {
      currentPrice: number;
      atr: number;
      direction: 'long' | 'short' | 'neutral';
      confidence: number;
      capitalFlowPhase?: Phase;
      capitalFlowBias?: LiquidityBias;
      indicators?: {
        rsi?: number;
        macdHistogram?: number;
        adx?: number;
        bbWidth?: number;
      };
      supports?: number[];
      resistances?: number[];
    },
    enhanceWithAI: boolean = false,
  ): Promise<ForecastBandResult> {
    const cacheKey = `${CACHE_PREFIX}:${symbol}:${assetClass}`;
    const cached = await this.getFromCache<ForecastBandResult>(cacheKey);
    if (cached) return cached;

    // Step 1: Generate mechanical ATR bands
    const mechanicalBands = calculateAllBands({
      currentPrice: engineData.currentPrice,
      atr: engineData.atr,
      direction: engineData.direction,
      confidence: engineData.confidence,
      assetClass,
      capitalFlowPhase: engineData.capitalFlowPhase,
    });

    // Step 2: Derive drivers and invalidations from engine data
    const enrichedBands = this.enrichWithEngineData(
      mechanicalBands,
      engineData,
      symbol,
      assetClass,
    );

    // Step 3: Optional Gemini enhancement (adds narrative, does NOT change prices)
    let finalBands = enrichedBands;
    if (enhanceWithAI) {
      try {
        finalBands = await this.enhanceWithGemini(enrichedBands, engineData, symbol, assetClass);
      } catch (err) {
        console.warn('[RAG:Forecast] Gemini enhancement failed, using mechanical bands:', err);
      }
    }

    // Step 4: Final validation (P10 < P50 < P90 always)
    finalBands = finalBands.map(b => this.validateBand(b));

    const result: ForecastBandResult = {
      symbol,
      assetClass,
      bands: finalBands,
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + CACHE_TTL * 1000).toISOString(),
    };

    await this.setCache(cacheKey, result, CACHE_TTL);
    return result;
  }

  // ============================================================================
  // ENRICHMENT
  // ============================================================================

  /**
   * Add drivers and invalidations based on engine indicator data
   */
  private enrichWithEngineData(
    bands: ForecastBand[],
    engineData: {
      direction: 'long' | 'short' | 'neutral';
      capitalFlowPhase?: Phase;
      capitalFlowBias?: LiquidityBias;
      indicators?: {
        rsi?: number;
        macdHistogram?: number;
        adx?: number;
        bbWidth?: number;
      };
      supports?: number[];
      resistances?: number[];
    },
    symbol: string,
    assetClass: AssetClass,
  ): ForecastBand[] {
    return bands.map(band => {
      const drivers: string[] = [];
      const invalidations: string[] = [];

      // Capital Flow drivers
      if (engineData.capitalFlowBias) {
        if (engineData.capitalFlowBias === 'risk_on') {
          drivers.push('Risk-on liquidity environment');
        } else if (engineData.capitalFlowBias === 'risk_off') {
          drivers.push('Risk-off capital rotation');
        }
      }

      if (engineData.capitalFlowPhase) {
        drivers.push(`${engineData.capitalFlowPhase.toUpperCase()} phase capital flow`);
      }

      // Technical drivers
      if (engineData.indicators) {
        const { rsi, macdHistogram, adx, bbWidth } = engineData.indicators;

        if (rsi != null) {
          if (rsi > 70) drivers.push(`Overbought RSI (${rsi.toFixed(0)})`);
          else if (rsi < 30) drivers.push(`Oversold RSI (${rsi.toFixed(0)})`);
        }

        if (macdHistogram != null) {
          if (macdHistogram > 0) drivers.push('Positive MACD momentum');
          else drivers.push('Negative MACD momentum');
        }

        if (adx != null && adx > 25) {
          drivers.push(`Strong trend (ADX ${adx.toFixed(0)})`);
        }

        if (bbWidth != null && bbWidth < 0.02) {
          drivers.push('Bollinger squeeze detected');
          invalidations.push('Breakout direction unclear');
        }
      }

      // S/R level invalidations
      if (engineData.supports?.length) {
        const nearestSupport = engineData.supports[0];
        invalidations.push(`Break below support at ${nearestSupport}`);
      }
      if (engineData.resistances?.length) {
        const nearestResistance = engineData.resistances[0];
        invalidations.push(`Rejection at resistance ${nearestResistance}`);
      }

      return {
        ...band,
        drivers: [...band.drivers, ...drivers].slice(0, 5),
        invalidations: [...band.invalidations, ...invalidations].slice(0, 4),
      };
    });
  }

  /**
   * Enhance bands with Gemini-generated narrative
   * IMPORTANT: Gemini does NOT change price levels, only adds context
   */
  private async enhanceWithGemini(
    bands: ForecastBand[],
    engineData: {
      currentPrice: number;
      direction: 'long' | 'short' | 'neutral';
      confidence: number;
      capitalFlowPhase?: Phase;
    },
    symbol: string,
    assetClass: AssetClass,
  ): Promise<ForecastBand[]> {
    const prompt = `You are a quantitative analyst. For ${symbol} (${assetClass}) at $${engineData.currentPrice}:

Direction: ${engineData.direction} (confidence: ${engineData.confidence}%)
Capital Flow Phase: ${engineData.capitalFlowPhase || 'unknown'}

For each horizon, provide ONLY drivers and invalidation conditions. Do NOT suggest price levels.

Respond in JSON:
{
  "short": { "drivers": ["driver1", "driver2"], "invalidations": ["inv1"] },
  "medium": { "drivers": ["driver1", "driver2"], "invalidations": ["inv1"] },
  "long": { "drivers": ["driver1", "driver2"], "invalidations": ["inv1"] }
}`;

    const response = await callGeminiWithRetry(prompt, { type: 'default', maxOutputTokens: 300 });

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return bands;

      const parsed = JSON.parse(jsonMatch[0]);

      return bands.map(band => {
        const horizonData = parsed[band.horizon];
        if (!horizonData) return band;

        return {
          ...band,
          drivers: [
            ...band.drivers,
            ...(Array.isArray(horizonData.drivers) ? horizonData.drivers.map(String) : []),
          ].slice(0, 5),
          invalidations: [
            ...band.invalidations,
            ...(Array.isArray(horizonData.invalidations) ? horizonData.invalidations.map(String) : []),
          ].slice(0, 4),
          methodology: 'gemini_enhanced' as ForecastMethodology,
        };
      });
    } catch {
      return bands;
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Ensure P10 < P50 < P90 and values are reasonable
   */
  private validateBand(band: ForecastBand): ForecastBand {
    let { p10, p50, p90, currentPrice } = band;

    // Ensure ordering
    if (p10 >= p50) p10 = p50 * 0.99;
    if (p90 <= p50) p90 = p50 * 1.01;

    // Ensure all positive
    if (p10 <= 0) p10 = currentPrice * 0.5;
    if (p50 <= 0) p50 = currentPrice;
    if (p90 <= 0) p90 = currentPrice * 1.5;

    // Sanity: bands shouldn't be wider than ±50% for short/medium
    const maxRange = band.horizon === 'long' ? 0.5 : 0.3;
    if ((p90 - p10) / currentPrice > maxRange * 2) {
      const halfRange = currentPrice * maxRange;
      p10 = Math.max(p10, p50 - halfRange);
      p90 = Math.min(p90, p50 + halfRange);
    }

    return {
      ...band,
      p10,
      p50,
      p90,
      confidenceWidth: p90 - p10,
      expectedRange: ((p90 - p10) / currentPrice) * 100,
      skew: ((p50 - currentPrice) / currentPrice) * 100,
    };
  }

  // ── Cache helpers ──────────────────────────────────────────────────

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async setCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch {
      // Non-blocking
    }
  }
}

// Singleton
export const forecastBandService = new ForecastBandService();
