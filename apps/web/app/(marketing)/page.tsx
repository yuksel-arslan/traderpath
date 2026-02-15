'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// STATS – Real platform data
// ---------------------------------------------------------------------------

function Stats() {
  const [data, setData] = useState<{
    analyses: number;
    accuracy: number;
    pnl: number;
    closed: number;
  } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await window.fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io'}/api/analysis/platform-stats`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        if (json.success) {
          setData({
            analyses: json.data.platform.totalAnalyses || 0,
            accuracy: json.data.accuracy.overall || 0,
            pnl: json.data.accuracy.totalPnL || 0,
            closed: json.data.accuracy.closedCount || 0,
          });
        }
      } catch {
        // silent
      }
    };
    fetch();
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-black/5 dark:bg-white/5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-black p-6 lg:p-8">
            <div className="h-8 w-20 bg-black/5 dark:bg-white/5 mb-2 animate-pulse" />
            <div className="h-4 w-24 bg-black/5 dark:bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'ANALYSES', value: data.analyses.toLocaleString() },
    { label: 'ACCURACY', value: data.closed > 0 ? `${data.accuracy}%` : '—' },
    { label: 'P/L', value: data.closed > 0 ? `${data.pnl >= 0 ? '+' : ''}${data.pnl}%` : '—' },
    { label: 'VERIFIED', value: data.closed.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-black/5 dark:bg-white/5">
      {stats.map((s, i) => (
        <div key={i} className="bg-white dark:bg-black p-6 lg:p-8">
          <div className="font-mono text-3xl lg:text-4xl font-bold mb-1">{s.value}</div>
          <div className="text-xs tracking-wider text-black/40 dark:text-white/40">{s.label}</div>
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
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* NAVBAR */}
      <nav className="border-b border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-mono text-xl font-bold">TRADERPATH</div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-mono hover:text-[#00f5c4] transition-colors"
            >
              LOGIN
            </Link>
            <Link
              href="/pricing"
              className="bg-[#00f5c4] text-black px-4 py-2 text-sm font-mono font-bold hover:bg-[#00d9b0] transition-colors"
            >
              PRICING
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-4xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8">
              AI-POWERED
              <br />
              TRADING
              <br />
              ANALYSIS
            </h1>
            <p className="text-xl lg:text-2xl text-black/60 dark:text-white/60 mb-12 max-w-2xl">
              Capital Flow intelligence meets machine learning. Follow the money, trade with confidence.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-8 py-4 text-base font-mono font-bold hover:bg-black/80 dark:hover:bg-white/80 transition-colors group"
            >
              START FREE
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-black/10 dark:border-white/10">
        <Stats />
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <h2 className="text-3xl lg:text-4xl font-bold mb-16">HOW IT WORKS</h2>
          <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
            {[
              {
                num: '01',
                title: 'CAPITAL FLOW',
                desc: 'Track global liquidity across markets. See where money flows in real-time.',
              },
              {
                num: '02',
                title: 'AI ANALYSIS',
                desc: '7-Step + MLIS Pro analysis. 40+ indicators. Machine learning confirmation.',
              },
              {
                num: '03',
                title: 'TRADE PLAN',
                desc: 'Precise entry, stop loss, take profit. Risk-reward calculated. Ready to execute.',
              },
            ].map((step, i) => (
              <div key={i}>
                <div className="font-mono text-6xl font-bold text-[#00f5c4] mb-4">{step.num}</div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-black/60 dark:text-white/60">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-px bg-black/5 dark:bg-white/5">
            {[
              {
                title: '4-LAYER CAPITAL FLOW',
                items: ['Global Liquidity Tracker', 'Market Flow Analyzer', 'Sector Drill-Down', 'AI Recommendations'],
              },
              {
                title: 'DUAL ANALYSIS ENGINE',
                items: ['7-Step Classic Analysis', 'MLIS Pro (ML Signals)', '40+ Technical Indicators', 'Inter-Market Validation'],
              },
              {
                title: 'PROACTIVE SIGNALS',
                items: ['Automated Market Scans', 'Real-Time Opportunities', 'Telegram/Discord Delivery', 'Quality Score Filtering'],
              },
              {
                title: 'SMART ALERTS',
                items: ['L1-L4 Hierarchy Monitoring', 'Phase Change Detection', 'Rotation Signals', 'Risk-Off Warnings'],
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-black p-8 lg:p-12">
                <h3 className="text-xl font-bold mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-[#00f5c4] mt-2 flex-shrink-0" />
                      <span className="text-black/70 dark:text-white/70">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              START TRADING WITH AI
            </h2>
            <p className="text-xl text-black/60 dark:text-white/60 mb-12">
              Join thousands of traders using capital flow intelligence to make better decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black px-8 py-4 text-base font-mono font-bold hover:bg-black/80 dark:hover:bg-white/80 transition-colors group"
              >
                GET STARTED FREE
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-mono font-bold border-2 border-black dark:border-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                VIEW PRICING
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="font-mono text-sm font-bold mb-4">PRODUCT</div>
              <ul className="space-y-2 text-sm text-black/60 dark:text-white/60">
                <li><Link href="/pricing" className="hover:text-[#00f5c4]">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-[#00f5c4]">Login</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-sm font-bold mb-4">COMPANY</div>
              <ul className="space-y-2 text-sm text-black/60 dark:text-white/60">
                <li><Link href="/about" className="hover:text-[#00f5c4]">About</Link></li>
                <li><Link href="/status" className="hover:text-[#00f5c4]">Status</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-sm font-bold mb-4">LEGAL</div>
              <ul className="space-y-2 text-sm text-black/60 dark:text-white/60">
                <li><Link href="/privacy" className="hover:text-[#00f5c4]">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-[#00f5c4]">Terms</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-sm font-bold mb-4">CONNECT</div>
              <ul className="space-y-2 text-sm text-black/60 dark:text-white/60">
                <li><a href="https://twitter.com/traderpath" className="hover:text-[#00f5c4]">Twitter</a></li>
                <li><a href="https://discord.gg/traderpath" className="hover:text-[#00f5c4]">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-black/10 dark:border-white/10">
            <div className="font-mono text-sm text-black/40 dark:text-white/40">
              © 2026 TraderPath. All rights reserved.
            </div>
            <div className="font-mono text-xs text-black/40 dark:text-white/40 mt-4 md:mt-0">
              NOT FINANCIAL ADVICE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
