'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Footer } from '../../components/common/Footer';
import { PriceTicker } from '../../components/home/PriceTicker';
import { Navbar } from '../../components/layout/Navbar';
import { Hero } from '../../components/home/Hero';
import { FlowAccordion } from '../../components/home/FlowAccordion';

const RechartsArea = dynamic(
  () => import('recharts').then(m => {
    const { ResponsiveContainer, AreaChart, Area, ReferenceLine, Tooltip } = m;
    // eslint-disable-next-line react/display-name
    return ({ data, color }: { data: { name: string; value: number }[]; color: string }) => (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <ReferenceLine y={0} stroke="#64748b" strokeWidth={0.5} strokeOpacity={0.3} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const v = payload[0].value as number;
              return (
                <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg">
                  <span className="text-slate-400 mr-2">{payload[0].payload.name}</span>
                  <span className={v >= 0 ? 'text-emerald-400' : 'text-red-400'} style={{ fontWeight: 600 }}>
                    {v >= 0 ? '+' : ''}{v.toFixed(1)}%
                  </span>
                </div>
              );
            }}
            cursor={{ stroke: '#64748b', strokeWidth: 0.5, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill="url(#pnlFill)"
            dot={false}
            activeDot={{ fill: color, stroke: '#fff', strokeWidth: 2, r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-black/[0.02] dark:bg-white/[0.02]" /> }
);

// ---------------------------------------------------------------------------
// STATS – Real platform data
// ---------------------------------------------------------------------------

function Stats() {
  const [metrics, setMetrics] = useState<{
    totalAnalyses: number;
    accuracy: number;
    totalPnL: number;
    closedCount: number;
  } | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const apiUrls = [
          process.env.NEXT_PUBLIC_API_URL,
          'https://api.traderpath.io',
          'https://traderpath-api-production.up.railway.app'
        ].filter(Boolean);

        let data = null;
        for (const baseUrl of apiUrls) {
          try {
            const res = await fetch(`${baseUrl}/api/analysis/platform-stats`, {
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

        if (data?.success) {
          setMetrics({
            totalAnalyses: data.data.platform.totalAnalyses || 0,
            accuracy: data.data.accuracy.overall || 0,
            totalPnL: data.data.accuracy.totalPnL || 0,
            closedCount: data.data.accuracy.closedCount || 0,
          });
        }
      } catch {
        // silent
      }
    };
    fetchMetrics();
  }, []);

  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/[0.04] dark:bg-white/[0.04]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-black p-6">
            <div className="h-7 w-16 bg-black/5 dark:bg-white/5 mb-2 animate-pulse" />
            <div className="h-3 w-20 bg-black/5 dark:bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'ANALYSES', value: metrics.totalAnalyses.toLocaleString() },
    { label: 'ACCURACY', value: metrics.closedCount > 0 ? `${metrics.accuracy}%` : '—' },
    { label: 'P/L', value: metrics.closedCount > 0 ? `${metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL}%` : '—' },
    { label: 'VERIFIED', value: metrics.closedCount.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/[0.04] dark:bg-white/[0.04]">
      {stats.map((s, i) => (
        <div key={i} className="bg-white dark:bg-black p-6">
          <div className="text-2xl sm:text-3xl font-bold tabular-nums mb-1">{s.value}</div>
          <div className="text-[10px] tracking-wider text-slate-400">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PERFORMANCE CHART – Cumulative P/L sparkline
// ---------------------------------------------------------------------------

function PerformanceChart() {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [pnl, setPnl] = useState(0);
  const [trades, setTrades] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const urls = [
        process.env.NEXT_PUBLIC_API_URL,
        'https://api.traderpath.io',
        'https://traderpath-api-production.up.railway.app',
      ].filter(Boolean);

      for (const base of urls) {
        try {
          const res = await fetch(`${base}/api/analysis/platform-performance-history?days=30`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });
          if (!res.ok) continue;
          const json = await res.json();
          if (!json.success) continue;

          const daily: { date: string; realized: number }[] = json.data?.daily || [];
          const summary = json.data?.summary || {};

          setPnl(summary.allTimeTotalPnL ?? summary.totalRealizedPnL ?? 0);
          setTrades(summary.allTimeTotalTrades ?? summary.totalTrades ?? 0);

          if (daily.length > 0) {
            let cum = 0;
            const points = daily.map((d) => {
              cum += d.realized;
              const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return { name: label, value: Number(cum.toFixed(2)) };
            });
            setData(points);
          }
          setReady(true);
          return;
        } catch {
          continue;
        }
      }

      // Fallback – platform-stats
      for (const base of urls) {
        try {
          const res = await fetch(`${base}/api/analysis/platform-stats`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });
          if (!res.ok) continue;
          const json = await res.json();
          if (!json.success) continue;
          setPnl(json.data?.accuracy?.totalPnL ?? 0);
          setTrades(json.data?.accuracy?.closedCount ?? 0);
          setReady(true);
          return;
        } catch {
          continue;
        }
      }
      setReady(true);
    };
    load();
  }, []);

  // Nothing to show yet
  if (!ready) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-10 sm:py-14">
        <div className="h-[120px] animate-pulse bg-black/[0.02] dark:bg-white/[0.02]" />
      </div>
    );
  }

  if (trades === 0) return null; // No closed trades – hide section entirely

  const color = pnl >= 0 ? '#10b981' : '#ef4444';

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-10 sm:py-14">
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Platform P/L</h3>
          <p className="text-[10px] tracking-wider text-slate-400 mt-0.5">
            {trades.toLocaleString()} verified trade{trades !== 1 ? 's' : ''} · last 30 days
          </p>
        </div>
        <div className="text-right">
          <span
            className="text-2xl sm:text-3xl font-bold tabular-nums"
            style={{ color }}
          >
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart area */}
      {data.length > 0 ? (
        <div className="h-[120px] sm:h-[140px]">
          <RechartsArea data={data} color={color} />
        </div>
      ) : (
        <div className="h-[60px] flex items-center justify-center">
          <span className="text-xs text-slate-400">Cumulative chart updates daily</span>
        </div>
      )}

      <p className="text-[10px] text-slate-400/60 text-center mt-4">
        Real results from verified TP/SL outcomes. Past performance does not guarantee future results.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-200">
      <PriceTicker />
      <Navbar />
      <Hero />

      {/* Stats */}
      <section className="border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto">
          <Stats />
        </div>
      </section>

      {/* Performance Chart */}
      <section className="border-t border-black/[0.06] dark:border-white/[0.06]">
        <PerformanceChart />
      </section>

      {/* Methodology */}
      <FlowAccordion />

      {/* CTA */}
      <section className="border-t border-black/[0.06] dark:border-white/[0.06] py-16 sm:py-24">
        <div className="max-w-[600px] mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-[#14B8A6] via-[#0EA5E9] to-[#F97316] bg-clip-text text-transparent animate-[gradient-shift_6s_ease_infinite] bg-[length:200%_auto]">
              Start Trading with AI
            </span>
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            25 free credits on signup. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold bg-black dark:bg-white text-white dark:text-black rounded-sm hover:opacity-80 transition-opacity"
            >
              GET STARTED FREE
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-sm text-slate-500 border border-black/[0.06] dark:border-white/[0.06] rounded-sm hover:text-black dark:hover:text-white transition-colors"
            >
              VIEW PRICING
            </Link>
          </div>
        </div>
      </section>

      <Footer variant="minimal" />
    </div>
  );
}
