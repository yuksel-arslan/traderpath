'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X,
  Globe,
  Target,
  Shield,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { authFetch } from '../../lib/api';
import { ScoreRing, VerdictBadge } from '@/components/ui/intelligence';
import { CoinIcon } from '../common/CoinIcon';

interface AnalysisReportDrawerProps {
  analysisId: string | null;
  onClose: () => void;
}

interface AnalysisData {
  id: string;
  symbol: string;
  interval: string;
  totalScore: number;
  createdAt: string;
  expiresAt: string;
  outcome?: string;
  method?: string;
  step1Result?: Record<string, unknown>;
  step2Result?: Record<string, unknown>;
  step3Result?: Record<string, unknown>;
  step4Result?: Record<string, unknown>;
  step5Result?: Record<string, unknown>;
  step6Result?: Record<string, unknown>;
  step7Result?: Record<string, unknown>;
}

const STEPS = [
  { key: 'step1Result', name: 'Market Pulse', icon: Globe, color: '#3B82F6' },
  { key: 'step2Result', name: 'Asset Scanner', icon: Target, color: '#06B6D4' },
  { key: 'step3Result', name: 'Safety Check', icon: Shield, color: '#F97316' },
  { key: 'step4Result', name: 'Timing Analysis', icon: Clock, color: '#A855F7' },
  { key: 'step5Result', name: 'Trap Check', icon: AlertTriangle, color: '#EF4444' },
  { key: 'step6Result', name: 'Trade Plan', icon: FileText, color: '#6366F1' },
  { key: 'step7Result', name: 'Final Verdict', icon: CheckCircle, color: '#22C55E' },
];

function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function getVerdictFromStep7(step7: Record<string, unknown> | undefined): string {
  if (!step7) return 'WAIT';
  const action = step7.action || step7.verdict || step7.recommendation || '';
  return typeof action === 'string' ? action.toUpperCase().replace('_', ' ') : 'WAIT';
}

function getDirectionFromAnalysis(analysis: AnalysisData): string | null {
  const tradePlan = analysis.step5Result as Record<string, unknown> | undefined;
  const verdict = analysis.step7Result as Record<string, unknown> | undefined;
  return (tradePlan?.direction as string) || (verdict?.direction as string) || null;
}

function getTradeTypeLabel(interval: string): string {
  if (interval === '5m' || interval === '15m') return 'Scalping';
  if (interval === '30m' || interval === '1h' || interval === '2h' || interval === '4h') return 'Day Trade';
  return 'Swing Trade';
}

export function AnalysisReportDrawer({ analysisId, onClose }: AnalysisReportDrawerProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const open = !!analysisId;

  const fetchAnalysis = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await authFetch(`/api/analysis/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setAnalysis(data.data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // retry
      }
      await new Promise(r => setTimeout(r, 800));
    }
    setError('Could not load analysis data');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (analysisId) {
      setAnalysis(null);
      fetchAnalysis(analysisId);
    }
  }, [analysisId, fetchAnalysis]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  }, [onClose]);

  const handleViewDetails = () => {
    if (analysisId) {
      onClose();
      router.push(`/analyze/details/${analysisId}`);
    }
  };

  // Extract data
  const verdict = analysis ? getVerdictFromStep7(analysis.step7Result) : '';
  const direction = analysis ? getDirectionFromAnalysis(analysis) : null;
  const isBuy = direction?.toUpperCase() === 'BUY';
  const tradePlan = analysis?.step5Result as Record<string, unknown> | undefined;
  const entryPrice = tradePlan?.entryPrice as number | undefined;
  const stopLoss = tradePlan?.stopLoss as number | undefined;
  const tp1 = tradePlan?.takeProfit1 as number | undefined;
  const tp2 = tradePlan?.takeProfit2 as number | undefined;
  const tp3 = tradePlan?.takeProfit3 as number | undefined;
  const riskReward = tradePlan?.riskRewardRatio as number | undefined;

  return (
    <AnimatePresence>
      {open && (
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
                <span className="text-sm text-gray-500 dark:text-white/40">Loading analysis report...</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <span className="text-sm text-gray-500 dark:text-white/40">{error}</span>
                <button onClick={onClose} className="mt-2 px-4 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 transition">Close</button>
              </div>
            ) : analysis ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-200 dark:border-white/[0.06] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={analysis.symbol} size={36} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {analysis.symbol.replace(/USDT$/i, '')}
                        </h3>
                        <VerdictBadge verdict={verdict} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase">{analysis.interval} / {getTradeTypeLabel(analysis.interval)}</span>
                        {direction && (
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', isBuy ? 'text-[#00F5A0] bg-[#00F5A0]/10' : 'text-[#FF4757] bg-[#FF4757]/10')}>
                            {isBuy ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                            {direction.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">

                  {/* Score + Trade Plan */}
                  <div className="flex gap-4">
                    {/* Score */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                      <ScoreRing score={Math.round((analysis.totalScore ?? 0) * 10)} size={72} strokeWidth={4} />
                      <span className="text-[10px] text-gray-400 dark:text-white/30 mt-1 uppercase tracking-wider">Score</span>
                    </div>

                    {/* Trade Plan Levels */}
                    {entryPrice && (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                          <span className="text-[10px] text-gray-400 dark:text-white/30 block mb-1">Entry</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatPrice(entryPrice)}</span>
                        </div>
                        {stopLoss && (
                          <div className="p-3 rounded-xl bg-[#FF4757]/5 border border-[#FF4757]/20">
                            <span className="text-[10px] text-[#FF4757]/60 block mb-1">Stop Loss</span>
                            <span className="text-sm font-bold text-[#FF4757]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatPrice(stopLoss)}</span>
                          </div>
                        )}
                        {tp1 && (
                          <div className="p-3 rounded-xl bg-[#00F5A0]/5 border border-[#00F5A0]/20">
                            <span className="text-[10px] text-[#00F5A0]/60 block mb-1">TP1</span>
                            <span className="text-sm font-bold text-[#00F5A0]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatPrice(tp1)}</span>
                          </div>
                        )}
                        {(tp2 || riskReward) && (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                            {tp2 ? (
                              <>
                                <span className="text-[10px] text-gray-400 dark:text-white/30 block mb-1">TP2</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatPrice(tp2)}</span>
                              </>
                            ) : riskReward ? (
                              <>
                                <span className="text-[10px] text-gray-400 dark:text-white/30 block mb-1">R:R</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>1:{riskReward.toFixed(1)}</span>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 7 Steps Summary */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">Analysis Steps</span>
                    {STEPS.map(step => {
                      const data = analysis[step.key as keyof AnalysisData] as Record<string, unknown> | undefined;
                      const score = (data?.score as number) ?? (data?.overallScore as number) ?? null;
                      const signal = (data?.signal as string) ?? (data?.action as string) ?? (data?.verdict as string) ?? null;
                      const StepIcon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${step.color}15` }}>
                            <StepIcon className="w-3.5 h-3.5" style={{ color: step.color }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-white/70 flex-1">{step.name}</span>
                          {score !== null && (
                            <span className={cn('text-xs font-bold', score >= 70 ? 'text-[#00F5A0]' : score >= 40 ? 'text-[#FFB800]' : 'text-[#FF4757]')} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {Math.round(score)}
                            </span>
                          )}
                          {signal && !score && (
                            <span className="text-[10px] font-medium text-gray-500 dark:text-white/40 uppercase">{typeof signal === 'string' ? signal.slice(0, 12) : ''}</span>
                          )}
                          <CheckCircle className="w-3.5 h-3.5 text-[#00F5A0] flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 dark:border-white/[0.06] grid grid-cols-2 gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleViewDetails}
                    className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}
                  >
                    Full Report <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
