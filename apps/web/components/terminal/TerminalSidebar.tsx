'use client';

import { cn } from '../../lib/utils';
import { formatPrice } from '../../lib/utils';
import { ScoreRing, PulseDot, VerdictBadge } from '../ui/intelligence';
import {
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  tag?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SelectedAsset {
  symbol: string;
  price: number;
  change24h: number;
  aiScore: number;
  verdict: string;
  direction: string;
}

interface TerminalSidebarProps {
  navGroups: NavGroup[];
  activeSection: string;
  onNavClick: (id: string) => void;
  selectedAsset: SelectedAsset | null;
  isAnalyzing?: boolean;
  capitalFlowDirection?: 'up' | 'down' | 'neutral';
  recentAnalysisCount?: number;
  activeChart?: boolean;
}

export function TerminalSidebar({
  navGroups,
  activeSection,
  onNavClick,
  selectedAsset,
  isAnalyzing = false,
  capitalFlowDirection = 'neutral',
  recentAnalysisCount = 0,
  activeChart = false,
}: TerminalSidebarProps) {
  return (
    <nav className="hidden lg:flex lg:flex-col w-52 shrink-0 border-r border-gray-200 dark:border-white/[0.06] overflow-y-auto scrollbar-none pr-3 py-1">
      {navGroups.map((group, gi) => (
        <div key={group.title} className={cn(gi > 0 && 'mt-5')}>
          {/* Group header with status indicator */}
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] tracking-[0.1em] uppercase text-white/25 dark:text-white/25 text-gray-400">
              {group.title}
            </span>
            {group.title === 'Capital Flow' && (
              <span className="shrink-0">
                {capitalFlowDirection === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 text-[#00F5A0]" />
                ) : capitalFlowDirection === 'down' ? (
                  <ArrowDownRight className="w-3 h-3 text-[#FF4757]" />
                ) : (
                  <span className="w-3 h-3 inline-block text-center text-[10px] text-[#FFB800]">--</span>
                )}
              </span>
            )}
            {group.title === 'Asset Analysis' && recentAnalysisCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] font-mono">
                {recentAnalysisCount}
              </span>
            )}
            {group.title === 'Visualizer' && activeChart && (
              <PulseDot color="#00F5A0" size={6} />
            )}
          </div>

          {/* Items */}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-all duration-150',
                    isActive
                      ? 'border-l-2 border-[#00D4FF] -ml-px font-semibold text-white'
                      : 'border-l-2 border-transparent -ml-px hover:bg-white/[0.03] dark:hover:bg-white/[0.03] hover:bg-gray-50',
                  )}
                  style={
                    isActive
                      ? { background: 'rgba(0, 212, 255, 0.08)' }
                      : undefined
                  }
                >
                  {item.tag && (
                    <span
                      className={cn(
                        'text-[9px] font-mono tabular-nums w-4 shrink-0',
                        isActive
                          ? 'text-[#00D4FF]'
                          : 'text-gray-400 dark:text-white/30',
                      )}
                    >
                      {item.tag}
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-[11px] truncate',
                      isActive
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-white/40',
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* SELECTED asset section */}
      <div className="mt-6 px-2 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
        <span className="text-[9px] uppercase tracking-widest block mb-2 text-gray-400 dark:text-white/25">
          Selected
        </span>
        {selectedAsset ? (
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <ScoreRing score={selectedAsset.aiScore} size={32} strokeWidth={3} />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                  {selectedAsset.symbol}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono tabular-nums text-gray-500 dark:text-white/50">
                    {formatPrice(selectedAsset.price)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[10px] font-mono tabular-nums',
                  selectedAsset.change24h >= 0 ? 'text-[#00F5A0]' : 'text-[#FF4757]',
                )}
              >
                {selectedAsset.change24h >= 0 ? '+' : ''}
                {selectedAsset.change24h.toFixed(2)}%
              </span>
              <VerdictBadge verdict={selectedAsset.verdict} />
              {isAnalyzing && <PulseDot color="#00D4FF" size={6} />}
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-gray-400 dark:text-white/30">
            No asset selected
          </span>
        )}
      </div>
    </nav>
  );
}
