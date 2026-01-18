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
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== SECTION 1: Statistics Grid ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Analyses */}
        <div className="relative overflow-hidden rounded-xl p-4 border bg-gray-100/80 dark:bg-white/5 border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">Total Analyses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalAnalyses || 0}</p>
        </div>

        {/* Active */}
        <div className="relative overflow-hidden rounded-xl p-4 border bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">Active</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.activeCount || 0}</p>
        </div>

        {/* Closed */}
        <div className="relative overflow-hidden rounded-xl p-4 border bg-gray-100/80 dark:bg-white/5 border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">Closed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.closedCount || 0}</p>
        </div>

        {/* TP Hit */}
        <div className="relative overflow-hidden rounded-xl p-4 border bg-green-50 dark:bg-green-500/10 border-green-200/50 dark:border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">TP Hit</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.tpHits || 0}</p>
        </div>

        {/* SL Hit */}
        <div className="relative overflow-hidden rounded-xl p-4 border bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">SL Hit</span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.slHits || 0}</p>
        </div>

        {/* Accuracy */}
        <div className="relative overflow-hidden rounded-xl p-4 border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">Accuracy</span>
          </div>
          <p className={cn("text-2xl font-bold", getAccuracyColor(stats?.accuracy || 0))}>
            {(stats?.accuracy || 0) > 0 ? `${stats?.accuracy.toFixed(0)}%` : '—'}
          </p>
        </div>
      </div>

      {/* ===== SECTION 2: New Analysis (Trade Type + Coin + Credit) ===== */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700 overflow-visible isolate">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 dark:from-emerald-500/10 via-transparent to-transparent rounded-2xl overflow-hidden pointer-events-none" />

        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Analysis</h2>
            <CreditBalance compact />
          </div>

          <div className="space-y-4">
            {/* Trade Type - Tabs variant */}
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
      </div>

      {/* ===== SECTION 3: TradingView Chart (Collapsible) ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setShowChart(!showChart)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <LineChart className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Live Chart</span>
              <p className="text-xs text-gray-500 dark:text-slate-400">{chartSymbol.split(':')[1]}</p>
            </div>
          </div>
          {showChart ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showChart && (
          <div className="border-t border-gray-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-slate-900/30">
              {POPULAR_COINS.map((coin) => (
                <button
                  key={coin}
                  onClick={() => setChartSymbol(`BINANCE:${coin}USDT`)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    chartSymbol === `BINANCE:${coin}USDT`
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
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
              height={300}
            />
          </div>
        )}
      </div>

      {/* ===== SECTION 4: Recent Analyses ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="relative p-5">
          <RecentAnalyses />
        </div>
      </div>
    </div>
  );
}
