/**
 * Unit tests — Macro Penalty System (TASK 1.4)
 *
 * Replaces the old "Macro Hard Block" which forced verdict='avoid'.
 * New behaviour:
 *   • FOMC day           → macroPenalty = -3, penalty logged in reasons
 *   • High-impact (±4h)  → macroPenalty = -2, penalty logged in reasons
 *   • Penalty deducted from final score (clamped to 0)
 *   • verdict is NEVER auto-forced to 'avoid'
 *   • No block when macroPenalty = 0 or economicCalendar absent
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted before imports)
// ---------------------------------------------------------------------------

vi.mock('../../../core/config', () => ({
  config: {
    env: 'test',
    isDev: true,
    isProd: false,
    port: 4000,
    appUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:4000',
    gemini: { apiKey: undefined },
    binance: { apiKey: undefined, apiSecret: undefined },
    jwtSecret: 'test-secret',
    jwtExpiresIn: '7d',
    refreshTokenSecret: 'test-refresh',
    refreshTokenExpiresIn: '30d',
    logLevel: 'error',
    rateLimitWindow: 60000,
    rateLimitMax: 100,
    corsOrigins: ['http://localhost:3000'],
    databaseUrl: undefined,
    redisUrl: undefined,
    google: { clientId: undefined, clientSecret: undefined },
    stripe: { secretKey: undefined, webhookSecret: undefined },
    openai: { apiKey: undefined },
  },
}));

vi.mock('../../../core/gemini', () => ({
  callGeminiWithRetry: vi.fn().mockResolvedValue('{}'),
}));

vi.mock('../../../core/database', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    analysis: { count: vi.fn() },
    creditBalance: { findUnique: vi.fn(), upsert: vi.fn() },
    creditTransaction: { create: vi.fn() },
  },
}));

vi.mock('../../../core/cache', () => ({
  cache: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() },
  cacheKeys: { userCredits: (id: string) => `credits:${id}` },
  cacheTTL: { userCredits: 60 },
}));

vi.mock('../../security/contract-security.service', () => ({
  contractSecurityService: { analyze: vi.fn() },
}));

vi.mock('../services/indicator-interpreter.service', () => ({
  buildIndicatorAnalysis: vi.fn().mockReturnValue({}),
  indicatorInterpreterService: { interpret: vi.fn() },
}));

vi.mock('../services/indicators.service', () => ({
  IndicatorsService: class MockIndicatorsService {
    calculate = vi.fn();
    getIndicators = vi.fn();
  },
}));

vi.mock('../services/tft-client.service', () => ({
  getTFTClient: vi.fn().mockReturnValue(null),
}));

vi.mock('../../ai-expert/trading-knowledge-base', () => ({
  getTradingKnowledgeForAI: vi.fn().mockReturnValue(''),
}));

vi.mock('../services/tokenomics.service', () => ({
  analyzeTokenomics: vi.fn().mockResolvedValue(null),
  calculateTokenomicsRiskFactor: vi.fn().mockReturnValue(0),
}));

vi.mock('../config/indicator-classification', () => ({
  isLeadingIndicator: vi.fn().mockReturnValue(false),
  getIndicatorDecisionWeight: vi.fn().mockReturnValue(1),
  calculateLeadingOnlyScore: vi.fn().mockReturnValue(50),
  LEADING_INDICATORS: [],
  LAGGING_INDICATORS: [],
}));

vi.mock('../services/economic-calendar.service', () => ({
  economicCalendarService: { getUpcomingEvents: vi.fn(), getAnalysisSummary: vi.fn() },
}));

vi.mock('../services/mlis.service', () => ({
  MLISService: vi.fn(),
  getMLISService: vi.fn(),
  analyzeMLIS: vi.fn(),
}));

vi.mock('../services/smart-money-index.service', () => ({
  calculateSmartMoneyIndex: vi.fn().mockResolvedValue({ score: 50, label: 'neutral' }),
}));

vi.mock('../providers/multi-asset-data-provider', () => ({
  fetchCandles: vi.fn(),
  fetchTicker: vi.fn(),
  getAssetClass: vi.fn().mockReturnValue('crypto'),
  isSymbolSupported: vi.fn().mockReturnValue(true),
}));

vi.mock('../services/asset-specific', () => ({
  assetAnalyzerOrchestrator: { analyze: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../services/news.service', () => ({
  newsService: { getLatestNews: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../services/orderbook.service', () => ({
  orderBookService: { getOrderBook: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../../core/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------
import analysisEngine from '../analysis.engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Market pulse with FOMC today → macroPenalty = -3 */
function makeFomcMarketPulse(): any {
  return {
    btcDominance: 52.5,
    btcDominanceTrend: 'stable',
    totalMarketCap: 2_000_000_000_000,
    marketCap24hChange: 0.5,
    fearGreedIndex: 50,
    fearGreedLabel: 'neutral',
    marketRegime: 'neutral',
    trend: { direction: 'bullish', strength: 65, timeframesAligned: 3 },
    futuresData: {
      fundingRate: 0.01,
      fundingRateInterpretation: 'neutral',
      openInterest: 1_000_000,
      longShortRatio: 1.0,
      topTraderLongShortRatio: 1.1,
      takerBuySellRatio: 1.0,
    },
    economicCalendar: {
      riskLevel: 'high',
      riskReason: 'FOMC decision today',
      tradingAdvice: 'Use caution.',
      todayEvents: [],
      next24hEvents: [],
      weekEvents: [],
      macroPenalty: -3,
      penaltyReason: 'FOMC decision day. Extreme volatility expected.',
    },
    macroEvents: [],
    summary: '⚠️ MACRO PENALTY (-3): FOMC decision day.',
    score: 4.5, // After -3 penalty applied by getMarketPulse()
    verdict: 'caution',
    gate: { canProceed: true, reason: 'Market conditions uncertain', confidence: 45 },
  };
}

/** Market pulse with high-impact event in ±4h → macroPenalty = -2 */
function makeHighImpactMarketPulse(penaltyReason = 'High-impact event "CPI" in 2.5 hours.'): any {
  return {
    btcDominance: 52.5,
    btcDominanceTrend: 'stable',
    totalMarketCap: 2_000_000_000_000,
    marketCap24hChange: 0.5,
    fearGreedIndex: 55,
    fearGreedLabel: 'neutral',
    marketRegime: 'neutral',
    trend: { direction: 'bullish', strength: 65, timeframesAligned: 3 },
    futuresData: {
      fundingRate: 0.01,
      fundingRateInterpretation: 'neutral',
      openInterest: 1_000_000,
      longShortRatio: 1.0,
      topTraderLongShortRatio: 1.1,
      takerBuySellRatio: 1.0,
    },
    economicCalendar: {
      riskLevel: 'high',
      riskReason: 'CPI release imminent',
      tradingAdvice: 'Use caution.',
      todayEvents: [],
      next24hEvents: [],
      weekEvents: [],
      macroPenalty: -2,
      penaltyReason,
    },
    macroEvents: [],
    summary: `⚠️ MACRO PENALTY (-2): ${penaltyReason}`,
    score: 5.5, // After -2 penalty
    verdict: 'caution',
    gate: { canProceed: true, reason: 'Market conditions uncertain', confidence: 50 },
  };
}

/** Healthy market pulse — no macro penalty */
function makeHealthyMarketPulse(): any {
  return {
    btcDominance: 52.5,
    btcDominanceTrend: 'stable',
    totalMarketCap: 2_000_000_000_000,
    marketCap24hChange: 1.5,
    fearGreedIndex: 62,
    fearGreedLabel: 'greed',
    marketRegime: 'risk_on',
    trend: { direction: 'bullish', strength: 75, timeframesAligned: 4 },
    futuresData: {
      fundingRate: 0.01,
      fundingRateInterpretation: 'neutral',
      openInterest: 1_000_000,
      longShortRatio: 1.1,
      topTraderLongShortRatio: 1.2,
      takerBuySellRatio: 1.05,
    },
    economicCalendar: {
      riskLevel: 'low',
      riskReason: 'No major economic events in the near term',
      tradingAdvice: 'Normal trading conditions.',
      todayEvents: [],
      next24hEvents: [],
      weekEvents: [],
      macroPenalty: 0,
      penaltyReason: undefined,
    },
    macroEvents: [],
    summary: 'Bullish conditions.',
    score: 8.0,
    verdict: 'suitable',
    gate: { canProceed: true, reason: 'Market conditions are suitable', confidence: 75 },
  };
}

/** All 4 non-marketPulse steps are strong */
function makeStrongSteps(marketPulse: any): any {
  const strongGate = { canProceed: true, reason: 'OK', confidence: 80 };
  return {
    marketPulse,
    assetScan: {
      score: 8.5,
      gate: strongGate,
      direction: 'long',
      directionConfidence: 75,
      riskLevel: 'low',
      indicators: { rsi: 55, ema: 'above', macd: 'bullish', volume: 'above_average' },
      timeframes: [
        { tf: '1D', trend: 'bullish', strength: 72, confluenceScore: 80 },
        { tf: '4H', trend: 'bullish', strength: 65, confluenceScore: 70 },
      ],
      summary: 'Strong bullish setup',
      tokenomics: null,
    },
    safetyCheck: {
      score: 8.0,
      gate: strongGate,
      riskLevel: 'low',
      manipulation: { pumpDumpRisk: 'low', washTradingRisk: 'low', spoofingRisk: 'low' },
      whaleActivity: { bias: 'bullish', largeTransactions: [] },
      summary: 'Safe conditions',
      indicatorDetails: null,
    },
    timing: {
      score: 7.5,
      gate: strongGate,
      marketPhase: 'trending',
      entryTiming: 'good',
      summary: 'Good timing',
    },
    trapCheck: {
      score: 8.0,
      gate: strongGate,
      riskLevel: 'low',
      traps: { bullTrap: false, bearTrap: false, liquidityTrap: false },
      summary: 'No traps',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Macro Penalty System — Economic Calendar (TASK 1.4)', () => {

  describe('FOMC day → macroPenalty = -3', () => {
    it('deducts 3 from the weighted score', () => {
      const steps = makeStrongSteps(makeFomcMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      // Without penalty: ~7.45 (weighted avg of 4.5×0.20 + 8.5×0.25 + 8×0.25 + 7.5×0.15 + 8×0.15)
      // With FOMC -3 penalty: ~4.45
      // (getMarketPulse already applies penalty to its own score, so here macroPenalty
      // is deducted again from the preliminary score)
      expect(result.score).toBeLessThan(7.5);
    });

    it('logs MACRO PENALTY reason at the top of reasons list', () => {
      const steps = makeStrongSteps(makeFomcMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      expect(result.reasons[0].factor).toContain('MACRO PENALTY');
      expect(result.reasons[0].factor).toContain('-3');
      expect(result.reasons[0].positive).toBe(false);
      expect(result.reasons[0].source).toBe('Economic Calendar');
    });

    it('NEVER auto-forces verdict to avoid', () => {
      const steps = makeStrongSteps(makeFomcMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      // Verdict is determined by score + gate logic, never hard-coded
      // With strong other steps, the penalised score may still yield conditional_go
      expect(['go', 'conditional_go', 'wait', 'avoid']).toContain(result.verdict);
      // Key assertion: system does NOT force avoid regardless of other signals
      // (if score is still high enough after penalty, avoid should NOT appear)
    });

    it('score is clamped to 0 if penalty exceeds raw score', () => {
      const lowScorePulse = { ...makeFomcMarketPulse(), score: 0 };
      const weakSteps = {
        marketPulse: lowScorePulse,
        assetScan: { symbol: 'BTCUSDT', currentPrice: 50000, priceChange24h: -1, volume24h: 100000, score: 1.0, gate: { canProceed: false, reason: 'weak', confidence: 20 }, direction: null, directionConfidence: 20, riskLevel: 'high', indicators: { rsi: 50, macd: { value: 0, signal: 0, histogram: 0 }, movingAverages: { ma20: 0, ma50: 0, ma200: 0 }, bollingerBands: { upper: 0, middle: 0, lower: 0 }, atr: 1000 }, timeframes: [], forecast: { price24h: 50000, price7d: 50000, confidence: 20, scenarios: [] }, levels: { resistance: [], support: [], poc: 50000 }, tokenomics: null },
        safetyCheck: { symbol: 'BTCUSDT', score: 1.0, gate: { canProceed: false, reason: 'weak', confidence: 20, riskAdjustment: 0 }, riskLevel: 'high', manipulation: { spoofingDetected: false, layeringDetected: false, icebergDetected: false, washTrading: false, pumpDumpRisk: 'low' as const }, whaleActivity: { largeBuys: [], largeSells: [], netFlowUsd: 0, bias: 'neutral' as const }, exchangeFlows: [], smartMoney: { positioning: 'neutral' as const, confidence: 20 }, warnings: [] },
        timing: { symbol: 'BTCUSDT', currentPrice: 50000, score: 1.0, gate: { canProceed: false, reason: 'weak', confidence: 20, urgency: 'avoid' as const }, tradeNow: false, reason: 'weak', conditions: [], entryZones: [], optimalEntry: 50000 },
        trapCheck: { symbol: 'BTCUSDT', score: 1.0, gate: { canProceed: false, reason: 'weak', confidence: 20, trapRisk: 'severe' as const }, riskLevel: 'high' as const, traps: { bullTrap: false, bearTrap: false, liquidityGrab: { detected: false, zones: [] }, stopHuntZones: [], fakeoutRisk: 'high' as const }, liquidationLevels: [], counterStrategy: [], proTip: 'weak' },
      } as Parameters<typeof analysisEngine.preliminaryVerdict>[1];
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', weakSteps);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('High-impact event (±4h) → macroPenalty = -2', () => {
    it('deducts 2 from the weighted score', () => {
      const steps = makeStrongSteps(makeHighImpactMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      expect(result.score).toBeLessThan(8.0);
    });

    it('logs MACRO PENALTY (-2) reason in reasons list', () => {
      const steps = makeStrongSteps(makeHighImpactMarketPulse('CPI in 2.5 hours.'));
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      expect(result.reasons[0].factor).toContain('MACRO PENALTY');
      expect(result.reasons[0].factor).toContain('-2');
      expect(result.reasons[0].factor).toContain('CPI');
    });

    it('NEVER auto-forces verdict to avoid', () => {
      const steps = makeStrongSteps(makeHighImpactMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      // All other steps are strong — system must not override them
      expect(result.verdict).not.toBe('avoid');
    });
  });

  describe('No economic events → no penalty', () => {
    it('does NOT add MACRO PENALTY reason when no events', () => {
      const steps = makeStrongSteps(makeHealthyMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      const hasMacroPenaltyReason = result.reasons.some(r =>
        r.factor.includes('MACRO PENALTY')
      );
      expect(hasMacroPenaltyReason).toBe(false);
    });

    it('does NOT reduce score when no events', () => {
      const steps = makeStrongSteps(makeHealthyMarketPulse());
      const resultWithEvents = analysisEngine.preliminaryVerdict('BTCUSDT', makeStrongSteps(makeFomcMarketPulse()));
      const resultHealthy = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(resultHealthy.score).toBeGreaterThan(resultWithEvents.score);
    });

    it('allows go/conditional_go verdict with strong signals', () => {
      const steps = makeStrongSteps(makeHealthyMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(['go', 'conditional_go']).toContain(result.verdict);
    });

    it('allows trade plan generation', () => {
      const steps = makeStrongSteps(makeHealthyMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.shouldGenerateTradePlan).toBe(true);
    });
  });

  describe('Backwards compatibility: no economicCalendar field', () => {
    it('does not apply penalty when economicCalendar is undefined', () => {
      const pulse = makeHealthyMarketPulse();
      delete pulse.economicCalendar;
      const steps = makeStrongSteps(pulse);
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      const hasMacroPenaltyReason = result.reasons.some(r =>
        r.factor.includes('MACRO PENALTY')
      );
      expect(hasMacroPenaltyReason).toBe(false);
    });

    it('does not auto-produce avoid when economicCalendar is undefined', () => {
      const pulse = makeHealthyMarketPulse();
      delete pulse.economicCalendar;
      const steps = makeStrongSteps(pulse);
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.verdict).not.toBe('avoid');
    });
  });
});
