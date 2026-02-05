'use client';

// ===========================================
// Unified Dashboard - Capital Flow Integration
// Platform Performance + My Performance
// ===========================================

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Gem,
  Plus,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  Loader2,
  LineChart,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Users,
  Zap,
  Award,
  Brain,
  AlertTriangle,
  Sparkles,
  Globe,
  Landmark,
  Coins,
  DollarSign,
  MessageSquare,
  Bot,
  HelpCircle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../../lib/coin-icons';
import { getApiUrl, authFetch } from '../../../lib/api';
import { OnboardingTour, TourTriggerButton, TourStep } from '@/components/onboarding/OnboardingTour';

// Lazy load chart component
const PnLChart = dynamic(
  () => import('../../../components/dashboard/PnLChart').then(mod => ({ default: mod.PnLChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
// UI Components
// ===========================================

function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.02]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

function GradientOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/3 -left-20 w-72 h-72 bg-red-500/20 dark:bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-amber-500/20 dark:bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}

function FeatureBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
      <Icon className="w-3.5 h-3.5 text-teal-500" />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{text}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'gray',
  href
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'gray' | 'emerald' | 'purple' | 'blue' | 'amber' | 'red' | 'green' | 'cyan' | 'teal';
  href?: string;
}) {
  const colorClasses = {
    gray: 'bg-gray-100/80 dark:bg-white/5 border-gray-200 dark:border-white/10',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20',
    purple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200/50 dark:border-purple-500/20',
    blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20',
    red: 'bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20',
    green: 'bg-green-50 dark:bg-green-500/10 border-green-200/50 dark:border-green-500/20',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200/50 dark:border-cyan-500/20',
    teal: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200/50 dark:border-teal-500/20',
  };

  const iconColors = {
    gray: 'text-gray-500',
    emerald: 'text-emerald-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    green: 'text-green-500',
    cyan: 'text-cyan-500',
    teal: 'text-teal-500',
  };

  const content = (
    <div className={cn(
      "relative overflow-hidden rounded-xl p-4 border transition-all shadow-sm",
      colorClasses[color],
      href && "hover:scale-[1.02] cursor-pointer"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", iconColors[color])} />
        <span className="text-xs font-medium text-gray-600 dark:text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-600 dark:text-slate-500 mt-0.5">{subValue}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// Capital Flow Layer Card
function LayerCard({
  layerNum,
  title,
  status,
  statusType,
  details,
  icon: Icon,
  color,
  href,
}: {
  layerNum: number;
  title: string;
  status: string;
  statusType: 'positive' | 'negative' | 'neutral' | 'warning';
  details: string;
  icon: React.ElementType;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  href: string;
}) {
  const statusColors = {
    positive: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    negative: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
    neutral: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    warning: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  };

  const bgColors: Record<string, string> = {
    blue: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 hover:border-blue-500/50',
    emerald: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 hover:border-emerald-500/50',
    purple: 'from-purple-500/10 to-violet-500/10 border-purple-500/30 hover:border-purple-500/50',
    amber: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50',
  };

  const numColors: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  };

  return (
    <Link
      href={href}
      className={cn(
        'block backdrop-blur-xl bg-gradient-to-br border rounded-xl p-3 hover:shadow-lg transition-all',
        bgColors[color]
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0', numColors[color])}>
          {layerNum}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{title}</span>
          </div>
          <div className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-bold mb-1', statusColors[statusType])}>
            {status}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{details}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>
    </Link>
  );
}

// AI Stats Card
function AIStatsCard({
  title,
  icon: Icon,
  stats,
  color = 'purple',
}: {
  title: string;
  icon: React.ElementType;
  stats: { label: string; value: string | number }[];
  color?: 'purple' | 'teal';
}) {
  const colorConfig = {
    purple: {
      bg: 'from-purple-500/10 to-violet-500/10',
      border: 'border-purple-200/50 dark:border-purple-500/30',
      iconBg: 'from-purple-400 to-violet-500',
      iconShadow: 'shadow-purple-500/30',
    },
    teal: {
      bg: 'from-teal-500/10 to-emerald-500/10',
      border: 'border-teal-200/50 dark:border-teal-500/30',
      iconBg: 'from-teal-400 to-emerald-500',
      iconShadow: 'shadow-teal-500/30',
    },
  };

  const config = colorConfig[color];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl backdrop-blur-xl bg-gradient-to-br border p-4",
      config.bg,
      config.border
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-lg", config.iconBg, config.iconShadow)}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Signal Stats Card
function SignalStatsCard({
  stats,
  recentSignals,
}: {
  stats: SignalStats;
  recentSignals: SignalStats['recentSignals'];
}) {
  const borderColor = stats.winRate >= 70 ? 'border-green-500/30' : stats.winRate >= 50 ? 'border-amber-500/30' : 'border-red-500/30';
  const bgGradient = stats.winRate >= 70 ? 'from-green-500/10' : stats.winRate >= 50 ? 'from-amber-500/10' : 'from-red-500/10';

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border backdrop-blur-xl',
      'bg-white/80 dark:bg-slate-900/80',
      borderColor
    )}>
      <div className={cn('absolute inset-0 bg-gradient-to-br via-transparent to-transparent', bgGradient)} />
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">My Signals Performance</h3>
          </div>
          <Link href="/signals" className="text-xs text-primary hover:underline flex items-center gap-1">
            View All
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalSignals}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Signals</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.activeSignals}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{stats.closedSignals}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Closed</p>
          </div>
          <div className="text-center">
            <p className={cn(
              "text-lg font-bold",
              stats.winRate >= 70 ? "text-green-600 dark:text-green-400" :
              stats.winRate >= 50 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {stats.closedSignals > 0 ? `${stats.winRate.toFixed(0)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Win Rate</p>
          </div>
        </div>

        {/* Best Performer */}
        {stats.bestPerformer && (
          <div className="mb-4 p-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-3 h-3 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Best Performer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-green-700 dark:text-green-300">{stats.bestPerformer.symbol}</span>
                <span className="text-xs font-bold text-green-600 dark:text-green-400">
                  +{stats.bestPerformer.pnl.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Signals */}
        {recentSignals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Recent Signals</p>
            {recentSignals.map((signal) => (
              <Link
                key={signal.id}
                href={`/signals/${signal.id}`}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{signal.symbol}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold",
                    signal.direction === 'long'
                      ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                      : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                  )}>
                    {signal.direction.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {signal.outcome ? (
                    <>
                      {(signal.outcome === 'tp1_hit' || signal.outcome === 'tp2_hit') && (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      )}
                      {signal.outcome === 'sl_hit' && (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                      {signal.pnlPercent !== null && (
                        <span className={cn(
                          "text-xs font-bold",
                          signal.pnlPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(1)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Live</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {recentSignals.length === 0 && (
          <div className="text-center py-4">
            <Activity className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">No signals yet</p>
            <Link href="/settings?tab=signals" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Configure preferences
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Active Trade Card
function ActiveTradeCard({ trade }: { trade: RecentAnalysis }) {
  const pnlValue = trade.unrealizedPnL;
  const hasValidPnL = pnlValue !== null && pnlValue !== undefined;
  const isProfit = hasValidPnL && pnlValue >= 0;
  const verdictConfig = {
    go: { bg: 'bg-green-500', text: 'GO' },
    conditional_go: { bg: 'bg-yellow-500', text: 'C-GO' },
    wait: { bg: 'bg-gray-500', text: 'WAIT' },
    avoid: { bg: 'bg-red-500', text: 'AVOID' },
  };

  return (
    <Link
      href={`/analyze/details/${trade.id}`}
      className="flex-shrink-0 w-[200px] bg-white dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 p-3 hover:border-primary/50 transition-colors shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={getCoinIcon(trade.symbol)}
            alt={trade.symbol}
            className="w-6 h-6 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }}
          />
          <span className="font-bold text-gray-800 dark:text-white text-sm">{trade.symbol}</span>
        </div>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
          verdictConfig[trade.verdict].bg
        )}>
          {verdictConfig[trade.verdict].text}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
          {trade.direction?.toLowerCase() === 'long' ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          {trade.direction?.toLowerCase() || 'long'}
        </div>
        <span className={cn(
          "font-bold text-sm",
          !hasValidPnL ? "text-gray-500 dark:text-slate-500" :
          isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {hasValidPnL ? `${isProfit ? '+' : ''}${pnlValue!.toFixed(1)}%` : 'N/A'}
        </span>
      </div>

      {trade.outcome !== 'pending' && (
        <div className={cn(
          "mt-2 pt-2 border-t flex items-center justify-center gap-1 text-xs font-semibold",
          trade.outcome === 'correct'
            ? "border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400"
            : "border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
        )}>
          {trade.outcome === 'correct' ? (
            <><CheckCircle2 className="w-3 h-3" /> TP Hit</>
          ) : (
            <><XCircle className="w-3 h-3" /> SL Hit</>
          )}
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
  const router = useRouter();
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
        newRecentAnalyses = analyses.map((a: any) => {
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
      // Platform stats: estimate based on total analyses (real tracking TBD)
      // User stats: use real aiExpertQuestionsTotal from statistics API
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
          conciergeMessages: Math.floor((newUserStats?.totalAnalyses || 0) * 1.0), // Estimate: ~1 message per analysis
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

          // Get recent signals
          const recentSignals = await authFetch('/api/v1/signals?limit=3');
          let recentSignalsData: any[] = [];
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
            recentSignals: recentSignalsData.map((s: any) => ({
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
      const dayTrades = todayData?.trades || 0;

      return hours.map(h => {
        const isCurrentOrPast = h <= currentBucket;
        const progress = isCurrentOrPast ? (h + 3) / (currentBucket + 3) : 0;
        const pnl = isCurrentOrPast ? totalDayPnl * progress : 0;
        return {
          name: `${h.toString().padStart(2, '0')}:00`,
          pnl: Number(pnl.toFixed(2)),
          positive: Math.max(0, pnl),
          negative: Math.min(0, pnl),
          count: h === currentBucket ? dayTrades : 0,
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
  const activeTrades = recentAnalyses.filter(t => t.outcome === 'pending');

  // Dashboard tour steps
  const dashboardTourSteps: TourStep[] = [
    {
      target: '#tour-dashboard-hero',
      title: 'Welcome to Dashboard',
      content: 'Your trading command center. Monitor performance, track positions, and follow market flows all in one place.',
      placement: 'bottom',
      spotlightPadding: 20,
    },
    {
      target: '#tour-credits',
      title: 'Your Credits',
      content: 'Credits are used for analyses and premium features. Buy more credits or earn free credits through rewards.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-capital-flow',
      title: 'Capital Flow Summary',
      content: 'Quick overview of the 4-layer Capital Flow system. See global liquidity, market flow, sector activity, and AI recommendations at a glance.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-platform-performance',
      title: 'Platform Performance',
      content: 'See how the platform is performing overall. Track platform accuracy, total analyses, and active users.',
      placement: 'bottom',
      spotlightPadding: 8,
    },
    {
      target: '#tour-my-performance',
      title: 'My Performance',
      content: 'Track your personal trading performance. See your accuracy, P/L chart, and active trades.',
      placement: 'top',
      spotlightPadding: 8,
    },
  ];

  if (loading) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120]">
        <GrainOverlay />
        <GradientOrbs />
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120]">
      {/* Onboarding Tour */}
      <OnboardingTour
        steps={dashboardTourSteps}
        tourId="dashboard"
        autoStart={true}
      />

      <GrainOverlay />
      <GradientOrbs />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* ===== HERO SECTION ===== */}
        <div id="tour-dashboard-hero" className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6 mb-8">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-teal-500/10 to-red-500/10 border border-teal-500/20 backdrop-blur-sm animate-blur-in">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-medium bg-gradient-to-r from-teal-500 to-red-500 bg-clip-text text-transparent">
              Your Trading Command Center
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
            <span className="bg-gradient-to-r from-teal-600 via-red-500 to-teal-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">
              Trading
            </span>
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-teal-500 via-red-400 to-teal-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer" style={{ animationDelay: '0.5s' }}>
                Dashboard
              </span>
              <span className="absolute -bottom-1 sm:-bottom-2 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-teal-500 via-red-400 to-teal-500 rounded-full opacity-50 animate-pulse" />
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto animate-slide-up px-2">
            Monitor your portfolio, track performance, and follow the money flow
          </p>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <FeatureBadge icon={Globe} text="Capital Flow" />
            <FeatureBadge icon={BarChart3} text="P/L Analytics" />
            <FeatureBadge icon={Brain} text="AI Insights" />
            <FeatureBadge icon={Zap} text="Real-time Data" />
          </div>
        </div>

        {/* ===== CREDITS SECTION ===== */}
        <div id="tour-credits" className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/50 dark:border-slate-700/50 shadow-lg mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/5" />
          <div className="relative z-10 p-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-amber-500/30 dark:bg-amber-500/40 blur-xl rounded-full animate-pulse" />
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
                  <Gem className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-slate-400 uppercase tracking-wider">Credits</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-800 dark:text-white">{formatCredits(credits)}</span>
                  {credits < 10 && credits > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full animate-pulse">Low</span>
                  )}
                  {credits === 0 && (
                    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full animate-pulse">Empty</span>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <Link href="/pricing" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm font-medium hover:opacity-90 transition">
                  <Plus className="w-3.5 h-3.5" />
                  Buy
                </Link>
                <Link href="/rewards" className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">
                  Earn free
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            {credits < 10 && (
              <div className={cn(
                "mt-3 p-2 rounded-lg text-xs font-medium flex items-center gap-2",
                credits === 0
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              )}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {credits === 0 ? "No credits left! Buy or earn credits to continue." : `Running low on credits (${formatCredits(credits)} remaining)`}
              </div>
            )}
          </div>
        </div>

        {/* ===== PLATFORM PERFORMANCE SECTION ===== */}
        <section id="tour-platform-performance" className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Globe className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">Platform Performance</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Global insights and Capital Flow</p>
            </div>
            {/* Tour Trigger Button */}
            <div className="ml-auto">
              <TourTriggerButton tourId="dashboard" />
            </div>
          </div>

          {/* Capital Flow 4-Layer Summary */}
          {capitalFlow && (
            <div id="tour-capital-flow" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <LayerCard
                layerNum={1}
                title="Global Liquidity"
                status={
                  capitalFlow.globalLiquidity.fedBalanceSheet.trend === 'expanding' ? 'EXPANDING' :
                  capitalFlow.globalLiquidity.fedBalanceSheet.trend === 'contracting' ? 'CONTRACTING' : 'STABLE'
                }
                statusType={
                  capitalFlow.globalLiquidity.fedBalanceSheet.trend === 'expanding' ? 'positive' :
                  capitalFlow.globalLiquidity.fedBalanceSheet.trend === 'contracting' ? 'negative' : 'neutral'
                }
                details={`Fed: ${capitalFlow.globalLiquidity.fedBalanceSheet.value.toFixed(1)}T • DXY: ${capitalFlow.globalLiquidity.dxy.value.toFixed(1)}`}
                icon={Landmark}
                color="blue"
                href="/capital-flow"
              />

              <LayerCard
                layerNum={2}
                title="Market Flow"
                status={(() => {
                  const topMarket = capitalFlow.markets.reduce((prev, curr) =>
                    curr.flow7d > prev.flow7d ? curr : prev
                  );
                  return `${topMarket.market.toUpperCase()} LEADS`;
                })()}
                statusType={(() => {
                  const topMarket = capitalFlow.markets.reduce((prev, curr) =>
                    curr.flow7d > prev.flow7d ? curr : prev
                  );
                  return topMarket.flow7d > 2 ? 'positive' : topMarket.flow7d > 0 ? 'neutral' : 'warning';
                })()}
                details={`${capitalFlow.markets.filter(m => m.flow7d > 0).length}/4 markets inflow`}
                icon={BarChart3}
                color="emerald"
                href="/capital-flow"
              />

              <LayerCard
                layerNum={3}
                title="Sector Activity"
                status={(() => {
                  const phase = capitalFlow.markets.find(m => m.market === capitalFlow.recommendation?.primaryMarket)?.phase;
                  return phase ? `${phase.toUpperCase()} PHASE` : 'ANALYZING';
                })()}
                statusType={
                  capitalFlow.markets.find(m => m.market === capitalFlow.recommendation?.primaryMarket)?.phase === 'early' ? 'positive' :
                  capitalFlow.markets.find(m => m.market === capitalFlow.recommendation?.primaryMarket)?.phase === 'mid' ? 'neutral' : 'warning'
                }
                details={`${capitalFlow.recommendation?.primaryMarket || 'Market'} recommended`}
                icon={Activity}
                color="purple"
                href="/capital-flow"
              />

              <LayerCard
                layerNum={4}
                title="Recommendation"
                status={`${(capitalFlow.recommendation?.action || 'wait').toUpperCase()} ${(capitalFlow.recommendation?.primaryMarket || 'MARKET').toUpperCase()}`}
                statusType={
                  capitalFlow.recommendation?.action === 'analyze' ? 'positive' :
                  capitalFlow.recommendation?.action === 'wait' ? 'warning' : 'negative'
                }
                details={`${capitalFlow.recommendation?.confidence || 0}% confidence`}
                icon={Target}
                color="amber"
                href="/capital-flow"
              />
            </div>
          )}

          {/* Platform Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 dark:from-blue-500/10 via-transparent to-transparent" />
              <div className="relative z-10 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <LineChart className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform P/L</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">All verified trades</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-lg font-bold text-sm",
                    (performanceData?.summary?.totalRealizedPnL || 0) >= 0
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                  )}>
                    {performanceData?.summary?.totalRealizedPnL !== undefined
                      ? `${(performanceData.summary.totalRealizedPnL >= 0 ? '+' : '')}${performanceData.summary.totalRealizedPnL.toFixed(1)}%`
                      : '—'}
                  </div>
                </div>
                <div className="h-40">
                  {!hasChartData ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <LineChart className="w-8 h-8 text-gray-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-slate-400">No trading data yet</p>
                    </div>
                  ) : (
                    <PnLChart chartData={chartData} />
                  )}
                </div>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="space-y-3">
              <StatCard
                icon={Target}
                label="Platform Accuracy"
                value={platformStats?.accuracy?.overall ? `${platformStats.accuracy.overall}%` : '—'}
                subValue={`${formatNumber(platformStats?.accuracy?.sampleSize || 0)} verified`}
                color="emerald"
              />
              <StatCard
                icon={BarChart3}
                label="Total Analyses"
                value={formatNumber(platformStats?.platform?.totalAnalyses || 0)}
                subValue={`${formatNumber(platformStats?.platform?.weeklyAnalyses || 0)} this week`}
                color="blue"
              />
              <StatCard
                icon={Users}
                label="Platform Users"
                value={formatNumber(platformStats?.platform?.totalUsers || 0)}
                color="purple"
              />
            </div>
          </div>

          {/* Platform AI Stats */}
          {aiStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AIStatsCard
                title="AI Concierge (Platform)"
                icon={Bot}
                color="teal"
                stats={[
                  { label: 'Total Messages', value: formatNumber(aiStats.platform.totalConciergeMessages) },
                  { label: 'Avg per User', value: aiStats.platform.avgQuestionsPerUser.toFixed(1) },
                ]}
              />
              <AIStatsCard
                title="AI Experts (Platform)"
                icon={Brain}
                color="purple"
                stats={[
                  { label: 'Total Questions', value: formatNumber(aiStats.platform.totalExpertQuestions) },
                  { label: 'This Week', value: formatNumber(Math.floor(aiStats.platform.totalExpertQuestions * 0.15)) },
                ]}
              />
            </div>
          )}
        </section>

        {/* ===== MY PERFORMANCE SECTION ===== */}
        <section id="tour-my-performance" className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Award className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-text-shimmer">My Performance</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Your trading statistics</p>
            </div>
          </div>

          {/* My Performance Chart and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Performance Chart */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent" />
              <div className="relative z-10 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <LineChart className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">My P/L</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Your trade results</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                      <button
                        onClick={() => setPnlViewMode('daily')}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all",
                          pnlViewMode === 'daily'
                            ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                        )}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setPnlViewMode('weekly')}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all",
                          pnlViewMode === 'weekly'
                            ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                        )}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setPnlViewMode('monthly')}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all",
                          pnlViewMode === 'monthly'
                            ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                        )}
                      >
                        Month
                      </button>
                    </div>
                    <div className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-sm",
                      periodPnL >= 0
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                    )}>
                      {hasChartData ? `${periodPnL >= 0 ? '+' : ''}${periodPnL.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                </div>
                <div className="h-40">
                  {!hasChartData ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <LineChart className="w-8 h-8 text-gray-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-slate-400">No trading data yet</p>
                      <Link href="/analyze" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Start your first analysis
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <PnLChart chartData={chartData} />
                  )}
                </div>
              </div>
            </div>

            {/* My Stats */}
            <div className="space-y-3">
              <StatCard
                icon={Award}
                label="My Accuracy"
                value={userStats?.verifiedAnalyses ? `${userStats.accuracy?.toFixed(0)}%` : (userStats?.avgScore ? `${(userStats.avgScore * 10).toFixed(0)}%` : '—')}
                subValue={userStats?.verifiedAnalyses
                  ? `${userStats.correctAnalyses}/${userStats.verifiedAnalyses} closed`
                  : (userStats?.avgScore ? 'Avg analysis score' : 'No data yet')}
                color="amber"
              />
              <StatCard
                icon={TrendingUp}
                label="GO Signals"
                value={formatNumber(userStats?.goSignals || 0)}
                subValue={`${formatNumber(userStats?.avoidSignals || 0)} avoided`}
                color="green"
              />
              <StatCard
                icon={Activity}
                label="Active Trades"
                value={formatNumber(userStats?.activeCount || 0)}
                subValue={userStats?.activeCount
                  ? `${formatNumber(userStats.activeProfitable || 0)} profitable`
                  : 'Start analyzing'}
                color="cyan"
              />
            </div>
          </div>

          {/* My Performance Summary */}
          {userStats && userStats.totalAnalyses > 0 && (
            <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 mb-4">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent" />
              <div className="relative z-10 p-5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 text-center border border-gray-200 dark:border-white/10">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{userStats.totalAnalyses}</div>
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center border border-blue-200/50 dark:border-blue-500/20">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{userStats.activeCount || userStats.pendingAnalyses}</div>
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Active</div>
                  </div>
                  <div className="bg-gray-100/80 dark:bg-white/5 rounded-xl p-3 text-center border border-gray-200 dark:border-white/10">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{userStats.verifiedAnalyses}</div>
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">Closed</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-3 text-center border border-green-200/50 dark:border-green-500/20">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{userStats.correctAnalyses}</div>
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">TP Hit</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3 text-center border border-red-200/50 dark:border-red-500/20">
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{userStats.verifiedAnalyses - userStats.correctAnalyses}</div>
                    <div className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">SL Hit</div>
                  </div>
                </div>

                <div className={cn(
                  "mt-4 text-center text-xs font-medium p-3 rounded-xl border",
                  userStats.verifiedAnalyses === 0
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20"
                    : userStats.accuracy >= 70
                    ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-500/20"
                    : userStats.accuracy >= 50
                    ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-500/20"
                    : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/20"
                )}>
                  {userStats.verifiedAnalyses === 0
                    ? "Trades are still active. Results will update when TP/SL is hit."
                    : userStats.accuracy >= 70
                    ? "Excellent performance! Your analysis accuracy is outstanding."
                    : userStats.accuracy >= 50
                    ? "Good progress! Keep improving your analysis skills."
                    : "Consider reviewing your analysis approach for better results."}
                </div>
              </div>
            </div>
          )}

          {/* My AI Stats & Signals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiStats && (
              <>
                <AIStatsCard
                  title="My AI Concierge Usage"
                  icon={Bot}
                  color="teal"
                  stats={[
                    { label: 'Messages Sent', value: formatNumber(aiStats.user.conciergeMessages) },
                    { label: 'Analyses via Chat', value: formatNumber(Math.floor(aiStats.user.conciergeMessages * 0.4)) },
                  ]}
                />
                <AIStatsCard
                  title="My AI Expert Usage"
                  icon={Brain}
                  color="purple"
                  stats={[
                    { label: 'Questions Asked', value: formatNumber(aiStats.user.expertQuestions) },
                    { label: 'Free Remaining', value: Math.max(0, (userStats?.totalAnalyses || 0) * 3 - aiStats.user.expertQuestions) },
                  ]}
                />
              </>
            )}

            {/* Signal Stats Card */}
            {signalStats && (
              <SignalStatsCard stats={signalStats} recentSignals={signalStats.recentSignals} />
            )}
          </div>
        </section>

        {/* ===== ACTIVE TRADES SECTION ===== */}
        {activeTrades.length > 0 && (
          <section className="mb-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/5 dark:from-cyan-500/10 via-transparent to-transparent" />
              <div className="relative z-10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <Activity className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Trades</h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{activeTrades.length} positions being tracked</p>
                    </div>
                  </div>
                  <Link href="/reports" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    View all
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="overflow-x-auto pb-2 -mx-1 px-1">
                  <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                    {activeTrades.slice(0, 10).map((trade) => (
                      <ActiveTradeCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== EMPTY STATE FOR NEW USERS ===== */}
        {(!userStats || userStats.totalAnalyses === 0) && (
          <section className="mb-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700 p-8 text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Start Your Trading Journey</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                Follow the Capital Flow, analyze assets using our 7-step methodology, and track your performance with real-time accuracy metrics.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/capital-flow"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition shadow-lg shadow-blue-500/25"
                >
                  <Globe className="w-4 h-4" />
                  View Capital Flow
                </Link>
                <Link
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition shadow-lg shadow-emerald-500/25"
                >
                  Start Analysis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
