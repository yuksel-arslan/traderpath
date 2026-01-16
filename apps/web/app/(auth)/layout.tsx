'use client';

import Link from 'next/link';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Shield, Target, Clock, Brain, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: '40+ indicators analyzed by AI',
  },
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Detect manipulation & traps',
  },
  {
    icon: Target,
    title: 'Precise Trade Plans',
    description: 'Entry, stop-loss & take-profit',
  },
  {
    icon: Clock,
    title: 'Perfect Timing',
    description: 'Know when to enter & exit',
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden flex-col">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12 py-12">
          {/* Logo */}
          <Link href="/" className="mb-8">
            <TraderPathLogo size="lg" showText={false} />
          </Link>

          {/* Brand Name */}
          <h1 className="text-4xl font-black mb-2">
            <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">Trader</span>
            <span className="bg-gradient-to-r from-rose-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Path</span>
          </h1>
          <p className="text-slate-400 text-sm mb-10">From Charts to Clarity</p>

          {/* Description */}
          <p className="text-center text-slate-300 text-base leading-relaxed max-w-md mb-10">
            Make smarter trading decisions with AI-powered analysis. Our 7-step system analyzes
            40+ indicators to give you clear <span className="text-teal-400 font-semibold">GO</span> or <span className="text-rose-400 font-semibold">NO-GO</span> signals.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-10">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 pt-8 border-t border-white/10">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">40+</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Indicators</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">7</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Steps</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">AI</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Powered</div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 flex items-center gap-2 text-slate-400 text-sm">
            <CheckCircle className="w-4 h-4 text-teal-400" />
            <span>Trusted by traders worldwide</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col bg-background relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
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
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-8 lg:py-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
