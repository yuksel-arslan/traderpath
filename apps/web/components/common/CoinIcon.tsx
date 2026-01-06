'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../lib/coin-icons';

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function CoinIcon({ symbol, size = 32, className = '' }: CoinIconProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const iconUrl = getCoinIcon(symbol);

  if (error) {
    // Fallback to colored circle with symbol initials
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {loading && (
        <div
          className="absolute inset-0 rounded-full bg-slate-700 animate-pulse"
          style={{ width: size, height: size }}
        />
      )}
      <Image
        src={iconUrl}
        alt={`${symbol} icon`}
        width={size}
        height={size}
        className={`rounded-full ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        unoptimized // Required for external images
      />
    </div>
  );
}
