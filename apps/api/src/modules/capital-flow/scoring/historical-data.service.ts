/**
 * Historical Data Service for Backtesting
 *
 * Fetches multi-year historical data from FRED and Yahoo Finance,
 * aligns all series to weekly frequency, and computes the derived
 * metrics (changes, spreads) needed by the backtest engine.
 *
 * Data sources:
 *   FRED: Fed BS (WALCL), M2 (M2SL), 10Y (DGS10), 2Y (DGS2),
 *         RRP (RRPONTSYD), TGA (WTREGEN)
 *   Yahoo: DXY (DX-Y.NYB), VIX (^VIX), SPY (SPY) for benchmark
 */

import type { FredSeriesData } from '../types';
import type { AlignedDataPoint } from './backtest.service';

// ============================================================
// FRED API
// ============================================================

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

const FRED_SERIES = {
  FED_BS: 'WALCL',
  M2: 'M2SL',
  YIELD_10Y: 'DGS10',
  YIELD_2Y: 'DGS2',
  RRP: 'RRPONTSYD',
  TGA: 'WTREGEN',
} as const;

async function fetchFredSeries(
  seriesId: string,
  startDate: string,
  endDate: string,
): Promise<FredSeriesData[]> {
  const apiKey = process.env['FRED_API_KEY'] || '';
  if (!apiKey) {
    throw new Error('[HistoricalData] FRED_API_KEY not configured');
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    observation_start: startDate,
    observation_end: endDate,
    sort_order: 'asc',
  });

  const response = await fetch(`${FRED_BASE_URL}?${params}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`FRED API error for ${seriesId}: ${response.status}`);
  }

  const data = await response.json() as { observations: Array<{ date: string; value: string }> };
  return data.observations
    .filter(obs => obs.value !== '.')
    .map(obs => ({ date: obs.date, value: parseFloat(obs.value) }));
}

// ============================================================
// Yahoo Finance API
// ============================================================

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooHistoricalPoint {
  date: string;
  close: number;
}

async function fetchYahooHistory(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<YahooHistoricalPoint[]> {
  const period1 = Math.floor(new Date(startDate).getTime() / 1000);
  const period2 = Math.floor(new Date(endDate).getTime() / 1000);

  const url = `${YAHOO_BASE_URL}/${symbol}?period1=${period1}&period2=${period2}&interval=1wk`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance error for ${symbol}: ${response.status}`);
  }

  const data = await response.json() as {
    chart: {
      result: Array<{
        timestamp: number[];
        indicators: { quote: Array<{ close: (number | null)[] }> };
      }>;
    };
  };

  const result = data.chart?.result?.[0];
  if (!result?.timestamp) return [];

  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0]?.close || [];

  const points: YahooHistoricalPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close != null) {
      points.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        close,
      });
    }
  }

  return points;
}

// ============================================================
// Series alignment to weekly frequency
// ============================================================

/**
 * Get the ISO week string (YYYY-WW) for a date.
 */
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Resample a daily/weekly series to weekly, taking the last observation per week.
 */
function toWeeklyMap(series: FredSeriesData[]): Map<string, number> {
  const weekMap = new Map<string, { date: string; value: number }>();
  for (const point of series) {
    const wk = getWeekKey(point.date);
    // Keep the latest observation per week
    const existing = weekMap.get(wk);
    if (!existing || point.date > existing.date) {
      weekMap.set(wk, point);
    }
  }
  return new Map([...weekMap].map(([k, v]) => [k, v.value]));
}

function yahooToWeeklyMap(series: YahooHistoricalPoint[]): Map<string, number> {
  const weekMap = new Map<string, number>();
  for (const point of series) {
    weekMap.set(getWeekKey(point.date), point.close);
  }
  return weekMap;
}

/**
 * Compute percentage change between consecutive values.
 */
function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ============================================================
// Main data assembly
// ============================================================

/**
 * Fetch and align all historical data for backtesting.
 *
 * @param startDate - Start date (YYYY-MM-DD), e.g. '2020-01-01'
 * @param endDate   - End date (YYYY-MM-DD), e.g. '2026-01-01'
 * @returns Array of weekly-aligned data points
 */
export async function fetchHistoricalData(
  startDate: string,
  endDate: string,
): Promise<AlignedDataPoint[]> {
  // Fetch all series in parallel
  const [
    fedBS, m2, yield10y, yield2y, rrp, tga,
    dxy, vix, spy,
  ] = await Promise.all([
    fetchFredSeries(FRED_SERIES.FED_BS, startDate, endDate),
    fetchFredSeries(FRED_SERIES.M2, startDate, endDate),
    fetchFredSeries(FRED_SERIES.YIELD_10Y, startDate, endDate),
    fetchFredSeries(FRED_SERIES.YIELD_2Y, startDate, endDate),
    fetchFredSeries(FRED_SERIES.RRP, startDate, endDate),
    fetchFredSeries(FRED_SERIES.TGA, startDate, endDate),
    fetchYahooHistory('DX-Y.NYB', startDate, endDate),
    fetchYahooHistory('^VIX', startDate, endDate),
    fetchYahooHistory('SPY', startDate, endDate), // Benchmark
  ]);

  // Convert to weekly maps
  const fedBSWeekly = toWeeklyMap(fedBS);
  const m2Weekly = toWeeklyMap(m2);
  const y10Weekly = toWeeklyMap(yield10y);
  const y2Weekly = toWeeklyMap(yield2y);
  const rrpWeekly = toWeeklyMap(rrp);
  const tgaWeekly = toWeeklyMap(tga);
  const dxyWeekly = yahooToWeeklyMap(dxy);
  const vixWeekly = yahooToWeeklyMap(vix);
  const spyWeekly = yahooToWeeklyMap(spy);

  // Find common weeks (where all series have data)
  const allWeeks = new Set<string>();
  for (const wk of fedBSWeekly.keys()) allWeeks.add(wk);

  const commonWeeks = [...allWeeks]
    .filter(wk =>
      m2Weekly.has(wk) || y10Weekly.has(wk) // M2 is monthly, allow gaps
    )
    .sort();

  // Build aligned data points
  const aligned: AlignedDataPoint[] = [];
  let prevFedBS = 0;
  let prevRRP = 0;
  let prevTGA = 0;
  let prevDXY = 0;
  let prevSPY = 0;
  let lastM2YoY = 0;

  for (const wk of commonWeeks) {
    const currentFedBS = fedBSWeekly.get(wk) || prevFedBS;
    const currentRRP = rrpWeekly.get(wk) || prevRRP;
    const currentTGA = tgaWeekly.get(wk) || prevTGA;
    const currentDXY = dxyWeekly.get(wk) || prevDXY;
    const currentVIX = vixWeekly.get(wk) || 20;
    const currentSPY = spyWeekly.get(wk) || prevSPY;
    const current10Y = y10Weekly.get(wk) || 0;
    const current2Y = y2Weekly.get(wk) || 0;

    // M2 is monthly — carry forward the last known YoY
    const currentM2 = m2Weekly.get(wk);
    if (currentM2 !== undefined) {
      // Find M2 from ~12 months ago for YoY
      const yearAgoWeeks = commonWeeks.filter(w => w < wk).slice(-52);
      const yearAgoM2Wk = yearAgoWeeks[0];
      const yearAgoM2 = yearAgoM2Wk ? (m2Weekly.get(yearAgoM2Wk) || currentM2) : currentM2;
      lastM2YoY = yearAgoM2 > 0 ? ((currentM2 - yearAgoM2) / yearAgoM2) * 100 : 0;
    }

    // Skip first week (need previous values for changes)
    if (prevFedBS > 0 && prevSPY > 0) {
      // Fed BS: WALCL is in millions. change30d proxy = 4-week change %
      const fedBSChange = pctChange(currentFedBS, prevFedBS);

      // Net liquidity = Fed BS - RRP - TGA (all in same units)
      const netLiq = currentFedBS - currentRRP * 1000 - currentTGA; // normalize
      const prevNetLiq = prevFedBS - prevRRP * 1000 - prevTGA;
      const netLiqChange = prevNetLiq !== 0 ? pctChange(netLiq, prevNetLiq) : 0;

      const dxyChange = pctChange(currentDXY, prevDXY);
      const rrpChange = pctChange(currentRRP, prevRRP);
      const tgaChange = pctChange(currentTGA, prevTGA);
      const benchmarkReturn = pctChange(currentSPY, prevSPY);

      aligned.push({
        date: wk, // Using week key as date
        fedBSChange: parseFloat(fedBSChange.toFixed(3)),
        m2YoY: parseFloat(lastM2YoY.toFixed(3)),
        dxyChange: parseFloat(dxyChange.toFixed(3)),
        vixValue: parseFloat(currentVIX.toFixed(2)),
        yieldCurveSpread: parseFloat((current10Y - current2Y).toFixed(3)),
        netLiqChange: parseFloat(netLiqChange.toFixed(3)),
        rrpChange: parseFloat(rrpChange.toFixed(3)),
        tgaChange: parseFloat(tgaChange.toFixed(3)),
        benchmarkReturn: parseFloat(benchmarkReturn.toFixed(3)),
      });
    }

    prevFedBS = currentFedBS;
    prevRRP = currentRRP;
    prevTGA = currentTGA;
    prevDXY = currentDXY;
    prevSPY = currentSPY;
  }

  return aligned;
}
