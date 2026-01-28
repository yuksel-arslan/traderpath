'use client';

import { useEffect, useState } from 'react';
import { LineChart } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface ChartDataPoint {
  name: string;
  pnl: number;
  positive: number;
  negative: number;
  trades: number;
}

export default function LandingPerformanceChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const apiUrls = [
          process.env.NEXT_PUBLIC_API_URL,
          'https://api.traderpath.io',
          'https://traderpath-api-production.up.railway.app'
        ].filter(Boolean);

        let data = null;
        for (const baseUrl of apiUrls) {
          try {
            const res = await fetch(`${baseUrl}/api/analysis/platform-performance-history?days=30`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store'
            });
            if (res.ok) {
              data = await res.json();
              if (data.success) break;
            }
          } catch {
            continue;
          }
        }

        if (data?.success && data.data?.daily?.length > 0) {
          const formattedData = data.data.daily.map((day: { date: string; cumulative: number; trades: number }) => {
            const dateObj = new Date(day.date);
            const name = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const pnl = day.cumulative;
            return {
              name,
              pnl,
              positive: Math.max(0, pnl),
              negative: Math.min(0, pnl),
              trades: day.trades,
            };
          });
          setChartData(formattedData);
          setTotalPnL(data.data.summary.totalRealizedPnL || 0);
          setTotalTrades(data.data.summary.totalTrades || 0);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

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

  if (error || chartData.length === 0 || totalTrades === 0) {
    return null;
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
            <p className="text-xs text-muted-foreground">Last 30 days cumulative P/L</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
          totalPnL >= 0
            ? 'bg-emerald-500/20 text-emerald-500'
            : 'bg-red-500/20 text-red-500'
        }`}>
          {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(1)}%
          <span className="text-xs font-normal text-muted-foreground ml-1">({totalTrades} trades)</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="publicGreenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="publicRedGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
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
                const isPos = pnl >= 0;
                return (
                  <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ color: '#fff', fontWeight: 600, marginBottom: '4px' }}>{data.name}</div>
                    <div style={{ color: isPos ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '16px' }}>
                      {isPos ? '+' : ''}{pnl.toFixed(1)}%
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                      {data.trades} trade{data.trades !== 1 ? 's' : ''} closed
                    </div>
                  </div>
                );
              }}
              cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
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
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-muted-foreground/70 text-center mt-3">
        Real performance data from verified trade outcomes (TP/SL hits)
      </p>
    </div>
  );
}
