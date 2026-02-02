// ===========================================
// Metals Analyzer Service (Gold, Silver)
// Specialized analysis for precious metals
// ===========================================

import { logger } from '../../../../core/logger';
import {
  MetalsMetrics,
  MetricValue,
  SignalDirection,
  METALS_METRIC_WEIGHTS,
} from '../../types/asset-metrics.types';

// ===========================================
// FRED API for economic data
// ===========================================

const FRED_API_KEY = process.env['FRED_API_KEY'] || '';
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface FredObservation {
  date: string;
  value: string;
}

async function fetchFredSeries(seriesId: string, limit: number = 30): Promise<FredObservation[]> {
  if (!FRED_API_KEY) {
    logger.warn('[MetalsAnalyzer] FRED_API_KEY not set');
    return [];
  }

  try {
    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();
    return data.observations || [];
  } catch (error) {
    logger.error({ error, seriesId }, '[MetalsAnalyzer] FRED fetch failed');
    return [];
  }
}

// ===========================================
// Yahoo Finance for market data
// ===========================================

async function fetchYahooQuote(symbol: string): Promise<{ price: number; change: number; change7d: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=10d`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const quotes = data.chart?.result?.[0];
    if (!quotes) return null;

    const closes = quotes.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter((c: number | null) => c !== null);

    if (validCloses.length < 2) return null;

    const currentPrice = validCloses[validCloses.length - 1];
    const prevPrice = validCloses[validCloses.length - 2];
    const weekAgoPrice = validCloses[Math.max(0, validCloses.length - 6)];

    return {
      price: currentPrice,
      change: ((currentPrice - prevPrice) / prevPrice) * 100,
      change7d: ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100,
    };
  } catch (error) {
    logger.error({ error, symbol }, '[MetalsAnalyzer] Yahoo fetch failed');
    return null;
  }
}

// ===========================================
// METALS ANALYZER CLASS
// ===========================================

export class MetalsAnalyzerService {
  /**
   * Analyze a metal asset (Gold, Silver) with metal-specific metrics
   */
  async analyze(symbol: string): Promise<MetalsMetrics> {
    logger.info({ symbol }, '[MetalsAnalyzer] Starting metals analysis');

    const metrics: MetricValue[] = [];
    const keyDrivers: string[] = [];
    const warnings: string[] = [];

    // 1. DXY - US Dollar Index (25% weight) - PRIMARY DRIVER
    const dxy = await this.analyzeDXY();
    metrics.push(dxy.metric);
    if (dxy.keyDriver) keyDrivers.push(dxy.keyDriver);
    if (dxy.warning) warnings.push(dxy.warning);

    // 2. Real Yields - TIPS (20% weight) - SECONDARY DRIVER
    const realYields = await this.analyzeRealYields();
    metrics.push(realYields.metric);
    if (realYields.keyDriver) keyDrivers.push(realYields.keyDriver);
    if (realYields.warning) warnings.push(realYields.warning);

    // 3. VIX - Fear Gauge (15% weight)
    const vix = await this.analyzeVIX();
    metrics.push(vix.metric);
    if (vix.keyDriver) keyDrivers.push(vix.keyDriver);
    if (vix.warning) warnings.push(vix.warning);

    // 4. Inflation Expectations (15% weight)
    const inflation = await this.analyzeInflationExpectations();
    metrics.push(inflation.metric);
    if (inflation.keyDriver) keyDrivers.push(inflation.keyDriver);

    // 5. Gold ETF Flows proxy (10% weight) - using GLD volume
    const etfFlows = await this.analyzeETFFlows();
    metrics.push(etfFlows.metric);
    if (etfFlows.keyDriver) keyDrivers.push(etfFlows.keyDriver);

    // 6. Silver/Gold Ratio (5% weight)
    const silverGold = await this.analyzeSilverGoldRatio(symbol);
    metrics.push(silverGold.metric);
    if (silverGold.keyDriver) keyDrivers.push(silverGold.keyDriver);

    // Calculate weighted sentiment score
    const { sentiment, sentimentScore } = this.calculateSentiment(metrics);

    // Cross-check for anomalies
    this.detectAnomalies(
      dxy.metric.signal,
      vix.metric.signal,
      sentiment,
      warnings
    );

    const result: MetalsMetrics = {
      assetClass: 'metals',
      symbol,
      metrics,
      sentiment,
      sentimentScore,
      keyDrivers: keyDrivers.slice(0, 5),
      warnings,
      analyzedAt: new Date(),

      // Detailed metrics
      dxyIndex: dxy.value,
      dxyChange7d: dxy.change7d,
      dxyTrend: dxy.trend,
      dxySignal: dxy.metric.signal,

      realYields: realYields.value,
      realYieldsTrend: realYields.trend,
      realYieldsSignal: realYields.metric.signal,

      vix: vix.value,
      vixSignal: vix.metric.signal,

      inflationExpectations: inflation.value,
      inflationTrend: inflation.trend,
      inflationSignal: inflation.metric.signal,

      etfFlows: etfFlows.flowDirection,
      etfFlowsAmount: etfFlows.amount,
      centralBankBuying: false, // Would need separate data source

      silverGoldRatio: silverGold.ratio,
      silverGoldSignal: silverGold.metric.signal,

      geopoliticalRisk: 'medium', // Would need separate analysis
    };

    logger.info({
      symbol,
      sentiment,
      sentimentScore,
      dxySignal: dxy.metric.signal,
      realYieldsSignal: realYields.metric.signal,
      vixSignal: vix.metric.signal,
    }, '[MetalsAnalyzer] Analysis complete');

    return result;
  }

  /**
   * Analyze US Dollar Index - PRIMARY driver for gold
   * Gold has strong inverse correlation with USD
   */
  private async analyzeDXY(): Promise<{
    metric: MetricValue;
    value: number;
    change7d: number;
    trend: 'up' | 'down' | 'flat';
    keyDriver?: string;
    warning?: string;
  }> {
    const quote = await fetchYahooQuote('DX-Y.NYB'); // DXY futures
    const fallbackQuote = quote || await fetchYahooQuote('UUP'); // Dollar ETF as fallback

    const value = fallbackQuote?.price || 104;
    const change7d = fallbackQuote?.change7d || 0;
    const trend: 'up' | 'down' | 'flat' = change7d > 0.5 ? 'up' : change7d < -0.5 ? 'down' : 'flat';

    // DXY falling = bullish for gold (inverse relationship)
    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (change7d < -1) {
      signal = 'bullish';
      keyDriver = `USD weakening (${change7d.toFixed(1)}% weekly) - supports gold prices`;
    } else if (change7d > 1) {
      signal = 'bearish';
      keyDriver = `USD strengthening (${change7d.toFixed(1)}% weekly) - pressures gold`;
    }

    return {
      metric: {
        name: 'DXY (Dollar Index)',
        value,
        weight: METALS_METRIC_WEIGHTS.dxy,
        signal,
        source: 'Yahoo Finance',
        description: `Dollar Index at ${value.toFixed(2)}, ${trend} trend`,
        trend,
      },
      value,
      change7d,
      trend,
      keyDriver,
    };
  }

  /**
   * Analyze Real Yields (TIPS) - SECONDARY driver
   * Negative real yields = bullish for gold (no opportunity cost)
   */
  private async analyzeRealYields(): Promise<{
    metric: MetricValue;
    value: number;
    trend: 'up' | 'down' | 'flat';
    keyDriver?: string;
    warning?: string;
  }> {
    // DFII10 = 10-Year Treasury Inflation-Indexed Security
    const observations = await fetchFredSeries('DFII10', 10);
    const validObs = observations.filter(o => o.value !== '.');

    let value = 1.5; // Default
    let prevValue = 1.5;

    if (validObs.length >= 2) {
      value = parseFloat(validObs[0].value);
      prevValue = parseFloat(validObs[1].value);
    }

    const change = value - prevValue;
    const trend: 'up' | 'down' | 'flat' = change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'flat';

    // Negative/falling real yields = bullish for gold
    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (value < 0) {
      signal = 'bullish';
      keyDriver = `Negative real yields (${value.toFixed(2)}%) - gold attractive vs bonds`;
    } else if (value < 1 && trend === 'down') {
      signal = 'bullish';
      keyDriver = `Real yields falling (${value.toFixed(2)}%) - supports gold`;
    } else if (value > 2) {
      signal = 'bearish';
      keyDriver = `High real yields (${value.toFixed(2)}%) - bonds more attractive than gold`;
    } else if (trend === 'up') {
      signal = 'bearish';
      keyDriver = `Real yields rising - headwind for gold`;
    }

    return {
      metric: {
        name: 'Real Yields (10Y TIPS)',
        value,
        weight: METALS_METRIC_WEIGHTS.realYields,
        signal,
        source: 'FRED',
        description: `Real yields at ${value.toFixed(2)}%, ${trend} trend`,
        trend,
      },
      value,
      trend,
      keyDriver,
    };
  }

  /**
   * Analyze VIX - Fear gauge
   * High VIX = safe haven demand = bullish for gold
   */
  private async analyzeVIX(): Promise<{
    metric: MetricValue;
    value: number;
    keyDriver?: string;
    warning?: string;
  }> {
    const quote = await fetchYahooQuote('^VIX');
    const value = quote?.price || 20;

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (value > 30) {
      signal = 'bullish';
      keyDriver = `High fear (VIX: ${value.toFixed(1)}) - strong safe haven demand`;
    } else if (value > 25) {
      signal = 'bullish';
      keyDriver = `Elevated fear (VIX: ${value.toFixed(1)}) - supports gold`;
    } else if (value < 15) {
      signal = 'bearish';
      keyDriver = `Low fear (VIX: ${value.toFixed(1)}) - reduced safe haven demand`;
    }

    return {
      metric: {
        name: 'VIX (Fear Index)',
        value,
        weight: METALS_METRIC_WEIGHTS.vix,
        signal,
        source: 'Yahoo Finance',
        description: value > 25 ? 'High fear environment' : value < 15 ? 'Complacency' : 'Normal volatility',
      },
      value,
      keyDriver,
    };
  }

  /**
   * Analyze Inflation Expectations
   * Higher inflation expectations = bullish for gold (inflation hedge)
   */
  private async analyzeInflationExpectations(): Promise<{
    metric: MetricValue;
    value: number;
    trend: 'up' | 'down' | 'flat';
    keyDriver?: string;
  }> {
    // T10YIE = 10-Year Breakeven Inflation Rate
    const observations = await fetchFredSeries('T10YIE', 10);
    const validObs = observations.filter(o => o.value !== '.');

    let value = 2.3; // Default
    let prevValue = 2.3;

    if (validObs.length >= 2) {
      value = parseFloat(validObs[0].value);
      prevValue = parseFloat(validObs[1].value);
    }

    const change = value - prevValue;
    const trend: 'up' | 'down' | 'flat' = change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'flat';

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (value > 2.5) {
      signal = 'bullish';
      keyDriver = `Elevated inflation expectations (${value.toFixed(2)}%) - gold as inflation hedge`;
    } else if (value > 2.2 && trend === 'up') {
      signal = 'bullish';
      keyDriver = `Rising inflation expectations - supports gold`;
    } else if (value < 1.8) {
      signal = 'bearish';
      keyDriver = `Low inflation expectations (${value.toFixed(2)}%) - reduces gold appeal`;
    }

    return {
      metric: {
        name: 'Inflation Expectations',
        value,
        weight: METALS_METRIC_WEIGHTS.inflation,
        signal,
        source: 'FRED',
        description: `10Y breakeven at ${value.toFixed(2)}%`,
        trend,
      },
      value,
      trend,
      keyDriver,
    };
  }

  /**
   * Analyze ETF flows (proxy via GLD volume/price action)
   */
  private async analyzeETFFlows(): Promise<{
    metric: MetricValue;
    flowDirection: 'inflow' | 'outflow' | 'neutral';
    amount: number;
    keyDriver?: string;
  }> {
    // Using price change as proxy for flows
    const quote = await fetchYahooQuote('GLD');
    const change = quote?.change7d || 0;

    let flowDirection: 'inflow' | 'outflow' | 'neutral' = 'neutral';
    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (change > 2) {
      flowDirection = 'inflow';
      signal = 'bullish';
      keyDriver = 'Strong ETF inflows indicated by price action';
    } else if (change < -2) {
      flowDirection = 'outflow';
      signal = 'bearish';
      keyDriver = 'ETF outflows indicated by price action';
    }

    return {
      metric: {
        name: 'Gold ETF Flows',
        value: change,
        weight: METALS_METRIC_WEIGHTS.etfFlows,
        signal,
        source: 'Yahoo Finance (GLD)',
        description: flowDirection === 'inflow' ? 'Positive flows' : flowDirection === 'outflow' ? 'Negative flows' : 'Neutral flows',
      },
      flowDirection,
      amount: 0, // Would need actual flow data
      keyDriver,
    };
  }

  /**
   * Analyze Silver/Gold ratio for relative value
   */
  private async analyzeSilverGoldRatio(symbol: string): Promise<{
    metric: MetricValue;
    ratio: number;
    keyDriver?: string;
  }> {
    const goldQuote = await fetchYahooQuote('GC=F'); // Gold futures
    const silverQuote = await fetchYahooQuote('SI=F'); // Silver futures

    let ratio = 80; // Historical average around 60-80
    if (goldQuote?.price && silverQuote?.price) {
      ratio = goldQuote.price / silverQuote.price;
    }

    // Historical average is ~60-80
    // High ratio (>80) = silver undervalued relative to gold
    // Low ratio (<60) = silver overvalued relative to gold
    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (symbol.toUpperCase().includes('SLV') || symbol.toUpperCase().includes('SILVER')) {
      // Analyzing silver
      if (ratio > 85) {
        signal = 'bullish';
        keyDriver = `Silver undervalued vs gold (ratio: ${ratio.toFixed(1)})`;
      } else if (ratio < 60) {
        signal = 'bearish';
        keyDriver = `Silver overvalued vs gold (ratio: ${ratio.toFixed(1)})`;
      }
    } else {
      // Analyzing gold - ratio less relevant
      signal = 'neutral';
    }

    return {
      metric: {
        name: 'Silver/Gold Ratio',
        value: ratio,
        weight: METALS_METRIC_WEIGHTS.silverGoldRatio,
        signal,
        source: 'Yahoo Finance',
        description: `Gold/Silver ratio at ${ratio.toFixed(1)} (historical avg: 60-80)`,
      },
      ratio,
      keyDriver,
    };
  }

  /**
   * Calculate overall sentiment from weighted metrics
   */
  private calculateSentiment(metrics: MetricValue[]): {
    sentiment: SignalDirection;
    sentimentScore: number;
  } {
    let bullishWeight = 0;
    let bearishWeight = 0;
    let totalWeight = 0;

    for (const metric of metrics) {
      totalWeight += metric.weight;
      if (metric.signal === 'bullish') {
        bullishWeight += metric.weight;
      } else if (metric.signal === 'bearish') {
        bearishWeight += metric.weight;
      }
    }

    const bullishRatio = totalWeight > 0 ? bullishWeight / totalWeight : 0;
    const bearishRatio = totalWeight > 0 ? bearishWeight / totalWeight : 0;

    // Convert to 0-100 score
    const sentimentScore = Math.round(50 + (bullishRatio - bearishRatio) * 50);

    let sentiment: SignalDirection = 'neutral';
    if (sentimentScore > 60) {
      sentiment = 'bullish';
    } else if (sentimentScore < 40) {
      sentiment = 'bearish';
    }

    return { sentiment, sentimentScore };
  }

  /**
   * Detect anomalies in market behavior
   */
  private detectAnomalies(
    dxySignal: SignalDirection,
    vixSignal: SignalDirection,
    overallSentiment: SignalDirection,
    warnings: string[]
  ): void {
    // Anomaly: High fear (VIX bullish for gold) but dollar also strong (DXY bearish for gold)
    if (vixSignal === 'bullish' && dxySignal === 'bearish') {
      warnings.push('⚠️ Unusual: High fear but strong dollar - possible liquidity event');
    }

    // Anomaly: Low fear but weak dollar (mixed signals)
    if (vixSignal === 'bearish' && dxySignal === 'bullish') {
      warnings.push('ℹ️ Dollar weakness without fear - watch for trend confirmation');
    }
  }
}

// Export singleton instance
export const metalsAnalyzer = new MetalsAnalyzerService();
