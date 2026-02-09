'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '../../lib/utils';

// Components
import { PriceTicker } from '../../components/home/PriceTicker';
import { Navbar } from '../../components/layout/Navbar';
import { Hero } from '../../components/home/Hero';
import { FlowAccordion } from '../../components/home/FlowAccordion';

// Lazy load chart
const LandingPerformanceChart = dynamic(
  () => import('../../components/landing/LandingPerformanceChart'),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5" /> }
);

// ---------------------------------------------------------------------------
// Stats – real data from API
// ---------------------------------------------------------------------------

function StatsBoxes() {
  const [metrics, setMetrics] = useState<{
    totalAnalyses: number;
    accuracy: number;
    totalPnL: number;
    closedCount: number;
    daysSinceStart: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

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
          } catch { continue; }
        }
        if (data?.success) {
          const platformSince = data.data.platform.platformSince;
          const startDate = platformSince ? new Date(platformSince) : new Date();
          const diffDays = Math.ceil(Math.abs(Date.now() - startDate.getTime()) / 86400000);
          setMetrics({
            totalAnalyses: data.data.platform.totalAnalyses || 0,
            accuracy: data.data.accuracy.overall || 0,
            totalPnL: data.data.accuracy.totalPnL || 0,
            closedCount: data.data.accuracy.closedCount || 0,
            daysSinceStart: diffDays || 1,
          });
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/[0.06] dark:bg-white/[0.06]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-black p-4">
            <div className="h-6 w-16 bg-black/5 dark:bg-white/5 rounded animate-pulse mb-1" />
            <div className="h-3 w-24 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const stats = [
    { label: 'Total Analyses', value: metrics.totalAnalyses.toLocaleString(), color: '' },
    { label: 'Platform Accuracy', value: metrics.closedCount > 0 ? `${metrics.accuracy}%` : '—', color: 'text-emerald-500 dark:text-[#00f5c4]' },
    { label: 'Total P/L', value: metrics.closedCount > 0 ? `${metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL}%` : '—', color: metrics.totalPnL >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400' },
    { label: 'Days Elapsed', value: `${metrics.daysSinceStart}`, color: '' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/[0.06] dark:bg-white/[0.06]">
      {stats.map((s) => (
        <div key={s.label} className="bg-white dark:bg-black p-4">
          <div className={cn('text-lg sm:text-xl font-mono font-bold tabular-nums', s.color || 'text-black dark:text-white')}>
            {s.value}
          </div>
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

const FAQS = [
  {
    q: 'What is Capital Flow and why does it matter?',
    a: 'Capital Flow tracks where institutional money is moving across global markets. The principle: "Where money flows, potential exists." By monitoring Fed Balance Sheet, M2 Money Supply, DXY, and VIX, we identify which markets are receiving capital inflows.',
  },
  {
    q: 'How does the 7-Layer System work?',
    a: 'Top-down approach: L1 Global Liquidity checks macro conditions. L2 Market Flow identifies strongest inflow market. L3 Sector Activity pinpoints hot sectors. L4 Verdict Engine runs 7-step analysis with ML confirmation. L5 Screener filters all assets. L6 Risk Assessment validates against counter-flow. L7 Trade Visualizer provides interactive chart with price levels.',
  },
  {
    q: 'What are market phases (EARLY, MID, LATE, EXIT)?',
    a: 'EARLY (0-30d): Capital just started flowing—optimal entry. MID (30-60d): Trend maturing, caution. LATE (60-90d): Trend exhausting, avoid. EXIT (90+d): Capital leaving, do not enter.',
  },
  {
    q: 'Which markets are supported?',
    a: 'Crypto (Binance), Stocks (Yahoo Finance), Bonds (Treasury ETFs), Metals (Gold, Silver), and BIST (Borsa Istanbul). Each shows flow direction, velocity, phase, and rotation signals.',
  },
  {
    q: 'How does the credit system work?',
    a: 'L1-L2 are free. L3 and L4 each cost 25 credits/day. Full asset analysis costs 100 credits/day (up to 10 analyses). Earn free credits through daily login, quizzes, and referrals.',
  },
  {
    q: 'Do I need to connect my exchange?',
    a: 'No. TraderPath is purely an analysis tool. We never ask for trading keys, wallet addresses, or exchange credentials.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/[0.06] dark:border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs sm:text-sm font-mono font-semibold text-black dark:text-white pr-4">
          {q}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-1 pb-3 text-xs font-mono text-slate-500 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer (minimal inline version matching style)
// ---------------------------------------------------------------------------

function MinimalFooter() {
  return (
    <footer className="border-t border-black/[0.06] dark:border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Disclaimer */}
        <div className="mb-6 p-4 border border-black/[0.06] dark:border-white/[0.06]">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1">DISCLAIMER</div>
          <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
            This platform is for informational and educational purposes only and does not constitute financial advice.
            All investments carry risk including loss of principal. Past performance does not guarantee future results.
            Conduct your own research and consult a licensed advisor before investing.
          </p>
        </div>

        {/* Links + copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <Link href="/privacy" className="hover:text-black dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black dark:hover:text-white transition-colors">Terms</Link>
            <Link href="/disclaimer" className="hover:text-black dark:hover:text-white transition-colors">Disclaimer</Link>
            <Link href="/about" className="hover:text-black dark:hover:text-white transition-colors">About</Link>
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            &copy; {new Date().getFullYear()} TRADERPATH
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Price Ticker */}
      <PriceTicker />

      {/* Navbar */}
      <Navbar />

      {/* Hero */}
      <Hero />

      {/* Methodology (FlowAccordion) */}
      <FlowAccordion />

      {/* Performance */}
      <section id="performance" className="py-12 md:py-16 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1000px] mx-auto px-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">PERFORMANCE</div>
          <h2 className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-black dark:text-white mb-6">
            Real Data. Real Results.
          </h2>
          <LandingPerformanceChart />
          <div className="mt-6">
            <StatsBoxes />
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="py-12 md:py-16 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[600px] mx-auto px-4 text-center">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">PRICING</div>
          <h2 className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-black dark:text-white mb-3">
            Credit-Based. No Subscriptions.
          </h2>
          <p className="text-xs font-mono text-slate-500 mb-6">
            Pay only for what you use. L1-L2 free. L3-L7 premium.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
          >
            VIEW PRICING
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-12 md:py-16 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[700px] mx-auto px-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">FAQ</div>
          <h2 className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-black dark:text-white mb-6">
            Frequently Asked Questions
          </h2>
          <div>
            {FAQS.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[600px] mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 text-[10px] font-mono text-amber-500 border border-amber-500/20 bg-amber-500/5">
            25 FREE CREDITS ON SIGNUP
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold tracking-tight text-black dark:text-white mb-4">
            Ready to Trade Smarter?
          </h2>
          <p className="text-xs sm:text-sm font-mono text-slate-500 mb-8">
            Access the 7-layer decision engine. Follow institutional capital flows.
          </p>
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-mono font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
          >
            START FREE ANALYSIS
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[10px] font-mono text-slate-400 mt-4">
            No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <MinimalFooter />
    </div>
  );
}
