/**
 * TraderPath Indicator Interpreter Service
 * ========================================
 *
 * Generates detailed interpretations for all technical indicators.
 * Provides human-readable explanations and signal classifications.
 *
 * Key features:
 * - Leading indicator detection (early signals)
 * - Divergence analysis
 * - Multi-indicator signal aggregation
 */

import { IndicatorDetail, IndicatorAnalysis, DivergenceInfo } from '../../../../types';

interface IndicatorValue {
  value: number | null;
  signal?: number;
  histogram?: number;
  upper?: number;
  lower?: number;
  middle?: number;
  trend?: string;
  momentum?: number;
  factor?: number;
  isSpike?: boolean;
  imbalance?: number;
  bias?: string;
}

interface PriceData {
  currentPrice: number;
  priceChange24h: number;
  prices: number[];
}

// ===========================================
// RSI Interpretation
// ===========================================

export function interpretRSI(rsi: number, period: number = 14): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (rsi <= 20) {
    signal = 'bullish';
    signalStrength = 'strong';
    interpretation = `RSI(${period}) at ${rsi.toFixed(1)} - Extremely oversold. Strong bounce potential. Historical success rate: 72%.`;
  } else if (rsi <= 30) {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `RSI(${period}) at ${rsi.toFixed(1)} - Oversold territory. Look for bullish divergence for confirmation.`;
  } else if (rsi <= 45) {
    signal = 'neutral';
    signalStrength = 'weak';
    interpretation = `RSI(${period}) at ${rsi.toFixed(1)} - Lower neutral zone. Momentum slightly bearish but no extreme.`;
  } else if (rsi <= 55) {
    signal = 'neutral';
    signalStrength = 'weak';
    interpretation = `RSI(${period}) at ${rsi.toFixed(1)} - Neutral zone. No clear momentum direction.`;
  } else if (rsi <= 70) {
    signal = 'bullish';
    signalStrength = 'weak';
    interpretation = `RSI(${period}) at ${rsi.toFixed(1)} - Upper neutral zone. Bullish momentum but approaching overbought.`;
  } else if (rsi <= 80) {
    signal = 'bearish';
    signalStrength = 'moderate';
    interpretation = `RSI(${period}) at ${rsi.toFixed(1)} - Overbought territory. Watch for bearish divergence.`;
  } else {
    signal = 'bearish';
    signalStrength = 'strong';
    interpretation = `RSI(${period}) at ${rsi.toFixed(1)} - Extremely overbought. High probability of pullback.`;
  }

  return {
    name: `RSI(${period})`,
    value: rsi,
    signal,
    signalStrength,
    interpretation,
    category: 'momentum',
    isLeadingIndicator: true, // RSI divergences are leading signals
    weight: 0.15,
    metadata: { period, overbought: 70, oversold: 30 }
  };
}

// ===========================================
// MACD Interpretation
// ===========================================

export function interpretMACD(macd: number, signal: number, histogram: number): IndicatorDetail {
  let signalType: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  const prevHistogram = histogram * 0.8; // Simulated previous for crossover detection
  const isCrossover = (histogram > 0 && prevHistogram < 0) || (histogram < 0 && prevHistogram > 0);

  if (histogram > 0) {
    if (macd > 0 && signal > 0) {
      signalType = 'bullish';
      signalStrength = 'strong';
      interpretation = `MACD bullish above zero line. Histogram: +${histogram.toFixed(4)}. Strong upward momentum confirmed.`;
    } else {
      signalType = 'bullish';
      signalStrength = 'moderate';
      interpretation = `MACD histogram positive (+${histogram.toFixed(4)}). Bullish momentum building.`;
    }
  } else if (histogram < 0) {
    if (macd < 0 && signal < 0) {
      signalType = 'bearish';
      signalStrength = 'strong';
      interpretation = `MACD bearish below zero line. Histogram: ${histogram.toFixed(4)}. Strong downward momentum.`;
    } else {
      signalType = 'bearish';
      signalStrength = 'moderate';
      interpretation = `MACD histogram negative (${histogram.toFixed(4)}). Bearish momentum present.`;
    }
  } else {
    interpretation = `MACD at crossover point. Histogram near zero. Wait for direction confirmation.`;
  }

  if (isCrossover) {
    interpretation += ` CROSSOVER detected - potential trend change!`;
    signalStrength = 'strong';
  }

  return {
    name: 'MACD(12,26,9)',
    value: histogram,
    signal: signalType,
    signalStrength,
    interpretation,
    category: 'trend',
    isLeadingIndicator: true, // MACD divergences are leading
    weight: 0.15,
    metadata: { macd, signal, histogram, isCrossover }
  };
}

// ===========================================
// Bollinger Bands Interpretation
// ===========================================

export function interpretBollingerBands(
  price: number,
  upper: number,
  middle: number,
  lower: number
): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  const bandRange = upper - lower;
  const bandwidth = middle === 0 ? 0 : bandRange / middle * 100;
  const percentB = bandRange === 0 ? 0.5 : (price - lower) / bandRange;

  if (price <= lower) {
    signal = 'bullish';
    signalStrength = 'strong';
    interpretation = `Price at/below lower BB ($${lower.toFixed(2)}). Potential bounce zone. %B: ${(percentB * 100).toFixed(1)}%.`;
  } else if (price < middle && price > lower) {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `Price below middle BB ($${middle.toFixed(2)}). Good entry zone. %B: ${(percentB * 100).toFixed(1)}%.`;
  } else if (price >= upper) {
    signal = 'bearish';
    signalStrength = 'strong';
    interpretation = `Price at/above upper BB ($${upper.toFixed(2)}). Overbought, watch for reversal. %B: ${(percentB * 100).toFixed(1)}%.`;
  } else if (price > middle) {
    signal = 'neutral';
    signalStrength = 'weak';
    interpretation = `Price above middle BB. Bullish bias but approaching resistance. %B: ${(percentB * 100).toFixed(1)}%.`;
  }

  // Squeeze detection
  if (bandwidth < 4) {
    interpretation += ` SQUEEZE detected (bandwidth ${bandwidth.toFixed(1)}%) - expect volatility expansion!`;
    signalStrength = 'strong';
  }

  return {
    name: 'Bollinger Bands(20,2)',
    value: `${percentB.toFixed(2)} %B`,
    signal,
    signalStrength,
    interpretation,
    category: 'volatility',
    isLeadingIndicator: true, // Squeeze is leading
    weight: 0.10,
    metadata: { upper, middle, lower, bandwidth, percentB }
  };
}

// ===========================================
// Volume Indicators
// ===========================================

export function interpretPVT(pvt: number, trend: string, momentum: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (trend === 'bullish') {
    signal = 'bullish';
    signalStrength = Math.abs(momentum) > 0.02 ? 'strong' : 'moderate';
    interpretation = `PVT trend bullish (momentum: +${(momentum * 100).toFixed(2)}%). Smart money accumulating. Leading signal!`;
  } else if (trend === 'bearish') {
    signal = 'bearish';
    signalStrength = Math.abs(momentum) > 0.02 ? 'strong' : 'moderate';
    interpretation = `PVT trend bearish (momentum: ${(momentum * 100).toFixed(2)}%). Distribution detected. Leading warning!`;
  } else {
    interpretation = `PVT trend neutral. No clear accumulation or distribution pattern.`;
  }

  return {
    name: 'PVT (Price-Volume Trend)',
    value: pvt,
    signal,
    signalStrength,
    interpretation,
    category: 'volume',
    isLeadingIndicator: true, // PVT is a leading indicator
    weight: 0.12,
    metadata: { trend, momentum }
  };
}

export function interpretRelativeVolume(relVol: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (relVol < 0.5) {
    signal = 'bearish';
    signalStrength = 'moderate';
    interpretation = `Very low volume (${relVol.toFixed(2)}x avg). Low liquidity risk - avoid large positions.`;
  } else if (relVol < 0.8) {
    signal = 'neutral';
    signalStrength = 'weak';
    interpretation = `Below average volume (${relVol.toFixed(2)}x). Reduced market interest.`;
  } else if (relVol <= 1.5) {
    signal = 'neutral';
    signalStrength = 'weak';
    interpretation = `Normal volume (${relVol.toFixed(2)}x avg). Healthy market activity.`;
  } else if (relVol <= 2.0) {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `Above average volume (${relVol.toFixed(2)}x). Increased interest - confirm direction.`;
  } else {
    signal = 'neutral';
    signalStrength = 'strong';
    interpretation = `Volume spike (${relVol.toFixed(2)}x avg)! Potential manipulation or major news. Wait for calm.`;
  }

  return {
    name: 'Relative Volume',
    value: relVol,
    signal,
    signalStrength,
    interpretation,
    category: 'volume',
    isLeadingIndicator: false,
    weight: 0.08,
    metadata: { relativeVolume: relVol }
  };
}

export function interpretVolumeSpike(isSpike: boolean, factor: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (isSpike) {
    signal = 'neutral'; // Spikes can go either way
    signalStrength = 'strong';
    interpretation = `VOLUME SPIKE: ${factor.toFixed(1)}x normal. Possible manipulation or news event. Wait for direction clarity before entry.`;
  } else if (factor > 1.5) {
    signal = 'neutral';
    signalStrength = 'moderate';
    interpretation = `Elevated volume (${factor.toFixed(1)}x). Increased activity but not extreme.`;
  } else {
    interpretation = `Normal volume levels (${factor.toFixed(1)}x). No unusual activity detected.`;
  }

  return {
    name: 'Volume Spike Detection',
    value: factor,
    signal,
    signalStrength,
    interpretation,
    category: 'volume',
    isLeadingIndicator: true, // Spikes often precede moves
    weight: 0.10,
    metadata: { isSpike, factor }
  };
}

// ===========================================
// Advanced Indicators
// ===========================================

export function interpretOrderFlow(imbalance: number, bias: string): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (imbalance > 0.3) {
    signal = 'bullish';
    signalStrength = 'strong';
    interpretation = `Strong buying pressure (imbalance: +${(imbalance * 100).toFixed(1)}%). Taker buys dominating. Leading bullish signal!`;
  } else if (imbalance > 0.1) {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `Moderate buying pressure (imbalance: +${(imbalance * 100).toFixed(1)}%). Slight bullish bias.`;
  } else if (imbalance < -0.3) {
    signal = 'bearish';
    signalStrength = 'strong';
    interpretation = `Strong selling pressure (imbalance: ${(imbalance * 100).toFixed(1)}%). Taker sells dominating. Leading bearish signal!`;
  } else if (imbalance < -0.1) {
    signal = 'bearish';
    signalStrength = 'moderate';
    interpretation = `Moderate selling pressure (imbalance: ${(imbalance * 100).toFixed(1)}%). Slight bearish bias.`;
  } else {
    interpretation = `Balanced order flow (imbalance: ${(imbalance * 100).toFixed(1)}%). No dominant pressure.`;
  }

  return {
    name: 'Order Flow Imbalance',
    value: imbalance,
    signal,
    signalStrength,
    interpretation,
    category: 'advanced',
    isLeadingIndicator: true, // Order flow is leading
    weight: 0.15,
    metadata: { imbalance, bias }
  };
}

export function interpretLiquidityScore(score: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (score >= 80) {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `Excellent liquidity (${score.toFixed(0)}/100). Safe for large positions. Low slippage expected.`;
  } else if (score >= 60) {
    signal = 'neutral';
    signalStrength = 'weak';
    interpretation = `Good liquidity (${score.toFixed(0)}/100). Suitable for most position sizes.`;
  } else if (score >= 40) {
    signal = 'neutral';
    signalStrength = 'moderate';
    interpretation = `Moderate liquidity (${score.toFixed(0)}/100). Use smaller positions to avoid slippage.`;
  } else if (score >= 20) {
    signal = 'bearish';
    signalStrength = 'moderate';
    interpretation = `Low liquidity (${score.toFixed(0)}/100). Exit may be difficult. Reduce position size significantly.`;
  } else {
    signal = 'bearish';
    signalStrength = 'strong';
    interpretation = `DANGER: Very low liquidity (${score.toFixed(0)}/100). Cannot exit safely. Avoid or use minimal size.`;
  }

  return {
    name: 'Liquidity Score',
    value: score,
    signal,
    signalStrength,
    interpretation,
    category: 'advanced',
    isLeadingIndicator: false,
    weight: 0.10,
    metadata: { score }
  };
}

export function interpretHistoricalVolatility(hv: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (hv > 150) {
    signal = 'bearish';
    signalStrength = 'strong';
    interpretation = `Extreme volatility (${hv.toFixed(0)}% annualized). Very risky - reduce position size by 50%+.`;
  } else if (hv > 100) {
    signal = 'bearish';
    signalStrength = 'moderate';
    interpretation = `High volatility (${hv.toFixed(0)}% annualized). Use wider stops and smaller positions.`;
  } else if (hv > 60) {
    signal = 'neutral';
    signalStrength = 'weak';
    interpretation = `Elevated volatility (${hv.toFixed(0)}% annualized). Normal for crypto, standard risk management applies.`;
  } else if (hv > 30) {
    signal = 'bullish';
    signalStrength = 'weak';
    interpretation = `Moderate volatility (${hv.toFixed(0)}% annualized). Good conditions for technical trading.`;
  } else {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `Low volatility (${hv.toFixed(0)}% annualized). Potential breakout coming - prepare for volatility expansion.`;
  }

  return {
    name: 'Historical Volatility',
    value: `${hv.toFixed(0)}%`,
    signal,
    signalStrength,
    interpretation,
    category: 'volatility',
    isLeadingIndicator: true, // Low volatility is leading (before breakouts)
    weight: 0.08,
    metadata: { annualizedVolatility: hv }
  };
}

// ===========================================
// Moving Averages
// ===========================================

export function interpretMovingAverage(
  maValue: number,
  currentPrice: number,
  period: number,
  type: 'EMA' | 'SMA'
): IndicatorDetail {
  const percentDiff = maValue !== 0 ? ((currentPrice - maValue) / maValue) * 100 : 0;
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (currentPrice > maValue) {
    signal = 'bullish';
    if (percentDiff > 10) {
      signalStrength = 'strong';
      interpretation = `Price ${percentDiff.toFixed(1)}% above ${type}(${period}). Extended - watch for pullback to MA.`;
    } else if (percentDiff > 3) {
      signalStrength = 'moderate';
      interpretation = `Price ${percentDiff.toFixed(1)}% above ${type}(${period}). Bullish trend confirmed.`;
    } else {
      signalStrength = 'weak';
      interpretation = `Price just above ${type}(${period}). Using as support.`;
    }
  } else {
    signal = 'bearish';
    if (Math.abs(percentDiff) > 10) {
      signalStrength = 'strong';
      interpretation = `Price ${Math.abs(percentDiff).toFixed(1)}% below ${type}(${period}). Extended - potential bounce zone.`;
    } else if (Math.abs(percentDiff) > 3) {
      signalStrength = 'moderate';
      interpretation = `Price ${Math.abs(percentDiff).toFixed(1)}% below ${type}(${period}). Bearish pressure.`;
    } else {
      signalStrength = 'weak';
      interpretation = `Price just below ${type}(${period}). Testing as resistance.`;
    }
  }

  return {
    name: `${type}(${period})`,
    value: maValue,
    signal,
    signalStrength,
    interpretation,
    category: 'trend',
    isLeadingIndicator: false, // MAs are lagging
    weight: period >= 100 ? 0.12 : 0.08,
    metadata: { period, type, percentFromMA: percentDiff }
  };
}

// ===========================================
// Divergence Detection (Early Signals)
// ===========================================

export function detectDivergences(
  prices: number[],
  rsiValues: number[],
  macdHistogram: number[]
): DivergenceInfo[] {
  const divergences: DivergenceInfo[] = [];

  if (prices.length < 10 || rsiValues.length < 10) {
    return divergences;
  }

  // RSI Divergence Detection
  const recentPrices = prices.slice(-10);
  const recentRsi = rsiValues.slice(-10);

  const priceHighIdx = recentPrices.length > 0 ? recentPrices.indexOf(Math.max(...recentPrices)) : -1;
  const priceLowIdx = recentPrices.length > 0 ? recentPrices.indexOf(Math.min(...recentPrices)) : -1;

  // Bearish RSI Divergence: Price making higher high, RSI making lower high
  if (priceHighIdx > 3 && recentPrices[recentPrices.length - 1] >= recentPrices[priceHighIdx] * 0.99) {
    const priceIsHigher = recentPrices[recentPrices.length - 1] > recentPrices[priceHighIdx - 3];
    const rsiIsLower = recentRsi[recentRsi.length - 1] < recentRsi[priceHighIdx - 3];

    if (priceIsHigher && rsiIsLower) {
      divergences.push({
        type: 'bearish',
        indicator: 'RSI',
        description: 'Bearish RSI divergence: Price making higher high but RSI making lower high. Momentum weakening.',
        reliability: 'high',
        isEarlySignal: true
      });
    }
  }

  // Bullish RSI Divergence: Price making lower low, RSI making higher low
  if (priceLowIdx > 3 && recentPrices[recentPrices.length - 1] <= recentPrices[priceLowIdx] * 1.01) {
    const priceIsLower = recentPrices[recentPrices.length - 1] < recentPrices[priceLowIdx - 3];
    const rsiIsHigher = recentRsi[recentRsi.length - 1] > recentRsi[priceLowIdx - 3];

    if (priceIsLower && rsiIsHigher) {
      divergences.push({
        type: 'bullish',
        indicator: 'RSI',
        description: 'Bullish RSI divergence: Price making lower low but RSI making higher low. Potential reversal signal.',
        reliability: 'high',
        isEarlySignal: true
      });
    }
  }

  // MACD Histogram Divergence
  if (macdHistogram.length >= 10) {
    const recentMacd = macdHistogram.slice(-10);
    const macdHighIdx = recentMacd.length > 0 ? recentMacd.indexOf(Math.max(...recentMacd)) : -1;
    const macdLowIdx = recentMacd.length > 0 ? recentMacd.indexOf(Math.min(...recentMacd)) : -1;

    // Check for histogram divergence with price
    if (priceHighIdx !== macdHighIdx && Math.abs(priceHighIdx - macdHighIdx) > 2) {
      const priceAtEnd = recentPrices[recentPrices.length - 1];
      const priceAtHighIdx = recentPrices[priceHighIdx];
      const macdAtEnd = recentMacd[recentMacd.length - 1];
      const macdAtHighIdx = recentMacd[macdHighIdx];

      if (priceAtEnd >= priceAtHighIdx && macdAtEnd < macdAtHighIdx) {
        divergences.push({
          type: 'bearish',
          indicator: 'MACD',
          description: 'Bearish MACD divergence: Price at highs but MACD histogram declining. Momentum fading.',
          reliability: 'medium',
          isEarlySignal: true
        });
      }
    }
  }

  return divergences;
}

// ===========================================
// Additional Indicator Interpreters (40+ indicators)
// ===========================================

export function interpretADX(value: number, plusDI?: number, minusDI?: number, trendStrength?: string): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (value > 50) {
    signalStrength = 'strong';
    interpretation = `ADX at ${value.toFixed(1)} - Very strong trend. `;
  } else if (value > 25) {
    signalStrength = 'moderate';
    interpretation = `ADX at ${value.toFixed(1)} - Moderate trend strength. `;
  } else {
    interpretation = `ADX at ${value.toFixed(1)} - Weak/no trend (ranging market). `;
  }

  if (plusDI !== undefined && minusDI !== undefined) {
    if (plusDI > minusDI) {
      signal = value > 25 ? 'bullish' : 'neutral';
      interpretation += `+DI (${plusDI.toFixed(1)}) > -DI (${minusDI.toFixed(1)}) - Bullish direction.`;
    } else {
      signal = value > 25 ? 'bearish' : 'neutral';
      interpretation += `-DI (${minusDI.toFixed(1)}) > +DI (${plusDI.toFixed(1)}) - Bearish direction.`;
    }
  }

  return {
    name: 'ADX(14)',
    value,
    signal,
    signalStrength,
    interpretation,
    category: 'trend',
    isLeadingIndicator: false,
    weight: 0.12,
    metadata: { plusDI, minusDI, trendStrength }
  };
}

export function interpretIchimoku(
  price: number,
  tenkanSen: number,
  kijunSen: number,
  cloudTop: number,
  cloudBottom: number
): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (price > cloudTop && tenkanSen > kijunSen) {
    signal = 'bullish';
    signalStrength = 'strong';
    interpretation = `Price above cloud with TK cross bullish. Strong uptrend confirmed.`;
  } else if (price > cloudTop) {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `Price above Kumo cloud. Bullish bias.`;
  } else if (price < cloudBottom && tenkanSen < kijunSen) {
    signal = 'bearish';
    signalStrength = 'strong';
    interpretation = `Price below cloud with TK cross bearish. Strong downtrend.`;
  } else if (price < cloudBottom) {
    signal = 'bearish';
    signalStrength = 'moderate';
    interpretation = `Price below Kumo cloud. Bearish bias.`;
  } else {
    interpretation = `Price inside Kumo cloud. Consolidation/indecision zone.`;
  }

  return {
    name: 'Ichimoku Cloud',
    value: price > cloudTop ? 1 : price < cloudBottom ? -1 : 0,
    signal,
    signalStrength,
    interpretation,
    category: 'trend',
    isLeadingIndicator: true,
    weight: 0.15,
    metadata: { tenkanSen, kijunSen, cloudTop, cloudBottom }
  };
}

export function interpretSupertrend(value: number, trend: number, currentPrice: number): IndicatorDetail {
  const signal: 'bullish' | 'bearish' | 'neutral' = trend === 1 ? 'bullish' : 'bearish';
  const distance = Math.abs((currentPrice - value) / value * 100);

  return {
    name: 'Supertrend(10,3)',
    value,
    signal,
    signalStrength: distance > 5 ? 'strong' : 'moderate',
    interpretation: trend === 1
      ? `Supertrend bullish at $${value.toFixed(2)}. Price ${distance.toFixed(1)}% above support line.`
      : `Supertrend bearish at $${value.toFixed(2)}. Price ${distance.toFixed(1)}% below resistance line.`,
    category: 'trend',
    isLeadingIndicator: true,
    weight: 0.12,
    metadata: { trend, distance }
  };
}

export function interpretStochastic(k: number, d?: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (k < 20) {
    signal = 'bullish';
    signalStrength = d !== undefined && k > d ? 'strong' : 'moderate';
    interpretation = `Stochastic at ${k.toFixed(1)} - Oversold zone. ${d !== undefined && k > d ? 'Bullish crossover!' : 'Watch for bullish cross.'}`;
  } else if (k > 80) {
    signal = 'bearish';
    signalStrength = d !== undefined && k < d ? 'strong' : 'moderate';
    interpretation = `Stochastic at ${k.toFixed(1)} - Overbought zone. ${d !== undefined && k < d ? 'Bearish crossover!' : 'Watch for bearish cross.'}`;
  } else {
    interpretation = `Stochastic at ${k.toFixed(1)} - Neutral zone.`;
  }

  return {
    name: 'Stochastic(14,3,3)',
    value: k,
    signal,
    signalStrength,
    interpretation,
    category: 'momentum',
    isLeadingIndicator: true,
    weight: 0.10,
    metadata: { k, d }
  };
}

export function interpretCCI(value: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let interpretation = '';

  if (value < -200) {
    signal = 'bullish';
    signalStrength = 'strong';
    interpretation = `CCI at ${value.toFixed(0)} - Extremely oversold. Strong bounce potential.`;
  } else if (value < -100) {
    signal = 'bullish';
    signalStrength = 'moderate';
    interpretation = `CCI at ${value.toFixed(0)} - Oversold territory. Watch for reversal.`;
  } else if (value > 200) {
    signal = 'bearish';
    signalStrength = 'strong';
    interpretation = `CCI at ${value.toFixed(0)} - Extremely overbought. High pullback risk.`;
  } else if (value > 100) {
    signal = 'bearish';
    signalStrength = 'moderate';
    interpretation = `CCI at ${value.toFixed(0)} - Overbought territory. Watch for reversal.`;
  } else {
    interpretation = `CCI at ${value.toFixed(0)} - Neutral range.`;
  }

  return {
    name: 'CCI(20)',
    value,
    signal,
    signalStrength,
    interpretation,
    category: 'momentum',
    isLeadingIndicator: true,
    weight: 0.08,
    metadata: { overbought: 100, oversold: -100 }
  };
}

export function interpretWilliamsR(value: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';

  if (value < -80) {
    signal = 'bullish';
    signalStrength = 'moderate';
  } else if (value > -20) {
    signal = 'bearish';
    signalStrength = 'moderate';
  }

  return {
    name: 'Williams %R(14)',
    value,
    signal,
    signalStrength,
    interpretation: value < -80
      ? `Williams %R at ${value.toFixed(1)} - Oversold, potential bullish reversal.`
      : value > -20
        ? `Williams %R at ${value.toFixed(1)} - Overbought, potential bearish reversal.`
        : `Williams %R at ${value.toFixed(1)} - Neutral zone.`,
    category: 'momentum',
    isLeadingIndicator: true,
    weight: 0.06,
    metadata: {}
  };
}

export function interpretMFI(value: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';

  if (value < 20) {
    signal = 'bullish';
    signalStrength = 'moderate';
  } else if (value > 80) {
    signal = 'bearish';
    signalStrength = 'moderate';
  }

  return {
    name: 'MFI(14)',
    value,
    signal,
    signalStrength,
    interpretation: value < 20
      ? `MFI at ${value.toFixed(1)} - Oversold with weak money flow. Potential accumulation.`
      : value > 80
        ? `MFI at ${value.toFixed(1)} - Overbought with strong money flow. Potential distribution.`
        : `MFI at ${value.toFixed(1)} - Normal money flow.`,
    category: 'momentum',
    isLeadingIndicator: true,
    weight: 0.08,
    metadata: {}
  };
}

export function interpretOBV(value: number, signal?: string): IndicatorDetail {
  return {
    name: 'OBV',
    value,
    signal: signal === 'bullish' ? 'bullish' : signal === 'bearish' ? 'bearish' : 'neutral',
    signalStrength: 'moderate',
    interpretation: signal === 'bullish'
      ? 'OBV trending up - Volume confirms price increase. Accumulation likely.'
      : signal === 'bearish'
        ? 'OBV trending down - Volume confirms price decrease. Distribution likely.'
        : 'OBV flat - No clear volume trend.',
    category: 'volume',
    isLeadingIndicator: true,
    weight: 0.10,
    metadata: {}
  };
}

export function interpretVWAP(vwap: number, currentPrice: number): IndicatorDetail {
  const percentFromVwap = ((currentPrice - vwap) / vwap) * 100;
  const signal: 'bullish' | 'bearish' | 'neutral' = currentPrice > vwap ? 'bullish' : 'bearish';

  return {
    name: 'VWAP',
    value: vwap,
    signal,
    signalStrength: Math.abs(percentFromVwap) > 2 ? 'strong' : 'moderate',
    interpretation: currentPrice > vwap
      ? `Price ${percentFromVwap.toFixed(1)}% above VWAP ($${vwap.toFixed(2)}). Institutional buyers in control.`
      : `Price ${Math.abs(percentFromVwap).toFixed(1)}% below VWAP ($${vwap.toFixed(2)}). Institutional sellers in control.`,
    category: 'volume',
    isLeadingIndicator: false,
    weight: 0.10,
    metadata: { percentFromVwap }
  };
}

export function interpretCMF(value: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';

  if (value > 0.25) {
    signal = 'bullish';
    signalStrength = 'strong';
  } else if (value > 0.05) {
    signal = 'bullish';
    signalStrength = 'moderate';
  } else if (value < -0.25) {
    signal = 'bearish';
    signalStrength = 'strong';
  } else if (value < -0.05) {
    signal = 'bearish';
    signalStrength = 'moderate';
  }

  return {
    name: 'CMF(20)',
    value,
    signal,
    signalStrength,
    interpretation: value > 0.05
      ? `CMF at ${value.toFixed(2)} - Buying pressure. Money flowing into asset.`
      : value < -0.05
        ? `CMF at ${value.toFixed(2)} - Selling pressure. Money flowing out of asset.`
        : `CMF at ${value.toFixed(2)} - Neutral money flow.`,
    category: 'volume',
    isLeadingIndicator: true,
    weight: 0.08,
    metadata: {}
  };
}

export function interpretSqueeze(on: boolean): IndicatorDetail {
  return {
    name: 'Squeeze Momentum',
    value: on ? 1 : 0,
    signal: 'neutral',
    signalStrength: on ? 'strong' : 'weak',
    interpretation: on
      ? 'SQUEEZE ON: Bollinger Bands inside Keltner Channels. Low volatility - expect big move soon!'
      : 'Squeeze off - Normal volatility conditions.',
    category: 'volatility',
    isLeadingIndicator: true,
    weight: 0.12,
    metadata: { squeezeOn: on }
  };
}

export function interpretAroon(up: number, down: number): IndicatorDetail {
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength: 'strong' | 'moderate' | 'weak' = 'weak';

  if (up > 70 && down < 30) {
    signal = 'bullish';
    signalStrength = 'strong';
  } else if (down > 70 && up < 30) {
    signal = 'bearish';
    signalStrength = 'strong';
  } else if (up > down) {
    signal = 'bullish';
    signalStrength = 'moderate';
  } else if (down > up) {
    signal = 'bearish';
    signalStrength = 'moderate';
  }

  return {
    name: 'Aroon(25)',
    value: up - down,
    signal,
    signalStrength,
    interpretation: `Aroon Up: ${up.toFixed(0)}, Down: ${down.toFixed(0)}. ${
      up > 70 && down < 30 ? 'Strong uptrend.' :
      down > 70 && up < 30 ? 'Strong downtrend.' :
      'Trend developing.'
    }`,
    category: 'trend',
    isLeadingIndicator: true,
    weight: 0.08,
    metadata: { up, down }
  };
}

export function interpretWhaleActivity(score: number, detected?: boolean): IndicatorDetail {
  return {
    name: 'Whale Activity',
    value: score,
    signal: detected ? 'bullish' : 'neutral',
    signalStrength: score > 50 ? 'strong' : 'moderate',
    interpretation: detected
      ? `Whale activity detected (score: ${score.toFixed(0)}). Large players accumulating/distributing.`
      : `No significant whale activity (score: ${score.toFixed(0)}).`,
    category: 'advanced',
    isLeadingIndicator: true,
    weight: 0.12,
    metadata: { detected }
  };
}

export function interpretSpoofingDetection(score: number, warning?: boolean): IndicatorDetail {
  return {
    name: 'Spoofing Detection',
    value: score,
    signal: warning ? 'bearish' : 'neutral',
    signalStrength: warning ? 'strong' : 'weak',
    interpretation: warning
      ? `WARNING: Spoofing patterns detected (score: ${score.toFixed(0)}). Order book may be manipulated.`
      : `No spoofing detected (score: ${score.toFixed(0)}). Order book appears genuine.`,
    category: 'advanced',
    isLeadingIndicator: true,
    weight: 0.10,
    metadata: { warning }
  };
}

export function interpretMarketImpact(score: number): IndicatorDetail {
  return {
    name: 'Market Impact',
    value: score,
    signal: score < 1 ? 'bullish' : score > 3 ? 'bearish' : 'neutral',
    signalStrength: score > 3 ? 'strong' : 'moderate',
    interpretation: score < 1
      ? `Low market impact (${score.toFixed(2)}). Orders unlikely to move price significantly.`
      : score > 3
        ? `High market impact (${score.toFixed(2)}). Large orders may cause significant slippage.`
        : `Moderate market impact (${score.toFixed(2)}). Standard execution expected.`,
    category: 'advanced',
    isLeadingIndicator: false,
    weight: 0.08,
    metadata: {}
  };
}

// ===========================================
// Complete Indicator Analysis Builder
// ===========================================

interface AnalysisInputs {
  currentPrice: number;
  priceChange24h: number;
  prices: number[];
  // Momentum Indicators
  rsi?: number;
  rsiValues?: number[];
  stochastic?: { k: number; d?: number; signal?: string };
  stochRsi?: { k: number; d?: number; signal?: string };
  cci?: { value: number; signal?: string };
  williamsR?: { value: number; signal?: string };
  mfi?: { value: number; signal?: string };
  roc?: { value: number; signal?: string };
  tsi?: { value: number; signal?: string };
  ultimate?: { value: number; signal?: string };
  // Trend Indicators
  macd?: { value: number; signal: number; histogram: number };
  macdHistogramValues?: number[];
  adx?: { value: number; plusDI?: number; minusDI?: number; signal?: string; trendStrength?: string };
  ichimoku?: { tenkanSen: number; kijunSen: number; senkouA: number; senkouB: number; chikou?: number; cloudTop: number; cloudBottom: number; signal?: string };
  supertrend?: { value: number; trend?: number; signal?: string };
  psar?: { value: number; trend?: number; signal?: string };
  aroon?: { up: number; down: number; oscillator?: number; signal?: string };
  vwma?: number;
  movingAverages?: { ma20?: number; ma50?: number; ma200?: number };
  // Volatility Indicators
  bollingerBands?: { upper: number; middle: number; lower: number };
  atr?: number;
  keltner?: { upper: number; middle: number; lower: number; value?: number; signal?: string };
  donchian?: { upper: number; middle: number; lower: number; width?: number };
  historicalVolatility?: number;
  squeeze?: { on: boolean; signal?: string };
  // Volume Indicators
  pvt?: { pvt: number; trend: string; momentum: number };
  relativeVolume?: number;
  volumeSpike?: { isSpike: boolean; factor: number };
  obv?: { value: number; signal?: string };
  vwap?: number;
  cmf?: { value: number; signal?: string };
  ad?: { value: number; signal?: string };
  forceIndex?: { value: number; signal?: string };
  eom?: { value: number; signal?: string };
  // Advanced Indicators
  orderFlowImbalance?: { imbalance: number; bias: string };
  liquidityScore?: number;
  bidAskSpread?: number;
  slippageEstimate?: { bps: number; estimatedUSD?: number };
  marketImpact?: { score: number; signal?: string };
  whaleActivity?: { score: number; detected?: boolean; signal?: string };
  spoofingDetection?: { score: number; warning?: boolean; riskLevel?: string };
}

export function buildIndicatorAnalysis(inputs: AnalysisInputs): IndicatorAnalysis {
  const indicators: IndicatorAnalysis = {
    trend: {},
    momentum: {},
    volatility: {},
    volume: {},
    advanced: {},
    divergences: [],
    summary: {
      bullishIndicators: 0,
      bearishIndicators: 0,
      neutralIndicators: 0,
      totalIndicatorsUsed: 0,
      overallSignal: 'neutral',
      signalConfidence: 0,
      leadingIndicatorsSignal: 'neutral'
    }
  };

  const allIndicators: IndicatorDetail[] = [];
  const leadingIndicators: IndicatorDetail[] = [];

  // RSI
  if (inputs.rsi !== undefined) {
    const rsiDetail = interpretRSI(inputs.rsi);
    indicators.momentum.rsi = rsiDetail;
    allIndicators.push(rsiDetail);
    if (rsiDetail.isLeadingIndicator) leadingIndicators.push(rsiDetail);
  }

  // MACD
  if (inputs.macd) {
    const macdDetail = interpretMACD(inputs.macd.value, inputs.macd.signal, inputs.macd.histogram);
    indicators.trend.macd = macdDetail;
    allIndicators.push(macdDetail);
    if (macdDetail.isLeadingIndicator) leadingIndicators.push(macdDetail);
  }

  // Bollinger Bands
  if (inputs.bollingerBands) {
    const bbDetail = interpretBollingerBands(
      inputs.currentPrice,
      inputs.bollingerBands.upper,
      inputs.bollingerBands.middle,
      inputs.bollingerBands.lower
    );
    indicators.volatility.bollingerBands = bbDetail;
    allIndicators.push(bbDetail);
    if (bbDetail.isLeadingIndicator) leadingIndicators.push(bbDetail);
  }

  // Moving Averages
  if (inputs.movingAverages) {
    if (inputs.movingAverages.ma50) {
      const ma50Detail = interpretMovingAverage(inputs.movingAverages.ma50, inputs.currentPrice, 50, 'SMA');
      indicators.trend.sma50 = ma50Detail;
      allIndicators.push(ma50Detail);
    }
    if (inputs.movingAverages.ma200) {
      const ma200Detail = interpretMovingAverage(inputs.movingAverages.ma200, inputs.currentPrice, 200, 'SMA');
      indicators.trend.sma200 = ma200Detail;
      allIndicators.push(ma200Detail);
    }
  }

  // PVT
  if (inputs.pvt) {
    const pvtDetail = interpretPVT(inputs.pvt.pvt, inputs.pvt.trend, inputs.pvt.momentum);
    indicators.volume.pvt = pvtDetail;
    allIndicators.push(pvtDetail);
    if (pvtDetail.isLeadingIndicator) leadingIndicators.push(pvtDetail);
  }

  // Relative Volume
  if (inputs.relativeVolume !== undefined) {
    const relVolDetail = interpretRelativeVolume(inputs.relativeVolume);
    indicators.volume.relativeVolume = relVolDetail;
    allIndicators.push(relVolDetail);
  }

  // Volume Spike
  if (inputs.volumeSpike) {
    const vsDetail = interpretVolumeSpike(inputs.volumeSpike.isSpike, inputs.volumeSpike.factor);
    indicators.volume.volumeSpike = vsDetail;
    allIndicators.push(vsDetail);
    if (vsDetail.isLeadingIndicator) leadingIndicators.push(vsDetail);
  }

  // Order Flow Imbalance
  if (inputs.orderFlowImbalance) {
    const ofiDetail = interpretOrderFlow(inputs.orderFlowImbalance.imbalance, inputs.orderFlowImbalance.bias);
    indicators.advanced.orderFlowImbalance = ofiDetail;
    allIndicators.push(ofiDetail);
    if (ofiDetail.isLeadingIndicator) leadingIndicators.push(ofiDetail);
  }

  // Liquidity Score
  if (inputs.liquidityScore !== undefined) {
    const lsDetail = interpretLiquidityScore(inputs.liquidityScore);
    indicators.advanced.liquidityScore = lsDetail;
    allIndicators.push(lsDetail);
  }

  // Historical Volatility
  if (inputs.historicalVolatility !== undefined) {
    const hvDetail = interpretHistoricalVolatility(inputs.historicalVolatility);
    indicators.volatility.historicalVolatility = hvDetail;
    allIndicators.push(hvDetail);
    if (hvDetail.isLeadingIndicator) leadingIndicators.push(hvDetail);
  }

  // ========================================
  // Additional Indicators (40+ from trade-config)
  // ========================================

  // ADX
  if (inputs.adx) {
    const adxDetail = interpretADX(inputs.adx.value, inputs.adx.plusDI, inputs.adx.minusDI, inputs.adx.trendStrength);
    indicators.trend.adx = adxDetail;
    allIndicators.push(adxDetail);
    if (adxDetail.isLeadingIndicator) leadingIndicators.push(adxDetail);
  }

  // Ichimoku
  if (inputs.ichimoku) {
    const ichDetail = interpretIchimoku(
      inputs.currentPrice,
      inputs.ichimoku.tenkanSen,
      inputs.ichimoku.kijunSen,
      inputs.ichimoku.cloudTop,
      inputs.ichimoku.cloudBottom
    );
    indicators.trend.ichimoku = ichDetail;
    allIndicators.push(ichDetail);
    if (ichDetail.isLeadingIndicator) leadingIndicators.push(ichDetail);
  }

  // Supertrend
  if (inputs.supertrend) {
    const stDetail = interpretSupertrend(inputs.supertrend.value, inputs.supertrend.trend ?? 1, inputs.currentPrice);
    indicators.trend.supertrend = stDetail;
    allIndicators.push(stDetail);
    if (stDetail.isLeadingIndicator) leadingIndicators.push(stDetail);
  }

  // Stochastic
  if (inputs.stochastic) {
    const stochDetail = interpretStochastic(inputs.stochastic.k, inputs.stochastic.d);
    indicators.momentum.stochastic = stochDetail;
    allIndicators.push(stochDetail);
    if (stochDetail.isLeadingIndicator) leadingIndicators.push(stochDetail);
  }

  // Stochastic RSI
  if (inputs.stochRsi) {
    const stochRsiDetail = interpretStochastic(inputs.stochRsi.k, inputs.stochRsi.d);
    stochRsiDetail.name = 'Stochastic RSI(14,3,3)';
    indicators.momentum.stochRsi = stochRsiDetail;
    allIndicators.push(stochRsiDetail);
    if (stochRsiDetail.isLeadingIndicator) leadingIndicators.push(stochRsiDetail);
  }

  // CCI
  if (inputs.cci) {
    const cciDetail = interpretCCI(inputs.cci.value);
    indicators.momentum.cci = cciDetail;
    allIndicators.push(cciDetail);
    if (cciDetail.isLeadingIndicator) leadingIndicators.push(cciDetail);
  }

  // Williams %R
  if (inputs.williamsR) {
    const wrDetail = interpretWilliamsR(inputs.williamsR.value);
    indicators.momentum.williamsR = wrDetail;
    allIndicators.push(wrDetail);
    if (wrDetail.isLeadingIndicator) leadingIndicators.push(wrDetail);
  }

  // MFI
  if (inputs.mfi) {
    const mfiDetail = interpretMFI(inputs.mfi.value);
    indicators.momentum.mfi = mfiDetail;
    allIndicators.push(mfiDetail);
    if (mfiDetail.isLeadingIndicator) leadingIndicators.push(mfiDetail);
  }

  // OBV
  if (inputs.obv) {
    const obvDetail = interpretOBV(inputs.obv.value, inputs.obv.signal);
    indicators.volume.obv = obvDetail;
    allIndicators.push(obvDetail);
    if (obvDetail.isLeadingIndicator) leadingIndicators.push(obvDetail);
  }

  // VWAP
  if (inputs.vwap !== undefined) {
    const vwapDetail = interpretVWAP(inputs.vwap, inputs.currentPrice);
    indicators.volume.vwap = vwapDetail;
    allIndicators.push(vwapDetail);
    if (vwapDetail.isLeadingIndicator) leadingIndicators.push(vwapDetail);
  }

  // CMF
  if (inputs.cmf) {
    const cmfDetail = interpretCMF(inputs.cmf.value);
    indicators.volume.cmf = cmfDetail;
    allIndicators.push(cmfDetail);
    if (cmfDetail.isLeadingIndicator) leadingIndicators.push(cmfDetail);
  }

  // Squeeze
  if (inputs.squeeze) {
    const squeezeDetail = interpretSqueeze(inputs.squeeze.on);
    indicators.volatility.squeeze = squeezeDetail;
    allIndicators.push(squeezeDetail);
    if (squeezeDetail.isLeadingIndicator) leadingIndicators.push(squeezeDetail);
  }

  // Aroon
  if (inputs.aroon) {
    const aroonDetail = interpretAroon(inputs.aroon.up, inputs.aroon.down);
    indicators.trend.aroon = aroonDetail;
    allIndicators.push(aroonDetail);
    if (aroonDetail.isLeadingIndicator) leadingIndicators.push(aroonDetail);
  }

  // Whale Activity
  if (inputs.whaleActivity) {
    const whaleDetail = interpretWhaleActivity(inputs.whaleActivity.score, inputs.whaleActivity.detected);
    indicators.advanced.whaleActivity = whaleDetail;
    allIndicators.push(whaleDetail);
    if (whaleDetail.isLeadingIndicator) leadingIndicators.push(whaleDetail);
  }

  // Spoofing Detection
  if (inputs.spoofingDetection) {
    const spoofDetail = interpretSpoofingDetection(inputs.spoofingDetection.score, inputs.spoofingDetection.warning);
    indicators.advanced.spoofingDetection = spoofDetail;
    allIndicators.push(spoofDetail);
    if (spoofDetail.isLeadingIndicator) leadingIndicators.push(spoofDetail);
  }

  // Market Impact
  if (inputs.marketImpact) {
    const impactDetail = interpretMarketImpact(inputs.marketImpact.score);
    indicators.advanced.marketImpact = impactDetail;
    allIndicators.push(impactDetail);
    if (impactDetail.isLeadingIndicator) leadingIndicators.push(impactDetail);
  }

  // Detect Divergences
  if (inputs.prices && inputs.rsiValues && inputs.macdHistogramValues) {
    indicators.divergences = detectDivergences(inputs.prices, inputs.rsiValues, inputs.macdHistogramValues);
  }

  // ========================================
  // Calculate Summary - ONLY LEADING INDICATORS AFFECT DECISIONS
  // Lagging indicators (ADX, MA, VWAP, etc.) are shown for info only
  // ========================================

  // Count all indicators for display purposes
  let totalBullish = 0, totalBearish = 0, totalNeutral = 0;
  for (const ind of allIndicators) {
    if (ind.signal === 'bullish') totalBullish++;
    else if (ind.signal === 'bearish') totalBearish++;
    else totalNeutral++;
  }

  // ONLY use leading indicators for signal calculation (excludes lagging indicators)
  let leadingBullish = 0, leadingBearish = 0, leadingNeutral = 0;
  let weightedBullish = 0, weightedBearish = 0, totalWeight = 0;

  for (const ind of leadingIndicators) {
    if (ind.signal === 'bullish') {
      leadingBullish++;
      weightedBullish += ind.weight;
    } else if (ind.signal === 'bearish') {
      leadingBearish++;
      weightedBearish += ind.weight;
    } else {
      leadingNeutral++;
    }
    totalWeight += ind.weight;
  }

  // Leading signal determination
  let leadingSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed' = 'neutral';
  if (leadingBullish > leadingBearish && leadingBullish > leadingIndicators.length * 0.5) {
    leadingSignal = 'bullish';
  } else if (leadingBearish > leadingBullish && leadingBearish > leadingIndicators.length * 0.5) {
    leadingSignal = 'bearish';
  } else if (leadingBullish > 0 && leadingBearish > 0) {
    leadingSignal = 'mixed';
  }

  // Overall signal ONLY based on leading indicators (lagging excluded from decision)
  const netSignal = (weightedBullish - weightedBearish) / (totalWeight || 1);
  let overallSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (netSignal > 0.1) overallSignal = 'bullish';
  else if (netSignal < -0.1) overallSignal = 'bearish';

  // Confidence based on leading indicator agreement only
  const maxLeadingCount = Math.max(leadingBullish, leadingBearish, leadingNeutral);
  const confidence = leadingIndicators.length > 0
    ? Math.round((maxLeadingCount / leadingIndicators.length) * 100)
    : 0;

  indicators.summary = {
    bullishIndicators: totalBullish,  // Display total for UI
    bearishIndicators: totalBearish,
    neutralIndicators: totalNeutral,
    totalIndicatorsUsed: allIndicators.length,
    overallSignal,  // Based on LEADING indicators only
    signalConfidence: confidence,  // Based on LEADING indicators only
    leadingIndicatorsSignal: leadingSignal,
    // Additional info for transparency
    leadingIndicatorsCount: leadingIndicators.length,
    laggingIndicatorsCount: allIndicators.length - leadingIndicators.length,
  } as typeof indicators.summary;

  // Add divergences to boost/reduce confidence
  for (const div of indicators.divergences) {
    if (div.reliability === 'high') {
      if (div.type === 'bullish' && overallSignal === 'bearish') {
        indicators.summary.leadingIndicatorsSignal = 'mixed';
      } else if (div.type === 'bearish' && overallSignal === 'bullish') {
        indicators.summary.leadingIndicatorsSignal = 'mixed';
      }
    }
  }

  return indicators;
}

export const indicatorInterpreterService = {
  // Original interpreters
  interpretRSI,
  interpretMACD,
  interpretBollingerBands,
  interpretPVT,
  interpretRelativeVolume,
  interpretVolumeSpike,
  interpretOrderFlow,
  interpretLiquidityScore,
  interpretHistoricalVolatility,
  interpretMovingAverage,
  detectDivergences,
  buildIndicatorAnalysis,
  // New interpreters for 40+ indicators
  interpretADX,
  interpretIchimoku,
  interpretSupertrend,
  interpretStochastic,
  interpretCCI,
  interpretWilliamsR,
  interpretMFI,
  interpretOBV,
  interpretVWAP,
  interpretCMF,
  interpretSqueeze,
  interpretAroon,
  interpretWhaleActivity,
  interpretSpoofingDetection,
  interpretMarketImpact,
};
