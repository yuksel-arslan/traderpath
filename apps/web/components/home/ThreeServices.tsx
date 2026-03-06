'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const SERVICES = [
  {
    title: 'Capital Flow Analysis',
    description: 'Track where institutional money flows across 5 global markets. Detect rotation before it shows on price charts.',
    features: ['6 macro indicators', '5 markets', 'Phase detection', 'Rotation signals'],
    credit: '50 credits/day',
    color: '#2DD4BF',
  },
  {
    title: '7-Step Analysis',
    description: 'Every asset passes through 7 rigorous checkpoints. From macro context to trap detection. Nothing gets through without verification.',
    features: ['4 AI Agents', 'GO/COND/WAIT/AVOID verdicts', 'Full trade plan with Entry/SL/TP', 'MLIS Pro validation'],
    credit: '100 credits/day (includes MLIS Pro)',
    color: '#34d399',
  },
  {
    title: 'Best Opportunities Signal',
    description: "Don't know what to trade? Our AI scans 200+ assets and surfaces the top opportunities ranked by flow alignment, momentum, and risk score.",
    features: ['Daily top picks', 'Ranked by composite score', 'Multi-market coverage', 'Real-time updates'],
    credit: '50 credits/day',
    color: '#fb923c',
  },
];

export function ThreeServices() {
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
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">SERVICES</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Three Engines. One Decision.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SERVICES.map((service, i) => (
            <div
              key={service.title}
              className={cn(
                'rounded-xl p-6 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] transition-all duration-700',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
              )}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {/* Color bar */}
              <div className="w-8 h-1 rounded-full mb-4" style={{ backgroundColor: service.color }} />

              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                {service.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{service.description}</p>

              <ul className="space-y-1.5 mb-4">
                {service.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={service.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                <span className="text-[10px] font-bold tracking-wider text-slate-400">{service.credit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
