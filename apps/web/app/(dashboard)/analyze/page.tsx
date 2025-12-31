'use client';

// ===========================================
// Analyze Landing Page
// Main entry point for starting new analyses
// ===========================================

import { CoinSelector } from '../../../components/common/CoinSelector';
import { RecentAnalyses } from '../../../components/analysis/RecentAnalyses';
import { CreditBalance } from '../../../components/credits/CreditBalance';
import { TrendingUp, BarChart3, Shield, Clock, Target, AlertTriangle, CheckCircle } from 'lucide-react';

const ANALYSIS_STEPS = [
  {
    icon: TrendingUp,
    title: 'Market Pulse',
    description: 'Overall crypto market sentiment and conditions',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Asset Scanner',
    description: 'Technical analysis and price levels',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Shield,
    title: 'Safety Check',
    description: 'Risk assessment and whale activity',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: Clock,
    title: 'Timing Analysis',
    description: 'Optimal entry timing and conditions',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Target,
    title: 'Trade Plan',
    description: 'Entry, targets, and stop-loss levels',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: AlertTriangle,
    title: 'Trap Check',
    description: 'Bull/bear trap and liquidity analysis',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: CheckCircle,
    title: 'Final Verdict',
    description: 'AI-powered trade recommendation',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

export default function AnalyzePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">New Analysis</h1>
          <p className="text-muted-foreground">
            Get AI-powered trading insights in 7 comprehensive steps
          </p>
        </div>
        <CreditBalance />
      </div>

      {/* Coin Selector - Primary Focus */}
      <div className="mb-10">
        <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-2">Select a Coin to Analyze</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Enter a symbol or search from popular cryptocurrencies
          </p>
          <CoinSelector />
        </div>
      </div>

      {/* Analysis Steps Overview */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">What You'll Get</h2>
        <p className="text-muted-foreground mb-6">
          Each analysis includes 7 comprehensive steps powered by AI
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ANALYSIS_STEPS.map((step, index) => (
            <div
              key={step.title}
              className="relative p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${step.bgColor} flex items-center justify-center flex-shrink-0`}
                >
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Step {index + 1}</span>
                  </div>
                  <h3 className="font-medium text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Analyses */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
        <RecentAnalyses />
      </div>
    </div>
  );
}
