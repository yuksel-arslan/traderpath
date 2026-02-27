'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X,
  Loader2,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ChevronRight,
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

export function BatchResultsDrawer({ analysisIds, isOpen, onClose }: BatchResultsDrawerProps) {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
              const tradePlan = step6 || step5;
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

  const goCount = analyses.filter(a => a.verdict === 'GO').length;
  const condCount = analyses.filter(a => a.verdict === 'CONDITIONAL GO' || a.verdict === 'COND').length;
  const avgScore = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + a.totalScore, 0) / analyses.length) : 0;

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
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">
                        {analyses.length} assets analyzed
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00F5A0]/10 text-[#00F5A0]">
                        Avg Score: {avgScore}
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
                    </div>
                  </div>
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
                  {analyses.map((a, idx) => {
                    const isBuy = a.direction?.toUpperCase() === 'BUY';
                    const verdictNorm = a.verdict.replace(' ', '_').toLowerCase();
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="rounded-xl p-4 border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all cursor-pointer group"
                        onClick={() => { onClose(); router.push(`/analyze/details/${a.id}`); }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Score Ring */}
                          <ScoreRing score={a.totalScore} size={48} strokeWidth={3} />

                          {/* Coin Info */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CoinIcon symbol={a.symbol} size={28} />
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
                              <span className="text-[10px] text-gray-400 dark:text-white/30">
                                {a.interval} / {getTradeTypeLabel(a.interval)}
                              </span>
                            </div>
                          </div>

                          {/* Trade Levels */}
                          <div className="hidden sm:flex items-center gap-3 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {a.entryPrice && (
                              <div className="text-center">
                                <span className="block text-gray-400 dark:text-white/30">Entry</span>
                                <span className="font-bold text-gray-900 dark:text-white">{formatPrice(a.entryPrice)}</span>
                              </div>
                            )}
                            {a.stopLoss && (
                              <div className="text-center">
                                <span className="block text-[#FF4757]/60">SL</span>
                                <span className="font-bold text-[#FF4757]">{formatPrice(a.stopLoss)}</span>
                              </div>
                            )}
                            {a.takeProfit1 && (
                              <div className="text-center">
                                <span className="block text-[#00F5A0]/60">TP1</span>
                                <span className="font-bold text-[#00F5A0]">{formatPrice(a.takeProfit1)}</span>
                              </div>
                            )}
                            {a.riskRewardRatio && (
                              <div className="text-center">
                                <span className="block text-gray-400 dark:text-white/30">R:R</span>
                                <span className="font-bold text-gray-900 dark:text-white">1:{a.riskRewardRatio.toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-gray-500 dark:group-hover:text-white/40 transition flex-shrink-0" />
                        </div>

                        {/* Mobile Trade Levels */}
                        {a.entryPrice && (
                          <div className="sm:hidden flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-white/[0.04] text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
                          </div>
                        )}
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
