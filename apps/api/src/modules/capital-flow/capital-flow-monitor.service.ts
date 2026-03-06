// ===========================================
// Capital Flow Trade Monitor Service
// Monitors open trades against capital flow data
// Warns when money flows out of asset's sector
// ===========================================

import { logger } from '../../core/logger';
import { redis } from '../../core/cache';
import { getCapitalFlowSummary } from './capital-flow.service';
import { MarketType, Phase, CapitalFlowSummary, MarketFlow } from './types';
import { getAssetClass } from '../analysis/providers/multi-asset-data-provider';

// ===========================================
// TYPES
// ===========================================

export interface FlowAlert {
  alertId: string;
  analysisId: string;
  symbol: string;
  market: MarketType;
  severity: 'info' | 'warning' | 'critical';
  type: FlowAlertType;
  title: string;
  message: string;
  data: {
    flow7d: number;
    flow30d: number;
    flowVelocity: number;
    phase: Phase;
    rotationSignal: string | null;
    rotationTarget: string | null;
    liquidityBias: string;
  };
  actionSuggestion: string;
  createdAt: Date;
}

export type FlowAlertType =
  | 'capital_outflow'        // Money leaving this market
  | 'phase_change'           // Market phase changed (e.g., mid→late)
  | 'rotation_detected'      // Capital rotating to another market
  | 'liquidity_shift'        // Global liquidity bias changed
  | 'velocity_reversal'      // Flow acceleration reversed direction
  | 'regime_change';         // Market regime changed (risk_on→risk_off)

export interface TradeFlowStatus {
  analysisId: string;
  symbol: string;
  market: MarketType;
  direction: 'long' | 'short';
  entryPrice: number;

  // Capital flow context
  flowHealth: 'healthy' | 'weakening' | 'adverse';
  flowHealthScore: number; // 0-100
  flowHealthReason: string;

  // Current market flow data
  marketFlow: {
    flow7d: number;
    flow30d: number;
    flowVelocity: number;
    phase: Phase;
    daysInPhase: number;
    rotationSignal: string | null;
  };

  // Global context
  liquidityBias: string;
  marketRegime: string;

  // Alerts for this trade
  alerts: FlowAlert[];

  // Recommendation
  holdRecommendation: 'hold' | 'tighten_stop' | 'take_profit' | 'close_position';
  holdReason: string;

  lastChecked: Date;
}

export interface ActiveTradeInput {
  analysisId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  createdAt: Date;
}

// ===========================================
// CONSTANTS
// ===========================================

const FLOW_MONITOR_CACHE_KEY = 'flow_monitor:';
const FLOW_MONITOR_CACHE_TTL = 300; // 5 minutes

// ===========================================
// MAIN MONITORING FUNCTION
// ===========================================

/**
 * Check capital flow health for a specific active trade
 */
export async function checkTradeFlowHealth(
  trade: ActiveTradeInput
): Promise<TradeFlowStatus> {
  const cacheKey = `${FLOW_MONITOR_CACHE_KEY}${trade.analysisId}`;

  // Check cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch { /* ignore cache errors */ }

  // Get capital flow data
  let flowSummary: CapitalFlowSummary;
  try {
    flowSummary = await getCapitalFlowSummary();
  } catch (error) {
    logger.warn({ error, symbol: trade.symbol }, '[FlowMonitor] Failed to get capital flow data');
    return buildDefaultStatus(trade);
  }

  // Determine which market this asset belongs to
  const market = mapAssetClassToMarket(trade.symbol);

  // Find the market flow data
  const marketFlow = flowSummary.markets?.find(m => m?.market === market);
  if (!marketFlow) {
    return buildDefaultStatus(trade);
  }

  // Generate alerts
  const alerts = generateFlowAlerts(trade, marketFlow, flowSummary);

  // Calculate flow health
  const { health, score, reason } = calculateFlowHealth(
    trade.direction,
    marketFlow,
    flowSummary.liquidityBias
  );

  // Generate hold recommendation
  const { recommendation, holdReason } = generateHoldRecommendation(
    trade,
    marketFlow,
    flowSummary,
    health,
    score
  );

  const status: TradeFlowStatus = {
    analysisId: trade.analysisId,
    symbol: trade.symbol,
    market,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    flowHealth: health,
    flowHealthScore: score,
    flowHealthReason: reason,
    marketFlow: {
      flow7d: marketFlow.flow7d ?? 0,
      flow30d: marketFlow.flow30d ?? 0,
      flowVelocity: marketFlow.flowVelocity ?? 0,
      phase: marketFlow.phase ?? 'mid',
      daysInPhase: marketFlow.daysInPhase ?? 0,
      rotationSignal: marketFlow.rotationSignal ?? null,
    },
    liquidityBias: flowSummary.liquidityBias || 'neutral',
    marketRegime: flowSummary.liquidityBias || 'neutral',
    alerts,
    holdRecommendation: recommendation,
    holdReason,
    lastChecked: new Date(),
  };

  // Cache result
  try {
    await redis.setex(cacheKey, FLOW_MONITOR_CACHE_TTL, JSON.stringify(status));
  } catch { /* ignore cache errors */ }

  return status;
}

/**
 * Check capital flow health for multiple trades at once
 */
export async function checkBulkTradeFlowHealth(
  trades: ActiveTradeInput[]
): Promise<TradeFlowStatus[]> {
  if (trades.length === 0) return [];

  // Fetch capital flow once for all trades
  let flowSummary: CapitalFlowSummary;
  try {
    flowSummary = await getCapitalFlowSummary();
  } catch (error) {
    logger.warn({ error }, '[FlowMonitor] Failed to get capital flow data for bulk check');
    return trades.map(t => buildDefaultStatus(t));
  }

  return trades.map(trade => {
    const market = mapAssetClassToMarket(trade.symbol);
    const marketFlow = flowSummary.markets?.find(m => m?.market === market);

    if (!marketFlow) {
      return buildDefaultStatus(trade);
    }

    const alerts = generateFlowAlerts(trade, marketFlow, flowSummary);
    const { health, score, reason } = calculateFlowHealth(
      trade.direction,
      marketFlow,
      flowSummary.liquidityBias
    );
    const { recommendation, holdReason } = generateHoldRecommendation(
      trade, marketFlow, flowSummary, health, score
    );

    return {
      analysisId: trade.analysisId,
      symbol: trade.symbol,
      market,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      flowHealth: health,
      flowHealthScore: score,
      flowHealthReason: reason,
      marketFlow: {
        flow7d: marketFlow.flow7d ?? 0,
        flow30d: marketFlow.flow30d ?? 0,
        flowVelocity: marketFlow.flowVelocity ?? 0,
        phase: marketFlow.phase ?? 'mid',
        daysInPhase: marketFlow.daysInPhase ?? 0,
        rotationSignal: marketFlow.rotationSignal ?? null,
      },
      liquidityBias: flowSummary.liquidityBias || 'neutral',
      marketRegime: flowSummary.liquidityBias || 'neutral',
      alerts,
      holdRecommendation: recommendation,
      holdReason,
      lastChecked: new Date(),
    };
  });
}

// ===========================================
// ALERT GENERATION
// ===========================================

function generateFlowAlerts(
  trade: ActiveTradeInput,
  marketFlow: MarketFlow,
  summary: CapitalFlowSummary
): FlowAlert[] {
  const alerts: FlowAlert[] = [];
  const market = mapAssetClassToMarket(trade.symbol);
  const baseData = {
    flow7d: marketFlow.flow7d ?? 0,
    flow30d: marketFlow.flow30d ?? 0,
    flowVelocity: marketFlow.flowVelocity ?? 0,
    phase: marketFlow.phase ?? 'mid' as Phase,
    rotationSignal: marketFlow.rotationSignal ?? null,
    rotationTarget: marketFlow.rotationTarget ?? null,
    liquidityBias: summary.liquidityBias || 'neutral',
  };

  const now = new Date();

  // 1. Capital Outflow Alert
  if (trade.direction === 'long' && (marketFlow.flow7d ?? 0) < -2) {
    alerts.push({
      alertId: `outflow_${trade.analysisId}_${now.getTime()}`,
      analysisId: trade.analysisId,
      symbol: trade.symbol,
      market,
      severity: (marketFlow.flow7d ?? 0) < -5 ? 'critical' : 'warning',
      type: 'capital_outflow',
      title: 'Capital Outflow Detected',
      message: `${(marketFlow.flow7d ?? 0).toFixed(1)}% capital outflow from ${market} in 7 days. Your LONG position may face headwinds.`,
      data: baseData,
      actionSuggestion: (marketFlow.flow7d ?? 0) < -5
        ? 'Consider tightening stop loss or taking partial profits'
        : 'Monitor closely - flow may reverse',
      createdAt: now,
    });
  }

  if (trade.direction === 'short' && (marketFlow.flow7d ?? 0) > 3) {
    alerts.push({
      alertId: `inflow_${trade.analysisId}_${now.getTime()}`,
      analysisId: trade.analysisId,
      symbol: trade.symbol,
      market,
      severity: (marketFlow.flow7d ?? 0) > 6 ? 'critical' : 'warning',
      type: 'capital_outflow',
      title: 'Capital Inflow Detected',
      message: `${(marketFlow.flow7d ?? 0).toFixed(1)}% capital inflow to ${market} in 7 days. Your SHORT position may face headwinds.`,
      data: baseData,
      actionSuggestion: (marketFlow.flow7d ?? 0) > 6
        ? 'Consider tightening stop loss or closing position'
        : 'Monitor closely - inflow may slow',
      createdAt: now,
    });
  }

  // 2. Phase Change Alert (Late or Exit phase)
  if (marketFlow.phase === 'late' || marketFlow.phase === 'exit') {
    const isLong = trade.direction === 'long';
    if (isLong) {
      alerts.push({
        alertId: `phase_${trade.analysisId}_${now.getTime()}`,
        analysisId: trade.analysisId,
        symbol: trade.symbol,
        market,
        severity: marketFlow.phase === 'exit' ? 'critical' : 'warning',
        type: 'phase_change',
        title: `Market in ${(marketFlow.phase ?? 'mid').toUpperCase()} Phase`,
        message: `${market} market is in ${marketFlow.phase} phase (${marketFlow.daysInPhase ?? 0} days). New entries not recommended, consider taking profits on existing longs.`,
        data: baseData,
        actionSuggestion: marketFlow.phase === 'exit'
          ? 'Take profits - capital likely exiting this market'
          : 'Tighten trailing stop - trend maturity increases reversal risk',
        createdAt: now,
      });
    }
  }

  // 3. Rotation Detection Alert
  if (marketFlow.rotationSignal === 'exiting' && marketFlow.rotationTarget) {
    alerts.push({
      alertId: `rotation_${trade.analysisId}_${now.getTime()}`,
      analysisId: trade.analysisId,
      symbol: trade.symbol,
      market,
      severity: 'warning',
      type: 'rotation_detected',
      title: 'Capital Rotation Detected',
      message: `Capital rotating from ${market} to ${marketFlow.rotationTarget}. Confidence: ${marketFlow.rotationConfidence ?? 0}%.`,
      data: baseData,
      actionSuggestion: `Monitor position closely. Capital moving to ${marketFlow.rotationTarget} suggests weakening momentum in ${market}.`,
      createdAt: now,
    });
  }

  // 4. Liquidity Bias Shift
  if (summary.liquidityBias === 'risk_off' && trade.direction === 'long' &&
      (market === 'crypto' || market === 'stocks')) {
    alerts.push({
      alertId: `liquidity_${trade.analysisId}_${now.getTime()}`,
      analysisId: trade.analysisId,
      symbol: trade.symbol,
      market,
      severity: 'warning',
      type: 'liquidity_shift',
      title: 'Risk-Off Environment',
      message: `Global liquidity bias is RISK-OFF. Risk assets (${market}) typically underperform in this environment.`,
      data: baseData,
      actionSuggestion: 'Consider reducing position size or tightening stop loss',
      createdAt: now,
    });
  }

  // 5. Velocity Reversal Alert
  if ((trade.direction === 'long' && (marketFlow.flowVelocity ?? 0) < -2) ||
      (trade.direction === 'short' && (marketFlow.flowVelocity ?? 0) > 2)) {
    alerts.push({
      alertId: `velocity_${trade.analysisId}_${now.getTime()}`,
      analysisId: trade.analysisId,
      symbol: trade.symbol,
      market,
      severity: 'info',
      type: 'velocity_reversal',
      title: 'Flow Momentum Change',
      message: trade.direction === 'long'
        ? `Capital flow into ${market} is decelerating (velocity: ${(marketFlow.flowVelocity ?? 0).toFixed(1)}). The trend may be weakening.`
        : `Capital flow out of ${market} is decelerating (velocity: ${(marketFlow.flowVelocity ?? 0).toFixed(1)}). Short squeeze risk increasing.`,
      data: baseData,
      actionSuggestion: 'Be prepared for potential trend change - set alerts for key levels',
      createdAt: now,
    });
  }

  return alerts;
}

// ===========================================
// FLOW HEALTH CALCULATION
// ===========================================

function calculateFlowHealth(
  direction: 'long' | 'short',
  marketFlow: MarketFlow,
  liquidityBias: string
): { health: 'healthy' | 'weakening' | 'adverse'; score: number; reason: string } {
  let score = 50; // Start neutral
  const reasons: string[] = [];

  const flow7d = marketFlow.flow7d ?? 0;
  const flow30d = marketFlow.flow30d ?? 0;
  const velocity = marketFlow.flowVelocity ?? 0;
  const phase = marketFlow.phase ?? 'mid';
  const rotation = marketFlow.rotationSignal;

  if (direction === 'long') {
    // LONG position benefits from capital inflow
    // Flow direction
    if (flow7d > 3) { score += 15; reasons.push(`Strong 7d inflow (+${flow7d.toFixed(1)}%)`); }
    else if (flow7d > 0) { score += 5; reasons.push(`Positive 7d flow (+${flow7d.toFixed(1)}%)`); }
    else if (flow7d < -3) { score -= 20; reasons.push(`Capital outflow (${flow7d.toFixed(1)}%)`); }
    else if (flow7d < 0) { score -= 10; reasons.push(`Negative 7d flow (${flow7d.toFixed(1)}%)`); }

    // Flow velocity (momentum)
    if (velocity > 1) { score += 10; reasons.push('Accelerating inflow'); }
    else if (velocity < -1) { score -= 10; reasons.push('Decelerating flow'); }

    // Phase
    if (phase === 'early') { score += 15; reasons.push('Early phase - strong potential'); }
    else if (phase === 'mid') { score += 5; reasons.push('Mid phase - healthy'); }
    else if (phase === 'late') { score -= 10; reasons.push('Late phase - maturing'); }
    else if (phase === 'exit') { score -= 25; reasons.push('Exit phase - capital leaving'); }

    // Rotation
    if (rotation === 'entering') { score += 10; reasons.push('Capital entering market'); }
    else if (rotation === 'exiting') { score -= 15; reasons.push('Capital rotating out'); }

    // Global liquidity
    if (liquidityBias === 'risk_on') { score += 10; reasons.push('Risk-on environment'); }
    else if (liquidityBias === 'risk_off') { score -= 15; reasons.push('Risk-off environment'); }
  } else {
    // SHORT position benefits from capital outflow
    if (flow7d < -3) { score += 15; reasons.push(`Strong outflow supports short (${flow7d.toFixed(1)}%)`); }
    else if (flow7d < 0) { score += 5; reasons.push(`Negative flow supports short`); }
    else if (flow7d > 3) { score -= 20; reasons.push(`Strong inflow opposes short (+${flow7d.toFixed(1)}%)`); }
    else if (flow7d > 0) { score -= 10; reasons.push(`Positive flow opposes short`); }

    if (velocity < -1) { score += 10; reasons.push('Accelerating outflow'); }
    else if (velocity > 1) { score -= 10; reasons.push('Flow reversing to inflow'); }

    if (phase === 'exit') { score += 15; reasons.push('Exit phase - supports short'); }
    else if (phase === 'late') { score += 5; reasons.push('Late phase - trend exhaustion'); }
    else if (phase === 'early') { score -= 15; reasons.push('Early inflow phase - risky short'); }

    if (rotation === 'exiting') { score += 10; reasons.push('Capital rotating out'); }
    else if (rotation === 'entering') { score -= 15; reasons.push('Capital entering - risky short'); }

    if (liquidityBias === 'risk_off') { score += 10; reasons.push('Risk-off supports short'); }
    else if (liquidityBias === 'risk_on') { score -= 10; reasons.push('Risk-on opposes short'); }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine health
  let health: 'healthy' | 'weakening' | 'adverse';
  if (score >= 60) health = 'healthy';
  else if (score >= 35) health = 'weakening';
  else health = 'adverse';

  return {
    health,
    score,
    reason: reasons.slice(0, 3).join('. '),
  };
}

// ===========================================
// HOLD RECOMMENDATION
// ===========================================

function generateHoldRecommendation(
  trade: ActiveTradeInput,
  marketFlow: MarketFlow,
  summary: CapitalFlowSummary,
  health: 'healthy' | 'weakening' | 'adverse',
  score: number
): { recommendation: 'hold' | 'tighten_stop' | 'take_profit' | 'close_position'; holdReason: string } {
  const phase = marketFlow.phase ?? 'mid';
  const rotation = marketFlow.rotationSignal;
  const velocity = marketFlow.flowVelocity ?? 0;

  // Critical: Close position
  if (health === 'adverse' && score < 20) {
    return {
      recommendation: 'close_position',
      holdReason: `Capital flow strongly opposes your ${trade.direction.toUpperCase()} position. Flow health score: ${score}/100.`,
    };
  }

  // Take profit: Late/Exit phase
  if (phase === 'exit' && trade.direction === 'long') {
    return {
      recommendation: 'take_profit',
      holdReason: 'Market in EXIT phase - capital is leaving. Take profits while available.',
    };
  }

  if (phase === 'late' && rotation === 'exiting') {
    return {
      recommendation: 'take_profit',
      holdReason: `Late phase with capital rotating to ${marketFlow.rotationTarget || 'other markets'}. Consider taking profits.`,
    };
  }

  // Tighten stop: Weakening flow
  if (health === 'weakening') {
    return {
      recommendation: 'tighten_stop',
      holdReason: `Flow health weakening (${score}/100). Tighten trailing stop to protect gains.`,
    };
  }

  if (health === 'adverse') {
    return {
      recommendation: 'tighten_stop',
      holdReason: `Capital flow adverse for your position (${score}/100). Tighten stop loss significantly.`,
    };
  }

  // Hold: Healthy flow
  return {
    recommendation: 'hold',
    holdReason: `Capital flow supports your position (${score}/100). ${phase === 'early' ? 'Strong early phase momentum.' : 'Flow remains healthy.'}`,
  };
}

// ===========================================
// HELPERS
// ===========================================

function mapAssetClassToMarket(symbol: string): MarketType {
  const assetClass = getAssetClass(symbol);
  switch (assetClass) {
    case 'crypto': return 'crypto';
    case 'stocks': return 'stocks';
    case 'metals': return 'metals';
    case 'bonds': return 'bonds';
    case 'bist': return 'stocks'; // BIST is a stock exchange
    default: return 'crypto';
  }
}

function buildDefaultStatus(trade: ActiveTradeInput): TradeFlowStatus {
  return {
    analysisId: trade.analysisId,
    symbol: trade.symbol,
    market: mapAssetClassToMarket(trade.symbol),
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    flowHealth: 'healthy', // Default to healthy when data unavailable
    flowHealthScore: 50,
    flowHealthReason: 'Capital flow data temporarily unavailable',
    marketFlow: {
      flow7d: 0,
      flow30d: 0,
      flowVelocity: 0,
      phase: 'mid',
      daysInPhase: 0,
      rotationSignal: null,
    },
    liquidityBias: 'neutral',
    marketRegime: 'neutral',
    alerts: [],
    holdRecommendation: 'hold',
    holdReason: 'Continue monitoring - flow data temporarily unavailable',
    lastChecked: new Date(),
  };
}

// ===========================================
// PERIODIC MONITORING (for cron job)
// ===========================================

/**
 * Run periodic flow health check for all active trades
 * Called from live-tracking interval
 */
export async function runFlowHealthCheck(
  activeTrades: ActiveTradeInput[]
): Promise<{ checked: number; alerts: FlowAlert[] }> {
  if (activeTrades.length === 0) {
    return { checked: 0, alerts: [] };
  }

  logger.info({ tradeCount: activeTrades.length }, '[FlowMonitor] Running periodic flow health check');

  const statuses = await checkBulkTradeFlowHealth(activeTrades);

  // Collect all critical/warning alerts
  const allAlerts = statuses.flatMap(s => s.alerts.filter(a => a.severity !== 'info'));

  if (allAlerts.length > 0) {
    logger.info({
      alertCount: allAlerts.length,
      criticalCount: allAlerts.filter(a => a.severity === 'critical').length,
      warningCount: allAlerts.filter(a => a.severity === 'warning').length,
    }, '[FlowMonitor] Flow alerts generated');

    // Store alerts in Redis for API consumption
    try {
      const alertsKey = 'flow_monitor:alerts:latest';
      await redis.setex(alertsKey, 600, JSON.stringify(allAlerts)); // 10 min TTL
    } catch { /* ignore cache errors */ }
  }

  return {
    checked: statuses.length,
    alerts: allAlerts,
  };
}
