'use client';

// ===========================================
// Dashboard — Railway/Linear Minimal Design
// Mobile-first, clean, professional SaaS
// ===========================================

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { getApiUrl, authFetch } from '../../../lib/api';
import { OnboardingTour, TourTriggerButton, TourStep } from '@/components/onboarding/OnboardingTour';
import { CategoryBar, useMarketFilter, useBistSubSector } from '@/components/dashboard/CategoryBar';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { CapitalFlowStrip } from '@/components/dashboard/CapitalFlowStrip';
import { HeroStats } from '@/components/dashboard/HeroStats';
import { OpportunityRadar } from '@/components/dashboard/OpportunityRadar';
import { AIBriefing } from '@/components/dashboard/AIBriefing';
import { BehavioralScore } from '@/components/dashboard/BehavioralScore';
import { TradingAssistant } from '@/components/dashboard/TradingAssistant';
import { SmartAlertsWidget } from '@/components/dashboard/SmartAlertsWidget';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import type { MarketType } from '@/components/dashboard/CategoryBar';

// Lazy-load chart
const PnLChart = dynamic(
  () => import('@/components/dashboard/PnLChart').then((m) => ({ default: m.PnLChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    ),
  }
);

// ===========================================
// Types
// ===========================================
type TradeType = 'scalping' | 'dayTrade' | 'swing';

interface PlatformStats {
  platform: {
    totalUsers: number;
    totalAnalyses: number;
    totalReports: number;
    weeklyAnalyses: number;
    monthlyAnalyses: number;
  };
  accuracy: {
    overall: number;
    sampleSize?: number;
    methodology?: string;
  };
  goSignalRate?: { rate: number; totalVerified: number };
  verdicts: { go: number; conditional_go: number; wait: number; avoid: number };
}

interface UserStats {
  totalAnalyses: number;
  completedAnalyses: number;
  verifiedAnalyses: number;
  correctAnalyses: number;
  pendingAnalyses: number;
  accuracy: number;
  activeCount: number;
  activeProfitable: number;
  activePerformance: number;
  avgScore: number;
  goSignals: number;
  avoidSignals: number;
  lastAnalysisDate: string | null;
  aiExpertQuestionsTotal?: number;
  conciergeMessagesTotal?: number;
}

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number;
  outcome: 'correct' | 'incorrect' | 'pending';
  unrealizedPnL?: number;
  createdAt: string;
  direction?: string;
  entryPrice?: number;
  currentPrice?: number;
  tradeType?: TradeType;
  stopLoss?: number;
  takeProfit1?: number;
}

interface PerformanceDay {
  date: string;
  realized: number;
  unrealized: number;
  total: number;
  trades: number;
  cumulative: number;
}

interface PerformanceData {
  daily: PerformanceDay[];
  summary: {
    totalRealizedPnL: number;
    totalTrades: number;
    activeTrades: number;
    winRate: number;
  };
}

interface GlobalLiquidity {
  fedBalanceSheet: { value: number; change30d: number; trend: 'expanding' | 'contracting' | 'stable' };
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number };
  dxy: { value: number; change7d: number; trend: 'strengthening' | 'weakening' | 'stable' };
  vix: { value: number; level: 'extreme_fear' | 'fear' | 'neutral' | 'complacent' };
}

interface MarketFlow {
  market: 'crypto' | 'stocks' | 'bonds' | 'metals';
  flow7d: number;
  flow30d: number;
  phase: 'early' | 'mid' | 'late' | 'exit';
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: string;
  action: 'analyze' | 'wait' | 'avoid';
  confidence: number;
  reason: string;
}

interface CapitalFlowSummary {
  globalLiquidity: GlobalLiquidity;
  liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
}

interface SignalStats {
  totalSignals: number;
  activeSignals: number;
  closedSignals: number;
  winRate: number;
  bestPerformer: { symbol: string; pnl: number } | null;
  recentSignals: {
    id: string; symbol: string; direction: 'long' | 'short';
    verdict: string; outcome: string | null; pnlPercent: number | null; publishedAt: string;
  }[];
}

// ===========================================
// Symbol → MarketType mapping
// ===========================================
const KNOWN_CRYPTO = new Set([
  'BTC','ETH','SOL','BNB','XRP','ADA','DOGE','DOT','AVAX','MATIC',
  'LINK','UNI','ATOM','FIL','APT','ARB','OP','SUI','SEI','TIA',
  'NEAR','FTM','ALGO','ICP','VET','SAND','MANA','AXS','GALA','IMX',
  'PEPE','SHIB','WIF','BONK','FLOKI','RNDR','FET','AGIX','TAO','WLD',
  'AAVE','MKR','CRV','SNX','COMP','LDO','RPL','GMX','PENDLE',
  'INJ','TRX','HBAR','LTC','BCH','ETC','XLM','THETA','ENJ','TON',
]);
const KNOWN_METALS = new Set(['GLD','SLV','IAU','XAUUSD','XAGUSD','GC=F','SI=F','PPLT','PALL','GOLD','SILVER']);
const KNOWN_BONDS = new Set(['TLT','IEF','SHY','BND','AGG','GOVT','LQD','HYG','TIP','TIPS','TMF','EDV','ZROZ','VGSH']);
const KNOWN_BIST = new Set([
  'THYAO','GARAN','AKBNK','YKBNK','ISCTR','SAHOL','KCHOL','TUPRS',
  'EREGL','BIMAS','ASELS','SISE','TCELL','EKGYO','PGSUS','TOASO',
  'FROTO','ARCLK','PETKM','KOZAL','KOZAA','TAVHL','MGROS','HEKTS',
  'OYAKC','VESTL','TTKOM','TURSG','ENKAI','DOHOL','SASA','KONTR',
  'ULKER','AEFES','KRDMD',
]);

function detectMarketType(symbol: string): MarketType {
  const clean = symbol.replace(/USDT$|BUSD$|PERP$|\.IS$/i, '').toUpperCase();
  if (KNOWN_CRYPTO.has(clean)) return 'crypto';
  if (KNOWN_BIST.has(clean) || symbol.endsWith('.IS')) return 'bist';
  if (KNOWN_METALS.has(clean)) return 'metals';
  if (KNOWN_BONDS.has(clean)) return 'bonds';
  if (symbol.toUpperCase().endsWith('USDT')) return 'crypto';
  return 'crypto';
}

// ===========================================
// Verdict config
// ===========================================
const VERDICT_CONFIG = {
  go: { label: 'GO', textColor: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-500/10' },
  conditional_go: { label: 'C-GO', textColor: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-500/10' },
  wait: { label: 'WAIT', textColor: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10' },
  avoid: { label: 'AVOID', textColor: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-500/10' },
};

// ===========================================
// Active Trade Card
// ===========================================
function ActiveTradeCard({
  trade,
  isCounterFlow,
}: {
  trade: RecentAnalysis;
  isCounterFlow: boolean;
}) {
  const verdict = VERDICT_CONFIG[trade.verdict] ?? VERDICT_CONFIG.wait;
  const pnl = trade.unrealizedPnL ?? 0;
  const isLong = trade.direction?.toLowerCase() === 'long';
  const pnlColor = pnl >= 0 ? 'text-green-500' : 'text-red-500';
  const coinIcon = getCoinIcon(trade.symbol) || FALLBACK_COIN_ICON;

  return (
    <Link
      href={`/analyze/details/${trade.id}`}
      className="flex-shrink-0 w-[200px] sm:w-[220px] border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-[#111111] hover:border-gray-300 dark:hover:border-gray-700 transition-colors block"
    >
      {/* Symbol + verdict */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <img src={coinIcon} alt={trade.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }} />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {trade.symbol.replace(/USDT$/i, '')}
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${verdict.textColor} ${verdict.bgColor}`}>
          {verdict.label}
        </span>
      </div>

      {/* Direction + P&L */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {isLong ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className="text-xs text-gray-500 capitalize">{trade.direction ?? '—'}</span>
        </div>
        <span className={`text-sm font-semibold font-mono ${pnlColor}`}>
          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
        </span>
      </div>

      {/* Counter-flow warning */}
      {isCounterFlow && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
          <span className="text-[10px] text-yellow-500">Counter-flow</span>
        </div>
      )}
    </Link>
  );
}

// ===========================================
// Empty State
// ===========================================
function EmptyState() {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-10 bg-white dark:bg-[#111111] text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
        <TrendingUp className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        No analyses yet
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Start your first analysis to see your performance, trades, and AI-powered insights.
      </p>
      <Link
        href="/analyze"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors"
      >
        Start Analysis
      </Link>
    </div>
  );
}

// ===========================================
// Cache config
// ===========================================
const CACHE_KEY = 'dashboard_unified_cache';
const CACHE_DURATION = 5 * 60 * 1000;

// ===========================================
// Main Page
// ===========================================
export default function DashboardPage() {
  const [selectedMarkets, setSelectedMarkets] = useMarketFilter();
  const [bistSubSector, setBistSubSector] = useBistSubSector();

  const [credits, setCredits] = useState(0);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [signalStats, setSignalStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pnlViewMode, setPnlViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const initialLoadDone = useRef(false);

  // ===========================================
  // Data Fetching
  // ===========================================
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
              setCredits(data.credits);
              setPlatformStats(data.platformStats);
              setUserStats(data.userStats);
              setRecentAnalyses(data.recentAnalyses);
              setPerformanceData(data.performanceData || null);
              setCapitalFlow(data.capitalFlow || null);
              setSignalStats(data.signalStats || null);
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      const [creditsRes, platformRes, statsRes, livePricesRes, perfHistoryRes, capitalFlowRes, signalStatsRes] =
        await Promise.all([
          authFetch('/api/user/credits'),
          fetch(getApiUrl('/api/analysis/platform-stats')),
          authFetch('/api/analysis/statistics'),
          authFetch('/api/analysis/live-prices'),
          authFetch('/api/analysis/performance-history?days=30'),
          authFetch('/api/capital-flow/summary'),
          authFetch('/api/v1/signals/stats'),
        ]);

      let newCredits = 0;
      let newPlatformStats: PlatformStats | null = null;
      let newUserStats: UserStats | null = null;
      let newRecentAnalyses: RecentAnalysis[] = [];
      let newPerformanceData: PerformanceData | null = null;
      let newCapitalFlow: CapitalFlowSummary | null = null;
      let newSignalStats: SignalStats | null = null;

      if (creditsRes.ok) {
        const data = await creditsRes.json();
        newCredits = data.data?.balance || data.credits || 0;
        setCredits(newCredits);
      }

      if (platformRes.ok) {
        const data = await platformRes.json();
        newPlatformStats = data.data;
        setPlatformStats(newPlatformStats);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        newUserStats = data;
        setUserStats(newUserStats);
      }

      if (livePricesRes.ok) {
        const data = await livePricesRes.json();
        const analyses = data.data?.analyses || [];
        newRecentAnalyses = analyses.map((a: Record<string, unknown>) => {
          const rawVerdict = (typeof a.verdict === 'string' ? a.verdict : '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: RecentAnalysis['verdict'] = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

          let tradeType: TradeType | undefined;
          if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
          else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
          else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';

          let outcome: RecentAnalysis['outcome'] = 'pending';
          if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') outcome = 'correct';
          else if (a.outcome === 'sl_hit') outcome = 'incorrect';

          return {
            id: a.id as string,
            symbol: a.symbol as string,
            verdict,
            score: (a.totalScore as number) || 0,
            outcome,
            unrealizedPnL: a.unrealizedPnL as number | undefined,
            createdAt: a.createdAt as string,
            direction: a.direction as string | undefined,
            entryPrice: a.entryPrice as number | undefined,
            currentPrice: a.currentPrice as number | undefined,
            tradeType,
            stopLoss: a.stopLoss as number | undefined,
            takeProfit1: a.takeProfit1 as number | undefined,
          };
        });
        setRecentAnalyses(newRecentAnalyses);
      }

      if (perfHistoryRes.ok) {
        const data = await perfHistoryRes.json();
        newPerformanceData = data.data || null;
        setPerformanceData(newPerformanceData);
      }

      if (capitalFlowRes.ok) {
        const data = await capitalFlowRes.json();
        newCapitalFlow = data.data || null;
        setCapitalFlow(newCapitalFlow);
      }

      if (signalStatsRes.ok) {
        const data = await signalStatsRes.json();
        if (data.success && data.data) {
          const signalsData = data.data;
          const closedSignals = signalsData.byOutcome || {};
          const totalClosed = (closedSignals.tp1_hit || 0) + (closedSignals.tp2_hit || 0) + (closedSignals.sl_hit || 0);
          const wins = (closedSignals.tp1_hit || 0) + (closedSignals.tp2_hit || 0);
          const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
          const recentRes = await authFetch('/api/v1/signals?limit=3');
          let recentSignalsData: Record<string, unknown>[] = [];
          if (recentRes.ok) {
            const j = await recentRes.json();
            recentSignalsData = j.data?.signals || [];
          }
          newSignalStats = {
            totalSignals: signalsData.total || 0,
            activeSignals: signalsData.byStatus?.published || 0,
            closedSignals: totalClosed,
            winRate,
            bestPerformer: signalsData.bestPerformer || null,
            recentSignals: recentSignalsData.map((s) => ({
              id: s.id as string,
              symbol: s.symbol as string,
              direction: s.direction as 'long' | 'short',
              verdict: s.classicVerdict as string,
              outcome: s.outcome as string | null,
              pnlPercent: s.pnlPercent as number | null,
              publishedAt: s.publishedAt as string,
            })),
          };
          setSignalStats(newSignalStats);
        }
      }

      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: {
              credits: newCredits,
              platformStats: newPlatformStats,
              userStats: newUserStats,
              recentAnalyses: newRecentAnalyses,
              performanceData: newPerformanceData,
              capitalFlow: newCapitalFlow,
              signalStats: newSignalStats,
            },
            timestamp: Date.now(),
          })
        );
      } catch {}
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), CACHE_DURATION);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ===========================================
  // Chart data
  // ===========================================
  const buildChartData = () => {
    if (!performanceData?.daily?.length) {
      if (pnlViewMode === 'daily') {
        return Array.from({ length: 8 }, (_, i) => {
          const h = i * 3;
          return { name: `${String(h).padStart(2, '0')}:00`, pnl: 0, positive: 0, negative: 0, count: 0 };
        });
      }
      if (pnlViewMode === 'monthly') {
        return Array(30).fill(null).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return { name: String(d.getDate()), pnl: 0, positive: 0, negative: 0, count: 0 };
        });
      }
      return Array(7).fill(null).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { name: d.toLocaleDateString('en-US', { weekday: 'short' }), pnl: 0, positive: 0, negative: 0, count: 0 };
      });
    }

    const daily = performanceData.daily;

    if (pnlViewMode === 'weekly') {
      let cumulative = 0;
      return Array(7).fill(null).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        const dayData = daily.find((x) => x.date === key);
        cumulative += dayData?.realized || 0;
        return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          pnl: Number(cumulative.toFixed(2)),
          positive: Math.max(0, cumulative),
          negative: Math.min(0, cumulative),
          count: dayData?.trades || 0,
        };
      });
    }

    if (pnlViewMode === 'monthly') {
      let cumulative = 0;
      return Array(30).fill(null).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().split('T')[0];
        const dayData = daily.find((x) => x.date === key);
        cumulative += dayData?.realized || 0;
        return {
          name: String(d.getDate()),
          pnl: Number(cumulative.toFixed(2)),
          positive: Math.max(0, cumulative),
          negative: Math.min(0, cumulative),
          count: dayData?.trades || 0,
        };
      });
    }

    // daily
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPnl = daily.find((d) => d.date === todayStr)?.total || 0;
    return Array.from({ length: 8 }, (_, i) => {
      const h = i * 3;
      const progress = (h + 3) / 24;
      const pnl = Number((todayPnl * progress).toFixed(2));
      return {
        name: `${String(h).padStart(2, '0')}:00`,
        pnl,
        positive: Math.max(0, pnl),
        negative: Math.min(0, pnl),
        count: 0,
      };
    });
  };

  const chartData = buildChartData();

  const calculatePeriodPnL = () => {
    if (!performanceData?.daily?.length) return 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (pnlViewMode === 'daily') {
      return performanceData.daily.find((d) => d.date === todayStr)?.total || 0;
    }
    if (pnlViewMode === 'weekly') {
      return Array(7).fill(null).reduce((sum, _, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        const dayData = performanceData.daily.find((x) => x.date === key);
        return sum + (dayData?.realized || 0);
      }, 0);
    }
    return performanceData.summary?.totalRealizedPnL || 0;
  };

  const periodPnL = calculatePeriodPnL();

  // Filtered analyses
  const filteredAnalyses = useMemo(
    () => recentAnalyses.filter((a) => selectedMarkets.includes(detectMarketType(a.symbol))),
    [recentAnalyses, selectedMarkets]
  );
  const activeTrades = useMemo(
    () => filteredAnalyses.filter((t) => t.outcome === 'pending'),
    [filteredAnalyses]
  );

  // Counter-flow detection
  const counterFlowIds = useMemo(() => {
    const ids = new Set<string>();
    if (!capitalFlow?.markets?.length) return ids;
    for (const trade of activeTrades) {
      const dir = (trade.direction || '').toLowerCase();
      if (!dir || dir === 'neutral') continue;
      const mkt = detectMarketType(trade.symbol);
      const cfName = mkt === 'bist' ? 'stocks' : mkt;
      const flow = capitalFlow.markets.find((m) => m.market === cfName);
      if (!flow) continue;
      const isLong = dir === 'long';
      const isExiting = (flow.flow7d ?? 0) < -1 || flow.rotationSignal === 'exiting' || flow.phase === 'exit';
      const isEntering = (flow.flow7d ?? 0) > 1 || flow.rotationSignal === 'entering';
      if ((isLong && isExiting) || (!isLong && isEntering)) ids.add(trade.id);
    }
    return ids;
  }, [activeTrades, capitalFlow]);

  const hasData = (userStats?.totalAnalyses || 0) > 0;
  const winRate = performanceData?.summary?.winRate ?? userStats?.accuracy ?? 0;

  // ===========================================
  // Tour
  // ===========================================
  const tourSteps: TourStep[] = [
    {
      target: '#tour-flow-strip',
      title: 'Capital Flow Pipeline',
      content: 'See exactly where money is flowing — from global liquidity to specific action.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-hero',
      title: 'Your Key Metrics',
      content: 'P&L, win rate, accuracy, active trades, and credits — all at a glance.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-radar',
      title: 'Opportunity Radar',
      content: 'See which markets have the best phase and capital flow conditions right now.',
      placement: 'top',
      spotlightPadding: 8,
    },
  ];

  // ===========================================
  // Loading state
  // ===========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin text-teal-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ===========================================
  // Render
  // ===========================================
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <OnboardingTour steps={tourSteps} tourId="dashboard-v3" autoStart={false} />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-5">

        {/* Capital Flow Strip */}
        <div id="tour-flow-strip">
          <CapitalFlowStrip capitalFlow={capitalFlow} />
        </div>

        {/* Hero Stats Row */}
        <div id="tour-hero">
          <HeroStats
            periodPnL={periodPnL}
            pnlViewMode={pnlViewMode}
            setPnlViewMode={setPnlViewMode}
            winRate={winRate}
            totalAnalyses={userStats?.totalAnalyses ?? 0}
            accuracy={userStats?.accuracy ?? 0}
            activeCount={userStats?.activeCount ?? 0}
            activeProfitable={userStats?.activeProfitable ?? 0}
            credits={credits}
          />
        </div>

        {/* Market Filter */}
        <CategoryBar
          selected={selectedMarkets}
          onChange={setSelectedMarkets}
          bistSubSector={bistSubSector}
          onBistSubSectorChange={setBistSubSector}
        />

        {/* If no data, show empty state */}
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Main Grid: 2/3 left + 1/3 right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Left column */}
              <div className="lg:col-span-2 space-y-5">

                {/* Opportunity Radar */}
                <div id="tour-radar">
                  <OpportunityRadar
                    capitalFlow={capitalFlow}
                    selectedMarkets={selectedMarkets}
                  />
                </div>

                {/* Performance Chart */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Performance
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {pnlViewMode === 'daily' ? "Today's" : pnlViewMode === 'weekly' ? '7-day' : '30-day'} cumulative returns
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold font-mono ${periodPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {periodPnL === 0 ? '—' : `${periodPnL >= 0 ? '+' : ''}${Math.abs(periodPnL).toFixed(1)}%`}
                      </span>
                      <button
                        onClick={() => { setRefreshing(true); fetchData(true); }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="h-[200px] sm:h-[240px] px-4 py-4">
                    <PnLChart chartData={chartData} />
                  </div>
                </div>

                {/* Platform Stats — moved here to balance columns */}
                {platformStats && (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Platform Stats
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
                      {[
                        {
                          label: 'Platform Accuracy',
                          value: `${platformStats.accuracy.overall.toFixed(0)}%`,
                          sub: platformStats.accuracy.sampleSize
                            ? `${platformStats.accuracy.sampleSize} verified`
                            : 'verified trades',
                          valueColor:
                            platformStats.accuracy.overall >= 60
                              ? 'text-green-500'
                              : 'text-yellow-500',
                        },
                        {
                          label: 'Total Analyses',
                          value: platformStats.platform.totalAnalyses.toLocaleString(),
                          sub: `${platformStats.platform.weeklyAnalyses} this week`,
                          valueColor: 'text-gray-900 dark:text-gray-100',
                        },
                        {
                          label: 'Active Users',
                          value: platformStats.platform.totalUsers.toLocaleString(),
                          sub: 'on platform',
                          valueColor: 'text-gray-900 dark:text-gray-100',
                        },
                      ].map((item) => (
                        <div key={item.label} className="px-6 py-4">
                          <p className="text-xs font-medium text-gray-500 mb-1">{item.label}</p>
                          <p className={`text-xl font-semibold font-mono ${item.valueColor}`}>{item.value}</p>
                          {item.sub && <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Trades */}
                {activeTrades.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          Active Trades
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {activeTrades.length} open position{activeTrades.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Link
                        href="/trades"
                        className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        All trades →
                      </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto px-6 py-4 scrollbar-hide">
                      {activeTrades.slice(0, 10).map((trade) => (
                        <ActiveTradeCard
                          key={trade.id}
                          trade={trade}
                          isCounterFlow={counterFlowIds.has(trade.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* AI Briefing */}
                <AIBriefing
                  userStats={userStats}
                  recentAnalyses={recentAnalyses}
                  capitalFlow={capitalFlow}
                />

                {/* Behavioral Score */}
                <BehavioralScore
                  userStats={userStats}
                  performanceData={performanceData}
                />

                {/* Smart Alerts */}
                <SmartAlertsWidget />

                {/* Quick Actions */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-[#111111]">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { href: '/analyze', label: 'New Analysis' },
                      { href: '/capital-flow', label: 'Capital Flow' },
                      { href: '/signals', label: 'Signals' },
                      { href: '/reports', label: 'Reports' },
                    ].map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="text-center text-xs font-medium px-3 py-2.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Trading Assistant — full width below grid */}
            <TradingAssistant
              userContext={{
                winRate,
                accuracy: userStats?.accuracy ?? 0,
                activeCount: userStats?.activeCount ?? 0,
                totalAnalyses: userStats?.totalAnalyses ?? 0,
                capitalFlowAction: capitalFlow?.recommendation?.action ?? 'wait',
                topMarket: capitalFlow?.markets?.slice().sort((a, b) => b.flow7d - a.flow7d)[0]?.market ?? 'BTC',
                phase: capitalFlow?.markets?.slice().sort((a, b) => b.flow7d - a.flow7d)[0]?.phase ?? 'mid',
                credits,
              }}
            />

            {/* Trader Profile */}
            <ProfileCard />
          </>
        )}

        {/* Tour trigger */}
        <div className="flex justify-end">
          <TourTriggerButton tourId="dashboard-v3" />
        </div>
      </div>
    </div>
  );
}
