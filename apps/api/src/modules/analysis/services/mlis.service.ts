/**
 * TraderPath MLIS Service (Multi-Layer Intelligence System)
 * =========================================================
 *
 * Advanced multi-layer analysis with real ML inference layers:
 *   Layer 1: Conv1D convolutional feature extraction (micro-pattern detection)
 *   Layer 2: Regime-adaptive thresholds (GARCH/ATR-based dynamic levels)
 *   Layer 3: GARCH(1,1) variance modeling (conditional volatility forecasting)
 *   Layer 4: Institutional flow estimation (BVC + VPIN + whale detection)
 *   Layer 5: Platt scaling calibration (probability-calibrated confidence)
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

// ML Layer imports
import { extractConv1DFeatures, type Conv1DFeatures } from './ml/conv1d-features.service';
import { getAdaptiveThresholds, type AdaptiveThresholds } from './ml/regime-thresholds.service';
import { analyzeGARCH, type GARCHResult } from './ml/garch.service';
import { estimateInstitutionalFlow, type InstitutionalFlowResult } from './ml/institutional-flow.service';
import { calibrateScore, type PlattCalibrationResult, type TrainingOutcome } from './ml/platt-scaling.service';
import { prisma } from '../../../core/database';
import { getDeFiTvl } from '../../capital-flow/providers/defillama.provider';

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

  // ML Layer enrichments
  mlEnrichments?: {
    conv1dFeatures?: Conv1DFeatures;
    garchResult?: GARCHResult;
    adaptiveThresholds?: AdaptiveThresholds;
    institutionalFlow?: InstitutionalFlowResult;
    plattCalibration?: PlattCalibrationResult;
  };

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

      // ── ML Layer 1: Conv1D Feature Extraction ──
      const conv1dFeatures = extractConv1DFeatures(candles);

      // ── ML Layer 3: GARCH(1,1) Variance Modeling ──
      const garchResult = analyzeGARCH(candles);

      // ── ML Layer 2: Regime-Adaptive Thresholds (uses GARCH when available) ──
      const adaptiveThresholds = getAdaptiveThresholds(candles, garchResult);

      // ── ML Layer 4: Institutional Flow (BVC + VPIN) ──
      const institutionalFlow = estimateInstitutionalFlow(candles);

      // Run all layer analyses in parallel (now ML-enriched)
      const [
        technicalLayer,
        momentumLayer,
        volatilityLayer,
        volumeLayer,
        sentimentLayer,
        onchainLayer,
      ] = await Promise.all([
        this.analyzeTechnicalLayer(candles, conv1dFeatures),
        this.analyzeMomentumLayer(candles, adaptiveThresholds),
        this.analyzeVolatilityLayer(candles, garchResult),
        this.analyzeVolumeLayer(candles, institutionalFlow),
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

      // ── ML Layer 5: Platt Scaling Calibration ──
      // Convert raw score to calibrated probability using historical outcomes
      let historicalOutcomes: TrainingOutcome[] | undefined;
      try {
        const recentAnalyses = await prisma.analysis.findMany({
          where: { outcome: { in: ['tp1_hit', 'tp2_hit', 'tp3_hit', 'sl_hit'] } },
          select: { totalScore: true, outcome: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });
        if (recentAnalyses.length >= 30) {
          historicalOutcomes = recentAnalyses.map((a) => ({
            score: Number(a.totalScore) || 50,
            outcome: (a.outcome === 'sl_hit' ? 0 : 1) as 0 | 1,
          }));
        }
      } catch {
        // Fall back to default calibration if DB is unavailable
      }
      const plattCalibration = calibrateScore(overallScore, historicalOutcomes);
      const calibratedConfidence = Math.round(plattCalibration.calibratedProbability * 100);

      // Use calibrated confidence for recommendation/direction decisions
      const effectiveConfidence = plattCalibration.isCalibrated ? calibratedConfidence : confidence;

      // Determine recommendation and direction
      const recommendation = this.getRecommendation(overallScore, effectiveConfidence, confidenceThreshold);
      const direction = this.getDirection(signals, overallScore, effectiveConfidence, confidenceThreshold);

      // Assess risk (use GARCH-based volatility regime)
      const riskLevel = this.assessRiskLevel(volatilityLayer, signals);
      const volatilityRegime = this.getVolatilityRegime(volatilityLayer.score);

      // Collect key signals and risk factors
      const keySignals = this.collectKeySignals(technicalLayer, momentumLayer, volumeLayer);
      const riskFactors = this.collectRiskFactors(volatilityLayer, sentimentLayer, onchainLayer);

      // Add ML-specific signals
      if (conv1dFeatures.trendSignal > 0.5) keySignals.push('Conv1D: Strong uptrend pattern');
      else if (conv1dFeatures.trendSignal < -0.5) keySignals.push('Conv1D: Strong downtrend pattern');
      if (conv1dFeatures.spikeSignal > 0.5) riskFactors.push('Conv1D: Spike pattern detected');

      if (garchResult.regimeLabel === 'extreme') riskFactors.push(`GARCH: Extreme volatility (${(isNaN(garchResult.annualizedVol) ? 0 : garchResult.annualizedVol).toFixed(1)}% ann.)`);
      else if (garchResult.regimeLabel === 'high') riskFactors.push(`GARCH: Elevated volatility (${(isNaN(garchResult.annualizedVol) ? 0 : garchResult.annualizedVol).toFixed(1)}% ann.)`);

      if (institutionalFlow.smartMoneyDirection === 'accumulating') keySignals.push('Institutional: Smart money accumulating');
      else if (institutionalFlow.smartMoneyDirection === 'distributing') riskFactors.push('Institutional: Smart money distributing');
      if (institutionalFlow.vpin > 0.7) riskFactors.push(`VPIN: High informed trading probability (${(institutionalFlow.vpin * 100).toFixed(0)}%)`);

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
        confidence: effectiveConfidence,
        recommendation,
        direction,
        riskLevel,
        volatilityRegime,
        keySignals: keySignals.slice(0, 7),
        riskFactors: riskFactors.slice(0, 6),
        mlEnrichments: {
          conv1dFeatures,
          garchResult,
          adaptiveThresholds,
          institutionalFlow,
          plattCalibration,
        },
        method: 'mlis_pro',
        analysisVersion: '2.0.0',
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

  private async analyzeTechnicalLayer(candles: OHLCV[], conv1dFeatures?: Conv1DFeatures): Promise<MLISLayer> {
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

    // ── ML Layer 1: Conv1D Feature Extraction ──
    // Neural convolutional features enhance pattern detection
    if (conv1dFeatures) {
      const conv1dWeight = 4; // High weight for ML features

      if (conv1dFeatures.trendSignal > 0.3) {
        bullishCount += conv1dWeight;
        signals.push(`Conv1D: Uptrend pattern (${(conv1dFeatures.trendSignal * 100).toFixed(0)}%)`);
      } else if (conv1dFeatures.trendSignal < -0.3) {
        bearishCount += conv1dWeight;
        signals.push(`Conv1D: Downtrend pattern (${(Math.abs(conv1dFeatures.trendSignal) * 100).toFixed(0)}%)`);
      }
      totalWeight += conv1dWeight;

      // Momentum kernel alignment
      if (conv1dFeatures.momentumSignal > 0.3) {
        bullishCount += 2;
      } else if (conv1dFeatures.momentumSignal < -0.3) {
        bearishCount += 2;
      }
      totalWeight += 2;
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
      signals: signals.slice(0, 6),
      weight: 0.30,
    };
  }

  private async analyzeMomentumLayer(candles: OHLCV[], thresholds?: AdaptiveThresholds): Promise<MLISLayer> {
    const signals: string[] = [];
    let score = 50; // Start neutral

    // ── ML Layer 2: Use regime-adaptive thresholds instead of hardcoded values ──
    const rsiOB = thresholds?.rsiOverbought ?? 70;
    const rsiOS = thresholds?.rsiOversold ?? 30;
    const stochOB = thresholds?.stochOverbought ?? 80;
    const stochOS = thresholds?.stochOversold ?? 20;
    const cciOB = thresholds?.cciOverbought ?? 100;
    const cciOS = thresholds?.cciOversold ?? -100;
    const willROB = thresholds?.williamsROverbought ?? -20;
    const willROS = thresholds?.williamsROversold ?? -80;

    if (thresholds) {
      const factor = isNaN(thresholds.regimeFactor) ? 1.0 : thresholds.regimeFactor;
      signals.push(`Regime: ${thresholds.regime} (factor: ${factor.toFixed(2)})`);
    }

    // RSI Analysis with adaptive thresholds
    const rsi = this.indicatorsService.calculateRSI(candles);
    if (rsi.value) {
      if (rsi.value > rsiOB) {
        score -= 20;
        signals.push(`RSI overbought (${rsi.value.toFixed(1)} > ${rsiOB.toFixed(0)})`);
      } else if (rsi.value < rsiOS) {
        score += 20;
        signals.push(`RSI oversold (${rsi.value.toFixed(1)} < ${rsiOS.toFixed(0)})`);
      } else if (rsi.value > 50) {
        score += 10;
        signals.push(`RSI bullish (${rsi.value.toFixed(1)})`);
      } else {
        score -= 10;
      }
    }

    // Stochastic RSI with adaptive thresholds
    const stochRsi = this.indicatorsService.calculateStochRSI(candles);
    if (stochRsi.value) {
      if (stochRsi.value > stochOB) {
        score -= 15;
        signals.push(`StochRSI overbought (>${stochOB.toFixed(0)})`);
      } else if (stochRsi.value < stochOS) {
        score += 15;
        signals.push(`StochRSI oversold (<${stochOS.toFixed(0)})`);
      }
    }

    // CCI with adaptive thresholds
    const cci = this.indicatorsService.calculateCCI(candles);
    if (cci.value) {
      if (cci.value > cciOB) {
        score += 10;
        signals.push(`CCI strong momentum (>${cciOB.toFixed(0)})`);
      } else if (cci.value < cciOS) {
        score -= 10;
        signals.push(`CCI weak momentum (<${cciOS.toFixed(0)})`);
      }
    }

    // Williams %R with adaptive thresholds
    const willR = this.indicatorsService.calculateWilliamsR(candles);
    if (willR.value) {
      if (willR.value > willROB) {
        score -= 10;
      } else if (willR.value < willROS) {
        score += 10;
        signals.push(`Williams %R oversold (<${willROS.toFixed(0)})`);
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
      name: 'Momentum',
      score,
      confidence: 75,
      signals: signals.slice(0, 5),
      weight: 0.25,
    };
  }

  private async analyzeVolatilityLayer(candles: OHLCV[], garchResult?: GARCHResult): Promise<MLISLayer> {
    const signals: string[] = [];
    let volatilityScore = 50;

    // ── ML Layer 3: GARCH(1,1) Variance Modeling ──
    if (garchResult && garchResult.varianceSeries.length > 0) {
      const { varianceRatio, annualizedVol, regimeLabel, forecastVariance1d, halfLife } = garchResult;

      // GARCH-based volatility classification
      if (regimeLabel === 'extreme') {
        volatilityScore = 92;
        signals.push(`GARCH: Extreme vol regime (${annualizedVol.toFixed(1)}% ann.)`);
      } else if (regimeLabel === 'high') {
        volatilityScore = 75;
        signals.push(`GARCH: High vol regime (${annualizedVol.toFixed(1)}% ann.)`);
      } else if (regimeLabel === 'normal') {
        volatilityScore = 50;
        signals.push(`GARCH: Normal vol (${annualizedVol.toFixed(1)}% ann.)`);
      } else {
        volatilityScore = 25;
        signals.push(`GARCH: Low vol - breakout potential (${annualizedVol.toFixed(1)}% ann.)`);
      }

      // Variance ratio insight
      if (varianceRatio > 1.5) {
        signals.push(`Variance ratio: ${varianceRatio.toFixed(2)}x (elevated vs long-run)`);
      } else if (varianceRatio < 0.7) {
        signals.push(`Variance ratio: ${varianceRatio.toFixed(2)}x (suppressed)`);
      }

      // Half-life of volatility shocks
      if (halfLife < 5) {
        signals.push(`Fast mean-reversion (half-life: ${halfLife.toFixed(1)} bars)`);
      } else if (halfLife > 20) {
        signals.push(`Persistent shocks (half-life: ${halfLife.toFixed(1)} bars)`);
      }
    } else {
      // Fallback to ATR-based analysis
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
    }

    // Bollinger Bands (always included)
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
      confidence: garchResult ? 88 : 75, // Higher confidence with GARCH
      signals: signals.slice(0, 5),
      weight: 0.15,
    };
  }

  private async analyzeVolumeLayer(candles: OHLCV[], flow?: InstitutionalFlowResult): Promise<MLISLayer> {
    const signals: string[] = [];
    let score = 50;

    // OBV Analysis
    const obv = this.indicatorsService.calculateOBV(candles);
    if (obv.signal === 'bullish') {
      score += 10;
      signals.push('OBV trending up');
    } else if (obv.signal === 'bearish') {
      score -= 10;
      signals.push('OBV trending down');
    }

    // Volume Trend
    const recentVolumes = candles.slice(-20).map(c => c.volume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = candles[candles.length - 1]?.volume || 0;

    if (currentVolume > avgVolume * 2) {
      score += 10;
      signals.push('Volume spike (2x average)');
    } else if (currentVolume > avgVolume * 1.5) {
      score += 5;
      signals.push('Above average volume');
    } else if (currentVolume < avgVolume * 0.5) {
      score -= 5;
      signals.push('Low volume - weak conviction');
    }

    // CMF (Chaikin Money Flow)
    const cmf = this.indicatorsService.calculateCMF(candles);
    if (cmf.value) {
      if (cmf.value > 0.1) {
        score += 5;
        signals.push('CMF positive - buying pressure');
      } else if (cmf.value < -0.1) {
        score -= 5;
        signals.push('CMF negative - selling pressure');
      }
    }

    // ── ML Layer 4: Institutional Flow (BVC + VPIN) ──
    if (flow) {
      // BVC buy/sell ratio (major contributor)
      const bvcDirection = (flow.bvcBuyRatio - 0.5) * 2; // -1 to +1
      score += Math.round(bvcDirection * 20);

      if (flow.bvcBuyRatio > 0.6) {
        signals.push(`BVC: Buy-initiated ${(flow.bvcBuyRatio * 100).toFixed(0)}%`);
      } else if (flow.bvcBuyRatio < 0.4) {
        signals.push(`BVC: Sell-initiated ${((1 - flow.bvcBuyRatio) * 100).toFixed(0)}%`);
      }

      // VPIN (informed trading probability)
      if (flow.vpin > 0.6) {
        signals.push(`VPIN: High informed trading (${(flow.vpin * 100).toFixed(0)}%)`);
        // High VPIN amplifies the BVC direction
        score += Math.round(bvcDirection * 5);
      }

      // Whale activity
      if (flow.whaleActivity > 0.3) {
        signals.push(`Whale activity: ${flow.smartMoneyDirection}`);
        if (flow.smartMoneyDirection === 'accumulating') score += 10;
        else if (flow.smartMoneyDirection === 'distributing') score -= 10;
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
      name: 'Volume',
      score,
      confidence: flow ? 82 : 70, // Higher confidence with institutional flow data
      signals: signals.slice(0, 6),
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

  private async analyzeOnchainLayer(_symbol: string): Promise<MLISLayer | null> {
    try {
      const tvl = await getDeFiTvl();
      const signals: string[] = [];

      // Score DeFi TVL trend: 7d change drives the signal
      const change7d = tvl.change7d;
      let score: number;

      if (change7d >= 10) {
        score = 82;
        signals.push(`DeFi TVL surging +${change7d.toFixed(1)}% in 7d — strong on-chain inflow`);
      } else if (change7d >= 5) {
        score = 68;
        signals.push(`DeFi TVL growing +${change7d.toFixed(1)}% in 7d — healthy on-chain activity`);
      } else if (change7d >= 1) {
        score = 57;
        signals.push(`DeFi TVL up +${change7d.toFixed(1)}% in 7d — mild on-chain expansion`);
      } else if (change7d >= -3) {
        score = 48;
        signals.push(`DeFi TVL flat (${change7d.toFixed(1)}% 7d) — neutral on-chain activity`);
      } else if (change7d >= -8) {
        score = 35;
        signals.push(`DeFi TVL contracting ${change7d.toFixed(1)}% in 7d — on-chain outflow`);
      } else {
        score = 22;
        signals.push(`DeFi TVL falling sharply ${change7d.toFixed(1)}% in 7d — significant on-chain exit`);
      }

      // Additional signal from 30d trend
      if (tvl.change30d > 15) {
        signals.push(`Strong 30d TVL trend: +${tvl.change30d.toFixed(1)}%`);
        score = Math.min(100, score + 5);
      } else if (tvl.change30d < -15) {
        signals.push(`Weak 30d TVL trend: ${tvl.change30d.toFixed(1)}%`);
        score = Math.max(0, score - 5);
      }

      // Confidence scales with the magnitude of the signal
      const confidence = Math.round(50 + Math.min(40, Math.abs(change7d) * 2));

      return {
        name: 'Onchain',
        score,
        confidence,
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
