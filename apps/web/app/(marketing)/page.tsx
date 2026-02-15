'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Footer } from '../../components/common/Footer';
import { PriceTicker } from '../../components/home/PriceTicker';
import { Navbar } from '../../components/layout/Navbar';
import { Hero } from '../../components/home/Hero';
import { FlowAccordion } from '../../components/home/FlowAccordion';

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

      {/* Methodology */}
      <FlowAccordion />

      {/* CTA */}
      <section className="border-t border-black/[0.06] dark:border-white/[0.06] py-16 sm:py-24">
        <div className="max-w-[600px] mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            Start Trading with AI
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
