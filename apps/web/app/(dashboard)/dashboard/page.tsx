'use client';

// ===========================================
// Dashboard — Intelligence Command Center
// Decision Engine layout with real-time data
// ===========================================

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { getApiUrl, authFetch } from '../../../lib/api';
import { OnboardingTour, TourTriggerButton, TourStep } from '@/components/onboarding/OnboardingTour';
import { useMarketFilter, useBistSubSector } from '@/components/dashboard/CategoryBar';
import { OpportunityRadar } from '@/components/dashboard/OpportunityRadar';
import { SmartAlertsWidget } from '@/components/dashboard/SmartAlertsWidget';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import type { MarketType } from '@/components/dashboard/CategoryBar';

// New Intelligence UI components
import { PrimaryDecision } from '@/components/dashboard/PrimaryDecision';
import { ProfitTracker } from '@/components/dashboard/ProfitTracker';
import { FlowChain } from '@/components/dashboard/FlowChain';
import { IntelligenceQuickActions } from '@/components/dashboard/IntelligenceQuickActions';
import { ScoreRing, PulseDot, VerdictBadge } from '@/components/ui/intelligence';

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
// Types (preserved from original)
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

interface SectorFlow {
  name: string;
  flow7d: number;
  trending: 'up' | 'down' | 'stable';
  topAssets: string[];
}

interface SuggestedAsset {
  symbol: string;
  name: string;
  market: string;
  sector?: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

interface MarketFlow {
  market: 'crypto' | 'stocks' | 'bonds' | 'metals';
  flow7d: number;
  flow30d: number;
  phase: 'early' | 'mid' | 'late' | 'exit';
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  sectors?: SectorFlow[];
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: string;
  action: 'analyze' | 'wait' | 'avoid';
  confidence: number;
  reason: string;
  sectors?: string[];
  suggestedAssets?: SuggestedAsset[];
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
// Symbol → MarketType mapping (preserved)
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
// Verdict config for Active Trade Card
// ===========================================
const VERDICT_CONFIG = {
  go: { label: 'GO', textColor: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-500/10' },
  conditional_go: { label: 'C-GO', textColor: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-500/10' },
  wait: { label: 'WAIT', textColor: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10' },
  avoid: { label: 'AVOID', textColor: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-500/10' },
};

// ===========================================
// Active Trade Card (intelligence style)
// ===========================================
function ActiveTradeCard({
  trade,
  isCounterFlow,
}: {
  trade: RecentAnalysis;
  isCounterFlow: boolean;
}) {
  const verdict = VERDICT_CONFIG[trade.verdict] ?? VERDICT_CONFIG.wait;
  const hasPnL = trade.unrealizedPnL != null;
  const pnl = trade.unrealizedPnL ?? 0;
  const isLong = trade.direction?.toLowerCase() === 'long';
  const coinIcon = getCoinIcon(trade.symbol) || FALLBACK_COIN_ICON;

  return (
    <Link
      href={`/analyze/details/${trade.id}`}
      className="flex-shrink-0 w-[200px] sm:w-[220px] rounded-xl p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all block"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <img src={coinIcon} alt={trade.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }} />
          <span className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {trade.symbol.replace(/USDT$/i, '')}
          </span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${verdict.textColor} ${verdict.bgColor}`}>
          {verdict.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {isLong ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className="text-xs text-gray-500 capitalize">{trade.direction ?? '--'}</span>
        </div>
        <span
          className="text-sm font-bold"
          style={{
            color: hasPnL ? (pnl >= 0 ? '#00F5A0' : '#FF4757') : '#9CA3AF',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {hasPnL ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%` : 'N/A'}
        </span>
      </div>

      {isCounterFlow && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
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
    <div className="rounded-xl p-10 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #00F5A0, #00D4FF)', color: '#0A0B0F' }}
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
  // Data Fetching (preserved from original)
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

  // Lightweight 30-second refresh for live prices (Active Trades PnL)
  useEffect(() => {
    const livePriceInterval = setInterval(async () => {
      try {
        const res = await authFetch('/api/analysis/live-prices');
        if (res.ok) {
          const data = await res.json();
          const analyses = data.data?.analyses || [];
          const updated: RecentAnalysis[] = analyses.map((a: Record<string, unknown>) => {
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
          setRecentAnalyses(updated);
        }
      } catch {}
    }, 30_000);
    return () => clearInterval(livePriceInterval);
  }, []);

  // ===========================================
  // Chart + PnL calculations (preserved)
  // ===========================================
  const buildChartData = () => {
    // All view modes use real daily data — no interpolation or fabrication
    const rangeDays = pnlViewMode === 'monthly' ? 30 : 7;

    if (!performanceData?.daily?.length) {
      return Array(rangeDays).fill(null).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (rangeDays - 1 - i));
        const label = pnlViewMode === 'monthly'
          ? String(d.getDate())
          : d.toLocaleDateString('en-US', { weekday: 'short' });
        return { name: label, pnl: 0, positive: 0, negative: 0, count: 0 };
      });
    }

    const daily = performanceData.daily;
    let cumulative = 0;
    return Array(rangeDays).fill(null).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (rangeDays - 1 - i));
      const key = d.toISOString().split('T')[0];
      const dayData = daily.find((x) => x.date === key);
      cumulative += dayData?.realized || 0;
      const label = pnlViewMode === 'monthly'
        ? String(d.getDate())
        : d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        name: label,
        pnl: Number(cumulative.toFixed(2)),
        positive: Math.max(0, cumulative),
        negative: Math.min(0, cumulative),
        count: dayData?.trades || 0,
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
    () => filteredAnalyses.filter((t) => t.outcome === 'pending' && t.entryPrice && t.direction),
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
  const totalTrades = performanceData?.summary?.totalTrades ?? userStats?.totalAnalyses ?? 0;

  // Tour
  const tourSteps: TourStep[] = [
    {
      target: '#tour-decision',
      title: 'System Decision',
      content: 'The primary market regime indicator. Shows whether conditions favor risk-on or risk-off positioning.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-flow-chain',
      title: 'Flow to Action Pipeline',
      content: 'Visualizes the decision chain from capital flow analysis to trade plan execution.',
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
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(0,245,160,0.1)' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00F5A0' }} />
          </div>
          <p className="text-sm text-gray-500 dark:text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Initializing Command Center...
          </p>
        </div>
      </div>
    );
  }

  // ===========================================
  // Render — Intelligence Command Center
  // ===========================================
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <OnboardingTour steps={tourSteps} tourId="dashboard-v4" autoStart={false} />

      <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6 space-y-4">

        {/* Page Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
              <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
            </div>
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
              DASHBOARD
            </span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-wider">
            Decision Engine
          </span>
        </header>

        {/* ROW 1: Primary Decision + System Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div id="tour-decision">
            <PrimaryDecision capitalFlow={capitalFlow} />
          </div>
          <ProfitTracker
            periodPnL={periodPnL}
            pnlViewMode={pnlViewMode}
            setPnlViewMode={setPnlViewMode}
            winRate={winRate}
            totalTrades={totalTrades}
            performanceData={performanceData}
          />
        </div>

        {/* ROW 2: Flow → Action Pipeline (full width) */}
        <div id="tour-flow-chain">
          <FlowChain capitalFlow={capitalFlow} />
        </div>

        {/* Market filters moved inside OpportunityRadar */}

        {/* If no data, show empty state */}
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* ROW 3: Three columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* LEFT: Opportunity Radar */}
              <div className="space-y-4">
                <div id="tour-radar">
                  <OpportunityRadar
                    capitalFlow={capitalFlow}
                    selectedMarkets={selectedMarkets}
                    onMarketChange={setSelectedMarkets}
                  />
                </div>
              </div>

              {/* CENTER: Performance Chart + Active Trades */}
              <div className="space-y-4">
                {/* Performance Chart */}
                <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Performance
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                        {pnlViewMode === 'daily' ? "Today's" : pnlViewMode === 'weekly' ? '7-day' : '30-day'} returns
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: periodPnL >= 0 ? '#00F5A0' : '#FF4757',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {periodPnL === 0 ? '--' : `${periodPnL >= 0 ? '+' : ''}${Math.abs(periodPnL).toFixed(1)}%`}
                      </span>
                      <button
                        onClick={() => { setRefreshing(true); fetchData(true); }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
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

                {/* Platform Stats */}
                {platformStats && (
                  <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                      <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
                        Platform Stats
                      </span>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-white/[0.06]">
                      {[
                        {
                          label: 'Accuracy',
                          value: `${platformStats.accuracy.overall.toFixed(0)}%`,
                          color: platformStats.accuracy.overall >= 60 ? '#00F5A0' : '#FFB800',
                        },
                        {
                          label: 'Analyses',
                          value: platformStats.platform.totalAnalyses.toLocaleString(),
                          color: undefined,
                        },
                        {
                          label: 'Users',
                          value: platformStats.platform.totalUsers.toLocaleString(),
                          color: undefined,
                        },
                      ].map((item) => (
                        <div key={item.label} className="px-4 py-3 text-center">
                          <p className="text-[10px] font-medium text-gray-500 dark:text-white/35 mb-1">{item.label}</p>
                          <p
                            className="text-lg font-bold"
                            style={{
                              color: item.color || undefined,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {!item.color && <span className="text-gray-900 dark:text-white">{item.value}</span>}
                            {item.color && item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Alerts */}
              <div className="space-y-4">
                <SmartAlertsWidget />
              </div>
            </div>

            {/* Active Trades (full width) */}
            {activeTrades.length > 0 && (
              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <PulseDot color="#00F5A0" size={6} />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Active Trades
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                        {activeTrades.length} open position{activeTrades.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/trades"
                    className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    All trades &rarr;
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto px-5 py-4 scrollbar-hide">
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

            {/* Quick Actions (full width) */}
            <IntelligenceQuickActions />
          </>
        )}

        {/* Tour trigger */}
        <div className="flex justify-end">
          <TourTriggerButton tourId="dashboard-v4" />
        </div>
      </div>
    </div>
  );
}
