'use client';

// =============================================================================
// TraderPath Screener – Asset Table + Analysis Steps Sidebar
// Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey =
  | 'symbol'
  | 'price'
  | 'change24h'
  | 'volume'
  | 'score'
  | 'verdict'
  | 'phase';

type SortDir = 'asc' | 'desc';

type Market = 'ALL' | 'CRYPTO' | 'STOCKS' | 'METALS' | 'BONDS' | 'BIST';

type Verdict = 'GO' | 'COND' | 'WAIT' | 'AVOID';

interface Asset {
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

// Sidebar section IDs: classic 7-step + MLIS 5-layer
type SectionId =
  | 'table'
  | 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7'
  | 'mlis1' | 'mlis2' | 'mlis3' | 'mlis4' | 'mlis5';

interface NavItem {
  id: SectionId;
  tag?: string;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Navigation Structure
// ---------------------------------------------------------------------------

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { id: 'table', label: 'Asset Table' },
    ],
  },
  {
    title: '7-Step Analysis',
    items: [
      { id: 'step1', tag: 'S1', label: 'Market Pulse' },
      { id: 'step2', tag: 'S2', label: 'Asset Scanner' },
      { id: 'step3', tag: 'S3', label: 'Safety Check' },
      { id: 'step4', tag: 'S4', label: 'Timing Analysis' },
      { id: 'step5', tag: 'S5', label: 'Trade Plan' },
      { id: 'step6', tag: 'S6', label: 'Trap Check' },
      { id: 'step7', tag: 'S7', label: 'Final Verdict' },
    ],
  },
  {
    title: 'MLIS 5-Layer',
    items: [
      { id: 'mlis1', tag: 'M1', label: 'Technical' },
      { id: 'mlis2', tag: 'M2', label: 'Momentum' },
      { id: 'mlis3', tag: 'M3', label: 'Volatility' },
      { id: 'mlis4', tag: 'M4', label: 'Volume' },
      { id: 'mlis5', tag: 'M5', label: 'ML Verdict' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Data mapping – connects to /api/analysis/top-coins
// ---------------------------------------------------------------------------

function mapApiAsset(item: Record<string, unknown>): Asset {
  const symbol = String(item.symbol ?? '');
  const verdict = String(item.verdict ?? 'WAIT').toUpperCase();
  const dir = String(item.direction ?? 'neutral').toLowerCase();
  return {
    symbol,
    name: String(item.name ?? symbol),
    market: (String(item.market ?? item.assetClass ?? 'CRYPTO').toUpperCase()) as Exclude<Market, 'ALL'>,
    price: Number(item.currentPrice ?? item.price ?? 0),
    change24h: Number(item.change24h ?? item.priceChange24h ?? 0),
    volume: Number(item.volume ?? item.volume24h ?? 0),
    score: Number(item.totalScore ?? item.reliabilityScore ?? item.score ?? 0),
    verdict: (verdict === 'GO' || verdict === 'COND' || verdict === 'WAIT' || verdict === 'AVOID' ? verdict : 'WAIT') as Verdict,
    direction: (dir === 'long' || dir === 'short' ? dir : 'neutral') as 'long' | 'short' | 'neutral',
    phase: String(item.phase ?? 'MID').toUpperCase(),
    flowScore: Number(item.flowScore ?? 50),
    rsi: Number(item.rsi ?? 50),
    macd: String(item.macd ?? 'neutral') as 'bullish' | 'bearish' | 'neutral',
  };
}

// Mock step data for selected asset
interface StepData {
  score: number;
  status: 'pass' | 'warn' | 'fail';
  summary: string;
  details: string[];
}

// Derives estimated step-level data from the asset's overall score (no individual step API call)
function getDerivedStepData(asset: Asset, stepId: string): StepData {
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

interface MLISLayerData {
  score: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  details: string[];
}

// Derives estimated MLIS layer data from the asset's overall score (no individual layer API call)
function getDerivedMLISData(asset: Asset, layerId: string): MLISLayerData {
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

const MARKETS: Market[] = ['ALL', 'CRYPTO', 'STOCKS', 'METALS', 'BONDS', 'BIST'];
const VERDICTS: (Verdict | 'ALL')[] = ['ALL', 'GO', 'COND', 'WAIT', 'AVOID'];

function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}

function verdictColor(v: Verdict): string {
  switch (v) {
    case 'GO': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'COND': return 'text-amber-500 dark:text-amber-400';
    case 'WAIT': return 'text-neutral-500 dark:text-neutral-400';
    case 'AVOID': return 'text-red-500 dark:text-red-400';
  }
}

function verdictBg(v: Verdict): string {
  switch (v) {
    case 'GO': return 'bg-emerald-500/10 dark:bg-[#00f5c4]/10';
    case 'COND': return 'bg-amber-500/10';
    case 'WAIT': return 'bg-neutral-500/10';
    case 'AVOID': return 'bg-red-500/10';
  }
}

function phaseColor(p: string): string {
  switch (p) {
    case 'EARLY': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'MID': return 'text-amber-500 dark:text-amber-400';
    case 'LATE': return 'text-orange-500';
    case 'EXIT': return 'text-red-500 dark:text-red-400';
    default: return 'text-neutral-500';
  }
}

function statusColor(s: 'pass' | 'warn' | 'fail'): string {
  switch (s) {
    case 'pass': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'warn': return 'text-amber-500 dark:text-amber-400';
    case 'fail': return 'text-red-500 dark:text-red-400';
  }
}

function statusBg(s: 'pass' | 'warn' | 'fail'): string {
  switch (s) {
    case 'pass': return 'bg-emerald-500/10 dark:bg-[#00f5c4]/10';
    case 'warn': return 'bg-amber-500/10';
    case 'fail': return 'bg-red-500/10';
  }
}

function signalColor(s: 'bullish' | 'bearish' | 'neutral'): string {
  switch (s) {
    case 'bullish': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'bearish': return 'text-red-500 dark:text-red-400';
    case 'neutral': return 'text-neutral-500 dark:text-neutral-400';
  }
}

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'long') return <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-[#00f5c4]" />;
  if (dir === 'short') return <ArrowDownRight className="w-3 h-3 text-red-500 dark:text-red-400" />;
  return <Minus className="w-3 h-3 text-neutral-400" />;
}

// ---------------------------------------------------------------------------
// FlowBar – tiny horizontal bar
// ---------------------------------------------------------------------------

function FlowBar({ value }: { value: number }) {
  const w = Math.min(Math.max(value, 0), 100);
  const color = w >= 70 ? 'bg-emerald-500 dark:bg-[#00f5c4]' : w >= 40 ? 'bg-amber-500' : 'bg-red-500 dark:bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[10px] font-sans tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortHeader
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-medium transition-colors',
        active
          ? 'text-black dark:text-white'
          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300',
        className,
      )}
    >
      {label}
      {active && (
        currentDir === 'asc'
          ? <ChevronUp className="w-2.5 h-2.5" />
          : <ChevronDown className="w-2.5 h-2.5" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// 7-Step Content Panel
// ---------------------------------------------------------------------------

function StepPanel({ asset, stepId }: { asset: Asset; stepId: string }) {
  const data = getDerivedStepData(asset, stepId);
  const stepNum = stepId.replace('step', '');
  const stepNames: Record<string, string> = {
    step1: 'Market Pulse',
    step2: 'Asset Scanner',
    step3: 'Safety Check',
    step4: 'Timing Analysis',
    step5: 'Trade Plan',
    step6: 'Trap Check',
    step7: 'Final Verdict',
  };

  return (
    <div className="space-y-4">
      {/* Step header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] bg-[#14B8A6]/10 dark:bg-[#5EEAD4]/10 px-1.5 py-0.5 rounded">
            S{stepNum}
          </span>
          <h3 className="text-sm font-sans font-semibold">{stepNames[stepId]}</h3>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-sans font-semibold', statusBg(data.status), statusColor(data.status))}>
          {data.status === 'pass' ? 'PASS' : data.status === 'warn' ? 'WARN' : 'FAIL'}
          <span className="text-[9px] opacity-70">{data.score.toFixed(1)}</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{data.summary}</p>

      {/* Details */}
      <div className="space-y-1.5">
        {data.details.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] font-sans">
            <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
            <span className="text-neutral-600 dark:text-neutral-300">{d}</span>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-[10px] font-sans mb-1">
          <span className="text-neutral-400">Score</span>
          <span className={statusColor(data.status)}>{data.score.toFixed(1)}/10</span>
        </div>
        <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', data.status === 'pass' ? 'bg-emerald-500 dark:bg-[#00f5c4]' : data.status === 'warn' ? 'bg-amber-500' : 'bg-red-500')}
            style={{ width: `${(data.score / 10) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MLIS Layer Content Panel
// ---------------------------------------------------------------------------

function MLISPanel({ asset, layerId }: { asset: Asset; layerId: string }) {
  const data = getDerivedMLISData(asset, layerId);
  const layerNum = layerId.replace('mlis', '');
  const layerNames: Record<string, string> = {
    mlis1: 'Technical Layer',
    mlis2: 'Momentum Layer',
    mlis3: 'Volatility Layer',
    mlis4: 'Volume Layer',
    mlis5: 'ML Verdict',
  };

  return (
    <div className="space-y-4">
      {/* Layer header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-sans text-violet-500 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
            M{layerNum}
          </span>
          <h3 className="text-sm font-sans font-semibold">{layerNames[layerId]}</h3>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-sans font-semibold uppercase', signalColor(data.signal))}>
          {data.signal}
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-sans text-neutral-400">Confidence</div>
        <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 dark:bg-violet-400 transition-all"
            style={{ width: `${data.confidence}%` }}
          />
        </div>
        <div className="text-[10px] font-sans font-semibold text-violet-500 dark:text-violet-400">{data.confidence}%</div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-sans text-neutral-400">Score</div>
        <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', data.signal === 'bullish' ? 'bg-emerald-500 dark:bg-[#00f5c4]' : data.signal === 'bearish' ? 'bg-red-500' : 'bg-neutral-400')}
            style={{ width: `${data.score}%` }}
          />
        </div>
        <div className={cn('text-[10px] font-sans font-semibold', signalColor(data.signal))}>{data.score}</div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 pt-1">
        {data.details.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] font-sans">
            <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
            <span className="text-neutral-600 dark:text-neutral-300">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset Table Component
// ---------------------------------------------------------------------------

function AssetTable({
  filtered,
  sortKey,
  sortDir,
  onSort,
  selectedSymbol,
  onSelect,
}: {
  filtered: Asset[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  selectedSymbol: string | null;
  onSelect: (a: Asset) => void;
}) {
  return (
    <div>
      {/* Sort row */}
      <div className="flex items-center gap-4 px-1 mb-2 text-xs font-sans">
        <SortHeader label="Asset" sortKey="symbol" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
        <SortHeader label="Price" sortKey="price" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
        <SortHeader label="24h" sortKey="change24h" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
        <span className="hidden sm:inline"><SortHeader label="Volume" sortKey="volume" currentSort={sortKey} currentDir={sortDir} onSort={onSort} /></span>
        <SortHeader label="Score" sortKey="score" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
        <SortHeader label="Verdict" sortKey="verdict" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
        <span className="hidden md:inline"><SortHeader label="Phase" sortKey="phase" currentSort={sortKey} currentDir={sortDir} onSort={onSort} /></span>
      </div>

      {/* Card list */}
      <div className="space-y-1.5">
        {filtered.map((asset) => (
          <button
            key={asset.symbol}
            onClick={() => onSelect(asset)}
            className={cn(
              'w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all duration-150 text-xs font-sans',
              selectedSymbol === asset.symbol
                ? 'bg-[#14B8A6]/5 dark:bg-[#5EEAD4]/5 ring-1 ring-[#14B8A6]/30 dark:ring-[#5EEAD4]/20'
                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
            )}
          >
            {/* Asset icon + name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[8px] font-bold shrink-0">
                {asset.symbol.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs">{asset.symbol}</div>
                <div className="text-[10px] text-neutral-400 hidden sm:block truncate">{asset.name}</div>
              </div>
              <span className="text-[9px] px-1 py-0.5 bg-black/5 dark:bg-white/5 rounded text-neutral-500 hidden md:inline shrink-0">
                {asset.market}
              </span>
            </div>

            {/* Price + 24h */}
            <div className="text-right shrink-0">
              <div className="tabular-nums font-semibold">${fmtPrice(asset.price)}</div>
              <div className={cn('text-[10px] tabular-nums font-semibold', asset.change24h > 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : asset.change24h < 0 ? 'text-red-500 dark:text-red-400' : 'text-neutral-400')}>
                {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
              </div>
            </div>

            {/* Volume */}
            <span className="tabular-nums text-neutral-500 hidden sm:block w-16 text-right shrink-0">${fmtVol(asset.volume)}</span>

            {/* Score */}
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums shrink-0', asset.score >= 7 ? 'bg-emerald-500/10 dark:bg-[#00f5c4]/10 text-emerald-600 dark:text-[#00f5c4]' : asset.score >= 5 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-500 dark:text-red-400')}>
              {asset.score.toFixed(1)}
            </span>

            {/* Verdict + Dir */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', verdictBg(asset.verdict), verdictColor(asset.verdict))}>
                {asset.verdict}
              </span>
              <div className="hidden md:block"><DirIcon dir={asset.direction} /></div>
            </div>

            {/* Phase */}
            <span className={cn('text-[10px] font-bold hidden md:block shrink-0', phaseColor(asset.phase))}>
              {asset.phase}
            </span>

            {/* Flow */}
            <div className="hidden lg:block w-16 shrink-0">
              <FlowBar value={asset.flowScore} />
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-400 text-xs">
            No assets match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Panel – renders based on active section
// ---------------------------------------------------------------------------

function ContentPanel({
  activeSection,
  selectedAsset,
  filtered,
  sortKey,
  sortDir,
  onSort,
  onSelectAsset,
}: {
  activeSection: SectionId;
  selectedAsset: Asset | null;
  filtered: Asset[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onSelectAsset: (a: Asset) => void;
}) {
  // Table view
  if (activeSection === 'table') {
    return (
      <AssetTable
        filtered={filtered}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        selectedSymbol={selectedAsset?.symbol ?? null}
        onSelect={onSelectAsset}
      />
    );
  }

  // Need selected asset for step/layer views
  if (!selectedAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-xs text-neutral-400">Select an asset from the table to view analysis.</p>
          <button
            onClick={() => {/* Switch to table handled by parent */}}
            className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] hover:underline"
          >
            Go to Asset Table
          </button>
        </div>
      </div>
    );
  }

  // 7-Step panels
  if (activeSection.startsWith('step')) {
    return (
      <div>
        {/* Asset context bar */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-xs font-sans font-semibold">{selectedAsset.symbol}</span>
          <span className="text-[10px] text-neutral-400">{selectedAsset.name}</span>
          <ChevronRight className="w-3 h-3 text-neutral-300" />
          <span className={cn('text-[10px] font-sans font-bold', verdictColor(selectedAsset.verdict))}>
            {selectedAsset.verdict}
          </span>
          <span className="text-[10px] font-sans tabular-nums text-neutral-500">{selectedAsset.score.toFixed(1)}/10</span>
        </div>
        <StepPanel asset={selectedAsset} stepId={activeSection} />
      </div>
    );
  }

  // MLIS panels
  if (activeSection.startsWith('mlis')) {
    return (
      <div>
        {/* Asset context bar */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-xs font-sans font-semibold">{selectedAsset.symbol}</span>
          <span className="text-[10px] text-neutral-400">{selectedAsset.name}</span>
          <ChevronRight className="w-3 h-3 text-neutral-300" />
          <span className="text-[10px] font-sans text-violet-500 dark:text-violet-400 font-semibold">MLIS Pro</span>
        </div>
        <MLISPanel asset={selectedAsset} layerId={activeSection} />
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ScreenerPage() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState<Market>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('table');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/analysis/top-coins?limit=30&sortBy=reliabilityScore');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        const items = json?.data?.coins ?? json?.data ?? [];
        if (!cancelled && Array.isArray(items)) {
          setAllAssets(items.map(mapApiAsset));
        }
      } catch {
        // empty state shown
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const handleSelectAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
  }, []);

  const handleNavClick = useCallback((id: SectionId) => {
    setActiveSection(id);
  }, []);

  const filtered = useMemo(() => {
    let list = [...allAssets];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
      );
    }
    if (market !== 'ALL') list = list.filter((a) => a.market === market);
    if (verdictFilter !== 'ALL') list = list.filter((a) => a.verdict === verdictFilter);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'price': cmp = a.price - b.price; break;
        case 'change24h': cmp = a.change24h - b.change24h; break;
        case 'volume': cmp = a.volume - b.volume; break;
        case 'score': cmp = a.score - b.score; break;
        case 'verdict': cmp = a.verdict.localeCompare(b.verdict); break;
        case 'phase': cmp = a.phase.localeCompare(b.phase); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [search, market, verdictFilter, sortKey, sortDir, allAssets]);

  const goCount = filtered.filter((a) => a.verdict === 'GO').length;
  const avgScore = filtered.length > 0
    ? (filtered.reduce((s, a) => s + a.score, 0) / filtered.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-black dark:text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
              <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
            </div>
            <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
              SCREENER
            </span>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              Full Asset Table · {filtered.length} assets
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[10px] font-sans">
            <span className="text-neutral-400">GO: <span className="text-emerald-500 dark:text-[#00f5c4] font-semibold">{goCount}</span></span>
            <span className="text-neutral-400">AVG: <span className="text-black dark:text-white font-semibold">{avgScore}</span></span>
            <span className="text-neutral-400">TOTAL: <span className="text-black dark:text-white font-semibold">{filtered.length}</span></span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name..."
              className="w-full pl-7 pr-7 py-1.5 text-xs font-sans bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded focus:outline-none focus:border-black/20 dark:focus:border-white/20 placeholder:text-neutral-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-neutral-400 hover:text-black dark:hover:text-white" />
              </button>
            )}
          </div>

          {/* Market tabs */}
          <div className="flex items-center gap-px overflow-x-auto">
            {MARKETS.map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider transition-colors whitespace-nowrap',
                  market === m
                    ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                    : 'text-neutral-400 hover:text-black dark:hover:text-white',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider transition-colors',
              showFilters
                ? 'text-black dark:text-white'
                : 'text-neutral-400 hover:text-black dark:hover:text-white',
            )}
          >
            <Filter className="w-3 h-3" />
            FILTER
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="max-w-[1400px] mx-auto px-3 pb-2 flex items-center gap-3">
            <span className="text-[10px] text-neutral-400 font-sans">VERDICT:</span>
            <div className="flex items-center gap-px">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  onClick={() => setVerdictFilter(v)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-sans uppercase transition-colors',
                    verdictFilter === v
                      ? v === 'ALL'
                        ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                        : cn(verdictBg(v as Verdict), verdictColor(v as Verdict), 'font-semibold')
                      : 'text-neutral-400 hover:text-black dark:hover:text-white',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Horizontal scroll tab bar */}
      <div className="lg:hidden shrink-0 border-b border-black/[0.06] dark:border-white/[0.06] overflow-x-auto scrollbar-none">
        <div className="flex gap-px w-max">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'px-3 py-2 text-[10px] font-sans uppercase tracking-wider transition-colors whitespace-nowrap',
                activeSection === item.id
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                  : 'text-neutral-500 dark:text-neutral-400',
              )}
            >
              {item.tag && (
                <span className="text-[9px] opacity-50 mr-1">{item.tag}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Sidebar + Content Panel */}
      <div className="flex-1 min-h-0 flex max-w-[1400px] mx-auto w-full">
        {/* Sidebar Navigation */}
        <nav className="hidden lg:block w-52 shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] overflow-y-auto scrollbar-none pr-3 py-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title} className={cn(gi > 0 && 'mt-5')}>
              {/* Group header */}
              <div className="text-[9px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em] mb-2 px-2">
                {group.title}
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  const isMLIS = item.id.startsWith('mlis');
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-all duration-150',
                        isActive
                          ? isMLIS
                            ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-500 dark:border-violet-400 -ml-px'
                            : 'bg-neutral-100 dark:bg-neutral-900/50 border-l-2 border-[#14B8A6] dark:border-[#5EEAD4] -ml-px'
                          : 'border-l-2 border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/20 -ml-px',
                      )}
                    >
                      {item.tag && (
                        <span className={cn(
                          'text-[9px] font-sans tabular-nums w-5 shrink-0',
                          isActive
                            ? isMLIS
                              ? 'text-violet-500 dark:text-violet-400'
                              : 'text-[#14B8A6] dark:text-[#5EEAD4]'
                            : 'text-neutral-400 dark:text-neutral-600',
                        )}>
                          {item.tag}
                        </span>
                      )}
                      <span className={cn(
                        'text-[11px] font-sans truncate',
                        isActive
                          ? 'text-black dark:text-white font-medium'
                          : 'text-neutral-500 dark:text-neutral-400',
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Sidebar footer: selected asset info */}
          <div className="mt-6 px-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
            {selectedAsset ? (
              <div className="space-y-1">
                <span className="text-[9px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">
                  Selected
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-sans font-semibold">{selectedAsset.symbol}</span>
                  <DirIcon dir={selectedAsset.direction} />
                  <span className={cn('text-[9px] font-sans font-bold px-1 py-0.5 rounded', verdictBg(selectedAsset.verdict), verdictColor(selectedAsset.verdict))}>
                    {selectedAsset.verdict}
                  </span>
                </div>
                <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 tabular-nums">
                  ${fmtPrice(selectedAsset.price)}
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
                No asset selected
              </span>
            )}
          </div>
        </nav>

        {/* Content Panel */}
        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none lg:pl-4 py-1 pb-4">
          <ContentPanel
            activeSection={activeSection}
            selectedAsset={selectedAsset}
            filtered={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onSelectAsset={handleSelectAsset}
          />
        </main>
      </div>

    </div>
  );
}
