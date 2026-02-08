'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Footer } from '../../components/common/Footer';

// New mobile-first components
import { PriceTicker } from '../../components/home/PriceTicker';
import { Navbar } from '../../components/layout/Navbar';
import { Hero } from '../../components/home/Hero';
import { FlowAccordion } from '../../components/home/FlowAccordion';

// Lazy load the performance chart component
const LandingPerformanceChart = dynamic(
  () => import('../../components/landing/LandingPerformanceChart'),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-muted/30 rounded-lg" /> }
);

// Platform metrics component - shows real data instead of fake testimonials
function StatsBoxes() {
  const [metrics, setMetrics] = useState<{
    totalAnalyses: number;
    accuracy: number;
    totalPnL: number;
    closedCount: number;
    daysSinceStart: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
          const platformSince = data.data.platform.platformSince;
          const startDate = platformSince ? new Date(platformSince) : new Date();
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          setMetrics({
            totalAnalyses: data.data.platform.totalAnalyses || 0,
            accuracy: data.data.accuracy.overall || 0,
            totalPnL: data.data.accuracy.totalPnL || 0,
            closedCount: data.data.accuracy.closedCount || 0,
            daysSinceStart: diffDays || 1,
          });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/10 rounded-xl animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return null;
  }

  const analysesPerDay = metrics.daysSinceStart > 0
    ? (metrics.totalAnalyses / metrics.daysSinceStart).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl text-center">
        <div className="text-2xl md:text-3xl font-bold text-[#4dd0e1] mb-1">
          {metrics.totalAnalyses.toLocaleString()}
        </div>
        <p className="text-xs text-slate-500">Total Analyses</p>
      </div>

      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl text-center">
        <div className="text-2xl md:text-3xl font-bold text-[#00f5c4] mb-1">
          {metrics.closedCount > 0 ? `${metrics.accuracy}%` : '—'}
        </div>
        <p className="text-xs text-slate-500">Platform Accuracy</p>
      </div>

      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl text-center">
        <div className={`text-2xl md:text-3xl font-bold mb-1 ${metrics.totalPnL >= 0 ? 'text-[#00f5c4]' : 'text-red-400'}`}>
          {metrics.closedCount > 0 ? `${metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL}%` : '—'}
        </div>
        <p className="text-xs text-slate-500">Total P/L</p>
        {metrics.closedCount > 0 && (
          <p className="text-[10px] text-slate-600 mt-0.5">{metrics.closedCount} closed trades</p>
        )}
      </div>

      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl text-center">
        <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">
          {metrics.daysSinceStart}
        </div>
        <p className="text-xs text-slate-500">Days Elapsed</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{analysesPerDay} analyses/day</p>
      </div>
    </div>
  );
}

const FAQS = [
  {
    question: 'What is Capital Flow and why does it matter?',
    answer: 'Capital Flow tracks where institutional money is moving across global markets. The principle is simple: "Where money flows, potential exists." By monitoring Fed Balance Sheet, M2 Money Supply, DXY, and VIX, we identify which markets are receiving capital inflows—giving you a significant edge before making any trade.',
  },
  {
    question: 'How does the 4-Layer System work?',
    answer: 'Our top-down approach works in 4 layers: Layer 1 (Global Liquidity) checks if conditions favor risk assets. Layer 2 (Market Flow) identifies which market has strongest inflow (Crypto, Stocks, Bonds, Metals). Layer 3 (Sector Activity) pinpoints hot sectors. Layer 4 (Asset Analysis) provides detailed 7-Step analysis with MLIS Pro AI confirmation and entry/exit levels.',
  },
  {
    question: 'What are the market phases (EARLY, MID, LATE, EXIT)?',
    answer: 'EARLY (0-30 days): Capital just started flowing in—optimal entry time. MID (30-60 days): Trend maturing, enter with caution. LATE (60-90 days): Trend exhausting, avoid new positions. EXIT (90+ days or reversal): Capital leaving, do not enter. We display the current phase for each market.',
  },
  {
    question: 'What\'s the difference between BUY and SELL recommendations?',
    answer: 'BUY recommendations highlight markets/sectors with strong capital inflow—ideal for long positions. SELL recommendations identify markets with outflow or relative weakness—useful for short positions or avoiding certain assets. Both include confidence scores and specific sectors to focus on.',
  },
  {
    question: 'Which markets does TraderPath analyze?',
    answer: 'We track 4 major markets: Crypto (full 7-Step analysis with AI confirmation via Binance), Stocks (SPY, QQQ, major equities via Yahoo Finance), Bonds (TLT, IEF, yield curve), and Precious Metals (Gold, Silver). Each market shows flow direction, velocity, phase, and rotation signals.',
  },
  {
    question: 'Do I need to connect my exchange or wallet?',
    answer: 'No! TraderPath is purely an analysis tool. We never ask for your trading keys, wallet addresses, or exchange credentials. Your funds stay completely safe in your own accounts.',
  },
  {
    question: 'How does the credit system work?',
    answer: 'Layer 1-2 (Global Liquidity, Market Flow) are FREE for all users. Layer 3 (Sector Activity) and Layer 4 (AI Recommendations) each cost 25 credits/day. Full asset analysis costs 100 credits/day for up to 10 analyses (7-Step with MLIS Pro confirmation). Earn free credits through daily login, quizzes, and referrals.',
  },
  {
    question: 'How accurate is the analysis?',
    answer: 'Our accuracy is calculated from verified trade outcomes (TP hits vs SL hits) and displayed transparently in Platform Metrics. Capital Flow helps you trade WITH institutional money flow, not against it—significantly improving your odds.',
  },
];

// FAQ Accordion Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/[0.03] transition"
        aria-expanded={isOpen}
      >
        <span className="font-semibold flex items-center gap-2 text-white text-sm sm:text-base">
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#4dd0e1] shrink-0" />
          {question}
        </span>
        <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-slate-400">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#041020', color: '#e2e8f0' }}>
      {/* Live Price Ticker - framer-motion infinite scroll */}
      <PriceTicker />

      {/* Navbar with hamburger menu */}
      <Navbar />

      {/* Hero Section - mobile-first */}
      <Hero />

      {/* Flow Accordion - vertical step-by-step on mobile */}
      <FlowAccordion />

      {/* Performance Chart & Stats */}
      <section className="py-8 md:py-12" style={{ backgroundColor: '#041020' }}>
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          <LandingPerformanceChart />
          <StatsBoxes />
        </div>
      </section>

      {/* Pricing CTA */}
      <section
        id="pricing"
        className="py-16 sm:py-20"
        style={{ backgroundColor: 'rgba(77,208,225,0.03)' }}
      >
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
            Credit-Based Pricing
          </h2>
          <p className="text-slate-400 mb-8 text-sm sm:text-base">
            Pay only for what you use. No subscriptions, no hidden fees.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#4dd0e1]/20 text-sm sm:text-base"
            style={{
              background: 'linear-gradient(135deg, #4dd0e1, #00f5c4)',
              color: '#041020',
            }}
            aria-label="View pricing plans"
          >
            View Pricing Plans
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-20" style={{ backgroundColor: '#041020' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Everything you need to know about TraderPath
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 sm:py-16" style={{ backgroundColor: 'rgba(77,208,225,0.03)' }}>
        <div className="container mx-auto px-4">
          <p className="text-center text-slate-500 text-xs mb-6 sm:mb-8 tracking-widest uppercase">
            Trusted By Traders From
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-16 opacity-50">
            {['Binance', 'Coinbase', 'Kraken', 'KuCoin', 'Bybit'].map((name) => (
              <div key={name} className="text-lg sm:text-2xl font-bold text-slate-500">
                {name}
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-4 sm:mt-6">
            *Users from these platforms trust TraderPath for their trading analysis
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 relative overflow-hidden" style={{ backgroundColor: '#041020' }}>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center p-6 sm:p-8 md:p-12 rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-amber-400 text-xs sm:text-sm mb-6 border border-amber-500/20 bg-amber-500/10">
              <Zap className="w-4 h-4" />
              Limited Time: 25 Free Credits
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 gradient-text-logo-animate">
              Ready to Trade Smarter?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-8">
              Join 12,000+ traders who already use TraderPath to make informed decisions.
              Start with 25 free credits today.
            </p>
            <div className="px-4 sm:px-0">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-base sm:text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#4dd0e1]/20"
                style={{
                  background: 'linear-gradient(135deg, #4dd0e1, #00f5c4)',
                  color: '#041020',
                }}
                aria-label="Start free analysis - sign up"
              >
                Start Free Analysis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-6">
              No credit card required &bull; 7-day money-back guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
