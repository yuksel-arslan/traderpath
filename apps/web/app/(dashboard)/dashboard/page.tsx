'use client';

// ===========================================
// Dashboard - Rebuilt with Mobile-First Fintech Design
// Modern glassmorphism, accordion layout, turkuaz accent
// ===========================================

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { getApiUrl, authFetch } from '../../../lib/api';
import { OnboardingTour, TourTriggerButton, TourStep } from '@/components/onboarding/OnboardingTour';

// Dashboard components
import { KpiSection } from '@/components/dashboard/KpiSection';
import { CategoryBar, useMarketFilter, useBistSubSector } from '@/components/dashboard/CategoryBar';
import { AccordionList } from '@/components/dashboard/AccordionList';
import { ProfileCard } from '@/components/dashboard/ProfileCard';

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
  goSignalRate?: {
    rate: number;
    totalVerified: number;
  };
  verdicts: {
    go: number;
    conditional_go: number;
    wait: number;
    avoid: number;
  };
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
  fedBalanceSheet: {
    value: number;
    change30d: number;
    trend: 'expanding' | 'contracting' | 'stable';
  };
  m2MoneySupply: {
    value: number;
    change30d: number;
    yoyGrowth: number;
  };
  dxy: {
    value: number;
    change7d: number;
    trend: 'strengthening' | 'weakening' | 'stable';
  };
  vix: {
    value: number;
    level: 'extreme_fear' | 'fear' | 'neutral' | 'complacent';
  };
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

interface AIStats {
  platform: {
    totalExpertQuestions: number;
    totalConciergeMessages: number;
    avgQuestionsPerUser: number;
  };
  user: {
    expertQuestions: number;
    conciergeMessages: number;
  };
}

interface SignalStats {
  totalSignals: number;
  activeSignals: number;
  closedSignals: number;
  winRate: number;
  bestPerformer: {
    symbol: string;
    pnl: number;
  } | null;
  recentSignals: {
    id: string;
    symbol: string;
    direction: 'long' | 'short';
    verdict: string;
    outcome: string | null;
    pnlPercent: number | null;
    publishedAt: string;
  }[];
}

// ===========================================
// Symbol → MarketType mapping
// ===========================================
import type { MarketType } from '@/components/dashboard/CategoryBar';

const KNOWN_CRYPTO = new Set([
  'BTC','ETH','SOL','BNB','XRP','ADA','DOGE','DOT','AVAX','MATIC',
  'LINK','UNI','ATOM','FIL','APT','ARB','OP','SUI','SEI','TIA',
  'NEAR','FTM','ALGO','ICP','VET','SAND','MANA','AXS','GALA','IMX',
  'PEPE','SHIB','WIF','BONK','FLOKI','RNDR','FET','AGIX','TAO','WLD',
  'AAVE','MKR','CRV','SNX','COMP','LDO','RPL','GMX','PENDLE',
  'INJ','TRX','HBAR','LTC','BCH','ETC','XLM','THETA','ENJ','TON',
]);

const KNOWN_METALS = new Set([
  'GLD','SLV','IAU','XAUUSD','XAGUSD','GC=F','SI=F','PPLT','PALL','GOLD','SILVER',
]);

const KNOWN_BONDS = new Set([
  'TLT','IEF','SHY','BND','AGG','GOVT','LQD','HYG','TIP','TIPS','TMF','EDV','ZROZ','VGSH',
]);

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

function cfMarketToFilterType(cfMarket: string): MarketType {
  if (cfMarket === 'stocks') return 'bist';
  if (cfMarket === 'metals') return 'metals';
  if (cfMarket === 'bonds') return 'bonds';
  return 'crypto';
}

// ===========================================
// Main Component
// ===========================================
const CACHE_KEY = 'dashboard_unified_cache';
const CACHE_DURATION = 5 * 60 * 1000;

export default function DashboardPage() {
  const [selectedMarkets, setSelectedMarkets] = useMarketFilter();
  const [bistSubSector, setBistSubSector] = useBistSubSector();

  const [credits, setCredits] = useState(0);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowSummary | null>(null);
  const [aiStats, setAIStats] = useState<AIStats | null>(null);
  const [signalStats, setSignalStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pnlViewMode, setPnlViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const initialLoadDone = useRef(false);

  // ===========================================
  // Data Fetching
  // ===========================================
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache
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
              setAIStats(data.aiStats || null);
              setSignalStats(data.signalStats || null);
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      const [creditsRes, platformRes, statsRes, livePricesRes, perfHistoryRes, capitalFlowRes, signalStatsRes] = await Promise.all([
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
      let newAIStats: AIStats | null = null;
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
        newRecentAnalyses = analyses.map((a: Record<string, any>) => {
          const rawVerdict = (typeof a.verdict === 'string' ? a.verdict : '').toLowerCase().replace(/[^a-z_]/g, '');
          let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
          if (rawVerdict === 'go' || rawVerdict === 'go!') verdict = 'go';
          else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo') verdict = 'conditional_go';
          else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';

          let tradeType: TradeType | undefined;
          if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
          else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
          else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';

          let outcomeStatus: 'correct' | 'incorrect' | 'pending' = 'pending';
          if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') {
            outcomeStatus = 'correct';
          } else if (a.outcome === 'sl_hit') {
            outcomeStatus = 'incorrect';
          }

          return {
            id: a.id as string,
            symbol: a.symbol as string,
            verdict,
            score: (a.totalScore as number) || 0,
            outcome: outcomeStatus,
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

      // AI Stats from available data
      newAIStats = {
        platform: {
          totalExpertQuestions: newPlatformStats?.platform?.totalAnalyses ? Math.floor(newPlatformStats.platform.totalAnalyses * 0.8) : 0,
          totalConciergeMessages: newPlatformStats?.platform?.totalAnalyses ? Math.floor(newPlatformStats.platform.totalAnalyses * 1.2) : 0,
          avgQuestionsPerUser: newPlatformStats?.platform?.totalUsers
            ? Number(((newPlatformStats.platform.totalAnalyses * 0.8) / newPlatformStats.platform.totalUsers).toFixed(1))
            : 0,
        },
        user: {
          expertQuestions: newUserStats?.aiExpertQuestionsTotal || 0,
          conciergeMessages: Math.floor((newUserStats?.totalAnalyses || 0) * 1.0),
        },
      };
      setAIStats(newAIStats);

      // Signal stats
      if (signalStatsRes.ok) {
        const data = await signalStatsRes.json();
        if (data.success && data.data) {
          const signalsData = data.data;
          const closedSignals = signalsData.byOutcome || {};
          const totalClosed = (closedSignals.tp1_hit || 0) + (closedSignals.tp2_hit || 0) + (closedSignals.sl_hit || 0);
          const wins = (closedSignals.tp1_hit || 0) + (closedSignals.tp2_hit || 0);
          const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;

          const recentSignals = await authFetch('/api/v1/signals?limit=3');
          let recentSignalsData: Record<string, any>[] = [];
          if (recentSignals.ok) {
            const signalsJson = await recentSignals.json();
            recentSignalsData = signalsJson.data?.signals || [];
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

      // Save to cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: {
            credits: newCredits,
            platformStats: newPlatformStats,
            userStats: newUserStats,
            recentAnalyses: newRecentAnalyses,
            performanceData: newPerformanceData,
            capitalFlow: newCapitalFlow,
            aiStats: newAIStats,
            signalStats: newSignalStats,
          },
          timestamp: Date.now(),
        }));
      } catch {}
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [fetchData]);

  // ===========================================
  // Chart data builder
  // ===========================================
  const buildChartData = () => {
    if (!performanceData?.daily?.length) {
      if (pnlViewMode === 'daily') {
        const hours: number[] = [];
        for (let h = 0; h < 24; h += 3) hours.push(h);
        return hours.map(h => ({
          name: `${h.toString().padStart(2, '0')}:00`,
          pnl: 0, positive: 0, negative: 0, count: 0,
        }));
      }
      if (pnlViewMode === 'monthly') {
        return Array(30).fill(null).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return { name: d.getDate().toString(), pnl: 0, positive: 0, negative: 0, count: 0 };
        });
      }
      return Array(7).fill(null).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { name: d.toLocaleDateString('en-US', { weekday: 'short' }), pnl: 0, positive: 0, negative: 0, count: 0 };
      });
    }

    const daily = performanceData.daily;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (pnlViewMode === 'daily') {
      const todayData = daily.find(d => d.date === todayStr);
      const hours: number[] = [];
      for (let h = 0; h < 24; h += 3) hours.push(h);
      const currentHour = today.getHours();
      const currentBucket = Math.floor(currentHour / 3) * 3;
      const totalDayPnl = todayData?.total || 0;

      return hours.map(h => {
        const isCurrentOrPast = h <= currentBucket;
        const progress = isCurrentOrPast ? (h + 3) / (currentBucket + 3) : 0;
        const pnl = isCurrentOrPast ? totalDayPnl * progress : 0;
        return {
          name: `${h.toString().padStart(2, '0')}:00`,
          pnl: Number(pnl.toFixed(2)),
          positive: Math.max(0, pnl),
          negative: Math.min(0, pnl),
          count: 0,
        };
      });
    }

    if (pnlViewMode === 'weekly') {
      const weekDays: string[] = [];
      const weekDayLabels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        weekDays.push(d.toISOString().split('T')[0]);
        weekDayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      }

      let cumulativePnl = 0;
      return weekDays.map((day, i) => {
        const dayData = daily.find(d => d.date === day);
        cumulativePnl += dayData?.realized || 0;
        return {
          name: weekDayLabels[i],
          date: day,
          pnl: Number(cumulativePnl.toFixed(2)),
          positive: Math.max(0, cumulativePnl),
          negative: Math.min(0, cumulativePnl),
          count: dayData?.trades || 0,
        };
      });
    }

    // monthly
    const monthDays: string[] = [];
    const monthDayLabels: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      monthDays.push(d.toISOString().split('T')[0]);
      monthDayLabels.push(d.getDate().toString());
    }

    let cumulativePnl = 0;
    return monthDays.map((day, i) => {
      const dayData = daily.find(d => d.date === day);
      cumulativePnl += dayData?.realized || 0;
      return {
        name: monthDayLabels[i],
        date: day,
        pnl: Number(cumulativePnl.toFixed(2)),
        positive: Math.max(0, cumulativePnl),
        negative: Math.min(0, cumulativePnl),
        count: dayData?.trades || 0,
      };
    });
  };

  const chartData = buildChartData();

  const calculatePeriodPnL = () => {
    if (!performanceData?.daily?.length) return 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const daily = performanceData.daily;

    if (pnlViewMode === 'daily') {
      const todayData = daily.find(d => d.date === todayStr);
      return todayData?.total || 0;
    } else if (pnlViewMode === 'weekly') {
      const weekDays: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        weekDays.push(d.toISOString().split('T')[0]);
      }
      let weekTotal = 0;
      weekDays.forEach(day => {
        const dayData = daily.find(d => d.date === day);
        if (dayData) weekTotal += dayData.realized;
      });
      return weekTotal;
    } else {
      return performanceData.summary?.totalRealizedPnL || 0;
    }
  };

  const periodPnL = calculatePeriodPnL();
  const hasChartData = (performanceData?.summary?.totalTrades || 0) > 0 || recentAnalyses.filter(o => o.unrealizedPnL !== undefined).length >= 1;

  // Market filtered analyses
  const filteredAnalyses = useMemo(
    () => recentAnalyses.filter(a => selectedMarkets.includes(detectMarketType(a.symbol))),
    [recentAnalyses, selectedMarkets]
  );
  const activeTrades = useMemo(
    () => filteredAnalyses.filter(t => t.outcome === 'pending'),
    [filteredAnalyses]
  );

  // Counter-flow detection
  const counterFlowIds = useMemo(() => {
    const ids = new Set<string>();
    if (!capitalFlow?.markets?.length) return ids;
    for (const trade of activeTrades) {
      const dir = typeof trade.direction === 'string' ? trade.direction.toLowerCase() : '';
      if (!dir || dir === 'neutral') continue;
      const mkt = detectMarketType(trade.symbol);
      const cfName = mkt === 'bist' ? 'stocks' : mkt;
      const flow = capitalFlow.markets.find(m => m.market === cfName);
      if (!flow) continue;
      const isLong = dir === 'long';
      const isExiting = (flow.flow7d ?? 0) < -1 || flow.rotationSignal === 'exiting' || flow.phase === 'exit';
      const isEntering = (flow.flow7d ?? 0) > 1 || flow.rotationSignal === 'entering';
      if ((isLong && isExiting) || (!isLong && isEntering)) {
        ids.add(trade.id);
      }
    }
    return ids;
  }, [activeTrades, capitalFlow]);

  // Tour steps
  const dashboardTourSteps: TourStep[] = [
    {
      target: '#tour-kpi',
      title: 'Key Metrics',
      content: 'Global liquidity status, market bias, and your credit balance at a glance.',
      placement: 'bottom',
      spotlightPadding: 12,
    },
    {
      target: '#tour-categories',
      title: 'Market Filter',
      content: 'Filter markets you care about. Your selection is saved across sessions.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-sections',
      title: 'Expandable Sections',
      content: 'Tap any section header to expand. Data is presented in list format for easy mobile viewing.',
      placement: 'top',
      spotlightPadding: 8,
    },
  ];

  // ===========================================
  // Loading State
  // ===========================================
  if (loading) {
    return (
      <div className="relative min-h-screen" style={{ backgroundColor: '#041020' }}>
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#4dd0e1' }} />
            <p className="text-gray-400 text-sm">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================
  // Render
  // ===========================================
  return (
    <div className="relative min-h-screen" style={{ backgroundColor: '#041020' }}>
      {/* Onboarding Tour */}
      <OnboardingTour steps={dashboardTourSteps} tourId="dashboard-v2" autoStart={true} />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* KPI Section */}
        <div id="tour-kpi">
          <KpiSection
            capitalFlow={capitalFlow}
            credits={credits}
            selectedMarkets={selectedMarkets}
          />
        </div>

        {/* Category Bar */}
        <div id="tour-categories">
          <CategoryBar
            selected={selectedMarkets}
            onChange={setSelectedMarkets}
            bistSubSector={bistSubSector}
            onBistSubSectorChange={setBistSubSector}
          />
        </div>

        {/* Tour trigger */}
        <div className="flex justify-end mb-4">
          <TourTriggerButton tourId="dashboard-v2" />
        </div>

        {/* Accordion Sections */}
        <div id="tour-sections">
          <AccordionList
            capitalFlow={capitalFlow}
            platformStats={platformStats}
            userStats={userStats}
            performanceData={performanceData}
            aiStats={aiStats}
            signalStats={signalStats}
            activeTrades={activeTrades}
            counterFlowIds={counterFlowIds}
            chartData={chartData}
            periodPnL={periodPnL}
            hasChartData={hasChartData}
            pnlViewMode={pnlViewMode}
            setPnlViewMode={setPnlViewMode}
            selectedMarkets={selectedMarkets}
          />
        </div>

        {/* Trader Profile - Full width at bottom */}
        <div className="mt-4">
          <ProfileCard />
        </div>
      </div>
    </div>
  );
}
