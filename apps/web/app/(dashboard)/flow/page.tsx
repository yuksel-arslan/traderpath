'use client';

// =============================================================================
// Flow — Capital Flow Deep Drill (L1 · L2 · L3)
// Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useMemo } from 'react';
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
    <span className={cn('inline-flex items-center gap-0.5 font-mono', textSize, color)}>
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
    <span className={cn('px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded', styles[phase] || styles.MID)}>
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
    <span className={cn('text-[10px] font-mono uppercase tracking-wider', styles[signal] || '')}>
      {signal === 'entering' ? '↗ Entering' : signal === 'exiting' ? '↘ Exiting' : '→ Stable'}
    </span>
  );
}

function SectionLabel({ label, layer, count }: { label: string; layer: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{layer}</span>
        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">{count}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// L1: Global Liquidity Deep View
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
              {/* Signal dot */}
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                m.signal === 'bullish' ? 'bg-[#22C55E] dark:bg-[#4ADE80]' :
                m.signal === 'bearish' ? 'bg-[#EF4444] dark:bg-[#F87171]' :
                'bg-neutral-400 dark:bg-neutral-500',
              )} />

              {/* Label + value */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono uppercase tracking-wider truncate">
                    {m.label}
                  </span>
                  <MiniSparkline data={m.sparkline} positive={m.change >= 0} />
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
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
                <div className="border-t border-neutral-100 dark:border-neutral-800/50 pt-2">
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
// L2: Market Flow Deep View
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
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">{f.market}</span>
                <PhaseBadge phase={f.phase} days={f.daysInPhase} />
              </div>
              <RotationBadge signal={f.rotationSignal} />
            </div>

            {/* Flow metrics grid */}
            <div className="grid grid-cols-3 gap-px bg-neutral-100 dark:bg-neutral-800/50 rounded-sm overflow-hidden mb-2">
              {[
                { label: '7D', value: f.flow7d },
                { label: '30D', value: f.flow30d },
                { label: '90D', value: f.flow90d },
              ].map((item) => (
                <div key={item.label} className="bg-white dark:bg-black p-2 text-center">
                  <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">{item.label}</div>
                  <div className={cn(
                    'text-sm font-mono font-semibold tabular-nums',
                    item.value > 0 ? 'text-[#22C55E] dark:text-[#4ADE80]' : item.value < 0 ? 'text-[#EF4444] dark:text-[#F87171]' : 'text-neutral-500',
                  )}>
                    {item.value > 0 ? '+' : ''}{item.value.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
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
// L3: Sector Deep View
// ---------------------------------------------------------------------------

function L3Sectors({ sectors, marketFilter }: { sectors: SectorDetail[]; marketFilter: string }) {
  const filtered = useMemo(() => {
    if (marketFilter === 'All') return sectors;
    return sectors.filter((s) => s.market === marketFilter);
  }, [sectors, marketFilter]);

  return (
    <section>
      <SectionLabel layer="L3" label="Sector Activity" count={filtered.length} />
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                <th className="text-left p-2.5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Sector</th>
                <th className="text-left p-2.5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Market</th>
                <th className="text-right p-2.5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">7D Flow</th>
                <th className="text-right p-2.5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden sm:table-cell">30D Flow</th>
                <th className="text-right p-2.5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Dom.</th>
                <th className="text-center p-2.5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Trend</th>
                <th className="text-left p-2.5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">Top Assets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {filtered.map((s) => (
                <tr key={s.name} className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                  <td className="p-2.5 font-medium text-neutral-900 dark:text-white">{s.name}</td>
                  <td className="p-2.5 text-neutral-400 dark:text-neutral-500 font-mono text-[10px]">{s.market}</td>
                  <td className="p-2.5 text-right"><Delta value={s.flow7d} /></td>
                  <td className="p-2.5 text-right hidden sm:table-cell"><Delta value={s.flow30d} /></td>
                  <td className="p-2.5 text-right font-mono text-neutral-500 dark:text-neutral-400 hidden sm:table-cell tabular-nums">{s.dominance}%</td>
                  <td className="p-2.5 text-center">
                    {s.trending === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E] dark:text-[#4ADE80] mx-auto" />}
                    {s.trending === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#EF4444] dark:text-[#F87171] mx-auto" />}
                    {s.trending === 'flat' && <Minus className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 mx-auto" />}
                  </td>
                  <td className="p-2.5 hidden md:table-cell">
                    <div className="flex gap-1">
                      {s.topAssets.map((a) => (
                        <span key={a} className="px-1 py-0.5 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400">
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Rotation Matrix
// ---------------------------------------------------------------------------

function RotationMatrix({ flows }: { flows: MarketFlowDetail[] }) {
  return (
    <section>
      <SectionLabel layer="L2" label="Rotation Matrix" />
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-black p-4">
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
                    'text-lg font-mono font-bold tabular-nums',
                    isActive ? 'text-[#22C55E] dark:text-[#4ADE80]'
                    : isExiting ? 'text-[#EF4444] dark:text-[#F87171]'
                    : 'text-neutral-400 dark:text-neutral-500',
                  )}>
                    {f.flow7d > 0 ? '+' : ''}{f.flow7d.toFixed(0)}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{f.market}</span>
              </div>
            );
          })}
        </div>
        {/* Flow arrows */}
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
          <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 text-center">
            Capital rotating: Bonds → Metals → Stocks → <span className="text-[#22C55E] dark:text-[#4ADE80] font-semibold">Crypto</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FlowPage() {
  const [marketFilter, setMarketFilter] = useState('All');
  const markets = ['All', 'Crypto', 'Stocks', 'Metals', 'Bonds'];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              L1 · L2 · L3
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              Capital Flow Intelligence
            </span>
          </div>

          {/* Market filter */}
          <div className="flex gap-px bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden">
            {markets.map((m) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={cn(
                  'px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors min-w-[48px]',
                  marketFilter === m
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-black text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Left: L1 Liquidity */}
          <div className="lg:col-span-5 space-y-4">
            <L1Liquidity metrics={liquidityMetrics} />
            <RotationMatrix flows={marketFlows} />
          </div>

          {/* Right: L2 + L3 */}
          <div className="lg:col-span-7 space-y-4">
            <L2Markets flows={marketFlows} />
            <L3Sectors sectors={sectors} marketFilter={marketFilter} />
          </div>
        </div>
      </div>
    </div>
  );
}
