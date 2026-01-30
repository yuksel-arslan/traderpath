/**
 * Yahoo Finance Provider
 *
 * Fetches market data for:
 * - Stock Indices (SPX, NDX, DJI)
 * - Dollar Index (DXY)
 * - VIX (Fear Index)
 * - Precious Metals (XAU, XAG)
 *
 * Uses yahoo-finance2 or direct API calls
 */

import { DxyTrend, VixLevel, MarketFlow, SectorFlow } from '../types';

// Yahoo Finance symbols
const SYMBOLS = {
  // Indices
  SPX: '^GSPC',              // S&P 500
  NDX: '^IXIC',              // NASDAQ
  DJI: '^DJI',               // Dow Jones

  // Dollar & Fear
  DXY: 'DX-Y.NYB',           // Dollar Index
  VIX: '^VIX',               // Volatility Index

  // Metals
  GOLD: 'GC=F',              // Gold Futures
  SILVER: 'SI=F',            // Silver Futures

  // Sector ETFs
  XLK: 'XLK',                // Tech
  XLF: 'XLF',                // Financials
  XLE: 'XLE',                // Energy
  XLV: 'XLV',                // Healthcare
  XLY: 'XLY',                // Consumer Discretionary
  XLI: 'XLI',                // Industrials
} as const;

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooChartResult {
  meta: {
    regularMarketPrice: number;
    previousClose: number;
    currency: string;
    symbol: string;
  };
  timestamp?: number[];
  indicators: {
    quote: Array<{
      close: (number | null)[];
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      volume: (number | null)[];
    }>;
  };
}

/**
 * Fetch quote data from Yahoo Finance
 */
async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
} | null> {
  try {
    const params = new URLSearchParams({
      interval: '1d',
      range: '5d',
    });

    const response = await fetch(`${YAHOO_BASE_URL}/${symbol}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const result: YahooChartResult = data.chart?.result?.[0];

    if (!result) {
      throw new Error('No data returned');
    }

    const price = result.meta.regularMarketPrice;
    const previousClose = result.meta.previousClose;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      price,
      change,
      changePercent,
      previousClose,
    };
  } catch (error) {
    console.error(`[Yahoo] Error fetching ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical data for longer-term analysis
 */
async function fetchYahooHistory(
  symbol: string,
  range: '1mo' | '3mo' | '6mo' | '1y' = '1mo'
): Promise<Array<{ date: Date; close: number }>> {
  try {
    const params = new URLSearchParams({
      interval: '1d',
      range,
    });

    const response = await fetch(`${YAHOO_BASE_URL}/${symbol}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const result: YahooChartResult = data.chart?.result?.[0];

    if (!result || !result.timestamp) {
      return [];
    }

    const closes = result.indicators.quote[0]?.close || [];

    return result.timestamp.map((ts, i) => ({
      date: new Date(ts * 1000),
      close: closes[i] || 0,
    })).filter(d => d.close > 0);
  } catch (error) {
    console.error(`[Yahoo] Error fetching history for ${symbol}:`, error);
    return [];
  }
}

/**
 * Get DXY (Dollar Index) data
 */
export async function getDxyData(): Promise<{
  value: number;
  change7d: number;
  trend: DxyTrend;
}> {
  const [quote, history] = await Promise.all([
    fetchYahooQuote(SYMBOLS.DXY),
    fetchYahooHistory(SYMBOLS.DXY, '1mo'),
  ]);

  if (!quote) {
    return {
      value: 104.5,
      change7d: 0,
      trend: 'stable',
    };
  }

  // Calculate 7-day change
  const sevenDaysAgo = history.find((d, i) => i >= 5);
  const change7d = sevenDaysAgo
    ? ((quote.price - sevenDaysAgo.close) / sevenDaysAgo.close) * 100
    : quote.changePercent;

  let trend: DxyTrend = 'stable';
  if (change7d > 1) trend = 'strengthening';
  else if (change7d < -1) trend = 'weakening';

  return {
    value: parseFloat(quote.price.toFixed(2)),
    change7d: parseFloat(change7d.toFixed(2)),
    trend,
  };
}

/**
 * Get VIX (Fear Index) data
 */
export async function getVixData(): Promise<{
  value: number;
  level: VixLevel;
}> {
  const quote = await fetchYahooQuote(SYMBOLS.VIX);

  if (!quote) {
    return {
      value: 15,
      level: 'neutral',
    };
  }

  const value = quote.price;
  let level: VixLevel;

  if (value >= 30) {
    level = 'extreme_fear';
  } else if (value >= 20) {
    level = 'fear';
  } else if (value >= 12) {
    level = 'neutral';
  } else {
    level = 'complacent';
  }

  return {
    value: parseFloat(value.toFixed(2)),
    level,
  };
}

/**
 * Get Stock Market Flow data
 */
export async function getStocksFlow(): Promise<Omit<MarketFlow, 'phase' | 'daysInPhase' | 'phaseStartDate' | 'avgPhaseDuration' | 'rotationSignal' | 'rotationTarget' | 'rotationConfidence'>> {
  const [spxQuote, spxHistory, sectorData] = await Promise.all([
    fetchYahooQuote(SYMBOLS.SPX),
    fetchYahooHistory(SYMBOLS.SPX, '3mo'),
    getStockSectors(),
  ]);

  if (!spxQuote) {
    return {
      market: 'stocks',
      currentValue: 5000,
      flow7d: 0,
      flow30d: 0,
      flowVelocity: 0,
      sectors: sectorData,
      lastUpdated: new Date(),
    };
  }

  // Calculate flows from history
  const sevenDaysAgo = spxHistory.find((d, i) => i >= 5);
  const thirtyDaysAgo = spxHistory.find((d, i) => i >= 22);
  const fourteenDaysAgo = spxHistory.find((d, i) => i >= 10);

  const flow7d = sevenDaysAgo
    ? ((spxQuote.price - sevenDaysAgo.close) / sevenDaysAgo.close) * 100
    : 0;

  const flow30d = thirtyDaysAgo
    ? ((spxQuote.price - thirtyDaysAgo.close) / thirtyDaysAgo.close) * 100
    : 0;

  // Velocity = current 7d flow - previous 7d flow
  const previousFlow7d = fourteenDaysAgo && sevenDaysAgo
    ? ((sevenDaysAgo.close - fourteenDaysAgo.close) / fourteenDaysAgo.close) * 100
    : 0;

  const flowVelocity = flow7d - previousFlow7d;

  return {
    market: 'stocks',
    currentValue: spxQuote.price,
    flow7d: parseFloat(flow7d.toFixed(2)),
    flow30d: parseFloat(flow30d.toFixed(2)),
    flowVelocity: parseFloat(flowVelocity.toFixed(2)),
    sectors: sectorData,
    lastUpdated: new Date(),
  };
}

/**
 * Get Stock Sector data
 */
async function getStockSectors(): Promise<SectorFlow[]> {
  const sectorSymbols = [
    { symbol: SYMBOLS.XLK, name: 'Tech' },
    { symbol: SYMBOLS.XLF, name: 'Finance' },
    { symbol: SYMBOLS.XLE, name: 'Energy' },
    { symbol: SYMBOLS.XLV, name: 'Healthcare' },
    { symbol: SYMBOLS.XLY, name: 'Consumer' },
    { symbol: SYMBOLS.XLI, name: 'Industrial' },
  ];

  const results = await Promise.all(
    sectorSymbols.map(async ({ symbol, name }) => {
      const [quote, history] = await Promise.all([
        fetchYahooQuote(symbol),
        fetchYahooHistory(symbol, '1mo'),
      ]);

      if (!quote) {
        return {
          name,
          flow7d: 0,
          flow30d: 0,
          dominance: 0,
          trending: 'stable' as const,
          topAssets: [],
        };
      }

      const sevenDaysAgo = history.find((d, i) => i >= 5);
      const thirtyDaysAgo = history.find((d, i) => i >= 22);

      const flow7d = sevenDaysAgo
        ? ((quote.price - sevenDaysAgo.close) / sevenDaysAgo.close) * 100
        : quote.changePercent;

      const flow30d = thirtyDaysAgo
        ? ((quote.price - thirtyDaysAgo.close) / thirtyDaysAgo.close) * 100
        : flow7d;

      return {
        name,
        flow7d: parseFloat(flow7d.toFixed(2)),
        flow30d: parseFloat(flow30d.toFixed(2)),
        dominance: 0, // Would need market cap data
        trending: flow7d > 1 ? 'up' as const : flow7d < -1 ? 'down' as const : 'stable' as const,
        topAssets: getSectorTopAssets(name),
      };
    })
  );

  return results;
}

/**
 * Get Metals Flow data
 */
export async function getMetalsFlow(): Promise<Omit<MarketFlow, 'phase' | 'daysInPhase' | 'phaseStartDate' | 'avgPhaseDuration' | 'rotationSignal' | 'rotationTarget' | 'rotationConfidence'>> {
  const [goldQuote, goldHistory, silverQuote] = await Promise.all([
    fetchYahooQuote(SYMBOLS.GOLD),
    fetchYahooHistory(SYMBOLS.GOLD, '3mo'),
    fetchYahooQuote(SYMBOLS.SILVER),
  ]);

  if (!goldQuote) {
    return {
      market: 'metals',
      currentValue: 2000,
      flow7d: 0,
      flow30d: 0,
      flowVelocity: 0,
      sectors: [],
      lastUpdated: new Date(),
    };
  }

  const sevenDaysAgo = goldHistory.find((d, i) => i >= 5);
  const thirtyDaysAgo = goldHistory.find((d, i) => i >= 22);
  const fourteenDaysAgo = goldHistory.find((d, i) => i >= 10);

  const flow7d = sevenDaysAgo
    ? ((goldQuote.price - sevenDaysAgo.close) / sevenDaysAgo.close) * 100
    : 0;

  const flow30d = thirtyDaysAgo
    ? ((goldQuote.price - thirtyDaysAgo.close) / thirtyDaysAgo.close) * 100
    : 0;

  const previousFlow7d = fourteenDaysAgo && sevenDaysAgo
    ? ((sevenDaysAgo.close - fourteenDaysAgo.close) / fourteenDaysAgo.close) * 100
    : 0;

  const flowVelocity = flow7d - previousFlow7d;

  // Create sector data for gold and silver
  const sectors: SectorFlow[] = [
    {
      name: 'Gold',
      flow7d: parseFloat(flow7d.toFixed(2)),
      flow30d: parseFloat(flow30d.toFixed(2)),
      dominance: 85, // Gold dominates metals
      trending: flow7d > 1 ? 'up' : flow7d < -1 ? 'down' : 'stable',
      topAssets: ['XAU', 'GLD', 'IAU', 'SGOL', 'GDX'],
    },
  ];

  if (silverQuote) {
    const silverHistory = await fetchYahooHistory(SYMBOLS.SILVER, '1mo');
    const silverSevenDaysAgo = silverHistory.find((d, i) => i >= 5);
    const silverFlow7d = silverSevenDaysAgo
      ? ((silverQuote.price - silverSevenDaysAgo.close) / silverSevenDaysAgo.close) * 100
      : 0;

    sectors.push({
      name: 'Silver',
      flow7d: parseFloat(silverFlow7d.toFixed(2)),
      flow30d: 0,
      dominance: 15,
      trending: silverFlow7d > 1 ? 'up' : silverFlow7d < -1 ? 'down' : 'stable',
      topAssets: ['XAG', 'SLV', 'SIVR', 'SIL'],
    });
  }

  return {
    market: 'metals',
    currentValue: goldQuote.price,
    flow7d: parseFloat(flow7d.toFixed(2)),
    flow30d: parseFloat(flow30d.toFixed(2)),
    flowVelocity: parseFloat(flowVelocity.toFixed(2)),
    sectors,
    lastUpdated: new Date(),
  };
}

/**
 * Get top assets for each stock sector
 */
function getSectorTopAssets(sector: string): string[] {
  const assets: Record<string, string[]> = {
    Tech: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'],
    Finance: ['JPM', 'BAC', 'WFC', 'GS', 'MS'],
    Energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
    Healthcare: ['UNH', 'JNJ', 'LLY', 'PFE', 'ABBV'],
    Consumer: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],
    Industrial: ['CAT', 'DE', 'UPS', 'BA', 'HON'],
  };

  return assets[sector] || [];
}

/**
 * Get all Yahoo data in one call
 */
export async function getAllYahooData() {
  const [dxy, vix, stocks, metals] = await Promise.all([
    getDxyData(),
    getVixData(),
    getStocksFlow(),
    getMetalsFlow(),
  ]);

  return {
    dxy,
    vix,
    stocks,
    metals,
  };
}
