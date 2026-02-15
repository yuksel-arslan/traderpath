'use client';

// =============================================================================
// Flow — Capital Flow Deep Drill (L1 · L2 · L3 · L4)
// Sidebar + Content Panel — Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn, formatNumber } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionId = 'l1' | 'l2' | 'rotation' | 'l3' | 'l4';

interface NavItem {
  id: SectionId;
  tag: string;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface LiquidityMetric {
  id: string;
  label: string;
  value: string;
  change: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  sparkline: number[];
  description: string;
}

interface MarketFlowDetail {
  market: string;
  flow7d: number;
  flow30d: number;
  flow90d: number;
  velocity: number;
  acceleration: number;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  marketCap: string;
  dominance: number;
}

interface SectorDetail {
  name: string;
  market: string;
  flow7d: number;
  flow30d: number;
  dominance: number;
  trending: 'up' | 'down' | 'flat';
  topAssets: string[];
}

interface Recommendation {
  direction: 'BUY' | 'SELL';
  market: string;
  phase: string;
  confidence: number;
  reason: string;
  suggestedAssets: string[];
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Macro',
    items: [
      { id: 'l1', tag: 'L1', label: 'Global Liquidity' },
    ],
  },
  {
    title: 'Markets',
    items: [
      { id: 'l2', tag: 'L2', label: 'Market Flow' },
      { id: 'rotation', tag: 'L2', label: 'Rotation Matrix' },
      { id: 'l3', tag: 'L3', label: 'Sector Activity' },
    ],
  },
  {
    title: 'Action',
    items: [
      { id: 'l4', tag: 'L4', label: 'AI Recommendation' },
    ],
  },
];

// ---------------------------------------------------------------------------
// API Data Mapping Helpers
// ---------------------------------------------------------------------------

function mapLiquidityMetrics(gl: any): LiquidityMetric[] {
  if (!gl) return [];
  const metrics: LiquidityMetric[] = [];

  if (gl.m2MoneySupply) {
    const val = Number(gl.m2MoneySupply.value) || 0;
    const change = Number(gl.m2MoneySupply.change30d) || 0;
    metrics.push({
      id: 'm2',
      label: 'M2 Money Supply',
      value: `$${val.toFixed(1)}T`,
      change,
      signal: change > 1 ? 'bullish' : change < -1 ? 'bearish' : 'neutral',
      sparkline: [],
      description: `M2 YoY growth: ${(Number(gl.m2MoneySupply.yoyGrowth) || 0).toFixed(1)}% — ${change > 0 ? 'expanding, risk assets favored' : 'contracting, headwind for risk'}`,
    });
  }

  if (gl.fedBalanceSheet) {
    const val = Number(gl.fedBalanceSheet.value) || 0;
    const change = Number(gl.fedBalanceSheet.change30d) || 0;
    const trend = gl.fedBalanceSheet.trend || 'stable';
    metrics.push({
      id: 'fed',
      label: 'Fed Balance Sheet',
      value: `$${val.toFixed(1)}T`,
      change,
      signal: trend === 'expanding' ? 'bullish' : trend === 'contracting' ? 'bearish' : 'neutral',
      sparkline: [],
      description: `Fed balance sheet ${trend} — ${trend === 'expanding' ? 'liquidity injection' : trend === 'contracting' ? 'quantitative tightening' : 'stable'}`,
    });
  }

  if (gl.dxy) {
    const val = Number(gl.dxy.value) || 0;
    const change = Number(gl.dxy.change7d) || 0;
    const trend = gl.dxy.trend || 'stable';
    metrics.push({
      id: 'dxy',
      label: 'US Dollar Index',
      value: val.toFixed(2),
      change,
      signal: trend === 'weakening' ? 'bullish' : trend === 'strengthening' ? 'bearish' : 'neutral',
      sparkline: [],
      description: `Dollar ${trend} — ${trend === 'weakening' ? 'tailwind for risk assets' : trend === 'strengthening' ? 'headwind for risk assets' : 'neutral impact'}`,
    });
  }

  if (gl.vix) {
    const val = Number(gl.vix.value) || 0;
    const level = gl.vix.level || 'neutral';
    metrics.push({
      id: 'vix',
      label: 'VIX Volatility',
      value: val.toFixed(1),
      change: 0,
      signal: level === 'complacent' || level === 'neutral' ? 'bullish' : 'bearish',
      sparkline: [],
      description: `VIX at ${val.toFixed(1)} (${level}) — ${val < 20 ? 'low fear, favors continuation' : val < 30 ? 'elevated fear' : 'extreme fear, risk-off'}`,
    });
  }

  if (gl.yieldCurve) {
    const spread = Number(gl.yieldCurve.spread10y2y) || 0;
    const inverted = gl.yieldCurve.inverted;
    metrics.push({
      id: 'yc',
      label: 'Yield Curve (10Y-2Y)',
      value: `${spread >= 0 ? '+' : ''}${spread.toFixed(2)}%`,
      change: spread,
      signal: inverted ? 'bearish' : spread > 0.2 ? 'bullish' : 'neutral',
      sparkline: [],
      description: gl.yieldCurve.interpretation || (inverted ? 'Curve inverted — recession risk elevated' : 'Curve normalizing'),
    });
  }

  if (gl.netLiquidity) {
    const val = Number(gl.netLiquidity.value) || 0;
    const change = Number(gl.netLiquidity.change30d) || 0;
    const trend = gl.netLiquidity.trend || 'stable';
    metrics.push({
      id: 'nl',
      label: 'Net Liquidity',
      value: `$${val.toFixed(1)}T`,
      change,
      signal: trend === 'expanding' ? 'bullish' : trend === 'contracting' ? 'bearish' : 'neutral',
      sparkline: [],
      description: gl.netLiquidity.interpretation || `Net liquidity ${trend}`,
    });
  }

  return metrics;
}

function mapMarketFlows(markets: any[]): MarketFlowDetail[] {
  if (!Array.isArray(markets)) return [];
  return markets.filter(m => m && m.market).map(m => ({
    market: String(m.market || '').charAt(0).toUpperCase() + String(m.market || '').slice(1),
    flow7d: Number(m.flow7d) || 0,
    flow30d: Number(m.flow30d) || 0,
    flow90d: 0,
    velocity: Number(m.flowVelocity) || 0,
    acceleration: 0,
    phase: (String(m.phase || 'mid').toUpperCase()) as 'EARLY' | 'MID' | 'LATE' | 'EXIT',
    daysInPhase: Number(m.daysInPhase) || 0,
    rotationSignal: m.rotationSignal || null,
    marketCap: m.currentValue ? `$${formatNumber(m.currentValue)}` : 'N/A',
    dominance: 0,
  }));
}

function mapSectors(markets: any[]): SectorDetail[] {
  if (!Array.isArray(markets)) return [];
  const allSectors: SectorDetail[] = [];
  for (const m of markets) {
    if (!m || !Array.isArray(m.sectors)) continue;
    const marketName = String(m.market || '').charAt(0).toUpperCase() + String(m.market || '').slice(1);
    for (const s of m.sectors) {
      if (!s) continue;
      allSectors.push({
        name: String(s.name || 'Unknown'),
        market: marketName,
        flow7d: Number(s.flow7d) || 0,
        flow30d: Number(s.flow30d) || 0,
        dominance: Number(s.dominance) || 0,
        trending: s.trending === 'up' ? 'up' : s.trending === 'down' ? 'down' : 'flat',
        topAssets: Array.isArray(s.topAssets) ? s.topAssets : [],
      });
    }
  }
  return allSectors;
}

function mapRecommendations(rec: any, sellRec: any): Recommendation[] {
  const recs: Recommendation[] = [];
  if (rec && rec.primaryMarket) {
    recs.push({
      direction: (rec.direction || 'BUY') as 'BUY' | 'SELL',
      market: String(rec.primaryMarket || '').charAt(0).toUpperCase() + String(rec.primaryMarket || '').slice(1),
      phase: String(rec.phase || 'mid').toUpperCase(),
      confidence: Number(rec.confidence) || 0,
      reason: String(rec.reason || ''),
      suggestedAssets: Array.isArray(rec.suggestedAssets)
        ? rec.suggestedAssets.map((a: any) => typeof a === 'string' ? a : String(a?.symbol || ''))
        : (Array.isArray(rec.sectors) ? rec.sectors.slice(0, 4) : []),
    });
  }
  if (sellRec && sellRec.primaryMarket) {
    recs.push({
      direction: 'SELL',
      market: String(sellRec.primaryMarket || '').charAt(0).toUpperCase() + String(sellRec.primaryMarket || '').slice(1),
      phase: String(sellRec.phase || 'exit').toUpperCase(),
      confidence: Number(sellRec.confidence) || 0,
      reason: String(sellRec.reason || ''),
      suggestedAssets: Array.isArray(sellRec.suggestedAssets)
        ? sellRec.suggestedAssets.map((a: any) => typeof a === 'string' ? a : String(a?.symbol || ''))
        : (Array.isArray(sellRec.sectors) ? sellRec.sectors.slice(0, 4) : []),
    });
  }
  return recs;
}

function getBiasInfo(bias: string): { label: string; color: string; dot: string; description: string } {
  switch (bias) {
    case 'risk_on':
      return { label: 'RISK ON', color: 'text-[#22C55E] dark:text-[#4ADE80]', dot: 'bg-[#22C55E] dark:bg-[#4ADE80]', description: 'Liquidity expanding. Capital favoring risk assets.' };
    case 'risk_off':
      return { label: 'RISK OFF', color: 'text-[#EF4444] dark:text-[#F87171]', dot: 'bg-[#EF4444] dark:bg-[#F87171]', description: 'Liquidity tightening. Capital moving to safe havens.' };
    default:
      return { label: 'NEUTRAL', color: 'text-neutral-500 dark:text-neutral-400', dot: 'bg-neutral-400 dark:bg-neutral-500', description: 'Mixed signals. No clear directional bias.' };
  }
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function Delta({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const color = value > 0
    ? 'text-[#22C55E] dark:text-[#4ADE80]'
    : value < 0
    ? 'text-[#EF4444] dark:text-[#F87171]'
    : 'text-neutral-500 dark:text-neutral-400';
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-sans', textSize, color)}>
      <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 80;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const color = positive ? '#22C55E' : '#EF4444';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhaseBadge({ phase, days }: { phase: string; days?: number }) {
  const styles: Record<string, string> = {
    EARLY: 'text-[#22C55E] dark:text-[#4ADE80] border-[#22C55E]/20 dark:border-[#4ADE80]/20',
    MID: 'text-[#F59E0B] dark:text-[#FBBF24] border-[#F59E0B]/20 dark:border-[#FBBF24]/20',
    LATE: 'text-[#F97316] dark:text-[#FB923C] border-[#F97316]/20 dark:border-[#FB923C]/20',
    EXIT: 'text-[#EF4444] dark:text-[#F87171] border-[#EF4444]/20 dark:border-[#F87171]/20',
  };
  return (
    <span className={cn('px-1.5 py-0.5 text-[10px] font-sans uppercase tracking-wider border rounded', styles[phase] || styles.MID)}>
      {phase}{days !== undefined ? ` · ${days}d` : ''}
    </span>
  );
}

function RotationBadge({ signal }: { signal: string | null }) {
  if (!signal) return null;
  const styles: Record<string, string> = {
    entering: 'text-[#22C55E] dark:text-[#4ADE80]',
    stable: 'text-neutral-400 dark:text-neutral-500',
    exiting: 'text-[#EF4444] dark:text-[#F87171]',
  };
  return (
    <span className={cn('text-[10px] font-sans uppercase tracking-wider', styles[signal] || '')}>
      {signal === 'entering' ? '↗ Entering' : signal === 'exiting' ? '↘ Exiting' : '→ Stable'}
    </span>
  );
}

function SectionLabel({ label, layer, count }: { label: string; layer: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{layer}</span>
        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">{count}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// L1: Global Liquidity
// ---------------------------------------------------------------------------

function L1Liquidity({ metrics }: { metrics: LiquidityMetric[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section>
      <SectionLabel layer="L1" label="Global Liquidity" count={metrics.length} />
      <div className="space-y-px">
        {metrics.map((m) => (
          <div
            key={m.id}
            className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-black overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors text-left"
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                m.signal === 'bullish' ? 'bg-[#22C55E] dark:bg-[#4ADE80]' :
                m.signal === 'bearish' ? 'bg-[#EF4444] dark:bg-[#F87171]' :
                'bg-neutral-400 dark:bg-neutral-500',
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-sans uppercase tracking-wider truncate">
                    {m.label}
                  </span>
                  <MiniSparkline data={m.sparkline} positive={m.change >= 0} />
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-sans font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {m.value}
                  </span>
                  <Delta value={m.change} />
                </div>
              </div>
              <ChevronRight className={cn(
                'w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 transition-transform shrink-0',
                expanded === m.id && 'rotate-90',
              )} />
            </button>
            {expanded === m.id && (
              <div className="px-3 pb-3 pt-0">
                <div className="pt-1">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L2: Market Flow
// ---------------------------------------------------------------------------

function L2Markets({ flows }: { flows: MarketFlowDetail[] }) {
  return (
    <section>
      <SectionLabel layer="L2" label="Market Flow" count={flows.length} />
      <div className="space-y-2">
        {flows.map((f) => (
          <div
            key={f.market}
            className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-black p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">{f.market}</span>
                <PhaseBadge phase={f.phase} days={f.daysInPhase} />
              </div>
              <RotationBadge signal={f.rotationSignal} />
            </div>
            <div className="grid grid-cols-3 gap-px bg-neutral-100 dark:bg-neutral-800/50 rounded-sm overflow-hidden mb-2">
              {[
                { label: '7D', value: f.flow7d },
                { label: '30D', value: f.flow30d },
                { label: '90D', value: f.flow90d },
              ].map((item) => (
                <div key={item.label} className="bg-white dark:bg-black p-2 text-center">
                  <div className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">{item.label}</div>
                  <div className={cn(
                    'text-sm font-sans font-semibold tabular-nums',
                    item.value > 0 ? 'text-[#22C55E] dark:text-[#4ADE80]' : item.value < 0 ? 'text-[#EF4444] dark:text-[#F87171]' : 'text-neutral-500',
                  )}>
                    {item.value > 0 ? '+' : ''}{item.value.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              <span>MCap: {f.marketCap}</span>
              <span>Dom: {f.dominance}%</span>
              <span>Vel: {f.velocity > 0 ? '+' : ''}{f.velocity.toFixed(1)}</span>
              <span>Acc: {f.acceleration > 0 ? '+' : ''}{f.acceleration.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L3: Sector Activity
// ---------------------------------------------------------------------------

function L3Sectors({ sectors: sectorData, marketFilter }: { sectors: SectorDetail[]; marketFilter: string }) {
  const filtered = useMemo(() => {
    if (marketFilter === 'All') return sectorData;
    return sectorData.filter((s) => s.market === marketFilter);
  }, [sectorData, marketFilter]);

  return (
    <section>
      <SectionLabel layer="L3" label="Sector Activity" count={filtered.length} />
      <div className="space-y-1.5">
        {filtered.map((s) => (
          <div key={s.name} className="rounded-xl px-3 py-2.5 flex items-center gap-3 text-xs hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors">
            {/* Sector + Market */}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-neutral-900 dark:text-white">{s.name}</div>
              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-sans">{s.market}</div>
            </div>

            {/* Flows */}
            <div className="text-right shrink-0">
              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-sans">7D</div>
              <Delta value={s.flow7d} />
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-sans">30D</div>
              <Delta value={s.flow30d} />
            </div>

            {/* Dominance */}
            <span className="font-sans text-neutral-500 dark:text-neutral-400 tabular-nums hidden sm:block shrink-0 w-10 text-right">{s.dominance}%</span>

            {/* Trend */}
            <div className="shrink-0">
              {s.trending === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E] dark:text-[#4ADE80]" />}
              {s.trending === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#EF4444] dark:text-[#F87171]" />}
              {s.trending === 'flat' && <Minus className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />}
            </div>

            {/* Top Assets */}
            <div className="flex gap-1 hidden md:flex shrink-0">
              {s.topAssets.map((a) => (
                <span key={a} className="px-1 py-0.5 text-[10px] font-sans bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400">
                  {a}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L2: Rotation Matrix
// ---------------------------------------------------------------------------

function RotationMatrix({ flows }: { flows: MarketFlowDetail[] }) {
  return (
    <section>
      <SectionLabel layer="L2" label="Rotation Matrix" />
      <div className="rounded-xl bg-neutral-50 dark:bg-white/[0.02] p-4">
        <div className="grid grid-cols-4 gap-4">
          {flows.map((f) => {
            const isActive = f.rotationSignal === 'entering';
            const isExiting = f.rotationSignal === 'exiting';
            return (
              <div key={f.market} className="text-center">
                <div className={cn(
                  'w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-1.5 transition-all',
                  isActive
                    ? 'border-[#22C55E] dark:border-[#4ADE80] bg-[#22C55E]/5 dark:bg-[#4ADE80]/5'
                    : isExiting
                    ? 'border-[#EF4444] dark:border-[#F87171] bg-[#EF4444]/5 dark:bg-[#F87171]/5'
                    : 'border-neutral-200 dark:border-neutral-700',
                )}>
                  <span className={cn(
                    'text-lg font-sans font-bold tabular-nums',
                    isActive ? 'text-[#22C55E] dark:text-[#4ADE80]'
                    : isExiting ? 'text-[#EF4444] dark:text-[#F87171]'
                    : 'text-neutral-400 dark:text-neutral-500',
                  )}>
                    {f.flow7d > 0 ? '+' : ''}{f.flow7d.toFixed(0)}
                  </span>
                </div>
                <span className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">{f.market}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
          <p className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 text-center">
            Capital rotating: Bonds → Metals → Stocks → <span className="text-[#22C55E] dark:text-[#4ADE80] font-semibold">Crypto</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L4: AI Recommendation
// ---------------------------------------------------------------------------

function L4Recommendation({ recs }: { recs: Recommendation[] }) {
  return (
    <section>
      <SectionLabel layer="L4" label="AI Recommendation" count={recs.length} />
      <div className="space-y-3">
        {recs.map((r) => {
          const isBuy = r.direction === 'BUY';
          return (
            <div
              key={`${r.direction}-${r.market}`}
              className={cn(
                'border rounded-sm bg-white dark:bg-black p-4',
                isBuy
                  ? 'border-[#22C55E]/30 dark:border-[#4ADE80]/30'
                  : 'border-[#EF4444]/30 dark:border-[#F87171]/30',
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xl font-sans font-bold tracking-tight',
                    isBuy ? 'text-[#22C55E] dark:text-[#4ADE80]' : 'text-[#EF4444] dark:text-[#F87171]',
                  )}>
                    {r.direction}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{r.market}</span>
                  <PhaseBadge phase={r.phase} />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase">Confidence</div>
                  <div className={cn(
                    'text-sm font-sans font-bold tabular-nums',
                    r.confidence >= 70 ? 'text-[#22C55E] dark:text-[#4ADE80]' : 'text-[#F59E0B] dark:text-[#FBBF24]',
                  )}>
                    {r.confidence}%
                  </div>
                </div>
              </div>

              {/* Reason */}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">
                {r.reason}
              </p>

              {/* Suggested assets */}
              <div>
                <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Suggested Assets
                </span>
                <div className="flex gap-1.5 mt-1">
                  {r.suggestedAssets.map((a) => (
                    <span
                      key={a}
                      className={cn(
                        'px-1.5 py-0.5 text-[10px] font-sans border rounded',
                        isBuy
                          ? 'border-[#22C55E]/20 dark:border-[#4ADE80]/20 text-[#22C55E] dark:text-[#4ADE80]'
                          : 'border-[#EF4444]/20 dark:border-[#F87171]/20 text-[#EF4444] dark:text-[#F87171]',
                      )}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Content Panel
// ---------------------------------------------------------------------------

function ContentPanel({
  activeSection,
  marketFilter,
  setMarketFilter,
  liquidityMetrics,
  marketFlowData,
  sectorData,
  recommendationData,
}: {
  activeSection: SectionId;
  marketFilter: string;
  setMarketFilter: (f: string) => void;
  liquidityMetrics: LiquidityMetric[];
  marketFlowData: MarketFlowDetail[];
  sectorData: SectorDetail[];
  recommendationData: Recommendation[];
}) {
  const markets = ['All', 'Crypto', 'Stocks', 'Metals', 'Bonds'];

  return (
    <div className="space-y-6">
      {/* Market filter — shown for L3 */}
      {activeSection === 'l3' && (
        <div className="flex gap-px bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden w-max">
          {markets.map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={cn(
                'px-2.5 py-1.5 text-[10px] font-sans uppercase tracking-wider transition-colors min-w-[48px]',
                marketFilter === m
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                  : 'bg-white dark:bg-black text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'l1' && <L1Liquidity metrics={liquidityMetrics} />}
      {activeSection === 'l2' && <L2Markets flows={marketFlowData} />}
      {activeSection === 'rotation' && <RotationMatrix flows={marketFlowData} />}
      {activeSection === 'l3' && <L3Sectors sectors={sectorData} marketFilter={marketFilter} />}
      {activeSection === 'l4' && <L4Recommendation recs={recommendationData} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FlowPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('l1');
  const [marketFilter, setMarketFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any>(null);

  // Fetch Capital Flow data from API
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch('/api/capital-flow/summary');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setApiData(json.data || json);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load Capital Flow data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Map API data to UI types
  const liquidityMetrics = useMemo(() => mapLiquidityMetrics(apiData?.globalLiquidity), [apiData]);
  const marketFlowData = useMemo(() => mapMarketFlows(apiData?.markets), [apiData]);
  const sectorData = useMemo(() => mapSectors(apiData?.markets), [apiData]);
  const recommendationData = useMemo(() => mapRecommendations(apiData?.recommendation, apiData?.sellRecommendation), [apiData]);
  const biasInfo = useMemo(() => getBiasInfo(apiData?.liquidityBias || 'neutral'), [apiData]);

  const handleNavClick = useCallback((id: SectionId) => {
    setActiveSection(id);
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    authFetch('/api/capital-flow/summary')
      .then(res => { if (!res.ok) throw new Error(`API error: ${res.status}`); return res.json(); })
      .then(json => setApiData(json.data || json))
      .catch(err => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
              <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
            </div>
            <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
              FLOW
            </span>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              L1 · L2 · L3 · L4 · Capital Flow Intelligence
            </span>
          </div>
        </div>

        {/* Mobile: Horizontal tab bar */}
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
                <span className="text-[9px] opacity-50 mr-1">{item.tag}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Sidebar + Content */}
        <div className="mt-4 flex-1 min-h-0 flex gap-0">

          {/* Sidebar */}
          <nav className="hidden lg:block w-52 shrink-0 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto scrollbar-none pr-3 py-1">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.title} className={cn(gi > 0 && 'mt-5')}>
                <div className="text-[9px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em] mb-2 px-2">
                  {group.title}
                </div>
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
                        <span className={cn(
                          'text-[9px] font-sans tabular-nums w-4 shrink-0',
                          isActive
                            ? 'text-[#14B8A6] dark:text-[#5EEAD4]'
                            : 'text-neutral-400 dark:text-neutral-600',
                        )}>
                          {item.tag}
                        </span>
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

            {/* Sidebar summary — dynamic from API */}
            <div className="mt-6 px-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-[9px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">
                Bias
              </span>
              {loading ? (
                <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', biasInfo.dot)} />
                    <span className={cn('text-xs font-sans font-semibold', biasInfo.color)}>
                      {biasInfo.label}
                    </span>
                  </div>
                  <p className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 mt-1.5 leading-relaxed">
                    {biasInfo.description}
                  </p>
                </>
              )}
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none lg:pl-5 py-1 pb-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 text-[#14B8A6] animate-spin" />
                <span className="text-xs font-sans text-neutral-400 dark:text-neutral-500">Loading Capital Flow data...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
                <span className="text-xs font-sans text-neutral-500 dark:text-neutral-400">{error}</span>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans text-[#14B8A6] border border-[#14B8A6]/30 rounded-sm hover:bg-[#14B8A6]/5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : (
              <ContentPanel
                activeSection={activeSection}
                marketFilter={marketFilter}
                setMarketFilter={setMarketFilter}
                liquidityMetrics={liquidityMetrics}
                marketFlowData={marketFlowData}
                sectorData={sectorData}
                recommendationData={recommendationData}
              />
            )}
          </main>
        </div>

      </div>
    </div>
  );
}
