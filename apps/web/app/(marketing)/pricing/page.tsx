'use client';

// Pricing page - Analysis Packages + Intelligence Reports
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Star,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CreditCard,
  Crown,
  Globe,
  Layers,
  BarChart3,
  Brain,
  Bell,
  FileText,
  Bot,
  Check,
  Shield,
  Clock,
  Target,
  Sparkles,
  Package,
  Radio,
  Send,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  ANALYSIS_PACKAGES,
  FREE_SIGNUP_ANALYSES,
  ANALYSIS_INCLUDES,
  REPORT_SUBSCRIPTIONS,
  PLATFORM_SUBSCRIPTIONS,
  getPerAnalysisCost,
  type AnalysisPackage,
} from '../../../lib/pricing-config';
import { authFetch, getAuthToken, apiBaseUrl } from '../../../lib/api';
import { Footer } from '../../../components/common/Footer';

// Icon mapping for packages by ID
const PACKAGE_ICONS: Record<string, typeof Zap> = {
  explorer: Zap,
  trader: Star,
  pro: TrendingUp,
  elite: Crown,
};

// Pricing modes
type PricingMode = 'packages' | 'reports' | 'subscriptions';

export default function PricingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingMode, setPricingMode] = useState<PricingMode>('packages');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        setIsLoggedIn(true);
        const res = await authFetch('/api/user/credits');
        if (res.ok) {
          const data = await res.json();
          setBalance(data.data?.balance || data.credits || 0);
        }
      }
    } catch {
      // Not logged in
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }

    setPurchasing(true);
    setSelectedPackage(packageId);
    setError(null);

    try {
      const response = await authFetch('/api/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ packageId }),
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
      setPurchasing(false);
      setSelectedPackage(null);
    }
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
                Secure Payment · No Hidden Fees
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
              Buy analysis packages and use them anytime. No subscriptions required.
              Every analysis includes our full 7-Step + MLIS Pro AI engine.
            </p>
            {!isLoggedIn && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Start with {FREE_SIGNUP_ANALYSES} free analyses — no credit card needed.
              </p>
            )}

            {/* Mode Toggle */}
            <div className="mt-8 inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setPricingMode('packages')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  pricingMode === 'packages'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Package className="w-4 h-4" />
                Analysis Packages
              </button>
              <button
                onClick={() => setPricingMode('reports')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  pricingMode === 'reports'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Radio className="w-4 h-4" />
                Intelligence Reports
              </button>
              <button
                onClick={() => setPricingMode('subscriptions')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  pricingMode === 'subscriptions'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Sparkles className="w-4 h-4" />
                Monthly Plans
              </button>
            </div>
          </div>
        </section>

        {/* Current Balance */}
        {isLoggedIn && balance !== null && (
          <section className="py-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Balance</p>
                    <p className="text-xl font-bold">{(balance ?? 0).toLocaleString('en-US')} Credits</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

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

        {/* ==================== ANALYSIS PACKAGES MODE ==================== */}
        {pricingMode === 'packages' && (
          <>
            {/* Package Cards */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                    <Package className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Buy Once, Use Anytime
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Analysis Packages
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Each analysis includes everything: 7-Step engine, MLIS Pro AI confirmation, PDF report, trade plan with Entry/SL/TP, and more. No expiration.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                  {ANALYSIS_PACKAGES.map((pkg) => {
                    const Icon = PACKAGE_ICONS[pkg.id] || Zap;
                    const isSelected = selectedPackage === pkg.id;
                    const isPurchasing = purchasing && isSelected;

                    return (
                      <div
                        key={pkg.id}
                        className={cn(
                          'bg-white dark:bg-slate-900 rounded-xl border p-6 relative transition-all duration-200 hover:shadow-lg',
                          pkg.popular
                            ? 'border-emerald-500 shadow-md shadow-emerald-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
                          isSelected && 'border-emerald-500'
                        )}
                      >
                        {pkg.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                            BEST VALUE
                          </div>
                        )}
                        <div className="text-center">
                          {/* Icon */}
                          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-emerald-500" />
                          </div>

                          {/* Name */}
                          <h3 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">{pkg.name}</h3>

                          {/* Price */}
                          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                            {pkg.priceDisplay}
                          </div>

                          {/* Per Analysis */}
                          <p className="text-sm text-muted-foreground mb-4">
                            {pkg.perAnalysis} per analysis
                          </p>

                          {/* Analysis Count */}
                          <div className="py-4 border-t border-b border-slate-200 dark:border-slate-800 mb-4">
                            <div className="text-2xl font-bold text-emerald-500">
                              {pkg.analyses}
                              {pkg.bonus > 0 && (
                                <span className="text-base text-amber-500 ml-1">+{pkg.bonus} bonus</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">analyses</p>
                          </div>

                          {/* Features */}
                          <ul className="text-left space-y-2 mb-6">
                            {pkg.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          {/* CTA */}
                          <button
                            onClick={() => handlePurchase(pkg.id)}
                            disabled={purchasing}
                            className={cn(
                              'w-full py-3 rounded-lg font-medium text-center transition flex items-center justify-center gap-2',
                              pkg.popular
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700',
                              purchasing && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {isPurchasing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                              </>
                            ) : isLoggedIn ? (
                              <>
                                <CreditCard className="w-4 h-4" />
                                Buy Now
                              </>
                            ) : (
                              'Get Started'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-xs text-muted-foreground mt-8">
                  Secure payment processing by Lemon Squeezy. All prices in USD. Analyses never expire.
                </p>
              </div>
            </section>

            {/* What Every Analysis Includes */}
            <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    What Every Analysis Includes
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Every single analysis runs through our complete 9-step engine. No shortcuts, no lite versions.
                  </p>
                </div>
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {ANALYSIS_INCLUDES.map((item, index) => {
                      const icons = [Brain, BarChart3, Sparkles, Target, Layers, Globe, Bell, Clock, TrendingUp];
                      const Icon = icons[index] || Check;
                      return (
                        <div key={index} className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-emerald-500" />
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Value Comparison */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      The Value You Get
                    </h2>
                    <p className="text-muted-foreground">What a professional analyst charges vs TraderPath</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Traditional */}
                    <div className="p-6 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Professional Analyst</h3>
                      <ul className="space-y-3">
                        {[
                          { item: 'Technical Analysis (40+ indicators)', cost: '$25-50' },
                          { item: 'Order Book Analysis', cost: '$15-25' },
                          { item: 'Fundamental/Tokenomics Check', cost: '$10-20' },
                          { item: 'News & Sentiment Analysis', cost: '$10-15' },
                          { item: 'Trade Plan with Levels', cost: '$15-30' },
                        ].map((row, i) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{row.item}</span>
                            <span className="font-mono font-medium text-red-500">{row.cost}</span>
                          </li>
                        ))}
                        <li className="flex items-center justify-between text-sm pt-3 border-t border-red-200 dark:border-red-800/30">
                          <span className="font-semibold text-slate-900 dark:text-white">Total per analysis</span>
                          <span className="font-mono font-bold text-red-500">$75-140</span>
                        </li>
                      </ul>
                    </div>

                    {/* TraderPath */}
                    <div className="p-6 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30">
                      <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-4">TraderPath AI Engine</h3>
                      <ul className="space-y-3">
                        {[
                          'Full 7-Step Analysis (40+ indicators)',
                          'MLIS Pro AI Confirmation (5-layer)',
                          'Order Book + Tokenomics + News',
                          'Economic Calendar Risk Check',
                          'Trade Plan (Entry/SL/TP1/TP2)',
                          'PDF Report + AI Expert Question',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-slate-600 dark:text-slate-400">{item}</span>
                          </li>
                        ))}
                        <li className="flex items-center justify-between text-sm pt-3 border-t border-emerald-200 dark:border-emerald-800/30">
                          <span className="font-semibold text-slate-900 dark:text-white">Starting from</span>
                          <span className="font-mono font-bold text-emerald-500">$0.88/analysis</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                      { value: '40+', label: 'Technical Indicators', desc: 'Per analysis' },
                      { value: '9', label: 'Analysis Steps', desc: 'Complete engine' },
                      { value: '4', label: 'Markets', desc: 'Crypto, Stocks, Metals, Bonds' },
                      { value: 'No', label: 'Expiration', desc: 'Use anytime' },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="text-2xl font-bold text-emerald-500 mb-1">{item.value}</div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ==================== INTELLIGENCE REPORTS MODE ==================== */}
        {pricingMode === 'reports' && (
          <>
            {/* Report Plans */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4">
                    <Radio className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                      Professional Reports + Trade Signals
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Intelligence Report Service
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Receive daily professional analysis reports with trade signals for multiple assets.
                    Each report includes full 7-Step analysis, PDF download, and signal delivery.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {REPORT_SUBSCRIPTIONS.map((plan) => (
                    <div
                      key={plan.id}
                      className={cn(
                        'bg-white dark:bg-slate-900 rounded-xl border p-6 relative transition-all duration-200',
                        plan.popular
                          ? 'border-violet-500 shadow-lg shadow-violet-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 text-white text-xs font-semibold rounded-full">
                          RECOMMENDED
                        </div>
                      )}
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-violet-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">{plan.name}</h3>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                          ${plan.price}
                          <span className="text-base font-normal text-muted-foreground">/mo</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-violet-500" />
                          <span className="text-sm font-medium text-violet-500">
                            {plan.reportsPerDay} reports per day
                          </span>
                        </div>

                        {/* Markets */}
                        <div className="flex flex-wrap justify-center gap-1 mb-4">
                          {plan.markets.map((market) => (
                            <span
                              key={market}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"
                            >
                              {market.toUpperCase()}
                            </span>
                          ))}
                        </div>

                        {/* Features */}
                        <ul className="text-left space-y-2 mb-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => {
                            if (!isLoggedIn) {
                              router.push('/register');
                            } else {
                              router.push(`/settings?subscribe=${plan.id}`);
                            }
                          }}
                          className={cn(
                            'w-full py-3 rounded-lg font-medium text-center transition flex items-center justify-center gap-2',
                            plan.popular
                              ? 'bg-violet-500 text-white hover:bg-violet-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                          )}
                        >
                          <Send className="w-4 h-4" />
                          {isLoggedIn ? 'Subscribe Now' : 'Get Started'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-center text-xs text-muted-foreground mt-8">
                  Cancel anytime. Secure payment by Lemon Squeezy.
                </p>
              </div>
            </section>

            {/* What Each Report Includes */}
            <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    What Each Report Includes
                  </h2>
                  <p className="text-muted-foreground">Every report is a complete professional analysis, not just a signal</p>
                </div>
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { Icon: Brain, title: 'Full 7-Step + MLIS Pro Analysis', desc: 'Complete 9-step engine runs on every asset', badge: 'INCLUDED', badgeColor: 'violet' },
                      { Icon: Target, title: 'Entry, SL, TP1, TP2 Levels', desc: 'Precise trade levels with risk management', badge: 'INCLUDED', badgeColor: 'violet' },
                      { Icon: FileText, title: 'PDF Report Download', desc: 'Professional PDF with charts, indicators, and analysis', badge: 'INCLUDED', badgeColor: 'violet' },
                      { Icon: Globe, title: 'Capital Flow Context', desc: 'How global money flows affect this trade', badge: 'PRO', badgeColor: 'amber' },
                      { Icon: TrendingUp, title: 'Outcome Tracking', desc: 'Get notified when TP or SL is hit', badge: 'INCLUDED', badgeColor: 'violet' },
                      { Icon: Bell, title: 'Multi-Channel Delivery', desc: 'Telegram, Discord, and Email delivery', badge: 'INCLUDED', badgeColor: 'violet' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          item.badgeColor === 'violet' ? "bg-violet-500/10" : "bg-amber-500/10"
                        )}>
                          <item.Icon className={cn(
                            'w-5 h-5',
                            item.badgeColor === 'violet' ? "text-violet-500" : "text-amber-500"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-semibold rounded-full",
                              item.badgeColor === 'violet'
                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    How Intelligence Reports Work
                  </h2>
                  <p className="text-muted-foreground">Automated analysis delivered straight to your phone</p>
                </div>
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { Icon: Globe, title: 'Capital Flow Scan', desc: 'We scan global money flows across 4 markets continuously' },
                      { Icon: Target, title: 'Asset Selection', desc: 'AI identifies the highest-probability opportunities' },
                      { Icon: Brain, title: '7-Step + MLIS Pro', desc: 'Full analysis validates each opportunity before reporting' },
                      { Icon: Send, title: 'Report Delivery', desc: 'PDF report + signal sent to Telegram, Discord, or Email' },
                    ].map((item, index) => (
                      <div key={index} className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-violet-500/10 flex items-center justify-center relative">
                          <item.Icon className="w-6 h-6 text-violet-500" />
                          {index < 3 && (
                            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 absolute -right-6 top-1/2 -translate-y-1/2 hidden md:block" />
                          )}
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">{item.title}</div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Comparison Box */}
            <section className="py-8">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto p-6 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                        Packages vs Reports — Which is Right for You?
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Analysis Packages</strong> — You choose which assets to analyze, run them yourself, and get full control. Best for active traders.
                        <br />
                        <strong>Intelligence Reports</strong> — We find the best opportunities and deliver professional reports + signals automatically. Best for busy traders.
                      </p>
                      <button
                        onClick={() => setPricingMode('packages')}
                        className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        View Analysis Packages →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ==================== MONTHLY SUBSCRIPTIONS MODE ==================== */}
        {pricingMode === 'subscriptions' && (
          <>
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Monthly Subscription
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Platform Subscriptions
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    For power users who analyze markets daily. Get daily analyses, full Capital Flow access, and premium features.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {PLATFORM_SUBSCRIPTIONS.map((sub) => (
                    <div
                      key={sub.id}
                      className={cn(
                        'bg-white dark:bg-slate-900 rounded-xl border p-6 relative transition-all duration-200',
                        sub.popular
                          ? 'border-amber-500 shadow-lg shadow-amber-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      {sub.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                          BEST VALUE
                        </div>
                      )}
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          {sub.tier === 'starter' && <Zap className="w-6 h-6 text-amber-500" />}
                          {sub.tier === 'pro' && <Star className="w-6 h-6 text-amber-500" />}
                          {sub.tier === 'elite' && <Crown className="w-6 h-6 text-amber-500" />}
                        </div>
                        <h3 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">{sub.name}</h3>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                          ${sub.price}
                          <span className="text-base font-normal text-muted-foreground">/mo</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <BarChart3 className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            {sub.analysesPerDay === 'unlimited' ? 'Unlimited' : sub.analysesPerDay} analyses/day
                          </span>
                        </div>

                        <ul className="text-left space-y-2 mb-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                          {sub.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => {
                            if (!isLoggedIn) {
                              router.push('/register');
                            } else {
                              router.push(`/settings?subscribe=${sub.tier}`);
                            }
                          }}
                          className={cn(
                            'w-full py-3 rounded-lg font-medium text-center transition flex items-center justify-center gap-2',
                            sub.popular
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                          )}
                        >
                          <CreditCard className="w-4 h-4" />
                          {isLoggedIn ? 'Subscribe Now' : 'Get Started'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-center text-xs text-muted-foreground mt-8">
                  Cancel anytime. Secure payment by Lemon Squeezy.
                </p>
              </div>
            </section>

            {/* Comparison */}
            <section className="py-8">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto p-6 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                        Prefer to pay per analysis?
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Analysis Packages let you buy analyses once and use them anytime. No monthly commitment. Packages start from $9.99 for 5 analyses.
                      </p>
                      <button
                        onClick={() => setPricingMode('packages')}
                        className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        View Analysis Packages →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* FAQ */}
        <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {[
                {
                  q: 'What exactly is one analysis?',
                  a: 'One analysis runs our complete 9-step engine on a single asset and timeframe: 7-Step Analysis with 40+ indicators, MLIS Pro 5-layer AI confirmation, RAG Intelligence enrichment. You get a complete trade plan with Entry, SL, TP levels, plus a downloadable PDF report.',
                },
                {
                  q: 'Do analyses expire?',
                  a: 'No. Purchased analyses never expire. Buy them today, use them whenever you want. There are no daily limits on when you use your analyses.',
                },
                {
                  q: 'What is the Intelligence Report service?',
                  a: 'It is a monthly subscription where our AI engine automatically finds trading opportunities, runs full analyses, and delivers professional PDF reports with trade signals to your Telegram, Discord, or Email. It is a complete report service with signals included.',
                },
                {
                  q: 'Can I use both packages and subscriptions?',
                  a: 'Yes. You can buy analysis packages for on-demand use and also subscribe to the report service or platform plan. They work independently.',
                },
                {
                  q: 'What markets are supported?',
                  a: 'TraderPath supports 4 markets: Crypto, Stocks, Precious Metals, and Bonds. With 200+ assets available for analysis across all markets.',
                },
                {
                  q: 'Is there a free trial?',
                  a: `Yes. Every new account gets ${FREE_SIGNUP_ANALYSES} free analyses with no credit card required. This gives you enough to experience the full analysis engine before purchasing.`,
                },
              ].map((faq, index) => (
                <div key={index} className="p-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        {!isLoggedIn && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                  Start Trading Smarter Today
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create your free account and receive {FREE_SIGNUP_ANALYSES} analyses to experience the full power of our AI engine.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Create Free Account
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
