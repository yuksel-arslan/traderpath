/**
 * Yahoo Finance Provider
 *
 * Fetches market data for:
 * - Stock Indices (SPX, NDX, DJI)
 * - Dollar Index (DXY)
 * - VIX (Fear Index)
 * - Precious Metals (XAU, XAG)
 * - ETF Volume-Weighted Flow Analysis
 *
 * Uses yahoo-finance2 or direct API calls
 *
 * IMPORTANT: Flow = Volume × Price Direction × Conviction
 * Price change alone is NOT flow!
 */

import { DxyTrend, VixLevel, MarketFlow, SectorFlow, FlowDataPoint } from '../types';

// Yahoo Finance symbols
const SYMBOLS = {
  // Indices
  SPX: '^GSPC',              // S&P 500
  NDX: '^IXIC',              // NASDAQ
  DJI: '^DJI',               // Dow Jones

  // Dollar & Fear
  DXY: 'DX-Y.NYB',           // Dollar Index
  VIX: '^VIX',               // Volatility Index
  VIX3M: '^VIX3M',           // VIX 3-Month (for term structure)

  // Metals
  GOLD: 'GC=F',              // Gold Futures
  SILVER: 'SI=F',            // Silver Futures
  COPPER: 'HG=F',            // Copper Futures

  // Metal ETFs
  GLD: 'GLD',                // Gold ETF
  SLV: 'SLV',                // Silver ETF
  CPER: 'CPER',              // Copper ETF
  GDX: 'GDX',                // Gold Miners ETF

  // Bond ETFs
  TLT: 'TLT',                // 20+ Year Treasury
  IEF: 'IEF',                // 7-10 Year Treasury
  SHY: 'SHY',                // 1-3 Year Treasury
  LQD: 'LQD',                // Investment Grade Corporate
  HYG: 'HYG',                // High Yield Corporate
  TIP: 'TIP',                // TIPS

  // Sector ETFs
  XLK: 'XLK',                // Tech
  XLF: 'XLF',                // Financials
  XLE: 'XLE',                // Energy
  XLV: 'XLV',                // Healthcare
  XLY: 'XLY',                // Consumer Discretionary
  XLI: 'XLI',                // Industrials
  XLP: 'XLP',                // Consumer Staples
  XLU: 'XLU',                // Utilities
  XLB: 'XLB',                // Materials
  XLRE: 'XLRE',              // Real Estate
  XLC: 'XLC',                // Communication

  // BIST (Borsa İstanbul) symbols
  XU100: 'XU100.IS',         // BIST 100 Index
  GARAN: 'GARAN.IS',         // Garanti BBVA (Banking)
  AKBNK: 'AKBNK.IS',         // Akbank (Banking)
  THYAO: 'THYAO.IS',         // Turkish Airlines (Aviation)
  KCHOL: 'KCHOL.IS',         // Koç Holding
  SAHOL: 'SAHOL.IS',         // Sabancı Holding
  EREGL: 'EREGL.IS',         // Ereğli Demir Çelik (Industrial)
  SISE: 'SISE.IS',           // Şişecam (Industrial)
  TCELL: 'TCELL.IS',         // Turkcell (Telecom)
  BIMAS: 'BIMAS.IS',         // BİM (Retail)
  TUPRS: 'TUPRS.IS',         // Tüpraş (Energy)
  ASELS: 'ASELS.IS',         // Aselsan (Technology)
} as const;

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Track whether Yahoo is returning live data or fallback
let _yahooLiveFetches = 0;
let _yahooFallbackFetches = 0;

/** Returns true if the most recent Yahoo fetch cycle used live data */
export function isYahooLive(): boolean {
  return _yahooLiveFetches > 0 && _yahooFallbackFetches === 0;
}

/** Reset fetch counters (call at the start of each summary generation) */
export function resetYahooCounters(): void {
  _yahooLiveFetches = 0;
  _yahooFallbackFetches = 0;
}

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
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    _yahooLiveFetches++;
    return {
      price,
      change,
      changePercent,
      previousClose,
    };
  } catch (error) {
    console.error(`[Yahoo] Error fetching ${symbol}:`, error);
    _yahooFallbackFetches++;
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
 * Fetch historical OHLCV data with volume for flow calculation
 * This is the key function for volume-weighted flow analysis
 */
async function fetchYahooOHLCV(
  symbol: string,
  range: '1mo' | '3mo' = '1mo'
): Promise<Array<{
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> {
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

    const quote = result.indicators.quote[0];
    const opens = quote?.open || [];
    const highs = quote?.high || [];
    const lows = quote?.low || [];
    const closes = quote?.close || [];
    const volumes = quote?.volume || [];

    return result.timestamp.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: opens[i] || 0,
      high: highs[i] || 0,
      low: lows[i] || 0,
      close: closes[i] || 0,
      volume: volumes[i] || 0,
    })).filter(d => d.close > 0 && d.volume > 0);
  } catch (error) {
    console.error(`[Yahoo] Error fetching OHLCV for ${symbol}:`, error);
    return [];
  }
}

/**
 * Calculate volume-weighted flow from OHLCV data
 * Flow = Volume × Price Direction × Conviction
 *
 * @param symbol - Yahoo Finance symbol
 * @returns Flow history and metrics
 */
export async function calculateVolumeWeightedFlow(symbol: string): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  avgVolume: number;
  currentVolumeRatio: number;
}> {
  const ohlcv = await fetchYahooOHLCV(symbol, '3mo');

  if (ohlcv.length < 7) {
    return {
      flowHistory: [],
      velocityHistory: [],
      flow7d: 0,
      flow30d: 0,
      flowVelocity: 0,
      avgVolume: 0,
      currentVolumeRatio: 0,
    };
  }

  // Calculate average volume (excluding last day)
  const avgVolume = ohlcv.slice(0, -1).reduce((sum, d) => sum + d.volume, 0) / (ohlcv.length - 1);

  // Calculate flow history
  const flowHistory: FlowDataPoint[] = [];
  const velocityHistory: FlowDataPoint[] = [];
  let cumulativeFlow = 0;

  for (let i = 0; i < ohlcv.length; i++) {
    const day = ohlcv[i];

    // Price direction: +1 for up, -1 for down
    const priceChange = day.open !== 0 ? ((day.close - day.open) / day.open) * 100 : 0;

    // Volume conviction: how much above/below average
    const volumeRatio = avgVolume > 0 ? day.volume / avgVolume : 1;

    // Daily flow = price change × volume conviction
    // Higher volume amplifies the signal
    const dailyFlow = priceChange * Math.sqrt(volumeRatio);
    cumulativeFlow += dailyFlow;

    flowHistory.push({
      date: day.date,
      value: Number(cumulativeFlow.toFixed(2)),
    });

    // Velocity (rate of change)
    if (i > 0) {
      const prevFlow = flowHistory[i - 1].value;
      velocityHistory.push({
        date: day.date,
        value: Number((cumulativeFlow - prevFlow).toFixed(2)),
      });
    }
  }

  // Take last 30 days
  const last30 = flowHistory.slice(-30);
  const last30Velocity = velocityHistory.slice(-30);

  // Calculate metrics
  const flow30d = last30[last30.length - 1]?.value || 0;
  const flow7d = last30.length >= 7
    ? flow30d - (last30[last30.length - 8]?.value || 0)
    : flow30d;

  // Current velocity (average of last 7 days)
  const recentVelocity = last30Velocity.slice(-7);
  const flowVelocity = recentVelocity.length > 0
    ? recentVelocity.reduce((sum, v) => sum + v.value, 0) / recentVelocity.length
    : 0;

  // Current volume ratio
  const currentDay = ohlcv[ohlcv.length - 1];
  const currentVolumeRatio = currentDay ? currentDay.volume / avgVolume : 1;

  return {
    flowHistory: last30,
    velocityHistory: last30Velocity,
    flow7d: Number(flow7d.toFixed(2)),
    flow30d: Number(flow30d.toFixed(2)),
    flowVelocity: Number(flowVelocity.toFixed(2)),
    avgVolume,
    currentVolumeRatio: Number(currentVolumeRatio.toFixed(2)),
  };
}

/**
 * Get ETF flow data for a list of ETFs
 * Aggregates volume-weighted flow across multiple ETFs
 */
export async function getETFFlowData(symbols: string[]): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  bySymbol: Map<string, { flow7d: number; flow30d: number }>;
}> {
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const flow = await calculateVolumeWeightedFlow(symbol);
      return { symbol, ...flow };
    })
  );

  // Aggregate flow history by date
  const dateFlows = new Map<string, number>();
  const dateVelocities = new Map<string, number>();

  for (const result of results) {
    for (const point of result.flowHistory) {
      const current = dateFlows.get(point.date) || 0;
      dateFlows.set(point.date, current + point.value / results.length);
    }
    for (const point of result.velocityHistory) {
      const current = dateVelocities.get(point.date) || 0;
      dateVelocities.set(point.date, current + point.value / results.length);
    }
  }

  // Convert to sorted arrays
  const flowHistory = Array.from(dateFlows.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }));

  const velocityHistory = Array.from(dateVelocities.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }));

  // Aggregate metrics
  const flow7d = results.reduce((sum, r) => sum + r.flow7d, 0) / results.length;
  const flow30d = results.reduce((sum, r) => sum + r.flow30d, 0) / results.length;
  const flowVelocity = results.reduce((sum, r) => sum + r.flowVelocity, 0) / results.length;

  // By symbol map
  const bySymbol = new Map<string, { flow7d: number; flow30d: number }>();
  for (const result of results) {
    bySymbol.set(result.symbol, { flow7d: result.flow7d, flow30d: result.flow30d });
  }

  return {
    flowHistory,
    velocityHistory,
    flow7d: Number(flow7d.toFixed(2)),
    flow30d: Number(flow30d.toFixed(2)),
    flowVelocity: Number(flowVelocity.toFixed(2)),
    bySymbol,
  };
}

/**
 * Get bonds flow using volume-weighted ETF analysis
 * Uses TLT, IEF, SHY, LQD, HYG, TIP
 */
export async function getBondsFlowData(): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  durationRotation: 'extending' | 'shortening' | 'neutral';
  creditRotation: 'reaching_for_yield' | 'flight_to_quality' | 'neutral';
  bySymbol: Map<string, { flow7d: number; flow30d: number }>;
}> {
  const bondETFs = [SYMBOLS.TLT, SYMBOLS.IEF, SYMBOLS.SHY, SYMBOLS.LQD, SYMBOLS.HYG, SYMBOLS.TIP];
  const flowData = await getETFFlowData(bondETFs);

  // Duration rotation: TLT vs SHY
  const tltFlow = flowData.bySymbol.get(SYMBOLS.TLT)?.flow7d || 0;
  const shyFlow = flowData.bySymbol.get(SYMBOLS.SHY)?.flow7d || 0;
  const durationDiff = tltFlow - shyFlow;
  const durationRotation = durationDiff > 2 ? 'extending' :
    durationDiff < -2 ? 'shortening' : 'neutral';

  // Credit rotation: HYG vs LQD
  const hygFlow = flowData.bySymbol.get(SYMBOLS.HYG)?.flow7d || 0;
  const lqdFlow = flowData.bySymbol.get(SYMBOLS.LQD)?.flow7d || 0;
  const creditDiff = hygFlow - lqdFlow;
  const creditRotation = creditDiff > 2 ? 'reaching_for_yield' :
    creditDiff < -2 ? 'flight_to_quality' : 'neutral';

  return {
    ...flowData,
    durationRotation,
    creditRotation,
  };
}

/**
 * Get metals flow using volume-weighted ETF analysis
 * Uses GLD, SLV, CPER, GDX
 */
export async function getMetalsFlowData(): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  goldSilverRatio: 'gold_outperforming' | 'silver_outperforming' | 'neutral';
  safeHavenFlow: 'defensive' | 'risk_on' | 'neutral';
  bySymbol: Map<string, { flow7d: number; flow30d: number }>;
}> {
  const metalETFs = [SYMBOLS.GLD, SYMBOLS.SLV, SYMBOLS.CPER, SYMBOLS.GDX];
  const flowData = await getETFFlowData(metalETFs);

  // Gold/Silver ratio
  const gldFlow = flowData.bySymbol.get(SYMBOLS.GLD)?.flow7d || 0;
  const slvFlow = flowData.bySymbol.get(SYMBOLS.SLV)?.flow7d || 0;
  const gsRatio = gldFlow - slvFlow;
  const goldSilverRatio = gsRatio > 2 ? 'gold_outperforming' :
    gsRatio < -2 ? 'silver_outperforming' : 'neutral';

  // Gold vs Copper (safe haven vs growth)
  const cperFlow = flowData.bySymbol.get(SYMBOLS.CPER)?.flow7d || 0;
  const gcRatio = gldFlow - cperFlow;
  const safeHavenFlow = gcRatio > 3 ? 'defensive' :
    gcRatio < -3 ? 'risk_on' : 'neutral';

  return {
    ...flowData,
    goldSilverRatio,
    safeHavenFlow,
  };
}

/**
 * Get stocks flow using volume-weighted sector ETF analysis
 */
export async function getStocksFlowData(): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  sectorRotation: 'risk_on' | 'defensive' | 'neutral';
  bySymbol: Map<string, { flow7d: number; flow30d: number }>;
}> {
  // Main index ETFs
  const mainETFs = ['SPY', 'QQQ', 'IWM'];
  const flowData = await getETFFlowData(mainETFs);

  // Also get sector rotation data
  const riskOnETFs = [SYMBOLS.XLK, SYMBOLS.XLY, SYMBOLS.XLF];
  const defensiveETFs = [SYMBOLS.XLU, SYMBOLS.XLP, SYMBOLS.XLV];

  const [riskOnFlow, defensiveFlow] = await Promise.all([
    getETFFlowData(riskOnETFs),
    getETFFlowData(defensiveETFs),
  ]);

  const rotationDiff = riskOnFlow.flow7d - defensiveFlow.flow7d;
  const sectorRotation = rotationDiff > 3 ? 'risk_on' :
    rotationDiff < -3 ? 'defensive' : 'neutral';

  return {
    ...flowData,
    sectorRotation,
  };
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
  vix3m: number | null;
  termStructure: 'contango' | 'backwardation' | 'flat' | null;
  termSpread: number | null;
}> {
  const [vixQuote, vix3mQuote] = await Promise.all([
    fetchYahooQuote(SYMBOLS.VIX),
    fetchYahooQuote(SYMBOLS.VIX3M).catch(() => null),
  ]);

  if (!vixQuote) {
    return {
      value: 15,
      level: 'neutral',
      vix3m: null,
      termStructure: null,
      termSpread: null,
    };
  }

  const value = vixQuote.price;
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

  // VIX Term Structure: VIX vs VIX3M
  // Contango (VIX < VIX3M): Normal market, short-term calm
  // Backwardation (VIX > VIX3M): Stress, near-term fear exceeds long-term
  let vix3m: number | null = null;
  let termStructure: 'contango' | 'backwardation' | 'flat' | null = null;
  let termSpread: number | null = null;

  if (vix3mQuote) {
    vix3m = parseFloat(vix3mQuote.price.toFixed(2));
    termSpread = parseFloat((value - vix3m).toFixed(2));
    const spreadPct = Math.abs(termSpread) / vix3m;

    if (spreadPct < 0.02) {
      termStructure = 'flat';
    } else if (value > vix3m) {
      termStructure = 'backwardation'; // near-term fear > long-term
    } else {
      termStructure = 'contango'; // normal, calm
    }
  }

  return {
    value: parseFloat(value.toFixed(2)),
    level,
    vix3m,
    termStructure,
    termSpread,
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
      flowHistory: [],
      velocityHistory: [],
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
    flowHistory: [], // Real flow history comes from getStocksFlowData()
    velocityHistory: [], // Real velocity history comes from getStocksFlowData()
    sectors: sectorData,
    lastUpdated: new Date(),
  };
}

/**
 * Get Stock Sector data
 * Comprehensive coverage of all 11 GICS sectors
 */
async function getStockSectors(): Promise<SectorFlow[]> {
  const sectorSymbols = [
    { symbol: SYMBOLS.XLK, name: 'Tech' },
    { symbol: SYMBOLS.XLF, name: 'Finance' },
    { symbol: SYMBOLS.XLE, name: 'Energy' },
    { symbol: SYMBOLS.XLV, name: 'Healthcare' },
    { symbol: SYMBOLS.XLY, name: 'Consumer Discretionary' },
    { symbol: SYMBOLS.XLI, name: 'Industrial' },
    { symbol: SYMBOLS.XLP, name: 'Consumer Staples' },
    { symbol: SYMBOLS.XLU, name: 'Utilities' },
    { symbol: SYMBOLS.XLB, name: 'Materials' },
    { symbol: SYMBOLS.XLRE, name: 'Real Estate' },
    { symbol: SYMBOLS.XLC, name: 'Communication' },
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
      flowHistory: [],
      velocityHistory: [],
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
    flowHistory: [], // Real flow history comes from getMetalsFlowData()
    velocityHistory: [], // Real velocity history comes from getMetalsFlowData()
    sectors,
    lastUpdated: new Date(),
  };
}

/**
 * Get top assets for each stock sector
 * Comprehensive list of top holdings for all 11 GICS sectors
 */
function getSectorTopAssets(sector: string): string[] {
  const assets: Record<string, string[]> = {
    // Technology
    'Tech': ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'],

    // Financials
    'Finance': ['JPM', 'BAC', 'WFC', 'GS', 'MS'],

    // Energy
    'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],

    // Healthcare
    'Healthcare': ['UNH', 'JNJ', 'LLY', 'PFE', 'ABBV'],

    // Consumer Discretionary
    'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],
    'Consumer': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],  // Legacy alias

    // Industrials
    'Industrial': ['CAT', 'DE', 'UPS', 'BA', 'HON'],

    // Consumer Staples
    'Consumer Staples': ['PG', 'KO', 'PEP', 'COST', 'WMT'],

    // Utilities
    'Utilities': ['NEE', 'SO', 'DUK', 'SRE', 'AEP'],

    // Materials
    'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'NEM'],

    // Real Estate
    'Real Estate': ['PLD', 'AMT', 'EQIX', 'SPG', 'O'],

    // Communication Services
    'Communication': ['GOOGL', 'META', 'NFLX', 'DIS', 'T'],
  };

  return assets[sector] || [];
}

/**
 * Get BIST (Borsa İstanbul) Flow data
 * Uses XU100 index as the main indicator
 */
export async function getBistFlow(): Promise<Omit<MarketFlow, 'phase' | 'daysInPhase' | 'phaseStartDate' | 'avgPhaseDuration' | 'rotationSignal' | 'rotationTarget' | 'rotationConfidence'>> {
  const [xu100Quote, xu100History] = await Promise.all([
    fetchYahooQuote(SYMBOLS.XU100),
    fetchYahooHistory(SYMBOLS.XU100, '3mo'),
  ]);

  if (!xu100Quote) {
    return {
      market: 'bist',
      currentValue: 10000,
      flow7d: 0,
      flow30d: 0,
      flowVelocity: 0,
      flowHistory: [],
      velocityHistory: [],
      sectors: [],
      lastUpdated: new Date(),
    };
  }

  const sevenDaysAgo = xu100History.find((d, i) => i >= 5);
  const thirtyDaysAgo = xu100History.find((d, i) => i >= 22);
  const fourteenDaysAgo = xu100History.find((d, i) => i >= 10);

  const flow7d = sevenDaysAgo
    ? ((xu100Quote.price - sevenDaysAgo.close) / sevenDaysAgo.close) * 100
    : 0;

  const flow30d = thirtyDaysAgo
    ? ((xu100Quote.price - thirtyDaysAgo.close) / thirtyDaysAgo.close) * 100
    : 0;

  const previousFlow7d = fourteenDaysAgo && sevenDaysAgo
    ? ((sevenDaysAgo.close - fourteenDaysAgo.close) / fourteenDaysAgo.close) * 100
    : 0;

  const flowVelocity = flow7d - previousFlow7d;

  // Get BIST sectors data
  const sectors = await getBistSectors(flow7d, flow30d);

  // Generate flow history from historical data
  const flowHistory: FlowDataPoint[] = xu100History.slice(-30).map((d, i, arr) => {
    if (i < 7) return { date: d.date.toISOString().split('T')[0], value: 0 };
    const prevClose = arr[i - 7]?.close || d.close;
    return {
      date: d.date.toISOString().split('T')[0],
      value: ((d.close - prevClose) / prevClose) * 100,
    };
  }).filter(d => d.value !== 0);

  // Generate velocity history
  const velocityHistory: FlowDataPoint[] = flowHistory.slice(7).map((d, i) => ({
    date: d.date,
    value: d.value - (flowHistory[i]?.value || 0),
  }));

  return {
    market: 'bist',
    currentValue: xu100Quote.price,
    flow7d: parseFloat(flow7d.toFixed(2)),
    flow30d: parseFloat(flow30d.toFixed(2)),
    flowVelocity: parseFloat(flowVelocity.toFixed(2)),
    flowHistory,
    velocityHistory,
    sectors,
    lastUpdated: new Date(),
  };
}

/**
 * Get BIST sectors data
 */
async function getBistSectors(indexFlow7d: number, indexFlow30d: number): Promise<SectorFlow[]> {
  // Fetch key sector representatives
  const [
    garanQuote, garanHistory,
    thyaoQuote, thyaoHistory,
    ereglQuote, ereglHistory,
    tcellQuote, tcellHistory,
    bimasQuote, bimasHistory,
    tuprsQuote, tuprsHistory,
  ] = await Promise.all([
    fetchYahooQuote(SYMBOLS.GARAN),
    fetchYahooHistory(SYMBOLS.GARAN, '1mo'),
    fetchYahooQuote(SYMBOLS.THYAO),
    fetchYahooHistory(SYMBOLS.THYAO, '1mo'),
    fetchYahooQuote(SYMBOLS.EREGL),
    fetchYahooHistory(SYMBOLS.EREGL, '1mo'),
    fetchYahooQuote(SYMBOLS.TCELL),
    fetchYahooHistory(SYMBOLS.TCELL, '1mo'),
    fetchYahooQuote(SYMBOLS.BIMAS),
    fetchYahooHistory(SYMBOLS.BIMAS, '1mo'),
    fetchYahooQuote(SYMBOLS.TUPRS),
    fetchYahooHistory(SYMBOLS.TUPRS, '1mo'),
  ]);

  const calculateFlow = (quote: typeof garanQuote, history: typeof garanHistory) => {
    if (!quote || history.length < 7) return { flow7d: 0, flow30d: 0 };
    const sevenDaysAgo = history.find((d, i) => i >= 5);
    const flow7d = sevenDaysAgo
      ? ((quote.price - sevenDaysAgo.close) / sevenDaysAgo.close) * 100
      : 0;
    return { flow7d: parseFloat(flow7d.toFixed(2)), flow30d: indexFlow30d };
  };

  const bankingFlow = calculateFlow(garanQuote, garanHistory);
  const aviationFlow = calculateFlow(thyaoQuote, thyaoHistory);
  const industrialFlow = calculateFlow(ereglQuote, ereglHistory);
  const telecomFlow = calculateFlow(tcellQuote, tcellHistory);
  const retailFlow = calculateFlow(bimasQuote, bimasHistory);
  const energyFlow = calculateFlow(tuprsQuote, tuprsHistory);

  const sectors: SectorFlow[] = [
    {
      name: 'Banking',
      flow7d: bankingFlow.flow7d,
      flow30d: bankingFlow.flow30d,
      dominance: 35, // Banks dominate BIST
      trending: bankingFlow.flow7d > 1 ? 'up' : bankingFlow.flow7d < -1 ? 'down' : 'stable',
      topAssets: ['GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'HALKB'],
    },
    {
      name: 'Holding',
      flow7d: (bankingFlow.flow7d + industrialFlow.flow7d) / 2, // Holdings are diversified
      flow30d: indexFlow30d,
      dominance: 15,
      trending: indexFlow7d > 1 ? 'up' : indexFlow7d < -1 ? 'down' : 'stable',
      topAssets: ['KCHOL', 'SAHOL', 'TAVHL', 'TKFEN', 'DOHOL'],
    },
    {
      name: 'Industrial',
      flow7d: industrialFlow.flow7d,
      flow30d: industrialFlow.flow30d,
      dominance: 20,
      trending: industrialFlow.flow7d > 1 ? 'up' : industrialFlow.flow7d < -1 ? 'down' : 'stable',
      topAssets: ['EREGL', 'SISE', 'TOASO', 'FROTO', 'TUPRS'],
    },
    {
      name: 'Aviation',
      flow7d: aviationFlow.flow7d,
      flow30d: aviationFlow.flow30d,
      dominance: 10,
      trending: aviationFlow.flow7d > 1 ? 'up' : aviationFlow.flow7d < -1 ? 'down' : 'stable',
      topAssets: ['THYAO', 'PGSUS'],
    },
    {
      name: 'Telecom',
      flow7d: telecomFlow.flow7d,
      flow30d: telecomFlow.flow30d,
      dominance: 8,
      trending: telecomFlow.flow7d > 1 ? 'up' : telecomFlow.flow7d < -1 ? 'down' : 'stable',
      topAssets: ['TCELL', 'TTKOM'],
    },
    {
      name: 'Retail',
      flow7d: retailFlow.flow7d,
      flow30d: retailFlow.flow30d,
      dominance: 7,
      trending: retailFlow.flow7d > 1 ? 'up' : retailFlow.flow7d < -1 ? 'down' : 'stable',
      topAssets: ['BIMAS', 'MGROS', 'SOKM'],
    },
    {
      name: 'Technology',
      flow7d: (industrialFlow.flow7d + telecomFlow.flow7d) / 2, // No pure tech sector, use proxy
      flow30d: indexFlow30d,
      dominance: 5,
      trending: indexFlow7d > 1 ? 'up' : indexFlow7d < -1 ? 'down' : 'stable',
      topAssets: ['ASELS', 'LOGO', 'ARENA'],
    },
  ];

  return sectors;
}

/**
 * Get BIST flow data using volume-weighted analysis
 */
export async function getBistFlowData(): Promise<{
  flowHistory: FlowDataPoint[];
  velocityHistory: FlowDataPoint[];
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  sectorRotation: 'risk_on' | 'defensive' | 'neutral';
  bySymbol: Map<string, { flow7d: number; flow30d: number }>;
}> {
  // Main BIST stocks for flow analysis
  const bistStocks = [
    SYMBOLS.XU100,
    SYMBOLS.GARAN,
    SYMBOLS.AKBNK,
    SYMBOLS.THYAO,
    SYMBOLS.KCHOL,
    SYMBOLS.EREGL,
    SYMBOLS.TCELL,
    SYMBOLS.BIMAS,
  ];

  const flowData = await getETFFlowData(bistStocks);

  // Risk-on vs defensive: Banking/Aviation vs Retail/Telecom
  const riskOnStocks = [SYMBOLS.GARAN, SYMBOLS.AKBNK, SYMBOLS.THYAO];
  const defensiveStocks = [SYMBOLS.BIMAS, SYMBOLS.TCELL];

  const [riskOnFlow, defensiveFlow] = await Promise.all([
    getETFFlowData(riskOnStocks),
    getETFFlowData(defensiveStocks),
  ]);

  const rotationDiff = riskOnFlow.flow7d - defensiveFlow.flow7d;
  const sectorRotation = rotationDiff > 3 ? 'risk_on' :
    rotationDiff < -3 ? 'defensive' : 'neutral';

  return {
    ...flowData,
    sectorRotation,
  };
}

/**
 * Get all Yahoo data in one call
 */
export async function getAllYahooData() {
  const [dxy, vix, stocks, metals, bist] = await Promise.all([
    getDxyData(),
    getVixData(),
    getStocksFlow(),
    getMetalsFlow(),
    getBistFlow(),
  ]);

  return {
    dxy,
    vix,
    stocks,
    metals,
    bist,
  };
}
