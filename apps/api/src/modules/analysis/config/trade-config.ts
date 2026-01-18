/**
 * TradePath 3D Analysis Configuration Matrix
 * ==========================================
 *
 * This configuration defines the complete analysis matrix:
 * - Trade Type (Scalping, Day Trade, Swing Trade)
 * - Analysis Step (1-7: Market Pulse → Verdict)
 * - Indicators per step
 * - Data requirements (timeframes, candle counts)
 *
 * Compatible with TECHNICAL_SPECIFICATION.md
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TradeType = 'scalping' | 'dayTrade' | 'swing' | 'position';

/**
 * Map timeframe interval to appropriate trade type
 * Used when frontend sends interval instead of tradeType
 */
export function getTradeTypeFromInterval(interval: string): TradeType {
  switch (interval) {
    case '1m':
    case '5m':
    case '15m':
      return 'scalping';
    case '30m':
    case '1h':
      return 'dayTrade';
    case '4h':
      return 'swing';
    case '1d':
    case '1D':
    case '1w':
    case '1W':
      return 'position'; // Position uses swing config but saves 1d interval
    default:
      return 'swing'; // Default to swing for unknown intervals
  }
}

export type AnalysisStep =
  | 'marketPulse'    // Step 1: Market Overview
  | 'assetScan'      // Step 2: Asset Analysis
  | 'safetyCheck'    // Step 3: Risk Assessment
  | 'timing'         // Step 4: Entry/Exit Timing
  | 'tradePlan'      // Step 5: Trade Planning
  | 'trapCheck'      // Step 6: Trap Detection
  | 'verdict';       // Step 7: Final Decision

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export type IndicatorCategory = 'trend' | 'momentum' | 'volatility' | 'volume' | 'pattern' | 'advanced';

export interface IndicatorConfig {
  name: string;
  category: IndicatorCategory;
  params?: Record<string, number>;
  weight: number; // 0-1, importance in scoring
}

export interface TimeframeConfig {
  timeframe: Timeframe;
  candleCount: number;
  priority: 'primary' | 'secondary' | 'confirmation';
}

export interface StepConfig {
  step: AnalysisStep;
  stepNumber: number;
  name: string;
  description: string;
  timeframes: TimeframeConfig[];
  indicators: IndicatorConfig[];
  aiPromptFocus: string;
}

export interface TradeTypeConfig {
  type: TradeType;
  name: string;
  description: string;
  holdingPeriod: string;
  riskTolerance: 'high' | 'medium' | 'low';
  steps: StepConfig[];
  creditCost: number;
}

// ============================================================================
// INDICATOR DEFINITIONS
// ============================================================================

export const INDICATORS = {
  // TREND INDICATORS
  trend: {
    EMA: (period: number): IndicatorConfig => ({
      name: `EMA_${period}`,
      category: 'trend',
      params: { period },
      weight: 0.8
    }),
    SMA: (period: number): IndicatorConfig => ({
      name: `SMA_${period}`,
      category: 'trend',
      params: { period },
      weight: 0.6
    }),
    MACD: (fast = 12, slow = 26, signal = 9): IndicatorConfig => ({
      name: 'MACD',
      category: 'trend',
      params: { fast, slow, signal },
      weight: 0.85
    }),
    ADX: (period = 14): IndicatorConfig => ({
      name: 'ADX',
      category: 'trend',
      params: { period },
      weight: 0.9
    }),
    SUPERTREND: (period = 10, multiplier = 3): IndicatorConfig => ({
      name: 'SUPERTREND',
      category: 'trend',
      params: { period, multiplier },
      weight: 0.85
    }),
    ICHIMOKU: (): IndicatorConfig => ({
      name: 'ICHIMOKU',
      category: 'trend',
      params: { tenkan: 9, kijun: 26, senkou: 52 },
      weight: 0.9
    }),
    PSAR: (af = 0.02, maxAf = 0.2): IndicatorConfig => ({
      name: 'PSAR',
      category: 'trend',
      params: { af, maxAf },
      weight: 0.75
    }),
    AROON: (period = 25): IndicatorConfig => ({
      name: 'AROON',
      category: 'trend',
      params: { period },
      weight: 0.7
    }),
    VWMA: (period = 20): IndicatorConfig => ({
      name: 'VWMA',
      category: 'trend',
      params: { period },
      weight: 0.65
    }),
  },

  // MOMENTUM INDICATORS
  momentum: {
    RSI: (period = 14): IndicatorConfig => ({
      name: 'RSI',
      category: 'momentum',
      params: { period },
      weight: 0.85
    }),
    STOCHASTIC: (k = 14, d = 3, smooth = 3): IndicatorConfig => ({
      name: 'STOCHASTIC',
      category: 'momentum',
      params: { k, d, smooth },
      weight: 0.8
    }),
    STOCH_RSI: (period = 14, k = 3, d = 3): IndicatorConfig => ({
      name: 'STOCH_RSI',
      category: 'momentum',
      params: { period, k, d },
      weight: 0.85
    }),
    CCI: (period = 20): IndicatorConfig => ({
      name: 'CCI',
      category: 'momentum',
      params: { period },
      weight: 0.75
    }),
    WILLIAMS_R: (period = 14): IndicatorConfig => ({
      name: 'WILLIAMS_R',
      category: 'momentum',
      params: { period },
      weight: 0.7
    }),
    ROC: (period = 12): IndicatorConfig => ({
      name: 'ROC',
      category: 'momentum',
      params: { period },
      weight: 0.65
    }),
    MFI: (period = 14): IndicatorConfig => ({
      name: 'MFI',
      category: 'momentum',
      params: { period },
      weight: 0.8
    }),
    ULTIMATE: (short = 7, medium = 14, long = 28): IndicatorConfig => ({
      name: 'ULTIMATE',
      category: 'momentum',
      params: { short, medium, long },
      weight: 0.7
    }),
    TSI: (long = 25, short = 13, signal = 13): IndicatorConfig => ({
      name: 'TSI',
      category: 'momentum',
      params: { long, short, signal },
      weight: 0.75
    }),
  },

  // VOLATILITY INDICATORS
  volatility: {
    BOLLINGER: (period = 20, std = 2): IndicatorConfig => ({
      name: 'BOLLINGER',
      category: 'volatility',
      params: { period, std },
      weight: 0.85
    }),
    ATR: (period = 14): IndicatorConfig => ({
      name: 'ATR',
      category: 'volatility',
      params: { period },
      weight: 0.9
    }),
    KELTNER: (period = 20, atr = 10, multiplier = 2): IndicatorConfig => ({
      name: 'KELTNER',
      category: 'volatility',
      params: { period, atr, multiplier },
      weight: 0.75
    }),
    DONCHIAN: (period = 20): IndicatorConfig => ({
      name: 'DONCHIAN',
      category: 'volatility',
      params: { period },
      weight: 0.7
    }),
    HISTORICAL_VOLATILITY: (period = 21): IndicatorConfig => ({
      name: 'HISTORICAL_VOLATILITY',
      category: 'volatility',
      params: { period },
      weight: 0.8
    }),
    SQUEEZE: (): IndicatorConfig => ({
      name: 'SQUEEZE',
      category: 'volatility',
      params: { bbPeriod: 20, bbStd: 2, kcPeriod: 20, kcMult: 1.5 },
      weight: 0.85
    }),
  },

  // VOLUME INDICATORS
  volume: {
    OBV: (): IndicatorConfig => ({
      name: 'OBV',
      category: 'volume',
      params: {},
      weight: 0.8
    }),
    VWAP: (): IndicatorConfig => ({
      name: 'VWAP',
      category: 'volume',
      params: {},
      weight: 0.85
    }),
    AD: (): IndicatorConfig => ({
      name: 'AD',
      category: 'volume',
      params: {},
      weight: 0.75
    }),
    CMF: (period = 20): IndicatorConfig => ({
      name: 'CMF',
      category: 'volume',
      params: { period },
      weight: 0.8
    }),
    FORCE_INDEX: (period = 13): IndicatorConfig => ({
      name: 'FORCE_INDEX',
      category: 'volume',
      params: { period },
      weight: 0.7
    }),
    EOM: (period = 14): IndicatorConfig => ({
      name: 'EOM',
      category: 'volume',
      params: { period },
      weight: 0.65
    }),
    PVT: (): IndicatorConfig => ({
      name: 'PVT',
      category: 'volume',
      params: {},
      weight: 0.7
    }),
    RELATIVE_VOLUME: (period = 20): IndicatorConfig => ({
      name: 'RELATIVE_VOLUME',
      category: 'volume',
      params: { period },
      weight: 0.75
    }),
    VOLUME_SPIKE: (threshold = 2): IndicatorConfig => ({
      name: 'VOLUME_SPIKE',
      category: 'volume',
      params: { threshold },
      weight: 0.8
    }),
  },

  // ADVANCED INDICATORS
  advanced: {
    ORDER_FLOW_IMBALANCE: (): IndicatorConfig => ({
      name: 'ORDER_FLOW_IMBALANCE',
      category: 'advanced',
      params: {},
      weight: 0.85
    }),
    BID_ASK_SPREAD: (): IndicatorConfig => ({
      name: 'BID_ASK_SPREAD',
      category: 'advanced',
      params: {},
      weight: 0.8
    }),
    DEPTH_RATIO: (): IndicatorConfig => ({
      name: 'DEPTH_RATIO',
      category: 'advanced',
      params: {},
      weight: 0.75
    }),
    SLIPPAGE_ESTIMATE: (): IndicatorConfig => ({
      name: 'SLIPPAGE_ESTIMATE',
      category: 'advanced',
      params: {},
      weight: 0.9
    }),
    MARKET_IMPACT: (): IndicatorConfig => ({
      name: 'MARKET_IMPACT',
      category: 'advanced',
      params: {},
      weight: 0.85
    }),
    LIQUIDITY_SCORE: (): IndicatorConfig => ({
      name: 'LIQUIDITY_SCORE',
      category: 'advanced',
      params: {},
      weight: 0.9
    }),
    SPOOFING_DETECTION: (): IndicatorConfig => ({
      name: 'SPOOFING_DETECTION',
      category: 'advanced',
      params: {},
      weight: 0.8
    }),
    WHALE_ACTIVITY: (): IndicatorConfig => ({
      name: 'WHALE_ACTIVITY',
      category: 'advanced',
      params: {},
      weight: 0.85
    }),
  },
} as const;

// ============================================================================
// SCALPING CONFIGURATION (1m - 15m timeframes)
// ============================================================================

const SCALPING_CONFIG: TradeTypeConfig = {
  type: 'scalping',
  name: 'Scalping',
  description: 'Ultra short-term trades, typically 1-15 minutes holding period',
  holdingPeriod: '1-15 minutes',
  riskTolerance: 'high',
  creditCost: 3,
  steps: [
    // Step 1: Market Pulse
    {
      step: 'marketPulse',
      stepNumber: 1,
      name: 'Market Pulse',
      description: 'Quick market sentiment and volatility check',
      timeframes: [
        { timeframe: '1m', candleCount: 60, priority: 'primary' },
        { timeframe: '5m', candleCount: 30, priority: 'secondary' },
        { timeframe: '15m', candleCount: 20, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.volatility.ATR(14),
        INDICATORS.volatility.BOLLINGER(20, 2),
        INDICATORS.volume.RELATIVE_VOLUME(20),
        INDICATORS.trend.EMA(9),
        INDICATORS.trend.EMA(21),
      ],
      aiPromptFocus: 'Analyze immediate market conditions, volatility state, and short-term momentum',
    },
    // Step 2: Asset Scan
    {
      step: 'assetScan',
      stepNumber: 2,
      name: 'Asset Scan',
      description: 'Quick asset health and liquidity check',
      timeframes: [
        { timeframe: '1m', candleCount: 100, priority: 'primary' },
        { timeframe: '5m', candleCount: 50, priority: 'secondary' },
      ],
      indicators: [
        INDICATORS.volume.VWAP(),
        INDICATORS.advanced.LIQUIDITY_SCORE(),
        INDICATORS.advanced.BID_ASK_SPREAD(),
        INDICATORS.volume.VOLUME_SPIKE(2),
        INDICATORS.advanced.SLIPPAGE_ESTIMATE(),
      ],
      aiPromptFocus: 'Evaluate asset liquidity, spread, and execution feasibility for scalping',
    },
    // Step 3: Safety Check
    {
      step: 'safetyCheck',
      stepNumber: 3,
      name: 'Safety Check',
      description: 'Risk and manipulation detection',
      timeframes: [
        { timeframe: '1m', candleCount: 60, priority: 'primary' },
        { timeframe: '5m', candleCount: 30, priority: 'secondary' },
      ],
      indicators: [
        INDICATORS.advanced.SPOOFING_DETECTION(),
        INDICATORS.advanced.ORDER_FLOW_IMBALANCE(),
        INDICATORS.volatility.SQUEEZE(),
        INDICATORS.advanced.WHALE_ACTIVITY(),
        INDICATORS.volume.CMF(20),
      ],
      aiPromptFocus: 'Detect potential manipulation, unusual order flow, and hidden risks',
    },
    // Step 4: Timing
    {
      step: 'timing',
      stepNumber: 4,
      name: 'Timing',
      description: 'Precise entry/exit timing',
      timeframes: [
        { timeframe: '1m', candleCount: 60, priority: 'primary' },
        { timeframe: '5m', candleCount: 20, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.momentum.RSI(7),
        INDICATORS.momentum.STOCH_RSI(14, 3, 3),
        INDICATORS.trend.MACD(12, 26, 9),
        INDICATORS.trend.SUPERTREND(7, 2),
        INDICATORS.volatility.KELTNER(20, 10, 1.5),
      ],
      aiPromptFocus: 'Identify optimal entry point with tight stop-loss for scalping',
    },
    // Step 5: Trade Plan
    {
      step: 'tradePlan',
      stepNumber: 5,
      name: 'Trade Plan',
      description: 'Entry, SL, TP calculation',
      timeframes: [
        { timeframe: '1m', candleCount: 30, priority: 'primary' },
        { timeframe: '5m', candleCount: 15, priority: 'secondary' },
      ],
      indicators: [
        INDICATORS.volatility.ATR(7),
        INDICATORS.trend.PSAR(0.02, 0.2),
        INDICATORS.volatility.BOLLINGER(20, 2),
        INDICATORS.volume.VWAP(),
      ],
      aiPromptFocus: 'Calculate tight entry, stop-loss (0.5-1% range), and take-profit levels',
    },
    // Step 6: Trap Check
    {
      step: 'trapCheck',
      stepNumber: 6,
      name: 'Trap Check',
      description: 'False breakout and trap detection',
      timeframes: [
        { timeframe: '1m', candleCount: 30, priority: 'primary' },
        { timeframe: '5m', candleCount: 15, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.volume.OBV(),
        INDICATORS.advanced.ORDER_FLOW_IMBALANCE(),
        INDICATORS.momentum.MFI(14),
        INDICATORS.volume.FORCE_INDEX(13),
      ],
      aiPromptFocus: 'Verify volume confirms price action, detect potential bull/bear traps',
    },
    // Step 7: Verdict
    {
      step: 'verdict',
      stepNumber: 7,
      name: 'Verdict',
      description: 'Final go/no-go decision',
      timeframes: [
        { timeframe: '1m', candleCount: 10, priority: 'primary' },
      ],
      indicators: [
        INDICATORS.trend.ADX(14),
        INDICATORS.momentum.RSI(7),
        INDICATORS.volatility.ATR(7),
      ],
      aiPromptFocus: 'Make final trade decision with confidence score (0-100)',
    },
  ],
};

// ============================================================================
// DAY TRADE CONFIGURATION (15m - 4h timeframes)
// ============================================================================

const DAY_TRADE_CONFIG: TradeTypeConfig = {
  type: 'dayTrade',
  name: 'Day Trade',
  description: 'Intraday trades, typically 1-8 hours holding period',
  holdingPeriod: '1-8 hours',
  riskTolerance: 'medium',
  creditCost: 2,
  steps: [
    // Step 1: Market Pulse
    {
      step: 'marketPulse',
      stepNumber: 1,
      name: 'Market Pulse',
      description: 'Market trend and sentiment analysis',
      timeframes: [
        { timeframe: '15m', candleCount: 96, priority: 'primary' },    // 24 hours
        { timeframe: '1h', candleCount: 48, priority: 'secondary' },   // 48 hours
        { timeframe: '4h', candleCount: 30, priority: 'confirmation' }, // 5 days
      ],
      indicators: [
        INDICATORS.trend.ICHIMOKU(),
        INDICATORS.trend.ADX(14),
        INDICATORS.trend.EMA(20),
        INDICATORS.trend.EMA(50),
        INDICATORS.trend.EMA(200),
        INDICATORS.volatility.BOLLINGER(20, 2),
      ],
      aiPromptFocus: 'Analyze daily market structure, trend strength, and key levels',
    },
    // Step 2: Asset Scan
    {
      step: 'assetScan',
      stepNumber: 2,
      name: 'Asset Scan',
      description: 'Asset fundamentals and technical health',
      timeframes: [
        { timeframe: '1h', candleCount: 72, priority: 'primary' },     // 3 days
        { timeframe: '4h', candleCount: 42, priority: 'secondary' },   // 7 days
      ],
      indicators: [
        INDICATORS.volume.VWAP(),
        INDICATORS.volume.OBV(),
        INDICATORS.advanced.LIQUIDITY_SCORE(),
        INDICATORS.trend.AROON(25),
        INDICATORS.volume.CMF(20),
        INDICATORS.volume.PVT(),
      ],
      aiPromptFocus: 'Evaluate asset strength, accumulation/distribution, and volume profile',
    },
    // Step 3: Safety Check
    {
      step: 'safetyCheck',
      stepNumber: 3,
      name: 'Safety Check',
      description: 'Risk assessment and warning detection',
      timeframes: [
        { timeframe: '15m', candleCount: 48, priority: 'primary' },
        { timeframe: '1h', candleCount: 24, priority: 'secondary' },
        { timeframe: '4h', candleCount: 12, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.volatility.HISTORICAL_VOLATILITY(21),
        INDICATORS.volatility.ATR(14),
        INDICATORS.advanced.WHALE_ACTIVITY(),
        INDICATORS.momentum.MFI(14),
        INDICATORS.volatility.SQUEEZE(),
        INDICATORS.advanced.MARKET_IMPACT(),
      ],
      aiPromptFocus: 'Assess volatility risks, whale movements, and potential market impacts',
    },
    // Step 4: Timing
    {
      step: 'timing',
      stepNumber: 4,
      name: 'Timing',
      description: 'Optimal entry/exit timing',
      timeframes: [
        { timeframe: '15m', candleCount: 48, priority: 'primary' },
        { timeframe: '1h', candleCount: 24, priority: 'secondary' },
      ],
      indicators: [
        INDICATORS.momentum.RSI(14),
        INDICATORS.momentum.STOCHASTIC(14, 3, 3),
        INDICATORS.trend.MACD(12, 26, 9),
        INDICATORS.trend.SUPERTREND(10, 3),
        INDICATORS.momentum.CCI(20),
        INDICATORS.momentum.WILLIAMS_R(14),
      ],
      aiPromptFocus: 'Identify optimal intraday entry with momentum confirmation',
    },
    // Step 5: Trade Plan
    {
      step: 'tradePlan',
      stepNumber: 5,
      name: 'Trade Plan',
      description: 'Complete trade setup with risk management',
      timeframes: [
        { timeframe: '15m', candleCount: 24, priority: 'primary' },
        { timeframe: '1h', candleCount: 12, priority: 'secondary' },
      ],
      indicators: [
        INDICATORS.volatility.ATR(14),
        INDICATORS.trend.PSAR(0.02, 0.2),
        INDICATORS.volatility.KELTNER(20, 10, 2),
        INDICATORS.volatility.DONCHIAN(20),
        INDICATORS.volume.VWAP(),
      ],
      aiPromptFocus: 'Calculate entry, stop-loss (1-2% range), and multiple take-profit targets',
    },
    // Step 6: Trap Check
    {
      step: 'trapCheck',
      stepNumber: 6,
      name: 'Trap Check',
      description: 'Divergence and trap detection',
      timeframes: [
        { timeframe: '15m', candleCount: 24, priority: 'primary' },
        { timeframe: '1h', candleCount: 12, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.volume.OBV(),
        INDICATORS.momentum.RSI(14),
        INDICATORS.trend.MACD(12, 26, 9),
        INDICATORS.volume.AD(),
        INDICATORS.advanced.ORDER_FLOW_IMBALANCE(),
      ],
      aiPromptFocus: 'Detect RSI/MACD divergences, volume divergences, and potential traps',
    },
    // Step 7: Verdict
    {
      step: 'verdict',
      stepNumber: 7,
      name: 'Verdict',
      description: 'Final trade decision with confidence',
      timeframes: [
        { timeframe: '15m', candleCount: 12, priority: 'primary' },
        { timeframe: '1h', candleCount: 6, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.trend.ADX(14),
        INDICATORS.momentum.RSI(14),
        INDICATORS.volatility.ATR(14),
        INDICATORS.trend.SUPERTREND(10, 3),
      ],
      aiPromptFocus: 'Consolidate all signals into final trade recommendation with score',
    },
  ],
};

// ============================================================================
// SWING TRADE CONFIGURATION (4h - 1w timeframes)
// ============================================================================

const SWING_CONFIG: TradeTypeConfig = {
  type: 'swing',
  name: 'Swing Trade',
  description: 'Multi-day trades, typically 2-14 days holding period',
  holdingPeriod: '2-14 days',
  riskTolerance: 'low',
  creditCost: 1,
  steps: [
    // Step 1: Market Pulse
    {
      step: 'marketPulse',
      stepNumber: 1,
      name: 'Market Pulse',
      description: 'Macro market analysis and trend identification',
      timeframes: [
        { timeframe: '4h', candleCount: 90, priority: 'primary' },     // 15 days
        { timeframe: '1d', candleCount: 60, priority: 'secondary' },   // 60 days
        { timeframe: '1w', candleCount: 20, priority: 'confirmation' }, // 20 weeks
      ],
      indicators: [
        INDICATORS.trend.ICHIMOKU(),
        INDICATORS.trend.ADX(14),
        INDICATORS.trend.EMA(50),
        INDICATORS.trend.EMA(200),
        INDICATORS.trend.SMA(50),
        INDICATORS.trend.SMA(200),
        INDICATORS.volatility.BOLLINGER(20, 2),
      ],
      aiPromptFocus: 'Analyze long-term trend, market cycle, and major support/resistance',
    },
    // Step 2: Asset Scan
    {
      step: 'assetScan',
      stepNumber: 2,
      name: 'Asset Scan',
      description: 'Deep asset analysis and accumulation detection',
      timeframes: [
        { timeframe: '1d', candleCount: 90, priority: 'primary' },     // 90 days
        { timeframe: '1w', candleCount: 26, priority: 'secondary' },   // 6 months
      ],
      indicators: [
        INDICATORS.volume.OBV(),
        INDICATORS.volume.AD(),
        INDICATORS.volume.CMF(20),
        INDICATORS.volume.PVT(),
        INDICATORS.trend.AROON(25),
        INDICATORS.advanced.WHALE_ACTIVITY(),
        INDICATORS.trend.VWMA(20),
      ],
      aiPromptFocus: 'Identify smart money accumulation/distribution and long-term volume trends',
    },
    // Step 3: Safety Check
    {
      step: 'safetyCheck',
      stepNumber: 3,
      name: 'Safety Check',
      description: 'Comprehensive risk and volatility assessment',
      timeframes: [
        { timeframe: '4h', candleCount: 42, priority: 'primary' },     // 7 days
        { timeframe: '1d', candleCount: 30, priority: 'secondary' },   // 30 days
        { timeframe: '1w', candleCount: 12, priority: 'confirmation' }, // 12 weeks
      ],
      indicators: [
        INDICATORS.volatility.HISTORICAL_VOLATILITY(21),
        INDICATORS.volatility.ATR(14),
        INDICATORS.volatility.BOLLINGER(20, 2),
        INDICATORS.advanced.LIQUIDITY_SCORE(),
        INDICATORS.momentum.MFI(14),
        INDICATORS.advanced.MARKET_IMPACT(),
      ],
      aiPromptFocus: 'Evaluate long-term volatility, drawdown risk, and position sizing',
    },
    // Step 4: Timing
    {
      step: 'timing',
      stepNumber: 4,
      name: 'Timing',
      description: 'Swing entry timing and trend confirmation',
      timeframes: [
        { timeframe: '4h', candleCount: 60, priority: 'primary' },
        { timeframe: '1d', candleCount: 30, priority: 'secondary' },
      ],
      indicators: [
        INDICATORS.momentum.RSI(14),
        INDICATORS.momentum.STOCHASTIC(14, 3, 3),
        INDICATORS.momentum.STOCH_RSI(14, 3, 3),
        INDICATORS.trend.MACD(12, 26, 9),
        INDICATORS.trend.SUPERTREND(10, 3),
        INDICATORS.momentum.TSI(25, 13, 13),
        INDICATORS.momentum.ULTIMATE(7, 14, 28),
      ],
      aiPromptFocus: 'Find optimal swing entry at support/resistance with trend confirmation',
    },
    // Step 5: Trade Plan
    {
      step: 'tradePlan',
      stepNumber: 5,
      name: 'Trade Plan',
      description: 'Multi-target trade setup with position management',
      timeframes: [
        { timeframe: '4h', candleCount: 30, priority: 'primary' },
        { timeframe: '1d', candleCount: 14, priority: 'secondary' },
      ],
      indicators: [
        INDICATORS.volatility.ATR(14),
        INDICATORS.trend.PSAR(0.02, 0.2),
        INDICATORS.volatility.DONCHIAN(20),
        INDICATORS.trend.ICHIMOKU(),
        INDICATORS.volatility.KELTNER(20, 10, 2),
      ],
      aiPromptFocus: 'Design swing trade with wider stops (2-5%), multiple TPs, and trailing strategy',
    },
    // Step 6: Trap Check
    {
      step: 'trapCheck',
      stepNumber: 6,
      name: 'Trap Check',
      description: 'Major divergence and trend reversal detection',
      timeframes: [
        { timeframe: '4h', candleCount: 30, priority: 'primary' },
        { timeframe: '1d', candleCount: 14, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.volume.OBV(),
        INDICATORS.momentum.RSI(14),
        INDICATORS.trend.MACD(12, 26, 9),
        INDICATORS.volume.AD(),
        INDICATORS.momentum.ROC(12),
        INDICATORS.volume.FORCE_INDEX(13),
      ],
      aiPromptFocus: 'Detect hidden divergences, exhaustion patterns, and potential reversals',
    },
    // Step 7: Verdict
    {
      step: 'verdict',
      stepNumber: 7,
      name: 'Verdict',
      description: 'Final swing trade recommendation',
      timeframes: [
        { timeframe: '4h', candleCount: 12, priority: 'primary' },
        { timeframe: '1d', candleCount: 7, priority: 'confirmation' },
      ],
      indicators: [
        INDICATORS.trend.ADX(14),
        INDICATORS.trend.ICHIMOKU(),
        INDICATORS.momentum.RSI(14),
        INDICATORS.volatility.ATR(14),
      ],
      aiPromptFocus: 'Final swing recommendation with long-term risk/reward analysis',
    },
  ],
};

// ============================================================================
// MAIN CONFIGURATION EXPORT
// ============================================================================

// Position config - uses swing strategy with longer timeframes
const POSITION_CONFIG: TradeTypeConfig = {
  ...SWING_CONFIG,
  type: 'position' as TradeType,
  name: 'Position Trade',
  description: 'Long-term trades, typically 1-4 weeks holding period',
  holdingPeriod: '1-4 weeks',
  riskTolerance: 'low',
  creditCost: 1,
  steps: SWING_CONFIG.steps.map(step => ({
    ...step,
    timeframes: step.timeframes.map(tf => ({
      ...tf,
      // Shift to longer timeframes for position trading
      timeframe: tf.timeframe === '4h' ? '1d' as Timeframe :
                 tf.timeframe === '1d' ? '1w' as Timeframe :
                 tf.timeframe as Timeframe,
    })),
  })),
};

export const TRADE_CONFIG: Record<TradeType, TradeTypeConfig> = {
  scalping: SCALPING_CONFIG,
  dayTrade: DAY_TRADE_CONFIG,
  swing: SWING_CONFIG,
  position: POSITION_CONFIG,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration for a specific trade type
 */
export function getTradeConfig(type: TradeType): TradeTypeConfig {
  return TRADE_CONFIG[type];
}

/**
 * Get step configuration for a specific trade type and step
 */
export function getStepConfig(type: TradeType, step: AnalysisStep): StepConfig | undefined {
  return TRADE_CONFIG[type].steps.find(s => s.step === step);
}

/**
 * Get all timeframes needed for a trade type
 */
export function getRequiredTimeframes(type: TradeType): Timeframe[] {
  const timeframes = new Set<Timeframe>();
  TRADE_CONFIG[type].steps.forEach(step => {
    step.timeframes.forEach(tf => timeframes.add(tf.timeframe));
  });
  return Array.from(timeframes);
}

/**
 * Get total candle count needed for a timeframe across all steps
 */
export function getMaxCandleCount(type: TradeType, timeframe: Timeframe): number {
  let maxCount = 0;
  TRADE_CONFIG[type].steps.forEach(step => {
    const tfConfig = step.timeframes.find(tf => tf.timeframe === timeframe);
    if (tfConfig && tfConfig.candleCount > maxCount) {
      maxCount = tfConfig.candleCount;
    }
  });
  return maxCount;
}

/**
 * Get all unique indicators for a trade type
 */
export function getAllIndicators(type: TradeType): IndicatorConfig[] {
  const indicators = new Map<string, IndicatorConfig>();
  TRADE_CONFIG[type].steps.forEach(step => {
    step.indicators.forEach(ind => {
      if (!indicators.has(ind.name)) {
        indicators.set(ind.name, ind);
      }
    });
  });
  return Array.from(indicators.values());
}

/**
 * Calculate estimated data requirements
 */
export function getDataRequirements(type: TradeType): {
  timeframe: Timeframe;
  candleCount: number;
  estimatedBytes: number;
}[] {
  const timeframes = getRequiredTimeframes(type);
  return timeframes.map(tf => {
    const candleCount = getMaxCandleCount(type, tf);
    // Estimated bytes per candle: ~100 bytes (OHLCV + timestamp)
    const estimatedBytes = candleCount * 100;
    return { timeframe: tf, candleCount, estimatedBytes };
  });
}

/**
 * Get credit cost for a trade type
 */
export function getCreditCost(type: TradeType): number {
  return TRADE_CONFIG[type].creditCost;
}

// ============================================================================
// SUMMARY MATRIX (for documentation)
// ============================================================================

/*
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           TRADEPATH 3D ANALYSIS MATRIX                               │
├──────────────┬──────────────┬──────────────────────────────────────────────────────┤
│ TRADE TYPE   │ TIMEFRAMES   │ CANDLES  │ KEY INDICATORS                            │
├──────────────┼──────────────┼──────────┼───────────────────────────────────────────┤
│ SCALPING     │ 1m, 5m, 15m  │ 10-100   │ RSI(7), STOCH_RSI, ATR(7), VWAP,         │
│ (1-15 min)   │              │          │ SUPERTREND(7,2), ORDER_FLOW, SQUEEZE     │
├──────────────┼──────────────┼──────────┼───────────────────────────────────────────┤
│ DAY TRADE    │ 15m, 1h, 4h  │ 12-96    │ RSI(14), MACD, ICHIMOKU, ADX,            │
│ (1-8 hours)  │              │          │ STOCHASTIC, BOLLINGER, OBV               │
├──────────────┼──────────────┼──────────┼───────────────────────────────────────────┤
│ SWING        │ 4h, 1d, 1w   │ 7-90     │ ICHIMOKU, EMA(50/200), RSI(14),          │
│ (2-14 days)  │              │          │ MACD, AD, WHALE_ACTIVITY, TSI            │
└──────────────┴──────────────┴──────────┴───────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP → INDICATOR MAPPING                                │
├───────────────┬─────────────────────────────────────────────────────────────────────┤
│ Step 1        │ TREND: ADX, ICHIMOKU, EMA, BOLLINGER                               │
│ Market Pulse  │ Focus: Market direction and volatility state                       │
├───────────────┼─────────────────────────────────────────────────────────────────────┤
│ Step 2        │ VOLUME: VWAP, OBV, CMF, AD, LIQUIDITY_SCORE                        │
│ Asset Scan    │ Focus: Asset health and accumulation patterns                      │
├───────────────┼─────────────────────────────────────────────────────────────────────┤
│ Step 3        │ ADVANCED: SPOOFING, ORDER_FLOW, WHALE_ACTIVITY, SQUEEZE            │
│ Safety Check  │ Focus: Risk detection and manipulation warning                     │
├───────────────┼─────────────────────────────────────────────────────────────────────┤
│ Step 4        │ MOMENTUM: RSI, STOCHASTIC, STOCH_RSI, MACD, SUPERTREND             │
│ Timing        │ Focus: Optimal entry/exit timing                                   │
├───────────────┼─────────────────────────────────────────────────────────────────────┤
│ Step 5        │ VOLATILITY: ATR, PSAR, KELTNER, DONCHIAN                           │
│ Trade Plan    │ Focus: SL/TP calculation and position sizing                       │
├───────────────┼─────────────────────────────────────────────────────────────────────┤
│ Step 6        │ DIVERGENCE: OBV, RSI, MACD, FORCE_INDEX, AD                        │
│ Trap Check    │ Focus: Volume/price divergence and trap detection                  │
├───────────────┼─────────────────────────────────────────────────────────────────────┤
│ Step 7        │ CORE: ADX, RSI, ATR (subset for final scoring)                     │
│ Verdict       │ Focus: Final confidence score and recommendation                   │
└───────────────┴─────────────────────────────────────────────────────────────────────┘
*/

export default TRADE_CONFIG;
