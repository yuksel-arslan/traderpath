'use client';

import Link from 'next/link';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Shield, Target, Clock, Brain, CheckCircle, Sparkles, TrendingUp, BarChart3 } from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: '40+ indicators analyzed by AI',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
  },
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Detect manipulation & traps',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
  },
  {
    icon: Target,
    title: 'Precise Trade Plans',
    description: 'Entry, stop-loss & take-profit',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
  },
  {
    icon: Clock,
    title: 'Perfect Timing',
    description: 'Know when to enter & exit',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Marketing (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[50%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Gradient Orbs - More prominent */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-coral-500/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />

        {/* Content - Centered */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 py-8">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4 transform hover:scale-105 transition-transform">
              <TraderPathLogo size="lg" showText={false} />
            </Link>
            <h2 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                TraderPath
              </span>
            </h2>
            <p className="text-slate-400 mt-2 text-sm tracking-wide">From Charts to Clarity</p>
          </div>

          {/* Motto */}
          <p className="text-center text-slate-300 leading-relaxed max-w-sm mb-8">
            Make smarter trading decisions with AI-powered analysis. Our 7-step system analyzes
            40+ indicators to give you clear <span className="text-emerald-400 font-semibold">GO</span> or <span className="text-red-400 font-semibold">NO-GO</span> signals.
          </p>

          {/* Features - Compact Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-md">
            {FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 pt-6 border-t border-white/10 w-full max-w-md justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">40+</div>
              <div className="text-xs text-slate-400 mt-1">Indicators</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">7</div>
              <div className="text-xs text-slate-400 mt-1">Analysis Steps</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">AI</div>
              <div className="text-xs text-slate-400 mt-1">Powered</div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-6 flex items-center gap-2 text-slate-400 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Trusted by traders worldwide</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 relative overflow-hidden bg-slate-50 dark:bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-border bg-white/80 dark:bg-background/80 backdrop-blur-sm sticky top-0 z-20">
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
