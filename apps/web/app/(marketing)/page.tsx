'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import dynamic from 'next/dynamic';
import { Footer } from '../../components/common/Footer';
import { PriceTicker } from '../../components/home/PriceTicker';
import { Navbar } from '../../components/layout/Navbar';
import { Hero } from '../../components/home/Hero';
import { ProblemSolution } from '../../components/home/ProblemSolution';
import { Pipeline } from '../../components/home/Pipeline';
import { FlowAccordion } from '../../components/home/FlowAccordion';
import { ComparisonTable } from '../../components/home/ComparisonTable';
import { LivePreview } from '../../components/home/LivePreview';
import { ThreeServices } from '../../components/home/ThreeServices';
import { SocialProof } from '../../components/home/SocialProof';

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
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-gray-100 dark:bg-white/[0.02]" /> }
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-800">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-[#111111] p-6">
            <div className="h-7 w-16 bg-gray-100 dark:bg-white/5 mb-2 animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 dark:bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const stats: { label: string; end: number; suffix: string; prefix: string; decimals: number; show: boolean }[] = [
    { label: 'ANALYSES COMPLETED', end: metrics.totalAnalyses, suffix: '+', prefix: '', decimals: 0, show: true },
    { label: 'WIN RATE ALL SIGNALS', end: metrics.accuracy, suffix: '%', prefix: '', decimals: 1, show: metrics.closedCount > 0 },
    { label: 'VERIFIED PLATFORM P/L', end: Math.abs(metrics.totalPnL), suffix: '%', prefix: metrics.totalPnL >= 0 ? '+' : '-', decimals: 1, show: metrics.closedCount > 0 },
    { label: 'TRADEABLE ASSETS', end: 194, suffix: '+', prefix: '', decimals: 0, show: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-800">
      {stats.map((s, i) => (
        <div key={i} className="bg-white dark:bg-[#111111] p-6">
          <div className="text-2xl sm:text-3xl font-bold mb-1 text-gray-900 dark:text-gray-100">
            {s.show ? (
              <AnimatedCounter
                end={s.end}
                suffix={s.suffix}
                prefix={s.prefix}
                decimals={s.decimals}
                duration={2000}
              />
            ) : (
              <span className="font-mono tabular-nums">&mdash;</span>
            )}
          </div>
          <div className="text-[10px] tracking-wider text-slate-400">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PERFORMANCE CHART – Verified Performance
// ---------------------------------------------------------------------------

function PerformanceChart() {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [pnl, setPnl] = useState(0);
  const [trades, setTrades] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [avgRR, setAvgRR] = useState(0);
  const [maxDrawdown, setMaxDrawdown] = useState(0);
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
          setWinRate(summary.winRate ?? summary.accuracy ?? 0);
          setAvgRR(summary.avgRR ?? summary.averageRR ?? 0);
          setMaxDrawdown(summary.maxDrawdown ?? 0);

          if (daily.length > 0) {
            let cum = 0;
            let maxCum = 0;
            let dd = 0;
            const points = daily.map((d) => {
              cum += d.realized;
              if (cum > maxCum) maxCum = cum;
              const currentDd = maxCum - cum;
              if (currentDd > dd) dd = currentDd;
              const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return { name: label, value: Number(cum.toFixed(2)) };
            });
            setData(points);
            if (dd > 0 && maxDrawdown === 0) setMaxDrawdown(Number(dd.toFixed(1)));
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
          setWinRate(json.data?.accuracy?.overall ?? 0);
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

  if (!ready) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-10 sm:py-14">
        <div className="h-[120px] animate-pulse bg-gray-100 dark:bg-white/[0.02]" />
      </div>
    );
  }

  if (trades === 0) return null;

  const color = pnl >= 0 ? '#10b981' : '#ef4444';

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-10 sm:py-14">
      {/* Section header */}
      <div className="text-center mb-6">
        <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">PERFORMANCE</div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
          Verified Performance. Real Results.
        </h3>
        <p className="text-xs text-slate-500">
          Every signal tracked. Every trade measured. No cherry-picking.
        </p>
      </div>

      {/* P/L header */}
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] tracking-wider text-slate-400">
          {trades.toLocaleString()} verified trade{trades !== 1 ? 's' : ''} · last 30 days
        </p>
        <span className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color }}>
          {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
        </span>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <div className="h-[120px] sm:h-[140px]">
          <RechartsArea data={data} color={color} />
        </div>
      ) : (
        <div className="h-[60px] flex items-center justify-center">
          <span className="text-xs text-slate-400">Cumulative chart updates daily</span>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-white/[0.06] rounded-lg overflow-hidden mt-6">
        {[
          { label: 'Total Signals', value: trades.toLocaleString() },
          { label: 'Win Rate', value: winRate > 0 ? `${winRate.toFixed(1)}%` : '—' },
          { label: 'Avg R:R', value: avgRR > 0 ? `${avgRR.toFixed(1)}x` : '—' },
          { label: 'Max Drawdown', value: maxDrawdown > 0 ? `-${maxDrawdown.toFixed(0)}%` : '—' },
        ].map((m) => (
          <div key={m.label} className="bg-white dark:bg-[#111111] p-3 text-center">
            <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{m.value}</div>
            <div className="text-[9px] tracking-wider text-slate-400 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-400/60 text-center mt-4 max-w-lg mx-auto leading-relaxed">
        Past performance does not guarantee future results. All results are from paper trading and signal tracking, not live funded accounts.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PRICING SECTION
// ---------------------------------------------------------------------------

function PricingSection() {
  return (
    <section className="py-12 md:py-20 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-[900px] mx-auto px-4">
        <div className="text-center mb-10">
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">PRICING</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Simple Credit-Based Pricing
          </h2>
          <p className="text-sm text-slate-500">No subscriptions. No hidden fees. Buy credits, use anytime.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Free */}
          <div className="rounded-xl p-6 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">FREE</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">25 Credits</div>
            <p className="text-xs text-slate-500 mb-4">On signup, no credit card</p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {['1 full 7-Step analysis', 'Capital Flow view (read-only)', 'Full terminal access'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-xl p-6 bg-white dark:bg-white/[0.03] border-2 border-teal-500 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-teal-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
              Popular
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-500 mb-2">PRO</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">500 Credits</div>
            <p className="text-xs text-slate-500 mb-4">Best value for active traders</p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {['All 3 services', 'PDF + detailed reports', 'Telegram + Discord + Push alerts'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Enterprise */}
          <div className="rounded-xl p-6 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">ENTERPRISE</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Custom</div>
            <p className="text-xs text-slate-500 mb-4">For teams and institutions</p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {['Unlimited credits', 'API access', 'Dedicated support'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors">
            GET STARTED FREE <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            VIEW FULL PRICING
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-100 relative">
      <div className="relative z-10">
        <PriceTicker />
        <Navbar />

        {/* 1. Hero */}
        <Hero />

        {/* 2. Stats Bar */}
        <section className="border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-[1200px] mx-auto">
            <Stats />
          </div>
        </section>

        {/* 3. Problem → Solution */}
        <ProblemSolution />

        {/* 4. How It Works — 3-Step Pipeline */}
        <Pipeline />

        {/* 5. 7-Layer Decision Engine */}
        <FlowAccordion />

        {/* 6. What Makes Us Different */}
        <ComparisonTable />

        {/* 7. Live Platform Preview */}
        <LivePreview />

        {/* 8. Verified Performance */}
        <section className="border-t border-gray-200 dark:border-gray-800">
          <PerformanceChart />
        </section>

        {/* 9. Three Services */}
        <ThreeServices />

        {/* 10. Pricing */}
        <PricingSection />

        {/* 11. Social Proof / Trust */}
        <SocialProof />

        {/* 12. Final CTA */}
        <section className="border-t border-gray-200 dark:border-gray-800 py-16 sm:py-24">
          <div className="max-w-[600px] mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-gray-900 dark:text-gray-100">
              Stop Guessing. Start Following the Flow.
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Join 300+ traders who use capital flow intelligence to make smarter trading decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors">
                START FREE ANALYSIS <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                VIEW PRICING
              </Link>
            </div>
            <p className="text-[10px] font-sans text-slate-400 mt-5">
              25 free credits &middot; No credit card &middot; Setup in 30 seconds
            </p>
          </div>
        </section>

        {/* 13. Footer */}
        <Footer variant="default" />
      </div>
    </div>
  );
}
