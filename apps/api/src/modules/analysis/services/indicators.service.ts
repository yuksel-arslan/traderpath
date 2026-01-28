/**
 * TradePath Technical Indicators Service
 * ======================================
 *
 * Comprehensive implementation of 40+ technical indicators
 * Ported from Python ta library and custom implementations
 *
 * Categories:
 * - Trend Indicators (EMA, SMA, MACD, ADX, Ichimoku, Supertrend, PSAR, Aroon, VWMA)
 * - Momentum Indicators (RSI, Stochastic, StochRSI, CCI, Williams %R, ROC, MFI, Ultimate, TSI)
 * - Volatility Indicators (Bollinger, ATR, Keltner, Donchian, Historical Volatility, Squeeze)
 * - Volume Indicators (OBV, VWAP, A/D, CMF, Force Index, EOM, PVT, Relative Volume, Volume Spike)
 * - Advanced Indicators (Order Flow, Bid-Ask Spread, Liquidity Score, Whale Activity, Spoofing)
 */

// Simple logger replacement for NestJS Logger
const Logger = {
  log: (message: string, context?: string) => console.log(`[${context || 'Indicators'}] ${message}`),
  error: (message: string, trace?: string, context?: string) => console.error(`[${context || 'Indicators'}] ${message}`, trace),
  warn: (message: string, context?: string) => console.warn(`[${context || 'Indicators'}] ${message}`),
  debug: (message: string, context?: string) => console.debug(`[${context || 'Indicators'}] ${message}`),
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  name: string;
  value: number | null;
  values?: number[];
  signal?: string; // 'bullish' | 'bearish' | 'neutral'
  strength?: number; // 0-100
  metadata?: Record<string, any>;
}

export interface TrendSignal {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr: number[]): number {
  return arr.length > 0 ? sum(arr) / arr.length : 0;
}

function std(arr: number[]): number {
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function max(arr: number[]): number {
  return Math.max(...arr);
}

function min(arr: number[]): number {
  return Math.min(...arr);
}

function typicalPrice(candle: OHLCV): number {
  return (candle.high + candle.low + candle.close) / 3;
}

function trueRange(current: OHLCV, previous: OHLCV): number {
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

// ============================================================================
// INDICATORS SERVICE
// ============================================================================

export class IndicatorsService {
  private readonly logger = Logger;

  // ==========================================================================
  // TREND INDICATORS
  // ==========================================================================

  /**
   * Exponential Moving Average (EMA)
   */
  calculateEMA(data: OHLCV[], period: number): IndicatorResult {
    if (data.length < period) {
      return { name: `EMA_${period}`, value: null };
    }

    const closes = data.map(d => d.close);
    const multiplier = 2 / (period + 1);

    // Start with SMA for first EMA value
    let ema = mean(closes.slice(0, period));
    const emaValues: number[] = [ema];

    for (let i = period; i < closes.length; i++) {
      ema = (closes[i] - ema) * multiplier + ema;
      emaValues.push(ema);
    }

    const currentEma = emaValues[emaValues.length - 1];
    const currentPrice = closes[closes.length - 1];

    return {
      name: `EMA_${period}`,
      value: currentEma,
      values: emaValues,
      signal: currentPrice > currentEma ? 'bullish' : 'bearish',
      strength: Math.abs((currentPrice - currentEma) / currentEma * 100),
    };
  }

  /**
   * Simple Moving Average (SMA)
   */
  calculateSMA(data: OHLCV[], period: number): IndicatorResult {
    if (data.length < period) {
      return { name: `SMA_${period}`, value: null };
    }

    const closes = data.map(d => d.close);
    const smaValues: number[] = [];

    for (let i = period - 1; i < closes.length; i++) {
      smaValues.push(mean(closes.slice(i - period + 1, i + 1)));
    }

    const currentSma = smaValues[smaValues.length - 1];
    const currentPrice = closes[closes.length - 1];

    return {
      name: `SMA_${period}`,
      value: currentSma,
      values: smaValues,
      signal: currentPrice > currentSma ? 'bullish' : 'bearish',
    };
  }

  /**
   * Moving Average Convergence Divergence (MACD)
   */
  calculateMACD(data: OHLCV[], fast = 12, slow = 26, signal = 9): IndicatorResult {
    if (data.length < slow + signal) {
      return { name: 'MACD', value: null };
    }

    const fastEma = this.calculateEMA(data, fast);
    const slowEma = this.calculateEMA(data, slow);

    if (!fastEma.values || !slowEma.values) {
      return { name: 'MACD', value: null };
    }

    // Align arrays (slow EMA starts later)
    const offset = slow - fast;
    const macdLine: number[] = [];

    for (let i = 0; i < slowEma.values.length; i++) {
      macdLine.push(fastEma.values[i + offset] - slowEma.values[i]);
    }

    // Calculate signal line (EMA of MACD line)
    const signalMultiplier = 2 / (signal + 1);
    let signalLine = mean(macdLine.slice(0, signal));
    const signalValues: number[] = [signalLine];

    for (let i = signal; i < macdLine.length; i++) {
      signalLine = (macdLine[i] - signalLine) * signalMultiplier + signalLine;
      signalValues.push(signalLine);
    }

    const currentMacd = macdLine[macdLine.length - 1];
    const currentSignal = signalValues[signalValues.length - 1];
    const histogram = currentMacd - currentSignal;

    return {
      name: 'MACD',
      value: currentMacd,
      signal: histogram > 0 ? 'bullish' : 'bearish',
      strength: Math.abs(histogram) * 100,
      metadata: {
        macd: currentMacd,
        signal: currentSignal,
        histogram,
        crossover: Math.abs(histogram) < Math.abs(macdLine[macdLine.length - 2] - signalValues[signalValues.length - 2]),
      },
    };
  }

  /**
   * Average Directional Index (ADX)
   */
  calculateADX(data: OHLCV[], period = 14): IndicatorResult {
    if (data.length < period * 2) {
      return { name: 'ADX', value: null };
    }

    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const upMove = data[i].high - data[i - 1].high;
      const downMove = data[i - 1].low - data[i].low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      tr.push(trueRange(data[i], data[i - 1]));
    }

    // Smooth the values
    const smoothTR: number[] = [];
    const smoothPlusDM: number[] = [];
    const smoothMinusDM: number[] = [];

    let sumTR = sum(tr.slice(0, period));
    let sumPlusDM = sum(plusDM.slice(0, period));
    let sumMinusDM = sum(minusDM.slice(0, period));

    smoothTR.push(sumTR);
    smoothPlusDM.push(sumPlusDM);
    smoothMinusDM.push(sumMinusDM);

    for (let i = period; i < tr.length; i++) {
      sumTR = sumTR - sumTR / period + tr[i];
      sumPlusDM = sumPlusDM - sumPlusDM / period + plusDM[i];
      sumMinusDM = sumMinusDM - sumMinusDM / period + minusDM[i];

      smoothTR.push(sumTR);
      smoothPlusDM.push(sumPlusDM);
      smoothMinusDM.push(sumMinusDM);
    }

    // Calculate +DI and -DI
    const plusDI: number[] = smoothPlusDM.map((v, i) => (v / smoothTR[i]) * 100);
    const minusDI: number[] = smoothMinusDM.map((v, i) => (v / smoothTR[i]) * 100);

    // Calculate DX
    const dx: number[] = plusDI.map((v, i) => {
      const sum = v + minusDI[i];
      return sum === 0 ? 0 : (Math.abs(v - minusDI[i]) / sum) * 100;
    });

    // Calculate ADX (smoothed DX)
    let adx = mean(dx.slice(0, period));
    for (let i = period; i < dx.length; i++) {
      adx = (adx * (period - 1) + dx[i]) / period;
    }

    const currentPlusDI = plusDI[plusDI.length - 1];
    const currentMinusDI = minusDI[minusDI.length - 1];

    return {
      name: 'ADX',
      value: adx,
      signal: adx > 25 ? (currentPlusDI > currentMinusDI ? 'bullish' : 'bearish') : 'neutral',
      strength: adx,
      metadata: {
        plusDI: currentPlusDI,
        minusDI: currentMinusDI,
        trendStrength: adx > 50 ? 'strong' : adx > 25 ? 'moderate' : 'weak',
      },
    };
  }

  /**
   * Ichimoku Cloud
   */
  calculateIchimoku(data: OHLCV[], tenkan = 9, kijun = 26, senkou = 52): IndicatorResult {
    if (data.length < senkou) {
      return { name: 'ICHIMOKU', value: null };
    }

    const donchianMid = (arr: OHLCV[]) => {
      const highs = arr.map(d => d.high);
      const lows = arr.map(d => d.low);
      return (max(highs) + min(lows)) / 2;
    };

    const tenkanSen = donchianMid(data.slice(-tenkan));
    const kijunSen = donchianMid(data.slice(-kijun));
    const senkouA = (tenkanSen + kijunSen) / 2;
    const senkouB = donchianMid(data.slice(-senkou));
    const chikou = data[data.length - 1].close;

    const currentPrice = data[data.length - 1].close;
    const cloudTop = Math.max(senkouA, senkouB);
    const cloudBottom = Math.min(senkouA, senkouB);

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentPrice > cloudTop && tenkanSen > kijunSen) {
      signal = 'bullish';
    } else if (currentPrice < cloudBottom && tenkanSen < kijunSen) {
      signal = 'bearish';
    }

    return {
      name: 'ICHIMOKU',
      value: currentPrice > cloudTop ? 1 : currentPrice < cloudBottom ? -1 : 0,
      signal,
      strength: Math.abs((currentPrice - (cloudTop + cloudBottom) / 2) / currentPrice * 100),
      metadata: {
        tenkanSen,
        kijunSen,
        senkouA,
        senkouB,
        chikou,
        cloudTop,
        cloudBottom,
        priceAboveCloud: currentPrice > cloudTop,
        priceBelowCloud: currentPrice < cloudBottom,
        tkCross: tenkanSen > kijunSen ? 'bullish' : 'bearish',
      },
    };
  }

  /**
   * Supertrend
   */
  calculateSupertrend(data: OHLCV[], period = 10, multiplier = 3): IndicatorResult {
    if (data.length < period) {
      return { name: 'SUPERTREND', value: null };
    }

    const atrResult = this.calculateATR(data, period);
    if (atrResult.value === null || !atrResult.values) {
      return { name: 'SUPERTREND', value: null };
    }

    const atrValues = atrResult.values;
    let trend = 1; // 1 = uptrend, -1 = downtrend
    let upperBand = 0;
    let lowerBand = 0;
    let finalUpperBand = 0;
    let finalLowerBand = 0;

    const trends: number[] = [];
    const supertrendValues: number[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const atrIndex = i - (period - 1);
      const atr = atrValues[atrIndex];
      const hl2 = (data[i].high + data[i].low) / 2;

      upperBand = hl2 + multiplier * atr;
      lowerBand = hl2 - multiplier * atr;

      if (i === period - 1) {
        finalUpperBand = upperBand;
        finalLowerBand = lowerBand;
      } else {
        finalUpperBand = upperBand < finalUpperBand || data[i - 1].close > finalUpperBand ? upperBand : finalUpperBand;
        finalLowerBand = lowerBand > finalLowerBand || data[i - 1].close < finalLowerBand ? lowerBand : finalLowerBand;
      }

      if (trend === 1 && data[i].close < finalLowerBand) {
        trend = -1;
      } else if (trend === -1 && data[i].close > finalUpperBand) {
        trend = 1;
      }

      trends.push(trend);
      supertrendValues.push(trend === 1 ? finalLowerBand : finalUpperBand);
    }

    const currentTrend = trends[trends.length - 1];
    const supertrendLine = supertrendValues[supertrendValues.length - 1];

    return {
      name: 'SUPERTREND',
      value: supertrendLine,
      signal: currentTrend === 1 ? 'bullish' : 'bearish',
      strength: Math.abs((data[data.length - 1].close - supertrendLine) / supertrendLine * 100),
      metadata: {
        trend: currentTrend,
        supertrendLine,
        distance: data[data.length - 1].close - supertrendLine,
      },
    };
  }

  /**
   * Parabolic SAR
   */
  calculatePSAR(data: OHLCV[], af = 0.02, maxAf = 0.2): IndicatorResult {
    if (data.length < 2) {
      return { name: 'PSAR', value: null };
    }

    let trend = 1; // 1 = uptrend, -1 = downtrend
    let sar = data[0].low;
    let ep = data[0].high;
    let acceleration = af;
    const psarValues: number[] = [sar];

    for (let i = 1; i < data.length; i++) {
      const prevSar = sar;

      if (trend === 1) {
        sar = prevSar + acceleration * (ep - prevSar);
        sar = Math.min(sar, data[i - 1].low, i >= 2 ? data[i - 2].low : data[i - 1].low);

        if (data[i].high > ep) {
          ep = data[i].high;
          acceleration = Math.min(acceleration + af, maxAf);
        }

        if (data[i].low < sar) {
          trend = -1;
          sar = ep;
          ep = data[i].low;
          acceleration = af;
        }
      } else {
        sar = prevSar + acceleration * (ep - prevSar);
        sar = Math.max(sar, data[i - 1].high, i >= 2 ? data[i - 2].high : data[i - 1].high);

        if (data[i].low < ep) {
          ep = data[i].low;
          acceleration = Math.min(acceleration + af, maxAf);
        }

        if (data[i].high > sar) {
          trend = 1;
          sar = ep;
          ep = data[i].high;
          acceleration = af;
        }
      }

      psarValues.push(sar);
    }

    return {
      name: 'PSAR',
      value: sar,
      signal: trend === 1 ? 'bullish' : 'bearish',
      strength: Math.abs((data[data.length - 1].close - sar) / sar * 100),
      metadata: { trend, ep, acceleration },
    };
  }

  /**
   * Aroon Indicator
   */
  calculateAroon(data: OHLCV[], period = 25): IndicatorResult {
    if (data.length < period) {
      return { name: 'AROON', value: null };
    }

    const recentData = data.slice(-period);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);

    const highestIndex = highs.indexOf(max(highs));
    const lowestIndex = lows.indexOf(min(lows));

    const aroonUp = ((period - (period - 1 - highestIndex)) / period) * 100;
    const aroonDown = ((period - (period - 1 - lowestIndex)) / period) * 100;
    const aroonOscillator = aroonUp - aroonDown;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (aroonUp > 70 && aroonDown < 30) signal = 'bullish';
    if (aroonDown > 70 && aroonUp < 30) signal = 'bearish';

    return {
      name: 'AROON',
      value: aroonOscillator,
      signal,
      strength: Math.abs(aroonOscillator),
      metadata: { aroonUp, aroonDown },
    };
  }

  /**
   * Volume Weighted Moving Average (VWMA)
   */
  calculateVWMA(data: OHLCV[], period = 20): IndicatorResult {
    if (data.length < period) {
      return { name: 'VWMA', value: null };
    }

    const recentData = data.slice(-period);
    const sumPV = sum(recentData.map(d => d.close * d.volume));
    const sumV = sum(recentData.map(d => d.volume));
    const vwma = sumPV / sumV;

    const currentPrice = data[data.length - 1].close;

    return {
      name: 'VWMA',
      value: vwma,
      signal: currentPrice > vwma ? 'bullish' : 'bearish',
      strength: Math.abs((currentPrice - vwma) / vwma * 100),
    };
  }

  // ==========================================================================
  // MOMENTUM INDICATORS
  // ==========================================================================

  /**
   * Relative Strength Index (RSI)
   */
  calculateRSI(data: OHLCV[], period = 14): IndicatorResult {
    if (data.length < period + 1) {
      return { name: 'RSI', value: null };
    }

    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? -c : 0);

    let avgGain = mean(gains.slice(0, period));
    let avgLoss = mean(losses.slice(0, period));

    const rsiValues: number[] = [];

    for (let i = period; i < changes.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(rsi);
    }

    const currentRsi = rsiValues[rsiValues.length - 1];

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentRsi < 30) signal = 'bullish'; // Oversold
    if (currentRsi > 70) signal = 'bearish'; // Overbought

    return {
      name: 'RSI',
      value: currentRsi,
      values: rsiValues,
      signal,
      strength: currentRsi < 30 ? 30 - currentRsi : currentRsi > 70 ? currentRsi - 70 : 0,
      metadata: {
        overbought: currentRsi > 70,
        oversold: currentRsi < 30,
      },
    };
  }

  /**
   * Stochastic Oscillator
   */
  calculateStochastic(data: OHLCV[], k = 14, d = 3, smooth = 3): IndicatorResult {
    if (data.length < k + d + smooth) {
      return { name: 'STOCHASTIC', value: null };
    }

    const kValues: number[] = [];

    for (let i = k - 1; i < data.length; i++) {
      const period = data.slice(i - k + 1, i + 1);
      const high = max(period.map(d => d.high));
      const low = min(period.map(d => d.low));
      const close = data[i].close;

      kValues.push(high === low ? 50 : ((close - low) / (high - low)) * 100);
    }

    // Smooth %K
    const smoothK: number[] = [];
    for (let i = smooth - 1; i < kValues.length; i++) {
      smoothK.push(mean(kValues.slice(i - smooth + 1, i + 1)));
    }

    // Calculate %D (SMA of smooth %K)
    const dValues: number[] = [];
    for (let i = d - 1; i < smoothK.length; i++) {
      dValues.push(mean(smoothK.slice(i - d + 1, i + 1)));
    }

    const currentK = smoothK[smoothK.length - 1];
    const currentD = dValues[dValues.length - 1];

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentK < 20 && currentK > currentD) signal = 'bullish';
    if (currentK > 80 && currentK < currentD) signal = 'bearish';

    return {
      name: 'STOCHASTIC',
      value: currentK,
      signal,
      strength: currentK < 20 ? 20 - currentK : currentK > 80 ? currentK - 80 : 0,
      metadata: {
        k: currentK,
        d: currentD,
        overbought: currentK > 80,
        oversold: currentK < 20,
      },
    };
  }

  /**
   * Stochastic RSI
   */
  calculateStochRSI(data: OHLCV[], period = 14, k = 3, d = 3): IndicatorResult {
    const rsiResult = this.calculateRSI(data, period);
    if (!rsiResult.values || rsiResult.values.length < period) {
      return { name: 'STOCH_RSI', value: null };
    }

    const rsiValues = rsiResult.values;
    const stochRsiValues: number[] = [];

    for (let i = period - 1; i < rsiValues.length; i++) {
      const periodRsi = rsiValues.slice(i - period + 1, i + 1);
      const highRsi = max(periodRsi);
      const lowRsi = min(periodRsi);

      stochRsiValues.push(
        highRsi === lowRsi ? 50 : ((rsiValues[i] - lowRsi) / (highRsi - lowRsi)) * 100
      );
    }

    // Smooth with K
    const kValues: number[] = [];
    for (let i = k - 1; i < stochRsiValues.length; i++) {
      kValues.push(mean(stochRsiValues.slice(i - k + 1, i + 1)));
    }

    // D line
    const dValues: number[] = [];
    for (let i = d - 1; i < kValues.length; i++) {
      dValues.push(mean(kValues.slice(i - d + 1, i + 1)));
    }

    const currentK = kValues[kValues.length - 1];
    const currentD = dValues[dValues.length - 1];

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentK < 20 && currentK > currentD) signal = 'bullish';
    if (currentK > 80 && currentK < currentD) signal = 'bearish';

    return {
      name: 'STOCH_RSI',
      value: currentK,
      signal,
      strength: currentK < 20 ? 20 - currentK : currentK > 80 ? currentK - 80 : 0,
      metadata: { k: currentK, d: currentD },
    };
  }

  /**
   * Commodity Channel Index (CCI)
   */
  calculateCCI(data: OHLCV[], period = 20): IndicatorResult {
    if (data.length < period) {
      return { name: 'CCI', value: null };
    }

    const typicalPrices = data.map(d => typicalPrice(d));
    const recentTP = typicalPrices.slice(-period);
    const sma = mean(recentTP);
    const meanDeviation = mean(recentTP.map(tp => Math.abs(tp - sma)));

    const cci = meanDeviation === 0 ? 0 : (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (cci < -100) signal = 'bullish';
    if (cci > 100) signal = 'bearish';

    return {
      name: 'CCI',
      value: cci,
      signal,
      strength: Math.abs(cci) > 100 ? Math.abs(cci) - 100 : 0,
      metadata: {
        overbought: cci > 100,
        oversold: cci < -100,
      },
    };
  }

  /**
   * Williams %R
   */
  calculateWilliamsR(data: OHLCV[], period = 14): IndicatorResult {
    if (data.length < period) {
      return { name: 'WILLIAMS_R', value: null };
    }

    const recentData = data.slice(-period);
    const high = max(recentData.map(d => d.high));
    const low = min(recentData.map(d => d.low));
    const close = data[data.length - 1].close;

    const williamsR = high === low ? -50 : ((high - close) / (high - low)) * -100;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (williamsR < -80) signal = 'bullish';
    if (williamsR > -20) signal = 'bearish';

    return {
      name: 'WILLIAMS_R',
      value: williamsR,
      signal,
      strength: williamsR < -80 ? Math.abs(williamsR + 80) : williamsR > -20 ? Math.abs(williamsR + 20) : 0,
    };
  }

  /**
   * Rate of Change (ROC)
   */
  calculateROC(data: OHLCV[], period = 12): IndicatorResult {
    if (data.length < period + 1) {
      return { name: 'ROC', value: null };
    }

    const currentClose = data[data.length - 1].close;
    const pastClose = data[data.length - 1 - period].close;
    const roc = ((currentClose - pastClose) / pastClose) * 100;

    return {
      name: 'ROC',
      value: roc,
      signal: roc > 0 ? 'bullish' : roc < 0 ? 'bearish' : 'neutral',
      strength: Math.abs(roc),
    };
  }

  /**
   * Money Flow Index (MFI)
   */
  calculateMFI(data: OHLCV[], period = 14): IndicatorResult {
    if (data.length < period + 1) {
      return { name: 'MFI', value: null };
    }

    const typicalPrices = data.map(d => typicalPrice(d));
    const moneyFlows = data.map((d, i) => typicalPrices[i] * d.volume);

    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let i = data.length - period; i < data.length; i++) {
      if (typicalPrices[i] > typicalPrices[i - 1]) {
        positiveFlow += moneyFlows[i];
      } else {
        negativeFlow += moneyFlows[i];
      }
    }

    const mfi = negativeFlow === 0 ? 100 : 100 - (100 / (1 + positiveFlow / negativeFlow));

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (mfi < 20) signal = 'bullish';
    if (mfi > 80) signal = 'bearish';

    return {
      name: 'MFI',
      value: mfi,
      signal,
      strength: mfi < 20 ? 20 - mfi : mfi > 80 ? mfi - 80 : 0,
    };
  }

  /**
   * Ultimate Oscillator
   */
  calculateUltimate(data: OHLCV[], short = 7, medium = 14, long = 28): IndicatorResult {
    if (data.length < long + 1) {
      return { name: 'ULTIMATE', value: null };
    }

    const bp: number[] = []; // Buying Pressure
    const tr: number[] = []; // True Range

    for (let i = 1; i < data.length; i++) {
      bp.push(data[i].close - Math.min(data[i].low, data[i - 1].close));
      tr.push(Math.max(data[i].high, data[i - 1].close) - Math.min(data[i].low, data[i - 1].close));
    }

    const avgShort = sum(bp.slice(-short)) / sum(tr.slice(-short));
    const avgMedium = sum(bp.slice(-medium)) / sum(tr.slice(-medium));
    const avgLong = sum(bp.slice(-long)) / sum(tr.slice(-long));

    const uo = ((avgShort * 4) + (avgMedium * 2) + avgLong) / 7 * 100;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (uo < 30) signal = 'bullish';
    if (uo > 70) signal = 'bearish';

    return {
      name: 'ULTIMATE',
      value: uo,
      signal,
      strength: uo < 30 ? 30 - uo : uo > 70 ? uo - 70 : 0,
    };
  }

  /**
   * True Strength Index (TSI)
   */
  calculateTSI(data: OHLCV[], longPeriod = 25, shortPeriod = 13, signalPeriod = 13): IndicatorResult {
    if (data.length < longPeriod + shortPeriod) {
      return { name: 'TSI', value: null };
    }

    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    // Double smooth the price change
    const smoothChanges = this.doubleSmooth(changes, longPeriod, shortPeriod);
    const absChanges = changes.map(c => Math.abs(c));
    const smoothAbsChanges = this.doubleSmooth(absChanges, longPeriod, shortPeriod);

    const tsi = smoothAbsChanges !== 0 ? (smoothChanges / smoothAbsChanges) * 100 : 0;

    return {
      name: 'TSI',
      value: tsi,
      signal: tsi > 0 ? 'bullish' : 'bearish',
      strength: Math.abs(tsi),
    };
  }

  private doubleSmooth(values: number[], long: number, short: number): number {
    // First EMA
    const multiplier1 = 2 / (long + 1);
    let ema1 = mean(values.slice(0, long));
    for (let i = long; i < values.length; i++) {
      ema1 = (values[i] - ema1) * multiplier1 + ema1;
    }

    // Second EMA
    const multiplier2 = 2 / (short + 1);
    let ema2 = ema1;
    for (let i = 0; i < short; i++) {
      ema2 = (ema1 - ema2) * multiplier2 + ema2;
    }

    return ema2;
  }

  // ==========================================================================
  // VOLATILITY INDICATORS
  // ==========================================================================

  /**
   * Bollinger Bands
   */
  calculateBollinger(data: OHLCV[], period = 20, stdDev = 2): IndicatorResult {
    if (data.length < period) {
      return { name: 'BOLLINGER', value: null };
    }

    const closes = data.slice(-period).map(d => d.close);
    const sma = mean(closes);
    const stdDeviation = std(closes);

    const upper = sma + (stdDev * stdDeviation);
    const lower = sma - (stdDev * stdDeviation);
    const currentPrice = data[data.length - 1].close;

    // %B indicator (position within bands)
    const percentB = (currentPrice - lower) / (upper - lower);

    // Bandwidth
    const bandwidth = ((upper - lower) / sma) * 100;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentPrice < lower) signal = 'bullish';
    if (currentPrice > upper) signal = 'bearish';

    return {
      name: 'BOLLINGER',
      value: percentB * 100,
      signal,
      strength: percentB < 0 ? Math.abs(percentB) * 100 : percentB > 1 ? (percentB - 1) * 100 : 0,
      metadata: {
        upper,
        middle: sma,
        lower,
        percentB,
        bandwidth,
      },
    };
  }

  /**
   * Average True Range (ATR)
   */
  calculateATR(data: OHLCV[], period = 14): IndicatorResult {
    if (data.length < period + 1) {
      return { name: 'ATR', value: null };
    }

    const trValues: number[] = [];
    for (let i = 1; i < data.length; i++) {
      trValues.push(trueRange(data[i], data[i - 1]));
    }

    // Wilder's smoothing
    let atr = mean(trValues.slice(0, period));
    const atrValues: number[] = [atr];

    for (let i = period; i < trValues.length; i++) {
      atr = (atr * (period - 1) + trValues[i]) / period;
      atrValues.push(atr);
    }

    const currentPrice = data[data.length - 1].close;
    const atrPercent = (atr / currentPrice) * 100;

    return {
      name: 'ATR',
      value: atr,
      values: atrValues,
      signal: 'neutral',
      strength: atrPercent,
      metadata: {
        atrPercent,
        volatility: atrPercent > 3 ? 'high' : atrPercent > 1.5 ? 'medium' : 'low',
      },
    };
  }

  /**
   * Keltner Channel
   */
  calculateKeltner(data: OHLCV[], period = 20, atrPeriod = 10, multiplier = 2): IndicatorResult {
    const emaResult = this.calculateEMA(data, period);
    const atrResult = this.calculateATR(data, atrPeriod);

    if (emaResult.value === null || atrResult.value === null) {
      return { name: 'KELTNER', value: null };
    }

    const middle = emaResult.value;
    const upper = middle + (multiplier * atrResult.value);
    const lower = middle - (multiplier * atrResult.value);
    const currentPrice = data[data.length - 1].close;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentPrice < lower) signal = 'bullish';
    if (currentPrice > upper) signal = 'bearish';

    return {
      name: 'KELTNER',
      value: (currentPrice - lower) / (upper - lower) * 100,
      signal,
      metadata: { upper, middle, lower },
    };
  }

  /**
   * Donchian Channel
   */
  calculateDonchian(data: OHLCV[], period = 20): IndicatorResult {
    if (data.length < period) {
      return { name: 'DONCHIAN', value: null };
    }

    const recentData = data.slice(-period);
    const upper = max(recentData.map(d => d.high));
    const lower = min(recentData.map(d => d.low));
    const middle = (upper + lower) / 2;
    const currentPrice = data[data.length - 1].close;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentPrice === upper) signal = 'bullish';
    if (currentPrice === lower) signal = 'bearish';

    return {
      name: 'DONCHIAN',
      value: middle,
      signal,
      metadata: { upper, middle, lower, width: upper - lower },
    };
  }

  /**
   * Historical Volatility
   */
  calculateHistoricalVolatility(data: OHLCV[], period = 21): IndicatorResult {
    if (data.length < period + 1) {
      return { name: 'HISTORICAL_VOLATILITY', value: null };
    }

    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      returns.push(Math.log(data[i].close / data[i - 1].close));
    }

    const recentReturns = returns.slice(-period);
    const hv = std(recentReturns) * Math.sqrt(252) * 100; // Annualized

    return {
      name: 'HISTORICAL_VOLATILITY',
      value: hv,
      signal: 'neutral',
      strength: hv,
      metadata: {
        volatility: hv > 50 ? 'high' : hv > 25 ? 'medium' : 'low',
      },
    };
  }

  /**
   * Squeeze Momentum (Bollinger Bands inside Keltner Channel)
   */
  calculateSqueeze(data: OHLCV[]): IndicatorResult {
    const bbResult = this.calculateBollinger(data, 20, 2);
    const kcResult = this.calculateKeltner(data, 20, 20, 1.5);

    if (!bbResult.metadata || !kcResult.metadata) {
      return { name: 'SQUEEZE', value: null };
    }

    const bbUpper = bbResult.metadata.upper;
    const bbLower = bbResult.metadata.lower;
    const kcUpper = kcResult.metadata.upper;
    const kcLower = kcResult.metadata.lower;

    const isSqueezeOn = bbLower > kcLower && bbUpper < kcUpper;

    return {
      name: 'SQUEEZE',
      value: isSqueezeOn ? 1 : 0,
      signal: isSqueezeOn ? 'neutral' : 'bullish',
      metadata: {
        squeezeOn: isSqueezeOn,
        description: isSqueezeOn ? 'Low volatility - potential breakout coming' : 'Normal volatility',
      },
    };
  }

  // ==========================================================================
  // VOLUME INDICATORS
  // ==========================================================================

  /**
   * On-Balance Volume (OBV)
   */
  calculateOBV(data: OHLCV[]): IndicatorResult {
    if (data.length < 2) {
      return { name: 'OBV', value: null };
    }

    let obv = 0;
    const obvValues: number[] = [obv];

    for (let i = 1; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) {
        obv += data[i].volume;
      } else if (data[i].close < data[i - 1].close) {
        obv -= data[i].volume;
      }
      obvValues.push(obv);
    }

    // Check OBV trend (last 5 values)
    const recentObv = obvValues.slice(-5);
    const obvTrend = recentObv[recentObv.length - 1] > recentObv[0];

    return {
      name: 'OBV',
      value: obv,
      values: obvValues,
      signal: obvTrend ? 'bullish' : 'bearish',
    };
  }

  /**
   * Volume Weighted Average Price (VWAP)
   */
  calculateVWAP(data: OHLCV[]): IndicatorResult {
    if (data.length < 1) {
      return { name: 'VWAP', value: null };
    }

    let cumulativeTPV = 0;
    let cumulativeVolume = 0;
    const vwapValues: number[] = [];

    for (const candle of data) {
      const tp = typicalPrice(candle);
      cumulativeTPV += tp * candle.volume;
      cumulativeVolume += candle.volume;
      vwapValues.push(cumulativeTPV / cumulativeVolume);
    }

    const vwap = vwapValues[vwapValues.length - 1];
    const currentPrice = data[data.length - 1].close;

    return {
      name: 'VWAP',
      value: vwap,
      values: vwapValues,
      signal: currentPrice > vwap ? 'bullish' : 'bearish',
      strength: Math.abs((currentPrice - vwap) / vwap * 100),
    };
  }

  /**
   * Accumulation/Distribution Line
   */
  calculateAD(data: OHLCV[]): IndicatorResult {
    if (data.length < 1) {
      return { name: 'AD', value: null };
    }

    let ad = 0;
    const adValues: number[] = [];

    for (const candle of data) {
      const mfm = candle.high === candle.low ? 0 :
        ((candle.close - candle.low) - (candle.high - candle.close)) / (candle.high - candle.low);
      ad += mfm * candle.volume;
      adValues.push(ad);
    }

    // Check A/D trend
    const recentAd = adValues.slice(-5);
    const adTrend = recentAd[recentAd.length - 1] > recentAd[0];

    return {
      name: 'AD',
      value: ad,
      values: adValues,
      signal: adTrend ? 'bullish' : 'bearish',
    };
  }

  /**
   * Chaikin Money Flow (CMF)
   */
  calculateCMF(data: OHLCV[], period = 20): IndicatorResult {
    if (data.length < period) {
      return { name: 'CMF', value: null };
    }

    const recentData = data.slice(-period);
    let mfvSum = 0;
    let volumeSum = 0;

    for (const candle of recentData) {
      const mfm = candle.high === candle.low ? 0 :
        ((candle.close - candle.low) - (candle.high - candle.close)) / (candle.high - candle.low);
      mfvSum += mfm * candle.volume;
      volumeSum += candle.volume;
    }

    const cmf = volumeSum === 0 ? 0 : mfvSum / volumeSum;

    return {
      name: 'CMF',
      value: cmf,
      signal: cmf > 0.05 ? 'bullish' : cmf < -0.05 ? 'bearish' : 'neutral',
      strength: Math.abs(cmf) * 100,
    };
  }

  /**
   * Force Index
   */
  calculateForceIndex(data: OHLCV[], period = 13): IndicatorResult {
    if (data.length < period + 1) {
      return { name: 'FORCE_INDEX', value: null };
    }

    const forceValues: number[] = [];
    for (let i = 1; i < data.length; i++) {
      forceValues.push((data[i].close - data[i - 1].close) * data[i].volume);
    }

    // EMA of force
    const multiplier = 2 / (period + 1);
    let emaForce = mean(forceValues.slice(0, period));

    for (let i = period; i < forceValues.length; i++) {
      emaForce = (forceValues[i] - emaForce) * multiplier + emaForce;
    }

    return {
      name: 'FORCE_INDEX',
      value: emaForce,
      signal: emaForce > 0 ? 'bullish' : 'bearish',
      strength: Math.abs(emaForce) / data[data.length - 1].volume * 100,
    };
  }

  /**
   * Ease of Movement (EOM)
   */
  calculateEOM(data: OHLCV[], period = 14): IndicatorResult {
    if (data.length < period + 1) {
      return { name: 'EOM', value: null };
    }

    const eomValues: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const dm = ((data[i].high + data[i].low) / 2) - ((data[i - 1].high + data[i - 1].low) / 2);
      const br = (data[i].volume / 100000000) / (data[i].high - data[i].low || 1);
      eomValues.push(dm / br);
    }

    const eom = mean(eomValues.slice(-period));

    return {
      name: 'EOM',
      value: eom,
      signal: eom > 0 ? 'bullish' : 'bearish',
    };
  }

  /**
   * Price Volume Trend (PVT)
   */
  calculatePVT(data: OHLCV[]): IndicatorResult {
    if (data.length < 2) {
      return { name: 'PVT', value: null };
    }

    let pvt = 0;
    const pvtValues: number[] = [pvt];

    for (let i = 1; i < data.length; i++) {
      const change = (data[i].close - data[i - 1].close) / data[i - 1].close;
      pvt += change * data[i].volume;
      pvtValues.push(pvt);
    }

    const recentPvt = pvtValues.slice(-5);
    const pvtTrend = recentPvt[recentPvt.length - 1] > recentPvt[0];

    return {
      name: 'PVT',
      value: pvt,
      values: pvtValues,
      signal: pvtTrend ? 'bullish' : 'bearish',
    };
  }

  /**
   * Relative Volume
   */
  calculateRelativeVolume(data: OHLCV[], period = 20): IndicatorResult {
    if (data.length < period) {
      return { name: 'RELATIVE_VOLUME', value: null };
    }

    const avgVolume = mean(data.slice(-period - 1, -1).map(d => d.volume));
    const currentVolume = data[data.length - 1].volume;
    const rvol = currentVolume / avgVolume;

    return {
      name: 'RELATIVE_VOLUME',
      value: rvol,
      signal: rvol > 2 ? 'bullish' : rvol > 1.5 ? 'neutral' : 'bearish',
      strength: rvol * 10,
      metadata: {
        volumeStatus: rvol > 2 ? 'high' : rvol > 1 ? 'normal' : 'low',
      },
    };
  }

  /**
   * Volume Spike Detection
   */
  calculateVolumeSpike(data: OHLCV[], threshold = 2): IndicatorResult {
    if (data.length < 21) {
      return { name: 'VOLUME_SPIKE', value: null };
    }

    const avgVolume = mean(data.slice(-21, -1).map(d => d.volume));
    const currentVolume = data[data.length - 1].volume;
    const ratio = currentVolume / avgVolume;
    const isSpike = ratio > threshold;

    return {
      name: 'VOLUME_SPIKE',
      value: ratio,
      signal: isSpike ? 'bullish' : 'neutral',
      metadata: {
        isSpike,
        ratio,
        threshold,
      },
    };
  }

  // ==========================================================================
  // ADVANCED INDICATORS
  // ==========================================================================

  /**
   * Order Flow Imbalance (Simulated from OHLCV)
   */
  calculateOrderFlowImbalance(data: OHLCV[]): IndicatorResult {
    if (data.length < 10) {
      return { name: 'ORDER_FLOW_IMBALANCE', value: null };
    }

    // Estimate buying/selling pressure from candle structure
    let buyPressure = 0;
    let sellPressure = 0;

    for (const candle of data.slice(-10)) {
      const bodySize = Math.abs(candle.close - candle.open);
      const totalRange = candle.high - candle.low;

      if (candle.close > candle.open) {
        // Bullish candle
        buyPressure += (bodySize / totalRange) * candle.volume;
        sellPressure += ((totalRange - bodySize) / totalRange / 2) * candle.volume;
      } else {
        // Bearish candle
        sellPressure += (bodySize / totalRange) * candle.volume;
        buyPressure += ((totalRange - bodySize) / totalRange / 2) * candle.volume;
      }
    }

    const imbalance = (buyPressure - sellPressure) / (buyPressure + sellPressure);

    return {
      name: 'ORDER_FLOW_IMBALANCE',
      value: imbalance,
      signal: imbalance > 0.2 ? 'bullish' : imbalance < -0.2 ? 'bearish' : 'neutral',
      strength: Math.abs(imbalance) * 100,
      metadata: {
        buyPressure,
        sellPressure,
      },
    };
  }

  /**
   * Bid-Ask Spread Estimate
   */
  calculateBidAskSpread(data: OHLCV[]): IndicatorResult {
    if (data.length < 1) {
      return { name: 'BID_ASK_SPREAD', value: null };
    }

    // Estimate spread from high-low range relative to typical spreads
    const recentData = data.slice(-20);
    const avgRange = mean(recentData.map(d => (d.high - d.low) / d.close * 100));
    const estimatedSpread = avgRange * 0.1; // Rough estimate

    return {
      name: 'BID_ASK_SPREAD',
      value: estimatedSpread,
      signal: estimatedSpread < 0.1 ? 'bullish' : estimatedSpread > 0.5 ? 'bearish' : 'neutral',
      metadata: {
        spreadBps: estimatedSpread * 100,
        liquidity: estimatedSpread < 0.1 ? 'high' : 'normal',
      },
    };
  }

  /**
   * Liquidity Score
   */
  calculateLiquidityScore(data: OHLCV[]): IndicatorResult {
    if (data.length < 20) {
      return { name: 'LIQUIDITY_SCORE', value: null };
    }

    const recentData = data.slice(-20);
    const avgVolume = mean(recentData.map(d => d.volume));
    const avgRange = mean(recentData.map(d => (d.high - d.low) / d.close));

    // Higher volume and lower range = better liquidity
    const volumeScore = Math.min(avgVolume / 1000000, 100); // Normalize
    const rangeScore = Math.max(100 - avgRange * 1000, 0);
    const liquidityScore = (volumeScore + rangeScore) / 2;

    return {
      name: 'LIQUIDITY_SCORE',
      value: liquidityScore,
      signal: liquidityScore > 70 ? 'bullish' : liquidityScore < 30 ? 'bearish' : 'neutral',
      strength: liquidityScore,
      metadata: {
        volumeScore,
        rangeScore,
      },
    };
  }

  /**
   * Slippage Estimate
   */
  calculateSlippageEstimate(data: OHLCV[], orderSize = 10000): IndicatorResult {
    if (data.length < 20) {
      return { name: 'SLIPPAGE_ESTIMATE', value: null };
    }

    const avgVolume = mean(data.slice(-20).map(d => d.volume));
    const avgPrice = data[data.length - 1].close;
    const avgRange = mean(data.slice(-20).map(d => (d.high - d.low)));

    // Estimate slippage based on order size relative to average volume
    const volumeImpact = (orderSize / avgPrice) / avgVolume;
    const estimatedSlippage = volumeImpact * avgRange;
    const slippageBps = (estimatedSlippage / avgPrice) * 10000;

    return {
      name: 'SLIPPAGE_ESTIMATE',
      value: slippageBps,
      signal: slippageBps < 10 ? 'bullish' : slippageBps > 50 ? 'bearish' : 'neutral',
      metadata: {
        estimatedSlippageUSD: estimatedSlippage,
        slippageBps,
      },
    };
  }

  /**
   * Market Impact Estimate
   */
  calculateMarketImpact(data: OHLCV[]): IndicatorResult {
    const atrResult = this.calculateATR(data, 14);
    const liquidityResult = this.calculateLiquidityScore(data);

    if (atrResult.value === null || liquidityResult.value === null) {
      return { name: 'MARKET_IMPACT', value: null };
    }

    // Lower ATR and higher liquidity = lower market impact
    const impactScore = (atrResult.strength || 0) / (liquidityResult.value / 100);

    return {
      name: 'MARKET_IMPACT',
      value: impactScore,
      signal: impactScore < 1 ? 'bullish' : impactScore > 3 ? 'bearish' : 'neutral',
      metadata: {
        atrPercent: atrResult.strength,
        liquidityScore: liquidityResult.value,
      },
    };
  }

  /**
   * Whale Activity Detection
   */
  calculateWhaleActivity(data: OHLCV[]): IndicatorResult {
    if (data.length < 30) {
      return { name: 'WHALE_ACTIVITY', value: null };
    }

    const avgVolume = mean(data.slice(0, -5).map(d => d.volume));
    const recentData = data.slice(-5);

    let whaleScore = 0;
    for (const candle of recentData) {
      if (candle.volume > avgVolume * 3) {
        // Large volume spike
        whaleScore += 20;

        // Check if it's absorption (large volume, small price change)
        const priceChange = Math.abs(candle.close - candle.open) / candle.open;
        if (priceChange < 0.005 && candle.volume > avgVolume * 5) {
          whaleScore += 30; // Likely whale accumulation/distribution
        }
      }
    }

    return {
      name: 'WHALE_ACTIVITY',
      value: Math.min(whaleScore, 100),
      signal: whaleScore > 50 ? 'bullish' : 'neutral',
      metadata: {
        detected: whaleScore > 30,
        confidence: whaleScore,
      },
    };
  }

  /**
   * Spoofing Detection (Simulated)
   */
  calculateSpoofingDetection(data: OHLCV[]): IndicatorResult {
    if (data.length < 20) {
      return { name: 'SPOOFING_DETECTION', value: null };
    }

    // Look for patterns: large wicks with volume but no follow-through
    let spoofingScore = 0;
    const recentData = data.slice(-10);

    for (let i = 1; i < recentData.length; i++) {
      const candle = recentData[i];
      const prevCandle = recentData[i - 1];

      const bodySize = Math.abs(candle.close - candle.open);
      const totalRange = candle.high - candle.low;
      const wickRatio = (totalRange - bodySize) / totalRange;

      // Large wicks with reversal
      if (wickRatio > 0.7) {
        const reversal = (candle.close - prevCandle.close) * (candle.open - prevCandle.close) < 0;
        if (reversal) {
          spoofingScore += 15;
        }
      }
    }

    return {
      name: 'SPOOFING_DETECTION',
      value: spoofingScore,
      signal: spoofingScore > 30 ? 'bearish' : 'neutral',
      metadata: {
        warning: spoofingScore > 30,
        riskLevel: spoofingScore > 50 ? 'high' : spoofingScore > 30 ? 'medium' : 'low',
      },
    };
  }

  // ==========================================================================
  // BATCH CALCULATION
  // ==========================================================================

  /**
   * Calculate all indicators for a given dataset
   */
  calculateAll(data: OHLCV[], indicatorNames: string[]): Map<string, IndicatorResult> {
    const results = new Map<string, IndicatorResult>();

    for (const name of indicatorNames) {
      try {
        const result = this.calculateIndicator(name, data);
        if (result) {
          results.set(name, result);
        }
      } catch (error) {
        this.logger.warn(`Failed to calculate ${name}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Calculate a single indicator by name
   */
  calculateIndicator(name: string, data: OHLCV[], params?: Record<string, number>): IndicatorResult | null {
    const upperName = name.toUpperCase();

    // Trend indicators
    if (upperName.startsWith('EMA_')) {
      const period = parseInt(upperName.split('_')[1]) || 20;
      return this.calculateEMA(data, period);
    }
    if (upperName.startsWith('SMA_')) {
      const period = parseInt(upperName.split('_')[1]) || 20;
      return this.calculateSMA(data, period);
    }
    if (upperName === 'MACD') return this.calculateMACD(data, params?.fast, params?.slow, params?.signal);
    if (upperName === 'ADX') return this.calculateADX(data, params?.period);
    if (upperName === 'ICHIMOKU') return this.calculateIchimoku(data);
    if (upperName === 'SUPERTREND') return this.calculateSupertrend(data, params?.period, params?.multiplier);
    if (upperName === 'PSAR') return this.calculatePSAR(data, params?.af, params?.maxAf);
    if (upperName === 'AROON') return this.calculateAroon(data, params?.period);
    if (upperName === 'VWMA') return this.calculateVWMA(data, params?.period);

    // Momentum indicators
    if (upperName === 'RSI') return this.calculateRSI(data, params?.period);
    if (upperName === 'STOCHASTIC') return this.calculateStochastic(data, params?.k, params?.d, params?.smooth);
    if (upperName === 'STOCH_RSI') return this.calculateStochRSI(data, params?.period, params?.k, params?.d);
    if (upperName === 'CCI') return this.calculateCCI(data, params?.period);
    if (upperName === 'WILLIAMS_R') return this.calculateWilliamsR(data, params?.period);
    if (upperName === 'ROC') return this.calculateROC(data, params?.period);
    if (upperName === 'MFI') return this.calculateMFI(data, params?.period);
    if (upperName === 'ULTIMATE') return this.calculateUltimate(data, params?.short, params?.medium, params?.long);
    if (upperName === 'TSI') return this.calculateTSI(data, params?.long, params?.short, params?.signal);

    // Volatility indicators
    if (upperName === 'BOLLINGER') return this.calculateBollinger(data, params?.period, params?.std);
    if (upperName === 'ATR') return this.calculateATR(data, params?.period);
    if (upperName === 'KELTNER') return this.calculateKeltner(data, params?.period, params?.atr, params?.multiplier);
    if (upperName === 'DONCHIAN') return this.calculateDonchian(data, params?.period);
    if (upperName === 'HISTORICAL_VOLATILITY') return this.calculateHistoricalVolatility(data, params?.period);
    if (upperName === 'SQUEEZE') return this.calculateSqueeze(data);

    // Volume indicators
    if (upperName === 'OBV') return this.calculateOBV(data);
    if (upperName === 'VWAP') return this.calculateVWAP(data);
    if (upperName === 'AD') return this.calculateAD(data);
    if (upperName === 'CMF') return this.calculateCMF(data, params?.period);
    if (upperName === 'FORCE_INDEX') return this.calculateForceIndex(data, params?.period);
    if (upperName === 'EOM') return this.calculateEOM(data, params?.period);
    if (upperName === 'PVT') return this.calculatePVT(data);
    if (upperName === 'RELATIVE_VOLUME') return this.calculateRelativeVolume(data, params?.period);
    if (upperName === 'VOLUME_SPIKE') return this.calculateVolumeSpike(data, params?.threshold);

    // Advanced indicators
    if (upperName === 'ORDER_FLOW_IMBALANCE') return this.calculateOrderFlowImbalance(data);
    if (upperName === 'BID_ASK_SPREAD') return this.calculateBidAskSpread(data);
    if (upperName === 'LIQUIDITY_SCORE') return this.calculateLiquidityScore(data);
    if (upperName === 'SLIPPAGE_ESTIMATE') return this.calculateSlippageEstimate(data, params?.orderSize);
    if (upperName === 'MARKET_IMPACT') return this.calculateMarketImpact(data);
    if (upperName === 'WHALE_ACTIVITY') return this.calculateWhaleActivity(data);
    if (upperName === 'SPOOFING_DETECTION') return this.calculateSpoofingDetection(data);

    // Candlestick pattern detection
    if (upperName === 'CANDLESTICK_PATTERNS') return this.detectCandlestickPatterns(data);

    this.logger.warn(`Unknown indicator: ${name}`);
    return null;
  }

  // ==========================================================================
  // CANDLESTICK PATTERN DETECTION
  // ==========================================================================

  /**
   * Detect all candlestick patterns in the data
   * Returns array of detected patterns with their significance
   */
  detectCandlestickPatterns(data: OHLCV[]): IndicatorResult {
    if (data.length < 5) {
      return {
        name: 'CANDLESTICK_PATTERNS',
        value: 0,
        signal: 'neutral',
        strength: 0,
        metadata: { patterns: [], summary: 'Insufficient data' }
      };
    }

    const patterns: CandlestickPattern[] = [];
    const lastCandles = data.slice(-10); // Analyze last 10 candles

    // Single candle patterns (check last 3 candles)
    for (let i = Math.max(0, lastCandles.length - 3); i < lastCandles.length; i++) {
      const candle = lastCandles[i];
      const prevCandle = i > 0 ? lastCandles[i - 1] : null;
      const candleIndex = data.length - (lastCandles.length - i);

      // Doji
      const doji = this.isDoji(candle);
      if (doji) {
        patterns.push({
          name: 'Doji',
          type: 'reversal',
          direction: 'neutral',
          significance: 'medium',
          candleIndex,
          description: 'Indecision - potential trend reversal'
        });
      }

      // Hammer (bullish reversal at bottom)
      if (this.isHammer(candle)) {
        patterns.push({
          name: 'Hammer',
          type: 'reversal',
          direction: 'bullish',
          significance: 'high',
          candleIndex,
          description: 'Bullish reversal signal at support'
        });
      }

      // Inverted Hammer
      if (this.isInvertedHammer(candle)) {
        patterns.push({
          name: 'Inverted Hammer',
          type: 'reversal',
          direction: 'bullish',
          significance: 'medium',
          candleIndex,
          description: 'Potential bullish reversal'
        });
      }

      // Shooting Star (bearish reversal at top)
      if (this.isShootingStar(candle, prevCandle)) {
        patterns.push({
          name: 'Shooting Star',
          type: 'reversal',
          direction: 'bearish',
          significance: 'high',
          candleIndex,
          description: 'Bearish reversal signal at resistance'
        });
      }

      // Hanging Man (bearish at top)
      if (this.isHangingMan(candle, prevCandle)) {
        patterns.push({
          name: 'Hanging Man',
          type: 'reversal',
          direction: 'bearish',
          significance: 'medium',
          candleIndex,
          description: 'Potential bearish reversal at top'
        });
      }

      // Marubozu (strong trend continuation)
      const marubozu = this.isMarubozu(candle);
      if (marubozu) {
        patterns.push({
          name: marubozu === 'bullish' ? 'Bullish Marubozu' : 'Bearish Marubozu',
          type: 'continuation',
          direction: marubozu,
          significance: 'high',
          candleIndex,
          description: `Strong ${marubozu} momentum`
        });
      }

      // Spinning Top
      if (this.isSpinningTop(candle)) {
        patterns.push({
          name: 'Spinning Top',
          type: 'reversal',
          direction: 'neutral',
          significance: 'low',
          candleIndex,
          description: 'Market indecision'
        });
      }
    }

    // Two candle patterns (check last 4 pairs)
    for (let i = Math.max(1, lastCandles.length - 4); i < lastCandles.length; i++) {
      const current = lastCandles[i];
      const prev = lastCandles[i - 1];
      const candleIndex = data.length - (lastCandles.length - i);

      // Bullish Engulfing
      if (this.isBullishEngulfing(current, prev)) {
        patterns.push({
          name: 'Bullish Engulfing',
          type: 'reversal',
          direction: 'bullish',
          significance: 'high',
          candleIndex,
          description: 'Strong bullish reversal - buyers overwhelm sellers'
        });
      }

      // Bearish Engulfing
      if (this.isBearishEngulfing(current, prev)) {
        patterns.push({
          name: 'Bearish Engulfing',
          type: 'reversal',
          direction: 'bearish',
          significance: 'high',
          candleIndex,
          description: 'Strong bearish reversal - sellers overwhelm buyers'
        });
      }

      // Bullish Harami
      if (this.isBullishHarami(current, prev)) {
        patterns.push({
          name: 'Bullish Harami',
          type: 'reversal',
          direction: 'bullish',
          significance: 'medium',
          candleIndex,
          description: 'Potential bullish reversal - selling pressure weakening'
        });
      }

      // Bearish Harami
      if (this.isBearishHarami(current, prev)) {
        patterns.push({
          name: 'Bearish Harami',
          type: 'reversal',
          direction: 'bearish',
          significance: 'medium',
          candleIndex,
          description: 'Potential bearish reversal - buying pressure weakening'
        });
      }

      // Tweezer Bottom
      if (this.isTweezerBottom(current, prev)) {
        patterns.push({
          name: 'Tweezer Bottom',
          type: 'reversal',
          direction: 'bullish',
          significance: 'medium',
          candleIndex,
          description: 'Double bottom support confirmation'
        });
      }

      // Tweezer Top
      if (this.isTweezerTop(current, prev)) {
        patterns.push({
          name: 'Tweezer Top',
          type: 'reversal',
          direction: 'bearish',
          significance: 'medium',
          candleIndex,
          description: 'Double top resistance confirmation'
        });
      }

      // Piercing Line
      if (this.isPiercingLine(current, prev)) {
        patterns.push({
          name: 'Piercing Line',
          type: 'reversal',
          direction: 'bullish',
          significance: 'medium',
          candleIndex,
          description: 'Bullish reversal - strong buying into weakness'
        });
      }

      // Dark Cloud Cover
      if (this.isDarkCloudCover(current, prev)) {
        patterns.push({
          name: 'Dark Cloud Cover',
          type: 'reversal',
          direction: 'bearish',
          significance: 'medium',
          candleIndex,
          description: 'Bearish reversal - strong selling into strength'
        });
      }
    }

    // Three candle patterns (check last 3 triplets)
    for (let i = Math.max(2, lastCandles.length - 3); i < lastCandles.length; i++) {
      const current = lastCandles[i];
      const middle = lastCandles[i - 1];
      const first = lastCandles[i - 2];
      const candleIndex = data.length - (lastCandles.length - i);

      // Morning Star (bullish reversal)
      if (this.isMorningStar(first, middle, current)) {
        patterns.push({
          name: 'Morning Star',
          type: 'reversal',
          direction: 'bullish',
          significance: 'high',
          candleIndex,
          description: 'Strong bullish reversal pattern'
        });
      }

      // Evening Star (bearish reversal)
      if (this.isEveningStar(first, middle, current)) {
        patterns.push({
          name: 'Evening Star',
          type: 'reversal',
          direction: 'bearish',
          significance: 'high',
          candleIndex,
          description: 'Strong bearish reversal pattern'
        });
      }

      // Three White Soldiers
      if (this.isThreeWhiteSoldiers(first, middle, current)) {
        patterns.push({
          name: 'Three White Soldiers',
          type: 'continuation',
          direction: 'bullish',
          significance: 'high',
          candleIndex,
          description: 'Strong bullish continuation'
        });
      }

      // Three Black Crows
      if (this.isThreeBlackCrows(first, middle, current)) {
        patterns.push({
          name: 'Three Black Crows',
          type: 'continuation',
          direction: 'bearish',
          significance: 'high',
          candleIndex,
          description: 'Strong bearish continuation'
        });
      }
    }

    // Calculate overall signal
    let bullishScore = 0;
    let bearishScore = 0;
    const significanceWeights = { high: 3, medium: 2, low: 1 };

    patterns.forEach(p => {
      const weight = significanceWeights[p.significance];
      if (p.direction === 'bullish') bullishScore += weight;
      if (p.direction === 'bearish') bearishScore += weight;
    });

    const totalScore = bullishScore + bearishScore;
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (totalScore > 0) {
      if (bullishScore > bearishScore * 1.5) {
        signal = 'bullish';
        strength = Math.min(100, (bullishScore / totalScore) * 100);
      } else if (bearishScore > bullishScore * 1.5) {
        signal = 'bearish';
        strength = Math.min(100, (bearishScore / totalScore) * 100);
      } else {
        strength = 50;
      }
    }

    return {
      name: 'CANDLESTICK_PATTERNS',
      value: patterns.length,
      signal,
      strength,
      metadata: {
        patterns,
        bullishScore,
        bearishScore,
        summary: this.generatePatternSummary(patterns)
      }
    };
  }

  // ---- Single Candle Pattern Helpers ----

  private getCandleBody(candle: OHLCV): number {
    return Math.abs(candle.close - candle.open);
  }

  private getCandleRange(candle: OHLCV): number {
    return candle.high - candle.low;
  }

  private getUpperShadow(candle: OHLCV): number {
    return candle.high - Math.max(candle.open, candle.close);
  }

  private getLowerShadow(candle: OHLCV): number {
    return Math.min(candle.open, candle.close) - candle.low;
  }

  private isBullishCandle(candle: OHLCV): boolean {
    return candle.close > candle.open;
  }

  private isBearishCandle(candle: OHLCV): boolean {
    return candle.close < candle.open;
  }

  private isDoji(candle: OHLCV): boolean {
    const body = this.getCandleBody(candle);
    const range = this.getCandleRange(candle);
    return range > 0 && body / range < 0.1; // Body is less than 10% of range
  }

  private isHammer(candle: OHLCV): boolean {
    const body = this.getCandleBody(candle);
    const range = this.getCandleRange(candle);
    const lowerShadow = this.getLowerShadow(candle);
    const upperShadow = this.getUpperShadow(candle);

    return (
      range > 0 &&
      body / range >= 0.1 && body / range <= 0.35 && // Small body
      lowerShadow >= body * 2 && // Long lower shadow
      upperShadow <= body * 0.5 // Small upper shadow
    );
  }

  private isInvertedHammer(candle: OHLCV): boolean {
    const body = this.getCandleBody(candle);
    const range = this.getCandleRange(candle);
    const lowerShadow = this.getLowerShadow(candle);
    const upperShadow = this.getUpperShadow(candle);

    return (
      range > 0 &&
      body / range >= 0.1 && body / range <= 0.35 &&
      upperShadow >= body * 2 &&
      lowerShadow <= body * 0.5
    );
  }

  private isShootingStar(candle: OHLCV, prevCandle: OHLCV | null): boolean {
    if (!prevCandle) return false;

    const body = this.getCandleBody(candle);
    const range = this.getCandleRange(candle);
    const upperShadow = this.getUpperShadow(candle);
    const lowerShadow = this.getLowerShadow(candle);

    // Must be after an uptrend (prev candle bullish)
    const afterUptrend = this.isBullishCandle(prevCandle);

    return (
      afterUptrend &&
      range > 0 &&
      body / range >= 0.1 && body / range <= 0.35 &&
      upperShadow >= body * 2 &&
      lowerShadow <= body * 0.5
    );
  }

  private isHangingMan(candle: OHLCV, prevCandle: OHLCV | null): boolean {
    if (!prevCandle) return false;

    // Same shape as hammer but after uptrend
    const afterUptrend = this.isBullishCandle(prevCandle);
    return afterUptrend && this.isHammer(candle);
  }

  private isMarubozu(candle: OHLCV): 'bullish' | 'bearish' | null {
    const body = this.getCandleBody(candle);
    const range = this.getCandleRange(candle);
    const upperShadow = this.getUpperShadow(candle);
    const lowerShadow = this.getLowerShadow(candle);

    // Body must be at least 95% of range
    if (range === 0 || body / range < 0.95) return null;
    if (upperShadow > range * 0.03 || lowerShadow > range * 0.03) return null;

    return this.isBullishCandle(candle) ? 'bullish' : 'bearish';
  }

  private isSpinningTop(candle: OHLCV): boolean {
    const body = this.getCandleBody(candle);
    const range = this.getCandleRange(candle);
    const upperShadow = this.getUpperShadow(candle);
    const lowerShadow = this.getLowerShadow(candle);

    return (
      range > 0 &&
      body / range >= 0.1 && body / range <= 0.3 &&
      upperShadow >= body * 0.5 &&
      lowerShadow >= body * 0.5
    );
  }

  // ---- Two Candle Pattern Helpers ----

  private isBullishEngulfing(current: OHLCV, prev: OHLCV): boolean {
    return (
      this.isBearishCandle(prev) &&
      this.isBullishCandle(current) &&
      current.open < prev.close &&
      current.close > prev.open &&
      this.getCandleBody(current) > this.getCandleBody(prev) * 1.1
    );
  }

  private isBearishEngulfing(current: OHLCV, prev: OHLCV): boolean {
    return (
      this.isBullishCandle(prev) &&
      this.isBearishCandle(current) &&
      current.open > prev.close &&
      current.close < prev.open &&
      this.getCandleBody(current) > this.getCandleBody(prev) * 1.1
    );
  }

  private isBullishHarami(current: OHLCV, prev: OHLCV): boolean {
    return (
      this.isBearishCandle(prev) &&
      this.isBullishCandle(current) &&
      current.open > prev.close &&
      current.close < prev.open &&
      this.getCandleBody(current) < this.getCandleBody(prev) * 0.5
    );
  }

  private isBearishHarami(current: OHLCV, prev: OHLCV): boolean {
    return (
      this.isBullishCandle(prev) &&
      this.isBearishCandle(current) &&
      current.open < prev.close &&
      current.close > prev.open &&
      this.getCandleBody(current) < this.getCandleBody(prev) * 0.5
    );
  }

  private isTweezerBottom(current: OHLCV, prev: OHLCV): boolean {
    const tolerance = this.getCandleRange(current) * 0.05;
    return (
      this.isBearishCandle(prev) &&
      this.isBullishCandle(current) &&
      Math.abs(current.low - prev.low) <= tolerance
    );
  }

  private isTweezerTop(current: OHLCV, prev: OHLCV): boolean {
    const tolerance = this.getCandleRange(current) * 0.05;
    return (
      this.isBullishCandle(prev) &&
      this.isBearishCandle(current) &&
      Math.abs(current.high - prev.high) <= tolerance
    );
  }

  private isPiercingLine(current: OHLCV, prev: OHLCV): boolean {
    const prevBody = this.getCandleBody(prev);
    const midpoint = prev.close + prevBody / 2;

    return (
      this.isBearishCandle(prev) &&
      this.isBullishCandle(current) &&
      current.open < prev.low &&
      current.close > midpoint &&
      current.close < prev.open
    );
  }

  private isDarkCloudCover(current: OHLCV, prev: OHLCV): boolean {
    const prevBody = this.getCandleBody(prev);
    const midpoint = prev.open + prevBody / 2;

    return (
      this.isBullishCandle(prev) &&
      this.isBearishCandle(current) &&
      current.open > prev.high &&
      current.close < midpoint &&
      current.close > prev.open
    );
  }

  // ---- Three Candle Pattern Helpers ----

  private isMorningStar(first: OHLCV, middle: OHLCV, current: OHLCV): boolean {
    const firstBody = this.getCandleBody(first);
    const middleBody = this.getCandleBody(middle);
    const currentBody = this.getCandleBody(current);

    return (
      this.isBearishCandle(first) &&
      middleBody < firstBody * 0.3 && // Small middle body
      this.isBullishCandle(current) &&
      currentBody > firstBody * 0.5 &&
      current.close > (first.open + first.close) / 2 // Closes above midpoint of first
    );
  }

  private isEveningStar(first: OHLCV, middle: OHLCV, current: OHLCV): boolean {
    const firstBody = this.getCandleBody(first);
    const middleBody = this.getCandleBody(middle);
    const currentBody = this.getCandleBody(current);

    return (
      this.isBullishCandle(first) &&
      middleBody < firstBody * 0.3 &&
      this.isBearishCandle(current) &&
      currentBody > firstBody * 0.5 &&
      current.close < (first.open + first.close) / 2
    );
  }

  private isThreeWhiteSoldiers(first: OHLCV, middle: OHLCV, current: OHLCV): boolean {
    return (
      this.isBullishCandle(first) &&
      this.isBullishCandle(middle) &&
      this.isBullishCandle(current) &&
      middle.open > first.open && middle.close > first.close &&
      current.open > middle.open && current.close > middle.close &&
      this.getUpperShadow(first) < this.getCandleBody(first) * 0.3 &&
      this.getUpperShadow(middle) < this.getCandleBody(middle) * 0.3 &&
      this.getUpperShadow(current) < this.getCandleBody(current) * 0.3
    );
  }

  private isThreeBlackCrows(first: OHLCV, middle: OHLCV, current: OHLCV): boolean {
    return (
      this.isBearishCandle(first) &&
      this.isBearishCandle(middle) &&
      this.isBearishCandle(current) &&
      middle.open < first.open && middle.close < first.close &&
      current.open < middle.open && current.close < middle.close &&
      this.getLowerShadow(first) < this.getCandleBody(first) * 0.3 &&
      this.getLowerShadow(middle) < this.getCandleBody(middle) * 0.3 &&
      this.getLowerShadow(current) < this.getCandleBody(current) * 0.3
    );
  }

  private generatePatternSummary(patterns: CandlestickPattern[]): string {
    if (patterns.length === 0) return 'No significant candlestick patterns detected';

    const highSignificance = patterns.filter(p => p.significance === 'high');
    const bullish = patterns.filter(p => p.direction === 'bullish');
    const bearish = patterns.filter(p => p.direction === 'bearish');

    const parts: string[] = [];

    if (highSignificance.length > 0) {
      parts.push(`${highSignificance.length} high-significance pattern(s): ${highSignificance.map(p => p.name).join(', ')}`);
    }

    if (bullish.length > bearish.length) {
      parts.push(`Bullish bias (${bullish.length} bullish vs ${bearish.length} bearish patterns)`);
    } else if (bearish.length > bullish.length) {
      parts.push(`Bearish bias (${bearish.length} bearish vs ${bullish.length} bullish patterns)`);
    } else if (bullish.length > 0) {
      parts.push('Mixed signals - equal bullish and bearish patterns');
    }

    return parts.join('. ') || `${patterns.length} pattern(s) detected`;
  }
}

// Candlestick pattern interface
interface CandlestickPattern {
  name: string;
  type: 'reversal' | 'continuation';
  direction: 'bullish' | 'bearish' | 'neutral';
  significance: 'high' | 'medium' | 'low';
  candleIndex: number;
  description: string;
}
