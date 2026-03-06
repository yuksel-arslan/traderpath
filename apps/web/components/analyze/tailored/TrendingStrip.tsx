'use client';

import { useRef } from 'react';
import { ScoreRing, VerdictBadge } from '@/components/ui/intelligence';
import { formatPrice } from '@/lib/utils';
import dynamic from 'next/dynamic';

const CoinIcon = dynamic(
  () => import('@/components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /> }
);

interface TrendingAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  score: number;
  verdict: 'GO' | 'COND' | 'WAIT' | 'AVOID';
}

interface TrendingStripProps {
  assets: TrendingAsset[];
  onSelect: (symbol: string) => void;
}

export function TrendingStrip({ assets, onSelect }: TrendingStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (assets.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30 font-semibold">
          Trending Now
        </span>
        <span className="text-[10px] text-gray-300 dark:text-white/20 font-mono">
          {assets.length}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-none pb-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {assets.map((asset) => {
          const borderColor =
            asset.score >= 75
              ? 'rgba(0,245,160,0.15)'
              : asset.score >= 50
              ? 'rgba(255,184,0,0.10)'
              : 'rgba(255,255,255,0.06)';

          return (
            <button
              key={asset.symbol}
              onClick={() => onSelect(asset.symbol)}
              className="shrink-0 rounded-xl p-3 text-left transition-all hover:scale-[1.02]"
              style={{
                scrollSnapAlign: 'start',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${borderColor}`,
                minWidth: 130,
              }}
            >
              {/* ScoreRing + Symbol */}
              <div className="flex items-center gap-2 mb-2">
                <ScoreRing score={asset.score} size={32} strokeWidth={3} />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">
                    {asset.symbol}
                  </span>
                  <span className="text-[9px] text-gray-400 dark:text-white/30 truncate block">
                    {asset.name}
                  </span>
                </div>
              </div>

              {/* Price */}
              <span
                className="text-sm font-bold text-gray-900 dark:text-white block mb-1 tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatPrice(asset.price)}
              </span>

              {/* Change + Verdict */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-mono tabular-nums font-semibold"
                  style={{ color: asset.change24h >= 0 ? '#00F5A0' : '#FF4757' }}
                >
                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(1)}%
                </span>
                <VerdictBadge verdict={asset.verdict} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
