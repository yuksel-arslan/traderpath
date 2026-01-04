'use client';

import { useEffect, useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  createdAt: string;
}

const verdictConfig = {
  go: {
    label: 'GO',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    gradient: 'from-emerald-500 to-green-500',
    icon: TrendingUp
  },
  conditional_go: {
    label: 'CONDITIONAL',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    gradient: 'from-amber-500 to-yellow-500',
    icon: TrendingUp
  },
  wait: {
    label: 'WAIT',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    gradient: 'from-orange-500 to-red-400',
    icon: Minus
  },
  avoid: {
    label: 'AVOID',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    gradient: 'from-red-500 to-rose-500',
    icon: TrendingDown
  },
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

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setAnalyses([]);
        return;
      }

      const response = await fetch('/api/analysis/recent', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAnalyses(result.data || []);
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
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your analyses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
          <TrendingDown className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-sm text-red-500 font-medium mb-2">{error}</p>
        <button
          onClick={fetchAnalyses}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No analyses yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Select a coin above to start your first AI-powered analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {analyses.map((analysis, index) => {
        const config = verdictConfig[analysis.verdict];
        const Icon = config.icon;

        return (
          <Link
            key={analysis.id}
            href={`/analysis/${analysis.id}`}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border transition-all group",
              "bg-muted/20 hover:bg-muted/40 border-border/50 hover:border-primary/30",
              "hover:shadow-md hover:scale-[1.01]"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Coin Icon */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
              "bg-gradient-to-br from-muted/80 to-muted/40 group-hover:from-primary/20 group-hover:to-primary/5",
              "transition-all shadow-inner"
            )}>
              {analysis.symbol.slice(0, 2)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{analysis.symbol}</span>
                <span className="text-muted-foreground text-sm">/USDT</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{analysis.createdAt}</span>
              </div>
            </div>

            {/* Score */}
            <div className="text-right mr-2">
              <div className="text-xl font-bold">{analysis.score.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">/10</div>
            </div>

            {/* Verdict Badge */}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
              config.bg, config.color, config.border, "border"
            )}>
              <Icon className="w-3 h-3" />
              <span>{config.label}</span>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        );
      })}
    </div>
  );
}
