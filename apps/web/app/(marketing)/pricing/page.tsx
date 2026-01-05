'use client';

import Link from 'next/link';
import { CheckCircle, Zap, Crown, Gem, ArrowRight, HelpCircle } from 'lucide-react';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { cn } from '../../../lib/utils';
import { CREDIT_PACKAGES, ANALYSIS_COSTS, ANALYSIS_BUNDLES, FREE_SIGNUP_CREDITS } from '../../../lib/pricing-config';

// Icon mapping for packages
const PACKAGE_ICONS: Record<string, typeof Zap> = {
  blue: Zap,
  purple: Crown,
  amber: Gem,
  green: Crown,
};

const FAQS = [
  {
    question: 'What are credits?',
    answer: 'Credits are the currency used to run analyses on TradePath. Each analysis step costs a certain number of credits. You can earn free credits daily or purchase packages.',
  },
  {
    question: 'Do credits expire?',
    answer: 'No, purchased credits never expire. You can use them whenever you want.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'We offer refunds within 7 days of purchase if no credits have been used. Contact support for assistance.',
  },
  {
    question: 'How do I earn free credits?',
    answer: 'You can earn free credits through daily login bonuses (3 credits), the lucky spin wheel (1-10 credits), answering the daily quiz correctly (5 credits), and watching ads (2 credits each, up to 3x daily).',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-red-500 via-amber-500 to-green-500 bg-clip-text text-transparent">
            TradePath
          </Link>
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
            <Link href="/login" className="px-4 py-2 text-muted-foreground hover:text-foreground transition">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pay only for what you use. No subscriptions, no hidden fees. Start with {FREE_SIGNUP_CREDITS} free credits.
          </p>
        </div>
      </section>

      {/* Credit Costs */}
      <section className="py-12 bg-accent/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Credit Costs Per Step</h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-card rounded-lg border overflow-hidden">
              {ANALYSIS_COSTS.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-4',
                    index !== ANALYSIS_COSTS.length - 1 && 'border-b'
                  )}
                >
                  <div>
                    <p className="font-medium">{item.step}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    item.credits === 0
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-amber-500/20 text-amber-500'
                  )}>
                    {item.credits === 0 ? 'FREE' : `${item.credits} credits`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Bundles */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Analysis Bundles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {ANALYSIS_BUNDLES.map((bundle, index) => (
              <div key={index} className="bg-card rounded-lg border p-6 text-center">
                <h3 className="font-semibold text-lg mb-2">{bundle.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{bundle.steps}</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-muted-foreground line-through">{bundle.original}</span>
                  <span className="text-2xl font-bold text-primary">{bundle.discounted}</span>
                  <span className="text-sm">credits</span>
                </div>
                <span className="inline-block px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded-full">
                  Save {bundle.savings}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit Packages */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Credit Packages</h2>
          <p className="text-muted-foreground text-center mb-8">
            Choose the package that fits your trading style
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CREDIT_PACKAGES.map((pkg) => {
              const Icon = PACKAGE_ICONS[pkg.color] || Zap;
              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'bg-card rounded-lg border p-6 relative',
                    pkg.popular && 'border-primary ring-2 ring-primary'
                  )}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      MOST POPULAR
                    </div>
                  )}
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center mb-4',
                    pkg.color === 'blue' && 'bg-blue-500/20',
                    pkg.color === 'purple' && 'bg-purple-500/20',
                    pkg.color === 'amber' && 'bg-amber-500/20',
                    pkg.color === 'green' && 'bg-green-500/20'
                  )}>
                    <Icon className={cn(
                      'w-6 h-6',
                      pkg.color === 'blue' && 'text-blue-500',
                      pkg.color === 'purple' && 'text-purple-500',
                      pkg.color === 'amber' && 'text-amber-500',
                      pkg.color === 'green' && 'text-green-500'
                    )} />
                  </div>
                  <h3 className="text-xl font-semibold mb-1">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold">${pkg.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {pkg.credits}{pkg.bonus > 0 && ` + ${pkg.bonus} bonus`} credits
                    <br />
                    <span className="text-xs">${pkg.pricePerCredit.toFixed(2)}/credit</span>
                  </p>
                  <ul className="space-y-2 mb-6">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={cn(
                      'block w-full py-3 rounded-lg font-semibold text-center transition',
                      pkg.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border hover:bg-accent'
                    )}
                  >
                    Get Started
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Free Credits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Earn Free Credits Daily</h2>
            <p className="text-muted-foreground mb-8">
              You don&apos;t always have to pay. Earn up to 25 free credits every day!
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Daily Login', credits: 3, icon: '🎁' },
                { name: 'Lucky Spin', credits: '1-10', icon: '🎰' },
                { name: 'Daily Quiz', credits: 5, icon: '🧠' },
                { name: 'Watch Ads', credits: '6', subtitle: '(3x2)', icon: '📺' },
              ].map((item, index) => (
                <div key={index} className="bg-card rounded-lg border p-4 text-center">
                  <span className="text-3xl mb-2 block">{item.icon}</span>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-amber-500 font-bold">
                    +{item.credits} credits
                    {item.subtitle && <span className="text-xs text-muted-foreground"> {item.subtitle}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-accent/50">
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
      <section className="py-16">
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

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 TradePath. All rights reserved. Trading involves risk.</p>
        </div>
      </footer>
    </div>
  );
}
