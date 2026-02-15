'use client';

/**
 * Morning Briefing Page
 * Daily market intelligence briefing with L1-L4 Capital Flow analysis
 */

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { Clock, TrendingUp, TrendingDown, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import type { MorningBriefing } from '@/types/morning-briefing';

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch('/api/morning-briefing');
      const data = await response.json();

      if (data.success) {
        setBriefing(data.data);
      } else {
        setError(data.error || 'Failed to load briefing');
      }
    } catch (err: unknown) {
      console.error('Failed to load briefing:', err instanceof Error ? err.message : String(err));
      setError('Failed to load morning briefing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading your briefing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-900 dark:text-red-200">Error Loading Briefing</h3>
            </div>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={loadBriefing}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const date = new Date(briefing.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'risk_on':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'risk_off':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Morning Briefing</h1>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Clock className="w-5 h-5" />
            <span>{date}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* L1: Global Liquidity */}
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold">
              L1
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global Liquidity Status</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Market Bias</div>
                <div
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getBiasColor(briefing.globalLiquidityStatus.bias)}`}
                >
                  {briefing.globalLiquidityStatus.bias.toUpperCase().replace('_', '-')}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">DXY (USD)</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {briefing.globalLiquidityStatus.dxyLevel.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">VIX (Fear)</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {briefing.globalLiquidityStatus.vixLevel.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border-l-4 border-teal-500">
              <p className="text-slate-700 dark:text-slate-300">{briefing.globalLiquidityStatus.verdict}</p>
            </div>
          </div>
        </section>

        {/* L2: Market Bias */}
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              L2
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Market Flow Analysis</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Primary Market</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white uppercase">
                  {briefing.marketBias.primary}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">7D Flow</div>
                <div
                  className={`text-xl font-bold ${briefing.marketBias.flow7d > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {briefing.marketBias.flow7d > 0 ? '+' : ''}
                  {briefing.marketBias.flow7d.toFixed(1)}%
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Phase</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white uppercase">
                  {briefing.marketBias.phase}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="text-slate-700 dark:text-slate-300">{briefing.marketBias.recommendation}</p>
            </div>
          </div>
        </section>

        {/* Top 3 Assets */}
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span>🎯</span>
            Top 3 Assets to Watch
          </h2>

          <div className="space-y-4">
            {briefing.topAssets.map((asset, index) => (
              <div
                key={index}
                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">#{index + 1}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{asset.symbol}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      asset.direction === 'long'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {asset.direction === 'long' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {asset.direction.toUpperCase()}
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{asset.reason}</p>
                <div className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Score: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{asset.score.toFixed(1)}/10</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Risk Alerts */}
        {briefing.riskAlerts.length > 0 && (
          <section className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Alerts
            </h3>
            <div className="space-y-3">
              {briefing.riskAlerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-red-700 dark:text-red-300 font-semibold text-sm uppercase">
                    {alert.severity}:
                  </span>
                  <span className="text-red-800 dark:text-red-200">{alert.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {briefing.riskAlerts.length === 0 && (
          <section className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <p className="text-green-700 dark:text-green-300 font-semibold flex items-center gap-2">
              <span>✅</span>
              No significant risk alerts today.
            </p>
          </section>
        )}

        {/* Today's Opportunities */}
        {briefing.opportunities.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span>💡</span>
              Today's Opportunities
            </h2>

            <div className="space-y-4">
              {briefing.opportunities.map((opp, index) => (
                <div
                  key={index}
                  className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{opp.title}</h3>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {opp.confidence}% Confidence
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{opp.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="text-center">
          <a
            href="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:to-blue-600 transition-all font-semibold shadow-lg"
          >
            View Full Analysis →
          </a>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
          <p className="mb-2">TraderPath - AI-Powered Trading Intelligence</p>
          <p className="text-xs">
            This briefing is generated automatically based on market data and should not be considered financial
            advice.
          </p>
        </div>
      </div>
    </div>
  );
}
