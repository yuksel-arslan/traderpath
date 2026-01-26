'use client';

// ===========================================
// Analyze Page - 2026 Design Trends
// Kinetic Typography, Marquee, Grain, Glassmorphism, Bento Grid
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Target,
  FileText,
  CheckCircle2,
  XCircle,
  Timer,
  LineChart,
  ChevronDown,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  BarChart3,
  Shield,
  Brain,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';
import type { TradeType, Timeframe } from '../../../components/analysis/TradeTypeSelector';

// Lazy load components
const TradingViewWidget = dynamic(
  () => import('../../../components/charts/TradingViewWidget').then(mod => ({ default: mod.TradingViewWidget })),
  { ssr: false, loading: () => <div className="h-[300px] bg-muted/30 rounded-lg animate-pulse" /> }
);

const CoinSelector = dynamic(
  () => import('../../../components/common/CoinSelector').then(mod => ({ default: mod.CoinSelector })),
  { ssr: false, loading: () => <div className="h-20 bg-muted/30 rounded-lg animate-pulse" /> }
);

const TradeTypeSelector = dynamic(
  () => import('../../../components/analysis/TradeTypeSelector').then(mod => ({ default: mod.TradeTypeSelector })),
  { ssr: false, loading: () => <div className="h-10 bg-muted/30 rounded-lg animate-pulse" /> }
);

const RecentAnalyses = dynamic(
  () => import('../../../components/analysis/RecentAnalyses').then(mod => ({ default: mod.RecentAnalyses })),
  { ssr: false, loading: () => <div className="h-32 bg-muted/30 rounded-lg animate-pulse" /> }
);

interface AnalysisStats {
  totalAnalyses: number;
  activeCount: number;
  closedCount: number;
  tpHits: number;
  slHits: number;
  accuracy: number;
}

// Marquee ticker data
const MARQUEE_ITEMS = [
  { symbol: 'BTC', name: 'Bitcoin', change: '+2.45%', positive: true },
  { symbol: 'ETH', name: 'Ethereum', change: '+1.82%', positive: true },
  { symbol: 'SOL', name: 'Solana', change: '+5.21%', positive: true },
  { symbol: 'BNB', name: 'BNB', change: '-0.34%', positive: false },
  { symbol: 'XRP', name: 'XRP', change: '+3.15%', positive: true },
  { symbol: 'DOGE', name: 'Dogecoin', change: '+8.92%', positive: true },
  { symbol: 'ADA', name: 'Cardano', change: '-1.23%', positive: false },
  { symbol: 'AVAX', name: 'Avalanche', change: '+4.56%', positive: true },
];

const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE'];

// Kinetic Typography - Character by character animation
function KineticText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("inline-flex", className)}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="inline-block animate-[text-wave_2s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

// Grain Texture Overlay
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] dark:opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

// Gradient Orbs - Floating background elements
function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Teal Orb */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-emerald-500/10 rounded-full blur-3xl animate-float-slow" />
      {/* Red Orb */}
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-red-400/15 to-rose-500/10 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
      {/* Purple Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-full blur-3xl animate-orb-move" />
    </div>
  );
}

// Marquee Banner Component
function MarqueeBanner() {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 dark:from-slate-950/90 dark:via-slate-900/90 dark:to-slate-950/90 backdrop-blur-xl border-b border-white/5">
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-red-500/5" />
      <div className="flex animate-marquee">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-6 py-3 border-r border-white/5"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{item.symbol}</span>
              <span className="text-xs text-slate-400">{item.name}</span>
            </div>
            <span className={cn(
              "text-sm font-semibold",
              item.positive ? "text-emerald-400" : "text-rose-400"
            )}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Glass Card Component
function GlassCard({
  children,
  className,
  hover = true,
  allowOverflow = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  allowOverflow?: boolean;
}) {
  return (
    <div className={cn(
      "relative rounded-2xl",
      !allowOverflow && "overflow-hidden",
      "bg-white/70 dark:bg-slate-900/50",
      "backdrop-blur-xl backdrop-saturate-150",
      "border border-white/20 dark:border-white/10",
      "shadow-xl shadow-black/5 dark:shadow-black/20",
      hover && "transition-all duration-500 hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-1 hover:border-teal-500/20",
      className
    )}>
      {children}
    </div>
  );
}

// Stat Card with animation
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  const colorClasses: Record<string, { bg: string; text: string; icon: string; glow: string }> = {
    gray: {
      bg: 'bg-slate-100/80 dark:bg-slate-800/50',
      text: 'text-slate-700 dark:text-slate-200',
      icon: 'text-slate-500',
      glow: '',
    },
    blue: {
      bg: 'bg-blue-50/80 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-500',
      glow: 'shadow-blue-500/20',
    },
    green: {
      bg: 'bg-emerald-50/80 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: 'text-emerald-500',
      glow: 'shadow-emerald-500/20',
    },
    red: {
      bg: 'bg-rose-50/80 dark:bg-rose-500/10',
      text: 'text-rose-600 dark:text-rose-400',
      icon: 'text-rose-500',
      glow: 'shadow-rose-500/20',
    },
    teal: {
      bg: 'bg-teal-50/80 dark:bg-teal-500/10',
      text: 'text-teal-600 dark:text-teal-400',
      icon: 'text-teal-500',
      glow: 'shadow-teal-500/20',
    },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-xl p-3 sm:p-4 transition-all duration-700",
        "backdrop-blur-sm border border-white/10",
        colors.bg,
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        "hover:scale-105 hover:shadow-lg",
        colors.glow
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
        <Icon className={cn("w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0", colors.icon)} />
        <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</span>
      </div>
      <p className={cn("text-lg sm:text-2xl font-bold tabular-nums", colors.text)}>
        {value}
      </p>
    </div>
  );
}

// Feature Badge
function FeatureBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10">
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-500 flex-shrink-0" />
      <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{text}</span>
    </div>
  );
}

export default function AnalyzePage() {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [chartSymbol, setChartSymbol] = useState('BINANCE:BTCUSDT');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showChart, setShowChart] = useState(false);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await authFetch('/api/analysis/statistics');

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalAnalyses: statsData.totalAnalyses || 0,
          activeCount: statsData.activeCount || statsData.pendingAnalyses || 0,
          closedCount: statsData.verifiedAnalyses || 0,
          tpHits: statsData.correctAnalyses || 0,
          slHits: (statsData.verifiedAnalyses || 0) - (statsData.correctAnalyses || 0),
          accuracy: statsData.accuracy || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getAccuracyDisplay = (value: number) => {
    if (value > 0) return `${value.toFixed(0)}%`;
    return '—';
  };

  return (
    <div className="relative min-h-screen">
      {/* Grain Texture Overlay */}
      <GrainOverlay />

      {/* Gradient Orbs Background */}
      <GradientOrbs />

      {/* Marquee Banner */}
      <MarqueeBanner />

      {/* Main Content */}
      <div className="relative w-full px-3 sm:px-4 md:px-8 lg:px-12 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* ===== HERO SECTION with Kinetic Typography ===== */}
        <div className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-teal-500/10 to-red-500/10 border border-teal-500/20 backdrop-blur-sm animate-blur-in">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-medium bg-gradient-to-r from-teal-500 to-red-500 bg-clip-text text-transparent">
              AI-Powered Analysis Engine
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
            <span className="bg-gradient-to-r from-teal-600 via-red-500 to-teal-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">
              Trade Smarter with
            </span>
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-teal-500 via-red-400 to-teal-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer" style={{ animationDelay: '0.5s' }}>
                <KineticText text="TraderPath" />
              </span>
              <span className="absolute -bottom-1 sm:-bottom-2 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-teal-500 via-red-400 to-teal-500 rounded-full opacity-50 animate-pulse" />
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto animate-slide-up px-2">
            Professional-grade analysis powered by 40+ technical indicators
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <FeatureBadge icon={Brain} text="AI Analysis" />
            <FeatureBadge icon={Shield} text="Risk Assessment" />
            <FeatureBadge icon={BarChart3} text="40+ Indicators" />
            <FeatureBadge icon={Zap} text="Real-time Data" />
          </div>
        </div>

        {/* ===== BENTO GRID LAYOUT ===== */}
        <div className="grid grid-cols-12 gap-3 sm:gap-4 lg:gap-6">
          {/* Live Chart Card - Full Width at Top */}
          <div className="col-span-12">
            <GlassCard>
              <button
                onClick={() => setShowChart(!showChart)}
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <LineChart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Live Chart</span>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{chartSymbol.split(':')[1]}</p>
                  </div>
                </div>
                <div className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                  showChart ? "bg-violet-500/20 rotate-180" : "bg-slate-100 dark:bg-slate-800"
                )}>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                </div>
              </button>

              {showChart && (
                <div className="border-t border-white/10">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-50/50 dark:bg-slate-900/30">
                    {POPULAR_COINS.map((coin) => (
                      <button
                        key={coin}
                        onClick={() => setChartSymbol(`BINANCE:${coin}USDT`)}
                        className={cn(
                          'px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all duration-300',
                          chartSymbol === `BINANCE:${coin}USDT`
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:scale-105 border border-white/20 dark:border-slate-700'
                        )}
                      >
                        {coin}
                      </button>
                    ))}
                  </div>
                  <TradingViewWidget
                    symbol={chartSymbol}
                    theme={isDarkMode ? 'dark' : 'light'}
                    height={300}
                  />
                </div>
              )}
            </GlassCard>
          </div>

          {/* Stats Row - Full Width */}
          <div className="col-span-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={FileText} label="Total Analyses" value={stats?.totalAnalyses || 0} color="gray" delay={0} />
              <StatCard icon={Timer} label="Active" value={stats?.activeCount || 0} color="blue" delay={100} />
              <StatCard icon={FileText} label="Closed" value={stats?.closedCount || 0} color="gray" delay={200} />
              <StatCard icon={CheckCircle2} label="TP Hit" value={stats?.tpHits || 0} color="green" delay={300} />
              <StatCard icon={XCircle} label="SL Hit" value={stats?.slHits || 0} color="red" delay={400} />
              <StatCard icon={Target} label="Accuracy" value={getAccuracyDisplay(stats?.accuracy || 0)} color="teal" delay={500} />
            </div>
          </div>

          {/* Timeframe Selection - Full Width */}
          <div className="col-span-12">
            <GlassCard className="p-3 sm:p-4 md:p-6">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500" />
                  Select Timeframe
                </h3>
                <TradeTypeSelector
                  value={timeframe}
                  onChange={(tf) => setTimeframe(tf)}
                  variant="tabs"
                  showCreditCost
                  className="w-full"
                />
              </div>
            </GlassCard>
          </div>

          {/* Coin Selector - Full Width with dynamic height */}
          <div className="col-span-12 relative z-20">
            <GlassCard className="p-3 sm:p-4 md:p-6" allowOverflow>
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500" />
                  Select Coin to Analyze
                </h3>
                <CoinSelector timeframe={timeframe} />
              </div>
            </GlassCard>
          </div>

          {/* Recent Analyses - Full Width */}
          <div id="recent-analyses" className="col-span-12 relative z-10">
            <GlassCard className="p-3 sm:p-4 md:p-6">
              <RecentAnalyses />
            </GlassCard>
          </div>
        </div>

        {/* Bottom Marquee - Reverse Direction */}
        <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-100/80 via-white/80 to-slate-100/80 dark:from-slate-900/80 dark:via-slate-800/80 dark:to-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 mt-4 sm:mt-8">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-red-500/5" />
          <div className="flex animate-marquee-reverse py-2 sm:py-3">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-4 px-4 sm:px-8">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                    item.positive ? "bg-emerald-500" : "bg-rose-500"
                  )} />
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">{item.symbol}</span>
                </div>
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  item.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
