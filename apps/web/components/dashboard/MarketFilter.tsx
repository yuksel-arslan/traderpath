'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

// ===========================================
// MarketFilter - Toggle group for market types
// ===========================================

export type MarketType = 'crypto' | 'bist' | 'forex' | 'metals' | 'bonds';

const MARKET_OPTIONS: { id: MarketType; label: string }[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'bist', label: 'BIST' },
  { id: 'forex', label: 'Forex' },
  { id: 'metals', label: 'Metals' },
  { id: 'bonds', label: 'Bonds' },
];

const STORAGE_KEY = 'dashboard_market_filter';

interface MarketFilterProps {
  selected: MarketType[];
  onChange: (selected: MarketType[]) => void;
}

export function MarketFilter({ selected, onChange }: MarketFilterProps) {
  const toggle = (market: MarketType) => {
    if (selected.includes(market)) {
      // Don't allow deselecting all
      if (selected.length === 1) return;
      onChange(selected.filter((m) => m !== market));
    } else {
      onChange([...selected, market]);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {MARKET_OPTIONS.map((opt) => {
        const isActive = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'border border-[#5EEDC3] text-white bg-[#5EEDC3]/10'
                : 'border border-[#1E293B] text-gray-400 opacity-30 hover:opacity-60 bg-transparent'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Hook to persist market filter in localStorage
export function useMarketFilter(): [MarketType[], (markets: MarketType[]) => void] {
  const [selected, setSelected] = useState<MarketType[]>(['crypto', 'bist', 'forex', 'metals', 'bonds']);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MarketType[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelected(parsed);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const update = (markets: MarketType[]) => {
    setSelected(markets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(markets));
    } catch {
      // ignore
    }
  };

  return [selected, update];
}
