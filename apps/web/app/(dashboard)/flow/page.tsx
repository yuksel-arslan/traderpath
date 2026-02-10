'use client';

// =============================================================================
// Flow — Capital Flow Deep Drill (L1 · L2 · L3 · L4)
// Sidebar + Content Panel — Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn, formatNumber } from '../../../lib/utils';

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
// Mock Data
// ---------------------------------------------------------------------------

const liquidityMetrics: LiquidityMetric[] = [
  { id: 'm2', label: 'M2 Money Supply', value: '$21.8T', change: 2.3, signal: 'bullish', sparkline: [18.2, 18.5, 19.1, 19.8, 20.2, 20.8, 21.1, 21.4, 21.8], description: 'Global M2 expanding — risk assets favored' },
  { id: 'fed', label: 'Fed Balance Sheet', value: '$7.2T', change: -1.1, signal: 'bearish', sparkline: [8.9, 8.5, 8.2, 7.9, 7.8, 7.6, 7.4, 7.3, 7.2], description: 'Quantitative tightening continues — headwind for liquidity' },
  { id: 'dxy', label: 'US Dollar Index', value: '103.42', change: -0.8, signal: 'bullish', sparkline: [106, 105.8, 105.2, 104.8, 104.5, 104.1, 103.8, 103.6, 103.4], description: 'Dollar weakening — tailwind for risk assets and commodities' },
  { id: 'vix', label: 'VIX Volatility', value: '14.2', change: -3.2, signal: 'bullish', sparkline: [22, 20, 18.5, 17.2, 16.1, 15.4, 14.8, 14.5, 14.2], description: 'Low fear — market complacency favors continuation' },
  { id: '10y', label: '10Y Treasury Yield', value: '4.28%', change: 0.12, signal: 'neutral', sparkline: [4.1, 4.15, 4.18, 4.22, 4.20, 4.24, 4.25, 4.27, 4.28], description: 'Yields stable — bond market indecisive' },
  { id: 'yc', label: 'Yield Curve (10Y-2Y)', value: '+0.32%', change: 0.15, signal: 'bullish', sparkline: [-0.4, -0.3, -0.15, -0.05, 0.05, 0.12, 0.18, 0.25, 0.32], description: 'Curve normalizing — recession fears easing' },
];

const marketFlows: MarketFlowDetail[] = [
  { market: 'Crypto', flow7d: 5.2, flow30d: 12.8, flow90d: 28.4, velocity: 2.1, acceleration: 0.8, phase: 'EARLY', daysInPhase: 18, rotationSignal: 'entering', marketCap: '$2.8T', dominance: 32.4 },
  { market: 'Stocks', flow7d: 1.8, flow30d: 4.2, flow90d: 8.6, velocity: 0.6, acceleration: -0.2, phase: 'MID', daysInPhase: 45, rotationSignal: 'stable', marketCap: '$52.1T', dominance: 48.2 },
  { market: 'Metals', flow7d: -0.4, flow30d: 2.1, flow90d: 5.2, velocity: -1.2, acceleration: -0.5, phase: 'LATE', daysInPhase: 72, rotationSignal: 'exiting', marketCap: '$4.2T', dominance: 8.6 },
  { market: 'Bonds', flow7d: -2.1, flow30d: -5.3, flow90d: -12.4, velocity: -0.8, acceleration: 0.1, phase: 'EXIT', daysInPhase: 95, rotationSignal: 'exiting', marketCap: '$128T', dominance: 10.8 },
];

const sectors: SectorDetail[] = [
  { name: 'DeFi', market: 'Crypto', flow7d: 8.4, flow30d: 22.1, dominance: 22.3, trending: 'up', topAssets: ['AAVE', 'UNI', 'MKR'] },
  { name: 'Layer 2', market: 'Crypto', flow7d: 6.1, flow30d: 18.4, dominance: 15.7, trending: 'up', topAssets: ['ARB', 'OP', 'MATIC'] },
  { name: 'AI Tokens', market: 'Crypto', flow7d: 4.8, flow30d: 15.2, dominance: 8.2, trending: 'up', topAssets: ['FET', 'RNDR', 'TAO'] },
  { name: 'RWA', market: 'Crypto', flow7d: 3.7, flow30d: 10.8, dominance: 4.8, trending: 'up', topAssets: ['ONDO', 'MKR', 'LINK'] },
  { name: 'Tech', market: 'Stocks', flow7d: 2.4, flow30d: 6.8, dominance: 28.4, trending: 'up', topAssets: ['NVDA', 'MSFT', 'AAPL'] },
  { name: 'Finance', market: 'Stocks', flow7d: 0.8, flow30d: 2.1, dominance: 14.2, trending: 'flat', topAssets: ['JPM', 'V', 'GS'] },
  { name: 'Gaming', market: 'Crypto', flow7d: 1.2, flow30d: 3.4, dominance: 3.4, trending: 'flat', topAssets: ['IMX', 'GALA', 'AXS'] },
  { name: 'Meme', market: 'Crypto', flow7d: -2.3, flow30d: -4.8, dominance: 5.1, trending: 'down', topAssets: ['DOGE', 'SHIB', 'PEPE'] },
  { name: 'Gold', market: 'Metals', flow7d: -0.2, flow30d: 2.4, dominance: 72.1, trending: 'flat', topAssets: ['GLD', 'IAU', 'XAUUSD'] },
  { name: 'Silver', market: 'Metals', flow7d: -1.1, flow30d: -0.8, dominance: 18.4, trending: 'down', topAssets: ['SLV', 'XAGUSD'] },
];

const recommendations: Recommendation[] = [
  {
    direction: 'BUY',
    market: 'Crypto',
    phase: 'EARLY',
    confidence: 78,
    reason: 'Capital entering crypto at accelerating pace. M2 expanding, DXY weakening — optimal entry window.',
    suggestedAssets: ['BTC', 'ETH', 'SOL', 'AAVE'],
  },
  {
    direction: 'SELL',
    market: 'Bonds',
    phase: 'EXIT',
    confidence: 65,
    reason: 'Capital exiting bonds for 95 days. Velocity negative. Rotation toward risk assets confirmed.',
    suggestedAssets: ['TLT', 'IEF', 'BND'],
  },
];

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
}: {
  activeSection: SectionId;
  marketFilter: string;
  setMarketFilter: (f: string) => void;
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
      {activeSection === 'l2' && <L2Markets flows={marketFlows} />}
      {activeSection === 'rotation' && <RotationMatrix flows={marketFlows} />}
      {activeSection === 'l3' && <L3Sectors sectors={sectors} marketFilter={marketFilter} />}
      {activeSection === 'l4' && <L4Recommendation recs={recommendations} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FlowPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('l1');
  const [marketFilter, setMarketFilter] = useState('All');

  const handleNavClick = useCallback((id: SectionId) => {
    setActiveSection(id);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 pt-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              L1 · L2 · L3 · L4
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              Capital Flow Intelligence
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

            {/* Sidebar summary */}
            <div className="mt-6 px-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-[9px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">
                Bias
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] dark:bg-[#4ADE80]" />
                <span className="text-xs font-sans font-semibold text-[#22C55E] dark:text-[#4ADE80]">
                  RISK ON
                </span>
              </div>
              <p className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 mt-1.5 leading-relaxed">
                M2 expanding, DXY weakening. Capital entering crypto.
              </p>
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none lg:pl-5 py-1 pb-4">
            <ContentPanel
              activeSection={activeSection}
              marketFilter={marketFilter}
              setMarketFilter={setMarketFilter}
            />
          </main>
        </div>

        {/* Footer */}
        <footer className="shrink-0 py-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              Capital Flow Intelligence · L1–L4
            </span>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              Data for educational purposes only
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
