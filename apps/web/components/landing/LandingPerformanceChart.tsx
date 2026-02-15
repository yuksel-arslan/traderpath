'use client';

import { useEffect, useState } from 'react';
import { LineChart, TrendingUp, TrendingDown, Layers, Target } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';

interface ChartDataPoint {
  name: string;
  pnl: number;
  positive: number;
  negative: number;
  trades: number;
  classicPnl?: number;
  mlisPnl?: number;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface DailyData {
  date: string;
  realized: number;
  trades: number;
  cumulative: number;
}

export default function LandingPerformanceChart() {
  const [rawData, setRawData] = useState<DailyData[]>([]);
  const [rawDataClassic, setRawDataClassic] = useState<DailyData[]>([]);
  const [rawDataMlis, setRawDataMlis] = useState<DailyData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [allTimePnL, setAllTimePnL] = useState(0); // All-time total (same as platform-stats)
  const [allTimeClassicPnL, setAllTimeClassicPnL] = useState(0);
  const [allTimeMlisPnL, setAllTimeMlisPnL] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasChartData, setHasChartData] = useState(false);
  const [hasMlisData, setHasMlisData] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  // Build chart data based on view mode, including both Classic and MLIS data
  const buildChartData = (
    data: DailyData[],
    classicData: DailyData[],
    mlisData: DailyData[],
    mode: ViewMode
  ): ChartDataPoint[] => {
    if (!data.length) return [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (mode === 'daily') {
      // Today only - show hourly breakdown simulation
      const todayData = data.find(d => d.date === todayStr);
      const todayClassic = classicData.find(d => d.date === todayStr);
      const todayMlis = mlisData.find(d => d.date === todayStr);
      const hours: number[] = [];
      for (let h = 0; h < 24; h += 3) hours.push(h);

      const currentHour = now.getHours();
      const currentBucket = Math.floor(currentHour / 3) * 3;
      const totalDayPnl = todayData?.realized || 0;
      const totalDayClassic = todayClassic?.realized || 0;
      const totalDayMlis = todayMlis?.realized || 0;

      return hours.map(h => {
        const isCurrentOrPast = h <= currentBucket;
        const progress = isCurrentOrPast ? (h + 3) / (currentBucket + 3) : 0;
        const pnl = isCurrentOrPast ? totalDayPnl * progress : 0;
        const classicPnl = isCurrentOrPast ? totalDayClassic * progress : 0;
        const mlisPnl = isCurrentOrPast ? totalDayMlis * progress : 0;
        return {
          name: `${h.toString().padStart(2, '0')}:00`,
          pnl: Number(pnl.toFixed(2)),
          positive: Math.max(0, pnl),
          negative: Math.min(0, pnl),
          trades: h === currentBucket ? (todayData?.trades || 0) : 0,
          classicPnl: Number(classicPnl.toFixed(2)),
          mlisPnl: Number(mlisPnl.toFixed(2)),
        };
      });
    }

    if (mode === 'weekly') {
      // Last 7 days
      const weekDays: string[] = [];
      const weekDayLabels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        weekDays.push(d.toISOString().split('T')[0]);
        weekDayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      }

      let cumulativePnl = 0;
      let cumulativeClassic = 0;
      let cumulativeMlis = 0;
      return weekDays.map((day, i) => {
        const dayData = data.find(d => d.date === day);
        const dayClassic = classicData.find(d => d.date === day);
        const dayMlis = mlisData.find(d => d.date === day);
        cumulativePnl += dayData?.realized || 0;
        cumulativeClassic += dayClassic?.realized || 0;
        cumulativeMlis += dayMlis?.realized || 0;
        return {
          name: weekDayLabels[i],
          pnl: Number(cumulativePnl.toFixed(2)),
          positive: Math.max(0, cumulativePnl),
          negative: Math.min(0, cumulativePnl),
          trades: dayData?.trades || 0,
          classicPnl: Number(cumulativeClassic.toFixed(2)),
          mlisPnl: Number(cumulativeMlis.toFixed(2)),
        };
      });
    }

    // Monthly - last 30 days
    const monthDays: string[] = [];
    const monthDayLabels: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      monthDays.push(d.toISOString().split('T')[0]);
      monthDayLabels.push(d.getDate().toString());
    }

    let cumulativePnl = 0;
    let cumulativeClassic = 0;
    let cumulativeMlis = 0;
    return monthDays.map((day, i) => {
      const dayData = data.find(d => d.date === day);
      const dayClassic = classicData.find(d => d.date === day);
      const dayMlis = mlisData.find(d => d.date === day);
      cumulativePnl += dayData?.realized || 0;
      cumulativeClassic += dayClassic?.realized || 0;
      cumulativeMlis += dayMlis?.realized || 0;
      return {
        name: monthDayLabels[i],
        pnl: Number(cumulativePnl.toFixed(2)),
        positive: Math.max(0, cumulativePnl),
        negative: Math.min(0, cumulativePnl),
        trades: dayData?.trades || 0,
        classicPnl: Number(cumulativeClassic.toFixed(2)),
        mlisPnl: Number(cumulativeMlis.toFixed(2)),
      };
    });
  };

  // Calculate period P/L based on view mode
  const calculatePeriodPnL = (data: DailyData[], mode: ViewMode): number => {
    if (!data.length) return 0;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (mode === 'daily') {
      const todayData = data.find(d => d.date === todayStr);
      return todayData?.realized || 0;
    }

    if (mode === 'weekly') {
      const weekDays: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        weekDays.push(d.toISOString().split('T')[0]);
      }
      return weekDays.reduce((sum, day) => {
        const dayData = data.find(d => d.date === day);
        return sum + (dayData?.realized || 0);
      }, 0);
    }

    // Monthly - sum all
    return data.reduce((sum, d) => sum + d.realized, 0);
  };

  useEffect(() => {
    const fetchPerformance = async () => {
      const apiUrls = [
        process.env.NEXT_PUBLIC_API_URL,
        'https://api.traderpath.io',
        'https://traderpath-api-production.up.railway.app'
      ].filter(Boolean);

      // First try the new performance-history endpoint
      for (const baseUrl of apiUrls) {
        try {
          const res = await fetch(`${baseUrl}/api/analysis/platform-performance-history?days=30`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.daily?.length > 0) {
              setRawData(data.data.daily);
              setRawDataClassic(data.data.dailyClassic || []);
              setRawDataMlis(data.data.dailyMlis || []);
              setTotalPnL(data.data.summary.totalRealizedPnL || 0);
              // Use all-time total for display (same as platform-stats)
              setAllTimePnL(data.data.summary.allTimeTotalPnL || data.data.summary.totalRealizedPnL || 0);
              setAllTimeClassicPnL(data.data.summary.allTimeClassicPnL || 0);
              setAllTimeMlisPnL(data.data.summary.allTimeMlisPnL || 0);
              setTotalTrades(data.data.summary.allTimeTotalTrades || data.data.summary.totalTrades || 0);
              setHasChartData(true);
              // Check if we have MLIS data
              const mlisTrades = data.data.summary.allTimeMlisTrades || 0;
              setHasMlisData(mlisTrades > 0);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error(`[LandingChart] Error fetching from ${baseUrl}:`, err);
          continue;
        }
      }

      // Fallback to platform-stats endpoint (always available)
      for (const baseUrl of apiUrls) {
        try {
          const res = await fetch(`${baseUrl}/api/analysis/platform-stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.accuracy) {
              setTotalPnL(data.data.accuracy.totalPnL || 0);
              setAllTimePnL(data.data.accuracy.totalPnL || 0);
              setTotalTrades(data.data.accuracy.closedCount || 0);
              setHasChartData(false);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error(`[LandingChart] Error fetching platform-stats from ${baseUrl}:`, err);
          continue;
        }
      }

      setLoading(false);
    };
    fetchPerformance();
  }, []);

  // Update chart data when view mode or raw data changes
  useEffect(() => {
    if (rawData.length > 0) {
      setChartData(buildChartData(rawData, rawDataClassic, rawDataMlis, viewMode));
    }
  }, [rawData, rawDataClassic, rawDataMlis, viewMode]);

  // For monthly view, show all-time P/L to match dashboard
  // For daily/weekly, show period-specific P/L
  const periodPnL = hasChartData
    ? (viewMode === 'monthly' ? allTimePnL : calculatePeriodPnL(rawData, viewMode))
    : allTimePnL;

  if (loading) {
    return (
      <div className="bg-card/50 backdrop-blur border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <LineChart className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold">Platform Performance</h3>
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
        <div className="h-48 animate-pulse bg-muted/30 rounded-lg" />
      </div>
    );
  }

  // Show placeholder if no trades have closed yet
  if (totalTrades === 0) {
    return (
      <div className="bg-card/50 backdrop-blur border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <LineChart className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Platform Performance</h3>
              <p className="text-sm text-muted-foreground">Real-time trade tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl font-bold text-lg bg-muted/50 text-muted-foreground">
              Collecting Data...
            </div>
          </div>
        </div>
        <div className="h-32 flex items-center justify-center mt-4">
          <p className="text-sm text-muted-foreground text-center">
            Performance chart will appear once trades start closing.<br />
            <span className="text-xs">All results are verified from real TP/SL outcomes.</span>
          </p>
        </div>
      </div>
    );
  }

  // If we don't have chart data, show a simplified view
  if (!hasChartData) {
    return (
      <div className="bg-card/50 backdrop-blur border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              {allTimePnL >= 0 ? (
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">Platform Performance</h3>
              <p className="text-sm text-muted-foreground">Verified trade results</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl font-bold text-xl ${
              allTimePnL >= 0
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-red-500/20 text-red-500'
            }`}>
              {allTimePnL >= 0 ? '+' : ''}{allTimePnL.toFixed(1)}%
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalTrades}</div>
              <div className="text-xs text-muted-foreground">Closed Trades</div>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/70 text-center mt-4">
          Real performance data from verified trade outcomes (TP/SL hits)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur border rounded-xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <LineChart className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold">Platform Performance</h3>
            <p className="text-xs text-muted-foreground">
              Total P/L • Chart: {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'Week' : 'All'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'daily'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'weekly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
          </div>

          {/* P/L Badge - Always shows all-time total */}
          <div className={`px-2.5 py-1 rounded-lg font-bold text-sm ${
            allTimePnL >= 0
              ? 'bg-emerald-500/20 text-emerald-500'
              : 'bg-red-500/20 text-red-500'
          }`}>
            {allTimePnL >= 0 ? '+' : ''}{allTimePnL.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Legend - only show if we have MLIS data */}
      {hasMlisData && (
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-teal-500 rounded"></div>
            <span className="text-[10px] text-muted-foreground">Classic 7-Step</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-violet-500 rounded"></div>
            <span className="text-[10px] text-muted-foreground">MLIS Pro</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={hasMlisData ? "h-44" : "h-48"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="publicGreenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="publicRedGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="classicGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="mlisGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeOpacity={0.3} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 14px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const data = payload[0].payload as ChartDataPoint;
                const pnl = data.pnl;
                const classicPnl = data.classicPnl || 0;
                const mlisPnl = data.mlisPnl || 0;
                const isPos = pnl >= 0;
                return (
                  <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ color: '#fff', fontWeight: 600, marginBottom: '6px' }}>{data.name}</div>
                    <div style={{ color: isPos ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                      Total: {isPos ? '+' : ''}{pnl.toFixed(1)}%
                    </div>
                    {hasMlisData && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                        <div style={{ color: '#14b8a6' }}>Classic: {classicPnl >= 0 ? '+' : ''}{classicPnl.toFixed(1)}%</div>
                        <div style={{ color: '#8b5cf6' }}>MLIS: {mlisPnl >= 0 ? '+' : ''}{mlisPnl.toFixed(1)}%</div>
                      </div>
                    )}
                    <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '4px' }}>
                      {data.trades} trade{data.trades !== 1 ? 's' : ''} closed
                    </div>
                  </div>
                );
              }}
              cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            {/* Classic 7-Step Line (Teal) */}
            {hasMlisData && (
              <Area
                type="monotone"
                dataKey="classicPnl"
                stroke="#14b8a6"
                strokeWidth={2}
                fill="url(#classicGradient)"
                dot={false}
                activeDot={{ fill: '#14b8a6', strokeWidth: 2, stroke: '#fff', r: 4 }}
              />
            )}
            {/* MLIS Pro Line (Violet) */}
            {hasMlisData && (
              <Area
                type="monotone"
                dataKey="mlisPnl"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#mlisGradient)"
                dot={false}
                activeDot={{ fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff', r: 4 }}
              />
            )}
            {/* Total P/L (only if no MLIS data - backward compat) */}
            {!hasMlisData && (
              <>
                <Area
                  type="monotone"
                  dataKey="positive"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#publicGreenGradient)"
                  dot={false}
                  activeDot={{ fill: '#10b981', strokeWidth: 3, stroke: '#fff', r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#publicRedGradient)"
                  dot={false}
                  activeDot={{ fill: '#ef4444', strokeWidth: 3, stroke: '#fff', r: 6 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-muted-foreground/70 text-center mt-3">
        Real performance data from verified trade outcomes (TP/SL hits)
      </p>
    </div>
  );
}
