'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Target,
  Zap,
  Activity,
  Calendar,
  List,
  LayoutGrid,
  ChevronRight,
  FileText,
  Download,
  Mail,
  Loader2,
} from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl, authFetch } from '../../lib/api';
import Link from 'next/link';

// Trade type definitions
type TradeType = 'scalping' | 'dayTrade' | 'swing';

const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalp', icon: Zap, color: 'purple' },
  dayTrade: { label: 'Day', icon: Activity, color: 'blue' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
};

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  direction: string | null;
  tradeType?: TradeType;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  tpProgress?: number;
  distanceToTP1?: number;
  isSample?: boolean;
  hasTradePlan?: boolean;
  expiresAt?: string;
}

const verdictConfig = {
  go: { label: 'GO', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  conditional_go: { label: 'COND', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  wait: { label: 'WAIT', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  avoid: { label: 'AVOID', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

type ViewMode = 'list' | 'card';

export function RecentAnalyses() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  useEffect(() => {
    fetchAnalyses();
    // Auto-refresh every 30 seconds for live tracking
    const interval = setInterval(() => fetchAnalyses(), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalyses = async () => {
    try {
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setAnalyses([]);
        setLoading(false);
        return;
      }

      // Fetch from live-prices API for real-time data
      const response = await fetch(getApiUrl('/api/analysis/live-prices'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Safely parse JSON response
        const responseText = await response.text();
        let result: any = { data: { analyses: [] } };

        if (responseText && responseText.trim() !== '') {
          try {
            result = JSON.parse(responseText);
          } catch {
            console.error('Invalid JSON response from live-prices API');
            setError('Failed to load analyses');
            setLoading(false);
            return;
          }
        }

        const liveAnalyses = result.data?.analyses || [];

        // Map to RecentAnalysis format
        const mapped = liveAnalyses.map((a: any) => {
          // Normalize verdict
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

          // Map interval to trade type
          let tradeType: TradeType | undefined;
          if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
          else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
          else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';

          // Map outcome
          let outcome: 'correct' | 'incorrect' | 'pending' | null = null;
          if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') {
            outcome = 'correct';
          } else if (a.outcome === 'sl_hit') {
            outcome = 'incorrect';
          } else if (a.hasTradePlan) {
            outcome = 'pending';
          }

          return {
            id: a.id,
            symbol: a.symbol,
            verdict,
            score: a.totalScore || 0,
            direction: a.direction,
            tradeType,
            createdAt: new Date(a.createdAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            outcome,
            entryPrice: a.entryPrice,
            currentPrice: a.currentPrice,
            unrealizedPnL: a.unrealizedPnL,
            stopLoss: a.stopLoss,
            takeProfit1: a.takeProfit1,
            takeProfit2: a.takeProfit2,
            takeProfit3: a.takeProfit3,
            tpProgress: a.tpProgress,
            distanceToTP1: a.distanceToTP1,
            hasTradePlan: a.hasTradePlan,
            expiresAt: a.expiresAt,
          };
        });

        setAnalyses(mapped);
      } else if (response.status === 401) {
        setAnalyses([]);
      } else {
        setError('Failed to load analyses');
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
      setError('Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  // Create report from analysis with AI Expert comment
  const handleCreateReport = async (e: React.MouseEvent, analysisId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading({ id: analysisId, action: 'report' });

    try {
      // Fetch full analysis data
      const analysisResponse = await authFetch(`/api/analysis/${analysisId}`);
      if (!analysisResponse.ok) throw new Error('Failed to fetch analysis');

      const analysisResult = await analysisResponse.json();
      if (!analysisResult.success || !analysisResult.data) throw new Error('Analysis not found');

      const analysis = analysisResult.data;
      const step1 = analysis.step1Result || {};
      const step2 = analysis.step2Result || {};
      const step3 = analysis.step3Result || {};
      const step4 = analysis.step4Result || {};
      const step5 = analysis.step5Result || {};
      const step6 = analysis.step6Result || {};
      const step7 = analysis.step7Result || {};

      // Build full reportData
      const direction = step5.direction || step7.direction || 'long';
      const entryPrice = step5.averageEntry || step5.entryPrice;
      const stopLoss = step5.stopLoss?.price || step5.stopLoss;
      const tp1 = step5.takeProfits?.[0]?.price || step5.takeProfit1;
      const tp2 = step5.takeProfits?.[1]?.price || step5.takeProfit2;
      const tp3 = step5.takeProfits?.[2]?.price || step5.takeProfit3;

      const reportData = {
        symbol: analysis.symbol,
        generatedAt: new Date(analysis.createdAt).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        analysisId: analysis.id,
        tradeType: analysis.interval === '5m' || analysis.interval === '15m' ? 'scalping' :
                   analysis.interval === '1h' || analysis.interval === '4h' ? 'dayTrade' : 'swing',
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
          direction,
          averageEntry: entryPrice,
          stopLoss: { price: stopLoss },
          takeProfits: [tp1, tp2, tp3].filter(Boolean).map(price => ({ price })),
          riskReward: step5.riskReward || 2,
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

      // Generate AI Expert comment
      const isLong = direction === 'long';
      const score = (analysis.totalScore || 0) * 10;
      const riskLevel = step3.riskLevel || 'medium';
      const fearGreed = step1.fearGreedIndex || 50;
      const rsi = step2.indicators?.rsi || 50;

      const aiExpertComment = `📊 AI Risk Assessment for ${analysis.symbol}/USDT

**Overall Score: ${score}/100** - ${score >= 70 ? 'Strong' : score >= 50 ? 'Moderate' : 'Weak'} ${isLong ? 'Bullish' : 'Bearish'} Setup

**Market Context:**
• Fear & Greed Index: ${fearGreed} (${step1.fearGreedLabel || 'Neutral'})
• BTC Dominance: ${step1.btcDominance?.toFixed(1) || 'N/A'}%
• Market Regime: ${step1.marketRegime || 'Neutral'}

**Technical Analysis:**
• RSI: ${rsi?.toFixed(0) || 'N/A'} - ${rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral'}
• 24h Change: ${step2.priceChange24h?.toFixed(2) || '0'}%

**Risk Assessment:**
• Risk Level: ${riskLevel.toUpperCase()}
• Manipulation Risk: ${step3.manipulation?.pumpDumpRisk || 'Low'}
• Whale Activity: ${step3.whaleActivity?.bias || 'Neutral'}

**Trade Plan:**
• Direction: ${direction.toUpperCase()}
• Entry: $${entryPrice?.toFixed(entryPrice > 100 ? 2 : 4) || 'N/A'}
• Stop Loss: $${stopLoss?.toFixed(stopLoss > 100 ? 2 : 4) || 'N/A'}
• Take Profit: $${tp1?.toFixed(tp1 > 100 ? 2 : 4) || 'N/A'}
• Risk/Reward: ${step5.riskReward?.toFixed(1) || '2.0'}:1

**Recommendation:** ${step7.aiSummary || step7.summary || `${score >= 60 ? 'Conditions favor entry with proper risk management.' : 'Exercise caution and wait for better setup.'}`}`;

      // Create report
      const verdict = step7.action || step7.verdict || (isLong ? 'GO' : 'GO');
      const response = await authFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: analysis.symbol,
          analysisId: analysis.id,
          reportData,
          verdict,
          score: analysis.totalScore,
          direction,
          interval: analysis.interval,
          entryPrice,
          tradeType: reportData.tradeType,
          aiExpertComment,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to create report');
      }

      const data = await response.json();
      if (data.success && data.data?.id) {
        alert(`✅ Report created successfully for ${analysis.symbol}!`);
      }
    } catch (err) {
      console.error('Failed to create report:', err);
      alert(err instanceof Error ? err.message : 'Failed to create report');
    } finally {
      setActionLoading(null);
    }
  };

  // Download PDF
  const handleDownload = async (e: React.MouseEvent, analysis: RecentAnalysis) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading({ id: analysis.id, action: 'download' });

    try {
      // Fetch full analysis data
      const response = await authFetch(`/api/analysis/${analysis.id}`);
      if (!response.ok) throw new Error('Failed to fetch analysis');

      const data = await response.json();
      if (!data.success || !data.data) throw new Error('Analysis not found');

      const analysisData = data.data;
      const step2 = analysisData.step2Result || {};
      const step5 = analysisData.step5Result || {};
      const step7 = analysisData.step7Result || {};

      // Build report data
      const reportData = {
        symbol: analysis.symbol,
        generatedAt: analysis.createdAt,
        analysisId: analysis.id,
        tradePlan: {
          direction: step5.direction || analysis.direction,
          averageEntry: step5.averageEntry || step5.entryPrice || analysis.entryPrice,
          stopLoss: { price: step5.stopLoss?.price || step5.stopLoss || analysis.stopLoss },
          takeProfits: [
            { price: step5.takeProfit1 || analysis.takeProfit1 },
            { price: step5.takeProfit2 || analysis.takeProfit2 },
            { price: step5.takeProfit3 || analysis.takeProfit3 },
          ].filter(tp => tp.price),
          riskReward: step5.riskReward || 2,
        },
        assetScan: {
          currentPrice: step2.currentPrice || analysis.currentPrice,
          priceChange24h: step2.priceChange24h || 0,
          indicators: step2.indicators || { rsi: 50, macd: { histogram: 0 } },
        },
        verdict: {
          action: step7.action || step7.verdict || analysis.verdict,
          overallScore: analysis.score,
          aiSummary: step7.aiSummary || step7.summary,
        },
        marketPulse: analysisData.step1Result || {},
        safetyCheck: analysisData.step3Result || {},
        timing: analysisData.step4Result || {},
        trapCheck: analysisData.step6Result || {},
      };

      const { generateAnalysisReport } = await import('../reports/AnalysisReport');
      await generateAnalysisReport(reportData);
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  };

  // Send email
  const handleEmail = async (e: React.MouseEvent, analysis: RecentAnalysis) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading({ id: analysis.id, action: 'email' });

    try {
      // Fetch full analysis data
      const response = await authFetch(`/api/analysis/${analysis.id}`);
      if (!response.ok) throw new Error('Failed to fetch analysis');

      const data = await response.json();
      if (!data.success || !data.data) throw new Error('Analysis not found');

      const analysisData = data.data;
      const step1 = analysisData.step1Result || {};
      const step2 = analysisData.step2Result || {};
      const step3 = analysisData.step3Result || {};
      const step4 = analysisData.step4Result || {};
      const step5 = analysisData.step5Result || {};
      const step6 = analysisData.step6Result || {};
      const step7 = analysisData.step7Result || {};

      // Build report data for email
      const reportData = {
        symbol: analysis.symbol,
        generatedAt: analysis.createdAt,
        analysisId: analysis.id,
        marketPulse: {
          btcDominance: step1.btcDominance,
          fearGreedIndex: step1.fearGreedIndex,
          fearGreedLabel: step1.fearGreedLabel,
          trend: step1.trend || { direction: 'neutral', strength: 0 },
        },
        assetScan: {
          currentPrice: step2.currentPrice || analysis.currentPrice,
          priceChange24h: step2.priceChange24h || 0,
          indicators: step2.indicators || { rsi: 50, macd: { histogram: 0 } },
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
          direction: step5.direction || analysis.direction,
          averageEntry: step5.averageEntry || step5.entryPrice || analysis.entryPrice,
          stopLoss: { price: step5.stopLoss?.price || step5.stopLoss || analysis.stopLoss },
          takeProfits: [
            { price: step5.takeProfit1 || analysis.takeProfit1 },
            { price: step5.takeProfit2 || analysis.takeProfit2 },
            { price: step5.takeProfit3 || analysis.takeProfit3 },
          ].filter(tp => tp.price),
          riskReward: step5.riskReward || 2,
        },
        trapCheck: {
          traps: step6.traps || { bullTrap: false, bearTrap: false, fakeoutRisk: 'low' },
        },
        verdict: {
          action: step7.action || step7.verdict || analysis.verdict,
          overallScore: analysis.score,
          aiSummary: step7.aiSummary || step7.summary,
        },
      };

      // Send email
      const emailResponse = await authFetch('/api/reports/send-html-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: analysis.id,
          reportData,
        }),
      });

      if (!emailResponse.ok) {
        const errData = await emailResponse.json();
        throw new Error(errData.error?.message || 'Failed to send email');
      }

      alert('Email sent successfully!');
    } catch (err) {
      console.error('Failed to send email:', err);
      alert(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <RefreshCw className="w-5 h-5 mx-auto mb-2 text-muted-foreground animate-spin" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-red-500 mb-1">{error}</p>
        <button
          onClick={fetchAnalyses}
          className="text-xs text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <h3 className="font-medium text-sm mb-1">No analyses yet</h3>
        <p className="text-xs text-muted-foreground">
          Select a coin above to start
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Recent Analyses
          <span className="text-xs font-normal text-gray-500 dark:text-slate-400 ml-1">
            ({analyses.length})
          </span>
        </h3>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded transition-all',
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            )}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={cn(
              'p-1.5 rounded transition-all',
              viewMode === 'card'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <ListView
          analyses={analyses}
          actionLoading={actionLoading}
          onCreateReport={handleCreateReport}
          onDownload={handleDownload}
          onEmail={handleEmail}
        />
      ) : (
        <CardView
          analyses={analyses}
          actionLoading={actionLoading}
          onCreateReport={handleCreateReport}
          onDownload={handleDownload}
          onEmail={handleEmail}
        />
      )}
    </div>
  );
}

interface ViewProps {
  analyses: RecentAnalysis[];
  actionLoading: { id: string; action: string } | null;
  onCreateReport: (e: React.MouseEvent, id: string) => void;
  onDownload: (e: React.MouseEvent, analysis: RecentAnalysis) => void;
  onEmail: (e: React.MouseEvent, analysis: RecentAnalysis) => void;
}

// Compact List View
function ListView({ analyses, actionLoading, onCreateReport, onDownload, onEmail }: ViewProps) {
  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {analyses.map((analysis) => {
        const config = verdictConfig[analysis.verdict] || verdictConfig.wait;
        const isActive = analysis.expiresAt && new Date(analysis.expiresAt) > new Date() && analysis.outcome !== 'correct' && analysis.outcome !== 'incorrect';
        const isLoading = actionLoading?.id === analysis.id;

        return (
          <div
            key={analysis.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-slate-700/50 group",
              analysis.outcome === 'correct' && "bg-green-500/5",
              analysis.outcome === 'incorrect' && "bg-red-500/5"
            )}
          >
            {/* Main clickable area */}
            <Link
              href={`/analyze/details/${analysis.id}`}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              {/* Coin Icon */}
              <CoinIcon symbol={analysis.symbol} size={28} className="shrink-0" />

              {/* Symbol + Direction */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{analysis.symbol}</span>
                  {analysis.direction && (
                    <span className={cn(
                      "flex items-center text-[10px]",
                      analysis.direction === 'long' ? "text-green-500" : "text-red-500"
                    )}>
                      {analysis.direction === 'long' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                  {analysis.tradeType && TRADE_TYPE_CONFIG[analysis.tradeType] && (
                    <span className={cn(
                      "text-[9px] px-1 py-0.5 rounded",
                      TRADE_TYPE_CONFIG[analysis.tradeType].color === 'purple' && "bg-purple-500/10 text-purple-500",
                      TRADE_TYPE_CONFIG[analysis.tradeType].color === 'blue' && "bg-blue-500/10 text-blue-500",
                      TRADE_TYPE_CONFIG[analysis.tradeType].color === 'amber' && "bg-amber-500/10 text-amber-500"
                    )}>
                      {TRADE_TYPE_CONFIG[analysis.tradeType].label}
                    </span>
                  )}
                  {isActive && analysis.hasTradePlan && (
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] text-gray-500 dark:text-slate-400">{analysis.createdAt}</span>
              </div>

              {/* Score */}
              <div className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded",
                analysis.score >= 7 ? "text-green-600 dark:text-green-400" :
                analysis.score >= 5 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
              )}>
                {((analysis.score ?? 0) * 10).toFixed(0)}%
              </div>

              {/* Verdict Badge */}
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                config.bg, config.color
              )}>
                {config.label}
              </span>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 shrink-0" />
            </Link>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Create Report */}
              <button
                onClick={(e) => onCreateReport(e, analysis.id)}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition"
                title="Create Report"
              >
                {isLoading && actionLoading?.action === 'report' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Download PDF */}
              <button
                onClick={(e) => onDownload(e, analysis)}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition"
                title="Download PDF"
              >
                {isLoading && actionLoading?.action === 'download' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Email */}
              <button
                onClick={(e) => onEmail(e, analysis)}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition"
                title="Send Email"
              >
                {isLoading && actionLoading?.action === 'email' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Card View
function CardView({ analyses, actionLoading, onCreateReport, onDownload, onEmail }: ViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
      {analyses.map((analysis) => {
        const config = verdictConfig[analysis.verdict] || verdictConfig.wait;
        const isActive = analysis.expiresAt && new Date(analysis.expiresAt) > new Date() && analysis.outcome !== 'correct' && analysis.outcome !== 'incorrect';
        const isLoading = actionLoading?.id === analysis.id;

        // Calculate TP progress
        const tpProgress = analysis.tpProgress ?? (() => {
          if (analysis.outcome === 'correct') return 100;
          if (analysis.entryPrice && analysis.currentPrice && analysis.takeProfit1) {
            const isLong = analysis.direction === 'long';
            const maxTarget = analysis.takeProfit3 || analysis.takeProfit2 || analysis.takeProfit1;
            const totalDistance = isLong
              ? (maxTarget - analysis.entryPrice)
              : (analysis.entryPrice - maxTarget);
            const coveredDistance = isLong
              ? (analysis.currentPrice - analysis.entryPrice)
              : (analysis.entryPrice - analysis.currentPrice);
            return totalDistance !== 0
              ? Math.min(100, Math.max(0, (coveredDistance / totalDistance) * 100))
              : 0;
          }
          return null;
        })();

        return (
          <div
            key={analysis.id}
            className={cn(
              "block p-3 rounded-lg border transition-all hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm",
              "bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700",
              analysis.outcome === 'correct' && "border-green-500/30 bg-green-500/5",
              analysis.outcome === 'incorrect' && "border-red-500/30 bg-red-500/5"
            )}
          >
            {/* Top: Symbol + Verdict (clickable) */}
            <Link href={`/analyze/details/${analysis.id}`} className="block">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CoinIcon symbol={analysis.symbol} size={32} className="shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{analysis.symbol}</span>
                      {analysis.direction && (
                        <span className={cn(
                          "flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded",
                          analysis.direction === 'long'
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        )}>
                          {analysis.direction === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {analysis.direction.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400">{analysis.createdAt}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded",
                    config.bg, config.color
                  )}>
                    {config.label}
                  </span>
                  {isActive && analysis.hasTradePlan && (
                    <span className="flex items-center gap-1 text-[9px] text-blue-500">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                      LIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-2 text-xs mb-2">
                {/* Score */}
                <div className={cn(
                  "px-2 py-1 rounded",
                  analysis.score >= 7 ? "bg-green-100 dark:bg-green-500/20" :
                  analysis.score >= 5 ? "bg-yellow-100 dark:bg-yellow-500/20" : "bg-red-100 dark:bg-red-500/20"
                )}>
                  <span className="text-[9px] text-gray-500 dark:text-slate-400 block">Score</span>
                  <span className={cn(
                    "font-bold",
                    analysis.score >= 7 ? "text-green-600 dark:text-green-400" :
                    analysis.score >= 5 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {((analysis.score ?? 0) * 10).toFixed(0)}%
                  </span>
                </div>

                {/* P/L */}
                {analysis.unrealizedPnL !== undefined && (
                  <div className={cn(
                    "px-2 py-1 rounded",
                    analysis.unrealizedPnL >= 0
                      ? "bg-green-100 dark:bg-green-500/20"
                      : "bg-red-100 dark:bg-red-500/20"
                  )}>
                    <span className="text-[9px] text-gray-500 dark:text-slate-400 block">P/L</span>
                    <span className={cn(
                      "font-bold",
                      analysis.unrealizedPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {analysis.unrealizedPnL >= 0 ? '+' : ''}{(analysis.unrealizedPnL ?? 0).toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* TP Progress */}
                {analysis.takeProfit1 && tpProgress !== null && (
                  <div className={cn(
                    "px-2 py-1 rounded",
                    analysis.outcome === 'correct' ? "bg-green-200 dark:bg-green-500/30" :
                    analysis.outcome === 'incorrect' ? "bg-red-200 dark:bg-red-500/30" :
                    "bg-blue-100 dark:bg-blue-500/20"
                  )}>
                    <span className="text-[9px] text-gray-500 dark:text-slate-400 flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5" />
                      {analysis.outcome === 'correct' ? 'TP!' : analysis.outcome === 'incorrect' ? 'SL' : 'TP'}
                    </span>
                    <span className={cn(
                      "font-bold",
                      analysis.outcome === 'correct' ? "text-green-600 dark:text-green-300" :
                      analysis.outcome === 'incorrect' ? "text-red-600 dark:text-red-300" :
                      "text-blue-600 dark:text-blue-400"
                    )}>
                      {(tpProgress ?? 0).toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* Trade Type */}
                {analysis.tradeType && TRADE_TYPE_CONFIG[analysis.tradeType] && (
                  <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
                    {(() => {
                      const Icon = TRADE_TYPE_CONFIG[analysis.tradeType!].icon;
                      return <Icon className="w-3 h-3" />;
                    })()}
                    {TRADE_TYPE_CONFIG[analysis.tradeType].label}
                  </div>
                )}
              </div>
            </Link>

            {/* Action buttons */}
            <div className="flex items-center gap-1 pt-2 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={(e) => onCreateReport(e, analysis.id)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition"
              >
                {isLoading && actionLoading?.action === 'report' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                Report
              </button>
              <button
                onClick={(e) => onDownload(e, analysis)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition"
              >
                {isLoading && actionLoading?.action === 'download' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                PDF
              </button>
              <button
                onClick={(e) => onEmail(e, analysis)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition"
              >
                {isLoading && actionLoading?.action === 'email' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Mail className="w-3 h-3" />
                )}
                Email
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
