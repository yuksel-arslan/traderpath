// ===========================================
// Stocks Analyzer Service
// Specialized analysis for equities and indices
// ===========================================

import { logger } from '../../../../core/logger';
import {
  StocksMetrics,
  MetricValue,
  SignalDirection,
  STOCKS_METRIC_WEIGHTS,
} from '../../types/asset-metrics.types';

// ===========================================
// Yahoo Finance Helper
// ===========================================

async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  change7d: number;
  volume: number;
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
    const volumes = quotes.indicators?.quote?.[0]?.volume || [];
    const validCloses = closes.filter((c: number | null) => c !== null);

    if (validCloses.length < 2) return null;

    const currentPrice = validCloses[validCloses.length - 1];
    const prevPrice = validCloses[validCloses.length - 2];
    const weekAgoPrice = validCloses[Math.max(0, validCloses.length - 6)];
    const latestVolume = volumes[volumes.length - 1] || 0;

    return {
      price: currentPrice,
      change: ((currentPrice - prevPrice) / prevPrice) * 100,
      change7d: ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100,
      volume: latestVolume,
    };
  } catch (error) {
    logger.error({ error, symbol }, '[StocksAnalyzer] Yahoo fetch failed');
    return null;
  }
}

// ===========================================
// FRED API Helper
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
    logger.error({ error, seriesId }, '[StocksAnalyzer] FRED fetch failed');
    return null;
  }
}

// ===========================================
// STOCKS ANALYZER CLASS
// ===========================================

export class StocksAnalyzerService {
  /**
   * Analyze a stock or index with equity-specific metrics
   */
  async analyze(symbol: string): Promise<StocksMetrics> {
    logger.info({ symbol }, '[StocksAnalyzer] Starting stocks analysis');

    const metrics: MetricValue[] = [];
    const keyDrivers: string[] = [];
    const warnings: string[] = [];

    // 1. VIX - Volatility/Fear (20% weight)
    const vix = await this.analyzeVIX();
    metrics.push(vix.metric);
    if (vix.keyDriver) keyDrivers.push(vix.keyDriver);

    // 2. Put/Call Ratio (15% weight)
    const putCall = await this.analyzePutCallRatio();
    metrics.push(putCall.metric);
    if (putCall.keyDriver) keyDrivers.push(putCall.keyDriver);

    // 3. Market Breadth (15% weight)
    const breadth = await this.analyzeMarketBreadth();
    metrics.push(breadth.metric);
    if (breadth.keyDriver) keyDrivers.push(breadth.keyDriver);

    // 4. Sector Rotation (15% weight)
    const sector = await this.analyzeSectorRotation();
    metrics.push(sector.metric);
    if (sector.keyDriver) keyDrivers.push(sector.keyDriver);

    // 5. 10Y Treasury Yield (10% weight)
    const yields = await this.analyzeYields();
    metrics.push(yields.metric);
    if (yields.keyDriver) keyDrivers.push(yields.keyDriver);

    // 6. DXY - Dollar Index (10% weight)
    const dxy = await this.analyzeDXY();
    metrics.push(dxy.metric);
    if (dxy.keyDriver) keyDrivers.push(dxy.keyDriver);

    // Calculate weighted sentiment
    const { sentiment, sentimentScore } = this.calculateSentiment(metrics);

    // Detect anomalies
    this.detectAnomalies(vix.metric.signal, dxy.metric.signal, warnings);

    const result: StocksMetrics = {
      assetClass: 'stocks',
      symbol,
      metrics,
      sentiment,
      sentimentScore,
      keyDrivers: keyDrivers.slice(0, 5),
      warnings,
      analyzedAt: new Date(),

      // Detailed metrics
      vix: vix.value,
      vixTrend: vix.trend,
      vixSignal: vix.metric.signal,

      putCallRatio: putCall.value,
      putCallSignal: putCall.metric.signal,

      advanceDecline: breadth.adRatio,
      newHighsLows: breadth.newHighsLows,
      breadthSignal: breadth.metric.signal,

      leadingSector: sector.leading,
      sectorRotation: sector.rotation,

      tenYearYield: yields.value,
      tenYearTrend: yields.trend,
      yieldSignal: yields.metric.signal,

      dxyIndex: dxy.value,
      dxySignal: dxy.metric.signal,

      earningsSurprise: 'inline', // Would need earnings data
      forwardPE: 0, // Would need valuation data

      institutionalFlow: 'neutral', // Would need flow data
    };

    logger.info({
      symbol,
      sentiment,
      sentimentScore,
      vix: vix.value,
    }, '[StocksAnalyzer] Analysis complete');

    return result;
  }

  /**
   * Analyze VIX - Fear gauge for stocks
   * Low VIX = complacency = bullish, High VIX = fear = bearish (but contrarian bullish)
   */
  private async analyzeVIX(): Promise<{
    metric: MetricValue;
    value: number;
    trend: 'up' | 'down' | 'flat';
    keyDriver?: string;
  }> {
    const quote = await fetchYahooQuote('^VIX');
    const value = quote?.price || 20;
    const change = quote?.change || 0;
    const trend: 'up' | 'down' | 'flat' = change > 5 ? 'up' : change < -5 ? 'down' : 'flat';

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (value < 15) {
      signal = 'bullish';
      keyDriver = `Low volatility (VIX: ${value.toFixed(1)}) - favorable for stocks`;
    } else if (value > 30) {
      signal = 'bearish';
      keyDriver = `High fear (VIX: ${value.toFixed(1)}) - elevated risk`;
      // Note: Contrarian view would be bullish at extremes
    } else if (value > 25) {
      signal = 'bearish';
      keyDriver = `Elevated volatility (VIX: ${value.toFixed(1)})`;
    }

    return {
      metric: {
        name: 'VIX',
        value,
        weight: STOCKS_METRIC_WEIGHTS.vix,
        signal,
        source: 'Yahoo Finance',
        description: value < 15 ? 'Low fear' : value > 25 ? 'High fear' : 'Normal volatility',
        trend,
      },
      value,
      trend,
      keyDriver,
    };
  }

  /**
   * Analyze Put/Call Ratio
   * High PCR (>1) = bearish sentiment = contrarian bullish
   * Low PCR (<0.7) = bullish sentiment = contrarian bearish
   */
  private async analyzePutCallRatio(): Promise<{
    metric: MetricValue;
    value: number;
    keyDriver?: string;
  }> {
    // CBOE Total Put/Call Ratio - would need CBOE data
    // Using proxy estimate based on VIX/SPY relationship
    const vixQuote = await fetchYahooQuote('^VIX');
    const vix = vixQuote?.price || 20;

    // Estimate PCR from VIX (rough approximation)
    const value = 0.5 + (vix / 50);

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (value > 1.1) {
      signal = 'bullish'; // Contrarian: extreme bearish sentiment = buy signal
      keyDriver = `High put/call ratio (${value.toFixed(2)}) - contrarian bullish`;
    } else if (value < 0.7) {
      signal = 'bearish'; // Contrarian: extreme bullish sentiment = caution
      keyDriver = `Low put/call ratio (${value.toFixed(2)}) - complacency warning`;
    }

    return {
      metric: {
        name: 'Put/Call Ratio',
        value,
        weight: STOCKS_METRIC_WEIGHTS.putCallRatio,
        signal,
        source: 'Estimated',
        description: value > 1 ? 'Bearish sentiment' : value < 0.7 ? 'Bullish sentiment' : 'Neutral',
      },
      value,
      keyDriver,
    };
  }

  /**
   * Analyze Market Breadth
   * Strong breadth = healthy rally, Weak breadth = narrow rally (risky)
   */
  private async analyzeMarketBreadth(): Promise<{
    metric: MetricValue;
    adRatio: number;
    newHighsLows: number;
    keyDriver?: string;
  }> {
    // Compare SPY vs equal-weight RSP as breadth proxy
    const spyQuote = await fetchYahooQuote('SPY');
    const rspQuote = await fetchYahooQuote('RSP'); // Equal-weight S&P 500

    const spyChange = spyQuote?.change7d || 0;
    const rspChange = rspQuote?.change7d || 0;

    // If RSP outperforms SPY, breadth is strong (broad participation)
    const breadthDiff = rspChange - spyChange;
    const adRatio = 1 + (breadthDiff / 10); // Normalize to ~1.0

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (breadthDiff > 1) {
      signal = 'bullish';
      keyDriver = 'Strong market breadth - broad participation in rally';
    } else if (breadthDiff < -2) {
      signal = 'bearish';
      keyDriver = 'Weak breadth - narrow rally led by few stocks';
    }

    return {
      metric: {
        name: 'Market Breadth',
        value: adRatio,
        weight: STOCKS_METRIC_WEIGHTS.breadth,
        signal,
        source: 'Yahoo Finance (SPY vs RSP)',
        description: breadthDiff > 0 ? 'Broad participation' : 'Narrow leadership',
      },
      adRatio,
      newHighsLows: 0, // Would need NYSE data
      keyDriver,
    };
  }

  /**
   * Analyze Sector Rotation
   * Cyclical leadership = risk-on, Defensive leadership = risk-off
   */
  private async analyzeSectorRotation(): Promise<{
    metric: MetricValue;
    leading: string;
    rotation: 'defensive' | 'cyclical' | 'mixed';
    keyDriver?: string;
  }> {
    // Compare cyclical vs defensive sectors
    const xlk = await fetchYahooQuote('XLK'); // Technology
    const xly = await fetchYahooQuote('XLY'); // Consumer Discretionary
    const xlf = await fetchYahooQuote('XLF'); // Financials
    const xlu = await fetchYahooQuote('XLU'); // Utilities (defensive)
    const xlp = await fetchYahooQuote('XLP'); // Consumer Staples (defensive)

    const cyclicalAvg = ((xlk?.change7d || 0) + (xly?.change7d || 0) + (xlf?.change7d || 0)) / 3;
    const defensiveAvg = ((xlu?.change7d || 0) + (xlp?.change7d || 0)) / 2;

    const rotationDiff = cyclicalAvg - defensiveAvg;

    let rotation: 'defensive' | 'cyclical' | 'mixed' = 'mixed';
    let signal: SignalDirection = 'neutral';
    let leading = 'Mixed';
    let keyDriver: string | undefined;

    if (rotationDiff > 2) {
      rotation = 'cyclical';
      signal = 'bullish';
      leading = 'Technology/Financials';
      keyDriver = 'Cyclical sectors leading - risk-on environment';
    } else if (rotationDiff < -2) {
      rotation = 'defensive';
      signal = 'bearish';
      leading = 'Utilities/Staples';
      keyDriver = 'Defensive sectors leading - risk-off rotation';
    }

    return {
      metric: {
        name: 'Sector Rotation',
        value: rotationDiff,
        weight: STOCKS_METRIC_WEIGHTS.sectorRotation,
        signal,
        source: 'Yahoo Finance (Sector ETFs)',
        description: `${rotation} leadership`,
      },
      leading,
      rotation,
      keyDriver,
    };
  }

  /**
   * Analyze 10-Year Treasury Yield
   * Rising yields can pressure growth stocks, falling yields supportive
   */
  private async analyzeYields(): Promise<{
    metric: MetricValue;
    value: number;
    trend: 'up' | 'down' | 'flat';
    keyDriver?: string;
  }> {
    const value = await fetchFredValue('DGS10') || 4.5;

    // Get recent trend
    const tltQuote = await fetchYahooQuote('TLT');
    const tltChange = tltQuote?.change7d || 0;

    // TLT up = yields down, TLT down = yields up
    const trend: 'up' | 'down' | 'flat' = tltChange < -1 ? 'up' : tltChange > 1 ? 'down' : 'flat';

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (trend === 'down') {
      signal = 'bullish';
      keyDriver = `Falling yields (10Y: ${value.toFixed(2)}%) - supportive for stocks`;
    } else if (trend === 'up' && value > 4.5) {
      signal = 'bearish';
      keyDriver = `Rising yields (10Y: ${value.toFixed(2)}%) - pressures growth stocks`;
    }

    return {
      metric: {
        name: '10Y Treasury Yield',
        value,
        weight: STOCKS_METRIC_WEIGHTS.tenYearYield,
        signal,
        source: 'FRED',
        description: `${value.toFixed(2)}%, ${trend} trend`,
        trend,
      },
      value,
      trend,
      keyDriver,
    };
  }

  /**
   * Analyze DXY - Dollar Index
   * Weak dollar generally supportive for US stocks (especially multinationals)
   */
  private async analyzeDXY(): Promise<{
    metric: MetricValue;
    value: number;
    keyDriver?: string;
  }> {
    const quote = await fetchYahooQuote('DX-Y.NYB');
    const value = quote?.price || 104;
    const change = quote?.change7d || 0;

    let signal: SignalDirection = 'neutral';
    let keyDriver: string | undefined;

    if (change < -1) {
      signal = 'bullish';
      keyDriver = 'Weakening dollar - supportive for multinationals';
    } else if (change > 1.5) {
      signal = 'bearish';
      keyDriver = 'Strong dollar - headwind for earnings';
    }

    return {
      metric: {
        name: 'DXY (Dollar Index)',
        value,
        weight: STOCKS_METRIC_WEIGHTS.dxy,
        signal,
        source: 'Yahoo Finance',
        description: `Dollar at ${value.toFixed(2)}`,
      },
      value,
      keyDriver,
    };
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

  /**
   * Detect anomalies
   */
  private detectAnomalies(
    vixSignal: SignalDirection,
    dxySignal: SignalDirection,
    warnings: string[]
  ): void {
    // High fear but weak dollar is unusual
    if (vixSignal === 'bearish' && dxySignal === 'bullish') {
      warnings.push('ℹ️ High fear with weak dollar - watch for trend reversal');
    }
  }
}

// Export singleton
export const stocksAnalyzer = new StocksAnalyzerService();
