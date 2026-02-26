'use client';

import { ScoreRing } from '@/components/ui/intelligence';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const CoinIcon = dynamic(
  () => import('@/components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /> }
);

interface AssetCardProps {
  symbol: string;
  name: string;
  category: string;
  categoryIcon: React.ReactNode;
  price?: number;
  change24h?: number;
  score?: number;
  onClick: (symbol: string) => void;
}

export function AssetCard({
  symbol,
  name,
  category,
  categoryIcon,
  price,
  change24h,
  score,
  onClick,
}: AssetCardProps) {
  const borderGlow =
    score !== undefined && score >= 75
      ? 'hover:border-[#00F5A0]/30 hover:shadow-[0_0_12px_rgba(0,245,160,0.08)]'
      : score !== undefined && score >= 50
      ? 'hover:border-[#FFB800]/30'
      : 'hover:border-[#00D4FF]/20';

  return (
    <button
      onClick={() => onClick(symbol)}
      className={cn(
        'p-3 rounded-xl text-left transition-all group hover:scale-[1.02]',
        'border border-gray-200 dark:border-white/[0.06]',
        'bg-white dark:bg-white/[0.03]',
        borderGlow,
      )}
    >
      {/* Icon + Symbol */}
      <div className="flex items-center gap-2 mb-1.5">
        <CoinIcon symbol={symbol} size={24} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-gray-900 dark:text-white block">{symbol}</span>
          <span className="text-[10px] text-gray-400 dark:text-white/40 truncate block">{name}</span>
        </div>
      </div>

      {/* Price */}
      {price !== undefined && price > 0 && (
        <span
          className="text-xs font-bold text-gray-700 dark:text-white/80 block mb-1 tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {formatPrice(price)}
        </span>
      )}

      {/* Change + Score row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {change24h !== undefined && (
            <span
              className="text-[10px] font-mono tabular-nums font-semibold"
              style={{ color: change24h >= 0 ? '#00F5A0' : '#FF4757' }}
            >
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
            </span>
          )}
          <div className="flex items-center gap-1">
            {categoryIcon}
            <span className="text-[9px] text-gray-400 dark:text-white/30 capitalize">{category}</span>
          </div>
        </div>
        {score !== undefined && score > 0 && (
          <ScoreRing score={score} size={24} strokeWidth={2} />
        )}
      </div>
    </button>
  );
}
