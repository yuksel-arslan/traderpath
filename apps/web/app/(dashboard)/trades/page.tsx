'use client';

// =============================================================================
// TraderPath Trades – Active Position Monitor + Before/After Charts
// Hyper-Minimalist Financial Intelligence Terminal
// Sidebar + Content Panel pattern (matches Terminal / Flow / Screener)
// =============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Target,
  Shield,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TradeStatus = 'ACTIVE' | 'TP_HIT' | 'SL_HIT' | 'CLOSED';

interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}

interface Trade {
  id: string;
  symbol: string;
  market: string;
  direction: 'long' | 'short';
  status: TradeStatus;
  entry: number;
  currentPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  pnl: number;
  pnlPercent: number;
  rr: number;
  openedAt: string;
  duration: string;
  score: number;
  flowHealth: number;
  flowSignal: 'hold' | 'tighten' | 'take_profit' | 'close';
  method: 'classic' | 'mlis';
}

type SectionId = 'overview' | string; // 'overview' or trade id

interface NavItem {
  id: SectionId;
  tag?: string;
  label: string;
  sublabel?: string;
  color?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Mock candle generator – deterministic from seed
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCandles(
  basePrice: number,
  count: number,
  seed: number,
  trend: 'up' | 'down' | 'flat',
  volatilityPct: number = 0.015,
): Candle[] {
  const rng = seededRandom(seed);
  const candles: Candle[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const trendBias = trend === 'up' ? 0.0008 : trend === 'down' ? -0.0008 : 0;
    const change = (rng() - 0.48 + trendBias) * volatilityPct * price;
    const open = price;
    const close = price + change;
    const wickUp = Math.abs(change) * (0.3 + rng() * 0.8);
    const wickDown = Math.abs(change) * (0.3 + rng() * 0.8);
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    candles.push({ o: open, h: high, l: low, c: close });
    price = close;
  }
  return candles;
}

function generateBeforeCandles(trade: Trade): Candle[] {
  const trend = trade.direction === 'long' ? 'up' : 'down';
  const seed = trade.id.charCodeAt(0) * 1000 + 42;
  const startPrice = trade.direction === 'long'
    ? trade.entry * 0.97
    : trade.entry * 1.03;
  return generateCandles(startPrice, 40, seed, trend, 0.012);
}

function generateAfterCandles(trade: Trade): Candle[] {
  const seed = trade.id.charCodeAt(0) * 1000 + 99;
  if (trade.status === 'TP_HIT') {
    const trend = trade.direction === 'long' ? 'up' : 'down';
    return generateCandles(trade.entry, 30, seed, trend, 0.014);
  }
  if (trade.status === 'SL_HIT') {
    const trend = trade.direction === 'long' ? 'down' : 'up';
    return generateCandles(trade.entry, 25, seed, trend, 0.016);
  }
  return generateCandles(trade.entry, 20, seed, 'flat', 0.010);
}

function generateForecastBand(
  entry: number,
  direction: 'long' | 'short',
  candleCount: number,
  tp1: number,
  stopLoss: number,
): { p10: number[]; p50: number[]; p90: number[] } {
  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];

  for (let i = 0; i <= candleCount; i++) {
    const t = i / candleCount;
    if (direction === 'long') {
      const target = entry + (tp1 - entry) * t;
      const spread = (tp1 - stopLoss) * 0.15 * Math.sqrt(t + 0.1);
      p50.push(target);
      p90.push(target + spread);
      p10.push(target - spread * 1.3);
    } else {
      const target = entry - (entry - tp1) * t;
      const spread = (stopLoss - tp1) * 0.15 * Math.sqrt(t + 0.1);
      p50.push(target);
      p10.push(target - spread);
      p90.push(target + spread * 1.3);
    }
  }
  return { p10, p50, p90 };
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_TRADES: Trade[] = [
  {
    id: '1', symbol: 'BTC', market: 'CRYPTO', direction: 'long', status: 'ACTIVE',
    entry: 95200, currentPrice: 97250, stopLoss: 92800, tp1: 102000, tp2: 108000,
    pnl: 2050, pnlPercent: 2.15, rr: 2.8, openedAt: '2026-02-07 14:30',
    duration: '1d 18h', score: 8.4, flowHealth: 85, flowSignal: 'hold', method: 'classic',
  },
  {
    id: '2', symbol: 'ETH', market: 'CRYPTO', direction: 'long', status: 'ACTIVE',
    entry: 3280, currentPrice: 3420, stopLoss: 3100, tp1: 3650, tp2: 3900,
    pnl: 140, pnlPercent: 4.27, rr: 2.1, openedAt: '2026-02-06 09:15',
    duration: '2d 23h', score: 7.9, flowHealth: 91, flowSignal: 'hold', method: 'classic',
  },
  {
    id: '3', symbol: 'SOL', market: 'CRYPTO', direction: 'long', status: 'ACTIVE',
    entry: 185, currentPrice: 198.5, stopLoss: 172, tp1: 215, tp2: 240,
    pnl: 13.5, pnlPercent: 7.3, rr: 2.3, openedAt: '2026-02-05 11:00',
    duration: '3d 21h', score: 8.1, flowHealth: 78, flowSignal: 'tighten', method: 'mlis',
  },
  {
    id: '4', symbol: 'NVDA', market: 'STOCKS', direction: 'long', status: 'TP_HIT',
    entry: 842, currentPrice: 878.3, stopLoss: 810, tp1: 880, tp2: 920,
    pnl: 36.3, pnlPercent: 4.31, rr: 1.1, openedAt: '2026-02-03 15:30',
    duration: '5d 17h', score: 8.2, flowHealth: 65, flowSignal: 'take_profit', method: 'classic',
  },
  {
    id: '5', symbol: 'ADA', market: 'CRYPTO', direction: 'short', status: 'ACTIVE',
    entry: 0.88, currentPrice: 0.82, stopLoss: 0.95, tp1: 0.75, tp2: 0.65,
    pnl: 0.06, pnlPercent: 6.82, rr: 1.9, openedAt: '2026-02-08 08:45',
    duration: '0d 23h', score: 4.8, flowHealth: 22, flowSignal: 'close', method: 'classic',
  },
  {
    id: '6', symbol: 'GLD', market: 'METALS', direction: 'long', status: 'SL_HIT',
    entry: 218, currentPrice: 215.4, stopLoss: 213, tp1: 225, tp2: 232,
    pnl: -2.6, pnlPercent: -1.19, rr: -0.5, openedAt: '2026-02-04 10:00',
    duration: '4d 22h', score: 7.0, flowHealth: 42, flowSignal: 'close', method: 'mlis',
  },
  {
    id: '7', symbol: 'LINK', market: 'CRYPTO', direction: 'long', status: 'ACTIVE',
    entry: 16.2, currentPrice: 18.45, stopLoss: 14.8, tp1: 20, tp2: 24,
    pnl: 2.25, pnlPercent: 13.89, rr: 2.7, openedAt: '2026-02-04 16:20',
    duration: '4d 16h', score: 7.8, flowHealth: 86, flowSignal: 'hold', method: 'classic',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(s: TradeStatus) {
  switch (s) {
    case 'ACTIVE': return 'text-blue-500';
    case 'TP_HIT': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'SL_HIT': return 'text-red-500 dark:text-red-400';
    case 'CLOSED': return 'text-slate-400';
  }
}

function statusBg(s: TradeStatus) {
  switch (s) {
    case 'ACTIVE': return 'bg-blue-500/10';
    case 'TP_HIT': return 'bg-emerald-500/10 dark:bg-[#00f5c4]/10';
    case 'SL_HIT': return 'bg-red-500/10';
    case 'CLOSED': return 'bg-slate-500/10';
  }
}

function StatusIcon({ status }: { status: TradeStatus }) {
  switch (status) {
    case 'ACTIVE': return <Clock className="w-3 h-3 text-blue-500" />;
    case 'TP_HIT': return <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-[#00f5c4]" />;
    case 'SL_HIT': return <XCircle className="w-3 h-3 text-red-500 dark:text-red-400" />;
    case 'CLOSED': return <Minus className="w-3 h-3 text-slate-400" />;
  }
}

function flowSignalLabel(s: string): { label: string; color: string } {
  switch (s) {
    case 'hold': return { label: 'HOLD', color: 'text-emerald-500 dark:text-[#00f5c4]' };
    case 'tighten': return { label: 'TIGHTEN', color: 'text-amber-500' };
    case 'take_profit': return { label: 'TAKE PROFIT', color: 'text-blue-500' };
    case 'close': return { label: 'CLOSE', color: 'text-red-500 dark:text-red-400' };
    default: return { label: '—', color: 'text-slate-400' };
  }
}

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

// ---------------------------------------------------------------------------
// SVG Candlestick Chart with Trade Plan + Forecast
// ---------------------------------------------------------------------------

function CandlestickChart({
  candles,
  trade,
  label,
  showForecast,
  showOutcome,
}: {
  candles: Candle[];
  trade: Trade;
  label: string;
  showForecast: boolean;
  showOutcome?: boolean;
}) {
  const W = 520;
  const H = 220;
  const PAD = { top: 28, right: 60, bottom: 20, left: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allPrices = candles.flatMap((c) => [c.h, c.l]);
  allPrices.push(trade.entry, trade.stopLoss, trade.tp1, trade.tp2);
  const minP = Math.min(...allPrices) * 0.998;
  const maxP = Math.max(...allPrices) * 1.002;
  const range = maxP - minP || 1;

  const yScale = (p: number) => PAD.top + chartH - ((p - minP) / range) * chartH;
  const xScale = (i: number) => PAD.left + (i / candles.length) * chartW;
  const candleW = Math.max(1, (chartW / candles.length) * 0.6);

  const forecast = showForecast
    ? generateForecastBand(trade.entry, trade.direction, candles.length, trade.tp1, trade.stopLoss)
    : null;

  let bandPath = '';
  let p50Path = '';
  if (forecast) {
    const pts10 = forecast.p10.map((v, i) => `${xScale(i)},${yScale(v)}`);
    const pts90 = forecast.p90.map((v, i) => `${xScale(i)},${yScale(v)}`);
    bandPath = `M ${pts10.join(' L ')} L ${pts90.reverse().join(' L ')} Z`;
    p50Path = forecast.p50.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(v)}`).join(' ');
  }

  function levelLine(price: number, color: string, lbl: string, dashed: boolean = false) {
    const y = yScale(price);
    if (y < PAD.top - 5 || y > H - PAD.bottom + 5) return null;
    return (
      <g key={lbl}>
        <line
          x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
          stroke={color} strokeWidth={0.8}
          strokeDasharray={dashed ? '3,3' : 'none'}
          opacity={0.6}
        />
        <rect x={W - PAD.right + 2} y={y - 7} width={56} height={14} rx={2} fill={color} opacity={0.15} />
        <text x={W - PAD.right + 5} y={y + 3} fontSize={8} fontFamily="Inter, sans-serif" fill={color} opacity={0.9}>
          {lbl} {fmtPrice(price)}
        </text>
      </g>
    );
  }

  const entryIdx = Math.floor(candles.length * 0.5);

  return (
    <div className="relative">
      <div className="absolute top-1 left-2 z-10 flex items-center gap-1.5">
        <span className="text-[9px] font-sans font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-black/80 px-1.5 py-0.5 rounded">
          {label}
        </span>
        {showOutcome && (
          <span className={cn(
            'text-[9px] font-sans font-bold px-1.5 py-0.5 rounded',
            trade.status === 'TP_HIT' ? 'bg-emerald-500/10 text-emerald-500 dark:text-[#00f5c4]' : 'bg-red-500/10 text-red-500',
          )}>
            {trade.status === 'TP_HIT' ? 'TARGET HIT' : 'STOP HIT'}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 220 }}>
        <rect x={0} y={0} width={W} height={H} className="fill-white dark:fill-black" rx={4} />

        {[0.25, 0.5, 0.75].map((pct) => {
          const y = PAD.top + chartH * pct;
          return (
            <line key={pct} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              className="stroke-black/[0.04] dark:stroke-white/[0.04]" strokeWidth={0.5} />
          );
        })}

        {forecast && bandPath && (
          <path d={bandPath} fill="#14B8A6" opacity={0.06} />
        )}
        {forecast && p50Path && (
          <path d={p50Path} fill="none" stroke="#14B8A6" strokeWidth={1} opacity={0.3} strokeDasharray="4,2" />
        )}

        {candles.map((c, i) => {
          const x = xScale(i);
          const bullish = c.c >= c.o;
          const bodyTop = yScale(Math.max(c.o, c.c));
          const bodyBot = yScale(Math.min(c.o, c.c));
          const bodyH = Math.max(bodyBot - bodyTop, 0.5);
          const color = bullish ? '#22c55e' : '#ef4444';

          return (
            <g key={i}>
              <line x1={x} y1={yScale(c.h)} x2={x} y2={yScale(c.l)} stroke={color} strokeWidth={0.6} opacity={0.5} />
              <rect
                x={x - candleW / 2} y={bodyTop}
                width={candleW} height={bodyH}
                fill={color}
                opacity={bullish ? 0.8 : 0.7}
                rx={0.3}
              />
            </g>
          );
        })}

        {levelLine(trade.entry, '#3b82f6', 'ENT', false)}
        {levelLine(trade.stopLoss, '#ef4444', 'SL', true)}
        {levelLine(trade.tp1, '#22c55e', 'TP1', true)}
        {levelLine(trade.tp2, '#10b981', 'TP2', true)}

        {(() => {
          const mx = xScale(entryIdx);
          const my = yScale(trade.entry);
          return (
            <g>
              <polygon
                points={`${mx - 4},${my + 5} ${mx + 4},${my + 5} ${mx},${my - 1}`}
                fill="#3b82f6" opacity={0.8}
              />
              <text x={mx} y={my + 14} fontSize={7} fontFamily="Inter, sans-serif" fill="#3b82f6" textAnchor="middle" opacity={0.7}>
                ENTRY
              </text>
            </g>
          );
        })()}

        {showOutcome && (() => {
          const outcomePrice = trade.status === 'TP_HIT' ? trade.tp1 : trade.stopLoss;
          const outIdx = candles.length - 3;
          const ox = xScale(Math.max(0, outIdx));
          const oy = yScale(outcomePrice);
          const color = trade.status === 'TP_HIT' ? '#22c55e' : '#ef4444';
          return (
            <g>
              <circle cx={ox} cy={oy} r={4} fill={color} opacity={0.3} />
              <circle cx={ox} cy={oy} r={2} fill={color} opacity={0.8} />
              <text x={ox} y={oy - 8} fontSize={7} fontFamily="Inter, sans-serif" fill={color} textAnchor="middle" fontWeight="bold">
                {trade.status === 'TP_HIT' ? 'TP HIT' : 'SL HIT'}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flow Health indicator
// ---------------------------------------------------------------------------

function FlowHealth({ value, signal }: { value: number; signal: string }) {
  const { label, color } = flowSignalLabel(signal);
  const barColor = value >= 70 ? 'bg-emerald-500 dark:bg-[#00f5c4]' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-slate-400 font-sans">FLOW HEALTH</span>
        <span className={cn('text-[9px] font-bold font-sans', color)}>{label}</span>
      </div>
      <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content: Overview (trade list)
// ---------------------------------------------------------------------------

function OverviewPanel({
  trades,
  onSelect,
  selectedId,
}: {
  trades: Trade[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <div className="space-y-1.5 p-1">
      {trades.map((trade) => {
        const { label: flowLabel, color: flowColor } = flowSignalLabel(trade.flowSignal);

        return (
          <button
            key={trade.id}
            onClick={() => onSelect(trade.id)}
            className={cn(
              'w-full px-3 py-3 flex items-center gap-3 transition-all duration-150 text-left rounded-xl',
              selectedId === trade.id
                ? 'bg-[#14B8A6]/5 dark:bg-[#5EEAD4]/5 ring-1 ring-[#14B8A6]/30 dark:ring-[#5EEAD4]/20'
                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
            )}
          >
            <div className="flex flex-col items-center gap-0.5 w-8">
              <StatusIcon status={trade.status} />
              {trade.direction === 'long'
                ? <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-[#00f5c4]" />
                : <ArrowDownRight className="w-3 h-3 text-red-500 dark:text-red-400" />
              }
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-semibold text-xs">{trade.symbol}</span>
                <span className={cn('text-[9px] font-bold uppercase px-1 py-0.5 rounded', statusBg(trade.status), statusColor(trade.status))}>
                  {trade.status.replace('_', ' ')}
                </span>
                <span className="text-[9px] text-slate-400 font-sans hidden sm:inline">{trade.market}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center gap-2">
                <span>{trade.duration}</span>
                <span className="hidden sm:inline">&middot; Entry ${fmtPrice(trade.entry)}</span>
              </div>
            </div>

            <div className="text-right">
              <div className={cn(
                'text-xs font-sans font-bold tabular-nums',
                trade.pnlPercent >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400',
              )}>
                {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
              </div>
              <div className={cn('text-[10px] font-sans tabular-nums', trade.pnl >= 0 ? 'text-emerald-500/60' : 'text-red-500/60')}>
                {trade.pnl >= 0 ? '+' : ''}{trade.pnl >= 1 ? `$${fmtPrice(trade.pnl)}` : `${trade.pnl.toFixed(4)}`}
              </div>
            </div>

            <div className="hidden sm:block w-16 text-right">
              <span className={cn('text-[9px] font-bold font-sans', flowColor)}>{flowLabel}</span>
            </div>
          </button>
        );
      })}

      {trades.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-xs font-sans">
          No trades match this filter.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content: Trade Detail with Charts
// ---------------------------------------------------------------------------

function TradeDetailPanel({ trade }: { trade: Trade }) {
  const isClosed = trade.status === 'TP_HIT' || trade.status === 'SL_HIT' || trade.status === 'CLOSED';
  const beforeCandles = useMemo(() => generateBeforeCandles(trade), [trade]);
  const afterCandles = useMemo(() => isClosed ? generateAfterCandles(trade) : [], [trade, isClosed]);

  const levels = [
    { label: 'ENTRY', value: trade.entry, icon: <Target className="w-3 h-3" />, color: 'text-blue-500' },
    { label: 'STOP LOSS', value: trade.stopLoss, icon: <Shield className="w-3 h-3" />, color: 'text-red-500 dark:text-red-400' },
    { label: 'TP1', value: trade.tp1, icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-500 dark:text-[#00f5c4]' },
    { label: 'TP2', value: trade.tp2, icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-400 dark:text-emerald-300' },
  ];

  return (
    <div className="space-y-4">
      {/* Trade header context bar */}
      <div className="flex items-center gap-2 pb-3">
        <span className="text-xs font-sans font-semibold">{trade.symbol}</span>
        <span className="text-[10px] text-slate-400 font-sans">{trade.market}</span>
        <span className={cn(
          'text-[9px] font-bold px-1 py-0.5 rounded',
          trade.direction === 'long'
            ? 'bg-emerald-500/10 text-emerald-500 dark:text-[#00f5c4]'
            : 'bg-red-500/10 text-red-500 dark:text-red-400',
        )}>
          {trade.direction.toUpperCase()}
        </span>
        <span className={cn('text-[9px] font-bold uppercase px-1 py-0.5 rounded', statusBg(trade.status), statusColor(trade.status))}>
          {trade.status.replace('_', ' ')}
        </span>
        <span className="text-[9px] font-sans text-slate-400 dark:text-slate-500 uppercase ml-auto">{trade.method}</span>
      </div>

      {/* Trade levels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {levels.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={l.color}>{l.icon}</span>
            <div>
              <div className="text-[9px] text-slate-400 font-sans">{l.label}</div>
              <div className="text-xs font-sans font-semibold tabular-nums">${fmtPrice(l.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {isClosed ? (
        <div className="space-y-2">
          <div className="text-[9px] font-sans font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Before / After Comparison
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-black/[0.06] dark:border-white/[0.06] rounded overflow-hidden">
              <CandlestickChart
                candles={beforeCandles}
                trade={trade}
                label="BEFORE"
                showForecast={true}
              />
            </div>
            <div className="border border-black/[0.06] dark:border-white/[0.06] rounded overflow-hidden">
              <CandlestickChart
                candles={afterCandles}
                trade={trade}
                label="AFTER"
                showForecast={false}
                showOutcome={true}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[9px] font-sans font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Current Position &middot; Forecast Band
          </div>
          <div className="border border-black/[0.06] dark:border-white/[0.06] rounded overflow-hidden">
            <CandlestickChart
              candles={beforeCandles}
              trade={trade}
              label="CURRENT"
              showForecast={true}
            />
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'P/L', value: `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%`, color: trade.pnlPercent >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400' },
          { label: 'R:R', value: trade.rr.toFixed(1), color: '' },
          { label: 'SCORE', value: trade.score.toFixed(1), color: '' },
          { label: 'DURATION', value: trade.duration, color: '' },
          { label: 'OPENED', value: trade.openedAt.split(' ')[0], color: '' },
        ].map((m) => (
          <div key={m.label}>
            <div className="text-[9px] text-slate-400 font-sans">{m.label}</div>
            <div className={cn('text-xs font-sans font-semibold tabular-nums', m.color)}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Flow health */}
      <FlowHealth value={trade.flowHealth} signal={trade.flowSignal} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Panel dispatcher
// ---------------------------------------------------------------------------

function ContentPanel({
  activeSection,
  trades,
  onSelectTrade,
  selectedTradeId,
}: {
  activeSection: SectionId;
  trades: Trade[];
  onSelectTrade: (id: string) => void;
  selectedTradeId: string | null;
}) {
  if (activeSection === 'overview') {
    return (
      <OverviewPanel
        trades={trades}
        onSelect={onSelectTrade}
        selectedId={selectedTradeId}
      />
    );
  }

  // Find trade by id
  const trade = MOCK_TRADES.find((t) => t.id === activeSection);
  if (!trade) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs text-slate-400 font-sans">Trade not found.</p>
      </div>
    );
  }

  return <TradeDetailPanel trade={trade} />;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TradesPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TradeStatus>('ALL');

  const activeTrades = MOCK_TRADES.filter((t) => t.status === 'ACTIVE');
  const closedTrades = MOCK_TRADES.filter((t) => t.status === 'TP_HIT' || t.status === 'SL_HIT' || t.status === 'CLOSED');
  const totalPnl = activeTrades.reduce((s, t) => s + t.pnlPercent, 0);
  const warnings = activeTrades.filter((t) => t.flowSignal === 'close' || t.flowSignal === 'tighten').length;

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return MOCK_TRADES;
    return MOCK_TRADES.filter((t) => t.status === statusFilter);
  }, [statusFilter]);

  // Build nav groups
  const navGroups: NavGroup[] = useMemo(() => {
    const groups: NavGroup[] = [
      {
        title: 'Overview',
        items: [
          { id: 'overview', label: 'All Trades' },
        ],
      },
    ];

    if (activeTrades.length > 0) {
      groups.push({
        title: `Active (${activeTrades.length})`,
        items: activeTrades.map((t) => ({
          id: t.id,
          tag: t.direction === 'long' ? 'L' : 'S',
          label: t.symbol,
          sublabel: `${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent.toFixed(1)}%`,
          color: t.pnlPercent >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400',
        })),
      });
    }

    if (closedTrades.length > 0) {
      groups.push({
        title: `Closed (${closedTrades.length})`,
        items: closedTrades.map((t) => ({
          id: t.id,
          tag: t.status === 'TP_HIT' ? 'TP' : 'SL',
          label: t.symbol,
          sublabel: `${t.pnlPercent >= 0 ? '+' : ''}${t.pnlPercent.toFixed(1)}%`,
          color: t.status === 'TP_HIT' ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400',
        })),
      });
    }

    return groups;
  }, [activeTrades, closedTrades]);

  const allNavItems = navGroups.flatMap((g) => g.items);

  const handleNavClick = useCallback((id: SectionId) => {
    setActiveSection(id);
  }, []);

  const handleSelectFromOverview = useCallback((id: string) => {
    setActiveSection(id);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black text-black dark:text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-sans font-semibold tracking-tight">TRADES</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
              Active Position Monitor &middot; {activeTrades.length} open
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-[10px] font-sans">
              <span className="text-slate-400">
                P/L: <span className={cn('font-semibold', totalPnl >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400')}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}%
                </span>
              </span>
              <span className="text-slate-400">
                ACTIVE: <span className="text-black dark:text-white font-semibold">{activeTrades.length}</span>
              </span>
            </div>
            {warnings > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-500">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[10px] font-sans font-bold">{warnings}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Horizontal scroll tab bar */}
      <div className="lg:hidden shrink-0 border-b border-black/[0.06] dark:border-white/[0.06] overflow-x-auto scrollbar-none">
        <div className="flex gap-px w-max">
          {allNavItems.map((item) => {
            const trade = MOCK_TRADES.find((t) => t.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'px-3 py-2 text-[10px] font-sans uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1',
                  activeSection === item.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                    : 'text-neutral-500 dark:text-neutral-400',
                )}
              >
                {item.tag && (
                  <span className={cn(
                    'text-[9px] font-sans opacity-60',
                    trade && (trade.status === 'TP_HIT' ? 'text-emerald-400' : trade.status === 'SL_HIT' ? 'text-red-400' : ''),
                  )}>
                    {item.tag}
                  </span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: Sidebar + Content Panel */}
      <div className="flex-1 min-h-0 flex max-w-[1400px] mx-auto w-full">
        {/* Sidebar Navigation */}
        <nav className="hidden lg:block w-52 shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] overflow-y-auto scrollbar-none pr-3 py-3">
          {navGroups.map((group, gi) => (
            <div key={group.title} className={cn(gi > 0 && 'mt-5')}>
              {/* Group header */}
              <div className="text-[9px] font-sans text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2 px-2">
                {group.title}
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  const trade = MOCK_TRADES.find((t) => t.id === item.id);
                  const isClosed = trade && (trade.status === 'TP_HIT' || trade.status === 'SL_HIT' || trade.status === 'CLOSED');

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-all duration-150',
                        isActive
                          ? isClosed
                            ? 'bg-neutral-100 dark:bg-neutral-900/50 border-l-2 border-slate-400 dark:border-slate-500 -ml-px'
                            : 'bg-neutral-100 dark:bg-neutral-900/50 border-l-2 border-[#14B8A6] dark:border-[#5EEAD4] -ml-px'
                          : 'border-l-2 border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/20 -ml-px',
                      )}
                    >
                      {item.tag && (
                        <span className={cn(
                          'text-[9px] font-sans tabular-nums w-5 shrink-0',
                          isActive
                            ? isClosed
                              ? trade.status === 'TP_HIT'
                                ? 'text-emerald-500 dark:text-[#00f5c4]'
                                : 'text-red-500 dark:text-red-400'
                              : 'text-[#14B8A6] dark:text-[#5EEAD4]'
                            : 'text-slate-400 dark:text-slate-600',
                        )}>
                          {item.tag}
                        </span>
                      )}
                      <span className={cn(
                        'text-[11px] font-sans truncate flex-1',
                        isActive
                          ? 'text-black dark:text-white font-medium'
                          : 'text-slate-500 dark:text-slate-400',
                      )}>
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span className={cn('text-[9px] font-sans tabular-nums', item.color || 'text-slate-400')}>
                          {item.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Sidebar footer: P/L summary */}
          <div className="mt-6 px-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-[9px] font-sans text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
              Portfolio
            </span>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans text-slate-400">Total P/L</span>
                <span className={cn('text-[10px] font-sans font-semibold tabular-nums', totalPnl >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400')}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans text-slate-400">Win Rate</span>
                <span className="text-[10px] font-sans font-semibold tabular-nums">
                  {closedTrades.length > 0
                    ? `${Math.round((closedTrades.filter((t) => t.status === 'TP_HIT').length / closedTrades.length) * 100)}%`
                    : '—'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans text-slate-400">Warnings</span>
                <span className={cn('text-[10px] font-sans font-semibold tabular-nums', warnings > 0 ? 'text-amber-500' : 'text-slate-400')}>
                  {warnings}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Content Panel */}
        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none lg:pl-4 py-1 pb-4">
          <ContentPanel
            activeSection={activeSection}
            trades={filtered}
            onSelectTrade={handleSelectFromOverview}
            selectedTradeId={activeSection !== 'overview' ? activeSection : null}
          />
        </main>
      </div>

      {/* Footer summary */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.06] shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex items-center justify-between text-[10px] font-sans text-slate-400">
          <span>
            {activeTrades.length} active &middot; {MOCK_TRADES.filter((t) => t.status === 'TP_HIT').length} TP &middot; {MOCK_TRADES.filter((t) => t.status === 'SL_HIT').length} SL
          </span>
          <span className="hidden sm:flex items-center gap-2">
            {warnings > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-3 h-3" />
                {warnings} flow warning{warnings > 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
