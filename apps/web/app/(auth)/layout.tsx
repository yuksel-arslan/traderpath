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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
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
        <div className="absolute top-20 left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-coral-500/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col w-full px-12 py-10">
          {/* Logo at Top */}
          <div className="mb-auto">
            <Link href="/">
              <TraderPathLogo size="lg" showText={false} />
            </Link>
          </div>

          {/* Main Content - Vertically Centered */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Brand Name - Aligned with "Welcome back!" */}
            <div className="mb-6">
              <h2 className="text-4xl font-extrabold gradient-text-brand">TraderPath</h2>
              <p className="text-base text-slate-400 mt-2">From Charts to Clarity</p>
            </div>

            {/* Motto */}
            <p className="text-slate-300 text-base leading-relaxed max-w-md mb-8">
              Make smarter trading decisions with AI-powered analysis. Our 7-step system analyzes
              40+ indicators to give you clear GO or NO-GO signals.
            </p>

            {/* Features - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                    <p className="text-slate-400 text-xs leading-snug">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 max-w-md">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">40+</div>
                <div className="text-xs text-slate-400">Indicators</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">7</div>
                <div className="text-xs text-slate-400">Steps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">AI</div>
                <div className="text-xs text-slate-400">Powered</div>
              </div>
            </div>
          </div>

          {/* Trust Badge at Bottom */}
          <div className="mt-auto flex items-center gap-2 text-slate-400 text-sm">
            <CheckCircle className="w-4 h-4 text-teal-400" />
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
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-10 lg:py-12 relative overflow-hidden">
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
