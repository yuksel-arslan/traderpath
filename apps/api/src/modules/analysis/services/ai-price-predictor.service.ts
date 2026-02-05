// ===========================================
// AI Price Predictor Service
// Uses Gemini to predict specific price targets
// based on technical indicators, candlestick patterns,
// support/resistance, volume, and time series analysis
//
// This replaces mechanical S/R placement with
// actual AI-driven price forecasting
// ===========================================

import { callGeminiWithRetry } from '../../../core/gemini';
import { logger } from '../../../core/logger';

// ===========================================
// TYPES
// ===========================================

export interface PricePredictionInput {
  symbol: string;
  direction: 'long' | 'short';
  currentPrice: number;
  timeframe: string; // '15m', '1h', '4h', '1d'

  // Raw candle data (last 50 candles)
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;

  // Technical indicators
  indicators: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    bollingerBands: { upper: number; middle: number; lower: number };
    atr: number;
    movingAverages: { ma20: number; ma50: number; ma200: number };
    // Extended indicators from indicatorDetails
    stochastic?: { k: number; d: number };
    adx?: number;
    cci?: number;
    williamsR?: number;
    mfi?: number;
    obv?: number;
    vwap?: number;
    cmf?: number;
  };

  // Candlestick patterns detected
  candlestickPatterns: Array<{
    name: string;
    direction: 'bullish' | 'bearish';
    significance: 'high' | 'medium' | 'low';
  }>;

  // Support/Resistance levels
  supportLevels: number[];
  resistanceLevels: number[];
  poc: number; // Point of Control

  // Volume analysis
  volumeProfile: {
    avgVolume: number;
    currentVolume: number;
    volumeRatio: number;
    isVolumeSpike: boolean;
  };

  // Indicator summary
  indicatorSummary: {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    totalUsed: number;
    overallSignal: string;
    signalConfidence: number;
    leadingSignal: string;
  };

  // Market context
  marketContext: {
    regime: string; // risk_on, risk_off, etc.
    fearGreedIndex: number;
    btcTrend?: string;
    marketTrend: string;
    trendStrength: number;
  };

  // Divergences detected
  divergences: Array<{
    indicator: string;
    type: 'bullish' | 'bearish';
    strength: string;
  }>;
}

export interface PricePrediction {
  // Primary predictions
  tp1: {
    price: number;
    confidence: number; // 0-100
    expectedTimeCandles: number; // How many candles to reach
    reasoning: string;
  };
  tp2: {
    price: number;
    confidence: number;
    expectedTimeCandles: number;
    reasoning: string;
  };

  // Stop loss recommendation
  stopLoss: {
    price: number;
    reasoning: string;
  };

  // Overall prediction quality
  predictionConfidence: number; // 0-100
  predictionBasis: string[]; // Key factors used

  // Risk assessment
  invalidationPrice: number; // Price where prediction is invalid
  invalidationReason: string;

  // Expected price action
  expectedMovePercent: number; // Expected % move
  expectedMoveDirection: 'up' | 'down';
  timeHorizon: string; // "4-8 candles", "12-24 candles" etc.
}

// ===========================================
// CANDLE PATTERN ANALYSIS (Pre-processing for AI)
// ===========================================

function analyzeRecentPriceAction(candles: PricePredictionInput['candles']): string {
  if (candles.length < 10) return 'Insufficient data';

  const last10 = candles.slice(-10);
  const last5 = candles.slice(-5);
  const last3 = candles.slice(-3);

  // Trend direction from recent candles
  const priceChange10 = ((last10[last10.length - 1].close - last10[0].open) / last10[0].open * 100).toFixed(2);
  const priceChange5 = ((last5[last5.length - 1].close - last5[0].open) / last5[0].open * 100).toFixed(2);

  // Candle body analysis
  const bodies = last5.map(c => {
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const bodyRatio = range > 0 ? (body / range * 100).toFixed(0) : '0';
    const isGreen = c.close > c.open;
    return `${isGreen ? 'G' : 'R'}(body:${bodyRatio}%)`;
  });

  // Volume trend
  const avgVol = last10.reduce((s, c) => s + c.volume, 0) / last10.length;
  const recentVol = last3.reduce((s, c) => s + c.volume, 0) / last3.length;
  const volTrend = recentVol > avgVol * 1.5 ? 'INCREASING' : recentVol < avgVol * 0.7 ? 'DECREASING' : 'STABLE';

  // Wick analysis (rejection signals)
  const lastCandle = candles[candles.length - 1];
  const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
  const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
  const body = Math.abs(lastCandle.close - lastCandle.open);
  const upperWickRatio = body > 0 ? (upperWick / body).toFixed(1) : '0';
  const lowerWickRatio = body > 0 ? (lowerWick / body).toFixed(1) : '0';

  return [
    `10-candle change: ${priceChange10}%`,
    `5-candle change: ${priceChange5}%`,
    `Last 5 candles: ${bodies.join(' ')}`,
    `Volume trend: ${volTrend} (ratio: ${(recentVol / avgVol).toFixed(2)}x)`,
    `Last candle wicks: upper=${upperWickRatio}x body, lower=${lowerWickRatio}x body`,
  ].join('\n');
}

function formatCandleDataForAI(candles: PricePredictionInput['candles']): string {
  // Send last 30 candles in compact format
  const recent = candles.slice(-30);
  const header = 'Time|Open|High|Low|Close|Volume';
  const rows = recent.map(c => {
    const date = new Date(c.time).toISOString().slice(0, 16);
    return `${date}|${c.open.toFixed(2)}|${c.high.toFixed(2)}|${c.low.toFixed(2)}|${c.close.toFixed(2)}|${Math.round(c.volume)}`;
  });
  return `${header}\n${rows.join('\n')}`;
}

// ===========================================
// MAIN PREDICTION FUNCTION
// ===========================================

export async function predictPriceTargets(input: PricePredictionInput): Promise<PricePrediction> {
  const {
    symbol, direction, currentPrice, timeframe,
    candles, indicators, candlestickPatterns,
    supportLevels, resistanceLevels, poc,
    volumeProfile, indicatorSummary, marketContext, divergences,
  } = input;

  // Pre-analyze candle data
  const priceAction = analyzeRecentPriceAction(candles);
  const candleData = formatCandleDataForAI(candles);

  // Build the prompt
  const prompt = buildPredictionPrompt(input, priceAction, candleData);

  try {
    const response = await callGeminiWithRetry(
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent predictions
          maxOutputTokens: 1500,
          topP: 0.8,
        },
      },
      3,
      'ai_price_prediction',
      'default' // Gemini 2.5 Flash - cost-effective, structured JSON output
    );

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parsePredictionResponse(text, input);

  } catch (error) {
    logger.error({ error, symbol, timeframe }, '[AI Price Predictor] Gemini call failed, using fallback');
    return buildFallbackPrediction(input);
  }
}

// ===========================================
// PROMPT BUILDER
// ===========================================

function buildPredictionPrompt(
  input: PricePredictionInput,
  priceAction: string,
  candleData: string,
): string {
  const {
    symbol, direction, currentPrice, timeframe,
    indicators, candlestickPatterns, supportLevels, resistanceLevels, poc,
    volumeProfile, indicatorSummary, marketContext, divergences,
  } = input;

  const patternsList = candlestickPatterns.length > 0
    ? candlestickPatterns.map(p => `${p.name} (${p.direction}, ${p.significance})`).join(', ')
    : 'None detected';

  const divergencesList = divergences.length > 0
    ? divergences.map(d => `${d.indicator}: ${d.type} divergence (${d.strength})`).join(', ')
    : 'None';

  return `You are a quantitative price prediction model. Analyze the following market data and predict specific price targets.

TASK: Predict TP1, TP2, and optimal Stop Loss for a ${direction.toUpperCase()} position on ${symbol} (${timeframe} timeframe).

CURRENT PRICE: $${currentPrice.toFixed(2)}
DIRECTION: ${direction.toUpperCase()}

=== RAW CANDLE DATA (Last 30 candles, ${timeframe}) ===
${candleData}

=== PRICE ACTION ANALYSIS ===
${priceAction}

=== TECHNICAL INDICATORS ===
RSI(14): ${indicators.rsi.toFixed(1)}
MACD: Line=${indicators.macd.value.toFixed(4)}, Signal=${indicators.macd.signal.toFixed(4)}, Histogram=${indicators.macd.histogram.toFixed(4)}
Bollinger Bands: Upper=$${indicators.bollingerBands.upper.toFixed(2)}, Middle=$${indicators.bollingerBands.middle.toFixed(2)}, Lower=$${indicators.bollingerBands.lower.toFixed(2)}
ATR(14): $${indicators.atr.toFixed(2)} (${(indicators.atr / currentPrice * 100).toFixed(2)}% of price)
MA20: $${indicators.movingAverages.ma20.toFixed(2)} (price ${currentPrice > indicators.movingAverages.ma20 ? 'above' : 'below'})
MA50: $${indicators.movingAverages.ma50.toFixed(2)} (price ${currentPrice > indicators.movingAverages.ma50 ? 'above' : 'below'})
MA200: $${indicators.movingAverages.ma200.toFixed(2)} (price ${currentPrice > indicators.movingAverages.ma200 ? 'above' : 'below'})
${indicators.stochastic ? `Stochastic: K=${indicators.stochastic.k.toFixed(1)}, D=${indicators.stochastic.d.toFixed(1)}` : ''}
${indicators.adx ? `ADX: ${indicators.adx.toFixed(1)}` : ''}
${indicators.cci ? `CCI: ${indicators.cci.toFixed(1)}` : ''}
${indicators.mfi ? `MFI: ${indicators.mfi.toFixed(1)}` : ''}
${indicators.vwap ? `VWAP: $${indicators.vwap.toFixed(2)}` : ''}

=== INDICATOR SUMMARY ===
Bullish signals: ${indicatorSummary.bullishCount}/${indicatorSummary.totalUsed}
Bearish signals: ${indicatorSummary.bearishCount}/${indicatorSummary.totalUsed}
Overall: ${indicatorSummary.overallSignal} (${indicatorSummary.signalConfidence}% confidence)
Leading indicators: ${indicatorSummary.leadingSignal}

=== CANDLESTICK PATTERNS ===
${patternsList}

=== SUPPORT/RESISTANCE ===
Supports: ${supportLevels.length > 0 ? supportLevels.map(s => `$${s.toFixed(2)}`).join(', ') : 'None nearby'}
Resistances: ${resistanceLevels.length > 0 ? resistanceLevels.map(r => `$${r.toFixed(2)}`).join(', ') : 'None nearby'}
POC (Volume Point of Control): $${poc.toFixed(2)}

=== VOLUME ANALYSIS ===
Current/Avg ratio: ${volumeProfile.volumeRatio.toFixed(2)}x
Volume spike: ${volumeProfile.isVolumeSpike ? 'YES' : 'No'}

=== DIVERGENCES ===
${divergencesList}

=== MARKET CONTEXT ===
Regime: ${marketContext.regime}
Fear & Greed: ${marketContext.fearGreedIndex}/100
Market trend: ${marketContext.marketTrend} (strength: ${marketContext.trendStrength}%)

=== INSTRUCTIONS ===
Analyze like a TFT (Temporal Fusion Transformer) model:
1. Identify the hidden pattern in the price series (trend, mean-reversion, breakout, or consolidation)
2. Use indicator confluence - where do MULTIPLE indicators agree on a target zone?
3. Consider momentum: Is the move accelerating or decelerating?
4. Volume confirms price action - does volume support the predicted move?
5. Candlestick patterns near S/R levels are strong signals
6. Divergences between price and indicators indicate potential reversals
7. ATR tells you the expected range per candle - use it for realistic targets
8. MA alignment tells you trend strength - targets should respect MA levels
9. Bollinger Band position tells you volatility expansion/contraction

For ${direction.toUpperCase()} position:
- TP1: Conservative target (higher probability, 60% of position)
- TP2: Extended target (lower probability, 40% of position)
- StopLoss: Below/Above key invalidation level

Respond ONLY in this exact JSON format (no markdown, no explanation outside JSON):
{
  "tp1_price": <number>,
  "tp1_confidence": <0-100>,
  "tp1_candles": <expected candles to reach>,
  "tp1_reasoning": "<1 sentence: which indicators/patterns support this target>",
  "tp2_price": <number>,
  "tp2_confidence": <0-100>,
  "tp2_candles": <expected candles to reach>,
  "tp2_reasoning": "<1 sentence>",
  "sl_price": <number>,
  "sl_reasoning": "<1 sentence: why this is the invalidation level>",
  "prediction_confidence": <0-100>,
  "prediction_basis": ["<factor1>", "<factor2>", "<factor3>"],
  "expected_move_percent": <number>,
  "invalidation_price": <number>,
  "invalidation_reason": "<1 sentence>",
  "time_horizon": "<e.g. 8-16 candles>"
}`;
}

// ===========================================
// RESPONSE PARSER
// ===========================================

function parsePredictionResponse(text: string, input: PricePredictionInput): PricePrediction {
  const { currentPrice, direction, indicators } = input;
  const atr = indicators.atr;

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate the response makes sense
    const tp1Price = Number(parsed.tp1_price);
    const tp2Price = Number(parsed.tp2_price);
    const slPrice = Number(parsed.sl_price);
    const invalidationPrice = Number(parsed.invalidation_price) || slPrice;

    // Sanity checks
    if (direction === 'long') {
      // For LONG: TP should be above current, SL should be below
      if (tp1Price <= currentPrice || tp2Price <= currentPrice || slPrice >= currentPrice) {
        logger.warn({ tp1Price, tp2Price, slPrice, currentPrice }, '[AI Predictor] Invalid LONG targets, using fallback');
        return buildFallbackPrediction(input);
      }
    } else {
      // For SHORT: TP should be below current, SL should be above
      if (tp1Price >= currentPrice || tp2Price >= currentPrice || slPrice <= currentPrice) {
        logger.warn({ tp1Price, tp2Price, slPrice, currentPrice }, '[AI Predictor] Invalid SHORT targets, using fallback');
        return buildFallbackPrediction(input);
      }
    }

    // Check targets aren't too far (max 20% from current for TP, 10% for SL)
    const tp1Dist = Math.abs((tp1Price - currentPrice) / currentPrice * 100);
    const tp2Dist = Math.abs((tp2Price - currentPrice) / currentPrice * 100);
    const slDist = Math.abs((slPrice - currentPrice) / currentPrice * 100);

    if (tp1Dist > 20 || tp2Dist > 30 || slDist > 15) {
      logger.warn({ tp1Dist, tp2Dist, slDist }, '[AI Predictor] Targets too distant, capping');
      // Cap the values
      const maxTP1 = direction === 'long'
        ? currentPrice * 1.20 : currentPrice * 0.80;
      const maxTP2 = direction === 'long'
        ? currentPrice * 1.30 : currentPrice * 0.70;
      const maxSL = direction === 'long'
        ? currentPrice * 0.90 : currentPrice * 1.10;

      return {
        tp1: {
          price: tp1Dist > 20 ? maxTP1 : tp1Price,
          confidence: Number(parsed.tp1_confidence) || 50,
          expectedTimeCandles: Number(parsed.tp1_candles) || 10,
          reasoning: parsed.tp1_reasoning || 'AI prediction (capped)',
        },
        tp2: {
          price: tp2Dist > 30 ? maxTP2 : tp2Price,
          confidence: Number(parsed.tp2_confidence) || 35,
          expectedTimeCandles: Number(parsed.tp2_candles) || 20,
          reasoning: parsed.tp2_reasoning || 'AI prediction (capped)',
        },
        stopLoss: {
          price: slDist > 15 ? maxSL : slPrice,
          reasoning: parsed.sl_reasoning || 'Key invalidation level',
        },
        predictionConfidence: Number(parsed.prediction_confidence) || 40,
        predictionBasis: parsed.prediction_basis || ['Technical indicators', 'Price action'],
        invalidationPrice: invalidationPrice,
        invalidationReason: parsed.invalidation_reason || 'Prediction invalidated',
        expectedMovePercent: Number(parsed.expected_move_percent) || tp1Dist,
        expectedMoveDirection: direction === 'long' ? 'up' : 'down',
        timeHorizon: parsed.time_horizon || '8-16 candles',
      };
    }

    return {
      tp1: {
        price: tp1Price,
        confidence: Number(parsed.tp1_confidence) || 50,
        expectedTimeCandles: Number(parsed.tp1_candles) || 10,
        reasoning: parsed.tp1_reasoning || 'AI-predicted target',
      },
      tp2: {
        price: tp2Price,
        confidence: Number(parsed.tp2_confidence) || 35,
        expectedTimeCandles: Number(parsed.tp2_candles) || 20,
        reasoning: parsed.tp2_reasoning || 'AI-predicted extended target',
      },
      stopLoss: {
        price: slPrice,
        reasoning: parsed.sl_reasoning || 'Key invalidation level',
      },
      predictionConfidence: Number(parsed.prediction_confidence) || 50,
      predictionBasis: Array.isArray(parsed.prediction_basis) ? parsed.prediction_basis : ['AI analysis'],
      invalidationPrice: invalidationPrice,
      invalidationReason: parsed.invalidation_reason || 'Prediction invalidated at this level',
      expectedMovePercent: Number(parsed.expected_move_percent) || tp1Dist,
      expectedMoveDirection: direction === 'long' ? 'up' : 'down',
      timeHorizon: parsed.time_horizon || '8-16 candles',
    };

  } catch (error) {
    logger.error({ error, text: text.slice(0, 500) }, '[AI Predictor] Failed to parse Gemini response');
    return buildFallbackPrediction(input);
  }
}

// ===========================================
// FALLBACK (when AI fails - use indicator-based)
// ===========================================

function buildFallbackPrediction(input: PricePredictionInput): PricePrediction {
  const { currentPrice, direction, indicators, supportLevels, resistanceLevels } = input;
  const atr = indicators.atr;

  // Use ATR-based targets with indicator confluence
  const rsiOverextended = direction === 'long' ? indicators.rsi > 65 : indicators.rsi < 35;
  const macdMomentum = direction === 'long'
    ? indicators.macd.histogram > 0
    : indicators.macd.histogram < 0;

  // Confidence modifiers
  let baseConfidence = 45;
  if (macdMomentum) baseConfidence += 10;
  if (!rsiOverextended) baseConfidence += 10;
  if (input.indicatorSummary.signalConfidence > 60) baseConfidence += 10;

  if (direction === 'long') {
    // TP1: 2 ATR or nearest resistance (whichever is closer and reasonable)
    const atrTarget1 = currentPrice + atr * 2;
    const nearestResistance = resistanceLevels.find(r => r > currentPrice);
    const tp1 = nearestResistance && nearestResistance < atrTarget1
      ? nearestResistance
      : atrTarget1;

    // TP2: 3.5 ATR or second resistance
    const atrTarget2 = currentPrice + atr * 3.5;
    const secondResistance = resistanceLevels.find(r => r > tp1);
    const tp2 = secondResistance && secondResistance < atrTarget2
      ? secondResistance
      : atrTarget2;

    // SL: Below nearest support or 1.5 ATR
    const nearestSupport = supportLevels.find(s => s < currentPrice);
    const sl = nearestSupport
      ? nearestSupport - atr * 0.5
      : currentPrice - atr * 1.5;

    return {
      tp1: {
        price: parseFloat(tp1.toFixed(2)),
        confidence: baseConfidence,
        expectedTimeCandles: 8,
        reasoning: nearestResistance ? 'Nearest resistance with ATR confluence' : '2 ATR target (fallback)',
      },
      tp2: {
        price: parseFloat(tp2.toFixed(2)),
        confidence: Math.max(baseConfidence - 15, 20),
        expectedTimeCandles: 16,
        reasoning: secondResistance ? 'Extended resistance target' : '3.5 ATR target (fallback)',
      },
      stopLoss: {
        price: parseFloat(sl.toFixed(2)),
        reasoning: nearestSupport ? 'Below nearest support' : '1.5 ATR below entry (fallback)',
      },
      predictionConfidence: baseConfidence - 10,
      predictionBasis: ['ATR-based fallback', 'S/R levels', 'RSI/MACD check'],
      invalidationPrice: parseFloat(sl.toFixed(2)),
      invalidationReason: 'Price broke below stop loss level',
      expectedMovePercent: parseFloat(((tp1 - currentPrice) / currentPrice * 100).toFixed(2)),
      expectedMoveDirection: 'up',
      timeHorizon: '8-16 candles',
    };
  } else {
    // SHORT targets
    const atrTarget1 = currentPrice - atr * 2;
    const nearestSupport = supportLevels.find(s => s < currentPrice);
    const tp1 = nearestSupport && nearestSupport > atrTarget1
      ? nearestSupport
      : atrTarget1;

    const atrTarget2 = currentPrice - atr * 3.5;
    const secondSupport = [...supportLevels].reverse().find(s => s < tp1);
    const tp2 = secondSupport && secondSupport > atrTarget2
      ? secondSupport
      : atrTarget2;

    const nearestResistance = resistanceLevels.find(r => r > currentPrice);
    const sl = nearestResistance
      ? nearestResistance + atr * 0.5
      : currentPrice + atr * 1.5;

    return {
      tp1: {
        price: parseFloat(tp1.toFixed(2)),
        confidence: baseConfidence,
        expectedTimeCandles: 8,
        reasoning: nearestSupport ? 'Nearest support with ATR confluence' : '2 ATR target (fallback)',
      },
      tp2: {
        price: parseFloat(tp2.toFixed(2)),
        confidence: Math.max(baseConfidence - 15, 20),
        expectedTimeCandles: 16,
        reasoning: secondSupport ? 'Extended support target' : '3.5 ATR target (fallback)',
      },
      stopLoss: {
        price: parseFloat(sl.toFixed(2)),
        reasoning: nearestResistance ? 'Above nearest resistance' : '1.5 ATR above entry (fallback)',
      },
      predictionConfidence: baseConfidence - 10,
      predictionBasis: ['ATR-based fallback', 'S/R levels', 'RSI/MACD check'],
      invalidationPrice: parseFloat(sl.toFixed(2)),
      invalidationReason: 'Price broke above stop loss level',
      expectedMovePercent: parseFloat(((currentPrice - tp1) / currentPrice * 100).toFixed(2)),
      expectedMoveDirection: 'down',
      timeHorizon: '8-16 candles',
    };
  }
}
