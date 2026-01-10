'use client';

import { useEffect, useState } from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Timer,
  Target,
  Eye
} from 'lucide-react';
import Link from 'next/link';
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

      // Fetch from reports API for richer data
      const response = await fetch('/api/reports?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const reports = result.data?.reports || [];

        // Map to RecentAnalysis format
        const mapped = reports.map((r: any) => ({
          id: r.id,
          symbol: r.symbol,
          verdict: r.verdict || 'wait',
          score: r.score || 0,
          direction: r.direction,
          createdAt: new Date(r.generatedAt).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          outcome: r.outcome,
          entryPrice: r.entryPrice,
          currentPrice: r.currentPrice,
          unrealizedPnL: r.unrealizedPnL,
          stopLoss: r.stopLoss,
          takeProfit1: r.takeProfit1,
        }));

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
        const isActive = !analysis.outcome || analysis.outcome === 'pending';

        // Calculate TP progress for active trades
        let tpProgress = 0;
        if (isActive && analysis.entryPrice && analysis.currentPrice && analysis.takeProfit1) {
          const entry = analysis.entryPrice;
          const current = analysis.currentPrice;
          const tp1 = analysis.takeProfit1;
          const isLong = analysis.direction === 'long';

          const totalDistance = isLong ? (tp1 - entry) : (entry - tp1);
          const coveredDistance = isLong ? (current - entry) : (entry - current);
          tpProgress = totalDistance !== 0
            ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
            : 0;
        }

        return (
          <Link
            key={analysis.id}
            href={`/reports/${analysis.id}`}
            className={cn(
              "flex items-center justify-between p-3 hover:bg-accent/50 transition-colors relative",
              // Dynamic background based on status
              analysis.outcome === 'correct' && "bg-green-500/5",
              analysis.outcome === 'incorrect' && "bg-red-500/5",
              isActive && "bg-blue-500/5"
            )}
          >
            {/* Left: Coin Info */}
            <div className="flex items-center gap-3 min-w-0">
              <CoinIcon symbol={analysis.symbol} size={40} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{analysis.symbol}</span>
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
                  {/* Status Badge */}
                  {analysis.outcome === 'correct' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      TP
                    </span>
                  )}
                  {analysis.outcome === 'incorrect' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 flex items-center gap-0.5">
                      <XCircle className="w-3 h-3" />
                      SL
                    </span>
                  )}
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
                      <Timer className="w-3 h-3" />
                      LIVE
                    </span>
                  )}
                  {/* Sample Report Badge */}
                  {analysis.isSample && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 flex items-center gap-0.5">
                      <Eye className="w-3 h-3" />
                      SAMPLE
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{analysis.createdAt}</div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex items-center gap-2 shrink-0">
              {/* P/L Display */}
              {analysis.unrealizedPnL !== undefined && (
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-bold min-w-[50px] text-center",
                  analysis.unrealizedPnL >= 0
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                )}>
                  {analysis.unrealizedPnL >= 0 ? '+' : ''}{analysis.unrealizedPnL.toFixed(1)}%
                </div>
              )}

              {/* TP Progress for active */}
              {isActive && analysis.takeProfit1 && tpProgress > 0 && (
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-bold min-w-[40px] text-center flex items-center gap-1",
                  tpProgress >= 80 ? "bg-green-500/20 text-green-400" :
                  tpProgress >= 50 ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  <Target className="w-3 h-3" />
                  {tpProgress.toFixed(0)}%
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

              {/* View Icon */}
              <Eye className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
