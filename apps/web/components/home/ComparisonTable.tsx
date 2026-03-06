'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const ROWS = [
  {
    typical: 'Technical indicators (RSI, MACD, EMA)',
    traderpath: 'Capital flow data (M2, DXY, FED, flows)',
  },
  {
    typical: 'Single timeframe analysis',
    traderpath: 'Multi-market scanning (Crypto + Stocks + Metals + Bonds + BIST)',
  },
  {
    typical: '"Buy BTC now" signals with no context',
    traderpath: 'Full trade plan: Entry, SL, TP, R:R, position size, risk',
  },
  {
    typical: 'Black box AI — no transparency',
    traderpath: 'Transparent 7-step process you can verify',
  },
  {
    typical: 'No performance proof',
    traderpath: 'Verified PnL tracking with public dashboard',
  },
];

export function ComparisonTable() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-12 md:py-20 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-[900px] mx-auto px-4">
        <div className={cn(
          'text-center mb-10 transition-all duration-700',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">WHY US</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Why TraderPath, Not Another Signal Bot
          </h2>
        </div>

        <div className={cn(
          'rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.06] transition-all duration-700',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          {/* Header */}
          <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-white/[0.06]">
            <div className="bg-gray-50 dark:bg-white/[0.02] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Typical Platforms</span>
            </div>
            <div className="bg-teal-50 dark:bg-teal-500/5 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">TraderPath</span>
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-white/[0.06]">
              <div className="bg-white dark:bg-[#111111] p-4 flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 opacity-50">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="text-xs text-slate-400 leading-relaxed">{row.typical}</span>
              </div>
              <div className="bg-white dark:bg-[#111111] p-4 flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs text-gray-900 dark:text-white font-medium leading-relaxed">{row.traderpath}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
