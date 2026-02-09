'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="py-16 sm:py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-6 text-[10px] font-mono uppercase tracking-wider text-slate-400 border border-black/[0.06] dark:border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#00f5c4] animate-pulse" />
          Global Capital Flow Intelligence
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-mono font-bold tracking-tight text-black dark:text-white mb-4 sm:mb-6 leading-[1.1]">
          Follow the Money.
          <br />
          <span className="text-slate-300 dark:text-slate-600">Trade with Precision.</span>
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto mb-8 font-mono leading-relaxed">
          Track institutional capital flows across Crypto, Stocks, Bonds & Metals.
          7-layer analysis engine identifies where money is moving.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-mono font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
          >
            START FREE ANALYSIS
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <a
            href="#methodology"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-mono text-slate-500 border border-black/[0.06] dark:border-white/[0.06] hover:text-black dark:hover:text-white transition-colors"
          >
            VIEW METHODOLOGY
          </a>
        </div>

        <p className="text-[10px] font-mono text-slate-400 mt-4">
          25 free credits on signup &middot; No credit card required
        </p>
      </div>
    </section>
  );
}
