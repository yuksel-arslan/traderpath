'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle, Info, ChevronRight } from 'lucide-react';

interface RecentAnalysis {
  outcome: 'correct' | 'incorrect' | 'pending';
  verdict: string;
  unrealizedPnL?: number;
  direction?: string;
}

interface UserStats {
  accuracy: number;
  activeCount: number;
  activeProfitable: number;
  avgScore: number;
  goSignals: number;
  avoidSignals: number;
}

interface AIBriefingProps {
  userStats: UserStats | null;
  recentAnalyses: RecentAnalysis[];
  capitalFlow: {
    liquidityBias: string;
    recommendation: { action: string; reason: string; confidence: number };
  } | null;
}

type InsightType = 'warning' | 'success' | 'info';

interface Insight {
  type: InsightType;
  text: string;
}

function generateInsights(
  userStats: UserStats | null,
  recentAnalyses: RecentAnalysis[],
  capitalFlow: AIBriefingProps['capitalFlow']
): Insight[] {
  const insights: Insight[] = [];

  if (userStats) {
    // Consecutive SL streak detection (last 5 closed trades)
    const recentClosed = recentAnalyses.filter((a) => a.outcome !== 'pending').slice(0, 5);
    const recentSlHits = recentClosed.filter((a) => a.outcome === 'incorrect').length;
    if (recentSlHits >= 3) {
      insights.push({
        type: 'warning',
        text: `${recentSlHits} recent stop-losses hit — consider reducing position size`,
      });
    }

    // Win rate assessment
    if (userStats.accuracy < 45 && userStats.goSignals > 3) {
      insights.push({
        type: 'warning',
        text: `Win rate at ${userStats.accuracy.toFixed(0)}% — reassess entry criteria`,
      });
    } else if (userStats.accuracy >= 70) {
      insights.push({
        type: 'success',
        text: `Strong ${userStats.accuracy.toFixed(0)}% accuracy — current strategy is working`,
      });
    }

    // Active trade profitability health
    if (userStats.activeCount > 0) {
      const profitPct = (userStats.activeProfitable / userStats.activeCount) * 100;
      if (profitPct < 40) {
        insights.push({
          type: 'warning',
          text: `Only ${Math.round(profitPct)}% of active trades profitable — monitor stops`,
        });
      } else if (profitPct >= 70) {
        insights.push({
          type: 'success',
          text: `${Math.round(profitPct)}% of open positions in profit`,
        });
      }
    }

    // Selectivity check
    const totalSignals = userStats.goSignals + userStats.avoidSignals;
    if (totalSignals > 5) {
      const avoidRatio = userStats.avoidSignals / totalSignals;
      if (avoidRatio < 0.15) {
        insights.push({
          type: 'warning',
          text: 'Low AVOID ratio detected — you may be overtrading',
        });
      }
    }
  }

  // Capital flow context
  if (capitalFlow) {
    if (capitalFlow.recommendation.action === 'avoid') {
      insights.push({
        type: 'warning',
        text: 'Capital flow signals AVOID — better to stay on sidelines',
      });
    } else if (capitalFlow.recommendation.action === 'wait') {
      insights.push({ type: 'info', text: 'Transition period — wait for clearer signals' });
    } else if (
      capitalFlow.recommendation.action === 'analyze' &&
      capitalFlow.recommendation.confidence >= 70
    ) {
      insights.push({
        type: 'success',
        text: capitalFlow.recommendation.reason || 'Good conditions for new positions',
      });
    }
  }

  // Fallback
  if (insights.length === 0) {
    if (capitalFlow?.recommendation.reason) {
      insights.push({ type: 'info', text: capitalFlow.recommendation.reason });
    } else {
      insights.push({
        type: 'info',
        text: 'Complete more analyses to unlock personalized insights',
      });
    }
  }

  return insights.slice(0, 4);
}

const INSIGHT_CONFIG: Record<InsightType, { Icon: typeof AlertTriangle; color: string; bg: string }> = {
  warning: {
    Icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
  },
  success: {
    Icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10',
  },
  info: {
    Icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
};

export function AIBriefing({ userStats, recentAnalyses, capitalFlow }: AIBriefingProps) {
  const insights = generateInsights(userStats, recentAnalyses, capitalFlow);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Briefing</h3>
        <p className="text-sm text-gray-500 mt-0.5">Pattern-based insights for your session</p>
      </div>

      {/* Insights list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {insights.map((insight, i) => {
          const { Icon, color, bg } = INSIGHT_CONFIG[insight.type];
          return (
            <div key={i} className="flex items-start gap-3 px-6 py-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-0.5">
                {insight.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
        <Link
          href="/analyze"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-500 hover:text-teal-600 transition-colors"
        >
          Start new analysis
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
