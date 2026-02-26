'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScoreRing, PulseDot, VerdictBadge } from '@/components/ui/intelligence';

interface RecentAnalysisItem {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number | null;
  direction: string | null;
  method?: string;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit1?: number;
}

interface RecentAnalysisRowProps {
  item: RecentAnalysisItem;
}

function verdictToLabel(verdict: string): string {
  if (verdict === 'go') return 'GO';
  if (verdict === 'conditional_go') return 'COND';
  if (verdict === 'wait') return 'WAIT';
  if (verdict === 'avoid') return 'AVOID';
  return 'WAIT';
}

export function RecentAnalysisRow({ item }: RecentAnalysisRowProps) {
  const [expanded, setExpanded] = useState(false);
  const score = item.score ?? 0;
  const isLive = item.outcome === 'pending';
  const direction = item.direction?.toUpperCase() || '';

  return (
    <div
      className="rounded-xl overflow-hidden transition-all bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06]"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all text-left"
      >
        <ScoreRing score={score} size={40} strokeWidth={2.5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold text-gray-900 dark:text-white"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {item.symbol.replace(/USDT$/i, '')}
            </span>
            <VerdictBadge verdict={verdictToLabel(item.verdict)} />
            <span className="text-[10px] text-gray-400 dark:text-white/25">
              {item.method || 'classic'}
            </span>
          </div>
          <div className="text-[11px] mt-0.5 text-gray-500 dark:text-white/35">
            {item.createdAt}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {direction && direction !== 'NEUTRAL' && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{
                background: direction === 'LONG' ? 'rgba(0,245,160,0.1)' : 'rgba(255,71,87,0.1)',
                color: direction === 'LONG' ? '#00F5A0' : '#FF4757',
              }}
            >
              {direction}
            </span>
          )}
          {isLive && (
            <div className="flex items-center gap-1">
              <PulseDot color="#00F5A0" size={5} />
              <span className="text-[10px]" style={{ color: '#00F5A0' }}>
                LIVE
              </span>
            </div>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-gray-400 dark:text-white/30 transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-white/[0.04]">
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="rounded-lg p-3 bg-gray-50 dark:bg-white/[0.03]">
              <div className="text-[10px] text-gray-400 dark:text-white/30">Entry</div>
              <div
                className="text-sm font-bold text-gray-900 dark:text-white mt-1"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.entryPrice ? `$${item.entryPrice}` : '--'}
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,71,87,0.05)' }}>
              <div className="text-[10px] text-gray-400 dark:text-white/30">Stop Loss</div>
              <div
                className="text-sm font-bold mt-1"
                style={{ color: '#FF4757', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.stopLoss ? `$${item.stopLoss}` : '--'}
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(0,245,160,0.05)' }}>
              <div className="text-[10px] text-gray-400 dark:text-white/30">Take Profit</div>
              <div
                className="text-sm font-bold mt-1"
                style={{ color: '#00F5A0', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.takeProfit1 ? `$${item.takeProfit1}` : '--'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Link
              href={`/analyze/details/${item.id}`}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all hover:bg-gray-100 dark:hover:bg-white/10 bg-gray-50 dark:bg-white/[0.05] text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/[0.08]"
            >
              View Full Report
            </Link>
            <Link
              href={`/analyze/details/${item.id}?download=true`}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all hover:bg-gray-100 dark:hover:bg-white/10 bg-gray-50 dark:bg-white/[0.05] text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/[0.08]"
            >
              Download PDF
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
