/**
 * Timeframe Enum — Standardized timeframes accepted by the API
 *
 * Accepted: 5m, 15m, 30m, 1h, 4h, 1d
 * Removed:  2h (merged into dayTrade group), 1W/1w (weekly removed)
 */

export enum Timeframe {
  FIVE_MIN    = '5m',
  FIFTEEN_MIN = '15m',
  THIRTY_MIN  = '30m',
  ONE_HOUR    = '1h',
  FOUR_HOUR   = '4h',
  ONE_DAY     = '1d',
}

/** Ordered list of all valid timeframe values */
export const VALID_TIMEFRAMES: readonly Timeframe[] = [
  Timeframe.FIVE_MIN,
  Timeframe.FIFTEEN_MIN,
  Timeframe.THIRTY_MIN,
  Timeframe.ONE_HOUR,
  Timeframe.FOUR_HOUR,
  Timeframe.ONE_DAY,
] as const;

/**
 * Returns true when the raw string is a valid Timeframe enum value.
 */
export function isValidTimeframe(value: string): value is Timeframe {
  return (VALID_TIMEFRAMES as readonly string[]).includes(value);
}

/**
 * Parses an incoming string to a Timeframe or throws VALIDATION_ERROR.
 */
export function parseTimeframe(value: string): Timeframe {
  if (!isValidTimeframe(value)) {
    const err = new Error(
      `VALIDATION_ERROR: Invalid timeframe '${value}'. Accepted: ${VALID_TIMEFRAMES.join(', ')}`,
    );
    (err as NodeJS.ErrnoException).code = 'VALIDATION_ERROR';
    throw err;
  }
  return value;
}
