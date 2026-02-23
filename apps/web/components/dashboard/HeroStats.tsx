'use client';

import Link from 'next/link';
import { Gem, TrendingUp, TrendingDown } from 'lucide-react';

interface HeroStatsProps {
  periodPnL: number;
  pnlViewMode: 'daily' | 'weekly' | 'monthly';
  setPnlViewMode: (v: 'daily' | 'weekly' | 'monthly') => void;
  winRate: number;
  totalAnalyses: number;
  accuracy: number;
  activeCount: number;
  activeProfitable: number;
  credits: number;
}

const VIEW_MODES: { key: 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { key: 'daily', label: '1D' },
  { key: 'weekly', label: '7D' },
  { key: 'monthly', label: '30D' },
];

export function HeroStats({
  periodPnL,
  pnlViewMode,
  setPnlViewMode,
  winRate,
  totalAnalyses,
  accuracy,
  activeCount,
  activeProfitable,
  credits,
}: HeroStatsProps) {
  const pnlPositive = periodPnL >= 0;
  const pnlColor = pnlPositive ? 'text-green-500' : 'text-red-500';
  const PnLIcon = pnlPositive ? TrendingUp : TrendingDown;

  const winRateColor =
    winRate >= 60 ? 'text-green-500' : winRate >= 45 ? 'text-yellow-500' : 'text-red-500';
  const accuracyColor =
    accuracy >= 65 ? 'text-green-500' : accuracy >= 45 ? 'text-yellow-500' : 'text-red-500';
  const creditColor = credits < 25 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* P&L Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-[#111111]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500">Realized P&L</p>
          <PnLIcon className={`w-3.5 h-3.5 ${pnlColor}`} />
        </div>
        <p className={`text-2xl font-semibold font-mono ${pnlColor}`}>
          {pnlPositive ? '+' : ''}${Math.abs(periodPnL).toFixed(0)}
        </p>
        <div className="flex gap-1 mt-3">
          {VIEW_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setPnlViewMode(m.key)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors font-medium ${
                pnlViewMode === m.key
                  ? 'bg-teal-500 text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Win Rate Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-[#111111]">
        <p className="text-xs font-medium text-gray-500 mb-3">Win Rate</p>
        <p className={`text-2xl font-semibold font-mono ${winRateColor}`}>
          {winRate > 0 ? `${winRate.toFixed(0)}%` : '—'}
        </p>
        <p className="text-xs text-gray-500 mt-3">
          {totalAnalyses > 0 ? `${totalAnalyses} analyses total` : 'No trades yet'}
        </p>
      </div>

      {/* Accuracy Score Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-[#111111]">
        <p className="text-xs font-medium text-gray-500 mb-3">AI Accuracy</p>
        <p className={`text-2xl font-semibold font-mono ${accuracyColor}`}>
          {accuracy > 0 ? `${accuracy.toFixed(0)}%` : '—'}
        </p>
        <p className="text-xs text-gray-500 mt-3">Prediction accuracy</p>
      </div>

      {/* Active Trades Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-[#111111]">
        <p className="text-xs font-medium text-gray-500 mb-3">Active Trades</p>
        <p className="text-2xl font-semibold font-mono text-gray-900 dark:text-gray-100">
          {activeCount}
        </p>
        <p className="text-xs text-gray-500 mt-3">
          {activeCount > 0 ? (
            <span className="text-green-500">{activeProfitable} profitable</span>
          ) : (
            'No open positions'
          )}
        </p>
      </div>

      {/* Credits Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-[#111111]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500">Credits</p>
          <Gem className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <p className={`text-2xl font-semibold font-mono ${creditColor}`}>
          {credits.toLocaleString()}
        </p>
        <div className="mt-3">
          {credits < 25 ? (
            <Link
              href="/pricing"
              className="text-xs font-medium text-teal-500 hover:text-teal-600 transition-colors"
            >
              Buy credits →
            </Link>
          ) : (
            <Link
              href="/rewards"
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Earn free credits →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
