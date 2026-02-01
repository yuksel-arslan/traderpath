/**
 * TraderPath MLIS Service (Multi-Layer Intelligence System)
 * =========================================================
 *
 * Advanced multi-layer analysis combining:
 * - Technical Analysis (indicators, patterns)
 * - On-chain Metrics (if available)
 * - Sentiment Analysis
 * - Supply/Demand Dynamics
 *
 * Provides enhanced signal generation with confidence scoring
 *
 * Supports all asset classes:
 * - Crypto: Binance API
 * - Stocks, Bonds, Metals: Yahoo Finance API
 */

import { OHLCV, IndicatorsService } from './indicators.service';
import { callGeminiWithRetry } from '../../../core/gemini';
import {
  fetchCandles as fetchMultiAssetCandles,
  getAssetClass,
  AssetClass,
} from '../providers/multi-asset-data-provider';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MLISConfig {
  symbol: string;
  timeframe: string;
  includeOnchain?: boolean;
  includeSentiment?: boolean;
  confidenceThreshold?: number;
}

export interface MLISSignals {
  momentum: number;      // -100 to 100 (negative = bearish, positive = bullish)
  trend: number;         // -100 to 100
  volatility: number;    // 0 to 100 (higher = more volatile)
  volume: number;        // -100 to 100 (volume-weighted direction)
  supplyDemand: number;  // -100 to 100 (positive = demand > supply)
}

export interface MLISLayer {
  name: string;
  score: number;
  confidence: number;
  signals: string[];
  weight: number;
}

export interface MLISResult {
  symbol: string;
  timeframe: string;
  timestamp: string;

  // Core signals
  signals: MLISSignals;

  // Multi-layer breakdown
  layers: {
    technical: MLISLayer;
    momentum: MLISLayer;
    volatility: MLISLayer;
    volume: MLISLayer;
    sentiment?: MLISLayer;
    onchain?: MLISLayer;
  };

  // Final scores
  overallScore: number;           // 0-100
  confidence: number;             // 0-100
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';

  // Risk metrics
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';

  // Key insights
  keySignals: string[];
  riskFactors: string[];

  // Metadata
  method: 'mlis_pro';
  analysisVersion: string;
}

// ============================================================================
// MLIS SERVICE CLASS
// ============================================================================

export class MLISService {
  private indicatorsService: IndicatorsService;
  private binanceService: any;
  private geminiService: any;

  constructor(binanceService?: any, geminiService?: any) {
    this.indicatorsService = new IndicatorsService();
    this.binanceService = binanceService;
    this.geminiService = geminiService;
  }

  /**
   * Main analysis method
   */
  async analyze(config: MLISConfig): Promise<MLISResult> {
    const {
      symbol,
      timeframe,
      includeOnchain = true,
      includeSentiment = true,
      confidenceThreshold = 0.65,
    } = config;

    const timestamp = new Date().toISOString();

    try {
      // Fetch OHLCV data
      const candles = await this.fetchCandles(symbol, timeframe);

      if (!candles || candles.length < 50) {
        return this.createEmptyResult(symbol, timeframe, timestamp, 'Insufficient data');
      }

      // Run all layer analyses in parallel
      const [
        technicalLayer,
        momentumLayer,
        volatilityLayer,
        volumeLayer,
        sentimentLayer,
        onchainLayer,
      ] = await Promise.all([
        this.analyzeTechnicalLayer(candles),
        this.analyzeMomentumLayer(candles),
        this.analyzeVolatilityLayer(candles),
        this.analyzeVolumeLayer(candles),
        includeSentiment ? this.analyzeSentimentLayer(symbol) : null,
        includeOnchain ? this.analyzeOnchainLayer(symbol) : null,
      ]);

      // Calculate signals
      const signals = this.calculateSignals(
        technicalLayer,
        momentumLayer,
        volatilityLayer,
        volumeLayer
      );

      // Calculate weighted overall score
      const { overallScore, confidence } = this.calculateOverallScore(
        technicalLayer,
        momentumLayer,
        volatilityLayer,
        volumeLayer,
        sentimentLayer,
        onchainLayer
      );

      // Determine recommendation and direction
      // Both should respect confidence threshold for consistency
      const recommendation = this.getRecommendation(overallScore, confidence, confidenceThreshold);
      const direction = this.getDirection(signals, overallScore, confidence, confidenceThreshold);

      // Assess risk
      const riskLevel = this.assessRiskLevel(volatilityLayer, signals);
      const volatilityRegime = this.getVolatilityRegime(volatilityLayer.score);

      // Collect key signals and risk factors
      const keySignals = this.collectKeySignals(technicalLayer, momentumLayer, volumeLayer);
      const riskFactors = this.collectRiskFactors(volatilityLayer, sentimentLayer, onchainLayer);

      return {
        symbol,
        timeframe,
        timestamp,
        signals,
        layers: {
          technical: technicalLayer,
          momentum: momentumLayer,
          volatility: volatilityLayer,
          volume: volumeLayer,
          ...(sentimentLayer && { sentiment: sentimentLayer }),
          ...(onchainLayer && { onchain: onchainLayer }),
        },
        overallScore,
        confidence,
        recommendation,
        direction,
        riskLevel,
        volatilityRegime,
        keySignals,
        riskFactors,
        method: 'mlis_pro',
        analysisVersion: '1.0.0',
      };
    } catch (error) {
      console.error(`[MLIS] Analysis failed for ${symbol}:`, error);
      return this.createEmptyResult(symbol, timeframe, timestamp, 'Analysis failed');
    }
  }

  // ============================================================================
  // DATA FETCHING - Multi-Asset Support
  // ============================================================================

  private async fetchCandles(symbol: string, timeframe: string): Promise<OHLCV[]> {
    try {
      const assetClass = getAssetClass(symbol);
      console.log(`[MLIS] Fetching candles for ${symbol} (${assetClass}) - timeframe: ${timeframe}`);

      // Use multi-asset provider which routes to correct API based on asset class
      const candles = await fetchMultiAssetCandles(symbol, timeframe, 500);

      return candles.map((c) => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
    } catch (error) {
      console.warn(`[MLIS] Failed to fetch candles for ${symbol}:`, error);
      return [];
    }
  }

  // ============================================================================
  // LAYER ANALYSES
  // ============================================================================

  private async analyzeTechnicalLayer(candles: OHLCV[]): Promise<MLISLayer> {
    const signals: string[] = [];
    let bullishCount = 0;
    let bearishCount = 0;
    let totalWeight = 0;

    // EMA Analysis (20, 50, 200)
    const ema20 = this.indicatorsService.calculateEMA(candles, 20);
    const ema50 = this.indicatorsService.calculateEMA(candles, 50);
    const ema200 = this.indicatorsService.calculateEMA(candles, 200);

    if (ema20.signal === 'bullish') { bullishCount += 2; signals.push('Price above EMA20'); }
    else if (ema20.signal === 'bearish') { bearishCount += 2; signals.push('Price below EMA20'); }
    totalWeight += 2;

    if (ema50.signal === 'bullish') { bullishCount += 2; signals.push('Price above EMA50'); }
    else if (ema50.signal === 'bearish') { bearishCount += 2; }
    totalWeight += 2;

    if (ema200.signal === 'bullish') { bullishCount += 3; signals.push('Above 200 EMA (strong bullish)'); }
    else if (ema200.signal === 'bearish') { bearishCount += 3; signals.push('Below 200 EMA (bearish structure)'); }
    totalWeight += 3;

    // Golden/Death Cross
    if (ema20.value && ema50.value) {
      if (ema20.value > ema50.value) {
        bullishCount += 2;
        signals.push('Golden cross pattern');
      } else {
        bearishCount += 2;
      }
      totalWeight += 2;
    }

    // MACD Analysis
    const macd = this.indicatorsService.calculateMACD(candles);
    if (macd.signal === 'bullish') { bullishCount += 3; signals.push('MACD bullish'); }
    else if (macd.signal === 'bearish') { bearishCount += 3; signals.push('MACD bearish'); }
    totalWeight += 3;

    // ADX for trend strength
    const adx = this.indicatorsService.calculateADX(candles);
    if (adx.value && adx.value > 25) {
      signals.push(`Strong trend (ADX: ${adx.value.toFixed(1)})`);
    }

    // Calculate score (-100 to 100, then normalize to 0-100)
    const rawScore = totalWeight > 0
      ? ((bullishCount - bearishCount) / totalWeight) * 100
      : 0;
    const score = Math.round((rawScore + 100) / 2); // Normalize to 0-100

    return {
      name: 'Technical',
      score,
      confidence: Math.min(100, totalWeight * 5),
      signals: signals.slice(0, 5),
      weight: 0.30,
    };
  }

  private async analyzeMomentumLayer(candles: OHLCV[]): Promise<MLISLayer> {
    const signals: string[] = [];
    let score = 50; // Start neutral

    // RSI Analysis
    const rsi = this.indicatorsService.calculateRSI(candles);
    if (rsi.value) {
      if (rsi.value > 70) {
        score -= 20;
        signals.push(`RSI overbought (${rsi.value.toFixed(1)})`);
      } else if (rsi.value < 30) {
        score += 20;
        signals.push(`RSI oversold (${rsi.value.toFixed(1)})`);
      } else if (rsi.value > 50) {
        score += 10;
        signals.push(`RSI bullish (${rsi.value.toFixed(1)})`);
      } else {
        score -= 10;
      }
    }

    // Stochastic RSI
    const stochRsi = this.indicatorsService.calculateStochRSI(candles);
    if (stochRsi.value) {
      if (stochRsi.value > 80) {
        score -= 15;
        signals.push('StochRSI overbought');
      } else if (stochRsi.value < 20) {
        score += 15;
        signals.push('StochRSI oversold');
      }
    }

    // CCI
    const cci = this.indicatorsService.calculateCCI(candles);
    if (cci.value) {
      if (cci.value > 100) {
        score += 10;
        signals.push('CCI strong momentum');
      } else if (cci.value < -100) {
        score -= 10;
        signals.push('CCI weak momentum');
      }
    }

    // Williams %R
    const willR = this.indicatorsService.calculateWilliamsR(candles);
    if (willR.value) {
      if (willR.value > -20) {
        score -= 10;
      } else if (willR.value < -80) {
        score += 10;
        signals.push('Williams %R oversold');
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
      name: 'Momentum',
      score,
      confidence: 75,
      signals: signals.slice(0, 4),
      weight: 0.25,
    };
  }

  private async analyzeVolatilityLayer(candles: OHLCV[]): Promise<MLISLayer> {
    const signals: string[] = [];
    let volatilityScore = 50;

    // ATR Analysis
    const atr = this.indicatorsService.calculateATR(candles);
    const currentPrice = candles[candles.length - 1]?.close || 0;

    if (atr.value && currentPrice > 0) {
      const atrPercent = (atr.value / currentPrice) * 100;

      if (atrPercent > 5) {
        volatilityScore = 90;
        signals.push(`Extreme volatility (ATR: ${atrPercent.toFixed(2)}%)`);
      } else if (atrPercent > 3) {
        volatilityScore = 75;
        signals.push(`High volatility (ATR: ${atrPercent.toFixed(2)}%)`);
      } else if (atrPercent > 1.5) {
        volatilityScore = 50;
        signals.push(`Normal volatility`);
      } else {
        volatilityScore = 25;
        signals.push(`Low volatility - breakout potential`);
      }
    }

    // Bollinger Bands
    const bb = this.indicatorsService.calculateBollinger(candles);
    if (bb.metadata?.bandwidth) {
      const bandwidth = bb.metadata.bandwidth as number;
      if (bandwidth < 5) {
        signals.push('Bollinger squeeze - breakout imminent');
      } else if (bandwidth > 20) {
        signals.push('Wide Bollinger - high volatility');
      }
    }

    return {
      name: 'Volatility',
      score: volatilityScore,
      confidence: 80,
      signals: signals.slice(0, 3),
      weight: 0.15,
    };
  }

  private async analyzeVolumeLayer(candles: OHLCV[]): Promise<MLISLayer> {
    const signals: string[] = [];
    let score = 50;

    // OBV Analysis
    const obv = this.indicatorsService.calculateOBV(candles);
    if (obv.signal === 'bullish') {
      score += 15;
      signals.push('OBV trending up');
    } else if (obv.signal === 'bearish') {
      score -= 15;
      signals.push('OBV trending down');
    }

    // Volume Trend
    const recentVolumes = candles.slice(-20).map(c => c.volume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = candles[candles.length - 1]?.volume || 0;

    if (currentVolume > avgVolume * 2) {
      score += 20;
      signals.push('Volume spike (2x average)');
    } else if (currentVolume > avgVolume * 1.5) {
      score += 10;
      signals.push('Above average volume');
    } else if (currentVolume < avgVolume * 0.5) {
      score -= 10;
      signals.push('Low volume - weak conviction');
    }

    // CMF (Chaikin Money Flow)
    const cmf = this.indicatorsService.calculateCMF(candles);
    if (cmf.value) {
      if (cmf.value > 0.1) {
        score += 10;
        signals.push('CMF positive - buying pressure');
      } else if (cmf.value < -0.1) {
        score -= 10;
        signals.push('CMF negative - selling pressure');
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
      name: 'Volume',
      score,
      confidence: 70,
      signals: signals.slice(0, 4),
      weight: 0.20,
    };
  }

  private async analyzeSentimentLayer(symbol: string): Promise<MLISLayer | null> {
    try {
      // Fetch Fear & Greed Index
      const response = await fetch('https://api.alternative.me/fng/', {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const fng = data?.data?.[0];

      if (!fng) return null;

      const fngValue = parseInt(fng.value, 10);
      const signals: string[] = [];
      let score = 50;

      if (fngValue <= 25) {
        score = 75; // Extreme fear = buying opportunity
        signals.push(`Extreme Fear (${fngValue}) - contrarian buy signal`);
      } else if (fngValue <= 45) {
        score = 60;
        signals.push(`Fear (${fngValue}) - cautious optimism`);
      } else if (fngValue >= 75) {
        score = 25; // Extreme greed = selling opportunity
        signals.push(`Extreme Greed (${fngValue}) - contrarian sell signal`);
      } else if (fngValue >= 55) {
        score = 40;
        signals.push(`Greed (${fngValue}) - caution advised`);
      } else {
        signals.push(`Neutral sentiment (${fngValue})`);
      }

      return {
        name: 'Sentiment',
        score,
        confidence: 65,
        signals,
        weight: 0.05,
      };
    } catch (error) {
      console.warn('[MLIS] Sentiment analysis failed:', error);
      return null;
    }
  }

  private async analyzeOnchainLayer(symbol: string): Promise<MLISLayer | null> {
    // On-chain analysis is more complex and would require additional data sources
    // This is a placeholder for future implementation
    try {
      const signals: string[] = [];
      let score = 50;

      // For now, we return a neutral on-chain analysis
      // In production, this would integrate with Glassnode, CryptoQuant, etc.
      signals.push('On-chain metrics neutral');

      return {
        name: 'Onchain',
        score,
        confidence: 50,
        signals,
        weight: 0.05,
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  private calculateSignals(
    technical: MLISLayer,
    momentum: MLISLayer,
    volatility: MLISLayer,
    volume: MLISLayer
  ): MLISSignals {
    // Convert 0-100 scores to -100 to 100 range for directional signals
    const toDirectional = (score: number) => (score - 50) * 2;

    return {
      momentum: toDirectional(momentum.score),
      trend: toDirectional(technical.score),
      volatility: volatility.score,
      volume: toDirectional(volume.score),
      supplyDemand: toDirectional((technical.score + volume.score) / 2),
    };
  }

  private calculateOverallScore(
    technical: MLISLayer,
    momentum: MLISLayer,
    volatility: MLISLayer,
    volume: MLISLayer,
    sentiment: MLISLayer | null,
    onchain: MLISLayer | null
  ): { overallScore: number; confidence: number } {
    let totalWeight = 0;
    let weightedSum = 0;
    let confidenceSum = 0;

    const layers = [technical, momentum, volatility, volume];
    if (sentiment) layers.push(sentiment);
    if (onchain) layers.push(onchain);

    for (const layer of layers) {
      weightedSum += layer.score * layer.weight;
      totalWeight += layer.weight;
      confidenceSum += layer.confidence * layer.weight;
    }

    // Normalize if weights don't sum to 1
    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
    const confidence = totalWeight > 0 ? Math.round(confidenceSum / totalWeight) : 50;

    return { overallScore, confidence };
  }

  private getRecommendation(
    score: number,
    confidence: number,
    threshold: number
  ): MLISResult['recommendation'] {
    // If confidence is very low (< 30%), always return HOLD regardless of score
    // This prevents giving strong signals with unreliable data
    if (confidence < 30) {
      return 'HOLD';
    }

    // If confidence is below threshold but >= 30%, use dampened score
    const effectiveScore = confidence >= threshold * 100 ? score : 50;

    if (effectiveScore >= 80) return 'STRONG_BUY';
    if (effectiveScore >= 65) return 'BUY';
    if (effectiveScore >= 35) return 'HOLD';
    if (effectiveScore >= 20) return 'SELL';
    return 'STRONG_SELL';
  }

  private getDirection(
    signals: MLISSignals,
    score: number,
    confidence: number,
    threshold: number
  ): MLISResult['direction'] {
    // If confidence is below threshold, return NEUTRAL (consistent with recommendation logic)
    if (confidence < threshold * 100) {
      return 'NEUTRAL';
    }

    const avgSignal = (signals.momentum + signals.trend + signals.volume) / 3;

    if (score >= 60 && avgSignal > 20) return 'LONG';
    if (score <= 40 && avgSignal < -20) return 'SHORT';
    return 'NEUTRAL';
  }

  private assessRiskLevel(volatility: MLISLayer, signals: MLISSignals): MLISResult['riskLevel'] {
    const volScore = volatility.score;
    const signalStrength = Math.abs(signals.momentum) + Math.abs(signals.trend);

    if (volScore >= 80 || signalStrength < 30) return 'EXTREME';
    if (volScore >= 60) return 'HIGH';
    if (volScore >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private getVolatilityRegime(volScore: number): MLISResult['volatilityRegime'] {
    if (volScore >= 80) return 'EXTREME';
    if (volScore >= 60) return 'HIGH';
    if (volScore >= 30) return 'NORMAL';
    return 'LOW';
  }

  private collectKeySignals(
    technical: MLISLayer,
    momentum: MLISLayer,
    volume: MLISLayer
  ): string[] {
    const signals: string[] = [];

    signals.push(...technical.signals.slice(0, 2));
    signals.push(...momentum.signals.slice(0, 2));
    signals.push(...volume.signals.slice(0, 1));

    return signals.slice(0, 5);
  }

  private collectRiskFactors(
    volatility: MLISLayer,
    sentiment: MLISLayer | null,
    onchain: MLISLayer | null
  ): string[] {
    const factors: string[] = [];

    if (volatility.score >= 75) {
      factors.push('High volatility environment');
    }

    if (sentiment && sentiment.score <= 30) {
      factors.push('Extreme market fear');
    } else if (sentiment && sentiment.score >= 70) {
      factors.push('Extreme market greed');
    }

    factors.push(...volatility.signals.filter(s => s.includes('Extreme') || s.includes('High')));

    return factors.slice(0, 4);
  }

  private createEmptyResult(
    symbol: string,
    timeframe: string,
    timestamp: string,
    reason: string
  ): MLISResult {
    const emptyLayer: MLISLayer = {
      name: '',
      score: 50,
      confidence: 0,
      signals: [reason],
      weight: 0,
    };

    return {
      symbol,
      timeframe,
      timestamp,
      signals: {
        momentum: 0,
        trend: 0,
        volatility: 50,
        volume: 0,
        supplyDemand: 0,
      },
      layers: {
        technical: { ...emptyLayer, name: 'Technical' },
        momentum: { ...emptyLayer, name: 'Momentum' },
        volatility: { ...emptyLayer, name: 'Volatility' },
        volume: { ...emptyLayer, name: 'Volume' },
      },
      overallScore: 50,
      confidence: 0,
      recommendation: 'HOLD',
      direction: 'NEUTRAL',
      riskLevel: 'MEDIUM',
      volatilityRegime: 'NORMAL',
      keySignals: [reason],
      riskFactors: ['Analysis incomplete'],
      method: 'mlis_pro',
      analysisVersion: '1.0.0',
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let mlisServiceInstance: MLISService | null = null;

export function getMLISService(binanceService?: any, geminiService?: any): MLISService {
  if (!mlisServiceInstance) {
    mlisServiceInstance = new MLISService(binanceService, geminiService);
  }
  return mlisServiceInstance;
}

// Direct export for convenience
export async function analyzeMLIS(
  symbol: string,
  timeframe: string,
  options?: Partial<MLISConfig>
): Promise<MLISResult> {
  const service = getMLISService();
  return service.analyze({
    symbol,
    timeframe,
    ...options,
  });
}
