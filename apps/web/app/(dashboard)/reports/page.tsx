'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CoinIcon } from '../../../components/common/CoinIcon';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import {
  FileText,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Timer,
  Target,
  Bot,
  Zap,
  Activity,
  Calendar,
  Mail,
  Loader2,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// Trade type definitions
type TradeType = 'scalping' | 'dayTrade' | 'swing';

const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalping', icon: Zap, color: 'teal' },
  dayTrade: { label: 'Day Trade', icon: Activity, color: 'slate' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
};

// Verdict configuration for badges
const VERDICT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  go: { label: 'GO', bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400' },
  conditional_go: { label: 'COND', bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
  wait: { label: 'WAIT', bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  avoid: { label: 'AVOID', bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400' },
};

// Helper to normalize verdict string
function normalizeVerdict(verdict: string): string {
  const v = (verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
  if (v === 'go' || v === 'long' || v === 'short') return 'go';
  if (v === 'conditional_go' || v === 'conditionalgo' || v === 'cond' || v === 'conditional') return 'conditional_go';
  if (v === 'avoid' || v === 'no_go' || v === 'nogo') return 'avoid';
  return 'wait';
}

type AnalysisMethod = 'classic' | 'mlis_pro';

interface Report {
  id: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string | null;
  tradeType?: TradeType;
  method?: AnalysisMethod;
  generatedAt: string;
  expiresAt: string;
  downloadCount: number;
  // Live tracking fields
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  // AI Expert fields
  analysisId?: string;
  aiExpertComment?: string | null;
  // Sample report flag (admin's public reports)
  isSample?: boolean;
}

interface ReportsResponse {
  success: boolean;
  data: {
    reports: Report[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

// Date filter options
type DateFilter = 'all' | 'today' | 'week' | 'month';

// Verdict filter options
type VerdictFilter = 'all' | 'go' | 'conditional_go' | 'wait' | 'avoid';

// Outcome filter options
type OutcomeFilter = 'all' | 'live' | 'tp' | 'sl';

const OUTCOME_FILTERS: { value: OutcomeFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'text-slate-600 dark:text-slate-300' },
  { value: 'live', label: 'LIVE', color: 'text-blue-500' },
  { value: 'tp', label: 'TP HIT', color: 'text-teal-500' },
  { value: 'sl', label: 'SL HIT', color: 'text-red-500' },
];

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState<TradeType | 'all'>('all');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/reports?limit=${pagination.limit}&offset=${pagination.offset}`);

      if (response.ok) {
        const data: ReportsResponse = await response.json();
        if (data.success) {
          setReports(data.data.reports);
          setPagination(data.data.pagination);
        } else {
          setError('Failed to load reports. Please try again.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData?.error?.message || 'Failed to load reports. Please refresh the page.');
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setError('Connection error. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [pagination.offset]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await authFetch(`/api/reports/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReports(reports.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  // Send report via email - redirects to report details page for full screenshot
  const handleSendEmail = (report: Report) => {
    // Redirect to report details page with email=true parameter
    // The details page will capture the full screenshot and send the email
    router.push(`/reports/${report.id}?email=true`);
  };

  // Navigate to AI Expert with report context
  const handleAskAIExpert = async (report: Report) => {
    if (!report.analysisId) {
      alert('Analysis ID not found for this report');
      return;
    }

    try {
      // Fetch full report data to build context
      const response = await authFetch(`/api/reports/${report.id}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.reportData) {
          const reportData = data.data.reportData;

          // Build comprehensive context
          const contextMessage = `I would like your expert opinion on this analysis:

[${report.symbol}/USDT ANALYSIS SUMMARY]
Date: ${reportData.generatedAt || report.generatedAt}
Score: ${(report.score * 10).toFixed(0)}/100
Direction: ${report.direction?.toUpperCase() || 'N/A'}

[STEP 1: Market Pulse]
Fear & Greed: ${reportData.marketPulse?.fearGreedIndex || 'N/A'} (${reportData.marketPulse?.fearGreedLabel || 'N/A'})
BTC Dominance: ${reportData.marketPulse?.btcDominance?.toFixed(1) || 'N/A'}%

[STEP 2: Asset Scanner]
Price: $${reportData.assetScan?.currentPrice || 'N/A'}
RSI: ${reportData.assetScan?.indicators?.rsi?.toFixed(0) || 'N/A'}

[STEP 3: Safety Check]
Risk Level: ${reportData.safetyCheck?.riskLevel || 'N/A'}

[STEP 4: Timing]
Trade Now: ${reportData.timing?.tradeNow ? 'Yes' : 'No'}

[STEP 5: Trade Plan]
Entry: $${reportData.tradePlan?.averageEntry || report.entryPrice || 'N/A'}
Stop Loss: $${reportData.tradePlan?.stopLoss?.price || report.stopLoss || 'N/A'}
Take Profit: $${reportData.tradePlan?.takeProfits?.[0]?.price || report.takeProfit1 || 'N/A'}

[STEP 6: Trap Check]
Bull Trap: ${reportData.trapCheck?.traps?.bullTrap ? 'Yes' : 'No'}
Bear Trap: ${reportData.trapCheck?.traps?.bearTrap ? 'Yes' : 'No'}

[STEP 7: Final Verdict]
Decision: ${reportData.verdict?.action || report.verdict}

Could you share your risk assessment and recommendations based on this analysis?`;

          // Store context in sessionStorage
          sessionStorage.setItem('aiExpertContext', contextMessage);
          sessionStorage.setItem('aiExpertAnalysisId', report.analysisId);

          // Navigate to AI Expert
          router.push('/ai-expert/nexus?fromAnalysis=true');
        }
      }
    } catch (error) {
      console.error('Failed to prepare AI Expert context:', error);
    }
  };

  const getVerdictColor = (verdict: string) => {
    const v = verdict.toLowerCase();
    if (v.includes('strong buy') || v.includes('buy')) return 'text-green-500 bg-green-500/10';
    if (v.includes('strong sell') || v.includes('sell')) return 'text-red-500 bg-red-500/10';
    if (v.includes('hold') || v.includes('wait')) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-gray-500 bg-gray-500/10';
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} days remaining`;
    if (hours > 0) return `${hours} hours remaining`;
    return 'Expiring soon';
  };

  // Calculate TP progress for sorting
  const calculateTpProgress = (report: Report): number => {
    if (report.outcome === 'correct') return 100;
    if (!report.currentPrice || !report.takeProfit1 || !report.entryPrice) return 0;

    const isLong = report.direction === 'long';
    const totalDistance = isLong
      ? (report.takeProfit1 - report.entryPrice)
      : (report.entryPrice - report.takeProfit1);
    const coveredDistance = isLong
      ? (report.currentPrice - report.entryPrice)
      : (report.entryPrice - report.currentPrice);

    return totalDistance !== 0
      ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
      : 0;
  };

  // Date filter helper - fixed block scoping for const declarations
  const isInDateRange = (dateStr: string): boolean => {
    if (dateFilter === 'all') return true;

    const date = new Date(dateStr);
    const now = new Date();

    // Reset time to start of day for accurate comparison
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today': {
        const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return startOfDate.getTime() === startOfToday.getTime();
      }
      case 'week': {
        const weekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      }
      case 'month': {
        const monthAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= monthAgo;
      }
      default:
        return true;
    }
  };

  // Verdict filter helper
  const matchesVerdictFilter = (reportVerdict: string): boolean => {
    if (verdictFilter === 'all') return true;
    const normalized = normalizeVerdict(reportVerdict);
    return normalized === verdictFilter;
  };

  // Outcome filter helper
  const matchesOutcomeFilter = (report: Report): boolean => {
    if (outcomeFilter === 'all') return true;
    const isActive = !report.outcome || report.outcome === 'pending';
    if (outcomeFilter === 'live') return isActive;
    if (outcomeFilter === 'tp') return report.outcome === 'correct';
    if (outcomeFilter === 'sl') return report.outcome === 'incorrect';
    return true;
  };

  const filteredReports = reports
    .filter(r =>
      r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
      isInDateRange(r.generatedAt) &&
      (tradeTypeFilter === 'all' || r.tradeType === tradeTypeFilter) &&
      matchesVerdictFilter(r.verdict) &&
      matchesOutcomeFilter(r)
    )
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  // Check if any filter is active
  const hasActiveFilters = searchQuery || dateFilter !== 'all' || tradeTypeFilter !== 'all' || verdictFilter !== 'all' || outcomeFilter !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setTradeTypeFilter('all');
    setVerdictFilter('all');
    setOutcomeFilter('all');
  };

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== 2026 Style Header with Glassmorphism (Teal/Red Corporate Colors) ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 dark:border-white/10 bg-gradient-to-br from-teal-50 via-white to-orange-50 dark:from-teal-900/30 dark:via-slate-900 dark:to-orange-900/20">
        {/* Animated Gradient Orbs - Teal/Red */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-500/20 dark:bg-teal-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-400/15 dark:bg-red-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

        {/* Grain Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10 p-6">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Icon with Glow Effect - Teal */}
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500/40 dark:bg-teal-500/50 rounded-xl blur-lg" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-red-500 to-teal-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer tracking-tight">My Reports</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Saved analysis reports & live tracking</p>
              </div>
            </div>

            <button
              onClick={() => fetchReports()}
              disabled={isLoading}
              className="group flex items-center gap-2 px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm text-teal-700 dark:text-white text-sm font-medium rounded-xl border border-teal-500/20 dark:border-white/10 transition-all duration-300 hover:border-teal-500/40 dark:hover:border-white/20 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 transition-transform group-hover:rotate-180 duration-500", isLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ===== 2026 Style Filters with Glassmorphism (Light/Dark Mode) ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-white/10">
        {/* Symbol Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
          />
        </div>

        {/* Date Filter - Pill Style */}
        <div className="flex bg-white dark:bg-slate-900/50 rounded-xl p-1 border border-slate-200 dark:border-white/10">
          {[
            { value: 'all', label: 'All' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value as DateFilter)}
              className={cn(
                "px-4 py-2 text-xs font-medium rounded-lg transition-all duration-300",
                dateFilter === f.value
                  ? "bg-gradient-to-r from-teal-500 to-red-400 text-white shadow-lg shadow-teal-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Trade Type Filter - Pill Style */}
        {/* Trade Type Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Type:</span>
          <div className="relative">
            <select
              value={tradeTypeFilter}
              onChange={(e) => setTradeTypeFilter(e.target.value as TradeType | 'all')}
              className="appearance-none bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All</option>
              {(Object.keys(TRADE_TYPE_CONFIG) as TradeType[]).map((type) => (
                <option key={type} value={type}>
                  {TRADE_TYPE_CONFIG[type].label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Verdict Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Verdict:</span>
          <div className="relative">
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
              className="appearance-none bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="go">GO</option>
              <option value="conditional_go">COND</option>
              <option value="wait">WAIT</option>
              <option value="avoid">AVOID</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Outcome Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
          <div className="relative">
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
              className="appearance-none bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {OUTCOME_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Results Count Badge */}
        <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
          <span className="text-xs text-slate-500 dark:text-slate-400">Showing</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {hasActiveFilters ? `${filteredReports.length}/${reports.length}` : filteredReports.length}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">reports</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-2 text-xs text-teal-500 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Reports List */}
      {error ? (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <div className="relative z-10">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Error Loading Reports</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={() => fetchReports()}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Try Again
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500/30 rounded-full blur-xl animate-pulse" />
            <RefreshCw className="relative w-10 h-10 animate-spin text-teal-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading your reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-12">
          {/* Background Effects - Teal/Red */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-400/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-red-400/20 border border-teal-500/20 dark:border-white/10 flex items-center justify-center">
                <FileText className="w-10 h-10 text-teal-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {hasActiveFilters ? 'No Matching Reports' : 'No Reports Yet'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              {hasActiveFilters
                ? 'No reports match your current filters. Try adjusting your search criteria.'
                : 'Create your first analysis report to start tracking your trades and building your performance history.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-red-400 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300"
              >
                Clear Filters
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ) : (
              <button
                onClick={() => router.push('/analyze')}
                className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-red-400 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300"
              >
                <Zap className="w-5 h-5" />
                Start Analysis
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            // Helper to check if report is active (outcome is null or 'pending')
            const isActive = !report.outcome || report.outcome === 'pending';

            // Calculate proximity to TP/SL for dynamic background
            let bgIntensity = 5; // default
            let bgColor = 'blue'; // default for active

            if (report.outcome === 'correct') {
              bgColor = 'green';
              bgIntensity = 20;
            } else if (report.outcome === 'incorrect') {
              bgColor = 'red';
              bgIntensity = 20;
            } else if (report.entryPrice && report.currentPrice && report.stopLoss && report.takeProfit1) {
              const entry = report.entryPrice;
              const current = report.currentPrice;
              const sl = report.stopLoss;
              const tp = report.takeProfit1;
              const isLong = report.direction === 'long';

              // Calculate position between SL and TP (0 = at SL, 100 = at TP)
              const totalRange = isLong ? tp - sl : sl - tp;
              const currentPos = isLong ? current - sl : sl - current;
              const positionPercent = totalRange !== 0 ? (currentPos / totalRange) * 100 : 50;

              if (positionPercent >= 50) {
                // Moving towards TP - green
                bgColor = 'green';
                // Intensity increases as it gets closer to TP (50% -> 5, 100% -> 25)
                bgIntensity = Math.round(5 + ((positionPercent - 50) / 50) * 20);
              } else {
                // Moving towards SL - red
                bgColor = 'red';
                // Intensity increases as it gets closer to SL (50% -> 5, 0% -> 25)
                bgIntensity = Math.round(5 + ((50 - positionPercent) / 50) * 20);
              }
            }

            const bgClass = `bg-${bgColor}-500/${bgIntensity}`;
            const borderClass = `border-${bgColor}-500/50`;

            return (
            <div
              key={report.id}
              className={cn(
                "border-2 rounded-xl p-4 hover:shadow-lg transition relative overflow-hidden bg-white dark:bg-transparent",
                // TP Hit = Teal, SL Hit = Coral/Red, Active = Teal
                report.outcome === 'correct' && "border-teal-500/50",
                report.outcome === 'incorrect' && "border-red-500/50",
                isActive && "border-teal-500/30"
              )}
              style={{
                background: report.outcome === 'correct'
                  ? `linear-gradient(to right, rgba(20, 184, 166, 0.05), rgba(20, 184, 166, 0.15))`
                  : report.outcome === 'incorrect'
                  ? `linear-gradient(to right, rgba(251, 146, 60, 0.05), rgba(251, 146, 60, 0.15))`
                  : `linear-gradient(to right, rgba(20, 184, 166, 0.02), rgba(20, 184, 166, 0.08))`
              }}
            >
              {/* Status Corner Ribbon - Teal/Red */}
              {isActive && (
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-3 -right-6 w-24 text-center py-0.5 bg-teal-500 text-white text-[10px] font-bold rotate-45 shadow-sm">
                    LIVE
                  </div>
                </div>
              )}
              {report.outcome === 'correct' && (
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-3 -right-6 w-24 text-center py-0.5 bg-teal-500 text-white text-[10px] font-bold rotate-45 shadow-sm">
                    TP HIT ✓
                  </div>
                </div>
              )}
              {report.outcome === 'incorrect' && (
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-3 -right-6 w-24 text-center py-0.5 bg-red-500 text-white text-[10px] font-bold rotate-45 shadow-sm">
                    SL HIT ✗
                  </div>
                </div>
              )}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Report Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <CoinIcon symbol={report.symbol} size={48} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{report.symbol}</h3>
                      {report.direction && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          report.direction === 'long'
                            ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}>
                          {report.direction === 'long' ? (
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 inline mr-1" />
                          )}
                          {report.direction.toUpperCase()}
                        </span>
                      )}
                      {/* Verdict Badge - GO/COND/WAIT/AVOID */}
                      {report.verdict && (() => {
                        const normalizedVerdict = normalizeVerdict(report.verdict);
                        const config = VERDICT_CONFIG[normalizedVerdict] || VERDICT_CONFIG.wait;
                        return (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-bold",
                            config.bg, config.text
                          )}>
                            {config.label}
                          </span>
                        );
                      })()}
                      {/* Trade Type Badge - Teal/Slate/Orange */}
                      {report.tradeType && TRADE_TYPE_CONFIG[report.tradeType] && (() => {
                        const config = TRADE_TYPE_CONFIG[report.tradeType!];
                        const Icon = config.icon;
                        return (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1",
                            config.color === 'teal' && "bg-teal-500/10 text-teal-600 dark:text-teal-400",
                            config.color === 'slate' && "bg-slate-500/10 text-slate-600 dark:text-slate-400",
                            config.color === 'amber' && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        );
                      })()}
                      {/* Analysis Method Badge - MLIS Pro */}
                      {report.method === 'mlis_pro' && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          <Layers className="w-3 h-3" />
                          MLIS
                        </span>
                      )}
                      {/* Outcome Status Badge - Teal/Red */}
                      {report.outcome === 'correct' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          TP HIT
                        </span>
                      )}
                      {report.outcome === 'incorrect' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          SL HIT
                        </span>
                      )}
                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 bg-teal-500 rounded-full animate-ping" />
                          <Timer className="w-3 h-3" />
                          LIVE TRACKING
                        </span>
                      )}
                      {/* Sample Report Badge */}
                      {report.isSample && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          SAMPLE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.generatedAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Score + Price + P/L + Distance Display */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-transparent flex-wrap justify-center sm:justify-start">
                  {/* Score as percentage - Teal/Red */}
                  <div className={cn(
                    "text-center px-2 py-1 rounded-lg min-w-[50px]",
                    report.score >= 7 ? "bg-teal-100 dark:bg-teal-500/20" :
                    report.score >= 5 ? "bg-amber-100 dark:bg-amber-500/20" : "bg-red-100 dark:bg-red-500/20"
                  )}>
                    <div className="text-[10px] text-slate-500 dark:text-muted-foreground">Score</div>
                    <div className={cn(
                      "font-bold text-sm",
                      report.score >= 7 ? "text-teal-600 dark:text-teal-400" :
                      report.score >= 5 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {(report.score * 10).toFixed(0)}%
                    </div>
                  </div>

                  {report.currentPrice && (
                    <>
                      <div className="text-slate-300 dark:text-muted-foreground/30">|</div>

                      {/* P/L Percentage - Teal/Red */}
                      <div className={cn(
                        "text-center px-2 py-1 rounded-lg min-w-[60px]",
                        (report.unrealizedPnL || 0) >= 0
                          ? "bg-teal-100 dark:bg-teal-500/20"
                          : "bg-red-100 dark:bg-red-500/20"
                      )}>
                        <div className="text-[10px] text-slate-500 dark:text-muted-foreground">P/L</div>
                        <div className={cn(
                          "font-bold text-sm",
                          (report.unrealizedPnL || 0) >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {(report.unrealizedPnL || 0) >= 0 ? '+' : ''}{(report.unrealizedPnL || 0).toFixed(2)}%
                        </div>
                      </div>

                      {/* Distance to TP - for active trades or show 100% for TP hit */}
                      {report.takeProfit1 && (
                        report.outcome === 'correct' ? (
                          // TP Hit - show 100% in teal
                          <div className="text-center px-2 py-1 rounded-lg min-w-[60px] bg-teal-100 dark:bg-teal-500/20">
                            <div className="text-[10px] text-slate-500 dark:text-muted-foreground flex items-center justify-center gap-1">
                              <Target className="w-3 h-3" />
                              TP
                            </div>
                            <div className="font-bold text-sm text-teal-600 dark:text-teal-400">
                              100%
                            </div>
                          </div>
                        ) : isActive && report.currentPrice ? (() => {
                          const current = report.currentPrice!;
                          const tp1 = report.takeProfit1!;
                          const entry = report.entryPrice || current;
                          const isLong = report.direction === 'long';

                          // Calculate progress towards TP (0% = at entry, 100% = at TP)
                          const totalDistance = isLong ? (tp1 - entry) : (entry - tp1);
                          const coveredDistance = isLong ? (current - entry) : (entry - current);

                          // Progress as percentage (can exceed 100% if price passed TP)
                          const progress = totalDistance !== 0
                            ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
                            : 0;

                          // Distance remaining to TP
                          const distanceToTP = Math.max(0, 100 - progress);

                          return (
                            <div className={cn(
                              "text-center px-2 py-1 rounded-lg min-w-[60px]",
                              progress >= 80 ? "bg-teal-100 dark:bg-teal-500/20" :
                              progress >= 50 ? "bg-amber-100 dark:bg-amber-500/20" : "bg-slate-100 dark:bg-slate-500/20"
                            )}>
                              <div className="text-[10px] text-slate-500 dark:text-muted-foreground flex items-center justify-center gap-1">
                                <Target className="w-3 h-3" />
                                TP
                              </div>
                              <div className={cn(
                                "font-bold text-sm",
                                progress >= 80 ? "text-teal-600 dark:text-teal-400" :
                                progress >= 50 ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"
                              )}>
                                {progress.toFixed(0)}%
                              </div>
                            </div>
                          );
                        })() : null
                      )}
                    </>
                  )}
                </div>

                {/* Actions - Teal/Red Theme */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-center sm:justify-end">
                  {/* Details Button */}
                  <button
                    onClick={() => router.push(`/reports/${report.id}`)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-500 transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Details</span>
                  </button>
                  {/* AI Expert Button - only show if no comment yet */}
                  {!report.aiExpertComment && report.analysisId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAskAIExpert(report); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 transition"
                      title="Ask AI Expert"
                    >
                      <Bot className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">AI Expert</span>
                    </button>
                  )}
                  {/* Email Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSendEmail(report); }}
                    className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition"
                    title="Send Email"
                  >
                    <Mail className="w-5 h-5" />
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-red-500 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
            disabled={pagination.offset === 0}
            className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500 dark:text-slate-400">
            {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
