'use client';

/**
 * Morning Briefing Card for Dashboard
 * Collapsible widget showing today's briefing summary
 */

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { Clock, ChevronDown, ChevronUp, Sparkles, ExternalLink, AlertTriangle } from 'lucide-react';
import type { MorningBriefing } from '@/types/morning-briefing';

export default function BriefingCard() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached briefing first (faster)
      const response = await authFetch('/api/morning-briefing/latest');
      const data = await response.json();

      if (data.success && data.data) {
        setBriefing(data.data);
      } else {
        // If no cached briefing, show error or empty state
        setError('No briefing available yet. Check back tomorrow morning!');
      }
    } catch (err: unknown) {
      console.error('Failed to load briefing:', err instanceof Error ? err.message : String(err));
      setError('Failed to load briefing');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-teal-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Morning Briefing</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-teal-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Morning Briefing</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{error}</p>
        <a
          href="/briefing"
          className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm font-medium"
        >
          View Previous Briefings
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const date = new Date(briefing.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'risk_on':
        return 'text-green-600 dark:text-green-400';
      case 'risk_off':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-amber-600 dark:text-amber-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-teal-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Today's Briefing</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>{date}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Quick Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Market Bias:</span>
            <span className={`font-semibold ${getBiasColor(briefing.globalLiquidityStatus.bias)}`}>
              {briefing.globalLiquidityStatus.bias.toUpperCase().replace('_', '-')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Primary Market:</span>
            <span className="font-semibold text-slate-900 dark:text-white uppercase">{briefing.marketBias.primary}</span>
          </div>
          {briefing.riskAlerts.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{briefing.riskAlerts.length} risk alert{briefing.riskAlerts.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            {/* Top Asset */}
            {briefing.topAssets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Top Asset Today</h3>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {briefing.topAssets[0].symbol}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        briefing.topAssets[0].direction === 'long'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {briefing.topAssets[0].direction.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{briefing.topAssets[0].reason}</p>
                </div>
              </div>
            )}

            {/* Risk Alerts */}
            {briefing.riskAlerts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Risk Alerts</h3>
                <div className="space-y-2">
                  {briefing.riskAlerts.slice(0, 2).map((alert, index) => (
                    <div
                      key={index}
                      className="text-xs text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-900/20 p-2 rounded"
                    >
                      <span className="font-semibold text-red-700 dark:text-red-300 uppercase">
                        {alert.severity}:
                      </span>{' '}
                      {alert.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Full Report */}
        <a
          href="/briefing"
          className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg hover:from-teal-600 hover:to-blue-600 transition-all font-medium text-sm"
        >
          View Full Report
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
