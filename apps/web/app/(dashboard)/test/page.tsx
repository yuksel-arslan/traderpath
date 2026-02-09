'use client';

// =============================================================================
// TraderPath Hyper-Minimalist Financial Intelligence Terminal
// L1-L7 Layered Decision Engine
// =============================================================================

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  BarChart3,
  Layers,
  Eye,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { authFetch } from '../../../lib/api';
import { cn, formatNumber, formatPrice, formatPriceValue } from '../../../lib/utils';

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

interface VerdictData {
  action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
  confidence: number;
  primaryMarket: string;
  reason: string;
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
// Mock Data Generators (will be replaced with real API calls)
// ---------------------------------------------------------------------------

function generateMacroMetrics(): MacroMetric[] {
  return [
    { label: 'M2 Supply', value: '$21.8T', delta: 2.3, signal: 'bullish' },
    { label: 'Fed BS', value: '$7.2T', delta: -1.1, signal: 'bearish' },
    { label: 'DXY', value: '103.42', delta: -0.8, signal: 'bullish' },
    { label: 'VIX', value: '14.2', delta: -3.2, signal: 'bullish' },
    { label: 'US10Y', value: '4.28%', delta: 0.12, signal: 'neutral' },
    { label: 'Yield Curve', value: '+0.32', delta: 0.15, signal: 'bullish' },
  ];
}

function generateMarketFlows(): MarketFlow[] {
  return [
    { market: 'Crypto', flow7d: 5.2, flow30d: 12.8, velocity: 2.1, phase: 'EARLY' },
    { market: 'Stocks', flow7d: 1.8, flow30d: 4.2, velocity: 0.6, phase: 'MID' },
    { market: 'Metals', flow7d: -0.4, flow30d: 2.1, velocity: -1.2, phase: 'LATE' },
    { market: 'Bonds', flow7d: -2.1, flow30d: -5.3, velocity: -0.8, phase: 'EXIT' },
  ];
}

function generateSectors(): SectorData[] {
  return [
    { name: 'DeFi', flow: 8.4, dominance: 22.3, trending: 'up' },
    { name: 'Layer 2', flow: 6.1, dominance: 15.7, trending: 'up' },
    { name: 'AI Tokens', flow: 4.8, dominance: 8.2, trending: 'up' },
    { name: 'Meme', flow: -2.3, dominance: 5.1, trending: 'down' },
    { name: 'Gaming', flow: 1.2, dominance: 3.4, trending: 'flat' },
    { name: 'RWA', flow: 3.7, dominance: 4.8, trending: 'up' },
  ];
}

function generateScreenerData(): ScreenerAsset[] {
  const assets: ScreenerAsset[] = [
    { rank: 1, symbol: 'BTC', name: 'Bitcoin', price: 97842.50, change24h: 3.42, volume: 42800000000, aiScore: 92, trend: 'STRONG_UP', verdict: 'GO', direction: 'LONG', market: 'Crypto' },
    { rank: 2, symbol: 'ETH', name: 'Ethereum', price: 3245.80, change24h: 2.18, volume: 18500000000, aiScore: 87, trend: 'UP', verdict: 'GO', direction: 'LONG', market: 'Crypto' },
    { rank: 3, symbol: 'SOL', name: 'Solana', price: 198.42, change24h: 5.67, volume: 4200000000, aiScore: 84, trend: 'STRONG_UP', verdict: 'GO', direction: 'LONG', market: 'Crypto' },
    { rank: 4, symbol: 'AAPL', name: 'Apple Inc.', price: 242.56, change24h: 0.82, volume: 52000000, aiScore: 78, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Stocks' },
    { rank: 5, symbol: 'NVDA', name: 'NVIDIA Corp.', price: 892.30, change24h: -1.24, volume: 38000000, aiScore: 81, trend: 'FLAT', verdict: 'WAIT', direction: 'NEUTRAL', market: 'Stocks' },
    { rank: 6, symbol: 'GLD', name: 'Gold ETF', price: 214.82, change24h: -0.34, volume: 8200000, aiScore: 65, trend: 'DOWN', verdict: 'AVOID', direction: 'SHORT', market: 'Metals' },
    { rank: 7, symbol: 'AVAX', name: 'Avalanche', price: 38.92, change24h: 4.12, volume: 980000000, aiScore: 79, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Crypto' },
    { rank: 8, symbol: 'LINK', name: 'Chainlink', price: 18.45, change24h: 6.84, volume: 720000000, aiScore: 83, trend: 'STRONG_UP', verdict: 'GO', direction: 'LONG', market: 'Crypto' },
    { rank: 9, symbol: 'DOGE', name: 'Dogecoin', price: 0.1842, change24h: -2.18, volume: 1200000000, aiScore: 42, trend: 'DOWN', verdict: 'AVOID', direction: 'SHORT', market: 'Crypto' },
    { rank: 10, symbol: 'SPY', name: 'S&P 500 ETF', price: 528.42, change24h: 0.42, volume: 68000000, aiScore: 74, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Stocks' },
    { rank: 11, symbol: 'SLV', name: 'Silver ETF', price: 28.34, change24h: -1.12, volume: 4200000, aiScore: 58, trend: 'FLAT', verdict: 'WAIT', direction: 'NEUTRAL', market: 'Metals' },
    { rank: 12, symbol: 'TLT', name: 'Treasury Bond', price: 92.18, change24h: 0.24, volume: 12000000, aiScore: 52, trend: 'DOWN', verdict: 'AVOID', direction: 'SHORT', market: 'Bonds' },
    { rank: 13, symbol: 'ARB', name: 'Arbitrum', price: 1.28, change24h: 7.42, volume: 480000000, aiScore: 76, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Crypto' },
    { rank: 14, symbol: 'AAVE', name: 'Aave', price: 312.50, change24h: 3.82, volume: 280000000, aiScore: 80, trend: 'UP', verdict: 'GO', direction: 'LONG', market: 'Crypto' },
    { rank: 15, symbol: 'OP', name: 'Optimism', price: 2.84, change24h: 5.18, volume: 320000000, aiScore: 77, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Crypto' },
    { rank: 16, symbol: 'MSFT', name: 'Microsoft', price: 442.80, change24h: 1.08, volume: 24000000, aiScore: 82, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Stocks' },
    { rank: 17, symbol: 'QQQ', name: 'Nasdaq 100', price: 498.62, change24h: 0.62, volume: 42000000, aiScore: 76, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Stocks' },
    { rank: 18, symbol: 'INJ', name: 'Injective', price: 24.82, change24h: 8.24, volume: 210000000, aiScore: 75, trend: 'STRONG_UP', verdict: 'GO', direction: 'LONG', market: 'Crypto' },
    { rank: 19, symbol: 'FET', name: 'Fetch.ai', price: 2.18, change24h: 4.56, volume: 180000000, aiScore: 72, trend: 'UP', verdict: 'COND', direction: 'LONG', market: 'Crypto' },
    { rank: 20, symbol: 'MATIC', name: 'Polygon', price: 0.92, change24h: -0.82, volume: 420000000, aiScore: 61, trend: 'FLAT', verdict: 'WAIT', direction: 'NEUTRAL', market: 'Crypto' },
  ];
  return assets;
}

function generateVerdict(): VerdictData {
  return {
    action: 'BUY',
    confidence: 78,
    primaryMarket: 'Crypto',
    reason: 'Strong capital inflow to crypto. DeFi and L2 sectors leading. Early phase with accelerating velocity.',
  };
}

function generateTradePlan(asset: ScreenerAsset): TradePlan {
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
    <span className={cn('inline-flex items-center gap-0.5 font-mono text-xs', color, className)}>
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
      'px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded',
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
    <span className={cn('font-mono text-xs font-semibold', styles[verdict] || 'text-neutral-500')}>
      {verdict}
    </span>
  );
}

function DirectionTag({ direction }: { direction: string }) {
  if (direction === 'LONG') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[#22C55E] dark:text-[#4ADE80] text-xs font-mono">
        <ArrowUpRight className="w-3 h-3" /> L
      </span>
    );
  }
  if (direction === 'SHORT') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[#EF4444] dark:text-[#F87171] text-xs font-mono">
        <ArrowDownRight className="w-3 h-3" /> S
      </span>
    );
  }
  return <span className="text-neutral-400 dark:text-neutral-500 text-xs font-mono">—</span>;
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
  return <span className={cn('font-mono text-xs', c.color)}>{c.label}</span>;
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
      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300 w-6 text-right tabular-nums">
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
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          {layer}
        </span>
        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
          {count}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// L1: Global Liquidity Macro Grid
// ---------------------------------------------------------------------------

function L1MacroGrid({ metrics }: { metrics: MacroMetric[] }) {
  return (
    <section>
      <SectionLabel layer="L1" label="Global Liquidity" count={metrics.length} />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-black p-2.5 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1">
              <SignalDot signal={m.signal} />
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider truncate">
                {m.label}
              </span>
            </div>
            <span className="text-sm font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
              {m.value}
            </span>
            {m.delta !== undefined && <Delta value={m.delta} />}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L2: Market Flow
// ---------------------------------------------------------------------------

function L2MarketFlow({ flows }: { flows: MarketFlow[] }) {
  return (
    <section>
      <SectionLabel layer="L2" label="Market Flow" count={flows.length} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        {flows.map((f) => (
          <div
            key={f.market}
            className="bg-white dark:bg-black p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-900 dark:text-white">
                {f.market}
              </span>
              <PhaseBadge phase={f.phase} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">
                {f.flow7d > 0 ? '+' : ''}{f.flow7d.toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">7D</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
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
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900/50">
              <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Sector</th>
              <th className="text-right p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Flow 7D</th>
              <th className="text-right p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Dom.</th>
              <th className="text-center p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {sectors.map((s) => (
              <tr key={s.name} className="bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                <td className="p-2 font-medium text-neutral-900 dark:text-white">{s.name}</td>
                <td className="p-2 text-right">
                  <Delta value={s.flow} />
                </td>
                <td className="p-2 text-right font-mono text-neutral-500 dark:text-neutral-400 hidden sm:table-cell tabular-nums">
                  {s.dominance.toFixed(1)}%
                </td>
                <td className="p-2 text-center">
                  {s.trending === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E] dark:text-[#4ADE80] mx-auto" />}
                  {s.trending === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#EF4444] dark:text-[#F87171] mx-auto" />}
                  {s.trending === 'flat' && <Minus className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L4: AI Verdict Engine
// ---------------------------------------------------------------------------

function L4Verdict({ verdict }: { verdict: VerdictData }) {
  const actionColor: Record<string, string> = {
    BUY: 'text-[#22C55E] dark:text-[#4ADE80]',
    SELL: 'text-[#EF4444] dark:text-[#F87171]',
    HOLD: 'text-[#F59E0B] dark:text-[#FBBF24]',
    AVOID: 'text-[#EF4444] dark:text-[#F87171]',
  };

  return (
    <section>
      <SectionLabel layer="L4" label="AI Verdict" />
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-black p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className={cn(
              'text-3xl sm:text-4xl font-mono font-bold tracking-tight',
              actionColor[verdict.action] || 'text-neutral-500',
            )}>
              {verdict.action}
            </span>
            <span className="ml-2 text-xs font-mono text-neutral-400 dark:text-neutral-500">
              {verdict.primaryMarket}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
              {verdict.confidence}%
            </div>
            <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Confidence
            </div>
          </div>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-light">
          {verdict.reason}
        </p>
        {/* Confidence bar */}
        <div className="mt-3 h-[2px] bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              verdict.confidence >= 70
                ? 'bg-[#22C55E] dark:bg-[#4ADE80]'
                : verdict.confidence >= 50
                ? 'bg-[#F59E0B] dark:bg-[#FBBF24]'
                : 'bg-[#EF4444] dark:bg-[#F87171]',
            )}
            style={{ width: `${verdict.confidence}%` }}
          />
        </div>
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

  const SortHeader = ({ label, sKey, className }: { label: string; sKey: SortKey; className?: string }) => (
    <th
      className={cn(
        'p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider cursor-pointer select-none hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors',
        className,
      )}
      onClick={() => handleSort(sKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortKey === sKey && (
          sortDir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
        )}
      </span>
    </th>
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
            className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
          />
        </div>
        {/* Market filter */}
        <div className="flex gap-px bg-neutral-200 dark:bg-neutral-800 rounded-sm overflow-hidden shrink-0">
          {markets.map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={cn(
                'px-2.5 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors min-w-[48px]',
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

      {/* Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                <SortHeader label="#" sKey="rank" className="text-center w-8" />
                <SortHeader label="Asset" sKey="symbol" className="text-left" />
                <SortHeader label="Price" sKey="price" className="text-right" />
                <SortHeader label="24h" sKey="change24h" className="text-right" />
                <SortHeader label="Volume" sKey="volume" className="text-right hidden md:table-cell" />
                <SortHeader label="AI Score" sKey="aiScore" className="text-left" />
                <SortHeader label="Trend" sKey="trend" className="text-center" />
                <th className="p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-center">Verdict</th>
                <th className="p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-center">Dir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {filtered.map((asset) => (
                <tr
                  key={asset.symbol}
                  onClick={() => onSelect(asset)}
                  className={cn(
                    'bg-white dark:bg-black cursor-pointer transition-colors',
                    selectedSymbol === asset.symbol
                      ? 'bg-neutral-100 dark:bg-neutral-900'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/30',
                  )}
                >
                  <td className="p-2 text-center font-mono text-neutral-400 dark:text-neutral-500 tabular-nums">
                    {asset.rank}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col">
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                        {asset.symbol}
                      </span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate max-w-[120px]">
                        {asset.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-right font-mono font-medium text-neutral-900 dark:text-white tabular-nums">
                    {formatPrice(asset.price)}
                  </td>
                  <td className="p-2 text-right">
                    <Delta value={asset.change24h} />
                  </td>
                  <td className="p-2 text-right font-mono text-neutral-500 dark:text-neutral-400 hidden md:table-cell tabular-nums">
                    {formatNumber(asset.volume)}
                  </td>
                  <td className="p-2 w-28">
                    <ScoreBar score={asset.aiScore} />
                  </td>
                  <td className="p-2 text-center">
                    <TrendIndicator trend={asset.trend} />
                  </td>
                  <td className="p-2 text-center">
                    <VerdictBadgeSmall verdict={asset.verdict} />
                  </td>
                  <td className="p-2 text-center">
                    <DirectionTag direction={asset.direction} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                    No assets match your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// L6: Sell-Side Verdict
// ---------------------------------------------------------------------------

function L6SellVerdict() {
  return (
    <section>
      <SectionLabel layer="L6" label="Risk Assessment" />
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-black p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-[#F59E0B] dark:text-[#FBBF24]">
              CAUTION
            </span>
            <span className="ml-2 text-xs font-mono text-neutral-400 dark:text-neutral-500">
              Bonds
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
              62%
            </div>
            <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Confidence
            </div>
          </div>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-light">
          Capital outflow from bonds accelerating. Yield curve steepening signals potential regime shift. Monitor DXY for confirmation.
        </p>
        <div className="mt-3 h-[2px] bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#F59E0B] dark:bg-[#FBBF24] transition-all duration-700"
            style={{ width: '62%' }}
          />
        </div>
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
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize and update chart
  useEffect(() => {
    if (!mounted || !chartContainerRef.current || !selectedAsset) return;

    let chart: ReturnType<typeof import('lightweight-charts').createChart> | null = null;

    const initChart = async () => {
      const lc = await import('lightweight-charts');

      if (!chartContainerRef.current) return;

      const isDark = resolvedTheme === 'dark';

      chart = lc.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: {
          background: { type: lc.ColorType.Solid, color: isDark ? '#000000' : '#FFFFFF' },
          textColor: isDark ? '#737373' : '#A3A3A3',
          fontFamily: "'Inter', 'Geist Sans', monospace",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: isDark ? '#171717' : '#F5F5F5' },
          horzLines: { color: isDark ? '#171717' : '#F5F5F5' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: {
            color: isDark ? '#404040' : '#D4D4D4',
            width: 1,
            style: lc.LineStyle.Dotted,
            labelBackgroundColor: isDark ? '#262626' : '#F5F5F5',
          },
          horzLine: {
            color: isDark ? '#404040' : '#D4D4D4',
            width: 1,
            style: lc.LineStyle.Dotted,
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

      // Generate mock candle data
      const basePrice = selectedAsset.price;
      const now = Math.floor(Date.now() / 1000);
      const candles: lc.CandlestickData<lc.Time>[] = [];

      for (let i = 100; i >= 0; i--) {
        const time = (now - i * 3600) as lc.Time;
        const noise = (Math.random() - 0.5) * basePrice * 0.02;
        const trendBias = ((100 - i) / 100) * basePrice * 0.05 * (selectedAsset.direction === 'LONG' ? 1 : -1);
        const open = basePrice + noise + trendBias;
        const close = open + (Math.random() - 0.45) * basePrice * 0.015;
        const high = Math.max(open, close) + Math.random() * basePrice * 0.008;
        const low = Math.min(open, close) - Math.random() * basePrice * 0.008;

        candles.push({ time, open, high, low, close });
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
        // Entry
        series.createPriceLine({
          price: tradePlan.entry,
          color: '#3B82F6',
          lineWidth: 1,
          lineStyle: lc.LineStyle.Solid,
          axisLabelVisible: true,
          title: 'ENTRY',
        });
        // Stop Loss
        series.createPriceLine({
          price: tradePlan.sl,
          color: '#EF4444',
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'SL',
        });
        // TP1
        series.createPriceLine({
          price: tradePlan.tp1,
          color: '#22C55E',
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'TP1',
        });
        // TP2
        series.createPriceLine({
          price: tradePlan.tp2,
          color: '#84CC16',
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'TP2',
        });
      }

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

    const cleanup = initChart();

    return () => {
      cleanup?.then((fn) => fn?.());
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
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-black h-[300px] sm:h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-5 h-5 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
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
          <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
            {selectedAsset.symbol}
          </span>
          <DirectionTag direction={selectedAsset.direction} />
          <VerdictBadgeSmall verdict={selectedAsset.verdict} />
        </div>
        <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
          {formatPrice(selectedAsset.price)}
        </span>
      </div>

      {/* Chart */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-black">
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
            <div key={item.label} className="bg-white dark:bg-black p-2 text-center">
              <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">
                {item.label}
              </div>
              <div className={cn('text-xs font-mono font-semibold tabular-nums', item.color)}>
                {item.label === 'R:R' ? `${item.value.toFixed(1)}x` : formatPriceValue(item.value)}
              </div>
            </div>
          ))}
        </div>
      )}
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
    <header className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        {/* Minimalist TraderPath mark */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
          <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
        </div>
        <span className="text-sm font-mono font-bold text-neutral-900 dark:text-white tracking-tight">
          TraderPath
        </span>
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          Terminal
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] dark:bg-[#4ADE80] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E] dark:bg-[#4ADE80]" />
          </span>
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden sm:inline">
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
// Forecast Path (probabilistic projection on chart)
// ---------------------------------------------------------------------------

function ForecastPath({ selectedAsset }: { selectedAsset: ScreenerAsset | null }) {
  if (!selectedAsset) return null;

  const isLong = selectedAsset.direction === 'LONG';
  const score = selectedAsset.aiScore;
  const pctMove = (score / 100) * 8; // max 8% projected move

  return (
    <div className="mt-2 border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-black p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
          Price Path Projection (48h)
        </span>
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
          AI Score: {score}
        </span>
      </div>

      {/* SVG Probabilistic bands */}
      <svg viewBox="0 0 400 80" className="w-full h-16 sm:h-20">
        {/* P90 band */}
        <path
          d={isLong
            ? 'M0,65 C100,62 200,45 300,25 L400,20 L400,70 L300,68 C200,72 100,72 0,70 Z'
            : 'M0,15 C100,18 200,35 300,55 L400,60 L400,10 L300,12 C200,8 100,8 0,10 Z'
          }
          className="fill-[#22C55E]/5 dark:fill-[#4ADE80]/5"
        />
        {/* P50 band */}
        <path
          d={isLong
            ? 'M0,60 C100,56 200,42 300,30 L400,28 L400,62 L300,58 C200,65 100,67 0,65 Z'
            : 'M0,20 C100,24 200,38 300,50 L400,52 L400,18 L300,22 C200,15 100,13 0,15 Z'
          }
          className="fill-[#22C55E]/10 dark:fill-[#4ADE80]/10"
        />
        {/* P50 line (median) */}
        <path
          d={isLong
            ? 'M0,62 C100,58 200,48 300,38 L400,34'
            : 'M0,18 C100,22 200,32 300,42 L400,46'
          }
          fill="none"
          className="stroke-[#22C55E] dark:stroke-[#4ADE80]"
          strokeWidth="1.5"
          strokeDasharray="4,2"
        />
        {/* Current price line */}
        <line x1="0" y1="40" x2="400" y2="40" className="stroke-neutral-300 dark:stroke-neutral-700" strokeWidth="0.5" strokeDasharray="2,2" />
        {/* Labels */}
        <text x="385" y={isLong ? 18 : 58} className="fill-[#22C55E]/40 dark:fill-[#4ADE80]/40 text-[8px] font-mono" textAnchor="end">P90</text>
        <text x="385" y={isLong ? 32 : 50} className="fill-[#22C55E]/60 dark:fill-[#4ADE80]/60 text-[8px] font-mono" textAnchor="end">P50</text>
        <text x="385" y="43" className="fill-neutral-400 text-[8px] font-mono" textAnchor="end">NOW</text>
      </svg>

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
          Expected: {isLong ? '+' : '-'}{pctMove.toFixed(1)}%
        </span>
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
          P50 target: {formatPrice(selectedAsset.price * (1 + (isLong ? pctMove : -pctMove) / 100))}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Terminal Page
// ---------------------------------------------------------------------------

export default function TestPage() {
  // Data state
  const [macroMetrics] = useState(generateMacroMetrics);
  const [marketFlows] = useState(generateMarketFlows);
  const [sectors] = useState(generateSectors);
  const [screenerData] = useState(generateScreenerData);
  const [verdict] = useState(generateVerdict);
  const [selectedAsset, setSelectedAsset] = useState<ScreenerAsset | null>(null);
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);

  // Auto-select first asset
  useEffect(() => {
    if (screenerData.length > 0 && !selectedAsset) {
      const top = screenerData[0];
      setSelectedAsset(top);
      setTradePlan(generateTradePlan(top));
    }
  }, [screenerData, selectedAsset]);

  const handleAssetSelect = useCallback((asset: ScreenerAsset) => {
    setSelectedAsset(asset);
    setTradePlan(generateTradePlan(asset));
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-8">
        <TerminalHeader />

        {/* L1-L3: Macro Intelligence (left column on desktop) */}
        {/* L4-L7: Decision + Execution (right column on desktop) */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Left column: Macro context */}
          <div className="lg:col-span-5 space-y-4">
            <L1MacroGrid metrics={macroMetrics} />
            <L2MarketFlow flows={marketFlows} />
            <L3Sectors sectors={sectors} />
            <L4Verdict verdict={verdict} />
            <L6SellVerdict />
          </div>

          {/* Right column: Screener + Chart */}
          <div className="lg:col-span-7 space-y-4">
            <L5Screener
              assets={screenerData}
              selectedSymbol={selectedAsset?.symbol ?? null}
              onSelect={handleAssetSelect}
            />
            <L7TradeVisualizer
              selectedAsset={selectedAsset}
              tradePlan={tradePlan}
            />
            <ForecastPath selectedAsset={selectedAsset} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
              TraderPath Financial Intelligence Terminal
            </span>
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
              Data for educational purposes only
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
