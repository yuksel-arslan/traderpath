'use client';

// ===========================================
// Analyze Landing Page - Premium Design
// Professional trading analysis interface
// ===========================================

import dynamic from 'next/dynamic';
import { CoinSelector } from '../../../components/common/CoinSelector';
import { CreditBalance } from '../../../components/credits/CreditBalance';
import {
  TrendingUp,
  BarChart3,
  Shield,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Zap,
  Brain,
  LineChart,
  Activity,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

// Lazy load heavy components
const PriceTicker = dynamic(
  () => import('../../../components/common/PriceTicker').then(mod => ({ default: mod.PriceTicker })),
  { ssr: false, loading: () => <div className="w-full h-10 bg-card/50 border-b border-border/50" /> }
);

const RecentAnalyses = dynamic(
  () => import('../../../components/analysis/RecentAnalyses').then(mod => ({ default: mod.RecentAnalyses })),
  { ssr: false, loading: () => <div className="h-40 bg-muted/30 rounded-2xl animate-pulse" /> }
);

// Analysis steps with enhanced descriptions
const ANALYSIS_MODULES = [
  {
    icon: TrendingUp,
    title: 'Market Pulse',
    description: 'Real-time sentiment analysis',
    gradient: 'from-blue-500 to-cyan-500',
    delay: '0ms',
  },
  {
    icon: BarChart3,
    title: 'Technical Scanner',
    description: 'Multi-timeframe analysis',
    gradient: 'from-emerald-500 to-green-500',
    delay: '50ms',
  },
  {
    icon: Shield,
    title: 'Risk Assessment',
    description: 'Smart money & whale tracking',
    gradient: 'from-amber-500 to-orange-500',
    delay: '100ms',
  },
  {
    icon: Clock,
    title: 'Entry Timing',
    description: 'Optimal entry windows',
    gradient: 'from-purple-500 to-pink-500',
    delay: '150ms',
  },
  {
    icon: Target,
    title: 'Trade Setup',
    description: 'TP/SL with R:R analysis',
    gradient: 'from-rose-500 to-red-500',
    delay: '200ms',
  },
  {
    icon: AlertTriangle,
    title: 'Trap Detection',
    description: 'Liquidity & manipulation check',
    gradient: 'from-yellow-500 to-amber-500',
    delay: '250ms',
  },
  {
    icon: CheckCircle,
    title: 'AI Verdict',
    description: 'Final recommendation',
    gradient: 'from-teal-500 to-emerald-500',
    delay: '300ms',
  },
];

// Quick stats
const STATS = [
  { label: 'Accuracy Rate', value: '87%', icon: Target },
  { label: 'Analyses Today', value: '2,847', icon: Activity },
  { label: 'Avg. R:R Ratio', value: '3.2x', icon: TrendingUp },
];

export default function AnalyzePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Price Ticker */}
      <PriceTicker />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl" />
        </div>

        <div className="container mx-auto px-4 pt-8 pb-12 relative">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
            <div className="space-y-3">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">AI-Powered Analysis</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                  Smart Trading
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-emerald-500 to-amber-500 bg-clip-text text-transparent">
                  Starts Here
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-muted-foreground text-lg max-w-md">
                7-step comprehensive analysis powered by AI.
                Get actionable insights in seconds.
              </p>
            </div>

            {/* Credit Balance - Desktop */}
            <div className="hidden lg:block">
              <CreditBalance />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 text-center hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Left Column - Coin Selector */}
          <div className="xl:col-span-7 space-y-6">
            {/* Coin Selector Card */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                    <LineChart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Select Asset</h2>
                    <p className="text-sm text-muted-foreground">Choose a trading pair to analyze</p>
                  </div>
                </div>

                {/* Mobile Credit Balance */}
                <div className="lg:hidden">
                  <CreditBalance />
                </div>
              </div>

              <CoinSelector />

              {/* Analysis info */}
              <div className="mt-5 pt-5 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Analysis cost: <span className="font-semibold text-foreground">5 credits</span></span>
                  </div>
                  <span className="text-xs text-muted-foreground">or use daily free analysis</span>
                </div>
              </div>
            </div>

            {/* Recent Analyses */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Recent Analyses</h2>
                    <p className="text-sm text-muted-foreground">Your latest trading insights</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <RecentAnalyses />
            </div>
          </div>

          {/* Right Column - Analysis Modules */}
          <div className="xl:col-span-5">
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm sticky top-20">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">7-Step Analysis</h3>
                  <p className="text-sm text-muted-foreground">Comprehensive market intelligence</p>
                </div>
              </div>

              {/* Modules Grid */}
              <div className="space-y-3">
                {ANALYSIS_MODULES.map((module, index) => (
                  <div
                    key={module.title}
                    className="group flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-default"
                    style={{ animationDelay: module.delay }}
                  >
                    {/* Step Number & Icon */}
                    <div className="relative">
                      <div className={`w-11 h-11 bg-gradient-to-br ${module.gradient} rounded-xl flex items-center justify-center shadow-lg shadow-${module.gradient.split('-')[1]}-500/20 group-hover:scale-110 transition-transform`}>
                        <module.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="absolute -top-1 -left-1 w-5 h-5 bg-background border-2 border-border rounded-full flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{module.title}</h4>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="mt-6 pt-5 border-t border-border/50">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 via-emerald-500/5 to-amber-500/5 rounded-xl border border-primary/10">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">AI-Powered Precision</p>
                    <p className="text-xs text-muted-foreground">
                      Each analysis combines 50+ indicators, on-chain data, and market psychology
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
