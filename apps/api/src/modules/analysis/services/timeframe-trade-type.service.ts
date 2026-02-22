/**
 * Timeframe → TradeType Mapping Service
 *
 * Single source-of-truth for converting a validated Timeframe value
 * into the correct TradeType for analysis and candle-count resolution.
 *
 * Mapping (per CLAUDE.md):
 *   Scalping  (1000 candles): 5m, 15m
 *   Day Trade (500 candles):  30m, 1h, 4h
 *   Swing     (250 candles):  1d
 */

import { Timeframe } from '../config/timeframe.enum';
import { TradeType, getCandleCountForTradeType } from '../config/trade-config';

// -------------------------------------------------------------------------
// Core mapping record — adding a new Timeframe forces a compile-time error
// if the mapping is not updated.
// -------------------------------------------------------------------------
export const TIMEFRAME_TRADE_TYPE_MAP: Record<Timeframe, TradeType> = {
  [Timeframe.FIVE_MIN]:    'scalping',
  [Timeframe.FIFTEEN_MIN]: 'scalping',
  [Timeframe.THIRTY_MIN]:  'dayTrade',
  [Timeframe.ONE_HOUR]:    'dayTrade',
  [Timeframe.FOUR_HOUR]:   'dayTrade',
  [Timeframe.ONE_DAY]:     'swing',
};

/**
 * Returns the TradeType for a validated Timeframe.
 */
export function getTradeTypeForTimeframe(timeframe: Timeframe): TradeType {
  return TIMEFRAME_TRADE_TYPE_MAP[timeframe];
}

/**
 * Returns the candle count for a validated Timeframe.
 */
export function getCandleCountForTimeframe(timeframe: Timeframe): number {
  return getCandleCountForTradeType(getTradeTypeForTimeframe(timeframe));
}

/**
 * Full resolution: returns both tradeType and candleCount for a Timeframe.
 */
export function resolveTimeframe(timeframe: Timeframe): {
  tradeType: TradeType;
  candleCount: number;
} {
  const tradeType = getTradeTypeForTimeframe(timeframe);
  return {
    tradeType,
    candleCount: getCandleCountForTradeType(tradeType),
  };
}
