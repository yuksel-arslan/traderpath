/**
 * Unified Analysis Pipeline Service
 * ==================================
 * Orchestrates 8-step analysis in background, reports progress via SSE.
 * Does NOT modify existing modules - only consumes their exports.
 *
 * Pipeline:
 *   1. Capital Flow      → getCapitalFlowSummary()
 *   2. Fundamentals      → tokenomics (crypto) / Yahoo (stocks/metals/bonds)
 *   3. Technical Data    → fetchCandles() x3 (1h, 1D, 1W)
 *   4. Sentiment         → economicCalendar + fearGreed + news
 *   5. Technical Analysis→ scanAsset() x3
 *   6. AI Predictions    → Gemini price targets per horizon
 *   7. Expert Validation → Gemini expert panel (ARIA/ORACLE/SENTINEL/NEXUS)
 *   8. Report Generation → Build UnifiedReport object
 */

import { randomUUID } from 'crypto';
import { redis } from '../../core/cache';
import { callGeminiWithRetry } from '../../core/gemini';
import { analysisEngine } from '../analysis/analysis.engine';
import { fetchCandles, fetchTicker } from '../analysis/providers/multi-asset-data-provider';
import { detectAssetClass } from '../analysis/providers/symbol-resolver';
import { getCapitalFlowSummary } from '../capital-flow/capital-flow.service';
import { analyzeTokenomics } from '../analysis/services/tokenomics.service';
import economicCalendarService from '../analysis/services/economic-calendar.service';
import {
  PipelineStep,
  PIPELINE_STEPS,
  PipelineProgress,
  StepProgress,
  HORIZON_TIMEFRAMES,
  HORIZON_CANDLE_COUNTS,
  HORIZON_LABELS,
  Horizon,
  CapitalFlowData,
  FundamentalsData,
  TechnicalData,
  SentimentData,
  HorizonAnalysis,
  HorizonPrediction,
  ExpertValidation,
  UnifiedReport,
  CandleData,
  IndicatorResult,
} from './types';

// Active sessions stored in memory (progress tracking)
const activeSessions = new Map<string, PipelineProgress>();

// Event listeners for SSE
type ProgressListener = (progress: PipelineProgress) => void;
const listeners = new Map<string, Set<ProgressListener>>();

// ============================================================================
// PROGRESS MANAGEMENT
// ============================================================================

function initProgress(sessionId: string, symbol: string): PipelineProgress {
  const assetClass = detectAssetClass(symbol);
  const progress: PipelineProgress = {
    sessionId,
    symbol,
    assetClass,
    status: 'running',
    currentStep: null,
    startedAt: Date.now(),
    steps: PIPELINE_STEPS.map(s => ({
      step: s.id,
      status: 'pending' as const,
    })),
  };
  activeSessions.set(sessionId, progress);
  return progress;
}

function updateStep(sessionId: string, step: PipelineStep, status: 'running' | 'completed' | 'failed', error?: string) {
  const progress = activeSessions.get(sessionId);
  if (!progress) return;

  const stepData = progress.steps.find(s => s.step === step);
  if (stepData) {
    stepData.status = status;
    if (status === 'running') {
      stepData.startedAt = Date.now();
      progress.currentStep = step;
    }
    if (status === 'completed' || status === 'failed') {
      stepData.completedAt = Date.now();
      if (error) stepData.error = error;
    }
  }

  // Notify listeners
  const sessionListeners = listeners.get(sessionId);
  if (sessionListeners) {
    for (const listener of sessionListeners) {
      try { listener(progress); } catch { /* ignore */ }
    }
  }
}

function completeSession(sessionId: string, error?: string) {
  const progress = activeSessions.get(sessionId);
  if (!progress) return;

  progress.status = error ? 'failed' : 'completed';
  progress.completedAt = Date.now();
  progress.currentStep = null;
  if (error) progress.error = error;

  // Notify listeners one last time
  const sessionListeners = listeners.get(sessionId);
  if (sessionListeners) {
    for (const listener of sessionListeners) {
      try { listener(progress); } catch { /* ignore */ }
    }
  }

  // Cleanup after 5 minutes
  setTimeout(() => {
    activeSessions.delete(sessionId);
    listeners.delete(sessionId);
  }, 5 * 60 * 1000);
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function getProgress(sessionId: string): PipelineProgress | null {
  return activeSessions.get(sessionId) || null;
}

export function addProgressListener(sessionId: string, listener: ProgressListener) {
  if (!listeners.has(sessionId)) {
    listeners.set(sessionId, new Set());
  }
  listeners.get(sessionId)!.add(listener);
}

export function removeProgressListener(sessionId: string, listener: ProgressListener) {
  listeners.get(sessionId)?.delete(listener);
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export async function runUnifiedPipeline(symbol: string): Promise<UnifiedReport> {
  const sessionId = randomUUID();
  const normalizedSymbol = symbol.toUpperCase().replace(/USDT$|BUSD$|USDC$/, '');
  const assetClass = detectAssetClass(normalizedSymbol);

  const progress = initProgress(sessionId, normalizedSymbol);

  // Emit initial state
  const sessionListeners = listeners.get(sessionId);
  if (sessionListeners) {
    for (const listener of sessionListeners) {
      try { listener(progress); } catch { /* ignore */ }
    }
  }

  let capitalFlowData: CapitalFlowData | null = null;
  let fundamentalsData: FundamentalsData = {};
  let technicalData: TechnicalData = { short: [], medium: [], long: [], currentPrice: 0 };
  let sentimentData: SentimentData = {
    overallSentiment: 'neutral', sentimentScore: 0, newsItems: [],
    economicEvents: [], shouldBlockTrade: false,
  };
  let horizonAnalyses: HorizonAnalysis[] = [];
  let horizonPredictions: HorizonPrediction[] = [];
  let expertValidation: ExpertValidation | null = null;

  try {
    // ========================================================================
    // STEP 1: CAPITAL FLOW
    // ========================================================================
    updateStep(sessionId, 'capital_flow', 'running');
    try {
      const cfSummary = await getCapitalFlowSummary();
      capitalFlowData = {
        globalLiquidity: {
          bias: cfSummary.liquidityBias || 'neutral',
          fedBalanceSheet: cfSummary.globalLiquidity?.fedBalanceSheet?.value,
          m2MoneySupply: cfSummary.globalLiquidity?.m2MoneySupply?.value,
          dxy: cfSummary.globalLiquidity?.dxy?.value,
          vix: cfSummary.globalLiquidity?.vix?.value,
        },
        marketFlows: (cfSummary.markets || []).filter((m: any) => m && m.market).map((m: any) => ({
          market: m.market,
          flow7d: m.flow7d ?? 0,
          flow30d: m.flow30d ?? 0,
          flowVelocity: m.flowVelocity ?? 0,
          phase: m.phase || 'mid',
          fiveFactorScore: m.fiveFactorScore ?? 50,
        })),
        recommendation: cfSummary.recommendation ? {
          primaryMarket: cfSummary.recommendation.primaryMarket || assetClass,
          action: cfSummary.recommendation.action || 'wait',
          direction: cfSummary.recommendation.direction || 'neutral',
          confidence: cfSummary.recommendation.confidence ?? 50,
          reason: cfSummary.recommendation.reason || '',
        } : null,
      };
      updateStep(sessionId, 'capital_flow', 'completed');
    } catch (err: any) {
      console.warn('[UnifiedPipeline] Capital flow failed:', err.message);
      capitalFlowData = {
        globalLiquidity: { bias: 'neutral' },
        marketFlows: [],
        recommendation: null,
      };
      updateStep(sessionId, 'capital_flow', 'completed'); // non-critical, continue
    }

    // ========================================================================
    // STEP 2: FUNDAMENTALS
    // ========================================================================
    updateStep(sessionId, 'fundamentals', 'running');
    try {
      const ticker = await fetchTicker(normalizedSymbol);
      fundamentalsData = {
        price: ticker.price,
        volume24h: ticker.volume24h,
        change24h: ticker.change24h,
        changePercent24h: ticker.changePercent24h,
      };

      // Crypto: tokenomics
      if (assetClass === 'crypto') {
        const tokenomics = await analyzeTokenomics(normalizedSymbol).catch(() => null);
        if (tokenomics) {
          fundamentalsData.marketCap = tokenomics.marketCap;
          fundamentalsData.circulatingSupply = tokenomics.circulatingSupply;
          fundamentalsData.totalSupply = tokenomics.totalSupply;
          fundamentalsData.maxSupply = tokenomics.maxSupply;
          fundamentalsData.fdv = tokenomics.fullyDilutedValuation;
          fundamentalsData.rank = tokenomics.rank;
        }
      }

      // Stocks: try to get additional data from Yahoo
      if (assetClass === 'stocks' || assetClass === 'bist') {
        const stockData = await fetchStockFundamentals(normalizedSymbol);
        Object.assign(fundamentalsData, stockData);
      }

      updateStep(sessionId, 'fundamentals', 'completed');
    } catch (err: any) {
      console.warn('[UnifiedPipeline] Fundamentals failed:', err.message);
      updateStep(sessionId, 'fundamentals', 'completed');
    }

    // ========================================================================
    // STEP 3: TECHNICAL DATA (3 timeframes in parallel)
    // ========================================================================
    updateStep(sessionId, 'technical_data', 'running');
    try {
      const horizons: Horizon[] = ['short', 'medium', 'long'];
      const candlePromises = horizons.map(h =>
        fetchCandles(normalizedSymbol, HORIZON_TIMEFRAMES[h], HORIZON_CANDLE_COUNTS[h])
          .catch(err => {
            console.warn(`[UnifiedPipeline] Candles ${h} (${HORIZON_TIMEFRAMES[h]}) failed:`, err.message);
            return [];
          })
      );

      const [shortCandles, mediumCandles, longCandles] = await Promise.all(candlePromises);

      technicalData = {
        short: mapCandles(shortCandles),
        medium: mapCandles(mediumCandles),
        long: mapCandles(longCandles),
        currentPrice: fundamentalsData.price || 0,
      };

      // Update current price from the latest candle if available
      const latestCandle = mediumCandles[mediumCandles.length - 1];
      if (latestCandle && latestCandle.close) {
        technicalData.currentPrice = latestCandle.close;
      }

      updateStep(sessionId, 'technical_data', 'completed');
    } catch (err: any) {
      console.warn('[UnifiedPipeline] Technical data failed:', err.message);
      updateStep(sessionId, 'technical_data', 'completed');
    }

    // ========================================================================
    // STEP 4: SENTIMENT
    // ========================================================================
    updateStep(sessionId, 'sentiment', 'running');
    try {
      const [calendar, fearGreedResponse] = await Promise.all([
        economicCalendarService.getUpcomingEvents().catch(() => null),
        fetchFearGreed().catch(() => null),
      ]);

      const economicEvents = calendar?.events?.slice(0, 5).map((e: any) => ({
        event: e.event || e.name || 'Unknown',
        date: e.date || new Date().toISOString(),
        impact: e.impact || 'medium',
        forecast: e.forecast,
        previous: e.previous,
      })) || [];

      sentimentData = {
        overallSentiment: 'neutral',
        sentimentScore: 0,
        fearGreedIndex: fearGreedResponse?.value,
        fearGreedLabel: fearGreedResponse?.classification,
        newsItems: [],
        economicEvents,
        shouldBlockTrade: calendar?.shouldBlockTrade || false,
        blockReason: calendar?.blockReason,
      };

      // Derive sentiment from Fear & Greed
      if (fearGreedResponse?.value) {
        const fgi = fearGreedResponse.value;
        if (fgi >= 60) {
          sentimentData.overallSentiment = 'bullish';
          sentimentData.sentimentScore = Math.min(100, (fgi - 50) * 2);
        } else if (fgi <= 40) {
          sentimentData.overallSentiment = 'bearish';
          sentimentData.sentimentScore = Math.max(-100, (fgi - 50) * 2);
        }
      }

      updateStep(sessionId, 'sentiment', 'completed');
    } catch (err: any) {
      console.warn('[UnifiedPipeline] Sentiment failed:', err.message);
      updateStep(sessionId, 'sentiment', 'completed');
    }

    // ========================================================================
    // STEP 5: TECHNICAL ANALYSIS (per horizon)
    // ========================================================================
    updateStep(sessionId, 'technical_analysis', 'running');
    try {
      const horizons: Horizon[] = ['short', 'medium', 'long'];

      // Run analysis for each horizon sequentially to avoid rate limits
      for (const horizon of horizons) {
        const tf = HORIZON_TIMEFRAMES[horizon];
        const tradeType = analysisEngine.getTradeTypeFromTimeframe(tf);

        try {
          const scan = await analysisEngine.scanAsset(normalizedSymbol, tradeType);
          const candles = technicalData[horizon];
          const currentPrice = technicalData.currentPrice;

          // Use shared helper
          horizonAnalyses.push(buildHorizonAnalysis(horizon, tf, scan));
        } catch (err: any) {
          console.warn(`[UnifiedPipeline] Analysis ${horizon} failed:`, err.message);
          horizonAnalyses.push(getDefaultHorizonAnalysis(horizon));
        }
      }

      updateStep(sessionId, 'technical_analysis', 'completed');
    } catch (err: any) {
      console.warn('[UnifiedPipeline] Technical analysis failed:', err.message);
      updateStep(sessionId, 'technical_analysis', 'completed');
    }

    // ========================================================================
    // STEP 6: AI PREDICTIONS (Gemini per horizon)
    // ========================================================================
    updateStep(sessionId, 'ai_predictions', 'running');
    try {
      horizonPredictions = await generateAIPredictions(
        normalizedSymbol,
        assetClass,
        technicalData,
        horizonAnalyses,
        capitalFlowData,
      );
      updateStep(sessionId, 'ai_predictions', 'completed');
    } catch (err: any) {
      console.warn('[UnifiedPipeline] AI predictions failed:', err.message);
      // Fill with defaults
      horizonPredictions = (['short', 'medium', 'long'] as Horizon[]).map(h => getDefaultPrediction(h, technicalData.currentPrice));
      updateStep(sessionId, 'ai_predictions', 'completed');
    }

    // ========================================================================
    // STEP 7: EXPERT VALIDATION (Gemini)
    // ========================================================================
    updateStep(sessionId, 'expert_validation', 'running');
    try {
      expertValidation = await runExpertValidation(
        normalizedSymbol,
        assetClass,
        horizonAnalyses,
        horizonPredictions,
        capitalFlowData,
        sentimentData,
      );
      updateStep(sessionId, 'expert_validation', 'completed');
    } catch (err: any) {
      console.warn('[UnifiedPipeline] Expert validation failed:', err.message);
      expertValidation = getDefaultExpertValidation();
      updateStep(sessionId, 'expert_validation', 'completed');
    }

    // ========================================================================
    // STEP 8: REPORT GENERATION
    // ========================================================================
    updateStep(sessionId, 'report_generation', 'running');

    const { overallVerdict, overallScore, overallDirection, overallConfidence } = calculateOverallVerdict(
      horizonAnalyses,
      horizonPredictions,
      expertValidation!,
      sentimentData,
    );

    const summary = await generateSummary(
      normalizedSymbol,
      assetClass,
      overallVerdict,
      overallDirection,
      overallScore,
      horizonAnalyses,
      capitalFlowData,
    );

    const assetNames: Record<string, string> = {
      BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB', XRP: 'Ripple',
      AAPL: 'Apple Inc.', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', NVDA: 'NVIDIA',
      GLD: 'Gold (GLD)', SLV: 'Silver (SLV)', XAUUSD: 'Gold', XAGUSD: 'Silver',
      TLT: 'Treasury 20+Y', IEF: 'Treasury 7-10Y', SPY: 'S&P 500', QQQ: 'NASDAQ-100',
    };

    const report: UnifiedReport = {
      sessionId,
      symbol: normalizedSymbol,
      assetName: assetNames[normalizedSymbol] || normalizedSymbol,
      assetClass,
      generatedAt: new Date().toISOString(),
      capitalFlow: capitalFlowData!,
      fundamentals: fundamentalsData,
      technicalData,
      sentiment: sentimentData,
      horizonAnalyses,
      horizonPredictions,
      expertValidation: expertValidation!,
      overallVerdict,
      overallScore,
      overallDirection,
      overallConfidence,
      summary,
    };

    // Cache report in Redis for 1 hour
    try {
      await redis.setex(
        `unified-report:${sessionId}`,
        3600,
        JSON.stringify(report),
      );
    } catch { /* ignore cache errors */ }

    updateStep(sessionId, 'report_generation', 'completed');
    completeSession(sessionId);

    return report;
  } catch (err: any) {
    console.error('[UnifiedPipeline] Fatal error:', err);
    completeSession(sessionId, err.message);
    throw err;
  }
}

/**
 * Start pipeline and return sessionId immediately (for SSE tracking)
 */
export function startPipeline(symbol: string): string {
  const sessionId = randomUUID();
  const normalizedSymbol = symbol.toUpperCase().replace(/USDT$|BUSD$|USDC$/, '');
  initProgress(sessionId, normalizedSymbol);

  // Run pipeline in background
  runPipelineWithSession(sessionId, normalizedSymbol).catch(err => {
    console.error('[UnifiedPipeline] Background pipeline error:', err);
    completeSession(sessionId, err.message);
  });

  return sessionId;
}

/**
 * Retrieve a cached report by sessionId
 */
export async function getReport(sessionId: string): Promise<UnifiedReport | null> {
  try {
    const cached = await redis.get(`unified-report:${sessionId}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// INTERNAL: Run pipeline with an existing session ID
// ============================================================================

async function runPipelineWithSession(sessionId: string, symbol: string): Promise<void> {
  const assetClass = detectAssetClass(symbol);

  let capitalFlowData: CapitalFlowData | null = null;
  let fundamentalsData: FundamentalsData = {};
  let technicalData: TechnicalData = { short: [], medium: [], long: [], currentPrice: 0 };
  let sentimentData: SentimentData = {
    overallSentiment: 'neutral', sentimentScore: 0, newsItems: [],
    economicEvents: [], shouldBlockTrade: false,
  };
  let horizonAnalyses: HorizonAnalysis[] = [];
  let horizonPredictions: HorizonPrediction[] = [];
  let expertValidation: ExpertValidation | null = null;

  try {
    // STEP 1: CAPITAL FLOW
    updateStep(sessionId, 'capital_flow', 'running');
    try {
      const cfSummary = await getCapitalFlowSummary();
      capitalFlowData = mapCapitalFlow(cfSummary, assetClass);
      updateStep(sessionId, 'capital_flow', 'completed');
    } catch (err: any) {
      capitalFlowData = { globalLiquidity: { bias: 'neutral' }, marketFlows: [], recommendation: null };
      updateStep(sessionId, 'capital_flow', 'completed');
    }

    // STEP 2: FUNDAMENTALS
    updateStep(sessionId, 'fundamentals', 'running');
    try {
      const ticker = await fetchTicker(symbol);
      fundamentalsData = {
        price: ticker.price,
        volume24h: ticker.volume24h,
        change24h: ticker.change24h,
        changePercent24h: ticker.changePercent24h,
      };
      if (assetClass === 'crypto') {
        const tokenomics = await analyzeTokenomics(symbol).catch(() => null);
        if (tokenomics) {
          fundamentalsData.marketCap = tokenomics.marketCap;
          fundamentalsData.circulatingSupply = tokenomics.circulatingSupply;
          fundamentalsData.totalSupply = tokenomics.totalSupply;
          fundamentalsData.maxSupply = tokenomics.maxSupply;
          fundamentalsData.fdv = tokenomics.fullyDilutedValuation;
          fundamentalsData.rank = tokenomics.rank;
        }
      }
      if (assetClass === 'stocks' || assetClass === 'bist') {
        const stockData = await fetchStockFundamentals(symbol);
        Object.assign(fundamentalsData, stockData);
      }
      updateStep(sessionId, 'fundamentals', 'completed');
    } catch (err: any) {
      updateStep(sessionId, 'fundamentals', 'completed');
    }

    // STEP 3: TECHNICAL DATA
    updateStep(sessionId, 'technical_data', 'running');
    try {
      const horizons: Horizon[] = ['short', 'medium', 'long'];
      const [shortCandles, mediumCandles, longCandles] = await Promise.all(
        horizons.map(h =>
          fetchCandles(symbol, HORIZON_TIMEFRAMES[h], HORIZON_CANDLE_COUNTS[h]).catch(() => [])
        )
      );
      technicalData = {
        short: mapCandles(shortCandles),
        medium: mapCandles(mediumCandles),
        long: mapCandles(longCandles),
        currentPrice: fundamentalsData.price || 0,
      };
      const latest = mediumCandles[mediumCandles.length - 1];
      if (latest?.close) technicalData.currentPrice = latest.close;
      updateStep(sessionId, 'technical_data', 'completed');
    } catch {
      updateStep(sessionId, 'technical_data', 'completed');
    }

    // STEP 4: SENTIMENT
    updateStep(sessionId, 'sentiment', 'running');
    try {
      const [calendar, fgi] = await Promise.all([
        economicCalendarService.getUpcomingEvents().catch(() => null),
        fetchFearGreed().catch(() => null),
      ]);
      sentimentData = buildSentimentData(calendar, fgi);
      updateStep(sessionId, 'sentiment', 'completed');
    } catch {
      updateStep(sessionId, 'sentiment', 'completed');
    }

    // STEP 5: TECHNICAL ANALYSIS
    updateStep(sessionId, 'technical_analysis', 'running');
    try {
      const horizons: Horizon[] = ['short', 'medium', 'long'];
      for (const horizon of horizons) {
        const tf = HORIZON_TIMEFRAMES[horizon];
        const tradeType = analysisEngine.getTradeTypeFromTimeframe(tf);
        try {
          const scan = await analysisEngine.scanAsset(symbol, tradeType);
          horizonAnalyses.push(buildHorizonAnalysis(horizon, tf, scan));
        } catch {
          horizonAnalyses.push(getDefaultHorizonAnalysis(horizon));
        }
      }
      updateStep(sessionId, 'technical_analysis', 'completed');
    } catch {
      updateStep(sessionId, 'technical_analysis', 'completed');
    }

    // STEP 6: AI PREDICTIONS
    updateStep(sessionId, 'ai_predictions', 'running');
    try {
      horizonPredictions = await generateAIPredictions(symbol, assetClass, technicalData, horizonAnalyses, capitalFlowData);
      updateStep(sessionId, 'ai_predictions', 'completed');
    } catch {
      horizonPredictions = (['short', 'medium', 'long'] as Horizon[]).map(h => getDefaultPrediction(h, technicalData.currentPrice));
      updateStep(sessionId, 'ai_predictions', 'completed');
    }

    // STEP 7: EXPERT VALIDATION
    updateStep(sessionId, 'expert_validation', 'running');
    try {
      expertValidation = await runExpertValidation(symbol, assetClass, horizonAnalyses, horizonPredictions, capitalFlowData, sentimentData);
      updateStep(sessionId, 'expert_validation', 'completed');
    } catch {
      expertValidation = getDefaultExpertValidation();
      updateStep(sessionId, 'expert_validation', 'completed');
    }

    // STEP 8: REPORT GENERATION
    updateStep(sessionId, 'report_generation', 'running');

    const { overallVerdict, overallScore, overallDirection, overallConfidence } = calculateOverallVerdict(
      horizonAnalyses, horizonPredictions, expertValidation!, sentimentData,
    );

    const summary = await generateSummary(symbol, assetClass, overallVerdict, overallDirection, overallScore, horizonAnalyses, capitalFlowData);

    const assetNames: Record<string, string> = {
      BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB', XRP: 'Ripple',
      AAPL: 'Apple Inc.', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', NVDA: 'NVIDIA',
      GLD: 'Gold (GLD)', SLV: 'Silver (SLV)', XAUUSD: 'Gold', XAGUSD: 'Silver',
      TLT: 'Treasury 20+Y', IEF: 'Treasury 7-10Y', SPY: 'S&P 500', QQQ: 'NASDAQ-100',
      META: 'Meta Platforms', TSLA: 'Tesla', AMD: 'AMD', DOGE: 'Dogecoin',
    };

    const report: UnifiedReport = {
      sessionId,
      symbol,
      assetName: assetNames[symbol] || symbol,
      assetClass,
      generatedAt: new Date().toISOString(),
      capitalFlow: capitalFlowData!,
      fundamentals: fundamentalsData,
      technicalData,
      sentiment: sentimentData,
      horizonAnalyses,
      horizonPredictions,
      expertValidation: expertValidation!,
      overallVerdict,
      overallScore,
      overallDirection,
      overallConfidence,
      summary,
    };

    try {
      await redis.setex(`unified-report:${sessionId}`, 3600, JSON.stringify(report));
    } catch { /* ignore */ }

    updateStep(sessionId, 'report_generation', 'completed');
    completeSession(sessionId);
  } catch (err: any) {
    completeSession(sessionId, err.message);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapCandles(candles: any[]): CandleData[] {
  if (!Array.isArray(candles)) return [];
  return candles.map(c => ({
    timestamp: c.timestamp || c.openTime || 0,
    open: Number(c.open) || 0,
    high: Number(c.high) || 0,
    low: Number(c.low) || 0,
    close: Number(c.close) || 0,
    volume: Number(c.volume) || 0,
  }));
}

function mapCapitalFlow(cfSummary: any, assetClass: string): CapitalFlowData {
  return {
    globalLiquidity: {
      bias: cfSummary.liquidityBias || 'neutral',
      fedBalanceSheet: cfSummary.globalLiquidity?.fedBalanceSheet?.value,
      m2MoneySupply: cfSummary.globalLiquidity?.m2MoneySupply?.value,
      dxy: cfSummary.globalLiquidity?.dxy?.value,
      vix: cfSummary.globalLiquidity?.vix?.value,
    },
    marketFlows: (cfSummary.markets || []).filter((m: any) => m?.market).map((m: any) => ({
      market: m.market,
      flow7d: m.flow7d ?? 0,
      flow30d: m.flow30d ?? 0,
      flowVelocity: m.flowVelocity ?? 0,
      phase: m.phase || 'mid',
      fiveFactorScore: m.fiveFactorScore ?? 50,
    })),
    recommendation: cfSummary.recommendation ? {
      primaryMarket: cfSummary.recommendation.primaryMarket || assetClass,
      action: cfSummary.recommendation.action || 'wait',
      direction: cfSummary.recommendation.direction || 'neutral',
      confidence: cfSummary.recommendation.confidence ?? 50,
      reason: cfSummary.recommendation.reason || '',
    } : null,
  };
}

function buildSentimentData(calendar: any, fgi: any): SentimentData {
  const events = calendar?.events?.slice(0, 5).map((e: any) => ({
    event: e.event || e.name || 'Unknown',
    date: e.date || new Date().toISOString(),
    impact: e.impact || 'medium',
    forecast: e.forecast,
    previous: e.previous,
  })) || [];

  let sentiment: SentimentData = {
    overallSentiment: 'neutral',
    sentimentScore: 0,
    fearGreedIndex: fgi?.value,
    fearGreedLabel: fgi?.classification,
    newsItems: [],
    economicEvents: events,
    shouldBlockTrade: calendar?.shouldBlockTrade || false,
    blockReason: calendar?.blockReason,
  };

  if (fgi?.value) {
    const v = fgi.value;
    if (v >= 60) { sentiment.overallSentiment = 'bullish'; sentiment.sentimentScore = Math.min(100, (v - 50) * 2); }
    else if (v <= 40) { sentiment.overallSentiment = 'bearish'; sentiment.sentimentScore = Math.max(-100, (v - 50) * 2); }
  }

  return sentiment;
}

function buildHorizonAnalysis(horizon: Horizon, tf: string, scan: any): HorizonAnalysis {
  const keyIndicators = extractKeyIndicators(scan);
  const indicatorCounts = countIndicators(keyIndicators);
  const direction = scan.direction || 'neutral';
  // scan.score is 0-10, convert to 0-100
  const score = typeof scan.score === 'number' ? Math.round(scan.score * 10) : 50;

  return {
    horizon,
    timeframe: tf,
    label: HORIZON_LABELS[horizon],
    trend: direction === 'long' ? 'bullish' : direction === 'short' ? 'bearish' : 'neutral',
    trendStrength: score,
    indicators: indicatorCounts,
    keyIndicators,
    supports: scan.levels?.support || [],
    resistances: scan.levels?.resistance || [],
    score,
    direction: direction as 'long' | 'short' | 'neutral',
    confidence: score,
  };
}

function extractKeyIndicators(scan: any): IndicatorResult[] {
  const indicators: IndicatorResult[] = [];

  // Extract from indicator details if available
  const details = scan.indicatorDetails || scan.indicators || {};

  const indicatorMap: Record<string, string> = {
    rsi: 'RSI', macd: 'MACD', ema20: 'EMA 20', ema50: 'EMA 50', ema200: 'EMA 200',
    bb: 'Bollinger Bands', stochastic: 'Stochastic', adx: 'ADX', atr: 'ATR',
    obv: 'OBV', vwap: 'VWAP', ichimoku: 'Ichimoku',
  };

  for (const [key, label] of Object.entries(indicatorMap)) {
    const ind = details[key];
    if (ind) {
      indicators.push({
        name: label,
        value: typeof ind.value === 'number' ? Number(ind.value.toFixed(2)) : (ind.value || 'N/A'),
        signal: ind.signal || 'neutral',
        weight: ind.weight || 1,
      });
    }
  }

  // If no details, use summary counts
  if (indicators.length === 0 && scan.indicatorSummary) {
    const s = scan.indicatorSummary;
    indicators.push(
      { name: 'Trend Indicators', value: `${s.bullish || 0} bullish`, signal: (s.bullish || 0) > (s.bearish || 0) ? 'bullish' : 'bearish', weight: 1 },
      { name: 'Momentum', value: `${s.total || 0} total`, signal: 'neutral', weight: 1 },
    );
  }

  return indicators;
}

function countIndicators(indicators: IndicatorResult[]): { total: number; bullish: number; bearish: number; neutral: number } {
  return {
    total: indicators.length,
    bullish: indicators.filter(i => i.signal === 'bullish').length,
    bearish: indicators.filter(i => i.signal === 'bearish').length,
    neutral: indicators.filter(i => i.signal === 'neutral').length,
  };
}

function getDefaultHorizonAnalysis(horizon: Horizon): HorizonAnalysis {
  return {
    horizon,
    timeframe: HORIZON_TIMEFRAMES[horizon],
    label: HORIZON_LABELS[horizon],
    trend: 'neutral',
    trendStrength: 50,
    indicators: { total: 0, bullish: 0, bearish: 0, neutral: 0 },
    keyIndicators: [],
    supports: [],
    resistances: [],
    score: 50,
    direction: 'neutral',
    confidence: 0,
  };
}

function getDefaultPrediction(horizon: Horizon, currentPrice: number): HorizonPrediction {
  return {
    horizon,
    timeframe: HORIZON_TIMEFRAMES[horizon],
    direction: 'neutral',
    confidence: 0,
    entry: currentPrice,
    stopLoss: currentPrice * 0.95,
    takeProfit1: currentPrice * 1.05,
    takeProfit2: currentPrice * 1.10,
    riskReward: 1,
    reasoning: 'Insufficient data for prediction',
    expectedMovePercent: 0,
    expectedCandles: 0,
  };
}

function getDefaultExpertValidation(): ExpertValidation {
  return {
    experts: [],
    synthesis: 'Expert validation unavailable',
    overallVerdict: 'WAIT',
    overallConfidence: 0,
    agreements: 0,
    disagreements: 0,
  };
}

// ============================================================================
// AI PREDICTIONS (Gemini)
// ============================================================================

async function generateAIPredictions(
  symbol: string,
  assetClass: string,
  technicalData: TechnicalData,
  horizonAnalyses: HorizonAnalysis[],
  capitalFlow: CapitalFlowData | null,
): Promise<HorizonPrediction[]> {
  const currentPrice = technicalData.currentPrice;
  if (!currentPrice) {
    return (['short', 'medium', 'long'] as Horizon[]).map(h => getDefaultPrediction(h, 0));
  }

  // Build a concise prompt with all horizon data
  const horizonSummary = horizonAnalyses.map(h => {
    const indicators = h.keyIndicators.slice(0, 5).map(i => `${i.name}: ${i.value} (${i.signal})`).join(', ');
    return `${h.label} (${h.timeframe}): direction=${h.direction}, score=${h.score}/100, trend=${h.trend}, supports=[${h.supports.slice(0, 3).join(',')}], resistances=[${h.resistances.slice(0, 3).join(',')}], indicators: ${indicators || 'N/A'}`;
  }).join('\n');

  const cfContext = capitalFlow?.recommendation
    ? `Capital Flow: ${capitalFlow.recommendation.direction} on ${capitalFlow.recommendation.primaryMarket} (confidence: ${capitalFlow.recommendation.confidence}%)`
    : 'Capital Flow: N/A';

  const prompt = `You are a quantitative trading analyst. Given the following multi-horizon analysis for ${symbol} (${assetClass}), generate price predictions.

Current Price: $${currentPrice}
${cfContext}

${horizonSummary}

For each horizon (short/medium/long), provide:
- direction: long | short | neutral
- confidence: 0-100
- entry: price level
- stopLoss: price level
- takeProfit1: conservative target
- takeProfit2: aggressive target
- riskReward: ratio
- reasoning: 1 sentence
- expectedMovePercent: expected % move
- expectedCandles: how many candles to reach target

IMPORTANT:
- Entry should be near current price (within 2%)
- Stop loss max 10% from entry
- TP1 max 15%, TP2 max 25% from entry
- If direction is neutral, set entry=currentPrice, minimal TP/SL

Respond ONLY with valid JSON array:
[{"horizon":"short","direction":"...","confidence":...,"entry":...,"stopLoss":...,"takeProfit1":...,"takeProfit2":...,"riskReward":...,"reasoning":"...","expectedMovePercent":...,"expectedCandles":...},...]`;

  const response = await callGeminiWithRetry(
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
    },
    3,
    'unified_ai_predictions',
    'expert',
  );

  const text = response.text || '';
  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return (['short', 'medium', 'long'] as Horizon[]).map(h => getDefaultPrediction(h, currentPrice));
  }

  try {
    const predictions = JSON.parse(jsonMatch[0]);
    return predictions.map((p: any) => ({
      horizon: p.horizon || 'short',
      timeframe: HORIZON_TIMEFRAMES[p.horizon as Horizon] || '1h',
      direction: p.direction || 'neutral',
      confidence: Math.min(100, Math.max(0, Number(p.confidence) || 0)),
      entry: Number(p.entry) || currentPrice,
      stopLoss: Number(p.stopLoss) || currentPrice * 0.95,
      takeProfit1: Number(p.takeProfit1) || currentPrice * 1.05,
      takeProfit2: Number(p.takeProfit2) || currentPrice * 1.10,
      riskReward: Number(p.riskReward) || 1,
      reasoning: p.reasoning || '',
      expectedMovePercent: Number(p.expectedMovePercent) || 0,
      expectedCandles: Number(p.expectedCandles) || 0,
    }));
  } catch {
    return (['short', 'medium', 'long'] as Horizon[]).map(h => getDefaultPrediction(h, currentPrice));
  }
}

// ============================================================================
// EXPERT VALIDATION (Gemini)
// ============================================================================

async function runExpertValidation(
  symbol: string,
  assetClass: string,
  analyses: HorizonAnalysis[],
  predictions: HorizonPrediction[],
  capitalFlow: CapitalFlowData | null,
  sentiment: SentimentData,
): Promise<ExpertValidation> {
  const shortAnalysis = analyses.find(a => a.horizon === 'short');
  const mediumAnalysis = analyses.find(a => a.horizon === 'medium');
  const longAnalysis = analyses.find(a => a.horizon === 'long');

  const dataContext = `
Symbol: ${symbol} (${assetClass})
Short-Term: direction=${shortAnalysis?.direction || 'N/A'}, score=${shortAnalysis?.score || 0}
Medium-Term: direction=${mediumAnalysis?.direction || 'N/A'}, score=${mediumAnalysis?.score || 0}
Long-Term: direction=${longAnalysis?.direction || 'N/A'}, score=${longAnalysis?.score || 0}
Sentiment: ${sentiment.overallSentiment}, Fear&Greed: ${sentiment.fearGreedIndex || 'N/A'}
Capital Flow Bias: ${capitalFlow?.globalLiquidity?.bias || 'N/A'}
Trade Blocked: ${sentiment.shouldBlockTrade}`;

  const prompt = `You are a panel of 4 AI trading experts validating a multi-horizon analysis.

${dataContext}

Each expert has a specialty:
1. ARIA (Technical Analysis): Evaluates indicator confluence, trend alignment across timeframes
2. ORACLE (Whale & Flow): Evaluates capital flow, smart money behavior, market structure
3. SENTINEL (Risk Management): Evaluates risk/reward, position sizing, drawdown potential
4. NEXUS (Market Correlation): Evaluates inter-market dynamics, sector rotation, macro alignment

For each expert, provide a verdict and 2-3 key points.
Then synthesize into an overall verdict: GO | CONDITIONAL_GO | WAIT | AVOID

If trade is blocked due to economic events, verdict MUST be AVOID.

Respond ONLY with valid JSON:
{
  "experts": [
    {"expertName":"ARIA","role":"Technical Analyst","verdict":"bullish|bearish|neutral","confidence":0-100,"keyPoints":["...","..."]},
    {"expertName":"ORACLE","role":"Flow Analyst","verdict":"...","confidence":...,"keyPoints":[...]},
    {"expertName":"SENTINEL","role":"Risk Manager","verdict":"...","confidence":...,"keyPoints":[...]},
    {"expertName":"NEXUS","role":"Correlation Analyst","verdict":"...","confidence":...,"keyPoints":[...]}
  ],
  "synthesis":"1-2 sentence overall assessment",
  "overallVerdict":"GO|CONDITIONAL_GO|WAIT|AVOID",
  "overallConfidence":0-100
}`;

  const response = await callGeminiWithRetry(
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
    },
    3,
    'unified_expert_validation',
    'expert',
  );

  const text = response.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return getDefaultExpertValidation();

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const experts = (parsed.experts || []).map((e: any) => ({
      expertName: e.expertName || 'Unknown',
      role: e.role || '',
      verdict: e.verdict || 'neutral',
      confidence: Math.min(100, Math.max(0, Number(e.confidence) || 0)),
      keyPoints: Array.isArray(e.keyPoints) ? e.keyPoints : [],
    }));

    const bullishCount = experts.filter((e: any) => e.verdict === 'bullish').length;
    const bearishCount = experts.filter((e: any) => e.verdict === 'bearish').length;

    return {
      experts,
      synthesis: parsed.synthesis || '',
      overallVerdict: parsed.overallVerdict || 'WAIT',
      overallConfidence: Math.min(100, Math.max(0, Number(parsed.overallConfidence) || 50)),
      agreements: Math.max(bullishCount, bearishCount),
      disagreements: experts.length - Math.max(bullishCount, bearishCount),
    };
  } catch {
    return getDefaultExpertValidation();
  }
}

// ============================================================================
// OVERALL VERDICT CALCULATION
// ============================================================================

function calculateOverallVerdict(
  analyses: HorizonAnalysis[],
  predictions: HorizonPrediction[],
  expert: ExpertValidation,
  sentiment: SentimentData,
): { overallVerdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID'; overallScore: number; overallDirection: 'long' | 'short' | 'neutral'; overallConfidence: number } {

  // If trade is blocked, AVOID
  if (sentiment.shouldBlockTrade) {
    return { overallVerdict: 'AVOID', overallScore: 20, overallDirection: 'neutral', overallConfidence: 90 };
  }

  // Weighted score: medium-term 50%, short-term 25%, long-term 25%
  const short = analyses.find(a => a.horizon === 'short');
  const medium = analyses.find(a => a.horizon === 'medium');
  const long = analyses.find(a => a.horizon === 'long');

  const weightedScore = Math.round(
    (short?.score || 50) * 0.25 +
    (medium?.score || 50) * 0.50 +
    (long?.score || 50) * 0.25
  );

  // Direction: majority vote
  const directions = analyses.map(a => a.direction);
  const longCount = directions.filter(d => d === 'long').length;
  const shortCount = directions.filter(d => d === 'short').length;
  let direction: 'long' | 'short' | 'neutral' = 'neutral';
  if (longCount > shortCount) direction = 'long';
  else if (shortCount > longCount) direction = 'short';

  // Expert override: if expert says AVOID, respect it
  if (expert.overallVerdict === 'AVOID') {
    return { overallVerdict: 'AVOID', overallScore: Math.min(weightedScore, 30), overallDirection: direction, overallConfidence: expert.overallConfidence };
  }

  // Confidence = average of expert and analysis
  const avgAnalysisConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / Math.max(analyses.length, 1);
  const confidence = Math.round((avgAnalysisConfidence + expert.overallConfidence) / 2);

  // Verdict based on score
  let verdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  if (weightedScore >= 70 && confidence >= 60) verdict = 'GO';
  else if (weightedScore >= 55 && confidence >= 40) verdict = 'CONDITIONAL_GO';
  else if (weightedScore >= 40) verdict = 'WAIT';
  else verdict = 'AVOID';

  return { overallVerdict: verdict, overallScore: weightedScore, overallDirection: direction, overallConfidence: confidence };
}

// ============================================================================
// AI SUMMARY
// ============================================================================

async function generateSummary(
  symbol: string,
  assetClass: string,
  verdict: string,
  direction: string,
  score: number,
  analyses: HorizonAnalysis[],
  capitalFlow: CapitalFlowData | null,
): Promise<string> {
  const short = analyses.find(a => a.horizon === 'short');
  const medium = analyses.find(a => a.horizon === 'medium');
  const long = analyses.find(a => a.horizon === 'long');

  const prompt = `Write a concise 2-3 sentence executive summary for ${symbol} (${assetClass}) analysis.

Verdict: ${verdict} (Score: ${score}/100, Direction: ${direction})
Short-term: ${short?.direction || 'neutral'} (${short?.score || 0}/100)
Medium-term: ${medium?.direction || 'neutral'} (${medium?.score || 0}/100)
Long-term: ${long?.direction || 'neutral'} (${long?.score || 0}/100)
Capital Flow: ${capitalFlow?.globalLiquidity?.bias || 'neutral'}

Rules:
- Be specific with data
- No generic advice
- Professional analyst tone
- Max 3 sentences`;

  try {
    const response = await callGeminiWithRetry(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 200 },
      },
      2,
      'unified_summary',
      'default',
    );
    return response.text?.trim() || `${symbol} analysis: ${verdict} with ${score}/100 score. Direction: ${direction}.`;
  } catch {
    return `${symbol} analysis: ${verdict} with ${score}/100 score. Direction: ${direction}.`;
  }
}

// ============================================================================
// EXTERNAL DATA HELPERS
// ============================================================================

async function fetchFearGreed(): Promise<{ value: number; classification: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch('https://api.alternative.me/fng/?limit=1', { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data?.data?.[0]) {
      return {
        value: Number(data.data[0].value),
        classification: data.data[0].value_classification,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchStockFundamentals(symbol: string): Promise<Partial<FundamentalsData>> {
  // Yahoo Finance quote summary for stock fundamentals
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,financialData,summaryDetail,earnings`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return {};

    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return {};

    const keyStats = result.defaultKeyStatistics || {};
    const financial = result.financialData || {};
    const summary = result.summaryDetail || {};

    return {
      peRatio: summary.trailingPE?.raw,
      eps: financial.currentPrice?.raw ? (financial.totalRevenue?.raw / financial.currentPrice?.raw) : undefined,
      revenue: financial.totalRevenue?.raw,
      revenueGrowth: financial.revenueGrowth?.raw,
      profitMargin: financial.profitMargins?.raw,
      dividendYield: summary.dividendYield?.raw,
      beta: keyStats.beta?.raw,
      targetPrice: financial.targetMeanPrice?.raw,
      numberOfAnalysts: financial.numberOfAnalystOpinions?.raw,
      analystRating: mapAnalystRating(financial.recommendationKey),
    };
  } catch {
    return {};
  }
}

function mapAnalystRating(key?: string): string | undefined {
  if (!key) return undefined;
  const mapping: Record<string, string> = {
    strong_buy: 'strong_buy', buy: 'buy', hold: 'hold',
    sell: 'sell', strong_sell: 'strong_sell',
    underperform: 'sell', outperform: 'buy', overweight: 'buy', underweight: 'sell',
  };
  return mapping[key.toLowerCase()] || 'hold';
}
