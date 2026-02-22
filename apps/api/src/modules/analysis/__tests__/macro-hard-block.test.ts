/**
 * Unit tests — Macro Hard Block (Economic Calendar Trade Blocking)
 *
 * Covers:
 *   • calculatePreliminaryVerdict forces 'avoid' + score ≤ 2 when shouldBlockTrade = true
 *   • Block is inserted at the top of the reasons list with 'MACRO HARD BLOCK' prefix
 *   • Block fires even when all other gates (assetScan / safetyCheck / timing / trapCheck) pass
 *   • No block applied when shouldBlockTrade = false or economicCalendar is absent
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks
// These must be declared before any real module is imported because Vitest
// hoists vi.mock() calls to the top of the compiled output.
// ---------------------------------------------------------------------------

// Prevent dotenv / config chain from executing
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
// Module under test — imported AFTER mocks are registered
// ---------------------------------------------------------------------------
import analysisEngine from '../analysis.engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMacroBlockedMarketPulse(
  blockReason = 'FOMC decision day. Extreme volatility expected. DO NOT TRADE.',
): any {
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
      tradingAdvice: 'Avoid new positions.',
      todayEvents: [],
      next24hEvents: [],
      weekEvents: [],
      shouldBlockTrade: true,
      blockReason,
    },
    macroEvents: [],
    summary: `⚠️ TRADE BLOCKED: ${blockReason}`,
    // Market Pulse caps its own score at 2 when blocked
    score: 2,
    verdict: 'avoid',
    gate: { canProceed: false, reason: blockReason, confidence: 10 },
  };
}

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
      shouldBlockTrade: false,
      blockReason: undefined,
    },
    macroEvents: [],
    summary: 'Bullish conditions.',
    score: 8.0,
    verdict: 'suitable',
    gate: { canProceed: true, reason: 'Market conditions are suitable', confidence: 75 },
  };
}

/** All other 4 steps are strong — they would normally produce a go/conditional_go verdict */
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

describe('Macro Hard Block — Economic Calendar', () => {
  describe('preliminaryVerdict with shouldBlockTrade = true', () => {
    it('forces verdict = avoid regardless of strong step scores', () => {
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.verdict).toBe('avoid');
    });

    it('sets direction = null when blocked', () => {
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.direction).toBeNull();
    });

    it('caps score at ≤ 2 when blocked', () => {
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.score).toBeLessThanOrEqual(2);
    });

    it('sets confidence = 0 when blocked', () => {
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.confidence).toBe(0);
    });

    it('sets shouldGenerateTradePlan = false when blocked', () => {
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.shouldGenerateTradePlan).toBe(false);
    });

    it('prepends MACRO HARD BLOCK reason to reasons list', () => {
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse('FOMC day'));
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      expect(result.reasons[0].factor).toContain('MACRO HARD BLOCK');
      expect(result.reasons[0].factor).toContain('FOMC day');
      expect(result.reasons[0].positive).toBe(false);
      expect(result.reasons[0].source).toBe('Economic Calendar');
    });

    it('blocks even when 4/5 gates pass (market pulse gate alone is sufficient)', () => {
      // Previously 4/5 passing gates could produce conditional_go even with the
      // economic block. This test explicitly confirms the fix.
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse());
      expect(steps.marketPulse.gate.canProceed).toBe(false);
      expect(steps.assetScan.gate.canProceed).toBe(true);
      expect(steps.safetyCheck.gate.canProceed).toBe(true);
      expect(steps.timing.gate.canProceed).toBe(true);
      expect(steps.trapCheck.gate.canProceed).toBe(true);

      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.verdict).toBe('avoid');
      expect(result.shouldGenerateTradePlan).toBe(false);
    });

    it('embeds the specific blockReason in the reasons list entry', () => {
      const customReason = 'CPI data in 2.5 hours. DO NOT TRADE.';
      const steps = makeStrongSteps(makeMacroBlockedMarketPulse(customReason));
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);

      const blockEntry = result.reasons.find((r) => r.factor.includes('MACRO HARD BLOCK'));
      expect(blockEntry).toBeDefined();
      expect(blockEntry!.factor).toContain(customReason);
    });
  });

  describe('preliminaryVerdict with shouldBlockTrade = false (no block)', () => {
    it('does NOT force avoid when there is no economic block', () => {
      const steps = makeStrongSteps(makeHealthyMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(['go', 'conditional_go']).toContain(result.verdict);
    });

    it('does NOT cap score at 2 when healthy', () => {
      const steps = makeStrongSteps(makeHealthyMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.score).toBeGreaterThan(2);
    });

    it('allows trade plan generation when market is healthy', () => {
      const steps = makeStrongSteps(makeHealthyMarketPulse());
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.shouldGenerateTradePlan).toBe(true);
    });
  });

  describe('backwards-compat: no economicCalendar field', () => {
    it('does not block when economicCalendar is undefined', () => {
      const pulse = makeHealthyMarketPulse();
      delete pulse.economicCalendar;
      const steps = makeStrongSteps(pulse);
      const result = analysisEngine.preliminaryVerdict('BTCUSDT', steps);
      expect(result.verdict).not.toBe('avoid');
    });
  });
});
