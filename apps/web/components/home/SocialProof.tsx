'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const TRUST_METRICS = [
  { value: '200+', label: 'Tradeable Assets' },
  { value: '5', label: 'Global Markets' },
  { value: '24/7', label: 'Real-Time Scanning' },
  { value: '309+', label: 'Analyses Completed' },
];

const TECH_STACK = [
  'Binance Data',
  'TradingView Charts',
  'Google Gemini AI',
  'Neon PostgreSQL',
];

export function SocialProof() {
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
      <div className="max-w-[1200px] mx-auto px-4">
        <div className={cn(
          'text-center mb-10 transition-all duration-700',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">TRUST</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Trusted by Traders Worldwide
          </h2>
        </div>

        {/* Trust metrics */}
        <div className={cn(
          'grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 dark:bg-white/[0.06] rounded-xl overflow-hidden mb-8 transition-all duration-700',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          {TRUST_METRICS.map((m) => (
            <div key={m.label} className="bg-white dark:bg-[#111111] p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-white mb-1">
                {m.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div className={cn(
          'text-center transition-all duration-700 delay-200',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">Powered by</div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-md"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
