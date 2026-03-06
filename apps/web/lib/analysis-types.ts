// ===========================================
// Shared Analysis Types
// Used by Auto, Tailored, and shared components
// ===========================================

export type TradeType = 'scalping' | 'dayTrade' | 'swing';

export type Verdict = 'go' | 'conditional_go' | 'wait' | 'avoid';

export type VerdictUpper = 'GO' | 'COND' | 'WAIT' | 'AVOID';

export interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: Verdict;
  score: number | null;
  direction: string | null;
  tradeType?: TradeType;
  method?: string;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  tpProgress?: number;
  hasTradePlan?: boolean;
  expiresAt?: string;
}

export interface DailyPassStatus {
  hasPass: boolean;
  canUse: boolean;
  usageCount: number;
  maxUsage: number;
}

export interface TopCoinData {
  symbol: string;
  name: string;
  currentPrice?: number;
  price?: number;
  change24h?: number;
  priceChange24h?: number;
  totalScore?: number;
  reliabilityScore?: number;
  score?: number;
  verdict?: string;
  market?: string;
  assetClass?: string;
}

/**
 * Normalize raw verdict string to lowercase canonical form.
 */
export function normalizeVerdict(raw: string): Verdict {
  const v = raw.toLowerCase().replace(/[^a-z_]/g, '');
  if (v === 'go') return 'go';
  if (v === 'conditional_go' || v === 'conditionalgo' || v === 'cond') return 'conditional_go';
  if (v === 'avoid' || v === 'no_go' || v === 'nogo') return 'avoid';
  return 'wait';
}

/**
 * Normalize raw verdict string to uppercase short form (for UI badges).
 */
export function normalizeVerdictUpper(raw: string): VerdictUpper {
  const v = raw.toUpperCase().replace(/[^A-Z_]/g, '');
  if (v === 'GO') return 'GO';
  if (v === 'COND' || v === 'CONDITIONAL_GO' || v === 'CONDITIONALGO') return 'COND';
  if (v === 'AVOID' || v === 'NO_GO' || v === 'NOGO') return 'AVOID';
  return 'WAIT';
}

/**
 * Map interval string to trade type.
 */
export function intervalToTradeType(interval: string | undefined | null): TradeType | undefined {
  if (!interval) return undefined;
  if (interval === '5m' || interval === '15m') return 'scalping';
  if (interval === '30m' || interval === '1h' || interval === '2h' || interval === '4h') return 'dayTrade';
  if (interval === '1d' || interval === '1D' || interval === '1w' || interval === '1W') return 'swing';
  return undefined;
}

/**
 * Map raw outcome to canonical outcome type.
 */
export function mapOutcome(
  rawOutcome: string | undefined | null,
  hasTradePlan: boolean | undefined
): 'correct' | 'incorrect' | 'pending' | null {
  if (rawOutcome === 'tp1_hit' || rawOutcome === 'tp2_hit' || rawOutcome === 'tp3_hit') return 'correct';
  if (rawOutcome === 'sl_hit') return 'incorrect';
  if (hasTradePlan) return 'pending';
  return null;
}
