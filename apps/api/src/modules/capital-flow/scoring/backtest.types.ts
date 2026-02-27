/**
 * Backtest System Types
 *
 * Types for the regime scoring backtest engine.
 */

export interface BacktestConfig {
  /** Lookback window for z-score distributions (observations) */
  lookbackWindow: number;
  /** Walk-forward train window (observations) */
  trainWindow: number;
  /** Walk-forward test window (observations) */
  testWindow: number;
  /** Initial capital in USD */
  initialCapital: number;
  /** Commission per trade (decimal, e.g. 0.001 = 0.1%) */
  commission: number;
  /** Slippage per trade (decimal) */
  slippage: number;
  /** GLRS threshold for entering long positions */
  longEntryThreshold: number;
  /** GLRS threshold for exiting long positions */
  longExitThreshold: number;
  /** GLRS threshold for entering short positions */
  shortEntryThreshold: number;
  /** GLRS threshold for exiting short positions */
  shortExitThreshold: number;
  /** Maximum position size as fraction of capital (0-1) */
  maxPositionSize: number;
}

export interface HistoricalSnapshot {
  date: string;
  /** GLRS score at this point */
  glrsScore: number;
  /** Regime classification */
  regime: string;
  /** Benchmark return for this period (%) */
  benchmarkReturn: number;
  /** Raw z-score components */
  components: Record<string, number>;
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  direction: 'long' | 'short';
  entryGLRS: number;
  exitGLRS: number;
  entryRegime: string;
  exitRegime: string;
  returnPct: number;
  pnl: number;
  holdingPeriods: number;
}

export interface BacktestMetrics {
  /** Total number of trades */
  totalTrades: number;
  /** Winning trades */
  winningTrades: number;
  /** Losing trades */
  losingTrades: number;
  /** Win rate (%) */
  winRate: number;
  /** Total return (%) */
  totalReturn: number;
  /** Annualized return (%) */
  annualizedReturn: number;
  /** Sharpe ratio (annualized, risk-free = 0) */
  sharpeRatio: number;
  /** Sortino ratio (annualized, downside deviation only) */
  sortinoRatio: number;
  /** Maximum drawdown (%) */
  maxDrawdown: number;
  /** Maximum drawdown duration (periods) */
  maxDrawdownDuration: number;
  /** Profit factor = gross profit / gross loss */
  profitFactor: number;
  /** Expectancy = avg win * win rate - avg loss * loss rate */
  expectancy: number;
  /** Average trade return (%) */
  avgTradeReturn: number;
  /** Best trade return (%) */
  bestTrade: number;
  /** Worst trade return (%) */
  worstTrade: number;
  /** Average holding period (observations) */
  avgHoldingPeriod: number;
  /** Calmar ratio = annualized return / max drawdown */
  calmarRatio: number;
}

export interface WalkForwardFold {
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  trainMetrics: BacktestMetrics;
  testMetrics: BacktestMetrics;
}

export interface BacktestResult {
  /** Configuration used */
  config: BacktestConfig;
  /** Overall metrics across all test folds */
  overallMetrics: BacktestMetrics;
  /** Per-fold walk-forward results */
  folds: WalkForwardFold[];
  /** All trades taken */
  trades: BacktestTrade[];
  /** Equity curve (cumulative return at each observation) */
  equityCurve: { date: string; equity: number; drawdown: number }[];
  /** GLRS score time series */
  glrsSeries: { date: string; score: number; regime: string }[];
  /** Timestamp of backtest run */
  timestamp: string;
}
