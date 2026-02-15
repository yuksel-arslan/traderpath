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
  Globe,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// Trade type definitions
type TradeType = 'scalping' | 'dayTrade' | 'swing' | 'capital_flow';

const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalping', icon: Zap, color: 'teal' },
  dayTrade: { label: 'Day Trade', icon: Activity, color: 'slate' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
  capital_flow: { label: 'Capital Flow', icon: Globe, color: 'blue' },
};

// Verdict configuration for badges
const VERDICT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  go: { label: 'GO', bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400' },
  conditional_go: { label: 'COND', bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
  wait: { label: 'WAIT', bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  avoid: { label: 'AVOID', bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400' },
};

// Helper to normalize verdict string
// NOTE: 'long'/'short' are DIRECTIONS, not verdicts - they should NOT be treated as 'go'
function normalizeVerdict(verdict: string): string {
  const v = (verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
  if (v === 'go') return 'go';
  if (v === 'conditional_go' || v === 'conditionalgo' || v === 'cond' || v === 'conditional') return 'conditional_go';
  if (v === 'avoid' || v === 'no_go' || v === 'nogo') return 'avoid';
  if (v === 'wait') return 'wait';
  // Fallback: try to determine from the string content
  if (v.includes('go') && !v.includes('avoid') && !v.includes('nogo')) return 'go';
  if (v.includes('avoid') || v.includes('nogo')) return 'avoid';
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
  downloadCount?: number;
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
  // For analysis history compatibility
  interval?: string;
  hasTradePlan?: boolean;
  creditsSpent?: number;
  createdAt?: string;
}

interface AnalysisHistoryResponse {
  success: boolean;
  data: {
    analyses: Array<{
      id: string;
      symbol: string;
      interval: string;
      totalScore: number | null;
      verdict: string;
      hasTradePlan: boolean;
      direction: string | null;
      entryPrice: number | null;
      stopLoss: number | null;
      takeProfit1: number | null;
      takeProfit2: number | null;
      takeProfit3: number | null;
      creditsSpent: number;
      createdAt: string;
      expiresAt: string | null;
    }>;
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
  { value: 'all', label: 'All', color: 'text-neutral-600 dark:text-neutral-300' },
  { value: 'live', label: 'LIVE', color: 'text-blue-500' },
  { value: 'tp', label: 'TP HIT', color: 'text-teal-500' },
  { value: 'sl', label: 'SL HIT', color: 'text-red-500' },
];

// Sort options
type SortOption = 'time_desc' | 'time_asc' | 'pnl_desc' | 'pnl_asc' | 'score_desc' | 'score_asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'time_desc', label: 'Newest' },
  { value: 'time_asc', label: 'Oldest' },
  { value: 'pnl_desc', label: 'P/L ↓' },
  { value: 'pnl_asc', label: 'P/L ↑' },
  { value: 'score_desc', label: 'Score ↓' },
  { value: 'score_asc', label: 'Score ↑' },
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
  const [sortBy, setSortBy] = useState<SortOption>('time_desc');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });

  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch from analysis history instead of reports
      const response = await authFetch(`/api/analysis/history?limit=${pagination.limit}&offset=${pagination.offset}`);

      if (response.ok) {
        const data: AnalysisHistoryResponse = await response.json();
        if (data.success) {
          // Transform analysis data to Report format
          const transformedReports: Report[] = data.data.analyses.map(analysis => ({
            id: analysis.id,
            symbol: analysis.symbol,
            verdict: analysis.verdict || 'N/A',
            score: analysis.totalScore ? Number(analysis.totalScore) : 0, // Score is already 0-10 scale from backend
            direction: analysis.direction,
            interval: analysis.interval,
            hasTradePlan: analysis.hasTradePlan,
            entryPrice: analysis.entryPrice || undefined,
            stopLoss: analysis.stopLoss || undefined,
            takeProfit1: analysis.takeProfit1 || undefined,
            takeProfit2: analysis.takeProfit2 || undefined,
            takeProfit3: analysis.takeProfit3 || undefined,
            creditsSpent: analysis.creditsSpent,
            generatedAt: analysis.createdAt,
            expiresAt: analysis.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            analysisId: analysis.id, // Analysis ID is the same as report ID in this case
            createdAt: analysis.createdAt,
          }));
          setReports(transformedReports);
          setPagination(data.data.pagination);
        } else {
          setError('Failed to load analyses. Please try again.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData?.error?.message || 'Failed to load analyses. Please refresh the page.');
      }
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
      setError('Connection error. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [pagination.offset]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
      // Delete from analysis table
      const response = await authFetch(`/api/analysis/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReports(reports.filter(r => r.id !== id));
      } else {
        console.error('Failed to delete analysis');
      }
    } catch (error) {
      console.error('Failed to delete analysis:', error);
    }
  };

  // Send report via email - redirects to analysis details page for full screenshot
  const handleSendEmail = (report: Report) => {
    // Redirect to analysis details page with email=true parameter
    // The details page will capture the full screenshot and send the email
    router.push(`/analyze/details/${report.id}?email=true`);
  };

  // Navigate to AI Expert with report context
  const handleAskAIExpert = async (report: Report) => {
    if (!report.analysisId) {
      alert('Analysis ID not found for this report');
      return;
    }

    try {
      // Fetch full analysis data
      const response = await authFetch(`/api/analysis/${report.analysisId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const analysis = data.data;

          // Extract step results
          const step1 = (analysis.step1Result || {}) as Record<string, any>;
          const step2 = (analysis.step2Result || {}) as Record<string, any>;
          const step3 = (analysis.step3Result || {}) as Record<string, any>;
          const step4 = (analysis.step4Result || {}) as Record<string, any>;
          const step5 = (analysis.step5Result || {}) as Record<string, any>;
          const step6 = (analysis.step6Result || {}) as Record<string, any>;
          const step7 = (analysis.step7Result || {}) as Record<string, any>;

          // Build comprehensive context
          const contextMessage = `I would like your expert opinion on this analysis:

[${report.symbol}/USDT ANALYSIS SUMMARY]
Date: ${report.generatedAt}
Score: ${(report.score * 10).toFixed(0)}/100
Direction: ${report.direction?.toUpperCase() || 'N/A'}

[STEP 1: Market Pulse]
Fear & Greed: ${step1.fearGreedIndex || 'N/A'} (${step1.fearGreedLabel || 'N/A'})
BTC Dominance: ${step1.btcDominance?.toFixed?.(1) || step1.btcDominance || 'N/A'}%

[STEP 2: Asset Scanner]
Price: $${step2.currentPrice || 'N/A'}
RSI: ${step2.indicators?.rsi?.toFixed?.(0) || step2.indicators?.rsi || 'N/A'}

[STEP 3: Safety Check]
Risk Level: ${step3.riskLevel || 'N/A'}

[STEP 4: Timing]
Trade Now: ${step4.tradeNow ? 'Yes' : 'No'}

[STEP 5: Trade Plan]
Entry: $${step5.averageEntry || report.entryPrice || 'N/A'}
Stop Loss: $${step5.stopLoss?.price || report.stopLoss || 'N/A'}
Take Profit: $${step5.takeProfits?.[0]?.price || report.takeProfit1 || 'N/A'}

[STEP 6: Trap Check]
Bull Trap: ${step6.traps?.bullTrap ? 'Yes' : 'No'}
Bear Trap: ${step6.traps?.bearTrap ? 'Yes' : 'No'}

[STEP 7: Final Verdict]
Decision: ${step7.verdict?.action || report.verdict}

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
    // Guard: verdict could be non-string from API response
    const v = typeof verdict === 'string' ? verdict.toLowerCase() : '';
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
      // Guard: r.symbol could be undefined from API
      (r.symbol || '').toLowerCase().includes((searchQuery || '').toLowerCase()) &&
      isInDateRange(r.generatedAt) &&
      (tradeTypeFilter === 'all' || r.tradeType === tradeTypeFilter) &&
      matchesVerdictFilter(r.verdict) &&
      matchesOutcomeFilter(r)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'time_desc':
          return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
        case 'time_asc':
          return new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
        case 'pnl_desc':
          return (b.unrealizedPnL ?? -Infinity) - (a.unrealizedPnL ?? -Infinity);
        case 'pnl_asc':
          return (a.unrealizedPnL ?? Infinity) - (b.unrealizedPnL ?? Infinity);
        case 'score_desc':
          return (b.score ?? -Infinity) - (a.score ?? -Infinity);
        case 'score_asc':
          return (a.score ?? Infinity) - (b.score ?? Infinity);
        default:
          return 0;
      }
    });

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
                REPORTS
              </span>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
                Analysis history · Live tracking
              </span>
            </div>
            <button
              onClick={() => fetchReports()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-500 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mb-4">
        {/* Symbol Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/50"
          />
        </div>

        {/* Date Filter */}
        <div className="flex bg-white dark:bg-neutral-950 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-800">
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
                "px-2.5 py-1 text-[11px] font-sans rounded-md transition-colors",
                dateFilter === f.value
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Trade Type Filter */}
        {/* Trade Type Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Type:</span>
          <div className="relative">
            <select
              value={tradeTypeFilter}
              onChange={(e) => setTradeTypeFilter(e.target.value as TradeType | 'all')}
              className="appearance-none bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All</option>
              {(Object.keys(TRADE_TYPE_CONFIG) as TradeType[]).map((type) => (
                <option key={type} value={type}>
                  {TRADE_TYPE_CONFIG[type].label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Verdict Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Verdict:</span>
          <div className="relative">
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
              className="appearance-none bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="go">GO</option>
              <option value="conditional_go">COND</option>
              <option value="wait">WAIT</option>
              <option value="avoid">AVOID</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Outcome Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Status:</span>
          <div className="relative">
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
              className="appearance-none bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {OUTCOME_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Sort:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-200 text-xs font-medium pl-3 pr-8 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Results Count Badge */}
        <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Showing</span>
          <span className="text-sm font-bold text-neutral-900 dark:text-white">
            {hasActiveFilters ? `${filteredReports.length}/${reports.length}` : filteredReports.length}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">reports</span>
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
        <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-900/20 p-8 text-center">
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
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Loading your reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-12">
          {/* Background Effects - Teal/Red */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-400/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-teal-500/20 rounded-xl blur-xl" />
              <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-teal-500/20 to-red-400/20 border border-teal-500/20 dark:border-white/10 flex items-center justify-center">
                <FileText className="w-10 h-10 text-teal-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
              {hasActiveFilters ? 'No Matching Reports' : 'No Reports Yet'}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
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
                "border rounded-xl p-4 hover:shadow-lg transition-all duration-150 relative overflow-hidden bg-white dark:bg-white/[0.02] backdrop-blur-sm",
                report.outcome === 'correct' && "border-teal-500/30",
                report.outcome === 'incorrect' && "border-red-500/30",
                isActive && "border-white/10 dark:border-white/[0.06]"
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
                  {report.symbol === 'CAPITAL_FLOW' ? (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shrink-0">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <CoinIcon symbol={report.symbol} size={48} className="shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">
                        {report.symbol === 'CAPITAL_FLOW' ? 'Capital Flow Report' : report.symbol}
                      </h3>
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
                            config.color === 'slate' && "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
                            config.color === 'amber' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            config.color === 'blue' && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
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
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-neutral-100 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800 flex-wrap justify-center sm:justify-start">
                  {/* Score as percentage - Teal/Red */}
                  <div className={cn(
                    "text-center px-2 py-1 rounded-lg min-w-[50px]",
                    report.score >= 7 ? "bg-teal-100 dark:bg-teal-500/20" :
                    report.score >= 5 ? "bg-amber-100 dark:bg-amber-500/20" : "bg-red-100 dark:bg-red-500/20"
                  )}>
                    <div className="text-[10px] text-neutral-500 dark:text-muted-foreground">Score</div>
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
                      <div className="text-neutral-300 dark:text-muted-foreground/30">|</div>

                      {/* P/L Percentage - Teal/Red */}
                      <div className={cn(
                        "text-center px-2 py-1 rounded-lg min-w-[60px]",
                        (report.unrealizedPnL || 0) >= 0
                          ? "bg-teal-100 dark:bg-teal-500/20"
                          : "bg-red-100 dark:bg-red-500/20"
                      )}>
                        <div className="text-[10px] text-neutral-500 dark:text-muted-foreground">P/L</div>
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
                            <div className="text-[10px] text-neutral-500 dark:text-muted-foreground flex items-center justify-center gap-1">
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
                              progress >= 50 ? "bg-amber-100 dark:bg-amber-500/20" : "bg-neutral-100 dark:bg-neutral-500/20"
                            )}>
                              <div className="text-[10px] text-neutral-500 dark:text-muted-foreground flex items-center justify-center gap-1">
                                <Target className="w-3 h-3" />
                                TP
                              </div>
                              <div className={cn(
                                "font-bold text-sm",
                                progress >= 80 ? "text-teal-600 dark:text-teal-400" :
                                progress >= 50 ? "text-amber-600 dark:text-amber-400" : "text-neutral-500 dark:text-neutral-400"
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
                    onClick={() => router.push(
                      report.symbol === 'CAPITAL_FLOW'
                        ? `/reports/capital-flow/${report.id}`
                        : `/analyze/details/${report.id}`
                    )}
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
            className="px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500 dark:text-neutral-400">
            {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition disabled:opacity-50"
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
