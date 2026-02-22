/**
 * Bundle Selector — timeframe → IndicatorBundle factory
 *
 * Single entry point for bundle creation. Callers pass a Timeframe string
 * and receive the matching bundle instance.
 *
 * Mapping:
 *   5m, 15m       → ScalpingBundle  (~18 indicators)
 *   30m, 1h, 4h   → DayBundle       (~26 indicators)
 *   1d            → SwingBundle     (~25 indicators)
 */

import type { Timeframe } from '../config/timeframe.enum';
import type { IndicatorBundle, BundleType } from './indicator-bundle.interface';
import { getBundleType } from './indicator-bundle.interface';
import { ScalpingBundle } from './scalping.bundle';
import { DayBundle } from './day.bundle';
import { SwingBundle } from './swing.bundle';

/**
 * Returns the IndicatorBundle for the given timeframe.
 * Each call produces a fresh instance (stateless, no caching needed).
 */
export function selectBundle(timeframe: Timeframe): IndicatorBundle {
  const bundleType: BundleType = getBundleType(timeframe);

  switch (bundleType) {
    case 'scalping': return new ScalpingBundle();
    case 'day':      return new DayBundle();
    case 'swing':    return new SwingBundle();
  }
}

/**
 * Returns just the bundle type string without instantiating the bundle.
 * Useful for logging / metrics.
 */
export { getBundleType };
export type { BundleType };
