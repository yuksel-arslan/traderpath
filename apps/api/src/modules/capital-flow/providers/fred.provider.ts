/**
 * FRED (Federal Reserve Economic Data) Provider
 *
 * Fetches macro economic data from the Federal Reserve
 * - Fed Balance Sheet
 * - M2 Money Supply
 * - Treasury Yields (10Y, 2Y)
 * - Reverse Repo (RRP) - Money parked at Fed
 * - Treasury General Account (TGA) - Treasury's checking account
 * - Net Liquidity = Fed BS - RRP - TGA
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
  REVERSE_REPO: 'RRPONTSYD',         // Overnight Reverse Repo Facility
  TREASURY_GENERAL_ACCOUNT: 'WTREGEN', // Treasury General Account
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
 * Get Reverse Repo (RRP) data
 * Money parked at the Fed - drains liquidity from the system
 * Returns value in trillions USD
 */
export async function getReverseRepo(): Promise<{
  value: number;
  change7d: number;
  change30d: number;
  trend: 'draining' | 'filling' | 'stable';
  history: FredSeriesData[];
}> {
  const data = await fetchFredSeries(SERIES.REVERSE_REPO, 60);

  if (data.length < 2) {
    return {
      value: 0.5,
      change7d: 0,
      change30d: 0,
      trend: 'stable',
      history: [],
    };
  }

  // RRPONTSYD is in billions, convert to trillions
  const currentValue = data[0].value / 1000;

  // Find value from ~7 days ago (daily data)
  const sevenDaysAgo = data.find((d, i) => i >= 5) || data[data.length - 1];
  const value7dAgo = sevenDaysAgo.value / 1000;

  // Find value from ~30 days ago
  const thirtyDaysAgo = data.find((d, i) => i >= 22) || data[data.length - 1];
  const value30dAgo = thirtyDaysAgo.value / 1000;

  const change7d = value7dAgo > 0 ? ((currentValue - value7dAgo) / value7dAgo) * 100 : 0;
  const change30d = value30dAgo > 0 ? ((currentValue - value30dAgo) / value30dAgo) * 100 : 0;

  // RRP draining = good for liquidity (money leaving RRP enters market)
  // RRP filling = bad for liquidity (money leaving market goes to RRP)
  let trend: 'draining' | 'filling' | 'stable' = 'stable';
  if (change30d < -5) trend = 'draining';   // RRP decreasing = liquidity increasing
  else if (change30d > 5) trend = 'filling'; // RRP increasing = liquidity decreasing

  return {
    value: parseFloat(currentValue.toFixed(3)),
    change7d: parseFloat(change7d.toFixed(2)),
    change30d: parseFloat(change30d.toFixed(2)),
    trend,
    history: data.slice(0, 30).map(d => ({
      date: d.date,
      value: d.value / 1000,
    })),
  };
}

/**
 * Get Treasury General Account (TGA) data
 * Treasury's checking account at the Fed - high TGA drains liquidity
 * Returns value in trillions USD
 */
export async function getTreasuryGeneralAccount(): Promise<{
  value: number;
  change7d: number;
  change30d: number;
  trend: 'building' | 'spending' | 'stable';
  history: FredSeriesData[];
}> {
  const data = await fetchFredSeries(SERIES.TREASURY_GENERAL_ACCOUNT, 60);

  if (data.length < 2) {
    return {
      value: 0.7,
      change7d: 0,
      change30d: 0,
      trend: 'stable',
      history: [],
    };
  }

  // WTREGEN is in millions, convert to trillions
  const currentValue = data[0].value / 1_000_000;

  // Find value from ~7 days ago (weekly data, so ~1 week ago)
  const sevenDaysAgo = data[1] || data[0];
  const value7dAgo = sevenDaysAgo.value / 1_000_000;

  // Find value from ~30 days ago (~4 weeks)
  const thirtyDaysAgo = data.find((d, i) => i >= 4) || data[data.length - 1];
  const value30dAgo = thirtyDaysAgo.value / 1_000_000;

  const change7d = value7dAgo > 0 ? ((currentValue - value7dAgo) / value7dAgo) * 100 : 0;
  const change30d = value30dAgo > 0 ? ((currentValue - value30dAgo) / value30dAgo) * 100 : 0;

  // TGA building = Treasury collecting taxes/issuing debt = drains liquidity
  // TGA spending = Treasury spending = injects liquidity
  let trend: 'building' | 'spending' | 'stable' = 'stable';
  if (change30d > 10) trend = 'building';   // TGA increasing = liquidity decreasing
  else if (change30d < -10) trend = 'spending'; // TGA decreasing = liquidity increasing

  return {
    value: parseFloat(currentValue.toFixed(3)),
    change7d: parseFloat(change7d.toFixed(2)),
    change30d: parseFloat(change30d.toFixed(2)),
    trend,
    history: data.slice(0, 30).map(d => ({
      date: d.date,
      value: d.value / 1_000_000,
    })),
  };
}

/**
 * Get Net Liquidity calculation
 * Net Liquidity = Fed Balance Sheet - RRP - TGA
 * This is the key metric for available market liquidity
 */
export async function getNetLiquidity(): Promise<{
  value: number;
  change7d: number;
  change30d: number;
  trend: LiquidityTrend;
  components: {
    fedBalanceSheet: number;
    reverseRepo: number;
    tga: number;
  };
  interpretation: string;
}> {
  const [fedBS, rrp, tga] = await Promise.all([
    getFedBalanceSheet(),
    getReverseRepo(),
    getTreasuryGeneralAccount(),
  ]);

  // Net Liquidity = Fed BS - RRP - TGA (all in trillions)
  const netLiquidity = fedBS.value - rrp.value - tga.value;

  // Calculate change based on component changes
  // Simplified: use weighted average of component changes
  const fedWeight = fedBS.value / (fedBS.value + rrp.value + tga.value);
  const rrpWeight = rrp.value / (fedBS.value + rrp.value + tga.value);
  const tgaWeight = tga.value / (fedBS.value + rrp.value + tga.value);

  // Fed BS increase = positive for liquidity
  // RRP increase = negative for liquidity
  // TGA increase = negative for liquidity
  const change30d = (fedBS.change30d * fedWeight) - (rrp.change30d * rrpWeight) - (tga.change30d * tgaWeight);

  // Estimate 7d change (simplified)
  const change7d = change30d / 4;

  // Determine trend
  let trend: LiquidityTrend = 'stable';
  if (change30d > 2) trend = 'expanding';
  else if (change30d < -2) trend = 'contracting';

  // Generate interpretation
  let interpretation: string;
  const components: string[] = [];

  if (fedBS.trend === 'expanding') components.push('Fed expanding balance sheet');
  if (fedBS.trend === 'contracting') components.push('Fed contracting balance sheet');
  if (rrp.trend === 'draining') components.push('RRP draining (positive)');
  if (rrp.trend === 'filling') components.push('RRP filling (negative)');
  if (tga.trend === 'spending') components.push('Treasury spending (positive)');
  if (tga.trend === 'building') components.push('Treasury building reserves (negative)');

  if (trend === 'expanding') {
    interpretation = `Liquidity expanding: ${components.join(', ') || 'stable components'}`;
  } else if (trend === 'contracting') {
    interpretation = `Liquidity contracting: ${components.join(', ') || 'stable components'}`;
  } else {
    interpretation = `Liquidity stable: ${components.join(', ') || 'all components balanced'}`;
  }

  return {
    value: parseFloat(netLiquidity.toFixed(2)),
    change7d: parseFloat(change7d.toFixed(2)),
    change30d: parseFloat(change30d.toFixed(2)),
    trend,
    components: {
      fedBalanceSheet: fedBS.value,
      reverseRepo: rrp.value,
      tga: tga.value,
    },
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

    case SERIES.REVERSE_REPO:
      // RRP has been declining in 2024-2026 from ~2.5T to ~0.5T
      return [
        { date: baseDate, value: 500 },       // $0.5T in billions
        { date: getPastDate(7), value: 520 },
        { date: getPastDate(14), value: 540 },
        { date: getPastDate(21), value: 560 },
        { date: getPastDate(28), value: 580 },
      ];

    case SERIES.TREASURY_GENERAL_ACCOUNT:
      // TGA typically ranges from $400B to $800B
      return [
        { date: baseDate, value: 700_000 },   // $0.7T in millions
        { date: getPastDate(7), value: 680_000 },
        { date: getPastDate(14), value: 660_000 },
        { date: getPastDate(21), value: 650_000 },
        { date: getPastDate(28), value: 640_000 },
      ];

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
  const [fedBalance, m2Supply, yields, rrp, tga, netLiq] = await Promise.all([
    getFedBalanceSheet(),
    getM2MoneySupply(),
    getTreasuryYields(),
    getReverseRepo(),
    getTreasuryGeneralAccount(),
    getNetLiquidity(),
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
    reverseRepo: {
      value: rrp.value,
      change7d: rrp.change7d,
      change30d: rrp.change30d,
      trend: rrp.trend,
    },
    treasuryGeneralAccount: {
      value: tga.value,
      change7d: tga.change7d,
      change30d: tga.change30d,
      trend: tga.trend,
    },
    netLiquidity: {
      value: netLiq.value,
      change7d: netLiq.change7d,
      change30d: netLiq.change30d,
      trend: netLiq.trend,
      components: netLiq.components,
      interpretation: netLiq.interpretation,
    },
  };
}
