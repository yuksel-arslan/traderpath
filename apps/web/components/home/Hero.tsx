'use client';

import Link from 'next/link';
import { ArrowRight, Globe } from 'lucide-react';
import { TraderPathLogo } from '../common/TraderPathLogo';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 md:py-32">
      {/* Background gradient orbs */}
      <div
        className="absolute top-10 left-1/4 w-48 sm:w-80 h-48 sm:h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(77,208,225,0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-10 right-1/4 w-48 sm:w-80 h-48 sm:h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,245,196,0.12) 0%, transparent 70%)' }}
      />

      <div className="container mx-auto px-4 relative z-10 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border"
          style={{
            borderColor: 'rgba(77,208,225,0.4)',
            background: 'rgba(77,208,225,0.08)',
          }}
        >
          <Globe className="w-4 h-4" style={{ color: '#4dd0e1' }} />
          <span style={{ color: '#4dd0e1' }}>Global Capital Flow Intelligence</span>
        </div>

        {/* Floating logo */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="float">
            <TraderPathLogo size="lg" showText={false} className="flex sm:hidden" />
            <TraderPathLogo size="xl" showText={false} className="hidden sm:flex" />
          </div>
        </div>

        {/* Heading - centered on mobile */}
        <h1
          className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight gradient-text-logo-animate"
        >
          Follow the Money Flow
        </h1>

        {/* Description - max 3 lines on mobile */}
        <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto line-clamp-3 sm:line-clamp-none">
          Track global capital flows across Crypto, Stocks, Bonds & Metals.
          Our AI identifies where money is moving and delivers actionable trade signals.
        </p>

        {/* CTA button - full-width on mobile, 52px height */}
        <div className="px-4 sm:px-0">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 rounded-lg font-semibold text-base transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#4dd0e1]/20"
            style={{
              height: '52px',
              background: 'linear-gradient(135deg, #4dd0e1, #00f5c4)',
              color: '#041020',
            }}
            aria-label="Start free analysis - sign up"
          >
            Start Free Analysis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 mt-4">
          Get 25 free credits on signup. No credit card required.
        </p>
      </div>
    </section>
  );
}
