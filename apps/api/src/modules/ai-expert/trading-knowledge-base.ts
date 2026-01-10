/**
 * TradePath Trading Knowledge Base
 * ==================================
 *
 * Comprehensive trading knowledge library for AI Experts.
 * Includes everything a professional trader needs to know:
 *
 * 1. Technical Indicators (40+)
 * 2. Market Structure & Price Action
 * 3. Candlestick Patterns
 * 4. Chart Patterns
 * 5. Order Types & Execution
 * 6. Risk Management
 * 7. Position Sizing
 * 8. Trading Psychology
 * 9. Market Microstructure
 * 10. On-Chain Analysis
 * 11. Macro Factors
 * 12. Crypto-Specific Concepts
 * 13. Professional Trading Tips
 */

// ============================================================================
// 1. TECHNICAL INDICATORS
// ============================================================================

export const INDICATORS = {
  // ----- TREND INDICATORS -----
  trend: {
    EMA: {
      name: 'Exponential Moving Average',
      description: 'Trend-following indicator giving more weight to recent prices',
      periods: { 9: 'scalping', 21: 'short-term', 50: 'medium-term', 200: 'long-term' },
      signals: {
        bullish: 'Price above EMA, shorter EMA above longer EMA',
        bearish: 'Price below EMA, shorter EMA below longer EMA',
      },
      goldenCross: 'EMA(50) crosses above EMA(200) - major bullish signal',
      deathCross: 'EMA(50) crosses below EMA(200) - major bearish signal',
      tradepathUsage: 'Market Pulse step for trend alignment',
    },

    SMA: {
      name: 'Simple Moving Average',
      description: 'Equal-weighted average of closing prices',
      keyLevels: {
        'SMA(20)': 'Short-term trend',
        'SMA(50)': 'Medium-term trend, institutional',
        'SMA(200)': 'Long-term trend, bull/bear market divider',
      },
      tradepathUsage: 'Swing trading Market Pulse',
    },

    MACD: {
      name: 'Moving Average Convergence Divergence',
      components: {
        macdLine: 'EMA(12) - EMA(26)',
        signalLine: 'EMA(9) of MACD Line',
        histogram: 'MACD Line - Signal Line',
      },
      signals: {
        bullishCrossover: 'MACD crosses above Signal',
        bearishCrossover: 'MACD crosses below Signal',
        bullishDivergence: 'Price lower low, MACD higher low = reversal up',
        bearishDivergence: 'Price higher high, MACD lower high = reversal down',
      },
      tradepathUsage: 'Timing (Step 4) + Trap Check (Step 6)',
    },

    ADX: {
      name: 'Average Directional Index',
      description: 'Measures trend STRENGTH not direction',
      interpretation: {
        '0-20': 'Weak/no trend - avoid trend strategies',
        '20-40': 'Developing trend - potential entry',
        '40-60': 'Strong trend - ride it',
        '60+': 'Very strong - watch for exhaustion',
      },
      components: {
        '+DI': 'Positive directional indicator (bullish pressure)',
        '-DI': 'Negative directional indicator (bearish pressure)',
      },
      tradepathUsage: 'Market Pulse + Verdict for trend confirmation',
    },

    ICHIMOKU: {
      name: 'Ichimoku Cloud',
      description: 'Complete trading system in one indicator',
      components: {
        tenkanSen: 'Conversion Line (9p) - short-term trend',
        kijunSen: 'Base Line (26p) - medium-term trend/support',
        senkouA: 'Leading Span A - first cloud edge',
        senkouB: 'Leading Span B (52p) - second cloud edge',
        chikou: 'Lagging Span - confirms trend',
      },
      signals: {
        strongBullish: 'Price above cloud + Tenkan > Kijun + Green cloud',
        strongBearish: 'Price below cloud + Tenkan < Kijun + Red cloud',
        kumoTwist: 'Cloud color change = trend reversal signal',
        tkCross: 'Tenkan/Kijun cross = momentum shift',
      },
      tradepathUsage: 'Day Trade & Swing Market Pulse',
    },

    SUPERTREND: {
      name: 'Supertrend',
      description: 'ATR-based trend indicator, excellent for trailing stops',
      calculation: 'Based on ATR × Multiplier around median price',
      settings: {
        scalping: 'Period=7, Multiplier=2',
        standard: 'Period=10, Multiplier=3',
      },
      signals: {
        green: 'Line below price = uptrend, use as trailing stop',
        red: 'Line above price = downtrend',
        flip: 'Color change = potential reversal',
      },
      tradepathUsage: 'Timing + Verdict',
    },

    PSAR: {
      name: 'Parabolic SAR',
      description: 'Dots above/below price showing trend and stop levels',
      signals: {
        bullish: 'Dots below price',
        bearish: 'Dots above price',
        reversal: 'Price touches dots = SAR (Stop And Reverse)',
      },
      tradepathUsage: 'Trade Plan for dynamic stop-loss',
    },

    AROON: {
      name: 'Aroon Indicator',
      description: 'Measures time since highest high and lowest low',
      interpretation: {
        uptrend: 'Aroon Up > 70, Aroon Down < 30',
        downtrend: 'Aroon Down > 70, Aroon Up < 30',
        consolidation: 'Both below 50',
      },
      tradepathUsage: 'Asset Scan',
    },
  },

  // ----- MOMENTUM INDICATORS -----
  momentum: {
    RSI: {
      name: 'Relative Strength Index',
      description: 'Most popular momentum oscillator (0-100)',
      zones: {
        overbought: '> 70 - potential reversal down',
        oversold: '< 30 - potential reversal up',
        bullish: '> 50 momentum up',
        bearish: '< 50 momentum down',
      },
      periods: { 7: 'scalping', 14: 'standard' },
      divergence: 'Most reliable when RSI diverges from price at extremes',
      tradepathUsage: 'Timing + Trap Check',
    },

    STOCHASTIC: {
      name: 'Stochastic Oscillator',
      description: 'Shows where close is relative to high-low range',
      components: { '%K': 'Fast line', '%D': 'Slow line (signal)' },
      signals: {
        buy: '%K crosses above %D below 20',
        sell: '%K crosses below %D above 80',
      },
      tradepathUsage: 'Timing',
    },

    STOCH_RSI: {
      name: 'Stochastic RSI',
      description: 'RSI of RSI - more sensitive than both',
      bestFor: 'Quick momentum shifts in scalping',
      tradepathUsage: 'Scalping Timing',
    },

    CCI: {
      name: 'Commodity Channel Index',
      zones: {
        overbought: '> 100',
        oversold: '< -100',
        strongTrend: 'CCI staying above 100 or below -100',
      },
      tradepathUsage: 'Day Trade Timing',
    },

    WILLIAMS_R: {
      name: 'Williams %R',
      description: 'Like Stochastic but inverted (-100 to 0)',
      zones: { overbought: '> -20', oversold: '< -80' },
      tradepathUsage: 'Day Trade Timing',
    },

    MFI: {
      name: 'Money Flow Index',
      description: 'Volume-weighted RSI - shows money flow',
      interpretation: {
        buying: 'MFI > 50 = money flowing in',
        selling: 'MFI < 50 = money flowing out',
        overbought: '> 80',
        oversold: '< 20',
      },
      divergence: 'Price up + MFI down = distribution warning',
      tradepathUsage: 'Safety Check + Trap Check',
    },

    ROC: {
      name: 'Rate of Change',
      description: 'Percentage change over N periods',
      interpretation: 'Extreme ROC values = overextension',
      tradepathUsage: 'Trap Check for exhaustion detection',
    },

    TSI: {
      name: 'True Strength Index',
      description: 'Double-smoothed momentum with signal line',
      tradepathUsage: 'Swing Timing',
    },

    ULTIMATE: {
      name: 'Ultimate Oscillator',
      description: 'Combines 7/14/28 period momentum - fewer false signals',
      tradepathUsage: 'Swing Timing',
    },
  },

  // ----- VOLATILITY INDICATORS -----
  volatility: {
    BOLLINGER: {
      name: 'Bollinger Bands',
      components: {
        upper: 'SMA(20) + 2×StdDev',
        middle: 'SMA(20)',
        lower: 'SMA(20) - 2×StdDev',
      },
      concepts: {
        squeeze: 'Bands narrow = low volatility = breakout coming',
        expansion: 'Bands widen = high volatility = trend in progress',
        walking: 'Price can "walk the bands" in strong trends',
        percentB: 'Position within bands (0=lower, 1=upper)',
      },
      tradepathUsage: 'Market Pulse + Trade Plan',
    },

    ATR: {
      name: 'Average True Range',
      description: 'Measures volatility including gaps',
      usage: {
        stopLoss: 'SL = Entry - (1.5-2.5 × ATR)',
        positionSize: 'Higher ATR = smaller position',
        volatilityState: 'High ATR = volatile, Low ATR = quiet',
      },
      periods: { 7: 'scalping', 14: 'standard' },
      tradepathUsage: 'Trade Plan + Verdict',
    },

    KELTNER: {
      name: 'Keltner Channel',
      description: 'Like Bollinger but uses ATR instead of StdDev',
      usage: 'Breakouts and pullback entries',
      tradepathUsage: 'Timing + Trade Plan',
    },

    DONCHIAN: {
      name: 'Donchian Channel',
      description: 'Highest high and lowest low over N periods',
      usage: 'Classic breakout indicator (Turtle Trading)',
      tradepathUsage: 'Trade Plan for TP levels',
    },

    HISTORICAL_VOLATILITY: {
      name: 'Historical Volatility',
      description: 'Annualized standard deviation of returns',
      levels: {
        'low': '< 30%',
        'moderate': '30-60%',
        'high': '60-100%',
        'extreme': '> 100%',
      },
      tradepathUsage: 'Safety Check',
    },

    SQUEEZE: {
      name: 'Squeeze Momentum',
      description: 'BB inside KC = extreme low volatility',
      signal: 'Squeeze release often leads to big move',
      tradepathUsage: 'Safety Check',
    },
  },

  // ----- VOLUME INDICATORS -----
  volume: {
    OBV: {
      name: 'On-Balance Volume',
      description: 'Cumulative volume: adds on up days, subtracts on down days',
      interpretation: {
        rising: 'Accumulation',
        falling: 'Distribution',
        divergence: 'OBV diverging from price = reversal warning',
      },
      tradepathUsage: 'Asset Scan + Trap Check',
    },

    VWAP: {
      name: 'Volume Weighted Average Price',
      description: 'Average price weighted by volume - institutional benchmark',
      usage: {
        above: 'Bullish - buyers winning',
        below: 'Bearish - sellers winning',
        meanReversion: 'Price tends to revert to VWAP',
      },
      tradepathUsage: 'Asset Scan + Trade Plan',
    },

    AD: {
      name: 'Accumulation/Distribution',
      description: 'Money flow based on close position in range',
      tradepathUsage: 'Trap Check',
    },

    CMF: {
      name: 'Chaikin Money Flow',
      description: 'A/D normalized to -1 to +1',
      interpretation: {
        buying: '> 0',
        strongBuying: '> 0.25',
        selling: '< 0',
        strongSelling: '< -0.25',
      },
      tradepathUsage: 'Safety Check + Asset Scan',
    },

    PVT: {
      name: 'Price Volume Trend',
      description: 'Like OBV but weights by price change percentage',
      usage: 'Detects smart money accumulation',
      tradepathUsage: 'Asset Scan + Safety Check',
    },

    RELATIVE_VOLUME: {
      name: 'Relative Volume (RVOL)',
      description: 'Current volume vs average',
      levels: {
        '< 0.5': 'Very low - liquidity risk',
        '0.5-1.5': 'Normal',
        '1.5-2.0': 'Elevated - watch closely',
        '> 2.0': 'Spike - investigate',
      },
      tradepathUsage: 'Market Pulse + Safety Check',
    },

    VOLUME_SPIKE: {
      name: 'Volume Spike Detection',
      description: 'Identifies when volume exceeds threshold',
      warning: 'Spikes can indicate manipulation or major news',
      tradepathUsage: 'Safety Check',
    },

    FORCE_INDEX: {
      name: 'Force Index',
      description: 'Price change × Volume',
      tradepathUsage: 'Trap Check',
    },
  },

  // ----- ADVANCED INDICATORS -----
  advanced: {
    ORDER_FLOW_IMBALANCE: {
      name: 'Order Flow Imbalance',
      description: '(TakerBuy - TakerSell) / Total',
      levels: {
        strongBuying: '> +0.3',
        buying: '+0.1 to +0.3',
        neutral: '-0.1 to +0.1',
        selling: '-0.1 to -0.3',
        strongSelling: '< -0.3',
      },
      tradepathUsage: 'Safety Check + Trap Check',
    },

    LIQUIDITY_SCORE: {
      name: 'Liquidity Score',
      description: '0-100 score for execution safety',
      levels: {
        '> 80': 'Institutional grade',
        '60-80': 'Good',
        '40-60': 'Moderate - smaller positions',
        '20-40': 'Poor',
        '< 20': 'Dangerous - avoid',
      },
      tradepathUsage: 'Asset Scan + Safety Check',
    },

    BID_ASK_SPREAD: {
      name: 'Bid-Ask Spread',
      description: 'Cost of execution',
      levels: {
        '< 0.05%': 'Excellent (BTC/ETH)',
        '0.05-0.2%': 'Good',
        '0.2-1%': 'High - factor into trades',
        '> 1%': 'Dangerous',
      },
      tradepathUsage: 'Scalping Asset Scan',
    },

    WHALE_ACTIVITY: {
      name: 'Whale Activity Detection',
      description: 'Tracks large holder movements',
      signals: {
        accumulation: 'Large volume, small price impact',
        distribution: 'Large volume pushing price down',
      },
      tradepathUsage: 'Safety Check',
    },

    SPOOFING_DETECTION: {
      name: 'Spoofing Detection',
      description: 'Identifies fake orders for manipulation',
      warning: 'Score > 30 = manipulation risk',
      tradepathUsage: 'Safety Check',
    },

    SLIPPAGE_ESTIMATE: {
      name: 'Slippage Estimate',
      description: 'Predicted price impact of order',
      tradepathUsage: 'Scalping Asset Scan',
    },

    MARKET_IMPACT: {
      name: 'Market Impact',
      description: 'How much your order moves market',
      tradepathUsage: 'Safety Check',
    },
  },
};

// ============================================================================
// 2. MARKET STRUCTURE & PRICE ACTION
// ============================================================================

export const MARKET_STRUCTURE = {
  trendTypes: {
    uptrend: {
      definition: 'Higher highs (HH) and higher lows (HL)',
      tradingRule: 'Buy dips to support/HL',
      breakSignal: 'Lower low = potential trend change',
    },
    downtrend: {
      definition: 'Lower highs (LH) and lower lows (LL)',
      tradingRule: 'Sell rallies to resistance/LH',
      breakSignal: 'Higher high = potential trend change',
    },
    sideways: {
      definition: 'Price oscillating between support and resistance',
      tradingRule: 'Buy support, sell resistance, or wait for breakout',
    },
  },

  breakOfStructure: {
    BOS: {
      definition: 'Break of Structure - price breaks previous swing high/low',
      bullishBOS: 'Price breaks above previous high in downtrend',
      bearishBOS: 'Price breaks below previous low in uptrend',
      significance: 'Potential trend reversal signal',
    },
    CHoCH: {
      definition: 'Change of Character - first sign of trend change',
      example: 'In uptrend, first lower low is CHoCH',
    },
  },

  supplyDemand: {
    demandZone: {
      definition: 'Area where buyers overwhelmed sellers (bullish)',
      formation: 'Strong bullish candle leaving the zone',
      trading: 'Buy when price returns to zone',
    },
    supplyZone: {
      definition: 'Area where sellers overwhelmed buyers (bearish)',
      formation: 'Strong bearish candle leaving the zone',
      trading: 'Sell when price returns to zone',
    },
    orderBlock: {
      definition: 'Last candle before impulsive move - institutional entry point',
      bullishOB: 'Last bearish candle before bullish impulse',
      bearishOB: 'Last bullish candle before bearish impulse',
    },
  },

  liquidity: {
    buySideLiquidity: {
      definition: 'Stop losses above highs = target for smart money',
      location: 'Above equal highs, swing highs, resistance',
    },
    sellSideLiquidity: {
      definition: 'Stop losses below lows = target for smart money',
      location: 'Below equal lows, swing lows, support',
    },
    liquidityGrab: {
      definition: 'Price sweeps liquidity then reverses',
      trading: 'Wait for grab then enter in opposite direction',
    },
    stopHunt: {
      definition: 'Intentional move to trigger stops before reversal',
      protection: 'Place stops beyond obvious levels',
    },
  },

  fairValueGap: {
    definition: 'Gap between candles where price moved too fast',
    formation: 'Space between low of one candle and high of candle 2 candles back',
    trading: 'Price often returns to fill the gap',
  },

  wyckoff: {
    phases: {
      accumulation: 'Smart money buying from weak hands',
      markup: 'Price rising as buying complete',
      distribution: 'Smart money selling to retail',
      markdown: 'Price falling as selling complete',
    },
    spring: 'False breakdown below support in accumulation - buy signal',
    upthrust: 'False breakout above resistance in distribution - sell signal',
  },
};

// ============================================================================
// 3. CANDLESTICK PATTERNS
// ============================================================================

export const CANDLESTICK_PATTERNS = {
  singleCandle: {
    doji: {
      appearance: 'Open = Close (cross shape)',
      meaning: 'Indecision - potential reversal',
      types: {
        standard: 'Equal wicks',
        dragonfly: 'Long lower wick - bullish at bottom',
        gravestone: 'Long upper wick - bearish at top',
      },
    },
    hammer: {
      appearance: 'Small body at top, long lower wick',
      meaning: 'Bullish reversal when at bottom',
      condition: 'Lower wick 2x+ body',
    },
    hangingMan: {
      appearance: 'Same as hammer but at top',
      meaning: 'Bearish reversal warning',
    },
    shootingStar: {
      appearance: 'Small body at bottom, long upper wick',
      meaning: 'Bearish reversal at top',
    },
    invertedHammer: {
      appearance: 'Same as shooting star but at bottom',
      meaning: 'Bullish reversal signal',
    },
    marubozu: {
      appearance: 'Full body candle, no wicks',
      meaning: 'Strong momentum in candle direction',
    },
    spinningTop: {
      appearance: 'Small body, equal wicks',
      meaning: 'Indecision, weakening momentum',
    },
  },

  doubleCandle: {
    engulfing: {
      bullish: 'Green candle body completely engulfs previous red',
      bearish: 'Red candle body completely engulfs previous green',
      strength: 'More reliable at support/resistance',
    },
    harami: {
      bullish: 'Small green inside previous large red',
      bearish: 'Small red inside previous large green',
      meaning: 'Potential reversal, needs confirmation',
    },
    piercingLine: {
      appearance: 'Green candle opens below prev low, closes above 50% of prev body',
      meaning: 'Bullish reversal at bottom',
    },
    darkCloudCover: {
      appearance: 'Red candle opens above prev high, closes below 50% of prev body',
      meaning: 'Bearish reversal at top',
    },
    tweezerTop: {
      appearance: 'Two candles with equal highs',
      meaning: 'Resistance confirmed, bearish',
    },
    tweezerBottom: {
      appearance: 'Two candles with equal lows',
      meaning: 'Support confirmed, bullish',
    },
  },

  tripleCandle: {
    morningStar: {
      structure: 'Large red → small body (gap down) → large green',
      meaning: 'Strong bullish reversal',
    },
    eveningStar: {
      structure: 'Large green → small body (gap up) → large red',
      meaning: 'Strong bearish reversal',
    },
    threeWhiteSoldiers: {
      structure: 'Three consecutive strong green candles',
      meaning: 'Strong bullish momentum',
    },
    threeBlackCrows: {
      structure: 'Three consecutive strong red candles',
      meaning: 'Strong bearish momentum',
    },
    threeInsideUp: {
      structure: 'Bullish harami followed by green close above first candle',
      meaning: 'Confirmed bullish reversal',
    },
  },
};

// ============================================================================
// 4. CHART PATTERNS
// ============================================================================

export const CHART_PATTERNS = {
  reversal: {
    headAndShoulders: {
      structure: 'Left shoulder → Head (higher) → Right shoulder',
      neckline: 'Connect the two lows',
      breakout: 'Sell when price breaks below neckline',
      target: 'Distance from head to neckline, projected down',
      inverseHnS: 'Upside down version = bullish reversal',
    },
    doubleTop: {
      structure: 'Two peaks at similar level',
      meaning: 'Resistance too strong, reversal down',
      entry: 'Break below the middle trough',
      target: 'Height of pattern projected down',
    },
    doubleBottom: {
      structure: 'Two troughs at similar level',
      meaning: 'Support holding, reversal up',
      entry: 'Break above the middle peak',
      target: 'Height of pattern projected up',
    },
    tripleTop: 'Three peaks - stronger reversal signal',
    tripleBottom: 'Three troughs - stronger reversal signal',
    roundingBottom: {
      structure: 'Gradual U-shaped bottom',
      meaning: 'Slow accumulation, bullish',
    },
    roundingTop: {
      structure: 'Gradual inverted U top',
      meaning: 'Slow distribution, bearish',
    },
  },

  continuation: {
    flag: {
      structure: 'Sharp move (pole) followed by parallel channel (flag)',
      bullFlag: 'Upward pole + downward sloping flag',
      bearFlag: 'Downward pole + upward sloping flag',
      breakout: 'In direction of initial move',
      target: 'Length of pole from breakout',
    },
    pennant: {
      structure: 'Like flag but converging lines (small triangle)',
      trading: 'Same as flag',
    },
    wedge: {
      risingWedge: 'Both lines up, converging = bearish',
      fallingWedge: 'Both lines down, converging = bullish',
      breakout: 'Usually in opposite direction of wedge slope',
    },
    triangle: {
      ascending: 'Flat top + rising bottom = bullish',
      descending: 'Falling top + flat bottom = bearish',
      symmetrical: 'Converging lines = direction uncertain',
    },
    rectangle: {
      structure: 'Horizontal consolidation',
      trading: 'Trade the breakout direction',
    },
  },

  cupAndHandle: {
    structure: 'U-shaped cup followed by small pullback (handle)',
    meaning: 'Bullish continuation',
    entry: 'Break above handle resistance',
    target: 'Depth of cup projected up',
  },
};

// ============================================================================
// 5. ORDER TYPES & EXECUTION
// ============================================================================

export const ORDER_TYPES = {
  basic: {
    marketOrder: {
      description: 'Execute immediately at best available price',
      pros: 'Guaranteed fill',
      cons: 'Potential slippage, especially in low liquidity',
      useWhen: 'Need immediate entry/exit, high liquidity assets',
    },
    limitOrder: {
      description: 'Execute only at specified price or better',
      pros: 'No slippage, control entry price',
      cons: 'May not fill if price doesn\'t reach limit',
      useWhen: 'Patient entries, specific price levels',
    },
    stopLoss: {
      description: 'Market order triggered when price reaches stop level',
      purpose: 'Protect against losses',
      placement: 'Below support for longs, above resistance for shorts',
    },
    stopLimit: {
      description: 'Limit order triggered when price reaches stop',
      pros: 'More control than stop-market',
      cons: 'May not fill in fast markets',
    },
    takeProfit: {
      description: 'Limit order to close position at profit target',
      strategy: 'Often use multiple TPs (TP1, TP2, TP3)',
    },
  },

  advanced: {
    trailingStop: {
      description: 'Stop that follows price by fixed amount/percentage',
      benefit: 'Locks in profits while riding trend',
      setting: 'Often 1-2× ATR behind price',
    },
    OCO: {
      name: 'One Cancels Other',
      description: 'Two orders where fill of one cancels the other',
      usage: 'SL and TP simultaneously - one triggers, other cancels',
    },
    bracket: {
      description: 'Entry + Stop Loss + Take Profit as package',
      usage: 'Complete trade setup in one action',
    },
    iceberg: {
      description: 'Large order split into smaller visible portions',
      purpose: 'Hide true size to avoid market impact',
    },
    TWAP: {
      name: 'Time Weighted Average Price',
      description: 'Split order over time period',
      usage: 'Large positions to minimize market impact',
    },
  },

  execution: {
    slippage: {
      definition: 'Difference between expected and actual execution price',
      factors: 'Liquidity, volatility, order size',
      reduction: 'Use limit orders, smaller size, liquid markets',
    },
    fillRate: {
      definition: 'Percentage of order that gets filled',
      concern: 'Partial fills can leave positions incomplete',
    },
    latency: {
      definition: 'Time between order submission and execution',
      importance: 'Critical for scalping',
    },
  },
};

// ============================================================================
// 6. RISK MANAGEMENT
// ============================================================================

export const RISK_MANAGEMENT = {
  positionSizing: {
    percentRisk: {
      rule: 'Risk 1-2% of portfolio per trade',
      formula: 'Position Size = (Account × Risk%) / (Entry - Stop Loss)',
      example: '$10,000 account, 1% risk = $100 max loss per trade',
    },
    kellycriterion: {
      formula: 'K% = W - [(1-W)/R]',
      where: 'W = win rate, R = avg win/avg loss',
      usage: 'Theoretical optimal bet size',
      practical: 'Use half Kelly for safety',
    },
    volatilityBased: {
      method: 'Size inversely to ATR',
      formula: 'Position = Risk$ / (ATR × Multiplier)',
    },
  },

  stopLoss: {
    atrBased: {
      method: 'SL = Entry - (ATR × 1.5 to 2.5)',
      scalping: 'Use lower multiplier (1.5)',
      swing: 'Use higher multiplier (2.5)',
    },
    structureBased: {
      method: 'Place SL beyond key levels',
      long: 'Below support, swing low, or demand zone',
      short: 'Above resistance, swing high, or supply zone',
    },
    percentBased: {
      scalping: '0.5-1%',
      dayTrade: '1-2%',
      swing: '2-5%',
    },
    mental: 'Never use mental stops - always set actual orders',
  },

  takeProfit: {
    levels: {
      TP1: '1.5R - take 40% profit',
      TP2: '2.5R - take 35% profit',
      TP3: '4R or key resistance - take remaining 25%',
    },
    trailing: {
      method: 'Move SL to breakeven after TP1',
      trailingMethod: 'Trail stop using Supertrend or ATR',
    },
    targetMethods: [
      'Support/resistance levels',
      'Fibonacci extensions',
      'Previous highs/lows',
      'Round numbers',
    ],
  },

  riskReward: {
    minimum: '1:2 (risk $1 to make $2)',
    ideal: '1:3 or higher',
    calculation: 'R:R = (TP - Entry) / (Entry - SL)',
    breakeven: 'At 1:2, need 33% win rate to break even',
  },

  portfolioRisk: {
    correlation: 'Avoid correlated positions (multiple alts)',
    maxExposure: 'No more than 5-10% in single position',
    totalRisk: 'Total open risk < 5-10% of portfolio',
  },
};

// ============================================================================
// 7. TRADING PSYCHOLOGY
// ============================================================================

export const TRADING_PSYCHOLOGY = {
  emotions: {
    fear: {
      symptoms: 'Hesitating on valid setups, closing winners too early',
      solution: 'Trust your system, use proper position sizing',
    },
    greed: {
      symptoms: 'Oversizing, not taking profits, overtrading',
      solution: 'Stick to rules, have profit targets',
    },
    FOMO: {
      definition: 'Fear Of Missing Out',
      symptoms: 'Chasing pumped coins, entering without setup',
      solution: 'Wait for your setup - there\'s always another trade',
    },
    revenge: {
      symptoms: 'Trading to recover losses immediately',
      solution: 'Take break after loss, stick to plan',
    },
    hope: {
      symptoms: 'Moving stop loss, ignoring exit signals',
      solution: 'Respect your stops - hope is not a strategy',
    },
  },

  biases: {
    confirmation: 'Seeking info that confirms existing belief',
    recency: 'Overweighting recent events',
    sunkCost: 'Holding losers because you\'ve lost a lot',
    overconfidence: 'After wins, sizing up dangerously',
    lossAversion: 'Pain of loss > pleasure of equal gain',
  },

  discipline: {
    tradingPlan: 'Write it down and follow it',
    journaling: 'Record every trade with reasoning',
    rules: 'Create rules for entry, exit, position size',
    review: 'Weekly review of performance',
  },

  mindset: {
    probabilities: 'Think in probabilities, not certainties',
    edge: 'You don\'t need to be right all the time',
    losses: 'Losses are cost of doing business',
    patience: 'Best trades often come from waiting',
    detachment: 'Don\'t identify with positions',
  },
};

// ============================================================================
// 8. ON-CHAIN ANALYSIS (CRYPTO)
// ============================================================================

export const ONCHAIN_ANALYSIS = {
  exchangeFlows: {
    inflow: {
      meaning: 'Coins moving TO exchanges',
      implication: 'Potential selling pressure - bearish',
    },
    outflow: {
      meaning: 'Coins moving FROM exchanges',
      implication: 'Coins being held - bullish',
    },
    netFlow: 'Outflow - Inflow = Net (negative = bullish)',
  },

  whaleTracking: {
    definition: 'Monitoring large wallet movements',
    signals: {
      accumulation: 'Whales buying = bullish',
      distribution: 'Whales selling = bearish',
    },
    wallets: 'Track top 100 wallets for BTC/ETH',
  },

  supplyMetrics: {
    activeSupply: 'Coins moved recently vs total supply',
    longTermHolders: 'Coins not moved in 1+ year',
    shortTermHolders: 'Recently acquired coins',
    implication: 'LTH selling to STH at top, opposite at bottom',
  },

  minerMetrics: {
    hashRate: 'Network security, miner confidence',
    difficulty: 'Mining competition',
    minerRevenue: 'Miner profitability',
    minerSelling: 'Miners selling = need cash = potential pressure',
  },

  stablecoinFlows: {
    mintBurn: 'Stablecoin minting = fresh capital entering',
    exchangeStables: 'High stablecoin on exchanges = buying power ready',
  },

  fundingRate: {
    positive: 'Longs pay shorts - market overleveraged long',
    negative: 'Shorts pay longs - market overleveraged short',
    extreme: 'Extreme funding often precedes reversal',
  },

  openInterest: {
    definition: 'Total outstanding derivative contracts',
    rising: 'More positions being opened',
    falling: 'Positions being closed',
    withPrice: 'OI up + price up = new longs, OI up + price down = new shorts',
  },
};

// ============================================================================
// 9. MACRO FACTORS
// ============================================================================

export const MACRO_FACTORS = {
  economicIndicators: {
    interestRates: {
      fed: 'US Federal Reserve rate decisions',
      impact: 'Higher rates = risk-off = bearish crypto',
    },
    inflation: {
      CPI: 'Consumer Price Index',
      impact: 'High inflation → Fed hawkish → risk-off',
    },
    employment: {
      NFP: 'Non-Farm Payrolls',
      impact: 'Strong jobs = Fed can stay hawkish',
    },
    GDP: 'Economic growth indicator',
  },

  marketSentiment: {
    fearGreedIndex: {
      extremeFear: '< 25 - potential buying opportunity',
      fear: '25-45',
      neutral: '45-55',
      greed: '55-75',
      extremeGreed: '> 75 - potential top',
    },
    btcDominance: {
      rising: 'Flight to safety, altcoins underperform',
      falling: 'Risk-on, altcoins outperform',
    },
  },

  correlations: {
    stocks: 'Crypto often correlates with NASDAQ',
    dollar: 'DXY up usually = crypto down',
    gold: 'BTC sometimes correlates as "digital gold"',
  },

  events: {
    halvings: 'BTC supply reduction - historically bullish',
    etf: 'ETF approvals = institutional access',
    regulation: 'Major regulation news moves markets',
    hacks: 'Exchange hacks = FUD',
  },
};

// ============================================================================
// 10. CRYPTO-SPECIFIC CONCEPTS
// ============================================================================

export const CRYPTO_CONCEPTS = {
  tokenomics: {
    supply: {
      circulating: 'Currently tradeable supply',
      total: 'All coins that will exist',
      max: 'Hard cap (like BTC 21M)',
    },
    inflation: 'New tokens entering circulation',
    burns: 'Tokens destroyed = deflationary',
    vesting: 'Locked tokens releasing over time',
    unlocks: 'Large unlocks = selling pressure',
  },

  defi: {
    TVL: 'Total Value Locked - DeFi adoption metric',
    yield: 'APY from staking/lending',
    impermanentLoss: 'LP risk when prices diverge',
    liquidations: 'Forced selling in DeFi = cascade risk',
  },

  contractSecurity: {
    audit: 'Third-party code review',
    honeypot: 'Can buy but can\'t sell = SCAM',
    rugPull: 'Team drains liquidity',
    mint: 'Owner can create unlimited tokens = risk',
    tax: 'Buy/sell taxes - high tax = red flag',
    locked: 'Liquidity locked = safer',
  },

  tradingPairs: {
    quote: 'Second currency in pair (USDT in BTC/USDT)',
    base: 'First currency (what you\'re trading)',
    spread: 'Different on different pairs',
    liquidity: 'Major pairs more liquid',
  },
};

// ============================================================================
// 11. TRADEPATH 7-STEP ANALYSIS
// ============================================================================

export const TRADEPATH_ANALYSIS = {
  step1_marketPulse: {
    name: 'Market Pulse',
    purpose: 'Assess overall market conditions before trading',
    analyzes: [
      'BTC dominance and trend',
      'Fear & Greed Index',
      'Market cap changes',
      'Risk-on vs risk-off environment',
      'Macro events calendar',
    ],
    indicators: {
      scalping: ['ATR', 'Bollinger', 'Relative Volume', 'EMA(9)', 'EMA(21)'],
      dayTrade: ['Ichimoku', 'ADX', 'EMA(20/50/200)', 'Bollinger'],
      swing: ['Ichimoku', 'ADX', 'EMA(50/200)', 'SMA(50/200)', 'Bollinger'],
    },
    output: 'Suitable / Caution / Avoid verdict for market conditions',
  },

  step2_assetScan: {
    name: 'Asset Scan',
    purpose: 'Deep dive into specific asset\'s technical health',
    analyzes: [
      'Multi-timeframe trend analysis',
      'Support/resistance levels',
      'Volume profile',
      'Liquidity assessment',
      'Key indicators state',
    ],
    indicators: {
      scalping: ['VWAP', 'Liquidity Score', 'Bid-Ask Spread', 'Volume Spike', 'Slippage'],
      dayTrade: ['VWAP', 'OBV', 'Liquidity Score', 'Aroon', 'CMF', 'PVT'],
      swing: ['OBV', 'A/D', 'CMF', 'PVT', 'Aroon', 'Whale Activity', 'VWMA'],
    },
    output: 'Health score, price levels, forecast scenarios',
  },

  step3_safetyCheck: {
    name: 'Safety Check',
    purpose: 'Identify risks and potential dangers',
    analyzes: [
      'Manipulation detection (spoofing, wash trading)',
      'Whale activity monitoring',
      'Volatility assessment',
      'Contract security (if applicable)',
      'News sentiment',
    ],
    indicators: {
      scalping: ['Spoofing Detection', 'Order Flow', 'Squeeze', 'Whale Activity', 'CMF'],
      dayTrade: ['Historical Vol', 'ATR', 'Whale Activity', 'MFI', 'Squeeze', 'Market Impact'],
      swing: ['Historical Vol', 'ATR', 'Bollinger', 'Liquidity Score', 'MFI', 'Market Impact'],
    },
    output: 'Risk level (Low/Medium/High) with specific warnings',
  },

  step4_timing: {
    name: 'Timing',
    purpose: 'Determine optimal entry/exit timing',
    analyzes: [
      'Momentum indicator states',
      'Overbought/oversold conditions',
      'Trend alignment across timeframes',
      'Entry zone identification',
    ],
    indicators: {
      scalping: ['RSI(7)', 'StochRSI', 'MACD', 'Supertrend(7,2)', 'Keltner'],
      dayTrade: ['RSI(14)', 'Stochastic', 'MACD', 'Supertrend(10,3)', 'CCI', 'Williams %R'],
      swing: ['RSI(14)', 'Stochastic', 'StochRSI', 'MACD', 'Supertrend', 'TSI', 'Ultimate'],
    },
    output: 'Trade now recommendation, entry zones, optimal timing',
  },

  step5_tradePlan: {
    name: 'Trade Plan',
    purpose: 'Calculate exact trade setup',
    provides: [
      'Entry price(s)',
      'Stop-loss with reasoning',
      'Take-profit targets (TP1, TP2, TP3)',
      'Position size recommendation',
      'Risk/reward ratio',
    ],
    indicators: {
      scalping: ['ATR(7)', 'PSAR', 'Bollinger', 'VWAP'],
      dayTrade: ['ATR(14)', 'PSAR', 'Keltner', 'Donchian', 'VWAP'],
      swing: ['ATR(14)', 'PSAR', 'Donchian', 'Ichimoku', 'Keltner'],
    },
    output: 'Complete trade setup with all levels',
  },

  step6_trapCheck: {
    name: 'Trap Check',
    purpose: 'Identify potential traps and false signals',
    analyzes: [
      'RSI/MACD divergences',
      'Volume divergences',
      'Bull/bear trap patterns',
      'Stop-hunt zones',
      'Fakeout risk assessment',
    ],
    indicators: {
      scalping: ['OBV', 'Order Flow', 'MFI', 'Force Index'],
      dayTrade: ['OBV', 'RSI', 'MACD', 'A/D', 'Order Flow'],
      swing: ['OBV', 'RSI', 'MACD', 'A/D', 'ROC', 'Force Index'],
    },
    output: 'Trap warnings and counter-strategies',
  },

  step7_verdict: {
    name: 'Verdict',
    purpose: 'Final decision with confidence score',
    provides: [
      'Overall score (0-100)',
      'Final recommendation',
      'Confidence level',
      'Key factors summary',
    ],
    indicators: {
      scalping: ['ADX', 'RSI(7)', 'ATR(7)'],
      dayTrade: ['ADX', 'RSI(14)', 'ATR(14)', 'Supertrend'],
      swing: ['ADX', 'Ichimoku', 'RSI(14)', 'ATR(14)'],
    },
    verdicts: {
      GO: 'Strong setup, enter trade',
      CONDITIONAL_GO: 'Good setup with caveats',
      WAIT: 'Not ideal timing, wait for better',
      AVOID: 'Do not trade this setup',
    },
  },
};

// ============================================================================
// 12. PRO TRADING TIPS
// ============================================================================

export const PRO_TIPS = {
  entry: [
    'Wait for confirmation - first retest of broken level often best entry',
    'Scale in - don\'t enter full size at once',
    'Use limit orders at key levels, not market orders',
    'Best entries feel uncomfortable - if everyone sees it, it\'s too late',
    'Trade the reaction, not the news itself',
  ],

  exit: [
    'Plan exits before entering - no guessing later',
    'Move stop to breakeven after first TP',
    'Take partial profits - don\'t be greedy',
    'Trail stops in trending markets',
    'Exit before major events, not during',
  ],

  risk: [
    'Never risk money you can\'t afford to lose',
    'Position size based on stop distance, not conviction',
    'Correlation kills - don\'t hold 5 alts that move together',
    'Risk less after losses, not more',
    'If you can\'t define risk, don\'t take trade',
  ],

  market: [
    'The trend is your friend until the end',
    'Trade what you see, not what you think',
    'Range-bound markets kill trend traders',
    'High timeframe direction > low timeframe signals',
    'Liquidity attracts price - watch for stop hunts',
  ],

  psychology: [
    'Best trade is often no trade',
    'After 3 losses in a row, stop for the day',
    'Don\'t revenge trade - take breaks',
    'Journal every trade - review weekly',
    'Process over outcome - right process can have losing trades',
  ],

  crypto: [
    'Never catch a falling knife - wait for base',
    'Bull markets make you money, bear markets make you rich',
    'Alt season = BTC dominance falling',
    'New ATH often leads to more ATH',
    'Monday is often best day for entries',
  ],
};

// ============================================================================
// EXPORT FOR AI EXPERTS
// ============================================================================

export function getTradingKnowledgeForAI(): string {
  return `
[TRADEPATH COMPREHENSIVE TRADING KNOWLEDGE]

You have access to professional trading knowledge including:
- 40+ technical indicators with interpretation
- Market structure and price action concepts
- Candlestick and chart patterns
- Risk management principles
- Trading psychology
- On-chain analysis
- Crypto-specific concepts
- TradePath 7-step analysis system

Key points you must know:

INDICATORS BY PURPOSE:
• Trend: EMA, SMA, MACD, ADX, Ichimoku, Supertrend, PSAR, Aroon
• Momentum: RSI, Stochastic, StochRSI, CCI, Williams %R, MFI, TSI
• Volatility: Bollinger, ATR, Keltner, Donchian, Historical Vol, Squeeze
• Volume: OBV, VWAP, CMF, A/D, PVT, Relative Volume
• Advanced: Order Flow, Liquidity Score, Whale Activity, Spoofing Detection

TRADEPATH 7-STEP ANALYSIS:
1. Market Pulse - Overall market conditions
2. Asset Scan - Specific asset technical health
3. Safety Check - Risk and manipulation detection
4. Timing - Entry/exit timing optimization
5. Trade Plan - Exact SL/TP calculations
6. Trap Check - Divergence and trap detection
7. Verdict - Final GO/WAIT/AVOID decision

TRADE TYPES:
• Scalping: 1-15 min, 1m/5m/15m, 0.5-1% SL, 3 credits
• Day Trade: 1-8 hours, 15m/1h/4h, 1-2% SL, 2 credits
• Swing: 2-14 days, 4h/1d/1w, 2-5% SL, 1 credit

RISK MANAGEMENT RULES:
• Risk 1-2% per trade maximum
• Position Size = Risk Amount / (Entry - Stop Loss)
• Minimum 1:2 risk/reward ratio
• Always use stop losses - never mental stops

When users ask about any trading concept, explain with:
1. What it is (definition)
2. How to interpret it (signals)
3. How TradePath uses it (which step)
4. Real example with numbers
`;
}

export default {
  INDICATORS,
  MARKET_STRUCTURE,
  CANDLESTICK_PATTERNS,
  CHART_PATTERNS,
  ORDER_TYPES,
  RISK_MANAGEMENT,
  TRADING_PSYCHOLOGY,
  ONCHAIN_ANALYSIS,
  MACRO_FACTORS,
  CRYPTO_CONCEPTS,
  TRADEPATH_ANALYSIS,
  PRO_TIPS,
  getTradingKnowledgeForAI,
};
