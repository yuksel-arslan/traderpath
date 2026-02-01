/**
 * FRED (Federal Reserve Economic Data) Provider
 *
 * Fetches macro economic data from the Federal Reserve
 * - Fed Balance Sheet
 * - M2 Money Supply
 * - Treasury Yields (10Y, 2Y)
 *
 * API Docs: https://fred.stlouisfed.org/docs/api/fred/
 */

import { FredResponse, FredSeriesData, LiquidityTrend } from '../types';

// FRED Series IDs
const SERIES = {
  FED_BALANCE_SHEET: 'WALCL',        // Total Assets (Less Eliminations from Consolidation)
  M2_MONEY_SUPPLY: 'M2SL',           // M2 Money Stock
  TREASURY_10Y: 'DGS10',             // 10-Year Treasury Constant Maturity Rate
  TREASURY_2Y: 'DGS2',               // 2-Year Treasury Constant Maturity Rate
  TREASURY_3M: 'DTB3',               // 3-Month Treasury Bill Rate
} as const;

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

function getFredApiKey(): string {
  return process.env['FRED_API_KEY'] || '';
}

/**
 * Fetch data from FRED API
 */
async function fetchFredSeries(
  seriesId: string,
  limit: number = 90
): Promise<FredSeriesData[]> {
  const apiKey = getFredApiKey();

  if (!apiKey) {
    console.warn('[FRED] No API key configured, using fallback data');
    return getFallbackData(seriesId);
  }

  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'desc',
      limit: limit.toString(),
    });

    const response = await fetch(`${FRED_BASE_URL}?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data: FredResponse = await response.json();

    return data.observations
      .filter(obs => obs.value !== '.')
      .map(obs => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }));
  } catch (error) {
    console.error(`[FRED] Error fetching ${seriesId}:`, error);
    return getFallbackData(seriesId);
  }
}

/**
 * Get Fed Balance Sheet data
 * Returns value in trillions USD
 */
export async function getFedBalanceSheet(): Promise<{
  value: number;
  change30d: number;
  trend: LiquidityTrend;
  history: FredSeriesData[];
}> {
  const data = await fetchFredSeries(SERIES.FED_BALANCE_SHEET, 60);

  if (data.length < 2) {
    return {
      value: 7.5,
      change30d: 0,
      trend: 'stable',
      history: [],
    };
  }

  // WALCL is in millions, convert to trillions
  const currentValue = data[0].value / 1_000_000;

  // Find value from ~30 days ago
  const thirtyDaysAgo = data.find((d, i) => i >= 4) || data[data.length - 1];
  const previousValue = thirtyDaysAgo.value / 1_000_000;

  const change30d = ((currentValue - previousValue) / previousValue) * 100;

  let trend: LiquidityTrend = 'stable';
  if (change30d > 1) trend = 'expanding';
  else if (change30d < -1) trend = 'contracting';

  return {
    value: parseFloat(currentValue.toFixed(2)),
    change30d: parseFloat(change30d.toFixed(2)),
    trend,
    history: data.slice(0, 30).map(d => ({
      date: d.date,
      value: d.value / 1_000_000,
    })),
  };
}

/**
 * Get M2 Money Supply data
 * Returns value in trillions USD
 */
export async function getM2MoneySupply(): Promise<{
  value: number;
  change30d: number;
  yoyGrowth: number;
  history: FredSeriesData[];
}> {
  const data = await fetchFredSeries(SERIES.M2_MONEY_SUPPLY, 60);

  if (data.length < 2) {
    return {
      value: 21.0,
      change30d: 0,
      yoyGrowth: 0,
      history: [],
    };
  }

  // M2SL is in billions, convert to trillions
  const currentValue = data[0].value / 1000;

  // Monthly data, find ~1 month ago
  const monthAgo = data[1] || data[0];
  const previousValue = monthAgo.value / 1000;

  // Find ~12 months ago for YoY
  const yearAgo = data.find((d, i) => i >= 12) || data[data.length - 1];
  const yearAgoValue = yearAgo.value / 1000;

  const change30d = ((currentValue - previousValue) / previousValue) * 100;
  const yoyGrowth = ((currentValue - yearAgoValue) / yearAgoValue) * 100;

  return {
    value: parseFloat(currentValue.toFixed(2)),
    change30d: parseFloat(change30d.toFixed(2)),
    yoyGrowth: parseFloat(yoyGrowth.toFixed(2)),
    history: data.slice(0, 24).map(d => ({
      date: d.date,
      value: d.value / 1000,
    })),
  };
}

/**
 * Get Treasury Yields (10Y and 2Y)
 * Returns yield spread for yield curve analysis
 */
export async function getTreasuryYields(): Promise<{
  yield10y: number;
  yield2y: number;
  spread10y2y: number;
  inverted: boolean;
  interpretation: string;
}> {
  const [data10y, data2y] = await Promise.all([
    fetchFredSeries(SERIES.TREASURY_10Y, 5),
    fetchFredSeries(SERIES.TREASURY_2Y, 5),
  ]);

  const yield10y = data10y[0]?.value || 4.5;
  const yield2y = data2y[0]?.value || 4.3;
  const spread = yield10y - yield2y;
  const inverted = spread < 0;

  let interpretation: string;
  if (spread < -0.5) {
    interpretation = 'Deeply inverted - recession signal';
  } else if (spread < 0) {
    interpretation = 'Inverted - potential slowdown ahead';
  } else if (spread < 0.5) {
    interpretation = 'Flat - uncertain economic outlook';
  } else if (spread < 1.5) {
    interpretation = 'Normal - healthy economic growth';
  } else {
    interpretation = 'Steep - strong growth expectations';
  }

  return {
    yield10y: parseFloat(yield10y.toFixed(3)),
    yield2y: parseFloat(yield2y.toFixed(3)),
    spread10y2y: parseFloat(spread.toFixed(3)),
    inverted,
    interpretation,
  };
}

/**
 * Fallback data when API is unavailable
 */
function getFallbackData(seriesId: string): FredSeriesData[] {
  const today = new Date();
  const baseDate = today.toISOString().split('T')[0];

  switch (seriesId) {
    case SERIES.FED_BALANCE_SHEET:
      return [
        { date: baseDate, value: 7_500_000 }, // $7.5T in millions
        { date: getPastDate(7), value: 7_480_000 },
        { date: getPastDate(14), value: 7_460_000 },
        { date: getPastDate(21), value: 7_450_000 },
        { date: getPastDate(28), value: 7_420_000 },
      ];

    case SERIES.M2_MONEY_SUPPLY:
      return [
        { date: baseDate, value: 21_000 }, // $21T in billions
        { date: getPastDate(30), value: 20_900 },
        { date: getPastDate(60), value: 20_800 },
        { date: getPastDate(365), value: 20_500 },
      ];

    case SERIES.TREASURY_10Y:
      return [{ date: baseDate, value: 4.5 }];

    case SERIES.TREASURY_2Y:
      return [{ date: baseDate, value: 4.3 }];

    default:
      return [];
  }
}

function getPastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Get all FRED data in one call
 */
export async function getAllFredData() {
  const [fedBalance, m2Supply, yields] = await Promise.all([
    getFedBalanceSheet(),
    getM2MoneySupply(),
    getTreasuryYields(),
  ]);

  return {
    fedBalanceSheet: {
      value: fedBalance.value,
      change30d: fedBalance.change30d,
      trend: fedBalance.trend,
    },
    m2MoneySupply: {
      value: m2Supply.value,
      change30d: m2Supply.change30d,
      yoyGrowth: m2Supply.yoyGrowth,
    },
    yieldCurve: {
      spread10y2y: yields.spread10y2y,
      inverted: yields.inverted,
      interpretation: yields.interpretation,
    },
  };
}
