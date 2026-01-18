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
  Search,
  Bot,
  FileText,
  Mail,
  Bell,
  Brain,
  Gift,
  Dices,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { cn } from '../../../lib/utils';
import { CREDIT_PACKAGES, FREE_SIGNUP_CREDITS, getPerCreditCost } from '../../../lib/pricing-config';
import { authFetch, getAuthToken, apiBaseUrl } from '../../../lib/api';

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

const FAQS = [
  {
    question: 'What are credits?',
    answer:
      'Credits are used to run analyses on TraderPath. Each analysis uses credits, and all features (AI Expert, PDF reports, email, etc.) are included at no extra cost.',
  },
  {
    question: 'Do credits expire?',
    answer: 'No, purchased credits never expire. Use them whenever you want.',
  },
  {
    question: 'What\'s included in each analysis?',
    answer:
      'Every analysis includes all 7 steps, AI Expert chat, PDF download, email sharing, and price alerts - everything is included!',
  },
  {
    question: 'How do I earn free credits?',
    answer:
      'Earn free credits through daily login bonuses, the lucky spin wheel, daily quiz, and more. Up to 25 free credits every day!',
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
          setBalance(data.credits || 0);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="w-full px-2 sm:px-4 lg:px-6 py-4 flex items-center justify-between">
          <TraderPathLogo size="sm" showText={true} showTagline={false} href="/" className="flex sm:hidden" />
          <TraderPathLogo size="md" showText={true} showTagline={true} href="/" className="hidden sm:flex" />
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition">
              How it Works
            </Link>
            <Link href="/pricing" className="text-foreground font-medium">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : isLoggedIn ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                  <Gem className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">{balance ?? 0}</span>
                </div>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-muted-foreground hover:text-foreground transition">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Transparent Pricing</h1>
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
            <div className="max-w-md mx-auto p-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Gem className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Balance</p>
                    <p className="text-2xl font-bold">{balance} Credits</p>
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
      <section className="py-12 bg-accent/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Credit Packages</h2>
          <p className="text-muted-foreground text-center mb-8">Choose the package that fits your trading style</p>
          {packagesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No packages available at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {packages.map((pkg) => {
                // Map package name to icon
                const nameKey = pkg.name.toLowerCase().split(' ')[0]; // "Starter Pack" -> "starter"
                const Icon = PACKAGE_ICONS[nameKey] || PACKAGE_ICONS[pkg.id] || Zap;
                const isSelected = selectedPackage === pkg.id;
                const isPurchasing = purchasing && isSelected;

                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      'bg-card rounded-xl border-2 p-6 relative text-center transition',
                      pkg.popular
                        ? 'border-amber-500 ring-2 ring-amber-500 ring-offset-2 ring-offset-background'
                        : 'border-border hover:border-primary/50',
                      isSelected && 'border-primary'
                    )}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                        MOST POPULAR
                      </div>
                    )}
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-accent flex items-center justify-center">
                      <Icon className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                    <div className="text-3xl font-bold text-primary mb-1">
                      {pkg.credits}
                      {pkg.bonus > 0 && <span className="text-lg text-amber-500 ml-1">+{pkg.bonus}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">credits</p>
                    <div className="text-2xl font-bold mb-1">{pkg.price}</div>
                    <p className="text-sm text-muted-foreground mb-6">{pkg.perCredit}/credit</p>
                    <button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchasing}
                      className={cn(
                        'w-full py-3 rounded-lg font-semibold text-center transition flex items-center justify-center gap-2',
                        pkg.popular
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border hover:bg-accent',
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

      {/* What's Included */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">All Packages Include</h2>
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { Icon: Gem, title: '35 Credits', desc: 'Per analysis', color: 'text-amber-500' },
                { Icon: Search, title: '7-Step Analysis', desc: 'Complete trading analysis', color: 'text-teal-500' },
                { Icon: Bot, title: 'AI Expert Chat', desc: 'Ask questions anytime', color: 'text-violet-500' },
                { Icon: FileText, title: 'PDF Reports', desc: 'Download & share', color: 'text-blue-500' },
                { Icon: Mail, title: 'Email Reports', desc: 'Send to your inbox', color: 'text-emerald-500' },
                { Icon: Bell, title: 'Price Alerts', desc: 'Never miss a move', color: 'text-amber-500' },
              ].map((item, index) => (
                <div key={index} className="bg-card rounded-lg border p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <item.Icon className={cn('w-8 h-8', item.color)} />
                  </div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
              {/* Coming Soon Feature */}
              <div className="bg-card rounded-lg border p-4 text-center relative overflow-hidden">
                <div className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  COMING SOON
                </div>
                <div className="flex justify-center mb-2">
                  <Brain className="w-8 h-8 text-pink-500" />
                </div>
                <p className="font-semibold text-sm">AI Price Prediction</p>
                <p className="text-xs text-muted-foreground">TFT deep learning model</p>
                <p className="text-[10px] text-amber-600 mt-1">+credits per analysis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {FAQS.map((faq, index) => (
              <div key={index} className="bg-card rounded-lg border p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  {faq.question}
                </h3>
                <p className="text-muted-foreground text-sm pl-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isLoggedIn && (
        <section className="py-16 bg-accent/50">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center p-8 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-green-500/20 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4">Ready to Start Trading Smarter?</h2>
              <p className="text-muted-foreground mb-6">
                Create your free account and get {FREE_SIGNUP_CREDITS} credits to start analyzing.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TraderPath. All rights reserved. Trading involves risk.</p>
        </div>
      </footer>
    </div>
  );
}
