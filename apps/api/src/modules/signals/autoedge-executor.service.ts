/**
 * AutoEdge Trade Executor Service
 *
 * When AutoEdge generates a signal:
 * 1. Opens a MARKET order on Binance Futures Testnet
 * 2. Places SL (STOP_MARKET) and TP (TAKE_PROFIT_MARKET) orders
 * 3. Records the trade in the database
 *
 * Position Monitor (separate job) tracks outcomes and closes trades.
 */

import { prisma } from '../../core/database';
import {
  isTestnetConfigured,
  placeMarketOrder,
  placeStopMarketOrder,
  placeTakeProfitOrder,
  cancelAllOrders,
  getPosition,
  getUsdtBalance,
  setLeverage,
  setMarginType,
  getSymbolInfo,
  roundToStepSize,
  getOpenOrders,
  BinanceTestnetError,
  type FuturesOrder,
  type FuturesPosition,
} from './binance-testnet.client';
import type { SignalData } from './types';

// ─── Configuration ────────────────────────────────────────────
const AUTOEDGE_TRADE_CONFIG = {
  leverage: 5,                      // 5x leverage (conservative for testnet)
  marginType: 'ISOLATED' as const,  // Isolated margin per trade
  riskPerTrade: 0.02,               // 2% of available balance per trade
  maxOpenTrades: 5,                 // Max concurrent positions
  maxPositionUsdt: 500,             // Max $500 per position (testnet)
  minPositionUsdt: 10,              // Min $10 per position
};

// ─── Types ────────────────────────────────────────────────────
export interface AutoEdgeTrade {
  id: string;
  signalId: string;
  symbol: string;
  direction: 'long' | 'short';
  status: 'open' | 'tp1_hit' | 'tp2_hit' | 'sl_hit' | 'closed_manual' | 'error';

  // Entry
  entryOrderId: number;
  entryPrice: number;
  quantity: number;

  // SL/TP Order IDs
  slOrderId?: number;
  tp1OrderId?: number;
  tp2OrderId?: number;

  // Planned Levels
  plannedEntry: number;
  plannedSl: number;
  plannedTp1: number;
  plannedTp2: number;

  // Outcome
  exitPrice?: number;
  pnlUsdt?: number;
  pnlPercent?: number;

  createdAt: Date;
  closedAt?: Date;
}

export interface TradeExecutionResult {
  success: boolean;
  trade?: AutoEdgeTrade;
  error?: string;
  reason?: string;
}

// ─── Main Executor ────────────────────────────────────────────

/**
 * Execute a trade based on a signal from AutoEdge
 */
export async function executeAutoEdgeTrade(
  signalId: string,
  signal: SignalData,
): Promise<TradeExecutionResult> {
  // 1. Check testnet credentials
  if (!isTestnetConfigured()) {
    console.log('[AutoEdge-Executor] Testnet not configured, skipping trade execution');
    return { success: false, reason: 'testnet_not_configured' };
  }

  const binanceSymbol = `${signal.symbol}USDT`;

  try {
    // 2. Check max open trades
    const openTradeCount = await getOpenTradeCount();
    if (openTradeCount >= AUTOEDGE_TRADE_CONFIG.maxOpenTrades) {
      console.log(`[AutoEdge-Executor] Max open trades (${AUTOEDGE_TRADE_CONFIG.maxOpenTrades}) reached`);
      return { success: false, reason: 'max_trades_reached' };
    }

    // 3. Check if already in position for this symbol
    const existingTrade = await getOpenTradeForSymbol(signal.symbol);
    if (existingTrade) {
      console.log(`[AutoEdge-Executor] Already in position for ${signal.symbol}`);
      return { success: false, reason: 'already_in_position' };
    }

    // 4. Get balance and calculate position size
    const balance = await getUsdtBalance();
    const positionSizeUsdt = calculatePositionSize(
      balance.available,
      signal.entryPrice,
      signal.stopLoss,
    );

    if (positionSizeUsdt < AUTOEDGE_TRADE_CONFIG.minPositionUsdt) {
      console.log(`[AutoEdge-Executor] Position too small: $${positionSizeUsdt.toFixed(2)}`);
      return { success: false, reason: 'position_too_small' };
    }

    // 5. Get symbol info for quantity precision
    const symbolInfo = await getSymbolInfo(binanceSymbol);
    if (!symbolInfo) {
      console.log(`[AutoEdge-Executor] Symbol info not found for ${binanceSymbol}`);
      return { success: false, reason: 'symbol_not_found' };
    }

    // 6. Calculate quantity
    const rawQuantity = positionSizeUsdt / signal.entryPrice;
    const quantity = roundToStepSize(rawQuantity, symbolInfo.stepSize);

    if (quantity <= 0 || quantity < symbolInfo.minQty) {
      console.log(`[AutoEdge-Executor] Quantity too small: ${quantity} (min: ${symbolInfo.minQty})`);
      return { success: false, reason: 'quantity_too_small' };
    }

    console.log(`[AutoEdge-Executor] Executing ${signal.direction.toUpperCase()} ${quantity} ${binanceSymbol} @ ~$${signal.entryPrice}`);

    // 7. Set leverage and margin type
    await setLeverage(binanceSymbol, AUTOEDGE_TRADE_CONFIG.leverage);
    await setMarginType(binanceSymbol, AUTOEDGE_TRADE_CONFIG.marginType);

    // 8. Place MARKET entry order
    const entrySide = signal.direction === 'long' ? 'BUY' : 'SELL';
    const entryOrder = await placeMarketOrder(binanceSymbol, entrySide, quantity);

    if (entryOrder.status !== 'FILLED') {
      console.error(`[AutoEdge-Executor] Entry order not filled: ${entryOrder.status}`);
      return { success: false, reason: 'entry_not_filled', error: `Order status: ${entryOrder.status}` };
    }

    const actualEntryPrice = parseFloat(entryOrder.avgPrice) || signal.entryPrice;
    console.log(`[AutoEdge-Executor] Entry filled @ $${actualEntryPrice}`);

    // 9. Place SL and TP orders
    const closeSide = signal.direction === 'long' ? 'SELL' : 'BUY';
    let slOrder: FuturesOrder | undefined;
    let tp1Order: FuturesOrder | undefined;
    let tp2Order: FuturesOrder | undefined;

    try {
      // Stop Loss
      slOrder = await placeStopMarketOrder(binanceSymbol, closeSide, signal.stopLoss, true);
      console.log(`[AutoEdge-Executor] SL placed @ $${signal.stopLoss} (orderId: ${slOrder.orderId})`);
    } catch (err) {
      console.error('[AutoEdge-Executor] SL placement failed:', err);
    }

    try {
      // Take Profit 1 (60% of position)
      const tp1Qty = roundToStepSize(quantity * 0.6, symbolInfo.stepSize);
      if (tp1Qty > 0) {
        tp1Order = await placeTakeProfitOrder(binanceSymbol, closeSide, signal.takeProfit1, false, tp1Qty);
        console.log(`[AutoEdge-Executor] TP1 placed @ $${signal.takeProfit1} qty=${tp1Qty} (orderId: ${tp1Order.orderId})`);
      }
    } catch (err) {
      console.error('[AutoEdge-Executor] TP1 placement failed:', err);
    }

    try {
      // Take Profit 2 (remaining 40% — close position)
      tp2Order = await placeTakeProfitOrder(binanceSymbol, closeSide, signal.takeProfit2, true);
      console.log(`[AutoEdge-Executor] TP2 placed @ $${signal.takeProfit2} (orderId: ${tp2Order.orderId})`);
    } catch (err) {
      console.error('[AutoEdge-Executor] TP2 placement failed:', err);
    }

    // 10. Save trade to database
    const trade = await saveAutoEdgeTrade({
      signalId,
      symbol: signal.symbol,
      binanceSymbol,
      direction: signal.direction,
      entryOrderId: entryOrder.orderId,
      entryPrice: actualEntryPrice,
      quantity,
      slOrderId: slOrder?.orderId,
      tp1OrderId: tp1Order?.orderId,
      tp2OrderId: tp2Order?.orderId,
      plannedEntry: signal.entryPrice,
      plannedSl: signal.stopLoss,
      plannedTp1: signal.takeProfit1,
      plannedTp2: signal.takeProfit2,
      leverage: AUTOEDGE_TRADE_CONFIG.leverage,
      positionSizeUsdt,
    });

    console.log(`[AutoEdge-Executor] Trade saved: ${trade.id} — ${signal.symbol} ${signal.direction.toUpperCase()} @ $${actualEntryPrice}`);

    return {
      success: true,
      trade: {
        id: trade.id,
        signalId,
        symbol: signal.symbol,
        direction: signal.direction,
        status: 'open',
        entryOrderId: entryOrder.orderId,
        entryPrice: actualEntryPrice,
        quantity,
        slOrderId: slOrder?.orderId,
        tp1OrderId: tp1Order?.orderId,
        tp2OrderId: tp2Order?.orderId,
        plannedEntry: signal.entryPrice,
        plannedSl: signal.stopLoss,
        plannedTp1: signal.takeProfit1,
        plannedTp2: signal.takeProfit2,
        createdAt: new Date(),
      },
    };

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[AutoEdge-Executor] Trade execution failed for ${signal.symbol}:`, errMsg);

    // Try to clean up any open orders if entry was placed
    try {
      await cancelAllOrders(binanceSymbol);
    } catch { /* best-effort cleanup */ }

    return { success: false, error: errMsg };
  }
}

// ─── Position Monitor ─────────────────────────────────────────

/**
 * Check all open AutoEdge trades and update their status
 */
export async function monitorOpenTrades(): Promise<{
  checked: number;
  closed: number;
  errors: string[];
}> {
  if (!isTestnetConfigured()) return { checked: 0, closed: 0, errors: [] };

  const result = { checked: 0, closed: 0, errors: [] as string[] };

  try {
    const openTrades = await getOpenTrades();
    if (openTrades.length === 0) return result;

    console.log(`[AutoEdge-Monitor] Checking ${openTrades.length} open trades`);

    for (const trade of openTrades) {
      try {
        result.checked++;
        const binanceSymbol = `${trade.symbol}USDT`;

        // Check position on Binance
        const position = await getPosition(binanceSymbol);

        if (!position || parseFloat(position.positionAmt) === 0) {
          // Position closed — determine why
          await handleClosedPosition(trade);
          result.closed++;
        } else {
          // Position still open — check if TP1 was hit (partial close)
          await checkPartialClose(trade, position);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        const msg = `${trade.symbol}: ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(msg);
        console.error(`[AutoEdge-Monitor] Error checking ${trade.symbol}:`, err);
      }
    }

    console.log(`[AutoEdge-Monitor] Done: checked=${result.checked}, closed=${result.closed}`);
  } catch (err) {
    console.error('[AutoEdge-Monitor] Fatal error:', err);
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}

/**
 * Determine outcome when a position is fully closed
 */
async function handleClosedPosition(trade: {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: number;
  quantity: number;
  plannedSl: number;
  plannedTp1: number;
  plannedTp2: number;
  signalId: string;
}): Promise<void> {
  const binanceSymbol = `${trade.symbol}USDT`;

  // Check which orders were filled to determine outcome
  let outcome: 'tp1_hit' | 'tp2_hit' | 'sl_hit' | 'closed_manual' = 'closed_manual';
  let exitPrice = 0;

  try {
    const openOrders = await getOpenOrders(binanceSymbol);

    // If SL order is gone (filled) and TPs still open → SL hit
    // If TP orders are gone (filled) and SL still open → TP hit
    const hasSlOpen = openOrders.some(o => o.type === 'STOP_MARKET' && o.status === 'NEW');
    // Count remaining TP orders — TP1 is partial qty, TP2 closes position
    const tpOrders = openOrders.filter(o =>
      o.type === 'TAKE_PROFIT_MARKET' && o.status === 'NEW',
    );
    const hasTp1Open = tpOrders.length >= 2; // Both TPs still open
    const hasTp2Open = tpOrders.length >= 1; // At least TP2 still open

    if (!hasSlOpen && (hasTp1Open || hasTp2Open)) {
      outcome = 'sl_hit';
      exitPrice = trade.plannedSl;
    } else if (!hasTp2Open && hasSlOpen) {
      outcome = 'tp2_hit';
      exitPrice = trade.plannedTp2;
    } else if (!hasTp1Open && hasSlOpen) {
      outcome = 'tp1_hit';
      exitPrice = trade.plannedTp1;
    } else {
      // All orders gone — might be manual close or cascade
      // Use mark price as exit estimate
      outcome = 'closed_manual';
      exitPrice = trade.entryPrice; // fallback
    }
  } catch {
    // If we can't check orders, mark as manual close
    outcome = 'closed_manual';
    exitPrice = trade.entryPrice;
  }

  // Cancel remaining open orders
  try {
    await cancelAllOrders(binanceSymbol);
  } catch { /* best effort */ }

  // Calculate P/L
  const direction = trade.direction === 'long' ? 1 : -1;
  const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * direction;
  const pnlUsdt = (exitPrice - trade.entryPrice) * trade.quantity * direction;

  // Update database
  await closeAutoEdgeTrade(trade.id, {
    status: outcome,
    exitPrice,
    pnlUsdt,
    pnlPercent,
  });

  console.log(`[AutoEdge-Monitor] Trade closed: ${trade.symbol} ${outcome} — P/L: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}% ($${pnlUsdt.toFixed(2)})`);
}

/**
 * Check if TP1 was hit (partial close) and update trade
 */
async function checkPartialClose(
  trade: { id: string; symbol: string; tp1Hit?: boolean },
  position: FuturesPosition,
): Promise<void> {
  if (trade.tp1Hit) return; // Already tracked

  const binanceSymbol = `${trade.symbol}USDT`;

  try {
    const openOrders = await getOpenOrders(binanceSymbol);
    const tpOrderCount = openOrders.filter(o =>
      o.type === 'TAKE_PROFIT_MARKET' && o.status === 'NEW',
    ).length;

    // If only 1 TP order left (was 2), TP1 was filled
    if (tpOrderCount <= 1) {
      await markTp1Hit(trade.id);
      console.log(`[AutoEdge-Monitor] ${trade.symbol} TP1 hit (partial close)`);
    }
  } catch {
    // Non-critical, will retry next cycle
  }
}

// ─── Position Sizing ──────────────────────────────────────────

function calculatePositionSize(
  availableBalance: number,
  entryPrice: number,
  stopLoss: number,
): number {
  if (availableBalance <= 0 || entryPrice <= 0 || stopLoss <= 0) return 0;

  const riskAmount = availableBalance * AUTOEDGE_TRADE_CONFIG.riskPerTrade;
  const slDistance = Math.abs(entryPrice - stopLoss) / entryPrice;

  if (slDistance === 0) return 0;

  // Position size = risk / SL distance, adjusted by leverage
  let positionSize = (riskAmount / slDistance);

  // Apply limits
  positionSize = Math.min(positionSize, AUTOEDGE_TRADE_CONFIG.maxPositionUsdt);
  positionSize = Math.min(positionSize, availableBalance * 0.5); // Never use more than 50% of balance

  return positionSize;
}

// ─── Database Operations ──────────────────────────────────────

async function saveAutoEdgeTrade(data: {
  signalId: string;
  symbol: string;
  binanceSymbol: string;
  direction: string;
  entryOrderId: number;
  entryPrice: number;
  quantity: number;
  slOrderId?: number;
  tp1OrderId?: number;
  tp2OrderId?: number;
  plannedEntry: number;
  plannedSl: number;
  plannedTp1: number;
  plannedTp2: number;
  leverage: number;
  positionSizeUsdt: number;
}): Promise<{ id: string }> {
  try {
    const trade = await (prisma as any).autoEdgeTrade.create({
      data: {
        signalId: data.signalId,
        symbol: data.symbol,
        binanceSymbol: data.binanceSymbol,
        direction: data.direction,
        status: 'open',
        entryOrderId: data.entryOrderId,
        entryPrice: data.entryPrice,
        quantity: data.quantity,
        slOrderId: data.slOrderId || null,
        tp1OrderId: data.tp1OrderId || null,
        tp2OrderId: data.tp2OrderId || null,
        plannedEntry: data.plannedEntry,
        plannedSl: data.plannedSl,
        plannedTp1: data.plannedTp1,
        plannedTp2: data.plannedTp2,
        leverage: data.leverage,
        positionSizeUsdt: data.positionSizeUsdt,
      },
    });
    return trade;
  } catch (err) {
    // Table might not exist yet — log and return a mock ID
    console.error('[AutoEdge-Executor] DB save failed (run migration?):', err);
    return { id: `temp-${Date.now()}` };
  }
}

async function closeAutoEdgeTrade(
  tradeId: string,
  outcome: {
    status: string;
    exitPrice: number;
    pnlUsdt: number;
    pnlPercent: number;
  },
): Promise<void> {
  try {
    await (prisma as any).autoEdgeTrade.update({
      where: { id: tradeId },
      data: {
        status: outcome.status,
        exitPrice: outcome.exitPrice,
        pnlUsdt: outcome.pnlUsdt,
        pnlPercent: outcome.pnlPercent,
        closedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[AutoEdge-Monitor] DB update failed:', err);
  }
}

async function markTp1Hit(tradeId: string): Promise<void> {
  try {
    await (prisma as any).autoEdgeTrade.update({
      where: { id: tradeId },
      data: { tp1Hit: true, tp1HitAt: new Date() },
    });
  } catch (err) {
    console.error('[AutoEdge-Monitor] TP1 mark failed:', err);
  }
}

async function getOpenTradeCount(): Promise<number> {
  try {
    return await (prisma as any).autoEdgeTrade.count({
      where: { status: 'open' },
    });
  } catch {
    return 0; // Table might not exist
  }
}

async function getOpenTradeForSymbol(symbol: string): Promise<boolean> {
  try {
    const trade = await (prisma as any).autoEdgeTrade.findFirst({
      where: { symbol, status: 'open' },
    });
    return !!trade;
  } catch {
    return false;
  }
}

export async function getOpenTrades(): Promise<Array<{
  id: string;
  signalId: string;
  symbol: string;
  direction: string;
  entryPrice: number;
  quantity: number;
  plannedSl: number;
  plannedTp1: number;
  plannedTp2: number;
  tp1Hit?: boolean;
}>> {
  try {
    return await (prisma as any).autoEdgeTrade.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return [];
  }
}

export async function getAllTrades(limit: number = 50): Promise<any[]> {
  try {
    return await (prisma as any).autoEdgeTrade.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function getTradeStats(): Promise<{
  totalTrades: number;
  openTrades: number;
  winCount: number;
  lossCount: number;
  totalPnlUsdt: number;
  totalPnlPercent: number;
  winRate: number;
  avgPnlPercent: number;
}> {
  const defaultStats = {
    totalTrades: 0, openTrades: 0, winCount: 0, lossCount: 0,
    totalPnlUsdt: 0, totalPnlPercent: 0, winRate: 0, avgPnlPercent: 0,
  };

  try {
    const trades = await (prisma as any).autoEdgeTrade.findMany();
    if (!trades || trades.length === 0) return defaultStats;

    const closed = trades.filter((t: any) => t.status !== 'open' && t.status !== 'error');
    const wins = closed.filter((t: any) => (t.pnlUsdt ?? 0) > 0);
    const losses = closed.filter((t: any) => (t.pnlUsdt ?? 0) < 0);

    const totalPnlUsdt = closed.reduce((sum: number, t: any) => sum + (t.pnlUsdt ?? 0), 0);
    const totalPnlPercent = closed.reduce((sum: number, t: any) => sum + (t.pnlPercent ?? 0), 0);

    return {
      totalTrades: trades.length,
      openTrades: trades.filter((t: any) => t.status === 'open').length,
      winCount: wins.length,
      lossCount: losses.length,
      totalPnlUsdt,
      totalPnlPercent,
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      avgPnlPercent: closed.length > 0 ? totalPnlPercent / closed.length : 0,
    };
  } catch {
    return defaultStats;
  }
}

/**
 * Emergency: close all open positions and cancel all orders
 */
export async function emergencyCloseAll(): Promise<{
  closed: number;
  errors: string[];
}> {
  if (!isTestnetConfigured()) return { closed: 0, errors: ['Testnet not configured'] };

  const result = { closed: 0, errors: [] as string[] };
  const openTrades = await getOpenTrades();

  for (const trade of openTrades) {
    try {
      const binanceSymbol = `${trade.symbol}USDT`;

      // Cancel all open orders
      await cancelAllOrders(binanceSymbol);

      // Close position with market order
      const position = await getPosition(binanceSymbol);
      if (position && parseFloat(position.positionAmt) !== 0) {
        const amt = Math.abs(parseFloat(position.positionAmt));
        const closeSide = parseFloat(position.positionAmt) > 0 ? 'SELL' : 'BUY';
        await placeMarketOrder(binanceSymbol, closeSide, amt);
      }

      // Update DB
      await closeAutoEdgeTrade(trade.id, {
        status: 'closed_manual',
        exitPrice: position ? parseFloat(position.markPrice) : trade.entryPrice,
        pnlUsdt: position ? parseFloat(position.unRealizedProfit) : 0,
        pnlPercent: 0,
      });

      result.closed++;
      console.log(`[AutoEdge-Executor] Emergency closed ${trade.symbol}`);

    } catch (err) {
      result.errors.push(`${trade.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
