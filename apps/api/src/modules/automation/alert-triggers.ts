// ===========================================
// Smart Alert Triggers - L1-L4 Hierarchy
// Detects critical changes in Capital Flow layers
// ===========================================

import type {
  CapitalFlowSummary,
  GlobalLiquidity,
  MarketFlow,
  MarketType,
  LiquidityBias,
  Phase,
} from '../capital-flow/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertLayer = 'L1' | 'L2' | 'L3' | 'L4';

export type AlertType =
  // L1 triggers
  | 'L1_LIQUIDITY_SHIFT'
  | 'L1_DXY_BREAKOUT'
  | 'L1_VIX_SPIKE'
  | 'L1_FED_BALANCE_SHEET_CHANGE'
  | 'L1_YIELD_CURVE_INVERSION'
  // L2 triggers
  | 'L2_MARKET_BIAS_CHANGE'
  | 'L2_ROTATION_DETECTED'
  | 'L2_PHASE_CHANGE'
  // L3 triggers
  | 'L3_SECTOR_FLOW_ANOMALY'
  | 'L3_SECTOR_DOMINANCE_SHIFT'
  // L4 triggers
  | 'L4_VOLUME_SPIKE'
  | 'L4_RECOMMENDATION_CHANGE';

export interface SmartAlert {
  type: AlertType;
  layer: AlertLayer;
  severity: AlertSeverity;
  title: string;
  message: string;
  action: string;
  market?: MarketType;
  metadata: Record<string, unknown>;
}

/** Snapshot of values we track between runs to detect *changes*. */
export interface AlertSnapshot {
  liquidityBias: LiquidityBias;
  vixLevel: string;
  dxyValue: number;
  dxyTrend: string;
  yieldCurveInverted: boolean;
  fedBsChange30d: number;
  marketPhases: Record<string, Phase>;
  marketRotations: Record<string, string>;
  recommendationMarket: string;
  recommendationDirection: string;
  sectorDominance: Record<string, Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  VIX_SPIKE: 25,
  VIX_EXTREME: 30,
  DXY_MOVE_SIGNIFICANT: 1.5,      // 1.5% weekly move
  FED_BS_CHANGE_SIGNIFICANT: 5,   // 5% monthly change
  SECTOR_FLOW_ANOMALY: 10,        // 10% drop/rise in sector flow
  SECTOR_DOMINANCE_SHIFT: 5,      // 5 pp dominance change
  VOLUME_SPIKE_MULTIPLIER: 2,     // 2x average volume
};

// ---------------------------------------------------------------------------
// Build snapshot from current data
// ---------------------------------------------------------------------------

export function buildSnapshot(summary: CapitalFlowSummary): AlertSnapshot {
  const marketPhases: Record<string, Phase> = {};
  const marketRotations: Record<string, string> = {};
  const sectorDominance: Record<string, Record<string, number>> = {};

  for (const m of summary.markets) {
    marketPhases[m.market] = m.phase;
    marketRotations[m.market] = m.rotationSignal ?? 'stable';
    if (m.sectors && m.sectors.length > 0) {
      sectorDominance[m.market] = {};
      for (const s of m.sectors) {
        sectorDominance[m.market][s.name] = s.dominance;
      }
    }
  }

  return {
    liquidityBias: summary.liquidityBias,
    vixLevel: summary.globalLiquidity.vix.level,
    dxyValue: summary.globalLiquidity.dxy.value,
    dxyTrend: summary.globalLiquidity.dxy.trend,
    yieldCurveInverted: summary.globalLiquidity.yieldCurve.inverted,
    fedBsChange30d: summary.globalLiquidity.fedBalanceSheet.change30d,
    marketPhases,
    marketRotations,
    recommendationMarket: summary.recommendation?.primaryMarket ?? '',
    recommendationDirection: summary.recommendation?.direction ?? '',
    sectorDominance,
  };
}

// ---------------------------------------------------------------------------
// Evaluate triggers – compare previous snapshot to current data
// ---------------------------------------------------------------------------

export function evaluateTriggers(
  current: CapitalFlowSummary,
  previous: AlertSnapshot | null,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  alerts.push(...evaluateL1Triggers(current, previous));
  alerts.push(...evaluateL2Triggers(current, previous));
  alerts.push(...evaluateL3Triggers(current, previous));
  alerts.push(...evaluateL4Triggers(current, previous));

  return alerts;
}

// ---------------------------------------------------------------------------
// L1 – Global Liquidity Triggers
// ---------------------------------------------------------------------------

function evaluateL1Triggers(
  summary: CapitalFlowSummary,
  prev: AlertSnapshot | null,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const liq = summary.globalLiquidity;

  // 1. Liquidity bias change (risk_on ↔ risk_off ↔ neutral)
  if (prev && summary.liquidityBias !== prev.liquidityBias) {
    const isRiskOff = summary.liquidityBias === 'risk_off';
    alerts.push({
      type: 'L1_LIQUIDITY_SHIFT',
      layer: 'L1',
      severity: isRiskOff ? 'CRITICAL' : 'WARNING',
      title: `Liquidity Bias Shifted to ${summary.liquidityBias.replace('_', ' ').toUpperCase()}`,
      message: `Global liquidity bias changed from ${prev.liquidityBias.replace('_', ' ')} to ${summary.liquidityBias.replace('_', ' ')}. ${isRiskOff ? 'Risk assets may face headwinds.' : 'Capital is flowing into risk assets.'}`,
      action: isRiskOff ? 'Review all risk asset exposure' : 'Monitor for new entry opportunities',
      metadata: { from: prev.liquidityBias, to: summary.liquidityBias },
    });
  }

  // 2. VIX spike
  if (liq.vix.value >= THRESHOLDS.VIX_EXTREME) {
    alerts.push({
      type: 'L1_VIX_SPIKE',
      layer: 'L1',
      severity: 'CRITICAL',
      title: `VIX at Extreme Fear (${liq.vix.value.toFixed(1)})`,
      message: `VIX has reached ${liq.vix.value.toFixed(1)}, indicating extreme market fear. This level historically precedes sharp moves in all asset classes.`,
      action: 'Reduce leverage and hedge positions',
      metadata: { vix: liq.vix.value, level: liq.vix.level },
    });
  } else if (liq.vix.value >= THRESHOLDS.VIX_SPIKE && prev && prev.vixLevel !== 'fear' && prev.vixLevel !== 'extreme_fear') {
    alerts.push({
      type: 'L1_VIX_SPIKE',
      layer: 'L1',
      severity: 'WARNING',
      title: `VIX Elevated (${liq.vix.value.toFixed(1)})`,
      message: `VIX crossed ${THRESHOLDS.VIX_SPIKE}, signaling rising market anxiety. Volatility may increase across markets.`,
      action: 'Tighten stop losses on active positions',
      metadata: { vix: liq.vix.value, level: liq.vix.level },
    });
  }

  // 3. DXY significant move
  if (Math.abs(liq.dxy.change7d) >= THRESHOLDS.DXY_MOVE_SIGNIFICANT) {
    const strengthening = liq.dxy.change7d > 0;
    alerts.push({
      type: 'L1_DXY_BREAKOUT',
      layer: 'L1',
      severity: 'WARNING',
      title: `USD ${strengthening ? 'Strengthening' : 'Weakening'} (${liq.dxy.change7d > 0 ? '+' : ''}${liq.dxy.change7d.toFixed(1)}% 7d)`,
      message: `Dollar Index moved ${liq.dxy.change7d > 0 ? '+' : ''}${liq.dxy.change7d.toFixed(1)}% this week. ${strengthening ? 'Crypto and commodities may face pressure.' : 'Risk assets and commodities may benefit.'}`,
      action: strengthening ? 'Review Crypto and Metals exposure' : 'Look for entry in Crypto and Metals',
      metadata: { dxy: liq.dxy.value, change7d: liq.dxy.change7d, trend: liq.dxy.trend },
    });
  }

  // 4. Fed Balance Sheet significant change
  if (Math.abs(liq.fedBalanceSheet.change30d) >= THRESHOLDS.FED_BS_CHANGE_SIGNIFICANT) {
    const expanding = liq.fedBalanceSheet.change30d > 0;
    alerts.push({
      type: 'L1_FED_BALANCE_SHEET_CHANGE',
      layer: 'L1',
      severity: 'WARNING',
      title: `Fed Balance Sheet ${expanding ? 'Expanding' : 'Contracting'} (${liq.fedBalanceSheet.change30d > 0 ? '+' : ''}${liq.fedBalanceSheet.change30d.toFixed(1)}%)`,
      message: `Fed balance sheet changed ${liq.fedBalanceSheet.change30d.toFixed(1)}% in 30 days. ${expanding ? 'Liquidity injection supports risk assets.' : 'Liquidity drain creates headwinds for risk assets.'}`,
      action: expanding ? 'Consider increasing risk exposure' : 'Reduce risk exposure',
      metadata: { value: liq.fedBalanceSheet.value, change30d: liq.fedBalanceSheet.change30d },
    });
  }

  // 5. Yield curve inversion change
  if (prev && liq.yieldCurve.inverted !== prev.yieldCurveInverted) {
    alerts.push({
      type: 'L1_YIELD_CURVE_INVERSION',
      layer: 'L1',
      severity: liq.yieldCurve.inverted ? 'CRITICAL' : 'INFO',
      title: liq.yieldCurve.inverted ? 'Yield Curve Inverted' : 'Yield Curve Normalized',
      message: liq.yieldCurve.inverted
        ? `10Y-2Y spread turned negative (${liq.yieldCurve.spread10y2y.toFixed(2)}%). Historically a recession signal.`
        : `Yield curve is no longer inverted (${liq.yieldCurve.spread10y2y.toFixed(2)}%). Recession risk may be declining.`,
      action: liq.yieldCurve.inverted ? 'Favor defensive positions (bonds, gold)' : 'Monitor for risk-on rotation',
      metadata: { spread: liq.yieldCurve.spread10y2y, inverted: liq.yieldCurve.inverted },
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// L2 – Market Flow Triggers
// ---------------------------------------------------------------------------

function evaluateL2Triggers(
  summary: CapitalFlowSummary,
  prev: AlertSnapshot | null,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  for (const market of summary.markets) {
    // 1. Phase change
    if (prev && prev.marketPhases[market.market] && prev.marketPhases[market.market] !== market.phase) {
      const oldPhase = prev.marketPhases[market.market];
      const newPhase = market.phase;
      const isDeterioration = phaseRank(newPhase) > phaseRank(oldPhase);

      alerts.push({
        type: 'L2_PHASE_CHANGE',
        layer: 'L2',
        severity: newPhase === 'exit' ? 'CRITICAL' : isDeterioration ? 'WARNING' : 'INFO',
        title: `${formatMarket(market.market)} Phase: ${oldPhase.toUpperCase()} → ${newPhase.toUpperCase()}`,
        message: `${formatMarket(market.market)} market moved from ${oldPhase.toUpperCase()} to ${newPhase.toUpperCase()} phase. ${phaseActionText(newPhase)}`,
        action: phaseActionAdvice(newPhase, market.market),
        market: market.market,
        metadata: { from: oldPhase, to: newPhase, flow7d: market.flow7d, flow30d: market.flow30d },
      });
    }

    // 2. Rotation signal change
    if (prev && prev.marketRotations[market.market]) {
      const oldRotation = prev.marketRotations[market.market];
      const newRotation = market.rotationSignal ?? 'stable';
      if (oldRotation !== newRotation && newRotation !== 'stable') {
        alerts.push({
          type: 'L2_ROTATION_DETECTED',
          layer: 'L2',
          severity: 'WARNING',
          title: `Capital ${newRotation === 'entering' ? 'Entering' : 'Exiting'} ${formatMarket(market.market)}`,
          message: `Capital rotation detected: funds are ${newRotation === 'entering' ? 'flowing into' : 'flowing out of'} ${formatMarket(market.market)} (7d flow: ${market.flow7d > 0 ? '+' : ''}${market.flow7d.toFixed(1)}%).${market.rotationTarget ? ` Target: ${formatMarket(market.rotationTarget)}.` : ''}`,
          action: newRotation === 'entering' ? `Explore ${formatMarket(market.market)} opportunities` : `Review ${formatMarket(market.market)} positions`,
          market: market.market,
          metadata: { rotation: newRotation, target: market.rotationTarget, flow7d: market.flow7d, velocity: market.flowVelocity },
        });
      }
    }
  }

  // 3. Market bias change (overall rotation — e.g. Crypto → Stocks)
  if (prev && summary.recommendation) {
    const newDir = summary.recommendation.direction;
    const newMkt = summary.recommendation.primaryMarket;
    if (prev.recommendationMarket && prev.recommendationMarket !== newMkt) {
      alerts.push({
        type: 'L2_MARKET_BIAS_CHANGE',
        layer: 'L2',
        severity: 'WARNING',
        title: `Market Preference Shifted: ${formatMarket(prev.recommendationMarket as MarketType)} → ${formatMarket(newMkt)}`,
        message: `Capital flow now favors ${formatMarket(newMkt)} over ${formatMarket(prev.recommendationMarket as MarketType)}. Direction: ${newDir}.`,
        action: `Consider reallocating to ${formatMarket(newMkt)}`,
        metadata: { fromMarket: prev.recommendationMarket, toMarket: newMkt, direction: newDir },
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// L3 – Sector Flow Triggers
// ---------------------------------------------------------------------------

function evaluateL3Triggers(
  summary: CapitalFlowSummary,
  prev: AlertSnapshot | null,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  for (const market of summary.markets) {
    if (!market.sectors || market.sectors.length === 0) continue;

    for (const sector of market.sectors) {
      // 1. Sector flow anomaly (large sudden change)
      if (Math.abs(sector.flow7d) >= THRESHOLDS.SECTOR_FLOW_ANOMALY) {
        const dropping = sector.flow7d < 0;
        alerts.push({
          type: 'L3_SECTOR_FLOW_ANOMALY',
          layer: 'L3',
          severity: Math.abs(sector.flow7d) >= 20 ? 'CRITICAL' : 'WARNING',
          title: `${sector.name} in ${formatMarket(market.market)}: ${dropping ? 'Sharp Outflow' : 'Surge'} (${sector.flow7d > 0 ? '+' : ''}${sector.flow7d.toFixed(1)}% 7d)`,
          message: `${sector.name} sector ${dropping ? 'lost' : 'gained'} ${Math.abs(sector.flow7d).toFixed(1)}% in 7 days. ${dropping ? 'Capital is moving away from this sector.' : 'Significant capital inflow detected.'}`,
          action: dropping
            ? `Avoid new ${sector.name} entries, review existing positions`
            : `${sector.name} may offer entry opportunities`,
          market: market.market,
          metadata: { sector: sector.name, flow7d: sector.flow7d, flow30d: sector.flow30d, dominance: sector.dominance },
        });
      }

      // 2. Sector dominance shift
      if (prev && prev.sectorDominance[market.market]) {
        const oldDominance = prev.sectorDominance[market.market][sector.name];
        if (oldDominance !== undefined) {
          const shift = sector.dominance - oldDominance;
          if (Math.abs(shift) >= THRESHOLDS.SECTOR_DOMINANCE_SHIFT) {
            alerts.push({
              type: 'L3_SECTOR_DOMINANCE_SHIFT',
              layer: 'L3',
              severity: 'INFO',
              title: `${sector.name} Dominance ${shift > 0 ? 'Growing' : 'Declining'} in ${formatMarket(market.market)}`,
              message: `${sector.name} dominance changed by ${shift > 0 ? '+' : ''}${shift.toFixed(1)}pp (${oldDominance.toFixed(1)}% → ${sector.dominance.toFixed(1)}%).`,
              action: shift > 0 ? `${sector.name} is gaining market share` : `${sector.name} is losing market share`,
              market: market.market,
              metadata: { sector: sector.name, from: oldDominance, to: sector.dominance, shift },
            });
          }
        }
      }
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// L4 – Asset-level Triggers
// ---------------------------------------------------------------------------

function evaluateL4Triggers(
  summary: CapitalFlowSummary,
  prev: AlertSnapshot | null,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  // 1. Recommendation direction flipped
  if (prev && summary.recommendation) {
    const newDir = summary.recommendation.direction;
    if (prev.recommendationDirection && prev.recommendationDirection !== newDir) {
      alerts.push({
        type: 'L4_RECOMMENDATION_CHANGE',
        layer: 'L4',
        severity: 'WARNING',
        title: `AI Recommendation Flipped: ${prev.recommendationDirection} → ${newDir}`,
        message: `Capital Flow AI recommendation changed from ${prev.recommendationDirection} to ${newDir} for ${formatMarket(summary.recommendation.primaryMarket)}. Confidence: ${summary.recommendation.confidence}%.`,
        action: newDir === 'BUY' ? 'Review buy opportunities' : 'Tighten stops and review risk',
        metadata: { fromDirection: prev.recommendationDirection, toDirection: newDir, market: summary.recommendation.primaryMarket, confidence: summary.recommendation.confidence },
      });
    }
  }

  // 2. Volume spike detection — check each market for sudden volume increase
  for (const market of summary.markets) {
    if (market.flowVelocity > 5 && market.flow7d > 8) {
      alerts.push({
        type: 'L4_VOLUME_SPIKE',
        layer: 'L4',
        severity: 'INFO',
        title: `High Momentum in ${formatMarket(market.market)}`,
        message: `${formatMarket(market.market)} showing strong momentum: flow velocity ${market.flowVelocity.toFixed(1)}, 7d flow ${market.flow7d > 0 ? '+' : ''}${market.flow7d.toFixed(1)}%.`,
        action: `Analyze top ${formatMarket(market.market)} assets`,
        market: market.market,
        metadata: { velocity: market.flowVelocity, flow7d: market.flow7d, flow30d: market.flow30d },
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function phaseRank(phase: Phase): number {
  switch (phase) {
    case 'early': return 0;
    case 'mid': return 1;
    case 'late': return 2;
    case 'exit': return 3;
  }
}

function formatMarket(market: MarketType): string {
  const map: Record<MarketType, string> = {
    crypto: 'Crypto',
    stocks: 'Stocks',
    bonds: 'Bonds',
    metals: 'Metals',
    bist: 'BIST',
  };
  return map[market] || market;
}

function phaseActionText(phase: Phase): string {
  switch (phase) {
    case 'early': return 'Optimal entry window is opening.';
    case 'mid': return 'Trend is established, proceed with caution.';
    case 'late': return 'Trend is maturing. Avoid new entries.';
    case 'exit': return 'Capital is leaving. Do not enter.';
  }
}

function phaseActionAdvice(phase: Phase, market: MarketType): string {
  const name = formatMarket(market);
  switch (phase) {
    case 'early': return `Look for entry opportunities in ${name}`;
    case 'mid': return `Use tight risk management for ${name} positions`;
    case 'late': return `Start taking profits on ${name} positions`;
    case 'exit': return `Close or hedge ${name} positions`;
  }
}
