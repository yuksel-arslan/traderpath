'use client';

// ===========================================
// Performance Metrics Component
// Detailed performance tracking for pro traders
// ===========================================

import { useEffect, useState } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Coins,
  Calendar
} from 'lucide-react';
import { getAuthToken, getApiUrl } from '../../lib/api';

interface CoinPerformance {
  symbol: string;
  analyses: number;
  accuracy: number;
  avgScore: number;
}

interface RecentOutcome {
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  outcome: 'correct' | 'incorrect' | 'pending';
  priceChange: number;
  date: string;
}

interface PerformanceData {
  weeklyAnalyses: number;
  monthlyAnalyses: number;
  topCoins: CoinPerformance[];
  recentOutcomes: RecentOutcome[];
  streakDays: number;
  bestStreak: number;
}

const outcomeConfig = {
  correct: { label: 'Correct', color: 'text-green-500', bg: 'bg-green-500' },
  incorrect: { label: 'Incorrect', color: 'text-red-500', bg: 'bg-red-500' },
  pending: { label: 'Pending', color: 'text-yellow-500', bg: 'bg-yellow-500' },
};

export function PerformanceMetrics() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(getApiUrl('/api/analysis/performance'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        // Default empty state for new users
        setData({
          weeklyAnalyses: 0,
          monthlyAnalyses: 0,
          topCoins: [],
          recentOutcomes: [],
          streakDays: 0,
          bestStreak: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
      setData({
        weeklyAnalyses: 0,
        monthlyAnalyses: 0,
        topCoins: [],
        recentOutcomes: [],
        streakDays: 0,
        bestStreak: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6 animate-pulse h-64"></div>
        <div className="bg-card rounded-lg border p-6 animate-pulse h-64"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Performing Coins */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-yellow-500" />
          Top Analyzed Coins
        </h3>

        {data.topCoins.length > 0 ? (
          <div className="space-y-3">
            {data.topCoins.slice(0, 5).map((coin, index) => (
              <div
                key={coin.symbol}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-semibold">{coin.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {coin.analyses} analyses
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    coin.accuracy >= 70 ? 'text-green-500' :
                    coin.accuracy >= 50 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {coin.accuracy.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    accuracy
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No coin data yet</p>
            <p className="text-sm">Complete analyses to see your performance by coin</p>
          </div>
        )}
      </div>

      {/* Recent Outcomes */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-500" />
          Recent Analysis Outcomes
        </h3>

        {data.recentOutcomes.length > 0 ? (
          <div className="space-y-3">
            {data.recentOutcomes.slice(0, 5).map((outcome, index) => {
              const config = outcomeConfig[outcome.outcome];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${config.bg}`} />
                    <div>
                      <div className="font-semibold">{outcome.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {outcome.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${config.color}`}>
                      {config.label}
                    </div>
                    <div className={`text-xs ${
                      outcome.priceChange >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {outcome.priceChange >= 0 ? '+' : ''}{outcome.priceChange.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No outcomes yet</p>
            <p className="text-sm">Outcomes are calculated 24h after analysis</p>
          </div>
        )}
      </div>

      {/* Activity Summary */}
      <div className="lg:col-span-2 bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-purple-500" />
          Activity Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-3xl font-bold">{data.weeklyAnalyses}</div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-3xl font-bold">{data.monthlyAnalyses}</div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-3xl font-bold text-primary">{data.streakDays}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-3xl font-bold text-yellow-500">{data.bestStreak}</div>
            <div className="text-sm text-muted-foreground">Best Streak</div>
          </div>
        </div>
      </div>
    </div>
  );
}
