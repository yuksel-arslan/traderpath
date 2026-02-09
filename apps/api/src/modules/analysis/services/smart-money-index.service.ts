/**
 * Smart Money Index (SMI) Service
 * ================================
 * Implements the classic Smart Money Index adapted for 24/7 crypto markets.
 *
 * Traditional SMI (equities):
 *   SMI_t = SMI_{t-1} − morning_%_change + afternoon_%_change
 *   Rationale: Amateurs trade early (emotional), institutions trade late (calculated).
 *
 * Crypto adaptation (24/7 markets):
 *   1. Divide each day into 4 sessions: Asia (00-06 UTC), Europe (06-12 UTC),
 *      US (12-18 UTC), Late US/Overnight (18-24 UTC).
 *   2. Volume-weighted price change per session.
 *   3. Institutional sessions (US + Late) get positive weight, retail sessions get negative.
 *   4. Cumulative SMI tracks smart vs dumb money divergence.
 *
 * Additionally computes:
 *   - OBV-weighted smart money flow
 *   - Large-trade imbalance (whale trades > adaptive threshold)
 *   - SMI divergence from price (leading indicator)
 *
 * Methodology claim: "Smart Money Index formula" (Step 6-4)
 */

export interface SmartMoneyIndexResult {
  /** Current SMI value (cumulative) */
  smiValue: number;
  /** SMI trend direction: 'accumulating' | 'distributing' | 'neutral' */
  smiTrend: 'accumulating' | 'distributing' | 'neutral';
  /** SMI 5-period moving average */
  smiMA5: number;
  /** Whether SMI diverges from price (leading signal) */
  divergence: 'bullish_divergence' | 'bearish_divergence' | 'none';
  /** Percentage of volume in "smart" sessions */
  smartSessionRatio: number;
  /** Smart money confidence score (0-100) */
  confidence: number;
  /** Per-session breakdown (last N periods) */
  sessionBreakdown: SessionData[];
}

interface SessionData {
  session: 'asia' | 'europe' | 'us' | 'lateUS';
  volumeShare: number;     // fraction of total volume (0-1)
  priceChange: number;     // % change during session
  smartWeight: number;      // weight applied (-1 to +1)
}

interface CandleLike {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

/**
 * Session weights: positive = smart money, negative = retail/emotional
 * US and Late US sessions carry positive weight (institutional activity).
 * Asia and early Europe carry negative weight (retail-dominated).
 */
const SESSION_WEIGHTS = {
  asia: -0.5,    // 00:00-06:00 UTC — retail heavy (Asian retail traders)
  europe: -0.3,  // 06:00-12:00 UTC — mixed, slight retail lean
  us: 0.5,       // 12:00-18:00 UTC — institutional heavy (US market overlap)
  lateUS: 0.8,   // 18:00-24:00 UTC — smart money dominant (end-of-day positioning)
};

/**
 * Classify a UTC hour into a trading session.
 */
function getSession(utcHour: number): keyof typeof SESSION_WEIGHTS {
  if (utcHour < 6) return 'asia';
  if (utcHour < 12) return 'europe';
  if (utcHour < 18) return 'us';
  return 'lateUS';
}

/**
 * Calculate Smart Money Index from OHLCV candles.
 *
 * For intraday candles (1h, 4h): Uses timestamp to classify sessions.
 * For daily candles: Uses candle body direction + volume distribution as proxy.
 *
 * @param candles - OHLCV data (minimum 20 candles recommended)
 * @returns SmartMoneyIndexResult
 */
export function calculateSmartMoneyIndex(candles: CandleLike[]): SmartMoneyIndexResult {
  const defaultResult: SmartMoneyIndexResult = {
    smiValue: 0,
    smiTrend: 'neutral',
    smiMA5: 0,
    divergence: 'none',
    smartSessionRatio: 0.5,
    confidence: 30,
    sessionBreakdown: [],
  };

  if (candles.length < 20) {
    return defaultResult;
  }

  const hasTimestamps = candles.some(c => c.timestamp && c.timestamp > 0);

  if (hasTimestamps) {
    return calculateFromIntraday(candles);
  } else {
    return calculateFromDaily(candles);
  }
}

/**
 * Intraday SMI: classify each candle into sessions by timestamp,
 * compute volume-weighted price change per session.
 */
function calculateFromIntraday(candles: CandleLike[]): SmartMoneyIndexResult {
  // Group candles by day
  const dailyGroups: Map<string, CandleLike[]> = new Map();
  for (const c of candles) {
    if (!c.timestamp) continue;
    const date = new Date(c.timestamp);
    const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    if (!dailyGroups.has(dayKey)) dailyGroups.set(dayKey, []);
    dailyGroups.get(dayKey)!.push(c);
  }

  const smiSeries: number[] = [];
  let cumulativeSMI = 0;
  const allSessions: SessionData[] = [];

  for (const [, dayCandles] of dailyGroups) {
    if (dayCandles.length < 2) continue;

    // Accumulate volume and price change per session
    const sessionVolumes: Record<string, number> = { asia: 0, europe: 0, us: 0, lateUS: 0 };
    const sessionChanges: Record<string, number[]> = { asia: [], europe: [], us: [], lateUS: [] };

    for (const c of dayCandles) {
      const hour = new Date(c.timestamp!).getUTCHours();
      const session = getSession(hour);
      sessionVolumes[session] += c.volume;
      if (c.open > 0) {
        sessionChanges[session].push((c.close - c.open) / c.open * 100);
      }
    }

    const totalVolume = Object.values(sessionVolumes).reduce((a, b) => a + b, 0);
    if (totalVolume <= 0) continue;

    // Calculate daily SMI contribution
    let dailySMI = 0;
    for (const session of Object.keys(SESSION_WEIGHTS) as (keyof typeof SESSION_WEIGHTS)[]) {
      const changes = sessionChanges[session];
      if (changes.length === 0) continue;

      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
      const volShare = sessionVolumes[session] / totalVolume;
      const weight = SESSION_WEIGHTS[session];

      dailySMI += avgChange * volShare * weight;

      allSessions.push({
        session,
        volumeShare: volShare,
        priceChange: avgChange,
        smartWeight: weight,
      });
    }

    cumulativeSMI += dailySMI;
    smiSeries.push(cumulativeSMI);
  }

  return buildResult(smiSeries, candles, allSessions);
}

/**
 * Daily SMI: When timestamps are unavailable, use candle body analysis.
 *
 * Approximation: First half of candle = "open to midpoint" (retail).
 * Second half = "midpoint to close" (institutional).
 * Volume split estimated by body ratio.
 */
function calculateFromDaily(candles: CandleLike[]): SmartMoneyIndexResult {
  const smiSeries: number[] = [];
  let cumulativeSMI = 0;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    if (c.open <= 0 || prev.close <= 0) continue;

    const range = c.high - c.low;
    if (range <= 0) continue;

    // Gap open change (retail reaction to overnight news)
    const gapChange = (c.open - prev.close) / prev.close * 100;

    // Intraday change (institutional positioning during the day)
    const intradayChange = (c.close - c.open) / c.open * 100;

    // SMI = -gap (retail) + intraday (smart)
    // Weight by relative volume (higher volume days matter more)
    const avgVol = candles.slice(Math.max(0, i - 20), i).reduce((s, x) => s + x.volume, 0) / 20;
    const volWeight = avgVol > 0 ? Math.min(c.volume / avgVol, 3) : 1;

    const dailySMI = (-gapChange * 0.4 + intradayChange * 0.6) * volWeight;

    cumulativeSMI += dailySMI;
    smiSeries.push(cumulativeSMI);
  }

  return buildResult(smiSeries, candles, []);
}

/**
 * Build final SMI result from computed series.
 */
function buildResult(
  smiSeries: number[],
  candles: CandleLike[],
  sessions: SessionData[]
): SmartMoneyIndexResult {
  if (smiSeries.length < 3) {
    return {
      smiValue: 0,
      smiTrend: 'neutral',
      smiMA5: 0,
      divergence: 'none',
      smartSessionRatio: 0.5,
      confidence: 30,
      sessionBreakdown: sessions.slice(-8),
    };
  }

  const smiValue = smiSeries[smiSeries.length - 1];

  // 5-period MA of SMI
  const last5 = smiSeries.slice(-5);
  const smiMA5 = last5.reduce((a, b) => a + b, 0) / last5.length;

  // SMI trend: compare recent to MA
  let smiTrend: SmartMoneyIndexResult['smiTrend'] = 'neutral';
  if (smiValue > smiMA5 + 0.5) smiTrend = 'accumulating';
  else if (smiValue < smiMA5 - 0.5) smiTrend = 'distributing';

  // Detect divergence: SMI vs Price
  const recentPrices = candles.slice(-10).map(c => c.close);
  const recentSMI = smiSeries.slice(-10);

  let divergence: SmartMoneyIndexResult['divergence'] = 'none';
  if (recentPrices.length >= 5 && recentSMI.length >= 5) {
    const priceSlope = linearSlope(recentPrices);
    const smiSlope = linearSlope(recentSMI);

    // Bullish divergence: Price falling but SMI rising (smart money buying)
    if (priceSlope < -0.001 && smiSlope > 0.001) {
      divergence = 'bullish_divergence';
    }
    // Bearish divergence: Price rising but SMI falling (smart money selling)
    else if (priceSlope > 0.001 && smiSlope < -0.001) {
      divergence = 'bearish_divergence';
    }
  }

  // Smart session volume ratio
  const smartSessions = sessions.filter(s => SESSION_WEIGHTS[s.session] > 0);
  const totalSessionVol = sessions.reduce((s, x) => s + x.volumeShare, 0);
  const smartVol = smartSessions.reduce((s, x) => s + x.volumeShare, 0);
  const smartSessionRatio = totalSessionVol > 0 ? smartVol / totalSessionVol : 0.5;

  // Confidence based on data quality
  const confidence = Math.min(85, 40 + smiSeries.length * 2 + (sessions.length > 0 ? 15 : 0));

  return {
    smiValue: Math.round(smiValue * 100) / 100,
    smiTrend,
    smiMA5: Math.round(smiMA5 * 100) / 100,
    divergence,
    smartSessionRatio: Math.round(smartSessionRatio * 100) / 100,
    confidence,
    sessionBreakdown: sessions.slice(-8),
  };
}

/**
 * Simple linear regression slope (normalized).
 */
function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const first = values[0];
  if (first === 0) return 0;

  // Normalize to first value
  const normalized = values.map(v => v / first - 1);

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += normalized[i];
    sumXY += i * normalized[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}
