'use client';

// Pricing page - Weekly Subscription Plans
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
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

  const PLAN_ICONS: Record<string, typeof FileText> = {
    REPORT_WEEKLY: FileText,
    ANALYSIS_WEEKLY: BarChart3,
  };

  const PLAN_COLORS: Record<string, { border: string; bg: string; text: string }> = {
    REPORT_WEEKLY: {
      border: 'border-violet-500',
      bg: 'bg-violet-500/10',
      text: 'text-violet-600 dark:text-violet-400',
    },
    ANALYSIS_WEEKLY: {
      border: 'border-emerald-500',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="text-emerald-500">Trader</span>
              <span className="text-red-500">Path</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Simple Weekly Plans · Cancel Anytime
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Two Plans, One Price
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
              Get professional-grade trading intelligence for just $13.99/week.
              Choose reports delivered to you, or run your own analyses.
            </p>
            {!isLoggedIn && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Start with {FREE_SIGNUP_ANALYSES} free analyses — no credit card needed.
              </p>
            )}
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <section className="py-4">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-center text-sm">
                {error}
              </div>
            </div>
          </section>
        )}

        {/* Subscription Cards */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {WEEKLY_PLANS.map((plan) => {
                const Icon = PLAN_ICONS[plan.planType] || FileText;
                const colors = PLAN_COLORS[plan.planType];
                const isPurchasing = purchasing === plan.planType;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'bg-white dark:bg-slate-900 rounded-2xl border-2 p-8 relative transition-all duration-200 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50',
                      colors.border
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-6', colors.bg)}>
                      <Icon className={cn('w-7 h-7', colors.text)} />
                    </div>

                    {/* Name & Description */}
                    <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">
                        ${plan.price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/week</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-8">
                      {plan.perUnit} per {plan.planType === 'REPORT_WEEKLY' ? 'report' : 'analysis'} · {plan.quota} per week
                    </p>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSubscribe(plan.planType)}
                      disabled={isPurchasing || loading}
                      className={cn(
                        'w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200',
                        plan.planType === 'REPORT_WEEKLY'
                          ? 'bg-violet-600 hover:bg-violet-700'
                          : 'bg-emerald-600 hover:bg-emerald-700',
                        (isPurchasing || loading) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isPurchasing ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </span>
                      ) : !isLoggedIn ? (
                        'Sign Up & Subscribe'
                      ) : (
                        'Subscribe Now'
                      )}
                    </button>

                    {/* Features */}
                    <div className="mt-8 space-y-3">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Check className={cn('w-5 h-5 mt-0.5 flex-shrink-0', colors.text)} />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* AI Expert badge for Analysis plan */}
                    {plan.aiExpertQuestionsPerAnalysis > 0 && (
                      <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            AI Expert Chat Included
                          </span>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {plan.aiExpertQuestionsPerAnalysis} questions per analysis with AI Expert agents
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Two different ways to get professional trading intelligence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Intelligent Report Subscription Flow */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Intelligent Report</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: Sparkles, label: 'Subscribe', desc: 'Choose your preferred assets & timeframes' },
                    { icon: Bot, label: 'We Analyze', desc: 'System runs full 7-Step + MLIS Pro analysis daily' },
                    { icon: Send, label: 'Get Reports', desc: 'Receive Snapshot PNG via Telegram & Discord' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <step.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capital Flow & Asset Analysis Subscription Flow */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Capital Flow & Analysis</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: Target, label: 'Pick Your Asset', desc: 'Choose any asset, timeframe & analysis method' },
                    { icon: Brain, label: 'Run Analysis', desc: 'AI Concierge, Automatic, or Tailored — same price' },
                    { icon: MessageSquare, label: 'Ask AI Expert', desc: '5 questions per analysis with AI agents' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <step.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What's Included in Every Analysis */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Every Analysis Includes
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Both subscription types produce reports from the same powerful analysis engine
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {ANALYSIS_INCLUDES.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Comparison */}
        <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Incredible Value
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Professional-grade analysis at a fraction of the cost
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Traditional */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <p className="text-sm font-medium text-red-500 mb-2">Traditional Analyst</p>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">$75-140</div>
                <p className="text-sm text-muted-foreground mb-4">per analysis report</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Clock className="w-4 h-4" /> Takes hours to days</li>
                  <li className="flex items-center gap-2"><Clock className="w-4 h-4" /> Limited to few indicators</li>
                  <li className="flex items-center gap-2"><Clock className="w-4 h-4" /> Human bias & emotion</li>
                </ul>
              </div>

              {/* TraderPath */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-emerald-500 p-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                  97% SAVINGS
                </div>
                <p className="text-sm font-medium text-emerald-500 mb-2">TraderPath</p>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">$2.00</div>
                <p className="text-sm text-muted-foreground mb-4">per analysis or report</p>
                <ul className="space-y-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4" /> Results in ~60 seconds</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4" /> 40+ indicators analyzed</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4" /> AI-powered, no bias</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
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
              ].map((faq, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5"
                >
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Trade Smarter?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Join TraderPath today and get AI-powered trading intelligence for just $2 per analysis.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <Link
                href={isLoggedIn ? '/analyze' : '/register'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
              >
                {isLoggedIn ? 'Start Analyzing' : 'Try Free'}
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl transition-colors hover:border-slate-300 dark:hover:border-slate-600"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
