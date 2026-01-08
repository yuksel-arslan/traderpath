'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gem, Zap, Crown, Rocket, Star, Loader2, CreditCard, History } from 'lucide-react';
import { getApiUrl } from '../../../lib/api';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: string;
  perCredit: string;
  popular?: boolean;
}

interface CreditBalance {
  credits: number;
  freeAnalysesRemaining: number;
  freeAnalysesTotal: number;
}

interface CreditCosts {
  bundles: {
    fullAnalysis: number;
    quickCheck: number;
    smartEntry: number;
  };
  features: {
    aiExpert: number;
    pdfReport: number;
    translation: number;
    emailSend: number;
    priceAlert: number;
  };
}

const PACKAGE_ICONS: Record<string, any> = {
  starter: Zap,
  trader: Star,
  pro: Crown,
  whale: Rocket,
};

export default function CreditsPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [creditCosts, setCreditCosts] = useState<CreditCosts | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      // Note: Middleware handles authentication redirect, so we just skip fetch if no token

      // Fetch packages, balance, and credit costs in parallel
      const [packagesRes, balanceRes, costsRes] = await Promise.all([
        fetch(getApiUrl('/api/payments/packages')),
        token ? fetch(getApiUrl('/api/user/credits'), {
          headers: { Authorization: `Bearer ${token}` },
        }) : Promise.resolve(null),
        fetch(getApiUrl('/api/costs/credit-costs')),
      ]);

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.data?.packages || []);
      }

      if (balanceRes && balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance({
          credits: data.credits || 0,
          freeAnalysesRemaining: data.freeAnalysesRemaining || 0,
          freeAnalysesTotal: data.freeAnalysesTotal || 5,
        });
      }

      if (costsRes.ok) {
        const data = await costsRes.json();
        if (data.data) {
          setCreditCosts(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setPurchasing(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to purchase credits');
        setPurchasing(false);
        return;
      }

      const response = await fetch(getApiUrl('/api/payments/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: selectedPackage }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Buy Credits</h1>
        <p className="text-gray-500 dark:text-slate-400">
          Power your trading analysis with credits
        </p>
      </div>

      {/* Current Balance */}
      <div className="max-w-md mx-auto mb-12 p-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Gem className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Your Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {balance?.credits || 0} Credits
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500 dark:text-slate-400">
            <p>Daily free: {balance?.freeAnalysesRemaining || 0}/{balance?.freeAnalysesTotal || 5}</p>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-6xl mx-auto">
        {packages.map((pkg) => {
          const Icon = PACKAGE_ICONS[pkg.id] || Zap;
          const isSelected = selectedPackage === pkg.id;

          return (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                  : 'border-gray-200 dark:border-slate-700 hover:border-emerald-500/50'
              } ${pkg.popular ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <div className="text-center">
                <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-emerald-500/20' : 'bg-gray-100 dark:bg-slate-800'
                }`}>
                  <Icon className={`w-7 h-7 ${isSelected ? 'text-emerald-500' : 'text-gray-600 dark:text-slate-400'}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{pkg.name}</h3>
                <div className="text-3xl font-bold text-emerald-500 mb-1">
                  {pkg.credits}
                  {pkg.bonus > 0 && (
                    <span className="text-lg text-amber-500 ml-1">+{pkg.bonus}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">credits</p>

                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{pkg.price}</div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {pkg.perCredit}/credit
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-md mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-center">
          {error}
        </div>
      )}

      {/* Buy Button */}
      <div className="max-w-md mx-auto mb-12">
        <button
          onClick={handlePurchase}
          disabled={!selectedPackage || purchasing}
          className={`w-full py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
            selectedPackage && !purchasing
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          {purchasing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirecting to checkout...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              {selectedPackage
                ? `Purchase ${packages.find((p) => p.id === selectedPackage)?.name}`
                : 'Select a package'}
            </>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-2">
          Secure payment powered by Stripe
        </p>
      </div>

      {/* Credit Costs Table */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">Credit Costs</h2>
        <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl divide-y divide-gray-200 dark:divide-slate-700">
          {/* Analysis Bundles */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700/30">
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Analysis</p>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">Full Analysis (7-Step)</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.bundles?.fullAnalysis ?? 25} credits
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">Quick Check</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.bundles?.quickCheck ?? 5} credits
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">Smart Entry</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.bundles?.smartEntry ?? 12} credits
            </span>
          </div>

          {/* Features */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700/30">
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Features</p>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">AI Expert Chat</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.features?.aiExpert ?? 10} credits
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">PDF Report</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.features?.pdfReport ?? 5} credits
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">Translation</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.features?.translation ?? 5} credits
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">Email Sending</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.features?.emailSend ?? 5} credits
            </span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-700 dark:text-slate-300">Price Alert</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {creditCosts?.features?.priceAlert ?? 1} credits
            </span>
          </div>
        </div>
      </div>

      {/* Transaction History Link */}
      <div className="text-center mt-8">
        <button className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-emerald-500 transition">
          <History className="w-4 h-4" />
          View Transaction History
        </button>
      </div>
    </div>
  );
}
