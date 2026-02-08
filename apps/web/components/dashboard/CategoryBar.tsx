'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

// ===========================================
// Types
// ===========================================
export type MarketType = 'crypto' | 'bist' | 'forex' | 'metals' | 'bonds';

const MARKET_OPTIONS: { id: MarketType; label: string; icon: string }[] = [
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'bist', label: 'BIST', icon: 'İ' },
  { id: 'forex', label: 'Forex', icon: '$' },
  { id: 'metals', label: 'Metals', icon: '⬡' },
  { id: 'bonds', label: 'Bonds', icon: '📄' },
];

const STORAGE_KEY = 'dashboard_market_filter';

// ===========================================
// Hook: Persist market filter in localStorage
// ===========================================
export function useMarketFilter(): [MarketType[], (markets: MarketType[]) => void] {
  const [selected, setSelected] = useState<MarketType[]>(['crypto', 'bist', 'forex', 'metals', 'bonds']);

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

// ===========================================
// CategoryBar Component
// ===========================================
interface CategoryBarProps {
  selected: MarketType[];
  onChange: (selected: MarketType[]) => void;
}

export function CategoryBar({ selected, onChange }: CategoryBarProps) {
  const toggle = (market: MarketType) => {
    if (selected.includes(market)) {
      if (selected.length === 1) return; // don't allow deselecting all
      onChange(selected.filter(m => m !== market));
    } else {
      onChange([...selected, market]);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-1 no-scrollbar">
        {MARKET_OPTIONS.map(opt => {
          const isActive = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={cn(
                'flex-shrink-0 snap-start flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 min-h-[48px] select-none',
                isActive
                  ? 'border border-[#4dd0e1]/60 text-white bg-[#4dd0e1]/10 shadow-[0_0_15px_rgba(77,208,225,0.15)]'
                  : 'border border-white/10 text-gray-500 bg-white/[0.03] hover:bg-white/[0.06] hover:text-gray-300'
              )}
            >
              <span className="text-base">{opt.icon}</span>
              <span className="tracking-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
