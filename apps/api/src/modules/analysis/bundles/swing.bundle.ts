/**
 * SwingBundle — 1d timeframe
 *
 * Philosophy: Trend-focused, long-period indicators.
 * Full EMA stack (20/50/200), SMA crossovers, Ichimoku with daily settings.
 * Less order-flow focus (noisy at daily); more trend confirmation.
 */

import type { IndicatorBundle, BundleRunOptions, BundleResult } from './indicator-bundle.interface';
import { IndicatorsService } from '../services/indicators.service';

const svc = new IndicatorsService();

const SWING_INDICATORS: ReadonlyArray<{ name: string; params?: Record<string, number> }> = [
  // --- Momentum (standard periods) ---
  { name: 'RSI',          params: { period: 14 } },
  { name: 'MACD',         params: { fast: 12, slow: 26, signal: 9 } },
  { name: 'STOCHASTIC',   params: { k: 14, d: 3, smooth: 3 } },
  { name: 'CCI',          params: { period: 20 } },
  { name: 'MFI',          params: { period: 14 } },
  { name: 'TSI',          params: { longPeriod: 25, shortPeriod: 13, signalPeriod: 13 } },
  { name: 'ULTIMATE',     params: { short: 7, medium: 14, long: 28 } },

  // --- Trend (full stack for swing) ---
  { name: 'EMA',          params: { period: 20 } },
  { name: 'EMA',          params: { period: 50 } },
  { name: 'EMA',          params: { period: 200 } },
  { name: 'SMA',          params: { period: 50 } },
  { name: 'SMA',          params: { period: 200 } },
  { name: 'ADX',          params: { period: 14 } },
  { name: 'ICHIMOKU',     params: { tenkan: 9, kijun: 26, senkou: 52 } },
  { name: 'PSAR',         params: { af: 0.02, maxAf: 0.2 } },
  { name: 'AROON',        params: { period: 25 } },
  { name: 'VWMA',         params: { period: 20 } },

  // --- Volatility ---
  { name: 'ATR',          params: { period: 14 } },
  { name: 'BOLLINGER',    params: { period: 20, stdDev: 2 } },
  { name: 'DONCHIAN',     params: { period: 20 } },
  { name: 'HISTORICAL_VOLATILITY', params: { period: 20 } },

  // --- Volume (macro-level only) ---
  { name: 'OBV' },
  { name: 'CMF',          params: { period: 20 } },
  { name: 'PVT' },
  { name: 'AD' },
  { name: 'EOM',          params: { period: 14 } },

  // --- Advanced ---
  { name: 'WHALE_ACTIVITY' },
  { name: 'LIQUIDITY_SCORE' },

  // --- Patterns ---
  { name: 'CANDLESTICK_PATTERNS' },
] as const;

export const SWING_INDICATOR_NAMES: readonly string[] = SWING_INDICATORS.map(i => i.name);

export class SwingBundle implements IndicatorBundle {
  readonly bundleType = 'swing' as const;
  readonly indicators = SWING_INDICATOR_NAMES;

  async run({ ohlcv, timeframe }: BundleRunOptions): Promise<BundleResult> {
    const start = Date.now();
    const results = new Map<string, import('../services/indicators.service').IndicatorResult>();

    for (const { name, params } of SWING_INDICATORS) {
      try {
        const key = params?.period ? `${name}_${params.period}` : name;
        const result = svc.calculateIndicator(name, ohlcv, params);
        results.set(key, result ?? { name, value: null });
      } catch {
        const key = params?.period ? `${name}_${params.period}` : name;
        results.set(key, { name, value: null });
      }
    }

    return {
      indicators: results,
      bundleType: 'swing',
      timeframe,
      calculationMs: Date.now() - start,
    };
  }
}
