'use client';

// Pricing page - Weekly Subscription Plans
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileText,
  BarChart3,
  Check,
  Shield,
  Clock,
  Sparkles,
  Send,
  Brain,
  Target,
  MessageSquare,
  Bot,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  WEEKLY_PLANS,
  FREE_SIGNUP_ANALYSES,
  ANALYSIS_INCLUDES,
} from '../../../lib/pricing-config';
import { authFetch, getAuthToken } from '../../../lib/api';
import { Footer } from '../../../components/common/Footer';

export default function PricingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        setIsLoggedIn(true);
      }
    } catch {
      // Not logged in
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }

    setPurchasing(planType);
    setError(null);

    try {
      const response = await authFetch('/api/weekly-plans/checkout', {
        method: 'POST',
        body: JSON.stringify({ planType }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message || 'Failed to start checkout');
      setPurchasing(null);
    }
  };

  const isReport = (planType: string) => planType === 'REPORT_WEEKLY';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <header className="py-4 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="text-emerald-500">Trader</span>
              <span className="text-red-500">Path</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-20 pb-8">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tracking-wide">
                WEEKLY PLANS · CANCEL ANYTIME
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">
              Choose Your Plan
            </h1>
            <p className="text-base text-slate-500 max-w-xl mx-auto mb-3">
              Professional-grade trading intelligence. Pick one plan that fits your style.
            </p>
            {!isLoggedIn && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Start with {FREE_SIGNUP_ANALYSES} free analyses — no credit card needed
              </p>
            )}
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <section className="pb-4">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-center text-sm">
                {error}
              </div>
            </div>
          </section>
        )}

        {/* Subscription Cards */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {WEEKLY_PLANS.map((plan) => {
                const isPurchasing = purchasing === plan.planType;
                const report = isReport(plan.planType);

                return (
                  <div
                    key={plan.id}
                    className="group relative rounded-2xl overflow-hidden"
                  >
                    {/* Top accent bar */}
                    <div className={cn(
                      'h-1',
                      report
                        ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
                    )} />

                    {/* Card body */}
                    <div className={cn(
                      'relative bg-white dark:bg-[#111111] border border-t-0 rounded-b-2xl p-8 md:p-10 transition-all duration-300',
                      report
                        ? 'border-slate-200 dark:border-white/[0.08] hover:border-violet-200 dark:hover:border-violet-500/20'
                        : 'border-slate-200 dark:border-white/[0.08] hover:border-emerald-200 dark:hover:border-emerald-500/20',
                      'hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40'
                    )}>
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-8">
                        <div>
                          <div className={cn(
                            'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-4',
                            report
                              ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          )}>
                            {report ? <FileText className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
                            {report ? 'Reports' : 'Analysis'}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                            {plan.name}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1.5">
                            {plan.description}
                          </p>
                        </div>

                        {/* Icon */}
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-4',
                          report
                            ? 'bg-gradient-to-br from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20'
                            : 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20'
                        )}>
                          {report
                            ? <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            : <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          }
                        </div>
                      </div>

                      {/* Price block */}
                      <div className={cn(
                        'rounded-xl p-5 mb-8',
                        'bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]'
                      )}>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                            ${plan.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-slate-400 font-medium">/week</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={cn(
                            'text-sm font-semibold',
                            report ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'
                          )}>
                            {plan.quota} {report ? 'reports' : 'analyses'}/week
                          </span>
                          <span className="w-px h-3.5 bg-slate-200 dark:bg-white/10" />
                          <span className="text-sm text-slate-400">
                            {plan.perUnit} each
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-3 mb-8">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">What&apos;s included</p>
                        {plan.features.map((feature, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                              report
                                ? 'bg-violet-100 dark:bg-violet-500/15'
                                : 'bg-emerald-100 dark:bg-emerald-500/15'
                            )}>
                              <Check className={cn(
                                'w-3 h-3',
                                report ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'
                              )} />
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* AI Expert badge for Analysis plan */}
                      {plan.aiExpertQuestionsPerAnalysis > 0 && (
                        <div className={cn(
                          'flex items-center gap-3 p-3.5 rounded-xl mb-8',
                          'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/[0.08] dark:to-orange-500/[0.08]',
                          'border border-amber-200/60 dark:border-amber-500/20'
                        )}>
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                              AI Expert Chat Included
                            </p>
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                              {plan.aiExpertQuestionsPerAnalysis} questions per analysis
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CTA Button */}
                      <button
                        onClick={() => handleSubscribe(plan.planType)}
                        disabled={isPurchasing || loading}
                        className={cn(
                          'w-full py-3.5 px-6 rounded-xl font-semibold text-white text-sm transition-all duration-200 flex items-center justify-center gap-2',
                          report
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40',
                          (isPurchasing || loading) && 'opacity-50 cursor-not-allowed shadow-none'
                        )}
                      >
                        {isPurchasing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : !isLoggedIn ? (
                          <>
                            Sign Up & Subscribe
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Subscribe Now
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <p className="text-center text-xs text-slate-400 mt-3">
                        Cancel anytime. Quota resets weekly.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">HOW IT WORKS</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Two Ways to Get Intelligence
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Intelligent Report Flow */}
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Intelligent Report</h3>
                    <p className="text-xs text-slate-400">We do the work, you get the results</p>
                  </div>
                </div>
                <div className="space-y-5">
                  {[
                    { icon: Sparkles, step: '01', label: 'Subscribe', desc: 'Choose your preferred assets & timeframes' },
                    { icon: Bot, step: '02', label: 'We Analyze', desc: 'System runs full 7-Step + MLIS Pro analysis daily' },
                    { icon: Send, step: '03', label: 'Get Reports', desc: 'Receive Snapshot PNG via Telegram & Discord' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-violet-400 tabular-nums">{s.step}</span>
                        <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mt-1">
                          <s.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </div>
                      </div>
                      <div className="pt-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capital Flow Flow */}
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Capital Flow & Analysis</h3>
                    <p className="text-xs text-slate-400">You drive, AI assists</p>
                  </div>
                </div>
                <div className="space-y-5">
                  {[
                    { icon: Target, step: '01', label: 'Pick Your Asset', desc: 'Choose any asset, timeframe & analysis method' },
                    { icon: Brain, step: '02', label: 'Run Analysis', desc: 'AI Concierge, Automatic, or Tailored — same price' },
                    { icon: MessageSquare, step: '03', label: 'Ask AI Expert', desc: '5 questions per analysis with AI agents' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-emerald-400 tabular-nums">{s.step}</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mt-1">
                          <s.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                      <div className="pt-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Every Analysis Includes */}
        <section className="py-16 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">POWERED BY</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Every Analysis Includes
              </h2>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                The same powerful dual-engine powers both plans
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
              {ANALYSIS_INCLUDES.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Comparison */}
        <section className="py-16 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">VALUE</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Incredible Value
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Traditional */}
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] p-6 md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400 mb-3">Traditional Analyst</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">$75–140</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">per analysis report</p>
                <div className="space-y-3">
                  {[
                    'Takes hours to days',
                    'Limited to few indicators',
                    'Human bias & emotion',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3 h-3 text-red-500 dark:text-red-400" />
                      </div>
                      <span className="text-sm text-slate-500">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TraderPath */}
              <div className="relative rounded-xl bg-white dark:bg-[#111111] p-6 md:p-8 border-2 border-emerald-500/50 dark:border-emerald-500/30">
                <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-full tracking-wide">
                  97% SAVINGS
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500 mb-3">TraderPath</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">$2.00</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">per analysis or report</p>
                <div className="space-y-3">
                  {[
                    'Results in ~60 seconds',
                    '40+ indicators analyzed',
                    'AI-powered, no bias',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm text-emerald-700 dark:text-emerald-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">FAQ</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="max-w-2xl mx-auto divide-y divide-slate-100 dark:divide-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
              {[
                {
                  q: 'What is the difference between the two subscriptions?',
                  a: 'Intelligent Report Subscription delivers daily reports to you automatically via Telegram & Discord. Capital Flow & Asset Analysis Subscription gives you 7 analyses per week to run yourself with any method (AI Concierge, Automatic, or Tailored), plus 5 AI Expert questions per analysis.',
                },
                {
                  q: 'What report types will I receive?',
                  a: 'Each subscription produces Executive Summary (3-4 Snapshot PNGs with key metrics) or Detailed Analysis Report (6-8 Snapshot PNGs with full indicator data). Delivered inline via Telegram & Discord.',
                },
                {
                  q: 'How does the weekly billing work?',
                  a: 'You are billed $13.99 every 7 days. Your quota resets to 7 at each renewal. Cancel anytime — your access continues until the end of the current billing period.',
                },
                {
                  q: 'What markets are supported?',
                  a: 'Crypto, Stocks, Metals, and Bonds. Choose any supported asset and timeframe (5m, 15m, 30m, 1h, 2h, 4h, 1d, 1W).',
                },
                {
                  q: 'Can I try before subscribing?',
                  a: `Yes! Sign up and get ${FREE_SIGNUP_ANALYSES} free analyses — no credit card required. Experience the full 7-Step + MLIS Pro analysis engine before committing.`,
                },
                {
                  q: 'Can I switch between plans?',
                  a: 'Yes. Cancel your current plan and subscribe to the other one. Your remaining access continues until the end of the current billing period.',
                },
              ].map((faq, i) => (
                <button
                  key={i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 bg-white dark:bg-[#111111] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{faq.q}</h3>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200',
                      openFaq === i && 'rotate-180'
                    )} />
                  </div>
                  <div className={cn(
                    'overflow-hidden transition-all duration-200',
                    openFaq === i ? 'max-h-40 mt-2 opacity-100' : 'max-h-0 opacity-0'
                  )}>
                    <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                Ready to Trade Smarter?
              </h2>
              <p className="text-base text-slate-500 mb-8">
                AI-powered trading intelligence for just $2 per analysis.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
                <Link
                  href={isLoggedIn ? '/analyze' : '/register'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/25"
                >
                  {isLoggedIn ? 'Start Analyzing' : 'Try Free'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white text-sm font-semibold rounded-xl transition-colors hover:border-slate-300 dark:hover:border-white/[0.2]"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
