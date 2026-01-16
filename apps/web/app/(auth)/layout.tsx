'use client';

import Link from 'next/link';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Shield, Target, Clock, Brain, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Marketing (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-coral-500/20 rounded-full blur-3xl" />

        {/* Content - Centered */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-8 py-8">
          {/* Logo & Brand */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block mb-3">
              <TraderPathLogo size="lg" showText={false} />
            </Link>
            <h2 className="text-3xl font-bold gradient-text-brand">TraderPath</h2>
            <p className="text-sm text-slate-400 mt-1">From Charts to Clarity</p>
          </div>

          {/* Motto */}
          <p className="text-center text-slate-300 text-sm leading-relaxed max-w-xs mb-6">
            Make smarter trading decisions with AI-powered analysis. Our 7-step system analyzes
            40+ indicators to give you clear GO or NO-GO signals.
          </p>

          {/* Features - Compact Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-sm">
            {FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-white text-xs">{feature.title}</h3>
                  <p className="text-slate-400 text-[10px] leading-tight">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 w-full max-w-xs">
            <div className="text-center">
              <div className="text-xl font-bold text-white">40+</div>
              <div className="text-[10px] text-slate-400">Indicators</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">7</div>
              <div className="text-[10px] text-slate-400">Steps</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">AI</div>
              <div className="text-[10px] text-slate-400">Powered</div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-xs">
            <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
            <span>Trusted by traders worldwide</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 relative overflow-hidden">
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
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 lg:py-12 relative overflow-hidden">
          {/* Animated Gradient Wave Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full opacity-[0.08] dark:opacity-[0.12]"
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
              className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full opacity-[0.08] dark:opacity-[0.12]"
              style={{
                background:
                  'radial-gradient(ellipse at center, #F87171 0%, #EF5A6F 30%, transparent 70%)',
                bottom: '-30%',
                right: '-20%',
                animation: 'wave2 14s ease-in-out infinite',
                filter: 'blur(60px)',
              }}
            />
            <div
              className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full opacity-[0.06] dark:opacity-[0.08]"
              style={{
                background: 'radial-gradient(ellipse at center, #F59E0B 0%, transparent 60%)',
                top: '30%',
                left: '20%',
                animation: 'wave3 16s ease-in-out infinite',
                filter: 'blur(50px)',
              }}
            />
            <div
              className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full opacity-[0.05] dark:opacity-[0.08]"
              style={{
                background: 'radial-gradient(ellipse at center, #2DD4A8 0%, transparent 60%)',
                bottom: '10%',
                left: '-5%',
                animation: 'wave4 18s ease-in-out infinite',
                filter: 'blur(40px)',
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
