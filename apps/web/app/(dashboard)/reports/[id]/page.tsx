'use client';

// ===========================================
// Report View Page - Clean Summary Design
// All 7 analysis steps + AI Expert Review
// ===========================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

// Expert icons and colors for AI Expert comment parsing
const EXPERT_CONFIG: Record<string, { emoji: string; color: string; name: string }> = {
  'ARIA': { emoji: '📊', color: 'text-blue-600 dark:text-blue-400', name: 'ARIA - Technical Analysis' },
  'ORACLE': { emoji: '🐋', color: 'text-purple-600 dark:text-purple-400', name: 'ORACLE - Whale Tracking' },
  'SENTINEL': { emoji: '🛡️', color: 'text-red-600 dark:text-red-400', name: 'SENTINEL - Risk Detection' },
  'NEXUS': { emoji: '⚖️', color: 'text-amber-600 dark:text-amber-400', name: 'NEXUS - Risk Assessment' },
  'VOLTRAN': { emoji: '🤖', color: 'text-teal-600 dark:text-teal-400', name: 'VOLTRAN - Unified Analysis' },
};

// Parse and render AI Expert comment with proper formatting
function renderAIExpertComment(comment: string) {
  // Remove [PANEL_HEADER] line
  let cleaned = comment.replace(/\[PANEL_HEADER\][^\n]*/g, '');

  // Extract verdict line
  const verdictMatch = cleaned.match(/\[(GO|CONDITIONAL[_ ]GO|WAIT|AVOID)\][^\n]*/i);
  let verdict = null;
  if (verdictMatch) {
    verdict = verdictMatch[0];
    cleaned = cleaned.replace(verdict, '');
  }

  // Parse expert sections
  const sections: { expert: string; content: string }[] = [];
  const expertRegex = /\[EXPERT:(\w+)\]\s*([^\[]*)/g;
  let match;
  while ((match = expertRegex.exec(cleaned)) !== null) {
    const expertName = match[1].toUpperCase();
    const content = match[2].trim();
    if (content) {
      sections.push({ expert: expertName, content });
    }
  }

  // Parse VOLTRAN section
  const voltranMatch = cleaned.match(/\[VOLTRAN\]\s*([^\[]*)/);
  let voltranContent = null;
  if (voltranMatch) {
    voltranContent = voltranMatch[1].trim();
  }

  // Get verdict color
  const getVerdictColor = (v: string) => {
    if (v.includes('GO') && !v.includes('CONDITIONAL')) return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30';
    if (v.includes('CONDITIONAL')) return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30';
    if (v.includes('WAIT')) return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30';
    return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30';
  };

  return (
    <div className="space-y-4">
      {/* Verdict Badge */}
      {verdict && (
        <div className={cn('inline-block px-3 py-1.5 rounded-lg font-semibold text-sm border', getVerdictColor(verdict))}>
          {verdict.replace(/\[|\]/g, '').replace(/_/g, ' ')}
        </div>
      )}

      {/* Expert Sections */}
      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section, idx) => {
            const config = EXPERT_CONFIG[section.expert] || { emoji: '💡', color: 'text-gray-600', name: section.expert };
            return (
              <div key={idx} className="flex gap-3">
                <div className="text-lg flex-shrink-0">{config.emoji}</div>
                <div className="flex-1">
                  <div className={cn('text-xs font-semibold mb-1', config.color)}>{config.name}</div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{section.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VOLTRAN Summary */}
      {voltranContent && (
        <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-500/20">
          <div className="flex gap-3">
            <div className="text-lg flex-shrink-0">🤖</div>
            <div className="flex-1">
              <div className="text-xs font-semibold mb-1 text-teal-600 dark:text-teal-400">VOLTRAN - Final Synthesis</div>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-medium">{voltranContent}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fallback if no sections parsed */}
      {sections.length === 0 && !voltranContent && !verdict && (
        <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {comment}
        </p>
      )}
    </div>
  );
}

interface ReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  interval?: string; // Timeframe interval (e.g., '4h', '1d')
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
  const searchParams = useSearchParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [aiExpertComment, setAiExpertComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [autoEmailInProgress, setAutoEmailInProgress] = useState(false);
  const [autoEmailDone, setAutoEmailDone] = useState(false);
  const [reportMeta, setReportMeta] = useState<{ analysisId: string; interval?: string } | null>(null);
  const autoEmailTriggered = useRef(false);
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
          setReportMeta({
            analysisId: data.data.analysisId || reportId,
            interval: data.data.interval || data.data.reportData?.interval,
          });
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

  // Auto-email handler for ?email=true parameter
  const handleAutoEmail = useCallback(async () => {
    if (!pageRef.current || !report || !reportMeta || autoEmailTriggered.current) return;

    autoEmailTriggered.current = true;
    setAutoEmailInProgress(true);

    try {
      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 2000));

      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 1.5, // Reduced from 2 to keep file size reasonable for email
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

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.80); // Reduced quality for smaller file size

      // Send via email
      const response = await authFetch('/api/reports/email-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: reportMeta.analysisId,
          symbol: report.symbol,
          interval: reportMeta.interval || report.interval || '4h',
          screenshot: imageBase64,
          score: report.verdict?.overallScore ? report.verdict.overallScore * 10 : 0,
          direction: report.tradePlan?.direction || 'long',
        }),
      });

      if (response.ok) {
        setAutoEmailDone(true);
        setEmailSent(true);
        // Redirect back to reports page after showing success
        setTimeout(() => {
          router.push('/reports');
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Auto email send failed:', response.status, errorData);
        alert(errorData?.error?.message || 'Failed to send email. Please try again.');
        setAutoEmailInProgress(false);
      }
    } catch (err) {
      console.error('Failed to auto send email:', err);
      alert('Failed to send email. Please try again.');
      setAutoEmailInProgress(false);
    }
  }, [report, reportMeta, router]);

  // Trigger auto-email when report is loaded and email=true parameter is present
  useEffect(() => {
    const shouldAutoEmail = searchParams.get('email') === 'true';
    if (shouldAutoEmail && report && reportMeta && !loading && !autoEmailTriggered.current) {
      handleAutoEmail();
    }
  }, [searchParams, report, reportMeta, loading, handleAutoEmail]);

  // Export as PNG
  const handleExportPNG = async () => {
    if (!pageRef.current || exporting || !report) return;

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

      const imageBase64 = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const symbol = report.symbol || 'Report';
      const date = new Date().toISOString().split('T')[0];
      link.download = `TraderPath_${symbol}_${date}.png`;
      link.href = imageBase64;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  // Export as JPG
  const handleExportJPG = async () => {
    if (!pageRef.current || exporting || !report) return;

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

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.92);
      const link = document.createElement('a');
      const symbol = report.symbol || 'Report';
      const date = new Date().toISOString().split('T')[0];
      link.download = `TraderPath_${symbol}_${date}.jpg`;
      link.href = imageBase64;
      link.click();
    } catch (err) {
      console.error('Failed to export JPG:', err);
      alert('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  // Send via Email - downloads JPG and sends email
  const handleSendEmail = async () => {
    if (!pageRef.current || exporting || !report) return;

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

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.92);

      // Download the image first
      const link = document.createElement('a');
      const symbol = report.symbol || 'Report';
      const date = new Date().toISOString().split('T')[0];
      link.download = `TraderPath_${symbol}_${date}.jpg`;
      link.href = imageBase64;
      link.click();

      // Then send via email
      const response = await authFetch('/api/reports/email-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: report.analysisId,
          symbol: report.symbol,
          interval: report.interval || '4h',
          screenshot: imageBase64,
          score: report.verdict?.overallScore ? report.verdict.overallScore * 10 : 0,
          direction: report.tradePlan?.direction || 'long',
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Email send failed:', response.status, errorData);
        alert(errorData?.error?.message || 'Failed to send email. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      alert('Failed to send email');
    } finally {
      setExporting(false);
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
    <>
      {/* Auto-email overlay - shows on top of page content */}
      {autoEmailInProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4">
            {autoEmailDone ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Sent!</h2>
                <p className="text-gray-500 dark:text-slate-400">Your report screenshot has been sent to your email. Redirecting...</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-teal-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sending Email...</h2>
                <p className="text-gray-500 dark:text-slate-400">Capturing full report screenshot and sending to your email...</p>
              </>
            )}
          </div>
        </div>
      )}

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
                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    disabled={exporting}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition disabled:opacity-50",
                      emailSent
                        ? "bg-green-500 text-white"
                        : "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white"
                    )}
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : emailSent ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{exporting ? 'Exporting...' : emailSent ? 'Sent!' : 'Export'}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", exportDropdownOpen && "rotate-180")} />
                  </button>

                  {exportDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setExportDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
                        <button
                          onClick={handleExportPNG}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                        >
                          <Image className="w-4 h-4 text-teal-500" />
                          <div>
                            <div>Download PNG</div>
                            <div className="text-xs text-gray-400">High Quality</div>
                          </div>
                        </button>
                        <button
                          onClick={handleExportJPG}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                        >
                          <Image className="w-4 h-4 text-blue-500" />
                          <div>
                            <div>Download JPG</div>
                            <div className="text-xs text-gray-400">Smaller Size</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
                  analysisTime={report.generatedAt}
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
                  <h3 className="font-semibold text-amber-700 dark:text-amber-400">AI Expert Panel Review</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-500">4 AI Experts + VOLTRAN Synthesis</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-amber-200 dark:border-amber-500/20">
                {renderAIExpertComment(aiExpertComment)}
              </div>
            </div>
          )}

          {/* Footer - Copyright */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-center text-xs text-gray-500 dark:text-slate-400">
              © 2025 <span className="font-semibold bg-gradient-to-r from-teal to-coral bg-clip-text text-transparent">TraderPath</span>. All rights reserved.
            </p>
            <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-1">
              Trading involves risk. Not financial advice.
            </p>
          </div>

        </div>
      </div>
      </div>
    </>
  );
}
