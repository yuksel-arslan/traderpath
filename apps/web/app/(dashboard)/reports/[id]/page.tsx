'use client';

// ===========================================
// Report View Page - Clean Summary Design
// All 7 analysis steps + AI Expert Review
// ===========================================

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Globe,
  Shield,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Search,
  Crosshair,
  Bot,
  LineChart,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../../lib/coin-icons';
import { TradePlanChart } from '../../../../components/analysis/TradePlanChart';
import { authFetch } from '../../../../lib/api';

interface ReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  marketPulse: {
    btcDominance: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    marketRegime: string;
    trend: { direction: string; strength: number };
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    volume24h?: number;
    indicators: { rsi: number; macd: { histogram: number; signal: string } };
    levels?: { support: number[]; resistance: number[] };
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
  };
  timing: {
    tradeNow: boolean;
    reason: string;
  };
  tradePlan: {
    direction: string;
    averageEntry: number;
    stopLoss: { price: number };
    takeProfits: Array<{ price: number }>;
    riskReward: number;
  };
  trapCheck?: {
    traps: { bullTrap: boolean; bearTrap: boolean; fakeoutRisk: string };
    liquidityGrab?: { zones: number[] };
  };
  verdict: {
    action: string;
    overallScore: number;
    aiSummary?: string;
  };
}

function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export default function ReportViewPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [aiExpertComment, setAiExpertComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await authFetch(`/api/reports/${reportId}`);

        if (!response.ok) throw new Error('Failed to load report');

        const data = await response.json();
        if (data.success && data.data.reportData) {
          setReport(data.data.reportData);
          setAiExpertComment(data.data.aiExpertComment || null);
        } else {
          throw new Error('Report data not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, router]);

  const handleDownloadPDF = async () => {
    if (!report) return;
    try {
      const { generateAnalysisReport } = await import('../../../../components/reports/AnalysisReport');
      await generateAnalysisReport({ ...report, aiExpertComment: aiExpertComment || undefined });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/reports" className="text-primary hover:underline">Back to Reports</Link>
      </div>
    );
  }

  const isLong = report.tradePlan.direction === 'long';
  const isBullish = isLong;
  const score = report.verdict.overallScore * 10; // Convert to 100 scale

  // Determine status labels
  const marketStatus = report.marketPulse.trend?.direction === 'bullish' ? 'Bullish' :
                       report.marketPulse.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';

  const assetStatus = report.assetScan.priceChange24h >= 2 ? 'Strong' :
                      report.assetScan.priceChange24h >= 0 ? 'Stable' :
                      report.assetScan.priceChange24h >= -2 ? 'Weak' : 'Declining';

  const safetyStatus = report.safetyCheck.riskLevel === 'low' ? 'Safe' :
                       report.safetyCheck.riskLevel === 'high' ? 'Risky' : 'Caution';

  const timingStatus = report.timing.tradeNow ? 'Good' : 'Wait';

  const planStatus = report.tradePlan.averageEntry ? 'Ready' : 'Pending';

  const trapStatus = report.trapCheck?.traps?.bullTrap || report.trapCheck?.traps?.bearTrap ? 'Warning' :
                     report.trapCheck?.traps?.fakeoutRisk === 'high' ? 'Caution' : 'Clear';

  // MACD description
  const macdDesc = report.assetScan.indicators?.macd?.histogram > 0 ? 'Bullish crossover forming' : 'Bearish momentum';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <div className="w-full max-w-4xl">
        {/* Back Button */}
        <Link href="/reports" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reports</span>
        </Link>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-transparent">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img
                src={getCoinIcon(report.symbol)}
                alt={report.symbol}
                className="w-12 h-12 rounded-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_COIN_ICON;
                }}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{report.symbol}/USDT Analysis</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">{report.generatedAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
                isBullish ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {isBullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isBullish ? 'BULLISH' : 'BEARISH'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{score}/100</div>
            </div>
          </div>

          {/* 6 Info Cards - 2x3 Grid (All analysis steps) */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* 1. Market Pulse */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Market Pulse</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  marketStatus === 'Bullish' ? 'text-green-600 dark:text-green-400' : marketStatus === 'Bearish' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                )}>{marketStatus}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Fear & Greed: {report.marketPulse.fearGreedIndex} ({report.marketPulse.fearGreedLabel}) • BTC Dominance: {report.marketPulse.btcDominance?.toFixed(1)}%
              </p>
            </div>

            {/* 2. Asset Scan */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Asset Scan</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  assetStatus === 'Strong' ? 'text-green-600 dark:text-green-400' :
                  assetStatus === 'Stable' ? 'text-blue-600 dark:text-blue-400' :
                  assetStatus === 'Weak' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                )}>{assetStatus}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Price: {formatPrice(report.assetScan.currentPrice)} • 24h: {report.assetScan.priceChange24h >= 0 ? '+' : ''}{report.assetScan.priceChange24h?.toFixed(2)}%
              </p>
            </div>

            {/* 3. Safety Check */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Safety Check</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  safetyStatus === 'Safe' ? 'text-green-600 dark:text-green-400' : safetyStatus === 'Risky' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                )}>{safetyStatus}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {report.safetyCheck.manipulation?.pumpDumpRisk === 'low' ? 'No manipulation detected' : 'Manipulation risk detected'} • Whale activity: {report.safetyCheck.whaleActivity?.bias || 'neutral'}
              </p>
            </div>

            {/* 4. Timing Analysis */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Timing Analysis</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  timingStatus === 'Good' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                )}>{timingStatus}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                RSI: {report.assetScan.indicators?.rsi?.toFixed(0) || 'N/A'} • MACD: {macdDesc}
              </p>
            </div>

            {/* 5. Trade Plan */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Trade Plan</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  planStatus === 'Ready' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                )}>{planStatus}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Entry: {formatPrice(report.tradePlan.averageEntry)} • TP: {formatPrice(report.tradePlan.takeProfits?.[0]?.price)} • SL: {formatPrice(report.tradePlan.stopLoss?.price)}
              </p>
            </div>

            {/* 6. Trap Check */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-red-500 dark:text-red-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Trap Check</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  trapStatus === 'Clear' ? 'text-green-600 dark:text-green-400' : trapStatus === 'Warning' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                )}>{trapStatus}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Bull trap: {report.trapCheck?.traps?.bullTrap ? 'Yes' : 'No'} • Bear trap: {report.trapCheck?.traps?.bearTrap ? 'Yes' : 'No'} • Fakeout: {report.trapCheck?.traps?.fakeoutRisk || 'low'}
              </p>
            </div>
          </div>

          {/* 7. Final Verdict */}
          <div className={cn(
            "rounded-xl p-4 mb-6",
            isLong ? "bg-green-50 dark:bg-green-500/20" : "bg-red-50 dark:bg-red-500/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={cn("w-5 h-5", isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} />
              <span className={cn("font-semibold", isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                Final Verdict: {report.tradePlan.direction?.toUpperCase()} Recommended
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {report.verdict.aiSummary || `Market conditions favor ${isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(report.tradePlan.averageEntry)} with ${report.tradePlan.riskReward?.toFixed(1)}:1 risk-reward ratio. Set stop-loss at ${formatPrice(report.tradePlan.stopLoss?.price)} to protect against downside.`}
            </p>
          </div>

          {/* Trade Plan Chart */}
          {report.tradePlan && (
            <div className="mb-6">
              <TradePlanChart
                symbol={report.symbol}
                direction={report.tradePlan.direction as 'long' | 'short'}
                entries={report.tradePlan.averageEntry ? [{ price: report.tradePlan.averageEntry, percentage: 100 }] : []}
                stopLoss={report.tradePlan.stopLoss || { price: 0, percentage: 0 }}
                takeProfits={report.tradePlan.takeProfits?.map((tp, i) => ({
                  price: tp.price,
                  percentage: 0,
                  riskReward: report.tradePlan.riskReward || (i + 1),
                })) || []}
                currentPrice={report.assetScan?.currentPrice || report.tradePlan.averageEntry || 0}
                support={report.assetScan?.levels?.support}
                resistance={report.assetScan?.levels?.resistance}
              />
            </div>
          )}

          {/* AI Expert Review Section - Only show if comment exists */}
          {aiExpertComment && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-700 dark:text-amber-400">AI Expert Review</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-500">NEXUS Risk Assessment</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-amber-200 dark:border-amber-500/20">
                <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {aiExpertComment}
                </p>
              </div>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownloadPDF}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition"
          >
            <Download className="w-5 h-5" />
            Download Full Report (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
