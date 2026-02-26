'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { PulseDot, VerdictBadge } from '../ui/intelligence';
import { TerminalSummaryBar } from './TerminalSummaryBar';
import { X, Plus, Play, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';

const CoinIcon = dynamic(
  () => import('../common/CoinIcon').then((mod) => ({ default: mod.CoinIcon })),
  {
    ssr: false,
    loading: () => (
      <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse shrink-0" />
    ),
  }
);

interface ScreenerAsset {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  aiScore: number;
  trend: string;
  verdict: string;
  direction: string;
  market: string;
  phase: string;
  rsi: number;
  macd: string;
  flowScore: number;
  analysisId?: string;
}

interface TradePlan {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  rr: number;
  direction: 'LONG' | 'SHORT';
}

interface AnalysisResult {
  symbol: string;
  classicDone: boolean;
  mlisDone: boolean;
  tradePlan?: TradePlan;
  verdict?: string;
  direction?: string;
  score?: number;
}

interface RunAnalysisProps {
  screenerData: ScreenerAsset[];
  recommendedSymbols: string[];
  onAnalysisComplete: (results: AnalysisResult[]) => void;
  calculateTradePlan: (asset: ScreenerAsset) => TradePlan;
}

export function RunAnalysis({
  screenerData,
  recommendedSymbols,
  onAnalysisComplete,
  calculateTradePlan,
}: RunAnalysisProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [phase, setPhase] = useState<'select' | 'running_classic' | 'running_mlis' | 'done'>('select');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [addInput, setAddInput] = useState('');

  // Initialize with L4 recommended symbols
  useEffect(() => {
    if (selectedSymbols.length === 0 && recommendedSymbols.length > 0) {
      setSelectedSymbols([...recommendedSymbols]);
    }
  }, [recommendedSymbols]); // eslint-disable-line react-hooks/exhaustive-deps

  const addSymbol = useCallback(
    (sym: string) => {
      const upper = sym.toUpperCase().trim();
      if (upper && !selectedSymbols.includes(upper)) {
        setSelectedSymbols((prev) => [...prev, upper]);
      }
      setAddInput('');
    },
    [selectedSymbols]
  );

  const removeSymbol = useCallback((sym: string) => {
    setSelectedSymbols((prev) => prev.filter((s) => s !== sym));
  }, []);

  // Quick add: filter out already-selected + duplicates
  const availableSymbols = useMemo(
    () =>
      screenerData
        .map((a) => a.symbol.toUpperCase())
        .filter((s) => !selectedSymbols.includes(s))
        .slice(0, 10),
    [screenerData, selectedSymbols]
  );

  const handleRunAnalysis = useCallback(() => {
    if (selectedSymbols.length === 0) return;

    // Immediate UI feedback (fixes INP issue)
    setPhase('running_classic');
    setCurrentIdx(0);
    setResults([]);

    const allResults: AnalysisResult[] = selectedSymbols.map((sym) => ({
      symbol: sym,
      classicDone: false,
      mlisDone: false,
    }));
    setResults(allResults);

    let step = 0;
    const total = selectedSymbols.length * 2;

    const runNext = () => {
      step++;
      const assetIdx =
        step <= selectedSymbols.length
          ? step - 1
          : step - selectedSymbols.length - 1;

      if (step <= selectedSymbols.length) {
        setPhase('running_classic');
        setCurrentIdx(assetIdx);
        setResults((prev) =>
          prev.map((r, i) => {
            if (i === assetIdx) {
              const asset = screenerData.find(
                (a) => a.symbol.toUpperCase() === r.symbol.toUpperCase()
              );
              return {
                ...r,
                classicDone: true,
                tradePlan: asset ? calculateTradePlan(asset as ScreenerAsset) : undefined,
                verdict: asset?.verdict,
                direction: asset?.direction,
                score: asset?.aiScore,
              };
            }
            return r;
          })
        );
      } else if (step <= total) {
        setPhase('running_mlis');
        setCurrentIdx(assetIdx);
        setResults((prev) =>
          prev.map((r, i) => (i === assetIdx ? { ...r, mlisDone: true } : r))
        );
      }

      if (step < total) {
        setTimeout(runNext, 800);
      } else {
        setTimeout(() => {
          setPhase('done');
          setResults((prev) => {
            onAnalysisComplete(prev);
            return prev;
          });
        }, 500);
      }
    };

    // Use requestAnimationFrame for better INP
    requestAnimationFrame(() => {
      setTimeout(runNext, 600);
    });
  }, [selectedSymbols, screenerData, onAnalysisComplete, calculateTradePlan]);

  // Estimation
  const estimatedMinutes = selectedSymbols.length > 0 ? `${Math.ceil(selectedSymbols.length * 1.5)}-${Math.ceil(selectedSymbols.length * 2)}` : '0';
  const estimatedCredits = selectedSymbols.length * 35;

  // SELECT phase
  if (phase === 'select') {
    return (
      <section>
        <TerminalSummaryBar
          title="Analysis Queue"
          subtitle="L4 recommended assets. Each runs 7-Step + MLIS Pro."
          status="neutral"
        />

        {/* Assets to analyze */}
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40 mb-2">
            Assets to analyze ({selectedSymbols.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedSymbols.map((sym) => (
              <span
                key={sym}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg text-gray-900 dark:text-white"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CoinIcon symbol={sym} size={14} />
                <span className="font-mono font-semibold">{sym}</span>
                <button
                  onClick={() => removeSymbol(sym)}
                  className="ml-0.5 text-gray-400 hover:text-[#FF4757] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedSymbols.length === 0 && (
              <span className="text-[11px] text-gray-400 dark:text-white/40">
                No assets selected
              </span>
            )}
          </div>
        </div>

        {/* Add asset input */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
            <input
              type="text"
              placeholder="Add symbol (e.g. SOL)..."
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && addInput.trim()) addSymbol(addInput);
              }}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          </div>
          <button
            onClick={() => {
              if (addInput.trim()) addSymbol(addInput);
            }}
            className="px-3 py-2 text-xs rounded-lg transition-colors text-gray-400 dark:text-white/40 hover:text-white"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Add
          </button>
        </div>

        {/* Quick add (filtered, no duplicates) */}
        {availableSymbols.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40 mb-1.5">
              Quick add (AI-suggested)
            </div>
            <div className="flex flex-wrap gap-1">
              {availableSymbols.map((sym) => (
                <button
                  key={sym}
                  onClick={() => addSymbol(sym)}
                  className="px-2 py-0.5 text-[10px] font-mono rounded transition-colors text-gray-400 dark:text-white/40 hover:text-[#00D4FF] hover:border-[#00D4FF]/30"
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  + {sym}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estimation */}
        {selectedSymbols.length > 0 && (
          <div
            className="rounded-xl p-3 mb-4 text-[11px] text-gray-400 dark:text-white/40"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between">
              <span>
                {selectedSymbols.length} assets x (7-Step + MLIS Pro) ~{' '}
                <span className="text-white font-mono">{estimatedMinutes} min</span>
              </span>
              <span>
                Credits:{' '}
                <span className="text-[#FFB800] font-mono">{estimatedCredits}</span>
              </span>
            </div>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={handleRunAnalysis}
          disabled={selectedSymbols.length === 0}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all',
            selectedSymbols.length > 0
              ? 'text-white hover:opacity-90'
              : 'bg-gray-200 dark:bg-white/[0.06] text-gray-400 dark:text-white/30 cursor-not-allowed',
          )}
          style={
            selectedSymbols.length > 0
              ? {
                  background: 'linear-gradient(135deg, #00F5A0, #00D4FF)',
                }
              : undefined
          }
        >
          <Play className="w-4 h-4" />
          Run 7-Step + MLIS Pro ({selectedSymbols.length} asset
          {selectedSymbols.length !== 1 ? 's' : ''})
        </button>
      </section>
    );
  }

  // RUNNING / DONE phase
  const totalSteps = selectedSymbols.length * 2;
  const completedSteps =
    results.filter((r) => r.classicDone).length +
    results.filter((r) => r.mlisDone).length;
  const progressPct =
    phase === 'done' ? 100 : Math.round((completedSteps / totalSteps) * 100);

  return (
    <section>
      <TerminalSummaryBar
        title={
          phase === 'done'
            ? 'Analysis Complete'
            : phase === 'running_classic'
            ? '7-Step Analysis Running...'
            : 'MLIS Pro Running...'
        }
        subtitle={`${completedSteps}/${totalSteps} steps completed`}
        score={progressPct}
        status={phase === 'done' ? 'positive' : 'neutral'}
        live={phase !== 'done'}
      />

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40">
            {phase === 'done'
              ? 'Complete'
              : phase === 'running_classic'
              ? '7-Step Analysis'
              : 'MLIS Pro'}
          </span>
          <span className="text-[10px] font-mono text-gray-400 dark:text-white/40 tabular-nums">
            {completedSteps}/{totalSteps}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background:
                phase === 'done'
                  ? '#00F5A0'
                  : phase === 'running_mlis'
                  ? '#A855F7'
                  : 'linear-gradient(135deg, #00F5A0, #00D4FF)',
            }}
          />
        </div>
      </div>

      {/* Per-asset status */}
      <div className="space-y-1.5 mb-4">
        {results.map((r) => (
          <div
            key={r.symbol}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{
              background:
                r.mlisDone
                  ? 'rgba(0,245,160,0.03)'
                  : r.classicDone
                  ? 'rgba(0,212,255,0.03)'
                  : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <CoinIcon symbol={r.symbol} size={18} />
            <span className="text-xs font-semibold text-gray-900 dark:text-white flex-1 font-mono">
              {r.symbol}
            </span>

            {/* 7-Step status */}
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded font-mono',
                r.classicDone
                  ? 'text-[#00F5A0]'
                  : 'text-gray-400 dark:text-white/30',
              )}
              style={{
                background: r.classicDone
                  ? 'rgba(0,245,160,0.1)'
                  : 'rgba(255,255,255,0.06)',
              }}
            >
              {r.classicDone ? (
                <span className="flex items-center gap-0.5">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  7-Step
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <PulseDot color="#00D4FF" size={4} /> 7-Step
                </span>
              )}
            </span>

            {/* MLIS status */}
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded font-mono',
                r.mlisDone
                  ? 'text-[#A855F7]'
                  : 'text-gray-400 dark:text-white/30',
              )}
              style={{
                background: r.mlisDone
                  ? 'rgba(168,85,247,0.1)'
                  : 'rgba(255,255,255,0.06)',
              }}
            >
              {r.mlisDone ? (
                <span className="flex items-center gap-0.5">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  MLIS
                </span>
              ) : (
                '... MLIS'
              )}
            </span>

            {r.verdict && <VerdictBadge verdict={r.verdict} />}
          </div>
        ))}
      </div>

      {/* Run again */}
      {phase === 'done' && (
        <button
          onClick={() => {
            setPhase('select');
            setResults([]);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-gray-400 dark:text-white/40 transition-colors hover:text-white"
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <RefreshCw className="w-3 h-3" /> Run New Analysis
        </button>
      )}
    </section>
  );
}
