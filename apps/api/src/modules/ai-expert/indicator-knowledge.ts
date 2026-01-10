/**
 * TradePath Indicator Knowledge Base
 * ===================================
 *
 * Comprehensive documentation of all 40+ indicators used in TradePath.
 * This knowledge is shared with AI Experts to enable detailed explanations.
 *
 * Structure:
 * - What: Brief description
 * - How: Simplified calculation
 * - Interpretation: What values mean
 * - Usage: Which TradePath step uses it
 * - Example: Real-world scenario
 */

export const INDICATOR_KNOWLEDGE = {
  // ============================================================================
  // TREND INDICATORS
  // ============================================================================

  EMA: {
    name: 'Exponential Moving Average (EMA)',
    category: 'Trend',
    what: 'A moving average that gives more weight to recent prices, making it more responsive to new information than SMA.',
    how: 'EMA = (Current Price × Multiplier) + (Previous EMA × (1 - Multiplier)), where Multiplier = 2 / (Period + 1)',
    interpretation: {
      bullish: 'Price above EMA indicates uptrend; shorter EMA crossing above longer EMA is bullish crossover',
      bearish: 'Price below EMA indicates downtrend; shorter EMA crossing below longer EMA is bearish crossover',
      neutral: 'Price oscillating around EMA suggests consolidation',
    },
    periods: {
      '9': 'Ultra short-term, used in scalping for quick signals',
      '21': 'Short-term trend, popular for day trading',
      '50': 'Medium-term trend, institutional level',
      '200': 'Long-term trend, the "golden" benchmark',
    },
    usage: 'Market Pulse (Step 1) - Multiple EMAs show trend alignment across timeframes',
    example: 'BTC is trading at $65,000 with EMA(21)=$64,200 and EMA(50)=$62,500. Price above both EMAs with 21>50 alignment = strong bullish trend. Entry should be on pullbacks to EMA(21).',
  },

  SMA: {
    name: 'Simple Moving Average (SMA)',
    category: 'Trend',
    what: 'The arithmetic mean of prices over a specified period. Smoother than EMA but slower to react.',
    how: 'SMA = Sum of Closing Prices / Number of Periods',
    interpretation: {
      bullish: 'Price above SMA(200) = long-term uptrend; "Golden Cross" = SMA(50) crosses above SMA(200)',
      bearish: 'Price below SMA(200) = long-term downtrend; "Death Cross" = SMA(50) crosses below SMA(200)',
    },
    usage: 'Market Pulse (Step 1) for Swing Trading - SMA(50) and SMA(200) define macro trend',
    example: 'ETH shows SMA(50)=$3,200 crossing above SMA(200)=$3,100 - this "Golden Cross" historically leads to 20-40% rallies within 3 months.',
  },

  MACD: {
    name: 'Moving Average Convergence Divergence',
    category: 'Trend',
    what: 'Shows the relationship between two EMAs. Consists of MACD line, Signal line, and Histogram.',
    how: 'MACD Line = EMA(12) - EMA(26); Signal Line = EMA(9) of MACD Line; Histogram = MACD - Signal',
    interpretation: {
      bullish: 'MACD crosses above Signal (bullish crossover); Histogram turns positive; Bullish divergence (price lower low, MACD higher low)',
      bearish: 'MACD crosses below Signal (bearish crossover); Histogram turns negative; Bearish divergence (price higher high, MACD lower high)',
      strength: 'Histogram height shows momentum strength; Growing histogram = strengthening trend',
    },
    usage: 'Timing (Step 4) + Trap Check (Step 6) - Crossovers signal entry, divergences warn of reversals',
    example: 'SOL price makes new high at $180 but MACD makes lower high = bearish divergence. This warned of the pullback to $150. TradePath detected this in Trap Check.',
  },

  ADX: {
    name: 'Average Directional Index',
    category: 'Trend',
    what: 'Measures trend strength (not direction). Higher ADX = stronger trend regardless of direction.',
    how: 'Calculated from +DI and -DI (Directional Indicators) over 14 periods',
    interpretation: {
      '0-20': 'Weak or no trend - range-bound market, avoid trend-following strategies',
      '20-40': 'Developing trend - potential entry point for trend trades',
      '40-60': 'Strong trend - ride the trend, trail stops',
      '60+': 'Extremely strong trend - rare, often precedes exhaustion',
    },
    usage: 'Market Pulse (Step 1) + Verdict (Step 7) - Filters out weak setups, confirms strong trends',
    example: 'BTC with ADX=45, +DI=35, -DI=15 indicates strong uptrend. TradePath gives higher confidence scores when ADX>25 confirms the direction.',
  },

  ICHIMOKU: {
    name: 'Ichimoku Cloud (Ichimoku Kinko Hyo)',
    category: 'Trend',
    what: 'Complete trading system showing support/resistance, trend direction, and momentum in one view.',
    components: {
      tenkanSen: 'Conversion Line (9-period) - short-term trend',
      kijunSen: 'Base Line (26-period) - medium-term trend',
      senkouA: 'Leading Span A - first cloud boundary',
      senkouB: 'Leading Span B (52-period) - second cloud boundary',
      chikou: 'Lagging Span - confirms trend',
    },
    interpretation: {
      bullish: 'Price above cloud + Tenkan above Kijun + Green cloud (Senkou A > Senkou B)',
      bearish: 'Price below cloud + Tenkan below Kijun + Red cloud (Senkou A < Senkou B)',
      neutral: 'Price inside cloud = consolidation zone, wait for breakout',
    },
    usage: 'Market Pulse (Step 1) for Day Trade & Swing - Comprehensive trend analysis',
    example: 'ETH trading at $3,400 above the cloud (top at $3,200), with Tenkan($3,350) above Kijun($3,280) = all Ichimoku signals aligned bullish. Strong buy setup.',
  },

  SUPERTREND: {
    name: 'Supertrend',
    category: 'Trend',
    what: 'Trend-following indicator that plots above/below price to show direction. Excellent for trailing stops.',
    how: 'Based on ATR. Upper Band = (High+Low)/2 + (Multiplier × ATR); Lower Band = (High+Low)/2 - (Multiplier × ATR)',
    interpretation: {
      bullish: 'Supertrend line below price (green) = uptrend, line acts as dynamic support',
      bearish: 'Supertrend line above price (red) = downtrend, line acts as dynamic resistance',
      flip: 'When price crosses Supertrend line = potential trend reversal',
    },
    settings: {
      'scalping': 'Period=7, Multiplier=2 - tighter, more signals',
      'dayTrade': 'Period=10, Multiplier=3 - balanced',
      'swing': 'Period=10, Multiplier=3 - same but on higher timeframes',
    },
    usage: 'Timing (Step 4) + Verdict (Step 7) - Entry signals and trend confirmation',
    example: 'BTC Supertrend(10,3) flips from red to green at $62,000 = buy signal. Use the green line at $61,200 as trailing stop.',
  },

  PSAR: {
    name: 'Parabolic SAR (Stop and Reverse)',
    category: 'Trend',
    what: 'Places dots above/below price to indicate trend direction and potential reversal points.',
    how: 'Uses Acceleration Factor (AF) starting at 0.02, increasing by 0.02 each new extreme, max 0.2',
    interpretation: {
      bullish: 'Dots below price = uptrend, dots act as trailing stop levels',
      bearish: 'Dots above price = downtrend',
      reversal: 'When price touches PSAR dot = potential trend reversal (SAR = Stop And Reverse)',
    },
    usage: 'Trade Plan (Step 5) - Dynamic stop-loss placement',
    example: 'Long position in SOL at $150, PSAR at $145. As price rises to $165, PSAR moves up to $158. Use PSAR as trailing stop - protects profits while riding trend.',
  },

  AROON: {
    name: 'Aroon Indicator',
    category: 'Trend',
    what: 'Measures time since highest high (Aroon Up) and lowest low (Aroon Down) to identify trend changes.',
    how: 'Aroon Up = ((Period - Days Since Highest High) / Period) × 100; Aroon Down = similar for lowest low',
    interpretation: {
      bullish: 'Aroon Up > 70 AND Aroon Down < 30 = strong uptrend',
      bearish: 'Aroon Down > 70 AND Aroon Up < 30 = strong downtrend',
      crossover: 'Aroon Up crossing above Aroon Down = bullish signal',
      consolidation: 'Both below 50 = range-bound market',
    },
    usage: 'Asset Scan (Step 2) - Identifies if asset is trending or ranging',
    example: 'LINK shows Aroon Up=92, Aroon Down=12 - made new 25-day high very recently, strong uptrend in progress.',
  },

  VWMA: {
    name: 'Volume Weighted Moving Average',
    category: 'Trend',
    what: 'Moving average weighted by volume - gives more importance to prices at high-volume periods.',
    how: 'VWMA = Sum(Price × Volume) / Sum(Volume) over N periods',
    interpretation: {
      bullish: 'Price above VWMA = buyers in control at important volume levels',
      bearish: 'Price below VWMA = sellers dominant',
      divergence: 'Price above SMA but below VWMA = volume not confirming price (warning)',
    },
    usage: 'Asset Scan (Step 2) for Swing Trading - Confirms institutional participation',
    example: 'BTC at $65,000 with SMA(20)=$64,000 but VWMA(20)=$65,500. Price below VWMA despite being above SMA = smart money sold at higher prices, potential weakness.',
  },

  // ============================================================================
  // MOMENTUM INDICATORS
  // ============================================================================

  RSI: {
    name: 'Relative Strength Index',
    category: 'Momentum',
    what: 'Measures speed and magnitude of price changes on 0-100 scale. Most popular momentum oscillator.',
    how: 'RSI = 100 - (100 / (1 + RS)), where RS = Average Gain / Average Loss over N periods',
    interpretation: {
      overbought: 'RSI > 70 = potentially overbought, watch for bearish divergence',
      oversold: 'RSI < 30 = potentially oversold, watch for bullish divergence',
      divergence: 'Price makes new high but RSI doesn\'t = bearish divergence (reversal warning)',
      centerline: 'RSI above 50 = bullish momentum, below 50 = bearish momentum',
    },
    settings: {
      'scalping': 'RSI(7) - faster, more sensitive',
      'dayTrade': 'RSI(14) - standard, balanced',
      'swing': 'RSI(14) on higher timeframes',
    },
    usage: 'Timing (Step 4) + Trap Check (Step 6) - Entry timing and divergence detection',
    example: 'ETH RSI(14) at 28 on 4H chart after -15% drop. Oversold condition + bullish divergence on lower timeframe = high probability bounce setup. TradePath Timing score increases.',
  },

  STOCHASTIC: {
    name: 'Stochastic Oscillator',
    category: 'Momentum',
    what: 'Compares closing price to price range over period. Shows where price closed relative to high-low range.',
    how: '%K = ((Close - Lowest Low) / (Highest High - Lowest Low)) × 100; %D = SMA of %K',
    interpretation: {
      overbought: '%K > 80 = overbought zone',
      oversold: '%K < 20 = oversold zone',
      crossover: '%K crossing above %D in oversold zone = buy signal',
      divergence: 'Similar to RSI divergence analysis',
    },
    usage: 'Timing (Step 4) - Entry/exit timing in ranging markets',
    example: 'DOGE Stochastic %K=15 crossing above %D=12 in oversold zone while price at support = strong buy signal for scalp trade.',
  },

  STOCH_RSI: {
    name: 'Stochastic RSI',
    category: 'Momentum',
    what: 'RSI formula applied to RSI values instead of price. More sensitive than regular RSI or Stochastic.',
    how: 'StochRSI = (RSI - Lowest RSI) / (Highest RSI - Lowest RSI) over N periods',
    interpretation: {
      extreme: 'Reaches 0 and 100 more frequently than RSI - better for detecting extremes',
      overbought: '> 80 with crossover down = sell signal',
      oversold: '< 20 with crossover up = buy signal',
    },
    usage: 'Timing (Step 4) for Scalping - Quick momentum shifts',
    example: 'BTC 5m chart, StochRSI shoots to 95 then %K crosses below %D = immediate scalp short signal. Quick 0.5% move expected.',
  },

  CCI: {
    name: 'Commodity Channel Index',
    category: 'Momentum',
    what: 'Measures price deviation from statistical mean. Originally for commodities, works well on crypto.',
    how: 'CCI = (Typical Price - SMA of TP) / (0.015 × Mean Deviation)',
    interpretation: {
      overbought: 'CCI > 100 = overbought, potential reversal',
      oversold: 'CCI < -100 = oversold, potential bounce',
      trend: 'CCI staying above +100 = strong uptrend; below -100 = strong downtrend',
      zero: 'Crossing zero line confirms trend change',
    },
    usage: 'Timing (Step 4) for Day Trading - Trend confirmation and reversals',
    example: 'SOL CCI drops to -150 (extreme oversold) while price at key support = high probability reversal setup.',
  },

  WILLIAMS_R: {
    name: 'Williams %R',
    category: 'Momentum',
    what: 'Similar to Stochastic but inverted scale (-100 to 0). Shows where close is relative to high-low range.',
    how: '%R = ((Highest High - Close) / (Highest High - Lowest Low)) × -100',
    interpretation: {
      overbought: '%R > -20 = overbought',
      oversold: '%R < -80 = oversold',
      signal: 'Best used with trend confirmation - buy oversold in uptrend, sell overbought in downtrend',
    },
    usage: 'Timing (Step 4) for Day Trading - Quick overbought/oversold identification',
    example: 'AVAX Williams %R at -85 while in confirmed uptrend (price above EMAs) = buy the dip opportunity.',
  },

  ROC: {
    name: 'Rate of Change',
    category: 'Momentum',
    what: 'Measures percentage change between current price and price N periods ago. Pure momentum measure.',
    how: 'ROC = ((Current Price - Price N Periods Ago) / Price N Periods Ago) × 100',
    interpretation: {
      positive: 'ROC > 0 = price higher than N periods ago (bullish)',
      negative: 'ROC < 0 = price lower than N periods ago (bearish)',
      divergence: 'Price making new high with lower ROC = momentum weakening',
      extreme: 'Very high ROC = potentially overextended, watch for mean reversion',
    },
    usage: 'Trap Check (Step 6) for Swing Trading - Identifies exhaustion moves',
    example: 'PEPE ROC(12) at +45% is extremely high. Historical average is +5%. This suggests overextension - avoid FOMO buying.',
  },

  MFI: {
    name: 'Money Flow Index',
    category: 'Momentum',
    what: 'Volume-weighted RSI. Incorporates volume into momentum analysis for better accuracy.',
    how: 'Uses Typical Price × Volume (Money Flow), then calculates ratio like RSI',
    interpretation: {
      overbought: 'MFI > 80 = money flowing out, potential top',
      oversold: 'MFI < 20 = money flowing in, potential bottom',
      divergence: 'Price up but MFI down = distribution (smart money selling)',
    },
    usage: 'Safety Check (Step 3) + Trap Check (Step 6) - Confirms volume supports price move',
    example: 'BTC makes new high at $70,000 but MFI drops from 75 to 65 = bearish divergence. Money is flowing out despite higher prices. TradePath warns "distribution detected".',
  },

  ULTIMATE: {
    name: 'Ultimate Oscillator',
    category: 'Momentum',
    what: 'Combines short, medium, and long-term momentum into single indicator to reduce false signals.',
    how: 'Weighted average of buying pressure across 7, 14, and 28 periods',
    interpretation: {
      overbought: '> 70 with bearish divergence = sell',
      oversold: '< 30 with bullish divergence = buy',
      weight: 'Uses 4:2:1 weighting (short:medium:long) for responsiveness with stability',
    },
    usage: 'Timing (Step 4) for Swing Trading - Reduces whipsaws compared to single-period oscillators',
    example: 'ETH Ultimate Oscillator at 25 with bullish divergence on daily chart = high confidence swing long entry.',
  },

  TSI: {
    name: 'True Strength Index',
    category: 'Momentum',
    what: 'Double-smoothed momentum indicator that shows both trend direction and overbought/oversold.',
    how: 'Double EMA of price change divided by double EMA of absolute price change',
    interpretation: {
      bullish: 'TSI > 0 and rising = bullish momentum',
      bearish: 'TSI < 0 and falling = bearish momentum',
      crossover: 'TSI crossing signal line = momentum shift',
      extreme: '> 25 overbought, < -25 oversold',
    },
    usage: 'Timing (Step 4) for Swing Trading - Smooth momentum with less noise',
    example: 'LINK TSI crosses above its signal line while above zero = confirmed momentum buy signal for swing trade.',
  },

  // ============================================================================
  // VOLATILITY INDICATORS
  // ============================================================================

  BOLLINGER: {
    name: 'Bollinger Bands',
    category: 'Volatility',
    what: '3 bands: middle (SMA), upper and lower (±2 standard deviations). Shows volatility and potential reversal zones.',
    how: 'Upper = SMA + (2 × StdDev); Lower = SMA - (2 × StdDev); Middle = SMA(20)',
    interpretation: {
      squeeze: 'Bands narrow = low volatility, breakout coming',
      expansion: 'Bands widen = high volatility, trend in progress',
      touch: 'Price touching upper band = not necessarily sell (can "walk the band" in strong trend)',
      percentB: '%B shows where price is within bands (0=lower, 1=upper, 0.5=middle)',
    },
    usage: 'Market Pulse (Step 1) + Trade Plan (Step 5) - Volatility state and price targets',
    example: 'BTC Bollinger squeeze (bandwidth at 3-month low) followed by upper band breakout = start of new trend. TradePath detected this in Market Pulse.',
  },

  ATR: {
    name: 'Average True Range',
    category: 'Volatility',
    what: 'Measures volatility by calculating average range including gaps. Essential for stop-loss placement.',
    how: 'True Range = Max(High-Low, |High-PrevClose|, |Low-PrevClose|); ATR = Average of TR over N periods',
    interpretation: {
      high: 'High ATR = volatile market, need wider stops',
      low: 'Low ATR = quiet market, tighter stops possible',
      stopLoss: 'Common: Stop = Entry - (1.5 to 2.5 × ATR) depending on risk tolerance',
    },
    settings: {
      'scalping': 'ATR(7) for quick volatility read',
      'dayTrade': 'ATR(14) standard',
      'swing': 'ATR(14) on daily for position sizing',
    },
    usage: 'Trade Plan (Step 5) + Verdict (Step 7) - Stop-loss calculation and volatility assessment',
    example: 'ETH ATR(14) = $120 on 4H. For 2× ATR stop: Entry at $3,400 → Stop at $3,400 - $240 = $3,160. TradePath automatically calculates this.',
  },

  KELTNER: {
    name: 'Keltner Channel',
    category: 'Volatility',
    what: 'Similar to Bollinger but uses ATR instead of standard deviation. Smoother bands.',
    how: 'Middle = EMA(20); Upper = EMA + (2 × ATR); Lower = EMA - (2 × ATR)',
    interpretation: {
      breakout: 'Close above upper channel = strong bullish momentum',
      pullback: 'Price pulling back to middle line in uptrend = buy opportunity',
      squeeze: 'Used with Bollinger for "squeeze" setup (BB inside KC = low volatility)',
    },
    usage: 'Timing (Step 4) + Trade Plan (Step 5) - Entry zones and dynamic support/resistance',
    example: 'SOL breaks above Keltner upper channel with volume = momentum breakout confirmed. Enter on first pullback to middle line.',
  },

  DONCHIAN: {
    name: 'Donchian Channel',
    category: 'Volatility',
    what: 'Plots highest high and lowest low over N periods. Classic breakout indicator (Turtle Trading).',
    how: 'Upper = Highest High over N; Lower = Lowest Low over N; Middle = (Upper + Lower) / 2',
    interpretation: {
      breakout: 'Price breaking above upper channel = buy signal (new N-period high)',
      breakdown: 'Price breaking below lower channel = sell signal',
      support: 'Middle line often acts as support in uptrend',
    },
    usage: 'Trade Plan (Step 5) - Take-profit levels and breakout confirmation',
    example: 'BTC breaks Donchian(20) upper channel at $65,000 = 20-day breakout. Classic trend-following entry. TradePath uses this for TP targets.',
  },

  HISTORICAL_VOLATILITY: {
    name: 'Historical Volatility',
    category: 'Volatility',
    what: 'Annualized standard deviation of returns. Shows how much price has been fluctuating.',
    how: 'HV = StdDev(ln(Close/PrevClose)) × √252 × 100 (for daily, use √365 for crypto)',
    interpretation: {
      'low': '< 30% = low volatility, consider smaller position for adequate return',
      'moderate': '30-60% = normal crypto volatility',
      'high': '60-100% = high volatility, reduce position size',
      'extreme': '> 100% = extreme volatility, extra caution required',
    },
    usage: 'Safety Check (Step 3) - Risk assessment and position sizing',
    example: 'SHIB Historical Volatility at 180% = extremely risky. TradePath recommends 50% smaller position size compared to BTC (40% HV).',
  },

  SQUEEZE: {
    name: 'Squeeze Momentum (TTM Squeeze)',
    category: 'Volatility',
    what: 'Detects when Bollinger Bands are inside Keltner Channel = extreme low volatility before big move.',
    how: 'Squeeze On = BB width < KC width; Histogram shows momentum direction',
    interpretation: {
      squeezeOn: 'Dots on = squeeze active, prepare for breakout',
      squeezeOff: 'Dots off = squeeze released, breakout happening',
      histogram: 'Green/rising = bullish momentum; Red/falling = bearish momentum',
    },
    usage: 'Safety Check (Step 3) - Warns of imminent volatility expansion',
    example: 'ETH in squeeze for 5 days (black dots), histogram turning green = bullish breakout imminent. TradePath shows "Squeeze detected - potential breakout coming".',
  },

  // ============================================================================
  // VOLUME INDICATORS
  // ============================================================================

  OBV: {
    name: 'On-Balance Volume',
    category: 'Volume',
    what: 'Cumulative volume indicator. Adds volume on up days, subtracts on down days. Shows accumulation/distribution.',
    how: 'If Close > PrevClose: OBV = PrevOBV + Volume; If Close < PrevClose: OBV = PrevOBV - Volume',
    interpretation: {
      bullish: 'OBV rising while price rising = volume confirms trend',
      divergence: 'Price making new high but OBV not = distribution (smart money selling)',
      breakout: 'OBV breaking out before price = leading indicator of price breakout',
    },
    usage: 'Asset Scan (Step 2) + Trap Check (Step 6) - Volume trend and divergence detection',
    example: 'BTC price at $67,000 (previous high $69,000) but OBV already above previous high = bullish divergence, price likely to follow OBV to new highs.',
  },

  VWAP: {
    name: 'Volume Weighted Average Price',
    category: 'Volume',
    what: 'Average price weighted by volume. Institutional benchmark - shows fair value for the session.',
    how: 'VWAP = Cumulative(Typical Price × Volume) / Cumulative Volume',
    interpretation: {
      above: 'Price above VWAP = buyers in control, bullish intraday',
      below: 'Price below VWAP = sellers in control, bearish intraday',
      reversion: 'Price tends to revert to VWAP - use for mean reversion trades',
      institutional: 'Institutions use VWAP as execution benchmark',
    },
    usage: 'Asset Scan (Step 2) + Trade Plan (Step 5) - Fair value and entry optimization',
    example: 'SOL trading at $148, VWAP at $150. Price below VWAP = slight bearish bias. Look for long entries only if price reclaims VWAP.',
  },

  AD: {
    name: 'Accumulation/Distribution Line',
    category: 'Volume',
    what: 'Measures money flow by looking at where price closes within its range, weighted by volume.',
    how: 'Money Flow Multiplier = ((Close-Low) - (High-Close)) / (High-Low); A/D = Prev A/D + (MFM × Volume)',
    interpretation: {
      rising: 'A/D rising = accumulation (buying pressure)',
      falling: 'A/D falling = distribution (selling pressure)',
      divergence: 'Price up but A/D down = hidden distribution, bearish warning',
    },
    usage: 'Trap Check (Step 6) - Confirms volume supports price action',
    example: 'DOGE price rallies 20% but A/D line is flat = rally on low conviction, likely to reverse. TradePath Trap Check warns "volume not confirming".',
  },

  CMF: {
    name: 'Chaikin Money Flow',
    category: 'Volume',
    what: 'Measures buying/selling pressure over period. Based on A/D but normalized between -1 and +1.',
    how: 'CMF = Sum(Money Flow Volume) / Sum(Volume) over N periods',
    interpretation: {
      bullish: 'CMF > 0 = buying pressure dominates',
      bearish: 'CMF < 0 = selling pressure dominates',
      strong: 'CMF > 0.25 = strong buying; CMF < -0.25 = strong selling',
      crossover: 'CMF crossing zero = momentum shift',
    },
    usage: 'Safety Check (Step 3) + Asset Scan (Step 2) - Money flow direction',
    example: 'ETH CMF at +0.35 = strong buying pressure over last 20 periods. Confirms bullish bias for long entry.',
  },

  FORCE_INDEX: {
    name: 'Force Index',
    category: 'Volume',
    what: 'Combines price change and volume to measure the force behind a move.',
    how: 'Force = (Close - PrevClose) × Volume; Smoothed with EMA(13)',
    interpretation: {
      positive: 'Positive force = buyers winning',
      negative: 'Negative force = sellers winning',
      divergence: 'Price up but force index weakening = momentum fading',
    },
    usage: 'Trap Check (Step 6) - Confirms strength behind moves',
    example: 'BTC breaks resistance with Force Index spiking positive = strong breakout with conviction. Safe to enter.',
  },

  EOM: {
    name: 'Ease of Movement',
    category: 'Volume',
    what: 'Relates price change to volume. High values mean price moved easily on low volume.',
    how: 'EOM = ((High+Low)/2 - (PrevHigh+PrevLow)/2) / (Volume / (High-Low))',
    interpretation: {
      positive: 'Positive EOM = price rising easily',
      negative: 'Negative EOM = price falling easily',
      zero: 'Near zero = price struggling to move (consolidation)',
    },
    usage: 'Less commonly used, supplementary to other volume indicators',
    example: 'SOL EOM highly positive while breaking resistance = price moving up with minimal selling resistance.',
  },

  PVT: {
    name: 'Price Volume Trend',
    category: 'Volume',
    what: 'Like OBV but weights volume by percentage price change. More sensitive to price movements.',
    how: 'PVT = PrevPVT + (Volume × (Close - PrevClose) / PrevClose)',
    interpretation: {
      rising: 'Rising PVT = accumulation, bullish',
      falling: 'Falling PVT = distribution, bearish',
      divergence: 'Price up but PVT flat/down = stealth distribution by smart money',
    },
    usage: 'Asset Scan (Step 2) + Safety Check (Step 3) - Smart money detection',
    example: 'LINK price flat but PVT steadily rising = quiet accumulation happening. Bullish breakout likely. TradePath shows "pvtTrend: bullish".',
  },

  RELATIVE_VOLUME: {
    name: 'Relative Volume (RVOL)',
    category: 'Volume',
    what: 'Current volume compared to average volume. Shows if activity is normal or unusual.',
    how: 'RVOL = Current Volume / Average Volume over N periods',
    interpretation: {
      'low': '< 0.5 = very low activity, avoid - may be illiquid',
      'normal': '0.5-1.5 = normal activity',
      'elevated': '1.5-2.0 = above average, worth watching',
      'spike': '> 2.0 = unusual activity, investigate (news, manipulation, or breakout)',
    },
    usage: 'Market Pulse (Step 1) + Safety Check (Step 3) - Activity level assessment',
    example: 'PEPE RVOL at 0.3 = very low volume. TradePath warns "Low liquidity risk - may have trouble exiting position".',
  },

  VOLUME_SPIKE: {
    name: 'Volume Spike Detection',
    category: 'Volume',
    what: 'Identifies when volume exceeds threshold (typically 2x average). Often precedes major moves.',
    how: 'Spike = Current Volume > (Threshold × Average Volume)',
    interpretation: {
      spike: 'Volume spike with price breakout = confirmed breakout',
      warning: 'Volume spike without direction = potential manipulation, wait for clarity',
      exhaustion: 'Volume spike at end of trend = possible exhaustion/reversal',
    },
    usage: 'Safety Check (Step 3) + Asset Scan (Step 2) - Unusual activity alert',
    example: 'WIF shows 4.2x volume spike with 30% price increase = likely manipulation or pump. TradePath Safety Check warns "Volume spike detected - wait for calm".',
  },

  // ============================================================================
  // ADVANCED INDICATORS
  // ============================================================================

  ORDER_FLOW_IMBALANCE: {
    name: 'Order Flow Imbalance',
    category: 'Advanced',
    what: 'Measures difference between buying and selling pressure from taker orders.',
    how: '(Taker Buy Volume - Taker Sell Volume) / Total Volume',
    interpretation: {
      'strongBuy': '> +0.3 = strong buying pressure',
      'buying': '+0.1 to +0.3 = moderate buying pressure',
      'neutral': '-0.1 to +0.1 = balanced',
      'selling': '-0.1 to -0.3 = moderate selling pressure',
      'strongSell': '< -0.3 = strong selling pressure',
    },
    usage: 'Safety Check (Step 3) + Trap Check (Step 6) - Real-time supply/demand',
    example: 'ETH Order Flow Imbalance at +0.35 = taker buyers significantly outweigh sellers. Bullish short-term bias confirmed.',
  },

  BID_ASK_SPREAD: {
    name: 'Bid-Ask Spread',
    category: 'Advanced',
    what: 'Difference between best buy and sell price. Measures liquidity and trading costs.',
    how: 'Spread = (Ask - Bid) / Mid Price × 100 (in percentage or basis points)',
    interpretation: {
      tight: '< 0.05% = excellent liquidity (BTC, ETH)',
      normal: '0.05-0.2% = acceptable for most coins',
      wide: '0.2-1% = elevated, consider slippage in calculations',
      dangerous: '> 1% = poor liquidity, high execution risk',
    },
    usage: 'Asset Scan (Step 2) for Scalping - Execution cost assessment',
    example: 'Shitcoin XYZ has 2.5% spread = your entry is already -2.5% before price moves. TradePath warns "Wide spread - execution risk high".',
  },

  LIQUIDITY_SCORE: {
    name: 'Liquidity Score',
    category: 'Advanced',
    what: 'Composite score (0-100) measuring how easily large orders can be executed.',
    how: 'Combines volume, spread, order book depth, and historical slippage',
    interpretation: {
      'excellent': '> 80 = institutional-grade liquidity',
      'good': '60-80 = suitable for most positions',
      'moderate': '40-60 = smaller positions recommended',
      'poor': '20-40 = mini positions only',
      'dangerous': '< 20 = avoid - cannot exit safely',
    },
    usage: 'Asset Scan (Step 2) + Safety Check (Step 3) - Position size guidance',
    example: 'New memecoin has Liquidity Score 18. TradePath warns "Critical: Cannot exit large positions. Maximum recommended: $500".',
  },

  SLIPPAGE_ESTIMATE: {
    name: 'Slippage Estimate',
    category: 'Advanced',
    what: 'Predicted price impact of executing a specific order size.',
    how: 'Based on order book depth, historical volume, and price impact models',
    interpretation: {
      low: '< 10 bps = minimal slippage',
      moderate: '10-30 bps = acceptable',
      high: '30-100 bps = significant cost',
      extreme: '> 100 bps = market order will move price significantly',
    },
    usage: 'Asset Scan (Step 2) for Scalping - Entry/exit cost calculation',
    example: '$50,000 market buy on low-cap alt estimated 85 bps slippage = $425 lost to slippage alone.',
  },

  MARKET_IMPACT: {
    name: 'Market Impact',
    category: 'Advanced',
    what: 'Measures how much your order will move the market price.',
    how: 'Combines ATR, liquidity, and order size analysis',
    interpretation: {
      low: 'Your order size is small relative to market = minimal impact',
      high: 'Your order size significant = will move price against you',
    },
    usage: 'Safety Check (Step 3) - Position sizing for large accounts',
    example: 'For $100K account, Market Impact score high on SHIB = should split order or use TWAP execution.',
  },

  WHALE_ACTIVITY: {
    name: 'Whale Activity Detection',
    category: 'Advanced',
    what: 'Identifies large transactions and accumulation/distribution by major holders.',
    how: 'Analyzes volume spikes, order book imbalances, and large transaction patterns',
    interpretation: {
      accumulation: 'Large volume with minimal price impact = whales accumulating quietly',
      distribution: 'Large volume pushing price down = whales selling',
      detected: 'Score > 50 = significant whale activity detected',
    },
    usage: 'Safety Check (Step 3) - Smart money tracking',
    example: 'BTC Whale Activity Score 75: Multiple $10M+ buy orders detected, exchange outflows spiking. TradePath shows "Whale accumulation detected - bullish signal".',
  },

  SPOOFING_DETECTION: {
    name: 'Spoofing Detection',
    category: 'Advanced',
    what: 'Identifies fake orders placed to manipulate perceived supply/demand.',
    how: 'Analyzes large wicks, order cancellations, and order book patterns',
    interpretation: {
      detected: 'Large orders appearing and disappearing = spoofing',
      warning: 'Score > 30 = manipulation risk elevated',
      high: 'Score > 50 = high manipulation risk - avoid entry',
    },
    usage: 'Safety Check (Step 3) for Scalping - Manipulation warning',
    example: 'Low-cap alt shows Spoofing Score 65: "Large sell walls appearing and disappearing - manipulation detected. Avoid until activity normalizes."',
  },
};

// ============================================================================
// ANALYSIS STEPS KNOWLEDGE
// ============================================================================

export const ANALYSIS_STEPS_KNOWLEDGE = {
  step1_marketPulse: {
    name: 'Market Pulse',
    number: 1,
    purpose: 'Assess overall market conditions before analyzing specific asset',
    keyQuestions: [
      'Is the broader market bullish, bearish, or neutral?',
      'What is BTC dominance doing?',
      'Is this a risk-on or risk-off environment?',
      'Are there macro events that could impact trading?',
    ],
    indicators: {
      scalping: 'ATR, Bollinger, Relative Volume, EMA(9), EMA(21)',
      dayTrade: 'Ichimoku, ADX, EMA(20/50/200), Bollinger',
      swing: 'Ichimoku, ADX, EMA(50/200), SMA(50/200), Bollinger',
    },
    output: 'Market suitability verdict: Suitable / Caution / Avoid',
  },

  step2_assetScan: {
    name: 'Asset Scan',
    number: 2,
    purpose: 'Deep analysis of the specific asset\'s technical health',
    keyQuestions: [
      'Is the asset trending or ranging?',
      'Where are key support/resistance levels?',
      'Is there volume supporting the price action?',
      'What is the liquidity situation?',
    ],
    indicators: {
      scalping: 'VWAP, Liquidity Score, Bid-Ask Spread, Volume Spike, Slippage',
      dayTrade: 'VWAP, OBV, Liquidity Score, Aroon, CMF, PVT',
      swing: 'OBV, A/D, CMF, PVT, Aroon, Whale Activity, VWMA',
    },
    output: 'Asset health score and key price levels',
  },

  step3_safetyCheck: {
    name: 'Safety Check',
    number: 3,
    purpose: 'Identify risks, manipulation, and potential dangers',
    keyQuestions: [
      'Is there unusual whale activity?',
      'Are there signs of manipulation?',
      'Is volatility at dangerous levels?',
      'Is the contract safe (for DeFi)?',
    ],
    indicators: {
      scalping: 'Spoofing Detection, Order Flow, Squeeze, Whale Activity, CMF',
      dayTrade: 'Historical Volatility, ATR, Whale Activity, MFI, Squeeze, Market Impact',
      swing: 'Historical Volatility, ATR, Bollinger, Liquidity Score, MFI, Market Impact',
    },
    output: 'Risk level: Low / Medium / High with specific warnings',
  },

  step4_timing: {
    name: 'Timing',
    number: 4,
    purpose: 'Determine optimal entry/exit timing',
    keyQuestions: [
      'Is now a good time to enter?',
      'Are momentum indicators aligned?',
      'Is there overbought/oversold condition?',
      'Where are the entry zones?',
    ],
    indicators: {
      scalping: 'RSI(7), StochRSI, MACD, Supertrend(7,2), Keltner',
      dayTrade: 'RSI(14), Stochastic, MACD, Supertrend(10,3), CCI, Williams %R',
      swing: 'RSI(14), Stochastic, StochRSI, MACD, Supertrend, TSI, Ultimate',
    },
    output: 'Trade now recommendation and entry zones',
  },

  step5_tradePlan: {
    name: 'Trade Plan',
    number: 5,
    purpose: 'Calculate exact entry, stop-loss, and take-profit levels',
    keyQuestions: [
      'Where exactly should I enter?',
      'Where should I place my stop-loss?',
      'What are my take-profit targets?',
      'What is the risk/reward ratio?',
    ],
    indicators: {
      scalping: 'ATR(7), PSAR, Bollinger, VWAP',
      dayTrade: 'ATR(14), PSAR, Keltner, Donchian, VWAP',
      swing: 'ATR(14), PSAR, Donchian, Ichimoku, Keltner',
    },
    output: 'Entry price, SL, TP1/TP2/TP3, position size, R:R ratio',
  },

  step6_trapCheck: {
    name: 'Trap Check',
    number: 6,
    purpose: 'Identify potential traps and divergences',
    keyQuestions: [
      'Is there RSI/MACD divergence?',
      'Does volume confirm the move?',
      'Are there bull/bear trap patterns?',
      'Where are stop-hunt zones?',
    ],
    indicators: {
      scalping: 'OBV, Order Flow, MFI, Force Index',
      dayTrade: 'OBV, RSI, MACD, A/D, Order Flow',
      swing: 'OBV, RSI, MACD, A/D, ROC, Force Index',
    },
    output: 'Trap warnings and counter-strategies',
  },

  step7_verdict: {
    name: 'Verdict',
    number: 7,
    purpose: 'Final decision with confidence score',
    keyQuestions: [
      'Do all signals align for entry?',
      'What is the overall confidence level?',
      'Should I trade, wait, or avoid?',
    ],
    indicators: {
      scalping: 'ADX, RSI(7), ATR(7)',
      dayTrade: 'ADX, RSI(14), ATR(14), Supertrend',
      swing: 'ADX, Ichimoku, RSI(14), ATR(14)',
    },
    output: 'GO / CONDITIONAL GO / WAIT / AVOID with 0-100 score',
  },
};

// ============================================================================
// TRADE TYPE KNOWLEDGE
// ============================================================================

export const TRADE_TYPE_KNOWLEDGE = {
  scalping: {
    name: 'Scalping',
    holdingPeriod: '1-15 minutes',
    timeframes: '1m, 5m, 15m',
    riskTolerance: 'High',
    stopLoss: '0.5-1%',
    characteristics: [
      'Requires constant attention',
      'High frequency, small profits',
      'Needs excellent liquidity',
      'Spread costs matter significantly',
      'Best during high volatility sessions',
    ],
    bestFor: 'Experienced traders with time to monitor positions',
    creditCost: 3,
  },

  dayTrade: {
    name: 'Day Trade',
    holdingPeriod: '1-8 hours',
    timeframes: '15m, 1h, 4h',
    riskTolerance: 'Medium',
    stopLoss: '1-2%',
    characteristics: [
      'Close positions before sleep',
      'No overnight risk',
      'Balance of activity and patience',
      'Ichimoku and ADX are key indicators',
      'Works well in trending markets',
    ],
    bestFor: 'Active traders who can check charts several times daily',
    creditCost: 2,
  },

  swing: {
    name: 'Swing Trade',
    holdingPeriod: '2-14 days',
    timeframes: '4h, 1d, 1w',
    riskTolerance: 'Low (position-wise)',
    stopLoss: '2-5%',
    characteristics: [
      'Catch larger moves',
      'Less time-intensive',
      'Overnight/weekend risk exists',
      'Focus on major trend direction',
      'Smart money/whale tracking important',
    ],
    bestFor: 'Traders with full-time jobs who can\'t monitor constantly',
    creditCost: 1,
  },
};

// Export knowledge as formatted string for AI Experts
export function getIndicatorKnowledgeForAI(): string {
  const sections: string[] = [];

  sections.push(`
[TRADEPATH INDICATOR KNOWLEDGE BASE]
TradePath uses 40+ technical indicators across 7 analysis steps.
Each indicator has specific purposes and interpretations.
`);

  // Add key indicators summary
  sections.push(`
[KEY INDICATORS BY CATEGORY]

TREND INDICATORS:
• EMA (9/21/50/200): Exponential Moving Average - trend direction and dynamic support/resistance
• MACD: Trend momentum and crossover signals
• ADX: Trend strength (not direction) - >25 = trending, <20 = ranging
• Ichimoku: Complete trend system with cloud support/resistance
• Supertrend: Trend direction with dynamic stop levels

MOMENTUM INDICATORS:
• RSI (7/14): Overbought (>70) / Oversold (<30) - watch for divergences
• Stochastic/StochRSI: Fast overbought/oversold signals
• MFI: Volume-weighted RSI - money flow direction

VOLATILITY INDICATORS:
• Bollinger Bands: Volatility state and squeeze detection
• ATR: Volatility measurement for stop-loss calculation
• Historical Volatility: Risk assessment (>100% = extreme)

VOLUME INDICATORS:
• OBV: Accumulation/distribution trend
• VWAP: Institutional fair value benchmark
• CMF: Money flow pressure (-1 to +1)
• Relative Volume: Activity level vs normal

ADVANCED INDICATORS:
• Order Flow Imbalance: Real-time buy/sell pressure
• Liquidity Score: 0-100 execution safety rating
• Whale Activity: Smart money detection
• Spoofing Detection: Manipulation warning
`);

  // Add analysis steps summary
  sections.push(`
[7-STEP ANALYSIS PROCESS]

Step 1 - MARKET PULSE: Overall market conditions (BTC dominance, fear/greed, macro)
Step 2 - ASSET SCAN: Specific asset technical health and levels
Step 3 - SAFETY CHECK: Risk assessment, manipulation detection, whale activity
Step 4 - TIMING: Entry/exit timing with momentum indicators
Step 5 - TRADE PLAN: Exact entry, SL, TP calculations
Step 6 - TRAP CHECK: Divergence detection and trap warnings
Step 7 - VERDICT: Final GO/WAIT/AVOID decision with confidence score
`);

  // Add trade type summary
  sections.push(`
[TRADE TYPES]

SCALPING (3 credits): 1-15 min holds, 1m/5m/15m timeframes, tight 0.5-1% stops
DAY TRADE (2 credits): 1-8 hour holds, 15m/1h/4h timeframes, 1-2% stops
SWING (1 credit): 2-14 day holds, 4h/1d/1w timeframes, 2-5% stops
`);

  return sections.join('\n');
}
