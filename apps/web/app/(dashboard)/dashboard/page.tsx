'use client';

// ===========================================
// Dashboard - Focus Mode
// Clean terminal design with progressive disclosure
// ===========================================

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Gem,
  Plus,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Award,
  Brain,
  Globe,
  Bot,
  Minus,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import { getApiUrl, authFetch } from '../../../lib/api';
import { OnboardingTour, TourTriggerButton, TourStep } from '@/components/onboarding/OnboardingTour';
import { MetricCard, LiquidityGauge, MarketBiasBar } from '@/components/dashboard/MetricCard';
import { MarketFilter, useMarketFilter } from '@/components/dashboard/MarketFilter';
import { TraderProfileCard } from '@/components/dashboard/TraderProfileCard';

// Lazy load chart component
const PnLChart = dynamic(
  () => import('../../../components/dashboard/PnLChart').then(mod => ({ default: mod.PnLChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5EEDC3]/30 border-t-[#5EEDC3] rounded-full animate-spin" />
      </div>
    )
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

// Capital Flow Types
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
    outcome: 'tp1_hit' | 'tp2_hit' | 'sl_hit' | 'expired' | null;
    pnlPercent: number | null;
    publishedAt: string;
  }[];
}

// ===========================================
// Helper Functions
// ===========================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString('en-US');
}

function formatCredits(num: number): string {
  return num.toLocaleString('en-US');
}

// ===========================================
// Symbol → MarketType mapping
// ===========================================

import type { MarketType } from '@/components/dashboard/MarketFilter';

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

/** Map Capital Flow market name to our MarketFilter type */
function cfMarketToFilterType(cfMarket: string): MarketType {
  if (cfMarket === 'stocks') return 'bist';
  if (cfMarket === 'metals') return 'metals';
  if (cfMarket === 'bonds') return 'bonds';
  return 'crypto';
}

// ===========================================
// Collapsible Section
// ===========================================

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-[#1E293B] bg-[#0F1629] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-white">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#5EEDC3]/10 text-[#5EEDC3] border border-[#5EEDC3]/20">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!open && (
            <span className="text-xs text-gray-500">View</span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-500 transition-transform duration-300',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-6 pt-2 border-t border-[#1E293B]">{children}</div>
      </div>
    </div>
  );
}

// Active Trade Card
function ActiveTradeCard({ trade, counterFlow }: { trade: RecentAnalysis; counterFlow?: boolean }) {
  const pnlValue = trade.unrealizedPnL;
  const hasValidPnL = pnlValue !== null && pnlValue !== undefined;
  const isProfit = hasValidPnL && pnlValue >= 0;
  const verdictConfig = {
    go: { bg: 'bg-emerald-500', text: 'GO' },
    conditional_go: { bg: 'bg-yellow-500', text: 'C-GO' },
    wait: { bg: 'bg-gray-500', text: 'WAIT' },
    avoid: { bg: 'bg-[#EF5A6F]', text: 'AVOID' },
  };

  return (
    <Link
      href={`/analyze/details/${trade.id}`}
      className="flex-shrink-0 w-[200px] rounded-lg border border-[#1E293B] bg-[#0F1629] p-3 hover:border-[#5EEDC3]/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={getCoinIcon(trade.symbol)}
            alt={trade.symbol}
            className="w-5 h-5 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }}
          />
          <span className="font-bold text-white text-sm">{trade.symbol}</span>
        </div>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
          verdictConfig[trade.verdict].bg
        )}>
          {verdictConfig[trade.verdict].text}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium text-gray-400">
          {trade.direction?.toLowerCase() === 'long' ? (
            <TrendingUp className="w-3 h-3 text-[#5EEDC3]" />
          ) : trade.direction?.toLowerCase() === 'short' ? (
            <TrendingDown className="w-3 h-3 text-[#EF5A6F]" />
          ) : (
            <Minus className="w-3 h-3 text-gray-400" />
          )}
          {trade.direction?.toLowerCase() || 'neutral'}
        </div>
        <span className={cn(
          "font-bold text-sm",
          !hasValidPnL ? "text-gray-500" :
          isProfit ? "text-[#5EEDC3]" : "text-[#EF5A6F]"
        )}>
          {hasValidPnL ? `${isProfit ? '+' : ''}${pnlValue!.toFixed(1)}%` : 'N/A'}
        </span>
      </div>

      {trade.outcome !== 'pending' && (
        <div className={cn(
          "mt-2 pt-2 border-t flex items-center justify-center gap-1 text-xs font-semibold",
          trade.outcome === 'correct'
            ? "border-emerald-500/20 text-[#5EEDC3]"
            : "border-red-500/20 text-[#EF5A6F]"
        )}>
          {trade.outcome === 'correct' ? (
            <><CheckCircle2 className="w-3 h-3" /> TP Hit</>
          ) : (
            <><XCircle className="w-3 h-3" /> SL Hit</>
          )}
        </div>
      )}

      {counterFlow && (
        <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center gap-1 text-[10px] text-amber-400">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>Counter-flow</span>
        </div>
      )}
    </Link>
  );
}

// ===========================================
// Main Component
// ===========================================
const CACHE_KEY = 'dashboard_unified_cache';
const CACHE_DURATION = 5 * 60 * 1000;

export default function DashboardPage() {
  // Market filter state
  const [selectedMarkets, setSelectedMarkets] = useMarketFilter();

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

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
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
      let newPlatformStats = null;
      let newUserStats = null;
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
          const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
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
            id: a.id,
            symbol: a.symbol,
            verdict,
            score: a.totalScore || 0,
            outcome: outcomeStatus,
            unrealizedPnL: a.unrealizedPnL,
            createdAt: a.createdAt,
            direction: a.direction,
            entryPrice: a.entryPrice,
            currentPrice: a.currentPrice,
            tradeType,
            stopLoss: a.stopLoss,
            takeProfit1: a.takeProfit1,
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

      // Calculate AI Stats from available data
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

      // Process signal stats
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
              id: s.id,
              symbol: s.symbol,
              direction: s.direction,
              verdict: s.classicVerdict,
              outcome: s.outcome,
              pnlPercent: s.pnlPercent,
              publishedAt: s.publishedAt,
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

  // Build chart data from performanceData API
  const buildChartData = () => {
    if (!performanceData?.daily?.length) {
      if (pnlViewMode === 'daily') {
        const hours: number[] = [];
        for (let h = 0; h < 24; h += 3) hours.push(h);
        return hours.map(h => ({
          name: `${h.toString().padStart(2, '0')}:00`,
          pnl: 0,
          positive: 0,
          negative: 0,
          count: 0,
        }));
      }
      if (pnlViewMode === 'monthly') {
        return Array(30).fill(null).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return {
            name: d.getDate().toString(),
            pnl: 0,
            positive: 0,
            negative: 0,
            count: 0,
          };
        });
      }
      return Array(7).fill(null).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          pnl: 0,
          positive: 0,
          negative: 0,
          count: 0,
        };
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

  // ===== MARKET FILTER: filter analyses by selected markets =====
  const filteredAnalyses = useMemo(
    () => recentAnalyses.filter((a) => selectedMarkets.includes(detectMarketType(a.symbol))),
    [recentAnalyses, selectedMarkets]
  );
  const activeTrades = useMemo(
    () => filteredAnalyses.filter((t) => t.outcome === 'pending'),
    [filteredAnalyses]
  );

  // ===== COUNTER-FLOW DETECTION =====
  const counterFlowIds = useMemo(() => {
    const ids = new Set<string>();
    if (!capitalFlow?.markets?.length) return ids;
    for (const trade of activeTrades) {
      const dir = trade.direction?.toLowerCase();
      if (!dir || dir === 'neutral') continue;
      const mkt = detectMarketType(trade.symbol);
      // Map dashboard MarketType back to CF market name
      const cfName = mkt === 'bist' ? 'stocks' : mkt;
      const flow = capitalFlow.markets.find((m) => m.market === cfName);
      if (!flow) continue;
      // LONG but capital is exiting, or SHORT but capital is entering
      const isLong = dir === 'long';
      const isExiting = (flow.flow7d ?? 0) < -1 || flow.rotationSignal === 'exiting' || flow.phase === 'exit';
      const isEntering = (flow.flow7d ?? 0) > 1 || flow.rotationSignal === 'entering';
      if ((isLong && isExiting) || (!isLong && isEntering)) {
        ids.add(trade.id);
      }
    }
    return ids;
  }, [activeTrades, capitalFlow]);

  // Dashboard tour steps
  const dashboardTourSteps: TourStep[] = [
    {
      target: '#tour-focus-metrics',
      title: 'Key Metrics',
      content: 'Global liquidity status, market bias, and your credit balance at a glance.',
      placement: 'bottom',
      spotlightPadding: 12,
    },
    {
      target: '#tour-market-filter',
      title: 'Market Filter',
      content: 'Filter markets you care about. Your selection is saved across sessions.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-sections',
      title: 'Expandable Sections',
      content: 'Click any section header to expand and see details. Everything stays collapsed by default for a clean view.',
      placement: 'top',
      spotlightPadding: 8,
    },
  ];

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#0A0E27]">
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#5EEDC3] mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0A0E27]">
      {/* Onboarding Tour */}
      <OnboardingTour
        steps={dashboardTourSteps}
        tourId="dashboard-focus"
        autoStart={true}
      />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

        {/* ===== TOP 3 METRIC CARDS ===== */}
        <div id="tour-focus-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* L1: Global Liquidity Status */}
          <MetricCard title="Global Liquidity">
            {capitalFlow ? (
              <LiquidityGauge
                bias={capitalFlow.liquidityBias}
                fedTrend={capitalFlow.globalLiquidity.fedBalanceSheet.trend}
                dxyValue={capitalFlow.globalLiquidity.dxy.value}
                vixLevel={capitalFlow.globalLiquidity.vix.level}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <Globe className="w-6 h-6 text-gray-600 mb-2" />
                <p className="text-xs text-gray-500">No data</p>
                <Link href="/analyze" className="mt-2 text-xs text-[#5EEDC3] hover:underline">
                  View Capital Flow
                </Link>
              </div>
            )}
          </MetricCard>

          {/* L2: Market Bias Indicator (filtered) */}
          <MetricCard title="Market Bias">
            {capitalFlow && capitalFlow.markets.length > 0 ? (
              <MarketBiasBar
                markets={capitalFlow.markets
                  .filter(m => m && m.market && selectedMarkets.includes(cfMarketToFilterType(m.market)))
                  .map(m => ({
                    market: m.market,
                    flow7d: m.flow7d ?? 0,
                    phase: m.phase || 'mid',
                  }))}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <BarChart3 className="w-6 h-6 text-gray-600 mb-2" />
                <p className="text-xs text-gray-500">No data</p>
                <Link href="/analyze" className="mt-2 text-xs text-[#5EEDC3] hover:underline">
                  View Capital Flow
                </Link>
              </div>
            )}
          </MetricCard>

          {/* Credits Balance */}
          <MetricCard title="Credits Balance">
            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-2 mb-1">
                <Gem className="w-5 h-5 text-amber-400" />
                <span className="text-3xl font-black text-white tabular-nums">{formatCredits(credits)}</span>
              </div>
              {credits < 10 && credits > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 mb-3">
                  Running low
                </span>
              )}
              {credits === 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EF5A6F]/20 text-[#EF5A6F] mb-3">
                  No credits
                </span>
              )}
              {credits >= 10 && <div className="mb-3" />}
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5EEDC3] text-[#0A0E27] text-sm font-semibold hover:bg-[#5EEDC3]/90 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Buy More
              </Link>
              <Link
                href="/rewards"
                className="mt-2 text-xs text-gray-400 hover:text-[#5EEDC3] transition"
              >
                Earn free credits
              </Link>
            </div>
          </MetricCard>
        </div>

        {/* ===== MARKET FILTER ===== */}
        <div id="tour-market-filter" className="mb-6">
          <MarketFilter selected={selectedMarkets} onChange={setSelectedMarkets} />
        </div>

        {/* Tour trigger */}
        <div className="flex justify-end mb-4">
          <TourTriggerButton tourId="dashboard-focus" />
        </div>

        {/* ===== COLLAPSIBLE SECTIONS ===== */}
        <div id="tour-sections" className="space-y-4">

          {/* Capital Flow Summary */}
          {capitalFlow && (
            <CollapsibleSection
              title="Capital Flow"
              icon={Globe}
              badge={capitalFlow.recommendation?.action === 'analyze' ? 'OPPORTUNITY' : undefined}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* L1 */}
                <Link href="/analyze" className="block p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27] hover:border-[#5EEDC3]/30 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">1</div>
                    <span className="text-xs text-gray-400">Global Liquidity</span>
                  </div>
                  <span className={cn(
                    'text-sm font-bold',
                    capitalFlow.liquidityBias === 'risk_on' ? 'text-[#5EEDC3]' :
                    capitalFlow.liquidityBias === 'risk_off' ? 'text-[#EF5A6F]' : 'text-gray-400'
                  )}>
                    {capitalFlow.liquidityBias === 'risk_on' ? 'RISK ON' :
                     capitalFlow.liquidityBias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL'}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Fed: {capitalFlow.globalLiquidity.fedBalanceSheet.value.toFixed(1)}T
                  </p>
                </Link>

                {/* L2 */}
                <Link href="/analyze" className="block p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27] hover:border-[#5EEDC3]/30 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">2</div>
                    <span className="text-xs text-gray-400">Market Flow</span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {(() => {
                      const valid = capitalFlow.markets.filter(m => m && m.market);
                      if (valid.length === 0) return 'N/A';
                      const top = valid.reduce((a, b) => (b.flow7d ?? 0) > (a.flow7d ?? 0) ? b : a);
                      return `${(top.market || '').toUpperCase()} LEADS`;
                    })()}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {capitalFlow.markets.filter(m => (m.flow7d ?? 0) > 0).length}/{capitalFlow.markets.length} inflow
                  </p>
                </Link>

                {/* L3 */}
                <Link href="/analyze" className="block p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27] hover:border-[#5EEDC3]/30 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white">3</div>
                    <span className="text-xs text-gray-400">Sector</span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {(() => {
                      const rec = capitalFlow.recommendation;
                      const market = capitalFlow.markets.find(m => m.market === rec?.primaryMarket);
                      return market ? `${(market.phase || 'mid').toUpperCase()} PHASE` : 'ANALYZING';
                    })()}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {capitalFlow.recommendation?.primaryMarket || 'Market'} recommended
                  </p>
                </Link>

                {/* L4 */}
                <Link href="/analyze" className="block p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27] hover:border-[#5EEDC3]/30 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">4</div>
                    <span className="text-xs text-gray-400">Recommendation</span>
                  </div>
                  <span className={cn(
                    'text-sm font-bold',
                    capitalFlow.recommendation?.action === 'analyze' ? 'text-[#5EEDC3]' :
                    capitalFlow.recommendation?.action === 'wait' ? 'text-amber-400' : 'text-[#EF5A6F]'
                  )}>
                    {(capitalFlow.recommendation?.action || 'wait').toUpperCase()} {(capitalFlow.recommendation?.primaryMarket || '').toUpperCase()}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {capitalFlow.recommendation?.confidence || 0}% confidence
                  </p>
                </Link>
              </div>
            </CollapsibleSection>
          )}

          {/* Capital Flow Opportunities */}
          {capitalFlow?.recommendation?.action === 'analyze' && (
            <CollapsibleSection
              title="CF Opportunities"
              icon={Zap}
              badge="NEW"
              defaultOpen={true}
            >
              <div className="space-y-3">
                {/* Primary BUY opportunity */}
                {(() => {
                  const rec = capitalFlow.recommendation;
                  const market = capitalFlow.markets.find(m => m.market === rec.primaryMarket);
                  const filterType = cfMarketToFilterType(rec.primaryMarket);
                  if (!selectedMarkets.includes(filterType)) return null;
                  return (
                    <Link
                      href={`/analyze?market=${rec.primaryMarket}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-[#5EEDC3]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-white">{(rec.primaryMarket || '').toUpperCase()}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-[#5EEDC3]">BUY</span>
                            {market && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#1E293B] text-gray-400">
                                {(market.phase || 'mid').toUpperCase()} PHASE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-1">{rec.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {market && (
                          <span className={cn(
                            "text-xs font-bold tabular-nums",
                            (market.flow7d ?? 0) >= 0 ? "text-[#5EEDC3]" : "text-[#EF5A6F]"
                          )}>
                            {(market.flow7d ?? 0) >= 0 ? '+' : ''}{(market.flow7d ?? 0).toFixed(1)}% 7d
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{rec.confidence}%</span>
                        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#5EEDC3] transition" />
                      </div>
                    </Link>
                  );
                })()}

                {/* Secondary: markets with counter-opportunity (outflow → potential short) */}
                {capitalFlow.markets
                  .filter(m => m && m.market && m.market !== capitalFlow.recommendation.primaryMarket && (m.flow7d ?? 0) < -2 && selectedMarkets.includes(cfMarketToFilterType(m.market)))
                  .slice(0, 1)
                  .map((m) => (
                    <Link
                      key={m.market}
                      href={`/analyze?market=${m.market}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-[#EF5A6F]/20 bg-[#EF5A6F]/5 hover:border-[#EF5A6F]/40 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EF5A6F]/20 flex items-center justify-center">
                          <TrendingDown className="w-4 h-4 text-[#EF5A6F]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-white">{(m.market || '').toUpperCase()}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EF5A6F]/20 text-[#EF5A6F]">SELL</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#1E293B] text-gray-400">
                              {(m.phase || 'mid').toUpperCase()} PHASE
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">Capital outflow detected — short opportunity</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold tabular-nums text-[#EF5A6F]">
                          {(m.flow7d ?? 0).toFixed(1)}% 7d
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#EF5A6F] transition" />
                      </div>
                    </Link>
                  ))
                }

                {/* If filter hides the recommended market */}
                {!selectedMarkets.includes(cfMarketToFilterType(capitalFlow.recommendation.primaryMarket)) && (
                  <div className="p-3 rounded-lg border border-[#1E293B] text-center">
                    <p className="text-xs text-gray-500">
                      Opportunity in <span className="text-white font-medium">{capitalFlow.recommendation.primaryMarket.toUpperCase()}</span> is hidden by your market filter.
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Platform Performance */}
          <CollapsibleSection title="Platform Performance" icon={Target}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Platform P/L Chart */}
              <div className="lg:col-span-2 rounded-lg border border-[#1E293B] bg-[#0A0E27] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">Platform P/L</span>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold",
                    (performanceData?.summary?.totalRealizedPnL || 0) >= 0
                      ? "bg-emerald-500/20 text-[#5EEDC3]"
                      : "bg-red-500/20 text-[#EF5A6F]"
                  )}>
                    {performanceData?.summary?.totalRealizedPnL !== undefined
                      ? `${(performanceData.summary.totalRealizedPnL >= 0 ? '+' : '')}${performanceData.summary.totalRealizedPnL.toFixed(1)}%`
                      : '--'}
                  </div>
                </div>
                <div className="h-36">
                  {!hasChartData ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-gray-500">No trading data yet</p>
                    </div>
                  ) : (
                    <PnLChart chartData={chartData} />
                  )}
                </div>
              </div>

              {/* Platform Stats */}
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                  <p className="text-xs text-gray-400 mb-1">Accuracy</p>
                  <p className="text-xl font-bold text-white">{platformStats?.accuracy?.overall ? `${platformStats.accuracy.overall}%` : '--'}</p>
                  <p className="text-[10px] text-gray-500">{formatNumber(platformStats?.accuracy?.sampleSize || 0)} verified</p>
                </div>
                <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                  <p className="text-xs text-gray-400 mb-1">Total Analyses</p>
                  <p className="text-xl font-bold text-white">{formatNumber(platformStats?.platform?.totalAnalyses || 0)}</p>
                  <p className="text-[10px] text-gray-500">{formatNumber(platformStats?.platform?.weeklyAnalyses || 0)} this week</p>
                </div>
                <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                  <p className="text-xs text-gray-400 mb-1">Users</p>
                  <p className="text-xl font-bold text-white">{formatNumber(platformStats?.platform?.totalUsers || 0)}</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* My Performance */}
          <CollapsibleSection
            title="My Performance"
            icon={Award}
            badge={userStats?.verifiedAnalyses && userStats.accuracy >= 70 ? 'TOP' : undefined}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* My P/L Chart */}
              <div className="lg:col-span-2 rounded-lg border border-[#1E293B] bg-[#0A0E27] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">My P/L</span>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-[#1E293B] rounded-lg p-0.5">
                      {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPnlViewMode(mode)}
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-medium rounded transition-all",
                            pnlViewMode === mode
                              ? "bg-[#0F1629] text-white"
                              : "text-gray-500 hover:text-gray-300"
                          )}
                        >
                          {mode === 'daily' ? 'Day' : mode === 'weekly' ? 'Week' : 'Month'}
                        </button>
                      ))}
                    </div>
                    <span className={cn(
                      "text-xs font-bold",
                      periodPnL >= 0 ? "text-[#5EEDC3]" : "text-[#EF5A6F]"
                    )}>
                      {hasChartData ? `${periodPnL >= 0 ? '+' : ''}${periodPnL.toFixed(1)}%` : '--'}
                    </span>
                  </div>
                </div>
                <div className="h-36">
                  {!hasChartData ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <p className="text-xs text-gray-500 mb-2">No trading data yet</p>
                      <Link href="/analyze" className="text-xs text-[#5EEDC3] hover:underline flex items-center gap-1">
                        Start your first analysis <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <PnLChart chartData={chartData} />
                  )}
                </div>
              </div>

              {/* My Stats */}
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                  <p className="text-xs text-gray-400 mb-1">My Accuracy</p>
                  <p className="text-xl font-bold text-white">
                    {userStats?.verifiedAnalyses ? `${userStats.accuracy?.toFixed(0)}%` : (userStats?.avgScore ? `${(userStats.avgScore * 10).toFixed(0)}%` : '--')}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {userStats?.verifiedAnalyses
                      ? `${userStats.correctAnalyses}/${userStats.verifiedAnalyses} closed`
                      : (userStats?.avgScore ? 'Avg analysis score' : 'No data yet')}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                  <p className="text-xs text-gray-400 mb-1">GO Signals</p>
                  <p className="text-xl font-bold text-white">{formatNumber(userStats?.goSignals || 0)}</p>
                  <p className="text-[10px] text-gray-500">{formatNumber(userStats?.avoidSignals || 0)} avoided</p>
                </div>
                <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                  <p className="text-xs text-gray-400 mb-1">Active Trades</p>
                  <p className="text-xl font-bold text-white">{formatNumber(userStats?.activeCount || 0)}</p>
                  <p className="text-[10px] text-gray-500">{userStats?.activeCount ? `${formatNumber(userStats.activeProfitable || 0)} profitable` : 'Start analyzing'}</p>
                </div>
              </div>
            </div>

            {/* Trade summary row */}
            {userStats && userStats.totalAnalyses > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg border border-[#1E293B] bg-[#0A0E27] text-center">
                  <div className="text-lg font-bold text-white">{userStats.totalAnalyses}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total</div>
                </div>
                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-center">
                  <div className="text-lg font-bold text-blue-400">{userStats.activeCount || userStats.pendingAnalyses}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Active</div>
                </div>
                <div className="p-3 rounded-lg border border-[#1E293B] bg-[#0A0E27] text-center">
                  <div className="text-lg font-bold text-white">{userStats.verifiedAnalyses}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Closed</div>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-center">
                  <div className="text-lg font-bold text-[#5EEDC3]">{userStats.correctAnalyses}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">TP Hit</div>
                </div>
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-center">
                  <div className="text-lg font-bold text-[#EF5A6F]">{userStats.verifiedAnalyses - userStats.correctAnalyses}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">SL Hit</div>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* Trader Profile */}
          <div className="rounded-lg border border-[#1E293B] bg-[#0F1629] p-4">
            <TraderProfileCard />
          </div>

          {/* Active Trades */}
          {activeTrades.length > 0 && (
            <CollapsibleSection
              title="Active Trades"
              icon={Activity}
              badge={`${activeTrades.length}`}
            >
              <div className="overflow-x-auto pb-2 -mx-2 px-2">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {activeTrades.slice(0, 10).map((trade) => (
                    <ActiveTradeCard key={trade.id} trade={trade} counterFlow={counterFlowIds.has(trade.id)} />
                  ))}
                </div>
              </div>
              <div className="mt-3 text-right">
                <Link href="/reports" className="text-xs text-gray-400 hover:text-[#5EEDC3] transition flex items-center gap-1 justify-end">
                  View all trades <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CollapsibleSection>
          )}

          {/* AI & Signals */}
          {(aiStats || signalStats) && (
            <CollapsibleSection title="AI Usage & Signals" icon={Brain}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiStats && (
                  <>
                    {/* My Concierge */}
                    <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-4 h-4 text-[#5EEDC3]" />
                        <span className="text-xs font-medium text-gray-400">AI Concierge</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{formatNumber(aiStats.user.conciergeMessages)}</p>
                          <p className="text-[10px] text-gray-500">Messages</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{formatNumber(Math.floor(aiStats.user.conciergeMessages * 0.4))}</p>
                          <p className="text-[10px] text-gray-500">Via Chat</p>
                        </div>
                      </div>
                    </div>

                    {/* My Expert */}
                    <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-medium text-gray-400">AI Expert</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{formatNumber(aiStats.user.expertQuestions)}</p>
                          <p className="text-[10px] text-gray-500">Asked</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{Math.max(0, (userStats?.totalAnalyses || 0) * 3 - aiStats.user.expertQuestions)}</p>
                          <p className="text-[10px] text-gray-500">Free Left</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Signal Stats */}
                {signalStats && (
                  <div className="p-4 rounded-lg border border-[#1E293B] bg-[#0A0E27]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#5EEDC3]" />
                        <span className="text-xs font-medium text-gray-400">Signals</span>
                      </div>
                      <Link href="/signals" className="text-[10px] text-gray-500 hover:text-[#5EEDC3]">View All</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{signalStats.totalSignals}</p>
                        <p className="text-[10px] text-gray-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-lg font-bold",
                          signalStats.winRate >= 70 ? "text-[#5EEDC3]" :
                          signalStats.winRate >= 50 ? "text-amber-400" : "text-[#EF5A6F]"
                        )}>
                          {signalStats.closedSignals > 0 ? `${signalStats.winRate.toFixed(0)}%` : '--'}
                        </p>
                        <p className="text-[10px] text-gray-500">Win Rate</p>
                      </div>
                    </div>

                    {signalStats.bestPerformer && (
                      <div className="mt-3 p-2 rounded border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">Best</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{signalStats.bestPerformer.symbol}</span>
                          <span className="text-xs font-bold text-[#5EEDC3]">+{signalStats.bestPerformer.pnl.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}

                    {signalStats.recentSignals.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {signalStats.recentSignals.slice(0, 3).map((signal) => (
                          <Link
                            key={signal.id}
                            href={`/signals/${signal.id}`}
                            className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.02] transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{signal.symbol}</span>
                              <span className={cn(
                                "px-1 py-0.5 rounded text-[9px] font-bold",
                                signal.direction === 'long'
                                  ? "bg-emerald-500/20 text-[#5EEDC3]"
                                  : "bg-red-500/20 text-[#EF5A6F]"
                              )}>
                                {signal.direction.toUpperCase()}
                              </span>
                            </div>
                            {signal.pnlPercent !== null ? (
                              <span className={cn(
                                "text-xs font-bold",
                                signal.pnlPercent >= 0 ? "text-[#5EEDC3]" : "text-[#EF5A6F]"
                              )}>
                                {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-blue-400">Live</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Empty State for New Users */}
          {(!userStats || userStats.totalAnalyses === 0) && (
            <div className="rounded-lg border border-[#1E293B] bg-[#0F1629] p-8 text-center">
              <TrendingUp className="w-10 h-10 text-[#5EEDC3] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Start Your Trading Journey</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                Follow the Capital Flow, analyze assets, and track your performance.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#1E293B] text-white text-sm font-medium hover:border-[#5EEDC3]/30 transition"
                >
                  <Globe className="w-4 h-4" />
                  View Capital Flow
                </Link>
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5EEDC3] text-[#0A0E27] text-sm font-semibold hover:bg-[#5EEDC3]/90 transition"
                >
                  Start Analysis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
