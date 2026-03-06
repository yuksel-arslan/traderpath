'use client';

import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { usePlatformStats } from '../../hooks/usePlatformStats';

export function Hero() {
  const { data } = usePlatformStats();

  return (
    <section className="py-12 sm:py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-4 text-center">
        {/* Gradient animated headline */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_4s_ease_infinite]"
            style={{
              backgroundImage: 'linear-gradient(90deg, #2DD4BF, #34d399, #f87171, #fb923c, #2DD4BF)',
            }}
          >
            See Where Smart Money Moves
          </span>
        </div>

        {/* Subheadline */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-black dark:text-white mb-3 leading-snug">
          Before the Market Does.
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          TraderPath tracks $3T+ in global capital flows across Crypto, Stocks, Bonds, Metals and BIST.
          Our 7-layer decision engine turns raw flow data into actionable trade signals
          — so you trade with the trend, not against it.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors"
          >
            START FREE ANALYSIS
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#methodology"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            SEE HOW IT WORKS
            <ChevronDown className="w-4 h-4" />
          </a>
        </div>

        {/* Micro-proof */}
        <p className="text-[10px] font-sans text-slate-400 mt-5">
          3 free analyses on signup &middot; No credit card required
          {data && data.totalAnalyses > 0 && (
            <> &middot; {data.totalAnalyses.toLocaleString()}+ analyses completed</>
          )}
        </p>
      </div>
    </section>
  );
}
