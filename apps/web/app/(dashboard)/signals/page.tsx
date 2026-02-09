'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Filter,
  Loader2,
  Activity,
  Flame,
  AlertTriangle,
  BarChart3,
  Target,
} from 'lucide-react';
import { authFetch } from '../../../lib/api';
import SignalCard from '../../../components/signals/SignalCard';

// Market labels for filter dropdown
const MARKET_OPTIONS = [
  { key: 'crypto', label: 'Crypto', icon: '\u20BF' },
  { key: 'stocks', label: 'Stocks', icon: '\uD83D\uDCC8' },
  { key: 'metals', label: 'Metals', icon: '\uD83E\uDD47' },
  { key: 'bonds', label: 'Bonds', icon: '\uD83D\uDCCA' },
];

interface Signal {
  id: string;
  symbol: string;
  assetClass: string;
  market: string;
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  classicVerdict: string;
  classicScore: number;
  mlisConfirmation: boolean;
  mlisRecommendation?: string;
  mlisConfidence?: number;
  overallConfidence: number;
  capitalFlowPhase: string;
  capitalFlowBias: string;
  sectorFlow?: number;
  qualityScore?: number | null;
  qualityData?: any | null;
  status: 'pending' | 'published' | 'expired' | 'cancelled';
  publishedAt?: string;
  expiresAt: string;
  outcome?: string;
  outcomePrice?: number;
  pnlPercent?: number;
  outcomeAt?: string;
  createdAt: string;
}

interface SignalsResponse {
  success: boolean;
  data: {
    signals: Signal[];
    total: number;
    limit: number;
    offset: number;
  };
}

interface StatsResponse {
  success: boolean;
  data: {
    total: number;
    published: number;
    outcomes: {
      tp1Hit: number;
      tp2Hit: number;
      slHit: number;
      expired: number;
    };
    winRate: number;
    byMarket: Array<{ market: string; count: number }>;
  };
}

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minQualityScore, setMinQualityScore] = useState<number>(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchSignals();
    fetchStats();
  }, [selectedMarket, selectedStatus, selectedDirection, minQualityScore, page]);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedMarket) params.append('market', selectedMarket);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedDirection) params.append('direction', selectedDirection);
      if (minQualityScore > 0) params.append('minQualityScore', minQualityScore.toString());
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      const res = await authFetch(`/api/v1/signals?${params.toString()}`);
      const response = await res.json() as SignalsResponse;

      if (response.success && response.data) {
        setSignals(response.data.signals);
        setTotal(response.data.total);
      } else {
        setError('Failed to load signals');
      }
    } catch (err) {
      console.error('Error fetching signals:', err);
      setError('Failed to load signals');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch('/api/v1/signals/stats');
      const response = await res.json() as StatsResponse;
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleRefresh = () => {
    fetchSignals();
    fetchStats();
  };

  const filteredSignals = signals.filter(signal => {
    if (searchQuery) {
      // Guard: signal.symbol could be undefined from API
      return (signal.symbol || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      {/* Decorative gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-teal-500/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 dark:from-teal-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Trading Signals
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                AI-powered signals from Capital Flow analysis
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Signals</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Win Rate</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.winRate}%</p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">TP Hits</p>
                    <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                      {stats.outcomes.tp1Hit + stats.outcomes.tp2Hit}
                    </p>
                  </div>
                  <Flame className="w-8 h-8 text-teal-500" />
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Published</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.published}</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Market Filter */}
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Market</label>
                <select
                  value={selectedMarket}
                  onChange={(e) => {
                    setSelectedMarket(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">All Markets</option>
                  {MARKET_OPTIONS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.icon} {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">All Status</option>
                  <option value="published">Published</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Direction Filter */}
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Direction</label>
                <select
                  value={selectedDirection}
                  onChange={(e) => {
                    setSelectedDirection(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">All Directions</option>
                  <option value="long">LONG</option>
                  <option value="short">SHORT</option>
                </select>
              </div>

              {/* Min Quality Score Slider */}
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                  Min Quality Score: <span className="font-semibold text-slate-900 dark:text-white">{minQualityScore}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={minQualityScore}
                    onChange={(e) => {
                      setMinQualityScore(Number(e.target.value));
                      setPage(1);
                    }}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-teal-500"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0</span>
                  <span>40</span>
                  <span>70</span>
                  <span>100</span>
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search symbol..."
                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signals List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
            <Activity className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No signals found</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              Try adjusting your filters or check back later
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onClick={() => router.push(`/signals/${signal.id}`)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
              Page {page} of {Math.ceil(total / limit)}
            </span>

            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
