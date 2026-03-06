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
  Zap,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '../../../../../lib/utils';
import { CoinIcon } from '../../../../../components/common/CoinIcon';
import { TradePlanChart } from '../../../../../components/analysis/TradePlanChart';
import { TradeDecisionVisual } from '../../../../../components/analysis/TradeDecisionVisual';
import { WebResearchPanel } from '../../../../../components/analysis/WebResearchPanel';
import { PlanValidationBadge } from '../../../../../components/analysis/PlanValidationBadge';
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
  method?: string;
  step1Result?: Record<string, any>; // Market Pulse
  step2Result?: Record<string, any>; // Asset Scanner
  step3Result?: Record<string, any>; // Safety Check
  step4Result?: Record<string, any>; // Timing Analysis
  step5Result?: Record<string, any>; // Trade Plan
  step6Result?: Record<string, any>; // Trap Check
  step7Result?: Record<string, any>; // Final Verdict + ML Confirmation
}

function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

// Snapshot every lightweight-charts canvas inside `container` to a static <img>,
// then hide the originals so html2canvas never touches them (avoids the
// "createPattern on 0×0 canvas" error).  Returns a cleanup function that
// restores the originals and removes the temporary images.
function replaceCanvasesWithImages(container: HTMLElement): () => void {
  const ops: Array<() => void> = [];
  const canvases = container.querySelectorAll('canvas');

  canvases.forEach((canvas) => {
    const parent = canvas.parentElement;
    if (!parent) return;

    try {
      // Snapshot the visible canvas to a data-URL
      const dataUrl = canvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = `width:${canvas.offsetWidth}px;height:${canvas.offsetHeight}px;display:block;`;
      img.setAttribute('data-canvas-replacement', 'true');

      // Insert the image right before the canvas, then hide the canvas
      parent.insertBefore(img, canvas);
      (canvas as HTMLElement).style.display = 'none';

      ops.push(() => {
        (canvas as HTMLElement).style.display = '';
        if (img.parentNode) img.parentNode.removeChild(img);
      });
    } catch {
      // canvas tainted or not renderable – just hide it
      (canvas as HTMLElement).style.display = 'none';
      ops.push(() => { (canvas as HTMLElement).style.display = ''; });
    }
  });

  return () => ops.forEach((fn) => fn());
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
  const [downloadingSnapshot, setDownloadingSnapshot] = useState(false);
  const [autoSnapshotInProgress, setAutoSnapshotInProgress] = useState(false);
  const [autoSnapshotDone, setAutoSnapshotDone] = useState(false);
  const autoSnapshotTriggered = useRef(false);

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

  // Auto-snapshot handler for ?snapshot=true parameter
  const handleAutoSnapshot = useCallback(async () => {
    if (!pageRef.current || !analysis || autoSnapshotTriggered.current) return;

    autoSnapshotTriggered.current = true;
    setAutoSnapshotInProgress(true);

    try {
      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Snapshot canvases to static images so html2canvas can capture them
      const restoreCanvases = replaceCanvasesWithImages(pageRef.current);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(pageRef.current, {
          backgroundColor: '#0A0A0A',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          windowWidth: 1400,
          onclone: (clonedDoc) => {
            clonedDoc.documentElement.classList.add('dark');
            const clonedElement = clonedDoc.querySelector('[data-export-container]');
            if (clonedElement) {
              (clonedElement as HTMLElement).style.overflow = 'visible';
              (clonedElement as HTMLElement).style.backgroundColor = '#0A0A0A';
              (clonedElement as HTMLElement).style.color = '#e5e7eb';
              (clonedElement as HTMLElement).style.padding = '24px';
            }
          },
        });
      } finally {
        restoreCanvases();
      }

      // Download as PNG snapshot
      const link = document.createElement('a');
      link.download = `TraderPath_${analysis.symbol || 'Analysis'}_${new Date(analysis.createdAt || Date.now()).toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setAutoSnapshotDone(true);
      setTimeout(() => {
        setAutoSnapshotInProgress(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to auto generate snapshot:', err);
      alert('Failed to generate snapshot. Please try again.');
      setAutoSnapshotInProgress(false);
    }
  }, [analysis]);

  // Trigger auto-snapshot when analysis is loaded and snapshot=true parameter is present
  useEffect(() => {
    const shouldAutoSnapshot = searchParams.get('snapshot') === 'true';
    if (shouldAutoSnapshot && analysis && !loading && !autoSnapshotTriggered.current) {
      handleAutoSnapshot();
    }
  }, [searchParams, analysis, loading, handleAutoSnapshot]);

  // Download Snapshot PNG (dark mode capture)
  const handleDownloadSnapshot = async () => {
    if (!pageRef.current || downloadingSnapshot || !analysis) return;

    setDownloadingSnapshot(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Snapshot canvases to static images so html2canvas can capture them
      const restoreCanvases = replaceCanvasesWithImages(pageRef.current);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(pageRef.current, {
          backgroundColor: '#0A0A0A',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: false,
          removeContainer: true,
          imageTimeout: 5000,
          onclone: (clonedDoc) => {
            clonedDoc.documentElement.classList.add('dark');
            const clonedElement = clonedDoc.querySelector('[data-export-container]');
            if (clonedElement) {
              (clonedElement as HTMLElement).style.overflow = 'visible';
              (clonedElement as HTMLElement).style.backgroundColor = '#0A0A0A';
              (clonedElement as HTMLElement).style.color = '#e5e7eb';
            }
          },
        });
      } finally {
        restoreCanvases();
      }

      // Download as PNG snapshot
      const link = document.createElement('a');
      link.download = `TraderPath_${analysis.symbol || 'Analysis'}_${new Date(analysis.createdAt || Date.now()).toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download snapshot:', err);
      alert('Failed to download snapshot: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDownloadingSnapshot(false);
    }
  };

  const getTradeType = (interval: string): 'scalping' | 'dayTrade' | 'swing' => {
    if (interval === '5m' || interval === '15m') return 'scalping';
    if (interval === '30m' || interval === '1h' || interval === '2h' || interval === '4h') return 'dayTrade';
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
  const step1 = (analysis.step1Result || {}) as Record<string, any>;
  const step2 = (analysis.step2Result || {}) as Record<string, any>;
  const step3 = (analysis.step3Result || {}) as Record<string, any>;
  const step4 = (analysis.step4Result || {}) as Record<string, any>;
  const step5 = (analysis.step5Result || {}) as Record<string, any>;
  const step6 = (analysis.step6Result || {}) as Record<string, any>;
  const step7 = (analysis.step7Result || {}) as Record<string, any>;

  // Classic 7-Step: step5 is trade plan, step7 is verdict
  const rawDirection = (step5.direction || step7.direction || 'long');
  // Guard: rawDirection could be non-string from API response
  const direction = typeof rawDirection === 'string' ? rawDirection.toLowerCase() : 'long';
  const isNeutral = direction === 'neutral';
  const isLong = direction === 'long';
  const isShort = direction === 'short';
  const score = (analysis.totalScore || 0) * 10;

  // Determine verdict for display
  const getVerdict = () => {
    const classicScore = Number(step7.overallScore) || 0;
    if (step7.verdict && typeof step7.verdict === 'string') return step7.verdict.toUpperCase();
    if (classicScore >= 7) return 'GO';
    if (classicScore >= 5) return 'COND';
    if (classicScore >= 3) return 'WAIT';
    return 'AVOID';
  };
  const verdict = getVerdict();
  const isAvoidOrWait = verdict === 'AVOID' || verdict === 'WAIT';

  // Status labels - Classic 7-Step
  const marketStatus = step1.trend?.direction === 'bullish' ? 'Bullish' :
                 step1.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';
  const assetStatus = (step2.priceChange24h || 0) >= 2 ? 'Strong' :
                (step2.priceChange24h || 0) >= 0 ? 'Stable' :
                (step2.priceChange24h || 0) >= -2 ? 'Weak' : 'Declining';
  const safetyStatus = step3.riskLevel === 'low' ? 'Safe' :
                 step3.riskLevel === 'high' ? 'Risky' : 'Caution';
  const timingStatus = step4.tradeNow ? 'Good' : 'Wait';

  // Entry price from trade plan
  const entryPrice = step5.averageEntry || step5.entryPrice;
  const planStatus = entryPrice ? 'Ready' : 'Pending';

  // Trap status
  const trapStatus = step6.traps?.bullTrap || step6.traps?.bearTrap ? 'Warning' :
    step6.traps?.fakeoutRisk === 'high' ? 'Caution' : 'Clear';

  // ML Confirmation data (Step 8) - stored in step7Result.mlisConfirmation
  const mlisConfirmationData = step7.mlisConfirmation || null;
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
      {/* Auto-Snapshot overlay - shows on top of page content */}
      {autoSnapshotInProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl text-center max-w-md mx-4">
            {autoSnapshotDone ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Snapshot Downloaded!</h2>
                <p className="text-gray-500 dark:text-slate-400">Your analysis report has been saved as PNG snapshot.</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-teal-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Generating Snapshot...</h2>
                <p className="text-gray-500 dark:text-slate-400">Creating your analysis report as PNG snapshot. This may take a moment...</p>
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

            {/* Download Snapshot Button */}
            <button
              onClick={handleDownloadSnapshot}
              disabled={downloadingSnapshot}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg"
            >
              {downloadingSnapshot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{downloadingSnapshot ? 'Generating...' : 'Download Snapshot'}</span>
            </button>
          </div>

        {/* Main Card */}
        <div
          ref={pageRef}
          data-export-container
          className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200 dark:border-transparent">
          {/* Export Header - TraderPath Branding (visible in export) */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700" data-export-header>
            <div className="flex items-center gap-3">
              {/* TraderPath Logo - Star */}
              <StarLogo size={36} uniqueId="export-header" animated={false} />
              <div className="flex flex-col">
                <span data-brand-text className="text-xl font-bold">
                  <span style={{ color: '#14B8A6' }}>Trader</span>
                  <span style={{ color: '#F87171' }}>Path</span>
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 -mt-0.5">Asset Analysis Report</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">traderpath.io</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <CoinIcon symbol={analysis.symbol.replace(/USDT$/i, '')} size={48} className="w-10 h-10 sm:w-12 sm:h-12" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{analysis.symbol}{isNonCrypto ? '' : '/USDT'} Analysis</h1>
                  {/* Timeframe Badge */}
                  <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-full uppercase">
                    {analysis.interval || '4H'}
                  </span>
                  {mlisConfirmationData && confirmationStatus === 'CONFIRMED' && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full">
                      ML Confirmed
                    </span>
                  )}
                  {mlisConfirmationData && confirmationStatus === 'PARTIALLY_CONFIRMED' && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                      ML Partial
                    </span>
                  )}
                  {mlisConfirmationData && confirmationStatus === 'CONTRADICTED' && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                      ML Warning
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

          {/* Capital Flow Context Banner */}
          {(() => {
            const cfCtx = step5?.capitalFlowContext;
            const flowAligned = step7?.ragEnrichment?.capitalFlowAligned;
            if (!cfCtx && flowAligned == null) return null;

            const phase = (cfCtx?.phase || '').toUpperCase();
            const alignment = cfCtx?.marketAlignment || (flowAligned ? 'aligned' : flowAligned === false ? 'counter' : null);
            const action = (cfCtx?.action || '').toLowerCase();
            const bias = action === 'avoid' ? 'RISK OFF' : action === 'analyze' ? 'RISK ON' : 'NEUTRAL';
            const reason = cfCtx?.reason;

            return (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/50 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Capital Flow:</span>
                </div>

                {/* Alignment badge */}
                {alignment && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded font-semibold",
                    alignment === 'aligned'
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  )}>
                    {alignment === 'aligned' ? 'Aligned' : 'Counter-Flow'}
                  </span>
                )}

                {/* Phase badge */}
                {phase && ['EARLY', 'MID', 'LATE', 'EXIT'].includes(phase) && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded font-medium",
                    phase === 'EARLY' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                    phase === 'MID' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                    phase === 'LATE' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  )}>
                    {phase}
                  </span>
                )}

                {/* Liquidity bias */}
                <span className={cn(
                  "px-1.5 py-0.5 rounded font-medium",
                  bias === 'RISK ON' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                  bias === 'RISK OFF' ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                  "bg-slate-100 dark:bg-slate-600/40 text-slate-600 dark:text-slate-300"
                )}>
                  {bias}
                </span>

                {/* Short reason text */}
                {reason && (
                  <span className="text-slate-400 dark:text-slate-500 truncate max-w-[260px] hidden sm:inline" title={reason}>
                    {reason}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Info Cards - 7-Step Analysis + ML Confirmation */}
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
                  Fear & Greed: {step1.fearGreedIndex || 0} ({step1.fearGreedLabel || 'N/A'}) • BTC Dom: {Number(step1.btcDominance ?? 0).toFixed(1)}%
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
                  Price: {formatPrice(step2.currentPrice)} • 24h: {(step2.priceChange24h || 0) >= 0 ? '+' : ''}{Number(step2.priceChange24h ?? 0).toFixed(2)}%
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
                        {assetSentiment ? (assetSentiment.charAt(0).toUpperCase() + assetSentiment.slice(1)) : 'N/A'}
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
                        {String(interMarketRegime).replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
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
                      <span>MLIS: {mlisConfirmationData?.mlisRecommendation ?? 'N/A'} ({mlisConfirmationData?.mlisDirection ?? 'N/A'})</span>
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

          {/* TOP-DOWN EVIDENCE CHAIN */}
          {(() => {
            const cfCtx = step1?.capitalFlowContext;
            if (!cfCtx?.capitalFlowId) return null;

            const l1 = cfCtx.l1Summary;
            const l2 = cfCtx.l2Summary;
            const l3 = cfCtx.l3Summary;
            const l4 = cfCtx.l4Summary;
            const selectedMarket = l2?.find((m: { market: string; phase: string; flow7d: number }) => m.market === l3?.primaryMarket) || l2?.[0];

            // Determine each layer's pass/fail status
            const l1Pass = l1?.bias !== 'risk_off';
            const l2Pass = selectedMarket?.phase !== 'exit';
            const l3Pass = l3?.topSectors && l3.topSectors.length > 0;
            const l4Pass = l4?.action === 'analyze';
            const analysisPass = !isAvoidOrWait;
            const mlisPass = mlisConfirmationData ? confirmationStatus === 'CONFIRMED' || confirmationStatus === 'PARTIALLY_CONFIRMED' : null;

            const chainItems = [
              {
                label: 'L1 Global Liquidity',
                status: l1Pass,
                detail: l1 ? `${l1.bias === 'risk_on' ? 'Risk On' : l1.bias === 'risk_off' ? 'Risk Off' : 'Neutral'} (DXY ${l1.dxyTrend}, VIX ${l1.vixLevel})` : 'N/A',
              },
              {
                label: 'L2 Market Flow',
                status: l2Pass,
                detail: selectedMarket?.market ? `${selectedMarket.market.charAt(0).toUpperCase() + selectedMarket.market.slice(1)} – ${(selectedMarket.phase || 'mid').toUpperCase()} Phase (${((selectedMarket.flow7d ?? 0) >= 0 ? '+' : '')}${(selectedMarket.flow7d ?? 0).toFixed(1)}%)` : 'N/A',
              },
              {
                label: 'L3 Sector Activity',
                status: l3Pass,
                detail: l3?.topSectors?.join(', ') || 'N/A',
              },
              {
                label: 'L4 AI Recommendation',
                status: l4Pass,
                detail: l4 ? `${(cfCtx.direction || 'N/A')} (${l4.confidence ?? 0}% confidence)` : 'N/A',
              },
              {
                label: '7-Step Analysis',
                status: analysisPass,
                detail: `${verdict} (${score}/100)`,
              },
              ...(mlisPass != null ? [{
                label: 'ML Confirmation',
                status: mlisPass,
                detail: confirmationStatus === 'CONFIRMED' ? `Confirmed${confidenceChange > 0 ? ` (+${confidenceChange.toFixed(0)}%)` : ''}` :
                        confirmationStatus === 'PARTIALLY_CONFIRMED' ? 'Partial' : 'Contradicted',
              }] : []),
            ];

            const passCount = chainItems.filter(c => c.status === true).length;
            const totalCount = chainItems.length;

            return (
              <div className="mb-6 rounded-xl border-2 border-slate-200 dark:border-slate-600/50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-600/50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Top-Down Evidence Chain</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    passCount === totalCount ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" :
                    passCount >= totalCount - 1 ? "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" :
                    "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                  )}>
                    {passCount}/{totalCount} Aligned
                  </span>
                </div>
                {/* Chain Items */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {chainItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                          item.status === true ? "bg-green-500" :
                          item.status === false ? "bg-red-500" : "bg-gray-400"
                        )}>
                          {item.status === true ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : item.status === false ? (
                            <AlertTriangle className="w-3 h-3 text-white" />
                          ) : (
                            <Minus className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{item.label}</span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-slate-400 text-right max-w-[55%] overflow-hidden break-words">
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Final Verdict - Visual Trade Decision */}
          <div className="mb-6">
            <TradeDecisionVisual
              verdict={(step7.verdict || (Number(step7.overallScore) >= 7 ? 'go' : Number(step7.overallScore) >= 5 ? 'conditional_go' : Number(step7.overallScore) >= 3 ? 'wait' : 'avoid')) as 'go' | 'conditional_go' | 'wait' | 'avoid'}
              direction={isNeutral ? null : (isLong ? 'long' : 'short')}
              score={typeof step7.overallScore === 'number' ? step7.overallScore * 10 : (analysis.totalScore ?? 5) * 10}
              symbol={analysis.symbol}
              size="lg"
            />
          </div>

          {/* AI Recommendation */}
          <div className={cn(
            "rounded-xl p-4 mb-6",
            isNeutral ? "bg-gray-50 dark:bg-gray-500/10 border border-gray-500/20" :
            isLong ? "bg-green-50 dark:bg-green-500/10 border border-green-500/20" : "bg-red-50 dark:bg-red-500/10 border border-red-500/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={cn("w-5 h-5", isNeutral ? "text-gray-600 dark:text-gray-400" : isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} />
              <span className={cn("font-semibold", isNeutral ? "text-gray-600 dark:text-gray-400" : isLong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                AI Recommendation
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {step7.aiSummary || step7.summary || `Market conditions favor ${isNeutral ? 'sideways' : isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(entryPrice)} with ${typeof step5.riskReward === 'number' ? step5.riskReward.toFixed(1) : '2.0'}:1 risk-reward ratio. Set stop-loss at ${formatPrice(stopLossPrice)} to protect against downside.`}
            </p>
          </div>

          {/* Trade Plan Chart */}
          {entryPrice && !isNeutral && (
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
                    riskReward: step5.takeProfits?.[i]?.riskReward
                      || (stopLossPrice && entryPrice ? parseFloat((Math.abs(tp - entryPrice) / Math.abs(entryPrice - stopLossPrice)).toFixed(1)) : (i + 1)),
                  }))}
                  currentPrice={step2.currentPrice || entryPrice}
                  support={step2.levels?.support}
                  resistance={step2.levels?.resistance}
                  forecastBands={step7?.ragEnrichment?.forecastBands || []}
                  fibonacciLevels={step4?.fibonacci?.levels || []}
                  elliottWave={step2?.elliottWave}
                  tradeType={getTradeType(analysis.interval)}
                  interval={analysis.interval}
                  chartId="trade-plan-chart"
                  analysisTime={analysis.createdAt}
                  tradePlanStatus={step5.tradePlanStatus}
                  tradePlanMessage={step5.tradePlanMessage}
                />
              </div>
            </div>
          )}

          {/* RAG Enrichment Layer - Web Research, Forecast Bands, Multi-Strategy, Validation */}
          {step7?.ragEnrichment && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">RAG Intelligence Layer</h2>
                {step7.ragEnrichment.capitalFlowAligned != null && (
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${step7.ragEnrichment.capitalFlowAligned ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {step7.ragEnrichment.capitalFlowAligned ? 'Flow Aligned' : 'Counter-Flow'}
                  </span>
                )}
              </div>

              {/* Plan Validation Badge */}
              <PlanValidationBadge
                validation={step7.ragEnrichment.validation}
                capitalFlowAligned={step7.ragEnrichment.capitalFlowAligned}
              />

              {/* Web Research */}
              <WebResearchPanel research={step7.ragEnrichment.research} />

              {/* Multi-Strategy Plans → Detaylı Rapor'da gösterilir */}
              {/* Forecast Bands → TradePlanChart overlay olarak gösterilir (P10/P50/P90 çizgiler) */}
            </div>
          )}

          {/* Footer - Copyright */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-center text-xs text-gray-500 dark:text-slate-400">
              © 2026 <span className="font-semibold text-teal-500">TraderPath</span>. All rights reserved.
            </p>
            <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-1">
              For informational and educational purposes only. Not financial advice. Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
