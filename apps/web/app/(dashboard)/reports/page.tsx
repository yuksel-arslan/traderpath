'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CoinIcon } from '../../../components/common/CoinIcon';
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
  Percent
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Report {
  id: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string | null;
  generatedAt: string;
  expiresAt: string;
  downloadCount: number;
  // Live tracking fields
  outcome?: 'correct' | 'incorrect' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
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
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
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
    };
    document.head.appendChild(script);

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

// Timeframe options for TradingView
const TIMEFRAMES = [
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: '240', label: '4h' },
  { value: 'D', label: '1D' },
];

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const [chartModal, setChartModal] = useState<{ isOpen: boolean; report: Report | null }>({ isOpen: false, report: null });
  const [tvTimeframe, setTvTimeframe] = useState('60'); // Default 1h for TradingView

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/reports?limit=${pagination.limit}&offset=${pagination.offset}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data: ReportsResponse = await response.json();
        if (data.success) {
          setReports(data.data.reports);
          setPagination(data.data.pagination);
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
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
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
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch full report data
      const response = await fetch(`/api/reports/${report.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

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

  const filteredReports = reports
    .filter(r =>
      r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filter === 'all' || r.direction === filter)
    );

  // Calculate report statistics
  // Note: outcome can be null, 'pending', 'correct', or 'incorrect'
  const totalReports = pagination.total;
  const activeReports = reports.filter(r => !r.outcome || r.outcome === 'pending').length;
  const closedReports = reports.filter(r => r.outcome === 'correct' || r.outcome === 'incorrect').length;
  const tpHits = reports.filter(r => r.outcome === 'correct').length;
  const slHits = reports.filter(r => r.outcome === 'incorrect').length;
  const longReports = reports.filter(r => r.direction === 'long').length;
  const shortReports = reports.filter(r => r.direction === 'short').length;
  const accuracy = closedReports > 0 ? ((tpHits / closedReports) * 100).toFixed(1) : '0';

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

      {/* ===== Statistics Header ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Reports */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50 text-center">
          <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalReports}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Total</div>
        </div>

        {/* Active */}
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30 text-center">
          <Timer className="w-5 h-5 text-blue-500 dark:text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeReports}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Active</div>
        </div>

        {/* Closed */}
        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50 text-center">
          <BarChart3 className="w-5 h-5 text-gray-500 dark:text-slate-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{closedReports}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Closed</div>
        </div>

        {/* TP Hits */}
        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/30 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{tpHits}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">TP Hits</div>
        </div>

        {/* SL Hits */}
        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30 text-center">
          <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{slHits}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">SL Hits</div>
        </div>

        {/* Long */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-500/30 text-center">
          <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{longReports}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Long</div>
        </div>

        {/* Short */}
        <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-4 border border-orange-200 dark:border-orange-500/30 text-center">
          <TrendingDown className="w-5 h-5 text-orange-500 dark:text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{shortReports}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Short</div>
        </div>

        {/* Accuracy */}
        <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/30 text-center">
          <Percent className="w-5 h-5 text-purple-500 dark:text-purple-400 mx-auto mb-2" />
          <div className={cn(
            "text-2xl font-bold",
            Number(accuracy) >= 70 ? 'text-green-600 dark:text-green-400' :
            Number(accuracy) >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
            closedReports === 0 ? 'text-gray-400 dark:text-slate-500' : 'text-red-600 dark:text-red-400'
          )}>
            {closedReports > 0 ? `${accuracy}%` : '-'}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Accuracy</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
        <div className="flex gap-2">
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
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg">
                  {/* Score as percentage */}
                  <div className={cn(
                    "text-center px-2 py-1 rounded-lg min-w-[50px]",
                    report.score >= 7 ? "bg-green-500/20" :
                    report.score >= 5 ? "bg-yellow-500/20" : "bg-red-500/20"
                  )}>
                    <div className="text-[10px] text-muted-foreground">Score</div>
                    <div className={cn(
                      "font-bold text-sm",
                      report.score >= 7 ? "text-green-400" :
                      report.score >= 5 ? "text-yellow-400" : "text-red-400"
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
                          ? "bg-green-500/20"
                          : "bg-red-500/20"
                      )}>
                        <div className="text-[10px] text-muted-foreground">P/L</div>
                        <div className={cn(
                          "font-bold text-sm",
                          (report.unrealizedPnL || 0) >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {(report.unrealizedPnL || 0) >= 0 ? '+' : ''}{(report.unrealizedPnL || 0).toFixed(2)}%
                        </div>
                      </div>

                      {/* Distance to TP - for active trades or show 100% for TP hit */}
                      {report.takeProfit1 && (
                        report.outcome === 'correct' ? (
                          // TP Hit - show 100% in green
                          <div className="text-center px-2 py-1 rounded-lg min-w-[60px] bg-green-500/20">
                            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                              <Target className="w-3 h-3" />
                              TP
                            </div>
                            <div className="font-bold text-sm text-green-400">
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
                              progress >= 80 ? "bg-green-500/20" :
                              progress >= 50 ? "bg-yellow-500/20" : "bg-blue-500/20"
                            )}>
                              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                                <Target className="w-3 h-3" />
                                TP
                              </div>
                              <div className={cn(
                                "font-bold text-sm",
                                progress >= 80 ? "text-green-400" :
                                progress >= 50 ? "text-yellow-400" : "text-blue-400"
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
                <div className="flex items-center gap-2 shrink-0">
                  {/* Chart Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setChartModal({ isOpen: true, report }); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition"
                    title="View Chart"
                  >
                    <LineChart className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Chart</span>
                  </button>
                  {/* Details Button */}
                  <button
                    onClick={() => router.push(`/reports/${report.id}`)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Details</span>
                  </button>
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
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-400">
            <p className="font-medium text-blue-500 mb-1">Live Tracking</p>
            <p>
              Reports are tracked live. When TP or SL is hit, the trade automatically closes.
              Click the Chart button to view multi-timeframe analysis.
            </p>
          </div>
        </div>
      </div>

      {/* TradingView Chart Modal - 4 Panel Multi-Timeframe */}
      {chartModal.isOpen && chartModal.report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-card border rounded-xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 via-amber-500 to-green-500 flex items-center justify-center text-white font-bold">
                  {chartModal.report.symbol.slice(0, 2)}
                </div>
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

              {/* Trade Plan Summary */}
              <div className="flex items-center gap-6">
                {/* Entry Price */}
                {chartModal.report.entryPrice && (
                  <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Entry</div>
                    <div className="font-mono font-bold text-white">${chartModal.report.entryPrice.toFixed(4)}</div>
                  </div>
                )}

                {/* Stop Loss */}
                {chartModal.report.stopLoss && (
                  <div className="text-center px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/30">
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <Shield className="w-3 h-3" />
                      Stop Loss
                    </div>
                    <div className="font-mono font-bold text-red-400">${chartModal.report.stopLoss.toFixed(4)}</div>
                  </div>
                )}

                {/* Take Profits */}
                {chartModal.report.takeProfit1 && (
                  <div className="flex gap-2">
                    <div className="text-center px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <Target className="w-3 h-3" />
                        TP1
                      </div>
                      <div className="font-mono font-bold text-green-400">${chartModal.report.takeProfit1.toFixed(4)}</div>
                    </div>
                    {chartModal.report.takeProfit2 && (
                      <div className="text-center px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                        <div className="text-xs text-green-400">TP2</div>
                        <div className="font-mono font-bold text-green-400">${chartModal.report.takeProfit2.toFixed(4)}</div>
                      </div>
                    )}
                    {chartModal.report.takeProfit3 && (
                      <div className="text-center px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                        <div className="text-xs text-green-400">TP3</div>
                        <div className="font-mono font-bold text-green-400">${chartModal.report.takeProfit3.toFixed(4)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* P/L */}
                {chartModal.report.unrealizedPnL !== undefined && (
                  <div className={cn(
                    "text-center px-4 py-2 rounded-lg font-bold",
                    chartModal.report.unrealizedPnL >= 0
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}>
                    <div className="text-xs">P/L</div>
                    <div className="flex items-center gap-1 text-lg">
                      {chartModal.report.unrealizedPnL >= 0 ? '+' : ''}{chartModal.report.unrealizedPnL.toFixed(2)}%
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setChartModal({ isOpen: false, report: null })}
                  className="p-2 rounded-lg hover:bg-slate-700 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 2-Panel Chart Grid */}
            <div className="flex-1 grid grid-cols-2 gap-2 p-2 bg-slate-900">
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

              {/* TradingView Chart - Right (with indicators & timeframe selector) */}
              <div className="relative bg-slate-800 rounded-lg overflow-hidden flex flex-col">
                {/* Timeframe Selector */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-slate-900/90 rounded-lg p-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => setTvTimeframe(tf.value)}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium transition",
                        tvTimeframe === tf.value
                          ? "bg-amber-500 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1">
                  <TradingViewChart
                    symbol={chartModal.report.symbol}
                    interval={tvTimeframe}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
