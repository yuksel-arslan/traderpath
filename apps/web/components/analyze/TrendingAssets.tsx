'use client';

import { ScoreRing } from '@/components/ui/intelligence';

interface TrendingAsset {
  symbol: string;
  score: number;
  change?: string;
  flow?: string;
}

interface TrendingAssetsProps {
  assets: TrendingAsset[];
  onSelect: (symbol: string) => void;
}

export function TrendingAssets({ assets, onSelect }: TrendingAssetsProps) {
  if (!assets.length) return null;

  return (
    <div className="rounded-xl p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
        Trending Now
      </span>
      <div className="mt-3 space-y-2">
        {assets.map((a) => (
          <button
            key={a.symbol}
            onClick={() => onSelect(a.symbol)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100 dark:hover:bg-white/5 text-left"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <ScoreRing score={a.score} size={30} strokeWidth={2} />
            <span className="text-sm font-bold text-gray-900 dark:text-white flex-1">
              {a.symbol}
            </span>
            <div className="text-right">
              {a.change && (
                <div
                  className="text-xs"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: a.change.startsWith('+') ? '#00F5A0' : '#FF4757',
                  }}
                >
                  {a.change}
                </div>
              )}
              {a.flow && (
                <div className="text-[10px] text-gray-400 dark:text-white/30">{a.flow}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
