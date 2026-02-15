'use client';

// =============================================================================
// TraderPath Hyper-Minimalist Financial Intelligence Terminal
// Interactive Sidebar + Content Panel — 2026 Design
// =============================================================================

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  Eye,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  CandlestickData,
  Time,
} from 'lightweight-charts';
import { cn, formatNumber, formatPrice, formatPriceValue } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MacroMetric {
  label: string;
  value: string;
  delta?: number;
  signal?: 'bullish' | 'bearish' | 'neutral';
}

interface MarketFlow {
  market: string;
  flow7d: number;
  flow30d: number;
  velocity: number;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
}

interface SectorData {
  name: string;
  flow: number;
  dominance: number;
  trending: 'up' | 'down' | 'flat';
}

interface ScreenerAsset {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  aiScore: number;
  trend: 'STRONG_UP' | 'UP' | 'FLAT' | 'DOWN' | 'STRONG_DOWN';
  verdict: 'GO' | 'COND' | 'WAIT' | 'AVOID';
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  market: string;
}

interface DecisionGate {
  label: string;
  passed: boolean;
  detail: string;
}

interface VerdictOpportunity {
  action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
  market: string;
  confidence: number;
  reason: string;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  suggestedAssets: string[];
}

interface VerdictData {
  gates: DecisionGate[];
  buy: VerdictOpportunity | null;
  sell: VerdictOpportunity | null;
  regime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
  timestamp: string;
}

interface TradePlan {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  rr: number;
  direction: 'LONG' | 'SHORT';
}

type SortKey = 'rank' | 'symbol' | 'price' | 'change24h' | 'volume' | 'aiScore' | 'trend';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type SectionId = 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'l7';

interface NavItem {
  id: SectionId;
  label: string;
  tag?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Capital Flow',
    items: [
      { id: 'l1', label: 'Global Liquidity', tag: 'L1' },
      { id: 'l2', label: 'Market Flow', tag: 'L2' },
      { id: 'l3', label: 'Sector Activity', tag: 'L3' },
      { id: 'l4', label: 'Verdict Engine', tag: 'L4' },
    ],
  },
  {
    title: 'Asset Analysis',
    items: [
      { id: 'l5', label: 'Asset Screener', tag: 'L5' },
      { id: 'l7', label: 'Trade Visualizer', tag: 'L7' },
    ],
  },
];

// ---------------------------------------------------------------------------
// API Data Mapping — Capital Flow + Top Coins
// ---------------------------------------------------------------------------

function mapMacroMetrics(gl: Record<string, any> | null | undefined): MacroMetric[] {
  if (!gl) return [];
  const metrics: MacroMetric[] = [];
  if (gl.m2MoneySupply) {
    const val = Number(gl.m2MoneySupply.value ?? 0);
    const growth = Number(gl.m2MoneySupply.yoyGrowth ?? 0);
    metrics.push({
      label: 'M2 Supply',
      value: val > 0 ? `$${(val / 1e12).toFixed(1)}T` : 'N/A',
      delta: growth,
      signal: growth > 0 ? 'bullish' : 'bearish',
    });
  }
  if (gl.fedBalanceSheet) {
    const val = Number(gl.fedBalanceSheet.value ?? 0);
    const change = Number(gl.fedBalanceSheet.monthlyChange ?? 0);
    metrics.push({
      label: 'Fed BS',
      value: val > 0 ? `$${(val / 1e12).toFixed(1)}T` : 'N/A',
      delta: change,
      signal: change > 0 ? 'bullish' : change < -2 ? 'bearish' : 'neutral',
    });
  }
  if (gl.dxy) {
    const val = Number(gl.dxy.value ?? 0);
    const change = Number(gl.dxy.weeklyChange ?? 0);
    metrics.push({
      label: 'DXY',
      value: val > 0 ? val.toFixed(2) : 'N/A',
      delta: change,
      signal: change < 0 ? 'bullish' : 'bearish', // DXY down = bullish for risk
    });
  }
  if (gl.vix) {
    const val = Number(gl.vix.value ?? 0);
    const change = Number(gl.vix.weeklyChange ?? 0);
    metrics.push({
      label: 'VIX',
      value: val > 0 ? val.toFixed(1) : 'N/A',
      delta: change,
      signal: val < 20 ? 'bullish' : val > 30 ? 'bearish' : 'neutral',
    });
  }
  if (gl.yieldCurve) {
    const us10y = Number(gl.yieldCurve.us10y ?? 0);
    const spread = Number(gl.yieldCurve.spread10y2y ?? 0);
    metrics.push({
      label: 'US10Y',
      value: us10y > 0 ? `${us10y.toFixed(2)}%` : 'N/A',
      delta: Number(gl.yieldCurve.weeklyChange10y ?? 0),
      signal: 'neutral',
    });
    metrics.push({
      label: 'Yield Curve',
      value: spread > 0 ? `+${spread.toFixed(2)}` : spread.toFixed(2),
      delta: Number(gl.yieldCurve.weeklyChangeSpread ?? 0),
      signal: spread > 0 ? 'bullish' : 'bearish',
    });
  }
  return metrics;
}

function mapMarketFlows(markets: any[] | null | undefined): MarketFlow[] {
  if (!Array.isArray(markets)) return [];
  return markets.filter(m => m && m.market).map(m => ({
    market: String(m.market || '').charAt(0).toUpperCase() + String(m.market || '').slice(1).toLowerCase(),
    flow7d: Number(m.flow7d ?? 0),
    flow30d: Number(m.flow30d ?? 0),
    velocity: Number(m.flowVelocity ?? 0),
    phase: String(m.phase ?? 'MID').toUpperCase() as 'EARLY' | 'MID' | 'LATE' | 'EXIT',
  }));
}

function mapSectors(markets: any[] | null | undefined): SectorData[] {
  if (!Array.isArray(markets)) return [];
  const sectors: SectorData[] = [];
  for (const m of markets) {
    if (!m || !Array.isArray(m.sectors)) continue;
    for (const s of m.sectors) {
      if (!s) continue;
      const flow = Number(s.flow ?? s.weeklyFlow ?? 0);
      sectors.push({
        name: String(s.name ?? ''),
        flow,
        dominance: Number(s.dominance ?? 0),
        trending: flow > 1 ? 'up' : flow < -1 ? 'down' : 'flat',
      });
    }
  }
  return sectors.sort((a, b) => b.flow - a.flow);
}

function mapScreenerAssets(items: any[] | null | undefined): ScreenerAsset[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => {
    const symbol = String(item.symbol ?? '');
    const verdict = String(item.verdict ?? 'WAIT').toUpperCase();
    const dir = String(item.direction ?? 'NEUTRAL').toUpperCase();
    const score = Number(item.totalScore ?? item.reliabilityScore ?? item.score ?? 0);
    const change = Number(item.change24h ?? item.priceChange24h ?? 0);
    let trend: ScreenerAsset['trend'] = 'FLAT';
    if (change > 5) trend = 'STRONG_UP';
    else if (change > 1) trend = 'UP';
    else if (change < -5) trend = 'STRONG_DOWN';
    else if (change < -1) trend = 'DOWN';
    return {
      rank: idx + 1,
      symbol,
      name: String(item.name ?? symbol),
      price: Number(item.currentPrice ?? item.price ?? 0),
      change24h: change,
      volume: Number(item.volume ?? item.volume24h ?? 0),
      aiScore: Math.round(score * 10),
      trend,
      verdict: (['GO', 'COND', 'WAIT', 'AVOID'].includes(verdict) ? verdict : 'WAIT') as ScreenerAsset['verdict'],
      direction: (['LONG', 'SHORT', 'NEUTRAL'].includes(dir) ? dir : 'NEUTRAL') as ScreenerAsset['direction'],
      market: String(item.market ?? item.assetClass ?? 'Crypto'),
    };
  });
}

function mapVerdictData(data: Record<string, any> | null | undefined): VerdictData {
  if (!data) return { gates: [], buy: null, sell: null, regime: 'NEUTRAL', timestamp: '--:--' };
  const bias = String(data.liquidityBias ?? 'neutral').toLowerCase();
  const rec = data.recommendation as Record<string, any> | undefined;
  const sellRec = data.sellRecommendation as Record<string, any> | undefined;
  const gl = data.globalLiquidity as Record<string, any> | undefined;

  const gates: DecisionGate[] = [
    {
      label: 'Liquidity Expanding',
      passed: bias === 'risk_on',
      detail: data.insights?.ragLayer1 || `Liquidity bias: ${bias.replace('_', ' ')}`,
    },
    {
      label: 'USD Weakening',
      passed: Number(gl?.dxy?.weeklyChange ?? 0) < 0,
      detail: `DXY ${Number(gl?.dxy?.value ?? 0).toFixed(2)} (${Number(gl?.dxy?.weeklyChange ?? 0).toFixed(1)}% weekly)`,
    },
    {
      label: 'Capital Destination',
      passed: !!rec?.primaryMarket,
      detail: rec ? `${rec.primaryMarket} leads (${String(rec.phase ?? '').toUpperCase()} phase)` : 'No clear destination',
    },
    {
      label: 'Sector Confirmed',
      passed: Array.isArray(rec?.sectors) && rec.sectors.length > 0,
      detail: data.insights?.ragLayer3 || 'Sector activity assessment',
    },
    {
      label: 'Phase Timing',
      passed: String(rec?.phase ?? '').toLowerCase() === 'early' || String(rec?.phase ?? '').toLowerCase() === 'mid',
      detail: rec ? `${String(rec.phase ?? '').toUpperCase()} phase` : 'Unknown phase',
    },
  ];

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  let buy: VerdictOpportunity | null = null;
  if (rec && String(rec.direction ?? '').toLowerCase() === 'buy') {
    buy = {
      action: 'BUY',
      market: capitalize(String(rec.primaryMarket ?? '')),
      confidence: Number(rec.confidence ?? 0),
      reason: String(rec.reason ?? ''),
      phase: String(rec.phase ?? 'MID').toUpperCase() as VerdictOpportunity['phase'],
      suggestedAssets: Array.isArray(rec.suggestedAssets)
        ? rec.suggestedAssets.map((a: any) => String(typeof a === 'string' ? a : a?.symbol ?? a))
        : [],
    };
  }

  let sell: VerdictOpportunity | null = null;
  if (sellRec && String(sellRec.direction ?? '').toLowerCase() === 'sell') {
    sell = {
      action: 'SELL',
      market: capitalize(String(sellRec.primaryMarket ?? '')),
      confidence: Number(sellRec.confidence ?? 0),
      reason: String(sellRec.reason ?? ''),
      phase: String(sellRec.phase ?? 'EXIT').toUpperCase() as VerdictOpportunity['phase'],
      suggestedAssets: Array.isArray(sellRec.suggestedAssets)
        ? sellRec.suggestedAssets.map((a: any) => String(typeof a === 'string' ? a : a?.symbol ?? a))
        : [],
    };
  }

  return {
    gates,
    buy,
    sell,
    regime: bias === 'risk_on' ? 'RISK_ON' : bias === 'risk_off' ? 'RISK_OFF' : 'NEUTRAL',
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

// Derives quick trade plan levels from asset price + direction (no API call)
function calculateTradePlan(asset: ScreenerAsset): TradePlan {
  const isLong = asset.direction === 'LONG';
  const entry = asset.price;
  const slPct = 0.035;
  const tp1Pct = 0.05;
  const tp2Pct = 0.10;

  return {
    entry,
    sl: isLong ? entry * (1 - slPct) : entry * (1 + slPct),
    tp1: isLong ? entry * (1 + tp1Pct) : entry * (1 - tp1Pct),
    tp2: isLong ? entry * (1 + tp2Pct) : entry * (1 - tp2Pct),
    rr: tp1Pct / slPct,
    direction: isLong ? 'LONG' : 'SHORT',
  };
}

// ---------------------------------------------------------------------------
// Shared Tiny Components
// ---------------------------------------------------------------------------

function Delta({ value, className }: { value: number; className?: string }) {
  const color = value > 0
    ? 'text-[#22C55E] dark:text-[#4ADE80]'
    : value < 0
    ? 'text-[#EF4444] dark:text-[#F87171]'
    : 'text-neutral-500 dark:text-neutral-400';
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-sans text-xs', color, className)}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function SignalDot({ signal }: { signal?: 'bullish' | 'bearish' | 'neutral' }) {
  const bg =
    signal === 'bullish'
      ? 'bg-[#22C55E] dark:bg-[#4ADE80]'
      : signal === 'bearish'
      ? 'bg-[#EF4444] dark:bg-[#F87171]'
      : 'bg-neutral-400 dark:bg-neutral-500';
  return <span className={cn('inline-block w-1.5 h-1.5 rounded-full', bg)} />;
}

function PhaseBadge({ phase }: { phase: string }) {
  const styles: Record<string, string> = {
    EARLY: 'text-[#22C55E] dark:text-[#4ADE80] border-[#22C55E]/20 dark:border-[#4ADE80]/20',
    MID: 'text-[#F59E0B] dark:text-[#FBBF24] border-[#F59E0B]/20 dark:border-[#FBBF24]/20',
    LATE: 'text-[#F97316] dark:text-[#FB923C] border-[#F97316]/20 dark:border-[#FB923C]/20',
    EXIT: 'text-[#EF4444] dark:text-[#F87171] border-[#EF4444]/20 dark:border-[#F87171]/20',
  };
  return (
    <span className={cn(
      'px-1.5 py-0.5 text-[10px] font-sans uppercase tracking-wider border rounded',
      styles[phase] || styles.MID,
    )}>
      {phase}
    </span>
  );
}

function VerdictBadgeSmall({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    GO: 'text-[#22C55E] dark:text-[#4ADE80]',
    COND: 'text-[#F59E0B] dark:text-[#FBBF24]',
    WAIT: 'text-[#F97316] dark:text-[#FB923C]',
    AVOID: 'text-[#EF4444] dark:text-[#F87171]',
  };
  return (
    <span className={cn('font-sans text-xs font-semibold', styles[verdict] || 'text-neutral-500')}>
      {verdict}
    </span>
  );
}

function DirectionTag({ direction }: { direction: string }) {
  if (direction === 'LONG') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[#22C55E] dark:text-[#4ADE80] text-xs font-sans">
        <ArrowUpRight className="w-3 h-3" /> L
      </span>
    );
  }
  if (direction === 'SHORT') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[#EF4444] dark:text-[#F87171] text-xs font-sans">
        <ArrowDownRight className="w-3 h-3" /> S
      </span>
    );
  }
  return <span className="text-neutral-400 dark:text-neutral-500 text-xs font-sans">—</span>;
}

function TrendIndicator({ trend }: { trend: string }) {
  const config: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
    STRONG_UP: { icon: TrendingUp, color: 'text-[#22C55E] dark:text-[#4ADE80]', label: '▲▲' },
    UP: { icon: TrendingUp, color: 'text-[#22C55E] dark:text-[#4ADE80]', label: '▲' },
    FLAT: { icon: Minus, color: 'text-neutral-400 dark:text-neutral-500', label: '—' },
    DOWN: { icon: TrendingDown, color: 'text-[#EF4444] dark:text-[#F87171]', label: '▼' },
    STRONG_DOWN: { icon: TrendingDown, color: 'text-[#EF4444] dark:text-[#F87171]', label: '▼▼' },
  };
  const c = config[trend] || config.FLAT;
  return <span className={cn('font-sans text-xs', c.color)}>{c.label}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const width = Math.min(score, 100);
  const color =
    score >= 80
      ? 'bg-[#22C55E] dark:bg-[#4ADE80]'
      : score >= 60
      ? 'bg-[#F59E0B] dark:bg-[#FBBF24]'
      : 'bg-[#EF4444] dark:bg-[#F87171]';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-[3px] bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-sans text-xs text-neutral-600 dark:text-neutral-300 w-6 text-right tabular-nums">
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionLabel({ label, layer, count }: { label: string; layer: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          {layer}
        </span>
        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
          {count}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// L1: Global Liquidity Macro Grid
// ---------------------------------------------------------------------------

function L1MacroGrid({ metrics, interpretation }: { metrics: MacroMetric[]; interpretation?: string }) {
  return (
    <section>
      <SectionLabel layer="L1" label="Global Liquidity" count={metrics.length} />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-neutral-950 p-2.5 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1">
              <SignalDot signal={m.signal} />
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider truncate">
                {m.label}
              </span>
            </div>
            <span className="text-sm font-sans font-semibold text-neutral-900 dark:text-white tabular-nums">
              {m.value}
            </span>
            {m.delta !== undefined && <Delta value={m.delta} />}
          </div>
        ))}
      </div>

      {/* Signal summary */}
      <div className="mt-3 border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
        <span className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest block mb-1.5">
          Interpretation
        </span>
        <p className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {interpretation || (metrics.length > 0 ? 'Global liquidity data loaded. Select a metric for details.' : 'Loading interpretation...')}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L2: Market Flow
// ---------------------------------------------------------------------------

function L2MarketFlow({ flows, interpretation }: { flows: MarketFlow[]; interpretation?: string }) {
  return (
    <section>
      <SectionLabel layer="L2" label="Market Flow" count={flows.length} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        {flows.map((f) => (
          <div
            key={f.market}
            className="bg-white dark:bg-neutral-950 p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-900 dark:text-white">
                {f.market}
              </span>
              <PhaseBadge phase={f.phase} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">
                {f.flow7d > 0 ? '+' : ''}{f.flow7d.toFixed(1)}%
              </span>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">7D</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              <span>30D: {f.flow30d > 0 ? '+' : ''}{f.flow30d.toFixed(1)}%</span>
              <span>v: {f.velocity > 0 ? '+' : ''}{f.velocity.toFixed(1)}</span>
            </div>
            {/* Flow bar */}
            <div className="h-[2px] bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  f.flow7d > 0 ? 'bg-[#22C55E] dark:bg-[#4ADE80]' : 'bg-[#EF4444] dark:bg-[#F87171]',
                )}
                style={{ width: `${Math.min(Math.abs(f.flow7d) * 8, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Rotation insight */}
      <div className="mt-3 border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
        <span className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest block mb-1.5">
          Rotation Signal
        </span>
        <p className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {interpretation || (flows.length > 0 ? 'Market flow data loaded. Review capital rotation signals above.' : 'Loading rotation signal...')}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L3: Sector Activity
// ---------------------------------------------------------------------------

function L3Sectors({ sectors }: { sectors: SectorData[] }) {
  return (
    <section>
      <SectionLabel layer="L3" label="Sector Activity" count={sectors.length} />
      <div className="space-y-1.5">
        {sectors.map((s) => (
          <div key={s.name} className="rounded-xl px-3 py-2.5 flex items-center gap-3 text-xs hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className="min-w-0 flex-1 font-medium text-neutral-900 dark:text-white">{s.name}</div>
            <div className="shrink-0"><Delta value={s.flow} /></div>
            <span className="font-sans text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0 w-12 text-right">{s.dominance.toFixed(1)}%</span>
            <div className="shrink-0">
              {s.trending === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E] dark:text-[#4ADE80]" />}
              {s.trending === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#EF4444] dark:text-[#F87171]" />}
              {s.trending === 'flat' && <Minus className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />}
            </div>
          </div>
        ))}
      </div>

      {/* Top sectors */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider shrink-0">
          Leading
        </span>
        <div className="flex flex-wrap gap-1">
          {sectors.filter((s) => s.trending === 'up').map((s) => (
            <span
              key={s.name}
              className="px-1.5 py-0.5 text-[10px] font-sans border border-[#22C55E]/20 dark:border-[#4ADE80]/20 text-[#22C55E] dark:text-[#4ADE80] rounded"
            >
              {s.name} +{s.flow.toFixed(1)}%
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L4: AI Verdict Engine
// ---------------------------------------------------------------------------

function OpportunityCard({ opportunity, type }: { opportunity: VerdictOpportunity; type: 'buy' | 'sell' }) {
  const isBuy = type === 'buy';
  const actionColor = isBuy
    ? 'text-[#22C55E] dark:text-[#4ADE80]'
    : 'text-[#EF4444] dark:text-[#F87171]';
  const barColor = isBuy
    ? 'bg-[#22C55E] dark:bg-[#4ADE80]'
    : 'bg-[#EF4444] dark:bg-[#F87171]';

  return (
    <div className="bg-white dark:bg-neutral-950 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xl font-sans font-bold tracking-tight', actionColor)}>
            {opportunity.action}
          </span>
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase">
            {opportunity.market}
          </span>
        </div>
        <PhaseBadge phase={opportunity.phase} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Confidence
          </span>
          <span className={cn('text-sm font-sans font-bold tabular-nums', actionColor)}>
            {opportunity.confidence}%
          </span>
        </div>
        <div className="h-[2px] bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${opportunity.confidence}%` }}
          />
        </div>
      </div>

      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
        {opportunity.reason}
      </p>

      {opportunity.suggestedAssets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {opportunity.suggestedAssets.map((s) => (
            <span
              key={s}
              className="px-1.5 py-0.5 text-[10px] font-sans border border-neutral-200 dark:border-neutral-800 rounded text-neutral-600 dark:text-neutral-300"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function L4VerdictEngine({ verdict }: { verdict: VerdictData }) {
  const passedCount = verdict.gates.filter((g) => g.passed).length;
  const totalGates = verdict.gates.length;
  const allPassed = passedCount === totalGates;

  const regimeStyles: Record<string, { label: string; color: string }> = {
    RISK_ON: { label: 'RISK ON', color: 'text-[#22C55E] dark:text-[#4ADE80]' },
    RISK_OFF: { label: 'RISK OFF', color: 'text-[#EF4444] dark:text-[#F87171]' },
    NEUTRAL: { label: 'NEUTRAL', color: 'text-[#F59E0B] dark:text-[#FBBF24]' },
  };

  const regime = regimeStyles[verdict.regime] || regimeStyles.NEUTRAL;

  return (
    <section>
      <SectionLabel layer="L4" label="Verdict Engine" />
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        {/* Regime bar */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-sans font-bold tracking-wider', regime.color)}>
              {regime.label}
            </span>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              {passedCount}/{totalGates} gates passed
            </span>
          </div>
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 tabular-nums">
            {verdict.timestamp}
          </span>
        </div>

        {/* Decision Gate checklist */}
        <div className="px-3 py-2">
          <div className="space-y-1.5">
            {verdict.gates.map((gate, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={cn(
                  'text-xs font-sans shrink-0 mt-0.5',
                  gate.passed
                    ? 'text-[#22C55E] dark:text-[#4ADE80]'
                    : 'text-[#EF4444] dark:text-[#F87171]',
                )}>
                  {gate.passed ? '✓' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white">
                      {gate.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-snug block">
                    {gate.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BUY / SELL split */}
        <div className="grid grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800">
          {verdict.buy ? (
            <OpportunityCard opportunity={verdict.buy} type="buy" />
          ) : (
            <div className="bg-white dark:bg-neutral-950 p-3 flex items-center justify-center">
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">No BUY signal</span>
            </div>
          )}
          {verdict.sell ? (
            <OpportunityCard opportunity={verdict.sell} type="sell" />
          ) : (
            <div className="bg-white dark:bg-neutral-950 p-3 flex items-center justify-center">
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">No SELL signal</span>
            </div>
          )}
        </div>

        {/* Summary line */}
        {allPassed && verdict.buy && (
          <div className="px-3 py-2">
            <p className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 leading-relaxed">
              All gates passed. Primary opportunity in {verdict.buy.market} ({verdict.buy.phase} phase).
              {verdict.sell ? ` Consider reducing ${verdict.sell.market} exposure.` : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L5: Asset Screener
// ---------------------------------------------------------------------------

function L5Screener({
  assets,
  selectedSymbol,
  onSelect,
}: {
  assets: ScreenerAsset[];
  selectedSymbol: string | null;
  onSelect: (asset: ScreenerAsset) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('aiScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [marketFilter, setMarketFilter] = useState<string>('All');

  const markets = useMemo(() => {
    const unique = new Set(assets.map((a) => a.market));
    return ['All', ...Array.from(unique)];
  }, [assets]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const filtered = useMemo(() => {
    let result = [...assets];

    if (marketFilter !== 'All') {
      result = result.filter((a) => a.market === marketFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortKey) {
        case 'rank': va = a.rank; vb = b.rank; break;
        case 'symbol': va = a.symbol; vb = b.symbol; break;
        case 'price': va = a.price; vb = b.price; break;
        case 'change24h': va = a.change24h; vb = b.change24h; break;
        case 'volume': va = a.volume; vb = b.volume; break;
        case 'aiScore': va = a.aiScore; vb = b.aiScore; break;
        case 'trend':
          const trendOrder = { STRONG_UP: 5, UP: 4, FLAT: 3, DOWN: 2, STRONG_DOWN: 1 };
          va = trendOrder[a.trend] || 3;
          vb = trendOrder[b.trend] || 3;
          break;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return result;
  }, [assets, search, sortKey, sortDir, marketFilter]);

  const SortBtn = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <button
      className={cn(
        'text-[10px] uppercase tracking-wider transition-colors font-sans',
        sortKey === sKey
          ? 'text-neutral-900 dark:text-white'
          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300',
      )}
      onClick={() => handleSort(sKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortKey === sKey && (
          sortDir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
        )}
      </span>
    </button>
  );

  return (
    <section>
      <SectionLabel layer="L5" label="Asset Screener" count={filtered.length} />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
          />
        </div>
        {/* Market filter */}
        <div className="flex gap-px bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden shrink-0">
          {markets.map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={cn(
                'px-2.5 py-2 text-[10px] font-sans uppercase tracking-wider transition-colors min-w-[48px]',
                marketFilter === m
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                  : 'bg-white dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Sort row */}
      <div className="flex items-center gap-4 px-1 mb-2">
        <SortBtn label="#" sKey="rank" />
        <SortBtn label="Asset" sKey="symbol" />
        <SortBtn label="Price" sKey="price" />
        <SortBtn label="24h" sKey="change24h" />
        <span className="hidden md:inline"><SortBtn label="Volume" sKey="volume" /></span>
        <SortBtn label="Score" sKey="aiScore" />
        <SortBtn label="Trend" sKey="trend" />
      </div>

      {/* Card list */}
      <div className="space-y-1.5">
        {filtered.map((asset) => (
          <button
            key={asset.symbol}
            onClick={() => onSelect(asset)}
            className={cn(
              'w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all duration-150',
              selectedSymbol === asset.symbol
                ? 'bg-neutral-100 dark:bg-white/[0.06] ring-1 ring-neutral-300 dark:ring-white/10'
                : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]',
            )}
          >
            {/* Rank */}
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 tabular-nums w-5 text-center shrink-0">
              {asset.rank}
            </span>

            {/* Asset */}
            <div className="min-w-0 flex-1">
              <span className="font-sans font-semibold text-xs text-neutral-900 dark:text-white">{asset.symbol}</span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-1.5 truncate hidden sm:inline">{asset.name}</span>
            </div>

            {/* Price + 24h */}
            <div className="text-right shrink-0">
              <div className="font-sans font-medium text-xs text-neutral-900 dark:text-white tabular-nums">{formatPrice(asset.price)}</div>
              <Delta value={asset.change24h} />
            </div>

            {/* Volume (md+) */}
            <span className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 tabular-nums hidden md:block w-16 text-right shrink-0">
              {formatNumber(asset.volume)}
            </span>

            {/* Score */}
            <div className="w-20 shrink-0 hidden sm:block">
              <ScoreBar score={asset.aiScore} />
            </div>

            {/* Trend */}
            <div className="shrink-0 hidden sm:block">
              <TrendIndicator trend={asset.trend} />
            </div>

            {/* Verdict + Direction */}
            <div className="flex items-center gap-1.5 shrink-0">
              <VerdictBadgeSmall verdict={asset.verdict} />
              <DirectionTag direction={asset.direction} />
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500 font-sans">
            No assets match your criteria
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L7: Trade Visualizer (Lightweight Charts)
// ---------------------------------------------------------------------------

function L7TradeVisualizer({
  selectedAsset,
  tradePlan,
}: {
  selectedAsset: ScreenerAsset | null;
  tradePlan: TradePlan | null;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize and update chart
  useEffect(() => {
    if (!mounted || !chartContainerRef.current || !selectedAsset) return;

    let chart: IChartApi | null = null;

    const initChart = async () => {
      if (!chartContainerRef.current) return;

      const isDark = resolvedTheme === 'dark';

      chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: isDark ? '#0a0a0a' : '#FFFFFF' },
          textColor: isDark ? '#737373' : '#A3A3A3',
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: isDark ? '#171717' : '#F5F5F5' },
          horzLines: { color: isDark ? '#171717' : '#F5F5F5' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: isDark ? '#404040' : '#D4D4D4',
            width: 1,
            style: LineStyle.Dotted,
            labelBackgroundColor: isDark ? '#262626' : '#F5F5F5',
          },
          horzLine: {
            color: isDark ? '#404040' : '#D4D4D4',
            width: 1,
            style: LineStyle.Dotted,
            labelBackgroundColor: isDark ? '#262626' : '#F5F5F5',
          },
        },
        timeScale: {
          borderColor: isDark ? '#262626' : '#E5E5E5',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: isDark ? '#262626' : '#E5E5E5',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
      });

      chartRef.current = chart;

      // Fetch real candle data from API
      let candles: CandlestickData<Time>[] = [];
      try {
        const res = await authFetch(`/api/analysis/chart/candles?symbol=${encodeURIComponent(selectedAsset.symbol)}&interval=1h&limit=100`);
        if (res.ok) {
          const json = await res.json();
          const raw = json?.data ?? json ?? [];
          if (Array.isArray(raw) && raw.length > 0) {
            candles = raw.map((c: any) => ({
              time: (typeof c.time === 'number' ? c.time : Math.floor(new Date(c.time ?? c.openTime ?? 0).getTime() / 1000)) as Time,
              open: Number(c.open ?? c.o ?? 0),
              high: Number(c.high ?? c.h ?? 0),
              low: Number(c.low ?? c.l ?? 0),
              close: Number(c.close ?? c.c ?? 0),
            }));
          }
        }
      } catch {
        // fallback: empty candles, chart will be empty
      }

      // If API returned no data, generate minimal placeholder from current price
      if (candles.length === 0) {
        const basePrice = selectedAsset.price || 100;
        const now = Math.floor(Date.now() / 1000);
        for (let i = 50; i >= 0; i--) {
          const time = (now - i * 3600) as Time;
          candles.push({ time, open: basePrice, high: basePrice * 1.001, low: basePrice * 0.999, close: basePrice });
        }
      }

      const series = chart.addCandlestickSeries({
        upColor: '#22C55E',
        downColor: '#EF4444',
        borderUpColor: '#22C55E',
        borderDownColor: '#EF4444',
        wickUpColor: '#22C55E',
        wickDownColor: '#EF4444',
      });

      series.setData(candles);

      // Add trade plan lines
      if (tradePlan) {
        series.createPriceLine({
          price: tradePlan.entry,
          color: '#3B82F6',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'ENTRY',
        });
        series.createPriceLine({
          price: tradePlan.sl,
          color: '#EF4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'SL',
        });
        series.createPriceLine({
          price: tradePlan.tp1,
          color: '#22C55E',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'TP1',
        });
        series.createPriceLine({
          price: tradePlan.tp2,
          color: '#84CC16',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'TP2',
        });
      }

      // --- Forecast Path (P10 / P50 / P90 projection) ---
      // Forecast starts from the ENTRY candle, not the last candle
      const isLong = selectedAsset.direction === 'LONG';
      const score = selectedAsset.aiScore;
      const pctMove = (score / 100) * 8; // max ~8% expected move
      const entryPrice = tradePlan ? tradePlan.entry : selectedAsset.price;

      // Find the candle closest to the entry price (entry point on chart)
      let entryIdx = candles.length - 1;
      if (tradePlan) {
        let minDist = Infinity;
        for (let i = 0; i < candles.length; i++) {
          const dist = Math.abs(candles[i].close - entryPrice);
          if (dist < minDist) {
            minDist = dist;
            entryIdx = i;
          }
        }
      }

      const entryCandle = candles[entryIdx];
      const entryClose = entryCandle.close;
      const entryTime = entryCandle.time as number;
      const lastTime = candles[candles.length - 1].time as number;
      // Forecast spans from entry candle to 48h after the last candle
      const totalSeconds = (lastTime - entryTime) + 48 * 3600;
      const forecastSteps = 60;

      const p50Data: { time: Time; value: number }[] = [];
      const p90Data: { time: Time; value: number }[] = [];
      const p10Data: { time: Time; value: number }[] = [];

      for (let s = 0; s <= forecastSteps; s++) {
        const t = (entryTime + Math.round((s / forecastSteps) * totalSeconds)) as Time;
        const progress = s / forecastSteps;
        // Smooth easing curve
        const ease = 1 - Math.pow(1 - progress, 2);

        const p50Offset = (pctMove / 100) * ease * (isLong ? 1 : -1);
        const bandWidth = (pctMove / 100) * 0.6 * ease; // P90/P10 spread
        const p90Offset = p50Offset + bandWidth * (isLong ? 1 : -1);
        const p10Offset = p50Offset - bandWidth * (isLong ? 1 : -1);

        p50Data.push({ time: t, value: entryClose * (1 + p50Offset) });
        p90Data.push({ time: t, value: entryClose * (1 + p90Offset) });
        p10Data.push({ time: t, value: entryClose * (1 + p10Offset) });
      }

      // P90 upper band area (semi-transparent fill to baseline)
      const p90Area = chart.addAreaSeries({
        lineColor: 'rgba(34, 197, 94, 0.3)',
        topColor: 'rgba(34, 197, 94, 0.08)',
        bottomColor: 'rgba(34, 197, 94, 0.0)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
      });
      p90Area.setData(p90Data);

      // P10 lower band area
      const p10Area = chart.addAreaSeries({
        lineColor: 'rgba(34, 197, 94, 0.3)',
        topColor: 'rgba(34, 197, 94, 0.0)',
        bottomColor: 'rgba(34, 197, 94, 0.08)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
      });
      p10Area.setData(p10Data);

      // P50 median forecast line
      const p50Line = chart.addLineSeries({
        color: '#22C55E',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lastValueVisible: true,
      });
      p50Line.setData(p50Data);

      chart.timeScale().fitContent();

      // Resize handler
      const resizeObserver = new ResizeObserver((entries) => {
        if (chart && entries[0]) {
          const { width, height } = entries[0].contentRect;
          chart.resize(width, height);
        }
      });
      resizeObserver.observe(chartContainerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    };

    let cancelled = false;
    let cleanupFn: (() => void) | undefined;

    initChart().then((fn) => {
      if (cancelled) {
        fn?.();
      } else {
        cleanupFn = fn ?? undefined;
      }
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
      if (chart) {
        chart.remove();
        chart = null;
        chartRef.current = null;
      }
    };
  }, [mounted, selectedAsset, tradePlan, resolvedTheme]);

  if (!selectedAsset) {
    return (
      <section>
        <SectionLabel layer="L7" label="Trade Visualizer" />
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 h-[300px] sm:h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-5 h-5 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-xs font-sans text-neutral-400 dark:text-neutral-500">
              Select an asset from the screener
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionLabel layer="L7" label="Trade Visualizer" />
      {/* Asset header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="font-sans font-bold text-sm text-neutral-900 dark:text-white">
            {selectedAsset.symbol}
          </span>
          <DirectionTag direction={selectedAsset.direction} />
          <VerdictBadgeSmall verdict={selectedAsset.verdict} />
        </div>
        <span className="font-sans text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
          {formatPrice(selectedAsset.price)}
        </span>
      </div>

      {/* Chart */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-950">
        <div
          ref={chartContainerRef}
          className="w-full h-[300px] sm:h-[400px]"
        />
      </div>

      {/* Trade plan summary */}
      {tradePlan && (
        <div className="mt-2 grid grid-cols-5 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          {[
            { label: 'Entry', value: tradePlan.entry, color: 'text-[#3B82F6]' },
            { label: 'SL', value: tradePlan.sl, color: 'text-[#EF4444] dark:text-[#F87171]' },
            { label: 'TP1', value: tradePlan.tp1, color: 'text-[#22C55E] dark:text-[#4ADE80]' },
            { label: 'TP2', value: tradePlan.tp2, color: 'text-[#84CC16] dark:text-[#A3E635]' },
            { label: 'R:R', value: tradePlan.rr, color: 'text-neutral-900 dark:text-white' },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-neutral-950 p-2 text-center">
              <div className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                {item.label}
              </div>
              <div className={cn('text-xs font-sans font-semibold tabular-nums', item.color)}>
                {item.label === 'R:R' ? `${item.value.toFixed(1)}x` : formatPriceValue(item.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forecast path info bar */}
      {(() => {
        const isLong = selectedAsset.direction === 'LONG';
        const score = selectedAsset.aiScore;
        const pctMove = (score / 100) * 8;
        const p50Target = selectedAsset.price * (1 + (isLong ? pctMove : -pctMove) / 100);
        return (
          <div className="mt-2 border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-sans text-[#22C55E] dark:text-[#4ADE80] uppercase tracking-widest">
                Forecast 48h
              </span>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
                Expected: <span className="text-neutral-600 dark:text-neutral-300 tabular-nums">{isLong ? '+' : '-'}{pctMove.toFixed(1)}%</span>
              </span>
            </div>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              P50 target: <span className="text-neutral-600 dark:text-neutral-300 font-semibold tabular-nums">{formatPrice(p50Target)}</span>
            </span>
          </div>
        );
      })()}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Terminal Header
// ---------------------------------------------------------------------------

function TerminalHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
          <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
        </div>
        <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
          TERMINAL
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] dark:bg-[#4ADE80] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E] dark:bg-[#4ADE80]" />
          </span>
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden sm:inline">
            Live
          </span>
        </div>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Content Panel — Renders active section
// ---------------------------------------------------------------------------

function ContentPanel({
  activeSection,
  macroMetrics,
  marketFlows,
  sectors,
  verdict,
  screenerData,
  selectedAsset,
  tradePlan,
  onAssetSelect,
  l1Interpretation,
  l2Interpretation,
}: {
  activeSection: SectionId;
  macroMetrics: MacroMetric[];
  marketFlows: MarketFlow[];
  sectors: SectorData[];
  verdict: VerdictData;
  screenerData: ScreenerAsset[];
  selectedAsset: ScreenerAsset | null;
  tradePlan: TradePlan | null;
  onAssetSelect: (asset: ScreenerAsset) => void;
  l1Interpretation?: string;
  l2Interpretation?: string;
}) {
  switch (activeSection) {
    case 'l1':
      return <L1MacroGrid metrics={macroMetrics} interpretation={l1Interpretation} />;
    case 'l2':
      return <L2MarketFlow flows={marketFlows} interpretation={l2Interpretation} />;
    case 'l3':
      return <L3Sectors sectors={sectors} />;
    case 'l4':
      return <L4VerdictEngine verdict={verdict} />;
    case 'l5':
      return (
        <L5Screener
          assets={screenerData}
          selectedSymbol={selectedAsset?.symbol ?? null}
          onSelect={onAssetSelect}
        />
      );
    case 'l7':
      return (
        <L7TradeVisualizer
          selectedAsset={selectedAsset}
          tradePlan={tradePlan}
        />
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main Terminal Page
// ---------------------------------------------------------------------------

export default function TestPage() {
  // API data
  const [cfData, setCfData] = useState<Record<string, any> | null>(null);
  const [topCoinsRaw, setTopCoinsRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedAsset, setSelectedAsset] = useState<ScreenerAsset | null>(null);
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);

  // Navigation
  const [activeSection, setActiveSection] = useState<SectionId>('l1');

  // Fetch Capital Flow + Top Coins on mount
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cfRes, coinsRes] = await Promise.all([
          authFetch('/api/capital-flow/summary'),
          authFetch('/api/analysis/top-coins?limit=20&sortBy=reliabilityScore'),
        ]);
        if (cancelled) return;
        const cfJson = cfRes.ok ? await cfRes.json() : null;
        const coinsJson = coinsRes.ok ? await coinsRes.json() : null;
        setCfData(cfJson?.data ?? cfJson ?? null);
        const coins = coinsJson?.data?.coins ?? coinsJson?.data ?? coinsJson?.coins ?? [];
        setTopCoinsRaw(Array.isArray(coins) ? coins : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load terminal data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Derive display data from API responses
  const macroMetrics = useMemo(() => mapMacroMetrics(cfData?.globalLiquidity ?? cfData), [cfData]);
  const marketFlows = useMemo(() => mapMarketFlows(cfData?.markets), [cfData]);
  const sectors = useMemo(() => mapSectors(cfData?.markets), [cfData]);
  const screenerData = useMemo(() => mapScreenerAssets(topCoinsRaw), [topCoinsRaw]);
  const verdict = useMemo(() => mapVerdictData(cfData), [cfData]);
  const l1Interpretation = cfData?.insights?.ragLayer1 as string | undefined;
  const l2Interpretation = cfData?.insights?.ragLayer2 as string | undefined;

  const handleAssetSelect = useCallback((asset: ScreenerAsset) => {
    setSelectedAsset(asset);
    setTradePlan(calculateTradePlan(asset));
    setActiveSection('l7');
  }, []);

  const handleNavClick = useCallback((id: SectionId) => {
    setActiveSection(id);
  }, []);

  // Reload handler
  const handleRetry = useCallback(() => {
    setCfData(null);
    setTopCoinsRaw([]);
    setLoading(true);
    setError(null);
    Promise.all([
      authFetch('/api/capital-flow/summary'),
      authFetch('/api/analysis/top-coins?limit=20&sortBy=reliabilityScore'),
    ]).then(async ([cfRes, coinsRes]) => {
      const cfJson = cfRes.ok ? await cfRes.json() : null;
      const coinsJson = coinsRes.ok ? await coinsRes.json() : null;
      setCfData(cfJson?.data ?? cfJson ?? null);
      const coins = coinsJson?.data?.coins ?? coinsJson?.data ?? coinsJson?.coins ?? [];
      setTopCoinsRaw(Array.isArray(coins) ? coins : []);
    }).catch((err: any) => {
      setError(err?.message || 'Failed to load terminal data');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#14B8A6] mx-auto mb-3" />
          <p className="text-xs font-sans text-neutral-500 dark:text-neutral-400">Loading terminal data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-3" />
          <p className="text-xs font-sans text-neutral-500 dark:text-neutral-400 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans bg-neutral-100 dark:bg-neutral-800 rounded-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 flex flex-col h-full">
        <TerminalHeader />

        {/* Mobile: Horizontal scroll tab bar */}
        <div className="lg:hidden mt-3 -mx-3 px-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-px bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden w-max">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'px-3 py-2 text-[10px] font-sans uppercase tracking-wider transition-colors whitespace-nowrap',
                  activeSection === item.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400',
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
        <div className="mt-4 flex-1 min-h-0 flex gap-0">

          {/* Sidebar Navigation */}
          <nav className="hidden lg:block w-52 shrink-0 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto scrollbar-none pr-3 py-1">
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
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-all duration-150',
                          isActive
                            ? 'bg-neutral-100 dark:bg-neutral-900/50 border-l-2 border-[#14B8A6] dark:border-[#5EEAD4] -ml-px'
                            : 'border-l-2 border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/20 -ml-px',
                        )}
                      >
                        {item.tag && (
                          <span className={cn(
                            'text-[9px] font-sans tabular-nums w-4 shrink-0',
                            isActive
                              ? 'text-[#14B8A6] dark:text-[#5EEAD4]'
                              : 'text-neutral-400 dark:text-neutral-600',
                          )}>
                            {item.tag}
                          </span>
                        )}
                        <span className={cn(
                          'text-[11px] font-sans truncate',
                          isActive
                            ? 'text-neutral-900 dark:text-white font-medium'
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

            {/* Sidebar footer info */}
            <div className="mt-6 px-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              {selectedAsset ? (
                <div className="space-y-1">
                  <span className="text-[9px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">
                    Selected
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-sans font-semibold text-neutral-900 dark:text-white">
                      {selectedAsset.symbol}
                    </span>
                    <DirectionTag direction={selectedAsset.direction} />
                    <VerdictBadgeSmall verdict={selectedAsset.verdict} />
                  </div>
                  <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 tabular-nums">
                    {formatPrice(selectedAsset.price)}
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
          <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none lg:pl-5 py-1 pb-4">
            <ContentPanel
              activeSection={activeSection}
              macroMetrics={macroMetrics}
              marketFlows={marketFlows}
              sectors={sectors}
              verdict={verdict}
              screenerData={screenerData}
              selectedAsset={selectedAsset}
              tradePlan={tradePlan}
              onAssetSelect={handleAssetSelect}
              l1Interpretation={l1Interpretation}
              l2Interpretation={l2Interpretation}
            />
          </main>
        </div>

      </div>
    </div>
  );
}
