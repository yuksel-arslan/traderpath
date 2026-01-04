'use client';

// ===========================================
// Analyze Landing Page
// Consistent with Dashboard design
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
  Zap,
} from 'lucide-react';

// Lazy load heavy components
const RecentAnalyses = dynamic(
  () => import('../../../components/analysis/RecentAnalyses').then(mod => ({ default: mod.RecentAnalyses })),
  { ssr: false, loading: () => <div className="h-40 bg-muted/30 rounded-lg animate-pulse" /> }
);

// Analysis steps
const ANALYSIS_STEPS = [
  { icon: TrendingUp, title: 'Market Pulse', description: 'Sentiment & conditions', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: BarChart3, title: 'Asset Scanner', description: 'Technical analysis', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: Shield, title: 'Safety Check', description: 'Whale detection', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: Clock, title: 'Timing Analysis', description: 'Entry windows', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: Target, title: 'Trade Plan', description: 'TP/SL levels', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { icon: AlertTriangle, title: 'Trap Check', description: 'Liquidity traps', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: CheckCircle, title: 'Final Verdict', description: 'AI recommendation', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

export default function AnalyzePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">New Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered trading insights in 7 steps
          </p>
        </div>
        <CreditBalance />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: Coin Selector */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Select Trading Pair</h2>
            <CoinSelector />
          </div>

          {/* Recent Analyses - pushed to bottom */}
          <div className="mt-auto pt-6">
            <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
            <RecentAnalyses />
          </div>
        </div>

        {/* Right: Analysis Steps */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-card border rounded-lg p-5 mt-auto">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
              7-STEP ANALYSIS INCLUDES
            </h3>
            <div className="space-y-3">
              {ANALYSIS_STEPS.map((step, index) => (
                <div key={step.title} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${step.bg} flex items-center justify-center flex-shrink-0`}>
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
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Analysis cost</span>
                </div>
                <span className="font-semibold text-amber-500">5 credits</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                or use 1 of your daily free analyses
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
