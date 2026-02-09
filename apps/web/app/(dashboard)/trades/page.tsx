'use client';

// =============================================================================
// TraderPath Trades – Active Position Monitor
// Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Target,
  Shield,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TradeStatus = 'ACTIVE' | 'TP_HIT' | 'SL_HIT' | 'CLOSED';

interface TradePlan {
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  currentPrice: number;
  direction: 'long' | 'short';
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

type StatusFilter = 'ALL' | TradeStatus;
const STATUSES: StatusFilter[] = ['ALL', 'ACTIVE', 'TP_HIT', 'SL_HIT', 'CLOSED'];

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
// Progress bar for TP progress
// ---------------------------------------------------------------------------

function TPProgress({ trade }: { trade: Trade }) {
  const { entry, currentPrice, stopLoss, tp1, direction } = trade;
  // Normalize: 0% = entry, 100% = tp1, negative = towards SL
  const range = direction === 'long' ? tp1 - entry : entry - tp1;
  const current = direction === 'long' ? currentPrice - entry : entry - currentPrice;
  const pct = range !== 0 ? Math.min(Math.max((current / range) * 100, -50), 120) : 0;
  const slRange = direction === 'long' ? entry - stopLoss : stopLoss - entry;
  const slPct = range !== 0 ? -(slRange / range) * 100 : 0;

  return (
    <div className="w-full">
      <div className="relative h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-visible">
        {/* SL zone */}
        <div
          className="absolute top-0 h-full bg-red-500/20 rounded-l-full"
          style={{ left: `${Math.max(slPct, -50)}%`, width: `${Math.abs(Math.max(slPct, -50))}%` }}
        />
        {/* Progress */}
        <div
          className={cn(
            'absolute top-0 left-0 h-full rounded-full transition-all duration-500',
            pct >= 0 ? 'bg-emerald-500 dark:bg-[#00f5c4]' : 'bg-red-500 dark:bg-red-400',
          )}
          style={{ width: `${Math.abs(Math.min(pct, 100))}%`, left: pct < 0 ? `${pct}%` : 0 }}
        />
        {/* TP1 marker */}
        <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-emerald-500 dark:bg-[#00f5c4]" style={{ left: '100%' }} />
      </div>
      <div className="flex justify-between mt-0.5 text-[9px] font-mono text-slate-400">
        <span>SL ${fmtPrice(stopLoss)}</span>
        <span>Entry ${fmtPrice(entry)}</span>
        <span>TP1 ${fmtPrice(tp1)}</span>
      </div>
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
        <span className="text-[9px] text-slate-400 font-mono">FLOW</span>
        <span className={cn('text-[9px] font-bold font-mono', color)}>{label}</span>
      </div>
      <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded Trade Detail
// ---------------------------------------------------------------------------

function TradeDetail({ trade }: { trade: Trade }) {
  const levels = [
    { label: 'ENTRY', value: trade.entry, icon: <Target className="w-3 h-3" />, color: 'text-blue-500' },
    { label: 'STOP LOSS', value: trade.stopLoss, icon: <Shield className="w-3 h-3" />, color: 'text-red-500 dark:text-red-400' },
    { label: 'TP1', value: trade.tp1, icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-500 dark:text-[#00f5c4]' },
    { label: 'TP2', value: trade.tp2, icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-400 dark:text-emerald-300' },
  ];

  return (
    <div className="px-3 py-3 border-t border-black/[0.03] dark:border-white/[0.03] bg-black/[0.01] dark:bg-white/[0.01]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {levels.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={l.color}>{l.icon}</span>
            <div>
              <div className="text-[9px] text-slate-400 font-mono">{l.label}</div>
              <div className="text-xs font-mono font-semibold tabular-nums">${fmtPrice(l.value)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <TPProgress trade={trade} />
      </div>

      <div className="mt-3">
        <FlowHealth value={trade.flowHealth} signal={trade.flowSignal} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[9px] text-slate-400 font-mono">R:R</div>
          <div className="text-xs font-mono font-semibold tabular-nums">{trade.rr.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400 font-mono">SCORE</div>
          <div className="text-xs font-mono font-semibold tabular-nums">{trade.score.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400 font-mono">METHOD</div>
          <div className="text-xs font-mono font-semibold uppercase">{trade.method}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TradesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return MOCK_TRADES;
    return MOCK_TRADES.filter((t) => t.status === statusFilter);
  }, [statusFilter]);

  const activeTrades = MOCK_TRADES.filter((t) => t.status === 'ACTIVE');
  const totalPnl = activeTrades.reduce((s, t) => s + t.pnlPercent, 0);
  const warnings = activeTrades.filter((t) => t.flowSignal === 'close' || t.flowSignal === 'tighten').length;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-mono font-semibold tracking-tight">TRADES</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                Active Position Monitor &middot; {activeTrades.length} open
              </p>
            </div>

            {/* Summary badges */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[9px] text-slate-400 font-mono">TOTAL P/L</div>
                <div className={cn(
                  'text-sm font-mono font-bold tabular-nums',
                  totalPnl >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400',
                )}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}%
                </div>
              </div>
              {warnings > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-500">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-mono font-bold">{warnings}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-3 py-2 flex items-center gap-px overflow-x-auto">
          {STATUSES.map((s) => {
            const count = s === 'ALL'
              ? MOCK_TRADES.length
              : MOCK_TRADES.filter((t) => t.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1',
                  statusFilter === s
                    ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                    : 'text-slate-400 hover:text-black dark:hover:text-white',
                )}
              >
                {s.replace('_', ' ')}
                <span className="text-[9px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trade list */}
      <div className="max-w-[1200px] mx-auto">
        {filtered.map((trade) => {
          const isExpanded = expanded === trade.id;
          const { label: flowLabel, color: flowColor } = flowSignalLabel(trade.flowSignal);

          return (
            <div key={trade.id} className="border-b border-black/[0.03] dark:border-white/[0.03]">
              <button
                onClick={() => setExpanded(isExpanded ? null : trade.id)}
                className="w-full px-3 py-3 flex items-center gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                {/* Status + Direction */}
                <div className="flex flex-col items-center gap-0.5 w-8">
                  <StatusIcon status={trade.status} />
                  {trade.direction === 'long'
                    ? <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-[#00f5c4]" />
                    : <ArrowDownRight className="w-3 h-3 text-red-500 dark:text-red-400" />
                  }
                </div>

                {/* Symbol */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-xs">{trade.symbol}</span>
                    <span className={cn('text-[9px] font-bold uppercase px-1 py-0.5 rounded', statusBg(trade.status), statusColor(trade.status))}>
                      {trade.status.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">{trade.market}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>{trade.duration}</span>
                    <span className="hidden sm:inline">&middot; Entry ${fmtPrice(trade.entry)}</span>
                    <span className="hidden sm:inline">&middot; Now ${fmtPrice(trade.currentPrice)}</span>
                  </div>
                </div>

                {/* P/L */}
                <div className="text-right">
                  <div className={cn(
                    'text-xs font-mono font-bold tabular-nums',
                    trade.pnlPercent >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400',
                  )}>
                    {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                  </div>
                  <div className={cn('text-[10px] font-mono tabular-nums', trade.pnl >= 0 ? 'text-emerald-500/60' : 'text-red-500/60')}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl >= 1 ? `$${fmtPrice(trade.pnl)}` : `${trade.pnl.toFixed(4)}`}
                  </div>
                </div>

                {/* Flow signal */}
                <div className="hidden sm:block w-16 text-right">
                  <span className={cn('text-[9px] font-bold font-mono', flowColor)}>{flowLabel}</span>
                </div>

                {/* Expand */}
                <div className="text-slate-400">
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && <TradeDetail trade={trade} />}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-xs font-mono">
            No trades match this filter.
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-3 py-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
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
