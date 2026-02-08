'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Activity,
  TrendingUp,
  Layers,
  Search,
  ChevronDown,
  CheckCircle,
  Lock,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

/* ---------- types ---------- */
interface MarketData {
  name: string;
  flow7d: number;
  phase: string;
  isSelected: boolean;
}

interface LiquidityData {
  fedStatus: string;
  m2Change: string;
  dxyStatus: string;
  vixLevel: string;
  bias: string;
}

interface FlowData {
  liquidity: LiquidityData;
  markets: MarketData[];
  lastUpdated: string;
}

/* ---------- helpers ---------- */
function formatFlow(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getPhaseColor(phase: string) {
  switch (phase) {
    case 'early':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'mid':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'late':
      return 'bg-amber-500/20 text-amber-400';
    case 'exit':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
}

/* ---------- Typewriter ---------- */
function TypewriterText({
  text,
  delay = 0,
  speed = 30,
  className = '',
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [started, text, speed]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

/* ---------- FlowLine ---------- */
function FlowLine({ expanded }: { expanded: boolean }) {
  return (
    <div
      className={`flex justify-center my-2 transition-all duration-500 ${
        expanded ? 'opacity-100 h-8' : 'opacity-40 h-4'
      }`}
    >
      <div className="relative">
        <div className="w-0.5 h-full rounded-full bg-gradient-to-b from-[#4dd0e1] to-[#00f5c4]" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#4dd0e1] shadow-lg animate-flow-down"
          style={{ animationDuration: '1.5s' }}
        />
      </div>
    </div>
  );
}

/* ---------- single accordion item ---------- */
interface AccordionItemProps {
  layerNumber: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  locked?: boolean;
  quickBadge?: string;
  children?: React.ReactNode;
}

function AccordionItem({
  layerNumber,
  title,
  subtitle,
  icon,
  isExpanded,
  onToggle,
  locked = false,
  quickBadge,
  children,
}: AccordionItemProps) {
  const gradients: Record<number, string> = {
    1: 'from-[#4dd0e1] to-emerald-500',
    2: 'from-cyan-500 to-blue-500',
    3: 'from-violet-500 to-fuchsia-500',
    4: 'from-amber-500 to-orange-500',
  };
  const grad = gradients[layerNumber] || gradients[1];

  return (
    <div className="w-full">
      <button
        onClick={locked ? undefined : onToggle}
        className={`w-full text-left rounded-xl p-4 transition-all duration-300 border ${
          locked
            ? 'opacity-50 cursor-default border-white/5 bg-white/[0.02]'
            : isExpanded
              ? 'border-[#4dd0e1]/30 bg-white/[0.04] shadow-lg shadow-[#4dd0e1]/5'
              : 'border-white/10 bg-white/[0.03] hover:border-[#4dd0e1]/20 cursor-pointer'
        }`}
        aria-expanded={locked ? undefined : isExpanded}
        aria-label={`Layer ${layerNumber}: ${title}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${locked ? 'from-slate-500 to-slate-600' : grad} shrink-0`}>
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${locked ? 'text-slate-500' : 'text-white'}`}>
              LAYER {layerNumber}: {title}
            </p>
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          </div>

          {locked ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-500 uppercase">Premium</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {!isExpanded && quickBadge && (
                <span
                  className="px-2 py-0.5 text-[10px] font-bold rounded-full text-[#041020] animate-pulse hidden sm:inline-block"
                  style={{ background: 'linear-gradient(135deg, #4dd0e1, #00f5c4)' }}
                >
                  {quickBadge}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-[#4dd0e1] transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          )}
        </div>
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-500 ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        role="region"
        aria-labelledby={`layer-${layerNumber}`}
      >
        <div className="pt-3 px-1">{children}</div>
      </div>
    </div>
  );
}

/* ====================================================
   MAIN EXPORT
   ==================================================== */
export function FlowAccordion() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true, 2: false });
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [showTypewriter, setShowTypewriter] = useState<Record<number, boolean>>({});
  const sectionRef = useRef<HTMLElement>(null);

  /* Fetch capital flow data */
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
                fedStatus:
                  globalLiquidity?.fedBalanceSheet?.trend === 'expanding'
                    ? 'Expanding'
                    : 'Contracting',
                m2Change:
                  globalLiquidity?.m2MoneySupply?.yoyGrowth != null
                    ? `${globalLiquidity.m2MoneySupply.yoyGrowth > 0 ? '+' : ''}${globalLiquidity.m2MoneySupply.yoyGrowth.toFixed(1)}%`
                    : '+2.1%',
                dxyStatus:
                  globalLiquidity?.dxy?.trend === 'weakening' ? 'Weak ↓' : 'Strong ↑',
                vixLevel: globalLiquidity?.vix?.value
                  ? `${globalLiquidity.vix.level} (${Math.round(globalLiquidity.vix.value)})`
                  : 'Low (14)',
                bias: liquidityBias || 'risk_on',
              },
              markets:
                markets?.map(
                  (m: { market: string; flow7d: number; phase: string }) => ({
                    name: m.market.toUpperCase(),
                    flow7d: m.flow7d || 0,
                    phase: m.phase || 'mid',
                    isSelected: m.market === primaryMarket,
                  })
                ) || [],
              lastUpdated: new Date().toLocaleTimeString(),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch capital flow data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFlowData();
    const interval = setInterval(fetchFlowData, 60000);
    return () => clearInterval(interval);
  }, []);

  /* Intersection observer */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  /* Auto-expand layers sequentially */
  useEffect(() => {
    if (!isVisible) return;
    const t1 = setTimeout(() => {
      setExpanded((p) => ({ ...p, 1: true }));
      setShowTypewriter((p) => ({ ...p, 1: true }));
    }, 500);
    const t2 = setTimeout(() => {
      setExpanded((p) => ({ ...p, 2: true }));
      setShowTypewriter((p) => ({ ...p, 2: true }));
    }, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isVisible]);

  const toggle = (layer: number) => {
    if (layer > 2) return; // premium
    const newVal = !expanded[layer];
    setExpanded((p) => ({ ...p, [layer]: newVal }));
    if (newVal) setShowTypewriter((p) => ({ ...p, [layer]: true }));
  };

  /* Fallback markets */
  const defaultMarkets: MarketData[] = [
    { name: 'STOCKS', flow7d: 5, phase: 'mid', isSelected: false },
    { name: 'BONDS', flow7d: -2, phase: 'exit', isSelected: false },
    { name: 'CRYPTO', flow7d: 8, phase: 'early', isSelected: true },
    { name: 'METALS', flow7d: 1, phase: 'late', isSelected: false },
  ];

  const markets = flowData?.markets.length ? flowData.markets : defaultMarkets;
  const selectedMarket = markets.find((m) => m.isSelected) || markets[0];

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-12 md:py-20 relative overflow-hidden"
      style={{ backgroundColor: '#041020' }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute top-10 left-10 w-56 h-56 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(77,208,225,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-10 right-10 w-56 h-56 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,245,196,0.08) 0%, transparent 70%)',
          animationDelay: '1s',
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-8 md:mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-[#4dd0e1]/30 bg-[#4dd0e1]/5">
            <DollarSign className="w-5 h-5 text-[#4dd0e1]" />
            <span className="text-sm sm:text-base font-bold text-[#4dd0e1]">
              &ldquo;Follow The Money&rdquo; Principle
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Tap each layer to expand</p>
        </div>

        {/* Vertical accordion stack */}
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-0">
          {/* LAYER 1 */}
          <AccordionItem
            layerNumber={1}
            title="Global Liquidity"
            subtitle="Is liquidity expanding or contracting?"
            icon={<Activity className="w-5 h-5 text-white" />}
            isExpanded={!!expanded[1]}
            onToggle={() => toggle(1)}
            quickBadge={flowData?.liquidity.bias === 'risk_on' ? 'RISK ON' : flowData?.liquidity.bias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL'}
          >
            {/* Data grid */}
            <div className="rounded-lg p-4 border border-white/10 bg-white/[0.03]">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 bg-slate-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  {[
                    { label: 'Fed', value: flowData?.liquidity.fedStatus || 'Expanding', delay: 0 },
                    { label: 'M2', value: flowData?.liquidity.m2Change || '+2.1%', delay: 200 },
                    { label: 'DXY', value: flowData?.liquidity.dxyStatus || 'Weak ↓', delay: 400 },
                    { label: 'VIX', value: flowData?.liquidity.vixLevel || 'Low (14)', delay: 600 },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between gap-2">
                      <span className="text-slate-500">{item.label}:</span>
                      {showTypewriter[1] ? (
                        <TypewriterText
                          text={item.value}
                          delay={item.delay}
                          speed={50}
                          className="text-[#00f5c4] font-bold"
                        />
                      ) : (
                        <span className="text-[#00f5c4] font-bold">{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {flowData?.lastUpdated && (
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  Live &bull; Updated {flowData.lastUpdated}
                </p>
              )}
            </div>

            {/* Answer badge */}
            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg p-3 border border-[#4dd0e1]/30 bg-[#4dd0e1]/5">
              <CheckCircle className="w-4 h-4 text-[#00f5c4]" />
              <span
                className={`px-3 py-0.5 text-xs font-bold rounded-full text-white ${
                  flowData?.liquidity.bias === 'risk_on'
                    ? 'bg-emerald-500'
                    : flowData?.liquidity.bias === 'risk_off'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                }`}
              >
                {flowData?.liquidity.bias === 'risk_on'
                  ? 'RISK ON'
                  : flowData?.liquidity.bias === 'risk_off'
                    ? 'RISK OFF'
                    : 'NEUTRAL'}
              </span>
              <span className="text-xs text-slate-400">
                {flowData?.liquidity.bias === 'risk_on'
                  ? 'Risk assets favored'
                  : flowData?.liquidity.bias === 'risk_off'
                    ? 'Safe havens favored'
                    : 'Wait for clarity'}
              </span>
            </div>
          </AccordionItem>

          <FlowLine expanded={!!expanded[1]} />

          {/* LAYER 2 */}
          <AccordionItem
            layerNumber={2}
            title="Market Flow"
            subtitle="Which market is receiving the most flow?"
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            isExpanded={!!expanded[2]}
            onToggle={() => toggle(2)}
            quickBadge={`${selectedMarket.name} ${formatFlow(selectedMarket.flow7d)}`}
          >
            {/* Market cards grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
              {markets.map((market, idx) => (
                <div
                  key={market.name}
                  className={`rounded-lg p-3 text-center transition-all duration-300 border ${
                    market.isSelected
                      ? 'border-[#4dd0e1]/50 bg-[#4dd0e1]/10 ring-2 ring-[#4dd0e1]/20 scale-[1.02]'
                      : 'border-white/10 bg-white/[0.03] opacity-60'
                  }`}
                >
                  <p
                    className={`font-bold text-sm mb-1 ${
                      market.isSelected ? 'text-[#4dd0e1]' : 'text-slate-400'
                    }`}
                  >
                    {showTypewriter[2] ? (
                      <TypewriterText text={market.name} delay={idx * 150} speed={40} />
                    ) : (
                      market.name
                    )}
                  </p>
                  <p
                    className={`text-xs font-mono font-bold ${
                      market.flow7d > 0
                        ? 'text-[#00f5c4]'
                        : market.flow7d < 0
                          ? 'text-red-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {formatFlow(market.flow7d)}
                  </p>
                  <span
                    className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${getPhaseColor(market.phase)}`}
                  >
                    {market.phase.toUpperCase()}
                  </span>
                  {market.isSelected && (
                    <CheckCircle className="w-3.5 h-3.5 text-[#4dd0e1] mx-auto mt-1 animate-bounce" />
                  )}
                </div>
              ))}
            </div>

            {/* Answer */}
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg p-3 border border-[#4dd0e1]/30 bg-[#4dd0e1]/5">
              <CheckCircle className="w-4 h-4 text-[#00f5c4]" />
              <span
                className="px-3 py-0.5 text-xs font-bold rounded-full text-[#041020]"
                style={{ background: 'linear-gradient(135deg, #4dd0e1, #00f5c4)' }}
              >
                {selectedMarket.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedMarket.phase} phase &bull; {formatFlow(selectedMarket.flow7d)} flow
              </span>
            </div>
          </AccordionItem>

          <FlowLine expanded={!!expanded[2]} />

          {/* LAYER 3 - Locked */}
          <AccordionItem
            layerNumber={3}
            title="Sector Drill-Down"
            subtitle="Which sector within the market?"
            icon={<Layers className="w-5 h-5 text-white" />}
            isExpanded={false}
            onToggle={() => {}}
            locked
          />

          <FlowLine expanded={false} />

          {/* LAYER 4 - Locked */}
          <AccordionItem
            layerNumber={4}
            title="Asset Analysis"
            subtitle="7-Step + AI Confirmation"
            icon={<Search className="w-5 h-5 text-white" />}
            isExpanded={false}
            onToggle={() => {}}
            locked
          />

          {/* Premium note */}
          <div className="mt-6 text-center rounded-xl px-5 py-3 border border-amber-500/30 bg-amber-500/5 max-w-md mx-auto">
            <p className="text-sm text-slate-400">
              <Lock className="w-3.5 h-3.5 inline-block mr-1.5 text-amber-500" />
              <span className="font-semibold text-amber-400">Layer 3 & 4</span> provide detailed
              sector analysis and AI-powered asset signals.{' '}
              <Link
                href="/register"
                className="text-[#4dd0e1] font-semibold hover:underline"
              >
                Sign up to unlock
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
