/**
 * Unit tests — Indicator Bundle System (TASK 3.1)
 *
 * Covers:
 *   • getBundleType(): timeframe → BundleType mapping
 *   • selectBundle(): returns correct bundle instance
 *   • ScalpingBundle: correct indicators, bundleType, run() shape
 *   • DayBundle: correct indicators, bundleType, run() shape
 *   • SwingBundle: correct indicators, bundleType, run() shape
 *   • All bundles handle empty OHLCV gracefully (no throw)
 */

import { describe, it, expect } from 'vitest';
import {
  getBundleType,
  selectBundle,
  ScalpingBundle,
  DayBundle,
  SwingBundle,
  SCALPING_INDICATOR_NAMES,
  DAY_INDICATOR_NAMES,
  SWING_INDICATOR_NAMES,
} from '../bundles';
import type { BundleType } from '../bundles';
import { Timeframe } from '../config/timeframe.enum';
import type { OHLCV } from '../services/indicators.service';

// ---------------------------------------------------------------------------
// Minimal OHLCV fixture (enough for most indicators)
// ---------------------------------------------------------------------------

function makeCandles(count: number): OHLCV[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: Date.now() - (count - i) * 60_000,
    open:   100 + i,
    high:   105 + i,
    low:    98  + i,
    close:  102 + i,
    volume: 1000 + i * 10,
  }));
}

const CANDLES_50 = makeCandles(50);

// ---------------------------------------------------------------------------
// getBundleType
// ---------------------------------------------------------------------------

describe('getBundleType()', () => {
  it('maps 5m → scalping', () => {
    expect(getBundleType(Timeframe.FIVE_MIN)).toBe<BundleType>('scalping');
  });

  it('maps 15m → scalping', () => {
    expect(getBundleType(Timeframe.FIFTEEN_MIN)).toBe<BundleType>('scalping');
  });

  it('maps 30m → day', () => {
    expect(getBundleType(Timeframe.THIRTY_MIN)).toBe<BundleType>('day');
  });

  it('maps 1h → day', () => {
    expect(getBundleType(Timeframe.ONE_HOUR)).toBe<BundleType>('day');
  });

  it('maps 4h → day', () => {
    expect(getBundleType(Timeframe.FOUR_HOUR)).toBe<BundleType>('day');
  });

  it('maps 1d → swing', () => {
    expect(getBundleType(Timeframe.ONE_DAY)).toBe<BundleType>('swing');
  });
});

// ---------------------------------------------------------------------------
// selectBundle — returns correct class instance
// ---------------------------------------------------------------------------

describe('selectBundle()', () => {
  it('returns ScalpingBundle for 5m', () => {
    expect(selectBundle(Timeframe.FIVE_MIN)).toBeInstanceOf(ScalpingBundle);
  });

  it('returns ScalpingBundle for 15m', () => {
    expect(selectBundle(Timeframe.FIFTEEN_MIN)).toBeInstanceOf(ScalpingBundle);
  });

  it('returns DayBundle for 30m', () => {
    expect(selectBundle(Timeframe.THIRTY_MIN)).toBeInstanceOf(DayBundle);
  });

  it('returns DayBundle for 1h', () => {
    expect(selectBundle(Timeframe.ONE_HOUR)).toBeInstanceOf(DayBundle);
  });

  it('returns DayBundle for 4h', () => {
    expect(selectBundle(Timeframe.FOUR_HOUR)).toBeInstanceOf(DayBundle);
  });

  it('returns SwingBundle for 1d', () => {
    expect(selectBundle(Timeframe.ONE_DAY)).toBeInstanceOf(SwingBundle);
  });

  it('returns a fresh instance on each call (stateless)', () => {
    const a = selectBundle(Timeframe.ONE_HOUR);
    const b = selectBundle(Timeframe.ONE_HOUR);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// ScalpingBundle
// ---------------------------------------------------------------------------

describe('ScalpingBundle', () => {
  const bundle = new ScalpingBundle();

  it('has bundleType = scalping', () => {
    expect(bundle.bundleType).toBe('scalping');
  });

  it('has a non-empty indicators list', () => {
    expect(bundle.indicators.length).toBeGreaterThan(0);
  });

  it('includes ORDER_FLOW_IMBALANCE (critical for scalping)', () => {
    expect(SCALPING_INDICATOR_NAMES).toContain('ORDER_FLOW_IMBALANCE');
  });

  it('includes SPOOFING_DETECTION (manipulation detection)', () => {
    expect(SCALPING_INDICATOR_NAMES).toContain('SPOOFING_DETECTION');
  });

  it('does NOT include long-lag indicators (PSAR, DONCHIAN)', () => {
    expect(SCALPING_INDICATOR_NAMES).not.toContain('PSAR');
    expect(SCALPING_INDICATOR_NAMES).not.toContain('DONCHIAN');
  });

  it('run() resolves to BundleResult with correct shape', async () => {
    const result = await bundle.run({ ohlcv: CANDLES_50, timeframe: Timeframe.FIVE_MIN });
    expect(result.bundleType).toBe('scalping');
    expect(result.timeframe).toBe(Timeframe.FIVE_MIN);
    expect(result.indicators).toBeInstanceOf(Map);
    expect(typeof result.calculationMs).toBe('number');
  });

  it('run() never throws on minimal candle data', async () => {
    await expect(
      bundle.run({ ohlcv: makeCandles(5), timeframe: Timeframe.FIVE_MIN })
    ).resolves.not.toThrow();
  });

  it('run() never throws on empty candle data', async () => {
    await expect(
      bundle.run({ ohlcv: [], timeframe: Timeframe.FIVE_MIN })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// DayBundle
// ---------------------------------------------------------------------------

describe('DayBundle', () => {
  const bundle = new DayBundle();

  it('has bundleType = day', () => {
    expect(bundle.bundleType).toBe('day');
  });

  it('includes ICHIMOKU (important for day trading)', () => {
    expect(DAY_INDICATOR_NAMES).toContain('ICHIMOKU');
  });

  it('includes SQUEEZE (volatility regime)', () => {
    expect(DAY_INDICATOR_NAMES).toContain('SQUEEZE');
  });

  it('includes CMF (money flow confirmation)', () => {
    expect(DAY_INDICATOR_NAMES).toContain('CMF');
  });

  it('has more indicators than ScalpingBundle (broader analysis)', () => {
    expect(DAY_INDICATOR_NAMES.length).toBeGreaterThan(SCALPING_INDICATOR_NAMES.length);
  });

  it('run() resolves to BundleResult with correct bundleType', async () => {
    const result = await bundle.run({ ohlcv: CANDLES_50, timeframe: Timeframe.ONE_HOUR });
    expect(result.bundleType).toBe('day');
    expect(result.timeframe).toBe(Timeframe.ONE_HOUR);
  });

  it('run() never throws on empty candle data', async () => {
    await expect(
      bundle.run({ ohlcv: [], timeframe: Timeframe.ONE_HOUR })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SwingBundle
// ---------------------------------------------------------------------------

describe('SwingBundle', () => {
  const bundle = new SwingBundle();

  it('has bundleType = swing', () => {
    expect(bundle.bundleType).toBe('swing');
  });

  it('includes SMA (long-period trend confirmation for swing)', () => {
    expect(SWING_INDICATOR_NAMES).toContain('SMA');
  });

  it('includes PSAR (trailing stop for swing trades)', () => {
    expect(SWING_INDICATOR_NAMES).toContain('PSAR');
  });

  it('includes DONCHIAN (channel breakout detection)', () => {
    expect(SWING_INDICATOR_NAMES).toContain('DONCHIAN');
  });

  it('includes PVT (price-volume trend for swing)', () => {
    expect(SWING_INDICATOR_NAMES).toContain('PVT');
  });

  it('does NOT include SPOOFING_DETECTION (irrelevant at daily)', () => {
    expect(SWING_INDICATOR_NAMES).not.toContain('SPOOFING_DETECTION');
  });

  it('run() resolves to BundleResult with correct bundleType', async () => {
    const result = await bundle.run({ ohlcv: CANDLES_50, timeframe: Timeframe.ONE_DAY });
    expect(result.bundleType).toBe('swing');
    expect(result.timeframe).toBe(Timeframe.ONE_DAY);
  });

  it('run() never throws on empty candle data', async () => {
    await expect(
      bundle.run({ ohlcv: [], timeframe: Timeframe.ONE_DAY })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cross-bundle invariants
// ---------------------------------------------------------------------------

describe('Cross-bundle invariants', () => {
  it('all bundles implement the IndicatorBundle interface shape', () => {
    const bundles = [new ScalpingBundle(), new DayBundle(), new SwingBundle()];
    for (const b of bundles) {
      expect(typeof b.bundleType).toBe('string');
      expect(Array.isArray(b.indicators)).toBe(true);
      expect(typeof b.run).toBe('function');
    }
  });

  it('every bundle covers at least one momentum indicator', () => {
    const momentumIndicators = ['RSI', 'STOCHASTIC', 'STOCH_RSI', 'CCI', 'MFI', 'WILLIAMS_R'];
    for (const names of [SCALPING_INDICATOR_NAMES, DAY_INDICATOR_NAMES, SWING_INDICATOR_NAMES]) {
      const hasAtLeastOne = momentumIndicators.some(m => names.includes(m));
      expect(hasAtLeastOne).toBe(true);
    }
  });

  it('every bundle covers at least one volume indicator', () => {
    const volumeIndicators = ['OBV', 'VWAP', 'CMF', 'ORDER_FLOW_IMBALANCE', 'PVT'];
    for (const names of [SCALPING_INDICATOR_NAMES, DAY_INDICATOR_NAMES, SWING_INDICATOR_NAMES]) {
      const hasAtLeastOne = volumeIndicators.some(v => names.includes(v));
      expect(hasAtLeastOne).toBe(true);
    }
  });

  it('every bundle covers ATR (needed for stop-loss calculation)', () => {
    for (const names of [SCALPING_INDICATOR_NAMES, DAY_INDICATOR_NAMES, SWING_INDICATOR_NAMES]) {
      expect(names).toContain('ATR');
    }
  });

  it('every bundle covers CANDLESTICK_PATTERNS', () => {
    for (const names of [SCALPING_INDICATOR_NAMES, DAY_INDICATOR_NAMES, SWING_INDICATOR_NAMES]) {
      expect(names).toContain('CANDLESTICK_PATTERNS');
    }
  });

  it('all bundles return indicators Map from run()', async () => {
    const cases: [InstanceType<typeof ScalpingBundle | typeof DayBundle | typeof SwingBundle>, Timeframe][] = [
      [new ScalpingBundle(), Timeframe.FIVE_MIN],
      [new DayBundle(),      Timeframe.ONE_HOUR],
      [new SwingBundle(),    Timeframe.ONE_DAY],
    ];
    for (const [bundle, tf] of cases) {
      const result = await bundle.run({ ohlcv: CANDLES_50, timeframe: tf });
      expect(result.indicators).toBeInstanceOf(Map);
      expect(result.indicators.size).toBeGreaterThan(0);
    }
  });
});
