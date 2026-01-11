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
  IndicatorConfig,
} from '../config/trade-config';
import { IndicatorsService, OHLCV, IndicatorResult } from './indicators.service';

// Detailed Report Types
export interface IndicatorChartData {
  name: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'advanced';
  values: number[];
  timestamps: number[];
  currentValue: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
  interpretation: string;
  chartColor: string;
  secondaryValues?: number[];
  secondaryLabel?: string;
  thirdValues?: number[];
  thirdLabel?: string;
  referenceLines?: { value: number; label: string; color: string }[];
  metadata?: Record<string, unknown>;
}

export interface DetailedStepData {
  stepNumber: number;
  stepName: string;
  stepDescription: string;
  input: {
    timeframes: {
      timeframe: string;
      candleCount: number;
      priority: 'primary' | 'secondary' | 'confirmation';
      dataRange: { startTime: number; endTime: number };
    }[];
    indicators: {
      name: string;
      category: string;
      params: Record<string, number>;
      weight: number;
    }[];
    tradeType: TradeType;
    aiPromptFocus: string;
  };
  output: {
    indicators: Record<string, {
      value: number | null;
      signal: 'bullish' | 'bearish' | 'neutral';
      strength: number;
      metadata?: Record<string, unknown>;
    }>;
    signals: {
      bullish: string[];
      bearish: string[];
      neutral: string[];
    };
    stepScore: number;
    stepConfidence: number;
    keyFindings: string[];
  };
  commentary: {
    summary: string;
    signalInterpretation: string;
    riskFactors: string[];
    opportunities: string[];
    recommendation: string;
  };
  indicatorCharts: IndicatorChartData[];
}

export interface DetailedReportData {
  symbol: string;
  tradeType: TradeType;
  generatedAt: string;
  analysisId: string;
  marketContext: {
    btcPrice: number;
    btcDominance: number;
    fearGreedIndex: number;
    marketTrend: 'bullish' | 'bearish' | 'neutral';
  };
  assetInfo: {
    currentPrice: number;
    priceChange24h: number;
    volume24h: number;
  };
  steps: DetailedStepData[];
  tradePlanSummary: {
    direction: 'long' | 'short';
    entries: { price: number; percentage: number }[];
    averageEntry: number;
    stopLoss: { price: number; percentage: number; reason: string };
    takeProfits: { price: number; percentage: number; reason: string }[];
    riskReward: number;
    winRateEstimate: number;
  };
  verdict: {
    action: 'go' | 'conditional_go' | 'wait' | 'avoid';
    overallScore: number;
    overallConfidence: number;
    direction: 'long' | 'short' | null;
    reasons: string[];
  };
}

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

  // ============================================================================
  // DETAILED REPORT GENERATION
  // ============================================================================

  /**
   * Indicator color mapping for charts
   */
  private getIndicatorColor(name: string, category: string): string {
    const colorMap: Record<string, string> = {
      // Trend indicators
      'EMA_9': '#3B82F6',
      'EMA_20': '#2563EB',
      'EMA_21': '#1D4ED8',
      'EMA_50': '#1E40AF',
      'EMA_200': '#1E3A8A',
      'SMA_50': '#6366F1',
      'SMA_200': '#4F46E5',
      'MACD': '#10B981',
      'ADX': '#F59E0B',
      'ICHIMOKU': '#8B5CF6',
      'SUPERTREND': '#EC4899',
      'PSAR': '#14B8A6',
      'AROON': '#F97316',
      'VWMA': '#06B6D4',
      // Momentum indicators
      'RSI': '#EF4444',
      'STOCHASTIC': '#F97316',
      'STOCH_RSI': '#FB923C',
      'CCI': '#84CC16',
      'WILLIAMS_R': '#22C55E',
      'ROC': '#A855F7',
      'MFI': '#0EA5E9',
      'ULTIMATE': '#6366F1',
      'TSI': '#EC4899',
      // Volatility indicators
      'BOLLINGER': '#8B5CF6',
      'ATR': '#F59E0B',
      'KELTNER': '#10B981',
      'DONCHIAN': '#3B82F6',
      'HISTORICAL_VOLATILITY': '#EF4444',
      'SQUEEZE': '#A855F7',
      // Volume indicators
      'OBV': '#22C55E',
      'VWAP': '#0EA5E9',
      'AD': '#14B8A6',
      'CMF': '#6366F1',
      'FORCE_INDEX': '#F97316',
      'PVT': '#84CC16',
      'RELATIVE_VOLUME': '#EC4899',
      'VOLUME_SPIKE': '#EF4444',
      // Advanced indicators
      'ORDER_FLOW_IMBALANCE': '#8B5CF6',
      'WHALE_ACTIVITY': '#F59E0B',
      'SPOOFING_DETECTION': '#EF4444',
      'LIQUIDITY_SCORE': '#10B981',
      'SLIPPAGE_ESTIMATE': '#0EA5E9',
      'MARKET_IMPACT': '#A855F7',
    };
    return colorMap[name] || (category === 'trend' ? '#3B82F6' :
           category === 'momentum' ? '#EF4444' :
           category === 'volatility' ? '#F59E0B' :
           category === 'volume' ? '#22C55E' : '#8B5CF6');
  }

  /**
   * Generate interpretation for indicator value
   */
  private getIndicatorInterpretation(name: string, result: IndicatorResult): string {
    const value = result.value;
    const signal = result.signal;

    const interpretations: Record<string, () => string> = {
      'RSI': () => {
        if (value === null) return 'Data insufficient';
        if (value > 70) return `Overbought at ${value.toFixed(1)} - Potential reversal or correction ahead`;
        if (value < 30) return `Oversold at ${value.toFixed(1)} - Potential bounce or recovery expected`;
        return `Neutral at ${value.toFixed(1)} - No extreme conditions`;
      },
      'MACD': () => {
        const histogram = result.metadata?.histogram as number;
        if (histogram > 0) return `Bullish momentum - Histogram positive at ${histogram.toFixed(4)}`;
        return `Bearish momentum - Histogram negative at ${histogram?.toFixed(4) || 0}`;
      },
      'ADX': () => {
        if (value === null) return 'Data insufficient';
        if (value > 50) return `Very strong trend at ${value.toFixed(1)} - High conviction moves`;
        if (value > 25) return `Moderate trend at ${value.toFixed(1)} - Trend following viable`;
        return `Weak/No trend at ${value.toFixed(1)} - Range-bound conditions`;
      },
      'SUPERTREND': () => signal === 'bullish'
        ? 'Uptrend confirmed - Price above Supertrend line'
        : 'Downtrend confirmed - Price below Supertrend line',
      'BOLLINGER': () => {
        const percentB = result.metadata?.percentB as number;
        if (percentB > 1) return 'Price above upper band - Overbought/Strong breakout';
        if (percentB < 0) return 'Price below lower band - Oversold/Breakdown';
        return `Price within bands at ${(percentB * 100).toFixed(0)}% position`;
      },
      'ATR': () => {
        const atrPercent = result.metadata?.atrPercent as number;
        return `Volatility at ${atrPercent?.toFixed(2) || 0}% - ${atrPercent > 3 ? 'High' : atrPercent > 1.5 ? 'Moderate' : 'Low'} volatility`;
      },
      'VWAP': () => signal === 'bullish'
        ? 'Price above VWAP - Bullish intraday bias'
        : 'Price below VWAP - Bearish intraday bias',
      'OBV': () => signal === 'bullish'
        ? 'Volume supporting upward moves - Accumulation detected'
        : 'Volume supporting downward moves - Distribution detected',
      'STOCHASTIC': () => {
        const k = result.metadata?.k as number;
        if (k > 80) return 'Overbought zone - Momentum extended';
        if (k < 20) return 'Oversold zone - Momentum compressed';
        return 'Neutral momentum zone';
      },
      'WHALE_ACTIVITY': () => {
        const detected = result.metadata?.detected as boolean;
        return detected
          ? `Whale activity detected (${value?.toFixed(0) || 0}% confidence) - Large player involvement`
          : 'No significant whale activity detected';
      },
      'SPOOFING_DETECTION': () => {
        const warning = result.metadata?.warning as boolean;
        return warning
          ? `Spoofing patterns detected - Caution advised (Risk: ${result.metadata?.riskLevel})`
          : 'No spoofing patterns detected';
      },
    };

    const interpreter = interpretations[name.split('_')[0]] || interpretations[name];
    if (interpreter) return interpreter();

    return signal === 'bullish'
      ? `Bullish signal at ${value?.toFixed(2) || 'N/A'}`
      : signal === 'bearish'
        ? `Bearish signal at ${value?.toFixed(2) || 'N/A'}`
        : `Neutral at ${value?.toFixed(2) || 'N/A'}`;
  }

  /**
   * Generate key findings from signals
   */
  private generateKeyFindings(
    signals: { bullish: string[]; bearish: string[]; neutral: string[] },
    score: number
  ): string[] {
    const findings: string[] = [];

    if (signals.bullish.length > signals.bearish.length * 2) {
      findings.push('Strong bullish consensus across indicators');
    } else if (signals.bearish.length > signals.bullish.length * 2) {
      findings.push('Strong bearish consensus across indicators');
    } else if (Math.abs(signals.bullish.length - signals.bearish.length) <= 2) {
      findings.push('Mixed signals - market in transition');
    }

    if (score >= 8) findings.push('Very high probability setup detected');
    else if (score >= 6) findings.push('Above average probability setup');
    else if (score <= 3) findings.push('High risk conditions detected');

    // Extract top 3 strongest signals
    const topBullish = signals.bullish.slice(0, 2);
    const topBearish = signals.bearish.slice(0, 2);

    topBullish.forEach(s => findings.push(`Bullish: ${s}`));
    topBearish.forEach(s => findings.push(`Bearish: ${s}`));

    return findings.slice(0, 5);
  }

  /**
   * Generate commentary for a step
   */
  private generateStepCommentary(
    stepConfig: StepConfig,
    signals: { bullish: string[]; bearish: string[]; neutral: string[] },
    score: number,
    indicators: Record<string, IndicatorResult>
  ): {
    summary: string;
    signalInterpretation: string;
    riskFactors: string[];
    opportunities: string[];
    recommendation: string;
  } {
    const bullishCount = signals.bullish.length;
    const bearishCount = signals.bearish.length;
    const total = bullishCount + bearishCount + signals.neutral.length;
    const bullishRatio = total > 0 ? bullishCount / total : 0;
    const bearishRatio = total > 0 ? bearishCount / total : 0;

    let summary = '';
    let signalInterpretation = '';
    const riskFactors: string[] = [];
    const opportunities: string[] = [];
    let recommendation = '';

    // Generate summary based on step
    switch (stepConfig.step) {
      case 'marketPulse':
        summary = `Market conditions show ${bullishRatio > 0.6 ? 'favorable' : bearishRatio > 0.6 ? 'challenging' : 'mixed'} environment for trading.`;
        signalInterpretation = `${bullishCount} bullish vs ${bearishCount} bearish market signals detected.`;
        if (bearishRatio > 0.5) riskFactors.push('Market sentiment is negative');
        if (bullishRatio > 0.6) opportunities.push('Market momentum supports directional trades');
        recommendation = score >= 6 ? 'Market conditions suitable for analysis' : 'Consider waiting for better market conditions';
        break;

      case 'assetScan':
        summary = `Asset technical analysis shows ${score >= 7 ? 'strong' : score >= 5 ? 'moderate' : 'weak'} technical setup.`;
        signalInterpretation = `Multi-timeframe analysis reveals ${bullishCount > bearishCount ? 'bullish' : 'bearish'} bias.`;
        if (indicators['RSI']?.value && (indicators['RSI'].value > 70 || indicators['RSI'].value < 30)) {
          riskFactors.push(`RSI at extreme levels (${indicators['RSI'].value.toFixed(0)})`);
        }
        if (indicators['ADX']?.value && indicators['ADX'].value > 25) {
          opportunities.push('Strong trend detected - trend following viable');
        }
        recommendation = 'Review support/resistance levels before entry';
        break;

      case 'safetyCheck':
        summary = `Risk assessment score: ${score.toFixed(1)}/10. ${score >= 6 ? 'Low to moderate' : 'Elevated'} risk detected.`;
        signalInterpretation = 'Safety indicators analyzed for manipulation, whale activity, and market anomalies.';
        if (indicators['SPOOFING_DETECTION']?.metadata?.warning) riskFactors.push('Potential spoofing detected');
        if (indicators['WHALE_ACTIVITY']?.metadata?.detected) {
          const bias = indicators['WHALE_ACTIVITY']?.signal;
          if (bias === 'bullish') opportunities.push('Whale accumulation detected');
          else riskFactors.push('Whale distribution detected');
        }
        recommendation = score >= 5 ? 'Risk levels acceptable for trading' : 'Proceed with extreme caution or avoid';
        break;

      case 'timing':
        summary = `Entry timing ${score >= 7 ? 'optimal' : score >= 5 ? 'acceptable' : 'not ideal'} based on momentum indicators.`;
        signalInterpretation = `${bullishCount} momentum indicators bullish, ${bearishCount} bearish.`;
        if (indicators['STOCH_RSI']?.value && (indicators['STOCH_RSI'].value > 80 || indicators['STOCH_RSI'].value < 20)) {
          if (indicators['STOCH_RSI'].value > 80) riskFactors.push('Momentum overbought - late entry risk');
          else opportunities.push('Momentum oversold - potential reversal entry');
        }
        recommendation = score >= 6 ? 'Timing favorable for entry' : 'Wait for better entry timing';
        break;

      case 'tradePlan':
        summary = `Trade plan calculations complete with ${score >= 7 ? 'favorable' : 'moderate'} risk-reward setup.`;
        signalInterpretation = 'Entry, stop-loss, and take-profit levels calculated based on volatility and key levels.';
        if (indicators['ATR']?.metadata?.atrPercent && indicators['ATR'].metadata.atrPercent > 4) {
          riskFactors.push('High volatility may cause slippage');
        }
        opportunities.push('Multiple take-profit levels defined for partial exits');
        recommendation = 'Follow position sizing rules strictly';
        break;

      case 'trapCheck':
        summary = `Trap analysis ${score >= 6 ? 'clear' : 'shows warning signs'}. ${score < 5 ? 'Multiple traps detected.' : ''}`;
        signalInterpretation = 'Divergence analysis and trap pattern detection completed.';
        if (score < 5) riskFactors.push('Potential trap patterns detected');
        if (indicators['OBV']?.signal === 'bullish' && bullishRatio > 0.5) {
          opportunities.push('Volume confirms price action - low trap risk');
        }
        recommendation = score >= 5 ? 'Low trap probability' : 'Be cautious of false breakouts';
        break;

      case 'verdict':
        summary = `Final score: ${score.toFixed(1)}/10. ${score >= 7 ? 'Strong' : score >= 5 ? 'Moderate' : 'Weak'} trade setup.`;
        signalInterpretation = `Aggregated analysis across all steps completed with ${Math.round((score / 10) * 100)}% confidence.`;
        recommendation = score >= 7 ? 'GO - Execute trade plan' : score >= 5 ? 'CONDITIONAL GO - Consider additional confirmation' : 'WAIT/AVOID - Setup not favorable';
        break;

      default:
        summary = `Step analysis completed with score ${score.toFixed(1)}/10.`;
        signalInterpretation = `${bullishCount} bullish vs ${bearishCount} bearish signals.`;
        recommendation = 'Review all data before proceeding.';
    }

    return { summary, signalInterpretation, riskFactors, opportunities, recommendation };
  }

  /**
   * Convert indicator result to chart data
   */
  private convertToChartData(
    name: string,
    category: string,
    result: IndicatorResult,
    candles: OHLCV[]
  ): IndicatorChartData {
    const timestamps = candles.map(c => c.timestamp);
    const values = result.values || (result.value !== null ? [result.value] : []);

    // Align values with timestamps (pad with nulls if needed)
    const alignedValues = values.length < timestamps.length
      ? [...Array(timestamps.length - values.length).fill(null), ...values]
      : values;

    const chartData: IndicatorChartData = {
      name,
      category: category as IndicatorChartData['category'],
      values: alignedValues.filter((v): v is number => v !== null),
      timestamps: timestamps.slice(-alignedValues.length),
      currentValue: result.value || 0,
      signal: result.signal || 'neutral',
      signalStrength: result.strength || 0,
      interpretation: this.getIndicatorInterpretation(name, result),
      chartColor: this.getIndicatorColor(name, category),
      metadata: result.metadata,
    };

    // Add reference lines for specific indicators
    if (name === 'RSI') {
      chartData.referenceLines = [
        { value: 70, label: 'Overbought', color: '#EF4444' },
        { value: 30, label: 'Oversold', color: '#22C55E' },
        { value: 50, label: 'Midline', color: '#6B7280' },
      ];
    } else if (name === 'STOCHASTIC' || name === 'STOCH_RSI') {
      chartData.referenceLines = [
        { value: 80, label: 'Overbought', color: '#EF4444' },
        { value: 20, label: 'Oversold', color: '#22C55E' },
      ];
    } else if (name === 'CCI') {
      chartData.referenceLines = [
        { value: 100, label: 'Overbought', color: '#EF4444' },
        { value: -100, label: 'Oversold', color: '#22C55E' },
        { value: 0, label: 'Zero', color: '#6B7280' },
      ];
    } else if (name === 'ADX') {
      chartData.referenceLines = [
        { value: 25, label: 'Trend Start', color: '#F59E0B' },
        { value: 50, label: 'Strong Trend', color: '#10B981' },
      ];
    }

    return chartData;
  }

  /**
   * Run detailed analysis for generating comprehensive report
   */
  async runDetailedAnalysis(config: OrchestratorConfig): Promise<DetailedReportData> {
    const { symbol, tradeType } = config;
    const tradeConfig = getTradeConfig(tradeType);

    this.logger.log(`Starting detailed ${tradeType} analysis for ${symbol}`);

    // Fetch all required timeframe data
    const timeframeDataMap = await this.fetchAllTimeframeData(symbol, tradeType);

    // Get current price info
    const primaryTf = tradeConfig.steps[0].timeframes[0].timeframe;
    const primaryCandles = timeframeDataMap.get(primaryTf) || [];
    const currentPrice = primaryCandles[primaryCandles.length - 1]?.close || 0;
    const price24hAgo = primaryCandles.length >= 24 ? primaryCandles[primaryCandles.length - 24]?.close : primaryCandles[0]?.close;
    const priceChange24h = price24hAgo ? ((currentPrice - price24hAgo) / price24hAgo) * 100 : 0;
    const volume24h = primaryCandles.slice(-24).reduce((sum, c) => sum + (c.volume * c.close), 0);

    // Run each step and collect detailed data
    const detailedSteps: DetailedStepData[] = [];
    let overallScore = 0;
    let overallConfidence = 0;
    let finalDirection: 'long' | 'short' | null = null;
    const allReasons: string[] = [];

    for (const stepConfig of tradeConfig.steps) {
      const stepResult = await this.runStepAnalysis(symbol, stepConfig, timeframeDataMap);

      // Build detailed step data
      const inputData = {
        timeframes: stepConfig.timeframes.map(tf => {
          const candles = timeframeDataMap.get(tf.timeframe) || [];
          return {
            timeframe: tf.timeframe,
            candleCount: tf.candleCount,
            priority: tf.priority,
            dataRange: {
              startTime: candles[0]?.timestamp || 0,
              endTime: candles[candles.length - 1]?.timestamp || 0,
            },
          };
        }),
        indicators: stepConfig.indicators.map(ind => ({
          name: ind.name,
          category: ind.category,
          params: ind.params || {},
          weight: ind.weight,
        })),
        tradeType,
        aiPromptFocus: stepConfig.aiPromptFocus,
      };

      // Build output data
      const outputIndicators: Record<string, { value: number | null; signal: 'bullish' | 'bearish' | 'neutral'; strength: number; metadata?: Record<string, unknown> }> = {};
      for (const [name, result] of Object.entries(stepResult.aggregatedIndicators)) {
        outputIndicators[name] = {
          value: result.value,
          signal: result.signal || 'neutral',
          strength: result.strength || 0,
          metadata: result.metadata,
        };
      }

      const outputData = {
        indicators: outputIndicators,
        signals: stepResult.signals,
        stepScore: stepResult.score,
        stepConfidence: stepResult.confidence,
        keyFindings: this.generateKeyFindings(stepResult.signals, stepResult.score),
      };

      // Generate commentary
      const commentary = this.generateStepCommentary(
        stepConfig,
        stepResult.signals,
        stepResult.score,
        stepResult.aggregatedIndicators
      );

      // Build indicator chart data
      const indicatorCharts: IndicatorChartData[] = [];
      const primaryTimeframeData = stepResult.timeframeData.find(td =>
        stepConfig.timeframes.find(tf => tf.timeframe === td.timeframe && tf.priority === 'primary')
      );

      if (primaryTimeframeData) {
        for (const [name, result] of primaryTimeframeData.indicators) {
          const indConfig = stepConfig.indicators.find(i => i.name === name);
          if (indConfig && result.values && result.values.length > 0) {
            indicatorCharts.push(
              this.convertToChartData(name, indConfig.category, result, primaryTimeframeData.candles)
            );
          }
        }
      }

      detailedSteps.push({
        stepNumber: stepConfig.stepNumber,
        stepName: stepConfig.name,
        stepDescription: stepConfig.description,
        input: inputData,
        output: outputData,
        commentary,
        indicatorCharts,
      });

      // Accumulate for verdict
      const stepWeight = stepConfig.stepNumber <= 3 ? 0.2 : 0.1;
      overallScore += stepResult.score * stepWeight;
      overallConfidence = Math.max(overallConfidence, stepResult.confidence);

      if (stepResult.score >= 7) allReasons.push(`${stepConfig.name}: Bullish (${stepResult.score.toFixed(1)})`);
      else if (stepResult.score <= 3) allReasons.push(`${stepConfig.name}: Bearish (${stepResult.score.toFixed(1)})`);
    }

    // Normalize score
    overallScore = overallScore / 0.9; // Total weight = 0.9
    finalDirection = overallScore >= 6 ? 'long' : overallScore <= 4 ? 'short' : null;

    // Create placeholder trade plan (would be filled from actual analysis)
    const tradePlanSummary = {
      direction: (finalDirection || 'long') as 'long' | 'short',
      entries: [{ price: currentPrice, percentage: 100 }],
      averageEntry: currentPrice,
      stopLoss: {
        price: finalDirection === 'short' ? currentPrice * 1.03 : currentPrice * 0.97,
        percentage: 3,
        reason: 'ATR-based stop loss',
      },
      takeProfits: [
        { price: finalDirection === 'short' ? currentPrice * 0.97 : currentPrice * 1.03, percentage: 33, reason: 'TP1: 1R target' },
        { price: finalDirection === 'short' ? currentPrice * 0.94 : currentPrice * 1.06, percentage: 33, reason: 'TP2: 2R target' },
        { price: finalDirection === 'short' ? currentPrice * 0.90 : currentPrice * 1.10, percentage: 34, reason: 'TP3: 3R target' },
      ],
      riskReward: 2.5,
      winRateEstimate: Math.round(overallScore * 8),
    };

    return {
      symbol,
      tradeType,
      generatedAt: new Date().toISOString(),
      analysisId: `${symbol}-${tradeType}-${Date.now()}`,
      marketContext: {
        btcPrice: 0, // Would be filled from market data
        btcDominance: 0,
        fearGreedIndex: 50,
        marketTrend: overallScore >= 6 ? 'bullish' : overallScore <= 4 ? 'bearish' : 'neutral',
      },
      assetInfo: {
        currentPrice,
        priceChange24h,
        volume24h,
      },
      steps: detailedSteps,
      tradePlanSummary,
      verdict: {
        action: overallScore >= 7 ? 'go' : overallScore >= 5 ? 'conditional_go' : overallScore >= 3 ? 'wait' : 'avoid',
        overallScore,
        overallConfidence,
        direction: finalDirection,
        reasons: allReasons,
      },
    };
  }
}
