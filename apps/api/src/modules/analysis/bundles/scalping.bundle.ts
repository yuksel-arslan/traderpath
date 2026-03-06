/**
 * ScalpingBundle — 5m / 15m timeframes
 *
 * Philosophy: Fast, reactive indicators only.
 * Short periods, order-flow focus, manipulation detection.
 * Ichimoku and slow trend indicators are excluded (too much lag for scalping).
 */

import type { IndicatorBundle, BundleRunOptions, BundleResult } from './indicator-bundle.interface';
import { IndicatorsService } from '../services/indicators.service';
import { buildCacheKey, getCached, setCached } from './bundle-cache';

const svc = new IndicatorsService();

/** Indicator name → params map for ScalpingBundle */
const SCALPING_INDICATORS: ReadonlyArray<{ name: string; params?: Record<string, number> }> = [
  // --- Momentum (short periods) ---
  { name: 'RSI',          params: { period: 9 } },
  { name: 'STOCH_RSI',    params: { period: 9, k: 3, d: 3 } },
  { name: 'WILLIAMS_R',   params: { period: 9 } },
  { name: 'ROC',          params: { period: 6 } },

  // --- Trend (fast EMAs + MACD short-cycle) ---
  { name: 'EMA',          params: { period: 9 } },
  { name: 'EMA',          params: { period: 21 } },
  { name: 'MACD',         params: { fast: 5, slow: 13, signal: 5 } },
  { name: 'SUPERTREND',   params: { period: 7, multiplier: 3 } },

  // --- Volatility ---
  { name: 'ATR',          params: { period: 7 } },
  { name: 'BOLLINGER',    params: { period: 14, stdDev: 2 } },
  { name: 'KELTNER',      params: { period: 14, atrPeriod: 7, multiplier: 1.5 } },

  // --- Volume / Order Flow ---
  { name: 'VWAP' },
  { name: 'OBV' },
  { name: 'VOLUME_SPIKE', params: { threshold: 2.0 } },
  { name: 'ORDER_FLOW_IMBALANCE' },

  // --- Advanced (manipulation detection critical at low TF) ---
  { name: 'SPOOFING_DETECTION' },
  { name: 'BID_ASK_SPREAD' },

  // --- Candlestick patterns ---
  { name: 'CANDLESTICK_PATTERNS' },

  // --- Fibonacci (scalping'de Elliott Wave gereksiz - uzun vadeli yapı) ---
  { name: 'FIBONACCI' },
] as const;

export const SCALPING_INDICATOR_NAMES: readonly string[] = SCALPING_INDICATORS.map(i => i.name);

export class ScalpingBundle implements IndicatorBundle {
  readonly bundleType = 'scalping' as const;
  readonly indicators = SCALPING_INDICATOR_NAMES;

  async run({ ohlcv, timeframe }: BundleRunOptions): Promise<BundleResult> {
    const cacheKey = buildCacheKey('scalping', ohlcv);
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached) return { ...cached, timeframe };
    }

    const start = Date.now();
    const results = new Map<string, import('../services/indicators.service').IndicatorResult>();

    for (const { name, params } of SCALPING_INDICATORS) {
      try {
        // Disambiguate duplicate names (EMA_9, EMA_21) so the map key is unique
        const key = params?.period ? `${name}_${params.period}` : name;
        const result = svc.calculateIndicator(name, ohlcv, params);
        results.set(key, result ?? { name, value: null });
      } catch {
        const key = params?.period ? `${name}_${params.period}` : name;
        results.set(key, { name, value: null });
      }
    }

    const bundleResult: BundleResult = {
      indicators: results,
      bundleType: 'scalping',
      timeframe,
      calculationMs: Date.now() - start,
    };
    if (cacheKey) setCached(cacheKey, bundleResult);
    return bundleResult;
  }
}
