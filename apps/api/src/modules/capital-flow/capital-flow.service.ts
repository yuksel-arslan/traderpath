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

import { redis } from '../../config/redis';
import {
  CapitalFlowSummary,
  GlobalLiquidity,
  MarketFlow,
  MarketType,
  Phase,
  LiquidityBias,
  FlowRecommendation,
  ActiveRotation,
  PHASE_CONFIG,
  MARKET_CONFIG,
} from './types';

// Providers
import { getAllFredData } from './providers/fred.provider';
import { getAllYahooData, getDxyData, getVixData, getStocksFlow, getMetalsFlow } from './providers/yahoo.provider';
import { getAllDefiLlamaData, getCryptoSectors, getDeFiTvl, getStablecoinMarketCap } from './providers/defillama.provider';

// Cache keys
const CACHE_KEYS = {
  CAPITAL_FLOW: 'capital-flow:summary',
  GLOBAL_LIQUIDITY: 'capital-flow:liquidity',
  MARKET_FLOW: (market: MarketType) => `capital-flow:market:${market}`,
  ROTATION_HISTORY: 'capital-flow:rotation-history',
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  SUMMARY: 300,      // 5 minutes
  LIQUIDITY: 3600,   // 1 hour (FRED data is daily)
  MARKET: 300,       // 5 minutes
  ROTATION: 86400,   // 24 hours
};

/**
 * Get complete Capital Flow Summary
 */
export async function getCapitalFlowSummary(): Promise<CapitalFlowSummary> {
  // Try cache first
  const cached = await redis?.get(CACHE_KEYS.CAPITAL_FLOW);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch all data in parallel
  const [globalLiquidity, markets] = await Promise.all([
    getGlobalLiquidity(),
    getAllMarketFlows(),
  ]);

  // Determine liquidity bias
  const liquidityBias = determineLiquidityBias(globalLiquidity);

  // Generate recommendation
  const recommendation = generateRecommendation(globalLiquidity, markets, liquidityBias);

  // Detect active rotation
  const activeRotation = detectActiveRotation(markets);

  const summary: CapitalFlowSummary = {
    timestamp: new Date(),
    globalLiquidity,
    liquidityBias,
    markets,
    recommendation,
    activeRotation,
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
  const cached = await redis?.get(CACHE_KEYS.GLOBAL_LIQUIDITY);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from providers
  const [fredData, dxyData, vixData] = await Promise.all([
    getAllFredData(),
    getDxyData(),
    getVixData(),
  ]);

  const liquidity: GlobalLiquidity = {
    fedBalanceSheet: fredData.fedBalanceSheet,
    m2MoneySupply: fredData.m2MoneySupply,
    dxy: dxyData,
    vix: vixData,
    yieldCurve: fredData.yieldCurve,
    lastUpdated: new Date(),
  };

  // Cache
  if (redis) {
    await redis.setex(CACHE_KEYS.GLOBAL_LIQUIDITY, CACHE_TTL.LIQUIDITY, JSON.stringify(liquidity));
  }

  return liquidity;
}

/**
 * Get all market flows
 */
export async function getAllMarketFlows(): Promise<MarketFlow[]> {
  const [cryptoFlow, stocksFlow, bondsFlow, metalsFlow] = await Promise.all([
    getCryptoFlow(),
    getStocksMarketFlow(),
    getBondsFlow(),
    getMetalsMarketFlow(),
  ]);

  return [cryptoFlow, stocksFlow, bondsFlow, metalsFlow];
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

/**
 * Get Crypto market flow
 */
async function getCryptoFlow(): Promise<MarketFlow> {
  const [tvlData, sectors, stablecoins] = await Promise.all([
    getDeFiTvl(),
    getCryptoSectors(),
    getStablecoinMarketCap(),
  ]);

  // Also get CoinGecko global data for total market cap
  let totalMarketCap = 0;
  let change7d = tvlData.change7d;
  let change30d = tvlData.change30d;

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/global', {
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      totalMarketCap = data.data?.total_market_cap?.usd || 0;
      change7d = data.data?.market_cap_change_percentage_24h_usd * 7 / 24 || change7d; // Rough 7d estimate
    }
  } catch (error) {
    console.error('[CapitalFlow] CoinGecko error:', error);
    totalMarketCap = tvlData.current * 50; // Rough estimate: DeFi is ~2% of total crypto
  }

  const baseFlow = {
    market: 'crypto' as const,
    currentValue: totalMarketCap / 1_000_000_000_000, // Trillions
    flow7d: change7d,
    flow30d: change30d,
    flowVelocity: calculateVelocity(change7d, change30d),
    sectors,
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
 */
async function getStocksMarketFlow(): Promise<MarketFlow> {
  const stocksData = await getStocksFlow();

  const baseFlow = {
    ...stocksData,
    currentValue: stocksData.currentValue,
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
 * Get Bonds market flow (using yield as inverse proxy)
 */
async function getBondsFlow(): Promise<MarketFlow> {
  const fredData = await getAllFredData();

  // Bond prices move inversely to yields
  // Rising yields = falling bond prices = outflow
  // Falling yields = rising bond prices = inflow
  const yieldChange = fredData.yieldCurve.spread10y2y;

  // Simulate flow based on yield curve behavior
  // When curve is inverted/flattening, money flows to bonds (safety)
  const flow7d = yieldChange < 0 ? Math.abs(yieldChange) * 2 : -yieldChange * 2;
  const flow30d = flow7d * 3; // Rough estimate

  const baseFlow = {
    market: 'bonds' as const,
    currentValue: fredData.yieldCurve.spread10y2y,
    flow7d,
    flow30d,
    flowVelocity: calculateVelocity(flow7d, flow30d),
    sectors: [
      {
        name: 'Treasury',
        flow7d: flow7d,
        flow30d: flow30d,
        dominance: 70,
        trending: flow7d > 1 ? 'up' : flow7d < -1 ? 'down' : 'stable',
        topAssets: ['TLT', 'IEF', 'SHY', 'BND', 'AGG'],
      },
      {
        name: 'Corporate',
        flow7d: flow7d * 0.8,
        flow30d: flow30d * 0.8,
        dominance: 30,
        trending: flow7d > 1 ? 'up' : flow7d < -1 ? 'down' : 'stable',
        topAssets: ['LQD', 'HYG', 'JNK', 'VCIT', 'VCSH'],
      },
    ],
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
 */
async function getMetalsMarketFlow(): Promise<MarketFlow> {
  const metalsData = await getMetalsFlow();

  const phase = detectPhase(metalsData);
  const phaseInfo = getPhaseInfo(phase, metalsData);

  return {
    ...metalsData,
    ...phaseInfo,
    rotationSignal: detectRotationSignal(metalsData),
    rotationTarget: null,
    rotationConfidence: 0,
  };
}

/**
 * Detect market phase
 */
function detectPhase(flow: { flow7d: number; flow30d: number; flowVelocity: number }): Phase {
  const { flow7d, flow30d, flowVelocity } = flow;

  // EARLY: New inflow starting (positive but not yet established)
  if (flow7d > 3 && flow30d < 10 && flowVelocity > 0) {
    return 'early';
  }

  // MID: Established trend (consistent flow)
  if (flow7d > 0 && flow30d > 5 && flow30d < 20) {
    return 'mid';
  }

  // LATE: Trend exhaustion (slowing down)
  if (flow7d < flow30d * 0.3 && flow30d > 15) {
    return 'late';
  }

  // EXIT: Outflow or reversal
  if (flow7d < -2 || flowVelocity < -3) {
    return 'exit';
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
 * Determine overall liquidity bias
 */
function determineLiquidityBias(liquidity: GlobalLiquidity): LiquidityBias {
  let riskOnScore = 0;
  let riskOffScore = 0;

  // Fed Balance Sheet
  if (liquidity.fedBalanceSheet.trend === 'expanding') riskOnScore += 2;
  else if (liquidity.fedBalanceSheet.trend === 'contracting') riskOffScore += 2;

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

  if (diff > 2) return 'risk_on';
  if (diff < -2) return 'risk_off';
  return 'neutral';
}

/**
 * Generate investment recommendation
 */
function generateRecommendation(
  liquidity: GlobalLiquidity,
  markets: MarketFlow[],
  bias: LiquidityBias
): FlowRecommendation {
  // Sort markets by flow strength
  const sortedMarkets = [...markets].sort((a, b) => {
    // Consider both flow7d and velocity
    const scoreA = a.flow7d * 0.7 + a.flowVelocity * 0.3;
    const scoreB = b.flow7d * 0.7 + b.flowVelocity * 0.3;
    return scoreB - scoreA;
  });

  const topMarket = sortedMarkets[0];

  // In risk-off, recommend safe assets
  if (bias === 'risk_off') {
    const bondsMarket = markets.find(m => m.market === 'bonds');
    const metalsMarket = markets.find(m => m.market === 'metals');

    // Prefer bonds or metals in risk-off
    const safeMarket = (bondsMarket?.flow7d || 0) > (metalsMarket?.flow7d || 0)
      ? bondsMarket || topMarket
      : metalsMarket || topMarket;

    return {
      primaryMarket: safeMarket.market,
      phase: safeMarket.phase,
      action: safeMarket.phase === 'exit' ? 'avoid' : 'wait',
      reason: 'Risk-off environment. Prefer safe haven assets (Bonds, Gold).',
      sectors: safeMarket.sectors?.slice(0, 3).map(s => s.name),
      confidence: 70,
    };
  }

  // Determine action based on phase
  let action: 'analyze' | 'wait' | 'avoid';
  let reason: string;
  let confidence: number;

  switch (topMarket.phase) {
    case 'early':
      action = 'analyze';
      reason = `${MARKET_CONFIG[topMarket.market].name} showing early inflow signals. Optimal entry window.`;
      confidence = 85;
      break;
    case 'mid':
      action = 'analyze';
      reason = `${MARKET_CONFIG[topMarket.market].name} in established trend. Proceed with caution.`;
      confidence = 70;
      break;
    case 'late':
      action = 'wait';
      reason = `${MARKET_CONFIG[topMarket.market].name} trend showing exhaustion. No new entries recommended.`;
      confidence = 60;
      break;
    case 'exit':
      action = 'avoid';
      reason = `${MARKET_CONFIG[topMarket.market].name} experiencing outflows. Wait for rotation.`;
      confidence = 75;
      break;
    default:
      action = 'wait';
      reason = 'Market conditions unclear. Wait for better signals.';
      confidence = 50;
  }

  // Get top sectors if available
  const topSectors = topMarket.sectors
    ?.filter(s => s.trending === 'up')
    .slice(0, 3)
    .map(s => s.name);

  return {
    primaryMarket: topMarket.market,
    phase: topMarket.phase,
    action,
    reason,
    sectors: topSectors,
    confidence,
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
 */
export async function getFlowRecommendation(): Promise<FlowRecommendation> {
  const summary = await getCapitalFlowSummary();
  return summary.recommendation;
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
  }
}
