/**
 * Capital Flow Service
 *
 * Global Capital Flow Intelligence Platform
 *
 * Core Principle: "Para nereye akıyorsa potansiyel oradadır"
 * (Where money flows, potential exists)
 *
 * This service provides:
 * - Global liquidity tracking (Fed, M2, DXY, VIX)
 * - Market flow analysis (Crypto, Stocks, Bonds, Metals)
 * - Phase detection (Early, Mid, Late, Exit)
 * - Rotation signals
 * - Investment recommendations
 */

import { redis } from '../../core/cache';
import { callGeminiWithRetry } from '../../core/gemini';
import {
  CapitalFlowSummary,
  GlobalLiquidity,
  MarketFlow,
  MarketType,
  Phase,
  LiquidityBias,
  FlowRecommendation,
  ActiveRotation,
  LayerInsights,
  MarketCorrelation,
  CorrelationMatrix,
  TradeOpportunities,
  RotationTradeOpportunity,
  FlowDataPoint,
  SuggestedAsset,
  PHASE_CONFIG,
  MARKET_CONFIG,
  RrpTrend,
  TgaTrend,
} from './types';

// Providers
import { getAllFredData } from './providers/fred.provider';
import {
  getAllYahooData,
  getDxyData,
  getVixData,
  getStocksFlow,
  getMetalsFlow,
  getBondsFlowData,
  getMetalsFlowData,
  getStocksFlowData,
} from './providers/yahoo.provider';
import { getAllDefiLlamaData, getCryptoSectors, getDeFiTvl, getStablecoinMarketCap } from './providers/defillama.provider';
import { getCompleteCryptoFlowData } from './providers/binance.provider';

// Cache keys
const CACHE_KEYS = {
  CAPITAL_FLOW: 'capital-flow:summary',
  GLOBAL_LIQUIDITY: 'capital-flow:liquidity',
  MARKET_FLOW: (market: MarketType) => `capital-flow:market:${market}`,
  INSIGHTS: 'capital-flow:insights',
  ROTATION_HISTORY: 'capital-flow:rotation-history',
  CORRELATIONS: 'capital-flow:correlations',
  TRADE_OPPORTUNITIES: 'capital-flow:trade-opportunities',
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  SUMMARY: 300,      // 5 minutes
  LIQUIDITY: 3600,   // 1 hour (FRED data is daily)
  MARKET: 300,       // 5 minutes
  ROTATION: 86400,   // 24 hours
  INSIGHTS: 900,     // 15 minutes (AI insights)
  CORRELATIONS: 1800, // 30 minutes
  TRADE_OPPORTUNITIES: 600, // 10 minutes
};

/**
 * Get complete Capital Flow Summary
 */
export async function getCapitalFlowSummary(): Promise<CapitalFlowSummary> {
  // Try cache first
  try {
    const cached = await redis?.get(CACHE_KEYS.CAPITAL_FLOW);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    console.warn('[CapitalFlow] Cache read error:', cacheError);
    // Continue without cache
  }

  // Fetch all data in parallel with fallback
  const results = await Promise.allSettled([
    getGlobalLiquidity(),
    getAllMarketFlows(),
  ]);

  // Extract results with fallbacks
  const globalLiquidity: GlobalLiquidity = results[0].status === 'fulfilled'
    ? results[0].value
    : getFallbackGlobalLiquidity();

  const markets: MarketFlow[] = results[1].status === 'fulfilled'
    ? results[1].value
    : getFallbackMarketFlows();

  // Log any failures for debugging
  if (results[0].status === 'rejected') {
    console.error('[CapitalFlow] Failed to fetch global liquidity:', results[0].reason);
  }
  if (results[1].status === 'rejected') {
    console.error('[CapitalFlow] Failed to fetch market flows:', results[1].reason);
  }

  // Determine liquidity bias
  const liquidityBias = determineLiquidityBias(globalLiquidity);

  // Calculate market correlations first (needed for 5-factor scoring)
  let correlations: CorrelationMatrix | undefined;
  try {
    correlations = await calculateMarketCorrelations(markets);
  } catch (error) {
    console.error('[CapitalFlow] Error calculating correlations:', error);
  }

  // Generate BUY recommendation using 5-FACTOR SCORING SYSTEM
  const recommendation = generateRecommendation(globalLiquidity, markets, liquidityBias, correlations);

  // Generate SELL recommendation using 5-FACTOR SCORING SYSTEM
  const sellRecommendation = generateSellRecommendation(markets, liquidityBias, globalLiquidity, correlations);

  // Detect active rotation
  const activeRotation = detectActiveRotation(markets);

  // Note: correlations already calculated above for 5-factor scoring

  // Detect trade opportunities from rotation
  let tradeOpportunities: TradeOpportunities | undefined;
  try {
    tradeOpportunities = await detectTradeOpportunities(markets, correlations);
  } catch (error) {
    console.error('[CapitalFlow] Error detecting trade opportunities:', error);
  }

  // Generate AI insights (non-blocking, with fallback)
  let insights: LayerInsights | undefined;
  try {
    insights = await generateLayerInsights(globalLiquidity, markets, liquidityBias, recommendation, activeRotation);
  } catch (error) {
    console.error('[CapitalFlow] Error generating AI insights:', error);
    // Continue without insights
  }

  const summary: CapitalFlowSummary = {
    timestamp: new Date(),
    globalLiquidity,
    liquidityBias,
    markets,
    correlations,
    tradeOpportunities,
    recommendation,
    sellRecommendation: sellRecommendation || undefined,
    activeRotation,
    insights,
    cacheExpiry: new Date(Date.now() + CACHE_TTL.SUMMARY * 1000),
  };

  // Cache the result
  if (redis) {
    await redis.setex(CACHE_KEYS.CAPITAL_FLOW, CACHE_TTL.SUMMARY, JSON.stringify(summary));
  }

  return summary;
}

/**
 * Get Global Liquidity data
 */
export async function getGlobalLiquidity(): Promise<GlobalLiquidity> {
  // Try cache
  try {
    const cached = await redis?.get(CACHE_KEYS.GLOBAL_LIQUIDITY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    console.warn('[CapitalFlow] Cache read error for liquidity:', cacheError);
  }

  try {
    // Fetch from providers with timeout
    const results = await Promise.allSettled([
      getAllFredData(),
      getDxyData(),
      getVixData(),
    ]);

    // Extract results - use fallback if any failed
    const fredData = results[0].status === 'fulfilled' ? results[0].value : null;
    const dxyData = results[1].status === 'fulfilled' ? results[1].value : null;
    const vixData = results[2].status === 'fulfilled' ? results[2].value : null;

    // Log failures for debugging
    if (results[0].status === 'rejected') {
      console.error('[CapitalFlow] FRED data fetch failed:', results[0].reason);
    }
    if (results[1].status === 'rejected') {
      console.error('[CapitalFlow] DXY data fetch failed:', results[1].reason);
    }
    if (results[2].status === 'rejected') {
      console.error('[CapitalFlow] VIX data fetch failed:', results[2].reason);
    }

    // If all failed, return fallback
    if (!fredData && !dxyData && !vixData) {
      console.warn('[CapitalFlow] All liquidity data fetches failed, using fallback');
      return getFallbackGlobalLiquidity();
    }

    const liquidity: GlobalLiquidity = {
      fedBalanceSheet: fredData?.fedBalanceSheet ?? { value: 7.5, change30d: 0, trend: 'stable' },
      m2MoneySupply: fredData?.m2MoneySupply ?? { value: 21.0, change30d: 0, yoyGrowth: 3 },
      dxy: dxyData ?? { value: 104, change7d: 0, trend: 'stable' },
      vix: vixData ?? { value: 18, level: 'neutral' },
      yieldCurve: fredData?.yieldCurve ?? { spread10y2y: 0.15, inverted: false, interpretation: 'Flat curve' },
      reverseRepo: fredData?.reverseRepo ?? { value: 0.5, change7d: 0, change30d: 0, trend: 'stable' },
      treasuryGeneralAccount: fredData?.treasuryGeneralAccount ?? { value: 0.7, change7d: 0, change30d: 0, trend: 'stable' },
      netLiquidity: fredData?.netLiquidity ?? { value: 6.3, change7d: 0, change30d: 0, trend: 'stable', components: { fedBalanceSheet: 7.5, reverseRepo: 0.5, tga: 0.7 }, interpretation: 'Stable' },
      lastUpdated: new Date(),
    };

    // Cache
    if (redis) {
      try {
        await redis.setex(CACHE_KEYS.GLOBAL_LIQUIDITY, CACHE_TTL.LIQUIDITY, JSON.stringify(liquidity));
      } catch (cacheWriteError) {
        console.warn('[CapitalFlow] Cache write error for liquidity:', cacheWriteError);
      }
    }

    return liquidity;
  } catch (error) {
    console.error('[CapitalFlow] getGlobalLiquidity error:', error);
    return getFallbackGlobalLiquidity();
  }
}

/**
 * Get all market flows
 */
export async function getAllMarketFlows(): Promise<MarketFlow[]> {
  try {
    const results = await Promise.allSettled([
      getCryptoFlow(),
      getStocksMarketFlow(),
      getBondsFlow(),
      getMetalsMarketFlow(),
    ]);

    // Log failures for debugging
    const marketNames = ['crypto', 'stocks', 'bonds', 'metals'];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[CapitalFlow] ${marketNames[index]} flow fetch failed:`, result.reason);
      }
    });

    // Get fallback data to use for failed fetches
    const fallbackFlows = getFallbackMarketFlows();

    // Use successful results or fallback for failed ones
    const flows: MarketFlow[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      // Use fallback for failed fetch
      console.warn(`[CapitalFlow] Using fallback data for ${marketNames[index]}`);
      return fallbackFlows[index];
    });

    return flows;
  } catch (error) {
    console.error('[CapitalFlow] getAllMarketFlows error:', error);
    return getFallbackMarketFlows();
  }
}

/**
 * Get single market flow
 */
export async function getMarketFlow(market: MarketType): Promise<MarketFlow> {
  // Try cache
  const cached = await redis?.get(CACHE_KEYS.MARKET_FLOW(market));
  if (cached) {
    return JSON.parse(cached);
  }

  let flow: MarketFlow;

  switch (market) {
    case 'crypto':
      flow = await getCryptoFlow();
      break;
    case 'stocks':
      flow = await getStocksMarketFlow();
      break;
    case 'bonds':
      flow = await getBondsFlow();
      break;
    case 'metals':
      flow = await getMetalsMarketFlow();
      break;
    default:
      throw new Error(`Unknown market: ${market}`);
  }

  // Cache
  if (redis) {
    await redis.setex(CACHE_KEYS.MARKET_FLOW(market), CACHE_TTL.MARKET, JSON.stringify(flow));
  }

  return flow;
}

// Note: Synthetic data generation functions removed
// Now using REAL data from Binance and Yahoo Finance providers
// Flow = Volume × Price Direction × Conviction (not just price change)

/**
 * Get Crypto market flow
 * Uses REAL data from Binance (OHLCV, Order Book, Derivatives)
 */
async function getCryptoFlow(): Promise<MarketFlow> {
  // Fetch real crypto flow data from Binance
  const [binanceFlowData, sectors, stablecoins] = await Promise.all([
    getCompleteCryptoFlowData(),
    getCryptoSectors(),
    getStablecoinMarketCap(),
  ]);

  // Also get CoinGecko global data for total market cap
  let totalMarketCap = 0;
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/global', {
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      totalMarketCap = data.data?.total_market_cap?.usd || 0;
    }
  } catch (error) {
    console.error('[CapitalFlow] CoinGecko error:', error);
    totalMarketCap = binanceFlowData.totalVolume24h * 50; // Rough estimate from daily volume
  }

  // Use REAL flow data from Binance (volume-weighted, order book, derivatives)
  const baseFlow = {
    market: 'crypto' as const,
    currentValue: totalMarketCap / 1_000_000_000_000, // Trillions
    flow7d: binanceFlowData.flow7d,
    flow30d: binanceFlowData.flow30d,
    flowVelocity: binanceFlowData.flowVelocity,
    flowHistory: binanceFlowData.flowHistory,
    velocityHistory: binanceFlowData.velocityHistory,
    sectors,
    // Additional real data components
    orderBookImbalance: binanceFlowData.orderBookImbalance,
    derivativesScore: binanceFlowData.derivativesScore,
    volumeChange7d: binanceFlowData.volumeChange7d,
    lastUpdated: new Date(),
  };

  const phase = detectPhase(baseFlow);
  const phaseInfo = getPhaseInfo(phase, baseFlow);

  return {
    ...baseFlow,
    ...phaseInfo,
    rotationSignal: detectRotationSignal(baseFlow),
    rotationTarget: null,
    rotationConfidence: 0,
  };
}

/**
 * Get Stocks market flow
 * Uses REAL volume-weighted ETF flow data from Yahoo Finance
 */
async function getStocksMarketFlow(): Promise<MarketFlow> {
  // Fetch REAL volume-weighted flow from ETFs (SPY, QQQ, IWM + sector ETFs)
  const [volumeWeightedFlow, stocksData] = await Promise.all([
    getStocksFlowData(),
    getStocksFlow(),
  ]);

  // Combine price data with real volume-weighted flow
  const baseFlow = {
    market: 'stocks' as const,
    currentValue: stocksData.currentValue,
    flow7d: volumeWeightedFlow.flow7d,
    flow30d: volumeWeightedFlow.flow30d,
    flowVelocity: volumeWeightedFlow.flowVelocity,
    flowHistory: volumeWeightedFlow.flowHistory,
    velocityHistory: volumeWeightedFlow.velocityHistory,
    sectors: stocksData.sectors,
    // Additional real data
    sectorRotation: volumeWeightedFlow.sectorRotation,
    lastUpdated: new Date(),
  };

  const phase = detectPhase(baseFlow);
  const phaseInfo = getPhaseInfo(phase, baseFlow);

  return {
    ...baseFlow,
    ...phaseInfo,
    rotationSignal: detectRotationSignal(baseFlow),
    rotationTarget: null,
    rotationConfidence: 0,
  };
}

/**
 * Get Bonds market flow
 * Uses REAL volume-weighted ETF flow data (TLT, IEF, SHY, LQD, HYG, TIP)
 */
async function getBondsFlow(): Promise<MarketFlow> {
  // Fetch REAL volume-weighted flow from bond ETFs
  const [bondsFlowData, fredData] = await Promise.all([
    getBondsFlowData(),
    getAllFredData(),
  ]);

  // Create sector data based on real ETF flows
  const tltFlow = bondsFlowData.bySymbol?.get('TLT');
  const iefFlow = bondsFlowData.bySymbol?.get('IEF');
  const shyFlow = bondsFlowData.bySymbol?.get('SHY');
  const lqdFlow = bondsFlowData.bySymbol?.get('LQD');
  const hygFlow = bondsFlowData.bySymbol?.get('HYG');
  const tipFlow = bondsFlowData.bySymbol?.get('TIP');

  // Treasury sector (TLT + IEF + SHY)
  const treasuryFlow7d = ((tltFlow?.flow7d || 0) + (iefFlow?.flow7d || 0) + (shyFlow?.flow7d || 0)) / 3;
  const treasuryFlow30d = ((tltFlow?.flow30d || 0) + (iefFlow?.flow30d || 0) + (shyFlow?.flow30d || 0)) / 3;

  // Corporate sector (LQD + HYG)
  const corpFlow7d = ((lqdFlow?.flow7d || 0) + (hygFlow?.flow7d || 0)) / 2;
  const corpFlow30d = ((lqdFlow?.flow30d || 0) + (hygFlow?.flow30d || 0)) / 2;

  const baseFlow = {
    market: 'bonds' as const,
    currentValue: fredData.yieldCurve.spread10y2y,
    flow7d: bondsFlowData.flow7d,
    flow30d: bondsFlowData.flow30d,
    flowVelocity: bondsFlowData.flowVelocity,
    flowHistory: bondsFlowData.flowHistory,
    velocityHistory: bondsFlowData.velocityHistory,
    sectors: [
      {
        name: 'Treasury',
        flow7d: Number(treasuryFlow7d.toFixed(2)),
        flow30d: Number(treasuryFlow30d.toFixed(2)),
        dominance: 70,
        trending: treasuryFlow7d > 1 ? 'up' as const : treasuryFlow7d < -1 ? 'down' as const : 'stable' as const,
        topAssets: ['TLT', 'IEF', 'SHY', 'BND', 'AGG'],
      },
      {
        name: 'Corporate',
        flow7d: Number(corpFlow7d.toFixed(2)),
        flow30d: Number(corpFlow30d.toFixed(2)),
        dominance: 25,
        trending: corpFlow7d > 1 ? 'up' as const : corpFlow7d < -1 ? 'down' as const : 'stable' as const,
        topAssets: ['LQD', 'HYG', 'JNK', 'VCIT', 'VCSH'],
      },
      {
        name: 'TIPS',
        flow7d: tipFlow?.flow7d || 0,
        flow30d: tipFlow?.flow30d || 0,
        dominance: 5,
        trending: (tipFlow?.flow7d || 0) > 1 ? 'up' as const : (tipFlow?.flow7d || 0) < -1 ? 'down' as const : 'stable' as const,
        topAssets: ['TIP', 'SCHP', 'VTIP', 'STIP'],
      },
    ],
    // Additional real data
    durationRotation: bondsFlowData.durationRotation,
    creditRotation: bondsFlowData.creditRotation,
    yieldCurve: fredData.yieldCurve,
    lastUpdated: new Date(),
  };

  const phase = detectPhase(baseFlow);
  const phaseInfo = getPhaseInfo(phase, baseFlow);

  return {
    ...baseFlow,
    ...phaseInfo,
    rotationSignal: detectRotationSignal(baseFlow),
    rotationTarget: null,
    rotationConfidence: 0,
  };
}

/**
 * Get Metals market flow
 * Uses REAL volume-weighted ETF flow data (GLD, SLV, CPER, GDX)
 */
async function getMetalsMarketFlow(): Promise<MarketFlow> {
  // Fetch REAL volume-weighted flow from metal ETFs
  const [metalsFlowData, metalsData] = await Promise.all([
    getMetalsFlowData(),
    getMetalsFlow(),
  ]);

  // Create sector data based on real ETF flows
  const gldFlow = metalsFlowData.bySymbol?.get('GLD');
  const slvFlow = metalsFlowData.bySymbol?.get('SLV');
  const cperFlow = metalsFlowData.bySymbol?.get('CPER');
  const gdxFlow = metalsFlowData.bySymbol?.get('GDX');

  const baseFlow = {
    market: 'metals' as const,
    currentValue: metalsData.currentValue,
    flow7d: metalsFlowData.flow7d,
    flow30d: metalsFlowData.flow30d,
    flowVelocity: metalsFlowData.flowVelocity,
    flowHistory: metalsFlowData.flowHistory,
    velocityHistory: metalsFlowData.velocityHistory,
    sectors: [
      {
        name: 'Gold',
        flow7d: gldFlow?.flow7d || 0,
        flow30d: gldFlow?.flow30d || 0,
        dominance: 70,
        trending: (gldFlow?.flow7d || 0) > 1 ? 'up' as const : (gldFlow?.flow7d || 0) < -1 ? 'down' as const : 'stable' as const,
        topAssets: ['GLD', 'IAU', 'SGOL', 'GLDM', 'AAAU'],
      },
      {
        name: 'Silver',
        flow7d: slvFlow?.flow7d || 0,
        flow30d: slvFlow?.flow30d || 0,
        dominance: 15,
        trending: (slvFlow?.flow7d || 0) > 1 ? 'up' as const : (slvFlow?.flow7d || 0) < -1 ? 'down' as const : 'stable' as const,
        topAssets: ['SLV', 'SIVR', 'AGQ', 'SIL'],
      },
      {
        name: 'Copper',
        flow7d: cperFlow?.flow7d || 0,
        flow30d: cperFlow?.flow30d || 0,
        dominance: 10,
        trending: (cperFlow?.flow7d || 0) > 1 ? 'up' as const : (cperFlow?.flow7d || 0) < -1 ? 'down' as const : 'stable' as const,
        topAssets: ['CPER', 'COPX', 'JJC'],
      },
      {
        name: 'Miners',
        flow7d: gdxFlow?.flow7d || 0,
        flow30d: gdxFlow?.flow30d || 0,
        dominance: 5,
        trending: (gdxFlow?.flow7d || 0) > 1 ? 'up' as const : (gdxFlow?.flow7d || 0) < -1 ? 'down' as const : 'stable' as const,
        topAssets: ['GDX', 'GDXJ', 'SIL', 'SILJ'],
      },
    ],
    // Additional real data
    goldSilverRatio: metalsFlowData.goldSilverRatio,
    safeHavenFlow: metalsFlowData.safeHavenFlow,
    lastUpdated: new Date(),
  };

  const phase = detectPhase(baseFlow);
  const phaseInfo = getPhaseInfo(phase, baseFlow);

  return {
    ...baseFlow,
    ...phaseInfo,
    rotationSignal: detectRotationSignal(baseFlow),
    rotationTarget: null,
    rotationConfidence: 0,
  };
}

/**
 * Calculate percentile of a value within an array
 * @param value The value to find percentile for
 * @param array Array of values to compare against
 * @returns Percentile (0-100)
 */
function calculatePercentile(value: number, array: number[]): number {
  if (array.length === 0) return 50; // Default to median if no data

  const sorted = [...array].sort((a, b) => a - b);
  let count = 0;

  for (const v of sorted) {
    if (v < value) count++;
  }

  return (count / sorted.length) * 100;
}

/**
 * Detect market phase using PERCENTILE-BASED DETECTION
 *
 * This approach is more adaptive than simple thresholds:
 * - Compares current flow to historical distribution
 * - Self-calibrating based on market conditions
 * - More accurate across different market environments
 *
 * Phase Detection Logic:
 * - EARLY: High flow percentile (>75), positive velocity, not yet established (30d percentile < 75)
 * - MID: Moderate flow percentile (25-75), stable velocity
 * - LATE: High 30d flow (>75) but declining velocity (<25 percentile)
 * - EXIT: Low flow percentile (<25) or negative velocity (<10 percentile)
 */
function detectPhase(flow: {
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  flowHistory?: FlowDataPoint[];
  velocityHistory?: FlowDataPoint[];
}): Phase {
  const { flow7d, flow30d, flowVelocity, flowHistory, velocityHistory } = flow;

  // Extract historical values for percentile calculation
  const historicalFlows = flowHistory?.map(h => h.value) || [];
  const historicalVelocities = velocityHistory?.map(h => h.value) || [];

  // If we have sufficient historical data, use percentile-based detection
  if (historicalFlows.length >= 10) {
    const flow7dPercentile = calculatePercentile(flow7d, historicalFlows);
    const flow30dPercentile = calculatePercentile(flow30d, historicalFlows);
    const velocityPercentile = historicalVelocities.length >= 5
      ? calculatePercentile(flowVelocity, historicalVelocities)
      : 50;

    // EARLY PHASE: Strong recent flow, positive acceleration, trend is young
    // - 7d flow in top quartile (>75th percentile)
    // - Positive velocity (accelerating)
    // - 30d flow not yet at extreme (< 75th percentile) - trend hasn't matured
    if (flow7dPercentile > 75 && velocityPercentile > 50 && flow30dPercentile < 75) {
      return 'early';
    }

    // EXIT PHASE: Weak flow or negative velocity
    // - 7d flow in bottom quartile (<25th percentile) OR
    // - Velocity in bottom decile (<10th percentile)
    if (flow7dPercentile < 25 || velocityPercentile < 10) {
      return 'exit';
    }

    // LATE PHASE: Strong 30d flow but declining momentum
    // - 30d flow in top quartile (>75th percentile)
    // - Velocity in bottom quartile (<25th percentile) - slowing down
    // - 7d flow weaker than 30d trend (exhaustion)
    if (flow30dPercentile > 75 && velocityPercentile < 25 && flow7d < flow30d * 0.5) {
      return 'late';
    }

    // MID PHASE: Everything in moderate range
    // Default state when trend is established but not extreme
    return 'mid';
  }

  // FALLBACK: Simple threshold-based detection when insufficient historical data
  // EARLY: New inflow starting (positive but not yet established)
  if (flow7d > 3 && flow30d < 10 && flowVelocity > 0) {
    return 'early';
  }

  // EXIT: Outflow or reversal
  if (flow7d < -2 || flowVelocity < -3) {
    return 'exit';
  }

  // LATE: Trend exhaustion (slowing down)
  if (flow7d < flow30d * 0.3 && flow30d > 15) {
    return 'late';
  }

  // MID: Established trend (consistent flow)
  if (flow7d > 0 && flow30d > 5) {
    return 'mid';
  }

  // Default to mid if can't determine
  return 'mid';
}

/**
 * Get phase info with estimated days and historical average
 */
function getPhaseInfo(phase: Phase, flow: { flow7d: number; flow30d: number }): {
  phase: Phase;
  daysInPhase: number;
  phaseStartDate: Date;
  avgPhaseDuration: number;
} {
  // Estimate days in phase based on flow characteristics
  let daysInPhase: number;

  switch (phase) {
    case 'early':
      daysInPhase = Math.min(30, Math.max(1, Math.round((flow.flow30d / flow.flow7d) * 7)));
      break;
    case 'mid':
      daysInPhase = Math.min(60, Math.max(30, 30 + Math.round(flow.flow30d)));
      break;
    case 'late':
      daysInPhase = Math.min(90, Math.max(60, 60 + Math.round((flow.flow30d - flow.flow7d) * 2)));
      break;
    case 'exit':
      daysInPhase = 90;
      break;
    default:
      daysInPhase = 30;
  }

  const phaseStartDate = new Date();
  phaseStartDate.setDate(phaseStartDate.getDate() - daysInPhase);

  // Historical average durations (approximate)
  const avgPhaseDuration: Record<Phase, number> = {
    early: 25,
    mid: 45,
    late: 30,
    exit: 20,
  };

  return {
    phase,
    daysInPhase,
    phaseStartDate,
    avgPhaseDuration: avgPhaseDuration[phase],
  };
}

/**
 * Calculate flow velocity (acceleration)
 */
function calculateVelocity(flow7d: number, flow30d: number): number {
  // Velocity = current week vs average of previous weeks
  const avgWeeklyFlow = flow30d / 4;
  return parseFloat((flow7d - avgWeeklyFlow).toFixed(2));
}

/**
 * Detect rotation signal for a market
 */
function detectRotationSignal(flow: { flow7d: number; flowVelocity: number }): 'entering' | 'stable' | 'exiting' | null {
  if (flow.flowVelocity > 2 && flow.flow7d > 3) {
    return 'entering';
  }

  if (flow.flowVelocity < -2 || flow.flow7d < -2) {
    return 'exiting';
  }

  if (Math.abs(flow.flowVelocity) < 1 && Math.abs(flow.flow7d) < 3) {
    return 'stable';
  }

  return null;
}

/**
 * Fallback global liquidity data when API calls fail
 */
function getFallbackGlobalLiquidity(): GlobalLiquidity {
  const now = new Date();
  return {
    fedBalanceSheet: {
      value: 7.5,
      change30d: 0.5,
      trend: 'stable',
    },
    m2MoneySupply: {
      value: 21.0,
      change30d: 0.3,
      yoyGrowth: 3.5,
    },
    dxy: {
      value: 104.5,
      change7d: -0.5,
      trend: 'stable',
    },
    vix: {
      value: 18.5,
      level: 'neutral',
    },
    yieldCurve: {
      spread10y2y: 0.15,
      inverted: false,
      interpretation: 'Flat - uncertain economic outlook',
    },
    reverseRepo: {
      value: 0.5,
      change7d: -2.0,
      change30d: -8.0,
      trend: 'draining',
    },
    treasuryGeneralAccount: {
      value: 0.7,
      change7d: 1.5,
      change30d: 5.0,
      trend: 'stable',
    },
    netLiquidity: {
      value: 6.3,
      change7d: 0.5,
      change30d: 1.5,
      trend: 'stable',
      components: {
        fedBalanceSheet: 7.5,
        reverseRepo: 0.5,
        tga: 0.7,
      },
      interpretation: 'Liquidity stable: all components balanced',
    },
    lastUpdated: now,
  };
}

/**
 * Fallback market flows when API calls fail
 */
function getFallbackMarketFlows(): MarketFlow[] {
  const now = new Date();
  const generateHistory = (baseValue: number) => {
    const history: FlowDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      history.push({
        date: date.toISOString().split('T')[0],
        value: baseValue + (Math.random() - 0.5) * 2,
      });
    }
    return history;
  };

  return [
    {
      market: 'crypto' as MarketType,
      currentValue: 2500000000000,
      flow7d: 1.5,
      flow30d: 3.2,
      flowVelocity: 0.5,
      flowHistory: generateHistory(3.2),
      velocityHistory: generateHistory(0.5),
      phase: 'mid' as Phase,
      daysInPhase: 25,
      phaseStartDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      avgPhaseDuration: 45,
      rotationSignal: 'stable',
      rotationTarget: null,
      rotationConfidence: 50,
      sectors: [],
      lastUpdated: now,
    },
    {
      market: 'stocks' as MarketType,
      currentValue: 45000000000000,
      flow7d: 0.8,
      flow30d: 2.1,
      flowVelocity: 0.3,
      flowHistory: generateHistory(2.1),
      velocityHistory: generateHistory(0.3),
      phase: 'mid' as Phase,
      daysInPhase: 30,
      phaseStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      avgPhaseDuration: 60,
      rotationSignal: 'stable',
      rotationTarget: null,
      rotationConfidence: 50,
      sectors: [],
      lastUpdated: now,
    },
    {
      market: 'bonds' as MarketType,
      currentValue: 50000000000000,
      flow7d: -0.5,
      flow30d: -1.2,
      flowVelocity: -0.2,
      flowHistory: generateHistory(-1.2),
      velocityHistory: generateHistory(-0.2),
      phase: 'late' as Phase,
      daysInPhase: 45,
      phaseStartDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      avgPhaseDuration: 50,
      rotationSignal: 'exiting',
      rotationTarget: null,
      rotationConfidence: 40,
      sectors: [],
      lastUpdated: now,
    },
    {
      market: 'metals' as MarketType,
      currentValue: 5000000000000,
      flow7d: 0.3,
      flow30d: 1.5,
      flowVelocity: 0.2,
      flowHistory: generateHistory(1.5),
      velocityHistory: generateHistory(0.2),
      phase: 'early' as Phase,
      daysInPhase: 15,
      phaseStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      avgPhaseDuration: 40,
      rotationSignal: 'entering',
      rotationTarget: null,
      rotationConfidence: 60,
      sectors: [],
      lastUpdated: now,
    },
  ];
}

/**
 * Determine overall liquidity bias
 * Uses Net Liquidity as the primary indicator
 */
function determineLiquidityBias(liquidity: GlobalLiquidity): LiquidityBias {
  let riskOnScore = 0;
  let riskOffScore = 0;

  // Net Liquidity (PRIMARY INDICATOR - Fed BS - RRP - TGA)
  // This is the most important metric for market liquidity
  if (liquidity.netLiquidity.trend === 'expanding') riskOnScore += 3;
  else if (liquidity.netLiquidity.trend === 'contracting') riskOffScore += 3;

  // Net Liquidity change (momentum)
  if (liquidity.netLiquidity.change30d > 2) riskOnScore += 1;
  else if (liquidity.netLiquidity.change30d < -2) riskOffScore += 1;

  // RRP trend (draining = positive for risk, filling = negative)
  if (liquidity.reverseRepo.trend === 'draining') riskOnScore += 1;
  else if (liquidity.reverseRepo.trend === 'filling') riskOffScore += 1;

  // TGA trend (spending = positive for risk, building = negative)
  if (liquidity.treasuryGeneralAccount.trend === 'spending') riskOnScore += 1;
  else if (liquidity.treasuryGeneralAccount.trend === 'building') riskOffScore += 1;

  // Fed Balance Sheet (secondary)
  if (liquidity.fedBalanceSheet.trend === 'expanding') riskOnScore += 1;
  else if (liquidity.fedBalanceSheet.trend === 'contracting') riskOffScore += 1;

  // M2 Money Supply
  if (liquidity.m2MoneySupply.yoyGrowth > 5) riskOnScore += 1;
  else if (liquidity.m2MoneySupply.yoyGrowth < 0) riskOffScore += 1;

  // DXY (inverse relationship)
  if (liquidity.dxy.trend === 'weakening') riskOnScore += 2;
  else if (liquidity.dxy.trend === 'strengthening') riskOffScore += 2;

  // VIX
  if (liquidity.vix.level === 'complacent') riskOnScore += 1;
  else if (liquidity.vix.level === 'neutral') riskOnScore += 0.5;
  else if (liquidity.vix.level === 'fear') riskOffScore += 1;
  else if (liquidity.vix.level === 'extreme_fear') riskOffScore += 2;

  // Yield Curve
  if (liquidity.yieldCurve.inverted) riskOffScore += 1;

  const diff = riskOnScore - riskOffScore;

  if (diff > 3) return 'risk_on';
  if (diff < -3) return 'risk_off';
  return 'neutral';
}

/**
 * Asset Database for Layer 4 → Asset Analysis Connection
 * Phase-based asset selection: Early = aggressive, Late = defensive
 */
const ASSET_DATABASE: Record<MarketType, Record<string, Array<{
  symbol: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  phases: Phase[];  // Phases where this asset is recommended
}>>> = {
  crypto: {
    DeFi: [
      { symbol: 'AAVE', name: 'Aave', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'UNI', name: 'Uniswap', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'MKR', name: 'Maker', riskLevel: 'medium', phases: ['early', 'mid', 'late'] },
      { symbol: 'CRV', name: 'Curve', riskLevel: 'high', phases: ['early'] },
      { symbol: 'LDO', name: 'Lido', riskLevel: 'medium', phases: ['early', 'mid'] },
    ],
    Layer2: [
      { symbol: 'ARB', name: 'Arbitrum', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'OP', name: 'Optimism', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'MATIC', name: 'Polygon', riskLevel: 'medium', phases: ['early', 'mid', 'late'] },
      { symbol: 'IMX', name: 'Immutable X', riskLevel: 'high', phases: ['early'] },
      { symbol: 'STRK', name: 'Starknet', riskLevel: 'high', phases: ['early'] },
    ],
    AI: [
      { symbol: 'FET', name: 'Fetch.ai', riskLevel: 'high', phases: ['early'] },
      { symbol: 'RNDR', name: 'Render', riskLevel: 'high', phases: ['early', 'mid'] },
      { symbol: 'TAO', name: 'Bittensor', riskLevel: 'high', phases: ['early'] },
      { symbol: 'AGIX', name: 'SingularityNET', riskLevel: 'high', phases: ['early'] },
      { symbol: 'OCEAN', name: 'Ocean Protocol', riskLevel: 'high', phases: ['early'] },
    ],
    Gaming: [
      { symbol: 'AXS', name: 'Axie Infinity', riskLevel: 'high', phases: ['early'] },
      { symbol: 'SAND', name: 'Sandbox', riskLevel: 'high', phases: ['early'] },
      { symbol: 'MANA', name: 'Decentraland', riskLevel: 'high', phases: ['early'] },
      { symbol: 'GALA', name: 'Gala Games', riskLevel: 'high', phases: ['early'] },
      { symbol: 'ENJ', name: 'Enjin', riskLevel: 'medium', phases: ['early', 'mid'] },
    ],
    Meme: [
      { symbol: 'DOGE', name: 'Dogecoin', riskLevel: 'high', phases: ['early'] },
      { symbol: 'SHIB', name: 'Shiba Inu', riskLevel: 'high', phases: ['early'] },
      { symbol: 'PEPE', name: 'Pepe', riskLevel: 'high', phases: ['early'] },
      { symbol: 'BONK', name: 'Bonk', riskLevel: 'high', phases: ['early'] },
      { symbol: 'WIF', name: 'Dogwifhat', riskLevel: 'high', phases: ['early'] },
    ],
    Infrastructure: [
      { symbol: 'LINK', name: 'Chainlink', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'GRT', name: 'The Graph', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'FIL', name: 'Filecoin', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'AR', name: 'Arweave', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'ATOM', name: 'Cosmos', riskLevel: 'medium', phases: ['early', 'mid', 'late'] },
    ],
    // Default for crypto market (majors)
    default: [
      { symbol: 'BTC', name: 'Bitcoin', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'ETH', name: 'Ethereum', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'SOL', name: 'Solana', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'BNB', name: 'BNB', riskLevel: 'medium', phases: ['early', 'mid', 'late'] },
      { symbol: 'XRP', name: 'XRP', riskLevel: 'medium', phases: ['early', 'mid', 'late'] },
    ],
  },
  stocks: {
    Tech: [
      { symbol: 'QQQ', name: 'Nasdaq 100 ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'XLK', name: 'Tech Sector ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'AAPL', name: 'Apple', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'MSFT', name: 'Microsoft', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'NVDA', name: 'Nvidia', riskLevel: 'medium', phases: ['early', 'mid'] },
    ],
    Finance: [
      { symbol: 'XLF', name: 'Financial Sector ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'JPM', name: 'JPMorgan', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'BAC', name: 'Bank of America', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'GS', name: 'Goldman Sachs', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'V', name: 'Visa', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
    ],
    Energy: [
      { symbol: 'XLE', name: 'Energy Sector ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'XOM', name: 'Exxon Mobil', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'CVX', name: 'Chevron', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'COP', name: 'ConocoPhillips', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'SLB', name: 'Schlumberger', riskLevel: 'medium', phases: ['early', 'mid'] },
    ],
    Healthcare: [
      { symbol: 'XLV', name: 'Healthcare Sector ETF', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'UNH', name: 'UnitedHealth', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'JNJ', name: 'Johnson & Johnson', riskLevel: 'low', phases: ['mid', 'late', 'exit'] },
      { symbol: 'LLY', name: 'Eli Lilly', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'PFE', name: 'Pfizer', riskLevel: 'low', phases: ['mid', 'late'] },
    ],
    Consumer: [
      { symbol: 'XLY', name: 'Consumer Discretionary ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'AMZN', name: 'Amazon', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'TSLA', name: 'Tesla', riskLevel: 'high', phases: ['early'] },
      { symbol: 'HD', name: 'Home Depot', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'MCD', name: 'McDonald\'s', riskLevel: 'low', phases: ['mid', 'late'] },
    ],
    Industrial: [
      { symbol: 'XLI', name: 'Industrial Sector ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'CAT', name: 'Caterpillar', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'DE', name: 'Deere', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'UPS', name: 'UPS', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'HON', name: 'Honeywell', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
    ],
    // Default for stocks market (indices)
    default: [
      { symbol: 'SPY', name: 'S&P 500 ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'QQQ', name: 'Nasdaq 100 ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'DIA', name: 'Dow Jones ETF', riskLevel: 'low', phases: ['mid', 'late', 'exit'] },
      { symbol: 'IWM', name: 'Russell 2000 ETF', riskLevel: 'high', phases: ['early'] },
      { symbol: 'VTI', name: 'Total Stock Market ETF', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
    ],
  },
  bonds: {
    Treasury: [
      { symbol: 'TLT', name: '20+ Year Treasury ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'IEF', name: '7-10 Year Treasury ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'SHY', name: '1-3 Year Treasury ETF', riskLevel: 'low', phases: ['late', 'exit'] },
      { symbol: 'GOVT', name: 'US Treasury Bond ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'BIL', name: 'Short-Term Treasury ETF', riskLevel: 'low', phases: ['exit'] },
    ],
    Corporate: [
      { symbol: 'LQD', name: 'Investment Grade Corporate ETF', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'HYG', name: 'High Yield Corporate ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'VCIT', name: 'Intermediate-Term Corporate ETF', riskLevel: 'low', phases: ['early', 'mid', 'late'] },
      { symbol: 'VCSH', name: 'Short-Term Corporate ETF', riskLevel: 'low', phases: ['mid', 'late'] },
      { symbol: 'JNK', name: 'High Yield Bond ETF', riskLevel: 'high', phases: ['early'] },
    ],
    // Default for bonds market
    default: [
      { symbol: 'BND', name: 'Total Bond Market ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'AGG', name: 'US Aggregate Bond ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'TLT', name: '20+ Year Treasury ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'TIP', name: 'TIPS Bond ETF', riskLevel: 'low', phases: ['mid', 'late', 'exit'] },
      { symbol: 'BNDX', name: 'International Bond ETF', riskLevel: 'low', phases: ['mid', 'late'] },
    ],
  },
  metals: {
    Gold: [
      { symbol: 'GLD', name: 'SPDR Gold ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'IAU', name: 'iShares Gold ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'GDX', name: 'Gold Miners ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'GDXJ', name: 'Junior Gold Miners ETF', riskLevel: 'high', phases: ['early'] },
      { symbol: 'SGOL', name: 'Aberdeen Gold ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
    ],
    Silver: [
      { symbol: 'SLV', name: 'iShares Silver ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'SIVR', name: 'Aberdeen Silver ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'SIL', name: 'Silver Miners ETF', riskLevel: 'high', phases: ['early'] },
      { symbol: 'SILJ', name: 'Junior Silver Miners ETF', riskLevel: 'high', phases: ['early'] },
    ],
    // Default for metals market
    default: [
      { symbol: 'GLD', name: 'SPDR Gold ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'SLV', name: 'iShares Silver ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'IAU', name: 'iShares Gold ETF', riskLevel: 'low', phases: ['early', 'mid', 'late', 'exit'] },
      { symbol: 'GDX', name: 'Gold Miners ETF', riskLevel: 'medium', phases: ['early', 'mid'] },
      { symbol: 'DBP', name: 'Precious Metals ETF', riskLevel: 'medium', phases: ['early', 'mid', 'late'] },
    ],
  },
};

/**
 * Get suggested assets based on market, sector, and phase
 * Early = aggressive (high risk), Late = defensive (low risk)
 */
function getSuggestedAssets(
  market: MarketType,
  phase: Phase,
  sectors?: string[],
  direction: 'BUY' | 'SELL' = 'BUY',
  maxAssets: number = 5
): SuggestedAsset[] {
  const marketAssets = ASSET_DATABASE[market];
  if (!marketAssets) return [];

  const suggestions: SuggestedAsset[] = [];
  const addedSymbols = new Set<string>();

  // First, add sector-specific assets if sectors provided
  if (sectors && sectors.length > 0) {
    for (const sector of sectors) {
      const sectorAssets = marketAssets[sector];
      if (sectorAssets) {
        for (const asset of sectorAssets) {
          // Skip if already added or doesn't match phase
          if (addedSymbols.has(asset.symbol)) continue;
          if (!asset.phases.includes(phase)) continue;

          // For SELL, prefer low/medium risk assets that can be shorted
          if (direction === 'SELL' && asset.riskLevel === 'high') continue;

          addedSymbols.add(asset.symbol);
          suggestions.push({
            symbol: asset.symbol,
            name: asset.name,
            market,
            sector,
            riskLevel: asset.riskLevel,
            reason: `${sector} sector with ${phase.toUpperCase()} phase opportunity`,
          });

          if (suggestions.length >= maxAssets) break;
        }
      }
      if (suggestions.length >= maxAssets) break;
    }
  }

  // Fill remaining with default market assets if needed
  if (suggestions.length < maxAssets) {
    const defaultAssets = marketAssets.default || [];
    for (const asset of defaultAssets) {
      if (addedSymbols.has(asset.symbol)) continue;
      if (!asset.phases.includes(phase)) continue;

      addedSymbols.add(asset.symbol);
      suggestions.push({
        symbol: asset.symbol,
        name: asset.name,
        market,
        riskLevel: asset.riskLevel,
        reason: `Core ${MARKET_CONFIG[market].name} asset for ${phase.toUpperCase()} phase`,
      });

      if (suggestions.length >= maxAssets) break;
    }
  }

  // Sort by risk level (phase appropriate)
  const riskOrder = phase === 'early'
    ? { high: 1, medium: 2, low: 3 }  // Early: prefer higher risk
    : phase === 'exit'
      ? { low: 1, medium: 2, high: 3 }  // Exit: prefer lower risk
      : { medium: 1, low: 2, high: 3 };  // Mid/Late: prefer medium risk

  suggestions.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

  return suggestions.slice(0, maxAssets);
}

/**
 * Generate BUY recommendation (markets with inflow)
 * NOW USES 5-FACTOR SCORING SYSTEM
 */
function generateRecommendation(
  liquidity: GlobalLiquidity,
  markets: MarketFlow[],
  bias: LiquidityBias,
  correlations?: CorrelationMatrix
): FlowRecommendation {
  // Calculate 5-factor scores for all markets
  const marketScores = markets.map(market => ({
    market,
    score: calculateFiveFactorScore(market, liquidity, markets, correlations, 'BUY'),
  }));

  // Sort by total 5-factor score (highest first for BUY)
  marketScores.sort((a, b) => b.score.totalScore - a.score.totalScore);

  const topMarketData = marketScores[0];
  const topMarket = topMarketData.market;
  const fiveFactorScore = topMarketData.score;

  // In risk-off, recommend safe assets
  if (bias === 'risk_off') {
    const bondsScore = marketScores.find(m => m.market.market === 'bonds');
    const metalsScore = marketScores.find(m => m.market.market === 'metals');

    // Compare safe haven scores
    const safeMarketData = (bondsScore?.score.totalScore || 0) > (metalsScore?.score.totalScore || 0)
      ? bondsScore
      : metalsScore;

    const safeMarket = safeMarketData?.market || topMarket;
    const safeScore = safeMarketData?.score || fiveFactorScore;

    const safeSectors = safeMarket.sectors?.slice(0, 3).map(s => s.name);
    return {
      primaryMarket: safeMarket.market,
      phase: safeMarket.phase,
      action: safeMarket.phase === 'exit' ? 'avoid' : 'wait',
      direction: 'BUY',
      reason: `Risk-off environment (Net Liquidity ${liquidity.netLiquidity.trend}). Prefer safe haven assets (${MARKET_CONFIG[safeMarket.market].name}). 5-Factor Score: ${safeScore.totalScore}/100.`,
      sectors: safeSectors,
      confidence: safeScore.totalScore,
      fiveFactorScore: safeScore,
      suggestedAssets: getSuggestedAssets(safeMarket.market, safeMarket.phase, safeSectors, 'BUY'),
    };
  }

  // Determine action based on 5-factor score thresholds
  let action: 'analyze' | 'wait' | 'avoid';
  let reason: string;

  // Score-based action determination
  if (fiveFactorScore.totalScore >= 70) {
    action = 'analyze';
    reason = `${MARKET_CONFIG[topMarket.market].name} has strong 5-Factor Score (${fiveFactorScore.totalScore}/100). ${topMarket.phase.toUpperCase()} phase with favorable flow conditions.`;
  } else if (fiveFactorScore.totalScore >= 55) {
    action = topMarket.phase === 'early' || topMarket.phase === 'mid' ? 'analyze' : 'wait';
    reason = `${MARKET_CONFIG[topMarket.market].name} has moderate 5-Factor Score (${fiveFactorScore.totalScore}/100). ${topMarket.phase.toUpperCase()} phase - proceed with caution.`;
  } else if (fiveFactorScore.totalScore >= 40) {
    action = 'wait';
    reason = `${MARKET_CONFIG[topMarket.market].name} has weak 5-Factor Score (${fiveFactorScore.totalScore}/100). Wait for better entry conditions.`;
  } else {
    action = 'avoid';
    reason = `${MARKET_CONFIG[topMarket.market].name} has poor 5-Factor Score (${fiveFactorScore.totalScore}/100). Avoid new positions.`;
  }

  const topSectors = topMarket.sectors
    ?.filter(s => s.trending === 'up')
    .slice(0, 3)
    .map(s => s.name);

  return {
    primaryMarket: topMarket.market,
    phase: topMarket.phase,
    action,
    direction: 'BUY',
    reason,
    sectors: topSectors,
    confidence: fiveFactorScore.totalScore,
    fiveFactorScore,
    suggestedAssets: getSuggestedAssets(topMarket.market, topMarket.phase, topSectors, 'BUY'),
  };
}

/**
 * Generate SELL recommendation (markets with outflow or weakest performance)
 * NOW USES 5-FACTOR SCORING SYSTEM
 */
function generateSellRecommendation(
  markets: MarketFlow[],
  bias: LiquidityBias,
  liquidity: GlobalLiquidity,
  correlations?: CorrelationMatrix
): FlowRecommendation | null {
  // Safety check - need at least 2 markets to compare
  if (!markets || markets.length < 2) {
    return null;
  }

  // Calculate 5-factor scores for SELL direction
  const marketScores = markets.map(market => ({
    market,
    score: calculateFiveFactorScore(market, liquidity, markets, correlations, 'SELL'),
  }));

  // Sort by total SELL score (highest first - best short candidates)
  marketScores.sort((a, b) => b.score.totalScore - a.score.totalScore);

  const topSellCandidate = marketScores[0];
  const worstMarket = topSellCandidate.market;
  const fiveFactorScore = topSellCandidate.score;

  // Find best performing market for comparison
  const bestMarketBuy = [...marketScores].sort((a, b) =>
    calculateFiveFactorScore(a.market, liquidity, markets, correlations, 'BUY').totalScore -
    calculateFiveFactorScore(b.market, liquidity, markets, correlations, 'BUY').totalScore
  )[marketScores.length - 1]?.market;

  // Calculate relative weakness
  const relativeWeakness = (bestMarketBuy?.flow7d || 0) - worstMarket.flow7d;

  // In risk-off, SELL risky assets
  if (bias === 'risk_off') {
    const cryptoScore = marketScores.find(m => m.market.market === 'crypto');
    const stocksScore = marketScores.find(m => m.market.market === 'stocks');

    // SELL the riskier asset with higher SELL score
    const riskyMarketData = (cryptoScore?.score.totalScore || 0) > (stocksScore?.score.totalScore || 0)
      ? cryptoScore
      : stocksScore;

    if (riskyMarketData) {
      const riskyMarket = riskyMarketData.market;
      const riskyScore = riskyMarketData.score;

      return {
        primaryMarket: riskyMarket.market,
        phase: riskyMarket.phase,
        action: riskyScore.totalScore >= 60 ? 'analyze' : 'wait',
        direction: 'SELL',
        reason: `Risk-off environment (Net Liquidity ${liquidity.netLiquidity.trend}). ${MARKET_CONFIG[riskyMarket.market].name} is the best SELL candidate. 5-Factor SELL Score: ${riskyScore.totalScore}/100.`,
        sectors: riskyMarket.sectors?.filter(s => s.trending === 'down' || s.flow7d < (riskyMarket.flow7d / 2)).slice(0, 3).map(s => s.name),
        confidence: riskyScore.totalScore,
        fiveFactorScore: riskyScore,
      };
    }
  }

  // Determine SELL action based on 5-factor score
  let action: 'analyze' | 'wait' | 'avoid';
  let reason: string;

  // Score-based action determination for SELL
  if (fiveFactorScore.totalScore >= 70) {
    action = 'analyze';
    reason = `${MARKET_CONFIG[worstMarket.market].name} has strong SELL signal (5-Factor Score: ${fiveFactorScore.totalScore}/100). ${worstMarket.phase.toUpperCase()} phase with capital exiting.`;
  } else if (fiveFactorScore.totalScore >= 55) {
    action = worstMarket.flow7d < 0 || worstMarket.phase === 'late' || worstMarket.phase === 'exit' ? 'analyze' : 'wait';
    reason = `${MARKET_CONFIG[worstMarket.market].name} has moderate SELL signal (5-Factor Score: ${fiveFactorScore.totalScore}/100). ${relativeWeakness > 3 ? `Underperforming by ${relativeWeakness.toFixed(1)}%.` : 'Monitor for stronger signals.'}`;
  } else if (fiveFactorScore.totalScore >= 40) {
    action = 'wait';
    reason = `${MARKET_CONFIG[worstMarket.market].name} has weak SELL signal (5-Factor Score: ${fiveFactorScore.totalScore}/100). No clear short opportunity yet.`;
  } else {
    action = 'avoid';
    reason = `${MARKET_CONFIG[worstMarket.market].name} has poor SELL signal (5-Factor Score: ${fiveFactorScore.totalScore}/100). Shorting not recommended.`;
  }

  // Get weakest sectors (trending down or below market average)
  const weakSectors = worstMarket.sectors
    ?.filter(s => s.trending === 'down' || s.flow7d < worstMarket.flow7d)
    .sort((a, b) => a.flow7d - b.flow7d)
    .slice(0, 3)
    .map(s => s.name);

  return {
    primaryMarket: worstMarket.market,
    phase: worstMarket.phase,
    action,
    direction: 'SELL',
    reason,
    sectors: weakSectors?.length ? weakSectors : undefined,
    confidence: fiveFactorScore.totalScore,
    fiveFactorScore,
    suggestedAssets: getSuggestedAssets(worstMarket.market, worstMarket.phase, weakSectors, 'SELL'),
  };
}

/**
 * Detect active rotation between markets
 */
function detectActiveRotation(markets: MarketFlow[]): ActiveRotation | null {
  // Find markets with strong entering/exiting signals
  const entering = markets.filter(m => m.rotationSignal === 'entering');
  const exiting = markets.filter(m => m.rotationSignal === 'exiting');

  if (entering.length > 0 && exiting.length > 0) {
    const from = exiting.sort((a, b) => a.flow7d - b.flow7d)[0];
    const to = entering.sort((a, b) => b.flow7d - a.flow7d)[0];

    // Calculate confidence based on flow difference
    const flowDiff = to.flow7d - from.flow7d;
    const confidence = Math.min(90, Math.max(50, 50 + flowDiff * 5));

    // Estimate duration based on historical patterns
    const estimatedDays = Math.round(30 + (to.avgPhaseDuration - to.daysInPhase));
    const estimatedDuration = `${estimatedDays} days`;

    return {
      from: from.market,
      to: to.market,
      confidence,
      estimatedDuration,
      startedAt: new Date(),
    };
  }

  return null;
}

/**
 * Get flow recommendation only
 * Returns a default recommendation if data is unavailable
 */
export async function getFlowRecommendation(): Promise<FlowRecommendation> {
  try {
    const summary = await getCapitalFlowSummary();
    return summary.recommendation;
  } catch (error) {
    console.error('[CapitalFlow] Error getting recommendation, returning default:', error);

    // Return a safe default recommendation (matching FlowRecommendation interface)
    return {
      primaryMarket: 'crypto',
      phase: 'mid',
      action: 'wait',
      direction: 'BUY',
      reason: 'Capital flow data is temporarily unavailable. Please check the Capital Flow Radar for detailed analysis when data is restored.',
      sectors: [],
      confidence: 30,
    };
  }
}

/**
 * Capital Flow Modifier for Trade Plan Integration
 * Returns a modifier (0.5-1.5) to adjust trade confidence based on Capital Flow context
 *
 * Formula:
 * - Base: 5-Factor Score / 100 → 0.0-1.0
 * - Phase modifier: early=+0.3, mid=+0.1, late=-0.1, exit=-0.3
 * - Alignment bonus: if asset market matches recommended market → +0.1
 *
 * Result: confidence × modifier adjusts trade plan quality
 */
export interface CapitalFlowModifier {
  modifier: number;              // 0.5-1.5 multiplier for confidence
  fiveFactorScore: number;       // 0-100 raw score
  phase: Phase;
  phaseModifier: number;         // -0.3 to +0.3
  marketAlignment: boolean;      // Does asset market match recommendation?
  action: 'analyze' | 'wait' | 'avoid';
  riskAdjustment: 'aggressive' | 'moderate' | 'defensive';
  reason: string;
}

export async function getCapitalFlowModifier(
  assetMarket: MarketType,
  direction: 'LONG' | 'SHORT' = 'LONG'
): Promise<CapitalFlowModifier> {
  try {
    const summary = await getCapitalFlowSummary();
    const rec = summary.recommendation;
    const sellRec = summary.sellRecommendation;

    // Use appropriate recommendation based on direction
    const activeRec = direction === 'LONG' ? rec : (sellRec || rec);
    const fiveFactorScore = activeRec.fiveFactorScore?.totalScore || activeRec.confidence;

    // Base modifier from 5-factor score (0.4 to 1.2)
    let modifier = 0.4 + (fiveFactorScore / 100) * 0.8;

    // Phase modifier
    const phaseModifiers: Record<Phase, number> = {
      early: 0.3,   // Early phase = aggressive
      mid: 0.1,     // Mid phase = moderate
      late: -0.1,   // Late phase = caution
      exit: -0.3,   // Exit phase = defensive
    };
    const phaseModifier = phaseModifiers[activeRec.phase as Phase] || 0;
    modifier += phaseModifier;

    // Market alignment bonus
    const marketAlignment = assetMarket === activeRec.primaryMarket;
    if (marketAlignment) {
      modifier += 0.1;
    }

    // Action penalty
    if (activeRec.action === 'avoid') {
      modifier -= 0.2;
    } else if (activeRec.action === 'wait') {
      modifier -= 0.1;
    }

    // Clamp modifier to 0.5-1.5 range
    modifier = Math.max(0.5, Math.min(1.5, modifier));

    // Determine risk adjustment
    let riskAdjustment: 'aggressive' | 'moderate' | 'defensive';
    if (activeRec.phase === 'early' && activeRec.action === 'analyze') {
      riskAdjustment = 'aggressive';
    } else if (activeRec.phase === 'late' || activeRec.phase === 'exit') {
      riskAdjustment = 'defensive';
    } else {
      riskAdjustment = 'moderate';
    }

    // Generate reason
    const reason = `Capital Flow ${activeRec.action.toUpperCase()} signal for ${activeRec.primaryMarket.toUpperCase()} (${activeRec.phase} phase). ` +
      `5-Factor Score: ${fiveFactorScore}/100. ` +
      (marketAlignment ? `Asset market (${assetMarket}) matches recommendation. ` : `Asset market (${assetMarket}) differs from recommended (${activeRec.primaryMarket}). `) +
      `Modifier: ${(modifier * 100).toFixed(0)}%`;

    return {
      modifier: parseFloat(modifier.toFixed(2)),
      fiveFactorScore,
      phase: activeRec.phase as Phase,
      phaseModifier,
      marketAlignment,
      action: activeRec.action,
      riskAdjustment,
      reason,
    };
  } catch (error) {
    console.error('[CapitalFlow] Error calculating modifier:', error);
    // Return neutral modifier on error
    return {
      modifier: 1.0,
      fiveFactorScore: 50,
      phase: 'mid',
      phaseModifier: 0,
      marketAlignment: false,
      action: 'wait',
      riskAdjustment: 'moderate',
      reason: 'Capital Flow data unavailable. Using neutral modifier.',
    };
  }
}

/**
 * Calculate market correlations
 * Based on flow direction and velocity similarities
 */
async function calculateMarketCorrelations(markets: MarketFlow[]): Promise<CorrelationMatrix> {
  // Try cache first
  const cached = await redis?.get(CACHE_KEYS.CORRELATIONS);
  if (cached) {
    return JSON.parse(cached);
  }

  const correlations: MarketCorrelation[] = [];
  const marketTypes: MarketType[] = ['crypto', 'stocks', 'bonds', 'metals'];

  // Calculate correlation for each pair
  for (let i = 0; i < marketTypes.length; i++) {
    for (let j = i + 1; j < marketTypes.length; j++) {
      const market1 = markets.find(m => m.market === marketTypes[i]);
      const market2 = markets.find(m => m.market === marketTypes[j]);

      if (!market1 || !market2) continue;

      const correlation = calculatePairCorrelation(market1, market2);
      correlations.push(correlation);
    }
  }

  // Find strongest correlations
  const strongestPositive = correlations
    .filter(c => c.correlation > 0)
    .sort((a, b) => b.correlation - a.correlation)[0] || null;

  const strongestNegative = correlations
    .filter(c => c.correlation < 0)
    .sort((a, b) => a.correlation - b.correlation)[0] || null;

  // Generate insights
  const insights = generateCorrelationInsights(correlations, strongestPositive, strongestNegative);

  const matrix: CorrelationMatrix = {
    correlations,
    strongestPositive,
    strongestNegative,
    insights,
    lastUpdated: new Date(),
  };

  // Cache
  if (redis) {
    await redis.setex(CACHE_KEYS.CORRELATIONS, CACHE_TTL.CORRELATIONS, JSON.stringify(matrix));
  }

  return matrix;
}

/**
 * Calculate correlation between two markets
 * Uses flow direction, velocity, and phase alignment
 */
function calculatePairCorrelation(market1: MarketFlow, market2: MarketFlow): MarketCorrelation {
  // Correlation factors:
  // 1. Flow direction alignment (same direction = positive correlation)
  // 2. Velocity similarity
  // 3. Phase alignment

  // Flow direction score (-1 to +1)
  const directionScore = (
    (market1.flow7d > 0 && market2.flow7d > 0) ||
    (market1.flow7d < 0 && market2.flow7d < 0)
  ) ? 0.4 : -0.4;

  // Velocity similarity score (-0.3 to +0.3)
  const velocityDiff = Math.abs(market1.flowVelocity - market2.flowVelocity);
  const velocityScore = velocityDiff < 1 ? 0.3 : velocityDiff < 3 ? 0.1 : -0.1;

  // Phase alignment score (-0.3 to +0.3)
  const phaseScore = market1.phase === market2.phase ? 0.3 :
    (market1.phase === 'early' && market2.phase === 'mid') ||
    (market1.phase === 'mid' && market2.phase === 'early') ? 0.15 :
    (market1.phase === 'late' && market2.phase === 'exit') ||
    (market1.phase === 'exit' && market2.phase === 'late') ? 0.15 : -0.15;

  // Flow magnitude similarity (are they moving at similar rates?)
  const flow7dRatio = Math.min(Math.abs(market1.flow7d), Math.abs(market2.flow7d)) /
    Math.max(Math.abs(market1.flow7d), Math.abs(market2.flow7d)) || 0;
  const magnitudeScore = flow7dRatio > 0.7 ? 0.2 : flow7dRatio > 0.4 ? 0.1 : 0;

  // Total correlation (-1 to +1)
  let correlation = directionScore + velocityScore + phaseScore + magnitudeScore;
  correlation = Math.max(-1, Math.min(1, correlation)); // Clamp

  // Determine strength
  const absCorr = Math.abs(correlation);
  const strength: MarketCorrelation['strength'] =
    absCorr >= 0.7 ? 'strong' :
    absCorr >= 0.4 ? 'moderate' :
    absCorr >= 0.2 ? 'weak' : 'none';

  // Determine direction
  const direction: MarketCorrelation['direction'] =
    correlation > 0.1 ? 'positive' :
    correlation < -0.1 ? 'negative' : 'neutral';

  // Generate interpretation
  const interpretation = generateCorrelationInterpretation(
    market1.market,
    market2.market,
    correlation,
    strength,
    direction
  );

  return {
    market1: market1.market,
    market2: market2.market,
    correlation: parseFloat(correlation.toFixed(2)),
    strength,
    direction,
    interpretation,
  };
}

/**
 * Generate human-readable interpretation for a correlation
 */
function generateCorrelationInterpretation(
  market1: MarketType,
  market2: MarketType,
  correlation: number,
  strength: MarketCorrelation['strength'],
  direction: MarketCorrelation['direction']
): string {
  const m1Name = MARKET_CONFIG[market1].name;
  const m2Name = MARKET_CONFIG[market2].name;

  if (strength === 'none') {
    return `${m1Name} and ${m2Name} are moving independently with no significant correlation.`;
  }

  if (direction === 'positive') {
    if (strength === 'strong') {
      return `${m1Name} and ${m2Name} are strongly correlated. Capital flows tend to move together.`;
    }
    return `${m1Name} and ${m2Name} show ${strength} positive correlation. They often move in the same direction.`;
  }

  if (direction === 'negative') {
    if (strength === 'strong') {
      return `${m1Name} and ${m2Name} are inversely correlated. When one rises, the other tends to fall. Good for hedging.`;
    }
    return `${m1Name} and ${m2Name} show ${strength} negative correlation. They often move in opposite directions.`;
  }

  return `${m1Name} and ${m2Name} have a neutral relationship currently.`;
}

/**
 * Generate overall correlation insights
 */
function generateCorrelationInsights(
  correlations: MarketCorrelation[],
  strongestPositive: MarketCorrelation | null,
  strongestNegative: MarketCorrelation | null
): string {
  const parts: string[] = [];

  if (strongestPositive && strongestPositive.strength !== 'none') {
    const m1 = MARKET_CONFIG[strongestPositive.market1].name;
    const m2 = MARKET_CONFIG[strongestPositive.market2].name;
    parts.push(`${m1} and ${m2} are moving together (${(strongestPositive.correlation * 100).toFixed(0)}% correlation)`);
  }

  if (strongestNegative && strongestNegative.strength !== 'none') {
    const m1 = MARKET_CONFIG[strongestNegative.market1].name;
    const m2 = MARKET_CONFIG[strongestNegative.market2].name;
    parts.push(`${m1} and ${m2} are diverging (${(strongestNegative.correlation * 100).toFixed(0)}% inverse correlation)`);
  }

  // Check for risk-on/risk-off patterns
  const cryptoStocks = correlations.find(c =>
    (c.market1 === 'crypto' && c.market2 === 'stocks') ||
    (c.market1 === 'stocks' && c.market2 === 'crypto')
  );
  const bondsCrypto = correlations.find(c =>
    (c.market1 === 'bonds' && c.market2 === 'crypto') ||
    (c.market1 === 'crypto' && c.market2 === 'bonds')
  );

  if (cryptoStocks && cryptoStocks.correlation > 0.5 && bondsCrypto && bondsCrypto.correlation < -0.3) {
    parts.push('Risk-on environment: risky assets are correlated, safe havens are inverse');
  } else if (cryptoStocks && cryptoStocks.correlation < -0.3 && bondsCrypto && bondsCrypto.correlation > 0.3) {
    parts.push('Risk-off rotation: capital moving from risky to safe assets');
  }

  if (parts.length === 0) {
    return 'Markets are showing mixed correlations. Monitor individual market signals.';
  }

  return parts.join('. ') + '.';
}

/**
 * Detect trade opportunities based on capital rotation
 * When money exits market A and enters markets B/C:
 * - Market A = SELL opportunity (capital exiting)
 * - Markets B/C = BUY opportunity (capital entering)
 */
async function detectTradeOpportunities(
  markets: MarketFlow[],
  correlations?: CorrelationMatrix
): Promise<TradeOpportunities> {
  // Try cache first
  const cached = await redis?.get(CACHE_KEYS.TRADE_OPPORTUNITIES);
  if (cached) {
    return JSON.parse(cached);
  }

  const opportunities: RotationTradeOpportunity[] = [];

  // Find markets with entering and exiting signals
  const enteringMarkets = markets.filter(m => m.rotationSignal === 'entering');
  const exitingMarkets = markets.filter(m => m.rotationSignal === 'exiting');

  // Generate SELL opportunities for exiting markets
  for (const market of exitingMarkets) {
    // Calculate confidence based on flow strength and velocity
    let confidence = 50;
    if (market.flow7d < -3) confidence += 15;
    if (market.flow7d < -5) confidence += 10;
    if (market.flowVelocity < -2) confidence += 10;
    if (market.phase === 'exit') confidence += 15;

    // Boost confidence if correlation supports the signal
    let correlationBoost = 0;
    let correlationInfo: RotationTradeOpportunity['correlationInfo'] = undefined;

    if (correlations) {
      // Find the strongest correlation for this market
      const marketCorrelations = correlations.correlations.filter(c =>
        c.market1 === market.market || c.market2 === market.market
      );

      if (marketCorrelations.length > 0) {
        const strongest = marketCorrelations.reduce((a, b) =>
          Math.abs(a.correlation) > Math.abs(b.correlation) ? a : b
        );
        const otherMarket = strongest.market1 === market.market ? strongest.market2 : strongest.market1;

        // If negative correlation with entering market, boost confidence
        const isEnteringMarket = enteringMarkets.some(m => m.market === otherMarket);
        if (strongest.direction === 'negative' && isEnteringMarket) {
          correlationBoost = Math.abs(strongest.correlation) * 15; // Up to +15%
        }

        correlationInfo = {
          strongestCorrelation: {
            market: otherMarket,
            value: strongest.correlation,
            direction: strongest.direction as 'positive' | 'negative',
            interpretation: strongest.interpretation,
          },
          hedgeSuggestion: strongest.direction === 'negative' ? {
            market: otherMarket,
            correlation: strongest.correlation,
          } : undefined,
        };
      }
    }

    confidence += correlationBoost;

    // Find where the capital is going (related markets)
    const relatedMarkets = enteringMarkets.map(dest => ({
      market: dest.market,
      relationship: 'destination' as const,
    }));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (confidence >= 75 && market.flow7d < -5) {
      riskLevel = 'low'; // Strong signal = lower risk
    } else if (confidence < 60 || Math.abs(market.flow7d) < 2) {
      riskLevel = 'high'; // Weak signal = higher risk
    }

    // Get top sectors to exit
    const exitSectors = market.sectors
      ?.filter(s => s.trending === 'down')
      .slice(0, 3)
      .map(s => s.name);

    // Phase context
    const phaseProgress = Math.min(100, (market.daysInPhase / market.avgPhaseDuration) * 100);

    opportunities.push({
      market: market.market,
      direction: 'SELL',
      reason: `Capital outflow detected in ${MARKET_CONFIG[market.market].name}. ${market.flow7d.toFixed(1)}% 7-day flow with ${market.phase} phase suggests reducing exposure.`,
      confidence: Math.min(90, confidence),
      flowSignal: 'exiting',
      relatedMarkets,
      suggestedSectors: exitSectors,
      riskLevel,
      correlationInfo,
      phaseContext: {
        currentPhase: market.phase,
        daysInPhase: market.daysInPhase,
        avgDuration: market.avgPhaseDuration,
        phaseProgress,
      },
    });
  }

  // Generate BUY opportunities for entering markets
  for (const market of enteringMarkets) {
    // Calculate confidence based on flow strength and velocity
    let confidence = 50;
    if (market.flow7d > 3) confidence += 15;
    if (market.flow7d > 5) confidence += 10;
    if (market.flowVelocity > 2) confidence += 10;
    if (market.phase === 'early') confidence += 20;
    else if (market.phase === 'mid') confidence += 10;

    // Boost confidence if correlation supports the signal
    let correlationBoost = 0;
    let correlationInfo: RotationTradeOpportunity['correlationInfo'] = undefined;

    if (correlations) {
      // Find the strongest correlation for this market
      const marketCorrelations = correlations.correlations.filter(c =>
        c.market1 === market.market || c.market2 === market.market
      );

      if (marketCorrelations.length > 0) {
        const strongest = marketCorrelations.reduce((a, b) =>
          Math.abs(a.correlation) > Math.abs(b.correlation) ? a : b
        );
        const otherMarket = strongest.market1 === market.market ? strongest.market2 : strongest.market1;

        // If negative correlation with exiting market, boost confidence (capital rotation confirmed)
        const isExitingMarket = exitingMarkets.some(m => m.market === otherMarket);
        if (strongest.direction === 'negative' && isExitingMarket) {
          correlationBoost = Math.abs(strongest.correlation) * 15; // Up to +15%
        }

        correlationInfo = {
          strongestCorrelation: {
            market: otherMarket,
            value: strongest.correlation,
            direction: strongest.direction as 'positive' | 'negative',
            interpretation: strongest.interpretation,
          },
          hedgeSuggestion: strongest.direction === 'negative' ? {
            market: otherMarket,
            correlation: strongest.correlation,
          } : undefined,
        };
      }
    }

    confidence += correlationBoost;

    // Find where the capital is coming from (related markets)
    const relatedMarkets = exitingMarkets.map(source => ({
      market: source.market,
      relationship: 'source' as const,
    }));

    // Determine risk level based on phase
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (market.phase === 'early' && confidence >= 70) {
      riskLevel = 'low'; // Early phase entry = lower risk
    } else if (market.phase === 'late' || confidence < 60) {
      riskLevel = 'high'; // Late phase or weak signal = higher risk
    }

    // Get top sectors to buy
    const buySectors = market.sectors
      ?.filter(s => s.trending === 'up')
      .slice(0, 3)
      .map(s => s.name);

    // Phase context
    const phaseProgress = Math.min(100, (market.daysInPhase / market.avgPhaseDuration) * 100);

    opportunities.push({
      market: market.market,
      direction: 'BUY',
      reason: `Capital inflow detected in ${MARKET_CONFIG[market.market].name}. ${market.flow7d.toFixed(1)}% 7-day flow in ${market.phase} phase presents accumulation opportunity.`,
      confidence: Math.min(90, confidence),
      flowSignal: 'entering',
      relatedMarkets,
      suggestedSectors: buySectors,
      riskLevel,
      correlationInfo,
      phaseContext: {
        currentPhase: market.phase,
        daysInPhase: market.daysInPhase,
        avgDuration: market.avgPhaseDuration,
        phaseProgress,
      },
    });
  }

  // Sort by confidence (highest first)
  opportunities.sort((a, b) => b.confidence - a.confidence);

  // Generate rotation summary
  let rotationSummary = '';
  if (exitingMarkets.length > 0 && enteringMarkets.length > 0) {
    const exitNames = exitingMarkets.map(m => MARKET_CONFIG[m.market].name).join(', ');
    const enterNames = enteringMarkets.map(m => MARKET_CONFIG[m.market].name).join(', ');
    rotationSummary = `Capital rotation detected: ${exitNames} → ${enterNames}. This creates SELL opportunities in exiting markets and BUY opportunities in receiving markets.`;
  } else if (enteringMarkets.length > 0) {
    const enterNames = enteringMarkets.map(m => MARKET_CONFIG[m.market].name).join(', ');
    rotationSummary = `Capital inflow detected in ${enterNames}. BUY opportunities available in these markets.`;
  } else if (exitingMarkets.length > 0) {
    const exitNames = exitingMarkets.map(m => MARKET_CONFIG[m.market].name).join(', ');
    rotationSummary = `Capital outflow detected from ${exitNames}. Consider reducing exposure in these markets.`;
  } else {
    rotationSummary = 'No significant rotation detected. Markets are relatively stable.';
  }

  const result: TradeOpportunities = {
    opportunities,
    rotationSummary,
    totalOpportunities: opportunities.length,
    buyOpportunities: opportunities.filter(o => o.direction === 'BUY').length,
    sellOpportunities: opportunities.filter(o => o.direction === 'SELL').length,
    lastUpdated: new Date(),
  };

  // Cache
  if (redis) {
    await redis.setex(CACHE_KEYS.TRADE_OPPORTUNITIES, CACHE_TTL.TRADE_OPPORTUNITIES, JSON.stringify(result));
  }

  return result;
}

/**
 * Generate AI-powered insights for each layer
 * Uses Gemini 2.5 Flash for quick, contextual analysis
 */
async function generateLayerInsights(
  liquidity: GlobalLiquidity,
  markets: MarketFlow[],
  bias: LiquidityBias,
  recommendation: FlowRecommendation,
  rotation: ActiveRotation | null
): Promise<LayerInsights> {
  // Try cache first
  const cached = await redis?.get(CACHE_KEYS.INSIGHTS);
  if (cached) {
    return JSON.parse(cached);
  }

  // Prepare data summary for AI
  const cryptoMarket = markets.find(m => m.market === 'crypto');
  const stocksMarket = markets.find(m => m.market === 'stocks');
  const bondsMarket = markets.find(m => m.market === 'bonds');
  const metalsMarket = markets.find(m => m.market === 'metals');

  // Find best and worst performing markets
  const sortedMarkets = [...markets].sort((a, b) => b.flow7d - a.flow7d);
  const bestMarket = sortedMarkets[0];
  const worstMarket = sortedMarkets[sortedMarkets.length - 1];

  const prompt = `You are a financial analyst providing brief, actionable insights for a Capital Flow dashboard. Analyze the following data and provide 2-3 sentence insights for each layer PLUS a 1-2 sentence RAG (data-grounded) commentary. Be concise, specific, and actionable. Use plain language a trader would understand.

DATA:
Layer 1 - Global Liquidity:
- NET LIQUIDITY: ${liquidity.netLiquidity.value.toFixed(2)}T USD (${liquidity.netLiquidity.trend}, 30d: ${liquidity.netLiquidity.change30d > 0 ? '+' : ''}${liquidity.netLiquidity.change30d.toFixed(1)}%)
  * Formula: Fed BS (${liquidity.netLiquidity.components.fedBalanceSheet.toFixed(2)}T) - RRP (${liquidity.netLiquidity.components.reverseRepo.toFixed(2)}T) - TGA (${liquidity.netLiquidity.components.tga.toFixed(2)}T)
- Fed Balance Sheet: ${liquidity.fedBalanceSheet.value.toFixed(2)}T USD (${liquidity.fedBalanceSheet.trend})
- Reverse Repo (RRP): ${liquidity.reverseRepo.value.toFixed(2)}T USD (${liquidity.reverseRepo.trend}, 30d: ${liquidity.reverseRepo.change30d > 0 ? '+' : ''}${liquidity.reverseRepo.change30d.toFixed(1)}%)
- Treasury General Account (TGA): ${liquidity.treasuryGeneralAccount.value.toFixed(2)}T USD (${liquidity.treasuryGeneralAccount.trend}, 30d: ${liquidity.treasuryGeneralAccount.change30d > 0 ? '+' : ''}${liquidity.treasuryGeneralAccount.change30d.toFixed(1)}%)
- M2 Money Supply: ${liquidity.m2MoneySupply.value.toFixed(2)}T USD (YoY: ${liquidity.m2MoneySupply.yoyGrowth.toFixed(1)}%)
- DXY (Dollar): ${liquidity.dxy.value.toFixed(2)} (${liquidity.dxy.trend}, 7d: ${liquidity.dxy.change7d > 0 ? '+' : ''}${liquidity.dxy.change7d.toFixed(2)}%)
- VIX: ${liquidity.vix.value.toFixed(2)} (${liquidity.vix.level})
- Yield Curve: ${liquidity.yieldCurve.inverted ? 'INVERTED' : 'Normal'} (10Y-2Y: ${liquidity.yieldCurve.spread10y2y.toFixed(3)}%)
- Overall Bias: ${bias.toUpperCase()}

Layer 2 - Market Flows:
- Crypto: ${cryptoMarket?.flow7d.toFixed(1)}% (7d), Phase: ${cryptoMarket?.phase}, Signal: ${cryptoMarket?.rotationSignal || 'none'}
- Stocks: ${stocksMarket?.flow7d.toFixed(1)}% (7d), Phase: ${stocksMarket?.phase}, Signal: ${stocksMarket?.rotationSignal || 'none'}
- Bonds: ${bondsMarket?.flow7d.toFixed(1)}% (7d), Phase: ${bondsMarket?.phase}, Signal: ${bondsMarket?.rotationSignal || 'none'}
- Metals: ${metalsMarket?.flow7d.toFixed(1)}% (7d), Phase: ${metalsMarket?.phase}, Signal: ${metalsMarket?.rotationSignal || 'none'}
- Best performer: ${bestMarket?.market.toUpperCase()} (+${bestMarket?.flow7d.toFixed(1)}%)
- Worst performer: ${worstMarket?.market.toUpperCase()} (${worstMarket?.flow7d.toFixed(1)}%)

Layer 3 - Top Sectors:
${cryptoMarket?.sectors?.slice(0, 3).map(s => `- ${s.name}: ${s.flow7d > 0 ? '+' : ''}${s.flow7d.toFixed(1)}%`).join('\n') || 'No sector data'}

Recommendation: ${recommendation.action.toUpperCase()} ${recommendation.primaryMarket.toUpperCase()} (${recommendation.confidence}% confidence)
${rotation ? `Active Rotation: ${rotation.from} → ${rotation.to}` : 'No active rotation detected'}

IMPORTANT: RAG commentaries must cite specific numbers from the data above. Keep them 1-2 sentences max.

Respond in this exact JSON format (no markdown, just pure JSON):
{
  "layer1": "Your 2-3 sentence insight about global liquidity conditions and what they mean for traders",
  "layer2": "Your 2-3 sentence insight about which markets are attracting capital and the phase implications",
  "layer3": "Your 2-3 sentence insight about sector performance and opportunities",
  "layer4": "Your 2-3 sentence synthesis tying everything together with actionable guidance",
  "ragLayer1": "1-2 sentence citing specific Net Liquidity value and what it means (e.g., 'Net Liquidity at 5.8T with RRP draining signals...')",
  "ragLayer2": "1-2 sentence citing which market is leading and its phase (e.g., 'Crypto leading with +4.2% 7d flow in EARLY phase...')",
  "ragLayer3": "1-2 sentence citing top sector opportunity (e.g., 'DeFi sector +8.3% outperforming, focus on AAVE, UNI...')",
  "ragLayer4": "1-2 sentence final action call with confidence (e.g., 'With 78% confidence, prioritize CRYPTO entries in DeFi sector.')"
}`;

  try {
    const response = await callGeminiWithRetry(
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      },
      3,
      'capital_flow_insights'
    );

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const insights: LayerInsights = {
          layer1: parsed.layer1 || 'Global liquidity data is being analyzed.',
          layer2: parsed.layer2 || 'Market flow data is being analyzed.',
          layer3: parsed.layer3 || 'Sector data is being analyzed.',
          layer4: parsed.layer4 || 'Overall analysis is in progress.',
          // RAG Yorumları
          ragLayer1: parsed.ragLayer1 || generateFallbackRagLayer1(liquidity, bias),
          ragLayer2: parsed.ragLayer2 || generateFallbackRagLayer2(bestMarket, worstMarket),
          ragLayer3: parsed.ragLayer3 || generateFallbackRagLayer3(cryptoMarket),
          ragLayer4: parsed.ragLayer4 || generateFallbackRagLayer4(recommendation),
          generatedAt: new Date(),
        };

        // Cache insights
        if (redis) {
          await redis.setex(CACHE_KEYS.INSIGHTS, CACHE_TTL.INSIGHTS, JSON.stringify(insights));
        }

        return insights;
      }
    }
  } catch (error) {
    console.error('[CapitalFlow] Gemini API error:', error);
  }

  // Fallback insights with RAG commentaries
  return {
    layer1: `Net Liquidity is ${liquidity.netLiquidity.value.toFixed(2)}T USD (${liquidity.netLiquidity.trend}). ${bias === 'risk_on' ? 'Liquidity conditions favor risk assets.' : bias === 'risk_off' ? 'Defensive positioning recommended.' : 'Mixed signals in liquidity.'} ${liquidity.reverseRepo.trend === 'draining' ? 'RRP draining adds positive liquidity.' : liquidity.treasuryGeneralAccount.trend === 'spending' ? 'Treasury spending supports markets.' : ''}`,
    layer2: `${recommendation.primaryMarket.toUpperCase()} market is in ${recommendation.phase} phase with ${recommendation.confidence}% confidence.`,
    layer3: cryptoMarket?.sectors?.[0] ? `${cryptoMarket.sectors[0].name} is the leading sector with ${cryptoMarket.sectors[0].flow7d.toFixed(1)}% 7-day flow.` : 'Sector analysis pending.',
    layer4: `${recommendation.action === 'analyze' ? 'Good conditions to analyze opportunities.' : recommendation.action === 'wait' ? 'Wait for better entry conditions.' : 'Avoid new positions in current conditions.'}`,
    // RAG Yorumları - Fallback
    ragLayer1: generateFallbackRagLayer1(liquidity, bias),
    ragLayer2: generateFallbackRagLayer2(bestMarket, worstMarket),
    ragLayer3: generateFallbackRagLayer3(cryptoMarket),
    ragLayer4: generateFallbackRagLayer4(recommendation),
    generatedAt: new Date(),
  };
}

/**
 * RAG Layer 1 Fallback - Net Liquidity yorumu
 */
function generateFallbackRagLayer1(liquidity: GlobalLiquidity, bias: LiquidityBias): string {
  const netLiq = liquidity.netLiquidity.value.toFixed(2);
  const trend = liquidity.netLiquidity.trend;
  const rrpTrend = liquidity.reverseRepo.trend;
  const tgaTrend = liquidity.treasuryGeneralAccount.trend;

  if (trend === 'expanding' && rrpTrend === 'draining') {
    return `Net Liquidity ${netLiq}T USD artıyor, RRP boşalması piyasalara likidite ekliyor. Risk varlıkları için olumlu ortam.`;
  } else if (trend === 'contracting') {
    return `Net Liquidity ${netLiq}T USD daralıyor. ${tgaTrend === 'building' ? 'TGA birikiyor, likidite çekiliyor.' : 'Dikkatli olunmalı.'}`;
  }
  return `Net Liquidity ${netLiq}T USD seviyesinde, ${bias === 'risk_on' ? 'risk iştahı yüksek' : bias === 'risk_off' ? 'güvenli limanlara yöneliş var' : 'kararsız bir ortam mevcut'}.`;
}

/**
 * RAG Layer 2 Fallback - Market rotasyonu yorumu
 */
function generateFallbackRagLayer2(bestMarket: MarketFlow | undefined, worstMarket: MarketFlow | undefined): string {
  if (!bestMarket || !worstMarket) {
    return 'Market akış verileri analiz ediliyor.';
  }

  const best = bestMarket.market.toUpperCase();
  const bestFlow = bestMarket.flow7d.toFixed(1);
  const bestPhase = bestMarket.phase.toUpperCase();
  const worst = worstMarket.market.toUpperCase();
  const worstFlow = worstMarket.flow7d.toFixed(1);

  return `${best} +${bestFlow}% ile lider, ${bestPhase} fazında. ${worst} (${worstFlow}%) en zayıf performans, rotasyon sinyali olabilir.`;
}

/**
 * RAG Layer 3 Fallback - Sektör fırsatı yorumu
 */
function generateFallbackRagLayer3(cryptoMarket: MarketFlow | undefined): string {
  const topSector = cryptoMarket?.sectors?.[0];
  if (!topSector) {
    return 'Sektör verileri yükleniyor.';
  }

  const sectorName = topSector.name;
  const sectorFlow = topSector.flow7d.toFixed(1);
  const topAssets = topSector.topAssets?.slice(0, 3).join(', ') || '';

  return `${sectorName} sektörü ${sectorFlow > '0' ? '+' : ''}${sectorFlow}% ile öne çıkıyor.${topAssets ? ` Dikkat: ${topAssets}.` : ''}`;
}

/**
 * RAG Layer 4 Fallback - Aksiyon önerisi yorumu
 */
function generateFallbackRagLayer4(recommendation: FlowRecommendation): string {
  const market = recommendation.primaryMarket.toUpperCase();
  const action = recommendation.action.toUpperCase();
  const confidence = recommendation.confidence;
  const phase = recommendation.phase?.toUpperCase() || 'N/A';

  if (action === 'ANALYZE') {
    return `%${confidence} güvenle ${market}'te fırsat arayın. ${phase} fazı giriş için uygun.`;
  } else if (action === 'WAIT') {
    return `${market}'te bekle. Faz ${phase}, daha iyi giriş noktası için sabır gerekiyor.`;
  }
  return `${market}'te yeni pozisyon açmayın. Risk/ödül oranı olumsuz.`;
}

/**
 * Get detailed AI-powered analysis for a specific market
 * FREE feature - provides value without requiring credits
 */
export async function getMarketAnalysis(market: MarketType): Promise<{
  market: string;
  summary: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  keyMetrics: Array<{ label: string; value: string; status: 'positive' | 'negative' | 'neutral' }>;
  recommendation: string;
  confidence: number;
  generatedAt: Date;
}> {
  // Cache key for market analysis
  const cacheKey = `capital-flow:analysis:${market}`;
  const cached = await redis?.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get market data and global liquidity
  const [marketFlow, liquidity] = await Promise.all([
    getMarketFlow(market),
    getGlobalLiquidity(),
  ]);

  // Build key metrics based on market type
  const keyMetrics: Array<{ label: string; value: string; status: 'positive' | 'negative' | 'neutral' }> = [];

  // Common metrics for all markets
  keyMetrics.push({
    label: '7-Day Flow',
    value: `${marketFlow.flow7d >= 0 ? '+' : ''}${marketFlow.flow7d.toFixed(2)}%`,
    status: marketFlow.flow7d > 2 ? 'positive' : marketFlow.flow7d < -2 ? 'negative' : 'neutral',
  });

  keyMetrics.push({
    label: '30-Day Flow',
    value: `${marketFlow.flow30d >= 0 ? '+' : ''}${marketFlow.flow30d.toFixed(2)}%`,
    status: marketFlow.flow30d > 5 ? 'positive' : marketFlow.flow30d < -5 ? 'negative' : 'neutral',
  });

  keyMetrics.push({
    label: 'Flow Velocity',
    value: `${marketFlow.flowVelocity >= 0 ? '+' : ''}${marketFlow.flowVelocity.toFixed(2)}`,
    status: marketFlow.flowVelocity > 0 ? 'positive' : marketFlow.flowVelocity < 0 ? 'negative' : 'neutral',
  });

  keyMetrics.push({
    label: 'Phase',
    value: marketFlow.phase.toUpperCase(),
    status: marketFlow.phase === 'early' ? 'positive' : marketFlow.phase === 'exit' ? 'negative' : 'neutral',
  });

  keyMetrics.push({
    label: 'Days in Phase',
    value: `${marketFlow.daysInPhase} / ${marketFlow.avgPhaseDuration} avg`,
    status: marketFlow.daysInPhase < marketFlow.avgPhaseDuration ? 'positive' : 'negative',
  });

  // Market-specific metrics
  if (market === 'crypto') {
    keyMetrics.push({
      label: 'Market Signal',
      value: marketFlow.rotationSignal?.toUpperCase() || 'STABLE',
      status: marketFlow.rotationSignal === 'entering' ? 'positive' : marketFlow.rotationSignal === 'exiting' ? 'negative' : 'neutral',
    });
  } else if (market === 'stocks') {
    keyMetrics.push({
      label: 'VIX Level',
      value: `${liquidity.vix.value.toFixed(1)} (${liquidity.vix.level.replace('_', ' ')})`,
      status: liquidity.vix.level === 'complacent' ? 'positive' : liquidity.vix.level === 'extreme_fear' ? 'negative' : 'neutral',
    });
  } else if (market === 'bonds') {
    keyMetrics.push({
      label: 'Yield Curve',
      value: `${liquidity.yieldCurve.spread10y2y.toFixed(3)}% ${liquidity.yieldCurve.inverted ? '(INVERTED)' : ''}`,
      status: liquidity.yieldCurve.inverted ? 'negative' : 'positive',
    });
  } else if (market === 'metals') {
    keyMetrics.push({
      label: 'Dollar Trend',
      value: `${liquidity.dxy.trend.toUpperCase()}`,
      status: liquidity.dxy.trend === 'weakening' ? 'positive' : liquidity.dxy.trend === 'strengthening' ? 'negative' : 'neutral',
    });
  }

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (marketFlow.flow7d > 2 && marketFlow.flowVelocity > 0) {
    trend = 'bullish';
  } else if (marketFlow.flow7d < -2 || marketFlow.flowVelocity < -2) {
    trend = 'bearish';
  }

  // Generate AI summary
  const marketName = MARKET_CONFIG[market].name;
  const topSectors = marketFlow.sectors?.slice(0, 3).map(s => s.name).join(', ') || '';

  const prompt = `You are a senior market analyst. Provide a brief, actionable analysis for ${marketName} market.

MARKET DATA:
- Market: ${marketName}
- 7-Day Flow: ${marketFlow.flow7d.toFixed(2)}%
- 30-Day Flow: ${marketFlow.flow30d.toFixed(2)}%
- Flow Velocity: ${marketFlow.flowVelocity.toFixed(2)}
- Phase: ${marketFlow.phase.toUpperCase()} (${marketFlow.daysInPhase} days)
- Rotation Signal: ${marketFlow.rotationSignal || 'none'}
${topSectors ? `- Top Sectors: ${topSectors}` : ''}

GLOBAL CONTEXT:
- Net Liquidity: ${liquidity.netLiquidity.value.toFixed(2)}T USD (${liquidity.netLiquidity.trend})
- RRP: ${liquidity.reverseRepo.trend} (${liquidity.reverseRepo.value.toFixed(2)}T)
- TGA: ${liquidity.treasuryGeneralAccount.trend} (${liquidity.treasuryGeneralAccount.value.toFixed(2)}T)
- Dollar: ${liquidity.dxy.trend} (${liquidity.dxy.value.toFixed(2)})
- VIX: ${liquidity.vix.value.toFixed(1)} (${liquidity.vix.level})
- Yield Curve: ${liquidity.yieldCurve.inverted ? 'INVERTED' : 'Normal'}

Provide your analysis in this exact JSON format (no markdown):
{
  "summary": "2-3 sentences summarizing current market conditions and what traders should know",
  "recommendation": "One clear, actionable sentence about what traders should do right now"
}`;

  let summary = '';
  let recommendation = '';
  let confidence = 50;

  try {
    const response = await callGeminiWithRetry(
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
        },
      },
      3,
      'market_analysis'
    );

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = parsed.summary || '';
        recommendation = parsed.recommendation || '';
      }
    }
  } catch (error) {
    console.error('[CapitalFlow] Market analysis AI error:', error);
  }

  // Fallback if AI fails
  if (!summary) {
    summary = `${marketName} is in a ${marketFlow.phase} phase with ${marketFlow.flow7d.toFixed(1)}% 7-day flow. `;
    if (trend === 'bullish') {
      summary += 'Capital inflows are accelerating, suggesting positive momentum.';
    } else if (trend === 'bearish') {
      summary += 'Capital outflows detected. Exercise caution.';
    } else {
      summary += 'Capital flows are relatively stable. Monitor for changes.';
    }
  }

  if (!recommendation) {
    if (marketFlow.phase === 'early' && trend !== 'bearish') {
      recommendation = `Consider analyzing ${marketName.toLowerCase()} opportunities. Early phase with positive flow.`;
      confidence = 80;
    } else if (marketFlow.phase === 'mid') {
      recommendation = `${marketName} in established trend. Selective entries may work with tight risk management.`;
      confidence = 65;
    } else if (marketFlow.phase === 'late') {
      recommendation = `Late phase in ${marketName.toLowerCase()}. Avoid new positions, consider taking profits.`;
      confidence = 60;
    } else {
      recommendation = `Wait for better conditions in ${marketName.toLowerCase()}. Exit phase signals caution.`;
      confidence = 70;
    }
  } else {
    // Calculate confidence based on data
    confidence = 50;
    if (marketFlow.phase === 'early') confidence += 20;
    if (Math.abs(marketFlow.flow7d) > 5) confidence += 10;
    if (marketFlow.flowVelocity > 0 && marketFlow.flow7d > 0) confidence += 10;
    confidence = Math.min(90, confidence);
  }

  const analysis = {
    market,
    summary,
    trend,
    keyMetrics,
    recommendation,
    confidence,
    generatedAt: new Date(),
  };

  // Cache for 10 minutes
  if (redis) {
    await redis.setex(cacheKey, 600, JSON.stringify(analysis));
  }

  return analysis;
}

// ============================================================================
// 5-FACTOR SCORING SYSTEM FOR LAYER 4 RECOMMENDATIONS
// ============================================================================
// Each factor scores 0-100, weighted to produce final confidence
//
// 1. LIQUIDITY SCORE (25% weight) - Global liquidity conditions
//    - Net Liquidity trend and magnitude
//    - RRP/TGA direction (draining RRP = bullish, spending TGA = bullish)
//
// 2. FLOW SCORE (30% weight) - Market-specific capital flow
//    - 7-day flow strength and direction
//    - 30-day trend confirmation
//    - Flow velocity (acceleration)
//
// 3. PHASE SCORE (20% weight) - Cycle timing
//    - Early = optimal entry (100)
//    - Mid = proceed with caution (70)
//    - Late = avoid new positions (30)
//    - Exit = do not enter (10)
//
// 4. ROTATION SCORE (15% weight) - Capital rotation signals
//    - Entering signal strength
//    - Exiting markets as source
//    - Rotation confidence
//
// 5. CORRELATION SCORE (10% weight) - Cross-market alignment
//    - Correlation with other markets
//    - Hedging opportunities
//    - Risk-on/risk-off alignment
// ============================================================================

interface FiveFactorScore {
  liquidityScore: number;       // 0-100
  flowScore: number;            // 0-100
  phaseScore: number;           // 0-100
  rotationScore: number;        // 0-100
  correlationScore: number;     // 0-100
  totalScore: number;           // Weighted average
  breakdown: {
    liquidity: string;          // Explanation
    flow: string;
    phase: string;
    rotation: string;
    correlation: string;
  };
}

// Factor weights (must sum to 1.0)
const FACTOR_WEIGHTS = {
  liquidity: 0.25,
  flow: 0.30,
  phase: 0.20,
  rotation: 0.15,
  correlation: 0.10,
};

/**
 * Calculate 5-Factor Score for a market
 * Used to generate high-confidence recommendations
 */
export function calculateFiveFactorScore(
  market: MarketFlow,
  liquidity: GlobalLiquidity,
  allMarkets: MarketFlow[],
  correlations?: CorrelationMatrix,
  direction: 'BUY' | 'SELL' = 'BUY'
): FiveFactorScore {
  // 1. LIQUIDITY SCORE (0-100)
  const liquidityScore = calculateLiquidityScore(liquidity, direction);

  // 2. FLOW SCORE (0-100)
  const flowScore = calculateFlowScore(market, direction);

  // 3. PHASE SCORE (0-100)
  const phaseScore = calculatePhaseScore(market.phase, direction);

  // 4. ROTATION SCORE (0-100)
  const rotationScore = calculateRotationScore(market, allMarkets, direction);

  // 5. CORRELATION SCORE (0-100)
  const correlationScore = calculateCorrelationScore(market, correlations, direction);

  // Calculate weighted total
  const totalScore = Math.round(
    liquidityScore * FACTOR_WEIGHTS.liquidity +
    flowScore * FACTOR_WEIGHTS.flow +
    phaseScore * FACTOR_WEIGHTS.phase +
    rotationScore * FACTOR_WEIGHTS.rotation +
    correlationScore * FACTOR_WEIGHTS.correlation
  );

  return {
    liquidityScore,
    flowScore,
    phaseScore,
    rotationScore,
    correlationScore,
    totalScore,
    breakdown: {
      liquidity: getLiquidityBreakdown(liquidity, liquidityScore),
      flow: getFlowBreakdown(market, flowScore, direction),
      phase: getPhaseBreakdown(market.phase, phaseScore),
      rotation: getRotationBreakdown(market, rotationScore),
      correlation: getCorrelationBreakdown(correlationScore),
    },
  };
}

/**
 * Factor 1: Liquidity Score
 * Measures global liquidity conditions (Net Liquidity, RRP, TGA)
 */
function calculateLiquidityScore(liquidity: GlobalLiquidity, direction: 'BUY' | 'SELL'): number {
  let score = 50; // Neutral baseline

  // Net Liquidity is the PRIMARY indicator
  // Expanding = bullish, Contracting = bearish
  if (liquidity.netLiquidity.trend === 'expanding') {
    score += direction === 'BUY' ? 20 : -10;
  } else if (liquidity.netLiquidity.trend === 'contracting') {
    score += direction === 'SELL' ? 20 : -10;
  }

  // Net Liquidity change magnitude
  if (liquidity.netLiquidity.change30d > 3) {
    score += direction === 'BUY' ? 10 : -5;
  } else if (liquidity.netLiquidity.change30d < -3) {
    score += direction === 'SELL' ? 10 : -5;
  }

  // RRP trend (draining = money entering markets = bullish)
  if (liquidity.reverseRepo.trend === 'draining') {
    score += direction === 'BUY' ? 8 : -4;
  } else if (liquidity.reverseRepo.trend === 'filling') {
    score += direction === 'SELL' ? 8 : -4;
  }

  // TGA trend (spending = money entering markets = bullish)
  if (liquidity.treasuryGeneralAccount.trend === 'spending') {
    score += direction === 'BUY' ? 8 : -4;
  } else if (liquidity.treasuryGeneralAccount.trend === 'building') {
    score += direction === 'SELL' ? 8 : -4;
  }

  // Dollar strength (weak dollar = bullish for risk assets)
  if (liquidity.dxy.trend === 'weakening') {
    score += direction === 'BUY' ? 5 : -2;
  } else if (liquidity.dxy.trend === 'strengthening') {
    score += direction === 'SELL' ? 5 : -2;
  }

  // VIX level
  if (liquidity.vix.level === 'complacent') {
    score += direction === 'BUY' ? 3 : -1;
  } else if (liquidity.vix.level === 'extreme_fear') {
    score += direction === 'SELL' ? 5 : 3; // Fear can be good for BUY (contrarian)
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 2: Flow Score
 * Measures market-specific capital flow strength
 */
function calculateFlowScore(market: MarketFlow, direction: 'BUY' | 'SELL'): number {
  let score = 50; // Neutral baseline

  // 7-day flow (most recent signal)
  const flow7d = market.flow7d;
  if (direction === 'BUY') {
    if (flow7d > 5) score += 25;
    else if (flow7d > 3) score += 18;
    else if (flow7d > 1) score += 10;
    else if (flow7d < -3) score -= 20;
    else if (flow7d < -1) score -= 10;
  } else {
    // SELL direction
    if (flow7d < -5) score += 25;
    else if (flow7d < -3) score += 18;
    else if (flow7d < -1) score += 10;
    else if (flow7d > 3) score -= 20;
    else if (flow7d > 1) score -= 10;
  }

  // 30-day flow (trend confirmation)
  const flow30d = market.flow30d;
  if (direction === 'BUY') {
    if (flow30d > 10) score += 12;
    else if (flow30d > 5) score += 8;
    else if (flow30d < -5) score -= 10;
  } else {
    if (flow30d < -10) score += 12;
    else if (flow30d < -5) score += 8;
    else if (flow30d > 5) score -= 10;
  }

  // Flow velocity (acceleration)
  const velocity = market.flowVelocity;
  if (direction === 'BUY') {
    if (velocity > 2) score += 10;
    else if (velocity > 0) score += 5;
    else if (velocity < -2) score -= 10;
  } else {
    if (velocity < -2) score += 10;
    else if (velocity < 0) score += 5;
    else if (velocity > 2) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 3: Phase Score
 * Measures cycle timing (when in the trend are we?)
 */
function calculatePhaseScore(phase: Phase, direction: 'BUY' | 'SELL'): number {
  const phaseScores = {
    BUY: {
      early: 95,  // Optimal entry
      mid: 65,    // Proceed with caution
      late: 25,   // Avoid new longs
      exit: 10,   // Do not buy
    },
    SELL: {
      early: 15,  // Risky to short (trend starting)
      mid: 40,    // Caution with shorts
      late: 70,   // Good for shorts (trend exhaustion)
      exit: 90,   // Optimal short entry
    },
  };

  return phaseScores[direction][phase];
}

/**
 * Factor 4: Rotation Score
 * Measures capital rotation signals
 */
function calculateRotationScore(market: MarketFlow, allMarkets: MarketFlow[], direction: 'BUY' | 'SELL'): number {
  let score = 50; // Neutral baseline

  const signal = market.rotationSignal;

  if (direction === 'BUY') {
    if (signal === 'entering') {
      score += 30;
      // Bonus if other markets are exiting (clear rotation)
      const exitingCount = allMarkets.filter(m => m.rotationSignal === 'exiting').length;
      if (exitingCount > 0) score += exitingCount * 8;
    } else if (signal === 'exiting') {
      score -= 25;
    } else if (signal === 'stable') {
      score += 5; // Slight positive for stability
    }
  } else {
    // SELL direction
    if (signal === 'exiting') {
      score += 30;
      // Bonus if other markets are entering (clear rotation)
      const enteringCount = allMarkets.filter(m => m.rotationSignal === 'entering').length;
      if (enteringCount > 0) score += enteringCount * 8;
    } else if (signal === 'entering') {
      score -= 25;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 5: Correlation Score
 * Measures cross-market alignment
 */
function calculateCorrelationScore(
  market: MarketFlow,
  correlations: CorrelationMatrix | undefined,
  direction: 'BUY' | 'SELL'
): number {
  if (!correlations) return 50; // Neutral if no correlation data

  let score = 50;

  // Find correlations involving this market
  const marketCorrelations = correlations.correlations.filter(c =>
    c.market1 === market.market || c.market2 === market.market
  );

  if (marketCorrelations.length === 0) return 50;

  // Analyze correlations
  for (const corr of marketCorrelations) {
    const otherMarket = corr.market1 === market.market ? corr.market2 : corr.market1;

    if (direction === 'BUY') {
      // For BUY: positive correlation with strong markets is good
      // Negative correlation with weak markets is also good (hedging potential)
      if (corr.direction === 'positive' && corr.strength === 'strong') {
        score += 8;
      } else if (corr.direction === 'negative' && corr.strength === 'strong') {
        score += 5; // Good for hedging
      }
    } else {
      // For SELL: negative correlation with strong markets supports the short
      if (corr.direction === 'negative' && corr.strength === 'strong') {
        score += 10;
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// BREAKDOWN DESCRIPTIONS
// ============================================================================

function getLiquidityBreakdown(liquidity: GlobalLiquidity, score: number): string {
  const parts: string[] = [];

  parts.push(`Net Liquidity: ${liquidity.netLiquidity.value.toFixed(2)}T (${liquidity.netLiquidity.trend})`);
  if (liquidity.reverseRepo.trend === 'draining') parts.push('RRP draining adds liquidity');
  if (liquidity.treasuryGeneralAccount.trend === 'spending') parts.push('Treasury spending supports markets');
  if (liquidity.dxy.trend === 'weakening') parts.push('Weak dollar is bullish');

  return `Score: ${score}/100. ${parts.join('. ')}.`;
}

function getFlowBreakdown(market: MarketFlow, score: number, direction: 'BUY' | 'SELL'): string {
  const flow7dLabel = market.flow7d >= 0 ? '+' + market.flow7d.toFixed(1) : market.flow7d.toFixed(1);
  const flow30dLabel = market.flow30d >= 0 ? '+' + market.flow30d.toFixed(1) : market.flow30d.toFixed(1);
  const velocityLabel = market.flowVelocity >= 0 ? '+' + market.flowVelocity.toFixed(1) : market.flowVelocity.toFixed(1);

  return `Score: ${score}/100. 7d: ${flow7dLabel}%, 30d: ${flow30dLabel}%, Velocity: ${velocityLabel}. ${direction === 'BUY' ? 'Positive' : 'Negative'} flow ${direction === 'BUY' ? 'supports' : 'confirms'} ${direction.toLowerCase()} signal.`;
}

function getPhaseBreakdown(phase: Phase, score: number): string {
  const phaseDescriptions = {
    early: 'EARLY phase - optimal entry window, trend just starting',
    mid: 'MID phase - trend established, proceed with caution',
    late: 'LATE phase - trend exhaustion, avoid new positions',
    exit: 'EXIT phase - capital exiting, do not enter',
  };

  return `Score: ${score}/100. ${phaseDescriptions[phase]}.`;
}

function getRotationBreakdown(market: MarketFlow, score: number): string {
  const signal = market.rotationSignal || 'none';
  const signalDescriptions: Record<string, string> = {
    entering: 'Capital ENTERING - money rotating into this market',
    exiting: 'Capital EXITING - money rotating out of this market',
    stable: 'STABLE - no significant rotation detected',
    none: 'No clear rotation signal',
  };

  return `Score: ${score}/100. ${signalDescriptions[signal]}.`;
}

function getCorrelationBreakdown(score: number): string {
  if (score >= 70) return `Score: ${score}/100. Strong correlation alignment supports the trade.`;
  if (score >= 50) return `Score: ${score}/100. Moderate correlation - trade is consistent with cross-market signals.`;
  return `Score: ${score}/100. Weak or conflicting correlations - additional caution advised.`;
}

/**
 * Clear all capital flow cache
 */
export async function clearCapitalFlowCache(): Promise<void> {
  if (redis) {
    await redis.del(CACHE_KEYS.CAPITAL_FLOW);
    await redis.del(CACHE_KEYS.GLOBAL_LIQUIDITY);
    await redis.del(CACHE_KEYS.MARKET_FLOW('crypto'));
    await redis.del(CACHE_KEYS.MARKET_FLOW('stocks'));
    await redis.del(CACHE_KEYS.MARKET_FLOW('bonds'));
    await redis.del(CACHE_KEYS.MARKET_FLOW('metals'));
    await redis.del(CACHE_KEYS.INSIGHTS);
  }
}
