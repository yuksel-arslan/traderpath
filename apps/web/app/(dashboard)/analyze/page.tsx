'use client';

// ===========================================
// Analyze Landing Page - Compact Design
// With Statistics, Trade Type Selector & Coin Selector
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Target,
  FileText,
  CheckCircle2,
  XCircle,
  Timer,
  LineChart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';
import { CreditBalance } from '../../../components/credits/CreditBalance';
import type { TradeType } from '../../../components/analysis/TradeTypeSelector';

// Lazy load TradingView widget
const TradingViewWidget = dynamic(
  () => import('../../../components/charts/TradingViewWidget').then(mod => ({ default: mod.TradingViewWidget })),
  { ssr: false, loading: () => <div className="h-[300px] bg-muted/30 rounded-lg animate-pulse" /> }
);

// Lazy load heavy components for better performance
const CoinSelector = dynamic(
  () => import('../../../components/common/CoinSelector').then(mod => ({ default: mod.CoinSelector })),
  { ssr: false, loading: () => <div className="h-20 bg-muted/30 rounded-lg animate-pulse" /> }
);

const TradeTypeSelector = dynamic(
  () => import('../../../components/analysis/TradeTypeSelector').then(mod => ({ default: mod.TradeTypeSelector })),
  { ssr: false, loading: () => <div className="h-10 bg-muted/30 rounded-lg animate-pulse" /> }
);

const RecentAnalyses = dynamic(
  () => import('../../../components/analysis/RecentAnalyses').then(mod => ({ default: mod.RecentAnalyses })),
  { ssr: false, loading: () => <div className="h-32 bg-muted/30 rounded-lg animate-pulse" /> }
);

interface AnalysisStats {
  totalAnalyses: number;
  activeCount: number;
  closedCount: number;
  tpHits: number;
  slHits: number;
  accuracy: number;
}

// Popular coins for quick selection
const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE'];

export default function AnalyzePage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [tradeType, setTradeType] = useState<TradeType>('dayTrade');
  const [chartSymbol, setChartSymbol] = useState('BINANCE:BTCUSDT');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showChart, setShowChart] = useState(false);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await authFetch('/api/analysis/statistics');

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalAnalyses: statsData.totalAnalyses || 0,
          activeCount: statsData.activeCount || statsData.pendingAnalyses || 0,
          closedCount: statsData.verifiedAnalyses || 0,
          tpHits: statsData.correctAnalyses || 0,
          slHits: (statsData.verifiedAnalyses || 0) - (statsData.correctAnalyses || 0),
          accuracy: statsData.accuracy || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getAccuracyColor = (value: number) => {
    if (value >= 70) return 'text-green-500 dark:text-green-400';
    if (value >= 50) return 'text-yellow-500 dark:text-yellow-400';
    if (value > 0) return 'text-red-500 dark:text-red-400';
    return 'text-gray-400 dark:text-slate-500';
  };

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* ===== SECTION 1: Compact Statistics Bar ===== */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 dark:border-slate-700/50">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Total */}
            <div className="flex items-center gap-1.5 shrink-0">
              <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
              <span className="text-xs text-gray-500 dark:text-slate-400">Total</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{stats?.totalAnalyses || 0}</span>
            </div>

            <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 shrink-0 hidden sm:block" />

            {/* Active */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Timer className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-gray-500 dark:text-slate-400 hidden sm:inline">Active</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{stats?.activeCount || 0}</span>
            </div>

            <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 shrink-0 hidden sm:block" />

            {/* TP/SL */}
            <div className="flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{stats?.tpHits || 0}</span>
              <span className="text-gray-400 dark:text-slate-500">/</span>
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{stats?.slHits || 0}</span>
            </div>

            <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 shrink-0 hidden sm:block" />

            {/* Accuracy */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-gray-500 dark:text-slate-400 hidden sm:inline">Acc</span>
              <span className={cn("text-sm font-bold", getAccuracyColor(stats?.accuracy || 0))}>
                {(stats?.accuracy || 0) > 0 ? `${stats?.accuracy.toFixed(0)}%` : '-'}
              </span>
            </div>
          </div>

          <CreditBalance compact />
        </div>
      </div>

      {/* ===== SECTION 2: New Analysis (Trade Type + Coin) ===== */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-slate-700/50">
        <div className="space-y-3">
          {/* Trade Type - Tabs variant for compact */}
          <TradeTypeSelector
            value={tradeType}
            onChange={setTradeType}
            variant="tabs"
            showCreditCost
          />

          {/* Coin Selector */}
          <CoinSelector tradeType={tradeType} />
        </div>
      </div>

      {/* ===== SECTION 3: TradingView Chart (Collapsible) ===== */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden">
        <button
          onClick={() => setShowChart(!showChart)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Live Chart</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">({chartSymbol.split(':')[1]})</span>
          </div>
          {showChart ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {showChart && (
          <div className="border-t border-gray-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-slate-900/30">
              {POPULAR_COINS.map((coin) => (
                <button
                  key={coin}
                  onClick={() => setChartSymbol(`BINANCE:${coin}USDT`)}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded transition-all',
                    chartSymbol === `BINANCE:${coin}USDT`
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                  )}
                >
                  {coin}
                </button>
              ))}
            </div>
            <TradingViewWidget
              symbol={chartSymbol}
              theme={isDarkMode ? 'dark' : 'light'}
              height={280}
            />
          </div>
        )}
      </div>

      {/* ===== SECTION 4: Recent Analyses ===== */}
      <div className="bg-white dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-slate-700/50">
        <RecentAnalyses />
      </div>
    </div>
  );
}
