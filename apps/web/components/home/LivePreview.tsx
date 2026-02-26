'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { BarChart3, Layers, LineChart } from 'lucide-react';

const PREVIEWS = [
  {
    title: 'Decision Engine Control Room',
    page: 'Dashboard',
    description: 'See regime, capital flow direction, and top opportunities at a glance.',
    icon: BarChart3,
    color: '#2DD4BF',
  },
  {
    title: '7-Layer Flow Analysis',
    page: 'Terminal',
    description: 'Drill into macro data, sector rotation, and AI recommendations.',
    icon: Layers,
    color: '#34d399',
  },
  {
    title: 'Chart + Trade Plan',
    page: 'Trade Visualizer',
    description: 'TradingView charts with automated Entry/SL/TP overlays and 48h forecast.',
    icon: LineChart,
    color: '#fb923c',
  },
];

export function LivePreview() {
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
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">PLATFORM</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Intelligence in Action
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PREVIEWS.map((preview, i) => {
            const Icon = preview.icon;
            return (
              <div
                key={preview.title}
                className={cn(
                  'group rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] transition-all duration-700 hover:border-gray-300 dark:hover:border-white/[0.12]',
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                )}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Preview area */}
                <div
                  className="h-40 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${preview.color}08, ${preview.color}15)` }}
                >
                  <div className="text-center">
                    <Icon className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: preview.color }} />
                    <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: preview.color }}>
                      {preview.page}
                    </span>
                  </div>
                </div>

                {/* Caption */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{preview.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{preview.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
