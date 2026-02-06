'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authFetch, getApiUrl } from '../../../lib/api';
import {
  Search, CheckCircle2, Circle, Loader2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, ArrowRight, ChevronDown,
  Globe, BarChart3, Activity, Brain, Sparkles, Shield, FileText,
  ArrowUpRight, ArrowDownRight, Clock, Target, Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface StepDef {
  id: string;
  label: string;
  description: string;
  icon: any;
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
// MAIN PAGE COMPONENT
// ============================================================================

export default function UnifiedReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSymbol = searchParams.get('symbol') || '';

  const [symbol, setSymbol] = useState(initialSymbol);
  const [inputValue, setInputValue] = useState(initialSymbol);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

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

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to start analysis');
        setIsStarting(false);
        return;
      }

      setSessionId(data.data.sessionId);
      connectSSE(data.data.sessionId);
    } catch (err: any) {
      setError(err.message || 'Network error');
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

  // Connect to SSE for progress
  const connectSSE = useCallback((sid: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Use polling fallback instead of raw EventSource (auth required)
    const pollInterval = setInterval(async () => {
      try {
        const res = await authFetch(`/api/unified-analysis/status/${sid}`);
        const data = await res.json();
        if (data.success) {
          setProgress(data.data);

          if (data.data.status === 'completed') {
            clearInterval(pollInterval);
            // Fetch report
            fetchReport(sid);
          } else if (data.data.status === 'failed') {
            clearInterval(pollInterval);
            setError(data.data.error || 'Analysis failed');
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 1000);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);

    return () => clearInterval(pollInterval);
  }, []);

  // Fetch completed report
  const fetchReport = useCallback(async (sid: string) => {
    try {
      const res = await authFetch(`/api/unified-analysis/report/${sid}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      } else {
        setError(data.error || 'Failed to load report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      startAnalysis(inputValue.trim());
    }
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
            <button
              onClick={() => { setError(null); setSessionId(null); setProgress(null); }}
              className="mt-2 text-sm text-red-500 hover:underline"
            >
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
          <ReportView report={report} />
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
            {symbol.slice(0, 2)}
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-900 dark:text-white">{symbol}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{progress.assetClass}</div>
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
        {STEPS.map((stepDef, i) => {
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

function ReportView({ report }: { report: any }) {
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
                  {report.symbol.slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{report.assetName}</h2>
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
                ${formatPrice(report.technicalData?.currentPrice || report.fundamentals?.price || 0)}
              </div>
              {report.fundamentals?.changePercent24h !== undefined && (
                <div className={`text-sm font-medium ${(report.fundamentals.changePercent24h || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {(report.fundamentals.changePercent24h || 0) >= 0 ? '+' : ''}{(report.fundamentals.changePercent24h || 0).toFixed(2)}%
                </div>
              )}
            </div>
          </div>

          {/* Verdict + Direction + Score row */}
          <div className="flex items-center gap-4 mt-6">
            <span className={`px-4 py-1.5 rounded-lg text-white font-bold text-sm bg-gradient-to-r ${verdictColors[report.overallVerdict] || verdictColors.WAIT}`}>
              {report.overallVerdict?.replace('_', ' ')}
            </span>
            <div className={`flex items-center gap-1 font-medium ${directionColor}`}>
              {directionIcon}
              <span className="uppercase">{report.overallDirection}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${verdictColors[report.overallVerdict] || verdictColors.WAIT}`}
                  style={{ width: `${report.overallScore || 0}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 notranslate">{report.overallScore}/100</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Confidence: {report.overallConfidence}%
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
                {(report.capitalFlow.globalLiquidity?.bias || 'neutral').replace('_', ' ')}
              </div>
            </div>
            {report.capitalFlow.globalLiquidity?.dxy && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-xs text-slate-500 dark:text-slate-400">DXY</div>
                <div className="font-bold text-slate-900 dark:text-white notranslate mt-1">
                  {Number(report.capitalFlow.globalLiquidity.dxy).toFixed(2)}
                </div>
              </div>
            )}
            {report.capitalFlow.globalLiquidity?.vix && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-xs text-slate-500 dark:text-slate-400">VIX</div>
                <div className="font-bold text-slate-900 dark:text-white notranslate mt-1">
                  {Number(report.capitalFlow.globalLiquidity.vix).toFixed(2)}
                </div>
              </div>
            )}
            {report.capitalFlow.recommendation && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-xs text-slate-500 dark:text-slate-400">Recommendation</div>
                <div className="font-bold text-slate-900 dark:text-white capitalize mt-1">
                  {report.capitalFlow.recommendation.direction} {report.capitalFlow.recommendation.primaryMarket}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Horizon Analysis */}
      <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Multi-Horizon Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.horizonAnalyses?.map((ha: any) => (
            <HorizonCard key={ha.horizon} analysis={ha} prediction={report.horizonPredictions?.find((p: any) => p.horizon === ha.horizon)} />
          ))}
        </div>
      </div>

      {/* AI Predictions */}
      {report.horizonPredictions?.length > 0 && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">AI Price Predictions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.horizonPredictions.map((pred: any) => (
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
            {report.expertValidation.experts.map((expert: any) => (
              <ExpertCard key={expert.expertName} expert={expert} />
            ))}
          </div>
        </div>
      )}

      {/* Sentiment */}
      {report.sentiment && (
        <div className="bg-white dark:bg-[#0d1221] rounded-2xl border border-slate-200 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Sentiment & Events</h3>
          <div className="flex items-center gap-4 flex-wrap">
            {report.sentiment.fearGreedIndex !== undefined && (
              <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Fear & Greed</span>
                <div className="font-bold text-slate-900 dark:text-white notranslate">
                  {report.sentiment.fearGreedIndex} - {report.sentiment.fearGreedLabel}
                </div>
              </div>
            )}
            <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Overall Sentiment</span>
              <div className={`font-bold capitalize ${
                report.sentiment.overallSentiment === 'bullish' ? 'text-emerald-500' :
                report.sentiment.overallSentiment === 'bearish' ? 'text-red-500' : 'text-slate-500'
              }`}>
                {report.sentiment.overallSentiment}
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
              {report.sentiment.economicEvents.map((ev: any, i: number) => (
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
            {report.fundamentals.marketCap && (
              <FundamentalItem label="Market Cap" value={formatLargeNumber(report.fundamentals.marketCap)} />
            )}
            {report.fundamentals.peRatio && (
              <FundamentalItem label="P/E Ratio" value={report.fundamentals.peRatio.toFixed(1)} />
            )}
            {report.fundamentals.dividendYield && (
              <FundamentalItem label="Dividend Yield" value={`${(report.fundamentals.dividendYield * 100).toFixed(2)}%`} />
            )}
            {report.fundamentals.beta && (
              <FundamentalItem label="Beta" value={report.fundamentals.beta.toFixed(2)} />
            )}
            {report.fundamentals.targetPrice && (
              <FundamentalItem label="Target Price" value={`$${formatPrice(report.fundamentals.targetPrice)}`} />
            )}
            {report.fundamentals.analystRating && (
              <FundamentalItem label="Analyst Rating" value={report.fundamentals.analystRating.replace('_', ' ').toUpperCase()} />
            )}
            {report.fundamentals.revenue && (
              <FundamentalItem label="Revenue" value={formatLargeNumber(report.fundamentals.revenue)} />
            )}
            {report.fundamentals.profitMargin && (
              <FundamentalItem label="Profit Margin" value={`${(report.fundamentals.profitMargin * 100).toFixed(1)}%`} />
            )}
            {report.fundamentals.rank && (
              <FundamentalItem label="Rank" value={`#${report.fundamentals.rank}`} />
            )}
            {report.fundamentals.circulatingSupply && (
              <FundamentalItem label="Circulating Supply" value={formatLargeNumber(report.fundamentals.circulatingSupply)} />
            )}
          </div>
        </div>
      )}

      {/* Generated timestamp */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4">
        Generated {new Date(report.generatedAt).toLocaleString()} | TraderPath Unified Analysis
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function HorizonCard({ analysis, prediction }: { analysis: any; prediction?: any }) {
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
          {horizonLabels[analysis.horizon] || analysis.label}
        </span>
        <div className="flex items-center gap-1">
          {directionIcon}
          <span className={`text-xs font-medium uppercase ${
            analysis.direction === 'long' ? 'text-emerald-500' :
            analysis.direction === 'short' ? 'text-red-500' : 'text-slate-400'
          }`}>
            {analysis.direction}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              analysis.score >= 70 ? 'bg-emerald-500' :
              analysis.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${analysis.score}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 notranslate">{analysis.score}</span>
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
              <div className="font-medium text-slate-700 dark:text-slate-300 notranslate">${formatPrice(prediction.entry)}</div>
            </div>
            <div>
              <span className="text-red-400">SL</span>
              <div className="font-medium text-red-500 notranslate">${formatPrice(prediction.stopLoss)}</div>
            </div>
            <div>
              <span className="text-emerald-400">TP1</span>
              <div className="font-medium text-emerald-500 notranslate">${formatPrice(prediction.takeProfit1)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: any }) {
  const horizonLabels: Record<string, string> = { short: 'Short-Term', medium: 'Medium-Term', long: 'Long-Term' };

  if (prediction.direction === 'neutral' && prediction.confidence === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 opacity-60">
        <div className="text-sm font-semibold text-slate-500 mb-2">{horizonLabels[prediction.horizon]}</div>
        <div className="text-xs text-slate-400">No clear prediction</div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{horizonLabels[prediction.horizon]}</span>
        <span className="text-xs text-slate-400">Confidence: {prediction.confidence}%</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-blue-500">Entry</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 notranslate">${formatPrice(prediction.entry)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-red-500">Stop Loss</span>
          <span className="font-medium text-red-500 notranslate">${formatPrice(prediction.stopLoss)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-emerald-500">Take Profit 1</span>
          <span className="font-medium text-emerald-500 notranslate">${formatPrice(prediction.takeProfit1)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-emerald-600">Take Profit 2</span>
          <span className="font-medium text-emerald-600 notranslate">${formatPrice(prediction.takeProfit2)}</span>
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/10">
          <span className="text-slate-400">R:R</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 notranslate">1:{prediction.riskReward?.toFixed(1) || '1.0'}</span>
        </div>
      </div>
      {prediction.reasoning && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{prediction.reasoning}</p>
      )}
    </div>
  );
}

function ExpertCard({ expert }: { expert: any }) {
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
            <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">{expert.expertName}</div>
            <div className="text-xs text-slate-400">{expert.role}</div>
          </div>
        </div>
        <span className={`text-xs font-bold uppercase ${verdictColor}`}>{expert.verdict}</span>
      </div>
      <ul className="space-y-1 mt-2">
        {expert.keyPoints?.map((point: string, i: number) => (
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

function formatPrice(price: number): string {
  if (!price || isNaN(price)) return '0.00';
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

function formatLargeNumber(num: number): string {
  if (!num || isNaN(num)) return '0';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}
