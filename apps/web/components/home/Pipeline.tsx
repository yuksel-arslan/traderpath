'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const STEPS = [
  {
    number: 1,
    label: 'DETECT',
    title: 'Capital Flow Scan',
    description: 'Our engine scans global liquidity, M2 supply, FED balance sheet, DXY, and sector rotation signals across 5 markets simultaneously.',
    output: 'Where is money flowing?',
    color: '#2DD4BF',
  },
  {
    number: 2,
    label: 'ANALYZE',
    title: '7-Step + MLIS Pro Analysis',
    description: 'Each asset goes through a rigorous 7-step analysis pipeline validated by Multi-Layer Intelligence Scoring. 4 AI agents cross-verify every signal.',
    output: 'GO / CONDITIONAL / WAIT / AVOID verdict',
    color: '#34d399',
  },
  {
    number: 3,
    label: 'ACT',
    title: 'Trade Plan + Signal',
    description: 'You receive a complete trade plan: Entry, Stop-Loss, Take-Profit levels, position sizing, and risk/reward ratio. Plus real-time alerts via Telegram, Discord, and Push.',
    output: 'Exact entry, SL, TP with confidence score',
    color: '#fb923c',
  },
];

export function Pipeline() {
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
    <section ref={ref} id="how-it-works" className="py-12 md:py-20 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className={cn(
          'text-center mb-10 transition-all duration-700',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">HOW IT WORKS</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            From Capital Flow to Trade Plan in 60 Seconds
          </h2>
        </div>

        {/* 3-column grid: side by side on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative">
              <div
                className={cn(
                  'flex flex-col p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] transition-all duration-700 h-full',
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                )}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Step number + label */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.number}
                  </div>
                  <div className="text-[10px] font-bold tracking-wider" style={{ color: step.color }}>
                    {step.label}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1">{step.description}</p>
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[10px] font-medium text-slate-400">
                    Output: <span className="text-gray-700 dark:text-gray-300">{step.output}</span>
                  </span>
                </div>
              </div>

              {/* Flow arrow between cards (visible only on md+) */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
