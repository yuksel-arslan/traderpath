'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Target,
  Clock,
  Zap,
  TrendingUp,
  Users,
  Star,
  CheckCircle,
  ChevronRight,
  Globe,
  FileText,
  AlertTriangle,
  TrendingDown,
  Lock,
  Eye,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  ChevronDown,
  Play,
  Brain,
  Sparkles,
  LineChart,
  Crosshair,
  Radar,
  ShieldAlert,
  Download,
  Mail,
  History,
  Share2,
  PieChart,
  Calendar,
  Bell,
  MessageCircle,
  Send,
  Smartphone,
  Rocket,
  Menu,
  X,
  Bot,
  Search,
  Coins,
  Gift,
  Crown,
  Mic,
  Layers,
  DollarSign
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { TraderPathLogo } from '../../components/common/TraderPathLogo';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../lib/coin-icons';
import { ANALYSIS_BUNDLES } from '../../lib/pricing-config';
import dynamic from 'next/dynamic';

// Lazy load the performance chart component
const LandingPerformanceChart = dynamic(
  () => import('../../components/landing/LandingPerformanceChart'),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-muted/30 rounded-lg" /> }
);

// Coins to display in the ticker
const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

interface LivePrice {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

const FEATURES = [
  {
    icon: Globe,
    title: 'Market Pulse',
    description: 'Real-time analysis of overall market sentiment and conditions',
  },
  {
    icon: Target,
    title: 'Asset Scanner',
    description: 'Deep-dive technical analysis of specific cryptocurrencies',
  },
  {
    icon: Shield,
    title: 'Safety Check',
    description: 'Detect manipulation and whale activities before they affect you',
  },
  {
    icon: Clock,
    title: 'Timing Analysis',
    description: 'Find the optimal entry and exit points for your trades',
  },
  {
    icon: FileText,
    title: 'Trade Plan',
    description: 'Get a complete trading strategy with targets and stop-losses',
  },
  {
    icon: AlertTriangle,
    title: 'Trap Check',
    description: 'Identify liquidation zones and avoid common trading traps',
  },
  {
    icon: CheckCircle,
    title: 'Final Verdict',
    description: 'AI-powered final recommendation with GO/WAIT/AVOID decision',
  },
];

// System Flow Chart - Visual explanation of how TraderPath works
// 4-Layer Capital Flow Architecture - "Follow The Money" Principle
function SystemFlowChart() {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<{ [key: number]: boolean }>({
    1: true, // Start with layer 1 expanded
    2: false,
    3: false,
    4: false,
  });
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-expand layers sequentially when visible
  useEffect(() => {
    if (isVisible) {
      const timers = [
        setTimeout(() => setExpandedLayers(prev => ({ ...prev, 1: true })), 500),
        setTimeout(() => setExpandedLayers(prev => ({ ...prev, 2: true })), 1500),
        setTimeout(() => setExpandedLayers(prev => ({ ...prev, 3: true })), 2500),
        setTimeout(() => setExpandedLayers(prev => ({ ...prev, 4: true })), 3500),
      ];
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isVisible]);

  const toggleLayer = (layer: number) => {
    setExpandedLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <section className="py-12 md:py-20 relative overflow-hidden" ref={chartRef}>
      {/* Background with animated gradient orbs - Corporate Teal/Coral */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-teal-500/20 to-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-gradient-to-br from-orange-500/15 to-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5 rounded-full blur-3xl animate-spin-slow" style={{ animationDuration: '30s' }} />
      <div className="absolute top-1/4 right-1/4 w-56 h-56 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gradient-to-br from-coral-500/10 to-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header - Architecture Title with Corporate Gradient */}
        <div className={`text-center mb-8 md:mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-block backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 border-2 border-transparent bg-clip-padding rounded-2xl px-6 py-4 shadow-xl relative overflow-hidden">
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-orange-500 opacity-20" />
            <div className="absolute inset-[2px] rounded-2xl bg-white dark:bg-slate-800" />
            <div className="relative">
              <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-1">
                TRADERPATH 2.0 ARCHITECTURE
              </h2>
              <p className="text-sm bg-gradient-to-r from-teal-500 to-orange-500 bg-clip-text text-transparent font-bold">
                "Follow The Money" Principle
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Click each layer to expand/collapse
              </p>
            </div>
          </div>
        </div>

        {/* MIND MAP LAYOUT */}
        <div className="relative max-w-6xl mx-auto">

          {/* CENTER: Main Question - Corporate Gradient */}
          <div className={`flex justify-center mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <div className="relative">
              {/* Multiple pulsing rings with teal/coral */}
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-teal-500/30 via-emerald-500/20 to-orange-500/30 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-teal-500/20 to-orange-500/20 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/10 via-transparent to-teal-500/10 animate-spin" style={{ animationDuration: '8s' }} />

              <div className="relative backdrop-blur-xl bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-600 rounded-full p-6 md:p-8 shadow-2xl shadow-teal-500/40 border border-white/20">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 md:w-10 md:h-10 text-white mx-auto mb-2 drop-shadow-lg" />
                  <p className="text-white/90 font-bold text-sm md:text-base">Where Is</p>
                  <p className="text-white font-bold text-lg md:text-xl drop-shadow-md">Money Flowing?</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connector from center - Gradient */}
          <div className={`flex justify-center mb-4 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-1 h-8 bg-gradient-to-b from-teal-500 via-emerald-500 to-teal-400 rounded-full shadow-lg shadow-teal-500/30" />
          </div>

          {/* LAYER 1: Global Liquidity - Collapsible */}
          <div className={`mb-4 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header - Corporate Teal Gradient */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(1)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/20 ${expandedLayers[1] ? 'ring-2 ring-teal-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/30">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">LAYER 1: Global Liquidity</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"Is liquidity expanding or contracting?"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[1] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-teal-500" />
                  </div>
                  {/* Quick Answer Badge - Gradient */}
                  {!expandedLayers[1] && (
                    <span className="ml-2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30 animate-pulse">
                      RISK ON
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content - Collapsible */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[1] ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                {/* Data Points */}
                <div className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Fed:</span>
                      <span className="text-emerald-500 font-bold">Expanding</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">M2:</span>
                      <span className="text-emerald-500 font-bold">+2.1%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">DXY:</span>
                      <span className="text-emerald-500 font-bold">Weak ↓</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">VIX:</span>
                      <span className="text-emerald-500 font-bold">Low (14)</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-6 h-6 text-teal-500 hidden md:block" />

                {/* Answer */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-500/50 rounded-xl p-4 shadow-lg ring-2 ring-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full">RISK ON</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Liquidity expanding → Risk assets favored
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Connector to Layer 2 - Gradient */}
          <div className={`flex justify-center mb-4 transition-all duration-500 ${expandedLayers[1] ? 'opacity-100 h-8' : 'opacity-50 h-4'}`}>
            <div className="w-1 h-full bg-gradient-to-b from-teal-400 via-cyan-500 to-blue-500 rounded-full shadow-lg shadow-cyan-500/30" />
          </div>

          {/* LAYER 2: Market Selection - Corporate Blue/Cyan Gradient */}
          <div className={`mb-4 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(2)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 ${expandedLayers[2] ? 'ring-2 ring-cyan-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">LAYER 2: Market Flow</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"Which market is receiving the most flow?"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[2] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-cyan-500" />
                  </div>
                  {!expandedLayers[2] && (
                    <span className="ml-2 px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30 animate-pulse">
                      CRYPTO +8%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[2] ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              {/* Market Options */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-4">
                <div className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-700/50 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-600 opacity-60">
                  <div className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-1">STOCKS</div>
                  <div className="text-xs font-mono text-slate-500">+5%</div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 text-[10px] font-bold inline-block">MID</div>
                </div>
                <div className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-700/50 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-600 opacity-40">
                  <div className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-1">BONDS</div>
                  <div className="text-xs font-mono text-red-500">-2%</div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 text-[10px] font-bold inline-block">EXIT</div>
                </div>
                <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-3 text-center border-2 border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg">
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-1">CRYPTO</div>
                  <div className="text-xs font-mono text-emerald-600 font-bold">+8%</div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-bold inline-block">EARLY</div>
                  <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mt-1" />
                </div>
                <div className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-700/50 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-600 opacity-50">
                  <div className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-1">METALS</div>
                  <div className="text-xs font-mono text-amber-500">+1%</div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-bold inline-block">LATE</div>
                </div>
              </div>

              {/* Answer */}
              <div className="flex justify-center">
                <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full">CRYPTO</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">Early phase • +8% flow • 23 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connector to Layer 3 - Gradient */}
          <div className={`flex justify-center mb-4 transition-all duration-500 ${expandedLayers[2] ? 'opacity-100 h-8' : 'opacity-50 h-4'}`}>
            <div className="w-1 h-full bg-gradient-to-b from-blue-500 via-violet-500 to-purple-500 rounded-full shadow-lg shadow-purple-500/30" />
          </div>

          {/* LAYER 3: Sector Drill-Down - Corporate Purple/Violet Gradient */}
          <div className={`mb-4 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(3)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 ${expandedLayers[3] ? 'ring-2 ring-purple-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-purple-500/30">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">LAYER 3: Sector Drill-Down</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"Which sector within CRYPTO?"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[3] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-purple-500" />
                  </div>
                  {!expandedLayers[3] && (
                    <span className="ml-2 px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-500/30 animate-pulse">
                      DeFi & AI
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[3] ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                {/* Sector Data */}
                <div className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">BTC Dominance:</span>
                      <span className="text-red-500 font-bold">52% ↓</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">DeFi TVL:</span>
                      <span className="text-emerald-500 font-bold">$48B ↑</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">L2 Activity:</span>
                      <span className="text-emerald-500 font-bold">High</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">AI Tokens:</span>
                      <span className="text-purple-500 font-bold">Trending</span>
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-6 h-6 text-purple-500 hidden md:block" />

                {/* Answer */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border-2 border-purple-500/50 rounded-xl p-4 shadow-lg ring-2 ring-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    <span className="px-3 py-1 bg-purple-500 text-white text-sm font-bold rounded-full">DeFi & AI</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    BTC dom falling • TVL rising • AI trending
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Connector to Layer 4 - Gradient */}
          <div className={`flex justify-center mb-4 transition-all duration-500 ${expandedLayers[3] ? 'opacity-100 h-8' : 'opacity-50 h-4'}`}>
            <div className="w-1 h-full bg-gradient-to-b from-purple-500 via-orange-500 to-amber-500 rounded-full shadow-lg shadow-orange-500/30" />
          </div>

          {/* LAYER 4: Asset Analysis - Corporate Orange/Coral Gradient */}
          <div className={`mb-8 transition-all duration-700 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header */}
            <div
              className="flex justify-center cursor-pointer group"
              onClick={() => toggleLayer(4)}
            >
              <div className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/20 ${expandedLayers[4] ? 'ring-2 ring-orange-500/30' : ''}`}>
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">LAYER 4: Asset Analysis</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">"Top 30 / 7-Step / MLIS Pro"</p>
                  </div>
                  <div className={`ml-2 transition-transform duration-300 ${expandedLayers[4] ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-orange-500" />
                  </div>
                  {!expandedLayers[4] && (
                    <span className="ml-2 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg shadow-orange-500/30 animate-pulse">
                      4 GO signals
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Layer Content */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[4] ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              {/* Analysis Methods */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto mb-4">
                <div className="backdrop-blur-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-teal-500/30 text-center hover:shadow-lg hover:shadow-teal-500/20 transition-all cursor-pointer">
                  <Radar className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                  <div className="font-bold text-sm text-slate-800 dark:text-white mb-1">Top 30 Scan</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Auto-scan assets</p>
                </div>
                <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 border border-emerald-500/30 text-center hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer">
                  <BarChart3 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <div className="font-bold text-sm text-slate-800 dark:text-white mb-1">7-Step Classic</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">40+ indicators</p>
                </div>
                <div className="backdrop-blur-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-violet-500/30 text-center hover:shadow-lg hover:shadow-violet-500/20 transition-all cursor-pointer">
                  <Brain className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                  <div className="font-bold text-sm text-slate-800 dark:text-white mb-1">MLIS Pro</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Neural signals</p>
                </div>
              </div>

              {/* Top Assets */}
              <div className="max-w-3xl mx-auto">
                <div className="backdrop-blur-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Top Assets in DeFi & AI Sector:</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-slate-700/70 rounded-xl border border-emerald-500/30 shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <span className="font-bold text-slate-800 dark:text-white">AAVE</span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded">87</span>
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">GO</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-slate-700/70 rounded-xl border border-emerald-500/30 shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <span className="font-bold text-slate-800 dark:text-white">FET</span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded">84</span>
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">GO</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-slate-700/70 rounded-xl border border-amber-500/30 shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <span className="font-bold text-slate-800 dark:text-white">ARB</span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded">76</span>
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">COND</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-slate-700/70 rounded-xl border border-amber-500/30 shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <span className="font-bold text-slate-800 dark:text-white">OP</span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded">72</span>
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">COND</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Corporate Gradients */}
          <div className={`flex flex-wrap justify-center gap-4 mb-8 transition-all duration-700 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 bg-[length:200%_100%] text-white text-sm font-bold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all hover:bg-[position:100%_0] duration-500"
            >
              <BarChart3 className="w-4 h-4" />
              View Analysis
            </Link>
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 bg-[length:200%_100%] text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all hover:bg-[position:100%_0] duration-500"
            >
              <Zap className="w-4 h-4" />
              Try MLIS Pro
            </Link>
          </div>

          {/* Bottom Verdict Badges - Enhanced */}
          <div className={`text-center transition-all duration-700 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex flex-wrap justify-center items-center gap-2 md:gap-3 mb-4">
              <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-md shadow-emerald-500/30">GO</span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-sm font-bold shadow-md shadow-yellow-500/30">CONDITIONAL</span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-md shadow-orange-500/30">WAIT</span>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-bold shadow-md shadow-red-500/30">AVOID</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-xl mx-auto">
              Simple, actionable trading signals with complete trade plans
            </p>
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 via-emerald-500 to-orange-500 bg-[length:200%_100%] text-white font-bold rounded-xl shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transition-all hover:bg-[position:100%_0] duration-700 text-sm md:text-base"
            >
              Start Free Analysis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Platform metrics component - shows real data instead of fake testimonials
function StatsBoxes() {
  const [metrics, setMetrics] = useState<{
    totalAnalyses: number;
    accuracy: number;
    totalPnL: number;
    closedCount: number;
    daysSinceStart: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const apiUrls = [
          process.env.NEXT_PUBLIC_API_URL,
          'https://api.traderpath.io',
          'https://traderpath-api-production.up.railway.app'
        ].filter(Boolean);

        let data = null;
        for (const baseUrl of apiUrls) {
          try {
            const res = await fetch(`${baseUrl}/api/analysis/platform-stats`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store'
            });
            if (res.ok) {
              data = await res.json();
              if (data.success) break;
            }
          } catch {
            continue;
          }
        }

        if (data?.success) {
          // Calculate days since platform start
          const platformSince = data.data.platform.platformSince;
          const startDate = platformSince ? new Date(platformSince) : new Date();
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          setMetrics({
            totalAnalyses: data.data.platform.totalAnalyses || 0,
            accuracy: data.data.accuracy.overall || 0,
            totalPnL: data.data.accuracy.totalPnL || 0,
            closedCount: data.data.accuracy.closedCount || 0,
            daysSinceStart: diffDays || 1,
          });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-card/50 backdrop-blur border rounded-xl animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return null;
  }

  // Calculate analyses per day
  const analysesPerDay = metrics.daysSinceStart > 0
    ? (metrics.totalAnalyses / metrics.daysSinceStart).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Total Analyses */}
      <div className="p-4 bg-card/50 backdrop-blur border rounded-xl text-center">
        <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
          {metrics.totalAnalyses.toLocaleString()}
        </div>
        <p className="text-xs text-muted-foreground">Total Analyses</p>
      </div>

      {/* Platform Accuracy */}
      <div className="p-4 bg-card/50 backdrop-blur border rounded-xl text-center">
        <div className="text-2xl md:text-3xl font-bold text-emerald-500 mb-1">
          {metrics.closedCount > 0 ? `${metrics.accuracy}%` : '—'}
        </div>
        <p className="text-xs text-muted-foreground">Platform Accuracy</p>
      </div>

      {/* Total P/L % */}
      <div className="p-4 bg-card/50 backdrop-blur border rounded-xl text-center">
        <div className={`text-2xl md:text-3xl font-bold mb-1 ${metrics.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {metrics.closedCount > 0 ? `${metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL}%` : '—'}
        </div>
        <p className="text-xs text-muted-foreground">Total P/L</p>
        {metrics.closedCount > 0 && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{metrics.closedCount} closed trades</p>
        )}
      </div>

      {/* Days Elapsed */}
      <div className="p-4 bg-card/50 backdrop-blur border rounded-xl text-center">
        <div className="text-2xl md:text-3xl font-bold text-blue-500 mb-1">
          {metrics.daysSinceStart}
        </div>
        <p className="text-xs text-muted-foreground">Days Elapsed</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{analysesPerDay} analyses/day</p>
      </div>
    </div>
  );
}

const FAQS = [
  {
    question: 'What is TraderPath and how does it work?',
    answer: 'TraderPath is a Global Capital Flow Intelligence Platform that tracks where money is flowing across Crypto, Stocks, Bonds, and Precious Metals. Our 4-layer system first identifies which market has the strongest capital inflow, then drills down to specific sectors and assets. You get actionable trade plans with entry points, targets, and stop-losses.',
  },
  {
    question: 'What markets does TraderPath cover?',
    answer: 'We track capital flows across 4 major markets: Crypto (full 7-Step and MLIS Pro analysis), Stocks, Bonds, and Precious Metals. Our Capital Flow Radar monitors Fed Balance Sheet, M2 Money Supply, DXY, VIX, and sector-specific flows to identify optimal trading opportunities.',
  },
  {
    question: 'Do I need to connect my exchange or wallet?',
    answer: 'No! TraderPath is purely an analysis tool. We never ask for your trading keys, wallet addresses, or exchange credentials. Your funds stay safe in your own accounts.',
  },
  {
    question: 'How accurate is the analysis?',
    answer: 'Our accuracy is calculated from verified trade outcomes (TP hits vs SL hits) and displayed transparently in our Platform Metrics section. We always recommend using our analysis as one input in your trading decisions, not as financial advice.',
  },
  {
    question: 'How does the credit system work?',
    answer: 'You purchase credits upfront and spend them as you analyze. A full 7-step analysis costs 25 credits. You can also earn free credits daily through login bonuses, quizzes, and other activities.',
  },
  {
    question: 'Can I get a refund if I\'m not satisfied?',
    answer: 'Yes! We offer a 7-day money-back guarantee on your first credit purchase. If TraderPath doesn\'t meet your expectations, contact support for a full refund.',
  },
];


// FAQ Accordion Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-accent/50 transition"
      >
        <span className="font-semibold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          {question}
        </span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}

// CountUp Animation Component
function CountUp({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(end);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  // Format number with K suffix
  const formatDisplay = (): string => {
    if (end >= 1000) {
      const kValue = count / 1000;
      // Show clean integer when complete, otherwise show one decimal
      if (count >= end) {
        return Math.round(kValue) + 'K';
      }
      return kValue.toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  return (
    <span ref={ref}>
      {formatDisplay()}{suffix}
    </span>
  );
}

// Analysis Steps Data - Detailed information for curious users
const ANALYSIS_STEPS = [
  {
    name: 'Market Pulse',
    icon: Globe,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    subtitle: 'Capital Flow Validated',
    description: 'By the time you reach this step, our Capital Flow system (Layers 1-3) has already determined that money is flowing into this market. Market Pulse confirms the micro-level conditions within your selected asset class—verifying that sector momentum aligns with the macro flow.',
    whatWeDo: [
      'Confirm sector-level flow matches global liquidity direction',
      'Monitor Bitcoin dominance trends to time altcoin vs BTC trades',
      'Track the Fear & Greed Index to gauge market psychology',
      'Validate that the Capital Flow phase (Early/Mid/Late) is still active',
      'Check correlation patterns to avoid counter-trend trades'
    ],
    whyItMatters: 'Capital Flow tells us WHERE money is going. Market Pulse tells us IF the timing is right within that market. Both must align for high-probability trades.',
    example: 'Capital Flow shows CRYPTO is in EARLY phase with DeFi sector selected. Market Pulse confirms Fear & Greed at 65 (Greed) and BTC dominance falling—perfect conditions for DeFi altcoin longs.'
  },
  {
    name: 'Asset Scan',
    icon: BarChart3,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    subtitle: 'Deep Technical Analysis',
    description: 'This is where we dive deep into your chosen cryptocurrency. Our AI analyzes price action, volume, momentum indicators, and chart patterns across multiple timeframes to build a complete technical picture.',
    whatWeDo: [
      'Identify key support and resistance levels from historical price data',
      'Calculate RSI, MACD, Stochastic, and other momentum indicators',
      'Analyze volume profiles to confirm price movements',
      'Detect chart patterns (triangles, flags, head & shoulders, etc.)',
      'Compare 15m, 1h, 4h, and daily timeframes for confluence'
    ],
    whyItMatters: 'Technical analysis helps predict where price is likely to go next. Multiple timeframe confirmation significantly increases trade probability.',
    example: 'If ETH shows a bullish flag pattern on 4h with RSI oversold on 1h and strong support nearby, that\'s a high-probability long setup.'
  },
  {
    name: 'Safety',
    icon: Shield,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    subtitle: 'Risk & Manipulation Detection',
    description: 'The crypto market is filled with manipulation, whale games, and hidden risks. Safety Check protects your capital by detecting dangerous patterns that retail traders often miss. This step can save you from devastating losses.',
    whatWeDo: [
      'Track whale wallet movements and large holder accumulation/distribution',
      'Monitor exchange inflows (selling pressure) and outflows (accumulation)',
      'Detect wash trading and artificial volume patterns',
      'Check for unusual funding rate spikes indicating overleveraged positions',
      'Analyze social sentiment for coordinated pump & dump signals'
    ],
    whyItMatters: 'Over 70% of retail traders lose money partly due to manipulation they can\'t see. Safety Check gives you the institutional-level awareness.',
    example: 'If a coin shows massive exchange inflows while price rises, whales might be preparing to dump. We\'ll warn you before you become exit liquidity.'
  },
  {
    name: 'Timing',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    subtitle: 'Optimal Entry Window',
    description: 'Even with a great trade setup, entering at the wrong time can turn a winner into a loser. Timing Analysis finds the optimal moment to enter based on volatility patterns, funding rates, and market events.',
    whatWeDo: [
      'Analyze historical volatility to predict optimal entry windows',
      'Check funding rates to avoid entering during extreme leverage',
      'Map liquidation clusters that could trigger cascading moves',
      'Review upcoming events (unlocks, earnings, protocol updates)',
      'Calculate time-based support/resistance from previous sessions'
    ],
    whyItMatters: 'A perfectly good trade can hit stop-loss due to bad timing. Entering during low volatility periods near support dramatically improves success rate.',
    example: 'If there\'s a $50M liquidation cluster just below current price, entering long here is risky—we\'d suggest waiting for that level to be swept first.'
  },
  {
    name: 'Trade Plan',
    icon: Target,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    subtitle: 'Your Execution Strategy',
    description: 'This is where everything comes together into an actionable plan. We calculate the exact entry price, multiple take-profit targets, and a strategic stop-loss level—all optimized for the best risk/reward ratio.',
    whatWeDo: [
      'Calculate optimal entry price based on current orderbook and momentum',
      'Set TP1 (conservative) and TP2 (main target) based on resistance/support levels',
      'Place stop-loss at technical invalidation points, not arbitrary percentages',
      'Calculate position sizing suggestions based on risk percentage',
      'Determine risk/reward ratio and expected value of the trade'
    ],
    whyItMatters: 'Professional traders never enter without a plan. Having predefined exits removes emotion from trading and protects your capital.',
    example: 'Entry: $0.5420 | TP1: $0.5680 (+4.8%) | TP2: $0.5890 (+8.7%) | SL: $0.5180 (-4.4%) | R:R = 2:1'
  },
  {
    name: 'Trap Check',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    subtitle: 'Avoiding Common Pitfalls',
    description: 'Market makers and whales set traps to liquidate retail traders. Trap Check identifies these danger zones—fake breakouts, stop hunts, and manipulation patterns—so you don\'t become their target.',
    whatWeDo: [
      'Identify potential bull traps (fake breakouts above resistance)',
      'Detect bear traps (fake breakdowns below support)',
      'Map stop-loss hunting zones where liquidity clusters exist',
      'Analyze orderbook spoofing and wall manipulation',
      'Check for divergences between price action and real buying/selling'
    ],
    whyItMatters: 'Most traders get stopped out right before price moves in their direction. Trap Check helps you avoid these frustrating scenarios.',
    example: 'Price breaking above resistance with low volume and hidden sell walls = likely bull trap. We\'d warn you to wait for confirmation or avoid the trade.'
  },
  {
    name: 'Final Verdict',
    icon: CheckCircle,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    subtitle: 'The Final Decision',
    description: 'All 4 Capital Flow layers plus the 6 technical analysis steps combine to deliver your final verdict. This isn\'t just chart analysis—it\'s a holistic view from global liquidity down to your specific entry price.',
    whatWeDo: [
      'Verify Capital Flow alignment (Global → Market → Sector → Asset)',
      'Aggregate scores from all technical analysis steps',
      'Weight factors based on current Capital Flow phase',
      'Deliver clear verdict: GO (take the trade), WAIT (conditions uncertain), or AVOID (too risky)',
      'Show which layers support or contradict the trade'
    ],
    whyItMatters: 'Most traders only see the micro picture. Our 4-layer approach ensures you\'re trading WITH the global money flow, not against it.',
    example: 'VERDICT: GO (82%) | Capital Flow: RISK ON → CRYPTO (Early) → DeFi | Asset: Strong technicals, no manipulation, optimal timing. Key strength: Trading with institutional flow.'
  },
];

// AI Experts Data - 4 specialized AI mentors for chat, education, and analysis review
const AI_EXPERTS = [
  {
    name: 'ARIA',
    title: 'Technical Analysis Mentor',
    icon: LineChart,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    credentials: 'AI Mentor • Technical Analysis Specialist • Chart Pattern Expert',
    description: 'Your go-to mentor for all things technical analysis. Chat with ARIA to learn about RSI, MACD, chart patterns, support/resistance levels, and multi-timeframe analysis. Ask any question and get clear, educational explanations.',
    focus: ['RSI & MACD', 'Chart Patterns', 'Support/Resistance', 'Trend Analysis']
  },
  {
    name: 'NEXUS',
    title: 'Risk Management Mentor',
    icon: Crosshair,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    credentials: 'AI Mentor • Risk Management Specialist • Position Sizing Expert',
    description: 'Your mentor for smart money management. Chat with NEXUS to learn about position sizing, risk/reward ratios, stop-loss strategies, and how to protect your capital. Perfect for beginners and experienced traders alike.',
    focus: ['Position Sizing', 'Risk/Reward', 'Stop-Loss Strategy', 'Capital Protection']
  },
  {
    name: 'ORACLE',
    title: 'On-Chain Intelligence Mentor',
    icon: Radar,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    credentials: 'AI Mentor • Blockchain Data Specialist • Whale Tracking Expert',
    description: 'Your guide to understanding on-chain data. Chat with ORACLE to learn about whale movements, exchange flows, smart money tracking, and how blockchain data can inform your trading decisions.',
    focus: ['Whale Tracking', 'Exchange Flows', 'Smart Money', 'On-Chain Metrics']
  },
  {
    name: 'SENTINEL',
    title: 'Security & Safety Mentor',
    icon: ShieldAlert,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    credentials: 'AI Mentor • Security Specialist • Scam Prevention Expert',
    description: 'Your protector in the crypto world. Chat with SENTINEL to learn about common scams, how to spot rug pulls, market manipulation tactics, and how to keep your investments safe from fraudulent projects.',
    focus: ['Scam Detection', 'Rug Pull Signs', 'Manipulation Tactics', 'Safe Trading']
  },
];

// Advanced Reporting Features Data
const REPORTING_FEATURES = [
  {
    name: 'PDF Reports',
    icon: Download,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    description: 'Download professional PDF reports with AI Expert insights and Tokenomics analysis. Perfect for record-keeping and sharing.',
    highlights: ['AI Expert comments', 'Tokenomics analysis', 'Trade plan charts', '40+ indicators']
  },
  {
    name: 'Email Delivery',
    icon: Mail,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    description: 'Get your analysis reports delivered directly to your inbox. Set up automatic delivery for scheduled analyses.',
    highlights: ['Instant delivery', 'Mobile-friendly format', 'Custom recipients', 'Digest options']
  },
  {
    name: 'Report History',
    icon: History,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    description: 'Access all your past analyses anytime. Track your trading decisions and learn from historical data.',
    highlights: ['Unlimited history', 'Search & filter', 'Compare analyses', 'Export bulk data']
  },
  {
    name: 'Share & Collaborate',
    icon: Share2,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    description: 'Share your analyses with team members or trading communities. Generate shareable links with customizable permissions.',
    highlights: ['Shareable links', 'Team workspaces', 'Permission controls', 'Community sharing']
  },
  {
    name: 'Performance Analytics',
    icon: PieChart,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    description: 'Track your trading performance over time. See win rates, ROI, and identify patterns in your successful trades.',
    highlights: ['Win/loss tracking', 'ROI calculations', 'Pattern insights', 'Monthly summaries']
  },
  {
    name: 'Scheduled Reports',
    icon: Calendar,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    description: 'Set up automated analyses for your favorite coins. Wake up to fresh reports every morning.',
    highlights: ['Daily/weekly schedules', 'Multi-coin support', 'Custom timing', 'Smart alerts']
  },
];

// Alerts Features Data - Social media and messaging alerts
const ALERTS_FEATURES = [
  {
    name: 'Telegram Alerts',
    icon: Send,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    description: 'Get instant analysis results and trade signals delivered to your Telegram. Join our channel or set up private bot notifications.',
    highlights: ['Instant notifications', 'Private bot option', 'Channel broadcasts', 'Custom filters']
  },
  {
    name: 'Discord Alerts',
    icon: MessageCircle,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    description: 'Connect with our Discord community. Receive alerts in dedicated channels and discuss trades with fellow traders.',
    highlights: ['Community channels', 'Role-based alerts', 'Discussion threads', 'Voice updates']
  },
  {
    name: 'Push Notifications',
    icon: Smartphone,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    description: 'Never miss an important signal. Get push notifications directly to your mobile device for time-sensitive alerts.',
    highlights: ['Mobile alerts', 'Priority levels', 'Sound customization', 'Do not disturb']
  },
  {
    name: 'Price Alerts',
    icon: Bell,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    description: 'Set custom price alerts for any coin. Get notified when your target prices or analysis conditions are met.',
    highlights: ['Custom thresholds', 'Multi-coin tracking', 'Condition triggers', 'TP/SL monitoring']
  },
];

// Analysis Steps Grid Component (Simple version for How it Works section)
function AnalysisStepsGrid() {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {ANALYSIS_STEPS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex flex-col items-center text-center p-2 rounded-lg hover:bg-accent/50 transition"
            >
              <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center mb-1`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className="text-[11px] font-medium">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Features Section Component with Four Main Features
function FeaturesSection() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [activeExpert, setActiveExpert] = useState<number | null>(null);
  const [activeReport, setActiveReport] = useState<number | null>(null);
  const [activeAlert, setActiveAlert] = useState<number | null>(null);
  const [activeConcierge, setActiveConcierge] = useState<number | null>(null);

  return (
    <>
      {/* Feature 1: AI-Powered Market Scanner */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-sm font-medium mb-4">
              <Search className="w-4 h-4" />
              Feature 1
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              AI-Powered Market Scanner
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI first identifies where capital is flowing, then scans the best opportunities in that market with 40+ technical indicators.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            {/* Capital Flow Context Box */}
            <div className="mb-4 p-3 bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-purple-500/10 border border-teal-500/20 rounded-xl">
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-500" />
                  <span className="text-slate-600 dark:text-slate-400">Capital Flow:</span>
                  <span className="font-bold text-emerald-500">RISK ON</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-600 dark:text-slate-400">Best Market:</span>
                  <span className="font-bold text-blue-500">CRYPTO</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="text-slate-600 dark:text-slate-400">Target Sector:</span>
                  <span className="font-bold text-purple-500">DeFi & AI</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-emerald-500">Scanning...</span>
                </div>
              </div>
            </div>

            {/* Top Row - Main Scanner Card + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* Scanner Visual */}
              <div className="lg:col-span-2 p-5 bg-card border rounded-lg hover:border-emerald-500/50 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center">
                    <Radar className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold gradient-text-logo-animate">Market Scan Results</h3>
                    <p className="text-xs text-muted-foreground">Top opportunities in target sector</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { rank: 1, coin: 'BTC', score: 87, verdict: 'GO', color: 'emerald' },
                    { rank: 2, coin: 'SOL', score: 82, verdict: 'GO', color: 'emerald' },
                    { rank: 3, coin: 'ETH', score: 76, verdict: 'COND', color: 'amber' },
                    { rank: 4, coin: 'LINK', score: 71, verdict: 'COND', color: 'amber' },
                    { rank: 5, coin: 'AVAX', score: 68, verdict: 'WAIT', color: 'orange' },
                  ].map((item) => (
                    <div key={item.rank} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                      <span className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {item.rank}
                      </span>
                      <span className="font-medium flex-1">{item.coin}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{item.score}/100</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          item.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-500' :
                          item.color === 'amber' ? 'bg-amber-500/20 text-amber-500' :
                          'bg-orange-500/20 text-orange-500'
                        }`}>
                          {item.verdict}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="p-4 bg-card border rounded-lg hover:border-emerald-500/50 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    <span className="text-2xl font-bold">40+</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Technical Indicators</span>
                </div>
                <div className="p-4 bg-card border rounded-lg hover:border-emerald-500/50 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-2xl font-bold">30+</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Coins Analyzed</span>
                </div>
                <div className="p-4 bg-card border rounded-lg hover:border-emerald-500/50 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-2xl font-bold">60s</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Full Scan Time</span>
                </div>
                <div className="p-4 bg-card border rounded-lg hover:border-emerald-500/50 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span className="text-2xl font-bold">4</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Capital Flow Layers</span>
                </div>
              </div>
            </div>

            {/* Bottom Features Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-card border rounded-lg hover:border-teal-500/50 hover:shadow-lg transition cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500/20 to-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <Globe className="w-5 h-5 text-teal-500" />
                  </div>
                  <span className="text-xs font-medium text-teal-500">Layer 1-3</span>
                </div>
                <h3 className="font-semibold mb-1 gradient-text-logo-animate">Capital Flow First</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">Check global liquidity, identify the best market, then drill down to the hottest sector.</p>
              </div>
              <div className="p-5 bg-card border rounded-lg hover:border-emerald-500/50 hover:shadow-lg transition cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-xs font-medium text-emerald-500">Signals</span>
                </div>
                <h3 className="font-semibold mb-1 gradient-text-logo-animate">Trade Signals</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">Clear GO, CONDITIONAL, or WAIT verdicts help you decide which opportunities to pursue.</p>
              </div>
              <div className="p-5 bg-card border rounded-lg hover:border-emerald-500/50 hover:shadow-lg transition cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <MessageCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-xs font-medium text-emerald-500">Input</span>
                </div>
                <h3 className="font-semibold mb-1 gradient-text-logo-animate">Natural Language</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">Ask in plain English or Turkish. Our AI understands context and delivers instant results.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Dual Analysis System - 7-Step Classic & MLIS Pro */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              Feature 2
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Dual Analysis System
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Two powerful analysis methods: Classic 7-Step for comprehensive trade planning, or MLIS Pro for advanced multi-layer intelligence.
            </p>
          </div>

          {/* Method Comparison Header */}
          <div className="max-w-5xl mx-auto mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-card border-2 border-teal-500/30 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-teal-500" />
                  <span className="font-bold text-teal-500">Classic 7-Step</span>
                </div>
                <p className="text-xs text-muted-foreground">Full analysis with Entry/SL/TP trade plan</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-2 border-violet-500/30 rounded-xl text-center relative">
                <span className="absolute -top-2 -right-2 text-xs bg-gradient-to-r from-violet-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">NEW</span>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Layers className="w-5 h-5 text-violet-500" />
                  <span className="font-bold text-violet-400">MLIS Pro</span>
                </div>
                <p className="text-xs text-muted-foreground">5-layer AI intelligence system</p>
              </div>
            </div>
          </div>

          {/* 7-Step Analysis Grid */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-semibold flex items-center justify-center gap-2 mb-3">
              <Target className="w-5 h-5 text-teal-500" />
              <span className="gradient-text-logo-animate">7-Step Analysis Suite</span>
            </h3>
            <p className="text-sm text-muted-foreground">Complete trading analysis covering every aspect. Click any step to learn more.</p>
          </div>
          <div className="max-w-5xl mx-auto">
            {/* Steps 1-3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {ANALYSIS_STEPS.slice(0, 3).map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`p-5 bg-card border rounded-lg hover:border-primary/50 hover:shadow-lg transition cursor-pointer group ${step.border}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 ${step.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <span className={`text-xs font-medium ${step.color}`}>Step {index + 1}</span>
                    </div>
                    <h3 className="font-semibold mb-1 gradient-text-logo-animate">{step.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{step.subtitle}</p>
                  </div>
                );
              })}
            </div>
            {/* Steps 4-6 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {ANALYSIS_STEPS.slice(3, 6).map((step, index) => {
                const Icon = step.icon;
                const stepNumber = index + 4;
                return (
                  <div
                    key={index}
                    onClick={() => setActiveStep(index + 3)}
                    className={`p-5 bg-card border rounded-lg hover:border-primary/50 hover:shadow-lg transition cursor-pointer group ${step.border}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 ${step.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
                        <Icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <span className={`text-xs font-medium ${step.color}`}>Step {stepNumber}</span>
                    </div>
                    <h3 className="font-semibold mb-1 gradient-text-logo-animate">{step.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{step.subtitle}</p>
                  </div>
                );
              })}
            </div>
            {/* Step 7 - Final Verdict (Full Width) */}
            <div className="w-full">
              {ANALYSIS_STEPS.slice(6).map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    onClick={() => setActiveStep(6)}
                    className="p-6 bg-card border rounded-lg hover:border-primary/50 hover:shadow-lg transition cursor-pointer group ring-2 ring-green-500/20 border-green-500/30"
                  >
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                        <Icon className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-green-500 font-medium">Step 7</span>
                        <h3 className="font-semibold text-lg gradient-text-logo-animate">{step.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-lg mx-auto">{step.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MLIS Pro Section */}
          <div className="max-w-5xl mx-auto mt-12 pt-12 border-t border-border/50">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold flex items-center justify-center gap-2 mb-3">
                <Layers className="w-5 h-5 text-violet-500" />
                <span className="text-violet-400">MLIS Pro</span>
                <span className="text-xs bg-gradient-to-r from-violet-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">NEW</span>
              </h3>
              <p className="text-sm text-muted-foreground">Multi-Layer Intelligence System - Advanced 5-layer analysis for comprehensive market insights.</p>
            </div>

            {/* MLIS Layers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="p-4 bg-card border-2 border-blue-500/30 rounded-xl text-center hover:border-blue-500/60 hover:shadow-lg transition group">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                  <LineChart className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="font-bold text-xs text-blue-500">Technical</h4>
                <p className="text-xs text-muted-foreground mt-1">EMA, MACD, ADX</p>
              </div>
              <div className="p-4 bg-card border-2 border-emerald-500/30 rounded-xl text-center hover:border-emerald-500/60 hover:shadow-lg transition group">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                  <Zap className="w-5 h-5 text-emerald-500" />
                </div>
                <h4 className="font-bold text-xs text-emerald-500">Momentum</h4>
                <p className="text-xs text-muted-foreground mt-1">RSI, StochRSI</p>
              </div>
              <div className="p-4 bg-card border-2 border-orange-500/30 rounded-xl text-center hover:border-orange-500/60 hover:shadow-lg transition group">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                  <Activity className="w-5 h-5 text-orange-500" />
                </div>
                <h4 className="font-bold text-xs text-orange-500">Volatility</h4>
                <p className="text-xs text-muted-foreground mt-1">ATR, Bollinger</p>
              </div>
              <div className="p-4 bg-card border-2 border-cyan-500/30 rounded-xl text-center hover:border-cyan-500/60 hover:shadow-lg transition group">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                  <BarChart3 className="w-5 h-5 text-cyan-500" />
                </div>
                <h4 className="font-bold text-xs text-cyan-500">Volume</h4>
                <p className="text-xs text-muted-foreground mt-1">OBV, CMF</p>
              </div>
              <div className="col-span-2 md:col-span-1 p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-2 border-violet-500/30 rounded-xl text-center hover:border-violet-500/60 hover:shadow-lg transition group">
                <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition">
                  <CheckCircle className="w-5 h-5 text-violet-500" />
                </div>
                <h4 className="font-bold text-xs text-violet-500">Verdict</h4>
                <p className="text-xs text-muted-foreground mt-1">BUY / HOLD / SELL</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Both methods cost <span className="font-semibold text-primary">25 credits</span>. Choose your preferred analysis style.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
              >
                Start Analyzing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: 4 AI Experts Council */}
      <section className="py-20 bg-gradient-to-b from-purple-500/5 via-blue-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-500 text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              Feature 3
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">4 AI Experts Council</span>
              <Sparkles className="w-8 h-8 text-yellow-500" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your personal AI mentors for trading education. Chat with specialized experts to learn, ask questions, and get personalized guidance on any trading topic.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {AI_EXPERTS.map((expert, idx) => {
                const ExpertIcon = expert.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveExpert(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${expert.border}`}
                  >
                    <div className={`w-16 h-16 ${expert.bg} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition`}>
                      <ExpertIcon className={`w-8 h-8 ${expert.color}`} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-lg mb-1 gradient-text-logo-animate">{expert.name}</h3>
                      <p className={`text-sm ${expert.color} font-medium mb-2`}>{expert.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{expert.description.split('.')[0]}.</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Chat & Learn:</span> Ask any trading question and get instant, educational responses tailored to your level.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Analysis Review:</span> Each expert also reviews your analyses and adds their specialized perspective to your reports.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Advanced Reporting */}
      <section className="py-20 bg-gradient-to-b from-cyan-500/5 via-blue-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-500 text-sm font-medium mb-4">
              <FileText className="w-4 h-4" />
              Feature 4
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">Advanced Reporting</span>
              <Download className="w-8 h-8 text-cyan-500" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Professional-grade reporting tools to track, share, and learn from your trading analyses. Click any feature to learn more.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORTING_FEATURES.map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveReport(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${feature.border}`}
                  >
                    <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <FeatureIcon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{feature.description.split('.')[0]}.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">All reports included:</span> Every analysis automatically generates a comprehensive report.
                Download as <span className="text-red-500 font-medium">PDF</span>, receive via <span className="text-blue-500 font-medium">email</span>,
                or access from your <span className="text-green-500 font-medium">dashboard</span> anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 5: Alerts */}
      <section className="py-20 bg-gradient-to-b from-yellow-500/5 via-orange-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-sm font-medium mb-4">
              <Bell className="w-4 h-4" />
              Feature 5
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">Smart Alerts</span>
              <Send className="w-8 h-8 text-blue-400" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Stay connected wherever you are. Get instant notifications via Telegram, Discord, and push notifications when important signals are triggered.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ALERTS_FEATURES.map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveAlert(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${feature.border}`}
                  >
                    <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition`}>
                      <FeatureIcon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-center gradient-text-logo-animate">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground text-center line-clamp-2">{feature.description.split('.')[0]}.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Send className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Telegram & Discord:</span> Join our community channels or set up private bot notifications for personalized alerts.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Real-time Updates:</span> Get notified when your analyses hit TP/SL targets or when market conditions change.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 6: AI Concierge */}
      <section className="py-20 bg-gradient-to-b from-emerald-500/5 via-teal-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-sm font-medium mb-4">
              <Bot className="w-4 h-4" />
              Feature 6
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">AI Concierge</span>
              <Sparkles className="w-8 h-8 text-emerald-500" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your personal AI trading assistant. Just ask in plain language - analyze coins, check your stats, set alerts, and more. Voice input supported!
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: MessageCircle,
                  name: 'Natural Language',
                  description: 'Just type or speak your request. "Analyze BTC for me" or "How is ETH looking?"',
                  bg: 'bg-emerald-500/10',
                  color: 'text-emerald-500',
                  border: 'border-emerald-500/30',
                },
                {
                  icon: Mic,
                  name: 'Voice Commands',
                  description: 'Hands-free analysis with voice input. Perfect for busy traders on the go.',
                  bg: 'bg-teal-500/10',
                  color: 'text-teal-500',
                  border: 'border-teal-500/30',
                },
                {
                  icon: Zap,
                  name: 'Instant Analysis',
                  description: 'Get full 7-step analysis results in seconds. Entry, SL, TP levels included.',
                  bg: 'bg-cyan-500/10',
                  color: 'text-cyan-500',
                  border: 'border-cyan-500/30',
                },
                {
                  icon: Brain,
                  name: 'Expert Insights',
                  description: 'Ask trading questions and get answers from our AI Expert Panel (VOLTRAN).',
                  bg: 'bg-purple-500/10',
                  color: 'text-purple-500',
                  border: 'border-purple-500/30',
                },
              ].map((feature, idx) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveConcierge(idx)}
                    className={`p-6 bg-card border-2 rounded-xl hover:shadow-xl transition cursor-pointer group ${feature.border}`}
                  >
                    <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition`}>
                      <FeatureIcon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-center gradient-text-logo-animate">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground text-center line-clamp-2">{feature.description.split('.')[0]}.</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-4 bg-card border rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Bilingual Support:</span> Speak Turkish or English - the AI understands both and responds in your language.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4 text-teal-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">50+ Coins:</span> Analyze any major cryptocurrency with natural language aliases like "Bitcoin" or "Ethereum".
                  </div>
                </div>
              </div>
            </div>
            {/* Example commands showcase */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                '"Analyze BTC for me"',
                '"How is SOL doing?"',
                '"Check my stats"',
                '"Set alert for ETH at 4000"',
                '"What is RSI?"',
              ].map((cmd, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  {cmd}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature 7: TFT Model Prediction (Coming Soon) */}
      <section className="py-20 bg-gradient-to-b from-pink-500/5 via-purple-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              Feature 7
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="gradient-text-logo-animate">TFT Model Prediction</span>
              <span className="text-sm bg-amber-500 text-white px-3 py-1 rounded-full font-medium">COMING SOON</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Advanced AI-powered price prediction using Temporal Fusion Transformer deep learning model. Get data-driven price forecasts to complement your technical analysis.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-card border-2 border-dashed border-pink-500/30 rounded-xl text-center">
                <div className="w-14 h-14 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <TrendingUp className="w-7 h-7 text-pink-500" />
                </div>
                <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">Price Forecasting</h3>
                <p className="text-sm text-muted-foreground">AI-generated price predictions for multiple timeframes based on historical patterns and market dynamics.</p>
              </div>
              <div className="p-6 bg-card border-2 border-dashed border-purple-500/30 rounded-xl text-center">
                <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Target className="w-7 h-7 text-purple-500" />
                </div>
                <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">Target Zones</h3>
                <p className="text-sm text-muted-foreground">Machine learning-identified support and resistance zones with probability scores.</p>
              </div>
              <div className="p-6 bg-card border-2 border-dashed border-cyan-500/30 rounded-xl text-center">
                <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <BarChart3 className="w-7 h-7 text-cyan-500" />
                </div>
                <h3 className="font-bold text-lg mb-2 gradient-text-logo-animate">Confidence Scores</h3>
                <p className="text-sm text-muted-foreground">Transparent confidence intervals showing prediction reliability for informed decision-making.</p>
              </div>
            </div>
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-amber-500">Coming Soon:</span> TFT Analysis will be available as an enhanced analysis option for <span className="font-semibold">{ANALYSIS_BUNDLES.find(b => b.comingSoon)?.credits || 50} credits</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Step Modal */}
      {activeStep !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveStep(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const item = ANALYSIS_STEPS[activeStep];
              const Icon = item.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-14 h-14 ${item.bg} ${item.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-7 h-7 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold">{item.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.bg} ${item.color} font-medium`}>Step {activeStep + 1}/7</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <button
                      onClick={() => setActiveStep(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {item.description}
                  </p>

                  {/* What We Analyze */}
                  <div className="mb-4">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">What We Analyze</h5>
                    <ul className="space-y-2">
                      {item.whatWeDo.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${item.color} flex-shrink-0 mt-0.5`} />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Why It Matters */}
                  <div className={`${item.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${item.color} mb-2`}>Why It Matters</h5>
                    <p className="text-sm">{item.whyItMatters}</p>
                  </div>

                  {/* Real Example */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Real Example</h5>
                    <p className="text-sm italic">{item.example}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* AI Expert Modal */}
      {activeExpert !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveExpert(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const expert = AI_EXPERTS[activeExpert];
              const ExpertIcon = expert.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-16 h-16 ${expert.bg} ${expert.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <ExpertIcon className={`w-8 h-8 ${expert.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold">{expert.name}</h4>
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </div>
                      <p className={`text-sm ${expert.color} font-medium`}>{expert.title}</p>
                    </div>
                    <button
                      onClick={() => setActiveExpert(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Credentials */}
                  <p className="text-xs text-muted-foreground mb-4 pb-3 border-b border-border">
                    {expert.credentials}
                  </p>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {expert.description}
                  </p>

                  {/* Expertise Areas */}
                  <div className={`${expert.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${expert.color} mb-2`}>Expertise Areas</h5>
                    <div className="flex flex-wrap gap-2">
                      {expert.focus.map((item, i) => (
                        <span key={i} className={`text-xs px-3 py-1.5 rounded-full border ${expert.border} ${expert.color} font-medium`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* What You Can Do */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border space-y-3">
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Chat & Learn:</span> Start a conversation with {expert.name} to ask questions, learn concepts, and get personalized trading education.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Analysis Review:</span> {expert.name} also reviews your 7-step analyses and adds specialized insights to your reports.
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Report Feature Modal */}
      {activeReport !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveReport(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const feature = REPORTING_FEATURES[activeReport];
              const FeatureIcon = feature.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-16 h-16 ${feature.bg} ${feature.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <FeatureIcon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{feature.name}</h4>
                      <p className={`text-sm ${feature.color} font-medium`}>Advanced Reporting</p>
                    </div>
                    <button
                      onClick={() => setActiveReport(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <div className={`${feature.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${feature.color} mb-3`}>Key Features</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {feature.highlights.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${feature.color} flex-shrink-0`} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Availability:</span> This feature is included with all TraderPath accounts. No additional cost or subscription required.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Alert Feature Modal */}
      {activeAlert !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setActiveAlert(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const feature = ALERTS_FEATURES[activeAlert];
              const FeatureIcon = feature.icon;
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-16 h-16 ${feature.bg} ${feature.border} border-2 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <FeatureIcon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{feature.name}</h4>
                      <p className={`text-sm ${feature.color} font-medium`}>Smart Alerts</p>
                    </div>
                    <button
                      onClick={() => setActiveAlert(null)}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <div className={`${feature.bg} rounded-lg p-4 mb-4`}>
                    <h5 className={`text-xs font-semibold uppercase tracking-wide ${feature.color} mb-3`}>Key Features</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {feature.highlights.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className={`w-4 h-4 ${feature.color} flex-shrink-0`} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* How to Connect */}
                  <div className="bg-accent/50 rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Get Started:</span> Connect your account from the dashboard settings. Join our Telegram channel or Discord server to start receiving alerts immediately.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

export default function LandingPage() {
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [topCoins, setTopCoins] = useState<Array<{
    symbol: string;
    reliabilityScore: number;
    verdict: string;
    direction: string | null;
    price: number;
    priceChange24h: number;
  }>>([]);
  const [isLoadingTopCoins, setIsLoadingTopCoins] = useState(true);

  // Fetch top coins by reliability score
  const fetchTopCoins = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io'}/api/analysis/top-coins?limit=5&tradeableOnly=true`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.coins) {
          setTopCoins(data.data.coins);
        }
      }
    } catch (error) {
      console.error('Failed to fetch top coins:', error);
    } finally {
      setIsLoadingTopCoins(false);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const symbols = TICKER_SYMBOLS.map(s => `"${s}USDT"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`
      );
      if (response.ok) {
        const data = await response.json();
        const prices: LivePrice[] = data.map((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
          const symbol = item.symbol.replace('USDT', '');
          const price = parseFloat(item.lastPrice);
          const change = parseFloat(item.priceChangePercent);
          return {
            symbol,
            price: price >= 1000
              ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : price >= 1
                ? price.toFixed(2)
                : price.toFixed(4),
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
            up: change >= 0,
          };
        });
        setLivePrices(prices);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchTopCoins();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices, fetchTopCoins]);

  return (
    <div className="min-h-screen bg-background">
      {/* Live Price Ticker */}
      <div className="bg-accent/50 border-b py-2 overflow-hidden">
        <div className="flex gap-8 ticker-scroll whitespace-nowrap">
          {isLoadingPrices ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Loading prices...
            </div>
          ) : (
            [...livePrices, ...livePrices].map((coin, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{coin.symbol}</span>
                <span className="text-muted-foreground">${coin.price}</span>
                <span className={coin.up ? 'text-green-500' : 'text-red-500'}>
                  {coin.change}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="w-full px-2 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <TraderPathLogo
            size="sm"
            showText={true}
            showTagline={false}
            href="/"
            className="flex-shrink-0 sm:hidden"
          />
          <TraderPathLogo
            size="md"
            showText={true}
            showTagline={true}
            href="/"
            className="flex-shrink-0 hidden sm:flex"
          />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition">
              How it Works
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">
              Pricing
            </a>
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1">
              <LanguageSelector compact />
              <ThemeToggle />
            </div>
            <Link
              href="/login"
              className="hidden sm:block px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition whitespace-nowrap"
            >
              Get Started
            </Link>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a
                href="#features"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it Works
              </a>
              <a
                href="#pricing"
                className="py-2 text-muted-foreground hover:text-foreground transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <hr className="border-border" />
              <div className="flex items-center justify-between py-2">
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <div className="flex items-center gap-2">
                  <LanguageSelector />
                  <ThemeToggle />
                </div>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 md:py-32 relative overflow-hidden">
        {/* Background gradient orbs - smaller on mobile */}
        <div className="absolute top-10 sm:top-20 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 sm:bottom-20 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-green-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-teal-500/20 via-cyan-500/15 to-red-500/20 dark:from-teal-500/30 dark:via-cyan-500/20 dark:to-rose-500/30 border-2 border-teal-500/40 dark:border-teal-400/50 rounded-full text-sm sm:text-base font-semibold mb-4 sm:mb-6 shadow-lg shadow-teal-500/20 dark:shadow-teal-400/30">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 dark:text-teal-400" />
            <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 dark:from-teal-300 dark:via-cyan-300 dark:to-teal-300 bg-clip-text text-transparent">Global Capital Flow Intelligence</span>
          </div>
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="float">
              <TraderPathLogo size="lg" showText={false} className="flex sm:hidden" />
              <TraderPathLogo size="xl" showText={false} className="hidden sm:flex" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-2 gradient-text-logo-animate">
            Follow the Money, Find the Opportunity
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Track global capital flows across Crypto, Stocks, Bonds & Metals.
            Our AI identifies where money is moving and delivers actionable trade signals.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600"
            >
              <span className="gradient-text-rg-animate text-sm sm:text-base">Start Free Analysis</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 gradient-text-rg-animate" />
            </Link>
            <a
              href="#features"
              className="px-6 sm:px-8 py-3 sm:py-4 border rounded-lg font-semibold hover:bg-accent transition flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              See Features
            </a>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
            Get 25 free credits on signup. No credit card required.
          </p>
        </div>
      </section>

      {/* System Flow Chart - How It Works Visual */}
      <SystemFlowChart />

      {/* Performance Chart & Stats Boxes - Above Features */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          <LandingPerformanceChart />
          <StatsBoxes />
        </div>
      </section>

      {/* Features Section with 7-Step Analysis + AI Experts */}
      <FeaturesSection />

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">How TraderPath Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Follow global capital flows to find the best opportunities. We track the money, you make the trades.
            </p>
          </div>

          {/* Workflow Steps - 4 Layers matching Capital Flow Architecture */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {/* Step 1: Global Liquidity */}
              <div className="bg-card border border-teal-500/30 rounded-xl p-5 relative group hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  1
                </div>
                <div className="pt-4">
                  <h3 className="text-base font-bold mb-2 gradient-text-logo-animate">Global Liquidity</h3>
                  <p className="text-xs text-muted-foreground mb-3">Is money expanding or contracting globally?</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Activity className="w-3.5 h-3.5 text-teal-500" />
                      <span className="text-muted-foreground">Fed Balance Sheet</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-muted-foreground">M2 Money Supply</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                      <span className="text-muted-foreground">DXY & Yield Curve</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Market Flow */}
              <div className="bg-card border border-cyan-500/30 rounded-xl p-5 relative group hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  2
                </div>
                <div className="pt-4">
                  <h3 className="text-base font-bold mb-2 gradient-text-logo-animate">Market Flow</h3>
                  <p className="text-xs text-muted-foreground mb-3">Which market is capital flowing into?</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-500 text-xs font-medium rounded">Crypto</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded">Stocks</span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-500 text-xs font-medium rounded">Bonds</span>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-medium rounded">Metals</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Sector Drill-Down */}
              <div className="bg-card border border-purple-500/30 rounded-xl p-5 relative group hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  3
                </div>
                <div className="pt-4">
                  <h3 className="text-base font-bold mb-2 gradient-text-logo-animate">Sector Drill-Down</h3>
                  <p className="text-xs text-muted-foreground mb-3">Which sector is leading the flow?</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-500 text-xs font-medium rounded">DeFi</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded">Layer2</span>
                    <span className="px-2 py-1 bg-violet-500/20 text-violet-500 text-xs font-medium rounded">AI</span>
                    <span className="px-2 py-1 bg-pink-500/20 text-pink-500 text-xs font-medium rounded">Gaming</span>
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded">Meme</span>
                  </div>
                </div>
              </div>

              {/* Step 4: Asset Analysis */}
              <div className="bg-card border border-orange-500/30 rounded-xl p-5 relative group hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  4
                </div>
                <div className="pt-4">
                  <h3 className="text-base font-bold mb-2 gradient-text-logo-animate">Asset Analysis</h3>
                  <p className="text-xs text-muted-foreground mb-3">Deep analysis with AI-powered verdict</p>
                  <div className="flex gap-1.5 mb-2">
                    <div className="px-2 py-1 bg-teal-500/10 border border-teal-500/30 rounded flex items-center gap-1">
                      <Target className="w-3 h-3 text-teal-500" />
                      <span className="text-[10px] font-medium text-teal-500">7-Step</span>
                    </div>
                    <div className="px-2 py-1 bg-violet-500/10 border border-violet-500/30 rounded flex items-center gap-1">
                      <Layers className="w-3 h-3 text-violet-500" />
                      <span className="text-[10px] font-medium text-violet-500">MLIS Pro</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-500 text-[10px] font-medium rounded">GO</span>
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[10px] font-medium rounded">COND</span>
                    <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-400 text-[10px] font-medium rounded">WAIT</span>
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-medium rounded">AVOID</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* AI Concierge - NEW */}
              <div className="bg-card border border-emerald-500/30 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-full">NEW</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold gradient-text-logo-animate">AI Concierge</h4>
                    <p className="text-xs text-muted-foreground">Chat-based trading assistant</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Just say &quot;How is BTC?&quot; - instant analysis with voice support. Natural language, zero UI complexity.</p>
              </div>

              {/* AI Expert */}
              <div className="bg-card border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold gradient-text-logo-animate">AI Expert Chat</h4>
                    <p className="text-xs text-muted-foreground">Ask questions about your analysis</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {AI_EXPERTS.slice(0, 4).map((expert, idx) => {
                    const ExpertIcon = expert.icon;
                    return (
                      <div key={idx} className={`p-1.5 ${expert.bg} rounded`}>
                        <ExpertIcon className={`w-3.5 h-3.5 ${expert.color}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PDF Report */}
              <div className="bg-card border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold gradient-text-logo-animate">PDF Report</h4>
                    <p className="text-xs text-muted-foreground">Download with AI insights</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Full analysis with Tokenomics, 40+ indicators in professional PDF format.</p>
              </div>

              {/* TFT Model - Coming Soon */}
              <div className="bg-card border border-dashed border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded-full">COMING SOON</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold gradient-text-logo-animate">TFT AI Model</h4>
                    <p className="text-xs text-muted-foreground">AI price prediction</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Temporal Fusion Transformer for 24h/7d price predictions.</p>
              </div>
            </div>
          </div>

          {/* How We Measure Analysis Accuracy */}
          <div className="mt-16 pt-16 border-t border-border">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-3 gradient-text-logo-animate">How We Measure Analysis Accuracy</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Outcome-verified methodology based on real price movements
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
              {/* TP/SL Based */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">TP/SL Verification</h4>
                <p className="text-xs text-muted-foreground">
                  Each GO signal includes Entry, Stop Loss, and Take Profit levels. We track if price hits
                  <span className="text-green-500 font-medium"> TP</span> or
                  <span className="text-red-500 font-medium"> SL</span> first.
                </p>
              </div>

              {/* Outcome Tracking */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">Outcome Tracking</h4>
                <p className="text-xs text-muted-foreground">
                  We monitor each trade until price hits
                  <span className="text-green-500 font-medium"> Take Profit</span> or
                  <span className="text-red-500 font-medium"> Stop Loss</span>.
                  No arbitrary time limits—real market outcomes.
                </p>
              </div>

              {/* GO Signal Rate */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">GO Signal Accuracy</h4>
                <p className="text-xs text-muted-foreground">
                  We specifically track GO and CONDITIONAL_GO signals. Platform accuracy shows how often these signals hit their first Take Profit target.
                </p>
              </div>

              {/* Public Dashboard */}
              <div className="bg-card border rounded-xl p-5">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <h4 className="font-semibold mb-2 text-sm gradient-text-logo-animate">Dashboard Transparency</h4>
                <p className="text-xs text-muted-foreground">
                  All users see the same platform accuracy stats on their dashboard. Every outcome—correct or incorrect—is counted in real-time.
                </p>
              </div>
            </div>

            {/* Accuracy Formula */}
            <div className="max-w-2xl mx-auto bg-accent/50 rounded-xl p-6 border">
              <h4 className="font-semibold text-center mb-4 gradient-text-logo-animate">Accuracy Calculation Formula</h4>
              <div className="flex items-center justify-center gap-2 text-sm mb-4 flex-wrap">
                <span className="px-3 py-1.5 bg-background rounded-lg font-mono">Accuracy</span>
                <span>=</span>
                <span className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg font-mono">TP Hits</span>
                <span>÷</span>
                <span className="px-3 py-1.5 bg-background rounded-lg font-mono">(TP Hits + SL Hits)</span>
                <span>× 100</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Only closed trades count. Expired or neutral outcomes are excluded from accuracy calculation.
              </p>
            </div>

            <p className="text-center mt-8 text-muted-foreground italic text-sm">
              &quot;We provide analysis tools and education—your trading decisions are always your own.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">No Trading Keys Required</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Growing Community</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="py-20 bg-accent/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Credit-Based Pricing
            </h2>
            <p className="text-muted-foreground mb-8">
              Pay only for what you use. No subscriptions, no hidden fees.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              View Pricing Plans
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text-logo-animate">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about TraderPath
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQS.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* As Seen On / Media */}
      <section className="py-16 bg-accent/50">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground text-sm mb-8">TRUSTED BY TRADERS FROM</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            {/* Placeholder logos - replace with actual partner/media logos */}
            <div className="text-2xl font-bold text-muted-foreground">Binance</div>
            <div className="text-2xl font-bold text-muted-foreground">Coinbase</div>
            <div className="text-2xl font-bold text-muted-foreground">Kraken</div>
            <div className="text-2xl font-bold text-muted-foreground">KuCoin</div>
            <div className="text-2xl font-bold text-muted-foreground">Bybit</div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            *Users from these platforms trust TraderPath for their trading analysis
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-amber-500/5 to-green-500/5"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center p-8 md:p-12 bg-card border rounded-2xl shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm mb-6">
              <Zap className="w-4 h-4" />
              Limited Time: 25 Free Credits
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 gradient-text-logo-animate">
              Ready to Trade Smarter?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join 12,000+ traders who already use TraderPath to make informed decisions.
              Start with 25 free credits today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600 text-lg"
              >
                <span className="gradient-text-rg-animate">Start Free Analysis</span>
                <ArrowRight className="w-5 h-5 gradient-text-rg-animate" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • 7-day money-back guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition">Features</a></li>
                <li><Link href="/pricing" className="hover:text-foreground transition">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition">Terms</Link></li>
                <li><Link href="/disclaimer" className="hover:text-foreground transition">Disclaimer</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/help" className="hover:text-foreground transition">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition">Contact</Link></li>
                <li><Link href="/status" className="hover:text-foreground transition">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © 2025 TraderPath. All rights reserved.
            </p>
            <Link
              href="/bilge"
              className="group inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-full hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
            >
              <Crown className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Architected by BILGE
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Trading involves risk. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
