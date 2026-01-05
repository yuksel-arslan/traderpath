// ===========================================
// Outcome Calculation Service
// Compares analysis predictions with actual market outcomes
// ===========================================

import { prisma } from '../../core/database';
import { config } from '../../core/config';

interface OutcomeResult {
  outcome: 'correct' | 'incorrect' | 'neutral';
  priceChange: number;
  outcomePrice: number;
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

// Fetch current price from Binance
async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const pair = `${symbol.toUpperCase()}USDT`;
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    if (!response.ok) return null;
    const data = await response.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

// Extract entry price from report data
function extractEntryPrice(reportData: Record<string, unknown>): number | null {
  // Try various locations where price might be stored
  const assetScan = reportData.assetScan as Record<string, unknown> | undefined;
  const timing = reportData.timing as Record<string, unknown> | undefined;
  const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;

  if (assetScan?.currentPrice) return Number(assetScan.currentPrice);
  if (timing?.currentPrice) return Number(timing.currentPrice);
  if (tradePlan?.averageEntry) return Number(tradePlan.averageEntry);

  return null;
}

// Calculate step-by-step outcome
function calculateStepOutcomes(
  reportData: Record<string, unknown>,
  entryPrice: number,
  currentPrice: number,
  priceChange: number
): Record<string, StepOutcome> {
  const outcomes: Record<string, StepOutcome> = {};
  const priceWentUp = priceChange > 0;

  // Market Pulse outcome
  const marketPulse = reportData.marketPulse as Record<string, unknown> | undefined;
  if (marketPulse) {
    const trend = marketPulse.trend as Record<string, unknown> | undefined;
    const predictedDirection = trend?.direction as string;
    outcomes.marketPulse = {
      predicted: predictedDirection,
      actual: priceWentUp ? 'bullish' : 'bearish',
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
    // RSI prediction: >70 overbought (expect down), <30 oversold (expect up)
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
    // High risk should correlate with larger price swings
    const volatileMove = Math.abs(priceChange) > 5;
    outcomes.safetyCheck = {
      predicted: riskLevel,
      actual: volatileMove ? 'high volatility' : 'stable',
      correct: (riskLevel === 'high' || riskLevel === 'extreme') === volatileMove ||
               riskLevel === 'low' || riskLevel === 'medium'
    };
  }

  // Timing outcome
  const timing = reportData.timing as Record<string, unknown> | undefined;
  if (timing) {
    const tradeNow = timing.tradeNow as boolean;
    const optimalEntry = timing.optimalEntry as number;
    // If trade now was recommended, check if entry was good
    // Good entry = price moved favorably within threshold
    const goodEntry = optimalEntry
      ? Math.abs((entryPrice - optimalEntry) / optimalEntry * 100) < 2
      : true;
    outcomes.timing = {
      predicted: tradeNow ? 'trade now' : 'wait',
      actual: goodEntry ? 'good timing' : 'poor timing',
      correct: (tradeNow && goodEntry) || (!tradeNow && !goodEntry)
    };
  }

  // Trade Plan outcome
  const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;
  if (tradePlan) {
    const direction = tradePlan.direction as string;
    const stopLoss = tradePlan.stopLoss as Record<string, unknown> | undefined;
    const takeProfits = tradePlan.takeProfits as Record<string, unknown>[] | undefined;

    const stopPrice = stopLoss?.price as number | undefined;
    const tp1Price = takeProfits?.[0]?.price as number | undefined;

    let tradeResult = 'neutral';
    if (direction === 'long') {
      if (stopPrice && currentPrice <= stopPrice) tradeResult = 'stopped out';
      else if (tp1Price && currentPrice >= tp1Price) tradeResult = 'take profit hit';
      else if (priceWentUp) tradeResult = 'in profit';
      else tradeResult = 'in loss';
    } else if (direction === 'short') {
      if (stopPrice && currentPrice >= stopPrice) tradeResult = 'stopped out';
      else if (tp1Price && currentPrice <= tp1Price) tradeResult = 'take profit hit';
      else if (!priceWentUp) tradeResult = 'in profit';
      else tradeResult = 'in loss';
    }

    outcomes.tradePlan = {
      predicted: direction,
      actual: tradeResult,
      correct: tradeResult === 'take profit hit' || tradeResult === 'in profit'
    };
  }

  // Trap Check outcome
  const trapCheck = reportData.trapCheck as Record<string, unknown> | undefined;
  if (trapCheck) {
    const traps = trapCheck.traps as Record<string, unknown> | undefined;
    const bullTrap = traps?.bullTrap as boolean;
    const bearTrap = traps?.bearTrap as boolean;

    // Check if trap warning was correct
    // Bull trap: predicted up but went down
    // Bear trap: predicted down but went up
    let trapOccurred = 'none';
    if (bullTrap && !priceWentUp) trapOccurred = 'bull trap confirmed';
    if (bearTrap && priceWentUp) trapOccurred = 'bear trap confirmed';

    outcomes.trapCheck = {
      predicted: bullTrap ? 'bull trap warning' : bearTrap ? 'bear trap warning' : 'no trap',
      actual: trapOccurred,
      correct: (bullTrap && !priceWentUp) ||
               (bearTrap && priceWentUp) ||
               (!bullTrap && !bearTrap)
    };
  }

  return outcomes;
}

// Calculate outcome for a single report
export async function calculateReportOutcome(reportId: string): Promise<OutcomeResult | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      symbol: true,
      direction: true,
      entryPrice: true,
      reportData: true,
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

  // Get entry price
  let entryPrice = report.entryPrice ? Number(report.entryPrice) : null;
  if (!entryPrice) {
    entryPrice = extractEntryPrice(reportData);
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

  // Calculate price change
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

  // Determine overall outcome based on direction
  let outcome: 'correct' | 'incorrect' | 'neutral' = 'neutral';
  const direction = report.direction?.toLowerCase();

  if (direction === 'long') {
    if (priceChange >= 2) outcome = 'correct';
    else if (priceChange <= -2) outcome = 'incorrect';
    else outcome = 'neutral';
  } else if (direction === 'short') {
    if (priceChange <= -2) outcome = 'correct';
    else if (priceChange >= 2) outcome = 'incorrect';
    else outcome = 'neutral';
  } else {
    // No clear direction - check if high-confidence predictions panned out
    const score = (reportData.verdict as Record<string, unknown>)?.overallScore as number;
    if (score) {
      if (score >= 7 && Math.abs(priceChange) < 5) outcome = 'correct';
      else if (score < 5 && Math.abs(priceChange) > 5) outcome = 'correct';
      else outcome = 'neutral';
    }
  }

  // Calculate step outcomes
  const stepOutcomes = calculateStepOutcomes(reportData, entryPrice, currentPrice, priceChange);

  // Update the report with outcome data
  await prisma.report.update({
    where: { id: reportId },
    data: {
      outcome,
      outcomePrice: currentPrice,
      outcomePriceChange: priceChange,
      outcomeCalculatedAt: new Date(),
      stepOutcomes
    }
  });

  return {
    outcome,
    priceChange,
    outcomePrice: currentPrice,
    stepOutcomes
  };
}

// Calculate outcomes for all expired reports that don't have outcomes yet
export async function calculateExpiredOutcomes(): Promise<{
  processed: number;
  correct: number;
  incorrect: number;
  neutral: number;
}> {
  const now = new Date();

  // Find expired reports without outcomes
  const expiredReports = await prisma.report.findMany({
    where: {
      expiresAt: { lt: now },
      outcome: null
    },
    select: { id: true },
    take: 100 // Process in batches
  });

  let correct = 0;
  let incorrect = 0;
  let neutral = 0;

  for (const report of expiredReports) {
    const result = await calculateReportOutcome(report.id);
    if (result) {
      if (result.outcome === 'correct') correct++;
      else if (result.outcome === 'incorrect') incorrect++;
      else neutral++;
    }
  }

  return {
    processed: expiredReports.length,
    correct,
    incorrect,
    neutral
  };
}

// Get platform accuracy based on real outcomes
export async function getRealAccuracy(): Promise<{
  overall: number;
  correct: number;
  incorrect: number;
  neutral: number;
  total: number;
  stepAccuracy: Record<string, number>;
}> {
  const reports = await prisma.report.findMany({
    where: {
      outcome: { not: null }
    },
    select: {
      outcome: true,
      stepOutcomes: true
    }
  });

  let correct = 0;
  let incorrect = 0;
  let neutral = 0;
  const stepCorrect: Record<string, number> = {};
  const stepTotal: Record<string, number> = {};

  for (const report of reports) {
    if (report.outcome === 'correct') correct++;
    else if (report.outcome === 'incorrect') incorrect++;
    else neutral++;

    // Aggregate step accuracy
    const stepOutcomes = report.stepOutcomes as Record<string, StepOutcome> | null;
    if (stepOutcomes) {
      for (const [step, outcome] of Object.entries(stepOutcomes)) {
        if (!stepTotal[step]) {
          stepTotal[step] = 0;
          stepCorrect[step] = 0;
        }
        stepTotal[step]++;
        if (outcome.correct) stepCorrect[step]++;
      }
    }
  }

  const total = correct + incorrect + neutral;
  const overall = total > 0
    ? Number(((correct / total) * 100).toFixed(1))
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
    neutral,
    total,
    stepAccuracy
  };
}
