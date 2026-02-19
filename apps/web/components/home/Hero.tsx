'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TraderPathLogo } from '../common/TraderPathLogo';

export function Hero() {
  return (
    <section className="py-12 sm:py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-4 text-center">
        {/* Large Logo */}
        <div className="flex justify-center mb-4">
          <TraderPathLogo size="sm" showText={false} animated />
        </div>

        {/* Brand name */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight leading-[1.05]">
            <span className="hidden dark:inline">
              <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">Trader</span>
              <span className="bg-gradient-to-r from-red-400 via-rose-400 to-red-300 bg-clip-text text-transparent">Path</span>
            </span>
            <span className="dark:hidden">
              <span className="text-teal-700">Trader</span>
              <span className="text-red-600">Path</span>
            </span>
          </h1>
        </div>

        {/* Badge — animated gradient, 3× brand size */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#00f5c4] animate-pulse flex-shrink-0" />
          <span
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_4s_ease_infinite]"
            style={{
              backgroundImage: 'linear-gradient(90deg, #2DD4BF, #34d399, #f87171, #fb923c, #2DD4BF)',
            }}
          >
            Global Capital Flow Intelligence
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-black dark:text-white mb-3 leading-snug">
          Follow the Money.{' '}
          <span className="text-slate-500 dark:text-slate-500">Trade with Precision.</span>
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Track institutional capital flows across Crypto, Stocks, Bonds & Metals.
          7-layer analysis engine identifies where money is moving.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors"
          >
            START FREE ANALYSIS
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            VIEW PRICING
          </Link>
        </div>

        <p className="text-[10px] font-sans text-slate-400 mt-5">
          25 free credits on signup &middot; No credit card required
        </p>
      </div>
    </section>
  );
}
