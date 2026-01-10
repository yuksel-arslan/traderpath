'use client';

import { useEffect, useState } from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Target,
} from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { cn } from '../../lib/utils';
import { getAuthToken } from '../../lib/api';

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  direction: string | null;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  isSample?: boolean;
  hasTradePlan?: boolean;
}

const verdictConfig = {
  go: { label: 'GO', color: 'text-green-500', bg: 'bg-green-500/10' },
  conditional_go: { label: 'CONDITIONAL', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  wait: { label: 'WAIT', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  avoid: { label: 'AVOID', color: 'text-red-500', bg: 'bg-red-500/10' },
};

export function RecentAnalyses() {
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setAnalyses([]);
        return;
      }

      // Fetch from analysis history API (analyses table)
      const response = await fetch('/api/analysis/history?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const analyses = result.data?.analyses || [];

        // Map to RecentAnalysis format
        const mapped = analyses.map((a: any) => {
          // Normalize verdict to lowercase and map to valid values
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditional go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';
          else if (rawVerdict === 'wait') verdict = 'wait';

          return {
            id: a.id,
            symbol: a.symbol,
            verdict,
            score: a.totalScore || 0,
            direction: a.direction,
            createdAt: new Date(a.createdAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            outcome: null, // analyses don't track outcome yet
            entryPrice: a.entryPrice,
            currentPrice: null, // would need live price fetch
            unrealizedPnL: null,
            stopLoss: a.stopLoss,
            takeProfit1: a.takeProfit1,
            hasTradePlan: a.hasTradePlan,
          };
        });

        setAnalyses(mapped);
      } else if (response.status === 401) {
        setAnalyses([]);
      } else {
        setError('Failed to load analyses');
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
      setError('Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <RefreshCw className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading analyses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <button
          onClick={fetchAnalyses}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

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
    <div className="bg-card rounded-lg border divide-y divide-border max-h-[320px] overflow-y-auto">
      {analyses.map((analysis) => {
        const config = verdictConfig[analysis.verdict] || verdictConfig.wait;

        return (
          <div
            key={analysis.id}
            className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors relative"
          >
            {/* Left: Coin Info */}
            <div className="flex items-center gap-3 min-w-0">
              <CoinIcon symbol={analysis.symbol} size={40} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{analysis.symbol}</span>
                  {/* Verdict Badge */}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold",
                    config.bg, config.color
                  )}>
                    {config.label}
                  </span>
                  {/* Direction Badge */}
                  {analysis.direction && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold",
                      analysis.direction === 'long'
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    )}>
                      {analysis.direction === 'long' ? (
                        <TrendingUp className="w-3 h-3 inline" />
                      ) : (
                        <TrendingDown className="w-3 h-3 inline" />
                      )}
                    </span>
                  )}
                  {/* Trade Plan Badge */}
                  {analysis.hasTradePlan && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-0.5">
                      <Target className="w-3 h-3" />
                      Plan
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{analysis.createdAt}</div>
              </div>
            </div>

            {/* Right: Score */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Entry Price */}
              {analysis.entryPrice && (
                <div className="px-2 py-1 rounded text-xs font-medium text-muted-foreground bg-muted/50">
                  ${analysis.entryPrice < 1 ? analysis.entryPrice.toFixed(6) : analysis.entryPrice.toFixed(2)}
                </div>
              )}

              {/* Score */}
              <div className={cn(
                "px-2 py-1 rounded text-xs font-bold min-w-[40px] text-center",
                analysis.score >= 7 ? "bg-green-500/20 text-green-400" :
                analysis.score >= 5 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
              )}>
                {(analysis.score * 10).toFixed(0)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
