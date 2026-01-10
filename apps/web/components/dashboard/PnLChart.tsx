'use client';

// ===========================================
// PnL Chart Component - Lazy loaded for performance
// ===========================================

import { AreaChart, Area, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

interface ChartDataPoint {
  name: string;
  pnl: number;
  positive: number;
  negative: number;
  count: number;
}

interface PnLChartProps {
  chartData: ChartDataPoint[];
}

export function PnLChart({ chartData }: PnLChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="redGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
          </linearGradient>
          <filter id="glowEffect">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
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
            const data = payload[0].payload;
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
                  {data.count === 0 ? '—' : `${isPos ? '+' : ''}${pnl.toFixed(1)}%`}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                  {data.count} trade{data.count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          }}
          cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        {/* Positive area - Green */}
        <Area
          type="monotone"
          dataKey="positive"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#greenGradient)"
          filter="url(#glowEffect)"
          dot={(props: any) => {
            if (!props.payload || props.payload.positive <= 0) return <g key={props.key} />;
            return (
              <circle
                key={props.key}
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill="#10b981"
                stroke="#fff"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ fill: '#10b981', strokeWidth: 3, stroke: '#fff', r: 6 }}
        />
        {/* Negative area - Red */}
        <Area
          type="monotone"
          dataKey="negative"
          stroke="#ef4444"
          strokeWidth={2.5}
          fill="url(#redGradient)"
          filter="url(#glowEffect)"
          dot={(props: any) => {
            if (!props.payload || props.payload.negative >= 0) return <g key={props.key} />;
            return (
              <circle
                key={props.key}
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ fill: '#ef4444', strokeWidth: 3, stroke: '#fff', r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
