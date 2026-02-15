'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '../../../lib/api';
import {
  Search, CheckCircle2, Circle, Loader2, AlertTriangle,
  TrendingUp, TrendingDown, Minus,
  Globe, BarChart3, Activity, Brain, Sparkles, Shield, FileText,
  ArrowUpRight, ArrowDownRight, Clock, Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface StepDef {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  { id: 'capital_flow', label: 'Capital Flow', description: 'Collecting capital flow data', icon: Globe },
  { id: 'fundamentals', label: 'Fundamentals', description: 'Fetching fundamental data', icon: BarChart3 },
  { id: 'technical_data', label: 'Technical Data', description: 'Fetching OHLCV price history', icon: Activity },
  { id: 'sentiment', label: 'Sentiment', description: 'Collecting sentiment data', icon: Sparkles },
  { id: 'technical_analysis', label: 'Technical Analysis', description: 'Calculating indicators', icon: Brain },
  { id: 'ai_predictions', label: 'AI Predictions', description: 'Generating price predictions', icon: Zap },
  { id: 'expert_validation', label: 'Expert Validation', description: 'Validating with AI experts', icon: Shield },
  { id: 'report_generation', label: 'Report', description: 'Generating report', icon: FileText },
];

interface PipelineProgress {
  sessionId: string;
  symbol: string;
  assetClass: string;
  status: 'running' | 'completed' | 'failed';
  steps: { step: string; status: string; startedAt?: number; completedAt?: number; error?: string }[];
  currentStep: string | null;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

// ============================================================================
// WRAPPER - Suspense boundary for useSearchParams
// ============================================================================

export default function UnifiedReportPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    }>
      <UnifiedReportPage />
    </Suspense>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function UnifiedReportPage() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams?.get('symbol') || '';

  const [symbol, setSymbol] = useState(initialSymbol);
  const [inputValue, setInputValue] = useState(initialSymbol);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Start analysis
  const startAnalysis = useCallback(async (sym: string) => {
    if (!sym.trim()) return;

    setIsStarting(true);
    setError(null);
    setReport(null);
    setProgress(null);
    setSymbol(sym.trim().toUpperCase());

    try {
      const res = await authFetch('/api/unified-analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`Server error (${res.status}): ${text.slice(0, 200)}`);
        setIsStarting(false);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to start analysis');
        setIsStarting(false);
        return;
      }

      setSessionId(data.data.sessionId);
      startPolling(data.data.sessionId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message || 'Network error');
    } finally {
      setIsStarting(false);
    }
  }, []);

  // Auto-start if symbol in URL
  useEffect(() => {
    if (initialSymbol && !sessionId) {
      startAnalysis(initialSymbol);
    }
  }, [initialSymbol]);

  // Poll for progress
  const startPolling = useCallback((sid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch(`/api/unified-analysis/status/${sid}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success) return;

        setProgress(data.data);

        if (data.data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          fetchReport(sid);
        } else if (data.data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(data.data.error || 'Analysis failed');
        }
      } catch {
        // Ignore polling errors
      }
    }, 1500);

    // Timeout after 5 minutes
    setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
    }, 5 * 60 * 1000);
  }, []);

  // Fetch completed report
  const fetchReport = useCallback(async (sid: string) => {
    try {
      const res = await authFetch(`/api/unified-analysis/report/${sid}`);
      if (!res.ok) {
        setError(`Failed to load report (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      } else {
        setError(data.error || 'Failed to load report');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message || 'Failed to load report');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      startAnalysis(inputValue.trim());
    }
  };

  const handleReset = () => {
    setError(null);
    setSessionId(null);
    setProgress(null);
    setReport(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e1a]">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#0d1221]">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Unified Analysis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multi-horizon analysis with AI predictions and expert validation
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Search Bar */}
        {!sessionId && (
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                placeholder="Enter symbol (BTC, AAPL, GLD, TLT...)"
                className="w-full pl-12 pr-32 py-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isStarting}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-lg disabled:opacity-50 hover:from-teal-600 hover:to-cyan-600 transition-all"
              >
                {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze'}
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
            <button onClick={handleReset} className="mt-2 text-sm text-red-500 hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Pipeline Progress */}
        {progress && !report && (
          <PipelineProgressView progress={progress} symbol={symbol} />
        )}

        {/* Report */}
        {report && (
          <>
            <div className="mb-4 flex justify-end">
              <button onClick={handleReset} className="text-sm text-teal-500 hover:underline">
                New Analysis
              </button>
            </div>
            <ReportView report={report} />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PIPELINE PROGRESS VIEW
// ============================================================================

function PipelineProgressView({ progress, symbol }: { progress: PipelineProgress; symbol: string }) {
  const completedCount = progress.steps.filter(s => s.status === 'completed').length;
  const totalSteps = progress.steps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {/* Symbol Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
            {(symbol || '??').slice(0, 2)}
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-900 dark:text-white">{symbol || 'Loading...'}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{progress.assetClass || 'unknown'}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {completedCount}/{totalSteps} steps completed
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((stepDef) => {
          const stepProgress = progress.steps.find(s => s.step === stepDef.id);
          const status = stepProgress?.status || 'pending';
          const Icon = stepDef.icon;

          return (
            <div
              key={stepDef.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                status === 'running'
                  ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 scale-[1.02]'
                  : status === 'completed'
                    ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 opacity-70'
                    : status === 'failed'
                      ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                      : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/5 opacity-40'
              }`}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-teal-500" />
                ) : status === 'running' ? (
                  <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                ) : status === 'failed' ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              {/* Step Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                status === 'running'
                  ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400'
                  : status === 'completed'
                    ? 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500'
              }`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${
                  status === 'running' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {stepDef.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {status === 'running' ? stepDef.description + '...' : stepDef.description}
                </div>
              </div>

              {/* Duration */}
              {stepProgress?.completedAt && stepProgress?.startedAt && (
                <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                  {((stepProgress.completedAt - stepProgress.startedAt) / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// REPORT VIEW
// ============================================================================

function ReportView({ report }: { report: Record<string, any> }) {
  if (!report) return null;

  const verdictColors: Record<string, string> = {
    GO: 'from-emerald-500 to-green-500',
    CONDITIONAL_GO: 'from-amber-500 to-yellow-500',
    WAIT: 'from-orange-500 to-amber-500',
    AVOID: 'from-red-500 to-rose-500',
  };

  const directionIcon = report.overallDirection === 'long'
    ? <TrendingUp className="w-5 h-5" />
    : report.overallDirection === 'short'
      ? <TrendingDown className="w-5 h-5" />
      : <Minus className="w-5 h-5" />;

  const directionColor = report.overallDirection === 'long'
    ? 'text-emerald-500'
    : report.overallDirection === 'short'
      ? 'text-red-500'
      : 'text-slate-400';

  return (
    <div className="space-y-6 pb-12">
      {/* Report Header */}
      <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${verdictColors[report.overallVerdict] || verdictColors.WAIT}`} />
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {(report.symbol || '??').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{report.assetName || report.symbol}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{report.symbol}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 capitalize">
                      {report.assetClass}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-white notranslate">
                ${safeFormatPrice(report.technicalData?.currentPrice || report.fundamentals?.price || 0)}
              </div>
              {report.fundamentals?.changePercent24h != null && (
                <div className={`text-sm font-medium ${(report.fundamentals.changePercent24h || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {(report.fundamentals.changePercent24h || 0) >= 0 ? '+' : ''}{Number(report.fundamentals.changePercent24h || 0).toFixed(2)}%
                </div>
              )}
            </div>
          </div>

          {/* Verdict + Direction + Score row */}
          <div className="flex items-center gap-4 mt-6 flex-wrap">
            <span className={`px-4 py-1.5 rounded-lg text-white font-bold text-sm bg-gradient-to-r ${verdictColors[report.overallVerdict] || verdictColors.WAIT}`}>
              {(report.overallVerdict || 'WAIT').replace('_', ' ')}
            </span>
            <div className={`flex items-center gap-1 font-medium ${directionColor}`}>
              {directionIcon}
              <span className="uppercase">{report.overallDirection || 'neutral'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${verdictColors[report.overallVerdict] || verdictColors.WAIT}`}
                  style={{ width: `${report.overallScore || 0}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 notranslate">{report.overallScore || 0}/100</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Confidence: {report.overallConfidence || 0}%
            </span>
          </div>

          {/* Summary */}
          {report.summary && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {report.summary}
            </p>
          )}
        </div>
      </div>

      {/* Capital Flow Context */}
      {report.capitalFlow && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Capital Flow</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Liquidity Bias</div>
              <div className="font-bold text-slate-900 dark:text-white capitalize mt-1">
                {String(report.capitalFlow.globalLiquidity?.bias || 'neutral').replace('_', ' ')}
              </div>
            </div>
            {report.capitalFlow.globalLiquidity?.dxy != null && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-xs text-slate-500 dark:text-slate-400">DXY</div>
                <div className="font-bold text-slate-900 dark:text-white notranslate mt-1">
                  {Number(report.capitalFlow.globalLiquidity.dxy || 0).toFixed(2)}
                </div>
              </div>
            )}
            {report.capitalFlow.globalLiquidity?.vix != null && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-xs text-slate-500 dark:text-slate-400">VIX</div>
                <div className="font-bold text-slate-900 dark:text-white notranslate mt-1">
                  {Number(report.capitalFlow.globalLiquidity.vix || 0).toFixed(2)}
                </div>
              </div>
            )}
            {report.capitalFlow.recommendation && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-xs text-slate-500 dark:text-slate-400">Recommendation</div>
                <div className="font-bold text-slate-900 dark:text-white capitalize mt-1">
                  {report.capitalFlow.recommendation.direction || 'neutral'} {report.capitalFlow.recommendation.primaryMarket || ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Horizon Analysis */}
      {report.horizonAnalyses?.length > 0 && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Multi-Horizon Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.horizonAnalyses.map((ha: Record<string, any>) => (
              <HorizonCard key={ha.horizon} analysis={ha} prediction={report.horizonPredictions?.find((p: Record<string, any>) => p.horizon === ha.horizon)} />
            ))}
          </div>
        </div>
      )}

      {/* AI Predictions */}
      {report.horizonPredictions?.length > 0 && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">AI Price Predictions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.horizonPredictions.map((pred: Record<string, any>) => (
              <PredictionCard key={pred.horizon} prediction={pred} />
            ))}
          </div>
        </div>
      )}

      {/* Expert Validation */}
      {report.expertValidation?.experts?.length > 0 && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Expert Validation</h3>
          {report.expertValidation.synthesis && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-white/5">
              {report.expertValidation.synthesis}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.expertValidation.experts.map((expert: Record<string, any>, idx: number) => (
              <ExpertCard key={expert.expertName || idx} expert={expert} />
            ))}
          </div>
        </div>
      )}

      {/* Sentiment */}
      {report.sentiment && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Sentiment & Events</h3>
          <div className="flex items-center gap-4 flex-wrap">
            {report.sentiment.fearGreedIndex != null && (
              <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Fear & Greed</span>
                <div className="font-bold text-slate-900 dark:text-white notranslate">
                  {report.sentiment.fearGreedIndex} - {report.sentiment.fearGreedLabel || 'N/A'}
                </div>
              </div>
            )}
            <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Overall Sentiment</span>
              <div className={`font-bold capitalize ${
                report.sentiment.overallSentiment === 'bullish' ? 'text-emerald-500' :
                report.sentiment.overallSentiment === 'bearish' ? 'text-red-500' : 'text-slate-500'
              }`}>
                {report.sentiment.overallSentiment || 'neutral'}
              </div>
            </div>
            {report.sentiment.shouldBlockTrade && (
              <div className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <span className="text-xs text-red-500">Trade Blocked</span>
                <div className="font-bold text-red-600 dark:text-red-400 text-sm">
                  {report.sentiment.blockReason || 'High-impact event'}
                </div>
              </div>
            )}
          </div>
          {report.sentiment.economicEvents?.length > 0 && (
            <div className="mt-4 space-y-2">
              {report.sentiment.economicEvents.map((ev: Record<string, any>, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{ev.event}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ev.impact === 'high' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                    ev.impact === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                    'bg-slate-100 dark:bg-white/10 text-slate-500'
                  }`}>
                    {ev.impact}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fundamentals */}
      {report.fundamentals && Object.keys(report.fundamentals).length > 2 && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Fundamentals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {report.fundamentals.marketCap != null && (
              <FundamentalItem label="Market Cap" value={formatLargeNumber(report.fundamentals.marketCap)} />
            )}
            {report.fundamentals.peRatio != null && (
              <FundamentalItem label="P/E Ratio" value={Number(report.fundamentals.peRatio).toFixed(1)} />
            )}
            {report.fundamentals.dividendYield != null && (
              <FundamentalItem label="Dividend Yield" value={`${(Number(report.fundamentals.dividendYield) * 100).toFixed(2)}%`} />
            )}
            {report.fundamentals.beta != null && (
              <FundamentalItem label="Beta" value={Number(report.fundamentals.beta).toFixed(2)} />
            )}
            {report.fundamentals.targetPrice != null && (
              <FundamentalItem label="Target Price" value={`$${safeFormatPrice(report.fundamentals.targetPrice)}`} />
            )}
            {report.fundamentals.analystRating != null && (
              <FundamentalItem label="Analyst Rating" value={String(report.fundamentals.analystRating).replace('_', ' ').toUpperCase()} />
            )}
            {report.fundamentals.revenue != null && (
              <FundamentalItem label="Revenue" value={formatLargeNumber(report.fundamentals.revenue)} />
            )}
            {report.fundamentals.profitMargin != null && (
              <FundamentalItem label="Profit Margin" value={`${(Number(report.fundamentals.profitMargin) * 100).toFixed(1)}%`} />
            )}
            {report.fundamentals.rank != null && (
              <FundamentalItem label="Rank" value={`#${report.fundamentals.rank}`} />
            )}
            {report.fundamentals.circulatingSupply != null && (
              <FundamentalItem label="Circulating Supply" value={formatLargeNumber(report.fundamentals.circulatingSupply)} />
            )}
          </div>
        </div>
      )}

      {/* Generated timestamp */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4">
        Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'N/A'} | TraderPath Unified Analysis
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function HorizonCard({ analysis, prediction }: { analysis: Record<string, any>; prediction?: Record<string, any> }) {
  if (!analysis) return null;

  const directionIcon = analysis.direction === 'long'
    ? <ArrowUpRight className="w-4 h-4 text-emerald-500" />
    : analysis.direction === 'short'
      ? <ArrowDownRight className="w-4 h-4 text-red-500" />
      : <Minus className="w-4 h-4 text-slate-400" />;

  const horizonLabels: Record<string, string> = { short: 'Short-Term (1H)', medium: 'Medium-Term (1D)', long: 'Long-Term (1W)' };

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {horizonLabels[analysis.horizon] || analysis.label || 'Unknown'}
        </span>
        <div className="flex items-center gap-1">
          {directionIcon}
          <span className={`text-xs font-medium uppercase ${
            analysis.direction === 'long' ? 'text-emerald-500' :
            analysis.direction === 'short' ? 'text-red-500' : 'text-slate-400'
          }`}>
            {analysis.direction || 'neutral'}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              (analysis.score || 0) >= 70 ? 'bg-emerald-500' :
              (analysis.score || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${analysis.score || 0}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 notranslate">{analysis.score || 0}</span>
      </div>

      {/* Indicator counts */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="text-emerald-500">{analysis.indicators?.bullish || 0} bullish</span>
        <span className="text-red-500">{analysis.indicators?.bearish || 0} bearish</span>
        <span>{analysis.indicators?.neutral || 0} neutral</span>
      </div>

      {/* Prediction summary */}
      {prediction && prediction.direction !== 'neutral' && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Entry</span>
              <div className="font-medium text-slate-700 dark:text-slate-300 notranslate">${safeFormatPrice(prediction.entry)}</div>
            </div>
            <div>
              <span className="text-red-400">SL</span>
              <div className="font-medium text-red-500 notranslate">${safeFormatPrice(prediction.stopLoss)}</div>
            </div>
            <div>
              <span className="text-emerald-400">TP1</span>
              <div className="font-medium text-emerald-500 notranslate">${safeFormatPrice(prediction.takeProfit1)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: Record<string, any> }) {
  if (!prediction) return null;

  const horizonLabels: Record<string, string> = { short: 'Short-Term', medium: 'Medium-Term', long: 'Long-Term' };

  if (prediction.direction === 'neutral' && prediction.confidence === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 opacity-60">
        <div className="text-sm font-semibold text-slate-500 mb-2">{horizonLabels[prediction.horizon] || 'Unknown'}</div>
        <div className="text-xs text-slate-400">No clear prediction</div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{horizonLabels[prediction.horizon] || 'Unknown'}</span>
        <span className="text-xs text-slate-400">Confidence: {prediction.confidence || 0}%</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-blue-500">Entry</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 notranslate">${safeFormatPrice(prediction.entry)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-red-500">Stop Loss</span>
          <span className="font-medium text-red-500 notranslate">${safeFormatPrice(prediction.stopLoss)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-emerald-500">Take Profit 1</span>
          <span className="font-medium text-emerald-500 notranslate">${safeFormatPrice(prediction.takeProfit1)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-emerald-600">Take Profit 2</span>
          <span className="font-medium text-emerald-600 notranslate">${safeFormatPrice(prediction.takeProfit2)}</span>
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/10">
          <span className="text-slate-400">R:R</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 notranslate">1:{Number(prediction.riskReward || 1).toFixed(1)}</span>
        </div>
      </div>
      {prediction.reasoning && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{prediction.reasoning}</p>
      )}
    </div>
  );
}

function ExpertCard({ expert }: { expert: Record<string, any> }) {
  if (!expert) return null;

  const expertEmojis: Record<string, string> = {
    ARIA: '📊', ORACLE: '🐋', SENTINEL: '🛡️', NEXUS: '🔗',
  };

  const verdictColor = expert.verdict === 'bullish' ? 'text-emerald-500' :
    expert.verdict === 'bearish' ? 'text-red-500' : 'text-slate-400';

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{expertEmojis[expert.expertName] || '🤖'}</span>
          <div>
            <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">{expert.expertName || 'Expert'}</div>
            <div className="text-xs text-slate-400">{expert.role || ''}</div>
          </div>
        </div>
        <span className={`text-xs font-bold uppercase ${verdictColor}`}>{expert.verdict || 'neutral'}</span>
      </div>
      <ul className="space-y-1 mt-2">
        {(expert.keyPoints || []).map((point: string, i: number) => (
          <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
            <span className="text-teal-500 mt-0.5">•</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FundamentalItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 notranslate">{value}</div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function safeFormatPrice(price: unknown): string {
  const num = Number(price);
  if (!num || isNaN(num)) return '0.00';
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  return num.toFixed(6);
}

function formatLargeNumber(num: unknown): string {
  const n = Number(num);
  if (!n || isNaN(n)) return '0';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
