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
  qualityData?: Record<string, unknown> | null;
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
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
                <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
              </div>
              <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
                SIGNALS
              </span>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
                AI-powered · Capital Flow
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-500"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">

          {/* Stats Row */}
          {stats && (
            <div className="flex items-center gap-4 mb-4 text-[11px] font-sans">
              <span className="text-neutral-400">Total: <span className="text-neutral-900 dark:text-white font-semibold">{stats.total}</span></span>
              <span className="text-neutral-400">Win: <span className="text-[#22C55E] dark:text-[#4ADE80] font-semibold">{stats.winRate}%</span></span>
              <span className="text-neutral-400">TP: <span className="text-[#14B8A6] font-semibold">{stats.outcomes.tp1Hit + stats.outcomes.tp2Hit}</span></span>
              <span className="text-neutral-400">Published: <span className="text-neutral-900 dark:text-white font-semibold">{stats.published}</span></span>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              {/* Market Filter */}
              <div>
                <label className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 block font-sans">Market</label>
                <select
                  value={selectedMarket}
                  onChange={(e) => {
                    setSelectedMarket(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/50"
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
                <label className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 block font-sans">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/50"
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
                <label className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 block font-sans">Direction</label>
                <select
                  value={selectedDirection}
                  onChange={(e) => {
                    setSelectedDirection(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/50"
                >
                  <option value="">All Directions</option>
                  <option value="long">LONG</option>
                  <option value="short">SHORT</option>
                </select>
              </div>

              {/* Min Quality Score Slider */}
              <div>
                <label className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 block font-sans">
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
                    className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full appearance-none cursor-pointer accent-[#14B8A6]"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                  <span>0</span>
                  <span>40</span>
                  <span>70</span>
                  <span>100</span>
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 block font-sans">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search symbol..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signals List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-8 h-8 text-[#EF5A6F] mx-auto mb-3" />
              <p className="text-sm text-neutral-500">{error}</p>
              <button onClick={handleRefresh} className="mt-3 text-xs text-[#14B8A6] hover:underline">Try Again</button>
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">No signals found</p>
              <p className="text-[10px] text-neutral-400 mt-1">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-1.5">
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
            <div className="mt-6 flex items-center justify-center gap-2 pb-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-sans rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-neutral-500"
              >
                Previous
              </button>
              <span className="text-[10px] font-sans text-neutral-400">
                {page} / {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="px-3 py-1.5 text-xs font-sans rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-neutral-500"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
