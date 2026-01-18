// ===========================================
// Live Price Tracking Service
// Real-time monitoring of active analyses
// No AI cost - just math and Binance API (free)
// ===========================================

import { prisma } from '../../core/database';
import { cache, cacheKeys } from '../../core/cache';
import { calculateReportOutcome } from './outcome.service';

interface LiveTrackingStatus {
  reportId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;

  // TP/SL Levels
  stopLoss: {
    price: number;
    distance: number; // % distance from current price
    status: 'safe' | 'warning' | 'danger'; // danger = within 1%
  };
  takeProfits: Array<{
    level: 'TP1' | 'TP2' | 'TP3';
    price: number;
    distance: number;
    hit: boolean;
  }>;

  // Overall status
  status: 'active' | 'tp_hit' | 'sl_hit' | 'expired';
  hitLevel?: 'TP1' | 'TP2' | 'TP3' | 'SL';
  hitTime?: string;

  // Profit/Loss if position was taken
  unrealizedPnL: number; // % gain/loss

  // Timestamps
  analysisDate: string;
  expiresAt: string;
  lastUpdated: string;
}

interface BulkPriceData {
  [symbol: string]: number;
}

// Fetch multiple prices at once from Binance
async function fetchBulkPrices(symbols: string[]): Promise<BulkPriceData> {
  const prices: BulkPriceData = {};

  if (symbols.length === 0) return prices;

  try {
    // Use Binance ticker endpoint for multiple symbols
    const pairs = symbols.map(s => `"${s.toUpperCase()}USDT"`).join(',');
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
    );

    if (!response.ok) return prices;

    // Safely parse JSON response
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return prices;
    }

    let data: Array<{ symbol: string; price: string }>;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Invalid JSON response from Binance API');
      return prices;
    }

    for (const item of data) {
      const symbol = item.symbol.replace('USDT', '');
      prices[symbol] = parseFloat(item.price);
    }
  } catch (error) {
    console.error('Failed to fetch bulk prices:', error);
  }

  return prices;
}

// Fetch single price
async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const pair = `${symbol.toUpperCase()}USDT`;
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    if (!response.ok) return null;

    // Safely parse JSON response
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

// Calculate distance percentage between two prices
function calculateDistance(currentPrice: number, targetPrice: number): number {
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

// Determine SL status based on distance
function getSLStatus(distance: number, direction: string): 'safe' | 'warning' | 'danger' {
  const absDistance = Math.abs(distance);
  // For long: SL is below, so distance should be negative
  // For short: SL is above, so distance should be positive

  if (direction === 'long') {
    // SL is below current price (negative distance)
    if (distance >= 0) return 'danger'; // Already below SL!
    if (absDistance < 1) return 'danger';
    if (absDistance < 2) return 'warning';
    return 'safe';
  } else {
    // Short: SL is above current price (positive distance)
    if (distance <= 0) return 'danger'; // Already above SL!
    if (absDistance < 1) return 'danger';
    if (absDistance < 2) return 'warning';
    return 'safe';
  }
}

// Get live tracking status for a single report
export async function getReportLiveStatus(reportId: string): Promise<LiveTrackingStatus | null> {
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
      outcome: true,
      stepOutcomes: true,
    },
  });

  if (!report) return null;

  const reportData = report.reportData as Record<string, unknown>;
  const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;

  if (!tradePlan) return null;

  // Extract trade plan data
  const direction = (tradePlan.direction as string || report.direction || 'long').toLowerCase() as 'long' | 'short';
  const entryPrice = Number(tradePlan.averageEntry || report.entryPrice);
  const stopLoss = tradePlan.stopLoss as { price: number } | undefined;
  const takeProfits = tradePlan.takeProfits as Array<{ price: number }> | undefined;

  if (!entryPrice || !stopLoss || !takeProfits) return null;

  // Fetch current price
  const currentPrice = await fetchCurrentPrice(report.symbol);
  if (!currentPrice) return null;

  // Calculate price change
  const priceChange = currentPrice - entryPrice;
  const priceChangePercent = (priceChange / entryPrice) * 100;

  // Calculate SL distance and status
  const slDistance = calculateDistance(currentPrice, stopLoss.price);
  const slStatus = getSLStatus(slDistance, direction);

  // Calculate TP distances and check if hit
  const now = new Date();
  const tpStatuses = takeProfits.slice(0, 3).map((tp, i) => {
    const level = ['TP1', 'TP2', 'TP3'][i] as 'TP1' | 'TP2' | 'TP3';
    const distance = calculateDistance(currentPrice, tp.price);

    // Check if TP was hit
    let hit = false;
    if (direction === 'long') {
      hit = currentPrice >= tp.price;
    } else {
      hit = currentPrice <= tp.price;
    }

    return {
      level,
      price: tp.price,
      distance,
      hit,
    };
  });

  // Determine overall status
  let status: 'active' | 'tp_hit' | 'sl_hit' | 'expired' = 'active';
  let hitLevel: 'TP1' | 'TP2' | 'TP3' | 'SL' | undefined;
  let hitTime: string | undefined;

  // Check from existing outcome
  if (report.outcome === 'correct') {
    status = 'tp_hit';
    const stepOutcomes = report.stepOutcomes as Record<string, unknown> | null;
    const meta = stepOutcomes?._meta as { hitType?: string; hitTime?: string } | undefined;
    if (meta?.hitType) {
      hitLevel = meta.hitType.toUpperCase() as 'TP1' | 'TP2' | 'TP3';
      hitTime = meta.hitTime;
    }
  } else if (report.outcome === 'incorrect') {
    status = 'sl_hit';
    hitLevel = 'SL';
    const stepOutcomes = report.stepOutcomes as Record<string, unknown> | null;
    const meta = stepOutcomes?._meta as { hitTime?: string } | undefined;
    hitTime = meta?.hitTime;
  } else {
    // No expiration-based status - trade stays active until TP or SL is hit
    // Check live if SL or TP was just hit
    const slHit = direction === 'long'
      ? currentPrice <= stopLoss.price
      : currentPrice >= stopLoss.price;

    if (slHit) {
      status = 'sl_hit';
      hitLevel = 'SL';
      hitTime = now.toISOString();
    } else {
      // Check TPs in reverse order (highest first)
      for (let i = tpStatuses.length - 1; i >= 0; i--) {
        if (tpStatuses[i].hit) {
          status = 'tp_hit';
          hitLevel = tpStatuses[i].level;
          hitTime = now.toISOString();
          break;
        }
      }
    }
  }

  // Calculate unrealized PnL
  let unrealizedPnL = priceChangePercent;
  if (direction === 'short') {
    unrealizedPnL = -priceChangePercent; // Inverse for short positions
  }

  return {
    reportId: report.id,
    symbol: report.symbol,
    direction,
    entryPrice,
    currentPrice,
    priceChange,
    priceChangePercent,
    stopLoss: {
      price: stopLoss.price,
      distance: slDistance,
      status: slStatus,
    },
    takeProfits: tpStatuses,
    status,
    hitLevel,
    hitTime,
    unrealizedPnL,
    analysisDate: report.generatedAt.toISOString(),
    expiresAt: report.expiresAt.toISOString(),
    lastUpdated: now.toISOString(),
  };
}

// Get live tracking for all active reports of a user
export async function getUserActiveTrades(userId: string): Promise<LiveTrackingStatus[]> {
  const cacheKey = `live_tracking:${userId}`;

  // Check cache (30 second TTL)
  const cached = await cache.get<LiveTrackingStatus[]>(cacheKey);
  if (cached) return cached;

  // Get active reports - trades stay active until TP or SL is hit
  const reports = await prisma.report.findMany({
    where: {
      userId,
      outcome: null, // Only pending trades (no TP/SL hit yet)
    },
    select: {
      id: true,
      symbol: true,
      direction: true,
      entryPrice: true,
      reportData: true,
      generatedAt: true,
      expiresAt: true,
    },
    orderBy: { generatedAt: 'desc' },
    take: 20, // Limit to latest 20
  });

  if (reports.length === 0) return [];

  // Fetch all prices at once
  const symbols = [...new Set(reports.map(r => r.symbol))] as string[];
  const prices = await fetchBulkPrices(symbols);

  const results: LiveTrackingStatus[] = [];

  for (const report of reports) {
    const currentPrice = prices[report.symbol];
    if (!currentPrice) continue;

    const reportData = report.reportData as Record<string, unknown>;
    const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;
    if (!tradePlan) continue;

    const direction = (tradePlan.direction as string || report.direction || 'long').toLowerCase() as 'long' | 'short';
    const entryPrice = Number(tradePlan.averageEntry || report.entryPrice);
    const stopLoss = tradePlan.stopLoss as { price: number } | undefined;
    const takeProfits = tradePlan.takeProfits as Array<{ price: number }> | undefined;

    if (!entryPrice || !stopLoss || !takeProfits) continue;

    const priceChange = currentPrice - entryPrice;
    const priceChangePercent = (priceChange / entryPrice) * 100;
    const slDistance = calculateDistance(currentPrice, stopLoss.price);
    const slStatus = getSLStatus(slDistance, direction);

    const tpStatuses = takeProfits.slice(0, 3).map((tp, i) => {
      const level = ['TP1', 'TP2', 'TP3'][i] as 'TP1' | 'TP2' | 'TP3';
      const distance = calculateDistance(currentPrice, tp.price);
      const hit = direction === 'long' ? currentPrice >= tp.price : currentPrice <= tp.price;
      return { level, price: tp.price, distance, hit };
    });

    // Check live status
    let status: 'active' | 'tp_hit' | 'sl_hit' | 'expired' = 'active';
    let hitLevel: 'TP1' | 'TP2' | 'TP3' | 'SL' | undefined;

    const slHit = direction === 'long'
      ? currentPrice <= stopLoss.price
      : currentPrice >= stopLoss.price;

    if (slHit) {
      status = 'sl_hit';
      hitLevel = 'SL';
    } else {
      for (let i = tpStatuses.length - 1; i >= 0; i--) {
        if (tpStatuses[i].hit) {
          status = 'tp_hit';
          hitLevel = tpStatuses[i].level;
          break;
        }
      }
    }

    let unrealizedPnL = priceChangePercent;
    if (direction === 'short') unrealizedPnL = -priceChangePercent;

    results.push({
      reportId: report.id,
      symbol: report.symbol,
      direction,
      entryPrice,
      currentPrice,
      priceChange,
      priceChangePercent,
      stopLoss: { price: stopLoss.price, distance: slDistance, status: slStatus },
      takeProfits: tpStatuses,
      status,
      hitLevel,
      unrealizedPnL,
      analysisDate: report.generatedAt.toISOString(),
      expiresAt: report.expiresAt.toISOString(),
      lastUpdated: new Date().toISOString(),
    });
  }

  // Cache for 30 seconds
  await cache.set(cacheKey, results, 30);

  return results;
}

// Background job to update outcomes when TP/SL is hit
// Now uses calculateReportOutcome for full step-level tracking
export async function checkAndUpdateOutcomes(): Promise<{
  checked: number;
  tpHits: number;
  slHits: number;
}> {
  // Get all reports without outcomes (regardless of expiration date)
  // Reports stay active until TP or SL is hit - no time-based expiration
  const reports = await prisma.report.findMany({
    where: {
      outcome: null,
    },
    select: {
      id: true,
      symbol: true,
      direction: true,
      entryPrice: true,
      reportData: true,
    },
    take: 100,
  });

  if (reports.length === 0) {
    return { checked: 0, tpHits: 0, slHits: 0 };
  }

  // Fetch all prices at once to check if any TP/SL might have been hit
  const symbols = [...new Set(reports.map(r => r.symbol))] as string[];
  const prices = await fetchBulkPrices(symbols);

  let tpHits = 0;
  let slHits = 0;

  for (const report of reports) {
    const currentPrice = prices[report.symbol];
    if (!currentPrice) continue;

    const reportData = report.reportData as Record<string, unknown>;
    const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;
    if (!tradePlan) continue;

    const direction = (tradePlan.direction as string || report.direction || 'long').toLowerCase();
    const entryPrice = Number(tradePlan.averageEntry || report.entryPrice);
    const stopLoss = tradePlan.stopLoss as { price: number } | undefined;
    const takeProfits = tradePlan.takeProfits as Array<{ price: number }> | undefined;

    if (!entryPrice || !stopLoss || !takeProfits) continue;

    // Quick check if SL or TP might have been hit
    const slHit = direction === 'long'
      ? currentPrice <= stopLoss.price
      : currentPrice >= stopLoss.price;

    let tpHit = false;
    for (const tp of takeProfits) {
      if (direction === 'long' ? currentPrice >= tp.price : currentPrice <= tp.price) {
        tpHit = true;
        break;
      }
    }

    // If SL or TP was hit, use full outcome calculation for step-level tracking
    if (slHit || tpHit) {
      try {
        const result = await calculateReportOutcome(report.id);
        if (result) {
          if (result.outcome === 'correct') tpHits++;
          else if (result.outcome === 'incorrect') slHits++;
        }
      } catch (error) {
        console.error(`Failed to calculate outcome for report ${report.id}:`, error);
      }
    }
  }

  return {
    checked: reports.length,
    tpHits,
    slHits,
  };
}

/**
 * Check and update outcomes for Analysis table
 * This is separate from Report table tracking
 * Statistics API uses Analysis table for accuracy calculation
 */
export async function checkAndUpdateAnalysisOutcomes(): Promise<{
  checked: number;
  tpHits: number;
  slHits: number;
}> {
  // Get all analyses without outcomes that have trade plans
  // Include recently expired (within 24h) to catch late SL hits
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const analyses = await prisma.analysis.findMany({
    where: {
      outcome: null,
      step5Result: { not: null },
      OR: [
        { expiresAt: { gt: new Date() } },
        { expiresAt: { gte: twentyFourHoursAgo, lt: new Date() } }
      ]
    },
    select: {
      id: true,
      symbol: true,
      step5Result: true,
    },
    take: 200,
  });

  if (analyses.length === 0) {
    return { checked: 0, tpHits: 0, slHits: 0 };
  }

  // Fetch all prices at once
  const symbols = [...new Set(analyses.map(a => a.symbol))] as string[];
  const prices = await fetchBulkPrices(symbols);

  let tpHits = 0;
  let slHits = 0;
  const updates: Array<{ id: string; outcome: string; outcomePrice: number }> = [];

  for (const analysis of analyses) {
    const currentPrice = prices[analysis.symbol];
    if (!currentPrice) continue;

    const tradePlan = analysis.step5Result as Record<string, unknown> | null;
    if (!tradePlan) continue;

    const direction = ((tradePlan.direction as string) || 'long').toLowerCase();
    const entryPrice = Number(tradePlan.averageEntry || tradePlan.entryPrice) || 0;
    const stopLossData = tradePlan.stopLoss as { price?: number } | number | undefined;
    const stopLoss = typeof stopLossData === 'object' ? Number(stopLossData?.price) : Number(stopLossData) || 0;

    const takeProfits = tradePlan.takeProfits as Array<{ price: number }> | undefined;
    const tp1 = Number(takeProfits?.[0]?.price || tradePlan.takeProfit1) || 0;
    const tp2 = Number(takeProfits?.[1]?.price || tradePlan.takeProfit2) || 0;
    const tp3 = Number(takeProfits?.[2]?.price || tradePlan.takeProfit3) || 0;

    if (!entryPrice) continue;

    const isLong = direction === 'long';
    let outcome: string | null = null;

    // Check TPs (highest first)
    if (tp3 && (isLong ? currentPrice >= tp3 : currentPrice <= tp3)) {
      outcome = 'tp3_hit';
    } else if (tp2 && (isLong ? currentPrice >= tp2 : currentPrice <= tp2)) {
      outcome = 'tp2_hit';
    } else if (tp1 && (isLong ? currentPrice >= tp1 : currentPrice <= tp1)) {
      outcome = 'tp1_hit';
    } else if (stopLoss && (isLong ? currentPrice <= stopLoss : currentPrice >= stopLoss)) {
      outcome = 'sl_hit';
    }

    if (outcome) {
      updates.push({ id: analysis.id, outcome, outcomePrice: currentPrice });
      if (outcome === 'sl_hit') {
        slHits++;
      } else {
        tpHits++;
      }
    }
  }

  // Apply updates
  if (updates.length > 0) {
    await Promise.all(
      updates.map(update =>
        prisma.analysis.update({
          where: { id: update.id },
          data: {
            outcome: update.outcome,
            outcomePrice: update.outcomePrice,
            outcomeAt: new Date(),
          }
        })
      )
    );
    console.log(`[AnalysisOutcomeChecker] Updated ${updates.length} analyses (TP: ${tpHits}, SL: ${slHits})`);
  }

  return {
    checked: analyses.length,
    tpHits,
    slHits,
  };
}
