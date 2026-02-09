'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

// ===========================================
// Types
// ===========================================
export type MarketType = 'crypto' | 'bist' | 'forex' | 'metals' | 'bonds';

export type BistSubSector = 'bist100' | 'bist30' | 'banka' | 'sanayi' | 'teknoloji' | 'hizmet';

const MARKET_OPTIONS: { id: MarketType; label: string; icon: string }[] = [
  { id: 'bist', label: 'BIST', icon: 'İ' },
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'forex', label: 'Stocks', icon: '$' },
  { id: 'metals', label: 'Metals', icon: '⬡' },
  { id: 'bonds', label: 'Bonds', icon: '📄' },
];

const BIST_SUB_SECTORS: { id: BistSubSector; label: string }[] = [
  { id: 'bist100', label: 'BIST 100' },
  { id: 'bist30', label: 'BIST 30' },
  { id: 'banka', label: 'BANKA' },
  { id: 'sanayi', label: 'SANAYİ' },
  { id: 'teknoloji', label: 'TEKNOLOJİ' },
  { id: 'hizmet', label: 'HİZMET' },
];

const STORAGE_KEY = 'dashboard_market_filter';
const BIST_SECTOR_KEY = 'dashboard_bist_sector';

// ===========================================
// Hook: Persist market filter in localStorage
// ===========================================
export function useMarketFilter(): [MarketType[], (markets: MarketType[]) => void] {
  const [selected, setSelected] = useState<MarketType[]>(['bist', 'crypto', 'forex', 'metals', 'bonds']);

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
// Hook: Persist BIST sub-sector in localStorage
// ===========================================
export function useBistSubSector(): [BistSubSector, (sector: BistSubSector) => void] {
  const [sector, setSector] = useState<BistSubSector>('bist100');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BIST_SECTOR_KEY);
      if (saved && BIST_SUB_SECTORS.some(s => s.id === saved)) {
        setSector(saved as BistSubSector);
      }
    } catch {
      // ignore
    }
  }, []);

  const update = (s: BistSubSector) => {
    setSector(s);
    try {
      localStorage.setItem(BIST_SECTOR_KEY, s);
    } catch {
      // ignore
    }
  };

  return [sector, update];
}

// ===========================================
// Sector flow status dots
// ===========================================
type FlowStatus = 'inflow' | 'outflow' | 'neutral';

function FlowDot({ status }: { status: FlowStatus }) {
  const color =
    status === 'inflow' ? 'bg-[#00f5c4]' :
    status === 'outflow' ? 'bg-[#ff5f5f]' :
    'bg-gray-500';

  return (
    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', color)} />
  );
}

// ===========================================
// CategoryBar Component
// ===========================================
interface CategoryBarProps {
  selected: MarketType[];
  onChange: (selected: MarketType[]) => void;
  bistSubSector?: BistSubSector;
  onBistSubSectorChange?: (sector: BistSubSector) => void;
  sectorFlowStatus?: Record<BistSubSector, FlowStatus>;
}

export function CategoryBar({
  selected,
  onChange,
  bistSubSector = 'bist100',
  onBistSubSectorChange,
  sectorFlowStatus,
}: CategoryBarProps) {
  const toggle = (market: MarketType) => {
    if (selected.includes(market)) {
      if (selected.length === 1) return; // don't allow deselecting all
      onChange(selected.filter(m => m !== market));
    } else {
      onChange([...selected, market]);
    }
  };

  const isBistActive = selected.includes('bist');

  return (
    <div className="mb-6">
      {/* Primary category bar */}
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

      {/* BIST sub-navigation (secondary pill tabs) */}
      {isBistActive && (
        <div className="mt-2 flex overflow-x-auto snap-x snap-mandatory gap-1.5 pb-1 no-scrollbar">
          {BIST_SUB_SECTORS.map(sub => {
            const isSubActive = bistSubSector === sub.id;
            const flowStatus = sectorFlowStatus?.[sub.id] ?? 'neutral';

            return (
              <button
                key={sub.id}
                onClick={() => onBistSubSectorChange?.(sub.id)}
                className={cn(
                  'flex-shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 min-h-[32px] select-none',
                  isSubActive
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50'
                    : 'bg-white/10 text-gray-400 border border-transparent hover:bg-white/[0.15] hover:text-gray-300'
                )}
              >
                <FlowDot status={flowStatus} />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
