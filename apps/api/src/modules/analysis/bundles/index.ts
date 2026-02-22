/**
 * Indicator Bundle System — barrel export
 *
 * Usage:
 *   import { selectBundle, getBundleType } from './bundles';
 *   const bundle = selectBundle(timeframe);
 *   const result = await bundle.run({ ohlcv, timeframe });
 */

export type { IndicatorBundle, BundleResult, BundleRunOptions, BundleType } from './indicator-bundle.interface';
export { getBundleType } from './indicator-bundle.interface';

export { ScalpingBundle, SCALPING_INDICATOR_NAMES } from './scalping.bundle';
export { DayBundle, DAY_INDICATOR_NAMES } from './day.bundle';
export { SwingBundle, SWING_INDICATOR_NAMES } from './swing.bundle';

export { selectBundle } from './bundle-selector';
