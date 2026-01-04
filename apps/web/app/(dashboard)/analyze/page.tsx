'use client';

// ===========================================
// Analyze Landing Page
// Main entry point for starting new analyses
// ===========================================

import { CoinSelector } from '../../../components/common/CoinSelector';
import { PriceTicker } from '../../../components/common/PriceTicker';
import { RecentAnalyses } from '../../../components/analysis/RecentAnalyses';
import { CreditBalance } from '../../../components/credits/CreditBalance';
import { TrendingUp, BarChart3, Shield, Clock, Target, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

const ANALYSIS_STEPS = [
  {
    icon: TrendingUp,
    title: 'Market Pulse',
    description: 'Market sentiment & conditions',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Asset Scanner',
    description: 'Technical analysis & levels',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Shield,
    title: 'Safety Check',
    description: 'Risk & whale detection',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: Clock,
    title: 'Timing',
    description: 'Entry timing analysis',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Target,
    title: 'Trade Plan',
    description: 'Entry, TP & SL levels',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: AlertTriangle,
    title: 'Trap Check',
    description: 'Trap & liquidity analysis',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: CheckCircle,
    title: 'Verdict',
    description: 'AI recommendation',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

export default function AnalyzePage() {
  return (
    <div className="min-h-screen">
      {/* Price Ticker */}
      <PriceTicker />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            New Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered trading insights in 7 steps
          </p>
        </div>
        <CreditBalance />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Coin Selector */}
        <div className="lg:col-span-3">
          <div className="bg-card border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Select Trading Pair</h2>
            <CoinSelector />
          </div>

          {/* Recent Analyses - Mobile */}
          <div className="mt-6 lg:hidden">
            <h2 className="text-lg font-semibold mb-4">Recent Analyses</h2>
            <RecentAnalyses />
          </div>
        </div>

        {/* Right: Analysis Steps Preview */}
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              7-STEP ANALYSIS INCLUDES
            </h3>
            <div className="space-y-3">
              {ANALYSIS_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg ${step.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <step.icon className={`w-4 h-4 ${step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{index + 1}.</span>
                      <span className="font-medium text-sm">{step.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Credit Cost Info */}
            <div className="mt-5 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analysis cost</span>
                <span className="font-semibold text-amber-500">5 credits</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                or use 1 of your daily free analyses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Analyses - Desktop */}
      <div className="hidden lg:block mt-10">
        <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
        <RecentAnalyses />
      </div>
      </div>
    </div>
  );
}
