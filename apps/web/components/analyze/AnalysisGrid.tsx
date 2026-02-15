'use client';

import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Brain,
  Check,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AnalysisDetailDrawer, type DrawerLayer } from './AnalysisDetailDrawer';

// ─── Types (mirrors page-level types) ─────────────────────────────────
type Phase = 'early' | 'mid' | 'late' | 'exit';
type LiquidityBias = 'risk_on' | 'risk_off' | 'neutral';

interface GlobalLiquidity {
  fedBalanceSheet: { value: number; change30d: number; trend: string };
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number };
  dxy: { value: number; change7d: number; trend: string };
  vix: { value: number; level: string };
  yieldCurve: { spread10y2y: number; inverted: boolean; interpretation: string };
  netLiquidity?: { value: number; change7d: number; change30d: number; trend: string; interpretation: string };
}

interface Sector {
  name: string;
  flow7d: number;
  flow30d: number;
  dominance: number;
  trending: 'up' | 'down' | 'stable';
  flowChange?: number;
  phase?: Phase;
}

interface SuggestedAsset {
  symbol: string;
  name: string;
  market: string;
  sector?: string;
  riskLevel: string;
  reason: string;
  direction?: string;
  confidence?: number;
}

interface MarketFlow {
  market: string;
  currentValue: number;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  phase: Phase;
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  sectors?: Sector[];
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: Phase;
  action: string;
  direction: string;
  reason: string;
  sectors?: string[];
  confidence: number;
  suggestedAssets?: SuggestedAsset[];
}

interface LayerInsights {
  ragLayer1?: string;
  ragLayer2?: string;
  ragLayer3?: string;
  ragLayer4?: string;
}

interface CapitalFlowSummary {
  timestamp: string;
  globalLiquidity: GlobalLiquidity;
  liquidityBias: LiquidityBias;
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
  sellRecommendation?: FlowRecommendation;
  activeRotation: { from: string; to: string; confidence: number; estimatedDuration: string } | null;
  insights?: LayerInsights;
}

interface AnalysisGridProps {
  capitalFlow: CapitalFlowSummary | null;
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────
const safeFixed = (v: number | undefined | null, d = 1) =>
  v == null || isNaN(v) ? '0' : v.toFixed(d);

const phaseColor: Record<Phase, string> = {
  early: 'text-emerald-400',
  mid: 'text-yellow-400',
  late: 'text-orange-400',
  exit: 'text-red-400',
};

const biasLabel: Record<LiquidityBias, string> = { risk_on: 'RISK ON', risk_off: 'RISK OFF', neutral: 'NEUTRAL' };
const biasColor: Record<LiquidityBias, string> = { risk_on: 'text-emerald-400', risk_off: 'text-red-400', neutral: 'text-blue-400' };
const biasBg: Record<LiquidityBias, string> = { risk_on: 'bg-emerald-500/15', risk_off: 'bg-red-500/15', neutral: 'bg-blue-500/15' };
const BiasIcon: Record<LiquidityBias, typeof TrendingUp> = { risk_on: TrendingUp, risk_off: TrendingDown, neutral: Minus };

// ─── Grid Card ────────────────────────────────────────────────────────
function GridCard({
  layer,
  title,
  accent,
  icon: Icon,
  active,
  children,
  onClick,
}: {
  layer: string;
  title: string;
  accent: string;
  icon: typeof DollarSign;
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col p-3 sm:p-4 rounded-xl text-left transition-all duration-200 border',
        'bg-white dark:bg-[#071023] active:scale-[0.97]',
        active
          ? 'border-[#4dd0e1]/50 shadow-[0_0_20px_rgba(77,208,225,0.15)]'
          : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
      )}
    >
      {/* Layer badge + chevron */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${accent}20` }}>
            <Icon className="w-3 h-3" style={{ color: accent }} />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accent }}>
            {layer}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
      </div>

      {/* Title */}
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">{title}</span>

      {/* Summary content */}
      <div className="flex-1">{children}</div>

      {/* Check indicator */}
      <div className="absolute top-2 right-2 sm:hidden">
        <Check className="w-3 h-3 text-[#4dd0e1]/60" />
      </div>
    </button>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-28 rounded-xl bg-white dark:bg-[#071023] border border-slate-200 dark:border-white/5 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export function AnalysisGrid({ capitalFlow, loading }: AnalysisGridProps) {
  const [activeLayer, setActiveLayer] = useState<DrawerLayer>(null);

  const openDrawer = (layer: DrawerLayer) => setActiveLayer(layer);
  const closeDrawer = () => setActiveLayer(null);

  if (loading) return <GridSkeleton />;

  if (!capitalFlow) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-white dark:bg-[#071023] border border-slate-200 dark:border-white/5 flex items-center justify-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-600">No data</span>
          </div>
        ))}
      </div>
    );
  }

  const bias = capitalFlow.liquidityBias ?? 'neutral';
  const Icon = BiasIcon[bias];
  const primaryMarket = capitalFlow.recommendation?.primaryMarket;
  const topMarkets = capitalFlow.markets?.filter(m => m && m.market).slice(0, 3) ?? [];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* L1: Global Liquidity */}
        <GridCard
          layer="L1"
          title="Global Liquidity"
          accent="#4dd0e1"
          icon={DollarSign}
          active={activeLayer === 'L1'}
          onClick={() => openDrawer('L1')}
        >
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold w-fit', biasBg[bias], biasColor[bias])}>
            <Icon className="w-3 h-3" />
            {biasLabel[bias]}
          </div>
          <div className="mt-1.5 text-[10px] text-slate-500">
            Net: <span className="text-slate-900 dark:text-white font-medium">{safeFixed(capitalFlow.globalLiquidity?.netLiquidity?.change30d ?? capitalFlow.globalLiquidity?.m2MoneySupply?.change30d)}%</span>
          </div>
        </GridCard>

        {/* L2: Market Flow */}
        <GridCard
          layer="L2"
          title="Market Flow"
          accent="#22d3ee"
          icon={TrendingUp}
          active={activeLayer === 'L2'}
          onClick={() => openDrawer('L2')}
        >
          <div className="space-y-0.5">
            {topMarkets.map(m => (
              <div key={m.market} className="flex items-center justify-between text-[10px]">
                <span className={cn('capitalize', m.market === primaryMarket ? 'text-[#4dd0e1] font-semibold' : 'text-slate-600 dark:text-slate-400')}>
                  {m.market}
                </span>
                <span className={cn('font-medium', (m.flow7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {(m.flow7d ?? 0) >= 0 ? '+' : ''}{safeFixed(m.flow7d)}%
                </span>
              </div>
            ))}
          </div>
        </GridCard>

        {/* L3: Sectors */}
        <GridCard
          layer="L3"
          title="Sector Activity"
          accent="#a78bfa"
          icon={Layers}
          active={activeLayer === 'L3'}
          onClick={() => openDrawer('L3')}
        >
          {(() => {
            const sectors = capitalFlow.markets?.find(m => m.market === primaryMarket)?.sectors?.slice(0, 2);
            if (!sectors || sectors.length === 0) return <span className="text-[10px] text-slate-600">No sectors</span>;
            return (
              <div className="space-y-0.5">
                {sectors.map((s: Sector, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[70px]">{s.name}</span>
                    <span className={cn(
                      'font-medium',
                      s.trending === 'up' ? 'text-emerald-400' : s.trending === 'down' ? 'text-red-400' : 'text-slate-500'
                    )}>
                      {s.trending === 'up' ? 'In' : s.trending === 'down' ? 'Out' : '~'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </GridCard>

        {/* L4: AI Recommendation */}
        <GridCard
          layer="L4"
          title="AI Recommendation"
          accent="#fbbf24"
          icon={Brain}
          active={activeLayer === 'L4'}
          onClick={() => openDrawer('L4')}
        >
          {(() => {
            const dir = capitalFlow.recommendation?.direction?.toUpperCase();
            const isBuy = dir === 'BUY';
            return (
              <>
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold w-fit',
                  isBuy ? 'bg-emerald-500/15 text-emerald-400' : dir === 'SELL' ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400'
                )}>
                  {isBuy ? <TrendingUp className="w-3 h-3" /> : dir === 'SELL' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {dir || 'NEUTRAL'}
                </div>
                <div className="mt-1.5 text-[10px] text-slate-500">
                  <span className="text-slate-900 dark:text-white font-medium capitalize">{capitalFlow.recommendation?.primaryMarket}</span>
                  &nbsp;&bull;&nbsp;{capitalFlow.recommendation?.confidence ?? 0}%
                </div>
              </>
            );
          })()}
        </GridCard>
      </div>

      {/* Bottom Sheet Drawer */}
      <AnalysisDetailDrawer
        open={activeLayer !== null}
        layer={activeLayer}
        capitalFlow={capitalFlow as any}
        onClose={closeDrawer}
      />
    </>
  );
}
