// ===========================================
// Outcome Calculation Service
// Compares analysis predictions with actual market outcomes
// Based on TP/SL hit detection from trade plan
// ===========================================

import { prisma } from '../../core/database';
import { detectAssetClass } from '../analysis/providers/symbol-resolver';

interface OutcomeResult {
  outcome: 'correct' | 'incorrect' | 'pending';
  priceChange: number;
  outcomePrice: number;
  hitType: 'tp1' | 'tp2' | 'tp3' | 'sl' | 'none';
  hitPrice?: number;
  hitTime?: Date;
  stepOutcomes: Record<string, {
    predicted: unknown;
    actual: unknown;
    correct: boolean;
  }>;
}

interface StepOutcome {
  predicted: unknown;
  actual: unknown;
  correct: boolean;
}

interface TradePlan {
  direction: string;
  averageEntry: number;
  stopLoss: { price: number; percentage: number };
  takeProfits: Array<{ price: number; percentage: number }>;
}

interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  closeTime: number;
}

// Fetch current price (multi-asset: crypto from Binance, others from Yahoo)
async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const assetClass = detectAssetClass(symbol);
    if (assetClass !== 'crypto') {
      // Non-crypto: use multi-asset provider (Yahoo Finance)
      const { fetchTicker } = await import('../analysis/providers/multi-asset-data-provider');
      const ticker = await fetchTicker(symbol);
      return ticker?.price ?? null;
    }

    // Crypto: use Binance
    const pair = `${symbol.toUpperCase()}USDT`;
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    if (!response.ok) return null;

    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return null;
    }

    let data: { price: string };
    try {
      data = JSON.parse(responseText);
    } catch {
      return null;
    }

    return parseFloat(data.price);
  } catch {
    return null;
  }
}

// Fetch historical OHLC data (multi-asset: crypto from Binance, others from Yahoo)
async function fetchOHLCData(
  symbol: string,
  startTime: Date,
  endTime: Date,
  interval: string = '1h'
): Promise<KlineData[]> {
  try {
    const assetClass = detectAssetClass(symbol);

    // Non-crypto: use multi-asset provider
    if (assetClass !== 'crypto') {
      try {
        const { fetchCandles } = await import('../analysis/providers/multi-asset-data-provider');
        const candles = await fetchCandles(symbol, interval === '1h' ? '1h' : interval, 500);
        return candles
          .filter(c => c.timestamp >= startTime.getTime() && c.timestamp <= endTime.getTime())
          .map(c => ({
            openTime: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            closeTime: c.timestamp + 3600000,
          }));
      } catch {
        return [];
      }
    }

    // Crypto: use Binance
    const pair = `${symbol.toUpperCase()}USDT`;
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${startTime.getTime()}&endTime=${endTime.getTime()}&limit=1000`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return [];
    }

    let data: any[];
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Invalid JSON response from Binance API');
      return [];
    }

    return data.map((k: any[]) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      closeTime: k[6]
    }));
  } catch (error) {
    console.error('Failed to fetch OHLC data:', error);
    return [];
  }
}

// Check if TP or SL was hit in the price history
function checkTPSLHit(
  klines: KlineData[],
  direction: string,
  entryPrice: number,
  stopLoss: number,
  takeProfits: number[]
): { hitType: 'tp1' | 'tp2' | 'tp3' | 'sl' | 'none'; hitPrice?: number; hitTime?: Date } {

  for (const kline of klines) {
    const high = kline.high;
    const low = kline.low;

    if (direction === 'long') {
      // For LONG: SL is below entry, TP is above entry
      // Check SL first (worst case)
      if (low <= stopLoss) {
        return { hitType: 'sl', hitPrice: stopLoss, hitTime: new Date(kline.openTime) };
      }
      // Check TPs (best case)
      for (let i = 0; i < takeProfits.length; i++) {
        if (high >= takeProfits[i]) {
          const tpType = ['tp1', 'tp2', 'tp3'][i] as 'tp1' | 'tp2' | 'tp3';
          return { hitType: tpType, hitPrice: takeProfits[i], hitTime: new Date(kline.openTime) };
        }
      }
    } else if (direction === 'short') {
      // For SHORT: SL is above entry, TP is below entry
      // Check SL first (worst case)
      if (high >= stopLoss) {
        return { hitType: 'sl', hitPrice: stopLoss, hitTime: new Date(kline.openTime) };
      }
      // Check TPs (best case)
      for (let i = 0; i < takeProfits.length; i++) {
        if (low <= takeProfits[i]) {
          const tpType = ['tp1', 'tp2', 'tp3'][i] as 'tp1' | 'tp2' | 'tp3';
          return { hitType: tpType, hitPrice: takeProfits[i], hitTime: new Date(kline.openTime) };
        }
      }
    }
  }

  return { hitType: 'none' };
}

// Extract trade plan from report data
function extractTradePlan(reportData: Record<string, unknown>): TradePlan | null {
  const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;
  if (!tradePlan) return null;

  const direction = tradePlan.direction as string;
  const averageEntry = tradePlan.averageEntry as number;
  const stopLoss = tradePlan.stopLoss as { price: number; percentage: number } | undefined;
  const takeProfits = tradePlan.takeProfits as Array<{ price: number; percentage: number }> | undefined;

  if (!direction || !averageEntry || !stopLoss || !takeProfits) return null;

  return {
    direction,
    averageEntry,
    stopLoss,
    takeProfits
  };
}

// Extract entry price from report data
function extractEntryPrice(reportData: Record<string, unknown>): number | null {
  const assetScan = reportData.assetScan as Record<string, unknown> | undefined;
  const timing = reportData.timing as Record<string, unknown> | undefined;
  const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;

  if (tradePlan?.averageEntry) return Number(tradePlan.averageEntry);
  if (assetScan?.currentPrice) return Number(assetScan.currentPrice);
  if (timing?.currentPrice) return Number(timing.currentPrice);

  return null;
}

// Calculate step-by-step outcome based on TP/SL result
function calculateStepOutcomes(
  reportData: Record<string, unknown>,
  entryPrice: number,
  currentPrice: number,
  hitType: 'tp1' | 'tp2' | 'tp3' | 'sl' | 'none',
  direction: string
): Record<string, StepOutcome> {
  const outcomes: Record<string, StepOutcome> = {};
  const tradeSuccessful = hitType === 'tp1' || hitType === 'tp2' || hitType === 'tp3';
  const tradeFailed = hitType === 'sl';
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
  const priceWentUp = priceChange > 0;

  // Market Pulse outcome
  const marketPulse = reportData.marketPulse as Record<string, unknown> | undefined;
  if (marketPulse) {
    const trend = marketPulse.trend as Record<string, unknown> | undefined;
    const predictedDirection = trend?.direction as string;
    const actualDirection = priceWentUp ? 'bullish' : 'bearish';
    outcomes.marketPulse = {
      predicted: predictedDirection,
      actual: actualDirection,
      correct: (predictedDirection === 'bullish' && priceWentUp) ||
               (predictedDirection === 'bearish' && !priceWentUp) ||
               predictedDirection === 'neutral'
    };
  }

  // Asset Scanner outcome
  const assetScan = reportData.assetScan as Record<string, unknown> | undefined;
  if (assetScan) {
    const indicators = assetScan.indicators as Record<string, unknown> | undefined;
    const rsi = indicators?.rsi as number | undefined;
    let rsiPrediction = 'neutral';
    if (rsi && rsi > 70) rsiPrediction = 'bearish';
    else if (rsi && rsi < 30) rsiPrediction = 'bullish';

    outcomes.assetScanner = {
      predicted: rsiPrediction,
      actual: priceWentUp ? 'bullish' : 'bearish',
      correct: rsiPrediction === 'neutral' ||
               (rsiPrediction === 'bullish' && priceWentUp) ||
               (rsiPrediction === 'bearish' && !priceWentUp)
    };
  }

  // Safety Check outcome
  const safetyCheck = reportData.safetyCheck as Record<string, unknown> | undefined;
  if (safetyCheck) {
    const riskLevel = safetyCheck.riskLevel as string;
    // High risk warning should correlate with SL hit
    outcomes.safetyCheck = {
      predicted: riskLevel,
      actual: tradeFailed ? 'high risk confirmed' : 'risk managed',
      correct: (riskLevel === 'high' || riskLevel === 'extreme') ? tradeFailed : tradeSuccessful
    };
  }

  // Timing outcome
  const timing = reportData.timing as Record<string, unknown> | undefined;
  if (timing) {
    const tradeNow = timing.tradeNow as boolean;
    outcomes.timing = {
      predicted: tradeNow ? 'trade now' : 'wait',
      actual: tradeSuccessful ? 'good timing' : tradeFailed ? 'poor timing' : 'neutral',
      correct: tradeNow ? tradeSuccessful : true // If "wait" was recommended, we don't penalize
    };
  }

  // Trade Plan outcome - THE MOST IMPORTANT ONE
  const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;
  if (tradePlan) {
    let tradeResult = 'pending';
    if (hitType === 'tp1') tradeResult = 'TP1 hit';
    else if (hitType === 'tp2') tradeResult = 'TP2 hit';
    else if (hitType === 'tp3') tradeResult = 'TP3 hit';
    else if (hitType === 'sl') tradeResult = 'SL hit';

    outcomes.tradePlan = {
      predicted: `${direction} trade`,
      actual: tradeResult,
      correct: tradeSuccessful
    };
  }

  // Trap Check outcome
  const trapCheck = reportData.trapCheck as Record<string, unknown> | undefined;
  if (trapCheck) {
    const traps = trapCheck.traps as Record<string, unknown> | undefined;
    const bullTrap = traps?.bullTrap as boolean;
    const bearTrap = traps?.bearTrap as boolean;

    // If trap was warned and trade failed, trap check was correct
    const trapWarned = bullTrap || bearTrap;
    outcomes.trapCheck = {
      predicted: trapWarned ? 'trap warning' : 'no trap',
      actual: tradeFailed ? 'trap occurred' : 'no trap',
      correct: (trapWarned && tradeFailed) || (!trapWarned && tradeSuccessful) || (!trapWarned && hitType === 'none')
    };
  }

  // Final Verdict outcome - THE OVERALL RECOMMENDATION
  const finalVerdict = reportData.finalVerdict as Record<string, unknown> | undefined;
  const verdict = (finalVerdict?.verdict as string) || '';
  const verdictLower = verdict.toLowerCase();

  // GO/Conditional GO should result in TP hit, WAIT/AVOID should result in avoiding loss
  const wasGoSignal = verdictLower.includes('go') && !verdictLower.includes('wait') && !verdictLower.includes('avoid');
  const wasWaitSignal = verdictLower.includes('wait') || verdictLower.includes('avoid');

  outcomes.finalVerdict = {
    predicted: verdict || 'unknown',
    actual: tradeSuccessful ? 'TP hit' : tradeFailed ? 'SL hit' : 'pending',
    correct: wasGoSignal ? tradeSuccessful : wasWaitSignal ? tradeFailed : false
  };

  return outcomes;
}

// Calculate outcome for a single report based on TP/SL hit
export async function calculateReportOutcome(reportId: string): Promise<OutcomeResult | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      symbol: true,
      direction: true,
      entryPrice: true,
      reportData: true,
      generatedAt: true,
      expiresAt: true,
      outcome: true
    }
  });

  if (!report) return null;
  if (report.outcome) {
    // Already calculated
    return null;
  }

  const reportData = report.reportData as Record<string, unknown>;

  // Extract trade plan with TP/SL levels
  const tradePlan = extractTradePlan(reportData);
  if (!tradePlan) {
    console.error(`No trade plan found for report ${reportId}`);
    return null;
  }

  // Get entry price
  let entryPrice = report.entryPrice ? Number(report.entryPrice) : null;
  if (!entryPrice) {
    entryPrice = extractEntryPrice(reportData);
  }
  if (!entryPrice) {
    entryPrice = tradePlan.averageEntry;
  }

  if (!entryPrice) {
    console.error(`No entry price for report ${reportId}`);
    return null;
  }

  // Fetch current price
  const currentPrice = await fetchCurrentPrice(report.symbol);
  if (!currentPrice) {
    console.error(`Failed to fetch price for ${report.symbol}`);
    return null;
  }

  // Fetch historical OHLC data from analysis date to now
  const now = new Date();
  const klines = await fetchOHLCData(report.symbol, report.generatedAt, now, '1h');

  // Extract TP/SL prices
  const slPrice = tradePlan.stopLoss.price;
  const tpPrices = tradePlan.takeProfits.map(tp => tp.price);

  // Check if TP or SL was hit
  const hitResult = checkTPSLHit(klines, tradePlan.direction, entryPrice, slPrice, tpPrices);

  // Determine outcome - ONLY based on TP/SL hit, no time-based expiration
  let outcome: 'correct' | 'incorrect' | 'pending' = 'pending';
  if (hitResult.hitType === 'tp1' || hitResult.hitType === 'tp2' || hitResult.hitType === 'tp3') {
    outcome = 'correct'; // TP hit = successful trade = correct analysis
  } else if (hitResult.hitType === 'sl') {
    outcome = 'incorrect'; // SL hit = failed trade = incorrect analysis
  } else {
    // Neither TP nor SL hit yet - keep as pending until one is hit
    // No arbitrary time limits - we wait for real market outcomes
    outcome = 'pending';
  }

  // Calculate price change
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

  // Only update the database when TP or SL is actually hit
  // If still pending, don't update - this allows the report to be checked again later
  if (outcome === 'pending') {
    return {
      outcome,
      priceChange,
      outcomePrice: currentPrice,
      hitType: hitResult.hitType,
      hitPrice: hitResult.hitPrice,
      hitTime: hitResult.hitTime,
      stepOutcomes: {}
    };
  }

  // Calculate step outcomes only when we have a definitive result
  const stepOutcomes = calculateStepOutcomes(
    reportData,
    entryPrice,
    currentPrice,
    hitResult.hitType,
    tradePlan.direction
  );

  // Update the report with outcome data
  await prisma.report.update({
    where: { id: reportId },
    data: {
      outcome,
      outcomePrice: hitResult.hitPrice || currentPrice,
      outcomePriceChange: priceChange,
      outcomeCalculatedAt: new Date(),
      stepOutcomes: {
        ...stepOutcomes,
        _meta: {
          hitType: hitResult.hitType,
          hitPrice: hitResult.hitPrice,
          hitTime: hitResult.hitTime?.toISOString(),
          entryPrice,
          slPrice,
          tpPrices
        }
      }
    }
  });

  return {
    outcome,
    priceChange,
    outcomePrice: hitResult.hitPrice || currentPrice,
    hitType: hitResult.hitType,
    hitPrice: hitResult.hitPrice,
    hitTime: hitResult.hitTime,
    stepOutcomes
  };
}

// Calculate outcomes for all reports that need calculation
// Now checks based on TP/SL hit, not just expiration
export async function calculateExpiredOutcomes(): Promise<{
  processed: number;
  correct: number;
  incorrect: number;
  pending: number;
}> {
  // Find reports without outcomes (regardless of expiration)
  // We'll check TP/SL hit for all of them
  const reportsToCheck = await prisma.report.findMany({
    where: {
      outcome: null,
      // Only check reports older than 1 hour to give market time to move
      generatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) }
    },
    select: { id: true },
    take: 50 // Process in smaller batches to avoid API rate limits
  });

  let correct = 0;
  let incorrect = 0;
  let pending = 0;

  for (const report of reportsToCheck) {
    try {
      const result = await calculateReportOutcome(report.id);
      if (result) {
        if (result.outcome === 'correct') correct++;
        else if (result.outcome === 'incorrect') incorrect++;
        else pending++;
      }
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to calculate outcome for report ${report.id}:`, error);
    }
  }

  return {
    processed: reportsToCheck.length,
    correct,
    incorrect,
    pending
  };
}

// Calculate caution outcome for WAIT/AVOID signals
// Checks if avoiding the trade was the right decision
export async function calculateCautionOutcome(reportId: string): Promise<{
  outcome: 'caution_correct' | 'caution_incorrect' | 'pending';
  priceChange: number;
  reasoning: string;
} | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      symbol: true,
      verdict: true,
      direction: true,
      entryPrice: true,
      reportData: true,
      generatedAt: true,
      outcome: true
    }
  });

  if (!report) return null;

  // Only process WAIT/AVOID signals
  const verdict = report.verdict?.toLowerCase() || '';
  if (!verdict.includes('wait') && !verdict.includes('avoid')) {
    return null;
  }

  // If already calculated, skip
  if (report.outcome) return null;

  const reportData = report.reportData as Record<string, unknown>;
  const tradePlan = reportData?.tradePlan as Record<string, unknown> | undefined;

  // Get the direction that WOULD have been taken
  const potentialDirection = (tradePlan?.direction as string || report.direction || 'long').toLowerCase();

  // Get the price at analysis time
  let analysisPrice = report.entryPrice ? Number(report.entryPrice) : null;
  if (!analysisPrice) {
    analysisPrice = extractEntryPrice(reportData);
  }
  if (!analysisPrice && tradePlan?.averageEntry) {
    analysisPrice = Number(tradePlan.averageEntry);
  }

  if (!analysisPrice) {
    console.error(`No analysis price for caution report ${reportId}`);
    return null;
  }

  // Get current price
  const currentPrice = await fetchCurrentPrice(report.symbol);
  if (!currentPrice) {
    console.error(`Failed to fetch price for ${report.symbol}`);
    return null;
  }

  // Calculate price change since analysis
  const priceChange = ((currentPrice - analysisPrice) / analysisPrice) * 100;

  // Minimum threshold for significant move (5%)
  const SIGNIFICANCE_THRESHOLD = 5;

  // Check if we need more time (at least 24 hours since analysis)
  const hoursSinceAnalysis = (Date.now() - report.generatedAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceAnalysis < 24 && Math.abs(priceChange) < SIGNIFICANCE_THRESHOLD) {
    return {
      outcome: 'pending',
      priceChange,
      reasoning: 'Waiting for more price data'
    };
  }

  // Determine if caution was correct
  let outcome: 'caution_correct' | 'caution_incorrect' | 'pending' = 'pending';
  let reasoning = '';

  if (potentialDirection === 'long') {
    // We avoided a LONG trade
    if (priceChange < -SIGNIFICANCE_THRESHOLD) {
      // Price dropped significantly - we were RIGHT to avoid
      outcome = 'caution_correct';
      reasoning = `Avoided LONG, price dropped ${Math.abs(priceChange).toFixed(1)}%`;
    } else if (priceChange > SIGNIFICANCE_THRESHOLD) {
      // Price rose significantly - we MISSED a good trade
      outcome = 'caution_incorrect';
      reasoning = `Avoided LONG, price rose ${priceChange.toFixed(1)}%`;
    } else if (hoursSinceAnalysis >= 48) {
      // After 48 hours with no significant move, consider it neutral (correct caution)
      outcome = 'caution_correct';
      reasoning = `Price stayed flat (${priceChange.toFixed(1)}%), caution was reasonable`;
    }
  } else {
    // We avoided a SHORT trade
    if (priceChange > SIGNIFICANCE_THRESHOLD) {
      // Price rose significantly - we were RIGHT to avoid shorting
      outcome = 'caution_correct';
      reasoning = `Avoided SHORT, price rose ${priceChange.toFixed(1)}%`;
    } else if (priceChange < -SIGNIFICANCE_THRESHOLD) {
      // Price dropped significantly - we MISSED a good short
      outcome = 'caution_incorrect';
      reasoning = `Avoided SHORT, price dropped ${Math.abs(priceChange).toFixed(1)}%`;
    } else if (hoursSinceAnalysis >= 48) {
      outcome = 'caution_correct';
      reasoning = `Price stayed flat (${priceChange.toFixed(1)}%), caution was reasonable`;
    }
  }

  // Update the report with caution outcome
  if (outcome !== 'pending') {
    await prisma.report.update({
      where: { id: reportId },
      data: {
        outcome,
        outcomePrice: currentPrice,
        outcomePriceChange: priceChange,
        outcomeCalculatedAt: new Date(),
        stepOutcomes: {
          _meta: {
            type: 'caution',
            potentialDirection,
            analysisPrice,
            reasoning
          }
        }
      }
    });
  }

  return {
    outcome,
    priceChange,
    reasoning
  };
}

// Calculate caution outcomes for all WAIT/AVOID reports
export async function calculateCautionOutcomes(): Promise<{
  processed: number;
  cautionCorrect: number;
  cautionIncorrect: number;
  pending: number;
}> {
  // Find WAIT/AVOID reports without outcomes
  const reportsToCheck = await prisma.report.findMany({
    where: {
      outcome: null,
      OR: [
        { verdict: { contains: 'wait', mode: 'insensitive' } },
        { verdict: { contains: 'avoid', mode: 'insensitive' } }
      ],
      // At least 6 hours old
      generatedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) }
    },
    select: { id: true },
    take: 50
  });

  let cautionCorrect = 0;
  let cautionIncorrect = 0;
  let pending = 0;

  for (const report of reportsToCheck) {
    try {
      const result = await calculateCautionOutcome(report.id);
      if (result) {
        if (result.outcome === 'caution_correct') cautionCorrect++;
        else if (result.outcome === 'caution_incorrect') cautionIncorrect++;
        else pending++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to calculate caution outcome for report ${report.id}:`, error);
    }
  }

  return {
    processed: reportsToCheck.length,
    cautionCorrect,
    cautionIncorrect,
    pending
  };
}

// Get platform caution rate for WAIT/AVOID signals
export async function getCautionRate(): Promise<{
  rate: number;
  cautionCorrect: number;
  cautionIncorrect: number;
  pending: number;
  total: number;
}> {
  const reports = await prisma.report.findMany({
    where: {
      OR: [
        { outcome: 'caution_correct' },
        { outcome: 'caution_incorrect' }
      ]
    },
    select: { outcome: true }
  });

  const pendingCount = await prisma.report.count({
    where: {
      outcome: null,
      OR: [
        { verdict: { contains: 'wait', mode: 'insensitive' } },
        { verdict: { contains: 'avoid', mode: 'insensitive' } }
      ]
    }
  });

  const cautionCorrect = reports.filter(r => r.outcome === 'caution_correct').length;
  const cautionIncorrect = reports.filter(r => r.outcome === 'caution_incorrect').length;
  const total = cautionCorrect + cautionIncorrect;

  return {
    rate: total > 0 ? Number(((cautionCorrect / total) * 100).toFixed(1)) : 0,
    cautionCorrect,
    cautionIncorrect,
    pending: pendingCount,
    total
  };
}

// Get platform accuracy based on real outcomes
// IMPORTANT: Uses ANALYSIS table (not Report table) for consistency
// As per CLAUDE.md: "TÜM ANALİZ İSTATİSTİKLERİ → Analysis tablosundan"
export async function getRealAccuracy(): Promise<{
  overall: number;
  correct: number;
  incorrect: number;
  pending: number;
  total: number;
  stepAccuracy: Record<string, number>;
  tpSlStats: {
    tp1Hits: number;
    tp2Hits: number;
    tp3Hits: number;
    slHits: number;
    pending: number;
  };
}> {
  // Get analyses with outcomes from ANALYSIS table (not Report table)
  const analyses = await prisma.analysis.findMany({
    where: {
      outcome: { not: null }
    },
    select: {
      outcome: true,
      step7Result: true, // For step accuracy
    }
  });

  // Also count pending analyses
  const pendingCount = await prisma.analysis.count({
    where: {
      outcome: null,
      step5Result: { not: null }, // Has trade plan
    }
  });

  let correct = 0;
  let incorrect = 0;
  let tp1Hits = 0;
  let tp2Hits = 0;
  let tp3Hits = 0;
  let slHits = 0;

  const stepCorrect: Record<string, number> = {};
  const stepTotal: Record<string, number> = {};

  for (const analysis of analyses) {
    // Count TP/SL hits from outcome field
    if (analysis.outcome === 'tp1_hit') {
      tp1Hits++;
      correct++;
    } else if (analysis.outcome === 'tp2_hit') {
      tp2Hits++;
      correct++;
    } else if (analysis.outcome === 'tp3_hit') {
      tp3Hits++;
      correct++;
    } else if (analysis.outcome === 'sl_hit') {
      slHits++;
      incorrect++;
    }

    // Aggregate step accuracy from step7Result (verdict)
    const step7 = analysis.step7Result as Record<string, unknown> | null;
    if (step7?.componentScores) {
      const scores = step7.componentScores as Record<string, number>;
      for (const [step, score] of Object.entries(scores)) {
        if (!stepTotal[step]) {
          stepTotal[step] = 0;
          stepCorrect[step] = 0;
        }
        stepTotal[step]++;
        // Consider score > 50 as correct
        if (score && score > 50) stepCorrect[step]++;
      }
    }
  }

  const closedTotal = correct + incorrect;
  const overall = closedTotal > 0
    ? Number(((correct / closedTotal) * 100).toFixed(1))
    : 0;

  // Calculate step accuracy percentages
  const stepAccuracy: Record<string, number> = {};
  for (const step of Object.keys(stepTotal)) {
    stepAccuracy[step] = stepTotal[step] > 0
      ? Number(((stepCorrect[step] / stepTotal[step]) * 100).toFixed(1))
      : 0;
  }

  return {
    overall,
    correct,
    incorrect,
    pending: pendingCount,
    total: analyses.length + pendingCount,
    stepAccuracy,
    tpSlStats: {
      tp1Hits,
      tp2Hits,
      tp3Hits,
      slHits,
      pending: pendingCount
    }
  };
}
