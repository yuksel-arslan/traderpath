'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  MessageSquare,
  Bell,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { QuickAnalysisResult, VerdictType } from './useConcierge';

interface ResultCardProps {
  data: QuickAnalysisResult;
  compact?: boolean;
}

function getVerdictStyles(verdict: VerdictType) {
  switch (verdict) {
    case 'GO':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: 'text-emerald-500',
        badge: 'bg-emerald-500',
        label: 'GO',
      };
    case 'CONDITIONAL_GO':
      return {
        bg: 'bg-amber-500/10 border-amber-500/30',
        text: 'text-amber-500',
        badge: 'bg-amber-500',
        label: 'CONDITIONAL',
      };
    case 'WAIT':
      return {
        bg: 'bg-orange-500/10 border-orange-500/30',
        text: 'text-orange-500',
        badge: 'bg-orange-500',
        label: 'WAIT',
      };
    case 'AVOID':
      return {
        bg: 'bg-red-500/10 border-red-500/30',
        text: 'text-red-500',
        badge: 'bg-red-500',
        label: 'AVOID',
      };
  }
}

function formatPrice(price: number): string {
  if (!price) return '-';
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

export function ResultCard({ data, compact = false }: ResultCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const styles = getVerdictStyles(data.verdict);

  if (compact) {
    return (
      <div
        className={`rounded-xl border ${styles.bg} p-3 cursor-pointer hover:scale-[1.02] transition-transform`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${styles.badge}`}>
              {styles.label}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {data.symbol}
            </span>
            <span className="text-sm text-slate-500">{data.interval}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${styles.text}`}>
              {data.score}/100
            </span>
            {data.direction === 'long' ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Entry</span>
                <p className="font-medium text-slate-900 dark:text-white">
                  {formatPrice(data.entry)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">SL</span>
                <p className="font-medium text-red-500">{formatPrice(data.stopLoss)}</p>
              </div>
              <div>
                <span className="text-slate-500">TP</span>
                <p className="font-medium text-emerald-500">
                  {formatPrice(data.takeProfit1)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${styles.bg} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-sm font-bold text-white ${styles.badge}`}
            >
              {styles.label}
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {data.symbol}
            </h3>
            <span className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {data.interval}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data.direction === 'long' ? (
              <div className="flex items-center gap-1 text-emerald-500">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">Long</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <TrendingDown className="w-5 h-5" />
                <span className="font-medium">Short</span>
              </div>
            )}
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-500">Analysis Score</span>
            <span className={`font-bold ${styles.text}`}>{data.score}/100</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${styles.badge} transition-all duration-500`}
              style={{ width: `${data.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Trade levels */}
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Entry</span>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {formatPrice(data.entry)}
          </p>
        </div>
        <div className="text-center">
          <span className="text-xs text-red-500 uppercase tracking-wide">Stop Loss</span>
          <p className="text-lg font-bold text-red-500 mt-1">
            {formatPrice(data.stopLoss)}
          </p>
        </div>
        <div className="text-center">
          <span className="text-xs text-emerald-500 uppercase tracking-wide">
            Take Profit
          </span>
          <p className="text-lg font-bold text-emerald-500 mt-1">
            {formatPrice(data.takeProfit1)}
          </p>
        </div>
      </div>

      {/* Additional TP levels */}
      {(data.takeProfit2 || data.takeProfit3) && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> Show all TP levels
              </>
            )}
          </button>

          {expanded && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {data.takeProfit2 && (
                <div className="bg-emerald-500/5 rounded-lg p-2 text-center">
                  <span className="text-xs text-slate-500">TP2</span>
                  <p className="font-medium text-emerald-500">
                    {formatPrice(data.takeProfit2)}
                  </p>
                </div>
              )}
              {data.takeProfit3 && (
                <div className="bg-emerald-500/5 rounded-lg p-2 text-center">
                  <span className="text-xs text-slate-500">TP3</span>
                  <p className="font-medium text-emerald-500">
                    {formatPrice(data.takeProfit3)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Risk/Reward */}
      {data.riskReward > 0 && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Risk/Reward Ratio</span>
            <span
              className={`font-bold ${
                data.riskReward >= 2 ? 'text-emerald-500' : 'text-amber-500'
              }`}
            >
              1:{data.riskReward.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Reasoning */}
      {data.reasoning && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/50">
          <p className="text-sm text-slate-600 dark:text-slate-400 italic">
            &quot;{data.reasoning}&quot;
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 flex flex-wrap gap-2">
        <Link
          href={`/analyze/details/${data.analysisId}`}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Details
        </Link>
        <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
          <FileText className="w-4 h-4" /> PDF
        </button>
        <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
          <MessageSquare className="w-4 h-4" /> Expert
        </button>
        {(data.verdict === 'GO' || data.verdict === 'CONDITIONAL_GO') && (
          <button className="flex items-center justify-center gap-2 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 rounded-lg text-sm font-medium text-teal-600 dark:text-teal-400 transition-colors">
            <Bell className="w-4 h-4" /> Alert
          </button>
        )}
      </div>
    </div>
  );
}
