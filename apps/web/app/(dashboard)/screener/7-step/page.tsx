'use client';

// =============================================================================
// Screener – 7-Step Analysis
// Hyper-Minimalist Financial Intelligence Terminal
// =============================================================================

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import {
  type Asset,
  MOCK_ASSETS,
  STEP_NAMES,
  fmtPrice,
  verdictColor,
  verdictBg,
  statusColor,
  statusBg,
  getMockStepData,
} from '../shared';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'long') return <ArrowUpRight className="w-3 h-3 text-emerald-500 dark:text-[#00f5c4]" />;
  if (dir === 'short') return <ArrowDownRight className="w-3 h-3 text-red-500 dark:text-red-400" />;
  return <Minus className="w-3 h-3 text-neutral-400" />;
}

// ---------------------------------------------------------------------------
// Page tabs
// ---------------------------------------------------------------------------

const TABS = [
  { label: 'ASSET TABLE', href: '/screener', active: false },
  { label: '7-STEP', href: '/screener/7-step', active: true },
  { label: 'MLIS', href: '/screener/mlis', active: false },
];

const STEPS = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'] as const;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SevenStepPage() {
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return MOCK_ASSETS.filter(
      (a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [search]);

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setSearch('');
    setShowAssetPicker(false);
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-black dark:text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
              <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
            </div>
            <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
              SCREENER
            </span>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              7-Step Analysis
            </span>
          </div>

          {selectedAsset && (
            <div className="flex items-center gap-2 text-[10px] font-sans">
              <span className="font-semibold">{selectedAsset.symbol}</span>
              <DirIcon dir={selectedAsset.direction} />
              <span className={cn('px-1.5 py-0.5 rounded font-bold', verdictBg(selectedAsset.verdict), verdictColor(selectedAsset.verdict))}>
                {selectedAsset.verdict}
              </span>
              <span className="text-neutral-400 tabular-nums">{selectedAsset.score.toFixed(1)}/10</span>
            </div>
          )}
        </div>
      </div>

      {/* Page tabs */}
      <div className="shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-3 flex items-center gap-px">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-3 py-2 text-[10px] font-sans uppercase tracking-wider transition-colors',
                tab.active
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold'
                  : 'text-neutral-400 hover:text-black dark:hover:text-white',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Asset picker bar */}
      <div className="shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 py-2">
          <div className="relative">
            {/* Selected asset or search */}
            {selectedAsset && !showAssetPicker ? (
              <button
                onClick={() => setShowAssetPicker(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-black/[0.06] dark:border-white/[0.06] hover:border-black/20 dark:hover:border-white/20 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[7px] font-bold shrink-0">
                  {selectedAsset.symbol.slice(0, 2)}
                </div>
                <span className="text-xs font-sans font-semibold">{selectedAsset.symbol}</span>
                <span className="text-[10px] text-neutral-400">{selectedAsset.name}</span>
                <span className="text-[10px] text-neutral-400 tabular-nums">${fmtPrice(selectedAsset.price)}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>
            ) : (
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowAssetPicker(true); }}
                  onFocus={() => setShowAssetPicker(true)}
                  placeholder="Search an asset to analyze..."
                  className="w-full pl-7 pr-7 py-1.5 text-xs font-sans bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded focus:outline-none focus:border-black/20 dark:focus:border-white/20 placeholder:text-neutral-400"
                  autoFocus={!selectedAsset}
                />
                {search && (
                  <button onClick={() => { setSearch(''); setShowAssetPicker(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-neutral-400 hover:text-black dark:hover:text-white" />
                  </button>
                )}
              </div>
            )}

            {/* Dropdown results */}
            {showAssetPicker && (
              <div className="absolute z-20 top-full left-0 mt-1 w-full max-w-sm bg-white dark:bg-neutral-950 border border-black/[0.06] dark:border-white/[0.06] rounded-xl shadow-lg overflow-hidden">
                {(search ? searchResults : MOCK_ASSETS.slice(0, 8)).map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => handleSelectAsset(asset)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs font-sans hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors',
                      selectedAsset?.symbol === asset.symbol && 'bg-[#14B8A6]/5 dark:bg-[#5EEAD4]/5',
                    )}
                  >
                    <div className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[7px] font-bold shrink-0">
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <span className="font-semibold">{asset.symbol}</span>
                    <span className="text-[10px] text-neutral-400 flex-1 text-left">{asset.name}</span>
                    <span className={cn('text-[10px] font-bold', verdictColor(asset.verdict))}>{asset.verdict}</span>
                    <span className="text-[10px] text-neutral-400 tabular-nums">{asset.score.toFixed(1)}</span>
                  </button>
                ))}
                {search && searchResults.length === 0 && (
                  <div className="px-3 py-4 text-center text-[10px] text-neutral-400">No assets found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-3 py-2 pb-8">
          {!selectedAsset ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <p className="text-xs text-neutral-400">Select an asset above to view the 7-step analysis pipeline.</p>
                <Link href="/screener" className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] hover:underline">
                  Browse Asset Table
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pipeline: all 7 steps as vertical cards */}
              {STEPS.map((stepId) => {
                const data = getMockStepData(selectedAsset, stepId);
                const stepNum = stepId.replace('step', '');
                const stepName = STEP_NAMES[stepId];

                return (
                  <div
                    key={stepId}
                    className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] px-4 py-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Step header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] bg-[#14B8A6]/10 dark:bg-[#5EEAD4]/10 px-1.5 py-0.5 rounded tabular-nums font-semibold">
                          S{stepNum}
                        </span>
                        <h3 className="text-xs font-sans font-semibold">{stepName}</h3>
                      </div>
                      <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-sans font-semibold', statusBg(data.status), statusColor(data.status))}>
                        {data.status === 'pass' ? 'PASS' : data.status === 'warn' ? 'WARN' : 'FAIL'}
                        <span className="text-[9px] opacity-70 tabular-nums">{data.score.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2">{data.summary}</p>

                    {/* Details row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {data.details.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] font-sans">
                          <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
                          <span className="text-neutral-600 dark:text-neutral-300">{d}</span>
                        </div>
                      ))}
                    </div>

                    {/* Score bar */}
                    <div className="mt-2.5">
                      <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', data.status === 'pass' ? 'bg-emerald-500 dark:bg-[#00f5c4]' : data.status === 'warn' ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${(data.score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Summary card */}
              <div className="rounded-xl border border-[#14B8A6]/20 dark:border-[#5EEAD4]/20 bg-[#14B8A6]/[0.03] dark:bg-[#5EEAD4]/[0.03] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-sans font-semibold">Pipeline Summary</span>
                    <span className="text-[10px] text-neutral-400">{selectedAsset.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DirIcon dir={selectedAsset.direction} />
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', verdictBg(selectedAsset.verdict), verdictColor(selectedAsset.verdict))}>
                      {selectedAsset.verdict}
                    </span>
                    <span className="text-xs font-sans font-bold tabular-nums">{selectedAsset.score.toFixed(1)}/10</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {STEPS.map((stepId) => {
                    const data = getMockStepData(selectedAsset, stepId);
                    return (
                      <div
                        key={stepId}
                        className={cn(
                          'flex-1 h-1.5 rounded-full',
                          data.status === 'pass' ? 'bg-emerald-500 dark:bg-[#00f5c4]' : data.status === 'warn' ? 'bg-amber-500' : 'bg-red-500',
                        )}
                      />
                    );
                  })}
                </div>
                <div className="mt-1.5 flex items-center gap-1 justify-between">
                  {STEPS.map((stepId) => {
                    const num = stepId.replace('step', '');
                    const data = getMockStepData(selectedAsset, stepId);
                    return (
                      <span key={stepId} className={cn('text-[8px] font-sans tabular-nums flex-1 text-center', statusColor(data.status))}>
                        S{num}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
