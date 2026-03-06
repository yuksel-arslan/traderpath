'use client';

import { cn } from '../../lib/utils';
import { formatPriceValue, formatPrice } from '../../lib/utils';
import { ScoreRing, VerdictBadge } from '../ui/intelligence';

interface TradePlan {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  rr: number;
  direction: 'LONG' | 'SHORT';
}

interface SelectedAsset {
  symbol: string;
  price: number;
  change24h: number;
  aiScore: number;
  verdict: string;
  direction: string;
}

interface TradeVisualizerMetricsProps {
  selectedAsset: SelectedAsset | null;
  tradePlan: TradePlan | null;
}

function pctFromEntry(entry: number, target: number): string {
  if (!entry || entry === 0) return '--';
  const pct = ((target - entry) / entry) * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export function TradeHeader({ asset }: { asset: SelectedAsset }) {
  return (
    <div
      className="flex items-center justify-between mb-3 px-1 py-2 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3 px-2">
        <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {asset.symbol}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-white/40">
          {asset.direction === 'LONG' ? (
            <span className="text-[#00F5A0]">LONG</span>
          ) : asset.direction === 'SHORT' ? (
            <span className="text-[#FF4757]">SHORT</span>
          ) : (
            '--'
          )}
        </span>
        <VerdictBadge verdict={asset.verdict} />
      </div>
      <div className="flex items-center gap-3 px-2">
        <span
          className="text-sm font-bold text-gray-900 dark:text-white tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {formatPrice(asset.price)}
        </span>
        <span
          className={cn(
            'text-xs font-mono tabular-nums',
            asset.change24h > 0
              ? 'text-[#00F5A0]'
              : asset.change24h < 0
              ? 'text-[#FF4757]'
              : 'text-gray-400',
          )}
        >
          {asset.change24h > 0 ? '+' : ''}
          {asset.change24h.toFixed(2)}%
        </span>
        <ScoreRing score={asset.aiScore} size={32} strokeWidth={2.5} />
      </div>
    </div>
  );
}

export function TradeLevelCards({ tradePlan }: { tradePlan: TradePlan }) {
  const levels = [
    {
      label: 'Entry',
      value: tradePlan.entry,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.05)',
      borderColor: 'rgba(59,130,246,0.15)',
      pct: null,
    },
    {
      label: 'SL',
      value: tradePlan.sl,
      color: '#FF4757',
      bg: 'rgba(255,71,87,0.05)',
      borderColor: 'rgba(255,71,87,0.15)',
      pct: pctFromEntry(tradePlan.entry, tradePlan.sl),
    },
    {
      label: 'TP1',
      value: tradePlan.tp1,
      color: '#00F5A0',
      bg: 'rgba(0,245,160,0.05)',
      borderColor: 'rgba(0,245,160,0.15)',
      pct: pctFromEntry(tradePlan.entry, tradePlan.tp1),
    },
    {
      label: 'TP2',
      value: tradePlan.tp2,
      color: '#00F5A0',
      bg: 'rgba(0,245,160,0.05)',
      borderColor: 'rgba(0,245,160,0.15)',
      pct: pctFromEntry(tradePlan.entry, tradePlan.tp2),
    },
    {
      label: 'R:R',
      value: tradePlan.rr,
      color: tradePlan.rr >= 2 ? '#00F5A0' : tradePlan.rr >= 1 ? '#FFB800' : '#FF4757',
      bg:
        tradePlan.rr >= 2
          ? 'rgba(0,245,160,0.05)'
          : tradePlan.rr >= 1
          ? 'rgba(255,184,0,0.05)'
          : 'rgba(255,71,87,0.05)',
      borderColor:
        tradePlan.rr >= 2
          ? 'rgba(0,245,160,0.15)'
          : tradePlan.rr >= 1
          ? 'rgba(255,184,0,0.15)'
          : 'rgba(255,71,87,0.15)',
      pct: null,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 mt-2">
      {levels.map((item) => (
        <div
          key={item.label}
          className="rounded-xl p-2 text-center"
          style={{
            background: item.bg,
            border: `1px solid ${item.borderColor}`,
          }}
        >
          <div
            className="text-[10px] uppercase tracking-widest mb-0.5"
            style={{ color: `${item.color}80` }}
          >
            {item.label}
          </div>
          <div
            className="text-xs font-bold tabular-nums"
            style={{ color: item.color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {item.label === 'R:R'
              ? `${item.value.toFixed(1)}x`
              : formatPriceValue(item.value)}
          </div>
          {item.pct && (
            <div className="text-[9px] mt-0.5" style={{ color: `${item.color}80` }}>
              {item.pct}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ForecastPanel({
  selectedAsset,
}: {
  selectedAsset: SelectedAsset;
}) {
  const isLong = selectedAsset.direction === 'LONG';
  const score = selectedAsset.aiScore;
  const pctMove = (score / 100) * 8;
  const p50Target = selectedAsset.price * (1 + ((isLong ? pctMove : -pctMove) / 100));

  return (
    <div
      className="rounded-xl p-3 mt-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-[#00F5A0]">
          Forecast 48h
        </span>
        <span className="text-[10px] font-mono text-gray-400 dark:text-white/40 tabular-nums">
          P50 target:{' '}
          <span className="text-white font-semibold">
            {formatPrice(p50Target)}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-gray-400 dark:text-white/40">Expected: </span>
          <span
            className={cn(
              'text-xs font-mono font-bold tabular-nums',
              isLong ? 'text-[#00F5A0]' : 'text-[#FF4757]',
            )}
          >
            {isLong ? '+' : '-'}
            {pctMove.toFixed(1)}%
          </span>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(score, 100)}%`,
                background: 'linear-gradient(90deg, #00F5A0, #00D4FF)',
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-[#00D4FF] tabular-nums">
            {score}%
          </span>
        </div>
      </div>

    </div>
  );
}

export function RiskMetrics({
  tradePlan,
  selectedAsset,
}: {
  tradePlan: TradePlan;
  selectedAsset: SelectedAsset;
}) {
  const positionSize = 2.5; // % portfolio
  const maxLoss = Math.abs(tradePlan.entry - tradePlan.sl) * (positionSize / 100) * 10000; // simplified

  return (
    <div
      className="rounded-xl p-3 mt-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40 block mb-2">
        Risk Metrics
      </span>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <span className="text-[10px] text-gray-400 dark:text-white/40 block">
            Position Size
          </span>
          <span className="text-xs font-bold text-white font-mono tabular-nums">
            {positionSize}% portfolio
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 dark:text-white/40 block">
            Max Loss
          </span>
          <span className="text-xs font-bold text-[#FF4757] font-mono tabular-nums">
            ${maxLoss.toFixed(0)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 dark:text-white/40 block">
            R:R Ratio
          </span>
          <span
            className={cn(
              'text-xs font-bold font-mono tabular-nums',
              tradePlan.rr >= 2
                ? 'text-[#00F5A0]'
                : tradePlan.rr >= 1
                ? 'text-[#FFB800]'
                : 'text-[#FF4757]',
            )}
          >
            {tradePlan.rr.toFixed(1)}x
          </span>
        </div>
      </div>
    </div>
  );
}
