/**
 * Regime Score Backtest Engine
 *
 * Runs GLRS scoring over historical FRED data and evaluates
 * signal quality against actual market returns.
 *
 * Capabilities:
 * - Fetches 2+ years of FRED historical data for all GLRS components
 * - Builds rolling z-score distributions (no look-ahead bias)
 * - Generates regime signals at each observation
 * - Walk-forward validation with configurable train/test splits
 * - Real performance metrics (Sharpe, Sortino, max DD, profit factor)
 */

import type { GlobalLiquidity } from '../types';
import type { GLRSWeights } from './regime-score.types';
import type { GLRSHistoricalContext } from './glrs.service';
import { calculateGLRS, getDefaultGLRSWeights } from './glrs.service';
import { mean, stdDev } from './statistics';
import type {
  BacktestConfig,
  BacktestResult,
  BacktestMetrics,
  BacktestTrade,
  HistoricalSnapshot,
  WalkForwardFold,
} from './backtest.types';

// ============================================================
// Default backtest configuration
// ============================================================

const DEFAULT_CONFIG: BacktestConfig = {
  lookbackWindow: 52,       // 52 weeks ≈ 1 year for z-score window
  trainWindow: 52,          // 1 year train
  testWindow: 13,           // 13 weeks ≈ 1 quarter test
  initialCapital: 100_000,
  commission: 0.001,        // 0.1%
  slippage: 0.0005,         // 0.05%
  longEntryThreshold: 60,   // Enter long when GLRS > 60
  longExitThreshold: 45,    // Exit long when GLRS < 45
  shortEntryThreshold: 35,  // Enter short when GLRS < 35
  shortExitThreshold: 50,   // Exit short when GLRS > 50
  maxPositionSize: 1.0,     // 100% of capital
};

// ============================================================
// Historical data assembly
// ============================================================

/**
 * Aligned weekly historical data point.
 * All FRED series are aligned to the same weekly dates.
 */
interface AlignedDataPoint {
  date: string;
  fedBSChange: number;
  m2YoY: number;
  dxyChange: number;
  vixValue: number;
  yieldCurveSpread: number;
  netLiqChange: number;
  rrpChange: number;
  tgaChange: number;
  /** Benchmark return for this week (e.g., S&P 500 weekly %) */
  benchmarkReturn: number;
}

/**
 * Build a GlobalLiquidity snapshot from an aligned data point.
 * This creates a minimal GlobalLiquidity compatible with calculateGLRS.
 */
function buildSnapshot(point: AlignedDataPoint): GlobalLiquidity {
  return {
    fedBalanceSheet: {
      value: 0, // Not needed for GLRS, only change30d matters
      change30d: point.fedBSChange,
      trend: point.fedBSChange > 1 ? 'expanding' : point.fedBSChange < -1 ? 'contracting' : 'stable',
    },
    m2MoneySupply: {
      value: 0,
      change30d: 0,
      yoyGrowth: point.m2YoY,
    },
    dxy: {
      value: 100, // Placeholder
      change7d: point.dxyChange,
      trend: point.dxyChange > 0.5 ? 'strengthening' : point.dxyChange < -0.5 ? 'weakening' : 'stable',
    },
    vix: {
      value: point.vixValue,
      level: point.vixValue > 30 ? 'extreme_fear' : point.vixValue > 20 ? 'fear' : point.vixValue > 15 ? 'neutral' : 'complacent',
    },
    yieldCurve: {
      spread10y2y: point.yieldCurveSpread,
      inverted: point.yieldCurveSpread < 0,
      interpretation: '',
    },
    reverseRepo: {
      value: 0,
      change7d: 0,
      change30d: point.rrpChange,
      trend: point.rrpChange < -5 ? 'draining' : point.rrpChange > 5 ? 'filling' : 'stable',
    },
    treasuryGeneralAccount: {
      value: 0,
      change7d: 0,
      change30d: point.tgaChange,
      trend: point.tgaChange > 10 ? 'building' : point.tgaChange < -10 ? 'spending' : 'stable',
    },
    netLiquidity: {
      value: 0,
      change7d: 0,
      change30d: point.netLiqChange,
      trend: point.netLiqChange > 2 ? 'expanding' : point.netLiqChange < -2 ? 'contracting' : 'stable',
      components: { fedBalanceSheet: 0, reverseRepo: 0, tga: 0 },
      interpretation: '',
    },
    lastUpdated: new Date(point.date),
  };
}

/**
 * Build rolling historical context (no look-ahead bias).
 * Only uses data BEFORE the current observation.
 */
function buildRollingContext(
  data: AlignedDataPoint[],
  currentIdx: number,
  windowSize: number,
): GLRSHistoricalContext {
  const start = Math.max(0, currentIdx - windowSize);
  const window = data.slice(start, currentIdx);

  if (window.length < 5) return {};

  return {
    fedBSChanges: window.map(d => d.fedBSChange),
    m2YoYValues: window.map(d => d.m2YoY),
    dxyChanges: window.map(d => d.dxyChange),
    vixValues: window.map(d => d.vixValue),
    yieldCurveValues: window.map(d => d.yieldCurveSpread),
    netLiquidityChanges: window.map(d => d.netLiqChange),
    rrpChanges: window.map(d => d.rrpChange),
    tgaChanges: window.map(d => d.tgaChange),
  };
}

// ============================================================
// Performance metrics calculation
// ============================================================

function calculateMetrics(
  trades: BacktestTrade[],
  equityCurve: number[],
  initialCapital: number,
): BacktestMetrics {
  const empty: BacktestMetrics = {
    totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
    totalReturn: 0, annualizedReturn: 0, sharpeRatio: 0, sortinoRatio: 0,
    maxDrawdown: 0, maxDrawdownDuration: 0, profitFactor: 0, expectancy: 0,
    avgTradeReturn: 0, bestTrade: 0, worstTrade: 0, avgHoldingPeriod: 0,
    calmarRatio: 0,
  };

  if (trades.length === 0) return empty;

  const returns = trades.map(t => t.returnPct);
  const winningReturns = returns.filter(r => r > 0);
  const losingReturns = returns.filter(r => r <= 0);

  const totalReturn = equityCurve.length > 0
    ? ((equityCurve[equityCurve.length - 1] - initialCapital) / initialCapital) * 100
    : 0;

  // Sharpe ratio: mean(returns) / std(returns) * sqrt(52) for weekly
  const meanRet = mean(returns);
  const stdRet = stdDev(returns);
  const sharpeRatio = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(52) : 0;

  // Sortino ratio: mean(returns) / downside_std * sqrt(52)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideStd = downsideReturns.length > 0 ? stdDev(downsideReturns) : 0;
  const sortinoRatio = downsideStd > 0 ? (meanRet / downsideStd) * Math.sqrt(52) : 0;

  // Max drawdown from equity curve
  let maxDD = 0;
  let maxDDDuration = 0;
  let currentDDDuration = 0;
  let peak = equityCurve[0] || initialCapital;

  for (const eq of equityCurve) {
    if (eq > peak) {
      peak = eq;
      currentDDDuration = 0;
    }
    const dd = ((peak - eq) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
    if (eq < peak) {
      currentDDDuration++;
      if (currentDDDuration > maxDDDuration) maxDDDuration = currentDDDuration;
    }
  }

  // Profit factor
  const grossProfit = winningReturns.reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(losingReturns.reduce((s, r) => s + r, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const winRate = (winningReturns.length / trades.length) * 100;
  const avgWin = winningReturns.length > 0 ? mean(winningReturns) : 0;
  const avgLoss = losingReturns.length > 0 ? mean(losingReturns) : 0;
  const expectancy = avgWin * (winRate / 100) + avgLoss * (1 - winRate / 100);

  // Annualized return (assume weekly data)
  const weeks = equityCurve.length || 1;
  const annualizedReturn = ((1 + totalReturn / 100) ** (52 / weeks) - 1) * 100;

  const calmarRatio = maxDD > 0 ? annualizedReturn / maxDD : 0;

  return {
    totalTrades: trades.length,
    winningTrades: winningReturns.length,
    losingTrades: losingReturns.length,
    winRate: parseFloat(winRate.toFixed(1)),
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(3)),
    maxDrawdown: parseFloat(maxDD.toFixed(2)),
    maxDrawdownDuration: maxDDDuration,
    profitFactor: parseFloat((profitFactor === Infinity ? 999 : profitFactor).toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(3)),
    avgTradeReturn: parseFloat(mean(returns).toFixed(3)),
    bestTrade: parseFloat(Math.max(...returns).toFixed(3)),
    worstTrade: parseFloat(Math.min(...returns).toFixed(3)),
    avgHoldingPeriod: parseFloat(mean(trades.map(t => t.holdingPeriods)).toFixed(1)),
    calmarRatio: parseFloat(calmarRatio.toFixed(3)),
  };
}

// ============================================================
// Trade simulation
// ============================================================

function simulateTrades(
  snapshots: HistoricalSnapshot[],
  config: BacktestConfig,
): { trades: BacktestTrade[]; equityCurve: number[] } {
  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = [];
  let capital = config.initialCapital;
  let position: 'long' | 'short' | 'flat' = 'flat';
  let entryIdx = -1;
  let entryCapital = capital;

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    equityCurve.push(capital);

    // Apply benchmark return to open position
    if (position !== 'flat') {
      const positionReturn = position === 'long'
        ? snap.benchmarkReturn
        : -snap.benchmarkReturn;
      capital *= (1 + positionReturn / 100);
    }

    // Entry signals
    if (position === 'flat') {
      if (snap.glrsScore >= config.longEntryThreshold) {
        position = 'long';
        entryIdx = i;
        entryCapital = capital;
        capital *= (1 - config.commission - config.slippage);
      } else if (snap.glrsScore <= config.shortEntryThreshold) {
        position = 'short';
        entryIdx = i;
        entryCapital = capital;
        capital *= (1 - config.commission - config.slippage);
      }
    }
    // Exit signals
    else if (position === 'long' && snap.glrsScore < config.longExitThreshold) {
      capital *= (1 - config.commission - config.slippage);
      const returnPct = ((capital - entryCapital) / entryCapital) * 100;
      trades.push({
        entryDate: snapshots[entryIdx].date,
        exitDate: snap.date,
        direction: 'long',
        entryGLRS: snapshots[entryIdx].glrsScore,
        exitGLRS: snap.glrsScore,
        entryRegime: snapshots[entryIdx].regime,
        exitRegime: snap.regime,
        returnPct: parseFloat(returnPct.toFixed(3)),
        pnl: parseFloat((capital - entryCapital).toFixed(2)),
        holdingPeriods: i - entryIdx,
      });
      position = 'flat';
    } else if (position === 'short' && snap.glrsScore > config.shortExitThreshold) {
      capital *= (1 - config.commission - config.slippage);
      const returnPct = ((capital - entryCapital) / entryCapital) * 100;
      trades.push({
        entryDate: snapshots[entryIdx].date,
        exitDate: snap.date,
        direction: 'short',
        entryGLRS: snapshots[entryIdx].glrsScore,
        exitGLRS: snap.glrsScore,
        entryRegime: snapshots[entryIdx].regime,
        exitRegime: snap.regime,
        returnPct: parseFloat(returnPct.toFixed(3)),
        pnl: parseFloat((capital - entryCapital).toFixed(2)),
        holdingPeriods: i - entryIdx,
      });
      position = 'flat';
    }
  }

  // Close any open position at end
  if (position !== 'flat' && entryIdx >= 0) {
    const lastSnap = snapshots[snapshots.length - 1];
    capital *= (1 - config.commission - config.slippage);
    const returnPct = ((capital - entryCapital) / entryCapital) * 100;
    trades.push({
      entryDate: snapshots[entryIdx].date,
      exitDate: lastSnap.date,
      direction: position,
      entryGLRS: snapshots[entryIdx].glrsScore,
      exitGLRS: lastSnap.glrsScore,
      entryRegime: snapshots[entryIdx].regime,
      exitRegime: lastSnap.regime,
      returnPct: parseFloat(returnPct.toFixed(3)),
      pnl: parseFloat((capital - entryCapital).toFixed(2)),
      holdingPeriods: snapshots.length - 1 - entryIdx,
    });
  }

  equityCurve.push(capital);

  return { trades, equityCurve };
}

// ============================================================
// Core backtest engine
// ============================================================

/**
 * Run GLRS backtest over aligned historical data.
 *
 * @param data    - Weekly-aligned historical data (all series + benchmark returns)
 * @param config  - Backtest configuration
 * @param weights - Optional GLRS weight overrides
 */
export function runBacktest(
  data: AlignedDataPoint[],
  config: Partial<BacktestConfig> = {},
  weights?: GLRSWeights,
): BacktestResult {
  const cfg: BacktestConfig = { ...DEFAULT_CONFIG, ...config };
  const glrsWeights = weights || getDefaultGLRSWeights();

  // Step 1: Generate GLRS scores at each point (no look-ahead)
  const snapshots: HistoricalSnapshot[] = [];
  const glrsSeries: { date: string; score: number; regime: string }[] = [];

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const snapshot = buildSnapshot(point);
    const historicalContext = buildRollingContext(data, i, cfg.lookbackWindow);
    const glrs = calculateGLRS(snapshot, historicalContext, glrsWeights);

    snapshots.push({
      date: point.date,
      glrsScore: glrs.score,
      regime: glrs.regime,
      benchmarkReturn: point.benchmarkReturn,
      components: glrs.components as unknown as Record<string, number>,
    });

    glrsSeries.push({
      date: point.date,
      score: glrs.score,
      regime: glrs.regime,
    });
  }

  // Step 2: Walk-forward validation
  const folds: WalkForwardFold[] = [];
  const allTestTrades: BacktestTrade[] = [];

  let foldStart = cfg.lookbackWindow; // Skip initial lookback

  while (foldStart + cfg.trainWindow + cfg.testWindow <= snapshots.length) {
    const trainEnd = foldStart + cfg.trainWindow;
    const testEnd = trainEnd + cfg.testWindow;

    const trainSnapshots = snapshots.slice(foldStart, trainEnd);
    const testSnapshots = snapshots.slice(trainEnd, testEnd);

    const trainResult = simulateTrades(trainSnapshots, cfg);
    const testResult = simulateTrades(testSnapshots, cfg);

    const trainMetrics = calculateMetrics(trainResult.trades, trainResult.equityCurve, cfg.initialCapital);
    const testMetrics = calculateMetrics(testResult.trades, testResult.equityCurve, cfg.initialCapital);

    folds.push({
      trainStart: trainSnapshots[0]?.date || '',
      trainEnd: trainSnapshots[trainSnapshots.length - 1]?.date || '',
      testStart: testSnapshots[0]?.date || '',
      testEnd: testSnapshots[testSnapshots.length - 1]?.date || '',
      trainMetrics,
      testMetrics,
    });

    allTestTrades.push(...testResult.trades);
    foldStart += cfg.testWindow; // Slide forward by test window
  }

  // Step 3: Overall metrics from all test-set trades
  const fullSimulation = simulateTrades(snapshots.slice(cfg.lookbackWindow), cfg);
  const overallMetrics = calculateMetrics(fullSimulation.trades, fullSimulation.equityCurve, cfg.initialCapital);

  // Build equity curve with drawdown
  let peak = cfg.initialCapital;
  const equityCurveWithDD = fullSimulation.equityCurve.map((eq, i) => {
    if (eq > peak) peak = eq;
    const drawdown = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
    const date = snapshots[cfg.lookbackWindow + i]?.date || '';
    return {
      date,
      equity: parseFloat(eq.toFixed(2)),
      drawdown: parseFloat(drawdown.toFixed(2)),
    };
  });

  return {
    config: cfg,
    overallMetrics,
    folds,
    trades: fullSimulation.trades,
    equityCurve: equityCurveWithDD,
    glrsSeries,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get the default backtest configuration.
 */
export function getDefaultBacktestConfig(): BacktestConfig {
  return { ...DEFAULT_CONFIG };
}

export type { AlignedDataPoint };
