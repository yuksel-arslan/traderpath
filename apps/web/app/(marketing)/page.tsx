'use client';

import Link from 'next/link';
import { ArrowRight, Check, Sparkles, FileText, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
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
          setWinRate(summary.winRate ?? 0);
          setAvgRR(summary.avgRR ?? 0);
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
            // Sync badge P/L with chart's final cumulative value
            setPnl(Number(cum.toFixed(1)));
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
// PRICING SECTION — Weekly Subscription Model
// ---------------------------------------------------------------------------

const LANDING_PLANS = [
  {
    name: 'Intelligent Report',
    planType: 'report',
    price: '$13.99',
    period: '/week',
    quota: '7 reports/week',
    perUnit: '$2.00 each',
    description: 'We analyze, you receive daily reports via Telegram & Discord',
    features: [
      '1 report per day, 7 per week',
      'Executive Summary or Detailed Report',
      'Snapshot PNG — Telegram + Discord',
      'Outcome tracking & TP/SL notifications',
    ],
  },
  {
    name: 'Capital Flow & Analysis',
    planType: 'analysis',
    price: '$13.99',
    period: '/week',
    quota: '7 analyses/week',
    perUnit: '$2.00 each',
    description: 'Run your own analyses with AI Expert support',
    features: [
      '7 full analyses per week',
      '5 AI Expert questions per analysis',
      'AI Concierge, Auto, or Tailored',
      '7-Step + MLIS Pro dual-engine',
    ],
  },
];

function PricingSection() {
  return (
    <section className="py-16 md:py-24 border-t border-gray-200 dark:border-white/[0.04]">
      <div className="max-w-[1100px] mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">PRICING</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            Choose Your Plan
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Professional-grade trading intelligence for $13.99/week. Pick the plan that fits your style.
          </p>
        </div>

        {/* Free Trial Banner */}
        <div className="mb-10 mx-auto max-w-sm">
          <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-full bg-teal-500/5 border border-teal-500/15">
            <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3 h-3 text-teal-500" />
            </div>
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">3 Free Analyses</span>
            <span className="w-px h-3 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs text-slate-400">no credit card</span>
          </div>
        </div>

        {/* Subscription Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto mb-10">
          {LANDING_PLANS.map((plan) => {
            const report = plan.planType === 'report';
            return (
              <div key={plan.name} className="group relative rounded-2xl overflow-hidden">
                {/* Top accent bar */}
                <div className={cn(
                  'h-1',
                  report
                    ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
                )} />

                {/* Card body */}
                <div className={cn(
                  'bg-white dark:bg-white/[0.03] border border-t-0 rounded-b-2xl p-6 md:p-7 transition-all duration-300',
                  report
                    ? 'border-slate-200 dark:border-white/[0.08] hover:border-violet-200 dark:hover:border-violet-500/20'
                    : 'border-slate-200 dark:border-white/[0.08] hover:border-emerald-200 dark:hover:border-emerald-500/20',
                  'hover:shadow-xl hover:shadow-slate-200/30 dark:hover:shadow-black/30'
                )}>
                  {/* Badge + Icon */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                      report
                        ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    )}>
                      {report ? <FileText className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
                      {report ? 'Reports' : 'Analysis'}
                    </div>
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      report
                        ? 'bg-violet-50 dark:bg-violet-500/10'
                        : 'bg-emerald-50 dark:bg-emerald-500/10'
                    )}>
                      {report
                        ? <FileText className="w-4 h-4 text-violet-500" />
                        : <BarChart3 className="w-4 h-4 text-emerald-500" />
                      }
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 leading-tight">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mb-5">{plan.description}</p>

                  {/* Price block */}
                  <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] p-4 mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{plan.price}</span>
                      <span className="text-sm text-slate-400 font-medium">{plan.period}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn(
                        'text-xs font-semibold',
                        report ? 'text-violet-500' : 'text-emerald-500'
                      )}>
                        {plan.quota}
                      </span>
                      <span className="w-px h-3 bg-slate-200 dark:bg-white/10" />
                      <span className="text-xs text-slate-400">{plan.perUnit}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                          report ? 'bg-violet-100 dark:bg-violet-500/15' : 'bg-emerald-100 dark:bg-emerald-500/15'
                        )}>
                          <Check className={cn(
                            'w-2.5 h-2.5',
                            report ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'
                          )} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* What Every Analysis Includes */}
        <div className="mb-10 p-5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">Every Analysis Includes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 max-w-2xl mx-auto">
            {[
              '7-Step Analysis (40+ indicators)',
              'MLIS Pro AI Confirmation',
              'Trade Plan (Entry/SL/TP)',
              'Snapshot PNG Reports',
              'Order Book Analysis',
              'News & Sentiment Check',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2 h-2 text-emerald-600 dark:text-emerald-400" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-lg shadow-emerald-500/25">
            START WITH 3 FREE ANALYSES <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-sm font-semibold border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 rounded-xl hover:border-slate-300 dark:hover:border-white/[0.2] transition-colors">
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
              3 free analyses &middot; No credit card &middot; Setup in 30 seconds
            </p>
          </div>
        </section>

        {/* 13. Footer */}
        <Footer variant="default" />
      </div>
    </div>
  );
}
