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
    image: '/images/landing/dashboard-preview.png',
  },
  {
    title: 'Capital Flow + Asset Analysis',
    page: 'Terminal',
    description:
      '7-layer analysis: Global Liquidity, Market Flow, Rotation Matrix, Sector Activity, AI Recommendation, Asset Screening, Trade Visualizer.',
    icon: Layers,
    color: '#34d399',
    image: '/images/landing/terminal-preview.png',
  },
  {
    title: 'Automated & Tailored Analysis',
    page: 'Analyzer',
    description:
      'Two modes: Automated pipeline (Capital Flow → AI Pick → Full Report) or Tailored analysis where you pick any asset from 200+ options across Crypto, Stocks, Metals, Bonds, BIST.',
    icon: Crosshair,
    color: '#a78bfa',
    image: '/images/landing/analyzer-preview.png',
  },
  {
    title: 'Chart + Trade Plan',
    page: 'Trade Visualizer',
    description:
      'TradingView charts with Entry, SL, TP overlays. 48-hour price forecast with confidence intervals.',
    icon: LineChart,
    color: '#fb923c',
    image: '/images/landing/visualizer-preview.png',
  },
];

export function LivePreview() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [hovered, setHovered] = useState<number | null>(null);

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
      className="py-16 md:py-24 border-t border-gray-200 dark:border-white/[0.04] overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto px-4">
        <div
          className={cn(
            'text-center mb-16 transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            PLATFORM
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Intelligence in Action
          </h2>
        </div>

        {/* Bird's-eye perspective container */}
        <div
          className={cn(
            'relative mx-auto transition-all duration-1000',
            visible ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            perspective: '1800px',
            maxWidth: '1000px',
          }}
        >
          {/* The tilted plane — bird's-eye view, slightly diagonal */}
          <div
            className="relative"
            style={{
              transform: 'rotateX(45deg) rotateZ(-8deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 2x2 grid on the tilted plane */}
            <div className="grid grid-cols-2 gap-5 md:gap-6">
              {PREVIEWS.map((preview, i) => {
                const Icon = preview.icon;
                const hasError = imgErrors[i];
                const isHovered = hovered === i;

                return (
                  <div
                    key={preview.title}
                    className={cn(
                      'relative rounded-xl overflow-hidden border bg-white dark:bg-white/[0.04] transition-all duration-500',
                      isHovered
                        ? 'border-gray-300 dark:border-white/[0.15] shadow-2xl'
                        : 'border-gray-200 dark:border-white/[0.06] shadow-lg shadow-black/5 dark:shadow-black/20'
                    )}
                    style={{
                      transitionDelay: visible ? `${i * 120}ms` : '0ms',
                      transform: visible
                        ? isHovered
                          ? 'translateZ(40px) scale(1.04)'
                          : 'translateZ(0px)'
                        : 'translateZ(-30px)',
                      transformStyle: 'preserve-3d',
                    }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Screenshot */}
                    <div className="relative aspect-video overflow-hidden">
                      {!hasError ? (
                        <Image
                          src={preview.image}
                          alt={`${preview.page} — ${preview.title}`}
                          width={1280}
                          height={720}
                          loading="lazy"
                          className={cn(
                            'w-full h-full object-cover object-top transition-transform duration-500',
                            isHovered && 'scale-[1.05]'
                          )}
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
                              className="w-10 h-10 mx-auto mb-2 opacity-30"
                              style={{ color: preview.color }}
                            />
                            <span
                              className="text-[10px] uppercase tracking-wider font-bold opacity-60"
                              style={{ color: preview.color }}
                            >
                              {preview.page}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Hover overlay with info */}
                      <div className={cn(
                        'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-3 md:p-4 transition-opacity duration-300',
                        isHovered ? 'opacity-100' : 'opacity-0'
                      )}>
                        <div>
                          <span
                            className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded mb-1.5 inline-block"
                            style={{
                              color: preview.color,
                              backgroundColor: `${preview.color}25`,
                            }}
                          >
                            {preview.page}
                          </span>
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {preview.title}
                          </h3>
                          <p className="text-[11px] text-white/70 mt-1 leading-relaxed line-clamp-2 hidden sm:block">
                            {preview.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom label (always visible) */}
                    <div className="px-3 py-2.5 flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: preview.color }}
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {preview.page}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                        {preview.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reflection / shadow underneath */}
          <div
            className="absolute inset-0 -bottom-4 pointer-events-none"
            style={{
              transform: 'rotateX(45deg) rotateZ(-8deg) translateY(8px)',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.08) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
