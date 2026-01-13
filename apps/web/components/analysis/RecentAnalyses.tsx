'use client';

import { useEffect, useState } from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Target,
  Timer,
  CheckCircle2,
  XCircle,
  Zap,
  Activity,
  Calendar,
  LineChart,
  Eye,
} from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { cn } from '../../lib/utils';
import { getAuthToken } from '../../lib/api';
import Link from 'next/link';

// Trade type definitions
type TradeType = 'scalping' | 'dayTrade' | 'swing';

const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalping', icon: Zap, color: 'purple' },
  dayTrade: { label: 'Day Trade', icon: Activity, color: 'blue' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
};

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  direction: string | null;
  tradeType?: TradeType;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  tpProgress?: number;
  distanceToTP1?: number;
  isSample?: boolean;
  hasTradePlan?: boolean;
  expiresAt?: string;
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
    // Auto-refresh every 30 seconds for live tracking
    const interval = setInterval(() => fetchAnalyses(), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalyses = async () => {
    try {
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setAnalyses([]);
        setLoading(false);
        return;
      }

      // Fetch from live-prices API for real-time data
      const response = await fetch('/api/analysis/live-prices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Safely parse JSON response
        const responseText = await response.text();
        let result: any = { data: { analyses: [] } };

        if (responseText && responseText.trim() !== '') {
          try {
            result = JSON.parse(responseText);
          } catch {
            console.error('Invalid JSON response from live-prices API');
            setError('Failed to load analyses');
            setLoading(false);
            return;
          }
        }

        const liveAnalyses = result.data?.analyses || [];

        // Map to RecentAnalysis format
        const mapped = liveAnalyses.map((a: any) => {
          // Normalize verdict
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

          // Map interval to trade type
          let tradeType: TradeType | undefined;
          if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
          else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
          else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';

          // Map outcome
          let outcome: 'correct' | 'incorrect' | 'pending' | null = null;
          if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') {
            outcome = 'correct';
          } else if (a.outcome === 'sl_hit') {
            outcome = 'incorrect';
          } else if (a.hasTradePlan) {
            outcome = 'pending';
          }

          return {
            id: a.id,
            symbol: a.symbol,
            verdict,
            score: a.totalScore || 0,
            direction: a.direction,
            tradeType,
            createdAt: new Date(a.createdAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            outcome,
            entryPrice: a.entryPrice,
            currentPrice: a.currentPrice,
            unrealizedPnL: a.unrealizedPnL,
            stopLoss: a.stopLoss,
            takeProfit1: a.takeProfit1,
            tpProgress: a.tpProgress,
            distanceToTP1: a.distanceToTP1,
            hasTradePlan: a.hasTradePlan,
            expiresAt: a.expiresAt,
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
    <div className="bg-card rounded-lg border divide-y divide-border max-h-[500px] overflow-y-auto">
      {analyses.map((analysis) => {
        const config = verdictConfig[analysis.verdict] || verdictConfig.wait;
        const isActive = analysis.expiresAt && new Date(analysis.expiresAt) > new Date() && analysis.outcome !== 'correct' && analysis.outcome !== 'incorrect';

        // Calculate TP progress if not provided by API
        const tpProgress = analysis.tpProgress ?? (() => {
          if (analysis.outcome === 'correct') return 100;
          if (analysis.entryPrice && analysis.currentPrice && analysis.takeProfit1) {
            const isLong = analysis.direction === 'long';
            const totalDistance = isLong
              ? (analysis.takeProfit1 - analysis.entryPrice)
              : (analysis.entryPrice - analysis.takeProfit1);
            const coveredDistance = isLong
              ? (analysis.currentPrice - analysis.entryPrice)
              : (analysis.entryPrice - analysis.currentPrice);
            return totalDistance !== 0
              ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
              : 0;
          }
          return null;
        })();

        return (
          <div
            key={analysis.id}
            className={cn(
              "p-4 hover:bg-accent/30 transition-colors relative",
              analysis.outcome === 'correct' && "bg-green-500/5",
              analysis.outcome === 'incorrect' && "bg-red-500/5"
            )}
          >
            {/* TP/SL Hit Ribbon */}
            {analysis.outcome === 'correct' && (
              <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                <div className="absolute top-2 -right-4 w-20 text-center py-0.5 bg-green-500 text-white text-[8px] font-bold rotate-45 shadow-sm">
                  TP HIT ✓
                </div>
              </div>
            )}
            {analysis.outcome === 'incorrect' && (
              <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                <div className="absolute top-2 -right-4 w-20 text-center py-0.5 bg-red-500 text-white text-[8px] font-bold rotate-45 shadow-sm">
                  SL HIT ✗
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* Top Row: Coin Info + Badges */}
              <div className="flex items-center gap-3 min-w-0">
                <CoinIcon symbol={analysis.symbol} size={40} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold">{analysis.symbol}</span>

                    {/* Direction Badge */}
                    {analysis.direction && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
                        analysis.direction === 'long'
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      )}>
                        {analysis.direction === 'long' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {analysis.direction.toUpperCase()}
                      </span>
                    )}

                    {/* Trade Type Badge */}
                    {analysis.tradeType && TRADE_TYPE_CONFIG[analysis.tradeType] && (() => {
                      const typeConfig = TRADE_TYPE_CONFIG[analysis.tradeType!];
                      const Icon = typeConfig.icon;
                      return (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
                          typeConfig.color === 'purple' && "bg-purple-500/10 text-purple-500",
                          typeConfig.color === 'blue' && "bg-blue-500/10 text-blue-500",
                          typeConfig.color === 'amber' && "bg-amber-500/10 text-amber-500"
                        )}>
                          <Icon className="w-3 h-3" />
                          {typeConfig.label}
                        </span>
                      );
                    })()}

                    {/* Live Tracking Badge */}
                    {isActive && analysis.hasTradePlan && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                        <Timer className="w-3 h-3" />
                        LIVE TRACKING
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{analysis.createdAt}</div>
                </div>
              </div>

              {/* Bottom Row: Score + P/L + TP Progress */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Score Badge */}
                <div className={cn(
                  "text-center px-2.5 py-1 rounded-lg min-w-[50px]",
                  analysis.score >= 7 ? "bg-green-100 dark:bg-green-500/20" :
                  analysis.score >= 5 ? "bg-yellow-100 dark:bg-yellow-500/20" : "bg-red-100 dark:bg-red-500/20"
                )}>
                  <div className="text-[9px] text-gray-500 dark:text-muted-foreground">Score</div>
                  <div className={cn(
                    "font-bold text-sm",
                    analysis.score >= 7 ? "text-green-600 dark:text-green-400" :
                    analysis.score >= 5 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {(analysis.score * 10).toFixed(0)}%
                  </div>
                </div>

                {/* P/L Badge - only if has current price */}
                {analysis.currentPrice && analysis.unrealizedPnL !== undefined && (
                  <>
                    <div className="text-muted-foreground/30">|</div>
                    <div className={cn(
                      "text-center px-2.5 py-1 rounded-lg min-w-[55px]",
                      analysis.unrealizedPnL >= 0
                        ? "bg-green-100 dark:bg-green-500/20"
                        : "bg-red-100 dark:bg-red-500/20"
                    )}>
                      <div className="text-[9px] text-gray-500 dark:text-muted-foreground">P/L</div>
                      <div className={cn(
                        "font-bold text-sm",
                        analysis.unrealizedPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {analysis.unrealizedPnL >= 0 ? '+' : ''}{analysis.unrealizedPnL.toFixed(2)}%
                      </div>
                    </div>
                  </>
                )}

                {/* TP Progress Badge */}
                {analysis.takeProfit1 && tpProgress !== null && (
                  <>
                    <div className="text-muted-foreground/30">|</div>
                    <div className={cn(
                      "text-center px-2.5 py-1 rounded-lg min-w-[50px]",
                      analysis.outcome === 'correct' ? "bg-green-200 dark:bg-green-500/30 ring-1 ring-green-500" :
                      analysis.outcome === 'incorrect' ? "bg-red-200 dark:bg-red-500/30 ring-1 ring-red-500" :
                      tpProgress >= 80 ? "bg-green-100 dark:bg-green-500/20" :
                      tpProgress >= 50 ? "bg-yellow-100 dark:bg-yellow-500/20" : "bg-blue-100 dark:bg-blue-500/20"
                    )}>
                      <div className="text-[9px] text-gray-500 dark:text-muted-foreground flex items-center justify-center gap-0.5">
                        <Target className="w-2.5 h-2.5" />
                        {analysis.outcome === 'correct' ? 'TP HIT!' : analysis.outcome === 'incorrect' ? 'SL HIT' : 'TP'}
                      </div>
                      <div className={cn(
                        "font-bold text-sm",
                        analysis.outcome === 'correct' ? "text-green-600 dark:text-green-300" :
                        analysis.outcome === 'incorrect' ? "text-red-600 dark:text-red-300" :
                        tpProgress >= 80 ? "text-green-600 dark:text-green-400" :
                        tpProgress >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"
                      )}>
                        {tpProgress.toFixed(0)}%
                      </div>
                    </div>
                  </>
                )}

                {/* Verdict Badge - moved to end */}
                <div className="ml-auto">
                  <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold",
                    config.bg, config.color
                  )}>
                    {config.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
