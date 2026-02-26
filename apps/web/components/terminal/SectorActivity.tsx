'use client';

import { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { TerminalSummaryBar } from './TerminalSummaryBar';

interface SectorData {
  name: string;
  market: string;
  flow: number;
  dominance: number;
  trending: 'up' | 'down' | 'flat';
  topAssets: string[];
}

interface SectorActivityProps {
  sectors: SectorData[];
  marketFilter: string;
  setMarketFilter: (f: string) => void;
}

type ViewMode = 'heatmap' | 'list';

function heatmapColor(change: number): string {
  if (change >= 3) return '#00F5A0';
  if (change >= 1) return 'rgba(0,245,160,0.5)';
  if (change >= -1) return 'rgba(255,255,255,0.1)';
  if (change >= -3) return 'rgba(255,71,87,0.5)';
  return '#FF4757';
}

function heatmapBg(change: number): string {
  if (change >= 3) return 'rgba(0,245,160,0.15)';
  if (change >= 1) return 'rgba(0,245,160,0.08)';
  if (change >= -1) return 'rgba(255,255,255,0.03)';
  if (change >= -3) return 'rgba(255,71,87,0.08)';
  return 'rgba(255,71,87,0.15)';
}

export function SectorActivity({
  sectors,
  marketFilter,
  setMarketFilter,
}: SectorActivityProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');

  const markets = ['All', 'Crypto', 'Stocks', 'Metals', 'Bonds', 'Commodities'];

  const filtered = useMemo(() => {
    if (marketFilter === 'All') return sectors;
    return sectors.filter((s) => s.market === marketFilter);
  }, [sectors, marketFilter]);

  // Top and weakest sector
  const sortedByFlow = [...filtered].sort((a, b) => b.flow - a.flow);
  const topSector = sortedByFlow[0];
  const weakestSector = sortedByFlow[sortedByFlow.length - 1];

  const summaryText =
    topSector && weakestSector
      ? `Top Sector: ${topSector.name} (${topSector.flow > 0 ? '+' : ''}${topSector.flow.toFixed(1)}%) | Weakest: ${weakestSector.name} (${weakestSector.flow > 0 ? '+' : ''}${weakestSector.flow.toFixed(1)}%)`
      : 'Loading sector data...';

  return (
    <section>
      <TerminalSummaryBar
        title={summaryText}
        subtitle={`${filtered.length} sectors tracked`}
        status={topSector && topSector.flow > 2 ? 'positive' : topSector && topSector.flow < -2 ? 'negative' : 'neutral'}
      />

      {/* Filter tabs + view toggle */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {markets.map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={cn(
                'px-2.5 py-1.5 text-[10px] uppercase tracking-wider rounded transition-colors whitespace-nowrap',
                marketFilter === m
                  ? 'bg-[#00D4FF]/10 text-[#00D4FF] font-semibold'
                  : 'text-gray-400 dark:text-white/40 hover:text-white',
              )}
              style={
                marketFilter === m
                  ? { border: '1px solid rgba(0,212,255,0.2)' }
                  : { border: '1px solid transparent' }
              }
            >
              {m}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setViewMode('heatmap')}
            className={cn(
              'px-2 py-1 text-[10px] rounded transition-colors',
              viewMode === 'heatmap'
                ? 'bg-white/[0.06] text-white'
                : 'text-gray-400 dark:text-white/30',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-2 py-1 text-[10px] rounded transition-colors',
              viewMode === 'list'
                ? 'bg-white/[0.06] text-white'
                : 'text-gray-400 dark:text-white/30',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Heatmap view */}
      {viewMode === 'heatmap' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 mb-4">
          {filtered.map((s) => {
            const span = s.dominance > 15 ? 2 : 1;
            return (
              <div
                key={s.name}
                className="rounded-lg p-2.5 transition-all hover:scale-[1.02] cursor-default"
                style={{
                  background: heatmapBg(s.flow),
                  border: `1px solid ${heatmapColor(s.flow)}30`,
                  gridColumn: span > 1 ? `span ${span}` : undefined,
                }}
              >
                <span className="text-[10px] font-semibold text-gray-900 dark:text-white block truncate">
                  {s.name}
                </span>
                <span
                  className="text-xs font-mono font-bold tabular-nums block mt-0.5"
                  style={{ color: heatmapColor(s.flow) }}
                >
                  {s.flow > 0 ? '+' : ''}
                  {s.flow.toFixed(1)}%
                </span>
                {s.topAssets.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {s.topAssets.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="text-[8px] px-1 py-0.5 rounded text-gray-400 dark:text-white/30"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-1 mb-4">
          {/* Header row */}
          <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30">
            <span className="flex-1 min-w-0">Sector</span>
            <span className="w-16 text-right shrink-0">Change</span>
            <span className="w-16 text-right shrink-0 hidden sm:block">Dominance</span>
            <span className="w-32 shrink-0 hidden md:block">Flow</span>
          </div>

          {filtered.map((s) => {
            const flowBarWidth = Math.min(Math.abs(s.flow) * 12, 100);
            const flowColor = s.flow > 0 ? '#00F5A0' : '#FF4757';
            const flowLabel = s.flow > 1 ? 'bullish' : s.flow < -1 ? 'bearish' : 'neutral';

            return (
              <div
                key={s.name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/[0.03]"
                style={{ border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                    {s.name}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-white/30">
                    {s.market}
                  </span>
                </div>
                <span
                  className="w-16 text-right text-xs font-mono font-bold tabular-nums shrink-0"
                  style={{ color: s.flow > 0 ? '#00F5A0' : s.flow < 0 ? '#FF4757' : 'inherit' }}
                >
                  {s.flow > 0 ? '+' : ''}
                  {s.flow.toFixed(1)}%
                </span>
                <span className="w-16 text-right text-[10px] font-mono text-gray-400 dark:text-white/40 tabular-nums shrink-0 hidden sm:block">
                  {s.dominance.toFixed(1)}%
                </span>
                <div className="w-32 shrink-0 hidden md:flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${flowBarWidth}%`, backgroundColor: flowColor }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 dark:text-white/30">
                    {flowLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-8 text-center text-xs text-gray-400 dark:text-white/40">
          No sectors match your criteria
        </div>
      )}
    </section>
  );
}
