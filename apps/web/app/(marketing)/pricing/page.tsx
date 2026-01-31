'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Star,
  TrendingUp,
  ArrowRight,
  HelpCircle,
  Gem,
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
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CREDIT_PACKAGES, FREE_SIGNUP_CREDITS, getPerCreditCost, ANALYSIS_BUNDLES } from '../../../lib/pricing-config';
import { authFetch, getAuthToken, apiBaseUrl } from '../../../lib/api';
import { Footer } from '../../../components/common/Footer';

// Format credits with full number display (1000087 → 1,000,087)
function formatCredits(num: number): string {
  return num.toLocaleString('en-US');
}

// Package type from API
interface ApiPackage {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: string;
  perCredit: string;
  popular: boolean;
}

// Icon mapping for packages by ID
const PACKAGE_ICONS: Record<string, typeof Zap> = {
  starter: Zap,
  trader: Star,
  pro: TrendingUp,
  whale: Crown,
};

// Updated FAQs for Capital Flow approach
const FAQS = [
  {
    question: 'What is Capital Flow analysis?',
    answer:
      'Capital Flow tracks where institutional money is moving across markets (Crypto, Stocks, Bonds, Metals). We follow the principle: "Where money flows, potential exists." This top-down approach helps you identify opportunities before the crowd.',
  },
  {
    question: 'How does the 4-Layer system work?',
    answer:
      'Layer 1 tracks global liquidity (Fed, M2, DXY). Layer 2 shows market flows across asset classes. Layer 3 drills into sectors. Layer 4 provides AI-powered BUY/SELL recommendations. Each layer builds on the previous one for comprehensive analysis.',
  },
  {
    question: 'What are credits and how do I use them?',
    answer:
      'Credits are used for premium features: Layer 3-4 access (25 credits/day each) and asset analysis (100 credits/day for up to 10 analyses). Layers 1-2 are always FREE. Credits never expire.',
  },
  {
    question: 'What\'s included in each analysis?',
    answer:
      'Choose between 7-Step Classic Analysis or MLIS Pro (5-Layer Neural Analysis). Both include trade plans with entry/SL/TP levels, AI Expert consultation, PDF reports, email sharing, and price alerts.',
  },
  {
    question: 'How do I earn free credits?',
    answer:
      'Earn daily credits through login bonuses, lucky spin, daily quiz, and trade completion bonuses. Active traders can earn 20-50 free credits every day!',
  },
  {
    question: 'What markets can I analyze?',
    answer:
      'TraderPath supports Crypto (via Binance), Stocks (via Yahoo Finance), Bonds, and Precious Metals. Capital Flow helps you identify which market has the best opportunities right now.',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/payments/packages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.packages) {
          setPackages(data.data.packages);
          return;
        }
      }
      // API failed - use static fallback
      const fallbackPackages: ApiPackage[] = CREDIT_PACKAGES.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        bonus: pkg.bonus,
        price: pkg.priceDisplay,
        perCredit: getPerCreditCost(pkg),
        popular: pkg.popular || false,
      }));
      setPackages(fallbackPackages);
    } catch {
      // Use static fallback on error
      const fallbackPackages: ApiPackage[] = CREDIT_PACKAGES.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        bonus: pkg.bonus,
        price: pkg.priceDisplay,
        perCredit: getPerCreditCost(pkg),
        popular: pkg.popular || false,
      }));
      setPackages(fallbackPackages);
    } finally {
      setPackagesLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        setIsLoggedIn(true);
        // Fetch balance
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
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setPurchasing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Logo Header - No Navigation */}
      <header className="py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold">
              <span className="text-emerald-500">Trader</span>
              <span className="text-red-500">Path</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-emerald-500">Transparent</span>{' '}
              <span className="text-slate-900 dark:text-white">Pricing</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Pay only for what you use. No subscriptions, no hidden fees.
              {!isLoggedIn && ` Start with ${FREE_SIGNUP_CREDITS} free credits.`}
            </p>
          </div>
        </section>

        {/* Current Balance - Only for logged in users */}
        {isLoggedIn && balance !== null && (
          <section className="pb-8">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Gem className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Your Balance</p>
                      <p className="text-2xl font-bold">{formatCredits(balance ?? 0)} Credits</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error Message */}
        {error && (
          <section className="pb-8">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-center">
                {error}
              </div>
            </div>
          </section>
        )}

        {/* Credit Packages */}
        <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-2">
              <span className="text-emerald-500">Credit</span>{' '}
              <span className="text-slate-900 dark:text-white">Packages</span>
            </h2>
            <p className="text-muted-foreground text-center mb-8">Choose the package that fits your trading style</p>
            {packagesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No packages available at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {packages.map((pkg) => {
                  const nameKey = pkg.name.toLowerCase().split(' ')[0];
                  const Icon = PACKAGE_ICONS[nameKey] || PACKAGE_ICONS[pkg.id] || Zap;
                  const isSelected = selectedPackage === pkg.id;
                  const isPurchasing = purchasing && isSelected;

                  return (
                    <div
                      key={pkg.id}
                      className={cn(
                        'bg-white dark:bg-slate-800 rounded-xl border-2 p-6 relative text-center transition-all duration-200',
                        pkg.popular
                          ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 ring-offset-background shadow-lg shadow-emerald-500/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/50',
                        isSelected && 'border-emerald-500'
                      )}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                          MOST POPULAR
                        </div>
                      )}
                      <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{pkg.name}</h3>
                      <div className="text-3xl font-bold text-emerald-500 mb-1">
                        {pkg.credits}
                        {pkg.bonus > 0 && <span className="text-lg text-red-500 ml-1">+{pkg.bonus}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">credits</p>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{pkg.price}</div>
                      <p className="text-sm text-muted-foreground mb-6">{pkg.perCredit}/credit</p>
                      <button
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={purchasing}
                        className={cn(
                          'w-full py-3 rounded-lg font-semibold text-center transition flex items-center justify-center gap-2',
                          pkg.popular
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600',
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
                  );
                })}
              </div>
            )}
            {isLoggedIn && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Secure payment powered by Lemon Squeezy
              </p>
            )}
          </div>
        </section>

        {/* What's Included - Updated for Capital Flow */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-2">
              <span className="text-emerald-500">All Packages</span>{' '}
              <span className="text-slate-900 dark:text-white">Include</span>
            </h2>
            <p className="text-muted-foreground text-center mb-10">Everything you need to trade smarter</p>
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { Icon: Globe, title: 'Capital Flow L1-L2', desc: 'Global Liquidity & Market Flow', color: 'text-blue-500', badge: 'FREE' },
                  { Icon: Layers, title: 'Sector Analysis', desc: 'Layer 3 Drill-Down', color: 'text-purple-500', badge: '25/day' },
                  { Icon: Brain, title: 'AI Recommendations', desc: 'Layer 4 BUY/SELL Signals', color: 'text-pink-500', badge: '25/day' },
                  { Icon: BarChart3, title: 'Asset Analysis', desc: '7-Step or MLIS Pro', color: 'text-emerald-500', badge: '100/day' },
                  { Icon: Bot, title: 'AI Expert Chat', desc: '3 free questions per analysis', color: 'text-violet-500', badge: null },
                  { Icon: FileText, title: 'PDF Reports', desc: 'Download & share anytime', color: 'text-teal-500', badge: null },
                  { Icon: Bell, title: 'Price Alerts', desc: 'Never miss a move', color: 'text-amber-500', badge: null },
                  { Icon: Gem, title: 'Daily Rewards', desc: 'Earn free credits daily', color: 'text-red-500', badge: null },
                ].map((item, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-center relative">
                    {item.badge && (
                      <div className={cn(
                        "absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold rounded-full",
                        item.badge === 'FREE'
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      )}>
                        {item.badge}
                      </div>
                    )}
                    <div className="flex justify-center mb-3">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center",
                        item.color === 'text-blue-500' && "bg-blue-500/10",
                        item.color === 'text-purple-500' && "bg-purple-500/10",
                        item.color === 'text-pink-500' && "bg-pink-500/10",
                        item.color === 'text-emerald-500' && "bg-emerald-500/10",
                        item.color === 'text-violet-500' && "bg-violet-500/10",
                        item.color === 'text-teal-500' && "bg-teal-500/10",
                        item.color === 'text-amber-500' && "bg-amber-500/10",
                        item.color === 'text-red-500' && "bg-red-500/10",
                      )}>
                        <item.Icon className={cn('w-6 h-6', item.color)} />
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-2">
              <span className="text-emerald-500">Frequently Asked</span>{' '}
              <span className="text-slate-900 dark:text-white">Questions</span>
            </h2>
            <p className="text-muted-foreground text-center mb-10">Everything you need to know</p>
            <div className="max-w-3xl mx-auto space-y-4">
              {FAQS.map((faq, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="font-semibold flex items-center gap-2 mb-2 text-slate-900 dark:text-white">
                    <HelpCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground text-sm pl-7 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        {!isLoggedIn && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center p-8 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <h2 className="text-2xl font-bold mb-4">
                  <span className="text-slate-900 dark:text-white">Ready to Start</span>{' '}
                  <span className="text-emerald-500">Trading Smarter?</span>
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create your free account and get {FREE_SIGNUP_CREDITS} credits to start analyzing.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Common Footer */}
      <Footer />
    </div>
  );
}
