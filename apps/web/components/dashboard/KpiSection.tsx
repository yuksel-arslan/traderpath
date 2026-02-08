'use client';

import Link from 'next/link';
import { Gem, Plus, Globe, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ===========================================
// Design Tokens
// ===========================================
const COLORS = {
  turkuaz: '#4dd0e1',
  neonGreen: '#00f5c4',
  coral: '#ff5f5f',
  bg: '#041020',
} as const;

// ===========================================
// Types
// ===========================================
interface GlobalLiquidity {
  fedBalanceSheet: {
    value: number;
    change30d: number;
    trend: 'expanding' | 'contracting' | 'stable';
  };
  m2MoneySupply: {
    value: number;
    change30d: number;
    yoyGrowth: number;
  };
  dxy: {
    value: number;
    change7d: number;
    trend: 'strengthening' | 'weakening' | 'stable';
  };
  vix: {
    value: number;
    level: 'extreme_fear' | 'fear' | 'neutral' | 'complacent';
  };
}

interface MarketFlow {
  market: string;
  flow7d: number;
  flow30d: number;
  phase: string;
  daysInPhase: number;
  rotationSignal: string | null;
}

interface KpiSectionProps {
  capitalFlow: {
    globalLiquidity: GlobalLiquidity;
    liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
    markets: MarketFlow[];
  } | null;
  credits: number;
  selectedMarkets: string[];
}

// ===========================================
// Skeleton Loader
// ===========================================
function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
      <div className="h-3 w-24 rounded bg-white/10 animate-pulse mb-4" />
      <div className="flex flex-col items-center gap-3">
        <div className="w-36 h-20 rounded bg-white/5 animate-pulse" />
        <div className="h-5 w-20 rounded bg-white/10 animate-pulse" />
        <div className="flex gap-4">
          <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ===========================================
// SVG Arc Gauge (Modern thin-line style)
// ===========================================
function ArcGauge({ bias, fedTrend, dxyValue, vixLevel }: {
  bias: 'risk_on' | 'risk_off' | 'neutral';
  fedTrend: string;
  dxyValue: number;
  vixLevel: string;
}) {
  // Gauge geometry
  const cx = 60, cy = 58, r = 44;
  const startAngle = -210; // left edge
  const endAngle = 30;     // right edge
  const totalSweep = endAngle - startAngle; // 240 degrees

  // Needle position: risk_off=left, neutral=center, risk_on=right
  const needleFraction = bias === 'risk_on' ? 0.85 : bias === 'risk_off' ? 0.15 : 0.5;
  const needleAngle = startAngle + totalSweep * needleFraction;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  // Arc helper (SVG arc path)
  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const s = (startDeg * Math.PI) / 180;
    const e = (endDeg * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(s);
    const y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e);
    const y2 = cy + radius * Math.sin(e);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  const biasLabel = bias === 'risk_on' ? 'RISK ON' : bias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL';
  const biasColor = bias === 'risk_on' ? COLORS.neonGreen : bias === 'risk_off' ? COLORS.coral : '#94a3b8';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-20 mb-2">
        <svg viewBox="0 0 120 70" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gaugeGradRiskOff" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={COLORS.coral} stopOpacity={0.8} />
              <stop offset="100%" stopColor={COLORS.coral} stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="gaugeGradNeutral" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#64748b" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="gaugeGradRiskOn" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={COLORS.neonGreen} stopOpacity={0.2} />
              <stop offset="100%" stopColor={COLORS.neonGreen} stopOpacity={0.8} />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeLinecap="round" />

          {/* Colored segments */}
          <path d={arcPath(startAngle, startAngle + totalSweep * 0.33, r)} fill="none" stroke="url(#gaugeGradRiskOff)" strokeWidth="3" strokeLinecap="round" />
          <path d={arcPath(startAngle + totalSweep * 0.33, startAngle + totalSweep * 0.66, r)} fill="none" stroke="url(#gaugeGradNeutral)" strokeWidth="3" strokeLinecap="round" />
          <path d={arcPath(startAngle + totalSweep * 0.66, endAngle, r)} fill="none" stroke="url(#gaugeGradRiskOn)" strokeWidth="3" strokeLinecap="round" />

          {/* Needle */}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="3" fill="white" />

          {/* Glow dot at needle tip */}
          <circle cx={nx} cy={ny} r="2" fill={biasColor}>
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      <span className="text-base font-bold tracking-tight" style={{ color: biasColor }}>{biasLabel}</span>

      <div className="flex items-center gap-3 mt-2">
        <span className="text-[11px] text-gray-500">
          Fed:{' '}
          <span className={cn(
            'font-mono',
            fedTrend === 'expanding' ? 'text-[#00f5c4]' :
            fedTrend === 'contracting' ? 'text-[#ff5f5f]' : 'text-gray-400'
          )}>
            {typeof fedTrend === 'string' ? fedTrend.charAt(0).toUpperCase() + fedTrend.slice(1) : 'N/A'}
          </span>
        </span>
        <span className="text-[11px] text-gray-500">
          DXY: <span className="font-mono text-gray-300">{dxyValue.toFixed(1)}</span>
        </span>
        <span className="text-[11px] text-gray-500">
          VIX:{' '}
          <span className={cn(
            'font-mono',
            vixLevel === 'complacent' || vixLevel === 'neutral' ? 'text-[#00f5c4]' : 'text-[#ff5f5f]'
          )}>
            {typeof vixLevel === 'string' ? vixLevel.charAt(0).toUpperCase() + vixLevel.slice(1).replace('_', ' ') : 'N/A'}
          </span>
        </span>
      </div>
    </div>
  );
}

// ===========================================
// Market Bias Bars
// ===========================================
function BiasBar({ markets }: { markets: { market: string; flow7d: number; phase: string }[] }) {
  if (!markets || markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <BarChart3 className="w-6 h-6 text-gray-600 mb-2" />
        <p className="text-xs text-gray-500">No data</p>
      </div>
    );
  }

  const sorted = [...markets].sort((a, b) => b.flow7d - a.flow7d);
  const maxFlow = Math.max(...sorted.map(m => Math.abs(m.flow7d)), 1);

  return (
    <div className="space-y-3">
      {sorted.slice(0, 3).map(m => {
        const pct = Math.min(Math.abs(m.flow7d) / maxFlow, 1) * 100;
        const isPositive = m.flow7d >= 0;
        const barColor = isPositive ? COLORS.neonGreen : COLORS.coral;

        return (
          <div key={m.market} className="flex items-center gap-3">
            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-white/5 text-gray-400 shrink-0">
              {m.market.charAt(0).toUpperCase()}
            </span>
            <span className="w-14 text-xs font-medium text-gray-400 capitalize truncate">
              {m.market}
            </span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="w-14 text-right text-xs font-bold font-mono tabular-nums" style={{ color: barColor }}>
              {isPositive ? '+' : ''}{m.flow7d.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================
// Glassmorphism Card Wrapper
// ===========================================
function GlassCard({ title, children, className, glowActive }: {
  title: string;
  children: React.ReactNode;
  className?: string;
  glowActive?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 transition-all duration-300',
      glowActive && 'shadow-[0_0_15px_rgba(77,208,225,0.3)]',
      className
    )}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-4">{title}</p>
      {children}
    </div>
  );
}

// ===========================================
// Credits Card Content
// ===========================================
function CreditsContent({ credits }: { credits: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-2 mb-1">
        <Gem className="w-5 h-5 text-amber-400" />
        <span className="text-3xl font-black text-white font-mono tabular-nums">{credits.toLocaleString('en-US')}</span>
      </div>
      {credits < 10 && credits > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 mb-3">Running low</span>
      )}
      {credits === 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff5f5f]/20 text-[#ff5f5f] mb-3">No credits</span>
      )}
      {credits >= 10 && <div className="mb-3" />}
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[#041020] text-sm font-semibold transition-all duration-200 min-h-[48px]"
        style={{ backgroundColor: COLORS.turkuaz }}
      >
        <Plus className="w-3.5 h-3.5" />
        Buy More
      </Link>
      <Link href="/rewards" className="mt-2 text-xs text-gray-400 hover:text-[#4dd0e1] transition">
        Earn free credits
      </Link>
    </div>
  );
}

// ===========================================
// Main KPI Section
// ===========================================
export function KpiSection({ capitalFlow, credits, selectedMarkets }: KpiSectionProps) {
  // Helper to map CF market name to filter type
  function cfMarketToFilterType(cfMarket: string): string {
    if (cfMarket === 'stocks') return 'bist';
    if (cfMarket === 'metals') return 'metals';
    if (cfMarket === 'bonds') return 'bonds';
    return 'crypto';
  }

  if (!capitalFlow) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiSkeleton />
        <KpiSkeleton />
        <GlassCard title="Credits Balance">
          <CreditsContent credits={credits} />
        </GlassCard>
      </div>
    );
  }

  const filteredMarkets = capitalFlow.markets
    .filter(m => m && m.market && selectedMarkets.includes(cfMarketToFilterType(m.market)))
    .map(m => ({ market: m.market, flow7d: m.flow7d ?? 0, phase: m.phase || 'mid' }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Global Liquidity Gauge */}
      <GlassCard title="Global Liquidity" glowActive={capitalFlow.liquidityBias === 'risk_on'}>
        <ArcGauge
          bias={capitalFlow.liquidityBias}
          fedTrend={capitalFlow.globalLiquidity.fedBalanceSheet.trend}
          dxyValue={capitalFlow.globalLiquidity.dxy.value}
          vixLevel={capitalFlow.globalLiquidity.vix.level}
        />
      </GlassCard>

      {/* Market Bias */}
      <GlassCard title="Market Bias">
        <BiasBar markets={filteredMarkets} />
      </GlassCard>

      {/* Credits Balance */}
      <GlassCard title="Credits Balance">
        <CreditsContent credits={credits} />
      </GlassCard>
    </div>
  );
}
