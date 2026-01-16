'use client';

import Link from 'next/link';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Shield, Target, Clock, Brain, CheckCircle } from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: '40+ technical indicators analyzed by advanced AI models',
  },
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Detect manipulation, whale activity, and market traps',
  },
  {
    icon: Target,
    title: 'Precise Trade Plans',
    description: 'Get exact entry, stop-loss, and take-profit levels',
  },
  {
    icon: Clock,
    title: 'Perfect Timing',
    description: 'Know exactly when to enter and exit your trades',
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
      <div className="hidden lg:flex lg:items-center lg:justify-center lg:w-1/2 xl:w-[45%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
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
        <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-coral-500/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col px-12 xl:px-16 py-12">
          {/* Logo Icon */}
          <div className="mb-4">
            <Link href="/">
              <TraderPathLogo size="xl" showText={false} />
            </Link>
          </div>

          {/* Brand Name */}
          <div className="mb-8">
            <h2 className="text-4xl xl:text-5xl font-bold gradient-text-brand">TraderPath</h2>
            <p className="text-lg text-slate-400 mt-1">From Charts to Clarity</p>
          </div>

          {/* Motto */}
          <div className="mb-12">
            <p className="text-lg xl:text-xl text-slate-300 leading-relaxed">
              Make smarter trading decisions with AI-powered analysis. Our 7-step system analyzes
              40+ indicators to give you clear GO or NO-GO signals.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">40+</div>
                <div className="text-sm text-slate-400">Indicators</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">7</div>
                <div className="text-sm text-slate-400">Analysis Steps</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">AI</div>
                <div className="text-sm text-slate-400">Powered</div>
              </div>
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
