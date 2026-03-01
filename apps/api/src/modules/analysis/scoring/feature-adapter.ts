/**
 * Feature Adapter
 *
 * Bridges the gap between the analysis engine's step results
 * and the closed-form scoring system's input format.
 *
 * Two converters:
 *
 * 1. extractAllStepRawValues()
 *    Engine step results → AllStepRawValues
 *    Maps rich result objects into flat key→value records
 *    matching the feature definitions in step-score-formulas.ts.
 *
 * 2. extractMLISScores()
 *    MLISResult → MetaEnsembleInput.mlisScores
 *    Maps MLIS layer objects into the simple numeric format
 *    expected by the meta-ensemble.
 *
 * 3. extractTrapData()
 *    TrapCheckResult → ClosedFormAggregateInput.trapData
 *    Maps trap detection results into the format expected
 *    by the closed-form aggregation.
 */

import type { AllStepRawValues } from './step-score-formulas';

// ============================================================
// Engine result interfaces (minimal shape — avoids importing
// the 6000-line engine file)
// ============================================================

interface MarketPulseResultShape {
  score: number;
  fearGreedIndex: number;
  trend: { direction: string; strength: number; timeframesAligned?: number };
  futuresData?: {
    fundingRate?: number;
    longShortRatio?: number;
    openInterestChange24h?: number;
  };
  newsSentiment?: { overall: string; score?: number };
  economicCalendar?: { macroPenalty?: number; riskLevel?: string };
  marketRegime?: string;
}

interface AssetScanResultShape {
  score: number;
  currentPrice: number;
  timeframes?: Array<{ tf: string; trend: string; strength: number }>;
  indicators?: {
    rsi?: number;
    macd?: { histogram?: number };
    movingAverages?: { ma50?: number; ma200?: number };
    atr?: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  indicatorDetails?: Record<string, any>;
  direction?: string | null;
  directionConfidence?: number;
  elliottWave?: {
    confidence?: number;
    direction?: string;
    currentWave?: string;
    waveType?: string;
  };
}

interface SafetyCheckResultShape {
  score: number;
  riskLevel: string;
  manipulation?: {
    spoofingDetected?: boolean;
    layeringDetected?: boolean;
    washTrading?: boolean;
    pumpDumpRisk?: string;
  };
  contractSecurity?: {
    isHoneypot?: boolean;
    isVerified?: boolean;
    liquidityLocked?: boolean;
    sellTax?: number;
    riskScore?: number;
  };
  advancedMetrics?: {
    liquidityScore?: number;
  };
}

interface TimingResultShape {
  score: number;
  tradeNow: boolean;
  conditions?: Array<{ name: string; met: boolean }>;
  fibonacci?: {
    nearGoldenZone?: boolean;
    retracementPct?: number;
  };
}

interface TradePlanResultShape {
  score: number;
  riskReward: number;
  winRateEstimate?: number;
  stopLoss?: { percentage?: number };
  direction?: string;
  fibAlignedTargets?: boolean;
}

interface TrapCheckResultShape {
  score: number;
  riskLevel: string;
  traps?: {
    bullTrap?: boolean;
    bearTrap?: boolean;
    fakeoutRisk?: string;
    liquidityGrab?: { detected?: boolean };
    fibLevelTrap?: boolean;
  };
}

interface MLISResultShape {
  layers: {
    technical: { score: number };
    momentum: { score: number };
    volatility: { score: number };
    volume: { score: number };
    sentiment?: { score: number };
    onchain?: { score: number };
  };
  overallScore: number;
  confidence: number;
}

// ============================================================
// 1. Extract AllStepRawValues from engine step results
// ============================================================

/**
 * Convert engine step results into the flat key→value format
 * expected by computeAllStepScores().
 *
 * Each step's raw values are keyed by the feature names
 * defined in step-score-formulas.ts (MARKET_PULSE_FEATURES, etc.).
 */
export function extractAllStepRawValues(
  steps: {
    marketPulse: MarketPulseResultShape;
    assetScan: AssetScanResultShape;
    safetyCheck: SafetyCheckResultShape;
    timing: TimingResultShape;
    trapCheck: TrapCheckResultShape;
  },
  tradePlan: TradePlanResultShape | null,
): AllStepRawValues {
  const { marketPulse, assetScan, safetyCheck, timing, trapCheck } = steps;

  return {
    marketPulse: extractMarketPulseValues(marketPulse),
    assetScan: extractAssetScanValues(assetScan),
    safetyCheck: extractSafetyCheckValues(safetyCheck),
    timing: extractTimingValues(timing, assetScan),
    tradePlan: extractTradePlanValues(tradePlan, assetScan),
    trapCheck: extractTrapCheckValues(trapCheck),
  };
}

// ── Market Pulse ──

function extractMarketPulseValues(
  mp: MarketPulseResultShape,
): Record<string, number | string | boolean> {
  // GLRS score: derive from market regime + trend strength
  // risk_on → high score, risk_off → low, neutral → mid
  const regimeScore =
    mp.marketRegime === 'risk_on' ? 70 :
    mp.marketRegime === 'risk_off' ? 30 : 50;
  const glrsScore = regimeScore + (mp.trend?.strength ?? 0) * 0.2;

  return {
    glrsScore: Math.max(0, Math.min(100, glrsScore)),
    btcTrendStrength: (mp.trend?.strength ?? 50) / 100,
    fearGreedValue: mp.fearGreedIndex ?? 50,
    timeframesAligned: mp.trend?.timeframesAligned ?? 0,
    fundingRate: mp.futuresData?.fundingRate ?? 0,
    longShortRatio: mp.futuresData?.longShortRatio ?? 1,
    newsSentiment: mp.newsSentiment?.overall ?? 'neutral',
    macroPenalty: String(mp.economicCalendar?.macroPenalty ?? 0),
  };
}

// ── Asset Scan ──

function extractAssetScanValues(
  as: AssetScanResultShape,
): Record<string, number | string | boolean> {
  // Trend strengths per timeframe
  const trend1d = as.timeframes?.find(t => t.tf === '1D');
  const trend4h = as.timeframes?.find(t => t.tf === '4H');

  // RSI normalized = distance from 50
  const rsi = as.indicators?.rsi ?? 50;
  const rsiNormalized = Math.abs(rsi - 50);

  // Price vs MA (binary)
  const price = as.currentPrice ?? 0;
  const ma50 = as.indicators?.movingAverages?.ma50 ?? 0;
  const ma200 = as.indicators?.movingAverages?.ma200 ?? 0;

  // Elliott Wave: confidence normalized to 0-1, trend alignment
  const ewConfidence = (as.elliottWave?.confidence ?? 0) / 100;
  const ewDirection = as.elliottWave?.direction ?? 'neutral';
  const primaryTrendDir = trend1d?.trend ?? trend4h?.trend ?? 'neutral';
  const waveAligned = ewConfidence > 0.3 && ewDirection === primaryTrendDir;

  return {
    trend1dStrength: (trend1d?.strength ?? 50) / 100,
    trend4hStrength: (trend4h?.strength ?? 50) / 100,
    rsiNormalized,
    macdHistogram: as.indicators?.macd?.histogram ?? 0,
    priceAboveMa50: ma50 > 0 ? price > ma50 : false,
    priceAboveMa200: ma200 > 0 ? price > ma200 : false,
    adxStrength: (as.indicatorDetails?.adx?.value ?? 25) / 100,
    elliottWaveConfidence: ewConfidence,
    waveAlignedWithTrend: waveAligned,
  };
}

// ── Safety Check ──

function extractSafetyCheckValues(
  sc: SafetyCheckResultShape,
): Record<string, number | string | boolean> {
  return {
    spoofingDetected: sc.manipulation?.spoofingDetected ?? false,
    layeringDetected: sc.manipulation?.layeringDetected ?? false,
    washTrading: sc.manipulation?.washTrading ?? false,
    pumpDumpRisk: sc.manipulation?.pumpDumpRisk ?? 'low',
    honeypot: sc.contractSecurity?.isHoneypot ?? false,
    liquidityScore: sc.advancedMetrics?.liquidityScore ?? 50,
    contractVerified: sc.contractSecurity?.isVerified ?? true,
    liquidityLocked: sc.contractSecurity?.liquidityLocked ?? false,
    sellTaxNormalized: Math.min(1, (sc.contractSecurity?.sellTax ?? 0) / 20),
  };
}

// ── Timing ──

function extractTimingValues(
  tm: TimingResultShape,
  as: AssetScanResultShape,
): Record<string, number | string | boolean> {
  const conditions = tm.conditions ?? [];
  const conditionNames = conditions.filter(c => c.met).map(c => c.name.toLowerCase());

  // RSI in zone: check if RSI is in oversold/overbought zone (good for entry)
  const rsi = as.indicators?.rsi ?? 50;
  const rsiInZone = rsi < 35 || rsi > 65;

  // MACD crossing: check conditions
  const macdCrossing = conditionNames.some(n =>
    n.includes('macd') || n.includes('cross'),
  );

  // Near support
  const nearSupport = conditionNames.some(n =>
    n.includes('support') || n.includes('level'),
  );

  // Volume confirmation
  const volumeConfirm = conditionNames.some(n =>
    n.includes('volume') || n.includes('vol'),
  );

  // Candlestick pattern
  const candlePattern = conditionNames.some(n =>
    n.includes('candle') || n.includes('pattern') || n.includes('engulf'),
  );

  // Fibonacci: near golden zone (38.2%-61.8% retracement) is a high-quality entry
  const nearFibLevel = tm.fibonacci?.nearGoldenZone ?? false;

  return {
    rsiInZone,
    bbPosition: 0.5, // Will be overridden by rolling stats
    macdCrossing,
    trendAligned: tm.tradeNow,
    nearSupport,
    volumeConfirm,
    pvtDivergence: 0, // Requires rolling history
    candlePattern,
    nearFibLevel,
  };
}

// ── Trade Plan ──

function extractTradePlanValues(
  tp: TradePlanResultShape | null,
  as: AssetScanResultShape,
): Record<string, number | string | boolean> {
  if (!tp) {
    return {
      avgRiskReward: 0,
      trendStrength: 0,
      winRateEstimate: 0,
      stopTightness: 0,
      expectancy: 0,
    };
  }

  // Trend strength from asset scan
  const trend1d = as.timeframes?.find(t => t.tf === '1D');
  const trendStrength = (trend1d?.strength ?? 50) / 100;

  // Stop tightness: tighter stop = higher value (inverse of stop % distance)
  const stopPct = tp.stopLoss?.percentage ?? 5;
  const stopTightness = Math.max(0, Math.min(1, 1 - stopPct / 10));

  // Win rate
  const winRate = (tp.winRateEstimate ?? 50) / 100;

  // Expectancy = R:R × winRate - (1 - winRate)
  const expectancy = tp.riskReward * winRate - (1 - winRate);

  return {
    avgRiskReward: tp.riskReward,
    trendStrength,
    winRateEstimate: winRate,
    stopTightness,
    expectancy: Math.max(-1, Math.min(2, expectancy)),
    fibAlignedTargets: tp.fibAlignedTargets ?? false,
  };
}

// ── Trap Check ──

function extractTrapCheckValues(
  tc: TrapCheckResultShape,
): Record<string, number | string | boolean> {
  return {
    bullTrapDetected: tc.traps?.bullTrap ?? false,
    bearTrapDetected: tc.traps?.bearTrap ?? false,
    fakeoutRisk: tc.traps?.fakeoutRisk ?? 'low',
    lowVolumeBreakout: tc.traps?.liquidityGrab?.detected ?? false,
    oiDivergence: 0, // Requires OI data from futures API
    fibLevelTrap: tc.traps?.fibLevelTrap ?? false,
  };
}

// ============================================================
// 2. Extract MLIS scores for meta-ensemble
// ============================================================

/**
 * Convert MLIS layer results into the simple numeric format
 * expected by MetaEnsembleInput.mlisScores.
 *
 * Each layer score is 0-100 in MLIS → passed directly.
 */
export function extractMLISScores(
  mlis: MLISResultShape,
): {
  technical: number;
  momentum: number;
  volatility: number;
  volume: number;
  sentiment?: number;
  onchain?: number;
} {
  return {
    technical: mlis.layers.technical.score,
    momentum: mlis.layers.momentum.score,
    volatility: mlis.layers.volatility.score,
    volume: mlis.layers.volume.score,
    sentiment: mlis.layers.sentiment?.score,
    onchain: mlis.layers.onchain?.score,
  };
}

// ============================================================
// 3. Extract trap data for closed-form aggregation
// ============================================================

/**
 * Convert trap check result into the format expected by
 * ClosedFormAggregateInput.trapData.
 */
export function extractTrapData(
  tc: TrapCheckResultShape,
): {
  bullTrapDetected: boolean;
  bearTrapDetected: boolean;
  fakeoutRisk: 'low' | 'medium' | 'high';
  lowVolumeBreakout: boolean;
  oiDivergence?: number;
} {
  const fakeoutRisk = tc.traps?.fakeoutRisk as 'low' | 'medium' | 'high' ?? 'low';

  return {
    bullTrapDetected: tc.traps?.bullTrap ?? false,
    bearTrapDetected: tc.traps?.bearTrap ?? false,
    fakeoutRisk: ['low', 'medium', 'high'].includes(fakeoutRisk) ? fakeoutRisk : 'low',
    lowVolumeBreakout: tc.traps?.liquidityGrab?.detected ?? false,
  };
}

// ============================================================
// 4. Determine critical safety issue
// ============================================================

/**
 * Check if safety check indicates a critical issue
 * that should block trading entirely.
 */
export function hasCriticalSafetyIssue(
  safetyCheck: SafetyCheckResultShape,
): boolean {
  // Score ≤ 2 is critical
  if (safetyCheck.score <= 2) return true;

  // Risk level critical
  if (safetyCheck.riskLevel === 'critical') return true;

  // Honeypot detected
  if (safetyCheck.contractSecurity?.isHoneypot) return true;

  return false;
}

/**
 * Check if economic calendar should block trading.
 */
export function hasEconomicBlock(
  marketPulse: MarketPulseResultShape,
): boolean {
  const penalty = marketPulse.economicCalendar?.macroPenalty ?? 0;
  // Macro penalty of -3 = FOMC day (full block)
  // Macro penalty of -2 = high-impact event within 4h
  return penalty <= -2;
}
