// ===========================================
// Asset Analyzer Orchestrator
// Routes analysis to appropriate asset-specific analyzer
// ===========================================

import { logger } from '../../../../core/logger';
import { metalsAnalyzer } from './metals-analyzer.service';
import { stocksAnalyzer } from './stocks-analyzer.service';
import { bondsAnalyzer } from './bonds-analyzer.service';
import {
  AssetClass,
  AssetMetrics,
  CryptoMetrics,
  MetalsMetrics,
  StocksMetrics,
  BondsMetrics,
  detectAssetClass,
  SignalDirection,
  REGIME_EXPECTATIONS,
  MarketRegime,
  InterMarketContext,
  AnomalyDetection,
} from '../../types/asset-metrics.types';

// ===========================================
// ORCHESTRATOR
// ===========================================

export class AssetAnalyzerOrchestrator {
  /**
   * Analyze any asset using the appropriate analyzer
   */
  async analyze(symbol: string): Promise<AssetMetrics> {
    const assetClass = detectAssetClass(symbol);

    logger.info({ symbol, assetClass }, '[Orchestrator] Routing to asset-specific analyzer');

    switch (assetClass) {
      case 'metals':
        return metalsAnalyzer.analyze(symbol);
      case 'stocks':
        return stocksAnalyzer.analyze(symbol);
      case 'bonds':
        return bondsAnalyzer.analyze(symbol);
      case 'crypto':
        // For now, return a basic crypto analysis
        // TODO: Implement dedicated crypto analyzer
        return this.analyzeBasicCrypto(symbol);
      default:
        throw new Error(`Unknown asset class: ${assetClass}`);
    }
  }

  /**
   * Get inter-market context for validation
   */
  async getInterMarketContext(): Promise<InterMarketContext> {
    // Analyze all major markets to determine regime
    const [metals, stocks, bonds] = await Promise.all([
      metalsAnalyzer.analyze('GLD').catch(() => null),
      stocksAnalyzer.analyze('SPY').catch(() => null),
      bondsAnalyzer.analyze('TLT').catch(() => null),
    ]);

    // Determine market regime based on cross-asset behavior
    const regime = this.detectMarketRegime(metals, stocks, bonds);

    // Get expected behavior for this regime
    const expectedBehavior = REGIME_EXPECTATIONS[regime];

    // Actual behavior from analysis
    const actualBehavior = {
      crypto: 'neutral' as SignalDirection, // Would need crypto data
      stocks: stocks?.sentiment || 'neutral',
      metals: metals?.sentiment || 'neutral',
      bonds: bonds?.sentiment || 'neutral',
    };

    // Detect anomalies
    const anomalies = this.detectAnomalies(regime, expectedBehavior, actualBehavior);

    return {
      regime,
      regimeConfidence: this.calculateRegimeConfidence(metals, stocks, bonds),
      expectedBehavior: {
        crypto: expectedBehavior.crypto,
        stocks: expectedBehavior.stocks,
        metals: expectedBehavior.metals,
        bonds: expectedBehavior.bonds,
      },
      actualBehavior,
      correlations: {
        cryptoStocks: 0.7, // Would need actual calculation
        goldDxy: -0.8,
        bondsStocks: -0.5,
        cryptoGold: -0.3,
      },
      anomalies,
    };
  }

  /**
   * Validate an analysis against inter-market context
   */
  async validateAgainstInterMarket(
    symbol: string,
    direction: 'LONG' | 'SHORT',
    sentiment: SignalDirection
  ): Promise<{
    isValid: boolean;
    confidence: number;
    warnings: string[];
  }> {
    const assetClass = detectAssetClass(symbol);
    const context = await this.getInterMarketContext();
    const warnings: string[] = [];

    // Check if sentiment matches expected behavior for regime
    const expected = context.expectedBehavior[assetClass];
    const actual = sentiment;

    // Anomaly: Asset behaving opposite to regime expectation
    if (expected !== 'neutral' && actual !== 'neutral' && expected !== actual) {
      warnings.push(
        `⚠️ ${symbol} showing ${actual} behavior in ${context.regime} regime (expected: ${expected})`
      );
    }

    // Check direction alignment
    const directionSignal: SignalDirection = direction === 'LONG' ? 'bullish' : 'bearish';
    if (expected !== 'neutral' && directionSignal !== expected) {
      warnings.push(
        `⚠️ ${direction} ${symbol} may conflict with ${context.regime} regime expectations`
      );
    }

    // Calculate confidence based on alignment
    let confidence = 1.0;
    if (warnings.length > 0) {
      confidence = 0.7; // Reduce confidence for anomalies
    }
    if (context.anomalies.some(a => a.assetClass === assetClass && a.severity === 'high')) {
      confidence = 0.5;
    }

    return {
      isValid: warnings.length === 0,
      confidence,
      warnings,
    };
  }

  /**
   * Detect market regime from cross-asset analysis
   */
  private detectMarketRegime(
    metals: MetalsMetrics | null,
    stocks: StocksMetrics | null,
    bonds: BondsMetrics | null
  ): MarketRegime {
    // Get VIX from stocks analysis
    const vix = stocks?.vix || 20;
    const vixHigh = vix > 25;
    const vixExtreme = vix > 35;

    // Get bond signals
    const yieldCurveInverted = bonds?.yieldCurveStatus === 'inverted';
    const flightToSafety = bonds?.flightToSafety || false;

    // Get metals signals
    const goldBullish = metals?.sentiment === 'bullish';
    const dxyStrong = metals?.dxySignal === 'bearish'; // DXY bearish for gold = strong dollar

    // Regime detection logic
    if (vixExtreme && flightToSafety) {
      return 'liquidity_crisis';
    }

    if (vixHigh && goldBullish && bonds?.sentiment === 'bullish') {
      return 'risk_off';
    }

    if (!vixHigh && stocks?.sentiment === 'bullish' && bonds?.sentiment === 'bearish') {
      return 'risk_on';
    }

    if (yieldCurveInverted && bonds?.sentiment === 'bullish') {
      return 'deflation';
    }

    if (goldBullish && metals?.inflationSignal === 'bullish') {
      return 'inflation';
    }

    // Check for regime transition
    const mixedSignals =
      (stocks?.sentiment !== metals?.sentiment) &&
      (metals?.sentiment !== bonds?.sentiment);

    if (mixedSignals) {
      return 'transitioning';
    }

    return 'risk_on'; // Default
  }

  /**
   * Calculate regime confidence
   */
  private calculateRegimeConfidence(
    metals: MetalsMetrics | null,
    stocks: StocksMetrics | null,
    bonds: BondsMetrics | null
  ): number {
    let alignedCount = 0;
    let totalCount = 0;

    // Check if signals are aligned with detected regime
    if (metals) {
      totalCount++;
      if (metals.sentimentScore > 60 || metals.sentimentScore < 40) alignedCount++;
    }
    if (stocks) {
      totalCount++;
      if (stocks.sentimentScore > 60 || stocks.sentimentScore < 40) alignedCount++;
    }
    if (bonds) {
      totalCount++;
      if (bonds.sentimentScore > 60 || bonds.sentimentScore < 40) alignedCount++;
    }

    return totalCount > 0 ? Math.round((alignedCount / totalCount) * 100) : 50;
  }

  /**
   * Detect anomalies in market behavior
   */
  private detectAnomalies(
    regime: MarketRegime,
    expected: { crypto: SignalDirection; stocks: SignalDirection; metals: SignalDirection; bonds: SignalDirection },
    actual: { crypto: SignalDirection; stocks: SignalDirection; metals: SignalDirection; bonds: SignalDirection }
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const assetClasses: AssetClass[] = ['crypto', 'stocks', 'metals', 'bonds'];

    for (const asset of assetClasses) {
      const exp = expected[asset];
      const act = actual[asset];

      if (exp !== 'neutral' && act !== 'neutral' && exp !== act) {
        anomalies.push({
          asset: asset.toUpperCase(),
          assetClass: asset,
          expected: exp,
          actual: act,
          severity: this.getAnomalySeverity(regime, asset),
          message: `${asset} showing ${act} behavior, expected ${exp} in ${regime} regime`,
          possibleReasons: this.getPossibleReasons(regime, asset, act),
        });
      }
    }

    return anomalies;
  }

  /**
   * Get anomaly severity
   */
  private getAnomalySeverity(regime: MarketRegime, asset: AssetClass): 'low' | 'medium' | 'high' {
    // High severity for unexpected safe haven behavior
    if (regime === 'risk_off' && asset === 'metals') return 'high';
    if (regime === 'liquidity_crisis') return 'high';
    return 'medium';
  }

  /**
   * Get possible reasons for anomaly
   */
  private getPossibleReasons(
    regime: MarketRegime,
    asset: AssetClass,
    actual: SignalDirection
  ): string[] {
    const reasons: string[] = [];

    if (regime === 'risk_off' && asset === 'metals' && actual === 'bearish') {
      reasons.push('Possible liquidity event - margin calls forcing gold liquidation');
      reasons.push('Dollar spike overwhelming safe haven demand');
      reasons.push('Regime may be transitioning');
    }

    if (regime === 'risk_on' && asset === 'bonds' && actual === 'bullish') {
      reasons.push('Yields falling despite risk appetite');
      reasons.push('Fed dovish expectations');
      reasons.push('Flight to quality within risk-on');
    }

    if (reasons.length === 0) {
      reasons.push('Market may be transitioning between regimes');
      reasons.push('Unusual correlation breakdown');
    }

    return reasons;
  }

  /**
   * Basic crypto analysis (placeholder until dedicated crypto analyzer)
   */
  private async analyzeBasicCrypto(symbol: string): Promise<CryptoMetrics> {
    // This is a placeholder - uses existing crypto sentiment from market pulse
    // TODO: Implement full CryptoAnalyzerService

    return {
      assetClass: 'crypto',
      symbol,
      metrics: [],
      sentiment: 'neutral',
      sentimentScore: 50,
      keyDrivers: ['Using legacy crypto analysis'],
      warnings: [],
      analyzedAt: new Date(),

      fearGreedIndex: 50,
      fearGreedLabel: 'neutral',
      btcDominance: 50,
      btcDominanceTrend: 'flat',
      fundingRate: 0,
      fundingSignal: 'neutral',
      openInterest: 0,
      openInterestChange24h: 0,
      exchangeNetFlow: 0,
      exchangeFlowSignal: 'neutral',
      whaleActivity: 'neutral',
      activeAddresses: 0,
      activeAddressesChange: 0,
      stablecoinMcap: 0,
      stablecoinMcapChange: 0,
      defiTvl: 0,
      defiTvlChange: 0,
      altcoinSeasonIndex: 50,
      ethBtcRatio: 0,
      ethBtcTrend: 'flat',
    };
  }
}

// Export singleton
export const assetAnalyzerOrchestrator = new AssetAnalyzerOrchestrator();
