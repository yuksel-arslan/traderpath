'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Mail,
  Loader2,
  Filter,
  Eye,
  Bot,
  Trash2,
  Timer,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { CoinIcon } from '../common/CoinIcon';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl, authFetch } from '../../lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import html2canvas
const html2canvasPromise = typeof window !== 'undefined'
  ? import('html2canvas').then(mod => mod.default)
  : Promise.resolve(null);

// Trade type definitions
type TradeType = 'scalping' | 'dayTrade' | 'swing';

const TRADE_TYPE_CONFIG: Record<TradeType, { label: string; icon: typeof Zap; color: string }> = {
  scalping: { label: 'Scalping', icon: Zap, color: 'teal' },
  dayTrade: { label: 'Day Trade', icon: Activity, color: 'slate' },
  swing: { label: 'Swing', icon: Calendar, color: 'amber' },
};

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number | null;
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

const VERDICT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  go: { label: 'GO', bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400' },
  conditional_go: { label: 'COND', bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
  wait: { label: 'WAIT', bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  avoid: { label: 'AVOID', bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400' },
};

type VerdictFilter = 'all' | 'go' | 'conditional_go' | 'wait' | 'avoid';

const VERDICT_FILTERS: { value: VerdictFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'text-gray-600 dark:text-slate-300' },
  { value: 'go', label: 'GO', color: 'text-green-500' },
  { value: 'conditional_go', label: 'COND', color: 'text-yellow-500' },
  { value: 'wait', label: 'WAIT', color: 'text-orange-500' },
  { value: 'avoid', label: 'AVOID', color: 'text-red-500' },
];

// Outcome filter types
type OutcomeFilter = 'all' | 'live' | 'tp' | 'sl';

const OUTCOME_FILTERS: { value: OutcomeFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'text-gray-600 dark:text-slate-300' },
  { value: 'live', label: 'LIVE', color: 'text-blue-500' },
  { value: 'tp', label: 'TP HIT', color: 'text-green-500' },
  { value: 'sl', label: 'SL HIT', color: 'text-red-500' },
];

export function RecentAnalyses() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
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
          // Normalize verdict - include direction-based verdicts (long/short)
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!' || rawVerdict === 'long' || rawVerdict === 'short') verdict = 'go';
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
            score: a.totalScore !== null && a.totalScore !== undefined ? a.totalScore : null,
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

  // Send email with screenshot - renders analysis card and captures it
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
      const interval = analysisData.interval || '4h';
      const score = Number(analysisData.totalScore) || analysis.score || 5;
      const step5 = analysisData.step5Result || {};
      const step7 = analysisData.step7Result || {};

      // Create off-screen element for capture
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '600px';
      container.style.padding = '24px';
      container.style.backgroundColor = '#0f172a';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      container.style.color = 'white';

      const isLong = (analysis.direction || 'long') === 'long';
      const verdictConfig = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.wait;
      const formatPrice = (p: number | undefined) => p ? (p >= 1 ? `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `$${p.toFixed(6)}`) : 'N/A';

      // Build trade plan data
      const entry = step5.averageEntry || step5.entryPrice || analysis.entryPrice;
      const sl = step5.stopLoss?.price || step5.stopLoss || analysis.stopLoss;
      const tp1 = step5.takeProfits?.[0]?.price || analysis.takeProfit1;
      const tp2 = step5.takeProfits?.[1]?.price || analysis.takeProfit2;
      const tp3 = step5.takeProfits?.[2]?.price || analysis.takeProfit3;
      const aiSummary = step7.aiSummary || step7.summary || '';

      container.innerHTML = `
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0f172a 50%, #ef4444 100%); padding: 16px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
            Trader<span style="color: #fef3c7;">Path</span>
          </h1>
          <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 11px;">AI-Powered Trading Analysis</p>
        </div>

        <div style="background: #1e293b; padding: 20px; border-radius: 0 0 12px 12px;">
          <!-- Symbol & Direction -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #334155;">
            <div>
              <h2 style="margin: 0; font-size: 22px; font-weight: bold;">${analysis.symbol}/USDT</h2>
              <span style="display: inline-block; margin-top: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: ${isLong ? 'rgba(20,184,166,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${isLong ? '#14b8a6' : '#ef4444'};">
                ${isLong ? '▲ LONG' : '▼ SHORT'}
              </span>
              <span style="display: inline-block; margin-left: 8px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: ${verdictConfig.bg.replace('bg-', '').replace('/20', '')}20; color: ${analysis.verdict === 'go' ? '#22c55e' : analysis.verdict === 'avoid' ? '#ef4444' : '#f59e0b'};">
                ${verdictConfig.label}
              </span>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 32px; font-weight: bold; color: ${score * 10 >= 70 ? '#14b8a6' : score * 10 >= 50 ? '#f59e0b' : '#ef4444'};">${(score * 10).toFixed(0)}/100</div>
              <div style="font-size: 11px; color: #94a3b8;">Analysis Score</div>
            </div>
          </div>

          <!-- Trade Plan -->
          <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px; font-size: 14px; color: #94a3b8; text-transform: uppercase;">Trade Plan</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="text-align: center;">
                <td style="padding: 8px; background: #334155; border-radius: 6px 0 0 0;"><span style="color: #94a3b8; font-size: 10px; display: block;">Entry</span><span style="color: #22d3ee; font-weight: 600;">${formatPrice(entry)}</span></td>
                <td style="padding: 8px; background: #334155;"><span style="color: #94a3b8; font-size: 10px; display: block;">Stop Loss</span><span style="color: #ef4444; font-weight: 600;">${formatPrice(sl)}</span></td>
                <td style="padding: 8px; background: #334155;"><span style="color: #94a3b8; font-size: 10px; display: block;">TP1</span><span style="color: #22c55e; font-weight: 600;">${formatPrice(tp1)}</span></td>
                <td style="padding: 8px; background: #334155;"><span style="color: #94a3b8; font-size: 10px; display: block;">TP2</span><span style="color: #22c55e; font-weight: 600;">${formatPrice(tp2)}</span></td>
                <td style="padding: 8px; background: #334155; border-radius: 0 6px 0 0;"><span style="color: #94a3b8; font-size: 10px; display: block;">TP3</span><span style="color: #22c55e; font-weight: 600;">${formatPrice(tp3)}</span></td>
              </tr>
            </table>
          </div>

          ${aiSummary ? `
          <div style="background: #0f172a; border-radius: 8px; padding: 16px;">
            <h3 style="margin: 0 0 8px; font-size: 14px; color: #94a3b8; text-transform: uppercase;">AI Summary</h3>
            <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">${aiSummary.substring(0, 300)}${aiSummary.length > 300 ? '...' : ''}</p>
          </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #334155; text-align: center;">
            <span style="font-size: 11px; color: #64748b;">${interval.toUpperCase()} Timeframe | ${analysis.createdAt}</span>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get html2canvas
      const html2canvas = await html2canvasPromise;
      if (!html2canvas) throw new Error('Screenshot library not available');

      // Capture
      const canvas = await html2canvas(container, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Cleanup
      document.body.removeChild(container);

      // Convert to base64
      const screenshotBase64 = canvas.toDataURL('image/png');

      // Send email with screenshot
      const emailResponse = await authFetch('/api/reports/email-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          symbol: analysis.symbol,
          interval,
          screenshot: screenshotBase64,
          score,
          direction: analysis.direction || 'long',
        }),
      });

      if (!emailResponse.ok) {
        const errData = await emailResponse.json();
        throw new Error(errData.error?.message || 'Failed to send email');
      }

      alert('Analysis screenshot sent to your email!');
    } catch (err) {
      console.error('Failed to send email:', err);
      alert(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete analysis
  const handleDelete = async (e: React.MouseEvent, analysisId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    setActionLoading({ id: analysisId, action: 'delete' });
    try {
      const response = await authFetch(`/api/analysis/${analysisId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAnalyses(analyses.filter(a => a.id !== analysisId));
      }
    } catch (error) {
      console.error('Failed to delete analysis:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Navigate to AI Expert
  const handleAskAIExpert = async (e: React.MouseEvent, analysis: RecentAnalysis) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/ai-expert/nexus?analysisId=${analysis.id}`);
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

  // Filter analyses by verdict
  // Apply both verdict and outcome filters
  const filteredAnalyses = analyses.filter(a => {
    // Verdict filter
    if (verdictFilter !== 'all' && a.verdict !== verdictFilter) return false;

    // Outcome filter
    if (outcomeFilter !== 'all') {
      if (outcomeFilter === 'live' && (a.outcome === 'correct' || a.outcome === 'incorrect')) return false;
      if (outcomeFilter === 'tp' && a.outcome !== 'correct') return false;
      if (outcomeFilter === 'sl' && a.outcome !== 'incorrect') return false;
    }

    return true;
  });

  return (
    <div>
      {/* Header with filter */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent Analyses
            <span className="text-xs font-normal text-gray-500 dark:text-slate-400 ml-1">
              ({filteredAnalyses.length}{(verdictFilter !== 'all' || outcomeFilter !== 'all') ? `/${analyses.length}` : ''})
            </span>
          </h3>
          <button
            onClick={() => fetchAnalyses()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Verdict Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 dark:text-slate-500">Verdict:</span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
              {VERDICT_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setVerdictFilter(filter.value)}
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-medium rounded-md transition-all',
                    verdictFilter === filter.value
                      ? 'bg-gradient-to-r from-teal-500 to-red-400 text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 dark:text-slate-500">Status:</span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
              {OUTCOME_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setOutcomeFilter(filter.value)}
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-medium rounded-md transition-all',
                    outcomeFilter === filter.value
                      ? filter.value === 'live' ? 'bg-blue-500 text-white shadow-sm'
                        : filter.value === 'tp' ? 'bg-green-500 text-white shadow-sm'
                        : filter.value === 'sl' ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-gradient-to-r from-teal-500 to-red-400 text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filteredAnalyses.length === 0 && (verdictFilter !== 'all' || outcomeFilter !== 'all') ? (
        <div className="text-center py-6">
          <Filter className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-xs text-muted-foreground">
            No matching analyses found
          </p>
          <button
            onClick={() => { setVerdictFilter('all'); setOutcomeFilter('all'); }}
            className="text-xs text-primary hover:underline mt-1"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {filteredAnalyses.map((analysis) => {
            const isActive = analysis.expiresAt && new Date(analysis.expiresAt) > new Date() && analysis.outcome !== 'correct' && analysis.outcome !== 'incorrect';
            const isLoading = actionLoading?.id === analysis.id;
            const verdictConfig = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.wait;
            const tradeTypeConfig = analysis.tradeType ? TRADE_TYPE_CONFIG[analysis.tradeType] : null;

            // Calculate TP progress
            const tpProgress = analysis.tpProgress ?? (() => {
              if (analysis.outcome === 'correct') return 100;
              if (analysis.entryPrice && analysis.currentPrice && analysis.takeProfit1) {
                const isLong = analysis.direction === 'long';
                const totalDistance = isLong
                  ? (analysis.takeProfit1 - analysis.entryPrice)
                  : (analysis.entryPrice - analysis.takeProfit1);
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
                  "relative border-2 rounded-xl p-3 sm:p-4 hover:shadow-lg transition overflow-hidden bg-white dark:bg-transparent",
                  analysis.outcome === 'correct' && "border-teal-500/50",
                  analysis.outcome === 'incorrect' && "border-red-500/50",
                  isActive && "border-teal-500/30",
                  !analysis.outcome && !isActive && "border-gray-200 dark:border-slate-700"
                )}
                style={{
                  background: analysis.outcome === 'correct'
                    ? `linear-gradient(to right, rgba(20, 184, 166, 0.05), rgba(20, 184, 166, 0.15))`
                    : analysis.outcome === 'incorrect'
                    ? `linear-gradient(to right, rgba(251, 146, 60, 0.05), rgba(251, 146, 60, 0.15))`
                    : isActive
                    ? `linear-gradient(to right, rgba(20, 184, 166, 0.02), rgba(20, 184, 166, 0.08))`
                    : undefined
                }}
              >
                {/* Status Corner Ribbon */}
                {isActive && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-2 -right-4 w-20 text-center py-0.5 bg-teal-500 text-white text-[9px] font-bold rotate-45 shadow-sm">
                      LIVE
                    </div>
                  </div>
                )}
                {analysis.outcome === 'correct' && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-2 -right-4 w-20 text-center py-0.5 bg-teal-500 text-white text-[9px] font-bold rotate-45 shadow-sm">
                      TP HIT
                    </div>
                  </div>
                )}
                {analysis.outcome === 'incorrect' && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-2 -right-4 w-20 text-center py-0.5 bg-red-500 text-white text-[9px] font-bold rotate-45 shadow-sm">
                      SL HIT
                    </div>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Analysis Info - Clickable */}
                  <Link href={`/analyze/details/${analysis.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <CoinIcon symbol={analysis.symbol} size={40} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-base">{analysis.symbol}</h3>
                        {analysis.direction && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
                            analysis.direction === 'long'
                              ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}>
                            {analysis.direction === 'long' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {analysis.direction.toUpperCase()}
                          </span>
                        )}
                        {/* Verdict Badge */}
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          verdictConfig.bg, verdictConfig.text
                        )}>
                          {verdictConfig.label}
                        </span>
                        {/* Trade Type Badge */}
                        {tradeTypeConfig && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
                            tradeTypeConfig.color === 'teal' && "bg-teal-500/10 text-teal-600 dark:text-teal-400",
                            tradeTypeConfig.color === 'slate' && "bg-slate-500/10 text-slate-600 dark:text-slate-400",
                            tradeTypeConfig.color === 'amber' && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            <tradeTypeConfig.icon className="w-3 h-3" />
                            {tradeTypeConfig.label}
                          </span>
                        )}
                        {/* Outcome badges */}
                        {analysis.outcome === 'correct' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            TP HIT
                          </span>
                        )}
                        {analysis.outcome === 'incorrect' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" />
                            SL HIT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{analysis.createdAt}</p>
                    </div>
                  </Link>

                  {/* Stats */}
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-transparent flex-wrap justify-center">
                    {/* Score */}
                    <div className={cn(
                      "text-center px-2 py-1 rounded-lg min-w-[45px]",
                      analysis.score !== null && analysis.score >= 7 ? "bg-teal-100 dark:bg-teal-500/20" :
                      analysis.score !== null && analysis.score >= 5 ? "bg-amber-100 dark:bg-amber-500/20" :
                      analysis.score !== null ? "bg-red-100 dark:bg-red-500/20" : "bg-gray-100 dark:bg-slate-700/50"
                    )}>
                      <div className="text-[9px] text-slate-500 dark:text-muted-foreground">Score</div>
                      <div className={cn(
                        "font-bold text-xs",
                        analysis.score !== null && analysis.score >= 7 ? "text-teal-600 dark:text-teal-400" :
                        analysis.score !== null && analysis.score >= 5 ? "text-amber-600 dark:text-amber-400" :
                        analysis.score !== null ? "text-red-600 dark:text-red-400" : "text-gray-500"
                      )}>
                        {analysis.score !== null ? `${(analysis.score * 10).toFixed(0)}%` : '—'}
                      </div>
                    </div>

                    {analysis.unrealizedPnL !== undefined && (
                      <>
                        <div className="text-slate-300 dark:text-muted-foreground/30">|</div>
                        {/* P/L */}
                        <div className={cn(
                          "text-center px-2 py-1 rounded-lg min-w-[50px]",
                          analysis.unrealizedPnL >= 0
                            ? "bg-teal-100 dark:bg-teal-500/20"
                            : "bg-red-100 dark:bg-red-500/20"
                        )}>
                          <div className="text-[9px] text-slate-500 dark:text-muted-foreground">P/L</div>
                          <div className={cn(
                            "font-bold text-xs",
                            analysis.unrealizedPnL >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {analysis.unrealizedPnL >= 0 ? '+' : ''}{analysis.unrealizedPnL.toFixed(2)}%
                          </div>
                        </div>
                      </>
                    )}

                    {/* TP Progress */}
                    {analysis.takeProfit1 && tpProgress !== null && (
                      <>
                        <div className="text-slate-300 dark:text-muted-foreground/30">|</div>
                        <div className={cn(
                          "text-center px-2 py-1 rounded-lg min-w-[45px]",
                          analysis.outcome === 'correct' ? "bg-teal-200 dark:bg-teal-500/30" :
                          analysis.outcome === 'incorrect' ? "bg-red-200 dark:bg-red-500/30" :
                          tpProgress >= 80 ? "bg-teal-100 dark:bg-teal-500/20" :
                          tpProgress >= 50 ? "bg-amber-100 dark:bg-amber-500/20" :
                          "bg-slate-100 dark:bg-slate-500/20"
                        )}>
                          <div className="text-[9px] text-slate-500 dark:text-muted-foreground flex items-center justify-center gap-0.5">
                            <Target className="w-2.5 h-2.5" />
                            TP
                          </div>
                          <div className={cn(
                            "font-bold text-xs",
                            analysis.outcome === 'correct' ? "text-teal-600 dark:text-teal-300" :
                            analysis.outcome === 'incorrect' ? "text-red-600 dark:text-red-300" :
                            tpProgress >= 80 ? "text-teal-600 dark:text-teal-400" :
                            tpProgress >= 50 ? "text-amber-600 dark:text-amber-400" :
                            "text-slate-600 dark:text-slate-400"
                          )}>
                            {tpProgress.toFixed(0)}%
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 justify-center lg:justify-end">
                    {/* Details Button */}
                    <Link
                      href={`/analyze/details/${analysis.id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-500/10 hover:bg-teal-200 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-500 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium hidden sm:inline">Details</span>
                    </Link>
                    {/* AI Expert Button */}
                    <button
                      onClick={(e) => handleAskAIExpert(e, analysis)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 transition"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium hidden sm:inline">AI Expert</span>
                    </button>
                    {/* Email Button */}
                    <button
                      onClick={(e) => handleEmail(e, analysis)}
                      disabled={isLoading && actionLoading?.action === 'email'}
                      className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition disabled:opacity-50"
                      title="Send Email"
                    >
                      {isLoading && actionLoading?.action === 'email' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </button>
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(e, analysis.id)}
                      disabled={isLoading && actionLoading?.action === 'delete'}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-red-500 transition disabled:opacity-50"
                      title="Delete"
                    >
                      {isLoading && actionLoading?.action === 'delete' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
