'use client';

import Link from 'next/link';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import {
  Shield,
  Target,
  Clock,
  Brain,
  CheckCircle,
} from 'lucide-react';

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
        <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>

          {/* Gradient Orbs */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-coral-500/20 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 py-12">
            {/* Logo */}
            <div className="mb-10">
              <Link href="/">
                <TraderPathLogo size="lg" showText={true} showTagline={true} />
              </Link>
            </div>

            {/* Motto */}
            <div className="mb-12">
              <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
                From Charts to{' '}
                <span className="gradient-text-brand">Clarity</span>
              </h1>
              <p className="text-lg xl:text-xl text-slate-300 leading-relaxed">
                Make smarter trading decisions with AI-powered analysis.
                Our 7-step system analyzes 40+ indicators to give you
                clear GO or NO-GO signals.
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
                    <h3 className="font-semibold text-white text-lg">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {feature.description}
                    </p>
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
        <div className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12 relative overflow-hidden">
          {/* Theme Toggle - Top Right */}
          <div className="absolute top-4 right-4 z-20">
            <ThemeToggle />
          </div>

          {/* Mobile Logo - Only shown on small screens */}
          <div className="lg:hidden absolute top-4 left-4 z-20">
            <Link href="/">
              <TraderPathLogo size="sm" showText={true} />
            </Link>
          </div>

          {/* Animated Gradient Wave Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Wave 1 - Teal */}
            <div
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-[0.03] dark:opacity-[0.05]"
              style={{
                background: 'radial-gradient(ellipse at center, #14B8A6 0%, transparent 70%)',
                animation: 'wave1 15s ease-in-out infinite',
              }}
            />
            {/* Wave 2 - Coral */}
            <div
              className="absolute -bottom-1/2 -right-1/2 w-[200%] h-[200%] opacity-[0.03] dark:opacity-[0.05]"
              style={{
                background: 'radial-gradient(ellipse at center, #F87171 0%, transparent 70%)',
                animation: 'wave2 18s ease-in-out infinite',
              }}
            />
            {/* Wave 3 - Amber accent */}
            <div
              className="absolute top-1/4 left-1/4 w-[150%] h-[150%] opacity-[0.02] dark:opacity-[0.03]"
              style={{
                background: 'radial-gradient(ellipse at center, #F59E0B 0%, transparent 60%)',
                animation: 'wave3 20s ease-in-out infinite',
              }}
            />
          </div>

          {/* Form Content */}
          <div className="w-full max-w-md relative z-10">
            {children}
          </div>

          {/* CSS Animations */}
          <style jsx>{`
            @keyframes wave1 {
              0%, 100% { transform: translate(0%, 0%) rotate(0deg); }
              25% { transform: translate(5%, 10%) rotate(5deg); }
              50% { transform: translate(10%, 5%) rotate(-5deg); }
              75% { transform: translate(5%, -5%) rotate(3deg); }
            }
            @keyframes wave2 {
              0%, 100% { transform: translate(0%, 0%) rotate(0deg); }
              25% { transform: translate(-10%, 5%) rotate(-5deg); }
              50% { transform: translate(-5%, 10%) rotate(5deg); }
              75% { transform: translate(5%, 5%) rotate(-3deg); }
            }
            @keyframes wave3 {
              0%, 100% { transform: translate(0%, 0%) scale(1); }
              33% { transform: translate(10%, -10%) scale(1.1); }
              66% { transform: translate(-5%, 10%) scale(0.95); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
