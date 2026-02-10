// =============================================================================
// Screener Shared – Types, mock data, helpers
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortKey =
  | 'symbol'
  | 'price'
  | 'change24h'
  | 'volume'
  | 'score'
  | 'verdict'
  | 'phase';

export type SortDir = 'asc' | 'desc';

export type Market = 'ALL' | 'CRYPTO' | 'STOCKS' | 'METALS' | 'BONDS' | 'BIST';

export type Verdict = 'GO' | 'COND' | 'WAIT' | 'AVOID';

export interface Asset {
  symbol: string;
  name: string;
  market: Exclude<Market, 'ALL'>;
  price: number;
  change24h: number;
  volume: number;
  score: number;
  verdict: Verdict;
  direction: 'long' | 'short' | 'neutral';
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  flowScore: number;
  rsi: number;
  macd: 'bullish' | 'bearish' | 'neutral';
}

export interface StepData {
  score: number;
  status: 'pass' | 'warn' | 'fail';
  summary: string;
  details: string[];
}

export interface MLISLayerData {
  score: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  details: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MARKETS: Market[] = ['ALL', 'CRYPTO', 'STOCKS', 'METALS', 'BONDS', 'BIST'];
export const VERDICTS: (Verdict | 'ALL')[] = ['ALL', 'GO', 'COND', 'WAIT', 'AVOID'];

export const STEP_NAMES: Record<string, string> = {
  step1: 'Market Pulse',
  step2: 'Asset Scanner',
  step3: 'Safety Check',
  step4: 'Timing Analysis',
  step5: 'Trade Plan',
  step6: 'Trap Check',
  step7: 'Final Verdict',
};

export const MLIS_NAMES: Record<string, string> = {
  mlis1: 'Technical Layer',
  mlis2: 'Momentum Layer',
  mlis3: 'Volatility Layer',
  mlis4: 'Volume Layer',
  mlis5: 'ML Verdict',
};

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

export const MOCK_ASSETS: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', market: 'CRYPTO', price: 97250, change24h: 2.14, volume: 48200000000, score: 8.4, verdict: 'GO', direction: 'long', phase: 'MID', flowScore: 85, rsi: 62, macd: 'bullish' },
  { symbol: 'ETH', name: 'Ethereum', market: 'CRYPTO', price: 3420, change24h: 3.87, volume: 22100000000, score: 7.9, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 91, rsi: 58, macd: 'bullish' },
  { symbol: 'SOL', name: 'Solana', market: 'CRYPTO', price: 198.5, change24h: 5.22, volume: 8700000000, score: 8.1, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 88, rsi: 64, macd: 'bullish' },
  { symbol: 'BNB', name: 'Binance Coin', market: 'CRYPTO', price: 612, change24h: -0.42, volume: 2100000000, score: 6.2, verdict: 'WAIT', direction: 'neutral', phase: 'LATE', flowScore: 45, rsi: 48, macd: 'neutral' },
  { symbol: 'XRP', name: 'Ripple', market: 'CRYPTO', price: 2.34, change24h: 1.85, volume: 4500000000, score: 7.1, verdict: 'COND', direction: 'long', phase: 'MID', flowScore: 72, rsi: 55, macd: 'bullish' },
  { symbol: 'ADA', name: 'Cardano', market: 'CRYPTO', price: 0.82, change24h: -2.1, volume: 1200000000, score: 4.8, verdict: 'AVOID', direction: 'short', phase: 'EXIT', flowScore: 22, rsi: 35, macd: 'bearish' },
  { symbol: 'AVAX', name: 'Avalanche', market: 'CRYPTO', price: 38.2, change24h: 4.15, volume: 980000000, score: 7.6, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 82, rsi: 61, macd: 'bullish' },
  { symbol: 'DOGE', name: 'Dogecoin', market: 'CRYPTO', price: 0.178, change24h: -3.42, volume: 2800000000, score: 3.5, verdict: 'AVOID', direction: 'short', phase: 'EXIT', flowScore: 18, rsi: 28, macd: 'bearish' },
  { symbol: 'SPY', name: 'S&P 500 ETF', market: 'STOCKS', price: 512.3, change24h: 0.45, volume: 92000000, score: 7.2, verdict: 'COND', direction: 'long', phase: 'LATE', flowScore: 65, rsi: 52, macd: 'neutral' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', market: 'STOCKS', price: 448.7, change24h: 0.82, volume: 55000000, score: 7.5, verdict: 'GO', direction: 'long', phase: 'MID', flowScore: 74, rsi: 57, macd: 'bullish' },
  { symbol: 'AAPL', name: 'Apple Inc', market: 'STOCKS', price: 198.2, change24h: 1.12, volume: 62000000, score: 7.8, verdict: 'GO', direction: 'long', phase: 'MID', flowScore: 78, rsi: 59, macd: 'bullish' },
  { symbol: 'MSFT', name: 'Microsoft', market: 'STOCKS', price: 412.5, change24h: 0.34, volume: 28000000, score: 6.9, verdict: 'COND', direction: 'long', phase: 'LATE', flowScore: 62, rsi: 51, macd: 'neutral' },
  { symbol: 'NVDA', name: 'Nvidia', market: 'STOCKS', price: 878.3, change24h: 2.45, volume: 45000000, score: 8.2, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 89, rsi: 65, macd: 'bullish' },
  { symbol: 'THYAO', name: 'THY', market: 'BIST', price: 312.5, change24h: 1.87, volume: 8500000, score: 7.4, verdict: 'COND', direction: 'long', phase: 'MID', flowScore: 68, rsi: 54, macd: 'bullish' },
  { symbol: 'GARAN', name: 'Garanti BBVA', market: 'BIST', price: 142.8, change24h: -0.95, volume: 6200000, score: 5.8, verdict: 'WAIT', direction: 'neutral', phase: 'LATE', flowScore: 42, rsi: 44, macd: 'neutral' },
  { symbol: 'GLD', name: 'Gold ETF', market: 'METALS', price: 215.4, change24h: 0.72, volume: 12000000, score: 7.0, verdict: 'COND', direction: 'long', phase: 'LATE', flowScore: 58, rsi: 53, macd: 'neutral' },
  { symbol: 'SLV', name: 'Silver ETF', market: 'METALS', price: 28.6, change24h: 1.35, volume: 8500000, score: 6.8, verdict: 'WAIT', direction: 'neutral', phase: 'MID', flowScore: 55, rsi: 49, macd: 'neutral' },
  { symbol: 'TLT', name: 'Treasury Bond ETF', market: 'BONDS', price: 92.4, change24h: -0.28, volume: 22000000, score: 5.2, verdict: 'WAIT', direction: 'neutral', phase: 'EXIT', flowScore: 32, rsi: 38, macd: 'bearish' },
  { symbol: 'IEF', name: '7-10Y Treasury', market: 'BONDS', price: 98.1, change24h: 0.15, volume: 9800000, score: 5.5, verdict: 'WAIT', direction: 'neutral', phase: 'MID', flowScore: 40, rsi: 42, macd: 'neutral' },
  { symbol: 'LINK', name: 'Chainlink', market: 'CRYPTO', price: 18.45, change24h: 6.82, volume: 1800000000, score: 7.8, verdict: 'GO', direction: 'long', phase: 'EARLY', flowScore: 86, rsi: 63, macd: 'bullish' },
];

// ---------------------------------------------------------------------------
// Mock data generators
// ---------------------------------------------------------------------------

export function getMockStepData(asset: Asset, stepId: string): StepData {
  const s = asset.score;
  switch (stepId) {
    case 'step1': return { score: Math.min(10, s + 0.3), status: s >= 7 ? 'pass' : s >= 5 ? 'warn' : 'fail', summary: 'Global macro conditions and liquidity bias assessment.', details: ['VIX: 16.2 (low volatility)', 'DXY: 103.8 (neutral)', 'Fed bias: Dovish', `Liquidity trend: ${s >= 7 ? 'Expanding' : 'Contracting'}`] };
    case 'step2': return { score: Math.min(10, s - 0.2), status: s >= 7 ? 'pass' : s >= 5 ? 'warn' : 'fail', summary: 'Technical structure and trend alignment check.', details: [`RSI: ${asset.rsi}`, `MACD: ${asset.macd}`, `Trend: ${asset.direction === 'long' ? '200 MA above' : '200 MA below'}`, `Volume: ${asset.volume > 1e9 ? 'Strong' : 'Moderate'}`] };
    case 'step3': return { score: Math.min(10, s + 0.1), status: s >= 6 ? 'pass' : s >= 4 ? 'warn' : 'fail', summary: 'Order book depth and whale activity analysis.', details: ['Buy wall: $2.4M @ support', 'Sell wall: $1.8M @ resistance', `Whale activity: ${s >= 7 ? 'Accumulation' : 'Distribution'}`, `Liquidity depth: ${s >= 6 ? 'Adequate' : 'Thin'}`] };
    case 'step4': return { score: Math.min(10, s - 0.1), status: asset.phase === 'EARLY' || asset.phase === 'MID' ? 'pass' : 'warn', summary: 'Entry timing and economic calendar check.', details: [`Phase: ${asset.phase}`, `Flow score: ${asset.flowScore}`, 'No major events in 4h', `Timing: ${asset.phase === 'EARLY' ? 'Optimal' : asset.phase === 'MID' ? 'Acceptable' : 'Caution'}`] };
    case 'step5': return { score: Math.min(10, s + 0.5), status: s >= 7 ? 'pass' : 'warn', summary: 'Entry, stop loss, and take profit levels.', details: [`Direction: ${(asset.direction || 'neutral').toUpperCase()}`, `Entry: $${fmtPrice(asset.price * (asset.direction === 'long' ? 0.995 : 1.005))}`, `Stop Loss: $${fmtPrice(asset.price * (asset.direction === 'long' ? 0.97 : 1.03))}`, `TP1: $${fmtPrice(asset.price * (asset.direction === 'long' ? 1.03 : 0.97))}`] };
    case 'step6': return { score: Math.min(10, s + 0.2), status: s >= 6 ? 'pass' : 'warn', summary: 'Bull/bear trap detection and divergence check.', details: [`Trap risk: ${s >= 7 ? 'Low' : s >= 5 ? 'Moderate' : 'High'}`, `Divergence: ${asset.macd === 'bullish' && asset.rsi > 60 ? 'None' : 'Possible'}`, `Volume confirmation: ${asset.volume > 1e9 ? 'Yes' : 'Weak'}`, `Fakeout probability: ${s >= 7 ? '< 15%' : '> 30%'}`] };
    case 'step7': return { score: s, status: s >= 7 ? 'pass' : s >= 5 ? 'warn' : 'fail', summary: `Final verdict: ${asset.verdict}. Direction: ${(asset.direction || 'neutral').toUpperCase()}.`, details: [`Overall Score: ${s.toFixed(1)}/10`, `Verdict: ${asset.verdict}`, `Confidence: ${Math.round(s * 10)}%`, `Risk: ${s >= 7 ? 'Low-Medium' : s >= 5 ? 'Medium' : 'High'}`] };
    default: return { score: 5, status: 'warn', summary: 'No data', details: [] };
  }
}

export function getMockMLISData(asset: Asset, layerId: string): MLISLayerData {
  const s = asset.score;
  switch (layerId) {
    case 'mlis1': return { score: Math.min(100, s * 11), signal: s >= 7 ? 'bullish' : s >= 5 ? 'neutral' : 'bearish', confidence: Math.min(95, s * 10 + 10), details: ['MA alignment confirmed', `RSI signal: ${asset.rsi > 50 ? 'positive' : 'negative'}`, `BB position: ${s >= 7 ? 'upper band' : 'middle band'}`, `ADX strength: ${s >= 7 ? 'strong trend' : 'weak trend'}`] };
    case 'mlis2': return { score: Math.min(100, s * 10.5), signal: asset.macd === 'bullish' ? 'bullish' : asset.macd === 'bearish' ? 'bearish' : 'neutral', confidence: Math.min(90, s * 9 + 12), details: [`MACD: ${asset.macd}`, `Stochastic: ${asset.rsi > 50 ? 'overbought zone' : 'neutral zone'}`, `MFI: ${s >= 7 ? 'money inflow' : 'balanced'}`, `Momentum strength: ${s >= 7 ? 'increasing' : 'flat'}`] };
    case 'mlis3': return { score: Math.min(100, s * 10), signal: s >= 6 ? 'bullish' : 'neutral', confidence: Math.min(85, s * 8 + 15), details: [`ATR: ${s >= 7 ? 'moderate' : 'elevated'}`, `BB width: ${s >= 7 ? 'contracting' : 'expanding'}`, `Historical vol: ${s >= 7 ? 'below average' : 'above average'}`, `Volatility regime: ${s >= 7 ? 'low-vol' : 'high-vol'}`] };
    case 'mlis4': return { score: Math.min(100, s * 10.2), signal: asset.volume > 1e9 ? 'bullish' : 'neutral', confidence: Math.min(88, s * 9 + 8), details: [`OBV trend: ${s >= 7 ? 'rising' : 'flat'}`, `Volume vs 20d avg: ${asset.volume > 1e9 ? '+42%' : '-12%'}`, `CMF: ${s >= 7 ? 'positive' : 'neutral'}`, `VWAP: price ${asset.direction === 'long' ? 'above' : 'below'}`] };
    case 'mlis5': return { score: Math.min(100, s * 10.3), signal: s >= 7 ? 'bullish' : s >= 5 ? 'neutral' : 'bearish', confidence: Math.min(92, s * 10 + 5), details: [`Recommendation: ${s >= 7 ? 'BUY' : s >= 5 ? 'HOLD' : 'SELL'}`, `ML confidence: ${Math.min(92, Math.round(s * 10 + 5))}%`, `Risk level: ${s >= 7 ? 'low' : s >= 5 ? 'medium' : 'high'}`, `Signal alignment: ${s >= 7 ? '4/4 layers aligned' : '2/4 layers aligned'}`] };
    default: return { score: 50, signal: 'neutral', confidence: 50, details: [] };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

export function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

export function verdictColor(v: Verdict): string {
  switch (v) {
    case 'GO': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'COND': return 'text-amber-500 dark:text-amber-400';
    case 'WAIT': return 'text-neutral-500 dark:text-neutral-400';
    case 'AVOID': return 'text-red-500 dark:text-red-400';
  }
}

export function verdictBg(v: Verdict): string {
  switch (v) {
    case 'GO': return 'bg-emerald-500/10 dark:bg-[#00f5c4]/10';
    case 'COND': return 'bg-amber-500/10';
    case 'WAIT': return 'bg-neutral-500/10';
    case 'AVOID': return 'bg-red-500/10';
  }
}

export function phaseColor(p: string): string {
  switch (p) {
    case 'EARLY': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'MID': return 'text-amber-500 dark:text-amber-400';
    case 'LATE': return 'text-orange-500';
    case 'EXIT': return 'text-red-500 dark:text-red-400';
    default: return 'text-neutral-500';
  }
}

export function statusColor(s: 'pass' | 'warn' | 'fail'): string {
  switch (s) {
    case 'pass': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'warn': return 'text-amber-500 dark:text-amber-400';
    case 'fail': return 'text-red-500 dark:text-red-400';
  }
}

export function statusBg(s: 'pass' | 'warn' | 'fail'): string {
  switch (s) {
    case 'pass': return 'bg-emerald-500/10 dark:bg-[#00f5c4]/10';
    case 'warn': return 'bg-amber-500/10';
    case 'fail': return 'bg-red-500/10';
  }
}

export function signalColor(s: 'bullish' | 'bearish' | 'neutral'): string {
  switch (s) {
    case 'bullish': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'bearish': return 'text-red-500 dark:text-red-400';
    case 'neutral': return 'text-neutral-500 dark:text-neutral-400';
  }
}
