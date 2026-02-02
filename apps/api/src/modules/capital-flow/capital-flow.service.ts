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
    // RRP and TGA - key liquidity drains
    reverseRepo: fredData.reverseRepo,
    treasuryGeneralAccount: fredData.treasuryGeneralAccount,
    // Net Liquidity = Fed BS - RRP - TGA (the KEY metric)
    netLiquidity: fredData.netLiquidity,
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
 * Generate SELL recommendation (markets with outflow or weakest performance)
 */
function generateSellRecommendation(
  markets: MarketFlow[],
  bias: LiquidityBias
): FlowRecommendation | null {
  // Safety check - need at least 2 markets to compare
  if (!markets || markets.length < 2) {
    return null;
  }

  // Sort markets by flow strength (lowest/most negative first for SELL)
  const sortedMarkets = [...markets].sort((a, b) => {
    const scoreA = a.flow7d * 0.7 + a.flowVelocity * 0.3;
    const scoreB = b.flow7d * 0.7 + b.flowVelocity * 0.3;
    return scoreA - scoreB; // Ascending order - worst performing first
  });

  const worstMarket = sortedMarkets[0];
  const bestMarket = sortedMarkets[sortedMarkets.length - 1];

  // Safety check for undefined
  if (!worstMarket || !bestMarket) {
    return null;
  }

  // Calculate relative weakness (difference from best performer)
  const relativeWeakness = bestMarket.flow7d - worstMarket.flow7d;

  // In risk-off, SELL risky assets
  if (bias === 'risk_off') {
    const cryptoMarket = markets.find(m => m.market === 'crypto');
    const stocksMarket = markets.find(m => m.market === 'stocks');

    // SELL the riskier asset with worse performance
    const riskyMarket = (cryptoMarket?.flow7d || 0) < (stocksMarket?.flow7d || 0)
      ? cryptoMarket || worstMarket
      : stocksMarket || worstMarket;

    if (riskyMarket) {
      return {
        primaryMarket: riskyMarket.market,
        phase: riskyMarket.phase,
        action: riskyMarket.flow7d < 0 ? 'analyze' : 'wait',
        direction: 'SELL',
        reason: `Risk-off environment. ${MARKET_CONFIG[riskyMarket.market].name} underperforming (${riskyMarket.flow7d >= 0 ? '+' : ''}${riskyMarket.flow7d.toFixed(1)}%). Consider reducing exposure or short positions.`,
        sectors: riskyMarket.sectors?.filter(s => s.trending === 'down' || s.flow7d < (riskyMarket.flow7d / 2)).slice(0, 3).map(s => s.name),
        confidence: riskyMarket.flow7d < 0 ? 75 : 60,
      };
    }
  }

  // Determine SELL action based on absolute outflow, relative weakness, or being the underperformer
  let action: 'analyze' | 'wait' | 'avoid';
  let reason: string;
  let confidence: number;

  if (worstMarket.flow7d < 0) {
    // Actual outflow - stronger signal
    if (worstMarket.phase === 'exit' || worstMarket.rotationSignal === 'exiting') {
      action = 'analyze';
      reason = `${MARKET_CONFIG[worstMarket.market].name} experiencing outflows (${worstMarket.flow7d.toFixed(1)}%). Capital rotating out. Look for short opportunities.`;
      confidence = 80;
    } else if (worstMarket.flow7d < -5) {
      action = 'analyze';
      reason = `${MARKET_CONFIG[worstMarket.market].name} in significant decline (${worstMarket.flow7d.toFixed(1)}%). Consider short positions on weak sectors.`;
      confidence = 75;
    } else {
      action = 'wait';
      reason = `${MARKET_CONFIG[worstMarket.market].name} showing mild outflows (${worstMarket.flow7d.toFixed(1)}%). Monitor for stronger short signals.`;
      confidence = 60;
    }
  } else if (relativeWeakness > 5) {
    // No absolute outflow but significantly weaker than best performer
    action = 'wait';
    reason = `${MARKET_CONFIG[worstMarket.market].name} underperforming vs ${MARKET_CONFIG[bestMarket.market].name} (${relativeWeakness.toFixed(1)}% gap). Watch for rotation out.`;
    confidence = 55;
  } else if (worstMarket.flowVelocity < -1) {
    // Slowing momentum - potential reversal
    action = 'wait';
    reason = `${MARKET_CONFIG[worstMarket.market].name} momentum slowing (velocity: ${worstMarket.flowVelocity.toFixed(1)}). Early warning for potential outflow.`;
    confidence = 50;
  } else if (relativeWeakness > 0) {
    // Even small underperformance - show as "avoid" opportunity
    action = 'avoid';
    reason = `${MARKET_CONFIG[worstMarket.market].name} is the relative underperformer (${worstMarket.flow7d >= 0 ? '+' : ''}${worstMarket.flow7d.toFixed(1)}% vs ${MARKET_CONFIG[bestMarket.market].name} +${bestMarket.flow7d.toFixed(1)}%). Not ideal for new longs.`;
    confidence = 40;
  } else {
    // All markets exactly equal - extremely rare
    action = 'avoid';
    reason = `All markets performing similarly. No clear underperformer for short opportunities.`;
    confidence = 30;
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
    layer1: `Net Liquidity is ${liquidity.netLiquidity.value.toFixed(2)}T USD (${liquidity.netLiquidity.trend}). ${bias === 'risk_on' ? 'Liquidity conditions favor risk assets.' : bias === 'risk_off' ? 'Defensive positioning recommended.' : 'Mixed signals in liquidity.'} ${liquidity.reverseRepo.trend === 'draining' ? 'RRP draining adds positive liquidity.' : liquidity.treasuryGeneralAccount.trend === 'spending' ? 'Treasury spending supports markets.' : ''}`,
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
