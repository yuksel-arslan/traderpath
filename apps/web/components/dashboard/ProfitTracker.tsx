'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/ui/intelligence';

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'all';

interface ProfitTrackerProps {
  periodPnL: number;
  pnlViewMode: 'daily' | 'weekly' | 'monthly';
  setPnlViewMode: (v: 'daily' | 'weekly' | 'monthly') => void;
  winRate: number;
  totalTrades: number;
  equityCurve: number[];
}

const VIEW_MODES: { key: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { key: 'daily', label: '1D' },
  { key: 'weekly', label: '7D' },
  { key: 'monthly', label: '30D' },
];

export function ProfitTracker({
  periodPnL,
  pnlViewMode,
  setPnlViewMode,
  winRate,
  totalTrades,
  equityCurve,
}: ProfitTrackerProps) {
  const pnlColor = periodPnL >= 0 ? '#00F5A0' : '#FF4757';

  return (
    <div
      className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
          System Performance
        </span>
        <div className="flex gap-1">
          {VIEW_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setPnlViewMode(m.key)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-all',
                pnlViewMode === m.key
                  ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-6 mb-4">
        <div>
          <div
            className="text-3xl font-black"
            style={{ color: pnlColor, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {periodPnL === 0
              ? '--'
              : `${periodPnL >= 0 ? '+' : ''}${periodPnL.toFixed(1)}%`}
          </div>
          <div className="text-xs mt-1 text-gray-500 dark:text-white/35">
            {totalTrades} trades · {winRate > 0 ? `${winRate.toFixed(1)}% win rate` : 'No data'}
          </div>
        </div>
        <div className="flex-1 ml-4">
          {equityCurve.length > 0 ? (
            <Sparkline
              data={equityCurve}
              width={280}
              height={52}
              color={periodPnL >= 0 ? '#00F5A0' : '#FF4757'}
            />
          ) : (
            <div className="h-[52px] flex items-center justify-center text-xs text-gray-400 dark:text-white/30">
              No equity data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
