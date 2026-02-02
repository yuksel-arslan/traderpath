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
  Minus,
  Globe,
  Shield,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Search,
  Crosshair,
  Check,
  FileText,
  Mail,
  Zap,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '../../../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../../../lib/coin-icons';
import { TradePlanChart } from '../../../../../components/analysis/TradePlanChart';
import { TradeDecisionVisual } from '../../../../../components/analysis/TradeDecisionVisual';
import { StarLogo } from '../../../../../components/common/TraderPathLogo';
import { authFetch } from '../../../../../lib/api';

interface AnalysisData {
  id: string;
  symbol: string;
  interval: string;
  totalScore: number;
  createdAt: string;
  expiresAt: string;
  outcome?: string;
  method?: 'classic' | 'mlis_pro'; // Analysis method
  step1Result?: any; // Market Pulse (Classic) or Technical (MLIS)
  step2Result?: any; // Asset Scanner (Classic) or Momentum (MLIS)
  step3Result?: any; // Safety Check (Classic) or Volatility (MLIS)
  step4Result?: any; // Timing Analysis (Classic) or Volume (MLIS)
  step5Result?: any; // Trade Plan (Classic) or Verdict (MLIS)
  step6Result?: any; // Trap Check (Classic only)
  step7Result?: any; // Final Verdict (Classic only)
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
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

  // Download PDF (dark mode capture)
  const handleDownloadPdf = async () => {
    if (!pageRef.current || downloadingPdf || !analysis) return;

    setDownloadingPdf(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Dynamic import jsPDF
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#0f172a', // Dark mode background
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        removeContainer: true,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          // Force dark mode styles on cloned element
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
            (clonedElement as HTMLElement).style.backgroundColor = '#1e293b';
            (clonedElement as HTMLElement).style.color = '#ffffff';
            clonedElement.classList.add('dark');
          }
          // Add dark class to root for Tailwind dark mode
          clonedDoc.documentElement.classList.add('dark');
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
      console.error('Failed to download PDF:', err);
      alert('Failed to download PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Send Email with PDF attachment
  const handleEmailReport = async () => {
    if (!pageRef.current || sendingEmail || !analysis) return;

    setSendingEmail(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Dynamic import jsPDF
      const { jsPDF } = await import('jspdf');

      // Capture in dark mode
      const canvas = await html2canvas(pageRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        removeContainer: true,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-container]');
          if (clonedElement) {
            (clonedElement as HTMLElement).style.overflow = 'visible';
            (clonedElement as HTMLElement).style.backgroundColor = '#1e293b';
            (clonedElement as HTMLElement).style.color = '#ffffff';
            clonedElement.classList.add('dark');
          }
          clonedDoc.documentElement.classList.add('dark');
        },
      });

      // Generate PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

      // Get PDF as base64
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      // Send email with PDF attachment
      const response = await authFetch('/api/reports/email-pdf-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          symbol: analysis.symbol,
          interval: analysis.interval,
          pdfBase64,
          score: analysis.totalScore,
          direction: analysis.step5Result?.direction || analysis.step7Result?.direction || 'long',
          verdict: isMLIS
            ? (mlisRecommendation === 'STRONG_BUY' || mlisRecommendation === 'BUY' ? 'GO' :
               mlisRecommendation === 'HOLD' ? 'WAIT' : 'AVOID')
            : (step7.verdict?.toUpperCase() || 'WAIT'),
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
      alert('Failed to send email: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSendingEmail(false);
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


  // Detect if this is MLIS Pro analysis
  const isMLIS = analysis.method === 'mlis_pro' || analysis.step1Result?.mlis === true;

  // Extract data from steps
  const step1 = analysis.step1Result || {};
  const step2 = analysis.step2Result || {};
  const step3 = analysis.step3Result || {};
  const step4 = analysis.step4Result || {};
  const step5 = analysis.step5Result || {};
  const step6 = analysis.step6Result || {};
  const step7 = analysis.step7Result || {};

  // For MLIS: step7 contains the final verdict with direction
  // For Classic: step5 is trade plan, step7 is verdict
  // Note: MLIS can return 'neutral' direction when confidence is low
  const rawDirection = isMLIS
    ? (step7.direction || step5.direction || 'neutral')
    : (step5.direction || step7.direction || 'long');
  const direction = rawDirection.toLowerCase();
  const isNeutral = direction === 'neutral';
  const isLong = direction === 'long';
  const isShort = direction === 'short';
  const score = (analysis.totalScore || 0) * 10;

  // MLIS-specific data - MUST read from step7Result where verdict data is stored
  const mlisRecommendation = isMLIS ? (step7.recommendation || step5.recommendation) : null;
  const mlisConfidence = isMLIS ? (step7.confidence ?? step5.confidence ?? 0) : null;
  const mlisRiskLevel = isMLIS ? (step7.riskLevel || step5.riskLevel || 'medium') : null;
  const mlisKeySignals = isMLIS ? (step7.keySignals || step5.keySignals || []) : [];
  const mlisRiskFactors = isMLIS ? (step7.riskFactors || step5.riskFactors || []) : [];

  // Determine verdict for display
  const getVerdict = () => {
    if (isMLIS) {
      if (mlisRecommendation === 'STRONG_BUY' || mlisRecommendation === 'BUY') return 'GO';
      if (mlisRecommendation === 'HOLD') return 'WAIT';
      if (mlisRecommendation === 'SELL' || mlisRecommendation === 'STRONG_SELL') return 'AVOID';
      return 'WAIT';
    }
    // Classic analysis
    const classicScore = Number(step7.overallScore) || 0;
    if (step7.verdict) return step7.verdict.toUpperCase();
    if (classicScore >= 7) return 'GO';
    if (classicScore >= 5) return 'COND';
    if (classicScore >= 3) return 'WAIT';
    return 'AVOID';
  };
  const verdict = getVerdict();
  const isAvoidOrWait = verdict === 'AVOID' || verdict === 'WAIT';

  // Status labels - different for MLIS vs Classic
  let marketStatus, assetStatus, safetyStatus, timingStatus;

  if (isMLIS) {
    // MLIS: Technical, Momentum, Volatility, Volume layers
    const technicalSignal = step1.signal?.toUpperCase() || 'NEUTRAL';
    const momentumSignal = step2.signal?.toUpperCase() || 'NEUTRAL';
    const volatilitySignal = step3.signal?.toUpperCase() || 'NEUTRAL';
    const volumeSignal = step4.signal?.toUpperCase() || 'NEUTRAL';

    marketStatus = technicalSignal === 'BULLISH' ? 'Bullish' :
                   technicalSignal === 'BEARISH' ? 'Bearish' : 'Neutral';
    assetStatus = momentumSignal === 'BULLISH' ? 'Strong' :
                  momentumSignal === 'BEARISH' ? 'Weak' : 'Neutral';
    safetyStatus = volatilitySignal === 'LOW' || step3.score >= 60 ? 'Stable' :
                   volatilitySignal === 'HIGH' || step3.score < 40 ? 'Volatile' : 'Moderate';
    timingStatus = volumeSignal === 'BULLISH' || step4.score >= 60 ? 'Good' : 'Wait';
  } else {
    // Classic: Market Pulse, Asset Scanner, Safety Check, Timing
    marketStatus = step1.trend?.direction === 'bullish' ? 'Bullish' :
                   step1.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';
    assetStatus = (step2.priceChange24h || 0) >= 2 ? 'Strong' :
                  (step2.priceChange24h || 0) >= 0 ? 'Stable' :
                  (step2.priceChange24h || 0) >= -2 ? 'Weak' : 'Declining';
    safetyStatus = step3.riskLevel === 'low' ? 'Safe' :
                   step3.riskLevel === 'high' ? 'Risky' : 'Caution';
    timingStatus = step4.tradeNow ? 'Good' : 'Wait';
  }

  // Entry price - for MLIS it might not have a trade plan
  const entryPrice = isMLIS ? null : (step5.averageEntry || step5.entryPrice);
  const planStatus = entryPrice ? 'Ready' : (isMLIS ? 'N/A' : 'Pending');

  // Trap status - only for Classic
  const trapStatus = isMLIS ? 'N/A' : (
    step6.traps?.bullTrap || step6.traps?.bearTrap ? 'Warning' :
    step6.traps?.fakeoutRisk === 'high' ? 'Caution' : 'Clear'
  );

  // MLIS Confirmation data (Step 8) - only for Classic with trade plan
  const mlisConfirmationData = !isMLIS && step7.mlisConfirmation ? step7.mlisConfirmation : null;
  const confirmationStatus = mlisConfirmationData?.confirmationStatus || null;
  const agreementLevel = mlisConfirmationData?.agreementLevel || null;
  const confidenceChange = mlisConfirmationData?.confidenceChange || 0;

  const macdDesc = (step2.indicators?.macd?.histogram || 0) > 0 ? 'Bullish crossover' : 'Bearish momentum';

  // Asset-specific context for non-crypto assets (metals, stocks, bonds)
  const assetContext = step2.assetContext || null;
  const isNonCrypto = assetContext?.assetClass && assetContext.assetClass !== 'crypto';
  const assetClassLabel = assetContext?.assetClass ?
    assetContext.assetClass.charAt(0).toUpperCase() + assetContext.assetClass.slice(1) : null;
  const assetSentiment = assetContext?.metrics?.sentiment || null;
  const assetSentimentScore = assetContext?.metrics?.sentimentScore || 0;
  const assetKeyDrivers = assetContext?.keyDrivers || [];
  const assetWarnings = assetContext?.warnings || [];
  const interMarketRegime = assetContext?.interMarketContext?.regime || null;
  const regimeConfidence = assetContext?.interMarketContext?.regimeConfidence || 0;

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
          {/* Header with Back Button and Export - OUTSIDE pageRef for clean screenshots */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/analyze" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Analyze</span>
            </Link>

            {/* Download PDF and Email Report Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>{downloadingPdf ? 'Generating...' : 'Download PDF'}</span>
              </button>
              <button
                onClick={handleEmailReport}
                disabled={sendingEmail}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50",
                  emailSent
                    ? "bg-green-500 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                )}
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : emailSent ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>{sendingEmail ? 'Sending...' : emailSent ? 'Sent!' : 'Email Report'}</span>
              </button>
            </div>
          </div>

        {/* Main Card */}
        <div
          ref={pageRef}
          data-export-container
          className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 dark:border-transparent">
          {/* Export Header - TraderPath Branding (visible in export) */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {/* TraderPath Logo - Star */}
              <StarLogo size={32} uniqueId="export-header" animated={false} />
              <span className="text-lg font-bold bg-gradient-to-r from-teal-500 via-emerald-400 to-coral-500 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #14B8A6, #2DD4BF, #F87171, #EF5A6F)' }}>TraderPath</span>
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
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{analysis.symbol}/USDT Analysis</h1>
                  {isMLIS && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full">
                      MLIS Pro
                    </span>
                  )}
                </div>
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
            <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end flex-wrap">
              {/* Show verdict badge - AVOID/WAIT takes priority over direction */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
                verdict === 'GO' ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" :
                verdict === 'COND' ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" :
                verdict === 'WAIT' ? "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" :
                verdict === 'AVOID' ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                isNeutral ? "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400" :
                (isLong ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400")
              )}>
                {verdict === 'GO' ? <TrendingUp className="w-4 h-4" /> :
                 verdict === 'AVOID' ? <AlertTriangle className="w-4 h-4" /> :
                 verdict === 'WAIT' ? <Clock className="w-4 h-4" /> :
                 verdict === 'COND' ? <Target className="w-4 h-4" /> :
                 isNeutral ? <Minus className="w-4 h-4" /> :
                 (isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />)}
                {verdict === 'GO' ? 'GO' :
                 verdict === 'COND' ? 'CONDITIONAL' :
                 verdict === 'WAIT' ? 'WAIT' :
                 verdict === 'AVOID' ? 'AVOID' :
                 isNeutral ? 'NEUTRAL' :
                 (isLong ? 'BULLISH' : 'BEARISH')}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{score}/100</div>
            </div>
          </div>

          {/* Info Cards - Different layouts for MLIS vs Classic */}
          {isMLIS ? (
            /* MLIS Pro: 5 Layer Cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              {/* 1. Technical Layer */}
              <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-4 border border-violet-200 dark:border-violet-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Technical</span>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    step1.signal?.toUpperCase() === 'BULLISH' ? 'text-green-600 dark:text-green-400' :
                    step1.signal?.toUpperCase() === 'BEARISH' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                  )}>{step1.signal || 'Neutral'}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Score: {typeof step1.score === 'number' ? step1.score.toFixed(0) : (Number(step1.score) || 0)}/100 • {step1.reasoning || 'Technical analysis complete'}
                </p>
              </div>

              {/* 2. Momentum Layer */}
              <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Momentum</span>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    step2.signal?.toUpperCase() === 'BULLISH' ? 'text-green-600 dark:text-green-400' :
                    step2.signal?.toUpperCase() === 'BEARISH' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                  )}>{step2.signal || 'Neutral'}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Score: {typeof step2.score === 'number' ? step2.score.toFixed(0) : (Number(step2.score) || 0)}/100 • {step2.reasoning || 'Momentum analysis complete'}
                </p>
              </div>

              {/* 3. Volatility Layer */}
              <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4 border border-indigo-200 dark:border-indigo-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Volatility</span>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    step3.signal?.toUpperCase() === 'LOW' || step3.score >= 60 ? 'text-green-600 dark:text-green-400' :
                    step3.signal?.toUpperCase() === 'HIGH' || step3.score < 40 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                  )}>{step3.signal || 'Moderate'}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Score: {typeof step3.score === 'number' ? step3.score.toFixed(0) : (Number(step3.score) || 0)}/100 • {step3.reasoning || 'Volatility analysis complete'}
                </p>
              </div>

              {/* 4. Volume Layer */}
              <div className="bg-fuchsia-50 dark:bg-fuchsia-500/10 rounded-xl p-4 border border-fuchsia-200 dark:border-fuchsia-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-fuchsia-500 dark:text-fuchsia-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Volume</span>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    step4.signal?.toUpperCase() === 'BULLISH' ? 'text-green-600 dark:text-green-400' :
                    step4.signal?.toUpperCase() === 'BEARISH' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                  )}>{step4.signal || 'Neutral'}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Score: {typeof step4.score === 'number' ? step4.score.toFixed(0) : (Number(step4.score) || 0)}/100 • {step4.reasoning || 'Volume analysis complete'}
                </p>
              </div>

              {/* 5. MLIS Confidence & Risk */}
              <div className="sm:col-span-2 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 rounded-xl p-4 border border-violet-200 dark:border-violet-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="font-medium text-gray-900 dark:text-white">MLIS Verdict</span>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-bold",
                    mlisRecommendation === 'STRONG_BUY' ? 'bg-green-500 text-white' :
                    mlisRecommendation === 'BUY' ? 'bg-green-400 text-white' :
                    mlisRecommendation === 'HOLD' ? 'bg-yellow-400 text-black' :
                    mlisRecommendation === 'SELL' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                  )}>{mlisRecommendation || 'HOLD'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Confidence</span>
                    <p className="font-semibold text-gray-900 dark:text-white">{typeof mlisConfidence === 'number' ? mlisConfidence.toFixed(0) : (Number(mlisConfidence) || 0)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Risk Level</span>
                    <p className={cn(
                      "font-semibold",
                      mlisRiskLevel === 'low' ? 'text-green-600 dark:text-green-400' :
                      mlisRiskLevel === 'high' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                    )}>{mlisRiskLevel || 'Medium'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Direction</span>
                    <p className={cn(
                      "font-semibold",
                      isNeutral ? 'text-gray-600 dark:text-gray-400' :
                      isLong ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>{isNeutral ? 'NEUTRAL' : isLong ? 'LONG' : 'SHORT'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Score</span>
                    <p className="font-semibold text-violet-600 dark:text-violet-400">{score}/100</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Classic: 6 Step Cards */
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

              {/* Asset-Specific Context - Only for non-crypto (metals, stocks, bonds) */}
              {isNonCrypto && assetContext?.metrics && (
                <div className={cn(
                  "bg-gradient-to-br rounded-xl p-4 border-2 col-span-1 sm:col-span-2",
                  assetSentiment === 'bullish' ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-500/30' :
                  assetSentiment === 'bearish' ? 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-500/30' :
                  'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-500/30'
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                        assetContext.assetClass === 'metals' ? 'bg-amber-500' :
                        assetContext.assetClass === 'stocks' ? 'bg-blue-500' : 'bg-green-500'
                      )}>
                        {assetContext.assetClass === 'metals' ? '⚜️' :
                         assetContext.assetClass === 'stocks' ? '📈' : '📊'}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {assetClassLabel} Analysis
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-slate-300">
                        Asset-Specific
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-bold",
                        assetSentiment === 'bullish' ? 'text-green-600 dark:text-green-400' :
                        assetSentiment === 'bearish' ? 'text-red-600 dark:text-red-400' :
                        'text-amber-600 dark:text-amber-400'
                      )}>
                        {assetSentiment?.charAt(0).toUpperCase() + assetSentiment?.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        ({assetSentimentScore}/100)
                      </span>
                    </div>
                  </div>

                  {/* Key Drivers */}
                  {assetKeyDrivers.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wide">Key Drivers</span>
                      <ul className="mt-1 space-y-1">
                        {assetKeyDrivers.slice(0, 3).map((driver: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              assetSentiment === 'bullish' ? 'bg-green-500' :
                              assetSentiment === 'bearish' ? 'bg-red-500' : 'bg-amber-500'
                            )} />
                            {driver}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Inter-Market Regime */}
                  {interMarketRegime && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="text-gray-500 dark:text-slate-400">Market Regime:</span>
                      <span className={cn(
                        "font-medium px-2 py-0.5 rounded text-xs",
                        interMarketRegime === 'risk_on' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' :
                        interMarketRegime === 'risk_off' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                        interMarketRegime === 'inflation' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' :
                        interMarketRegime === 'deflation' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
                      )}>
                        {interMarketRegime.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        {regimeConfidence >= 50 && ` (${regimeConfidence}%)`}
                      </span>
                    </div>
                  )}

                  {/* Warnings */}
                  {assetWarnings.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      {assetWarnings.map((warning: string, i: number) => (
                        <p key={i} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

              {/* 8. ML Confirmation - MLIS validation of 7-Step verdict */}
              {mlisConfirmationData && (
                <div className={cn(
                  "bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border-2",
                  confirmationStatus === 'CONFIRMED' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-500/10' :
                  confirmationStatus === 'PARTIALLY_CONFIRMED' ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-500/10' :
                  confirmationStatus === 'CONTRADICTED' ? 'border-red-500/50 bg-red-50/50 dark:bg-red-500/10' :
                  'border-gray-200 dark:border-transparent'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className={cn(
                        "w-4 h-4",
                        confirmationStatus === 'CONFIRMED' ? 'text-green-500' :
                        confirmationStatus === 'PARTIALLY_CONFIRMED' ? 'text-blue-500' :
                        confirmationStatus === 'CONTRADICTED' ? 'text-red-500' :
                        'text-gray-500'
                      )} />
                      <span className="font-medium text-gray-900 dark:text-white">ML Confirmation</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">Step 8</span>
                    </div>
                    <span className={cn(
                      "text-sm font-semibold",
                      confirmationStatus === 'CONFIRMED' ? 'text-green-600 dark:text-green-400' :
                      confirmationStatus === 'PARTIALLY_CONFIRMED' ? 'text-blue-600 dark:text-blue-400' :
                      confirmationStatus === 'CONTRADICTED' ? 'text-red-600 dark:text-red-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    )}>
                      {confirmationStatus === 'CONFIRMED' ? '✓ Confirmed' :
                       confirmationStatus === 'PARTIALLY_CONFIRMED' ? '~ Partial' :
                       confirmationStatus === 'CONTRADICTED' ? '✗ Contradicted' :
                       '○ Unconfirmed'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <span>MLIS: {mlisConfirmationData.mlisRecommendation} ({mlisConfirmationData.mlisDirection})</span>
                      {confidenceChange !== 0 && (
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          confidenceChange > 0 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' :
                          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                        )}>
                          {confidenceChange > 0 ? '+' : ''}{confidenceChange.toFixed(0)}% conf
                        </span>
                      )}
                    </div>
                    <p className="text-xs">{mlisConfirmationData.agreementReason}</p>
                    {mlisConfirmationData.warningMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                        {mlisConfirmationData.warningMessage}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final Verdict - Visual Trade Decision */}
          <div className="mb-6">
            {isMLIS ? (
              <TradeDecisionVisual
                verdict={mlisRecommendation === 'STRONG_BUY' || mlisRecommendation === 'BUY' ? 'go' :
                         mlisRecommendation === 'HOLD' ? 'wait' : 'avoid'}
                direction={isNeutral ? null : (isLong ? 'long' : 'short')}
                score={Number(step7.overallScore) || Number(analysis.totalScore) * 10 || 50}
                confidence={typeof mlisConfidence === 'number' ? mlisConfidence : Number(mlisConfidence) || 0}
                riskLevel={mlisRiskLevel}
                isMLISPro={true}
                symbol={analysis.symbol}
                size="lg"
              />
            ) : (
              <TradeDecisionVisual
                verdict={(step7.verdict || (Number(step7.overallScore) >= 7 ? 'go' : Number(step7.overallScore) >= 5 ? 'conditional_go' : Number(step7.overallScore) >= 3 ? 'wait' : 'avoid')) as 'go' | 'conditional_go' | 'wait' | 'avoid'}
                direction={isNeutral ? null : (isLong ? 'long' : 'short')}
                score={Number(step7.overallScore) * 10 || Number(analysis.totalScore) * 10 || 50}
                symbol={analysis.symbol}
                size="lg"
              />
            )}
          </div>

          {/* AI Recommendation / Key Signals */}
          <div className={cn(
            "rounded-xl p-4 mb-6",
            isMLIS
              ? "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border border-violet-200 dark:border-violet-500/20"
              : (isLong ? "bg-green-50 dark:bg-green-500/10 border border-green-500/20" : "bg-red-50 dark:bg-red-500/10 border border-red-500/20")
          )}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={cn("w-5 h-5", isMLIS ? "text-violet-600 dark:text-violet-400" : (isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"))} />
              <span className={cn("font-semibold", isMLIS ? "text-violet-600 dark:text-violet-400" : (isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"))}>
                {isMLIS ? 'MLIS Pro Analysis' : 'AI Recommendation'}
              </span>
            </div>
            {isMLIS ? (
              <div className="space-y-3">
                {mlisKeySignals && mlisKeySignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Key Signals:</p>
                    <ul className="text-sm text-gray-600 dark:text-slate-300 list-disc list-inside">
                      {mlisKeySignals.slice(0, 3).map((signal: string, idx: number) => (
                        <li key={idx}>{signal}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {mlisRiskFactors && mlisRiskFactors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Risk Factors:</p>
                    <ul className="text-sm text-gray-600 dark:text-slate-300 list-disc list-inside">
                      {mlisRiskFactors.slice(0, 3).map((factor: string, idx: number) => (
                        <li key={idx}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!mlisKeySignals?.length && !mlisRiskFactors?.length && (
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {(mlisConfidence ?? 0) < 30 ? (
                      <>MLIS Pro analysis has <strong>low confidence ({(mlisConfidence ?? 0).toFixed(0)}%)</strong>. Insufficient data for reliable recommendation. Consider waiting for better market conditions.</>
                    ) : (
                      <>MLIS Pro analysis recommends <strong>{mlisRecommendation || 'HOLD'}</strong> with {(mlisConfidence ?? 0).toFixed(0)}% confidence. Direction: <strong>{isNeutral ? 'NEUTRAL' : isLong ? 'LONG' : 'SHORT'}</strong>. Risk level: <strong>{mlisRiskLevel || 'Medium'}</strong>.</>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {step7.aiSummary || step7.summary || `Market conditions favor ${isNeutral ? 'sideways' : isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(entryPrice)} with ${typeof step5.riskReward === 'number' ? step5.riskReward.toFixed(1) : '2.0'}:1 risk-reward ratio. Set stop-loss at ${formatPrice(stopLossPrice)} to protect against downside.`}
              </p>
            )}
          </div>

          {/* Trade Plan Chart - Only for Classic (MLIS doesn't have trade plan) */}
          {!isMLIS && entryPrice && !isNeutral && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Trade Plan Chart</h3>
              <div ref={chartRef} id="trade-plan-chart-visible" className="trade-plan-chart-container bg-white dark:bg-slate-800 rounded-xl p-2">
                <TradePlanChart
                  symbol={analysis.symbol}
                  direction={(isLong ? 'long' : 'short') as 'long' | 'short'}
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
              © 2026 <span className="font-semibold text-teal-500">TraderPath</span>. All rights reserved.
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
