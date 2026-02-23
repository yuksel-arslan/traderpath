/**
 * Indicator Bundle Interface (TASK 2.1)
 *
 * Each bundle encapsulates the set of indicators appropriate for a specific
 * trading style. Bundle selection is timeframe-driven — not hard-coded per step.
 *
 *   5m, 15m  → ScalpingBundle  (~16 indicators: fast, reactive)
 *   30m–4h   → DayBundle       (~26 indicators: balanced)
 *   1d       → SwingBundle     (~25 indicators: trend-focused)
 */

import type { OHLCV, IndicatorResult } from '../services/indicators.service';
import type { Timeframe } from '../config/timeframe.enum';

// ============================================================
// Bundle run input / output
// ============================================================

export interface BundleRunOptions {
  /** OHLCV candle data */
  ohlcv: OHLCV[];
  /** Trading timeframe (used for parameter scaling) */
  timeframe: Timeframe;
}

export interface BundleResult {
  /** Map of indicator name → result */
  indicators: Map<string, IndicatorResult>;
  /** Which bundle produced this result */
  bundleType: 'scalping' | 'day' | 'swing';
  /** Timeframe used */
  timeframe: Timeframe;
  /** Wall-clock time for the full run (ms) */
  calculationMs: number;
}

// ============================================================
// Core interface
// ============================================================

/**
 * An IndicatorBundle is a self-contained unit that knows:
 *   - Which indicators to calculate (`indicators` list)
 *   - How to run them (`run()`)
 *
 * New bundles are added by implementing this interface — no engine changes needed.
 */
export interface IndicatorBundle {
  /** Identifies which style this bundle is for */
  readonly bundleType: 'scalping' | 'day' | 'swing';

  /** Ordered list of indicator names this bundle will calculate */
  readonly indicators: readonly string[];

  /**
   * Calculate all bundle indicators against the provided OHLCV data.
   * Never throws — failed indicators produce `{ value: null }` results.
   */
  run(options: BundleRunOptions): Promise<BundleResult>;
}

// ============================================================
// Timeframe → bundle type helper (used by selectBundle)
// ============================================================

export type BundleType = 'scalping' | 'day' | 'swing';

export function getBundleType(timeframe: Timeframe): BundleType {
  switch (timeframe) {
    case '5m':
    case '15m':
      return 'scalping';
    case '30m':
    case '1h':
    case '4h':
      return 'day';
    case '1d':
      return 'swing';
    default:
      return 'day'; // safe fallback
  }
}
