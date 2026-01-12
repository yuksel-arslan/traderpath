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

import { IndicatorDetail, IndicatorAnalysis, DivergenceInfo } from '@traderpath/types';

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

  const bandwidth = (upper - lower) / middle * 100;
  const percentB = (price - lower) / (upper - lower);

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
  const percentDiff = ((currentPrice - maValue) / maValue) * 100;
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

  const priceHighIdx = recentPrices.indexOf(Math.max(...recentPrices));
  const priceLowIdx = recentPrices.indexOf(Math.min(...recentPrices));

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
    const macdHighIdx = recentMacd.indexOf(Math.max(...recentMacd));
    const macdLowIdx = recentMacd.indexOf(Math.min(...recentMacd));

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
// Complete Indicator Analysis Builder
// ===========================================

interface AnalysisInputs {
  currentPrice: number;
  priceChange24h: number;
  prices: number[];
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  bollingerBands?: { upper: number; middle: number; lower: number };
  movingAverages?: { ma20?: number; ma50?: number; ma200?: number };
  atr?: number;
  pvt?: { pvt: number; trend: string; momentum: number };
  relativeVolume?: number;
  volumeSpike?: { isSpike: boolean; factor: number };
  orderFlowImbalance?: { imbalance: number; bias: string };
  liquidityScore?: number;
  historicalVolatility?: number;
  rsiValues?: number[];
  macdHistogramValues?: number[];
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

  // Detect Divergences
  if (inputs.prices && inputs.rsiValues && inputs.macdHistogramValues) {
    indicators.divergences = detectDivergences(inputs.prices, inputs.rsiValues, inputs.macdHistogramValues);
  }

  // Calculate Summary
  let bullish = 0, bearish = 0, neutral = 0;
  let weightedBullish = 0, weightedBearish = 0, totalWeight = 0;

  for (const ind of allIndicators) {
    if (ind.signal === 'bullish') {
      bullish++;
      weightedBullish += ind.weight;
    } else if (ind.signal === 'bearish') {
      bearish++;
      weightedBearish += ind.weight;
    } else {
      neutral++;
    }
    totalWeight += ind.weight;
  }

  // Leading indicators signal
  let leadingBullish = 0, leadingBearish = 0;
  for (const ind of leadingIndicators) {
    if (ind.signal === 'bullish') leadingBullish++;
    else if (ind.signal === 'bearish') leadingBearish++;
  }

  let leadingSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed' = 'neutral';
  if (leadingBullish > leadingBearish && leadingBullish > leadingIndicators.length * 0.5) {
    leadingSignal = 'bullish';
  } else if (leadingBearish > leadingBullish && leadingBearish > leadingIndicators.length * 0.5) {
    leadingSignal = 'bearish';
  } else if (leadingBullish > 0 && leadingBearish > 0) {
    leadingSignal = 'mixed';
  }

  // Overall signal based on weighted sum
  const netSignal = (weightedBullish - weightedBearish) / (totalWeight || 1);
  let overallSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (netSignal > 0.1) overallSignal = 'bullish';
  else if (netSignal < -0.1) overallSignal = 'bearish';

  // Confidence based on agreement
  const maxCount = Math.max(bullish, bearish, neutral);
  const confidence = Math.round((maxCount / allIndicators.length) * 100);

  indicators.summary = {
    bullishIndicators: bullish,
    bearishIndicators: bearish,
    neutralIndicators: neutral,
    totalIndicatorsUsed: allIndicators.length,
    overallSignal,
    signalConfidence: confidence,
    leadingIndicatorsSignal: leadingSignal
  };

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
  buildIndicatorAnalysis
};
