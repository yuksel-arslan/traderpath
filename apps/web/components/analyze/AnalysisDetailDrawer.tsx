'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Brain,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────
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

interface MarketFlow {
  market: string;
  currentValue: number;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  phase: Phase;
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  sectors?: { name: string; flow7d: number; flow30d: number; dominance: number; trending: 'up' | 'down' | 'stable'; phase?: Phase }[];
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: Phase;
  action: string;
  direction: string;
  reason: string;
  sectors?: string[];
  confidence: number;
  suggestedAssets?: { symbol: string; name: string; market: string; sector?: string; riskLevel: string; reason: string }[];
}

interface CapitalFlowSummary {
  timestamp: string;
  globalLiquidity: GlobalLiquidity;
  liquidityBias: LiquidityBias;
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
  sellRecommendation?: FlowRecommendation;
  activeRotation: { from: string; to: string; confidence: number; estimatedDuration: string } | null;
  insights?: { layer1: string; layer2: string; layer3: string; layer4: string; ragLayer1?: string; ragLayer2?: string; ragLayer3?: string; ragLayer4?: string };
}

export type DrawerLayer = 'L1' | 'L2' | 'L3' | 'L4' | null;

interface AnalysisDetailDrawerProps {
  open: boolean;
  layer: DrawerLayer;
  capitalFlow: CapitalFlowSummary | null;
  onClose: () => void;
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
const phaseBg: Record<Phase, string> = {
  early: 'bg-emerald-500/20',
  mid: 'bg-yellow-500/20',
  late: 'bg-orange-500/20',
  exit: 'bg-red-500/20',
};

const biasLabel: Record<LiquidityBias, string> = { risk_on: 'RISK ON', risk_off: 'RISK OFF', neutral: 'NEUTRAL' };
const biasColor: Record<LiquidityBias, string> = { risk_on: 'text-emerald-400', risk_off: 'text-red-400', neutral: 'text-blue-400' };
const biasBg: Record<LiquidityBias, string> = { risk_on: 'bg-emerald-500/20', risk_off: 'bg-red-500/20', neutral: 'bg-blue-500/20' };
const BiasIcon: Record<LiquidityBias, typeof TrendingUp> = { risk_on: TrendingUp, risk_off: TrendingDown, neutral: Minus };

const LAYER_META: Record<Exclude<DrawerLayer, null>, { title: string; accent: string; icon: typeof DollarSign }> = {
  L1: { title: 'Global Liquidity', accent: '#4dd0e1', icon: DollarSign },
  L2: { title: 'Market Flow', accent: '#22d3ee', icon: TrendingUp },
  L3: { title: 'Sector Activity', accent: '#a78bfa', icon: Layers },
  L4: { title: 'AI Recommendation', accent: '#fbbf24', icon: Brain },
};

// ─── Sub-renderers ────────────────────────────────────────────────────
function L1Content({ gl, bias }: { gl: GlobalLiquidity; bias: LiquidityBias }) {
  const Icon = BiasIcon[bias];
  const rows: [string, string][] = [
    ['Liquidity Bias', biasLabel[bias]],
    ['Net Liquidity 30d', `${safeFixed(gl.netLiquidity?.change30d ?? gl.m2MoneySupply?.change30d)}%`],
    ['M2 YoY Growth', `${safeFixed(gl.m2MoneySupply?.yoyGrowth)}%`],
    ['DXY Trend', (gl.dxy?.trend ?? 'stable').toUpperCase()],
    ['DXY 7d Change', `${safeFixed(gl.dxy?.change7d)}%`],
    ['VIX', gl.vix?.value?.toFixed(1) ?? '-'],
    ['VIX Level', (gl.vix?.level ?? '-').toUpperCase()],
    ['Yield Curve (10Y-2Y)', `${safeFixed(gl.yieldCurve?.spread10y2y, 2)}%`],
    ['Inverted', gl.yieldCurve?.inverted ? 'YES' : 'NO'],
    ['Fed BS 30d', `${safeFixed(gl.fedBalanceSheet?.change30d)}%`],
  ];
  return (
    <div className="space-y-3">
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', biasBg[bias])}>
        <Icon className={cn('w-4 h-4', biasColor[bias])} />
        <span className={cn('text-sm font-bold', biasColor[bias])}>{biasLabel[bias]}</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-white/5 last:border-0">
              <td className="py-2 text-slate-400">{label}</td>
              <td className="py-2 text-right font-medium text-white">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function L2Content({ markets, primary }: { markets: MarketFlow[]; primary?: string }) {
  return (
    <div className="space-y-3">
      {markets.filter(m => m && m.market).map(m => {
        const isPrimary = m.market === primary;
        return (
          <div
            key={m.market}
            className={cn(
              'p-3 rounded-xl border',
              isPrimary ? 'border-[#4dd0e1]/40 bg-[#4dd0e1]/5' : 'border-white/5 bg-white/[0.02]'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-sm font-bold capitalize', isPrimary && 'text-[#4dd0e1]')}>
                {m.market}
                {isPrimary && <span className="ml-1.5 text-[9px] font-medium bg-[#4dd0e1]/20 text-[#4dd0e1] px-1.5 py-0.5 rounded">PRIMARY</span>}
              </span>
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', phaseBg[m.phase ?? 'mid'], phaseColor[m.phase ?? 'mid'])}>
                {(m.phase ?? 'mid').toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="block text-slate-500">7d Flow</span>
                <span className={cn('font-semibold', (m.flow7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {(m.flow7d ?? 0) >= 0 ? '+' : ''}{safeFixed(m.flow7d)}%
                </span>
              </div>
              <div>
                <span className="block text-slate-500">30d Flow</span>
                <span className={cn('font-semibold', (m.flow30d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {(m.flow30d ?? 0) >= 0 ? '+' : ''}{safeFixed(m.flow30d)}%
                </span>
              </div>
              <div>
                <span className="block text-slate-500">Velocity</span>
                <span className="font-semibold text-white">{safeFixed(m.flowVelocity, 2)}</span>
              </div>
            </div>
            {m.rotationSignal && (
              <div className="mt-2 text-[10px] text-slate-400">
                Rotation: <span className="font-medium text-white capitalize">{m.rotationSignal}</span>
                &nbsp;&bull;&nbsp;{m.daysInPhase}d in phase
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function L3Content({ markets, primary }: { markets: MarketFlow[]; primary?: string }) {
  const target = markets.find(m => m.market === primary);
  const sectors = target?.sectors ?? [];
  if (sectors.length === 0) {
    return <p className="text-xs text-slate-500 py-4 text-center">No sector data available</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
        Sectors in <span className="text-white font-semibold capitalize">{primary ?? 'primary market'}</span>
      </p>
      {sectors.map((s, i) => (
        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
          <div>
            <span className="text-xs font-medium text-white">{s.name}</span>
            <span className="block text-[10px] text-slate-500">{safeFixed(s.dominance)}% dominance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded',
              s.trending === 'up' ? 'bg-emerald-500/20 text-emerald-400' :
              s.trending === 'down' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-500/20 text-slate-400'
            )}>
              {s.trending === 'up' ? 'Inflow' : s.trending === 'down' ? 'Outflow' : 'Stable'}
            </span>
            <span className={cn(
              'text-[11px] font-semibold',
              (s.flow7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {(s.flow7d ?? 0) >= 0 ? '+' : ''}{safeFixed(s.flow7d)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function L4Content({ rec, sellRec }: { rec: FlowRecommendation | null | undefined; sellRec?: FlowRecommendation }) {
  if (!rec) return <p className="text-xs text-slate-500 text-center py-4">No recommendation data</p>;
  const isBuy = rec.direction?.toUpperCase() === 'BUY';
  return (
    <div className="space-y-4">
      {/* Primary recommendation */}
      <div className={cn(
        'p-3 rounded-xl border',
        isBuy ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
      )}>
        <div className="flex items-center gap-2 mb-2">
          {isBuy ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
          <span className={cn('text-sm font-bold', isBuy ? 'text-emerald-400' : 'text-red-400')}>
            {rec.direction?.toUpperCase() || 'NEUTRAL'} {rec.primaryMarket?.toUpperCase()}
          </span>
          <span className="ml-auto text-[10px] font-medium text-slate-400">{rec.confidence ?? 0}% confidence</span>
        </div>
        <p className="text-xs text-slate-300 mb-2">{rec.reason}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold', phaseBg[rec.phase ?? 'mid'], phaseColor[rec.phase ?? 'mid'])}>
            {(rec.phase ?? 'mid').toUpperCase()} PHASE
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-medium">
            Action: {(rec.action ?? 'wait').toUpperCase()}
          </span>
        </div>
        {rec.suggestedAssets && rec.suggestedAssets.length > 0 && (
          <div className="mt-3 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase">Suggested Assets</span>
            {rec.suggestedAssets.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">{a.symbol}</span>
                <span className="text-slate-400">{a.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sell recommendation */}
      {sellRec && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400">
              SELL {sellRec.primaryMarket?.toUpperCase()}
            </span>
            <span className="ml-auto text-[10px] font-medium text-slate-400">{sellRec.confidence ?? 0}%</span>
          </div>
          <p className="text-xs text-slate-300">{sellRec.reason}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────
export function AnalysisDetailDrawer({ open, layer, capitalFlow, onClose }: AnalysisDetailDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  }, [onClose]);

  if (!layer) return null;

  const meta = LAYER_META[layer];

  const renderContent = () => {
    if (!capitalFlow) return <p className="text-xs text-slate-500 text-center py-8">No data loaded.</p>;
    switch (layer) {
      case 'L1':
        return <L1Content gl={capitalFlow.globalLiquidity} bias={capitalFlow.liquidityBias ?? 'neutral'} />;
      case 'L2':
        return <L2Content markets={capitalFlow.markets ?? []} primary={capitalFlow.recommendation?.primaryMarket} />;
      case 'L3':
        return <L3Content markets={capitalFlow.markets ?? []} primary={capitalFlow.recommendation?.primaryMarket} />;
      case 'L4':
        return <L4Content rec={capitalFlow.recommendation ?? null} sellRec={capitalFlow.sellRecommendation} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 inset-x-0 z-50 max-h-[85vh] flex flex-col rounded-t-3xl overflow-hidden"
            style={{
              background: 'rgba(7, 16, 35, 0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: `0 -8px 40px rgba(0,0,0,0.5), 0 0 1px ${meta.accent}40`,
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${meta.accent}20` }}
                >
                  <meta.icon className="w-4 h-4" style={{ color: meta.accent }} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.accent }}>
                    {layer}
                  </span>
                  <h3 className="text-sm font-bold text-white -mt-0.5">{meta.title}</h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
