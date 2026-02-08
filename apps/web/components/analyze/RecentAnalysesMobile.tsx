'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Eye,
  Bot,
  Mail,
  Trash2,
  Loader2,
  ChevronDown,
  Filter,
  Zap,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl, authFetch } from '../../lib/api';

const CoinIcon = dynamic(
  () => import('../common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-7 h-7 rounded-full bg-slate-700 animate-pulse" /> }
);

// ─── Types ────────────────────────────────────────────────────────────
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type VerdictFilter = 'all' | 'go' | 'conditional_go' | 'wait' | 'avoid';
type OutcomeFilter = 'all' | 'live' | 'tp' | 'sl';
type SortOption = 'time_desc' | 'time_asc' | 'pnl_desc' | 'pnl_asc' | 'score_desc' | 'score_asc';

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number | null;
  direction: string | null;
  tradeType?: TradeType;
  method?: string;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  tpProgress?: number;
  hasTradePlan?: boolean;
  expiresAt?: string;
}

// ─── Config ───────────────────────────────────────────────────────────
const VERDICT_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  go: { label: 'GO', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  conditional_go: { label: 'COND', dot: 'bg-yellow-500', text: 'text-yellow-400' },
  wait: { label: 'WAIT', dot: 'bg-orange-500', text: 'text-orange-400' },
  avoid: { label: 'AVOID', dot: 'bg-red-500', text: 'text-red-400' },
};

const VERDICT_FILTERS: { value: VerdictFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'go', label: 'GO' },
  { value: 'conditional_go', label: 'COND' },
  { value: 'wait', label: 'WAIT' },
  { value: 'avoid', label: 'AVOID' },
];

const OUTCOME_FILTERS: { value: OutcomeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'LIVE' },
  { value: 'tp', label: 'TP HIT' },
  { value: 'sl', label: 'SL HIT' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'time_desc', label: 'Newest' },
  { value: 'time_asc', label: 'Oldest' },
  { value: 'pnl_desc', label: 'P/L ↓' },
  { value: 'pnl_asc', label: 'P/L ↑' },
  { value: 'score_desc', label: 'Score ↓' },
  { value: 'score_asc', label: 'Score ↑' },
];

// ─── Status Badge Component ──────────────────────────────────────────
function StatusBadge({ outcome, expiresAt }: { outcome?: string | null; expiresAt?: string }) {
  const isActive = expiresAt && new Date(expiresAt) > new Date() && outcome !== 'correct' && outcome !== 'incorrect';

  if (outcome === 'correct') {
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">TP HIT</span>;
  }
  if (outcome === 'incorrect') {
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">SL HIT</span>;
  }
  if (isActive) {
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#4dd0e1]/20 text-[#4dd0e1] flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4dd0e1] animate-pulse" />
        LIVE
      </span>
    );
  }
  return null;
}

// ─── Mobile List Item ─────────────────────────────────────────────────
function AnalysisListItem({
  analysis,
  actionLoading,
  onDelete,
  onEmail,
}: {
  analysis: RecentAnalysis;
  actionLoading: { id: string; action: string } | null;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onEmail: (e: React.MouseEvent, a: RecentAnalysis) => void;
}) {
  const router = useRouter();
  const verdictConfig = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.wait;
  const isLoading = actionLoading?.id === analysis.id;
  const isLong = analysis.direction?.toLowerCase() === 'long';
  const isShort = analysis.direction?.toLowerCase() === 'short';

  return (
    <div
      className={cn(
        'relative rounded-xl border overflow-hidden transition-all',
        'bg-[#071023] active:bg-[#0a1530]',
        analysis.outcome === 'correct' && 'border-emerald-500/30',
        analysis.outcome === 'incorrect' && 'border-red-500/30',
        !analysis.outcome && 'border-white/5'
      )}
    >
      {/* Main row - clickable */}
      <Link
        href={`/analyze/details/${analysis.id}`}
        className="flex items-center gap-3 px-3 py-3"
      >
        {/* Left: Coin Icon */}
        <div className="flex-shrink-0 relative">
          <CoinIcon symbol={analysis.symbol} size={32} />
          {/* Direction micro-indicator */}
          {analysis.direction && (
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center',
              isLong ? 'bg-emerald-500' : isShort ? 'bg-red-500' : 'bg-slate-500'
            )}>
              {isLong ? <TrendingUp className="w-2.5 h-2.5 text-white" /> :
               isShort ? <TrendingDown className="w-2.5 h-2.5 text-white" /> :
               <Minus className="w-2.5 h-2.5 text-white" />}
            </div>
          )}
        </div>

        {/* Center: Name + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white">{analysis.symbol}</span>
            {/* Verdict dot */}
            <span className={cn('w-2 h-2 rounded-full', verdictConfig.dot)} />
            <span className={cn('text-[10px] font-bold', verdictConfig.text)}>{verdictConfig.label}</span>
            {analysis.method === 'mlis_pro' && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                ML
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500">{analysis.createdAt}</span>
            {analysis.score != null && typeof analysis.score === 'number' && (
              <span className={cn(
                'text-[10px] font-semibold',
                analysis.score >= 7 ? 'text-emerald-400' : analysis.score >= 5 ? 'text-amber-400' : 'text-red-400'
              )}>
                {(analysis.score * 10).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Right: Status badge + P/L */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge outcome={analysis.outcome} expiresAt={analysis.expiresAt} />
          {typeof analysis.unrealizedPnL === 'number' && (
            <span className={cn(
              'text-xs font-bold',
              analysis.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {analysis.unrealizedPnL >= 0 ? '+' : ''}{analysis.unrealizedPnL.toFixed(2)}%
            </span>
          )}
        </div>
      </Link>

      {/* Bottom action icons */}
      <div className="flex items-center gap-0.5 px-3 pb-2 pt-0">
        <Link
          href={`/analyze/details/${analysis.id}`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#4dd0e1]/10 text-[#4dd0e1] text-[10px] font-medium hover:bg-[#4dd0e1]/20 transition"
        >
          <Eye className="w-3 h-3" />
          Details
        </Link>
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/ai-expert/nexus?analysisId=${analysis.id}`); }}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
        >
          <Bot className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => onEmail(e, analysis)}
          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => onDelete(e, analysis.id)}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Filter Select ────────────────────────────────────────────────────
function MiniSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white/5 text-white text-[11px] font-medium pl-2 pr-5 py-1 rounded-lg border border-white/5 focus:ring-1 focus:ring-[#4dd0e1] cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#071023]">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
interface RecentAnalysesMobileProps {
  analyses: RecentAnalysis[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onEmail: (e: React.MouseEvent, a: RecentAnalysis) => void;
}

export function RecentAnalysesMobile({ analyses, loading, onRefresh, onDelete, onEmail }: RecentAnalysesMobileProps) {
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('time_desc');
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  const filteredAnalyses = analyses.filter(a => {
    if (verdictFilter !== 'all' && a.verdict !== verdictFilter) return false;
    if (outcomeFilter === 'live' && (a.outcome === 'correct' || a.outcome === 'incorrect')) return false;
    if (outcomeFilter === 'tp' && a.outcome !== 'correct') return false;
    if (outcomeFilter === 'sl' && a.outcome !== 'incorrect') return false;
    return true;
  });

  const sortedAnalyses = [...filteredAnalyses].sort((a, b) => {
    switch (sortBy) {
      case 'time_desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'time_asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'pnl_desc': return (b.unrealizedPnL ?? -Infinity) - (a.unrealizedPnL ?? -Infinity);
      case 'pnl_asc': return (a.unrealizedPnL ?? Infinity) - (b.unrealizedPnL ?? Infinity);
      case 'score_desc': return (b.score ?? -Infinity) - (a.score ?? -Infinity);
      case 'score_asc': return (a.score ?? Infinity) - (b.score ?? Infinity);
      default: return 0;
    }
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading({ id, action: 'delete' });
    try {
      await onDelete(e, id);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#071023] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">
            Recent
            <span className="text-xs font-normal text-slate-500 ml-1">
              ({sortedAnalyses.length}{verdictFilter !== 'all' || outcomeFilter !== 'all' ? `/${analyses.length}` : ''})
            </span>
          </h3>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <MiniSelect
            value={verdictFilter}
            onChange={(v) => setVerdictFilter(v as VerdictFilter)}
            options={VERDICT_FILTERS}
          />
          <MiniSelect
            value={outcomeFilter}
            onChange={(v) => setOutcomeFilter(v as OutcomeFilter)}
            options={OUTCOME_FILTERS}
          />
          <MiniSelect
            value={sortBy}
            onChange={(v) => setSortBy(v as SortOption)}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* List */}
      <div className="px-3 py-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-5 h-5 text-[#4dd0e1] animate-spin" />
            <span className="text-xs text-slate-500">Loading...</span>
          </div>
        ) : sortedAnalyses.length === 0 ? (
          <div className="text-center py-8">
            {verdictFilter !== 'all' || outcomeFilter !== 'all' ? (
              <>
                <Filter className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-slate-500">No matching analyses</p>
                <button
                  onClick={() => { setVerdictFilter('all'); setOutcomeFilter('all'); }}
                  className="text-xs text-[#4dd0e1] hover:underline mt-1"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <h3 className="text-sm font-medium text-slate-400 mb-1">No analyses yet</h3>
                <p className="text-xs text-slate-500">Complete the flow above to run your first analysis</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAnalyses.map(analysis => (
              <AnalysisListItem
                key={analysis.id}
                analysis={analysis}
                actionLoading={actionLoading}
                onDelete={handleDelete}
                onEmail={onEmail}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
