'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Flame,
  CheckCircle2,
  XCircle,
  Timer,
  Activity,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Zap,
  Clock,
  Globe,
  BarChart3,
  TrendingDownIcon,
  Info,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { authFetch } from '../../../../lib/api';

// Market configuration
const MARKET_CONFIG = {
  crypto: { label: 'Crypto', icon: '₿', color: 'from-orange-500 to-yellow-500' },
  stocks: { label: 'Stocks', icon: '📈', color: 'from-blue-500 to-cyan-500' },
  metals: { label: 'Metals', icon: '🥇', color: 'from-yellow-600 to-amber-600' },
  bonds: { label: 'Bonds', icon: '📊', color: 'from-gray-600 to-slate-600' },
};

// Verdict configuration
const VERDICT_CONFIG = {
  GO: { label: 'GO', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/30', icon: CheckCircle2 },
  CONDITIONAL_GO: { label: 'CONDITIONAL GO', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30', icon: Zap },
  WAIT: { label: 'WAIT', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30', icon: Clock },
  AVOID: { label: 'AVOID', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30', icon: AlertTriangle },
};

// Outcome configuration
const OUTCOME_CONFIG = {
  tp1_hit: { label: 'TP1 HIT', bg: 'bg-green-500', text: 'text-white', icon: Target },
  tp2_hit: { label: 'TP2 HIT', bg: 'bg-green-600', text: 'text-white', icon: Flame },
  sl_hit: { label: 'STOPPED OUT', bg: 'bg-red-500', text: 'text-white', icon: XCircle },
  expired: { label: 'EXPIRED', bg: 'bg-gray-500', text: 'text-white', icon: Timer },
};

// Phase configuration
const PHASE_CONFIG = {
  early: { label: 'Early Phase', icon: '🌱', color: 'text-green-600 dark:text-green-400', description: 'Optimal entry window' },
  mid: { label: 'Mid Phase', icon: '🌿', color: 'text-blue-600 dark:text-blue-400', description: 'Trend maturation' },
  late: { label: 'Late Phase', icon: '🍂', color: 'text-orange-600 dark:text-orange-400', description: 'Trend aging' },
  exit: { label: 'Exit Phase', icon: '🍁', color: 'text-red-600 dark:text-red-400', description: 'Reversal risk' },
};

interface Signal {
  id: string;
  symbol: string;
  assetClass: string;
  market: string;
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  classicVerdict: string;
  classicScore: number;
  mlisConfirmation: boolean;
  mlisRecommendation?: string;
  mlisConfidence?: number;
  overallConfidence: number;
  capitalFlowPhase: string;
  capitalFlowBias: string;
  sectorFlow?: number;
  classicAnalysisId?: string;
  mlisAnalysisId?: string;
  status: string;
  publishedAt?: string;
  expiresAt: string;
  outcome?: string;
  outcomePrice?: number;
  pnlPercent?: number;
  outcomeAt?: string;
  createdAt: string;
}

interface SignalResponse {
  success: boolean;
  data: Signal;
}

export default function SignalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const signalId = params.id as string;

  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignal();
  }, [signalId]);

  const fetchSignal = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch<SignalResponse>(`/api/v1/signals/${signalId}`);

      if (response.success && response.data) {
        setSignal(response.data);
      } else {
        setError('Signal not found');
      }
    } catch (err) {
      console.error('Error fetching signal:', err);
      setError('Failed to load signal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 text-center mb-4">{error || 'Signal not found'}</p>
          <button
            onClick={() => router.push('/signals')}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Back to Signals
          </button>
        </div>
      </div>
    );
  }

  const verdictConfig = VERDICT_CONFIG[signal.classicVerdict as keyof typeof VERDICT_CONFIG];
  const outcomeConfig = signal.outcome ? OUTCOME_CONFIG[signal.outcome as keyof typeof OUTCOME_CONFIG] : null;
  const phaseConfig = PHASE_CONFIG[signal.capitalFlowPhase as keyof typeof PHASE_CONFIG];
  const marketConfig = MARKET_CONFIG[signal.market as keyof typeof MARKET_CONFIG];

  const calculatePercentages = () => {
    const entry = signal.entryPrice;
    const sl = signal.stopLoss;
    const tp1 = signal.takeProfit1;
    const tp2 = signal.takeProfit2;

    if (signal.direction === 'long') {
      return {
        slPercent: ((sl - entry) / entry * 100).toFixed(2),
        tp1Percent: ((tp1 - entry) / entry * 100).toFixed(2),
        tp2Percent: ((tp2 - entry) / entry * 100).toFixed(2),
      };
    } else {
      return {
        slPercent: ((entry - sl) / entry * 100).toFixed(2),
        tp1Percent: ((entry - tp1) / entry * 100).toFixed(2),
        tp2Percent: ((entry - tp2) / entry * 100).toFixed(2),
      };
    }
  };

  const percentages = calculatePercentages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      {/* Decorative gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-teal-500/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/signals')}
          className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Signals
        </button>

        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-2xl",
                `bg-gradient-to-br ${marketConfig.color}`
              )}>
                {marketConfig.icon}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {signal.symbol}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">{marketConfig.label}</p>
              </div>
            </div>

            {/* Outcome Badge */}
            {outcomeConfig && (
              <div className={cn(
                "px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2",
                outcomeConfig.bg,
                outcomeConfig.text
              )}>
                <outcomeConfig.icon className="w-4 h-4" />
                {outcomeConfig.label}
              </div>
            )}
          </div>

          {/* Direction and Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2",
              signal.direction === 'long'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
            )}>
              {signal.direction === 'long' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {signal.direction.toUpperCase()}
            </div>

            {verdictConfig && (
              <div className={cn(
                "px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border",
                verdictConfig.bg,
                verdictConfig.text,
                verdictConfig.border
              )}>
                <verdictConfig.icon className="w-4 h-4" />
                {verdictConfig.label}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trade Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trade Plan Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-500" />
                Trade Plan
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Entry */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Entry Price</p>
                    <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                      ${signal.entryPrice.toFixed(signal.entryPrice >= 1 ? 2 : 6)}
                    </p>
                  </div>

                  {/* Stop Loss */}
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Stop Loss</p>
                    <p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                      ${signal.stopLoss.toFixed(signal.stopLoss >= 1 ? 2 : 6)}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {percentages.slPercent}%
                    </p>
                  </div>

                  {/* TP1 */}
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Take Profit 1</p>
                    <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                      ${signal.takeProfit1.toFixed(signal.takeProfit1 >= 1 ? 2 : 6)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      +{percentages.tp1Percent}%
                    </p>
                  </div>

                  {/* TP2 */}
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Take Profit 2</p>
                    <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                      ${signal.takeProfit2.toFixed(signal.takeProfit2 >= 1 ? 2 : 6)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      +{percentages.tp2Percent}%
                    </p>
                  </div>
                </div>

                {/* Risk-Reward Ratio */}
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Risk-Reward Ratio</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {signal.riskRewardRatio.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Card */}
            {signal.pnlPercent !== undefined && signal.pnlPercent !== null && (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-500" />
                  Performance
                </h2>

                <div className="text-center py-8">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Profit/Loss</p>
                  <p className={cn(
                    "text-6xl font-bold mb-4",
                    signal.pnlPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(2)}%
                  </p>

                  {signal.outcomePrice && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Exit Price: ${signal.outcomePrice.toFixed(signal.outcomePrice >= 1 ? 2 : 6)}
                    </p>
                  )}

                  {signal.outcomeAt && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                      Closed: {new Date(signal.outcomeAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Analysis Details */}
          <div className="space-y-6">
            {/* Analysis Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" />
                Analysis
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Classic Score</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {signal.classicScore.toFixed(1)}/10
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Overall Confidence</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {signal.overallConfidence}%
                  </span>
                </div>

                {signal.mlisConfirmation && (
                  <>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        MLIS Pro Confirmed
                      </div>

                      {signal.mlisRecommendation && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Recommendation: <span className="font-medium">{signal.mlisRecommendation}</span>
                        </p>
                      )}

                      {signal.mlisConfidence && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Confidence: <span className="font-medium">{signal.mlisConfidence}%</span>
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Capital Flow Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-500" />
                Capital Flow
              </h2>

              <div className="space-y-3">
                {phaseConfig && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Phase</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{phaseConfig.icon}</span>
                      <div>
                        <p className={cn("font-medium", phaseConfig.color)}>
                          {phaseConfig.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {phaseConfig.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Market Bias</p>
                  <p className="font-medium text-slate-900 dark:text-white uppercase">
                    {signal.capitalFlowBias.replace('_', ' ')}
                  </p>
                </div>

                {signal.sectorFlow !== undefined && signal.sectorFlow !== null && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sector Flow (7D)</p>
                    <p className={cn(
                      "text-lg font-bold",
                      signal.sectorFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {signal.sectorFlow >= 0 ? '+' : ''}{signal.sectorFlow.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Signal Info Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-teal-500" />
                Signal Info
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Status</span>
                  <span className="font-medium text-slate-900 dark:text-white uppercase">
                    {signal.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Created</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {new Date(signal.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {signal.publishedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Published</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {new Date(signal.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Expires</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {new Date(signal.expiresAt).toLocaleDateString()}
                  </span>
                </div>

                {signal.classicAnalysisId && (
                  <button
                    onClick={() => router.push(`/analyze/details/${signal.classicAnalysisId}`)}
                    className="w-full mt-4 px-3 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Analysis
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
