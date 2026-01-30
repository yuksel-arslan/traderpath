'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Target,
  Zap,
  TrendingUp,
  Users,
  CheckCircle,
  Globe,
  FileText,
  Lock,
  Eye,
  Activity,
  HelpCircle,
  ChevronDown,
  Brain,
  Menu,
  X,
  Search,
  Crown,
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

// Typewriter Effect Component
function TypewriterText({ text, delay = 0, speed = 30, className = '' }: { text: string; delay?: number; speed?: number; className?: string }) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
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

  return <span className={className}>{displayText}<span className="animate-pulse">|</span></span>;
}

// Animated Flow Line Component
function FlowLine({ expanded, color1, color2 }: { expanded: boolean; color1: string; color2: string }) {
  return (
    <div className={`flex justify-center mb-4 transition-all duration-500 ${expanded ? 'opacity-100 h-12' : 'opacity-50 h-6'}`}>
      <div className="relative">
        {/* Main line */}
        <div className={`w-1 h-full bg-gradient-to-b ${color1} ${color2} rounded-full shadow-lg`} />
        {/* Animated flowing particles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg animate-flow-down" style={{ animationDuration: '1.5s' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/80 shadow-md animate-flow-down" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/60 shadow animate-flow-down" style={{ animationDuration: '1.5s', animationDelay: '1s' }} />
      </div>
    </div>
  );
}

// Live Capital Flow Data Interface
interface CapitalFlowData {
  liquidity: {
    fedStatus: string;
    m2Change: string;
    dxyStatus: string;
    vixLevel: string;
    bias: string;
  };
  markets: {
    name: string;
    flow7d: number;
    phase: string;
    isSelected: boolean;
  }[];
  lastUpdated: string;
}

// Format flow percentage to max 2 decimal places
function formatFlow(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

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
  const [flowData, setFlowData] = useState<CapitalFlowData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showTypewriter, setShowTypewriter] = useState<{ [key: number]: boolean }>({});
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch live capital flow data
  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io'}/api/capital-flow/summary`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const { liquidity, markets } = data.data;
            setFlowData({
              liquidity: {
                fedStatus: liquidity?.fedBalanceSheet?.trend === 'expanding' ? 'Expanding' : 'Contracting',
                m2Change: liquidity?.m2MoneySupply?.changePercent ? `${liquidity.m2MoneySupply.changePercent > 0 ? '+' : ''}${liquidity.m2MoneySupply.changePercent.toFixed(1)}%` : '+2.1%',
                dxyStatus: liquidity?.dxy?.trend === 'weakening' ? 'Weak ↓' : 'Strong ↑',
                vixLevel: liquidity?.vix?.value ? `${liquidity.vix.level} (${Math.round(liquidity.vix.value)})` : 'Low (14)',
                bias: liquidity?.bias || 'risk_on',
              },
              markets: markets?.map((m: { market: string; flow7d: number; phase: string }) => ({
                name: m.market.toUpperCase(),
                flow7d: m.flow7d || 0,
                phase: m.phase || 'mid',
                isSelected: m.market === 'crypto',
              })) || [],
              lastUpdated: new Date().toLocaleTimeString(),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch capital flow data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchFlowData();
    const interval = setInterval(fetchFlowData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

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

  // Auto-expand layers 1 and 2 sequentially when visible (3 and 4 are premium)
  useEffect(() => {
    if (isVisible) {
      const timers = [
        setTimeout(() => {
          setExpandedLayers(prev => ({ ...prev, 1: true }));
          setShowTypewriter(prev => ({ ...prev, 1: true }));
        }, 500),
        setTimeout(() => {
          setExpandedLayers(prev => ({ ...prev, 2: true }));
          setShowTypewriter(prev => ({ ...prev, 2: true }));
        }, 1500),
      ];
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isVisible]);

  const toggleLayer = (layer: number) => {
    // Only layers 1 and 2 are free - layers 3 and 4 are premium
    if (layer <= 2) {
      const newExpanded = !expandedLayers[layer];
      setExpandedLayers(prev => ({ ...prev, [layer]: newExpanded }));
      if (newExpanded) {
        setShowTypewriter(prev => ({ ...prev, [layer]: true }));
      }
    }
  };

  // Helper to get phase badge color
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'early': return 'bg-emerald-500/20 text-emerald-600';
      case 'mid': return 'bg-yellow-500/20 text-yellow-600';
      case 'late': return 'bg-amber-500/20 text-amber-600';
      case 'exit': return 'bg-red-500/20 text-red-600';
      default: return 'bg-slate-500/20 text-slate-600';
    }
  };

  return (
    <section id="features" className="py-12 md:py-20 relative overflow-hidden" ref={chartRef}>
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

            {/* Layer Content - Collapsible with Typewriter Effect */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[1] ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                {/* Data Points with Live Data & Typewriter */}
                <div className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  {isLoadingData ? (
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-4 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Fed:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.fedStatus || 'Expanding'}
                            delay={0}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.fedStatus || 'Expanding'}</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">M2:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.m2Change || '+2.1%'}
                            delay={200}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.m2Change || '+2.1%'}</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">DXY:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.dxyStatus || 'Weak ↓'}
                            delay={400}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.dxyStatus || 'Weak ↓'}</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">VIX:</span>
                        {showTypewriter[1] ? (
                          <TypewriterText
                            text={flowData?.liquidity.vixLevel || 'Low (14)'}
                            delay={600}
                            speed={50}
                            className="text-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="text-emerald-500 font-bold">{flowData?.liquidity.vixLevel || 'Low (14)'}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {flowData?.lastUpdated && (
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                      Live • Updated {flowData.lastUpdated}
                    </p>
                  )}
                </div>

                {/* Animated Arrow */}
                <div className="hidden md:block relative">
                  <ArrowRight className="w-6 h-6 text-teal-500 animate-pulse" />
                  <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-md animate-ping" style={{ animationDuration: '2s' }} />
                </div>

                {/* Answer */}
                <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-500/50 rounded-xl p-4 shadow-lg ring-2 ring-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className={`px-3 py-1 text-white text-sm font-bold rounded-full ${
                      flowData?.liquidity.bias === 'risk_on'
                        ? 'bg-emerald-500'
                        : flowData?.liquidity.bias === 'risk_off'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}>
                      {flowData?.liquidity.bias === 'risk_on' ? 'RISK ON' : flowData?.liquidity.bias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {flowData?.liquidity.bias === 'risk_on'
                      ? 'Liquidity expanding → Risk assets favored'
                      : flowData?.liquidity.bias === 'risk_off'
                      ? 'Liquidity contracting → Safe havens favored'
                      : 'Mixed signals → Wait for clarity'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Connector to Layer 2 - Animated Flow Line */}
          <FlowLine expanded={expandedLayers[1]} color1="from-teal-400" color2="to-cyan-500" />

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

            {/* Layer Content with Live Market Data */}
            <div className={`overflow-hidden transition-all duration-500 ${expandedLayers[2] ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              {/* Market Options - Dynamic from API */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-4">
                {isLoadingData ? (
                  // Loading skeleton
                  [1,2,3,4].map(i => (
                    <div key={i} className="backdrop-blur-xl bg-slate-100/80 dark:bg-slate-700/50 rounded-xl p-3 animate-pulse">
                      <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded mb-2" />
                      <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2 mx-auto" />
                    </div>
                  ))
                ) : (
                  // Fallback markets if API fails
                  (flowData?.markets.length ? flowData.markets : [
                    { name: 'STOCKS', flow7d: 5, phase: 'mid', isSelected: false },
                    { name: 'BONDS', flow7d: -2, phase: 'exit', isSelected: false },
                    { name: 'CRYPTO', flow7d: 8, phase: 'early', isSelected: true },
                    { name: 'METALS', flow7d: 1, phase: 'late', isSelected: false },
                  ]).map((market, idx) => (
                    <div
                      key={market.name}
                      className={`backdrop-blur-xl rounded-xl p-3 text-center transition-all duration-500 ${
                        market.isSelected
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-500 ring-4 ring-emerald-500/20 shadow-lg scale-105'
                          : 'bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 opacity-60 hover:opacity-80'
                      }`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className={`font-bold text-sm mb-1 ${market.isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {showTypewriter[2] ? (
                          <TypewriterText text={market.name} delay={idx * 150} speed={40} />
                        ) : market.name}
                      </div>
                      <div className={`text-xs font-mono font-bold ${
                        market.flow7d > 0 ? 'text-emerald-500' : market.flow7d < 0 ? 'text-red-500' : 'text-slate-500'
                      }`}>
                        {showTypewriter[2] ? (
                          <TypewriterText
                            text={formatFlow(market.flow7d)}
                            delay={idx * 150 + 200}
                            speed={60}
                          />
                        ) : formatFlow(market.flow7d)}
                      </div>
                      <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${getPhaseColor(market.phase)}`}>
                        {market.phase.toUpperCase()}
                      </div>
                      {market.isSelected && <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mt-1 animate-bounce" />}
                    </div>
                  ))
                )}
              </div>

              {/* Answer with Selected Market */}
              <div className="flex justify-center">
                <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full">
                      {flowData?.markets.find(m => m.isSelected)?.name || 'CRYPTO'}
                    </span>
                    {showTypewriter[2] ? (
                      <TypewriterText
                        text={`${flowData?.markets.find(m => m.isSelected)?.phase || 'early'} phase • ${formatFlow(flowData?.markets.find(m => m.isSelected)?.flow7d ?? 8)} flow`}
                        delay={800}
                        speed={30}
                        className="text-xs text-slate-600 dark:text-slate-300 font-mono"
                      />
                    ) : (
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {flowData?.markets.find(m => m.isSelected)?.phase || 'early'} phase • {formatFlow(flowData?.markets.find(m => m.isSelected)?.flow7d ?? 8)} flow
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connector to Layer 3 - Animated Flow Line */}
          <FlowLine expanded={expandedLayers[2]} color1="from-cyan-500" color2="to-violet-500" />

          {/* LAYER 3: Sector Drill-Down - PREMIUM (Locked) */}
          <div className={`mb-4 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header - Locked */}
            <div className="flex justify-center group">
              <div className="relative backdrop-blur-xl rounded-2xl p-4 shadow-lg opacity-60">
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-20" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 shadow-lg">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500">LAYER 3: Sector Drill-Down</span>
                    <p className="text-xs text-slate-400 dark:text-slate-500">"Which sector within the market?"</p>
                  </div>
                  <div className="ml-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                      PREMIUM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connector to Layer 4 - Animated Flow Line */}
          <FlowLine expanded={false} color1="from-violet-500" color2="to-amber-500" />

          {/* LAYER 4: Asset Analysis - PREMIUM (Locked) */}
          <div className={`mb-6 transition-all duration-700 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Layer Header - Locked */}
            <div className="flex justify-center group">
              <div className="relative backdrop-blur-xl rounded-2xl p-4 shadow-lg opacity-60">
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 opacity-20" />
                <div className="absolute inset-[2px] rounded-2xl bg-white/95 dark:bg-slate-800/95" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 shadow-lg">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500">LAYER 4: Asset Analysis</span>
                    <p className="text-xs text-slate-400 dark:text-slate-500">"Top 30 / 7-Step / MLIS Pro"</p>
                  </div>
                  <div className="ml-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                      PREMIUM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Note */}
          <div className={`flex justify-center mb-8 transition-all duration-700 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="backdrop-blur-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-500/30 rounded-xl px-6 py-3 max-w-lg text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <Lock className="w-4 h-4 inline-block mr-2 text-amber-500" />
                <span className="font-semibold text-amber-600 dark:text-amber-400">Layer 3 & 4</span> provide detailed sector analysis and AI-powered asset signals.
                <Link href="/register" className="ml-1 text-teal-600 dark:text-teal-400 font-semibold hover:underline">
                  Sign up to unlock
                </Link>
              </p>
            </div>
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
            Follow the Money Flow
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Track global capital flows across Crypto, Stocks, Bonds & Metals.
            Our AI identifies where money is moving and delivers actionable trade signals.
          </p>
          <div className="flex justify-center px-4 sm:px-0">
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600"
            >
              <span className="gradient-text-rg-animate text-sm sm:text-base">Start Free Analysis</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 gradient-text-rg-animate" />
            </Link>
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
                <li><a href="#features" className="hover:text-foreground transition">Capital Flow</a></li>
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
