'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Timer,
  Target,
  Filter,
  Loader2,
  Activity,
  Flame,
  ThumbsUp,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  Globe,
  Coins,
  TrendingDownIcon,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// Market configuration
const MARKET_CONFIG = {
  crypto: { label: 'Crypto', icon: '₿', color: 'from-orange-500 to-yellow-500' },
  stocks: { label: 'Stocks', icon: '📈', color: 'from-blue-500 to-cyan-500' },
  metals: { label: 'Metals', icon: '🥇', color: 'from-yellow-600 to-amber-600' },
  bonds: { label: 'Bonds', icon: '📊', color: 'from-gray-600 to-slate-600' },
};

// Verdict configuration
const VERDICT_CONFIG = {
  GO: { label: 'GO', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/30', icon: CheckCircle2 },
  CONDITIONAL_GO: { label: 'COND', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30', icon: Zap },
  WAIT: { label: 'WAIT', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30', icon: Clock },
  AVOID: { label: 'AVOID', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30', icon: AlertTriangle },
};

// Outcome configuration
const OUTCOME_CONFIG = {
  tp1_hit: { label: 'TP1 HIT', bg: 'bg-green-500', text: 'text-white', icon: Target },
  tp2_hit: { label: 'TP2 HIT', bg: 'bg-green-600', text: 'text-white', icon: Flame },
  sl_hit: { label: 'SL HIT', bg: 'bg-red-500', text: 'text-white', icon: XCircle },
  expired: { label: 'EXPIRED', bg: 'bg-gray-500', text: 'text-white', icon: Timer },
  pending: { label: 'LIVE', bg: 'bg-blue-500', text: 'text-white', icon: Activity },
};

// Phase configuration
const PHASE_CONFIG = {
  early: { label: 'Early', icon: '🌱', color: 'text-green-600 dark:text-green-400' },
  mid: { label: 'Mid', icon: '🌿', color: 'text-blue-600 dark:text-blue-400' },
  late: { label: 'Late', icon: '🍂', color: 'text-orange-600 dark:text-orange-400' },
  exit: { label: 'Exit', icon: '🍁', color: 'text-red-600 dark:text-red-400' },
};

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

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchSignals();
    fetchStats();
  }, [selectedMarket, selectedStatus, selectedDirection, page]);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedMarket) params.append('market', selectedMarket);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedDirection) params.append('direction', selectedDirection);
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      const response = await authFetch<SignalsResponse>(`/api/v1/signals?${params.toString()}`);

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
      const response = await authFetch<StatsResponse>('/api/v1/signals/stats');
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

  const getOutcomeStatus = (signal: Signal) => {
    if (signal.outcome) {
      return signal.outcome;
    }
    if (signal.status === 'published' && new Date(signal.expiresAt) > new Date()) {
      return 'pending';
    }
    if (signal.status === 'expired') {
      return 'expired';
    }
    return null;
  };

  const filteredSignals = signals.filter(signal => {
    if (searchQuery) {
      return signal.symbol.toLowerCase().includes(searchQuery.toLowerCase());
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {Object.entries(MARKET_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label}
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
                  <option value="long">🟢 LONG</option>
                  <option value="short">🔴 SHORT</option>
                </select>
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
            {filteredSignals.map((signal) => {
              const outcomeStatus = getOutcomeStatus(signal);
              const verdictConfig = VERDICT_CONFIG[signal.classicVerdict as keyof typeof VERDICT_CONFIG];
              const outcomeConfig = outcomeStatus ? OUTCOME_CONFIG[outcomeStatus as keyof typeof OUTCOME_CONFIG] : null;
              const phaseConfig = PHASE_CONFIG[signal.capitalFlowPhase as keyof typeof PHASE_CONFIG];
              const marketConfig = MARKET_CONFIG[signal.market as keyof typeof MARKET_CONFIG];

              return (
                <div
                  key={signal.id}
                  onClick={() => router.push(`/signals/${signal.id}`)}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Symbol */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                          `bg-gradient-to-br ${marketConfig.color}`
                        )}>
                          {marketConfig.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {signal.symbol}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {marketConfig.label}
                          </p>
                        </div>
                      </div>

                      {/* Direction */}
                      <div className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1",
                        signal.direction === 'long'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      )}>
                        {signal.direction === 'long' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {signal.direction.toUpperCase()}
                      </div>
                    </div>

                    {/* Outcome Badge */}
                    {outcomeConfig && (
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                        outcomeConfig.bg,
                        outcomeConfig.text
                      )}>
                        <outcomeConfig.icon className="w-3 h-3" />
                        {outcomeConfig.label}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Analysis Section */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Analysis</p>

                      {verdictConfig && (
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium",
                          verdictConfig.bg,
                          verdictConfig.text,
                          verdictConfig.border
                        )}>
                          <verdictConfig.icon className="w-3 h-3" />
                          {verdictConfig.label}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Score:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {signal.classicScore.toFixed(1)}/10
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Confidence:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {signal.overallConfidence}%
                        </span>
                      </div>

                      {signal.mlisConfirmation && (
                        <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                          <CheckCircle2 className="w-3 h-3" />
                          MLIS Confirmed
                        </div>
                      )}

                      {phaseConfig && (
                        <div className="flex items-center gap-1 text-xs">
                          <span>{phaseConfig.icon}</span>
                          <span className={phaseConfig.color}>{phaseConfig.label} Phase</span>
                        </div>
                      )}
                    </div>

                    {/* Trade Plan Section */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Trade Plan</p>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Entry:</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white">
                            ${signal.entryPrice.toFixed(signal.entryPrice >= 1 ? 2 : 6)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-600 dark:text-red-400">SL:</span>
                          <span className="font-mono font-medium text-red-600 dark:text-red-400">
                            ${signal.stopLoss.toFixed(signal.stopLoss >= 1 ? 2 : 6)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600 dark:text-green-400">TP1:</span>
                          <span className="font-mono font-medium text-green-600 dark:text-green-400">
                            ${signal.takeProfit1.toFixed(signal.takeProfit1 >= 1 ? 2 : 6)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600 dark:text-green-400">TP2:</span>
                          <span className="font-mono font-medium text-green-600 dark:text-green-400">
                            ${signal.takeProfit2.toFixed(signal.takeProfit2 >= 1 ? 2 : 6)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">R:R</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {signal.riskRewardRatio.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Section */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Performance</p>

                      {signal.pnlPercent !== undefined && signal.pnlPercent !== null ? (
                        <div className={cn(
                          "text-2xl font-bold",
                          signal.pnlPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        )}>
                          {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(2)}%
                        </div>
                      ) : (
                        <div className="text-slate-400 dark:text-slate-500 text-sm">
                          Pending
                        </div>
                      )}

                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <div>Created: {new Date(signal.createdAt).toLocaleDateString()}</div>
                        {signal.publishedAt && (
                          <div>Published: {new Date(signal.publishedAt).toLocaleDateString()}</div>
                        )}
                        <div>Expires: {new Date(signal.expiresAt).toLocaleDateString()}</div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/signals/${signal.id}`);
                        }}
                        className="w-full px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm group-hover:scale-105"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
