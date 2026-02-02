// ===========================================
// Bonds Analyzer Service
// Specialized analysis for fixed income
// ===========================================

import { logger } from '../../../../core/logger';
import {
  BondsMetrics,
  MetricValue,
  SignalDirection,
  BONDS_METRIC_WEIGHTS,
} from '../../types/asset-metrics.types';

// ===========================================
// API Helpers
// ===========================================

const FRED_API_KEY = process.env['FRED_API_KEY'] || '';

async function fetchFredValue(seriesId: string): Promise<number | null> {
  if (!FRED_API_KEY) return null;

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) return null;

    const data = await response.json();
    const validObs = data.observations?.filter((o: { value: string }) => o.value !== '.');

    if (validObs && validObs.length > 0) {
      return parseFloat(validObs[0].value);
    }
    return null;
  } catch (error) {
    logger.error({ error, seriesId }, '[BondsAnalyzer] FRED fetch failed');
    return null;
  }
}

async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  change7d: number;
} | null> {
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
    logger.error({ error, symbol }, '[BondsAnalyzer] Yahoo fetch failed');
    return null;
  }
}

// ===========================================
// BONDS ANALYZER CLASS
// ===========================================

export class BondsAnalyzerService {
  /**
   * Analyze a bond/fixed income asset with bond-specific metrics
   */
  async analyze(symbol: string): Promise<BondsMetrics> {
    logger.info({ symbol }, '[BondsAnalyzer] Starting bonds analysis');

    const metrics: MetricValue[] = [];
    const keyDrivers: string[] = [];
    const warnings: string[] = [];

    // 1. Yield Curve (25% weight) - PRIMARY DRIVER
    const yieldCurve = await this.analyzeYieldCurve();
    metrics.push(yieldCurve.metric);
    if (yieldCurve.keyDriver) keyDrivers.push(yieldCurve.keyDriver);
    if (yieldCurve.warning) warnings.push(yieldCurve.warning);

    // 2. Fed Policy (20% weight)
    const fedPolicy = await this.analyzeFedPolicy();
    metrics.push(fedPolicy.metric);
    if (fedPolicy.keyDriver) keyDrivers.push(fedPolicy.keyDriver);

    // 3. Inflation (15% weight)
    const inflation = await this.analyzeInflation();
    metrics.push(inflation.metric);
    if (inflation.keyDriver) keyDrivers.push(inflation.keyDriver);

    // 4. Credit Spreads (15% weight)
    const creditSpreads = await this.analyzeCreditSpreads();
    metrics.push(creditSpreads.metric);
    if (creditSpreads.keyDriver) keyDrivers.push(creditSpreads.keyDriver);

    // 5. Flight to Safety (15% weight)
    const flightToSafety = await this.analyzeFlightToSafety();
    metrics.push(flightToSafety.metric);
    if (flightToSafety.keyDriver) keyDrivers.push(flightToSafety.keyDriver);

    // Calculate weighted sentiment
    const { sentiment, sentimentScore } = this.calculateSentiment(metrics);

    const result: BondsMetrics = {
      assetClass: 'bonds',
      symbol,
      metrics,
      sentiment,
      sentimentScore,
      keyDrivers: keyDrivers.slice(0, 5),
      warnings,
      analyzedAt: new Date(),

      // Detailed metrics
      yieldCurveSpread: yieldCurve.spread,
      yieldCurveStatus: yieldCurve.status,
      yieldCurveSignal: yieldCurve.metric.signal,

      fedFundsRate: fedPolicy.fedFundsRate,
      fedExpectation: fedPolicy.expectation,
      nextFedMove: fedPolicy.nextMove,
      fedSignal: fedPolicy.metric.signal,

      cpiYoY: inflation.cpi,
      pceYoY: inflation.pce,
      inflationTrend: inflation.trend,
      inflationSignal: inflation.metric.signal,

      creditSpread: creditSpreads.igSpread,
      highYieldSpread: creditSpreads.hySpread,
      creditSignal: creditSpreads.metric.signal,

      flightToSafety: flightToSafety.active,
      tltTrend: flightToSafety.tltTrend,

      durationRisk: this.calculateDurationRisk(yieldCurve.spread, fedPolicy.expectation),
      convexity: 0, // Would need bond-specific calculation
    };

    logger.info({
      symbol,
      sentiment,
      sentimentScore,
      yieldCurveStatus: yieldCurve.status,
    }, '[BondsAnalyzer] Analysis complete');

    return result;
  }

  /**
   * Analyze Yield Curve - PRIMARY DRIVER for bonds
   * Inverted curve = recession signal, steepening = economic recovery
   */
  private async analyzeYieldCurve(): Promise<{
    metric: MetricValue;
    spread: number;
    status: 'normal' | 'flat' | 'inverted';
    keyDriver?: string;
    warning?: string;
  }> {
    const twoYear = await fetchFredValue('DGS2') || 4.5;
    const tenYear = await fetchFredValue('DGS10') || 4.3;

    const spread = tenYear - twoYear;

    let status: 'normal' | 'flat' | 'inverted';
    let signal: SignalDirection;
    let keyDriver: string | undefined;
    let warning: string | undefined;

    if (spread < -0.2) {
      status = 'inverted';
      signal = 'bearish'; // For economy, but bonds can rally
      keyDriver = `Inverted yield curve (${spread.toFixed(2)}%) - recession warning`;
      warning = '⚠️ Yield curve inverted - historically precedes recession';
    } else if (spread < 0.3) {
      status = 'flat';
      signal = 'neutral';
      keyDriver = `Flat yield curve (${spread.toFixed(2)}%) - uncertainty`;
    } else {
      status = 'normal';
      signal = 'bullish'; // Normal curve = healthy economy
      keyDriver = `Normal yield curve (${spread.toFixed(2)}%) - healthy`;
    }

    return {
      metric: {
        name: 'Yield Curve (10Y-2Y)',
        value: spread,
        weight: BONDS_METRIC_WEIGHTS.yieldCurve,
        signal,
        source: 'FRED',
        description: `Spread: ${spread.toFixed(2)}% (${status})`,
      },
      spread,
      status,
      keyDriver,
      warning,
    };
  }

  /**
   * Analyze Fed Policy
   * Dovish = bullish for bonds, Hawkish = bearish for bonds
   */
  private async analyzeFedPolicy(): Promise<{
    metric: MetricValue;
    fedFundsRate: number;
    expectation: 'hawkish' | 'dovish' | 'neutral';
    nextMove: 'hike' | 'cut' | 'hold';
    keyDriver?: string;
  }> {
    const fedFundsRate = await fetchFredValue('FEDFUNDS') || 5.25;

    // Estimate Fed expectation from recent rate trend
    // In reality, would use Fed Funds Futures
    let expectation: 'hawkish' | 'dovish' | 'neutral' = 'neutral';
    let nextMove: 'hike' | 'cut' | 'hold' = 'hold';
    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (fedFundsRate > 5) {
      // High rates, likely near peak
      expectation = 'neutral';
      nextMove = 'hold';
      keyDriver = `Fed Funds at ${fedFundsRate.toFixed(2)}% - likely near peak`;
    } else if (fedFundsRate > 4) {
      expectation = 'hawkish';
      nextMove = 'hold';
      signal = 'bearish';
      keyDriver = 'Elevated rates persisting';
    } else {
      expectation = 'dovish';
      nextMove = 'cut';
      signal = 'bullish';
      keyDriver = 'Fed likely to ease - bullish for bonds';
    }

    return {
      metric: {
        name: 'Fed Policy',
        value: fedFundsRate,
        weight: BONDS_METRIC_WEIGHTS.fedPolicy,
        signal,
        source: 'FRED',
        description: `Fed Funds: ${fedFundsRate.toFixed(2)}%, ${expectation}`,
      },
      fedFundsRate,
      expectation,
      nextMove,
      keyDriver,
    };
  }

  /**
   * Analyze Inflation
   * Falling inflation = bullish for bonds (real return improves)
   */
  private async analyzeInflation(): Promise<{
    metric: MetricValue;
    cpi: number;
    pce: number;
    trend: 'up' | 'down' | 'flat';
    keyDriver?: string;
  }> {
    const cpi = await fetchFredValue('CPIAUCSL') || 3.5; // CPI YoY would need calculation
    const pce = await fetchFredValue('PCEPI') || 3.0;

    // Using breakeven inflation as proxy for trend
    const breakeven = await fetchFredValue('T10YIE') || 2.3;

    let trend: 'up' | 'down' | 'flat' = 'flat';
    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (breakeven > 2.5) {
      trend = 'up';
      signal = 'bearish';
      keyDriver = `Elevated inflation expectations (${breakeven.toFixed(2)}%) - negative for bonds`;
    } else if (breakeven < 2.0) {
      trend = 'down';
      signal = 'bullish';
      keyDriver = `Low inflation expectations (${breakeven.toFixed(2)}%) - positive for bonds`;
    }

    return {
      metric: {
        name: 'Inflation Expectations',
        value: breakeven,
        weight: BONDS_METRIC_WEIGHTS.inflation,
        signal,
        source: 'FRED',
        description: `Breakeven: ${breakeven.toFixed(2)}%`,
        trend,
      },
      cpi: cpi,
      pce: pce,
      trend,
      keyDriver,
    };
  }

  /**
   * Analyze Credit Spreads
   * Widening spreads = risk-off, bullish for treasuries
   * Tightening spreads = risk-on, less demand for safe haven
   */
  private async analyzeCreditSpreads(): Promise<{
    metric: MetricValue;
    igSpread: number;
    hySpread: number;
    keyDriver?: string;
  }> {
    // Compare corporate bond ETFs to treasury ETFs as proxy
    const lqd = await fetchYahooQuote('LQD'); // Investment Grade
    const hyg = await fetchYahooQuote('HYG'); // High Yield
    const tlt = await fetchYahooQuote('TLT'); // Long Treasury

    const lqdChange = lqd?.change7d || 0;
    const hygChange = hyg?.change7d || 0;
    const tltChange = tlt?.change7d || 0;

    // If treasuries outperform corporate, spreads are widening (risk-off)
    const spreadWidening = tltChange - lqdChange;

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (spreadWidening > 1) {
      signal = 'bullish'; // For treasuries
      keyDriver = 'Credit spreads widening - flight to quality';
    } else if (spreadWidening < -1) {
      signal = 'bearish'; // For treasuries
      keyDriver = 'Credit spreads tightening - risk appetite improving';
    }

    return {
      metric: {
        name: 'Credit Spreads',
        value: spreadWidening,
        weight: BONDS_METRIC_WEIGHTS.creditSpreads,
        signal,
        source: 'Yahoo Finance (LQD vs TLT)',
        description: spreadWidening > 0 ? 'Widening' : 'Tightening',
      },
      igSpread: spreadWidening,
      hySpread: hygChange - tltChange,
      keyDriver,
    };
  }

  /**
   * Analyze Flight to Safety
   * When stocks fall and bonds rise = flight to safety = bullish for bonds
   */
  private async analyzeFlightToSafety(): Promise<{
    metric: MetricValue;
    active: boolean;
    tltTrend: 'up' | 'down' | 'flat';
    keyDriver?: string;
  }> {
    const spy = await fetchYahooQuote('SPY');
    const tlt = await fetchYahooQuote('TLT');

    const spyChange = spy?.change7d || 0;
    const tltChange = tlt?.change7d || 0;

    const tltTrend: 'up' | 'down' | 'flat' = tltChange > 1 ? 'up' : tltChange < -1 ? 'down' : 'flat';

    // Flight to safety: stocks down, bonds up
    const flightActive = spyChange < -2 && tltChange > 1;

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (flightActive) {
      signal = 'bullish';
      keyDriver = 'Active flight to safety - strong demand for treasuries';
    } else if (tltTrend === 'up') {
      signal = 'bullish';
      keyDriver = 'Treasury prices rising';
    } else if (tltTrend === 'down') {
      signal = 'bearish';
      keyDriver = 'Treasury prices falling - yields rising';
    }

    return {
      metric: {
        name: 'Flight to Safety',
        value: flightActive ? 1 : 0,
        weight: BONDS_METRIC_WEIGHTS.flightToSafety,
        signal,
        source: 'Yahoo Finance',
        description: flightActive ? 'Active' : 'Inactive',
      },
      active: flightActive,
      tltTrend,
      keyDriver,
    };
  }

  /**
   * Calculate Duration Risk
   */
  private calculateDurationRisk(
    yieldCurveSpread: number,
    fedExpectation: 'hawkish' | 'dovish' | 'neutral'
  ): 'low' | 'medium' | 'high' {
    if (fedExpectation === 'hawkish' && yieldCurveSpread < 0) {
      return 'high';
    } else if (fedExpectation === 'dovish') {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Calculate weighted sentiment
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

    const sentimentScore = Math.round(50 + ((bullishWeight - bearishWeight) / totalWeight) * 50);

    let sentiment: SignalDirection = 'neutral';
    if (sentimentScore > 60) sentiment = 'bullish';
    else if (sentimentScore < 40) sentiment = 'bearish';

    return { sentiment, sentimentScore };
  }
}

// Export singleton
export const bondsAnalyzer = new BondsAnalyzerService();
