/**
 * Binance Futures Testnet Client
 * HMAC SHA256 signed requests for order management on testnet
 *
 * Base URL: https://testnet.binancefuture.com
 * Docs: https://binance-docs.github.io/apidocs/futures/en/
 */

import { createHmac } from 'crypto';

// ─── Configuration ────────────────────────────────────────────
const TESTNET_BASE_URL = 'https://testnet.binancefuture.com';
const REQUEST_TIMEOUT = 10_000; // 10 seconds

function getApiKey(): string {
  return process.env['BINANCE_TESTNET_API_KEY'] || '';
}

function getApiSecret(): string {
  return process.env['BINANCE_TESTNET_API_SECRET'] || '';
}

// ─── HMAC SHA256 Signing ──────────────────────────────────────
function sign(queryString: string): string {
  const secret = getApiSecret();
  if (!secret) throw new Error('[BinanceTestnet] BINANCE_TESTNET_API_SECRET not configured');
  return createHmac('sha256', secret).update(queryString).digest('hex');
}

function buildSignedQuery(params: Record<string, string | number | boolean>): string {
  params.timestamp = Date.now();
  if (!params.recvWindow) params.recvWindow = 5000;

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const signature = sign(qs);
  return `${qs}&signature=${signature}`;
}

// ─── HTTP Helpers ─────────────────────────────────────────────
async function signedRequest<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PUT',
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('[BinanceTestnet] BINANCE_TESTNET_API_KEY not configured');

  const signedQs = buildSignedQuery(params);
  const url = `${TESTNET_BASE_URL}${endpoint}?${signedQs}`;

  const res = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  const body = await res.text();

  if (!res.ok) {
    let parsed: { code?: number; msg?: string } = {};
    try { parsed = JSON.parse(body); } catch { /* ignore */ }
    throw new BinanceTestnetError(
      parsed.msg || `HTTP ${res.status}: ${body.slice(0, 200)}`,
      parsed.code || res.status,
      endpoint,
    );
  }

  return JSON.parse(body) as T;
}

export class BinanceTestnetError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly endpoint: string,
  ) {
    super(`[BinanceTestnet] ${message} (code=${code}, endpoint=${endpoint})`);
    this.name = 'BinanceTestnetError';
  }
}

// ─── Type Definitions ─────────────────────────────────────────
export interface FuturesOrder {
  orderId: number;
  symbol: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  side: 'BUY' | 'SELL';
  stopPrice: string;
  workingType: string;
  positionSide: string;
  closePosition?: boolean;
  updateTime: number;
}

export interface FuturesPosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: 'cross' | 'isolated';
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notional: string;
  updateTime: number;
}

export interface FuturesBalance {
  asset: string;
  balance: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
}

export interface LeverageResponse {
  leverage: number;
  maxNotionalValue: string;
  symbol: string;
}

// ─── API Methods ──────────────────────────────────────────────

/**
 * Place a market order (instant fill)
 */
export async function placeMarketOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
): Promise<FuturesOrder> {
  console.log(`[BinanceTestnet] Market ${side} ${quantity} ${symbol}`);
  return signedRequest<FuturesOrder>('POST', '/fapi/v1/order', {
    symbol,
    side,
    type: 'MARKET',
    quantity,
  });
}

/**
 * Place a stop-market order (SL)
 */
export async function placeStopMarketOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  stopPrice: number,
  closePosition: boolean = true,
  quantity?: number,
): Promise<FuturesOrder> {
  console.log(`[BinanceTestnet] Stop-Market ${side} @ ${stopPrice} ${symbol}`);
  const params: Record<string, string | number | boolean> = {
    symbol,
    side,
    type: 'STOP_MARKET',
    stopPrice,
    workingType: 'MARK_PRICE',
  };
  if (closePosition) {
    params.closePosition = true;
  } else if (quantity) {
    params.quantity = quantity;
  }
  return signedRequest<FuturesOrder>('POST', '/fapi/v1/order', params);
}

/**
 * Place a take-profit market order (TP)
 */
export async function placeTakeProfitOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  stopPrice: number,
  closePosition: boolean = true,
  quantity?: number,
): Promise<FuturesOrder> {
  console.log(`[BinanceTestnet] Take-Profit ${side} @ ${stopPrice} ${symbol}`);
  const params: Record<string, string | number | boolean> = {
    symbol,
    side,
    type: 'TAKE_PROFIT_MARKET',
    stopPrice,
    workingType: 'MARK_PRICE',
  };
  if (closePosition) {
    params.closePosition = true;
  } else if (quantity) {
    params.quantity = quantity;
  }
  return signedRequest<FuturesOrder>('POST', '/fapi/v1/order', params);
}

/**
 * Cancel a specific order
 */
export async function cancelOrder(symbol: string, orderId: number): Promise<FuturesOrder> {
  console.log(`[BinanceTestnet] Cancel order ${orderId} on ${symbol}`);
  return signedRequest<FuturesOrder>('DELETE', '/fapi/v1/order', {
    symbol,
    orderId,
  });
}

/**
 * Cancel all open orders for a symbol
 */
export async function cancelAllOrders(symbol: string): Promise<{ code: number; msg: string }> {
  console.log(`[BinanceTestnet] Cancel all orders on ${symbol}`);
  return signedRequest('DELETE', '/fapi/v1/allOpenOrders', { symbol });
}

/**
 * Get all open positions (filter by symbol optionally)
 */
export async function getPositions(symbol?: string): Promise<FuturesPosition[]> {
  const params: Record<string, string | number | boolean> = {};
  if (symbol) params.symbol = symbol;
  return signedRequest<FuturesPosition[]>('GET', '/fapi/v2/positionRisk', params);
}

/**
 * Get open position for a specific symbol (returns null if no position)
 */
export async function getPosition(symbol: string): Promise<FuturesPosition | null> {
  const positions = await getPositions(symbol);
  const pos = positions.find(p => p.symbol === symbol && parseFloat(p.positionAmt) !== 0);
  return pos || null;
}

/**
 * Get account balances
 */
export async function getBalances(): Promise<FuturesBalance[]> {
  return signedRequest<FuturesBalance[]>('GET', '/fapi/v2/balance', {});
}

/**
 * Get USDT balance
 */
export async function getUsdtBalance(): Promise<{ total: number; available: number }> {
  const balances = await getBalances();
  const usdt = balances.find(b => b.asset === 'USDT');
  if (!usdt) return { total: 0, available: 0 };
  return {
    total: parseFloat(usdt.balance),
    available: parseFloat(usdt.availableBalance),
  };
}

/**
 * Set leverage for a symbol
 */
export async function setLeverage(symbol: string, leverage: number): Promise<LeverageResponse> {
  console.log(`[BinanceTestnet] Set leverage ${leverage}x on ${symbol}`);
  return signedRequest<LeverageResponse>('POST', '/fapi/v1/leverage', {
    symbol,
    leverage,
  });
}

/**
 * Set margin type (ISOLATED or CROSSED)
 */
export async function setMarginType(
  symbol: string,
  marginType: 'ISOLATED' | 'CROSSED',
): Promise<{ code: number; msg: string }> {
  try {
    return await signedRequest('POST', '/fapi/v1/marginType', { symbol, marginType });
  } catch (err) {
    // -4046 = "No need to change margin type" (already set)
    if (err instanceof BinanceTestnetError && err.code === -4046) {
      return { code: 200, msg: 'Already set' };
    }
    throw err;
  }
}

/**
 * Get all open orders for a symbol
 */
export async function getOpenOrders(symbol?: string): Promise<FuturesOrder[]> {
  const params: Record<string, string | number | boolean> = {};
  if (symbol) params.symbol = symbol;
  return signedRequest<FuturesOrder[]>('GET', '/fapi/v1/openOrders', params);
}

/**
 * Get exchange info for symbol (min qty, step size, tick size)
 */
export async function getSymbolInfo(symbol: string): Promise<{
  minQty: number;
  stepSize: number;
  tickSize: number;
  pricePrecision: number;
  quantityPrecision: number;
} | null> {
  try {
    const url = `${TESTNET_BASE_URL}/fapi/v1/exchangeInfo`;
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
    const data = await res.json() as { symbols: Array<{
      symbol: string;
      pricePrecision: number;
      quantityPrecision: number;
      filters: Array<{ filterType: string; minQty?: string; stepSize?: string; tickSize?: string }>;
    }> };

    const sym = data.symbols.find(s => s.symbol === symbol);
    if (!sym) return null;

    const lotSize = sym.filters.find(f => f.filterType === 'LOT_SIZE');
    const priceFilter = sym.filters.find(f => f.filterType === 'PRICE_FILTER');

    return {
      minQty: parseFloat(lotSize?.minQty || '0.001'),
      stepSize: parseFloat(lotSize?.stepSize || '0.001'),
      tickSize: parseFloat(priceFilter?.tickSize || '0.01'),
      pricePrecision: sym.pricePrecision,
      quantityPrecision: sym.quantityPrecision,
    };
  } catch {
    return null;
  }
}

/**
 * Round quantity to valid step size
 */
export function roundToStepSize(quantity: number, stepSize: number): number {
  const precision = Math.max(0, Math.ceil(-Math.log10(stepSize)));
  return parseFloat((Math.floor(quantity / stepSize) * stepSize).toFixed(precision));
}

/**
 * Check if testnet credentials are configured
 */
export function isTestnetConfigured(): boolean {
  return !!(getApiKey() && getApiSecret());
}
