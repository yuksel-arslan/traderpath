/**
 * TradePath Analysis Orchestrator
 * ================================
 *
 * Orchestrates the 7-step analysis process based on trade type.
 * Integrates trade-config.ts and indicators.service.ts with the main analysis engine.
 *
 * Trade Types:
 * - Scalping: 1-15 min holding, aggressive indicators, 3 credits
 * - Day Trade: 1-8 hours holding, balanced indicators, 2 credits
 * - Swing: 2-14 days holding, conservative indicators, 1 credit
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TradeType,
  AnalysisStep,
  Timeframe,
  TRADE_CONFIG,
  getTradeConfig,
  getStepConfig,
  getRequiredTimeframes,
  getMaxCandleCount,
  getAllIndicators,
  getCreditCost,
  StepConfig,
} from '../config/trade-config';
import { IndicatorsService, OHLCV, IndicatorResult } from './indicators.service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OrchestratorConfig {
  symbol: string;
  tradeType: TradeType;
  accountSize?: number;
}

export interface TimeframeData {
  timeframe: Timeframe;
  candles: OHLCV[];
  indicators: Map<string, IndicatorResult>;
}

export interface StepAnalysisResult {
  step: AnalysisStep;
  stepNumber: number;
  name: string;
  timeframeData: TimeframeData[];
  aggregatedIndicators: Record<string, IndicatorResult>;
  signals: {
    bullish: string[];
    bearish: string[];
    neutral: string[];
  };
  score: number;
  confidence: number;
  aiPrompt: string;
}

export interface FullAnalysisResult {
  symbol: string;
  tradeType: TradeType;
  creditCost: number;
  timestamp: string;
  steps: StepAnalysisResult[];
  overallSignal: 'bullish' | 'bearish' | 'neutral';
  overallScore: number;
  overallConfidence: number;
  recommendation: {
    action: 'go' | 'conditional_go' | 'wait' | 'avoid';
    direction: 'long' | 'short' | null;
    reasons: string[];
  };
}

// ============================================================================
// BINANCE API FUNCTIONS
// ============================================================================

const BINANCE_API = 'https://api.binance.com/api/v3';

async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number
): Promise<OHLCV[]> {
  const url = `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((k: any[]) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error(`Failed to fetch klines for ${symbol} ${interval}:`, error);
    return [];
  }
}

function timeframeToInterval(tf: Timeframe): string {
  const mapping: Record<Timeframe, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
  };
  return mapping[tf];
}

// ============================================================================
// ANALYSIS ORCHESTRATOR SERVICE
// ============================================================================

@Injectable()
export class AnalysisOrchestratorService {
  private readonly logger = new Logger(AnalysisOrchestratorService.name);
  private indicatorsService: IndicatorsService;

  constructor() {
    this.indicatorsService = new IndicatorsService();
  }

  /**
   * Run full analysis for a symbol with specified trade type
   */
  async runAnalysis(config: OrchestratorConfig): Promise<FullAnalysisResult> {
    const { symbol, tradeType, accountSize = 10000 } = config;
    const tradeConfig = getTradeConfig(tradeType);

    this.logger.log(`Starting ${tradeType} analysis for ${symbol}`);

    // Fetch all required timeframe data
    const timeframeDataMap = await this.fetchAllTimeframeData(symbol, tradeType);

    // Run each step
    const stepResults: StepAnalysisResult[] = [];

    for (const stepConfig of tradeConfig.steps) {
      const stepResult = await this.runStepAnalysis(
        symbol,
        stepConfig,
        timeframeDataMap
      );
      stepResults.push(stepResult);
    }

    // Aggregate results
    const overallResult = this.aggregateResults(stepResults, tradeType);

    return {
      symbol,
      tradeType,
      creditCost: getCreditCost(tradeType),
      timestamp: new Date().toISOString(),
      steps: stepResults,
      ...overallResult,
    };
  }

  /**
   * Fetch all timeframe data needed for the trade type
   */
  private async fetchAllTimeframeData(
    symbol: string,
    tradeType: TradeType
  ): Promise<Map<Timeframe, OHLCV[]>> {
    const timeframes = getRequiredTimeframes(tradeType);
    const dataMap = new Map<Timeframe, OHLCV[]>();

    // Fetch all timeframes in parallel
    const fetchPromises = timeframes.map(async (tf) => {
      const candleCount = getMaxCandleCount(tradeType, tf);
      const interval = timeframeToInterval(tf);
      const candles = await fetchKlines(symbol, interval, candleCount);
      return { tf, candles };
    });

    const results = await Promise.all(fetchPromises);

    for (const { tf, candles } of results) {
      dataMap.set(tf, candles);
    }

    return dataMap;
  }

  /**
   * Run analysis for a single step
   */
  private async runStepAnalysis(
    symbol: string,
    stepConfig: StepConfig,
    timeframeDataMap: Map<Timeframe, OHLCV[]>
  ): Promise<StepAnalysisResult> {
    const timeframeData: TimeframeData[] = [];
    const aggregatedIndicators: Record<string, IndicatorResult> = {};
    const signals = { bullish: [] as string[], bearish: [] as string[], neutral: [] as string[] };

    // Process each timeframe for this step
    for (const tfConfig of stepConfig.timeframes) {
      const candles = timeframeDataMap.get(tfConfig.timeframe);
      if (!candles || candles.length === 0) continue;

      // Get the required candle count for this step
      const stepCandles = candles.slice(-tfConfig.candleCount);

      // Calculate indicators for this timeframe
      const indicators = new Map<string, IndicatorResult>();

      for (const indConfig of stepConfig.indicators) {
        const result = this.indicatorsService.calculateIndicator(
          indConfig.name,
          stepCandles,
          indConfig.params
        );

        if (result) {
          indicators.set(indConfig.name, result);

          // Aggregate to overall (weight by priority)
          const weight = tfConfig.priority === 'primary' ? 1.0 :
                        tfConfig.priority === 'secondary' ? 0.7 : 0.5;

          // Add to signals based on indicator signal
          if (result.signal === 'bullish') {
            signals.bullish.push(`${indConfig.name} (${tfConfig.timeframe}): ${result.value?.toFixed(2)}`);
          } else if (result.signal === 'bearish') {
            signals.bearish.push(`${indConfig.name} (${tfConfig.timeframe}): ${result.value?.toFixed(2)}`);
          } else {
            signals.neutral.push(`${indConfig.name} (${tfConfig.timeframe}): ${result.value?.toFixed(2)}`);
          }

          // Store aggregated indicator (use primary timeframe values)
          if (tfConfig.priority === 'primary' && !aggregatedIndicators[indConfig.name]) {
            aggregatedIndicators[indConfig.name] = result;
          }
        }
      }

      timeframeData.push({
        timeframe: tfConfig.timeframe,
        candles: stepCandles,
        indicators,
      });
    }

    // Calculate step score and confidence
    const { score, confidence } = this.calculateStepScore(signals, stepConfig);

    // Generate AI prompt for this step
    const aiPrompt = this.generateStepPrompt(symbol, stepConfig, aggregatedIndicators, signals);

    return {
      step: stepConfig.step,
      stepNumber: stepConfig.stepNumber,
      name: stepConfig.name,
      timeframeData,
      aggregatedIndicators,
      signals,
      score,
      confidence,
      aiPrompt,
    };
  }

  /**
   * Calculate score and confidence for a step
   */
  private calculateStepScore(
    signals: { bullish: string[]; bearish: string[]; neutral: string[] },
    stepConfig: StepConfig
  ): { score: number; confidence: number } {
    const totalSignals = signals.bullish.length + signals.bearish.length + signals.neutral.length;

    if (totalSignals === 0) {
      return { score: 5, confidence: 0 };
    }

    // Calculate bullish/bearish ratio
    const bullishRatio = signals.bullish.length / totalSignals;
    const bearishRatio = signals.bearish.length / totalSignals;

    // Score: 1-10 based on signal direction
    // 10 = strongly bullish, 5 = neutral, 1 = strongly bearish
    let score = 5 + (bullishRatio - bearishRatio) * 5;
    score = Math.max(1, Math.min(10, score));

    // Confidence: Based on signal agreement
    const dominantRatio = Math.max(bullishRatio, bearishRatio, signals.neutral.length / totalSignals);
    const confidence = Math.round(dominantRatio * 100);

    return { score: Math.round(score * 10) / 10, confidence };
  }

  /**
   * Generate AI prompt for a step
   */
  private generateStepPrompt(
    symbol: string,
    stepConfig: StepConfig,
    indicators: Record<string, IndicatorResult>,
    signals: { bullish: string[]; bearish: string[]; neutral: string[] }
  ): string {
    const indicatorSummary = Object.entries(indicators)
      .map(([name, result]) => `${name}: ${result.value?.toFixed(4) || 'N/A'} (${result.signal})`)
      .join('\n');

    return `
## ${stepConfig.name} Analysis for ${symbol}

### Focus
${stepConfig.aiPromptFocus}

### Technical Indicators
${indicatorSummary}

### Signal Summary
- Bullish signals (${signals.bullish.length}): ${signals.bullish.slice(0, 3).join(', ') || 'None'}
- Bearish signals (${signals.bearish.length}): ${signals.bearish.slice(0, 3).join(', ') || 'None'}
- Neutral signals (${signals.neutral.length}): ${signals.neutral.slice(0, 3).join(', ') || 'None'}

### Required Output
Provide analysis focusing on: ${stepConfig.aiPromptFocus}
Include specific price levels and actionable insights.
`.trim();
  }

  /**
   * Aggregate all step results into final recommendation
   */
  private aggregateResults(
    steps: StepAnalysisResult[],
    tradeType: TradeType
  ): {
    overallSignal: 'bullish' | 'bearish' | 'neutral';
    overallScore: number;
    overallConfidence: number;
    recommendation: {
      action: 'go' | 'conditional_go' | 'wait' | 'avoid';
      direction: 'long' | 'short' | null;
      reasons: string[];
    };
  } {
    // Weight factors for each step (from TECHNICAL_SPECIFICATION.md)
    const stepWeights: Record<AnalysisStep, number> = {
      marketPulse: 0.15,
      assetScan: 0.20,
      safetyCheck: 0.20,
      timing: 0.15,
      tradePlan: 0.10,
      trapCheck: 0.10,
      verdict: 0.10,
    };

    // Calculate weighted score
    let weightedScore = 0;
    let totalWeight = 0;
    let totalBullish = 0;
    let totalBearish = 0;
    const reasons: string[] = [];

    for (const step of steps) {
      const weight = stepWeights[step.step];
      weightedScore += step.score * weight;
      totalWeight += weight;

      totalBullish += step.signals.bullish.length;
      totalBearish += step.signals.bearish.length;

      // Collect key reasons
      if (step.score >= 7) {
        reasons.push(`${step.name}: Strong bullish (${step.score.toFixed(1)}/10)`);
      } else if (step.score <= 3) {
        reasons.push(`${step.name}: Strong bearish (${step.score.toFixed(1)}/10)`);
      }
    }

    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 5;

    // Determine overall signal
    let overallSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (overallScore >= 6.5) overallSignal = 'bullish';
    else if (overallScore <= 3.5) overallSignal = 'bearish';

    // Calculate confidence
    const signalTotal = totalBullish + totalBearish;
    const dominantSignal = Math.max(totalBullish, totalBearish);
    const overallConfidence = signalTotal > 0
      ? Math.round((dominantSignal / signalTotal) * 100)
      : 50;

    // Determine action
    let action: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
    let direction: 'long' | 'short' | null = null;

    // Safety check score
    const safetyStep = steps.find(s => s.step === 'safetyCheck');
    const safetyScore = safetyStep?.score || 5;

    if (safetyScore < 4) {
      // Safety concerns - avoid or wait
      action = safetyScore < 2 ? 'avoid' : 'wait';
      reasons.push(`Safety score too low (${safetyScore.toFixed(1)}/10)`);
    } else if (overallScore >= 7 && overallConfidence >= 70) {
      action = 'go';
      direction = overallSignal === 'bullish' ? 'long' : 'short';
      reasons.push(`Strong signal with high confidence`);
    } else if (overallScore >= 6 && overallConfidence >= 50) {
      action = 'conditional_go';
      direction = overallSignal === 'bullish' ? 'long' : overallSignal === 'bearish' ? 'short' : null;
      reasons.push(`Moderate signal - consider additional confirmation`);
    } else if (overallScore <= 3) {
      action = 'avoid';
      reasons.push(`Bearish conditions detected`);
    }

    return {
      overallSignal,
      overallScore: Math.round(overallScore * 10) / 10,
      overallConfidence,
      recommendation: {
        action,
        direction,
        reasons,
      },
    };
  }

  /**
   * Get quick indicator summary for a symbol and trade type
   */
  async getQuickSummary(
    symbol: string,
    tradeType: TradeType
  ): Promise<{
    symbol: string;
    tradeType: TradeType;
    primaryTimeframe: Timeframe;
    keyIndicators: Record<string, IndicatorResult>;
    quickSignal: 'bullish' | 'bearish' | 'neutral';
  }> {
    const tradeConfig = getTradeConfig(tradeType);
    const primaryTimeframe = tradeConfig.steps[0].timeframes[0];

    const candles = await fetchKlines(
      symbol,
      timeframeToInterval(primaryTimeframe.timeframe),
      primaryTimeframe.candleCount
    );

    const keyIndicators: Record<string, IndicatorResult> = {};

    // Calculate key indicators
    const rsi = this.indicatorsService.calculateRSI(candles, 14);
    const macd = this.indicatorsService.calculateMACD(candles);
    const adx = this.indicatorsService.calculateADX(candles);
    const supertrend = this.indicatorsService.calculateSupertrend(candles);

    if (rsi.value !== null) keyIndicators['RSI'] = rsi;
    if (macd.value !== null) keyIndicators['MACD'] = macd;
    if (adx.value !== null) keyIndicators['ADX'] = adx;
    if (supertrend.value !== null) keyIndicators['SUPERTREND'] = supertrend;

    // Determine quick signal
    let bullish = 0;
    let bearish = 0;

    for (const ind of Object.values(keyIndicators)) {
      if (ind.signal === 'bullish') bullish++;
      else if (ind.signal === 'bearish') bearish++;
    }

    const quickSignal: 'bullish' | 'bearish' | 'neutral' =
      bullish > bearish ? 'bullish' :
      bearish > bullish ? 'bearish' : 'neutral';

    return {
      symbol,
      tradeType,
      primaryTimeframe: primaryTimeframe.timeframe,
      keyIndicators,
      quickSignal,
    };
  }

  /**
   * Compare trade type suitability for a symbol
   */
  async compareTradeTypes(symbol: string): Promise<{
    symbol: string;
    comparison: Array<{
      tradeType: TradeType;
      name: string;
      suitability: 'high' | 'medium' | 'low';
      reason: string;
      creditCost: number;
    }>;
    recommended: TradeType;
  }> {
    const tradeTypes: TradeType[] = ['scalping', 'dayTrade', 'swing'];
    const comparison: Array<{
      tradeType: TradeType;
      name: string;
      suitability: 'high' | 'medium' | 'low';
      reason: string;
      creditCost: number;
    }> = [];

    // Get volatility data
    const candles1h = await fetchKlines(symbol, '1h', 24);
    const candles4h = await fetchKlines(symbol, '4h', 30);

    const atr1h = this.indicatorsService.calculateATR(candles1h, 14);
    const atr4h = this.indicatorsService.calculateATR(candles4h, 14);
    const adx = this.indicatorsService.calculateADX(candles4h, 14);
    const rvol = this.indicatorsService.calculateRelativeVolume(candles1h, 20);

    const volatility1h = atr1h.metadata?.atrPercent || 0;
    const volatility4h = atr4h.metadata?.atrPercent || 0;
    const trendStrength = adx.value || 20;
    const relativeVolume = rvol.value || 1;

    for (const tradeType of tradeTypes) {
      const config = getTradeConfig(tradeType);
      let suitability: 'high' | 'medium' | 'low' = 'medium';
      let reason = '';

      if (tradeType === 'scalping') {
        // Scalping needs high volatility and volume
        if (volatility1h > 1.5 && relativeVolume > 1.2) {
          suitability = 'high';
          reason = 'Good volatility and volume for quick trades';
        } else if (volatility1h < 0.5) {
          suitability = 'low';
          reason = 'Too low volatility for scalping';
        } else {
          reason = 'Moderate conditions for scalping';
        }
      } else if (tradeType === 'dayTrade') {
        // Day trading needs moderate volatility and trend
        if (volatility4h > 1 && volatility4h < 4 && trendStrength > 20) {
          suitability = 'high';
          reason = 'Good trend and controlled volatility';
        } else if (trendStrength < 15) {
          suitability = 'low';
          reason = 'Weak trend - ranging market';
        } else {
          reason = 'Moderate conditions for day trading';
        }
      } else if (tradeType === 'swing') {
        // Swing trading needs strong trend and lower volatility
        if (trendStrength > 25 && volatility4h < 3) {
          suitability = 'high';
          reason = 'Strong trend with manageable volatility';
        } else if (volatility4h > 5) {
          suitability = 'low';
          reason = 'Too volatile for swing positions';
        } else {
          reason = 'Moderate conditions for swing trading';
        }
      }

      comparison.push({
        tradeType,
        name: config.name,
        suitability,
        reason,
        creditCost: getCreditCost(tradeType),
      });
    }

    // Determine recommended trade type
    const recommended = comparison.find(c => c.suitability === 'high')?.tradeType ||
                       comparison.find(c => c.suitability === 'medium')?.tradeType ||
                       'dayTrade';

    return { symbol, comparison, recommended };
  }
}
