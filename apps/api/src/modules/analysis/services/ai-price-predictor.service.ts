/**
 * AI Price Predictor Service
 * Uses Gemini to predict optimal TP/SL levels based on technical context.
 * Called from integratedTradePlan() to replace/enhance mechanical S/R placement.
 */

import { callGeminiWithRetry } from '../../../core/gemini';

export interface AIPredictionInput {
  symbol: string;
  interval: string;
  direction: 'long' | 'short';
  currentPrice: number;
  atr: number;
  // Last N candles (OHLCV)
  candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>;
  // Key indicators
  indicators: {
    rsi?: number;
    macdHistogram?: number;
    macdSignal?: number;
    macdLine?: number;
    ema20?: number;
    ema50?: number;
    ema200?: number;
    bollingerUpper?: number;
    bollingerLower?: number;
    bollingerMiddle?: number;
    stochK?: number;
    stochD?: number;
    adx?: number;
    vwap?: number;
    obv?: number;
    volumeAvg?: number;
  };
  // Support/Resistance levels
  supports: number[];
  resistances: number[];
  // Fibonacci levels
  fibLevels?: Array<{ price: number; level: number; type: string }>;
  // Capital flow context
  capitalFlowPhase?: string;
  liquidityBias?: string;
}

export interface AIPredictionResult {
  tp1: { price: number; confidence: number; reason: string };
  tp2: { price: number; confidence: number; reason: string };
  sl: { price: number; confidence: number; reason: string };
  invalidation: { price: number; reason: string };
  overallConfidence: number;
  reasoning: string;
  timeHorizon: string;
}

function buildPrompt(input: AIPredictionInput): string {
  const {
    symbol, interval, direction, currentPrice, atr,
    candles, indicators, supports, resistances, fibLevels,
    capitalFlowPhase, liquidityBias,
  } = input;

  // Format last 20 candles for the prompt
  const recentCandles = candles.slice(-20);
  const candleStr = recentCandles.map((c, i) => {
    const body = c.close >= c.open ? 'BULL' : 'BEAR';
    const bodyPct = Math.abs((c.close - c.open) / c.open * 100).toFixed(2);
    const wickUp = ((c.high - Math.max(c.open, c.close)) / c.open * 100).toFixed(2);
    const wickDown = ((Math.min(c.open, c.close) - c.low) / c.open * 100).toFixed(2);
    return `  ${i + 1}. O:${c.open.toPrecision(6)} H:${c.high.toPrecision(6)} L:${c.low.toPrecision(6)} C:${c.close.toPrecision(6)} V:${(c.volume / 1000).toFixed(0)}K | ${body} ${bodyPct}% body, ${wickUp}%/${wickDown}% wicks`;
  }).join('\n');

  // Price structure
  const highOfDay = Math.max(...recentCandles.map(c => c.high));
  const lowOfDay = Math.min(...recentCandles.map(c => c.low));
  const priceRange = ((highOfDay - lowOfDay) / lowOfDay * 100).toFixed(2);

  // Volume analysis
  const volumes = recentCandles.map(c => c.volume);
  const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastVol = volumes[volumes.length - 1] || avgVol;
  const volRatio = (lastVol / avgVol).toFixed(2);

  // Candle pattern detection
  const last3 = recentCandles.slice(-3);
  const patterns: string[] = [];
  if (last3.length >= 2) {
    const prev = last3[last3.length - 2];
    const curr = last3[last3.length - 1];
    // Engulfing
    if (curr.close > curr.open && prev.close < prev.open && curr.close > prev.open && curr.open < prev.close) {
      patterns.push('BULLISH_ENGULFING');
    }
    if (curr.close < curr.open && prev.close > prev.open && curr.open > prev.close && curr.close < prev.open) {
      patterns.push('BEARISH_ENGULFING');
    }
    // Doji
    if (Math.abs(curr.close - curr.open) / curr.open < 0.001) {
      patterns.push('DOJI');
    }
    // Pin bar
    const bodySize = Math.abs(curr.close - curr.open);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    if (lowerWick > bodySize * 2 && upperWick < bodySize) patterns.push('HAMMER/PIN_BAR_BULLISH');
    if (upperWick > bodySize * 2 && lowerWick < bodySize) patterns.push('SHOOTING_STAR/PIN_BAR_BEARISH');
  }

  const ind = indicators;

  return `You are a professional quantitative analyst. Analyze the ${symbol} ${interval} chart and provide PRECISE price targets for a ${direction.toUpperCase()} trade.

CURRENT STATE:
- Price: $${currentPrice}
- ATR(14): $${atr.toFixed(6)} (${(atr / currentPrice * 100).toFixed(2)}% of price)
- Direction: ${direction.toUpperCase()}
- Range: $${lowOfDay.toPrecision(6)} – $${highOfDay.toPrecision(6)} (${priceRange}%)
- Volume ratio (current/avg): ${volRatio}x
${capitalFlowPhase ? `- Capital Flow Phase: ${capitalFlowPhase}` : ''}
${liquidityBias ? `- Liquidity Bias: ${liquidityBias}` : ''}

RECENT CANDLES (last 20, ${interval}):
${candleStr}

${patterns.length > 0 ? `CANDLE PATTERNS DETECTED: ${patterns.join(', ')}` : 'No significant candle patterns.'}

INDICATORS:
- RSI(14): ${ind.rsi?.toFixed(1) ?? 'N/A'}
- MACD: Line=${ind.macdLine?.toFixed(6) ?? 'N/A'}, Signal=${ind.macdSignal?.toFixed(6) ?? 'N/A'}, Histogram=${ind.macdHistogram?.toFixed(6) ?? 'N/A'}
- EMA: 20=${ind.ema20?.toPrecision(6) ?? 'N/A'}, 50=${ind.ema50?.toPrecision(6) ?? 'N/A'}, 200=${ind.ema200?.toPrecision(6) ?? 'N/A'}
- Bollinger: Upper=${ind.bollingerUpper?.toPrecision(6) ?? 'N/A'}, Mid=${ind.bollingerMiddle?.toPrecision(6) ?? 'N/A'}, Lower=${ind.bollingerLower?.toPrecision(6) ?? 'N/A'}
- Stochastic: K=${ind.stochK?.toFixed(1) ?? 'N/A'}, D=${ind.stochD?.toFixed(1) ?? 'N/A'}
- ADX: ${ind.adx?.toFixed(1) ?? 'N/A'}
- VWAP: ${ind.vwap?.toPrecision(6) ?? 'N/A'}

SUPPORT LEVELS: ${supports.length > 0 ? supports.map(s => '$' + s.toPrecision(6)).join(', ') : 'None detected'}
RESISTANCE LEVELS: ${resistances.length > 0 ? resistances.map(r => '$' + r.toPrecision(6)).join(', ') : 'None detected'}
${fibLevels && fibLevels.length > 0 ? `FIBONACCI: ${fibLevels.slice(0, 6).map(f => `${f.level} (${f.type}): $${f.price.toPrecision(6)}`).join(', ')}` : ''}

RULES:
1. TP1 must be REALISTIC for ${interval} timeframe - not too far, not too tight
2. TP2 should be an ambitious but achievable extension target
3. SL must protect against the trade thesis being WRONG - place it where the setup is invalidated
4. For ${interval} scalping/day-trade: TP1 typically 0.3%-2% away, TP2 1%-4% away, SL 0.5%-2% away
5. For swing trades (1D/1W): targets can be wider
6. SL should NOT be placed at round numbers or obvious liquidity pools (slightly beyond them)
7. Use indicator confluence: BB band touch, EMA test, VWAP level, Fib level = stronger target
8. Consider ATR: targets should be proportional to recent volatility

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no explanation outside JSON):
{
  "tp1": { "price": <number>, "confidence": <0-100>, "reason": "<1 sentence>" },
  "tp2": { "price": <number>, "confidence": <0-100>, "reason": "<1 sentence>" },
  "sl": { "price": <number>, "confidence": <0-100>, "reason": "<1 sentence>" },
  "invalidation": { "price": <number>, "reason": "<1 sentence>" },
  "overallConfidence": <0-100>,
  "reasoning": "<2-3 sentences: key factors driving this trade plan>",
  "timeHorizon": "<expected time to TP1>"
}`;
}

/**
 * Parse AI response with fallback for malformed JSON
 */
function parseAIResponse(text: string, input: AIPredictionInput): AIPredictionResult | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.tp1?.price || !parsed.tp2?.price || !parsed.sl?.price) {
      console.warn('[AIPricePredictor] Missing required price fields in response');
      return null;
    }

    // Sanity checks
    const { currentPrice, direction, atr } = input;
    const maxDistance = currentPrice * 0.20; // Max 20% from current price

    const validate = (price: number, label: string): number | null => {
      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        console.warn(`[AIPricePredictor] Invalid ${label}: ${price}`);
        return null;
      }
      if (Math.abs(price - currentPrice) > maxDistance) {
        console.warn(`[AIPricePredictor] ${label} too far: $${price} (current: $${currentPrice}, max dist: $${maxDistance.toFixed(2)})`);
        return null;
      }
      return price;
    };

    const tp1 = validate(parsed.tp1.price, 'TP1');
    const tp2 = validate(parsed.tp2.price, 'TP2');
    const sl = validate(parsed.sl.price, 'SL');

    if (!tp1 || !tp2 || !sl) return null;

    // Direction validation
    if (direction === 'long') {
      if (tp1 <= currentPrice || tp2 <= currentPrice || sl >= currentPrice) {
        console.warn('[AIPricePredictor] Direction mismatch: LONG but TP below or SL above entry');
        return null;
      }
    } else {
      if (tp1 >= currentPrice || tp2 >= currentPrice || sl <= currentPrice) {
        console.warn('[AIPricePredictor] Direction mismatch: SHORT but TP above or SL below entry');
        return null;
      }
    }

    // Ensure TP1 < TP2 (in terms of distance from entry)
    const tp1Dist = Math.abs(tp1 - currentPrice);
    const tp2Dist = Math.abs(tp2 - currentPrice);
    let finalTP1 = tp1, finalTP2 = tp2;
    if (tp2Dist < tp1Dist) {
      finalTP1 = tp2;
      finalTP2 = tp1;
    }

    return {
      tp1: { price: finalTP1, confidence: Math.min(100, Math.max(0, parsed.tp1.confidence || 50)), reason: parsed.tp1.reason || '' },
      tp2: { price: finalTP2, confidence: Math.min(100, Math.max(0, parsed.tp2.confidence || 50)), reason: parsed.tp2.reason || '' },
      sl: { price: sl, confidence: Math.min(100, Math.max(0, parsed.sl.confidence || 50)), reason: parsed.sl.reason || '' },
      invalidation: {
        price: parsed.invalidation?.price || sl,
        reason: parsed.invalidation?.reason || 'Stop loss level',
      },
      overallConfidence: Math.min(100, Math.max(0, parsed.overallConfidence || 50)),
      reasoning: parsed.reasoning || '',
      timeHorizon: parsed.timeHorizon || 'Unknown',
    };
  } catch (err) {
    console.error('[AIPricePredictor] Failed to parse AI response:', err);
    return null;
  }
}

/**
 * ATR-based fallback when AI prediction fails
 */
function atrFallback(input: AIPredictionInput): AIPredictionResult {
  const { currentPrice, direction, atr } = input;

  if (direction === 'long') {
    return {
      tp1: { price: currentPrice + atr * 1.5, confidence: 30, reason: 'ATR-based fallback (1.5 ATR)' },
      tp2: { price: currentPrice + atr * 2.5, confidence: 20, reason: 'ATR-based fallback (2.5 ATR)' },
      sl: { price: currentPrice - atr * 1.0, confidence: 30, reason: 'ATR-based fallback (1.0 ATR below)' },
      invalidation: { price: currentPrice - atr * 1.5, reason: 'Beyond 1.5 ATR below entry' },
      overallConfidence: 25,
      reasoning: 'AI prediction unavailable. Using ATR-based mechanical levels as fallback.',
      timeHorizon: 'Unknown',
    };
  } else {
    return {
      tp1: { price: currentPrice - atr * 1.5, confidence: 30, reason: 'ATR-based fallback (1.5 ATR)' },
      tp2: { price: currentPrice - atr * 2.5, confidence: 20, reason: 'ATR-based fallback (2.5 ATR)' },
      sl: { price: currentPrice + atr * 1.0, confidence: 30, reason: 'ATR-based fallback (1.0 ATR above)' },
      invalidation: { price: currentPrice + atr * 1.5, reason: 'Beyond 1.5 ATR above entry' },
      overallConfidence: 25,
      reasoning: 'AI prediction unavailable. Using ATR-based mechanical levels as fallback.',
      timeHorizon: 'Unknown',
    };
  }
}

/**
 * Main prediction function - calls Gemini and returns TP/SL targets
 */
export async function predictPriceTargets(input: AIPredictionInput): Promise<AIPredictionResult> {
  try {
    const prompt = buildPrompt(input);

    const response = await callGeminiWithRetry(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,   // Low temperature for precise numbers
          topP: 0.85,
          maxOutputTokens: 600,
        },
      },
      2,  // max 2 retries
      'ai_price_prediction',
      'expert',  // Use expert model for better accuracy
    );

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn('[AIPricePredictor] Empty response from Gemini');
      return atrFallback(input);
    }

    const result = parseAIResponse(text, input);
    if (!result) {
      console.warn('[AIPricePredictor] Failed to parse, falling back to ATR');
      return atrFallback(input);
    }

    console.log(`[AIPricePredictor] ${input.symbol} ${input.interval} ${input.direction}: TP1=$${result.tp1.price.toPrecision(6)} TP2=$${result.tp2.price.toPrecision(6)} SL=$${result.sl.price.toPrecision(6)} conf=${result.overallConfidence}%`);
    return result;
  } catch (err) {
    console.error('[AIPricePredictor] Prediction failed:', err);
    return atrFallback(input);
  }
}
