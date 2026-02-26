'use client';

import Link from 'next/link';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
// Capital Flow 4-Layer System + Asset Analysis - Corporate 2026 style
const FLOW_LAYERS = [
  { num: 1, title: 'Global Liquidity', description: 'Fed, M2, DXY, VIX' },
  { num: 2, title: 'Market Flow', description: 'Crypto, Stocks, Bonds, Metals' },
  { num: 3, title: 'Sector Activity', description: 'DeFi, L2, Tech, Finance' },
  { num: 4, title: 'AI Recommendations', description: 'BUY / SELL Signals' },
  { num: 5, title: 'Asset Analysis', description: '7-Step + AI Confirmation' },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Marketing (hidden on mobile) - Now theme-aware */}
      <div className="hidden lg:flex lg:w-[50%] bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        {/* Background Pattern - Theme aware */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, var(--dot-color) 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
          <style jsx>{`
            :global(:root) { --dot-color: rgba(100, 116, 139, 0.3); }
            :global(.dark) { --dot-color: rgba(255, 255, 255, 0.1); }
          `}</style>
        </div>

        {/* Gradient Orbs - Theme aware */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/20 dark:bg-teal-500/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-coral-500/20 dark:bg-coral-500/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[80px]" />

        {/* Content - Centered */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 py-8">
          {/* Logo & Brand */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block mb-4 transform hover:scale-105 transition-transform">
              <TraderPathLogo size="lg" showText={false} />
            </Link>
            <h2 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-teal-500 via-emerald-400 via-cyan-400 to-teal-500 dark:from-teal-400 dark:via-emerald-300 dark:via-cyan-300 dark:to-teal-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                TraderPath
              </span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm tracking-wide">From Charts to Clarity</p>
          </div>

          {/* Capital Flow Motto */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              Follow the Money
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-xs mx-auto">
              Where capital flows, potential exists. Track global liquidity and find the best opportunities.
            </p>
          </div>

          {/* Capital Flow Steps - Corporate 2026 Premium Style */}
          <div className="w-full max-w-sm mb-8">
            {/* Glassmorphism container */}
            <div className="relative p-6 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-xl shadow-slate-200/20 dark:shadow-black/10">
              {/* Inner glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5 dark:from-teal-500/10 dark:to-emerald-500/10 pointer-events-none" />

              <div className="relative flex flex-col items-center space-y-3">
                {FLOW_LAYERS.map((layer, index) => (
                  <div
                    key={layer.num}
                    className="flex items-center gap-3 group cursor-default w-full max-w-[280px]"
                  >
                    {/* Step number - minimal circle */}
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 group-hover:scale-110 transition-all duration-300">
                        <span className="text-xs font-bold text-white">
                          {layer.num}
                        </span>
                      </div>
                      {/* Connecting line */}
                      {index < FLOW_LAYERS.length - 1 && (
                        <div className="absolute top-7 left-1/2 -translate-x-1/2 w-[2px] h-3 bg-gradient-to-b from-teal-500/40 to-transparent rounded-full" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-white text-sm leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-300">
                        {layer.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        {layer.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Phase Badges */}
          <div className="flex items-center gap-2 mb-6">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              EARLY
            </span>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              MID
            </span>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30">
              LATE
            </span>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">
              EXIT
            </span>
          </div>

          {/* Stats - Theme aware */}
          <div className="flex items-center gap-6 pt-4 border-t border-slate-300/50 dark:border-white/10 w-full max-w-sm justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-white">4</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Markets</div>
            </div>
            <div className="w-px h-8 bg-slate-300/50 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">BUY</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Signals</div>
            </div>
            <div className="w-px h-8 bg-slate-300/50 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">SELL</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Signals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 relative overflow-hidden bg-slate-50 dark:bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between pl-0 pr-4 py-4 border-b border-slate-200 dark:border-border bg-white/80 dark:bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <Link href="/">
            <TraderPathLogo size="sm" showText={true} />
          </Link>
          <ThemeToggle />
        </div>

        {/* Desktop Theme Toggle */}
        <div className="hidden lg:block absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 lg:py-12 relative overflow-hidden">
          {/* Light Mode Background Pattern */}
          <div className="absolute inset-0 dark:hidden">
            {/* Soft gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100" />
            {/* Subtle pattern */}
            <div
              className="absolute inset-0 opacity-[0.4]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
                backgroundSize: '20px 20px',
              }}
            />
            {/* Soft color accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/[0.07] rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/[0.05] rounded-full blur-[80px]" />
          </div>

          {/* Dark Mode Animated Gradient Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden dark:block">
            <div
              className="absolute w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full opacity-[0.15]"
              style={{
                background:
                  'radial-gradient(ellipse at center, #14B8A6 0%, #14B8A6 20%, transparent 70%)',
                top: '-20%',
                left: '-10%',
                animation: 'wave1 12s ease-in-out infinite',
                filter: 'blur(60px)',
              }}
            />
            <div
              className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full opacity-[0.12]"
              style={{
                background:
                  'radial-gradient(ellipse at center, #F87171 0%, #EF5A6F 30%, transparent 70%)',
                bottom: '-30%',
                right: '-20%',
                animation: 'wave2 14s ease-in-out infinite',
                filter: 'blur(60px)',
              }}
            />
          </div>

          {/* Form Content */}
          <div className="w-full max-w-md relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
