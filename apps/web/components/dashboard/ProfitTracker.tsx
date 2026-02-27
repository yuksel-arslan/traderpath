'use client';

import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';

interface PerformanceDay {
  date: string;
  realized: number;
  unrealized: number;
  total: number;
  trades: number;
  cumulative: number;
}

interface PerformanceData {
  daily: PerformanceDay[];
  summary: {
    totalRealizedPnL: number;
    totalTrades: number;
    activeTrades: number;
    winRate: number;
  };
}

interface ProfitTrackerProps {
  periodPnL: number;
  pnlViewMode: 'daily' | 'weekly' | 'monthly';
  setPnlViewMode: (v: 'daily' | 'weekly' | 'monthly') => void;
  winRate: number;
  totalTrades: number;
  performanceData: PerformanceData | null;
}

const VIEW_MODES: { key: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { key: 'daily', label: '1D' },
  { key: 'weekly', label: '7D' },
  { key: 'monthly', label: '30D' },
];

interface ChartPoint {
  label: string;
  pnl: number;
  trades: number;
}

function buildChartPoints(
  performanceData: PerformanceData | null,
  viewMode: 'daily' | 'weekly' | 'monthly'
): ChartPoint[] {
  const rangeDays = viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : 30;
  const now = new Date();

  if (!performanceData?.daily?.length) {
    // No data — return empty placeholder points
    return Array(Math.max(rangeDays, 2))
      .fill(null)
      .map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (rangeDays - 1 - i));
        return {
          label: formatLabel(d, viewMode),
          pnl: 0,
          trades: 0,
        };
      });
  }

  const daily = performanceData.daily;

  if (viewMode === 'daily') {
    // Show hourly breakdown of today — just one day cumulative from API
    const todayStr = now.toISOString().split('T')[0];
    const todayData = daily.find((x) => x.date === todayStr);
    const realized = todayData?.realized ?? 0;
    // Show 2-point line: start at 0, end at today's realized
    return [
      { label: '00:00', pnl: 0, trades: 0 },
      { label: 'Now', pnl: Number(realized.toFixed(2)), trades: todayData?.trades ?? 0 },
    ];
  }

  // Weekly or Monthly: show cumulative equity curve
  let cumulative = 0;
  return Array(rangeDays)
    .fill(null)
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (rangeDays - 1 - i));
      const key = d.toISOString().split('T')[0];
      const dayData = daily.find((x) => x.date === key);
      cumulative += dayData?.realized ?? 0;
      return {
        label: formatLabel(d, viewMode),
        pnl: Number(cumulative.toFixed(2)),
        trades: dayData?.trades ?? 0,
      };
    });
}

function formatLabel(d: Date, viewMode: 'daily' | 'weekly' | 'monthly'): string {
  if (viewMode === 'monthly') return String(d.getDate());
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function ProfitTracker({
  periodPnL,
  pnlViewMode,
  setPnlViewMode,
  winRate,
  totalTrades,
  performanceData,
}: ProfitTrackerProps) {
  const pnlColor = periodPnL >= 0 ? '#00F5A0' : '#FF4757';

  const chartPoints = useMemo(
    () => buildChartPoints(performanceData, pnlViewMode),
    [performanceData, pnlViewMode]
  );

  const hasRealData = chartPoints.some((p) => p.pnl !== 0 || p.trades > 0);

  return (
    <div className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
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
      <div className="flex items-end gap-6 mb-1">
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
      </div>
      <div className="h-[80px] mt-2">
        {hasRealData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="perfGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F5A0" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00F5A0" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="perfGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4757" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FF4757" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={0.5} strokeOpacity={0.3} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload as ChartPoint;
                  const isPos = data.pnl >= 0;
                  return (
                    <div
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                    >
                      <div
                        style={{
                          color: isPos ? '#00F5A0' : '#FF4757',
                          fontWeight: 700,
                          fontSize: '14px',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {data.pnl === 0 && data.trades === 0
                          ? '—'
                          : `${isPos ? '+' : ''}${data.pnl.toFixed(2)}%`}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>
                        {data.label} · {data.trades} trade{data.trades !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                }}
                cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={pnlColor}
                strokeWidth={2}
                fill={periodPnL >= 0 ? 'url(#perfGradGreen)' : 'url(#perfGradRed)'}
                dot={false}
                activeDot={{ fill: pnlColor, strokeWidth: 2, stroke: '#fff', r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-white/30">
            No equity data yet
          </div>
        )}
      </div>
    </div>
  );
}
