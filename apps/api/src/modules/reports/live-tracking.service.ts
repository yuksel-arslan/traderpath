// ===========================================
// Live Price Tracking Service
// Real-time monitoring of active analyses
// No AI cost - just math and Binance API (free)
// ===========================================

import { prisma } from '../../core/database';
import { cache, cacheKeys } from '../../core/cache';
import { calculateReportOutcome } from './outcome.service';
import { logger } from '../../core/logger';
import { detectAssetClass } from '../analysis/providers/symbol-resolver';

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

// Fetch multiple prices at once (crypto from Binance, others from Yahoo)
async function fetchBulkPrices(symbols: string[]): Promise<BulkPriceData> {
  const prices: BulkPriceData = {};

  if (symbols.length === 0) return prices;

  // Separate crypto vs non-crypto
  const cryptoSymbols = symbols.filter(s => detectAssetClass(s) === 'crypto');
  const nonCryptoSymbols = symbols.filter(s => detectAssetClass(s) !== 'crypto');

  // Fetch crypto prices from Binance
  if (cryptoSymbols.length > 0) {
    try {
      const pairs = cryptoSymbols.map(s => `"${s.toUpperCase()}USDT"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
      );

      if (response.ok) {
        const responseText = await response.text();
        if (responseText && responseText.trim() !== '') {
          try {
            const data: Array<{ symbol: string; price: string }> = JSON.parse(responseText);
            for (const item of data) {
              const symbol = item.symbol.replace('USDT', '');
              prices[symbol] = parseFloat(item.price);
            }
          } catch {
            logger.error('Invalid JSON response from Binance API');
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch crypto bulk prices');
    }
  }

  // Fetch non-crypto prices from Yahoo via multi-asset provider
  for (const sym of nonCryptoSymbols) {
    try {
      const { fetchTicker } = await import('../analysis/providers/multi-asset-data-provider');
      const ticker = await fetchTicker(sym);
      if (ticker?.price) {
        prices[sym.toUpperCase().replace('.IS', '')] = ticker.price;
      }
    } catch (error) {
      logger.error({ error, symbol: sym }, 'Failed to fetch non-crypto price');
    }
  }

  return prices;
}

// Fetch single price (multi-asset: crypto from Binance, others from Yahoo)
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
        logger.error({ reportId: report.id, error }, 'Failed to calculate outcome for report');
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
    logger.info({ updates: updates.length, tpHits, slHits }, '[AnalysisOutcomeChecker] Updated analyses');
  }

  return {
    checked: analyses.length,
    tpHits,
    slHits,
  };
}

// ===========================================
// Binance Klines API - Historical OHLC Data
// ===========================================

interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  closeTime: number;
}

/**
 * Fetch historical klines (OHLC) data from Binance
 * @param symbol - Crypto symbol (e.g., BTC)
 * @param startTime - Start timestamp in ms
 * @param endTime - End timestamp in ms (default: now)
 * @param interval - Kline interval (default: 1h)
 */
async function fetchKlines(
  symbol: string,
  startTime: number,
  endTime?: number,
  interval: string = '1h'
): Promise<Kline[]> {
  const allKlines: Kline[] = [];
  const maxLimit = 1000; // Binance API limit
  let currentStartTime = startTime;
  const finalEndTime = endTime || Date.now();

  try {
    // Non-crypto: use multi-asset provider for klines
    const assetClass = detectAssetClass(symbol);
    if (assetClass !== 'crypto') {
      try {
        const { fetchCandles } = await import('../analysis/providers/multi-asset-data-provider');
        const candles = await fetchCandles(symbol, interval, 500);
        return candles
          .filter(c => c.timestamp >= startTime && c.timestamp <= finalEndTime)
          .map(c => ({
            openTime: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
            closeTime: c.timestamp + 3600000,
          }));
      } catch (err) {
        logger.error({ error: err, symbol }, '[Klines] Non-crypto klines fetch failed');
        return allKlines;
      }
    }

    while (currentStartTime < finalEndTime) {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=${interval}&startTime=${currentStartTime}&endTime=${finalEndTime}&limit=${maxLimit}`;

      const response = await fetch(url);
      if (!response.ok) {
        logger.error({ symbol, status: response.status }, '[Klines] Failed to fetch');
        break;
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') break;

      let data: Array<Array<string | number>>;
      try {
        data = JSON.parse(responseText);
      } catch {
        logger.error({ symbol }, '[Klines] Invalid JSON response');
        break;
      }

      if (data.length === 0) break;

      for (const kline of data) {
        allKlines.push({
          openTime: Number(kline[0]),
          open: parseFloat(String(kline[1])),
          high: parseFloat(String(kline[2])),
          low: parseFloat(String(kline[3])),
          close: parseFloat(String(kline[4])),
          closeTime: Number(kline[6]),
        });
      }

      // Move to next batch
      const lastKline = data[data.length - 1];
      currentStartTime = Number(lastKline[6]) + 1; // closeTime + 1ms

      // If we got less than max, we've reached the end
      if (data.length < maxLimit) break;

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    logger.error({ symbol, error }, '[Klines] Error fetching');
  }

  return allKlines;
}

/**
 * Check historical klines to determine if TP or SL was hit first
 * @returns outcome: 'tp1_hit', 'tp2_hit', 'tp3_hit', 'sl_hit', or null if still active
 */
function checkKlinesForOutcome(
  klines: Kline[],
  direction: 'long' | 'short',
  stopLoss: number,
  tp1: number,
  tp2: number,
  tp3: number
): { outcome: string | null; outcomePrice: number; outcomeTime: number } | null {
  const isLong = direction === 'long';

  for (const kline of klines) {
    // For LONG:
    //   - TP hit when High >= TP price
    //   - SL hit when Low <= SL price
    // For SHORT:
    //   - TP hit when Low <= TP price
    //   - SL hit when High >= SL price

    // Check SL first (SL hit = trade closed, even if TP was also hit in same candle)
    const slHit = isLong
      ? (stopLoss > 0 && kline.low <= stopLoss)
      : (stopLoss > 0 && kline.high >= stopLoss);

    if (slHit) {
      return {
        outcome: 'sl_hit',
        outcomePrice: stopLoss,
        outcomeTime: kline.openTime,
      };
    }

    // Check TPs in order (TP1 first, then TP2, then TP3)
    if (tp1 > 0) {
      const tp1Hit = isLong ? kline.high >= tp1 : kline.low <= tp1;
      if (tp1Hit) {
        // Check if higher TPs were also hit in this candle
        if (tp3 > 0) {
          const tp3Hit = isLong ? kline.high >= tp3 : kline.low <= tp3;
          if (tp3Hit) {
            return { outcome: 'tp3_hit', outcomePrice: tp3, outcomeTime: kline.openTime };
          }
        }
        if (tp2 > 0) {
          const tp2Hit = isLong ? kline.high >= tp2 : kline.low <= tp2;
          if (tp2Hit) {
            return { outcome: 'tp2_hit', outcomePrice: tp2, outcomeTime: kline.openTime };
          }
        }
        return { outcome: 'tp1_hit', outcomePrice: tp1, outcomeTime: kline.openTime };
      }
    }
  }

  return null; // Still active - no TP or SL hit
}

/**
 * HISTORICAL OUTCOME CHECKER using Binance Klines API
 * Scans all analyses from createdAt to now using historical OHLC data
 * to accurately determine if TP or SL was hit
 */
export async function checkAllHistoricalOutcomes(): Promise<{
  checked: number;
  tpHits: number;
  slHits: number;
  skipped: number;
  stillActive: number;
}> {
  logger.info('[HistoricalOutcomeChecker] Starting full historical check with Klines API...');

  // Get ALL analyses without outcomes that have trade plans
  const analyses = await prisma.analysis.findMany({
    where: {
      outcome: null,
      step5Result: { not: null },
    },
    select: {
      id: true,
      symbol: true,
      interval: true, // Trader type's timeframe (15m, 1h, 4h, 1d, etc.)
      step5Result: true,
      createdAt: true,
    },
  });

  if (analyses.length === 0) {
    logger.debug('[HistoricalOutcomeChecker] No analyses to check');
    return { checked: 0, tpHits: 0, slHits: 0, skipped: 0, stillActive: 0 };
  }

  logger.info({ count: analyses.length }, '[HistoricalOutcomeChecker] Found analyses to check');

  let tpHits = 0;
  let slHits = 0;
  let skipped = 0;
  let stillActive = 0;
  const updates: Array<{ id: string; outcome: string; outcomePrice: number; outcomeAt: Date }> = [];

  // Process one at a time to avoid rate limiting
  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    logger.debug({ progress: `${i + 1}/${analyses.length}`, symbol: analysis.symbol }, '[HistoricalOutcomeChecker] Processing');

    const tradePlan = analysis.step5Result as Record<string, unknown> | null;
    if (!tradePlan) {
      skipped++;
      continue;
    }

    const direction = ((tradePlan.direction as string) || 'long').toLowerCase() as 'long' | 'short';
    const stopLossData = tradePlan.stopLoss as { price?: number } | number | undefined;
    const stopLoss = typeof stopLossData === 'object' ? Number(stopLossData?.price) : Number(stopLossData) || 0;

    const takeProfits = tradePlan.takeProfits as Array<{ price: number }> | undefined;
    const tp1 = Number(takeProfits?.[0]?.price || tradePlan.takeProfit1) || 0;
    const tp2 = Number(takeProfits?.[1]?.price || tradePlan.takeProfit2) || 0;
    const tp3 = Number(takeProfits?.[2]?.price || tradePlan.takeProfit3) || 0;

    // Need at least SL or one TP to check outcome
    if (!stopLoss && !tp1) {
      skipped++;
      continue;
    }

    // Use the analysis's timeframe (trader type determines this)
    // Scalp: 15m, Swing: 4h, Position: 1d, etc.
    const timeframe = analysis.interval || '4h';

    // Fetch historical klines from analysis creation date to now using the correct timeframe
    const startTime = analysis.createdAt.getTime();
    const klines = await fetchKlines(analysis.symbol, startTime, undefined, timeframe);

    logger.debug({ symbol: analysis.symbol, timeframe, klinesCount: klines.length }, '[HistoricalOutcomeChecker] Fetched klines');

    if (klines.length === 0) {
      skipped++;
      continue;
    }

    // Check for outcome in historical data
    const result = checkKlinesForOutcome(klines, direction, stopLoss, tp1, tp2, tp3);

    if (result) {
      updates.push({
        id: analysis.id,
        outcome: result.outcome!,
        outcomePrice: result.outcomePrice,
        outcomeAt: new Date(result.outcomeTime),
      });

      if (result.outcome === 'sl_hit') {
        slHits++;
      } else {
        tpHits++;
      }
    } else {
      stillActive++;
    }

    // Small delay between requests to avoid rate limiting
    if (i < analyses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Apply updates
  if (updates.length > 0) {
    logger.info({ count: updates.length }, '[HistoricalOutcomeChecker] Applying updates');
    await Promise.all(
      updates.map(update =>
        prisma.analysis.update({
          where: { id: update.id },
          data: {
            outcome: update.outcome,
            outcomePrice: update.outcomePrice,
            outcomeAt: update.outcomeAt,
          }
        })
      )
    );
  }

  logger.info({ checked: analyses.length, tpHits, slHits, stillActive, skipped }, '[HistoricalOutcomeChecker] Completed');

  return {
    checked: analyses.length,
    tpHits,
    slHits,
    skipped,
    stillActive,
  };
}
