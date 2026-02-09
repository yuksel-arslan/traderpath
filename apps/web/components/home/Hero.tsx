'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TraderPathLogo } from '../common/TraderPathLogo';

export function Hero() {
  return (
    <section className="py-20 sm:py-28 md:py-36 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/[0.03] dark:bg-teal-400/[0.04] blur-3xl" />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 text-center relative">
        {/* Large Logo */}
        <div className="flex justify-center mb-8">
          <TraderPathLogo size="xl" showText={false} animated />
        </div>

        {/* Brand name */}
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
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

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 text-[10px] font-mono uppercase tracking-wider text-slate-400 border border-black/[0.06] dark:border-white/[0.06] rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#00f5c4] animate-pulse" />
          Global Capital Flow Intelligence
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-black dark:text-white mb-3 leading-snug">
          Follow the Money.{' '}
          <span className="text-slate-300 dark:text-slate-600">Trade with Precision.</span>
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold bg-black dark:bg-white text-white dark:text-black rounded-sm hover:opacity-80 transition-opacity"
          >
            START FREE ANALYSIS
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#methodology"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm text-slate-500 border border-black/[0.06] dark:border-white/[0.06] rounded-sm hover:text-black dark:hover:text-white transition-colors"
          >
            VIEW METHODOLOGY
          </a>
        </div>

        <p className="text-[10px] font-mono text-slate-400 mt-5">
          25 free credits on signup &middot; No credit card required
        </p>
      </div>
    </section>
  );
}
