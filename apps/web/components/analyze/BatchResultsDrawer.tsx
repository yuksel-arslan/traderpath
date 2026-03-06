'use client';

import type React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Clock,
  Info,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { authFetch } from '../../lib/api';
import { ScoreRing, VerdictBadge } from '@/components/ui/intelligence';
import { CoinIcon } from '../common/CoinIcon';

interface BatchResultsDrawerProps {
  analysisIds: string[];
  isOpen: boolean;
  onClose: () => void;
}

interface ReasonItem {
  factor: string;
  positive: boolean;
  impact: string;
  source?: string;
}

interface AnalysisSummary {
  id: string;
  symbol: string;
  interval: string;
  totalScore: number;
  direction: string | null;
  verdict: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  riskRewardRatio: number | null;
  reasons: ReasonItem[];
  recommendation: string;
  economicBlock: boolean;
  economicBlockReason: string | null;
}

function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function getTradeTypeLabel(interval: string): string {
  if (interval === '5m' || interval === '15m') return 'Scalping';
  if (interval === '30m' || interval === '1h' || interval === '2h' || interval === '4h') return 'Day Trade';
  return 'Swing Trade';
}

function extractVerdict(step7: Record<string, unknown> | undefined): string {
  if (!step7) return 'WAIT';
  const action = step7.action || step7.verdict || step7.recommendation || '';
  return typeof action === 'string' ? action.toUpperCase().replace('_', ' ') : 'WAIT';
}

function extractReasons(step7: Record<string, unknown> | undefined): ReasonItem[] {
  if (!step7) return [];

  // Try confidenceFactors first (final verdict level)
  const cf = step7.confidenceFactors as ReasonItem[] | undefined;
  if (cf && Array.isArray(cf) && cf.length > 0) {
    return cf.filter(r => !r.positive);
  }

  // Fall back to preliminaryVerdict.reasons
  const pv = step7.preliminaryVerdict as Record<string, unknown> | undefined;
  if (pv) {
    const reasons = pv.reasons as ReasonItem[] | undefined;
    if (reasons && Array.isArray(reasons)) {
      return reasons.filter(r => !r.positive);
    }
  }

  return [];
}

function extractEconomicBlock(step1: Record<string, unknown> | undefined): { blocked: boolean; reason: string | null } {
  if (!step1) return { blocked: false, reason: null };
  const ec = step1.economicCalendar as Record<string, unknown> | undefined;
  if (!ec) return { blocked: false, reason: null };
  const riskLevel = ec.riskLevel as string | undefined;
  const shouldBlock = ec.shouldBlockTrade as boolean | undefined;
  const reason = ec.riskReason as string | undefined;
  return {
    blocked: shouldBlock === true || riskLevel === 'high',
    reason: reason || null,
  };
}

/** Categorize a reason factor string into a human-readable category */
function categorizeReason(factor: string): string {
  const f = factor.toLowerCase();
  if (f.includes('macro penalty') || f.includes('economic') || f.includes('fomc') || f.includes('cpi') || f.includes('nfp')) {
    return 'Economic Event';
  }
  if (f.includes('overbought') || f.includes('rsi')) return 'RSI Overbought';
  if (f.includes('oversold')) return 'RSI Oversold';
  if (f.includes('fear') || f.includes('greed')) return 'Extreme Sentiment';
  if (f.includes('trap') || f.includes('bull trap') || f.includes('bear trap')) return 'Trap Detected';
  if (f.includes('manipulation') || f.includes('pump') || f.includes('dump') || f.includes('whale')) return 'Manipulation Risk';
  if (f.includes('safety') || f.includes('risk')) return 'Safety Concern';
  if (f.includes('market pulse') || f.includes('regime')) return 'Market Conditions';
  if (f.includes('meta-ensemble') || f.includes('p(up)')) return 'Low Probability';
  if (f.includes('timing') || f.includes('wait for')) return 'Bad Timing';
  return 'Risk Factor';
}

/** Get suggestion text based on dominant reason categories */
function getSuggestion(categories: string[]): string {
  if (categories.includes('Economic Event')) {
    return 'Re-analyze after the economic event passes and volatility settles (usually 2-4 hours).';
  }
  if (categories.includes('Extreme Sentiment')) {
    return 'Market sentiment is at extremes. Wait for normalization before entering positions.';
  }
  if (categories.includes('RSI Overbought')) {
    return 'Assets are technically overbought. Wait for a pullback or RSI to cool below 70.';
  }
  if (categories.includes('Manipulation Risk')) {
    return 'Unusual market activity detected. Avoid trading until whale movements stabilize.';
  }
  if (categories.includes('Trap Detected')) {
    return 'Price patterns suggest a potential trap. Wait for confirmation of the real trend.';
  }
  return 'Current conditions are unfavorable. Set alerts and re-analyze when market structure improves.';
}

/** Get icon color for a reason category */
function getReasonColor(category: string): string {
  switch (category) {
    case 'Economic Event': return '#FFB800';
    case 'Extreme Sentiment': return '#FF4757';
    case 'RSI Overbought':
    case 'RSI Oversold': return '#A855F7';
    case 'Trap Detected': return '#FF6B35';
    case 'Manipulation Risk': return '#FF4757';
    default: return '#FF4757';
  }
}

export function BatchResultsDrawer({ analysisIds, isOpen, onClose }: BatchResultsDrawerProps) {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef<string[]>([]);

  const fetchAllAnalyses = useCallback(async (ids: string[]) => {
    setLoading(true);
    setError(null);
    const results: AnalysisSummary[] = [];

    for (const id of ids) {
      let fetched = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await authFetch(`/api/analysis/${id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              const a = data.data;
              const step7 = a.step7Result as Record<string, unknown> | undefined;
              const step5 = a.step5Result as Record<string, unknown> | undefined;
              const step6 = a.step6Result as Record<string, unknown> | undefined;
              const step1 = a.step1Result as Record<string, unknown> | undefined;
              const tradePlan = step6 || step5;
              const economicBlock = extractEconomicBlock(step1);
              results.push({
                id: a.id,
                symbol: a.symbol,
                interval: a.interval || '',
                totalScore: a.totalScore ?? 0,
                direction: (tradePlan?.direction as string) || (step7?.direction as string) || null,
                verdict: extractVerdict(step7),
                entryPrice: (tradePlan?.entryPrice as number) || null,
                stopLoss: (tradePlan?.stopLoss as number) || null,
                takeProfit1: (tradePlan?.takeProfit1 as number) || null,
                riskRewardRatio: (tradePlan?.riskRewardRatio as number) || null,
                reasons: extractReasons(step7),
                recommendation: (step7?.recommendation as string) || '',
                economicBlock: economicBlock.blocked,
                economicBlockReason: economicBlock.reason,
              });
              fetched = true;
              break;
            }
          }
        } catch {
          // retry
        }
        await new Promise(r => setTimeout(r, 600));
      }
      if (!fetched) {
        results.push({
          id,
          symbol: 'UNKNOWN',
          interval: '',
          totalScore: 0,
          direction: null,
          verdict: 'ERROR',
          entryPrice: null,
          stopLoss: null,
          takeProfit1: null,
          riskRewardRatio: null,
          reasons: [],
          recommendation: '',
          economicBlock: false,
          economicBlockReason: null,
        });
      }
    }

    setAnalyses(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && analysisIds.length > 0) {
      const key = analysisIds.join(',');
      if (fetchedRef.current.join(',') !== key) {
        fetchedRef.current = analysisIds;
        setAnalyses([]);
        setExpandedId(null);
        fetchAllAnalyses(analysisIds);
      }
    }
  }, [isOpen, analysisIds, fetchAllAnalyses]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  }, [onClose]);

  // Verdict counts
  const goCount = analyses.filter((a: AnalysisSummary) => a.verdict === 'GO').length;
  const condCount = analyses.filter((a: AnalysisSummary) => a.verdict === 'CONDITIONAL GO' || a.verdict === 'COND').length;
  const avoidCount = analyses.filter((a: AnalysisSummary) => a.verdict === 'AVOID').length;
  const waitCount = analyses.filter((a: AnalysisSummary) => a.verdict === 'WAIT').length;
  const avgScore = analyses.length > 0 ? Math.round(analyses.reduce((s: number, a: AnalysisSummary) => s + a.totalScore, 0) / analyses.length) : 0;

  // Group common reasons across all analyses
  const allNegativeReasons = analyses.flatMap((a: AnalysisSummary) => a.reasons);
  const categoryCount = new Map<string, number>();
  for (const r of allNegativeReasons) {
    const cat = categorizeReason(r.factor);
    categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
  }
  // Sort by frequency — most common first
  const topCategories = [...categoryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Check if there's a dominant issue (affects majority of analyses)
  const hasEconomicBlock = analyses.some((a: AnalysisSummary) => a.economicBlock);
  const allAvoidOrWait = avoidCount + waitCount === analyses.length && analyses.length > 0;
  const suggestion = getSuggestion(topCategories.map(([cat]: [string, number]) => cat));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 inset-x-0 z-[90] max-h-[88vh] flex flex-col rounded-t-3xl overflow-hidden bg-white dark:bg-[#0A0F1A]/98 backdrop-blur-2xl border-t border-gray-200 dark:border-white/10"
            style={{ boxShadow: '0 -12px 60px rgba(0,0,0,0.25)' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00F5A0' }} />
                <span className="text-sm text-gray-500 dark:text-white/40">Loading analysis results...</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <span className="text-sm text-gray-500 dark:text-white/40">{error}</span>
                <button onClick={onClose} className="mt-2 px-4 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 transition">Close</button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-200 dark:border-white/[0.06] flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Batch Analysis Complete
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">
                        {analyses.length} assets
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00F5A0]/10 text-[#00F5A0]">
                        Avg {avgScore}
                      </span>
                      {goCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {goCount} GO
                        </span>
                      )}
                      {condCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {condCount} COND
                        </span>
                      )}
                      {avoidCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                          {avoidCount} AVOID
                        </span>
                      )}
                      {waitCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                          {waitCount} WAIT
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
                  {/* Insight Banner — shown when majority AVOID/WAIT */}
                  {allAvoidOrWait && topCategories.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl p-4 border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/[0.06]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            {hasEconomicBlock
                              ? 'Trade blocked — high-impact economic event detected'
                              : 'No actionable trades found at this time'}
                          </p>
                          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/60 mt-1">
                            Capital flow identified this sector as an opportunity, but current market conditions
                            make immediate entry risky. This is the system protecting your capital.
                          </p>

                          {/* Grouped common reasons */}
                          <div className="mt-3 space-y-1.5">
                            {topCategories.map(([category, count]) => (
                              <div key={category} className="flex items-center gap-2">
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: getReasonColor(category) }}
                                />
                                <span className="text-[11px] text-amber-800 dark:text-amber-300/80">
                                  {category}
                                  {count > 1 && (
                                    <span className="text-amber-600/50 dark:text-amber-400/40 ml-1">
                                      ({count}/{analyses.length} assets)
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Actionable suggestion */}
                          <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-500/10 flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-300/70">
                              {suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Results List */}
                  {analyses.map((a: AnalysisSummary, idx: number) => {
                    const isBuy = a.direction?.toUpperCase() === 'BUY' || a.direction?.toUpperCase() === 'LONG';
                    const isExpanded = expandedId === a.id;
                    const assetReasons = a.reasons.slice(0, 4);

                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] overflow-hidden transition-all"
                      >
                        {/* Compact row (always visible) */}
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors group"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : a.id);
                          }}
                        >
                          <ScoreRing score={Math.round((a.totalScore ?? 0) * 10)} size={42} strokeWidth={3} />

                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CoinIcon symbol={a.symbol} size={24} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {a.symbol.replace(/USDT$/i, '')}
                                </span>
                                <VerdictBadge verdict={a.verdict} />
                                {a.direction && (
                                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', isBuy ? 'text-[#00F5A0] bg-[#00F5A0]/10' : 'text-[#FF4757] bg-[#FF4757]/10')}>
                                    {isBuy ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                                    {a.direction.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {/* Brief reason snippet when not expanded */}
                              {!isExpanded && assetReasons.length > 0 && (
                                <span className="text-[10px] text-gray-400 dark:text-white/30 line-clamp-1">
                                  {assetReasons[0].factor.replace(/^⚠️\s*/, '')}
                                  {assetReasons.length > 1 && ` +${assetReasons.length - 1} more`}
                                </span>
                              )}
                              {!isExpanded && assetReasons.length === 0 && (
                                <span className="text-[10px] text-gray-400 dark:text-white/30">
                                  {a.interval} / {getTradeTypeLabel(a.interval)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expand/collapse indicator */}
                          <ChevronDown className={cn(
                            'w-4 h-4 text-gray-300 dark:text-white/20 transition-transform flex-shrink-0',
                            isExpanded && 'rotate-180'
                          )} />
                        </div>

                        {/* Expandable details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-white/[0.04]">
                                {/* Timeframe info */}
                                <div className="pt-3 flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">
                                    {a.interval} / {getTradeTypeLabel(a.interval)}
                                  </span>
                                </div>

                                {/* Economic block warning */}
                                {a.economicBlock && (
                                  <div className="flex items-start gap-2 rounded-lg p-2.5 bg-red-50 dark:bg-red-500/[0.06] border border-red-100 dark:border-red-500/15">
                                    <ShieldAlert className="w-3.5 h-3.5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                                        Trade Blocked
                                      </span>
                                      {a.economicBlockReason && (
                                        <p className="text-[10px] text-red-600/70 dark:text-red-400/60 mt-0.5">
                                          {a.economicBlockReason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Reasons list */}
                                {assetReasons.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">
                                      Key Factors
                                    </span>
                                    {assetReasons.map((r: ReasonItem, i: number) => {
                                      const cat = categorizeReason(r.factor);
                                      return (
                                        <div key={i} className="flex items-start gap-2">
                                          <div
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                                            style={{ background: r.positive ? '#00F5A0' : getReasonColor(cat) }}
                                          />
                                          <span className={cn(
                                            'text-[11px]',
                                            r.positive
                                              ? 'text-emerald-700 dark:text-emerald-400'
                                              : 'text-gray-600 dark:text-white/50'
                                          )}>
                                            {r.factor.replace(/^⚠️\s*/, '')}
                                            {r.source && (
                                              <span className="text-gray-400 dark:text-white/20 ml-1">
                                                — {r.source}
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Trade Levels (if available) */}
                                {a.entryPrice && (
                                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.04] text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    <div>
                                      <span className="text-gray-400 dark:text-white/30">Entry </span>
                                      <span className="font-bold text-gray-900 dark:text-white">{formatPrice(a.entryPrice)}</span>
                                    </div>
                                    {a.stopLoss && (
                                      <div>
                                        <span className="text-[#FF4757]/60">SL </span>
                                        <span className="font-bold text-[#FF4757]">{formatPrice(a.stopLoss)}</span>
                                      </div>
                                    )}
                                    {a.takeProfit1 && (
                                      <div>
                                        <span className="text-[#00F5A0]/60">TP1 </span>
                                        <span className="font-bold text-[#00F5A0]">{formatPrice(a.takeProfit1)}</span>
                                      </div>
                                    )}
                                    {a.riskRewardRatio && (
                                      <div>
                                        <span className="text-gray-400 dark:text-white/30">R:R </span>
                                        <span className="font-bold text-gray-900 dark:text-white">1:{a.riskRewardRatio.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* View full analysis link */}
                                <button
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onClose();
                                    router.push(`/analyze/details/${a.id}`);
                                  }}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-[#00D4FF] hover:text-[#00F5A0] transition-colors mt-1"
                                >
                                  View Full Analysis
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 dark:border-white/[0.06]">
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
