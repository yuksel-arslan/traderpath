/**
 * Unit tests — Timeframe standardisation
 *
 * Covers:
 *   • Timeframe enum values
 *   • isValidTimeframe / parseTimeframe
 *   • TradeType mapping service
 *   • getTradeTypeFromInterval (trade-config)
 *   • validateTimeframe / validateTimeframeBody middleware
 */

import { describe, it, expect, vi } from 'vitest';
import {
  Timeframe,
  VALID_TIMEFRAMES,
  isValidTimeframe,
  parseTimeframe,
} from '../config/timeframe.enum';
import {
  TIMEFRAME_TRADE_TYPE_MAP,
  getTradeTypeForTimeframe,
  getCandleCountForTimeframe,
  resolveTimeframe,
} from '../services/timeframe-trade-type.service';
import { getTradeTypeFromInterval } from '../config/trade-config';
import {
  validateTimeframe,
  validateTimeframeBody,
} from '../middleware/timeframe-validation.middleware';

// ---------------------------------------------------------------------------
// Helpers to create mock Fastify request / reply objects
// ---------------------------------------------------------------------------

function makeQueryRequest(interval?: string) {
  return { query: interval !== undefined ? { interval } : {} } as any;
}

function makeBodyRequest(interval?: string) {
  return {
    body: interval !== undefined ? { interval } : {},
  } as any;
}

function makeReply() {
  const reply = {
    _status: 0,
    _body: undefined as any,
    status(code: number) {
      this._status = code;
      return this;
    },
    send(body: any) {
      this._body = body;
      return this;
    },
  };
  return reply;
}

// ===========================================================================
// 1. Timeframe Enum
// ===========================================================================
describe('Timeframe enum', () => {
  it('should have exactly 6 values', () => {
    expect(Object.values(Timeframe)).toHaveLength(6);
  });

  it('enum values match the spec', () => {
    expect(Timeframe.FIVE_MIN).toBe('5m');
    expect(Timeframe.FIFTEEN_MIN).toBe('15m');
    expect(Timeframe.THIRTY_MIN).toBe('30m');
    expect(Timeframe.ONE_HOUR).toBe('1h');
    expect(Timeframe.FOUR_HOUR).toBe('4h');
    expect(Timeframe.ONE_DAY).toBe('1d');
  });

  it('VALID_TIMEFRAMES contains all 6 enum values', () => {
    expect(VALID_TIMEFRAMES).toHaveLength(6);
    for (const tf of Object.values(Timeframe)) {
      expect(VALID_TIMEFRAMES).toContain(tf);
    }
  });

  it('VALID_TIMEFRAMES does NOT contain removed timeframes', () => {
    const removed = ['2h', '1W', '1w', '1D', '1m'];
    for (const bad of removed) {
      expect(VALID_TIMEFRAMES).not.toContain(bad);
    }
  });
});

// ===========================================================================
// 2. isValidTimeframe
// ===========================================================================
describe('isValidTimeframe()', () => {
  it.each(Object.values(Timeframe) as string[])(
    'returns true for valid timeframe "%s"',
    (tf) => {
      expect(isValidTimeframe(tf)).toBe(true);
    },
  );

  it.each(['2h', '1W', '1w', '1D', '1m', '', 'foo', '0', '5M', '1H'])(
    'returns false for invalid value "%s"',
    (bad) => {
      expect(isValidTimeframe(bad)).toBe(false);
    },
  );
});

// ===========================================================================
// 3. parseTimeframe
// ===========================================================================
describe('parseTimeframe()', () => {
  it.each(Object.values(Timeframe) as string[])(
    'parses valid timeframe "%s" without throwing',
    (tf) => {
      expect(parseTimeframe(tf)).toBe(tf);
    },
  );

  it.each(['2h', '1W', '1w', '1m', 'bad'])(
    'throws VALIDATION_ERROR for invalid value "%s"',
    (bad) => {
      expect(() => parseTimeframe(bad)).toThrow();
      try {
        parseTimeframe(bad);
      } catch (err: any) {
        expect(err.message).toMatch('VALIDATION_ERROR');
        expect(err.code).toBe('VALIDATION_ERROR');
      }
    },
  );
});

// ===========================================================================
// 4. TradeType mapping service
// ===========================================================================
describe('TIMEFRAME_TRADE_TYPE_MAP', () => {
  it('maps 5m → scalping', () => {
    expect(TIMEFRAME_TRADE_TYPE_MAP[Timeframe.FIVE_MIN]).toBe('scalping');
  });
  it('maps 15m → scalping', () => {
    expect(TIMEFRAME_TRADE_TYPE_MAP[Timeframe.FIFTEEN_MIN]).toBe('scalping');
  });
  it('maps 30m → dayTrade', () => {
    expect(TIMEFRAME_TRADE_TYPE_MAP[Timeframe.THIRTY_MIN]).toBe('dayTrade');
  });
  it('maps 1h → dayTrade', () => {
    expect(TIMEFRAME_TRADE_TYPE_MAP[Timeframe.ONE_HOUR]).toBe('dayTrade');
  });
  it('maps 4h → dayTrade', () => {
    expect(TIMEFRAME_TRADE_TYPE_MAP[Timeframe.FOUR_HOUR]).toBe('dayTrade');
  });
  it('maps 1d → swing', () => {
    expect(TIMEFRAME_TRADE_TYPE_MAP[Timeframe.ONE_DAY]).toBe('swing');
  });
  it('covers all Timeframe enum values', () => {
    for (const tf of Object.values(Timeframe) as Timeframe[]) {
      expect(TIMEFRAME_TRADE_TYPE_MAP[tf]).toBeDefined();
    }
  });
});

describe('getTradeTypeForTimeframe()', () => {
  it('returns scalping for 5m', () => {
    expect(getTradeTypeForTimeframe(Timeframe.FIVE_MIN)).toBe('scalping');
  });
  it('returns scalping for 15m', () => {
    expect(getTradeTypeForTimeframe(Timeframe.FIFTEEN_MIN)).toBe('scalping');
  });
  it('returns dayTrade for 30m', () => {
    expect(getTradeTypeForTimeframe(Timeframe.THIRTY_MIN)).toBe('dayTrade');
  });
  it('returns dayTrade for 1h', () => {
    expect(getTradeTypeForTimeframe(Timeframe.ONE_HOUR)).toBe('dayTrade');
  });
  it('returns dayTrade for 4h', () => {
    expect(getTradeTypeForTimeframe(Timeframe.FOUR_HOUR)).toBe('dayTrade');
  });
  it('returns swing for 1d', () => {
    expect(getTradeTypeForTimeframe(Timeframe.ONE_DAY)).toBe('swing');
  });
});

describe('getCandleCountForTimeframe()', () => {
  it('scalping timeframes return 1000 candles', () => {
    expect(getCandleCountForTimeframe(Timeframe.FIVE_MIN)).toBe(1000);
    expect(getCandleCountForTimeframe(Timeframe.FIFTEEN_MIN)).toBe(1000);
  });
  it('dayTrade timeframes return 500 candles', () => {
    expect(getCandleCountForTimeframe(Timeframe.THIRTY_MIN)).toBe(500);
    expect(getCandleCountForTimeframe(Timeframe.ONE_HOUR)).toBe(500);
    expect(getCandleCountForTimeframe(Timeframe.FOUR_HOUR)).toBe(500);
  });
  it('swing timeframe returns 250 candles', () => {
    expect(getCandleCountForTimeframe(Timeframe.ONE_DAY)).toBe(250);
  });
});

describe('resolveTimeframe()', () => {
  it('returns correct tradeType and candleCount for each timeframe', () => {
    const cases: [Timeframe, string, number][] = [
      [Timeframe.FIVE_MIN,    'scalping', 1000],
      [Timeframe.FIFTEEN_MIN, 'scalping', 1000],
      [Timeframe.THIRTY_MIN,  'dayTrade', 500],
      [Timeframe.ONE_HOUR,    'dayTrade', 500],
      [Timeframe.FOUR_HOUR,   'dayTrade', 500],
      [Timeframe.ONE_DAY,     'swing',    250],
    ];
    for (const [tf, expectedTrade, expectedCandles] of cases) {
      const result = resolveTimeframe(tf);
      expect(result.tradeType).toBe(expectedTrade);
      expect(result.candleCount).toBe(expectedCandles);
    }
  });
});

// ===========================================================================
// 5. getTradeTypeFromInterval (trade-config)
// ===========================================================================
describe('getTradeTypeFromInterval()', () => {
  it.each([
    ['5m',  'scalping'],
    ['15m', 'scalping'],
    ['30m', 'dayTrade'],
    ['1h',  'dayTrade'],
    ['4h',  'dayTrade'],
    ['1d',  'swing'],
  ])('"%s" → %s', (interval, expected) => {
    expect(getTradeTypeFromInterval(interval)).toBe(expected);
  });

  it('returns dayTrade for unknown/legacy intervals (safe default)', () => {
    expect(getTradeTypeFromInterval('2h')).toBe('dayTrade');
    expect(getTradeTypeFromInterval('1W')).toBe('dayTrade');
    expect(getTradeTypeFromInterval('1w')).toBe('dayTrade');
    expect(getTradeTypeFromInterval('1D')).toBe('dayTrade');
    expect(getTradeTypeFromInterval('unknown')).toBe('dayTrade');
  });
});

// ===========================================================================
// 6. validateTimeframe middleware (query-based)
// ===========================================================================
describe('validateTimeframe middleware', () => {
  it('passes through when interval is absent', async () => {
    const req = makeQueryRequest(undefined);
    const reply = makeReply();
    await validateTimeframe(req, reply as any);
    expect(reply._status).toBe(0);   // not called
    expect(reply._body).toBeUndefined();
  });

  it.each(Object.values(Timeframe) as string[])(
    'passes through for valid interval "%s"',
    async (tf) => {
      const req = makeQueryRequest(tf);
      const reply = makeReply();
      await validateTimeframe(req, reply as any);
      expect(reply._status).toBe(0);
      expect(reply._body).toBeUndefined();
    },
  );

  it.each(['2h', '1W', '1w', '1m', 'bad', '5M'])(
    'returns 400 VALIDATION_ERROR for invalid interval "%s"',
    async (bad) => {
      const req = makeQueryRequest(bad);
      const reply = makeReply();
      await validateTimeframe(req, reply as any);
      expect(reply._status).toBe(400);
      expect(reply._body.success).toBe(false);
      expect(reply._body.error).toBe('VALIDATION_ERROR');
      expect(reply._body.message).toContain(bad);
    },
  );
});

// ===========================================================================
// 7. validateTimeframeBody middleware (body-based)
// ===========================================================================
describe('validateTimeframeBody middleware', () => {
  it('passes through when body has no interval', async () => {
    const req = makeBodyRequest(undefined);
    const reply = makeReply();
    await validateTimeframeBody(req, reply as any);
    expect(reply._status).toBe(0);
  });

  it.each(Object.values(Timeframe) as string[])(
    'passes through for valid body interval "%s"',
    async (tf) => {
      const req = makeBodyRequest(tf);
      const reply = makeReply();
      await validateTimeframeBody(req, reply as any);
      expect(reply._status).toBe(0);
    },
  );

  it.each(['2h', '1W', '1w', '1m', 'nope'])(
    'returns 400 VALIDATION_ERROR for invalid body interval "%s"',
    async (bad) => {
      const req = makeBodyRequest(bad);
      const reply = makeReply();
      await validateTimeframeBody(req, reply as any);
      expect(reply._status).toBe(400);
      expect(reply._body.error).toBe('VALIDATION_ERROR');
    },
  );

  it('passes through when body is undefined', async () => {
    const req = { body: undefined } as any;
    const reply = makeReply();
    await validateTimeframeBody(req, reply as any);
    expect(reply._status).toBe(0);
  });
});
