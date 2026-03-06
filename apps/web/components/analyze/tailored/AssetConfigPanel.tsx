'use client';

import { cn, formatPrice } from '@/lib/utils';
import { ScoreRing, VerdictBadge } from '@/components/ui/intelligence';
import { X, Zap, Shield, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Timeframe } from '@/components/analysis/TradeTypeSelector';
import type { DailyPassStatus } from '@/lib/analysis-types';

const CoinIcon = dynamic(
  () => import('@/components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /> }
);

const TIMEFRAMES: { value: Timeframe; label: string; type: string }[] = [
  { value: '5m', label: '5m', type: 'Scalp' },
  { value: '15m', label: '15m', type: 'Scalp' },
  { value: '30m', label: '30m', type: 'Day' },
  { value: '1h', label: '1H', type: 'Day' },
  { value: '4h', label: '4H', type: 'Day' },
  { value: '1d', label: '1D', type: 'Swing' },
];

interface AssetConfigPanelProps {
  symbol: string;
  name: string;
  price?: number;
  change24h?: number;
  score?: number;
  verdict?: string;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onRun: () => void;
  onClose: () => void;
  dailyPassStatus: DailyPassStatus | null;
  purchasingPass: boolean;
  onPurchasePass: () => void;
}

export function AssetConfigPanel({
  symbol,
  name,
  price,
  change24h,
  score,
  verdict,
  timeframe,
  onTimeframeChange,
  onRun,
  onClose,
  dailyPassStatus,
  purchasingPass,
  onPurchasePass,
}: AssetConfigPanelProps) {
  const estimatedTime = '~45 seconds';

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08]">
      {/* Header: Asset info + close */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CoinIcon symbol={symbol} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {symbol}
              </h3>
              {verdict && <VerdictBadge verdict={verdict} />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-white/40">{name}</span>
              {price !== undefined && price > 0 && (
                <span className="text-xs font-mono text-gray-500 dark:text-white/50 tabular-nums">
                  {formatPrice(price)}
                </span>
              )}
              {change24h !== undefined && (
                <span
                  className="text-[10px] font-mono tabular-nums font-semibold"
                  style={{ color: change24h >= 0 ? '#00F5A0' : '#FF4757' }}
                >
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {score !== undefined && score > 0 && (
            <ScoreRing score={score} size={40} strokeWidth={3} />
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeframe selection */}
      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30 mb-2 block">
          Timeframe
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={cn(
                'py-2.5 rounded-xl text-sm font-semibold transition-all',
                timeframe === tf.value
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60',
              )}
              style={timeframe === tf.value ? { background: 'linear-gradient(135deg, #00F5A0, #00D4FF)' } : undefined}
            >
              {tf.label}
              <span className="block text-[9px] opacity-60 font-normal">{tf.type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Pass Status */}
      {dailyPassStatus && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl mb-4 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06]">
          <span className="text-[10px] text-gray-400 dark:text-white/40">Daily Pass:</span>
          {dailyPassStatus.hasPass ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00F5A0]/10 text-[#00F5A0]">
                Active
              </span>
              <span className="text-[10px] font-mono text-gray-400 dark:text-white/40">
                {dailyPassStatus.maxUsage - dailyPassStatus.usageCount}/{dailyPassStatus.maxUsage} left
              </span>
            </div>
          ) : (
            <button
              onClick={onPurchasePass}
              disabled={purchasingPass}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #FFB800, #FF8C00)' }}
            >
              {purchasingPass ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy Pass - 100 Credits'}
            </button>
          )}
        </div>
      )}

      {/* Tailored note */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl mb-4 bg-[#FFB800]/5 border border-[#FFB800]/10">
        <Shield className="w-4 h-4 text-[#FFB800] mt-0.5 shrink-0" />
        <p className="text-[10px] text-[#FFB800]/80">
          Tailored analysis skips Capital Flow alignment. For best results, use Automated Analysis.
        </p>
      </div>

      {/* Estimate + Run button */}
      <div className="flex items-center justify-between mb-3 text-[10px] text-gray-400 dark:text-white/30">
        <span>{estimatedTime}</span>
      </div>

      <button
        onClick={onRun}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)' }}
      >
        <Zap className="w-4 h-4" />
        Run Analysis on {symbol}
      </button>
    </div>
  );
}
