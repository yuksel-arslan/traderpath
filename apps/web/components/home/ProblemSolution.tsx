'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const PROBLEMS = [
  {
    title: 'Lagging Indicators',
    description: 'RSI, MACD, Bollinger — they tell you what already happened. By the time your indicator confirms, smart money already moved.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="8" x2="16" y2="16" />
        <line x1="16" y1="8" x2="8" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Information Overload',
    description: '100+ charts, 50 Telegram groups, 10 Twitter feeds. You spend more time researching than trading.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" />
      </svg>
    ),
  },
  {
    title: 'Invisible Capital Flows',
    description: 'Institutional money moves across markets silently. Without flow data, you\'re trading blind.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <line x1="4" y1="4" x2="20" y2="20" />
      </svg>
    ),
  },
];

export function ProblemSolution() {
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
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">THE PROBLEM</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            The Problem with Traditional Trading
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {PROBLEMS.map((p, i) => (
            <div
              key={p.title}
              className={cn(
                'p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] transition-all duration-700',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
              )}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400 mb-4">
                {p.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{p.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>

        {/* Transition text */}
        <div className={cn(
          'text-center transition-all duration-700 delay-500',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            <span className="text-gray-900 dark:text-white font-semibold">TraderPath solves all three.</span>{' '}
            One platform. One decision. Powered by capital flow intelligence, not lagging indicators.
          </p>
        </div>
      </div>
    </section>
  );
}
