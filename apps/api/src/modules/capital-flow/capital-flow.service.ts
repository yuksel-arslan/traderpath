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

  // Generate BUY recommendation (markets with inflow)
  const recommendation = generateRecommendation(globalLiquidity, markets, liquidityBias);

  // Generate SELL recommendation (markets with outflow)
  const sellRecommendation = generateSellRecommendation(markets, liquidityBias);

  // Detect active rotation
  const activeRotation = detectActiveRotation(markets);

  // Calculate market correlations
  let correlations: CorrelationMatrix | undefined;
  try {
    correlations = await calculateMarketCorrelations(markets);
  } catch (error) {
    console.error('[CapitalFlow] Error calculating correlations:', error);
  }

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
 * Generate synthetic historical flow data for charts
 * Creates a 30-day history based on current flow values with realistic variation
 */
function generateFlowHistory(flow7d: number, flow30d: number): FlowDataPoint[] {
  const history: FlowDataPoint[] = [];
  const now = new Date();

  // Calculate daily average and apply some variation
  const dailyAvg = flow30d / 30;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Apply sinusoidal variation to make it look more realistic
    const variation = Math.sin((i / 5) * Math.PI) * (Math.abs(dailyAvg) * 0.3);
    // Add random noise
    const noise = (Math.random() - 0.5) * (Math.abs(dailyAvg) * 0.2);
    // Calculate cumulative value from day 30 to current
    const cumulative = dailyAvg * (30 - i) + variation + noise;

    history.push({
      date: date.toISOString().split('T')[0],
      value: Number(cumulative.toFixed(2)),
    });
  }

  // Ensure the last value matches flow30d
  if (history.length > 0) {
    history[history.length - 1].value = flow30d;
  }

  return history;
}

/**
 * Generate velocity history based on flow history
 */
function generateVelocityHistory(flowHistory: FlowDataPoint[]): FlowDataPoint[] {
  const velocityHistory: FlowDataPoint[] = [];

  for (let i = 1; i < flowHistory.length; i++) {
    const velocity = flowHistory[i].value - flowHistory[i - 1].value;
    velocityHistory.push({
      date: flowHistory[i].date,
      value: Number(velocity.toFixed(2)),
    });
  }

  return velocityHistory;
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

  // Generate historical data for charts
  const flowHistory = generateFlowHistory(change7d, change30d);
  const velocityHistory = generateVelocityHistory(flowHistory);

  const baseFlow = {
    market: 'crypto' as const,
    currentValue: totalMarketCap / 1_000_000_000_000, // Trillions
    flow7d: change7d,
    flow30d: change30d,
    flowVelocity: calculateVelocity(change7d, change30d),
    flowHistory,
    velocityHistory,
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

  // Generate historical data for charts
  const flowHistory = generateFlowHistory(stocksData.flow7d, stocksData.flow30d);
  const velocityHistory = generateVelocityHistory(flowHistory);

  const baseFlow = {
    ...stocksData,
    currentValue: stocksData.currentValue,
    flowHistory,
    velocityHistory,
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

  // Generate historical data for charts
  const flowHistory = generateFlowHistory(flow7d, flow30d);
  const velocityHistory = generateVelocityHistory(flowHistory);

  const baseFlow = {
    market: 'bonds' as const,
    currentValue: fredData.yieldCurve.spread10y2y,
    flow7d,
    flow30d,
    flowVelocity: calculateVelocity(flow7d, flow30d),
    flowHistory,
    velocityHistory,
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

  // Generate historical data for charts
  const flowHistory = generateFlowHistory(metalsData.flow7d, metalsData.flow30d);
  const velocityHistory = generateVelocityHistory(flowHistory);

  const phase = detectPhase(metalsData);
  const phaseInfo = getPhaseInfo(phase, metalsData);

  return {
    ...metalsData,
    flowHistory,
    velocityHistory,
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
 * Generate BUY recommendation (markets with inflow)
 */
function generateRecommendation(
  liquidity: GlobalLiquidity,
  markets: MarketFlow[],
  bias: LiquidityBias
): FlowRecommendation {
  // Sort markets by flow strength (highest first for BUY)
  const sortedMarkets = [...markets].sort((a, b) => {
    const scoreA = a.flow7d * 0.7 + a.flowVelocity * 0.3;
    const scoreB = b.flow7d * 0.7 + b.flowVelocity * 0.3;
    return scoreB - scoreA;
  });

  const topMarket = sortedMarkets[0];

  // In risk-off, recommend safe assets
  if (bias === 'risk_off') {
    const bondsMarket = markets.find(m => m.market === 'bonds');
    const metalsMarket = markets.find(m => m.market === 'metals');

    const safeMarket = (bondsMarket?.flow7d || 0) > (metalsMarket?.flow7d || 0)
      ? bondsMarket || topMarket
      : metalsMarket || topMarket;

    return {
      primaryMarket: safeMarket.market,
      phase: safeMarket.phase,
      action: safeMarket.phase === 'exit' ? 'avoid' : 'wait',
      direction: 'BUY',
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
    confidence,
  };
}

/**
 * Generate SELL recommendation (markets with outflow)
 */
function generateSellRecommendation(
  markets: MarketFlow[],
  bias: LiquidityBias
): FlowRecommendation | null {
  // Sort markets by outflow strength (lowest/most negative first for SELL)
  const sortedMarkets = [...markets].sort((a, b) => {
    const scoreA = a.flow7d * 0.7 + a.flowVelocity * 0.3;
    const scoreB = b.flow7d * 0.7 + b.flowVelocity * 0.3;
    return scoreA - scoreB; // Ascending order - worst performing first
  });

  const worstMarket = sortedMarkets[0];

  // Only recommend SELL if there's actual outflow
  if (worstMarket.flow7d >= 0 && worstMarket.flowVelocity >= 0) {
    return null; // No significant outflow detected
  }

  // In risk-off, SELL risky assets
  if (bias === 'risk_off') {
    const cryptoMarket = markets.find(m => m.market === 'crypto');
    const stocksMarket = markets.find(m => m.market === 'stocks');

    // SELL the riskier asset with more outflow
    const riskyMarket = (cryptoMarket?.flow7d || 0) < (stocksMarket?.flow7d || 0)
      ? cryptoMarket || worstMarket
      : stocksMarket || worstMarket;

    if (riskyMarket && riskyMarket.flow7d < -2) {
      return {
        primaryMarket: riskyMarket.market,
        phase: riskyMarket.phase,
        action: 'analyze',
        direction: 'SELL',
        reason: `Risk-off environment. ${MARKET_CONFIG[riskyMarket.market].name} showing outflows. Consider short positions or exits.`,
        sectors: riskyMarket.sectors?.filter(s => s.trending === 'down').slice(0, 3).map(s => s.name),
        confidence: 75,
      };
    }
  }

  // Determine SELL action based on outflow severity
  let action: 'analyze' | 'wait' | 'avoid';
  let reason: string;
  let confidence: number;

  const outflowStrength = Math.abs(worstMarket.flow7d);

  if (worstMarket.phase === 'exit' || worstMarket.rotationSignal === 'exiting') {
    action = 'analyze';
    reason = `${MARKET_CONFIG[worstMarket.market].name} experiencing strong outflows (${worstMarket.flow7d.toFixed(1)}%). Look for short opportunities.`;
    confidence = 80;
  } else if (outflowStrength > 5) {
    action = 'analyze';
    reason = `${MARKET_CONFIG[worstMarket.market].name} in significant decline. Consider short positions on weak sectors.`;
    confidence = 75;
  } else if (outflowStrength > 2) {
    action = 'wait';
    reason = `${MARKET_CONFIG[worstMarket.market].name} showing mild outflows. Monitor for stronger signals.`;
    confidence = 60;
  } else {
    return null; // Outflow not significant enough for SELL recommendation
  }

  // Get weakest sectors (trending down)
  const weakSectors = worstMarket.sectors
    ?.filter(s => s.trending === 'down' || s.flow7d < 0)
    .sort((a, b) => a.flow7d - b.flow7d)
    .slice(0, 3)
    .map(s => s.name);

  return {
    primaryMarket: worstMarket.market,
    phase: worstMarket.phase,
    action,
    direction: 'SELL',
    reason,
    sectors: weakSectors,
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

  const prompt = `You are a financial analyst providing brief, actionable insights for a Capital Flow dashboard. Analyze the following data and provide 2-3 sentence insights for each layer. Be concise, specific, and actionable. Use plain language a trader would understand.

DATA:
Layer 1 - Global Liquidity:
- Fed Balance Sheet: ${liquidity.fedBalanceSheet.value.toFixed(2)}T USD (${liquidity.fedBalanceSheet.trend})
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

Layer 3 - Top Sectors:
${cryptoMarket?.sectors?.slice(0, 3).map(s => `- ${s.name}: ${s.flow7d > 0 ? '+' : ''}${s.flow7d.toFixed(1)}%`).join('\n') || 'No sector data'}

Recommendation: ${recommendation.action.toUpperCase()} ${recommendation.primaryMarket.toUpperCase()} (${recommendation.confidence}% confidence)
${rotation ? `Active Rotation: ${rotation.from} → ${rotation.to}` : 'No active rotation detected'}

Respond in this exact JSON format (no markdown, just pure JSON):
{
  "layer1": "Your 2-3 sentence insight about global liquidity conditions and what they mean for traders",
  "layer2": "Your 2-3 sentence insight about which markets are attracting capital and the phase implications",
  "layer3": "Your 2-3 sentence insight about sector performance and opportunities",
  "layer4": "Your 2-3 sentence synthesis tying everything together with actionable guidance"
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

  // Fallback insights
  return {
    layer1: `Fed balance sheet is ${liquidity.fedBalanceSheet.trend}. ${bias === 'risk_on' ? 'Liquidity conditions favor risk assets.' : bias === 'risk_off' ? 'Defensive positioning recommended.' : 'Mixed signals in liquidity.'}`,
    layer2: `${recommendation.primaryMarket.toUpperCase()} market is in ${recommendation.phase} phase with ${recommendation.confidence}% confidence.`,
    layer3: cryptoMarket?.sectors?.[0] ? `${cryptoMarket.sectors[0].name} is the leading sector with ${cryptoMarket.sectors[0].flow7d.toFixed(1)}% 7-day flow.` : 'Sector analysis pending.',
    layer4: `${recommendation.action === 'analyze' ? 'Good conditions to analyze opportunities.' : recommendation.action === 'wait' ? 'Wait for better entry conditions.' : 'Avoid new positions in current conditions.'}`,
    generatedAt: new Date(),
  };
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
- Liquidity: Fed ${liquidity.fedBalanceSheet.trend}, M2 YoY ${liquidity.m2MoneySupply.yoyGrowth.toFixed(1)}%
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
