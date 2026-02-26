'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '../../lib/utils';
import { BarChart3, Layers, Crosshair, LineChart } from 'lucide-react';

const PREVIEWS = [
  {
    title: 'Decision Engine Control Room',
    page: 'Dashboard',
    description:
      'Regime detection, capital flow direction, profit tracking, and top opportunities — all at a glance.',
    icon: BarChart3,
    color: '#2DD4BF',
    image: '/images/landing/dashboard-preview.svg',
  },
  {
    title: 'Capital Flow + Asset Analysis',
    page: 'Terminal',
    description:
      '7-layer analysis: Global Liquidity, Market Flow, Rotation Matrix, Sector Activity, AI Recommendation, Asset Screening, Trade Visualizer.',
    icon: Layers,
    color: '#34d399',
    image: '/images/landing/terminal-preview.svg',
  },
  {
    title: 'Automated & Tailored Analysis',
    page: 'Analyzer',
    description:
      'Two modes: Automated pipeline (Capital Flow → AI Pick → Full Report) or Tailored analysis where you pick any asset from 200+ options across Crypto, Stocks, Metals, Bonds, BIST.',
    icon: Crosshair,
    color: '#a78bfa',
    image: '/images/landing/analyzer-preview.svg',
  },
  {
    title: 'Chart + Trade Plan',
    page: 'Trade Visualizer',
    description:
      'TradingView charts with Entry, SL, TP overlays. 48-hour price forecast with confidence intervals.',
    icon: LineChart,
    color: '#fb923c',
    image: '/images/landing/visualizer-preview.svg',
  },
];

export function LivePreview() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleImageError = useCallback((index: number) => {
    setImgErrors((prev) => ({ ...prev, [index]: true }));
  }, []);

  return (
    <section
      ref={ref}
      className="py-12 md:py-20 border-t border-gray-200 dark:border-gray-800"
    >
      <div className="max-w-[1200px] mx-auto px-4">
        <div
          className={cn(
            'text-center mb-10 transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
        >
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">
            PLATFORM
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Intelligence in Action
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PREVIEWS.map((preview, i) => {
            const Icon = preview.icon;
            const hasError = imgErrors[i];
            return (
              <div
                key={preview.title}
                className={cn(
                  'group rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] transition-all duration-700 hover:border-gray-300 dark:hover:border-white/[0.12] hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-[0_0_30px_rgba(45,212,191,0.08)]',
                  visible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4',
                )}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Screenshot / placeholder area */}
                <div className="relative aspect-video overflow-hidden rounded-t-lg">
                  {!hasError ? (
                    <Image
                      src={preview.image}
                      alt={`${preview.page} — ${preview.title}`}
                      width={1280}
                      height={720}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                      onError={() => handleImageError(i)}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${preview.color}10, ${preview.color}25)`,
                      }}
                    >
                      <div className="text-center">
                        <Icon
                          className="w-12 h-12 mx-auto mb-2 opacity-30"
                          style={{ color: preview.color }}
                        />
                        <span
                          className="text-[10px] uppercase tracking-wider font-bold opacity-60"
                          style={{ color: preview.color }}
                        >
                          {preview.page} Preview
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded"
                      style={{
                        color: preview.color,
                        backgroundColor: `${preview.color}15`,
                      }}
                    >
                      {preview.page}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {preview.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {preview.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
