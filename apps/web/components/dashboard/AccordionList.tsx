'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Zap,
  Target,
  Award,
  Activity,
  Brain,
  Bot,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getCoinIcon, FALLBACK_COIN_ICON } from '../../lib/coin-icons';

// Lazy load PnL chart
const PnLChart = dynamic(
  () => import('./PnLChart').then(mod => ({ default: mod.PnLChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#4dd0e1]/30 border-t-[#4dd0e1] rounded-full animate-spin" />
      </div>
    ),
  }
);

// ===========================================
// Design Tokens
// ===========================================
const COLORS = {
  turkuaz: '#4dd0e1',
  neonGreen: '#00f5c4',
  coral: '#ff5f5f',
  bg: '#041020',
} as const;

// ===========================================
// Types
// ===========================================
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
  tradeType?: string;
  stopLoss?: number;
  takeProfit1?: number;
}

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
  aiExpertQuestionsTotal?: number;
  conciergeMessagesTotal?: number;
}

interface PerformanceData {
  daily: { date: string; realized: number; unrealized: number; total: number; trades: number; cumulative: number }[];
  summary: {
    totalRealizedPnL: number;
    totalTrades: number;
    activeTrades: number;
    winRate: number;
  };
}

interface MarketFlow {
  market: string;
  flow7d: number;
  flow30d: number;
  phase: string;
  daysInPhase: number;
  rotationSignal: string | null;
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: string;
  action: 'analyze' | 'wait' | 'avoid';
  confidence: number;
  reason: string;
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

interface CapitalFlowSummary {
  globalLiquidity: GlobalLiquidity;
  liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
}

interface AIStats {
  platform: { totalExpertQuestions: number; totalConciergeMessages: number; avgQuestionsPerUser: number };
  user: { expertQuestions: number; conciergeMessages: number };
}

interface SignalStats {
  totalSignals: number;
  activeSignals: number;
  closedSignals: number;
  winRate: number;
  bestPerformer: { symbol: string; pnl: number } | null;
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

interface ChartDataPoint {
  name: string;
  pnl: number;
  positive: number;
  negative: number;
  count: number;
}

interface AccordionListProps {
  capitalFlow: CapitalFlowSummary | null;
  platformStats: PlatformStats | null;
  userStats: UserStats | null;
  performanceData: PerformanceData | null;
  aiStats: AIStats | null;
  signalStats: SignalStats | null;
  activeTrades: RecentAnalysis[];
  counterFlowIds: Set<string>;
  chartData: ChartDataPoint[];
  periodPnL: number;
  hasChartData: boolean;
  pnlViewMode: 'daily' | 'weekly' | 'monthly';
  setPnlViewMode: (mode: 'daily' | 'weekly' | 'monthly') => void;
  selectedMarkets: string[];
}

// ===========================================
// Helper
// ===========================================
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 10000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString('en-US');
}

function cfMarketToFilterType(cfMarket: string): string {
  if (cfMarket === 'stocks') return 'bist';
  if (cfMarket === 'metals') return 'metals';
  if (cfMarket === 'bonds') return 'bonds';
  return 'crypto';
}

// ===========================================
// Skeleton for accordion content
// ===========================================
function AccordionSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
            <div className="h-2 w-48 rounded bg-white/[0.03] animate-pulse" />
          </div>
          <div className="h-5 w-12 rounded bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ===========================================
// Accordion Section
// ===========================================
function AccordionSection({
  title,
  icon: Icon,
  badge,
  badgeColor,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden transition-all duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors min-h-[56px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">{title}</span>
          {badge && (
            <span className={cn(
              'px-2 py-0.5 rounded-lg text-[10px] font-bold',
              badgeColor || 'bg-[#4dd0e1]/10 text-[#4dd0e1] border border-[#4dd0e1]/20'
            )}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!open && <span className="text-[11px] text-gray-500 hidden sm:block">View</span>}
          <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform duration-300', open && 'rotate-180')} />
        </div>
      </button>
      <div className={cn(
        'transition-all duration-300 ease-in-out overflow-hidden',
        open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-4 pb-4 pt-1 border-t border-white/5">{children}</div>
      </div>
    </div>
  );
}

// ===========================================
// List Tile (Vertical layout for mobile)
// ===========================================
function ListTile({ label, value, valueColor, sub }: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-right">
        <span className={cn('text-sm font-bold font-mono tabular-nums', valueColor || 'text-white')}>
          {value}
        </span>
        {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

// ===========================================
// Active Trade Card
// ===========================================
function ActiveTradeCard({ trade, counterFlow }: { trade: RecentAnalysis; counterFlow?: boolean }) {
  const pnlValue = trade.unrealizedPnL;
  const hasValidPnL = pnlValue !== null && pnlValue !== undefined;
  const isProfit = hasValidPnL && pnlValue >= 0;

  const verdictConfig: Record<string, { bg: string; text: string }> = {
    go: { bg: 'bg-[#00f5c4]/20 text-[#00f5c4]', text: 'GO' },
    conditional_go: { bg: 'bg-amber-500/20 text-amber-400', text: 'C-GO' },
    wait: { bg: 'bg-gray-500/20 text-gray-400', text: 'WAIT' },
    avoid: { bg: 'bg-[#ff5f5f]/20 text-[#ff5f5f]', text: 'AVOID' },
  };

  const vc = verdictConfig[trade.verdict] || verdictConfig.wait;

  return (
    <Link
      href={`/analyze/details/${trade.id}`}
      className="flex-shrink-0 w-[200px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3 hover:border-[#4dd0e1]/30 hover:shadow-[0_0_15px_rgba(77,208,225,0.15)] transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={getCoinIcon(trade.symbol)}
            alt={trade.symbol}
            className="w-5 h-5 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COIN_ICON; }}
          />
          <span className="font-bold text-white text-sm tracking-tight">{trade.symbol}</span>
        </div>
        <span className={cn('px-1.5 py-0.5 rounded-lg text-[10px] font-bold', vc.bg)}>{vc.text}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium text-gray-400">
          {trade.direction?.toLowerCase() === 'long' ? (
            <TrendingUp className="w-3 h-3 text-[#00f5c4]" />
          ) : trade.direction?.toLowerCase() === 'short' ? (
            <TrendingDown className="w-3 h-3 text-[#ff5f5f]" />
          ) : (
            <Minus className="w-3 h-3 text-gray-400" />
          )}
          {trade.direction?.toLowerCase() || 'neutral'}
        </div>
        <span className={cn(
          'font-bold text-sm font-mono tabular-nums',
          !hasValidPnL ? 'text-gray-500' : isProfit ? 'text-[#00f5c4]' : 'text-[#ff5f5f]'
        )}>
          {hasValidPnL ? `${isProfit ? '+' : ''}${pnlValue!.toFixed(1)}%` : 'N/A'}
        </span>
      </div>

      {trade.outcome !== 'pending' && (
        <div className={cn(
          'mt-2 pt-2 border-t flex items-center justify-center gap-1 text-xs font-semibold',
          trade.outcome === 'correct'
            ? 'border-[#00f5c4]/20 text-[#00f5c4]'
            : 'border-[#ff5f5f]/20 text-[#ff5f5f]'
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
// Main AccordionList
// ===========================================
export function AccordionList(props: AccordionListProps) {
  const {
    capitalFlow,
    platformStats,
    userStats,
    performanceData,
    aiStats,
    signalStats,
    activeTrades,
    counterFlowIds,
    chartData,
    periodPnL,
    hasChartData,
    pnlViewMode,
    setPnlViewMode,
    selectedMarkets,
  } = props;

  return (
    <div className="space-y-3">
      {/* ===== Capital Flow ===== */}
      {capitalFlow && (
        <AccordionSection
          title="Capital Flow"
          icon={Globe}
          badge={capitalFlow.recommendation?.action === 'analyze' ? 'OPPORTUNITY' : undefined}
        >
          <div className="space-y-0">
            {/* L1 */}
            <Link href="/analyze" className="block">
              <div className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/[0.02] transition rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">1</div>
                  <div>
                    <span className="text-xs text-gray-400">Global Liquidity</span>
                    <p className={cn(
                      'text-sm font-bold font-mono',
                      capitalFlow.liquidityBias === 'risk_on' ? 'text-[#00f5c4]' :
                      capitalFlow.liquidityBias === 'risk_off' ? 'text-[#ff5f5f]' : 'text-gray-400'
                    )}>
                      {capitalFlow.liquidityBias === 'risk_on' ? 'RISK ON' :
                       capitalFlow.liquidityBias === 'risk_off' ? 'RISK OFF' : 'NEUTRAL'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </div>
            </Link>

            {/* L2 */}
            <Link href="/analyze" className="block">
              <div className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/[0.02] transition rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">2</div>
                  <div>
                    <span className="text-xs text-gray-400">Market Flow</span>
                    <p className="text-sm font-bold text-white font-mono">
                      {(() => {
                        const valid = capitalFlow.markets.filter(m => m && m.market);
                        if (valid.length === 0) return 'N/A';
                        const top = valid.reduce((a, b) => (b.flow7d ?? 0) > (a.flow7d ?? 0) ? b : a);
                        return `${(top.market || '').toUpperCase()} LEADS`;
                      })()}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {capitalFlow.markets.filter(m => (m.flow7d ?? 0) > 0).length}/{capitalFlow.markets.length} inflow
                </span>
              </div>
            </Link>

            {/* L3 */}
            <Link href="/analyze" className="block">
              <div className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/[0.02] transition rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400">3</div>
                  <div>
                    <span className="text-xs text-gray-400">Sector</span>
                    <p className="text-sm font-bold text-white font-mono">
                      {(() => {
                        const rec = capitalFlow.recommendation;
                        const market = capitalFlow.markets.find(m => m.market === rec?.primaryMarket);
                        return market ? `${(market.phase || 'mid').toUpperCase()} PHASE` : 'ANALYZING';
                      })()}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-500">{capitalFlow.recommendation?.primaryMarket || 'Market'}</span>
              </div>
            </Link>

            {/* L4 */}
            <Link href="/analyze" className="block">
              <div className="flex items-center justify-between py-3 hover:bg-white/[0.02] transition rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400">4</div>
                  <div>
                    <span className="text-xs text-gray-400">Recommendation</span>
                    <p className={cn(
                      'text-sm font-bold font-mono',
                      capitalFlow.recommendation?.action === 'analyze' ? 'text-[#00f5c4]' :
                      capitalFlow.recommendation?.action === 'wait' ? 'text-amber-400' : 'text-[#ff5f5f]'
                    )}>
                      {(capitalFlow.recommendation?.action || 'wait').toUpperCase()} {(capitalFlow.recommendation?.primaryMarket || '').toUpperCase()}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">{capitalFlow.recommendation?.confidence || 0}%</span>
              </div>
            </Link>
          </div>
        </AccordionSection>
      )}

      {/* ===== CF Opportunities ===== */}
      {capitalFlow?.recommendation?.action === 'analyze' && (
        <AccordionSection
          title="CF Opportunities"
          icon={Zap}
          badge="NEW"
          badgeColor="bg-[#00f5c4]/10 text-[#00f5c4] border border-[#00f5c4]/20"
          defaultOpen
        >
          <div className="space-y-2">
            {/* Primary BUY */}
            {(() => {
              const rec = capitalFlow.recommendation;
              const market = capitalFlow.markets.find(m => m.market === rec.primaryMarket);
              const filterType = cfMarketToFilterType(rec.primaryMarket);
              if (!selectedMarkets.includes(filterType)) return null;

              return (
                <Link
                  href={`/analyze?market=${rec.primaryMarket}`}
                  className="flex items-center justify-between p-4 rounded-2xl border border-[#00f5c4]/20 bg-[#00f5c4]/5 hover:border-[#00f5c4]/40 transition-all group min-h-[56px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#00f5c4]/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[#00f5c4]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold tracking-tight text-white">{(rec.primaryMarket || '').toUpperCase()}</span>
                        <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-[#00f5c4]/20 text-[#00f5c4]">BUY</span>
                        {market && (
                          <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-medium bg-white/5 text-gray-400">
                            {(market.phase || 'mid').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1">{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {market && (
                      <span className={cn(
                        'text-xs font-bold font-mono tabular-nums',
                        (market.flow7d ?? 0) >= 0 ? 'text-[#00f5c4]' : 'text-[#ff5f5f]'
                      )}>
                        {(market.flow7d ?? 0) >= 0 ? '+' : ''}{(market.flow7d ?? 0).toFixed(1)}%
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#4dd0e1] transition" />
                  </div>
                </Link>
              );
            })()}

            {/* SELL opportunities */}
            {capitalFlow.markets
              .filter(m => m && m.market && m.market !== capitalFlow.recommendation.primaryMarket && (m.flow7d ?? 0) < -2 && selectedMarkets.includes(cfMarketToFilterType(m.market)))
              .slice(0, 1)
              .map(m => (
                <Link
                  key={m.market}
                  href={`/analyze?market=${m.market}`}
                  className="flex items-center justify-between p-4 rounded-2xl border border-[#ff5f5f]/20 bg-[#ff5f5f]/5 hover:border-[#ff5f5f]/40 transition-all group min-h-[56px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#ff5f5f]/10 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-[#ff5f5f]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold tracking-tight text-white">{(m.market || '').toUpperCase()}</span>
                        <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-[#ff5f5f]/20 text-[#ff5f5f]">SELL</span>
                        <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-medium bg-white/5 text-gray-400">
                          {(m.phase || 'mid').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Capital outflow detected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono tabular-nums text-[#ff5f5f]">
                      {(m.flow7d ?? 0).toFixed(1)}%
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#ff5f5f] transition" />
                  </div>
                </Link>
              ))
            }

            {/* Hidden by filter warning */}
            {!selectedMarkets.includes(cfMarketToFilterType(capitalFlow.recommendation.primaryMarket)) && (
              <div className="p-3 rounded-2xl border border-white/5 text-center">
                <p className="text-xs text-gray-500">
                  Opportunity in <span className="text-white font-medium">{capitalFlow.recommendation.primaryMarket.toUpperCase()}</span> hidden by filter.
                </p>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* ===== Platform Performance ===== */}
      <AccordionSection title="Platform Performance" icon={Target}>
        <div className="space-y-0">
          {/* Chart area */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold tracking-tight text-white">Platform P/L</span>
              <span className={cn(
                'px-2 py-0.5 rounded-lg text-xs font-bold font-mono',
                (performanceData?.summary?.totalRealizedPnL || 0) >= 0
                  ? 'bg-[#00f5c4]/10 text-[#00f5c4]'
                  : 'bg-[#ff5f5f]/10 text-[#ff5f5f]'
              )}>
                {performanceData?.summary?.totalRealizedPnL !== undefined
                  ? `${performanceData.summary.totalRealizedPnL >= 0 ? '+' : ''}${performanceData.summary.totalRealizedPnL.toFixed(1)}%`
                  : '--'}
              </span>
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

          {/* Stats as list tiles */}
          <ListTile
            label="Accuracy"
            value={platformStats?.accuracy?.overall ? `${platformStats.accuracy.overall}%` : '--'}
            valueColor={platformStats?.accuracy?.overall && platformStats.accuracy.overall >= 60 ? 'text-[#00f5c4]' : undefined}
            sub={`${formatNumber(platformStats?.accuracy?.sampleSize || 0)} verified`}
          />
          <ListTile
            label="Total Analyses"
            value={formatNumber(platformStats?.platform?.totalAnalyses || 0)}
            sub={`${formatNumber(platformStats?.platform?.weeklyAnalyses || 0)} this week`}
          />
          <ListTile
            label="Users"
            value={formatNumber(platformStats?.platform?.totalUsers || 0)}
          />
        </div>
      </AccordionSection>

      {/* ===== My Performance ===== */}
      <AccordionSection
        title="My Performance"
        icon={Award}
        badge={userStats?.verifiedAnalyses && userStats.accuracy >= 70 ? 'TOP' : undefined}
        badgeColor="bg-amber-500/10 text-amber-400 border border-amber-500/20"
      >
        <div className="space-y-0">
          {/* P/L Chart with toggle */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold tracking-tight text-white">My P/L</span>
              <div className="flex items-center gap-2">
                <div className="flex bg-white/5 rounded-xl p-0.5">
                  {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPnlViewMode(mode)}
                      className={cn(
                        'px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-all min-h-[32px]',
                        pnlViewMode === mode
                          ? 'bg-[#4dd0e1]/10 text-[#4dd0e1]'
                          : 'text-gray-500 hover:text-gray-300'
                      )}
                    >
                      {mode === 'daily' ? 'Day' : mode === 'weekly' ? 'Week' : 'Month'}
                    </button>
                  ))}
                </div>
                <span className={cn(
                  'text-xs font-bold font-mono',
                  periodPnL >= 0 ? 'text-[#00f5c4]' : 'text-[#ff5f5f]'
                )}>
                  {hasChartData ? `${periodPnL >= 0 ? '+' : ''}${periodPnL.toFixed(1)}%` : '--'}
                </span>
              </div>
            </div>
            <div className="h-36">
              {!hasChartData ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <p className="text-xs text-gray-500 mb-2">No trading data yet</p>
                  <Link href="/analyze" className="text-xs text-[#4dd0e1] hover:underline flex items-center gap-1">
                    Start your first analysis <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <PnLChart chartData={chartData} />
              )}
            </div>
          </div>

          {/* Stats as list tiles */}
          <ListTile
            label="My Accuracy"
            value={userStats?.verifiedAnalyses
              ? `${userStats.accuracy?.toFixed(0)}%`
              : (userStats?.avgScore ? `${(userStats.avgScore * 10).toFixed(0)}%` : '--')}
            valueColor={userStats?.accuracy && userStats.accuracy >= 60 ? 'text-[#00f5c4]' : undefined}
            sub={userStats?.verifiedAnalyses
              ? `${userStats.correctAnalyses}/${userStats.verifiedAnalyses} closed`
              : (userStats?.avgScore ? 'Avg analysis score' : 'No data yet')}
          />
          <ListTile
            label="GO Signals"
            value={formatNumber(userStats?.goSignals || 0)}
            valueColor="text-[#00f5c4]"
            sub={`${formatNumber(userStats?.avoidSignals || 0)} avoided`}
          />
          <ListTile
            label="Active Trades"
            value={formatNumber(userStats?.activeCount || 0)}
            sub={userStats?.activeCount ? `${formatNumber(userStats.activeProfitable || 0)} profitable` : 'Start analyzing'}
          />

          {/* Trade summary row */}
          {userStats && userStats.totalAnalyses > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {[
                { val: userStats.totalAnalyses, label: 'Total', color: 'text-white', border: 'border-white/5' },
                { val: userStats.activeCount || userStats.pendingAnalyses, label: 'Active', color: 'text-blue-400', border: 'border-blue-500/20' },
                { val: userStats.verifiedAnalyses, label: 'Closed', color: 'text-white', border: 'border-white/5' },
                { val: userStats.correctAnalyses, label: 'TP Hit', color: 'text-[#00f5c4]', border: 'border-[#00f5c4]/20' },
                { val: userStats.verifiedAnalyses - userStats.correctAnalyses, label: 'SL Hit', color: 'text-[#ff5f5f]', border: 'border-[#ff5f5f]/20' },
              ].map(item => (
                <div key={item.label} className={cn('p-2 rounded-xl border bg-white/[0.02] text-center', item.border)}>
                  <div className={cn('text-sm font-bold font-mono', item.color)}>{item.val}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider">{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ===== Active Trades ===== */}
      {activeTrades.length > 0 && (
        <AccordionSection
          title="Active Trades"
          icon={Activity}
          badge={`${activeTrades.length}`}
        >
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {activeTrades.slice(0, 10).map(trade => (
                <ActiveTradeCard key={trade.id} trade={trade} counterFlow={counterFlowIds.has(trade.id)} />
              ))}
            </div>
          </div>
          <div className="mt-3 text-right">
            <Link href="/reports" className="text-xs text-gray-400 hover:text-[#4dd0e1] transition flex items-center gap-1 justify-end min-h-[48px] items-center">
              View all trades <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </AccordionSection>
      )}

      {/* ===== AI & Signals ===== */}
      {(aiStats || signalStats) && (
        <AccordionSection title="AI Usage & Signals" icon={Brain}>
          <div className="space-y-0">
            {aiStats && (
              <>
                {/* Concierge */}
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#4dd0e1]/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-[#4dd0e1]" />
                    </div>
                    <span className="text-xs text-gray-400">AI Concierge</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-white">{formatNumber(aiStats.user.conciergeMessages)} msgs</span>
                </div>

                {/* Expert */}
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs text-gray-400">AI Expert</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-white">{formatNumber(aiStats.user.expertQuestions)}</span>
                    <p className="text-[10px] text-gray-500">{Math.max(0, (userStats?.totalAnalyses || 0) * 3 - aiStats.user.expertQuestions)} free left</p>
                  </div>
                </div>
              </>
            )}

            {/* Signals */}
            {signalStats && (
              <>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#4dd0e1]/10 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-[#4dd0e1]" />
                    </div>
                    <span className="text-xs text-gray-400">Signals</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono text-white">{signalStats.totalSignals}</span>
                    <span className={cn(
                      'text-xs font-bold font-mono',
                      signalStats.winRate >= 70 ? 'text-[#00f5c4]' :
                      signalStats.winRate >= 50 ? 'text-amber-400' : 'text-[#ff5f5f]'
                    )}>
                      {signalStats.closedSignals > 0 ? `${signalStats.winRate.toFixed(0)}% WR` : '--'}
                    </span>
                  </div>
                </div>

                {signalStats.bestPerformer && (
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-xs text-gray-400">Best Performer</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{signalStats.bestPerformer.symbol}</span>
                      <span className="text-xs font-bold font-mono text-[#00f5c4]">+{signalStats.bestPerformer.pnl.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {signalStats.recentSignals.length > 0 && signalStats.recentSignals.slice(0, 3).map(signal => (
                  <Link
                    key={signal.id}
                    href={`/signals/${signal.id}`}
                    className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition rounded-lg px-2 -mx-2 min-h-[48px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{signal.symbol}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded-lg text-[9px] font-bold',
                        typeof signal.direction === 'string' && signal.direction === 'long'
                          ? 'bg-[#00f5c4]/20 text-[#00f5c4]'
                          : 'bg-[#ff5f5f]/20 text-[#ff5f5f]'
                      )}>
                        {typeof signal.direction === 'string' ? signal.direction.toUpperCase() : 'N/A'}
                      </span>
                    </div>
                    {signal.pnlPercent !== null ? (
                      <span className={cn(
                        'text-xs font-bold font-mono',
                        signal.pnlPercent >= 0 ? 'text-[#00f5c4]' : 'text-[#ff5f5f]'
                      )}>
                        {signal.pnlPercent >= 0 ? '+' : ''}{signal.pnlPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#4dd0e1]">Live</span>
                    )}
                  </Link>
                ))}

                <div className="mt-2">
                  <Link href="/signals" className="text-xs text-gray-400 hover:text-[#4dd0e1] transition flex items-center gap-1 min-h-[48px] items-center">
                    View All Signals <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </AccordionSection>
      )}

      {/* ===== Empty State ===== */}
      {(!userStats || userStats.totalAnalyses === 0) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-center">
          <TrendingUp className="w-10 h-10 text-[#4dd0e1] mx-auto mb-4" />
          <h3 className="text-lg font-bold tracking-tight text-white mb-2">Start Your Trading Journey</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Follow the Capital Flow, analyze assets, and track your performance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-white text-sm font-medium hover:border-[#4dd0e1]/30 transition min-h-[48px]"
            >
              <Globe className="w-4 h-4" />
              View Capital Flow
            </Link>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[#041020] text-sm font-semibold transition min-h-[48px]"
              style={{ backgroundColor: COLORS.turkuaz }}
            >
              Start Analysis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
