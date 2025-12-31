'use client';

import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  createdAt: string;
}

const MOCK_ANALYSES: RecentAnalysis[] = [
  { id: '1', symbol: 'BTC', verdict: 'go', score: 8.5, createdAt: '2 hours ago' },
  { id: '2', symbol: 'ETH', verdict: 'conditional_go', score: 7.2, createdAt: '5 hours ago' },
  { id: '3', symbol: 'SOL', verdict: 'wait', score: 5.8, createdAt: '1 day ago' },
];

const verdictConfig = {
  go: { label: 'GO', color: 'text-green-500', bg: 'bg-green-500/10', icon: TrendingUp },
  conditional_go: { label: 'CONDITIONAL', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: TrendingUp },
  wait: { label: 'WAIT', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Minus },
  avoid: { label: 'AVOID', color: 'text-red-500', bg: 'bg-red-500/10', icon: TrendingDown },
};

export function RecentAnalyses() {
  // TODO: Fetch from API
  const analyses = MOCK_ANALYSES;

  if (analyses.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No analyses yet</h3>
        <p className="text-sm text-muted-foreground">
          Select a coin above to start your first analysis
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border divide-y">
      {analyses.map((analysis) => {
        const config = verdictConfig[analysis.verdict];
        const Icon = config.icon;

        return (
          <Link
            key={analysis.id}
            href={`/analysis/${analysis.id}`}
            className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                {analysis.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="font-semibold">{analysis.symbol}/USDT</div>
                <div className="text-sm text-muted-foreground">{analysis.createdAt}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-semibold">{analysis.score.toFixed(1)}/10</div>
                <div className={`text-sm flex items-center gap-1 ${config.color}`}>
                  <Icon className="w-3 h-3" />
                  {config.label}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
