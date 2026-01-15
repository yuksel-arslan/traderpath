'use client';

// ===========================================
// Analysis Details Page
// Shows analysis data directly (without report)
// ===========================================

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
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
  Coins,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../../../lib/coin-icons';
import { TradePlanChart } from '../../../../../components/analysis/TradePlanChart';
import { authFetch } from '../../../../../lib/api';

interface AnalysisData {
  id: string;
  symbol: string;
  interval: string;
  totalScore: number;
  createdAt: string;
  expiresAt: string;
  outcome?: string;
  step1Result?: any; // Market Pulse
  step2Result?: any; // Asset Scanner
  step3Result?: any; // Safety Check
  step4Result?: any; // Timing Analysis
  step5Result?: any; // Trade Plan
  step6Result?: any; // Trap Check
  step7Result?: any; // Final Verdict
}

function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

const EMAIL_CREDIT_COST = 5;

export default function AnalysisDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await authFetch(`/api/analysis/${analysisId}`);

        if (!response.ok) throw new Error('Failed to load analysis');

        const data = await response.json();
        if (data.success && data.data) {
          setAnalysis(data.data);
        } else {
          throw new Error('Analysis data not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    // Fetch user credits
    const fetchCredits = async () => {
      try {
        const response = await authFetch('/api/credits/balance');
        if (response.ok) {
          const data = await response.json();
          setCredits(data.data?.balance || 0);
        }
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      }
    };

    fetchAnalysis();
    fetchCredits();
  }, [analysisId]);

  // Generate report from analysis
  const handleGenerateReport = async () => {
    if (!analysis || generatingReport) return;
    setGeneratingReport(true);

    try {
      // Check if report already exists
      const checkResponse = await authFetch(`/api/reports?analysisId=${analysisId}`);
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.data?.reports?.length > 0) {
          // Report exists, navigate to it
          router.push(`/reports/${checkData.data.reports[0].id}`);
          return;
        }
      }

      // Create new report
      const response = await authFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to create report');
      }

      const data = await response.json();
      if (data.success && data.data?.id) {
        router.push(`/reports/${data.data.id}`);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    if (!analysis) return;

    try {
      // Build report data from analysis
      const reportData = buildReportData(analysis);
      const { generateAnalysisReport } = await import('../../../../../components/reports/AnalysisReport');
      await generateAnalysisReport(reportData);
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Failed to download PDF');
    }
  };

  // Send email
  const handleSendEmail = async () => {
    if (!analysis || sendingEmail) return;

    if (credits !== null && credits < EMAIL_CREDIT_COST) {
      alert(`You need ${EMAIL_CREDIT_COST} credits to send this report via email. Current balance: ${credits}`);
      return;
    }

    setSendingEmail(true);
    try {
      const reportData = buildReportData(analysis);
      const response = await authFetch('/api/reports/send-html-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: analysisId,
          reportData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to send email');
      }

      setEmailSent(true);
      setCredits((prev) => prev !== null ? prev - EMAIL_CREDIT_COST : null);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      console.error('Failed to send email:', err);
      alert(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Build report data from analysis
  const buildReportData = (analysis: AnalysisData) => {
    const step1 = analysis.step1Result || {};
    const step2 = analysis.step2Result || {};
    const step3 = analysis.step3Result || {};
    const step4 = analysis.step4Result || {};
    const step5 = analysis.step5Result || {};
    const step6 = analysis.step6Result || {};
    const step7 = analysis.step7Result || {};

    return {
      symbol: analysis.symbol,
      generatedAt: new Date(analysis.createdAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      analysisId: analysis.id,
      tradeType: getTradeType(analysis.interval),
      marketPulse: {
        btcDominance: step1.btcDominance,
        fearGreedIndex: step1.fearGreedIndex,
        fearGreedLabel: step1.fearGreedLabel,
        marketRegime: step1.marketRegime,
        trend: step1.trend || { direction: 'neutral', strength: 0 },
      },
      assetScan: {
        currentPrice: step2.currentPrice,
        priceChange24h: step2.priceChange24h,
        volume24h: step2.volume24h,
        indicators: step2.indicators || { rsi: 50, macd: { histogram: 0, signal: 'neutral' } },
        levels: step2.levels,
      },
      safetyCheck: {
        riskLevel: step3.riskLevel,
        manipulation: step3.manipulation || { pumpDumpRisk: 'low' },
        whaleActivity: step3.whaleActivity || { bias: 'neutral' },
      },
      timing: {
        tradeNow: step4.tradeNow,
        reason: step4.reason,
      },
      tradePlan: {
        direction: step5.direction,
        averageEntry: step5.averageEntry || step5.entryPrice,
        stopLoss: { price: step5.stopLoss?.price || step5.stopLoss },
        takeProfits: step5.takeProfits || [
          { price: step5.takeProfit1 },
          { price: step5.takeProfit2 },
          { price: step5.takeProfit3 },
        ].filter(tp => tp.price),
        riskReward: step5.riskReward,
      },
      trapCheck: {
        traps: step6.traps || { bullTrap: false, bearTrap: false, fakeoutRisk: 'low' },
        liquidityGrab: step6.liquidityGrab,
      },
      verdict: {
        action: step7.action || step7.verdict,
        overallScore: analysis.totalScore,
        aiSummary: step7.aiSummary || step7.summary,
      },
    };
  };

  const getTradeType = (interval: string): 'scalping' | 'dayTrade' | 'swing' => {
    if (interval === '5m' || interval === '15m') return 'scalping';
    if (interval === '1h' || interval === '4h') return 'dayTrade';
    return 'swing';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Analysis Not Found</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/analyze" className="text-primary hover:underline">Back to Analyze</Link>
      </div>
    );
  }

  // Extract data from steps
  const step1 = analysis.step1Result || {};
  const step2 = analysis.step2Result || {};
  const step3 = analysis.step3Result || {};
  const step4 = analysis.step4Result || {};
  const step5 = analysis.step5Result || {};
  const step6 = analysis.step6Result || {};
  const step7 = analysis.step7Result || {};

  const direction = step5.direction || step7.direction || 'long';
  const isLong = direction === 'long';
  const score = (analysis.totalScore || 0) * 10;

  // Status labels
  const marketStatus = step1.trend?.direction === 'bullish' ? 'Bullish' :
                       step1.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';

  const assetStatus = (step2.priceChange24h || 0) >= 2 ? 'Strong' :
                      (step2.priceChange24h || 0) >= 0 ? 'Stable' :
                      (step2.priceChange24h || 0) >= -2 ? 'Weak' : 'Declining';

  const safetyStatus = step3.riskLevel === 'low' ? 'Safe' :
                       step3.riskLevel === 'high' ? 'Risky' : 'Caution';

  const timingStatus = step4.tradeNow ? 'Good' : 'Wait';

  const entryPrice = step5.averageEntry || step5.entryPrice;
  const planStatus = entryPrice ? 'Ready' : 'Pending';

  const trapStatus = step6.traps?.bullTrap || step6.traps?.bearTrap ? 'Warning' :
                     step6.traps?.fakeoutRisk === 'high' ? 'Caution' : 'Clear';

  const macdDesc = (step2.indicators?.macd?.histogram || 0) > 0 ? 'Bullish crossover' : 'Bearish momentum';

  // Trade plan data
  const stopLossPrice = step5.stopLoss?.price || step5.stopLoss;
  const tp1 = step5.takeProfits?.[0]?.price || step5.takeProfit1;
  const tp2 = step5.takeProfits?.[1]?.price || step5.takeProfit2;
  const tp3 = step5.takeProfits?.[2]?.price || step5.takeProfit3;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <div className="w-full max-w-4xl">
        {/* Back Button */}
        <Link href="/analyze" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analyze</span>
        </Link>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 dark:border-transparent">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <img
                src={getCoinIcon(analysis.symbol)}
                alt={analysis.symbol}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_COIN_ICON;
                }}
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{analysis.symbol}/USDT Analysis</h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                  {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
                isLong ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isLong ? 'BULLISH' : 'BEARISH'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{score}/100</div>
            </div>
          </div>

          {/* 6 Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
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
                Fear & Greed: {step1.fearGreedIndex || 0} ({step1.fearGreedLabel || 'N/A'}) • BTC Dom: {step1.btcDominance?.toFixed(1) || '0'}%
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
                Price: {formatPrice(step2.currentPrice)} • 24h: {(step2.priceChange24h || 0) >= 0 ? '+' : ''}{step2.priceChange24h?.toFixed(2) || '0'}%
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
                {step3.manipulation?.pumpDumpRisk === 'low' ? 'No manipulation' : 'Manipulation risk'} • Whale: {step3.whaleActivity?.bias || 'neutral'}
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
                RSI: {step2.indicators?.rsi?.toFixed(0) || 'N/A'} • MACD: {macdDesc}
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
              <div className="text-sm text-gray-500 dark:text-slate-400 space-y-0.5 sm:space-y-0">
                <span className="block sm:inline">Entry: {formatPrice(entryPrice)}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">TP: {formatPrice(tp1)}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">SL: {formatPrice(stopLossPrice)}</span>
              </div>
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
              <div className="text-sm text-gray-500 dark:text-slate-400 space-y-0.5 sm:space-y-0">
                <span className="block sm:inline">Bull trap: {step6.traps?.bullTrap ? 'Yes' : 'No'}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">Bear trap: {step6.traps?.bearTrap ? 'Yes' : 'No'}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">Fakeout: {step6.traps?.fakeoutRisk || 'low'}</span>
              </div>
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
                Final Verdict: {direction.toUpperCase()} Recommended
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {step7.aiSummary || step7.summary || `Market conditions favor ${isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(entryPrice)} with ${step5.riskReward?.toFixed(1) || '2.0'}:1 risk-reward ratio. Set stop-loss at ${formatPrice(stopLossPrice)} to protect against downside.`}
            </p>
          </div>

          {/* Trade Plan Chart */}
          {entryPrice && (
            <div className="mb-6">
              <TradePlanChart
                symbol={analysis.symbol}
                direction={direction as 'long' | 'short'}
                entries={[{ price: entryPrice, percentage: 100 }]}
                stopLoss={{ price: stopLossPrice || 0, percentage: 0 }}
                takeProfits={[tp1, tp2, tp3].filter(Boolean).map((tp, i) => ({
                  price: tp,
                  percentage: 0,
                  riskReward: step5.riskReward || (i + 1),
                }))}
                currentPrice={step2.currentPrice || entryPrice}
                support={step2.levels?.support}
                resistance={step2.levels?.resistance}
                tradeType={getTradeType(analysis.interval)}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Generate Report Button */}
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center justify-center gap-2 py-3 font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Create Report
                </>
              )}
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-3 font-semibold rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>

            {/* Send Email Button */}
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || emailSent}
              className={cn(
                "flex items-center justify-center gap-2 py-3 font-semibold rounded-xl transition",
                emailSent
                  ? "bg-green-500 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
              )}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : emailSent ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Sent!
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Email
                  <span className="flex items-center gap-1 ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    <Coins className="w-3 h-3" />
                    {EMAIL_CREDIT_COST}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
