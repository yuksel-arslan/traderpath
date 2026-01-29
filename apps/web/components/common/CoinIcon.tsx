'use client';

import { getLocalCoinIcon, getCoinColor } from '../../lib/coin-icons-cache';

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

/**
 * CoinIcon component - uses local SVG generation
 * No external API calls, fully offline capable, instant loading
 */
export function CoinIcon({ symbol, size = 32, className = '' }: CoinIconProps) {
  const iconUrl = getLocalCoinIcon(symbol);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconUrl}
        alt={`${symbol} icon`}
        width={size}
        height={size}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

/**
 * Get coin brand colors for use in other components
 */
export { getCoinColor };
