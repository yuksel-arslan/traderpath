'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketData {
  name: string;
  flow7d: number;
  phase: string;
  isSelected: boolean;
}

interface FlowData {
  liquidity: {
    fedStatus: string;
    m2Change: string;
    dxyStatus: string;
    vixLevel: string;
    bias: string;
  };
  markets: MarketData[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFlow(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function phaseColor(phase: string) {
  switch (phase) {
    case 'early': return 'text-emerald-500 dark:text-[#00f5c4]';
    case 'mid': return 'text-amber-500 dark:text-amber-400';
    case 'late': return 'text-orange-500';
    case 'exit': return 'text-red-500 dark:text-red-400';
    default: return 'text-slate-400';
  }
}

// ---------------------------------------------------------------------------
// Layer definitions
// ---------------------------------------------------------------------------

const LAYERS = [
  {
    number: 1,
    title: 'GLOBAL LIQUIDITY',
    subtitle: 'Is the macro environment favorable?',
    metrics: ['Fed Balance Sheet', 'M2 Money Supply', 'DXY Index', 'VIX Level'],
    page: '/flow',
  },
  {
    number: 2,
    title: 'MARKET FLOW',
    subtitle: 'Where is capital flowing?',
    metrics: ['Crypto', 'Stocks', 'Bonds', 'Metals'],
    page: '/flow',
  },
  {
    number: 3,
    title: 'SECTOR ACTIVITY',
    subtitle: 'Which sectors lead within the market?',
    metrics: ['DeFi', 'Layer 2', 'AI Tokens', 'Tech Stocks'],
    page: '/flow',
  },
  {
    number: 4,
    title: 'VERDICT ENGINE',
    subtitle: 'AI-powered GO / WAIT / AVOID signal',
    metrics: ['7-Step Analysis', '40+ Indicators', 'ML Confirmation', 'Trade Plan'],
    page: '/terminal',
  },
  {
    number: 5,
    title: 'ASSET SCREENER',
    subtitle: 'Search, sort, filter all tradeable assets',
    metrics: ['Score Ranking', 'Flow Score', 'RSI / MACD', 'Phase Tracking'],
    page: '/screener',
  },
  {
    number: 6,
    title: 'RISK ASSESSMENT',
    subtitle: 'Counter-flow and economic event validation',
    metrics: ['Capital Flow Monitor', 'Economic Calendar', 'Anomaly Detection', 'Plan Validation'],
    page: '/terminal',
  },
  {
    number: 7,
    title: 'TRADE VISUALIZER',
    subtitle: 'Interactive chart with Entry / SL / TP overlay',
    metrics: ['Candlestick Chart', 'Price Levels', 'Forecast Bands', 'Multi-Strategy'],
    page: '/trades',
  },
];

// ---------------------------------------------------------------------------
// FlowAccordion
// ---------------------------------------------------------------------------

export function FlowAccordion() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Fetch capital flow data
  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io'}/api/capital-flow/summary`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const { globalLiquidity, markets, recommendation, liquidityBias } = data.data;
            const primaryMarket = recommendation?.primaryMarket || 'crypto';
            setFlowData({
              liquidity: {
                fedStatus: globalLiquidity?.fedBalanceSheet?.trend === 'expanding' ? 'Expanding' : 'Contracting',
                m2Change: globalLiquidity?.m2MoneySupply?.yoyGrowth != null
                  ? `${globalLiquidity.m2MoneySupply.yoyGrowth > 0 ? '+' : ''}${globalLiquidity.m2MoneySupply.yoyGrowth.toFixed(1)}%`
                  : '+2.1%',
                dxyStatus: globalLiquidity?.dxy?.trend === 'weakening' ? 'Weak' : 'Strong',
                vixLevel: globalLiquidity?.vix?.value
                  ? `${Math.round(globalLiquidity.vix.value)}`
                  : '14',
                bias: liquidityBias || 'risk_on',
              },
              markets: markets?.map((m: { market: string; flow7d: number; phase: string }) => ({
                name: m.market.toUpperCase(),
                flow7d: m.flow7d || 0,
                phase: m.phase || 'mid',
                isSelected: m.market === primaryMarket,
              })) || [],
            });
          }
        }
      } catch {
        // Fallback data used below
      }
    };
    fetchFlowData();
  }, []);

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const defaultMarkets: MarketData[] = [
    { name: 'CRYPTO', flow7d: 8, phase: 'early', isSelected: true },
    { name: 'STOCKS', flow7d: 5, phase: 'mid', isSelected: false },
    { name: 'METALS', flow7d: 1, phase: 'late', isSelected: false },
    { name: 'BONDS', flow7d: -2, phase: 'exit', isSelected: false },
  ];
  const markets = flowData?.markets.length ? flowData.markets : defaultMarkets;

  return (
    <section
      id="methodology"
      ref={sectionRef}
      className="py-12 md:py-20 border-t border-black/[0.06] dark:border-white/[0.06]"
    >
      <div className="max-w-[800px] mx-auto px-4">
        {/* Section header */}
        <div className={cn(
          'mb-8 md:mb-12 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}>
          <div className="text-[10px] font-sans uppercase tracking-wider text-slate-400 mb-2">
            METHODOLOGY
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-sans font-bold tracking-tight text-black dark:text-white mb-2">
            7-Layer Decision Engine
          </h2>
          <p className="text-xs sm:text-sm font-sans text-slate-500 max-w-lg">
            Top-down capital flow analysis. Each layer narrows the decision
            from global macro to individual trade plan.
          </p>
        </div>

        {/* Vertical layer stack */}
        <div className="space-y-0">
          {LAYERS.map((layer, idx) => {
            const isOpen = expanded === layer.number;
            const isLocked = layer.number > 2;

            return (
              <div
                key={layer.number}
                className={cn(
                  'border-t border-black/[0.06] dark:border-white/[0.06] transition-all duration-300',
                  idx === LAYERS.length - 1 && 'border-b',
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
                )}
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : layer.number)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
                >
                  {/* Layer number */}
                  <span className={cn(
                    'w-6 h-6 flex items-center justify-center text-[10px] font-sans font-bold shrink-0',
                    isOpen
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'bg-black/5 dark:bg-white/5 text-slate-400',
                  )}>
                    L{layer.number}
                  </span>

                  {/* Title & subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-sans font-semibold text-black dark:text-white">
                      {layer.title}
                    </div>
                    <div className="text-[10px] font-sans text-slate-400 truncate">
                      {layer.subtitle}
                    </div>
                  </div>

                  {/* Locked badge */}
                  {isLocked && (
                    <span className="text-[9px] font-sans text-amber-500 font-bold hidden sm:inline">
                      PREMIUM
                    </span>
                  )}

                  <ChevronDown className={cn(
                    'w-3.5 h-3.5 text-slate-400 transition-transform shrink-0',
                    isOpen && 'rotate-180',
                  )} />
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-3 pb-4">
                    <div className="ml-9">
                      {/* Metric pills */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {layer.metrics.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 text-[10px] font-sans bg-black/[0.03] dark:bg-white/[0.03] text-slate-500"
                          >
                            {m}
                          </span>
                        ))}
                      </div>

                      {/* Live data for L1 and L2 */}
                      {layer.number === 1 && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {[
                            { label: 'Fed', value: flowData?.liquidity.fedStatus || 'Expanding' },
                            { label: 'M2', value: flowData?.liquidity.m2Change || '+2.1%' },
                            { label: 'DXY', value: flowData?.liquidity.dxyStatus || 'Weak' },
                            { label: 'VIX', value: flowData?.liquidity.vixLevel || '14' },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between text-[10px] font-sans">
                              <span className="text-slate-400">{item.label}</span>
                              <span className="text-emerald-500 dark:text-[#00f5c4] font-bold">{item.value}</span>
                            </div>
                          ))}
                          <div className="col-span-2 text-center mt-1">
                            <span className={cn(
                              'inline-block px-2 py-0.5 text-[10px] font-sans font-bold',
                              flowData?.liquidity.bias === 'risk_on'
                                ? 'bg-emerald-500/10 text-emerald-500 dark:text-[#00f5c4]'
                                : flowData?.liquidity.bias === 'risk_off'
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-amber-500/10 text-amber-500',
                            )}>
                              {(flowData?.liquidity.bias || 'risk_on').toUpperCase().replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      )}

                      {layer.number === 2 && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {markets.map((m) => (
                            <div
                              key={m.name}
                              className={cn(
                                'flex items-center justify-between px-2 py-1.5 text-[10px] font-sans',
                                m.isSelected
                                  ? 'bg-black/5 dark:bg-white/5 font-bold'
                                  : '',
                              )}
                            >
                              <span className={m.isSelected ? 'text-black dark:text-white' : 'text-slate-400'}>
                                {m.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={m.flow7d >= 0 ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400'}>
                                  {formatFlow(m.flow7d)}
                                </span>
                                <span className={cn('text-[9px] font-bold uppercase', phaseColor(m.phase))}>
                                  {m.phase}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Link to page */}
                      <Link
                        href={isLocked ? '/register' : layer.page}
                        className="inline-flex items-center gap-1 text-[10px] font-sans text-slate-400 hover:text-black dark:hover:text-white transition-colors"
                      >
                        {isLocked ? 'SIGN UP TO UNLOCK' : 'EXPLORE IN TERMINAL'}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Terminal CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-sans font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
          >
            ACCESS FULL TERMINAL
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <p className="text-[10px] font-sans text-slate-400 mt-2">
            L1-L2 free &middot; L3-L7 premium
          </p>
        </div>
      </div>
    </section>
  );
}
