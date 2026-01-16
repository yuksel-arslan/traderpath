'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CoinIcon } from '../../../components/common/CoinIcon';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import { TradePlanChart } from '../../../components/charts/TradePlanChart';
import {
  FileText,
  Download,
  Trash2,
  Clock,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  LineChart,
  Eye,
  CheckCircle2,
  XCircle,
  Timer,
  DollarSign,
  X,
  Target,
  Shield,
  BarChart3,
  Percent,
  Bot,
  MessageSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Zap,
  Activity,
  Calendar,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// Trade type definitions
type TradeType = 'scalping' | 'dayTrade' | 'swing';

const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalping', icon: Zap, color: 'purple' },
  dayTrade: { label: 'Day Trade', icon: Activity, color: 'blue' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
};

interface Report {
  id: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string | null;
  tradeType?: TradeType;
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

// Trade Plan Levels for Chart
interface TradePlanLevels {
  entryPrice?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  direction?: string;
  currentPrice?: number;
}

// TradingView Widget Component with Trade Plan Overlay
// Script caching for better performance
let tradingViewScriptLoaded = false;
let tradingViewScriptLoading = false;
const scriptLoadCallbacks: (() => void)[] = [];

function loadTradingViewScript(callback: () => void) {
  if (tradingViewScriptLoaded && typeof (window as any).TradingView !== 'undefined') {
    callback();
    return;
  }

  scriptLoadCallbacks.push(callback);

  if (tradingViewScriptLoading) return;

  tradingViewScriptLoading = true;
  const script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/tv.js';
  script.async = true;
  script.onload = () => {
    tradingViewScriptLoaded = true;
    tradingViewScriptLoading = false;
    scriptLoadCallbacks.forEach(cb => cb());
    scriptLoadCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

function TradingViewChart({
  symbol,
  interval,
  tradePlan
}: {
  symbol: string;
  interval: string;
  tradePlan?: TradePlanLevels;
}) {
  const containerId = `tradingview_${symbol}_${interval}`;

  useEffect(() => {
    loadTradingViewScript(() => {
      if (typeof (window as any).TradingView !== 'undefined') {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
          interval: interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#1e293b',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
          hide_side_toolbar: true,
          allow_symbol_change: false,
          studies: [],
        });
      }
    });

    return () => {
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = '';
    };
  }, [symbol, interval, containerId]);

  return (
    <div className="relative w-full h-full">
      <div id={containerId} className="w-full h-full" />

      {/* Trade Plan Overlay - Right Side */}
      {tradePlan && (tradePlan.entryPrice || tradePlan.stopLoss || tradePlan.takeProfit1) && (
        <div className="absolute right-2 top-12 flex flex-col gap-1 z-10">
          {/* TP3 */}
          {tradePlan.takeProfit3 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/90 rounded text-[10px] font-bold text-white shadow-lg">
              <span>TP3</span>
              <span className="font-mono">${tradePlan.takeProfit3.toFixed(4)}</span>
            </div>
          )}
          {/* TP2 */}
          {tradePlan.takeProfit2 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/80 rounded text-[10px] font-bold text-white shadow-lg">
              <span>TP2</span>
              <span className="font-mono">${tradePlan.takeProfit2.toFixed(4)}</span>
            </div>
          )}
          {/* TP1 */}
          {tradePlan.takeProfit1 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/70 rounded text-[10px] font-bold text-white shadow-lg">
              <span>TP1</span>
              <span className="font-mono">${tradePlan.takeProfit1.toFixed(4)}</span>
            </div>
          )}
          {/* Current Price */}
          {tradePlan.currentPrice && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/90 rounded text-[10px] font-bold text-white shadow-lg">
              <span>NOW</span>
              <span className="font-mono">${tradePlan.currentPrice.toFixed(4)}</span>
            </div>
          )}
          {/* Entry */}
          {tradePlan.entryPrice && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/90 rounded text-[10px] font-bold text-black shadow-lg">
              <span>ENTRY</span>
              <span className="font-mono">${tradePlan.entryPrice.toFixed(4)}</span>
            </div>
          )}
          {/* Stop Loss */}
          {tradePlan.stopLoss && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/90 rounded text-[10px] font-bold text-white shadow-lg">
              <span>SL</span>
              <span className="font-mono">${tradePlan.stopLoss.toFixed(4)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ReportStats {
  total: number;
  active: number;
  closed: number;
  tpHits: number;
  slHits: number;
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
    stats: ReportStats;
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState<TradeType>('swing');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'pnl' | 'tp'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const [stats, setStats] = useState<ReportStats>({ total: 0, active: 0, closed: 0, tpHits: 0, slHits: 0 });
  const [chartModal, setChartModal] = useState<{ isOpen: boolean; report: Report | null }>({ isOpen: false, report: null });

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(`/api/reports?limit=${pagination.limit}&offset=${pagination.offset}`);

      if (response.ok) {
        const data: ReportsResponse = await response.json();
        if (data.success) {
          setReports(data.data.reports);
          setPagination(data.data.pagination);
          if (data.data.stats) {
            setStats(data.data.stats);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
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

  const handleDownload = async (report: Report) => {
    try {
      // Fetch full report data
      const response = await authFetch(`/api/reports/${report.id}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.reportData) {
          // Dynamic import PDF generator
          const { generateAnalysisReport } = await import('../../../components/reports/AnalysisReport');
          await generateAnalysisReport(data.data.reportData);
        }
      }
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report');
    }
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

  const filteredReports = reports
    .filter(r =>
      r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filter === 'all' || r.direction === filter) &&
      r.tradeType === tradeTypeFilter
    )
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'pnl':
          comparison = (a.unrealizedPnL || 0) - (b.unrealizedPnL || 0);
          break;
        case 'tp':
          comparison = calculateTpProgress(a) - calculateTpProgress(b);
          break;
        case 'date':
        default:
          comparison = new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Reports</h1>
          <p className="text-gray-500 dark:text-slate-400">Your saved analysis reports</p>
        </div>
        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Search, Filters, and Sorting */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search coin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          {/* Direction Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border hover:bg-accent"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Trade Type Filter */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(TRADE_TYPE_CONFIG) as TradeType[]).map((type) => {
              const config = TRADE_TYPE_CONFIG[type];
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setTradeTypeFilter(type)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition text-sm",
                    tradeTypeFilter === type
                      ? `bg-${config.color}-500 text-white`
                      : "bg-card border hover:bg-accent"
                  )}
                  style={tradeTypeFilter === type ? {
                    backgroundColor: config.color === 'purple' ? '#a855f7' : config.color === 'blue' ? '#3b82f6' : '#f59e0b'
                  } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sorting Options */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <ArrowUpDown className="w-4 h-4" />
            Sort by:
          </span>
          {[
            { value: 'date', label: 'Date', icon: Clock },
            { value: 'score', label: 'Score', icon: BarChart3 },
            { value: 'pnl', label: 'P/L', icon: DollarSign },
            { value: 'tp', label: 'TP Progress', icon: Target },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => {
                if (sortBy === s.value) {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy(s.value as typeof sortBy);
                  setSortOrder('desc');
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition",
                sortBy === s.value
                  ? "bg-emerald-500 text-white"
                  : "bg-card border hover:bg-accent"
              )}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
              {sortBy === s.value && (
                sortOrder === 'desc'
                  ? <ArrowDown className="w-3.5 h-3.5" />
                  : <ArrowUp className="w-3.5 h-3.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
          <p className="text-muted-foreground mb-4">
            You can create reports from the analysis page
          </p>
          <button
            onClick={() => router.push('/analyze')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Start Analysis
          </button>
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
                "border-2 rounded-lg p-4 hover:shadow-lg transition relative overflow-hidden",
                // TP Hit = Green, SL Hit = Red, Active = Blue
                report.outcome === 'correct' && "border-green-500/50",
                report.outcome === 'incorrect' && "border-red-500/50",
                isActive && "border-blue-500/50"
              )}
              style={{
                background: report.outcome === 'correct'
                  ? `linear-gradient(to right, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.20))`
                  : report.outcome === 'incorrect'
                  ? `linear-gradient(to right, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.20))`
                  : `linear-gradient(to right, rgba(59, 130, 246, 0.03), rgba(59, 130, 246, 0.12))`
              }}
            >
              {/* Status Corner Ribbon */}
              {isActive && (
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-3 -right-6 w-24 text-center py-0.5 bg-blue-500 text-white text-[10px] font-bold rotate-45 shadow-sm">
                    LIVE
                  </div>
                </div>
              )}
              {report.outcome === 'correct' && (
                <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                  <div className="absolute top-3 -right-6 w-24 text-center py-0.5 bg-green-500 text-white text-[10px] font-bold rotate-45 shadow-sm">
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
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        )}>
                          {report.direction === 'long' ? (
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 inline mr-1" />
                          )}
                          {report.direction.toUpperCase()}
                        </span>
                      )}
                      {/* Trade Type Badge */}
                      {report.tradeType && TRADE_TYPE_CONFIG[report.tradeType] && (() => {
                        const config = TRADE_TYPE_CONFIG[report.tradeType!];
                        const Icon = config.icon;
                        return (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1",
                            config.color === 'purple' && "bg-purple-500/10 text-purple-500",
                            config.color === 'blue' && "bg-blue-500/10 text-blue-500",
                            config.color === 'amber' && "bg-amber-500/10 text-amber-500"
                          )}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        );
                      })()}
                      {/* Outcome Status Badge */}
                      {report.outcome === 'correct' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          TP HIT
                        </span>
                      )}
                      {report.outcome === 'incorrect' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-500 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          SL HIT
                        </span>
                      )}
                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
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
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-100 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-transparent flex-wrap justify-center sm:justify-start">
                  {/* Score as percentage */}
                  <div className={cn(
                    "text-center px-2 py-1 rounded-lg min-w-[50px]",
                    report.score >= 7 ? "bg-green-100 dark:bg-green-500/20" :
                    report.score >= 5 ? "bg-yellow-100 dark:bg-yellow-500/20" : "bg-red-100 dark:bg-red-500/20"
                  )}>
                    <div className="text-[10px] text-gray-500 dark:text-muted-foreground">Score</div>
                    <div className={cn(
                      "font-bold text-sm",
                      report.score >= 7 ? "text-green-600 dark:text-green-400" :
                      report.score >= 5 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {(report.score * 10).toFixed(0)}%
                    </div>
                  </div>

                  {report.currentPrice && (
                    <>
                      <div className="text-muted-foreground/30">|</div>

                      {/* P/L Percentage */}
                      <div className={cn(
                        "text-center px-2 py-1 rounded-lg min-w-[60px]",
                        (report.unrealizedPnL || 0) >= 0
                          ? "bg-green-100 dark:bg-green-500/20"
                          : "bg-red-100 dark:bg-red-500/20"
                      )}>
                        <div className="text-[10px] text-gray-500 dark:text-muted-foreground">P/L</div>
                        <div className={cn(
                          "font-bold text-sm",
                          (report.unrealizedPnL || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {(report.unrealizedPnL || 0) >= 0 ? '+' : ''}{(report.unrealizedPnL || 0).toFixed(2)}%
                        </div>
                      </div>

                      {/* Distance to TP - for active trades or show 100% for TP hit */}
                      {report.takeProfit1 && (
                        report.outcome === 'correct' ? (
                          // TP Hit - show 100% in green
                          <div className="text-center px-2 py-1 rounded-lg min-w-[60px] bg-green-100 dark:bg-green-500/20">
                            <div className="text-[10px] text-gray-500 dark:text-muted-foreground flex items-center justify-center gap-1">
                              <Target className="w-3 h-3" />
                              TP
                            </div>
                            <div className="font-bold text-sm text-green-600 dark:text-green-400">
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
                              progress >= 80 ? "bg-green-100 dark:bg-green-500/20" :
                              progress >= 50 ? "bg-yellow-100 dark:bg-yellow-500/20" : "bg-blue-100 dark:bg-blue-500/20"
                            )}>
                              <div className="text-[10px] text-gray-500 dark:text-muted-foreground flex items-center justify-center gap-1">
                                <Target className="w-3 h-3" />
                                TP
                              </div>
                              <div className={cn(
                                "font-bold text-sm",
                                progress >= 80 ? "text-green-600 dark:text-green-400" :
                                progress >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"
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

                {/* Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-center sm:justify-end">
                  {/* Chart Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setChartModal({ isOpen: true, report }); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-500 transition"
                    title="View Chart"
                  >
                    <LineChart className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Chart</span>
                  </button>
                  {/* Details Button */}
                  <button
                    onClick={() => router.push(`/reports/${report.id}`)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Details</span>
                  </button>
                  {/* AI Expert Button - only show if no comment yet */}
                  {!report.aiExpertComment && report.analysisId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAskAIExpert(report); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-500 transition"
                      title="Ask AI Expert"
                    >
                      <Bot className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">AI Expert</span>
                    </button>
                  )}
                  {/* Download Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(report); }}
                    className="p-2 rounded-lg hover:bg-accent transition"
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition"
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
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
            disabled={pagination.offset === 0}
            className="px-4 py-2 bg-card border rounded-lg hover:bg-accent transition disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-muted-foreground">
            {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="px-4 py-2 bg-card border rounded-lg hover:bg-accent transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-400">
            <p className="font-medium text-blue-600 dark:text-blue-500 mb-1">Live Tracking</p>
            <p>
              Reports are tracked live. When TP or SL is hit, the trade automatically closes.
              Click the Chart button to view multi-timeframe analysis.
            </p>
          </div>
        </div>
      </div>

      {/* TradingView Chart Modal - 4 Panel Multi-Timeframe */}
      {chartModal.isOpen && chartModal.report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-card border rounded-xl w-full sm:w-[95vw] h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b bg-gray-100 dark:bg-slate-900/50 gap-3 sm:gap-0">
              <div className="flex items-center gap-4">
                <img
                  src={getCoinIcon(chartModal.report.symbol)}
                  alt={chartModal.report.symbol}
                  className="w-10 h-10 rounded-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_COIN_ICON;
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{chartModal.report.symbol}/USDT</h2>
                    {chartModal.report.direction && (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        chartModal.report.direction === 'long'
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      )}>
                        {chartModal.report.direction === 'long' ? (
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 inline mr-1" />
                        )}
                        {chartModal.report.direction.toUpperCase()}
                      </span>
                    )}
                    {/* Status Badge */}
                    {chartModal.report.outcome === 'correct' && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        TP HIT
                      </span>
                    )}
                    {chartModal.report.outcome === 'incorrect' && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-500 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        SL HIT
                      </span>
                    )}
                    {!chartModal.report.outcome && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-500 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Multi-Timeframe Analysis</p>
                </div>
              </div>

              {/* Trade Plan Summary - Hidden on mobile, shown on larger screens */}
              <div className="hidden md:flex items-center gap-2 lg:gap-4 flex-wrap">
                {/* Entry Price */}
                {chartModal.report.entryPrice && (
                  <div className="text-center px-3 py-1.5 bg-gray-200 dark:bg-slate-800/50 rounded-lg">
                    <div className="text-[10px] text-gray-500 dark:text-muted-foreground">Entry</div>
                    <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">${chartModal.report.entryPrice.toFixed(4)}</div>
                  </div>
                )}

                {/* Stop Loss */}
                {chartModal.report.stopLoss && (
                  <div className="text-center px-3 py-1.5 bg-red-100 dark:bg-red-500/10 rounded-lg border border-red-300 dark:border-red-500/30">
                    <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                      <Shield className="w-3 h-3" />
                      SL
                    </div>
                    <div className="font-mono font-bold text-sm text-red-600 dark:text-red-400">${chartModal.report.stopLoss.toFixed(4)}</div>
                  </div>
                )}

                {/* Take Profits */}
                {chartModal.report.takeProfit1 && (
                  <div className="flex gap-1.5">
                    <div className="text-center px-2 py-1.5 bg-green-100 dark:bg-green-500/10 rounded-lg border border-green-300 dark:border-green-500/30">
                      <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                        <Target className="w-3 h-3" />
                        TP1
                      </div>
                      <div className="font-mono font-bold text-sm text-green-600 dark:text-green-400">${chartModal.report.takeProfit1.toFixed(4)}</div>
                    </div>
                    {chartModal.report.takeProfit2 && (
                      <div className="text-center px-2 py-1.5 bg-green-100 dark:bg-green-500/10 rounded-lg border border-green-300 dark:border-green-500/30">
                        <div className="text-[10px] text-green-600 dark:text-green-400">TP2</div>
                        <div className="font-mono font-bold text-sm text-green-600 dark:text-green-400">${chartModal.report.takeProfit2.toFixed(4)}</div>
                      </div>
                    )}
                    {chartModal.report.takeProfit3 && (
                      <div className="text-center px-2 py-1.5 bg-green-100 dark:bg-green-500/10 rounded-lg border border-green-300 dark:border-green-500/30">
                        <div className="text-[10px] text-green-600 dark:text-green-400">TP3</div>
                        <div className="font-mono font-bold text-sm text-green-600 dark:text-green-400">${chartModal.report.takeProfit3.toFixed(4)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* P/L */}
                {chartModal.report.unrealizedPnL !== undefined && (
                  <div className={cn(
                    "text-center px-3 py-1.5 rounded-lg font-bold",
                    chartModal.report.unrealizedPnL >= 0
                      ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                  )}>
                    <div className="text-[10px]">P/L</div>
                    <div className="flex items-center gap-1 text-sm">
                      {chartModal.report.unrealizedPnL >= 0 ? '+' : ''}{chartModal.report.unrealizedPnL.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setChartModal({ isOpen: false, report: null })}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition ml-auto sm:ml-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 2-Panel Chart Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-slate-900 overflow-y-auto">
              {/* 15m Chart - Left (with Trade Plan lines) */}
              <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-slate-900/90 rounded text-sm font-medium text-purple-400">
                  15m • Trade Plan
                </div>
                <TradePlanChart
                  symbol={chartModal.report.symbol}
                  interval="15"
                  tradePlan={{
                    entryPrice: chartModal.report.entryPrice,
                    stopLoss: chartModal.report.stopLoss,
                    takeProfit1: chartModal.report.takeProfit1,
                    takeProfit2: chartModal.report.takeProfit2,
                    takeProfit3: chartModal.report.takeProfit3,
                    direction: chartModal.report.direction || undefined,
                    currentPrice: chartModal.report.currentPrice,
                  }}
                />
              </div>

              {/* TradingView Chart - Right */}
              <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                <TradingViewChart
                  symbol={chartModal.report.symbol}
                  interval="60"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
