/**
 * DayBundle — 30m / 1h / 4h timeframes
 *
 * Philosophy: Balanced — momentum + trend + volume + advanced.
 * Standard periods (RSI-14, ATR-14). Full indicator suite minus
 * very-long-period swing indicators (SMA-200, PSAR, Donchian).
 */

import type { IndicatorBundle, BundleRunOptions, BundleResult } from './indicator-bundle.interface';
import { IndicatorsService } from '../services/indicators.service';

const svc = new IndicatorsService();

const DAY_INDICATORS: ReadonlyArray<{ name: string; params?: Record<string, number> }> = [
  // --- Momentum ---
  { name: 'RSI',          params: { period: 14 } },
  { name: 'STOCHASTIC',   params: { k: 14, d: 3, smooth: 3 } },
  { name: 'STOCH_RSI',    params: { period: 14, k: 3, d: 3 } },
  { name: 'CCI',          params: { period: 14 } },
  { name: 'WILLIAMS_R',   params: { period: 14 } },
  { name: 'MFI',          params: { period: 14 } },
  { name: 'TSI',          params: { longPeriod: 25, shortPeriod: 13, signalPeriod: 13 } },

  // --- Trend ---
  { name: 'EMA',          params: { period: 20 } },
  { name: 'EMA',          params: { period: 50 } },
  { name: 'EMA',          params: { period: 200 } },
  { name: 'MACD',         params: { fast: 12, slow: 26, signal: 9 } },
  { name: 'ADX',          params: { period: 14 } },
  { name: 'ICHIMOKU',     params: { tenkan: 9, kijun: 26, senkou: 52 } },
  { name: 'SUPERTREND',   params: { period: 10, multiplier: 3 } },
  { name: 'AROON',        params: { period: 25 } },
  { name: 'VWMA',         params: { period: 20 } },

  // --- Volatility ---
  { name: 'ATR',          params: { period: 14 } },
  { name: 'BOLLINGER',    params: { period: 20, stdDev: 2 } },
  { name: 'KELTNER',      params: { period: 20, atrPeriod: 14, multiplier: 2 } },
  { name: 'SQUEEZE' },
  { name: 'HISTORICAL_VOLATILITY', params: { period: 20 } },

  // --- Volume / Order Flow ---
  { name: 'VWAP' },
  { name: 'OBV' },
  { name: 'CMF',          params: { period: 20 } },
  { name: 'FORCE_INDEX',  params: { period: 13 } },
  { name: 'RELATIVE_VOLUME', params: { period: 20 } },
  { name: 'ORDER_FLOW_IMBALANCE' },

  // --- Advanced ---
  { name: 'WHALE_ACTIVITY' },
  { name: 'LIQUIDITY_SCORE' },
  { name: 'SLIPPAGE_ESTIMATE', params: { orderSize: 10000 } },

  // --- Patterns ---
  { name: 'CANDLESTICK_PATTERNS' },
] as const;

export const DAY_INDICATOR_NAMES: readonly string[] = DAY_INDICATORS.map(i => i.name);

export class DayBundle implements IndicatorBundle {
  readonly bundleType = 'day' as const;
  readonly indicators = DAY_INDICATOR_NAMES;

  async run({ ohlcv, timeframe }: BundleRunOptions): Promise<BundleResult> {
    const start = Date.now();
    const results = new Map<string, import('../services/indicators.service').IndicatorResult>();

    for (const { name, params } of DAY_INDICATORS) {
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
      bundleType: 'day',
      timeframe,
      calculationMs: Date.now() - start,
    };
  }
}
