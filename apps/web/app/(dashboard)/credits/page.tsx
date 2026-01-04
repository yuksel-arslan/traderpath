'use client';

import { useState } from 'react';
import { Gem, Check, Zap, Crown, Rocket, Star } from 'lucide-react';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50,
    bonus: 0,
    price: 7.99,
    perCredit: 0.16,
    icon: Zap,
    popular: false,
  },
  {
    id: 'trader',
    name: 'Trader',
    credits: 150,
    bonus: 15,
    price: 19.99,
    perCredit: 0.12,
    icon: Star,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 400,
    bonus: 60,
    price: 44.99,
    perCredit: 0.10,
    icon: Crown,
    popular: false,
  },
  {
    id: 'whale',
    name: 'Whale',
    credits: 1000,
    bonus: 200,
    price: 89.99,
    perCredit: 0.08,
    icon: Rocket,
    popular: false,
  },
];

const CREDIT_COSTS = [
  { action: 'Market Pulse', credits: 'FREE' },
  { action: 'Asset Scanner', credits: '2' },
  { action: 'Safety Check', credits: '5' },
  { action: 'Timing', credits: '3' },
  { action: 'Trade Plan', credits: '5' },
  { action: 'Trap Check', credits: '5' },
  { action: 'Final Verdict', credits: 'FREE' },
  { action: 'Full Analysis Bundle', credits: '15' },
  { action: 'Price Alert', credits: '1' },
  { action: 'AI Chat Question', credits: '2' },
];

export default function CreditsPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Buy Credits</h1>
        <p className="text-muted-foreground">
          Power your trading analysis with credits
        </p>
      </div>

      {/* Current Balance */}
      <div className="max-w-md mx-auto mb-12 p-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gem className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-2xl font-bold">156 Credits</p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Daily free: 3/5</p>
            <p>Resets in 4h</p>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all hover:shadow-lg ${
                selectedPackage === pkg.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              } ${pkg.popular ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <div className="text-center">
                <Icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-1">{pkg.name}</h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {pkg.credits}
                  {pkg.bonus > 0 && (
                    <span className="text-lg text-green-500 ml-1">+{pkg.bonus}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">credits</p>

                <div className="text-2xl font-bold mb-1">${pkg.price}</div>
                <p className="text-sm text-muted-foreground">
                  ${pkg.perCredit}/credit
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Buy Button */}
      {selectedPackage && (
        <div className="max-w-md mx-auto mb-12">
          <button className="w-full py-3.5 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold hover:shadow-md transition">
            <span className="gradient-text-rg-animate">
              Purchase {PACKAGES.find((p) => p.id === selectedPackage)?.name} Package
            </span>
          </button>
        </div>
      )}

      {/* Credit Costs Table */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">Credit Costs</h2>
        <div className="bg-card border rounded-lg divide-y">
          {CREDIT_COSTS.map((item) => (
            <div key={item.action} className="flex justify-between p-4">
              <span>{item.action}</span>
              <span className={`font-medium ${item.credits === 'FREE' ? 'text-green-500' : ''}`}>
                {item.credits === 'FREE' ? 'FREE' : `${item.credits} credits`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
