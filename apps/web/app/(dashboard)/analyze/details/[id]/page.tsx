'use client';

// ===========================================
// Analysis Details Page
// Shows analysis data directly (without report)
// ===========================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Check,
  Download,
  ChevronDown,
  Image,
  FileText,
  Mail,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '../../../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../../../lib/coin-icons';
import { TradePlanChart } from '../../../../../components/analysis/TradePlanChart';
import { TradeDecisionVisual } from '../../../../../components/analysis/TradeDecisionVisual';
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

export default function AnalysisDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisId = params.id as string;
  const chartRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [autoEmailInProgress, setAutoEmailInProgress] = useState(false);
  const [autoEmailDone, setAutoEmailDone] = useState(false);
  const autoEmailTriggered = useRef(false);
  const [autoPdfInProgress, setAutoPdfInProgress] = useState(false);
  const [autoPdfDone, setAutoPdfDone] = useState(false);
  const autoPdfTriggered = useRef(false);

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

    fetchAnalysis();
  }, [analysisId]);

  // Auto-email handler for ?email=true parameter
  const handleAutoEmail = useCallback(async () => {
    if (!pageRef.current || !analysis || autoEmailTriggered.current) return;

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
          analysisId: analysis.id,
          symbol: analysis.symbol,
          interval: analysis.interval,
          screenshot: imageBase64,
          score: analysis.totalScore,
          direction: analysis.step5Result?.direction || analysis.step7Result?.direction || 'long',
        }),
      });

      if (response.ok) {
        setAutoEmailDone(true);
        setEmailSent(true);
        // Redirect back to analyze page after showing success
        setTimeout(() => {
          router.push('/analyze#recent-analyses');
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
  }, [analysis, router]);

  // Trigger auto-email when analysis is loaded and email=true parameter is present
  useEffect(() => {
    const shouldAutoEmail = searchParams.get('email') === 'true';
    if (shouldAutoEmail && analysis && !loading && !autoEmailTriggered.current) {
      handleAutoEmail();
    }
  }, [searchParams, analysis, loading, handleAutoEmail]);

  // Auto-PDF handler for ?pdf=true parameter
  const handleAutoPdf = useCallback(async () => {
    if (!pageRef.current || !analysis || autoPdfTriggered.current) return;

    autoPdfTriggered.current = true;
    setAutoPdfInProgress(true);

    try {
      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Dynamic import jsPDF
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1400,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
            (clonedElement as HTMLElement).style.backgroundColor = '#ffffff';
            (clonedElement as HTMLElement).style.padding = '24px';
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

      const symbol = analysis.symbol || 'Analysis';
      const date = new Date().toISOString().split('T')[0];
      pdf.save(`TraderPath_${symbol}_${date}.pdf`);

      setAutoPdfDone(true);
      // Redirect back to analyze page after showing success
      setTimeout(() => {
        router.push('/analyze#recent-analyses');
      }, 2000);
    } catch (err) {
      console.error('Failed to auto generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
      setAutoPdfInProgress(false);
    }
  }, [analysis, router]);

  // Trigger auto-PDF when analysis is loaded and pdf=true parameter is present
  useEffect(() => {
    const shouldAutoPdf = searchParams.get('pdf') === 'true';
    if (shouldAutoPdf && analysis && !loading && !autoPdfTriggered.current) {
      handleAutoPdf();
    }
  }, [searchParams, analysis, loading, handleAutoPdf]);

  // Export as PNG (using blob for reliable downloads)
  const handleExportPNG = async () => {
    if (!pageRef.current || exporting || !analysis) return;

    setExporting(true);
    setExportDropdownOpen(false);
    try {
      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 3, // Higher quality for PNG
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1400,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
            // Ensure proper background for export
            (clonedElement as HTMLElement).style.backgroundColor = '#ffffff';
            (clonedElement as HTMLElement).style.padding = '24px';
          }
        },
      });

      // Use blob for reliable download (data URL can fail for large images)
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const symbol = analysis.symbol || 'Analysis';
        const date = new Date().toISOString().split('T')[0];
        link.download = `TraderPath_${symbol}_${date}.png`;
        link.href = url;
        link.click();
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  // Export as JPG (using blob for reliable downloads)
  const handleExportJPG = async () => {
    if (!pageRef.current || exporting || !analysis) return;

    setExporting(true);
    setExportDropdownOpen(false);
    try {
      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 2.5, // Good quality for JPG
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1400,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
            // Ensure proper background for export
            (clonedElement as HTMLElement).style.backgroundColor = '#ffffff';
            (clonedElement as HTMLElement).style.padding = '24px';
          }
        },
      });

      // Use blob for reliable download
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const symbol = analysis.symbol || 'Analysis';
        const date = new Date().toISOString().split('T')[0];
        link.download = `TraderPath_${symbol}_${date}.jpg`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 'image/jpeg', 0.95); // Higher quality
    } catch (err) {
      console.error('Failed to export JPG:', err);
      alert('Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  // Export as PDF
  const handleExportPDF = async () => {
    if (!pageRef.current || exporting || !analysis) return;

    setExporting(true);
    setExportDropdownOpen(false);
    try {
      // Dynamic import jsPDF
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 1400,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
            (clonedElement as HTMLElement).style.backgroundColor = '#ffffff';
            (clonedElement as HTMLElement).style.padding = '24px';
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

      const symbol = analysis.symbol || 'Analysis';
      const date = new Date().toISOString().split('T')[0];
      pdf.save(`TraderPath_${symbol}_${date}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  // Send via Email - downloads JPG and sends email
  const handleSendEmail = async () => {
    if (!pageRef.current || exporting || !analysis) return;

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
      const symbol = analysis.symbol || 'Analysis';
      const date = new Date().toISOString().split('T')[0];
      link.download = `TraderPath_${symbol}_${date}.jpg`;
      link.href = imageBase64;
      link.click();

      // Then send via email
      const response = await authFetch('/api/reports/email-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          symbol: analysis.symbol,
          interval: analysis.interval,
          screenshot: imageBase64,
          score: analysis.totalScore,
          direction: analysis.step5Result?.direction || analysis.step7Result?.direction || 'long',
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

  // Trade plan data (only 2 TPs: TP1 and TP2)
  const stopLossPrice = step5.stopLoss?.price || step5.stopLoss;
  const tp1 = step5.takeProfits?.[0]?.price || step5.takeProfit1;
  const tp2 = step5.takeProfits?.[1]?.price || step5.takeProfit2;

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
                <p className="text-gray-500 dark:text-slate-400">Your analysis screenshot has been sent to your email. Redirecting...</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-teal-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sending Email...</h2>
                <p className="text-gray-500 dark:text-slate-400">Capturing full analysis screenshot and sending to your email...</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Auto-PDF overlay - shows on top of page content */}
      {autoPdfInProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4">
            {autoPdfDone ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">PDF Downloaded!</h2>
                <p className="text-gray-500 dark:text-slate-400">Your analysis report has been saved as PDF. Redirecting...</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-red-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Generating PDF...</h2>
                <p className="text-gray-500 dark:text-slate-400">Creating your analysis report as PDF. This may take a moment...</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
        <div className="w-full max-w-4xl">
          {/* Back Button */}
        <Link href="/analyze" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analyze</span>
        </Link>

        {/* Main Card */}
        <div
          ref={pageRef}
          data-export-container
          className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 dark:border-transparent">
          {/* Export Header - TraderPath Branding (visible in export) */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {/* TraderPath Logo */}
              <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <rect x="60" y="60" width="180" height="180" rx="20" className="fill-green-500" />
                <rect x="272" y="60" width="180" height="180" rx="20" className="fill-red-500" />
                <rect x="60" y="272" width="180" height="180" rx="20" className="fill-red-500" />
                <rect x="272" y="272" width="180" height="180" rx="20" className="fill-green-500" />
              </svg>
              <span className="text-lg font-bold text-gray-900 dark:text-white">TraderPath</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">traderpath.io</span>
          </div>

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

          {/* 7. Final Verdict - Visual Trade Decision */}
          <div className="mb-6">
            <TradeDecisionVisual
              verdict={(step7.verdict || (step7.overallScore >= 7 ? 'go' : step7.overallScore >= 5 ? 'conditional_go' : step7.overallScore >= 3 ? 'wait' : 'avoid')) as 'go' | 'conditional_go' | 'wait' | 'avoid'}
              direction={direction as 'long' | 'short'}
              score={step7.overallScore || analysis.totalScore * 10 || 5}
              symbol={analysis.symbol}
              size="lg"
            />
          </div>

          {/* AI Recommendation */}
          <div className={cn(
            "rounded-xl p-4 mb-6",
            isLong ? "bg-green-50 dark:bg-green-500/10 border border-green-500/20" : "bg-red-50 dark:bg-red-500/10 border border-red-500/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={cn("w-5 h-5", isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} />
              <span className={cn("font-semibold", isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                AI Recommendation
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {step7.aiSummary || step7.summary || `Market conditions favor ${isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(entryPrice)} with ${step5.riskReward?.toFixed(1) || '2.0'}:1 risk-reward ratio. Set stop-loss at ${formatPrice(stopLossPrice)} to protect against downside.`}
            </p>
          </div>

          {/* Trade Plan Chart */}
          {entryPrice && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Trade Plan Chart</h3>
                <div className="flex items-center gap-2">
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
                      <span className="hidden sm:inline">{exporting ? 'Exporting...' : emailSent ? 'Sent!' : 'Export'}</span>
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
                          <button
                            onClick={handleExportPDF}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                          >
                            <FileText className="w-4 h-4 text-red-500" />
                            <div>
                              <div>Download PDF</div>
                              <div className="text-xs text-gray-400">Full Report</div>
                            </div>
                          </button>
                          <div className="border-t border-gray-200 dark:border-slate-700" />
                          <button
                            onClick={handleSendEmail}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                          >
                            <Mail className="w-4 h-4 text-purple-500" />
                            <div>
                              <div>Send via Email</div>
                              <div className="text-xs text-gray-400">Share Report</div>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div ref={chartRef} id="trade-plan-chart-visible" className="trade-plan-chart-container bg-white dark:bg-slate-800 rounded-xl p-2">
                <TradePlanChart
                  symbol={analysis.symbol}
                  direction={direction as 'long' | 'short'}
                  entries={[{ price: entryPrice, percentage: 100 }]}
                  stopLoss={{ price: stopLossPrice || 0, percentage: 0 }}
                  takeProfits={[tp1, tp2].filter(Boolean).map((tp, i) => ({
                    price: tp,
                    percentage: 0,
                    riskReward: step5.riskReward || (i + 1),
                  }))}
                  currentPrice={step2.currentPrice || entryPrice}
                  support={step2.levels?.support}
                  resistance={step2.levels?.resistance}
                  tradeType={getTradeType(analysis.interval)}
                  chartId="trade-plan-chart"
                  analysisTime={analysis.createdAt}
                />
              </div>
            </div>
          )}

          {/* Export Info */}
          {/* Footer - Copyright */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-center text-xs text-gray-500 dark:text-slate-400">
              © 2025 <span className="font-semibold text-teal-500">TraderPath</span>. All rights reserved.
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
