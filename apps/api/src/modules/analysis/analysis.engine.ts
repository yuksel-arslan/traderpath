// ===========================================
// TraderPath Analysis Engine - Production Grade
// Full Technical Specification Compliance
// ===========================================

import { randomUUID } from 'crypto';
import { config } from '../../core/config';
import { callGeminiWithRetry } from '../../core/gemini';
import { contractSecurityService } from '../security/contract-security.service';
import { TradeType, getTradeConfig, getStepConfig, Timeframe, AnalysisStep, IndicatorConfig, getMaxStopLossPercent, getMaxTakeProfitPercent } from './config/trade-config';
import { selectBundle, getBundleType } from './bundles';
import { aggregateScores, quickStepScore, STEP_WEIGHTS } from './scoring';
import {
  calculateStopLoss,
  calculateTakeProfits,
  calculatePositionSize,
  classifyRiskLevel,
  estimateWinRate,
} from './risk';
import { buildIndicatorAnalysis, indicatorInterpreterService } from './services/indicator-interpreter.service';
import { IndicatorAnalysis } from '../../../types';
import { IndicatorsService, OHLCV, IndicatorResult } from './services/indicators.service';
import { getTFTClient, TFTForecast } from './services/tft-client.service';
import { getTradingKnowledgeForAI } from '../ai-expert/trading-knowledge-base';

// NEW: Tokenomics and Indicator Classification imports
import { analyzeTokenomics, calculateTokenomicsRiskFactor, TokenomicsData } from './services/tokenomics.service';
import {
  isLeadingIndicator,
  getIndicatorDecisionWeight,
  calculateLeadingOnlyScore,
  LEADING_INDICATORS,
  LAGGING_INDICATORS,
} from './config/indicator-classification';

// NEW: Economic Calendar import
import { economicCalendarService, EconomicEvent } from './services/economic-calendar.service';

// NEW: MLIS (Multi-Layer Intelligence System) import
import { MLISService, MLISConfig, MLISResult, getMLISService, analyzeMLIS } from './services/mlis.service';

// NEW: Smart Money Index import
import { calculateSmartMoneyIndex, SmartMoneyIndexResult } from './services/smart-money-index.service';

// NEW: Multi-Asset Data Provider import
import {
  fetchCandles as fetchMultiAssetCandles,
  fetchTicker as fetchMultiAssetTicker,
  getAssetClass,
  isSymbolSupported,
  CandleData,
  TickerData,
  AssetClass,
} from './providers/multi-asset-data-provider';

// NEW: Asset-Specific Analyzers import
import {
  assetAnalyzerOrchestrator,
  MetalsMetrics,
  StocksMetrics,
  BondsMetrics,
  CryptoMetrics,
  AssetMetrics,
  SignalDirection,
  MarketRegime,
} from './services/asset-specific';

// ===========================================
// Asset-Specific Market Context
// ===========================================

interface AssetSpecificContext {
  assetClass: AssetClass;
  metrics: AssetMetrics | null;
  interMarketContext: {
    regime: MarketRegime;
    regimeConfidence: number;
    expectedBehavior: SignalDirection;
    anomalies: string[];
  } | null;
  keyDrivers: string[];
  warnings: string[];
}

/**
 * Get asset-specific market context for non-crypto assets
 * Uses specialized analyzers for metals, stocks, bonds
 */
async function getAssetSpecificContext(symbol: string): Promise<AssetSpecificContext> {
  const assetClass = getAssetClass(symbol);

  // For crypto, return null context (uses existing Market Pulse)
  if (assetClass === 'crypto') {
    return {
      assetClass,
      metrics: null,
      interMarketContext: null,
      keyDrivers: [],
      warnings: [],
    };
  }

  try {
    // Analyze the asset with asset-specific metrics
    const metrics = await assetAnalyzerOrchestrator.analyze(symbol);

    // Get inter-market context
    const interMarket = await assetAnalyzerOrchestrator.getInterMarketContext();

    // Build context
    const context: AssetSpecificContext = {
      assetClass,
      metrics,
      interMarketContext: {
        regime: interMarket.regime,
        regimeConfidence: interMarket.regimeConfidence,
        expectedBehavior: interMarket.expectedBehavior[assetClass],
        anomalies: interMarket.anomalies
          .filter(a => a.assetClass === assetClass)
          .map(a => a.message),
      },
      keyDrivers: metrics.keyDrivers,
      warnings: metrics.warnings,
    };

    // Add regime-specific warnings
    if (context.interMarketContext) {
      const expected = context.interMarketContext.expectedBehavior;
      const actual = metrics.sentiment;

      if (expected !== 'neutral' && actual !== 'neutral' && expected !== actual) {
        context.warnings.push(
          `⚠️ ${symbol} showing ${actual} behavior (expected ${expected} in ${interMarket.regime} regime)`
        );
      }
    }

    return context;
  } catch (error) {
    console.warn(`[AssetContext] Failed to get asset-specific context for ${symbol}:`, error);
    return {
      assetClass,
      metrics: null,
      interMarketContext: null,
      keyDrivers: [],
      warnings: [`Failed to analyze ${assetClass}-specific metrics`],
    };
  }
}

// ===========================================
// RAG Gate Evaluation with Gemini
// ===========================================

interface GateEvaluationInput {
  fearGreedIndex: number;
  fearGreedLabel: string;
  btcTrend: { direction: string; strength: number };
  trend4h: { direction: string; strength: number };
  trend1h: { direction: string; strength: number };
  timeframesAligned: number;
  marketRegime: string;
  fundingRate: number;
  longShortRatio: number;
  topTraderLongShortRatio: number;
  takerBuySellRatio: number;
  openInterestValue: number;
  btcPrice24hChange: number;
  newsSentiment: string;
}

interface GateEvaluationResult {
  canProceed: boolean;
  reason: string;
  confidence: number;
}

async function evaluateMarketGateWithRAG(input: GateEvaluationInput): Promise<GateEvaluationResult> {
  const GEMINI_API_KEY = config.gemini?.apiKey;

  // Fallback to rule-based if no API key
  if (!GEMINI_API_KEY) {
    return evaluateMarketGateRuleBased(input);
  }

  try {
    // Get trading knowledge for context (RAG)
    const tradingKnowledge = getTradingKnowledgeForAI();

    const prompt = `You are a professional crypto trader. Based on the market data below, evaluate whether current market conditions are suitable for opening trades.

IMPORTANT: You MUST respond in English only.

## Market Data:
- Fear & Greed Index: ${input.fearGreedIndex} (${input.fearGreedLabel})
- BTC Daily Trend: ${input.btcTrend.direction} (${input.btcTrend.strength}% strength)
- BTC 4H Trend: ${input.trend4h.direction} (${input.trend4h.strength}% strength)
- BTC 1H Trend: ${input.trend1h.direction} (${input.trend1h.strength}% strength)
- Timeframe Alignment: ${input.timeframesAligned}/4
- Market Regime: ${input.marketRegime}
- BTC 24h Change: ${input.btcPrice24hChange.toFixed(2)}%
- Funding Rate: ${input.fundingRate.toFixed(4)}%
- Long/Short Ratio: ${input.longShortRatio.toFixed(2)}
- Top Trader L/S Ratio: ${input.topTraderLongShortRatio.toFixed(2)}
- Taker Buy/Sell Ratio: ${input.takerBuySellRatio.toFixed(2)}
- Open Interest: $${(input.openInterestValue / 1e9).toFixed(2)}B
- News Sentiment: ${input.newsSentiment}

## Trading Knowledge:
${tradingKnowledge}

## Task:
Based on the data above, evaluate whether market conditions are suitable for trading.

Respond ONLY in the following JSON format, nothing else:
{
  "canProceed": true or false,
  "reason": "Brief and clear explanation (maximum 2 sentences)",
  "confidence": confidence score between 0-100
}`;

    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      },
    }, 3, 'market_gate');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        canProceed: Boolean(parsed.canProceed),
        reason: String(parsed.reason || 'Evaluation completed'),
        confidence: Number(parsed.confidence) || 50,
      };
    }

    return evaluateMarketGateRuleBased(input);
  } catch (error) {
    console.warn('RAG gate evaluation failed, falling back to rule-based:', error);
    return evaluateMarketGateRuleBased(input);
  }
}

function evaluateMarketGateRuleBased(input: GateEvaluationInput): GateEvaluationResult {
  const reasons: string[] = [];
  let score = 50; // Base score

  // Fear & Greed evaluation
  if (input.fearGreedIndex <= 20) {
    reasons.push('Extreme fear - high risk');
    score -= 20;
  } else if (input.fearGreedIndex <= 35) {
    reasons.push('Fear mode - caution advised');
    score -= 10;
  } else if (input.fearGreedIndex >= 80) {
    reasons.push('Extreme greed - correction risk');
    score -= 15;
  } else if (input.fearGreedIndex >= 55) {
    score += 10;
  }

  // Trend alignment
  if (input.timeframesAligned >= 3) {
    score += 15;
  } else if (input.timeframesAligned <= 1) {
    reasons.push('Timeframe misalignment');
    score -= 10;
  }

  // BTC trend strength
  if (input.btcTrend.strength >= 70) {
    score += 10;
  } else if (input.btcTrend.strength <= 30) {
    reasons.push('Weak trend');
    score -= 10;
  }

  // Funding rate (extreme values indicate crowded trades)
  if (Math.abs(input.fundingRate) > 0.1) {
    reasons.push(`Extreme funding rate (${input.fundingRate.toFixed(3)}%)`);
    score -= 15;
  }

  // Long/Short imbalance
  if (input.longShortRatio > 2) {
    reasons.push('Excessive long position concentration');
    score -= 10;
  } else if (input.longShortRatio < 0.5) {
    reasons.push('Excessive short position concentration');
    score -= 10;
  }

  // News sentiment
  if (input.newsSentiment === 'bearish') {
    score -= 10;
  } else if (input.newsSentiment === 'bullish') {
    score += 5;
  }

  // Market regime
  if (input.marketRegime === 'risk_off') {
    reasons.push('Risk-off market environment');
    score -= 20;
  } else if (input.marketRegime === 'risk_on') {
    score += 15;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  const canProceed = score >= 45;
  const reason = canProceed
    ? 'Market conditions suitable for trading'
    : reasons.length > 0
      ? reasons.slice(0, 2).join(', ')
      : 'Market conditions uncertain';

  return {
    canProceed,
    reason,
    confidence: score,
  };
}

// ===========================================
// Asset Scanner Gate Evaluation
// ===========================================

interface AssetGateEvaluationInput {
  symbol: string;
  rsi: number;
  macdHistogram: number;
  trendDirection: string;
  trendStrength: number;
  timeframeAlignment: number; // How many timeframes agree
  priceChange24h: number;
  volume24h: number;
  atr: number;
  currentPrice: number;
  supportLevels: number[];
  resistanceLevels: number[];
  leadingIndicatorsSignal?: string;
  signalConfidence?: number;
  // Candlestick pattern confirmation
  bullishPatternCount?: number;
  bearishPatternCount?: number;
  highSignificancePatterns?: string[];
}

interface AssetGateEvaluationResult {
  canProceed: boolean;
  reason: string;
  confidence: number;
  direction: 'long' | 'short' | null;
  directionConfidence: number;
}

async function evaluateAssetGateWithRAG(input: AssetGateEvaluationInput): Promise<AssetGateEvaluationResult> {
  const GEMINI_API_KEY = config.gemini?.apiKey;

  // Fallback to rule-based if no API key
  if (!GEMINI_API_KEY) {
    return evaluateAssetGateRuleBased(input);
  }

  try {
    const tradingKnowledge = getTradingKnowledgeForAI();

    const patternInfo = input.highSignificancePatterns && input.highSignificancePatterns.length > 0
      ? `High-significance patterns: ${input.highSignificancePatterns.join(', ')}`
      : 'No high-significance patterns detected';
    const patternBalance = (input.bullishPatternCount || 0) - (input.bearishPatternCount || 0);

    const prompt = `You are a professional crypto trader. Based on the asset data below, evaluate whether this specific asset is suitable for trading.

IMPORTANT: You MUST respond in English only.

## Asset Data for ${input.symbol}:
- Current Price: $${input.currentPrice.toLocaleString()}
- 24h Price Change: ${input.priceChange24h.toFixed(2)}%
- RSI (14): ${input.rsi.toFixed(1)}
- MACD Histogram: ${input.macdHistogram > 0 ? 'Positive' : 'Negative'} (${input.macdHistogram.toFixed(4)})
- Trend Direction: ${input.trendDirection}
- Trend Strength: ${input.trendStrength}%
- Timeframe Alignment: ${input.timeframeAlignment}/5 timeframes agree
- Leading Indicators Signal: ${input.leadingIndicatorsSignal || 'N/A'}
- Signal Confidence: ${input.signalConfidence || 0}%
- ATR: ${input.atr.toFixed(2)} (volatility measure)
- Support Levels: ${input.supportLevels.slice(0, 2).map(s => '$' + s.toLocaleString()).join(', ')}
- Resistance Levels: ${input.resistanceLevels.slice(0, 2).map(r => '$' + r.toLocaleString()).join(', ')}
- Candlestick Patterns: ${patternInfo} (Bullish: ${input.bullishPatternCount || 0}, Bearish: ${input.bearishPatternCount || 0})

## Trading Knowledge:
${tradingKnowledge}

## Task:
1. Evaluate if this asset is suitable for trading (not the market, the specific asset)
2. If suitable, determine the recommended direction (long or short)

Respond ONLY in the following JSON format:
{
  "canProceed": true or false,
  "reason": "Brief explanation (max 2 sentences)",
  "confidence": 0-100,
  "direction": "long" or "short" or null,
  "directionConfidence": 0-100
}`;

    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 250,
      },
    }, 3, 'asset_gate');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        canProceed: Boolean(parsed.canProceed),
        reason: String(parsed.reason || 'Evaluation completed'),
        confidence: Number(parsed.confidence) || 50,
        direction: parsed.direction === 'long' ? 'long' : parsed.direction === 'short' ? 'short' : null,
        directionConfidence: Number(parsed.directionConfidence) || 0,
      };
    }

    return evaluateAssetGateRuleBased(input);
  } catch (error) {
    console.warn('Asset RAG gate evaluation failed:', error);
    return evaluateAssetGateRuleBased(input);
  }
}

function evaluateAssetGateRuleBased(input: AssetGateEvaluationInput): AssetGateEvaluationResult {
  const reasons: string[] = [];
  let score = 50;
  let direction: 'long' | 'short' | null = null;
  let directionScore = 0;

  // RSI evaluation
  if (input.rsi > 80) {
    reasons.push('RSI extremely overbought');
    score -= 15;
    directionScore -= 20;
  } else if (input.rsi > 70) {
    reasons.push('RSI overbought');
    score -= 5;
    directionScore -= 10;
  } else if (input.rsi < 20) {
    reasons.push('RSI extremely oversold');
    score -= 10;
    directionScore += 15; // Potential bounce
  } else if (input.rsi < 30) {
    directionScore += 10;
  } else if (input.rsi >= 40 && input.rsi <= 60) {
    score += 5; // Neutral zone is good for entry
  }

  // MACD evaluation
  if (input.macdHistogram > 0) {
    score += 5;
    directionScore += 15;
  } else {
    directionScore -= 15;
  }

  // Trend evaluation
  if (input.trendDirection === 'bullish') {
    score += 10;
    directionScore += 20;
  } else if (input.trendDirection === 'bearish') {
    directionScore -= 20;
  }

  // Trend strength
  if (input.trendStrength >= 70) {
    score += 10;
  } else if (input.trendStrength <= 30) {
    reasons.push('Weak trend strength');
    score -= 10;
  }

  // Timeframe alignment
  if (input.timeframeAlignment >= 4) {
    score += 15;
  } else if (input.timeframeAlignment <= 1) {
    reasons.push('Poor timeframe alignment');
    score -= 15;
  }

  // Leading indicators signal
  if (input.leadingIndicatorsSignal === 'bullish' && (input.signalConfidence || 0) >= 60) {
    score += 10;
    directionScore += 15;
  } else if (input.leadingIndicatorsSignal === 'bearish' && (input.signalConfidence || 0) >= 60) {
    directionScore -= 15;
  }

  // Candlestick pattern confirmation for direction
  const bullishPatterns = input.bullishPatternCount || 0;
  const bearishPatterns = input.bearishPatternCount || 0;
  const hasHighSigPatterns = (input.highSignificancePatterns?.length || 0) > 0;

  if (hasHighSigPatterns) {
    score += 10; // High-significance patterns are valuable
    if (bullishPatterns > bearishPatterns && input.trendDirection === 'bullish') {
      // Bullish patterns confirm bullish trend
      directionScore += 15;
    } else if (bearishPatterns > bullishPatterns && input.trendDirection === 'bearish') {
      // Bearish patterns confirm bearish trend
      directionScore -= 15;
    } else if (bullishPatterns > bearishPatterns) {
      // Bullish patterns against trend - potential reversal
      directionScore += 10;
    } else if (bearishPatterns > bullishPatterns) {
      // Bearish patterns against trend - potential reversal
      directionScore -= 10;
    }
  }

  // 24h price change - extreme moves are risky
  if (Math.abs(input.priceChange24h) > 15) {
    reasons.push('Extreme 24h price movement');
    score -= 10;
  }

  // Determine direction
  if (directionScore >= 20) {
    direction = 'long';
  } else if (directionScore <= -20) {
    direction = 'short';
  }

  score = Math.max(0, Math.min(100, score));
  const directionConfidence = Math.min(100, Math.abs(directionScore) + 30);

  const canProceed = score >= 45;
  const reason = canProceed
    ? `Asset shows ${direction === 'long' ? 'bullish' : direction === 'short' ? 'bearish' : 'neutral'} setup with ${input.trendStrength}% trend strength`
    : reasons.length > 0
      ? reasons.slice(0, 2).join(', ')
      : 'Asset conditions uncertain';

  return {
    canProceed,
    reason,
    confidence: score,
    direction,
    directionConfidence,
  };
}

// ===========================================
// STEP 3: Safety Check Gate Evaluation
// ===========================================

interface SafetyGateEvaluationInput {
  symbol: string;
  riskLevel: 'low' | 'medium' | 'high';
  spoofingDetected: boolean;
  layeringDetected: boolean;
  washTrading: boolean;
  pumpDumpRisk: 'low' | 'medium' | 'high';
  whaleBias: 'accumulation' | 'distribution' | 'neutral';
  netFlowUsd: number;
  orderFlowImbalance: number;
  smartMoneyPositioning: 'long' | 'short' | 'neutral';
  volumeSpike: boolean;
  volumeSpikeFactor: number;
  liquidityScore: number;
  warnings: string[];
}

interface SafetyGateEvaluationResult {
  canProceed: boolean;
  reason: string;
  confidence: number;
  riskAdjustment: number; // -100 to +100, affects position sizing
}

async function evaluateSafetyGateWithRAG(input: SafetyGateEvaluationInput): Promise<SafetyGateEvaluationResult> {
  const GEMINI_API_KEY = config.gemini?.apiKey;

  if (!GEMINI_API_KEY) {
    return evaluateSafetyGateRuleBased(input);
  }

  try {
    const tradingKnowledge = getTradingKnowledgeForAI();

    const prompt = `You are a professional crypto trader evaluating trade safety. Analyze the following safety metrics.

IMPORTANT: You MUST respond in English only.

## Safety Data for ${input.symbol}:
- Overall Risk Level: ${input.riskLevel}
- Spoofing Detected: ${input.spoofingDetected}
- Layering Detected: ${input.layeringDetected}
- Wash Trading: ${input.washTrading}
- Pump & Dump Risk: ${input.pumpDumpRisk}
- Whale Activity Bias: ${input.whaleBias}
- Net Whale Flow: $${input.netFlowUsd.toLocaleString()}
- Order Flow Imbalance: ${(input.orderFlowImbalance * 100).toFixed(1)}%
- Smart Money Positioning: ${input.smartMoneyPositioning}
- Volume Spike: ${input.volumeSpike ? `Yes (${input.volumeSpikeFactor.toFixed(1)}x)` : 'No'}
- Liquidity Score: ${input.liquidityScore.toFixed(0)}/100
- Warnings: ${input.warnings.length > 0 ? input.warnings.join(', ') : 'None'}

## Trading Knowledge:
${tradingKnowledge}

## Task:
Evaluate if it's safe to proceed with the trade. Consider manipulation risks, whale activity, and liquidity.

Respond ONLY in the following JSON format:
{
  "canProceed": true or false,
  "reason": "Brief explanation (max 2 sentences)",
  "confidence": 0-100,
  "riskAdjustment": -100 to +100 (negative means reduce position size, positive means can increase)
}`;

    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 250 },
    }, 3, 'safety_gate');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        canProceed: Boolean(parsed.canProceed),
        reason: String(parsed.reason || 'Safety evaluation completed'),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 50)),
        riskAdjustment: Math.max(-100, Math.min(100, Number(parsed.riskAdjustment) || 0)),
      };
    }

    return evaluateSafetyGateRuleBased(input);
  } catch (error) {
    console.warn('Safety RAG evaluation failed:', error);
    return evaluateSafetyGateRuleBased(input);
  }
}

function evaluateSafetyGateRuleBased(input: SafetyGateEvaluationInput): SafetyGateEvaluationResult {
  let score = 70;
  let riskAdjustment = 0;
  const reasons: string[] = [];

  // Critical risks - block trade
  if (input.pumpDumpRisk === 'high') {
    score -= 40;
    riskAdjustment -= 50;
    reasons.push('High pump & dump risk');
  }
  if (input.spoofingDetected && input.layeringDetected) {
    score -= 30;
    riskAdjustment -= 30;
    reasons.push('Market manipulation detected');
  }

  // Medium risks
  if (input.riskLevel === 'high') {
    score -= 25;
    riskAdjustment -= 25;
  } else if (input.riskLevel === 'medium') {
    score -= 10;
    riskAdjustment -= 10;
  }

  if (input.washTrading) {
    score -= 15;
    reasons.push('Wash trading activity');
  }

  if (input.liquidityScore < 30) {
    score -= 20;
    riskAdjustment -= 20;
    reasons.push('Low liquidity');
  }

  // Positive factors
  if (input.whaleBias === 'accumulation') {
    score += 10;
    riskAdjustment += 10;
  }
  if (input.smartMoneyPositioning !== 'neutral') {
    score += 5;
  }
  if (input.liquidityScore > 70) {
    score += 10;
    riskAdjustment += 10;
  }

  score = Math.max(0, Math.min(100, score));
  riskAdjustment = Math.max(-100, Math.min(100, riskAdjustment));

  const canProceed = score >= 40;
  const reason = canProceed
    ? `Safety check passed with ${input.riskLevel} risk level`
    : reasons.length > 0
      ? reasons.slice(0, 2).join(', ')
      : 'Safety conditions not met';

  return { canProceed, reason, confidence: score, riskAdjustment };
}

// ===========================================
// STEP 4: Timing Gate Evaluation
// ===========================================

interface TimingGateEvaluationInput {
  symbol: string;
  currentPrice: number;
  rsiValue: number;
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  volumeConfirmation: boolean;
  nearSupport: boolean;
  nearResistance: boolean;
  trendStrength: number;
  entryQuality: number;
  momentum: 'accelerating' | 'decelerating' | 'stable';
}

interface TimingGateEvaluationResult {
  canProceed: boolean;
  reason: string;
  confidence: number;
  urgency: 'immediate' | 'soon' | 'wait' | 'avoid';
}

async function evaluateTimingGateWithRAG(input: TimingGateEvaluationInput): Promise<TimingGateEvaluationResult> {
  const GEMINI_API_KEY = config.gemini?.apiKey;

  if (!GEMINI_API_KEY) {
    return evaluateTimingGateRuleBased(input);
  }

  try {
    const tradingKnowledge = getTradingKnowledgeForAI();

    const prompt = `You are a professional crypto trader evaluating entry timing. Analyze when to enter this trade.

IMPORTANT: You MUST respond in English only.

## Timing Data for ${input.symbol}:
- Current Price: $${input.currentPrice.toLocaleString()}
- RSI: ${input.rsiValue.toFixed(1)}
- MACD Signal: ${input.macdSignal}
- Volume Confirmation: ${input.volumeConfirmation ? 'Yes' : 'No'}
- Near Support: ${input.nearSupport ? 'Yes' : 'No'}
- Near Resistance: ${input.nearResistance ? 'Yes' : 'No'}
- Trend Strength: ${input.trendStrength}%
- Entry Quality Score: ${input.entryQuality}/10
- Momentum: ${input.momentum}

## Trading Knowledge:
${tradingKnowledge}

## Task:
Evaluate if the timing is right for entry. Consider RSI extremes, support/resistance levels, and momentum.

Respond ONLY in the following JSON format:
{
  "canProceed": true or false,
  "reason": "Brief explanation (max 2 sentences)",
  "confidence": 0-100,
  "urgency": "immediate" or "soon" or "wait" or "avoid"
}`;

    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 250 },
    }, 3, 'timing_gate');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validUrgency = ['immediate', 'soon', 'wait', 'avoid'].includes(parsed.urgency) ? parsed.urgency : 'wait';
      return {
        canProceed: Boolean(parsed.canProceed),
        reason: String(parsed.reason || 'Timing evaluation completed'),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 50)),
        urgency: validUrgency,
      };
    }

    return evaluateTimingGateRuleBased(input);
  } catch (error) {
    console.warn('Timing RAG evaluation failed:', error);
    return evaluateTimingGateRuleBased(input);
  }
}

function evaluateTimingGateRuleBased(input: TimingGateEvaluationInput): TimingGateEvaluationResult {
  let score = 50;
  let urgency: 'immediate' | 'soon' | 'wait' | 'avoid' = 'wait';
  const reasons: string[] = [];

  // RSI signals
  if (input.rsiValue < 30) {
    score += 20;
    reasons.push('RSI oversold');
    urgency = 'soon';
  } else if (input.rsiValue > 70) {
    score += 15; // Good for shorts
    reasons.push('RSI overbought');
    urgency = 'soon';
  } else if (input.rsiValue >= 40 && input.rsiValue <= 60) {
    score += 5; // Neutral zone
  }

  // Support/Resistance
  if (input.nearSupport && input.macdSignal === 'bullish') {
    score += 25;
    urgency = 'immediate';
    reasons.push('At support with bullish signal');
  }
  if (input.nearResistance && input.macdSignal === 'bearish') {
    score += 20;
    urgency = 'immediate';
    reasons.push('At resistance with bearish signal');
  }

  // Volume and momentum
  if (input.volumeConfirmation) {
    score += 15;
  }
  if (input.momentum === 'accelerating') {
    score += 10;
  } else if (input.momentum === 'decelerating') {
    score -= 10;
  }

  // Entry quality
  score += (input.entryQuality - 5) * 3;

  score = Math.max(0, Math.min(100, score));

  if (score >= 75) urgency = 'immediate';
  else if (score >= 55) urgency = 'soon';
  else if (score >= 35) urgency = 'wait';
  else urgency = 'avoid';

  const canProceed = score >= 45;
  const reason = canProceed
    ? reasons.length > 0 ? reasons[0] : 'Timing conditions favorable'
    : 'Wait for better entry timing';

  return { canProceed, reason, confidence: score, urgency };
}

// ===========================================
// STEP 5: Trade Plan Gate Evaluation
// ===========================================

interface TradePlanGateEvaluationInput {
  symbol: string;
  direction: 'long' | 'short';
  riskRewardRatio: number;
  winRateEstimate: number;
  positionSizePercent: number;
  stopLossPercent: number;
  targetCount: number;
  averageTargetPercent: number;
}

interface TradePlanGateEvaluationResult {
  canProceed: boolean;
  reason: string;
  confidence: number;
  planQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
}

async function evaluateTradePlanGateWithRAG(input: TradePlanGateEvaluationInput): Promise<TradePlanGateEvaluationResult> {
  const GEMINI_API_KEY = config.gemini?.apiKey;

  if (!GEMINI_API_KEY) {
    return evaluateTradePlanGateRuleBased(input);
  }

  try {
    const tradingKnowledge = getTradingKnowledgeForAI();

    const prompt = `You are a professional crypto trader evaluating a trade plan. Analyze if this plan is worth executing.

IMPORTANT: You MUST respond in English only.

## Trade Plan for ${input.symbol}:
- Direction: ${input.direction.toUpperCase()}
- Risk/Reward Ratio: ${input.riskRewardRatio.toFixed(2)}
- Estimated Win Rate: ${input.winRateEstimate}%
- Position Size: ${input.positionSizePercent.toFixed(1)}% of portfolio
- Stop Loss: ${input.stopLossPercent.toFixed(2)}% from entry
- Take Profit Targets: ${input.targetCount}
- Average Target: +${input.averageTargetPercent.toFixed(2)}%

## Trading Knowledge:
${tradingKnowledge}

## Task:
Evaluate if this trade plan has positive expected value. Consider R:R, win rate, and position sizing.

Respond ONLY in the following JSON format:
{
  "canProceed": true or false,
  "reason": "Brief explanation (max 2 sentences)",
  "confidence": 0-100,
  "planQuality": "excellent" or "good" or "acceptable" or "poor"
}`;

    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 250 },
    }, 3, 'trade_plan_gate');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validQuality = ['excellent', 'good', 'acceptable', 'poor'].includes(parsed.planQuality) ? parsed.planQuality : 'acceptable';
      return {
        canProceed: Boolean(parsed.canProceed),
        reason: String(parsed.reason || 'Trade plan evaluation completed'),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 50)),
        planQuality: validQuality,
      };
    }

    return evaluateTradePlanGateRuleBased(input);
  } catch (error) {
    console.warn('Trade Plan RAG evaluation failed:', error);
    return evaluateTradePlanGateRuleBased(input);
  }
}

function evaluateTradePlanGateRuleBased(input: TradePlanGateEvaluationInput): TradePlanGateEvaluationResult {
  let score = 50;
  let planQuality: 'excellent' | 'good' | 'acceptable' | 'poor' = 'acceptable';

  // Risk/Reward evaluation
  if (input.riskRewardRatio >= 3) {
    score += 30;
  } else if (input.riskRewardRatio >= 2) {
    score += 20;
  } else if (input.riskRewardRatio >= 1.5) {
    score += 10;
  } else if (input.riskRewardRatio < 1) {
    score -= 30;
  }

  // Win rate impact
  if (input.winRateEstimate >= 60) {
    score += 15;
  } else if (input.winRateEstimate >= 50) {
    score += 5;
  } else if (input.winRateEstimate < 40) {
    score -= 15;
  }

  // Expected value calculation
  const expectedValue = (input.winRateEstimate / 100) * input.riskRewardRatio - (1 - input.winRateEstimate / 100);
  if (expectedValue > 0.5) {
    score += 20;
  } else if (expectedValue > 0.2) {
    score += 10;
  } else if (expectedValue < 0) {
    score -= 25;
  }

  // Position sizing check
  if (input.positionSizePercent > 10) {
    score -= 15; // Over-leveraged
  } else if (input.positionSizePercent <= 2) {
    score += 5; // Conservative
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 80) planQuality = 'excellent';
  else if (score >= 60) planQuality = 'good';
  else if (score >= 40) planQuality = 'acceptable';
  else planQuality = 'poor';

  const canProceed = score >= 45;
  const reason = canProceed
    ? `R:R of ${input.riskRewardRatio.toFixed(1)} with ${input.winRateEstimate}% win rate`
    : 'Trade plan does not meet minimum criteria';

  return { canProceed, reason, confidence: score, planQuality };
}

// ===========================================
// STEP 6: Trap Check Gate Evaluation
// ===========================================

interface TrapGateEvaluationInput {
  symbol: string;
  bullTrap: boolean;
  bearTrap: boolean;
  liquidityGrabDetected: boolean;
  stopHuntZonesCount: number;
  fakeoutRisk: 'low' | 'medium' | 'high';
  liquidationLevelsNearby: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface TrapGateEvaluationResult {
  canProceed: boolean;
  reason: string;
  confidence: number;
  trapRisk: 'minimal' | 'moderate' | 'elevated' | 'severe';
}

async function evaluateTrapGateWithRAG(input: TrapGateEvaluationInput): Promise<TrapGateEvaluationResult> {
  const GEMINI_API_KEY = config.gemini?.apiKey;

  if (!GEMINI_API_KEY) {
    return evaluateTrapGateRuleBased(input);
  }

  try {
    const tradingKnowledge = getTradingKnowledgeForAI();

    const prompt = `You are a professional crypto trader evaluating trap risks. Analyze potential market traps.

IMPORTANT: You MUST respond in English only.

## Trap Analysis for ${input.symbol}:
- Bull Trap Detected: ${input.bullTrap ? 'Yes' : 'No'}
- Bear Trap Detected: ${input.bearTrap ? 'Yes' : 'No'}
- Liquidity Grab Detected: ${input.liquidityGrabDetected ? 'Yes' : 'No'}
- Stop Hunt Zones: ${input.stopHuntZonesCount}
- Fakeout Risk: ${input.fakeoutRisk}
- Nearby Liquidation Levels: ${input.liquidationLevelsNearby}
- Overall Risk Level: ${input.riskLevel}

## Trading Knowledge:
${tradingKnowledge}

## Task:
Evaluate if the trade can proceed safely or if trap risks are too high. Consider all trap indicators.

Respond ONLY in the following JSON format:
{
  "canProceed": true or false,
  "reason": "Brief explanation (max 2 sentences)",
  "confidence": 0-100,
  "trapRisk": "minimal" or "moderate" or "elevated" or "severe"
}`;

    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 250 },
    }, 3, 'trap_gate');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validRisk = ['minimal', 'moderate', 'elevated', 'severe'].includes(parsed.trapRisk) ? parsed.trapRisk : 'moderate';
      return {
        canProceed: Boolean(parsed.canProceed),
        reason: String(parsed.reason || 'Trap evaluation completed'),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 50)),
        trapRisk: validRisk,
      };
    }

    return evaluateTrapGateRuleBased(input);
  } catch (error) {
    console.warn('Trap RAG evaluation failed:', error);
    return evaluateTrapGateRuleBased(input);
  }
}

function evaluateTrapGateRuleBased(input: TrapGateEvaluationInput): TrapGateEvaluationResult {
  let score = 70;
  let trapRisk: 'minimal' | 'moderate' | 'elevated' | 'severe' = 'moderate';
  const reasons: string[] = [];

  // Critical traps
  if (input.bullTrap && input.bearTrap) {
    score -= 40;
    trapRisk = 'severe';
    reasons.push('Multiple trap patterns detected');
  } else if (input.bullTrap) {
    score -= 25;
    reasons.push('Bull trap detected');
  } else if (input.bearTrap) {
    score -= 25;
    reasons.push('Bear trap detected');
  }

  // Liquidity risks
  if (input.liquidityGrabDetected) {
    score -= 20;
    reasons.push('Liquidity grab in progress');
  }

  if (input.stopHuntZonesCount > 3) {
    score -= 15;
  } else if (input.stopHuntZonesCount > 1) {
    score -= 8;
  }

  // Fakeout risk
  if (input.fakeoutRisk === 'high') {
    score -= 20;
  } else if (input.fakeoutRisk === 'medium') {
    score -= 10;
  }

  // Nearby liquidations
  if (input.liquidationLevelsNearby > 5) {
    score -= 15;
  }

  // Overall risk
  if (input.riskLevel === 'high') {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 75) trapRisk = 'minimal';
  else if (score >= 55) trapRisk = 'moderate';
  else if (score >= 35) trapRisk = 'elevated';
  else trapRisk = 'severe';

  const canProceed = score >= 40;
  const reason = canProceed
    ? `Trap risk is ${trapRisk}, proceed with caution`
    : reasons.length > 0 ? reasons[0] : 'High trap risk detected';

  return { canProceed, reason, confidence: score, trapRisk };
}

// ===========================================
// ===========================================
// AI Summary & Tokenomics Insight Generation
// Auto-generates expert analysis for reports
// ===========================================

interface AIAnalysisSummaryInput {
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  overallScore: number;
  direction?: 'long' | 'short' | null;
  currentPrice: number;
  riskReward?: number;
  keyMetrics: {
    rsi: number;
    macdHistogram: number;
    fearGreedIndex: number;
    btcDominance: number;
    riskLevel: string;
    whaleActivity: string;
  };
  tokenomics?: TokenomicsData | null;
  tradeType?: TradeType;
}

async function generateAIAnalysisSummary(input: AIAnalysisSummaryInput): Promise<{ aiSummary: string; tokenomicsInsight: string }> {
  // Safe defaults with null checks
  const symbol = input.symbol || 'UNKNOWN';
  const verdict = input.verdict || 'wait';
  const overallScore = input.overallScore ?? 0;
  const direction = input.direction || 'neutral';
  const currentPrice = input.currentPrice || 0;
  const riskReward = input.riskReward || 'N/A';
  const tradeType = input.tradeType || 'dayTrade';

  // Default fallback response
  const fallbackResponse = {
    aiSummary: `${symbol} analysis complete with score ${overallScore.toFixed(1)}/10. Verdict: ${verdict.toUpperCase()}.`,
    tokenomicsInsight: input.tokenomics ? 'Tokenomics data available.' : 'Tokenomics data not available.',
  };

  try {
    const GEMINI_API_KEY = config.gemini?.apiKey;

    if (!GEMINI_API_KEY) {
      console.warn('[AI Summary] Gemini API key not configured');
      return fallbackResponse;
    }

    const tradeTypeLabel = {
      scalping: 'Scalping (1-15min)',
      dayTrade: 'Day Trade (15min-4h)',
      swing: 'Swing Trade (4h-1d)',
    }[tradeType] || 'Day Trade';

    const verdictLabel = {
      go: 'GO - Strong setup',
      conditional_go: 'CONDITIONAL GO - Proceed with caution',
      wait: 'WAIT - Not ideal conditions',
      avoid: 'AVOID - High risk detected',
    }[verdict] || 'Analysis pending';

    // Build tokenomics context with null safety
    let tokenomicsContext = '';
    if (input.tokenomics) {
      const tk = input.tokenomics;
      const marketCap = tk.market?.marketCap ? (tk.market.marketCap / 1e9).toFixed(2) : 'N/A';
      const circPercent = tk.supply?.circulatingPercent?.toFixed(1) || 'N/A';
      const mcapFdv = tk.market?.mcapFdvRatio?.toFixed(2) || 'N/A';
      const tkScore = tk.assessment?.overallScore || 'N/A';

      tokenomicsContext = `
TOKENOMICS DATA:
- Market Cap: $${marketCap}B
- Circulating Supply: ${circPercent}% of total
- Inflation Risk: ${tk.supply?.inflationRisk || 'unknown'}
- Dilution Risk: ${tk.market?.dilutionRisk || 'unknown'}
- FDV/MCap Ratio: ${mcapFdv}
- Liquidity Health: ${tk.market?.liquidityHealth || 'unknown'}
- Whale Concentration Risk: ${tk.whaleConcentration?.concentrationRisk || 'unknown'}
- Tokenomics Score: ${tkScore}/100 (${tk.assessment?.riskLevel || 'unknown'} risk)
- Assessment: ${tk.assessment?.recommendation || 'No assessment available'}`;
    }

    // Safe metric extraction with full null checks
    const keyMetrics = input.keyMetrics || {};
    const rsi = keyMetrics.rsi?.toFixed(1) || '50';
    const macdHist = keyMetrics.macdHistogram?.toFixed(4) || '0';
    const fearGreed = keyMetrics.fearGreedIndex || 50;
    const btcDom = keyMetrics.btcDominance?.toFixed(1) || '50';
    const riskLevel = keyMetrics.riskLevel || 'moderate';
    const whaleActivity = keyMetrics.whaleActivity || 'normal';

    const prompt = `You are a professional crypto analyst. Generate TWO separate analyses:

ANALYSIS REQUEST FOR ${symbol}:
- Trade Type: ${tradeTypeLabel}
- Verdict: ${verdictLabel}
- Score: ${overallScore}/10
- Direction: ${direction}
- Current Price: $${currentPrice}
- R:R Ratio: ${riskReward}

KEY METRICS:
- RSI: ${rsi}
- MACD Histogram: ${macdHist}
- Fear & Greed: ${fearGreed}
- BTC Dominance: ${btcDom}%
- Risk Level: ${riskLevel}
- Whale Activity: ${whaleActivity}
${tokenomicsContext}

GENERATE:

1. AI_SUMMARY (2-3 sentences):
A concise professional summary explaining the verdict for ${symbol}. Include key reasons for the decision. Be specific about what traders should consider.

2. TOKENOMICS_INSIGHT (2-3 sentences):
${input.tokenomics ? `Interpret the tokenomics data for ${symbol}. Explain the supply dynamics, dilution risk, and how tokenomics affects the trade setup. Be specific with percentages.` : `State that tokenomics data is not available for ${symbol} and recommend checking supply metrics before large positions.`}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
AI_SUMMARY: [your summary here]
TOKENOMICS_INSIGHT: [your tokenomics analysis here]

RULES:
- Be professional and data-driven
- Use specific numbers
- No emojis
- No questions at the end
- Keep each section to 2-3 sentences max`;

    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
      },
    }, 3, 'ai_summary');

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text || '';

    // Parse the response
    const aiSummaryMatch = text.match(/AI_SUMMARY:\s*(.+?)(?=TOKENOMICS_INSIGHT:|$)/s);
    const tokenomicsMatch = text.match(/TOKENOMICS_INSIGHT:\s*(.+?)$/s);

    const aiSummary = aiSummaryMatch?.[1]?.trim() || `${symbol} ${verdict.toUpperCase()} recommendation with ${overallScore}/10 score.`;
    const tokenomicsInsight = tokenomicsMatch?.[1]?.trim() || (input.tokenomics
      ? `${symbol} has ${input.tokenomics.supply?.circulatingPercent?.toFixed(0) || 'unknown'}% circulating supply with ${input.tokenomics.market?.dilutionRisk || 'unknown'} dilution risk.`
      : 'Tokenomics data not available for this asset.');

    console.log(`[AI Summary] Generated for ${symbol}: ${aiSummary.slice(0, 50)}...`);

    return { aiSummary, tokenomicsInsight };
  } catch (error) {
    console.error('[AI Summary] Generation failed:', error);
    return fallbackResponse;
  }
}

// ===========================================
// Price Formatting Utility
// Handles decimal precision based on price level
// ===========================================

function roundPrice(price: number): number {
  if (price === 0) return 0;

  // Determine appropriate decimal places based on price magnitude
  if (price >= 10000) {
    // BTC-like: $93,245.50
    return Math.round(price * 100) / 100;
  } else if (price >= 100) {
    // ETH-like: $3,456.78
    return Math.round(price * 100) / 100;
  } else if (price >= 1) {
    // SOL-like: $123.4567
    return Math.round(price * 10000) / 10000;
  } else if (price >= 0.01) {
    // DOGE-like: $0.31234567
    return Math.round(price * 100000000) / 100000000;
  } else {
    // SHIB-like: $0.00002345
    return Math.round(price * 100000000000) / 100000000000;
  }
}

// ===========================================
// Trade Type Timeframe Configuration
// ===========================================

interface TradeTypeTimeframes {
  primary: string;
  secondary: string;
  confirmation: string;
  candleCounts: { primary: number; secondary: number; confirmation: number };
}

const TRADE_TYPE_TIMEFRAMES: Record<TradeType, TradeTypeTimeframes> = {
  scalping: {
    primary: '1m',
    secondary: '5m',
    confirmation: '15m',
    candleCounts: { primary: 100, secondary: 50, confirmation: 30 },
  },
  dayTrade: {
    primary: '15m',
    secondary: '1h',
    confirmation: '4h',
    candleCounts: { primary: 96, secondary: 48, confirmation: 24 },
  },
  swing: {
    primary: '4h',
    secondary: '1d',
    confirmation: '1w',
    candleCounts: { primary: 90, secondary: 60, confirmation: 12 },
  },
};

function getTimeframesForTradeType(tradeType: TradeType = 'dayTrade'): TradeTypeTimeframes {
  return TRADE_TYPE_TIMEFRAMES[tradeType] || TRADE_TYPE_TIMEFRAMES.dayTrade;
}

// ===========================================
// Types - Matching Technical Specification
// ===========================================

interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

// ===========================================
// Indicator Calculation Helpers
// Uses trade-config.ts and indicators.service.ts
// ===========================================

// Singleton instance of IndicatorsService
const indicatorsService = new IndicatorsService();

/**
 * Convert Candle[] to OHLCV[] format for IndicatorsService
 */
function candlesToOHLCV(candles: Candle[]): OHLCV[] {
  return candles.map(c => ({
    timestamp: c.openTime,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

/**
 * Calculate all configured indicators for a step using trade-config
 * Returns a Map of indicator name to result
 */
function calculateStepIndicators(
  candles: Candle[],
  tradeType: TradeType,
  step: AnalysisStep
): Map<string, IndicatorResult> {
  const stepConfig = getStepConfig(tradeType, step);
  if (!stepConfig) {
    return new Map();
  }

  const ohlcv = candlesToOHLCV(candles);
  const indicatorNames = stepConfig.indicators.map(ind => ind.name);

  // Also extract params from config
  const results = new Map<string, IndicatorResult>();
  for (const indConfig of stepConfig.indicators) {
    try {
      const result = indicatorsService.calculateIndicator(
        indConfig.name,
        ohlcv,
        indConfig.params
      );
      if (result && result.value !== null) {
        results.set(indConfig.name, result);
      }
    } catch (error) {
      console.warn(`Failed to calculate ${indConfig.name}:`, error);
    }
  }

  return results;
}

/**
 * Convert indicator results to a format suitable for buildIndicatorAnalysis
 */
function indicatorResultsToAnalysisInputs(
  results: Map<string, IndicatorResult>,
  currentPrice: number,
  priceChange24h: number,
  prices: number[]
): Record<string, any> {
  const inputs: Record<string, any> = {
    currentPrice,
    priceChange24h,
    prices,
  };

  // Map results to the expected format
  for (const [name, result] of results) {
    const upperName = name.toUpperCase();

    // RSI
    if (upperName === 'RSI') {
      inputs.rsi = result.value;
      if (result.values) inputs.rsiValues = result.values;
    }

    // MACD
    if (upperName === 'MACD' && result.metadata) {
      inputs.macd = {
        value: result.metadata.macd ?? result.value,
        signal: result.metadata.signal ?? 0,
        histogram: result.metadata.histogram ?? 0,
      };
      if (result.values) inputs.macdHistogramValues = result.values;
    }

    // Bollinger Bands
    if (upperName === 'BOLLINGER' && result.metadata) {
      inputs.bollingerBands = {
        upper: result.metadata.upper,
        middle: result.metadata.middle,
        lower: result.metadata.lower,
      };
    }

    // ATR
    if (upperName === 'ATR') {
      inputs.atr = result.value;
    }

    // Moving Averages
    if (upperName.startsWith('SMA_') || upperName.startsWith('EMA_')) {
      const period = parseInt(upperName.split('_')[1]);
      inputs.movingAverages = inputs.movingAverages || {};
      if (period === 50) inputs.movingAverages.ma50 = result.value;
      if (period === 200) inputs.movingAverages.ma200 = result.value;
      if (period === 20) inputs.movingAverages.ma20 = result.value;
    }

    // PVT
    if (upperName === 'PVT' && result.values) {
      const pvtValues = result.values;
      const momentum = pvtValues.length > 1
        ? (pvtValues[pvtValues.length - 1] - pvtValues[pvtValues.length - 2]) / Math.abs(pvtValues[pvtValues.length - 2] || 1)
        : 0;
      inputs.pvt = {
        pvt: result.value,
        trend: result.signal || 'neutral',
        momentum,
      };
    }

    // Relative Volume
    if (upperName === 'RELATIVE_VOLUME') {
      inputs.relativeVolume = result.value;
    }

    // Volume Spike
    if (upperName === 'VOLUME_SPIKE' && result.metadata) {
      inputs.volumeSpike = {
        isSpike: result.metadata.isSpike ?? false,
        factor: result.value ?? 1,
      };
    }

    // Order Flow Imbalance
    if (upperName === 'ORDER_FLOW_IMBALANCE') {
      inputs.orderFlowImbalance = {
        imbalance: result.value ?? 0,
        bias: result.signal || 'neutral',
      };
    }

    // Liquidity Score
    if (upperName === 'LIQUIDITY_SCORE') {
      inputs.liquidityScore = result.value;
    }

    // Historical Volatility
    if (upperName === 'HISTORICAL_VOLATILITY') {
      inputs.historicalVolatility = result.value;
    }

    // ADX
    if (upperName === 'ADX') {
      inputs.adx = {
        value: result.value,
        plusDI: result.metadata?.plusDI,
        minusDI: result.metadata?.minusDI,
        signal: result.signal,
        trendStrength: result.metadata?.trendStrength,
      };
    }

    // Ichimoku
    if (upperName === 'ICHIMOKU' && result.metadata) {
      inputs.ichimoku = {
        tenkanSen: result.metadata.tenkanSen,
        kijunSen: result.metadata.kijunSen,
        senkouA: result.metadata.senkouA,
        senkouB: result.metadata.senkouB,
        chikou: result.metadata.chikou,
        cloudTop: result.metadata.cloudTop,
        cloudBottom: result.metadata.cloudBottom,
        signal: result.signal,
      };
    }

    // Supertrend
    if (upperName === 'SUPERTREND' && result.metadata) {
      inputs.supertrend = {
        value: result.value,
        trend: result.metadata.trend,
        signal: result.signal,
      };
    }

    // Stochastic
    if (upperName === 'STOCHASTIC' && result.metadata) {
      inputs.stochastic = {
        k: result.metadata.k ?? result.value,
        d: result.metadata.d,
        signal: result.signal,
      };
    }

    // Stochastic RSI
    if (upperName === 'STOCH_RSI' && result.metadata) {
      inputs.stochRsi = {
        k: result.metadata.k ?? result.value,
        d: result.metadata.d,
        signal: result.signal,
      };
    }

    // CCI
    if (upperName === 'CCI') {
      inputs.cci = {
        value: result.value,
        signal: result.signal,
      };
    }

    // Williams %R
    if (upperName === 'WILLIAMS_R') {
      inputs.williamsR = {
        value: result.value,
        signal: result.signal,
      };
    }

    // MFI
    if (upperName === 'MFI') {
      inputs.mfi = {
        value: result.value,
        signal: result.signal,
      };
    }

    // OBV
    if (upperName === 'OBV') {
      inputs.obv = {
        value: result.value,
        signal: result.signal,
      };
    }

    // VWAP
    if (upperName === 'VWAP') {
      inputs.vwap = result.value;
    }

    // CMF
    if (upperName === 'CMF') {
      inputs.cmf = {
        value: result.value,
        signal: result.signal,
      };
    }

    // Squeeze
    if (upperName === 'SQUEEZE' && result.metadata) {
      inputs.squeeze = {
        on: result.metadata.squeezeOn,
        signal: result.signal,
      };
    }

    // Aroon
    if (upperName === 'AROON' && result.metadata) {
      inputs.aroon = {
        up: result.metadata.aroonUp,
        down: result.metadata.aroonDown,
        oscillator: result.value,
        signal: result.signal,
      };
    }

    // PSAR
    if (upperName === 'PSAR') {
      inputs.psar = {
        value: result.value,
        trend: result.metadata?.trend,
        signal: result.signal,
      };
    }

    // Keltner Channel
    if (upperName === 'KELTNER' && result.metadata) {
      inputs.keltner = {
        upper: result.metadata.upper,
        middle: result.metadata.middle,
        lower: result.metadata.lower,
        value: result.value,
        signal: result.signal,
      };
    }

    // Donchian Channel
    if (upperName === 'DONCHIAN' && result.metadata) {
      inputs.donchian = {
        upper: result.metadata.upper,
        middle: result.metadata.middle,
        lower: result.metadata.lower,
        width: result.metadata.width,
      };
    }

    // Whale Activity
    if (upperName === 'WHALE_ACTIVITY' && result.metadata) {
      inputs.whaleActivity = {
        score: result.value,
        detected: result.metadata.detected,
        signal: result.signal,
      };
    }

    // Spoofing Detection
    if (upperName === 'SPOOFING_DETECTION' && result.metadata) {
      inputs.spoofingDetection = {
        score: result.value,
        warning: result.metadata.warning,
        riskLevel: result.metadata.riskLevel,
      };
    }

    // Bid-Ask Spread
    if (upperName === 'BID_ASK_SPREAD') {
      inputs.bidAskSpread = result.value;
    }

    // Slippage Estimate
    if (upperName === 'SLIPPAGE_ESTIMATE' && result.metadata) {
      inputs.slippageEstimate = {
        bps: result.value,
        estimatedUSD: result.metadata.estimatedSlippageUSD,
      };
    }

    // Market Impact
    if (upperName === 'MARKET_IMPACT') {
      inputs.marketImpact = {
        score: result.value,
        signal: result.signal,
      };
    }

    // Force Index
    if (upperName === 'FORCE_INDEX') {
      inputs.forceIndex = {
        value: result.value,
        signal: result.signal,
      };
    }

    // ROC
    if (upperName === 'ROC') {
      inputs.roc = {
        value: result.value,
        signal: result.signal,
      };
    }

    // TSI
    if (upperName === 'TSI') {
      inputs.tsi = {
        value: result.value,
        signal: result.signal,
      };
    }

    // Ultimate Oscillator
    if (upperName === 'ULTIMATE') {
      inputs.ultimate = {
        value: result.value,
        signal: result.signal,
      };
    }

    // VWMA
    if (upperName === 'VWMA') {
      inputs.vwma = result.value;
    }

    // AD (Accumulation/Distribution)
    if (upperName === 'AD') {
      inputs.ad = {
        value: result.value,
        signal: result.signal,
      };
    }

    // EOM (Ease of Movement)
    if (upperName === 'EOM') {
      inputs.eom = {
        value: result.value,
        signal: result.signal,
      };
    }
  }

  return inputs;
}

interface MarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

// Step 1 Types
type TrendDirection = 'bullish' | 'bearish' | 'neutral';

interface MarketPulseResult {
  btcDominance: number;
  btcDominanceTrend: 'rising' | 'falling' | 'stable';
  totalMarketCap: number;
  marketCap24hChange: number;
  fearGreedIndex: number;
  fearGreedLabel: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  marketRegime: 'risk_on' | 'risk_off' | 'neutral';
  trend: {
    direction: TrendDirection;
    strength: number;
    timeframesAligned: number;
  };
  // NEW: Futures market data
  futuresData?: {
    fundingRate: number; // percentage
    fundingRateInterpretation: 'bullish' | 'bearish' | 'neutral';
    openInterest: number; // in USDT
    openInterestChange24h?: number;
    longShortRatio: number;
    longAccount: number; // percentage
    shortAccount: number; // percentage
    topTraderLongShortRatio: number;
    takerBuySellRatio: number;
  };
  macroEvents: Array<{
    name: string;
    date: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }>;
  // NEW: Economic Calendar data
  economicCalendar?: {
    riskLevel: 'high' | 'medium' | 'low';
    riskReason: string;
    tradingAdvice: string;
    todayEvents: EconomicEvent[];
    next24hEvents: EconomicEvent[];
    weekEvents: EconomicEvent[];
    macroPenalty: number;      // 0 = no penalty, -2 = high-impact event, -3 = FOMC day
    penaltyReason?: string;    // Human-readable reason logged in analysis
  };
  newsSentiment?: {
    overall: 'bullish' | 'bearish' | 'neutral';
    score: number;
    newsCount: number;
    positiveCount: number;
    negativeCount: number;
    topHeadlines: Array<{ title: string; source: string; sentiment: string }>;
  };
  summary: string;
  verdict: 'suitable' | 'caution' | 'avoid';
  score: number;
  // NEW: Gate decision for sequential approach
  gate: {
    canProceed: boolean;
    reason: string;
    confidence: number;
  };
}

// Step 2 Types
interface AssetScanResult {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  timeframes: Array<{
    tf: '1M' | '1W' | '1D' | '4H' | '1H';
    trend: TrendDirection;
    strength: number;
  }>;
  forecast: {
    price24h: number;
    price7d: number;
    confidence: number;
    scenarios: Array<{
      name: 'bull' | 'base' | 'bear';
      price: number;
      probability: number;
    }>;
    modelType?: string; // 'tft' or 'statistical_fallback'
  };
  levels: {
    resistance: number[];
    support: number[];
    poc: number;
  };
  indicators: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    movingAverages: { ma20: number; ma50: number; ma200: number };
    bollingerBands: { upper: number; middle: number; lower: number };
    atr: number;
  };
  // Detailed indicator analysis with interpretations
  indicatorDetails?: IndicatorAnalysis;
  // NEW: Tokenomics analysis (financial structure of the token)
  tokenomics?: TokenomicsData;
  // NEW: Asset-specific context for non-crypto assets (metals, stocks, bonds)
  assetContext?: {
    assetClass: AssetClass;
    metrics: AssetMetrics | null;
    interMarketContext: {
      regime: MarketRegime;
      regimeConfidence: number;
      expectedBehavior: SignalDirection;
      anomalies: string[];
    } | null;
    keyDrivers: string[];
    warnings: string[];
  };
  score: number;
  // Gate decision for sequential approach
  gate: {
    canProceed: boolean;
    reason: string;
    confidence: number;
  };
  // Direction recommendation from this step
  direction: 'long' | 'short' | null;
  directionConfidence: number;
}

// Step 3 Types
interface SafetyCheckResult {
  symbol: string;
  manipulation: {
    spoofingDetected: boolean;
    spoofingDetails?: string;
    layeringDetected: boolean;
    layeringDetails?: string;
    icebergDetected: boolean;
    icebergPrice?: number;
    icebergSide?: 'buy' | 'sell';
    washTrading: boolean;
    pumpDumpRisk: 'low' | 'medium' | 'high';
  };
  whaleActivity: {
    largeBuys: Array<{ amountUsd: number; price: number; time: string }>;
    largeSells: Array<{ amountUsd: number; price: number; time: string }>;
    netFlowUsd: number;
    bias: 'accumulation' | 'distribution' | 'neutral';
    orderFlowImbalance?: number;
    orderFlowBias?: 'buying' | 'selling' | 'neutral';
  };
  advancedMetrics?: {
    volumeSpike: boolean;
    volumeSpikeFactor: number;
    relativeVolume: number;
    pvt: number;
    pvtTrend: 'bullish' | 'bearish' | 'neutral';
    pvtMomentum: number;
    historicalVolatility: number;
    liquidityScore: number;
    bidAskSpread: number;
  };
  newsSentiment?: {
    overall: 'bullish' | 'bearish' | 'neutral';
    score: number;
    newsCount: number;
    positiveCount: number;
    negativeCount: number;
    topHeadlines: Array<{ title: string; source: string; sentiment: string }>;
  };
  exchangeFlows: Array<{
    exchange: string;
    inflow: number;
    outflow: number;
    net: number;
    interpretation: string;
  }>;
  smartMoney: {
    positioning: 'long' | 'short' | 'neutral';
    confidence: number;
    /** Smart Money Index value (cumulative) */
    smiValue?: number;
    /** SMI trend: accumulating | distributing | neutral */
    smiTrend?: 'accumulating' | 'distributing' | 'neutral';
    /** SMI divergence from price */
    smiDivergence?: 'bullish_divergence' | 'bearish_divergence' | 'none';
    /** Percentage of volume in smart sessions */
    smartSessionRatio?: number;
  };
  contractSecurity?: {
    isVerified: boolean;
    isHoneypot: boolean;
    isMintable: boolean;
    liquidityLocked: boolean;
    liquidityLockPercent: number;
    liquidityLockEndDate: string | null;
    buyTax: number;
    sellTax: number;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    warnings: string[];
    contractAddress?: string;
    chain?: string;
  };
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  // Detailed indicator analysis with interpretations (for advanced metrics)
  indicatorDetails?: IndicatorAnalysis;
  score: number;
  // Gate evaluation result
  gate: {
    canProceed: boolean;
    reason: string;
    confidence: number;
    riskAdjustment: number;
  };
}

// Step 4 Types
interface TimingResult {
  symbol: string;
  currentPrice: number;
  tradeNow: boolean;
  reason: string;
  conditions: Array<{
    name: string;
    met: boolean;
    details: string;
  }>;
  entryZones: Array<{
    priceLow: number;
    priceHigh: number;
    probability: number;
    eta: string;
    quality: number;
  }>;
  optimalEntry: number;
  waitFor?: {
    event: string;
    estimatedTime: string;
  };
  score: number;
  // Gate evaluation result
  gate: {
    canProceed: boolean;
    reason: string;
    confidence: number;
    urgency: 'immediate' | 'soon' | 'wait' | 'avoid';
  };
}

// Step 5 Types (Enhanced - uses all previous step data)
interface TradePlanResult {
  symbol: string;
  direction: 'long' | 'short';
  type: 'limit' | 'market';
  entries: Array<{
    price: number;
    percentage: number;
    type: 'limit' | 'stop_limit';
    source: string; // Where this entry came from
  }>;
  averageEntry: number;
  currentPrice: number;
  // Entry status - whether user should enter now or wait
  needsToWaitForEntry: boolean;
  entryDistancePercent: number; // How far current price is from entry (%)
  entryStatus: 'immediate' | 'wait_for_pullback' | 'wait_for_rally';
  // Trade plan validity - whether the plan is still actionable
  tradePlanStatus: 'valid' | 'wait_for_entry' | 'trade_missed';
  tradePlanMessage: string; // Explanation of current status
  stopLoss: {
    price: number;
    percentage: number;
    reason: string;
    safetyAdjusted: boolean; // Was it adjusted based on Safety Check?
  };
  takeProfits: Array<{
    price: number;
    percentage: number;
    reason: string;
    source: string; // Where this target came from
    riskReward: number; // Individual TP R:R = |TP - Entry| / |Entry - SL|
  }>;
  riskReward: number; // Overall weighted R:R
  winRateEstimate: number;
  positionSizePercent: number;
  riskAmount: number;
  trailingStop?: {
    activateAfter: string;
    trailPercent: number;
  };
  score: number;
  // New: Source tracking for transparency
  sources: {
    direction: string[];
    entries: string[];
    stopLoss: string[];
    targets: string[];
  };
  // New: Confidence from integrated analysis
  confidence: number;
  // Gate evaluation result
  gate: {
    canProceed: boolean;
    reason: string;
    confidence: number;
    planQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  };
}

// Step 6 Types
interface TrapCheckResult {
  symbol: string;
  traps: {
    bullTrap: boolean;
    bullTrapZone?: number;
    bearTrap: boolean;
    bearTrapZone?: number;
    liquidityGrab: {
      detected: boolean;
      zones: number[];
    };
    stopHuntZones: number[];
    fakeoutRisk: 'low' | 'medium' | 'high';
  };
  liquidationLevels: Array<{
    price: number;
    amountUsd: number;
    type: 'longs' | 'shorts';
  }>;
  counterStrategy: string[];
  proTip: string;
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  // Gate evaluation result
  gate: {
    canProceed: boolean;
    reason: string;
    confidence: number;
    trapRisk: 'minimal' | 'moderate' | 'elevated' | 'severe';
  };
}

// Step 6 Types - Preliminary Verdict (decides BEFORE trade plan)
interface PreliminaryVerdictResult {
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  direction: 'long' | 'short' | null; // null if WAIT/AVOID
  confidence: number;
  score: number; // Pre-trade-plan score
  reasons: Array<{
    factor: string;
    positive: boolean;
    impact: 'high' | 'medium' | 'low';
    source: string; // Which step this came from
  }>;
  shouldGenerateTradePlan: boolean;
  directionSources: Array<{
    source: string;
    direction: 'long' | 'short';
    weight: number;
    reason: string;
  }>;
}

// Step 7 Types - Final Verdict (after trade plan, if generated)
interface FinalVerdictResult {
  overallScore: number;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  componentScores: Array<{
    step: string;
    score: number;
    weight: number;
  }>;
  confidenceFactors: Array<{
    factor: string;
    positive: boolean;
    impact: 'high' | 'medium' | 'low';
  }>;
  recommendation: string;
  analysisId: string;
  createdAt: string;
  expiresAt: string;
  // New: Reference to trade plan (null if WAIT/AVOID)
  hasTradePlan: boolean;
  // NEW: AI-generated summary for the report
  aiSummary?: string;
  // NEW: Tokenomics interpretation for the report
  tokenomicsInsight?: string;
}

// ===========================================
// HTTP Client with Retry & Timeout
// ===========================================

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, retries = 3, retryDelay = 1000 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
      );
    }
  }

  throw new Error('Fetch failed after retries');
}

/**
 * Safely parse JSON from a Response object
 * Handles empty responses and malformed JSON gracefully
 */
async function safeJsonParse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || text.trim() === '') {
    throw new Error('Empty response body');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
  }
}

// ===========================================
// Simple In-Memory Cache
// ===========================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const CACHE_TTL = {
  MARKET_PULSE: 5 * 60 * 1000, // 5 minutes
  TICKER: 30 * 1000, // 30 seconds
  KLINES: 60 * 1000, // 1 minute
  GLOBAL: 5 * 60 * 1000, // 5 minutes
  FEAR_GREED: 60 * 60 * 1000, // 1 hour
};

// ===========================================
// Multi-Asset Data Functions
// Uses multi-asset-data-provider for routing to correct API
// Crypto: Binance, Stocks/Bonds/Metals: Yahoo Finance
// ===========================================

/**
 * Filter OHLCV outlier spikes (flash crashes, exchange glitches).
 * Uses rolling median ± 4σ band. Wicks beyond are clamped to band edge.
 * Only extreme outliers are filtered; normal volatility is preserved.
 */
function filterOHLCVOutliers(candles: Candle[], windowSize: number = 20): Candle[] {
  if (candles.length < windowSize) return candles;

  return candles.map((candle, i) => {
    // Get window of surrounding candles for local context
    const start = Math.max(0, i - windowSize);
    const end = Math.min(candles.length, i + 1);
    const window = candles.slice(start, end);

    if (window.length < 5) return candle;

    // Calculate median close and standard deviation
    const closes = window.map(c => c.close).sort((a, b) => a - b);
    const median = closes[Math.floor(closes.length / 2)];
    const variance = closes.reduce((sum, c) => sum + (c - median) ** 2, 0) / closes.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return candle;

    // 4-sigma band (very permissive - only catches true outliers)
    const upperBand = median + 4 * stdDev;
    const lowerBand = median - 4 * stdDev;

    // Clamp extreme wicks
    const clampedHigh = Math.min(candle.high, upperBand);
    const clampedLow = Math.max(candle.low, lowerBand);
    const clampedOpen = Math.max(lowerBand, Math.min(candle.open, upperBand));
    const clampedClose = Math.max(lowerBand, Math.min(candle.close, upperBand));

    // Only modify if values were actually clamped
    if (clampedHigh === candle.high && clampedLow === candle.low &&
        clampedOpen === candle.open && clampedClose === candle.close) {
      return candle;
    }

    return {
      ...candle,
      open: clampedOpen,
      high: clampedHigh,
      low: clampedLow,
      close: clampedClose,
    };
  });
}

async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<Candle[]> {
  const cacheKey = `klines:${symbol}:${interval}:${limit}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return cached;

  try {
    // Use multi-asset provider which routes to correct API based on asset class
    const candles = await fetchMultiAssetCandles(symbol, interval, limit);

    // Convert to Candle format
    const raw: Candle[] = candles.map((c) => ({
      openTime: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      closeTime: c.timestamp + 60000, // Approximate close time
    }));

    // Apply outlier/spike filter to remove flash crash artifacts
    const result = filterOHLCVOutliers(raw);

    setCache(cacheKey, result, CACHE_TTL.KLINES);
    return result;
  } catch (error) {
    console.error(`[AnalysisEngine] Failed to fetch klines for ${symbol}:`, error);
    // Return empty array instead of throwing - callers should handle empty candles
    return [];
  }
}

async function fetch24hTicker(symbol: string): Promise<MarketData> {
  const cacheKey = `ticker:${symbol}`;
  const cached = getCached<MarketData>(cacheKey);
  if (cached) return cached;

  try {
    // Use multi-asset provider which routes to correct API based on asset class
    const ticker = await fetchMultiAssetTicker(symbol);

    const result: MarketData = {
      symbol: ticker.symbol,
      price: ticker.price,
      priceChange24h: ticker.change24h,
      priceChangePercent24h: ticker.changePercent24h,
      high24h: ticker.high24h,
      low24h: ticker.low24h,
      volume24h: ticker.volume24h,
      quoteVolume24h: ticker.volume24h * ticker.price, // Approximate quote volume
    };

    setCache(cacheKey, result, CACHE_TTL.TICKER);
    return result;
  } catch (error) {
    console.error(`[AnalysisEngine] Failed to fetch ticker for ${symbol}:`, error);
    // Return fallback instead of throwing - prevents Promise.all from crashing
    return {
      symbol,
      price: 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      quoteVolume24h: 0,
    };
  }
}

// ===========================================
// Crypto-Specific API Functions (Binance)
// These are only used for crypto assets
// ===========================================

async function fetchOrderBook(
  symbol: string,
  limit: number = 100
): Promise<{ bids: [string, string][]; asks: [string, string][] }> {
  try {
    const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}USDT&limit=${limit}`;
    const response = await fetchWithRetry(url);
    return safeJsonParse<{ bids: [string, string][]; asks: [string, string][] }>(response);
  } catch (error) {
    console.error(`[AnalysisEngine] Failed to fetch order book for ${symbol}:`, error);
    return { bids: [], asks: [] };
  }
}

async function fetchRecentTrades(
  symbol: string,
  limit: number = 500
): Promise<
  Array<{ price: string; qty: string; time: number; isBuyerMaker: boolean }>
> {
  try {
    const url = `https://api.binance.com/api/v3/trades?symbol=${symbol}USDT&limit=${limit}`;
    const response = await fetchWithRetry(url);
    return safeJsonParse<Array<{ price: string; qty: string; time: number; isBuyerMaker: boolean }>>(response);
  } catch (error) {
    console.error(`[AnalysisEngine] Failed to fetch recent trades for ${symbol}:`, error);
    return [];
  }
}

// =========================================
// Binance Futures API - Market Pulse Data
// =========================================

interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  nextFundingTime: number;
}

async function fetchFundingRate(symbol: string = 'BTC'): Promise<FundingRateData> {
  const cacheKey = `funding_rate:${symbol}`;
  const cached = getCached<FundingRateData>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}USDT&limit=1`;
    const response = await fetchWithRetry(url);
    const data = await safeJsonParse<Array<{
      symbol: string;
      fundingRate: string;
      fundingTime: number;
    }>>(response);

    if (data.length === 0) {
      return { symbol, fundingRate: 0, fundingTime: Date.now(), nextFundingTime: Date.now() + 8 * 60 * 60 * 1000 };
    }

    const result: FundingRateData = {
      symbol: data[0].symbol,
      fundingRate: parseFloat(data[0].fundingRate) * 100, // Convert to percentage
      fundingTime: data[0].fundingTime,
      nextFundingTime: data[0].fundingTime + 8 * 60 * 60 * 1000, // 8 hours later
    };

    setCache(cacheKey, result, 60 * 1000); // 1 minute cache
    return result;
  } catch {
    return { symbol, fundingRate: 0, fundingTime: Date.now(), nextFundingTime: Date.now() + 8 * 60 * 60 * 1000 };
  }
}

/**
 * Calculate funding rate spread across multiple perpetual pairs.
 * Spread = max(rates) - min(rates). High spread indicates market dislocation.
 * Returns average, spread, individual rates, and interpretation.
 */
async function fetchFundingRateSpread(
  symbols: string[] = ['BTC', 'ETH', 'SOL']
): Promise<{
  average: number;
  spread: number;
  rates: Array<{ symbol: string; rate: number }>;
  interpretation: 'compressed' | 'normal' | 'wide' | 'extreme';
}> {
  const results = await Promise.all(
    symbols.map(async (sym) => {
      const data = await fetchFundingRate(sym);
      return { symbol: sym, rate: data.fundingRate };
    })
  );

  const validRates = results.filter(r => r.rate !== 0);
  if (validRates.length === 0) {
    return { average: 0, spread: 0, rates: results, interpretation: 'compressed' };
  }

  const rateValues = validRates.map(r => r.rate);
  const average = rateValues.reduce((a, b) => a + b, 0) / rateValues.length;
  const spread = Math.max(...rateValues) - Math.min(...rateValues);

  let interpretation: 'compressed' | 'normal' | 'wide' | 'extreme' = 'normal';
  if (spread < 0.02) interpretation = 'compressed';
  else if (spread < 0.05) interpretation = 'normal';
  else if (spread < 0.10) interpretation = 'wide';
  else interpretation = 'extreme';

  return { average, spread, rates: results, interpretation };
}

interface OpenInterestData {
  symbol: string;
  openInterest: number;
  openInterestValue: number; // in USDT
  change24h?: number;
}

async function fetchOpenInterest(symbol: string = 'BTC'): Promise<OpenInterestData> {
  const cacheKey = `open_interest:${symbol}`;
  const cached = getCached<OpenInterestData>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}USDT`;
    const response = await fetchWithRetry(url);
    const data = await safeJsonParse<{
      symbol: string;
      openInterest: string;
    }>(response);

    // Get current price to calculate value
    const ticker = await fetch24hTicker(symbol);

    const result: OpenInterestData = {
      symbol: data.symbol,
      openInterest: parseFloat(data.openInterest),
      openInterestValue: parseFloat(data.openInterest) * ticker.price,
    };

    setCache(cacheKey, result, 60 * 1000); // 1 minute cache
    return result;
  } catch {
    return { symbol, openInterest: 0, openInterestValue: 0 };
  }
}

interface LongShortRatioData {
  symbol: string;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  timestamp: number;
}

async function fetchLongShortRatio(symbol: string = 'BTC'): Promise<LongShortRatioData> {
  const cacheKey = `long_short_ratio:${symbol}`;
  const cached = getCached<LongShortRatioData>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}USDT&period=5m&limit=1`;
    const response = await fetchWithRetry(url);
    const data = await safeJsonParse<Array<{
      symbol: string;
      longShortRatio: string;
      longAccount: string;
      shortAccount: string;
      timestamp: number;
    }>>(response);

    if (data.length === 0) {
      return { symbol, longShortRatio: 1, longAccount: 50, shortAccount: 50, timestamp: Date.now() };
    }

    const result: LongShortRatioData = {
      symbol: data[0].symbol,
      longShortRatio: parseFloat(data[0].longShortRatio),
      longAccount: parseFloat(data[0].longAccount) * 100,
      shortAccount: parseFloat(data[0].shortAccount) * 100,
      timestamp: data[0].timestamp,
    };

    setCache(cacheKey, result, 60 * 1000); // 1 minute cache
    return result;
  } catch {
    return { symbol, longShortRatio: 1, longAccount: 50, shortAccount: 50, timestamp: Date.now() };
  }
}

interface TopTraderSentiment {
  symbol: string;
  topTraderLongShortRatio: number;
  topTraderLongAccount: number;
  topTraderShortAccount: number;
  timestamp: number;
}

async function fetchTopTraderSentiment(symbol: string = 'BTC'): Promise<TopTraderSentiment> {
  const cacheKey = `top_trader_sentiment:${symbol}`;
  const cached = getCached<TopTraderSentiment>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${symbol}USDT&period=5m&limit=1`;
    const response = await fetchWithRetry(url);
    const data = await safeJsonParse<Array<{
      symbol: string;
      longShortRatio: string;
      longAccount: string;
      shortAccount: string;
      timestamp: number;
    }>>(response);

    if (data.length === 0) {
      return { symbol, topTraderLongShortRatio: 1, topTraderLongAccount: 50, topTraderShortAccount: 50, timestamp: Date.now() };
    }

    const result: TopTraderSentiment = {
      symbol: data[0].symbol,
      topTraderLongShortRatio: parseFloat(data[0].longShortRatio),
      topTraderLongAccount: parseFloat(data[0].longAccount) * 100,
      topTraderShortAccount: parseFloat(data[0].shortAccount) * 100,
      timestamp: data[0].timestamp,
    };

    setCache(cacheKey, result, 60 * 1000); // 1 minute cache
    return result;
  } catch {
    return { symbol, topTraderLongShortRatio: 1, topTraderLongAccount: 50, topTraderShortAccount: 50, timestamp: Date.now() };
  }
}

interface TakerBuySellRatio {
  buySellRatio: number;
  buyVolume: number;
  sellVolume: number;
  timestamp: number;
}

async function fetchTakerBuySellRatio(symbol: string = 'BTC'): Promise<TakerBuySellRatio> {
  const cacheKey = `taker_buy_sell:${symbol}`;
  const cached = getCached<TakerBuySellRatio>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}USDT&period=5m&limit=1`;
    const response = await fetchWithRetry(url);
    const data = await safeJsonParse<Array<{
      buySellRatio: string;
      buyVol: string;
      sellVol: string;
      timestamp: number;
    }>>(response);

    if (data.length === 0) {
      return { buySellRatio: 1, buyVolume: 0, sellVolume: 0, timestamp: Date.now() };
    }

    const result: TakerBuySellRatio = {
      buySellRatio: parseFloat(data[0].buySellRatio),
      buyVolume: parseFloat(data[0].buyVol),
      sellVolume: parseFloat(data[0].sellVol),
      timestamp: data[0].timestamp,
    };

    setCache(cacheKey, result, 60 * 1000); // 1 minute cache
    return result;
  } catch {
    return { buySellRatio: 1, buyVolume: 0, sellVolume: 0, timestamp: Date.now() };
  }
}

interface GlobalMetrics {
  totalMarketCap: number;
  btcDominance: number;
  totalVolume24h: number;
  marketCapChange24h: number;
}

async function fetchGlobalMetrics(): Promise<GlobalMetrics> {
  const cacheKey = 'global_metrics';
  const cached = getCached<GlobalMetrics>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithRetry(
      'https://api.coingecko.com/api/v3/global'
    );
    const data = await safeJsonParse<{
      data: {
        total_market_cap: { usd: number };
        market_cap_percentage: { btc: number };
        total_volume: { usd: number };
        market_cap_change_percentage_24h_usd: number;
      };
    }>(response);

    const result = {
      totalMarketCap: data.data.total_market_cap.usd,
      btcDominance: data.data.market_cap_percentage.btc,
      totalVolume24h: data.data.total_volume.usd,
      marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
    };

    setCache(cacheKey, result, CACHE_TTL.GLOBAL);
    return result;
  } catch {
    // Fallback values if CoinGecko is unavailable
    return {
      totalMarketCap: 2_500_000_000_000,
      btcDominance: 52,
      totalVolume24h: 80_000_000_000,
      marketCapChange24h: 0,
    };
  }
}

interface FearGreedData {
  value: number;
  classification: string;
}

async function fetchFearGreedIndex(): Promise<FearGreedData> {
  const cacheKey = 'fear_greed';
  const cached = getCached<FearGreedData>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithRetry('https://api.alternative.me/fng/');
    const data = await safeJsonParse<{
      data: Array<{ value: string; value_classification: string }>;
    }>(response);

    if (!data.data || data.data.length === 0) {
      return { value: 50, classification: 'Neutral' };
    }

    const result = {
      value: parseInt(data.data[0].value),
      classification: data.data[0].value_classification,
    };

    setCache(cacheKey, result, CACHE_TTL.FEAR_GREED);
    return result;
  } catch {
    return { value: 50, classification: 'Neutral' };
  }
}

// ===========================================
// News Sentiment Analysis
// ===========================================

interface NewsItem {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
  url?: string;
}

interface NewsSentimentResult {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -100 to +100
  newsCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topNews: NewsItem[];
  lastUpdated: string;
}

// Simple sentiment keywords for crypto news
const BULLISH_KEYWORDS = [
  'surge', 'rally', 'bullish', 'breakout', 'ath', 'all-time high', 'soars',
  'pumps', 'moon', 'adoption', 'institutional', 'etf approved', 'partnership',
  'upgrade', 'halving', 'accumulation', 'whales buying', 'buy signal',
  'outperform', 'breakthrough', 'milestone', 'record', 'boom', 'growth',
];

const BEARISH_KEYWORDS = [
  'crash', 'dump', 'bearish', 'plunge', 'sell-off', 'selloff', 'collapse',
  'fear', 'hack', 'exploit', 'scam', 'fraud', 'ban', 'regulation', 'lawsuit',
  'sec', 'investigation', 'warning', 'risk', 'bubble', 'correction',
  'capitulation', 'liquidation', 'bankrupt', 'insolvent', 'loss', 'decline',
];

/**
 * Analyze sentiment of a news title using keyword matching
 */
function analyzeNewsSentiment(title: string): {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
} {
  const lowerTitle = title.toLowerCase();

  let bullishScore = 0;
  let bearishScore = 0;

  for (const keyword of BULLISH_KEYWORDS) {
    if (lowerTitle.includes(keyword)) {
      bullishScore += 1;
    }
  }

  for (const keyword of BEARISH_KEYWORDS) {
    if (lowerTitle.includes(keyword)) {
      bearishScore += 1;
    }
  }

  const netScore = bullishScore - bearishScore;

  if (netScore > 0) {
    return { sentiment: 'positive', score: Math.min(100, netScore * 25) };
  } else if (netScore < 0) {
    return { sentiment: 'negative', score: Math.max(-100, netScore * 25) };
  }

  return { sentiment: 'neutral', score: 0 };
}

/**
 * Fetch and analyze crypto news for a specific symbol
 * Supports CryptoPanic API format
 */
async function fetchNewsSentiment(symbol: string): Promise<NewsSentimentResult> {
  const cacheKey = `news_sentiment_${symbol}`;
  const cached = getCached<NewsSentimentResult>(cacheKey);
  if (cached) return cached;

  const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.CRYPTOPANIC_API_KEY;
  const NEWS_API_URL = process.env.NEWS_API_URL || 'https://cryptopanic.com/api/v1';

  // Default result if no API key or error
  const defaultResult: NewsSentimentResult = {
    overallSentiment: 'neutral',
    sentimentScore: 0,
    newsCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    topNews: [],
    lastUpdated: new Date().toISOString(),
  };

  if (!NEWS_API_KEY) {
    return defaultResult;
  }

  try {
    // CryptoPanic API format
    const url = `${NEWS_API_URL}/posts/?auth_token=${NEWS_API_KEY}&currencies=${symbol}&kind=news&filter=important`;

    const response = await fetchWithRetry(url, { timeout: 8000 });
    const data = await safeJsonParse<{
      results?: Array<{
        title: string;
        source?: { title?: string };
        published_at: string;
        votes?: { positive?: number; negative?: number; important?: number };
        url: string;
      }>;
    }>(response);

    if (!data.results || !Array.isArray(data.results)) {
      return defaultResult;
    }

    const newsItems: NewsItem[] = [];
    let totalScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (const item of data.results.slice(0, 20)) {
      const { sentiment, score } = analyzeNewsSentiment(item.title);

      // Also use CryptoPanic's own sentiment if available
      let finalSentiment = sentiment;
      if (item.votes) {
        const netVotes = (item.votes.positive || 0) - (item.votes.negative || 0);
        if (netVotes > 2) finalSentiment = 'positive';
        else if (netVotes < -2) finalSentiment = 'negative';
      }

      newsItems.push({
        title: item.title,
        source: item.source?.title || 'Unknown',
        publishedAt: item.published_at,
        sentiment: finalSentiment,
        relevance: item.votes?.important || 0,
        url: item.url,
      });

      totalScore += score;
      if (finalSentiment === 'positive') positiveCount++;
      else if (finalSentiment === 'negative') negativeCount++;
      else neutralCount++;
    }

    const avgScore = newsItems.length > 0 ? totalScore / newsItems.length : 0;

    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgScore > 15) overallSentiment = 'bullish';
    else if (avgScore < -15) overallSentiment = 'bearish';

    const result: NewsSentimentResult = {
      overallSentiment,
      sentimentScore: Math.round(avgScore),
      newsCount: newsItems.length,
      positiveCount,
      negativeCount,
      neutralCount,
      topNews: newsItems.slice(0, 5),
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 15 minutes
    setCache(cacheKey, result, 15 * 60 * 1000);
    return result;
  } catch (error) {
    console.warn(`Failed to fetch news sentiment for ${symbol}:`, error);
    return defaultResult;
  }
}

/**
 * Get Gemini AI enhanced sentiment analysis
 */
async function getAISentimentAnalysis(
  symbol: string,
  newsItems: NewsItem[],
  priceChange24h: number
): Promise<string> {
  if (newsItems.length === 0) {
    return 'No recent news available for sentiment analysis.';
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return `Based on ${newsItems.length} news items: ${newsItems.filter(n => n.sentiment === 'positive').length} positive, ${newsItems.filter(n => n.sentiment === 'negative').length} negative.`;
  }

  const headlines = newsItems.slice(0, 10).map(n => `- ${n.title} (${n.sentiment})`).join('\n');

  const prompt = `Analyze these recent ${symbol} crypto news headlines and provide a brief (2-3 sentences) market sentiment summary. Consider the 24h price change of ${priceChange24h.toFixed(2)}%.

Headlines:
${headlines}

Focus on: What's driving sentiment? Any notable events? Is news aligned with price action?`;

  try {
    const response = await callGeminiWithRetry({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
    }, 3, 'news_summary');

    return response.candidates?.[0]?.content?.parts?.[0]?.text || response.text ||
           `${newsItems.length} news items analyzed. Sentiment: ${newsItems.filter(n => n.sentiment === 'positive').length > newsItems.filter(n => n.sentiment === 'negative').length ? 'positive' : 'mixed'}.`;
  } catch {
    return `${newsItems.length} recent news items. ${newsItems.filter(n => n.sentiment === 'positive').length} positive, ${newsItems.filter(n => n.sentiment === 'negative').length} negative signals detected.`;
  }
}

// ===========================================
// Technical Indicators - Accurate Implementation
// ===========================================

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1] ?? 0;

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    const price = prices[i];
    if (price !== undefined) {
      ema = (price - ema) * multiplier + ema;
    }
  }

  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const prev = prices[i - 1];
    if (current !== undefined && prev !== undefined) {
      changes.push(current - prev);
    }
  }

  if (changes.length < period) return 50;

  // Wilder's smoothing method
  let avgGain = 0;
  let avgLoss = 0;

  // First average
  for (let i = 0; i < period; i++) {
    const change = changes[i] ?? 0;
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothed averages
  for (let i = period; i < changes.length; i++) {
    const change = changes[i] ?? 0;
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(prices: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} {
  if (prices.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  // Calculate MACD line for each point
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const ema12 = calculateEMA(slice, 12);
    const ema26 = calculateEMA(slice, 26);
    macdValues.push(ema12 - ema26);
  }

  const macd = macdValues[macdValues.length - 1] ?? 0;
  const signal = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macd;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Calculate Open Interest Delta (rate of change).
 * Positive delta = new money entering, negative = positions closing.
 */
function calculateOIDelta(
  currentOI: number,
  previousOI: number | null
): { delta: number; deltaPercent: number; interpretation: 'increasing' | 'decreasing' | 'stable' } {
  if (!previousOI || previousOI <= 0) {
    return { delta: 0, deltaPercent: 0, interpretation: 'stable' };
  }

  const delta = currentOI - previousOI;
  const deltaPercent = (delta / previousOI) * 100;

  let interpretation: 'increasing' | 'decreasing' | 'stable';
  if (deltaPercent > 2) interpretation = 'increasing';
  else if (deltaPercent < -2) interpretation = 'decreasing';
  else interpretation = 'stable';

  return { delta, deltaPercent: parseFloat(deltaPercent.toFixed(2)), interpretation };
}

function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const price = prices[prices.length - 1] || 0;
    return { upper: price * 1.02, middle: price, lower: price * 0.98 };
  }

  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);

  const variance =
    slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + stdDev * stdDevMultiplier,
    middle: sma,
    lower: sma - stdDev * stdDevMultiplier,
  };
}

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    if (!current || !prev) continue;

    const high = current.high;
    const low = current.low;
    const prevClose = prev.close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length === 0) return 0;
  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateVWAP(candles: Candle[]): number {
  if (candles.length === 0) return 0;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
}

// ===========================================
// Advanced Indicators (from Python metrics)
// ===========================================

/**
 * Detects volume spikes that could indicate unusual activity
 * Returns spike factor (1.0 = normal, 2.0+ = spike)
 */
function detectVolumeSpike(
  candles: Candle[],
  period: number = 15,
  spikeFactor: number = 2.0
): { isSpike: boolean; factor: number; avgVolume: number } {
  if (candles.length < period) {
    return { isSpike: false, factor: 1, avgVolume: 0 };
  }

  const volumes = candles.slice(-period - 1, -1).map((c) => c.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const stdDev = Math.sqrt(
    volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length
  );

  const currentVolume = candles[candles.length - 1]?.volume ?? 0;
  const threshold = avgVolume + spikeFactor * stdDev;
  const factor = currentVolume / (avgVolume || 1);

  return {
    isSpike: currentVolume > threshold,
    factor: Math.round(factor * 100) / 100,
    avgVolume: Math.round(avgVolume),
  };
}

/**
 * Calculates relative volume compared to recent average
 */
function calculateRelativeVolume(candles: Candle[], period: number = 20): number {
  if (candles.length < period + 1) return 1;

  const historicalVolumes = candles.slice(-period - 1, -1).map((c) => c.volume);
  const avgVolume = historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length;
  const currentVolume = candles[candles.length - 1]?.volume ?? 0;

  return avgVolume > 0 ? Math.round((currentVolume / avgVolume) * 100) / 100 : 1;
}

/**
 * Price-Volume Trend (PVT) - cumulative indicator
 * Shows buying/selling pressure based on price changes and volume
 */
function calculatePVT(candles: Candle[]): {
  pvt: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
} {
  if (candles.length < 2) {
    return { pvt: 0, trend: 'neutral', momentum: 0 };
  }

  let pvt = 0;
  const pvtValues: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    if (!current || !prev || prev.close === 0) continue;

    const priceChange = (current.close - prev.close) / prev.close;
    pvt += priceChange * current.volume;
    pvtValues.push(pvt);
  }

  // Normalize PVT relative to first price for comparison
  const firstPrice = candles[0]?.close ?? 1;
  const normalizedPVT = pvt / firstPrice;

  // Calculate momentum (recent PVT change)
  const recentPVT = pvtValues.slice(-10);
  const momentum =
    recentPVT.length >= 2
      ? (recentPVT[recentPVT.length - 1]! - recentPVT[0]!) / firstPrice
      : 0;

  // Determine trend based on PVT direction
  const trend: 'bullish' | 'bearish' | 'neutral' =
    momentum > 0.01 ? 'bullish' : momentum < -0.01 ? 'bearish' : 'neutral';

  return {
    pvt: Math.round(normalizedPVT * 10000) / 10000,
    trend,
    momentum: Math.round(momentum * 10000) / 10000,
  };
}

/**
 * Order Flow Imbalance from taker buy/sell volume
 * Positive = more buying, Negative = more selling
 */
function calculateOrderFlowImbalance(
  takerBuyVolume: number,
  takerSellVolume: number
): { imbalance: number; bias: 'buying' | 'selling' | 'neutral' } {
  const total = takerBuyVolume + takerSellVolume;
  if (total === 0) return { imbalance: 0, bias: 'neutral' };

  const imbalance = (takerBuyVolume - takerSellVolume) / total;
  const bias: 'buying' | 'selling' | 'neutral' =
    imbalance > 0.1 ? 'buying' : imbalance < -0.1 ? 'selling' : 'neutral';

  return {
    imbalance: Math.round(imbalance * 100) / 100,
    bias,
  };
}

/**
 * Historical Volatility (annualized)
 */
function calculateHistoricalVolatility(candles: Candle[], period: number = 20): number {
  if (candles.length < period + 1) return 0;

  const closes = candles.slice(-period - 1).map((c) => c.close);
  const logReturns: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const current = closes[i];
    const prev = closes[i - 1];
    if (current && prev && prev > 0) {
      logReturns.push(Math.log(current / prev));
    }
  }

  if (logReturns.length === 0) return 0;

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance =
    logReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / logReturns.length;
  const dailyVol = Math.sqrt(variance);

  // Annualize (crypto trades 365 days)
  return Math.round(dailyVol * Math.sqrt(365) * 10000) / 100; // Returns as percentage
}

/**
 * Liquidity Score based on volume and spread
 * Higher = more liquid
 */
function calculateLiquidityScore(
  volume: number,
  price: number,
  bidAskSpread: number
): number {
  if (bidAskSpread <= 0 || price <= 0) return 100;

  const spreadPercent = (bidAskSpread / price) * 100;
  const volumeUSD = volume * price;

  // Score formula: high volume + low spread = high score
  const volumeScore = Math.min(100, Math.log10(volumeUSD + 1) * 10);
  const spreadScore = Math.max(0, 100 - spreadPercent * 1000);

  return Math.round((volumeScore * 0.6 + spreadScore * 0.4) * 100) / 100;
}

function findSupportResistance(candles: Candle[]): {
  support: number[];
  resistance: number[];
  poc: number;
} {
  if (candles.length < 10) {
    const price = candles[candles.length - 1]?.close ?? 0;
    return {
      support: [price * 0.95, price * 0.9],
      resistance: [price * 1.05, price * 1.1],
      poc: price,
    };
  }

  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle?.close ?? 0;
  const levels: Array<{ price: number; strength: number; type: 'high' | 'low' }> = [];

  // Find pivot highs and lows (5-bar pivot)
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const cPrev1 = candles[i - 1];
    const cPrev2 = candles[i - 2];
    const cNext1 = candles[i + 1];
    const cNext2 = candles[i + 2];

    if (!c || !cPrev1 || !cPrev2 || !cNext1 || !cNext2) continue;

    const isHighPivot =
      c.high > cPrev1.high &&
      c.high > cPrev2.high &&
      c.high > cNext1.high &&
      c.high > cNext2.high;

    const isLowPivot =
      c.low < cPrev1.low &&
      c.low < cPrev2.low &&
      c.low < cNext1.low &&
      c.low < cNext2.low;

    if (isHighPivot) {
      levels.push({ price: c.high, strength: 1, type: 'high' });
    }
    if (isLowPivot) {
      levels.push({ price: c.low, strength: 1, type: 'low' });
    }
  }

  // Cluster similar levels (within 1%)
  const threshold = currentPrice * 0.01;
  const clusteredLevels: Array<{ price: number; strength: number }> = [];

  for (const level of levels) {
    const existing = clusteredLevels.find(
      (l) => Math.abs(l.price - level.price) < threshold
    );
    if (existing) {
      existing.strength++;
      existing.price = (existing.price + level.price) / 2;
    } else {
      clusteredLevels.push({ price: level.price, strength: level.strength });
    }
  }

  // Sort by strength
  clusteredLevels.sort((a, b) => b.strength - a.strength);

  const support = clusteredLevels
    .filter((l) => l.price < currentPrice)
    .slice(0, 3)
    .map((l) => roundPrice(l.price));

  const resistance = clusteredLevels
    .filter((l) => l.price > currentPrice)
    .slice(0, 3)
    .map((l) => roundPrice(l.price));

  // Calculate POC (Point of Control) - price with highest volume
  const poc = calculateVWAP(candles.slice(-50));

  return { support, resistance, poc: roundPrice(poc) };
}

function calculateTrend(
  candles: Candle[]
): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
  if (candles.length < 50) {
    return { direction: 'neutral', strength: 50 };
  }

  const prices = candles.map((c) => c.close);
  const currentPrice = prices[prices.length - 1] ?? 0;
  const price10barsAgo = prices[prices.length - 10] ?? currentPrice;

  const ma20 = calculateSMA(prices, 20);
  const ma50 = calculateSMA(prices, 50);
  const ma200 = calculateSMA(prices, Math.min(200, prices.length));
  const ema20 = calculateEMA(prices, 20);

  let bullishSignals = 0;
  let bearishSignals = 0;

  // Price position relative to MAs
  if (currentPrice > ma20) bullishSignals++;
  else bearishSignals++;

  if (currentPrice > ma50) bullishSignals++;
  else bearishSignals++;

  if (currentPrice > ma200) bullishSignals++;
  else bearishSignals++;

  if (currentPrice > ema20) bullishSignals++;
  else bearishSignals++;

  // MA alignment
  if (ma20 > ma50) bullishSignals++;
  else bearishSignals++;

  if (ma50 > ma200) bullishSignals++;
  else bearishSignals++;

  // Price momentum (compare to 10 bars ago)
  const priceChange = price10barsAgo !== 0 ? (currentPrice - price10barsAgo) / price10barsAgo : 0;
  if (priceChange > 0.02) bullishSignals++;
  else if (priceChange < -0.02) bearishSignals++;

  // Higher highs / lower lows
  const recentHighs = candles.slice(-20).map((c) => c.high);
  const recentLows = candles.slice(-20).map((c) => c.low);
  const olderHighs = candles.slice(-40, -20).map((c) => c.high);
  const olderLows = candles.slice(-40, -20).map((c) => c.low);

  const maxRecentHigh = recentHighs.length > 0 ? Math.max(...recentHighs) : 0;
  const maxOlderHigh = olderHighs.length > 0 ? Math.max(...olderHighs) : 0;
  const minRecentLow = recentLows.length > 0 ? Math.min(...recentLows) : 0;
  const minOlderLow = olderLows.length > 0 ? Math.min(...olderLows) : 0;

  if (maxRecentHigh > maxOlderHigh) bullishSignals++;
  else bearishSignals++;

  if (minRecentLow > minOlderLow) bullishSignals++;
  else bearishSignals++;

  const total = bullishSignals + bearishSignals;
  const bullishRatio = total > 0 ? bullishSignals / total : 0.5;

  if (bullishRatio >= 0.7) {
    return { direction: 'bullish', strength: Math.round(bullishRatio * 100) };
  } else if (bullishRatio <= 0.3) {
    return { direction: 'bearish', strength: Math.round((1 - bullishRatio) * 100) };
  }
  return { direction: 'neutral', strength: Math.round(Math.abs(bullishRatio - 0.5) * 200) };
}

// ===========================================
// Analysis Engine
// ===========================================

export const analysisEngine = {
  // =========================================
  // Step 1: Market Pulse (FREE)
  // =========================================
  async getMarketPulse(): Promise<MarketPulseResult> {
    // Fetch all data in parallel for performance
    const [
      btcData,
      ethData,
      globalMetrics,
      fearGreed,
      btcNewsSentiment,
      btcFundingRate,
      fundingSpread,
      btcOpenInterest,
      btcLongShortRatio,
      btcTopTraderSentiment,
      btcTakerBuySell,
      economicCalendar,
    ] = await Promise.all([
      fetch24hTicker('BTC'),
      fetch24hTicker('ETH'),
      fetchGlobalMetrics(),
      fetchFearGreedIndex(),
      fetchNewsSentiment('BTC'),
      fetchFundingRate('BTC'),
      fetchFundingRateSpread(['BTC', 'ETH', 'SOL']),
      fetchOpenInterest('BTC'),
      fetchLongShortRatio('BTC'),
      fetchTopTraderSentiment('BTC'),
      fetchTakerBuySellRatio('BTC'),
      economicCalendarService.getUpcomingEvents().catch(err => {
        console.warn('[MarketPulse] Economic calendar fetch failed:', err);
        return null;
      }),
    ]);

    // Fetch BTC candles for trend analysis
    const btcCandles = await fetchKlines('BTC', '1d', 100);
    const btcTrend = calculateTrend(btcCandles);

    // Multi-timeframe alignment check
    const [candles4h, candles1h] = await Promise.all([
      fetchKlines('BTC', '4h', 100),
      fetchKlines('BTC', '1h', 100),
    ]);

    const trend4h = calculateTrend(candles4h);
    const trend1h = calculateTrend(candles1h);

    let timeframesAligned = 0;
    if (btcTrend.direction === 'bullish') timeframesAligned++;
    if (trend4h.direction === 'bullish') timeframesAligned++;
    if (trend1h.direction === 'bullish') timeframesAligned++;
    if (btcTrend.direction === trend4h.direction) timeframesAligned++;

    // BTC dominance trend
    let btcDominanceTrend: 'rising' | 'falling' | 'stable' = 'stable';
    if (btcData.priceChangePercent24h > ethData.priceChangePercent24h + 2) {
      btcDominanceTrend = 'rising';
    } else if (ethData.priceChangePercent24h > btcData.priceChangePercent24h + 2) {
      btcDominanceTrend = 'falling';
    }

    // Funding rate interpretation
    let fundingRateInterpretation: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (btcFundingRate.fundingRate > 0.05) {
      fundingRateInterpretation = 'bearish'; // Too many longs, potential reversal
    } else if (btcFundingRate.fundingRate < -0.05) {
      fundingRateInterpretation = 'bullish'; // Too many shorts, potential squeeze
    }

    // Market regime - Enhanced with futures data
    let marketRegime: 'risk_on' | 'risk_off' | 'neutral' = 'neutral';
    const bullishSignals = [
      fearGreed.value >= 50,
      btcTrend.direction === 'bullish',
      btcLongShortRatio.longShortRatio > 1,
      btcTakerBuySell.buySellRatio > 1,
      btcData.priceChangePercent24h > 0,
    ].filter(Boolean).length;

    const bearishSignals = [
      fearGreed.value <= 40,
      btcTrend.direction === 'bearish',
      btcLongShortRatio.longShortRatio < 0.8,
      btcTakerBuySell.buySellRatio < 0.8,
      btcData.priceChangePercent24h < -3,
    ].filter(Boolean).length;

    if (bullishSignals >= 4) {
      marketRegime = 'risk_on';
    } else if (bearishSignals >= 3) {
      marketRegime = 'risk_off';
    }

    // Fear & Greed label
    let fearGreedLabel: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' = 'neutral';
    if (fearGreed.value <= 24) fearGreedLabel = 'extreme_fear';
    else if (fearGreed.value <= 44) fearGreedLabel = 'fear';
    else if (fearGreed.value <= 55) fearGreedLabel = 'neutral';
    else if (fearGreed.value <= 74) fearGreedLabel = 'greed';
    else fearGreedLabel = 'extreme_greed';

    // ===========================================
    // ECONOMIC CALENDAR — MACRO PENALTY SYSTEM
    // High-impact event (4h window): -2 penalty
    // FOMC day (all day):            -3 penalty
    // Penalty is applied to the score; verdict is never auto-forced to 'avoid'.
    // ===========================================
    let macroPenalty = 0;
    let penaltyReason: string | undefined;
    let economicRiskLevel: 'high' | 'medium' | 'low' = 'low';
    let economicTradingAdvice = 'Normal trading conditions.';

    if (economicCalendar) {
      economicRiskLevel = economicCalendar.riskLevel;
      economicTradingAdvice = economicCalendar.tradingAdvice;

      // FOMC takes priority (highest penalty, all-day)
      const fomcToday = economicCalendar.todayHighImpact.find(e =>
        (e.title || '').toLowerCase().includes('fomc')
      );
      if (fomcToday) {
        macroPenalty = -3;
        penaltyReason = 'FOMC decision day. Extreme volatility expected.';
      } else {
        // High-impact event within ±4h window
        const now = new Date();
        for (const event of economicCalendar.todayHighImpact) {
          const eventDateTime = new Date(`${event.date}T${event.time}:00Z`);
          const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursUntilEvent > -2 && hoursUntilEvent < 4) {
            macroPenalty = -2;
            penaltyReason = hoursUntilEvent > 0
              ? `High-impact event "${event.title || 'Unknown'}" in ${hoursUntilEvent.toFixed(1)} hours.`
              : `High-impact event "${event.title || 'Unknown'}" occurred ${Math.abs(hoursUntilEvent).toFixed(1)} hours ago.`;
            break;
          }
        }
      }
    }

    // RAG-based Gate Evaluation
    const gateInput: GateEvaluationInput = {
      fearGreedIndex: fearGreed.value,
      fearGreedLabel,
      btcTrend: { direction: btcTrend.direction, strength: btcTrend.strength },
      trend4h: { direction: trend4h.direction, strength: trend4h.strength },
      trend1h: { direction: trend1h.direction, strength: trend1h.strength },
      timeframesAligned,
      marketRegime,
      fundingRate: btcFundingRate.fundingRate,
      longShortRatio: btcLongShortRatio.longShortRatio,
      topTraderLongShortRatio: btcTopTraderSentiment.topTraderLongShortRatio,
      takerBuySellRatio: btcTakerBuySell.buySellRatio,
      openInterestValue: btcOpenInterest.openInterestValue,
      btcPrice24hChange: btcData.priceChangePercent24h,
      newsSentiment: btcNewsSentiment.overallSentiment,
    };

    const gateResult = await evaluateMarketGateWithRAG(gateInput);

    // Calculate verdict based on gate result
    let verdict: 'suitable' | 'caution' | 'avoid' = 'caution';
    if (gateResult.canProceed && gateResult.confidence >= 70) {
      verdict = 'suitable';
    } else if (!gateResult.canProceed || gateResult.confidence < 30) {
      verdict = 'avoid';
    }

    // Calculate score (0-10) - Enhanced with futures data
    let score = 5;
    if (marketRegime === 'risk_on') score += 1.5;
    else if (marketRegime === 'risk_off') score -= 1.5;
    if (btcTrend.direction === 'bullish') score += 1;
    else if (btcTrend.direction === 'bearish') score -= 0.5;
    if (fearGreed.value >= 45 && fearGreed.value <= 75) score += 1;
    if (timeframesAligned >= 3) score += 1;
    // Futures data impact
    if (Math.abs(btcFundingRate.fundingRate) < 0.03) score += 0.5; // Healthy funding
    if (fundingSpread.interpretation === 'extreme') score -= 0.5; // Market dislocation
    else if (fundingSpread.interpretation === 'compressed') score += 0.3; // Calm market
    if (btcLongShortRatio.longShortRatio > 0.8 && btcLongShortRatio.longShortRatio < 1.5) score += 0.5;
    // News sentiment bonus/penalty
    if (btcNewsSentiment.overallSentiment === 'bullish') score += 0.5;
    else if (btcNewsSentiment.overallSentiment === 'bearish') score -= 0.5;
    // Gate confidence impact
    score += (gateResult.confidence - 50) / 50; // -1 to +1 based on confidence
    score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));

    const summary = `Market is in ${fearGreedLabel === 'extreme_fear' ? 'extreme fear' :
      fearGreedLabel === 'fear' ? 'fear' :
      fearGreedLabel === 'neutral' ? 'neutral' :
      fearGreedLabel === 'greed' ? 'greed' : 'extreme greed'} mode. ` +
      `BTC dominance ${globalMetrics.btcDominance.toFixed(1)}% (${btcDominanceTrend === 'rising' ? 'rising' : btcDominanceTrend === 'falling' ? 'falling' : 'stable'}). ` +
      `Overall trend is ${btcTrend.direction}, strength: ${btcTrend.strength}%. ` +
      `Funding rate: ${btcFundingRate.fundingRate.toFixed(4)}%, L/S ratio: ${btcLongShortRatio.longShortRatio.toFixed(2)}.`;

    return {
      btcDominance: parseFloat(globalMetrics.btcDominance.toFixed(1)),
      btcDominanceTrend,
      totalMarketCap: globalMetrics.totalMarketCap,
      marketCap24hChange: globalMetrics.marketCapChange24h,
      fearGreedIndex: fearGreed.value,
      fearGreedLabel,
      marketRegime,
      trend: {
        direction: btcTrend.direction,
        strength: btcTrend.strength,
        timeframesAligned,
      },
      futuresData: {
        fundingRate: btcFundingRate.fundingRate,
        fundingRateInterpretation,
        fundingRateSpread: {
          average: fundingSpread.average,
          spread: fundingSpread.spread,
          interpretation: fundingSpread.interpretation,
          rates: fundingSpread.rates,
        },
        openInterest: btcOpenInterest.openInterestValue,
        longShortRatio: btcLongShortRatio.longShortRatio,
        longAccount: btcLongShortRatio.longAccount,
        shortAccount: btcLongShortRatio.shortAccount,
        topTraderLongShortRatio: btcTopTraderSentiment.topTraderLongShortRatio,
        takerBuySellRatio: btcTakerBuySell.buySellRatio,
      },
      newsSentiment: {
        overall: btcNewsSentiment.overallSentiment,
        score: btcNewsSentiment.sentimentScore,
        newsCount: btcNewsSentiment.newsCount,
        positiveCount: btcNewsSentiment.positiveCount,
        negativeCount: btcNewsSentiment.negativeCount,
        topHeadlines: (btcNewsSentiment.topNews || []).slice(0, 3).map(n => ({
          title: n.title,
          source: n.source,
          sentiment: n.sentiment,
        })),
      },
      macroEvents: economicCalendar?.todayHighImpact.map(e => ({
        name: e.title,
        date: e.date,
        impact: e.impact,
        description: e.tradingImplication,
      })) || [],
      economicCalendar: economicCalendar ? {
        riskLevel: economicRiskLevel,
        riskReason: economicCalendar.riskReason,
        tradingAdvice: economicTradingAdvice,
        todayEvents: economicCalendar.todayHighImpact,
        next24hEvents: economicCalendar.next24hHighImpact,
        weekEvents: economicCalendar.weekHighImpact,
        macroPenalty,
        penaltyReason,
      } : undefined,
      summary: macroPenalty < 0
        ? `⚠️ MACRO PENALTY (${macroPenalty}): ${penaltyReason} ${summary}`
        : summary,
      verdict,
      score: Math.max(0, score + macroPenalty),
      gate: {
        canProceed: gateResult.canProceed,
        reason: gateResult.reason,
        confidence: gateResult.confidence,
      },
    };
  },

  // =========================================
  // Step 2: Asset Scanner (2 credits)
  // =========================================
  async scanAsset(symbol: string, tradeType: TradeType = 'dayTrade'): Promise<AssetScanResult> {
    const tf = getTimeframesForTradeType(tradeType);

    // Detect asset class for conditional analysis
    const assetClass = getAssetClass(symbol);
    const isCrypto = assetClass === 'crypto';

    // Extract base symbol for tokenomics (e.g., BTCUSDT -> BTC)
    const baseSymbol = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');

    // Fetch candles, tokenomics, and asset-specific context in parallel
    const [ticker, candlesPrimary, candlesSecondary, candlesConfirmation, tokenomicsData, assetContext] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, tf.primary, tf.candleCounts.primary),
      fetchKlines(symbol, tf.secondary, tf.candleCounts.secondary),
      fetchKlines(symbol, tf.confirmation, tf.candleCounts.confirmation),
      // Tokenomics analysis only for crypto assets
      isCrypto
        ? analyzeTokenomics(baseSymbol).catch(err => {
            console.warn(`Tokenomics analysis failed for ${baseSymbol}:`, err);
            return null;
          })
        : Promise.resolve(null), // Skip tokenomics for non-crypto assets
      // Asset-specific context for non-crypto assets (metals, stocks, bonds)
      getAssetSpecificContext(symbol),
    ]);

    // For higher timeframe analysis (needed for trends), also fetch daily candles if not already
    const candles1d = tf.secondary === '1d' ? candlesSecondary : await fetchKlines(symbol, '1d', 100);
    const candles4h = tf.primary === '4h' ? candlesPrimary : (tf.confirmation === '4h' ? candlesConfirmation : await fetchKlines(symbol, '4h', 50));
    const candles1h = tf.secondary === '1h' ? candlesSecondary : (tf.primary === '15m' ? await fetchKlines(symbol, '1h', 48) : candlesPrimary);

    // Multi-timeframe trend analysis
    const trend1d = calculateTrend(candles1d);
    const trend4h = calculateTrend(candles4h);
    const trend1h = calculateTrend(candles1h);

    // Weekly trend (from daily candles)
    const trend1w = calculateTrend(candles1d.slice(-35)); // ~5 weeks

    // Monthly trend estimation
    const trend1m = calculateTrend(candles1d.slice(-60)); // ~2 months

    const prices4h = candles4h.map((c) => c.close);
    const prices1d = candles1d.map((c) => c.close);

    // ========================================
    // Calculate ALL configured indicators for this step using trade-config
    // This uses the 40+ indicators defined in TECHNICAL_SPECIFICATION.md
    // ========================================
    const stepIndicators = calculateStepIndicators(candlesPrimary, tradeType, 'assetScan');

    // Traditional indicators (kept for backwards compatibility in indicators object)
    const rsi = calculateRSI(prices4h);
    const macd = calculateMACD(prices4h);
    const bb = calculateBollingerBands(prices4h);
    const atr = calculateATR(candles4h);

    // Moving averages
    const ma20 = calculateSMA(prices4h, 20);
    const ma50 = calculateSMA(prices4h, 50);
    const ma200 = calculateSMA(prices4h, Math.min(200, prices4h.length));

    // Support/Resistance levels - use primary timeframe candles (same timeframe as analysis)
    const levels = findSupportResistance(candlesPrimary);

    // ===== TFT FORECAST (Primary) or Statistical Fallback =====
    // Try to get prediction from TFT service first
    let tftForecast: TFTForecast | null = null;
    try {
      const tftClient = getTFTClient();
      tftForecast = await tftClient.predict(symbol.replace('USDT', ''));
    } catch (error) {
      console.warn(`TFT prediction unavailable for ${symbol}, using fallback`);
    }

    // Statistical fallback calculation
    const recentReturns = prices1d.slice(-7).map((p, i, arr) => {
      if (i === 0) return 0;
      const prev = arr[i - 1];
      if (prev === undefined || prev === 0) return 0;
      return (p - prev) / prev;
    }).slice(1);

    const avgReturn = recentReturns.length > 0 ? recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length : 0;
    const volatility = recentReturns.length > 0
      ? Math.sqrt(recentReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / recentReturns.length)
      : 0.02;

    // Use TFT prediction if available, otherwise fallback
    const price24h = tftForecast
      ? roundPrice(tftForecast.price24h)
      : roundPrice(ticker.price * (1 + avgReturn));
    const price7d = tftForecast
      ? roundPrice(tftForecast.price7d)
      : roundPrice(ticker.price * (1 + avgReturn * 7));

    // Confidence: TFT confidence or calculated from trend alignment
    let confidence = tftForecast ? tftForecast.confidence : 50;
    if (!tftForecast) {
      if (trend1d.direction === trend4h.direction) confidence += 15;
      if (trend4h.direction === trend1h.direction) confidence += 10;
      if (rsi > 30 && rsi < 70) confidence += 10;
      if (Math.abs(macd.histogram) > 0 && macd.histogram * (trend4h.direction === 'bullish' ? 1 : -1) > 0) {
        confidence += 10;
      }
    }
    confidence = Math.min(90, Math.max(20, confidence));

    // Scenario probabilities: TFT scenarios or trend-based
    let bullProb: number, bearProb: number, baseProb: number;
    let scenarios: Array<{ name: 'bull' | 'base' | 'bear'; price: number; probability: number }>;

    if (tftForecast && tftForecast.scenarios.length > 0) {
      // Use TFT scenarios directly
      scenarios = tftForecast.scenarios;
      bullProb = scenarios.find(s => s.name === 'bull')?.probability || 25;
      bearProb = scenarios.find(s => s.name === 'bear')?.probability || 25;
      baseProb = scenarios.find(s => s.name === 'base')?.probability || 50;
    } else {
      // Fallback scenario calculation
      bullProb = trend4h.direction === 'bullish' ? 40 : trend4h.direction === 'bearish' ? 20 : 30;
      bearProb = trend4h.direction === 'bearish' ? 40 : trend4h.direction === 'bullish' ? 20 : 30;
      baseProb = 100 - bullProb - bearProb;
      scenarios = [
        { name: 'bull', price: roundPrice(price7d * (1 + volatility * 2)), probability: bullProb },
        { name: 'base', price: price7d, probability: baseProb },
        { name: 'bear', price: roundPrice(price7d * (1 - volatility * 2)), probability: bearProb },
      ];
    }

    // Calculate score
    let score = 5;
    if (trend1d.direction === 'bullish') score += 1.5;
    else if (trend1d.direction === 'bearish') score -= 1;
    if (trend4h.direction === 'bullish') score += 1;
    if (rsi >= 30 && rsi <= 70) score += 0.5;
    if (macd.histogram > 0) score += 0.5;
    if (ticker.price > ma50) score += 0.5;
    if (ticker.price > ma200) score += 0.5;
    score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));

    // Count how many timeframes agree on direction
    const timeframeAlignment = [trend1m, trend1w, trend1d, trend4h, trend1h]
      .filter(t => t.direction === trend4h.direction).length;

    // Get leading indicators signal from step indicators
    const indicatorAnalysis = buildIndicatorAnalysis({
      ...indicatorResultsToAnalysisInputs(stepIndicators, ticker.price, ticker.priceChangePercent24h, prices4h),
      rsi: stepIndicators.get('RSI')?.value ?? rsi,
      macd: stepIndicators.get('MACD')?.metadata
        ? { value: stepIndicators.get('MACD')!.metadata!.macd, signal: stepIndicators.get('MACD')!.metadata!.signal, histogram: stepIndicators.get('MACD')!.metadata!.histogram }
        : { value: macd.macd, signal: macd.signal, histogram: macd.histogram },
      bollingerBands: stepIndicators.get('BOLLINGER')?.metadata
        ? { upper: stepIndicators.get('BOLLINGER')!.metadata!.upper, middle: stepIndicators.get('BOLLINGER')!.metadata!.middle, lower: stepIndicators.get('BOLLINGER')!.metadata!.lower }
        : { upper: bb.upper, middle: bb.middle, lower: bb.lower },
      movingAverages: { ma50, ma200 },
    });

    // Candlestick pattern detection for direction confirmation
    const candlestickPatterns = indicatorsService.detectCandlestickPatterns(candles4h);
    const patterns = candlestickPatterns.metadata?.patterns || [];
    const bullishPatterns = patterns.filter((p: { direction: string }) => p.direction === 'bullish');
    const bearishPatterns = patterns.filter((p: { direction: string }) => p.direction === 'bearish');
    const highSigPatterns = patterns.filter((p: { significance: string }) => p.significance === 'high');

    // Gate evaluation for Asset Scanner
    const gateInput: AssetGateEvaluationInput = {
      symbol,
      rsi,
      macdHistogram: macd.histogram,
      trendDirection: trend4h.direction,
      trendStrength: trend4h.strength,
      timeframeAlignment,
      priceChange24h: ticker.priceChangePercent24h,
      volume24h: ticker.quoteVolume24h,
      atr,
      currentPrice: ticker.price,
      supportLevels: levels.support,
      resistanceLevels: levels.resistance,
      leadingIndicatorsSignal: indicatorAnalysis.summary?.leadingIndicatorsSignal,
      signalConfidence: indicatorAnalysis.summary?.signalConfidence,
      // Candlestick pattern confirmation for direction
      bullishPatternCount: bullishPatterns.length,
      bearishPatternCount: bearishPatterns.length,
      highSignificancePatterns: highSigPatterns.map((p: { name: string }) => p.name),
    };

    const gateResult = await evaluateAssetGateWithRAG(gateInput);

    return {
      symbol,
      currentPrice: ticker.price,
      priceChange24h: ticker.priceChangePercent24h,
      volume24h: ticker.quoteVolume24h,
      timeframes: [
        { tf: '1M', trend: trend1m.direction, strength: trend1m.strength },
        { tf: '1W', trend: trend1w.direction, strength: trend1w.strength },
        { tf: '1D', trend: trend1d.direction, strength: trend1d.strength },
        { tf: '4H', trend: trend4h.direction, strength: trend4h.strength },
        { tf: '1H', trend: trend1h.direction, strength: trend1h.strength },
      ],
      forecast: {
        price24h,
        price7d,
        confidence,
        scenarios,
        // Metadata: which model generated this forecast
        modelType: tftForecast ? tftForecast.modelType : 'statistical_fallback',
      },
      levels: {
        resistance: levels.resistance.length > 0 ? levels.resistance : [
          roundPrice(ticker.price * 1.05),
          roundPrice(ticker.price * 1.1),
          roundPrice(ticker.price * 1.15),
        ],
        support: levels.support.length > 0 ? levels.support : [
          roundPrice(ticker.price * 0.95),
          roundPrice(ticker.price * 0.9),
          roundPrice(ticker.price * 0.85),
        ],
        poc: levels.poc || roundPrice((ticker.high24h + ticker.low24h) / 2),
      },
      indicators: {
        rsi: Math.round(rsi * 10) / 10,
        macd: {
          value: parseFloat(macd.macd.toFixed(2)),
          signal: parseFloat(macd.signal.toFixed(2)),
          histogram: parseFloat(macd.histogram.toFixed(2)),
        },
        movingAverages: {
          ma20: roundPrice(ma20),
          ma50: roundPrice(ma50),
          ma200: roundPrice(ma200),
        },
        bollingerBands: {
          upper: roundPrice(bb.upper),
          middle: roundPrice(bb.middle),
          lower: roundPrice(bb.lower),
        },
        atr: parseFloat(atr.toFixed(2)),
        // Candlestick patterns for direction confirmation
        candlestickPatterns: {
          total: patterns.length,
          bullish: bullishPatterns.length,
          bearish: bearishPatterns.length,
          highSignificance: highSigPatterns.map((p: { name: string }) => p.name),
          all: patterns.slice(0, 5).map((p: { name: string; direction: string; significance: string }) => ({
            name: p.name,
            direction: p.direction,
            significance: p.significance,
          })),
        },
      },
      // Indicator bundle used for this analysis (timeframe-driven selection)
      bundleType: getBundleType(tf.primary as Timeframe),
      // Build detailed indicator analysis using bundle-appropriate indicators
      indicatorDetails: indicatorAnalysis,
      // NEW: Tokenomics analysis (financial structure of the token)
      // Includes: supply metrics, market cap/FDV, whale concentration, distribution
      tokenomics: tokenomicsData || undefined,
      // NEW: Asset-specific context for non-crypto assets (metals, stocks, bonds)
      // Uses specialized analyzers with asset-class-specific metrics
      assetContext: assetContext.metrics ? assetContext : undefined,
      // Chart data for PDF generation (last 50 candles)
      chartCandles: candlesPrimary.slice(-50).map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      score,
      // Gate decision for sequential approach
      gate: {
        canProceed: gateResult.canProceed,
        reason: gateResult.reason,
        confidence: gateResult.confidence,
      },
      // Direction recommendation from this step
      direction: gateResult.direction,
      directionConfidence: gateResult.directionConfidence,
    };
  },

  // =========================================
  // Step 3: Safety Check (5 credits)
  // =========================================
  async safetyCheck(symbol: string, tradeType: TradeType = 'dayTrade'): Promise<SafetyCheckResult> {
    const tf = getTimeframesForTradeType(tradeType);

    // Detect asset class for conditional analysis
    const assetClass = getAssetClass(symbol);
    const isCrypto = assetClass === 'crypto';

    // Fetch data - order book and trades only for crypto
    const [ticker, candlesPrimary, orderBook, recentTrades, newsSentiment] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, tf.primary, tf.candleCounts.primary),
      isCrypto ? fetchOrderBook(symbol, 100) : Promise.resolve({ bids: [], asks: [] }),
      isCrypto ? fetchRecentTrades(symbol, 500) : Promise.resolve([]),
      isCrypto ? fetchNewsSentiment(symbol) : Promise.resolve({
        symbol,
        overallSentiment: 'neutral' as const,
        sentimentScore: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        newsCount: 0,
        topNews: [], // Required for .slice() calls
        sources: [],
        lastUpdate: new Date().toISOString(),
      }),
    ]);

    // Use primary timeframe candles for safety analysis
    const candles1h = candlesPrimary;

    const volumes = candles1h.map((c) => c.volume);
    const avgVolume = volumes.length > 0 ? volumes.slice(-24).reduce((a, b) => a + b, 0) / Math.min(24, volumes.length) : 1;
    const currentVolume = volumes[volumes.length - 1] ?? avgVolume;
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

    // ========================================
    // Calculate ALL configured indicators for this step using trade-config
    // This uses the 40+ indicators defined in TECHNICAL_SPECIFICATION.md
    // ========================================
    const stepIndicators = calculateStepIndicators(candlesPrimary, tradeType, 'safetyCheck');

    // Advanced indicators from Python metrics (kept for backwards compatibility)
    const volumeSpike = detectVolumeSpike(candles1h, 15, 2.0);
    const relativeVolume = calculateRelativeVolume(candles1h, 20);
    const pvt = calculatePVT(candles1h);
    const historicalVol = calculateHistoricalVolatility(candles1h, 20);

    // Analyze order book for manipulation signs (crypto only)
    const bids = orderBook.bids.map((b) => ({
      price: parseFloat(b[0]),
      qty: parseFloat(b[1]),
    }));
    const asks = orderBook.asks.map((a) => ({
      price: parseFloat(a[0]),
      qty: parseFloat(a[1]),
    }));

    const totalBidVolume = bids.reduce((sum, b) => sum + b.qty * b.price, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.qty * a.price, 0);
    const orderBookImbalance = (totalBidVolume + totalAskVolume) > 0
      ? (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)
      : 0; // Default to neutral for non-crypto

    // Check for spoofing (large orders far from price)
    const currentPrice = ticker.price;
    const spoofThreshold = currentPrice * 0.02; // 2% away
    const largeBidsFar = bids.filter(
      (b) => b.qty * b.price > avgVolume * 0.1 && currentPrice - b.price > spoofThreshold
    );
    const largeAsksFar = asks.filter(
      (a) => a.qty * a.price > avgVolume * 0.1 && a.price - currentPrice > spoofThreshold
    );
    const spoofingDetected = largeBidsFar.length > 3 || largeAsksFar.length > 3;

    // Check for layering
    const bidPriceLevels = new Set(bids.slice(0, 20).map((b) => Math.round(b.price * 100)));
    const askPriceLevels = new Set(asks.slice(0, 20).map((a) => Math.round(a.price * 100)));
    const layeringDetected = bidPriceLevels.size >= 18 || askPriceLevels.size >= 18;

    // Check for iceberg orders (large fills at same price)
    const tradesByPrice = new Map<number, number>();
    for (const trade of recentTrades) {
      const price = Math.round(parseFloat(trade.price) * 100) / 100;
      tradesByPrice.set(price, (tradesByPrice.get(price) ?? 0) + parseFloat(trade.qty));
    }
    const tradeVolumes = [...tradesByPrice.values()];
    const maxTradeVolume = tradeVolumes.length > 0 ? Math.max(...tradeVolumes) : 0;
    const icebergDetected = maxTradeVolume > avgVolume * 0.5;
    const sortedTrades = [...tradesByPrice.entries()].sort((a, b) => b[1] - a[1]);
    const icebergPrice = icebergDetected && sortedTrades.length > 0
      ? sortedTrades[0]?.[0]
      : undefined;

    // Wash trading detection (same size trades)
    const tradeSizes = recentTrades.map((t) => parseFloat(t.qty));
    const sizeFrequency = new Map<string, number>();
    for (const size of tradeSizes) {
      const key = size.toFixed(4);
      sizeFrequency.set(key, (sizeFrequency.get(key) || 0) + 1);
    }
    const maxFrequency = sizeFrequency.size > 0 ? Math.max(...sizeFrequency.values()) : 0;
    const washTrading = recentTrades.length > 0 && maxFrequency > recentTrades.length * 0.1;

    // Pump & dump risk
    let pumpDumpRisk: 'low' | 'medium' | 'high' = 'low';
    if (Math.abs(ticker.priceChangePercent24h) > 20 && volumeRatio > 3) {
      pumpDumpRisk = 'high';
    } else if (Math.abs(ticker.priceChangePercent24h) > 10 && volumeRatio > 2) {
      pumpDumpRisk = 'medium';
    }

    // Whale activity analysis
    const largeTrades = recentTrades.filter(
      (t) => parseFloat(t.qty) * parseFloat(t.price) > 50000
    );
    const largeBuys = largeTrades
      .filter((t) => !t.isBuyerMaker)
      .map((t) => ({
        amountUsd: parseFloat(t.qty) * parseFloat(t.price),
        price: parseFloat(t.price),
        time: new Date(t.time).toISOString(),
      }));
    const largeSells = largeTrades
      .filter((t) => t.isBuyerMaker)
      .map((t) => ({
        amountUsd: parseFloat(t.qty) * parseFloat(t.price),
        price: parseFloat(t.price),
        time: new Date(t.time).toISOString(),
      }));

    const buyVolume = largeBuys.reduce((sum, t) => sum + t.amountUsd, 0);
    const sellVolume = largeSells.reduce((sum, t) => sum + t.amountUsd, 0);
    const netFlowUsd = buyVolume - sellVolume;

    // Calculate order flow imbalance from all trades
    const takerBuyVolume = recentTrades
      .filter((t) => !t.isBuyerMaker)
      .reduce((sum, t) => sum + parseFloat(t.qty), 0);
    const takerSellVolume = recentTrades
      .filter((t) => t.isBuyerMaker)
      .reduce((sum, t) => sum + parseFloat(t.qty), 0);
    const orderFlowImbalance = calculateOrderFlowImbalance(takerBuyVolume, takerSellVolume);

    // Calculate liquidity score
    const bestBid = bids[0]?.price ?? 0;
    const bestAsk = asks[0]?.price ?? 0;
    const bidAskSpread = bestAsk - bestBid;
    const liquidityScore = calculateLiquidityScore(ticker.volume24h, currentPrice, bidAskSpread);

    let whaleBias: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
    if (netFlowUsd > 100000) whaleBias = 'accumulation';
    else if (netFlowUsd < -100000) whaleBias = 'distribution';

    // Smart Money Index (SMI) — real formula adapted for crypto
    // Uses session-weighted volume-price analysis to detect institutional activity
    const smiCandles = candlesPrimary.map(c => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      timestamp: c.timestamp ?? 0,
    }));
    const smiResult = calculateSmartMoneyIndex(smiCandles);

    // Determine positioning from SMI trend + order book confirmation
    let smartMoneyPositioning: 'long' | 'short' | 'neutral' = 'neutral';
    if (smiResult.smiTrend === 'accumulating' && smiResult.confidence >= 50) {
      smartMoneyPositioning = 'long';
    } else if (smiResult.smiTrend === 'distributing' && smiResult.confidence >= 50) {
      smartMoneyPositioning = 'short';
    } else if (orderBookImbalance > 0.2) {
      // Fallback to order book when SMI is neutral or low confidence
      smartMoneyPositioning = 'long';
    } else if (orderBookImbalance < -0.2) {
      smartMoneyPositioning = 'short';
    }

    // Overall risk level
    const warnings: string[] = [];
    let riskScore = 100;

    if (spoofingDetected) {
      warnings.push('Spoofing detected - proceed with caution');
      riskScore -= 20;
    }
    if (layeringDetected) {
      warnings.push('Layering activity detected');
      riskScore -= 15;
    }
    if (icebergDetected) {
      warnings.push(`Hidden iceberg order detected at $${icebergPrice}`);
      riskScore -= 10;
    }
    if (washTrading) {
      warnings.push('Wash trading suspected');
      riskScore -= 15;
    }
    if (pumpDumpRisk === 'high') {
      warnings.push('High pump & dump risk!');
      riskScore -= 25;
    }
    if (volumeRatio > 3) {
      warnings.push(`Abnormal volume: ${volumeRatio.toFixed(1)}x average`);
      riskScore -= 10;
    }
    if (volumeSpike.isSpike) {
      warnings.push(`Volume spike detected: ${volumeSpike.factor.toFixed(1)}x normal`);
      riskScore -= 8;
    }
    if (Math.abs(ticker.priceChangePercent24h) > 15) {
      warnings.push(`Large price movement: ${ticker.priceChangePercent24h.toFixed(1)}%`);
      riskScore -= 10;
    }
    if (liquidityScore < 50) {
      warnings.push(`Low liquidity score: ${liquidityScore.toFixed(0)}/100`);
      riskScore -= 10;
    }
    if (historicalVol > 100) {
      warnings.push(`High volatility: ${historicalVol.toFixed(0)}% annualized`);
      riskScore -= 5;
    }
    // News sentiment warnings
    if (newsSentiment.overallSentiment === 'bearish' && newsSentiment.newsCount > 0) {
      warnings.push(`Negative news sentiment: ${newsSentiment.negativeCount}/${newsSentiment.newsCount} bearish headlines`);
      riskScore -= 8;
    }
    if (newsSentiment.sentimentScore < -30) {
      warnings.push(`Strong negative sentiment in news (score: ${newsSentiment.sentimentScore})`);
      riskScore -= 5;
    }

    // Contract Security Check (on-chain)
    let contractSecurity: SafetyCheckResult['contractSecurity'];
    try {
      const securityData = await contractSecurityService.analyzeContract(symbol);
      if (securityData) {
        contractSecurity = {
          isVerified: securityData.isVerified,
          isHoneypot: securityData.isHoneypot,
          isMintable: securityData.isMintable,
          liquidityLocked: securityData.liquidityLocked,
          liquidityLockPercent: securityData.liquidityLockPercent,
          liquidityLockEndDate: securityData.liquidityLockEndDate,
          buyTax: securityData.buyTax,
          sellTax: securityData.sellTax,
          riskScore: securityData.riskScore,
          riskLevel: securityData.riskLevel,
          warnings: securityData.warnings,
          contractAddress: securityData.contractAddress,
          chain: securityData.chain,
        };

        // Add contract security warnings
        if (securityData.isHoneypot) {
          warnings.push('🚨 HONEYPOT: Token cannot be sold!');
          riskScore -= 50;
        }
        if (!securityData.isVerified) {
          warnings.push('⚠️ Contract source code is NOT verified');
          riskScore -= 15;
        }
        if (securityData.isMintable) {
          warnings.push('⚠️ Token is MINTABLE - Owner can create unlimited tokens');
          riskScore -= 20;
        }
        if (!securityData.liquidityLocked) {
          warnings.push('⚠️ Liquidity is NOT locked - RUG PULL risk!');
          riskScore -= 15;
        }
        if (securityData.sellTax > 10) {
          warnings.push(`⚠️ High sell tax: ${securityData.sellTax}%`);
          riskScore -= 10;
        }
      }
    } catch (error) {
      console.log('Contract security check not available for', symbol);
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore < 50) riskLevel = 'high';
    else if (riskScore < 75) riskLevel = 'medium';

    // Calculate score (inverse of risk)
    const score = Math.max(1, Math.min(10, riskScore / 10));

    // Gate evaluation
    const gateInput: SafetyGateEvaluationInput = {
      symbol,
      riskLevel,
      spoofingDetected,
      layeringDetected,
      washTrading,
      pumpDumpRisk,
      whaleBias,
      netFlowUsd,
      orderFlowImbalance: orderFlowImbalance.imbalance,
      smartMoneyPositioning,
      volumeSpike: volumeSpike.isSpike,
      volumeSpikeFactor: volumeSpike.factor,
      liquidityScore,
      warnings,
    };
    const gateResult = await evaluateSafetyGateWithRAG(gateInput);

    return {
      symbol,
      manipulation: {
        spoofingDetected,
        spoofingDetails: spoofingDetected ? 'Large orders detected far from current price' : undefined,
        layeringDetected,
        layeringDetails: layeringDetected ? 'Multiple orders at many small price levels' : undefined,
        icebergDetected,
        icebergPrice,
        icebergSide: icebergDetected
          ? largeBuys.length > largeSells.length
            ? 'buy'
            : 'sell'
          : undefined,
        washTrading,
        pumpDumpRisk,
      },
      whaleActivity: {
        largeBuys: largeBuys.slice(0, 5),
        largeSells: largeSells.slice(0, 5),
        netFlowUsd,
        bias: whaleBias,
        orderFlowImbalance: orderFlowImbalance.imbalance,
        orderFlowBias: orderFlowImbalance.bias,
      },
      advancedMetrics: {
        volumeSpike: volumeSpike.isSpike,
        volumeSpikeFactor: volumeSpike.factor,
        relativeVolume,
        pvt: pvt.pvt,
        pvtTrend: pvt.trend,
        pvtMomentum: pvt.momentum,
        historicalVolatility: historicalVol,
        liquidityScore,
        bidAskSpread: Math.round(bidAskSpread * 10000) / 10000,
      },
      newsSentiment: {
        overall: newsSentiment.overallSentiment,
        score: newsSentiment.sentimentScore,
        newsCount: newsSentiment.newsCount || 0,
        positiveCount: newsSentiment.positiveCount || 0,
        negativeCount: newsSentiment.negativeCount || 0,
        topHeadlines: (newsSentiment.topNews || []).slice(0, 3).map(n => ({
          title: n.title,
          source: n.source,
          sentiment: n.sentiment,
        })),
      },
      exchangeFlows: [
        {
          exchange: 'Binance',
          inflow: sellVolume,
          outflow: buyVolume,
          net: netFlowUsd,
          interpretation: netFlowUsd > 0 ? 'Net outflow - bullish signal' : 'Net inflow - bearish signal',
        },
      ],
      smartMoney: {
        positioning: smartMoneyPositioning,
        confidence: smiResult.confidence > 30 ? smiResult.confidence : Math.round(Math.abs(orderBookImbalance) * 100),
        smiValue: smiResult.smiValue,
        smiTrend: smiResult.smiTrend,
        smiDivergence: smiResult.divergence,
        smartSessionRatio: smiResult.smartSessionRatio,
      },
      contractSecurity,
      riskLevel,
      warnings,
      // Build detailed indicator analysis using bundle-appropriate indicators
      indicatorDetails: buildIndicatorAnalysis({
        ...indicatorResultsToAnalysisInputs(stepIndicators, currentPrice, ticker.priceChangePercent24h, candlesPrimary.map(c => c.close)),
        // Include traditional indicators as fallback
        pvt: stepIndicators.get('PVT')?.values
          ? { pvt: stepIndicators.get('PVT')!.value, trend: stepIndicators.get('PVT')!.signal || pvt.trend, momentum: pvt.momentum }
          : { pvt: pvt.pvt, trend: pvt.trend, momentum: pvt.momentum },
        relativeVolume: stepIndicators.get('RELATIVE_VOLUME')?.value ?? relativeVolume,
        volumeSpike: stepIndicators.get('VOLUME_SPIKE')?.metadata
          ? { isSpike: stepIndicators.get('VOLUME_SPIKE')!.metadata!.isSpike, factor: stepIndicators.get('VOLUME_SPIKE')!.value ?? volumeSpike.factor }
          : { isSpike: volumeSpike.isSpike, factor: volumeSpike.factor },
        orderFlowImbalance: stepIndicators.get('ORDER_FLOW_IMBALANCE')
          ? { imbalance: stepIndicators.get('ORDER_FLOW_IMBALANCE')!.value ?? orderFlowImbalance.imbalance, bias: stepIndicators.get('ORDER_FLOW_IMBALANCE')!.signal || orderFlowImbalance.bias }
          : { imbalance: orderFlowImbalance.imbalance, bias: orderFlowImbalance.bias },
        liquidityScore: stepIndicators.get('LIQUIDITY_SCORE')?.value ?? liquidityScore,
        historicalVolatility: stepIndicators.get('HISTORICAL_VOLATILITY')?.value ?? historicalVol,
      }),
      score,
      gate: {
        canProceed: gateResult.canProceed,
        reason: gateResult.reason,
        confidence: gateResult.confidence,
        riskAdjustment: gateResult.riskAdjustment,
      },
    };
  },

  // =========================================
  // Step 4: Timing (3 credits)
  // =========================================
  async timingAnalysis(symbol: string, tradeType: TradeType = 'dayTrade'): Promise<TimingResult> {
    const tf = getTimeframesForTradeType(tradeType);

    const [ticker, candlesPrimary, candlesSecondary] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, tf.primary, tf.candleCounts.primary),
      fetchKlines(symbol, tf.secondary, tf.candleCounts.secondary),
    ]);

    // Use trade-type appropriate timeframes for analysis
    const candles4h = candlesPrimary;
    const candles1h = candlesSecondary;

    const prices4h = candles4h.map((c) => c.close);
    const prices1h = candles1h.map((c) => c.close);

    const rsi4h = calculateRSI(prices4h);
    const rsi1h = calculateRSI(prices1h);
    const bb = calculateBollingerBands(prices4h);
    const macd = calculateMACD(prices4h);
    const trend = calculateTrend(candles4h);
    const levels = findSupportResistance(candles4h);

    // Advanced metrics for timing
    const relativeVolume = calculateRelativeVolume(candles1h, 20);
    const pvt = calculatePVT(candles4h);
    const volumeSpike = detectVolumeSpike(candles1h, 15, 2.0);

    // Candlestick pattern detection for entry confirmation
    const candlestickPatterns = indicatorsService.detectCandlestickPatterns(candles4h);
    const patterns = candlestickPatterns.metadata?.patterns || [];
    const bullishPatterns = patterns.filter((p: { direction: string }) => p.direction === 'bullish');
    const bearishPatterns = patterns.filter((p: { direction: string }) => p.direction === 'bearish');
    const highSigPatterns = patterns.filter((p: { significance: string }) => p.significance === 'high');

    const currentPrice = ticker.price;

    // Entry conditions
    const conditions: Array<{ name: string; met: boolean; details: string }> = [
      {
        name: 'RSI Status',
        met: rsi4h >= 30 && rsi4h <= 70,
        details: rsi4h < 30 ? 'Oversold' : rsi4h > 70 ? 'Overbought' : 'Normal zone',
      },
      {
        name: 'Bollinger Position',
        met: currentPrice <= bb.middle,
        details: currentPrice > bb.upper ? 'Above upper band' :
                 currentPrice < bb.lower ? 'Below lower band' :
                 currentPrice <= bb.middle ? 'Below middle - good entry' : 'Above middle',
      },
      {
        name: 'MACD Signal',
        met: trend.direction === 'bullish' ? macd.histogram > 0 : macd.histogram < 0,
        details: macd.histogram > 0 ? 'Positive histogram' : 'Negative histogram',
      },
      {
        name: 'Trend Alignment',
        met: trend.strength >= 60,
        details: `Trend strength: ${trend.strength}%`,
      },
      {
        name: 'Support Proximity',
        met: levels.support.length > 0 && currentPrice <= (levels.support[0] ?? currentPrice) * 1.03,
        details: levels.support[0] !== undefined ? `Nearest support: $${levels.support[0]}` : 'No support found',
      },
      {
        name: 'Volume Quality',
        met: relativeVolume >= 0.8 && relativeVolume <= 2.0 && !volumeSpike.isSpike,
        details: volumeSpike.isSpike
          ? `Volume spike: ${volumeSpike.factor.toFixed(1)}x - wait for calm`
          : `Relative volume: ${relativeVolume.toFixed(1)}x`,
      },
      {
        name: 'PVT Confirmation',
        met: (trend.direction === 'bullish' && pvt.trend === 'bullish') ||
             (trend.direction === 'bearish' && pvt.trend === 'bearish'),
        details: `PVT trend: ${pvt.trend}, momentum: ${pvt.momentum > 0 ? '+' : ''}${(pvt.momentum * 100).toFixed(2)}%`,
      },
      {
        name: 'Candlestick Pattern',
        met: highSigPatterns.length > 0 && (
          (trend.direction === 'bullish' && bullishPatterns.length >= bearishPatterns.length) ||
          (trend.direction === 'bearish' && bearishPatterns.length >= bullishPatterns.length)
        ),
        details: patterns.length > 0
          ? `${patterns.length} pattern(s): ${highSigPatterns.map((p: { name: string }) => p.name).join(', ') || 'None high-significance'}`
          : 'No candlestick patterns detected',
      },
    ];

    const conditionsMet = conditions.filter((c) => c.met).length;
    // Need at least 4 out of 8 conditions met, RSI not overbought, and no volume spike
    // Bonus: If high-significance bullish/bearish pattern aligns with trend, more confidence
    const patternAligned = highSigPatterns.length > 0 && (
      (trend.direction === 'bullish' && bullishPatterns.length > bearishPatterns.length) ||
      (trend.direction === 'bearish' && bearishPatterns.length > bullishPatterns.length)
    );
    const tradeNow = conditionsMet >= 4 && rsi4h < 65 && !volumeSpike.isSpike;

    // Calculate optimal entry
    const nearestSupport = levels.support[0] ?? currentPrice * 0.97;
    const optimalEntry = roundPrice(currentPrice * 0.6 + nearestSupport * 0.4);

    // Entry zones
    const entryZones: TimingResult['entryZones'] = [];

    // Pattern quality bonus - if high-significance patterns align with trend, zones are higher quality
    const patternQualityBonus = patternAligned ? 1 : 0;

    // Zone 1: Aggressive entry
    if (currentPrice <= bb.middle) {
      entryZones.push({
        priceLow: roundPrice(currentPrice * 0.99),
        priceHigh: roundPrice(currentPrice * 1.01),
        probability: patternAligned ? 80 : 70,
        eta: 'Now',
        quality: Math.min(5, 4 + patternQualityBonus),
      });
    }

    // Zone 2: Conservative entry
    if (levels.support[0]) {
      entryZones.push({
        priceLow: roundPrice(levels.support[0] * 0.99),
        priceHigh: roundPrice(levels.support[0] * 1.01),
        probability: patternAligned ? 70 : 60,
        eta: '4-12 hours',
        quality: 5,
      });
    }

    // Zone 3: Deep value
    if (levels.support[1]) {
      entryZones.push({
        priceLow: roundPrice(levels.support[1] * 0.99),
        priceHigh: roundPrice(levels.support[1] * 1.01),
        probability: patternAligned ? 50 : 40,
        eta: '1-3 days',
        quality: 5,
      });
    }

    // Wait recommendation
    let waitFor: TimingResult['waitFor'];
    if (!tradeNow) {
      if (rsi4h > 70) {
        waitFor = {
          event: 'RSI drop (below 70)',
          estimatedTime: '4-8 hours',
        };
      } else if (currentPrice > bb.upper) {
        waitFor = {
          event: 'Price dropping below upper BB band',
          estimatedTime: '2-6 hours',
        };
      } else if (highSigPatterns.length === 0 && patterns.length < 2) {
        waitFor = {
          event: 'Candlestick pattern confirmation (e.g., Hammer, Engulfing)',
          estimatedTime: '1-4 hours',
        };
      } else if (conditionsMet < 3) {
        waitFor = {
          event: 'More conditions to be met',
          estimatedTime: '6-24 hours',
        };
      }
    }

    // Reason
    let reason = '';
    if (tradeNow) {
      reason = `${conditionsMet}/8 conditions met. `;
      if (rsi4h < 40) reason += 'RSI low - good buying opportunity. ';
      if (currentPrice < bb.middle) reason += 'Price below BB middle. ';
      if (patternAligned) {
        const patternNames = highSigPatterns.slice(0, 2).map((p: { name: string }) => p.name).join(', ');
        reason += `Candlestick confirmation: ${patternNames}. `;
      }
    } else {
      reason = `${conditionsMet}/8 conditions met - not enough. `;
      if (rsi4h > 70) reason += 'RSI in overbought zone. ';
      if (currentPrice > bb.upper) reason += 'Price above upper BB band. ';
      if (patterns.length === 0) reason += 'No candlestick patterns for entry confirmation. ';
    }

    // Score calculation
    let score = 5;
    score += conditionsMet * 0.8;
    if (tradeNow) score += 1;
    if (rsi4h >= 30 && rsi4h <= 50) score += 0.5;
    // Bonus for candlestick pattern alignment with trend
    if (patternAligned) score += 0.8;
    score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));

    // Gate evaluation
    const nearSupport = levels.support.length > 0 && currentPrice <= (levels.support[0] ?? currentPrice) * 1.03;
    const nearResistance = levels.resistance.length > 0 && currentPrice >= (levels.resistance[0] ?? currentPrice) * 0.97;
    const timingGateInput: TimingGateEvaluationInput = {
      symbol,
      currentPrice,
      rsiValue: rsi4h,
      macdSignal: macd.histogram > 0 ? 'bullish' : macd.histogram < 0 ? 'bearish' : 'neutral',
      volumeConfirmation: relativeVolume >= 0.8 && relativeVolume <= 2.0,
      nearSupport,
      nearResistance,
      trendStrength: trend.strength,
      entryQuality: entryZones.length > 0 ? entryZones[0]?.quality ?? 5 : 5,
      momentum: pvt.momentum > 0.01 ? 'accelerating' : pvt.momentum < -0.01 ? 'decelerating' : 'stable',
    };
    const timingGateResult = await evaluateTimingGateWithRAG(timingGateInput);

    return {
      symbol,
      currentPrice,
      tradeNow,
      reason: reason.trim(),
      conditions,
      entryZones,
      optimalEntry,
      waitFor,
      score,
      gate: {
        canProceed: timingGateResult.canProceed,
        reason: timingGateResult.reason,
        confidence: timingGateResult.confidence,
        urgency: timingGateResult.urgency,
      },
    };
  },

  // =========================================
  // Step 5: Trade Plan (5 credits)
  // =========================================
  async tradePlan(symbol: string, accountSize: number = 10000, tradeType: TradeType = 'dayTrade'): Promise<TradePlanResult> {
    const tf = getTimeframesForTradeType(tradeType);

    const [ticker, candlesPrimary] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, tf.primary, tf.candleCounts.primary),
    ]);

    // Use trade-type appropriate timeframe
    const candles4h = candlesPrimary;

    const trend = calculateTrend(candles4h);
    const levels = findSupportResistance(candles4h);
    const atr = calculateATR(candles4h);

    const direction: 'long' | 'short' = trend.direction === 'bearish' ? 'short' : 'long';
    const currentPrice = ticker.price;

    // Calculate entries (3-level scaling)
    const entry1 = currentPrice;
    const entry2 = direction === 'long'
      ? currentPrice * 0.98
      : currentPrice * 1.02;
    const entry3 = direction === 'long'
      ? levels.support[0] || currentPrice * 0.95
      : levels.resistance[0] || currentPrice * 1.05;

    const entries: TradePlanResult['entries'] = [
      { price: roundPrice(entry1), percentage: 40, type: 'limit', source: 'Current price' },
      { price: roundPrice(entry2), percentage: 35, type: 'limit', source: 'DCA level' },
      { price: roundPrice(entry3), percentage: 25, type: 'stop_limit', source: 'Support/Resistance' },
    ];

    const averageEntry = roundPrice(
      entries.reduce((sum, e) => sum + e.price * (e.percentage / 100), 0)
    );

    // Stop loss calculation (ATR-based or level-based)
    const atrStop = atr * 2;
    const levelStop = direction === 'long'
      ? (levels.support[1] || averageEntry * 0.93)
      : (levels.resistance[1] || averageEntry * 1.07);

    const stopDistance = Math.max(atrStop, Math.abs(averageEntry - levelStop));
    const stopPrice = direction === 'long'
      ? averageEntry - stopDistance
      : averageEntry + stopDistance;

    const stopPercentage = Math.abs((stopPrice - averageEntry) / averageEntry * 100);

    const stopLoss: TradePlanResult['stopLoss'] = {
      price: roundPrice(stopPrice),
      percentage: parseFloat(stopPercentage.toFixed(2)),
      reason: `ATR-based stop (${atr.toFixed(2)} ATR) + support/resistance level`,
      safetyAdjusted: false,
    };

    // Take profit levels (R:R based) - only 2 TPs at 1.5R and 2.5R
    const riskAmount = Math.abs(averageEntry - stopPrice);
    const safeRiskAmount = riskAmount === 0 ? currentPrice * 0.015 : riskAmount;
    const tp1Price = roundPrice(direction === 'long' ? averageEntry + safeRiskAmount * 1.5 : averageEntry - safeRiskAmount * 1.5);
    const tp2Price = roundPrice(direction === 'long' ? averageEntry + safeRiskAmount * 2.5 : averageEntry - safeRiskAmount * 2.5);
    const takeProfits: TradePlanResult['takeProfits'] = [
      {
        price: tp1Price,
        percentage: 50,
        reason: '1.5R - First take profit',
        source: '1.5R calculation',
        riskReward: parseFloat((Math.abs(tp1Price - averageEntry) / safeRiskAmount).toFixed(2)),
      },
      {
        price: tp2Price,
        percentage: 50,
        reason: '2.5R - Main target',
        source: '2.5R calculation',
        riskReward: parseFloat((Math.abs(tp2Price - averageEntry) / safeRiskAmount).toFixed(2)),
      },
    ];

    // Risk/Reward calculation (weighted average)
    const avgRR = takeProfits.reduce(
      (sum, tp) => sum + (Math.abs(tp.price - averageEntry) / safeRiskAmount) * (tp.percentage / 100),
      0
    );

    // Position sizing (2% risk rule)
    const riskPercent = 2;
    const riskAmountUsd = accountSize * (riskPercent / 100);
    const positionSizePercent = (riskAmountUsd / stopDistance) * averageEntry / accountSize * 100;

    // Win rate estimate — via RiskEngine (TASK 2.3)
    const winRateEstimate = estimateWinRate({
      direction,
      trendDirection: trend.direction,
      trendStrength:  trend.strength,
      confidence:     50, // preliminary confidence not available at this stage
      safetyScore:    5,  // default; integrated tradePlan overrides this
      tradeNow:       false,
      riskReward:     avgRR,
    });

    // Trailing stop
    const trailingStop: TradePlanResult['trailingStop'] = {
      activateAfter: 'When TP1 is reached',
      trailPercent: parseFloat((atr / averageEntry * 100).toFixed(2)),
    };

    // Score
    let score = 5;
    if (avgRR >= 2) score += 1;
    if (avgRR >= 3) score += 1;
    if (trend.strength >= 60) score += 1;
    if (winRateEstimate >= 60) score += 1;
    if (stopPercentage <= 5) score += 0.5;
    score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));

    // Gate evaluation
    const avgTargetPercent = takeProfits.reduce((sum, tp) => sum + Math.abs((tp.price - averageEntry) / averageEntry * 100) * (tp.percentage / 100), 0);
    const tradePlanGateInput: TradePlanGateEvaluationInput = {
      symbol,
      direction,
      riskRewardRatio: avgRR,
      winRateEstimate,
      positionSizePercent,
      stopLossPercent: stopPercentage,
      targetCount: takeProfits.length,
      averageTargetPercent: avgTargetPercent,
    };
    const tradePlanGateResult = await evaluateTradePlanGateWithRAG(tradePlanGateInput);

    return {
      symbol,
      direction,
      type: 'limit',
      entries,
      averageEntry,
      currentPrice,
      needsToWaitForEntry: false,
      entryDistancePercent: 0,
      entryStatus: 'immediate' as const,
      tradePlanStatus: 'valid' as const,
      tradePlanMessage: '',
      stopLoss,
      takeProfits,
      riskReward: parseFloat(avgRR.toFixed(2)),
      winRateEstimate,
      positionSizePercent: parseFloat(positionSizePercent.toFixed(2)),
      riskAmount: riskAmountUsd,
      trailingStop,
      score,
      // Legacy compatibility fields
      sources: {
        direction: ['4H Trend Analysis'],
        entries: ['Current price', 'DCA level', 'Support/Resistance'],
        stopLoss: ['ATR calculation'],
        targets: ['R:R calculation'],
      },
      confidence: trend.strength,
      gate: {
        canProceed: tradePlanGateResult.canProceed,
        reason: tradePlanGateResult.reason,
        confidence: tradePlanGateResult.confidence,
        planQuality: tradePlanGateResult.planQuality,
      },
    };
  },

  // =========================================
  // Step 6: Trap Check (5 credits)
  // =========================================
  async trapCheck(symbol: string, tradeType: TradeType = 'dayTrade'): Promise<TrapCheckResult> {
    const tf = getTimeframesForTradeType(tradeType);

    const [ticker, candlesPrimary, candlesSecondary] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, tf.primary, tf.candleCounts.primary),
      fetchKlines(symbol, tf.secondary, tf.candleCounts.secondary),
    ]);

    // Use trade-type appropriate timeframes
    const candles4h = candlesPrimary;
    const candles1h = candlesSecondary;

    const prices4h = candles4h.map((c) => c.close);
    const prices1h = candles1h.map((c) => c.close);
    const volumes1h = candles1h.map((c) => c.volume);

    const currentPrice = ticker.price;
    const levels = findSupportResistance(candles4h);

    // Guard against empty candle arrays (non-crypto assets may not have secondary timeframe data)
    if (prices1h.length === 0 || prices4h.length === 0) {
      return {
        score: 5,
        bullTrap: false,
        bearTrap: false,
        fakeBreakout: false,
        squeezeDetected: false,
        manipulationRisk: 'low' as const,
        warnings: ['Insufficient candle data for trap detection'],
        details: 'Trap check skipped due to insufficient data.',
        gate: { canProceed: true, reason: 'Trap check skipped - insufficient data', confidence: 50, urgency: 'medium' as const },
      };
    }

    // Recent price action analysis
    const recentHigh = Math.max(...prices1h.slice(-24));
    const recentLow = Math.min(...prices1h.slice(-24));
    const avgVolume = volumes1h.length > 0 ? volumes1h.reduce((a, b) => a + b, 0) / volumes1h.length : 0;
    const recentVolume = volumes1h.length >= 6 ? volumes1h.slice(-6).reduce((a, b) => a + b, 0) / 6 : avgVolume;

    // Bull trap detection
    const resistanceLevel = levels.resistance[0];
    const nearResistance = resistanceLevel !== undefined && currentPrice >= resistanceLevel * 0.98;
    const lowVolumeBreakout = recentVolume < avgVolume * 0.8;
    const bullTrap = nearResistance && lowVolumeBreakout && ticker.priceChangePercent24h > 3;
    const bullTrapZone = bullTrap ? resistanceLevel : undefined;

    // Bear trap detection
    const supportLevel = levels.support[0];
    const nearSupport = supportLevel !== undefined && currentPrice <= supportLevel * 1.02;
    const bearTrap = nearSupport && lowVolumeBreakout && ticker.priceChangePercent24h < -3;
    const bearTrapZone = bearTrap ? supportLevel : undefined;

    // Liquidity grab zones
    const liquidityGrabZones: number[] = [];
    if (levels.support[0]) liquidityGrabZones.push(roundPrice(levels.support[0] * 0.98));
    if (levels.resistance[0]) liquidityGrabZones.push(roundPrice(levels.resistance[0] * 1.02));

    // Stop hunt zones (just below support, just above resistance)
    const stopHuntZones: number[] = [];
    levels.support.forEach((s) => stopHuntZones.push(roundPrice(s * 0.97)));
    levels.resistance.forEach((r) => stopHuntZones.push(roundPrice(r * 1.03)));

    // Fakeout risk
    let fakeoutRisk: 'low' | 'medium' | 'high' = 'low';
    if (lowVolumeBreakout) fakeoutRisk = 'medium';
    if ((bullTrap || bearTrap) && Math.abs(ticker.priceChangePercent24h) > 5) {
      fakeoutRisk = 'high';
    }

    // Liquidation levels (ATR-based estimation)
    // Common leverage levels: 5x (20% move), 10x (10% move), 20x (5% move), 50x (2% move)
    const atr = calculateATR(candles4h);
    const atrPercent = (atr / currentPrice) * 100;
    const leverageLevels = [
      { leverage: 50, distance: 0.02, volumeFactor: 0.05 },
      { leverage: 20, distance: 0.05, volumeFactor: 0.10 },
      { leverage: 10, distance: 0.10, volumeFactor: 0.15 },
      { leverage: 5, distance: 0.20, volumeFactor: 0.20 },
    ];

    const longLiquidations: TrapCheckResult['liquidationLevels'] = leverageLevels
      .filter(l => l.distance * 100 <= atrPercent * 3) // Only show levels within 3x ATR
      .map(l => ({
        price: roundPrice(currentPrice * (1 - l.distance)),
        amountUsd: ticker.quoteVolume24h * l.volumeFactor,
        type: 'longs' as const,
      }));

    const shortLiquidations: TrapCheckResult['liquidationLevels'] = leverageLevels
      .filter(l => l.distance * 100 <= atrPercent * 3)
      .map(l => ({
        price: roundPrice(currentPrice * (1 + l.distance)),
        amountUsd: ticker.quoteVolume24h * l.volumeFactor * 0.8,
        type: 'shorts' as const,
      }));

    // Open Interest Delta
    const openInterest = ticker.openInterest ?? 0;
    const previousOI = ticker.previousOpenInterest ?? null;
    const oiDelta = calculateOIDelta(openInterest, previousOI);

    // Counter strategies
    const counterStrategy: string[] = [];
    if (bullTrap) {
      counterStrategy.push('Wait for volume confirmation after breakout');
      counterStrategy.push('Do not place stop-loss orders right above resistance');
    }
    if (bearTrap) {
      counterStrategy.push('Do not panic sell');
      counterStrategy.push('Do not place short-term stops below support');
    }
    if (fakeoutRisk !== 'low') {
      counterStrategy.push('Scale into position gradually');
      counterStrategy.push('Wait for confirmation candle');
    }
    counterStrategy.push('Be cautious around liquidity zones');

    // Pro tip
    let proTip = 'Do not trust breakouts without volume confirmation.';
    if (bullTrap) {
      proTip = 'Resistance breakouts with low volume have high bull trap probability.';
    } else if (bearTrap) {
      proTip = 'Support breakdowns often occur with panic selling and frequently form bear traps.';
    }

    // Risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (bullTrap || bearTrap) riskLevel = 'high';
    else if (fakeoutRisk === 'medium') riskLevel = 'medium';

    // Score (inverse of trap risk)
    let score = 8;
    if (bullTrap) score -= 3;
    if (bearTrap) score -= 3;
    if (fakeoutRisk === 'medium') score -= 1;
    if (fakeoutRisk === 'high') score -= 2;
    if (lowVolumeBreakout) score -= 1;
    score = Math.max(1, Math.min(10, score));

    // Gate evaluation
    const trapGateInput: TrapGateEvaluationInput = {
      symbol,
      bullTrap,
      bearTrap,
      liquidityGrabDetected: liquidityGrabZones.length > 0,
      stopHuntZonesCount: stopHuntZones.length,
      fakeoutRisk,
      liquidationLevelsNearby: longLiquidations.length + shortLiquidations.length,
      riskLevel,
    };
    const trapGateResult = await evaluateTrapGateWithRAG(trapGateInput);

    return {
      symbol,
      traps: {
        bullTrap,
        bullTrapZone,
        bearTrap,
        bearTrapZone,
        liquidityGrab: {
          detected: liquidityGrabZones.length > 0,
          zones: liquidityGrabZones,
        },
        stopHuntZones: stopHuntZones.slice(0, 4),
        fakeoutRisk,
      },
      liquidationLevels: [...longLiquidations, ...shortLiquidations],
      counterStrategy,
      proTip,
      riskLevel,
      score,
      gate: {
        canProceed: trapGateResult.canProceed,
        reason: trapGateResult.reason,
        confidence: trapGateResult.confidence,
        trapRisk: trapGateResult.trapRisk,
      },
    };
  },

  // =========================================
  // Step 6: Preliminary Verdict (NEW - decides BEFORE trade plan)
  // =========================================
  preliminaryVerdict(
    symbol: string,
    steps: {
      marketPulse: MarketPulseResult;
      assetScan: AssetScanResult;
      safetyCheck: SafetyCheckResult;
      timing: TimingResult;
      trapCheck: TrapCheckResult;
    }
  ): PreliminaryVerdictResult {
    const { marketPulse, assetScan, safetyCheck, timing, trapCheck } = steps;

    // Collect reasons for decision
    const reasons: PreliminaryVerdictResult['reasons'] = [];

    // ===== AGGRESSIVE DIRECTION DETERMINATION =====
    // Use ALL available data sources with lower thresholds for EARLY ENTRY
    const directionSources: PreliminaryVerdictResult['directionSources'] = [];

    // 1. Asset Scanner Daily Trend (10% weight) - lowered threshold to 30%
    const dailyTrend = assetScan.timeframes?.find(t => t.tf === '1D');
    if (dailyTrend && dailyTrend.strength >= 30) {
      directionSources.push({
        source: 'Asset Scanner (Daily)',
        direction: dailyTrend.trend === 'bearish' ? 'short' : 'long',
        weight: 0.10,
        reason: `Daily trend ${dailyTrend.trend} with ${dailyTrend.strength}% strength`
      });
    }

    // 2. Asset Scanner 4H Trend (10% weight) - lowered threshold to 30%
    const h4Trend = assetScan.timeframes?.find(t => t.tf === '4H');
    if (h4Trend && h4Trend.strength >= 30) {
      directionSources.push({
        source: 'Asset Scanner (4H)',
        direction: h4Trend.trend === 'bearish' ? 'short' : 'long',
        weight: 0.10,
        reason: `4H trend ${h4Trend.trend} with ${h4Trend.strength}% strength`
      });
    }

    // 3. Asset Scanner 1H Trend (15% weight) - NEW: short-term for early signals
    const h1Trend = (assetScan.timeframes ?? []).find(t => t.tf === '1H');
    if (h1Trend && h1Trend.strength >= 25) {
      directionSources.push({
        source: 'Asset Scanner (1H)',
        direction: h1Trend.trend === 'bearish' ? 'short' : 'long',
        weight: 0.15,
        reason: `1H trend ${h1Trend.trend} with ${h1Trend.strength}% strength`
      });
    }

    // 4. Market Pulse Regime (15% weight) - always include
    if (marketPulse.marketRegime !== 'neutral') {
      directionSources.push({
        source: 'Market Pulse',
        direction: marketPulse.marketRegime === 'risk_on' ? 'long' : 'short',
        weight: 0.15,
        reason: `Market regime is ${marketPulse.marketRegime}`
      });
    }

    // 5. Market Pulse Trend (10% weight) - lowered threshold to 30%
    if (marketPulse.trend.direction !== 'neutral' && marketPulse.trend.strength >= 30) {
      directionSources.push({
        source: 'Market Pulse Trend',
        direction: marketPulse.trend.direction === 'bearish' ? 'short' : 'long',
        weight: 0.1,
        reason: `Market trend ${marketPulse.trend.direction}`
      });
    }

    // 6. Timing TradeNow Signal (10% weight) - Use timing readiness
    if (timing.tradeNow && timing.score >= 6) {
      // When timing says trade now with good score, follow market trend direction
      const timingDirection = marketPulse.trend.direction === 'bearish' ? 'short' : 'long';
      directionSources.push({
        source: 'Timing Ready',
        direction: timingDirection,
        weight: 0.10,
        reason: `Timing score ${timing.score}/10, conditions met for entry`
      });
    }

    // 7. Leading Indicators Signal from Asset Scanner (20% weight) - CRITICAL: Uses 40+ indicators
    if (assetScan.indicatorDetails?.summary) {
      const summary = assetScan.indicatorDetails.summary;
      const signal = summary.leadingIndicatorsSignal || summary.overallSignal;
      const confidence = summary.signalConfidence || 50;

      if (signal && signal !== 'neutral' && confidence >= 40) {
        directionSources.push({
          source: 'Leading Indicators (Asset)',
          direction: signal === 'bullish' ? 'long' : 'short',
          weight: 0.20,
          reason: `${summary.bullishIndicators} bullish vs ${summary.bearishIndicators} bearish (${confidence}% confidence)`
        });
      }
    }

    // 8. Leading Indicators Signal from Safety Check (15% weight) - Volume & Advanced indicators
    if (safetyCheck.indicatorDetails?.summary) {
      const summary = safetyCheck.indicatorDetails.summary;
      const signal = summary.leadingIndicatorsSignal || summary.overallSignal;
      const confidence = summary.signalConfidence || 50;

      if (signal && signal !== 'neutral' && confidence >= 40) {
        directionSources.push({
          source: 'Leading Indicators (Safety)',
          direction: signal === 'bullish' ? 'long' : 'short',
          weight: 0.15,
          reason: `Volume/Advanced indicators: ${signal} (${confidence}% confidence)`
        });
      }
    }

    // 9. Whale Activity Bias (10% weight) - Smart money positioning
    if (safetyCheck.whaleActivity?.bias && safetyCheck.whaleActivity.bias !== 'neutral') {
      directionSources.push({
        source: 'Whale Activity',
        direction: safetyCheck.whaleActivity.bias === 'accumulation' ? 'long' : 'short',
        weight: 0.10,
        reason: `Smart money ${safetyCheck.whaleActivity.bias}`
      });
    }

    // 10. Order Flow Imbalance (10% weight) - Real-time buy/sell pressure
    if (safetyCheck.whaleActivity?.orderFlowBias && safetyCheck.whaleActivity.orderFlowBias !== 'neutral') {
      const imbalance = Math.abs(safetyCheck.whaleActivity.orderFlowImbalance || 0);
      if (imbalance >= 0.1) { // At least 10% imbalance
        directionSources.push({
          source: 'Order Flow',
          direction: safetyCheck.whaleActivity.orderFlowBias === 'buying' ? 'long' : 'short',
          weight: 0.10,
          reason: `Order flow ${(imbalance * 100).toFixed(0)}% ${safetyCheck.whaleActivity.orderFlowBias}`
        });
      }
    }

    // 11. Asset-Specific Context (25% weight for non-crypto) - Uses specialized analyzers
    // For metals: DXY, Real Yields, VIX | For stocks: VIX, Breadth, Sectors | For bonds: Yield Curve, Fed
    if (assetScan.assetContext?.metrics) {
      const ctx = assetScan.assetContext;
      const metrics = ctx.metrics;

      // Use asset-specific sentiment as primary direction signal
      if (metrics.sentiment !== 'neutral') {
        directionSources.push({
          source: `${(ctx.assetClass || 'Asset').charAt(0).toUpperCase() + (ctx.assetClass || 'Asset').slice(1)} Analysis`,
          direction: metrics.sentiment === 'bullish' ? 'long' : 'short',
          weight: 0.25, // High weight for non-crypto assets
          reason: `${ctx.assetClass} sentiment: ${metrics.sentiment} (${metrics.sentimentScore}/100)`
        });
      }

      // Add key drivers as reasons
      for (const driver of metrics.keyDrivers.slice(0, 3)) {
        const isPositive = metrics.sentiment === 'bullish' ||
                          (metrics.sentiment === 'neutral' && metrics.sentimentScore >= 50);
        reasons.push({
          factor: driver,
          positive: isPositive,
          impact: 'high',
          source: `${(ctx.assetClass || 'Asset').charAt(0).toUpperCase() + (ctx.assetClass || 'Asset').slice(1)} Driver`
        });
      }

      // Add inter-market regime context
      if (ctx.interMarketContext) {
        const imc = ctx.interMarketContext;
        if (imc.regimeConfidence >= 50) {
          reasons.push({
            factor: `Market regime: ${imc.regime.replace('_', ' ')} (${imc.regimeConfidence}% confidence)`,
            positive: true,
            impact: 'medium',
            source: 'Inter-Market Context'
          });
        }

        // Add anomaly warnings
        for (const anomaly of imc.anomalies) {
          reasons.push({
            factor: anomaly,
            positive: false,
            impact: 'high',
            source: 'Inter-Market Anomaly'
          });
        }
      }

      // Add asset-specific warnings
      for (const warning of ctx.warnings) {
        reasons.push({
          factor: warning,
          positive: false,
          impact: 'medium',
          source: `${(ctx.assetClass || 'Asset').charAt(0).toUpperCase() + (ctx.assetClass || 'asset').slice(1)} Warning`
        });
      }
    }

    // Calculate weighted direction
    let longWeight = 0;
    let shortWeight = 0;
    directionSources.forEach(ds => {
      if (ds.direction === 'long') longWeight += ds.weight;
      else shortWeight += ds.weight;
    });

    // AGGRESSIVE Direction decision - lowered threshold from 0.5 to 0.25
    let direction: 'long' | 'short' | null = null;
    let directionConfidence = 0;
    const totalWeight = longWeight + shortWeight;

    if (totalWeight > 0) {
      if (longWeight > shortWeight && longWeight >= 0.25) {
        direction = 'long';
        directionConfidence = (longWeight / totalWeight) * 100;
      } else if (shortWeight > longWeight && shortWeight >= 0.25) {
        direction = 'short';
        directionConfidence = (shortWeight / totalWeight) * 100;
      } else if (longWeight >= shortWeight) {
        // Even with low weight, if we have ANY signal, use it
        direction = 'long';
        directionConfidence = totalWeight > 0 ? (longWeight / totalWeight) * 100 : 50;
      } else {
        direction = 'short';
        directionConfidence = totalWeight > 0 ? (shortWeight / totalWeight) * 100 : 50;
      }
    }

    // Fallback: If still no direction but we have good scores, use market trend
    if (direction === null && marketPulse.trend.direction !== 'neutral') {
      direction = marketPulse.trend.direction === 'bullish' ? 'long' : 'short';
      directionConfidence = 40; // Base confidence for fallback
    }

    // ===== SCORE CALCULATION (without trade plan) =====
    // Weights: Market Pulse 20%, Asset Scanner 25%, Safety 25%, Timing 15%, Trap 15%
    let score = parseFloat((
      marketPulse.score * 0.20 +
      assetScan.score * 0.25 +
      safetyCheck.score * 0.25 +
      timing.score * 0.15 +
      trapCheck.score * 0.15
    ).toFixed(1));

    // ===== COLLECT REASONS =====

    // Market Pulse reasons
    if (marketPulse.marketRegime === 'risk_on') {
      reasons.push({ factor: 'Risk-on market environment', positive: true, impact: 'high', source: 'Market Pulse' });
    } else if (marketPulse.marketRegime === 'risk_off') {
      reasons.push({ factor: 'Risk-off market environment', positive: false, impact: 'high', source: 'Market Pulse' });
    }

    // Asset Scanner reasons
    if (dailyTrend && dailyTrend.strength >= 70) {
      reasons.push({ factor: `Strong ${dailyTrend.trend} daily trend`, positive: dailyTrend.trend !== 'bearish' || direction === 'short', impact: 'high', source: 'Asset Scanner' });
    }
    if (assetScan.indicators.rsi > 70) {
      reasons.push({ factor: 'Overbought (RSI > 70)', positive: false, impact: 'medium', source: 'Asset Scanner' });
    } else if (assetScan.indicators.rsi < 30) {
      reasons.push({ factor: 'Oversold (RSI < 30)', positive: direction === 'long', impact: 'medium', source: 'Asset Scanner' });
    }

    // Safety Check reasons
    if (safetyCheck.riskLevel === 'low') {
      reasons.push({ factor: 'Low manipulation risk', positive: true, impact: 'high', source: 'Safety Check' });
    } else if (safetyCheck.riskLevel === 'high') {
      reasons.push({ factor: 'High manipulation risk', positive: false, impact: 'high', source: 'Safety Check' });
    }
    if (safetyCheck.manipulation.pumpDumpRisk === 'high') {
      reasons.push({ factor: 'High pump & dump risk', positive: false, impact: 'high', source: 'Safety Check' });
    }

    // NEW: Tokenomics risk assessment (from Asset Scanner)
    if (assetScan.tokenomics) {
      const tokenomics = assetScan.tokenomics;
      const tokenomicsRiskFactor = calculateTokenomicsRiskFactor(tokenomics);

      // Add tokenomics-specific reasons
      if (tokenomics.assessment.overallScore >= 70) {
        reasons.push({ factor: `Strong tokenomics (score: ${tokenomics.assessment.overallScore}/100)`, positive: true, impact: 'medium', source: 'Tokenomics' });
      } else if (tokenomics.assessment.overallScore < 40) {
        reasons.push({ factor: `Weak tokenomics (score: ${tokenomics.assessment.overallScore}/100)`, positive: false, impact: 'high', source: 'Tokenomics' });
      }

      if (tokenomics.market.dilutionRisk === 'high') {
        reasons.push({ factor: 'High dilution risk (low MC/FDV ratio)', positive: false, impact: 'medium', source: 'Tokenomics' });
      }

      if (tokenomics.whaleConcentration.concentrationRisk === 'high') {
        reasons.push({ factor: 'High whale concentration', positive: false, impact: 'medium', source: 'Tokenomics' });
      }

      if (tokenomics.supply.inflationRisk === 'high') {
        reasons.push({ factor: `High inflation risk (only ${tokenomics.supply.circulatingPercent?.toFixed(0) || '?'}% circulating)`, positive: false, impact: 'medium', source: 'Tokenomics' });
      }

      // Adjust confidence based on tokenomics risk
      if (tokenomicsRiskFactor > 0.5) {
        directionConfidence = Math.max(30, directionConfidence * (1 - tokenomicsRiskFactor * 0.3));
      }
    }

    // Timing reasons
    if (timing.tradeNow) {
      reasons.push({ factor: 'Good entry timing', positive: true, impact: 'medium', source: 'Timing' });
    } else if (timing.waitFor) {
      reasons.push({ factor: `Wait for: ${timing.waitFor.event}`, positive: false, impact: 'medium', source: 'Timing' });
    }

    // Trap Check reasons
    if (trapCheck.traps.bullTrap) {
      reasons.push({ factor: 'Bull trap detected', positive: false, impact: 'high', source: 'Trap Check' });
    }
    if (trapCheck.traps.bearTrap) {
      reasons.push({ factor: 'Bear trap detected', positive: false, impact: 'high', source: 'Trap Check' });
    }
    if (trapCheck.riskLevel === 'high') {
      reasons.push({ factor: 'High trap risk', positive: false, impact: 'high', source: 'Trap Check' });
    }

    // ===== GATE-BASED EVALUATION =====
    // Sequential gate approach: each step must pass before proceeding
    const gateResults = {
      marketPulse: marketPulse.gate,
      assetScan: assetScan.gate,
      safetyCheck: safetyCheck.gate,
      timing: timing.gate,
      trapCheck: trapCheck.gate,
    };

    // Count gates that passed
    const gatesPassed = [
      gateResults.marketPulse.canProceed,
      gateResults.assetScan.canProceed,
      gateResults.safetyCheck.canProceed,
      gateResults.timing.canProceed,
      gateResults.trapCheck.canProceed,
    ].filter(Boolean).length;

    // Calculate average gate confidence
    const avgGateConfidence = (
      gateResults.marketPulse.confidence +
      gateResults.assetScan.confidence +
      gateResults.safetyCheck.confidence +
      gateResults.timing.confidence +
      gateResults.trapCheck.confidence
    ) / 5;

    // Add gate reasons to the reasons list
    if (!gateResults.marketPulse.canProceed) {
      reasons.push({ factor: `Market Pulse gate: ${gateResults.marketPulse.reason}`, positive: false, impact: 'high', source: 'Market Pulse Gate' });
    }
    if (!gateResults.assetScan.canProceed) {
      reasons.push({ factor: `Asset Scanner gate: ${gateResults.assetScan.reason}`, positive: false, impact: 'high', source: 'Asset Scanner Gate' });
    }
    if (!gateResults.safetyCheck.canProceed) {
      reasons.push({ factor: `Safety gate: ${gateResults.safetyCheck.reason}`, positive: false, impact: 'high', source: 'Safety Check Gate' });
    }
    if (!gateResults.timing.canProceed) {
      reasons.push({ factor: `Timing gate: ${gateResults.timing.reason}`, positive: false, impact: 'medium', source: 'Timing Gate' });
    }
    if (!gateResults.trapCheck.canProceed) {
      reasons.push({ factor: `Trap gate: ${gateResults.trapCheck.reason}`, positive: false, impact: 'high', source: 'Trap Check Gate' });
    }

    // Use Asset Scanner direction recommendation if available
    if (assetScan.direction && assetScan.directionConfidence > 50) {
      directionSources.push({
        source: 'Asset Scanner Gate',
        direction: assetScan.direction,
        weight: 0.15,
        reason: `RAG-based direction with ${assetScan.directionConfidence}% confidence`
      });
    }

    // ===== VERDICT DETERMINATION =====
    let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
    let shouldGenerateTradePlan = false;

    // ===== MACRO PENALTY =====
    // Economic events reduce score but never auto-force verdict to 'avoid'.
    // High-impact event (±4h): -2 penalty | FOMC day: -3 penalty
    const macroPenalty = marketPulse.economicCalendar?.macroPenalty ?? 0;
    if (macroPenalty < 0) {
      const penaltyReason = marketPulse.economicCalendar?.penaltyReason ?? 'Economic event imminent';
      reasons.unshift({
        factor: `⚠️ MACRO PENALTY (${macroPenalty}): ${penaltyReason}`,
        positive: false,
        impact: 'high' as const,
        source: 'Economic Calendar',
      });
      score = Math.max(0, score + macroPenalty);
    }

    // AVOID conditions (highest priority) - includes gate failures
    const criticalGatesFailed = !gateResults.safetyCheck.canProceed || !gateResults.trapCheck.canProceed;
    if (safetyCheck.riskLevel === 'high' ||
        safetyCheck.manipulation.pumpDumpRisk === 'high' ||
        (trapCheck.riskLevel === 'high' && (trapCheck.traps.bullTrap || trapCheck.traps.bearTrap)) ||
        (criticalGatesFailed && avgGateConfidence < 30)) {
      verdict = 'avoid';
      direction = null;
      shouldGenerateTradePlan = false;
    }
    // ===== EARLY ENTRY LOGIC =====
    // Strong components override low direction confidence
    // When all indicators are strong, we should act early - not wait for confirmation
    const allComponentsStrong = marketPulse.score >= 7.0 &&
                                 assetScan.score >= 7.0 &&
                                 safetyCheck.score >= 7.0 &&
                                 trapCheck.score >= 7.0;

    // Gate-based strength check
    const allGatesPassed = gatesPassed === 5;
    const mostGatesPassed = gatesPassed >= 4;
    const highGateConfidence = avgGateConfidence >= 60;

    const veryStrongScore = score >= 7.5;
    const strongScore = score >= 6.5;

    // GO conditions - GATE-ENHANCED: Use RAG gate results for intelligent decisions
    // Priority 0: All gates passed with high confidence = GO (new gate-first approach)
    if (allGatesPassed &&
        highGateConfidence &&
        direction !== null &&
        safetyCheck.riskLevel !== 'high') {
      verdict = 'go';
      shouldGenerateTradePlan = true;
    }
    // Priority 1: Very strong score with strong components = GO regardless of direction confidence
    else if (veryStrongScore &&
        allComponentsStrong &&
        mostGatesPassed &&
        safetyCheck.riskLevel !== 'high' &&
        trapCheck.riskLevel !== 'high') {
      verdict = 'go';
      shouldGenerateTradePlan = true;
      // If direction is null but score is very high, infer from market pulse
      if (direction === null) {
        direction = marketPulse.trend.direction === 'bullish' ? 'long' :
                   marketPulse.trend.direction === 'bearish' ? 'short' : 'long';
      }
    }
    // Priority 2: Strong score with direction and most gates passed
    else if (score >= 7.0 &&
             direction !== null &&
             directionConfidence >= 40 &&
             mostGatesPassed &&
             safetyCheck.riskLevel !== 'high' &&
             trapCheck.riskLevel !== 'high') {
      verdict = 'go';
      shouldGenerateTradePlan = true;
    }
    // Priority 3: Good score with any direction signal and gates mostly passing
    else if (strongScore &&
             direction !== null &&
             directionConfidence >= 30 &&
             gatesPassed >= 3 &&
             safetyCheck.riskLevel !== 'high') {
      verdict = 'conditional_go';
      shouldGenerateTradePlan = true;
    }
    // Priority 4: Moderate score but clear direction (gates may be mixed)
    else if (score >= 5.5 &&
             direction !== null &&
             directionConfidence >= 40 &&
             gatesPassed >= 2) {
      verdict = 'conditional_go';
      shouldGenerateTradePlan = true;
    }
    // WAIT only when score is truly low, safety is compromised, or most gates failed
    else if (score < 5.0 || safetyCheck.riskLevel === 'high' || gatesPassed < 2) {
      verdict = 'wait';
      shouldGenerateTradePlan = false;
    }
    // Default: If we have decent score and some gates passed, give conditional go
    else if (score >= 5.0 && gatesPassed >= 2) {
      verdict = 'conditional_go';
      shouldGenerateTradePlan = true;
      if (direction === null) {
        direction = marketPulse.trend.direction === 'bullish' ? 'long' :
                   marketPulse.trend.direction === 'bearish' ? 'short' : 'long';
      }
    }

    // Final confidence calculation - now factors in gate confidence
    const gateConfidenceBonus = (avgGateConfidence - 50) / 100; // -0.5 to +0.5
    const confidence = direction !== null
      ? parseFloat((directionConfidence * (score / 10) * (1 + gateConfidenceBonus)).toFixed(1))
      : 0;

    return {
      verdict,
      direction,
      confidence,
      score,
      reasons,
      shouldGenerateTradePlan,
      directionSources
    };
  },

  // =========================================
  // Step 7: Integrated Trade Plan (only if GO/CONDITIONAL_GO)
  // Uses ALL previous step data for intelligent decisions
  // =========================================
  async integratedTradePlan(
    symbol: string,
    preliminaryVerdict: PreliminaryVerdictResult,
    steps: {
      marketPulse: MarketPulseResult;
      assetScan: AssetScanResult;
      safetyCheck: SafetyCheckResult;
      timing: TimingResult;
      trapCheck: TrapCheckResult;
    },
    accountSize: number = 10000
  ): Promise<TradePlanResult | null> {
    // Don't generate trade plan if not GO/CONDITIONAL_GO
    if (!preliminaryVerdict.shouldGenerateTradePlan || !preliminaryVerdict.direction) {
      return null;
    }

    const { marketPulse, assetScan, safetyCheck, timing, trapCheck } = steps;
    const direction = preliminaryVerdict.direction;
    const currentPrice = assetScan.currentPrice;

    // Track sources for transparency
    const sources: TradePlanResult['sources'] = {
      direction: preliminaryVerdict.directionSources.map(ds => ds.source),
      entries: [],
      stopLoss: [],
      targets: []
    };

    // ===== ENTRY / SL / TP TRADE PLAN =====
    // Rules:
    // LONG: Price near support → Entry = current price, SL = support - 1 ATR, TP1 = nearest resistance, TP2 = further resistance
    // SHORT: Price near resistance → Entry = current price, SL = resistance + 1 ATR, TP1 = nearest support, TP2 = further support
    // No pullback waiting - enter at current price immediately
    const entries: TradePlanResult['entries'] = [];

    // Filter levels >10% from current price (historical levels not actionable)
    const MAX_LEVEL_DISTANCE_PERCENT = 10;
    const levelWithinRange = (level: number | undefined): number | undefined => {
      if (level === undefined) return undefined;
      return Math.abs((level - currentPrice) / currentPrice * 100) <= MAX_LEVEL_DISTANCE_PERCENT ? level : undefined;
    };

    // Sort levels by proximity to current price (nearest first)
    const sortedSupports = assetScan.levels.support
      .map(s => levelWithinRange(s))
      .filter((s): s is number => s !== undefined)
      .sort((a, b) => b - a); // descending: nearest (highest) support first

    const sortedResistances = assetScan.levels.resistance
      .map(r => levelWithinRange(r))
      .filter((r): r is number => r !== undefined)
      .sort((a, b) => a - b); // ascending: nearest (lowest) resistance first

    const nearestSupport = sortedSupports[0];
    const furtherSupport = sortedSupports[1];
    const nearestResistance = sortedResistances[0];
    const furtherResistance = sortedResistances[1];
    const atr = assetScan.indicators.atr || currentPrice * 0.02;

    // ===== ENTRY: Always at current price (no pullback waiting) =====
    entries.push({
      price: roundPrice(currentPrice),
      percentage: 100,
      type: 'limit',
      source: direction === 'long'
        ? `Current price${nearestSupport ? ` near support $${nearestSupport.toFixed(2)}` : ''}`
        : `Current price${nearestResistance ? ` near resistance $${nearestResistance.toFixed(2)}` : ''}`
    });
    sources.entries.push(direction === 'long' ? 'Near support' : 'Near resistance');

    const averageEntry = roundPrice(currentPrice);

    // Entry validation: price must be near the correct level (within 1 ATR)
    // LONG: price should be near support (lower half of S/R range)
    // SHORT: price should be near resistance (upper half of S/R range)
    // If price is in the middle → WAIT, don't enter
    const isNearLevel = (price: number, level: number) => Math.abs(price - level) <= atr;

    let entryDistancePercent = 0;
    let needsToWaitForEntry = false;
    let entryStatus: 'immediate' | 'wait_for_pullback' | 'wait_for_rally' = 'immediate';

    if (nearestSupport && nearestResistance) {
      const range = nearestResistance - nearestSupport;
      const midpoint = nearestSupport + range / 2;

      if (direction === 'long') {
        if (currentPrice > midpoint && !isNearLevel(currentPrice, nearestSupport)) {
          // Price in upper half and not near support → wait for pullback to support
          needsToWaitForEntry = true;
          entryStatus = 'wait_for_pullback';
          entryDistancePercent = parseFloat(((currentPrice - nearestSupport) / currentPrice * 100).toFixed(2));
        }
      } else {
        if (currentPrice < midpoint && !isNearLevel(currentPrice, nearestResistance)) {
          // Price in lower half and not near resistance → wait for rally to resistance
          needsToWaitForEntry = true;
          entryStatus = 'wait_for_rally';
          entryDistancePercent = parseFloat(((nearestResistance - currentPrice) / currentPrice * 100).toFixed(2));
        }
      }
    }

    // ===== STOP LOSS: Key level ± 1 ATR =====
    // LONG: SL = nearest support - 1 ATR (below support)
    // SHORT: SL = nearest resistance + 1 ATR (above resistance)
    let stopPrice: number;
    let safetyAdjusted = false;

    if (direction === 'long') {
      // SL below nearest support - 1 ATR
      const slReference = nearestSupport ?? currentPrice;
      stopPrice = slReference - atr;
      sources.stopLoss.push(nearestSupport
        ? `Below support $${nearestSupport.toFixed(2)} - 1 ATR ($${atr.toFixed(2)})`
        : `Below current price - 1 ATR`);

      // Trap zone adjustment - don't place stop inside trap zones
      if (trapCheck.traps.stopHuntZones.length > 0) {
        const nearestStopHunt = trapCheck.traps.stopHuntZones.find(z => z < averageEntry && z > stopPrice);
        if (nearestStopHunt) {
          stopPrice = nearestStopHunt - (atr * 0.5);
          safetyAdjusted = true;
          sources.stopLoss.push('Adjusted below stop hunt zone');
        }
      }
    } else {
      // SL above nearest resistance + 1 ATR
      const slReference = nearestResistance ?? currentPrice;
      stopPrice = slReference + atr;
      sources.stopLoss.push(nearestResistance
        ? `Above resistance $${nearestResistance.toFixed(2)} + 1 ATR ($${atr.toFixed(2)})`
        : `Above current price + 1 ATR`);

      // Trap zone adjustment
      if (trapCheck.traps.stopHuntZones.length > 0) {
        const nearestStopHunt = trapCheck.traps.stopHuntZones.find(z => z > averageEntry && z < stopPrice);
        if (nearestStopHunt) {
          stopPrice = nearestStopHunt + (atr * 0.5);
          safetyAdjusted = true;
          sources.stopLoss.push('Adjusted above stop hunt zone');
        }
      }
    }

    // Enforce minimum 1.5% and maximum 10% stop distance
    const minStopPct = 1.5;
    const maxStopPct = 10;
    if (direction === 'long') {
      if (averageEntry - stopPrice < averageEntry * minStopPct / 100) {
        stopPrice = roundPrice(averageEntry * (1 - minStopPct / 100));
        sources.stopLoss.push(`Minimum ${minStopPct}% stop distance applied`);
      }
      if (averageEntry - stopPrice > averageEntry * maxStopPct / 100) {
        stopPrice = roundPrice(averageEntry * (1 - maxStopPct / 100));
        sources.stopLoss.push(`Maximum ${maxStopPct}% stop distance applied`);
      }
    } else {
      if (stopPrice - averageEntry < averageEntry * minStopPct / 100) {
        stopPrice = roundPrice(averageEntry * (1 + minStopPct / 100));
        sources.stopLoss.push(`Minimum ${minStopPct}% stop distance applied`);
      }
      if (stopPrice - averageEntry > averageEntry * maxStopPct / 100) {
        stopPrice = roundPrice(averageEntry * (1 + maxStopPct / 100));
        sources.stopLoss.push(`Maximum ${maxStopPct}% stop distance applied`);
      }
    }

    stopPrice = roundPrice(stopPrice);
    const stopPercentage = Math.abs((stopPrice - averageEntry) / averageEntry * 100);

    // ===== TAKE PROFIT: Opposite S/R levels =====
    // LONG: TP1 = nearest resistance, TP2 = further resistance (with 2R/3R fallback)
    // SHORT: TP1 = nearest support, TP2 = further support (with 2R/3R fallback)
    const takeProfits: TradePlanResult['takeProfits'] = [];
    const riskAmount = Math.abs(averageEntry - stopPrice);
    const safeRiskAmount = riskAmount === 0 ? currentPrice * 0.015 : riskAmount;

    // Helper: calculate individual TP R:R
    const calcTPRR = (tpPrice: number): number =>
      parseFloat((Math.abs(tpPrice - averageEntry) / safeRiskAmount).toFixed(2));

    if (direction === 'long') {
      // TP1: nearest resistance or 2R fallback (60% of position)
      // ENFORCE: TP1 must be at least 1R from entry (never risk more than you gain on 60% of position)
      let tp1Price: number;
      let tp1Reason: string;
      let tp1Source: string;

      if (nearestResistance && nearestResistance > averageEntry) {
        const tp1RR = (nearestResistance - averageEntry) / safeRiskAmount;
        if (tp1RR >= 1.0) {
          tp1Price = nearestResistance;
          tp1Reason = 'Nearest resistance';
          tp1Source = 'Resistance level';
        } else {
          // S/R level too close (< 1R), use 2R fallback
          tp1Price = averageEntry + safeRiskAmount * 2;
          tp1Reason = `2R target (resistance at ${roundPrice(nearestResistance)} only ${tp1RR.toFixed(1)}R)`;
          tp1Source = '2R calculation (min 1R enforced)';
        }
      } else {
        tp1Price = averageEntry + safeRiskAmount * 2;
        tp1Reason = '2R target';
        tp1Source = '2R calculation';
      }
      tp1Price = roundPrice(tp1Price);
      takeProfits.push({
        price: tp1Price, percentage: 60,
        reason: tp1Reason, source: tp1Source,
        riskReward: calcTPRR(tp1Price),
      });
      sources.targets.push(tp1Source);

      // TP2: further resistance or 3R fallback (40% of position)
      let tp2Price: number;
      let tp2Reason: string;
      let tp2Source: string;

      if (furtherResistance && furtherResistance > tp1Price) {
        tp2Price = furtherResistance;
        tp2Reason = 'Further resistance';
        tp2Source = 'Resistance level';
      } else {
        tp2Price = averageEntry + safeRiskAmount * 3;
        tp2Reason = '3R target';
        tp2Source = '3R calculation';
      }
      tp2Price = roundPrice(Math.max(tp2Price, tp1Price + atr * 0.5));
      takeProfits.push({
        price: tp2Price, percentage: 40,
        reason: tp2Reason, source: tp2Source,
        riskReward: calcTPRR(tp2Price),
      });
      sources.targets.push(tp2Source);
    } else {
      // TP1: nearest support or 2R fallback (60% of position)
      // ENFORCE: TP1 must be at least 1R from entry
      let tp1Price: number;
      let tp1Reason: string;
      let tp1Source: string;

      if (nearestSupport && nearestSupport < averageEntry) {
        const tp1RR = (averageEntry - nearestSupport) / safeRiskAmount;
        if (tp1RR >= 1.0) {
          tp1Price = nearestSupport;
          tp1Reason = 'Nearest support';
          tp1Source = 'Support level';
        } else {
          // S/R level too close (< 1R), use 2R fallback
          tp1Price = averageEntry - safeRiskAmount * 2;
          tp1Reason = `2R target (support at ${roundPrice(nearestSupport)} only ${tp1RR.toFixed(1)}R)`;
          tp1Source = '2R calculation (min 1R enforced)';
        }
      } else {
        tp1Price = averageEntry - safeRiskAmount * 2;
        tp1Reason = '2R target';
        tp1Source = '2R calculation';
      }
      tp1Price = roundPrice(tp1Price);
      takeProfits.push({
        price: tp1Price, percentage: 60,
        reason: tp1Reason, source: tp1Source,
        riskReward: calcTPRR(tp1Price),
      });
      sources.targets.push(tp1Source);

      // TP2: further support or 3R fallback (40% of position)
      let tp2Price: number;
      let tp2Reason: string;
      let tp2Source: string;

      if (furtherSupport && furtherSupport < tp1Price) {
        tp2Price = furtherSupport;
        tp2Reason = 'Further support';
        tp2Source = 'Support level';
      } else {
        tp2Price = averageEntry - safeRiskAmount * 3;
        tp2Reason = '3R target';
        tp2Source = '3R calculation';
      }
      tp2Price = roundPrice(Math.min(tp2Price, tp1Price - atr * 0.5));
      takeProfits.push({
        price: tp2Price, percentage: 40,
        reason: tp2Reason, source: tp2Source,
        riskReward: calcTPRR(tp2Price),
      });
      sources.targets.push(tp2Source);
    }

    // Maximum TP distance cap (20%)
    const maxTPPercent = 20;
    takeProfits.forEach(tp => {
      const tpDistance = Math.abs((tp.price - averageEntry) / averageEntry * 100);
      if (tpDistance > maxTPPercent) {
        if (direction === 'long') {
          tp.price = roundPrice(averageEntry * (1 + maxTPPercent / 100));
        } else {
          tp.price = roundPrice(averageEntry * (1 - maxTPPercent / 100));
        }
        tp.reason += ` (capped at ${maxTPPercent}%)`;
        tp.riskReward = calcTPRR(tp.price);
      }
    });

    // ===== RISK/REWARD CALCULATION (weighted average of per-TP R:Rs) =====
    const avgTP = takeProfits.reduce(
      (sum, tp) => sum + Math.abs((tp.price ?? averageEntry) - averageEntry) * ((tp.percentage ?? 0) / 100),
      0
    );
    const riskReward = parseFloat((avgTP / safeRiskAmount).toFixed(2));

    // ===== POSITION SIZE (from Safety + Confidence) =====
    let baseRiskPercent = 2.0; // Base 2% risk

    // Adjust based on safety score
    if (safetyCheck.score >= 8) baseRiskPercent += 0.5;
    else if (safetyCheck.score < 5) baseRiskPercent -= 0.5;

    // Adjust based on confidence
    if (preliminaryVerdict.confidence >= 80) baseRiskPercent += 0.5;
    else if (preliminaryVerdict.confidence < 50) baseRiskPercent -= 0.5;

    // Adjust based on market volatility
    if (marketPulse.marketRegime === 'risk_off') baseRiskPercent -= 0.5;

    // Clamp to 1-3% range
    baseRiskPercent = Math.max(1, Math.min(3, baseRiskPercent));

    const riskAmountUsd = accountSize * (baseRiskPercent / 100);
    const positionSizePercent = parseFloat(
      ((riskAmountUsd / safeRiskAmount) * averageEntry / accountSize * 100).toFixed(2)
    );

    // ===== WIN RATE ESTIMATE — via RiskEngine (TASK 2.3) =====
    const winRateEstimate = estimateWinRate({
      direction,
      trendDirection: assetScan.trend?.direction ?? 'neutral',
      trendStrength:  assetScan.trend?.strength  ?? 50,
      confidence:     preliminaryVerdict.confidence,
      safetyScore:    safetyCheck.score,
      tradeNow:       timing.tradeNow,
      riskReward,
    });

    // ===== SCORE CALCULATION =====
    let score = 5;
    if (riskReward >= 2) score += 1;
    if (riskReward >= 3) score += 1;
    if (preliminaryVerdict.confidence >= 60) score += 1;
    if (winRateEstimate >= 60) score += 1;
    if (stopPercentage <= 5) score += 0.5;
    if (safetyCheck.riskLevel === 'low') score += 0.5;
    score = parseFloat(Math.max(1, Math.min(10, score)).toFixed(1));

    // ===== TRADE PLAN VALIDITY CHECK =====
    // Check if current price has already exceeded all take profits (trade missed)
    let tradePlanStatus: 'valid' | 'wait_for_entry' | 'trade_missed' = 'valid';
    let tradePlanMessage = '';

    const highestTP = Math.max(...takeProfits.map(tp => tp.price));
    const lowestTP = Math.min(...takeProfits.map(tp => tp.price));

    if (direction === 'long') {
      // For LONG: if current price > highest TP, trade is missed
      if (currentPrice > highestTP) {
        tradePlanStatus = 'trade_missed';
        tradePlanMessage = `Price has already exceeded all take profit levels. Entry was at $${averageEntry.toFixed(2)}, current price is $${currentPrice.toFixed(2)}. Consider waiting for a pullback to re-evaluate.`;
      } else if (needsToWaitForEntry && entryStatus === 'wait_for_pullback') {
        tradePlanStatus = 'wait_for_entry';
        tradePlanMessage = `Current price ($${currentPrice.toFixed(2)}) is ${entryDistancePercent.toFixed(1)}% above entry ($${averageEntry.toFixed(2)}). Wait for pullback before entering.`;
      }
    } else {
      // For SHORT: if current price < lowest TP, trade is missed
      if (currentPrice < lowestTP) {
        tradePlanStatus = 'trade_missed';
        tradePlanMessage = `Price has already exceeded all take profit levels. Entry was at $${averageEntry.toFixed(2)}, current price is $${currentPrice.toFixed(2)}. Consider waiting for a rally to re-evaluate.`;
      } else if (needsToWaitForEntry && entryStatus === 'wait_for_rally') {
        tradePlanStatus = 'wait_for_entry';
        tradePlanMessage = `Current price ($${currentPrice.toFixed(2)}) is ${entryDistancePercent.toFixed(1)}% below entry ($${averageEntry.toFixed(2)}). Wait for rally before entering.`;
      }
    }

    return {
      symbol,
      direction,
      type: 'limit',
      entries,
      averageEntry,
      currentPrice,
      // Entry status fields - whether to enter immediately or wait
      needsToWaitForEntry,
      entryDistancePercent: parseFloat(entryDistancePercent.toFixed(2)),
      entryStatus,
      // Trade plan validity
      tradePlanStatus,
      tradePlanMessage,
      stopLoss: {
        price: roundPrice(stopPrice),
        percentage: parseFloat(stopPercentage.toFixed(2)),
        reason: sources.stopLoss.join(' + '),
        safetyAdjusted
      },
      takeProfits,
      riskReward,
      winRateEstimate,
      positionSizePercent,
      riskAmount: riskAmountUsd,
      trailingStop: {
        activateAfter: 'When TP1 is reached',
        trailPercent: parseFloat((atr / averageEntry * 100).toFixed(2))
      },
      score,
      sources,
      confidence: preliminaryVerdict.confidence,
      // Gate evaluation for integrated trade plan
      gate: {
        canProceed: riskReward >= 1.5 && winRateEstimate >= 45,
        reason: riskReward >= 1.5 && winRateEstimate >= 45
          ? `Integrated plan has R:R ${riskReward.toFixed(1)} with ${winRateEstimate}% win rate`
          : `R:R ${riskReward.toFixed(1)} or win rate ${winRateEstimate}% below threshold`,
        confidence: Math.round((riskReward / 3 + winRateEstimate / 100) * 50),
        planQuality: riskReward >= 3 && winRateEstimate >= 60 ? 'excellent'
          : riskReward >= 2 && winRateEstimate >= 50 ? 'good'
          : riskReward >= 1.5 ? 'acceptable' : 'poor',
      },
    };
  },

  // =========================================
  // Step 8: Final Verdict (FREE) - Uses preliminary verdict + optional trade plan
  // Now includes AI-generated summary and tokenomics insight
  // =========================================
  async getFinalVerdict(
    symbol: string,
    preliminaryVerdict: PreliminaryVerdictResult,
    allSteps: {
      marketPulse: MarketPulseResult;
      assetScan: AssetScanResult;
      safetyCheck: SafetyCheckResult;
      timing: TimingResult;
      trapCheck: TrapCheckResult;
    },
    tradePlan: TradePlanResult | null,
    tradeType: TradeType = 'dayTrade'
  ): Promise<FinalVerdictResult> {
    const { marketPulse, assetScan, safetyCheck, timing, trapCheck } = allSteps;
    const hasTradePlan = tradePlan !== null;

    // --- Bundle-aware score aggregation (TASK 2.2) ---
    // Map TradeType → BundleType so weights shift by trading style.
    const bundleTypeForScoring =
      tradeType === 'scalping'   ? 'scalping' :
      tradeType === 'swingTrade' ? 'swing'    : 'day';

    const stepScoreInputs = [
      quickStepScore('marketPulse', marketPulse),
      quickStepScore('assetScan',   assetScan),
      quickStepScore('safetyCheck', safetyCheck),
      quickStepScore('timing',      timing),
      quickStepScore('trapCheck',   trapCheck),
      ...(hasTradePlan && tradePlan
        ? [quickStepScore('tradePlan', tradePlan)]
        : []),
    ];

    const aggregated = aggregateScores({
      scores:      stepScoreInputs,
      bundleType:  bundleTypeForScoring,
      hasTradePlan,
    });

    // Map to legacy shape expected by FinalVerdictResult
    const componentScores: FinalVerdictResult['componentScores'] = aggregated.componentScores.map(cs => ({
      step:   cs.step === 'marketPulse' ? 'Market Pulse'  :
              cs.step === 'assetScan'   ? 'Asset Scanner' :
              cs.step === 'safetyCheck' ? 'Safety Check'  :
              cs.step === 'timing'      ? 'Timing'        :
              cs.step === 'trapCheck'   ? 'Trap Check'    :
              cs.step === 'tradePlan'   ? 'Trade Plan'    : cs.step,
      score:  cs.score,
      weight: cs.weight,
    }));

    const overallScore = aggregated.overallScore;

    // Confidence factors - use reasons from preliminary verdict
    const confidenceFactors: FinalVerdictResult['confidenceFactors'] = preliminaryVerdict.reasons.map(r => ({
      factor: r.factor,
      positive: r.positive,
      impact: r.impact
    }));

    // Add trade plan specific factors
    if (hasTradePlan && tradePlan && tradePlan.riskReward >= 2.5) {
      confidenceFactors.push({ factor: `Good R:R ratio (${tradePlan.riskReward})`, positive: true, impact: 'medium' });
    }

    // Use verdict from preliminary verdict (decision was already made)
    const verdict = preliminaryVerdict.verdict;

    // Generate recommendation
    let recommendation = '';

    if (verdict === 'go' && tradePlan) {
      const targetPrice = tradePlan.takeProfits[1]?.price ?? tradePlan.takeProfits[0]?.price ?? tradePlan.averageEntry;
      recommendation = `Conditions are favorable for ${symbol}. ${tradePlan.direction.toUpperCase()} position can be opened. ` +
        `Entry: $${tradePlan.averageEntry}, Stop: $${tradePlan.stopLoss.price}, ` +
        `Target: $${targetPrice}. ` +
        `Risk: ${tradePlan.positionSizePercent.toFixed(1)}% of portfolio.`;
    } else if (verdict === 'conditional_go' && tradePlan) {
      recommendation = `Cautious approach recommended for ${symbol}. ` +
        `${timing.waitFor ? 'Wait for ' + timing.waitFor.event + '. ' : ''}` +
        `If opening position, start small and scale in gradually. ` +
        `Suggested direction: ${tradePlan.direction.toUpperCase()}.`;
    } else if (verdict === 'wait') {
      recommendation = `Waiting recommended for ${symbol}. ` +
        `${timing.waitFor ? 'Wait for ' + timing.waitFor.event + '. ' : 'Wait for better conditions. '}` +
        `Current score: ${overallScore}/10. No trade plan generated.`;
    } else {
      recommendation = `Opening position not recommended for ${symbol}. ` +
        `${safetyCheck.riskLevel === 'high' ? 'High manipulation risk. ' : ''}` +
        `${trapCheck.riskLevel === 'high' ? 'Trap risk present. ' : ''}` +
        `Wait until conditions improve. No trade plan generated.`;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate AI summary and tokenomics insight
    const { aiSummary, tokenomicsInsight } = await generateAIAnalysisSummary({
      symbol,
      verdict,
      overallScore,
      direction: tradePlan?.direction || assetScan.direction,
      currentPrice: assetScan.currentPrice,
      riskReward: tradePlan?.riskReward,
      keyMetrics: {
        rsi: assetScan.indicators?.rsi ?? 50,
        macdHistogram: assetScan.indicators?.macd?.histogram ?? 0,
        fearGreedIndex: marketPulse.fearGreedIndex,
        btcDominance: marketPulse.btcDominance || 0,
        riskLevel: safetyCheck.riskLevel,
        whaleActivity: safetyCheck.whaleActivity?.bias || 'neutral',
      },
      tokenomics: assetScan.tokenomics,
      tradeType,
    });

    return {
      overallScore,
      verdict,
      componentScores,
      confidenceFactors,
      recommendation,
      analysisId: randomUUID(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hasTradePlan,
      aiSummary,
      tokenomicsInsight,
    };
  },

  // =========================================
  // Legacy: Old finalVerdict for backwards compatibility
  // TODO: Remove after migrating all callers
  // =========================================
  async finalVerdict(
    symbol: string,
    allSteps: {
      marketPulse: MarketPulseResult;
      assetScan: AssetScanResult;
      safetyCheck: SafetyCheckResult;
      timing: TimingResult;
      tradePlan: TradePlanResult;
      trapCheck: TrapCheckResult;
    }
  ): Promise<FinalVerdictResult> {
    const { marketPulse, assetScan, safetyCheck, timing, tradePlan, trapCheck } = allSteps;

    // Create a preliminary verdict from the existing data for compatibility
    const preliminaryVerdict = this.preliminaryVerdict(symbol, {
      marketPulse,
      assetScan,
      safetyCheck,
      timing,
      trapCheck
    });

    // Use the new function (default to dayTrade for legacy callers)
    return this.getFinalVerdict(symbol, preliminaryVerdict, {
      marketPulse,
      assetScan,
      safetyCheck,
      timing,
      trapCheck
    }, tradePlan, 'dayTrade');
  },

  // =========================================
  // MLIS Pro Analysis Method
  // Multi-Layer Intelligence System
  // =========================================

  /**
   * Analyze with specified method (classic 7-step or MLIS Pro)
   *
   * @param symbol - Trading pair symbol (e.g., 'BTC', 'BTCUSDT')
   * @param timeframe - Analysis timeframe ('5m', '15m', '1h', '4h', '1d', '1W')
   * @param method - Analysis method ('classic' for 7-step, 'mlis_pro' for MLIS)
   * @param options - Additional options for MLIS analysis
   * @returns Analysis result (varies by method)
   */
  async analyzeWithMethod(
    symbol: string,
    timeframe: string,
    method: 'classic' | 'mlis_pro' = 'classic',
    options?: {
      includeOnchain?: boolean;
      includeSentiment?: boolean;
      confidenceThreshold?: number;
    }
  ): Promise<any> {
    if (method === 'mlis_pro') {
      const config: MLISConfig = {
        symbol,
        timeframe,
        includeOnchain: options?.includeOnchain ?? true,
        includeSentiment: options?.includeSentiment ?? true,
        confidenceThreshold: options?.confidenceThreshold ?? 0.65,
      };
      return analyzeMLIS(symbol, timeframe, config);
    }

    // Mevcut classic analysis - run the full 7-step analysis
    // Note: For classic analysis, caller should use the individual step methods
    // This is a convenience wrapper that returns just the asset scan for quick analysis
    const tradeType = this.getTradeTypeFromTimeframe(timeframe);
    return this.getAssetScan(symbol, tradeType);
  },

  /**
   * Get MLIS service instance for advanced usage
   */
  getMLISService(): MLISService {
    return getMLISService();
  },

  /**
   * Quick MLIS analysis (convenience method)
   */
  async quickMLISAnalysis(symbol: string, timeframe: string): Promise<MLISResult> {
    return analyzeMLIS(symbol, timeframe);
  },

  /**
   * Helper: Map timeframe to trade type
   * Only the 6 API-accepted timeframes are handled (5m, 15m, 30m, 1h, 4h, 1d).
   */
  getTradeTypeFromTimeframe(timeframe: string): TradeType {
    const mapping: Record<string, TradeType> = {
      '5m': 'scalp',
      '15m': 'scalp',
      '30m': 'dayTrade',
      '1h': 'dayTrade',
      '4h': 'dayTrade',
      '1d': 'swing',
    };
    return mapping[timeframe] || 'dayTrade';
  },
};

// =========================================
// RAG-Informed Trade Plan Refinement
// Uses Forecast Bands + Multi-Strategy + Validation to improve the Trade Plan
// =========================================
export function refineTradePlanWithRAG(
  plan: TradePlanResult,
  ragData: {
    forecastBands?: Array<{
      horizon: string;
      timeframe: string;
      currentPrice: number;
      p10: number;
      p50: number;
      p90: number;
      bias: string;
      drivers: string[];
      invalidations: string[];
      bandWidthPercent?: number;
    }> | null;
    strategies?: {
      recommended: string;
      recommendedReason: string;
      strategies: Array<{
        type: string;
        label: string;
        applicability: number;
        direction: string;
        entry: { price: number; condition: string; type: string };
        stopLoss: { price: number; percentage: number; reason: string };
        takeProfits: Array<{ id: string; price: number; sizePct: number; reason: string }>;
        riskReward: number;
      }>;
    } | null;
    validations?: {
      enginePlan?: { overallStatus: string; checks: Array<{ passed: boolean; ruleId: string; severity: string; message: string }> } | null;
      strategies: Array<{ planType: string; overallStatus: string }>;
    };
  },
): TradePlanResult {
  // If no useful RAG data, return original plan
  if (!ragData.forecastBands && !ragData.strategies) return plan;

  const refined = { ...plan, takeProfits: plan.takeProfits.map(tp => ({ ...tp })) };
  const { direction, averageEntry, stopLoss } = plan;
  const riskAmount = Math.abs(averageEntry - stopLoss.price);
  const safeRiskAmount = riskAmount === 0 ? averageEntry * 0.015 : riskAmount;

  const calcTPRR = (tpPrice: number): number =>
    parseFloat((Math.abs(tpPrice - averageEntry) / safeRiskAmount).toFixed(2));

  // Get relevant forecast bands
  const shortBand = ragData.forecastBands?.find(b => b.horizon === 'short');
  const mediumBand = ragData.forecastBands?.find(b => b.horizon === 'medium');

  let refinedByForecast = false;
  let refinedByStrategy = false;

  // ── Phase 1: Refine TPs using Forecast Bands ──────────────────────
  if (ragData.forecastBands && refined.takeProfits.length >= 2) {
    if (direction === 'long') {
      // TP1: If short-term P50 gives better R:R than current TP1 (and >= 1.5R), use it
      if (shortBand && shortBand.p50 > averageEntry) {
        const p50RR = calcTPRR(shortBand.p50);
        if (p50RR > refined.takeProfits[0].riskReward && p50RR >= 1.5) {
          refined.takeProfits[0] = {
            ...refined.takeProfits[0],
            price: roundPrice(shortBand.p50),
            reason: `Forecast P50 (${shortBand.timeframe})`,
            source: 'AI Forecast Band',
            riskReward: p50RR,
          };
          refinedByForecast = true;
        }
      }
      // TP2: If beyond medium-term P90 (bullish ceiling), cap it
      if (mediumBand && refined.takeProfits[1].price > mediumBand.p90 && mediumBand.p90 > averageEntry) {
        const p90RR = calcTPRR(mediumBand.p90);
        if (p90RR >= 1.5) {
          refined.takeProfits[1] = {
            ...refined.takeProfits[1],
            price: roundPrice(mediumBand.p90),
            reason: `Forecast P90 cap (${mediumBand.timeframe})`,
            source: 'AI Forecast Band',
            riskReward: p90RR,
          };
          refinedByForecast = true;
        }
      }
      // TP2: If short-term P90 would upgrade TP2 (better than current), use it
      if (shortBand && !refinedByForecast && shortBand.p90 > averageEntry) {
        const p90RR = calcTPRR(shortBand.p90);
        if (p90RR > refined.takeProfits[1].riskReward && p90RR >= 2.0) {
          refined.takeProfits[1] = {
            ...refined.takeProfits[1],
            price: roundPrice(shortBand.p90),
            reason: `Forecast P90 (${shortBand.timeframe})`,
            source: 'AI Forecast Band',
            riskReward: p90RR,
          };
          refinedByForecast = true;
        }
      }
    } else {
      // SHORT direction
      // TP1: If short-term P50 gives better R:R (P50 < entry for shorts)
      if (shortBand && shortBand.p50 < averageEntry) {
        const p50RR = calcTPRR(shortBand.p50);
        if (p50RR > refined.takeProfits[0].riskReward && p50RR >= 1.5) {
          refined.takeProfits[0] = {
            ...refined.takeProfits[0],
            price: roundPrice(shortBand.p50),
            reason: `Forecast P50 (${shortBand.timeframe})`,
            source: 'AI Forecast Band',
            riskReward: p50RR,
          };
          refinedByForecast = true;
        }
      }
      // TP2: If beyond medium-term P10 (bearish floor), cap it
      if (mediumBand && refined.takeProfits[1].price < mediumBand.p10 && mediumBand.p10 < averageEntry) {
        const p10RR = calcTPRR(mediumBand.p10);
        if (p10RR >= 1.5) {
          refined.takeProfits[1] = {
            ...refined.takeProfits[1],
            price: roundPrice(mediumBand.p10),
            reason: `Forecast P10 cap (${mediumBand.timeframe})`,
            source: 'AI Forecast Band',
            riskReward: p10RR,
          };
          refinedByForecast = true;
        }
      }
      // TP2: If short-term P10 would upgrade TP2
      if (shortBand && !refinedByForecast && shortBand.p10 < averageEntry) {
        const p10RR = calcTPRR(shortBand.p10);
        if (p10RR > refined.takeProfits[1].riskReward && p10RR >= 2.0) {
          refined.takeProfits[1] = {
            ...refined.takeProfits[1],
            price: roundPrice(shortBand.p10),
            reason: `Forecast P10 (${shortBand.timeframe})`,
            source: 'AI Forecast Band',
            riskReward: p10RR,
          };
          refinedByForecast = true;
        }
      }
    }
  }

  // ── Phase 2: If engine plan BLOCKED by validation, adopt recommended strategy ──
  const engineBlocked = ragData.validations?.enginePlan?.overallStatus === 'block';
  if (engineBlocked && ragData.strategies?.strategies?.length) {
    // Find the recommended strategy (or the one with best R:R that passes validation)
    const recommendedType = ragData.strategies.recommended;
    const passedValidation = new Set(
      ragData.validations?.strategies
        ?.filter(v => v.overallStatus !== 'block')
        .map(v => v.planType) || []
    );

    const bestStrategy = ragData.strategies.strategies
      .filter(s => s.direction === direction && (passedValidation.has(s.type) || s.type === recommendedType))
      .sort((a, b) => b.riskReward - a.riskReward)[0];

    if (bestStrategy && bestStrategy.takeProfits.length > 0 && bestStrategy.riskReward > plan.riskReward) {
      // Replace TPs with strategy's TPs
      refined.takeProfits = bestStrategy.takeProfits.slice(0, 2).map((tp, i) => ({
        price: roundPrice(tp.price),
        percentage: i === 0 ? 60 : 40,
        reason: `${bestStrategy.label} - ${tp.reason}`,
        source: `Strategy: ${bestStrategy.type}`,
        riskReward: calcTPRR(tp.price),
      }));

      // Also adopt strategy's SL if it's more sensible
      if (bestStrategy.stopLoss && bestStrategy.stopLoss.price > 0) {
        const stratSLDist = Math.abs((bestStrategy.stopLoss.price - averageEntry) / averageEntry * 100);
        if (stratSLDist >= 1.5 && stratSLDist <= 10) {
          refined.stopLoss = {
            ...refined.stopLoss,
            price: roundPrice(bestStrategy.stopLoss.price),
            percentage: parseFloat(stratSLDist.toFixed(2)),
            reason: `${bestStrategy.label} - ${bestStrategy.stopLoss.reason}`,
          };
        }
      }
      refinedByStrategy = true;
    }
  }

  // ── Phase 3: Even if NOT blocked, if recommended strategy has significantly better R:R ──
  if (!refinedByStrategy && ragData.strategies?.strategies?.length) {
    const recommendedType = ragData.strategies.recommended;
    const recommended = ragData.strategies.strategies.find(
      s => s.type === recommendedType && s.direction === direction
    );

    // Only adopt if strategy R:R is >50% better and >= 2.0
    if (recommended && recommended.riskReward >= 2.0 && recommended.riskReward > plan.riskReward * 1.5) {
      const stratTPs = recommended.takeProfits.slice(0, 2);
      if (stratTPs.length > 0) {
        refined.takeProfits = stratTPs.map((tp, i) => ({
          price: roundPrice(tp.price),
          percentage: i === 0 ? 60 : 40,
          reason: `${recommended.label} - ${tp.reason}`,
          source: `Strategy: ${recommended.type} (upgraded)`,
          riskReward: calcTPRR(tp.price),
        }));
        refinedByStrategy = true;
      }
    }
  }

  // ── Ensure TP ordering is correct (TP1 closer to entry than TP2) ──
  if (refined.takeProfits.length >= 2) {
    const tp1Dist = Math.abs(refined.takeProfits[0].price - averageEntry);
    const tp2Dist = Math.abs(refined.takeProfits[1].price - averageEntry);
    if (tp2Dist < tp1Dist) {
      // Swap them
      [refined.takeProfits[0], refined.takeProfits[1]] = [refined.takeProfits[1], refined.takeProfits[0]];
      refined.takeProfits[0].percentage = 60;
      refined.takeProfits[1].percentage = 40;
    }
  }

  // ── Recalculate overall weighted R:R ──
  const newRiskAmount = Math.abs(averageEntry - refined.stopLoss.price);
  const newSafeRisk = newRiskAmount === 0 ? averageEntry * 0.015 : newRiskAmount;
  const avgTP = refined.takeProfits.reduce(
    (sum, tp) => sum + Math.abs((tp.price ?? averageEntry) - averageEntry) * ((tp.percentage ?? 0) / 100),
    0
  );
  refined.riskReward = parseFloat((avgTP / newSafeRisk).toFixed(2));

  // ── Recalculate per-TP R:R with potentially new SL ──
  if (refinedByStrategy) {
    for (const tp of refined.takeProfits) {
      tp.riskReward = parseFloat((Math.abs(tp.price - averageEntry) / newSafeRisk).toFixed(2));
    }
  }

  // ── Update gate ──
  const winRateEstimate = plan.winRateEstimate || 50;
  refined.gate = {
    canProceed: refined.riskReward >= 1.5 && winRateEstimate >= 45,
    reason: refined.riskReward >= 1.5 && winRateEstimate >= 45
      ? `RAG-refined plan: R:R ${refined.riskReward.toFixed(1)} with ${winRateEstimate}% win rate${refinedByForecast ? ' (forecast-adjusted)' : ''}${refinedByStrategy ? ' (strategy-upgraded)' : ''}`
      : `R:R ${refined.riskReward.toFixed(1)} or win rate ${winRateEstimate}% below threshold`,
    confidence: Math.round((refined.riskReward / 3 + winRateEstimate / 100) * 50),
    planQuality: refined.riskReward >= 3 && winRateEstimate >= 60 ? 'excellent'
      : refined.riskReward >= 2 && winRateEstimate >= 50 ? 'good'
      : refined.riskReward >= 1.5 ? 'acceptable' : 'poor',
  };

  // ── Update score based on new R:R ──
  let score = 5;
  if (refined.riskReward >= 2) score += 1;
  if (refined.riskReward >= 3) score += 1;
  if (plan.confidence >= 60) score += 1;
  if (winRateEstimate >= 60) score += 1;
  if (refined.stopLoss.percentage <= 5) score += 0.5;
  score = parseFloat(Math.max(1, Math.min(10, score)).toFixed(1));
  refined.score = score;

  return refined;
}

export default analysisEngine;
