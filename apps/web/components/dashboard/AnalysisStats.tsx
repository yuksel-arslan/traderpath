'use client';

// ===========================================
// Analysis Statistics Component
// Shows key metrics for pro traders
// ===========================================

import { useEffect, useState } from 'react';
import {
  Target,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { getAuthToken } from '../../lib/api';

interface AnalysisStatistics {
  totalAnalyses: number;
  completedAnalyses: number;
  accurateAnalyses: number;
  hitRate: number;
  avgScore: number;
  goSignals: number;
  avoidSignals: number;
  lastAnalysisDate: string | null;
}

export function AnalysisStats() {
  const [stats, setStats] = useState<AnalysisStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/analysis/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Use placeholder for new users
        setStats({
          totalAnalyses: 0,
          completedAnalyses: 0,
          accurateAnalyses: 0,
          hitRate: 0,
          avgScore: 0,
          goSignals: 0,
          avoidSignals: 0,
          lastAnalysisDate: null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      setStats({
        totalAnalyses: 0,
        completedAnalyses: 0,
        accurateAnalyses: 0,
        hitRate: 0,
        avgScore: 0,
        goSignals: 0,
        avoidSignals: 0,
        lastAnalysisDate: null,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const hitRateColor = stats.hitRate >= 70
    ? 'text-green-500'
    : stats.hitRate >= 50
    ? 'text-yellow-500'
    : 'text-red-500';

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Analysis Performance
        </h2>
        {stats.lastAnalysisDate && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Last: {stats.lastAnalysisDate}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Hit Rate - Most Important Metric */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Hit Rate</span>
          </div>
          <div className={`text-3xl font-bold ${hitRateColor}`}>
            {stats.hitRate.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.accurateAnalyses} / {stats.completedAnalyses} accurate
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-muted/30 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-muted-foreground">Avg Score</span>
          </div>
          <div className="text-3xl font-bold">
            {stats.avgScore.toFixed(1)}
            <span className="text-lg text-muted-foreground">/10</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Analysis quality
          </div>
        </div>

        {/* GO Signals */}
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-muted-foreground">GO Signals</span>
          </div>
          <div className="text-3xl font-bold text-green-500">
            {stats.goSignals}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Buy recommendations
          </div>
        </div>

        {/* AVOID Signals */}
        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-muted-foreground">AVOID Signals</span>
          </div>
          <div className="text-3xl font-bold text-red-500">
            {stats.avoidSignals}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Risk warnings
          </div>
        </div>
      </div>

      {/* Total Analyses Counter */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Total Analyses Completed
        </span>
        <span className="font-bold text-lg">{stats.totalAnalyses}</span>
      </div>

      {stats.totalAnalyses === 0 && (
        <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-sm text-blue-400">
            Start your first analysis to see your performance metrics.
            Our AI-powered system tracks accuracy and helps you improve.
          </p>
        </div>
      )}
    </div>
  );
}
