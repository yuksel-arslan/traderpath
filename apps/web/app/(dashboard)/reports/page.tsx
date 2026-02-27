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

// Verdict configuration for badges (intelligence colors)
const VERDICT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  go: { label: 'GO', bg: 'rgba(0,245,160,0.1)', color: '#00F5A0' },
  conditional_go: { label: 'COND', bg: 'rgba(0,212,255,0.1)', color: '#00D4FF' },
  wait: { label: 'WAIT', bg: 'rgba(255,184,0,0.1)', color: '#FFB800' },
  avoid: { label: 'AVOID', bg: 'rgba(255,71,87,0.1)', color: '#FF4757' },
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
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,245,160,0.1)' }}>
              <FileText className="w-5 h-5" style={{ color: '#00F5A0' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Reports</h1>
              <p className="text-xs text-gray-500 dark:text-white/40">Analysis history &middot; Live tracking</p>
            </div>
          </div>
          <button
            onClick={() => fetchReports()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all text-gray-600 dark:text-white/60 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-xl p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Symbol Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#00F5A0]/30"
              />
            </div>

            {/* Date Filter */}
            <div className="flex bg-white dark:bg-white/[0.03] rounded-lg p-0.5 border border-gray-200 dark:border-white/[0.06]">
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
                    "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                    dateFilter === f.value
                      ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Trade Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-wider">Type</span>
              <div className="relative">
                <select
                  value={tradeTypeFilter}
                  onChange={(e) => setTradeTypeFilter(e.target.value as TradeType | 'all')}
                  className="appearance-none bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/80 text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.06] focus:ring-1 focus:ring-[#00F5A0]/30 cursor-pointer"
                >
                  <option value="all">All</option>
                  {(Object.keys(TRADE_TYPE_CONFIG) as TradeType[]).map((type) => (
                    <option key={type} value={type}>
                      {TRADE_TYPE_CONFIG[type].label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Verdict Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-wider">Verdict</span>
              <div className="relative">
                <select
                  value={verdictFilter}
                  onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                  className="appearance-none bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/80 text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.06] focus:ring-1 focus:ring-[#00F5A0]/30 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="go">GO</option>
                  <option value="conditional_go">COND</option>
                  <option value="wait">WAIT</option>
                  <option value="avoid">AVOID</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Outcome Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-wider">Status</span>
              <div className="relative">
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
                  className="appearance-none bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/80 text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.06] focus:ring-1 focus:ring-[#00F5A0]/30 cursor-pointer"
                >
                  {OUTCOME_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-wider">Sort</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-white dark:bg-white/[0.03] text-gray-700 dark:text-white/80 text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.06] focus:ring-1 focus:ring-[#00F5A0]/30 cursor-pointer"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Results Count */}
            <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.06]">
              <span className="text-xs text-gray-500 dark:text-white/40">Showing</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {hasActiveFilters ? `${filteredReports.length}/${reports.length}` : filteredReports.length}
              </span>
              <span className="text-xs text-gray-500 dark:text-white/40">reports</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-2 text-xs font-medium transition-colors"
                  style={{ color: '#00F5A0' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reports List */}
        {error ? (
          <div className="rounded-xl p-8 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,71,87,0.1)' }}>
              <XCircle className="w-6 h-6" style={{ color: '#FF4757' }} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Error Loading Reports</h3>
            <p className="text-sm text-gray-500 dark:text-white/40 mb-4">{error}</p>
            <button
              onClick={() => fetchReports()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <div className="rounded-xl p-20 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,245,160,0.1)' }}>
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#00F5A0' }} />
            </div>
            <p className="text-sm text-gray-500 dark:text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Loading your reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-xl p-10 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(0,245,160,0.1)' }}>
              <FileText className="w-6 h-6" style={{ color: '#00F5A0' }} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {hasActiveFilters ? 'No Matching Reports' : 'No Reports Yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-white/40 mb-6 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No reports match your current filters. Try adjusting your search criteria.'
                : 'Create your first analysis report to start tracking your trades and building your performance history.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => router.push('/analyze')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}
              >
                Start Analysis
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
          {filteredReports.map((report) => {
            // Helper to check if report is active (outcome is null or 'pending')
            const isActive = !report.outcome || report.outcome === 'pending';

            return (
            <div
              key={report.id}
              className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all relative overflow-hidden"
              style={
                report.outcome === 'correct'
                  ? { borderLeftWidth: '3px', borderLeftColor: '#00F5A0' }
                  : report.outcome === 'incorrect'
                  ? { borderLeftWidth: '3px', borderLeftColor: '#FF4757' }
                  : isActive
                  ? { borderLeftWidth: '3px', borderLeftColor: '#00D4FF' }
                  : {}
              }
            >
              {/* Status Badge - Top Right */}
              {isActive && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: '#00D4FF' }} />
                    LIVE
                  </span>
                </div>
              )}
              {report.outcome === 'correct' && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(0,245,160,0.1)', color: '#00F5A0' }}>
                    <CheckCircle2 className="w-3 h-3" />
                    TP HIT
                  </span>
                </div>
              )}
              {report.outcome === 'incorrect' && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(255,71,87,0.1)', color: '#FF4757' }}>
                    <XCircle className="w-3 h-3" />
                    SL HIT
                  </span>
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
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {report.symbol === 'CAPITAL_FLOW' ? 'Capital Flow Report' : report.symbol.replace(/USDT$/i, '')}
                      </h3>
                      {report.direction && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            background: report.direction === 'long' ? 'rgba(0,245,160,0.1)' : 'rgba(255,71,87,0.1)',
                            color: report.direction === 'long' ? '#00F5A0' : '#FF4757',
                          }}
                        >
                          {report.direction === 'long' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {report.direction.toUpperCase()}
                        </span>
                      )}
                      {/* Verdict Badge - GO/COND/WAIT/AVOID */}
                      {report.verdict && (() => {
                        const normalizedVerdict = normalizeVerdict(report.verdict);
                        const config = VERDICT_CONFIG[normalizedVerdict] || VERDICT_CONFIG.wait;
                        return (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: config.bg, color: config.color }}
                          >
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
                      {/* Outcome Status Badge */}
                      {report.outcome === 'correct' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(0,245,160,0.1)', color: '#00F5A0' }}>
                          <CheckCircle2 className="w-3 h-3" />
                          TP HIT
                        </span>
                      )}
                      {report.outcome === 'incorrect' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(255,71,87,0.1)', color: '#FF4757' }}>
                          <XCircle className="w-3 h-3" />
                          SL HIT
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF' }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: '#00D4FF' }} />
                          <Timer className="w-3 h-3" />
                          LIVE
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
                    <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] flex-wrap justify-center sm:justify-start">
                  {/* Score */}
                  <div className="text-center px-2 py-1 rounded-md min-w-[50px]" style={{ background: report.score >= 7 ? 'rgba(0,245,160,0.08)' : report.score >= 5 ? 'rgba(255,184,0,0.08)' : 'rgba(255,71,87,0.08)' }}>
                    <div className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">Score</div>
                    <div className="font-bold text-sm" style={{ color: report.score >= 7 ? '#00F5A0' : report.score >= 5 ? '#FFB800' : '#FF4757', fontFamily: "'JetBrains Mono', monospace" }}>
                      {(report.score * 10).toFixed(0)}%
                    </div>
                  </div>

                  {report.currentPrice && (
                    <>
                      <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.06]" />

                      {/* P/L */}
                      <div className="text-center px-2 py-1 rounded-md min-w-[60px]" style={{ background: (report.unrealizedPnL || 0) >= 0 ? 'rgba(0,245,160,0.08)' : 'rgba(255,71,87,0.08)' }}>
                        <div className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">P/L</div>
                        <div className="font-bold text-sm" style={{ color: (report.unrealizedPnL || 0) >= 0 ? '#00F5A0' : '#FF4757', fontFamily: "'JetBrains Mono', monospace" }}>
                          {(report.unrealizedPnL || 0) >= 0 ? '+' : ''}{(report.unrealizedPnL || 0).toFixed(2)}%
                        </div>
                      </div>

                      {/* Distance to TP */}
                      {report.takeProfit1 && (
                        report.outcome === 'correct' ? (
                          <div className="text-center px-2 py-1 rounded-md min-w-[60px]" style={{ background: 'rgba(0,245,160,0.08)' }}>
                            <div className="text-[10px] text-gray-400 dark:text-white/30 flex items-center justify-center gap-1">
                              <Target className="w-3 h-3" />
                              TP
                            </div>
                            <div className="font-bold text-sm" style={{ color: '#00F5A0', fontFamily: "'JetBrains Mono', monospace" }}>
                              100%
                            </div>
                          </div>
                        ) : isActive && report.currentPrice ? (() => {
                          const current = report.currentPrice!;
                          const tp1 = report.takeProfit1!;
                          const entry = report.entryPrice || current;
                          const isLong = report.direction === 'long';

                          const totalDistance = isLong ? (tp1 - entry) : (entry - tp1);
                          const coveredDistance = isLong ? (current - entry) : (entry - current);
                          const progress = totalDistance !== 0
                            ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
                            : 0;

                          const progressColor = progress >= 80 ? '#00F5A0' : progress >= 50 ? '#FFB800' : '#64748b';

                          return (
                            <div className="text-center px-2 py-1 rounded-md min-w-[60px]" style={{ background: progress >= 80 ? 'rgba(0,245,160,0.08)' : progress >= 50 ? 'rgba(255,184,0,0.08)' : 'rgba(100,116,139,0.08)' }}>
                              <div className="text-[10px] text-gray-400 dark:text-white/30 flex items-center justify-center gap-1">
                                <Target className="w-3 h-3" />
                                TP
                              </div>
                              <div className="font-bold text-sm" style={{ color: progressColor, fontFamily: "'JetBrains Mono', monospace" }}>
                                {progress.toFixed(0)}%
                              </div>
                            </div>
                          );
                        })() : null
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-center sm:justify-end">
                  {/* Details */}
                  <button
                    onClick={() => router.push(
                      report.symbol === 'CAPITAL_FLOW'
                        ? `/reports/capital-flow/${report.id}`
                        : `/analyze/details/${report.id}`
                    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] text-gray-600 dark:text-white/60 bg-white dark:bg-white/[0.03]"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Details</span>
                  </button>
                  {/* AI Expert */}
                  {!report.aiExpertComment && report.analysisId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAskAIExpert(report); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] text-gray-600 dark:text-white/60 bg-white dark:bg-white/[0.03]"
                      title="Ask AI Expert"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">AI Expert</span>
                    </button>
                  )}
                  {/* Email */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSendEmail(report); }}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
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
          <div className="flex justify-center items-center gap-2 pt-2">
            <button
              onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
              disabled={pagination.offset === 0}
              className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg hover:border-gray-300 dark:hover:border-white/[0.12] transition-all text-gray-600 dark:text-white/60 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-400 dark:text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg hover:border-gray-300 dark:hover:border-white/[0.12] transition-all text-gray-600 dark:text-white/60 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
