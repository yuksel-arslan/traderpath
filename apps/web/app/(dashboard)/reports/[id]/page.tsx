'use client';

// ===========================================
// Report View Page - Clean Summary Design
// All 7 analysis steps + AI Expert Review
// ===========================================

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import {
  ArrowLeft,
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
  FileDown,
  Camera,
  Download,
  ChevronDown,
  Mail,
  Image,
  Check,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../../lib/coin-icons';
import { TradePlanChart } from '../../../../components/analysis/TradePlanChart';
import { authFetch } from '../../../../lib/api';

interface ReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  tradeType?: 'scalping' | 'dayTrade' | 'swing'; // Trade type for chart interval
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

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

  // Download PDF with chart capture
  const handleDownloadPdf = async () => {
    if (!report || downloadingPdf) return;
    setDownloadingPdf(true);

    try {
      // Build report data for PDF
      const reportData: any = {
        symbol: report.symbol,
        generatedAt: report.generatedAt,
        tradeType: report.tradeType,
        marketPulse: report.marketPulse,
        assetScan: report.assetScan,
        safetyCheck: report.safetyCheck,
        timing: report.timing,
        tradePlan: report.tradePlan,
        trapCheck: report.trapCheck,
        verdict: report.verdict,
      };

      // Capture chart if visible
      if (chartRef.current) {
        try {
          chartRef.current.scrollIntoView({ behavior: 'instant', block: 'center' });
          await new Promise(resolve => setTimeout(resolve, 1500));

          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#1a1a2e',
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
          });
          reportData.chartImage = canvas.toDataURL('image/png');
          console.log('[PDF Download] Chart captured successfully');
        } catch (chartErr) {
          console.warn('[PDF Download] Failed to capture chart:', chartErr);
        }
      }

      // Generate and download PDF
      const { generateAnalysisReport } = await import('../../../../components/reports/AnalysisReport');
      await generateAnalysisReport(reportData, false);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Screenshot full report (not just chart)
  const handleScreenshot = async () => {
    if (!pageRef.current || capturingScreenshot) return;

    setCapturingScreenshot(true);
    try {
      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
          }
        },
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const symbol = report?.symbol || 'Report';
        const date = new Date().toISOString().split('T')[0];
        link.download = `TraderPath_${symbol}_Report_${date}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      alert('Failed to capture screenshot');
    } finally {
      setCapturingScreenshot(false);
    }
  };

  // Export full page as image (PNG or JPG)
  const handleExportImage = async (format: 'png' | 'jpg') => {
    if (!pageRef.current || exporting) return;

    setExporting(true);
    setExportDropdownOpen(false);

    try {
      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
          }
        },
      });

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.92 : undefined;

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const symbol = report?.symbol || 'Report';
        const date = new Date().toISOString().split('T')[0];
        link.download = `TraderPath_${symbol}_Report_${date}.${format}`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, mimeType, quality);
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  // Send screenshot via email
  const handleSendEmail = async () => {
    if (!pageRef.current || sendingEmail || !report) return;

    setSendingEmail(true);
    setExportDropdownOpen(false);

    try {
      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1200,
      });

      const imageBase64 = canvas.toDataURL('image/png');

      const response = await authFetch('/api/reports/email-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: report.analysisId,
          symbol: report.symbol,
          screenshot: imageBase64,
          score: report.verdict?.overallScore ? report.verdict.overallScore * 10 : 0,
          direction: report.tradePlan?.direction || 'long',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      alert(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
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

  const isLong = report.tradePlan?.direction === 'long';
  const isBullish = isLong;
  const score = (report.verdict?.overallScore || 0) * 10; // Convert to 100 scale

  // Determine status labels
  const marketStatus = report.marketPulse?.trend?.direction === 'bullish' ? 'Bullish' :
                       report.marketPulse?.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';

  const assetStatus = (report.assetScan?.priceChange24h || 0) >= 2 ? 'Strong' :
                      (report.assetScan?.priceChange24h || 0) >= 0 ? 'Stable' :
                      (report.assetScan?.priceChange24h || 0) >= -2 ? 'Weak' : 'Declining';

  const safetyStatus = report.safetyCheck?.riskLevel === 'low' ? 'Safe' :
                       report.safetyCheck?.riskLevel === 'high' ? 'Risky' : 'Caution';

  const timingStatus = report.timing?.tradeNow ? 'Good' : 'Wait';

  const planStatus = report.tradePlan?.averageEntry ? 'Ready' : 'Pending';

  const trapStatus = report.trapCheck?.traps?.bullTrap || report.trapCheck?.traps?.bearTrap ? 'Warning' :
                     report.trapCheck?.traps?.fakeoutRisk === 'high' ? 'Caution' : 'Clear';

  // MACD description
  const macdDesc = (report.assetScan?.indicators?.macd?.histogram || 0) > 0 ? 'Bullish crossover forming' : 'Bearish momentum';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <div className="w-full max-w-4xl">
        {/* Back Button */}
        <Link href="/reports" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reports</span>
        </Link>

        {/* Main Card */}
        <div
          ref={pageRef}
          data-export-container
          className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 dark:border-transparent">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <img
                src={getCoinIcon(report.symbol)}
                alt={report.symbol}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_COIN_ICON;
                }}
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{report.symbol}/USDT Analysis</h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{report.generatedAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
                isBullish ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {isBullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isBullish ? 'BULLISH' : 'BEARISH'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{score}/100</div>
            </div>
          </div>

          {/* 6 Info Cards - 1 col mobile, 2 col desktop */}
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
                Fear & Greed: {report.marketPulse?.fearGreedIndex || 0} ({report.marketPulse?.fearGreedLabel || 'N/A'}) • BTC Dominance: {report.marketPulse?.btcDominance?.toFixed(1) || '0'}%
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
                Price: {formatPrice(report.assetScan?.currentPrice)} • 24h: {(report.assetScan?.priceChange24h || 0) >= 0 ? '+' : ''}{report.assetScan?.priceChange24h?.toFixed(2) || '0'}%
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
                {report.safetyCheck?.manipulation?.pumpDumpRisk === 'low' ? 'No manipulation detected' : 'Manipulation risk detected'} • Whale activity: {report.safetyCheck?.whaleActivity?.bias || 'neutral'}
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
                RSI: {report.assetScan?.indicators?.rsi?.toFixed(0) || 'N/A'} • MACD: {macdDesc}
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
                <span className="block sm:inline">Entry: {formatPrice(report.tradePlan?.averageEntry)}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">TP: {formatPrice(report.tradePlan?.takeProfits?.[0]?.price)}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">SL: {formatPrice(report.tradePlan?.stopLoss?.price)}</span>
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
                <span className="block sm:inline">Bull trap: {report.trapCheck?.traps?.bullTrap ? 'Yes' : 'No'}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">Bear trap: {report.trapCheck?.traps?.bearTrap ? 'Yes' : 'No'}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline">Fakeout: {report.trapCheck?.traps?.fakeoutRisk || 'low'}</span>
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
                Final Verdict: {report.tradePlan?.direction?.toUpperCase() || 'N/A'} Recommended
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {report.verdict?.aiSummary || `Market conditions favor ${isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(report.tradePlan?.averageEntry)} with ${report.tradePlan?.riskReward?.toFixed(1) || '0'}:1 risk-reward ratio. Set stop-loss at ${formatPrice(report.tradePlan?.stopLoss?.price)} to protect against downside.`}
            </p>
          </div>

          {/* Trade Plan Chart */}
          {report.tradePlan && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Trade Plan Chart</h3>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-red-500 via-amber-500 to-green-500 hover:opacity-90 text-white transition disabled:opacity-50"
                  title="Download PDF report with chart"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  <span>Download PDF</span>
                </button>
              </div>
              <div ref={chartRef} className="bg-white dark:bg-slate-800 rounded-xl p-2">
                <TradePlanChart
                  symbol={report.symbol}
                  direction={report.tradePlan.direction as 'long' | 'short'}
                  entries={report.tradePlan.averageEntry ? [{ price: report.tradePlan.averageEntry, percentage: 100 }] : []}
                  stopLoss={{ price: report.tradePlan.stopLoss?.price || 0, percentage: 0 }}
                  takeProfits={report.tradePlan.takeProfits?.map((tp, i) => ({
                    price: tp.price,
                    percentage: 0,
                    riskReward: report.tradePlan.riskReward || (i + 1),
                  })) || []}
                  currentPrice={report.assetScan?.currentPrice || report.tradePlan.averageEntry || 0}
                  support={report.assetScan?.levels?.support}
                  resistance={report.assetScan?.levels?.resistance}
                  tradeType={report.tradeType}
                />
              </div>
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

          {/* Export Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={exporting || sendingEmail}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition shadow-lg",
                    "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white",
                    (exporting || sendingEmail) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : sendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : emailSent ? (
                    <>
                      <Check className="w-4 h-4" />
                      Email Sent!
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Report
                      <ChevronDown className={cn("w-4 h-4 transition-transform", exportDropdownOpen && "rotate-180")} />
                    </>
                  )}
                </button>

                {/* Dropdown Menu */}
                {exportDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setExportDropdownOpen(false)}
                    />
                    {/* Menu */}
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                      <button
                        onClick={() => handleExportImage('png')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                      >
                        <Image className="w-4 h-4 text-teal-500" />
                        Download as PNG
                        <span className="ml-auto text-xs text-gray-400">High Quality</span>
                      </button>
                      <button
                        onClick={() => handleExportImage('jpg')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                      >
                        <Image className="w-4 h-4 text-blue-500" />
                        Download as JPG
                        <span className="ml-auto text-xs text-gray-400">Smaller Size</span>
                      </button>
                      <div className="border-t border-gray-200 dark:border-slate-700" />
                      <button
                        onClick={handleSendEmail}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                      >
                        <Mail className="w-4 h-4 text-amber-500" />
                        Send via Email
                        <span className="ml-auto text-xs text-gray-400">To your email</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Save Button */}
              <button
                onClick={handleScreenshot}
                disabled={capturingScreenshot}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition disabled:opacity-50"
                title="Quick save as PNG"
              >
                {capturingScreenshot ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>Save as Image</span>
              </button>
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-4">
              Export as image for quick sharing or use the PDF button above for detailed report
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
