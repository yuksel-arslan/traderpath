'use client';

// Pricing page - handles credit packages and signal subscriptions
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Star,
  TrendingUp,
  ArrowLeft,
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
  Check,
  Shield,
  Radio,
  Send,
  Clock,
  Target,
  Sparkles,
  Calendar,
  Gift,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CREDIT_PACKAGES, FREE_SIGNUP_CREDITS, getPerCreditCost, SIGNAL_SUBSCRIPTIONS, DAILY_PASS_COSTS } from '../../../lib/pricing-config';
import { authFetch, getAuthToken, apiBaseUrl } from '../../../lib/api';
import { Footer } from '../../../components/common/Footer';
import { SubscriptionTiers } from '../../../components/pricing/SubscriptionTiers';

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

// Pricing modes
type PricingMode = 'active' | 'signals';

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
  const [packagesFromApi, setPackagesFromApi] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>('active');

  useEffect(() => {
    checkAuthStatus();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/payments/packages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.packages && data.data.packages.length > 0) {
          setPackages(data.data.packages);
          setPackagesFromApi(true);
          return;
        }
      }
      // API failed - use static fallback (display only)
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
      setPackagesFromApi(false);
    } catch {
      // Use static fallback on error (display only)
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
      setPackagesFromApi(false);
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

    // Check if packages are from API (have valid UUIDs)
    if (!packagesFromApi) {
      setError('Payment system is temporarily unavailable. Please try again later.');
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
      {/* Corporate Header */}
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
        {/* Hero - Corporate Style */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Secure Payment · Cancel Anytime
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Choose Your Trading Style
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Active trader? Buy credits for on-demand analysis. Prefer ready signals? Subscribe to our signal service.
              {!isLoggedIn && ` Start with ${FREE_SIGNUP_CREDITS} free credits.`}
            </p>

            {/* Pricing Mode Toggle */}
            <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setPricingMode('active')}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
                  pricingMode === 'active'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Active Trading</span>
                <span className="hidden sm:inline text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">Credits</span>
              </button>
              <button
                onClick={() => setPricingMode('signals')}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
                  pricingMode === 'signals'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Radio className="w-4 h-4" />
                <span>Signal Service</span>
                <span className="hidden sm:inline text-xs bg-violet-500/10 text-violet-600 px-2 py-0.5 rounded-full">Subscription</span>
              </button>
            </div>
          </div>
        </section>

        {/* Subscription Plans */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                  Subscription Plans
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Daily Credits, Premium Features
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Get fresh credits every day and unlock advanced analysis tools
              </p>
            </div>
            <SubscriptionTiers variant="page" />
          </div>
        </section>

        {/* Current Balance - Only for logged in users */}
        {isLoggedIn && balance !== null && (
          <section className="py-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Gem className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Balance</p>
                    <p className="text-xl font-bold">{formatCredits(balance ?? 0)} Credits</p>
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

        {/* ==================== ACTIVE TRADING MODE ==================== */}
        {pricingMode === 'active' && (
          <>
            {/* Credit Packages */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Credit Packages
                  </h2>
                  <p className="text-muted-foreground">Buy credits once, use them anytime. No expiration.</p>
                </div>
        {/* Credit Packages (Add-on) */}
        <section className="py-16 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                <Gem className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  One-Time Purchase
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Need Extra Credits?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Top up your account with credit packages. Perfect for heavy analysis days or if you prefer pay-as-you-go.
              </p>
            </div>
            {packagesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No packages available at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                {packages.map((pkg) => {
                  const nameKey = pkg.name.toLowerCase().split(' ')[0];
                  const Icon = PACKAGE_ICONS[nameKey] || PACKAGE_ICONS[pkg.id] || Zap;
                  const isSelected = selectedPackage === pkg.id;
                  const isPurchasing = purchasing && isSelected;

                  return (
                    <div
                      key={pkg.id}
                      className={cn(
                        'bg-white dark:bg-slate-900 rounded-xl border p-6 relative transition-all duration-200',
                        pkg.popular
                          ? 'border-emerald-500 shadow-lg'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
                        isSelected && 'border-emerald-500'
                      )}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                          RECOMMENDED
                        </div>
                      )}
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">{pkg.name}</h3>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                          {pkg.price}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{pkg.perCredit} per credit</p>
                        <div className="py-4 border-t border-b border-slate-200 dark:border-slate-800 mb-4">
                          <div className="text-2xl font-bold text-emerald-500">
                            {formatCredits(pkg.credits)}
                            {pkg.bonus > 0 && (
                              <span className="text-base text-amber-500 ml-1">+{pkg.bonus} bonus</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">credits</p>
                        </div>
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
            )}
                <p className="text-center text-xs text-muted-foreground mt-8">
                  Secure payment processing by Lemon Squeezy. All prices in USD.
                </p>
              </div>
            </section>

            {/* What Credits Get You */}
            <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    What Your Credits Unlock
                  </h2>
                  <p className="text-muted-foreground">Everything you need for smarter trading decisions</p>
                </div>
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { Icon: Globe, title: 'Global Capital Flow', desc: 'Layer 1-2: Track money flow across markets', badge: 'FREE', badgeColor: 'emerald' },
                      { Icon: Layers, title: 'Sector Analysis', desc: 'Layer 3: Drill down into market sectors', badge: '25 credits/day', badgeColor: 'slate' },
                      { Icon: Brain, title: 'AI Recommendations', desc: 'Layer 4: BUY/SELL signals with confidence scores', badge: '25 credits/day', badgeColor: 'slate' },
                      { Icon: BarChart3, title: 'Asset Analysis', desc: '7-Step Analysis with MLIS Pro AI confirmation', badge: '100 credits/day', badgeColor: 'slate' },
                      { Icon: Bot, title: 'AI Expert Consultation', desc: '3 free questions per analysis, then 5 credits each', badge: null, badgeColor: null },
                      { Icon: FileText, title: 'PDF Reports', desc: 'Download and share detailed analysis reports', badge: null, badgeColor: null },
                      { Icon: Bell, title: 'Price Alerts', desc: 'Get notified when price targets are hit', badge: null, badgeColor: null },
                      { Icon: Gem, title: 'Daily Rewards', desc: 'Earn free credits through daily activities', badge: 'EARN FREE', badgeColor: 'amber' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          item.badgeColor === 'emerald' && "bg-emerald-500/10",
                          item.badgeColor === 'amber' && "bg-amber-500/10",
                          (!item.badgeColor || item.badgeColor === 'slate') && "bg-slate-100 dark:bg-slate-800"
                        )}>
                          <item.Icon className={cn(
                            'w-5 h-5',
                            item.badgeColor === 'emerald' && "text-emerald-500",
                            item.badgeColor === 'amber' && "text-amber-500",
                            (!item.badgeColor || item.badgeColor === 'slate') && "text-slate-500"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                            {item.badge && (
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] font-semibold rounded-full",
                                item.badgeColor === 'emerald' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                item.badgeColor === 'amber' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                item.badgeColor === 'slate' && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Why Active Trading */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    {[
                      { value: 'No Subscription', desc: 'Pay once, use anytime. Credits never expire.' },
                      { value: '4 Markets', desc: 'Crypto, Stocks, Bonds, and Precious Metals.' },
                      { value: '40+ Indicators', desc: 'Comprehensive technical and fundamental analysis.' },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.value}</div>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ==================== SIGNAL SERVICE MODE ==================== */}
        {pricingMode === 'signals' && (
          <>
            {/* Signal Subscription Packages */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4">
                    <Radio className="w-4 h-4 text-violet-500 animate-pulse" />
                    <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                      Automated Trading Signals
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Signal Subscription Plans
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Receive AI-generated trading signals directly to your Telegram or Discord.
                    Perfect for traders who want ready-to-trade setups.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {SIGNAL_SUBSCRIPTIONS.map((sub) => (
                    <div
                      key={sub.id}
                      className={cn(
                        'bg-white dark:bg-slate-900 rounded-xl border p-6 relative transition-all duration-200',
                        sub.popular
                          ? 'border-violet-500 shadow-lg shadow-violet-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      {sub.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 text-white text-xs font-semibold rounded-full">
                          MOST POPULAR
                        </div>
                      )}
                      {sub.savings && (
                        <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                          {sub.savings}
                        </div>
                      )}
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Radio className="w-6 h-6 text-violet-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">{sub.name}</h3>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                          {'$'}{sub.price}
                          <span className="text-base font-normal text-muted-foreground">
                            /{sub.period === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{sub.signalsPerDay} signals/day</span>
                        </div>

                        {/* Markets */}
                        <div className="py-3 border-t border-slate-200 dark:border-slate-800 mb-4">
                          <div className="flex flex-wrap justify-center gap-1">
                            {sub.markets.map((market) => (
                              <span
                                key={market}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"
                              >
                                {market}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Features */}
                        <ul className="text-left space-y-2 mb-6">
                          {sub.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
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
                              // TODO: Signal subscription checkout
                              router.push(`/settings?subscribe=${sub.id}`);
                            }
                          }}
                          className={cn(
                            'w-full py-3 rounded-lg font-medium text-center transition flex items-center justify-center gap-2',
                            sub.popular
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
                  Cancel anytime. Secure payment processing by Lemon Squeezy.
                </p>
              </div>
            </section>

            {/* How Signal Service Works */}
            <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    How It Works
                  </h2>
                  <p className="text-muted-foreground">Automated signals delivered straight to your phone</p>
                </div>
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { Icon: Globe, title: 'Capital Flow Scan', desc: 'Every hour, we scan global capital flows across 4 markets' },
                      { Icon: Target, title: 'Asset Selection', desc: 'AI identifies high-probability trading opportunities' },
                      { Icon: Brain, title: '7-Step + MLIS', desc: 'Full analysis with AI confirmation validates each signal' },
                      { Icon: Send, title: 'Instant Delivery', desc: 'Signals with Entry, SL, TP sent to Telegram/Discord' },
                    ].map((item, index) => (
                      <div key={index} className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <item.Icon className="w-6 h-6 text-violet-500" />
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">{item.title}</div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Signal Quality Stats */}
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    {[
                      { value: '10-20', label: 'Signals per day', desc: 'High-quality setups only' },
                      { value: '7-Step + MLIS', label: 'Analysis Method', desc: 'Full validation before signal' },
                      { value: '4 Markets', label: 'Coverage', desc: 'Crypto, Stocks, Metals, Bonds' },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="text-2xl font-bold text-violet-500 mb-1">{item.value}</div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">{item.label}</div>
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
                        Not sure which to choose?
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Active Trading (Credits)</strong> is for traders who want to do their own analysis and make their own decisions.
                        <br />
                        <strong>Signal Service (Subscription)</strong> is for passive traders who want ready-to-trade signals delivered automatically.
                      </p>
                      <button
                        onClick={() => setPricingMode('active')}
                        className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        View Active Trading pricing →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* CTA */}
        {!isLoggedIn && (
          <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
            <div className="container mx-auto px-4">
              <div className="max-w-xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                  Start Trading Smarter Today
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create your free account and receive {FREE_SIGNUP_CREDITS} credits to get started.
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
